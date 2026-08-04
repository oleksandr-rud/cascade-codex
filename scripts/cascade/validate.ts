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
import { resolveCampaign, validateSimulation } from "./simulation-definitions";
import { validateConfig } from "./target";
import { validateBriefRepository } from "./briefs";
import { validateAdmissionRepository } from "./admission";

const REQUIRED_FILES = [
  "README.md",
  "AGENTS.md",
  "CODEX.md",
  "harness.config.example.yaml",
  "harness.config.yaml",
  ".codex/config.toml",
  ".codex/hooks.json",
  ".codex/task-admission/task-envelope.schema.json",
  ".codex/task-admission/policy.schema.json",
  ".codex/task-admission/control-catalog.json",
  ".codex/task-admission/policies/core.json",
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
  "docs/product/catalog.yaml",
  "docs/product/catalog.schema.json",
  "docs/product/scenarios.md",
  "docs/product/journeys.md",
  "docs/product/requirements.md",
  "docs/product/personas/_index.md",
  "docs/design/_index.md",
  "docs/design/interaction-model.md",
  "docs/design/tokens.md",
  "docs/brand/_index.md",
  "docs/specs/_index.md",
  "docs/specs/brief-manifest.schema.json",
  "docs/work/_index.md",
  "docs/work/active.md",
  "docs/work/lane-template.md",
  "docs/work/graph-template.md",
  "docs/work/work-graph-template.md",
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
  "docs/patterns/product-context/index.md",
  "docs/patterns/product-context/product-context.pack.yaml",
  "scripts/cascade.ts",
  "scripts/cascade/admission.ts",
  "scripts/cascade/admission.test.ts",
  "scripts/cascade/task-admission-hook.ts",
  "scripts/cascade/briefs.ts",
  "scripts/cascade/persona-simulations.ts",
  "scripts/cascade/simulation-intake.ts",
  "scripts/cascade/simulation-intake.test.ts",
  "scripts/cascade/common.ts",
  "scripts/cascade/validate.ts",
  "scripts/cascade/evals.ts",
  "scripts/cascade/patterns.ts",
  "scripts/cascade/target.ts",
  "scripts/cascade/campaigns.ts",
  "harness-evals/README.md",
  "harness-evals/skill-cases.json",
  "harness-evals/interactions.json",
  "harness-evals/scenarios.generated.json",
  "harness-evals/response.schema.json",
  "harness-evals/judge-response.schema.json",
  "harness-evals/judge-profiles.json",
  "harness-evals/rubrics/outcome-v1.json",
  "harness-evals/rubrics/trajectory-v1.json",
  "harness-evals/task-admission/case.schema.json",
  "harness-evals/task-admission/assessment.schema.json",
  "harness-evals/task-admission/cases.json",
  "product-evals/campaigns/schema.json",
  "product-evals/campaigns/README.md",
  "product-evals/campaigns/catalog.generated.json",
  "product-evals/campaigns/simulation-contract-smoke.json",
  "product-evals/intakes/schema.json",
  "product-evals/tasks/schema.json",
  "product-evals/tasks/SIMULATION-STATE-SMOKE.json",
  "product-evals/simulations/schema.json",
  "product-evals/simulations/population.schema.json",
  "product-evals/simulations/persona-derivation.schema.json",
  "product-evals/simulations/refinement-proposal.schema.json",
  "product-evals/simulations/refinement-disposition.schema.json",
  "product-evals/simulations/external-persona-evidence.schema.json",
  "product-evals/simulations/scenario.schema.json",
  "product-evals/simulations/world.schema.json",
  "product-evals/simulations/dataset.schema.json",
  "product-evals/metrics/schema.json",
  "product-evals/calibrations/schema.json",
  "product-evals/claims/schema.json",
  "product-evals/policies/schema.json",
  "product-evals/oracles/schema.json",
  "product-evals/treatments/schema.json",
  "product-evals/rubrics/evaluation-profile.schema.json",
  "product-evals/rubrics/evaluation-receipt.schema.json",
  "product-evals/artifact-policy.schema.json",
  "product-evals/artifact-policy.json",
  "product-evals/simulations/harness/browser-fixture.html",
  "product-evals/simulations/README.md",
  "product-evals/simulations/harness/README.md",
  "product-evals/simulations/product/README.md",
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
  ".codex/task-admission",
  ".codex/task-admission/policies",
  "docs/patterns/product-context",
  "harness-evals",
  "harness-evals/task-admission",
  "product-evals/campaigns",
  "product-evals/tasks",
  "product-evals/simulations",
  "product-evals/simulations/harness",
  "product-evals/simulations/product",
  "product-evals/intakes",
  "product-evals/intakes/harness",
  "product-evals/intakes/product",
  "product-evals/metrics",
  "product-evals/calibrations",
  "product-evals/claims",
  "product-evals/policies",
  "product-evals/oracles",
  "product-evals/treatments",
  "product-evals/rubrics",
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

export interface WorkGraphDocument {
  path: string;
  text: string;
}

const WORK_GRAPH_ID = /^WG-\d{3}$/;
const WORK_GRAPH_NODE_ID = /^WG-\d{3}-N\d{2}$/;
const WORK_GRAPH_GATE_ID = /^WG-\d{3}-G[A-Z0-9]+$/;
const WORK_GRAPH_REFERENCE = /\bWG-[A-Z0-9-]+\b/g;
const LEGACY_WORK_GRAPH_REFERENCE = /\bIG-[A-Z0-9-]+\b/g;
const IMPLEMENTATION_GRAPH_TERM = /\bimplementation[- ]graph\b/i;

function markdownSection(text: string, heading: string): string | undefined {
  const marker = `## ${heading}`;
  const start = text.indexOf(marker);
  if (start === -1) return undefined;
  const bodyStart = start + marker.length;
  const next = text.slice(bodyStart).search(/\n## /);
  return next === -1
    ? text.slice(bodyStart)
    : text.slice(bodyStart, bodyStart + next);
}

function workGraphReferences(text: string): string[] {
  return [...text.matchAll(WORK_GRAPH_REFERENCE)].map((match) => match[0]);
}

export function validateWorkGraphDocuments(
  graphDocuments: WorkGraphDocument[],
  workDocuments: WorkGraphDocument[],
): string[] {
  const errors: string[] = [];
  const graphIds = new Map<string, string>();
  const scopedIds = new Map<string, string>();

  for (const document of workDocuments) {
    if (document.path === "docs/work/work-graph-template.md") continue;
    if (document.path.includes("implementation-graph")) {
      errors.push(`legacy implementation-graph filename: ${document.path}`);
    }
    if (IMPLEMENTATION_GRAPH_TERM.test(document.text)) {
      errors.push(`legacy implementation-graph terminology in ${document.path}`);
    }
    for (const legacy of document.text.matchAll(LEGACY_WORK_GRAPH_REFERENCE)) {
      errors.push(`legacy work-graph id in ${document.path}: ${legacy[0]}`);
    }
    for (const reference of workGraphReferences(document.text)) {
      if (
        !WORK_GRAPH_ID.test(reference) &&
        !WORK_GRAPH_NODE_ID.test(reference) &&
        !WORK_GRAPH_GATE_ID.test(reference)
      ) {
        errors.push(`invalid work-graph id shape in ${document.path}: ${reference}`);
      }
    }
  }

  for (const document of graphDocuments) {
    if (
      !/^docs\/work\/reports\/\d{4}-\d{2}-\d{2}-[a-z0-9-]+-work-graph\.md$/.test(
        document.path,
      )
    ) {
      errors.push(`invalid work-graph report path: ${document.path}`);
    }

    const header = /^Work Graph ID:\s*`([^`]+)`\s*$/m.exec(document.text);
    if (!header) {
      errors.push(`work graph missing Work Graph ID header: ${document.path}`);
      continue;
    }
    const graphId = header[1]!;
    if (!WORK_GRAPH_ID.test(graphId)) {
      errors.push(`invalid Work Graph ID in ${document.path}: ${graphId}`);
      continue;
    }
    const duplicateGraph = graphIds.get(graphId);
    if (duplicateGraph) {
      errors.push(`duplicate Work Graph ID ${graphId}: ${duplicateGraph}, ${document.path}`);
    } else {
      graphIds.set(graphId, document.path);
    }

    const nodeRegistry = markdownSection(document.text, "Node Registry");
    if (!nodeRegistry) {
      errors.push(`work graph missing Node Registry: ${document.path}`);
      continue;
    }
    const registryIds = [...nodeRegistry.matchAll(/^\|\s*`([^`]+)`\s*\|/gm)].map(
      (match) => match[1]!,
    );
    const nodeIds = registryIds.filter((id) => WORK_GRAPH_NODE_ID.test(id));
    if (nodeIds.length === 0) {
      errors.push(`work graph has no canonical node IDs: ${document.path}`);
    }
    const localIds = new Set<string>();
    for (const id of registryIds) {
      if (!WORK_GRAPH_NODE_ID.test(id) && !WORK_GRAPH_GATE_ID.test(id)) {
        errors.push(`invalid Node Registry ID in ${document.path}: ${id}`);
        continue;
      }
      if (!id.startsWith(`${graphId}-`)) {
        errors.push(`out-of-scope Node Registry ID in ${document.path}: ${id}`);
      }
      if (localIds.has(id)) {
        errors.push(`duplicate Node Registry ID in ${document.path}: ${id}`);
      } else {
        localIds.add(id);
      }
      const duplicateScoped = scopedIds.get(id);
      if (duplicateScoped && duplicateScoped !== document.path) {
        errors.push(`duplicate work-graph node/gate ID ${id}: ${duplicateScoped}, ${document.path}`);
      } else {
        scopedIds.set(id, document.path);
      }
    }

    const gateContracts = markdownSection(document.text, "Gate Contracts");
    if (!gateContracts) {
      errors.push(`work graph missing Gate Contracts: ${document.path}`);
      continue;
    }
    const headingGateIds = [
      ...gateContracts.matchAll(/^###\s+`?(WG-[A-Z0-9-]+)`?(?:\s|$)/gm),
    ].map((match) => match[1]!);
    const tableGateIds = [
      ...gateContracts.matchAll(/^\|\s*`(WG-[A-Z0-9-]+)`\s*\|/gm),
    ].map((match) => match[1]!);
    const gateDefinitionIds = [...headingGateIds, ...tableGateIds];
    if (gateDefinitionIds.length === 0) {
      errors.push(`work graph has no canonical gate IDs: ${document.path}`);
    }
    const localGateIds = new Set<string>();
    for (const id of gateDefinitionIds) {
      if (!WORK_GRAPH_GATE_ID.test(id)) {
        errors.push(`invalid Gate Contracts ID in ${document.path}: ${id}`);
        continue;
      }
      if (!id.startsWith(`${graphId}-`)) {
        errors.push(`out-of-scope Gate Contracts ID in ${document.path}: ${id}`);
      }
      if (localGateIds.has(id)) {
        errors.push(`duplicate Gate Contracts ID in ${document.path}: ${id}`);
      } else {
        localGateIds.add(id);
      }
      const duplicateScoped = scopedIds.get(id);
      if (duplicateScoped && duplicateScoped !== document.path) {
        errors.push(`duplicate work-graph node/gate ID ${id}: ${duplicateScoped}, ${document.path}`);
      } else {
        scopedIds.set(id, document.path);
      }
    }

    const terminal = /^Terminal Gate:\s*(.+)$/m.exec(document.text)?.[1] ?? "";
    const terminalGate = workGraphReferences(terminal).find(
      (id) => WORK_GRAPH_GATE_ID.test(id) && id.startsWith(`${graphId}-`),
    );
    if (!terminalGate) {
      errors.push(`work graph missing graph-scoped Terminal Gate: ${document.path}`);
    }
  }

  for (const document of workDocuments) {
    if (document.path === "docs/work/work-graph-template.md") continue;
    for (const reference of new Set(workGraphReferences(document.text))) {
      if (WORK_GRAPH_ID.test(reference) && !graphIds.has(reference)) {
        errors.push(`unknown work-graph reference in ${document.path}: ${reference}`);
      } else if (
        (WORK_GRAPH_NODE_ID.test(reference) || WORK_GRAPH_GATE_ID.test(reference)) &&
        !scopedIds.has(reference)
      ) {
        errors.push(`unknown work-graph node/gate reference in ${document.path}: ${reference}`);
      }
    }
  }

  return errors;
}

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
  if (config.cascade?.admission_command !== "scripts/cascade.ts admission assess") {
    errors.push("Cascade admission command must use the task admission compiler");
  }
  if (config.cascade?.admission_policy_bundle !== ".codex/task-admission/policies/core.json") {
    errors.push("Cascade admission policy bundle path is invalid");
  }
  if (config.cascade?.default !== undefined) {
    errors.push("blanket Cascade default route must be removed after task-admission cutover");
  }
  if (config.product_briefs?.catalog !== "docs/product/catalog.yaml") {
    errors.push("product brief catalog must point to docs/product/catalog.yaml");
  }
  if (config.product_briefs?.runner !== "scripts/cascade/briefs.ts") {
    errors.push("product brief runner must point to scripts/cascade/briefs.ts");
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

async function validateWorkGraphs(errors: string[]): Promise<void> {
  const paths = await walkFiles(rootPath("docs/work"), {
    include: (item) => item.endsWith(".md"),
  });
  const workDocuments = await Promise.all(
    paths.map(async (path) => ({
      path: rel(path),
      text: await readText(path),
    })),
  );
  const graphDocuments = workDocuments.filter(
    (document) =>
      document.path !== "docs/work/work-graph-template.md" &&
      (document.path.endsWith("-work-graph.md") ||
        /^Work Graph ID:\s*/m.test(document.text)),
  );
  errors.push(...validateWorkGraphDocuments(graphDocuments, workDocuments));
}

async function validateCampaigns(errors: string[]): Promise<void> {
  const ids = new Set<string>();
  for (const path of await walkFiles(rootPath("product-evals/campaigns"), {
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

async function validateSimulationLayout(errors: string[]): Promise<void> {
  const root = rootPath("product-evals/simulations");
  const allowedDirectories = new Set(["harness", "product"]);
  const simulationIds = new Map<string, string>();
  for (const entry of await readdir(root, { withFileTypes: true })) {
    if (entry.isDirectory() && !allowedDirectories.has(entry.name)) {
      errors.push(
        `unexpected simulation root: product-evals/simulations/${entry.name}; use harness/ or product/`,
      );
    }
  }
  for (const scope of [...allowedDirectories].sort()) {
    for (const path of await walkFiles(rootPath("product-evals/simulations", scope), {
      include: (item) => item.endsWith("/manifest.json"),
    })) {
      try {
        const manifestPath = rel(path);
        const manifest = await readJson<Record<string, unknown>>(path);
        validateSimulation(manifest, manifestPath);
        const id = String(manifest.id);
        const existing = simulationIds.get(id);
        if (existing) {
          errors.push(
            `duplicate scoped simulation id ${id}: ${existing}, ${manifestPath}`,
          );
        } else {
          simulationIds.set(id, manifestPath);
        }
      } catch (error) {
        errors.push(
          `invalid scoped simulation ${rel(path)}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
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
  if (await exists(rootPath("evals"))) {
    errors.push(
      "retired evaluation root remains: evals/; use harness-evals/ or product-evals/",
    );
  }
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
  try {
    await validateAdmissionRepository();
  } catch (error) {
    errors.push(`invalid task admission bundle: ${error instanceof Error ? error.message : String(error)}`);
  }
  await validateReferences(errors);
  await validatePatterns(errors);
  for (const error of await validateBriefRepository(true)) {
    errors.push(`invalid product brief context: ${error}`);
  }
  await validateWorkGraphs(errors);
  await validateSimulationLayout(errors);
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
  const current = await readJson(rootPath("harness-evals/scenarios.generated.json"));
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
