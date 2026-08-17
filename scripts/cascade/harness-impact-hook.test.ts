import { describe, expect, test } from "bun:test";

import {
  changedPathsFromPatch,
  classifyHarnessImpact,
  handleHarnessImpactHook,
} from "./harness-impact-hook";

describe("harness impact classifier", () => {
  test("ignores ordinary product and documentation edits", () => {
    expect(classifyHarnessImpact(["src/app.ts", "docs/product/requirements.md"]).decision)
      .toBe("NOT_APPLICABLE");
  });

  test("requires only mechanical checks for the eval runner", () => {
    const impact = classifyHarnessImpact(["scripts/cascade/evals.ts"]);
    expect(impact.decision).toBe("MECHANICAL_CHECK");
    expect(impact.required_checks).toEqual([
      "bun scripts/cascade.ts eval catalog --check",
      "bun scripts/cascade.ts eval self-test",
    ]);
  });

  test("routes changed scenarios to assertion review without auto-running live evals", () => {
    const impact = classifyHarnessImpact(["harness-evals/interactions.json"]);
    expect(impact.decision).toBe("ASSERTION_REVIEW");
    expect(impact.instruction).toContain("only the affected live scenario");
    expect(impact.instruction).toContain("NOT_APPLICABLE");
  });

  test("detects harness-specific routing instructions without capturing unrelated role edits", () => {
    const path = ".codex/agents/agent-engineer/AGENT.md";
    expect(classifyHarnessImpact([path], "+ Route eligible harness evaluation evidence.").decision)
      .toBe("ASSERTION_REVIEW");
    expect(classifyHarnessImpact([path], "+ Improve connector guidance.").decision)
      .toBe("NOT_APPLICABLE");
  });

  test("keeps judge-contract review bounded to calibration cases", () => {
    const impact = classifyHarnessImpact([
      "scripts/cascade/evals.ts",
      "harness-evals/rubrics/outcome-v1.json",
    ]);
    expect(impact.decision).toBe("JUDGE_CONTRACT_REVIEW");
    expect(impact.instruction).toContain("bounded calibration/adversarial cases");
  });

  test("extracts only changed files from an apply_patch payload", () => {
    const patch = `*** Begin Patch
*** Update File: /workspace/harness-evals/skill-cases.json
@@
-old
+new
*** Add File: /workspace/docs/note.md
+note
*** End Patch`;
    expect(changedPathsFromPatch(patch, "/workspace")).toEqual([
      "docs/note.md",
      "harness-evals/skill-cases.json",
    ]);
  });
});

describe("harness impact PostToolUse hook", () => {
  test("returns no context for unrelated patches", () => {
    expect(handleHarnessImpactHook({
      hook_event_name: "PostToolUse",
      tool_name: "apply_patch",
      cwd: "/workspace",
      tool_input: { command: "*** Begin Patch\n*** Update File: /workspace/src/app.ts\n*** End Patch" },
    })).toEqual({});
  });

  test("tells the active agent what to report for actual harness assertions", () => {
    const output = handleHarnessImpactHook({
      hook_event_name: "PostToolUse",
      tool_name: "apply_patch",
      cwd: "/workspace",
      tool_input: { command: "*** Begin Patch\n*** Update File: /workspace/harness-evals/agent-outcomes.json\n*** End Patch" },
    });
    const context = output.hookSpecificOutput.additionalContext;
    expect(context).toContain("Harness impact hook: ASSERTION_REVIEW");
    expect(context).toContain("Use the Agent Engineer contract");
    expect(context).toContain("Harness Evaluator only after");
    expect(context).toContain("focused live review as PASS, FAIL, BLOCKED, NOT_RUN, or NOT_APPLICABLE");
    expect(context).toContain("does not grant authority or prove review");
  });
});
