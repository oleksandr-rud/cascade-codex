import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { snapshotSubject } from "./evaluation-integrity.mjs";
import { runModel, executionSurface } from "./execution-adapters.mjs";
import { resolveInstalledSkill } from "./subject-plugin.mjs";

const skillRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const simulateRoot = await resolveInstalledSkill({
  envVar: "CASCADE_SIMULATIONS_SKILL_ROOT",
  pluginName: "cascade-simulations",
  skillName: "simulate",
});
const dependencySnapshot = await snapshotSubject(simulateRoot);
const controller = join(simulateRoot, "scripts/simulation_runtime.py");

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function controllerCall(args) {
  const result = spawnSync("uv", ["run", "--with", "pyyaml", "--with", "jsonschema", "python", controller, ...args], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  if (result.error || result.status !== 0) throw new Error(`simulation controller failed: ${result.error?.message ?? result.stderr ?? result.stdout}`);
  return JSON.parse(result.stdout);
}

export function safeId(value) {
  const normalized = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 39).replace(/^-+|-+$/g, "");
  return `${normalized || "run"}-${sha256(value).slice(0, 8)}`;
}

export async function runAgentResponseSimulation({ phase, runId, runRoot, model, reasoningEffort, prompt, cwd, timeoutMs, adapter, adapterConfig, adapterId }) {
  const phaseId = safeId(`${runId}-${phase}`);
  const phaseRoot = join(runRoot, "simulations", phase);
  const definitionRoot = join(phaseRoot, "definition");
  const controllerRoot = join(phaseRoot, "controller");
  await mkdir(definitionRoot, { recursive: true });
  const executionContract = { execution_surface: executionSurface(adapter ?? "codex-cli", adapterConfig, adapterId), adapter: adapter ?? "codex-cli", adapter_id: adapterId ?? null, adapter_config_sha256: adapterConfig ? sha256(await readFile(adapterConfig, "utf8")) : null, simulation_dependency_sha256: dependencySnapshot.sha256 };
  const executionDigest = sha256(JSON.stringify(executionContract));
  await writeFile(join(definitionRoot, "execution-contract.json"), JSON.stringify(executionContract, null, 2));
  const promptDigest = sha256(prompt);
  const maxActionSeconds = Math.min(3600, Math.max(1, Math.ceil(timeoutMs / 1000) + 5));
  const simulation = {
    schema_version: 2,
    id: phaseId,
    interface: { adapter_id: "prompt-evaluation-agent-response", surface: "agent-response", target: `${model}:${reasoningEffort}` },
    authority: { source: "Explicit prompt-evaluation campaign execution", scope: `Invoke only ${model} with ${reasoningEffort} reasoning for phase ${phase}`, allowed_actions: ["invoke"] },
    persona: { source_kind: "none", source_refs: [], assumptions: [] },
    actor: {
      role: "Deterministic prompt-evaluation phase controller", goal: "Obtain one bounded response from the declared model", known: [`model:${model}`, `reasoning_effort:${reasoningEffort}`, `prompt_sha256:${promptDigest}`], unknown: [], constraints: ["Do not alter the prompt or target identity"], decision_rules: ["Dispatch exactly one declared invocation"], communication: "Record only normalized evidence and digests", abstain_when: ["The adapter or target cannot be resolved"], stop_when: ["The response completes", "A bounded terminal condition applies"]
    },
    brief: {
      domain: "Language-model prompt evaluation", feature: phase, current_state: "A frozen prompt awaits one declared model invocation", job_to_be_done: "Execute one bounded agent-response phase and preserve its evidence identity",
      sources: [{ id: "phase_prompt", locator: `digest://sha256/${promptDigest}`, authority: "governing-doc", revision: runId, content_digest: promptDigest }],
      context: [{ claim: `The phase targets ${model} with ${reasoningEffort} reasoning`, source_refs: ["phase_prompt"] }], rules: [{ claim: "The prompt, model, and reasoning identity remain fixed for this phase", source_refs: ["phase_prompt"] }], non_goals: ["Judging response quality", "Changing the target prompt"]
    },
    outcome: {
      goal: "The declared model returns one complete response", achieved_when: ["The declared model returned a complete response"],
      evidence: [{ condition: "The declared model returned a complete response", observe_via: ["agent_response"], requirement: "Record the normalized response digest from the declared adapter execution" }],
      failure_when: ["The adapter fails before a complete response", "The phase exceeds its timeout"], prohibited_shortcuts: ["Substituting another model", "Fabricating a response", "Bypassing the declared execution adapter"]
    },
    limits: { max_steps: 2, max_tool_calls: 2, max_duration_seconds: Math.min(86400, maxActionSeconds + 60), max_action_duration_seconds: maxActionSeconds, max_recoveries: 0 }
  };
  const adapterDefinition = {
    schema_version: 2, id: "prompt-evaluation-agent-response", surface: "agent-response",
    driver: { type: "codex-host", required_capabilities: ["agent.invoke"], bindings: { "agent.invoke": "cascade-simulations/model-execution" }, selection: "Bind the exact model and execution adapter declared by the campaign phase" },
    target: `${model}:${reasoningEffort}`,
    observations: [{ name: "agent_response", description: "Normalized model execution status and output digest", produced_by: ["invoke"] }],
    actions: [{ name: "invoke", purpose: "normal", description: "Invoke one declared model with one frozen reasoning profile and prompt", capability: "agent.invoke", risk: "external", confirmation: "when-not-authorized", idempotency: "key-required", input: { type: "object", additionalProperties: false, required: ["model", "reasoning_effort", "prompt_sha256", "execution_contract_sha256"], properties: { execution_contract_sha256: { type: "string", pattern: "^[a-f0-9]{64}$" }, model: { type: "string", minLength: 1 }, reasoning_effort: { type: "string", minLength: 1 }, prompt_sha256: { type: "string", pattern: "^[a-f0-9]{64}$" } } } }],
    errors: { before_dispatch: "Return BLOCKED when model or adapter identity is unresolved", after_dispatch: "Return the observed terminal execution status without replay" },
    recovery: { description: "This one-shot evaluation phase does not replay an uncertain invocation", action: null },
    cleanup: { required: false, description: "No persistent target resource is created", action: null, verification_observation: null, verification: "No cleanup is required for an ephemeral model invocation" }
  };
  const simulationPath = join(definitionRoot, "simulation.json");
  const adapterPath = join(definitionRoot, "adapter.json");
  await writeFile(simulationPath, `${JSON.stringify(simulation, null, 2)}\n`);
  await writeFile(adapterPath, `${JSON.stringify(adapterDefinition, null, 2)}\n`);
  controllerCall(["start", "--simulation", simulationPath, "--adapter", adapterPath, "--run-dir", controllerRoot, "--run-id", `${runId}-${phase}`, "--binding", "agent.invoke=cascade-simulations/model-execution"]);
  const authorization = controllerCall(["authorize", "--run-dir", controllerRoot, "--action", "invoke", "--input-json", JSON.stringify({ model, reasoning_effort: reasoningEffort, prompt_sha256: promptDigest, execution_contract_sha256: executionDigest }), "--idempotency-key", `${runId}:${phase}:${promptDigest}`, "--expected-tool-calls", "1"]);
  const run = runModel({ model, reasoningEffort, prompt, cwd, timeoutMs, adapter, adapterConfig, adapterId });
  const completed = run.status === "COMPLETED";
  const outputDigest = completed ? sha256(run.final_text) : null;
  controllerCall(["record", "--run-dir", controllerRoot, "--dispatch-token", authorization.dispatch_token, "--outcome", completed ? "PASS" : run.status === "TIMED_OUT" ? "BLOCKED" : "FAIL", "--observation-name", "agent_response", "--observation", completed ? `model:${model} reasoning_effort:${reasoningEffort} output_sha256:${outputDigest}` : `model:${model} reasoning_effort:${reasoningEffort} status:${run.status}`, "--evidence-json", JSON.stringify([{ condition: "The declared model returned a complete response", status: completed ? "SUPPORTED" : "UNSUPPORTED", evidence: completed ? `output_sha256:${outputDigest}` : `execution_status:${run.status}` }]), "--duration-seconds", String(run.duration_ms / 1000)]);
  controllerCall(["finish", "--run-dir", controllerRoot, "--status", completed ? "ACHIEVED" : run.status === "TIMED_OUT" ? "TIMED_OUT" : "BLOCKED", "--reason", completed ? "The declared model returned one complete response" : `Model execution ended with ${run.status}`, "--cleanup-status", "NOT_REQUIRED", "--cleanup-details", "Ephemeral invocation created no persistent target resource"]);
  const verification = controllerCall(["verify", "--run-dir", controllerRoot]);
  const result = JSON.parse(await readFile(join(controllerRoot, "result.json"), "utf8"));
  return { ...run, simulation: { execution_contract: executionContract, execution_contract_sha256: executionDigest, status: result.status, run_id: result.run_id, simulation_id: result.simulation_id, source_digests: result.source_digests, controller_verified: verification.verification === "PASS", artifact_root: phaseRoot } };
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
