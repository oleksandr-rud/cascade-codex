import { mkdir } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";

import {
  CascadeError,
  boolFlag,
  boundedPath,
  flag,
  flags,
  isFile,
  parseArgs,
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
  type CampaignIdentityEnvelope,
  type FrozenCampaignArtifact,
  CampaignArtifactStore,
} from "./campaign-artifacts";
import {
  type CampaignPolicyBudgetUsage,
  type CampaignPolicyDecision,
  type PolicyConfirmationReceipt,
  applyPolicyOutputControls,
  consumePolicyBudget,
  consumePolicyOutputBudget,
  resolvePolicyDecision,
  validatePolicyConfirmationReceipt,
} from "./campaign-policies";
import {
  type EvaluationIdentity,
  type EvaluationReceipt,
  type MechanicalEvaluation,
  buildFixtureEvaluationReceipt,
  runCodexEvaluation,
} from "./evaluations";
import {
  type CalibrationDefinition,
  type CalibrationStatus,
  type CampaignStatus,
  type ClaimDefinition,
  type ClaimStatus,
  type DriverType,
  type MetricDefinition,
  type OracleDefinition,
  type PolicyDefinition,
  type ResolvedCampaign,
  type ScoreRow,
  type TaskAction,
  type TaskDefinition,
  findCampaignPath,
  resolveCampaign,
} from "./simulation-definitions";
import type { PersonaRefinementProposal } from "./persona-simulations";

const CAMPAIGN_ROOT = rootPath("evals/campaigns");
const ARTIFACT_ROOT = rootPath(".artifacts/campaigns");
const CATALOG_PATH = rootPath("evals/campaigns/catalog.generated.json");

export type PolicyDecision = CampaignPolicyDecision;

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
  output_control?: {
    policy_id: string;
    max_output_bytes: number;
    original_bytes: number;
    retained_bytes: number;
    redacted: boolean;
    truncated: boolean;
  };
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
      type: TaskAction["type"];
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
      argv: string[];
      exit_code: number;
      timed_out: boolean;
      aborted: boolean;
      status: "PASS" | "BLOCKED";
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
      status: "BLOCKED";
      reason: string;
    }
  | {
      event_type: "BOUNDARY";
      type: "lifecycle-bound";
      phase: "EXECUTE" | "ORACLE" | "RECOVERY" | "CLEANUP" | "FINALIZE";
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
  readonly task: TaskDefinition;
  readonly fixture: Record<string, unknown>;
  readonly policies: PolicyDefinition[];
  readonly cleanup_contract: ResolvedCampaign["world"]["cleanup"];
  readonly budget_usage: CampaignPolicyBudgetUsage;
  readonly authorize_action: (input: {
    action_index: number;
    action: TaskAction | { type: "process-exec"; argv: string[] };
    projected_output_bytes: number;
  }) => PolicyDecision;
  readonly control_output: (
    value: string,
    policy: PolicyDefinition,
  ) => ReturnType<typeof applyPolicyOutputControls>;
  readonly child_env_omit: string[];
  readonly signal?: AbortSignal;
}

export interface TaskAdapterResult {
  outcome: TaskExecutionOutcome;
  earliest_failure: string | null;
  side_effects: TaskSideEffectStatus;
  policy_decisions: PolicyDecision[];
  policy_decision_digest: string;
  events: TaskAdapterEvent[];
  final_state?: Record<string, unknown>;
  command?: TaskCommandResult;
}

export interface TaskAdapterFailure {
  outcome: "CANCELLED" | "UNKNOWN_OUTCOME";
  reason: string;
}

export interface TaskAdapter {
  driver: DriverType;
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
  adapters?: ReadonlyMap<DriverType, TaskAdapter>;
  oracle_evaluator?: TaskOracleEvaluator;
  confirmation_receipts?: PolicyConfirmationReceipt[];
  confirmation_secrets?: Record<string, string>;
  budget_usage?: CampaignPolicyBudgetUsage;
  artifact_store?: CampaignArtifactStore;
  signal?: AbortSignal;
}

export interface TaskResult {
  task_id: string;
  kind: string;
  driver: string;
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
  policy_decisions: PolicyDecision[];
  oracle_results: OracleResult[];
  events: TaskEvent[];
  final_state?: Record<string, unknown>;
  command?: TaskCommandResult;
  evidence: FrozenCampaignArtifact[];
  recovery: TaskRecoveryResult;
  cleanup: TaskCleanupResult;
}

interface CorrelationResult {
  metric_id: string;
  treatment_ids: string[];
  simulated_values: number[];
  reference_values: number[];
  rank_correlation: number | null;
  linear_correlation: number | null;
  sample_count: number;
  missing_slices: string[];
  status: "PASS" | "FAIL";
}

interface CalibrationReceipt {
  schema_version: 1;
  calibration_id: string;
  run_id: string;
  definition_id: string;
  definition_digest: string;
  source_kind: string;
  framework_fixture: boolean;
  reviewer_identity: string;
  reference_label_digest: string;
  simulated_scores_digest: string;
  reference_scores_digest: string;
  treatment_ids: string[];
  metric_results: CorrelationResult[];
  human_agreement: number | null;
  reference_window_end: string;
  stale_after: string;
  status: CalibrationStatus;
  blockers: string[];
  residual_scope: string[];
  invalidation_inputs: Array<{ path: string; sha256: string }>;
  aggregator_identity: string;
  created_at: string;
}

interface AggregationReceipt {
  schema_version: 1;
  aggregation_id: string;
  run_id: string;
  campaign_id: string;
  aggregator_identity: string;
  execution_receipt_digest: string;
  evaluation_receipt_digest: string;
  calibration_receipt_digest: string | null;
  release_eligible: boolean;
  release_claims: Array<{ claim_id: string; status: ClaimStatus }>;
  status: CampaignStatus;
  created_at: string;
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

function setStatePath(
  state: Record<string, unknown>,
  path: string,
  value: unknown,
): void {
  const parts = pathParts(path);
  let current = state;
  for (const part of parts.slice(0, -1)) {
    const existing = current[part];
    if (!existing || typeof existing !== "object" || Array.isArray(existing)) {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  }
  current[parts.at(-1)!] = clone(value);
}

function applyFakeAction(
  state: Record<string, unknown>,
  action: TaskAction,
): { status: "PASS" | "FAIL"; reason: string | null } {
  if (action.type === "assert") {
    if (!action.path) return { status: "FAIL", reason: "assert path missing" };
    const actual = getStatePath(state, action.path);
    return valuesEqual(actual, action.value)
      ? { status: "PASS", reason: null }
      : {
          status: "FAIL",
          reason: `state assertion failed at ${action.path}`,
        };
  }
  if (action.type === "set") {
    if (!action.path) return { status: "FAIL", reason: "set path missing" };
    setStatePath(state, action.path, action.value);
    return { status: "PASS", reason: null };
  }
  if (action.type === "increment") {
    if (!action.path) {
      return { status: "FAIL", reason: "increment path missing" };
    }
    const actual = getStatePath(state, action.path);
    const amount = action.amount ?? 1;
    if (typeof actual !== "number" || !Number.isFinite(amount)) {
      return { status: "FAIL", reason: `increment target is not numeric` };
    }
    setStatePath(state, action.path, actual + amount);
    return { status: "PASS", reason: null };
  }
  if (action.type === "deny") {
    return { status: "FAIL", reason: action.reason ?? "action denied by world" };
  }
  return { status: "FAIL", reason: action.reason ?? "injected failure" };
}

async function evaluateOracle(
  oracle: OracleDefinition,
  state: Record<string, unknown> | undefined,
  command: TaskCommandResult | undefined,
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
  const file = oracle.file!;
  const present = await isFile(boundedPath(file));
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
      evaluateOracle(oracle, context.final_state, context.command),
  };
}

const fakeTaskAdapter: TaskAdapter = {
  driver: "fake",
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
      const actionResult = applyFakeAction(state, action);
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
  driver: "direct-process",
  async execute(context): Promise<TaskAdapterResult> {
    const policyDecision = context.authorize_action({
      action_index: 0,
      action: { type: "process-exec", argv: context.task.command! },
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
    const result = await runCommand(context.task.command!, {
      timeoutMs: context.task.timeout_ms,
      signal: context.signal,
      maxOutputBytes: policyDecision.budgets!.remaining_after.output_bytes,
      unsetEnv: context.child_env_omit,
    });
    const stdoutControl = context.control_output(
      result.stdout,
      processPolicy,
    );
    const stderrControl = context.control_output(
      result.stderr,
      processPolicy,
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
      argv: result.argv,
      exit_code: result.exitCode,
      timed_out: result.timedOut,
      aborted: result.aborted,
      stdout: controlledStdout,
      stderr: controlledStderr,
      output_control: {
        policy_id: processPolicy.id,
        max_output_bytes: processPolicy.budgets.max_output_bytes,
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
    const ambiguous = result.timedOut || result.aborted;
    const outcome = ambiguous
      ? "UNKNOWN_OUTCOME"
      : outputBudgetExceeded
        ? "FAILED"
        : "SUCCEEDED";
    return {
      outcome,
      earliest_failure: result.timedOut
        ? "process timed out after dispatch; side effects are unknown"
        : result.aborted
          ? "process cancelled after dispatch; side effects are unknown"
          : outputBudgetExceeded
            ? "process output exceeded the governing policy budget"
          : null,
      side_effects: ambiguous ? "UNKNOWN" : "KNOWN",
      policy_decisions: policyDecisions,
      events: [
        {
          event_type: "PROCESS",
          index: 0,
          type: "process-exec",
          argv: result.argv,
          exit_code: result.exitCode,
          timed_out: result.timedOut,
          aborted: result.aborted,
          status: ambiguous || outputBudgetExceeded ? "BLOCKED" : "PASS",
        },
      ],
      command,
    };
  },
  async recover(): Promise<TaskRecoveryResult> {
    return {
      status: "UNSUPPORTED",
      attempted: false,
      reason: "direct-process side effects cannot be reconstructed safely",
    };
  },
  async cleanup(_context, result): Promise<TaskCleanupResult> {
    if (!result?.command) {
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
      reason: "process termination observed",
    };
  },
};

export function createTaskAdapterRegistry(
  additional: TaskAdapter[] = [],
): ReadonlyMap<DriverType, TaskAdapter> {
  const adapters = new Map<DriverType, TaskAdapter>();
  for (const adapter of [fakeTaskAdapter, directProcessTaskAdapter, ...additional]) {
    if (adapters.has(adapter.driver)) {
      throw new CascadeError(`duplicate task adapter: ${adapter.driver}`);
    }
    adapters.set(adapter.driver, adapter);
  }
  return adapters;
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
const DIRECT_PROCESS_TERMINATION_ALLOWANCE_MS = 1_000;

async function runBoundedTaskStep<T>(
  phase: "EXECUTE" | "ORACLE" | "RECOVERY" | "CLEANUP",
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
  const confirmationSecrets = { ...(input.confirmation_secrets ?? {}) };
  const budgetUsage = input.budget_usage ?? {};
  const sensitiveValues = Object.values(confirmationSecrets);
  const adapterContext: TaskAdapterContext = {
    run_id: input.run_id ?? `task:${task.id}`,
    campaign_id: resolved.campaign.id,
    platform,
    task: clone(task),
    fixture: clone(resolved.fixture),
    policies: clone(taskPolicies),
    cleanup_contract: clone(resolved.world.cleanup),
    budget_usage: budgetUsage,
    authorize_action: ({ action_index, action, projected_output_bytes }) =>
      resolvePolicyDecision(taskPolicies, {
        run_id: input.run_id ?? `task:${task.id}`,
        campaign_id: resolved.campaign.id,
        task_id: task.id,
        task_kind: task.kind,
        driver_type: task.driver.type,
        action_index,
        action,
        projected_output_bytes,
        supported_budget_dimensions: ["action_count", "output_bytes"],
        redaction_capabilities: ["no-secrets-v1", "source-code-v1"],
        now: utcNow(),
        confirmation_receipts: confirmationReceipts,
        confirmation_secrets: confirmationSecrets,
        budget_usage: budgetUsage,
      }),
    control_output: (value, policy) =>
      applyPolicyOutputControls(value, policy, sensitiveValues),
    child_env_omit: taskPolicies.flatMap((policy) =>
      policy.confirmation_authority
        ? [policy.confirmation_authority.secret_env]
        : [],
    ),
  };
  const contextWithSignal = (signal: AbortSignal): TaskAdapterContext => ({
    ...adapterContext,
    signal,
  });
  const adapter =
    (input.adapters ?? createTaskAdapterRegistry()).get(task.driver.type);
  if (adapter && adapter.driver !== task.driver.type) {
    throw new CascadeError(
      `task adapter registry mismatch: ${task.driver.type}/${adapter.driver}`,
    );
  }
  let adapterResult: TaskAdapterResult | null = null;
  let adapterDispatched = false;
  let recovery = noRecovery();
  let cleanup = noCleanup("adapter was not dispatched");

  if (input.signal?.aborted) {
    outcome = "CANCELLED";
    earliestFailure = "task cancelled before adapter dispatch";
  } else if (!adapter) {
    outcome = "BLOCKED";
    earliestFailure = `runtime adapter not implemented: ${task.driver.type}`;
    emit({
      event_type: "ADAPTER",
      type: "adapter",
      status: "BLOCKED",
      reason: earliestFailure,
    });
  } else {
    try {
      adapterDispatched = true;
      const executionBound =
        task.timeout_ms +
        (adapter.driver === "direct-process"
          ? DIRECT_PROCESS_TERMINATION_ALLOWANCE_MS
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
        outcome = adapterResult.outcome;
        earliestFailure = adapterResult.earliest_failure;
        sideEffects = adapterResult.side_effects;
        for (const event of adapterResult.events) emit(event);
      } else {
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
    } catch (error) {
      outcome = "UNKNOWN_OUTCOME";
      sideEffects = "UNKNOWN";
      const detail = error instanceof Error ? error.message : String(error);
      earliestFailure = `adapter failed after dispatch: ${detail}`;
    }
  }

  const oracleResults: OracleResult[] = [];
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
    adapterDispatched &&
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

  if (adapter && adapterDispatched) {
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
    adapterResult?.policy_decisions ?? [],
  );
  await writeTaskJson(resolve(taskRoot, "oracle.json"), oracleResults);
  if (adapterResult?.final_state) {
    await writeTaskJson(
      resolve(taskRoot, "final-state.json"),
      adapterResult.final_state,
    );
  }
  await writeTaskJson(resolve(taskRoot, "recovery.json"), recovery);
  await writeTaskJson(resolve(taskRoot, "cleanup.json"), cleanup);

  const policyDecisions = adapterResult?.policy_decisions ?? [];
  const result: TaskResult = {
    task_id: task.id,
    kind: task.kind,
    driver: task.driver.type,
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
    policy_decisions: policyDecisions,
    policy_decision_digest: valueDigest(policyDecisions),
    oracle_results: oracleResults,
    events,
    ...(adapterResult?.final_state
      ? { final_state: adapterResult.final_state }
      : {}),
    ...(adapterResult?.command ? { command: adapterResult.command } : {}),
    evidence,
    recovery,
    cleanup,
  };
  await writeTaskJson(resolve(taskRoot, "result.json"), result);
  return result;
}

function mean(values: number[]): number {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function pearson(left: number[], right: number[]): number | null {
  if (left.length !== right.length || left.length < 2) return null;
  const leftMean = mean(left);
  const rightMean = mean(right);
  let numerator = 0;
  let leftVariance = 0;
  let rightVariance = 0;
  for (let index = 0; index < left.length; index += 1) {
    const leftDelta = left[index]! - leftMean;
    const rightDelta = right[index]! - rightMean;
    numerator += leftDelta * rightDelta;
    leftVariance += leftDelta ** 2;
    rightVariance += rightDelta ** 2;
  }
  const denominator = Math.sqrt(leftVariance * rightVariance);
  return denominator === 0 ? null : numerator / denominator;
}

function ranks(values: number[]): number[] {
  const sorted = values
    .map((value, index) => ({ value, index }))
    .sort((left, right) => left.value - right.value);
  const result = Array<number>(values.length);
  for (let start = 0; start < sorted.length; ) {
    let end = start + 1;
    while (end < sorted.length && sorted[end]!.value === sorted[start]!.value) {
      end += 1;
    }
    const rank = (start + 1 + end) / 2;
    for (let index = start; index < end; index += 1) {
      result[sorted[index]!.index] = rank;
    }
    start = end;
  }
  return result;
}

function spearman(left: number[], right: number[]): number | null {
  return pearson(ranks(left), ranks(right));
}

function aggregateScores(
  rows: ScoreRow[],
  metric: MetricDefinition,
  treatmentIds: string[],
): number[] {
  return treatmentIds.map((treatmentId) => {
    const values = rows
      .filter(
        (row) =>
          row.metric_id === metric.id && row.treatment_id === treatmentId,
      )
      .map((row) => row.value);
    if (!values.length) {
      throw new CascadeError(
        `no ${metric.id} scores for treatment ${treatmentId}`,
      );
    }
    if (metric.aggregation === "sum") {
      return values.reduce((total, value) => total + value, 0);
    }
    if (metric.aggregation === "exact") {
      return values.every((value) => value === values[0]) ? values[0]! : Number.NaN;
    }
    return mean(values);
  });
}

function humanAgreement(rows: ScoreRow[]): number | null {
  const judged = rows.filter(
    (row) =>
      typeof row.human_label === "number" &&
      typeof row.judge_label === "number",
  );
  if (!judged.length) return null;
  return (
    judged.filter((row) => row.human_label === row.judge_label).length /
    judged.length
  );
}

function staleAfter(definition: CalibrationDefinition): Date {
  const value = new Date(definition.reference.reference_window_end);
  value.setUTCDate(value.getUTCDate() + definition.staleness_days);
  return value;
}

export function buildCalibrationReceipt(
  resolved: ResolvedCampaign,
  runId: string,
  aggregatorIdentity: string,
  now = new Date(),
): CalibrationReceipt | null {
  const definition = resolved.calibration;
  if (!definition) return null;
  const blockers: string[] = [];
  const metricResults: CorrelationResult[] = [];
  const baseline = resolved.treatments.find((treatment) => treatment.baseline);
  if (!baseline || !definition.treatment_ids.includes(baseline.id)) {
    blockers.push("calibration treatment set does not include the baseline");
  }
  for (const metricId of definition.metric_ids) {
    const metric = resolved.metrics.find((item) => item.id === metricId)!;
    const undeclaredMetricSlices = metric.required_slices.filter(
      (slice) => !definition.required_slices.includes(slice),
    );
    if (undeclaredMetricSlices.length) {
      blockers.push(
        `calibration definition omits ${metric.id} slices: ${undeclaredMetricSlices.join(", ")}`,
      );
    }
    const requiredSlices = [
      ...new Set([...definition.required_slices, ...metric.required_slices]),
    ];
    const simulatedValues = aggregateScores(
      resolved.simulatedScores,
      metric,
      definition.treatment_ids,
    );
    const referenceValues = aggregateScores(
      resolved.referenceScores,
      metric,
      definition.treatment_ids,
    );
    const rankCorrelation = spearman(simulatedValues, referenceValues);
    const linearCorrelation = pearson(simulatedValues, referenceValues);
    const rows = resolved.referenceScores.filter(
      (row) => row.metric_id === metricId,
    );
    const missingSlices: string[] = [];
    for (const [source, scoreRows] of [
      ["simulated", resolved.simulatedScores],
      ["reference", resolved.referenceScores],
    ] as const) {
      for (const treatmentId of definition.treatment_ids) {
        const presentSlices = new Set(
          scoreRows
            .filter(
              (row) =>
                row.metric_id === metricId &&
                row.treatment_id === treatmentId,
            )
            .map((row) => row.slice),
        );
        for (const slice of requiredSlices) {
          if (!presentSlices.has(slice)) {
            missingSlices.push(`${source}:${treatmentId}:${slice}`);
          }
        }
      }
    }
    const sampleCount = new Set(rows.map((row) => row.case_id)).size;
    if ((metric.uncertainty ?? "none") !== "none") {
      blockers.push(
        `metric uncertainty reducer not implemented: ${metric.id}/${metric.uncertainty}`,
      );
    }
    const passed =
      sampleCount >= definition.thresholds.minimum_samples &&
      rankCorrelation !== null &&
      rankCorrelation >= definition.thresholds.minimum_rank_correlation &&
      linearCorrelation !== null &&
      linearCorrelation >= definition.thresholds.minimum_linear_correlation &&
      missingSlices.length === 0 &&
      (metric.uncertainty ?? "none") === "none" &&
      simulatedValues.every(Number.isFinite) &&
      referenceValues.every(Number.isFinite);
    metricResults.push({
      metric_id: metricId,
      treatment_ids: definition.treatment_ids,
      simulated_values: simulatedValues,
      reference_values: referenceValues,
      rank_correlation: rankCorrelation,
      linear_correlation: linearCorrelation,
      sample_count: sampleCount,
      missing_slices: missingSlices,
      status: passed ? "PASS" : "FAIL",
    });
    if (!passed) blockers.push(`metric calibration failed: ${metricId}`);
  }
  const agreement = humanAgreement(resolved.referenceScores);
  const fullyLabelled = resolved.referenceScores.every(
    (row) =>
      typeof row.human_label === "number" &&
      typeof row.judge_label === "number",
  );
  if (
    !fullyLabelled ||
    agreement === null ||
    agreement < definition.thresholds.minimum_human_agreement
  ) {
    blockers.push("human agreement threshold not satisfied");
  }
  const expires = staleAfter(definition);
  let status: CalibrationStatus = blockers.length
    ? "UNCALIBRATED"
    : "CALIBRATED";
  if (!definition.framework_fixture && now > expires) status = "STALE";
  return {
    schema_version: 1,
    calibration_id: `${runId}-calibration`,
    run_id: runId,
    definition_id: definition.id,
    definition_digest: valueDigest(definition),
    source_kind: definition.reference.kind,
    framework_fixture: definition.framework_fixture,
    reviewer_identity: definition.reference.reviewer_identity,
    reference_label_digest: definition.reference.label_digest,
    simulated_scores_digest: valueDigest(resolved.simulatedScores),
    reference_scores_digest: valueDigest(resolved.referenceScores),
    treatment_ids: definition.treatment_ids,
    metric_results: metricResults,
    human_agreement: agreement,
    reference_window_end: definition.reference.reference_window_end,
    stale_after: expires.toISOString(),
    status,
    blockers,
    residual_scope: definition.framework_fixture
      ? ["framework fixture only; target-project calibration remains NOT_RUN"]
      : [],
    invalidation_inputs: resolved.sourceDigests,
    aggregator_identity: aggregatorIdentity,
    created_at: utcNow(),
  };
}

function claimStatus(
  claim: ClaimDefinition,
  taskResults: TaskResult[],
  calibration: CalibrationReceipt | null,
): { status: ClaimStatus; reason: string; evidence: string[] } {
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
  if (failedTasks.length) {
    return {
      status: "UNSUPPORTED",
      reason: `required task failed: ${failedTasks.map((item) => item.task_id).join(", ")}`,
      evidence: failedTasks.map((item) => item.task_id),
    };
  }
  if (missingOracles.length) {
    return {
      status: "BLOCKED",
      reason: `required oracle evidence missing: ${missingOracles.join(", ")}`,
      evidence: [],
    };
  }
  if (missingMetrics.length || missingEvidence.length) {
    return {
      status: "BLOCKED",
      reason: [
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
  const claimLedger = resolved.claims.map((claim) => ({
    claim_id: claim.id,
    class: claim.class,
    ...claimStatus(claim, taskResults, calibration),
  }));
  const requiredFailures = claimLedger.filter(
    (claim) =>
      claim.class !== "release-eligibility" &&
      claim.status !== "SUPPORTED",
  );
  return {
    claim_ledger: claimLedger,
    status: requiredFailures.length ? "FAIL" : "PASS",
  };
}

export function assertEvaluationReceiptFresh(
  resolved: ResolvedCampaign,
  identity: EvaluationIdentity,
  evaluation: EvaluationReceipt,
): void {
  const expected: Array<[unknown, unknown, string]> = [
    [evaluation.schema_version, 2, "schema_version"],
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
  if (resolved.evaluationProfile.provider === "codex") {
    if (
      !isDigest(evaluation.input_manifest_digest) ||
      !isDigest(evaluation.provider_trace_digest) ||
      !isDigest(evaluation.provider_output_digest)
    ) {
      throw new CascadeError(
        "Codex evaluation receipt packet/provider digests are missing or invalid",
      );
    }
  } else if (
    evaluation.input_manifest_digest !== null ||
    evaluation.provider_trace_digest !== null ||
    evaluation.provider_output_digest !== null
  ) {
    throw new CascadeError("fixture evaluation receipt has provider trace data");
  }
  if (
    evaluation.evaluator_identity === evaluation.operator_identity ||
    evaluation.evaluator_identity === identity.targetActorIdentity
  ) {
    throw new CascadeError("evaluation receipt violates evaluator independence");
  }
  const expectedClaims = resolved.claims.map((claim) => claim.id).sort();
  const actualClaims = evaluation.claim_ledger.map((claim) => claim.claim_id);
  if (
    new Set(actualClaims).size !== actualClaims.length ||
    !valuesEqual([...actualClaims].sort(), expectedClaims)
  ) {
    throw new CascadeError(
      "evaluation receipt claim ledger is missing, duplicated, or stale",
    );
  }
}

function buildAggregationReceipt(
  resolved: ResolvedCampaign,
  runId: string,
  aggregatorIdentity: string,
  executionReceiptDigest: string,
  evaluation: EvaluationReceipt,
  calibration: CalibrationReceipt | null,
): AggregationReceipt {
  const releaseClaims = evaluation.claim_ledger
    .filter((claim) => claim.class === "release-eligibility")
    .map((claim) => ({ claim_id: claim.claim_id, status: claim.status }));
  const releaseEligible =
    releaseClaims.length > 0 &&
    releaseClaims.every((claim) => claim.status === "SUPPORTED");
  return {
    schema_version: 1,
    aggregation_id: `${runId}-aggregation`,
    run_id: runId,
    campaign_id: resolved.campaign.id,
    aggregator_identity: aggregatorIdentity,
    execution_receipt_digest: executionReceiptDigest,
    evaluation_receipt_digest: valueDigest(evaluation),
    calibration_receipt_digest: calibration
      ? valueDigest(calibration)
      : null,
    release_eligible: releaseEligible,
    release_claims: releaseClaims,
    status: evaluation.status,
    created_at: utcNow(),
  };
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
      contours: [...new Set(resolved.tasks.map((task) => task.kind))].sort(),
      drivers: [
        ...new Set(resolved.tasks.map((task) => task.driver.type)),
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
    generated_from: "evals/campaigns/*.json",
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

async function sourceRevision(
  sourceFiles: string[],
): Promise<{ revision: string; dirty: boolean }> {
  const revision = await runCommand(["git", "rev-parse", "HEAD"]);
  if (revision.exitCode !== 0) {
    throw new CascadeError("cannot resolve repository source revision");
  }
  const status = await runCommand([
    "git",
    "status",
    "--porcelain=v1",
    "--untracked-files=all",
    "--",
    ...sourceFiles,
    "scripts/cascade.ts",
    "scripts/cascade",
  ]);
  if (status.exitCode !== 0) {
    throw new CascadeError("cannot resolve campaign working-tree status");
  }
  return {
    revision: revision.stdout.trim(),
    dirty: status.stdout.trim().length > 0,
  };
}

async function commandRun(value: string, argv: string[]): Promise<number> {
  const args = parseArgs(argv);
  await assertCampaignCatalogCurrent(await buildCampaignCatalog());
  const path = await findCampaignPath(value);
  const resolved = await resolveCampaign(path);
  const runId =
    flag(args, "run-id") ??
    `${resolved.campaign.id}-${new Date()
      .toISOString()
      .replace(/[-:.TZ]/g, "")
      .slice(0, 14)}`;
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]+$/.test(runId)) {
    throw new CascadeError(`invalid run ID: ${runId}`);
  }
  const operatorIdentity = flag(args, "operator", "local-simulation-operator")!;
  const evaluatorIdentity = flag(
    args,
    "evaluator",
    resolved.evaluationProfile.provider === "codex"
      ? `codex:simulation-evaluator:${resolved.evaluationProfile.model}`
      : "fixture:simulation-evaluator",
  )!;
  const aggregatorIdentity = flag(args, "aggregator", "local-campaign-aggregator")!;
  const targetActorIdentity = `target:${resolved.simulation.id}`;
  const simulatorIdentity = `simulator:${resolved.simulation.id}`;
  const recoveryIdentity = flag(args, "recovery", "local-simulation-recovery")!;
  const platform = flag(args, "platform", process.platform)!;
  if (!platform.trim()) {
    throw new CascadeError("campaign platform must be non-empty");
  }
  const identities: CampaignIdentityEnvelope = {
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
    aggregator: {
      role: "campaign-aggregator",
      session_id: `${runId}:aggregator`,
      subject: aggregatorIdentity,
    },
    target: {
      role: "target-actor",
      session_id: `${runId}:target`,
      subject: targetActorIdentity,
    },
    simulator: {
      role: "simulator",
      session_id: `${runId}:simulator`,
      subject: simulatorIdentity,
    },
    recovery: {
      role: "simulation-recovery",
      session_id: `${runId}:recovery`,
      subject: recoveryIdentity,
    },
  };

  const runRoot = resolve(ARTIFACT_ROOT, runId);
  let artifactStore = new CampaignArtifactStore(ARTIFACT_ROOT, runId);
  const campaignDigest = await sha256File(path);
  const leaseAcquiredAt = new Date();
  const leaseExpiresAt = new Date(leaseAcquiredAt.getTime() + 60 * 60 * 1000);
  const leaseId = flag(args, "lease-id", crypto.randomUUID())!;
  await artifactStore.reserve({
    campaign_id: resolved.campaign.id,
    campaign_digest: campaignDigest,
    attempt: Number(flag(args, "attempt", "1")),
    parent_run_id: flag(args, "parent-run-id") ?? null,
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
    operator_identity: operatorIdentity,
  });

  const executionRoot = resolve(runRoot, "execution");
  const frozenSources = await freezeSources(resolved, artifactStore, platform);
  const repositorySource = await sourceRevision(resolved.sourceFiles);
  const sourceManifest = {
    schema_version: 1,
    run_id: runId,
    campaign_id: resolved.campaign.id,
    platform,
    source_revision: repositorySource.revision,
    dirty_source: repositorySource.dirty,
    definitions: resolved.sourceDigests,
    frozen_sources: frozenSources,
    source_digest: valueDigest(resolved.sourceDigests),
  };
  await artifactStore.writeStageJson(
    "execution/source-manifest.json",
    sourceManifest,
  );
  await artifactStore.appendLifecycle({
    status: "RUNNING",
    at: utcNow(),
    source_manifest_digest: valueDigest(sourceManifest),
  });
  const sourceManifestDigest = valueDigest(sourceManifest);
  const confirmationReceipts = await Promise.all(
    flags(args, "confirmation-receipt").map(async (receiptPath) => {
      const receipt = await readJson<unknown>(boundedPath(receiptPath));
      validatePolicyConfirmationReceipt(receipt);
      return receipt;
    }),
  );
  const confirmationReceiptIds = new Set<string>();
  for (const receipt of confirmationReceipts) {
    if (confirmationReceiptIds.has(receipt.receipt_id)) {
      throw new CascadeError(
        `duplicate confirmation receipt id: ${receipt.receipt_id}`,
      );
    }
    confirmationReceiptIds.add(receipt.receipt_id);
  }
  const confirmationSecrets: Record<string, string> = {};
  for (const policy of resolved.policies) {
    const authority = policy.confirmation_authority;
    if (!authority) continue;
    const secret = Bun.env[authority.secret_env];
    if (secret) confirmationSecrets[authority.key_id] = secret;
    delete process.env[authority.secret_env];
  }
  artifactStore = artifactStore.withSensitiveValues(
    Object.values(confirmationSecrets),
  );
  const budgetUsage: CampaignPolicyBudgetUsage = {};

  const taskResults: TaskResult[] = [];
  for (const task of resolved.tasks) {
    taskResults.push(
      await executeCampaignTask({
        resolved,
        task,
        task_root: resolve(executionRoot, "tasks", task.id),
        operator_identity: operatorIdentity,
        target_actor_identity: targetActorIdentity,
        run_id: runId,
        platform,
        confirmation_receipts: confirmationReceipts,
        confirmation_secrets: confirmationSecrets,
        budget_usage: budgetUsage,
        artifact_store: artifactStore,
      }),
    );
  }
  const requiredFailures = taskResults.filter(
    (task) => task.required && task.status !== "PASS",
  );
  const requiredBlocked = requiredFailures.filter(
    (task) => task.status === "BLOCKED",
  );
  const cleanupVerified = taskResults.every((task) => task.cleanup.verified);
  const executionReceipt = {
    schema_version: 1,
    run_id: runId,
    campaign_id: resolved.campaign.id,
    platform,
    campaign_digest: campaignDigest,
    source_manifest_digest: sourceManifestDigest,
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
    })),
    cleanup_verified: cleanupVerified,
    status:
      requiredBlocked.length
        ? "BLOCKED"
        : requiredFailures.length || !cleanupVerified
          ? "FAIL"
          : "PASS",
    earliest_failure: requiredFailures[0]?.earliest_failure ?? null,
    evidence_root: rel(executionRoot),
    created_at: utcNow(),
  };
  await artifactStore.writeStageJson(
    "execution/execution-receipt.json",
    executionReceipt,
  );
  const executionReceiptDigest = valueDigest(executionReceipt);

  const calibration = buildCalibrationReceipt(
    resolved,
    runId,
    aggregatorIdentity,
  );
  if (calibration) {
    await artifactStore.writeStageJson(
      `calibrations/${calibration.calibration_id}.json`,
      calibration,
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
    sourceManifestDigest,
    executionReceiptDigest,
    calibrationReceiptDigest: calibration ? valueDigest(calibration) : null,
  };
  await artifactStore.appendLifecycle({
    status: "EVALUATING",
    at: utcNow(),
    provider: resolved.evaluationProfile.provider,
    profile_id: resolved.evaluationProfile.id,
    evaluator_identity: evaluatorIdentity,
  });
  let evaluation: EvaluationReceipt | null;
  let refinementProposals: PersonaRefinementProposal[] = [];
  let evaluationAttempt: string | null = null;
  let evaluationBlockedReason: string | null = null;
  if (resolved.evaluationProfile.provider === "codex") {
    const result = await runCodexEvaluation(
      resolved,
      runRoot,
      evaluationIdentity,
      mechanicalEvaluation,
      artifactStore,
    );
    evaluation = result.receipt;
    refinementProposals = result.refinementProposals;
    evaluationAttempt = result.attemptPath;
    evaluationBlockedReason = result.blockedReason;
  } else {
    evaluation = buildFixtureEvaluationReceipt(
      resolved,
      evaluationIdentity,
      mechanicalEvaluation,
    );
    await artifactStore.writeStageJson(
      `evaluations/${evaluation.evaluation_id}/receipt.json`,
      evaluation,
    );
  }
  if (!evaluation) {
    const blockedSummary = {
      schema_version: 1,
      run_id: runId,
      campaign_id: resolved.campaign.id,
      execution_status: executionReceipt.status,
      evaluation_status: "BLOCKED",
      evaluation_provider: resolved.evaluationProfile.provider,
      evaluation_profile_id: resolved.evaluationProfile.id,
      evaluation_attempt: evaluationAttempt,
      evaluation_blocker: evaluationBlockedReason,
      calibration_status: calibration?.status ?? "NOT_RUN",
      release_eligible: false,
      campaign_status: "BLOCKED",
      execution_receipt_digest: executionReceiptDigest,
      evaluation_receipt_digest: null,
      calibration_receipt_digest: calibration ? valueDigest(calibration) : null,
      aggregation_receipt_digest: null,
      completed_at: utcNow(),
    };
    await artifactStore.writeStageJson("summary.json", blockedSummary);
    await artifactStore.appendLifecycle({
      status: "BLOCKED",
      at: utcNow(),
      campaign_status: "BLOCKED",
      evaluation_attempt: evaluationAttempt,
      reason: evaluationBlockedReason,
    });
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
  assertEvaluationReceiptFresh(resolved, evaluationIdentity, evaluation);
  for (const proposal of refinementProposals) {
    await artifactStore.writeStageJson(
      `refinements/${proposal.proposal_id}.json`,
      proposal,
    );
  }
  const aggregation = buildAggregationReceipt(
    resolved,
    runId,
    aggregatorIdentity,
    executionReceiptDigest,
    evaluation,
    calibration,
  );
  await artifactStore.writeStageJson(
    `aggregations/${aggregation.aggregation_id}.json`,
    aggregation,
  );
  const summary = {
    schema_version: 1,
    run_id: runId,
    campaign_id: resolved.campaign.id,
    execution_status: executionReceipt.status,
    evaluation_status: evaluation.status,
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
    campaign_status:
      executionReceipt.status === "PASS" && evaluation.status === "PASS"
        ? "PASS"
        : "FAIL",
    execution_receipt_digest: executionReceiptDigest,
    evaluation_receipt_digest: valueDigest(evaluation),
    calibration_receipt_digest: calibration ? valueDigest(calibration) : null,
    aggregation_receipt_digest: valueDigest(aggregation),
    completed_at: utcNow(),
  };
  await artifactStore.writeStageJson("summary.json", summary);
  await artifactStore.appendLifecycle({
    status: "COMPLETED",
    at: utcNow(),
    campaign_status: summary.campaign_status,
    release_eligible: summary.release_eligible,
  });
  await artifactStore.finalize({
    status: "COMPLETED",
    finalized_by: identities.operator,
  });
  console.log(
    `campaign_status=${summary.campaign_status} campaign=${resolved.campaign.id} ` +
      `run=${runId} calibration=${summary.calibration_status} ` +
      `evaluation=${summary.evaluation_status}/${summary.evaluation_provider} ` +
      `release_eligible=${summary.release_eligible} output=${rel(runRoot)}`,
  );
  return summary.campaign_status === "PASS" ? 0 : 1;
}

async function commandVerify(runId: string): Promise<number> {
  const result = await new CampaignArtifactStore(
    ARTIFACT_ROOT,
    runId,
  ).verify();
  console.log(
    `campaign_artifact_verification=${result.status} run=${result.run_id} ` +
      `finalization=${result.finalization_status} files=${result.file_count} ` +
      `manifest_digest=${result.manifest_digest}`,
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
    new Date(fixtureCalibration.calibration!.reference.reference_window_end),
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

export async function main(argv: string[]): Promise<number> {
  const [command, value, ...rest] = argv;
  if (command === "list") return commandList();
  if (command === "catalog") return commandCatalog([...(value ? [value] : []), ...rest]);
  if (command === "validate" && value) return commandValidate(value);
  if (command === "run" && value) return commandRun(value, rest);
  if (command === "verify" && value) return commandVerify(value);
  if (command === "self-test") return commandSelfTest();
  console.log(`Usage:
  bun scripts/cascade.ts campaign list
  bun scripts/cascade.ts campaign catalog [--check|--write]
  bun scripts/cascade.ts campaign validate <campaign-id-or-path>
  bun scripts/cascade.ts campaign run <campaign-id-or-path> [--run-id ID]
    [--attempt N] [--parent-run-id ID] [--lease-id ID]
    [--platform NAME] [--confirmation-receipt PATH]
  bun scripts/cascade.ts campaign verify <run-id>
  bun scripts/cascade.ts campaign self-test
`);
  return command ? 1 : 0;
}
