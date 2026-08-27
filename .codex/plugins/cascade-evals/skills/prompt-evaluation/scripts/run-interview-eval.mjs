#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULT_TIMEOUTS_MS, positiveTimeout, requireCompleted } from "./execution-adapters.mjs";
import { resolveSubjectSkill } from "./subject-plugin.mjs";
import { runAgentResponseSimulation } from "./agent-response-simulation.mjs";

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
  const booleans = new Set(["execute-judge", "execute-target", "installed-plugin"]);
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (!value.startsWith("--")) {
      parsed._.push(value);
      continue;
    }
    const key = value.slice(2);
    if (booleans.has(key)) {
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
  for (const line of jsonl.split(/\r?\n/)) {
    try {
      const event = JSON.parse(line);
      if (event.type === "item.completed" && event.item?.type === "command_execution") commandExecutions += 1;
    } catch {
      // Diagnostic output is not part of trace metrics.
    }
  }
  return { command_executions: commandExecutions };
}

function extractAgentMessage(jsonl) {
  let finalText = "";
  let usage = null;
  for (const line of jsonl.split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      const event = JSON.parse(line);
      if (event.type === "item.completed" && event.item?.type === "agent_message") finalText = event.item.text ?? "";
      if (event.type === "turn.completed") usage = event.usage ?? null;
    } catch {
      // Ignore non-JSON diagnostics.
    }
  }
  if (!finalText) fail("Codex JSONL did not contain a completed agent message");
  return { finalText, usage };
}

function stripSingleFence(value) {
  const trimmed = value.trim();
  const match = trimmed.match(/^```(?:json)?\s*\r?\n([\s\S]*?)\r?\n```$/i);
  return match ? match[1].trim() : trimmed;
}

function tryExtractFinalPrompt(response) {
  const finalSection = response.match(/(?:^|\n)\s*(?:#{1,6}\s*)?(?:\d+[.)]\s*)?(?:\*\*)?Final Prompt(?:\*\*)?\s*:?\s*\r?\n+```[^\n]*\r?\n([\s\S]*?)\r?\n```/i);
  if (finalSection) return finalSection[1].trim();
  const onlyFence = response.match(/^```[^\n]*\r?\n([\s\S]*?)\r?\n```\s*$/);
  return onlyFence ? onlyFence[1].trim() : null;
}

function extractQuestions(text) {
  const section = text.match(/(?:^|\n)\s*(?:#{1,6}\s*)?(?:\*\*)?Questions(?:\*\*)?\s*\r?\n([\s\S]*?)(?=\r?\n\s*(?:#{1,6}\s*)?(?:\*\*)?(?:Safe defaults|Why these matter|Why|Final Prompt|Variables to Fill|Assumptions|Design Notes|Interview Status)(?:\*\*)?\s*(?:\r?\n|$)|$)/i)?.[1] ?? "";
  const questions = section.split(/\r?\n/).map((line) => line.match(/^\s*\d+[.)]\s+(.+?)\s*$/)?.[1]).filter(Boolean);
  if (questions.length) return questions;
  for (const line of text.split(/\r?\n/)) {
    const named = line.match(/^\s*(?:\*\*)?(?:Required\s+)?Question(?:\s+\d+)?(?:\*\*)?\s*:\s*(.+?\?)\s*$/i)?.[1];
    const numbered = line.match(/^\s*\d+[.)]\s+(.+?\?)\s*$/)?.[1];
    const direct = line.match(/^\s*(?![-*]|\d+[.)])([^?]+\?)/)?.[1];
    const imperative = line.match(/^\s*(Please\s+(?:specify|choose|confirm|provide)\b.+?):\s*$/i)?.[1];
    const boundary = line.match(/^\s*(One\s+(?:permission|authority|output)\b.+?must be resolved.+?):\s*$/i)?.[1];
    const question = named ?? numbered ?? direct ?? imperative ?? boundary;
    if (question) questions.push(question);
  }
  return questions;
}

function inspectResponse(text, intentPatterns) {
  const finalPrompt = tryExtractFinalPrompt(text);
  let state = "INVALID";
  if (/Interview Status:\s*NEEDS_INPUT/i.test(text)) state = "NEEDS_INPUT";
  else if (/Interview Status:\s*BLOCKED/i.test(text) || /(?:^|\n)\s*(?:#{1,6}\s*)?BLOCKED\b/i.test(text)) state = "BLOCKED";
  else if (finalPrompt) state = "READY";
  const questions = extractQuestions(text);
  const questionText = questions.join(" ").toLowerCase();
  const intents = Object.entries(intentPatterns).filter(([, patterns]) => patterns.some((pattern) => questionText.includes(pattern.toLowerCase()))).map(([intent]) => intent);
  return { state, final_prompt: finalPrompt, questions, intents };
}

function validateTurn(label, expected, response, intentPatterns) {
  const inspected = inspectResponse(response, intentPatterns);
  const checks = [];
  const add = (id, passed, detail = undefined) => checks.push({ id: `${label}:${id}`, passed, ...(detail ? { detail } : {}) });
  add("state", inspected.state === expected.state, `expected ${expected.state}, received ${inspected.state}`);
  add("question-min", inspected.questions.length >= expected.min_questions, `received ${inspected.questions.length}`);
  add("question-max", inspected.questions.length <= expected.max_questions, `received ${inspected.questions.length}`);
  if (expected.state === "NEEDS_INPUT") add("no-final-prompt", !inspected.final_prompt);
  if (expected.state === "READY") add("has-final-prompt", Boolean(inspected.final_prompt));
  for (const intent of expected.required_intents ?? []) add(`required-intent:${intent}`, inspected.intents.includes(intent), `detected ${inspected.intents.join(", ") || "none"}`);
  for (const intent of expected.forbidden_intents ?? []) add(`forbidden-intent:${intent}`, !inspected.intents.includes(intent), `detected ${inspected.intents.join(", ") || "none"}`);
  const lowered = response.toLowerCase();
  for (const pattern of expected.required_response_patterns ?? []) add(`required-pattern:${pattern}`, lowered.includes(pattern.toLowerCase()));
  for (const pattern of expected.forbidden_response_patterns ?? []) add(`forbidden-pattern:${pattern}`, !lowered.includes(pattern.toLowerCase()));
  return { inspected, checks, eligible: checks.every((check) => check.passed) };
}

function phase(run, status = "EXECUTED") {
  return { status, duration_ms: run?.duration_ms ?? 0, usage: run?.usage ?? null, trace_metrics: run?.trace_metrics ?? null, simulation: run?.simulation ?? null };
}

function budgetResult(execution, budget) {
  if (!execution?.usage) return { status: "NOT_MEASURED", reasons: [] };
  const reasons = [];
  if (execution.usage.input_tokens > budget.max_input_tokens) reasons.push(`input_tokens>${budget.max_input_tokens}`);
  if (execution.usage.noncached_input_tokens > budget.max_noncached_input_tokens) reasons.push(`noncached_input_tokens>${budget.max_noncached_input_tokens}`);
  if (execution.trace_metrics?.command_executions > budget.max_command_executions) reasons.push(`command_executions>${budget.max_command_executions}`);
  return { status: reasons.length ? "EXCEEDED" : "PASS", reasons, observed: execution };
}

function judgePrompt(profile, fixture, runId, evidence) {
  const contract = { profile_id: profile.profile_id, rubric_version: 1, fixture_id: fixture.id, run_id: runId, ratings: [{ dimension_id: "profile dimension", rating: "integer 0-4", rationale: "concise", evidence: ["specific fragment"] }], verdict: "PASS | FAIL | BLOCKED", missing_evidence: [] };
  return `You are an independent adaptive-interview judge. Return exactly one JSON object and no Markdown. Apply the profile literally. Rate each dimension once from 0-4 with concise evidence. Do not compute a total.\n\n<judge_profile>\n${JSON.stringify(profile, null, 2)}\n</judge_profile>\n\n<response_contract>\n${JSON.stringify(contract, null, 2)}\n</response_contract>\n\n<evidence>\n${JSON.stringify(evidence, null, 2)}\n</evidence>`;
}

function parseJudge(text, profile, fixtureId, runId) {
  let response;
  try {
    response = JSON.parse(stripSingleFence(text));
  } catch (error) {
    return { valid: false, error: `invalid judge JSON: ${error.message}` };
  }
  const ids = profile.dimensions.map((dimension) => dimension.id);
  const ratings = response.ratings ?? [];
  const valid = response.profile_id === profile.profile_id && response.rubric_version === 1 && response.fixture_id === fixtureId && response.run_id === runId && ["PASS", "FAIL", "BLOCKED"].includes(response.verdict) && Array.isArray(response.missing_evidence) && ratings.length === ids.length && new Set(ratings.map((rating) => rating.dimension_id)).size === ids.length && ids.every((id) => ratings.some((rating) => rating.dimension_id === id)) && ratings.every((rating) => Number.isInteger(rating.rating) && rating.rating >= 0 && rating.rating <= 4 && typeof rating.rationale === "string" && Array.isArray(rating.evidence));
  if (!valid) return { valid: false, error: "judge response violates the profile contract", response };
  const byId = new Map(ratings.map((rating) => [rating.dimension_id, rating.rating]));
  const score = profile.dimensions.reduce((sum, dimension) => sum + dimension.weight * byId.get(dimension.id) / 4, 0) / 100;
  const floorPassed = ratings.every((rating) => rating.rating >= profile.minimum_dimension_rating);
  return { valid: true, score, floor_passed: floorPassed, harness_verdict: response.verdict !== "BLOCKED" && score >= profile.threshold && floorPassed ? "PASS" : "FAIL", response };
}

const args = parseArgs(process.argv.slice(2));
const command = args._[0] ?? "list";
const catalogText = await readFile(join(evalRoot, "interviews/catalog.json"), "utf8");
const catalog = JSON.parse(catalogText);
if (command === "list") {
  console.log(JSON.stringify({ catalog_id: catalog.catalog_id, fixtures: catalog.fixtures.map(({ id, tier, expected_mode, first_turn, second_turn }) => ({ id, tier, expected_mode, first_state: first_turn.state, second_state: second_turn?.state ?? null })) }, null, 2));
  process.exit(0);
}
if (command !== "run") fail(`unknown command: ${command}`);
if (!args.fixture) fail("--fixture is required");
args.model ??= "gpt-5.6-sol";
args["reasoning-effort"] ??= "max";
if (args["execute-judge"]) args["judge-model"] ??= "gpt-5.6-sol";
if (args["execute-target"]) args["target-model"] ??= "gpt-5.6-sol";

const fixture = catalog.fixtures.find((candidate) => candidate.id === args.fixture);
if (!fixture) fail(`unknown fixture: ${args.fixture}`);
if (args["execute-target"] && !fixture.target) fail(`${fixture.id} has no target execution contract`);
const subjectSkillRoot = await resolveSubjectSkill({ explicitPath: args["subject-skill-root"], pluginName: args["subject-plugin"] ?? "cascade-prompt", skillName: args["subject-skill"] ?? "prompt" });

const runId = `${fixture.id}-${new Date().toISOString().replace(/[:.]/g, "-")}`;
const outputRoot = resolve(args["output-dir"] ?? join(process.cwd(), ".artifacts/prompt-interviews"));
const runRoot = join(outputRoot, runId);
const workspace = join(runRoot, "workspace");
await mkdir(workspace, { recursive: true });
const timeouts = {
  turn: positiveTimeout(args["turn-timeout-ms"], DEFAULT_TIMEOUTS_MS.prompt_builder, "--turn-timeout-ms"),
  target: positiveTimeout(args["target-timeout-ms"], DEFAULT_TIMEOUTS_MS[fixture.tier], "--target-timeout-ms"),
  judge: positiveTimeout(args["judge-timeout-ms"], DEFAULT_TIMEOUTS_MS.judge, "--judge-timeout-ms")
};
async function executePhase({ phaseName, model, prompt, timeoutMs, adapter, adapterId }) {
  return requireCompleted(await runAgentResponseSimulation({ phase: phaseName, runId, runRoot, model, reasoningEffort: args["reasoning-effort"], prompt, cwd: workspace, timeoutMs, adapter, adapterConfig: args["adapter-config"], adapterId }), { phase: phaseName, runRoot });
}

const skillInstruction = args["installed-plugin"]
  ? "Use the installed $prompt skill; do not search for a source checkout or alternate cache. After opening its SKILL.md, batch required runtime-pack reads into one command."
  : `Read the subject skill directly from ${join(subjectSkillRoot, "SKILL.md")} and load only required packs. After reading SKILL.md, batch all required runtime-pack reads into one command.`;
const firstPrompt = `Use $prompt to handle this prompt-building request. Builder mode is INTERVIEW. ${skillInstruction} Preserve the three-state adaptive interview contract.\n\n<fixture_id>${fixture.id}</fixture_id>\n<prompt_build_request>\n${fixture.prompt_build_request}\n</prompt_build_request>`;
let firstRun = null;
let firstResponse;
if (args["first-response-file"]) firstResponse = await readFile(resolve(args["first-response-file"]), "utf8");
else {
  firstRun = await executePhase({ phaseName: "first-turn", model: args.model, prompt: firstPrompt, timeoutMs: timeouts.turn, adapter: args["model-adapter"] ?? "codex-cli", adapterId: args["model-adapter-id"] });
  firstResponse = firstRun.final_text;
  await writeFile(join(runRoot, "first-turn.jsonl"), firstRun.stdout);
  await writeFile(join(runRoot, "first-turn.stderr.log"), firstRun.stderr);
}
await writeFile(join(runRoot, "first-response.md"), firstResponse);
const first = validateTurn("first", fixture.first_turn, firstResponse, catalog.intent_patterns);

let secondRun = null;
let secondResponse = null;
let second = null;
if (fixture.second_user_message) {
  const secondPrompt = `Continue the same Cascade Prompt interaction by reconstructing semantic state from this ordered transcript. Apply only the new user message, preserve unrelated resolved fields, and do not repeat answered questions. ${skillInstruction}\n\n<fixture_id>${fixture.id}</fixture_id>\n<transcript>\n<user>${fixture.prompt_build_request}</user>\n<assistant>${firstResponse}</assistant>\n<user>${fixture.second_user_message}</user>\n</transcript>`;
  if (args["second-response-file"]) secondResponse = await readFile(resolve(args["second-response-file"]), "utf8");
  else {
    secondRun = await executePhase({ phaseName: "second-turn", model: args.model, prompt: secondPrompt, timeoutMs: timeouts.turn, adapter: args["model-adapter"] ?? "codex-cli", adapterId: args["model-adapter-id"] });
    secondResponse = secondRun.final_text;
    await writeFile(join(runRoot, "second-turn.jsonl"), secondRun.stdout);
    await writeFile(join(runRoot, "second-turn.stderr.log"), secondRun.stderr);
  }
  await writeFile(join(runRoot, "second-response.md"), secondResponse);
  second = validateTurn("second", fixture.second_turn, secondResponse, catalog.intent_patterns);
  const firstQuestions = new Set(first.inspected.questions.map((question) => question.toLowerCase().replace(/\s+/g, " ").trim()));
  const repeated = second.inspected.questions.filter((question) => firstQuestions.has(question.toLowerCase().replace(/\s+/g, " ").trim()));
  second.checks.push({ id: "second:no-exact-repeat", passed: repeated.length === 0, ...(repeated.length ? { detail: repeated.join(" | ") } : {}) });
  second.eligible = second.checks.every((check) => check.passed);
}

let targetRun = null;
let targetExecutionStatus = "NOT_RUN";
let targetChecks = [];
if (args["execute-target"]) {
  const readyResponse = fixture.second_turn?.state === "READY" ? secondResponse : firstResponse;
  const finalPrompt = tryExtractFinalPrompt(readyResponse ?? "");
  targetChecks.push({ id: "target:ready-final-prompt", passed: Boolean(finalPrompt) });
  targetChecks.push({ id: `target:placeholder:${fixture.target.input_placeholder}`, passed: Boolean(finalPrompt?.includes(fixture.target.input_placeholder)) });
  if (finalPrompt?.includes(fixture.target.input_placeholder)) {
    const rendered = finalPrompt.split(fixture.target.input_placeholder).join(fixture.target.input);
    targetRun = await executePhase({ phaseName: "target", model: args["target-model"], prompt: rendered, timeoutMs: timeouts.target, adapter: args["target-adapter"] ?? "codex-cli", adapterId: args["target-adapter-id"] });
    targetExecutionStatus = "EXECUTED";
    await writeFile(join(runRoot, "target.jsonl"), targetRun.stdout);
    await writeFile(join(runRoot, "target-output.md"), targetRun.final_text);
    const lowered = targetRun.final_text.toLowerCase();
    for (const pattern of fixture.target.required_patterns ?? []) targetChecks.push({ id: `target:required:${pattern}`, passed: lowered.includes(pattern.toLowerCase()) });
    for (const pattern of fixture.target.forbidden_patterns ?? []) targetChecks.push({ id: `target:forbidden:${pattern}`, passed: !lowered.includes(pattern.toLowerCase()) });
  } else targetExecutionStatus = "SKIPPED_INVALID_READY_RESPONSE";
}

const allChecks = [...first.checks, ...(second?.checks ?? []), ...targetChecks];
const mechanicalEligible = allChecks.every((check) => check.passed);
const profileText = await readFile(join(evalRoot, "judges/interview-v1.json"), "utf8");
const profile = JSON.parse(profileText);
let judgeRun = null;
let judge = { status: "NOT_RUN", result: null };
if (args["execute-judge"] && mechanicalEligible) {
  judgeRun = await executePhase({ phaseName: "judge", model: args["judge-model"], prompt: judgePrompt(profile, fixture, runId, { fixture, first_response: firstResponse, second_response: secondResponse, deterministic_checks: allChecks }), timeoutMs: timeouts.judge, adapter: args["judge-adapter"] ?? "codex-cli", adapterId: args["judge-adapter-id"] });
  await writeFile(join(runRoot, "judge.jsonl"), judgeRun.stdout);
  const result = parseJudge(judgeRun.final_text, profile, fixture.id, runId);
  judge = { status: result.valid ? "JUDGED" : "INVALID", result };
} else if (args["execute-judge"]) judge = { status: "SKIPPED_MECHANICAL_INELIGIBLE", result: null };

const budgets = await readJson(join(evalRoot, "token-budgets.json"));
const execution = {
  first_turn: firstRun ? phase(firstRun) : phase(null, "REUSED_EXPLICIT_RESPONSE"),
  second_turn: fixture.second_user_message ? (secondRun ? phase(secondRun) : phase(null, "REUSED_EXPLICIT_RESPONSE")) : phase(null, "NOT_APPLICABLE"),
  target: targetRun ? phase(targetRun) : phase(null, targetExecutionStatus),
  judge: judgeRun ? phase(judgeRun) : phase(null, judge.status === "SKIPPED_MECHANICAL_INELIGIBLE" ? judge.status : "NOT_RUN")
};
const budgetChecks = {
  status: budgets.status,
  first_turn: budgetResult(execution.first_turn, budgets.interview.first_turn),
  second_turn: budgetResult(execution.second_turn, budgets.interview.answer_turn),
  target: budgetResult(execution.target, budgets.target)
};
const accepted = mechanicalEligible && (!args["execute-judge"] || (judge.status === "JUDGED" && judge.result.harness_verdict === "PASS"));
const acceptance = !mechanicalEligible ? "REJECTED" : args["execute-judge"] ? (accepted ? "ACCEPTED" : "REJECTED") : "MECHANICALLY_ELIGIBLE";
const runnerText = await readFile(fileURLToPath(import.meta.url), "utf8");
const summary = {
  schema_version: 1,
  run_id: runId,
  fixture: { id: fixture.id, version: fixture.version, catalog_id: catalog.catalog_id, tier: fixture.tier, expected_mode: fixture.expected_mode },
  configuration: {
    subject_plugin: args["subject-plugin"] ?? "cascade-prompt", subject_skill: args["subject-skill"] ?? "prompt", subject_skill_root: subjectSkillRoot,
    model: args.model, installed_plugin: Boolean(args["installed-plugin"]), judge_model: args["judge-model"] ?? null, target_model: args["target-model"] ?? null, reasoning_effort: args["reasoning-effort"],
    adapters: { model: args["model-adapter"] ?? "codex-cli", target: args["target-adapter"] ?? "codex-cli", judge: args["judge-adapter"] ?? "codex-cli" },
    adapter_ids: { model: args["model-adapter-id"] ?? null, target: args["target-adapter-id"] ?? null, judge: args["judge-adapter-id"] ?? null },
    timeouts_ms: timeouts
  },
  digests: { catalog_sha256: sha256(catalogText), fixture_sha256: sha256(JSON.stringify(fixture)), profile_sha256: sha256(profileText), runner_sha256: sha256(runnerText), first_response_sha256: sha256(firstResponse), second_response_sha256: secondResponse ? sha256(secondResponse) : null, target_output_sha256: targetRun ? sha256(targetRun.final_text) : null },
  execution,
  token_budgets: budgetChecks,
  turns: { first: { ...first, response_sha256: sha256(firstResponse) }, second: second ? { ...second, response_sha256: sha256(secondResponse) } : null },
  target: { status: args["execute-target"] ? (targetChecks.every((check) => check.passed) ? "PASS" : "FAIL") : "NOT_RUN", checks: targetChecks },
  mechanical: { status: mechanicalEligible ? "MECHANICALLY_ELIGIBLE" : "INELIGIBLE", eligible: mechanicalEligible, checks: allChecks },
  judge,
  acceptance,
  limitations: ["Intent patterns are deterministic eligibility aids, not semantic proof.", "No global model ranking is implied.", "Token budgets are provisional diagnostics."]
};
await writeJson(join(runRoot, "run-summary.json"), summary);
console.log(JSON.stringify({ run_root: runRoot, run_id: runId, first_state: first.inspected.state, second_state: second?.inspected.state ?? null, target_status: summary.target.status, judge_status: judge.status, mechanical_status: summary.mechanical.status, acceptance }, null, 2));
if (!mechanicalEligible) process.exitCode = 2;
