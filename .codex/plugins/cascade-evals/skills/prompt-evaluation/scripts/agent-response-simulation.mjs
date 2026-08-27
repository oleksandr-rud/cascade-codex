import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { runModel } from "./execution-adapters.mjs";
import { resolveInstalledSkill } from "./subject-plugin.mjs";

const skillRoot = dirname(dirname(fileURLToPath(import.meta.url)));
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

function safeId(value) {
  const normalized = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48);
  return normalized.length >= 3 ? normalized : `run-${sha256(value).slice(0, 8)}`;
}

export async function runAgentResponseSimulation({ phase, runId, runRoot, model, reasoningEffort, prompt, cwd, timeoutMs, adapter, adapterConfig, adapterId }) {
  const phaseId = safeId(`${runId}-${phase}`);
  const phaseRoot = join(runRoot, "simulations", phase);
  const definitionRoot = join(phaseRoot, "definition");
  const controllerRoot = join(phaseRoot, "controller");
  await mkdir(definitionRoot, { recursive: true });
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
    actions: [{ name: "invoke", purpose: "normal", description: "Invoke one declared model with one frozen reasoning profile and prompt", capability: "agent.invoke", risk: "external", confirmation: "when-not-authorized", idempotency: "key-required", input: { type: "object", additionalProperties: false, required: ["model", "reasoning_effort", "prompt_sha256"], properties: { model: { type: "string", minLength: 1 }, reasoning_effort: { type: "string", minLength: 1 }, prompt_sha256: { type: "string", pattern: "^[a-f0-9]{64}$" } } } }],
    errors: { before_dispatch: "Return BLOCKED when model or adapter identity is unresolved", after_dispatch: "Return the observed terminal execution status without replay" },
    recovery: { description: "This one-shot evaluation phase does not replay an uncertain invocation", action: null },
    cleanup: { required: false, description: "No persistent target resource is created", action: null, verification_observation: null, verification: "No cleanup is required for an ephemeral model invocation" }
  };
  const simulationPath = join(definitionRoot, "simulation.json");
  const adapterPath = join(definitionRoot, "adapter.json");
  await writeFile(simulationPath, `${JSON.stringify(simulation, null, 2)}\n`);
  await writeFile(adapterPath, `${JSON.stringify(adapterDefinition, null, 2)}\n`);
  controllerCall(["start", "--simulation", simulationPath, "--adapter", adapterPath, "--run-dir", controllerRoot, "--run-id", `${runId}-${phase}`, "--binding", "agent.invoke=cascade-simulations/model-execution"]);
  const authorization = controllerCall(["authorize", "--run-dir", controllerRoot, "--action", "invoke", "--input-json", JSON.stringify({ model, reasoning_effort: reasoningEffort, prompt_sha256: promptDigest }), "--idempotency-key", `${runId}:${phase}:${promptDigest}`, "--expected-tool-calls", "1"]);
  const run = runModel({ model, reasoningEffort, prompt, cwd, timeoutMs, adapter, adapterConfig, adapterId });
  const completed = run.status === "COMPLETED";
  const outputDigest = completed ? sha256(run.final_text) : null;
  controllerCall(["record", "--run-dir", controllerRoot, "--dispatch-token", authorization.dispatch_token, "--outcome", completed ? "PASS" : run.status === "TIMED_OUT" ? "BLOCKED" : "FAIL", "--observation-name", "agent_response", "--observation", completed ? `model:${model} reasoning_effort:${reasoningEffort} output_sha256:${outputDigest}` : `model:${model} reasoning_effort:${reasoningEffort} status:${run.status}`, "--evidence-json", JSON.stringify([{ condition: "The declared model returned a complete response", status: completed ? "SUPPORTED" : "UNSUPPORTED", evidence: completed ? `output_sha256:${outputDigest}` : `execution_status:${run.status}` }]), "--duration-seconds", String(run.duration_ms / 1000)]);
  controllerCall(["finish", "--run-dir", controllerRoot, "--status", completed ? "ACHIEVED" : run.status === "TIMED_OUT" ? "TIMED_OUT" : "BLOCKED", "--reason", completed ? "The declared model returned one complete response" : `Model execution ended with ${run.status}`, "--cleanup-status", "NOT_REQUIRED", "--cleanup-details", "Ephemeral invocation created no persistent target resource"]);
  const verification = controllerCall(["verify", "--run-dir", controllerRoot]);
  const result = JSON.parse(await readFile(join(controllerRoot, "result.json"), "utf8"));
  return { ...run, simulation: { status: result.status, run_id: result.run_id, simulation_id: result.simulation_id, source_digests: result.source_digests, controller_verified: verification.verification === "PASS", artifact_root: phaseRoot } };
}
