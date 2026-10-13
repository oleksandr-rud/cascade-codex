import { createHash } from "node:crypto";
import { CascadeError, assertJsonSchema, boundedPath, flag, isFile, parseArgs, readBoundedRegularFile, readJson, rootPath, sha256Text, stableJson, writeJsonAtomic } from "./common";
import { readPluginCapabilityCatalog, validatePluginPlan, type CapabilitySelection, type PluginCapabilityCatalog } from "./plugin-workflow";
import { type TaskEnvelope } from "./admission";

type RecordValue = Record<string, any>;
const sourceSchema = rootPath(".codex/plugins/cascade-ai-architect/skills/design-agent-workflow/references/cascade-control.schema.json");
const schema = await readJson<RecordValue>(await isFile(sourceSchema) ? sourceSchema : rootPath(".codex/runtime/contracts/ai-workflow/control.schema.json"));
const controllerInputs = new Set(["task-envelope", "plugin-capability-catalog", "capability-selection"]);
const terminal = new Set(["REPLAN_REQUIRED", "RSI_REQUESTED", "COMPLETED", "BLOCKED", "CANCELLED", "BUDGET_EXHAUSTED", "STOPPED"]);

function contract(value: unknown, kind: string): void {
  assertJsonSchema(value, { $schema: schema.$schema, $defs: schema.$defs, $ref: `#/$defs/${kind}` }, `workflow ${kind}`);
}

export function workflowObservationDigest(observation: RecordValue): string {
  contract(observation, "observation");
  return sha256Text(stableJson(observation));
}

function seal(state: RecordValue): RecordValue {
  const { state_digest: _digest, ...payload } = state;
  return { ...payload, state_digest: sha256Text(stableJson(payload)) };
}

export async function verifyWorkflowBindings(bindings: RecordValue[]): Promise<void> {
  for (const binding of bindings) {
    contract(binding, "binding");
    const bytes = await readBoundedRegularFile(boundedPath(binding.path), "workflow artifact", { maxBytes: 2 * 1024 * 1024 });
    if (createHash("sha256").update(bytes).digest("hex") !== binding.sha256) throw new CascadeError(`workflow artifact is stale: ${binding.artifact_id}`);
  }
}

function verifyState(state: RecordValue, catalog: PluginCapabilityCatalog): void {
  contract(state, "state");
  if (seal(state).state_digest !== state.state_digest) throw new CascadeError("workflow state digest is invalid");
  validatePluginPlan(state.plan, state.selection as CapabilitySelection, state.envelope as TaskEnvelope, catalog);
  const expected = state.plan.selected_nodes.map((node: RecordValue) => node.node_id).sort();
  const actual = state.nodes.map((node: RecordValue) => node.node_id).sort();
  if (stableJson(actual) !== stableJson(expected)) throw new CascadeError("workflow state nodes differ from its plan");
  const decisions = state.history.filter((item: RecordValue) => item.decision !== null).length;
  if (state.decisions_used > state.budget.max_decisions || decisions !== state.decisions_used || state.history.length !== state.revision - 1 || new Set(state.history.map((item: RecordValue) => item.observation.observation_id)).size !== state.history.length) throw new CascadeError("workflow decision budget or history is invalid");
  if (state.parent_digest !== (state.history.at(-1)?.observation.state_digest ?? null)) throw new CascadeError("workflow parent digest differs from its last observation");
  for (const event of state.history) {
    if (workflowObservationDigest(event.observation) !== event.observation_digest || (event.decision && (event.decision.state_digest !== event.observation.state_digest || event.decision.observation_digest !== event.observation_digest))) throw new CascadeError("workflow history contains an invalid observation or decision binding");
  }
  const required = state.plan.input_artifacts.filter((type: string) => !controllerInputs.has(type)).sort();
  if (stableJson(state.bindings.map((binding: RecordValue) => binding.artifact_type).sort()) !== stableJson(required)) throw new CascadeError("workflow inputs require exact versioned artifact bindings");
  const createdTime = Date.parse(state.created_at);
  if (!Number.isFinite(createdTime) || Date.parse(state.deadline) !== createdTime + state.budget.wall_time_seconds * 1000) throw new CascadeError("workflow deadline differs from its frozen budget");
  if (state.nodes.some((node: RecordValue) => node.retries > state.budget.max_retries_per_node || (node.status === "COMPLETED" && !node.evidence.length))) throw new CascadeError("workflow node has invalid retries or missing completion evidence");
}

export async function createWorkflowControl(input: {
  envelope: TaskEnvelope; selection: CapabilitySelection; plan: RecordValue;
  bindings: RecordValue[]; budget: RecordValue; created_at?: string;
}, catalogInput?: PluginCapabilityCatalog): Promise<RecordValue> {
  const catalog = catalogInput ?? await readPluginCapabilityCatalog();
  validatePluginPlan(input.plan, input.selection, input.envelope, catalog);
  if (input.plan.status !== "CANDIDATE") throw new CascadeError("workflow control requires a candidate plan");
  contract(input.budget, "budget");
  await verifyWorkflowBindings(input.bindings);
  const provided = input.bindings.map(binding => binding.artifact_type).sort();
  const required = input.plan.input_artifacts.filter((type: string) => !controllerInputs.has(type)).sort();
  if (stableJson(provided) !== stableJson(required)) throw new CascadeError("workflow inputs require exact versioned artifact bindings");
  const createdAt = input.created_at ?? new Date().toISOString();
  const createdTime = Date.parse(createdAt);
  if (!Number.isFinite(createdTime)) throw new CascadeError("workflow creation time is invalid");
  const state = seal({
    schema_version: 1, artifact_type: "cascade-workflow-control", revision: 1,
    parent_digest: null, state_digest: "", created_at: createdAt,
    deadline: new Date(createdTime + input.budget.wall_time_seconds * 1000).toISOString(),
    status: "ACTIVE", envelope: input.envelope, selection: input.selection, plan: input.plan,
    bindings: input.bindings, budget: input.budget, decisions_used: 0,
    nodes: input.plan.selected_nodes.map((node: RecordValue) => ({ node_id: node.node_id, status: "PENDING", retries: 0, evidence: [] })),
    history: [], next_action: null, stop_reason: null,
    dispatch_authorized: false, acceptance_authorized: false,
  });
  verifyState(state, catalog);
  return state;
}

export async function advanceWorkflowControl(state: RecordValue, observation: RecordValue, decision: RecordValue | null,
  catalogInput?: PluginCapabilityCatalog, now = new Date().toISOString()): Promise<RecordValue> {
  const catalog = catalogInput ?? await readPluginCapabilityCatalog();
  verifyState(state, catalog);
  if (terminal.has(state.status)) throw new CascadeError(`workflow iteration is terminal: ${state.status}`);
  contract(observation, "observation");
  if (observation.state_digest !== state.state_digest) throw new CascadeError("workflow observation is stale");
  if (state.history.some((item: RecordValue) => item.observation.observation_id === observation.observation_id)) throw new CascadeError("workflow observation was already consumed");
  const observationDigest = workflowObservationDigest(observation);
  const next = structuredClone(state);
  next.revision++; next.parent_digest = state.state_digest; next.next_action = null;
  const event = { observation: structuredClone(observation), observation_digest: observationDigest, decision: null as RecordValue | null };
  next.history.push(event);
  const finish = (status: string, reason: string) => seal({ ...next, status, stop_reason: reason });
  if (observation.kind === "CANCELLED") return finish("CANCELLED", "HOST_CANCELLATION");
  if (observation.kind === "AUTHORITY_REVOKED") return finish("BLOCKED", "HOST_AUTHORITY_REVOKED");
  const currentTime = Date.parse(now);
  if (!Number.isFinite(currentTime)) throw new CascadeError("workflow current time is invalid");
  if (currentTime >= Date.parse(state.deadline) || state.decisions_used >= state.budget.max_decisions) return finish("BUDGET_EXHAUSTED", "CONTROL_BUDGET_EXHAUSTED");
  if (!decision) return finish("BLOCKED", "MISSING_LLM_INTERPRETATION");
  contract(decision, "decision");
  if (decision.state_digest !== state.state_digest || decision.observation_digest !== observationDigest) throw new CascadeError("workflow decision is not bound to current state and observation");
  next.decisions_used++;
  event.decision = structuredClone(decision);
  if (decision.resolution !== "RESOLVED" || decision.uncertainty.length) return finish("BLOCKED", "UNRESOLVED_LLM_INTERPRETATION");
  try { await verifyWorkflowBindings([...state.bindings, ...state.nodes.filter((node: RecordValue) => node.status === "COMPLETED").flatMap((node: RecordValue) => node.evidence)]); } catch (error) {
    if (decision.action === "REPLAN") return finish("REPLAN_REQUIRED", "INPUT_BINDING_CHANGED");
    return finish("BLOCKED", "STALE_OR_UNAVAILABLE_INPUT");
  }
  await verifyWorkflowBindings(observation.evidence);
  if (["NODE_COMPLETED", "NODE_FAILED"].includes(observation.kind)) {
    const observedNode = next.nodes.find((node: RecordValue) => node.node_id === observation.node_id);
    if (!observedNode || !observation.evidence.length) throw new CascadeError("workflow node observation requires current evidence");
    const requiredOutputs = state.plan.selected_nodes.find((node: RecordValue) => node.node_id === observedNode.node_id).produces;
    if (observation.kind === "NODE_COMPLETED" && requiredOutputs.some((type: string) => !observation.evidence.some((binding: RecordValue) => binding.artifact_type === type))) throw new CascadeError("workflow completion evidence omits a required output");
    if (observedNode.status !== "PREPARED") throw new CascadeError("workflow node result has no matching prepared action");
    observedNode.status = observation.kind === "NODE_COMPLETED" ? "COMPLETED" : "FAILED";
    observedNode.evidence = observation.evidence;
  }
  if (observation.kind === "INPUT_CHANGED" && decision.action !== "REPLAN") return finish("BLOCKED", "CHANGED_INPUT_REQUIRES_REPLANNING");
  const selectedNode = next.nodes.find((node: RecordValue) => node.node_id === decision.node_id);
  const plannedNode = state.plan.selected_nodes.find((node: RecordValue) => node.node_id === decision.node_id);
  if (["RUN_NODE", "RETRY_NODE"].includes(decision.action)) {
    if (!selectedNode || !plannedNode) throw new CascadeError("workflow action references an unknown node");
    const waitingFor = state.plan.edges.filter((edge: RecordValue) => edge.to === decision.node_id).map((edge: RecordValue) => edge.from);
    for (const dependency of catalog.plugins.flatMap(plugin => plugin.skills).find((skill: RecordValue) => skill.route === plannedNode.route).required_dependencies) {
      waitingFor.push(state.plan.selected_nodes.find((node: RecordValue) => node.route === dependency).node_id);
    }
    if (waitingFor.some((id: string) => next.nodes.find((node: RecordValue) => node.node_id === id)?.status !== "COMPLETED")) throw new CascadeError("workflow action has an incomplete dependency");
    if (decision.action === "RUN_NODE" && selectedNode.status !== "PENDING") throw new CascadeError("workflow node cannot be executed again without an explicit retry");
    if (decision.action === "RETRY_NODE") {
      if (selectedNode.status !== "FAILED" || decision.trigger !== "MEASURED_FAILURE") throw new CascadeError("workflow retry requires a measured node failure");
      if (selectedNode.retries >= state.budget.max_retries_per_node) return finish("BUDGET_EXHAUSTED", "NODE_RETRY_BUDGET_EXHAUSTED");
      selectedNode.retries++;
    }
    if (next.nodes.some((node: RecordValue) => node.status === "PREPARED")) return finish("BLOCKED", "PREVIOUS_ACTION_OUTCOME_UNKNOWN");
    selectedNode.status = "PREPARED";
    next.status = "ACTIVE"; next.stop_reason = null;
    const descriptor = catalog.plugins.flatMap(plugin => plugin.skills).find((skill: RecordValue) => skill.route === plannedNode.route);
    const inputBindings = [...plannedNode.consumes, ...(plannedNode.optional_consumes ?? [])].map((type: string) => {
      if (controllerInputs.has(type)) throw new CascadeError("domain work cannot consume unbound controller state");
      const edge = state.plan.edges.find((item: RecordValue) => item.to === plannedNode.node_id && item.artifact === type);
      const available = edge ? next.nodes.find((node: RecordValue) => node.node_id === edge.from)?.evidence ?? []
        : state.plan.input_artifacts.includes(type) ? next.bindings : [];
      const matches = available.filter((binding: RecordValue) => binding.artifact_type === type);
      if (matches.length !== 1) throw new CascadeError(`workflow handoff requires exactly one current binding for ${type}`);
      return structuredClone(matches[0]);
    });
    next.next_action = { action: decision.action, node_id: plannedNode.node_id, route: plannedNode.route, plugin_version: plannedNode.plugin_version,
      component: descriptor.component, entrypoint: descriptor.entrypoint, skill_sha256: descriptor.skill_sha256,
      input_bindings: inputBindings, expected_outputs: plannedNode.produces, model: plannedNode.model,
      effect: plannedNode.effect, authority: plannedNode.authority, host_authorization_required: true };
    return seal(next);
  }
  if (decision.node_id !== null) throw new CascadeError("workflow control action cannot name an execution node");
  if (decision.action === "REPLAN") return finish("REPLAN_REQUIRED", "FRESH_ADMISSION_SELECTION_AND_PLAN_REQUIRED");
  if (["WAIT_INPUT", "WAIT_AUTHORITY"].includes(decision.action)) {
    next.status = "WAITING"; next.stop_reason = null; next.next_action = { action: decision.action, reason: decision.reason };
    return seal(next);
  }
  if (decision.action === "REQUEST_RSI") {
    if (decision.trigger !== "MEASURED_FAILURE" || !next.nodes.some((node: RecordValue) => node.status === "FAILED" && node.evidence.length)) throw new CascadeError("workflow RSI requires recorded measured failure evidence");
    const route = "cascade-ai-architect:run-improvement-cycle";
    const plugin = catalog.plugins.find(plugin => plugin.skills.some(skill => skill.route === route));
    const method = plugin?.skills.find(skill => skill.route === route);
    if (!method || method.effect !== "CANDIDATE_WRITE" || method.authority !== "READ_ONLY") throw new CascadeError("workflow improvement requires its current candidate-only capability");
    const failureEvidence = next.nodes.filter((node: RecordValue) => node.status === "FAILED").flatMap((node: RecordValue) => node.evidence);
    const baselinePlanDigest = sha256Text(stableJson(state.plan));
    next.next_action = { action: "REQUEST_RSI", route, plugin_version: plugin!.version,
      entrypoint: method.entrypoint, skill_sha256: method.skill_sha256,
      baseline_plan_digest: baselinePlanDigest, control_parent_digest: state.state_digest,
      failure_evidence: failureEvidence, candidate_only: true, promotion_authorized: false,
      input: { schema_version: 1, artifact_type: "improvement-request", subject: "WORKFLOW",
        baseline_plan: structuredClone(state.plan), baseline_plan_digest: baselinePlanDigest,
        control_parent_digest: state.state_digest, catalog_digest: catalog.catalog_digest,
        task_envelope_id: state.envelope.envelope_id, failure_evidence: failureEvidence,
        parent_budget: structuredClone(state.budget), candidate_scope: "HOST_AUTHORIZATION_REQUIRED", promotion_authorized: false } };
    return finish("RSI_REQUESTED", "OFFLINE_BOUNDED_IMPROVEMENT_HANDOFF");
  }
  if (decision.action === "COMPLETE") {
    if (decision.trigger !== "GOAL_MET" || next.nodes.some((node: RecordValue) => node.status !== "COMPLETED")) throw new CascadeError("workflow completion requires evidence for every selected node");
    return finish("COMPLETED", "WORKFLOW_EVIDENCE_READY_FOR_HOST_ACCEPTANCE");
  }
  return finish("STOPPED", "EXPLICIT_CONTROL_STOP");
}

export function pluginGroupProjection(catalog: PluginCapabilityCatalog): RecordValue {
  return { schema_version: 1, artifact_type: "cascade-plugin-groups", catalog_digest: catalog.catalog_digest,
    groups: catalog.plugins.map(plugin => ({ group_id: plugin.name, version: plugin.version,
      components: [...new Set(plugin.skills.map((skill: RecordValue) => skill.component))].sort(),
      methods: plugin.skills.map((skill: RecordValue) => ({ route: skill.route, component: skill.component, entrypoint: skill.entrypoint, skill_sha256: skill.skill_sha256 })) })),
    dispatch_authorized: false };
}

export async function workflowControlCommand(command: string, values: string[]): Promise<number> {
  const args = parseArgs(values);
  const required = (name: string) => { const value = flag(args, name); if (!value) throw new CascadeError(`workflow ${command} requires --${name}`); return boundedPath(value); };
  const catalog = await readPluginCapabilityCatalog();
  let result: RecordValue;
  if (command === "groups") result = pluginGroupProjection(catalog);
  else if (command === "control-init") result = await createWorkflowControl({
    envelope: await readJson(required("envelope")), selection: await readJson(required("selection")), plan: await readJson(required("plan")),
    bindings: await readJson(required("bindings")), budget: await readJson(required("budget")),
  }, catalog);
  else {
    const state = await readJson<RecordValue>(required("state"));
    const observation = await readJson<RecordValue>(required("observation"));
    if (command === "control-intake") {
      verifyState(state, catalog); contract(observation, "observation");
      if (observation.state_digest !== state.state_digest) throw new CascadeError("workflow observation is stale");
      result = { artifact_type: "cascade-workflow-control-intake", state, observation, observation_digest: workflowObservationDigest(observation),
        decision_schema: { $schema: schema.$schema, $defs: schema.$defs, $ref: "#/$defs/decision" },
        instruction: "Interpret the observation and current workflow semantically. Emit the declared decision JSON with explicit uncertainty. Do not infer authority or enlarge budgets. A plan or completion observation does not accept a tracker issue.", dispatch_authorized: false };
    } else {
      const decisionPath = flag(args, "decision");
      result = await advanceWorkflowControl(state, observation, decisionPath ? await readJson(boundedPath(decisionPath)) : null, catalog);
    }
  }
  const output = flag(args, "output");
  if (output) await writeJsonAtomic(boundedPath(output), result);
  console.log(stableJson(result, true));
  return result.status === "BLOCKED" ? 2 : 0;
}
