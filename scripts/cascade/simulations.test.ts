import { describe, expect, test } from "bun:test";
import { rm } from "node:fs/promises";

import { CascadeError, rootPath, stableJson, writeJson } from "./common";
import { disposeRefinement, previewDerivedPopulation, renderStarterPackage } from "./simulations";

describe("simulation starter bootstrap", () => {
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
    const proposalPath = `.artifacts/product-evals/${token}/refinements/proposal-1.json`;
    const evidencePath = `.artifacts/product-evals/evidence-manifests/${token}.json`;
    const outputRoot = `.artifacts/product-evals/refinement-reviews/${token}`;
    try {
      await writeJson(rootPath(proposalPath), {
        schema_version: 1,
        proposal_id: "proposal-1",
        run_id: token,
        campaign_id: "simulation-contract-smoke",
        evaluation_id: `${token}-evaluation`,
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
        proposal_type: "missing-dimension",
        target_field: "Context.Tools",
        summary: "A product workflow dimension may be absent.",
        rationale: "The frozen evaluation exposed a coverage question.",
        recommended_change: "Route reviewed evidence to synthesis.",
        evidence_paths: ["evaluation/evaluation.json"],
        confidence: "medium",
        disposition_route: "synthesis-to-spec",
        external_evidence_required: true,
        human_review_required: true,
        direct_persona_mutation_allowed: false,
        status: "PROPOSED",
        proposed_by: "independent-evaluator",
        created_at: "2026-08-04T00:00:00Z",
        promotion_blockers: [
          "external evidence has not been reviewed",
          "accountable human persona review has not approved a new revision",
        ],
      });
      await writeJson(rootPath(evidencePath), {
        schema_version: 1,
        id: "evidence-1",
        kind: "research",
        reference: "minimized consented research synthesis",
        evidence_sha256: "d".repeat(64),
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
      });
      const options = {
        proposalPath,
        dispositionId: token,
        decision: "ACCEPTED" as const,
        reviewerIdentity: "persona-owner",
        evidenceManifestPaths: [evidencePath],
      };
      await expect(
        disposeRefinement({ ...options, dryRun: true }),
      ).rejects.toThrow();
      const dependencies = { verifyFrozenRun: async () => {} };
      const preview = await disposeRefinement({ ...options, dryRun: true }, dependencies);
      expect(preview.status).toBe("DRY_RUN");
      const written = await disposeRefinement({ ...options, dryRun: false }, dependencies);
      expect(written.status).toBe("WRITTEN");
      expect(written.disposition.direct_persona_mutation_allowed).toBe(false);
      await expect(disposeRefinement({ ...options, dryRun: false }, dependencies)).rejects.toThrow();
    } finally {
      await rm(rootPath(`.artifacts/product-evals/${token}`), { recursive: true, force: true });
      await rm(rootPath(evidencePath), { force: true });
      await rm(rootPath(outputRoot), { recursive: true, force: true });
    }
  });

  test("renders one complete collision-free package", async () => {
    const files = await renderStarterPackage({
      simulationId: "generated-example",
      ownerLane: "W-123",
      title: "Generated Example",
      referenceDate: "2026-07-30",
    });
    expect(files).toHaveLength(20);
    expect(new Set(files.map((file) => file.path)).size).toBe(files.length);
    expect(
      files.some(
        (file) =>
          file.path ===
          "product-evals/simulations/product/generated-example/manifest.json",
      ),
    ).toBe(true);
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
