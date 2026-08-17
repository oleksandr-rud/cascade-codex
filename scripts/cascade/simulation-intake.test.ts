import { describe, expect, test } from "bun:test";
import { mkdir, rm, symlink, writeFile } from "node:fs/promises";

import { compileTaskEnvelope, type TaskEnvelope } from "./admission";
import { generateBrief, resolveCurrentBriefProjection } from "./briefs";
import { buildCampaignCatalog, main as campaignMain } from "./campaigns";
import { assertJsonSchema, readJson, rootPath, sha256File, sha256Text, stableJson, writeJson } from "./common";
import { renderStarterPackage } from "./simulations";
import { buildSimulationIntakeTaskBindings, compileSimulationIntake, simulationIntakeAdmissionBindingBlockers } from "./simulation-intake";
import {
  type PolicyDefinition,
  MAX_TASK_ENVELOPE_SNAPSHOT_BYTES,
  readBoundedTaskEnvelopeSnapshot,
  resolveCampaign,
  taskPolicyActions,
  validateReadySimulationIntakeEnvelopeBinding,
  validateReadySimulationIntakeProductContextBinding,
  validateSimulationIntake,
  validateSimulationSeedBinding,
  type SimulationIntakeDefinition,
  type TaskDefinition,
} from "./simulation-definitions";

function projectedClaims(envelope: TaskEnvelope): SimulationIntakeDefinition["claims"] {
  return envelope.claims.filter((claim) => claim.status !== "SUPERSEDED").map((claim, index) => ({
    claim_id: `SIC-${String(index + 1).padStart(3, "0")}`,
    source_claim_id: claim.claim_id,
    kind: claim.kind,
    source: claim.source,
    statement: claim.statement,
    status: claim.status,
    policy_tags: [...new Set(claim.policy_tags)].sort(),
  }));
}

describe("simulation intake contract", () => {
  test("publishes only the v6 intake schema identity", async () => {
    const schema = await readJson<Record<string, any>>(rootPath("product-evals/intakes/schema.json"));
    expect(schema.$id).toBe("https://cascade.local/schemas/simulation-intake.v6.schema.json");
    expect(schema.properties.schema_version.const).toBe(6);
  });

  test("validates authored seed dispositions without implicit claim matching", async () => {
    const schema = await readJson<Record<string, unknown>>(
      rootPath("product-evals/intakes/seed-binding.schema.json"),
    );
    const ready = {
      schema_version: 1,
      artifact_type: "cascade-simulation-seed-binding",
      id: "example-seed-v1",
      status: "READY",
      campaign_id: "example-smoke",
      campaign_sha256: "a".repeat(64),
      source: {
        task_envelope_id: "TE-0123456789abcdef",
        task_envelope_revision: 1,
        request_digest: "b".repeat(64),
        source_digest: "c".repeat(64),
      },
      mappings: [{
        source_claim_id: "CL-001",
        disposition: "SEEDED",
        campaign_claim_ids: ["campaign-claim"],
        scenario_ids: ["scenario-1"],
        task_ids: [],
        rationale: null,
      }, {
        source_claim_id: "CL-002",
        disposition: "CONTEXT_ONLY",
        campaign_claim_ids: [],
        scenario_ids: [],
        task_ids: [],
        rationale: "This constraint informs interpretation but does not seed execution.",
      }],
    };
    expect(() => assertJsonSchema(ready, schema, "seed schema fixture")).not.toThrow();
    expect(() => validateSimulationSeedBinding(ready, "seed runtime fixture")).not.toThrow();

    const duplicate = structuredClone(ready);
    duplicate.mappings.push(structuredClone(duplicate.mappings[0]!));
    expect(() => validateSimulationSeedBinding(duplicate, "duplicate seed fixture"))
      .toThrow("duplicate duplicate seed fixture.source_claim_id: CL-001");
    const noSeeded = structuredClone(ready);
    noSeeded.mappings = [structuredClone(ready.mappings[1]!)];
    expect(() => validateSimulationSeedBinding(noSeeded, "unseeded fixture"))
      .toThrow("requires at least one SEEDED mapping");
    const missingTargets = structuredClone(ready);
    missingTargets.mappings[0]!.scenario_ids = [];
    expect(() => validateSimulationSeedBinding(missingTargets, "missing targets fixture"))
      .toThrow("must match at least one schema alternative");
    const implicitTargets = structuredClone(ready);
    implicitTargets.mappings[1]!.campaign_claim_ids = ["campaign-claim"];
    expect(() => validateSimulationSeedBinding(implicitTargets, "context targets fixture"))
      .toThrow("has more than maxItems");
  });

  test("keeps runtime rejection in parity with every closed v6 schema boundary", async () => {
    const schema = await readJson<Record<string, unknown>>(
      rootPath("product-evals/intakes/schema.json"),
    );
    const valid = {
      schema_version: 6,
      artifact_type: "cascade-simulation-intake",
      id: "SI-0123456789abcdef",
      status: "DRAFT",
      scope: "harness",
      campaign_id: "example-smoke",
      produced_at: "2026-08-04T00:00:00Z",
      task_envelope: {
        path: "product-evals/intakes/harness/task-envelopes/TE-0123456789abcdef.json",
        envelope_id: "TE-0123456789abcdef",
        revision: 1,
        sha256: "a".repeat(64),
        request_digest: "b".repeat(64),
        source_digest: null,
        derivation_input_digest: "c".repeat(64),
        provenance_version: 2,
        provenance_mode: "LEXICAL_FALLBACK",
        source_segments_digest: "f".repeat(64),
        direct_user_attestation: null,
        expected_request_digest: null,
        expected_source_digest: null,
      },
      product_context: null,
      seed_binding: null,
      claims: [{
        claim_id: "SIC-001",
        source_claim_id: "CL-001",
        kind: "OUTCOME",
        source: "USER",
        statement: "Run the bounded harness campaign.",
        status: "PROVIDED",
        policy_tags: ["simulation"],
      }],
      tasks: [{
        task_id: "TASK-001",
        declared_policy_ids: ["POLICY-001"],
        applicable_policy_ids: ["POLICY-001"],
        actions: [{
          action_index: 0,
          action_binding_version: "cascade-action-binding-v2",
          action_binding_digest: "d".repeat(64),
          applicable_policy_ids: ["POLICY-001"],
          policy_digests: ["e".repeat(64)],
          decision: "ALLOW",
        }],
      }],
      blockers: ["draft fixture"],
      gaps: [],
      invalidation: ["source drift"],
    };
    expect(() => assertJsonSchema(valid, schema, "schema fixture")).not.toThrow();
    expect(() => validateSimulationIntake(valid, "runtime fixture")).not.toThrow();
    const preciseInstant = structuredClone(valid);
    preciseInstant.produced_at = "2026-08-04T00:00:00.123456789Z";
    expect(() => validateSimulationIntake(preciseInstant, "runtime precise instant")).not.toThrow();

    const invalidCases: Array<[string, (value: Record<string, any>) => void]> = [
      ["top-level property", (value) => { value.unsupported = true; }],
      ["task-envelope property", (value) => { value.task_envelope.unsupported = true; }],
      ["claim property", (value) => { value.claims[0].unsupported = true; }],
      ["claim statement", (value) => { delete value.claims[0].statement; }],
      ["task property", (value) => { value.tasks[0].unsupported = true; }],
      ["action property", (value) => { value.tasks[0].actions[0].unsupported = true; }],
      ["missing action binding version", (value) => { delete value.tasks[0].actions[0].action_binding_version; }],
      ["missing action binding digest", (value) => { delete value.tasks[0].actions[0].action_binding_digest; }],
      ["missing action decision", (value) => { delete value.tasks[0].actions[0].decision; }],
      ["numeric blocker", (value) => { value.blockers = [1]; }],
      ["null blocker", (value) => { value.blockers = [null]; }],
      ["numeric gap", (value) => { value.gaps = [1]; }],
      ["null gap", (value) => { value.gaps = [null]; }],
      ["numeric invalidation", (value) => { value.invalidation = [1]; }],
      ["null invalidation", (value) => { value.invalidation = [null]; }],
      ["empty invalidation", (value) => { value.invalidation = []; }],
      ["fractional revision", (value) => { value.task_envelope.revision = 1.5; }],
      ["empty policy tag", (value) => { value.claims[0].policy_tags = [""]; }],
    ];
    for (const [name, mutate] of invalidCases) {
      const candidate = structuredClone(valid) as Record<string, any>;
      mutate(candidate);
      expect(() => assertJsonSchema(candidate, schema, `schema ${name}`)).toThrow();
      expect(() => validateSimulationIntake(candidate, `runtime ${name}`)).toThrow();
    }
    for (const [name, producedAt] of [
      ["impossible produced date", "2026-02-30T00:00:00Z"],
      ["invalid offset", "2026-08-04T00:00:00+24:00"],
    ] as const) {
      const candidate = structuredClone(valid) as Record<string, any>;
      candidate.produced_at = producedAt;
      expect(() =>
        assertJsonSchema(candidate, schema, `schema ${name}`)
      ).not.toThrow();
      expect(() => validateSimulationIntake(candidate, `runtime ${name}`)).toThrow();
    }

    const productContextFixture = structuredClone(valid) as Record<string, any>;
    productContextFixture.scope = "product";
    productContextFixture.task_envelope.path =
      "product-evals/intakes/product/task-envelopes/TE-0123456789abcdef.json";
    productContextFixture.product_context = {
      brief_path: "docs/specs/example/brief.yaml",
      brief_id: "PB-001",
      revision: 1,
      sha256: "a".repeat(64),
      output_path: "docs/specs/example/brief.generated.md",
      output_sha256: "b".repeat(64),
      domain_id: "PD-001",
      capability_id: "PC-001",
      product_refs: {},
    };
    for (const [name, value] of [
      ["unsupported", true],
      ["status", "reviewed"],
      ["derivation", { source: "brief" }],
    ] as const) {
      const invalidProductContext = structuredClone(productContextFixture);
      invalidProductContext.product_context[name] = value;
      expect(() => assertJsonSchema(invalidProductContext, schema, `schema product context ${name}`))
        .toThrow();
      expect(() => validateSimulationIntake(invalidProductContext, `runtime product context ${name}`))
        .toThrow();
    }

    const trusted = structuredClone(valid) as Record<string, any>;
    trusted.task_envelope.provenance_mode = "TRUSTED_SOURCE_SEGMENTS";
    trusted.task_envelope.direct_user_attestation = {
      schema_version: 1,
      attestation_id: "DUA-intake-001",
      issuer: "fixture-host",
      request_digest: trusted.task_envelope.request_digest,
      source_segments_digest: trusted.task_envelope.source_segments_digest,
    };
    expect(() => assertJsonSchema(trusted, schema, "trusted schema fixture")).not.toThrow();
    expect(() => validateSimulationIntake(trusted, "trusted runtime fixture")).not.toThrow();

    for (const [name, mutate] of [
      ["missing attestation identity", (value: Record<string, any>) => { delete value.task_envelope.direct_user_attestation.attestation_id; }],
      ["extra attestation field", (value: Record<string, any>) => { value.task_envelope.direct_user_attestation.signature = "not-part-of-the-intake-projection"; }],
      ["missing source segments digest", (value: Record<string, any>) => { delete value.task_envelope.source_segments_digest; }],
      ["wrong provenance version", (value: Record<string, any>) => { value.task_envelope.provenance_version = 1; }],
    ] as Array<[string, (value: Record<string, any>) => void]>) {
      const candidate = structuredClone(trusted);
      mutate(candidate);
      expect(() => assertJsonSchema(candidate, schema, `trusted schema ${name}`)).toThrow();
      expect(() => validateSimulationIntake(candidate, `trusted runtime ${name}`)).toThrow();
    }

    const trustedWithoutAttestation = structuredClone(trusted);
    trustedWithoutAttestation.task_envelope.direct_user_attestation = null;
    expect(() => validateSimulationIntake(trustedWithoutAttestation, "trusted without attestation"))
      .toThrow("direct_user_attestation");
    const lexicalWithAttestation = structuredClone(trusted);
    lexicalWithAttestation.task_envelope.provenance_mode = "LEXICAL_FALLBACK";
    expect(() => validateSimulationIntake(lexicalWithAttestation, "lexical with attestation"))
      .toThrow("lexical provenance cannot bind");
    const forgedAttestation = structuredClone(trusted);
    forgedAttestation.task_envelope.direct_user_attestation.request_digest = "9".repeat(64);
    expect(() => validateSimulationIntake(forgedAttestation, "forged attestation binding"))
      .toThrow("direct-user attestation binding is invalid");
  });

  test("copies the exact current provenance projection from trusted and lexical producers", async () => {
    const token = crypto.randomUUID();
    const campaignPath = `product-evals/campaigns/.tmp-intake-v4-${token}.json`;
    const intakePath = `product-evals/intakes/harness/.tmp-intake-v4-${token}.json`;
    const trustedEnvelopePath = `.artifacts/.tmp-intake-v4-${token}-trusted.json`;
    const lexicalEnvelopePath = `.artifacts/.tmp-intake-v4-${token}-lexical.json`;
    const request = "Build a connected harness simulation campaign and validate it.";
    const sourceDigest = "a".repeat(64);
    const requestSpans = [{ start: 0, end: request.length, source: "USER" as const }];
    const expectedAttestation = {
      schema_version: 1 as const,
      attestation_id: `DUA-${token}`,
      issuer: "fixture-host",
      request_digest: sha256Text(request),
      source_segments_digest: sha256Text(stableJson(requestSpans)),
    };
    try {
      const campaign = await readJson<Record<string, unknown>>(
        rootPath("product-evals/campaigns/simulation-contract-smoke.json"),
      );
      await writeJson(rootPath(intakePath), {
        schema_version: 6,
        artifact_type: "cascade-simulation-intake",
        id: "SI-0000000000000000",
        status: "DRAFT",
        scope: "harness",
        campaign_id: "simulation-contract-smoke",
        produced_at: "2026-08-04T00:00:00Z",
        task_envelope: null,
        product_context: null,
        seed_binding: null,
        claims: [],
        tasks: [],
        blockers: ["compile the intake"],
        gaps: [],
        invalidation: ["producer change"],
      });
      await writeJson(rootPath(campaignPath), { ...campaign, intake_file: intakePath });
      const trustedEnvelope = await compileTaskEnvelope({
        request,
        source_digest: sourceDigest,
        source_segments: [{ start: 0, end: request.length, source: "DIRECT_USER" }],
        trusted_direct_user_attestation: {
          ...expectedAttestation,
          verify(candidate) {
            return stableJson(candidate) === stableJson(expectedAttestation)
              ? { ok: true }
              : { ok: false, reason: "attestation mismatch" };
          },
        },
        produced_at: "2026-08-04T00:00:00Z",
      });
      await writeJson(rootPath(trustedEnvelopePath), trustedEnvelope);
      const trusted = await compileSimulationIntake({
        campaign: campaignPath,
        envelopePath: trustedEnvelopePath,
        expectedRequestDigest: trustedEnvelope.request_digest,
        expectedSourceDigest: sourceDigest,
      });
      expect(trusted.intake.schema_version).toBe(6);
      expect(trusted.intake.task_envelope).toMatchObject({
        provenance_version: trustedEnvelope.derivation_input.provenance_version,
        provenance_mode: "TRUSTED_SOURCE_SEGMENTS",
        source_segments_digest: trustedEnvelope.derivation_input.source_segments_digest,
        direct_user_attestation: trustedEnvelope.derivation_input.direct_user_attestation,
      });

      const lexicalEnvelope = await compileTaskEnvelope({
        request,
        source_digest: sourceDigest,
        produced_at: "2026-08-04T00:00:01Z",
      });
      await writeJson(rootPath(lexicalEnvelopePath), lexicalEnvelope);
      const lexical = await compileSimulationIntake({
        campaign: campaignPath,
        envelopePath: lexicalEnvelopePath,
        expectedRequestDigest: lexicalEnvelope.request_digest,
        expectedSourceDigest: sourceDigest,
      });
      expect(lexical.intake.task_envelope).toMatchObject({
        provenance_version: lexicalEnvelope.derivation_input.provenance_version,
        provenance_mode: "LEXICAL_FALLBACK",
        source_segments_digest: lexicalEnvelope.derivation_input.source_segments_digest,
        direct_user_attestation: null,
      });
    } finally {
      await rm(rootPath(campaignPath), { force: true });
      await rm(rootPath(intakePath), { force: true });
      await rm(rootPath(trustedEnvelopePath), { force: true });
      await rm(rootPath(lexicalEnvelopePath), { force: true });
    }
  });

  test("binds every active product claim to authored campaign targets and replays the exact seed artifact", async () => {
    const token = `seed-binding-${crypto.randomUUID()}`;
    const rendered = await renderStarterPackage({
      simulationId: token,
      ownerLane: "W-032",
      referenceDate: "2026-08-05",
    });
    const campaignPath = `product-evals/campaigns/${token}-smoke.json`;
    const intakePath = `product-evals/intakes/product/${token}-smoke.json`;
    const seedPath = `product-evals/intakes/product/seed-bindings/${token}-smoke.json`;
    const envelopePath = `.artifacts/.tmp-${token}-envelope.json`;
    const briefDirectory = `docs/specs/.tmp-${token}`;
    const briefPath = `${briefDirectory}/brief.yaml`;
    const briefOutputPath = `${briefDirectory}/brief.generated.md`;
    const request = `Build and implement a connected product simulation campaign for ${token} across multiple tasks, then validate it with bounded review and evidence gates.`;
    const sourceDigest = "a".repeat(64);
    const envelope = await compileTaskEnvelope({
      request,
      source_digest: sourceDigest,
      produced_at: "2026-08-05T00:00:00Z",
    });
    expect(envelope.schema_version).toBe(41);
    expect(envelope.policy_bundle_version).toBe("cascade-core@42");
    const snapshotPath = `product-evals/intakes/product/task-envelopes/${envelope.envelope_id}.json`;
    try {
      for (const file of rendered) {
        if (file.format === "json") await writeJson(rootPath(file.path), file.content);
        else await writeFile(rootPath(file.path), String(file.content));
      }
      await writeJson(rootPath(envelopePath), envelope);
      await mkdir(rootPath(briefDirectory), { recursive: true });
      const sourceManifest = await Bun.file(rootPath("docs/specs/simulation-intake-agent-bridge/brief.yaml")).text();
      await writeFile(
        rootPath(briefPath),
        sourceManifest.replace(/^output_path: .*$/m, `output_path: ${briefOutputPath}`),
      );
      await writeFile(rootPath(briefOutputPath), await generateBrief(briefPath));

      const campaign = await readJson<Record<string, any>>(rootPath(campaignPath));
      const seed = await readJson<Record<string, any>>(rootPath(seedPath));
      const draftCandidate = await compileSimulationIntake({
        campaign: campaignPath,
        envelopePath,
        brief: briefPath,
        expectedRequestDigest: envelope.request_digest,
        expectedSourceDigest: sourceDigest,
      });
      expect(draftCandidate.intake.status).toBe("BLOCKED");
      expect(draftCandidate.intake.seed_binding).toMatchObject({
        path: seedPath,
        status: "DRAFT",
        mappings: [],
      });
      expect(draftCandidate.intake.blockers).toContain(
        `seed binding ${seed.id} is not READY`,
      );
      const activeClaims = envelope.claims.filter((claim) => claim.status !== "SUPERSEDED");
      expect(activeClaims.length).toBeGreaterThan(0);
      seed.status = "READY";
      seed.source = {
        task_envelope_id: envelope.envelope_id,
        task_envelope_revision: envelope.revision,
        request_digest: envelope.request_digest,
        source_digest: envelope.source_digest,
      };
      seed.mappings = activeClaims.map((claim, index) => index === 0 ? {
        source_claim_id: claim.claim_id,
        disposition: "SEEDED",
        campaign_claim_ids: [campaign.claim_files[0]!.split("/").at(-1)!.replace(/\.json$/, "")],
        scenario_ids: [`${token}-happy-path-v1`],
        task_ids: [],
        rationale: null,
      } : {
        source_claim_id: claim.claim_id,
        disposition: "CONTEXT_ONLY",
        campaign_claim_ids: [],
        scenario_ids: [],
        task_ids: [],
        rationale: "The source claim constrains interpretation but does not seed a campaign target.",
      });
      await writeJson(rootPath(seedPath), seed);

      const candidate = await compileSimulationIntake({
        campaign: campaignPath,
        envelopePath,
        brief: briefPath,
        expectedRequestDigest: envelope.request_digest,
        expectedSourceDigest: sourceDigest,
      });
      expect(candidate.intake.blockers).toEqual([]);
      expect(candidate.intake.status).toBe("READY");
      expect(candidate.intake.seed_binding).toMatchObject({
        path: seedPath,
        sha256: await sha256File(rootPath(seedPath)),
        status: "READY",
        campaign_id: campaign.id,
        source: seed.source,
        mappings: seed.mappings,
      });
      await writeJson(rootPath(snapshotPath), envelope);
      await writeJson(rootPath(intakePath), candidate.intake);
      const resolvedReadyCampaign = await resolveCampaign(campaignPath);
      expect(resolvedReadyCampaign).toMatchObject({
        intake: { status: "READY", schema_version: 6 },
        seedBinding: { path: seedPath },
      });
      expect(resolvedReadyCampaign.seedBinding!.sha256).toBe(
        candidate.intake.seed_binding!.sha256,
      );
      expect(
        resolvedReadyCampaign.sourceDigests.find((source) => source.path === seedPath),
      ).toEqual({
        path: seedPath,
        sha256: candidate.intake.seed_binding!.sha256,
      });

      const missingSeedReference = structuredClone(campaign);
      delete missingSeedReference.seed_binding_file;
      await writeJson(rootPath(campaignPath), missingSeedReference);
      await expect(resolveCampaign(campaignPath)).rejects.toThrow("product campaign requires seed_binding_file");
      await writeJson(rootPath(campaignPath), campaign);

      const missing = structuredClone(seed);
      missing.mappings = missing.mappings.slice(0, -1);
      await writeJson(rootPath(seedPath), missing);
      await expect(resolveCampaign(campaignPath)).rejects.toThrow(
        "must map every active Task Envelope claim exactly once",
      );

      const staleSource = structuredClone(seed);
      staleSource.source.source_digest = "b".repeat(64);
      await writeJson(rootPath(seedPath), staleSource);
      await expect(resolveCampaign(campaignPath)).rejects.toThrow(
        "source identity or digest is stale or mismatched",
      );

      const unknownTarget = structuredClone(seed);
      unknownTarget.mappings[0].scenario_ids = ["unknown-scenario"];
      await writeJson(rootPath(seedPath), unknownTarget);
      await expect(resolveCampaign(campaignPath)).rejects.toThrow("unknown reference");

      const staleCampaign = structuredClone(seed);
      staleCampaign.campaign_sha256 = "f".repeat(64);
      await writeJson(rootPath(seedPath), staleCampaign);
      await expect(resolveCampaign(campaignPath)).rejects.toThrow(
        "campaign identity or digest is stale or mismatched",
      );
    } finally {
      await rm(rootPath(snapshotPath), { force: true });
      await rm(rootPath(envelopePath), { force: true });
      await rm(rootPath(briefDirectory), { recursive: true, force: true });
      for (const file of [...rendered].reverse()) await rm(rootPath(file.path), { force: true });
    }
  });

  test("keeps default, check, and run preflight strict while public --write replaces legacy intakes", async () => {
    const token = crypto.randomUUID();
    const campaignPath = `product-evals/campaigns/.tmp-intake-replacement-${token}.fixture`;
    const intakePath = `product-evals/intakes/harness/.tmp-intake-replacement-${token}.json`;
    const envelopePath = `.artifacts/.tmp-intake-replacement-${token}.json`;
    const request = `Build a connected harness simulation campaign and validate it across multiple steps for fixture ${token}.`;
    const sourceDigest = "a".repeat(64);
    const envelope = await compileTaskEnvelope({
      request,
      source_digest: sourceDigest,
      produced_at: "2026-08-04T00:00:00Z",
    });
    const snapshotPath =
      `product-evals/intakes/harness/task-envelopes/${envelope.envelope_id}.json`;
    const runCli = async (mode?: "--check" | "--write") => {
      const child = Bun.spawn([
        process.execPath,
        "scripts/cascade.ts",
        "simulation",
        "intake",
        campaignPath,
        "--envelope",
        envelopePath,
        "--expected-request-digest",
        envelope.request_digest,
        "--expected-source-digest",
        sourceDigest,
        ...(mode ? [mode] : []),
      ], {
        cwd: rootPath(),
        stdout: "pipe",
        stderr: "pipe",
      });
      const [exitCode, stdout, stderr] = await Promise.all([
        child.exited,
        new Response(child.stdout).text(),
        new Response(child.stderr).text(),
      ]);
      return { exitCode, stdout, stderr };
    };
    const legacy = (schemaVersion: 1 | 2 | 3 | 4 | 5) => ({
      schema_version: schemaVersion,
      artifact_type: "cascade-simulation-intake",
      id: "SI-0000000000000000",
      status: "DRAFT",
      scope: "harness",
      campaign_id: "simulation-contract-smoke",
    });
    try {
      const campaign = await readJson<Record<string, unknown>>(
        rootPath("product-evals/campaigns/simulation-contract-smoke.json"),
      );
      await writeJson(rootPath(campaignPath), { ...campaign, intake_file: intakePath });
      await writeJson(rootPath(envelopePath), envelope);

      await writeJson(rootPath(intakePath), legacy(3));
      await expect(resolveCampaign(campaignPath)).rejects.toThrow(
        "simulation intake schema v3 is unsupported",
      );
      await expect(
        resolveCampaign(campaignPath, { allowStaleIntake: true }),
      ).rejects.toThrow("simulation intake schema v3 is unsupported");
      await expect(compileSimulationIntake({
        campaign: campaignPath,
        envelopePath,
        expectedRequestDigest: envelope.request_digest,
        expectedSourceDigest: sourceDigest,
      })).rejects.toThrow("simulation intake schema v3 is unsupported");
      const rejectedPreview = await runCli();
      expect(rejectedPreview.exitCode).not.toBe(0);
      expect(rejectedPreview.stderr).toContain("simulation intake schema v3 is unsupported");
      expect(rejectedPreview.stdout).not.toContain('"schema_version": 6');
      expect(rejectedPreview.stdout).not.toContain('"status": "READY"');
      const rejectedCheck = await runCli("--check");
      expect(rejectedCheck.exitCode).not.toBe(0);
      expect(rejectedCheck.stderr).toContain("simulation intake schema v3 is unsupported");
      // campaign run uses strict resolveCampaign before reservation or dispatch.
      await expect(resolveCampaign(campaignPath)).rejects.toThrow(
        "simulation intake schema v3 is unsupported",
      );
      expect((await readJson<Record<string, unknown>>(rootPath(intakePath))).schema_version)
        .toBe(3);

      for (const schemaVersion of [1, 2, 3, 4, 5] as const) {
        await writeJson(rootPath(intakePath), legacy(schemaVersion));
        const replacement = await runCli("--write");
        expect(replacement.exitCode).toBe(0);
        const current = await readJson<Record<string, unknown>>(rootPath(intakePath));
        expect(current.schema_version).toBe(6);
        expect(current.status).toBe("READY");
        await expect(resolveCampaign(campaignPath)).resolves.toMatchObject({
          intake: { schema_version: 6, status: "READY" },
        });
      }

      const acceptedCheck = await runCli("--check");
      expect(acceptedCheck.exitCode).toBe(0);
      const acceptedPreview = await runCli();
      expect(acceptedPreview.exitCode).toBe(0);
      expect(acceptedPreview.stdout).toContain('"schema_version": 6');
      expect(acceptedPreview.stdout).toContain('"status": "READY"');
    } finally {
      await rm(rootPath(campaignPath), { force: true });
      await rm(rootPath(intakePath), { force: true });
      await rm(rootPath(envelopePath), { force: true });
      await rm(rootPath(snapshotPath), { force: true });
    }
  });

  test("rejects both cross-root intake directions before preview, check, write, reservation, or dispatch", async () => {
    const token = `intake-root-${crypto.randomUUID()}`;
    const envelopePath = `.artifacts/.tmp-${token}-envelope.json`;
    const request = `Validate physical intake scope boundaries for ${token} without executing a campaign.`;
    const sourceDigest = "a".repeat(64);
    const envelope = await compileTaskEnvelope({
      request,
      source_digest: sourceDigest,
      produced_at: "2026-08-05T00:00:00Z",
    });
    const productRendered = await renderStarterPackage({
      simulationId: `${token}-product`,
      ownerLane: "W-032",
      referenceDate: "2026-08-05",
    });
    const productAuthoredCampaignPath =
      `product-evals/campaigns/${token}-product-smoke.json`;
    const productCampaignPath =
      `product-evals/campaigns/.tmp-${token}-product-under-harness.fixture`;
    const harnessCampaignPath =
      `product-evals/campaigns/.tmp-${token}-harness-under-product.fixture`;
    const productUnderHarnessIntakePath =
      `product-evals/intakes/harness/.tmp-${token}-product.json`;
    const harnessUnderProductIntakePath =
      `product-evals/intakes/product/.tmp-${token}-harness.json`;
    const catalogPath = rootPath("product-evals/campaigns/catalog.generated.json");
    const originalCatalog = await Bun.file(catalogPath).text();
    const schema = await readJson<Record<string, unknown>>(
      rootPath("product-evals/campaigns/schema.json"),
    );
    const pathsToRemove = [
      productCampaignPath,
      harnessCampaignPath,
      productUnderHarnessIntakePath,
      harnessUnderProductIntakePath,
      envelopePath,
      `product-evals/simulations/product/${token}-product`,
      `product-evals/intakes/product/task-envelopes/${envelope.envelope_id}.json`,
      `product-evals/intakes/harness/task-envelopes/${envelope.envelope_id}.json`,
    ];
    const runIntakeCli = async (
      campaign: string,
      mode?: "--check" | "--write",
    ) => {
      const child = Bun.spawn([
        process.execPath,
        "scripts/cascade.ts",
        "simulation",
        "intake",
        campaign,
        "--envelope",
        envelopePath,
        "--expected-request-digest",
        envelope.request_digest,
        "--expected-source-digest",
        sourceDigest,
        ...(mode ? [mode] : []),
      ], {
        cwd: rootPath(),
        stdout: "pipe",
        stderr: "pipe",
      });
      const [exitCode, stdout, stderr] = await Promise.all([
        child.exited,
        new Response(child.stdout).text(),
        new Response(child.stderr).text(),
      ]);
      return { exitCode, stdout, stderr };
    };
    try {
      for (const file of productRendered) {
        if (file.path === productAuthoredCampaignPath) continue;
        if (file.format === "json") await writeJson(rootPath(file.path), file.content);
        else await writeFile(rootPath(file.path), String(file.content));
        pathsToRemove.push(file.path);
      }
      const productCampaign = structuredClone(
        productRendered.find((file) => file.path === productAuthoredCampaignPath)!.content,
      ) as Record<string, unknown>;
      productCampaign.intake_file = productUnderHarnessIntakePath;
      const harnessCampaign = await readJson<Record<string, unknown>>(
        rootPath("product-evals/campaigns/simulation-contract-smoke.json"),
      );
      harnessCampaign.intake_file = harnessUnderProductIntakePath;
      await writeJson(rootPath(productCampaignPath), productCampaign);
      await writeJson(rootPath(harnessCampaignPath), harnessCampaign);
      await writeJson(rootPath(envelopePath), envelope);
      await writeJson(rootPath(productUnderHarnessIntakePath), {
        marker: "must-not-replace",
        status: "READY",
        scope: "product",
        campaign_id: productCampaign.id,
      });
      await writeJson(rootPath(harnessUnderProductIntakePath), {
        marker: "must-not-replace",
        status: "READY",
        scope: "harness",
        campaign_id: harnessCampaign.id,
      });
      const currentCatalog = await buildCampaignCatalog();
      await writeJson(catalogPath, currentCatalog);

      for (const fixture of [
        {
          campaignPath: productCampaignPath,
          campaign: productCampaign,
          intakePath: productUnderHarnessIntakePath,
          scope: "product",
        },
        {
          campaignPath: harnessCampaignPath,
          campaign: harnessCampaign,
          intakePath: harnessUnderProductIntakePath,
          scope: "harness",
        },
      ] as const) {
        const expected =
          `simulation scope ${fixture.scope} requires product-evals/intakes/${fixture.scope}/`;
        const intakeBefore = await Bun.file(rootPath(fixture.intakePath)).text();
        expect(() => assertJsonSchema(fixture.campaign, schema, fixture.campaignPath))
          .toThrow("must match exactly one schema alternative");
        await expect(resolveCampaign(fixture.campaignPath)).rejects.toThrow(expected);
        await expect(resolveCampaign(fixture.campaignPath, {
          replaceReferencedIntake: true,
        })).rejects.toThrow(expected);
        await expect(compileSimulationIntake({
          campaign: fixture.campaignPath,
          envelopePath,
          expectedRequestDigest: envelope.request_digest,
          expectedSourceDigest: sourceDigest,
        })).rejects.toThrow(expected);

        for (const mode of [undefined, "--check", "--write"] as const) {
          const result = await runIntakeCli(fixture.campaignPath, mode);
          expect(result.exitCode).not.toBe(0);
          expect(result.stderr).toContain(expected);
          expect(result.stdout).not.toContain('"status": "READY"');
        }

        const runId = `${token}-${fixture.scope}`;
        const runRoot = rootPath(".artifacts/product-evals", runId);
        await expect(campaignMain([
          "run",
          fixture.campaignPath,
          "--run-id",
          runId,
        ])).rejects.toThrow(expected);
        expect(await Bun.file(rootPath(fixture.intakePath)).text()).toBe(intakeBefore);
        expect(await Bun.file(runRoot).exists()).toBe(false);
        expect(await Bun.file(`${runRoot}/reservation.json`).exists()).toBe(false);
        expect(await Bun.file(`${runRoot}/execution/dispatch.json`).exists()).toBe(false);
      }
    } finally {
      await writeFile(catalogPath, originalCatalog);
      for (const path of [...new Set(pathsToRemove)].reverse()) {
        await rm(rootPath(path), { recursive: true, force: true });
      }
    }
  });

  test("re-resolves every authoritative product-context field and rejects self-resealed mutations", async () => {
    const token = `.tmp-r12-${crypto.randomUUID()}`;
    const fixtureDirectory = `docs/specs/${token}`;
    const manifestPath = `${fixtureDirectory}/brief.yaml`;
    const outputPath = `${fixtureDirectory}/brief.generated.md`;
    const sourceManifestPath = rootPath("docs/specs/simulation-intake-agent-bridge/brief.yaml");
    const originalManifest = await Bun.file(sourceManifestPath).text();
    const fixtureManifest = originalManifest.replace(
      /^output_path: .*$/m,
      `output_path: ${outputPath}`,
    );
    const reseal = (candidate: SimulationIntakeDefinition): SimulationIntakeDefinition => {
      const { id: _id, ...seed } = candidate;
      return {
        ...candidate,
        id: `SI-${sha256Text(stableJson(seed)).slice(0, 16)}`,
      };
    };
    try {
      await mkdir(rootPath(fixtureDirectory), { recursive: true });
      await writeFile(rootPath(manifestPath), fixtureManifest);
      const generated = await generateBrief(manifestPath);
      await writeFile(rootPath(outputPath), generated);
      const current = await resolveCurrentBriefProjection(manifestPath);
      const seed = {
        schema_version: 6 as const,
        artifact_type: "cascade-simulation-intake" as const,
        status: "READY" as const,
        scope: "product" as const,
        campaign_id: "example-smoke",
        produced_at: "2026-08-04T00:00:00Z",
        task_envelope: {
          path: "product-evals/intakes/product/task-envelopes/TE-0123456789abcdef.json",
          envelope_id: "TE-0123456789abcdef",
          revision: 1,
          sha256: "a".repeat(64),
          request_digest: "b".repeat(64),
          source_digest: "c".repeat(64),
          derivation_input_digest: "d".repeat(64),
          provenance_version: 2 as const,
          provenance_mode: "LEXICAL_FALLBACK" as const,
          source_segments_digest: "f".repeat(64),
          direct_user_attestation: null,
          expected_request_digest: "b".repeat(64),
          expected_source_digest: "c".repeat(64),
        },
        product_context: current.binding,
        seed_binding: {
          path: "product-evals/intakes/product/seed-bindings/example-smoke.json",
          sha256: "1".repeat(64),
          id: "example-smoke-seed-v1",
          status: "READY" as const,
          campaign_id: "example-smoke",
          campaign_sha256: "2".repeat(64),
          source: {
            task_envelope_id: "TE-0123456789abcdef",
            task_envelope_revision: 1,
            request_digest: "b".repeat(64),
            source_digest: "c".repeat(64),
          },
          mappings: [{
            source_claim_id: "CL-001",
            disposition: "SEEDED" as const,
            campaign_claim_ids: ["campaign-claim"],
            scenario_ids: ["scenario-1"],
            task_ids: [],
            rationale: null,
          }],
        },
        claims: [{
          claim_id: "SIC-001",
          source_claim_id: "CL-001",
          kind: "OUTCOME" as const,
          source: "USER" as const,
          statement: "Seed the product simulation.",
          status: "PROVIDED",
          policy_tags: [],
        }],
        tasks: [],
        blockers: [],
        gaps: [],
        invalidation: ["brief manifest or generated projection drift"],
      };
      const intake = reseal({ ...seed, id: "SI-0000000000000000" });
      validateSimulationIntake(intake as unknown as Record<string, unknown>, "product fixture");
      await expect(validateReadySimulationIntakeProductContextBinding(intake))
        .resolves.toBeUndefined();

      const mutations: Array<[string, (context: Record<string, any>) => void]> = [
        ["brief path", (context) => { context.brief_path = `${fixtureDirectory}/missing/brief.yaml`; }],
        ["brief id PB-999", (context) => { context.brief_id = "PB-999"; }],
        ["revision", (context) => { context.revision += 1; }],
        ["manifest digest", (context) => { context.sha256 = "e".repeat(64); }],
        ["output path", (context) => { context.output_path = `${fixtureDirectory}/alternate/brief.generated.md`; }],
        ["output digest", (context) => { context.output_sha256 = "f".repeat(64); }],
        ["domain id PD-999", (context) => { context.domain_id = "PD-999"; }],
        ["capability id PC-999", (context) => { context.capability_id = "PC-999"; }],
        ["requirement ref", (context) => { context.product_refs.requirement_ids.push("PR-999"); }],
        ["journey ref", (context) => { context.product_refs.journey_ids.push("J-999"); }],
        ["scenario ref", (context) => { context.product_refs.scenario_ids.push("PS-999"); }],
        ["persona ref", (context) => { context.product_refs.persona_ids.push("P-999"); }],
        ["extra ref class", (context) => { context.product_refs.unsupported_ids = ["PR-999"]; }],
      ];
      for (const [name, mutate] of mutations) {
        const candidate = structuredClone(intake) as SimulationIntakeDefinition;
        mutate(candidate.product_context as unknown as Record<string, any>);
        const selfResealed = reseal(candidate);
        validateSimulationIntake(
          selfResealed as unknown as Record<string, unknown>,
          `self-resealed ${name}`,
        );
        await expect(validateReadySimulationIntakeProductContextBinding(selfResealed))
          .rejects.toThrow("product context binding");
      }

      await writeFile(rootPath(manifestPath), fixtureManifest.replace("status: reviewed", "status: draft"));
      await expect(validateReadySimulationIntakeProductContextBinding(intake))
        .rejects.toThrow("is not reviewed or approved");

      await writeFile(rootPath(manifestPath), fixtureManifest.replace("revision: 1", "revision: 2"));
      await expect(validateReadySimulationIntakeProductContextBinding(intake))
        .rejects.toThrow("current product brief projection is stale");

      await writeFile(rootPath(manifestPath), fixtureManifest);
      await writeFile(rootPath(outputPath), generated);
      const symlinkTarget = rootPath(`${fixtureDirectory}/projection-target.md`);
      await writeFile(symlinkTarget, generated);
      await rm(rootPath(outputPath), { force: true });
      await symlink(symlinkTarget, rootPath(outputPath));
      await expect(validateReadySimulationIntakeProductContextBinding(intake))
        .rejects.toThrow("must not be a symbolic link");
    } finally {
      await rm(rootPath(fixtureDirectory), { recursive: true, force: true });
    }
  });

  test("revalidates the current Task Envelope and persisted bindings at the READY run gate", async () => {
    const sourceDigest = "a".repeat(64);
    const envelope = await compileTaskEnvelope({
      request: "Build a product simulation from the current source.",
      source_digest: sourceDigest,
      produced_at: "2026-08-04T00:00:00Z",
    });
    const snapshot = `product-evals/intakes/harness/task-envelopes/${envelope.envelope_id}.json`;
    await mkdir(rootPath("product-evals/intakes/harness/task-envelopes"), { recursive: true });
    try {
      await writeJson(rootPath(snapshot), envelope);
      const seed = {
        schema_version: 6 as const,
        artifact_type: "cascade-simulation-intake" as const,
        status: "READY" as const,
        scope: "harness" as const,
        campaign_id: "example-smoke",
        produced_at: envelope.produced_at,
        task_envelope: {
          path: snapshot,
          envelope_id: envelope.envelope_id,
          revision: envelope.revision,
          sha256: await sha256File(rootPath(snapshot)),
          request_digest: envelope.request_digest,
          source_digest: envelope.source_digest,
          derivation_input_digest: envelope.derivation_input_digest,
          provenance_version: envelope.derivation_input.provenance_version,
          provenance_mode: envelope.derivation_input.provenance_mode,
          source_segments_digest: envelope.derivation_input.source_segments_digest,
          direct_user_attestation: envelope.derivation_input.direct_user_attestation,
          expected_request_digest: envelope.request_digest,
          expected_source_digest: sourceDigest,
        },
        product_context: null,
        seed_binding: null,
        claims: projectedClaims(envelope),
        tasks: [],
        blockers: [],
        gaps: [],
        invalidation: ["source drift"],
      };
      const intake = { ...seed, id: `SI-${sha256Text(stableJson(seed)).slice(0, 16)}` } as SimulationIntakeDefinition;
      validateSimulationIntake(intake as unknown as Record<string, unknown>, "fixture");
      await expect(validateReadySimulationIntakeEnvelopeBinding(intake)).resolves.toBeUndefined();

      const reseal = (candidate: SimulationIntakeDefinition): SimulationIntakeDefinition => {
        const { id: _id, ...candidateSeed } = candidate;
        return {
          ...candidate,
          id: `SI-${sha256Text(stableJson(candidateSeed)).slice(0, 16)}`,
        };
      };

      const claimMutation = structuredClone(intake);
      claimMutation.claims[0]!.statement = "Forged source statement.";
      const resealedClaimMutation = reseal(claimMutation);
      validateSimulationIntake(resealedClaimMutation as unknown as Record<string, unknown>, "claim mutation fixture");
      await expect(validateReadySimulationIntakeEnvelopeBinding(resealedClaimMutation)).rejects.toThrow("exact active Task Envelope claim provenance projection");

      const forgedSegmentsDigest = structuredClone(intake);
      forgedSegmentsDigest.task_envelope!.source_segments_digest = "8".repeat(64);
      const resealedSegmentsDigest = reseal(forgedSegmentsDigest);
      validateSimulationIntake(resealedSegmentsDigest as unknown as Record<string, unknown>, "forged source segments fixture");
      await expect(validateReadySimulationIntakeEnvelopeBinding(resealedSegmentsDigest))
        .rejects.toThrow("snapshot identity is stale or mismatched");

      const forgedAttestation = structuredClone(intake);
      forgedAttestation.task_envelope!.provenance_mode = "TRUSTED_SOURCE_SEGMENTS";
      forgedAttestation.task_envelope!.direct_user_attestation = {
        schema_version: 1,
        attestation_id: "DUA-forged-intake",
        issuer: "forged-intake",
        request_digest: forgedAttestation.task_envelope!.request_digest,
        source_segments_digest: forgedAttestation.task_envelope!.source_segments_digest,
      };
      const resealedAttestation = reseal(forgedAttestation);
      validateSimulationIntake(resealedAttestation as unknown as Record<string, unknown>, "forged attestation fixture");
      await expect(validateReadySimulationIntakeEnvelopeBinding(resealedAttestation))
        .rejects.toThrow("snapshot identity is stale or mismatched");

      const missing = structuredClone(intake) as Record<string, any>;
      delete missing.task_envelope.expected_request_digest;
      expect(() => validateSimulationIntake(missing, "fixture")).toThrow("expected_request_digest");

      const staleIdentity = structuredClone(intake);
      staleIdentity.id = "SI-0123456789abcdef";
      expect(() => validateSimulationIntake(staleIdentity as unknown as Record<string, unknown>, "fixture")).toThrow("intake identity is stale or mismatched");

      const mismatched = structuredClone(intake);
      mismatched.task_envelope!.expected_request_digest = "b".repeat(64);
      expect(() => validateSimulationIntake(mismatched as unknown as Record<string, unknown>, "fixture")).toThrow("exact persisted request and source bindings");

      const payload = structuredClone(envelope) as Record<string, any>;
      delete payload.envelope_id;
      delete payload.integrity;
      payload.route = "PROGRAM";
      const digest = sha256Text(stableJson(payload));
      await writeJson(rootPath(snapshot), { ...payload, envelope_id: `TE-${digest.slice(0, 16)}`, integrity: { algorithm: "SHA-256", digest } });
      intake.task_envelope!.sha256 = await sha256File(rootPath(snapshot));
      await expect(validateReadySimulationIntakeEnvelopeBinding(intake)).rejects.toThrow("compiler-owned derivation");

      const replacementRequest = "Build a product simulation from the current source.";
      const replacementSegments = [{ start: 0, end: replacementRequest.length, source: "DIRECT_USER" as const }];
      const expectedAttestation = {
        schema_version: 1 as const,
        attestation_id: "DUA-producer-drift",
        issuer: "fixture-host",
        request_digest: sha256Text(replacementRequest),
        source_segments_digest: sha256Text(stableJson([{ start: 0, end: replacementRequest.length, source: "USER" }])),
      };
      const replacement = await compileTaskEnvelope({
        request: replacementRequest,
        source_digest: sourceDigest,
        source_segments: replacementSegments,
        trusted_direct_user_attestation: {
          ...expectedAttestation,
          verify(candidate) {
            return stableJson(candidate) === stableJson(expectedAttestation)
              ? { ok: true }
              : { ok: false, reason: "attestation drift" };
          },
        },
        produced_at: "2026-08-04T00:00:01Z",
      });
      expect(replacement.derivation_input.provenance_mode).toBe("TRUSTED_SOURCE_SEGMENTS");
      await writeJson(rootPath(snapshot), replacement);
      intake.task_envelope!.sha256 = await sha256File(rootPath(snapshot));
      await expect(validateReadySimulationIntakeEnvelopeBinding(intake)).rejects.toThrow("snapshot identity is stale or mismatched");
    } finally {
      await rm(rootPath(snapshot), { force: true });
    }
  });

  test("reads Task Envelope snapshots once through bounded nofollow regular-file checks", async () => {
    const token = `snapshot-reader-${crypto.randomUUID()}`;
    const directory = rootPath(`.artifacts/${token}`);
    const regular = `${directory}/regular.json`;
    const symlinkFile = `${directory}/symlink.json`;
    const realAncestor = `${directory}/real-ancestor`;
    const linkedAncestor = `${directory}/linked-ancestor`;
    const oversize = `${directory}/oversize.json`;
    const envelope = await compileTaskEnvelope({
      request: "Review the simulation contract.",
      source_digest: "a".repeat(64),
      produced_at: "2026-08-04T00:00:00Z",
    });
    try {
      await mkdir(realAncestor, { recursive: true });
      await writeJson(regular, envelope);
      await writeJson(`${realAncestor}/envelope.json`, envelope);
      const current = await readBoundedTaskEnvelopeSnapshot(regular, "regular snapshot");
      expect(current.envelope.envelope_id).toBe(envelope.envelope_id);
      expect(current.sha256).toBe(await sha256File(regular));

      await symlink(regular, symlinkFile);
      await expect(readBoundedTaskEnvelopeSnapshot(symlinkFile, "symlink snapshot")).rejects.toThrow("must not be a symbolic link");
      await symlink(realAncestor, linkedAncestor);
      await expect(readBoundedTaskEnvelopeSnapshot(`${linkedAncestor}/envelope.json`, "ancestor snapshot")).rejects.toThrow("symbolic-link ancestor");

      await writeFile(oversize, Buffer.alloc(MAX_TASK_ENVELOPE_SNAPSHOT_BYTES + 1, 0x20));
      await expect(readBoundedTaskEnvelopeSnapshot(oversize, "oversize snapshot")).rejects.toThrow(`exceeds ${MAX_TASK_ENVELOPE_SNAPSHOT_BYTES} bytes`);
      await expect(readBoundedTaskEnvelopeSnapshot(realAncestor, "directory snapshot")).rejects.toThrow("must be a regular file");
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  test("requires exact external request/source bindings and rejects resealed derivation", async () => {
    const sourceDigest = "a".repeat(64);
    const envelope = await compileTaskEnvelope({
      request: "Build a product simulation from the current source.",
      source_digest: sourceDigest,
      produced_at: "2026-08-04T00:00:00Z",
    });
    expect(simulationIntakeAdmissionBindingBlockers(envelope, {})).toEqual([
      "simulation intake requires an externally expected Task Envelope request digest",
      "simulation intake requires an externally expected Task Envelope source digest",
    ]);
    expect(simulationIntakeAdmissionBindingBlockers(envelope, {
      expectedRequestDigest: envelope.request_digest,
      expectedSourceDigest: sourceDigest,
    })).toEqual([]);
    expect(simulationIntakeAdmissionBindingBlockers(envelope, {
      expectedRequestDigest: envelope.request_digest,
      expectedSourceDigest: "b".repeat(64),
    })[0]).toContain("externally expected source binding");

    const payload = structuredClone(envelope) as Record<string, any>;
    delete payload.envelope_id;
    delete payload.integrity;
    payload.route = "PROGRAM";
    const digest = sha256Text(stableJson(payload));
    const resealed = { ...payload, envelope_id: `TE-${digest.slice(0, 16)}`, integrity: { algorithm: "SHA-256", digest } } as TaskEnvelope;
    expect(() => simulationIntakeAdmissionBindingBlockers(resealed, {
      expectedRequestDigest: envelope.request_digest,
      expectedSourceDigest: sourceDigest,
    })).toThrow("compiler-owned derivation");
  });

  test("renders v6 product starters and rejects v1 through v5 with a stable recompile requirement", async () => {
    const files = await renderStarterPackage({
      simulationId: "intake-contract-example",
      ownerLane: "W-032",
      referenceDate: "2026-08-04",
    });
    const file = files.find((item) =>
      item.path === "product-evals/intakes/product/intake-contract-example-smoke.json"
    )!;
    const intake = file.content as Record<string, unknown>;
    expect(intake.schema_version).toBe(6);
    expect(intake.tasks).toEqual([]);
    expect(intake.status).toBe("DRAFT");
    expect(intake.blockers).not.toEqual([]);
    validateSimulationIntake(intake, file.path);
    const legacy = { ...intake, schema_version: 1 };
    expect(() => validateSimulationIntake(legacy, "legacy fixture")).toThrow("simulation intake schema v1 is unsupported; recompile or migrate to schema v6 with safe action bindings");
    const legacyV2 = { ...intake, schema_version: 2 };
    expect(() => validateSimulationIntake(legacyV2, "legacy v2 fixture")).toThrow("simulation intake schema v2 is unsupported; recompile or migrate to schema v6 with safe action bindings");
    const legacyV3 = { ...intake, schema_version: 3 };
    expect(() => validateSimulationIntake(legacyV3, "legacy v3 fixture")).toThrow("simulation intake schema v3 is unsupported; recompile or migrate to schema v6 with safe action bindings");
    const legacyV4 = { ...intake, schema_version: 4 };
    expect(() => validateSimulationIntake(legacyV4, "legacy v4 fixture")).toThrow("simulation intake schema v4 is unsupported; recompile or migrate to schema v6 with safe action bindings");
    const legacyV5 = { ...intake, schema_version: 5 };
    expect(() => validateSimulationIntake(legacyV5, "legacy v5 fixture")).toThrow("simulation intake schema v5 is unsupported; recompile or migrate to schema v6 with safe action bindings");
  });

  test("requires product context before a product intake can be READY", () => {
    const intake = {
      schema_version: 6,
      artifact_type: "cascade-simulation-intake",
      id: "SI-0123456789abcdef",
      status: "READY",
      scope: "product",
      campaign_id: "example-smoke",
      produced_at: "2026-08-04T00:00:00Z",
      task_envelope: {
        path: "product-evals/intakes/product/task-envelopes/TE-0123456789abcdef.json",
        envelope_id: "TE-0123456789abcdef",
        revision: 1,
        sha256: "a".repeat(64),
        request_digest: "b".repeat(64),
        source_digest: "c".repeat(64),
        derivation_input_digest: "d".repeat(64),
        provenance_version: 2,
        provenance_mode: "LEXICAL_FALLBACK",
        source_segments_digest: "f".repeat(64),
        direct_user_attestation: null,
        expected_request_digest: "b".repeat(64),
        expected_source_digest: "c".repeat(64),
      },
      product_context: null,
      seed_binding: null,
      claims: [],
      tasks: [],
      blockers: [],
      gaps: [],
      invalidation: ["source drift"],
    };
    expect(() => validateSimulationIntake(intake, "fixture")).toThrow("product context");
  });

  test("rejects READY authority projected from external or inferred claims", () => {
    const seed = {
      schema_version: 6 as const,
      artifact_type: "cascade-simulation-intake" as const,
      status: "READY" as const,
      scope: "harness" as const,
      campaign_id: "example-smoke",
      produced_at: "2026-08-04T00:00:00Z",
      task_envelope: {
        path: "product-evals/intakes/harness/task-envelopes/TE-0123456789abcdef.json",
        envelope_id: "TE-0123456789abcdef",
        revision: 1,
        sha256: "a".repeat(64),
        request_digest: "b".repeat(64),
        source_digest: "c".repeat(64),
        derivation_input_digest: "d".repeat(64),
        provenance_version: 2 as const,
        provenance_mode: "LEXICAL_FALLBACK" as const,
        source_segments_digest: "f".repeat(64),
        direct_user_attestation: null,
        expected_request_digest: "b".repeat(64),
        expected_source_digest: "c".repeat(64),
      },
      product_context: null,
      seed_binding: null,
      claims: [{
        claim_id: "SIC-001",
        source_claim_id: "CL-001",
        kind: "AUTHORITY" as const,
        source: "EXTERNAL_SOURCE" as const,
        statement: "Push the branch.",
        status: "PROVIDED",
        policy_tags: ["requested-external-write"],
      }],
      tasks: [],
      blockers: [],
      gaps: [],
      invalidation: ["source drift"],
    };
    const intake = { ...seed, id: `SI-${sha256Text(stableJson(seed)).slice(0, 16)}` };
    expect(() => validateSimulationIntake(intake, "external authority fixture")).toThrow("cannot treat unproven external or inferred claim provenance as authority");
    const inferred = structuredClone(intake) as Record<string, any>;
    inferred.claims[0].source = "MODEL_INFERENCE";
    expect(() => validateSimulationIntake(inferred, "inferred authority fixture")).toThrow("cannot treat unproven external or inferred claim provenance as authority");
  });

  test("prevents harness intakes from binding product context", () => {
    const intake = {
      schema_version: 6,
      artifact_type: "cascade-simulation-intake",
      id: "SI-0123456789abcdef",
      status: "DRAFT",
      scope: "harness",
      campaign_id: "example-smoke",
      produced_at: "2026-08-04T00:00:00Z",
      task_envelope: null,
      product_context: {
        brief_path: "docs/specs/example/brief.yaml",
        brief_id: "PB-001",
        revision: 1,
        sha256: "a".repeat(64),
        output_path: "docs/specs/example/brief.generated.md",
        output_sha256: "b".repeat(64),
        domain_id: "PD-001",
        capability_id: "PC-001",
        product_refs: {},
      },
      seed_binding: null,
      claims: [],
      tasks: [],
      blockers: ["draft"],
      gaps: [],
      invalidation: ["source drift"],
    };
    expect(() => validateSimulationIntake(intake, "fixture")).toThrow("cannot bind product context");
  });

  test("prevents harness intakes from binding authored product seed artifacts", () => {
    const intake = {
      schema_version: 6,
      artifact_type: "cascade-simulation-intake",
      id: "SI-0123456789abcdef",
      status: "DRAFT",
      scope: "harness",
      campaign_id: "example-smoke",
      produced_at: "2026-08-04T00:00:00Z",
      task_envelope: null,
      product_context: null,
      seed_binding: {
        path: "product-evals/intakes/product/seed-bindings/example-smoke.json",
        sha256: "a".repeat(64),
        id: "example-seed-v1",
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
      blockers: ["draft"],
      gaps: [],
      invalidation: ["source drift"],
    };
    expect(() => validateSimulationIntake(intake, "fixture"))
      .toThrow("harness intake cannot bind a product seed artifact");
  });

  test("prevents harness campaign manifests from referencing product seed artifacts", async () => {
    const token = crypto.randomUUID();
    const campaignPath = `product-evals/campaigns/.tmp-harness-seed-${token}.json`;
    try {
      const campaign = await readJson<Record<string, unknown>>(
        rootPath("product-evals/campaigns/simulation-contract-smoke.json"),
      );
      await writeJson(rootPath(campaignPath), {
        ...campaign,
        seed_binding_file: `product-evals/intakes/product/seed-bindings/.tmp-${token}.json`,
      });
      await expect(resolveCampaign(campaignPath)).rejects.toThrow(
        "harness campaign cannot bind a product seed artifact",
      );
    } finally {
      await rm(rootPath(campaignPath), { force: true });
    }
  });

  test("rejects blocking or forged policy decisions in a READY intake", () => {
    const intake = {
      schema_version: 6,
      artifact_type: "cascade-simulation-intake",
      id: "SI-0123456789abcdef",
      status: "READY",
      scope: "harness",
      campaign_id: "example-smoke",
      produced_at: "2026-08-04T00:00:00Z",
      task_envelope: {
        path: "product-evals/intakes/harness/task-envelopes/TE-0123456789abcdef.json",
        envelope_id: "TE-0123456789abcdef",
        revision: 1,
        sha256: "a".repeat(64),
        request_digest: "b".repeat(64),
        source_digest: "c".repeat(64),
        derivation_input_digest: "d".repeat(64),
        provenance_version: 2,
        provenance_mode: "LEXICAL_FALLBACK",
        source_segments_digest: "f".repeat(64),
        direct_user_attestation: null,
        expected_request_digest: "b".repeat(64),
        expected_source_digest: "c".repeat(64),
      },
      product_context: null,
      seed_binding: null,
      claims: [],
      tasks: [{
        task_id: "TASK",
        declared_policy_ids: ["POLICY"],
        applicable_policy_ids: ["POLICY"],
        actions: [{
          action_index: 0,
          action_binding_version: "cascade-action-binding-v2",
          action_binding_digest: "b".repeat(64),
          applicable_policy_ids: ["POLICY"],
          policy_digests: ["c".repeat(64)],
          decision: "DENY",
        }],
      }],
      blockers: [],
      gaps: [],
      invalidation: ["source drift"],
    };
    expect(() => validateSimulationIntake(intake, "fixture")).toThrow("blocking action decision");
  });

  test("binds task-envelope snapshot paths to scope and identity", () => {
    const intake = {
      schema_version: 6,
      artifact_type: "cascade-simulation-intake",
      id: "SI-0123456789abcdef",
      status: "BLOCKED",
      scope: "product",
      campaign_id: "example-smoke",
      produced_at: "2026-08-04T00:00:00Z",
      task_envelope: {
        path: "product-evals/intakes/harness/task-envelopes/TE-0123456789abcdef.json",
        envelope_id: "TE-0123456789abcdef",
        revision: 1,
        sha256: "a".repeat(64),
        request_digest: "b".repeat(64),
        source_digest: "c".repeat(64),
        derivation_input_digest: "d".repeat(64),
        provenance_version: 2,
        provenance_mode: "LEXICAL_FALLBACK",
        source_segments_digest: "f".repeat(64),
        direct_user_attestation: null,
        expected_request_digest: "b".repeat(64),
        expected_source_digest: "c".repeat(64),
      },
      product_context: null,
      seed_binding: null,
      claims: [],
      tasks: [],
      blockers: ["scope mismatch"],
      gaps: [],
      invalidation: ["source drift"],
    };
    expect(() => validateSimulationIntake(intake, "fixture")).toThrow("outside the intake source boundary");
  });

  test("normalizes process and HTTP tasks into policy-observable actions", () => {
    const base = {
      schema_version: 1 as 1 | 2 | 3,
      id: "TASK",
      kind: "command" as const,
      required: true,
      timeout_ms: 1000,
      oracle_ids: [],
    };
    const processTask: TaskDefinition = {
      ...base,
      schema_version: 3,
      driver: { type: "direct-process" },
      command: ["/usr/bin/printf", "ok"],
      process: {
        working_directory: "task-root",
        environment: {},
        interactive: false,
        network: "deny",
        filesystem: { read: "host", write: "task-root" },
      },
    };
    const httpTask: TaskDefinition = {
      ...base,
      schema_version: 2,
      id: "HTTP-TASK",
      kind: "http",
      driver: { type: "http-client" },
      request: { method: "GET", url: "https://example.test/health" },
    };
    expect(taskPolicyActions(processTask)).toEqual([
      {
        type: "process-exec",
        argv: ["/usr/bin/printf", "ok"],
        process: processTask.process,
      },
    ]);
    expect(taskPolicyActions(httpTask)).toEqual([
      {
        type: "http-request",
        method: "GET",
        url: "https://example.test/health",
        headers: undefined,
        body: undefined,
      },
    ]);
  });

  test("computes exact action-policy equality and fails closed on omissions", () => {
    const task: TaskDefinition = {
      schema_version: 1,
      id: "STATE-TASK",
      kind: "agent-response",
      driver: { type: "fake" },
      required: true,
      timeout_ms: 1000,
      actions: [{ type: "set", path: "workflow.status", value: "done" }],
      oracle_ids: [],
      policy_ids: ["allow-state-v1"],
    };
    const policy: PolicyDefinition = {
      schema_version: 2,
      id: "allow-state-v1",
      version: "2.0.0",
      effect: "ALLOW",
      scope: {
        campaign_ids: ["campaign"],
        task_ids: [task.id],
        task_kinds: [task.kind],
        driver_types: [task.driver.type],
        action_types: ["set"],
        action_paths: ["workflow.status"],
      },
      budgets: {
        required_dimensions: ["action_count", "output_bytes"],
        max_actions: 1,
        max_output_bytes: 1024,
      },
      redaction_profile: "no-secrets-v1",
      reason: "fixture",
    };
    const ready = buildSimulationIntakeTaskBindings({
      campaignId: "campaign",
      tasks: [task],
      policies: [policy],
      policyDigests: new Map([[policy.id, "a".repeat(64)]]),
    });
    expect(ready.blockers).toEqual([]);
    expect(ready.tasks[0]).toMatchObject({
      declared_policy_ids: [policy.id],
      applicable_policy_ids: [policy.id],
      actions: [{ decision: "ALLOW", applicable_policy_ids: [policy.id] }],
    });

    const omitted = buildSimulationIntakeTaskBindings({
      campaignId: "campaign",
      tasks: [{ ...task, policy_ids: [] }],
      policies: [policy],
      policyDigests: new Map([[policy.id, "a".repeat(64)]]),
    });
    expect(omitted.blockers).toContain(
      "STATE-TASK declared policies differ from computed applicable policies",
    );
  });

  test("rejects inline HTTP secrets before producing an intake action binding", () => {
    const task = {
      schema_version: 2,
      id: "HTTP-INLINE-SECRET",
      kind: "http",
      driver: { type: "http-client" },
      required: true,
      timeout_ms: 1000,
      request: {
        method: "POST",
        url: "https://example.test/resource",
        headers: { "x-api-key": "1" },
      },
      oracle_ids: [],
      policy_ids: [],
    } as unknown as TaskDefinition;
    expect(() => buildSimulationIntakeTaskBindings({
      campaignId: "campaign",
      tasks: [task],
      policies: [],
      policyDigests: new Map(),
    })).toThrow("action contains prohibited inline sensitive material");
  });
});
