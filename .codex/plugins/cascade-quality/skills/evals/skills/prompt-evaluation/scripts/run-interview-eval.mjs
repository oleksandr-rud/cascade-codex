#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULT_TIMEOUTS_MS, positiveTimeout, requireCompleted, executionSurface, EXECUTION_RUNTIME_SHA256 } from "./execution-adapters.mjs";
import { resolveSubjectSkill } from "./subject-plugin.mjs";
import { runModelPhase } from "./execution-adapters.mjs";
import { snapshotSubject, judgeRequest, parseJudgment, interviewEvidence, assertDisjointRoots, runnerDigest, subjectReadChecks } from "./evaluation-integrity.mjs";
import { replaySubject, replayTarget } from "./replay-evidence.mjs";
import { runSubjectSession } from "./subject-session.mjs";
import { interviewObservationVersion, interviewInspectionRequest, parseInterviewObservation, unresolvedInterviewObservation, validateObservedTurn } from "./interview-observation.mjs";

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

function phase(run, status = "EXECUTED") {
  return { status: run?.replay ? "REUSED_VERIFIED_RUN" : status, replay:run?.replay ?? null, duration_ms: run?.duration_ms ?? 0, usage: run?.usage ?? null, trace_metrics: run?.trace_metrics ?? null, receipt: run?.execution_receipt ?? null, receipts: run?.execution_receipts ?? null, subject_reads: run?.subject_reads ?? null, isolation: run?.isolation ?? (run ? "tool-free-v1" : null) };
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
  return judgeRequest(profile, { fixture_id: fixture.id, run_id: runId }, evidence);
}
function parseJudge(text, profile, fixtureId, runId, evidence) {
  return parseJudgment(text, profile, { fixture_id: fixtureId, run_id: runId }, evidence);
}

const args = parseArgs(process.argv.slice(2));
if (args["installed-plugin"]) fail("--installed-plugin cannot verify native discovery; this runner uses an isolated staged subject. Audit native installed-plugin discovery separately.");
if (args["reuse-run-root"] && (args["first-response-file"] || args["second-response-file"])) fail("cannot combine verified replay with explicit response files");
const command = args._[0] ?? "list";
const catalogText = await readFile(join(evalRoot, "interviews/catalog.json"), "utf8");
const catalog = JSON.parse(catalogText);
if (command === "list") {
  console.log(JSON.stringify({ catalog_id: catalog.catalog_id, fixtures: catalog.fixtures.map(({ id, tier, expected_mode, first_turn, second_turn }) => ({ id, tier, expected_mode, first_state: first_turn.state, second_state: second_turn?.state ?? null })) }, null, 2));
  process.exit(0);
}
if (command !== "run") fail(`unknown command: ${command}`);
if (!args.fixture) fail("--fixture is required");
args.model ??= "gpt-6-astra";
args["reasoning-effort"] ??= "high";
const judgeReasoningEffort = args["judge-reasoning-effort"] ?? args["reasoning-effort"];
const interpretationModel = args["interpretation-model"] ?? args.model;
const interpretationEffort = args["interpretation-reasoning-effort"] ?? args["reasoning-effort"];
const interpretationAdapter = args["interpretation-adapter"] ?? args["model-adapter"] ?? "codex-cli";
const interpretationAdapterId = args["interpretation-adapter-id"] ?? args["model-adapter-id"];
if (args["execute-judge"]) args["judge-model"] ??= "gpt-6-astra";
if (args["execute-target"]) args["target-model"] ??= "gpt-6-astra";

const fixture = catalog.fixtures.find((candidate) => candidate.id === args.fixture);
if (!fixture) fail(`unknown fixture: ${args.fixture}`);
if (args["execute-target"] && !fixture.target) fail(`${fixture.id} has no target execution contract`);
const subjectSkillRoot = await resolveSubjectSkill({ explicitPath: args["subject-skill-root"], pluginName: args["subject-plugin"] ?? "cascade-prompt", skillName: args["subject-skill"] ?? "prompt" });

const subjectSnapshot = await snapshotSubject(subjectSkillRoot);
const runId = args["run-id"] ?? `${fixture.id}-${new Date().toISOString().replace(/[:.]/g, "-")}`;
if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(runId)) fail("unsafe run ID");
const outputRoot = resolve(args["output-dir"] ?? join(process.cwd(), ".artifacts/prompt-interviews"));
assertDisjointRoots(subjectSkillRoot, outputRoot);
const runnerText = await readFile(fileURLToPath(import.meta.url), "utf8");
const runRoot = join(outputRoot, runId);
const workspace = join(runRoot, "workspace");
await mkdir(outputRoot, { recursive: true });
await mkdir(runRoot);
await mkdir(workspace);
await writeJson(join(runRoot, "subject-manifest.json"), subjectSnapshot.manifest);
const timeouts = {
  turn: positiveTimeout(args["turn-timeout-ms"], DEFAULT_TIMEOUTS_MS.prompt_builder, "--turn-timeout-ms"),
  target: positiveTimeout(args["target-timeout-ms"], DEFAULT_TIMEOUTS_MS[fixture.tier], "--target-timeout-ms"),
  judge: positiveTimeout(args["judge-timeout-ms"], DEFAULT_TIMEOUTS_MS.judge, "--judge-timeout-ms")
};
async function executePhase({ phaseName, model, prompt, timeoutMs, adapter, adapterId }) {
  return requireCompleted(await runModelPhase({ phase: phaseName, runId, runRoot, model, reasoningEffort: phaseName === "judge" ? judgeReasoningEffort : phaseName.includes("-inspection-") ? interpretationEffort : args["reasoning-effort"], prompt, cwd: workspace, timeoutMs, adapter, adapterConfig: args["adapter-config"], adapterId }), { phase: phaseName, runRoot });
}

const surfaceReceipts = Object.fromEntries(["model", "target", "judge"].map(phase => [phase, executionSurface(args[`${phase}-adapter`] ?? "codex-cli", args["adapter-config"], args[`${phase}-adapter-id`])]));
surfaceReceipts.interpretation = executionSurface(interpretationAdapter, args["adapter-config"], interpretationAdapterId);
const surfaceDigest = sha256(JSON.stringify(surfaceReceipts));
const profileText = await readFile(join(evalRoot, "judges/interview-v5.json"), "utf8");
const profile = JSON.parse(profileText);
const runnerBundleDigest = await runnerDigest(dirname(fileURLToPath(import.meta.url)));
const adapterConfigDigest = args["adapter-config"] ? sha256(await readFile(resolve(args["adapter-config"]), "utf8")) : null;
await writeJson(join(runRoot, "run-contract.json"), { fixture, interpretation_protocol: interviewObservationVersion, interpretation_model: interpretationModel, interpretation_effort: interpretationEffort, execution_runtime_sha256: EXECUTION_RUNTIME_SHA256, subject_sha256: subjectSnapshot.sha256, execution_surface_sha256: surfaceDigest, runner_bundle_sha256: runnerBundleDigest, adapter_config_sha256: adapterConfigDigest, profile_sha256: sha256(profileText), args });
const interpretationRuns = { first: [], second: [], target: [] };
async function inspectTurn(turn, response, expected) {
  const request = interviewInspectionRequest({ response, fixtureId: fixture.id, turn, intentDefinitions: catalog.intent_definitions, expected });
  await writeJson(join(runRoot, turn + "-inspection-request.json"), request);
  let repair = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const phaseName = turn + "-inspection-" + attempt;
    const prompt = JSON.stringify({ ...request, ...(repair ? { format_repair: repair } : {}) });
    const run = await executePhase({ phaseName, model: interpretationModel, prompt, timeoutMs: timeouts.judge, adapter: interpretationAdapter, adapterId: interpretationAdapterId });
    interpretationRuns[turn].push(phase(run));
    await writeFile(join(runRoot, phaseName + ".jsonl"), run.stdout);
    await writeFile(join(runRoot, phaseName + ".stderr.log"), run.stderr);
    await writeFile(join(runRoot, phaseName + ".response.json"), run.final_text);
    try {
      const observation = parseInterviewObservation(run.final_text, request);
      await writeJson(join(runRoot, turn + "-observation.json"), observation);
      return observation;
    } catch (error) { repair = String(error.message); }
  }
  const observation = unresolvedInterviewObservation(request, "Structured interpretation remained invalid after one format repair: " + repair);
  await writeJson(join(runRoot, turn + "-observation.json"), observation);
  return observation;
}
const skillInstruction = "Follow the frozen subject SKILL.md and request only the required files through the host read protocol.";
const firstPrompt = `Use $prompt to handle this prompt-building request. Builder mode is INTERVIEW. ${skillInstruction} Preserve the three-state adaptive interview contract.\n\n<fixture_id>${fixture.id}</fixture_id>\n<prompt_build_request>\n${fixture.prompt_build_request}\n</prompt_build_request>`;
let firstRun = null;
let firstResponse;
if (args["first-response-file"]) firstResponse = await readFile(resolve(args["first-response-file"]), "utf8");
else {
  firstRun = args["reuse-run-root"] ? await replaySubject({sourceRoot:args["reuse-run-root"],phase:"first-turn",request:firstPrompt,currentCase:fixture,snapshot:subjectSnapshot,model:args.model,reasoningEffort:args["reasoning-effort"],runRoot}) : await runSubjectSession({ snapshot: subjectSnapshot, phase: "first-turn", runId, runRoot, model: args.model, reasoningEffort: args["reasoning-effort"], request: firstPrompt, cwd: workspace, timeoutMs: timeouts.turn, adapter: args["model-adapter"] ?? "codex-cli", adapterConfig: args["adapter-config"], adapterId: args["model-adapter-id"] });
  firstResponse = firstRun.final_text;
  await writeFile(join(runRoot, "first-turn.jsonl"), firstRun.stdout);
  await writeFile(join(runRoot, "first-turn.stderr.log"), firstRun.stderr);
}
await writeFile(join(runRoot, "first-response.md"), firstResponse);
const first = validateObservedTurn("first", fixture.first_turn, await inspectTurn("first", firstResponse, fixture.first_turn));

let secondRun = null;
let secondResponse = null;
let second = null;
if (fixture.second_user_message) {
  const secondPrompt = `Continue the same Cascade Prompt interaction by reconstructing semantic state from this ordered transcript. Apply only the new user message, preserve unrelated resolved fields, and do not repeat answered questions. ${skillInstruction}\n\n<fixture_id>${fixture.id}</fixture_id>\n<transcript>\n<user>${fixture.prompt_build_request}</user>\n<assistant>${firstResponse}</assistant>\n<user>${fixture.second_user_message}</user>\n</transcript>`;
  if (args["second-response-file"]) secondResponse = await readFile(resolve(args["second-response-file"]), "utf8");
  else {
    secondRun = args["reuse-run-root"] ? await replaySubject({sourceRoot:args["reuse-run-root"],phase:"second-turn",request:secondPrompt,currentCase:fixture,snapshot:subjectSnapshot,model:args.model,reasoningEffort:args["reasoning-effort"],runRoot}) : await runSubjectSession({ snapshot: subjectSnapshot, phase: "second-turn", runId, runRoot, model: args.model, reasoningEffort: args["reasoning-effort"], request: secondPrompt, cwd: workspace, timeoutMs: timeouts.turn, adapter: args["model-adapter"] ?? "codex-cli", adapterConfig: args["adapter-config"], adapterId: args["model-adapter-id"] });
    secondResponse = secondRun.final_text;
    await writeFile(join(runRoot, "second-turn.jsonl"), secondRun.stdout);
    await writeFile(join(runRoot, "second-turn.stderr.log"), secondRun.stderr);
  }
  await writeFile(join(runRoot, "second-response.md"), secondResponse);
  second = validateObservedTurn("second", fixture.second_turn, await inspectTurn("second", secondResponse, fixture.second_turn));
  const firstQuestions = new Set(first.inspected.questions);
  const repeated = second.inspected.questions.filter((question) => firstQuestions.has(question));
  // Repetition is only a defect when the user already resolved that question.
  // Preserve exact repeats for inspection; the independent answer-merge judge
  // evaluates resolution against the actual user reply.
  second.repeated_questions = repeated;
  second.eligible = second.checks.every((check) => check.passed);
}

let targetRun = null;
let targetExecutionStatus = "NOT_RUN";
let targetChecks = [];
if (args["execute-target"]) {
  const readyTurn = second ?? first;
  const finalPrompt = readyTurn.eligible && readyTurn.inspected.state === "READY" ? readyTurn.inspected.final_prompt : null;
  targetChecks.push({ id: "target:ready-final-prompt", passed: Boolean(finalPrompt) });
  targetChecks.push({ id: `target:placeholder:${fixture.target.input_placeholder}`, passed: Boolean(finalPrompt?.includes(fixture.target.input_placeholder)) });
  if (finalPrompt?.includes(fixture.target.input_placeholder)) {
    const rendered = finalPrompt.split(fixture.target.input_placeholder).join(fixture.target.input);
    targetRun = args["reuse-run-root"] ? await replayTarget({sourceRoot:args["reuse-run-root"],currentCase:fixture,snapshot:subjectSnapshot,model:args["target-model"],reasoningEffort:args["reasoning-effort"],prompt:rendered,runRoot}) : await executePhase({ phaseName: "target", model: args["target-model"], prompt: rendered, timeoutMs: timeouts.target, adapter: args["target-adapter"] ?? "codex-cli", adapterId: args["target-adapter-id"] });
    targetExecutionStatus = "EXECUTED";
    await writeFile(join(runRoot, "target.jsonl"), targetRun.stdout);
    await writeFile(join(runRoot, "target-output.md"), targetRun.final_text);
    if (fixture.target.json_contract) {
      let parsed; try { parsed = JSON.parse(targetRun.final_text); } catch { /* a malformed response fails the declared contract */ }
      const expected = fixture.target.json_contract;
      targetChecks.push({ id: "target:json-contract", passed: Boolean(parsed && !Array.isArray(parsed) && JSON.stringify(Object.keys(parsed).sort()) === JSON.stringify(Object.keys(expected).sort()) && Object.entries(expected).every(([key, type]) => type === "string_array" && Array.isArray(parsed[key]) && parsed[key].every(value => typeof value === "string"))) });
    }
    if ((fixture.target.required_patterns?.length ?? 0) + (fixture.target.forbidden_patterns?.length ?? 0) > 0) {
      const observation = await inspectTurn("target", targetRun.final_text, fixture.target);
      targetChecks.push({ id: "target:interpretation", passed: observation.resolution === "RESOLVED" && observation.uncertainty.length === 0 });
      for (const item of observation.obligations) targetChecks.push({ id: `target:obligation:${item.id}`, passed: item.verdict === "PASS" });
    }
  } else targetExecutionStatus = "SKIPPED_INVALID_READY_RESPONSE";
}

const readChecks = [...subjectReadChecks(fixture.first_turn, firstRun, "first"), ...subjectReadChecks(fixture.second_turn ?? {}, secondRun, "second")];
const allChecks = [...first.checks, ...(second?.checks ?? []), ...targetChecks, ...readChecks];
const mechanicalEligible = allChecks.every((check) => check.passed);

let judgeRun = null;
let judge = { status: "NOT_RUN", result: null };
if (args["execute-judge"] && mechanicalEligible) {
  const evidence = interviewEvidence(fixture, firstResponse, secondResponse, subjectSnapshot);
  judgeRun = await executePhase({ phaseName: "judge", model: args["judge-model"], prompt: judgePrompt(profile, fixture, runId, evidence), timeoutMs: timeouts.judge, adapter: args["judge-adapter"] ?? "codex-cli", adapterId: args["judge-adapter-id"] });
  await writeFile(join(runRoot, "judge.jsonl"), judgeRun.stdout);
  const result = parseJudge(judgeRun.final_text, profile, fixture.id, runId, evidence);
  judge = { status: !result.valid ? "INVALID" : result.harness_verdict === "BLOCKED" ? "BLOCKED" : "JUDGED", result };
} else if (args["execute-judge"]) judge = { status: "SKIPPED_MECHANICAL_INELIGIBLE", result: null };

const budgets = await readJson(join(evalRoot, "token-budgets.json"));
const execution = {
  interpretations: interpretationRuns,
  first_turn: firstRun ? phase(firstRun) : phase(null, "REUSED_EXPLICIT_RESPONSE"),
  second_turn: fixture.second_user_message ? (secondRun ? phase(secondRun) : phase(null, "REUSED_EXPLICIT_RESPONSE")) : phase(null, "NOT_APPLICABLE"),
  target: targetRun ? phase(targetRun) : phase(null, targetExecutionStatus),
  judge: judgeRun ? phase(judgeRun) : phase(null, judge.status === "SKIPPED_MECHANICAL_INELIGIBLE" ? judge.status : "NOT_RUN")
};
const budgetChecks = {
  status: budgets.status,
  interpretations: Object.fromEntries(Object.entries(interpretationRuns).map(([turn, runs]) => [turn, runs.map(run => budgetResult(run, budgets.judge))])),
  first_turn: budgetResult(execution.first_turn, budgets.interview.first_turn),
  second_turn: budgetResult(execution.second_turn, budgets.interview.answer_turn),
  target: budgetResult(execution.target, budgets.target)
};
const accepted = mechanicalEligible && (!args["execute-judge"] || (judge.status === "JUDGED" && judge.result.harness_verdict === "PASS"));
const semanticAcceptance = !mechanicalEligible ? "REJECTED" : args["execute-judge"] ? (["BLOCKED", "INVALID"].includes(judge.status) ? judge.status : accepted ? "ACCEPTED" : "REJECTED") : "MECHANICALLY_ELIGIBLE";
const evidenceGrade = [args["model-adapter"], args["target-adapter"], args["judge-adapter"], interpretationAdapter].every(a => !a || a === "codex-cli") && !args["first-response-file"] && !args["second-response-file"] ? "LIVE_CODEX_TOOL_FREE" : "UNVERIFIED_EXTERNAL_OR_FIXTURE";
const acceptance = ["ACCEPTED", "REJECTED"].includes(semanticAcceptance) && evidenceGrade !== "LIVE_CODEX_TOOL_FREE" ? "UNVERIFIED" : semanticAcceptance;
const summary = {
  schema_version: 1,
  run_id: runId,
  fixture: { id: fixture.id, version: fixture.version, catalog_id: catalog.catalog_id, tier: fixture.tier, expected_mode: fixture.expected_mode },
  configuration: {
    configuration_id: sha256(JSON.stringify({ model: args.model, judge: args["judge-model"], target: args["target-model"], effort: args["reasoning-effort"], judge_effort: judgeReasoningEffort, interpretation_model: interpretationModel, interpretation_effort: interpretationEffort, surface: surfaceDigest })), execution_surface: surfaceReceipts,
    subject_plugin: args["subject-plugin"] ?? "cascade-prompt", subject_skill: args["subject-skill"] ?? "prompt", subject_skill_root: subjectSkillRoot,
    model: args.model, installed_plugin: Boolean(args["installed-plugin"]), judge_model: args["judge-model"] ?? null, target_model: args["target-model"] ?? null, reasoning_effort: args["reasoning-effort"],
    judge_reasoning_effort: judgeReasoningEffort,
    interpretation_model: interpretationModel, interpretation_reasoning_effort: interpretationEffort, interpretation_protocol: interviewObservationVersion,
    adapters: { interpretation: interpretationAdapter, model: args["model-adapter"] ?? "codex-cli", target: args["target-adapter"] ?? "codex-cli", judge: args["judge-adapter"] ?? "codex-cli" },
    adapter_ids: { interpretation: interpretationAdapterId ?? null, model: args["model-adapter-id"] ?? null, target: args["target-adapter-id"] ?? null, judge: args["judge-adapter-id"] ?? null },
    timeouts_ms: timeouts
  },
  digests: { execution_surface_sha256: surfaceDigest, runner_bundle_sha256: runnerBundleDigest, adapter_config_sha256: adapterConfigDigest, runtime_contract_sha256: subjectSnapshot.sha256, catalog_sha256: sha256(catalogText), fixture_sha256: sha256(JSON.stringify(fixture)), profile_sha256: sha256(profileText), runner_sha256: sha256(runnerText), first_response_sha256: sha256(firstResponse), second_response_sha256: secondResponse ? sha256(secondResponse) : null, target_output_sha256: targetRun ? sha256(targetRun.final_text) : null },
  execution,
  token_budgets: budgetChecks,
  turns: { first: { ...first, response_sha256: sha256(firstResponse) }, second: second ? { ...second, response_sha256: sha256(secondResponse) } : null },
  target: { status: args["execute-target"] ? (targetChecks.every((check) => check.passed) ? "PASS" : "FAIL") : "NOT_RUN", checks: targetChecks },
  mechanical: { status: mechanicalEligible ? "MECHANICALLY_ELIGIBLE" : "INELIGIBLE", eligible: mechanicalEligible, checks: allChecks },
  judge,
  acceptance,
  evidence_grade: evidenceGrade,
  semantic_acceptance: semanticAcceptance,
  limitations: ["LLM observations are response-bound interpretations; validated fields determine eligibility, while an independent judge assesses quality. Invalid interpretation receives one format repair, then remains unresolved.", "No global model ranking is implied.", "Token budgets are provisional diagnostics."]
};
await writeJson(join(runRoot, "run-summary.json"), summary);
console.log(JSON.stringify({ run_root: runRoot, run_id: runId, first_state: first.inspected.state, second_state: second?.inspected.state ?? null, target_status: summary.target.status, judge_status: judge.status, mechanical_status: summary.mechanical.status, acceptance }, null, 2));
if (["BLOCKED", "INVALID", "UNVERIFIED"].includes(acceptance)) process.exitCode = 3;
else if (acceptance === "REJECTED") process.exitCode = 2;
