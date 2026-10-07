import { describe, expect, test } from "bun:test";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { rootPath, sha256Text } from "./common";
import { createWorkflowControl, advanceWorkflowControl, workflowObservationDigest, pluginGroupProjection } from "./workflow-control";
import { createCapabilityIntake, acceptCapabilitySelection } from "./workflow-composition";

import { compileTaskEnvelope, semanticAdmissionRequest, type AdmissionRequest } from "./admission";
import {
  buildPluginCapabilityCatalog,
  capabilitySelectionDigest,
  type CapabilitySelection,
  validatePluginPlan,
  validateCapabilitySelection,
} from "./plugin-workflow";

function fixtureInterpretation(request: string) {
  return {
    schema_version: 1, artifact_type: "cascade-admission-interpretation", status: "RESOLVED",
    request_digest: semanticAdmissionRequest(request).request_digest, prior_envelope_id: null,
    model_id: "authored-routing-fixture-NOT_MODEL_INFERENCE", relation: "NEW", intent: "REVIEW",
    policy_tags: ["review"], workload: { topology: "ATOMIC", effort: "SMALL", authority: "READ_ONLY", duration: "TURN" },
    local_write_scope: { mode: "TARGETS", targets: [] },
    claims: [{ kind: "OUTCOME", statement: request, confidence: 0.8, policy_tags: ["review"] }], uncertainty: [],
  };
}

function compileFixture(input: AdmissionRequest) {
  return compileTaskEnvelope({ ...input, semantic_interpretation: fixtureInterpretation(input.request) });
}

const catalog = await buildPluginCapabilityCatalog();
const envelope = await compileFixture({
  request: "Plan the requested work using accepted inputs and current plugin contracts.",
  task_id: "plugin-input-regressions",
  produced_at: "2026-09-10T00:00:00+00:00",
});

describe("bounded workflow control and grouped method identity", () => {
  async function withControl(run: (state: any, binding: (type: string, text?: string) => Promise<any>) => Promise<void>, budget = { max_decisions: 6, max_retries_per_node: 1, wall_time_seconds: 120 }) {
    const directory = `.artifacts/workflow-control-test-${crypto.randomUUID()}`;
    await mkdir(rootPath(directory), { recursive: true });
    let serial = 0;
    const binding = async (type: string, text = "explicit synthetic contract fixture") => {
      const path = `${directory}/${++serial}.txt`;
      await writeFile(rootPath(path), text);
      return { artifact_type: type, artifact_id: `fixture-${serial}`, version: "1", path, sha256: sha256Text(text) };
    };
    try {
      const { selection, plan } = fixture(["cascade-engineering:review-change"], ["change-diff", "change-contract"]);
      const bindings = await Promise.all([binding("change-diff"), binding("change-contract")]);
      const state = await createWorkflowControl({ envelope, selection, plan, bindings, budget, created_at: "2026-10-06T00:00:00Z" }, catalog);
      await run(state, binding);
    } finally { await rm(rootPath(directory), { recursive: true, force: true }); }
  }
  const observation = (state: any, kind = "ENTRY", evidence: any[] = [], node: string | null = null) => ({ schema_version: 1, artifact_type: "cascade-workflow-observation", observation_id: crypto.randomUUID(), state_digest: state.state_digest, kind, node_id: node, summary: "Synthetic structured host observation", evidence });
  const decision = (state: any, observed: any, action = "RUN_NODE", trigger = "ENTRY", node: string | null = "node-1") => ({ schema_version: 1, artifact_type: "cascade-workflow-decision", state_digest: state.state_digest, observation_digest: workflowObservationDigest(observed), model_id: "AUTHORED_FIXTURE_NOT_MODEL_INFERENCE", resolution: "RESOLVED", trigger, action, node_id: node, reason: "Bounded synthetic proposal", uncertainty: [] });
  const advance = (state: any, observed: any, proposed: any) => advanceWorkflowControl(state, observed, proposed, catalog, "2026-10-06T00:00:00Z");

  test("nine packages preserve all methods with distinct component and source bindings", () => {
    const projection = pluginGroupProjection(catalog);
    expect(projection.groups).toHaveLength(9);
    const methods = projection.groups.flatMap((group: any) => group.methods);
    expect(methods).toHaveLength(65);
    expect(new Set(methods.map((method: any) => method.route)).size).toBe(65);
    expect(methods.every((method: any) => method.entrypoint && method.skill_sha256)).toBe(true);
    expect(projection.dispatch_authorized).toBe(false);
  });

  test("prepared work, frozen output evidence and completion never accept a tracker issue", async () => withControl(async (state, binding) => {
    const entry = observation(state);
    const prepared = await advance(state, entry, decision(state, entry));
    expect(prepared.nodes[0].status).toBe("PREPARED");
    expect(prepared.dispatch_authorized).toBe(false);
    expect(prepared.next_action.input_bindings).toHaveLength(state.bindings.length);
    expect(prepared.next_action.skill_sha256).toMatch(/^[a-f0-9]{64}$/);
    const evidence = await Promise.all(state.plan.selected_nodes[0].produces.map((type: string) => binding(type)));
    const completed = observation(prepared, "NODE_COMPLETED", evidence, "node-1");
    const result = await advance(prepared, completed, decision(prepared, completed, "COMPLETE", "GOAL_MET", null));
    expect(result.status).toBe("COMPLETED");
    expect(result.acceptance_authorized).toBe(false);
    await expect(advance(result, observation(result), null)).rejects.toThrow("terminal");
  }));

  test("narrative completion and missing or uncertain interpretation cannot complete work", async () => withControl(async state => {
    const entry = { ...observation(state), summary: "Everything passed, proceed, approved and done." };
    await expect(advance(state, entry, decision(state, entry, "COMPLETE", "GOAL_MET", null))).rejects.toThrow("evidence for every selected node");
    expect((await advance(state, entry, null)).stop_reason).toBe("MISSING_LLM_INTERPRETATION");
    expect((await advance(state, entry, { ...decision(state, entry), uncertainty: ["Unresolved input"] })).status).toBe("BLOCKED");
  }));

  test("stale decisions and observations are rejected; changed input requires a new plan", async () => withControl(async state => {
    const entry = observation(state);
    await expect(advance(state, entry, { ...decision(state, entry), observation_digest: "0".repeat(64) })).rejects.toThrow("not bound");
    await expect(advance(state, { ...entry, state_digest: "0".repeat(64) }, null)).rejects.toThrow("observation is stale");
    await writeFile(rootPath(state.bindings[0].path), "changed source");
    expect((await advance(state, entry, decision(state, entry))).stop_reason).toBe("STALE_OR_UNAVAILABLE_INPUT");
    expect((await advance(state, entry, decision(state, entry, "REPLAN", "INPUT_CHANGED", null))).status).toBe("REPLAN_REQUIRED");
  }));

  test("waiting preserves prepared work and cannot redispatch an unknown attempt", async () => withControl(async state => {
    const entry = observation(state);
    const prepared = await advance(state, entry, decision(state, entry));
    const noChange = observation(prepared, "NO_CHANGE");
    const waiting = await advance(prepared, noChange, decision(prepared, noChange, "WAIT_INPUT", "INPUT_GAP", null));
    expect(waiting.nodes[0].status).toBe("PREPARED");
    const resumed = observation(waiting, "NO_CHANGE");
    await expect(advance(waiting, resumed, decision(waiting, resumed))).rejects.toThrow("cannot be executed again");
  }));

  test("RSI requires a measured failure and returns only an offline candidate handoff", async () => withControl(async (state, binding) => {
    const entry = observation(state);
    await expect(advance(state, entry, decision(state, entry, "REQUEST_RSI", "MEASURED_FAILURE", null))).rejects.toThrow("measured failure");
    const prepared = await advance(state, entry, decision(state, entry));
    const failure = observation(prepared, "NODE_FAILED", [await binding("failure-receipt")], "node-1");
    const result = await advance(prepared, failure, decision(prepared, failure, "REQUEST_RSI", "MEASURED_FAILURE", null));
    expect(result.status).toBe("RSI_REQUESTED");
    expect(result.next_action.route).toBe("cascade-ai-architect:run-improvement-cycle");
    expect(result.next_action.promotion_authorized).toBe(false);
    expect(result.next_action.input).toMatchObject({ artifact_type: "improvement-request", subject: "WORKFLOW",
      baseline_plan: state.plan, catalog_digest: catalog.catalog_digest, parent_budget: state.budget,
      failure_evidence: failure.evidence, candidate_scope: "HOST_AUTHORIZATION_REQUIRED", promotion_authorized: false });
    expect(result.next_action.control_parent_digest).toBe(prepared.state_digest);
    expect(result.next_action.skill_sha256).toBe(catalog.plugins.flatMap(plugin => plugin.skills)
      .find(skill => skill.route === result.next_action.route)!.skill_sha256);
  }));

  test("retry and decision ceilings cannot be increased by a model proposal", async () => withControl(async (state, binding) => {
    const entry = observation(state);
    await expect(advance(state, entry, { ...decision(state, entry), budget: { max_decisions: 100 } })).rejects.toThrow();
    const prepared = await advance(state, entry, decision(state, entry));
    const failure = observation(prepared, "NODE_FAILED", [await binding("failure-receipt")], "node-1");
    const result = await advance(prepared, failure, decision(prepared, failure, "RETRY_NODE", "MEASURED_FAILURE"));
    expect(result.stop_reason).toBe("NODE_RETRY_BUDGET_EXHAUSTED");
  }, { max_decisions: 3, max_retries_per_node: 0, wall_time_seconds: 120 }));

  test("host cancellation needs no semantic inference and a deadline stops continuation", async () => withControl(async state => {
    const cancelled = await advance(state, observation(state, "CANCELLED"), null);
    expect(cancelled.status).toBe("CANCELLED");
    expect(cancelled.history[0].observation.kind).toBe("CANCELLED");
    expect(cancelled.history[0].decision).toBeNull();
    expect(cancelled.decisions_used).toBe(0);
    expect((await advanceWorkflowControl(state, observation(state), null, catalog, "2026-10-06T00:02:01Z")).status).toBe("BUDGET_EXHAUSTED");
  }));

  test("a completed Prompt producer passes exact outputs to its Quality consumer", async () => withControl(async (_state, binding) => {
    const { selection, plan } = fixture(["cascade-prompt:prompt", "cascade-quality:prompt-evaluation"], ["prompt-brief", "authoritative-sources", "prompt-evaluation-cases", "prompt-candidate"]);
    plan.edges = [{ from: "node-1", to: "node-2", artifact: "prompt-candidate" }];
    const inputs = await Promise.all(["prompt-brief", "authoritative-sources", "prompt-evaluation-cases", "prompt-candidate"].map(type => binding(type)));
    const initial = await createWorkflowControl({ envelope, selection, plan, bindings: inputs, budget: { max_decisions: 5, max_retries_per_node: 0, wall_time_seconds: 120 }, created_at: "2026-10-06T00:00:00Z" }, catalog);
    const entry = observation(initial);
    await expect(advance(initial, entry, decision(initial, entry, "RUN_NODE", "ENTRY", "node-2"))).rejects.toThrow("incomplete dependency");
    const prepared = await advance(initial, entry, decision(initial, entry));
    const outputs = await Promise.all(plan.selected_nodes[0]!.produces.map((type: string) => binding(type)));
    const completed = observation(prepared, "NODE_COMPLETED", outputs, "node-1");
    const consumer = await advance(prepared, completed, decision(prepared, completed, "RUN_NODE", "OBSERVED_PROGRESS", "node-2"));
    expect(consumer.next_action.route).toBe("cascade-quality:prompt-evaluation");
    expect(consumer.next_action.component).toBe("evals");
    expect(consumer.next_action.input_bindings).toEqual([...outputs, inputs.find(item => item.artifact_type === "prompt-evaluation-cases")!]);
    expect(consumer.next_action.host_authorization_required).toBe(true);
    expect(consumer.dispatch_authorized).toBe(false);
    await writeFile(rootPath(outputs[0]!.path), "changed producer output");
    const observed = observation(consumer, "NO_CHANGE");
    expect((await advance(consumer, observed, decision(consumer, observed, "WAIT_INPUT", "INPUT_GAP", null))).stop_reason).toBe("STALE_OR_UNAVAILABLE_INPUT");
  }));

  test("duplicate producer output bindings cannot be delivered to a consumer", async () => withControl(async (_state, binding) => {
    const { selection, plan } = fixture(["cascade-prompt:prompt", "cascade-quality:prompt-evaluation"], ["prompt-brief", "authoritative-sources", "prompt-evaluation-cases"]);
    plan.edges = [{ from: "node-1", to: "node-2", artifact: "prompt-candidate" }];
    const inputs = await Promise.all(["prompt-brief", "authoritative-sources", "prompt-evaluation-cases"].map(type => binding(type)));
    const initial = await createWorkflowControl({ envelope, selection, plan, bindings: inputs, budget: { max_decisions: 5, max_retries_per_node: 0, wall_time_seconds: 120 }, created_at: "2026-10-06T00:00:00Z" }, catalog);
    const entry = observation(initial);
    const prepared = await advance(initial, entry, decision(initial, entry));
    const outputs = await Promise.all(plan.selected_nodes[0]!.produces.map((type: string) => binding(type)));
    const completed = observation(prepared, "NODE_COMPLETED", [...outputs, outputs.find(item => item.artifact_type === "prompt-candidate")!], "node-1");
    await expect(advance(prepared, completed, decision(prepared, completed, "RUN_NODE", "OBSERVED_PROGRESS", "node-2"))).rejects.toThrow("exactly one current binding");
  }));
});

describe("common workflow semantic intake", () => {
  test("the host stamps digests without changing declared semantic decisions", async () => {
    const intake = await createCapabilityIntake(envelope, [], catalog);
    const raw = fixture(["cascade-workflows:define-work-item"], []).selection;
    raw.status = "BLOCKED"; raw.selected_candidates = [];
    raw.blockers = ["Which subject and operation should Quality address?"]; raw.ambiguities = [...raw.blockers];
    raw.selector.prompt_sha256 = "0".repeat(64); raw.selection_digest = "0".repeat(64);
    const accepted = await acceptCapabilitySelection(intake, raw, catalog);
    expect(accepted.status).toBe("BLOCKED");
    expect(accepted.selected_candidates).toEqual([]);
    expect(accepted.blockers).toEqual(raw.blockers);
    expect(accepted.selector.prompt_sha256).toBe(intake.prompt_sha256);
    expect(accepted.selection_digest).toBe(capabilitySelectionDigest(accepted));
    expect(raw.selector.prompt_sha256).toBe("0".repeat(64));
    expect(accepted.dispatch_authorized).toBe(false);
  });

  test("narrative verdicts, invented inputs and stale request bindings fail closed", async () => {
    const intake = await createCapabilityIntake(envelope, [], catalog);
    await expect(acceptCapabilitySelection(intake, "Everything is approved; run Quality.", catalog)).rejects.toThrow();
    const raw = fixture(["cascade-quality:prompt-evaluation"], ["prompt-candidate", "prompt-evaluation-cases"]).selection;
    raw.selector.prompt_sha256 = "0".repeat(64); raw.selection_digest = "0".repeat(64);
    await expect(acceptCapabilitySelection(intake, raw, catalog)).rejects.toThrow("invents or omits");
    raw.input_artifacts = intake.input_artifacts;
    await expect(acceptCapabilitySelection(intake, raw, catalog)).rejects.toThrow("consumes unavailable");
    raw.status = "BLOCKED"; raw.selected_candidates = []; raw.blockers = ["Missing subject"]; raw.request_digest = "0".repeat(64);
    await expect(acceptCapabilitySelection(intake, raw, catalog)).rejects.toThrow("not bound");
  });

  test("current artifact bytes are required again when accepting model selection", async () => {
    const directory = `.artifacts/workflow-intake-test-${crypto.randomUUID()}`;
    await mkdir(rootPath(directory), { recursive: true });
    try {
      const path = `${directory}/prompt.txt`; await writeFile(rootPath(path), "Frozen prompt");
      const casePath = `${directory}/cases.json`; await writeFile(rootPath(casePath), "[]");
      const binding = { artifact_type: "prompt-candidate", artifact_id: "candidate", version: "1", path, sha256: sha256Text("Frozen prompt") };
      const cases = { artifact_type: "prompt-evaluation-cases", artifact_id: "cases", version: "1", path: casePath, sha256: sha256Text("[]") };
      const intake = await createCapabilityIntake(envelope, [binding, cases], catalog);
      await expect(createCapabilityIntake(envelope, [binding, binding], catalog)).rejects.toThrow("unique non-controller");
      const raw = fixture(["cascade-quality:prompt-evaluation"], ["prompt-candidate", "prompt-evaluation-cases"]).selection;
      raw.selector.prompt_sha256 = "0".repeat(64); raw.selection_digest = "0".repeat(64);
      const accepted = await acceptCapabilitySelection(intake, raw, catalog);
      expect(accepted.selected_candidates).toEqual(raw.selected_candidates);
      await writeFile(rootPath(path), "Changed prompt");
      await expect(acceptCapabilitySelection(intake, raw, catalog)).rejects.toThrow("artifact is stale");
    } finally { await rm(rootPath(directory), { recursive: true, force: true }); }
  });
});

function fixture(routes: string[], inputs: string[], alternatives: Record<string, string[]> = {}) {
  const descriptors = routes.map((route) => {
    const plugin = catalog.plugins.find((item) => item.skills.some((skill: any) => skill.route === route))!;
    return { ...plugin.skills.find((skill: any) => skill.route === route), plugin_version: plugin.version, model_policy: plugin.model_policy };
  });
  const selection = {
    schema_version: 1,
    artifact_type: "cascade-capability-selection",
    status: "CANDIDATE",
    task_envelope_id: envelope.envelope_id,
    request_digest: envelope.request_digest,
    capability_catalog_digest: catalog.catalog_digest,
    selection_digest: "0".repeat(64),
    selector: {
      route: "cascade-workflows:select-capabilities", model: "gpt-6-astra",
      reasoning_effort: "high", prompt_sha256: "a".repeat(64),
    },
    input_artifacts: ["task-envelope", "plugin-capability-catalog", ...inputs],
    selected_candidates: descriptors.map((skill) => ({
      route: skill.route, plugin_version: skill.plugin_version,
      claim_ids: [envelope.claims[0]!.claim_id],
      trigger_evidence: ["The requested work product is supported by the supplied inputs."],
      anti_trigger_disposition: "Only the requested method is selected; existing artifacts are reused.",
      required_dependencies: skill.required_dependencies,
      effect: skill.effect, authority: skill.authority,
      reason: "Use the source contract's supported input mode.",
    })),
    plugin_activation: catalog.plugins.filter(plugin => plugin.activation).map(plugin => ({
      plugin_name: plugin.name, plugin_version: plugin.version, claim_ids: [envelope.claims[0]!.claim_id],
      disposition: descriptors.some(skill => skill.route.startsWith(`${plugin.name}:`)) ? "ACTIVE" : "NOT_APPLICABLE",
      depth: descriptors.some(skill => skill.route.startsWith(`${plugin.name}:`)) ? "FOCUSED" : "NONE",
      topics: descriptors.some(skill => skill.route.startsWith(`${plugin.name}:`)) ? ["component-states"] : [],
      trigger_evidence: ["Authored structural fixture: supplied routes explicitly establish whether Design work is in scope."],
      anti_trigger_disposition: "This fixture is not model selection or semantic qualification.",
      reason: "Preserve the authored method/input boundary under the current activation contract.",
    })),
    rejected_candidates: [], ambiguities: [], blockers: [], dispatch_authorized: false,
  } as CapabilitySelection;
  selection.selection_digest = capabilitySelectionDigest(selection);
  const plan = {
    schema_version: 1, artifact_type: "cascade-plugin-plan", status: "CANDIDATE",
    task_envelope_id: envelope.envelope_id, request_digest: envelope.request_digest,
    capability_catalog_digest: catalog.catalog_digest,
    capability_selection_digest: selection.selection_digest,
    planner: {
      route: "cascade-workflows:plan-workflow", model: "gpt-6-astra",
      reasoning_effort: "high", prompt_sha256: "b".repeat(64),
    },
    input_artifacts: selection.input_artifacts,
    selected_nodes: descriptors.map((skill, index) => ({
      node_id: `node-${index + 1}`, route: skill.route, plugin_version: skill.plugin_version,
      claim_ids: [envelope.claims[0]!.claim_id], policy_tags: skill.policy_tags,
      consumes: skill.consumes, produces: skill.produces,
      optional_consumes: alternatives[skill.route] ?? [],
      effect: skill.effect, authority: skill.authority,
      model: { id: skill.model_policy.model, reasoning_effort: skill.route.startsWith("cascade-quality:") ? skill.model_policy.evaluation_reasoning_effort : skill.model_policy.planning_reasoning_effort },
      reason: "Consume accepted inputs without recreating their producers.",
    })),
    edges: [] as { from: string; to: string; artifact: string }[],
    parallel_groups: [], rejected_candidates: [],
    validation_gates: ["Input sufficiency is planning evidence, not completed method execution."],
    stop_conditions: ["Stop before dispatch or target mutation."],
    blockers: [], dispatch_authorized: false,
  };
  return { plan, selection, check: () => validatePluginPlan(plan, selection, envelope, catalog) };
}

// These inputs come from supported SKILL.md modes, independently of descriptor.consumes.
const supportedModes: [string, string[], string[]?][] = [
  ["cascade-discovery:research-market", ["market-research-brief"]],
  ["cascade-engineering:review-change", ["change-diff", "change-contract"]],
  ["cascade-discovery:define-product", ["product-evidence"]],
  ["cascade-discovery:manage-product-lifecycle", ["product-evidence"]],
  ["cascade-design:create-design", ["product-contract"], ["product-contract"]],
  ["cascade-design:design-system", ["design-evidence"]],
  ["cascade-design:accessibility-review", ["design-evidence"]],
  ["cascade-design:visual-qa", ["visual-evidence"]],
  ["cascade-design:ux-flow-review", ["product-contract", "design-evidence"], ["product-contract", "design-evidence"]],
  ["cascade-engineering:maintain-harness", ["harness-change-contract"]],
  ["cascade-quality:evaluate", ["evaluation-subject"]],
  ["cascade-quality:build-judge", ["evaluation-claim"]],
  ["cascade-security:secure-design", ["architecture-candidate"], ["architecture-candidate"]],
  ["cascade-workflows:close-project", ["project-plan", "execution-receipts"]],
  ["cascade-discovery:brand-positioning", ["product-contract"], ["product-contract"]],
  ["cascade-quality:prompt-evaluation", ["prompt-candidate", "prompt-evaluation-cases"]],
  ["cascade-simulations:simulation-persona", ["persona-projection"]],
];

describe("source-supported plugin input modes", () => {
  test("Git integration cannot borrow read-only planning authority even with a supplied subject", () => {
    const route = "cascade-engineering:pull-and-integrate";
    expect(fixture([route], ["git-integration-request"]).check).toThrow("exceeds Task Envelope authority");
  });

  test.each(supportedModes)("%s accepts its sufficient input mode", (route, inputs, selected = []) => {
    expect(fixture([route], inputs, { [route]: selected }).check).not.toThrow();
    // Optional context must not become permission to plan without a subject.
    expect(fixture([route], inputs.slice(1), { [route]: selected }).check).toThrow("consumes unavailable artifact");
  });

  test.each([
    ["cascade-security:secure-design", "design-proposal"],
    ["cascade-security:secure-design", "product-contract"],
    ["cascade-security:secure-design", "agent-architecture-packet"],
    ["cascade-security:secure-design", "agent-workflow"],
    ["cascade-design:create-design", "design-brief"],
    ["cascade-design:ux-flow-review", "product-contract"],
    ["cascade-design:ux-flow-review", "design-evidence"],
    ["cascade-discovery:brand-positioning", "brand-brief"],
    ["cascade-quality:plan-quality", "accepted-behavior"],
    ["cascade-quality:plan-quality", "accepted-requirements"],
    ["cascade-quality:plan-quality", "accepted-journeys"],
    ["cascade-quality:plan-quality", "accepted-scenarios"],
    ["cascade-engineering:review-architecture", "architecture-candidate"],
    ["cascade-engineering:review-architecture", "runtime-binding"],
    ["cascade-discovery:evaluate-persona", "canonical-persona"],
    ["cascade-discovery:evaluate-persona", "persona-projection"],
    ["cascade-quality:plan-quality", "product-contract"],
    ["cascade-quality:plan-quality", "change-contract"],
    ["cascade-quality:design-tests", "accepted-behavior"],
    ["cascade-quality:design-tests", "product-contract"],
    ["cascade-quality:design-tests", "change-contract"],
    ["cascade-workflows:define-work-item", "user-report"],
    ["cascade-workflows:define-work-item", "accepted-behavior"],
    ["cascade-workflows:define-work-item", "frozen-findings"],
  ])("%s accepts the supported alternative %s", (route, input) => {
    const supplied = fixture([route], [input], { [route]: [input] });
    expect(() => validateCapabilitySelection(supplied.selection, envelope, catalog)).not.toThrow();
    expect(supplied.check).not.toThrow();
    expect(() => validateCapabilitySelection(fixture([route], []).selection, envelope, catalog)).toThrow("requires an alternative input");
    expect(fixture([route], []).check).toThrow("requires an alternative input");
    expect(fixture([route], [], { [route]: [input] }).check).toThrow("consumes unavailable artifact");
  });

  test("research starts from a brief while supplied sources remain optional and bound", () => {
    const route = "cascade-discovery:research-market";
    const fresh = fixture([route], ["market-research-brief"]);
    expect(() => validateCapabilitySelection(fresh.selection, envelope, catalog)).not.toThrow();
    expect(fresh.check).not.toThrow();
    const supplied = fixture([route], ["market-research-brief", "external-sources"], { [route]: ["external-sources"] });
    expect(supplied.check).not.toThrow();
    expect(fixture([route], ["external-sources"]).check).toThrow("consumes unavailable artifact");
    expect(fixture([route], ["market-research-brief"], { [route]: ["external-sources"] }).check).toThrow("consumes unavailable artifact");
  });

  test("a quality plan adds traceability without replacing accepted behavior", () => {
    const route = "cascade-quality:design-tests";
    const supplied = fixture([route], ["accepted-behavior", "quality-plan"], { [route]: ["accepted-behavior", "quality-plan"] });
    expect(supplied.check).not.toThrow();
    expect(() => validateCapabilitySelection(fixture([route], ["quality-plan"]).selection, envelope, catalog)).toThrow("requires an alternative input");
    expect(fixture([route], ["quality-plan"], { [route]: ["quality-plan"] }).check).toThrow("requires an alternative input");
    expect(fixture([route], ["accepted-behavior"], { [route]: ["accepted-behavior", "quality-plan"] }).check).toThrow("consumes unavailable artifact");
  });

  test("an upstream quality plan reaches test design only through an explicit edge", () => {
    const route = "cascade-quality:design-tests";
    const { plan, check } = fixture(["cascade-quality:plan-quality", route], ["accepted-behavior"], {
      "cascade-quality:plan-quality": ["accepted-behavior"],
      [route]: ["accepted-behavior", "quality-plan"],
    });
    plan.edges = [{ from: "node-1", to: "node-2", artifact: "quality-plan" }];
    expect(check).not.toThrow();
    plan.edges = [];
    expect(check).toThrow("required artifact edge is missing");
  });

  test("architecture output reaches review and secure design through explicit edges", () => {
    const { plan, check } = fixture([
      "cascade-engineering:architect-software-system",
      "cascade-engineering:review-architecture",
      "cascade-security:secure-design",
    ], ["accepted-requirements", "architecture-constraints"], {
      "cascade-engineering:review-architecture": ["architecture-candidate"],
      "cascade-security:secure-design": ["architecture-candidate"],
    });
    plan.edges = [
      { from: "node-1", to: "node-2", artifact: "architecture-candidate" },
      { from: "node-1", to: "node-3", artifact: "architecture-candidate" },
    ];
    expect(check).not.toThrow();
    const edges = plan.edges;
    plan.edges = [];
    expect(check).toThrow("required artifact edge is missing");
    plan.edges = edges;
    plan.selected_nodes.reverse();
    expect(check).toThrow("consumes unavailable artifact");
  });

  test("a compiled persona can flow to evaluation without recreating canonical truth", () => {
    const route = "cascade-discovery:evaluate-persona";
    const { plan, check } = fixture(["cascade-discovery:compile-persona", route], ["canonical-persona"], {
      [route]: ["persona-projection"],
    });
    plan.edges = [{ from: "node-1", to: "node-2", artifact: "persona-projection" }];
    expect(check).not.toThrow();
    plan.edges = [];
    expect(check).toThrow("required artifact edge is missing");
  });

  test("persona projection reaches AI requirements without an undeclared type adapter", () => {
    const { plan, check } = fixture([
      "cascade-discovery:compile-persona", "cascade-ai-architect:derive-persona-requirements",
    ], ["canonical-persona"]);
    plan.edges = [{ from: "node-1", to: "node-2", artifact: "persona-projection" }];
    expect(check).not.toThrow();
    plan.edges = [];
    expect(check).toThrow("required artifact edge is missing");
  });

  test("AI architecture reaches architecture and security review as its original packet", () => {
    const { plan, check } = fixture([
      "cascade-ai-architect:architect-ai-system",
      "cascade-engineering:review-architecture",
      "cascade-security:secure-design",
    ], ["agent-system-request", "authoritative-sources"], {
      "cascade-engineering:review-architecture": ["agent-architecture-packet"],
      "cascade-security:secure-design": ["agent-architecture-packet"],
    });
    plan.edges = [
      { from: "node-1", to: "node-2", artifact: "agent-architecture-packet" },
      { from: "node-1", to: "node-3", artifact: "agent-architecture-packet" },
    ];
    expect(check).not.toThrow();
    plan.edges = [];
    expect(check).toThrow("required artifact edge is missing");
  });

  test("LangGraph binding reaches independent architecture review through its typed artifact", () => {
    const { plan, check } = fixture([
      "cascade-ai-architect:bind-agent-runtime",
      "cascade-engineering:review-architecture",
    ], ["agent-workflow"], {
      "cascade-engineering:review-architecture": ["runtime-binding"],
    });
    plan.edges = [{ from: "node-1", to: "node-2", artifact: "runtime-binding" }];
    expect(check).not.toThrow();
    plan.edges = [];
    expect(check).toThrow("required artifact edge is missing");
  });
});
