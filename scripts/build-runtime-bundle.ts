#!/usr/bin/env bun

import { createHash } from "node:crypto";
import {
  cp,
  mkdir,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { dirname, relative, resolve, sep } from "node:path";

const SOURCE_ROOT = resolve(import.meta.dir, "..");
const DIST_ROOT = resolve(SOURCE_ROOT, "dist");
const DEFAULT_OUTPUT = resolve(DIST_ROOT, "cascade-runtime");

const COPY_FILES = [
  "CODEX.md",
  "harness.config.example.yaml",
  ".github/copilot-instructions.md",
  ".github/pull_request_template.md",
  ".codex/config.toml",
  ".codex/hooks.json",
  ".codex/artifact-destinations.json",
  ".codex/plugin-capabilities.generated.json",
  ".codex/agents/agent-engineer.toml",
  ".codex/agents/frontend-engineer.toml",
  ".codex/agents/product-designer.toml",
  ".codex/agents/software-engineer.toml",
  ".codex/agents/code-reviewer.toml",
  ".codex/agents/orchestrator.toml",
  ".codex/agents/security.toml",
  "docs/product/catalog.schema.json",
  "docs/specs/brief-manifest.schema.json",
  "docs/patterns/context-pack-schema.yaml",
] as const;

const COPY_TREES = [
  ".codex/agents/agent-engineer",
  ".codex/agents/frontend-engineer",
  ".codex/agents/product-designer",
  ".codex/agents/software-engineer",
  ".codex/agents/code-reviewer",
  ".codex/agents/orchestrator",
  ".codex/agents/security",
  ".codex/skills",
  ".codex/schemas",
  ".codex/task-admission",
] as const;

const COORDINATOR_CONTRACTS = [
  [
    ".codex/plugins/cascade-coordinator/skills/plan-workflow/references/capability-descriptor.schema.json",
    ".codex/runtime/contracts/coordinator/plan-workflow/references/capability-descriptor.schema.json",
  ],
  [
    ".codex/plugins/cascade-coordinator/skills/plan-workflow/references/capability-catalog.schema.json",
    ".codex/runtime/contracts/coordinator/plan-workflow/references/capability-catalog.schema.json",
  ],
  [
    ".codex/plugins/cascade-coordinator/skills/plan-workflow/references/plugin-plan.schema.json",
    ".codex/runtime/contracts/coordinator/plan-workflow/references/plugin-plan.schema.json",
  ],
  [
    ".codex/plugins/cascade-coordinator/skills/select-capabilities/references/capability-selection.schema.json",
    ".codex/runtime/contracts/coordinator/select-capabilities/references/capability-selection.schema.json",
  ],
] as const;

const GENERATED_TEXT_FILES: Record<string, string> = {
  ".codex/README.md": `# Cascade core runtime\n\nThis target profile contains Orchestrator, Agent Engineer, Security, Product Designer,\nSoftware Engineer, Frontend Engineer, Code Reviewer, the nine\nrepository-bound effect skills, admission, Coordinator validation, and\nWorkspace MCP. Portable methods resolve from the enabled installed Cascade\nplugins. Plugin source, evaluator/operator lab roles, harness-eval corpora,\nsimulation campaigns, browser tooling, and historical work reports remain in\nthe Cascade source checkout and are not target-runtime dependencies.\n`,
  "CASCADE_RUNTIME.md": `# Cascade core target runtime\n\nThis is a generated target bundle, not the Cascade plugin-development tree.\nIt intentionally excludes \`.codex/plugins/\`, \`harness-evals/\`,\n\`product-evals/\`, source tests, browser tooling, and historical reports.\nInstall the exact plugin versions recorded in \`.codex/plugins.lock.json\` from\nthe Cascade marketplace, merge this bundle into the target repository with\ncollision review; preserve existing instructions, configuration and documents.\nAdapt \`AGENTS.md\`, \`CODEX.md\`, and\n\`harness.config.example.yaml\`, create \`harness.config.yaml\` from the template only when absent,\nfill it from the real target source, set \`project.harness_profile: target-project\`,\nand then run:\n\n\`\`\`bash\nnpx --offline --yes bun@1.3.3 .codex/runtime/cascade.js target validate --root .\n\`\`\`\n\nHarness evals and simulation campaigns are opt-in development or lab packs;\nthey are not required for normal planning, implementation, target validation,\nor plugin routing.\n`,
  "docs/_index.md": `# Project context\n\nKeep only current product, design, specification, pattern, and work context\nneeded by this target repository. Portable methods belong to installed Cascade\nplugins.\n`,
  "docs/structure.md": `# Repository structure\n\nAdapt this file to the target repository. Record current source roots, public\ncontracts, test roots, generated artifacts, and narrow documentation owners.\nDo not copy Cascade source-checkout eval labs or historical work reports here.\n`,
  "docs/glossary.md": `# Glossary\n\nAdd only target-repository terms whose meaning affects implementation, routing,\nor validation.\n`,
  "docs/backlog/_index.md": `# Backlog\n\nStore only accepted follow-up candidates with an owner and acceptance boundary.\n`,
  "docs/product/_index.md": `# Product\n\nStore accepted target-product facts and links to their evidence. Use installed\nCascade Product, Market, and Personas skills for portable methods.\n`,
  "docs/product/personas/_index.md": `# Personas\n\nStore approved target-product persona artifacts or projections here. Canonical\npersona construction and evaluation belong to Cascade Personas.\n`,
  "docs/design/_index.md": `# Design\n\nStore target-specific design decisions. Reusable review methods belong to\nCascade Design.\n`,
  "docs/brand/_index.md": `# Brand\n\nStore approved target-specific positioning and brand decisions.\n`,
  "docs/specs/_index.md": `# Specifications\n\nStore only durable, accepted target behavior or source-preservation packets.\nOrdinary bounded changes do not require a new specification.\n`,
  "docs/work/_index.md": `# Work\n\nUse this area only for genuinely durable, resumable coordination state. Keep\nordinary bounded plans inline.\n`,
  "docs/work/active.md": `# Active work\n\nNo durable work records are active.\n`,
  "docs/patterns/_index.md": `# Patterns\n\nStore target-owned reusable rules and context packs only when repeated evidence\njustifies them. Architecture catalogs and portable methods stay in plugins or\noptional packs.\n`,
  "docs/patterns/boundaries/index.md": `# Boundaries\n\nRecord only current target trust, ownership, data, process, and public-contract\nboundaries. Portable architecture and security review methods stay in plugins.\n`,
  "docs/patterns/testing/index.md": `# Testing\n\nRecord stable target-specific test commands, public oracles, fixtures, and\nenvironment limits. Generic QA methods stay in Cascade QA.\n`,
  "docs/patterns/context-memory/index.md": `# Context memory\n\nKeep only small reusable target lessons backed by current source. Do not retain\ndisposable eval traces or broad work-history dumps.\n`,
};

export interface RuntimeBundleReport {
  output: string;
  file_count: number;
  total_bytes: number;
  plugin_count: number;
  plugin_catalog_digest: string;
}

function inside(parent: string, candidate: string): boolean {
  const value = relative(parent, candidate);
  return value === "" || (!value.startsWith("..") && !value.startsWith(sep));
}

function sha256(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

async function copyPath(sourceRelative: string, outputRelative = sourceRelative): Promise<void> {
  const source = resolve(SOURCE_ROOT, sourceRelative);
  const target = resolve(activeOutput, outputRelative);
  await mkdir(dirname(target), { recursive: true });
  await cp(source, target, { recursive: true });
}

async function run(argv: string[]): Promise<void> {
  const child = Bun.spawn(argv, {
    cwd: SOURCE_ROOT,
    stdin: "ignore",
    stdout: "inherit",
    stderr: "inherit",
  });
  const exitCode = await child.exited;
  if (exitCode !== 0) throw new Error(`${argv.join(" ")} exited with ${exitCode}`);
}

function omitTomlSections(text: string, names: Set<string>): string {
  const result: string[] = [];
  let omitted = false;
  for (const line of text.split("\n")) {
    const header = /^\[([^\]]+)\]\s*$/.exec(line)?.[1];
    if (header !== undefined) omitted = names.has(header);
    if (!omitted) result.push(line);
  }
  return `${result.join("\n").trimEnd()}\n`;
}

function runtimeConfigToml(source: string): string {
  let value = omitTomlSections(
    source,
    new Set([
      "harness_evals",
      "campaigns",
      "product_briefs",
      "mcp_servers.context7",
    ]),
  );
  const replacements: Array<[string, string]> = [
    ["scripts/cascade.ts admission assess", ".codex/runtime/cascade.js admission assess"],
    ["scripts/cascade/plugin-workflow.ts", ".codex/runtime/cascade.js workflow"],
    ["scripts/cascade/patterns.ts", ".codex/runtime/cascade.js patterns"],
    ["scripts/cascade/workspace-mcp.ts", ".codex/runtime/workspace-mcp.js"],
  ];
  for (const [from, to] of replacements) value = value.replaceAll(from, to);
  value = value
    .split("\n")
    .filter(
      (line) =>
        !/^judged_evaluation\s*=/.test(line) &&
        !/^simulation_execution\s*=/.test(line) &&
        !/^simulation_evaluation\s*=/.test(line),
    )
    .join("\n");
  return value;
}

function runtimeCodex(source: string): string {
  return source
    .replace(
      /For this repository-owned marketplace,[\s\S]*?after the primary route and owner are already supported\.\n/,
      `The core target runtime contains a digest-bound capability catalog, not\nplugin source. Resolve every selected namespaced skill from the enabled\ninstalled inventory and require its version to match\n\`.codex/plugins.lock.json\`. Plugin source remains in the Cascade source\ncheckout; do not search caches or copy a hidden fallback into the target.\n`,
    )
    .replace(
      /- `simulation-operator`:[\s\S]*?(?=Use role contracts locally\.)/,
      `Simulation Operator and Simulation Evaluator are lab\nroles and are not installed by the core target profile. Add them only with the\nmatching explicit eval or campaign pack.\n\n`,
    )
    .replace(
      /Useful deterministic checks:\n\n```bash[\s\S]*?```\n/,
      `Campaign catalog and self-test commands belong to the optional source\nor simulation-lab profile; they are not core target checks.\n`,
    )
    .replace(
      /Core repository checks:\n\n```bash[\s\S]*?```\n/,
      `Core target checks:\n\n\`\`\`bash\nnpx --offline --yes bun@1.3.3 .codex/runtime/cascade.js target validate --root .\n\`\`\`\n\nRun the target repository's configured focused checks separately.\n`,
    )
    .replace(
      /## Harness Evaluation[\s\S]*?(?=## Write Rules)/,
      `## Optional Evaluation And Simulation Labs\n\nHarness evaluation corpora, live trace runners, campaign registries, browser\ntooling, and their specialist roles are opt-in lab assets in the Cascade source\ncheckout. They are not loaded during normal target routing or validation. Add\none only for an explicit evaluation or campaign contract, and keep its evidence\nclaims narrower than target, provider, deployment, or release proof.\n\n`,
    )
    .replaceAll("scripts/cascade.ts", ".codex/runtime/cascade.js");
}

async function transformCopiedConfiguration(): Promise<void> {
  const configPath = resolve(activeOutput, ".codex/config.toml");
  await writeFile(
    configPath,
    runtimeConfigToml(await readFile(configPath, "utf8")),
    "utf8",
  );

  const hooksPath = resolve(activeOutput, ".codex/hooks.json");
  const hooks = JSON.parse(await readFile(hooksPath, "utf8"));
  delete hooks.hooks?.PostToolUse;
  for (const groups of Object.values(hooks.hooks ?? {}) as any[]) {
    for (const group of groups) {
      for (const hook of group.hooks ?? []) {
        if (typeof hook.command === "string") {
          hook.command = hook.command.replaceAll("scripts/cascade/closeout-hook.ts", ".codex/runtime/closeout-hook.js");
          hook.command = hook.command.replaceAll(
            "scripts/cascade/task-admission-hook.ts",
            ".codex/runtime/task-admission-hook.js",
          );
        }
      }
    }
  }
  await writeFile(hooksPath, `${JSON.stringify(hooks, null, 2)}\n`, "utf8");

  const agentsPath = resolve(activeOutput, "AGENTS.md");
  await writeFile(
    agentsPath,
    await readFile(resolve(SOURCE_ROOT, "scripts/runtime-templates/AGENTS.md"), "utf8"),
    "utf8",
  );
  const codexPath = resolve(activeOutput, "CODEX.md");
  await writeFile(
    codexPath,
    runtimeCodex(await readFile(codexPath, "utf8")),
    "utf8",
  );
}

async function walkFiles(root: string): Promise<string[]> {
  const result: string[] = [];
  async function visit(current: string): Promise<void> {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const path = resolve(current, entry.name);
      if (entry.isDirectory()) await visit(path);
      else if (entry.isFile()) result.push(path);
    }
  }
  await visit(root);
  return result.sort();
}

let activeOutput = DEFAULT_OUTPUT;

export async function buildRuntimeBundle(
  output = DEFAULT_OUTPUT,
): Promise<RuntimeBundleReport> {
  activeOutput = resolve(output);
  if (!inside(DIST_ROOT, activeOutput) || activeOutput === DIST_ROOT) {
    throw new Error("runtime bundle output must be a named directory inside dist/");
  }
  await rm(activeOutput, { recursive: true, force: true });
  await mkdir(activeOutput, { recursive: true });

  for (const path of COPY_FILES) await copyPath(path);
  for (const path of COPY_TREES) await copyPath(path);
  for (const [source, target] of COORDINATOR_CONTRACTS) {
    await copyPath(source, target);
  }
  for (const [path, content] of Object.entries(GENERATED_TEXT_FILES)) {
    const target = resolve(activeOutput, path);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, content, "utf8");
  }
  await transformCopiedConfiguration();

  const runtimeRoot = resolve(activeOutput, ".codex/runtime");
  await mkdir(runtimeRoot, { recursive: true });
  for (const [entrypoint, outfile] of [
    ["scripts/cascade-runtime.ts", "cascade.js"],
    ["scripts/cascade/task-admission-hook.ts", "task-admission-hook.js"],
    ["scripts/cascade/closeout-hook.ts", "closeout-hook.js"],
    ["scripts/cascade/workspace-mcp.ts", "workspace-mcp.js"],
  ] as const) {
    await run([
      process.execPath,
      "build",
      entrypoint,
      "--target=bun",
      "--outfile",
      resolve(runtimeRoot, outfile),
    ]);
  }

  const catalog = JSON.parse(
    await readFile(resolve(activeOutput, ".codex/plugin-capabilities.generated.json"), "utf8"),
  );
  const pluginLock = {
    schema_version: 1,
    artifact_type: "cascade-installed-plugin-lock",
    capability_catalog_digest: catalog.catalog_digest,
    plugins: catalog.plugins.map((plugin: Record<string, unknown>) => ({
      name: plugin.name,
      version: plugin.version,
    })),
  };
  await writeFile(
    resolve(activeOutput, ".codex/plugins.lock.json"),
    `${JSON.stringify(pluginLock, null, 2)}\n`,
    "utf8",
  );

  for (const forbidden of [
    ".codex/plugins",
    "harness-evals",
    "product-evals",
    "docs/archive",
    "scripts",
  ]) {
    try {
      await stat(resolve(activeOutput, forbidden));
      throw new Error(`core target runtime unexpectedly contains ${forbidden}`);
    } catch (error: any) {
      if (error?.code !== "ENOENT") throw error;
    }
  }

  const files = await walkFiles(activeOutput);
  if (files.length > 120) {
    throw new Error(`core target runtime file budget exceeded: ${files.length} > 120`);
  }
  const records = await Promise.all(
    files.map(async (path) => {
      const bytes = await readFile(path);
      return {
        path: relative(activeOutput, path).split(sep).join("/"),
        bytes: bytes.byteLength,
        sha256: sha256(bytes),
      };
    }),
  );
  const manifest = {
    schema_version: 1,
    artifact_type: "cascade-runtime-bundle-manifest",
    profile: "core",
    harness_profile: "target-project",
    source_checkout_layers_excluded: [
      "plugin-source",
      "harness-eval-lab",
      "simulation-campaign-lab",
      "evaluation-and-simulation-lab-roles",
      "source-tests",
      "historical-work-records",
      "browser-tooling",
    ],
    plugin_catalog_digest: catalog.catalog_digest,
    file_count_excluding_manifest: records.length,
    total_bytes_excluding_manifest: records.reduce(
      (sum, record) => sum + record.bytes,
      0,
    ),
    files_digest: sha256(JSON.stringify(records)),
  };
  await writeFile(
    resolve(runtimeRoot, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );
  const manifestBytes = (await stat(resolve(runtimeRoot, "manifest.json"))).size;
  const report = {
    output: activeOutput,
    file_count: records.length + 1,
    total_bytes: manifest.total_bytes_excluding_manifest + manifestBytes,
    plugin_count: pluginLock.plugins.length,
    plugin_catalog_digest: catalog.catalog_digest,
  };
  console.log(
    `cascade_runtime_bundle=PASS profile=core files=${report.file_count} bytes=${report.total_bytes} plugins=${report.plugin_count} output=${relative(SOURCE_ROOT, activeOutput)}`,
  );
  return report;
}

if (import.meta.main) {
  await buildRuntimeBundle(Bun.argv[2] ? resolve(SOURCE_ROOT, Bun.argv[2]) : DEFAULT_OUTPUT);
}
