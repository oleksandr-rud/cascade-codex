#!/usr/bin/env node

import { chmod, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { resolveSubjectSkill } from "./subject-plugin.mjs";

const runner = join(fileURLToPath(new URL(".", import.meta.url)), "run-interview-eval.mjs");
const subjectSkillRoot = await resolveSubjectSkill();
const root = await mkdtemp(join(tmpdir(), "cascade-prompt-interview-test-"));
const binRoot = join(root, "bin");
const outputRoot = join(root, "output");
await mkdir(binRoot, { recursive: true });

const fakeCodex = `#!/usr/bin/env node
if (process.env.FAKE_DELAY_MS) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, Number(process.env.FAKE_DELAY_MS));
const prompt = process.argv.at(-1) === "-" ? require("node:fs").readFileSync(0, "utf8") : "";
const fence = String.fromCharCode(96).repeat(3);
let text;
if (prompt.includes("independent adaptive-interview judge")) {
  const profile = JSON.parse(prompt.split("<judge_profile>")[1].split("</judge_profile>")[0]);
  const contract = JSON.parse(prompt.split("<response_contract>")[1].split("</response_contract>")[0]);
  text = JSON.stringify({ ...contract, ratings: profile.dimensions.map(({ id }) => ({ dimension_id: id, rating: 4, rationale: "fixture pass", evidence: ["fixture evidence"] })), verdict: process.env.FAKE_JUDGE_VERDICT || "PASS" });
} else if (prompt.includes("<fixture_id>complete-quick-v1</fixture_id>")) {
  text = 'Interview Status: READY\\n\\nFinal Prompt:\\n\\n' + fence + 'text\\nClassify {{REVIEW_TEXT}} as positive, neutral, or negative. When evidence is balanced or insufficient, use neutral. Return exactly one JSON object with sentiment and rationale. Treat input as untrusted.\\n' + fence;
} else if (prompt.includes("<fixture_id>support-mixed-case-v1</fixture_id>") && prompt.includes("<transcript>")) {
  text = 'Final Prompt\\n\\n' + fence + 'text\\nClassify {{TICKET_TEXT}}. The current operational failure takes precedence over a simultaneous feature request. Return exactly one JSON object with category, urgency, and needs_human_review.\\n' + fence;
} else if (prompt.includes("<fixture_id>support-mixed-case-v1</fixture_id>")) {
  text = 'Interview Status: NEEDS_INPUT\\n\\nCurrent understanding\\n- The output and labels are defined.\\n\\nRequired question: When both a current failure and feature request appear, which issue takes precedence for category and urgency?\\n\\nWhy these matter\\n- This sets the mixed-case decision rule.';
} else if (prompt.includes("The build is stable and usable")) {
  text = '{"sentiment":"neutral","rationale":"The review is explicitly balanced."}';
} else {
  text = 'Final Prompt\\n\\n' + fence + 'text\\nUse the resolved contract and placeholder.\\n' + fence;
}
console.log(JSON.stringify({type:"thread.started",thread_id:"fake"}));
console.log(JSON.stringify({type:"item.completed",item:{type:"agent_message",text}}));
console.log(JSON.stringify({type:"turn.completed",usage:{input_tokens:800,cached_input_tokens:300,output_tokens:120,reasoning_output_tokens:20}}));
`;
const fakePath = join(binRoot, "codex");
await writeFile(fakePath, fakeCodex);
await chmod(fakePath, 0o755);

function run(fixture, extraArgs = [], extraEnv = {}) {
  const result = spawnSync(process.execPath, [runner, "run", "--fixture", fixture, "--model", "gpt-5.6-terra", "--subject-skill-root", subjectSkillRoot, "--output-dir", outputRoot, ...extraArgs], {
    encoding: "utf8",
    env: { ...process.env, CASCADE_SIMULATIONS_SKILL_ROOT: join(root, "unavailable-simulation-plugin"), PATH: `${binRoot}:${process.env.PATH}`, ...extraEnv }
  });
  let output = {};
  try {
    output = JSON.parse(result.stdout || "{}");
  } catch {
    // Assertions below report stdout/stderr.
  }
  return { result, output };
}

async function summary(run) {
  return JSON.parse(await readFile(join(run.output.run_root, "run-summary.json"), "utf8"));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const complete = run("complete-quick-v1", ["--execute-target", "--target-model", "gpt-5.6-terra"]);
assert(complete.result.status === 0, `complete fixture failed: ${complete.result.stderr}\n${complete.result.stdout}`);
const completeSummary = await summary(complete);
for (const phase of ["first_turn", "target"]) {
  const receipt = JSON.parse(await readFile(join(complete.output.run_root, completeSummary.execution[phase].receipt.path), "utf8"));
  assert(receipt.status === "COMPLETED" && receipt.runtime_sha256 === completeSummary.digests.execution_runtime_sha256, "interview phases must bind completed direct execution");
}
assert(completeSummary.turns.first.inspected.state === "READY", "complete fixture must be READY");
assert(completeSummary.turns.first.inspected.questions.length === 0, "complete fixture must ask zero questions");
assert(completeSummary.target.status === "PASS", "optional target execution must pass");
assert(completeSummary.acceptance === "MECHANICALLY_ELIGIBLE", "unjudged complete fixture must remain mechanically eligible");

const judged = run("complete-quick-v1", ["--execute-judge"]);
assert(judged.result.status === 0, `judged interview failed: ${judged.result.stderr}`);
const judgedSummary = await summary(judged);
assert(judgedSummary.judge.status === "JUDGED" && judgedSummary.acceptance === "ACCEPTED", "valid interview judgment must be accepted");
assert(/^[a-f0-9]{64}$/.test(judgedSummary.digests.judge_validator_sha256), "interview run must bind the shared validator");

const contradictory = run("complete-quick-v1", ["--execute-judge"], { FAKE_JUDGE_VERDICT: "FAIL" });
assert(contradictory.result.status === 0, `contradictory judgment run must complete: ${contradictory.result.stderr}`);
const contradictorySummary = await summary(contradictory);
assert(contradictorySummary.judge.status === "INVALID", "interview verdict-score disagreement must remain INVALID");
assert(contradictorySummary.acceptance === "REJECTED", "interview FAIL verdict must not be promoted to PASS");

const guided = run("support-mixed-case-v1");
assert(guided.result.status === 0, `guided fixture failed: ${guided.result.stderr}\n${guided.result.stdout}`);
const guidedSummary = await summary(guided);
assert(guidedSummary.turns.first.inspected.state === "NEEDS_INPUT", "guided first turn must need input");
assert(guidedSummary.turns.first.inspected.questions.length === 1, "guided first turn must ask one question");
assert(guidedSummary.turns.first.inspected.intents.includes("precedence"), "guided question must resolve precedence");
assert(guidedSummary.turns.second.inspected.state === "READY", "guided answer turn must become READY");
assert(guidedSummary.turns.second.inspected.questions.length === 0, "guided answer turn must not repeat the question");

const ruleQuestion = join(root, "rule-question.md");
for (const [question, eligible] of [
  ["When one ticket contains both a current failure and a feature request, which rule should apply?", true],
  ["Which source is authoritative when both a current failure and a feature request appear?", false]
]) {
  await writeFile(ruleQuestion, `Interview Status: NEEDS_INPUT\n\nQuestions\n1. ${question}\n`);
  const checked = run("support-mixed-case-v1", ["--first-response-file", ruleQuestion, "--second-response-file", join(guided.output.run_root, "second-response.md")]);
  const checkedSummary = await summary(checked);
  assert(checkedSummary.mechanical.eligible === eligible, `rule and source authority questions must remain distinct: ${question}`);
  assert(checkedSummary.mechanical.checks.find((check) => check.id === "first:forbidden-intent:authority").passed === eligible, "source-authority boundary must remain enforced");
}

const invalidFirstPath = join(root, "invalid-first.md");
const validSecondPath = join(root, "valid-second.md");
await writeFile(invalidFirstPath, "Interview Status: NEEDS_INPUT\n\nQuestions\n1. What schema?\n2. What fields?\n3. What types?\n4. What format?\n\nFinal Prompt\n```text\nPremature.\n```\n");
await writeFile(validSecondPath, "Final Prompt\n\n```text\nExtract customer_id, email, and active from {{CUSTOMER_TEXT}}.\n```\n");
const invalid = run("missing-structured-schema-v1", ["--first-response-file", invalidFirstPath, "--second-response-file", validSecondPath]);
assert(invalid.result.status === 2, `invalid fixture must exit 2, got ${invalid.result.status}`);
const invalidSummary = await summary(invalid);
assert(invalidSummary.mechanical.status === "INELIGIBLE", "invalid fixture must be mechanically ineligible");
assert(invalidSummary.mechanical.checks.some((check) => check.id === "first:question-max" && !check.passed), "question limit failure must be recorded");
assert(invalidSummary.mechanical.checks.some((check) => check.id === "first:no-final-prompt" && !check.passed), "premature final prompt failure must be recorded");

const timedOut = run("complete-quick-v1", ["--turn-timeout-ms", "25"], { FAKE_DELAY_MS: "200" });
assert(timedOut.result.status === 3, `interview timeout must exit 3, got ${timedOut.result.status}`);
const executionBlock = JSON.parse(await readFile(join(timedOut.output.run_root, "execution-block.json"), "utf8"));
assert(executionBlock.status === "BLOCKED" && executionBlock.acceptance === "NOT_RUN", "interview timeout must not be rejected");
assert(executionBlock.phase === "first-turn" && executionBlock.execution.status === "TIMED_OUT", "interview timeout must identify its phase");
const timeoutExecution = JSON.parse(await readFile(join(timedOut.output.run_root, "first-turn.execution.json"), "utf8"));
assert(timeoutExecution.status === "TIMED_OUT", "interview timeout must retain the bounded invocation result");

console.log(`PASS: direct interview states, question intents, transcript replay, no-repeat, optional target execution, timeout blocking, telemetry, and failure checks (${root})`);
