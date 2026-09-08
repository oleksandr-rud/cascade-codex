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

export const playwrightTaskAdapter: TaskAdapter = {
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
