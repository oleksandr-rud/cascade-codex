// Read-only verification of historical controller receipts. Loaded only for legacy replay.
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { executionSurface } from "./execution-adapters.mjs";
import { resolveInstalledSkill } from "./subject-plugin.mjs";

const simulateRoot = await resolveInstalledSkill({
  envVar: "CASCADE_SIMULATIONS_SKILL_ROOT",
  pluginName: "cascade-simulations",
  skillName: "simulate",
});
const controller = join(simulateRoot, "scripts/simulation_runtime.py");

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function controllerCall(args) {
  const result = spawnSync("uv", ["run", "--with", "pyyaml", "--with", "jsonschema", "python", controller, ...args], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  if (result.error || result.status !== 0) throw new Error(`simulation controller failed: ${result.error?.message ?? result.stderr ?? result.stdout}`);
  return JSON.parse(result.stdout);
}

export async function verifyRecordedResponse(sourceRoot, phase, model, reasoningEffort, output, expectedPromptDigest) {
  const root = join(sourceRoot, "simulations", phase);
  const definition = JSON.parse(await readFile(join(root,"definition/simulation.json"),"utf8"));
  const execution = JSON.parse(await readFile(join(root,"definition/execution-contract.json"),"utf8"));
  const resultText = await readFile(join(root,"controller/result.json"),"utf8");
  const result = JSON.parse(resultText);
  const events = (await readFile(join(root,"controller/events.jsonl"),"utf8")).trim().split(/\r?\n/).map(line=>JSON.parse(line));
  const dispatched = events.filter(event=>event.event_type==="ACTION_DISPATCHED");
  const completed = events.filter(event=>event.event_type==="ACTION_COMPLETED");
  const dispatch = dispatched[0]?.payload?.input;
  const observation = completed[0]?.payload?.observation;
  if (dispatched.length !== 1 || completed.length !== 1 || dispatched[0].payload.dispatch_token !== completed[0].payload.dispatch_token || completed[0].payload.outcome !== "PASS" || dispatched[0].payload.action !== "invoke" || completed[0].payload.action !== "invoke" || !expectedPromptDigest || dispatch?.model !== model || dispatch?.reasoning_effort !== reasoningEffort || dispatch?.prompt_sha256 !== expectedPromptDigest) throw new Error("prior dispatch does not match the requested phase identity");
  if (dispatch?.execution_contract_sha256 !== sha256(JSON.stringify(execution)) || sha256(JSON.stringify(execution.execution_surface)) !== sha256(JSON.stringify(executionSurface("codex-cli")))) throw new Error("prior execution surface or contract differs from the declared live surface");
  if (execution.adapter !== "codex-cli" || definition.interface.target !== `${model}:${reasoningEffort}` || result.status !== "ACHIEVED" || !observation?.includes(`output_sha256:${sha256(output)}`) || (expectedPromptDigest && definition.brief.sources[0].content_digest !== expectedPromptDigest)) throw new Error("prior invocation does not prove this model, prompt and response");
  if (controllerCall(["verify","--run-dir",join(root,"controller")]).verification !== "PASS") throw new Error("prior simulation receipt is invalid");
  return {phase,source_root:sourceRoot,output_sha256:sha256(output),result_sha256:sha256(resultText),execution};
}
