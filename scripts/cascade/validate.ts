import { readdir } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";

import {
  ROOT,
  boolFlag,
  exists,
  flag,
  isDirectory,
  isFile,
  parseArgs,
  parseFrontmatter,
  readJson,
  readText,
  rel,
  rootPath,
  stableJson,
  walkFiles,
} from "./common";
import { generateCatalog } from "./evals";
import { resolveCampaign } from "./simulation-definitions";
import { validateConfig } from "./target";

const REQUIRED_FILES = [
  "README.md",
  "AGENTS.md",
  "CODEX.md",
  "harness.config.example.yaml",
  "harness.config.yaml",
  ".codex/config.toml",
  ".codex/harness-tooling/package.json",
  ".codex/harness-tooling/bun.lock",
  ".codex/harness-tooling/playwright.config.ts",
  ".codex/harness-tooling/browser-task.spec.ts",
  ".codex/README.md",
  "docs/_index.md",
  "docs/structure.md",
  "docs/glossary.md",
  "docs/backlog/_index.md",
  "docs/product/_index.md",
  "docs/product/scenarios.md",
  "docs/product/journeys.md",
  "docs/product/requirements.md",
  "docs/product/personas/_index.md",
  "docs/design/_index.md",
  "docs/design/interaction-model.md",
  "docs/design/tokens.md",
  "docs/brand/_index.md",
  "docs/specs/_index.md",
  "docs/work/_index.md",
  "docs/work/active.md",
  "docs/work/lane-template.md",
  "docs/work/graph-template.md",
  "docs/work/examples/_index.md",
  "docs/work/graphs/_index.md",
  "docs/work/reports/_index.md",
  "docs/archive/work-reports/_index.md",
  "docs/patterns/_index.md",
  "docs/patterns/context-pack-schema.yaml",
  "docs/patterns/workflow/index.md",
  "docs/patterns/workflow/workflow.pack.yaml",
  "docs/patterns/workflow/fragments/_index.md",
  "docs/patterns/workflow/fragments/graph-fragment.schema.json",
  "docs/patterns/boundaries/index.md",
  "docs/patterns/boundaries/boundaries.pack.yaml",
  "docs/patterns/testing/index.md",
  "docs/patterns/testing/testing.pack.yaml",
  "docs/patterns/context-memory/index.md",
  "docs/patterns/context-memory/context-memory.pack.yaml",
  "scripts/cascade.ts",
  "scripts/cascade/common.ts",
  "scripts/cascade/validate.ts",
  "scripts/cascade/evals.ts",
  "scripts/cascade/patterns.ts",
  "scripts/cascade/target.ts",
  "scripts/cascade/campaigns.ts",
  "evals/harness/README.md",
  "evals/harness/skill-cases.json",
  "evals/harness/interactions.json",
  "evals/harness/scenarios.generated.json",
  "evals/harness/response.schema.json",
  "evals/harness/judge-response.schema.json",
  "evals/harness/judge-profiles.json",
  "evals/harness/rubrics/outcome-v1.json",
  "evals/harness/rubrics/trajectory-v1.json",
  "evals/campaigns/schema.json",
  "evals/campaigns/README.md",
  "evals/campaigns/catalog.generated.json",
  "evals/campaigns/simulation-contract-smoke.json",
  "evals/tasks/schema.json",
  "evals/tasks/SIMULATION-STATE-SMOKE.json",
  "evals/simulations/schema.json",
  "evals/simulations/population.schema.json",
  "evals/simulations/scenario.schema.json",
  "evals/simulations/world.schema.json",
  "evals/simulations/dataset.schema.json",
  "evals/metrics/schema.json",
  "evals/calibrations/schema.json",
  "evals/claims/schema.json",
  "evals/policies/schema.json",
  "evals/oracles/schema.json",
  "evals/treatments/schema.json",
  "evals/rubrics/evaluation-profile.schema.json",
  "evals/rubrics/evaluation-receipt.schema.json",
  "evals/simulations/browser-fixture.html",
  ".codex/agents/security/scripts/security_stack_scan.ts",
  ".codex/skills/adapt-harness/schemas/harness-config.schema.json",
  ".codex/skills/adapt-harness/schemas/onboarding-manifest.schema.json",
  ".codex/skills/adapt-harness/schemas/project-inventory.schema.json",
];

const REQUIRED_FOLDERS = [
  ".codex/skills",
  ".codex/agents",
  ".codex/harness-tooling",
  "docs",
  "docs/product",
  "docs/design",
  "docs/brand",
  "docs/specs",
  "docs/work",
  "docs/patterns",
  "evals/harness",
  "evals/campaigns",
  "evals/tasks",
  "evals/simulations",
  "evals/metrics",
  "evals/calibrations",
  "evals/claims",
  "evals/policies",
  "evals/oracles",
  "evals/treatments",
  "evals/rubrics",
  "scripts/cascade",
];

const ARCHIVE_CHAIN_SURFACES: Record<string, string[]> = {
  "CODEX.md": [
    "automatically invokes",
    "archive-work",
    "ARCHIVED",
    "ARCHIVE_DEFERRED",
    "NOT_APPLICABLE",
    "not a background scheduler",
  ],
  ".codex/agents/orchestrator/AGENT.md": [
    "automatically use `archive-work`",
    "ARCHIVED",
    "ARCHIVE_DEFERRED",
    "NOT_APPLICABLE",
    "completion authority",
  ],
  "docs/patterns/workflow/index.md": [
    "automatically invokes",
    "archive-work",
    "ARCHIVE_DEFERRED",
    "NOT_APPLICABLE",
  ],
};

const FORBIDDEN = [
  new RegExp(["Lee", "ra"].join(""), "i"),
  /\bportable-codex-harness\b/i,
  /\bstandalone[- ]qa\b/i,
  /\bgpt-5\.(?:1|2|3|4|5)(?:-[a-z0-9-]+)?\b/i,
];

const ALLOWED_DOC_ROOTS = new Set([
  "_index.md",
  "structure.md",
  "glossary.md",
  "archive",
  "backlog",
  "brand",
  "design",
  "patterns",
  "product",
  "specs",
  "work",
]);

async function discoverSkills(): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  for (const path of await walkFiles(rootPath(".codex/skills"), {
    include: (item) => item.endsWith("/SKILL.md"),
  })) {
    result.set(basename(dirname(path)), path);
  }
  return result;
}

async function discoverAgents(): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  const directory = rootPath(".codex/agents");
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith(".toml")) {
      result.set(entry.name.slice(0, -5), resolve(directory, entry.name));
    }
  }
  return result;
}

function collectSources(value: unknown): string[] {
  const result: string[] = [];
  function visit(item: unknown): void {
    if (Array.isArray(item)) item.forEach(visit);
    else if (item && typeof item === "object") {
      for (const [key, nested] of Object.entries(item as Record<string, unknown>)) {
        if (key === "source" && typeof nested === "string") result.push(nested);
        visit(nested);
      }
    }
  }
  visit(value);
  return result;
}

async function validateRuntimePackage(errors: string[]): Promise<void> {
  const packageJson = await readJson<Record<string, any>>(
    rootPath(".codex/harness-tooling/package.json"),
  );
  if (packageJson.packageManager !== "bun@1.3.3") {
    errors.push("isolated harness tooling must pin packageManager to bun@1.3.3");
  }
  if (!packageJson.engines?.bun) {
    errors.push("isolated harness tooling package missing engines.bun");
  }
  if (packageJson.devDependencies?.["@playwright/test"] !== "1.58.2") {
    errors.push("isolated harness tooling must pin @playwright/test to 1.58.2");
  }
}

async function validateConfigToml(
  agents: Map<string, string>,
  errors: string[],
): Promise<void> {
  const config = Bun.TOML.parse(await readText(rootPath(".codex/config.toml"))) as Record<
    string,
    any
  >;
  if (config.model !== "gpt-5.6-sol") errors.push("default model must be gpt-5.6-sol");
  const evals = config.harness_evals ?? {};
  if (evals.planning_model !== "gpt-5.6-sol") errors.push("planning model mismatch");
  if (evals.execution_model !== "gpt-5.6-terra") errors.push("execution model mismatch");
  if (evals.judge_model !== "gpt-5.6-sol") errors.push("judge model mismatch");
  if (evals.runner !== "scripts/cascade/evals.ts") {
    errors.push("harness eval runner must point to scripts/cascade/evals.ts");
  }
  if (config.campaigns?.runner !== "scripts/cascade/campaigns.ts") {
    errors.push("campaign runner must point to scripts/cascade/campaigns.ts");
  }
  const registry = config.harness_agents ?? {};
  const registered = new Set(Object.values(registry));
  for (const agent of agents.keys()) {
    if (!registered.has(agent)) errors.push(`agent missing from harness registry: ${agent}`);
  }
}

async function validateSkills(
  skills: Map<string, string>,
  agents: Map<string, string>,
  errors: string[],
): Promise<void> {
  const wired = new Set<string>();
  for (const [agent, manifestPath] of agents) {
    let manifest: Record<string, any>;
    try {
      manifest = Bun.TOML.parse(await readText(manifestPath)) as Record<string, any>;
    } catch (error) {
      errors.push(`invalid agent TOML: ${rel(manifestPath)}: ${error}`);
      continue;
    }
    for (const key of ["name", "description", "developer_instructions", "model"]) {
      if (!manifest[key]) errors.push(`${rel(manifestPath)} missing ${key}`);
    }
    if (manifest.name !== agent) errors.push(`${rel(manifestPath)} name mismatch`);
    const contract = rootPath(".codex/agents", agent, "AGENT.md");
    const mapPath = rootPath(".codex/agents", agent, "skills.yaml");
    if (!(await isFile(contract))) errors.push(`agent contract missing: ${rel(contract)}`);
    if (!(await isFile(mapPath))) {
      errors.push(`agent skill map missing: ${rel(mapPath)}`);
      continue;
    }
    const skillMap = Bun.YAML.parse(await readText(mapPath));
    for (const source of collectSources(skillMap)) {
      const match = /^\.codex\/skills\/([a-z0-9-]+)\/SKILL\.md$/.exec(source);
      if (!match) {
        errors.push(`${rel(mapPath)} invalid skill source: ${source}`);
        continue;
      }
      wired.add(match[1]!);
      if (!(await isFile(rootPath(source)))) errors.push(`${rel(mapPath)} missing source: ${source}`);
    }
  }
  for (const [skill, path] of skills) {
    const frontmatter = parseFrontmatter(await readText(path));
    if (frontmatter.name !== skill) errors.push(`skill name mismatch: ${rel(path)}`);
    if (!frontmatter.description || frontmatter.description.length < 20) {
      errors.push(`skill description is not trigger-focused: ${rel(path)}`);
    }
    if (!wired.has(skill)) errors.push(`skill is not wired to an agent: ${skill}`);
  }
  for (const skill of wired) if (!skills.has(skill)) errors.push(`wired skill missing: ${skill}`);
}

async function validateReferences(errors: string[]): Promise<void> {
  const roots = [
    rootPath(".codex/skills"),
    rootPath(".codex/agents"),
    rootPath("docs/patterns"),
  ];
  const expression =
    /(?<![A-Za-z0-9_.-])((?:\.codex|docs|evals|scripts)\/[A-Za-z0-9_./{}*<>-]+\.(?:md|yaml|yml|toml|ts|json|html))/g;
  for (const root of roots) {
    for (const path of await walkFiles(root, {
      include: (item) => /\.(md|yaml|yml|toml)$/.test(item),
    })) {
      const text = await readText(path);
      for (const match of text.matchAll(expression)) {
        const reference = match[1]!;
        if (/[{}*<>]/.test(reference)) continue;
        if (reference.startsWith("docs/work/")) continue;
        if (!(await isFile(rootPath(reference)))) {
          errors.push(`missing referenced resource: ${rel(path)} -> ${reference}`);
        }
      }
    }
  }
}

async function validatePatterns(errors: string[]): Promise<void> {
  const ids = new Set<string>();
  for (const path of await walkFiles(rootPath("docs/patterns"), {
    include: (item) => item.endsWith(".pack.yaml"),
  })) {
    try {
      const pack = Bun.YAML.parse(await readText(path)) as Record<string, any>;
      if (!pack.pack_id) errors.push(`pattern pack missing id: ${rel(path)}`);
      else if (ids.has(pack.pack_id)) errors.push(`duplicate pattern pack id: ${pack.pack_id}`);
      else ids.add(pack.pack_id);
      for (const document of pack.documents ?? []) {
        if (!(await isFile(rootPath(document.path)))) {
          errors.push(`pattern document missing: ${document.path}`);
        }
      }
    } catch (error) {
      errors.push(`invalid pattern pack ${rel(path)}: ${error}`);
    }
  }
  const fragmentIds = new Set<string>();
  for (const path of await walkFiles(rootPath("docs/patterns/workflow/fragments"), {
    include: (item) => /GF-[^/]+\.fragment\.json$/.test(item),
  })) {
    try {
      const fragment = await readJson<Record<string, any>>(path);
      if (!fragment.fragment_id) errors.push(`graph fragment missing id: ${rel(path)}`);
      else if (fragmentIds.has(fragment.fragment_id)) errors.push(`duplicate graph fragment id: ${fragment.fragment_id}`);
      else fragmentIds.add(fragment.fragment_id);
      for (const key of ["activation", "requires", "provides", "nodes", "tests"]) {
        if (!(key in fragment)) errors.push(`${rel(path)} missing ${key}`);
      }
    } catch (error) {
      errors.push(`invalid graph fragment ${rel(path)}: ${error}`);
    }
  }
}

async function validateCampaigns(errors: string[]): Promise<void> {
  const ids = new Set<string>();
  for (const path of await walkFiles(rootPath("evals/campaigns"), {
    include: (item) =>
      item.endsWith(".json") &&
      !item.endsWith("schema.json") &&
      !item.endsWith("catalog.generated.json"),
  })) {
    try {
      const resolved = await resolveCampaign(path);
      if (ids.has(resolved.campaign.id)) {
        errors.push(`duplicate campaign id: ${resolved.campaign.id}`);
      } else {
        ids.add(resolved.campaign.id);
      }
    } catch (error) {
      errors.push(
        `invalid simulation campaign ${rel(path)}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}

async function validateBunCutover(errors: string[]): Promise<void> {
  const retiredAuthorities = [
    "scripts/validate_cascade_codex.py",
    "scripts/run_harness_evals.py",
    "scripts/build_pattern_context_pack.py",
    ".codex/agents/security/scripts/security_stack_scan.py",
  ];
  for (const path of retiredAuthorities) {
    if (await exists(rootPath(path))) {
      errors.push(`retired Python harness authority remains after Bun cutover: ${path}`);
    }
  }
}

async function validateLeakage(errors: string[]): Promise<number> {
  let count = 0;
  const roots = [
    rootPath("AGENTS.md"),
    rootPath("CODEX.md"),
    rootPath("README.md"),
    rootPath(".codex"),
    rootPath("docs/patterns"),
  ];
  const files: string[] = [];
  for (const root of roots) {
    if (await isFile(root)) files.push(root);
    else files.push(...(await walkFiles(root)));
  }
  for (const path of files) {
    if (!/\.(md|yaml|yml|toml|ts|json)$/.test(path)) continue;
    const text = await readText(path);
    for (const pattern of FORBIDDEN) {
      if (pattern.test(text)) {
        errors.push(`project-specific or retired token in ${rel(path)}: ${pattern}`);
        count += 1;
      }
    }
  }
  return count;
}

async function validateHarness(errors: string[]): Promise<{
  agents: number;
  skills: number;
  leakage: number;
}> {
  for (const path of REQUIRED_FILES) {
    if (!(await isFile(rootPath(path)))) errors.push(`missing required file: ${path}`);
  }
  for (const path of REQUIRED_FOLDERS) {
    if (!(await isDirectory(rootPath(path)))) errors.push(`missing required folder: ${path}`);
  }
  const docsEntries = await readdir(rootPath("docs"));
  for (const entry of docsEntries) {
    if (!ALLOWED_DOC_ROOTS.has(entry)) errors.push(`unexpected docs root: docs/${entry}`);
  }
  await validateRuntimePackage(errors);
  const skills = await discoverSkills();
  const agents = await discoverAgents();
  await validateConfigToml(agents, errors);
  await validateSkills(skills, agents, errors);
  await validateReferences(errors);
  await validatePatterns(errors);
  await validateCampaigns(errors);
  await validateBunCutover(errors);
  for (const [path, tokens] of Object.entries(ARCHIVE_CHAIN_SURFACES)) {
    const text = await readText(rootPath(path));
    for (const token of tokens) {
      if (!text.includes(token)) errors.push(`${path} missing archive contract: ${token}`);
    }
  }
  const configResult = await validateConfig(ROOT, "harness.config.yaml");
  errors.push(...configResult.errors.map((item) => `harness config: ${item}`));
  const generated = await generateCatalog();
  const current = await readJson(rootPath("evals/harness/scenarios.generated.json"));
  if (stableJson(generated) !== stableJson(current)) {
    errors.push("generated harness scenario catalog is stale");
  }
  const leakage = await validateLeakage(errors);
  return { agents: agents.size, skills: skills.size, leakage };
}

export async function main(argv: string[]): Promise<number> {
  const args = parseArgs(argv);
  if (boolFlag(args, "target")) {
    const targetRoot = resolve(flag(args, "root", ".")!);
    const configPath = flag(args, "config", "harness.config.yaml")!;
    const result = await validateConfig(targetRoot, configPath);
    for (const error of result.errors) console.error(`ERROR: ${error}`);
    console.log(`cascade_target_status=${result.errors.length ? "FAIL" : "PASS"}`);
    return result.errors.length ? 1 : 0;
  }
  const errors: string[] = [];
  const counts = await validateHarness(errors);
  for (const error of errors) console.error(`ERROR: ${error}`);
  console.log(`cascade_status=${errors.length ? "FAIL" : "PASS"}`);
  console.log(`agents=${counts.agents}`);
  console.log(`skills=${counts.skills}`);
  console.log(`project_specific_leakage=${counts.leakage}`);
  return errors.length ? 1 : 0;
}
