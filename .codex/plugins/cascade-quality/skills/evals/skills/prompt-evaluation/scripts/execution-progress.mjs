import { readdirSync, readFileSync, writeFileSync, renameSync, existsSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

export function inspectRun(runRoot) {
  const files = existsSync(runRoot) ? readdirSync(runRoot) : [];
  const phases = files.filter(name => name.endsWith(".execution.json")).sort().map(name => {
    try { return { receipt: name, ...JSON.parse(readFileSync(join(runRoot, name), "utf8")) }; }
    catch { return { receipt: name, status: "UNREADABLE_RECEIPT" }; }
  });
  let summary = null, summaryError = null;
  if (files.includes("run-summary.json")) {
    try { summary = JSON.parse(readFileSync(join(runRoot, "run-summary.json"), "utf8")); }
    catch (error) { summaryError = `UNREADABLE_SUMMARY: ${error.message}`; }
  }
  return { run_root: runRoot, status: summary ? "FINAL" : "PARTIAL", acceptance: summary?.acceptance ?? (summary?.status === "PASS" ? "ACCEPTED" : summary?.status === "FAIL" ? "REJECTED" : "NOT_RUN"), summary, ...(summaryError ? { summary_error: summaryError } : {}), phases,
    preserved_artifacts: files.filter(name => /\.(jsonl|md|txt|log)$/.test(name)) };
}

export function checkpointRun(runRoot) {
  const progress = inspectRun(runRoot), temporary = join(runRoot, `.progress-${randomUUID()}.tmp`);
  writeFileSync(temporary, JSON.stringify(progress, null, 2));
  renameSync(temporary, join(runRoot, "run-progress.json"));
  return progress;
}
