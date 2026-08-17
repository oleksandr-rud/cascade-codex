#!/usr/bin/env bun

import { isAbsolute, relative } from "node:path";

type JsonObject = Record<string, any>;

export type HarnessImpactDecision =
  | "NOT_APPLICABLE"
  | "MECHANICAL_CHECK"
  | "ASSERTION_REVIEW"
  | "JUDGE_CONTRACT_REVIEW";

export type HarnessImpact = {
  decision: HarnessImpactDecision;
  changed_paths: string[];
  required_checks: string[];
  instruction: string;
};

const DECISION_PRIORITY: Record<HarnessImpactDecision, number> = {
  NOT_APPLICABLE: 0,
  MECHANICAL_CHECK: 1,
  ASSERTION_REVIEW: 2,
  JUDGE_CONTRACT_REVIEW: 3,
};

function normalizePath(path: string, cwd: string): string {
  const value = path.trim().replaceAll("\\", "/");
  const normalized = (isAbsolute(value) ? relative(cwd, value) : value)
    .replaceAll("\\", "/")
    .replace(/^\.\//, "");
  return normalized.startsWith("../") ? "" : normalized;
}

export function changedPathsFromPatch(patch: string, cwd = process.cwd()): string[] {
  const paths = new Set<string>();
  for (const match of patch.matchAll(/^\*\*\* (?:Add|Update|Delete) File:\s*(.+)$/gm)) {
    const path = normalizePath(match[1] ?? "", cwd);
    if (path) paths.add(path);
  }
  return [...paths].sort();
}

function decisionForPath(path: string, patch = ""): HarnessImpactDecision {
  if (
    path === "harness-evals/judge-profiles.json"
    || path === "harness-evals/judge-response.schema.json"
    || path.startsWith("harness-evals/rubrics/")
    || path.startsWith(".codex/skills/judge-eval-builder/")
  ) return "JUDGE_CONTRACT_REVIEW";
  if (
    path === "harness-evals/skill-cases.json"
    || path === "harness-evals/interactions.json"
    || path === "harness-evals/agent-outcomes.json"
    || path.startsWith(".codex/skills/harness-evaluation/")
    || path === ".codex/agents/harness-evaluator.toml"
    || path.startsWith(".codex/agents/harness-evaluator/")
  ) return "ASSERTION_REVIEW";
  if (
    path === "scripts/cascade/evals.ts"
    || path === "scripts/cascade/harness-impact-hook.ts"
    || path === "harness-evals/response.schema.json"
    || path === "harness-evals/scenarios.generated.json"
  ) return "MECHANICAL_CHECK";
  if (
    ["AGENTS.md", "CODEX.md", ".codex/agents/agent-engineer/AGENT.md"].includes(path)
    && /harness[- ](?:evaluation|evaluator|impact)/i.test(patch)
  ) return "ASSERTION_REVIEW";
  return "NOT_APPLICABLE";
}

export function classifyHarnessImpact(paths: string[], patch = ""): HarnessImpact {
  const changedPaths = [...new Set(paths)].sort();
  let decision: HarnessImpactDecision = "NOT_APPLICABLE";
  for (const path of changedPaths) {
    const candidate = decisionForPath(path, patch);
    if (DECISION_PRIORITY[candidate] > DECISION_PRIORITY[decision]) decision = candidate;
  }
  if (decision === "NOT_APPLICABLE") {
    return {
      decision,
      changed_paths: changedPaths,
      required_checks: [],
      instruction: "No actual harness-evaluation implementation or assertion changed.",
    };
  }
  if (decision === "MECHANICAL_CHECK") {
    return {
      decision,
      changed_paths: changedPaths,
      required_checks: [
        "bun scripts/cascade.ts eval catalog --check",
        "bun scripts/cascade.ts eval self-test",
      ],
      instruction: "Run the focused mechanical checks. Do not launch a live model evaluation unless a changed assertion requires semantic evidence.",
    };
  }
  if (decision === "ASSERTION_REVIEW") {
    return {
      decision,
      changed_paths: changedPaths,
      required_checks: [
        "bun scripts/cascade.ts eval catalog --check",
        "bun scripts/cascade.ts eval self-test",
      ],
      instruction: "Inspect the changed trigger, scenario, expectation, or role assertion. Run only the affected live scenario and independent judge when that assertion cannot be decided mechanically; otherwise record live review as NOT_APPLICABLE with a reason.",
    };
  }
  return {
    decision,
    changed_paths: changedPaths,
    required_checks: [
      "bun scripts/cascade.ts eval catalog --check",
      "bun scripts/cascade.ts eval self-test",
    ],
    instruction: "Validate the changed judge schema, profile, or rubric mechanically, then run only its bounded calibration/adversarial cases. Do not rerun unrelated target scenarios.",
  };
}

function hookContext(impact: HarnessImpact): string {
  return [
    `Harness impact hook: ${impact.decision}.`,
    `Changed paths in this patch: ${impact.changed_paths.join(", ")}.`,
    `Required checks: ${impact.required_checks.join("; ")}.`,
    impact.instruction,
    "Use the Agent Engineer contract to inspect the changed assertion. Route to Harness Evaluator only after an affected live trace is mechanically eligible and truly needs semantic judgment.",
    "In the final validation output record: hook decision, checks run, changed assertion disposition, and focused live review as PASS, FAIL, BLOCKED, NOT_RUN, or NOT_APPLICABLE. This advisory does not grant authority or prove review.",
  ].join(" ");
}

export function handleHarnessImpactHook(input: JsonObject): JsonObject {
  if (input.hook_event_name !== "PostToolUse" || input.tool_name !== "apply_patch") return {};
  const toolInput = input.tool_input;
  const patch = typeof toolInput === "string"
    ? toolInput
    : String(toolInput?.command ?? toolInput?.patch ?? "");
  const paths = changedPathsFromPatch(patch, String(input.cwd ?? process.cwd()));
  const impact = classifyHarnessImpact(paths, patch);
  if (impact.decision === "NOT_APPLICABLE") return {};
  return {
    hookSpecificOutput: {
      hookEventName: "PostToolUse",
      additionalContext: hookContext(impact),
    },
  };
}

if (import.meta.main) {
  try {
    const input = await Bun.stdin.json();
    console.log(JSON.stringify(handleHarnessImpactHook(input)));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
