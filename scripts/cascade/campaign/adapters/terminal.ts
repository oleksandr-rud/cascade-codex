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

export const ptyTaskAdapter: TaskAdapter = {
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
