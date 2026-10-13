import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { readJson, rootPath, type JsonSchema } from "./common";
import { parseWorkTask, readWorkTasks, nextWorkTaskId, type WorkTask } from "./work-tasks";
import { stringifyYaml } from "./structured-data";

const schemaPath = rootPath("docs/work/task.schema.json");
const schema = await readJson<JsonSchema>(schemaPath);
const directories: string[] = [];
const base: WorkTask = {
  schema_version: 1, task_id: "T-001", title: "Synthetic task", status: "IN_PROGRESS",
  owner: "test-owner", product_task: null, updated_at: "2026-10-02", next_action: "Run the focused check",
  validation: [{ check: "Focused contract", required: true, result: "NOT_RUN", detail: "Not executed" }],
};
const markdown = (task: WorkTask, body = "ready, complete, passed; готово, завершено") =>
  `---\n${stringifyYaml(task)}---\n\n${body}\n`;

afterEach(async () => {
  for (const directory of directories.splice(0)) await rm(directory, { recursive: true, force: true });
});

describe("numbered Work task contracts", () => {
  test("free text in either language cannot establish status or evidence", () => {
    const task = parseWorkTask(markdown(base), schema);
    expect(task.status).toBe("IN_PROGRESS");
    expect(task.validation[0]!.result).toBe("NOT_RUN");
    expect(() => parseWorkTask(markdown({ ...base, status: "ready" as any }), schema)).toThrow();
  });

  test("completion requires all required checks; optional NOT_RUN stays honest", () => {
    const complete = { ...base, status: "COMPLETE" as const, next_action: null };
    for (const result of ["NOT_RUN", "BLOCKED", "FAIL"] as const) {
      expect(() => parseWorkTask(markdown({ ...complete, validation: [{ ...base.validation[0]!, result }] }), schema)).toThrow("COMPLETE requires");
    }
    expect(() => parseWorkTask(markdown({ ...complete, validation: [] }), schema)).toThrow();
    const task = parseWorkTask(markdown({ ...complete, validation: [
      { ...base.validation[0]!, result: "PASS" },
      { check: "Live model evaluation", required: false, result: "NOT_RUN", detail: "Outside this change's evidence scope" },
    ] }), schema);
    expect(task.validation[1]!.result).toBe("NOT_RUN");
  });

  test("real product task references are carried exactly and require identity and source", () => {
    const product_task = { id: "TRACKER-123", reference: "https://tracker.example.test/tasks/123" };
    expect(parseWorkTask(markdown({ ...base, product_task }), schema).product_task).toEqual(product_task);
    expect(() => parseWorkTask(markdown({ ...base, product_task: { id: "TRACKER-123" } as any }), schema)).toThrow();
  });

  test("malformed metadata, duplicate YAML keys and missing handoffs fail", () => {
    expect(() => parseWorkTask("# No metadata", schema)).toThrow("frontmatter");
    expect(() => parseWorkTask(markdown(base).replace("status: IN_PROGRESS", "status: IN_PROGRESS\nstatus: COMPLETE"), schema)).toThrow();
    expect(() => parseWorkTask(markdown({ ...base, next_action: null }), schema)).toThrow("next_action");
    expect(() => parseWorkTask(markdown({ ...base, task_id: "T-000" }), schema)).toThrow();
    expect(() => parseWorkTask(markdown({ ...base, updated_at: "2026-02-30" }), schema)).toThrow();
  });

  test("an empty task directory is valid; missing roots, duplicate IDs and nested products fail", async () => {
    const directory = await mkdtemp(rootPath(".artifacts/work-test-"));
    directories.push(directory);
    expect(await readWorkTasks(directory, schemaPath)).toEqual([]);
    expect(nextWorkTaskId([])).toBe("T-001");
    await expect(readWorkTasks(resolve(directory, "missing"), schemaPath)).rejects.toThrow();
    await writeFile(resolve(directory, "T-001.md"), markdown(base));
    await writeFile(resolve(directory, "T-002.md"), markdown({ ...base, task_id: "T-002" }));
    expect(nextWorkTaskId(await readWorkTasks(directory, schemaPath))).toBe("T-003");
    await writeFile(resolve(directory, "T-003.md"), markdown(base));
    await expect(readWorkTasks(directory, schemaPath)).rejects.toThrow("duplicate Work task ID");
    await rm(resolve(directory, "T-003.md"));
    await mkdir(resolve(directory, "invented-product"));
    await expect(readWorkTasks(directory, schemaPath)).rejects.toThrow("flat Markdown");
  });

  test("task identity must match its filename", async () => {
    const directory = await mkdtemp(rootPath(".artifacts/work-test-"));
    directories.push(directory);
    await writeFile(resolve(directory, "T-002.md"), markdown(base));
    await expect(readWorkTasks(directory, schemaPath)).rejects.toThrow("filename must be T-001.md");
  });
});
