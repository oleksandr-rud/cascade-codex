import { dirname, resolve } from "node:path";

import {
  assertJsonSchema,
  type BoundedRegularFileOptions,
  CascadeError,
  boundedPath,
  isFile,
  parseRfc3339Instant,
  type JsonSchema,
  readBoundedRegularFile,
  readJson,
  rel,
  rootPath,
  sha256File,
  sha256Text,
  stableJson,
} from "./common";
import { type TaskEnvelope, validateTaskEnvelope } from "./admission";
import { resolveCurrentBriefProjection } from "./briefs";
import {
  type PersonaDerivationManifest,
  type PersonaDerivedPopulation,
  samePersonaReferences,
  validatePersonaDerivation,
  validatePersonaDerivedPopulation,
  verifyPersonaDerivationSources,
} from "./persona-simulations";

const SIMULATION_INTAKE_SCHEMA = await readJson<JsonSchema>(
  rootPath("product-evals/intakes/schema.json"),
);
const SIMULATION_SEED_BINDING_SCHEMA = await readJson<JsonSchema>(
  rootPath("product-evals/intakes/seed-binding.schema.json"),
);
const SIMULATION_SEED_BINDING_ROOT = rootPath(
  "product-evals/intakes/product/seed-bindings",
);
const SIMULATION_SEED_BINDING_PREFIX =
  "product-evals/intakes/product/seed-bindings/";
export const SIMULATION_SEED_BINDING_PATH_PATTERN =
  String.raw`^product-evals/intakes/product/seed-bindings/(?:\.*[A-Za-z0-9_-][A-Za-z0-9._-]*/)*\.*[A-Za-z0-9_-][A-Za-z0-9._-]*\.json$`;
const SIMULATION_SEED_BINDING_PATH = new RegExp(
  SIMULATION_SEED_BINDING_PATH_PATTERN,
);
export const CAMPAIGN_CONFIRMATION_KEY_ID_PATTERN_SOURCE =
  String.raw`^(?!(?:__proto__|constructor|prototype)$)[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$`;
const CAMPAIGN_CONFIRMATION_KEY_ID_PATTERN = new RegExp(
  CAMPAIGN_CONFIRMATION_KEY_ID_PATTERN_SOURCE,
);

export function assertCampaignConfirmationKeyId(value: unknown, label: string): string {
  if (
    typeof value !== "string" ||
    !CAMPAIGN_CONFIRMATION_KEY_ID_PATTERN.test(value)
  ) {
    throw new CascadeError(`${label} is invalid`);
  }
  return value;
}

export const CAMPAIGN_FIXED_SOURCE_FILES = [
  "package.json",
  ".codex/task-admission/policies/core.json",
  ".codex/task-admission/control-catalog.json",
  ".codex/task-admission/control-catalog.schema.json",
  ".codex/task-admission/task-envelope.schema.json",
  ".codex/task-admission/policy.schema.json",
  "harness-evals/task-admission/cases.json",
  "harness-evals/task-admission/case.schema.json",
  "harness-evals/task-admission/assessment.schema.json",
  "docs/product/catalog.yaml",
  "docs/product/catalog.schema.json",
  "docs/product/requirements.md",
  "docs/product/journeys.md",
  "docs/product/scenarios.md",
  "docs/specs/brief-manifest.schema.json",
  "scripts/cascade.ts",
  "scripts/cascade/admission.ts",
  "scripts/cascade/admission-clauses.ts",
  "scripts/cascade/briefs.ts",
  "scripts/cascade/common.ts",
  "scripts/cascade/campaign-artifacts.ts",
  "scripts/cascade/campaign-policies.ts",
  "scripts/cascade/campaigns.ts",
  "scripts/cascade/evaluations.ts",
  "scripts/cascade/evals.ts",
  "scripts/cascade/evaluation-reducer.ts",
  "scripts/cascade/evaluation-authority.ts",
  "scripts/cascade/harness-evaluation-receipts.ts",
  "scripts/cascade/retry-lineage.ts",
  "scripts/cascade/runtime-handoffs.ts",
  "scripts/cascade/patterns.ts",
  "scripts/cascade/simulations.ts",
  "scripts/cascade/simulation-intake.ts",
  "scripts/cascade/simulation-definitions.ts",
  "scripts/cascade/simulation-sessions.ts",
  "product-evals/campaigns/retry-lineage-receipt.schema.json",
  "product-evals/campaigns/runtime-handoff-receipt.schema.json",
  "scripts/cascade/persona-simulations.ts",
  "scripts/cascade/target.ts",
  "scripts/cascade/validate.ts",
  "scripts/cascade/work-audit.ts",
  ".codex/harness-tooling/browser-adapter-runner.ts",
  ".codex/harness-tooling/package.json",
  ".codex/harness-tooling/bun.lock",
  ".codex/skills/simulation-campaigns/templates/starter/package.template.json",
  ".codex/skills/simulation-campaigns/templates/campaign-design.md",
  ".codex/agents/simulation-evaluator.toml",
  ".codex/agents/simulation-evaluator/AGENT.md",
  ".codex/agents/simulation-evaluator/skills.yaml",
  ".codex/skills/simulation-evaluation/SKILL.md",
  ".codex/skills/simulation-evaluation/checklists/evaluation-quality.md",
  "product-evals/campaigns/schema.json",
  "product-evals/campaigns/cascade-run-artifact-v1.meta-schema.json",
  "product-evals/campaigns/pairwise-distinct-fields-v1.vocabulary.schema.json",
  "product-evals/campaigns/run-artifact.schema.json",
  "product-evals/intakes/schema.json",
  "product-evals/intakes/seed-binding.schema.json",
  "product-evals/rubrics/schema.json",
  "product-evals/rubrics/evaluation-profile.schema.json",
  "product-evals/rubrics/simulation-evaluation-output.schema.json",
  "product-evals/rubrics/evaluation-receipt.schema.json",
  "harness-evals/specialized-evaluation-receipt.schema.json",
  "product-evals/simulations/schema.json",
  "product-evals/simulations/population.schema.json",
  "product-evals/simulations/persona-derivation.schema.json",
  "product-evals/simulations/refinement-proposal.schema.json",
  "product-evals/simulations/refinement-disposition.schema.json",
  "product-evals/simulations/external-persona-evidence.schema.json",
  "product-evals/artifact-policy.schema.json",
  "product-evals/artifact-policy.json",
  "product-evals/simulations/scenario.schema.json",
  "product-evals/simulations/world.schema.json",
  "product-evals/simulations/dataset.schema.json",
  "product-evals/tasks/schema.json",
  "product-evals/claims/schema.json",
  "product-evals/policies/schema.json",
  "product-evals/policies/confirmation-receipt.schema.json",
  "product-evals/oracles/schema.json",
  "product-evals/metrics/schema.json",
  "product-evals/treatments/schema.json",
  "product-evals/calibrations/schema.json",
] as const;

export async function assertCampaignFixedSourceImportClosure(
  sourceFiles: readonly string[] = CAMPAIGN_FIXED_SOURCE_FILES,
): Promise<void> {
  const transpiler = new Bun.Transpiler({ loader: "ts" });
  const declared = new Set(sourceFiles);
  const queued = sourceFiles.filter((file) => file.endsWith(".ts"));
  const visited = new Set<string>();
  while (queued.length) {
    const sourcePath = queued.shift()!;
    if (visited.has(sourcePath)) continue;
    visited.add(sourcePath);
    const bytes = await readBoundedRegularFile(
      rootPath(sourcePath),
      `campaign runtime source ${sourcePath}`,
      { maxBytes: 5 * 1024 * 1024 },
    );
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    const firstNewline = text.indexOf("\n");
    const scannableText = text.startsWith("#!")
      ? firstNewline === -1
        ? ""
        : text.slice(firstNewline + 1)
      : text;
    const imports = new Set(
      transpiler.scanImports(scannableText)
        .map((entry) => entry.path)
        .filter((specifier) => specifier.startsWith(".")),
    );
    for (const imported of imports) {
      const absolute = resolve(dirname(rootPath(sourcePath)), imported);
      const candidates = /\.[A-Za-z0-9]+$/.test(imported)
        ? [absolute]
        : [`${absolute}.ts`, `${absolute}.json`, resolve(absolute, "index.ts")];
      let dependency: string | null = null;
      for (const candidate of candidates) {
        if (await isFile(candidate)) {
          dependency = rel(candidate);
          break;
        }
      }
      if (!dependency) {
        throw new CascadeError(
          `campaign runtime source has unresolved relative import: ${sourcePath} -> ${imported}`,
        );
      }
      if (!declared.has(dependency)) {
        throw new CascadeError(
          `campaign fixed source closure omits transitive runtime import: ${sourcePath} -> ${dependency}`,
        );
      }
      queued.push(dependency);
    }
  }
}

export type TaskKind =
  | "command"
  | "http"
  | "terminal"
  | "browser"
  | "desktop"
  | "mobile"
  | "agent-response";

export type DriverType =
  | "fake"
  | "direct-process"
  | "http-client"
  | "pty"
  | "playwright"
  | "platform-automation"
  | "computer-use"
  | "agent-runtime";

export type CampaignStatus = "PASS" | "FAIL" | "BLOCKED" | "NOT_RUN" | "GAP";
export type SimulationScope = "harness" | "product";
export interface SpecializedEvaluationDeclaration {
  applicability: "REQUIRED" | "NOT_APPLICABLE";
  route_ids: string[];
  trace_ids: string[];
  claim_ids: string[];
  reason: string;
}
export type ClaimStatus =
  | "SUPPORTED"
  | "PARTIALLY_SUPPORTED"
  | "UNSUPPORTED"
  | "CONFLICTING"
  | "BLOCKED"
  | "NOT_RUN"
  | "INVALID";
export type CalibrationStatus =
  | "CALIBRATED"
  | "PARTIALLY_CALIBRATED"
  | "UNCALIBRATED"
  | "STALE"
  | "BLOCKED"
  | "NOT_RUN"
  | "INVALID";

export interface CampaignDefinition {
  schema_version: 1;
  id: string;
  title: string;
  purpose: string;
  owner_lane: string;
  tier:
    | "deterministic-fixture"
    | "controlled-integration"
    | "platform-canary"
    | "semantic-evaluation";
  session?: {
    max_duration_ms: number;
    max_step_duration_ms: number;
    max_steps: number;
    max_parallel_steps: number;
    max_steps_per_episode: number;
    max_surfaces: number;
    max_checkpoint_bytes: number;
    lease_ttl_ms: number;
  };
  evaluation_profile_file: string;
  simulation_file: string;
  task_files: string[];
  claim_files: string[];
  policy_files: string[];
  oracle_files: string[];
  intake_file?: string;
  seed_binding_file?: string;
  specialized_evaluation: SpecializedEvaluationDeclaration | null;
}

function simulationScopeFromManifestPath(
  simulationFile: string,
): SimulationScope | null {
  let canonical: string;
  try {
    canonical = rel(boundedPath(simulationFile, "product-evals/simulations/"));
  } catch {
    return null;
  }
  if (canonical !== simulationFile) return null;
  const scope = /^product-evals\/simulations\/(harness|product)\/.+\/manifest\.json$/
    .exec(canonical)?.[1];
  return scope === "harness" || scope === "product" ? scope : null;
}

function simulationScopeFromIntakePath(
  intakeFile: string,
): SimulationScope | null {
  let canonical: string;
  try {
    canonical = rel(boundedPath(intakeFile, "product-evals/intakes/"));
  } catch {
    return null;
  }
  if (canonical !== intakeFile) return null;
  const scope = /^product-evals\/intakes\/(harness|product)\/.+\.json$/
    .exec(canonical)?.[1];
  return scope === "harness" || scope === "product" ? scope : null;
}

export function validateCampaignIntakePathScope(
  simulationFile: string,
  intakeFile: string | undefined,
  label: string,
  resolvedSimulationScope?: SimulationScope,
): SimulationScope {
  const manifestScope = simulationScopeFromManifestPath(simulationFile);
  if (!manifestScope) {
    throw new CascadeError(
      `${label}.simulation_file must stay inside a physical harness or product simulation root`,
    );
  }
  if (resolvedSimulationScope && resolvedSimulationScope !== manifestScope) {
    throw new CascadeError(
      `${label}.simulation_file scope path mismatch: resolved ${resolvedSimulationScope}, path ${manifestScope}`,
    );
  }
  if (manifestScope === "product" && !intakeFile) {
    throw new CascadeError(`${label} product campaign requires intake_file`);
  }
  if (intakeFile) {
    const intakeScope = simulationScopeFromIntakePath(intakeFile);
    if (intakeScope !== manifestScope) {
      throw new CascadeError(
        `${label}.intake_file scope path mismatch: simulation scope ${manifestScope} requires product-evals/intakes/${manifestScope}/`,
      );
    }
  }
  return manifestScope;
}

export function validateCampaignSeedBindingScope(
  simulationScope: SimulationScope,
  seedBindingFile: string | undefined,
  label: string,
): void {
  if (simulationScope === "product" && !seedBindingFile) {
    throw new CascadeError(`${label} product campaign requires seed_binding_file`);
  }
  if (simulationScope === "harness" && seedBindingFile) {
    throw new CascadeError(`${label} harness campaign cannot bind a product seed artifact`);
  }
  if (simulationScope === "product" && seedBindingFile) {
    validateSimulationSeedBindingPath(
      seedBindingFile,
      `${label}.seed_binding_file`,
    );
  }
}

export function validateSimulationSeedBindingPath(
  seedBindingPath: string,
  label: string,
): void {
  if (!SIMULATION_SEED_BINDING_PATH.test(seedBindingPath)) {
    throw new CascadeError(
      `${label} must be an ASCII-only canonical slash-separated JSON path under ${SIMULATION_SEED_BINDING_PREFIX}`,
    );
  }
}

export function validateSimulationIntakeDestination(
  intakeFile: string,
  simulationScope: SimulationScope,
  label: string,
): string {
  if (simulationScopeFromIntakePath(intakeFile) !== simulationScope) {
    throw new CascadeError(
      `${label} scope path mismatch: simulation scope ${simulationScope} requires product-evals/intakes/${simulationScope}/`,
    );
  }
  return boundedPath(intakeFile, `product-evals/intakes/${simulationScope}/`);
}

export interface SimulationSeedMapping {
  source_claim_id: string;
  disposition: "SEEDED" | "CONTEXT_ONLY" | "OUT_OF_SCOPE";
  campaign_claim_ids: string[];
  scenario_ids: string[];
  task_ids: string[];
  rationale: string | null;
}

export interface SimulationSeedBindingDefinition {
  schema_version: 1;
  artifact_type: "cascade-simulation-seed-binding";
  id: string;
  status: "DRAFT" | "READY";
  campaign_id: string;
  campaign_sha256: string;
  source: {
    task_envelope_id: string | null;
    task_envelope_revision: number | null;
    request_digest: string | null;
    source_digest: string | null;
  };
  mappings: SimulationSeedMapping[];
}

export interface ResolvedSimulationSeedBinding {
  path: string;
  sha256: string;
  definition: SimulationSeedBindingDefinition;
}

export const MAX_SIMULATION_SEED_BINDING_BYTES = 1024 * 1024;

export interface SimulationIntakeDefinition {
  schema_version: 6;
  artifact_type: "cascade-simulation-intake";
  id: string;
  status: "DRAFT" | "READY" | "BLOCKED";
  scope: SimulationScope;
  campaign_id: string;
  produced_at: string;
  task_envelope: null | {
    path: string;
    envelope_id: string;
    revision: number;
    sha256: string;
    request_digest: string;
    source_digest: string | null;
    derivation_input_digest: string;
    provenance_version: 2;
    provenance_mode: TaskEnvelope["derivation_input"]["provenance_mode"];
    source_segments_digest: string;
    direct_user_attestation: TaskEnvelope["derivation_input"]["direct_user_attestation"];
    expected_request_digest: string | null;
    expected_source_digest: string | null;
  };
  product_context: null | {
    brief_path: string;
    brief_id: string;
    revision: number;
    sha256: string;
    output_path: string;
    output_sha256: string;
    domain_id: string;
    capability_id: string;
    product_refs: {
      requirement_ids: string[];
      journey_ids: string[];
      scenario_ids: string[];
      persona_ids: string[];
    };
  };
  seed_binding: null | {
    path: string;
    sha256: string;
    id: string;
    status: "DRAFT" | "READY";
    campaign_id: string;
    campaign_sha256: string;
    source: SimulationSeedBindingDefinition["source"];
    mappings: SimulationSeedMapping[];
  };
  claims: Array<{
    claim_id: string;
    source_claim_id: string;
    kind: TaskEnvelope["claims"][number]["kind"];
    source: TaskEnvelope["claims"][number]["source"];
    statement: string;
    status: string;
    policy_tags: string[];
  }>;
  tasks: Array<{
    task_id: string;
    declared_policy_ids: string[];
    applicable_policy_ids: string[];
    actions: Array<{
      action_index: number;
      action_binding_version: typeof ACTION_BINDING_VERSION;
      action_binding_digest: string;
      applicable_policy_ids: string[];
      policy_digests: string[];
      decision: "ALLOW" | "DENY" | "REQUIRE_CONFIRMATION" | "GAP" | "AMBIGUOUS";
    }>;
  }>;
  blockers: string[];
  gaps: string[];
  invalidation: string[];
}

export interface EvaluationProfileDefinition {
  schema_version: 1;
  id: string;
  provider: "fixture" | "codex";
  model?: string;
  reasoning_effort?: "low" | "medium" | "high" | "xhigh";
  timeout_ms: number;
  rubric_file?: string;
}

export interface RubricDefinition {
  schema_version: 1;
  id: string;
  criteria: string[];
  judge_profile: string;
  human_calibration_required: boolean;
}

export interface SimulationDefinition {
  schema_version: 1;
  id: string;
  simulation_scope: SimulationScope;
  title: string;
  purpose?: string;
  population_files: string[];
  scenario_files: string[];
  world_file: string;
  dataset_file: string;
  metric_files: string[];
  treatment_files: string[];
  calibration_file?: string;
}

export interface LegacyPopulationDefinition {
  schema_version: 1;
  id: string;
  source: {
    kind: "synthetic" | "expert-authored" | "production-derived";
    description: string;
    reference_window?: string;
    minimized?: boolean;
  };
  actors: Array<{
    id: string;
    weight: number;
    behavior: Record<string, unknown>;
    slices: string[];
  }>;
}

export type PopulationDefinition = LegacyPopulationDefinition | PersonaDerivedPopulation;

export interface ResolvedPersonaDerivation {
  path: string;
  sha256: string;
  manifest: PersonaDerivationManifest;
}

export interface ScenarioDefinition {
  schema_version: 1;
  id: string;
  goal: string;
  actor_ids: string[];
  initial_state: Record<string, unknown>;
  stop_conditions: string[];
  claim_ids: string[];
}

export interface WorldDefinition {
  schema_version: 1;
  id: string;
  fixture_file: string;
  allowed_actions: Array<"assert" | "set" | "increment" | "deny" | "fail">;
  negative_behaviors: string[];
  cleanup: { reset_to_fixture: true };
}

export interface DatasetDefinition {
  schema_version: 1;
  id: string;
  leakage_policy: "exclusive-case-identity";
  cases: Array<{
    id: string;
    scenario_id: string;
    actor_id: string;
    partition:
      | "development"
      | "regression"
      | "holdout"
      | "calibration-reference";
    slices?: string[];
  }>;
}

export interface MetricDefinition {
  schema_version: 1;
  id: string;
  kind: "deterministic" | "semantic" | "business";
  direction: "higher-is-better" | "lower-is-better" | "exact";
  unit: string;
  aggregation: "mean" | "sum" | "rate" | "exact";
  hard_gate: boolean;
  required_slices: string[];
  uncertainty?: "none" | "bootstrap" | "confidence-interval";
  source: {
    oracle_id?: string;
    rubric_id?: string;
    reference_field?: string;
  };
}

export interface TreatmentDefinition {
  schema_version: 1;
  id: string;
  baseline: boolean;
  target: {
    source_revision: string;
    model: string;
    prompt_digest: string;
    tool_digest: string;
    harness_digest: string;
  };
}

export interface ScoreRow {
  case_id: string;
  treatment_id: string;
  metric_id: string;
  slice: string;
  value: number;
  human_label?: number;
  judge_label?: number;
}

export interface CalibrationDefinition {
  schema_version: 1;
  id: string;
  simulation_id: string;
  dataset_id: string;
  treatment_ids: string[];
  metric_ids: string[];
  simulated_scores_file: string;
  reference_scores_file: string;
  reference: {
    kind: "framework-fixture" | "expert-labelled" | "production";
    label_digest: string;
    reference_window_end: string;
    reviewer_identity: string;
  };
  thresholds: {
    minimum_samples: number;
    minimum_rank_correlation: number;
    minimum_linear_correlation: number;
    minimum_human_agreement: number;
  };
  required_slices: string[];
  staleness_days: number;
  framework_fixture: boolean;
}

export interface TaskAction {
  type: "assert" | "set" | "increment" | "deny" | "fail";
  path?: string;
  value?: unknown;
  amount?: number;
  reason?: string;
}

export type HttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE"
  | "HEAD"
  | "OPTIONS";

export const ACTION_BINDING_VERSION = "cascade-action-binding-v2" as const;
const PROHIBITED_INLINE_ACTION_MESSAGE =
  "action contains prohibited inline sensitive material";

export interface HttpPublicLiteral {
  kind: "public-literal";
  value: string;
}

export interface SecretReference {
  kind: "secret-reference";
  reference_id: string;
  immutable_version: string;
  lease_id?: string;
}

export type HttpRequestValue = HttpPublicLiteral | SecretReference;

export interface HttpRequestDefinition {
  method: HttpMethod;
  url: string;
  headers?: Record<string, HttpRequestValue>;
  /** Confidential request bodies must use a secret-reference. */
  body?: HttpRequestValue;
}

export interface DirectProcessDefinition {
  working_directory: "task-root";
  environment: Record<string, HttpRequestValue>;
  interactive: false;
  network: "deny";
  filesystem: {
    read: "host";
    write: "task-root";
  };
}

export type TerminalStep =
  | {
      type: "terminal-wait";
      text: string;
      timeout_ms: number;
    }
  | {
      type: "terminal-input";
      value: HttpRequestValue;
      append_enter: boolean;
    }
  | {
      type: "terminal-resize";
      cols: number;
      rows: number;
    }
  | {
      type: "terminal-signal";
      signal: "SIGINT" | "SIGTERM";
    }
  | {
      type: "terminal-capture";
      label: string;
    };

export interface TerminalTaskDefinition {
  working_directory: "task-root";
  environment: Record<string, HttpRequestValue>;
  network: "deny";
  filesystem: {
    read: "host";
    write: "task-root";
  };
  cols: number;
  rows: number;
  steps: TerminalStep[];
  expected_exit_code: number;
  evidence: {
    raw_stream: true;
    transcript: true;
    final_screen: true;
  };
}

export interface TerminalSpawnAction {
  type: "terminal-spawn";
  argv: string[];
  terminal: Omit<TerminalTaskDefinition, "steps" | "evidence">;
}

export type DesktopAction =
  | {
      type: "desktop-launch";
      app_id: string;
      window_title: string;
    }
  | {
      type: "desktop-type";
      value: HttpPublicLiteral;
    }
  | {
      type: "desktop-key";
      key: string;
    }
  | {
      type: "desktop-wait-file";
      file: string;
      timeout_ms: number;
    }
  | {
      type: "desktop-capture";
      label: string;
    };

export interface DesktopTaskDefinition {
  provider: {
    container_runtime: "docker";
    image: string;
    image_id: string;
    platform: "linux/arm64";
    fixture_root: string;
  };
  app: {
    id: string;
    build: string;
  };
  environment: {
    display_server: "xvfb";
    display: ":99";
    resolution: { width: number; height: number; scale: 1 };
    locale: "C.UTF-8";
  };
  network: "deny";
  filesystem: {
    root: "read-only";
    write: "task-root";
  };
  reset: "container-remove";
  actions: DesktopAction[];
  evidence: {
    screenshots: true;
    result: true;
    logs: true;
  };
}

export type MobileAction =
  | { type: "mobile-launch"; app_id: string }
  | { type: "mobile-tap"; x: number; y: number }
  | { type: "mobile-type"; value: HttpPublicLiteral }
  | { type: "mobile-key"; key: string }
  | { type: "mobile-wait-text"; text: string; timeout_ms: number }
  | { type: "mobile-capture"; label: string };

export interface MobileTaskDefinition {
  provider: {
    runtime: "android-emulator" | "ios-simulator";
    device_id: string;
    platform_version: string;
    fixture_root: string;
  };
  app: { id: string; build: string };
  network: "deny";
  reset: "snapshot-restore";
  actions: MobileAction[];
  evidence: { screenshots: true; result: true; logs: true };
}

export type BrowserAction =
  | {
      type: "browser-fill";
      locator: { kind: "label"; value: string };
      value: string;
    }
  | {
      type: "browser-click";
      locator: { kind: "role"; role: string; name: string };
    }
  | {
      type: "browser-navigate";
      url: string;
    };

export interface BrowserTaskDefinition {
  fixture_file: string;
  profile: "ephemeral";
  network: "deny";
  downloads: false;
  uploads: false;
  actions: BrowserAction[];
  observation: {
    locator: { kind: "role"; role: string };
    expected_text: string;
  };
  evidence: {
    screenshot: true;
    trace: true;
  };
}

export interface AgentTaskDefinition {
  target: {
    mode: "explicit-instructions" | "named-agent" | "cascade-profile";
    instruction_file?: string;
    agent_id?: string;
    profile_file?: string;
  };
  runtime: {
    provider: "fixture" | "codex";
    fixture_response_file?: string;
    model?: string;
    reasoning_effort?: "low" | "medium" | "high";
  };
  prompt_file: string;
  input_file: string;
  output_schema_file: string;
  permissions: {
    filesystem: "read-only";
    network: "deny";
    tools: string[];
  };
  budgets: {
    max_output_bytes: number;
    max_tool_calls: number;
    max_tokens: number;
  };
  evaluation_profile: "response-contract-v1" | "cascade-route-and-trace-v1";
  source_blind: true;
}

export interface AgentInvokeAction {
  type: "agent-invoke";
  target_mode: AgentTaskDefinition["target"]["mode"];
  runtime_provider: AgentTaskDefinition["runtime"]["provider"];
  permission_profile: "read-only-network-deny";
  source_files: string[];
}

export interface ProcessExecAction {
  type: "process-exec";
  argv: string[];
  process?: DirectProcessDefinition;
}

export interface HttpRequestAction {
  type: "http-request";
  method: HttpMethod;
  url: string;
  headers?: Record<string, HttpRequestValue>;
  body?: HttpRequestValue;
}

export type SimulationAction =
  | TaskAction
  | ProcessExecAction
  | HttpRequestAction
  | TerminalSpawnAction
  | TerminalStep
  | BrowserAction
  | DesktopAction
  | MobileAction
  | AgentInvokeAction;

const RECOGNIZED_INLINE_SECRET_PATTERNS = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/i,
  /\bsk-(?:proj-)?[A-Za-z0-9_-]{8,}\b/i,
  /\bgh[pousr]_[A-Za-z0-9]{8,}\b/i,
  /\bAKIA[0-9A-Z]{8,}\b/i,
  /\b(?:auth(?:orization)?|api[-_ ]?key|cookie|password|passwd|passcode|pin|otp|secret|token|credential|private[-_ ]?key)\b\s*["']?\s*[:=]\s*["']?\s*[^\s"'}\],]+/i,
] as const;

const SENSITIVE_SINK_NAMES = new Set([
  "auth",
  "authorization",
  "proxyauthorization",
  "apikey",
  "cookie",
  "setcookie",
  "secret",
  "token",
  "password",
  "passwd",
  "credential",
  "credentials",
  "privatekey",
  "pin",
  "otp",
  "passcode",
]);

function normalizedHttpSinkName(name: string): string {
  return name.trim().toLowerCase();
}

export function isSensitiveHttpHeaderName(name: string): boolean {
  const normalized = normalizedHttpSinkName(name);
  const compact = normalized.replace(/[^a-z0-9]/g, "");
  return SENSITIVE_SINK_NAMES.has(compact) ||
    /(?:auth|apikey|cookie|secret|token|password|passwd|passcode|credential|privatekey|pin|otp)/.test(compact);
}

export function containsRecognizedInlineSecret(value: string): boolean {
  if (RECOGNIZED_INLINE_SECRET_PATTERNS.some((pattern) => pattern.test(value))) {
    return true;
  }
  try {
    const parsed = new URL(value);
    if ([...parsed.searchParams.keys()].some(isSensitiveHttpHeaderName)) return true;
  } catch {
    // Not every action literal is a URL.
  }
  return false;
}

function containsSensitiveStructuredValue(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsSensitiveStructuredValue);
  if (!value || typeof value !== "object") return false;
  return Object.entries(value as Record<string, unknown>).some(
    ([name, nested]) =>
      isSensitiveHttpHeaderName(name) || containsSensitiveStructuredValue(nested),
  );
}

function containsSensitiveHttpBody(value: string): boolean {
  if (containsRecognizedInlineSecret(value)) return true;
  try {
    return containsSensitiveStructuredValue(JSON.parse(value));
  } catch {
    return /(?:^|[?&;,{\s])(?:auth(?:orization)?|api[-_ ]?key|cookie|password|passwd|passcode|pin|otp|secret|token|credentials?|private[-_ ]?key)\s*[:=]/i
      .test(value);
  }
}

function assertSafeProcessArguments(argv: string[]): void {
  for (const [index, argument] of argv.entries()) {
    if (containsRecognizedInlineSecret(argument)) {
      throw new CascadeError(PROHIBITED_INLINE_ACTION_MESSAGE);
    }
    const assignment = /^(?:--?)?([A-Za-z][A-Za-z0-9_.-]*)=(.*)$/s.exec(argument);
    if (assignment && isSensitiveHttpHeaderName(assignment[1]!)) {
      throw new CascadeError(PROHIBITED_INLINE_ACTION_MESSAGE);
    }
    const flag = /^(?:--?)?([A-Za-z][A-Za-z0-9_.-]*)$/.exec(argument);
    if (
      flag &&
      isSensitiveHttpHeaderName(flag[1]!) &&
      index + 1 < argv.length
    ) {
      throw new CascadeError(PROHIBITED_INLINE_ACTION_MESSAGE);
    }
  }
}

const EXPLICIT_SHELL_EXECUTABLES = new Set([
  "/bin/bash",
  "/bin/sh",
  "/bin/zsh",
  "/usr/bin/bash",
  "/usr/bin/sh",
  "/usr/bin/zsh",
]);

function assertExplicitShellSyntax(argv: string[], label: string): void {
  if (EXPLICIT_SHELL_EXECUTABLES.has(argv[0]!)) return;
  const shellControlToken = /^(?:&&|\|\||[|;&]|[0-9]*(?:>>?|<<?))$/;
  const shellExpansion = /(?:\$\(|\$\{|\$[A-Za-z_][A-Za-z0-9_]*|`)/;
  if (
    argv.slice(1).some(
      (argument) =>
        shellControlToken.test(argument) || shellExpansion.test(argument),
    )
  ) {
    throw new CascadeError(
      `${label}.command requires shell expansion or control syntax; declare an absolute shell executable explicitly`,
    );
  }
}

function assertSecretReference(value: unknown): asserts value is SecretReference {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new CascadeError(PROHIBITED_INLINE_ACTION_MESSAGE);
  }
  const reference = value as Record<string, unknown>;
  const keys = Object.keys(reference).sort();
  const allowed = reference.lease_id === undefined
    ? ["immutable_version", "kind", "reference_id"]
    : ["immutable_version", "kind", "lease_id", "reference_id"];
  if (
    stableJson(keys) !== stableJson(allowed) ||
    reference.kind !== "secret-reference" ||
    typeof reference.reference_id !== "string" ||
    !reference.reference_id.trim() ||
    typeof reference.immutable_version !== "string" ||
    !reference.immutable_version.trim() ||
    (reference.lease_id !== undefined &&
      (typeof reference.lease_id !== "string" || !reference.lease_id.trim()))
  ) {
    throw new CascadeError(PROHIBITED_INLINE_ACTION_MESSAGE);
  }
}

function assertHttpRequestValue(
  value: unknown,
  sensitiveSink: boolean,
): asserts value is HttpRequestValue {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new CascadeError(PROHIBITED_INLINE_ACTION_MESSAGE);
  }
  const candidate = value as Record<string, unknown>;
  if (candidate.kind === "secret-reference") {
    assertSecretReference(candidate);
    return;
  }
  if (
    candidate.kind !== "public-literal" ||
    stableJson(Object.keys(candidate).sort()) !== stableJson(["kind", "value"]) ||
    typeof candidate.value !== "string" ||
    sensitiveSink ||
    containsRecognizedInlineSecret(candidate.value)
  ) {
    throw new CascadeError(PROHIBITED_INLINE_ACTION_MESSAGE);
  }
}

/**
 * Guards every action before canonical binding and again before dispatch.
 * Public literals are explicit non-secret assertions; confidential HTTP bodies
 * and every sensitive header sink must use immutable secret references.
 */
export function assertSafeSimulationAction(
  action: SimulationAction,
): void {
  if (action.type === "process-exec") {
    assertSafeProcessArguments(action.argv);
    for (const [name, value] of Object.entries(action.process?.environment ?? {})) {
      assertHttpRequestValue(value, isSensitiveHttpHeaderName(name));
    }
    return;
  }
  if (action.type === "terminal-spawn") {
    assertSafeProcessArguments(action.argv);
    for (const [name, value] of Object.entries(action.terminal.environment)) {
      assertHttpRequestValue(value, isSensitiveHttpHeaderName(name));
    }
    return;
  }
  if (action.type === "terminal-input") {
    assertHttpRequestValue(action.value, false);
    return;
  }
  if (action.type === "desktop-type") {
    assertHttpRequestValue(action.value, false);
    return;
  }
  if (
    action.type === "desktop-launch" ||
    action.type === "desktop-key" ||
    action.type === "desktop-wait-file" ||
    action.type === "desktop-capture"
  ) {
    if (containsRecognizedInlineSecret(stableJson(action))) {
      throw new CascadeError(PROHIBITED_INLINE_ACTION_MESSAGE);
    }
    return;
  }
  if (action.type === "mobile-type") {
    assertHttpRequestValue(action.value, false);
    return;
  }
  if (
    action.type === "mobile-launch" ||
    action.type === "mobile-tap" ||
    action.type === "mobile-key" ||
    action.type === "mobile-wait-text" ||
    action.type === "mobile-capture"
  ) {
    if (containsRecognizedInlineSecret(stableJson(action))) {
      throw new CascadeError(PROHIBITED_INLINE_ACTION_MESSAGE);
    }
    return;
  }
  if (
    action.type === "terminal-wait" ||
    action.type === "terminal-capture"
  ) {
    if (containsRecognizedInlineSecret(stableJson(action))) {
      throw new CascadeError(PROHIBITED_INLINE_ACTION_MESSAGE);
    }
    return;
  }
  if (
    action.type === "terminal-resize" ||
    action.type === "terminal-signal"
  ) {
    return;
  }
  if (
    action.type === "browser-fill" ||
    action.type === "browser-click" ||
    action.type === "browser-navigate"
  ) {
    if (containsRecognizedInlineSecret(stableJson(action))) {
      throw new CascadeError(PROHIBITED_INLINE_ACTION_MESSAGE);
    }
    if (action.type === "browser-navigate") {
      let parsed: URL;
      try {
        parsed = new URL(action.url);
      } catch {
        throw new CascadeError("browser navigation requires an absolute URL");
      }
      if (
        !new Set(["http:", "https:"]).has(parsed.protocol) ||
        parsed.username ||
        parsed.password ||
        parsed.hash
      ) {
        throw new CascadeError(
          "browser navigation requires an http(s) URL without credentials or a fragment",
        );
      }
    }
    return;
  }
  if (action.type === "agent-invoke") {
    if (
      action.permission_profile !== "read-only-network-deny" ||
      !action.source_files.length ||
      action.source_files.some(
        (file) => {
          const canonicalHarnessSchema =
            action.target_mode === "cascade-profile" &&
            file === "harness-evals/response.schema.json";
          return (
          (!canonicalHarnessSchema &&
            !file.startsWith("product-evals/tasks/agent-response/")) ||
          file.includes("\\") ||
          file.split("/").some((segment) => segment === "." || segment === "..")
          );
        },
      ) ||
      containsRecognizedInlineSecret(stableJson(action))
    ) {
      throw new CascadeError("agent invocation action is unsafe or unbounded");
    }
    return;
  }
  if (action.type !== "http-request") return;
  if (containsRecognizedInlineSecret(action.url)) {
    throw new CascadeError(PROHIBITED_INLINE_ACTION_MESSAGE);
  }
  try {
    const parsed = new URL(action.url);
    if ([...parsed.searchParams.keys()].some(isSensitiveHttpHeaderName)) {
      throw new CascadeError(PROHIBITED_INLINE_ACTION_MESSAGE);
    }
  } catch (error) {
    if (error instanceof CascadeError) throw error;
  }
  const seenSinks = new Set<string>();
  for (const [name, value] of Object.entries(action.headers ?? {})) {
    const sink = normalizedHttpSinkName(name);
    if (!sink || seenSinks.has(sink)) {
      throw new CascadeError(PROHIBITED_INLINE_ACTION_MESSAGE);
    }
    seenSinks.add(sink);
    assertHttpRequestValue(value, isSensitiveHttpHeaderName(sink));
  }
  if (action.body !== undefined) {
    assertHttpRequestValue(action.body, false);
    if (
      action.body.kind === "public-literal" &&
      containsSensitiveHttpBody(action.body.value)
    ) {
      throw new CascadeError(PROHIBITED_INLINE_ACTION_MESSAGE);
    }
  }
}

function canonicalHttpValue(value: HttpRequestValue): Record<string, string> {
  if (value.kind === "public-literal") {
    return { kind: value.kind, value: value.value };
  }
  return {
    kind: value.kind,
    reference_id: value.reference_id,
    immutable_version: value.immutable_version,
    ...(value.lease_id === undefined ? {} : { lease_id: value.lease_id }),
  };
}

export function canonicalActionBindingPayload(
  action: SimulationAction,
): Record<string, unknown> {
  assertSafeSimulationAction(action);
  if (action.type !== "http-request") {
    return { binding_version: ACTION_BINDING_VERSION, action };
  }
  return {
    binding_version: ACTION_BINDING_VERSION,
    action: {
      type: action.type,
      method: action.method,
      url: action.url,
      headers: Object.entries(action.headers ?? {})
        .map(([name, value]) => ({
          sink: normalizedHttpSinkName(name),
          value: canonicalHttpValue(value),
        }))
        .sort((left, right) => left.sink.localeCompare(right.sink)),
      ...(action.body === undefined
        ? {}
        : { body: { sink: "body", value: canonicalHttpValue(action.body) } }),
    },
  };
}

export function actionBindingDigest(action: SimulationAction): string {
  return sha256Text(stableJson(canonicalActionBindingPayload(action)));
}

export function taskPolicyActions(task: TaskDefinition): SimulationAction[] {
  if (task.driver.type === "direct-process") {
    return [{
      type: "process-exec",
      argv: task.command ?? [],
      ...(task.process === undefined ? {} : { process: task.process }),
    }];
  }
  if (task.driver.type === "http-client") {
    return [{
      type: "http-request",
      method: task.request!.method,
      url: task.request!.url,
      headers: task.request!.headers,
      body: task.request!.body,
    }];
  }
  if (task.driver.type === "pty" && task.terminal) {
    return [
      {
        type: "terminal-spawn",
        argv: task.command ?? [],
        terminal: {
          working_directory: task.terminal.working_directory,
          environment: task.terminal.environment,
          network: task.terminal.network,
          filesystem: task.terminal.filesystem,
          cols: task.terminal.cols,
          rows: task.terminal.rows,
          expected_exit_code: task.terminal.expected_exit_code,
        },
      },
      ...task.terminal.steps,
    ];
  }
  if (task.driver.type === "playwright") {
    return task.browser?.actions ?? [];
  }
  if (task.driver.type === "platform-automation") {
    return task.desktop?.actions ?? task.mobile?.actions ?? [];
  }
  if (task.driver.type === "agent-runtime" && task.agent) {
    return [{
      type: "agent-invoke",
      target_mode: task.agent.target.mode,
      runtime_provider: task.agent.runtime.provider,
      permission_profile: "read-only-network-deny",
      source_files: [...(task.inputs ?? [])],
    }];
  }
  return task.actions ?? [];
}

export interface TaskDefinition {
  schema_version: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  id: string;
  kind: TaskKind;
  driver: { type: DriverType; adapter?: string };
  required: boolean;
  timeout_ms: number;
  command?: string[];
  process?: DirectProcessDefinition;
  terminal?: TerminalTaskDefinition;
  browser?: BrowserTaskDefinition;
  desktop?: DesktopTaskDefinition;
  mobile?: MobileTaskDefinition;
  agent?: AgentTaskDefinition;
  request?: HttpRequestDefinition;
  actions?: TaskAction[];
  inputs?: string[];
  evidence?: string[];
  oracle_ids: string[];
  policy_ids?: string[];
}

export interface ClaimDefinition {
  schema_version: 1;
  id: string;
  class:
    | "authorship"
    | "execution"
    | "mechanical-behavior"
    | "semantic-quality"
    | "safety-compliance"
    | "coverage"
    | "release-eligibility";
  assertion: string;
  scope: Record<string, unknown>;
  population_authority: "none" | "persona-derived" | "estimated-prevalence";
  required_policy_ids: string[];
  required_oracle_ids: string[];
  required_metric_ids: string[];
  requires_calibration: boolean;
  evidence_requirements: string[];
}

export interface SimulationArtifactPolicy {
  schema_version: 1;
  artifact_root: ".artifacts/product-evals";
  storage_mode: "local-append-only";
  source_material_mode: "digest-and-minimized-metadata-only";
  raw_sensitive_material_allowed: false;
  encryption_at_rest: "host-filesystem-required";
  access_scope: "maintainers-only";
  operator_attestation: "required-for-restricted";
  retention: {
    mode: "manual-review";
    review_after_days: number;
    deletion_owner: string;
  };
  remote_storage: "disabled";
  export: "disabled";
}

export interface PolicyDefinition {
  schema_version: 2;
  id: string;
  version: string;
  effect: "ALLOW" | "DENY" | "REQUIRE_CONFIRMATION";
  scope: {
    campaign_ids: string[];
    task_ids: string[];
    task_kinds: string[];
    driver_types: string[];
    action_types: string[];
    action_paths?: string[];
    command_prefix?: string[];
    http_methods?: HttpMethod[];
    http_origins?: string[];
  };
  budgets: {
    required_dimensions: Array<
      "action_count" | "output_bytes" | "token_count" | "cost_usd"
    >;
    max_actions: number;
    max_output_bytes: number;
  };
  redaction_profile: "no-secrets-v1" | "source-code-v1";
  confirmation_authority?: {
    key_id: string;
    secret_env: string;
    allowed_confirmers: string[];
  };
  reason: string;
}

export interface PolicyObservation {
  campaign_id: string;
  task_id: string;
  task_kind: string;
  driver_type: string;
  action: SimulationAction;
}

export function policyAppliesToObservation(
  policy: PolicyDefinition,
  observation: PolicyObservation,
): boolean {
  const scope = policy.scope;
  if (!scope.campaign_ids.includes(observation.campaign_id)) return false;
  if (!scope.task_ids.includes(observation.task_id)) return false;
  if (!scope.task_kinds.includes(observation.task_kind)) return false;
  if (!scope.driver_types.includes(observation.driver_type)) return false;
  if (!scope.action_types.includes(observation.action.type)) return false;
  if (
    scope.action_paths &&
    (!("path" in observation.action) ||
      !observation.action.path ||
      !scope.action_paths.includes(observation.action.path))
  ) {
    return false;
  }
  if (
    scope.command_prefix &&
    (!("argv" in observation.action) ||
      !scope.command_prefix.every(
        (value, index) => observation.action.argv[index] === value,
      ))
  ) {
    return false;
  }
  if (
    scope.http_methods &&
    (!("method" in observation.action) ||
      !scope.http_methods.includes(observation.action.method))
  ) {
    return false;
  }
  if (scope.http_origins) {
    if (!("url" in observation.action)) return false;
    let origin: string;
    try {
      origin = new URL(observation.action.url).origin;
    } catch {
      return false;
    }
    if (!scope.http_origins.includes(origin)) return false;
  }
  return true;
}

export interface OracleDefinition {
  schema_version: 1;
  id: string;
  type:
    | "state-equals"
    | "exit-code"
    | "file-exists"
    | "task-file-exists"
    | "http-status";
  path?: string;
  expected?: unknown;
  expected_exit_code?: number;
  expected_status?: number;
  file?: string;
}

export interface ResolvedCampaign {
  path: string;
  campaign: CampaignDefinition;
  evaluationProfile: EvaluationProfileDefinition;
  rubric?: RubricDefinition;
  simulation: SimulationDefinition;
  populations: PopulationDefinition[];
  personaDerivations: ResolvedPersonaDerivation[];
  scenarios: ScenarioDefinition[];
  world: WorldDefinition;
  fixture: Record<string, unknown>;
  dataset: DatasetDefinition;
  metrics: MetricDefinition[];
  treatments: TreatmentDefinition[];
  calibration?: CalibrationDefinition;
  simulatedScores: ScoreRow[];
  referenceScores: ScoreRow[];
  tasks: TaskDefinition[];
  claims: ClaimDefinition[];
  artifactPolicy: SimulationArtifactPolicy;
  policies: PolicyDefinition[];
  oracles: OracleDefinition[];
  intake?: SimulationIntakeDefinition;
  seedBinding?: ResolvedSimulationSeedBinding;
  sourceFiles: string[];
  sourceDigests: Array<{ path: string; sha256: string }>;
}

const ID = /^[a-z0-9][a-z0-9.-]+$/;
const TASK_ID = /^[A-Z0-9][A-Z0-9-]+$/;
const DIGEST = /^[a-f0-9]{64}$/;

function objectValue(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new CascadeError(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function assertExactKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
  label: string,
): void {
  const allowedKeys = new Set(allowed);
  const unknown = Object.keys(value).filter((key) => !allowedKeys.has(key));
  if (unknown.length) {
    throw new CascadeError(
      `${label} has unknown fields: ${unknown.sort().join(", ")}`,
    );
  }
}

function requireString(
  value: Record<string, unknown>,
  key: string,
  label: string,
): string {
  const item = value[key];
  if (typeof item !== "string" || !item) {
    throw new CascadeError(`${label}.${key} must be a non-empty string`);
  }
  return item;
}

function requireArray<T = unknown>(
  value: Record<string, unknown>,
  key: string,
  label: string,
): T[] {
  const item = value[key];
  if (!Array.isArray(item)) {
    throw new CascadeError(`${label}.${key} must be an array`);
  }
  return item as T[];
}

function assertSchema(value: Record<string, unknown>, label: string): void {
  if (value.schema_version !== 1) {
    throw new CascadeError(`${label}.schema_version must be 1`);
  }
}

function assertId(id: string, label: string, pattern = ID): void {
  if (!pattern.test(id)) throw new CascadeError(`${label}.id is invalid: ${id}`);
}

function uniqueIds<T extends { id: string }>(items: T[], label: string): void {
  const seen = new Set<string>();
  for (const item of items) {
    if (seen.has(item.id)) throw new CascadeError(`duplicate ${label} id: ${item.id}`);
    seen.add(item.id);
  }
}

function uniqueStrings(items: string[], label: string): void {
  const seen = new Set<string>();
  for (const item of items) {
    if (typeof item !== "string" || !item) {
      throw new CascadeError(`${label} entries must be non-empty strings`);
    }
    if (seen.has(item)) throw new CascadeError(`duplicate ${label}: ${item}`);
    seen.add(item);
  }
}

async function loadFile<T>(
  file: string,
  prefix: string,
  validate: (value: Record<string, unknown>, label: string) => void,
): Promise<T> {
  const path = boundedPath(file, prefix);
  if (!(await isFile(path))) throw new CascadeError(`definition missing: ${file}`);
  const raw = objectValue(await readJson(path), file);
  validate(raw, file);
  return raw as T;
}

function validateCampaign(
  value: Record<string, unknown>,
  label: string,
): void {
  assertSchema(value, label);
  assertId(requireString(value, "id", label), label);
  requireString(value, "title", label);
  requireString(value, "purpose", label);
  if (!/^W-[0-9]{3}$/.test(requireString(value, "owner_lane", label))) {
    throw new CascadeError(`${label}.owner_lane must be W-NNN`);
  }
  const tiers = new Set([
    "deterministic-fixture",
    "controlled-integration",
    "platform-canary",
    "semantic-evaluation",
  ]);
  if (!tiers.has(requireString(value, "tier", label))) {
    throw new CascadeError(`${label}.tier is invalid`);
  }
  if (value.session !== undefined) {
    const session = objectValue(value.session, `${label}.session`);
    const keys = [
      "max_duration_ms",
      "max_step_duration_ms",
      "max_steps",
      "max_parallel_steps",
      "max_steps_per_episode",
      "max_surfaces",
      "max_checkpoint_bytes",
      "lease_ttl_ms",
    ] as const;
    const unknown = Object.keys(session).filter(
      (key) => !keys.includes(key as (typeof keys)[number]),
    );
    if (unknown.length) {
      throw new CascadeError(
        `${label}.session has unknown fields: ${unknown.sort().join(", ")}`,
      );
    }
    for (const key of keys) {
      if (!Number.isSafeInteger(session[key]) || Number(session[key]) < 1) {
        throw new CascadeError(`${label}.session.${key} must be a positive safe integer`);
      }
    }
    if (Number(session.max_steps) > 1_000_000) {
      throw new CascadeError(`${label}.session.max_steps exceeds 1000000`);
    }
    if (Number(session.max_parallel_steps) > 64) {
      throw new CascadeError(`${label}.session.max_parallel_steps exceeds 64`);
    }
    if (Number(session.max_surfaces) > 10_000) {
      throw new CascadeError(`${label}.session.max_surfaces exceeds 10000`);
    }
    if (
      Number(session.max_steps_per_episode) > 10_000
    ) {
      throw new CascadeError(`${label}.session episode bound exceeds 10000`);
    }
    if (
      Number(session.max_checkpoint_bytes) < 1_024 ||
      Number(session.max_checkpoint_bytes) > 10 * 1_024 * 1_024
    ) {
      throw new CascadeError(
        `${label}.session.max_checkpoint_bytes must be between 1024 and 10485760`,
      );
    }
    if (
      Number(session.lease_ttl_ms) < 1_000 ||
      Number(session.lease_ttl_ms) > 24 * 60 * 60 * 1_000
    ) {
      throw new CascadeError(
        `${label}.session.lease_ttl_ms must be between 1000 and 86400000`,
      );
    }
    if (Number(session.max_parallel_steps) > Number(session.max_steps)) {
      throw new CascadeError(
        `${label}.session.max_parallel_steps cannot exceed max_steps`,
      );
    }
    if (Number(session.max_steps_per_episode) > Number(session.max_steps)) {
      throw new CascadeError(
        `${label}.session.max_steps_per_episode cannot exceed max_steps`,
      );
    }
    if (Number(session.max_step_duration_ms) > Number(session.max_duration_ms)) {
      throw new CascadeError(
        `${label}.session.max_step_duration_ms cannot exceed max_duration_ms`,
      );
    }
  }
  requireString(value, "evaluation_profile_file", label);
  const simulationFile = requireString(value, "simulation_file", label);
  const intakeFile = value.intake_file === undefined
    ? undefined
    : requireString(value, "intake_file", label);
  const simulationScope = validateCampaignIntakePathScope(simulationFile, intakeFile, label);
  if (simulationScope === "product") {
    if (value.specialized_evaluation !== null) {
      throw new CascadeError(`${label} product campaign must set specialized_evaluation to null`);
    }
  } else {
    const declaration = objectValue(
      value.specialized_evaluation,
      `${label}.specialized_evaluation`,
    );
    assertExactKeys(
      declaration,
      ["applicability", "route_ids", "trace_ids", "claim_ids", "reason"],
      `${label}.specialized_evaluation`,
    );
    if (!new Set(["REQUIRED", "NOT_APPLICABLE"]).has(String(declaration.applicability))) {
      throw new CascadeError(`${label}.specialized_evaluation.applicability is invalid`);
    }
    const routeIds = requireArray<string>(declaration, "route_ids", `${label}.specialized_evaluation`);
    const traceIds = requireArray<string>(declaration, "trace_ids", `${label}.specialized_evaluation`);
    const claimIds = requireArray<string>(declaration, "claim_ids", `${label}.specialized_evaluation`);
    uniqueStrings(routeIds, `${label}.specialized_evaluation.route_ids`);
    uniqueStrings(traceIds, `${label}.specialized_evaluation.trace_ids`);
    uniqueStrings(claimIds, `${label}.specialized_evaluation.claim_ids`);
    requireString(declaration, "reason", `${label}.specialized_evaluation`);
    if (
      declaration.applicability === "REQUIRED" &&
      (!routeIds.length || !traceIds.length || !claimIds.length)
    ) {
      throw new CascadeError(
        `${label} REQUIRED specialized evaluation needs exact route_ids, trace_ids, and claim_ids`,
      );
    }
    if (
      declaration.applicability === "NOT_APPLICABLE" &&
      (routeIds.length || traceIds.length || claimIds.length)
    ) {
      throw new CascadeError(
        `${label} NOT_APPLICABLE specialized evaluation must use empty route_ids, trace_ids, and claim_ids`,
      );
    }
  }
  const seedBindingFile = value.seed_binding_file === undefined
    ? undefined
    : requireString(value, "seed_binding_file", label);
  validateCampaignSeedBindingScope(simulationScope, seedBindingFile, label);
  for (const key of [
    "task_files",
    "claim_files",
    "policy_files",
    "oracle_files",
  ]) {
    uniqueStrings(requireArray<string>(value, key, label), `${label}.${key}`);
  }
  if (!requireArray(value, "task_files", label).length) {
    throw new CascadeError(`${label}.task_files must not be empty`);
  }
  if (!requireArray(value, "claim_files", label).length) {
    throw new CascadeError(`${label}.claim_files must not be empty`);
  }
  if (!requireArray(value, "oracle_files", label).length) {
    throw new CascadeError(`${label}.oracle_files must not be empty`);
  }
}

export function validateSimulationSeedBinding(
  value: Record<string, unknown>,
  label: string,
): void {
  assertJsonSchema(value, SIMULATION_SEED_BINDING_SCHEMA, label);
  const mappings = value.mappings as Array<Record<string, unknown>>;
  uniqueStrings(
    mappings.map((mapping) => requireString(mapping, "source_claim_id", label)),
    `${label}.source_claim_id`,
  );
  for (const mapping of mappings) {
    const disposition = requireString(mapping, "disposition", label);
    const campaignClaimIds = requireArray<string>(mapping, "campaign_claim_ids", label);
    const scenarioIds = requireArray<string>(mapping, "scenario_ids", label);
    const taskIds = requireArray<string>(mapping, "task_ids", label);
    if (disposition === "SEEDED") {
      if (!campaignClaimIds.length || (!scenarioIds.length && !taskIds.length)) {
        throw new CascadeError(`${label} SEEDED mapping requires campaign_claim_ids and at least one scenario_id or task_id`);
      }
    } else if (campaignClaimIds.length || scenarioIds.length || taskIds.length ||
      typeof mapping.rationale !== "string" || !mapping.rationale.trim()) {
      throw new CascadeError(`${label} ${disposition} mapping forbids targets and requires a nonempty rationale`);
    }
  }
  if (value.status === "READY" && !mappings.some((mapping) => mapping.disposition === "SEEDED")) {
    throw new CascadeError(`${label} READY seed binding requires at least one SEEDED mapping`);
  }
}

export async function readBoundedSimulationSeedBinding(
  file: string,
  label = `simulation seed binding ${file}`,
  options: Pick<BoundedRegularFileOptions, "readCheckpoint"> = {},
): Promise<ResolvedSimulationSeedBinding> {
  validateSimulationSeedBindingPath(file, label);
  const path = boundedPath(
    file,
    "product-evals/intakes/product/seed-bindings/",
  );
  const bytes = await readBoundedRegularFile(path, label, {
    maxBytes: MAX_SIMULATION_SEED_BINDING_BYTES,
    physicalRoot: SIMULATION_SEED_BINDING_ROOT,
    readCheckpoint: options.readCheckpoint,
  });
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new CascadeError(`${label} is not valid UTF-8`);
  }
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new CascadeError(`${label} is not valid JSON`);
  }
  const definition = objectValue(value, label);
  validateSimulationSeedBinding(definition, label);
  return {
    path: file,
    sha256: sha256Buffer(bytes),
    definition: definition as unknown as SimulationSeedBindingDefinition,
  };
}

export function buildSimulationSeedBindingProjection(
  resolved: ResolvedSimulationSeedBinding,
): NonNullable<SimulationIntakeDefinition["seed_binding"]> {
  return {
    path: resolved.path,
    sha256: resolved.sha256,
    id: resolved.definition.id,
    status: resolved.definition.status,
    campaign_id: resolved.definition.campaign_id,
    campaign_sha256: resolved.definition.campaign_sha256,
    source: structuredClone(resolved.definition.source),
    mappings: structuredClone(resolved.definition.mappings),
  };
}

function unknownReferences(values: string[], known: Set<string>): string[] {
  return values.filter((value) => !known.has(value)).sort();
}

export function simulationSeedBindingBlockers(input: {
  binding: SimulationSeedBindingDefinition;
  campaignId: string;
  campaignSha256: string;
  envelope: TaskEnvelope;
  campaignClaimIds: Set<string>;
  scenarioIds: Set<string>;
  taskIds: Set<string>;
}): string[] {
  const blockers: string[] = [];
  const { binding, envelope } = input;
  if (binding.status !== "READY") blockers.push(`seed binding ${binding.id} is not READY`);
  if (binding.campaign_id !== input.campaignId) blockers.push(`seed binding campaign identity is mismatched`);
  if (binding.campaign_sha256 !== input.campaignSha256) blockers.push(`seed binding campaign digest is stale or mismatched`);
  if (binding.source.task_envelope_id !== envelope.envelope_id ||
    binding.source.task_envelope_revision !== envelope.revision ||
    binding.source.request_digest !== envelope.request_digest ||
    binding.source.source_digest !== envelope.source_digest) {
    blockers.push("seed binding Task Envelope source identity or digest is stale or mismatched");
  }
  const activeClaimIds = envelope.claims
    .filter((claim) => claim.status !== "SUPERSEDED")
    .map((claim) => claim.claim_id)
    .sort();
  const mappedClaimIds = binding.mappings.map((mapping) => mapping.source_claim_id).sort();
  if (stableJson(activeClaimIds) !== stableJson(mappedClaimIds)) {
    blockers.push("seed binding must map every active Task Envelope claim exactly once by source_claim_id");
  }
  if (!binding.mappings.some((mapping) => mapping.disposition === "SEEDED")) {
    blockers.push("seed binding requires at least one SEEDED mapping");
  }
  for (const mapping of binding.mappings) {
    const unknownClaims = unknownReferences(mapping.campaign_claim_ids, input.campaignClaimIds);
    const unknownScenarios = unknownReferences(mapping.scenario_ids, input.scenarioIds);
    const unknownTasks = unknownReferences(mapping.task_ids, input.taskIds);
    if (unknownClaims.length) blockers.push(`${mapping.source_claim_id} references unknown campaign claims: ${unknownClaims.join(", ")}`);
    if (unknownScenarios.length) blockers.push(`${mapping.source_claim_id} references unknown scenarios: ${unknownScenarios.join(", ")}`);
    if (unknownTasks.length) blockers.push(`${mapping.source_claim_id} references unknown tasks: ${unknownTasks.join(", ")}`);
  }
  return [...new Set(blockers)].sort();
}

export function validateSimulationIntake(
  value: Record<string, unknown>,
  label: string,
): void {
  if ([1, 2, 3, 4, 5].includes(Number(value.schema_version)) && value.artifact_type === "cascade-simulation-intake") {
    throw new CascadeError(`${label} simulation intake schema v${value.schema_version} is unsupported; recompile or migrate to schema v6 with safe action bindings`);
  }
  if (value.seed_binding !== null && value.seed_binding !== undefined) {
    const seedBinding = objectValue(value.seed_binding, `${label}.seed_binding`);
    if (typeof seedBinding.path === "string") {
      validateSimulationSeedBindingPath(
        seedBinding.path,
        `${label}.seed_binding.path`,
      );
    }
  }
  assertJsonSchema(value, SIMULATION_INTAKE_SCHEMA, label);
  if (!/^SI-[a-f0-9]{16}$/.test(requireString(value, "id", label))) {
    throw new CascadeError(`${label}.id is invalid`);
  }
  if (!new Set(["DRAFT", "READY", "BLOCKED"]).has(requireString(value, "status", label))) {
    throw new CascadeError(`${label}.status is invalid`);
  }
  const scope = requireString(value, "scope", label);
  if (!new Set(["harness", "product"]).has(scope)) {
    throw new CascadeError(`${label}.scope is invalid`);
  }
  assertId(requireString(value, "campaign_id", label), `${label}.campaign_id`);
  if (parseRfc3339Instant(requireString(value, "produced_at", label)) === null) {
    throw new CascadeError(`${label}.produced_at is invalid`);
  }
  for (const key of ["claims", "tasks", "blockers", "gaps", "invalidation"] as const) {
    requireArray(value, key, label);
  }
  if (value.status === "READY" && value.blockers instanceof Array && value.blockers.length) {
    throw new CascadeError(`${label} READY intake cannot contain blockers`);
  }
  if (value.status === "READY" && !value.task_envelope) {
    throw new CascadeError(`${label} READY intake requires a task envelope`);
  }
  if (value.scope === "product" && value.status === "READY" && !value.product_context) {
    throw new CascadeError(`${label} READY product intake requires product context`);
  }
  if (value.scope === "product" && value.status === "READY" && !value.seed_binding) {
    throw new CascadeError(`${label} READY product intake requires an authored seed binding`);
  }
  if (value.scope === "harness" && value.product_context !== null) {
    throw new CascadeError(`${label} harness intake cannot bind product context`);
  }
  if (value.scope === "harness" && value.seed_binding !== null) {
    throw new CascadeError(`${label} harness intake cannot bind a product seed artifact`);
  }
  if (value.task_envelope !== null) {
    const envelope = objectValue(value.task_envelope, `${label}.task_envelope`);
    const envelopeId = requireString(envelope, "envelope_id", label);
    const envelopePath = requireString(envelope, "path", label);
    if (envelopePath !== `product-evals/intakes/${scope}/task-envelopes/${envelopeId}.json`) {
      throw new CascadeError(`${label}.task_envelope.path is outside the intake source boundary`);
    }
    if (!/^TE-[a-f0-9]{16}$/.test(envelopeId) ||
      !Number.isInteger(envelope.revision) || Number(envelope.revision) < 1 ||
      !DIGEST.test(requireString(envelope, "sha256", label)) ||
      !DIGEST.test(requireString(envelope, "request_digest", label)) ||
      !DIGEST.test(requireString(envelope, "derivation_input_digest", label)) ||
      envelope.provenance_version !== 2 ||
      !new Set(["TRUSTED_SOURCE_SEGMENTS", "LEXICAL_FALLBACK"]).has(requireString(envelope, "provenance_mode", label)) ||
      !DIGEST.test(requireString(envelope, "source_segments_digest", label)) ||
      (envelope.source_digest !== null && !DIGEST.test(requireString(envelope, "source_digest", label))) ||
      (envelope.expected_request_digest !== null && !DIGEST.test(requireString(envelope, "expected_request_digest", label))) ||
      (envelope.expected_source_digest !== null && !DIGEST.test(requireString(envelope, "expected_source_digest", label)))) {
      throw new CascadeError(`${label}.task_envelope binding is invalid`);
    }
    if (envelope.provenance_mode === "TRUSTED_SOURCE_SEGMENTS") {
      const attestation = objectValue(envelope.direct_user_attestation, `${label}.task_envelope.direct_user_attestation`);
      if (attestation.schema_version !== 1 ||
        requireString(attestation, "request_digest", label) !== envelope.request_digest ||
        requireString(attestation, "source_segments_digest", label) !== envelope.source_segments_digest) {
        throw new CascadeError(`${label}.task_envelope direct-user attestation binding is invalid`);
      }
    } else if (envelope.direct_user_attestation !== null) {
      throw new CascadeError(`${label}.task_envelope lexical provenance cannot bind a direct-user attestation`);
    }
    if (value.status === "READY" && (envelope.expected_request_digest === null || envelope.expected_source_digest === null || envelope.source_digest === null || envelope.request_digest !== envelope.expected_request_digest || envelope.source_digest !== envelope.expected_source_digest)) {
      throw new CascadeError(`${label} READY intake requires exact persisted request and source bindings`);
    }
  }
  if (value.product_context !== null) {
    const context = objectValue(value.product_context, `${label}.product_context`);
    if (!/^docs\/specs\/.+\/brief\.yaml$/.test(requireString(context, "brief_path", label)) ||
      !/^PB-[0-9]{3}$/.test(requireString(context, "brief_id", label)) ||
      !DIGEST.test(requireString(context, "sha256", label)) ||
      !/^docs\/specs\/.+\/brief\.generated\.md$/.test(requireString(context, "output_path", label)) ||
      !DIGEST.test(requireString(context, "output_sha256", label))) {
      throw new CascadeError(`${label}.product_context binding is invalid`);
    }
  }
  if (value.seed_binding !== null) {
    const seedBinding = objectValue(value.seed_binding, `${label}.seed_binding`);
    const source = objectValue(seedBinding.source, `${label}.seed_binding.source`);
    const mappings = requireArray<Record<string, unknown>>(seedBinding, "mappings", label);
    uniqueStrings(mappings.map((mapping) => requireString(mapping, "source_claim_id", label)), `${label}.seed_binding.source_claim_id`);
    for (const mapping of mappings) {
      const disposition = requireString(mapping, "disposition", label);
      const campaignClaimIds = requireArray<string>(mapping, "campaign_claim_ids", label);
      const scenarioIds = requireArray<string>(mapping, "scenario_ids", label);
      const taskIds = requireArray<string>(mapping, "task_ids", label);
      if (disposition === "SEEDED") {
        if (!campaignClaimIds.length || (!scenarioIds.length && !taskIds.length)) {
          throw new CascadeError(`${label} SEEDED mapping requires campaign_claim_ids and at least one scenario_id or task_id`);
        }
      } else if (campaignClaimIds.length || scenarioIds.length || taskIds.length ||
        typeof mapping.rationale !== "string" || !mapping.rationale.trim()) {
        throw new CascadeError(`${label} ${disposition} mapping forbids targets and requires a nonempty rationale`);
      }
    }
    if (value.status === "READY") {
      if (seedBinding.status !== "READY") {
        throw new CascadeError(`${label} READY intake requires a READY seed binding`);
      }
      const envelope = objectValue(value.task_envelope, `${label}.task_envelope`);
      if (source.task_envelope_id !== envelope.envelope_id ||
        source.task_envelope_revision !== envelope.revision ||
        source.request_digest !== envelope.request_digest ||
        source.source_digest !== envelope.source_digest) {
        throw new CascadeError(`${label} READY intake seed source binding is stale or mismatched`);
      }
      const intakeSourceClaimIds = (value.claims as Array<Record<string, unknown>>)
        .map((claim) => requireString(claim, "source_claim_id", label))
        .sort();
      const mappedSourceClaimIds = mappings
        .map((mapping) => requireString(mapping, "source_claim_id", label))
        .sort();
      if (stableJson(intakeSourceClaimIds) !== stableJson(mappedSourceClaimIds)) {
        throw new CascadeError(`${label} READY seed binding must map every intake claim exactly once`);
      }
      if (!mappings.some((mapping) => mapping.disposition === "SEEDED")) {
        throw new CascadeError(`${label} READY seed binding requires at least one SEEDED mapping`);
      }
    }
  }
  const claims = value.claims as Array<Record<string, unknown>>;
  uniqueStrings(claims.map((claim) => requireString(claim, "claim_id", label)), `${label}.claim_id`);
  uniqueStrings(claims.map((claim) => requireString(claim, "source_claim_id", label)), `${label}.source_claim_id`);
  for (const claim of claims) {
    const kind = requireString(claim, "kind", label);
    const source = requireString(claim, "source", label);
    if (!new Set(["OUTCOME", "CURRENT_STATE", "CRITERION", "CONSTRAINT", "NON_GOAL", "BOUNDARY", "HAZARD", "AUTHORITY", "EVIDENCE", "INFERENCE"]).has(kind)) {
      throw new CascadeError(`${label} claim kind is invalid`);
    }
    if (!new Set(["USER", "TRUSTED_INSTRUCTION", "CURRENT_SOURCE", "TOOL_EVIDENCE", "EXTERNAL_SOURCE", "MODEL_INFERENCE"]).has(source)) {
      throw new CascadeError(`${label} claim source is invalid`);
    }
    if (!new Set(["PROVIDED", "VERIFIED", "INFERRED", "UNKNOWN", "CONFLICTING"]).has(requireString(claim, "status", label))) {
      throw new CascadeError(`${label} claim status is invalid`);
    }
    const policyTags = requireArray<string>(claim, "policy_tags", label);
    uniqueStrings(policyTags, `${label}.claim policy tags`);
    if (value.status === "READY" && ["EXTERNAL_SOURCE", "MODEL_INFERENCE"].includes(source) && (kind === "AUTHORITY" || policyTags.some((tag) => tag.startsWith("requested-")))) {
      throw new CascadeError(`${label} READY intake cannot treat unproven external or inferred claim provenance as authority`);
    }
  }
  const tasks = value.tasks as Array<Record<string, unknown>>;
  uniqueStrings(tasks.map((task) => requireString(task, "task_id", label)), `${label}.task_id`);
  for (const task of tasks) {
    requireString(task, "task_id", label);
    const declaredPolicyIds = requireArray<string>(task, "declared_policy_ids", label);
    const applicablePolicyIds = requireArray<string>(task, "applicable_policy_ids", label);
    uniqueStrings(declaredPolicyIds, `${label}.declared_policy_ids`);
    uniqueStrings(applicablePolicyIds, `${label}.applicable_policy_ids`);
    if (value.status === "READY" && stableJson([...declaredPolicyIds].sort()) !== stableJson([...applicablePolicyIds].sort())) {
      throw new CascadeError(`${label} READY intake declared and applicable policy sets differ`);
    }
    const actions = requireArray<Record<string, unknown>>(task, "actions", label);
    const actionIndexes = actions.map((action) => Number(action.action_index));
    if (new Set(actionIndexes).size !== actionIndexes.length) {
      throw new CascadeError(`${label} action indexes contain duplicates`);
    }
    const actionPolicyIds = new Set<string>();
    for (const action of actions) {
      if (!Number.isInteger(action.action_index) || Number(action.action_index) < 0 ||
        action.action_binding_version !== ACTION_BINDING_VERSION ||
        !DIGEST.test(requireString(action, "action_binding_digest", label))) {
        throw new CascadeError(`${label} action binding is invalid`);
      }
      const actionApplicablePolicyIds = requireArray<string>(action, "applicable_policy_ids", label);
      uniqueStrings(actionApplicablePolicyIds, `${label}.action policies`);
      actionApplicablePolicyIds.forEach((id) => actionPolicyIds.add(id));
      const policyDigests = requireArray<string>(action, "policy_digests", label);
      if (policyDigests.length !== actionApplicablePolicyIds.length || policyDigests.some((digest) => !DIGEST.test(digest))) {
        throw new CascadeError(`${label} action policy digest is invalid`);
      }
      const decision = requireString(action, "decision", label);
      if (!new Set(["ALLOW", "DENY", "REQUIRE_CONFIRMATION", "GAP", "AMBIGUOUS"]).has(decision)) {
        throw new CascadeError(`${label} action decision is invalid`);
      }
      if (value.status === "READY" && !new Set(["ALLOW", "REQUIRE_CONFIRMATION"]).has(decision)) {
        throw new CascadeError(`${label} READY intake contains a blocking action decision`);
      }
    }
    if (value.status === "READY" && stableJson([...actionPolicyIds].sort()) !== stableJson([...applicablePolicyIds].sort())) {
      throw new CascadeError(`${label} READY intake action and task policy sets differ`);
    }
  }
  if (value.status === "READY") {
    const { id: _id, ...seed } = value;
    if (value.id !== `SI-${sha256Text(stableJson(seed)).slice(0, 16)}`) {
      throw new CascadeError(`${label} READY intake identity is stale or mismatched`);
    }
  }
}

export const MAX_TASK_ENVELOPE_SNAPSHOT_BYTES = 1024 * 1024;

function sha256Buffer(value: Uint8Array): string {
  const hasher = new Bun.CryptoHasher("sha256");
  hasher.update(value);
  return hasher.digest("hex");
}

export async function readBoundedTaskEnvelopeSnapshot(
  path: string,
  label = "Task Envelope snapshot",
): Promise<{ envelope: TaskEnvelope; sha256: string }> {
  const bytes = await readBoundedRegularFile(path, label, {
    maxBytes: MAX_TASK_ENVELOPE_SNAPSHOT_BYTES,
  });
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new CascadeError(`${label} is not valid UTF-8`);
  }
  let envelope: unknown;
  try {
    envelope = JSON.parse(text);
  } catch {
    throw new CascadeError(`${label} is not valid JSON`);
  }
  validateTaskEnvelope(envelope);
  return { envelope, sha256: sha256Buffer(bytes) };
}

export async function validateReadySimulationIntakeEnvelopeBinding(
  intake: SimulationIntakeDefinition,
): Promise<void> {
  if (intake.status !== "READY" || !intake.task_envelope) {
    throw new CascadeError(`${intake.id} is not a READY intake with a Task Envelope binding`);
  }
  const envelope = intake.task_envelope;
  const envelopePath = boundedPath(envelope.path, `product-evals/intakes/${intake.scope}/task-envelopes/`);
  let current: { envelope: TaskEnvelope; sha256: string };
  try {
    current = await readBoundedTaskEnvelopeSnapshot(envelopePath, `${intake.id} Task Envelope snapshot`);
  } catch (error) {
    throw new CascadeError(`${intake.id} task envelope binding is stale or unsafe: ${error instanceof Error ? error.message : "unknown snapshot failure"}`);
  }
  if (current.sha256 !== envelope.sha256) {
    throw new CascadeError(`${intake.id} task envelope binding is stale`);
  }
  const currentEnvelope = current.envelope;
  try {
    validateTaskEnvelope(currentEnvelope, {
      expected_request_digest: envelope.expected_request_digest ?? undefined,
      expected_source_digest: envelope.expected_source_digest ?? undefined,
      require_source_digest: true,
    });
  } catch (error) {
    throw new CascadeError(`${intake.id} current Task Envelope admission binding is invalid: ${error instanceof Error ? error.message : "unknown validation failure"}`);
  }
  if (currentEnvelope.envelope_id !== envelope.envelope_id || currentEnvelope.revision !== envelope.revision || currentEnvelope.request_digest !== envelope.request_digest || currentEnvelope.source_digest !== envelope.source_digest || currentEnvelope.derivation_input_digest !== envelope.derivation_input_digest || currentEnvelope.derivation_input.provenance_version !== envelope.provenance_version || currentEnvelope.derivation_input.provenance_mode !== envelope.provenance_mode || currentEnvelope.derivation_input.source_segments_digest !== envelope.source_segments_digest || stableJson(currentEnvelope.derivation_input.direct_user_attestation) !== stableJson(envelope.direct_user_attestation)) {
    throw new CascadeError(`${intake.id} task envelope snapshot identity is stale or mismatched`);
  }
  const expectedClaims = currentEnvelope.claims.filter((claim) => claim.status !== "SUPERSEDED").map((claim, index) => ({
    claim_id: `SIC-${String(index + 1).padStart(3, "0")}`,
    source_claim_id: claim.claim_id,
    kind: claim.kind,
    source: claim.source,
    statement: claim.statement,
    status: claim.status,
    policy_tags: [...new Set(claim.policy_tags)].sort(),
  }));
  if (stableJson(intake.claims) !== stableJson(expectedClaims)) {
    throw new CascadeError(`${intake.id} intake claims are not the exact active Task Envelope claim provenance projection`);
  }
}

export async function validateReadySimulationIntakeProductContextBinding(
  intake: SimulationIntakeDefinition,
): Promise<void> {
  if (intake.status !== "READY" || intake.scope !== "product" || !intake.product_context) {
    throw new CascadeError(`${intake.id} is not a READY product intake with product context`);
  }
  const context = intake.product_context;
  let current: Awaited<ReturnType<typeof resolveCurrentBriefProjection>>;
  try {
    current = await resolveCurrentBriefProjection(context.brief_path);
  } catch (error) {
    throw new CascadeError(
      `${intake.id} product context binding is stale or unsafe: ${
        error instanceof Error ? error.message : "unknown brief resolution failure"
      }`,
    );
  }
  if (!new Set(["reviewed", "approved"]).has(current.resolved.manifest.status)) {
    throw new CascadeError(
      `${intake.id} current product brief ${current.resolved.manifest.brief_id} is not reviewed or approved`,
    );
  }
  if (current.currentOutput !== current.generated) {
    throw new CascadeError(
      `${intake.id} current product brief projection is stale`,
    );
  }
  if (stableJson(context) !== stableJson(current.binding)) {
    throw new CascadeError(
      `${intake.id} product context binding is stale or mismatched`,
    );
  }
}

function validateEvaluationProfile(
  value: Record<string, unknown>,
  label: string,
): void {
  assertSchema(value, label);
  assertId(requireString(value, "id", label), label);
  const provider = requireString(value, "provider", label);
  if (!new Set(["fixture", "codex"]).has(provider)) {
    throw new CascadeError(`${label}.provider is invalid`);
  }
  if (
    !Number.isInteger(value.timeout_ms) ||
    (value.timeout_ms as number) < 1000 ||
    (value.timeout_ms as number) > 600000
  ) {
    throw new CascadeError(`${label}.timeout_ms must be between 1000 and 600000`);
  }
  if (provider === "codex") {
    requireString(value, "model", label);
    const effort = requireString(value, "reasoning_effort", label);
    if (!new Set(["low", "medium", "high", "xhigh"]).has(effort)) {
      throw new CascadeError(`${label}.reasoning_effort is invalid`);
    }
    requireString(value, "rubric_file", label);
  } else if (
    value.model !== undefined ||
    value.reasoning_effort !== undefined ||
    value.rubric_file !== undefined
  ) {
    throw new CascadeError(
      `${label} fixture provider must not declare model, reasoning_effort, or rubric_file`,
    );
  }
}

function validateRubric(
  value: Record<string, unknown>,
  label: string,
): void {
  assertSchema(value, label);
  assertId(requireString(value, "id", label), label);
  const criteria = requireArray<string>(value, "criteria", label);
  if (!criteria.length) throw new CascadeError(`${label}.criteria must not be empty`);
  uniqueStrings(criteria, `${label}.criteria`);
  requireString(value, "judge_profile", label);
  if (typeof value.human_calibration_required !== "boolean") {
    throw new CascadeError(`${label}.human_calibration_required must be boolean`);
  }
}

export function validateSimulation(
  value: Record<string, unknown>,
  label: string,
): void {
  assertSchema(value, label);
  const id = requireString(value, "id", label);
  assertId(id, label);
  const simulationScope = requireString(value, "simulation_scope", label);
  if (!new Set(["harness", "product"]).has(simulationScope)) {
    throw new CascadeError(`${label}.simulation_scope is invalid`);
  }
  const simulationRoot = `product-evals/simulations/${simulationScope}/${id}`;
  if (label !== `${simulationRoot}/manifest.json`) {
    throw new CascadeError(
      `${label}.simulation_scope path mismatch: expected ${simulationRoot}/manifest.json`,
    );
  }
  requireString(value, "title", label);
  for (const key of ["population_files", "scenario_files"]) {
    const values = requireArray<string>(value, key, label);
    if (!values.length) throw new CascadeError(`${label}.${key} must not be empty`);
    uniqueStrings(values, `${label}.${key}`);
    const subdirectory = key === "population_files" ? "populations" : "scenarios";
    for (const file of values) {
      if (!file.startsWith(`${simulationRoot}/${subdirectory}/`)) {
        throw new CascadeError(
          `${label}.${key} must stay inside ${simulationRoot}/${subdirectory}/`,
        );
      }
    }
  }
  for (const key of ["metric_files", "treatment_files"]) {
    const values = requireArray<string>(value, key, label);
    if (!values.length) throw new CascadeError(`${label}.${key} must not be empty`);
    uniqueStrings(values, `${label}.${key}`);
  }
  const worldFile = requireString(value, "world_file", label);
  if (!worldFile.startsWith(`${simulationRoot}/worlds/`)) {
    throw new CascadeError(`${label}.world_file must stay inside ${simulationRoot}/worlds/`);
  }
  const datasetFile = requireString(value, "dataset_file", label);
  if (!datasetFile.startsWith(`${simulationRoot}/datasets/`)) {
    throw new CascadeError(`${label}.dataset_file must stay inside ${simulationRoot}/datasets/`);
  }
}

export function validateSimulationCalibrationAuthority(
  simulation: SimulationDefinition,
  calibration: CalibrationDefinition | undefined,
): void {
  if (
    simulation.simulation_scope === "harness" &&
    calibration !== undefined &&
    !calibration.framework_fixture
  ) {
    throw new CascadeError(
      `${simulation.id} harness simulation cannot bind non-framework calibration`,
    );
  }
}

export function validatePopulation(
  value: Record<string, unknown>,
  label: string,
): void {
  if (value.schema_version === 2) {
    validatePersonaDerivedPopulation(value, label);
    return;
  }
  assertSchema(value, label);
  assertId(requireString(value, "id", label), label);
  const source = objectValue(value.source, `${label}.source`);
  const sourceKinds = new Set([
    "synthetic",
    "expert-authored",
    "production-derived",
  ]);
  if (!sourceKinds.has(requireString(source, "kind", `${label}.source`))) {
    throw new CascadeError(`${label}.source.kind is invalid`);
  }
  requireString(source, "description", `${label}.source`);
  if (source.kind === "production-derived") {
    requireString(source, "reference_window", `${label}.source`);
    if (source.minimized !== true) {
      throw new CascadeError(
        `${label}.source.minimized must be true for production-derived data`,
      );
    }
  }
  const actors = requireArray<Record<string, unknown>>(value, "actors", label);
  if (!actors.length) throw new CascadeError(`${label}.actors must not be empty`);
  const actorIds = new Set<string>();
  let totalWeight = 0;
  for (const [index, actor] of actors.entries()) {
    const actorLabel = `${label}.actors[${index}]`;
    const id = requireString(actor, "id", actorLabel);
    assertId(id, actorLabel);
    if (actorIds.has(id)) throw new CascadeError(`duplicate actor id: ${id}`);
    actorIds.add(id);
    const weight = actor.weight;
    if (typeof weight !== "number" || !Number.isFinite(weight) || weight <= 0) {
      throw new CascadeError(`${actorLabel}.weight must be positive`);
    }
    totalWeight += weight;
    objectValue(actor.behavior, `${actorLabel}.behavior`);
    const slices = requireArray<string>(actor, "slices", actorLabel);
    if (!slices.length) throw new CascadeError(`${actorLabel}.slices is empty`);
    uniqueStrings(slices, `${actorLabel}.slices`);
  }
  if (Math.abs(totalWeight - 1) > 1e-9) {
    throw new CascadeError(`${label}.actors weights must sum to 1`);
  }
}

function validateScenario(
  value: Record<string, unknown>,
  label: string,
): void {
  assertSchema(value, label);
  assertId(requireString(value, "id", label), label);
  requireString(value, "goal", label);
  objectValue(value.initial_state, `${label}.initial_state`);
  for (const key of ["actor_ids", "stop_conditions", "claim_ids"]) {
    const items = requireArray<string>(value, key, label);
    if (!items.length) throw new CascadeError(`${label}.${key} must not be empty`);
    uniqueStrings(items, `${label}.${key}`);
  }
}

function validateWorld(value: Record<string, unknown>, label: string): void {
  assertSchema(value, label);
  assertId(requireString(value, "id", label), label);
  requireString(value, "fixture_file", label);
  const actions = requireArray<string>(value, "allowed_actions", label);
  const validActions = new Set(["assert", "set", "increment", "deny", "fail"]);
  if (!actions.length || actions.some((item) => !validActions.has(item))) {
    throw new CascadeError(`${label}.allowed_actions is invalid`);
  }
  uniqueStrings(actions, `${label}.allowed_actions`);
  const negative = requireArray<string>(value, "negative_behaviors", label);
  if (!negative.length) {
    throw new CascadeError(`${label}.negative_behaviors must not be empty`);
  }
  uniqueStrings(negative, `${label}.negative_behaviors`);
  const cleanup = objectValue(value.cleanup, `${label}.cleanup`);
  if (cleanup.reset_to_fixture !== true) {
    throw new CascadeError(`${label}.cleanup.reset_to_fixture must be true`);
  }
}

export function validateDataset(
  value: Record<string, unknown>,
  label: string,
): void {
  assertSchema(value, label);
  assertId(requireString(value, "id", label), label);
  if (value.leakage_policy !== "exclusive-case-identity") {
    throw new CascadeError(`${label}.leakage_policy is invalid`);
  }
  const cases = requireArray<Record<string, unknown>>(value, "cases", label);
  if (!cases.length) throw new CascadeError(`${label}.cases must not be empty`);
  const caseIds = new Set<string>();
  const partitions = new Set([
    "development",
    "regression",
    "holdout",
    "calibration-reference",
  ]);
  for (const [index, item] of cases.entries()) {
    const caseLabel = `${label}.cases[${index}]`;
    const id = requireString(item, "id", caseLabel);
    assertId(id, caseLabel);
    if (caseIds.has(id)) {
      throw new CascadeError(
        `${label} leaks case identity ${id} across partitions`,
      );
    }
    caseIds.add(id);
    requireString(item, "scenario_id", caseLabel);
    requireString(item, "actor_id", caseLabel);
    if (!partitions.has(requireString(item, "partition", caseLabel))) {
      throw new CascadeError(`${caseLabel}.partition is invalid`);
    }
  }
  const presentPartitions = new Set(cases.map((item) => item.partition));
  const missingPartitions = [...partitions].filter(
    (partition) => !presentPartitions.has(partition),
  );
  if (missingPartitions.length) {
    throw new CascadeError(
      `${label} missing required partitions: ${missingPartitions.join(", ")}`,
    );
  }
}

function validateMetric(value: Record<string, unknown>, label: string): void {
  assertSchema(value, label);
  assertId(requireString(value, "id", label), label);
  if (!new Set(["deterministic", "semantic", "business"]).has(String(value.kind))) {
    throw new CascadeError(`${label}.kind is invalid`);
  }
  if (
    !new Set(["higher-is-better", "lower-is-better", "exact"]).has(
      String(value.direction),
    )
  ) {
    throw new CascadeError(`${label}.direction is invalid`);
  }
  if (!new Set(["mean", "sum", "rate", "exact"]).has(String(value.aggregation))) {
    throw new CascadeError(`${label}.aggregation is invalid`);
  }
  requireString(value, "unit", label);
  if (typeof value.hard_gate !== "boolean") {
    throw new CascadeError(`${label}.hard_gate must be boolean`);
  }
  uniqueStrings(
    requireArray<string>(value, "required_slices", label),
    `${label}.required_slices`,
  );
  if (
    value.hard_gate === true &&
    requireArray<string>(value, "required_slices", label).length === 0
  ) {
    throw new CascadeError(`${label}.required_slices must not be empty`);
  }
  const source = objectValue(value.source, `${label}.source`);
  if (!Object.keys(source).length) {
    throw new CascadeError(`${label}.source must not be empty`);
  }
}

function validateTreatment(
  value: Record<string, unknown>,
  label: string,
): void {
  assertSchema(value, label);
  assertId(requireString(value, "id", label), label);
  if (typeof value.baseline !== "boolean") {
    throw new CascadeError(`${label}.baseline must be boolean`);
  }
  const target = objectValue(value.target, `${label}.target`);
  requireString(target, "source_revision", `${label}.target`);
  requireString(target, "model", `${label}.target`);
  for (const key of ["prompt_digest", "tool_digest", "harness_digest"]) {
    const digest = requireString(target, key, `${label}.target`);
    if (!DIGEST.test(digest)) throw new CascadeError(`${label}.target.${key} is invalid`);
  }
}

export function validateCalibration(
  value: Record<string, unknown>,
  label: string,
): void {
  assertSchema(value, label);
  assertId(requireString(value, "id", label), label);
  requireString(value, "simulation_id", label);
  requireString(value, "dataset_id", label);
  const treatments = requireArray<string>(value, "treatment_ids", label);
  if (treatments.length < 2) {
    throw new CascadeError(`${label}.treatment_ids requires at least two entries`);
  }
  uniqueStrings(treatments, `${label}.treatment_ids`);
  const metrics = requireArray<string>(value, "metric_ids", label);
  if (!metrics.length) throw new CascadeError(`${label}.metric_ids must not be empty`);
  uniqueStrings(metrics, `${label}.metric_ids`);
  requireString(value, "simulated_scores_file", label);
  requireString(value, "reference_scores_file", label);
  const reference = objectValue(value.reference, `${label}.reference`);
  if (
    !new Set(["framework-fixture", "expert-labelled", "production"]).has(
      requireString(reference, "kind", `${label}.reference`),
    )
  ) {
    throw new CascadeError(`${label}.reference.kind is invalid`);
  }
  const labelDigest = requireString(reference, "label_digest", `${label}.reference`);
  if (!DIGEST.test(labelDigest)) {
    throw new CascadeError(`${label}.reference.label_digest is invalid`);
  }
  const referenceEnd = requireString(
    reference,
    "reference_window_end",
    `${label}.reference`,
  );
  if (parseRfc3339Instant(referenceEnd) === null) {
    throw new CascadeError(`${label}.reference.reference_window_end is invalid`);
  }
  requireString(reference, "reviewer_identity", `${label}.reference`);
  const thresholds = objectValue(value.thresholds, `${label}.thresholds`);
  const minimumSamples = thresholds.minimum_samples;
  if (!Number.isInteger(minimumSamples) || Number(minimumSamples) < 1) {
    throw new CascadeError(`${label}.thresholds.minimum_samples is invalid`);
  }
  for (const key of [
    "minimum_rank_correlation",
    "minimum_linear_correlation",
  ]) {
    const threshold = thresholds[key];
    if (typeof threshold !== "number" || threshold < -1 || threshold > 1) {
      throw new CascadeError(`${label}.thresholds.${key} is invalid`);
    }
  }
  const agreement = thresholds.minimum_human_agreement;
  if (typeof agreement !== "number" || agreement < 0 || agreement > 1) {
    throw new CascadeError(
      `${label}.thresholds.minimum_human_agreement is invalid`,
    );
  }
  const slices = requireArray<string>(value, "required_slices", label);
  if (!slices.length) throw new CascadeError(`${label}.required_slices is empty`);
  uniqueStrings(slices, `${label}.required_slices`);
  if (!Number.isInteger(value.staleness_days) || Number(value.staleness_days) < 1) {
    throw new CascadeError(`${label}.staleness_days is invalid`);
  }
  if (typeof value.framework_fixture !== "boolean") {
    throw new CascadeError(`${label}.framework_fixture must be boolean`);
  }
  if (
    (value.framework_fixture === true) !==
    (reference.kind === "framework-fixture")
  ) {
    throw new CascadeError(
      `${label}.framework_fixture must match reference.kind`,
    );
  }
}

function validateScoreRows(value: unknown, label: string): ScoreRow[] {
  if (!Array.isArray(value) || !value.length) {
    throw new CascadeError(`${label} must be a non-empty score array`);
  }
  const keys = new Set<string>();
  for (const [index, raw] of value.entries()) {
    const row = objectValue(raw, `${label}[${index}]`);
    for (const key of ["case_id", "treatment_id", "metric_id", "slice"]) {
      requireString(row, key, `${label}[${index}]`);
    }
    if (typeof row.value !== "number" || !Number.isFinite(row.value)) {
      throw new CascadeError(`${label}[${index}].value must be finite`);
    }
    for (const key of ["human_label", "judge_label"]) {
      if (
        row[key] !== undefined &&
        (typeof row[key] !== "number" || !Number.isFinite(row[key]))
      ) {
        throw new CascadeError(`${label}[${index}].${key} must be finite`);
      }
    }
    const identity = `${row.case_id}:${row.treatment_id}:${row.metric_id}:${row.slice}`;
    if (keys.has(identity)) throw new CascadeError(`duplicate score row: ${identity}`);
    keys.add(identity);
  }
  return value as ScoreRow[];
}

export function validateTask(
  value: Record<string, unknown>,
  label: string,
): void {
  if (
    value.schema_version !== 1 &&
    value.schema_version !== 2 &&
    value.schema_version !== 3 &&
    value.schema_version !== 4 &&
    value.schema_version !== 5 &&
    value.schema_version !== 6 &&
    value.schema_version !== 7 &&
    value.schema_version !== 8
  ) {
    throw new CascadeError(`${label}.schema_version must be 1, 2, 3, 4, 5, 6, 7, or 8`);
  }
  assertId(requireString(value, "id", label), label, TASK_ID);
  const kind = requireString(value, "kind", label) as TaskKind;
  const driver = objectValue(value.driver, `${label}.driver`);
  const driverType = requireString(driver, "type", `${label}.driver`) as DriverType;
  if (driver.adapter !== undefined) {
    assertId(
      requireString(driver, "adapter", `${label}.driver`),
      `${label}.driver.adapter`,
    );
  }
  if (
    driverType === "platform-automation" &&
    ((kind === "desktop" && driver.adapter !== "builtin-platform-automation") ||
      (kind === "mobile" && driver.adapter !== "builtin-mobile-platform"))
  ) {
    throw new CascadeError(
      `${label}.driver.adapter must match the platform task kind`,
    );
  }
  const valid: Record<TaskKind, Set<DriverType>> = {
    command: new Set(["fake", "direct-process"]),
    http: new Set(["fake", "http-client"]),
    terminal: new Set(["fake", "pty", "computer-use"]),
    browser: new Set(["fake", "playwright", "computer-use"]),
    desktop: new Set(["fake", "platform-automation", "computer-use"]),
    mobile: new Set(["fake", "platform-automation", "computer-use"]),
    "agent-response": new Set(["fake", "agent-runtime"]),
  };
  if (!valid[kind] || !valid[kind].has(driverType)) {
    throw new CascadeError(`${label} invalid kind/driver: ${kind}/${driverType}`);
  }
  if (typeof value.required !== "boolean") {
    throw new CascadeError(`${label}.required must be boolean`);
  }
  if (
    !Number.isInteger(value.timeout_ms) ||
    Number(value.timeout_ms) < 1 ||
    Number(value.timeout_ms) > 3_600_000
  ) {
    throw new CascadeError(`${label}.timeout_ms must be between 1 and 3600000`);
  }
  const oracles = requireArray<string>(value, "oracle_ids", label);
  if (!oracles.length) throw new CascadeError(`${label}.oracle_ids must not be empty`);
  uniqueStrings(oracles, `${label}.oracle_ids`);
  uniqueStrings((value.policy_ids ?? []) as string[], `${label}.policy_ids`);
  if (driverType === "fake") {
    const actions = requireArray<Record<string, unknown>>(value, "actions", label);
    if (!actions.length) throw new CascadeError(`${label}.actions must not be empty`);
    const actionTypes = new Set(["assert", "set", "increment", "deny", "fail"]);
    for (const [index, action] of actions.entries()) {
      const actionLabel = `${label}.actions[${index}]`;
      const actionType = requireString(action, "type", actionLabel);
      if (!actionTypes.has(actionType)) {
        throw new CascadeError(`${actionLabel}.type is invalid`);
      }
      if (
        ["assert", "set", "increment"].includes(actionType) &&
        (typeof action.path !== "string" || !action.path)
      ) {
        throw new CascadeError(`${actionLabel}.path is required`);
      }
      if (
        actionType === "increment" &&
        action.amount !== undefined &&
        (typeof action.amount !== "number" || !Number.isFinite(action.amount))
      ) {
        throw new CascadeError(`${actionLabel}.amount must be finite`);
      }
      if (
        action.reason !== undefined &&
        (typeof action.reason !== "string" || !action.reason)
      ) {
        throw new CascadeError(`${actionLabel}.reason must be a non-empty string`);
      }
    }
  }
  if (driverType === "direct-process") {
    if (value.schema_version !== 3) {
      throw new CascadeError(
        `${label} direct-process tasks require schema_version 3`,
      );
    }
    const command = requireArray<string>(value, "command", label);
    if (!command.length) throw new CascadeError(`${label}.command must not be empty`);
    if (!command[0]!.startsWith("/")) {
      throw new CascadeError(`${label}.command executable must be absolute`);
    }
    assertExplicitShellSyntax(command, label);
    const process = objectValue(value.process, `${label}.process`);
    assertExactKeys(
      process,
      ["working_directory", "environment", "interactive", "network", "filesystem"],
      `${label}.process`,
    );
    if (process.working_directory !== "task-root") {
      throw new CascadeError(`${label}.process.working_directory must be task-root`);
    }
    if (process.interactive !== false) {
      throw new CascadeError(
        `${label}.process.interactive must be false; route interactive work to terminal`,
      );
    }
    if (process.network !== "deny") {
      throw new CascadeError(`${label}.process.network must be deny`);
    }
    const filesystem = objectValue(
      process.filesystem,
      `${label}.process.filesystem`,
    );
    assertExactKeys(
      filesystem,
      ["read", "write"],
      `${label}.process.filesystem`,
    );
    if (filesystem.read !== "host" || filesystem.write !== "task-root") {
      throw new CascadeError(
        `${label}.process.filesystem must use host read and task-root write`,
      );
    }
    const environment = objectValue(
      process.environment,
      `${label}.process.environment`,
    );
    for (const [name, environmentValue] of Object.entries(environment)) {
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
        throw new CascadeError(`${label}.process.environment name is invalid: ${name}`);
      }
      assertHttpRequestValue(
        environmentValue,
        isSensitiveHttpHeaderName(name),
      );
    }
  } else if (value.process !== undefined) {
    throw new CascadeError(`${label}.process requires the direct-process driver`);
  }
  if (driverType === "pty") {
    if (value.schema_version !== 6) {
      throw new CascadeError(`${label} pty tasks require schema_version 6`);
    }
    const command = requireArray<string>(value, "command", label);
    if (!command.length) throw new CascadeError(`${label}.command must not be empty`);
    if (!command[0]!.startsWith("/")) {
      throw new CascadeError(`${label}.command executable must be absolute`);
    }
    assertExplicitShellSyntax(command, label);
    const terminal = objectValue(value.terminal, `${label}.terminal`);
    assertExactKeys(
      terminal,
      [
        "working_directory",
        "environment",
        "network",
        "filesystem",
        "cols",
        "rows",
        "steps",
        "expected_exit_code",
        "evidence",
      ],
      `${label}.terminal`,
    );
    if (
      terminal.working_directory !== "task-root" ||
      terminal.network !== "deny"
    ) {
      throw new CascadeError(`${label}.terminal isolation contract is invalid`);
    }
    const filesystem = objectValue(
      terminal.filesystem,
      `${label}.terminal.filesystem`,
    );
    assertExactKeys(
      filesystem,
      ["read", "write"],
      `${label}.terminal.filesystem`,
    );
    if (filesystem.read !== "host" || filesystem.write !== "task-root") {
      throw new CascadeError(
        `${label}.terminal.filesystem must use host read and task-root write`,
      );
    }
    const environment = objectValue(
      terminal.environment,
      `${label}.terminal.environment`,
    );
    for (const [name, environmentValue] of Object.entries(environment)) {
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
        throw new CascadeError(`${label}.terminal.environment name is invalid: ${name}`);
      }
      assertHttpRequestValue(environmentValue, isSensitiveHttpHeaderName(name));
    }
    for (const key of ["cols", "rows"] as const) {
      if (
        !Number.isInteger(terminal[key]) ||
        Number(terminal[key]) < 1 ||
        Number(terminal[key]) > 500
      ) {
        throw new CascadeError(`${label}.terminal.${key} must be between 1 and 500`);
      }
    }
    if (
      !Number.isInteger(terminal.expected_exit_code) ||
      Number(terminal.expected_exit_code) < 0 ||
      Number(terminal.expected_exit_code) > 255
    ) {
      throw new CascadeError(`${label}.terminal.expected_exit_code is invalid`);
    }
    const steps = requireArray<Record<string, unknown>>(
      terminal,
      "steps",
      `${label}.terminal`,
    );
    if (!steps.length || steps.length > 128) {
      throw new CascadeError(`${label}.terminal.steps must contain 1 to 128 steps`);
    }
    for (const [index, step] of steps.entries()) {
      const stepLabel = `${label}.terminal.steps[${index}]`;
      const type = requireString(step, "type", stepLabel);
      if (type === "terminal-wait") {
        assertExactKeys(step, ["type", "text", "timeout_ms"], stepLabel);
        requireString(step, "text", stepLabel);
        if (
          !Number.isInteger(step.timeout_ms) ||
          Number(step.timeout_ms) < 1 ||
          Number(step.timeout_ms) > Number(value.timeout_ms)
        ) {
          throw new CascadeError(`${stepLabel}.timeout_ms is invalid`);
        }
      } else if (type === "terminal-input") {
        assertExactKeys(step, ["type", "value", "append_enter"], stepLabel);
        assertHttpRequestValue(step.value, false);
        if (typeof step.append_enter !== "boolean") {
          throw new CascadeError(`${stepLabel}.append_enter must be boolean`);
        }
      } else if (type === "terminal-resize") {
        assertExactKeys(step, ["type", "cols", "rows"], stepLabel);
        for (const key of ["cols", "rows"] as const) {
          if (
            !Number.isInteger(step[key]) ||
            Number(step[key]) < 1 ||
            Number(step[key]) > 500
          ) {
            throw new CascadeError(`${stepLabel}.${key} must be between 1 and 500`);
          }
        }
      } else if (type === "terminal-signal") {
        assertExactKeys(step, ["type", "signal"], stepLabel);
        if (!new Set(["SIGINT", "SIGTERM"]).has(String(step.signal))) {
          throw new CascadeError(`${stepLabel}.signal is invalid`);
        }
      } else if (type === "terminal-capture") {
        assertExactKeys(step, ["type", "label"], stepLabel);
        requireString(step, "label", stepLabel);
      } else {
        throw new CascadeError(`${stepLabel}.type is invalid`);
      }
      assertSafeSimulationAction(step as TerminalStep);
    }
    const evidence = objectValue(
      terminal.evidence,
      `${label}.terminal.evidence`,
    );
    assertExactKeys(
      evidence,
      ["raw_stream", "transcript", "final_screen"],
      `${label}.terminal.evidence`,
    );
    if (
      evidence.raw_stream !== true ||
      evidence.transcript !== true ||
      evidence.final_screen !== true
    ) {
      throw new CascadeError(`${label}.terminal evidence contract is invalid`);
    }
  } else if (value.terminal !== undefined) {
    throw new CascadeError(`${label}.terminal requires the pty driver`);
  }
  if (driverType === "playwright") {
    if (value.schema_version !== 4) {
      throw new CascadeError(`${label} playwright tasks require schema_version 4`);
    }
    const browser = objectValue(value.browser, `${label}.browser`);
    assertExactKeys(
      browser,
      ["fixture_file", "profile", "network", "downloads", "uploads", "actions", "observation", "evidence"],
      `${label}.browser`,
    );
    const fixtureFile = requireString(browser, "fixture_file", `${label}.browser`);
    if (!/^product-evals\/simulations\/harness\/(?!.*(?:^|\/)\.\.?(?:\/|$)).+\.html$/.test(fixtureFile)) {
      throw new CascadeError(`${label}.browser.fixture_file must be a harness HTML fixture`);
    }
    if (
      browser.profile !== "ephemeral" ||
      browser.network !== "deny" ||
      browser.downloads !== false ||
      browser.uploads !== false
    ) {
      throw new CascadeError(`${label}.browser isolation contract is invalid`);
    }
    const actions = requireArray<Record<string, unknown>>(browser, "actions", `${label}.browser`);
    if (!actions.length) throw new CascadeError(`${label}.browser.actions must not be empty`);
    for (const [index, rawAction] of actions.entries()) {
      const actionLabel = `${label}.browser.actions[${index}]`;
      const actionType = requireString(rawAction, "type", actionLabel);
      if (actionType === "browser-fill") {
        const locator = objectValue(rawAction.locator, `${actionLabel}.locator`);
        assertExactKeys(rawAction, ["type", "locator", "value"], actionLabel);
        if (locator.kind !== "label") throw new CascadeError(`${actionLabel}.locator must use label`);
        requireString(locator, "value", `${actionLabel}.locator`);
        requireString(rawAction, "value", actionLabel);
      } else if (actionType === "browser-click") {
        const locator = objectValue(rawAction.locator, `${actionLabel}.locator`);
        assertExactKeys(rawAction, ["type", "locator"], actionLabel);
        if (locator.kind !== "role") throw new CascadeError(`${actionLabel}.locator must use role`);
        requireString(locator, "role", `${actionLabel}.locator`);
        requireString(locator, "name", `${actionLabel}.locator`);
      } else if (actionType === "browser-navigate") {
        assertExactKeys(rawAction, ["type", "url"], actionLabel);
        requireString(rawAction, "url", actionLabel);
      } else {
        throw new CascadeError(`${actionLabel}.type is invalid`);
      }
      assertSafeSimulationAction(rawAction as BrowserAction);
    }
    const observation = objectValue(browser.observation, `${label}.browser.observation`);
    assertExactKeys(observation, ["locator", "expected_text"], `${label}.browser.observation`);
    const observationLocator = objectValue(observation.locator, `${label}.browser.observation.locator`);
    if (observationLocator.kind !== "role") {
      throw new CascadeError(`${label}.browser.observation.locator must use role`);
    }
    requireString(observationLocator, "role", `${label}.browser.observation.locator`);
    requireString(observation, "expected_text", `${label}.browser.observation`);
    const evidence = objectValue(browser.evidence, `${label}.browser.evidence`);
    assertExactKeys(evidence, ["screenshot", "trace"], `${label}.browser.evidence`);
    if (evidence.screenshot !== true || evidence.trace !== true) {
      throw new CascadeError(`${label}.browser evidence must require screenshot and trace`);
    }
  } else if (value.browser !== undefined) {
    throw new CascadeError(`${label}.browser requires the playwright driver`);
  }
  if (driverType === "platform-automation" && kind === "desktop") {
    if (value.schema_version !== 7) {
      throw new CascadeError(
        `${label} desktop platform-automation tasks require schema_version 7`,
      );
    }
    const desktop = objectValue(value.desktop, `${label}.desktop`);
    assertExactKeys(
      desktop,
      ["provider", "app", "environment", "network", "filesystem", "reset", "actions", "evidence"],
      `${label}.desktop`,
    );
    const provider = objectValue(desktop.provider, `${label}.desktop.provider`);
    assertExactKeys(
      provider,
      ["container_runtime", "image", "image_id", "platform", "fixture_root"],
      `${label}.desktop.provider`,
    );
    const image = requireString(provider, "image", `${label}.desktop.provider`);
    const imageId = requireString(provider, "image_id", `${label}.desktop.provider`);
    const fixtureRoot = requireString(
      provider,
      "fixture_root",
      `${label}.desktop.provider`,
    );
    if (
      provider.container_runtime !== "docker" ||
      provider.platform !== "linux/arm64" ||
      !/^[a-z0-9][a-z0-9._/-]*:[A-Za-z0-9._-]+$/.test(image) ||
      !/^sha256:[a-f0-9]{64}$/.test(imageId) ||
      !/^product-evals\/simulations\/harness\/(?!.*(?:^|\/)\.\.?(?:\/|$))[A-Za-z0-9._/-]+\/runtime$/.test(fixtureRoot)
    ) {
      throw new CascadeError(`${label}.desktop.provider binding is invalid`);
    }
    const app = objectValue(desktop.app, `${label}.desktop.app`);
    assertExactKeys(app, ["id", "build"], `${label}.desktop.app`);
    requireString(app, "id", `${label}.desktop.app`);
    requireString(app, "build", `${label}.desktop.app`);
    const environment = objectValue(
      desktop.environment,
      `${label}.desktop.environment`,
    );
    assertExactKeys(
      environment,
      ["display_server", "display", "resolution", "locale"],
      `${label}.desktop.environment`,
    );
    const resolution = objectValue(
      environment.resolution,
      `${label}.desktop.environment.resolution`,
    );
    assertExactKeys(
      resolution,
      ["width", "height", "scale"],
      `${label}.desktop.environment.resolution`,
    );
    if (
      environment.display_server !== "xvfb" ||
      environment.display !== ":99" ||
      environment.locale !== "C.UTF-8" ||
      resolution.scale !== 1 ||
      !Number.isInteger(resolution.width) ||
      Number(resolution.width) < 320 ||
      Number(resolution.width) > 7680 ||
      !Number.isInteger(resolution.height) ||
      Number(resolution.height) < 240 ||
      Number(resolution.height) > 4320
    ) {
      throw new CascadeError(`${label}.desktop.environment is invalid`);
    }
    const filesystem = objectValue(
      desktop.filesystem,
      `${label}.desktop.filesystem`,
    );
    assertExactKeys(filesystem, ["root", "write"], `${label}.desktop.filesystem`);
    if (
      desktop.network !== "deny" ||
      desktop.reset !== "container-remove" ||
      filesystem.root !== "read-only" ||
      filesystem.write !== "task-root"
    ) {
      throw new CascadeError(`${label}.desktop isolation contract is invalid`);
    }
    const actions = requireArray<Record<string, unknown>>(
      desktop,
      "actions",
      `${label}.desktop`,
    );
    if (!actions.length || actions.length > 128) {
      throw new CascadeError(`${label}.desktop.actions must contain 1 to 128 actions`);
    }
    for (const [index, rawAction] of actions.entries()) {
      const actionLabel = `${label}.desktop.actions[${index}]`;
      const actionType = requireString(rawAction, "type", actionLabel);
      if (actionType === "desktop-launch") {
        assertExactKeys(rawAction, ["type", "app_id", "window_title"], actionLabel);
        requireString(rawAction, "app_id", actionLabel);
        requireString(rawAction, "window_title", actionLabel);
      } else if (actionType === "desktop-type") {
        assertExactKeys(rawAction, ["type", "value"], actionLabel);
        assertHttpRequestValue(rawAction.value, false);
        if ((rawAction.value as { kind?: unknown }).kind !== "public-literal") {
          throw new CascadeError(
            `${actionLabel}.value must be an explicit public literal`,
          );
        }
      } else if (actionType === "desktop-key") {
        assertExactKeys(rawAction, ["type", "key"], actionLabel);
        const key = requireString(rawAction, "key", actionLabel);
        if (!/^[A-Za-z0-9_+-]{1,64}$/.test(key)) {
          throw new CascadeError(`${actionLabel}.key is invalid`);
        }
      } else if (actionType === "desktop-wait-file") {
        assertExactKeys(rawAction, ["type", "file", "timeout_ms"], actionLabel);
        const file = requireString(rawAction, "file", actionLabel);
        if (
          !/^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(file) ||
          file.split("/").some((segment) => segment === "." || segment === "..") ||
          !Number.isInteger(rawAction.timeout_ms) ||
          Number(rawAction.timeout_ms) < 1 ||
          Number(rawAction.timeout_ms) > Number(value.timeout_ms)
        ) {
          throw new CascadeError(`${actionLabel} is invalid`);
        }
      } else if (actionType === "desktop-capture") {
        assertExactKeys(rawAction, ["type", "label"], actionLabel);
        const captureLabel = requireString(rawAction, "label", actionLabel);
        if (!/^[a-z0-9][a-z0-9._-]*$/.test(captureLabel)) {
          throw new CascadeError(`${actionLabel}.label is invalid`);
        }
      } else {
        throw new CascadeError(`${actionLabel}.type is invalid`);
      }
      assertSafeSimulationAction(rawAction as DesktopAction);
    }
    const evidence = objectValue(desktop.evidence, `${label}.desktop.evidence`);
    assertExactKeys(
      evidence,
      ["screenshots", "result", "logs"],
      `${label}.desktop.evidence`,
    );
    if (
      evidence.screenshots !== true ||
      evidence.result !== true ||
      evidence.logs !== true
    ) {
      throw new CascadeError(`${label}.desktop evidence contract is invalid`);
    }
  } else if (value.desktop !== undefined) {
    throw new CascadeError(
      `${label}.desktop requires the desktop platform-automation driver`,
    );
  }
  if (driverType === "platform-automation" && kind === "mobile") {
    if (value.schema_version !== 8) {
      throw new CascadeError(
        `${label} mobile platform-automation tasks require schema_version 8`,
      );
    }
    const mobile = objectValue(value.mobile, `${label}.mobile`);
    assertExactKeys(
      mobile,
      ["provider", "app", "network", "reset", "actions", "evidence"],
      `${label}.mobile`,
    );
    const provider = objectValue(mobile.provider, `${label}.mobile.provider`);
    assertExactKeys(
      provider,
      ["runtime", "device_id", "platform_version", "fixture_root"],
      `${label}.mobile.provider`,
    );
    if (
      !new Set(["android-emulator", "ios-simulator"]).has(String(provider.runtime))
    ) {
      throw new CascadeError(`${label}.mobile.provider.runtime is invalid`);
    }
    requireString(provider, "device_id", `${label}.mobile.provider`);
    requireString(provider, "platform_version", `${label}.mobile.provider`);
    const fixtureRoot = requireString(
      provider,
      "fixture_root",
      `${label}.mobile.provider`,
    );
    if (
      !/^product-evals\/simulations\/harness\/(?!.*(?:^|\/)\.\.?(?:\/|$))[A-Za-z0-9._/-]+\/runtime$/.test(fixtureRoot)
    ) {
      throw new CascadeError(`${label}.mobile.provider.fixture_root is invalid`);
    }
    const app = objectValue(mobile.app, `${label}.mobile.app`);
    assertExactKeys(app, ["id", "build"], `${label}.mobile.app`);
    requireString(app, "id", `${label}.mobile.app`);
    requireString(app, "build", `${label}.mobile.app`);
    if (mobile.network !== "deny" || mobile.reset !== "snapshot-restore") {
      throw new CascadeError(`${label}.mobile isolation contract is invalid`);
    }
    const actions = requireArray<Record<string, unknown>>(
      mobile,
      "actions",
      `${label}.mobile`,
    );
    if (!actions.length || actions.length > 128) {
      throw new CascadeError(`${label}.mobile.actions must contain 1 to 128 actions`);
    }
    for (const [index, rawAction] of actions.entries()) {
      const actionLabel = `${label}.mobile.actions[${index}]`;
      const actionType = requireString(rawAction, "type", actionLabel);
      if (actionType === "mobile-launch") {
        assertExactKeys(rawAction, ["type", "app_id"], actionLabel);
        requireString(rawAction, "app_id", actionLabel);
      } else if (actionType === "mobile-tap") {
        assertExactKeys(rawAction, ["type", "x", "y"], actionLabel);
        for (const key of ["x", "y"] as const) {
          if (!Number.isInteger(rawAction[key]) || Number(rawAction[key]) < 0) {
            throw new CascadeError(`${actionLabel}.${key} is invalid`);
          }
        }
      } else if (actionType === "mobile-type") {
        assertExactKeys(rawAction, ["type", "value"], actionLabel);
        assertHttpRequestValue(rawAction.value, false);
        if ((rawAction.value as { kind?: unknown }).kind !== "public-literal") {
          throw new CascadeError(
            `${actionLabel}.value must be an explicit public literal`,
          );
        }
      } else if (actionType === "mobile-key") {
        assertExactKeys(rawAction, ["type", "key"], actionLabel);
        const key = requireString(rawAction, "key", actionLabel);
        if (!/^[A-Za-z0-9_+-]{1,64}$/.test(key)) {
          throw new CascadeError(`${actionLabel}.key is invalid`);
        }
      } else if (actionType === "mobile-wait-text") {
        assertExactKeys(rawAction, ["type", "text", "timeout_ms"], actionLabel);
        requireString(rawAction, "text", actionLabel);
        if (
          !Number.isInteger(rawAction.timeout_ms) ||
          Number(rawAction.timeout_ms) < 1 ||
          Number(rawAction.timeout_ms) > Number(value.timeout_ms)
        ) {
          throw new CascadeError(`${actionLabel}.timeout_ms is invalid`);
        }
      } else if (actionType === "mobile-capture") {
        assertExactKeys(rawAction, ["type", "label"], actionLabel);
        const captureLabel = requireString(rawAction, "label", actionLabel);
        if (!/^[a-z0-9][a-z0-9._-]*$/.test(captureLabel)) {
          throw new CascadeError(`${actionLabel}.label is invalid`);
        }
      } else {
        throw new CascadeError(`${actionLabel}.type is invalid`);
      }
      assertSafeSimulationAction(rawAction as MobileAction);
    }
    const evidence = objectValue(mobile.evidence, `${label}.mobile.evidence`);
    assertExactKeys(
      evidence,
      ["screenshots", "result", "logs"],
      `${label}.mobile.evidence`,
    );
    if (
      evidence.screenshots !== true ||
      evidence.result !== true ||
      evidence.logs !== true
    ) {
      throw new CascadeError(`${label}.mobile evidence contract is invalid`);
    }
  } else if (value.mobile !== undefined) {
    throw new CascadeError(
      `${label}.mobile requires the mobile platform-automation driver`,
    );
  }
  if (driverType === "http-client") {
    if (value.schema_version !== 2) {
      throw new CascadeError(
        `${label} http-client tasks require schema_version 2`,
      );
    }
    const request = objectValue(value.request, `${label}.request`);
    assertExactKeys(
      request,
      ["method", "url", "headers", "body"],
      `${label}.request`,
    );
    const method = requireString(request, "method", `${label}.request`);
    if (
      !new Set(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]).has(
        method,
      )
    ) {
      throw new CascadeError(`${label}.request.method is invalid`);
    }
    const requestUrl = requireString(request, "url", `${label}.request`);
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(requestUrl);
    } catch {
      throw new CascadeError(`${label}.request.url must be an absolute URL`);
    }
    if (!new Set(["http:", "https:"]).has(parsedUrl.protocol)) {
      throw new CascadeError(`${label}.request.url must use http or https`);
    }
    if (parsedUrl.username || parsedUrl.password || parsedUrl.hash) {
      throw new CascadeError(
        `${label}.request.url must not contain credentials or a fragment`,
      );
    }
    if (request.headers !== undefined) {
      const headers = objectValue(request.headers, `${label}.request.headers`);
      for (const [name, headerValue] of Object.entries(headers)) {
        if (!name.trim()) {
          throw new CascadeError(
            `${label}.request.headers must contain non-empty names`,
          );
        }
        assertHttpRequestValue(headerValue, isSensitiveHttpHeaderName(name));
      }
    }
    if (request.body !== undefined) {
      assertHttpRequestValue(request.body, false);
    }
    if (["GET", "HEAD"].includes(method) && request.body !== undefined) {
      throw new CascadeError(`${label}.request.body is not allowed for ${method}`);
    }
    assertSafeSimulationAction({
      type: "http-request",
      method: method as HttpMethod,
      url: requestUrl,
      headers: request.headers as Record<string, HttpRequestValue> | undefined,
      body: request.body as HttpRequestValue | undefined,
    });
  } else if (value.request !== undefined) {
    throw new CascadeError(`${label}.request requires the http-client driver`);
  }
  if (driverType === "agent-runtime") {
    if (value.schema_version !== 5) {
      throw new CascadeError(`${label} agent-runtime tasks require schema_version 5`);
    }
    const agent = objectValue(value.agent, `${label}.agent`);
    assertExactKeys(
      agent,
      ["target", "runtime", "prompt_file", "input_file", "output_schema_file", "permissions", "budgets", "evaluation_profile", "source_blind"],
      `${label}.agent`,
    );
    const target = objectValue(agent.target, `${label}.agent.target`);
    assertExactKeys(
      target,
      ["mode", "instruction_file", "agent_id", "profile_file"],
      `${label}.agent.target`,
    );
    const mode = requireString(target, "mode", `${label}.agent.target`);
    if (!new Set(["explicit-instructions", "named-agent", "cascade-profile"]).has(mode)) {
      throw new CascadeError(`${label}.agent.target.mode is invalid`);
    }
    if (
      (mode === "explicit-instructions" &&
        (typeof target.instruction_file !== "string" || target.agent_id !== undefined || target.profile_file !== undefined)) ||
      (mode === "named-agent" &&
        (typeof target.agent_id !== "string" || target.instruction_file !== undefined || target.profile_file !== undefined)) ||
      (mode === "cascade-profile" &&
        (typeof target.profile_file !== "string" || target.instruction_file !== undefined || target.agent_id !== undefined))
    ) {
      throw new CascadeError(`${label}.agent.target fields do not match its mode`);
    }
    const runtime = objectValue(agent.runtime, `${label}.agent.runtime`);
    assertExactKeys(runtime, ["provider", "fixture_response_file", "model", "reasoning_effort"], `${label}.agent.runtime`);
    const provider = requireString(runtime, "provider", `${label}.agent.runtime`);
    if (!new Set(["fixture", "codex"]).has(provider)) {
      throw new CascadeError(`${label}.agent.runtime.provider is unsupported`);
    }
    if (
      (provider === "fixture" &&
        (typeof runtime.fixture_response_file !== "string" ||
          runtime.model !== undefined || runtime.reasoning_effort !== undefined)) ||
      (provider === "codex" &&
        (runtime.fixture_response_file !== undefined ||
          typeof runtime.model !== "string" || !runtime.model ||
          !new Set(["low", "medium", "high"]).has(String(runtime.reasoning_effort))))
    ) {
      throw new CascadeError(`${label}.agent.runtime fixture source is invalid`);
    }
    const permissions = objectValue(agent.permissions, `${label}.agent.permissions`);
    assertExactKeys(permissions, ["filesystem", "network", "tools"], `${label}.agent.permissions`);
    if (
      permissions.filesystem !== "read-only" ||
      permissions.network !== "deny" ||
      !Array.isArray(permissions.tools) ||
      permissions.tools.some((tool) => typeof tool !== "string" || !tool)
    ) {
      throw new CascadeError(`${label}.agent.permissions must be read-only and network-denied`);
    }
    uniqueStrings(permissions.tools as string[], `${label}.agent.permissions.tools`);
    const budgets = objectValue(agent.budgets, `${label}.agent.budgets`);
    assertExactKeys(budgets, ["max_output_bytes", "max_tool_calls", "max_tokens"], `${label}.agent.budgets`);
    for (const key of ["max_output_bytes", "max_tool_calls", "max_tokens"]) {
      if (!Number.isInteger(budgets[key]) || Number(budgets[key]) < (key === "max_tool_calls" ? 0 : 1)) {
        throw new CascadeError(`${label}.agent.budgets.${key} is invalid`);
      }
    }
    const evaluationProfile = requireString(agent, "evaluation_profile", `${label}.agent`);
    if (
      !new Set(["response-contract-v1", "cascade-route-and-trace-v1"]).has(
        evaluationProfile,
      ) ||
      (mode === "cascade-profile" && evaluationProfile !== "cascade-route-and-trace-v1") ||
      (mode !== "cascade-profile" && evaluationProfile !== "response-contract-v1") ||
      agent.source_blind !== true
    ) {
      throw new CascadeError(`${label}.agent evaluation/source-blind contract is invalid`);
    }
    const sourceFiles = [
      ...(typeof target.instruction_file === "string" ? [target.instruction_file] : []),
      ...(typeof target.profile_file === "string" ? [target.profile_file] : []),
      requireString(agent, "prompt_file", `${label}.agent`),
      requireString(agent, "input_file", `${label}.agent`),
      requireString(agent, "output_schema_file", `${label}.agent`),
      ...(typeof runtime.fixture_response_file === "string" ? [runtime.fixture_response_file] : []),
    ];
    if (
      sourceFiles.some((file) => {
        const canonicalHarnessSchema =
          mode === "cascade-profile" && file === "harness-evals/response.schema.json";
        return (
          (!canonicalHarnessSchema &&
            !/^product-evals\/tasks\/agent-response\/(?!.*(?:^|\/)\.\.?(?:\/|$))[a-z0-9./-]+$/.test(file)) ||
          /(?:golden|expected-answer|prior-run)/i.test(file)
        );
      }) ||
      stableJson([...(value.inputs ?? [])].sort()) !== stableJson([...sourceFiles].sort())
    ) {
      throw new CascadeError(`${label}.agent inputs must be exact source-blind task files`);
    }
    assertSafeSimulationAction(taskPolicyActions(value as unknown as TaskDefinition)[0]!);
  } else if (value.agent !== undefined) {
    throw new CascadeError(`${label}.agent requires the agent-runtime driver`);
  }
}

export function validateClaim(
  value: Record<string, unknown>,
  label: string,
): void {
  assertSchema(value, label);
  assertId(requireString(value, "id", label), label);
  const classes = new Set([
    "authorship",
    "execution",
    "mechanical-behavior",
    "semantic-quality",
    "safety-compliance",
    "coverage",
    "release-eligibility",
  ]);
  if (!classes.has(requireString(value, "class", label))) {
    throw new CascadeError(`${label}.class is invalid`);
  }
  requireString(value, "assertion", label);
  objectValue(value.scope, `${label}.scope`);
  const populationAuthority = requireString(value, "population_authority", label);
  if (!new Set(["none", "persona-derived", "estimated-prevalence"]).has(populationAuthority)) {
    throw new CascadeError(`${label}.population_authority is invalid`);
  }
  if (
    populationAuthority !== "none" &&
    (typeof (value.scope as Record<string, unknown>).population_id !== "string" ||
      !(value.scope as Record<string, unknown>).population_id)
  ) {
    throw new CascadeError(`${label}.scope.population_id is required for population authority`);
  }
  for (const key of [
    "required_policy_ids",
    "required_oracle_ids",
    "required_metric_ids",
  ]) {
    uniqueStrings(requireArray<string>(value, key, label), `${label}.${key}`);
  }
  const evidenceRequirements = requireArray<string>(
    value,
    "evidence_requirements",
    label,
  );
  uniqueStrings(evidenceRequirements, `${label}.evidence_requirements`);
  const evidenceKinds = new Set([
    "source-manifest",
    "execution-receipt",
    "task-result",
    "trajectory",
    "policy-decisions",
    "oracle",
    "cleanup",
    "calibration-receipt",
  ]);
  for (const requirement of evidenceRequirements) {
    if (!evidenceKinds.has(requirement)) {
      throw new CascadeError(
        `${label}.evidence_requirements has unknown artifact: ${requirement}`,
      );
    }
  }
  if (typeof value.requires_calibration !== "boolean") {
    throw new CascadeError(`${label}.requires_calibration must be boolean`);
  }
}

export function validateSimulationArtifactPolicy(
  value: Record<string, unknown>,
  label: string,
): void {
  assertExactKeys(value, [
    "schema_version", "artifact_root", "storage_mode", "source_material_mode",
    "raw_sensitive_material_allowed", "encryption_at_rest", "access_scope",
    "operator_attestation", "retention", "remote_storage", "export",
  ], label);
  if (value.schema_version !== 1) throw new CascadeError(`${label}.schema_version must be 1`);
  const constants: Array<[string, string]> = [
    ["artifact_root", ".artifacts/product-evals"],
    ["storage_mode", "local-append-only"],
    ["source_material_mode", "digest-and-minimized-metadata-only"],
    ["encryption_at_rest", "host-filesystem-required"],
    ["access_scope", "maintainers-only"],
    ["operator_attestation", "required-for-restricted"],
    ["remote_storage", "disabled"],
    ["export", "disabled"],
  ];
  for (const [key, expected] of constants) {
    if (value[key] !== expected) throw new CascadeError(`${label}.${key} must be ${expected}`);
  }
  if (value.raw_sensitive_material_allowed !== false) {
    throw new CascadeError(`${label}.raw_sensitive_material_allowed must be false`);
  }
  const retention = objectValue(value.retention, `${label}.retention`);
  assertExactKeys(retention, ["mode", "review_after_days", "deletion_owner"], `${label}.retention`);
  if (retention.mode !== "manual-review") throw new CascadeError(`${label}.retention.mode must be manual-review`);
  if (!Number.isInteger(retention.review_after_days) || (retention.review_after_days as number) < 1) {
    throw new CascadeError(`${label}.retention.review_after_days must be a positive integer`);
  }
  requireString(retention, "deletion_owner", `${label}.retention`);
}

export function validatePolicy(value: Record<string, unknown>, label: string): void {
  assertExactKeys(
    value,
    [
      "schema_version",
      "id",
      "version",
      "effect",
      "scope",
      "budgets",
      "redaction_profile",
      "confirmation_authority",
      "reason",
    ],
    label,
  );
  if (value.schema_version !== 2) {
    throw new CascadeError(`${label}.schema_version must be 2`);
  }
  assertId(requireString(value, "id", label), label);
  if (!/^[0-9]+\.[0-9]+\.[0-9]+$/.test(requireString(value, "version", label))) {
    throw new CascadeError(`${label}.version must be semver`);
  }
  if (
    !new Set(["ALLOW", "DENY", "REQUIRE_CONFIRMATION"]).has(
      requireString(value, "effect", label),
    )
  ) {
    throw new CascadeError(`${label}.effect is invalid`);
  }
  if (value.effect === "REQUIRE_CONFIRMATION") {
    const authority = objectValue(
      value.confirmation_authority,
      `${label}.confirmation_authority`,
    );
    assertExactKeys(
      authority,
      ["key_id", "secret_env", "allowed_confirmers"],
      `${label}.confirmation_authority`,
    );
    assertCampaignConfirmationKeyId(
      requireString(authority, "key_id", `${label}.confirmation_authority`),
      `${label}.confirmation_authority.key_id`,
    );
    if (
      !/^[A-Z][A-Z0-9_]+$/.test(
        requireString(authority, "secret_env", `${label}.confirmation_authority`),
      )
    ) {
      throw new CascadeError(
        `${label}.confirmation_authority.secret_env is invalid`,
      );
    }
    const confirmers = requireArray<string>(
      authority,
      "allowed_confirmers",
      `${label}.confirmation_authority`,
    );
    if (!confirmers.length) {
      throw new CascadeError(
        `${label}.confirmation_authority.allowed_confirmers is empty`,
      );
    }
    uniqueStrings(
      confirmers,
      `${label}.confirmation_authority.allowed_confirmers`,
    );
  } else if (value.confirmation_authority !== undefined) {
    throw new CascadeError(
      `${label}.confirmation_authority requires REQUIRE_CONFIRMATION`,
    );
  }
  const scope = objectValue(value.scope, `${label}.scope`);
  assertExactKeys(
    scope,
    [
      "campaign_ids",
      "task_ids",
      "task_kinds",
      "driver_types",
      "action_types",
      "action_paths",
      "command_prefix",
      "http_methods",
      "http_origins",
    ],
    `${label}.scope`,
  );
  for (const key of [
    "campaign_ids",
    "task_ids",
    "task_kinds",
    "driver_types",
    "action_types",
  ]) {
    const values = requireArray<string>(scope, key, `${label}.scope`);
    if (!values.length) {
      throw new CascadeError(`${label}.scope.${key} is empty`);
    }
    uniqueStrings(values, `${label}.scope.${key}`);
  }
  if (scope.action_paths !== undefined) {
    const paths = requireArray<string>(scope, "action_paths", `${label}.scope`);
    if (!paths.length) {
      throw new CascadeError(`${label}.scope.action_paths is empty`);
    }
    uniqueStrings(paths, `${label}.scope.action_paths`);
  }
  if (scope.command_prefix !== undefined) {
    const prefix = requireArray<string>(
      scope,
      "command_prefix",
      `${label}.scope`,
    );
    if (!prefix.length) {
      throw new CascadeError(`${label}.scope.command_prefix is empty`);
    }
    uniqueStrings(prefix, `${label}.scope.command_prefix`);
  }
  if (scope.http_methods !== undefined) {
    const methods = requireArray<string>(
      scope,
      "http_methods",
      `${label}.scope`,
    );
    if (!methods.length) {
      throw new CascadeError(`${label}.scope.http_methods is empty`);
    }
    const validMethods = new Set([
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "HEAD",
      "OPTIONS",
    ]);
    for (const method of methods) {
      if (!validMethods.has(method)) {
        throw new CascadeError(`${label}.scope.http_methods is invalid`);
      }
    }
    uniqueStrings(methods, `${label}.scope.http_methods`);
  }
  if (scope.http_origins !== undefined) {
    const origins = requireArray<string>(
      scope,
      "http_origins",
      `${label}.scope`,
    );
    if (!origins.length) {
      throw new CascadeError(`${label}.scope.http_origins is empty`);
    }
    for (const origin of origins) {
      let parsed: URL;
      try {
        parsed = new URL(origin);
      } catch {
        throw new CascadeError(`${label}.scope.http_origins is invalid`);
      }
      if (
        !new Set(["http:", "https:"]).has(parsed.protocol) ||
        parsed.origin !== origin
      ) {
        throw new CascadeError(
          `${label}.scope.http_origins must contain exact http(s) origins`,
        );
      }
    }
    uniqueStrings(origins, `${label}.scope.http_origins`);
  }
  const budgets = objectValue(value.budgets, `${label}.budgets`);
  assertExactKeys(
    budgets,
    ["required_dimensions", "max_actions", "max_output_bytes"],
    `${label}.budgets`,
  );
  const requiredDimensions = requireArray<string>(
    budgets,
    "required_dimensions",
    `${label}.budgets`,
  );
  uniqueStrings(requiredDimensions, `${label}.budgets.required_dimensions`);
  for (const dimension of requiredDimensions) {
    if (
      !new Set([
        "action_count",
        "output_bytes",
        "token_count",
        "cost_usd",
      ]).has(dimension)
    ) {
      throw new CascadeError(
        `${label}.budgets.required_dimensions has unknown dimension ${dimension}`,
      );
    }
  }
  for (const key of ["max_actions", "max_output_bytes"]) {
    if (!Number.isInteger(budgets[key]) || (budgets[key] as number) < 1) {
      throw new CascadeError(`${label}.budgets.${key} must be a positive integer`);
    }
  }
  if (
    !new Set(["no-secrets-v1", "source-code-v1"]).has(
      requireString(value, "redaction_profile", label),
    )
  ) {
    throw new CascadeError(`${label}.redaction_profile is invalid`);
  }
  requireString(value, "reason", label);
}

export function validateOracle(value: Record<string, unknown>, label: string): void {
  assertSchema(value, label);
  assertId(requireString(value, "id", label), label);
  const type = requireString(value, "type", label);
  if (
    !new Set([
      "state-equals",
      "exit-code",
      "file-exists",
      "task-file-exists",
      "http-status",
    ]).has(
      type,
    )
  ) {
    throw new CascadeError(`${label}.type is invalid`);
  }
  if (type === "state-equals" && typeof value.path !== "string") {
    throw new CascadeError(`${label}.path is required`);
  }
  if (type === "exit-code" && !Number.isInteger(value.expected_exit_code)) {
    throw new CascadeError(`${label}.expected_exit_code is required`);
  }
  if (
    type === "http-status" &&
    (!Number.isInteger(value.expected_status) ||
      Number(value.expected_status) < 100 ||
      Number(value.expected_status) > 599)
  ) {
    throw new CascadeError(`${label}.expected_status is required`);
  }
  if (type === "file-exists" || type === "task-file-exists") {
    const file = requireString(value, "file", label);
    if (
      type === "task-file-exists" &&
      (file.startsWith("/") ||
        file.includes("\\") ||
        file.split("/").some((part) => !part || part === "." || part === ".."))
    ) {
      throw new CascadeError(
        `${label}.file must be a canonical task-root-relative path`,
      );
    }
  }
}

function assertReferences(
  values: string[],
  available: Set<string>,
  label: string,
): void {
  for (const value of values) {
    if (!available.has(value)) throw new CascadeError(`${label} unknown reference: ${value}`);
  }
}

export function validateTaskPolicyApplicability(
  campaign: CampaignDefinition,
  task: TaskDefinition,
  policies: PolicyDefinition[],
): void {
  const referencedPolicyIds = task.policy_ids ?? [];
  for (const action of task.actions ?? []) {
    const matchingPolicies = policies.filter(
      (policy) =>
        referencedPolicyIds.includes(policy.id) &&
        policyAppliesToObservation(policy, {
          campaign_id: campaign.id,
          task_id: task.id,
          task_kind: task.kind,
          driver_type: task.driver.type,
          action,
        }),
    );
    if (referencedPolicyIds.length > 0 && matchingPolicies.length === 0) {
      throw new CascadeError(
        `${task.id} action ${action.type} has no applicable referenced policy ` +
          `for campaign ${campaign.id}`,
      );
    }
    if (matchingPolicies.length > 1) {
      throw new CascadeError(
        `${task.id} action ${action.type} has overlapping policies: ` +
          matchingPolicies.map((policy) => policy.id).join(", "),
      );
    }
  }
  const validateSingleActionPolicy = (
    action: SimulationAction,
    description: string,
  ): void => {
    const matchingPolicies = policies.filter(
      (policy) =>
        referencedPolicyIds.includes(policy.id) &&
        policyAppliesToObservation(policy, {
          campaign_id: campaign.id,
          task_id: task.id,
          task_kind: task.kind,
          driver_type: task.driver.type,
          action,
        }),
    );
    if (referencedPolicyIds.length > 0 && matchingPolicies.length === 0) {
      throw new CascadeError(
        `${task.id} ${description} has no applicable referenced policy ` +
          `for campaign ${campaign.id}`,
      );
    }
    if (matchingPolicies.length > 1) {
      throw new CascadeError(
        `${task.id} ${description} has overlapping policies: ` +
          matchingPolicies.map((policy) => policy.id).join(", "),
      );
    }
  };

  if (task.driver.type === "direct-process") {
    validateSingleActionPolicy(
      {
        type: "process-exec",
        argv: task.command ?? [],
        ...(task.process === undefined ? {} : { process: task.process }),
      },
      "process execution",
    );
  }
  if (task.driver.type === "http-client") {
    validateSingleActionPolicy(
      {
        type: "http-request",
        method: task.request!.method,
        url: task.request!.url,
        headers: task.request!.headers,
        body: task.request!.body,
      },
      "HTTP request",
    );
  }
  if (task.driver.type === "playwright") {
    for (const [index, action] of (task.browser?.actions ?? []).entries()) {
      validateSingleActionPolicy(action, `browser action ${index}`);
    }
  }
}

export async function resolveCampaign(
  campaignPath: string,
  options: {
    allowStaleIntake?: boolean;
    replaceReferencedIntake?: boolean;
  } = {},
): Promise<ResolvedCampaign> {
  await assertCampaignFixedSourceImportClosure();
  const path = boundedPath(campaignPath, "product-evals/campaigns/");
  const campaign = await loadFile<CampaignDefinition>(
    rel(path),
    "product-evals/campaigns/",
    validateCampaign,
  );
  const campaignSha256 = await sha256File(path);
  const evaluationProfile = await loadFile<EvaluationProfileDefinition>(
    campaign.evaluation_profile_file,
    "product-evals/rubrics/",
    validateEvaluationProfile,
  );
  const rubric = evaluationProfile.rubric_file
    ? await loadFile<RubricDefinition>(
        evaluationProfile.rubric_file,
        "product-evals/rubrics/",
        validateRubric,
      )
    : undefined;
  if (
    campaign.tier === "semantic-evaluation" &&
    evaluationProfile.provider !== "codex"
  ) {
    throw new CascadeError(
      `${campaign.id} semantic-evaluation tier requires a codex evaluation profile`,
    );
  }
  if (
    evaluationProfile.provider === "fixture" &&
    campaign.tier !== "deterministic-fixture"
  ) {
    throw new CascadeError(
      `${campaign.id} fixture evaluation is restricted to deterministic-fixture tier`,
    );
  }
  const simulation = await loadFile<SimulationDefinition>(
    campaign.simulation_file,
    "product-evals/simulations/",
    validateSimulation,
  );
  validateCampaignIntakePathScope(
    campaign.simulation_file,
    campaign.intake_file,
    campaign.id,
    simulation.simulation_scope,
  );
  validateCampaignSeedBindingScope(
    simulation.simulation_scope,
    campaign.seed_binding_file,
    campaign.id,
  );
  const seedBinding = campaign.seed_binding_file
    ? await readBoundedSimulationSeedBinding(
        campaign.seed_binding_file,
        `${campaign.id} seed binding`,
      )
    : undefined;
  if (seedBinding && (seedBinding.definition.campaign_id !== campaign.id ||
    seedBinding.definition.campaign_sha256 !== campaignSha256)) {
    throw new CascadeError(`${campaign.id} seed binding campaign identity or digest is stale or mismatched`);
  }
  const intake = campaign.intake_file && !options.replaceReferencedIntake
    ? await loadFile<SimulationIntakeDefinition>(
        campaign.intake_file,
        "product-evals/intakes/",
        validateSimulationIntake,
      )
    : undefined;
  if (intake && (intake.scope !== simulation.simulation_scope || intake.campaign_id !== campaign.id)) {
    throw new CascadeError(`${campaign.id} simulation intake scope or campaign binding is mismatched`);
  }
  const simulationRoot = campaign.simulation_file.slice(0, -"/manifest.json".length);
  const populations = await Promise.all(
    simulation.population_files.map((file) =>
      loadFile<PopulationDefinition>(
        file,
        "product-evals/simulations/",
        validatePopulation,
      ),
    ),
  );
  const personaDerivations: ResolvedPersonaDerivation[] = [];
  const derivationPaths = new Set<string>();
  for (const population of populations) {
    if (population.schema_version !== 2) continue;
    const reference = population.source.derivation;
    if (!reference.path.startsWith(`${simulationRoot}/derivations/`)) {
      throw new CascadeError(
        `${population.id} persona derivation must stay inside ${simulationRoot}/derivations/`,
      );
    }
    if (derivationPaths.has(reference.path)) {
      throw new CascadeError(`duplicate persona derivation path: ${reference.path}`);
    }
    derivationPaths.add(reference.path);
    const manifest = await loadFile<PersonaDerivationManifest>(
      reference.path,
      "product-evals/simulations/",
      validatePersonaDerivation,
    );
    await verifyPersonaDerivationSources(manifest, reference.path);
    const digest = await sha256File(rootPath(reference.path));
    if (digest !== reference.sha256) {
      throw new CascadeError(`${population.id} persona derivation digest mismatch`);
    }
    if (
      manifest.id !== reference.id ||
      manifest.simulation_id !== simulation.id ||
      manifest.population_id !== population.id ||
      manifest.mode !== population.mode ||
      manifest.review.status !== "approved" ||
      !samePersonaReferences(manifest.product_personas, population.source.product_personas) ||
      stableJson(manifest.generator) !== stableJson(population.source.generator)
    ) {
      throw new CascadeError(`${population.id} persona derivation binding is stale or mismatched`);
    }
    personaDerivations.push({ path: reference.path, sha256: digest, manifest });
  }
  const scenarios = await Promise.all(
    simulation.scenario_files.map((file) =>
      loadFile<ScenarioDefinition>(
        file,
        "product-evals/simulations/",
        validateScenario,
      ),
    ),
  );
  const world = await loadFile<WorldDefinition>(
    simulation.world_file,
    "product-evals/simulations/",
    validateWorld,
  );
  if (!world.fixture_file.startsWith(`${simulationRoot}/worlds/`)) {
    throw new CascadeError(
      `${world.id} fixture must stay inside ${simulationRoot}/worlds/`,
    );
  }
  const fixturePath = boundedPath(world.fixture_file, "product-evals/simulations/");
  if (!(await isFile(fixturePath))) {
    throw new CascadeError(`world fixture missing: ${world.fixture_file}`);
  }
  const fixture = objectValue(
    await readJson(fixturePath),
    world.fixture_file,
  );
  const dataset = await loadFile<DatasetDefinition>(
    simulation.dataset_file,
    "product-evals/simulations/",
    validateDataset,
  );
  const metrics = await Promise.all(
    simulation.metric_files.map((file) =>
      loadFile<MetricDefinition>(file, "product-evals/metrics/", validateMetric),
    ),
  );
  const treatments = await Promise.all(
    simulation.treatment_files.map((file) =>
      loadFile<TreatmentDefinition>(
        file,
        "product-evals/treatments/",
        validateTreatment,
      ),
    ),
  );
  const calibration = simulation.calibration_file
    ? await loadFile<CalibrationDefinition>(
        simulation.calibration_file,
        "product-evals/calibrations/",
        validateCalibration,
      )
    : undefined;
  validateSimulationCalibrationAuthority(simulation, calibration);
  const simulatedScores = calibration
    ? validateScoreRows(
        await readJson(
          boundedPath(
            calibration.simulated_scores_file,
            "product-evals/calibrations/fixtures/",
          ),
        ),
        calibration.simulated_scores_file,
      )
    : [];
  const referenceScores = calibration
    ? validateScoreRows(
        await readJson(
          boundedPath(
            calibration.reference_scores_file,
            "product-evals/calibrations/fixtures/",
          ),
        ),
        calibration.reference_scores_file,
      )
    : [];
  const tasks = await Promise.all(
    campaign.task_files.map((file) =>
      loadFile<TaskDefinition>(file, "product-evals/tasks/", validateTask),
    ),
  );
  if (campaign.session) {
    if (campaign.session.max_steps < tasks.length) {
      throw new CascadeError(
        `${campaign.id} session max_steps cannot cover all campaign tasks`,
      );
    }
    const maximumLifecycleBound = Math.max(
      ...tasks.map((task) => task.timeout_ms * 6 + 5_000),
    );
    if (campaign.session.max_step_duration_ms < maximumLifecycleBound) {
      throw new CascadeError(
        `${campaign.id} session max_step_duration_ms cannot cover the largest bounded task lifecycle (${maximumLifecycleBound}ms)`,
      );
    }
    if (campaign.session.max_surfaces < tasks.length) {
      throw new CascadeError(
        `${campaign.id} session max_surfaces cannot cover all campaign tasks`,
      );
    }
    if (campaign.session.lease_ttl_ms <= maximumLifecycleBound) {
      throw new CascadeError(
        `${campaign.id} session lease_ttl_ms must exceed the largest bounded task lifecycle (${maximumLifecycleBound}ms)`,
      );
    }
    if (campaign.session.lease_ttl_ms <= campaign.session.max_step_duration_ms) {
      throw new CascadeError(
        `${campaign.id} session lease_ttl_ms must exceed max_step_duration_ms`,
      );
    }
  }
  const claims = await Promise.all(
    campaign.claim_files.map((file) =>
      loadFile<ClaimDefinition>(file, "product-evals/claims/", validateClaim),
    ),
  );
  const artifactPolicy = await loadFile<SimulationArtifactPolicy>(
    "product-evals/artifact-policy.json",
    "product-evals/",
    validateSimulationArtifactPolicy,
  );
  const policies = await Promise.all(
    campaign.policy_files.map((file) =>
      loadFile<PolicyDefinition>(file, "product-evals/policies/", validatePolicy),
    ),
  );
  const oracles = await Promise.all(
    campaign.oracle_files.map((file) =>
      loadFile<OracleDefinition>(file, "product-evals/oracles/", validateOracle),
    ),
  );

  for (const [items, label] of [
    [populations, "population"],
    [scenarios, "scenario"],
    [metrics, "metric"],
    [treatments, "treatment"],
    [tasks, "task"],
    [claims, "claim"],
    [policies, "policy"],
    [oracles, "oracle"],
  ] as Array<[Array<{ id: string }>, string]>) {
    uniqueIds(items, label);
  }

  const actorIds = new Set(populations.flatMap((item) => item.actors.map((actor) => actor.id)));
  const scenarioIds = new Set(scenarios.map((item) => item.id));
  const claimIds = new Set(claims.map((item) => item.id));
  const policyIds = new Set(policies.map((item) => item.id));
  const oracleIds = new Set(oracles.map((item) => item.id));
  const metricIds = new Set(metrics.map((item) => item.id));
  const treatmentIds = new Set(treatments.map((item) => item.id));

  if (seedBinding) {
    for (const mapping of seedBinding.definition.mappings) {
      assertReferences(mapping.campaign_claim_ids, claimIds, `${mapping.source_claim_id}.campaign_claim_ids`);
      assertReferences(mapping.scenario_ids, scenarioIds, `${mapping.source_claim_id}.scenario_ids`);
      assertReferences(mapping.task_ids, new Set(tasks.map((item) => item.id)), `${mapping.source_claim_id}.task_ids`);
    }
  }

  for (const scenario of scenarios) {
    assertReferences(scenario.actor_ids, actorIds, `${scenario.id}.actor_ids`);
    assertReferences(scenario.claim_ids, claimIds, `${scenario.id}.claim_ids`);
  }
  for (const item of dataset.cases) {
    assertReferences([item.actor_id], actorIds, `${item.id}.actor_id`);
    assertReferences([item.scenario_id], scenarioIds, `${item.id}.scenario_id`);
  }
  for (const task of tasks) {
    assertReferences(task.oracle_ids, oracleIds, `${task.id}.oracle_ids`);
    assertReferences(task.policy_ids ?? [], policyIds, `${task.id}.policy_ids`);
    for (const action of task.actions ?? []) {
      if (!world.allowed_actions.includes(action.type)) {
        throw new CascadeError(
          `${task.id} action ${action.type} is not allowed by world ${world.id}`,
        );
      }
    }
    validateTaskPolicyApplicability(campaign, task, policies);
  }
  if (intake?.status === "READY" && !options.allowStaleIntake) {
    await validateReadySimulationIntakeEnvelopeBinding(intake);
    if (intake.scope === "product") {
      await validateReadySimulationIntakeProductContextBinding(intake);
      if (!seedBinding) {
        throw new CascadeError(`${intake.id} READY product intake has no current seed binding`);
      }
      const seedBlockers = simulationSeedBindingBlockers({
        binding: seedBinding.definition,
        campaignId: campaign.id,
        campaignSha256,
        envelope: (await readBoundedTaskEnvelopeSnapshot(
          rootPath(intake.task_envelope!.path),
          `${intake.id} Task Envelope snapshot`,
        )).envelope,
        campaignClaimIds: claimIds,
        scenarioIds,
        taskIds: new Set(tasks.map((item) => item.id)),
      });
      if (seedBlockers.length) {
        throw new CascadeError(`${intake.id} seed binding is not current: ${seedBlockers.join("; ")}`);
      }
      if (stableJson(intake.seed_binding) !== stableJson(buildSimulationSeedBindingProjection(seedBinding))) {
        throw new CascadeError(`${intake.id} seed binding projection is stale or mismatched`);
      }
    }
    if (intake.tasks.length !== tasks.length) {
      throw new CascadeError(`${intake.id} task coverage is incomplete`);
    }
    const policyDigestById = new Map(
      await Promise.all(policies.map(async (policy, index) => [policy.id, await sha256File(rootPath(campaign.policy_files[index]!))] as const)),
    );
    for (const task of tasks) {
      const binding = intake.tasks.find((item) => item.task_id === task.id);
      const policyActions = taskPolicyActions(task);
      if (!binding || binding.actions.length !== policyActions.length) {
        throw new CascadeError(`${intake.id} task action coverage is incomplete: ${task.id}`);
      }
      const applicable = new Set<string>();
      for (const [actionIndex, action] of policyActions.entries()) {
        const actionBinding = binding.actions.find((item) => item.action_index === actionIndex);
        const matching = policies.filter((policy) => policyAppliesToObservation(policy, {
          campaign_id: campaign.id,
          task_id: task.id,
          task_kind: task.kind,
          driver_type: task.driver.type,
          action,
        }));
        matching.forEach((policy) => applicable.add(policy.id));
        const expectedIds = matching.map((policy) => policy.id).sort();
        const expectedDigests = expectedIds.map((id) => policyDigestById.get(id)!).sort();
        const expectedDecision = matching.length === 0
          ? "GAP"
          : matching.length > 1
          ? "AMBIGUOUS"
          : matching[0]!.effect;
        if (!actionBinding ||
          actionBinding.action_binding_version !== ACTION_BINDING_VERSION ||
          actionBinding.action_binding_digest !== actionBindingDigest(action) ||
          stableJson([...actionBinding.applicable_policy_ids].sort()) !== stableJson(expectedIds) ||
          stableJson([...actionBinding.policy_digests].sort()) !== stableJson(expectedDigests) ||
          actionBinding.decision !== expectedDecision) {
          throw new CascadeError(`${intake.id} action policy binding is stale: ${task.id}/${actionIndex}`);
        }
      }
      if (stableJson([...binding.declared_policy_ids].sort()) !== stableJson([...(task.policy_ids ?? [])].sort()) ||
        stableJson([...binding.applicable_policy_ids].sort()) !== stableJson([...applicable].sort()) ||
        stableJson([...(task.policy_ids ?? [])].sort()) !== stableJson([...applicable].sort())) {
        throw new CascadeError(`${intake.id} declared and applicable policy sets differ: ${task.id}`);
      }
    }
  }
  for (const claim of claims) {
    if (claim.population_authority !== "none") {
      const populationId = claim.scope.population_id as string;
      assertReferences([populationId], new Set(populations.map((item) => item.id)), `${claim.id}.scope.population_id`);
    }
    assertReferences(
      claim.required_policy_ids,
      policyIds,
      `${claim.id}.required_policy_ids`,
    );
    assertReferences(
      claim.required_oracle_ids,
      oracleIds,
      `${claim.id}.required_oracle_ids`,
    );
    assertReferences(
      claim.required_metric_ids,
      metricIds,
      `${claim.id}.required_metric_ids`,
    );
  }
  const specializedEvaluation = campaign.specialized_evaluation;
  if (specializedEvaluation?.applicability === "REQUIRED") {
    assertReferences(
      specializedEvaluation.claim_ids,
      new Set(claims.map((claim) => claim.id)),
      `${campaign.id}.specialized_evaluation.claim_ids`,
    );
  }
  for (const metric of metrics) {
    if (metric.source.oracle_id) {
      assertReferences([metric.source.oracle_id], oracleIds, `${metric.id}.source`);
    }
    if (
      metric.source.rubric_id &&
      (!rubric || metric.source.rubric_id !== rubric.id)
    ) {
      throw new CascadeError(
        `${metric.id}.source.rubric_id does not match the campaign evaluation rubric`,
      );
    }
  }
  if (treatments.filter((item) => item.baseline).length !== 1) {
    throw new CascadeError("simulation must define exactly one baseline treatment");
  }
  if (calibration) {
    if (calibration.simulation_id !== simulation.id) {
      throw new CascadeError(`${calibration.id}.simulation_id does not match`);
    }
    if (calibration.dataset_id !== dataset.id) {
      throw new CascadeError(`${calibration.id}.dataset_id does not match`);
    }
    assertReferences(
      calibration.treatment_ids,
      treatmentIds,
      `${calibration.id}.treatment_ids`,
    );
    assertReferences(
      calibration.metric_ids,
      metricIds,
      `${calibration.id}.metric_ids`,
    );
    const baseline = treatments.find((item) => item.baseline)!;
    if (!calibration.treatment_ids.includes(baseline.id)) {
      throw new CascadeError(
        `${calibration.id}.treatment_ids must include baseline ${baseline.id}`,
      );
    }
    for (const metricId of calibration.metric_ids) {
      const metric = metrics.find((item) => item.id === metricId)!;
      const missingSlices = metric.required_slices.filter(
        (slice) => !calibration.required_slices.includes(slice),
      );
      if (missingSlices.length) {
        throw new CascadeError(
          `${calibration.id}.required_slices missing ${metric.id} slices: ` +
            missingSlices.join(", "),
        );
      }
    }
    for (const row of [...simulatedScores, ...referenceScores]) {
      assertReferences([row.treatment_id], treatmentIds, "score treatment_id");
      assertReferences([row.metric_id], metricIds, "score metric_id");
      if (!dataset.cases.some((item) => item.id === row.case_id)) {
        throw new CascadeError(`score case_id unknown reference: ${row.case_id}`);
      }
      const scoreCase = dataset.cases.find((item) => item.id === row.case_id)!;
      if (scoreCase.partition !== "calibration-reference") {
        throw new CascadeError(
          `score case_id must use calibration-reference partition: ${row.case_id}`,
        );
      }
    }
    if (
      calibration.thresholds.minimum_human_agreement > 0 &&
      referenceScores.some(
        (row) =>
          typeof row.human_label !== "number" ||
          typeof row.judge_label !== "number",
      )
    ) {
      throw new CascadeError(
        `${calibration.id} requires human_label and judge_label on every reference score`,
      );
    }
  }

  const sourceFiles = [
    ...CAMPAIGN_FIXED_SOURCE_FILES,
    campaign.evaluation_profile_file,
    ...(evaluationProfile.rubric_file ? [evaluationProfile.rubric_file] : []),
    rel(path),
    campaign.simulation_file,
    ...simulation.population_files,
    ...personaDerivations.flatMap((item) => [
      item.path,
      ...item.manifest.product_personas.map((persona) => persona.path),
    ]),
    ...simulation.scenario_files,
    simulation.world_file,
    world.fixture_file,
    simulation.dataset_file,
    ...simulation.metric_files,
    ...simulation.treatment_files,
    ...(simulation.calibration_file ? [simulation.calibration_file] : []),
    ...(calibration
      ? [calibration.simulated_scores_file, calibration.reference_scores_file]
      : []),
    ...campaign.task_files,
    ...tasks.flatMap((task) => task.inputs ?? []),
    ...campaign.claim_files,
    ...campaign.policy_files,
    ...campaign.oracle_files,
    ...(campaign.seed_binding_file ? [campaign.seed_binding_file] : []),
    ...(campaign.intake_file ? [campaign.intake_file] : []),
    ...(intake?.status === "READY" && intake.task_envelope ? [intake.task_envelope.path] : []),
    ...(intake?.status === "READY" && intake.product_context
      ? [intake.product_context.brief_path, intake.product_context.output_path]
      : []),
  ];
  uniqueStrings(sourceFiles, "resolved source files");
  const sourceDigests = await Promise.all(
    sourceFiles.map(async (file) => ({
      path: file,
      sha256: file === seedBinding?.path
        ? seedBinding.sha256
        : await sha256File(rootPath(file)),
    })),
  );

  return {
    path,
    campaign,
    evaluationProfile,
    rubric,
    simulation,
    populations,
    personaDerivations,
    scenarios,
    world,
    fixture,
    dataset,
    metrics,
    treatments,
    calibration,
    simulatedScores,
    referenceScores,
    tasks,
    claims,
    artifactPolicy,
    policies,
    oracles,
    intake,
    seedBinding,
    sourceFiles,
    sourceDigests,
  };
}

export async function findCampaignPath(value: string): Promise<string> {
  const direct = resolve(rootPath(), value);
  if (await isFile(direct)) return direct;
  const byId = rootPath("product-evals/campaigns", `${value}.json`);
  if (await isFile(byId)) return byId;
  throw new CascadeError(`campaign not found: ${value}`);
}
