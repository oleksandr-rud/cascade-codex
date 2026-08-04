import { describe, expect, test } from "bun:test";

import {
  resolveCampaign,
  validateClaim,
  validateDataset,
  validatePopulation,
  validatePolicy,
  validateSimulation,
  validateSimulationCalibrationAuthority,
  validateTask,
  validateTaskPolicyApplicability,
} from "./simulation-definitions";
import {
  buildPersonaRefinementDisposition,
  materializeRefinementProposal,
  personaGeneratorInputDigest,
  validatePersonaDerivation,
  validatePersonaRefinementDisposition,
  validateProductPersonaSourceMetadata,
} from "./persona-simulations";

describe("simulation definition contracts", () => {
  test("resolves the complete correctness fixture graph", async () => {
    const resolved = await resolveCampaign(
      "product-evals/campaigns/simulation-contract-smoke.json",
    );
    expect(resolved.populations).toHaveLength(1);
    expect(resolved.simulation.simulation_scope).toBe("harness");
    expect(resolved.personaDerivations).toHaveLength(1);
    expect(resolved.campaign.session).toMatchObject({
      max_parallel_steps: 2,
      max_steps_per_episode: 2,
      lease_ttl_ms: 60_000,
    });
    expect(resolved.artifactPolicy.raw_sensitive_material_allowed).toBe(false);
    expect(resolved.artifactPolicy.export).toBe("disabled");
    expect(resolved.sourceFiles).toContain(
      "docs/product/personas/fixtures/P-999-framework-support-role.md",
    );
    expect(resolved.dataset.cases.map((item) => item.partition).sort()).toEqual([
      "calibration-reference",
      "calibration-reference",
      "calibration-reference",
      "development",
      "holdout",
      "regression",
    ]);
    expect(resolved.treatments.filter((item) => item.baseline)).toHaveLength(1);
  });

  test("rejects simulation scope and physical-root mismatches", async () => {
    const resolved = await resolveCampaign(
      "product-evals/campaigns/simulation-contract-smoke.json",
    );
    const simulation = structuredClone(resolved.simulation) as unknown as Record<
      string,
      unknown
    >;
    expect(() =>
      validateSimulation(
        simulation,
        "product-evals/simulations/product/simulation-correctness-fixture/manifest.json",
      ),
    ).toThrow("simulation_scope path mismatch");

    simulation.simulation_scope = "unknown";
    expect(() =>
      validateSimulation(
        simulation,
        "product-evals/simulations/harness/simulation-correctness-fixture/manifest.json",
      ),
    ).toThrow("simulation_scope is invalid");
  });

  test("prevents harness simulations from binding product calibration authority", async () => {
    const resolved = await resolveCampaign(
      "product-evals/campaigns/simulation-contract-smoke.json",
    );
    const calibration = structuredClone(resolved.calibration!);
    calibration.framework_fixture = false;
    expect(() =>
      validateSimulationCalibrationAuthority(resolved.simulation, calibration),
    ).toThrow("harness simulation cannot bind non-framework calibration");

    const productSimulation = structuredClone(resolved.simulation);
    productSimulation.simulation_scope = "product";
    expect(() =>
      validateSimulationCalibrationAuthority(productSimulation, calibration),
    ).not.toThrow();
  });

  test("rejects population weights that do not sum to one", () => {
    expect(() =>
      validatePopulation(
        {
          schema_version: 1,
          id: "invalid-population",
          source: { kind: "synthetic", description: "negative fixture" },
          actors: [
            {
              id: "actor-a",
              weight: 0.4,
              behavior: {},
              slices: ["standard"],
            },
          ],
        },
        "invalid-population",
      ),
    ).toThrow("weights must sum to 1");
  });

  test("keeps coverage weights distinct from prevalence", async () => {
    const resolved = await resolveCampaign(
      "product-evals/campaigns/simulation-contract-smoke.json",
    );
    const population = structuredClone(resolved.populations[0]!) as unknown as Record<
      string,
      unknown
    >;
    population.weight_semantics = "estimated-prevalence";
    expect(() => validatePopulation(population, "invalid-derived-population")).toThrow(
      "must use test-allocation",
    );
  });

  test("requires reviewed or approved persona source status", () => {
    const persona = {
      persona_id: "P-001",
      revision: 2,
      path: "docs/product/personas/P-001.md",
      sha256: "a".repeat(64),
    };
    expect(() =>
      validateProductPersonaSourceMetadata(
        "ID: P-001\nRevision: 2\nStatus: `draft`\n",
        persona,
        "draft persona",
      ),
    ).toThrow("must be reviewed or approved");
    expect(() =>
      validateProductPersonaSourceMetadata(
        "ID: P-001\nRevision: 2\nStatus: `superseded`\n",
        persona,
        "superseded persona",
      ),
    ).toThrow("must be reviewed or approved");
    expect(() =>
      validateProductPersonaSourceMetadata(
        [
          "ID: P-001",
          "Revision: 2",
          "Status: `reviewed`",
          "Reference Window: 2026-01-01 through 2026-06-30",
          "## Evidence, Confidence, And Uncertainty",
          "| Attribute | Invalidation Signal |",
          "## Permitted Uses And Prohibited Claims",
          "- Review owner: Product research lead.",
        ].join("\n"),
        persona,
        "reviewed persona",
      ),
    ).not.toThrow();
    expect(() =>
      validateProductPersonaSourceMetadata(
        "ID: P-001\nRevision: 2\nStatus: `reviewed`\n",
        persona,
        "ungoverned persona",
      ),
    ).toThrow("lacks governed Reference Window");
  });

  test("rejects implicit prevalence and stale persona generator inputs", async () => {
    const resolved = await resolveCampaign(
      "product-evals/campaigns/simulation-contract-smoke.json",
    );
    const manifest = structuredClone(resolved.personaDerivations[0]!.manifest);
    const prevalence = structuredClone(manifest) as unknown as Record<string, unknown>;
    prevalence.mode = "representative";
    prevalence.weight_semantics = "estimated-prevalence";
    expect(() => validatePersonaDerivation(prevalence, "implicit prevalence")).toThrow(
      "prevalence_evidence",
    );

    const stale = structuredClone(manifest) as unknown as Record<string, unknown>;
    (stale.dimensions as Array<Record<string, unknown>>)[0]!.description =
      "changed generation input";
    expect(() => validatePersonaDerivation(stale, "stale generator")).toThrow(
      "generator.input_digest is stale",
    );

    const restricted = structuredClone(manifest) as unknown as Record<string, unknown>;
    const restrictedEvidence = (restricted.evidence_sources as Array<Record<string, unknown>>)[0]!;
    restrictedEvidence.sensitivity = "restricted";
    restrictedEvidence.operator_attestation = null;
    (restricted.generator as Record<string, unknown>).input_digest =
      personaGeneratorInputDigest(restricted);
    expect(() => validatePersonaDerivation(restricted, "restricted evidence")).toThrow(
      "operator_attestation is required",
    );
  });

  test("rejects case identity leakage across partitions", () => {
    expect(() =>
      validateDataset(
        {
          schema_version: 1,
          id: "invalid-dataset",
          leakage_policy: "exclusive-case-identity",
          cases: [
            {
              id: "same-case",
              scenario_id: "scenario-a",
              actor_id: "actor-a",
              partition: "development",
            },
            {
              id: "same-case",
              scenario_id: "scenario-a",
              actor_id: "actor-a",
              partition: "holdout",
            },
          ],
        },
        "invalid-dataset",
      ),
    ).toThrow("leaks case identity");
  });

  test("rejects mismatched surface and driver types", () => {
    expect(() =>
      validateTask(
        {
          schema_version: 1,
          id: "INVALID-TASK",
          kind: "browser",
          driver: { type: "direct-process" },
          required: true,
          timeout_ms: 1000,
          command: ["true"],
          oracle_ids: ["oracle-a"],
        },
        "invalid-task",
      ),
    ).toThrow("invalid kind/driver");
  });

  test("bounds every individual task inside a resumable session episode", () => {
    expect(() =>
      validateTask(
        {
          schema_version: 1,
          id: "UNBOUNDED-TASK",
          kind: "command",
          driver: { type: "direct-process" },
          required: true,
          timeout_ms: 3_600_001,
          command: ["true"],
          oracle_ids: ["command-ok"],
        },
        "unbounded task",
      ),
    ).toThrow("between 1 and 3600000");
  });

  test("validates bounded HTTP task definitions and rejects unsafe URLs", () => {
    expect(() =>
      validateTask(
        {
          schema_version: 1,
          id: "HTTP-TASK",
          kind: "http",
          driver: { type: "http-client", adapter: "builtin-http-client" },
          required: true,
          timeout_ms: 1000,
          request: { method: "GET", url: "https://example.test/health" },
          oracle_ids: ["http-status-ok"],
        },
        "http-task",
      ),
    ).not.toThrow();
    expect(() =>
      validateTask(
        {
          schema_version: 1,
          id: "UNSAFE-HTTP-TASK",
          kind: "http",
          driver: { type: "http-client" },
          required: true,
          timeout_ms: 1000,
          request: {
            method: "GET",
            url: "https://user:secret@example.test/health#fragment",
          },
          oracle_ids: ["http-status-ok"],
        },
        "unsafe-http-task",
      ),
    ).toThrow("must not contain credentials or a fragment");
  });

  test("rejects malformed state actions before execution", () => {
    expect(() =>
      validateTask(
        {
          schema_version: 1,
          id: "INVALID-ACTION",
          kind: "agent-response",
          driver: { type: "fake" },
          required: true,
          timeout_ms: 1000,
          actions: [{ type: "increment", amount: "one" }],
          oracle_ids: ["oracle-a"],
        },
        "invalid-action",
      ),
    ).toThrow("path is required");
  });

  test("rejects referenced policies whose scope cannot apply before execution", async () => {
    const resolved = await resolveCampaign(
      "product-evals/campaigns/simulation-contract-smoke.json",
    );
    const policy = structuredClone(resolved.policies[0]!);
    policy.scope.campaign_ids = ["different-campaign"];

    expect(() =>
      validateTaskPolicyApplicability(
        resolved.campaign,
        resolved.tasks[0]!,
        [policy],
      ),
    ).toThrow("has no applicable referenced policy");
  });

  test("keeps executable policy validation aligned with the public schema", async () => {
    const resolved = await resolveCampaign(
      "product-evals/campaigns/simulation-contract-smoke.json",
    );
    const policy = structuredClone(resolved.policies[0]!) as Record<
      string,
      unknown
    >;
    policy.version = "not-semver";
    policy.unexpected = true;
    expect(() => validatePolicy(policy, "invalid-policy")).toThrow(
      "unknown fields",
    );

    const invalidVersion = structuredClone(
      resolved.policies[0]!,
    ) as unknown as Record<string, unknown>;
    invalidVersion.version = "not-semver";
    expect(() => validatePolicy(invalidVersion, "invalid-policy")).toThrow(
      "version must be semver",
    );

    const emptyPaths = structuredClone(resolved.policies[0]!) as unknown as Record<
      string,
      unknown
    >;
    (emptyPaths.scope as Record<string, unknown>).action_paths = [];
    expect(() => validatePolicy(emptyPaths, "invalid-policy")).toThrow(
      "action_paths is empty",
    );
  });

  test("rejects unknown evidence artifact names", () => {
    expect(() =>
      validateClaim(
        {
          schema_version: 1,
          id: "invalid-claim",
          class: "execution",
          assertion: "negative fixture",
          scope: { fixture: true },
          population_authority: "none",
          required_policy_ids: [],
          required_oracle_ids: [],
          required_metric_ids: [],
          requires_calibration: false,
          evidence_requirements: ["screen-recording"],
        },
        "invalid-claim",
      ),
    ).toThrow("unknown artifact");
  });

  test("requires external evidence and preserves proposal-only persona refinement", async () => {
    const resolved = await resolveCampaign(
      "product-evals/campaigns/simulation-contract-smoke.json",
    );
    const derivation = resolved.personaDerivations[0]!;
    const persona = derivation.manifest.product_personas[0]!;
    const proposal = materializeRefinementProposal(
      {
        proposal_id: "proposal-governed-refinement",
        persona_id: persona.persona_id,
        derivation_id: derivation.manifest.id,
        proposal_type: "missing-dimension",
        target_field: "Context.Tools",
        summary: "A product workflow dimension may be absent.",
        rationale: "The frozen evaluation exposed a coverage question.",
        recommended_change: "Route reviewed evidence to a new persona revision.",
        evidence_paths: ["evaluation/evaluation.json"],
        confidence: "medium",
        disposition_route: "synthesis-to-spec",
      },
      {
        runId: "run-governed-refinement",
        campaignId: resolved.campaign.id,
        evaluationId: "evaluation-governed-refinement",
        evaluatorIdentity: "independent-evaluator",
        persona,
        derivation: {
          id: derivation.manifest.id,
          path: derivation.path,
          sha256: derivation.sha256,
        },
        createdAt: "2026-08-04T00:00:00Z",
      },
    );
    const base = {
      dispositionId: "disposition-governed-refinement",
      proposalPath:
        ".artifacts/product-evals/run-governed-refinement/refinements/proposal-governed-refinement.json",
      proposalDigest: "a".repeat(64),
      proposal,
      decision: "ACCEPTED" as const,
      reviewerIdentity: "persona-owner",
      reviewedAt: "2026-08-04T01:00:00Z",
    };
    expect(() =>
      buildPersonaRefinementDisposition({ ...base, evidence: [] }),
    ).toThrow("requires reviewed external evidence");
    const disposition = buildPersonaRefinementDisposition({
      ...base,
      evidence: [
        {
          path: "docs/product/evidence/interview-batch-v1.json",
          digest: "b".repeat(64),
          manifest: {
            schema_version: 1,
            id: "interview-batch-v1",
            kind: "research",
            reference: "minimized interview synthesis",
            evidence_sha256: "c".repeat(64),
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
          },
        },
      ],
    });
    expect(disposition.persona_revision_authorized).toBe(true);
    expect(disposition.direct_persona_mutation_allowed).toBe(false);
    expect(disposition.next_route).toBe("synthesis-to-spec");
    expect(() =>
      validatePersonaRefinementDisposition(
        { ...disposition, direct_persona_mutation_allowed: true },
        "unsafe disposition",
      ),
    ).toThrow("governed refinement disposition controls");
  });
});
