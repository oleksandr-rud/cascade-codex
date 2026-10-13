import { readdir } from "node:fs/promises";
import { basename, resolve } from "node:path";

import {
  CascadeError,
  assertJsonSchema,
  readBoundedRegularFile,
  readJson,
  rootPath,
  sha256Text,
  type JsonSchema,
} from "./common";
import { parseStrictYaml } from "./structured-data";

export interface WorkTask {
  schema_version: 1;
  task_id: string;
  title: string;
  status: "PLANNED" | "READY" | "IN_PROGRESS" | "IN_REVIEW" | "BLOCKED" | "COMPLETE" | "CANCELLED";
  owner: string;
  product_task: { id: string; reference: string } | null;
  updated_at: string;
  next_action: string | null;
  validation: Array<{
    check: string;
    required: boolean;
    result: "PASS" | "FAIL" | "BLOCKED" | "NOT_RUN" | "NOT_APPLICABLE";
    detail: string;
  }>;
}

export interface WorkTaskRecord {
  task: WorkTask;
  path: string;
  sha256: string;
}

export function parseWorkTask(markdown: string, schema: JsonSchema, label = "Work task"): WorkTask {
  const text = markdown.replaceAll("\r\n", "\n");
  if (!text.startsWith("---\n")) throw new CascadeError(`${label}: YAML frontmatter is required`);
  const end = text.indexOf("\n---\n", 4);
  if (end < 0) throw new CascadeError(`${label}: YAML frontmatter is not closed`);
  const task = parseStrictYaml<WorkTask>(text.slice(4, end), label);
  assertJsonSchema(task, schema, label);
  const updatedAt = new Date(`${task.updated_at}T00:00:00Z`);
  if (!Number.isFinite(updatedAt.getTime()) || updatedAt.toISOString().slice(0, 10) !== task.updated_at) {
    throw new CascadeError(`${label}: updated_at must be a real YYYY-MM-DD date`);
  }
  if (task.status === "COMPLETE") {
    const required = task.validation.filter((check) => check.required);
    if (!required.length || required.some((check) => !["PASS", "NOT_APPLICABLE"].includes(check.result))) {
      throw new CascadeError(`${label}: COMPLETE requires recorded results for every required check`);
    }
    if (task.next_action !== null) throw new CascadeError(`${label}: COMPLETE must have next_action: null`);
  } else if (task.status !== "CANCELLED" && task.next_action === null) {
    throw new CascadeError(`${label}: active work requires an explicit next_action`);
  }
  return task;
}

export async function readWorkTasks(
  directory = rootPath("docs/work/tasks"),
  schemaPath = rootPath("docs/work/task.schema.json"),
): Promise<WorkTaskRecord[]> {
  const schema = await readJson<JsonSchema>(schemaPath);
  const entries = await readdir(directory, { withFileTypes: true });
  const records: WorkTaskRecord[] = [];
  const ids = new Set<string>();
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    if (entry.name === ".gitkeep" || entry.name === ".DS_Store") continue;
    if (!entry.isFile() || !entry.name.endsWith(".md")) {
      throw new CascadeError(`Work tasks must be flat Markdown records: ${entry.name}`);
    }
    const path = resolve(directory, entry.name);
    const bytes = await readBoundedRegularFile(path, path, { maxBytes: 64 * 1024 });
    let markdown: string;
    try { markdown = new TextDecoder("utf-8", { fatal: true }).decode(bytes); }
    catch { throw new CascadeError(`${path}: Work task must be valid UTF-8`); }
    const task = parseWorkTask(markdown, schema, path);
    if (ids.has(task.task_id)) throw new CascadeError(`duplicate Work task ID: ${task.task_id}`);
    ids.add(task.task_id);
    if (basename(path) !== `${task.task_id}.md`) {
      throw new CascadeError(`${path}: filename must be ${task.task_id}.md`);
    }
    records.push({ task, path, sha256: sha256Text(markdown) });
  }
  return records.sort((left, right) => Number(left.task.task_id.slice(2)) - Number(right.task.task_id.slice(2)));
}

export function nextWorkTaskId(records: WorkTaskRecord[]): string {
  const maximum = Math.max(0, ...records.map(({ task }) => Number(task.task_id.slice(2))));
  if (maximum >= 999_999_999) throw new CascadeError("Work task ID range exhausted");
  return `T-${String(maximum + 1).padStart(3, "0")}`;
}
