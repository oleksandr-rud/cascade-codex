import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import {
  CascadeError,
  ROOT,
  exists,
  flag,
  isFile,
  parseArgs,
  readJson,
  rel,
  rootPath,
  runCommand,
  sha256File,
  utcNow,
  walkFiles,
  writeJson,
} from "./common";

type TaskKind = "command" | "browser" | "agent-response";
type TaskStatus = "PASS" | "FAIL" | "BLOCKED" | "NOT_RUN";

interface CampaignTask {
  id: string;
  kind: TaskKind;
  command: string[];
  cwd?: string;
  required?: boolean;
  timeout_ms?: number;
  expected_exit_code?: number;
  inputs?: string[];
  evidence?: string[];
  environment?: Record<string, string>;
  source?: string;
}

interface CampaignTaskReference {
  task_file: string;
}

interface Campaign {
  schema_version: 1;
  id: string;
  title: string;
  purpose: string;
  mode: "deterministic" | "agent";
  tasks: CampaignTask[];
}

type CampaignDocument = Omit<Campaign, "tasks"> & {
  tasks: Array<CampaignTask | CampaignTaskReference>;
};

const CAMPAIGN_ROOT = rootPath("evals/campaigns");
const ARTIFACT_ROOT = rootPath(".artifacts/campaigns");

async function campaignPaths(): Promise<string[]> {
  return (await walkFiles(CAMPAIGN_ROOT, {
    include: (path) => path.endsWith(".json") && !path.endsWith("schema.json"),
  })).sort();
}

async function resolveCampaign(value: string): Promise<string> {
  const direct = resolve(ROOT, value);
  if (await isFile(direct)) return direct;
  const byId = resolve(CAMPAIGN_ROOT, `${value}.json`);
  if (await isFile(byId)) return byId;
  throw new CascadeError(`campaign not found: ${value}`);
}

function validateTask(task: CampaignTask, label: string, errors: string[]): void {
  if (!task.id || !/^[A-Z0-9][A-Z0-9-]+$/.test(task.id)) {
    errors.push(`${label}.id must be a stable uppercase identifier`);
  }
  if (!["command", "browser", "agent-response"].includes(task.kind)) {
    errors.push(`${label}.kind is invalid`);
  }
  if (!Array.isArray(task.command) || !task.command.length) {
    errors.push(`${label}.command must be a non-empty argv array`);
  }
  if (task.command?.some((item) => typeof item !== "string" || !item)) {
    errors.push(`${label}.command entries must be non-empty strings`);
  }
  if (task.timeout_ms !== undefined && task.timeout_ms < 1) {
    errors.push(`${label}.timeout_ms must be positive`);
  }
  if (task.inputs?.some((item) => typeof item !== "string" || !item)) {
    errors.push(`${label}.inputs entries must be non-empty strings`);
  }
}

async function validateCampaign(value: unknown, path: string): Promise<Campaign> {
  const errors: string[] = [];
  const data = value as Partial<CampaignDocument>;
  if (!data || typeof data !== "object") errors.push("document must be an object");
  if (data.schema_version !== 1) errors.push("schema_version must be 1");
  if (!data.id || !/^[a-z0-9][a-z0-9.-]+$/.test(data.id)) {
    errors.push("id must be a stable lowercase identifier");
  }
  if (!data.title) errors.push("title is required");
  if (!data.purpose) errors.push("purpose is required");
  if (!["deterministic", "agent"].includes(data.mode ?? "")) {
    errors.push("mode must be deterministic or agent");
  }
  if (!Array.isArray(data.tasks) || data.tasks.length === 0) {
    errors.push("tasks must be a non-empty array");
  }
  const ids = new Set<string>();
  const resolvedTasks: CampaignTask[] = [];
  for (const [index, entry] of (data.tasks ?? []).entries()) {
    const label = `tasks[${index}]`;
    let task: CampaignTask;
    if ("task_file" in entry) {
      if (
        typeof entry.task_file !== "string" ||
        !entry.task_file.startsWith("evals/tasks/") ||
        !entry.task_file.endsWith(".json")
      ) {
        errors.push(`${label}.task_file must reference evals/tasks/*.json`);
        continue;
      }
      const taskPath = rootPath(entry.task_file);
      if (!(await isFile(taskPath))) {
        errors.push(`${label}.task_file does not exist: ${entry.task_file}`);
        continue;
      }
      task = {
        ...(await readJson<CampaignTask>(taskPath)),
        source: entry.task_file,
      };
    } else {
      task = entry as CampaignTask;
    }
    validateTask(task, label, errors);
    if (ids.has(task.id)) errors.push(`duplicate task id: ${task.id}`);
    else ids.add(task.id);
    resolvedTasks.push(task);
  }
  if (errors.length) {
    throw new CascadeError(
      `invalid campaign ${rel(path)}:\n${errors.map((item) => `- ${item}`).join("\n")}`,
    );
  }
  return { ...(data as CampaignDocument), tasks: resolvedTasks };
}

async function loadCampaign(path: string): Promise<Campaign> {
  return await validateCampaign(await readJson(path), path);
}

async function preflightTask(task: CampaignTask): Promise<string[]> {
  const blockers: string[] = [];
  const cwd = resolve(ROOT, task.cwd ?? ".");
  if (!(await exists(cwd))) blockers.push(`cwd does not exist: ${rel(cwd)}`);
  if (task.kind === "browser") {
    const packagePath = rootPath(
      ".codex/harness-tooling/node_modules/@playwright/test/package.json",
    );
    if (!(await isFile(packagePath))) {
      blockers.push(
        "Playwright is not installed; run `bun install --cwd .codex/harness-tooling --frozen-lockfile`",
      );
    }
  }
  for (const input of task.inputs ?? []) {
    const path = resolve(ROOT, input);
    if (!path.startsWith(`${ROOT}/`) || !(await isFile(path))) {
      blockers.push(`task input missing or unbounded: ${input}`);
    }
  }
  return blockers;
}

async function executeTask(
  task: CampaignTask,
  taskRoot: string,
): Promise<Record<string, unknown>> {
  const blockers = await preflightTask(task);
  if (blockers.length) {
    return {
      task_id: task.id,
      kind: task.kind,
      required: task.required !== false,
      status: "BLOCKED" satisfies TaskStatus,
      blockers,
      command: task.command,
      evidence: [],
    };
  }
  for (const evidence of task.evidence ?? []) {
    await mkdir(dirname(resolve(ROOT, evidence)), { recursive: true });
  }
  const result = await runCommand(task.command, {
    cwd: resolve(ROOT, task.cwd ?? "."),
    env: task.environment,
    timeoutMs: task.timeout_ms ?? 180_000,
  });
  await mkdir(taskRoot, { recursive: true });
  await Promise.all([
    writeFile(resolve(taskRoot, "stdout.log"), result.stdout, "utf8"),
    writeFile(resolve(taskRoot, "stderr.log"), result.stderr, "utf8"),
    writeJson(resolve(taskRoot, "command.json"), {
      argv: task.command,
      cwd: task.cwd ?? ".",
      timeout_ms: task.timeout_ms ?? 180_000,
    }),
  ]);
  const expectedExit = task.expected_exit_code ?? 0;
  const evidence: Record<string, unknown>[] = [];
  for (const path of task.evidence ?? []) {
    const absolute = resolve(ROOT, path);
    if (await isFile(absolute)) {
      evidence.push({ path, sha256: await sha256File(absolute) });
    } else {
      evidence.push({ path, missing: true });
    }
  }
  const missingEvidence = evidence.filter((item) => item.missing);
  const passed =
    !result.timedOut &&
    result.exitCode === expectedExit &&
    missingEvidence.length === 0;
  return {
    task_id: task.id,
    kind: task.kind,
    required: task.required !== false,
    status: (passed ? "PASS" : "FAIL") satisfies TaskStatus,
    command: task.command,
    exit_code: result.exitCode,
    expected_exit_code: expectedExit,
    duration_ms: result.durationMs,
    timed_out: result.timedOut,
    blockers: [],
    evidence,
  };
}

async function commandList(): Promise<number> {
  for (const path of await campaignPaths()) {
    const campaign = await loadCampaign(path);
    console.log(
      `${campaign.id}\t${campaign.mode}\t${campaign.tasks.length}\t${campaign.title}`,
    );
  }
  return 0;
}

async function commandValidate(value: string): Promise<number> {
  const path = await resolveCampaign(value);
  const campaign = await loadCampaign(path);
  const blockers = (
    await Promise.all(campaign.tasks.map((task) => preflightTask(task)))
  ).flat();
  if (blockers.length) {
    for (const blocker of blockers) console.error(`BLOCKED: ${blocker}`);
    console.log(
      `campaign_validation_status=BLOCKED campaign=${campaign.id} blockers=${blockers.length}`,
    );
    return 2;
  }
  console.log(
    `campaign_validation_status=PASS campaign=${campaign.id} tasks=${campaign.tasks.length}`,
  );
  return 0;
}

async function commandRun(value: string, argv: string[]): Promise<number> {
  const args = parseArgs(argv);
  const path = await resolveCampaign(value);
  const campaign = await loadCampaign(path);
  const runId =
    flag(args, "run-id") ??
    `${campaign.id}-${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}`;
  const runRoot = resolve(ARTIFACT_ROOT, runId);
  if (await exists(runRoot)) throw new CascadeError(`run already exists: ${rel(runRoot)}`);
  await mkdir(runRoot, { recursive: true });
  const manifestDigest = await sha256File(path);
  const sourcePaths = [
    ...new Set(
      campaign.tasks.flatMap((task) => [
        ...(task.source ? [task.source] : []),
        ...(task.inputs ?? []),
      ]),
    ),
  ].sort();
  const taskSources = await Promise.all(
    sourcePaths.map(async (sourcePath) => ({
      path: sourcePath,
      sha256: await sha256File(rootPath(sourcePath)),
    })),
  );
  await writeJson(resolve(runRoot, "run.json"), {
    schema_version: 1,
    run_id: runId,
    campaign_id: campaign.id,
    campaign_path: rel(path),
    campaign_digest: manifestDigest,
    task_sources: taskSources,
    started_at: utcNow(),
    mode: campaign.mode,
    task_ids: campaign.tasks.map((task) => task.id),
  });
  const results: Record<string, unknown>[] = [];
  for (const task of campaign.tasks) {
    console.log(`[${results.length + 1}/${campaign.tasks.length}] ${task.id}`);
    results.push(
      await executeTask(task, resolve(runRoot, "tasks", task.id)),
    );
  }
  const requiredFailures = results.filter(
    (item) => item.required === true && item.status !== "PASS",
  );
  const summary = {
    schema_version: 1,
    run_id: runId,
    campaign_id: campaign.id,
    status: requiredFailures.length ? "FAIL" : "PASS",
    completed_at: utcNow(),
    counts: {
      total: results.length,
      pass: results.filter((item) => item.status === "PASS").length,
      fail: results.filter((item) => item.status === "FAIL").length,
      blocked: results.filter((item) => item.status === "BLOCKED").length,
    },
    results,
  };
  await writeJson(resolve(runRoot, "summary.json"), summary);
  console.log(
    `campaign_status=${summary.status} campaign=${campaign.id} run=${runId} ` +
      `pass=${summary.counts.pass}/${summary.counts.total} output=${rel(runRoot)}`,
  );
  return requiredFailures.length ? 1 : 0;
}

export async function main(argv: string[]): Promise<number> {
  const [command, value, ...rest] = argv;
  if (command === "list") return commandList();
  if (command === "validate" && value) return commandValidate(value);
  if (command === "run" && value) return commandRun(value, rest);
  console.log(`Usage:
  bun scripts/cascade.ts campaign list
  bun scripts/cascade.ts campaign validate <campaign-id-or-path>
  bun scripts/cascade.ts campaign run <campaign-id-or-path> [--run-id ID]
`);
  return command ? 1 : 0;
}
