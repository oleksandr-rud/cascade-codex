import { mkdir, mkdtemp, readdir, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, relative, resolve, sep } from "node:path";

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
import { parseStrictYaml } from "./structured-data";
import { emitCampaignReport, writeCampaignReport } from "./campaign-report";
import {
  type OracleResult,
  type PolicyDecision,
  type SecretResolver,
  type TaskAdapter,
  type TaskAdapterContext,
  type TaskAdapterEvent,
  type TaskAdapterResult,
  type TaskCleanupResult,
  type TaskCommandResult,
  type TaskDispatchState,
  type TaskEvent,
  type TaskEventPayload,
  type TaskExecutionOutcome,
  type TaskHttpResult,
  type TaskObservation,
  type TaskOracleEvaluator,
  type TaskRecoveryResult,
  type TaskSideEffectStatus,
} from "./campaign/task-adapter";
import {
  DEFAULT_ADAPTER_IDS,
  createTaskAdapterRegistry,
  selectTaskAdapter,
  taskAdapterKey,
} from "./campaign/adapters/builtins";
import type { TaskArtifactRepository } from "./campaign/artifacts/task-artifact-repository";
import { createTaskOracleEvaluator } from "./campaign/oracle-evaluator";
export { createTaskAdapterRegistry } from "./campaign/adapters/builtins";
export { createTaskOracleEvaluator } from "./campaign/oracle-evaluator";
export type {
  OracleResult,
  PolicyDecision,
  SecretResolutionContext,
  SecretResolver,
  TaskAdapter,
  TaskAdapterContext,
  TaskAdapterEvent,
  TaskAdapterFailure,
  TaskAdapterResult,
  TaskCleanupResult,
  TaskCleanupStatus,
  TaskCommandResult,
  TaskDispatchState,
  TaskEvent,
  TaskExecutionOutcome,
  TaskHttpResult,
  TaskObservation,
  TaskOracleEvaluator,
  TaskRecoveryResult,
  TaskRecoveryStatus,
  TaskSideEffectStatus,
  TaskSurfaceRef,
} from "./campaign/task-adapter";
import {
  cascadeHarnessCodexCommand,
  gradeCascadeHarnessTrace,
  resolveCascadeHarnessProfile,
  type ResolvedCascadeHarnessProfile,
} from "./evals";
import {
  type CampaignIdentityEnvelope,
  type CampaignRunReservation,
  CampaignArtifactStore,
} from "./campaign-artifacts";
import type { FrozenCampaignArtifact } from "./campaign/artifacts/artifact-types";
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

interface CampaignConfirmationUsageRecord {
  schema_version: 2;
  artifact_type: "campaign-confirmation-usage";
  run_id: string;
  campaign_id: string;
  task_id: string;
  receipt_id: string;
  usage: CampaignPolicyConfirmationUsage[string];
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
  artifact_store?: TaskArtifactRepository;
  secret_resolver?: SecretResolver;
  signal?: AbortSignal;
}

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
      include: (path) => path.endsWith(".yaml") && !basename(path).startsWith("."),
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
    generated_from: "product-evals/campaigns/*.yaml",
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
    await emitCampaignReport(runId);
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
        "REQUIRED specialized evaluation receipt is missing; route frozen Cascade route/trace evidence through cascade-evals:harness-evaluation before general evaluation",
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
    await emitCampaignReport(runId);
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
  await emitCampaignReport(runId);
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
  if (command === "catalog" || command === "registry") {
    return commandCatalog([...(value ? [value] : []), ...rest]);
  }
  if (command === "validate" && value) return commandValidate(value);
  if (command === "run" && value) {
    return commandRun(value, rest);
  }
  if (command === "resume" && value) {
    return commandRun(value, rest, true, dependencies.now);
  }
  if (command === "verify" && value) return commandVerify(value, rest);
  if (command === "report" && value) {
    if (rest.some((argument) => argument !== "--pdf") || rest.length > 1) throw new CascadeError("campaign report accepts only --pdf");
    const report = await writeCampaignReport(value, { pdf: rest.includes("--pdf") });
    console.log(`campaign_report=${report.html}${report.pdf ? ` pdf=${report.pdf}` : ""}`);
    return 0;
  }
  if (command === "self-test") return commandSelfTest();
  console.log(`Usage:
  bun scripts/cascade.ts campaign list
  bun scripts/cascade.ts campaign registry [--check|--write]
    (catalog remains a compatibility alias)
  bun scripts/cascade.ts campaign validate <campaign-id-or-path>
  bun scripts/cascade.ts campaign run <campaign-id-or-path> [--run-id ID]
    [--attempt N] [--parent-run-id ID] [--lease-id ID]
    [--platform NAME] [--confirmation-receipt PATH]
  bun scripts/cascade.ts campaign resume <run-id> --lease-id ID
    [--recovery SUBJECT] [--recovery-reason TEXT]
    [--platform NAME] [--confirmation-receipt PATH]
  bun scripts/cascade.ts campaign verify <run-id>
    [--confirmation-key KEY_ID=ENV_VAR]
  bun scripts/cascade.ts campaign report <run-id> [--pdf]
  bun scripts/cascade.ts campaign self-test
`);
  return command ? 1 : 0;
}
