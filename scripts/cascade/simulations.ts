import { readdir, rmdir, unlink } from "node:fs/promises";
import { dirname } from "node:path";

import {
  CascadeError,
  boolFlag,
  boundedPath,
  exists,
  flag,
  flags,
  isFile,
  parseArgs,
  readJson,
  readText,
  rel,
  rootPath,
  sha256File,
  sha256Text,
  stableJson,
  writeJsonAtomic,
  writeJsonExclusive,
  writeTextExclusive,
} from "./common";
import { buildCampaignCatalog } from "./campaigns";
import { CampaignArtifactStore } from "./campaign-artifacts";
import {
  resolveCampaign,
  type SimulationDefinition,
  type SimulationScope,
  validateSimulation,
} from "./simulation-definitions";
import {
  type PersonaDerivationManifest,
  type PersonaDerivationMode,
  type PersonaRefinementProposal,
  type ExternalPersonaEvidenceManifest,
  type RefinementDispositionDecision,
  buildPersonaRefinementDisposition,
  derivePopulationFromManifest,
  validateExternalPersonaEvidenceManifest,
  validatePersonaDerivation,
  validatePersonaRefinementProposal,
  verifyPersonaDerivationSources,
} from "./persona-simulations";
import {
  compileSimulationIntake,
  writeCompiledSimulationIntake,
} from "./simulation-intake";

const TEMPLATE_PATH =
  ".codex/skills/simulation-campaigns/templates/starter/package.template.json";
const DESIGN_TEMPLATE_PATH =
  ".codex/skills/simulation-campaigns/templates/campaign-design.md";
const CATALOG_PATH = rootPath("product-evals/campaigns/catalog.generated.json");
const SIMULATION_ID = /^[a-z0-9][a-z0-9.-]+$/;
const OWNER_LANE = /^W-[0-9]{3}$/;
const PERSONA_ID = /^P-[0-9]{3}$/;
const SIMULATION_SCOPES: SimulationScope[] = ["harness", "product"];

interface TemplateFile {
  path: string;
  content: unknown;
}

interface StarterTemplate {
  schema_version: 1;
  template_id: string;
  files: TemplateFile[];
}

export interface RenderedStarterFile {
  path: string;
  content: unknown;
  format: "json" | "text";
}

export interface StarterOptions {
  simulationId: string;
  ownerLane: string;
  title?: string;
  referenceDate?: string;
}

export interface DerivePopulationOptions {
  personaId: string;
  simulationId: string;
  mode: PersonaDerivationMode;
  dryRun: boolean;
}

export interface DisposeRefinementOptions {
  proposalPath: string;
  dispositionId: string;
  decision: RefinementDispositionDecision;
  reviewerIdentity: string;
  evidenceManifestPaths: string[];
  dryRun: boolean;
  reviewedAt?: string;
}

function titleFromId(id: string): string {
  return id
    .split(/[.-]+/)
    .filter(Boolean)
    .map((part) => part[0]!.toUpperCase() + part.slice(1))
    .join(" ");
}

function referenceWindowEnd(value?: string): string {
  const raw = value ?? new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    throw new CascadeError("--reference-date must use YYYY-MM-DD");
  }
  const date = new Date(`${raw}T00:00:00Z`);
  if (Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== raw) {
    throw new CascadeError("--reference-date is not a valid calendar date");
  }
  return date.toISOString();
}

function validateOptions(options: StarterOptions): void {
  if (!SIMULATION_ID.test(options.simulationId)) {
    throw new CascadeError(
      "simulation ID must use lowercase letters, numbers, dots, or hyphens",
    );
  }
  if (!OWNER_LANE.test(options.ownerLane)) {
    throw new CascadeError("--owner-lane must use W-NNN");
  }
  if (
    options.title !== undefined &&
    (!options.title.trim() ||
      options.title.length > 120 ||
      options.title.includes("{{"))
  ) {
    throw new CascadeError("--title must be 1-120 characters without '{{'");
  }
}

async function findSimulationRoot(simulationId: string): Promise<string> {
  const matches: string[] = [];
  for (const scope of SIMULATION_SCOPES) {
    const root = `product-evals/simulations/${scope}/${simulationId}`;
    const manifestPath = `${root}/manifest.json`;
    if (!(await isFile(boundedPath(manifestPath, "product-evals/simulations/")))) continue;
    const manifest = await readJson<SimulationDefinition>(
      boundedPath(manifestPath, "product-evals/simulations/"),
    );
    validateSimulation(
      manifest as unknown as Record<string, unknown>,
      manifestPath,
    );
    matches.push(root);
  }
  if (matches.length !== 1) {
    throw new CascadeError(
      `expected exactly one scoped simulation for ${simulationId}, found ${matches.length}`,
    );
  }
  return matches[0]!;
}

function replaceTokens(
  value: unknown,
  tokens: Record<string, string>,
): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => replaceTokens(item, tokens));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        replaceTokens(key, tokens),
        replaceTokens(item, tokens),
      ]),
    );
  }
  if (typeof value !== "string") return value;
  const rendered = value.replace(
    /\{\{([A-Z0-9_]+)\}\}/g,
    (_match, name: string) => {
      const replacement = tokens[name];
      if (replacement === undefined) {
        throw new CascadeError(`starter template uses unknown token: ${name}`);
      }
      return replacement;
    },
  );
  if (rendered.includes("{{")) {
    throw new CascadeError(`starter template has an unresolved token: ${value}`);
  }
  return rendered;
}

async function renderDesignReport(
  options: StarterOptions,
  title: string,
): Promise<RenderedStarterFile> {
  const campaignId = `${options.simulationId}-smoke`;
  const source = await readText(rootPath(DESIGN_TEMPLATE_PATH));
  const content = source
    .replace("<campaign-id>", campaignId)
    .replace("- Status:", "- Status: `AUTHORED`; execution `NOT_RUN`")
    .replace("- Owner and lane:", `- Owner and lane: ${options.ownerLane}`)
    .replace(
      "- Campaign ID and version:",
      `- Campaign ID and version: ${campaignId} / schema v1`,
    )
    .replace(
      "- Simulation scope and root (`harness` or `product`):",
      `- Simulation scope and root (\`harness\` or \`product\`): product / product-evals/simulations/product/${options.simulationId}/`,
    )
    .replace(
      "- Current authority state:",
      "- Current authority state: generated product-scoped framework scaffold; target evidence remains NOT_RUN",
    )
    .replace(
      "- Requested outcome:",
      `- Requested outcome: adapt ${title} to the target project's real boundaries and reference evidence`,
    )
    .replace("- Contour:", "- Contour: agent-response")
    .replace("- Driver:", "- Driver: fake")
    .replace("- Tier:", "- Tier: deterministic-fixture")
    .replace("- Platform:", "- Platform: local")
    .replace(
      "- Purpose:",
      "- Purpose: validate generated simulation mechanics before target calibration",
    )
    .replace(
      "- Explicitly not proven:",
      "- Explicitly not proven: target-project calibration, live behavior, deployment, or release eligibility",
    )
    .replace(
      "- Runtime and adapter:",
      "- Runtime and adapter: Cascade campaign runner with the deterministic fake adapter",
    )
    .replace(
      "- Environment and platform:",
      "- Environment and platform: isolated local deterministic fixture / local",
    )
    .replace(
      "- Operator, evaluator, target, and recovery session separation:",
      "- Operator, evaluator, target, and recovery session separation: distinct reserved role sessions are required",
    )
    .replace(
      "- Identity and permission scope:",
      "- Identity and permission scope: fixture-only state actions within the generated task and world",
    )
    .replace(
      "- Isolation boundary:",
      "- Isolation boundary: generated in-memory world reset to the tracked fixture",
    )
    .replace(
      "- Reservation, lease, and recovery authority:",
      "- Reservation, lease, and recovery authority: atomically reserved run ID, operator-owned lease, and named recovery session; no implicit resume",
    )
    .replace(
      "- Policy scope, version, default-deny, and ambiguity behavior:",
      "- Policy scope, version, default-deny, and ambiguity behavior: policy v2 binds the exact campaign, task, kind, driver, actions, and path; zero applicable referenced policies or ambiguity blocks before provisioning",
    )
    .replace(
      "- Confirmation receipt binding and expiry:",
      "- Confirmation receipt binding and expiry: any required confirmation binds run, policy version and digest, campaign, task, action index and digest, confirmer, and expiry",
    )
    .replace(
      "- Timeout and required budget dimensions:",
      "- Timeout and required budget dimensions: 1000 ms task timeout; action_count and output_bytes are required and bounded by policy",
    )
    .replace(
      "- Fixture or seed identity:",
      `- Fixture or seed identity: product-evals/simulations/product/${options.simulationId}/worlds/default.fixture.json`,
    )
    .replace(
      "- Evidence root:",
      "- Evidence root: .artifacts/product-evals/<run-id>",
    )
    .replace(
      "- Evidence producer, platform, lineage, and redaction:",
      "- Evidence producer, platform, lineage, and redaction: simulation operator, selected platform, run/source digests, and no-secrets-v1 or source-code-v1",
    )
    .replace(
      "- Cleanup contract:",
      "- Cleanup contract: reset the world to the tracked fixture and verify no residual resources",
    )
    .replace(
      "- Terminal finalization and verification:",
      "- Terminal finalization and verification: atomically finalize once, then run campaign verify against the frozen manifest",
    )
    .replace(
      "- Retry and replay parentage:",
      "- Retry and replay parentage: use a new run ID plus --parent-run-id and preserve the original frozen source digest",
    );
  return {
    path: `product-evals/simulations/product/${options.simulationId}/simulation-design.md`,
    content,
    format: "text",
  };
}

export async function renderStarterPackage(
  options: StarterOptions,
): Promise<RenderedStarterFile[]> {
  validateOptions(options);
  const template = await readJson<StarterTemplate>(rootPath(TEMPLATE_PATH));
  if (
    template.schema_version !== 1 ||
    template.template_id !== "cascade-simulation-starter-v1" ||
    !Array.isArray(template.files) ||
    template.files.length === 0
  ) {
    throw new CascadeError("simulation starter template is invalid");
  }
  const taskId = options.simulationId.replaceAll(".", "-").toUpperCase();
  const title = options.title?.trim() ?? titleFromId(options.simulationId);
  const tokens = {
    SIMULATION_ID: options.simulationId,
    TASK_ID: taskId,
    TITLE: title,
    OWNER_LANE: options.ownerLane,
    REFERENCE_WINDOW_END: referenceWindowEnd(options.referenceDate),
    BASELINE_PROMPT_DIGEST: sha256Text(
      `${options.simulationId}:baseline:prompt`,
    ),
    BASELINE_TOOL_DIGEST: sha256Text(
      `${options.simulationId}:baseline:tools`,
    ),
    CANDIDATE_PROMPT_DIGEST: sha256Text(
      `${options.simulationId}:candidate:prompt`,
    ),
    CANDIDATE_TOOL_DIGEST: sha256Text(
      `${options.simulationId}:candidate:tools`,
    ),
    HARNESS_DIGEST: sha256Text("cascade-simulation-starter-v1"),
    REFERENCE_LABEL_DIGEST: sha256Text(
      `${options.simulationId}:framework-reference-labels`,
    ),
    INTAKE_ID: sha256Text(`${options.simulationId}:simulation-intake`).slice(0, 16),
  };
  const rendered: RenderedStarterFile[] = template.files.map((file) => ({
    path: replaceTokens(file.path, tokens) as string,
    content: replaceTokens(file.content, tokens),
    format: "json" as const,
  }));
  rendered.push(await renderDesignReport(options, title));
  const paths = rendered.map((file) => file.path);
  if (new Set(paths).size !== paths.length) {
    throw new CascadeError("simulation starter template renders duplicate paths");
  }
  for (const file of rendered) {
    boundedPath(file.path);
    if (file.format === "json") JSON.parse(stableJson(file.content));
    else if (typeof file.content !== "string" || !file.content.trim()) {
      throw new CascadeError("simulation design template rendered empty content");
    }
  }
  return rendered;
}

async function rollback(files: string[]): Promise<void> {
  for (const path of [...files].reverse()) {
    try {
      await unlink(path);
    } catch {
      // Only successfully created initializer files are tracked here.
    }
  }
  const directories = [
    ...new Set(
      files.flatMap((path) => {
        const values: string[] = [];
        let current = dirname(path);
        while (current !== rootPath() && current.startsWith(rootPath())) {
          values.push(current);
          current = dirname(current);
        }
        return values;
      }),
    ),
  ].sort((left, right) => right.length - left.length);
  for (const directory of directories) {
    try {
      await rmdir(directory);
    } catch {
      // Shared or non-empty directories must remain.
    }
  }
}

export async function initializeSimulation(
  options: StarterOptions & { dryRun?: boolean },
): Promise<{ campaignId: string; files: string[]; catalogDigest?: string }> {
  const rendered = await renderStarterPackage(options);
  const collisions = [];
  for (const file of rendered) {
    if (await exists(boundedPath(file.path))) collisions.push(file.path);
  }
  if (collisions.length) {
    throw new CascadeError(
      `simulation init refuses existing paths: ${collisions.join(", ")}`,
    );
  }
  const campaignId = `${options.simulationId}-smoke`;
  if (options.dryRun) {
    return { campaignId, files: rendered.map((file) => file.path) };
  }

  const created: string[] = [];
  try {
    for (const file of rendered) {
      const path = boundedPath(file.path);
      if (file.format === "json") {
        await writeJsonExclusive(path, file.content);
      } else {
        await writeTextExclusive(path, String(file.content));
      }
      created.push(path);
    }
    await resolveCampaign(
      rootPath("product-evals/campaigns", `${campaignId}.json`),
    );
    const catalog = await buildCampaignCatalog();
    await writeJsonAtomic(CATALOG_PATH, catalog);
    return {
      campaignId,
      files: created.map((path) => rel(path)),
      catalogDigest: String(catalog.digest),
    };
  } catch (error) {
    await rollback(created);
    throw error;
  }
}

export async function previewDerivedPopulation(
  options: DerivePopulationOptions,
) {
  if (!PERSONA_ID.test(options.personaId)) {
    throw new CascadeError("persona ID must use P-NNN");
  }
  if (!SIMULATION_ID.test(options.simulationId)) {
    throw new CascadeError("simulation ID must use lowercase letters, numbers, dots, or hyphens");
  }
  if (!["representative", "coverage", "stress", "counterfactual"].includes(options.mode)) {
    throw new CascadeError("--mode must be representative, coverage, stress, or counterfactual");
  }
  const simulationRoot = await findSimulationRoot(options.simulationId);
  const directory = boundedPath(
    `${simulationRoot}/derivations`,
    "product-evals/simulations/",
  );
  let names: string[];
  try {
    names = (await readdir(directory)).filter((name) => name.endsWith(".json")).sort();
  } catch {
    throw new CascadeError(`persona derivation directory missing for simulation: ${options.simulationId}`);
  }
  const matches: Array<{
    path: string;
    digest: string;
    manifest: PersonaDerivationManifest;
  }> = [];
  for (const name of names) {
    const path = `${simulationRoot}/derivations/${name}`;
    const manifest = await readJson<PersonaDerivationManifest>(boundedPath(path));
    validatePersonaDerivation(manifest as unknown as Record<string, unknown>, path);
    if (
      manifest.mode === options.mode &&
      manifest.product_personas.some((persona) => persona.persona_id === options.personaId)
    ) {
      await verifyPersonaDerivationSources(manifest, path);
      matches.push({ path, digest: await sha256File(rootPath(path)), manifest });
    }
  }
  if (matches.length !== 1) {
    throw new CascadeError(
      `expected exactly one persona derivation for ${options.personaId}/${options.mode}, found ${matches.length}`,
    );
  }
  const selected = matches[0]!;
  const population = derivePopulationFromManifest(
    selected.manifest,
    selected.path,
    selected.digest,
  );
  const populationDirectory = boundedPath(
    `${simulationRoot}/populations`,
    "product-evals/simulations/",
  );
  const existingMatches: string[] = [];
  for (const name of (await readdir(populationDirectory)).filter((item) => item.endsWith(".json")).sort()) {
    const candidatePath = `${simulationRoot}/populations/${name}`;
    const candidate = await readJson<Record<string, unknown>>(boundedPath(candidatePath));
    const source = candidate.source as Record<string, unknown> | undefined;
    const derivation = source?.derivation as Record<string, unknown> | undefined;
    if (candidate.schema_version === 2 && derivation?.path === selected.path) {
      existingMatches.push(candidatePath);
    }
  }
  if (existingMatches.length > 1) {
    throw new CascadeError(`persona derivation maps to multiple population files: ${existingMatches.join(", ")}`);
  }
  const defaultOutput = `${simulationRoot}/populations/${population.id}.json`;
  const outputPath = existingMatches[0] ?? defaultOutput;
  const outputExists = await isFile(boundedPath(outputPath));
  if (outputExists) {
    const existing = await readJson<unknown>(boundedPath(outputPath));
    if (stableJson(existing) !== stableJson(population)) {
      throw new CascadeError(`persona population preview refuses existing collision: ${outputPath}`);
    }
  }
  if (!options.dryRun && !outputExists) {
    await writeJsonExclusive(boundedPath(outputPath, "product-evals/simulations/"), population);
    try {
      await writeJsonAtomic(CATALOG_PATH, await buildCampaignCatalog());
    } catch (error) {
      await unlink(boundedPath(outputPath, "product-evals/simulations/"));
      throw error;
    }
  }
  return {
    status: options.dryRun ? "DRY_RUN" as const : outputExists ? "UNCHANGED" as const : "WRITTEN" as const,
    output_path: outputPath,
    existing_match: outputExists,
    derivation_path: selected.path,
    population,
  };
}

export async function disposeRefinement(
  options: DisposeRefinementOptions,
  dependencies: {
    verifyFrozenRun?: (runId: string) => Promise<void>;
  } = {},
) {
  if (!/^\.artifacts\/product-evals\/.+\/refinements\/.+\.json$/.test(options.proposalPath)) {
    throw new CascadeError("--proposal must reference a frozen .artifacts/product-evals refinement");
  }
  const proposalPath = boundedPath(options.proposalPath, ".artifacts/product-evals/");
  if (!(await isFile(proposalPath))) throw new CascadeError(`refinement proposal missing: ${options.proposalPath}`);
  const proposal = await readJson<PersonaRefinementProposal>(proposalPath);
  validatePersonaRefinementProposal(
    proposal as unknown as Record<string, unknown>,
    options.proposalPath,
  );
  const runId = options.proposalPath.split("/")[2]!;
  if (proposal.run_id !== runId) {
    throw new CascadeError("refinement proposal run identity does not match its frozen path");
  }
  if (dependencies.verifyFrozenRun) {
    await dependencies.verifyFrozenRun(runId);
  } else {
    const verification = await new CampaignArtifactStore(
      rootPath(".artifacts/product-evals"),
      runId,
    ).verify();
    if (verification.finalization_status !== "COMPLETED") {
      throw new CascadeError("refinement proposal requires a completed verified run");
    }
  }
  const evidence = await Promise.all(
    options.evidenceManifestPaths.map(async (path) => {
      if (!/^(docs\/product\/evidence|\.artifacts\/product-evals\/evidence-manifests)\/.+\.json$/.test(path)) {
        throw new CascadeError(
          `external evidence manifest must stay under docs/product/evidence/ or .artifacts/product-evals/evidence-manifests/: ${path}`,
        );
      }
      const absolute = boundedPath(path);
      if (!(await isFile(absolute))) throw new CascadeError(`external evidence manifest missing: ${path}`);
      const manifest = await readJson<ExternalPersonaEvidenceManifest>(absolute);
      validateExternalPersonaEvidenceManifest(
        manifest as unknown as Record<string, unknown>,
        path,
      );
      return { path, digest: await sha256File(absolute), manifest };
    }),
  );
  const disposition = buildPersonaRefinementDisposition({
    dispositionId: options.dispositionId,
    proposalPath: options.proposalPath,
    proposalDigest: await sha256File(proposalPath),
    proposal,
    decision: options.decision,
    reviewerIdentity: options.reviewerIdentity,
    evidence,
    reviewedAt: options.reviewedAt,
  });
  const outputPath = `.artifacts/product-evals/refinement-reviews/${options.dispositionId}/disposition.json`;
  if (!options.dryRun) {
    await writeJsonExclusive(boundedPath(outputPath, ".artifacts/product-evals/"), disposition);
  }
  return {
    status: options.dryRun ? "DRY_RUN" as const : "WRITTEN" as const,
    output_path: outputPath,
    disposition,
  };
}

async function commandInit(value: string | undefined, argv: string[]) {
  if (!value) throw new CascadeError("simulation init requires a simulation ID");
  const args = parseArgs(argv);
  const ownerLane = flag(args, "owner-lane");
  if (!ownerLane) {
    throw new CascadeError("simulation init requires --owner-lane W-NNN");
  }
  const result = await initializeSimulation({
    simulationId: value,
    ownerLane,
    title: flag(args, "title"),
    referenceDate: flag(args, "reference-date"),
    dryRun: boolFlag(args, "dry-run"),
  });
  const status = boolFlag(args, "dry-run") ? "DRY_RUN" : "WRITTEN";
  console.log(
    `simulation_init_status=${status} simulation=${value} ` +
      `campaign=${result.campaignId} files=${result.files.length} ` +
      `catalog_digest=${result.catalogDigest ?? "NOT_WRITTEN"}`,
  );
  if (boolFlag(args, "dry-run")) {
    console.log(result.files.join("\n"));
  }
  return 0;
}

async function commandDerivePopulation(
  personaId: string | undefined,
  argv: string[],
): Promise<number> {
  if (!personaId) throw new CascadeError("simulation derive-population requires a P-NNN persona ID");
  const args = parseArgs(argv);
  const simulationId = flag(args, "simulation");
  const mode = flag(args, "mode");
  if (!simulationId) throw new CascadeError("simulation derive-population requires --simulation");
  if (!mode) throw new CascadeError("simulation derive-population requires --mode");
  const dryRun = boolFlag(args, "dry-run");
  const write = boolFlag(args, "write");
  if (dryRun === write) {
    throw new CascadeError("simulation derive-population requires exactly one of --dry-run or --write");
  }
  const result = await previewDerivedPopulation({
    personaId,
    simulationId,
    mode: mode as PersonaDerivationMode,
    dryRun,
  });
  console.log(stableJson(result, true));
  return 0;
}

async function commandDisposeRefinement(argv: string[]): Promise<number> {
  const args = parseArgs(argv);
  const proposalPath = flag(args, "proposal");
  const dispositionId = flag(args, "disposition-id");
  const decision = flag(args, "decision")?.toUpperCase().replaceAll("-", "_");
  const reviewerIdentity = flag(args, "reviewer");
  if (!proposalPath || !dispositionId || !decision || !reviewerIdentity) {
    throw new CascadeError(
      "simulation dispose-refinement requires --proposal, --disposition-id, --decision, and --reviewer",
    );
  }
  const dryRun = boolFlag(args, "dry-run");
  const write = boolFlag(args, "write");
  if (dryRun === write) {
    throw new CascadeError("simulation dispose-refinement requires exactly one of --dry-run or --write");
  }
  const result = await disposeRefinement({
    proposalPath,
    dispositionId,
    decision: decision as RefinementDispositionDecision,
    reviewerIdentity,
    evidenceManifestPaths: flags(args, "evidence-manifest"),
    dryRun,
  });
  console.log(stableJson(result, true));
  return 0;
}

async function commandIntake(campaign: string | undefined, argv: string[]): Promise<number> {
  if (!campaign) throw new CascadeError("simulation intake requires a campaign ID or path");
  const args = parseArgs(argv);
  const envelopePath = flag(args, "envelope");
  if (!envelopePath) throw new CascadeError("simulation intake requires --envelope PATH");
  const write = boolFlag(args, "write");
  const check = boolFlag(args, "check");
  if (write && check) throw new CascadeError("simulation intake accepts only one of --write or --check");
  const options = { campaign, envelopePath, brief: flag(args, "brief") };
  const result = write
    ? await writeCompiledSimulationIntake(options)
    : (await compileSimulationIntake(options)).intake;
  if (check) {
    const resolved = await resolveCampaign(campaign, { allowStaleIntake: true });
    const current = await readJson(resolved.campaign.intake_file!);
    if (stableJson(current) !== stableJson(result)) {
      throw new CascadeError(`simulation intake is stale: ${resolved.campaign.intake_file}`);
    }
    if (result.status === "READY") {
      await resolveCampaign(campaign);
    }
  }
  console.log(stableJson(result, true));
  return result.status === "READY" ? 0 : 2;
}

export async function main(argv: string[]): Promise<number> {
  const [command, value, ...rest] = argv;
  if (command === "init") return commandInit(value, rest);
  if (command === "derive-population") return commandDerivePopulation(value, rest);
  if (command === "dispose-refinement") return commandDisposeRefinement([value, ...rest].filter(Boolean) as string[]);
  if (command === "intake") return commandIntake(value, rest);
  console.log(`Usage:
  bun scripts/cascade.ts simulation init <simulation-id> --owner-lane W-NNN
    [--title "Title"] [--reference-date YYYY-MM-DD] [--dry-run]
    Output root: product-evals/simulations/product/<simulation-id>/
  bun scripts/cascade.ts simulation derive-population P-NNN --simulation <simulation-id>
    --mode <representative|coverage|stress|counterfactual> (--dry-run|--write)
  bun scripts/cascade.ts simulation dispose-refinement --proposal <path>
    --disposition-id <id> --decision <accepted|rejected|needs-evidence|simulator-repair>
    --reviewer <identity> [--evidence-manifest <path>] (--dry-run|--write)
  bun scripts/cascade.ts simulation intake <campaign-id-or-path> --envelope <path>
    [--brief PB-NNN|docs/specs/.../brief.yaml] [--check|--write]
`);
  return command ? 1 : 0;
}
