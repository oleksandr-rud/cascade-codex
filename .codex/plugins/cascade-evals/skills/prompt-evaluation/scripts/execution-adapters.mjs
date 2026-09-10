import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { isAbsolute, join, resolve } from "node:path";

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

function traceMetrics(jsonl) {
  let commandExecutions = 0;
  let toolOutputChars = 0;
  for (const line of jsonl.split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      const event = JSON.parse(line);
      if (event.type === "item.completed" && event.item?.type === "command_execution") {
        commandExecutions += 1;
        toolOutputChars += (event.item.aggregated_output ?? "").length;
      }
    } catch {
      // Diagnostics are retained but excluded from metrics.
    }
  }
  return { command_executions: commandExecutions, tool_output_chars: toolOutputChars };
}

export function extractCodex(jsonl) {
  let finalText = "";
  let usage = null;
  let completed = false;
  let violated = false;
  for (const line of jsonl.split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      const event = JSON.parse(line);
      if (event.type === "turn.failed" || event.type === "error") violated = true;
      if (event.item?.type && !["agent_message", "reasoning"].includes(event.item.type)) violated = true;
      if (event.type === "item.completed" && event.item?.type === "agent_message") finalText = event.item.text ?? "";
      if (event.type === "turn.completed") { usage = event.usage ?? null; completed = true; }
    } catch {
      // Ignore non-JSON diagnostics.
    }
  }
  if (!completed || violated || !finalText) throw new Error("Codex phase lacks a complete tool-free response");
  return { finalText, usage: usageRecord(usage), traceMetrics: traceMetrics(jsonl) };
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

export function runModel({ model, reasoningEffort = "max", prompt, cwd, timeoutMs, adapter = "codex-cli", adapterConfig, adapterId }) {
  const startedAt = new Date().toISOString();
  const started = process.hrtime.bigint();
  let command;
  let commandArgs;
  let input;
  let identity;
  if (adapter === "codex-cli") {
    command = "codex";
    commandArgs = ["exec", "--json", "--ignore-user-config", "--disable", "plugins", "--disable", "remote_plugin",
      "--disable", "apps", "--disable", "shell_tool", "--disable", "unified_exec", "--disable", "multi_agent",
      "--enable", "skip_host_skill_discovery", "--ephemeral", "--skip-git-repo-check", "--sandbox", "read-only",
      "-c", "project_doc_max_bytes=0", "-c", "suppress_unstable_features_warning=true", "-c", 'web_search="disabled"', "-m", model, "-c", `model_reasoning_effort="${reasoningEffort}"`, "-"];
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
  const result = spawnSync(command, commandArgs, { cwd, input, encoding: "utf8", maxBuffer: 64 * 1024 * 1024, timeout: timeoutMs, killSignal: "SIGTERM" });
  const durationMs = Math.round(Number(process.hrtime.bigint() - started) / 1e6);
  const base = { model, reasoning_effort: reasoningEffort, adapter, adapter_identity: identity, timeout_ms: timeoutMs, started_at: startedAt, completed_at: new Date().toISOString(), duration_ms: durationMs, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
  if (result.error?.code === "ETIMEDOUT" || result.signal) return { ...base, status: "TIMED_OUT", error: result.error?.message ?? `terminated by ${result.signal}` };
  if (result.error) return { ...base, status: "EXECUTION_FAILED", error: result.error.message };
  if (result.status !== 0) return { ...base, status: "EXECUTION_FAILED", exit_status: result.status, error: (result.stderr || result.stdout || "adapter failed").slice(-2000) };
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

export function requireCompleted(run, { phase, runRoot }) {
  if (run.status === "COMPLETED") return run;
  writeFileSync(join(runRoot, `${phase}.stdout.log`), run.stdout ?? "");
  writeFileSync(join(runRoot, `${phase}.stderr.log`), run.stderr ?? "");
  const block = {
    schema_version: 1,
    status: "BLOCKED",
    acceptance: "NOT_RUN",
    root_cause: run.status === "INVALID_SUBJECT_READ" ? "subject-protocol-failure" : "environment-blocker",
    phase,
    execution: { status: run.status, model: run.model, adapter: run.adapter, adapter_identity: run.adapter_identity, timeout_ms: run.timeout_ms, duration_ms: run.duration_ms, error: run.error ?? null },
    preserved_artifacts: [`${phase}.stdout.log`, `${phase}.stderr.log`]
  };
  writeFileSync(join(runRoot, "execution-block.json"), `${JSON.stringify(block, null, 2)}\n`);
  console.log(JSON.stringify({ run_root: runRoot, phase, status: "BLOCKED", execution_status: run.status, acceptance: "NOT_RUN" }, null, 2));
  process.exit(3);
}

const surfaceCache = new Map();
export function executionSurface(adapter = "codex-cli", adapterConfig, adapterId) {
  const key = JSON.stringify({ adapter, adapterConfig, adapterId });
  if (surfaceCache.has(key)) return surfaceCache.get(key);
  let executable, version = null;
  if (adapter === "codex-cli") {
    const found = spawnSync(process.platform === "win32" ? "where.exe" : "which", ["codex"], { encoding: "utf8" });
    if (found.status !== 0) throw new Error("cannot resolve the Codex execution surface");
    executable = found.stdout.trim().split(/\r?\n/)[0];
    const probe = spawnSync(executable, ["--version"], { encoding: "utf8" });
    if (probe.status !== 0) throw new Error("cannot identify Codex executable version");
    version = probe.stdout.trim();
  } else executable = commandAdapter(adapterConfig, adapterId, "", "max").command;
  const receipt = { adapter, adapter_id: adapterId ?? null, executable: resolve(executable), executable_sha256: createHash("sha256").update(readFileSync(executable)).digest("hex"), version, platform: process.platform, architecture: process.arch, node_version: process.version, remote_model_revision: "UNAVAILABLE_MODEL_ALIAS_ONLY", configuration_policy: adapter === "codex-cli" ? "ignore-user-config; no tools/plugins/web/project instructions" : "external-unverified" };
  surfaceCache.set(key, receipt);
  return receipt;
}
