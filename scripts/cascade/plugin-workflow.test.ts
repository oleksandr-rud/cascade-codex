import { describe, expect, test } from "bun:test";

import { compileTaskEnvelope } from "./admission";
import {
  buildPluginCapabilityCatalog,
  capabilitySelectionDigest,
  type CapabilitySelection,
  validatePluginPlan,
} from "./plugin-workflow";

const catalog = await buildPluginCapabilityCatalog();
const envelope = await compileTaskEnvelope({
  request: "Plan the requested work using accepted inputs and current plugin contracts.",
  task_id: "plugin-input-regressions",
  produced_at: "2026-09-10T00:00:00+00:00",
});

function fixture(routes: string[], inputs: string[], alternatives: Record<string, string[]> = {}) {
  const descriptors = routes.map((route) => {
    const plugin = catalog.plugins.find((item) => item.skills.some((skill: any) => skill.route === route))!;
    return { ...plugin.skills.find((skill: any) => skill.route === route), plugin_version: plugin.version };
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
      route: "cascade-coordinator:select-capabilities", model: "gpt-5.6-sol",
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
    rejected_candidates: [], ambiguities: [], blockers: [], dispatch_authorized: false,
  } as CapabilitySelection;
  selection.selection_digest = capabilitySelectionDigest(selection);
  const plan = {
    schema_version: 1, artifact_type: "cascade-plugin-plan", status: "CANDIDATE",
    task_envelope_id: envelope.envelope_id, request_digest: envelope.request_digest,
    capability_catalog_digest: catalog.catalog_digest,
    capability_selection_digest: selection.selection_digest,
    planner: {
      route: "cascade-coordinator:plan-workflow", model: "gpt-5.6-sol",
      reasoning_effort: "high", prompt_sha256: "b".repeat(64),
    },
    input_artifacts: selection.input_artifacts,
    selected_nodes: descriptors.map((skill, index) => ({
      node_id: `node-${index + 1}`, route: skill.route, plugin_version: skill.plugin_version,
      claim_ids: [envelope.claims[0]!.claim_id], policy_tags: skill.policy_tags,
      consumes: skill.consumes, produces: skill.produces,
      optional_consumes: alternatives[skill.route] ?? [],
      effect: skill.effect, authority: skill.authority,
      model: { id: "gpt-5.6-sol", reasoning_effort: "max" },
      reason: "Consume accepted inputs without recreating their producers.",
    })),
    edges: [] as { from: string; to: string; artifact: string }[],
    parallel_groups: [], rejected_candidates: [],
    validation_gates: ["Input sufficiency is planning evidence, not completed method execution."],
    stop_conditions: ["Stop before dispatch or target mutation."],
    blockers: [], dispatch_authorized: false,
  };
  return { plan, check: () => validatePluginPlan(plan, selection, envelope, catalog) };
}

// These inputs come from supported SKILL.md modes, independently of descriptor.consumes.
const supportedModes: [string, string[], string[]?][] = [
  ["cascade-software-architect:review-change", ["change-diff", "change-contract"]],
  ["cascade-product:define-product", ["product-evidence"]],
  ["cascade-product:manage-product-lifecycle", ["product-evidence"]],
  ["cascade-design:create-design", ["product-contract"], ["product-contract"]],
  ["cascade-design:design-system", ["design-evidence"]],
  ["cascade-design:accessibility-review", ["design-evidence"]],
  ["cascade-design:visual-qa", ["visual-evidence"]],
  ["cascade-design:ux-flow-review", ["product-contract", "design-evidence"], ["product-contract", "design-evidence"]],
  ["cascade-coding-agent:maintain-harness", ["harness-change-contract"]],
  ["cascade-evals:evaluate", ["evaluation-subject"]],
  ["cascade-evals:build-judge", ["evaluation-claim"]],
  ["cascade-security:secure-design", ["architecture-candidate"], ["architecture-candidate"]],
  ["cascade-project-management:close-project", ["project-plan", "execution-receipts"]],
  ["cascade-market:brand-positioning", ["product-contract"], ["product-contract"]],
  ["cascade-evals:prompt-evaluation", ["prompt-candidate", "prompt-evaluation-cases"]],
  ["cascade-simulations:simulation-persona", ["persona-projection"]],
];

describe("source-supported plugin input modes", () => {
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
    ["cascade-market:brand-positioning", "brand-brief"],
    ["cascade-qa:plan-quality", "accepted-behavior"],
    ["cascade-qa:plan-quality", "accepted-requirements"],
    ["cascade-qa:plan-quality", "accepted-journeys"],
    ["cascade-qa:plan-quality", "accepted-scenarios"],
    ["cascade-software-architect:review-architecture", "architecture-candidate"],
    ["cascade-personas:evaluate-persona", "canonical-persona"],
    ["cascade-personas:evaluate-persona", "persona-projection"],
    ["cascade-qa:plan-quality", "product-contract"],
    ["cascade-qa:plan-quality", "change-contract"],
    ["cascade-project-management:define-work-item", "user-report"],
    ["cascade-project-management:define-work-item", "accepted-behavior"],
    ["cascade-project-management:define-work-item", "frozen-findings"],
  ])("%s accepts the supported alternative %s", (route, input) => {
    expect(fixture([route], [input], { [route]: [input] }).check).not.toThrow();
    expect(fixture([route], []).check).toThrow("requires an alternative input");
    expect(fixture([route], [], { [route]: [input] }).check).toThrow("consumes unavailable artifact");
  });

  test("architecture output reaches review and secure design through explicit edges", () => {
    const { plan, check } = fixture([
      "cascade-software-architect:architect-software-system",
      "cascade-software-architect:review-architecture",
      "cascade-security:secure-design",
    ], ["accepted-requirements", "architecture-constraints"], {
      "cascade-software-architect:review-architecture": ["architecture-candidate"],
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
    const route = "cascade-personas:evaluate-persona";
    const { plan, check } = fixture(["cascade-personas:compile-persona", route], ["canonical-persona"], {
      [route]: ["persona-projection"],
    });
    plan.edges = [{ from: "node-1", to: "node-2", artifact: "persona-projection" }];
    expect(check).not.toThrow();
    plan.edges = [];
    expect(check).toThrow("required artifact edge is missing");
  });

  test("persona projection reaches AI requirements without an undeclared type adapter", () => {
    const { plan, check } = fixture([
      "cascade-personas:compile-persona", "cascade-ai-architect:derive-persona-requirements",
    ], ["canonical-persona"]);
    plan.edges = [{ from: "node-1", to: "node-2", artifact: "persona-projection" }];
    expect(check).not.toThrow();
    plan.edges = [];
    expect(check).toThrow("required artifact edge is missing");
  });

  test("AI architecture reaches architecture and security review as its original packet", () => {
    const { plan, check } = fixture([
      "cascade-ai-architect:architect-ai-system",
      "cascade-software-architect:review-architecture",
      "cascade-security:secure-design",
    ], ["agent-system-request", "authoritative-sources"], {
      "cascade-software-architect:review-architecture": ["agent-architecture-packet"],
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
});
