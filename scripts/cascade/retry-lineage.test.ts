import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";

import { assertJsonSchema, rootPath, valueDigest } from "./common";
import {
  buildRetryLineageReceipt,
  retryLineageReceiptDigest,
  verifyRetryLineageReceipt,
  type RetryLineageExpectation,
} from "./retry-lineage";

const digest = (value: string): string => valueDigest(value);

function expectation(): RetryLineageExpectation {
  return {
    child: {
      run_id: "campaign-run-2",
      campaign_id: "campaign",
      attempt: 2,
      campaign_digest: digest("campaign"),
      source_digest: digest("source"),
    },
    parent: {
      verification_status: "VALID",
      run_id: "campaign-run-1",
      campaign_id: "campaign",
      attempt: 1,
      campaign_digest: digest("campaign"),
      source_digest: digest("source"),
      reservation_digest: digest("parent-reservation"),
      finalization_manifest_digest: digest("parent-finalization-manifest"),
      source_manifest_digest: digest("parent-source-manifest"),
      status: "BLOCKED",
    },
    retry_mode: "AUTOMATIC",
  };
}

describe("retry lineage receipt", () => {
  test("builds, schema-validates, verifies, and deterministically digests a valid retry", async () => {
    const input = expectation();
    const receipt = buildRetryLineageReceipt(
      input,
      "2026-08-08T12:00:00.000Z",
    );
    const schema = JSON.parse(
      await readFile(
        rootPath("product-evals/campaigns/retry-lineage-receipt.schema.json"),
        "utf8",
      ),
    );

    expect(() => assertJsonSchema(receipt, schema, "retry lineage receipt"))
      .not.toThrow();
    expect([...schema.required].sort()).toEqual(Object.keys(receipt).sort());
    expect(Object.keys(schema.properties).sort()).toEqual(
      Object.keys(receipt).sort(),
    );
    expect([...schema.$defs.child.required].sort()).toEqual(
      Object.keys(receipt.child).sort(),
    );
    expect([...schema.$defs.parent.required].sort()).toEqual(
      Object.keys(receipt.parent).sort(),
    );
    expect(verifyRetryLineageReceipt(receipt, input)).toEqual(receipt);
    expect(retryLineageReceiptDigest(receipt)).toBe(valueDigest(receipt));
    expect(retryLineageReceiptDigest(structuredClone(receipt)))
      .toBe(retryLineageReceiptDigest(receipt));
  });

  test("rejects a self-parent before producing a receipt", () => {
    const input = expectation();
    input.child.run_id = input.parent.run_id;
    expect(() => buildRetryLineageReceipt(input)).toThrow(
      "child run must differ",
    );
  });

  test("rejects missing or extra semantic fields and invalid terminal verification", () => {
    const valid = buildRetryLineageReceipt(
      expectation(),
      "2026-08-08T12:00:00.000Z",
    );
    const missing = structuredClone(valid) as Record<string, unknown>;
    delete (missing.parent as Record<string, unknown>).reservation_digest;
    expect(() => verifyRetryLineageReceipt(missing)).toThrow(
      "parent shape is invalid",
    );

    const extra = structuredClone(valid) as Record<string, unknown>;
    (extra.parent as Record<string, unknown>).untrusted = true;
    expect(() => verifyRetryLineageReceipt(extra)).toThrow(
      "parent shape is invalid",
    );

    const unverified = expectation() as unknown as Record<string, unknown>;
    (unverified.parent as Record<string, unknown>).verification_status = "INVALID";
    expect(() => buildRetryLineageReceipt(
      unverified as unknown as RetryLineageExpectation,
    )).toThrow("lacks valid immutable terminal verification");
  });

  test("rejects cross-campaign and stale campaign or source identities", () => {
    const crossCampaign = expectation();
    crossCampaign.child.campaign_id = "other-campaign";
    expect(() => buildRetryLineageReceipt(crossCampaign)).toThrow(
      "cannot cross campaign identities",
    );

    const campaignDrift = expectation();
    campaignDrift.child.campaign_digest = digest("changed-campaign");
    expect(() => buildRetryLineageReceipt(campaignDrift)).toThrow(
      "campaign digest is stale or mismatched",
    );

    const sourceDrift = expectation();
    sourceDrift.child.source_digest = digest("changed-source");
    expect(() => buildRetryLineageReceipt(sourceDrift)).toThrow(
      "source identity is stale or mismatched",
    );
  });

  test("rejects nonconsecutive retry attempts", () => {
    const input = expectation();
    input.child.attempt = 3;
    expect(() => buildRetryLineageReceipt(input)).toThrow(
      "attempt must immediately follow",
    );
  });

  test("prohibits automatic retry from UNKNOWN_OUTCOME while retaining explicit manual mode", () => {
    const automatic = expectation();
    automatic.parent.status = "UNKNOWN_OUTCOME";
    expect(() => buildRetryLineageReceipt(automatic)).toThrow(
      "cannot be retried automatically",
    );

    const manual = expectation();
    manual.parent.status = "UNKNOWN_OUTCOME";
    manual.retry_mode = "MANUAL";
    expect(() => buildRetryLineageReceipt(
      manual,
      "2026-08-08T12:00:00.000Z",
    )).not.toThrow();
  });

  test("rejects digest-valid tampering against the expected verified parent", () => {
    const input = expectation();
    const receipt = buildRetryLineageReceipt(
      input,
      "2026-08-08T12:00:00.000Z",
    );
    const tampered = structuredClone(receipt);
    tampered.parent.finalization_manifest_digest = digest("substituted-parent");

    expect(() => verifyRetryLineageReceipt(tampered, input)).toThrow(
      "does not match its verified parent and child authority",
    );
  });

  test("rejects malformed identifiers, timestamps, digests, and accessor input", () => {
    const receipt = buildRetryLineageReceipt(
      expectation(),
      "2026-08-08T12:00:00.000Z",
    );
    for (const mutate of [
      (value: typeof receipt) => { value.child.run_id = "../escape"; },
      (value: typeof receipt) => { value.created_at = "not-an-instant"; },
      (value: typeof receipt) => { value.parent.source_manifest_digest = "short"; },
      (value: typeof receipt) => { value.receipt_id = "foreign-retry-lineage"; },
    ]) {
      const invalid = structuredClone(receipt);
      mutate(invalid);
      expect(() => verifyRetryLineageReceipt(invalid)).toThrow();
    }

    const accessor = structuredClone(receipt) as unknown as Record<string, unknown>;
    Object.defineProperty(accessor, "created_at", {
      enumerable: true,
      get: () => "2026-08-08T12:00:00.000Z",
    });
    expect(() => verifyRetryLineageReceipt(accessor)).toThrow(
      "receipt shape is invalid",
    );
  });
});
