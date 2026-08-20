import { describe, expect, test } from "bun:test";
import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import {
  type CampaignIdentityEnvelope,
  CampaignArtifactStore,
} from "./campaign-artifacts";
import {
  CascadeError,
  exists,
  rootPath,
  sha256File,
  sha256Text,
  stableJson,
  valueDigest,
  writeJson,
} from "./common";
import { refinementProposalCandidateDigest } from "./persona-simulations";
import { disposeRefinement, previewDerivedPopulation, renderStarterPackage, simulationIntakeCliOptions } from "./simulations";

function refinementIdentities(): CampaignIdentityEnvelope {
  return {
    schema_version: 2,
    operator: {
      role: "simulation-operator",
      session_id: "operator-session",
      subject: "operator",
    },
    evaluator: {
      role: "simulation-evaluator",
      session_id: "evaluator-session",
      subject: "independent-evaluator",
    },
    specialized_evaluator: null,
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
  };
}

function refinementProposal(runId: string) {
  return {
    schema_version: 1,
    proposal_id: "proposal-1",
    run_id: runId,
    campaign_id: "simulation-contract-smoke",
    evaluation_id: `${runId}-evaluation`,
    persona: {
      persona_id: "P-999",
      revision: 1,
      path: "docs/product/personas/fixtures/P-999-framework-support-role.md",
      sha256: "e0376f335cce998b2a5189cc2e000b150f7b91d76bccd735df40f6f85110687a",
    },
    derivation: {
      id: "p-999-coverage-v1",
      path: "product-evals/simulations/harness/simulation-correctness-fixture/derivations/P-999-coverage-v1.json",
      sha256: "87370d2a8a6f877b9baf446ac3ff672c5837bf4c5c70ed9ce718e8c8a0faac79",
    },
    proposal_type: "missing-dimension" as const,
    target_field: "Context.Tools",
    summary: "A product workflow dimension may be absent.",
    rationale: "The frozen evaluation exposed a coverage question.",
    recommended_change: "Route reviewed evidence to synthesis.",
    evidence_paths: ["run/execution/execution-receipt.json"],
    confidence: "medium" as const,
    disposition_route: "synthesis-to-spec" as const,
    external_evidence_required: true,
    human_review_required: true,
    direct_persona_mutation_allowed: false as const,
    status: "PROPOSED" as const,
    proposed_by: "independent-evaluator",
    created_at: "2026-08-04T00:00:00Z",
    promotion_blockers: [
      "external evidence has not been reviewed",
      "accountable human persona review has not approved a new revision",
    ],
  };
}

async function seedFinalizedRefinementRun(runId: string) {
  const root = rootPath(".artifacts/product-evals");
  const identity = refinementIdentities();
  const base = new CampaignArtifactStore(root, runId);
  const leaseAcquiredAt = new Date();
  const leaseExpiresAt = new Date(leaseAcquiredAt.getTime() + 60 * 60 * 1_000);
  await base.reserve({
    campaign_id: "simulation-contract-smoke",
    campaign_digest: "digest-1",
    simulation_scope: "product",
    claim_ids: ["fixture-refinement-claim"],
    specialized_evaluation: null,
    attempt: 1,
    identities: identity,
    lease: {
      lease_id: "lease-1",
      owner_session_id: identity.operator.session_id,
      acquired_at: leaseAcquiredAt.toISOString(),
      expires_at: leaseExpiresAt.toISOString(),
      recovery_mode: "FINALIZE_UNKNOWN_OUTCOME" as const,
    },
  });
  const store = base.withAuthority(identity.operator, "lease-1");
  const proposal = refinementProposal(runId);
  const runIdentity = {
    run_id: runId,
    campaign_id: proposal.campaign_id,
  };
  const sourceManifest = {
    schema_version: 1,
    ...runIdentity,
    status: "FROZEN",
    definitions: [
      { path: proposal.persona.path, sha256: proposal.persona.sha256 },
      { path: proposal.derivation.path, sha256: proposal.derivation.sha256 },
    ],
  };
  const execution = {
    schema_version: 1,
    ...runIdentity,
    status: "PASS",
    source_manifest_digest: valueDigest(sourceManifest),
    cleanup_verified: true,
  };
  await store.appendLifecycle({ status: "RUNNING" });
  await store.writeStageJson("execution/source-manifest.json", sourceManifest);
  await store.writeStageJson("execution/execution-receipt.json", execution);
  const stagedEvidence = `evaluations/${proposal.evaluation_id}/input/run/execution/execution-receipt.json`;
  await store.writeStageJson(stagedEvidence, execution);
  const files = [{
    path: "run/execution/execution-receipt.json",
    sha256: await sha256File(resolve(store.runRoot, stagedEvidence)),
  }];
  const inputManifestDigest = valueDigest(files);
  await store.writeStageJson(
    `evaluations/${proposal.evaluation_id}/input/input-manifest.json`,
    { files, manifest_digest: inputManifestDigest },
  );
  const evaluation = {
    schema_version: 3,
    ...runIdentity,
    evaluation_id: proposal.evaluation_id,
    operator_identity: identity.operator.subject,
    evaluator_identity: proposal.proposed_by,
    principal_identities: {
      operator: identity.operator.subject,
      specialized_evaluator: null,
      evaluator: identity.evaluator.subject,
      aggregator: identity.aggregator.subject,
      target: identity.target.subject,
      simulator: identity.simulator.subject,
      recovery: identity.recovery.subject,
    },
    specialized_evaluation: null,
    provider: "codex",
    profile_id: "codex-independent-v1",
    profile_digest: valueDigest({
      schema_version: 1,
      id: "codex-independent-v1",
      provider: "codex",
      model: "gpt-5.6-terra",
      reasoning_effort: "high",
      timeout_ms: 300000,
      rubric_file: "product-evals/rubrics/simulation-evaluator-v1.json",
    }),
    rubric_id: "simulation-evaluator-v1",
    rubric_digest: "2".repeat(64),
    model: "gpt-5.6-terra",
    reasoning_effort: "high",
    status: "PASS",
    source_manifest_digest: valueDigest(sourceManifest),
    execution_receipt_digest: valueDigest(execution),
    calibration_receipt_digest: null,
    evaluation_input_digest: valueDigest({
      run_id: runId,
      campaign_id: proposal.campaign_id,
      claim_ids: ["fixture-refinement-claim"],
    }),
    input_manifest_digest: inputManifestDigest,
    provider_trace_digest: "4".repeat(64),
    provider_output_digest: "5".repeat(64),
    claim_ledger: [{
      claim_id: "fixture-refinement-claim",
      class: "mechanical-behavior",
      status: "SUPPORTED",
      reason: "fixture refinement proposal is digest-bound",
      evidence: [],
    }],
    refinement_proposal_bindings: [{
      proposal_id: proposal.proposal_id,
      candidate_digest: refinementProposalCandidateDigest(proposal),
    }],
    usage: {},
    root_cause: "none",
    earliest_failure: null,
    residual_uncertainty: [
      "fixture refinement evidence does not establish product truth",
    ],
    next_route: "accountable product review remains required",
    created_at: "2026-08-04T00:00:00Z",
  };
  const aggregation = {
    schema_version: 2,
    ...runIdentity,
    aggregation_id: `${runId}-aggregation`,
    aggregator_identity: identity.aggregator.subject,
    status: "PASS",
    execution_receipt_digest: valueDigest(execution),
    specialized_evaluation_receipt_digest: null,
    evaluation_receipt_digest: valueDigest(evaluation),
    calibration_receipt_digest: null,
    release_eligible: false,
    release_claims: [],
    created_at: "2026-08-04T00:00:00Z",
  };
  await store.writeStageJson(
    `evaluations/${proposal.evaluation_id}/receipt.json`,
    evaluation,
  );
  await store.writeStageJson("aggregations/aggregation-1.json", aggregation);
  await store.writeStageJson("refinements/proposal-1.json", proposal);
  await store.writeStageJson("summary.json", {
    schema_version: 1,
    ...runIdentity,
    execution_status: "PASS",
    evaluation_status: "PASS",
    evaluation_provider: "codex",
    evaluation_profile_id: "codex-independent-v1",
    evaluation_model: "gpt-5.6-terra",
    evaluation_attempt: null,
    calibration_status: "NOT_RUN",
    calibration_scope: "none",
    release_eligible: false,
    campaign_status: "PASS",
    execution_receipt_digest: valueDigest(execution),
    specialized_evaluation_receipt_digest: null,
    evaluation_receipt_digest: valueDigest(evaluation),
    calibration_receipt_digest: null,
    aggregation_receipt_digest: valueDigest(aggregation),
    completed_at: "2026-08-04T00:00:00Z",
  });
  await store.appendTrustedLifecycle({ status: "COMPLETED" });
  await store.finalize({ status: "COMPLETED", finalized_by: identity.operator });
  return proposal;
}

function externalEvidenceManifest(id: string) {
  return {
    schema_version: 1,
    id,
    kind: "research",
    reference: `minimized consented research synthesis ${id}`,
    evidence_sha256: sha256Text(id),
    source_authority: "product research lead",
    reference_window: "2026-07-01 through 2026-07-31",
    usage_rights: "consented",
    sensitivity: "restricted",
    retention_policy: {
      mode: "manual-review",
      deletion_owner: "product research lead",
      expires_at: null,
    },
    permitted_purpose: "persona refinement review",
    prohibited_uses: ["raw transcript redistribution"],
    reviewed_by: "privacy reviewer",
    reviewed_at: "2026-08-03T00:00:00Z",
  };
}

describe("simulation starter bootstrap", () => {
  test("threads exact expected Task Envelope bindings through the public intake CLI", () => {
    const requestDigest = "a".repeat(64);
    const sourceDigest = "b".repeat(64);
    expect(simulationIntakeCliOptions("campaign", [
      "--envelope", "product-evals/intakes/product/task-envelopes/TE-0123456789abcdef.json",
      "--brief", "PB-001",
      "--expected-request-digest", requestDigest,
      "--expected-source-digest", sourceDigest,
    ])).toEqual({
      campaign: "campaign",
      envelopePath: "product-evals/intakes/product/task-envelopes/TE-0123456789abcdef.json",
      brief: "PB-001",
      expectedRequestDigest: requestDigest,
      expectedSourceDigest: sourceDigest,
    });
  });

  test("previews an approved product-persona derivation without writing", async () => {
    const result = await previewDerivedPopulation({
      personaId: "P-999",
      simulationId: "simulation-correctness-fixture",
      mode: "coverage",
      dryRun: true,
    });
    expect(result.status).toBe("DRY_RUN");
    expect(result.population.schema_version).toBe(2);
    expect(result.population.weight_semantics).toBe("test-allocation");
    expect(result.population.source.product_personas[0]!.persona_id).toBe("P-999");
  });

  test("fails closed when no exact persona derivation exists", async () => {
    await expect(
      previewDerivedPopulation({
        personaId: "P-001",
        simulationId: "simulation-correctness-fixture",
        mode: "coverage",
        dryRun: true,
      }),
    ).rejects.toThrow("found 0");
  });

  test("materializes deterministic populations without overwriting an exact match", async () => {
    const result = await previewDerivedPopulation({
      personaId: "P-999",
      simulationId: "simulation-correctness-fixture",
      mode: "coverage",
      dryRun: false,
    });
    expect(result.status).toBe("UNCHANGED");
    expect(result.existing_match).toBe(true);
  });

  test("previews and writes an append-only governed refinement disposition", async () => {
    const token = `disposition-${crypto.randomUUID()}`;
    const arbitraryToken = `arbitrary-${crypto.randomUUID()}`;
    const proposalPath = `.artifacts/product-evals/${token}/refinements/proposal-1.json`;
    const arbitraryProposalPath = `.artifacts/product-evals/${arbitraryToken}/refinements/proposal-1.json`;
    const evidencePath = `.artifacts/product-evals/evidence-manifests/${token}.json`;
    const outputRoot = `.artifacts/product-evals/refinement-reviews/${token}`;
    try {
      await writeJson(
        rootPath(arbitraryProposalPath),
        refinementProposal(arbitraryToken),
        { directoryMode: 0o700, fileMode: 0o600 },
      );
      await expect(disposeRefinement({
        proposalPath: arbitraryProposalPath,
        dispositionId: arbitraryToken,
        decision: "ACCEPTED",
        reviewerIdentity: "persona-owner",
        evidenceManifestPaths: [],
        dryRun: true,
      })).rejects.toThrow();

      await seedFinalizedRefinementRun(token);
      await writeJson(
        rootPath(evidencePath),
        externalEvidenceManifest("evidence-1"),
        { directoryMode: 0o700, fileMode: 0o600 },
      );
      const options = {
        proposalPath,
        dispositionId: token,
        decision: "ACCEPTED" as const,
        reviewerIdentity: "persona-owner",
        evidenceManifestPaths: [evidencePath],
      };
      const preview = await disposeRefinement({ ...options, dryRun: true });
      expect(preview.status).toBe("DRY_RUN");
      const written = await disposeRefinement({ ...options, dryRun: false });
      expect(written.status).toBe("WRITTEN");
      expect(written.disposition.direct_persona_mutation_allowed).toBe(false);
      await expect(disposeRefinement({ ...options, dryRun: false })).rejects.toThrow();
    } finally {
      await rm(rootPath(`.artifacts/product-evals/${token}`), { recursive: true, force: true });
      await rm(rootPath(`.artifacts/product-evals/${arbitraryToken}`), { recursive: true, force: true });
      await rm(rootPath(evidencePath), { force: true });
      await rm(rootPath(outputRoot), { recursive: true, force: true });
    }
  });

  test("rejects deterministic external-evidence replacement without authorization", async () => {
    const token = `evidence-replacement-${crypto.randomUUID()}`;
    const proposalPath = `.artifacts/product-evals/${token}/refinements/proposal-1.json`;
    const evidencePath = `.artifacts/product-evals/evidence-manifests/${token}.json`;
    const parkedPath = `${rootPath(evidencePath)}.parked`;
    const replacementPath = `${rootPath(evidencePath)}.replacement`;
    const outputPath = `.artifacts/product-evals/refinement-reviews/${token}/disposition.json`;
    let replaced = false;
    try {
      await seedFinalizedRefinementRun(token);
      await writeJson(
        rootPath(evidencePath),
        externalEvidenceManifest("evidence-original"),
        { directoryMode: 0o700, fileMode: 0o600 },
      );
      await writeFile(
        replacementPath,
        `${stableJson(externalEvidenceManifest("evidence-replacement"), true)}\n`,
        { mode: 0o600 },
      );
      await expect(disposeRefinement({
        proposalPath,
        dispositionId: token,
        decision: "ACCEPTED",
        reviewerIdentity: "persona-owner",
        evidenceManifestPaths: [evidencePath],
        dryRun: false,
      }, {
        externalEvidenceReadCheckpoint: async () => {
          await rename(rootPath(evidencePath), parkedPath);
          await rename(replacementPath, rootPath(evidencePath));
          replaced = true;
        },
      })).rejects.toThrow(/changed while being read|changed identity/);
      expect(await exists(rootPath(outputPath))).toBe(false);
    } finally {
      await rm(rootPath(`.artifacts/product-evals/${token}`), { recursive: true, force: true });
      await rm(rootPath(evidencePath), { force: true });
      await rm(replacementPath, { force: true });
      await rm(parkedPath, { force: true });
      await rm(rootPath(`.artifacts/product-evals/refinement-reviews/${token}`), {
        recursive: true,
        force: true,
      });
      expect(replaced).toBe(true);
    }
  });

  test("renders one complete collision-free package", async () => {
    const files = await renderStarterPackage({
      simulationId: "generated-example",
      ownerLane: "W-123",
      title: "Generated Example",
      referenceDate: "2026-07-30",
    });
    expect(files).toHaveLength(21);
    expect(new Set(files.map((file) => file.path)).size).toBe(files.length);
    expect(
      files.some(
        (file) =>
          file.path ===
          "product-evals/simulations/product/generated-example/manifest.json",
      ),
    ).toBe(true);
    const seedBinding = files.find(
      (file) => file.path === "product-evals/intakes/product/seed-bindings/generated-example-smoke.json",
    )!.content as { status: string; campaign_sha256: string };
    expect(seedBinding.status).toBe("DRAFT");
    expect(
      files.some(
        (file) => file.path === "product-evals/intakes/product/generated-example-smoke.json",
      ),
    ).toBe(true);
    expect(
      files.some(
        (file) =>
          file.path ===
            "product-evals/simulations/product/generated-example/simulation-design.md" &&
          file.format === "text",
      ),
    ).toBe(true);
    expect(
      files.some(
        (file) =>
          file.path === "product-evals/campaigns/generated-example-smoke.json",
      ),
    ).toBe(true);
    const campaign = files.find(
      (file) => file.path === "product-evals/campaigns/generated-example-smoke.json",
    )!.content as { id: string };
    expect(seedBinding.campaign_sha256).toBe(
      sha256Text(`${stableJson(campaign, true)}\n`),
    );
    const manifest = files.find(
      (file) =>
        file.path ===
        "product-evals/simulations/product/generated-example/manifest.json",
    )!.content as { simulation_scope: string };
    expect(manifest.simulation_scope).toBe("product");
    const policy = files.find(
      (file) =>
        file.path ===
        "product-evals/policies/generated-example-allow-state-actions-v1.json",
    )!.content as { scope: { campaign_ids: string[] } };
    expect(policy.scope.campaign_ids).toEqual([campaign.id]);
    const task = files.find(
      (file) =>
        file.path === "product-evals/tasks/GENERATED-EXAMPLE-STATE-SMOKE.json",
    )!.content as { driver: { type: string; adapter: string } };
    expect(task.driver).toEqual({
      type: "fake",
      adapter: "builtin-fake",
    });
    const design = files.find(
      (file) =>
        file.path ===
        "product-evals/simulations/product/generated-example/simulation-design.md",
    )!.content as string;
    expect(design).toContain(
      "distinct reserved role sessions are required",
    );
    expect(design).toContain("product-scoped framework scaffold");
    expect(design).toContain(
      "product-evals/simulations/product/generated-example/worlds/default.fixture.json",
    );
    expect(design).not.toContain("product-evals/fixtures/");
    expect(design).toContain("no-secrets-v1 or source-code-v1");
    expect(design).toContain("campaign verify");
    expect(stableJson(files)).not.toContain("{{");
  });

  test("renders deterministic content for the same inputs", async () => {
    const options = {
      simulationId: "deterministic-example",
      ownerLane: "W-123",
      referenceDate: "2026-07-30",
    };
    expect(stableJson(await renderStarterPackage(options))).toBe(
      stableJson(await renderStarterPackage(options)),
    );
  });

  test("rejects unsafe IDs, lanes, titles, and dates", async () => {
    await expect(
      renderStarterPackage({
        simulationId: "../escape",
        ownerLane: "W-123",
      }),
    ).rejects.toBeInstanceOf(CascadeError);
    await expect(
      renderStarterPackage({
        simulationId: "safe-id",
        ownerLane: "lane-1",
      }),
    ).rejects.toBeInstanceOf(CascadeError);
    await expect(
      renderStarterPackage({
        simulationId: "safe-id",
        ownerLane: "W-123",
        title: "{{BROKEN}}",
      }),
    ).rejects.toBeInstanceOf(CascadeError);
    await expect(
      renderStarterPackage({
        simulationId: "safe-id",
        ownerLane: "W-123",
        referenceDate: "2026-02-30",
      }),
    ).rejects.toBeInstanceOf(CascadeError);
  });
});
