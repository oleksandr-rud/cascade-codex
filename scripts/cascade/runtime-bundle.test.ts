import { afterEach, describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { resolve } from "node:path";
import { tmpdir } from "node:os";

import { buildRuntimeBundle } from "../build-runtime-bundle";
import { compileTaskEnvelope } from "./admission";
import {
  capabilitySelectionDigest,
  readPluginCapabilityCatalog,
  type CapabilitySelection,
} from "./plugin-workflow";
import { rootPath } from "./common";
import { parseStrictYaml, stringifyYaml } from "./structured-data";
import { validateConfig } from "./target";

const outputs: string[] = [];

afterEach(async () => {
  for (const output of outputs.splice(0)) {
    await rm(output, { recursive: true, force: true });
  }
});

function runBundle(output: string, args: string[]) {
  return Bun.spawnSync({
    cmd: [process.execPath, resolve(output, ".codex/runtime/cascade.js"), ...args],
    cwd: output,
    stdout: "pipe",
    stderr: "pipe",
  });
}

describe("Cascade lean target runtime bundle", () => {
  test("ships only core host adapters and validates routing from the frozen catalog", async () => {
    const output = rootPath(`dist/runtime-bundle-test-${randomUUID()}`);
    outputs.push(output);
    const report = await buildRuntimeBundle(output);
    expect(report.file_count).toBeLessThanOrEqual(120);
    expect(report.plugin_count).toBe(14);

    for (const excluded of [
      ".codex/plugins",
      ".codex/agents/harness-evaluator.toml",
      ".codex/agents/simulation-operator.toml",
      ".codex/agents/simulation-evaluator.toml",
      "harness-evals",
      "product-evals",
      "docs/archive",
      "scripts",
    ]) {
      await expect(stat(resolve(output, excluded))).rejects.toThrow();
    }

    const help = runBundle(output, ["--help"]);
    expect(help.exitCode).toBe(0);
    expect(help.stdout.toString()).toContain("Cascade core target runtime");
    expect(help.stdout.toString()).not.toContain("campaign run");
    const sourceOnly = runBundle(output, ["admission", "corpus"]);
    expect(sourceOnly.exitCode).toBe(1);
    expect(sourceOnly.stderr.toString()).toContain("source-checkout-only");

    const explain = runBundle(output, [
      "admission",
      "explain",
      "--request",
      "Explain the installed plugin boundary.",
    ]);
    expect(explain.exitCode).toBe(0);
    expect(explain.stdout.toString()).toContain("route=NO_WORKFLOW");

    const catalog = await readPluginCapabilityCatalog();
    const envelope = await compileTaskEnvelope({
      request: "Research this market opportunity.",
      task_id: "lean-runtime-routing",
      produced_at: "2026-09-02T00:00:00+00:00",
    });
    const plugin = catalog.plugins.find((item) => item.name === "cascade-market")!;
    const skill = plugin.skills.find(
      (item: Record<string, any>) => item.route === "cascade-market:research-market",
    )!;
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
        model: "gpt-6-astra",
        reasoning_effort: "high",
        prompt_sha256: "a".repeat(64),
      },
      input_artifacts: [
        "task-envelope",
        "plugin-capability-catalog",
        ...skill.consumes,
      ],
      selected_candidates: [
        {
          route: skill.route,
          plugin_version: plugin.version,
          claim_ids: [envelope.claims[0]!.claim_id],
          trigger_evidence: ["The request asks for current market research."],
          anti_trigger_disposition: "No declared anti-trigger applies.",
          required_dependencies: skill.required_dependencies,
          effect: skill.effect,
          authority: skill.authority,
          reason: "The route directly satisfies the request claim.",
        },
      ],
      rejected_candidates: [],
      ambiguities: [],
      blockers: [],
      dispatch_authorized: false,
    } as CapabilitySelection;
    selection.selection_digest = capabilitySelectionDigest(selection);
    const artifacts = resolve(output, ".artifacts/runtime-bundle-test");
    await mkdir(artifacts, { recursive: true });
    await writeFile(
      resolve(artifacts, "envelope.json"),
      `${JSON.stringify(envelope, null, 2)}\n`,
      "utf8",
    );
    await writeFile(
      resolve(artifacts, "selection.json"),
      `${JSON.stringify(selection, null, 2)}\n`,
      "utf8",
    );
    const validation = runBundle(output, [
      "workflow",
      "validate-selection",
      "--selection",
      ".artifacts/runtime-bundle-test/selection.json",
      "--envelope",
      ".artifacts/runtime-bundle-test/envelope.json",
    ]);
    expect(validation.exitCode).toBe(0);
    expect(validation.stdout.toString()).toContain(
      "capability_selection_status=PASS",
    );

    // Exercise the real bundled planner boundary with and without growth feedback.
    const growthEnvelope = await compileTaskEnvelope({
      request: "Plan growth and use the evidence to define a product feature.",
      task_id: "lean-runtime-growth-product",
      produced_at: "2026-09-08T00:00:00+00:00",
    });
    for (const variant of ["growth", "product", "prompt-evals"]) {
      const includeGrowth = variant === "growth";
      const promptPair = variant === "prompt-evals";
      const featureEnvelope = promptPair ? await compileTaskEnvelope({
        request: "Create and independently evaluate a reusable prompt.",
        task_id: "lean-runtime-prompt-models", produced_at: "2026-09-10T00:00:00+00:00",
      }) : growthEnvelope;
      await writeFile(resolve(artifacts, "envelope.json"), JSON.stringify(featureEnvelope));
      const routes = promptPair ? ["cascade-prompt:prompt", "cascade-evals:prompt-evaluation"] : [
        ...(includeGrowth ? ["cascade-market:plan-growth"] : []),
        "cascade-product:define-product",
      ];
      const descriptors = routes.map((route) => {
        const owner = catalog.plugins.find((item) =>
          item.skills.some((entry: Record<string, any>) => entry.route === route),
        )!;
        return { ...owner.skills.find((entry: Record<string, any>) => entry.route === route), plugin_version: owner.version, model_policy: owner.model_policy };
      });
      const featureSelection = {
        ...selection,
        task_envelope_id: featureEnvelope.envelope_id,
        request_digest: featureEnvelope.request_digest,
        input_artifacts: [...new Set(["task-envelope", "plugin-capability-catalog", ...descriptors.flatMap((item) => item.consumes)])].filter((item) => !promptPair || item !== "prompt-candidate"),
        selected_candidates: descriptors.map((item) => ({
          ...selection.selected_candidates[0],
          route: item.route,
          plugin_version: item.plugin_version,
          claim_ids: [featureEnvelope.claims[0]!.claim_id],
          trigger_evidence: [promptPair ? "The request requires a prompt and its independent evaluation." : "The requested growth evidence informs a product feature."],
          required_dependencies: item.required_dependencies,
          effect: item.effect,
          authority: item.authority,
        })),
      } as CapabilitySelection;
      featureSelection.selection_digest = capabilitySelectionDigest(featureSelection);
      const nodes = descriptors.map((item) => ({
        node_id: promptPair ? (item.route === "cascade-prompt:prompt" ? "prompt" : "eval") : (item.route === "cascade-market:plan-growth" ? "growth" : "product"),
        route: item.route,
        plugin_version: item.plugin_version,
        claim_ids: [featureEnvelope.claims[0]!.claim_id],
        policy_tags: item.policy_tags,
        consumes: item.consumes,
        produces: item.produces,
        ...(includeGrowth && item.route === "cascade-product:define-product" ? { optional_consumes: ["growth-strategy"] } : {}),
        effect: item.effect,
        authority: item.authority,
        model: { id: item.model_policy.model, reasoning_effort: item.route.startsWith("cascade-evals:") ? item.model_policy.evaluation_reasoning_effort : item.model_policy.planning_reasoning_effort },
        reason: "Use available evidence to form an accountable feature proposal.",
      }));
      const plan = {
        schema_version: 1,
        artifact_type: "cascade-plugin-plan",
        status: "CANDIDATE",
        task_envelope_id: featureEnvelope.envelope_id,
        request_digest: featureEnvelope.request_digest,
        capability_catalog_digest: catalog.catalog_digest,
        capability_selection_digest: featureSelection.selection_digest,
        planner: { route: "cascade-coordinator:plan-workflow", model: "gpt-6-astra", reasoning_effort: "high", prompt_sha256: "b".repeat(64) },
        input_artifacts: featureSelection.input_artifacts,
        selected_nodes: nodes,
        edges: promptPair ? [{ from: "prompt", to: "eval", artifact: "prompt-candidate" }] : includeGrowth ? [{ from: "growth", to: "product", artifact: "growth-strategy" }] : [],
        parallel_groups: [],
        rejected_candidates: [],
        validation_gates: ["Validate source identities and artifact handoffs."],
        stop_conditions: ["Stop before dispatch or target mutation."],
        blockers: [],
        dispatch_authorized: false,
      };
      await writeFile(resolve(artifacts, "selection.json"), JSON.stringify(featureSelection));
      async function checkPlan(candidate: unknown) {
        await writeFile(resolve(artifacts, "plan.json"), JSON.stringify(candidate));
        return runBundle(output, ["workflow", "validate-plan", "--plan", ".artifacts/runtime-bundle-test/plan.json", "--selection", ".artifacts/runtime-bundle-test/selection.json", "--envelope", ".artifacts/runtime-bundle-test/envelope.json"]);
      }
      const accepted = await checkPlan(plan);
      expect(accepted.exitCode).toBe(0);
      expect(accepted.stdout.toString()).toContain("plugin_plan_status=PASS");
      if (promptPair) {
        expect((await checkPlan({ ...plan, edges: [] })).stderr.toString()).toContain("required artifact edge is missing");
        expect((await checkPlan({ ...plan, selected_nodes: [...nodes].reverse() })).stderr.toString()).toContain("required dependency must appear earlier");
        expect((await checkPlan({ ...plan, dispatch_authorized: true })).exitCode).not.toBe(0);
        expect(nodes.map((node) => node.model)).toEqual([
          { id: "gpt-6-astra", reasoning_effort: "high" },
          { id: "gpt-6-astra", reasoning_effort: "high" },
        ]);
        const wrongAuthor = structuredClone(plan);
        wrongAuthor.selected_nodes[0]!.model.id = "gpt-5.6-sol";
        expect((await checkPlan(wrongAuthor)).stderr.toString()).toContain("model differs from its capability policy");
        const wrongJudge = structuredClone(plan);
        wrongJudge.selected_nodes[1]!.model.id = "gpt-5.6-sol";
        expect((await checkPlan(wrongJudge)).stderr.toString()).toContain("model differs from its capability policy");
        const wrongEffortJudge = structuredClone(plan);
        wrongEffortJudge.selected_nodes[1]!.model.reasoning_effort = "max";
        expect((await checkPlan(wrongEffortJudge)).stderr.toString()).toContain("evaluation reasoning effort differs from its capability policy");
        const wrongEffortAuthor = structuredClone(plan);
        wrongEffortAuthor.selected_nodes[0]!.model.reasoning_effort = "max";
        expect((await checkPlan(wrongEffortAuthor)).stderr.toString()).toContain("planning reasoning effort differs from its capability policy");
        const wrongPlanner = structuredClone(plan);
        wrongPlanner.planner.reasoning_effort = "max";
        expect((await checkPlan(wrongPlanner)).stderr.toString()).toContain("planner reasoning effort differs from its capability policy");
        const missingInputs = structuredClone(featureSelection);
        missingInputs.input_artifacts = ["task-envelope", "plugin-capability-catalog"];
        missingInputs.selection_digest = capabilitySelectionDigest(missingInputs);
        await writeFile(resolve(artifacts, "selection.json"), JSON.stringify(missingInputs));
        expect(runBundle(output, ["workflow", "validate-selection", "--selection", ".artifacts/runtime-bundle-test/selection.json", "--envelope", ".artifacts/runtime-bundle-test/envelope.json"]).stderr.toString()).toContain("consumes unavailable artifact");
        const wrongSelector = structuredClone(featureSelection);
        wrongSelector.selector.reasoning_effort = "max";
        wrongSelector.selection_digest = capabilitySelectionDigest(wrongSelector);
        await writeFile(resolve(artifacts, "selection.json"), JSON.stringify(wrongSelector));
        expect(runBundle(output, ["workflow", "validate-selection", "--selection", ".artifacts/runtime-bundle-test/selection.json", "--envelope", ".artifacts/runtime-bundle-test/envelope.json"]).stderr.toString()).toContain("selector reasoning effort differs from its capability policy");
        await writeFile(resolve(artifacts, "selection.json"), JSON.stringify(featureSelection));
      } else if (includeGrowth) {
        expect((await checkPlan({ ...plan, edges: [] })).stderr.toString()).toContain("required artifact edge is missing");
        expect((await checkPlan({ ...plan, selected_nodes: [...nodes].reverse() })).stderr.toString()).toContain("consumes unavailable artifact");
      } else {
        expect((await checkPlan({ ...plan, selected_nodes: [{ ...nodes[0], optional_consumes: ["growth-strategy"] }] })).stderr.toString()).toContain("consumes unavailable artifact");
        expect((await checkPlan({ ...plan, selected_nodes: [{ ...nodes[0], optional_consumes: ["undeclared-input"] }] })).stderr.toString()).toContain("undeclared optional input");
      }
    }

    const hooks = JSON.parse(
      await readFile(resolve(output, ".codex/hooks.json"), "utf8"),
    );
    expect(hooks.hooks.PostToolUse).toBeUndefined();
    expect(hooks.hooks.Stop[0].hooks[0].command).toContain(".codex/runtime/closeout-hook.js");
    expect(hooks.hooks.UserPromptSubmit[0].hooks[1].command).toContain(".codex/runtime/closeout-hook.js");
    const closeoutHelp = runBundle(output, ["closeout", "--help"]);
    expect(closeoutHelp.exitCode).toBe(0);
    expect(closeoutHelp.stdout.toString()).toContain("closeout check --file");
    const closeoutBinding = Bun.spawnSync({
      cmd: [process.execPath, resolve(output, ".codex/runtime/closeout-hook.js")],
      cwd: output,
      stdin: Buffer.from(JSON.stringify({ hook_event_name: "UserPromptSubmit", session_id: "bundle-fixture", turn_id: "turn", cwd: output })),
      stdout: "pipe", stderr: "pipe",
    });
    expect(closeoutBinding.exitCode).toBe(0);
    expect(JSON.parse(closeoutBinding.stdout.toString()).hookSpecificOutput).toMatchObject({ hookEventName: "UserPromptSubmit" });
    expect(JSON.stringify(hooks)).toContain(
      ".codex/runtime/task-admission-hook.js",
    );
    const config = await readFile(resolve(output, ".codex/config.toml"), "utf8");
    expect(config).not.toContain("[harness_evals]");
    expect(config).not.toContain("[campaigns]");
    expect(config).not.toContain("[mcp_servers.context7]");
    expect(config).toContain(".codex/runtime/workspace-mcp.js");
    expect(config).toContain('frontend_implementation = "frontend-engineer"');
    const frontendManifest = await readFile(resolve(output, ".codex/agents/frontend-engineer.toml"), "utf8");
    expect(frontendManifest).toContain(".codex/agents/frontend-engineer/AGENT.md");
    const frontendContract = await readFile(resolve(output, ".codex/agents/frontend-engineer/AGENT.md"), "utf8");
    expect(frontendContract).toContain("approved-mockup fidelity contract");
    const frontendSkills = await readFile(resolve(output, ".codex/agents/frontend-engineer/skills.yaml"), "utf8");
    expect(frontendSkills).toContain("cascade-design:visual-qa");
    for (const [key, role, route] of [
      ["design_creation", "product-designer", "cascade-design:create-design"],
      ["software_implementation", "software-engineer", "implement-change"],
      ["code_review", "code-reviewer", "cascade-software-architect:review-change"],
    ]) {
      expect(config).toContain(`${key} = "${role}"`);
      const manifest = Bun.TOML.parse(await readFile(resolve(output, `.codex/agents/${role}.toml`), "utf8"));
      expect(manifest.name).toBe(role);
      expect(manifest.developer_instructions).toContain(`.codex/agents/${role}/AGENT.md`);
      expect((await readFile(resolve(output, `.codex/agents/${role}/AGENT.md`), "utf8")).length).toBeGreaterThan(0);
      expect(await readFile(resolve(output, `.codex/agents/${role}/skills.yaml`), "utf8")).toContain(route!);
      if (role === "code-reviewer") expect(manifest.sandbox_mode).toBe("read-only");
    }
    const designerMap = parseStrictYaml(await readFile(resolve(output, ".codex/agents/product-designer/skills.yaml"), "utf8")) as Record<string, any>;
    for (const route of ["cascade-product:define-product", "cascade-market:brand-positioning", "cascade-personas:compile-persona", "cascade-project-management:plan-project", "cascade-prompt:prompt", "cascade-simulations:simulation-brief"]) {
      expect(designerMap.plugin_skills).toContain(route);
    }
    for (const route of ["cascade-product:manage-product-lifecycle", "cascade-market:plan-growth", "cascade-simulations:execute-simulation-campaign", "cascade-evals:simulation-evaluation"]) {
      expect(designerMap.plugin_skills).not.toContain(route);
    }
    const design = catalog.plugins.find((item) => item.name === "cascade-design")!;
    expect(design.skills.some((item: Record<string, any>) => item.route === "cascade-design:create-design")).toBe(true);
    const bridge = await readFile(resolve(output, "CODEX.md"), "utf8");
    expect(bridge).not.toContain("scripts/cascade.ts");
    expect(bridge).not.toContain(".codex/agents/harness-evaluator/AGENT.md");
    expect(bridge).toContain("Optional Evaluation And Simulation Labs");

    // Exercise the shipped adapter against another project's identity and files.
    const target = await mkdtemp(resolve(tmpdir(), "cascade-runtime-target-"));
    outputs.push(target);
    await cp(output, target, { recursive: true });
    const boot = await readFile(resolve(target, "AGENTS.md"), "utf8");
    expect(boot).not.toContain("harness runtime and plugin source checkout");
    expect(boot).not.toContain("- Project name: `Cascade`");
    const ownBoot = "# Orchard Service\n\nKeep customer data private.\n\n" + boot;
    const product = "# Orchard Service\n\nThe product manages orchard inventory.\n";
    const app = 'export const product = "Orchard Service";\n';
    await writeFile(resolve(target, "AGENTS.md"), ownBoot);
    await writeFile(resolve(target, "docs/product/_index.md"), product);
    await mkdir(resolve(target, "src"));
    await mkdir(resolve(target, "tests"));
    await writeFile(resolve(target, "src/index.ts"), app);
    const template = await readFile(resolve(target, "harness.config.example.yaml"), "utf8");
    const adapted = parseStrictYaml<Record<string, any>>(
      template.replace(/<[^>]+>/g, "none"), "target fixture",
    );
    adapted.project.name = "Orchard Service";
    adapted.project.kind = "orchard inventory application";
    adapted.project.primary_users = ["Orchard operators"];
    adapted.project.stack.backend.language = "TypeScript";
    adapted.paths.source_roots = ["src"];
    adapted.paths.test_roots = ["tests"];
    adapted.paths.app_entrypoints = ["src/index.ts"];
    adapted.paths.public_contracts[0] = "src/index.ts";
    for (const key of Object.keys(adapted.validation_commands)) {
      adapted.validation_commands[key] = key === "targeted"
        ? ["bun .codex/runtime/cascade.js target validate --root ."] : [];
    }
    const adaptedPath = resolve(target, "harness.config.yaml");
    await writeFile(adaptedPath, stringifyYaml(adapted));
    const targetValidation = runBundle(target, ["target", "validate", "--root", "."]);
    expect(targetValidation.exitCode).toBe(0);
    expect(targetValidation.stdout.toString()).toContain("target_project_status=PASS");
    const inventory = runBundle(target, ["target", "inventory", "--config", "harness.config.yaml"]);
    expect(inventory.exitCode).toBe(0);
    expect(JSON.parse(inventory.stdout.toString()).roots.source).toEqual(["src"]);
    for (const [field, value, error] of [
      ["harness_profile", "cascade-source", "requires target-project identity"],
      ["harness_profile", "unknown-profile", "must be target-project or cascade-source"],
      ["name", "", "must describe the current target"],
    ]) {
      const invalid = structuredClone(adapted);
      invalid.project[field!] = value;
      await writeFile(adaptedPath, stringifyYaml(invalid));
      const rejected = runBundle(target, ["target", "validate"]);
      expect(rejected.exitCode).toBe(1);
      expect(rejected.stderr.toString()).toContain(error!);
    }
    await writeFile(adaptedPath, stringifyYaml(adapted));
    expect(await readFile(resolve(target, "AGENTS.md"), "utf8")).toBe(ownBoot);
    expect(await readFile(resolve(target, "docs/product/_index.md"), "utf8")).toBe(product);
    expect(await readFile(resolve(target, "src/index.ts"), "utf8")).toBe(app);
    const sourceValidation = await validateConfig(rootPath("."), "harness.config.yaml");
    expect(sourceValidation.config.project.harness_profile).toBe("cascade-source");
    expect(sourceValidation.errors).toEqual([]);

    const mcpInput = `${JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2025-11-25",
        capabilities: {},
        clientInfo: { name: "runtime-bundle-test", version: "1" },
      },
    })}\n${JSON.stringify({
      jsonrpc: "2.0", id: 2, method: "tools/call",
      params: { name: "get_workspace_context", arguments: { paths: ["harness.config.yaml", "docs/product/_index.md"] } },
    })}\n`;
    const mcp = Bun.spawnSync({
      cmd: [process.execPath, resolve(target, ".codex/runtime/workspace-mcp.js")],
      cwd: target,
      stdin: new Blob([mcpInput]),
      stdout: "pipe",
      stderr: "pipe",
    });
    expect(mcp.exitCode).toBe(0);
    const messages = mcp.stdout.toString().trim().split("\n").map((line) => JSON.parse(line));
    expect(messages.find((message) => message.id === 1).result.serverInfo.name).toBe(
      "Cascade Workspace",
    );
    const context = messages.find((message) => message.id === 2);
    expect(context.error).toBeUndefined();
    expect(context.result.isError).not.toBe(true);
    expect(JSON.stringify(context.result)).toContain("Orchard Service");
    expect(JSON.stringify(context.result)).toContain("orchard inventory");
    expect(JSON.stringify(context.result)).not.toContain("standalone coding-agent workflow harness");
  }, 30_000);
});
