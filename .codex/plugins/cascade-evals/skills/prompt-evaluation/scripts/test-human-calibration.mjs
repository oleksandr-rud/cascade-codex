#!/usr/bin/env node

import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const root = await mkdtemp(join(tmpdir(), "cascade-prompt-calibration-test-"));
const runner = join(fileURLToPath(new URL(".", import.meta.url)), "run-human-calibration.mjs");
const labelsPath = join(root, "labels.json");
const judgedPath = join(root, "judged.json");
const reportPath = join(root, "report.json");
const ratings = { correctness: 4, grounding: 3 };
await writeFile(labelsPath, JSON.stringify({ schema_version: 1, calibration_status: "HUMAN_LABELED", profile_id: "fixture-v1", reviewers: ["r1", "r2"], cases: [{ case_id: "c1", artifact_path: "/frozen/c1", independent_labels: [{ reviewer_id: "r1", verdict: "PASS", ratings }, { reviewer_id: "r2", verdict: "FAIL", ratings: { correctness: 3, grounding: 3 } }], adjudicated: { reviewer_id: "adjudicator", verdict: "PASS", ratings } }] }));
await writeFile(judgedPath, JSON.stringify({ cases: [{ case_id: "c1", verdict: "PASS", ratings: { correctness: 4, grounding: 2 } }] }));
const result = spawnSync(process.execPath, [runner, "evaluate", "--labels", labelsPath, "--judge-results", judgedPath, "--output", reportPath], { encoding: "utf8" });
if (result.status !== 0) throw new Error(result.stderr);
const report = JSON.parse(await readFile(reportPath, "utf8"));
if (report.verdict_agreement !== 1 || report.mean_absolute_rating_error !== 0.5 || report.calibration_status !== "MEASURED_NOT_PROMOTED") throw new Error(JSON.stringify(report));
console.log(`PASS: dual-review human calibration metrics remain shadow-only (${root})`);
