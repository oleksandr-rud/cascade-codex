import { resolve } from "node:path";

import {
  CascadeError,
  boundedPath,
  isFile,
  readJson,
  rel,
  rootPath,
  sha256File,
  sha256Text,
  stableJson,
} from "./common";
import {
  type PersonaDerivationManifest,
  type PersonaDerivedPopulation,
  samePersonaReferences,
  validatePersonaDerivation,
  validatePersonaDerivedPopulation,
  verifyPersonaDerivationSources,
} from "./persona-simulations";

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
}

export interface SimulationIntakeDefinition {
  schema_version: 1;
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
    product_refs: Record<string, string[]>;
  };
  claims: Array<{
    claim_id: string;
    source_claim_id: string;
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
      action_digest: string;
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

export interface HttpRequestDefinition {
  method: HttpMethod;
  url: string;
  headers?: Record<string, string>;
  body?: string;
}

export interface ProcessExecAction {
  type: "process-exec";
  argv: string[];
}

export interface HttpRequestAction {
  type: "http-request";
  method: HttpMethod;
  url: string;
  headers?: Record<string, string>;
  body?: string;
}

export type SimulationAction =
  | TaskAction
  | ProcessExecAction
  | HttpRequestAction;

export function taskPolicyActions(task: TaskDefinition): SimulationAction[] {
  if (task.driver.type === "direct-process") {
    return [{ type: "process-exec", argv: task.command ?? [] }];
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
  return task.actions ?? [];
}

export interface TaskDefinition {
  schema_version: 1;
  id: string;
  kind: TaskKind;
  driver: { type: DriverType; adapter?: string };
  required: boolean;
  timeout_ms: number;
  command?: string[];
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
  type: "state-equals" | "exit-code" | "file-exists" | "http-status";
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
  requireString(value, "simulation_file", label);
  if (value.intake_file !== undefined) requireString(value, "intake_file", label);
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

export function validateSimulationIntake(
  value: Record<string, unknown>,
  label: string,
): void {
  if (value.schema_version !== 1 || value.artifact_type !== "cascade-simulation-intake") {
    throw new CascadeError(`${label} simulation intake identity is invalid`);
  }
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
  if (Number.isNaN(Date.parse(requireString(value, "produced_at", label)))) {
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
  if (value.scope === "harness" && value.product_context !== null) {
    throw new CascadeError(`${label} harness intake cannot bind product context`);
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
      !DIGEST.test(requireString(envelope, "sha256", label))) {
      throw new CascadeError(`${label}.task_envelope binding is invalid`);
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
  const claims = value.claims as Array<Record<string, unknown>>;
  uniqueStrings(claims.map((claim) => requireString(claim, "claim_id", label)), `${label}.claim_id`);
  uniqueStrings(claims.map((claim) => requireString(claim, "source_claim_id", label)), `${label}.source_claim_id`);
  for (const claim of claims) {
    if (!new Set(["PROVIDED", "VERIFIED", "INFERRED", "UNKNOWN", "CONFLICTING"]).has(requireString(claim, "status", label))) {
      throw new CascadeError(`${label} claim status is invalid`);
    }
    uniqueStrings(requireArray<string>(claim, "policy_tags", label), `${label}.claim policy tags`);
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
        !DIGEST.test(requireString(action, "action_digest", label))) {
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
  if (Number.isNaN(Date.parse(referenceEnd))) {
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
  assertSchema(value, label);
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
    const command = requireArray<string>(value, "command", label);
    if (!command.length) throw new CascadeError(`${label}.command must not be empty`);
  }
  if (driverType === "http-client") {
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
        if (!name.trim() || typeof headerValue !== "string") {
          throw new CascadeError(
            `${label}.request.headers must contain non-empty string pairs`,
          );
        }
      }
    }
    if (request.body !== undefined && typeof request.body !== "string") {
      throw new CascadeError(`${label}.request.body must be a string`);
    }
    if (["GET", "HEAD"].includes(method) && request.body !== undefined) {
      throw new CascadeError(`${label}.request.body is not allowed for ${method}`);
    }
  } else if (value.request !== undefined) {
    throw new CascadeError(`${label}.request requires the http-client driver`);
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
    requireString(authority, "key_id", `${label}.confirmation_authority`);
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

function validateOracle(value: Record<string, unknown>, label: string): void {
  assertSchema(value, label);
  assertId(requireString(value, "id", label), label);
  const type = requireString(value, "type", label);
  if (
    !new Set(["state-equals", "exit-code", "file-exists", "http-status"]).has(
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
  if (type === "file-exists") requireString(value, "file", label);
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
      { type: "process-exec", argv: task.command ?? [] },
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
}

export async function resolveCampaign(
  campaignPath: string,
  options: { allowStaleIntake?: boolean } = {},
): Promise<ResolvedCampaign> {
  const path = boundedPath(campaignPath, "product-evals/campaigns/");
  const campaign = await loadFile<CampaignDefinition>(
    rel(path),
    "product-evals/campaigns/",
    validateCampaign,
  );
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
  if (simulation.simulation_scope === "product" && !campaign.intake_file) {
    throw new CascadeError(`${campaign.id} product campaign requires intake_file`);
  }
  const intake = campaign.intake_file
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
    const envelope = intake.task_envelope!;
    const envelopePath = boundedPath(envelope.path, `product-evals/intakes/${intake.scope}/task-envelopes/`);
    if (!(await isFile(envelopePath)) || await sha256File(envelopePath) !== envelope.sha256) {
      throw new CascadeError(`${intake.id} task envelope binding is stale`);
    }
    if (intake.product_context) {
      const context = intake.product_context;
      const briefPath = boundedPath(context.brief_path, "docs/specs/");
      const outputPath = boundedPath(context.output_path, "docs/specs/");
      if (!(await isFile(briefPath)) || await sha256File(briefPath) !== context.sha256 ||
        !(await isFile(outputPath)) || await sha256File(outputPath) !== context.output_sha256) {
        throw new CascadeError(`${intake.id} product context binding is stale`);
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
        if (!actionBinding || actionBinding.action_digest !== sha256Text(stableJson(action)) ||
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
    "package.json",
    "scripts/cascade.ts",
    "scripts/cascade/common.ts",
    "scripts/cascade/campaign-artifacts.ts",
    "scripts/cascade/campaign-policies.ts",
    "scripts/cascade/campaigns.ts",
    "scripts/cascade/evaluations.ts",
    "scripts/cascade/simulations.ts",
    "scripts/cascade/simulation-intake.ts",
    "scripts/cascade/simulation-definitions.ts",
    "scripts/cascade/persona-simulations.ts",
    ".codex/skills/simulation-campaigns/templates/starter/package.template.json",
    ".codex/skills/simulation-campaigns/templates/campaign-design.md",
    ".codex/agents/simulation-evaluator.toml",
    ".codex/agents/simulation-evaluator/AGENT.md",
    ".codex/agents/simulation-evaluator/skills.yaml",
    ".codex/skills/simulation-evaluation/SKILL.md",
    ".codex/skills/simulation-evaluation/checklists/evaluation-quality.md",
    "product-evals/campaigns/schema.json",
    "product-evals/campaigns/run-artifact.schema.json",
    "product-evals/intakes/schema.json",
    "product-evals/rubrics/schema.json",
    "product-evals/rubrics/evaluation-profile.schema.json",
    "product-evals/rubrics/simulation-evaluation-output.schema.json",
    "product-evals/rubrics/evaluation-receipt.schema.json",
    campaign.evaluation_profile_file,
    ...(evaluationProfile.rubric_file ? [evaluationProfile.rubric_file] : []),
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
    ...campaign.claim_files,
    ...campaign.policy_files,
    ...campaign.oracle_files,
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
      sha256: await sha256File(rootPath(file)),
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
