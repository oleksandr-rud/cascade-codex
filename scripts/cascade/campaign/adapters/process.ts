import { mkdir, mkdtemp, readdir, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { relative, resolve, sep } from "node:path";

import {
  CascadeError,
  assertJsonSchema,
  boundedPath,
  isFile,
  readBoundedRegularFile,
  readJson,
  rootPath,
  runCommand,
  stableJson,
  valueDigest,
  walkFiles,
  writeJsonAtomic,
  writeJsonExclusive,
  writeTextExclusive,
} from "../../common";
import { parseStrictYaml } from "../../structured-data";
import {
  type PolicyDecision,
  type SecretResolutionContext,
  type SecretResolver,
  type TaskAdapter,
  type TaskAdapterContext,
  type TaskAdapterEvent,
  type TaskAdapterResult,
  type TaskCleanupResult,
  type TaskCommandResult,
  type TaskHttpResult,
  type TaskRecoveryResult,
} from "../task-adapter";
import {
  cascadeHarnessCodexCommand,
  gradeCascadeHarnessTrace,
  resolveCascadeHarnessProfile,
  type ResolvedCascadeHarnessProfile,
} from "../../evals";
import {
  consumePolicyBudget,
  consumePolicyOutputBudget,
} from "../../campaign-policies";
import { applyFakeActionAuthority } from "../../evaluation-authority";
import {
  assertSafeSimulationAction,
  type BrowserAction,
  type DesktopAction,
  type DriverType,
  type HttpRequestDefinition,
  type HttpRequestValue,
  type SimulationAction,
  type TaskDefinition,
  type TerminalStep,
  taskPolicyActions,
} from "../../simulation-definitions";

import { resolveHttpRequestValue } from "./transport-support";

export const directProcessTaskAdapter: TaskAdapter = {
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
