import { describe, expect, test } from "bun:test";

import {
  admissionHookWiringErrors,
  agentConcurrencyErrors,
  agentContractFrontmatterErrors,
  modelRegistryFreshnessErrors,
  repoPluginMetadataErrors,
  routeOrderErrors,
  type WorkGraphDocument,
  validateWorkGraphDocuments,
} from "./validate";

const admissionHookCommand = "npx --offline --yes bun@1.3.3 \"$(git rev-parse --show-toplevel)/scripts/cascade/task-admission-hook.ts\"";
const harnessImpactHookCommand = "npx --offline --yes bun@1.3.3 \"$(git rev-parse --show-toplevel)/scripts/cascade/harness-impact-hook.ts\"";

function admissionHooks(command = admissionHookCommand): Record<string, any> {
  const group = (matcher?: string, userPrompt = false) => ({ ...(matcher ? { matcher } : {}), hooks: [{ type: "command", command, timeout: 3, ...(userPrompt ? { additionalContextLimit: 1200 } : {}) }] });
  return {
    hooks: {
      UserPromptSubmit: [group(undefined, true)],
      PreToolUse: [group("*")],
      PermissionRequest: [group("*")],
      PostToolUse: [{
        matcher: "apply_patch",
        hooks: [{
          type: "command",
          command: harnessImpactHookCommand,
          timeout: 3,
          additionalContextLimit: 1200,
        }],
      }],
    },
  };
}

function document(path: string, text: string): WorkGraphDocument {
  return { path, text };
}

const validGraph = document(
  "docs/work/reports/2026-07-30-example-work-graph.md",
  `# Example Work Graph

Status: \`PLANNED\`
Work Graph ID: \`WG-001\`
Work Graph Revision: \`1\`
Terminal Gate: \`WG-001-GA\`

## Node Registry

| Node | Workline | Outcome |
|---|---|---|
| \`WG-001-N01\` | W-001 | bounded result |

## Gate Contracts

### WG-001-GA

Requires \`WG-001-N01\`.
`,
);

describe("work-graph validation", () => {
  test("accepts canonical graph-scoped IDs and resolved work references", () => {
    const workDocs = [
      validGraph,
      document(
        "docs/work/active.md",
        "Active graph `WG-001`; next node `WG-001-N01`; terminal `WG-001-GA`.",
      ),
    ];

    expect(validateWorkGraphDocuments([validGraph], workDocs)).toEqual([]);
  });

  test("rejects legacy terminology, legacy IDs, and malformed WG references", () => {
    const invalid = document(
      "docs/work/reports/2026-07-30-invalid-work-graph.md",
      `# Example Implementation Graph

Work Graph ID: \`IG-001\`
Terminal Gate: \`WG-01-GA\`

## Node Registry

| Node | Workline |
|---|---|
| \`IG-01\` | W-001 |

## Gate Contracts

### WG-01-GA
`,
    );

    const errors = validateWorkGraphDocuments([invalid], [invalid]);
    expect(errors.some((error) => error.includes("legacy implementation-graph terminology"))).toBe(
      true,
    );
    expect(errors.some((error) => error.includes("legacy work-graph id"))).toBe(true);
    expect(errors.some((error) => error.includes("invalid work-graph id shape"))).toBe(true);
    expect(errors.some((error) => error.includes("invalid Work Graph ID"))).toBe(true);
  });

  test("rejects duplicate graph IDs", () => {
    const duplicate = document(
      "docs/work/reports/2026-07-31-duplicate-work-graph.md",
      validGraph.text,
    );
    const errors = validateWorkGraphDocuments(
      [validGraph, duplicate],
      [validGraph, duplicate],
    );

    expect(errors.some((error) => error.includes("duplicate Work Graph ID WG-001"))).toBe(true);
  });

  test("rejects duplicate gate definitions", () => {
    const duplicateGate = document(
      validGraph.path,
      `${validGraph.text}

### WG-001-GA

Duplicate gate definition.
`,
    );
    const errors = validateWorkGraphDocuments([duplicateGate], [duplicateGate]);

    expect(errors.some((error) => error.includes("duplicate Gate Contracts ID"))).toBe(true);
  });

  test("rejects noncanonical report paths and dangling scoped references", () => {
    const misnamed = document(
      "docs/work/reports/2026-07-30-example.md",
      validGraph.text,
    );
    const dangling = document(
      "docs/work/active.md",
      "Active graph `WG-001`; missing node `WG-001-N99`.",
    );
    const errors = validateWorkGraphDocuments(
      [misnamed],
      [misnamed, dangling],
    );

    expect(errors.some((error) => error.includes("invalid work-graph report path"))).toBe(true);
    expect(errors.some((error) => error.includes("unknown work-graph node/gate reference"))).toBe(
      true,
    );
  });
});

describe("task admission hook validation", () => {
  test("accepts the exact repository hook path and executable command", () => {
    expect(admissionHookWiringErrors({ cascade: { admission_hook: ".codex/hooks.json" } }, admissionHooks())).toEqual([]);
  });

  test("rejects path drift, command drift, and missing event wiring", () => {
    expect(admissionHookWiringErrors({ cascade: { admission_hook: ".codex/other-hooks.json" } }, admissionHooks())).toContain("Cascade admission hook path is invalid");
    expect(admissionHookWiringErrors({ cascade: { admission_hook: ".codex/hooks.json" } }, admissionHooks("bun scripts/cascade/task-admission-hook.ts"))).toEqual(expect.arrayContaining([
      "Cascade admission hook command is invalid for UserPromptSubmit",
      "Cascade admission hook command is invalid for PreToolUse",
      "Cascade admission hook command is invalid for PermissionRequest",
    ]));
    const missing = admissionHooks();
    delete missing.hooks.PermissionRequest;
    expect(admissionHookWiringErrors({ cascade: { admission_hook: ".codex/hooks.json" } }, missing)).toContain("Cascade admission hook wiring is invalid for PermissionRequest");

    const missingImpact = admissionHooks();
    delete missingImpact.hooks.PostToolUse;
    expect(admissionHookWiringErrors({ cascade: { admission_hook: ".codex/hooks.json" } }, missingImpact)).toContain("Cascade harness impact hook wiring is invalid for PostToolUse");
  });

  test("rejects matcher, timeout, and prompt-context weakening", () => {
    const preToolMatcher = admissionHooks();
    preToolMatcher.hooks.PreToolUse[0].matcher = "Read";
    expect(admissionHookWiringErrors({ cascade: { admission_hook: ".codex/hooks.json" } }, preToolMatcher)).toContain("Cascade admission hook matcher is invalid for PreToolUse");

    const permissionMatcher = admissionHooks();
    permissionMatcher.hooks.PermissionRequest[0].matcher = "NoMatch";
    expect(admissionHookWiringErrors({ cascade: { admission_hook: ".codex/hooks.json" } }, permissionMatcher)).toContain("Cascade admission hook matcher is invalid for PermissionRequest");

    const missingTimeout = admissionHooks();
    delete missingTimeout.hooks.PreToolUse[0].hooks[0].timeout;
    expect(admissionHookWiringErrors({ cascade: { admission_hook: ".codex/hooks.json" } }, missingTimeout)).toContain("Cascade admission hook timeout is invalid for PreToolUse");

    const unboundedTimeout = admissionHooks();
    unboundedTimeout.hooks.PermissionRequest[0].hooks[0].timeout = 300;
    expect(admissionHookWiringErrors({ cascade: { admission_hook: ".codex/hooks.json" } }, unboundedTimeout)).toContain("Cascade admission hook timeout is invalid for PermissionRequest");

    const missingContext = admissionHooks();
    delete missingContext.hooks.UserPromptSubmit[0].hooks[0].additionalContextLimit;
    expect(admissionHookWiringErrors({ cascade: { admission_hook: ".codex/hooks.json" } }, missingContext)).toContain("Cascade admission hook additional context limit is invalid for UserPromptSubmit");

    const truncatingContext = admissionHooks();
    truncatingContext.hooks.UserPromptSubmit[0].hooks[0].additionalContextLimit = 100;
    expect(admissionHookWiringErrors({ cascade: { admission_hook: ".codex/hooks.json" } }, truncatingContext)).toContain("Cascade admission hook additional context limit is invalid for UserPromptSubmit");

    const broadImpactMatcher = admissionHooks();
    broadImpactMatcher.hooks.PostToolUse[0].matcher = "*";
    expect(admissionHookWiringErrors({ cascade: { admission_hook: ".codex/hooks.json" } }, broadImpactMatcher)).toContain("Cascade harness impact hook wiring is invalid for PostToolUse");

    const wrongImpactCommand = admissionHooks();
    wrongImpactCommand.hooks.PostToolUse[0].hooks[0].command = admissionHookCommand;
    expect(admissionHookWiringErrors({ cascade: { admission_hook: ".codex/hooks.json" } }, wrongImpactCommand)).toContain("Cascade harness impact hook command is invalid for PostToolUse");
  });
});

describe("active harness metadata validation", () => {
  test("parses agent contracts as real YAML and binds role plus skill map", () => {
    const valid = [
      "---",
      "name: Agent Engineer",
      "role: agent-engineer",
      "skill: skills.yaml",
      'description: "Use for harness work: skills, agents, and validators."',
      "---",
      "",
      "# Agent Engineer",
    ].join("\n");
    expect(agentContractFrontmatterErrors("agent.md", valid, "agent-engineer")).toEqual([]);

    const invalid = valid.replace(
      'description: "Use for harness work: skills, agents, and validators."',
      "description: Use for harness work: skills, agents, and validators.",
    );
    expect(agentContractFrontmatterErrors("agent.md", invalid, "agent-engineer")[0]).toStartWith(
      "invalid agent YAML frontmatter",
    );
  });

  test("rejects legacy or non-portable project concurrency overrides", () => {
    expect(agentConcurrencyErrors({})).toEqual([]);
    expect(agentConcurrencyErrors({ agents: { max_concurrent_threads_per_session: 6 } })).toContain(
      "project agent concurrency override must remain unset: agents.max_concurrent_threads_per_session",
    );
    const legacyKey = ["max", "threads"].join("_");
    expect(agentConcurrencyErrors({ agents: { [legacyKey]: 6 } })).toContain(
      "legacy agent concurrency key is forbidden; use agents.max_concurrent_threads_per_session or omit the override",
    );
  });

  test("enforces one canonical non-atomic route order", () => {
    const canonical = "context -> plan-change -> plan-iterations -> orchestrate-work -> functional-qa -> implement-change -> review-change -> validate-change -> test-autorepair -> closeout";
    expect(routeOrderErrors("route", canonical)).toEqual([]);
    const drifted = canonical.replace(
      "plan-change -> plan-iterations",
      "plan-iterations -> plan-change",
    );
    expect(routeOrderErrors("route", drifted)).toContain(
      "route missing or misordered route stage: plan-iterations",
    );
  });
});

describe("repo plugin validation", () => {
  function marketplace(path = "./.codex/plugins/cascade-prompt"): Record<string, any> {
    return {
      name: "cascade-project",
      interface: { displayName: "Cascade Project" },
      plugins: [{
        name: "cascade-prompt",
        source: { source: "local", path },
        policy: { installation: "AVAILABLE", authentication: "ON_INSTALL" },
        category: "Productivity",
      }],
    };
  }

  const manifest = {
    name: "cascade-prompt",
    version: "0.6.0+codex.local-test",
    description: "Create reliable prompts.",
    author: { name: "Cascade" },
    skills: "./skills/",
    interface: {
      displayName: "Cascade Prompt",
      shortDescription: "Build reliable AI prompts",
      longDescription: "Create source-aware production prompts.",
      developerName: "Cascade",
      category: "Productivity",
    },
  };

  test("accepts the repository-root plugin source and strict manifest", () => {
    expect(repoPluginMetadataErrors(marketplace(), manifest)).toEqual([]);
  });

  test("rejects plugin source drift", () => {
    expect(repoPluginMetadataErrors(marketplace("./plugins/cascade-prompt"), manifest)).toContain(
      "cascade-prompt marketplace source must be ./.codex/plugins/cascade-prompt",
    );
  });

  test("expires model routing data after the freshness window", () => {
    const now = new Date("2026-08-17T12:00:00Z");
    expect(modelRegistryFreshnessErrors("2026-08-05", now)).toEqual([]);
    expect(modelRegistryFreshnessErrors("2026-06-01", now)[0]).toContain("is stale");
  });
});
