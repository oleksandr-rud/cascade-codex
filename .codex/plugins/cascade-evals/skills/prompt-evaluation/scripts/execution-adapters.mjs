import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { mkdir, mkdtemp, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { isAbsolute, join, resolve } from "node:path";

export const EXECUTION_RUNTIME_SHA256 = digest(readFileSync(new URL(import.meta.url)));

export const DEFAULT_TIMEOUTS_MS = Object.freeze({
  "efficient-structured": 180_000,
  "balanced-production": 300_000,
  "frontier-generalist": 420_000,
  "frontier-autonomous": 600_000,
  prompt_builder: 300_000,
  judge: 240_000
});

export function positiveTimeout(value, fallback, label) {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new Error(`${label} must be a positive integer`);
  return parsed;
}

function usageRecord(usage) {
  if (!usage) return null;
  return {
    input_tokens: usage.input_tokens ?? 0,
    cached_input_tokens: usage.cached_input_tokens ?? 0,
    noncached_input_tokens: Math.max(0, (usage.input_tokens ?? 0) - (usage.cached_input_tokens ?? 0)),
    output_tokens: usage.output_tokens ?? 0,
    reasoning_output_tokens: usage.reasoning_output_tokens ?? 0
  };
}

function extractCodex(jsonl) {
  let finalText = "";
  let usage = null;
  let completed = false;
  const traceMetrics = { command_executions: 0, tool_output_chars: 0 };
  for (const line of jsonl.split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      const event = JSON.parse(line);
      if (event.type === "item.completed" && event.item?.type === "command_execution") {
        traceMetrics.command_executions += 1;
        traceMetrics.tool_output_chars += (event.item.aggregated_output ?? "").length;
      }
      if (event.type === "item.completed" && event.item?.type === "agent_message") finalText = event.item.text ?? "";
      if (event.type === "turn.completed") { usage = event.usage ?? null; completed = true; }
      if (event.type === "turn.failed") completed = false;
    } catch {
      // Ignore non-JSON diagnostics.
    }
  }
  if (!finalText || !completed) throw new Error("Codex JSONL did not contain a completed turn and agent message");
  return { finalText, usage: usageRecord(usage), traceMetrics };
}

function commandAdapter(configPath, adapterId, model, reasoningEffort) {
  if (!configPath || !adapterId) throw new Error("command-json-v1 requires --adapter-config and a phase adapter id");
  const config = JSON.parse(readFileSync(resolve(configPath), "utf8"));
  const entry = config.adapters?.[adapterId];
  if (!entry || typeof entry.command !== "string" || !Array.isArray(entry.args ?? [])) throw new Error(`unknown or invalid adapter: ${adapterId}`);
  if (!isAbsolute(entry.command)) throw new Error(`${adapterId}: adapter command must be an absolute path`);
  return {
    command: entry.command,
    args: (entry.args ?? []).map((value) => value.replaceAll("{model}", model).replaceAll("{reasoning_effort}", reasoningEffort)),
    identity: adapterId,
    protocol: "command-json-v1"
  };
}

let cancellation;
export function processAbortSignal() {
  if (!cancellation) {
    cancellation = new AbortController();
    for (const signal of ["SIGINT", "SIGTERM"]) process.once(signal, () => cancellation.abort(signal));
  }
  return cancellation.signal;
}

export async function runCommand({ command, args, input, cwd, timeoutMs, signal, maxOutputBytes = 64 * 1024 * 1024, terminationGraceMs = 200 }) {
  positiveTimeout(timeoutMs, undefined, "timeoutMs");
  positiveTimeout(terminationGraceMs, undefined, "terminationGraceMs");
  if (!Number.isInteger(timeoutMs) || !Number.isInteger(maxOutputBytes) || maxOutputBytes <= 0) throw new Error("execution requires finite time and output limits");
  if (signal?.aborted) return { stdout: "", stderr: "", status: "CANCELLED", dispatched: false, error: "execution cancelled before dispatch" };
  return new Promise((resolveResult) => {
    const grouped = process.platform !== "win32";
    const child = spawn(command, args, { cwd, detached: grouped, stdio: ["pipe", "pipe", "pipe"] });
    const output = { stdout: [], stderr: [] };
    let bytes = 0;
    let terminal = null;
    let failure = null;
    let dispatched = false;
    let escalation;
    const kill = (signalName) => {
      try { if (grouped && child.pid) process.kill(-child.pid, signalName); else child.kill(signalName); }
      catch (error) { if (error.code !== "ESRCH") failure ??= error; }
    };
    const stop = (status) => {
      if (terminal) return;
      terminal = status;
      kill("SIGTERM");
      escalation = setTimeout(() => kill("SIGKILL"), terminationGraceMs);
    };
    const abort = () => stop("CANCELLED");
    signal?.addEventListener("abort", abort, { once: true });
    if (signal?.aborted) abort();
    const deadline = setTimeout(() => stop("TIMED_OUT"), timeoutMs);
    for (const stream of ["stdout", "stderr"]) child[stream].on("data", (chunk) => {
      const remaining = maxOutputBytes - bytes;
      output[stream].push(chunk.subarray(0, Math.max(0, remaining)));
      bytes += Math.min(remaining, chunk.length);
      if (chunk.length > remaining) stop("OUTPUT_LIMIT_EXCEEDED");
    });
    child.once("spawn", () => { dispatched = true; });
    child.once("error", (error) => { failure = error; });
    child.once("exit", () => { if (grouped) kill("SIGKILL"); });
    child.once("close", (exitStatus, exitSignal) => {
      clearTimeout(deadline);
      clearTimeout(escalation);
      signal?.removeEventListener("abort", abort);
      resolveResult({
        stdout: Buffer.concat(output.stdout).toString("utf8"), stderr: Buffer.concat(output.stderr).toString("utf8"),
        status: terminal ?? (failure || exitStatus !== 0 ? "EXECUTION_FAILED" : "COMPLETED"), dispatched,
        exit_status: exitStatus, signal: exitSignal,
        ...(failure ? { error: failure.message } : terminal ? { error: terminal.toLowerCase().replaceAll("_", " ") } : {})
      });
    });
    child.stdin.on("error", (error) => { if (error.code !== "EPIPE") failure ??= error; });
    child.stdin.end(input);
  });
}

export async function runModel({ model, reasoningEffort = "max", prompt, cwd, timeoutMs, adapter = "codex-cli", adapterConfig, adapterId, signal, maxOutputBytes, installedPluginDiscovery = false }) {
  if (typeof model !== "string" || !model || typeof prompt !== "string" || !prompt) throw new Error("model and prompt are required");
  const startedAt = new Date().toISOString();
  const started = process.hrtime.bigint();
  let command;
  let commandArgs;
  let input;
  let identity;
  if (adapter === "codex-cli") {
    command = "codex";
    commandArgs = ["exec", "--json", "--ephemeral", "--skip-git-repo-check", "--sandbox", "read-only",
      ...(!installedPluginDiscovery ? ["--ignore-user-config", "--disable", "plugins"] : []),
      ...["apps", "browser_use", "computer_use", "image_generation", "code_mode_host", "memories"].flatMap((feature) => ["--disable", feature]),
      "-c", "project_doc_max_bytes=0", "-m", model, "-c", `model_reasoning_effort="${reasoningEffort}"`, "-"];
    input = prompt;
    identity = "codex-cli";
  } else if (adapter === "command-json-v1") {
    const configured = commandAdapter(adapterConfig, adapterId, model, reasoningEffort);
    command = configured.command;
    commandArgs = configured.args;
    input = JSON.stringify({ protocol: "cascade-evals-command-v1", model, reasoning_effort: reasoningEffort, prompt });
    identity = configured.identity;
  } else {
    throw new Error(`unsupported execution adapter: ${adapter}`);
  }
  const isolatedCwd = adapter === "codex-cli" ? await mkdtemp(join(tmpdir(), "cascade-prompt-execution-")) : null;
  let result;
  try { result = await runCommand({ command, args: commandArgs, cwd: isolatedCwd ?? cwd, input, timeoutMs, signal, maxOutputBytes }); }
  finally { if (isolatedCwd) await rm(isolatedCwd, { recursive: true, force: true }); }
  const durationMs = Math.round(Number(process.hrtime.bigint() - started) / 1e6);
  const base = { model, reasoning_effort: reasoningEffort, adapter, adapter_identity: identity, timeout_ms: timeoutMs, started_at: startedAt, completed_at: new Date().toISOString(), duration_ms: durationMs, dispatched: result.dispatched, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
  if (result.status !== "COMPLETED") return { ...base, ...result, error: result.error ?? (result.stderr || "adapter failed").slice(-2000) };
  try {
    if (adapter === "codex-cli") {
      const parsed = extractCodex(result.stdout);
      return { ...base, status: "COMPLETED", final_text: parsed.finalText, usage: parsed.usage, trace_metrics: parsed.traceMetrics };
    }
    const payload = JSON.parse(result.stdout);
    if (typeof payload.text !== "string" || !payload.text) throw new Error("adapter response requires non-empty text");
    return { ...base, status: "COMPLETED", final_text: payload.text, usage: usageRecord(payload.usage), trace_metrics: payload.trace_metrics ?? null };
  } catch (error) {
    return { ...base, status: "INVALID_ADAPTER_RESPONSE", error: error.message };
  }
}

function digest(value) { return createHash("sha256").update(value).digest("hex"); }

export async function runModelPhase({ phase, runId, runRoot, ...configuration }) {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(phase) || typeof runId !== "string" || !runId) throw new Error("phase and run identity are required");
  await mkdir(runRoot, { recursive: true });
  const path = `${phase}.execution.json`;
  const identity = {
    schema_version: 1, run_id: runId, phase,
    model: configuration.model, reasoning_effort: configuration.reasoningEffort ?? "max",
    adapter: configuration.adapter ?? "codex-cli", adapter_identity: configuration.adapterId ?? configuration.adapter ?? "codex-cli",
    codex_context: (configuration.adapter ?? "codex-cli") === "codex-cli" ? (configuration.installedPluginDiscovery ? "installed-plugin-discovery" : "isolated") : null,
    prompt_sha256: digest(configuration.prompt), runtime_sha256: EXECUTION_RUNTIME_SHA256,
    adapter_config_sha256: configuration.adapterConfig ? digest(readFileSync(resolve(configuration.adapterConfig))) : null
  };
  // An existing invocation, including an interrupted one, must never be replayed.
  await writeFile(join(runRoot, path), `${JSON.stringify({ ...identity, status: "DISPATCHED" }, null, 2)}\n`, { flag: "wx" });
  let run;
  try { run = await runModel(configuration); }
  catch (error) { run = { status: "EXECUTION_FAILED", stdout: "", stderr: "", dispatched: false, error: error.message }; }
  const receipt = {
    ...identity, status: run.status, dispatched: run.dispatched, started_at: run.started_at ?? null, completed_at: run.completed_at ?? new Date().toISOString(),
    duration_ms: run.duration_ms ?? 0, timeout_ms: configuration.timeoutMs,
    stdout_sha256: digest(run.stdout), stderr_sha256: digest(run.stderr), output_sha256: run.final_text ? digest(run.final_text) : null,
    error: run.error ?? null
  };
  await writeFile(join(runRoot, `${phase}.jsonl`), run.stdout);
  await writeFile(join(runRoot, `${phase}.stderr.log`), run.stderr);
  const encoded = `${JSON.stringify(receipt, null, 2)}\n`;
  const temporary = join(runRoot, `${path}.tmp`);
  await writeFile(temporary, encoded, { flag: "wx" });
  await rename(temporary, join(runRoot, path));
  return { ...run, execution_receipt: { path, sha256: digest(encoded) } };
}

export function requireCompleted(run, { phase, runRoot }) {
  if (run.status === "COMPLETED") return run;
  const block = {
    schema_version: 1,
    status: "BLOCKED",
    acceptance: "NOT_RUN",
    root_cause: "environment-blocker",
    phase,
    execution: { status: run.status, model: run.model, adapter: run.adapter, adapter_identity: run.adapter_identity, timeout_ms: run.timeout_ms, duration_ms: run.duration_ms, error: run.error ?? null },
    preserved_artifacts: [`${phase}.jsonl`, `${phase}.stderr.log`, `${phase}.execution.json`]
  };
  writeFileSync(join(runRoot, "execution-block.json"), `${JSON.stringify(block, null, 2)}\n`);
  console.log(JSON.stringify({ run_root: runRoot, phase, status: "BLOCKED", execution_status: run.status, acceptance: "NOT_RUN" }, null, 2));
  process.exit(3);
}
