import { describe, expect, test } from "bun:test";

import { readText, rootPath } from "./common";
import {
  generateBrief,
  loadAndValidateProductCatalog,
  resolveBrief,
  validateBriefCoverage,
  validateCompleteBriefBindings,
  validateEvidenceSupportBindings,
  validateBriefManifestShape,
  validateBriefRepository,
  validateCatalogShape,
} from "./briefs";
import { compilePatternSelections } from "./patterns";

describe("product context catalog and briefs", () => {
  test("resolves every current product row through a stable domain and capability", async () => {
    const catalog = await loadAndValidateProductCatalog();
    expect(catalog.domains.map((item) => item.id)).toEqual(["PD-001"]);
    expect(catalog.capabilities.map((item) => item.id)).toEqual(["PC-001", "PC-002", "PC-003"]);
    expect(catalog.capabilities.find((item) => item.id === "PC-001")).toMatchObject({
      requirement_ids: ["PR-001", "PR-002", "PR-003", "PR-004", "PR-005"],
      persona_ids: [],
    });
  });

  test("resolves contract-test evidence for the simulation intake brief", async () => {
    const resolved = await resolveBrief("PB-002");
    expect(resolved.capability.id).toBe("PC-003");
    expect(resolved.manifest.simulation_context).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "scripts/cascade/simulation-intake.test.ts",
          scope: "contract-test",
          authority: "implementation",
        }),
      ]),
    );
  });

  test("resolves the complete persona-simulation brief graph", async () => {
    const resolved = await resolveBrief("PB-001");
    expect(resolved.domain.id).toBe("PD-001");
    expect(resolved.capability.id).toBe("PC-001");
    expect(resolved.manifest.coverage_mode).toBe("complete");
    expect(resolved.patternSections.map((item) => item.section_id)).toContain(
      "evidence-promotion-boundary",
    );
    expect(resolved.manifest.simulation_context[0]).toMatchObject({
      scope: "harness-simulation",
      authority: "mechanics-only",
    });
  });

  test("generates byte-identical source-bound output", async () => {
    const first = await generateBrief("PB-001");
    const second = await generateBrief("PB-001");
    expect(first).toBe(second);
    expect(first).toContain("Catalog digest:");
    expect(first).toContain("Selected-source digest:");
    expect(first).toContain("Compiler-contract digest:");
    expect(first).toContain("Capability Evaluation References");
    expect(first).toContain("`harness-simulation` / `mechanics-only`");
    expect(first).toContain("No reviewed non-fixture product persona is selected");
    expect(first).not.toContain("Generated at:");
  });

  test("tracked generated briefs are current", async () => {
    expect(await validateBriefRepository(true)).toEqual([]);
    const generated = await generateBrief("PB-001");
    expect(await readText(rootPath("docs/specs/persona-simulation-governance/brief.generated.md"))).toBe(
      generated,
    );
    expect(
      await readText(rootPath("docs/specs/simulation-intake-agent-bridge/brief.generated.md")),
    ).toBe(await generateBrief("PB-002"));
  });

  test("rejects duplicate catalog identity", () => {
    expect(() =>
      validateCatalogShape({
        schema_version: 1,
        product: { id: "cascade", name: "Cascade", summary: "summary" },
        domains: [
          { id: "PD-001", name: "one", status: "reviewed", owner: "owner", summary: "one", source_paths: ["docs/product/_index.md"] },
          { id: "PD-001", name: "two", status: "reviewed", owner: "owner", summary: "two", source_paths: ["docs/product/_index.md"] },
        ],
        capabilities: [
          { id: "PC-001", domain_id: "PD-001", name: "capability", status: "reviewed", owner: "owner", summary: "summary", source_paths: ["docs/product/_index.md"], requirement_ids: [], journey_ids: [], scenario_ids: [], persona_ids: [], evaluation_refs: [] },
        ],
      }),
    ).toThrow("product domain IDs contains duplicate values");
  });

  test("rejects unsupported evidence promotion", async () => {
    const source = Bun.YAML.parse(
      await Bun.file(rootPath("docs/specs/persona-simulation-governance/brief.yaml")).text(),
    ) as Record<string, unknown>;
    const evidence = structuredClone(source.evidence) as Array<Record<string, unknown>>;
    evidence[0]!.authority = "product";
    expect(() => validateBriefManifestShape({ ...source, evidence })).toThrow(
      "incompatible kind and authority",
    );
  });

  test("keeps runtime cardinality and path rules aligned with the public schemas", async () => {
    const source = Bun.YAML.parse(
      await Bun.file(rootPath("docs/specs/persona-simulation-governance/brief.yaml")).text(),
    ) as Record<string, unknown>;
    expect(() => validateBriefManifestShape({ ...source, audiences: [] })).toThrow(
      "brief audiences must contain at least one value",
    );
    const emptySupports = structuredClone(source);
    (emptySupports.evidence as Array<Record<string, unknown>>)[0]!.supports = [];
    expect(() => validateBriefManifestShape(emptySupports)).toThrow(
      "evidence[0].supports must contain at least one value",
    );
    const crossedRoot = structuredClone(source);
    (crossedRoot.simulation_context as Array<Record<string, unknown>>)[0]!.path =
      "product-evals/simulations/product/example/manifest.json";
    expect(() => validateBriefManifestShape(crossedRoot)).toThrow(
      "path must be under product-evals/simulations/harness/",
    );
  });

  test("rejects evidence support IDs that are absent from selected source contracts", () => {
    expect(() =>
      validateEvidenceSupportBindings(
        [{ id: "EVD-001", supports: ["MISSING-999"] } as never],
        [{ path: "docs/specs/example.md", content: "Contract ID: `PCB-001`" }],
      ),
    ).toThrow("support does not resolve in selected source documents");
  });

  test("rejects unknown manifest fields", async () => {
    const source = Bun.YAML.parse(
      await Bun.file(rootPath("docs/specs/persona-simulation-governance/brief.yaml")).text(),
    ) as Record<string, unknown>;
    expect(() => validateBriefManifestShape({ ...source, implicit_fallback: true })).toThrow(
      "brief manifest has unknown fields",
    );
  });

  test("rejects incomplete complete coverage and unexplained selected omissions", async () => {
    const resolved = await resolveBrief("PB-001");
    const incomplete = structuredClone(resolved.manifest);
    incomplete.product_refs.scenario_ids.pop();
    expect(() => validateBriefCoverage(incomplete, resolved.capability)).toThrow(
      "must cover the exact capability references",
    );

    const selected = structuredClone(incomplete);
    selected.coverage_mode = "selected";
    expect(() => validateBriefCoverage(selected, resolved.capability)).toThrow(
      "must explain every omitted capability reference",
    );
  });

  test("rejects missing complete-brief source and evaluation bindings", async () => {
    const resolved = await resolveBrief("PB-001");
    const missingSource = structuredClone(resolved.manifest);
    missingSource.source_documents = missingSource.source_documents.filter(
      (path) => path !== resolved.capability.source_paths[0],
    );
    expect(() => validateCompleteBriefBindings(missingSource, resolved.capability)).toThrow(
      "omits capability source paths",
    );

    const missingEvaluation = structuredClone(resolved.manifest);
    missingEvaluation.simulation_context = [];
    expect(() => validateCompleteBriefBindings(missingEvaluation, resolved.capability)).toThrow(
      "omits capability evaluation references",
    );
  });

  test("rejects missing reusable context sections", async () => {
    expect(
      compilePatternSelections([
        { pack_id: "product-context-core", section_ids: ["missing-section"] },
      ]),
    ).rejects.toThrow("unknown pattern section");
  });
});
