import { describe, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import { compileTaskEnvelope } from "./admission";
import {
  buildPluginCapabilityCatalog,
  capabilitySelectionDigest,
  readPluginCapabilityCatalog,
  type CapabilitySelection,
  validateCapabilitySelection,
  validatePluginPlan,
} from "./plugin-workflow";

const PROMPT_DIGEST = "a".repeat(64);

function catalogSkill(catalog: Awaited<ReturnType<typeof buildPluginCapabilityCatalog>>, route: string): Record<string, any> {
  for (const plugin of catalog.plugins) {
    const skill = plugin.skills.find((candidate: Record<string, any>) => candidate.route === route);
    if (skill) return { ...skill, plugin_version: plugin.version };
  }
  throw new Error(`missing test route ${route}`);
}

function candidateFrom(skill: Record<string, any>, claimIds: string[]): Record<string, any> {
  return {
    route: skill.route,
    plugin_version: skill.plugin_version,
    claim_ids: claimIds,
    trigger_evidence: ["The route trigger directly matches the requested outcome."],
    anti_trigger_disposition: "No declared anti-trigger applies to this request.",
    required_dependencies: skill.required_dependencies,
    effect: skill.effect,
    authority: skill.authority,
    reason: "The capability directly satisfies a bound request claim.",
  };
}

function selectionFor(
  envelope: Awaited<ReturnType<typeof compileTaskEnvelope>>,
  catalog: Awaited<ReturnType<typeof buildPluginCapabilityCatalog>>,
  candidates: Record<string, any>[],
  inputArtifacts: string[],
  rejectedCandidates: Record<string, any>[] = [],
): CapabilitySelection {
  const selection = {
    schema_version: 1,
    artifact_type: "cascade-capability-selection",
    status: "CANDIDATE",
    task_envelope_id: envelope.envelope_id,
    request_digest: envelope.request_digest,
    capability_catalog_digest: catalog.catalog_digest,
    selection_digest: "0".repeat(64),
    selector: {
      route: "cascade-coordinator:select-capabilities",
      model: "gpt-5.6-sol",
      reasoning_effort: "high",
      prompt_sha256: PROMPT_DIGEST,
    },
    input_artifacts: ["task-envelope", "plugin-capability-catalog", ...inputArtifacts],
    selected_candidates: candidates,
    rejected_candidates: rejectedCandidates,
    ambiguities: [],
    blockers: [],
    dispatch_authorized: false,
  } as CapabilitySelection;
  selection.selection_digest = capabilitySelectionDigest(selection);
  return selection;
}

function nodeFrom(
  skill: Record<string, any>,
  claimIds: string[],
  nodeId: string,
  reasoningEffort = "high",
): Record<string, any> {
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
    model: { id: "gpt-5.6-sol", reasoning_effort: reasoningEffort },
    reason: "The capability directly satisfies the requested outcome.",
  };
}

function planFor(
  envelope: Awaited<ReturnType<typeof compileTaskEnvelope>>,
  catalog: Awaited<ReturnType<typeof buildPluginCapabilityCatalog>>,
  selection: CapabilitySelection,
  nodes: Record<string, any>[],
  edges: Record<string, any>[] = [],
): Record<string, any> {
  return {
    schema_version: 1,
    artifact_type: "cascade-plugin-plan",
    status: "CANDIDATE",
    task_envelope_id: envelope.envelope_id,
    request_digest: envelope.request_digest,
    capability_catalog_digest: catalog.catalog_digest,
    capability_selection_digest: selection.selection_digest,
    planner: {
      route: "cascade-coordinator:plan-workflow",
      model: "gpt-5.6-sol",
      reasoning_effort: "high",
      prompt_sha256: PROMPT_DIGEST,
    },
    input_artifacts: selection.input_artifacts,
    selected_nodes: nodes,
    edges,
    parallel_groups: [],
    rejected_candidates: selection.rejected_candidates.map((candidate) => ({ ...candidate })),
    validation_gates: ["Validate schema, dependencies, artifacts, authority, and model policy."],
    stop_conditions: ["Stop before dispatch or any target mutation."],
    blockers: [],
    dispatch_authorized: false,
  };
}

describe("plugin workflow catalog", () => {
  test("covers every repository plugin skill with Sol model policy", async () => {
    const catalog = await buildPluginCapabilityCatalog();
    expect(catalog.plugins).toHaveLength(14);
    expect(catalog.plugins.map((plugin) => plugin.name)).toContain("cascade-coordinator");
    expect(catalog.plugins.map((plugin) => plugin.name)).toContain("cascade-ai-architect");
    expect(catalog.plugins.map((plugin) => plugin.name)).toContain("cascade-software-architect");
    expect(catalog.plugins.map((plugin) => plugin.name)).not.toContain("cascade-architect");
    for (const plugin of catalog.plugins) {
      expect(plugin.model_policy.model).toBe("gpt-5.6-sol");
      expect(plugin.model_policy.evaluation_reasoning_effort).toBe("max");
    }
    expect(catalogSkill(catalog, "cascade-coordinator:plan-workflow").required_dependencies)
      .toEqual(["cascade-coordinator:select-capabilities"]);
    expect(() => catalogSkill(catalog, "cascade-software-architect:plan-workflow")).toThrow();
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

  test("loads the frozen runtime catalog without repository plugin source", async () => {
    const catalog = await buildPluginCapabilityCatalog();
    const root = await mkdtemp(resolve(tmpdir(), "cascade-plugin-catalog-"));
    const path = resolve(root, "catalog.json");
    try {
      await writeFile(path, `${JSON.stringify(catalog)}\n`, "utf8");
      expect((await readPluginCapabilityCatalog(path)).catalog_digest).toBe(
        catalog.catalog_digest,
      );
      const stale = { ...catalog, catalog_digest: "0".repeat(64) };
      await writeFile(path, `${JSON.stringify(stale)}\n`, "utf8");
      await expect(readPluginCapabilityCatalog(path)).rejects.toThrow(
        "catalog digest is invalid",
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

describe("capability selection validation", () => {
  test("accepts a current claim-bound direct route", async () => {
    const envelope = await compileTaskEnvelope({
      request: "Create evidence-backed brand positioning for this product.",
      task_id: "capability-selection-test",
      produced_at: "2026-09-01T00:00:00+00:00",
    });
    const catalog = await buildPluginCapabilityCatalog();
    const skill = catalogSkill(catalog, "cascade-market:brand-positioning");
    const claimIds = [envelope.claims[0]!.claim_id];
    const selection = selectionFor(envelope, catalog, [candidateFrom(skill, claimIds)], skill.consumes);
    expect(() => validateCapabilitySelection(selection, envelope, catalog)).not.toThrow();
  });

  test("rejects an unselected required dependency", async () => {
    const envelope = await compileTaskEnvelope({
      request: "Evaluate this frozen prompt with independent judges.",
      task_id: "capability-selection-dependency-test",
      produced_at: "2026-09-01T00:00:00+00:00",
    });
    const catalog = await buildPluginCapabilityCatalog();
    const evaluation = catalogSkill(catalog, "cascade-evals:prompt-evaluation");
    const selection = selectionFor(
      envelope,
      catalog,
      [candidateFrom(evaluation, [envelope.claims[0]!.claim_id])],
      evaluation.consumes,
    );
    expect(() => validateCapabilitySelection(selection, envelope, catalog)).toThrow(
      "required dependency is not selected",
    );
  });

  test("rejects empty claim bindings and selected-rejected collisions", async () => {
    const envelope = await compileTaskEnvelope({
      request: "Research this market opportunity.",
      task_id: "capability-selection-claims-test",
      produced_at: "2026-09-01T00:00:00+00:00",
    });
    const catalog = await buildPluginCapabilityCatalog();
    const skill = catalogSkill(catalog, "cascade-market:research-market");
    const emptyClaims = selectionFor(envelope, catalog, [candidateFrom(skill, [])], skill.consumes);
    expect(() => validateCapabilitySelection(emptyClaims, envelope, catalog)).toThrow();

    const collision = selectionFor(
      envelope,
      catalog,
      [candidateFrom(skill, [envelope.claims[0]!.claim_id])],
      skill.consumes,
      [{ route: skill.route, reason: "A deliberately conflicting disposition." }],
    );
    expect(() => validateCapabilitySelection(collision, envelope, catalog)).toThrow(
      "both selected and rejected",
    );
  });

  test("rejects coordinator controllers as domain work", async () => {
    const envelope = await compileTaskEnvelope({
      request: "Plan the plugin workflow without dispatching it.",
      task_id: "capability-selection-controller-test",
      produced_at: "2026-09-01T00:00:00+00:00",
    });
    const catalog = await buildPluginCapabilityCatalog();
    const skill = catalogSkill(catalog, "cascade-coordinator:plan-workflow");
    const selector = catalogSkill(catalog, "cascade-coordinator:select-capabilities");
    const selection = selectionFor(
      envelope,
      catalog,
      [
        candidateFrom(selector, [envelope.claims[0]!.claim_id]),
        candidateFrom(skill, [envelope.claims[0]!.claim_id]),
      ],
      ["capability-selection"],
    );
    expect(() => validateCapabilitySelection(selection, envelope, catalog)).toThrow(
      "coordination controller",
    );
  });
});

describe("plugin plan validation", () => {
  test("accepts a digest-bound non-dispatching Sol plan", async () => {
    const envelope = await compileTaskEnvelope({
      request: "Create evidence-backed brand positioning for this product.",
      task_id: "plugin-plan-test",
      produced_at: "2026-09-01T00:00:00+00:00",
    });
    const catalog = await buildPluginCapabilityCatalog();
    const skill = catalogSkill(catalog, "cascade-market:brand-positioning");
    const claimIds = [envelope.claims[0]!.claim_id];
    const selection = selectionFor(envelope, catalog, [candidateFrom(skill, claimIds)], skill.consumes);
    const plan = planFor(envelope, catalog, selection, [nodeFrom(skill, claimIds, "brand")]);
    expect(() => validatePluginPlan(plan, selection, envelope, catalog)).not.toThrow();
  });

  test("requires every selected producer-consumer artifact edge", async () => {
    const envelope = await compileTaskEnvelope({
      request: "Create and independently evaluate a prompt.",
      task_id: "plugin-plan-edge-test",
      produced_at: "2026-09-01T00:00:00+00:00",
    });
    const catalog = await buildPluginCapabilityCatalog();
    const prompt = catalogSkill(catalog, "cascade-prompt:prompt");
    const evaluation = catalogSkill(catalog, "cascade-evals:prompt-evaluation");
    const claimIds = [envelope.claims[0]!.claim_id];
    const selection = selectionFor(
      envelope,
      catalog,
      [candidateFrom(prompt, claimIds), candidateFrom(evaluation, claimIds)],
      ["prompt-brief", "authoritative-sources", "prompt-evaluation-cases"],
    );
    const plan = planFor(
      envelope,
      catalog,
      selection,
      [nodeFrom(prompt, claimIds, "prompt"), nodeFrom(evaluation, claimIds, "evaluation", "max")],
    );
    expect(() => validatePluginPlan(plan, selection, envelope, catalog)).toThrow(
      "required artifact edge is missing",
    );
    plan.edges.push({ from: "prompt", to: "evaluation", artifact: "prompt-candidate" });
    expect(() => validatePluginPlan(plan, selection, envelope, catalog)).not.toThrow();
  });

  test("rejects dependent read-only nodes in the same parallel group", async () => {
    const envelope = await compileTaskEnvelope({
      request: "Review and independently evaluate this frozen simulation run.",
      task_id: "plugin-plan-parallel-test",
      produced_at: "2026-09-01T00:00:00+00:00",
    });
    const catalog = await buildPluginCapabilityCatalog();
    const review = catalogSkill(catalog, "cascade-simulations:simulation-review");
    const evaluation = catalogSkill(catalog, "cascade-evals:simulation-evaluation");
    const claimIds = [envelope.claims[0]!.claim_id];
    const selection = selectionFor(
      envelope,
      catalog,
      [candidateFrom(review, claimIds), candidateFrom(evaluation, claimIds)],
      ["frozen-simulation-run"],
    );
    const plan = planFor(
      envelope,
      catalog,
      selection,
      [nodeFrom(review, claimIds, "review"), nodeFrom(evaluation, claimIds, "evaluation", "max")],
      [{ from: "review", to: "evaluation", artifact: "simulation-review" }],
    );
    plan.parallel_groups = [["review", "evaluation"]];
    expect(() => validatePluginPlan(plan, selection, envelope, catalog)).toThrow(
      "cannot run in parallel",
    );
  });

  test("requires max reasoning for evaluation nodes", async () => {
    const envelope = await compileTaskEnvelope({
      request: "Create and independently evaluate a prompt.",
      task_id: "plugin-plan-model-test",
      produced_at: "2026-09-01T00:00:00+00:00",
    });
    const catalog = await buildPluginCapabilityCatalog();
    const prompt = catalogSkill(catalog, "cascade-prompt:prompt");
    const evaluation = catalogSkill(catalog, "cascade-evals:prompt-evaluation");
    const claimIds = [envelope.claims[0]!.claim_id];
    const selection = selectionFor(
      envelope,
      catalog,
      [candidateFrom(prompt, claimIds), candidateFrom(evaluation, claimIds)],
      ["prompt-brief", "authoritative-sources", "prompt-evaluation-cases"],
    );
    const plan = planFor(
      envelope,
      catalog,
      selection,
      [nodeFrom(prompt, claimIds, "prompt"), nodeFrom(evaluation, claimIds, "evaluation", "high")],
      [{ from: "prompt", to: "evaluation", artifact: "prompt-candidate" }],
    );
    expect(() => validatePluginPlan(plan, selection, envelope, catalog)).toThrow(
      "evaluation reasoning effort must be max",
    );
  });

  test("rejects null planner prompts and dispatch escalation", async () => {
    const envelope = await compileTaskEnvelope({
      request: "Review this architecture candidate.",
      task_id: "plugin-plan-policy-test",
      produced_at: "2026-09-01T00:00:00+00:00",
    });
    const catalog = await buildPluginCapabilityCatalog();
    const skill = catalogSkill(catalog, "cascade-software-architect:review-architecture");
    const claimIds = [envelope.claims[0]!.claim_id];
    const selection = selectionFor(envelope, catalog, [candidateFrom(skill, claimIds)], skill.consumes);
    const plan = planFor(envelope, catalog, selection, [nodeFrom(skill, claimIds, "review")]);
    plan.planner.prompt_sha256 = null;
    plan.dispatch_authorized = true;
    expect(() => validatePluginPlan(plan, selection, envelope, catalog)).toThrow();
  });

  test("rejects duplicate plan rejections even when their route set matches", async () => {
    const envelope = await compileTaskEnvelope({
      request: "Review this architecture and reject an unrelated market route.",
      task_id: "plugin-plan-rejection-test",
      produced_at: "2026-09-01T00:00:00+00:00",
    });
    const catalog = await buildPluginCapabilityCatalog();
    const review = catalogSkill(catalog, "cascade-software-architect:review-architecture");
    const market = catalogSkill(catalog, "cascade-market:research-market");
    const claimIds = [envelope.claims[0]!.claim_id];
    const selection = selectionFor(
      envelope,
      catalog,
      [candidateFrom(review, claimIds)],
      review.consumes,
      [{ route: market.route, reason: "The request contains no market-research outcome." }],
    );
    const plan = planFor(envelope, catalog, selection, [nodeFrom(review, claimIds, "review")]);
    plan.rejected_candidates.push({
      route: market.route,
      reason: "A second disposition for the same route must not be accepted.",
    });
    expect(() => validatePluginPlan(plan, selection, envelope, catalog)).toThrow(
      "duplicate rejected routes",
    );
  });
});
