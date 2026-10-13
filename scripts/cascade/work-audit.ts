import { existsSync } from "node:fs";

import {
  CascadeError,
  boolFlag,
  flag,
  parseArgs,
  rel,
  rootPath,
  sha256File,
  sha256Text,
  stableJson,
} from "./common";
import { nextWorkTaskId, readWorkTasks } from "./work-tasks";

export async function buildWorkAudit() {
  const records = await readWorkTasks();
  const tasks = records.map(({ task, path, sha256 }) => ({ ...task, path: rel(path), sha256 }));
  const queue = tasks.filter((task) => !["COMPLETE", "CANCELLED"].includes(task.status));
  const count = (status: string) => tasks.filter((task) => task.status === status).length;
  return {
    schema_version: 2,
    source: {
      path: "docs/work/tasks",
      sha256: sha256Text(tasks.map((task) => `${task.path}\0${task.sha256}\n`).join("")),
      schema_sha256: await sha256File(rootPath("docs/work/task.schema.json")),
    },
    authority: {
      mode: "READ_ONLY_ANALYSIS",
      may_dispatch: false,
      may_mutate_work_state: false,
      may_run_external_actions: false,
    },
    summary: {
      total_tasks: tasks.length,
      active_tasks: queue.length,
      planned: count("PLANNED"),
      ready: count("READY"),
      in_progress: count("IN_PROGRESS"),
      review_pending: count("IN_REVIEW"),
      blocked: count("BLOCKED"),
      complete: count("COMPLETE"),
      cancelled: count("CANCELLED"),
    },
    next_task_id: nextWorkTaskId(records),
    queue,
    tasks,
  };
}

export type WorkAutomationMode = "audit" | "orchestrate";

export function automationPrompt(mode: WorkAutomationMode = "audit"): string {
  const command = existsSync(rootPath("scripts/cascade.ts")) ? "scripts/cascade.ts" : ".codex/runtime/cascade.js";
  const common = `Work in ${rootPath()}.

Run \`npx --offline --yes bun@1.3.3 ${command} work audit --json --check\`. Read AGENTS.md, CODEX.md, docs/work/_index.md and only the numbered task records relevant to the current request. Status comes from validated task metadata; do not infer readiness, permission or quality from keywords or prose. Use the real product/tracker task reference when present. The audit is read-only and grants no authority.`;
  if (mode === "audit") return `${common}

Report only material changes, their exact source, blockers and the smallest next action. Do not edit task records, dispatch agents, create tasks, commit, push or run external actions. Stay quiet when the state is unchanged or no action is needed.`;
  return `${common}

Continue at most one coherent slice of the current task's already-authorized local work. Preserve ownership, scope, dependencies and validation requirements. Update the same numbered task record only when current evidence supports the change. Do not self-accept an independent review gate.

Do not create agents, chats, branches, worktrees, commits or external tracker changes. Do not run provider-backed, destructive or externally mutating actions. If the next action needs new authority or a missing independent decision, report the blocker. Stay quiet when nothing changed; otherwise report the selected task ID, changes, checks and next action.`;
}

function renderText(report: Awaited<ReturnType<typeof buildWorkAudit>>): string {
  return [
    "Cascade Work audit (read-only)",
    `Summary: ${report.summary.total_tasks} tasks; ${report.summary.active_tasks} active; ${report.summary.complete} complete; ${report.summary.blocked} blocked`,
    `Next internal ID: ${report.next_task_id} (not reserved)`,
    ...report.queue.map((task) => `- ${task.task_id} [${task.status}] ${task.title} -> ${task.next_action}`),
    "Authority: analysis only; no mutation, dispatch or external action occurred.",
  ].join("\n");
}

export async function main(argv: string[]): Promise<number> {
  const args = parseArgs(argv);
  const [command = "audit", ...extra] = args.positionals;
  if (extra.length) throw new CascadeError(`unexpected work arguments: ${extra.join(" ")}`);
  if (command === "automation-prompt") {
    const mode = flag(args, "mode", "audit");
    if (mode !== "audit" && mode !== "orchestrate") throw new CascadeError(`invalid work automation mode: ${mode}`);
    console.log(automationPrompt(mode));
    return 0;
  }
  if (command !== "audit") throw new CascadeError(`unknown work command: ${command}`);
  const report = await buildWorkAudit();
  console.log(boolFlag(args, "json") ? stableJson(report, true) : renderText(report));
  return 0;
}
