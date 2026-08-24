#!/usr/bin/env node

import { chmod, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { resolveInstalledSkill, resolveSubjectSkill } from "./subject-plugin.mjs";

const runner = join(fileURLToPath(new URL(".", import.meta.url)), "run-interview-eval.mjs");
const subjectSkillRoot = await resolveSubjectSkill();
const simulationSkillRoot = await resolveInstalledSkill({ pluginName: "cascade-simulations", skillName: "simulate" });
const root = await mkdtemp(join(tmpdir(), "cascade-prompt-interview-test-"));
const binRoot = join(root, "bin");
const outputRoot = join(root, "output");
await mkdir(binRoot, { recursive: true });

const fakeCodex = `#!/usr/bin/env node
if (process.env.FAKE_DELAY_MS) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, Number(process.env.FAKE_DELAY_MS));
const prompt = process.argv.at(-1) === "-" ? require("node:fs").readFileSync(0, "utf8") : "";
const fence = String.fromCharCode(96).repeat(3);
let text;
if (prompt.includes("<fixture_id>complete-quick-v1</fixture_id>")) {
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
    env: { ...process.env, CASCADE_SIMULATIONS_SKILL_ROOT: simulationSkillRoot, PATH: `${binRoot}:${process.env.PATH}`, ...extraEnv }
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
assert(completeSummary.execution.first_turn.simulation?.status === "ACHIEVED" && completeSummary.execution.first_turn.simulation?.controller_verified, "interview turn must have a verified simulation receipt");
assert(completeSummary.execution.target.simulation?.status === "ACHIEVED" && completeSummary.execution.target.simulation?.controller_verified, "interview target must have a verified simulation receipt");
assert(completeSummary.turns.first.inspected.state === "READY", "complete fixture must be READY");
assert(completeSummary.turns.first.inspected.questions.length === 0, "complete fixture must ask zero questions");
assert(completeSummary.target.status === "PASS", "optional target execution must pass");
assert(completeSummary.acceptance === "MECHANICALLY_ELIGIBLE", "unjudged complete fixture must remain mechanically eligible");

const guided = run("support-mixed-case-v1");
assert(guided.result.status === 0, `guided fixture failed: ${guided.result.stderr}\n${guided.result.stdout}`);
const guidedSummary = await summary(guided);
assert(guidedSummary.turns.first.inspected.state === "NEEDS_INPUT", "guided first turn must need input");
assert(guidedSummary.turns.first.inspected.questions.length === 1, "guided first turn must ask one question");
assert(guidedSummary.turns.first.inspected.intents.includes("precedence"), "guided question must resolve precedence");
assert(guidedSummary.turns.second.inspected.state === "READY", "guided answer turn must become READY");
assert(guidedSummary.turns.second.inspected.questions.length === 0, "guided answer turn must not repeat the question");

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
const timeoutSimulation = JSON.parse(await readFile(join(timedOut.output.run_root, "simulations/first-turn/controller/result.json"), "utf8"));
assert(timeoutSimulation.status === "TIMED_OUT", "interview timeout must be frozen by the simulation controller");

console.log(`PASS: simulation-controlled interview states, question intents, transcript replay, no-repeat, optional target execution, timeout blocking, telemetry, and failure checks (${root})`);
