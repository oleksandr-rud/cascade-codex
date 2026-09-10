#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULT_TIMEOUTS_MS, positiveTimeout, requireCompleted, executionSurface, EXECUTION_RUNTIME_SHA256 } from "./execution-adapters.mjs";
import { resolveSubjectSkill } from "./subject-plugin.mjs";
import { runModelPhase } from "./execution-adapters.mjs";
import { snapshotSubject, judgeRequest, parseJudgment, assertDisjointRoots, runnerDigest, interviewEvidence, subjectReadChecks } from "./evaluation-integrity.mjs";
import { replaySubject, replayTarget } from "./replay-evidence.mjs";
import { runSubjectSession } from "./subject-session.mjs";

const campaignSkillRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const evalRoot = join(campaignSkillRoot, "evals");

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exit(1);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function parseArgs(values) {
  const parsed = { _: [] };
  const booleanFlags = new Set(["execute-judges", "no-prompt-cache", "no-trajectory-cache"]);
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (!value.startsWith("--")) {
      parsed._.push(value);
      continue;
    }
    const key = value.slice(2);
    if (booleanFlags.has(key)) {
      parsed[key] = true;
      continue;
    }
    const next = values[index + 1];
    if (!next || next.startsWith("--")) fail(`missing value for --${key}`);
    parsed[key] = next;
    index += 1;
  }
  return parsed;
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function writeJson(path, value) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

function absoluteFromEval(path) {
  return isAbsolute(path) ? path : join(evalRoot, path);
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
      // Non-JSON diagnostic lines do not affect trace metrics.
    }
  }
  return { command_executions: commandExecutions, tool_output_chars: toolOutputChars };
}

function extractAgentMessage(jsonl) {
  let finalText = "";
  let usage = null;
  for (const line of jsonl.split(/\r?\n/)) {
    if (!line.trim()) continue;
    let event;
    try {
      event = JSON.parse(line);
    } catch {
      continue;
    }
    if (event.type === "item.completed" && event.item?.type === "agent_message") {
      finalText = event.item.text ?? "";
    }
    if (event.type === "turn.completed") usage = event.usage ?? null;
  }
  if (!finalText) fail("Codex JSONL did not contain a completed agent message");
  return { finalText, usage };
}

function tryExtractFinalPrompt(response) {
  const finalSection = response.match(/(?:^|\n)\s*(?:#{1,6}\s*)?(?:\d+[.)]\s*)?(?:\*\*)?Final Prompt(?:\*\*)?\s*:?\s*\r?\n+```[^\n]*\r?\n([\s\S]*?)\r?\n```/i);
  if (finalSection) return finalSection[1].trim();
  const onlyFence = response.match(/^```[^\n]*\r?\n([\s\S]*?)\r?\n```\s*$/);
  return onlyFence ? onlyFence[1].trim() : null;
}

function stripSingleFence(value) {
  const trimmed = value.trim();
  const match = trimmed.match(/^```(?:json)?\s*\r?\n([\s\S]*?)\r?\n```$/i);
  return match ? match[1].trim() : trimmed;
}

function countWords(value) {
  return value.trim().match(/\b[\p{L}\p{N}][\p{L}\p{N}'’-]*\b/gu)?.length ?? 0;
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}

function mechanicalGrade(output, evaluator) {
  const checks = [];
  if (evaluator.mechanical_type === "exact_json") {
    let parsed = null;
    try {
      parsed = JSON.parse(stripSingleFence(output));
      checks.push({ id: "valid-json", passed: true });
    } catch (error) {
      checks.push({ id: "valid-json", passed: false, detail: error.message });
      return { eligible: false, checks };
    }
    const actualKeys = Object.keys(parsed).sort();
    const expectedKeys = [...evaluator.exact_keys].sort();
    checks.push({ id: "exact-keys", passed: JSON.stringify(actualKeys) === JSON.stringify(expectedKeys), actual: actualKeys, expected: expectedKeys });
    checks.push({ id: "exact-values", passed: JSON.stringify(stable(parsed)) === JSON.stringify(stable(evaluator.expected)), actual: parsed, expected: evaluator.expected });
  } else if (evaluator.mechanical_type === "text_contract") {
    const lowered = output.toLowerCase();
    for (const heading of evaluator.required_headings ?? []) {
      checks.push({ id: `heading:${heading}`, passed: lowered.includes(heading.toLowerCase()) });
    }
    for (const pattern of evaluator.required_patterns ?? []) {
      checks.push({ id: `required:${pattern}`, passed: lowered.includes(pattern.toLowerCase()) });
    }
    for (const pattern of evaluator.forbidden_patterns ?? []) {
      checks.push({ id: `forbidden:${pattern}`, passed: !lowered.includes(pattern.toLowerCase()) });
    }
    if (Number.isInteger(evaluator.max_words)) {
      const actual = countWords(output);
      checks.push({ id: "max-words", passed: actual <= evaluator.max_words, actual, expected_maximum: evaluator.max_words });
    }
  } else {
    fail(`unsupported evaluator type: ${evaluator.mechanical_type}`);
  }
  return { eligible: checks.every((check) => check.passed), checks };
}

function judgePrompt({ profile, task, runId, evidence }) {
  return judgeRequest(profile, { task_id: task.id, run_id: runId }, evidence);
}
function parseJudgeResponse(text, profile, taskId, runId, evidence) {
  return parseJudgment(text, profile, { task_id: taskId, run_id: runId }, evidence);
}

function deterministicOutcome(mechanical, taskId, runId) {
  return {
    valid: true,
    mode: "DETERMINISTIC",
    score: mechanical.eligible ? 1 : 0,
    floor_passed: mechanical.eligible,
    harness_verdict: mechanical.eligible ? "PASS" : "FAIL",
    response: { task_id: taskId, run_id: runId, evidence: mechanical.checks }
  };
}

async function readBuilderCache(path, key, placeholder) {
  try {
    const cached = await readJson(path);
    if (cached.cache_key !== key || sha256(cached.builder_response ?? "") !== cached.builder_response_sha256) return null;
    const generatedPrompt = tryExtractFinalPrompt(cached.builder_response ?? "");
    if (!generatedPrompt?.includes(placeholder)) return null;
    return cached;
  } catch {
    return null;
  }
}

async function readTrajectoryCache(path, key, profile, taskId, evidence) {
  try {
    const cached = await readJson(path);
    if (cached.cache_key !== key || cached.profile_id !== profile.profile_id || cached.result?.valid !== true) return null;
    if (sha256(JSON.stringify(cached.result)) !== cached.result_sha256) return null;
    const parsed = parseJudgment(JSON.stringify(cached.result.response), profile, { task_id: taskId, run_id: cached.source_run_id }, evidence);
    if (!parsed.valid || parsed.harness_verdict === "BLOCKED") return null;
    return { ...cached, result: parsed };
  } catch {
    return null;
  }
}

function phaseExecution(status, run = null, extra = {}) {
  return {
    status,
    duration_ms: run?.duration_ms ?? 0,
    usage: run?.usage ?? null,
    trace_metrics: run?.trace_metrics ?? null,
    receipt: run?.execution_receipt ?? null,
    ...extra
  };
}

function totalUsage(executions) {
  const total = { input_tokens: 0, cached_input_tokens: 0, noncached_input_tokens: 0, output_tokens: 0, reasoning_output_tokens: 0 };
  for (const execution of Object.values(executions)) {
    if (!execution?.usage) continue;
    for (const key of Object.keys(total)) total[key] += execution.usage[key] ?? 0;
  }
  return total;
}

function budgetResult(execution, budget, includeCommands = false) {
  if (!execution?.usage) return { status: "NOT_MEASURED", reasons: [] };
  const reasons = [];
  if (execution.usage.input_tokens > budget.max_input_tokens) reasons.push(`input_tokens>${budget.max_input_tokens}`);
  if (execution.usage.noncached_input_tokens > budget.max_noncached_input_tokens) reasons.push(`noncached_input_tokens>${budget.max_noncached_input_tokens}`);
  if (includeCommands && execution.trace_metrics?.command_executions > budget.max_command_executions) reasons.push(`command_executions>${budget.max_command_executions}`);
  return { status: reasons.length ? "EXCEEDED" : "PASS", reasons, observed: { usage: execution.usage, trace_metrics: execution.trace_metrics } };
}

const args = parseArgs(process.argv.slice(2));
const command = args._[0] ?? "list";
const catalogText = await readFile(join(evalRoot, "task-catalog.json"), "utf8");
const matrixText = await readFile(join(evalRoot, "model-matrix.json"), "utf8");
const catalog = JSON.parse(catalogText);
const matrix = JSON.parse(matrixText);

if (command === "list") {
  console.log(JSON.stringify({ catalog_id: catalog.catalog_id, tasks: catalog.tasks.map(({ id, tier, task_family, domain, context_profile, outcome_evaluation, trajectory_evaluation }) => ({ id, tier, task_family, domain, context_profile, outcome_evaluation, trajectory_evaluation })), configurations: matrix.configurations.map(({ id, prompt_model, target_model, tier, availability, tasks }) => ({ id, prompt_model, target_model, tier, availability, tasks })) }, null, 2));
  process.exit(0);
}

if (command !== "run") fail(`unknown command: ${command}`);
args["prompt-model"] ??= matrix.defaults?.prompt_model ?? "gpt-5.6-sol";
args["target-model"] ??= matrix.defaults?.target_model ?? "gpt-5.6-sol";
args["reasoning-effort"] ??= matrix.defaults?.reasoning_effort ?? "max";
const judgeReasoningEffort = args["judge-reasoning-effort"] ?? args["reasoning-effort"];
if (args["execute-judges"]) args["judge-model"] ??= matrix.defaults?.judge_model ?? "gpt-5.6-sol";
for (const required of ["task"]) {
  if (!args[required]) fail(`--${required} is required`);
}

const task = catalog.tasks.find((candidate) => candidate.id === args.task);
if (!task) fail(`unknown task: ${args.task}`);
const subjectSkillRoot = await resolveSubjectSkill({ explicitPath: args["subject-skill-root"], pluginName: args["subject-plugin"] ?? "cascade-prompt", skillName: args["subject-skill"] ?? "prompt" });
const input = await readFile(absoluteFromEval(task.input_path), "utf8");
const evaluatorText = await readFile(absoluteFromEval(task.evaluator_path), "utf8");
const evaluator = JSON.parse(evaluatorText);
const budgets = await readJson(join(evalRoot, "token-budgets.json"));
const outcomeProfileText = await readFile(join(evalRoot, "judges/outcome-v4.json"), "utf8");
const trajectoryProfileText = await readFile(join(evalRoot, "judges/trajectory-v4.json"), "utf8");
const outcomeProfile = JSON.parse(outcomeProfileText);
const trajectoryProfile = JSON.parse(trajectoryProfileText);
const runId = args["run-id"] ?? `${task.id}-${new Date().toISOString().replace(/[:.]/g, "-")}`;
if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(runId)) fail("--run-id may contain only letters, numbers, dots, underscores, and hyphens");
const outputRoot = resolve(args["output-dir"] ?? join(process.cwd(), ".artifacts/prompt-quality"));
assertDisjointRoots(subjectSkillRoot, outputRoot);
const runnerText = await readFile(fileURLToPath(import.meta.url), "utf8");
const runRoot = join(outputRoot, runId);
const targetWorkspace = join(runRoot, "target-workspace");
const promptCacheRoot = join(outputRoot, ".cache", "prompt-builders");
const trajectoryCacheRoot = join(outputRoot, ".cache", "trajectory-judges");
await mkdir(outputRoot, { recursive: true });
await mkdir(runRoot); // Evidence identities are write-once.
await mkdir(targetWorkspace);
await mkdir(promptCacheRoot, { recursive: true });
await mkdir(trajectoryCacheRoot, { recursive: true });

const timeouts = {
  prompt_builder: positiveTimeout(args["builder-timeout-ms"], DEFAULT_TIMEOUTS_MS.prompt_builder, "--builder-timeout-ms"),
  target: positiveTimeout(args["target-timeout-ms"], DEFAULT_TIMEOUTS_MS[task.tier], "--target-timeout-ms"),
  judge: positiveTimeout(args["judge-timeout-ms"], DEFAULT_TIMEOUTS_MS.judge, "--judge-timeout-ms")
};
async function executePhase({ phase, model, prompt, timeoutMs, adapter, adapterId }) {
  return requireCompleted(await runModelPhase({ phase, runId, runRoot, model, reasoningEffort: phase.startsWith("judge-") ? judgeReasoningEffort : args["reasoning-effort"], prompt, cwd: targetWorkspace, timeoutMs, adapter, adapterConfig: args["adapter-config"], adapterId }), { phase, runRoot });
}

const subjectSnapshot = await snapshotSubject(subjectSkillRoot);
const contractDigest = subjectSnapshot.sha256;
await writeJson(join(runRoot, "subject-manifest.json"), subjectSnapshot.manifest);
const builderRequest = `${task.prompt_build_request}\n\n<target_task_contract>\n${task.target_task_contract}\n</target_task_contract>\n\nBuilder mode is ${task.builder_mode}. This contract is authoritative and complete: do not ask clarification questions or invent missing policy. The target model is ${args["target-model"]}; preserve this explicit model when capable and tailor the prompt to the ${task.tier} tier. Return the standard Cascade Prompt READY output. Use the frozen subject SKILL.md and request any required subject files through the host read protocol.`;
const surfaceReceipts = Object.fromEntries(["prompt", "target", "judge"].map(phase => [phase, executionSurface(args[`${phase}-adapter`] ?? "codex-cli", args["adapter-config"], args[`${phase}-adapter-id`])]));
const surfaceDigest = sha256(JSON.stringify(surfaceReceipts));
const runnerBundleDigest = await runnerDigest(dirname(fileURLToPath(import.meta.url)));
const adapterConfigDigest = args["adapter-config"] ? sha256(await readFile(resolve(args["adapter-config"]), "utf8")) : null;
await writeJson(join(runRoot, "run-contract.json"), { task, execution_runtime_sha256: EXECUTION_RUNTIME_SHA256, subject_sha256: contractDigest, execution_surface_sha256: surfaceDigest, runner_bundle_sha256: runnerBundleDigest, adapter_config_sha256: adapterConfigDigest, args, outcome_profile: outcomeProfile, trajectory_profile: trajectoryProfile });
const defaultTuple = args["reasoning-effort"] === matrix.defaults.reasoning_effort && args["prompt-model"] === matrix.defaults.prompt_model && args["target-model"] === matrix.defaults.target_model && (!args["execute-judges"] || (args["judge-model"] === matrix.defaults.judge_model && judgeReasoningEffort === matrix.defaults.reasoning_effort));
const selectedConfiguration = matrix.configurations.find(c => c.id === args["configuration-id"] && c.prompt_model === args["prompt-model"] && c.target_model === args["target-model"] && c.tasks.includes(task.id) && args["reasoning-effort"] === (c.reasoning_effort ?? matrix.defaults.reasoning_effort) && (!args["execute-judges"] || (args["judge-model"] === (c.judge_model ?? matrix.defaults.judge_model) && judgeReasoningEffort === (c.judge_reasoning_effort ?? c.reasoning_effort ?? matrix.defaults.reasoning_effort))) && c.execution_adapter === (args["target-adapter"] ?? "codex-cli"));
const liveAdapters = ["prompt", "target", "judge"].every(p => !args[`${p}-adapter`] || args[`${p}-adapter`] === "codex-cli");
if (liveAdapters && !defaultTuple && !selectedConfiguration) fail("nondefault live execution requires a matching --configuration-id from model-matrix.json");
const configurationId = defaultTuple ? "default-sol-max" : selectedConfiguration?.id ?? "unverified-external-fixture";
const builderCacheKey = sha256(JSON.stringify({ execution_surface_sha256: surfaceDigest, runner_bundle_sha256: runnerBundleDigest, adapter_config_sha256: adapterConfigDigest, execution_policy: "tool-free-staged-subject-v1", reasoning_effort: args["reasoning-effort"], adapter: args["prompt-adapter"] ?? "codex-cli", adapter_id: args["prompt-adapter-id"] ?? null, task_id: task.id, task_version: task.version, builder_mode: task.builder_mode, target_task_contract: task.target_task_contract, builder_request: builderRequest, prompt_model: args["prompt-model"], target_model: args["target-model"], tier: task.tier, runtime_contract_digest: contractDigest }));
const builderCachePath = join(promptCacheRoot, `${builderCacheKey}.json`);

let builderRun = null;
let builderResponse;
let builderExecution;
if (args["reuse-run-root"]) {
  if (args["prompt-response-file"]) fail("cannot combine verified replay with an explicit response file");
  builderRun = await replaySubject({sourceRoot:args["reuse-run-root"],phase:"prompt-builder",request:builderRequest,currentCase:task,snapshot:subjectSnapshot,model:args["prompt-model"],reasoningEffort:args["reasoning-effort"],runRoot});
  builderResponse=builderRun.final_text;
  builderExecution=phaseExecution("REUSED_VERIFIED_RUN",builderRun,{subject_reads:builderRun.subject_reads,replay:builderRun.replay,isolation:builderRun.isolation});
} else if (args["prompt-response-file"]) {
  builderResponse = await readFile(resolve(args["prompt-response-file"]), "utf8");
  builderExecution = phaseExecution("REUSED_EXPLICIT_RESPONSE", null, { source: resolve(args["prompt-response-file"]) });
} else {
  const cached = args["no-prompt-cache"] ? null : await readBuilderCache(builderCachePath, builderCacheKey, task.input_placeholder);
  if (cached) {
    builderResponse = cached.builder_response;
    builderExecution = phaseExecution("REUSED_AUTOMATIC_CACHE", null, { cache_key: builderCacheKey, source_run_id: cached.source_run_id, subject_reads: cached.subject_reads, isolation: cached.isolation });
  } else {
    builderRun = await runSubjectSession({ snapshot: subjectSnapshot, phase: "prompt-builder", runId, runRoot, model: args["prompt-model"], reasoningEffort: args["reasoning-effort"], request: builderRequest, cwd: targetWorkspace, timeoutMs: timeouts.prompt_builder, adapter: args["prompt-adapter"] ?? "codex-cli", adapterConfig: args["adapter-config"], adapterId: args["prompt-adapter-id"] });
    builderResponse = builderRun.final_text;
    builderExecution = phaseExecution("EXECUTED", builderRun, { cache_key: builderCacheKey, subject_reads: builderRun.subject_reads, receipts: builderRun.execution_receipts, isolation: builderRun.isolation });
    await writeFile(join(runRoot, "prompt-builder.jsonl"), builderRun.stdout);
    await writeFile(join(runRoot, "prompt-builder.stderr.log"), builderRun.stderr);
    await writeJson(builderCachePath, {
      schema_version: 2,
      cache_key: builderCacheKey,
      source_run_id: runId,
      created_at: new Date().toISOString(),
      task_id: task.id,
      task_version: task.version,
      builder_mode: task.builder_mode,
      target_task_contract_sha256: sha256(task.target_task_contract),
      prompt_model: args["prompt-model"],
      target_model: args["target-model"],
      tier: task.tier,
      runtime_contract_digest: contractDigest,
      builder_response_sha256: sha256(builderResponse),
      builder_response: builderResponse,
      subject_reads: builderRun.subject_reads,
      isolation: builderRun.isolation,
      excludes: ["target input", "evaluator", "gold answer"]
    });
  }
}

const generatedPrompt = tryExtractFinalPrompt(builderResponse);
if (/Interview Status:\s*(?:NEEDS_INPUT|BLOCKED)/i.test(builderResponse.replace(/```[^\n]*\r?\n[\s\S]*?\r?\n```/g, ""))) {
  fail(`one-shot builder returned an unexpected interview state for ${task.id}`);
}
if (!generatedPrompt) fail("could not extract a fenced Final Prompt from the builder response");
if (!generatedPrompt.includes(task.input_placeholder)) fail(`generated prompt is missing required placeholder ${task.input_placeholder}`);
const renderedPrompt = generatedPrompt.split(task.input_placeholder).join(input.trim());
if (renderedPrompt.includes(task.input_placeholder)) fail("input placeholder replacement was incomplete");

await writeFile(join(runRoot, "prompt-builder-response.md"), builderResponse);
await writeFile(join(runRoot, "generated-prompt.txt"), generatedPrompt);
const targetRun = args["reuse-run-root"] ? await replayTarget({sourceRoot:args["reuse-run-root"],currentCase:task,snapshot:subjectSnapshot,model:args["target-model"],reasoningEffort:args["reasoning-effort"],prompt:renderedPrompt,runRoot}) : await executePhase({ phase: "target", model: args["target-model"], prompt: renderedPrompt, timeoutMs: timeouts.target, adapter: args["target-adapter"] ?? "codex-cli", adapterId: args["target-adapter-id"] });
const targetExecution = phaseExecution(targetRun.replay ? "REUSED_VERIFIED_RUN" : "EXECUTED", targetRun, {replay:targetRun.replay ?? null});
await writeFile(join(runRoot, "target.jsonl"), targetRun.stdout);
await writeFile(join(runRoot, "target.stderr.log"), targetRun.stderr);
await writeFile(join(runRoot, "target-output.md"), targetRun.final_text);

const mechanical = mechanicalGrade(targetRun.final_text, evaluator);
mechanical.checks.push(...subjectReadChecks(task, builderExecution, "builder"));
mechanical.eligible = mechanical.checks.every(check => check.passed);
await writeJson(join(runRoot, "mechanical-grade.json"), mechanical);

let outcomeExecution = phaseExecution("NOT_RUN");
let trajectoryExecution = phaseExecution("NOT_RUN");
let judges = { status: "NOT_RUN", outcome_mode: task.outcome_evaluation, outcome: null, trajectory: null };

if (args["execute-judges"] && !mechanical.eligible) {
  outcomeExecution = phaseExecution("SKIPPED_MECHANICAL_INELIGIBLE");
  trajectoryExecution = phaseExecution("SKIPPED_MECHANICAL_INELIGIBLE");
  judges = { status: "SKIPPED_MECHANICAL_INELIGIBLE", outcome_mode: task.outcome_evaluation, outcome: null, trajectory: null };
} else if (args["execute-judges"]) {
  let outcomeResult;
  if (task.outcome_evaluation === "deterministic") {
    outcomeResult = deterministicOutcome(mechanical, task.id, runId);
    outcomeExecution = phaseExecution("DETERMINISTIC");
  } else {
    const targetTask = { id: task.id, version: task.version, tier: task.tier, task_family: task.task_family, target_task_contract: task.target_task_contract };
    const outcomeEvidence = { task: targetTask, task_input: input, target_output: targetRun.final_text };
    const outcomeRun = await executePhase({ phase: "judge-outcome", model: args["judge-model"], prompt: judgePrompt({ profile: outcomeProfile, task, runId, evidence: outcomeEvidence }), timeoutMs: timeouts.judge, adapter: args["judge-adapter"] ?? "codex-cli", adapterId: args["judge-adapter-id"] });
    outcomeResult = parseJudgeResponse(outcomeRun.final_text, outcomeProfile, task.id, runId, outcomeEvidence);
    outcomeExecution = phaseExecution("EXECUTED", outcomeRun);
    await writeFile(join(runRoot, "judge-outcome.jsonl"), outcomeRun.stdout);
    await writeFile(join(runRoot, "judge-outcome.stderr.log"), outcomeRun.stderr);
  }

  const builderTask = { id: task.id, version: task.version, builder_mode: task.builder_mode, tier: task.tier, task_family: task.task_family, prompt_build_request: task.prompt_build_request, target_task_contract: task.target_task_contract };
  const trajectoryEvidence = ({ task: builderTask, target_model: args["target-model"], target_tier: task.tier, builder_response: builderResponse, generated_prompt: generatedPrompt, rule_contracts: interviewEvidence({ judge_context_paths: task.judge_context_paths ?? ["SKILL.md", `runtime/tier-${task.tier}.md`] }, null, null, subjectSnapshot).rule_contracts });
  const trajectoryCacheKey = sha256(JSON.stringify({ execution_surface_sha256: surfaceDigest, runner_bundle_sha256: runnerBundleDigest, execution_runtime_sha256: EXECUTION_RUNTIME_SHA256, subject_sha256: contractDigest, task_contract_sha256: sha256(task.target_task_contract), adapter: args["judge-adapter"] ?? "codex-cli", adapter_id: args["judge-adapter-id"] ?? null, adapter_config_sha256: adapterConfigDigest, reasoning_effort: judgeReasoningEffort, isolation: "tool-free-staged-subject-v1", task_id: task.id, task_version: task.version, target_model: args["target-model"], target_tier: task.tier, judge_model: args["judge-model"], profile_sha256: sha256(trajectoryProfileText), builder_response_sha256: sha256(builderResponse), generated_prompt_sha256: sha256(generatedPrompt) }));
  const trajectoryCachePath = join(trajectoryCacheRoot, `${trajectoryCacheKey}.json`);
  const cachedTrajectory = args["no-trajectory-cache"] ? null : await readTrajectoryCache(trajectoryCachePath, trajectoryCacheKey, trajectoryProfile, task.id, trajectoryEvidence);
  let trajectoryResult;
  if (cachedTrajectory) {
    trajectoryResult = cachedTrajectory.result;
    trajectoryExecution = phaseExecution("REUSED_PROMPT_CACHE", null, { cache_key: trajectoryCacheKey, source_run_id: cachedTrajectory.source_run_id });
  } else {
    const trajectoryRun = await executePhase({ phase: "judge-trajectory", model: args["judge-model"], prompt: judgePrompt({ profile: trajectoryProfile, task, runId, evidence: trajectoryEvidence }), timeoutMs: timeouts.judge, adapter: args["judge-adapter"] ?? "codex-cli", adapterId: args["judge-adapter-id"] });
    trajectoryResult = parseJudgeResponse(trajectoryRun.final_text, trajectoryProfile, task.id, runId, trajectoryEvidence);
    trajectoryExecution = phaseExecution("EXECUTED", trajectoryRun, { cache_key: trajectoryCacheKey });
    await writeFile(join(runRoot, "judge-trajectory.jsonl"), trajectoryRun.stdout);
    await writeFile(join(runRoot, "judge-trajectory.stderr.log"), trajectoryRun.stderr);
    if (trajectoryResult.valid) {
      await writeJson(trajectoryCachePath, {
        schema_version: 1,
        cache_key: trajectoryCacheKey,
        profile_id: trajectoryProfile.profile_id,
        source_run_id: runId,
        created_at: new Date().toISOString(),
        result_sha256: sha256(JSON.stringify(trajectoryResult)),
        result: trajectoryResult,
        evidence_digests: { builder_response_sha256: sha256(builderResponse), generated_prompt_sha256: sha256(generatedPrompt) },
        excludes: ["target input", "target output", "evaluator", "gold answer", "outcome judgment"]
      });
    }
  }

  judges = {
    status: !outcomeResult.valid || !trajectoryResult.valid ? "INVALID" : [outcomeResult, trajectoryResult].some(r => r.harness_verdict === "BLOCKED") ? "BLOCKED" : "JUDGED",
    outcome_mode: task.outcome_evaluation,
    judge_model: args["judge-model"],
    outcome: outcomeResult,
    trajectory: trajectoryResult,
    conservative_effectiveness_score: outcomeResult.valid && trajectoryResult.valid && Number.isFinite(outcomeResult.score) && Number.isFinite(trajectoryResult.score) ? Math.min(outcomeResult.score, trajectoryResult.score) : null
  };
  await writeJson(join(runRoot, "judge-results.json"), judges);
}

const executions = { prompt_builder: builderExecution, target: targetExecution, outcome_judge: outcomeExecution, trajectory_judge: trajectoryExecution };
executions.total_usage = totalUsage(executions);
const budgetChecks = {
  status: budgets.status,
  prompt_builder: budgetResult(builderExecution, budgets.prompt_builder[task.tier], true),
  target: budgetResult(targetExecution, budgets.target),
  outcome_judge: budgetResult(outcomeExecution, budgets.judge),
  trajectory_judge: budgetResult(trajectoryExecution, budgets.judge)
};
const measuredBudgetStatuses = Object.values(budgetChecks).filter((value) => typeof value === "object" && value?.status && value.status !== "NOT_MEASURED").map((value) => value.status);
budgetChecks.overall = measuredBudgetStatuses.includes("EXCEEDED") ? "EXCEEDED" : measuredBudgetStatuses.length ? "PASS" : "NOT_MEASURED";

const accepted = mechanical.eligible && judges.status === "JUDGED" && judges.outcome.harness_verdict === "PASS" && judges.trajectory.harness_verdict === "PASS";
const semanticAcceptance = !mechanical.eligible ? "REJECTED" : ["NOT_RUN", "INVALID", "BLOCKED"].includes(judges.status) ? judges.status : accepted ? "ACCEPTED" : "REJECTED";
const evidenceGrade = [args["prompt-adapter"], args["target-adapter"], args["judge-adapter"]].every(a => !a || a === "codex-cli") && !args["prompt-response-file"] ? "LIVE_CODEX_TOOL_FREE" : "UNVERIFIED_EXTERNAL_OR_FIXTURE";
const acceptance = ["ACCEPTED", "REJECTED"].includes(semanticAcceptance) && evidenceGrade !== "LIVE_CODEX_TOOL_FREE" ? "UNVERIFIED" : semanticAcceptance;
const pluginManifestText = await readFile(join(dirname(dirname(subjectSkillRoot)), ".codex-plugin/plugin.json"), "utf8");
const summary = {
  schema_version: 2,
  run_id: runId,
  task: { id: task.id, version: task.version, builder_mode: task.builder_mode, tier: task.tier, catalog_id: catalog.catalog_id, outcome_evaluation: task.outcome_evaluation, trajectory_evaluation: task.trajectory_evaluation },
  configuration: {
    configuration_id: configurationId, execution_surface: surfaceReceipts,
    subject_plugin: args["subject-plugin"] ?? "cascade-prompt", subject_skill: args["subject-skill"] ?? "prompt", subject_skill_root: subjectSkillRoot,
    prompt_model: args["prompt-model"], target_model: args["target-model"], judge_model: args["judge-model"] ?? null, reasoning_effort: args["reasoning-effort"],
    judge_reasoning_effort: judgeReasoningEffort,
    adapters: { prompt: args["prompt-adapter"] ?? "codex-cli", target: args["target-adapter"] ?? "codex-cli", judge: args["judge-adapter"] ?? "codex-cli" },
    adapter_ids: { prompt: args["prompt-adapter-id"] ?? null, target: args["target-adapter-id"] ?? null, judge: args["judge-adapter-id"] ?? null },
    timeouts_ms: timeouts
  },
  digests: {
    input_sha256: sha256(input), evaluator_sha256: sha256(evaluatorText), target_task_contract_sha256: sha256(task.target_task_contract), task_catalog_sha256: sha256(catalogText), model_matrix_sha256: sha256(matrixText),
    execution_surface_sha256: surfaceDigest, runner_bundle_sha256: runnerBundleDigest, adapter_config_sha256: adapterConfigDigest, runtime_contract_sha256: contractDigest, runner_sha256: sha256(runnerText), outcome_profile_sha256: sha256(outcomeProfileText), trajectory_profile_sha256: sha256(trajectoryProfileText),
    plugin_manifest_sha256: sha256(pluginManifestText), prompt_builder_response_sha256: sha256(builderResponse), generated_prompt_sha256: sha256(generatedPrompt), target_output_sha256: sha256(targetRun.final_text)
  },
  cache_policy: { builder_cache_key: builderCacheKey, target_inputs_cached: false, evaluators_cached: false, gold_answers_cached: false },
  execution: executions,
  token_budgets: budgetChecks,
  mechanical: { status: mechanical.eligible ? "MECHANICALLY_ELIGIBLE" : "INELIGIBLE", ...mechanical },
  judges,
  calibration: "NOT_RUN",
  evidence_grade: evidenceGrade,
  semantic_acceptance: semanticAcceptance,
  acceptance,
  limitations: ["No global model ranking is implied.", "Token budgets are provisional diagnostics and do not override quality acceptance.", "Latency and usage are observations from this execution surface, not normalized cost benchmarks."]
};
await writeJson(join(runRoot, "run-summary.json"), summary);
console.log(JSON.stringify({ run_root: runRoot, run_id: runId, prompt_builder_status: builderExecution.status, mechanical_status: summary.mechanical.status, judge_status: judges.status, trajectory_status: trajectoryExecution.status, budget_status: budgetChecks.overall, acceptance }, null, 2));
if (["BLOCKED", "INVALID", "UNVERIFIED"].includes(acceptance) || (args["execute-judges"] && acceptance === "NOT_RUN")) process.exitCode = 3;
else if (acceptance === "REJECTED") process.exitCode = 2;
