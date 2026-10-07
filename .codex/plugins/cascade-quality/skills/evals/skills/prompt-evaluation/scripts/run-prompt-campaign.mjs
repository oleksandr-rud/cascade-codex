#!/usr/bin/env node
import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { runCommand, processAbortSignal, positiveTimeout } from "./execution-adapters.mjs";
import { GLOBAL_MODEL_LIMIT, executionHealth, haltExecution, recoverExecution } from "./execution-coordinator.mjs";
import { inspectRun } from "./execution-progress.mjs";
import { resolveSubjectSkill } from "./subject-plugin.mjs";
import { assertDisjointRoots, snapshotSubject, runnerDigest } from "./evaluation-integrity.mjs";

const scripts = dirname(fileURLToPath(import.meta.url));
const value = name => { const i = process.argv.indexOf(`--${name}`); return i < 0 ? undefined : process.argv[i + 1]; };
const json = async path => JSON.parse(await readFile(path, "utf8"));
if (process.argv.includes("--recover-execution")) {
  await recoverExecution(); console.log(JSON.stringify({ execution_health: "RECOVERED", note: "No model invocation was retried." }));
} else if (value("inspect")) {
  const root = resolve(value("inspect"));
  let contract;
  try { contract = await json(join(root, "campaign-contract.json")); }
  catch (e) { if (e.code !== "ENOENT") throw e; }
  console.log(JSON.stringify(contract ? summarize(contract, []) : inspectRun(root), null, 2));
} else {
  const subject = await resolveSubjectSkill({ explicitPath: value("subject-skill-root") });
  const catalog = await json(join(scripts, "../evals/task-catalog.json"));
  const interviews = await json(join(scripts, "../evals/interviews/catalog.json"));
  const coverage = await json(join(scripts, "../evals/rule-coverage.json"));
  const available = [
    ...catalog.tasks.map(task => ({ id: task.id, script: "run-quality-eval.mjs", args: ["run", "--task", task.id, "--execute-judges", "--no-prompt-cache", "--no-trajectory-cache"] })),
    ...interviews.fixtures.map(fixture => ({ id: fixture.id, script: "run-interview-eval.mjs", args: ["run", "--fixture", fixture.id, "--execute-judge", ...(fixture.target ? ["--execute-target"] : [])] })),
    ...coverage.knowledge_inventory.filter(item => item.path.startsWith("references/model-system/")).map(item => ({ id: `knowledge-${item.path.split("/").at(-1).replace(/\.[^.]+$/, "")}`, script: "run-knowledge-audit.mjs", args: ["--reference", item.path] })),
    { id: "judge-challenges", script: "run-judge-challenges.mjs", args: [] }
  ];
  const selected = value("cases")?.split(",") ?? available.map(job => job.id);
  if (new Set(selected).size !== selected.length || selected.some(id => !available.some(job => job.id === id))) throw new Error("unknown or duplicate campaign case");
  const modelOptions = ["model", "prompt-model", "target-model", "judge-model", "reasoning-effort", "judge-reasoning-effort", "configuration-id"];
  if (modelOptions.some(name => value(name)) && selected.some(id => !["run-quality-eval.mjs", "run-interview-eval.mjs"].includes(available.find(job => job.id === id).script))) throw new Error("model overrides require a quality/interview-only campaign");
  const runId = value("run-id") ?? `prompt-campaign-${new Date().toISOString().replace(/[:.]/g, "-")}`;
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(runId)) throw new Error("unsafe campaign run ID");
  const output = resolve(value("output-dir") ?? ".artifacts/prompt-campaigns"), root = join(output, runId);
  assertDisjointRoots(subject, output);
  await mkdir(output, { recursive: true }); await mkdir(root);
  const jobs = selected.map(id => {
    const job = available.find(job => job.id === id);
    const options = ["judge-timeout-ms", "builder-timeout-ms", "turn-timeout-ms", "target-timeout-ms", "reasoning-effort", "judge-reasoning-effort", "judge-model", "target-model",
      ...(job.script === "run-quality-eval.mjs" ? ["prompt-model", "configuration-id"] : ["model"])];
    const args = [...job.args, ...options.filter(name => value(name)).flatMap(name => [`--${name}`, value(name)])];
    return { ...job, args, run_id: `${runId}-${id}`, run_root: join(root, "cases", `${runId}-${id}`) };
  });
  const contract = { schema_version: 1, run_id: runId, run_root: root, requested: jobs.length, concurrency_limit: GLOBAL_MODEL_LIMIT, subject_root: subject, subject_sha256: (await snapshotSubject(subject)).sha256, runner_bundle_sha256: await runnerDigest(scripts), jobs };
  await writeFile(join(root, "campaign-contract.json"), JSON.stringify(contract, null, 2), { flag: "wx" });
  const results = [], signal = processAbortSignal(); let next = 0;
  let checkpointChain = Promise.resolve();
  const checkpoint = () => checkpointChain = checkpointChain.then(async () => { const path = join(root, `.campaign-${randomUUID()}.tmp`); await writeFile(path, JSON.stringify(summarize(contract, results), null, 2)); await rename(path, join(root, "campaign-progress.json")); });
  await checkpoint();
  async function worker() {
    while (next < jobs.length && !signal.aborted && !await executionHealth()) {
      const job = jobs[next++];
      const args = [join(scripts, job.script), ...job.args, "--subject-skill-root", subject, "--output-dir", join(root, "cases"), "--run-id", job.run_id];
      const result = await runCommand({ command: process.execPath, args, input: "", timeoutMs: positiveTimeout(value("case-timeout-ms"), 3_600_000, "--case-timeout-ms"), signal, terminationGraceMs: 2000, acceptedExitCodes: [0, 2, 3] });
      await writeFile(join(root, `${job.id}.stdout.log`), result.stdout);
      await writeFile(join(root, `${job.id}.stderr.log`), result.stderr);
      results.push({ case_id: job.id, exit_code: result.exit_status, execution_status: result.status });
      // Ordinary rejection, invalid judgment and bounded timeout are expected exits.
      // An unexpected child exit must stop this and other overlapping campaigns.
      if (result.status !== "COMPLETED" || ![0, 2, 3].includes(result.exit_status)) await haltExecution(`campaign child ${job.id} ended unexpectedly (${result.status}, exit ${result.exit_status}); inspect its declared run directory`);
      await checkpoint();
    }
  }
  await Promise.all(Array.from({ length: Math.min(GLOBAL_MODEL_LIMIT, jobs.length) }, worker));
  const summary = summarize(contract, results);
  await writeFile(join(root, "campaign-results.json"), JSON.stringify(summary, null, 2), { flag: "wx" });
  console.log(JSON.stringify(summary, null, 2));
  if (summary.status !== "COMPLETE") process.exitCode = 3;
  else if (summary.acceptance_counts.REJECTED) process.exitCode = 2;
}

function summarize(contract, results) {
  const records = contract.jobs.map(job => ({ case_id: job.id, ...results.find(r => r.case_id === job.id), ...inspectRun(job.run_root) }));
  const counts = {};
  for (const record of records) counts[record.acceptance] = (counts[record.acceptance] ?? 0) + 1;
  const completed = records.filter(r => ["ACCEPTED", "REJECTED"].includes(r.acceptance)).length;
  return { schema_version: 1, run_id: contract.run_id, run_root: contract.run_root, requested: contract.requested, jobs_finished: results.length, evaluations_completed: completed, status: completed === contract.requested ? "COMPLETE" : "PARTIAL", acceptance_counts: counts, records };
}
