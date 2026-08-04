import { afterEach, describe, expect, test } from "bun:test";
import {
  mkdtemp,
  mkdir,
  readFile,
  rm,
  symlink,
  unlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import {
  type CampaignIdentityEnvelope,
  CampaignArtifactStore,
} from "./campaign-artifacts";
import { CascadeError, sha256File, valueDigest } from "./common";
import { refinementProposalCandidateDigest } from "./persona-simulations";
import {
  simulationCheckpointDigest,
  simulationEventDigest,
  simulationSessionContractDigest,
  type SimulationSessionContract,
  type SimulationSessionCheckpoint,
  type SimulationSessionEvent,
} from "./simulation-sessions";

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

function refinementProposal(runId: string) {
  return {
    schema_version: 1,
    proposal_id: "proposal-1",
    run_id: runId,
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
      path: "product-evals/simulations/harness/fixture/derivations/P-999.json",
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
  };
}

async function stageEvaluationInput(
  store: CampaignArtifactStore,
  evaluationId: string,
  value: unknown,
  writeEvidence = true,
): Promise<string> {
  const evidencePath = "run/execution/execution-receipt.json";
  const stagedPath = `evaluations/${evaluationId}/input/${evidencePath}`;
  if (writeEvidence) await store.writeStageJson(stagedPath, value);
  const files = [
    {
      path: evidencePath,
      sha256: writeEvidence
        ? await sha256File(resolve(store.runRoot, stagedPath))
        : "d".repeat(64),
    },
  ];
  const manifestDigest = valueDigest(files);
  await store.writeStageJson(
    `evaluations/${evaluationId}/input/input-manifest.json`,
    { files, manifest_digest: manifestDigest },
  );
  return manifestDigest;
}

async function seedCompletedRun(store: CampaignArtifactStore): Promise<void> {
  const identity = {
    run_id: store.runId,
    campaign_id: "campaign-1",
  };
  const proposal = refinementProposal(store.runId);
  const sourceManifest = {
    schema_version: 1,
    ...identity,
    status: "FROZEN",
    definitions: [
      { path: proposal.persona.path, sha256: proposal.persona.sha256 },
      { path: proposal.derivation.path, sha256: proposal.derivation.sha256 },
    ],
  };
  const execution = {
    schema_version: 1,
    ...identity,
    status: "PASS",
    source_manifest_digest: valueDigest(sourceManifest),
    cleanup_verified: true,
  };
  await store.appendLifecycle({ status: "RUNNING" });
  await store.writeStageJson("execution/source-manifest.json", sourceManifest);
  await store.writeStageJson("execution/execution-receipt.json", execution);
  const inputManifestDigest = await stageEvaluationInput(
    store,
    proposal.evaluation_id,
    execution,
  );
  const evaluation = {
    schema_version: 2,
    ...identity,
    evaluation_id: proposal.evaluation_id,
    evaluator_identity: proposal.proposed_by,
    status: "PASS",
    source_manifest_digest: valueDigest(sourceManifest),
    execution_receipt_digest: valueDigest(execution),
    input_manifest_digest: inputManifestDigest,
    refinement_proposal_bindings: [
      {
        proposal_id: proposal.proposal_id,
        candidate_digest: refinementProposalCandidateDigest(proposal),
      },
    ],
  };
  const aggregation = {
    schema_version: 1,
    ...identity,
    status: "PASS",
    execution_receipt_digest: valueDigest(execution),
    evaluation_receipt_digest: valueDigest(evaluation),
  };
  await store.writeStageJson(
    "evaluations/evaluation-1/receipt.json",
    evaluation,
  );
  await store.writeStageJson(
    "aggregations/aggregation-1.json",
    aggregation,
  );
  await store.writeStageJson(
    "refinements/proposal-1.json",
    proposal,
  );
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

  test("renews the operator lease with a monotonic heartbeat generation", async () => {
    const root = await temporaryRoot();
    const store = await authorizedStore(root, "run-heartbeat");
    const renewed = await store.renewLease(
      60_000,
      new Date("2099-07-30T10:30:00.000Z"),
    );

    expect(renewed).toMatchObject({
      run_id: "run-heartbeat",
      lease_id: "lease-1",
      generation: 1,
      renewed_at: "2099-07-30T10:30:00.000Z",
      expires_at: "2099-07-30T11:00:00.000Z",
    });
    expect(await store.readCurrentLease()).toEqual(renewed);
    expect(await readFile(resolve(store.runRoot, "lifecycle.jsonl"), "utf8"))
      .toContain('"status":"HEARTBEAT"');
  });

  test("allows only the reserved recovery identity to replace an expired lease", async () => {
    const root = await temporaryRoot();
    const identity = identities();
    const input = reservationInput(identity);
    input.lease.acquired_at = "2026-08-04T10:00:00.000Z";
    input.lease.expires_at = "2026-08-04T10:01:00.000Z";
    const base = new CampaignArtifactStore(root, "run-takeover");
    await base.reserve(input);
    const expiredLease = await base.readCurrentLease();

    await expect(
      base.withAuthority(identity.operator, "lease-1").takeoverExpiredLease({
        lease_id: "lease-2",
        ttl_ms: 60_000,
        reason: "operator process exited",
        now: new Date("2026-08-04T10:02:00.000Z"),
      }),
    ).rejects.toThrow("reserved recovery identity");

    const replacement = await base
      .withAuthority(identity.recovery)
      .takeoverExpiredLease({
        lease_id: "lease-2",
        ttl_ms: 60_000,
        reason: "operator process exited",
        now: new Date("2026-08-04T10:02:00.000Z"),
      });
    expect(replacement).toMatchObject({
      lease_id: "lease-2",
      owner_session_id: identity.operator.session_id,
      generation: 1,
      renewed_at: "2026-08-04T10:02:00.000Z",
      expires_at: "2026-08-04T10:03:00.000Z",
    });
    expect(
      JSON.parse(
        await readFile(
          resolve(
            base.runRoot,
            "recovery/lease-takeovers/00000001.json",
          ),
          "utf8",
        ),
      ),
    ).toMatchObject({
      previous_generation: 0,
      replacement_lease: { lease_id: "lease-2", generation: 1 },
      recovery_identity: identity.recovery,
    });
    await writeFile(
      resolve(base.runRoot, "lease.json"),
      `${JSON.stringify(expiredLease)}\n`,
      "utf8",
    );
    expect(
      await base.withAuthority(identity.recovery).takeoverExpiredLease({
        lease_id: "lease-2",
        ttl_ms: 60_000,
        reason: "operator process exited",
        now: new Date("2026-08-04T10:02:30.000Z"),
      }),
    ).toEqual(replacement);
    await base
      .withAuthority(identity.operator, "lease-2")
      .appendLifecycle({ status: "RESUMED" });
  });

  test("refuses takeover while the current operator lease is active", async () => {
    const root = await temporaryRoot();
    const identity = identities();
    const base = new CampaignArtifactStore(root, "run-active-takeover");
    await base.reserve(reservationInput(identity));

    await expect(
      base.withAuthority(identity.recovery).takeoverExpiredLease({
        lease_id: "lease-2",
        ttl_ms: 60_000,
        reason: "unsafe concurrent resume",
        now: new Date("2099-07-30T10:30:00.000Z"),
      }),
    ).rejects.toThrow("still active");
  });

  test("persists append-only session events and revisioned checkpoints", async () => {
    const root = await temporaryRoot();
    const store = await authorizedStore(root, "run-session");
    const checkpoint: SimulationSessionCheckpoint<{ completed: string[] }> = {
      schema_version: 1,
      checkpoint_id: "run-session:checkpoint:00000000",
      checkpoint_digest: "",
      contract_digest: "",
      session_id: "run-session",
      purpose: "exercise several surfaces",
      status: "RUNNING",
      reason: null,
      revision: 0,
      started_at: "2099-07-30T10:00:00.000Z",
      updated_at: "2099-07-30T10:00:00.000Z",
      episode: 1,
      episode_step_count: 0,
      step_count: 0,
      completed_step_ids: [],
      completed_idempotency_keys: [],
      last_batch_step_ids: [],
      surfaces: [
        {
          surface_id: "browser:fixture",
          kind: "browser",
          context_id: "browser-context",
          lifecycle: "READY",
          generation: 0,
        },
      ],
      domain_state: { completed: [] },
      last_event_digest: null,
    };
    checkpoint.checkpoint_digest = simulationCheckpointDigest(checkpoint);
    const sessionContract: SimulationSessionContract = {
      schema_version: 1,
      session_id: "run-session",
      purpose: "exercise several surfaces",
      limits: {
        max_duration_ms: 60_000,
        max_step_duration_ms: 5_000,
        max_steps: 10,
        max_parallel_steps: 2,
        max_steps_per_episode: 5,
        max_surfaces: 8,
        max_checkpoint_bytes: 128 * 1024,
      },
    };
    checkpoint.contract_digest = simulationSessionContractDigest(sessionContract);
    checkpoint.checkpoint_digest = simulationCheckpointDigest(checkpoint);
    const event: SimulationSessionEvent = {
      schema_version: 1,
      session_id: "run-session",
      contract_digest: simulationSessionContractDigest(sessionContract),
      sequence: 0,
      event_type: "SESSION_STARTED",
      at: "2099-07-30T10:00:00.000Z",
      episode: 1,
      step_ids: [],
      surface_ids: ["browser:fixture"],
      status: "RUNNING",
      reason: null,
      checkpoint_digest: checkpoint.checkpoint_digest,
      previous_event_digest: null,
      event_digest: "",
    };
    event.event_digest = simulationEventDigest(event);

    await store.writeSessionCheckpoint(checkpoint);
    await store.appendSessionEvent(event);
    expect(await store.readLatestSessionCheckpoint()).toEqual(checkpoint);
    expect(await store.readSessionEvents()).toEqual([event]);
    expect(
      await readFile(
        resolve(
          store.runRoot,
          "execution/session/journal/00000000.jsonl",
        ),
        "utf8",
      ),
    ).toContain(event.event_digest);
    expect(
      await readFile(
        resolve(
          store.runRoot,
          "execution/session/checkpoints/00000000/00000000.json",
        ),
        "utf8",
      ),
    ).toContain(checkpoint.checkpoint_digest);
    await expect(store.writeSessionCheckpoint(checkpoint)).rejects.toBeTruthy();
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

  test("rejects refinement artifacts that claim direct persona mutation", async () => {
    const root = await temporaryRoot();
    const store = await authorizedStore(root, "run-invalid-refinement");

    await expect(
      store.writeStageJson("refinements/invalid.json", {
        ...refinementProposal(store.runId),
        direct_persona_mutation_allowed: true,
      }),
    ).rejects.toThrow("proposal-only");
  });

  test("binds refinement artifacts to the reserved identity and canonical path", async () => {
    const root = await temporaryRoot();
    const store = await authorizedStore(root, "run-refinement-binding");
    const proposal = refinementProposal(store.runId);

    await expect(
      store.writeStageJson("refinements/proposal-1.json", {
        ...proposal,
        run_id: "another-run",
      }),
    ).rejects.toThrow("reserved run, campaign, and evaluator");
    await expect(
      store.writeStageJson("refinements/proposal-1.json", {
        ...proposal,
        campaign_id: "another-campaign",
      }),
    ).rejects.toThrow("reserved run, campaign, and evaluator");
    await expect(
      store.writeStageJson("refinements/proposal-1.json", {
        ...proposal,
        proposed_by: "another-evaluator",
      }),
    ).rejects.toThrow("reserved run, campaign, and evaluator");
    await expect(
      store.writeStageJson("refinements/wrong-name.json", proposal),
    ).rejects.toThrow("path must match proposal_id");
    await expect(
      store.writeStageJson("refinements/not-an-object.json", null),
    ).rejects.toThrow("must be an object");
  });

  test("requires evaluation candidate, source, and frozen-evidence linkage", async () => {
    const root = await temporaryRoot();
    const proposal = refinementProposal("run-refinement-linkage");
    const store = await authorizedStore(root, proposal.run_id);
    const sourceManifest = {
      schema_version: 1,
      run_id: proposal.run_id,
      campaign_id: proposal.campaign_id,
      definitions: [
        { path: proposal.persona.path, sha256: proposal.persona.sha256 },
        { path: proposal.derivation.path, sha256: proposal.derivation.sha256 },
      ],
    };
    const evaluation = {
      schema_version: 2,
      run_id: proposal.run_id,
      campaign_id: proposal.campaign_id,
      evaluation_id: proposal.evaluation_id,
      evaluator_identity: proposal.proposed_by,
      refinement_proposal_bindings: [
        {
          proposal_id: proposal.proposal_id,
          candidate_digest: "c".repeat(64),
        },
      ],
    };
    await store.writeStageJson("execution/source-manifest.json", sourceManifest);
    await store.writeStageJson("evaluations/evaluation-1/receipt.json", evaluation);
    await store.writeStageJson(
      "evaluations/evaluation-1/input/run/execution/execution-receipt.json",
      { status: "PASS" },
    );
    await expect(
      store.writeStageJson("refinements/proposal-1.json", proposal),
    ).rejects.toThrow("candidate digest");

    const missingSourceProposal = refinementProposal("run-refinement-source");
    const missingSourceStore = await authorizedStore(
      root,
      missingSourceProposal.run_id,
    );
    await missingSourceStore.writeStageJson("execution/source-manifest.json", {
      ...sourceManifest,
      run_id: missingSourceProposal.run_id,
      definitions: [
        {
          path: missingSourceProposal.persona.path,
          sha256: missingSourceProposal.persona.sha256,
        },
      ],
    });
    await missingSourceStore.writeStageJson("evaluations/evaluation-1/receipt.json", {
      ...evaluation,
      run_id: missingSourceProposal.run_id,
      input_manifest_digest: await stageEvaluationInput(
        missingSourceStore,
        missingSourceProposal.evaluation_id,
        { status: "PASS" },
      ),
      refinement_proposal_bindings: [
        {
          proposal_id: missingSourceProposal.proposal_id,
          candidate_digest: refinementProposalCandidateDigest(missingSourceProposal),
        },
      ],
    });
    await expect(
      missingSourceStore.writeStageJson(
        "refinements/proposal-1.json",
        missingSourceProposal,
      ),
    ).rejects.toThrow("absent from the source manifest");

    const missingEvidenceProposal = refinementProposal("run-refinement-evidence");
    const missingEvidenceStore = await authorizedStore(
      root,
      missingEvidenceProposal.run_id,
    );
    await missingEvidenceStore.writeStageJson("execution/source-manifest.json", {
      ...sourceManifest,
      run_id: missingEvidenceProposal.run_id,
    });
    await missingEvidenceStore.writeStageJson("evaluations/evaluation-1/receipt.json", {
      ...evaluation,
      run_id: missingEvidenceProposal.run_id,
      input_manifest_digest: await stageEvaluationInput(
        missingEvidenceStore,
        missingEvidenceProposal.evaluation_id,
        { status: "PASS" },
        false,
      ),
      refinement_proposal_bindings: [
        {
          proposal_id: missingEvidenceProposal.proposal_id,
          candidate_digest: refinementProposalCandidateDigest(missingEvidenceProposal),
        },
      ],
    });
    await expect(
      missingEvidenceStore.writeStageJson(
        "refinements/proposal-1.json",
        missingEvidenceProposal,
      ),
    ).rejects.toThrow("missing frozen evaluation evidence");

    const staleInputProposal = refinementProposal("run-refinement-input");
    const staleInputStore = await authorizedStore(root, staleInputProposal.run_id);
    await staleInputStore.writeStageJson("execution/source-manifest.json", {
      ...sourceManifest,
      run_id: staleInputProposal.run_id,
    });
    await stageEvaluationInput(
      staleInputStore,
      staleInputProposal.evaluation_id,
      { status: "PASS" },
    );
    await staleInputStore.writeStageJson("evaluations/evaluation-1/receipt.json", {
      ...evaluation,
      run_id: staleInputProposal.run_id,
      input_manifest_digest: "f".repeat(64),
      refinement_proposal_bindings: [
        {
          proposal_id: staleInputProposal.proposal_id,
          candidate_digest: refinementProposalCandidateDigest(staleInputProposal),
        },
      ],
    });
    await expect(
      staleInputStore.writeStageJson(
        "refinements/proposal-1.json",
        staleInputProposal,
      ),
    ).rejects.toThrow("input manifest is stale or mismatched");
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

  test("rechecks refinement bindings at terminal finalization", async () => {
    const root = await temporaryRoot();
    const identity = identities();
    const store = await authorizedStore(root, "run-refinement-terminal", identity);
    await seedCompletedRun(store);
    await unlink(
      resolve(
        store.runRoot,
        "evaluations/evaluation-1/input/run/execution/execution-receipt.json",
      ),
    );
    await expect(
      store.finalize({
        status: "COMPLETED",
        finalized_by: identity.operator,
      }),
    ).rejects.toThrow("missing frozen evaluation evidence");

    const missingProposalStore = await authorizedStore(
      root,
      "run-refinement-terminal-set",
      identity,
    );
    await seedCompletedRun(missingProposalStore);
    await unlink(
      resolve(missingProposalStore.runRoot, "refinements/proposal-1.json"),
    );
    await expect(
      missingProposalStore.finalize({
        status: "COMPLETED",
        finalized_by: identity.operator,
      }),
    ).rejects.toThrow("do not match evaluation proposal bindings");
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
