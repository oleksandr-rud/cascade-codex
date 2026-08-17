import { mkdir, mkdtemp, readdir, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, relative, resolve, sep } from "node:path";

import {
  CascadeError,
  assertJsonSchema,
  boolFlag,
  boundedPath,
  compareRfc3339Instants,
  confirmationSecretBytes,
  flag,
  flags,
  isFile,
  parseRfc3339Instant,
  parseArgs,
  readBoundedRegularFile,
  readJson,
  rel,
  rootPath,
  runCommand,
  sha256File,
  stableJson,
  utcNow,
  valueDigest,
  walkFiles,
  writeJsonAtomic,
  writeJsonExclusive,
  writeTextExclusive,
} from "./common";
import {
  cascadeHarnessCodexCommand,
  gradeCascadeHarnessTrace,
  resolveCascadeHarnessProfile,
  type ResolvedCascadeHarnessProfile,
} from "./evals";
import {
  type CampaignIdentityEnvelope,
  type FrozenCampaignArtifact,
  type CampaignRunReservation,
  CampaignArtifactStore,
} from "./campaign-artifacts";
import {
  buildRetryLineageReceipt,
  retryLineageReceiptDigest,
  verifyRetryLineageReceipt,
  type RetryLineageReceipt,
  type RetryMode,
  type VerifiedRetryLineageParent,
} from "./retry-lineage";
import {
  runtimeHandoffReceiptDigest,
  validateRuntimeHandoffReceipt,
  type RuntimeHandoffReceipt,
} from "./runtime-handoffs";
import {
  type CampaignPolicyBudgetUsage,
  type CampaignPolicyConfirmationUsage,
  type CampaignPolicyDecision,
  type PolicyConfirmationReceipt,
  CAMPAIGN_REDACTION_CAPABILITIES,
  CAMPAIGN_SUPPORTED_BUDGET_DIMENSIONS,
  applyPolicyOutputControls,
  consumePolicyBudget,
  consumePolicyOutputBudget,
  resolvePolicyDecision,
  validatePolicyConfirmationReceipt,
} from "./campaign-policies";
import {
  type CodexEvaluationOutput,
  type EvaluationIdentity,
  type EvaluationReceipt,
  type EvaluationRequest,
  type MechanicalEvaluation,
  buildCodexEvaluationReceipt,
  buildFixtureEvaluationReceipt,
  assertTerminalStatusMatchesClaimLedger,
  claimLedgerTerminalStatus,
  evaluationInputDigest,
  parseCodexJsonl,
  runCodexEvaluation,
} from "./evaluations";
import { reduceEvaluations, type EvaluationReduction } from "./evaluation-reducer";
import {
  buildCalibrationAuthority,
  buildMechanicalEvaluationAuthority,
  applyFakeActionAuthority,
  observeFileExistsAuthority,
  requiredPolicyEvidenceProjection,
  type CalibrationReceipt,
} from "./evaluation-authority";
import {
  buildNotApplicableSpecializedEvaluationReceipt,
  verifySpecializedEvaluationReceipt,
  type SpecializedEvaluationReceipt,
  type SpecializedEvidenceArtifact,
} from "./harness-evaluation-receipts";
import {
  ACTION_BINDING_VERSION,
  actionBindingDigest,
  assertSafeSimulationAction,
  assertCampaignConfirmationKeyId,
  type CampaignStatus,
  type BrowserAction,
  type DesktopAction,
  type ClaimDefinition,
  type ClaimStatus,
  type DriverType,
  type HttpMethod,
  type HttpRequestDefinition,
  type HttpRequestValue,
  type OracleDefinition,
  type PolicyDefinition,
  type ResolvedCampaign,
  type TaskAction,
  type TaskDefinition,
  type TerminalStep,
  type SimulationAction,
  type SecretReference,
  findCampaignPath,
  resolveCampaign,
  taskPolicyActions,
} from "./simulation-definitions";
import type { PersonaRefinementProposal } from "./persona-simulations";
import {
  runSimulationSession,
  type SimulationSessionCheckpoint,
  type SimulationSessionContract,
  type SimulationSessionPersistence,
  type SimulationSessionStep,
  type SimulationSessionStepResult,
  type SimulationSurfaceIdentity,
  type SimulationSurfaceSession,
  type SimulationSurfaceUpdate,
} from "./simulation-sessions";

const CAMPAIGN_ROOT = rootPath("product-evals/campaigns");
const ARTIFACT_ROOT = rootPath(".artifacts/product-evals");
const CATALOG_PATH = rootPath("product-evals/campaigns/catalog.generated.json");
export const MAX_CONFIRMATION_RECEIPT_BYTES = 64 * 1024;
export const MAX_CONFIRMATION_RECEIPTS = 32;
export const MAX_CONFIRMATION_RECEIPT_TOTAL_BYTES = 256 * 1024;

function confirmationSecretRecord(
  values: Readonly<Record<string, string>>,
): Record<string, string> {
  const result = Object.create(null) as Record<string, string>;
  for (const [keyId, secret] of Object.entries(values)) {
    assertCampaignConfirmationKeyId(keyId, "confirmation key_id");
    confirmationSecretBytes(secret, `confirmation secret ${keyId}`);
    result[keyId] = secret;
  }
  return result;
}

function assertConfirmationSecretEnvironmentName(
  name: string,
  label: string,
): void {
  if (!/^[A-Z][A-Z0-9_]+$/.test(name)) {
    throw new CascadeError(`${label} is invalid`);
  }
}

function confirmationSecretEnvironmentNames(
  policies: readonly PolicyDefinition[],
): string[] {
  const names = new Set<string>();
  for (const policy of policies) {
    const authority = policy.confirmation_authority;
    if (!authority) continue;
    assertCampaignConfirmationKeyId(
      authority.key_id,
      `policy ${policy.id} confirmation key_id`,
    );
    assertConfirmationSecretEnvironmentName(
      authority.secret_env,
      `policy ${policy.id} confirmation secret_env`,
    );
    names.add(authority.secret_env);
  }
  return [...names].sort();
}

export function prepareCampaignConfirmationAuthority(
  resolved: Pick<ResolvedCampaign, "policies">,
): {
  confirmation_secrets: Record<string, string>;
  child_env_omit: string[];
} {
  const childEnvOmit = confirmationSecretEnvironmentNames(resolved.policies);
  const confirmationSecrets = Object.create(null) as Record<string, string>;
  try {
    for (const policy of resolved.policies) {
      const authority = policy.confirmation_authority;
      if (!authority) continue;
      const secret = process.env[authority.secret_env];
      if (secret === undefined) continue;
      confirmationSecretBytes(
        secret,
        `policy ${policy.id} confirmation secret`,
      );
      confirmationSecrets[authority.key_id] = secret;
    }
  } finally {
    for (const name of childEnvOmit) delete process.env[name];
  }
  return {
    confirmation_secrets: confirmationSecretRecord(confirmationSecrets),
    child_env_omit: childEnvOmit,
  };
}

export type PolicyDecision = CampaignPolicyDecision;

export interface ComputerUseLoopObservation {
  sequence: number;
  action_index: number | null;
  reason: "INITIAL" | "POST_ACTION" | "POLICY_STOP";
  payload: Record<string, unknown>;
}

export interface ComputerUseLoopResult {
  status:
    | "COMPLETED"
    | "DENIED"
    | "CONFIRMATION_REQUIRED"
    | "BLOCKED"
    | "CANCELLED";
  earliest_failure: string | null;
  proposed_action_count: number;
  executed_action_count: number;
  decisions: PolicyDecision[];
  executed_actions: SimulationAction[];
  observations: ComputerUseLoopObservation[];
}

/**
 * Shared action-level seam for Computer Use and structured browser tools.
 * Provider responses stay outside this helper; each normalized action is
 * authorized immediately before dispatch, and every stop emits a fresh
 * observation without executing the denied or later actions.
 */
export async function runBoundedComputerUseLoop(input: {
  batches: readonly (readonly SimulationAction[])[];
  max_actions: number;
  authorize: (action: SimulationAction, actionIndex: number) => PolicyDecision;
  dispatch: (action: SimulationAction, decision: PolicyDecision) => Promise<void>;
  observe: (input: {
    action_index: number | null;
    reason: ComputerUseLoopObservation["reason"];
  }) => Promise<Record<string, unknown>>;
  signal?: AbortSignal;
}): Promise<ComputerUseLoopResult> {
  if (!Number.isInteger(input.max_actions) || input.max_actions < 1) {
    throw new CascadeError("Computer Use max_actions must be a positive integer");
  }
  if (!input.batches.length || input.batches.some((batch) => !batch.length)) {
    throw new CascadeError("Computer Use responses must contain non-empty action batches");
  }
  const actions = input.batches.flatMap((batch) => [...batch]);
  if (actions.length > input.max_actions) {
    throw new CascadeError("Computer Use action batches exceed the declared action budget");
  }
  for (const action of actions) assertSafeSimulationAction(action);
  const observations: ComputerUseLoopObservation[] = [{
    sequence: 0,
    action_index: null,
    reason: "INITIAL",
    payload: clone(await input.observe({ action_index: null, reason: "INITIAL" })),
  }];
  const decisions: PolicyDecision[] = [];
  const executedActions: SimulationAction[] = [];
  for (const [actionIndex, action] of actions.entries()) {
    if (input.signal?.aborted) {
      return {
        status: "CANCELLED",
        earliest_failure: "Computer Use loop cancelled before the next action",
        proposed_action_count: actions.length,
        executed_action_count: executedActions.length,
        decisions,
        executed_actions: executedActions,
        observations,
      };
    }
    const decision = input.authorize(action, actionIndex);
    decisions.push(decision);
    if (decision.decision !== "ALLOW") {
      observations.push({
        sequence: observations.length,
        action_index: actionIndex,
        reason: "POLICY_STOP",
        payload: clone(await input.observe({
          action_index: actionIndex,
          reason: "POLICY_STOP",
        })),
      });
      return {
        status: decision.decision === "DENY"
          ? "DENIED"
          : decision.decision === "REQUIRE_CONFIRMATION"
            ? "CONFIRMATION_REQUIRED"
            : "BLOCKED",
        earliest_failure: decision.reason,
        proposed_action_count: actions.length,
        executed_action_count: executedActions.length,
        decisions,
        executed_actions: executedActions,
        observations,
      };
    }
    await input.dispatch(action, decision);
    executedActions.push(clone(action));
    observations.push({
      sequence: observations.length,
      action_index: actionIndex,
      reason: "POST_ACTION",
      payload: clone(await input.observe({
        action_index: actionIndex,
        reason: "POST_ACTION",
      })),
    });
  }
  return {
    status: "COMPLETED",
    earliest_failure: null,
    proposed_action_count: actions.length,
    executed_action_count: executedActions.length,
    decisions,
    executed_actions: executedActions,
    observations,
  };
}

export async function loadPolicyConfirmationReceipts(
  receiptPaths: readonly string[],
): Promise<PolicyConfirmationReceipt[]> {
  if (receiptPaths.length > MAX_CONFIRMATION_RECEIPTS) {
    throw new CascadeError(
      `confirmation receipt count exceeds ${MAX_CONFIRMATION_RECEIPTS}`,
    );
  }
  const receipts: PolicyConfirmationReceipt[] = [];
  let totalBytes = 0;
  for (const receiptPath of receiptPaths) {
    const bytes = await readBoundedRegularFile(
      boundedPath(receiptPath),
      `confirmation receipt ${receiptPath}`,
      {
        maxBytes: MAX_CONFIRMATION_RECEIPT_BYTES,
        requireMaintainersOnly: true,
      },
    );
    totalBytes += bytes.byteLength;
    if (totalBytes > MAX_CONFIRMATION_RECEIPT_TOTAL_BYTES) {
      throw new CascadeError(
        `confirmation receipt inputs exceed ${MAX_CONFIRMATION_RECEIPT_TOTAL_BYTES} bytes in aggregate`,
      );
    }
    let receipt: unknown;
    try {
      receipt = JSON.parse(bytes.toString("utf8"));
    } catch {
      throw new CascadeError(`confirmation receipt ${receiptPath} is invalid JSON`);
    }
    validatePolicyConfirmationReceipt(receipt);
    receipts.push(receipt);
  }
  const receiptIds = new Set<string>();
  for (const receipt of receipts) {
    if (receiptIds.has(receipt.receipt_id)) {
      throw new CascadeError(
        `duplicate confirmation receipt id: ${receipt.receipt_id}`,
      );
    }
    receiptIds.add(receipt.receipt_id);
  }
  return receipts;
}

export interface OracleResult {
  oracle_id: string;
  type: string;
  status: "PASS" | "FAIL";
  expected?: unknown;
  actual?: unknown;
  evidence?: string;
  error?: string;
}

export type TaskExecutionOutcome =
  | "SUCCEEDED"
  | "FAILED"
  | "BLOCKED"
  | "CANCELLED"
  | "UNKNOWN_OUTCOME";

export type TaskSideEffectStatus = "NONE" | "KNOWN" | "UNKNOWN";
export type TaskCleanupStatus =
  | "VERIFIED"
  | "FAILED"
  | "UNKNOWN"
  | "NOT_REQUIRED";
export type TaskRecoveryStatus =
  | "NOT_REQUIRED"
  | "RECOVERED"
  | "FAILED"
  | "UNSUPPORTED";

export interface TaskCommandResult {
  argv: string[];
  exit_code: number;
  timed_out: boolean;
  aborted: boolean;
  stdout: string;
  stderr: string;
  duration_ms: number;
  termination_signal: "SIGTERM" | "SIGKILL" | null;
  execution_control: {
    provider: "darwin-sandbox-exec-v1";
    working_directory: "task-root";
    inherited_environment: false;
    environment_names: string[];
    secret_reference_names: string[];
    interactive: false;
    network: "deny";
    filesystem: {
      read: "host";
      write: "task-root";
    };
  };
  output_control?: {
    policy_id: string;
    max_output_bytes: number;
    budget_consumed_bytes: number;
    original_bytes: number;
    retained_bytes: number;
    redacted: boolean;
    truncated: boolean;
  };
}

export interface TaskHttpResult {
  method: HttpMethod;
  url: string;
  status: number;
  content_type: string | null;
  body: string;
  redirected: boolean;
  output_control: {
    policy_id: string;
    max_output_bytes: number;
    budget_consumed_bytes: number;
    original_bytes: number;
    retained_bytes: number;
    redacted: boolean;
    truncated: boolean;
  };
}

export interface TaskSurfaceRef {
  kind: TaskDefinition["kind"];
  session_id: string;
  surface_id: string;
  screen_id?: string;
}

export interface TaskObservation {
  type: string;
  surface: TaskSurfaceRef;
  payload: Record<string, unknown>;
}

export interface TaskCleanupResult {
  status: TaskCleanupStatus;
  attempted: boolean;
  verified: boolean;
  residual_resources: string[];
  reason: string | null;
}

export interface TaskRecoveryResult {
  status: TaskRecoveryStatus;
  attempted: boolean;
  reason: string | null;
}

export type TaskAdapterEvent =
  | {
      event_type: "ACTION";
      index: number;
      type: SimulationAction["type"];
      before: Record<string, unknown>;
      after: Record<string, unknown>;
      status: "PASS" | "FAIL" | "BLOCKED";
      reason: string | null;
      policy_decision: PolicyDecision["decision"];
    }
  | {
      event_type: "PROCESS";
      index: 0;
      type: "process-exec";
      action_binding_version: typeof ACTION_BINDING_VERSION;
      action_binding_digest: string;
      argv: string[];
      process?: TaskDefinition["process"];
      exit_code: number;
      timed_out: boolean;
      aborted: boolean;
      status: "PASS" | "BLOCKED";
    }
  | {
      event_type: "HTTP";
      index: 0;
      type: "http-request";
      action_binding_version: typeof ACTION_BINDING_VERSION;
      action_binding_digest: string;
      method: HttpMethod;
      url: string;
      response_status: number | null;
      response_bytes: number;
      status: "PASS" | "BLOCKED";
    }
  | {
      event_type: "BROWSER";
      index: number;
      type: BrowserAction["type"];
      action_binding_version: typeof ACTION_BINDING_VERSION;
      action_binding_digest: string;
      action: BrowserAction;
      status: "PASS" | "BLOCKED";
      reason: string | null;
    };

type TaskEventPayload =
  | {
      event_type: "LIFECYCLE";
      type: "task-lifecycle";
      phase: "STARTED" | "COMPLETED";
      outcome?: TaskExecutionOutcome;
      status?: CampaignStatus;
    }
  | TaskAdapterEvent
  | {
      event_type: "ORACLE";
      type: "oracle";
      oracle_id: string;
      status: OracleResult["status"];
    }
  | {
      event_type: "RECOVERY";
      type: "recovery";
      status: TaskRecoveryStatus;
      reason: string | null;
    }
  | {
      event_type: "CLEANUP";
      type: "cleanup";
      status: TaskCleanupStatus;
      verified: boolean;
      residual_resources: string[];
      reason: string | null;
    }
  | {
      event_type: "ADAPTER";
      type: "adapter";
      status: "READY" | "BLOCKED";
      adapter_id: string;
      adapter_version: string;
      capabilities: string[];
      reason: string | null;
    }
  | {
      event_type: "BOUNDARY";
      type: "lifecycle-bound";
      phase:
        | "PREFLIGHT"
        | "EXECUTE"
        | "ORACLE"
        | "RECOVERY"
        | "CLEANUP"
        | "FINALIZE";
      status: "TIMED_OUT" | "CANCELLED";
      reason: string;
    };

export type TaskEvent = TaskEventPayload & {
  sequence: number;
  at: string;
  task_id: string;
  driver: DriverType;
};

export interface TaskAdapterContext {
  readonly run_id: string;
  readonly campaign_id: string;
  readonly platform: string;
  readonly task_root: string;
  readonly task: TaskDefinition;
  readonly fixture: Record<string, unknown>;
  readonly policies: PolicyDefinition[];
  readonly cleanup_contract: ResolvedCampaign["world"]["cleanup"];
  readonly budget_usage: CampaignPolicyBudgetUsage;
  readonly dispatch_state: TaskDispatchState;
  readonly record_action_dispatch: (
    decision: CampaignPolicyDecision,
  ) => Promise<void>;
  readonly authorize_action: (input: {
    action_index: number;
    action: SimulationAction;
    projected_output_bytes: number;
  }) => PolicyDecision;
  readonly control_output: (
    value: string,
    policy: PolicyDefinition,
    additional_sensitive_values?: readonly string[],
  ) => ReturnType<typeof applyPolicyOutputControls>;
  readonly child_env_omit: string[];
  readonly secret_resolver?: SecretResolver;
  readonly signal?: AbortSignal;
}

export interface TaskAdapterResult {
  outcome: TaskExecutionOutcome;
  earliest_failure: string | null;
  side_effects: TaskSideEffectStatus;
  policy_decisions: PolicyDecision[];
  events: TaskAdapterEvent[];
  final_state?: Record<string, unknown>;
  command?: TaskCommandResult;
  http?: TaskHttpResult;
  observations?: TaskObservation[];
  produced_evidence?: string[];
}

export interface TaskDispatchState {
  status: "NOT_DISPATCHED" | "DISPATCHED" | "UNKNOWN";
  actions: Array<{
    action_index: number;
    action_type: SimulationAction["type"];
    action_binding_version: typeof ACTION_BINDING_VERSION;
    action_binding_digest: string;
    dispatched_at: string;
  }>;
  uncertainty_reason: string | null;
}

interface CampaignConfirmationUsageRecord {
  schema_version: 2;
  artifact_type: "campaign-confirmation-usage";
  run_id: string;
  campaign_id: string;
  task_id: string;
  receipt_id: string;
  usage: CampaignPolicyConfirmationUsage[string];
}

export interface TaskAdapterFailure {
  outcome: "CANCELLED" | "UNKNOWN_OUTCOME";
  reason: string;
}

export interface TaskAdapter {
  id: string;
  version: string;
  driver: DriverType;
  capabilities: readonly string[];
  preflight(context: TaskAdapterContext): Promise<{
    status: "READY" | "BLOCKED";
    reason: string | null;
  }>;
  execute(context: TaskAdapterContext): Promise<TaskAdapterResult>;
  recover(
    context: TaskAdapterContext,
    failure: TaskAdapterFailure,
  ): Promise<TaskRecoveryResult>;
  cleanup(
    context: TaskAdapterContext,
    result: TaskAdapterResult | null,
  ): Promise<TaskCleanupResult>;
}

export interface TaskOracleEvaluator {
  evaluate(
    oracle: OracleDefinition,
    context: {
      final_state: Record<string, unknown> | undefined;
      command: TaskCommandResult | undefined;
      http: TaskHttpResult | undefined;
      task_root: string;
      signal?: AbortSignal;
    },
  ): Promise<OracleResult>;
}

export interface ExecuteCampaignTaskInput {
  resolved: ResolvedCampaign;
  task: TaskDefinition;
  task_root: string;
  operator_identity: string;
  target_actor_identity: string;
  run_id?: string;
  platform?: string;
  adapters?: ReadonlyMap<string, TaskAdapter>;
  oracle_evaluator?: TaskOracleEvaluator;
  confirmation_receipts?: PolicyConfirmationReceipt[];
  confirmation_secrets?: Record<string, string>;
  child_env_omit?: string[];
  confirmation_usage?: CampaignPolicyConfirmationUsage;
  budget_usage?: CampaignPolicyBudgetUsage;
  artifact_store?: CampaignArtifactStore;
  secret_resolver?: SecretResolver;
  signal?: AbortSignal;
}

export interface SecretResolutionContext {
  campaign_id: string;
  task_id: string;
  sink:
    | { kind: "header"; name: string }
    | { kind: "body"; name: "body" }
    | { kind: "environment"; name: string };
}

export type SecretResolver = (
  reference: Readonly<SecretReference>,
  context: Readonly<SecretResolutionContext>,
) => Promise<string> | string;

export interface TaskResult {
  task_id: string;
  kind: string;
  driver: string;
  adapter: {
    id: string;
    version: string;
    capabilities: string[];
  } | null;
  required: boolean;
  status: CampaignStatus;
  outcome: TaskExecutionOutcome;
  operator_identity: string;
  target_actor_identity: string;
  platform: string;
  started_at: string;
  completed_at: string;
  duration_ms: number;
  earliest_failure: string | null;
  side_effects: TaskSideEffectStatus;
  dispatch: TaskDispatchState;
  policy_decisions: PolicyDecision[];
  policy_decision_digest: string;
  oracle_results: OracleResult[];
  oracle_observations: TaskOracleObservation[];
  events: TaskEvent[];
  final_state?: Record<string, unknown>;
  command?: TaskCommandResult;
  http?: TaskHttpResult;
  observations?: TaskObservation[];
  evidence: FrozenCampaignArtifact[];
  recovery: TaskRecoveryResult;
  cleanup: TaskCleanupResult;
}

export interface TaskOracleObservation {
  schema_version: 1;
  oracle_id: string;
  type: "file-exists" | "task-file-exists";
  file: string;
  observed_at: string;
  present: boolean;
  frozen_evidence: FrozenCampaignArtifact | null;
}

interface AggregationReceipt {
  schema_version: 2;
  aggregation_id: string;
  run_id: string;
  campaign_id: string;
  aggregator_identity: string;
  execution_receipt_digest: string;
  specialized_evaluation_receipt_digest: string | null;
  evaluation_receipt_digest: string;
  calibration_receipt_digest: string | null;
  release_eligible: boolean;
  release_claims: Array<{ claim_id: string; status: ClaimStatus }>;
  status: CampaignStatus;
  created_at: string;
}

interface CampaignSessionTaskSummary {
  task_id: string;
  required: boolean;
  status: CampaignStatus;
  outcome: TaskExecutionOutcome;
  result_digest: string;
}

interface CampaignSessionState {
  task_results: CampaignSessionTaskSummary[];
  budget_usage?: CampaignPolicyBudgetUsage;
  confirmation_usage?: CampaignPolicyConfirmationUsage;
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function valuesEqual(left: unknown, right: unknown): boolean {
  return stableJson(left) === stableJson(right);
}

function pathParts(path: string): string[] {
  const parts = path.split(".").filter(Boolean);
  if (!parts.length || parts.some((part) => part === "__proto__")) {
    throw new CascadeError(`invalid state path: ${path}`);
  }
  return parts;
}

function getStatePath(state: Record<string, unknown>, path: string): unknown {
  let current: unknown = state;
  for (const part of pathParts(path)) {
    if (!current || typeof current !== "object" || Array.isArray(current)) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

async function evaluateOracle(
  oracle: OracleDefinition,
  state: Record<string, unknown> | undefined,
  command: TaskCommandResult | undefined,
  http: TaskHttpResult | undefined,
  taskRoot: string,
): Promise<OracleResult> {
  if (oracle.type === "state-equals") {
    const actual = state && oracle.path ? getStatePath(state, oracle.path) : undefined;
    return {
      oracle_id: oracle.id,
      type: oracle.type,
      status: valuesEqual(actual, oracle.expected) ? "PASS" : "FAIL",
      expected: oracle.expected,
      actual,
    };
  }
  if (oracle.type === "exit-code") {
    const actual = command?.exit_code;
    return {
      oracle_id: oracle.id,
      type: oracle.type,
      status: actual === oracle.expected_exit_code ? "PASS" : "FAIL",
      expected: oracle.expected_exit_code,
      actual,
    };
  }
  if (oracle.type === "http-status") {
    const actual = http?.status;
    return {
      oracle_id: oracle.id,
      type: oracle.type,
      status: actual === oracle.expected_status ? "PASS" : "FAIL",
      expected: oracle.expected_status,
      actual,
    };
  }
  const file = oracle.file!;
  const present = await isFile(
    oracle.type === "task-file-exists"
      ? resolve(taskRoot, file)
      : boundedPath(file),
  );
  return {
    oracle_id: oracle.id,
    type: oracle.type,
    status: present ? "PASS" : "FAIL",
    expected: true,
    actual: present,
    evidence: file,
  };
}

export function createTaskOracleEvaluator(): TaskOracleEvaluator {
  return {
    evaluate: (oracle, context) =>
      evaluateOracle(
        oracle,
        context.final_state,
        context.command,
        context.http,
        context.task_root,
      ),
  };
}

const fakeTaskAdapter: TaskAdapter = {
  id: "builtin-fake",
  version: "1.0.0",
  driver: "fake",
  capabilities: ["deterministic-state", "policy-actions", "cleanup-verified"],
  async preflight() {
    return { status: "READY", reason: null };
  },
  async execute(context): Promise<TaskAdapterResult> {
    const state = clone(context.fixture);
    const policyDecisions: PolicyDecision[] = [];
    const events: TaskAdapterEvent[] = [];
    for (const [index, action] of (context.task.actions ?? []).entries()) {
      if (context.signal?.aborted) {
        return {
          outcome: "CANCELLED",
          earliest_failure: "task cancelled during fake execution",
          side_effects: "NONE",
          policy_decisions: policyDecisions,
          events,
          final_state: clone(state),
        };
      }
      const before = clone(state);
      const policyDecision = context.authorize_action({
        action_index: index,
        action,
        projected_output_bytes: Buffer.byteLength(
          stableJson({ state: before, action }),
        ),
      });
      policyDecisions.push(policyDecision);
      if (policyDecision.decision !== "ALLOW") {
        const status =
          policyDecision.decision === "DENY" ? "FAIL" : "BLOCKED";
        events.push({
          event_type: "ACTION",
          index,
          type: action.type,
          before,
          after: clone(state),
          status,
          reason: policyDecision.reason,
          policy_decision: policyDecision.decision,
        });
        return {
          outcome:
            policyDecision.decision === "DENY" ? "FAILED" : "BLOCKED",
          earliest_failure: policyDecision.reason,
          side_effects: "NONE",
          policy_decisions: policyDecisions,
          events,
          final_state: clone(state),
        };
      }
      consumePolicyBudget(
        policyDecision,
        context.budget_usage,
        Buffer.byteLength(stableJson({ state: before, action })),
      );
      await context.record_action_dispatch(policyDecision);
      const actionResult = applyFakeActionAuthority(state, action);
      events.push({
        event_type: "ACTION",
        index,
        type: action.type,
        before,
        after: clone(state),
        status: actionResult.status,
        reason: actionResult.reason,
        policy_decision: policyDecision.decision,
      });
      if (actionResult.status === "FAIL") {
        return {
          outcome: "FAILED",
          earliest_failure: actionResult.reason,
          side_effects: "NONE",
          policy_decisions: policyDecisions,
          events,
          final_state: clone(state),
        };
      }
    }
    return {
      outcome: "SUCCEEDED",
      earliest_failure: null,
      side_effects: "KNOWN",
      policy_decisions: policyDecisions,
      events,
      final_state: clone(state),
    };
  },
  async recover(): Promise<TaskRecoveryResult> {
    return {
      status: "RECOVERED",
      attempted: true,
      reason: "isolated fixture state discarded",
    };
  },
  async cleanup(context): Promise<TaskCleanupResult> {
    return {
      status: context.cleanup_contract.reset_to_fixture
        ? "VERIFIED"
        : "FAILED",
      attempted: true,
      verified: context.cleanup_contract.reset_to_fixture,
      residual_resources: [],
      reason: context.cleanup_contract.reset_to_fixture
        ? null
        : "fixture reset contract was not satisfied",
    };
  },
};

const directProcessTaskAdapter: TaskAdapter = {
  id: "builtin-direct-process",
  version: "2.0.0",
  driver: "direct-process",
  capabilities: [
    "bounded-process",
    "captured-output",
    "abort-signal",
    "explicit-environment",
    "task-root-write-isolation",
    "network-deny",
  ],
  async preflight(context) {
    if (!context.task.command?.length || !context.task.process) {
      return { status: "BLOCKED", reason: "strict process contract is missing" };
    }
    if (context.platform !== "darwin" || process.platform !== "darwin") {
      return {
        status: "BLOCKED",
        reason: "direct-process isolation provider is unavailable on this platform",
      };
    }
    if (!(await Bun.file("/usr/bin/sandbox-exec").exists())) {
      return {
        status: "BLOCKED",
        reason: "darwin sandbox-exec isolation provider is unavailable",
      };
    }
    if (
      Object.values(context.task.process.environment).some(
        (value) => value.kind === "secret-reference",
      ) && !context.secret_resolver
    ) {
      return { status: "BLOCKED", reason: "trusted secret resolver unavailable" };
    }
    return { status: "READY", reason: null };
  },
  async execute(context): Promise<TaskAdapterResult> {
    const processDefinition = context.task.process!;
    const action: SimulationAction = {
      type: "process-exec",
      argv: context.task.command!,
      process: processDefinition,
    };
    const policyDecision = context.authorize_action({
      action_index: 0,
      action,
      projected_output_bytes: 0,
    });
    const policyDecisions: PolicyDecision[] = [policyDecision];
    const processPolicy = context.policies.find(
      (policy) =>
        policy.id === policyDecision.policy_id &&
        policy.version === policyDecision.policy_version,
    );
    if (policyDecision.decision !== "ALLOW" || !processPolicy) {
      const outcome =
        policyDecision.decision === "REQUIRE_CONFIRMATION" ||
        policyDecision.decision === "BLOCKED"
          ? "BLOCKED"
          : "FAILED";
      return {
        outcome,
        earliest_failure: policyDecision.reason,
        side_effects: "NONE",
        policy_decisions: policyDecisions,
        events: [],
      };
    }
    let resolvedEnvironment: Record<string, string>;
    let secretValues: string[];
    try {
      resolvedEnvironment = {};
      secretValues = [];
      for (const [name, value] of Object.entries(processDefinition.environment)) {
        const resolvedValue = await resolveHttpRequestValue(
          value,
          context.secret_resolver,
          {
            campaign_id: context.campaign_id,
            task_id: context.task.id,
            sink: { kind: "environment", name },
          },
        );
        resolvedEnvironment[name] = resolvedValue;
        if (value.kind === "secret-reference") secretValues.push(resolvedValue);
      }
    } catch (error) {
      return {
        outcome: "BLOCKED",
        earliest_failure:
          error instanceof Error ? error.message : "process environment resolution failed",
        side_effects: "NONE",
        policy_decisions: policyDecisions,
        events: [],
      };
    }
    await mkdir(context.task_root, { recursive: true });
    const taskRoot = await realpath(context.task_root);
    const sandboxEscape = (value: string): string =>
      value.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
    const sandboxProfilePath = resolve(taskRoot, ".cascade-direct-process.sb");
    await writeTextExclusive(
      sandboxProfilePath,
      [
        "(version 1)",
        "(deny default)",
        "(allow process*)",
        "(allow file-read*)",
        `(allow file-write* (subpath "${sandboxEscape(taskRoot)}"))`,
        "(allow sysctl-read)",
        "(allow mach-lookup)",
        "(allow ipc-posix*)",
        "",
      ].join("\n"),
      { fileMode: 0o600 },
    );
    if (context.signal?.aborted) {
      return {
        outcome: "CANCELLED",
        earliest_failure: "process execution cancelled before dispatch",
        side_effects: "NONE",
        policy_decisions: policyDecisions,
        events: [],
      };
    }
    consumePolicyBudget(policyDecision, context.budget_usage);
    await context.record_action_dispatch(policyDecision);
    const result = await runCommand(
      ["/usr/bin/sandbox-exec", "-f", sandboxProfilePath, ...context.task.command!],
      {
      cwd: taskRoot,
      env: resolvedEnvironment,
      inheritEnv: false,
      timeoutMs: context.task.timeout_ms,
      signal: context.signal,
      maxOutputBytes: policyDecision.budgets!.remaining_after.output_bytes,
      },
    );
    const stdoutControl = context.control_output(
      result.stdout,
      processPolicy,
      secretValues,
    );
    const stderrControl = context.control_output(
      result.stderr,
      processPolicy,
      secretValues,
    );
    let controlledStdout = stdoutControl.value;
    let controlledStderr = stderrControl.value;
    const combinedOriginalBytes =
      stdoutControl.original_bytes + stderrControl.original_bytes;
    consumePolicyOutputBudget(
      policyDecision,
      context.budget_usage,
      combinedOriginalBytes + (result.outputLimitExceeded ? 1 : 0),
    );
    if (
      Buffer.byteLength(controlledStdout) + Buffer.byteLength(controlledStderr) >
      processPolicy.budgets.max_output_bytes
    ) {
      const remaining = Math.max(
        0,
        processPolicy.budgets.max_output_bytes -
          Buffer.byteLength(controlledStdout),
      );
      controlledStderr = new TextDecoder().decode(
        Buffer.from(controlledStderr).subarray(0, remaining),
      );
      if (remaining === 0) {
        controlledStdout = new TextDecoder().decode(
          Buffer.from(controlledStdout).subarray(
            0,
            processPolicy.budgets.max_output_bytes,
          ),
        );
      }
    }
    const outputBudgetExceeded =
      result.outputLimitExceeded ||
      policyDecision.budgets!.consumed_after.output_bytes >
        processPolicy.budgets.max_output_bytes;
    const command: TaskCommandResult = {
      argv: context.task.command!,
      exit_code: result.exitCode,
      timed_out: result.timedOut,
      aborted: result.aborted,
      stdout: controlledStdout,
      stderr: controlledStderr,
      duration_ms: result.durationMs,
      termination_signal: result.terminationSignal,
      execution_control: {
        provider: "darwin-sandbox-exec-v1",
        working_directory: processDefinition.working_directory,
        inherited_environment: false,
        environment_names: Object.keys(processDefinition.environment).sort(),
        secret_reference_names: Object.entries(processDefinition.environment)
          .filter(([, value]) => value.kind === "secret-reference")
          .map(([name]) => name)
          .sort(),
        interactive: processDefinition.interactive,
        network: processDefinition.network,
        filesystem: processDefinition.filesystem,
      },
      output_control: {
        policy_id: processPolicy.id,
        max_output_bytes: processPolicy.budgets.max_output_bytes,
        budget_consumed_bytes:
          combinedOriginalBytes + (result.outputLimitExceeded ? 1 : 0),
        original_bytes: combinedOriginalBytes,
        retained_bytes:
          Buffer.byteLength(controlledStdout) +
          Buffer.byteLength(controlledStderr),
        redacted: stdoutControl.redacted || stderrControl.redacted,
        truncated:
          outputBudgetExceeded ||
          stdoutControl.truncated ||
          stderrControl.truncated,
      },
    };
    const interrupted = result.timedOut || result.aborted;
    const outcome = result.aborted
      ? "CANCELLED"
      : result.timedOut
        ? "FAILED"
      : outputBudgetExceeded
        ? "FAILED"
        : "SUCCEEDED";
    return {
      outcome,
      earliest_failure: result.timedOut
        ? "isolated process timed out and was terminated"
        : result.aborted
          ? "isolated process was cancelled and terminated"
          : outputBudgetExceeded
            ? "process output exceeded the governing policy budget"
          : null,
      side_effects: "KNOWN",
      policy_decisions: policyDecisions,
      events: [
        {
          event_type: "PROCESS",
          index: 0,
          type: "process-exec",
          action_binding_version: policyDecision.action_binding_version,
          action_binding_digest: policyDecision.action_binding_digest,
          argv: context.task.command!,
          process: processDefinition,
          exit_code: result.exitCode,
          timed_out: result.timedOut,
          aborted: result.aborted,
          status: interrupted || outputBudgetExceeded ? "BLOCKED" : "PASS",
        },
      ],
      command,
    };
  },
  async recover(): Promise<TaskRecoveryResult> {
    return {
      status: "RECOVERED",
      attempted: true,
      reason: "isolated process termination completed; network and out-of-root writes were denied",
    };
  },
  async cleanup(context): Promise<TaskCleanupResult> {
    if (context.dispatch_state.status === "NOT_DISPATCHED") {
      return {
        status: "NOT_REQUIRED",
        attempted: false,
        verified: true,
        residual_resources: [],
        reason: "process was not dispatched",
      };
    }
    return {
      status: "VERIFIED",
      attempted: true,
      verified: true,
      residual_resources: [],
      reason:
        "owned process exited; writes were confined to the retained task root and network was denied",
    };
  },
};

async function readBoundedResponseBody(
  response: Response,
  maxBytes: number,
): Promise<{ value: string; observed_bytes: number; truncated: boolean }> {
  if (!response.body) {
    return { value: "", observed_bytes: 0, truncated: false };
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let observedBytes = 0;
  let retainedBytes = 0;
  let truncated = false;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      observedBytes += value.byteLength;
      const remaining = Math.max(0, maxBytes - retainedBytes);
      if (remaining > 0) {
        const retained = value.subarray(0, remaining);
        chunks.push(retained);
        retainedBytes += retained.byteLength;
      }
      if (value.byteLength > remaining) {
        truncated = true;
        await reader.cancel("response exceeded policy output budget");
        break;
      }
    }
  } finally {
    reader.releaseLock();
  }
  const merged = new Uint8Array(retainedBytes);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return {
    value: new TextDecoder().decode(merged),
    observed_bytes: observedBytes,
    truncated,
  };
}

function requestHasSecretReferences(request: HttpRequestDefinition): boolean {
  return Object.values(request.headers ?? {}).some(
    (value) => value.kind === "secret-reference",
  ) || request.body?.kind === "secret-reference";
}

async function resolveHttpRequestValue(
  value: HttpRequestValue,
  resolver: SecretResolver | undefined,
  context: SecretResolutionContext,
): Promise<string> {
  if (value.kind === "public-literal") return value.value;
  if (!resolver) throw new CascadeError("trusted secret resolver unavailable");
  const resolved = await resolver(Object.freeze({ ...value }), Object.freeze({
    ...context,
    sink: Object.freeze({ ...context.sink }),
  }));
  if (typeof resolved !== "string" || resolved.length === 0) {
    throw new CascadeError("trusted secret resolution failed");
  }
  return resolved;
}

async function resolveHttpRequestForDispatch(
  request: HttpRequestDefinition,
  resolver: SecretResolver | undefined,
  campaignId: string,
  taskId: string,
): Promise<{ headers: Record<string, string>; body: string | undefined }> {
  const headers: Record<string, string> = {};
  for (const [name, value] of Object.entries(request.headers ?? {})) {
    headers[name] = await resolveHttpRequestValue(value, resolver, {
      campaign_id: campaignId,
      task_id: taskId,
      sink: { kind: "header", name: name.trim().toLowerCase() },
    });
  }
  return {
    headers,
    body: request.body === undefined
      ? undefined
      : await resolveHttpRequestValue(request.body, resolver, {
          campaign_id: campaignId,
          task_id: taskId,
          sink: { kind: "body", name: "body" },
        }),
  };
}

interface TerminalRunnerResult {
  schema_version: 1;
  provider: "node-pty";
  provider_version: "1.1.0";
  platform: string;
  architecture: string;
  raw: string;
  output_bytes: number;
  output_limit_exceeded: boolean;
  exit_code: number | null;
  exit_signal: number | null;
  step_results: Array<{
    index: number;
    type: SimulationAction["type"];
    status: "PASS" | "BLOCKED";
    reason: string | null;
    state: Record<string, unknown>;
  }>;
  captures: Array<{ label: string; raw: string }>;
  earliest_failure: string | null;
  cleanup_verified: boolean;
  final_dimensions: { cols: number; rows: number };
}

const TERMINAL_RUNNER_PATH = rootPath(
  "scripts/cascade/terminal-adapter-runner.mjs",
);
const TERMINAL_PID_FILE = ".cascade-terminal.pid";

function parseTerminalRunnerResult(value: unknown): TerminalRunnerResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new CascadeError("terminal runner returned an invalid result");
  }
  const result = value as Partial<TerminalRunnerResult>;
  if (
    result.schema_version !== 1 ||
    result.provider !== "node-pty" ||
    result.provider_version !== "1.1.0" ||
    typeof result.platform !== "string" ||
    typeof result.architecture !== "string" ||
    typeof result.raw !== "string" ||
    !Number.isInteger(result.output_bytes) ||
    typeof result.output_limit_exceeded !== "boolean" ||
    (result.exit_code !== null && !Number.isInteger(result.exit_code)) ||
    (result.exit_signal !== null && !Number.isInteger(result.exit_signal)) ||
    !Array.isArray(result.step_results) ||
    !Array.isArray(result.captures) ||
    (result.earliest_failure !== null &&
      typeof result.earliest_failure !== "string") ||
    typeof result.cleanup_verified !== "boolean"
  ) {
    throw new CascadeError("terminal runner result contract is invalid");
  }
  if (
    !result.final_dimensions ||
    !Number.isInteger(result.final_dimensions.cols) ||
    !Number.isInteger(result.final_dimensions.rows)
  ) {
    throw new CascadeError("terminal runner final dimensions are invalid");
  }
  for (const [index, step] of result.step_results.entries()) {
    if (
      !step ||
      typeof step !== "object" ||
      step.index !== index ||
      typeof step.type !== "string" ||
      !new Set(["PASS", "BLOCKED"]).has(String(step.status)) ||
      (step.reason !== null && typeof step.reason !== "string") ||
      !step.state ||
      typeof step.state !== "object" ||
      Array.isArray(step.state)
    ) {
      throw new CascadeError("terminal runner step result contract is invalid");
    }
  }
  for (const capture of result.captures) {
    if (
      !capture ||
      typeof capture !== "object" ||
      typeof capture.label !== "string" ||
      typeof capture.raw !== "string"
    ) {
      throw new CascadeError("terminal runner capture contract is invalid");
    }
  }
  return result as TerminalRunnerResult;
}

function terminalTranscript(raw: string): string {
  return raw
    .replace(/\u001b\][^\u0007]*(?:\u0007|\u001b\\)/g, "")
    .replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, "")
    .replace(/\u001b[@-_]/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001a\u001c-\u001f\u007f]/g, "");
}

async function terminalProcessId(taskRoot: string): Promise<number | null> {
  const pidFile = Bun.file(resolve(taskRoot, TERMINAL_PID_FILE));
  if (!(await pidFile.exists())) return null;
  const value = Number((await pidFile.text()).trim());
  return Number.isInteger(value) && value > 1 ? value : null;
}

function processIsAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

const ptyTaskAdapter: TaskAdapter = {
  id: "builtin-pty",
  version: "1.0.0",
  driver: "pty",
  capabilities: [
    "bounded-pty",
    "prompt-wait",
    "typed-input",
    "resize",
    "signal",
    "raw-stream-evidence",
    "redacted-transcript",
    "task-root-write-isolation",
    "network-deny",
  ],
  async preflight(context) {
    if (!context.task.command?.length || !context.task.terminal) {
      return { status: "BLOCKED", reason: "terminal task contract is missing" };
    }
    if (context.platform !== "darwin" || process.platform !== "darwin") {
      return {
        status: "BLOCKED",
        reason: "the current PTY isolation provider is available only on darwin",
      };
    }
    if (
      !(await isFile(TERMINAL_RUNNER_PATH)) ||
      !(await Bun.file("/usr/bin/sandbox-exec").exists())
    ) {
      return { status: "BLOCKED", reason: "PTY runner or isolation provider is unavailable" };
    }
    const hasSecret =
      Object.values(context.task.terminal.environment).some(
        (value) => value.kind === "secret-reference",
      ) ||
      context.task.terminal.steps.some(
        (step) => step.type === "terminal-input" && step.value.kind === "secret-reference",
      );
    if (hasSecret && !context.secret_resolver) {
      return { status: "BLOCKED", reason: "trusted secret resolver unavailable" };
    }
    const preflight = await runCommand(
      ["node", TERMINAL_RUNNER_PATH, "--preflight"],
      {
        cwd: rootPath(),
        timeoutMs: Math.min(context.task.timeout_ms, 10_000),
        signal: context.signal,
        maxOutputBytes: 16 * 1024,
        unsetEnv: context.child_env_omit,
      },
    );
    if (preflight.exitCode !== 0 || preflight.timedOut || preflight.aborted) {
      return {
        status: "BLOCKED",
        reason: preflight.stderr.trim() || "node-pty preflight failed",
      };
    }
    try {
      const binding = JSON.parse(preflight.stdout) as Record<string, unknown>;
      if (
        binding.schema_version !== 1 ||
        binding.provider !== "node-pty" ||
        binding.provider_version !== "1.1.0" ||
        binding.ready !== true
      ) {
        throw new Error("binding mismatch");
      }
    } catch {
      return { status: "BLOCKED", reason: "node-pty preflight contract is invalid" };
    }
    return { status: "READY", reason: null };
  },
  async execute(context): Promise<TaskAdapterResult> {
    const task = context.task;
    const terminal = task.terminal!;
    const actions = taskPolicyActions(task);
    const policyDecisions: PolicyDecision[] = [];
    let denied: PolicyDecision | null = null;
    for (const [index, action] of actions.entries()) {
      const decision = context.authorize_action({
        action_index: index,
        action,
        projected_output_bytes: 0,
      });
      policyDecisions.push(decision);
      if (decision.decision !== "ALLOW") {
        denied = decision;
        break;
      }
      consumePolicyBudget(decision, context.budget_usage);
    }
    if (denied) {
      return {
        outcome:
          denied.decision === "REQUIRE_CONFIRMATION" ||
          denied.decision === "BLOCKED"
            ? "BLOCKED"
            : "FAILED",
        earliest_failure: denied.reason,
        side_effects: "NONE",
        policy_decisions: policyDecisions,
        events: policyDecisions.map((decision, index) => ({
          event_type: "ACTION" as const,
          index,
          type: actions[index]!.type,
          before: { dispatched: false },
          after: { dispatched: false },
          status:
            decision.decision === "REQUIRE_CONFIRMATION" ||
              decision.decision === "BLOCKED"
              ? "BLOCKED"
              : "FAIL",
          reason: decision.reason,
          policy_decision: decision.decision,
        })),
      };
    }
    if (context.signal?.aborted) {
      return {
        outcome: "CANCELLED",
        earliest_failure: "terminal execution cancelled before dispatch",
        side_effects: "NONE",
        policy_decisions: policyDecisions,
        events: [],
      };
    }
    const primaryDecision = policyDecisions[0]!;
    const primaryPolicy = context.policies.find(
      (policy) =>
        policy.id === primaryDecision.policy_id &&
        policy.version === primaryDecision.policy_version,
    );
    if (!primaryPolicy || !primaryDecision.budgets) {
      throw new CascadeError("authorized terminal policy is unavailable");
    }
    const resolvedEnvironment: Record<string, string> = {
      TERM: "xterm-256color",
    };
    const secretValues: string[] = [];
    for (const [name, value] of Object.entries(terminal.environment)) {
      const resolvedValue = await resolveHttpRequestValue(
        value,
        context.secret_resolver,
        {
          campaign_id: context.campaign_id,
          task_id: task.id,
          sink: { kind: "environment", name },
        },
      );
      resolvedEnvironment[name] = resolvedValue;
      if (value.kind === "secret-reference") secretValues.push(resolvedValue);
    }
    const resolvedSteps: Array<TerminalStep | (Omit<Extract<TerminalStep, { type: "terminal-input" }>, "value"> & { value: string })> = [];
    for (const step of terminal.steps) {
      if (step.type !== "terminal-input") {
        resolvedSteps.push(step);
        continue;
      }
      const value = await resolveHttpRequestValue(
        step.value,
        context.secret_resolver,
        {
          campaign_id: context.campaign_id,
          task_id: task.id,
          sink: { kind: "body", name: "body" },
        },
      );
      if (step.value.kind === "secret-reference") secretValues.push(value);
      resolvedSteps.push({
        type: step.type,
        value,
        append_enter: step.append_enter,
      });
    }
    await mkdir(context.task_root, { recursive: true });
    const taskRoot = await realpath(context.task_root);
    const sandboxEscape = (value: string): string =>
      value.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
    const sandboxProfilePath = resolve(taskRoot, ".cascade-terminal.sb");
    await writeTextExclusive(
      sandboxProfilePath,
      [
        "(version 1)",
        "(deny default)",
        "(allow process*)",
        "(allow file-read*)",
        `(allow file-write* (subpath "${sandboxEscape(taskRoot)}"))`,
        "(allow sysctl-read)",
        "(allow mach-lookup)",
        "(allow ipc-posix*)",
        "(allow file-ioctl)",
        "",
      ].join("\n"),
      { fileMode: 0o600 },
    );
    const runnerRoot = await mkdtemp(resolve(tmpdir(), "cascade-terminal-run-"));
    const runnerInputPath = resolve(runnerRoot, "input.json");
    const runnerResultPath = resolve(runnerRoot, "result.json");
    const pidPath = resolve(taskRoot, TERMINAL_PID_FILE);
    await writeJsonExclusive(
      runnerInputPath,
      {
        command: [
          "/usr/bin/sandbox-exec",
          "-f",
          sandboxProfilePath,
          ...task.command!,
        ],
        cwd: taskRoot,
        environment: resolvedEnvironment,
        cols: terminal.cols,
        rows: terminal.rows,
        steps: resolvedSteps,
        expected_exit_code: terminal.expected_exit_code,
        max_output_bytes: primaryDecision.budgets.remaining_after.output_bytes,
        result_path: runnerResultPath,
        pid_path: pidPath,
      },
      { fileMode: 0o600 },
    );
    for (const decision of policyDecisions) {
      await context.record_action_dispatch(decision);
    }
    const execution = await runCommand(
      ["node", TERMINAL_RUNNER_PATH, runnerInputPath],
      {
        cwd: rootPath(),
        timeoutMs: task.timeout_ms,
        signal: context.signal,
        terminationGraceMs: 1_000,
        maxOutputBytes: 16 * 1024,
        unsetEnv: context.child_env_omit,
      },
    );
    let runner: TerminalRunnerResult | null = null;
    try {
      if (await Bun.file(runnerResultPath).exists()) {
        runner = parseTerminalRunnerResult(await Bun.file(runnerResultPath).json());
      }
    } finally {
      await rm(runnerRoot, { recursive: true, force: true });
    }
    if (execution.timedOut || execution.aborted || !runner) {
      return {
        outcome: execution.aborted ? "CANCELLED" : "UNKNOWN_OUTCOME",
        earliest_failure: execution.timedOut
          ? "terminal runner timed out after PTY dispatch"
          : execution.stderr.trim() || "terminal runner ended without a result",
        side_effects: "UNKNOWN",
        policy_decisions: policyDecisions,
        events: [],
      };
    }
    const controlledRaw = context.control_output(
      runner.raw,
      primaryPolicy,
      secretValues,
    );
    consumePolicyOutputBudget(
      primaryDecision,
      context.budget_usage,
      runner.output_bytes + (runner.output_limit_exceeded ? 1 : 0),
    );
    const transcript = terminalTranscript(controlledRaw.value);
    const finalScreen = transcript.split("\n").slice(-200).join("\n");
    const evidenceRoot = resolve(taskRoot, "terminal-evidence");
    await mkdir(evidenceRoot, { recursive: true, mode: 0o700 });
    const rawPath = resolve(evidenceRoot, "raw-stream.txt");
    const transcriptPath = resolve(evidenceRoot, "transcript.txt");
    const screenPath = resolve(evidenceRoot, "final-screen.txt");
    await writeTextExclusive(rawPath, controlledRaw.value, { fileMode: 0o600 });
    await writeTextExclusive(transcriptPath, transcript, { fileMode: 0o600 });
    await writeTextExclusive(screenPath, finalScreen, { fileMode: 0o600 });
    const runnerResults = new Map(
      runner.step_results.map((result) => [result.index, result]),
    );
    const events: TaskAdapterEvent[] = actions.map((action, index) => {
      const result = runnerResults.get(index);
      const decision = policyDecisions[index]!;
      return {
        event_type: "ACTION" as const,
        index,
        type: action.type,
        before: { dispatched: true },
        after: result?.state ?? { dispatched: true, completed: false },
        status: result?.status === "PASS" ? "PASS" : "FAIL",
        reason: result?.reason ??
          (result ? null : "terminal action did not complete"),
        policy_decision: decision.decision,
      };
    });
    const failed =
      runner.earliest_failure !== null ||
      runner.output_limit_exceeded ||
      runner.exit_code !== terminal.expected_exit_code ||
      runner.step_results.length !== actions.length ||
      runner.step_results.some((result) => result.status !== "PASS");
    return {
      outcome: failed ? "FAILED" : "SUCCEEDED",
      earliest_failure: runner.earliest_failure ??
        (runner.output_limit_exceeded
          ? "terminal output exceeded the governing policy budget"
          : runner.exit_code !== terminal.expected_exit_code
            ? `expected terminal exit ${terminal.expected_exit_code}, got ${runner.exit_code}`
            : runner.step_results.length !== actions.length
              ? "terminal action sequence ended before completion"
              : null),
      side_effects: "KNOWN",
      policy_decisions: policyDecisions,
      events,
      final_state: {
        terminal: {
          exit_code: runner.exit_code,
          exit_signal: runner.exit_signal,
          expected_exit_code: terminal.expected_exit_code,
          completed: !failed,
          cleanup_verified: runner.cleanup_verified,
          cols: runner.final_dimensions.cols,
          rows: runner.final_dimensions.rows,
          provider: runner.provider,
          provider_version: runner.provider_version,
          platform: runner.platform,
          architecture: runner.architecture,
          transcript,
          final_screen: finalScreen,
          output_control: {
            policy_id: primaryPolicy.id,
            budget_consumed_bytes:
              runner.output_bytes + (runner.output_limit_exceeded ? 1 : 0),
            original_bytes: runner.output_bytes,
            retained_bytes: controlledRaw.retained_bytes,
            redacted: controlledRaw.redacted,
            truncated: controlledRaw.truncated || runner.output_limit_exceeded,
          },
        },
      },
      observations: [
        {
          type: "terminal-screen",
          surface: {
            kind: "terminal",
            session_id: `${context.run_id}:pty:${task.id}`,
            surface_id: `task:${task.id}`,
            screen_id: "final",
          },
          payload: {
            final_screen: finalScreen,
            captures: runner.captures.map((capture) => ({
              label: capture.label,
              transcript: terminalTranscript(
                context.control_output(capture.raw, primaryPolicy, secretValues).value,
              ),
            })),
          },
        },
      ],
      produced_evidence: [rawPath, transcriptPath, screenPath],
    };
  },
  async recover(context): Promise<TaskRecoveryResult> {
    const pid = await terminalProcessId(context.task_root);
    if (!pid || !processIsAlive(pid)) {
      return {
        status: "RECOVERED",
        attempted: true,
        reason: "the owned PTY process was already terminated",
      };
    }
    try {
      process.kill(pid, "SIGTERM");
      await new Promise((resolvePromise) => setTimeout(resolvePromise, 100));
      if (processIsAlive(pid)) process.kill(pid, "SIGKILL");
      return {
        status: "RECOVERED",
        attempted: true,
        reason: "the owned PTY process was terminated without further input",
      };
    } catch (error) {
      return {
        status: "FAILED",
        attempted: true,
        reason: error instanceof Error ? error.message : String(error),
      };
    }
  },
  async cleanup(context, result): Promise<TaskCleanupResult> {
    if (context.dispatch_state.status === "NOT_DISPATCHED") {
      return {
        status: "NOT_REQUIRED",
        attempted: false,
        verified: true,
        residual_resources: [],
        reason: "terminal actions were not dispatched",
      };
    }
    const pid = await terminalProcessId(context.task_root);
    const alive = pid !== null && processIsAlive(pid);
    await rm(resolve(context.task_root, TERMINAL_PID_FILE), { force: true });
    const terminalState = result?.final_state?.terminal as
      | { cleanup_verified?: boolean }
      | undefined;
    const verified = !alive && terminalState?.cleanup_verified === true;
    return {
      status: verified ? "VERIFIED" : "UNKNOWN",
      attempted: true,
      verified,
      residual_resources: alive ? [`pty-process:${pid}`] : [],
      reason: verified
        ? "the PTY exited and no owned process remains"
        : "PTY cleanup could not be verified from the completed runner result",
    };
  },
};

const httpTaskAdapter: TaskAdapter = {
  id: "builtin-http-client",
  version: "1.0.0",
  driver: "http-client",
  capabilities: [
    "http-request",
    "manual-redirect",
    "bounded-response",
    "abort-signal",
  ],
  async preflight(context) {
    if (!context.task.request) {
      return { status: "BLOCKED", reason: "HTTP request is missing" };
    }
    if (
      requestHasSecretReferences(context.task.request) &&
      !context.secret_resolver
    ) {
      return { status: "BLOCKED", reason: "trusted secret resolver unavailable" };
    }
    return { status: "READY", reason: null };
  },
  async execute(context): Promise<TaskAdapterResult> {
    const request = context.task.request!;
    const action = {
      type: "http-request" as const,
      method: request.method,
      url: request.url,
      headers: request.headers,
      body: request.body,
    };
    const policyDecision = context.authorize_action({
      action_index: 0,
      action,
      projected_output_bytes: 0,
    });
    const policyDecisions = [policyDecision];
    const requestPolicy = context.policies.find(
      (policy) =>
        policy.id === policyDecision.policy_id &&
        policy.version === policyDecision.policy_version,
    );
    if (policyDecision.decision !== "ALLOW" || !requestPolicy) {
      return {
        outcome:
          policyDecision.decision === "REQUIRE_CONFIRMATION" ||
          policyDecision.decision === "BLOCKED"
            ? "BLOCKED"
            : "FAILED",
        earliest_failure: policyDecision.reason,
        side_effects: "NONE",
        policy_decisions: policyDecisions,
        events: [],
      };
    }
    if (context.signal?.aborted) {
      return {
        outcome: "CANCELLED",
        earliest_failure: "HTTP request cancelled before dispatch",
        side_effects: "NONE",
        policy_decisions: policyDecisions,
        events: [],
      };
    }
    // Final secret-free action guard. Raw bytes are resolved only after this
    // authorized binding and remain in the dispatch-local request below.
    assertSafeSimulationAction(action);
    const dispatchRequest = await resolveHttpRequestForDispatch(
      request,
      context.secret_resolver,
      context.campaign_id,
      context.task.id,
    );
    consumePolicyBudget(policyDecision, context.budget_usage);
    const outputLimit = policyDecision.budgets!.remaining_after.output_bytes;
    try {
      await context.record_action_dispatch(policyDecision);
      const response = await fetch(request.url, {
        method: request.method,
        headers: dispatchRequest.headers,
        body: dispatchRequest.body,
        redirect: "manual",
        signal: context.signal,
      });
      const bounded = await readBoundedResponseBody(
        response,
        outputLimit,
      );
      const resolvedSensitiveValues = [
        ...Object.entries(request.headers ?? {})
          .filter(([, value]) => value.kind === "secret-reference")
          .map(([name]) => dispatchRequest.headers[name]!),
        ...(request.body?.kind === "secret-reference" && dispatchRequest.body !== undefined
          ? [dispatchRequest.body]
          : []),
      ];
      const controlled = context.control_output(
        bounded.value,
        requestPolicy,
        resolvedSensitiveValues,
      );
      consumePolicyOutputBudget(
        policyDecision,
        context.budget_usage,
        bounded.observed_bytes + (bounded.truncated ? 1 : 0),
      );
      const body = controlled.value;
      const outputBudgetExceeded =
        bounded.truncated ||
        policyDecision.budgets!.consumed_after.output_bytes >
          requestPolicy.budgets.max_output_bytes;
      const http: TaskHttpResult = {
        method: request.method,
        url: request.url,
        status: response.status,
        content_type: response.headers.get("content-type"),
        body,
        redirected: response.redirected,
        output_control: {
          policy_id: requestPolicy.id,
          max_output_bytes: outputLimit,
          budget_consumed_bytes:
            bounded.observed_bytes + (bounded.truncated ? 1 : 0),
          original_bytes:
            bounded.observed_bytes + (bounded.truncated ? 1 : 0),
          retained_bytes: Buffer.byteLength(body),
          redacted: controlled.redacted,
          truncated: outputBudgetExceeded || controlled.truncated,
        },
      };
      return {
        outcome: outputBudgetExceeded ? "FAILED" : "SUCCEEDED",
        earliest_failure: outputBudgetExceeded
          ? "HTTP response exceeded the governing policy budget"
          : null,
        side_effects: "KNOWN",
        policy_decisions: policyDecisions,
        events: [
          {
            event_type: "HTTP",
            index: 0,
            type: "http-request",
            action_binding_version: policyDecision.action_binding_version,
            action_binding_digest: policyDecision.action_binding_digest,
            method: request.method,
            url: request.url,
            response_status: response.status,
            response_bytes: bounded.observed_bytes,
            status: outputBudgetExceeded ? "BLOCKED" : "PASS",
          },
        ],
        http,
        observations: [
          {
            type: "http-response",
            surface: {
              kind: "http",
              session_id: context.run_id,
              surface_id: new URL(request.url).origin,
            },
            payload: {
              method: request.method,
              url: request.url,
              status: response.status,
              content_type: response.headers.get("content-type"),
              retained_bytes: Buffer.byteLength(body),
              truncated: http.output_control.truncated,
            },
          },
        ],
      };
    } catch (error) {
      const cancelled = context.signal?.aborted;
      return {
        outcome: "UNKNOWN_OUTCOME",
        earliest_failure: cancelled
          ? "HTTP request cancelled after dispatch; side effects are unknown"
          : `HTTP request failed after dispatch; side effects are unknown: ${error instanceof Error ? error.message : String(error)}`,
        side_effects: "UNKNOWN",
        policy_decisions: policyDecisions,
        events: [],
      };
    }
  },
  async recover(): Promise<TaskRecoveryResult> {
    return {
      status: "UNSUPPORTED",
      attempted: false,
      reason: "HTTP side effects cannot be reconstructed safely",
    };
  },
  async cleanup(context): Promise<TaskCleanupResult> {
    if (context.dispatch_state.status === "NOT_DISPATCHED") {
      return {
        status: "NOT_REQUIRED",
        attempted: false,
        verified: true,
        residual_resources: [],
        reason: "request was not dispatched",
      };
    }
    return {
      status: "UNKNOWN",
      attempted: true,
      verified: false,
      residual_resources: [],
      reason:
        "HTTP fetch resources were released but this does not verify target reset or remote side-effect cleanup",
    };
  },
};

interface PlaywrightRunnerResult {
  schema_version: 1;
  provider: "playwright-chromium";
  playwright_version: string;
  executable_path: string;
  profile: "ephemeral";
  network: "deny";
  downloads: false;
  uploads: false;
  action_results: Array<{
    index: number;
    type: BrowserAction["type"];
    status: "PASS" | "BLOCKED";
    reason: string | null;
  }>;
  visible_status: string | null;
  expected_text: string;
  console_errors: string[];
  page_errors: string[];
  blocked_requests: string[];
  earliest_failure: string | null;
  screenshot_path: string;
  trace_path: string;
}

interface PlaywrightBinding {
  schema_version: 1;
  provider: "playwright-chromium";
  playwright_version: string;
  executable_path: string;
  executable_exists: true;
}

const PLAYWRIGHT_TOOLING_ROOT = rootPath(".codex/harness-tooling");
const PLAYWRIGHT_RUNNER_PATH = resolve(
  PLAYWRIGHT_TOOLING_ROOT,
  "browser-adapter-runner.ts",
);

async function resolveBrowserFixture(task: TaskDefinition): Promise<string> {
  const fixtureRoot = await realpath(
    rootPath("product-evals/simulations/harness"),
  );
  const fixturePath = await realpath(
    boundedPath(
      task.browser!.fixture_file,
      "product-evals/simulations/harness/",
    ),
  );
  const relation = relative(fixtureRoot, fixturePath);
  if (!relation || relation.startsWith(`..${sep}`) || relation === "..") {
    throw new CascadeError("browser fixture escapes the harness simulation root");
  }
  return fixturePath;
}

function parsePlaywrightRunnerResult(value: string): PlaywrightRunnerResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new CascadeError("Playwright runner returned invalid JSON");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new CascadeError("Playwright runner returned an invalid result");
  }
  const result = parsed as Partial<PlaywrightRunnerResult>;
  if (
    result.schema_version !== 1 ||
    result.provider !== "playwright-chromium" ||
    result.profile !== "ephemeral" ||
    result.network !== "deny" ||
    result.downloads !== false ||
    result.uploads !== false ||
    !Array.isArray(result.action_results) ||
    typeof result.executable_path !== "string" ||
    typeof result.playwright_version !== "string" ||
    typeof result.expected_text !== "string" ||
    !Array.isArray(result.console_errors) ||
    !Array.isArray(result.page_errors) ||
    !Array.isArray(result.blocked_requests) ||
    typeof result.screenshot_path !== "string" ||
    typeof result.trace_path !== "string"
  ) {
    throw new CascadeError("Playwright runner result contract is invalid");
  }
  return result as PlaywrightRunnerResult;
}

async function resolvePlaywrightBinding(
  context: TaskAdapterContext,
): Promise<PlaywrightBinding> {
  const preflightRoot = await mkdtemp(
    resolve(tmpdir(), "cascade-browser-preflight-"),
  );
  const preflight = await runCommand(
    [process.execPath, PLAYWRIGHT_RUNNER_PATH, "--preflight"],
    {
      cwd: PLAYWRIGHT_TOOLING_ROOT,
      timeoutMs: Math.min(context.task.timeout_ms, 30_000),
      signal: context.signal,
      maxOutputBytes: 16 * 1024,
      unsetEnv: context.child_env_omit,
      env: { TMPDIR: preflightRoot },
    },
  ).finally(() => rm(preflightRoot, { recursive: true, force: true }));
  if (preflight.exitCode !== 0 || preflight.timedOut || preflight.aborted) {
    throw new CascadeError(
      preflight.stderr.trim() || "Playwright Chromium is unavailable",
    );
  }
  let value: unknown;
  try {
    value = JSON.parse(preflight.stdout);
  } catch {
    throw new CascadeError("Playwright preflight returned invalid JSON");
  }
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    (value as Partial<PlaywrightBinding>).schema_version !== 1 ||
    (value as Partial<PlaywrightBinding>).provider !== "playwright-chromium" ||
    typeof (value as Partial<PlaywrightBinding>).playwright_version !== "string" ||
    typeof (value as Partial<PlaywrightBinding>).executable_path !== "string" ||
    (value as Partial<PlaywrightBinding>).executable_exists !== true
  ) {
    throw new CascadeError("Playwright preflight result contract is invalid");
  }
  return value as PlaywrightBinding;
}

const playwrightTaskAdapter: TaskAdapter = {
  id: "builtin-playwright",
  version: "1.0.0",
  driver: "playwright",
  capabilities: [
    "structured-browser-actions",
    "ephemeral-profile",
    "network-deny",
    "download-deny",
    "upload-deny",
    "screenshot-evidence",
    "trace-evidence",
  ],
  async preflight(context) {
    if (!context.task.browser) {
      return { status: "BLOCKED", reason: "browser task contract is missing" };
    }
    try {
      await resolveBrowserFixture(context.task);
    } catch (error) {
      return {
        status: "BLOCKED",
        reason: error instanceof Error ? error.message : String(error),
      };
    }
    if (!(await isFile(PLAYWRIGHT_RUNNER_PATH))) {
      return { status: "BLOCKED", reason: "Playwright runner is unavailable" };
    }
    await mkdir(context.task_root, { recursive: true });
    try {
      await resolvePlaywrightBinding(context);
    } catch (error) {
      return {
        status: "BLOCKED",
        reason: error instanceof Error ? error.message : String(error),
      };
    }
    return { status: "READY", reason: null };
  },
  async execute(context): Promise<TaskAdapterResult> {
    const browserTask = context.task.browser!;
    const policyDecisions: PolicyDecision[] = [];
    const allowed: Array<{
      action: BrowserAction;
      decision: PolicyDecision;
      index: number;
    }> = [];
    let denied: PolicyDecision | null = null;
    for (const [index, action] of browserTask.actions.entries()) {
      const decision = context.authorize_action({
        action_index: index,
        action,
        projected_output_bytes: 0,
      });
      policyDecisions.push(decision);
      if (decision.decision !== "ALLOW") {
        denied = decision;
        break;
      }
      consumePolicyBudget(decision, context.budget_usage);
      allowed.push({ action, decision, index });
    }
    if (allowed.length === 0) {
      return {
        outcome:
          denied?.decision === "REQUIRE_CONFIRMATION" ||
          denied?.decision === "BLOCKED"
            ? "BLOCKED"
            : "FAILED",
        earliest_failure: denied?.reason ?? "browser action was not authorized",
        side_effects: "NONE",
        policy_decisions: policyDecisions,
        events: [],
      };
    }
    if (context.signal?.aborted) {
      return {
        outcome: "CANCELLED",
        earliest_failure: "browser execution cancelled before dispatch",
        side_effects: "NONE",
        policy_decisions: policyDecisions,
        events: [],
      };
    }
    const taskRoot = await realpath(context.task_root);
    const fixtureFile = await resolveBrowserFixture(context.task);
    const binding = await resolvePlaywrightBinding(context);
    const outputRoot = resolve(taskRoot, "browser-evidence");
    await mkdir(outputRoot, { recursive: true, mode: 0o700 });
    const runnerInputPath = resolve(taskRoot, "browser-runner-input.json");
    await writeJsonExclusive(
      runnerInputPath,
      {
        fixture_file: fixtureFile,
        output_root: outputRoot,
        actions: allowed.map(({ action }) => action),
        observation: browserTask.observation,
      },
      { fileMode: 0o600 },
    );
    for (const { decision } of allowed) {
      await context.record_action_dispatch(decision);
    }
    const primaryDecision = allowed.at(-1)!.decision;
    const primaryPolicy = context.policies.find(
      (policy) =>
        policy.id === primaryDecision.policy_id &&
        policy.version === primaryDecision.policy_version,
    );
    if (!primaryPolicy) {
      throw new CascadeError("authorized browser policy is unavailable");
    }
    const browserHome = await mkdtemp(resolve(tmpdir(), "cascade-browser-run-"));
    const execution = await runCommand(
      [process.execPath, PLAYWRIGHT_RUNNER_PATH, runnerInputPath],
      {
        cwd: PLAYWRIGHT_TOOLING_ROOT,
        timeoutMs: context.task.timeout_ms,
        signal: context.signal,
        terminationGraceMs: 1_000,
        maxOutputBytes: primaryDecision.budgets!.remaining_after.output_bytes,
        unsetEnv: context.child_env_omit,
        env: {
          HOME: browserHome,
          TMPDIR: browserHome,
          CASCADE_PLAYWRIGHT_EXECUTABLE: binding.executable_path,
        },
      },
    ).finally(() => rm(browserHome, { recursive: true, force: true }));
    const controlled = context.control_output(execution.stdout, primaryPolicy);
    if (
      execution.timedOut ||
      execution.aborted ||
      execution.exitCode !== 0 ||
      execution.outputLimitExceeded
    ) {
      return {
        outcome: execution.aborted ? "CANCELLED" : "UNKNOWN_OUTCOME",
        earliest_failure: execution.timedOut
          ? "Playwright runner timed out after browser dispatch"
          : execution.stderr.trim() || "Playwright runner failed after dispatch",
        side_effects: "UNKNOWN",
        policy_decisions: policyDecisions,
        events: [],
      };
    }
    const runner = parsePlaywrightRunnerResult(controlled.value.trim());
    const runnerFailed =
      runner.earliest_failure !== null ||
      runner.action_results.length !== allowed.length ||
      runner.action_results.some((result) => result.status !== "PASS") ||
      runner.console_errors.length > 0 ||
      runner.page_errors.length > 0;
    const events: TaskAdapterEvent[] = runner.action_results.map((result) => {
      const dispatched = allowed[result.index];
      if (!dispatched || dispatched.action.type !== result.type) {
        throw new CascadeError("Playwright action result order is invalid");
      }
      const postActionFailure =
        runnerFailed && result.index === runner.action_results.length - 1;
      return {
        event_type: "BROWSER" as const,
        index: dispatched.index,
        type: dispatched.action.type,
        action_binding_version: dispatched.decision.action_binding_version,
        action_binding_digest: dispatched.decision.action_binding_digest,
        action: dispatched.action,
        status: postActionFailure ? "BLOCKED" : result.status,
        reason: postActionFailure
          ? runner.earliest_failure ?? "browser post-action evidence failed"
          : result.reason,
      };
    });
    return {
      outcome: denied ? "BLOCKED" : runnerFailed ? "FAILED" : "SUCCEEDED",
      earliest_failure: denied?.reason ?? runner.earliest_failure,
      side_effects: "KNOWN",
      policy_decisions: policyDecisions,
      events,
      final_state: {
        browser: {
          visible_status: runner.visible_status,
          expected_text: runner.expected_text,
          execution_binding: {
            provider: runner.provider,
            playwright_version: runner.playwright_version,
            executable_path: runner.executable_path,
          },
          isolation: {
            profile: runner.profile,
            network: runner.network,
            downloads: runner.downloads,
            uploads: runner.uploads,
          },
        },
      },
      observations: [
        {
          type: "browser-visible-status",
          surface: {
            kind: "browser",
            session_id:
              `${context.run_id}:${context.task.driver.type}:${context.task.id}`,
            surface_id: `task:${context.task.id}`,
            screen_id: "fixture-main",
          },
          payload: {
            visible_status: runner.visible_status,
            expected_text: runner.expected_text,
            blocked_requests: runner.blocked_requests,
            console_errors: runner.console_errors,
            page_errors: runner.page_errors,
          },
        },
      ],
      produced_evidence: [runner.screenshot_path, runner.trace_path],
    };
  },
  async recover(context): Promise<TaskRecoveryResult> {
    return context.dispatch_state.status === "NOT_DISPATCHED"
      ? { status: "NOT_REQUIRED", attempted: false, reason: null }
      : {
          status: "UNSUPPORTED",
          attempted: false,
          reason: "an interrupted browser runner cannot prove child-process cleanup",
        };
  },
  async cleanup(context, result): Promise<TaskCleanupResult> {
    if (context.dispatch_state.status === "NOT_DISPATCHED") {
      return {
        status: "NOT_REQUIRED",
        attempted: false,
        verified: true,
        residual_resources: [],
        reason: "browser actions were not dispatched",
      };
    }
    if (result?.produced_evidence?.length === 2) {
      return {
        status: "VERIFIED",
        attempted: true,
        verified: true,
        residual_resources: [],
        reason: "Playwright closed the ephemeral context and browser after evidence capture",
      };
    }
    return {
      status: "UNKNOWN",
      attempted: true,
      verified: false,
      residual_resources: ["playwright-browser-process"],
      reason: "browser runner ended without a verified cleanup result",
    };
  },
};

interface DesktopRunnerResult {
  schema_version: 1;
  provider: "docker-xvfb-xdotool";
  execution_binding: {
    image_id: string;
    platform: "linux/arm64";
    app_id: string;
    app_build: string;
    display: ":99";
    resolution: { width: number; height: number; scale: 1 };
  };
  action_results: Array<{
    index: number;
    type: DesktopAction["type"];
    status: "PASS" | "BLOCKED";
    reason: string | null;
  }>;
  public_state: Record<string, unknown> | null;
  logs: Array<Record<string, unknown>>;
  earliest_failure: string | null;
  cleanup_verified: boolean;
}

const DESKTOP_DOCKER_COMMAND = "docker";
const DESKTOP_CONTAINER_FILE = ".cascade-desktop-container";

function parseDesktopRunnerResult(value: unknown): DesktopRunnerResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new CascadeError("desktop runner returned an invalid result");
  }
  const result = value as Partial<DesktopRunnerResult>;
  const binding = result.execution_binding;
  if (
    result.schema_version !== 1 ||
    result.provider !== "docker-xvfb-xdotool" ||
    !binding ||
    typeof binding.image_id !== "string" ||
    binding.platform !== "linux/arm64" ||
    typeof binding.app_id !== "string" ||
    typeof binding.app_build !== "string" ||
    binding.display !== ":99" ||
    !binding.resolution ||
    !Number.isInteger(binding.resolution.width) ||
    !Number.isInteger(binding.resolution.height) ||
    binding.resolution.scale !== 1 ||
    !Array.isArray(result.action_results) ||
    !Array.isArray(result.logs) ||
    (result.public_state !== null &&
      (!result.public_state ||
        typeof result.public_state !== "object" ||
        Array.isArray(result.public_state))) ||
    (result.earliest_failure !== null &&
      typeof result.earliest_failure !== "string") ||
    typeof result.cleanup_verified !== "boolean"
  ) {
    throw new CascadeError("desktop runner result contract is invalid");
  }
  for (const [index, action] of result.action_results.entries()) {
    if (
      !action ||
      typeof action !== "object" ||
      action.index !== index ||
      typeof action.type !== "string" ||
      !new Set(["PASS", "BLOCKED"]).has(String(action.status)) ||
      (action.reason !== null && typeof action.reason !== "string")
    ) {
      throw new CascadeError("desktop runner action result contract is invalid");
    }
  }
  return result as DesktopRunnerResult;
}

function desktopContainerName(context: TaskAdapterContext): string {
  const suffix = `${context.run_id}-${context.task.id}`
    .toLowerCase()
    .replace(/[^a-z0-9_.-]+/g, "-")
    .replace(/^[^a-z0-9]+/, "");
  return `cascade-desktop-${suffix}`.slice(0, 63);
}

async function desktopContainerPresent(name: string): Promise<boolean> {
  const inspect = await runCommand(
    [DESKTOP_DOCKER_COMMAND, "container", "inspect", name],
    { cwd: rootPath(), timeoutMs: 10_000, maxOutputBytes: 4 * 1024 },
  );
  return inspect.exitCode === 0;
}

async function dockerUnixSocket(signal?: AbortSignal): Promise<string> {
  const context = await runCommand(
    [DESKTOP_DOCKER_COMMAND, "context", "inspect", "--format", "{{.Endpoints.docker.Host}}"],
    {
      cwd: rootPath(),
      timeoutMs: 10_000,
      signal,
      maxOutputBytes: 4 * 1024,
    },
  );
  const host = context.stdout.trim();
  if (context.exitCode !== 0 || !host.startsWith("unix://")) {
    throw new CascadeError("desktop provider requires a local Docker Unix socket");
  }
  return host.slice("unix://".length);
}

async function removeDesktopContainer(
  name: string,
  signal?: AbortSignal,
): Promise<{ removed: boolean; reason: string | null }> {
  const socket = await dockerUnixSocket(signal);
  const removal = await runCommand(
    [
      "curl",
      "--silent",
      "--show-error",
      "--unix-socket",
      socket,
      "--request",
      "DELETE",
      "--output",
      "/dev/null",
      "--write-out",
      "%{http_code}",
      `http://localhost/containers/${encodeURIComponent(name)}?force=true&v=true`,
    ],
    {
      cwd: rootPath(),
      timeoutMs: 15_000,
      signal,
      maxOutputBytes: 4 * 1024,
    },
  );
  const status = removal.stdout.trim();
  return {
    removed: removal.exitCode === 0 && new Set(["204", "404"]).has(status),
    reason: removal.stderr.trim() ||
      (new Set(["204", "404"]).has(status)
        ? null
        : `Docker API removal returned ${status || "no status"}`),
  };
}

const desktopPlatformTaskAdapter: TaskAdapter = {
  id: "builtin-platform-automation",
  version: "1.0.0",
  driver: "platform-automation",
  capabilities: [
    "linux-desktop-fixture",
    "docker-isolation",
    "xvfb-display",
    "structured-desktop-actions",
    "network-deny",
    "read-only-root",
    "screenshot-evidence",
    "container-reset",
  ],
  async preflight(context) {
    const desktop = context.task.desktop;
    if (!desktop || context.task.kind !== "desktop") {
      return { status: "BLOCKED", reason: "desktop task contract is missing" };
    }
    const fixtureRoot = boundedPath(desktop.provider.fixture_root);
    for (const file of ["Dockerfile", "fixture.py", "runner.mjs"]) {
      if (!(await isFile(resolve(fixtureRoot, file)))) {
        return {
          status: "BLOCKED",
          reason: `desktop fixture runtime is missing ${file}`,
        };
      }
    }
    const inspect = await runCommand(
      [
        DESKTOP_DOCKER_COMMAND,
        "image",
        "inspect",
        desktop.provider.image,
        "--format",
        "{{.Id}} {{.Os}}/{{.Architecture}}",
      ],
      {
        cwd: rootPath(),
        timeoutMs: Math.min(context.task.timeout_ms, 15_000),
        signal: context.signal,
        maxOutputBytes: 4 * 1024,
        unsetEnv: context.child_env_omit,
      },
    );
    if (inspect.exitCode !== 0 || inspect.timedOut || inspect.aborted) {
      return {
        status: "BLOCKED",
        reason: inspect.stderr.trim() || "Docker desktop fixture image is unavailable",
      };
    }
    const actual = inspect.stdout.trim();
    const expected = `${desktop.provider.image_id} ${desktop.provider.platform}`;
    if (actual !== expected) {
      return {
        status: "BLOCKED",
        reason: `desktop provider binding mismatch: expected ${expected}, got ${actual}`,
      };
    }
    return { status: "READY", reason: null };
  },
  async execute(context): Promise<TaskAdapterResult> {
    const desktop = context.task.desktop!;
    const actions = taskPolicyActions(context.task) as DesktopAction[];
    const policyDecisions: PolicyDecision[] = [];
    let denied: PolicyDecision | null = null;
    for (const [index, action] of actions.entries()) {
      const decision = context.authorize_action({
        action_index: index,
        action,
        projected_output_bytes: 0,
      });
      policyDecisions.push(decision);
      if (decision.decision !== "ALLOW") {
        denied = decision;
        break;
      }
      consumePolicyBudget(decision, context.budget_usage);
    }
    if (denied) {
      return {
        outcome:
          denied.decision === "REQUIRE_CONFIRMATION" ||
          denied.decision === "BLOCKED"
            ? "BLOCKED"
            : "FAILED",
        earliest_failure: denied.reason,
        side_effects: "NONE",
        policy_decisions: policyDecisions,
        events: [],
      };
    }
    if (context.signal?.aborted) {
      return {
        outcome: "CANCELLED",
        earliest_failure: "desktop execution cancelled before dispatch",
        side_effects: "NONE",
        policy_decisions: policyDecisions,
        events: [],
      };
    }
    const primaryDecision = policyDecisions.at(-1)!;
    const primaryPolicy = context.policies.find(
      (policy) =>
        policy.id === primaryDecision.policy_id &&
        policy.version === primaryDecision.policy_version,
    );
    if (!primaryPolicy || !primaryDecision.budgets) {
      throw new CascadeError("authorized desktop policy is unavailable");
    }
    const resolvedActions: Array<DesktopAction | { type: "desktop-type"; value: string }> = [];
    for (const action of actions) {
      if (action.type !== "desktop-type") {
        resolvedActions.push(action);
        continue;
      }
      resolvedActions.push({ type: "desktop-type", value: action.value.value });
    }
    await mkdir(context.task_root, { recursive: true });
    const taskRoot = await realpath(context.task_root);
    const containerPath = resolve(taskRoot, DESKTOP_CONTAINER_FILE);
    const createPath = resolve(taskRoot, ".desktop-container-create.json");
    const archivePath = resolve(taskRoot, ".desktop-evidence.tar");
    const exportRoot = resolve(taskRoot, "desktop-evidence");
    const logsPath = resolve(taskRoot, "desktop-logs.json");
    const containerName = desktopContainerName(context);
    const runnerInput = {
        execution_binding: {
          image_id: desktop.provider.image_id,
          platform: desktop.provider.platform,
          app_id: desktop.app.id,
          app_build: desktop.app.build,
          display: desktop.environment.display,
          resolution: desktop.environment.resolution,
        },
        environment: {
          display: desktop.environment.display,
          resolution: desktop.environment.resolution,
          locale: desktop.environment.locale,
        },
        evidence_root: "/evidence",
        actions: resolvedActions,
    };
    await writeJsonExclusive(createPath, {
      Image: desktop.provider.image,
      Cmd: ["node", "/fixture/runner.mjs"],
      Env: [
        `CASCADE_DESKTOP_INPUT_B64=${Buffer.from(stableJson(runnerInput)).toString("base64")}`,
      ],
      HostConfig: {
        NetworkMode: "none",
        ReadonlyRootfs: true,
        Tmpfs: {
          "/tmp": "rw,noexec,nosuid,size=67108864",
          "/evidence": "rw,noexec,nosuid,size=67108864",
        },
        CapDrop: ["ALL"],
        SecurityOpt: ["no-new-privileges"],
        PidsLimit: 128,
        Memory: 536_870_912,
        NanoCpus: 1_000_000_000,
      },
    }, { fileMode: 0o600 });
    await writeTextExclusive(containerPath, `${containerName}\n`, { fileMode: 0o600 });
    for (const decision of policyDecisions) {
      await context.record_action_dispatch(decision);
    }
    let providerTimedOut = false;
    let providerAborted = false;
    let providerError = "";
    try {
      const socket = await dockerUnixSocket(context.signal);
      const create = await runCommand(
        [
          "curl",
          "--silent",
          "--show-error",
          "--unix-socket",
          socket,
          "--header",
          "Content-Type: application/json",
          "--data-binary",
          `@${createPath}`,
          "--output",
          "/dev/null",
          "--write-out",
          "%{http_code}",
          `http://localhost/containers/create?name=${encodeURIComponent(containerName)}&platform=linux%2Farm64`,
        ],
        {
          cwd: rootPath(),
          timeoutMs: Math.min(context.task.timeout_ms, 15_000),
          signal: context.signal,
          maxOutputBytes: 16 * 1024,
          unsetEnv: context.child_env_omit,
        },
      );
      if (
        create.exitCode !== 0 ||
        create.timedOut ||
        create.aborted ||
        create.stdout.trim() !== "201"
      ) {
        providerTimedOut = create.timedOut;
        providerAborted = create.aborted;
        providerError = create.stderr.trim() ||
          `Docker API create returned ${create.stdout.trim() || "no status"}`;
      } else {
        const start = await runCommand(
          [
            "curl",
            "--silent",
            "--show-error",
            "--unix-socket",
            socket,
            "--request",
            "POST",
            "--output",
            "/dev/null",
            "--write-out",
            "%{http_code}",
            `http://localhost/containers/${encodeURIComponent(containerName)}/start`,
          ],
          {
            cwd: rootPath(),
            timeoutMs: 10_000,
            signal: context.signal,
            maxOutputBytes: 4 * 1024,
            unsetEnv: context.child_env_omit,
          },
        );
        if (
          start.exitCode !== 0 ||
          start.timedOut ||
          start.aborted ||
          start.stdout.trim() !== "204"
        ) {
          providerTimedOut = start.timedOut;
          providerAborted = start.aborted;
          providerError = start.stderr.trim() ||
            `Docker API start returned ${start.stdout.trim() || "no status"}`;
        } else {
          const deadline = Date.now() + Math.max(1_000, context.task.timeout_ms - 20_000);
          while (Date.now() < deadline && !context.signal?.aborted) {
            const inspect = await runCommand(
              [
                DESKTOP_DOCKER_COMMAND,
                "container",
                "inspect",
                containerName,
                "--format",
                "{{json .State}}",
              ],
              {
                cwd: rootPath(),
                timeoutMs: 5_000,
                signal: context.signal,
                maxOutputBytes: 8 * 1024,
                unsetEnv: context.child_env_omit,
              },
            );
            if (inspect.exitCode !== 0) {
              providerError = inspect.stderr.trim() || "desktop container state is unavailable";
              break;
            }
            const state = JSON.parse(inspect.stdout) as {
              Status?: string;
              ExitCode?: number;
              Error?: string;
            };
            if (state.Status === "exited" || state.Status === "dead") {
              if (state.ExitCode !== 0) {
                providerError = state.Error || `desktop runner exited ${state.ExitCode}`;
              }
              break;
            }
            await new Promise((resolvePromise) => setTimeout(resolvePromise, 50));
          }
          providerAborted = context.signal?.aborted === true;
          if (!providerAborted && await desktopContainerPresent(containerName)) {
            const state = await runCommand(
              [
                DESKTOP_DOCKER_COMMAND,
                "container",
                "inspect",
                containerName,
                "--format",
                "{{.State.Status}}",
              ],
              { cwd: rootPath(), timeoutMs: 5_000, maxOutputBytes: 4 * 1024 },
            );
            providerTimedOut = state.stdout.trim() === "running";
          }
          if (!providerTimedOut && !providerAborted) {
            const archive = await runCommand(
              [
                "curl",
                "--silent",
                "--show-error",
                "--unix-socket",
                socket,
                "--output",
                archivePath,
                "--write-out",
                "%{http_code}",
                `http://localhost/containers/${encodeURIComponent(containerName)}/archive?path=%2Fevidence%2F.`,
              ],
              {
                cwd: rootPath(),
                timeoutMs: 10_000,
                signal: context.signal,
                maxOutputBytes: 4 * 1024,
                unsetEnv: context.child_env_omit,
              },
            );
            if (
              archive.exitCode !== 0 ||
              archive.timedOut ||
              archive.aborted ||
              archive.stdout.trim() !== "200"
            ) {
              providerTimedOut = archive.timedOut;
              providerAborted = archive.aborted;
              providerError = archive.stderr.trim() ||
                `Docker API archive returned ${archive.stdout.trim() || "no status"}`;
            } else {
              const listing = await runCommand(
                ["tar", "-tf", archivePath],
                { cwd: rootPath(), timeoutMs: 5_000, maxOutputBytes: 16 * 1024 },
              );
              const entries = listing.stdout.split("\n").filter(Boolean);
              if (
                listing.exitCode !== 0 ||
                entries.some(
                  (entry) =>
                    entry.startsWith("/") ||
                    entry.split("/").some((segment) => segment === ".."),
                )
              ) {
                providerError = "desktop evidence archive is unsafe or invalid";
              } else {
                await mkdir(exportRoot, { recursive: true, mode: 0o700 });
                const extraction = await runCommand(
                  ["tar", "-xf", archivePath, "-C", exportRoot],
                  { cwd: rootPath(), timeoutMs: 5_000, maxOutputBytes: 4 * 1024 },
                );
                if (extraction.exitCode !== 0) {
                  providerError = extraction.stderr.trim() ||
                    "desktop evidence extraction failed";
                }
              }
            }
          }
        }
      }
    } finally {
      await rm(createPath, { force: true });
      await rm(archivePath, { force: true });
    }
    const exportedFiles = await walkFiles(exportRoot).catch(() => []);
    const resultPath = exportedFiles.find((path) => path.endsWith("/desktop-result.json"));
    if (!resultPath) {
      return {
        outcome: providerAborted ? "CANCELLED" : "UNKNOWN_OUTCOME",
        earliest_failure: providerTimedOut
          ? "desktop provider timed out after dispatch"
          : providerError || "desktop provider ended without a result",
        side_effects: "UNKNOWN",
        policy_decisions: policyDecisions,
        events: [],
      };
    }
    const rawResult = await readBoundedRegularFile(
      resultPath,
      "desktop runner result",
      { maxBytes: primaryDecision.budgets.remaining_after.output_bytes },
    );
    consumePolicyOutputBudget(
      primaryDecision,
      context.budget_usage,
      rawResult.byteLength,
    );
    const controlled = context.control_output(
      rawResult.toString("utf8"),
      primaryPolicy,
    );
    const runner = parseDesktopRunnerResult(JSON.parse(controlled.value));
    await writeJsonAtomic(resultPath, runner, { fileMode: 0o600 });
    await writeJsonExclusive(logsPath, runner.logs, { fileMode: 0o600 });
    const events: TaskAdapterEvent[] = runner.action_results.map((result) => {
      const action = actions[result.index];
      const decision = policyDecisions[result.index];
      if (!action || !decision || action.type !== result.type) {
        throw new CascadeError("desktop action result order is invalid");
      }
      return {
        event_type: "ACTION" as const,
        index: result.index,
        type: action.type,
        before: { dispatched: true },
        after: { completed: result.status === "PASS" },
        status: result.status,
        reason: result.reason,
        policy_decision: decision.decision,
      };
    });
    const screenshotPaths = actions
      .filter((action): action is Extract<DesktopAction, { type: "desktop-capture" }> =>
        action.type === "desktop-capture")
      .map((action) =>
        exportedFiles.find((path) => path.endsWith(`/${action.label}.png`)) ?? "")
      .filter(Boolean);
    const failed =
      providerTimedOut ||
      providerAborted ||
      runner.earliest_failure !== null ||
      runner.action_results.length !== actions.length ||
      runner.action_results.some((result) => result.status !== "PASS") ||
      runner.public_state === null ||
      screenshotPaths.length !==
        actions.filter((action) => action.type === "desktop-capture").length ||
      screenshotPaths.some((path) => !Bun.file(path).size) ||
      providerError.length > 0;
    return {
      outcome: providerAborted ? "CANCELLED" : failed ? "FAILED" : "SUCCEEDED",
      earliest_failure: runner.earliest_failure ??
        (providerTimedOut
          ? "desktop provider timed out after dispatch"
          : runner.public_state === null
            ? "desktop fixture did not produce public completion state"
            : providerError || null),
      side_effects: "KNOWN",
      policy_decisions: policyDecisions,
      events,
      final_state: {
        desktop: {
          completed: !failed,
          public_state: runner.public_state,
          execution_binding: runner.execution_binding,
          provider: runner.provider,
          isolation: {
            network: desktop.network,
            filesystem: desktop.filesystem,
            reset: desktop.reset,
          },
          output_control: {
            policy_id: primaryPolicy.id,
            budget_consumed_bytes: rawResult.byteLength,
            retained_bytes: controlled.retained_bytes,
            redacted: controlled.redacted,
            truncated: controlled.truncated,
          },
        },
      },
      observations: [{
        type: "desktop-screen",
        surface: {
          kind: "desktop",
          session_id: `${context.run_id}:desktop:${context.task.id}`,
          surface_id: `task:${context.task.id}`,
          screen_id: "fixture-main",
        },
        payload: {
          public_state: runner.public_state,
          screenshot_labels: screenshotPaths.map((path) => path.split("/").at(-1)),
          execution_binding: runner.execution_binding,
        },
      }],
      produced_evidence: [resultPath, logsPath, ...screenshotPaths],
    };
  },
  async recover(context): Promise<TaskRecoveryResult> {
    const containerFile = Bun.file(resolve(context.task_root, DESKTOP_CONTAINER_FILE));
    if (!(await containerFile.exists())) {
      return {
        status: "RECOVERED",
        attempted: true,
        reason: "desktop container was not created",
      };
    }
    const name = (await containerFile.text()).trim();
    if (!(await desktopContainerPresent(name))) {
      return {
        status: "RECOVERED",
        attempted: true,
        reason: "desktop container was already absent",
      };
    }
    const removal = await removeDesktopContainer(name, context.signal);
    return removal.removed
      ? {
          status: "RECOVERED",
          attempted: true,
          reason: "the owned desktop container was force-removed without further input",
        }
      : {
          status: "FAILED",
          attempted: true,
          reason: removal.reason || "desktop container removal failed",
        };
  },
  async cleanup(context): Promise<TaskCleanupResult> {
    if (context.dispatch_state.status === "NOT_DISPATCHED") {
      return {
        status: "NOT_REQUIRED",
        attempted: false,
        verified: true,
        residual_resources: [],
        reason: "desktop actions were not dispatched",
      };
    }
    const containerFile = Bun.file(resolve(context.task_root, DESKTOP_CONTAINER_FILE));
    const name = (await containerFile.exists())
      ? (await containerFile.text()).trim()
      : desktopContainerName(context);
    if (await desktopContainerPresent(name)) {
      await removeDesktopContainer(name, context.signal);
    }
    const present = await desktopContainerPresent(name);
    await rm(resolve(context.task_root, DESKTOP_CONTAINER_FILE), { force: true });
    return {
      status: present ? "FAILED" : "VERIFIED",
      attempted: true,
      verified: !present,
      residual_resources: present ? [name] : [],
      reason: present
        ? "the owned desktop container remains after cleanup"
        : "the exact desktop container was removed and fixture state reset",
    };
  },
};

const mobilePlatformTaskAdapter: TaskAdapter = {
  id: "builtin-mobile-platform",
  version: "1.0.0",
  driver: "platform-automation",
  capabilities: [
    "android-emulator-preflight",
    "ios-simulator-preflight",
    "exact-device-binding",
    "exact-app-binding",
    "fail-closed-without-runner",
  ],
  async preflight(context) {
    const mobile = context.task.mobile;
    if (!mobile || context.task.kind !== "mobile") {
      return { status: "BLOCKED", reason: "mobile task contract is missing" };
    }
    const requirements = resolve(
      boundedPath(mobile.provider.fixture_root),
      "provider-requirements.json",
    );
    if (!(await isFile(requirements))) {
      return {
        status: "BLOCKED",
        reason: "mobile provider requirements are missing",
      };
    }
    if (mobile.provider.runtime === "android-emulator") {
      let devices: Awaited<ReturnType<typeof runCommand>>;
      try {
        devices = await runCommand(
          ["adb", "devices"],
          {
            cwd: rootPath(),
            timeoutMs: Math.min(context.task.timeout_ms, 10_000),
            signal: context.signal,
            maxOutputBytes: 16 * 1024,
            unsetEnv: context.child_env_omit,
          },
        );
      } catch {
        return {
          status: "BLOCKED",
          reason: "Android adb provider is unavailable on this host",
        };
      }
      if (
        devices.exitCode !== 0 ||
        !devices.stdout.split("\n").some(
          (line) => line.trim() === `${mobile.provider.device_id}\tdevice`,
        )
      ) {
        return {
          status: "BLOCKED",
          reason: `Android device ${mobile.provider.device_id} is not available`,
        };
      }
    } else {
      const devices = await runCommand(
        ["xcrun", "simctl", "list", "devices", "available", "--json"],
        {
          cwd: rootPath(),
          timeoutMs: Math.min(context.task.timeout_ms, 10_000),
          signal: context.signal,
          maxOutputBytes: 64 * 1024,
          unsetEnv: context.child_env_omit,
        },
      );
      if (
        devices.exitCode !== 0 ||
        !devices.stdout.includes(mobile.provider.device_id)
      ) {
        return {
          status: "BLOCKED",
          reason: `iOS simulator ${mobile.provider.device_id} is not available`,
        };
      }
    }
    return {
      status: "BLOCKED",
      reason:
        `The exact ${mobile.provider.runtime} device is present, but no snapshot-bound action runner is configured`,
    };
  },
  async execute(): Promise<TaskAdapterResult> {
    return {
      outcome: "BLOCKED",
      earliest_failure: "mobile execution cannot start without a ready provider",
      side_effects: "NONE",
      policy_decisions: [],
      events: [],
    };
  },
  async recover(): Promise<TaskRecoveryResult> {
    return {
      status: "NOT_REQUIRED",
      attempted: false,
      reason: "mobile provider preflight stops before dispatch",
    };
  },
  async cleanup(): Promise<TaskCleanupResult> {
    return {
      status: "NOT_REQUIRED",
      attempted: false,
      verified: true,
      residual_resources: [],
      reason: "mobile provider preflight creates no resources",
    };
  },
};

function agentInvocationAction(task: TaskDefinition): SimulationAction {
  const action = taskPolicyActions(task)[0];
  if (!action || action.type !== "agent-invoke") {
    throw new CascadeError(`agent task ${task.id} lacks an invocation action`);
  }
  return action;
}

async function readAgentFixtureSource(
  file: string,
  label: string,
  maxBytes: number,
): Promise<Buffer> {
  return readBoundedRegularFile(
    boundedPath(file, "product-evals/tasks/agent-response/"),
    label,
    { maxBytes },
  );
}

const agentFixtureTaskAdapter: TaskAdapter = {
  id: "builtin-agent-fixture",
  version: "1.0.0",
  driver: "agent-runtime",
  capabilities: [
    "source-blind-input",
    "provider-neutral-result",
    "per-claim-evidence",
    "read-only",
    "network-deny",
  ],
  async preflight(context) {
    const agent = context.task.agent;
    if (!agent) {
      return { status: "BLOCKED", reason: "agent task contract is missing" };
    }
    if (agent.runtime.provider !== "fixture") {
      return {
        status: "BLOCKED",
        reason: `unsupported agent runtime provider: ${agent.runtime.provider}`,
      };
    }
    if (agent.target.mode !== "explicit-instructions") {
      return {
        status: "BLOCKED",
        reason: `fixture adapter cannot prove target mode: ${agent.target.mode}`,
      };
    }
    for (const file of context.task.inputs ?? []) {
      if (!(await isFile(boundedPath(file, "product-evals/tasks/agent-response/")))) {
        return { status: "BLOCKED", reason: `agent source is unavailable: ${file}` };
      }
    }
    const promptSources = [
      agent.target.instruction_file!,
      agent.prompt_file,
      agent.input_file,
    ];
    for (const file of promptSources) {
      const text = (await readAgentFixtureSource(
        file,
        `agent prompt source ${file}`,
        64 * 1024,
      )).toString("utf8");
      if (/(?:GOLDEN_EXPECTATION|EXPECTED_ANSWER|PRIOR_RUN_RESULT)/.test(text)) {
        return {
          status: "BLOCKED",
          reason: `agent prompt source contains prohibited evaluation leakage: ${file}`,
        };
      }
    }
    return { status: "READY", reason: null };
  },
  async execute(context): Promise<TaskAdapterResult> {
    const agent = context.task.agent!;
    const action = agentInvocationAction(context.task);
    const decision = context.authorize_action({
      action_index: 0,
      action,
      projected_output_bytes: 0,
    });
    const before = { phase: "ready" };
    if (decision.decision !== "ALLOW") {
      return {
        outcome: decision.decision === "DENY" ? "FAILED" : "BLOCKED",
        earliest_failure: decision.reason,
        side_effects: "NONE",
        policy_decisions: [decision],
        events: [{
          event_type: "ACTION",
          index: 0,
          type: action.type,
          before,
          after: before,
          status: decision.decision === "DENY" ? "FAIL" : "BLOCKED",
          reason: decision.reason,
          policy_decision: decision.decision,
        }],
      };
    }
    consumePolicyBudget(decision, context.budget_usage);
    await context.record_action_dispatch(decision);
    const responseFile = agent.runtime.fixture_response_file!;
    const responseBytes = await readAgentFixtureSource(
      responseFile,
      `agent fixture response ${responseFile}`,
      agent.budgets.max_output_bytes,
    );
    let response: unknown;
    try {
      response = JSON.parse(responseBytes.toString("utf8"));
      const outputSchema = await readJson<Record<string, unknown>>(
        boundedPath(
          agent.output_schema_file,
          "product-evals/tasks/agent-response/",
        ),
      );
      assertJsonSchema(response, outputSchema, `agent response ${context.task.id}`);
      const record = response as Record<string, unknown>;
      const claims = record.material_claims as Array<Record<string, unknown>>;
      if (
        !claims.length ||
        new Set(claims.map((claim) => claim.id)).size !== claims.length ||
        claims.some(
          (claim) =>
            !Array.isArray(claim.evidence_refs) ||
            !claim.evidence_refs.length ||
            claim.evidence_refs.some(
              (reference) => !new Set(["instruction", "input"]).has(String(reference)),
            ),
        )
      ) {
        throw new CascadeError("agent material claims lack unique source evidence");
      }
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      return {
        outcome: "FAILED",
        earliest_failure: reason,
        side_effects: "NONE",
        policy_decisions: [decision],
        events: [{
          event_type: "ACTION",
          index: 0,
          type: action.type,
          before,
          after: { phase: "invalid-response" },
          status: "FAIL",
          reason,
          policy_decision: decision.decision,
        }],
      };
    }
    const normalizedPath = resolve(context.task_root, "agent-response.json");
    await writeJsonExclusive(normalizedPath, response, { fileMode: 0o600 });
    const responseRecord = response as Record<string, unknown>;
    const claims = responseRecord.material_claims as Array<Record<string, unknown>>;
    const responseDigest = valueDigest(response);
    return {
      outcome: "SUCCEEDED",
      earliest_failure: null,
      side_effects: "NONE",
      policy_decisions: [decision],
      events: [{
        event_type: "ACTION",
        index: 0,
        type: action.type,
        before,
        after: { phase: "responded", response_digest: responseDigest },
        status: "PASS",
        reason: null,
        policy_decision: decision.decision,
      }],
      final_state: {
        agent: {
          contract_status: "VALID",
          runtime_provider: agent.runtime.provider,
          target_mode: agent.target.mode,
          response_digest: responseDigest,
          response,
          material_claim_count: claims.length,
          next_route_status: responseRecord.next_route === null
            ? "NONE"
            : "PROPOSED",
          permissions: agent.permissions,
        },
      },
      observations: [{
        type: "agent-response",
        surface: {
          kind: "agent-response",
          session_id: `${context.run_id}:agent-runtime:${context.task.id}`,
          surface_id: `task:${context.task.id}`,
          screen_id: "final-response",
        },
        payload: {
          response_digest: responseDigest,
          material_claim_ids: claims.map((claim) => claim.id),
          next_route_status: responseRecord.next_route === null
            ? "NONE"
            : "PROPOSED",
        },
      }],
      produced_evidence: [normalizedPath],
    };
  },
  async cleanup() {
    return {
      status: "VERIFIED",
      attempted: true,
      verified: true,
      residual_resources: [],
      reason: "fixture agent read only source-bound inputs and retained normalized output",
    };
  },
};

async function validateAgentResponseValue(
  response: unknown,
  agent: NonNullable<TaskDefinition["agent"]>,
  label: string,
): Promise<{
  record: Record<string, unknown>;
  claims: Array<Record<string, unknown>>;
}> {
  const outputSchema = await readJson<Record<string, unknown>>(
    boundedPath(
      agent.output_schema_file,
      "product-evals/tasks/agent-response/",
    ),
  );
  assertJsonSchema(response, outputSchema, label);
  const record = response as Record<string, unknown>;
  const claims = record.material_claims as Array<Record<string, unknown>>;
  if (
    !claims.length ||
    new Set(claims.map((claim) => claim.id)).size !== claims.length ||
    claims.some(
      (claim) =>
        !Array.isArray(claim.evidence_refs) ||
        !claim.evidence_refs.length ||
        claim.evidence_refs.some(
          (reference) => !new Set(["instruction", "input"]).has(String(reference)),
        ),
    )
  ) {
    throw new CascadeError("agent material claims lack unique source evidence");
  }
  return { record, claims };
}

function agentActionFailure(
  action: SimulationAction,
  decision: PolicyDecision,
  reason: string,
): TaskAdapterResult {
  const policyStopped = decision.decision !== "ALLOW";
  const blocked =
    decision.decision === "REQUIRE_CONFIRMATION" ||
    decision.decision === "BLOCKED";
  return {
    outcome: blocked ? "BLOCKED" : "FAILED",
    earliest_failure: reason,
    side_effects: "NONE",
    policy_decisions: [decision],
    events: [{
      event_type: "ACTION",
      index: 0,
      type: action.type,
      before: { phase: "ready" },
      after: policyStopped
        ? { phase: "policy-stop" }
        : { phase: "invalid-response" },
      status: blocked ? "BLOCKED" : "FAIL",
      reason,
      policy_decision: decision.decision,
    }],
  };
}

const agentCodexTaskAdapter: TaskAdapter = {
  id: "builtin-agent-codex",
  version: "1.0.0",
  driver: "agent-runtime",
  capabilities: [
    "codex-exec-jsonl",
    "ephemeral-session",
    "structured-output",
    "source-blind-input",
    "read-only",
    "network-deny",
  ],
  async preflight(context) {
    const agent = context.task.agent;
    if (!agent || agent.runtime.provider !== "codex") {
      return { status: "BLOCKED", reason: "Codex agent task contract is missing" };
    }
    if (agent.target.mode !== "explicit-instructions") {
      return {
        status: "BLOCKED",
        reason: `Codex target mode lacks a proven invocation identity seam: ${agent.target.mode}`,
      };
    }
    if (agent.permissions.tools.length > 0) {
      return {
        status: "BLOCKED",
        reason: "standalone Codex canary does not authorize composed tools",
      };
    }
    const version = await runCommand(["codex", "--version"], {
      timeoutMs: 5_000,
      maxOutputBytes: 4_096,
      unsetEnv: context.child_env_omit,
      env: { NO_COLOR: "1", TERM: "xterm-256color" },
    });
    if (version.exitCode !== 0 || version.timedOut || !version.stdout.trim()) {
      return { status: "BLOCKED", reason: "Codex CLI is unavailable" };
    }
    return { status: "READY", reason: null };
  },
  async execute(context): Promise<TaskAdapterResult> {
    const agent = context.task.agent!;
    const action = agentInvocationAction(context.task);
    const decision = context.authorize_action({
      action_index: 0,
      action,
      projected_output_bytes: 0,
    });
    if (decision.decision !== "ALLOW") {
      return agentActionFailure(action, decision, decision.reason);
    }
    consumePolicyBudget(decision, context.budget_usage);
    await context.record_action_dispatch(decision);
    const instruction = (await readAgentFixtureSource(
      agent.target.instruction_file!,
      "Codex agent instructions",
      64 * 1024,
    )).toString("utf8");
    const promptSource = (await readAgentFixtureSource(
      agent.prompt_file,
      "Codex agent prompt",
      64 * 1024,
    )).toString("utf8");
    const inputSource = (await readAgentFixtureSource(
      agent.input_file,
      "Codex agent input",
      64 * 1024,
    )).toString("utf8");
    if (/(?:GOLDEN_EXPECTATION|EXPECTED_ANSWER|PRIOR_RUN_RESULT)/.test(
      `${instruction}\n${promptSource}\n${inputSource}`,
    )) {
      return agentActionFailure(
        action,
        decision,
        "Codex prompt package contains prohibited evaluation leakage",
      );
    }
    await mkdir(context.task_root, { recursive: true, mode: 0o700 });
    const workspace = await mkdtemp(resolve(context.task_root, "codex-workspace-"));
    const outputSchemaPath = resolve(workspace, "output.schema.json");
    const tracePath = resolve(context.task_root, "codex-trace.jsonl");
    const stderrPath = resolve(context.task_root, "codex-stderr.log");
    const commandPath = resolve(context.task_root, "codex-command.json");
    const normalizedPath = resolve(context.task_root, "agent-response.json");
    const schemaBytes = await readAgentFixtureSource(
      agent.output_schema_file,
      "Codex output schema",
      64 * 1024,
    );
    await writeTextExclusive(outputSchemaPath, schemaBytes.toString("utf8"), {
      fileMode: 0o600,
    });
    const prompt = [
      instruction,
      "",
      "Task:",
      promptSource,
      "",
      "Input:",
      inputSource,
      "",
      "Return only the JSON object required by the output schema.",
    ].join("\n");
    const command = [
      "codex",
      "exec",
      "--ephemeral",
      "--ignore-user-config",
      "--ignore-rules",
      "--json",
      "--disable", "plugins",
      "--disable", "apps",
      "--disable", "browser_use",
      "--disable", "computer_use",
      "--disable", "image_generation",
      "--disable", "code_mode_host",
      "-m", agent.runtime.model!,
      "-c", `model_reasoning_effort="${agent.runtime.reasoning_effort}"`,
      "-s", "read-only",
      "-C", workspace,
      "--skip-git-repo-check",
      "--output-schema", outputSchemaPath,
      prompt,
    ];
    await writeJsonExclusive(commandPath, {
      argv: [...command.slice(0, -1), "<source-bound-prompt-package>"],
      sandbox: "read-only",
      approval_mode: "non-interactive",
      ephemeral: true,
      ignored_user_config: true,
      disabled_capabilities: [
        "plugins", "apps", "browser_use", "computer_use", "image_generation", "code_mode_host",
      ],
    }, { fileMode: 0o600 });
    let execution;
    try {
      execution = await runCommand(command, {
        cwd: workspace,
        timeoutMs: context.task.timeout_ms,
        maxOutputBytes: 2 * 1024 * 1024,
        signal: context.signal,
        unsetEnv: context.child_env_omit,
        env: { NO_COLOR: "1", TERM: "xterm-256color" },
      });
    } finally {
      await rm(workspace, { recursive: true, force: true });
    }
    await writeTextExclusive(tracePath, execution.stdout, { fileMode: 0o600 });
    await writeTextExclusive(stderrPath, execution.stderr, { fileMode: 0o600 });
    if (execution.exitCode !== 0 || execution.timedOut || execution.aborted) {
      return {
        ...agentActionFailure(
          action,
          decision,
          execution.timedOut
            ? "Codex agent timed out"
            : execution.stderr.trim() || `Codex agent exited ${execution.exitCode}`,
        ),
        produced_evidence: [tracePath, stderrPath, commandPath],
      };
    }
    let response: unknown;
    let usage: Record<string, number> | null = null;
    let responseRecord: Record<string, unknown>;
    let claims: Array<Record<string, unknown>>;
    try {
      const parsed = parseCodexJsonl(execution.stdout);
      response = parsed.output;
      usage = parsed.usage;
      ({ record: responseRecord, claims } = await validateAgentResponseValue(
        response,
        agent,
        `Codex agent response ${context.task.id}`,
      ));
    } catch (error) {
      return {
        ...agentActionFailure(
          action,
          decision,
          error instanceof Error ? error.message : String(error),
        ),
        produced_evidence: [tracePath, stderrPath, commandPath],
      };
    }
    await writeJsonExclusive(normalizedPath, response, { fileMode: 0o600 });
    const responseDigest = valueDigest(response);
    return {
      outcome: "SUCCEEDED",
      earliest_failure: null,
      side_effects: "NONE",
      policy_decisions: [decision],
      events: [{
        event_type: "ACTION",
        index: 0,
        type: action.type,
        before: { phase: "ready" },
        after: { phase: "responded", response_digest: responseDigest },
        status: "PASS",
        reason: null,
        policy_decision: decision.decision,
      }],
      final_state: {
        agent: {
          contract_status: "VALID",
          runtime_provider: "codex",
          runtime_model: agent.runtime.model,
          reasoning_effort: agent.runtime.reasoning_effort,
          target_mode: agent.target.mode,
          response_digest: responseDigest,
          response,
          material_claim_count: claims.length,
          next_route_status: responseRecord.next_route === null ? "NONE" : "PROPOSED",
          permissions: agent.permissions,
          usage,
        },
      },
      observations: [{
        type: "agent-response",
        surface: {
          kind: "agent-response",
          session_id: `${context.run_id}:agent-runtime:${context.task.id}`,
          surface_id: `task:${context.task.id}`,
          screen_id: "final-response",
        },
        payload: {
          response_digest: responseDigest,
          material_claim_ids: claims.map((claim) => claim.id),
          next_route_status: responseRecord.next_route === null ? "NONE" : "PROPOSED",
          usage,
        },
      }],
      produced_evidence: [normalizedPath, tracePath, stderrPath, commandPath],
    };
  },
  async recover(context) {
    const entries = await readdir(context.task_root, { withFileTypes: true }).catch(() => []);
    for (const entry of entries) {
      if (entry.isDirectory() && entry.name.startsWith("codex-workspace-")) {
        await rm(resolve(context.task_root, entry.name), {
          recursive: true,
          force: true,
        });
      }
    }
    return {
      status: "RECOVERED",
      attempted: true,
      reason: "removed any owned ephemeral Codex workspace without retrying the invocation",
    };
  },
  async cleanup() {
    return {
      status: "VERIFIED",
      attempted: true,
      verified: true,
      residual_resources: [],
      reason: "ephemeral Codex workspace was removed and only bounded evidence was retained",
    };
  },
};

async function resolveAgentCascadeProfile(
  task: TaskDefinition,
): Promise<ResolvedCascadeHarnessProfile> {
  const agent = task.agent;
  if (!agent || agent.target.mode !== "cascade-profile") {
    throw new CascadeError("Cascade profile agent task contract is missing");
  }
  if (agent.output_schema_file !== "harness-evals/response.schema.json") {
    throw new CascadeError("Cascade profile must use the canonical harness response schema");
  }
  return resolveCascadeHarnessProfile({
    profile_file: boundedPath(
      agent.target.profile_file!,
      "product-evals/tasks/agent-response/",
    ),
    prompt_file: boundedPath(
      agent.prompt_file,
      "product-evals/tasks/agent-response/",
    ),
    input_file: boundedPath(
      agent.input_file,
      "product-evals/tasks/agent-response/",
    ),
    output_schema_file: rootPath(agent.output_schema_file),
  });
}

const agentCascadeTaskAdapter: TaskAdapter = {
  id: "builtin-agent-cascade",
  version: "1.0.0",
  driver: "agent-runtime",
  capabilities: [
    "current-scenario-binding",
    "codex-exec-jsonl",
    "deterministic-hard-gates",
    "harness-coverage-identity",
    "source-blind-input",
    "read-only",
    "network-deny",
  ],
  async preflight(context) {
    const agent = context.task.agent;
    if (
      !agent ||
      agent.runtime.provider !== "codex" ||
      agent.target.mode !== "cascade-profile" ||
      agent.evaluation_profile !== "cascade-route-and-trace-v1"
    ) {
      return { status: "BLOCKED", reason: "Cascade profile agent task contract is missing" };
    }
    if (agent.permissions.tools.length > 0) {
      return {
        status: "BLOCKED",
        reason: "Cascade profile canary does not authorize composed tools",
      };
    }
    try {
      await resolveAgentCascadeProfile(context.task);
    } catch (error) {
      return {
        status: "BLOCKED",
        reason: error instanceof Error ? error.message : String(error),
      };
    }
    const version = await runCommand(["codex", "--version"], {
      timeoutMs: 5_000,
      maxOutputBytes: 4_096,
      unsetEnv: context.child_env_omit,
      env: { NO_COLOR: "1", TERM: "xterm-256color" },
    });
    if (version.exitCode !== 0 || version.timedOut || !version.stdout.trim()) {
      return { status: "BLOCKED", reason: "Codex CLI is unavailable" };
    }
    return { status: "READY", reason: null };
  },
  async execute(context): Promise<TaskAdapterResult> {
    const agent = context.task.agent!;
    const action = agentInvocationAction(context.task);
    const decision = context.authorize_action({
      action_index: 0,
      action,
      projected_output_bytes: 0,
    });
    if (decision.decision !== "ALLOW") {
      return agentActionFailure(action, decision, decision.reason);
    }
    consumePolicyBudget(decision, context.budget_usage);
    await context.record_action_dispatch(decision);
    const resolvedProfile = await resolveAgentCascadeProfile(context.task);
    await mkdir(context.task_root, { recursive: true, mode: 0o700 });
    const tracePath = resolve(context.task_root, "codex-trace.jsonl");
    const stderrPath = resolve(context.task_root, "codex-stderr.log");
    const commandPath = resolve(context.task_root, "codex-command.json");
    const profilePath = resolve(context.task_root, "cascade-profile.json");
    const scenarioPath = resolve(context.task_root, "selected-scenario.json");
    const sourceManifestPath = resolve(context.task_root, "harness-source-manifest.json");
    const normalizedPath = resolve(context.task_root, "normalized.json");
    const eligibilityPath = resolve(context.task_root, "eligibility.json");
    const command = cascadeHarnessCodexCommand(
      resolvedProfile,
      agent.runtime.model!,
      agent.runtime.reasoning_effort!,
    );
    await writeJsonExclusive(commandPath, {
      argv: [...command.slice(0, -1), "<current-source-bound-harness-prompt>"],
      sandbox: "read-only",
      approval_mode: "non-interactive",
      ephemeral: true,
      scenario_id: resolvedProfile.scenario.id,
      catalog_digest: resolvedProfile.catalog_digest,
      harness_source_digest: resolvedProfile.harness_source_manifest.digest,
    }, { fileMode: 0o600 });
    const execution = await runCommand(command, {
      cwd: rootPath(),
      timeoutMs: context.task.timeout_ms,
      maxOutputBytes: 2 * 1024 * 1024,
      signal: context.signal,
      unsetEnv: context.child_env_omit,
      env: { NO_COLOR: "1", TERM: "xterm-256color" },
    });
    await Promise.all([
      writeTextExclusive(tracePath, execution.stdout, { fileMode: 0o600 }),
      writeTextExclusive(stderrPath, execution.stderr, { fileMode: 0o600 }),
      writeJsonExclusive(profilePath, resolvedProfile.profile, { fileMode: 0o600 }),
      writeJsonExclusive(scenarioPath, resolvedProfile.scenario, { fileMode: 0o600 }),
      writeJsonExclusive(sourceManifestPath, resolvedProfile.harness_source_manifest, { fileMode: 0o600 }),
    ]);
    const graded = await gradeCascadeHarnessTrace(resolvedProfile, {
      stdout: execution.stdout,
      stderr: execution.stderr,
      exit_code: execution.exitCode,
      duration_ms: execution.durationMs,
      timed_out: execution.timedOut,
    });
    const toolCalls =
      (graded.trace.commands?.length ?? 0) +
      (graded.trace.tool_actions?.length ?? 0);
    const outputBytes = Buffer.byteLength(String(graded.trace.final_text ?? ""), "utf8");
    const outputTokens = Number(
      graded.trace.usage?.output_tokens ??
      graded.trace.usage?.outputTokens ??
      0,
    );
    const budgetFailures = [
      ...(toolCalls > agent.budgets.max_tool_calls ? ["tool-call-budget"] : []),
      ...(outputBytes > agent.budgets.max_output_bytes ? ["output-byte-budget"] : []),
      ...(outputTokens > agent.budgets.max_tokens ? ["output-token-budget"] : []),
    ];
    const eligibility = budgetFailures.length
      ? {
          ...graded.eligibility,
          verdict: "FAIL",
          failure_class: "target-behavior",
          hard_failures: [
            ...new Set([
              ...(graded.eligibility.hard_failures ?? []),
              ...budgetFailures,
            ]),
          ],
          checks: [
            ...(graded.eligibility.checks ?? []),
            {
              name: "agent-task-budget",
              passed: false,
              hard_gate: true,
              evidence: {
                tool_calls: toolCalls,
                max_tool_calls: agent.budgets.max_tool_calls,
                output_bytes: outputBytes,
                max_output_bytes: agent.budgets.max_output_bytes,
                output_tokens: outputTokens,
                max_tokens: agent.budgets.max_tokens,
              },
            },
          ],
        }
      : graded.eligibility;
    await Promise.all([
      writeJsonExclusive(normalizedPath, graded.trace, { fileMode: 0o600 }),
      writeJsonExclusive(eligibilityPath, eligibility, { fileMode: 0o600 }),
    ]);
    const passed = eligibility.verdict === "PASS";
    const blocked = eligibility.verdict === "BLOCKED";
    const response = graded.trace.final_response;
    const evidence = [
      tracePath,
      stderrPath,
      commandPath,
      profilePath,
      scenarioPath,
      sourceManifestPath,
      normalizedPath,
      eligibilityPath,
    ];
    return {
      outcome: passed ? "SUCCEEDED" : blocked ? "BLOCKED" : "FAILED",
      earliest_failure: passed
        ? null
        : String(eligibility.hard_failures?.[0] ?? "Cascade harness eligibility failed"),
      side_effects: "NONE",
      policy_decisions: [decision],
      events: [{
        event_type: "ACTION",
        index: 0,
        type: action.type,
        before: { phase: "ready" },
        after: {
          phase: passed ? "eligible" : "ineligible",
          scenario_id: resolvedProfile.scenario.id,
          eligibility: eligibility.verdict,
        },
        status: passed ? "PASS" : blocked ? "BLOCKED" : "FAIL",
        reason: passed ? null : String(eligibility.hard_failures?.[0] ?? "eligibility failed"),
        policy_decision: decision.decision,
      }],
      final_state: {
        agent: {
          contract_status: passed ? "VALID" : "INVALID",
          runtime_provider: "codex",
          runtime_model: agent.runtime.model,
          reasoning_effort: agent.runtime.reasoning_effort,
          target_mode: "cascade-profile",
          evaluation_profile: agent.evaluation_profile,
          profile_id: resolvedProfile.profile.id,
          scenario_id: resolvedProfile.scenario.id,
          scenario_digest: resolvedProfile.profile.scenario_digest,
          catalog_digest: resolvedProfile.catalog_digest,
          harness_source_digest: resolvedProfile.harness_source_manifest.digest,
          response_digest: response ? valueDigest(response) : null,
          response,
          eligibility,
          coverage_status: passed ? "CANDIDATE" : "REJECTED",
          semantic_judgment_status: "NOT_RUN",
          permissions: agent.permissions,
          usage: graded.trace.usage,
        },
      },
      observations: [{
        type: "agent-response",
        surface: {
          kind: "agent-response",
          session_id: `${context.run_id}:agent-runtime:${context.task.id}`,
          surface_id: `task:${context.task.id}`,
          screen_id: "normalized-trace",
        },
        payload: {
          scenario_id: resolvedProfile.scenario.id,
          scenario_digest: resolvedProfile.profile.scenario_digest,
          eligibility: eligibility.verdict,
          hard_failures: eligibility.hard_failures,
        },
      }],
      produced_evidence: evidence,
    };
  },
  async recover() {
    return {
      status: "UNSUPPORTED",
      attempted: false,
      reason: "an interrupted Cascade Codex target cannot be replayed without a new campaign run",
    };
  },
  async cleanup() {
    return {
      status: "VERIFIED",
      attempted: true,
      verified: true,
      residual_resources: [],
      reason: "the Cascade target used the repository read-only and retained only bounded evidence",
    };
  },
};

export function createTaskAdapterRegistry(
  additional: TaskAdapter[] = [],
): ReadonlyMap<string, TaskAdapter> {
  const adapters = new Map<string, TaskAdapter>();
  for (const adapter of [
    fakeTaskAdapter,
    directProcessTaskAdapter,
    ptyTaskAdapter,
    httpTaskAdapter,
    playwrightTaskAdapter,
    desktopPlatformTaskAdapter,
    mobilePlatformTaskAdapter,
    agentFixtureTaskAdapter,
    agentCodexTaskAdapter,
    agentCascadeTaskAdapter,
    ...additional,
  ]) {
    if (!/^[a-z0-9][a-z0-9.-]+$/.test(adapter.id)) {
      throw new CascadeError(`invalid task adapter id: ${adapter.id}`);
    }
    if (!/^[0-9]+\.[0-9]+\.[0-9]+$/.test(adapter.version)) {
      throw new CascadeError(
        `invalid task adapter version: ${adapter.driver}:${adapter.id}`,
      );
    }
    if (
      adapter.capabilities.length === 0 ||
      new Set(adapter.capabilities).size !== adapter.capabilities.length ||
      adapter.capabilities.some((capability) => !capability.trim())
    ) {
      throw new CascadeError(
        `invalid task adapter capabilities: ${adapter.driver}:${adapter.id}`,
      );
    }
    const key = `${adapter.driver}:${adapter.id}`;
    if (adapters.has(key)) {
      throw new CascadeError(`duplicate task adapter: ${key}`);
    }
    adapters.set(key, adapter);
  }
  return adapters;
}

const DEFAULT_ADAPTER_IDS: Partial<Record<DriverType, string>> = {
  fake: "builtin-fake",
  "direct-process": "builtin-direct-process",
  pty: "builtin-pty",
  "http-client": "builtin-http-client",
  playwright: "builtin-playwright",
  "platform-automation": "builtin-platform-automation",
};

function taskAdapterKey(task: TaskDefinition): string {
  const adapterId = task.driver.adapter ?? DEFAULT_ADAPTER_IDS[task.driver.type];
  return `${task.driver.type}:${adapterId ?? "unsupported"}`;
}

function selectTaskAdapter(
  task: TaskDefinition,
  adapters: ReadonlyMap<string, TaskAdapter>,
): TaskAdapter | undefined {
  if (task.driver.adapter || DEFAULT_ADAPTER_IDS[task.driver.type]) {
    return adapters.get(taskAdapterKey(task));
  }
  const matches = [...adapters.values()].filter(
    (adapter) => adapter.driver === task.driver.type,
  );
  return matches.length === 1 ? matches[0] : undefined;
}

function campaignStatus(outcome: TaskExecutionOutcome): CampaignStatus {
  if (outcome === "SUCCEEDED") return "PASS";
  if (outcome === "FAILED") return "FAIL";
  return "BLOCKED";
}

function noRecovery(reason: string | null = null): TaskRecoveryResult {
  return { status: "NOT_REQUIRED", attempted: false, reason };
}

function noCleanup(reason: string): TaskCleanupResult {
  return {
    status: "NOT_REQUIRED",
    attempted: false,
    verified: true,
    residual_resources: [],
    reason,
  };
}

function assertTaskAdapterResult(result: TaskAdapterResult): void {
  const outcomes = new Set<TaskExecutionOutcome>([
    "SUCCEEDED",
    "FAILED",
    "BLOCKED",
    "CANCELLED",
    "UNKNOWN_OUTCOME",
  ]);
  const sideEffects = new Set<TaskSideEffectStatus>(["NONE", "KNOWN", "UNKNOWN"]);
  if (!outcomes.has(result.outcome) || !sideEffects.has(result.side_effects)) {
    throw new CascadeError("task adapter returned an invalid result envelope");
  }
  if (result.outcome === "SUCCEEDED" && result.earliest_failure !== null) {
    throw new CascadeError("successful task adapter result contains a failure");
  }
  if (
    result.outcome !== "SUCCEEDED" &&
    (!result.earliest_failure || !result.earliest_failure.trim())
  ) {
    throw new CascadeError("non-success task adapter result must explain failure");
  }
  if (
    result.outcome === "UNKNOWN_OUTCOME" &&
    result.side_effects !== "UNKNOWN"
  ) {
    throw new CascadeError(
      "unknown task outcome must report unknown side effects",
    );
  }
}

function assertTaskCleanupResult(result: TaskCleanupResult): void {
  const successful =
    result.status === "VERIFIED" || result.status === "NOT_REQUIRED";
  if (result.verified !== successful) {
    throw new CascadeError("task cleanup status and verification disagree");
  }
  if (result.status === "VERIFIED" && !result.attempted) {
    throw new CascadeError("verified task cleanup must be attempted");
  }
  if (result.status === "NOT_REQUIRED" && result.attempted) {
    throw new CascadeError("unneeded task cleanup must not be attempted");
  }
  if (successful && result.residual_resources.length) {
    throw new CascadeError(
      "verified task cleanup cannot retain residual resources",
    );
  }
}

function assertTaskRecoveryResult(result: TaskRecoveryResult): void {
  if (
    (result.status === "RECOVERED" || result.status === "FAILED") &&
    !result.attempted
  ) {
    throw new CascadeError(
      "completed or failed task recovery must record an attempt",
    );
  }
  if (
    (result.status === "NOT_REQUIRED" || result.status === "UNSUPPORTED") &&
    result.attempted
  ) {
    throw new CascadeError(
      "unneeded or unsupported task recovery must not record an attempt",
    );
  }
}

type BoundedStepResult<T> =
  | { status: "COMPLETED"; value: T }
  | { status: "TIMED_OUT" | "CANCELLED"; reason: string };

const LIFECYCLE_ABORT_GRACE_MS = 100;
const PROCESS_TERMINATION_ALLOWANCE_MS = 1_000;

async function runBoundedTaskStep<T>(
  phase: "PREFLIGHT" | "EXECUTE" | "ORACLE" | "RECOVERY" | "CLEANUP",
  timeoutMs: number,
  parentSignal: AbortSignal | undefined,
  operation: (signal: AbortSignal) => Promise<T>,
): Promise<BoundedStepResult<T>> {
  if (!Number.isFinite(timeoutMs) || timeoutMs < 1) {
    throw new CascadeError(`task ${phase.toLowerCase()} timeout must be positive`);
  }
  if (parentSignal?.aborted) {
    return {
      status: "CANCELLED",
      reason: `task cancelled before ${phase.toLowerCase()}`,
    };
  }

  const controller = new AbortController();
  type Settled =
    | { kind: "COMPLETED"; value: T }
    | { kind: "FAILED"; error: unknown };
  const settled: Promise<Settled> = Promise.resolve()
    .then(() => operation(controller.signal))
    .then(
      (value) => ({ kind: "COMPLETED", value }),
      (error) => ({ kind: "FAILED", error }),
    );

  let timeout: ReturnType<typeof setTimeout> | undefined;
  let boundaryResolved = false;
  let resolveBoundary!: (
    result: Exclude<BoundedStepResult<T>, { status: "COMPLETED" }>,
  ) => void;
  const boundary = new Promise<
    Exclude<BoundedStepResult<T>, { status: "COMPLETED" }>
  >((resolveBoundaryPromise) => {
    resolveBoundary = resolveBoundaryPromise;
  });
  const stop = (status: "TIMED_OUT" | "CANCELLED", reason: string): void => {
    if (boundaryResolved) return;
    boundaryResolved = true;
    controller.abort();
    resolveBoundary({ status, reason });
  };
  const cancel = (): void =>
    stop("CANCELLED", `task cancelled during ${phase.toLowerCase()}`);
  parentSignal?.addEventListener("abort", cancel, { once: true });
  if (parentSignal?.aborted) cancel();
  timeout = setTimeout(
    () =>
      stop(
        "TIMED_OUT",
        `task ${phase.toLowerCase()} exceeded ${timeoutMs}ms bound`,
      ),
    timeoutMs,
  );

  try {
    const first = await Promise.race([settled, boundary]);
    if ("kind" in first) {
      if (first.kind === "FAILED") throw first.error;
      return { status: "COMPLETED", value: first.value };
    }

    let graceTimer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        settled,
        new Promise<void>((resolveGrace) => {
          graceTimer = setTimeout(resolveGrace, LIFECYCLE_ABORT_GRACE_MS);
        }),
      ]);
    } finally {
      if (graceTimer) clearTimeout(graceTimer);
    }
    return first;
  } finally {
    if (timeout) clearTimeout(timeout);
    parentSignal?.removeEventListener("abort", cancel);
  }
}

export async function executeCampaignTask(
  input: ExecuteCampaignTaskInput,
): Promise<TaskResult> {
  const {
    resolved,
    task,
    task_root: taskRoot,
    operator_identity: operatorIdentity,
    target_actor_identity: targetActorIdentity,
  } = input;
  if (
    !operatorIdentity.trim() ||
    !targetActorIdentity.trim() ||
    operatorIdentity === targetActorIdentity
  ) {
    throw new CascadeError(
      "task operator and target identities must be non-empty and distinct",
    );
  }
  const platform = input.platform ?? process.platform;
  if (!platform.trim()) {
    throw new CascadeError("task platform must be non-empty");
  }
  for (const action of taskPolicyActions(task)) {
    assertSafeSimulationAction(action);
  }
  if (!input.artifact_store) {
    await mkdir(taskRoot, { recursive: true });
  }
  const startedAt = utcNow();
  const started = performance.now();
  const events: TaskEvent[] = [];
  const emit = (event: TaskEventPayload): void => {
    events.push({
      ...event,
      sequence: events.length,
      at: utcNow(),
      task_id: task.id,
      driver: task.driver.type,
    } as TaskEvent);
  };
  emit({
    event_type: "LIFECYCLE",
    type: "task-lifecycle",
    phase: "STARTED",
  });

  const evidence: FrozenCampaignArtifact[] = [];
  let outcome: TaskExecutionOutcome;
  let earliestFailure: string | null = null;
  let sideEffects: TaskSideEffectStatus = "NONE";
  const taskPolicies = resolved.policies.filter((policy) =>
    (task.policy_ids ?? []).includes(policy.id),
  );
  const taskOracles = resolved.oracles.filter((oracle) =>
    task.oracle_ids.includes(oracle.id),
  );
  const confirmationReceipts = clone(input.confirmation_receipts ?? []);
  const confirmationSecrets = confirmationSecretRecord(
    input.confirmation_secrets ?? {},
  );
  if (confirmationReceipts.length && !input.confirmation_usage) {
    throw new CascadeError(
      "confirmation receipts require shared single-use confirmation state",
    );
  }
  const confirmationUsage = input.confirmation_usage ?? {};
  const budgetUsage = input.budget_usage ?? {};
  const sensitiveValues = Object.values(confirmationSecrets);
  const childEnvOmit = [...new Set([
    ...(input.child_env_omit ?? []),
    ...confirmationSecretEnvironmentNames(taskPolicies),
  ])].sort();
  for (const name of childEnvOmit) {
    assertConfirmationSecretEnvironmentName(
      name,
      "task child environment omission name",
    );
  }
  const observedPolicyDecisions: PolicyDecision[] = [];
  const dispatchState: TaskDispatchState = {
    status: "NOT_DISPATCHED",
    actions: [],
    uncertainty_reason: null,
  };
  const adapterContext: TaskAdapterContext = {
    run_id: input.run_id ?? `task:${task.id}`,
    campaign_id: resolved.campaign.id,
    platform,
    task_root: taskRoot,
    task: clone(task),
    fixture: clone(resolved.fixture),
    policies: clone(taskPolicies),
    cleanup_contract: clone(resolved.world.cleanup),
    budget_usage: budgetUsage,
    dispatch_state: dispatchState,
    record_action_dispatch: async (decision) => {
      if (decision.decision !== "ALLOW") {
        throw new CascadeError(
          "only an allowed policy decision can cross an action dispatch boundary",
        );
      }
      if (
        decision.confirmation_receipt_id &&
        decision.confirmation_receipt_digest
      ) {
        const confirmationReceipt = confirmationReceipts.find(
          (receipt) =>
            receipt.receipt_id === decision.confirmation_receipt_id &&
            valueDigest(receipt) === decision.confirmation_receipt_digest,
        );
        if (!confirmationReceipt) {
          throw new CascadeError(
            "allowed confirmation decision is missing its verified receipt",
          );
        }
        const usage = confirmationUsage[decision.confirmation_receipt_id];
        if (!usage) {
          throw new CascadeError(
            "allowed confirmation decision is missing its single-use authority",
          );
        }
        const record: CampaignConfirmationUsageRecord = {
          schema_version: 2,
          artifact_type: "campaign-confirmation-usage",
          run_id: input.run_id ?? `task:${task.id}`,
          campaign_id: resolved.campaign.id,
          task_id: task.id,
          receipt_id: decision.confirmation_receipt_id,
          usage: clone(usage),
        };
        const recordName = `${valueDigest(decision.confirmation_receipt_id)}.json`;
        if (input.artifact_store) {
          await input.artifact_store.writeStageJson(
            `execution/confirmation-receipts/${recordName}`,
            confirmationReceipt,
          );
          await input.artifact_store.writeStageJson(
            `execution/confirmation-usage/${recordName}`,
            record,
          );
        } else {
          const receiptRoot = resolve(taskRoot, "confirmation-receipts");
          await mkdir(receiptRoot, { recursive: true });
          await writeJsonExclusive(
            resolve(receiptRoot, recordName),
            confirmationReceipt,
          );
          const usageRoot = resolve(taskRoot, "confirmation-usage");
          await mkdir(usageRoot, { recursive: true });
          await writeJsonExclusive(resolve(usageRoot, recordName), record);
        }
      }
      dispatchState.status = "DISPATCHED";
      dispatchState.uncertainty_reason = null;
      dispatchState.actions.push({
        action_index: decision.action_index,
        action_type: decision.action_type,
        action_binding_version: decision.action_binding_version,
        action_binding_digest: decision.action_binding_digest,
        dispatched_at: utcNow(),
      });
    },
    authorize_action: ({ action_index, action, projected_output_bytes }) => {
      const decision = resolvePolicyDecision(taskPolicies, {
        run_id: input.run_id ?? `task:${task.id}`,
        campaign_id: resolved.campaign.id,
        task_id: task.id,
        task_kind: task.kind,
        driver_type: task.driver.type,
        action_index,
        action,
        projected_output_bytes,
        supported_budget_dimensions: [...CAMPAIGN_SUPPORTED_BUDGET_DIMENSIONS],
        redaction_capabilities: [...CAMPAIGN_REDACTION_CAPABILITIES],
        now: utcNow(),
        confirmation_receipts: confirmationReceipts,
        confirmation_secrets: confirmationSecrets,
        confirmation_usage: confirmationUsage,
        budget_usage: budgetUsage,
      });
      observedPolicyDecisions.push(decision);
      return decision;
    },
    control_output: (value, policy, additionalSensitiveValues = []) =>
      applyPolicyOutputControls(
        value,
        policy,
        [...sensitiveValues, ...additionalSensitiveValues],
      ),
    child_env_omit: childEnvOmit,
    secret_resolver: input.secret_resolver,
  };
  const contextWithSignal = (signal: AbortSignal): TaskAdapterContext => ({
    ...adapterContext,
    signal,
  });
  const adapterRegistry = input.adapters ?? createTaskAdapterRegistry();
  const adapter = selectTaskAdapter(task, adapterRegistry);
  if (
    adapter &&
    (adapter.driver !== task.driver.type ||
      (task.driver.adapter !== undefined && adapter.id !== task.driver.adapter))
  ) {
    throw new CascadeError(
      `task adapter registry mismatch: ${taskAdapterKey(task)}/${adapter.driver}:${adapter.id}`,
    );
  }
  let adapterResult: TaskAdapterResult | null = null;
  let adapterExecutionStarted = false;
  let recovery = noRecovery();
  let cleanup = noCleanup("adapter was not dispatched");

  if (input.signal?.aborted) {
    outcome = "CANCELLED";
    earliestFailure = "task cancelled before adapter dispatch";
  } else if (!adapter) {
    outcome = "BLOCKED";
    earliestFailure = `runtime adapter not implemented: ${taskAdapterKey(task)}`;
    emit({
      event_type: "ADAPTER",
      type: "adapter",
      status: "BLOCKED",
      adapter_id: task.driver.adapter ?? "unsupported",
      adapter_version: "unknown",
      capabilities: [],
      reason: earliestFailure,
    });
  } else {
    try {
      const preflight = await runBoundedTaskStep(
        "PREFLIGHT",
        task.timeout_ms,
        input.signal,
        (signal) => adapter.preflight(contextWithSignal(signal)),
      );
      if (preflight.status !== "COMPLETED") {
        outcome = preflight.status === "CANCELLED" ? "CANCELLED" : "BLOCKED";
        earliestFailure = preflight.reason;
        emit({
          event_type: "ADAPTER",
          type: "adapter",
          status: "BLOCKED",
          adapter_id: adapter.id,
          adapter_version: adapter.version,
          capabilities: [...adapter.capabilities],
          reason: earliestFailure,
        });
      } else if (preflight.value.status === "BLOCKED") {
        outcome = "BLOCKED";
        earliestFailure = preflight.value.reason ?? "adapter preflight blocked";
        emit({
          event_type: "ADAPTER",
          type: "adapter",
          status: "BLOCKED",
          adapter_id: adapter.id,
          adapter_version: adapter.version,
          capabilities: [...adapter.capabilities],
          reason: earliestFailure,
        });
      } else {
        emit({
          event_type: "ADAPTER",
          type: "adapter",
          status: "READY",
          adapter_id: adapter.id,
          adapter_version: adapter.version,
          capabilities: [...adapter.capabilities],
          reason: null,
        });
        adapterExecutionStarted = true;
        const executionBound =
          task.timeout_ms +
          (adapter.driver === "direct-process" || adapter.driver === "pty"
            ? PROCESS_TERMINATION_ALLOWANCE_MS
            : 0);
        const step = await runBoundedTaskStep(
          "EXECUTE",
          executionBound,
          input.signal,
          (signal) => adapter.execute(contextWithSignal(signal)),
        );
        if (step.status === "COMPLETED") {
          assertTaskAdapterResult(step.value);
          adapterResult = step.value;
          if (
            stableJson(adapterResult.policy_decisions) !==
            stableJson(observedPolicyDecisions)
          ) {
            throw new CascadeError(
              "task adapter policy decisions diverged from lifecycle authority",
            );
          }
          outcome = adapterResult.outcome;
          earliestFailure = adapterResult.earliest_failure;
          sideEffects = adapterResult.side_effects;
          for (const event of adapterResult.events) emit(event);
        } else {
          if (dispatchState.status === "NOT_DISPATCHED") {
            dispatchState.status = "UNKNOWN";
            dispatchState.uncertainty_reason =
              "adapter execution ended without an observable dispatch boundary";
          }
          outcome =
            step.status === "CANCELLED" ? "CANCELLED" : "UNKNOWN_OUTCOME";
          sideEffects = "UNKNOWN";
          earliestFailure = step.reason;
          emit({
            event_type: "BOUNDARY",
            type: "lifecycle-bound",
            phase: "EXECUTE",
            status: step.status,
            reason: step.reason,
          });
        }
      }
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      if (adapterExecutionStarted && dispatchState.status === "NOT_DISPATCHED") {
        dispatchState.status = "UNKNOWN";
        dispatchState.uncertainty_reason =
          "adapter failed without an observable dispatch boundary";
      }
      outcome = adapterExecutionStarted ? "UNKNOWN_OUTCOME" : "BLOCKED";
      sideEffects = adapterExecutionStarted ? "UNKNOWN" : "NONE";
      earliestFailure = adapterExecutionStarted
        ? `adapter failed after dispatch: ${detail}`
        : `adapter preflight failed: ${detail}`;
    }
  }

  const oracleResults: OracleResult[] = [];
  const oracleObservations: TaskOracleObservation[] = [];
  const oracleEvaluator = input.oracle_evaluator ?? createTaskOracleEvaluator();
  if (outcome === "SUCCEEDED") {
    for (const oracle of taskOracles) {
      let result: OracleResult;
      try {
        const step = await runBoundedTaskStep(
          "ORACLE",
          task.timeout_ms,
          input.signal,
          (signal) =>
            oracleEvaluator.evaluate(oracle, {
              final_state: adapterResult?.final_state,
              command: adapterResult?.command,
              http: adapterResult?.http,
              task_root: taskRoot,
              signal,
            }),
        );
        if (step.status === "COMPLETED") {
          result = step.value;
        } else {
          result = {
            oracle_id: oracle.id,
            type: oracle.type,
            status: "FAIL",
            error: step.reason,
          };
          outcome = step.status === "CANCELLED" ? "CANCELLED" : "BLOCKED";
          earliestFailure = step.reason;
          emit({
            event_type: "BOUNDARY",
            type: "lifecycle-bound",
            phase: "ORACLE",
            status: step.status,
            reason: step.reason,
          });
        }
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        result = {
          oracle_id: oracle.id,
          type: oracle.type,
          status: "FAIL",
          error: `oracle evaluation failed: ${detail}`,
        };
      }
      if (
        oracle.type === "file-exists" ||
        oracle.type === "task-file-exists"
      ) {
        if (!input.artifact_store) {
          throw new CascadeError(
            `file-exists oracle requires immutable campaign artifact authority: ${oracle.id}`,
          );
        }
        const file = oracle.file!;
        const observation = await observeFileExistsAuthority(
          file,
          oracle.type === "task-file-exists" ? { root: taskRoot } : {},
        );
        const sourcePath = observation.absolute_path;
        const present = observation.present;
        const frozenEvidence = present
          ? await input.artifact_store.freezeFile({
              source_path: sourcePath,
              namespace: `execution/tasks/${task.id}/oracle-evidence`,
              producer: operatorIdentity,
              platform,
              redaction_profile: "no-secrets-v1",
            })
          : null;
        oracleObservations.push({
          schema_version: 1,
          oracle_id: oracle.id,
          type: oracle.type,
          file,
          observed_at: utcNow(),
          present,
          frozen_evidence: frozenEvidence,
        });
        if (frozenEvidence) evidence.push(frozenEvidence);
        result = {
          oracle_id: oracle.id,
          type: oracle.type,
          status: present ? "PASS" : "FAIL",
          expected: true,
          actual: present,
          evidence: file,
        };
      }
      oracleResults.push(result);
      emit({
        event_type: "ORACLE",
        type: "oracle",
        oracle_id: oracle.id,
        status: result.status,
      });
      if (result.status === "FAIL" && outcome === "SUCCEEDED") {
        outcome = "FAILED";
        earliestFailure = `required oracle failed: ${oracle.id}`;
      }
      if (outcome === "CANCELLED" || outcome === "BLOCKED") break;
    }
  }

  if (
    adapter &&
    adapterExecutionStarted &&
    (outcome === "CANCELLED" || outcome === "UNKNOWN_OUTCOME")
  ) {
    try {
      const step = await runBoundedTaskStep(
        "RECOVERY",
        task.timeout_ms,
        undefined,
        (signal) =>
          adapter.recover(contextWithSignal(signal), {
            outcome,
            reason: earliestFailure ?? "task outcome requires recovery",
          }),
      );
      if (step.status === "COMPLETED") {
        recovery = step.value;
        assertTaskRecoveryResult(recovery);
      } else {
        recovery = {
          status: "FAILED",
          attempted: true,
          reason: step.reason,
        };
        emit({
          event_type: "BOUNDARY",
          type: "lifecycle-bound",
          phase: "RECOVERY",
          status: step.status,
          reason: step.reason,
        });
      }
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      recovery = {
        status: "FAILED",
        attempted: true,
        reason: `recovery failed: ${detail}`,
      };
    }
    emit({
      event_type: "RECOVERY",
      type: "recovery",
      status: recovery.status,
      reason: recovery.reason,
    });
  }

  if (adapter && adapterExecutionStarted) {
    try {
      const step = await runBoundedTaskStep(
        "CLEANUP",
        task.timeout_ms,
        undefined,
        (signal) =>
          adapter.cleanup(contextWithSignal(signal), adapterResult),
      );
      if (step.status === "COMPLETED") {
        cleanup = step.value;
        assertTaskCleanupResult(cleanup);
      } else {
        cleanup = {
          status: "UNKNOWN",
          attempted: true,
          verified: false,
          residual_resources: [],
          reason: step.reason,
        };
        emit({
          event_type: "BOUNDARY",
          type: "lifecycle-bound",
          phase: "CLEANUP",
          status: step.status,
          reason: step.reason,
        });
      }
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      cleanup = {
        status: "UNKNOWN",
        attempted: true,
        verified: false,
        residual_resources: [],
        reason: `cleanup outcome unknown: ${detail}`,
      };
    }
  }
  if (cleanup.status === "UNKNOWN") {
    outcome = "UNKNOWN_OUTCOME";
    sideEffects = "UNKNOWN";
    earliestFailure ??= cleanup.reason ?? "cleanup outcome unknown";
  } else if (cleanup.status === "FAILED") {
    if (outcome !== "UNKNOWN_OUTCOME") outcome = "FAILED";
    earliestFailure ??= cleanup.reason ?? "cleanup verification failed";
  }
  emit({
    event_type: "CLEANUP",
    type: "cleanup",
    status: cleanup.status,
    verified: cleanup.verified,
    residual_resources: cleanup.residual_resources,
    reason: cleanup.reason,
  });

  let parentCancellationRecorded = outcome === "CANCELLED";
  const latchParentCancellation = (): void => {
    if (!input.signal?.aborted || parentCancellationRecorded) return;
    parentCancellationRecorded = true;
    const reason = "task cancelled before terminal completion";
    emit({
      event_type: "BOUNDARY",
      type: "lifecycle-bound",
      phase: "FINALIZE",
      status: "CANCELLED",
      reason,
    });
    if (outcome === "SUCCEEDED") {
      outcome = "CANCELLED";
      earliestFailure = reason;
      if (recovery.status === "NOT_REQUIRED" && recovery.reason === null) {
        recovery = noRecovery(
          "execution completed before cancellation; cleanup still ran",
        );
      }
    }
  };
  latchParentCancellation();

  for (const file of adapterResult?.produced_evidence ?? []) {
    if (!input.artifact_store) {
      throw new CascadeError(
        `task ${task.id} adapter evidence requires the campaign artifact store`,
      );
    }
    const canonicalTaskRoot = await realpath(taskRoot);
    const canonicalEvidence = await realpath(file);
    const relation = relative(canonicalTaskRoot, canonicalEvidence);
    if (
      !relation ||
      relation === ".." ||
      relation.startsWith(`..${sep}`) ||
      relation.startsWith(sep)
    ) {
      throw new CascadeError(
        `task ${task.id} adapter evidence escapes its task root`,
      );
    }
    evidence.push(
      await input.artifact_store.freezeFile({
        source_path: canonicalEvidence,
        namespace: `execution/tasks/${task.id}/adapter-evidence`,
        producer: operatorIdentity,
        platform,
        redaction_profile: "no-secrets-v1",
      }),
    );
  }
  for (const file of task.evidence ?? []) {
    if (!input.artifact_store) {
      throw new CascadeError(
        `task ${task.id} evidence requires the campaign artifact store`,
      );
    }
    evidence.push(
      await input.artifact_store.freezeFile({
        source_path: boundedPath(file),
        namespace: `execution/tasks/${task.id}/evidence`,
        producer: operatorIdentity,
        platform,
        redaction_profile: "no-secrets-v1",
      }),
    );
  }
  const artifactRelative = (path: string): string =>
    relative(input.artifact_store!.runRoot, path).split("\\").join("/");
  const writeTaskText = async (path: string, value: string): Promise<void> => {
    if (input.artifact_store) {
      await input.artifact_store.writeStageText(artifactRelative(path), value);
    } else {
      await writeTextExclusive(path, value);
    }
  };
  const writeTaskJson = async (path: string, value: unknown): Promise<void> => {
    if (input.artifact_store) {
      await input.artifact_store.writeStageJson(artifactRelative(path), value);
    } else {
      await writeJsonExclusive(path, value);
    }
  };
  if (adapterResult?.command) {
    await writeTaskText(
      resolve(taskRoot, "stdout.log"),
      adapterResult.command.stdout,
    );
    await writeTaskText(
      resolve(taskRoot, "stderr.log"),
      adapterResult.command.stderr,
    );
  }
  if (adapterResult?.http) {
    await writeTaskText(
      resolve(taskRoot, "response-body.log"),
      adapterResult.http.body,
    );
    await writeTaskJson(
      resolve(taskRoot, "http.json"),
      adapterResult.http,
    );
  }
  if (adapterResult?.observations) {
    await writeTaskJson(
      resolve(taskRoot, "observations.json"),
      adapterResult.observations,
    );
  }
  latchParentCancellation();
  const status = campaignStatus(outcome);
  emit({
    event_type: "LIFECYCLE",
    type: "task-lifecycle",
    phase: "COMPLETED",
    outcome,
    status,
  });
  await writeTaskText(
    resolve(taskRoot, "events.jsonl"),
    events.map((event) => stableJson(event)).join("\n") + (events.length ? "\n" : ""),
  );
  await writeTaskJson(
    resolve(taskRoot, "policy-decisions.json"),
    observedPolicyDecisions,
  );
  await writeTaskJson(resolve(taskRoot, "dispatch.json"), dispatchState);
  await writeTaskJson(resolve(taskRoot, "oracle.json"), oracleResults);
  if (oracleObservations.length) {
    await writeTaskJson(
      resolve(taskRoot, "oracle-observations.json"),
      oracleObservations,
    );
  }
  if (adapterResult?.final_state) {
    await writeTaskJson(
      resolve(taskRoot, "final-state.json"),
      adapterResult.final_state,
    );
  }
  await writeTaskJson(resolve(taskRoot, "recovery.json"), recovery);
  await writeTaskJson(resolve(taskRoot, "cleanup.json"), cleanup);

  const policyDecisions = observedPolicyDecisions;
  const result: TaskResult = {
    task_id: task.id,
    kind: task.kind,
    driver: task.driver.type,
    adapter: adapter
      ? {
          id: adapter.id,
          version: adapter.version,
          capabilities: [...adapter.capabilities],
        }
      : null,
    required: task.required,
    status,
    outcome,
    operator_identity: operatorIdentity,
    target_actor_identity: targetActorIdentity,
    platform,
    started_at: startedAt,
    completed_at: utcNow(),
    duration_ms: Math.round(performance.now() - started),
    earliest_failure: earliestFailure,
    side_effects: sideEffects,
    dispatch: clone(dispatchState),
    policy_decisions: policyDecisions,
    policy_decision_digest: valueDigest(policyDecisions),
    oracle_results: oracleResults,
    oracle_observations: oracleObservations,
    events,
    ...(adapterResult?.final_state
      ? { final_state: adapterResult.final_state }
      : {}),
    ...(adapterResult?.command ? { command: adapterResult.command } : {}),
    ...(adapterResult?.http ? { http: adapterResult.http } : {}),
    ...(adapterResult?.observations
      ? { observations: adapterResult.observations }
      : {}),
    evidence,
    recovery,
    cleanup,
  };
  await writeTaskJson(resolve(taskRoot, "result.json"), result);
  return result;
}

export function buildCalibrationReceipt(
  resolved: ResolvedCampaign,
  runId: string,
  aggregatorIdentity: string,
  evaluationAt = utcNow(),
): CalibrationReceipt | null {
  const definition = resolved.calibration;
  if (!definition) return null;
  return buildCalibrationAuthority({
    definition,
    metrics: resolved.metrics,
    treatments: resolved.treatments,
    simulated_scores: resolved.simulatedScores,
    reference_scores: resolved.referenceScores,
    source_digests: resolved.sourceDigests,
    run_id: runId,
    aggregator_identity: aggregatorIdentity,
    evaluation_at: evaluationAt,
  });
}

export function evaluatePopulationAuthority(
  resolved: ResolvedCampaign,
  claim: ClaimDefinition,
  calibration: CalibrationReceipt | null,
): { status: ClaimStatus; reason: string; evidence: string[] } | null {
  const populationId = claim.scope.population_id as string | undefined;
  const population = populationId
    ? resolved.populations.find((item) => item.id === populationId)
    : undefined;
  const populationDerivation = population?.schema_version === 2
    ? resolved.personaDerivations.find(
        (item) => item.manifest.population_id === population.id,
      )
    : undefined;
  if (
    claim.population_authority === "persona-derived" &&
    !populationDerivation
  ) {
    return {
      status: "NOT_RUN",
      reason: "claim requires an approved digest-bound product-persona derivation",
      evidence: [],
    };
  }
  if (claim.population_authority === "estimated-prevalence") {
    const prevalenceDerivation = populationDerivation &&
      populationDerivation.manifest.mode === "representative" &&
      populationDerivation.manifest.weight_semantics === "estimated-prevalence" &&
      populationDerivation.manifest.evidence_sources.some(
        (source) => source.kind !== "framework-fixture" && Boolean(source.sha256),
      )
        ? populationDerivation
        : undefined;
    if (
      resolved.simulation.simulation_scope !== "product" ||
      !prevalenceDerivation ||
      !calibration ||
      calibration.framework_fixture
    ) {
      return {
        status: "NOT_RUN",
        reason:
          "estimated-prevalence authority requires a product-scoped representative derivation with digest-bound non-fixture evidence and non-fixture calibration",
        evidence: prevalenceDerivation ? [prevalenceDerivation.path] : [],
      };
    }
  }
  return null;
}

export function claimStatus(
  resolved: ResolvedCampaign,
  claim: ClaimDefinition,
  taskResults: TaskResult[],
  calibration: CalibrationReceipt | null,
): { status: ClaimStatus; reason: string; evidence: string[] } {
  const populationAuthority = evaluatePopulationAuthority(
    resolved,
    claim,
    calibration,
  );
  if (populationAuthority) return populationAuthority;
  const oracleResults = taskResults.flatMap((task) => task.oracle_results);
  const policyDecisions = taskResults.flatMap((task) => task.policy_decisions);
  const missingOracles = claim.required_oracle_ids.filter(
    (id) => !oracleResults.some((result) => result.oracle_id === id),
  );
  const failedOracles = claim.required_oracle_ids.filter((id) =>
    oracleResults.some(
      (result) => result.oracle_id === id && result.status === "FAIL",
    ),
  );
  const deniedPolicies = claim.required_policy_ids.filter((id) =>
    policyDecisions.some(
      (decision) =>
        decision.policy_id === id && decision.decision !== "ALLOW",
    ),
  );
  const missingPolicyProjection = requiredPolicyEvidenceProjection(
    claim.required_policy_ids,
    policyDecisions,
  );
  const failedTasks = taskResults.filter(
    (task) => task.required && task.status !== "PASS",
  );
  const metricResults = calibration?.metric_results ?? [];
  const missingMetrics = claim.required_metric_ids.filter(
    (id) => !metricResults.some((result) => result.metric_id === id),
  );
  const failedMetrics = claim.required_metric_ids.filter((id) =>
    metricResults.some(
      (result) => result.metric_id === id && result.status !== "PASS",
    ),
  );
  const availableEvidence = new Set([
    "source-manifest",
    "execution-receipt",
    ...(taskResults.length ? ["task-result"] : []),
    ...(taskResults.some((task) => task.events.length) ? ["trajectory"] : []),
    ...(policyDecisions.length ? ["policy-decisions"] : []),
    ...(oracleResults.length ? ["oracle"] : []),
    ...(taskResults.every((task) => task.cleanup.verified) ? ["cleanup"] : []),
    ...(calibration ? ["calibration-receipt"] : []),
  ]);
  const missingEvidence = claim.evidence_requirements.filter(
    (requirement) => !availableEvidence.has(requirement),
  );
  if (missingOracles.length) {
    return {
      status: "BLOCKED",
      reason: `required oracle evidence missing: ${missingOracles.join(", ")}`,
      evidence: [],
    };
  }
  if (missingPolicyProjection || missingMetrics.length || missingEvidence.length) {
    return {
      status: "BLOCKED",
      reason: [
        missingPolicyProjection?.reason ?? null,
        missingMetrics.length
          ? `required metric evidence missing: ${missingMetrics.join(", ")}`
          : null,
        missingEvidence.length
          ? `required artifacts missing: ${missingEvidence.join(", ")}`
          : null,
      ]
        .filter(Boolean)
        .join("; "),
      evidence: [],
    };
  }
  if (failedTasks.length) {
    return {
      status: "UNSUPPORTED",
      reason: `required task failed: ${failedTasks.map((item) => item.task_id).join(", ")}`,
      evidence: failedTasks.map((item) => item.task_id),
    };
  }
  if (failedOracles.length || deniedPolicies.length || failedMetrics.length) {
    return {
      status: "UNSUPPORTED",
      reason: [
        failedOracles.length
          ? `failed oracles: ${failedOracles.join(", ")}`
          : null,
        deniedPolicies.length
          ? `unsatisfied policies: ${deniedPolicies.join(", ")}`
          : null,
        failedMetrics.length
          ? `failed metrics: ${failedMetrics.join(", ")}`
          : null,
      ]
        .filter(Boolean)
        .join("; "),
      evidence: [...failedOracles, ...deniedPolicies, ...failedMetrics],
    };
  }
  if (claim.requires_calibration) {
    if (!calibration) {
      return {
        status: "NOT_RUN",
        reason: "required calibration receipt is absent",
        evidence: [],
      };
    }
    if (calibration.framework_fixture) {
      return {
        status: "NOT_RUN",
        reason:
          "framework-fixture calibration cannot support target release eligibility",
        evidence: [calibration.calibration_id],
      };
    }
    if (calibration.status !== "CALIBRATED") {
      return {
        status:
          calibration.status === "STALE" ? "BLOCKED" : "UNSUPPORTED",
        reason: `required calibration is ${calibration.status}`,
        evidence: [calibration.calibration_id],
      };
    }
  }
  return {
    status: "SUPPORTED",
    reason: "all declared non-compensating gates passed",
    evidence: [
      ...claim.required_oracle_ids,
      ...claim.required_policy_ids,
      ...claim.required_metric_ids,
      ...claim.evidence_requirements,
      ...(calibration ? [calibration.calibration_id] : []),
    ],
  };
}

function buildMechanicalEvaluation(
  resolved: ResolvedCampaign,
  taskResults: TaskResult[],
  calibration: CalibrationReceipt | null,
): MechanicalEvaluation {
  return buildMechanicalEvaluationAuthority({
    claims: resolved.claims,
    task_results: taskResults,
    calibration,
    population_authority: (claim) =>
      evaluatePopulationAuthority(resolved, claim, calibration),
  });
}

export function assertEvaluationReceiptFresh(
  resolved: ResolvedCampaign,
  identity: EvaluationIdentity,
  evaluation: EvaluationReceipt,
  mechanical: MechanicalEvaluation,
  expectedProviderDigests?: {
    input_manifest_digest: string;
    provider_trace_digest: string;
    provider_output_digest: string;
    request: EvaluationRequest;
    provider_output: CodexEvaluationOutput;
  },
): void {
  const expectedKeys = [
    "calibration_receipt_digest",
    "campaign_id",
    "claim_ledger",
    "created_at",
    "earliest_failure",
    "evaluation_id",
    "evaluation_input_digest",
    "evaluator_identity",
    "execution_receipt_digest",
    "input_manifest_digest",
    "model",
    "next_route",
    "operator_identity",
    "principal_identities",
    "profile_digest",
    "profile_id",
    "provider",
    "provider_output_digest",
    "provider_trace_digest",
    "reasoning_effort",
    "refinement_proposal_bindings",
    "residual_uncertainty",
    "root_cause",
    "rubric_digest",
    "rubric_id",
    "run_id",
    "schema_version",
    "source_manifest_digest",
    "specialized_evaluation",
    "status",
    "usage",
  ];
  if (
    !evaluation ||
    typeof evaluation !== "object" ||
    Array.isArray(evaluation) ||
    Object.keys(evaluation).sort().join(",") !== expectedKeys.join(",")
  ) {
    throw new CascadeError("evaluation receipt shape is invalid");
  }
  const expected: Array<[unknown, unknown, string]> = [
    [evaluation.schema_version, 3, "schema_version"],
    [
      evaluation.evaluation_id,
      `${identity.runId}-evaluation`,
      "evaluation_id",
    ],
    [evaluation.run_id, identity.runId, "run_id"],
    [evaluation.campaign_id, identity.campaignId, "campaign_id"],
    [
      evaluation.operator_identity,
      identity.operatorIdentity,
      "operator_identity",
    ],
    [
      evaluation.evaluator_identity,
      identity.evaluatorIdentity,
      "evaluator_identity",
    ],
    [evaluation.principal_identities, identity.principalIdentities, "principal_identities"],
    [evaluation.specialized_evaluation, identity.specializedEvaluation, "specialized_evaluation"],
    [
      evaluation.source_manifest_digest,
      identity.sourceManifestDigest,
      "source_manifest_digest",
    ],
    [
      evaluation.execution_receipt_digest,
      identity.executionReceiptDigest,
      "execution_receipt_digest",
    ],
    [
      evaluation.calibration_receipt_digest,
      identity.calibrationReceiptDigest,
      "calibration_receipt_digest",
    ],
    [
      evaluation.profile_id,
      resolved.evaluationProfile.id,
      "profile_id",
    ],
    [
      evaluation.profile_digest,
      valueDigest(resolved.evaluationProfile),
      "profile_digest",
    ],
    [
      evaluation.provider,
      resolved.evaluationProfile.provider,
      "provider",
    ],
    [
      evaluation.rubric_id,
      resolved.rubric?.id ?? null,
      "rubric_id",
    ],
    [
      evaluation.rubric_digest,
      resolved.rubric ? valueDigest(resolved.rubric) : null,
      "rubric_digest",
    ],
    [
      evaluation.model,
      resolved.evaluationProfile.model ?? null,
      "model",
    ],
    [
      evaluation.reasoning_effort,
      resolved.evaluationProfile.reasoning_effort ?? null,
      "reasoning_effort",
    ],
  ];
  for (const [actual, expectedValue, label] of expected) {
    if (!valuesEqual(actual, expectedValue)) {
      throw new CascadeError(`evaluation receipt ${label} is stale or mismatched`);
    }
  }
  const isDigest = (value: unknown): value is string =>
    typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
  if (!isDigest(evaluation.evaluation_input_digest)) {
    throw new CascadeError("evaluation receipt input digest is invalid");
  }
  const expectedInputDigest = evaluationInputDigest(resolved, identity, mechanical);
  if (evaluation.evaluation_input_digest !== expectedInputDigest) {
    throw new CascadeError("evaluation receipt input digest is stale or mismatched");
  }
  if (resolved.evaluationProfile.provider === "codex") {
    if (!expectedProviderDigests) {
      throw new CascadeError(
        "Codex evaluation freshness requires authenticated provider evidence",
      );
    }
    if (
      !isDigest(evaluation.input_manifest_digest) ||
      !isDigest(evaluation.provider_trace_digest) ||
      !isDigest(evaluation.provider_output_digest)
    ) {
      throw new CascadeError(
        "Codex evaluation receipt packet/provider digests are missing or invalid",
      );
    }
    if (
      evaluation.input_manifest_digest !== expectedProviderDigests.input_manifest_digest ||
      evaluation.provider_trace_digest !== expectedProviderDigests.provider_trace_digest ||
      evaluation.provider_output_digest !== expectedProviderDigests.provider_output_digest
    ) {
      throw new CascadeError(
        "Codex evaluation receipt packet/provider digests are stale or mismatched",
      );
    }
  } else if (
    evaluation.input_manifest_digest !== null ||
    evaluation.provider_trace_digest !== null ||
    evaluation.provider_output_digest !== null
  ) {
    throw new CascadeError("fixture evaluation receipt has provider trace data");
  }
  if (!Array.isArray(evaluation.refinement_proposal_bindings)) {
    throw new CascadeError("evaluation receipt refinement proposal bindings are invalid");
  }
  const proposalIds = new Set<string>();
  for (const [index, binding] of evaluation.refinement_proposal_bindings.entries()) {
    if (
      !binding ||
      typeof binding.proposal_id !== "string" ||
      !binding.proposal_id ||
      !isDigest(binding.candidate_digest) ||
      proposalIds.has(binding.proposal_id)
    ) {
      throw new CascadeError(
        `evaluation receipt refinement proposal binding ${index} is invalid or duplicated`,
      );
    }
    proposalIds.add(binding.proposal_id);
  }
  if (
    resolved.evaluationProfile.provider === "fixture" &&
    evaluation.refinement_proposal_bindings.length
  ) {
    throw new CascadeError("fixture evaluation receipt cannot bind refinement proposals");
  }
  if (
    evaluation.evaluator_identity === evaluation.operator_identity ||
    evaluation.evaluator_identity === identity.targetActorIdentity
  ) {
    throw new CascadeError("evaluation receipt violates evaluator independence");
  }
  const terminalStatuses = new Set(["PASS", "FAIL", "BLOCKED"]);
  const rootCauses = new Set([
    "none",
    "mechanical-gate",
    "execution",
    "evidence",
    "policy",
    "oracle",
    "cleanup",
    "calibration",
    "evaluator",
    "environment",
  ]);
  if (
    !terminalStatuses.has(String(evaluation.status)) ||
    !rootCauses.has(evaluation.root_cause) ||
    parseRfc3339Instant(evaluation.created_at) === null ||
    typeof evaluation.next_route !== "string" ||
    !evaluation.next_route ||
    !Array.isArray(evaluation.residual_uncertainty) ||
    evaluation.residual_uncertainty.some((item) => typeof item !== "string") ||
    (evaluation.earliest_failure !== null &&
      (typeof evaluation.earliest_failure !== "string" || !evaluation.earliest_failure))
  ) {
    throw new CascadeError("evaluation receipt terminal metadata is invalid");
  }
  const lockedClaims = new Set(identity.specializedEvaluation?.claim_ids ?? []);
  const expectedClaims = resolved.claims
    .map((claim) => claim.id)
    .filter((claimId) => !lockedClaims.has(claimId))
    .sort();
  const actualClaims = evaluation.claim_ledger.map((claim) => claim.claim_id);
  if (
    new Set(actualClaims).size !== actualClaims.length ||
    !valuesEqual([...actualClaims].sort(), expectedClaims)
  ) {
    throw new CascadeError(
      "evaluation receipt claim ledger is missing, duplicated, or stale",
    );
  }
  const claimDefinitions = new Map(resolved.claims.map((claim) => [claim.id, claim]));
  const claimStatuses = new Set<ClaimStatus>([
    "SUPPORTED",
    "PARTIALLY_SUPPORTED",
    "UNSUPPORTED",
    "CONFLICTING",
    "BLOCKED",
    "NOT_RUN",
    "INVALID",
  ]);
  for (const [index, claim] of evaluation.claim_ledger.entries()) {
    if (
      !claim ||
      typeof claim !== "object" ||
      Array.isArray(claim) ||
      Object.keys(claim).sort().join(",") !== "claim_id,class,evidence,reason,status" ||
      claim.class !== claimDefinitions.get(claim.claim_id)?.class ||
      !claimStatuses.has(claim.status) ||
      typeof claim.reason !== "string" ||
      !claim.reason ||
      !Array.isArray(claim.evidence) ||
      new Set(claim.evidence).size !== claim.evidence.length ||
      claim.evidence.some(
        (path) =>
          typeof path !== "string" ||
          !path ||
          path.startsWith("/") ||
          path.split("/").includes(".."),
      )
    ) {
      throw new CascadeError(`evaluation receipt claim ledger ${index} is invalid or stale`);
    }
  }
  assertTerminalStatusMatchesClaimLedger(
    evaluation.status === "PASS"
      ? "PASS"
      : evaluation.status === "BLOCKED"
        ? "BLOCKED"
        : "FAIL",
    evaluation.claim_ledger,
    "evaluation receipt",
  );
  if (
    evaluation.status === "PASS"
      ? evaluation.root_cause !== "none" || evaluation.earliest_failure !== null
      : evaluation.root_cause === "none" || evaluation.earliest_failure === null
  ) {
    throw new CascadeError("evaluation receipt terminal status conflicts with failure metadata");
  }
  const { created_at: _actualCreatedAt, ...actualProjection } = evaluation;
  if (resolved.evaluationProfile.provider === "fixture") {
    const expectedReceipt = buildFixtureEvaluationReceipt(
      resolved,
      identity,
      mechanical,
    );
    const { created_at: _expectedCreatedAt, ...expectedProjection } = expectedReceipt;
    if (!valuesEqual(actualProjection, expectedProjection)) {
      throw new CascadeError(
        "fixture evaluation receipt is not the deterministic mechanical projection",
      );
    }
  } else if (expectedProviderDigests) {
    const expectedRequest = generalEvaluationRequest(
      resolved,
      identity,
      mechanical,
    );
    if (!valuesEqual(expectedProviderDigests.request, expectedRequest)) {
      throw new CascadeError(
        "Codex evaluation request is not the frozen runtime projection",
      );
    }
    const expectedReceipt = buildCodexEvaluationReceipt(
      resolved,
      identity,
      mechanical,
      expectedProviderDigests.request,
      expectedProviderDigests.provider_output,
      expectedProviderDigests.input_manifest_digest,
      expectedProviderDigests.provider_trace_digest,
      evaluation.usage,
    );
    const { created_at: _expectedCreatedAt, ...expectedProjection } = expectedReceipt;
    if (!valuesEqual(actualProjection, expectedProjection)) {
      throw new CascadeError(
        "Codex evaluation receipt is not the authenticated provider judgment projection",
      );
    }
  }
}

function buildAggregationReceipt(
  resolved: ResolvedCampaign,
  runId: string,
  aggregatorIdentity: string,
  executionReceiptDigest: string,
  evaluation: EvaluationReceipt,
  specializedEvaluation: SpecializedEvaluationReceipt | null,
  reduction: EvaluationReduction,
  calibration: CalibrationReceipt | null,
  executionStatus: CampaignStatus,
): AggregationReceipt {
  const releaseClaims = reduction.claim_ledger
    .filter((claim) => claim.class === "release-eligibility")
    .map((claim) => ({ claim_id: claim.claim_id, status: claim.status }));
  const releaseEligible =
    executionStatus === "PASS" &&
    reduction.status === "PASS" &&
    reduction.claim_ledger
      .filter((claim) => claim.class !== "release-eligibility")
      .every((claim) => claim.status === "SUPPORTED") &&
    releaseClaims.length > 0 &&
    releaseClaims.every((claim) => claim.status === "SUPPORTED");
  return {
    schema_version: 2,
    aggregation_id: `${runId}-aggregation`,
    run_id: runId,
    campaign_id: resolved.campaign.id,
    aggregator_identity: aggregatorIdentity,
    execution_receipt_digest: executionReceiptDigest,
    specialized_evaluation_receipt_digest: specializedEvaluation
      ? valueDigest(specializedEvaluation)
      : null,
    evaluation_receipt_digest: valueDigest(evaluation),
    calibration_receipt_digest: calibration
      ? valueDigest(calibration)
      : null,
    release_eligible: releaseEligible,
    release_claims: releaseClaims,
    status: reduction.status,
    created_at: utcNow(),
  };
}

async function specializedEvidenceArtifacts(
  store: CampaignArtifactStore,
  receipt: SpecializedEvaluationReceipt,
): Promise<Array<SpecializedEvidenceArtifact & { content: string }>> {
  if (!Array.isArray(receipt.evidence_artifacts)) return [];
  return Promise.all(
    receipt.evidence_artifacts.map(async (artifact) => {
      if (!artifact || typeof artifact.path !== "string") return artifact;
      const bytes = await store.readArtifactBytes(
        artifact.path,
        `specialized evaluation evidence ${artifact.path}`,
      );
      const hasher = new Bun.CryptoHasher("sha256");
      hasher.update(bytes);
      return {
        path: artifact.path,
        sha256: hasher.digest("hex"),
        content: new TextDecoder("utf-8", { fatal: true }).decode(bytes),
      };
    }),
  );
}

async function campaignPaths(): Promise<string[]> {
  return (
    await walkFiles(CAMPAIGN_ROOT, {
      include: (path) =>
        path.endsWith(".json") &&
        !path.endsWith("schema.json") &&
        !path.endsWith("catalog.generated.json"),
    })
  ).sort();
}

export async function buildCampaignCatalog(): Promise<Record<string, unknown>> {
  const entries = [];
  for (const path of await campaignPaths()) {
    const resolved = await resolveCampaign(path);
    entries.push({
      id: resolved.campaign.id,
      title: resolved.campaign.title,
      owner_lane: resolved.campaign.owner_lane,
      tier: resolved.campaign.tier,
      manifest: rel(path),
      manifest_digest: await sha256File(path),
      simulation_id: resolved.simulation.id,
      simulation_scope: resolved.simulation.simulation_scope,
      intake_file: resolved.campaign.intake_file ?? null,
      intake_id: resolved.intake?.id ?? null,
      intake_status: resolved.intake?.status ?? null,
      intake_task_envelope_id: resolved.intake?.task_envelope?.envelope_id ?? null,
      intake_brief_id: resolved.intake?.product_context?.brief_id ?? null,
      contours: [...new Set(resolved.tasks.map((task) => task.kind))].sort(),
      drivers: [
        ...new Set(resolved.tasks.map((task) => task.driver.type)),
      ].sort(),
      adapters: [
        ...new Set(
          resolved.tasks.map((task) =>
            task.driver.adapter || DEFAULT_ADAPTER_IDS[task.driver.type]
              ? taskAdapterKey(task)
              : `${task.driver.type}:unspecified`,
          ),
        ),
      ].sort(),
      task_ids: resolved.tasks.map((task) => task.id),
      claim_ids: resolved.claims.map((claim) => claim.id),
      policy_ids: resolved.policies.map((policy) => policy.id),
      oracle_ids: resolved.oracles.map((oracle) => oracle.id),
      metric_ids: resolved.metrics.map((metric) => metric.id),
      treatment_ids: resolved.treatments.map((treatment) => treatment.id),
      calibration_id: resolved.calibration?.id ?? null,
      evaluation_profile_id: resolved.evaluationProfile.id,
      evaluation_provider: resolved.evaluationProfile.provider,
      evaluation_model: resolved.evaluationProfile.model ?? null,
      rubric_id: resolved.rubric?.id ?? null,
      source_digest: valueDigest(resolved.sourceDigests),
    });
  }
  const ids = entries.map((entry) => entry.id);
  if (new Set(ids).size !== ids.length) {
    throw new CascadeError("duplicate campaign IDs in catalog");
  }
  return {
    schema_version: 1,
    generated_from: "product-evals/campaigns/*.json",
    entries,
    digest: valueDigest(entries),
  };
}

async function assertCampaignCatalogCurrent(
  expected: Record<string, unknown>,
): Promise<void> {
  if (!(await isFile(CATALOG_PATH))) {
    throw new CascadeError("campaign catalog missing; run catalog --write");
  }
  const current = await readJson(CATALOG_PATH);
  if (!valuesEqual(current, expected)) {
    throw new CascadeError("campaign catalog is stale; run catalog --write");
  }
}

async function commandCatalog(argv: string[]): Promise<number> {
  const args = parseArgs(argv);
  const catalog = await buildCampaignCatalog();
  if (boolFlag(args, "write")) {
    await writeJsonAtomic(CATALOG_PATH, catalog);
    console.log(
      `campaign_catalog_status=WRITTEN entries=${(catalog.entries as unknown[]).length} digest=${catalog.digest}`,
    );
    return 0;
  }
  if (boolFlag(args, "check")) {
    await assertCampaignCatalogCurrent(catalog);
    console.log(
      `campaign_catalog_status=PASS entries=${(catalog.entries as unknown[]).length} digest=${catalog.digest}`,
    );
    return 0;
  }
  console.log(stableJson(catalog, true));
  return 0;
}

async function commandList(): Promise<number> {
  const catalog = await buildCampaignCatalog();
  for (const entry of catalog.entries as Array<Record<string, unknown>>) {
    console.log(
      `${entry.id}\t${entry.tier}\t${entry.task_ids instanceof Array ? entry.task_ids.length : 0}\t${entry.title}`,
    );
  }
  return 0;
}

async function commandValidate(value: string): Promise<number> {
  const path = await findCampaignPath(value);
  const resolved = await resolveCampaign(path);
  console.log(
    `campaign_validation_status=PASS campaign=${resolved.campaign.id} ` +
      `tasks=${resolved.tasks.length} claims=${resolved.claims.length} ` +
      `intake=${resolved.intake?.status ?? "NOT_APPLICABLE"} ` +
      `sources=${resolved.sourceFiles.length}`,
  );
  return 0;
}

async function freezeSources(
  resolved: ResolvedCampaign,
  store: CampaignArtifactStore,
  platform: string,
) {
  const frozen = [];
  for (const file of resolved.sourceFiles) {
    frozen.push(
      await store.freezeFile({
        source_path: boundedPath(file),
        namespace: "execution/source",
        producer: "simulation-operator",
        platform,
        redaction_profile: "source-code-v1",
      }),
    );
  }
  return frozen;
}

export async function sourceRevision(
  sourceFiles: string[],
  childEnvOmit: string[] = [],
  gitExecutable = "git",
): Promise<{ revision: string; dirty: boolean }> {
  const validatedChildEnvOmit = [...new Set(childEnvOmit)].sort();
  for (const name of validatedChildEnvOmit) {
    assertConfirmationSecretEnvironmentName(
      name,
      "campaign child environment omission name",
    );
  }
  const revision = await runCommand([gitExecutable, "rev-parse", "HEAD"], {
    unsetEnv: validatedChildEnvOmit,
  });
  if (revision.exitCode !== 0) {
    throw new CascadeError("cannot resolve repository source revision");
  }
  const status = await runCommand(
    [
      gitExecutable,
      "status",
      "--porcelain=v1",
      "--untracked-files=all",
      "--",
      ...sourceFiles,
      "scripts/cascade.ts",
      "scripts/cascade",
    ],
    { unsetEnv: validatedChildEnvOmit },
  );
  if (status.exitCode !== 0) {
    throw new CascadeError("cannot resolve campaign working-tree status");
  }
  return {
    revision: revision.stdout.trim(),
    dirty: status.stdout.trim().length > 0,
  };
}

export function campaignSessionContract(
  resolved: ResolvedCampaign,
  runId: string,
): { contract: SimulationSessionContract; lease_ttl_ms: number } {
  const taskCount = resolved.tasks.length;
  const maximumTaskTimeout = Math.max(
    ...resolved.tasks.map((task) => task.timeout_ms),
  );
  const maximumTaskLifecycle = maximumTaskTimeout * 6 + 5_000;
  const configured = resolved.campaign.session;
  const maxSteps = configured?.max_steps ?? taskCount;
  const maxStepsPerEpisode =
    configured?.max_steps_per_episode ?? Math.min(25, maxSteps);
  const maxDurationMs =
    configured?.max_duration_ms ??
    Math.max(
      60_000,
      resolved.tasks.reduce(
        (total, task) => total + task.timeout_ms * 6 + 5_000,
        0,
      ),
    );
  return {
    contract: {
      schema_version: 1,
      session_id: runId,
      purpose: resolved.campaign.purpose,
      initial_surfaces: resolved.tasks.map((task) =>
        campaignTaskSurfaceIdentity(task, runId)
      ),
      authorized_surfaces: campaignAuthorizedSurfaces(resolved.tasks, runId),
      limits: {
        max_duration_ms: maxDurationMs,
        max_step_duration_ms:
          configured?.max_step_duration_ms ??
          Math.min(maximumTaskLifecycle, maxDurationMs),
        max_steps: maxSteps,
        max_parallel_steps: configured?.max_parallel_steps ?? 1,
        max_steps_per_episode: maxStepsPerEpisode,
        max_surfaces: configured?.max_surfaces ?? Math.max(1, taskCount * 2),
        max_checkpoint_bytes:
          configured?.max_checkpoint_bytes ?? 10 * 1_024 * 1_024,
      },
    },
    lease_ttl_ms:
      configured?.lease_ttl_ms ??
      Math.min(
        24 * 60 * 60 * 1_000,
        Math.max(60_000, maximumTaskLifecycle + 1_000),
      ),
  };
}

function campaignTaskSurfaceIdentity(
  task: TaskDefinition,
  runId: string,
): SimulationSurfaceIdentity {
  return {
    surface_id: `task:${task.id}`,
    kind: task.kind,
    context_id: `${runId}:${task.driver.type}:${task.id}`,
  };
}

function campaignAuthorizedSurfaces(
  tasks: TaskDefinition[],
  runId: string,
): SimulationSurfaceIdentity[] {
  const identities = tasks.map((task) =>
    campaignTaskSurfaceIdentity(task, runId)
  );
  for (const task of tasks) {
    if (task.driver.type === "http-client" && task.request) {
      identities.push({
        surface_id: new URL(task.request.url).origin,
        kind: "http",
        context_id: runId,
      });
    }
  }
  const unique = new Map<string, SimulationSurfaceIdentity>();
  for (const identity of identities) {
    const previous = unique.get(identity.surface_id);
    if (previous && stableJson(previous) !== stableJson(identity)) {
      throw new CascadeError(
        `authored campaign surface identity collides: ${identity.surface_id}`,
      );
    }
    unique.set(identity.surface_id, identity);
  }
  return [...unique.values()];
}

function campaignTaskSurface(
  task: TaskDefinition,
  runId: string,
): SimulationSurfaceSession {
  return {
    ...campaignTaskSurfaceIdentity(task, runId),
    lifecycle: "READY",
    generation: 0,
  };
}

function taskSurfaceUpdates(
  task: TaskDefinition,
  result: TaskResult,
): SimulationSurfaceUpdate[] {
  const lifecycle = result.cleanup.verified ? "CLOSED" : "LOST";
  const updates: SimulationSurfaceUpdate[] = [
    {
      surface_id: `task:${task.id}`,
      lifecycle,
      generation: 0,
      last_observation_digest: valueDigest(result.observations ?? []),
    },
  ];
  for (const observation of result.observations ?? []) {
    updates.push({
      surface_id: observation.surface.surface_id,
      kind: observation.surface.kind,
      context_id: observation.surface.session_id,
      screen_id: observation.surface.screen_id,
      lifecycle,
      generation: 0,
      last_observation_digest: valueDigest(observation),
    });
  }
  return updates;
}

export function campaignTaskConflictKeys(
  task: Pick<TaskDefinition, "id" | "driver" | "policy_ids" | "request">,
): string[] {
  const keys = [
    `task:${task.id}`,
    ...(task.policy_ids ?? []).map((policyId) => `policy:${policyId}`),
  ];
  if (task.driver.type === "http-client" && task.request) {
    keys.push(`http-origin:${new URL(task.request.url).origin}`);
  } else if (task.driver.type !== "fake") {
    keys.push(
      `driver:${task.driver.type}:${task.driver.adapter ?? "default"}`,
    );
  }
  return [...new Set(keys)].sort();
}

export function selectCampaignTaskBatch<TTask extends Pick<
  TaskDefinition,
  "id" | "driver" | "policy_ids" | "request"
>>(
  tasks: TTask[],
  completedTaskIds: ReadonlySet<string>,
  maxParallel: number,
): TTask[] {
  if (!Number.isSafeInteger(maxParallel) || maxParallel < 1) {
    throw new CascadeError("campaign max parallel task count must be positive");
  }
  const selected: TTask[] = [];
  const occupied = new Set<string>();
  for (const task of tasks) {
    if (completedTaskIds.has(task.id)) continue;
    const conflictKeys = campaignTaskConflictKeys(task);
    if (conflictKeys.some((key) => occupied.has(key))) continue;
    selected.push(task);
    conflictKeys.forEach((key) => occupied.add(key));
    if (selected.length === maxParallel) break;
  }
  return selected;
}

function sessionStepOutcome(result: TaskResult): SimulationSessionStepResult<TaskResult>["outcome"] {
  if (result.status === "PASS") return "PASS";
  if (result.outcome === "UNKNOWN_OUTCOME") return "UNKNOWN_OUTCOME";
  if (result.outcome === "CANCELLED") return "CANCELLED";
  if (result.status === "BLOCKED") return "BLOCKED";
  return "FAIL";
}

interface CampaignSourceManifest {
  schema_version: 3;
  run_id: string;
  campaign_id: string;
  platform: string;
  source_revision: string;
  dirty_source: boolean;
  definitions: Array<{ path: string; sha256: string }>;
  frozen_sources: FrozenCampaignArtifact[];
  source_digest: string;
  identity_envelope_digest: string;
  claim_authority: {
    path: "execution/claim-authority.json";
    sha256: string;
  };
}

interface CampaignClaimAuthority {
  schema_version: 1;
  artifact_type: "campaign-claim-authority";
  run_id: string;
  campaign_id: string;
  campaign_digest: string;
  claims: Array<{
    claim_id: string;
    class: string;
    source_path: string;
    source_sha256: string;
  }>;
}

function campaignClaimAuthority(
  resolved: ResolvedCampaign,
  runId: string,
  campaignDigest: string,
): CampaignClaimAuthority {
  const sourceDigests = new Map(
    resolved.sourceDigests.map((source) => [source.path, source.sha256]),
  );
  const claims = resolved.campaign.claim_files.map((sourcePath, index) => {
    const claim = resolved.claims[index];
    const sourceSha256 = sourceDigests.get(sourcePath);
    if (!claim || !sourceSha256) {
      throw new CascadeError(
        `campaign claim authority cannot bind authored claim source: ${sourcePath}`,
      );
    }
    return {
      claim_id: claim.id,
      class: claim.class,
      source_path: sourcePath,
      source_sha256: sourceSha256,
    };
  });
  if (
    claims.length !== resolved.claims.length ||
    new Set(claims.map((claim) => claim.claim_id)).size !== claims.length
  ) {
    throw new CascadeError("campaign claim authority is incomplete or duplicated");
  }
  return {
    schema_version: 1,
    artifact_type: "campaign-claim-authority",
    run_id: runId,
    campaign_id: resolved.campaign.id,
    campaign_digest: campaignDigest,
    claims,
  };
}

async function validateResumeSourceManifest(
  resolved: ResolvedCampaign,
  store: CampaignArtifactStore,
  runId: string,
  manifest: CampaignSourceManifest,
  identities: CampaignIdentityEnvelope,
): Promise<void> {
  const expectedKeys = [
    "claim_authority",
    "campaign_id", "definitions", "dirty_source", "frozen_sources",
    "identity_envelope_digest", "platform", "run_id", "schema_version",
    "source_digest", "source_revision",
  ];
  if (
    !manifest || typeof manifest !== "object" || Array.isArray(manifest) ||
    Object.keys(manifest).sort().join(",") !== expectedKeys.sort().join(",") ||
    manifest.schema_version !== 3 ||
    manifest.run_id !== runId ||
    manifest.campaign_id !== resolved.campaign.id ||
    !manifest.platform?.trim() ||
    typeof manifest.source_revision !== "string" || !manifest.source_revision.trim() ||
    typeof manifest.dirty_source !== "boolean" ||
    !valuesEqual(manifest.definitions, resolved.sourceDigests) ||
    manifest.source_digest !== valueDigest(resolved.sourceDigests) ||
    manifest.identity_envelope_digest !== valueDigest(identities)
  ) {
    throw new CascadeError(
      "campaign resume source manifest is stale or mismatched",
    );
  }
  const authorityPath = "execution/claim-authority.json";
  const authority = await store.readArtifactJson<CampaignClaimAuthority>(
    authorityPath,
    "campaign claim authority",
  );
  const authorityRecord = await store.artifactFileRecord(authorityPath);
  const expectedAuthority = campaignClaimAuthority(
    resolved,
    runId,
    valueDigest(resolved.sourceDigests),
  );
  if (
    !valuesEqual(authority, expectedAuthority) ||
    manifest.claim_authority.path !== authorityPath ||
    manifest.claim_authority.sha256 !== authorityRecord.sha256
  ) {
    throw new CascadeError("campaign resume claim authority is stale or mismatched");
  }
  if (
    !Array.isArray(manifest.frozen_sources) ||
    manifest.frozen_sources.length !== resolved.sourceFiles.length
  ) {
    throw new CascadeError(
      "campaign resume source manifest has incomplete frozen sources",
    );
  }
  const expectedSourcePaths = new Set(
    resolved.sourceFiles.map((file) => rootPath(file)),
  );
  const frozenSourcePaths = new Set(
    manifest.frozen_sources.map((frozen) => resolve(frozen.source_path)),
  );
  if (
    frozenSourcePaths.size !== manifest.frozen_sources.length ||
    !valuesEqual(
      [...frozenSourcePaths].sort(),
      [...expectedSourcePaths].sort(),
    )
  ) {
    throw new CascadeError(
      "campaign resume frozen-source bindings are incomplete or duplicated",
    );
  }
  for (const frozen of manifest.frozen_sources) {
    let record;
    try {
      record = await store.artifactFileRecord(frozen.path);
    } catch {
      record = null;
    }
    if (
      !record ||
      record.sha256 !== frozen.sha256 ||
      record.size !== frozen.size ||
      frozen.lineage.run_id !== runId ||
      frozen.lineage.source_digest !== frozen.sha256
    ) {
      throw new CascadeError(
        `campaign resume frozen source is missing or stale: ${frozen.path}`,
      );
    }
  }
}

export async function restoreCampaignBudgetUsage(
  checkpoint: Pick<
    SimulationSessionCheckpoint<CampaignSessionState>,
    "domain_state"
  > | null,
  store: CampaignArtifactStore,
): Promise<CampaignPolicyBudgetUsage> {
  const restored: CampaignPolicyBudgetUsage = {};
  for (const summary of checkpoint?.domain_state.task_results ?? []) {
    const result = await store.readArtifactJson<TaskResult>(
      `execution/tasks/${summary.task_id}/result.json`,
      `campaign task result ${summary.task_id}`,
    );
    if (valueDigest(result) !== summary.result_digest) {
      throw new CascadeError(
        `campaign session task result digest mismatch: ${summary.task_id}`,
      );
    }
    for (const decision of result.policy_decisions) {
      if (!decision.policy_id || !decision.budgets) continue;
      const consumed = decision.budgets.consumed_after;
      const current = restored[decision.policy_id] ?? {
        action_count: 0,
        output_bytes: 0,
      };
      restored[decision.policy_id] = {
        action_count: Math.max(current.action_count, consumed.action_count),
        output_bytes: Math.max(current.output_bytes, consumed.output_bytes),
      };
    }
  }
  const checkpointUsage = checkpoint?.domain_state.budget_usage;
  if (checkpointUsage && !valuesEqual(checkpointUsage, restored)) {
    throw new CascadeError(
      "campaign checkpoint policy budget usage is stale or mismatched",
    );
  }
  return restored;
}

export async function restoreCampaignConfirmationUsage(
  checkpoint: Pick<
    SimulationSessionCheckpoint<CampaignSessionState>,
    "domain_state"
  > | null,
  store: CampaignArtifactStore,
): Promise<CampaignPolicyConfirmationUsage> {
  const restored: CampaignPolicyConfirmationUsage = {};
  for (const path of (await store.listArtifactFiles()).filter(
    (candidate) =>
      candidate.startsWith("execution/confirmation-usage/") &&
      candidate.endsWith(".json"),
  )) {
    const record = await store.readArtifactJson<CampaignConfirmationUsageRecord>(
      path,
      `campaign confirmation usage ${path}`,
    );
    if (
      record.schema_version !== 2 ||
      record.artifact_type !== "campaign-confirmation-usage" ||
      record.run_id !== store.runId ||
      !record.campaign_id ||
      !record.task_id ||
      !record.receipt_id ||
      !record.usage?.receipt_digest ||
      !record.usage.policy_id ||
      record.usage.action_binding_version !== ACTION_BINDING_VERSION ||
      !record.usage.action_binding_digest ||
      !record.usage.consumed_at ||
      path !==
        `execution/confirmation-usage/${valueDigest(record.receipt_id)}.json`
    ) {
      throw new CascadeError(
        `campaign confirmation usage record is invalid: ${path}`,
      );
    }
    if (restored[record.receipt_id]) {
      throw new CascadeError(
        `campaign confirmation receipt usage replay: ${record.receipt_id}`,
      );
    }
    restored[record.receipt_id] = record.usage;
  }
  const resultReceipts = new Set<string>();
  for (const summary of checkpoint?.domain_state.task_results ?? []) {
    const result = await store.readArtifactJson<TaskResult>(
      `execution/tasks/${summary.task_id}/result.json`,
      `campaign task result ${summary.task_id}`,
    );
    if (valueDigest(result) !== summary.result_digest) {
      throw new CascadeError(
        `campaign session task result digest mismatch: ${summary.task_id}`,
      );
    }
    for (const decision of result.policy_decisions) {
      if (
        decision.decision !== "ALLOW" ||
        !decision.confirmation_receipt_id ||
        !decision.confirmation_receipt_digest ||
        !decision.policy_id
      ) {
        continue;
      }
      const usage = {
        receipt_digest: decision.confirmation_receipt_digest,
        policy_id: decision.policy_id,
        action_binding_version: decision.action_binding_version,
        action_binding_digest: decision.action_binding_digest,
        consumed_at: decision.decided_at,
      };
      const existing = restored[decision.confirmation_receipt_id];
      if (resultReceipts.has(decision.confirmation_receipt_id)) {
        throw new CascadeError(
          `campaign confirmation receipt usage replay: ${decision.confirmation_receipt_id}`,
        );
      }
      resultReceipts.add(decision.confirmation_receipt_id);
      if (existing && !valuesEqual(existing, usage)) {
        throw new CascadeError(
          `campaign confirmation receipt usage collision: ${decision.confirmation_receipt_id}`,
        );
      }
      restored[decision.confirmation_receipt_id] = usage;
    }
  }
  const checkpointUsage = checkpoint?.domain_state.confirmation_usage;
  if (checkpointUsage) {
    for (const [receiptId, usage] of Object.entries(checkpointUsage)) {
      if (!valuesEqual(restored[receiptId], usage)) {
        throw new CascadeError(
          "campaign checkpoint confirmation usage is stale or mismatched",
        );
      }
    }
  }
  return restored;
}

function withoutFields(
  value: Record<string, unknown>,
  fields: readonly string[],
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(value).filter(([key]) => !fields.includes(key)),
  );
}

async function persistOrReuseStageJson<T extends object>(
  store: CampaignArtifactStore,
  relativePath: string,
  value: T,
  resume: boolean,
  volatileFields: readonly string[] = [],
): Promise<T> {
  if (!(await store.artifactFileExists(relativePath))) {
    await store.writeStageJson(relativePath, value);
    return value;
  }
  if (!resume) {
    throw new CascadeError(
      `campaign stage already exists outside resume: ${relativePath}`,
    );
  }
  const existing = await store.readArtifactJson<T>(
    relativePath,
    `campaign resume stage ${relativePath}`,
  );
  if (
    !valuesEqual(
      withoutFields(existing as Record<string, unknown>, volatileFields),
      withoutFields(value as Record<string, unknown>, volatileFields),
    )
  ) {
    throw new CascadeError(
      `campaign resume stage is stale or mismatched: ${relativePath}`,
    );
  }
  return existing;
}

async function persistOrReuseRuntimeHandoffAcceptance(
  store: CampaignArtifactStore,
  relativePath: string,
  value: RuntimeHandoffReceipt,
  resume: boolean,
): Promise<RuntimeHandoffReceipt> {
  if (!(await store.artifactFileExists(relativePath))) {
    await store.writeRuntimeHandoffAcceptance(relativePath, value);
    return value;
  }
  if (!resume) {
    throw new CascadeError(
      `campaign handoff acceptance already exists outside resume: ${relativePath}`,
    );
  }
  const existing = await store.readArtifactJson<RuntimeHandoffReceipt>(
    relativePath,
    `campaign resume handoff acceptance ${relativePath}`,
  );
  if (
    !valuesEqual(
      withoutFields(existing as unknown as Record<string, unknown>, ["created_at"]),
      withoutFields(value as unknown as Record<string, unknown>, ["created_at"]),
    )
  ) {
    throw new CascadeError(
      `campaign resume handoff acceptance differs from persisted stage: ${relativePath}`,
    );
  }
  return existing;
}

export function generalEvaluationRequest(
  resolved: ResolvedCampaign,
  identity: EvaluationIdentity,
  mechanical: MechanicalEvaluation,
): EvaluationRequest {
  const lockedClaims = new Set(identity.specializedEvaluation?.claim_ids ?? []);
  const generalLedger = mechanical.claim_ledger.filter(
    (claim) => !lockedClaims.has(claim.claim_id),
  );
  const input = {
    schema_version: 1 as const,
    evaluation_id: `${identity.runId}-evaluation`,
    run_id: identity.runId,
    campaign_id: identity.campaignId,
    source_manifest_digest: identity.sourceManifestDigest,
    execution_receipt_digest: identity.executionReceiptDigest,
    calibration_receipt_digest: identity.calibrationReceiptDigest,
    operator_identity: identity.operatorIdentity,
    target_actor_identity: identity.targetActorIdentity,
    evaluator_identity: identity.evaluatorIdentity,
    principal_identities: identity.principalIdentities,
    specialized_evaluation: identity.specializedEvaluation,
    profile: resolved.evaluationProfile,
    rubric: resolved.rubric ?? null,
    mechanical_evaluation: {
      claim_ledger: generalLedger,
      status: claimLedgerTerminalStatus(generalLedger),
    },
  };
  return {
    ...input,
    evaluation_input_digest: valueDigest(input),
  };
}

export function codexEvaluationOutputFromTrace(trace: string): CodexEvaluationOutput {
  const output = parseCodexJsonl(trace).output;
  if (!output || typeof output !== "object" || Array.isArray(output)) {
    throw new CascadeError("Codex evaluation trace lacks a completed typed output");
  }
  return output as CodexEvaluationOutput;
}

async function persistCodexProviderOutput(
  store: CampaignArtifactStore,
  evaluationId: string,
  resume: boolean,
): Promise<CodexEvaluationOutput> {
  const tracePath = `evaluations/${evaluationId}/stdout.jsonl`;
  const output = codexEvaluationOutputFromTrace(
    new TextDecoder("utf-8", { fatal: true }).decode(
      await store.readArtifactBytes(tracePath, "Codex evaluation provider trace"),
    ),
  );
  return persistOrReuseStageJson(
    store,
    `evaluations/${evaluationId}/provider-output.json`,
    output,
    resume,
  );
}

async function assertGeneralEvaluationArtifactsFresh(
  store: CampaignArtifactStore,
  evaluation: EvaluationReceipt,
  expectedRequest: EvaluationRequest,
): Promise<{
  input_manifest_digest: string;
  provider_trace_digest: string;
  provider_output_digest: string;
  request: EvaluationRequest;
  provider_output: CodexEvaluationOutput;
} | undefined> {
  const root = `evaluations/${evaluation.evaluation_id}`;
  const request = await store.readArtifactJson<EvaluationRequest>(
    `${root}/input/request.json`,
    "general evaluation request",
  );
  if (!valuesEqual(request, expectedRequest)) {
    throw new CascadeError("general evaluation request is stale or mismatched");
  }
  if (evaluation.provider !== "codex") return undefined;
  const inputManifest = await store.readArtifactJson<Record<string, unknown>>(
    `${root}/input/input-manifest.json`,
    "Codex evaluation input manifest",
  );
  const manifestKeys = [
    "evaluation_id",
    "evaluation_input_digest",
    "files",
    "manifest_digest",
    "schema_version",
  ];
  const files = Array.isArray(inputManifest.files)
    ? inputManifest.files as Array<Record<string, unknown>>
    : [];
  if (
    Object.keys(inputManifest).sort().join(",") !== manifestKeys.join(",") ||
    inputManifest.schema_version !== 1 ||
    inputManifest.evaluation_id !== evaluation.evaluation_id ||
    inputManifest.evaluation_input_digest !== evaluation.evaluation_input_digest ||
    inputManifest.manifest_digest !== valueDigest(files) ||
    inputManifest.manifest_digest !== evaluation.input_manifest_digest
  ) {
    throw new CascadeError("Codex evaluation input manifest is stale or invalid");
  }
  const listed = new Set<string>();
  for (const [index, file] of files.entries()) {
    if (
      !file ||
      Object.keys(file).sort().join(",") !== "path,sha256" ||
      typeof file.path !== "string" ||
      !file.path ||
      file.path.startsWith("/") ||
      file.path.split("/").includes("..") ||
      typeof file.sha256 !== "string" ||
      !/^[a-f0-9]{64}$/.test(file.sha256) ||
      listed.has(file.path)
    ) {
      throw new CascadeError(`Codex evaluation input manifest file ${index} is invalid`);
    }
    listed.add(file.path);
    const record = await store.artifactFileRecord(`${root}/input/${file.path}`);
    if (record.sha256 !== file.sha256) {
      throw new CascadeError(`Codex evaluation input is stale: ${file.path}`);
    }
  }
  const actualInputs = (await store.listArtifactFiles())
    .filter(
      (path) =>
        path.startsWith(`${root}/input/`) &&
        path !== `${root}/input/input-manifest.json`,
    )
    .map((path) => path.slice(`${root}/input/`.length));
  if (!valuesEqual([...listed].sort(), actualInputs.sort())) {
    throw new CascadeError("Codex evaluation input manifest is incomplete or substituted");
  }
  const traceRecord = await store.artifactFileRecord(`${root}/stdout.jsonl`);
  if (traceRecord.sha256 !== evaluation.provider_trace_digest) {
    throw new CascadeError("Codex evaluation provider trace is stale or mismatched");
  }
  const traceOutput = codexEvaluationOutputFromTrace(
    new TextDecoder("utf-8", { fatal: true }).decode(
      await store.readArtifactBytes(`${root}/stdout.jsonl`, "Codex evaluation provider trace"),
    ),
  );
  const frozenOutput = await store.readArtifactJson<CodexEvaluationOutput>(
    `${root}/provider-output.json`,
    "Codex evaluation provider output",
  );
  if (
    !valuesEqual(traceOutput, frozenOutput) ||
    valueDigest(frozenOutput) !== evaluation.provider_output_digest ||
    frozenOutput.input_manifest_digest !== evaluation.input_manifest_digest ||
    frozenOutput.evaluation_input_digest !== evaluation.evaluation_input_digest ||
    frozenOutput.source_manifest_digest !== evaluation.source_manifest_digest ||
    frozenOutput.execution_receipt_digest !== evaluation.execution_receipt_digest ||
    frozenOutput.evaluator_identity !== evaluation.evaluator_identity
  ) {
    throw new CascadeError("Codex evaluation provider output is stale or mismatched");
  }
  return {
    input_manifest_digest: String(inputManifest.manifest_digest),
    provider_trace_digest: traceRecord.sha256,
    provider_output_digest: valueDigest(frozenOutput),
    request,
    provider_output: frozenOutput,
  };
}

async function loadVerifiedRetryParent(
  parentRunId: string,
): Promise<VerifiedRetryLineageParent> {
  const parentStore = new CampaignArtifactStore(ARTIFACT_ROOT, parentRunId);
  const batch = await parentStore.readVerifiedArtifactJsonBatch([
    { relativePath: "reservation.json", label: "verified retry parent reservation" },
    {
      relativePath: "execution/source-manifest.json",
      label: "verified retry parent source manifest",
    },
  ]);
  const reservation = batch.artifacts.get("reservation.json")!
    .value as CampaignRunReservation;
  const source = batch.artifacts.get("execution/source-manifest.json")!
    .value as CampaignSourceManifest;
  return {
    verification_status: "VALID",
    run_id: parentRunId,
    campaign_id: reservation.campaign_id,
    attempt: reservation.attempt,
    campaign_digest: reservation.campaign_digest,
    source_digest: source.source_digest,
    reservation_digest: valueDigest(reservation),
    finalization_manifest_digest: batch.verification.manifest_digest,
    source_manifest_digest: valueDigest(source),
    status: batch.verification.finalization_status,
  };
}

async function commandRun(
  value: string,
  argv: string[],
  resume = false,
  now: () => Date = () => new Date(),
): Promise<number> {
  const args = parseArgs(argv);
  await assertCampaignCatalogCurrent(await buildCampaignCatalog());
  let runId = value;
  let artifactStore: CampaignArtifactStore;
  let path: string;
  let resolved: ResolvedCampaign;
  let identities: CampaignIdentityEnvelope;
  let retryParent: VerifiedRetryLineageParent | null = null;
  let retryMode: RetryMode | null = null;
  if (resume) {
    if (
      flag(args, "run-id") ||
      flag(args, "attempt") ||
      flag(args, "parent-run-id") ||
      flag(args, "retry-mode")
    ) {
      throw new CascadeError(
        "campaign resume cannot change run, attempt, or parent identity",
      );
    }
    artifactStore = new CampaignArtifactStore(ARTIFACT_ROOT, runId).withClock(now);
    const reservation = await artifactStore.readReservation();
    path = await findCampaignPath(reservation.campaign_id);
    resolved = await resolveCampaign(path);
    if (resolved.simulation.simulation_scope === "product" && resolved.intake?.status !== "READY") {
      throw new CascadeError("product campaign execution requires a READY simulation intake");
    }
    if (reservation.simulation_scope !== resolved.simulation.simulation_scope) {
      throw new CascadeError("campaign resume simulation scope does not match the reservation");
    }
    if (valueDigest(resolved.sourceDigests) !== reservation.campaign_digest) {
      throw new CascadeError(
        "campaign resume manifest digest does not match the reservation",
      );
    }
    identities = reservation.identities;
    for (const [name, expected] of [
      ["operator", identities.operator.subject],
      ["evaluator", identities.evaluator.subject],
      ["aggregator", identities.aggregator.subject],
      ["specialized-evaluator", identities.specialized_evaluator?.subject],
    ] as const) {
      const supplied = flag(args, name);
      if (supplied && supplied !== expected) {
        throw new CascadeError(
          `campaign resume ${name} identity does not match the reservation`,
        );
      }
    }
  } else {
    path = await findCampaignPath(value);
    resolved = await resolveCampaign(path);
    if (resolved.simulation.simulation_scope === "product" && resolved.intake?.status !== "READY") {
      throw new CascadeError("product campaign execution requires a READY simulation intake");
    }
    runId =
      flag(args, "run-id") ??
      `${resolved.campaign.id}-${new Date()
        .toISOString()
        .replace(/[-:.TZ]/g, "")
        .slice(0, 14)}`;
    const operatorIdentity = flag(
      args,
      "operator",
      "local-simulation-operator",
    )!;
    const evaluatorIdentity = flag(
      args,
      "evaluator",
      resolved.evaluationProfile.provider === "codex"
        ? `codex:simulation-evaluator:${resolved.evaluationProfile.model}`
        : "fixture:simulation-evaluator",
    )!;
    const aggregatorIdentity = flag(
      args,
      "aggregator",
      "local-campaign-aggregator",
    )!;
    const recoveryIdentity = flag(
      args,
      "recovery",
      "local-simulation-recovery",
    )!;
    identities = {
      schema_version: 2,
      operator: {
        role: "simulation-operator",
        session_id: `${runId}:operator`,
        subject: operatorIdentity,
      },
      evaluator: {
        role: "simulation-evaluator",
        session_id: `${runId}:evaluator`,
        subject: evaluatorIdentity,
      },
      specialized_evaluator: resolved.simulation.simulation_scope === "harness" ? {
        role: "harness-evaluator",
        session_id: `${runId}:specialized-evaluator`,
        subject: flag(args, "specialized-evaluator", "local-harness-evaluator")!,
      } : null,
      aggregator: {
        role: "campaign-aggregator",
        session_id: `${runId}:aggregator`,
        subject: aggregatorIdentity,
      },
      target: {
        role: "target-actor",
        session_id: `${runId}:target`,
        subject: `target:${resolved.simulation.id}`,
      },
      simulator: {
        role: "simulator",
        session_id: `${runId}:simulator`,
        subject: `simulator:${resolved.simulation.id}`,
      },
      recovery: {
        role: "simulation-recovery",
        session_id: `${runId}:recovery`,
        subject: recoveryIdentity,
      },
    };
    artifactStore = new CampaignArtifactStore(ARTIFACT_ROOT, runId).withClock(now);
    const requestedAttempt = Number(flag(args, "attempt", "1"));
    const requestedParentRunId = flag(args, "parent-run-id") ?? null;
    if (
      !Number.isSafeInteger(requestedAttempt) ||
      requestedAttempt < 1 ||
      (requestedAttempt === 1 && requestedParentRunId !== null) ||
      (requestedAttempt > 1 && requestedParentRunId === null)
    ) {
      throw new CascadeError(
        "campaign retry requires attempt 1 without a parent or a later attempt with one parent",
      );
    }
    if (requestedParentRunId === runId) {
      throw new CascadeError("campaign retry cannot name its own run as parent");
    }
    if (requestedParentRunId !== null) {
      const requestedRetryMode = flag(args, "retry-mode", "MANUAL")!.toUpperCase();
      if (requestedRetryMode !== "AUTOMATIC" && requestedRetryMode !== "MANUAL") {
        throw new CascadeError("campaign retry mode must be AUTOMATIC or MANUAL");
      }
      retryMode = requestedRetryMode;
      retryParent = await loadVerifiedRetryParent(requestedParentRunId);
      buildRetryLineageReceipt({
        child: {
          run_id: runId,
          campaign_id: resolved.campaign.id,
          attempt: requestedAttempt,
          campaign_digest: valueDigest(resolved.sourceDigests),
          source_digest: valueDigest(resolved.sourceDigests),
        },
        parent: retryParent,
        retry_mode: retryMode,
      });
    } else if (flag(args, "retry-mode")) {
      throw new CascadeError("campaign retry mode is only valid when a parent run is supplied");
    }
  }
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]+$/.test(runId)) {
    throw new CascadeError(`invalid run ID: ${runId}`);
  }
  const confirmationAuthority = prepareCampaignConfirmationAuthority(resolved);
  const confirmationSecrets = confirmationAuthority.confirmation_secrets;
  const childEnvOmit = confirmationAuthority.child_env_omit;
  artifactStore = artifactStore.withSensitiveValues(
    Object.values(confirmationSecrets),
  ).withConfirmationSecrets(confirmationSecrets);
  const confirmationReceipts = await loadPolicyConfirmationReceipts(
    flags(args, "confirmation-receipt"),
  );
  const runRoot = resolve(ARTIFACT_ROOT, runId);
  const campaignDigest = valueDigest(resolved.sourceDigests);
  const sessionDefinition = campaignSessionContract(resolved, runId);
  let resumeSourceManifest: CampaignSourceManifest | null = null;
  if (resume) {
    resumeSourceManifest = await artifactStore.readArtifactJson<CampaignSourceManifest>(
      "execution/source-manifest.json",
      "campaign resume source manifest",
    );
    await validateResumeSourceManifest(
      resolved,
      artifactStore,
      runId,
      resumeSourceManifest,
      identities,
    );
    const suppliedPlatform = flag(args, "platform");
    if (
      suppliedPlatform &&
      suppliedPlatform !== resumeSourceManifest.platform
    ) {
      throw new CascadeError(
        "campaign resume platform does not match the source manifest",
      );
    }
  }
  if (await artifactStore.artifactFileExists("finalization.json")) {
    throw new CascadeError(`campaign run ${runId} is already finalized`);
  }
  let leaseId: string;
  if (resume) {
    const currentLease = await artifactStore.readCurrentLease();
    const leaseDecisionAt = now();
    const leaseExpiryComparison = compareRfc3339Instants(
      leaseDecisionAt.toISOString(),
      currentLease.expires_at,
    );
    if (leaseExpiryComparison === null) {
      throw new CascadeError("campaign operator lease expiry is invalid");
    }
    if (leaseExpiryComparison < 0) {
      leaseId = flag(args, "lease-id") ?? "";
      if (leaseId !== currentLease.lease_id) {
        throw new CascadeError(
          "campaign resume requires the exact active --lease-id",
        );
      }
      await artifactStore.assertOperationalLifecycleFreshness();
    } else {
      const suppliedRecovery = flag(args, "recovery");
      if (suppliedRecovery !== identities.recovery.subject) {
        throw new CascadeError(
          "expired campaign resume requires the exact reserved --recovery identity",
        );
      }
      await artifactStore.assertOperationalLifecycleFreshness();
      leaseId = flag(
        args,
        "lease-id",
        `recovery-${valueDigest({
          run_id: runId,
          previous_lease_id: currentLease.lease_id,
          previous_generation: currentLease.generation,
        }).slice(0, 32)}`,
      )!;
      const replacement = await artifactStore
        .withAuthority(identities.recovery)
        .takeoverExpiredLease({
          lease_id: leaseId,
          ttl_ms: sessionDefinition.lease_ttl_ms,
          reason: flag(
            args,
            "recovery-reason",
            "operator process ended before campaign finalization",
          )!,
          now: leaseDecisionAt,
        });
      leaseId = replacement.lease_id;
    }
    artifactStore = artifactStore.withAuthority(identities.operator, leaseId);
    await artifactStore.appendLifecycle({
      status: "RESUMING",
      at: utcNow(),
      campaign_id: resolved.campaign.id,
      operator_identity: identities.operator.subject,
      lease_id: leaseId,
    });
  } else {
    const leaseAcquiredAt = new Date();
    const leaseExpiresAt = new Date(
      leaseAcquiredAt.getTime() + sessionDefinition.lease_ttl_ms,
    );
    leaseId = flag(args, "lease-id", crypto.randomUUID())!;
    await artifactStore.reserve({
      campaign_id: resolved.campaign.id,
      campaign_digest: campaignDigest,
      attempt: Number(flag(args, "attempt", "1")),
      parent_run_id: flag(args, "parent-run-id") ?? null,
      simulation_scope: resolved.simulation.simulation_scope,
      claim_ids: resolved.claims.map((claim) => claim.id),
      specialized_evaluation: resolved.campaign.specialized_evaluation,
      identities,
      lease: {
        lease_id: leaseId,
        owner_session_id: identities.operator.session_id,
        acquired_at: leaseAcquiredAt.toISOString(),
        expires_at: leaseExpiresAt.toISOString(),
        recovery_mode: "FINALIZE_UNKNOWN_OUTCOME",
      },
    });
    artifactStore = artifactStore.withAuthority(identities.operator, leaseId);
    await artifactStore.appendLifecycle({
      status: "RESERVED",
      at: utcNow(),
      campaign_id: resolved.campaign.id,
      operator_identity: identities.operator.subject,
    });
  }

  const operatorIdentity = identities.operator.subject;
  const evaluatorIdentity = identities.evaluator.subject;
  const aggregatorIdentity = identities.aggregator.subject;
  const targetActorIdentity = identities.target.subject;
  const simulatorIdentity = identities.simulator.subject;

  const executionRoot = resolve(runRoot, "execution");
  let sourceManifest: CampaignSourceManifest;
  if (resume) {
    sourceManifest = resumeSourceManifest!;
  } else {
    const platform = flag(args, "platform", process.platform)!;
    if (!platform.trim()) {
      throw new CascadeError("campaign platform must be non-empty");
    }
    const claimAuthority = campaignClaimAuthority(
      resolved,
      runId,
      campaignDigest,
    );
    await artifactStore.writeStageJson(
      "execution/claim-authority.json",
      claimAuthority,
    );
    const claimAuthorityRecord = await artifactStore.artifactFileRecord(
      "execution/claim-authority.json",
    );
    const frozenSources = await freezeSources(resolved, artifactStore, platform);
    const repositorySource = await sourceRevision(
      resolved.sourceFiles,
      childEnvOmit,
    );
    sourceManifest = {
      schema_version: 3,
      run_id: runId,
      campaign_id: resolved.campaign.id,
      platform,
      source_revision: repositorySource.revision,
      dirty_source: repositorySource.dirty,
      definitions: resolved.sourceDigests,
      frozen_sources: frozenSources,
      source_digest: valueDigest(resolved.sourceDigests),
      identity_envelope_digest: valueDigest(identities),
      claim_authority: {
        path: "execution/claim-authority.json",
        sha256: claimAuthorityRecord.sha256,
      },
    };
    await artifactStore.writeStageJson(
      "execution/source-manifest.json",
      sourceManifest,
    );
  }
  const platform = sourceManifest.platform;
  await artifactStore.appendLifecycle({
    status: "RUNNING",
    at: utcNow(),
    source_manifest_digest: valueDigest(sourceManifest),
  });
  const sourceManifestDigest = valueDigest(sourceManifest);
  const reservation = await artifactStore.readReservation();
  let retryLineageReceipt: RetryLineageReceipt | null = null;
  let retryLineageDigest: string | null = null;
  if (reservation.parent_run_id !== null) {
    retryParent ??= await loadVerifiedRetryParent(reservation.parent_run_id);
    if (resume) {
      retryLineageReceipt = await artifactStore.readArtifactJson<RetryLineageReceipt>(
        "execution/retry-lineage.json",
        "campaign retry lineage receipt",
      );
      retryMode = retryLineageReceipt.retry_mode;
    }
    if (retryMode === null) {
      throw new CascadeError("campaign retry mode is missing");
    }
    const retryExpectation = {
      child: {
        run_id: runId,
        campaign_id: resolved.campaign.id,
        attempt: reservation.attempt,
        campaign_digest: campaignDigest,
        source_digest: sourceManifest.source_digest,
      },
      parent: retryParent,
      retry_mode: retryMode,
    };
    if (retryLineageReceipt === null) {
      retryLineageReceipt = await persistOrReuseStageJson(
        artifactStore,
        "execution/retry-lineage.json",
        buildRetryLineageReceipt(retryExpectation),
        resume,
        ["created_at"],
      );
    }
    retryLineageReceipt = verifyRetryLineageReceipt(
      retryLineageReceipt,
      retryExpectation,
    );
    retryLineageDigest = retryLineageReceiptDigest(retryLineageReceipt);
  } else if (await artifactStore.artifactFileExists("execution/retry-lineage.json")) {
    throw new CascadeError("attempt 1 cannot contain a retry lineage receipt");
  }
  const resumeCheckpoint = resume
    ? await artifactStore.readLatestSessionCheckpoint<CampaignSessionState>()
    : null;
  const budgetUsage = await restoreCampaignBudgetUsage(
    resumeCheckpoint,
    artifactStore,
  );
  const confirmationUsage = await restoreCampaignConfirmationUsage(
    resumeCheckpoint,
    artifactStore,
  );

  const sessionPersistence: SimulationSessionPersistence<CampaignSessionState> = {
    appendEvent: (event) => artifactStore.appendSessionEvent(event),
    writeCheckpoint: (checkpoint) =>
      artifactStore.writeSessionCheckpoint(checkpoint),
    readLatestCheckpoint: () => artifactStore.readLatestSessionCheckpoint(),
    readCheckpoints: () => artifactStore.readSessionCheckpoints(),
    readEvents: () => artifactStore.readSessionEvents(),
    heartbeat: async () => {
      await artifactStore.renewLease(sessionDefinition.lease_ttl_ms, now());
    },
  };
  const session = await runSimulationSession<
    CampaignSessionState,
    TaskDefinition,
    TaskResult
  >({
    contract: sessionDefinition.contract,
    initial_state: {
      task_results: [],
      budget_usage: {},
      confirmation_usage: {},
    },
    surfaces: resolved.tasks.map((task) => campaignTaskSurface(task, runId)),
    persistence: sessionPersistence,
    resume,
    now,
    async next_steps({ checkpoint }) {
      if (
        checkpoint.domain_state.budget_usage &&
        !valuesEqual(checkpoint.domain_state.budget_usage, budgetUsage)
      ) {
        throw new CascadeError(
          "campaign runtime policy budget usage diverged from its checkpoint",
        );
      }
      if (
        checkpoint.domain_state.confirmation_usage &&
        !valuesEqual(
          checkpoint.domain_state.confirmation_usage,
          confirmationUsage,
        )
      ) {
        throw new CascadeError(
          "campaign runtime confirmation usage diverged from its checkpoint",
        );
      }
      const completed = new Set(
        checkpoint.domain_state.task_results.map((result) => result.task_id),
      );
      return selectCampaignTaskBatch(
        resolved.tasks,
        completed,
        sessionDefinition.contract.limits.max_parallel_steps,
      ).map(
        (task) => ({
          step_id: `task:${task.id}`,
          idempotency_key: `${runId}:task:${task.id}`,
          surface_id: `task:${task.id}`,
          conflict_keys: campaignTaskConflictKeys(task),
          required: task.required,
          payload: task,
        }) satisfies SimulationSessionStep<TaskDefinition>,
      );
    },
    async execute_step(step, context) {
      const task = step.payload;
      const result = await executeCampaignTask({
        resolved,
        task,
        task_root: resolve(executionRoot, "tasks", task.id),
        operator_identity: operatorIdentity,
        target_actor_identity: targetActorIdentity,
        run_id: runId,
        platform,
        confirmation_receipts: confirmationReceipts,
        confirmation_secrets: confirmationSecrets,
        child_env_omit: childEnvOmit,
        confirmation_usage: confirmationUsage,
        budget_usage: budgetUsage,
        artifact_store: artifactStore,
        signal: context.signal,
      });
      return {
        step_id: step.step_id,
        outcome: sessionStepOutcome(result),
        reason: result.earliest_failure,
        observation: result,
        surface_updates: taskSurfaceUpdates(task, result),
      } satisfies SimulationSessionStepResult<TaskResult>;
    },
    reduce_state(state, _step, result) {
      const taskResult = result.observation;
      if (!taskResult) {
        throw new CascadeError(
          `campaign session step lacks its persisted task result: ${result.step_id}`,
        );
      }
      return {
        task_results: [
          ...state.task_results,
          {
            task_id: taskResult.task_id,
            required: taskResult.required,
            status: taskResult.status,
            outcome: taskResult.outcome,
            result_digest: valueDigest(taskResult),
          },
        ],
        budget_usage: clone(budgetUsage),
        confirmation_usage: clone(confirmationUsage),
      };
    },
    async evaluate_goal({ checkpoint }) {
      if (checkpoint.domain_state.task_results.length < resolved.tasks.length) {
        return { status: "CONTINUE", reason: null };
      }
      const required = checkpoint.domain_state.task_results.filter(
        (result) => result.required && result.status !== "PASS",
      );
      if (required.some((result) => result.status === "BLOCKED")) {
        return {
          status: "BLOCKED",
          reason: required[0]?.task_id
            ? `required campaign task blocked: ${required[0].task_id}`
            : "required campaign task blocked",
        };
      }
      if (required.length) {
        return {
          status: "FAILED",
          reason: `required campaign task failed: ${required[0]!.task_id}`,
        };
      }
      return {
        status: "ACHIEVED",
        reason: "all campaign tasks and required task oracles passed",
      };
    },
  });
  if (session.status === "UNKNOWN_OUTCOME") {
    const interruptedStepIds = session.last_batch_step_ids.filter(
      (stepId) => !session.completed_step_ids.includes(stepId),
    );
    const sessionEvents = await artifactStore.readSessionEvents();
    const interruptedOperations = await Promise.all(interruptedStepIds.map(async (stepId) => {
      const binding = sessionEvents
        .flatMap((event) => event.step_bindings ?? [])
        .find((candidate) => candidate.step_id === stepId) ?? null;
      if (!binding) {
        throw new CascadeError(
          `campaign recovery cannot bind interrupted step ${stepId} to its idempotency key`,
        );
      }
      const taskId = stepId.startsWith("task:") ? stepId.slice("task:".length) : null;
      const dispatchPath = taskId ? `execution/tasks/${taskId}/dispatch.json` : null;
      return {
        step_id: stepId,
        idempotency_key_digest: binding.idempotency_key_digest,
        dispatch_digest:
          dispatchPath && (await artifactStore.artifactFileExists(dispatchPath))
            ? valueDigest(await artifactStore.readArtifactJson(
                dispatchPath,
                `interrupted task dispatch ${taskId}`,
              ))
            : null,
      };
    }));
    const finalization = await artifactStore
      .withAuthority(identities.recovery)
      .finalize({
        status: "UNKNOWN_OUTCOME",
        finalized_by: identities.recovery,
        recovery_reason:
          session.reason ?? "simulation session ended with an unknown outcome",
        recovery_action: interruptedOperations.length
          ? `freeze ${interruptedOperations.length} interrupted operation(s) for explicit recovery review`
          : "freeze the session checkpoint for explicit recovery review",
        recovery_cleanup_status: "UNKNOWN",
        recovery_context: {
          interrupted_operations: interruptedOperations,
          checkpoint_digest: session.checkpoint_digest,
        },
      });
    console.log(
      `campaign_status=UNKNOWN_OUTCOME campaign=${resolved.campaign.id} run=${runId} ` +
        `manifest=${finalization.manifest_digest} output=${rel(runRoot)}`,
    );
    return 0;
  }
  const taskResults = await Promise.all(
    session.domain_state.task_results.map(async (summary) => {
      const result = await artifactStore.readArtifactJson<TaskResult>(
        `execution/tasks/${summary.task_id}/result.json`,
        `campaign task result ${summary.task_id}`,
      );
      if (valueDigest(result) !== summary.result_digest) {
        throw new CascadeError(
          `campaign session task result digest mismatch: ${summary.task_id}`,
        );
      }
      return result;
    }),
  );
  const handoffReceiver =
    identities.specialized_evaluator ?? identities.evaluator;
  const runtimeHandoffs = await Promise.all(
    taskResults.map(async (task): Promise<RuntimeHandoffReceipt> => {
      let parentHandoffDigest: string | null = null;
      if (reservation.parent_run_id !== null) {
        const parentStore = new CampaignArtifactStore(
          ARTIFACT_ROOT,
          reservation.parent_run_id,
        );
        const parentHandoff = await parentStore.readVerifiedArtifactJson<RuntimeHandoffReceipt>(
          `execution/tasks/${task.task_id}/handoff.json`,
          `verified retry parent handoff ${task.task_id}`,
        );
        if (
          !retryParent ||
          parentHandoff.verification.manifest_digest !==
            retryParent.finalization_manifest_digest
        ) {
          throw new CascadeError(
            `retry parent handoff crossed a verified manifest snapshot: ${task.task_id}`,
          );
        }
        const parentAuthority =
          parentHandoff.value.disposition === "ACCEPTED" ||
            parentHandoff.value.disposition === "REJECTED"
            ? parentHandoff.value.receiver_principal
            : parentHandoff.value.producer_principal;
        if (parentAuthority === null) {
          throw new CascadeError(
            `retry parent handoff lacks validation authority: ${task.task_id}`,
          );
        }
        validateRuntimeHandoffReceipt(parentHandoff.value, {
          authority: parentAuthority,
        });
        parentHandoffDigest = runtimeHandoffReceiptDigest(parentHandoff.value);
      }
      const candidate: RuntimeHandoffReceipt = {
        schema_version: 1,
        artifact_type: "runtime-handoff-receipt",
        receipt_id: `${runId}-${task.task_id}-handoff-offer`,
        run_id: runId,
        campaign_id: resolved.campaign.id,
        task_id: task.task_id,
        terminal_status: task.outcome,
        task_result_digest: valueDigest(task),
        source_manifest_digest: sourceManifestDigest,
        evidence_manifest_digest: valueDigest(task.evidence),
        recovery_receipt_digest:
          task.recovery.status === "NOT_REQUIRED"
            ? null
            : valueDigest(task.recovery),
        cleanup_receipt_digest: valueDigest(task.cleanup),
        retry_lineage: {
          attempt: reservation.attempt,
          parent_run_id: reservation.parent_run_id,
          parent_handoff_receipt_digest: parentHandoffDigest,
        },
        required_inputs: [
          "execution/source-manifest.json",
          `execution/tasks/${task.task_id}/cleanup.json`,
          `execution/tasks/${task.task_id}/result.json`,
          ...(task.recovery.status === "NOT_REQUIRED"
            ? []
            : [`execution/tasks/${task.task_id}/recovery.json`]),
        ].sort(),
        artifact_references: [
          { path: "execution/source-manifest.json", sha256: sourceManifestDigest },
          {
            path: `execution/tasks/${task.task_id}/cleanup.json`,
            sha256: valueDigest(task.cleanup),
          },
          {
            path: `execution/tasks/${task.task_id}/result.json`,
            sha256: valueDigest(task),
          },
          ...(task.recovery.status === "NOT_REQUIRED"
            ? []
            : [{
                path: `execution/tasks/${task.task_id}/recovery.json`,
                sha256: valueDigest(task.recovery),
              }]),
        ].sort((left, right) => left.path.localeCompare(right.path)),
        proposed_next_owner: handoffReceiver.subject,
        proposed_next_gate: identities.specialized_evaluator
          ? "specialized-evaluation"
          : "general-evaluation",
        producer_principal: identities.operator,
        receiver_principal: handoffReceiver,
        disposition: "PENDING",
        offer_receipt_digest: null,
        receiving_receipt_digest: null,
        reason: "task execution is frozen and ready for independent evaluation",
        superseded_receipt_digest: null,
        changed_bound_inputs: [],
        created_at: utcNow(),
      };
      validateRuntimeHandoffReceipt(candidate, {
        authority: identities.operator,
      });
      const handoff = await persistOrReuseStageJson(
        artifactStore,
        `execution/tasks/${task.task_id}/handoff-offer.json`,
        candidate,
        resume,
        ["created_at"],
      );
      validateRuntimeHandoffReceipt(handoff, {
        authority: identities.operator,
      });
      return handoff;
    }),
  );
  const runtimeHandoffDigests = new Map(
    runtimeHandoffs.map((receipt) => [
      receipt.task_id,
      runtimeHandoffReceiptDigest(receipt),
    ]),
  );
  const requiredFailures = taskResults.filter(
    (task) => task.required && task.status !== "PASS",
  );
  const requiredBlocked = requiredFailures.filter(
    (task) => task.status === "BLOCKED",
  );
  const cleanupVerified = taskResults.every((task) => task.cleanup.verified);
  const sessionBlocked = new Set([
    "BLOCKED",
    "TIMED_OUT",
    "BUDGET_EXHAUSTED",
    "CANCELLED",
    "UNKNOWN_OUTCOME",
  ]).has(session.status);
  const executionReceiptCandidate = {
    schema_version: 1,
    run_id: runId,
    campaign_id: resolved.campaign.id,
    platform,
    campaign_digest: campaignDigest,
    source_manifest_digest: sourceManifestDigest,
    retry_lineage_receipt_digest: retryLineageDigest,
    operator_identity: operatorIdentity,
    target_actor_identity: targetActorIdentity,
    simulator_identity: simulatorIdentity,
    task_results: taskResults.map((task) => ({
      task_id: task.task_id,
      status: task.status,
      outcome: task.outcome,
      cleanup_status: task.cleanup.status,
      recovery_status: task.recovery.status,
      policy_decision_digest: task.policy_decision_digest,
      result_digest: valueDigest(task),
      handoff_receipt_digest: runtimeHandoffDigests.get(task.task_id)!,
    })),
    cleanup_verified: cleanupVerified,
    session: {
      status: session.status,
      purpose: session.purpose,
      episode_count: session.episode,
      step_count: session.step_count,
      checkpoint_digest: session.checkpoint_digest,
      surfaces: session.surfaces,
    },
    status:
      sessionBlocked || requiredBlocked.length
        ? "BLOCKED"
        : session.status === "FAILED" || requiredFailures.length || !cleanupVerified
          ? "FAIL"
          : "PASS",
    earliest_failure:
      session.status === "ACHIEVED"
        ? requiredFailures[0]?.earliest_failure ?? null
        : session.reason,
    evidence_root: rel(executionRoot),
    created_at: utcNow(),
  };
  const executionReceipt = await persistOrReuseStageJson(
    artifactStore,
    "execution/execution-receipt.json",
    executionReceiptCandidate,
    resume,
    ["created_at"],
  );
  const executionReceiptDigest = valueDigest(executionReceipt);

  let specializedEvaluation: SpecializedEvaluationReceipt | null = null;
  const specializedDeclaration = resolved.campaign.specialized_evaluation;
  if (resolved.simulation.simulation_scope === "harness") {
    if (!specializedDeclaration || !identities.specialized_evaluator) {
      throw new CascadeError("harness campaign is missing specialized evaluation applicability or principal");
    }
    const specializedPath =
      `specialized-evaluations/${runId}-specialized-evaluation/receipt.json`;
    if (resume && (await artifactStore.artifactFileExists(specializedPath))) {
      specializedEvaluation = await artifactStore.readArtifactJson<SpecializedEvaluationReceipt>(
        specializedPath,
        "specialized evaluation receipt",
      );
    } else if (specializedDeclaration.applicability === "NOT_APPLICABLE") {
      specializedEvaluation = buildNotApplicableSpecializedEvaluationReceipt({
        run_id: runId,
        campaign_id: resolved.campaign.id,
        specialized_evaluator_identity: identities.specialized_evaluator.subject,
        source_manifest_digest: sourceManifestDigest,
        execution_receipt_digest: executionReceiptDigest,
        declaration: specializedDeclaration,
        created_at: utcNow(),
      });
      specializedEvaluation = await persistOrReuseStageJson(
        artifactStore,
        specializedPath,
        specializedEvaluation,
        resume,
        ["created_at"],
      );
    } else {
      throw new CascadeError(
        "REQUIRED specialized evaluation receipt is missing; route frozen Cascade route/trace evidence through harness-evaluation before general evaluation",
      );
    }
    verifySpecializedEvaluationReceipt(specializedEvaluation, {
      path: specializedPath,
      run_id: runId,
      campaign_id: resolved.campaign.id,
      declaration: specializedDeclaration,
      source_manifest_digest: sourceManifestDigest,
      execution_receipt_digest: executionReceiptDigest,
      claim_authority_digest: sourceManifest.claim_authority.sha256,
      specialized_evaluator: identities.specialized_evaluator,
      other_principals: [
        identities.operator,
        identities.evaluator,
        identities.aggregator,
        identities.target,
        identities.simulator,
        identities.recovery,
      ],
      claims: resolved.claims,
      artifact_files: await specializedEvidenceArtifacts(
        artifactStore,
        specializedEvaluation,
      ),
    });
  } else if (specializedDeclaration !== null || identities.specialized_evaluator !== null) {
    throw new CascadeError("product campaign cannot declare or reserve specialized evaluation");
  }

  const priorLifecycleEvents = resume
    ? (await artifactStore.readArtifactText("lifecycle.jsonl", "campaign lifecycle"))
        .split(/\r?\n/)
        .filter(Boolean)
        .map((line) => JSON.parse(line) as Record<string, unknown>)
    : [];
  const priorEvaluationEvents = priorLifecycleEvents.filter(
    (event) => event.status === "EVALUATING",
  );
  if (priorEvaluationEvents.length > 1) {
    throw new CascadeError("campaign lifecycle has duplicate evaluation instants");
  }
  const priorEvaluation = priorEvaluationEvents[0];
  let evaluationAt = priorEvaluation ? String(priorEvaluation.at) : "";
  if (
    priorEvaluation &&
    (parseRfc3339Instant(evaluationAt) === null ||
      (priorEvaluation.provider !== resolved.evaluationProfile.provider ||
        priorEvaluation.profile_id !== resolved.evaluationProfile.id ||
        priorEvaluation.evaluator_identity !== evaluatorIdentity))
  ) {
    throw new CascadeError("campaign lifecycle evaluation authority is stale or invalid");
  }
  if (!priorEvaluation) {
    const evaluationEvent = await artifactStore.appendTrustedLifecycle({
      status: "EVALUATING",
      provider: resolved.evaluationProfile.provider,
      profile_id: resolved.evaluationProfile.id,
      evaluator_identity: evaluatorIdentity,
    });
    evaluationAt = String(evaluationEvent.at);
  }
  let calibration = buildCalibrationReceipt(
    resolved,
    runId,
    aggregatorIdentity,
    evaluationAt,
  );
  if (calibration) {
    calibration = await persistOrReuseStageJson(
      artifactStore,
      `calibrations/${calibration.calibration_id}.json`,
      calibration,
      resume,
      ["created_at"],
    );
  }
  const mechanicalEvaluation = buildMechanicalEvaluation(
    resolved,
    taskResults,
    calibration,
  );
  const evaluationIdentity: EvaluationIdentity = {
    runId,
    campaignId: resolved.campaign.id,
    operatorIdentity,
    targetActorIdentity,
    evaluatorIdentity,
    principalIdentities: {
      operator: identities.operator.subject,
      specialized_evaluator: identities.specialized_evaluator?.subject ?? null,
      evaluator: identities.evaluator.subject,
      aggregator: identities.aggregator.subject,
      target: identities.target.subject,
      simulator: identities.simulator.subject,
      recovery: identities.recovery.subject,
    },
    specializedEvaluation: specializedEvaluation
      ? {
          receipt_id: specializedEvaluation.specialized_evaluation_id,
          receipt_digest: valueDigest(specializedEvaluation),
          status: specializedEvaluation.status,
          claim_ids: specializedEvaluation.claim_ids,
        }
      : null,
    sourceManifestDigest,
    executionReceiptDigest,
    calibrationReceiptDigest: calibration ? valueDigest(calibration) : null,
  };
  const expectedEvaluationRequest = generalEvaluationRequest(
    resolved,
    evaluationIdentity,
    mechanicalEvaluation,
  );
  let evaluation: EvaluationReceipt | null;
  let refinementProposals: PersonaRefinementProposal[] = [];
  let evaluationAttempt: string | null = null;
  let evaluationBlockedReason: string | null = null;
  const evaluationReceiptPath = `evaluations/${runId}-evaluation/receipt.json`;
  if (resume && (await artifactStore.artifactFileExists(evaluationReceiptPath))) {
    evaluation = await artifactStore.readArtifactJson<EvaluationReceipt>(
      evaluationReceiptPath,
      "campaign evaluation receipt",
    );
    const persistedAttempt = `evaluations/${runId}-evaluation/attempt.json`;
    evaluationAttempt = (await artifactStore.artifactFileExists(persistedAttempt))
      ? persistedAttempt
      : null;
    if (evaluation.provider === "codex") {
      await persistCodexProviderOutput(
        artifactStore,
        evaluation.evaluation_id,
        true,
      );
    }
    const providerDigests = await assertGeneralEvaluationArtifactsFresh(
      artifactStore,
      evaluation,
      expectedEvaluationRequest,
    );
    assertEvaluationReceiptFresh(
      resolved,
      evaluationIdentity,
      evaluation,
      mechanicalEvaluation,
      providerDigests,
    );
  } else if (
    resume &&
    resolved.evaluationProfile.provider === "codex" &&
    (await artifactStore.listArtifactFiles()).some((path) =>
      path.startsWith(`evaluations/${runId}-evaluation/`)
    )
  ) {
    evaluation = null;
    const persistedAttempt = `evaluations/${runId}-evaluation/attempt.json`;
    evaluationAttempt = (await artifactStore.artifactFileExists(persistedAttempt))
      ? persistedAttempt
      : null;
    if (evaluationAttempt) {
      const attempt = await artifactStore.readArtifactJson<Record<string, unknown>>(
        evaluationAttempt,
        "prior Codex evaluation attempt",
      );
      evaluationBlockedReason =
        typeof attempt.reason === "string" && attempt.reason.trim()
          ? attempt.reason
          : "a prior Codex evaluation attempt has no durable receipt; automatic provider replay is forbidden";
    } else {
      evaluationBlockedReason =
        "a prior Codex evaluation attempt has no durable receipt; automatic provider replay is forbidden";
    }
  } else if (resolved.evaluationProfile.provider === "codex") {
    const result = await runCodexEvaluation(
      resolved,
      evaluationIdentity,
      mechanicalEvaluation,
      artifactStore,
    );
    evaluation = result.receipt;
    refinementProposals = result.refinementProposals;
    evaluationAttempt = result.attemptPath;
    evaluationBlockedReason = result.blockedReason;
    if (evaluation) {
      await persistCodexProviderOutput(
        artifactStore,
        evaluation.evaluation_id,
        false,
      );
    }
  } else {
    evaluation = buildFixtureEvaluationReceipt(
      resolved,
      evaluationIdentity,
      mechanicalEvaluation,
    );
    evaluation = await persistOrReuseStageJson(
      artifactStore,
      `evaluations/${evaluation.evaluation_id}/receipt.json`,
      evaluation,
      resume,
      ["created_at"],
    );
    await persistOrReuseStageJson(
      artifactStore,
      `evaluations/${evaluation.evaluation_id}/input/request.json`,
      expectedEvaluationRequest,
      resume,
    );
  }
  if (!evaluation) {
    const blockedSummary = {
      schema_version: 1,
      run_id: runId,
      campaign_id: resolved.campaign.id,
      execution_status: executionReceipt.status,
      mechanical_status: mechanicalEvaluation.status,
      evaluation_status: "BLOCKED",
      evaluation_provider: resolved.evaluationProfile.provider,
      evaluation_profile_id: resolved.evaluationProfile.id,
      evaluation_attempt: evaluationAttempt,
      evaluation_blocker: evaluationBlockedReason,
      calibration_status: calibration?.status ?? "NOT_RUN",
      release_eligible: false,
      campaign_status: "BLOCKED",
      execution_receipt_digest: executionReceiptDigest,
      specialized_evaluation_receipt_digest: specializedEvaluation
        ? valueDigest(specializedEvaluation)
        : null,
      evaluation_receipt_digest: null,
      calibration_receipt_digest: calibration ? valueDigest(calibration) : null,
      aggregation_receipt_digest: null,
      completed_at: utcNow(),
    };
    await persistOrReuseStageJson(
      artifactStore,
      "summary.json",
      blockedSummary,
      resume,
      ["completed_at"],
    );
    const priorBlockedEvents = priorLifecycleEvents.filter(
      (event) => event.status === "BLOCKED",
    );
    if (priorBlockedEvents.length > 1) {
      throw new CascadeError("campaign lifecycle has duplicate finalization instants");
    }
    if (priorBlockedEvents.length === 1) {
      const prior = priorBlockedEvents[0]!;
      if (
        parseRfc3339Instant(String(prior.at)) === null ||
        prior.campaign_status !== "BLOCKED" ||
        prior.evaluation_attempt !== evaluationAttempt ||
        prior.reason !== evaluationBlockedReason
      ) {
        throw new CascadeError("campaign lifecycle finalization authority is stale or invalid");
      }
    } else {
      await artifactStore.appendTrustedLifecycle({
        status: "BLOCKED",
        campaign_status: "BLOCKED",
        evaluation_attempt: evaluationAttempt,
        reason: evaluationBlockedReason,
      });
    }
    await artifactStore.finalize({
      status: "BLOCKED",
      finalized_by: identities.operator,
    });
    console.log(
      `campaign_status=BLOCKED campaign=${resolved.campaign.id} run=${runId} ` +
        `evaluation=BLOCKED provider=${resolved.evaluationProfile.provider} ` +
        `release_eligible=false output=${rel(runRoot)}`,
    );
    return 1;
  }
  const providerDigests = await assertGeneralEvaluationArtifactsFresh(
    artifactStore,
    evaluation,
    expectedEvaluationRequest,
  );
  assertEvaluationReceiptFresh(
    resolved,
    evaluationIdentity,
    evaluation,
    mechanicalEvaluation,
    providerDigests,
  );
  const generalStatus = evaluation.status as "PASS" | "FAIL" | "BLOCKED";
  const executionStatus = executionReceipt.status as "PASS" | "FAIL" | "BLOCKED";
  const receivingReceiptPath = specializedEvaluation
    ? `specialized-evaluations/${specializedEvaluation.specialized_evaluation_id}/receipt.json`
    : `evaluations/${evaluation.evaluation_id}/receipt.json`;
  const receivingReceiptDigest = valueDigest(specializedEvaluation ?? evaluation);
  const receiverArtifactStore = artifactStore.withAuthority(handoffReceiver);
  await Promise.all(runtimeHandoffs.map(async (offer) => {
    const artifactReferences = [
      ...offer.artifact_references,
      { path: receivingReceiptPath, sha256: receivingReceiptDigest },
    ].sort((left, right) => left.path.localeCompare(right.path));
    const accepted: RuntimeHandoffReceipt = {
      ...offer,
      receipt_id: `${runId}-${offer.task_id}-handoff`,
      required_inputs: artifactReferences.map((reference) => reference.path),
      artifact_references: artifactReferences,
      disposition: "ACCEPTED",
      reason: `receiving gate recorded ${specializedEvaluation ? "specialized" : "general"} evaluation evidence`,
      offer_receipt_digest: runtimeHandoffReceiptDigest(offer),
      receiving_receipt_digest: receivingReceiptDigest,
      created_at: utcNow(),
    };
    validateRuntimeHandoffReceipt(accepted, { authority: handoffReceiver });
    const persisted = await persistOrReuseRuntimeHandoffAcceptance(
      receiverArtifactStore,
      `execution/tasks/${offer.task_id}/handoff.json`,
      accepted,
      resume,
    );
    validateRuntimeHandoffReceipt(persisted, { authority: handoffReceiver });
  }));
  const reduction = reduceEvaluations({
    claims: resolved.claims,
    mechanical: mechanicalEvaluation,
    specialized_declaration: specializedDeclaration,
    specialized_receipt: specializedEvaluation,
    general_status: generalStatus,
    general_claim_ledger: evaluation.claim_ledger,
  });
  for (const proposal of refinementProposals) {
    await artifactStore.writeStageJson(
      `refinements/${proposal.proposal_id}.json`,
      proposal,
    );
  }
  const aggregationCandidate = buildAggregationReceipt(
    resolved,
    runId,
    aggregatorIdentity,
    executionReceiptDigest,
    evaluation,
    specializedEvaluation,
    reduction,
    calibration,
    executionStatus,
  );
  const aggregation = await persistOrReuseStageJson(
    artifactStore,
    `aggregations/${aggregationCandidate.aggregation_id}.json`,
    aggregationCandidate,
    resume,
    ["created_at"],
  );
  const campaignStatus: "PASS" | "FAIL" | "BLOCKED" =
    executionReceipt.status === "BLOCKED" || reduction.status === "BLOCKED"
      ? "BLOCKED"
      : executionReceipt.status === "PASS" && reduction.status === "PASS"
        ? "PASS"
        : "FAIL";
  const summary = {
    schema_version: 1,
    run_id: runId,
    campaign_id: resolved.campaign.id,
    execution_status: executionReceipt.status,
    evaluation_status: reduction.status,
    evaluation_provider: evaluation.provider,
    evaluation_profile_id: evaluation.profile_id,
    evaluation_model: evaluation.model,
    evaluation_attempt: evaluationAttempt,
    calibration_status: calibration?.status ?? "NOT_RUN",
    calibration_scope: calibration?.framework_fixture
      ? "framework-fixture"
      : calibration
        ? calibration.source_kind
        : "none",
    release_eligible: aggregation.release_eligible,
    campaign_status: campaignStatus,
    execution_receipt_digest: executionReceiptDigest,
    specialized_evaluation_receipt_digest: specializedEvaluation
      ? valueDigest(specializedEvaluation)
      : null,
    evaluation_receipt_digest: valueDigest(evaluation),
    calibration_receipt_digest: calibration ? valueDigest(calibration) : null,
    aggregation_receipt_digest: valueDigest(aggregation),
    completed_at: utcNow(),
  };
  const persistedSummary = await persistOrReuseStageJson(
    artifactStore,
    "summary.json",
    summary,
    resume,
    ["completed_at"],
  );
  const terminalStatus = persistedSummary.campaign_status === "BLOCKED"
    ? "BLOCKED"
    : "COMPLETED";
  const priorTerminalEvents = priorLifecycleEvents.filter(
    (event) => event.status === terminalStatus,
  );
  if (priorTerminalEvents.length > 1) {
    throw new CascadeError("campaign lifecycle has duplicate finalization instants");
  }
  if (priorTerminalEvents.length === 1) {
    const prior = priorTerminalEvents[0]!;
    if (
      parseRfc3339Instant(String(prior.at)) === null ||
      prior.campaign_status !== persistedSummary.campaign_status ||
      prior.release_eligible !== persistedSummary.release_eligible
    ) {
      throw new CascadeError("campaign lifecycle finalization authority is stale or invalid");
    }
  } else {
    await artifactStore.appendTrustedLifecycle({
      status: terminalStatus,
      campaign_status: persistedSummary.campaign_status,
      release_eligible: persistedSummary.release_eligible,
    });
  }
  await artifactStore.finalize({
    status: persistedSummary.campaign_status === "BLOCKED" ? "BLOCKED" : "COMPLETED",
    finalized_by: identities.operator,
  });
  console.log(
    `campaign_status=${persistedSummary.campaign_status} campaign=${resolved.campaign.id} ` +
      `run=${runId} calibration=${summary.calibration_status} ` +
      `evaluation=${summary.evaluation_status}/${summary.evaluation_provider} ` +
      `release_eligible=${summary.release_eligible} output=${rel(runRoot)}`,
  );
  return persistedSummary.campaign_status === "PASS" ? 0 : 1;
}

export async function verifyCampaignRun(
  runId: string,
  options: {
    artifact_root?: string;
    confirmation_key_env?: Readonly<Record<string, string>>;
    environment?: Readonly<Record<string, string | undefined>>;
    now?: () => Date;
  } = {},
) {
  const environment = options.environment ?? process.env;
  const secrets = Object.create(null) as Record<string, string>;
  for (const [keyId, environmentName] of Object.entries(
    options.confirmation_key_env ?? {},
  )) {
    assertCampaignConfirmationKeyId(keyId, "confirmation verification key_id");
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(environmentName)) {
      throw new CascadeError("confirmation verification key binding must be KEY_ID=ENV_VAR");
    }
    const secret = environment[environmentName];
    if (secret === undefined) {
      throw new CascadeError(
        `confirmation verification key environment variable is missing: ${environmentName}`,
      );
    }
    confirmationSecretBytes(
      secret,
      `confirmation verification secret ${keyId}`,
    );
    secrets[keyId] = secret;
  }
  return new CampaignArtifactStore(options.artifact_root ?? ARTIFACT_ROOT, runId)
    .withClock(options.now ?? (() => new Date()))
    .withConfirmationSecrets(secrets)
    .verify();
}

async function commandVerify(runId: string, argv: string[]): Promise<number> {
  const args = parseArgs(argv);
  if (
    args.positionals.length ||
    [...args.flags.keys()].some((name) => name !== "confirmation-key")
  ) {
    throw new CascadeError(
      "campaign verify accepts only --confirmation-key KEY_ID=ENV_VAR bindings",
    );
  }
  const confirmationKeyEnv = Object.create(null) as Record<string, string>;
  const environmentNames = new Set<string>();
  for (const binding of flags(args, "confirmation-key")) {
    const separator = binding.indexOf("=");
    const keyId = separator < 0 ? "" : binding.slice(0, separator);
    const environmentName = separator < 0 ? "" : binding.slice(separator + 1);
    if (
      separator <= 0 ||
      separator !== binding.lastIndexOf("=") ||
      !environmentName ||
      Object.hasOwn(confirmationKeyEnv, keyId) ||
      environmentNames.has(environmentName)
    ) {
      throw new CascadeError(
        "confirmation verification keys require unique --confirmation-key KEY_ID=ENV_VAR bindings",
      );
    }
    assertCampaignConfirmationKeyId(keyId, "confirmation verification key_id");
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(environmentName)) {
      throw new CascadeError(
        "confirmation verification key binding must be KEY_ID=ENV_VAR",
      );
    }
    environmentNames.add(environmentName);
    confirmationKeyEnv[keyId] = environmentName;
  }
  const result = await verifyCampaignRun(runId, {
    confirmation_key_env: confirmationKeyEnv,
  });
  console.log(
    `campaign_artifact_verification=${result.status} run=${result.run_id} ` +
      `finalization=${result.finalization_status} files=${result.file_count} ` +
      `manifest_digest=${result.manifest_digest} freshness=${result.freshness_status}` +
      (result.freshness_reason ? ` freshness_reason=${JSON.stringify(result.freshness_reason)}` : ""),
  );
  return 0;
}

async function commandSelfTest(): Promise<number> {
  const paths = await campaignPaths();
  if (!paths.length) throw new CascadeError("no campaign manifests found");
  for (const path of paths) await resolveCampaign(path);
  const catalog = await buildCampaignCatalog();
  const fixtureCalibration = (
    await Promise.all(paths.map((path) => resolveCampaign(path)))
  ).find((item) => item.calibration?.framework_fixture);
  if (!fixtureCalibration) {
    throw new CascadeError("no framework calibration fixture campaign found");
  }
  const receipt = buildCalibrationReceipt(
    fixtureCalibration,
    "self-test",
    "self-test-aggregator",
    fixtureCalibration.calibration!.reference.reference_window_end,
  );
  if (!receipt || receipt.status !== "CALIBRATED") {
    throw new CascadeError("framework calibration fixture did not calibrate");
  }
  if (!receipt.framework_fixture) {
    throw new CascadeError("framework calibration fixture lost its scope");
  }
  console.log(
    `campaign_self_test=PASS campaigns=${paths.length} ` +
      `catalog_digest=${catalog.digest} calibration=${receipt.status} ` +
      `release_scope=NOT_RUN`,
  );
  return 0;
}

export async function main(
  argv: string[],
  dependencies: { now?: () => Date } = {},
): Promise<number> {
  const [command, value, ...rest] = argv;
  if (command === "list") return commandList();
  if (command === "catalog") return commandCatalog([...(value ? [value] : []), ...rest]);
  if (command === "validate" && value) return commandValidate(value);
  if (command === "run" && value) {
    return commandRun(value, rest);
  }
  if (command === "resume" && value) {
    return commandRun(value, rest, true, dependencies.now);
  }
  if (command === "verify" && value) return commandVerify(value, rest);
  if (command === "self-test") return commandSelfTest();
  console.log(`Usage:
  bun scripts/cascade.ts campaign list
  bun scripts/cascade.ts campaign catalog [--check|--write]
  bun scripts/cascade.ts campaign validate <campaign-id-or-path>
  bun scripts/cascade.ts campaign run <campaign-id-or-path> [--run-id ID]
    [--attempt N] [--parent-run-id ID] [--lease-id ID]
    [--platform NAME] [--confirmation-receipt PATH]
  bun scripts/cascade.ts campaign resume <run-id> --lease-id ID
    [--recovery SUBJECT] [--recovery-reason TEXT]
    [--platform NAME] [--confirmation-receipt PATH]
  bun scripts/cascade.ts campaign verify <run-id>
    [--confirmation-key KEY_ID=ENV_VAR]
  bun scripts/cascade.ts campaign self-test
`);
  return command ? 1 : 0;
}
