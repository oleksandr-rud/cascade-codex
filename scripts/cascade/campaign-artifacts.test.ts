import { afterEach, describe, expect, test } from "bun:test";
import {
  mkdtemp,
  mkdir,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import {
  type CampaignIdentityEnvelope,
  CampaignArtifactStore,
} from "./campaign-artifacts";
import { CascadeError, valueDigest } from "./common";

const temporaryRoots: string[] = [];

async function temporaryRoot(): Promise<string> {
  const root = await mkdtemp(resolve(tmpdir(), "cascade-campaign-artifacts-"));
  temporaryRoots.push(root);
  return root;
}

function identities(
  override: Partial<CampaignIdentityEnvelope> = {},
): CampaignIdentityEnvelope {
  return {
    operator: {
      role: "simulation-operator",
      session_id: "operator-session",
      subject: "operator",
    },
    evaluator: {
      role: "simulation-evaluator",
      session_id: "evaluator-session",
      subject: "evaluator",
    },
    aggregator: {
      role: "campaign-aggregator",
      session_id: "aggregator-session",
      subject: "aggregator",
    },
    target: {
      role: "target-actor",
      session_id: "target-session",
      subject: "target",
    },
    simulator: {
      role: "simulator",
      session_id: "simulator-session",
      subject: "simulator",
    },
    recovery: {
      role: "simulation-recovery",
      session_id: "recovery-session",
      subject: "recovery",
    },
    ...override,
  };
}

function reservationInput(identity = identities()) {
  return {
    campaign_id: "campaign-1",
    campaign_digest: "digest-1",
    attempt: 1,
    identities: identity,
    lease: {
      lease_id: "lease-1",
      owner_session_id: identity.operator.session_id,
      acquired_at: "2099-07-30T10:00:00.000Z",
      expires_at: "2099-07-30T11:00:00.000Z",
      recovery_mode: "FINALIZE_UNKNOWN_OUTCOME" as const,
    },
  };
}

async function authorizedStore(
  root: string,
  runId: string,
  identity = identities(),
): Promise<CampaignArtifactStore> {
  const store = new CampaignArtifactStore(root, runId);
  await store.reserve(reservationInput(identity));
  return store.withAuthority(identity.operator, "lease-1");
}

async function seedCompletedRun(store: CampaignArtifactStore): Promise<void> {
  const identity = {
    run_id: store.runId,
    campaign_id: "campaign-1",
  };
  const sourceManifest = {
    schema_version: 1,
    ...identity,
    status: "FROZEN",
  };
  const execution = {
    schema_version: 1,
    ...identity,
    status: "PASS",
    source_manifest_digest: valueDigest(sourceManifest),
    cleanup_verified: true,
  };
  const evaluation = {
    schema_version: 2,
    ...identity,
    status: "PASS",
    source_manifest_digest: valueDigest(sourceManifest),
    execution_receipt_digest: valueDigest(execution),
  };
  const aggregation = {
    schema_version: 1,
    ...identity,
    status: "PASS",
    execution_receipt_digest: valueDigest(execution),
    evaluation_receipt_digest: valueDigest(evaluation),
  };
  await store.appendLifecycle({ status: "RUNNING" });
  await store.writeStageJson("execution/source-manifest.json", sourceManifest);
  await store.writeStageJson("execution/execution-receipt.json", execution);
  await store.writeStageJson(
    "evaluations/evaluation-1/receipt.json",
    evaluation,
  );
  await store.writeStageJson(
    "aggregations/aggregation-1.json",
    aggregation,
  );
  await store.writeStageJson("refinements/proposal-1.json", {
    schema_version: 1,
    proposal_id: "proposal-1",
    run_id: store.runId,
    campaign_id: "campaign-1",
    evaluation_id: "evaluation-1",
    persona: {
      persona_id: "P-999",
      revision: 1,
      path: "docs/product/personas/fixtures/P-999-framework-support-role.md",
      sha256: "a".repeat(64),
    },
    derivation: {
      id: "p-999-coverage-v1",
      path: "evals/simulations/fixture/derivations/P-999.json",
      sha256: "b".repeat(64),
    },
    proposal_type: "research-question",
    target_field: "communication behavior",
    summary: "Collect external observations.",
    rationale: "Fixture evidence cannot validate a product persona.",
    recommended_change: "Keep the persona unchanged until research exists.",
    evidence_paths: ["run/execution/execution-receipt.json"],
    confidence: "high",
    disposition_route: "collect-external-evidence",
    external_evidence_required: true,
    human_review_required: true,
    direct_persona_mutation_allowed: false,
    status: "PROPOSED",
    proposed_by: "evaluator",
    created_at: "2026-08-03T00:00:00Z",
    promotion_blockers: [
      "external evidence has not been reviewed",
      "accountable human persona review has not approved a new revision",
    ],
  });
  await store.writeStageJson("summary.json", {
    schema_version: 1,
    ...identity,
    campaign_status: "PASS",
    execution_receipt_digest: valueDigest(execution),
    evaluation_receipt_digest: valueDigest(evaluation),
    aggregation_receipt_digest: valueDigest(aggregation),
  });
  await store.appendLifecycle({ status: "COMPLETED" });
}

afterEach(async () => {
  for (const root of temporaryRoots.splice(0)) {
    await rm(root, { recursive: true, force: true });
  }
});

describe("CampaignArtifactStore", () => {
  test("allows exactly one concurrent reservation winner", async () => {
    const root = await temporaryRoot();
    const first = new CampaignArtifactStore(root, "run-race");
    const second = new CampaignArtifactStore(root, "run-race");
    const results = await Promise.allSettled([
      first.reserve(reservationInput()),
      second.reserve(reservationInput()),
    ]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(
      1,
    );
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(
      1,
    );
  });

  test("refuses retry overwrite and preserves the first reservation", async () => {
    const root = await temporaryRoot();
    const store = new CampaignArtifactStore(root, "run-retry");
    await store.reserve(reservationInput());
    const path = resolve(store.runRoot, "reservation.json");
    const before = await readFile(path, "utf8");

    await expect(
      store.reserve({ ...reservationInput(), campaign_digest: "changed" }),
    ).rejects.toBeInstanceOf(CascadeError);
    expect(await readFile(path, "utf8")).toBe(before);
  });

  test("rejects role-session collisions before reservation", async () => {
    const root = await temporaryRoot();
    const identity = identities({
      evaluator: {
        role: "simulation-evaluator",
        session_id: "operator-session",
        subject: "evaluator",
      },
    });
    const store = new CampaignArtifactStore(root, "run-identities");

    await expect(store.reserve(reservationInput(identity))).rejects.toThrow(
      "pairwise distinct",
    );
  });

  test("rejects duplicate stage writes and all post-finalization writes", async () => {
    const root = await temporaryRoot();
    const identity = identities();
    const store = await authorizedStore(root, "run-stages", identity);
    await store.writeStageJson("execution/receipt.json", { status: "STARTED" });

    await expect(
      store.writeStageJson("execution/receipt.json", { status: "CHANGED" }),
    ).rejects.toBeTruthy();
    await expect(
      store.writeStageJson("execution/../finalization.json", {
        status: "FORGED",
      }),
    ).rejects.toThrow("invalid artifact stage path");
    await seedCompletedRun(store);
    await store.finalize({
      status: "COMPLETED",
      finalized_by: identity.operator,
    });
    await expect(
      store.writeStageJson("execution/late.json", { status: "LATE" }),
    ).rejects.toThrow("already finalized");
  });

  test("freezes bounded regular files and blocks symlinks, size, and secrets", async () => {
    const root = await temporaryRoot();
    const source = resolve(root, "source.txt");
    const secret = resolve(root, "secret.txt");
    const link = resolve(root, "source-link.txt");
    await writeFile(source, "safe evidence");
    await writeFile(secret, "token=super-secret-value");
    await symlink(source, link);

    const store = await authorizedStore(root, "run-freeze");
    const frozen = await store.freezeFile({
      source_path: source,
      namespace: "execution/evidence",
      producer: "simulation-operator",
      platform: "test-platform",
      redaction_profile: "no-secrets-v1",
    });
    expect(frozen.redaction_status).toBe("CLEAN");
    expect(frozen.platform).toBe("test-platform");
    expect(frozen.lineage).toEqual({
      run_id: "run-freeze",
      source_digest: frozen.sha256,
    });
    await expect(
      store.freezeFile({
        source_path: link,
        namespace: "execution/evidence",
        producer: "simulation-operator",
        platform: "test-platform",
        redaction_profile: "no-secrets-v1",
      }),
    ).rejects.toThrow("symbolic-link");
    await expect(
      store.freezeFile({
        source_path: source,
        namespace: "execution/evidence",
        producer: "simulation-operator",
        platform: "test-platform",
        redaction_profile: "no-secrets-v1",
        max_bytes: 2,
      }),
    ).rejects.toThrow("exceeds");
    await expect(
      store.freezeFile({
        source_path: secret,
        namespace: "execution/evidence",
        producer: "simulation-operator",
        platform: "test-platform",
        redaction_profile: "no-secrets-v1",
      }),
    ).rejects.toThrow("secret-like");
  });

  test("recovery can terminally finalize unknown outcome with a reason", async () => {
    const root = await temporaryRoot();
    const identity = identities();
    const base = new CampaignArtifactStore(root, "run-recovery");
    await base.reserve(reservationInput(identity));
    await base
      .withAuthority(identity.operator, "lease-1")
      .appendLifecycle({ status: "RUNNING" });
    const store = base.withAuthority(identity.recovery);
    const finalization = await store.finalize({
      status: "UNKNOWN_OUTCOME",
      finalized_by: identity.recovery,
      recovery_reason: "operator lease expired during external action",
      recovery_action: "bounded inspection found an ambiguous provider write",
      recovery_cleanup_status: "UNKNOWN",
    });

    expect(finalization.status).toBe("UNKNOWN_OUTCOME");
    expect((await store.verify()).status).toBe("VALID");
  });

  test("allows exactly one atomic terminal finalization", async () => {
    const root = await temporaryRoot();
    const identity = identities();
    const store = await authorizedStore(root, "run-finalize-race", identity);
    await seedCompletedRun(store);
    const results = await Promise.allSettled([
      store.finalize({
        status: "COMPLETED",
        finalized_by: identity.operator,
      }),
      store.finalize({
        status: "BLOCKED",
        finalized_by: identity.operator,
      }),
    ]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(
      1,
    );
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(
      1,
    );
    expect((await store.verify()).status).toBe("VALID");
  });

  test("verifies a finalized run and detects tampering", async () => {
    const root = await temporaryRoot();
    const identity = identities();
    const store = await authorizedStore(root, "run-verify", identity);
    await seedCompletedRun(store);
    await store.finalize({
      status: "COMPLETED",
      finalized_by: identity.operator,
    });

    expect(await store.verify()).toMatchObject({
      status: "VALID",
      run_id: "run-verify",
      finalization_status: "COMPLETED",
    });
    await writeFile(resolve(store.runRoot, "summary.json"), '{"tampered":true}\n');
    await expect(store.verify()).rejects.toThrow("digest mismatch");
  });

  test("rejects expired operator leases and non-recovery unknown-outcome finalizers", async () => {
    const root = await temporaryRoot();
    const identity = identities();
    const input = reservationInput(identity);
    input.lease.acquired_at = "2020-01-01T00:00:00.000Z";
    input.lease.expires_at = "2020-01-01T00:01:00.000Z";
    const base = new CampaignArtifactStore(root, "run-expired");
    await base.reserve(input);
    const expired = base.withAuthority(identity.operator, input.lease.lease_id);
    await expect(
      expired.writeStageJson("execution/late.json", { status: "LATE" }),
    ).rejects.toThrow("lease is expired");
    const evaluator = base.withAuthority(identity.evaluator);
    await expect(
      evaluator.finalize({
        status: "UNKNOWN_OUTCOME",
        finalized_by: identity.evaluator,
        recovery_reason: "not authorized",
        recovery_action: "none",
        recovery_cleanup_status: "UNKNOWN",
      }),
    ).rejects.toThrow("recovery identity");
  });

  test("rejects incomplete completed runs and symlinks in the artifact tree", async () => {
    const root = await temporaryRoot();
    const incomplete = await authorizedStore(root, "run-incomplete");
    await expect(
      incomplete.finalize({
        status: "COMPLETED",
        finalized_by: identities().operator,
      }),
    ).rejects.toThrow("requires evaluation and aggregation receipts");

    const linked = await authorizedStore(root, "run-linked");
    await seedCompletedRun(linked);
    await symlink(
      resolve(linked.runRoot, "summary.json"),
      resolve(linked.runRoot, "execution", "summary-link.json"),
    );
    await expect(
      linked.finalize({
        status: "COMPLETED",
        finalized_by: identities().operator,
      }),
    ).rejects.toThrow("symbolic link");
  });

  test("linearizes stage writers with terminal finalization", async () => {
    const root = await temporaryRoot();
    for (let index = 0; index < 12; index += 1) {
      const identity = identities();
      const store = await authorizedStore(root, `run-linear-${index}`, identity);
      await seedCompletedRun(store);
      await Promise.allSettled([
        store.finalize({
          status: "COMPLETED",
          finalized_by: identity.operator,
        }),
        store.writeStageJson(`execution/race-${index}.json`, { status: "EARLY" }),
      ]);
      expect((await store.verify()).status).toBe("VALID");
      await expect(
        store.writeStageJson(`execution/post-${index}.json`, { status: "LATE" }),
      ).rejects.toThrow("already finalized");
    }
  });

  test("rejects placeholder terminal evidence and symlinked source ancestors", async () => {
    const root = await temporaryRoot();
    const identity = identities();
    const placeholders = await authorizedStore(root, "run-placeholders", identity);
    await placeholders.appendLifecycle({ status: "RUNNING" });
    await placeholders.appendLifecycle({ status: "COMPLETED" });
    await placeholders.writeStageJson("execution/source-manifest.json", {});
    await placeholders.writeStageJson("execution/execution-receipt.json", {});
    await placeholders.writeStageJson("evaluations/evaluation-1/receipt.json", {});
    await placeholders.writeStageJson("aggregations/aggregation-1.json", {});
    await placeholders.writeStageJson("summary.json", {});
    await expect(
      placeholders.finalize({
        status: "COMPLETED",
        finalized_by: identity.operator,
      }),
    ).rejects.toThrow("identity");

    const realDirectory = resolve(root, "real-source");
    const linkedDirectory = resolve(root, "linked-source");
    await mkdir(realDirectory);
    await writeFile(resolve(realDirectory, "evidence.txt"), "safe evidence");
    await symlink(realDirectory, linkedDirectory);
    const store = await authorizedStore(root, "run-source-ancestor");
    await expect(
      store.freezeFile({
        source_path: resolve(linkedDirectory, "evidence.txt"),
        namespace: "execution/evidence",
        producer: "simulation-operator",
        platform: "test-platform",
        redaction_profile: "no-secrets-v1",
      }),
    ).rejects.toThrow("symbolic-link ancestor");
  });

  test("blocks configured authority secrets in structured artifacts", async () => {
    const root = await temporaryRoot();
    const store = (
      await authorizedStore(root, "run-sensitive-json")
    ).withSensitiveValues(["standalone-confirmation-secret"]);
    await expect(
      store.writeStageJson("execution/result.json", {
        final_state: "standalone-confirmation-secret",
      }),
    ).rejects.toThrow("secret-like material");
  });
});
