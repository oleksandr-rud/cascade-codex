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

export const desktopPlatformTaskAdapter: TaskAdapter = {
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

export const mobilePlatformTaskAdapter: TaskAdapter = {
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
