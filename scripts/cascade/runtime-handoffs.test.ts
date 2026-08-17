import { readFile } from "node:fs/promises";

import { describe, expect, test } from "bun:test";

import {
  assertJsonSchema,
  rootPath,
} from "./common";
import type { CampaignPrincipal } from "./campaign-artifacts";
import {
  type RuntimeHandoffReceipt,
  runtimeHandoffReceiptDigest,
  validateRuntimeHandoffReceipt,
} from "./runtime-handoffs";

const digest = (character: string): string => character.repeat(64);

const producer: CampaignPrincipal = {
  role: "simulation-operator",
  session_id: "operator-session",
  subject: "operator",
};

const receiver: CampaignPrincipal = {
  role: "simulation-evaluator",
  session_id: "receiver-session",
  subject: "receiver",
};

const alternateReceiver: CampaignPrincipal = {
  role: "campaign-aggregator",
  session_id: "alternate-receiver-session",
  subject: "alternate-receiver",
};

function receipt(
  disposition: RuntimeHandoffReceipt["disposition"] = "PENDING",
  overrides: Partial<RuntimeHandoffReceipt> = {},
): RuntimeHandoffReceipt {
  const notApplicable = disposition === "NOT_APPLICABLE";
  const receivingDecision = disposition === "ACCEPTED" || disposition === "REJECTED";
  return {
    schema_version: 1,
    artifact_type: "runtime-handoff-receipt",
    receipt_id: disposition === "STALE"
      ? "run-1-TASK-1-handoff-stale"
      : disposition === "PENDING"
        ? "run-1-TASK-1-handoff-offer"
        : "run-1-TASK-1-handoff",
    run_id: "run-1",
    campaign_id: "campaign-1",
    task_id: "TASK-1",
    terminal_status: "SUCCEEDED",
    task_result_digest: digest("a"),
    source_manifest_digest: digest("b"),
    evidence_manifest_digest: digest("c"),
    recovery_receipt_digest: null,
    cleanup_receipt_digest: digest("d"),
    retry_lineage: {
      attempt: 1,
      parent_run_id: null,
      parent_handoff_receipt_digest: null,
    },
    required_inputs: ["execution/source-manifest.json"],
    artifact_references: [
      { path: "execution/source-manifest.json", sha256: digest("b") },
    ],
    proposed_next_owner: notApplicable ? null : "simulation-evaluator",
    proposed_next_gate: notApplicable ? null : "evaluation-gate",
    producer_principal: producer,
    receiver_principal: notApplicable ? null : receiver,
    disposition,
    offer_receipt_digest: receivingDecision ? digest("e") : null,
    receiving_receipt_digest: receivingDecision ? digest("f") : null,
    reason: `${disposition} handoff fixture`,
    superseded_receipt_digest: null,
    changed_bound_inputs: [],
    created_at: "2026-08-08T10:00:00.000Z",
    ...overrides,
  };
}

function staleReceipt(
  previous: RuntimeHandoffReceipt,
  overrides: Partial<RuntimeHandoffReceipt> = {},
): RuntimeHandoffReceipt {
  return receipt("STALE", {
    receipt_id: `${previous.run_id}-${previous.task_id}-handoff-stale`,
    task_result_digest: digest("e"),
    superseded_receipt_digest: runtimeHandoffReceiptDigest(previous),
    changed_bound_inputs: ["task_result_digest"],
    created_at: "2026-08-08T10:01:00.000Z",
    ...overrides,
  });
}

describe("runtime handoff receipts", () => {
  test("accepts operator-authored PENDING and NOT_APPLICABLE receipts", () => {
    expect(() =>
      validateRuntimeHandoffReceipt(receipt("PENDING"), {
        authority: producer,
      })
    ).not.toThrow();
    expect(() =>
      validateRuntimeHandoffReceipt(receipt("PENDING"), {
        authority: receiver,
      })
    ).toThrow("producer authority");
    expect(() =>
      validateRuntimeHandoffReceipt(receipt("NOT_APPLICABLE"), {
        authority: receiver,
      })
    ).toThrow("producer authority");
    expect(() =>
      validateRuntimeHandoffReceipt(receipt("NOT_APPLICABLE"), {
        authority: producer,
      })
    ).not.toThrow();
  });

  test("requires distinct receiving authority for ACCEPTED and REJECTED", () => {
    for (const disposition of ["ACCEPTED", "REJECTED"] as const) {
      const value = receipt(disposition);
      expect(() =>
        validateRuntimeHandoffReceipt(value, { authority: receiver })
      ).not.toThrow();
      expect(() =>
        validateRuntimeHandoffReceipt(value, { authority: producer })
      ).toThrow("receiving authority");
      expect(() =>
        validateRuntimeHandoffReceipt(value, { authority: alternateReceiver })
      ).toThrow("receiving authority");
    }
  });

  test("rejects receiver role, session, and subject overlap", () => {
    for (const invalidReceiver of [
      { ...receiver, role: "simulation-operator" as const },
      { ...receiver, session_id: producer.session_id },
      { ...receiver, subject: producer.subject },
    ]) {
      expect(() =>
        validateRuntimeHandoffReceipt(
          receipt("PENDING", { receiver_principal: invalidReceiver }),
          { authority: producer },
        )
      ).toThrow("distinct non-operator authority");
    }
  });

  test("enforces disposition-specific route and receiver presence", () => {
    expect(() =>
      validateRuntimeHandoffReceipt(
        receipt("PENDING", { receiver_principal: null }),
        { authority: producer },
      )
    ).toThrow("requires a receiver and next route");
    expect(() =>
      validateRuntimeHandoffReceipt(
        receipt("NOT_APPLICABLE", {
          receiver_principal: receiver,
          proposed_next_owner: "simulation-evaluator",
          proposed_next_gate: "evaluation-gate",
        }),
        { authority: producer },
      )
    ).toThrow("cannot name a receiver or next route");
    expect(() =>
      validateRuntimeHandoffReceipt(
        receipt("PENDING", { proposed_next_gate: null }),
        { authority: producer },
      )
    ).toThrow("must both be present or absent");
  });

  test("binds retry parentage and rejects partial, initial, and self-parent lineage", () => {
    const retry = receipt("PENDING", {
      receipt_id: "run-2-TASK-1-handoff-offer",
      run_id: "run-2",
      retry_lineage: {
        attempt: 2,
        parent_run_id: "run-1",
        parent_handoff_receipt_digest: digest("f"),
      },
    });
    expect(() =>
      validateRuntimeHandoffReceipt(retry, { authority: producer })
    ).not.toThrow();

    for (const retry_lineage of [
      {
        attempt: 1,
        parent_run_id: "run-1",
        parent_handoff_receipt_digest: digest("f"),
      },
      {
        attempt: 2,
        parent_run_id: "run-1",
        parent_handoff_receipt_digest: null,
      },
      {
        attempt: 2,
        parent_run_id: null,
        parent_handoff_receipt_digest: digest("f"),
      },
      {
        attempt: 2,
        parent_run_id: "run-2",
        parent_handoff_receipt_digest: digest("f"),
      },
    ]) {
      expect(() =>
        validateRuntimeHandoffReceipt(
          { ...retry, retry_lineage },
          { authority: producer },
        )
      ).toThrow();
    }
  });

  test("accepts STALE only against the exact prior receipt and exact changed inputs", () => {
    const previous = receipt("ACCEPTED");
    const stale = staleReceipt(previous, {
      cleanup_receipt_digest: digest("f"),
      changed_bound_inputs: ["cleanup_receipt_digest", "task_result_digest"],
    });
    expect(() =>
      validateRuntimeHandoffReceipt(stale, {
        authority: producer,
        superseded_receipt: previous,
      })
    ).not.toThrow();

    expect(() =>
      validateRuntimeHandoffReceipt(stale, { authority: producer })
    ).toThrow("exact superseded receipt");
    expect(() =>
      validateRuntimeHandoffReceipt(stale, {
        authority: receiver,
        superseded_receipt: previous,
      })
    ).toThrow("producer authority");
    expect(() =>
      validateRuntimeHandoffReceipt(
        { ...stale, superseded_receipt_digest: digest("0") },
        { authority: producer, superseded_receipt: previous },
      )
    ).toThrow("digest is mismatched");
    expect(() =>
      validateRuntimeHandoffReceipt(
        { ...stale, changed_bound_inputs: ["task_result_digest"] },
        { authority: producer, superseded_receipt: previous },
      )
    ).toThrow("do not match");
    expect(() =>
      validateRuntimeHandoffReceipt(
        { ...stale, receipt_id: previous.receipt_id },
        { authority: producer, superseded_receipt: previous },
      )
    ).toThrow("exact run, task, and lifecycle");
    const unchanged = staleReceipt(previous, {
      task_result_digest: previous.task_result_digest,
      changed_bound_inputs: [],
    });
    expect(() =>
      validateRuntimeHandoffReceipt(unchanged, {
        authority: producer,
        superseded_receipt: previous,
      })
    ).toThrow("changed bound inputs");
  });

  test("rejects STALE cross-subject substitution and backward chronology", () => {
    const previous = receipt("PENDING");
    const stale = staleReceipt(previous);
    expect(() =>
      validateRuntimeHandoffReceipt(
        { ...stale, campaign_id: "other-campaign" },
        { authority: producer, superseded_receipt: previous },
      )
    ).toThrow("cannot change its run, campaign, task, or producer");
    expect(() =>
      validateRuntimeHandoffReceipt(
        { ...stale, created_at: "2026-08-08T09:59:59.000Z" },
        { authority: producer, superseded_receipt: previous },
      )
    ).toThrow("cannot predate");
  });

  test("rejects supersession fields on non-STALE receipts", () => {
    expect(() =>
      validateRuntimeHandoffReceipt(
        receipt("PENDING", {
          superseded_receipt_digest: digest("f"),
          changed_bound_inputs: ["task_result_digest"],
        }),
        { authority: producer },
      )
    ).toThrow("only a STALE");
    expect(() =>
      validateRuntimeHandoffReceipt(receipt("PENDING"), {
        authority: producer,
        superseded_receipt: receipt("REJECTED"),
      })
    ).toThrow("only a STALE");
  });

  test("fails closed on missing, unknown, accessor, prototype, digest, and date input", () => {
    const valid = receipt();
    const missing = { ...valid } as Record<string, unknown>;
    delete missing.cleanup_receipt_digest;
    expect(() =>
      validateRuntimeHandoffReceipt(missing, { authority: producer })
    ).toThrow("missing or unknown fields");
    expect(() =>
      validateRuntimeHandoffReceipt(
        { ...valid, unexpected: true },
        { authority: producer },
      )
    ).toThrow("missing or unknown fields");
    expect(() =>
      validateRuntimeHandoffReceipt(Object.create(valid), { authority: producer })
    ).toThrow("plain object");
    const accessor = { ...valid };
    Object.defineProperty(accessor, "reason", {
      enumerable: true,
      get: () => "stateful reason",
    });
    expect(() =>
      validateRuntimeHandoffReceipt(accessor, { authority: producer })
    ).toThrow("data properties");
    expect(() =>
      validateRuntimeHandoffReceipt(
        { ...valid, task_result_digest: digest("A") },
        { authority: producer },
      )
    ).toThrow("lowercase SHA-256");
    expect(() =>
      validateRuntimeHandoffReceipt(
        { ...valid, created_at: "2026-02-30T10:00:00Z" },
        { authority: producer },
      )
    ).toThrow("RFC 3339");
    expect(() =>
      validateRuntimeHandoffReceipt(valid, {
        authority: producer,
        unexpected: true,
      } as unknown as { authority: CampaignPrincipal })
    ).toThrow("validation context has missing or unknown fields");
    const authorityContext = {} as { authority: CampaignPrincipal };
    Object.defineProperty(authorityContext, "authority", {
      enumerable: true,
      get: () => producer,
    });
    expect(() =>
      validateRuntimeHandoffReceipt(valid, authorityContext)
    ).toThrow("data properties");
  });

  test("requires canonical changed-input order without duplicates", () => {
    const previous = receipt("PENDING");
    const stale = staleReceipt(previous, {
      cleanup_receipt_digest: digest("f"),
      changed_bound_inputs: ["task_result_digest", "cleanup_receipt_digest"],
    });
    expect(() =>
      validateRuntimeHandoffReceipt(stale, {
        authority: producer,
        superseded_receipt: previous,
      })
    ).toThrow("canonically sorted");
    expect(() =>
      validateRuntimeHandoffReceipt(
        {
          ...stale,
          changed_bound_inputs: [
            "cleanup_receipt_digest",
            "cleanup_receipt_digest",
          ],
        },
        { authority: producer, superseded_receipt: previous },
      )
    ).toThrow("unique and canonically sorted");
  });

  test("computes a stable receipt digest", () => {
    const value = receipt("ACCEPTED");
    const reordered = Object.fromEntries(
      Object.entries(value).reverse(),
    ) as unknown as RuntimeHandoffReceipt;
    expect(runtimeHandoffReceiptDigest(value)).toMatch(/^[a-f0-9]{64}$/);
    expect(runtimeHandoffReceiptDigest(reordered)).toBe(
      runtimeHandoffReceiptDigest(value),
    );
    expect(
      runtimeHandoffReceiptDigest({ ...value, reason: "different reason" }),
    ).not.toBe(runtimeHandoffReceiptDigest(value));
  });

  test("keeps the public JSON Schema aligned with disposition and retry rules", async () => {
    const schema = JSON.parse(await readFile(
      rootPath("product-evals/campaigns/runtime-handoff-receipt.schema.json"),
      "utf8",
    ));
    for (const disposition of [
      "PENDING",
      "ACCEPTED",
      "REJECTED",
      "NOT_APPLICABLE",
    ] as const) {
      expect(() => assertJsonSchema(receipt(disposition), schema)).not.toThrow();
    }
    const previous = receipt("PENDING");
    expect(() => assertJsonSchema(staleReceipt(previous), schema)).not.toThrow();
    expect(() =>
      assertJsonSchema(
        receipt("PENDING", { receiver_principal: null }),
        schema,
      )
    ).toThrow();
    expect(() =>
      assertJsonSchema(
        receipt("NOT_APPLICABLE", {
          proposed_next_owner: "simulation-evaluator",
          proposed_next_gate: "evaluation-gate",
        }),
        schema,
      )
    ).toThrow();
    expect(() =>
      assertJsonSchema(
        receipt("PENDING", {
          retry_lineage: {
            attempt: 2,
            parent_run_id: null,
            parent_handoff_receipt_digest: null,
          },
        }),
        schema,
      )
    ).toThrow();
  });
});
