import { describe, expect, test } from "bun:test";

import { compileTaskEnvelope } from "./admission";
import {
  buildPluginCapabilityCatalog,
  validatePluginPlan,
} from "./plugin-workflow";

function catalogSkill(catalog: Awaited<ReturnType<typeof buildPluginCapabilityCatalog>>, route: string): Record<string, any> {
  for (const plugin of catalog.plugins) {
    const skill = plugin.skills.find((candidate: Record<string, any>) => candidate.route === route);
    if (skill) return { ...skill, plugin_version: plugin.version };
  }
  throw new Error(`missing test route ${route}`);
}

function nodeFrom(skill: Record<string, any>, claimIds: string[], nodeId = "subject"): Record<string, any> {
  return {
    node_id: nodeId,
    route: skill.route,
    plugin_version: skill.plugin_version,
    claim_ids: claimIds,
    policy_tags: skill.policy_tags,
    consumes: skill.consumes,
    produces: skill.produces,
    effect: skill.effect,
    authority: skill.authority,
    model: { id: "gpt-5.6-sol", reasoning_effort: "high" },
    reason: "The capability directly satisfies the requested outcome.",
  };
}

function planFor(
  envelope: Awaited<ReturnType<typeof compileTaskEnvelope>>,
  catalog: Awaited<ReturnType<typeof buildPluginCapabilityCatalog>>,
  node: Record<string, any>,
): Record<string, any> {
  return {
    schema_version: 1,
    artifact_type: "cascade-plugin-plan",
    status: "CANDIDATE",
    task_envelope_id: envelope.envelope_id,
    request_digest: envelope.request_digest,
    capability_catalog_digest: catalog.catalog_digest,
    planner: {
      route: "cascade-software-architect:plan-workflow",
      model: "gpt-5.6-sol",
      reasoning_effort: "high",
      prompt_sha256: null,
    },
    input_artifacts: node.consumes,
    selected_nodes: [node],
    edges: [],
    parallel_groups: [],
    rejected_candidates: [],
    validation_gates: ["Validate schema, dependencies, artifacts, authority, and model policy."],
    stop_conditions: ["Stop before dispatch or any target mutation."],
    blockers: [],
    dispatch_authorized: false,
  };
}

describe("plugin workflow catalog", () => {
  test("covers every repository plugin skill with Sol model policy", async () => {
    const catalog = await buildPluginCapabilityCatalog();
    expect(catalog.plugins).toHaveLength(13);
    expect(catalog.plugins.map((plugin) => plugin.name)).toContain("cascade-ai-architect");
    expect(catalog.plugins.map((plugin) => plugin.name)).toContain("cascade-software-architect");
    expect(catalog.plugins.map((plugin) => plugin.name)).not.toContain("cascade-architect");
    expect(catalog.plugins.map((plugin) => plugin.name)).toContain("cascade-market");
    for (const plugin of catalog.plugins) {
      expect(plugin.model_policy.model).toBe("gpt-5.6-sol");
      expect(plugin.model_policy.evaluation_reasoning_effort).toBe("max");
    }
    const promptEvaluation = catalogSkill(catalog, "cascade-evals:prompt-evaluation");
    expect(promptEvaluation.required_dependencies).toEqual(["cascade-prompt:prompt"]);
    expect(promptEvaluation.optional_dependencies).toEqual(["cascade-simulations:simulate"]);
  });

  test("keeps prompt briefing and prompt authoring under distinct artifact owners", async () => {
    const catalog = await buildPluginCapabilityCatalog();
    const promptBrief = catalogSkill(catalog, "cascade-ai-architect:prepare-agent-prompt");
    const prompt = catalogSkill(catalog, "cascade-prompt:prompt");
    expect(promptBrief.produces).toEqual(["prompt-brief"]);
    expect(prompt.produces).toEqual(["prompt-candidate"]);
    expect(prompt.consumes).toContain("prompt-brief");
  });
});

describe("plugin plan validation", () => {
  test("accepts a digest-bound non-dispatching Sol plan", async () => {
    const envelope = await compileTaskEnvelope({
      request: "Create evidence-backed brand positioning for this product.",
      task_id: "plugin-plan-test",
      produced_at: "2026-08-26T00:00:00+00:00",
    });
    const catalog = await buildPluginCapabilityCatalog();
    const skill = catalogSkill(catalog, "cascade-market:brand-positioning");
    const plan = planFor(envelope, catalog, nodeFrom(skill, [envelope.claims[0]!.claim_id]));
    expect(() => validatePluginPlan(plan, envelope, catalog)).not.toThrow();
  });

  test("rejects an unselected required dependency", async () => {
    const envelope = await compileTaskEnvelope({
      request: "Create the architecture-bound prompt for this agent workflow.",
      task_id: "plugin-plan-dependency-test",
      produced_at: "2026-08-26T00:00:00+00:00",
    });
    const catalog = await buildPluginCapabilityCatalog();
    const skill = catalogSkill(catalog, "cascade-evals:prompt-evaluation");
    const plan = planFor(envelope, catalog, nodeFrom(skill, [envelope.claims[0]!.claim_id]));
    expect(() => validatePluginPlan(plan, envelope, catalog)).toThrow(
      "required dependency must appear earlier",
    );
  });

  test("rejects model-policy or dispatch escalation", async () => {
    const envelope = await compileTaskEnvelope({
      request: "Review this architecture candidate.",
      task_id: "plugin-plan-policy-test",
      produced_at: "2026-08-26T00:00:00+00:00",
    });
    const catalog = await buildPluginCapabilityCatalog();
    const skill = catalogSkill(catalog, "cascade-software-architect:review-architecture");
    const plan = planFor(envelope, catalog, nodeFrom(skill, [envelope.claims[0]!.claim_id]));
    plan.selected_nodes[0].model.id = "gpt-5.6-terra";
    plan.dispatch_authorized = true;
    expect(() => validatePluginPlan(plan, envelope, catalog)).toThrow();
  });

  test("rejects the planning controller as a selected work node", async () => {
    const envelope = await compileTaskEnvelope({
      request: "Plan the plugin workflow without dispatching it.",
      task_id: "plugin-plan-controller-test",
      produced_at: "2026-08-26T00:00:00+00:00",
    });
    const catalog = await buildPluginCapabilityCatalog();
    const skill = catalogSkill(catalog, "cascade-software-architect:plan-workflow");
    const plan = planFor(envelope, catalog, nodeFrom(skill, [envelope.claims[0]!.claim_id]));
    expect(() => validatePluginPlan(plan, envelope, catalog)).toThrow(
      "cannot be a selected work node",
    );
  });
});
