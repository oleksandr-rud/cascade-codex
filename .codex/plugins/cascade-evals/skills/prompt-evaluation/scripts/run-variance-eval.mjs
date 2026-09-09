#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { processAbortSignal, positiveTimeout, runCommand } from "./execution-adapters.mjs";

const defaultRunner = join(dirname(fileURLToPath(import.meta.url)), "run-quality-eval.mjs");
const values = process.argv.slice(2);
function value(name, fallback) {
  const index = values.indexOf(`--${name}`);
  return index >= 0 ? values[index + 1] : fallback;
}
const repetitions = Number(value("repetitions", "3"));
if (!Number.isInteger(repetitions) || repetitions < 2 || repetitions > 20) throw new Error("--repetitions must be an integer from 2 to 20");
const task = value("task");
if (!task) throw new Error("--task is required");
const outputRoot = resolve(value("output-dir", join(process.cwd(), ".artifacts/prompt-variance")));
const runner = resolve(value("runner", defaultRunner));
await mkdir(outputRoot, { recursive: true });
const omitted = new Set(["repetitions", "output-dir", "aggregate-id", "runner", "repetition-timeout-ms"]);
const forwarded = [];
for (let index = 0; index < values.length; index += 1) {
  const raw = values[index];
  if (!raw.startsWith("--")) continue;
  const key = raw.slice(2);
  const next = values[index + 1];
  if (omitted.has(key)) { if (next && !next.startsWith("--")) index += 1; continue; }
  forwarded.push(raw);
  if (next && !next.startsWith("--")) { forwarded.push(next); index += 1; }
}
const aggregateId = value("aggregate-id", `${task}-variance-${new Date().toISOString().replace(/[:.]/g, "-")}`);
const records = [];
const signal = processAbortSignal();
const timeoutMs = positiveTimeout(value("repetition-timeout-ms"), 3_600_000, "repetition-timeout-ms");
for (let index = 0; index < repetitions; index += 1) {
  if (signal.aborted) break;
  const runId = `${aggregateId}-r${String(index + 1).padStart(2, "0")}`;
  const result = await runCommand({ command: process.execPath, args: [runner, "run", ...forwarded, "--output-dir", outputRoot, "--run-id", runId], input: "", timeoutMs, signal, terminationGraceMs: 2000 });
  await writeFile(join(outputRoot, `${runId}.stdout.log`), result.stdout);
  await writeFile(join(outputRoot, `${runId}.stderr.log`), result.stderr);
  let receipt = {};
  try { receipt = JSON.parse(result.stdout || "{}"); } catch { receipt = { stdout: result.stdout }; }
  const root = receipt.run_root ?? join(outputRoot, runId);
  let summary = null;
  for (const file of ["run-summary.json", "execution-block.json"]) {
    try { summary = JSON.parse(await readFile(join(root, file), "utf8")); break; } catch { /* try next artifact */ }
  }
  records.push({ repetition: index + 1, run_id: runId, exit_status: result.exit_status, execution_status: result.status, run_root: root, summary });
}
const completed = records.filter((record) => [0, 2].includes(record.exit_status) && record.summary?.acceptance && record.summary.acceptance !== "NOT_RUN");
const scores = completed.map((record) => record.summary?.judges?.conservative_effectiveness_score).filter(Number.isFinite);
const mean = scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : null;
const stddev = scores.length ? Math.sqrt(scores.reduce((sum, score) => sum + (score - mean) ** 2, 0) / scores.length) : null;
const acceptances = records.map((record) => record.summary?.acceptance ?? "MISSING");
const judgeVerdicts = records.flatMap((record) => [record.summary?.judges?.outcome?.harness_verdict, record.summary?.judges?.trajectory?.harness_verdict]).filter(Boolean);
const aggregate = {
  schema_version: 2,
  aggregate_id: aggregateId,
  task_id: task,
  repetitions_requested: repetitions,
  repetitions_completed: completed.length,
  status: signal.aborted || records.length !== repetitions || records.some((record) => ![0, 2].includes(record.exit_status) || record.summary?.status === "BLOCKED" || !record.summary) ? "PARTIAL" : "COMPLETE",
  cancelled: signal.aborted,
  acceptance_counts: Object.fromEntries([...new Set(acceptances)].map((status) => [status, acceptances.filter((value) => value === status).length])),
  acceptance_rate: completed.length ? completed.filter((record) => record.summary.acceptance === "ACCEPTED").length / completed.length : null,
  conservative_score: { count: scores.length, mean, minimum: scores.length ? Math.min(...scores) : null, maximum: scores.length ? Math.max(...scores) : null, standard_deviation: stddev },
  judge_disagreement: new Set(judgeVerdicts).size > 1,
  flaky: new Set(acceptances.filter((status) => !["NOT_RUN", "MISSING"].includes(status))).size > 1 || new Set(judgeVerdicts).size > 1,
  runs: records.map(({ repetition, run_id, exit_status, execution_status, run_root, summary }) => ({ repetition, run_id, exit_status, execution_status, run_root, acceptance: summary?.acceptance ?? null, mechanical_status: summary?.mechanical?.status ?? null, conservative_effectiveness_score: summary?.judges?.conservative_effectiveness_score ?? null }))
};
const aggregatePath = join(outputRoot, `${aggregateId}.aggregate.json`);
await writeFile(aggregatePath, `${JSON.stringify(aggregate, null, 2)}\n`);
console.log(JSON.stringify({ aggregate_path: aggregatePath, ...aggregate }, null, 2));
if (aggregate.status !== "COMPLETE") process.exitCode = 3;
else if (aggregate.flaky || aggregate.acceptance_rate < 1) process.exitCode = 2;
