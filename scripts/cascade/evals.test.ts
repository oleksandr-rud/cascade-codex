import { describe, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { rootPath } from "./common";
import { readStructured, stringifyYaml } from "./structured-data";
import {
  gradeCascadeHarnessTrace,
  resolveCascadeHarnessProfile,
} from "./evals";

const profileFiles = {
  profile_file: rootPath(
    "product-evals/tasks/agent-response/cascade-harness-profile-v1.yaml",
  ),
  prompt_file: rootPath(
    "product-evals/tasks/agent-response/cascade-harness-prompt.md",
  ),
  input_file: rootPath(
    "product-evals/tasks/agent-response/cascade-harness-scenario.yaml",
  ),
  output_schema_file: rootPath("harness-evals/response.schema.json"),
};

describe("Cascade harness profile seam", () => {
  test("exact-matches the current scenario, catalog, and harness source", async () => {
    const resolvedProfile = await resolveCascadeHarnessProfile(profileFiles);
    expect(resolvedProfile.scenario.id).toBe("HX-055");
    expect(resolvedProfile.profile.scenario_digest).toMatch(/^[a-f0-9]{64}$/);
    expect(resolvedProfile.harness_source_manifest.digest).toBe(
      resolvedProfile.profile.harness_source_digest,
    );
    const sourcePaths = new Set(
      resolvedProfile.harness_source_manifest.files.map((item: { path: string }) => item.path),
    );
    expect(sourcePaths).toContain(".agents/plugins/marketplace.json");
    expect(sourcePaths).toContain(".codex/plugin-capabilities.generated.json");
    expect(sourcePaths).toContain(
      ".codex/plugins/cascade-coordinator/skills/select-capabilities/SKILL.md",
    );
    expect(resolvedProfile.prompt).not.toContain("expected_primary");
  });

  test("rejects a stale profile before target execution", async () => {
    const directory = await mkdtemp(
      resolve(rootPath(".artifacts"), "cascade-profile-"),
    );
    try {
      const profile = await readStructured<Record<string, any>>(
        profileFiles.profile_file,
        "cascade harness profile fixture",
      );
      profile.scenario_digest = "0".repeat(64);
      const stalePath = resolve(directory, "profile.yaml");
      await writeFile(stalePath, stringifyYaml(profile));
      await expect(resolveCascadeHarnessProfile({
        ...profileFiles,
        profile_file: stalePath,
      })).rejects.toThrow("stale or does not match");
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  test("mutation remains a non-compensating deterministic failure", async () => {
    const resolvedProfile = await resolveCascadeHarnessProfile(profileFiles);
    const finalResponse = {
      scenario_id: "HX-055",
      primary_skill: "cascade-evals:harness-evaluation",
      supporting_skills: [],
      rejected_skills: ["cascade-evals:simulation-evaluation", "cascade-simulations:execute-simulation-campaign"],
      status: "PASS",
      decision: "The answer is semantically strong but attempted a write.",
      evidence: [{ path: ".codex/plugins/cascade-evals/skills/harness-evaluation/SKILL.md", observation: "loaded" }],
      actions: [],
      missing_context: [],
      next_route: "",
    };
    const stdout = [
      { type: "thread.started", thread_id: "mutation-probe" },
      {
        type: "item.completed",
        item: {
          type: "command_execution",
          command: "sed -n '1,80p' .codex/plugins/cascade-evals/skills/harness-evaluation/SKILL.md",
          status: "completed",
          exit_code: 0,
          aggregated_output: "",
        },
      },
      {
        type: "item.completed",
        item: {
          type: "command_execution",
          command: "apply_patch",
          status: "failed",
          exit_code: 1,
          aggregated_output: "read-only",
        },
      },
      { type: "item.completed", item: { type: "agent_message", text: JSON.stringify(finalResponse) } },
      { type: "turn.completed", usage: { output_tokens: 100 } },
    ].map((event) => JSON.stringify(event)).join("\n");
    const graded = await gradeCascadeHarnessTrace(resolvedProfile, {
      stdout,
      stderr: "",
      exit_code: 0,
      duration_ms: 1,
      timed_out: false,
    });
    expect(graded.eligibility.verdict).toBe("FAIL");
    expect(graded.eligibility.hard_failures).toContain("read-only-safety");
  });

  test("records repository plugin skills with their namespaced identity", async () => {
    const resolvedProfile = await resolveCascadeHarnessProfile(profileFiles);
    const finalResponse = {
      scenario_id: "HX-055",
      primary_skill: "cascade-evals:harness-evaluation",
      supporting_skills: [],
      rejected_skills: ["cascade-evals:simulation-evaluation", "cascade-simulations:execute-simulation-campaign"],
      status: "PASS",
      decision: "The harness evaluation route is selected.",
      evidence: [{ path: ".codex/plugins/cascade-evals/skills/harness-evaluation/SKILL.md", observation: "loaded" }],
      actions: [],
      missing_context: [],
      next_route: "",
    };
    const stdout = [
      { type: "thread.started", thread_id: "plugin-skill-probe" },
      {
        type: "item.completed",
        item: {
          type: "command_execution",
          command: "sed -n '1,80p' .codex/plugins/cascade-evals/skills/harness-evaluation/SKILL.md .codex/plugins/cascade-coding-agent/skills/audit-harness/SKILL.md",
          status: "completed",
          exit_code: 0,
          aggregated_output: "",
        },
      },
      { type: "item.completed", item: { type: "agent_message", text: JSON.stringify(finalResponse) } },
      { type: "turn.completed", usage: { output_tokens: 100 } },
    ].map((event) => JSON.stringify(event)).join("\n");
    const graded = await gradeCascadeHarnessTrace(resolvedProfile, {
      stdout,
      stderr: "",
      exit_code: 0,
      duration_ms: 1,
      timed_out: false,
    });
    expect(graded.trace.loaded_skills).toContain("cascade-evals:harness-evaluation");
  });
});
