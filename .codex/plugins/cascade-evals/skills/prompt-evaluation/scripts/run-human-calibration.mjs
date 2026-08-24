#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const skillRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const values = process.argv.slice(2);
const command = values[0] ?? "status";
function arg(name) { const index = values.indexOf(`--${name}`); return index >= 0 ? values[index + 1] : undefined; }
const templatePath = join(skillRoot, "evals/judges/human-labels.template.json");
if (command === "status") {
  const template = JSON.parse(await readFile(templatePath, "utf8"));
  console.log(JSON.stringify({ calibration_status: template.calibration_status, human_cases: template.cases.length, next_step: "Collect two independent labels and one adjudicated label per frozen artifact." }, null, 2));
  process.exit(0);
}
if (command === "prepare") {
  const output = resolve(arg("output") ?? join(process.cwd(), "human-labels.json"));
  await writeFile(output, await readFile(templatePath, "utf8"));
  console.log(JSON.stringify({ calibration_status: "NOT_RUN", packet: output }, null, 2));
  process.exit(0);
}
if (command !== "evaluate") throw new Error(`unknown command: ${command}`);
if (!arg("labels") || !arg("judge-results")) throw new Error("evaluate requires --labels and --judge-results");
const labels = JSON.parse(await readFile(resolve(arg("labels")), "utf8"));
const judged = JSON.parse(await readFile(resolve(arg("judge-results")), "utf8"));
if (labels.schema_version !== 1 || labels.calibration_status !== "HUMAN_LABELED") throw new Error("labels must explicitly declare HUMAN_LABELED");
if (!Array.isArray(labels.reviewers) || new Set(labels.reviewers).size < 2 || !labels.cases?.length) throw new Error("at least two named reviewers and one case are required");
const judgedByCase = new Map((judged.cases ?? []).map((entry) => [entry.case_id, entry]));
const comparisons = [];
for (const item of labels.cases) {
  const reviewerIds = new Set((item.independent_labels ?? []).map((label) => label.reviewer_id));
  if (reviewerIds.size < 2 || !item.adjudicated) throw new Error(`${item.case_id}: two independent labels and adjudication are required`);
  if ([...reviewerIds].some((id) => !labels.reviewers.includes(id))) throw new Error(`${item.case_id}: independent reviewer is absent from the declared reviewer list`);
  for (const label of [...item.independent_labels, item.adjudicated]) {
    if (!["PASS", "FAIL", "BLOCKED"].includes(label.verdict) || Object.values(label.ratings ?? {}).some((rating) => !Number.isInteger(rating) || rating < 0 || rating > 4)) throw new Error(`${item.case_id}: invalid human label`);
  }
  const model = judgedByCase.get(item.case_id);
  if (!model) throw new Error(`${item.case_id}: missing judge result`);
  if (model.profile_id && model.profile_id !== labels.profile_id) throw new Error(`${item.case_id}: judge profile does not match labels`);
  const dimensions = Object.keys(item.adjudicated.ratings ?? {});
  if (!dimensions.length || dimensions.some((id) => !Number.isInteger(model.ratings?.[id]))) throw new Error(`${item.case_id}: judge ratings do not match adjudicated dimensions`);
  const absoluteErrors = dimensions.map((id) => Math.abs(model.ratings[id] - item.adjudicated.ratings[id]));
  comparisons.push({ case_id: item.case_id, verdict_match: model.verdict === item.adjudicated.verdict, false_pass: model.verdict === "PASS" && item.adjudicated.verdict !== "PASS", false_fail: model.verdict !== "PASS" && item.adjudicated.verdict === "PASS", mean_absolute_rating_error: absoluteErrors.reduce((sum, value) => sum + value, 0) / absoluteErrors.length });
}
const report = {
  schema_version: 1,
  calibration_status: "MEASURED_NOT_PROMOTED",
  profile_id: labels.profile_id,
  case_count: comparisons.length,
  verdict_agreement: comparisons.filter((item) => item.verdict_match).length / comparisons.length,
  false_pass_count: comparisons.filter((item) => item.false_pass).length,
  false_fail_count: comparisons.filter((item) => item.false_fail).length,
  mean_absolute_rating_error: comparisons.reduce((sum, item) => sum + item.mean_absolute_rating_error, 0) / comparisons.length,
  comparisons,
  limitation: "This report does not promote or retune a judge profile; profile changes require a separately versioned evidence-backed decision."
};
const output = resolve(arg("output") ?? join(process.cwd(), "human-calibration-report.json"));
await writeFile(output, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ report: output, ...report }, null, 2));
