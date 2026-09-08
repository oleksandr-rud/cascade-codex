import { CascadeError } from "../../common";
import type { TaskAdapter } from "../task-adapter";
import type { DriverType, TaskDefinition } from "../../simulation-definitions";
import { agentCascadeTaskAdapter, agentCodexTaskAdapter, agentFixtureTaskAdapter } from "./agent";
import { playwrightTaskAdapter } from "./browser";
import { fakeTaskAdapter } from "./fake";
import { httpTaskAdapter } from "./http";
import { desktopPlatformTaskAdapter, mobilePlatformTaskAdapter } from "./platform";
import { directProcessTaskAdapter } from "./process";
import { ptyTaskAdapter } from "./terminal";

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

export const DEFAULT_ADAPTER_IDS: Partial<Record<DriverType, string>> = {
  fake: "builtin-fake",
  "direct-process": "builtin-direct-process",
  pty: "builtin-pty",
  "http-client": "builtin-http-client",
  playwright: "builtin-playwright",
  "platform-automation": "builtin-platform-automation",
};

export function taskAdapterKey(task: TaskDefinition): string {
  const adapterId = task.driver.adapter ?? DEFAULT_ADAPTER_IDS[task.driver.type];
  return `${task.driver.type}:${adapterId ?? "unsupported"}`;
}

export function selectTaskAdapter(
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
