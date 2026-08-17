import { constants } from "node:fs";
import { lstat, open, realpath, stat } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";

import { boundedPath, CascadeError, rootPath, valueDigest } from "./common";
import type { MechanicalEvaluation } from "./evaluations";
import type {
  CalibrationDefinition,
  CalibrationStatus,
  ClaimDefinition,
  ClaimStatus,
  MetricDefinition,
  ScoreRow,
  SimulationAction,
  TaskAction,
  TreatmentDefinition,
} from "./simulation-definitions";
import {
  ACTION_BINDING_VERSION,
  actionBindingDigest,
  assertSafeSimulationAction,
} from "./simulation-definitions";

function authorityPathParts(path: string): string[] {
  const parts = path.split(".").filter(Boolean);
  if (!parts.length || parts.some((part) => part === "__proto__")) {
    throw new CascadeError(`invalid state path: ${path}`);
  }
  return parts;
}

export function getAuthorityStatePath(
  state: Record<string, unknown>,
  path: string,
): unknown {
  let current: unknown = state;
  for (const part of authorityPathParts(path)) {
    if (!current || typeof current !== "object" || Array.isArray(current)) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function setAuthorityStatePath(
  state: Record<string, unknown>,
  path: string,
  value: unknown,
): void {
  const parts = authorityPathParts(path);
  let current = state;
  for (const part of parts.slice(0, -1)) {
    const next = current[part];
    if (!next || typeof next !== "object" || Array.isArray(next)) {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  }
  current[parts.at(-1)!] = structuredClone(value);
}

export function applyFakeActionAuthority(
  state: Record<string, unknown>,
  action: TaskAction,
): { status: "PASS" | "FAIL"; reason: string | null } {
  if (action.type === "assert") {
    if (!action.path) return { status: "FAIL", reason: "assert path missing" };
    const actual = getAuthorityStatePath(state, action.path);
    return valueDigest(actual) === valueDigest(action.value)
      ? { status: "PASS", reason: null }
      : { status: "FAIL", reason: `state assertion failed at ${action.path}` };
  }
  if (action.type === "set") {
    if (!action.path) return { status: "FAIL", reason: "set path missing" };
    setAuthorityStatePath(state, action.path, action.value);
    return { status: "PASS", reason: null };
  }
  if (action.type === "increment") {
    if (!action.path) return { status: "FAIL", reason: "increment path missing" };
    const actual = getAuthorityStatePath(state, action.path);
    const amount = action.amount ?? 1;
    if (typeof actual !== "number" || !Number.isFinite(amount)) {
      return { status: "FAIL", reason: "increment target is not numeric" };
    }
    setAuthorityStatePath(state, action.path, actual + amount);
    return { status: "PASS", reason: null };
  }
  if (action.type === "deny") {
    return { status: "FAIL", reason: action.reason ?? "action denied by world" };
  }
  return { status: "FAIL", reason: action.reason ?? "injected failure" };
}

export interface FakeActionReplayProjection {
  final_state: Record<string, unknown>;
  outcome: "SUCCEEDED" | "FAILED" | "BLOCKED";
  status: "PASS" | "FAIL" | "BLOCKED";
  earliest_failure: string | null;
}

export function replayFakeActionPrefixAuthority(
  fixture: Record<string, unknown>,
  actions: readonly TaskAction[],
  decisions: readonly Record<string, unknown>[],
  events: readonly Record<string, unknown>[],
  label: string,
): FakeActionReplayProjection {
  if (
    decisions.length !== events.length ||
    decisions.length > actions.length
  ) {
    throw new CascadeError(`${label} replay coverage is incomplete or excessive`);
  }
  const state = structuredClone(fixture);
  let terminalStatus: "PASS" | "FAIL" | "BLOCKED" = "PASS";
  let terminalReason: string | null = null;
  for (let index = 0; index < events.length; index += 1) {
    const action = actions[index]!;
    const decision = decisions[index]!;
    const event = events[index]!;
    if (
      terminalStatus !== "PASS" ||
      decision.action_index !== index ||
      decision.action_type !== action.type ||
      event.index !== index ||
      event.type !== action.type ||
      event.policy_decision !== decision.decision ||
      valueDigest(event.before) !== valueDigest(state)
    ) {
      throw new CascadeError(`${label} replay diverges before action ${index}`);
    }
    let expectedStatus: "PASS" | "FAIL" | "BLOCKED";
    let expectedReason: string | null;
    if (decision.decision === "ALLOW") {
      const replay = applyFakeActionAuthority(state, action);
      expectedStatus = replay.status;
      expectedReason = replay.reason;
    } else if (decision.decision === "DENY") {
      expectedStatus = "FAIL";
      expectedReason = String(decision.reason);
    } else if (
      decision.decision === "BLOCKED" ||
      decision.decision === "REQUIRE_CONFIRMATION"
    ) {
      expectedStatus = "BLOCKED";
      expectedReason = String(decision.reason);
    } else {
      throw new CascadeError(`${label} replay has an invalid policy decision at action ${index}`);
    }
    if (
      event.status !== expectedStatus ||
      event.reason !== expectedReason ||
      valueDigest(event.after) !== valueDigest(state)
    ) {
      throw new CascadeError(`${label} replay diverges after action ${index}`);
    }
    terminalStatus = expectedStatus;
    terminalReason = expectedReason;
  }
  if (events.length < actions.length && terminalStatus === "PASS") {
    throw new CascadeError(`${label} replay stopped before a terminal action`);
  }
  return terminalStatus === "PASS"
    ? {
        final_state: state,
        outcome: "SUCCEEDED",
        status: "PASS",
        earliest_failure: null,
      }
    : terminalStatus === "FAIL"
      ? {
          final_state: state,
          outcome: "FAILED",
          status: "FAIL",
          earliest_failure: terminalReason,
        }
      : {
          final_state: state,
          outcome: "BLOCKED",
          status: "BLOCKED",
          earliest_failure: terminalReason,
        };
}

export async function observeFileExistsAuthority(
  file: string,
  options: {
    opened_checkpoint?: (path: string) => void | Promise<void>;
    root?: string;
  } = {},
): Promise<{ absolute_path: string; present: boolean }> {
  const lexicalRoot = options.root === undefined
    ? rootPath()
    : resolve(options.root);
  const absolutePath = options.root === undefined
    ? boundedPath(file)
    : resolve(lexicalRoot, file);
  const lexicalRelation = relative(lexicalRoot, absolutePath);
  if (
    options.root !== undefined &&
    (isAbsolute(file) ||
      file.includes("\\") ||
      !lexicalRelation ||
      lexicalRelation === ".." ||
      lexicalRelation.startsWith(`..${sep}`) ||
      lexicalRelation.startsWith(sep))
  ) {
    throw new CascadeError(
      `task-file authority requires a canonical task-root-relative file: ${file}`,
    );
  }
  if (absolutePath === lexicalRoot) {
    throw new CascadeError(
      `file-exists authority requires a regular final file: ${file}`,
    );
  }
  const canonicalRoot = await realpath(lexicalRoot);
  const ancestorIdentities: Array<{ path: string; dev: number; ino: number }> = [];
  const components = relative(lexicalRoot, absolutePath).split(sep);
  let ancestor = lexicalRoot;
  for (const component of components.slice(0, -1)) {
    ancestor = resolve(ancestor, component);
    const metadata = await lstat(ancestor).catch(() => null);
    if (!metadata) {
      return { absolute_path: absolutePath, present: false };
    }
    if (!metadata?.isDirectory() || metadata.isSymbolicLink()) {
      throw new CascadeError(
        `file-exists authority requires a regular non-symbolic-link path with identity-stable ancestors: ${file}`,
      );
    }
    ancestorIdentities.push({ path: ancestor, dev: metadata.dev, ino: metadata.ino });
  }
  const rootMetadata = await lstat(lexicalRoot);
  ancestorIdentities.push({
    path: lexicalRoot,
    dev: rootMetadata.dev,
    ino: rootMetadata.ino,
  });
  const revalidateAncestors = async (): Promise<void> => {
    for (const identity of ancestorIdentities) {
      const metadata = await lstat(identity.path).catch(() => null);
      if (
        !metadata?.isDirectory() ||
        metadata.isSymbolicLink() ||
        metadata.dev !== identity.dev ||
        metadata.ino !== identity.ino
      ) {
        throw new CascadeError(
          `file-exists authority ancestor changed identity during observation: ${file}`,
        );
      }
    }
  };
  let handle;
  try {
    handle = await open(
      absolutePath,
      constants.O_RDONLY | constants.O_NONBLOCK | constants.O_NOFOLLOW,
    );
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      await revalidateAncestors();
      return { absolute_path: absolutePath, present: false };
    }
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      ["ELOOP", "EMLINK", "ENXIO", "ENODEV", "EOPNOTSUPP"].includes(
        String(error.code),
      )
    ) {
      throw new CascadeError(
        `file-exists authority requires a regular non-symbolic-link path and final file: ${file}`,
      );
    }
    throw error;
  }
  try {
    const opened = await handle.stat();
    if (!opened.isFile()) {
      throw new CascadeError(
        `file-exists authority requires a regular final file: ${file}`,
      );
    }
    await options.opened_checkpoint?.(absolutePath);
    await revalidateAncestors();
    let canonicalOpened: string | null = null;
    for (const descriptorPath of [
      `/proc/self/fd/${handle.fd}`,
      `/dev/fd/${handle.fd}`,
    ]) {
      try {
        canonicalOpened = await realpath(descriptorPath);
        break;
      } catch {
        // Descriptor paths are platform-specific.
      }
    }
    canonicalOpened ??= await realpath(absolutePath).catch(() => null);
    const canonicalMetadata = canonicalOpened
      ? await stat(canonicalOpened).catch(() => null)
      : null;
    const after = await handle.stat();
    const current = await lstat(absolutePath).catch(() => null);
    if (
      canonicalOpened === null ||
      (canonicalOpened !== canonicalRoot &&
        !canonicalOpened.startsWith(`${canonicalRoot}${sep}`)) ||
      !canonicalMetadata?.isFile() ||
      canonicalMetadata.dev !== opened.dev ||
      canonicalMetadata.ino !== opened.ino ||
      !after.isFile() ||
      after.dev !== opened.dev ||
      after.ino !== opened.ino ||
      after.size !== opened.size ||
      after.mtimeMs !== opened.mtimeMs ||
      after.ctimeMs !== opened.ctimeMs ||
      !current?.isFile() ||
      current.isSymbolicLink() ||
      current.dev !== opened.dev ||
      current.ino !== opened.ino ||
      current.size !== opened.size ||
      current.mtimeMs !== opened.mtimeMs ||
      current.ctimeMs !== opened.ctimeMs
    ) {
      throw new CascadeError(
        `file-exists authority changed identity during observation: ${file}`,
      );
    }
    await revalidateAncestors();
  } finally {
    await handle.close();
  }
  return { absolute_path: absolutePath, present: true };
}

export interface RequiredPolicyEvidenceProjection {
  status: "BLOCKED";
  reason: string;
  evidence: [];
  missing_policy_ids: string[];
}

export function validateTaskEventChronologyAuthority(
  events: readonly Record<string, unknown>[],
  label: string,
): void {
  if (
    events.length < 3 ||
    events[0]?.sequence !== 0 ||
    events[0]?.event_type !== "LIFECYCLE" ||
    events[0]?.phase !== "STARTED" ||
    events.at(-1)?.sequence !== events.length - 1 ||
    events.at(-1)?.event_type !== "LIFECYCLE" ||
    events.at(-1)?.phase !== "COMPLETED" ||
    events.some((event, index) => event.sequence !== index)
  ) {
    throw new CascadeError(`${label} lifecycle chronology is not contiguous and terminal`);
  }
  if (
    events.filter((event) => event.event_type === "LIFECYCLE").length !== 2 ||
    events.filter((event) => event.event_type === "CLEANUP").length !== 1
  ) {
    throw new CascadeError(`${label} lifecycle chronology has extra or missing terminal phases`);
  }
  const adapters = events.filter((event) => event.event_type === "ADAPTER");
  const actionEvents = events.filter((event) => event.event_type === "ACTION");
  const processEvents = events.filter((event) => event.event_type === "PROCESS");
  const httpEvents = events.filter((event) => event.event_type === "HTTP");
  const browserEvents = events.filter((event) => event.event_type === "BROWSER");
  const oracleEvents = events.filter((event) => event.event_type === "ORACLE");
  const recoveryEvents = events.filter((event) => event.event_type === "RECOVERY");
  if (
    adapters.length > 1 ||
    processEvents.length > 1 ||
    httpEvents.length > 1 ||
    recoveryEvents.length > 1
  ) {
    throw new CascadeError(`${label} lifecycle chronology has duplicate singleton phases`);
  }
  const boundaryPhases = new Set([
    "EXECUTE",
    "ORACLE",
    "RECOVERY",
    "CLEANUP",
    "FINALIZE",
  ]);
  const seenBoundaries = new Set<string>();
  for (const event of events.filter((item) => item.event_type === "BOUNDARY")) {
    const phase = String(event.phase);
    if (!boundaryPhases.has(phase)) {
      throw new CascadeError(`${label} lifecycle chronology has an unknown BOUNDARY phase`);
    }
    if (seenBoundaries.has(phase)) {
      throw new CascadeError(`${label} lifecycle chronology has duplicate BOUNDARY/${phase} phases`);
    }
    seenBoundaries.add(phase);
  }
  const driver = events[0]?.driver;
  const outcome = events.at(-1)?.outcome;
  if (typeof driver === "string" && typeof outcome === "string") {
    const expectedTerminalStatus = outcome === "SUCCEEDED"
      ? "PASS"
      : outcome === "FAILED"
        ? "FAIL"
        : "BLOCKED";
    const driverEvents = {
      ACTION: actionEvents,
      PROCESS: processEvents,
      HTTP: httpEvents,
      BROWSER: browserEvents,
    };
    const cancelledBeforeDispatch =
      outcome === "CANCELLED" &&
      adapters.length === 0 &&
      Object.values(driverEvents).every((values) => values.length === 0);
    if (
      (!cancelledBeforeDispatch && adapters.length !== 1) ||
      (cancelledBeforeDispatch && adapters.length !== 0) ||
      (adapters.length === 1 && events[1] !== adapters[0])
    ) {
      throw new CascadeError(`${label} driver/outcome grammar requires exactly one ordered ADAPTER event`);
    }
    if (
      events.at(-1)?.status !== expectedTerminalStatus ||
      events.some((event) => event.driver !== driver)
    ) {
      throw new CascadeError(`${label} terminal status or driver conflicts with its outcome grammar`);
    }
    const adapterReady = adapters[0]?.status === "READY";
    if (adapters.length === 1 && !new Set(["READY", "BLOCKED"]).has(String(adapters[0]!.status))) {
      throw new CascadeError(`${label} driver/outcome grammar has an invalid ADAPTER event`);
    }
    const cleanupEvent = events.find((event) => event.event_type === "CLEANUP")!;
    const boundary = (phase: string): Record<string, unknown> | undefined =>
      events.find((event) => event.event_type === "BOUNDARY" && event.phase === phase);
    const executeBoundary = boundary("EXECUTE");
    const oracleBoundary = boundary("ORACLE");
    const recoveryBoundary = boundary("RECOVERY");
    const cleanupBoundary = boundary("CLEANUP");
    const finalizeBoundary = boundary("FINALIZE");
    const boundedStatuses = new Set(["TIMED_OUT", "CANCELLED"]);
    for (const item of [executeBoundary, oracleBoundary, recoveryBoundary, cleanupBoundary]) {
      if (item && !boundedStatuses.has(String(item.status))) {
        throw new CascadeError(`${label} boundary phase has an impossible runtime status`);
      }
    }
    const eventAfter = (event: Record<string, unknown>): Record<string, unknown> | undefined =>
      events[Number(event.sequence) + 1];
    if (
      (executeBoundary &&
        (events[2] !== executeBoundary || Object.values(driverEvents).some((items) => items.length))) ||
      (oracleBoundary &&
        (eventAfter(oracleBoundary)?.event_type !== "ORACLE" ||
          eventAfter(oracleBoundary)?.status !== "FAIL" ||
          oracleEvents.at(-1) !== eventAfter(oracleBoundary))) ||
      (recoveryBoundary &&
        (eventAfter(recoveryBoundary)?.event_type !== "RECOVERY" ||
          eventAfter(recoveryBoundary)?.status !== "FAILED")) ||
      (cleanupBoundary &&
        (eventAfter(cleanupBoundary) !== cleanupEvent || cleanupEvent.status !== "UNKNOWN")) ||
      (finalizeBoundary &&
        (finalizeBoundary.status !== "CANCELLED" ||
          eventAfter(finalizeBoundary) !== events.at(-1)))
    ) {
      throw new CascadeError(`${label} boundary phase is not paired with its runtime terminal event`);
    }
    if (!adapterReady) {
      if (
        Object.values(driverEvents).some((values) => values.length > 0) ||
        oracleEvents.length > 0 ||
        recoveryEvents.length > 0 ||
        seenBoundaries.size > 0 ||
        (adapters.length === 1 && !new Set(["BLOCKED", "CANCELLED"]).has(outcome))
      ) {
        throw new CascadeError(`${label} events violate the exact ${driver}/${outcome} driver grammar`);
      }
    } else {
      type RuntimeOutcome = "SUCCEEDED" | "FAILED" | "BLOCKED" | "CANCELLED" | "UNKNOWN_OUTCOME";
      let possible = new Set<RuntimeOutcome>();
      if (executeBoundary) {
        possible.add(executeBoundary.status === "CANCELLED" ? "CANCELLED" : "UNKNOWN_OUTCOME");
      } else if (driver === "fake") {
        if (processEvents.length || httpEvents.length || browserEvents.length) {
          throw new CascadeError(`${label} fake runtime contains foreign driver evidence`);
        }
        if (actionEvents.length) {
          if (
            actionEvents.some((event, index) =>
              !new Set(["PASS", "FAIL", "BLOCKED"]).has(String(event.status)) ||
              (index < actionEvents.length - 1 && event.status !== "PASS")
            )
          ) {
            throw new CascadeError(`${label} fake action prefix has an impossible terminal shape`);
          }
          const actionStatus = actionEvents.at(-1)!.status;
          possible.add(actionStatus === "PASS" ? "SUCCEEDED" : actionStatus === "FAIL" ? "FAILED" : "BLOCKED");
        } else {
          possible = new Set(["CANCELLED", "UNKNOWN_OUTCOME"]);
        }
      } else if (driver === "direct-process") {
        if (actionEvents.length || httpEvents.length || browserEvents.length) {
          throw new CascadeError(`${label} direct-process runtime contains foreign driver evidence`);
        }
        const process = processEvents[0];
        if (process) {
          if (
            process.index !== 0 ||
            process.type !== "process-exec" ||
            !new Set(["PASS", "BLOCKED"]).has(String(process.status)) ||
            typeof process.timed_out !== "boolean" ||
            typeof process.aborted !== "boolean" ||
            (process.status === "PASS" && (process.timed_out === true || process.aborted === true))
          ) {
            throw new CascadeError(`${label} direct-process evidence has an impossible status`);
          }
          possible.add(process.status === "PASS"
            ? "SUCCEEDED"
            : process.timed_out === true || process.aborted === true
              ? "UNKNOWN_OUTCOME"
              : "FAILED");
        } else {
          possible = new Set(["FAILED", "BLOCKED", "CANCELLED", "UNKNOWN_OUTCOME"]);
        }
      } else if (driver === "http-client") {
        if (actionEvents.length || processEvents.length || browserEvents.length) {
          throw new CascadeError(`${label} HTTP runtime contains foreign driver evidence`);
        }
        const http = httpEvents[0];
        if (http) {
          if (
            http.index !== 0 ||
            http.type !== "http-request" ||
            !new Set(["PASS", "BLOCKED"]).has(String(http.status))
          ) {
            throw new CascadeError(`${label} HTTP evidence has an impossible status`);
          }
          possible.add(http.status === "PASS" ? "SUCCEEDED" : "FAILED");
        } else {
          possible = new Set(["FAILED", "BLOCKED", "CANCELLED", "UNKNOWN_OUTCOME"]);
        }
      } else if (driver === "playwright") {
        if (actionEvents.length || processEvents.length || httpEvents.length) {
          throw new CascadeError(`${label} Playwright runtime contains foreign driver evidence`);
        }
        if (browserEvents.length) {
          if (
            browserEvents.some((event, index) =>
              event.index !== index ||
              !new Set(["browser-fill", "browser-click", "browser-navigate"]).has(String(event.type)) ||
              !new Set(["PASS", "BLOCKED"]).has(String(event.status)) ||
              (index < browserEvents.length - 1 && event.status !== "PASS")
            )
          ) {
            throw new CascadeError(`${label} Playwright action prefix has an impossible terminal shape`);
          }
          const terminalBrowserStatus = browserEvents.at(-1)!.status;
          possible = terminalBrowserStatus === "PASS"
            ? new Set(["SUCCEEDED", "BLOCKED"])
            : new Set(["FAILED"]);
        } else {
          possible = new Set(["FAILED", "BLOCKED", "CANCELLED", "UNKNOWN_OUTCOME"]);
        }
      } else if (driver === "pty") {
        if (processEvents.length || httpEvents.length || browserEvents.length) {
          throw new CascadeError(`${label} PTY runtime contains foreign driver evidence`);
        }
        if (actionEvents.length) {
          const terminalActionTypes = new Set([
            "terminal-spawn",
            "terminal-wait",
            "terminal-input",
            "terminal-resize",
            "terminal-signal",
            "terminal-capture",
          ]);
          if (
            actionEvents.some((event, index) =>
              event.index !== index ||
              !terminalActionTypes.has(String(event.type)) ||
              !new Set(["PASS", "FAIL", "BLOCKED"]).has(String(event.status)) ||
              (index < actionEvents.length - 1 && event.status !== "PASS")
            )
          ) {
            throw new CascadeError(`${label} PTY action prefix has an impossible terminal shape`);
          }
          const actionStatus = actionEvents.at(-1)!.status;
          possible = new Set([
            actionStatus === "PASS"
              ? "SUCCEEDED"
              : actionStatus === "FAIL"
                ? "FAILED"
                : "BLOCKED",
          ]);
        } else {
          possible = new Set(["FAILED", "BLOCKED", "CANCELLED", "UNKNOWN_OUTCOME"]);
        }
      } else if (driver === "platform-automation") {
        if (processEvents.length || httpEvents.length || browserEvents.length) {
          throw new CascadeError(`${label} desktop runtime contains foreign driver evidence`);
        }
        if (actionEvents.length) {
          const desktopActionTypes = new Set([
            "desktop-launch",
            "desktop-type",
            "desktop-key",
            "desktop-wait-file",
            "desktop-capture",
            "mobile-launch",
            "mobile-tap",
            "mobile-type",
            "mobile-key",
            "mobile-wait-text",
            "mobile-capture",
          ]);
          if (
            actionEvents.some((event, index) =>
              event.index !== index ||
              !desktopActionTypes.has(String(event.type)) ||
              !new Set(["PASS", "FAIL", "BLOCKED"]).has(String(event.status)) ||
              (index < actionEvents.length - 1 && event.status !== "PASS")
            )
          ) {
            throw new CascadeError(`${label} desktop action prefix has an impossible terminal shape`);
          }
          const actionStatus = actionEvents.at(-1)!.status;
          possible = new Set([
            actionStatus === "PASS"
              ? "SUCCEEDED"
              : actionStatus === "FAIL"
                ? "FAILED"
                : "BLOCKED",
          ]);
        } else {
          possible = new Set(["FAILED", "BLOCKED", "CANCELLED", "UNKNOWN_OUTCOME"]);
        }
      } else if (driver === "agent-runtime") {
        if (processEvents.length || httpEvents.length || browserEvents.length) {
          throw new CascadeError(`${label} agent runtime contains foreign driver evidence`);
        }
        if (actionEvents.length) {
          if (
            actionEvents.some((event, index) =>
              event.index !== index ||
              event.type !== "agent-invoke" ||
              !new Set(["PASS", "FAIL", "BLOCKED"]).has(String(event.status)) ||
              (index < actionEvents.length - 1 && event.status !== "PASS")
            )
          ) {
            throw new CascadeError(`${label} agent action prefix has an impossible terminal shape`);
          }
          const actionStatus = actionEvents.at(-1)!.status;
          possible = new Set([
            actionStatus === "PASS"
              ? "SUCCEEDED"
              : actionStatus === "FAIL"
                ? "FAILED"
                : "BLOCKED",
          ]);
        } else {
          possible = new Set(["FAILED", "BLOCKED", "CANCELLED", "UNKNOWN_OUTCOME"]);
        }
      } else {
        if (Object.values(driverEvents).some((values) => values.length > 0)) {
          throw new CascadeError(`${label} runtime contains evidence for a different driver`);
        }
        possible = new Set(["SUCCEEDED", "FAILED", "BLOCKED", "CANCELLED", "UNKNOWN_OUTCOME"]);
      }

      if (oracleEvents.length || oracleBoundary) {
        if (!possible.has("SUCCEEDED") || oracleEvents.some((event) => !new Set(["PASS", "FAIL"]).has(String(event.status)))) {
          throw new CascadeError(`${label} oracle phase cannot follow its driver outcome`);
        }
        possible = oracleBoundary
          ? new Set([oracleBoundary.status === "CANCELLED" ? "CANCELLED" : "BLOCKED"])
          : new Set([oracleEvents.some((event) => event.status === "FAIL") ? "FAILED" : "SUCCEEDED"]);
      }

      const recoveryEligible = new Set(
        [...possible].filter((value) => value === "CANCELLED" || value === "UNKNOWN_OUTCOME"),
      );
      if (recoveryEvents.length) {
        possible = recoveryEligible;
      } else {
        possible = new Set(
          [...possible].filter((value) => value !== "CANCELLED" && value !== "UNKNOWN_OUTCOME"),
        );
      }
      if (!possible.size || (recoveryBoundary && !recoveryEvents.length)) {
        throw new CascadeError(`${label} recovery phase is missing or impossible for its driver outcome`);
      }
      if (
        outcome === "UNKNOWN_OUTCOME" &&
        recoveryEvents.length === 0 &&
        ((driver === "direct-process" && processEvents.length === 0) ||
          (driver === "http-client" && httpEvents.length === 0))
      ) {
        throw new CascadeError(`${label} recovery phase is missing for ambiguous driver execution`);
      }

      if (cleanupEvent.status === "UNKNOWN") {
        possible = new Set(["UNKNOWN_OUTCOME"]);
      } else if (cleanupEvent.status === "FAILED") {
        possible = new Set(
          [...possible].map((value) => value === "UNKNOWN_OUTCOME" ? value : "FAILED"),
        );
      }
      if (finalizeBoundary) {
        possible.delete("CANCELLED");
        possible = new Set(
          [...possible].map((value) => value === "SUCCEEDED" ? "CANCELLED" : value),
        );
      }
      if (!possible.has(outcome as RuntimeOutcome)) {
        throw new CascadeError(`${label} terminal outcome is impossible for its runtime phase grammar`);
      }
    }
  }
  const phaseRank = new Map<string, number>([
    ["ADAPTER", 0],
    ["ACTION", 1],
    ["PROCESS", 1],
    ["HTTP", 1],
    ["BROWSER", 1],
    ["ORACLE", 2],
    ["RECOVERY", 3],
    ["CLEANUP", 4],
  ]);
  let priorRank = 0;
  for (const event of events.slice(1, -1)) {
    const eventType = String(event.event_type);
    const rank = eventType === "BOUNDARY"
      ? new Map<string, number>([
          ["EXECUTE", 1],
          ["ORACLE", 2],
          ["RECOVERY", 3],
          ["CLEANUP", 4],
          ["FINALIZE", 5],
        ]).get(String(event.phase))
      : phaseRank.get(eventType);
    if (rank === undefined) {
      throw new CascadeError(`${label} lifecycle chronology has an unknown event phase`);
    }
    if (rank < priorRank) {
      throw new CascadeError(`${label} action/oracle/recovery/cleanup chronology is reordered`);
    }
    priorRank = rank;
  }
}

export function validatePolicyDriverEventAuthority(input: {
  driver: string;
  actions: readonly SimulationAction[];
  decisions: readonly Record<string, unknown>[];
  events: readonly Record<string, unknown>[];
  outcome?: string;
  label: string;
}): void {
  const expectedEventType = input.driver === "direct-process"
    ? "PROCESS"
    : input.driver === "http-client"
      ? "HTTP"
      : input.driver === "playwright"
        ? "BROWSER"
      : "ACTION";
  const evidenceEvents = input.events.filter((event) =>
    new Set(["ACTION", "PROCESS", "HTTP", "BROWSER"]).has(String(event.event_type))
  );
  if (evidenceEvents.some((event) => event.event_type !== expectedEventType)) {
    throw new CascadeError(`${input.label} contains evidence for a different driver`);
  }
  const exactEvidenceRequired = expectedEventType === "ACTION";
  const executionInterrupted =
    new Set(["UNKNOWN_OUTCOME", "CANCELLED"]).has(String(input.outcome)) ||
    input.events.some(
      (event) =>
        event.event_type === "BOUNDARY" &&
        event.phase === "EXECUTE" &&
        new Set(["TIMED_OUT", "CANCELLED"]).has(String(event.status)),
    );
  if (
    (exactEvidenceRequired &&
      evidenceEvents.length !== input.decisions.length &&
      !executionInterrupted) ||
    (exactEvidenceRequired && evidenceEvents.length > input.decisions.length) ||
    (!exactEvidenceRequired && evidenceEvents.length > input.decisions.length)
  ) {
    throw new CascadeError(`${input.label} evidence coverage is incomplete or excessive`);
  }
  for (const [decisionIndex, decision] of input.decisions.entries()) {
    const action = input.actions[decisionIndex];
    if (action) assertSafeSimulationAction(action);
    if (
      !action ||
      decision.action_index !== decisionIndex ||
      decision.action_type !== action.type ||
      decision.action_binding_version !== ACTION_BINDING_VERSION ||
      decision.action_binding_digest !== actionBindingDigest(action)
    ) {
      throw new CascadeError(`${input.label} action binding is stale at ${decisionIndex}`);
    }
    const evidence = evidenceEvents.find((event) => event.index === decisionIndex);
    if (!evidence) {
      if (exactEvidenceRequired && !executionInterrupted) {
        throw new CascadeError(`${input.label} evidence is missing at ${decisionIndex}`);
      }
      continue;
    }
    if (evidence.type !== action.type) {
      throw new CascadeError(`${input.label} event type is stale at ${decisionIndex}`);
    }
    if (expectedEventType === "ACTION") {
      const expectedStatuses = decision.decision === "DENY"
        ? new Set(["FAIL"])
        : new Set(["BLOCKED", "REQUIRE_CONFIRMATION"]).has(String(decision.decision))
          ? new Set(["BLOCKED"])
          : decision.decision === "ALLOW"
            ? new Set(["PASS", "FAIL"])
            : new Set<string>();
      if (
        evidence.policy_decision !== decision.decision ||
        !expectedStatuses.has(String(evidence.status))
      ) {
        throw new CascadeError(`${input.label} decision status is stale at ${decisionIndex}`);
      }
    } else {
      if (
        decision.decision !== "ALLOW" ||
        !new Set(["PASS", "BLOCKED"]).has(String(evidence.status))
      ) {
        throw new CascadeError(`${input.label} dispatch status is stale at ${decisionIndex}`);
      }
      if (
        evidence.action_binding_version !== ACTION_BINDING_VERSION ||
        evidence.action_binding_digest !== actionBindingDigest(action)
      ) {
        throw new CascadeError(`${input.label} event action digest is stale at ${decisionIndex}`);
      }
      if (
        (expectedEventType === "PROCESS" &&
          actionBindingDigest({
            type: evidence.type,
            argv: evidence.argv,
            ...(evidence.process === undefined ? {} : { process: evidence.process }),
          }) !==
            actionBindingDigest(action)) ||
        (expectedEventType === "HTTP" &&
          (evidence.method !== (action as Record<string, unknown>).method ||
            evidence.url !== (action as Record<string, unknown>).url)) ||
        (expectedEventType === "BROWSER" &&
          actionBindingDigest(evidence.action as SimulationAction) !==
            actionBindingDigest(action))
      ) {
        throw new CascadeError(`${input.label} event action payload is stale at ${decisionIndex}`);
      }
    }
  }
  if (evidenceEvents.some((event) =>
    !Number.isInteger(event.index) ||
    Number(event.index) < 0 ||
    Number(event.index) >= input.decisions.length
  )) {
    throw new CascadeError(`${input.label} evidence index is outside policy authority`);
  }
}

export function requiredPolicyEvidenceProjection(
  requiredPolicyIds: readonly string[],
  decisions: readonly { policy_id: string }[],
): RequiredPolicyEvidenceProjection | null {
  const missingPolicyIds = requiredPolicyIds.filter(
    (id) => !decisions.some((decision) => decision.policy_id === id),
  );
  return missingPolicyIds.length
    ? {
        status: "BLOCKED",
        reason: `required positive policy evidence missing: ${missingPolicyIds.join(", ")}`,
        evidence: [],
        missing_policy_ids: missingPolicyIds,
      }
    : null;
}

export interface CorrelationResult {
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

export interface CalibrationReceipt {
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

export interface CalibrationAuthorityInput {
  definition: CalibrationDefinition;
  metrics: readonly MetricDefinition[];
  treatments: readonly TreatmentDefinition[];
  simulated_scores: readonly ScoreRow[];
  reference_scores: readonly ScoreRow[];
  source_digests: Array<{ path: string; sha256: string }>;
  run_id: string;
  aggregator_identity: string;
  evaluation_at: string;
}

function mean(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function pearson(left: readonly number[], right: readonly number[]): number | null {
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

function ranks(values: readonly number[]): number[] {
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

function aggregateScores(
  rows: readonly ScoreRow[],
  metric: MetricDefinition,
  treatmentIds: readonly string[],
): number[] {
  return treatmentIds.map((treatmentId) => {
    const values = rows
      .filter((row) => row.metric_id === metric.id && row.treatment_id === treatmentId)
      .map((row) => row.value);
    if (!values.length) {
      throw new CascadeError(`no ${metric.id} scores for treatment ${treatmentId}`);
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

export function buildCalibrationAuthority(
  input: CalibrationAuthorityInput,
): CalibrationReceipt {
  const { definition } = input;
  const evaluationInstant = new Date(input.evaluation_at);
  if (!Number.isFinite(evaluationInstant.getTime())) {
    throw new CascadeError("calibration evaluation instant is invalid");
  }
  const blockers: string[] = [];
  const metricResults: CorrelationResult[] = [];
  const baseline = input.treatments.find((treatment) => treatment.baseline);
  if (!baseline || !definition.treatment_ids.includes(baseline.id)) {
    blockers.push("calibration treatment set does not include the baseline");
  }
  for (const metricId of definition.metric_ids) {
    const metric = input.metrics.find((item) => item.id === metricId);
    if (!metric) throw new CascadeError(`calibration metric authority is missing: ${metricId}`);
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
      input.simulated_scores,
      metric,
      definition.treatment_ids,
    );
    const referenceValues = aggregateScores(
      input.reference_scores,
      metric,
      definition.treatment_ids,
    );
    const rankCorrelation = pearson(ranks(simulatedValues), ranks(referenceValues));
    const linearCorrelation = pearson(simulatedValues, referenceValues);
    const rows = input.reference_scores.filter((row) => row.metric_id === metricId);
    const missingSlices: string[] = [];
    for (const [source, scoreRows] of [
      ["simulated", input.simulated_scores],
      ["reference", input.reference_scores],
    ] as const) {
      for (const treatmentId of definition.treatment_ids) {
        const presentSlices = new Set(
          scoreRows
            .filter((row) => row.metric_id === metricId && row.treatment_id === treatmentId)
            .map((row) => row.slice),
        );
        for (const slice of requiredSlices) {
          if (!presentSlices.has(slice)) missingSlices.push(`${source}:${treatmentId}:${slice}`);
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
  const judged = input.reference_scores.filter(
    (row) => typeof row.human_label === "number" && typeof row.judge_label === "number",
  );
  const agreement = judged.length
    ? judged.filter((row) => row.human_label === row.judge_label).length / judged.length
    : null;
  const fullyLabelled = input.reference_scores.every(
    (row) => typeof row.human_label === "number" && typeof row.judge_label === "number",
  );
  if (
    !fullyLabelled ||
    agreement === null ||
    agreement < definition.thresholds.minimum_human_agreement
  ) {
    blockers.push("human agreement threshold not satisfied");
  }
  const expires = new Date(definition.reference.reference_window_end);
  expires.setUTCDate(expires.getUTCDate() + definition.staleness_days);
  let status: CalibrationStatus = blockers.length ? "UNCALIBRATED" : "CALIBRATED";
  if (!definition.framework_fixture && evaluationInstant > expires) status = "STALE";
  return {
    schema_version: 1,
    calibration_id: `${input.run_id}-calibration`,
    run_id: input.run_id,
    definition_id: definition.id,
    definition_digest: valueDigest(definition),
    source_kind: definition.reference.kind,
    framework_fixture: definition.framework_fixture,
    reviewer_identity: definition.reference.reviewer_identity,
    reference_label_digest: definition.reference.label_digest,
    simulated_scores_digest: valueDigest(input.simulated_scores),
    reference_scores_digest: valueDigest(input.reference_scores),
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
    invalidation_inputs: input.source_digests,
    aggregator_identity: input.aggregator_identity,
    created_at: input.evaluation_at,
  };
}

export interface MechanicalTaskAuthority {
  task_id: string;
  required: boolean;
  status: "PASS" | "FAIL" | "BLOCKED";
  policy_decisions: Array<{ policy_id: string; decision: string }>;
  oracle_results: Array<{ oracle_id: string; status: "PASS" | "FAIL" }>;
  events: unknown[];
  cleanup: { verified: boolean };
}

export function buildMechanicalEvaluationAuthority(input: {
  claims: readonly ClaimDefinition[];
  task_results: readonly MechanicalTaskAuthority[];
  calibration: CalibrationReceipt | null;
  population_authority: (
    claim: ClaimDefinition,
  ) => { status: ClaimStatus; reason: string; evidence: string[] } | null;
}): MechanicalEvaluation {
  const oracleResults = input.task_results.flatMap((task) => task.oracle_results);
  const policyDecisions = input.task_results.flatMap((task) => task.policy_decisions);
  const metricResults = input.calibration?.metric_results ?? [];
  const claimLedger = input.claims.map((claim) => {
    let projected = input.population_authority(claim);
    const missingOracles = claim.required_oracle_ids.filter(
      (id) => !oracleResults.some((result) => result.oracle_id === id),
    );
    const failedOracles = claim.required_oracle_ids.filter((id) =>
      oracleResults.some((result) => result.oracle_id === id && result.status === "FAIL")
    );
    const missingPolicies = claim.required_policy_ids.filter(
      (id) => !policyDecisions.some((decision) => decision.policy_id === id),
    );
    const deniedPolicies = claim.required_policy_ids.filter((id) =>
      policyDecisions.some((decision) => decision.policy_id === id && decision.decision !== "ALLOW")
    );
    const failedTasks = input.task_results.filter(
      (task) => task.required && task.status !== "PASS",
    );
    const missingMetrics = claim.required_metric_ids.filter(
      (id) => !metricResults.some((result) => result.metric_id === id),
    );
    const failedMetrics = claim.required_metric_ids.filter((id) =>
      metricResults.some((result) => result.metric_id === id && result.status !== "PASS")
    );
    const availableEvidence = new Set([
      "source-manifest",
      "execution-receipt",
      ...(input.task_results.length ? ["task-result"] : []),
      ...(input.task_results.some((task) => task.events.length) ? ["trajectory"] : []),
      ...(policyDecisions.length ? ["policy-decisions"] : []),
      ...(oracleResults.length ? ["oracle"] : []),
      ...(input.task_results.every((task) => task.cleanup.verified) ? ["cleanup"] : []),
      ...(input.calibration ? ["calibration-receipt"] : []),
    ]);
    const missingEvidence = claim.evidence_requirements.filter(
      (requirement) => !availableEvidence.has(requirement),
    );
    if (!projected && missingOracles.length) {
      projected = {
        status: "BLOCKED",
        reason: `required oracle evidence missing: ${missingOracles.join(", ")}`,
        evidence: [],
      };
    } else if (
      !projected &&
      (missingPolicies.length || missingMetrics.length || missingEvidence.length)
    ) {
      projected = {
        status: "BLOCKED",
        reason: [
          missingPolicies.length
            ? `required positive policy evidence missing: ${missingPolicies.join(", ")}`
            : null,
          missingMetrics.length
            ? `required metric evidence missing: ${missingMetrics.join(", ")}`
            : null,
          missingEvidence.length
            ? `required artifacts missing: ${missingEvidence.join(", ")}`
            : null,
        ].filter(Boolean).join("; "),
        evidence: [],
      };
    } else if (!projected && failedTasks.length) {
      projected = {
        status: "UNSUPPORTED",
        reason: `required task failed: ${failedTasks.map((item) => item.task_id).join(", ")}`,
        evidence: failedTasks.map((item) => item.task_id),
      };
    } else if (!projected && (failedOracles.length || deniedPolicies.length || failedMetrics.length)) {
      projected = {
        status: "UNSUPPORTED",
        reason: [
          failedOracles.length ? `failed oracles: ${failedOracles.join(", ")}` : null,
          deniedPolicies.length ? `unsatisfied policies: ${deniedPolicies.join(", ")}` : null,
          failedMetrics.length ? `failed metrics: ${failedMetrics.join(", ")}` : null,
        ].filter(Boolean).join("; "),
        evidence: [...failedOracles, ...deniedPolicies, ...failedMetrics],
      };
    } else if (!projected && claim.requires_calibration) {
      if (!input.calibration) {
        projected = { status: "NOT_RUN", reason: "required calibration receipt is absent", evidence: [] };
      } else if (input.calibration.framework_fixture) {
        projected = {
          status: "NOT_RUN",
          reason: "framework-fixture calibration cannot support target release eligibility",
          evidence: [input.calibration.calibration_id],
        };
      } else if (input.calibration.status !== "CALIBRATED") {
        projected = {
          status: input.calibration.status === "STALE" ? "BLOCKED" : "UNSUPPORTED",
          reason: `required calibration is ${input.calibration.status}`,
          evidence: [input.calibration.calibration_id],
        };
      }
    }
    projected ??= {
      status: "SUPPORTED",
      reason: "all declared non-compensating gates passed",
      evidence: [
        ...claim.required_oracle_ids,
        ...claim.required_policy_ids,
        ...claim.required_metric_ids,
        ...claim.evidence_requirements,
        ...(input.calibration ? [input.calibration.calibration_id] : []),
      ],
    };
    return { claim_id: claim.id, class: claim.class, ...projected };
  });
  return {
    claim_ledger: claimLedger,
    status: (() => {
      const required = claimLedger.filter(
        (claim) => claim.class !== "release-eligibility",
      );
      if (required.every((claim) => claim.status === "SUPPORTED")) return "PASS";
      return required.some((claim) =>
        new Set<ClaimStatus>(["BLOCKED", "NOT_RUN", "INVALID"]).has(claim.status)
      )
        ? "BLOCKED"
        : "FAIL";
    })(),
  };
}
