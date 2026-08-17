import { describe, expect, test } from "bun:test";
import {
  link,
  mkdir,
  mkdtemp,
  rename,
  rm,
  stat,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { assertJsonSchema, readJson, rootPath, sha256File, stableJson } from "./common";

import {
  CAMPAIGN_FIXED_SOURCE_FILES,
  MAX_SIMULATION_SEED_BINDING_BYTES,
  SIMULATION_SEED_BINDING_PATH_PATTERN,
  actionBindingDigest,
  buildSimulationSeedBindingProjection,
  assertCampaignFixedSourceImportClosure,
  readBoundedSimulationSeedBinding,
  resolveCampaign,
  validateClaim,
  validateDataset,
  validatePopulation,
  validatePolicy,
  validateOracle,
  validateSimulation,
  validateSimulationCalibrationAuthority,
  validateCampaignIntakePathScope,
  validateCampaignSeedBindingScope,
  validateSimulationIntakeDestination,
  validateSimulationIntake,
  validateSimulationSeedBindingPath,
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

function seedBindingFixture(id: string) {
  return {
    schema_version: 1 as const,
    artifact_type: "cascade-simulation-seed-binding" as const,
    id,
    status: "DRAFT" as const,
    campaign_id: "seed-reader-smoke",
    campaign_sha256: "a".repeat(64),
    source: {
      task_envelope_id: null,
      task_envelope_revision: null,
      request_digest: null,
      source_digest: null,
    },
    mappings: [],
  };
}

const seedBindingPathCases = [
  ["wrong root", "product-evals/intakes/product/example.json"],
  ["dot component", "product-evals/intakes/product/seed-bindings/./example.json"],
  ["dotdot traversal", "product-evals/intakes/product/seed-bindings/../example.json"],
  ["backslash component", "product-evals/intakes/product/seed-bindings/example\\nested.json"],
  ["absolute path", rootPath("product-evals/intakes/product/seed-bindings/example.json")],
  ["duplicate separator", "product-evals/intakes/product/seed-bindings//example.json"],
  ["lowercase encoded dotdot", "product-evals/intakes/product/seed-bindings/%2e%2e/example.json"],
  ["uppercase encoded dotdot", "product-evals/intakes/product/seed-bindings/%2E%2E/example.json"],
  ["mixed-case encoded dotdot", "product-evals/intakes/product/seed-bindings/%2e%2E/example.json"],
  ["lowercase encoded slash", "product-evals/intakes/product/seed-bindings/nested%2fexample.json"],
  ["uppercase encoded slash", "product-evals/intakes/product/seed-bindings/nested%2Fexample.json"],
  ["lowercase encoded backslash", "product-evals/intakes/product/seed-bindings/nested%5cexample.json"],
  ["uppercase encoded backslash", "product-evals/intakes/product/seed-bindings/nested%5Cexample.json"],
  ["fullwidth-dot traversal", "product-evals/intakes/product/seed-bindings/\uFF0E\uFF0E/example.json"],
  ["division slash", "product-evals/intakes/product/seed-bindings/nested\u2215example.json"],
  ["fraction slash", "product-evals/intakes/product/seed-bindings/nested\u2044example.json"],
  ["other percent encoding", "product-evals/intakes/product/seed-bindings/%41example.json"],
  ["non-ASCII filename", "product-evals/intakes/product/seed-bindings/exampl\u00E9.json"],
] as const;

describe("simulation definition contracts", () => {
  test("campaign fixed sources cover the full transitive TypeScript runtime graph", async () => {
    await expect(assertCampaignFixedSourceImportClosure()).resolves.toBeUndefined();
    for (const required of [
      "scripts/cascade/admission.ts",
      "scripts/cascade/briefs.ts",
      "scripts/cascade/simulation-sessions.ts",
      ".codex/task-admission/policies/core.json",
      ".codex/task-admission/control-catalog.json",
      ".codex/task-admission/task-envelope.schema.json",
      "harness-evals/task-admission/case.schema.json",
      "harness-evals/task-admission/assessment.schema.json",
    ]) {
      expect(CAMPAIGN_FIXED_SOURCE_FILES).toContain(required);
      if (!required.endsWith(".ts")) continue;
      await expect(
        assertCampaignFixedSourceImportClosure(
          CAMPAIGN_FIXED_SOURCE_FILES.filter((path) => path !== required),
        ),
      ).rejects.toThrow("transitive runtime import");
    }
  });
  test("scans every supported literal runtime import form and rejects unresolved authority", async () => {
    const token = `campaign-import-${crypto.randomUUID()}`;
    const relativeRoot = `.artifacts/${token}`;
    const directory = rootPath(relativeRoot);
    const files = [
      "entry.ts",
      "side.ts",
      "from.ts",
      "dynamic.ts",
      "dynamic-options.ts",
      "import-equals.ts",
      "commonjs.ts",
      "comment-dynamic.ts",
      "comment-commonjs.ts",
      "template.ts",
    ];
    try {
      await mkdir(directory, { recursive: true });
      await writeFile(join(directory, "entry.ts"), [
        'import "./side";',
        'export { value } from "./from";',
        'void import("./dynamic");',
        'void import("./dynamic-options", { with: { type: "json" } });',
        'import imported = require("./import-equals");',
        'const common = require("./commonjs");',
        "void import/*comment*/('./comment-dynamic');",
        "const commented = require/*comment*/('./comment-commonjs');",
        'void import(`./template`);',
        'const importDecoy = \'require/*comment*/("./string-decoy")\';',
        '// import/*comment*/("./comment-decoy");',
      ].join("\n"));
      for (const dependency of files.slice(1)) {
        await writeFile(join(directory, dependency), "export const value = true;\n");
      }
      await expect(assertCampaignFixedSourceImportClosure(
        files.map((file) => `${relativeRoot}/${file}`),
      )).resolves.toBeUndefined();
      await writeFile(join(directory, "entry.ts"), 'import "./missing";\n');
      await expect(assertCampaignFixedSourceImportClosure([
        `${relativeRoot}/entry.ts`,
      ])).rejects.toThrow("unresolved relative import");
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
  test("reads one bounded seed buffer for validation, projection, and digest", async () => {
    const token = `seed-reader-${crypto.randomUUID()}`;
    const relativePath = `product-evals/intakes/product/seed-bindings/${token}.json`;
    const path = rootPath(relativePath);
    const definition = seedBindingFixture(token);
    const text = `${stableJson(definition, true)}\n`;
    try {
      await writeFile(path, text);
      const resolved = await readBoundedSimulationSeedBinding(relativePath);
      expect(resolved.definition).toEqual(definition);
      expect(resolved.sha256).toBe(await sha256File(path));
      expect(buildSimulationSeedBindingProjection(resolved)).toEqual({
        path: relativePath,
        sha256: resolved.sha256,
        id: definition.id,
        status: definition.status,
        campaign_id: definition.campaign_id,
        campaign_sha256: definition.campaign_sha256,
        source: definition.source,
        mappings: definition.mappings,
      });
    } finally {
      await rm(path, { force: true });
    }
  });

  test("rejects seed file and physical-ancestor symlinks", async () => {
    const token = `seed-link-${crypto.randomUUID()}`;
    const seedRoot = rootPath("product-evals/intakes/product/seed-bindings");
    const external = await mkdtemp(join(tmpdir(), "cascade-seed-link-"));
    const externalFile = join(external, "seed.json");
    const linkedFile = join(seedRoot, `${token}-file.json`);
    const linkedAncestor = join(seedRoot, `${token}-ancestor`);
    try {
      await writeFile(
        externalFile,
        `${stableJson(seedBindingFixture(`${token}-external`), true)}\n`,
      );
      await symlink(externalFile, linkedFile);
      await symlink(external, linkedAncestor);

      await expect(readBoundedSimulationSeedBinding(
        `product-evals/intakes/product/seed-bindings/${token}-file.json`,
      )).rejects.toThrow("must not be a symbolic link");
      await expect(readBoundedSimulationSeedBinding(
        `product-evals/intakes/product/seed-bindings/${token}-ancestor/seed.json`,
      )).rejects.toThrow("symbolic-link ancestor");
    } finally {
      await rm(linkedFile, { force: true });
      await rm(linkedAncestor, { recursive: true, force: true });
      await rm(external, { recursive: true, force: true });
    }
  });

  test("never returns substituted seed bytes across file and ancestor open races", async () => {
    const token = `seed-race-${crypto.randomUUID()}`;
    const seedRoot = rootPath("product-evals/intakes/product/seed-bindings");
    const external = await mkdtemp(join(tmpdir(), "cascade-seed-race-"));
    const externalDefinition = seedBindingFixture(`${token}-external`);
    try {
      await writeFile(
        join(external, "seed.json"),
        `${stableJson(externalDefinition, true)}\n`,
      );

      for (const kind of ["file", "ancestor"] as const) {
        const trustedDefinition = seedBindingFixture(`${token}-${kind}-trusted`);
        const source = join(seedRoot, `${token}-${kind}`);
        const parked = `${source}-parked`;
        const path = kind === "file" ? source : join(source, "seed.json");
        const relativePath = kind === "file"
          ? `product-evals/intakes/product/seed-bindings/${token}-${kind}`
          : `product-evals/intakes/product/seed-bindings/${token}-${kind}/seed.json`;
        try {
          if (kind === "ancestor") await mkdir(source);
          await writeFile(path, `${stableJson(trustedDefinition, true)}\n`);
          const pending = readBoundedSimulationSeedBinding(relativePath).then(
            (value) => ({ status: "fulfilled" as const, value }),
            (reason) => ({ status: "rejected" as const, reason }),
          );
          await rename(source, parked);
          await symlink(
            kind === "file" ? join(external, "seed.json") : external,
            source,
          );
          const outcome = await pending;
          if (outcome.status === "fulfilled") {
            expect(outcome.value.definition).toEqual(trustedDefinition);
            expect(outcome.value.definition).not.toEqual(externalDefinition);
          } else {
            expect(outcome.reason).toBeInstanceOf(Error);
          }
        } finally {
          await rm(source, { recursive: true, force: true });
          await rm(parked, { recursive: true, force: true });
        }
      }
    } finally {
      await rm(external, { recursive: true, force: true });
    }
  });

  test("rejects a same-inode seed replacement after its opened ancestor moves outside the seed root", async () => {
    const token = `seed-physical-root-${crypto.randomUUID()}`;
    const seedRoot = rootPath("product-evals/intakes/product/seed-bindings");
    const source = join(seedRoot, token);
    const file = join(source, "seed.json");
    const relativePath = `product-evals/intakes/product/seed-bindings/${token}/seed.json`;
    const parked = rootPath(`.artifacts/${token}-parked`);
    let checkpointReached = false;
    try {
      await mkdir(source, { recursive: true });
      await writeFile(
        file,
        `${stableJson(seedBindingFixture(`${token}-trusted`), true)}\n`,
      );
      const original = await stat(file);

      await expect(readBoundedSimulationSeedBinding(
        relativePath,
        `physically bounded seed ${token}`,
        {
          readCheckpoint: async (phase, openedPath) => {
            expect(phase).toBe("opened");
            expect(openedPath).toBe(file);
            checkpointReached = true;
            await rename(source, parked);
            await mkdir(source);
            await link(join(parked, "seed.json"), file);
            const replacement = await stat(file);
            expect(replacement.dev).toBe(original.dev);
            expect(replacement.ino).toBe(original.ino);
          },
        },
      )).rejects.toThrow(
        "escapes the permitted physical root after open",
      );
      expect(checkpointReached).toBe(true);
    } finally {
      await rm(source, { recursive: true, force: true });
      await rm(parked, { recursive: true, force: true });
    }
  });

  test("rejects oversized, invalid UTF-8, and invalid JSON seed artifacts", async () => {
    const token = `seed-invalid-${crypto.randomUUID()}`;
    const relativePath = `product-evals/intakes/product/seed-bindings/${token}.json`;
    const path = rootPath(relativePath);
    try {
      await writeFile(path, Buffer.alloc(MAX_SIMULATION_SEED_BINDING_BYTES + 1));
      await expect(readBoundedSimulationSeedBinding(relativePath))
        .rejects.toThrow(`exceeds ${MAX_SIMULATION_SEED_BINDING_BYTES} bytes`);
      await writeFile(path, Buffer.from([0xff]));
      await expect(readBoundedSimulationSeedBinding(relativePath))
        .rejects.toThrow("is not valid UTF-8");
      await writeFile(path, "{");
      await expect(readBoundedSimulationSeedBinding(relativePath))
        .rejects.toThrow("is not valid JSON");
    } finally {
      await rm(path, { force: true });
    }
  });

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

  test("keeps campaign schema and runtime intake roots equal to the simulation path scope", async () => {
    const schema = await readJson<Record<string, any>>(
      rootPath("product-evals/campaigns/schema.json"),
    );
    expect(schema.$defs.seedBindingPath.pattern).toBe(
      SIMULATION_SEED_BINDING_PATH_PATTERN,
    );
    const harnessCampaign = await readJson<Record<string, unknown>>(
      rootPath("product-evals/campaigns/simulation-contract-smoke.json"),
    );
    const productCampaign = {
      ...harnessCampaign,
      simulation_file: "product-evals/simulations/product/example/manifest.json",
      intake_file: "product-evals/intakes/product/example.json",
      seed_binding_file:
        "product-evals/intakes/product/seed-bindings/example.json",
      specialized_evaluation: null,
    };
    expect(() => assertJsonSchema(productCampaign, schema, "product campaign"))
      .not.toThrow();
    expect(() => validateCampaignSeedBindingScope(
      "product",
      productCampaign.seed_binding_file,
      "product campaign",
    )).not.toThrow();
    expect(() => assertJsonSchema(harnessCampaign, schema, "harness campaign"))
      .not.toThrow();
    expect(() => validateCampaignSeedBindingScope(
      "harness",
      undefined,
      "harness campaign",
    )).not.toThrow();

    const { seed_binding_file: _seedBindingFile, ...productWithoutSeed } =
      productCampaign;
    expect(() => assertJsonSchema(
      productWithoutSeed,
      schema,
      "product campaign without seed",
    )).toThrow("must match exactly one schema alternative");
    expect(() => validateCampaignSeedBindingScope(
      "product",
      undefined,
      "product campaign without seed",
    )).toThrow("product campaign requires seed_binding_file");

    const harnessWithSeed = {
      ...harnessCampaign,
      seed_binding_file:
        "product-evals/intakes/product/seed-bindings/example.json",
    };
    expect(() => assertJsonSchema(
      harnessWithSeed,
      schema,
      "harness campaign with seed",
    )).toThrow("must match exactly one schema alternative");
    expect(() => validateCampaignSeedBindingScope(
      "harness",
      harnessWithSeed.seed_binding_file,
      "harness campaign with seed",
    )).toThrow("harness campaign cannot bind a product seed artifact");

    for (const [name, seedBindingFile] of seedBindingPathCases) {
      const invalidProductCampaign = {
        ...productCampaign,
        seed_binding_file: seedBindingFile,
      };
      expect(() => assertJsonSchema(
        invalidProductCampaign,
        schema,
        `product campaign with ${name} seed`,
      )).toThrow("must match exactly one schema alternative");
      expect(() => validateCampaignSeedBindingScope(
        "product",
        seedBindingFile,
        `product campaign with ${name} seed`,
      )).toThrow(
        "seed_binding_file must be an ASCII-only canonical slash-separated JSON path under product-evals/intakes/product/seed-bindings/",
      );
    }

    for (const [simulationFile, intakeFile, scope] of [
      [
        "product-evals/simulations/product/example/manifest.json",
        "product-evals/intakes/harness/example.json",
        "product",
      ],
      [
        "product-evals/simulations/harness/example/manifest.json",
        "product-evals/intakes/product/example.json",
        "harness",
      ],
    ] as const) {
      const campaign = {
        ...harnessCampaign,
        simulation_file: simulationFile,
        intake_file: intakeFile,
      };
      expect(() => assertJsonSchema(campaign, schema, `${scope} campaign`))
        .toThrow("must match exactly one schema alternative");
      expect(() => validateCampaignIntakePathScope(
        simulationFile,
        intakeFile,
        `${scope} campaign`,
      )).toThrow(`simulation scope ${scope} requires product-evals/intakes/${scope}/`);
      expect(() => validateSimulationIntakeDestination(
        intakeFile,
        scope,
        `${scope} destination`,
      )).toThrow(`simulation scope ${scope} requires product-evals/intakes/${scope}/`);
    }

    const traversalCampaign = {
      ...harnessCampaign,
      simulation_file:
        "product-evals/simulations/product/../harness/example/manifest.json",
      intake_file: "product-evals/intakes/product/example.json",
    };
    expect(() => assertJsonSchema(traversalCampaign, schema, "traversal campaign"))
      .toThrow("must match exactly one schema alternative");
    expect(() => validateCampaignIntakePathScope(
      traversalCampaign.simulation_file,
      traversalCampaign.intake_file,
      "traversal campaign",
    )).toThrow("simulation_file must stay inside a physical harness or product simulation root");
  });

  test("keeps intake-v6 seed paths equal to the campaign and runtime grammar", async () => {
    const schema = await readJson<Record<string, any>>(
      rootPath("product-evals/intakes/schema.json"),
    );
    expect(schema.$defs.seedBindingPath.pattern).toBe(
      SIMULATION_SEED_BINDING_PATH_PATTERN,
    );
    const intake = {
      schema_version: 6,
      artifact_type: "cascade-simulation-intake",
      id: "SI-0123456789abcdef",
      status: "DRAFT",
      scope: "product",
      campaign_id: "example-smoke",
      produced_at: "2026-08-05T00:00:00Z",
      task_envelope: null,
      product_context: null,
      seed_binding: {
        path: "product-evals/intakes/product/seed-bindings/nested/.example-seed.json",
        sha256: "a".repeat(64),
        id: "example-seed",
        status: "DRAFT",
        campaign_id: "example-smoke",
        campaign_sha256: "b".repeat(64),
        source: {
          task_envelope_id: null,
          task_envelope_revision: null,
          request_digest: null,
          source_digest: null,
        },
        mappings: [],
      },
      claims: [],
      tasks: [],
      blockers: [],
      gaps: [],
      invalidation: ["source drift"],
    };
    expect(() => assertJsonSchema(intake, schema, "intake schema control"))
      .not.toThrow();
    expect(() => validateSimulationIntake(intake, "intake runtime control"))
      .not.toThrow();

    for (const [name, seedBindingPath] of seedBindingPathCases) {
      const candidate = structuredClone(intake);
      candidate.seed_binding.path = seedBindingPath;
      expect(() => assertJsonSchema(
        candidate,
        schema,
        `intake schema ${name}`,
      )).toThrow();
      expect(() => validateSimulationIntake(
        candidate,
        `intake runtime ${name}`,
      )).toThrow(
        "seed_binding.path must be an ASCII-only canonical slash-separated JSON path under product-evals/intakes/product/seed-bindings/",
      );
      expect(() => validateSimulationSeedBindingPath(
        seedBindingPath,
        `direct runtime ${name}`,
      )).toThrow(
        "must be an ASCII-only canonical slash-separated JSON path under product-evals/intakes/product/seed-bindings/",
      );
      await expect(readBoundedSimulationSeedBinding(
        seedBindingPath,
        `bounded reader ${name}`,
      )).rejects.toThrow(
        "must be an ASCII-only canonical slash-separated JSON path under product-evals/intakes/product/seed-bindings/",
      );
    }
  });

  test("rejects every unsafe seed spelling before loading any referenced campaign file", async () => {
    const token = `seed-scope-order-${crypto.randomUUID()}`;
    const relativePath = `product-evals/campaigns/${token}.json`;
    const path = rootPath(relativePath);
    const harnessCampaign = await readJson<Record<string, unknown>>(
      rootPath("product-evals/campaigns/simulation-contract-smoke.json"),
    );
    const referencedLoadSentinel = `product-evals/rubrics/${token}-must-not-load.json`;
    try {
      for (const [name, seedBindingFile] of seedBindingPathCases) {
        await writeFile(path, `${stableJson({
          ...harnessCampaign,
          id: token,
          evaluation_profile_file: referencedLoadSentinel,
          simulation_file: `product-evals/simulations/product/${token}/manifest.json`,
          intake_file: `product-evals/intakes/product/${token}.json`,
          seed_binding_file: seedBindingFile,
          specialized_evaluation: null,
        }, true)}\n`);

        await expect(resolveCampaign(relativePath)).rejects.toThrow(
          "seed_binding_file must be an ASCII-only canonical slash-separated JSON path under product-evals/intakes/product/seed-bindings/",
        );
        await expect(resolveCampaign(relativePath)).rejects.not.toThrow(
          `definition missing: ${referencedLoadSentinel}`,
        );
        expect(() => validateSimulationSeedBindingPath(
          seedBindingFile,
          `referenced-load sentinel ${name}`,
        )).toThrow();
      }
    } finally {
      await rm(path, { force: true });
    }
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
          schema_version: 2,
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
          schema_version: 2,
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

  test("requires the strict direct-process isolation contract", () => {
    const process = {
      working_directory: "task-root",
      environment: {},
      interactive: false,
      network: "deny",
      filesystem: { read: "host", write: "task-root" },
    } as const;
    expect(() =>
      validateTask(
        {
          schema_version: 3,
          id: "STRICT-COMMAND",
          kind: "command",
          driver: { type: "direct-process" },
          required: true,
          timeout_ms: 1000,
          command: ["/usr/bin/printf", "ok"],
          process,
          oracle_ids: ["command-ok"],
        },
        "strict-command",
      ),
    ).not.toThrow();
    expect(() =>
      validateTask(
        {
          schema_version: 2,
          id: "LEGACY-COMMAND",
          kind: "command",
          driver: { type: "direct-process" },
          required: true,
          timeout_ms: 1000,
          command: ["/usr/bin/printf", "ok"],
          oracle_ids: ["command-ok"],
        },
        "legacy-command",
      ),
    ).toThrow("require schema_version 3");
    expect(() =>
      validateTask(
        {
          schema_version: 3,
          id: "INTERACTIVE-COMMAND",
          kind: "command",
          driver: { type: "direct-process" },
          required: true,
          timeout_ms: 1000,
          command: ["/usr/bin/printf", "ok"],
          process: { ...process, interactive: true },
          oracle_ids: ["command-ok"],
        },
        "interactive-command",
      ),
    ).toThrow("route interactive work to terminal");
    for (const command of [
      ["/usr/bin/printf", "$HOME"],
      ["/usr/bin/printf", "ok", "|", "/usr/bin/wc"],
      ["/usr/bin/printf", "$(uname)"],
    ]) {
      expect(() => validateTask({
        schema_version: 3,
        id: "IMPLICIT-SHELL-COMMAND",
        kind: "command",
        driver: { type: "direct-process" },
        required: true,
        timeout_ms: 1000,
        command,
        process,
        oracle_ids: ["command-ok"],
      }, "implicit-shell-command")).toThrow(
        "declare an absolute shell executable explicitly",
      );
    }
    expect(() => validateTask({
      schema_version: 3,
      id: "EXPLICIT-SHELL-COMMAND",
      kind: "command",
      driver: { type: "direct-process" },
      required: true,
      timeout_ms: 1000,
      command: ["/bin/sh", "-c", "printf '%s' \"$HOME\""],
      process,
      oracle_ids: ["command-ok"],
    }, "explicit-shell-command")).not.toThrow();
  });

  test("validates bounded HTTP task definitions and rejects unsafe URLs", () => {
    expect(() =>
      validateTask(
        {
          schema_version: 2,
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
          schema_version: 2,
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

    expect(() => validateTask({
      schema_version: 2,
      id: "SAFE-HTTP-TASK",
      kind: "http",
      driver: { type: "http-client" },
      required: true,
      timeout_ms: 1000,
      request: {
        method: "POST",
        url: "https://example.test/health",
        headers: {
          "Content-Type": { kind: "public-literal", value: "application/json" },
          Authorization: {
            kind: "secret-reference",
            reference_id: "vault/example/auth",
            immutable_version: "version-1",
          },
        },
        body: { kind: "public-literal", value: '{"probe":true}' },
      },
      oracle_ids: ["http-status-ok"],
    }, "safe-http-task")).not.toThrow();

    for (const request of [
      {
        method: "POST",
        url: "https://example.test/health",
        headers: { Authorization: "x" },
      },
      {
        method: "POST",
        url: "https://example.test/health",
        headers: {
          "x-Api-Key": { kind: "public-literal", value: "1" },
        },
      },
      {
        method: "POST",
        url: "https://example.test/health",
        body: { kind: "public-literal", value: '{"password":"1"}' },
      },
      {
        method: "POST",
        url: "https://example.test/health",
        body: "ambiguous",
      },
    ]) {
      expect(() => validateTask({
        schema_version: 2,
        id: "BLOCKED-HTTP-TASK",
        kind: "http",
        driver: { type: "http-client" },
        required: true,
        timeout_ms: 1000,
        request,
        oracle_ids: ["http-status-ok"],
      }, "blocked-http-task")).toThrow(
        "action contains prohibited inline sensitive material",
      );
    }
  });

  test("requires the bounded PTY terminal contract", async () => {
    const task = {
      schema_version: 6,
      id: "TERMINAL-SMOKE",
      kind: "terminal",
      driver: { type: "pty", adapter: "builtin-pty" },
      required: true,
      timeout_ms: 5_000,
      command: ["/bin/sh", "-c", "printf 'Continue? '; read answer; printf 'done:%s\\n' \"$answer\""],
      terminal: {
        working_directory: "task-root",
        environment: {},
        network: "deny",
        filesystem: { read: "host", write: "task-root" },
        cols: 80,
        rows: 24,
        steps: [
          { type: "terminal-wait", text: "Continue? ", timeout_ms: 1_000 },
          {
            type: "terminal-input",
            value: { kind: "public-literal", value: "yes" },
            append_enter: true,
          },
          { type: "terminal-wait", text: "done:yes", timeout_ms: 1_000 },
          { type: "terminal-resize", cols: 100, rows: 30 },
          { type: "terminal-capture", label: "completed" },
        ],
        expected_exit_code: 0,
        evidence: { raw_stream: true, transcript: true, final_screen: true },
      },
      oracle_ids: ["terminal-completed-v1"],
      policy_ids: ["allow-terminal-spawn-v1", "allow-terminal-steps-v1"],
    };
    expect(() => validateTask(task, "terminal-task")).not.toThrow();
    const schema = await readJson<Record<string, unknown>>(
      rootPath("product-evals/tasks/schema.json"),
    );
    expect(() => assertJsonSchema(task, schema, "terminal task schema"))
      .not.toThrow();
    expect(() => validateTask({ ...task, schema_version: 5 }, "terminal-task"))
      .toThrow("require schema_version 6");
    expect(() => validateTask({
      ...task,
      terminal: { ...task.terminal, network: "allow" },
    }, "terminal-task")).toThrow("isolation contract is invalid");
    expect(() => validateTask({
      ...task,
      terminal: {
        ...task.terminal,
        steps: [{
          type: "terminal-input",
          value: { kind: "public-literal", value: "password=1" },
          append_enter: true,
        }],
      },
    }, "terminal-task")).toThrow("prohibited inline sensitive material");
  });

  test("requires the isolated structured Playwright browser contract", async () => {
    const task = {
      schema_version: 4,
      id: "BROWSER-SMOKE",
      kind: "browser",
      driver: { type: "playwright", adapter: "builtin-playwright" },
      required: true,
      timeout_ms: 15000,
      browser: {
        fixture_file: "product-evals/simulations/harness/browser-fixture.html",
        profile: "ephemeral",
        network: "deny",
        downloads: false,
        uploads: false,
        actions: [
          {
            type: "browser-fill",
            locator: { kind: "label", value: "Resolution" },
            value: "Replaced worn belt",
          },
          {
            type: "browser-click",
            locator: { kind: "role", role: "button", name: "Complete task" },
          },
        ],
        observation: {
          locator: { kind: "role", role: "status" },
          expected_text: "Completed: Replaced worn belt",
        },
        evidence: { screenshot: true, trace: true },
      },
      oracle_ids: ["browser-visible-status-v1"],
      policy_ids: ["allow-browser-simulation-smoke-v1"],
    };
    expect(() => validateTask(task, "browser-task")).not.toThrow();
    const schema = await readJson<Record<string, unknown>>(
      rootPath("product-evals/tasks/schema.json"),
    );
    expect(() => assertJsonSchema(task, schema, "browser task schema"))
      .not.toThrow();
    expect(() => validateTask({ ...task, schema_version: 3 }, "browser-task"))
      .toThrow("require schema_version 4");
    expect(() => validateTask({
      ...task,
      browser: {
        ...task.browser,
        fixture_file: "product-evals/simulations/product/browser-fixture.html",
      },
    }, "browser-task")).toThrow("must be a harness HTML fixture");
    expect(() => validateTask({
      ...task,
      browser: { ...task.browser, network: "allow" },
    }, "browser-task")).toThrow("isolation contract is invalid");
  });

  test("requires the pinned isolated desktop platform contract", async () => {
    const task = await readJson<Record<string, unknown>>(
      rootPath("product-evals/tasks/DESKTOP-LINUX-SMOKE.json"),
    );
    const schema = await readJson<Record<string, unknown>>(
      rootPath("product-evals/tasks/schema.json"),
    );
    expect(() => validateTask(task, "desktop-task")).not.toThrow();
    expect(() => assertJsonSchema(task, schema, "desktop task schema"))
      .not.toThrow();
    expect(() => validateTask({
      ...task,
      driver: { type: "platform-automation", adapter: "builtin-mobile-platform" },
    }, "desktop-task")).toThrow("must match the platform task kind");
    expect(() => validateTask({
      ...task,
      desktop: {
        ...(task.desktop as Record<string, unknown>),
        network: "allow",
      },
    }, "desktop-task")).toThrow("isolation contract is invalid");
  });

  test("requires the exact fail-closed mobile provider contract", async () => {
    const task = await readJson<Record<string, unknown>>(
      rootPath("product-evals/tasks/MOBILE-ANDROID-PREFLIGHT.json"),
    );
    const schema = await readJson<Record<string, unknown>>(
      rootPath("product-evals/tasks/schema.json"),
    );
    expect(() => validateTask(task, "mobile-task")).not.toThrow();
    expect(() => assertJsonSchema(task, schema, "mobile task schema"))
      .not.toThrow();
    const mobile = structuredClone(task.mobile as Record<string, unknown>);
    const actions = mobile.actions as Array<Record<string, unknown>>;
    actions[0] = {
      type: "mobile-type",
      value: {
        kind: "secret-reference",
        reference_id: "vault/mobile/input",
        immutable_version: "v1",
      },
    };
    expect(() => validateTask({ ...task, mobile }, "mobile-task"))
      .toThrow("must be an explicit public literal");
  });

  test("requires task-file oracles to stay inside the task root", () => {
    for (const file of ["../result.json", "./result.json", "/tmp/result.json", "nested\\result.json", "nested//result.json"]) {
      expect(() => validateOracle(
        {
          schema_version: 1,
          id: "invalid-task-file",
          type: "task-file-exists",
          file,
        },
        "task-file-oracle",
      )).toThrow("canonical task-root-relative path");
    }
    expect(() => validateOracle(
      {
        schema_version: 1,
        id: "valid-task-file",
        type: "task-file-exists",
        file: "outputs/result.json",
      },
      "task-file-oracle",
    )).not.toThrow();
  });

  test("requires agent-runtime tasks to bind exact source-blind inputs", async () => {
    const task = await readJson<Record<string, unknown>>(
      rootPath("product-evals/tasks/AGENT-RESPONSE-FIXTURE-SMOKE.json"),
    );
    expect(() => validateTask(task, "agent-task")).not.toThrow();
    const schema = await readJson<Record<string, unknown>>(
      rootPath("product-evals/tasks/schema.json"),
    );
    expect(() => assertJsonSchema(task, schema, "agent task schema")).not.toThrow();
    expect(() => validateTask({
      ...task,
      agent: {
        ...(task.agent as Record<string, unknown>),
        source_blind: false,
      },
    }, "agent-task")).toThrow("evaluation/source-blind contract is invalid");
    expect(() => validateTask({
      ...task,
      inputs: [
        ...((task.inputs as string[]).slice(0, -1)),
        "product-evals/tasks/agent-response/golden-result.json",
      ],
    }, "agent-task")).toThrow("exact source-blind task files");
  });

  test("rejects low-entropy sensitive material before action binding", () => {
    const blockedActions = [
      { type: "process-exec" as const, argv: ["tool", "--password=1"] },
      { type: "process-exec" as const, argv: ["tool", "--OTP", "1"] },
      { type: "process-exec" as const, argv: ["tool", "AUTH=1"] },
      {
        type: "http-request" as const,
        method: "GET" as const,
        url: "https://example.test/health?AUTH=1",
      },
      {
        type: "http-request" as const,
        method: "POST" as const,
        url: "https://example.test/health",
        body: { kind: "public-literal" as const, value: '{"PiN":"1"}' },
      },
      {
        type: "http-request" as const,
        method: "POST" as const,
        url: "https://example.test/health",
        body: { kind: "public-literal" as const, value: "passcode=1" },
      },
      {
        type: "http-request" as const,
        method: "GET" as const,
        url: "https://example.test/health",
        headers: {
          "X-Auth": { kind: "public-literal" as const, value: "1" },
        },
      },
    ];
    for (const action of blockedActions) {
      expect(() => actionBindingDigest(action)).toThrow(
        "action contains prohibited inline sensitive material",
      );
    }
    expect(() => actionBindingDigest({
      type: "process-exec",
      argv: ["tool", "--output=1"],
    })).not.toThrow();
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

    for (const keyId of ["__proto__", "constructor", "prototype", " space"] ) {
      const invalidKey = structuredClone(
        resolved.policies[0]!,
      ) as unknown as Record<string, unknown>;
      invalidKey.effect = "REQUIRE_CONFIRMATION";
      invalidKey.confirmation_authority = {
        key_id: keyId,
        secret_env: "CASCADE_CONFIRMATION_KEY",
        allowed_confirmers: ["human:reviewer"],
      };
      expect(() => validatePolicy(invalidKey, "invalid-policy")).toThrow(
        "key_id is invalid",
      );
    }
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
