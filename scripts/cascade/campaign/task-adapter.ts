import type { FrozenCampaignArtifact } from "./artifacts/artifact-types";
import {
  applyPolicyOutputControls,
  type CampaignPolicyBudgetUsage,
  type CampaignPolicyDecision,
} from "../campaign-policies";
import {
  ACTION_BINDING_VERSION,
  type BrowserAction,
  type CampaignStatus,
  type DriverType,
  type HttpMethod,
  type OracleDefinition,
  type PolicyDefinition,
  type ResolvedCampaign,
  type SecretReference,
  type SimulationAction,
  type TaskDefinition,
} from "../simulation-definitions";

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

export type TaskEventPayload =
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
