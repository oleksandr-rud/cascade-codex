import { basename, dirname, resolve } from "node:path";

import {
  CascadeError,
  assertJsonSchema,
  boolFlag,
  boundedPath,
  flag,
  isDirectory,
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
const SELECT_CAPABILITIES_ROUTE = "cascade-coordinator:select-capabilities";
const PLAN_WORKFLOW_ROUTE = "cascade-coordinator:plan-workflow";
const COORDINATOR_ROUTES = new Set([
  SELECT_CAPABILITIES_ROUTE,
  PLAN_WORKFLOW_ROUTE,
]);
export const PLUGIN_CAPABILITY_CATALOG_RELATIVE =
  ".codex/plugin-capabilities.generated.json";
const COORDINATOR_SOURCE_ROOT = rootPath(
  ".codex/plugins/cascade-coordinator/skills",
);
const COORDINATOR_RUNTIME_CONTRACT_ROOT = rootPath(
  ".codex/runtime/contracts/coordinator",
);
const COORDINATOR_CONTRACT_ROOT = await isDirectory(COORDINATOR_SOURCE_ROOT)
  ? COORDINATOR_SOURCE_ROOT
  : COORDINATOR_RUNTIME_CONTRACT_ROOT;
const PLAN_WORKFLOW_ROOT = resolve(COORDINATOR_CONTRACT_ROOT, "plan-workflow");
const SELECT_CAPABILITIES_ROOT = resolve(
  COORDINATOR_CONTRACT_ROOT,
  "select-capabilities",
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
const SELECTION_SCHEMA = await readJson<Record<string, unknown>>(
  resolve(SELECT_CAPABILITIES_ROOT, "references/capability-selection.schema.json"),
);

type JsonRecord = Record<string, any>;

export interface PluginCapabilityCatalog extends JsonRecord {
  schema_version: 1;
  artifact_type: "cascade-plugin-capability-catalog";
  marketplace: typeof MARKETPLACE_RELATIVE;
  plugins: JsonRecord[];
  catalog_digest: string;
}

export interface CapabilitySelection extends JsonRecord {
  schema_version: 1;
  artifact_type: "cascade-capability-selection";
  status: "CANDIDATE" | "BLOCKED";
  task_envelope_id: string;
  request_digest: string;
  capability_catalog_digest: string;
  selection_digest: string;
  selected_candidates: JsonRecord[];
  rejected_candidates: JsonRecord[];
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

function selectionPayload(selection: CapabilitySelection): JsonRecord {
  const { selection_digest: _digest, ...payload } = selection;
  return payload;
}

export function capabilitySelectionDigest(selection: CapabilitySelection): string {
  return sha256Text(stableJson(selectionPayload(selection)));
}

function validateSelectionDigest(selection: CapabilitySelection): void {
  const expected = capabilitySelectionDigest(selection);
  if (selection.selection_digest !== expected) {
    throw new CascadeError("capability selection digest is invalid");
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

export async function readPluginCapabilityCatalog(
  path = rootPath(PLUGIN_CAPABILITY_CATALOG_RELATIVE),
): Promise<PluginCapabilityCatalog> {
  const catalog = await readJson<PluginCapabilityCatalog>(path);
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

export function validateCapabilitySelection(
  selection: CapabilitySelection,
  envelope: TaskEnvelope,
  catalog: PluginCapabilityCatalog,
): void {
  validateTaskEnvelope(envelope);
  validateCatalogDigest(catalog);
  assertJsonSchema(selection, SELECTION_SCHEMA, "capability selection");
  validateSelectionDigest(selection);
  if (
    selection.task_envelope_id !== envelope.envelope_id
    || selection.request_digest !== envelope.request_digest
  ) {
    throw new CascadeError("capability selection is not bound to the supplied Task Envelope");
  }
  if (selection.capability_catalog_digest !== catalog.catalog_digest) {
    throw new CascadeError("capability selection is not bound to the current capability catalog");
  }
  if ((selection.status === "BLOCKED") !== (selection.blockers.length > 0)) {
    throw new CascadeError("capability selection status and blockers disagree");
  }
  if (selection.status === "CANDIDATE" && selection.selected_candidates.length === 0) {
    throw new CascadeError("candidate capability selection contains no selected routes");
  }
  if (selection.status === "CANDIDATE" && selection.ambiguities.length > 0) {
    throw new CascadeError("candidate capability selection contains unresolved ambiguities");
  }
  if (selection.status === "BLOCKED" && selection.selected_candidates.length > 0) {
    throw new CascadeError("blocked capability selection cannot contain partial selected routes");
  }
  for (const requiredInput of ["task-envelope", "plugin-capability-catalog"]) {
    if (!selection.input_artifacts.includes(requiredInput)) {
      throw new CascadeError(`capability selection is missing controller input: ${requiredInput}`);
    }
  }

  const skills = catalogSkillMap(catalog);
  const claims = new Set(envelope.claims.map((claim) => claim.claim_id));
  const selectedByRoute = new Map<string, JsonRecord>();
  for (const candidate of selection.selected_candidates) {
    if (selectedByRoute.has(candidate.route)) {
      throw new CascadeError(`duplicate selected capability route: ${candidate.route}`);
    }
    const descriptor = skills.get(candidate.route);
    if (!descriptor) {
      throw new CascadeError(`selected capability route is absent from catalog: ${candidate.route}`);
    }
    if (COORDINATOR_ROUTES.has(candidate.route)) {
      throw new CascadeError(`${candidate.route} is a coordination controller and cannot be selected as domain work`);
    }
    if (candidate.plugin_version !== descriptor.plugin_version) {
      throw new CascadeError(`${candidate.route} plugin version is stale`);
    }
    if (!exactStringSet(candidate.required_dependencies, descriptor.required_dependencies)) {
      throw new CascadeError(`${candidate.route} required dependencies differ from its capability descriptor`);
    }
    if (candidate.effect !== descriptor.effect || candidate.authority !== descriptor.authority) {
      throw new CascadeError(`${candidate.route} effect or authority differs from its capability descriptor`);
    }
    if ((AUTHORITY_RANK[candidate.authority] ?? 99) > (AUTHORITY_RANK[envelope.workload.authority] ?? -1)) {
      throw new CascadeError(`${candidate.route} exceeds Task Envelope authority`);
    }
    for (const claimId of candidate.claim_ids as string[]) {
      if (!claims.has(claimId)) {
        throw new CascadeError(`${candidate.route} references unknown claim ${claimId}`);
      }
    }
    selectedByRoute.set(candidate.route, candidate);
  }
  for (const [route, candidate] of selectedByRoute) {
    for (const dependency of candidate.required_dependencies as string[]) {
      if (!selectedByRoute.has(dependency)) {
        throw new CascadeError(`${route} required dependency is not selected: ${dependency}`);
      }
    }
  }

  const rejectedRoutes = new Set<string>();
  for (const rejection of selection.rejected_candidates) {
    if (rejectedRoutes.has(rejection.route)) {
      throw new CascadeError(`duplicate rejected capability route: ${rejection.route}`);
    }
    if (!skills.has(rejection.route)) {
      throw new CascadeError(`rejected capability route is absent from catalog: ${rejection.route}`);
    }
    if (selectedByRoute.has(rejection.route)) {
      throw new CascadeError(`capability route is both selected and rejected: ${rejection.route}`);
    }
    rejectedRoutes.add(rejection.route);
  }
}

export function validatePluginPlan(
  plan: JsonRecord,
  selection: CapabilitySelection,
  envelope: TaskEnvelope,
  catalog: PluginCapabilityCatalog,
): void {
  validateCapabilitySelection(selection, envelope, catalog);
  assertJsonSchema(plan, PLAN_SCHEMA, "plugin plan");
  if (plan.task_envelope_id !== envelope.envelope_id || plan.request_digest !== envelope.request_digest) {
    throw new CascadeError("plugin plan is not bound to the supplied Task Envelope");
  }
  if (plan.capability_catalog_digest !== catalog.catalog_digest) {
    throw new CascadeError("plugin plan is not bound to the current capability catalog");
  }
  if (plan.capability_selection_digest !== selection.selection_digest) {
    throw new CascadeError("plugin plan is not bound to the validated capability selection");
  }
  if ((plan.status === "BLOCKED") !== (plan.blockers.length > 0)) {
    throw new CascadeError("plugin plan status and blockers disagree");
  }
  if (plan.status === "CANDIDATE" && plan.selected_nodes.length === 0) {
    throw new CascadeError("candidate plugin plan contains no selected nodes");
  }
  if (selection.status === "BLOCKED" && plan.status !== "BLOCKED") {
    throw new CascadeError("blocked capability selection cannot produce a candidate plugin plan");
  }
  if (plan.status === "BLOCKED" && plan.selected_nodes.length > 0) {
    throw new CascadeError("blocked plugin plan cannot contain partial selected nodes");
  }
  if (!exactStringSet(plan.input_artifacts, selection.input_artifacts)) {
    throw new CascadeError("plugin plan input artifacts differ from the capability selection");
  }

  const selectedCandidates = new Map<string, JsonRecord>();
  for (const candidate of selection.selected_candidates) {
    selectedCandidates.set(candidate.route, candidate);
  }
  const selectedPlanRoutes = (plan.selected_nodes as JsonRecord[]).map((node) => node.route);
  if (plan.status === "CANDIDATE" && !exactStringSet(selectedPlanRoutes, [...selectedCandidates.keys()])) {
    throw new CascadeError("plugin plan routes differ from the capability selection");
  }
  const selectionRejections = selection.rejected_candidates.map((item) => item.route);
  const planRejections = (plan.rejected_candidates as JsonRecord[]).map((item) => item.route);
  if (new Set(planRejections).size !== planRejections.length) {
    throw new CascadeError("plugin plan contains duplicate rejected routes");
  }
  if (!exactStringSet(planRejections, selectionRejections)) {
    throw new CascadeError("plugin plan rejected routes differ from the capability selection");
  }
  if (plan.status === "BLOCKED") return;

  const skills = catalogSkillMap(catalog);
  const claims = new Set(envelope.claims.map((claim) => claim.claim_id));
  const nodeById = new Map<string, JsonRecord>();
  const routeIndex = new Map<string, number>();
  const routeToNodeId = new Map<string, string>();
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
    if (COORDINATOR_ROUTES.has(node.route)) {
      throw new CascadeError(`${node.route} is a coordination controller and cannot be a selected work node`);
    }
    const selectedCandidate = selectedCandidates.get(node.route);
    if (!selectedCandidate) throw new CascadeError(`${node.route} is absent from the capability selection`);
    if (node.plugin_version !== descriptor.plugin_version) {
      throw new CascadeError(`${node.route} plugin version is stale`);
    }
    if (
      node.plugin_version !== selectedCandidate.plugin_version
      || !exactStringSet(node.claim_ids, selectedCandidate.claim_ids)
      || node.effect !== selectedCandidate.effect
      || node.authority !== selectedCandidate.authority
    ) {
      throw new CascadeError(`${node.route} differs from its selected capability binding`);
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
    if (node.route.startsWith("cascade-evals:") && node.model.reasoning_effort !== "max") {
      throw new CascadeError(`${node.route} evaluation reasoning effort must be max`);
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
    routeToNodeId.set(node.route, node.node_id);
  }

  const edgeTriples = new Set<string>();
  const dependencyGraph = new Map<string, Set<string>>();
  for (const nodeId of nodeById.keys()) dependencyGraph.set(nodeId, new Set());
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
    const key = `${edge.from}\0${edge.to}\0${edge.artifact}`;
    if (edgeTriples.has(key)) throw new CascadeError(`duplicate plugin plan edge: ${edge.from} -> ${edge.to} (${edge.artifact})`);
    edgeTriples.add(key);
    dependencyGraph.get(edge.from)!.add(edge.to);
  }

  for (const node of plan.selected_nodes as JsonRecord[]) {
    const descriptor = skills.get(node.route)!;
    for (const dependency of descriptor.required_dependencies as string[]) {
      const dependencyNodeId = routeToNodeId.get(dependency)!;
      dependencyGraph.get(dependencyNodeId)!.add(node.node_id);
    }
    for (const artifact of node.consumes as string[]) {
      if (plan.input_artifacts.includes(artifact)) continue;
      const producer = (plan.selected_nodes as JsonRecord[]).find((candidate) => candidate.produces.includes(artifact));
      if (!producer) throw new CascadeError(`${node.route} consumes unavailable artifact: ${artifact}`);
      const edgeKey = `${producer.node_id}\0${node.node_id}\0${artifact}`;
      if (!edgeTriples.has(edgeKey)) {
        throw new CascadeError(`${node.route} required artifact edge is missing: ${producer.node_id} -> ${node.node_id} (${artifact})`);
      }
    }
  }

  function reaches(from: string, target: string, visiting = new Set<string>()): boolean {
    if (from === target) return true;
    if (visiting.has(from)) return false;
    const next = new Set(visiting).add(from);
    for (const candidate of dependencyGraph.get(from) ?? []) {
      if (reaches(candidate, target, next)) return true;
    }
    return false;
  }

  const grouped = new Set<string>();
  for (const group of plan.parallel_groups as string[][]) {
    for (const nodeId of group) {
      if (!nodeById.has(nodeId)) throw new CascadeError(`parallel group references unknown node: ${nodeId}`);
      if (grouped.has(nodeId)) throw new CascadeError(`plugin plan node appears in multiple parallel groups: ${nodeId}`);
      const node = nodeById.get(nodeId)!;
      if (node.effect !== "READ_ONLY" || node.authority !== "READ_ONLY") {
        throw new CascadeError(`parallel plugin plan node is not read-safe: ${nodeId}`);
      }
      grouped.add(nodeId);
    }
    for (const left of group) {
      for (const right of group) {
        if (left !== right && (reaches(left, right) || reaches(right, left))) {
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
  const selectionPath = flag(args, "selection");
  const envelopePath = flag(args, "envelope");
  if (!planPath || !selectionPath || !envelopePath) {
    throw new CascadeError("workflow validate-plan requires --plan PATH, --selection PATH, and --envelope PATH");
  }
  const plan = await readJson<JsonRecord>(boundedPath(planPath));
  const selection = await readJson<CapabilitySelection>(boundedPath(selectionPath));
  const envelope = await readBoundedTaskEnvelope(envelopePath);
  const catalog = await readPluginCapabilityCatalog();
  validatePluginPlan(plan, selection, envelope, catalog);
  console.log(`plugin_plan_status=PASS envelope=${envelope.envelope_id} nodes=${plan.selected_nodes.length} catalog=${catalog.catalog_digest}`);
  return 0;
}

async function validateSelectionCommand(args: ReturnType<typeof parseArgs>): Promise<number> {
  const selectionPath = flag(args, "selection") ?? args.positionals[0];
  const envelopePath = flag(args, "envelope");
  if (!selectionPath || !envelopePath) {
    throw new CascadeError("workflow validate-selection requires --selection PATH and --envelope PATH");
  }
  const selection = await readJson<CapabilitySelection>(boundedPath(selectionPath));
  const envelope = await readBoundedTaskEnvelope(envelopePath);
  const catalog = await readPluginCapabilityCatalog();
  validateCapabilitySelection(selection, envelope, catalog);
  console.log(`capability_selection_status=PASS envelope=${envelope.envelope_id} routes=${selection.selected_candidates.length} catalog=${catalog.catalog_digest}`);
  return 0;
}

export async function main(argv: string[]): Promise<number> {
  const [command, ...rest] = argv;
  const args = parseArgs(rest);
  if (command === "catalog") return checkOrWriteCatalog(args);
  if (command === "validate-selection") return validateSelectionCommand(args);
  if (command === "validate" || command === "validate-plan") return validatePlanCommand(args);
  throw new CascadeError("workflow command must be catalog, validate-selection, or validate-plan");
}
