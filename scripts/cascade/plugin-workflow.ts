import { basename, dirname, resolve } from "node:path";

import {
  CascadeError,
  assertJsonSchema,
  boolFlag,
  boundedPath,
  flag,
  parseArgs,
  readJson,
  readText,
  rel,
  rootPath,
  sha256File,
  sha256Text,
  stableJson,
  walkFiles,
  writeJsonAtomic,
} from "./common";
import { readStructured } from "./structured-data";
import {
  readBoundedTaskEnvelope,
  type TaskEnvelope,
  validateTaskEnvelope,
} from "./admission";

const MARKETPLACE_RELATIVE = ".agents/plugins/marketplace.json";
const PLAN_WORKFLOW_ROUTE = "cascade-software-architect:plan-workflow";
export const PLUGIN_CAPABILITY_CATALOG_RELATIVE =
  ".codex/plugin-capabilities.generated.json";
const PLAN_WORKFLOW_ROOT = rootPath(
  ".codex/plugins/cascade-software-architect/skills/plan-workflow",
);
const DESCRIPTOR_SCHEMA = await readJson<Record<string, unknown>>(
  resolve(PLAN_WORKFLOW_ROOT, "references/capability-descriptor.schema.json"),
);
const CATALOG_SCHEMA = await readJson<Record<string, unknown>>(
  resolve(PLAN_WORKFLOW_ROOT, "references/capability-catalog.schema.json"),
);
const PLAN_SCHEMA = await readJson<Record<string, unknown>>(
  resolve(PLAN_WORKFLOW_ROOT, "references/plugin-plan.schema.json"),
);

type JsonRecord = Record<string, any>;

export interface PluginCapabilityCatalog extends JsonRecord {
  schema_version: 1;
  artifact_type: "cascade-plugin-capability-catalog";
  marketplace: typeof MARKETPLACE_RELATIVE;
  plugins: JsonRecord[];
  catalog_digest: string;
}

function sortedStrings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string").sort()
    : [];
}

function exactStringSet(left: unknown, right: unknown): boolean {
  return stableJson(sortedStrings(left)) === stableJson(sortedStrings(right));
}

function catalogPayload(catalog: Omit<PluginCapabilityCatalog, "catalog_digest"> | PluginCapabilityCatalog): JsonRecord {
  const { catalog_digest: _digest, ...payload } = catalog as PluginCapabilityCatalog;
  return payload;
}

function validateCatalogDigest(catalog: PluginCapabilityCatalog): void {
  assertJsonSchema(catalog, CATALOG_SCHEMA, "plugin capability catalog");
  const expected = sha256Text(stableJson(catalogPayload(catalog)));
  if (catalog.catalog_digest !== expected) {
    throw new CascadeError("plugin capability catalog digest is invalid");
  }
}

function assertRequiredDependencyGraph(skills: Map<string, JsonRecord>): void {
  const visiting = new Set<string>();
  const visited = new Set<string>();

  function visit(route: string, stack: string[]): void {
    if (visiting.has(route)) {
      throw new CascadeError(
        `plugin required-dependency cycle: ${[...stack, route].join(" -> ")}`,
      );
    }
    if (visited.has(route)) return;
    visiting.add(route);
    const skill = skills.get(route)!;
    for (const dependency of sortedStrings(skill.required_dependencies)) {
      if (!skills.has(dependency)) {
        throw new CascadeError(
          `${route} required dependency is absent from the repository catalog: ${dependency}`,
        );
      }
      const consumed = new Set(sortedStrings(skill.consumes));
      const dependencyProduces = sortedStrings(skills.get(dependency)!.produces);
      if (!dependencyProduces.some((artifact) => consumed.has(artifact))) {
        throw new CascadeError(
          `${route} required dependency has no declared artifact handoff: ${dependency}`,
        );
      }
      visit(dependency, [...stack, route]);
    }
    for (const dependency of sortedStrings(skill.optional_dependencies)) {
      if (!skills.has(dependency)) {
        throw new CascadeError(
          `${route} optional dependency is absent from the repository catalog: ${dependency}`,
        );
      }
    }
    visiting.delete(route);
    visited.add(route);
  }

  for (const route of [...skills.keys()].sort()) visit(route, []);
}

function assertUniqueArtifactOwnership(skills: Map<string, JsonRecord>): void {
  const ownerByArtifact = new Map<string, string>();
  for (const [route, skill] of [...skills.entries()].sort(([left], [right]) => left.localeCompare(right))) {
    for (const artifact of sortedStrings(skill.produces)) {
      const prior = ownerByArtifact.get(artifact);
      if (prior) {
        throw new CascadeError(
          `duplicate plugin artifact producer for ${artifact}: ${prior}, ${route}`,
        );
      }
      ownerByArtifact.set(artifact, route);
    }
  }
}

export async function buildPluginCapabilityCatalog(): Promise<PluginCapabilityCatalog> {
  const marketplace = await readJson<JsonRecord>(rootPath(MARKETPLACE_RELATIVE));
  if (!Array.isArray(marketplace.plugins) || marketplace.plugins.length === 0) {
    throw new CascadeError("repository plugin marketplace contains no plugins");
  }

  const plugins: JsonRecord[] = [];
  const allSkills = new Map<string, JsonRecord>();
  const seenPlugins = new Set<string>();

  for (const entry of marketplace.plugins) {
    const name = entry?.name;
    const source = entry?.source?.path;
    if (typeof name !== "string" || !/^cascade-[a-z0-9-]+$/.test(name)) {
      throw new CascadeError(`invalid Cascade marketplace plugin name: ${String(name)}`);
    }
    if (seenPlugins.has(name)) {
      throw new CascadeError(`duplicate Cascade marketplace plugin: ${name}`);
    }
    seenPlugins.add(name);
    const expectedSource = `./.codex/plugins/${name}`;
    if (entry?.source?.source !== "local" || source !== expectedSource) {
      throw new CascadeError(`${name} marketplace source must be ${expectedSource}`);
    }

    const pluginRoot = boundedPath(source.slice(2));
    const manifestPath = resolve(pluginRoot, ".codex-plugin/plugin.json");
    const descriptorPath = resolve(pluginRoot, "capabilities.yaml");
    const manifest = await readJson<JsonRecord>(manifestPath);
    const descriptor = await readStructured<JsonRecord>(
      descriptorPath,
      rel(descriptorPath),
    );
    assertJsonSchema(descriptor, DESCRIPTOR_SCHEMA, rel(descriptorPath));
    if (manifest.name !== name || descriptor.plugin?.name !== name) {
      throw new CascadeError(`${name} manifest and capability descriptor names disagree`);
    }
    if (manifest.version !== descriptor.plugin?.version) {
      throw new CascadeError(`${name} manifest and capability descriptor versions disagree`);
    }

    const declared = new Map<string, JsonRecord>();
    for (const skill of descriptor.skills as JsonRecord[]) {
      const route = skill.route;
      if (declared.has(route) || allSkills.has(route)) {
        throw new CascadeError(`duplicate plugin capability route: ${route}`);
      }
      if (!route.startsWith(`${name}:`)) {
        throw new CascadeError(`${name} descriptor contains foreign route: ${route}`);
      }
      declared.set(route, skill);
      allSkills.set(route, skill);
    }

    const sourceRoutes = new Set<string>();
    const sourceBodies = new Map<string, string>();
    for (const path of await walkFiles(resolve(pluginRoot, "skills"), {
      include: (candidate) => candidate.endsWith("/SKILL.md"),
    })) {
      const body = await readText(path);
      const frontmatterName = /^name:\s*([^\n]+)$/m.exec(body)?.[1]?.trim();
      const folderName = basename(dirname(path));
      if (!frontmatterName || frontmatterName !== folderName) {
        throw new CascadeError(`${rel(path)} skill name does not match its folder`);
      }
      const route = `${name}:${frontmatterName}`;
      sourceRoutes.add(route);
      sourceBodies.set(route, body);
    }
    if (!exactStringSet([...sourceRoutes], [...declared.keys()])) {
      throw new CascadeError(`${name} capability routes do not exactly match source skills`);
    }
    for (const [route, skill] of declared) {
      const body = sourceBodies.get(route)!;
      for (const dependency of [
        ...sortedStrings(skill.required_dependencies),
        ...sortedStrings(skill.optional_dependencies),
      ]) {
        const dependencySkill = dependency.split(":", 2)[1]!;
        if (
          !body.includes(dependency) &&
          !body.includes(`$${dependencySkill}`) &&
          !body.includes(`\`${dependencySkill}\``)
        ) {
          throw new CascadeError(
            `${route} capability dependency is not named by its skill contract: ${dependency}`,
          );
        }
      }
    }

    plugins.push({
      name,
      version: manifest.version,
      manifest_path: rel(manifestPath),
      descriptor_path: rel(descriptorPath),
      manifest_sha256: await sha256File(manifestPath),
      descriptor_sha256: await sha256File(descriptorPath),
      model_policy: descriptor.model_policy,
      skills: descriptor.skills,
    });
  }

  assertRequiredDependencyGraph(allSkills);
  assertUniqueArtifactOwnership(allSkills);
  const payload = {
    schema_version: 1 as const,
    artifact_type: "cascade-plugin-capability-catalog" as const,
    marketplace: MARKETPLACE_RELATIVE,
    plugins,
  };
  const catalog: PluginCapabilityCatalog = {
    ...payload,
    catalog_digest: sha256Text(stableJson(payload)),
  };
  validateCatalogDigest(catalog);
  return catalog;
}

function catalogSkillMap(catalog: PluginCapabilityCatalog): Map<string, JsonRecord> {
  const result = new Map<string, JsonRecord>();
  for (const plugin of catalog.plugins) {
    for (const skill of plugin.skills as JsonRecord[]) {
      result.set(skill.route, { ...skill, plugin_version: plugin.version });
    }
  }
  return result;
}

const AUTHORITY_RANK: Record<string, number> = {
  READ_ONLY: 0,
  LOCAL_WRITE: 1,
  EXTERNAL_WRITE: 2,
  PRIVILEGED: 3,
  DESTRUCTIVE: 4,
};

export function validatePluginPlan(
  plan: JsonRecord,
  envelope: TaskEnvelope,
  catalog: PluginCapabilityCatalog,
): void {
  validateTaskEnvelope(envelope);
  validateCatalogDigest(catalog);
  assertJsonSchema(plan, PLAN_SCHEMA, "plugin plan");
  if (plan.task_envelope_id !== envelope.envelope_id || plan.request_digest !== envelope.request_digest) {
    throw new CascadeError("plugin plan is not bound to the supplied Task Envelope");
  }
  if (plan.capability_catalog_digest !== catalog.catalog_digest) {
    throw new CascadeError("plugin plan is not bound to the current capability catalog");
  }
  if ((plan.status === "BLOCKED") !== (plan.blockers.length > 0)) {
    throw new CascadeError("plugin plan status and blockers disagree");
  }
  if (plan.status === "CANDIDATE" && plan.selected_nodes.length === 0) {
    throw new CascadeError("candidate plugin plan contains no selected nodes");
  }

  const skills = catalogSkillMap(catalog);
  const claims = new Set(envelope.claims.map((claim) => claim.claim_id));
  const nodeById = new Map<string, JsonRecord>();
  const routeIndex = new Map<string, number>();
  const availableArtifacts = new Set<string>(plan.input_artifacts);

  for (const [index, node] of (plan.selected_nodes as JsonRecord[]).entries()) {
    if (nodeById.has(node.node_id)) {
      throw new CascadeError(`duplicate plugin plan node: ${node.node_id}`);
    }
    if (routeIndex.has(node.route)) {
      throw new CascadeError(`duplicate plugin plan route: ${node.route}`);
    }
    const descriptor = skills.get(node.route);
    if (!descriptor) throw new CascadeError(`plugin plan route is absent from catalog: ${node.route}`);
    if (node.route === PLAN_WORKFLOW_ROUTE) {
      throw new CascadeError("Plan Workflow is the planning controller and cannot be a selected work node");
    }
    if (node.plugin_version !== descriptor.plugin_version) {
      throw new CascadeError(`${node.route} plugin version is stale`);
    }
    for (const field of ["policy_tags", "consumes", "produces"] as const) {
      if (!exactStringSet(node[field], descriptor[field])) {
        throw new CascadeError(`${node.route} ${field} differs from its capability descriptor`);
      }
    }
    if (node.effect !== descriptor.effect || node.authority !== descriptor.authority) {
      throw new CascadeError(`${node.route} effect or authority differs from its capability descriptor`);
    }
    if ((AUTHORITY_RANK[node.authority] ?? 99) > (AUTHORITY_RANK[envelope.workload.authority] ?? -1)) {
      throw new CascadeError(`${node.route} exceeds Task Envelope authority`);
    }
    for (const claimId of node.claim_ids as string[]) {
      if (!claims.has(claimId)) throw new CascadeError(`${node.route} references unknown claim ${claimId}`);
    }
    for (const dependency of descriptor.required_dependencies as string[]) {
      const dependencyIndex = routeIndex.get(dependency);
      if (dependencyIndex === undefined || dependencyIndex >= index) {
        throw new CascadeError(`${node.route} required dependency must appear earlier: ${dependency}`);
      }
    }
    for (const artifact of node.consumes as string[]) {
      if (!availableArtifacts.has(artifact)) {
        throw new CascadeError(`${node.route} consumes unavailable artifact: ${artifact}`);
      }
    }
    for (const artifact of node.produces as string[]) availableArtifacts.add(artifact);
    nodeById.set(node.node_id, node);
    routeIndex.set(node.route, index);
  }

  const edgePairs = new Set<string>();
  for (const edge of plan.edges as JsonRecord[]) {
    const from = nodeById.get(edge.from);
    const to = nodeById.get(edge.to);
    if (!from || !to) throw new CascadeError("plugin plan edge references an unknown node");
    if ((routeIndex.get(from.route) ?? -1) >= (routeIndex.get(to.route) ?? -1)) {
      throw new CascadeError(`plugin plan edge is cyclic or out of order: ${edge.from} -> ${edge.to}`);
    }
    if (!from.produces.includes(edge.artifact) || !to.consumes.includes(edge.artifact)) {
      throw new CascadeError(`plugin plan edge artifact contract is invalid: ${edge.artifact}`);
    }
    const key = `${edge.from}\0${edge.to}`;
    if (edgePairs.has(key)) throw new CascadeError(`duplicate plugin plan edge: ${edge.from} -> ${edge.to}`);
    edgePairs.add(key);
  }

  const grouped = new Set<string>();
  for (const group of plan.parallel_groups as string[][]) {
    for (const nodeId of group) {
      if (!nodeById.has(nodeId)) throw new CascadeError(`parallel group references unknown node: ${nodeId}`);
      if (grouped.has(nodeId)) throw new CascadeError(`plugin plan node appears in multiple parallel groups: ${nodeId}`);
      grouped.add(nodeId);
    }
    for (const left of group) {
      for (const right of group) {
        if (left !== right && (edgePairs.has(`${left}\0${right}`) || edgePairs.has(`${right}\0${left}`))) {
          throw new CascadeError(`dependent plugin plan nodes cannot run in parallel: ${left}, ${right}`);
        }
      }
    }
  }
}

async function checkOrWriteCatalog(args: ReturnType<typeof parseArgs>): Promise<number> {
  const catalog = await buildPluginCapabilityCatalog();
  const output = boundedPath(flag(args, "output", PLUGIN_CAPABILITY_CATALOG_RELATIVE)!);
  if (boolFlag(args, "write")) {
    await writeJsonAtomic(output, catalog);
    console.log(`plugin_capability_catalog_status=WRITTEN plugins=${catalog.plugins.length} digest=${catalog.catalog_digest} path=${rel(output)}`);
    return 0;
  }
  if (boolFlag(args, "check")) {
    const existing = await readJson<PluginCapabilityCatalog>(output);
    validateCatalogDigest(existing);
    if (stableJson(existing) !== stableJson(catalog)) {
      throw new CascadeError(`plugin capability catalog is stale: ${rel(output)}`);
    }
    console.log(`plugin_capability_catalog_status=PASS plugins=${catalog.plugins.length} digest=${catalog.catalog_digest}`);
    return 0;
  }
  console.log(stableJson(catalog, true));
  return 0;
}

async function validatePlanCommand(args: ReturnType<typeof parseArgs>): Promise<number> {
  const planPath = flag(args, "plan") ?? args.positionals[0];
  const envelopePath = flag(args, "envelope");
  if (!planPath || !envelopePath) {
    throw new CascadeError("workflow validate requires --plan PATH and --envelope PATH");
  }
  const plan = await readJson<JsonRecord>(boundedPath(planPath));
  const envelope = await readBoundedTaskEnvelope(envelopePath);
  const catalog = await buildPluginCapabilityCatalog();
  validatePluginPlan(plan, envelope, catalog);
  console.log(`plugin_plan_status=PASS envelope=${envelope.envelope_id} nodes=${plan.selected_nodes.length} catalog=${catalog.catalog_digest}`);
  return 0;
}

export async function main(argv: string[]): Promise<number> {
  const [command, ...rest] = argv;
  const args = parseArgs(rest);
  if (command === "catalog") return checkOrWriteCatalog(args);
  if (command === "validate") return validatePlanCommand(args);
  throw new CascadeError("workflow command must be catalog or validate");
}
