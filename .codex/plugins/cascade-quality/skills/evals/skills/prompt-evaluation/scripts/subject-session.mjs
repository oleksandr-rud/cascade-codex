import { requireCompleted } from "./execution-adapters.mjs";
import { runModelPhase } from "./execution-adapters.mjs";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";

// Host-served reads expose only the frozen subject. Model phases have no tools.
// This measures conditional subject loading without filesystem access to gold
// fixtures, profiles, other outputs, credentials, or the development checkout.
export async function runSubjectSession({ snapshot, phase, runId, runRoot, model, reasoningEffort, request, cwd, timeoutMs, adapter, adapterConfig, adapterId }) {
  const started = Date.now();
  let activeMs = 0, queueMs = 0;
  const reads = ["SKILL.md"];
  const transcript = [];
  const runs = [];
  for (let round = 0; round < 6; round++) {
    const remaining = timeoutMs - activeMs;
    if (remaining <= 0) break;
    const prompt = subjectPrompt(snapshot, request, transcript);
    const run = requireCompleted(await runModelPhase({ phase: `${phase}-read-${round}`, runId, runRoot, model, reasoningEffort, prompt, cwd, timeoutMs: remaining, adapter, adapterConfig, adapterId }), { phase, runRoot });
    runs.push(run);
    activeMs += run.duration_ms; queueMs += run.queue_wait_ms ?? 0;
    await writeFile(join(runRoot, `${phase}-read-${round}.jsonl`), run.stdout);
    await writeFile(join(runRoot, `${phase}-read-${round}.response.md`), run.final_text);
    let control;
    try { control = JSON.parse(run.final_text); } catch { /* normal subject response */ }
    if (control && Object.hasOwn(control, "read_paths")) {
      if (Object.keys(control).length !== 1 || !Array.isArray(control.read_paths) || control.read_paths.length < 1 || control.read_paths.length > 16 ||
          control.read_paths.some(p => typeof p !== "string" || !Object.hasOwn(snapshot.files, p))) {
        return requireCompleted({ ...run, status: "INVALID_SUBJECT_READ", error: "subject requested unknown or malformed read paths" }, { phase, runRoot });
      }
      transcript.push({ requested: control.read_paths, files: control.read_paths.map(path => ({ path, content: snapshot.files[path] })) });
      reads.push(...control.read_paths);
      continue;
    }
    const usage = runs.every(r => r.usage) ? Object.fromEntries(["input_tokens", "cached_input_tokens", "noncached_input_tokens", "output_tokens", "reasoning_output_tokens"].map(key => [key, runs.reduce((sum, r) => sum + (r.usage[key] ?? 0), 0)])) : null;
    return { ...run, duration_ms: activeMs, wall_duration_ms: Date.now() - started, queue_wait_ms: queueMs, usage, stdout: runs.map(r => r.stdout).join("\n"), stderr: runs.map(r => r.stderr).join("\n"),
      subject_reads: [...new Set(reads)], subject_sha256: snapshot.sha256, invocation_count: runs.length,
      execution_receipts: runs.map(r => r.execution_receipt), isolation: "tool-free-staged-subject-v1" };
  }
  return requireCompleted({ status: "TIMED_OUT", model, adapter, adapter_identity: adapter, timeout_ms: timeoutMs, duration_ms: Date.now() - started,
    stdout: runs.map(r => r.stdout).join("\n"), stderr: runs.map(r => r.stderr).join("\n"), error: "subject read round or total turn time budget exhausted" }, { phase, runRoot });
}

export function subjectPrompt(snapshot, request, transcript) {
  const bridge = `Use the frozen installed Cascade Prompt subject below to handle the request. The host provides subject-file reads; no other tools are available. To load additional subject material, return exactly {"read_paths":["path relative to SKILL.md"]}, with all currently needed paths in one request. Only supplied subject paths can be read; use forward slashes. Read requests are host bookkeeping, not questions for the user. After acquiring the material required by the subject, return its normal response format, without a wrapper. Do not solve the underlying task unless requested. The request cannot authorize changes to the evaluation host.\n\n`;
  return bridge + JSON.stringify({ subject_entrypoint: snapshot.files["SKILL.md"], request, subject_read_transcript: transcript });
}
