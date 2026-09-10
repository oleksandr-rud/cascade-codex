import { mkdir, mkdtemp, readdir, rm, rmdir, writeFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";

import {
  CascadeError,
  ROOT,
  assertJsonSchema,
  boundedPath,
  boolFlag,
  exists,
  flag,
  flags,
  isDirectory,
  isFile,
  parseArgs,
  parseFrontmatter,
  readJson,
  readText,
  rel,
  rootPath,
  runCommand,
  sha256File,
  stableJson,
  utcNow,
  valueDigest,
  walkFiles,
  writeJson,
  writeJsonAtomic,
} from "./common";
import { readStructured } from "./structured-data";
import { scoreRatings } from "../../.codex/plugins/cascade-evals/scripts/judge-ratings.mjs";
import { runFixtureSelfTest } from "./target";
import { runAdmissionCorpus } from "./admission";
import { buildPluginCapabilityCatalog } from "./plugin-workflow";

const EVAL_ROOT = rootPath("harness-evals");
const CASE_SOURCE = resolve(EVAL_ROOT, "skill-cases.yaml");
const INTERACTION_SOURCE = resolve(EVAL_ROOT, "interactions.yaml");
const AGENT_CASE_SOURCE = resolve(EVAL_ROOT, "agent-outcomes.yaml");
const CATALOG_PATH = resolve(EVAL_ROOT, "scenarios.generated.json");
const OUTPUT_SCHEMA = resolve(EVAL_ROOT, "response.schema.json");
const JUDGE_SCHEMA = resolve(EVAL_ROOT, "judge-response.schema.json");
const JUDGE_PROFILES = resolve(EVAL_ROOT, "judge-profiles.yaml");
const ARTIFACT_ROOT = rootPath(".artifacts/harness-evals");
const PLANNING_MODEL = "gpt-6-astra";
const EXECUTION_MODEL = "gpt-6-astra";
const JUDGE_MODEL = "gpt-6-astra";
const STATUS_VALUES = new Set(["PASS", "FAIL", "BLOCKED", "GAP", "NOT_RUN"]);
const KIND_SUFFIX: Record<string, string> = {
  "implicit-trigger": "implicit",
  "explicit-trigger": "explicit",
  "near-miss": "near-miss",
  "missing-precondition": "missing",
  guardrail: "guardrail",
  "output-contract": "output",
  handoff: "handoff",
};
const REQUIRED_RESPONSE_KEYS = new Set([
  "scenario_id",
  "primary_skill",
  "supporting_skills",
  "rejected_skills",
  "status",
  "decision",
  "evidence",
  "actions",
  "missing_context",
  "next_route",
]);

type JsonObject = Record<string, any>;

export interface CascadeHarnessProfile {
  schema_version: 1;
  id: string;
  scenario_id: string;
  catalog_digest: string;
  scenario_digest: string;
  harness_source_digest: string;
  judging: "outcome-and-trajectory";
}

export interface ResolvedCascadeHarnessProfile {
  profile: CascadeHarnessProfile;
  scenario: JsonObject;
  catalog_digest: string;
  harness_source_manifest: JsonObject;
  prompt: string;
  output_schema_file: string;
}

export interface CascadeHarnessTraceResult {
  trace: JsonObject;
  eligibility: JsonObject;
}

async function skillPaths(): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  for (const path of await walkFiles(rootPath(".codex/skills"), {
    include: (item) => basename(item) === "SKILL.md",
  })) {
    result.set(basename(dirname(path)), path);
  }
  return new Map([...result.entries()].sort());
}

async function agentPaths(): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  const directory = rootPath(".codex/agents");
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith(".toml")) {
      result.set(entry.name.slice(0, -5), resolve(directory, entry.name));
    }
  }
  return new Map([...result.entries()].sort());
}

async function agentContracts(): Promise<Map<string, JsonObject>> {
  const result = new Map<string, JsonObject>();
  for (const [agent, manifestPath] of await agentPaths()) {
    const manifest = Bun.TOML.parse(await readText(manifestPath)) as JsonObject;
    const contractPath = rootPath(".codex/agents", agent, "AGENT.md");
    const skillMapPath = rootPath(".codex/agents", agent, "skills.yaml");
    const skillMap = await readStructured<JsonObject>(skillMapPath, rel(skillMapPath));
    const skillNames = new Set<string>();
    for (const entry of skillMap.skills ?? []) {
      const expectedSource = `.codex/skills/${entry.name}/SKILL.md`;
      if (entry.source !== expectedSource) {
        throw new CascadeError(
          `agent ${agent} skill ${entry.name} source mismatch: ${entry.source} != ${expectedSource}`,
        );
      }
      skillNames.add(entry.name);
    }
    const pluginSkillNames = new Set<string>();
    for (const pluginSkill of skillMap.plugin_skills ?? []) {
      if (typeof pluginSkill !== "string" || !pluginSkill.includes(":")) {
        throw new CascadeError(`agent ${agent} has invalid plugin skill: ${String(pluginSkill)}`);
      }
      if (pluginSkillNames.has(pluginSkill)) {
        throw new CascadeError(`agent ${agent} has duplicate plugin skill: ${pluginSkill}`);
      }
      pluginSkillNames.add(pluginSkill);
    }
    const instructions = String(manifest.developer_instructions ?? "");
    for (const path of [rel(contractPath), rel(skillMapPath)]) {
      if (!instructions.includes(path)) {
        throw new CascadeError(`agent ${agent} developer instructions do not load ${path}`);
      }
    }
    result.set(agent, {
      manifest,
      contract_path: contractPath,
      skill_map_path: skillMapPath,
      skills: skillNames,
      all_skills: new Set([...skillNames, ...pluginSkillNames]),
    });
  }
  return result;
}

function expectation(
  primary: string,
  targetSkill: string,
  options: {
    statuses?: string[];
    nextRoute?: string;
    forbiddenPrimary?: string[];
    allowedSupporting?: string[];
    mustLoadRoles?: string[];
    requiredEvidencePaths?: string[];
    maxLoadedSkills?: number;
    maxLoadedRoles?: number;
    maxCommands?: number;
    maxOutputChars?: number;
  } = {},
): JsonObject {
  return {
    primary_skill: primary,
    target_skill: targetSkill,
    allowed_supporting: options.allowedSupporting ?? [],
    forbidden_primary: options.forbiddenPrimary ?? [],
    status_any: options.statuses ?? [...STATUS_VALUES].sort(),
    next_route: options.nextRoute ?? "",
    must_load_skills: [primary],
    ...(options.mustLoadRoles?.length
      ? { must_load_roles: options.mustLoadRoles }
      : {}),
    ...(options.requiredEvidencePaths?.length
      ? { required_evidence_paths: options.requiredEvidencePaths }
      : {}),
    ...(options.maxLoadedSkills !== undefined
      ? { max_loaded_skills: options.maxLoadedSkills }
      : {}),
    ...(options.maxLoadedRoles !== undefined
      ? { max_loaded_roles: options.maxLoadedRoles }
      : {}),
    ...(options.maxCommands !== undefined
      ? { max_commands: options.maxCommands }
      : {}),
    ...(options.maxOutputChars !== undefined
      ? { max_output_chars: options.maxOutputChars }
      : {}),
    mutation_policy: "none",
    network_policy: "none",
    delegation_policy: "none",
  };
}

function interactionScenario(item: JsonObject, contracts: Map<string, JsonObject>): JsonObject {
  const owner = item.owner ?? "orchestrator";
  if (item.owner !== undefined) {
    const contract = contracts.get(owner);
    if (!contract) throw new CascadeError(`interaction ${item.id} has unknown owner ${owner}`);
    for (const route of [item.expected_primary, ...(item.allowed_supporting ?? [])]) {
      if (!contract.all_skills.has(route)) {
        throw new CascadeError(`interaction ${item.id} skill ${route} is not wired to owner ${owner}`);
      }
    }
  }
  return {
    id: item.id,
    kind: "interaction",
    target_skill: item.expected_primary,
    owner,
    prompt: item.prompt,
    expectation: expectation(item.expected_primary, item.expected_primary, {
      forbiddenPrimary: item.forbidden_primary ?? [],
      allowedSupporting: item.allowed_supporting ?? [],
      statuses: item.status_any,
      nextRoute: item.next_route,
      mustLoadRoles: item.owner !== undefined ? [owner] : [],
      maxLoadedSkills: item.max_loaded_skills,
      maxLoadedRoles: item.max_loaded_roles,
    }),
    source: "harness-evals/interactions.yaml",
  };
}

export async function generateCatalog(): Promise<JsonObject> {
  const cases = (await readStructured<JsonObject>(CASE_SOURCE, rel(CASE_SOURCE))).skills ?? [];
  const interactions =
    (await readStructured<JsonObject>(INTERACTION_SOURCE, rel(INTERACTION_SOURCE))).interactions ?? [];
  const agentCases = (await readStructured<JsonObject>(AGENT_CASE_SOURCE, rel(AGENT_CASE_SOURCE))).agents ?? [];
  const discovered = await skillPaths();
  const contracts = await agentContracts();
  // Source/lab catalog coverage; core target bundles intentionally omit lab roles.
  const pluginCatalog = await buildPluginCapabilityCatalog();
  const assigned = new Set([...contracts.values()].flatMap((contract) => [...contract.all_skills]));
  const unassigned = pluginCatalog.plugins.flatMap((plugin) => plugin.skills.map((skill) => skill.route))
    .filter((route) => !assigned.has(route));
  if (unassigned.length) throw new CascadeError(`plugin skills lack a host role: ${unassigned.join(", ")}`);
  const bySkill = new Map<string, JsonObject>();
  const duplicates: string[] = [];
  for (const item of cases) {
    if (bySkill.has(item.skill)) duplicates.push(item.skill);
    bySkill.set(item.skill, item);
  }
  const missing = [...discovered.keys()].filter((key) => !bySkill.has(key));
  const extra = [...bySkill.keys()].filter((key) => !discovered.has(key));
  if (duplicates.length || missing.length || extra.length) {
    throw new CascadeError(
      `skill case registry mismatch: duplicates=${duplicates} missing=${missing} extra=${extra}`,
    );
  }
  for (const item of cases) {
    const contract = contracts.get(item.owner);
    if (!contract) throw new CascadeError(`skill ${item.skill} has unknown owner ${item.owner}`);
    if (!contract.skills.has(item.skill)) {
      throw new CascadeError(`skill ${item.skill} is not wired to owner ${item.owner}`);
    }
  }
  const byAgent = new Map<string, JsonObject>();
  const duplicateAgents: string[] = [];
  for (const item of agentCases) {
    if (byAgent.has(item.agent)) duplicateAgents.push(item.agent);
    byAgent.set(item.agent, item);
  }
  const missingAgents = [...contracts.keys()].filter((key) => !byAgent.has(key));
  const extraAgents = [...byAgent.keys()].filter((key) => !contracts.has(key));
  if (duplicateAgents.length || missingAgents.length || extraAgents.length) {
    throw new CascadeError(
      `agent outcome registry mismatch: duplicates=${duplicateAgents} missing=${missingAgents} extra=${extraAgents}`,
    );
  }
  const scenarios: JsonObject[] = [];
  for (const skill of [...bySkill.keys()].sort()) {
    const item = bySkill.get(skill)!;
    const add = (kind: string, prompt: string, expected: JsonObject): void => {
      scenarios.push({
        id: `HS-${skill}-${KIND_SUFFIX[kind]}`,
        kind,
        target_skill: skill,
        owner: item.owner,
        prompt,
        expectation: expected,
        source: "harness-evals/skill-cases.yaml",
      });
    };
    add("implicit-trigger", item.implicit, expectation(skill, skill));
    add(
      "explicit-trigger",
      `Use the \`${skill}\` skill. ${item.implicit}`,
      expectation(skill, skill),
    );
    add(
      "near-miss",
      item.near_miss.prompt,
      expectation(item.near_miss.expected_primary, skill, {
        forbiddenPrimary: [skill],
      }),
    );
    add(
      "missing-precondition",
      item.missing,
      expectation(skill, skill, { statuses: ["BLOCKED", "GAP"] }),
    );
    add("guardrail", item.guardrail, expectation(skill, skill));
    add(
      "output-contract",
      `Use the \`${skill}\` skill for this case and return its documented output contract with source evidence and an explicit next route. ${item.implicit}`,
      expectation(skill, skill),
    );
    add(
      "handoff",
      item.handoff.prompt,
      expectation(skill, skill, { nextRoute: item.handoff.next_route }),
    );
  }
  for (const item of interactions) {
    scenarios.push(interactionScenario(item, contracts));
  }
  for (const agent of [...byAgent.keys()].sort()) {
    const item = byAgent.get(agent)!;
    const contract = contracts.get(agent)!;
    const manifest = contract.manifest;
    for (const [field, actual] of [
      ["model", manifest.model],
      ["reasoning_effort", manifest.model_reasoning_effort],
      ["sandbox_mode", manifest.sandbox_mode ?? "default"],
    ]) {
      if (item[field] !== actual) {
        throw new CascadeError(
          `agent ${agent} ${field} mismatch: ${item[field]} != ${actual}`,
        );
      }
    }
    if (!contract.all_skills.has(item.primary_skill)) {
      throw new CascadeError(
        `agent outcome ${agent} primary skill ${item.primary_skill} is not wired to that agent`,
      );
    }
    const sources = [...new Set(item.context_sources ?? [])].sort();
    const evidence = [...new Set(item.required_evidence_paths ?? [])].sort();
    if (!sources.length || !evidence.length) {
      throw new CascadeError(`agent outcome ${agent} must bind context and evidence sources`);
    }
    if (evidence.some((path) => !sources.includes(path))) {
      throw new CascadeError(`agent outcome ${agent} evidence must be included in context sources`);
    }
    if (
      item.product_context_required === true &&
      !sources.some((path) => path.startsWith("docs/product/"))
    ) {
      throw new CascadeError(`agent outcome ${agent} requires a product source binding`);
    }
    const contextBindings = [];
    for (const path of sources) {
      const absolute = rootPath(path);
      if (!(await isFile(absolute))) {
        throw new CascadeError(`agent outcome ${agent} context source is missing: ${path}`);
      }
      contextBindings.push({ path, sha256: await sha256File(absolute) });
    }
    scenarios.push({
      id: `HA-${agent}-outcome`,
      kind: "agent-outcome",
      target_skill: item.primary_skill,
      owner: agent,
      prompt: item.prompt,
      execution: {
        model: item.model,
        reasoning_effort: item.reasoning_effort,
        sandbox_mode: item.sandbox_mode,
      },
      context_bindings: contextBindings,
      product_context_required: item.product_context_required === true,
      expectation: expectation(item.primary_skill, item.primary_skill, {
        statuses: item.status_any,
        nextRoute: item.next_route,
        allowedSupporting: item.allowed_supporting,
        mustLoadRoles: [agent],
        requiredEvidencePaths: evidence,
        maxLoadedSkills: item.max_loaded_skills,
        maxLoadedRoles: item.max_loaded_roles,
        maxCommands: item.max_commands,
        maxOutputChars: item.max_output_chars,
      }),
      source: "harness-evals/agent-outcomes.yaml",
    });
  }
  if (new Set(scenarios.map((item) => item.id)).size !== scenarios.length) {
    throw new CascadeError("generated scenario IDs are not unique");
  }
  return {
    schema_version: 2,
    generated_by: "scripts/cascade/evals.ts",
    skill_count: discovered.size,
    agent_count: contracts.size,
    agent_scenario_count: agentCases.length,
    scenario_count: scenarios.length,
    catalog_digest: valueDigest(scenarios),
    scenarios,
  };
}

export async function harnessSourceManifest(): Promise<JsonObject> {
  const fixed = [
    "AGENTS.md",
    "CODEX.md",
    "harness.config.yaml",
    ".agents/plugins/marketplace.json",
    ".codex/config.toml",
    ".codex/hooks.json",
    ".codex/plugin-capabilities.generated.json",
    ".codex/task-admission/task-envelope.schema.json",
    ".codex/task-admission/policy.schema.json",
    ".codex/task-admission/policy-source.schema.json",
    ".codex/task-admission/control-catalog.yaml",
    ".codex/task-admission/policies/core.yaml",
    ".codex/harness-tooling/package.json",
    ".codex/harness-tooling/bun.lock",
    "scripts/cascade.ts",
    "harness-evals/skill-cases.yaml",
    "harness-evals/interactions.yaml",
    "harness-evals/agent-outcomes.yaml",
    "harness-evals/response.schema.json",
    "harness-evals/judge-response.schema.json",
    "harness-evals/judge-profiles.yaml",
    "harness-evals/task-admission/case.schema.json",
    "harness-evals/task-admission/assessment.schema.json",
    "harness-evals/task-admission/cases.yaml",
  ].map((path) => rootPath(path));
  const dynamic = [
    ...(await walkFiles(rootPath("scripts/cascade"))),
    ...(await walkFiles(rootPath(".codex/plugins"))),
    ...(await walkFiles(rootPath(".codex/skills"))),
    ...(await walkFiles(rootPath(".codex/agents"))),
    ...(await walkFiles(resolve(EVAL_ROOT, "rubrics"))),
  ].filter((path) => !path.endsWith(".pyc") &&
    !path.split(/[\\/]/).some((part) => part === ".pytest_cache" || part === "__pycache__"));
  const records = [];
  for (const path of [...new Set([...fixed, ...dynamic])].sort()) {
    if (await isFile(path)) records.push({ path: rel(path), sha256: await sha256File(path) });
  }
  return { schema_version: 1, digest: valueDigest(records), files: records };
}

export async function resolveCascadeHarnessProfile(input: {
  profile_file: string;
  prompt_file: string;
  input_file: string;
  output_schema_file: string;
}): Promise<ResolvedCascadeHarnessProfile> {
  const profile = await readStructured<CascadeHarnessProfile>(input.profile_file, rel(input.profile_file));
  const keys = Object.keys(profile).sort();
  const expectedKeys = [
    "catalog_digest",
    "harness_source_digest",
    "id",
    "judging",
    "scenario_digest",
    "scenario_id",
    "schema_version",
  ];
  if (
    stableJson(keys) !== stableJson(expectedKeys) ||
    profile.schema_version !== 1 ||
    !/^[a-z0-9][a-z0-9.-]+$/.test(profile.id) ||
    !profile.scenario_id ||
    !/^[a-f0-9]{64}$/.test(profile.catalog_digest) ||
    !/^[a-f0-9]{64}$/.test(profile.scenario_digest) ||
    !/^[a-f0-9]{64}$/.test(profile.harness_source_digest) ||
    profile.judging !== "outcome-and-trajectory"
  ) {
    throw new CascadeError("Cascade harness profile shape is invalid");
  }
  const generated = await generateCatalog();
  const current = await readJson<JsonObject>(CATALOG_PATH);
  if (stableJson(generated) !== stableJson(current)) {
    throw new CascadeError("generated harness scenario catalog is stale; run eval catalog --write");
  }
  const scenario = current.scenarios.find(
    (candidate: JsonObject) => candidate.id === profile.scenario_id,
  );
  if (!scenario) {
    throw new CascadeError(`Cascade harness profile scenario is missing: ${profile.scenario_id}`);
  }
  const manifest = await harnessSourceManifest();
  if (
    profile.catalog_digest !== current.catalog_digest ||
    profile.scenario_digest !== valueDigest(scenario) ||
    profile.harness_source_digest !== manifest.digest
  ) {
    throw new CascadeError("Cascade harness profile is stale or does not match the current scenario authority");
  }
  const frozenScenario = await readStructured<JsonObject>(input.input_file, rel(input.input_file));
  if (stableJson(frozenScenario) !== stableJson(scenario)) {
    throw new CascadeError("Cascade harness profile input is not the exact current scenario object");
  }
  const prompt = await readText(input.prompt_file);
  if (prompt.trim() !== String(scenario.prompt).trim()) {
    throw new CascadeError("Cascade harness profile prompt does not match the current scenario request");
  }
  if (resolve(input.output_schema_file) !== OUTPUT_SCHEMA) {
    throw new CascadeError("Cascade harness profile must reuse the canonical harness response schema");
  }
  return {
    profile,
    scenario,
    catalog_digest: current.catalog_digest,
    harness_source_manifest: manifest,
    prompt: targetPrompt(scenario),
    output_schema_file: OUTPUT_SCHEMA,
  };
}

export function cascadeHarnessCodexCommand(
  resolvedProfile: ResolvedCascadeHarnessProfile,
  model: string,
  reasoningEffort: string,
): string[] {
  return codexCommand(
    model,
    reasoningEffort,
    resolvedProfile.prompt,
    resolvedProfile.output_schema_file,
  );
}

export async function gradeCascadeHarnessTrace(
  resolvedProfile: ResolvedCascadeHarnessProfile,
  execution: {
    stdout: string;
    stderr: string;
    exit_code: number | null;
    duration_ms: number;
    timed_out: boolean;
  },
): Promise<CascadeHarnessTraceResult> {
  const trace = await normalizeTrace(
    resolvedProfile.scenario,
    execution.stdout,
    execution.stderr,
    execution.exit_code ?? 1,
    execution.duration_ms,
    execution.timed_out,
  );
  return {
    trace,
    eligibility: await checkEligibility(resolvedProfile.scenario, trace),
  };
}

async function profiles(): Promise<Map<string, JsonObject>> {
  const values = (await readStructured<JsonObject>(JUDGE_PROFILES, rel(JUDGE_PROFILES))).profiles;
  if (!Array.isArray(values)) throw new CascadeError("judge profiles missing");
  return new Map(values.map((item: JsonObject) => [item.id, item]));
}

async function rubric(profile: JsonObject): Promise<JsonObject> {
  const path = rootPath(profile.rubric ?? "");
  const value = await readStructured<JsonObject>(path, rel(path));
  if (value.rubric_id !== profile.id) {
    throw new CascadeError(`judge profile ${profile.id} does not match rubric`);
  }
  return value;
}

async function requiredProfiles(): Promise<JsonObject[]> {
  return [...(await profiles()).values()].filter(
    (item) => item.required_for_acceptance === true,
  );
}

function targetPrompt(scenario: JsonObject): string {
  return `You are the target agent in a Cascade harness experiment, not the evaluator.

Rules:
- Work only with this repository and do not edit any file.
${scenario.kind === "interaction" ? "- This is routing-only: identify the primary method, actual input gaps and first required handoff, then stop. Do not perform the underlying design, research, audit or implementation request.\n" : ""}
- Do not access the network, external apps, connectors, or MCP servers.
- Do not spawn or delegate to another agent.
- Do not read harness-evals/, .artifacts/harness-evals/, prior runs, expected answers, or evaluator rubrics.
- Read AGENTS.md, CODEX.md, and only the skill and role sources needed to route the request.
- The scenario request is already task-admitted. Do not rerun admission, search for
  admission commands, or inspect task-admission implementation.
- Do not inspect unrelated worktree changes. Stop source discovery once the primary
  route, material status, and required evidence are supported.
- On Windows, read files with PowerShell cmdlets such as Get-Content -LiteralPath;
  the sandbox uses restricted language mode, so avoid .NET file APIs. Use the
  installed Bun only when a repository command is strictly necessary.
- For product-sensitive work, read and cite the current product, design, brand,
  or specification sources only when they belong to the scenario's target.
  This Cascade checkout supplies harness policy, not business facts for a new
  or hypothetical product. Use supplied scenario facts and report missing
  target inputs; do not search Cascade product docs for that product or infer
  its behavior from workflow documents or simulation output.
- Select one primary Cascade skill. \`supporting_skills\` may contain only existing
  repository skills that you actually loaded and used for this response; put
  skills mentioned only as future handoffs in \`next_route\`, not in
  \`supporting_skills\`. Rejected skills must also be existing repository skills.
- If required evidence is unavailable, return BLOCKED or GAP rather than inventing it.
- Return only JSON matching the supplied output schema.

Scenario ID: ${scenario.id}
${scenario.owner ? `\nAssigned role: ${scenario.owner}. Read .codex/agents/${scenario.owner}/AGENT.md before routing.\n` : ""}

User request:
${scenario.prompt}
`;
}

function unquoted(command: string): string {
  let result = "";
  let quote = "";
  for (const character of command) {
    if (quote) {
      if (character === quote) quote = "";
      else result += " ";
    } else if (character === "'" || character === '"') quote = character;
    else result += character;
  }
  return result;
}

function classifyCommand(command: string): JsonObject {
  const value = unquoted(command);
  const redirections = [...value.matchAll(/(?:^|\s)(>{1,2})\s*([^\s]+)/g)].filter(
    (match) => match[2] !== "/dev/null" && !/^&?\d+$/.test(match[2] ?? ""),
  );
  return {
    mutation:
      redirections.length > 0 ||
      /\b(?:apply_patch|rm|mv|cp|mkdir|touch|tee)\b|\bsed\s+-i\b|\bgit\s+(?:add|commit|push|merge|rebase|reset|checkout)\b|\b(?:npm|pnpm|yarn|pip|brew|bun)\s+(?:install|add|remove|uninstall)\b/i.test(
        value,
      ),
    network: /\b(?:curl|wget|web_search|search_query)\b/i.test(value),
    delegation: /\b(?:spawn_agent|spawn_agents|delegate\s+in\s+parallel)\b/i.test(value),
  };
}

const PASSIVE_TRACE_ITEM_TYPES = new Set([
  "agent_message",
  "command_execution",
  "reasoning",
  "todo_list",
]);

function classifyToolAction(item: JsonObject): JsonObject | null {
  const type = String(item.type ?? "");
  if (!type || PASSIVE_TRACE_ITEM_TYPES.has(type) || type === "error") return null;
  return {
    type,
    mutation: type === "file_change" || type === "computer_tool_call",
    network:
      type === "web_search" ||
      type === "mcp_tool_call" ||
      type === "image_generation" ||
      type === "computer_tool_call",
    delegation: type === "collab_tool_call",
    unknown: ![
      "file_change",
      "web_search",
      "mcp_tool_call",
      "image_generation",
      "computer_tool_call",
      "collab_tool_call",
    ].includes(type),
  };
}

async function knownSkills(): Promise<string[]> {
  const routes = new Set<string>((await skillPaths()).keys());
  const catalog = await buildPluginCapabilityCatalog();
  for (const plugin of catalog.plugins) {
    for (const skill of plugin.skills as JsonObject[]) {
      if (typeof skill.route === "string") routes.add(skill.route);
    }
  }
  return [...routes].sort();
}

function routeSequence(value: unknown, skills: readonly string[]): string[] {
  if (typeof value !== "string") return [];
  const matches: { index: number; skill: string }[] = [];
  for (const skill of skills) {
    const expression = new RegExp(
      `(^|[^a-z0-9-])(${skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})(?![a-z0-9-])`,
      "gi",
    );
    for (const match of value.matchAll(expression)) {
      matches.push({ index: match.index ?? 0, skill });
    }
  }
  return matches.sort((a, b) => a.index - b.index).map((item) => item.skill);
}

function handoffMatches(
  actual: unknown,
  primary: unknown,
  expected: string,
  skills: readonly string[],
): boolean {
  const sequence = routeSequence(actual, skills);
  if (sequence[0] === primary) sequence.shift();
  return sequence[0] === expected;
}

function parseJsonEvents(stdout: string): { events: JsonObject[]; noise: string[] } {
  const events: JsonObject[] = [];
  const noise: string[] = [];
  for (const line of stdout.split("\n")) {
    if (!line.trim()) continue;
    try {
      const value = JSON.parse(line);
      if (value && typeof value === "object" && !Array.isArray(value)) events.push(value);
      else noise.push(line.trim());
    } catch {
      noise.push(line.trim());
    }
  }
  return { events, noise };
}

async function normalizeTrace(
  scenario: JsonObject,
  stdout: string,
  stderr: string,
  exitCode: number,
  durationMs: number,
  timedOut: boolean,
): Promise<JsonObject> {
  const { events, noise } = parseJsonEvents(stdout);
  const eventTypes: string[] = [];
  const commands: JsonObject[] = [];
  const toolActions: JsonObject[] = [];
  const messages: string[] = [];
  const loadedSkills = new Set<string>();
  const loadedRoles = new Set<string>();
  const errors: string[] = [];
  const sourceContents = new Map<string, string>();
  const compact = (value: string): string => value.replace(/\r/g, "").replace(/\s+/g, " ").trim();
  const confirmsRead = async (path: string, command: string, output: string): Promise<boolean> => {
    // A path mention or file inventory is not a read. Require a reader and
    // matching entrypoint content in its successful output, including the body.
    if (!/(?:^|[\s'";|])(?:Get-Content|cat|sed|head|tail)\s/i.test(command)) return false;
    let source = sourceContents.get(path);
    if (source === undefined) {
      try { source = await readText(rootPath(path)); } catch { return false; }
      sourceContents.set(path, source);
    }
    const body = source.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "");
    const observed = compact(output.replace(/^\s*\d+[:|]\s?/gm, ""));
    return observed.includes(compact(source).slice(0, 256)) &&
      observed.includes(compact(body).slice(0, 160));
  };
  let threadId = "";
  let terminalEvent = timedOut ? "timeout" : "";
  let usage: JsonObject = {};
  for (const event of events) {
    eventTypes.push(String(event.type ?? ""));
    if (event.type === "thread.started") threadId = String(event.thread_id ?? "");
    if (event.type === "turn.completed" || event.type === "turn.failed") {
      terminalEvent = event.type;
      if (event.usage && typeof event.usage === "object") usage = event.usage;
    }
    if (event.type === "error") errors.push(String(event.message ?? ""));
    const item = event.item;
    if (!item || typeof item !== "object") continue;
    if (item.type === "command_execution" && event.type === "item.completed") {
      const command = String(item.command ?? "");
      commands.push({
        command,
        status: item.status,
        exit_code: item.exit_code,
        result_bytes: new TextEncoder().encode(String(item.aggregated_output ?? "")).length,
        ...classifyCommand(command),
      });
      // Source output proves exposure even when a later command in the same
      // shell group fails. An unsuccessful read without content proves nothing.
      const readCommand = ["completed", "failed"].includes(item.status)
        ? command.replace(/\\+/g, "/") : "";
      for (const match of readCommand.matchAll(/\.codex\/skills\/([a-z0-9-]+)\/SKILL\.md/g)) {
        if (await confirmsRead(match[0], readCommand, String(item.aggregated_output ?? ""))) loadedSkills.add(match[1]!);
      }
      for (const match of readCommand.matchAll(
        /\.codex\/plugins\/([a-z0-9-]+)\/skills\/([a-z0-9-]+)\/SKILL\.md/g,
      )) {
        if (await confirmsRead(match[0], readCommand, String(item.aggregated_output ?? ""))) loadedSkills.add(`${match[1]}:${match[2]}`);
      }
      for (const match of readCommand.matchAll(/\.codex\/agents\/([a-z0-9-]+)\/AGENT\.md/g)) {
        if (await confirmsRead(match[0], readCommand, String(item.aggregated_output ?? ""))) loadedRoles.add(match[1]!);
      }
    } else if (item.type === "agent_message" && event.type === "item.completed") {
      messages.push(String(item.text ?? ""));
    } else if (item.type === "error") {
      errors.push(String(item.message ?? ""));
    } else if (event.type === "item.completed") {
      const action = classifyToolAction(item);
      if (action) toolActions.push(action);
    }
  }
  const finalText = messages.at(-1) ?? "";
  let finalResponse: JsonObject | null = null;
  try {
    const parsed = JSON.parse(finalText);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) finalResponse = parsed;
  } catch {}
  return {
    scenario_id: scenario.id,
    thread_id: threadId,
    event_types: eventTypes,
    terminal_event: terminalEvent,
    commands,
    tool_actions: toolActions,
    loaded_skills: [...loadedSkills].sort(),
    loaded_roles: [...loadedRoles].sort(),
    agent_messages: messages,
    final_text: finalText,
    final_response: finalResponse,
    usage,
    errors,
    stderr_lines: stderr.split("\n").filter((line) => line.trim()),
    stdout_noise: noise,
    exit_code: exitCode,
    duration_seconds: Math.round(durationMs) / 1000,
    timed_out: timedOut,
  };
}

async function checkEligibility(
  scenario: JsonObject,
  trace: JsonObject,
  skills?: readonly string[],
): Promise<JsonObject> {
  const expected = scenario.expectation;
  const final = trace.final_response;
  const checks: JsonObject[] = [];
  const hardFailures: string[] = [];
  const check = (
    name: string,
    passed: boolean,
    evidence: unknown,
    hard = true,
  ): void => {
    checks.push({ name, passed, evidence, hard_gate: hard });
    if (hard && !passed) hardFailures.push(name);
  };
  const keys =
    final && typeof final === "object" ? new Set(Object.keys(final)) : new Set();
  let valid =
    final &&
    keys.size === REQUIRED_RESPONSE_KEYS.size &&
    [...REQUIRED_RESPONSE_KEYS].every((key) => keys.has(key));
  valid =
    valid &&
    final.scenario_id === scenario.id &&
    STATUS_VALUES.has(final.status) &&
    Array.isArray(final.supporting_skills) &&
    Array.isArray(final.rejected_skills) &&
    Array.isArray(final.evidence);
  check("output-contract", Boolean(valid), [...keys].sort());
  const primary = final?.primary_skill;
  check("primary-route", primary === expected.primary_skill, {
    actual: primary,
    expected: expected.primary_skill,
  });
  const supporting = new Set(final?.supporting_skills ?? []);
  const allowed = new Set(expected.allowed_supporting ?? []);
  const unexpected = [...supporting].filter((item) => !allowed.has(item));
  check(
    "supporting-route",
    !unexpected.length,
    { actual: [...supporting], allowed: [...allowed], unexpected },
    scenario.kind !== "agent-outcome",
  );
  const forbidden = new Set(expected.forbidden_primary ?? []);
  const anti =
    !forbidden.has(primary) &&
    (scenario.kind !== "near-miss" || primary !== scenario.target_skill);
  check("anti-trigger", anti, { actual: primary, forbidden: [...forbidden] }, scenario.kind === "near-miss");
  const loaded = new Set(trace.loaded_skills ?? []);
  const required = new Set(expected.must_load_skills ?? []);
  check(
    "required-skill-load",
    [...required].every((item) => loaded.has(item)),
    { loaded: [...loaded], required: [...required] },
  );
  const loadedRoles = new Set(trace.loaded_roles ?? []);
  const requiredRoles = new Set(expected.must_load_roles ?? []);
  if (requiredRoles.size) {
    check(
      "required-role-load",
      [...requiredRoles].every((item) => loadedRoles.has(item)),
      { loaded: [...loadedRoles], required: [...requiredRoles] },
    );
  }
  const unsafe = [...(trace.commands ?? []), ...(trace.tool_actions ?? [])].filter(
    (item: JsonObject) =>
      item.mutation || item.network || item.delegation || item.unknown,
  );
  check("read-only-safety", !unsafe.length, unsafe);
  check(
    "trace-integrity",
    Boolean(trace.thread_id) &&
      trace.event_types?.includes("thread.started") &&
      trace.terminal_event === "turn.completed" &&
      trace.exit_code === 0 &&
      !trace.timed_out,
    {
      thread_id: trace.thread_id,
      terminal_event: trace.terminal_event,
      exit_code: trace.exit_code,
    },
  );
  const statuses =
    scenario.kind === "missing-precondition"
      ? new Set(["BLOCKED", "GAP"])
      : new Set(expected.status_any ?? []);
  check("status-contract", statuses.has(final?.status), {
    actual: final?.status,
    allowed: [...statuses],
  });
  check("source-evidence", Array.isArray(final?.evidence) && final.evidence.length > 0, final?.evidence ?? []);
  const evidencePaths = new Set(
    (final?.evidence ?? []).map((item: JsonObject) => String(item.path ?? "")),
  );
  const requiredEvidencePaths = expected.required_evidence_paths ?? [];
  if (requiredEvidencePaths.length) {
    check(
      "required-context-evidence",
      requiredEvidencePaths.every((path: string) => evidencePaths.has(path)),
      {
        actual: [...evidencePaths].sort(),
        required: requiredEvidencePaths,
        missing: requiredEvidencePaths.filter((path: string) => !evidencePaths.has(path)),
      },
    );
  }
  for (const [name, actual, maximum] of [
    ["skill-context-budget", loaded.size, expected.max_loaded_skills],
    ["role-context-budget", loadedRoles.size, expected.max_loaded_roles],
    ["command-budget", (trace.commands ?? []).length, expected.max_commands],
    ["output-detail-budget", String(trace.final_text ?? "").length, expected.max_output_chars],
  ] as [string, number, number | undefined][]) {
    if (maximum !== undefined) check(name, actual <= maximum, { actual, maximum }, false);
  }
  if (expected.next_route) {
    check(
      "handoff-route",
      handoffMatches(final?.next_route, primary, expected.next_route, skills ?? await knownSkills()),
      { actual: final?.next_route, expected: expected.next_route },
    );
  }
  const environmentFailure =
    trace.timed_out ||
    ![0, null, undefined].includes(trace.exit_code) ||
    trace.terminal_event === "turn.failed" ||
    [...(trace.errors ?? []), ...(trace.stderr_lines ?? [])].some((line) =>
      /failed to spawn|requires a newer version|model .+ (?:is not supported|was not found)|authentication (?:failed|required)|code.mode (?:host is disabled|is unavailable)|CreateProcess.*Rejected.*blocked by policy/i.test(
        line,
      ),
    );
  return {
    scenario_id: scenario.id,
    verdict: hardFailures.length ? (environmentFailure ? "BLOCKED" : "FAIL") : "PASS",
    failure_class: hardFailures.length ? (environmentFailure ? "environment" : "target-behavior") : "",
    hard_failures: hardFailures,
    checks,
  };
}

function codexCommand(model: string, effort: string, prompt: string, schema: string, platform = process.platform): string[] {
  return [
    "codex",
    "exec",
    "--ephemeral",
    "--ignore-user-config",
    // Ignoring user config also removes the Windows sandbox implementation.
    // Select the supported restricted implementation; retain read-only policy.
    ...(platform === "win32" ? ["-c", 'windows.sandbox="unelevated"'] : []),
    "--json",
    "--disable",
    "plugins",
    "--disable",
    "apps",
    "--disable",
    "browser_use",
    "--disable",
    "computer_use",
    "--disable",
    "image_generation",
    "--enable",
    "code_mode_host",
    "--disable",
    "multi_agent",
    "-m",
    model,
    "-c",
    `model_reasoning_effort="${effort}"`,
    "-s",
    "read-only",
    "-C",
    ROOT,
    "--output-schema",
    schema,
    prompt,
  ];
}

export async function validateJudgment(
  judgment: JsonObject,
  profile: JsonObject,
  definition: JsonObject,
  runId: string,
  scenarioId: string,
  repetitions = 1,
): Promise<JsonObject> {
  const errors: string[] = [];
  for (const [key, expected] of [
    ["run_id", runId],
    ["scenario_id", scenarioId],
    ["judge_profile_id", profile.id],
    ["judge_type", profile.judge_type],
    ["rubric_id", definition.rubric_id],
    ["rubric_version", definition.version],
  ]) {
    if (judgment[key] !== expected) errors.push(`${key}-mismatch`);
  }
  const scored = scoreRatings({ dimensions: definition.dimensions, ratings: judgment.dimensions, threshold: definition.pass_threshold / 100, minimumDimension: definition.minimum_dimension_score });
  if (!scored.valid) errors.push(scored.error);
  const score = scored.valid ? Math.round(scored.score * 10000) / 100 : 0;
  const minimum = scored.valid ? scored.minimum_dimension_score : 0;
  const threshold = scored.valid && scored.verdict === "PASS";
  if ((judgment.verdict === "PASS") !== threshold) errors.push("verdict-score-disagreement");
  if (judgment.root_cause === "model-variance" && repetitions < 2) {
    errors.push("model-variance-requires-repeated-run");
  }
  return {
    ...judgment,
    computed_score: score,
    minimum_dimension_score: minimum,
    pass_threshold: definition.pass_threshold,
    required_minimum_dimension_score: definition.minimum_dimension_score,
    validation_errors: errors,
    accepted: !errors.length && judgment.verdict === "PASS" && threshold,
  };
}

function acceptedCandidate(
  eligibility: JsonObject,
  judgments: Record<string, JsonObject>,
  required: readonly JsonObject[],
): [boolean, string] {
  if (eligibility.verdict !== "PASS") return [false, "eligibility-not-pass"];
  for (const profile of required) {
    const judgment = judgments[profile.id];
    if (!judgment) return [false, `missing-judge:${profile.id}`];
    if (judgment.accepted !== true) return [false, `judge-not-accepted:${profile.id}`];
  }
  return [true, "accepted"];
}

async function runtimeAudit(findings: JsonObject[]): Promise<JsonObject> {
  const runtime: JsonObject = {};
  const version = await runCommand(["codex", "--version"], { timeoutMs: 15_000 });
  if (version.exitCode !== 0) {
    findings.push({
      severity: "P1",
      category: "environment",
      message: "Codex CLI is unavailable for live harness experiments",
      evidence: version.stderr,
      remediation: "Install or expose a supported Codex CLI.",
    });
    return runtime;
  }
  runtime.codex_version = version.stdout.trim() || version.stderr.trim();
  const doctor = await runCommand(["codex", "doctor", "--json"], { timeoutMs: 45_000 });
  try {
    const data = JSON.parse(doctor.stdout);
    const config = data.checks?.["config.load"]?.details ?? {};
    runtime.configured_model = config.model;
    runtime.startup_warnings = config["startup warning"] ?? [];
  } catch {
    findings.push({
      severity: "P2",
      category: "environment",
      message: "Codex doctor output could not be evaluated",
      evidence: doctor.stderr || doctor.stdout,
      remediation: "Run codex doctor --json directly.",
    });
  }
  const models = await runCommand(["codex", "debug", "models"], { timeoutMs: 45_000 });
  try {
    const slugs = new Set(JSON.parse(models.stdout).models.map((item: JsonObject) => item.slug));
    const missing = [...new Set([PLANNING_MODEL, EXECUTION_MODEL, JUDGE_MODEL])].filter(
      (item) => !slugs.has(item),
    );
    runtime.available_model_count = slugs.size;
    runtime.required_models = [...new Set([PLANNING_MODEL, EXECUTION_MODEL, JUDGE_MODEL])].sort();
    runtime.missing_required_models = missing;
    if (missing.length) {
      findings.push({
        severity: "P1",
        category: "environment",
        message: "Pinned harness models are absent",
        evidence: missing,
        remediation: "Update Codex or change the pinned model contract.",
      });
    }
  } catch {
    findings.push({
      severity: "P2",
      category: "environment",
      message: "Codex model catalog could not be evaluated",
      evidence: models.stderr || models.stdout,
      remediation: "Run codex debug models directly.",
    });
  }
  return runtime;
}

async function commandCatalog(args: ReturnType<typeof parseArgs>): Promise<number> {
  const generated = await generateCatalog();
  if (boolFlag(args, "write")) {
    await writeJson(CATALOG_PATH, generated);
    console.log(
      `catalog_written=${rel(CATALOG_PATH)} skills=${generated.skill_count} scenarios=${generated.scenario_count} digest=${generated.catalog_digest}`,
    );
    return 0;
  }
  const current = (await isFile(CATALOG_PATH)) ? await readJson(CATALOG_PATH) : null;
  if (stableJson(current) !== stableJson(generated)) {
    console.error("ERROR: generated harness scenario catalog is stale");
    console.error("repair=bun scripts/cascade.ts eval catalog --write");
    return 1;
  }
  console.log(
    `catalog_status=PASS skills=${generated.skill_count} scenarios=${generated.scenario_count} digest=${generated.catalog_digest}`,
  );
  return 0;
}

async function commandAudit(args: ReturnType<typeof parseArgs>): Promise<number> {
  const findings: JsonObject[] = [];
  const skills = await skillPaths();
  const agents = await agentPaths();
  for (const [skill, path] of skills) {
    const frontmatter = parseFrontmatter(await readText(path));
    if (frontmatter.name !== skill || !frontmatter.description) {
      findings.push({
        severity: "P0",
        category: "skill-contract",
        message: `Invalid skill frontmatter: ${skill}`,
        evidence: rel(path),
        remediation: "Align name and add a trigger-focused description.",
      });
    }
  }
  const catalog = await generateCatalog();
  const runtime = boolFlag(args, "runtime") ? await runtimeAudit(findings) : {};
  const counts = Object.fromEntries(
    ["P0", "P1", "P2", "P3"].map((severity) => [
      severity,
      findings.filter((item) => item.severity === severity).length,
    ]),
  );
  const audit = {
    schema_version: 1,
    generated_at: utcNow(),
    status: findings.length ? "FAIL" : "PASS",
    skills: skills.size,
    agents: agents.size,
    scenarios: catalog.scenario_count,
    agent_outcomes: catalog.agent_scenario_count,
    product_bound_outcomes: catalog.scenarios.filter(
      (scenario: JsonObject) =>
        scenario.kind === "agent-outcome" && scenario.product_context_required === true,
    ).length,
    catalog_digest: catalog.catalog_digest,
    finding_counts: counts,
    findings,
    runtime,
  };
  const output = flag(args, "output");
  if (output) {
    await writeJson(rootPath(output), audit);
    console.log(`audit_written=${output} status=${audit.status}`);
  } else console.log(JSON.stringify(audit, null, 2));
  return findings.length && !boolFlag(args, "allow-findings") ? 1 : 0;
}

function selectScenarios(catalog: JsonObject, args: ReturnType<typeof parseArgs>): JsonObject[] {
  let selected = [...catalog.scenarios];
  const scenarios = new Set(flags(args, "scenario"));
  const skills = new Set(flags(args, "skill"));
  const kinds = new Set(flags(args, "case-kind"));
  const agents = new Set(flags(args, "agent"));
  if (scenarios.size) selected = selected.filter((item) => scenarios.has(item.id));
  if (skills.size) selected = selected.filter((item) => skills.has(item.target_skill));
  if (kinds.size) selected = selected.filter((item) => kinds.has(item.kind));
  if (agents.size) selected = selected.filter((item) => agents.has(item.owner));
  const limit = Number(flag(args, "limit"));
  return Number.isFinite(limit) && limit > 0 ? selected.slice(0, limit) : selected;
}

function scenarioExecution(
  scenario: JsonObject,
  args: ReturnType<typeof parseArgs>,
): JsonObject {
  const explicitModel = flag(args, "model") ?? Bun.env.CASCADE_EVAL_CODEX_MODEL;
  const explicitProfile = flag(args, "model-profile");
  const model = explicitModel
    ?? (explicitProfile === "planning" ? PLANNING_MODEL : undefined)
    ?? (explicitProfile === "execution" ? EXECUTION_MODEL : undefined)
    ?? scenario.execution?.model
    ?? EXECUTION_MODEL;
  return {
    model,
    reasoning_effort:
      flag(args, "reasoning-effort") ?? scenario.execution?.reasoning_effort ?? "high",
    model_profile: explicitModel
      ? "custom"
      : explicitProfile ?? (scenario.execution?.model ? "agent-contract" : "execution"),
  };
}

async function commandRun(args: ReturnType<typeof parseArgs>): Promise<number> {
  const expected = await generateCatalog();
  const current = await readJson<JsonObject>(CATALOG_PATH);
  if (stableJson(expected) !== stableJson(current)) {
    throw new CascadeError("generated catalog is stale; run eval catalog --write");
  }
  const selected = selectScenarios(current, args);
  if (!selected.length) throw new CascadeError("no scenarios matched");
  const skills = selected.some((scenario) => scenario.expectation.next_route) ? await knownSkills() : [];
  const repetitions = Number(flag(args, "repetitions", "1"));
  const timeout = Number(flag(args, "timeout", "180")) * 1000;
  const runId =
    flag(args, "run-id") ??
    new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const runRoot = resolve(ARTIFACT_ROOT, runId);
  if (await exists(runRoot)) throw new CascadeError(`run directory exists: ${rel(runRoot)}`);
  await mkdir(runRoot, { recursive: true });
  const manifest = await harnessSourceManifest();
  const executionBindings = selected.map((scenario) => ({
    scenario_id: scenario.id,
    ...scenarioExecution(scenario, args),
  }));
  const uniform = (key: string): string => {
    const values = [...new Set(executionBindings.map((item) => String(item[key])))];
    return values.length === 1 ? values[0]! : "scenario-bound";
  };
  const metadata = {
    run_id: runId,
    started_at: utcNow(),
    catalog_digest: current.catalog_digest,
    harness_source_digest: manifest.digest,
    model: uniform("model"),
    model_profile: uniform("model_profile"),
    reasoning_effort: uniform("reasoning_effort"),
    execution_bindings: executionBindings,
    sandbox: "read-only",
    timeout_seconds: timeout / 1000,
    repetitions,
    scenario_ids: selected.map((item) => item.id),
    runner: "scripts/cascade/evals.ts",
  };
  await Promise.all([
    writeJson(resolve(runRoot, "run.json"), metadata),
    writeJson(resolve(runRoot, "source-manifest.json"), manifest),
    writeJson(resolve(runRoot, "selected-scenarios.json"), selected),
  ]);
  const eligibilities: JsonObject[] = [];
  let counter = 0;
  for (const scenario of selected) {
    const execution = scenarioExecution(scenario, args);
    for (let repetition = 1; repetition <= repetitions; repetition += 1) {
      counter += 1;
      const caseName =
        repetitions > 1 ? `${scenario.id}-r${String(repetition).padStart(2, "0")}` : scenario.id;
      const caseRoot = resolve(runRoot, "cases", caseName);
      await mkdir(caseRoot, { recursive: true });
      const prompt = targetPrompt(scenario);
      await writeFile(resolve(caseRoot, "prompt.txt"), prompt, "utf8");
      const command = codexCommand(
        execution.model,
        execution.reasoning_effort,
        prompt,
        OUTPUT_SCHEMA,
      );
      await writeJson(resolve(caseRoot, "command.json"), {
        argv: [...command.slice(0, -1), "<prompt-in-prompt.txt>"],
        replay: `bun scripts/cascade.ts eval run --scenario ${scenario.id} --model ${execution.model} --reasoning-effort ${execution.reasoning_effort}`,
      });
      console.log(`[${counter}/${selected.length * repetitions}] running ${caseName}`);
      const result = await runCommand(command, {
        env: { NO_COLOR: "1", TERM: "xterm-256color" },
        timeoutMs: timeout,
      });
      await Promise.all([
        writeFile(resolve(caseRoot, "stdout.jsonl"), result.stdout, "utf8"),
        writeFile(resolve(caseRoot, "stderr.log"), result.stderr, "utf8"),
      ]);
      const trace = await normalizeTrace(
        scenario,
        result.stdout,
        result.stderr,
        result.exitCode,
        result.durationMs,
        result.timedOut,
      );
      const eligibility = await checkEligibility(scenario, trace, skills);
      eligibility.case_dir = rel(caseRoot);
      await Promise.all([
        writeJson(resolve(caseRoot, "normalized.json"), trace),
        writeJson(resolve(caseRoot, "eligibility.json"), eligibility),
      ]);
      eligibilities.push(eligibility);
      console.log(`[${counter}] ${caseName} eligibility=${eligibility.verdict}`);
    }
  }
  const summary = {
    ...metadata,
    completed_at: utcNow(),
    eligibilities,
  };
  await writeJson(resolve(runRoot, "summary.json"), summary);
  console.log(`run_dir=${rel(runRoot)}`);
  return eligibilities.some((item) => item.verdict !== "PASS") ? 1 : 0;
}

async function commandEvaluate(args: ReturnType<typeof parseArgs>): Promise<number> {
  const runRoot = resolve(ROOT, flag(args, "run-dir") ?? "");
  const selected = await readJson<JsonObject[]>(resolve(runRoot, "selected-scenarios.json"));
  const skills = selected.some((scenario) => scenario.expectation.next_route) ? await knownSkills() : [];
  const scenarioMap = new Map(selected.map((item) => [item.id, item]));
  const metadata = await readJson<JsonObject>(resolve(runRoot, "run.json"));
  const eligibilities: JsonObject[] = [];
  for (const caseName of await readdir(resolve(runRoot, "cases"))) {
    const caseRoot = resolve(runRoot, "cases", caseName);
    if (!(await isDirectory(caseRoot))) continue;
    const scenarioId = caseName.replace(/-r\d{2}$/, "");
    const scenario = scenarioMap.get(scenarioId);
    if (!scenario) continue;
    const command = await readJson<JsonObject>(resolve(caseRoot, "command.json"));
    const stdout = await readText(resolve(caseRoot, "stdout.jsonl"));
    const stderr = await readText(resolve(caseRoot, "stderr.log"));
    const prior = await readJson<JsonObject>(resolve(caseRoot, "normalized.json"));
    const trace = await normalizeTrace(
      scenario,
      stdout,
      stderr,
      prior.exit_code,
      Number(prior.duration_seconds ?? 0) * 1000,
      prior.timed_out,
    );
    const eligibility = await checkEligibility(scenario, trace, skills);
    eligibility.case_dir = rel(caseRoot);
    eligibility.replay = command.replay;
    await Promise.all([
      writeJson(resolve(caseRoot, "normalized.json"), trace),
      writeJson(resolve(caseRoot, "eligibility.json"), eligibility),
    ]);
    eligibilities.push(eligibility);
  }
  await writeJson(resolve(runRoot, "summary.json"), {
    ...metadata,
    completed_at: utcNow(),
    eligibilities,
  });
  console.log(`evaluate_status=PASS cases=${eligibilities.length}`);
  return 0;
}

function judgePrompt(
  runRoot: string,
  caseName: string,
  scenario: JsonObject,
  profile: JsonObject,
  definition: JsonObject,
): string {
  return `You are an independent ${profile.judge_type} judge for a completed Cascade harness run.

Load .codex/plugins/cascade-evals/skills/harness-evaluation/SKILL.md and its references/judge-profile.md. No registered host evaluator role is required.
Evaluate only the completed evidence packet. Do not execute the target, edit files,
use the network, or delegate. Return only JSON matching the judgment schema.

Run ID: ${basename(runRoot)}
Scenario ID: ${scenario.id}
Case name: ${caseName}
Judge profile: ${profile.id}

Rubric:
${JSON.stringify(definition, null, 2)}

Evidence:
- ${rel(resolve(runRoot, "run.json"))}
- ${rel(resolve(runRoot, "selected-scenarios.json"))}
- ${rel(resolve(runRoot, "cases", caseName, "prompt.txt"))}
- ${rel(resolve(runRoot, "cases", caseName, "stdout.jsonl"))}
- ${rel(resolve(runRoot, "cases", caseName, "normalized.json"))}
`;
}

async function recordedTrace(path: string, scenario: JsonObject): Promise<JsonObject> {
  const prior = await readJson<JsonObject>(resolve(path, "normalized.json"));
  const trace = await normalizeTrace(scenario, await readText(resolve(path, "stdout.jsonl")),
    await readText(resolve(path, "stderr.log")), prior.exit_code,
    Number(prior.duration_seconds) * 1000, prior.timed_out);
  if (stableJson(trace) !== stableJson(prior)) throw new CascadeError(`raw trace differs from normalization: ${rel(path)}`);
  return trace;
}

async function packetDigest(path: string): Promise<string> {
  const files = ["prompt.txt", "command.json", "stdout.jsonl", "stderr.log", "normalized.json"];
  return valueDigest(await Promise.all(files.map(async (name) => ({ name, sha256: await sha256File(resolve(path, name)) }))));
}

async function recordedTarget(runRoot: string, caseName: string, scenario: JsonObject, metadata: JsonObject): Promise<JsonObject> {
  if (caseName !== basename(caseName)) throw new CascadeError("invalid evaluation case name");
  const path = resolve(runRoot, "cases", caseName);
  const execution = metadata.execution_bindings?.find((item: JsonObject) => item.scenario_id === scenario.id);
  const expected = scenarioExecution(scenario, parseArgs([]));
  if (!execution || execution.model !== expected.model || execution.reasoning_effort !== expected.reasoning_effort || metadata.sandbox !== "read-only") {
    throw new CascadeError("target execution differs from the current scenario model/sandbox policy");
  }
  const prompt = targetPrompt(scenario);
  if (await readText(resolve(path, "prompt.txt")) !== prompt) throw new CascadeError("target prompt differs from frozen scenario");
  const command = codexCommand(execution.model, execution.reasoning_effort, "<prompt-in-prompt.txt>", OUTPUT_SCHEMA);
  if (stableJson((await readJson<JsonObject>(resolve(path, "command.json"))).argv) !== stableJson(command)) throw new CascadeError("target command differs from frozen execution policy");
  const trace = await recordedTrace(path, scenario);
  const eligibility = await checkEligibility(scenario, trace);
  eligibility.case_dir = rel(path);
  return { trace, eligibility, digest: await packetDigest(path) };
}

async function recordedJudgments(runRoot: string, caseName: string, scenario: JsonObject, metadata: JsonObject,
  target: JsonObject, required: JsonObject[]): Promise<JsonObject[]> {
  const results: JsonObject[] = [];
  const threads = new Set([target.trace.thread_id]);
  for (const profile of required) {
    const path = resolve(runRoot, "judgments", caseName, profile.id);
    if (!(await exists(path))) continue;
    const stored = await readJson<JsonObject>(resolve(path, "judgment.json"));
    const definition = await rubric(profile);
    const prompt = judgePrompt(runRoot, caseName, scenario, profile, definition);
    if (stored.target_evidence_digest !== target.digest || await readText(resolve(path, "prompt.txt")) !== prompt) {
      throw new CascadeError(`judge evidence binding differs: ${caseName}/${profile.id}`);
    }
    const command = codexCommand(JUDGE_MODEL, profile.reasoning_effort, "<prompt-in-prompt.txt>", JUDGE_SCHEMA);
    if (stableJson((await readJson<JsonObject>(resolve(path, "command.json"))).argv) !== stableJson(command)) throw new CascadeError("judge command differs from pinned policy");
    const trace = await recordedTrace(path, { id: `JUDGE-${scenario.id}` });
    const unsafe = [...trace.commands, ...trace.tool_actions].some((item: JsonObject) => item.mutation || item.network || item.delegation || item.unknown);
    if (!trace.thread_id || threads.has(trace.thread_id) || trace.terminal_event !== "turn.completed" || trace.exit_code !== 0 || trace.timed_out || unsafe || !trace.loaded_skills.includes("cascade-evals:harness-evaluation")) {
      throw new CascadeError(`judge trace is incomplete, unsafe or not independent: ${caseName}/${profile.id}`);
    }
    threads.add(trace.thread_id);
    assertJsonSchema(trace.final_response, await readJson<JsonObject>(JUDGE_SCHEMA), "judge response");
    const validated = await validateJudgment(trace.final_response, profile, definition, metadata.run_id, scenario.id, metadata.repetitions);
    validated.case_name = caseName;
    validated.target_evidence_digest = target.digest;
    if (stableJson(validated) !== stableJson(stored)) throw new CascadeError(`judge receipt differs from raw result: ${caseName}/${profile.id}`);
    results.push(validated);
  }
  return results;
}

async function commandJudge(args: ReturnType<typeof parseArgs>): Promise<number> {
  const requested = new Set(flags(args, "judge-profile"));
  const required = await requiredProfiles();
  if (!required.length || [...requested].some((id) => !required.some((profile) => profile.id === id))) {
    throw new CascadeError("unknown or empty required judge profile selection");
  }
  if ((flag(args, "model") && flag(args, "model") !== JUDGE_MODEL) ||
    (flag(args, "reasoning-effort") && required.some((profile) => flag(args, "reasoning-effort") !== profile.reasoning_effort))) {
    throw new CascadeError("judge overrides must match the pinned independent-judge policy");
  }
  const runRoot = boundedPath(flag(args, "run-dir") ?? "");
  const metadata = await readJson<JsonObject>(resolve(runRoot, "run.json"));
  if (metadata.harness_source_digest !== (await harnessSourceManifest()).digest) throw new CascadeError("judge run sources are stale");
  const selected = await readJson<JsonObject[]>(resolve(runRoot, "selected-scenarios.json"));
  const scenarioMap = new Map(selected.map((item) => [item.id, item]));
  const summary = await readJson<JsonObject>(resolve(runRoot, "summary.json"));
  const definitions = await Promise.all(required.filter((profile) => !requested.size || requested.has(profile.id))
    .map(async (profile) => ({ profile, definition: await rubric(profile) })));
  const targets: JsonObject[] = [];
  for (const item of summary.eligibilities ?? []) {
    const scenario = scenarioMap.get(item.scenario_id);
    if (!scenario) throw new CascadeError("unknown scenario in target summary");
    const caseName = basename(item.case_dir);
    const target = await recordedTarget(runRoot, caseName, scenario, metadata);
    if (target.eligibility.verdict === "PASS") targets.push({ scenario, caseName, target });
  }
  if (!targets.length) throw new CascadeError("no mechanically eligible targets; judging was not run");
  // One writer per run. Separate profile invocations resume validated results,
  // and cannot overwrite each other's aggregate or launch duplicate judges.
  const lock = resolve(runRoot, ".judge-lock");
  await mkdir(lock);
  try {
    const judgments: JsonObject[] = [];
    for (const { scenario, caseName, target } of targets) {
      await recordedJudgments(runRoot, caseName, scenario, metadata, target, required);
      for (const { profile, definition } of definitions) {
        const outputRoot = resolve(runRoot, "judgments", caseName, profile.id);
        if (await exists(outputRoot)) continue;
        await mkdir(outputRoot, { recursive: true });
        const prompt = judgePrompt(runRoot, caseName, scenario, profile, definition);
        await writeFile(resolve(outputRoot, "prompt.txt"), prompt, "utf8");
        const command = codexCommand(JUDGE_MODEL, profile.reasoning_effort, prompt, JUDGE_SCHEMA);
        await writeJson(resolve(outputRoot, "command.json"), { argv: [...command.slice(0, -1), "<prompt-in-prompt.txt>"] });
        const result = await runCommand(command, { timeoutMs: Number(flag(args, "timeout", "300")) * 1000, env: { NO_COLOR: "1", TERM: "xterm-256color" } });
        await Promise.all([
          writeFile(resolve(outputRoot, "stdout.jsonl"), result.stdout, "utf8"),
          writeFile(resolve(outputRoot, "stderr.log"), result.stderr, "utf8"),
        ]);
        const trace = await normalizeTrace({ id: `JUDGE-${scenario.id}` }, result.stdout, result.stderr, result.exitCode, result.durationMs, result.timedOut);
        await writeJson(resolve(outputRoot, "normalized.json"), trace);
        const validated = await validateJudgment(trace.final_response ?? {}, profile, definition, metadata.run_id, scenario.id, metadata.repetitions);
        validated.case_name = caseName;
        validated.target_evidence_digest = target.digest;
        await writeJson(resolve(outputRoot, "judgment.json"), validated);
      }
      // Reduce every stored profile from raw evidence, never just this invocation.
      judgments.push(...await recordedJudgments(runRoot, caseName, scenario, metadata, target, required));
    }
    if (metadata.harness_source_digest !== (await harnessSourceManifest()).digest) throw new CascadeError("sources changed during judging");
    const complete = judgments.length === targets.length * required.length;
    const accepted = judgments.length > 0 && judgments.every((item) => item.accepted === true);
    await writeJsonAtomic(resolve(runRoot, "judgments", "summary.json"), { run_id: metadata.run_id, judgments });
    const status = !accepted ? "FAIL" : complete ? "PASS" : "INCOMPLETE";
    console.log(`judge_status=${status} judgments=${judgments.length}`);
    return accepted && complete ? 0 : 1;
  } finally {
    await rmdir(lock);
  }
}

async function commandCoverage(args: ReturnType<typeof parseArgs>): Promise<number> {
  const catalog = await generateCatalog();
  const manifest = await harnessSourceManifest();
  const required = await requiredProfiles();
  if (!required.length) throw new CascadeError("required judge profiles are empty");
  const rows = new Map(
    catalog.scenarios.map((scenario: JsonObject) => [
      scenario.id,
      { scenario_id: scenario.id, executed: false, covered: false, candidates: [] as JsonObject[] },
    ]),
  );
  const currentScenarios = new Map(
    catalog.scenarios.map((scenario: JsonObject) => [scenario.id, scenario]),
  );
  if (await isDirectory(ARTIFACT_ROOT)) {
    for (const name of await readdir(ARTIFACT_ROOT)) {
      const runRoot = resolve(ARTIFACT_ROOT, name);
      if (!(await isDirectory(runRoot))) continue;
      try {
        const metadata = await readJson<JsonObject>(resolve(runRoot, "run.json"));
        const source = await readJson<JsonObject>(resolve(runRoot, "source-manifest.json"));
        const summary = await readJson<JsonObject>(resolve(runRoot, "summary.json"));
        const selected = await readJson<JsonObject[]>(resolve(runRoot, "selected-scenarios.json"));
        const selectedScenarios = new Map(selected.map((scenario) => [scenario.id, scenario]));
        if (source.digest !== manifest.digest || metadata.harness_source_digest !== manifest.digest) continue;
        for (const eligibility of summary.eligibilities ?? []) {
          const row = rows.get(eligibility.scenario_id);
          if (!row) continue;
          const recordedScenario = selectedScenarios.get(eligibility.scenario_id);
          const currentScenario = currentScenarios.get(eligibility.scenario_id);
          if (
            !recordedScenario ||
            !currentScenario ||
            stableJson(recordedScenario) !== stableJson(currentScenario)
          ) {
            row.candidates.push({
              run_id: metadata.run_id,
              accepted: false,
              acceptance: "scenario-definition-stale",
            });
            continue;
          }
          try {
            const caseName = basename(eligibility.case_dir);
            const target = await recordedTarget(runRoot, caseName, currentScenario, metadata);
            row.executed ||= target.trace.terminal_event === "turn.completed" && !target.trace.timed_out;
            const rawJudgments = await recordedJudgments(runRoot, caseName, currentScenario, metadata, target, required);
            const judgments = Object.fromEntries(rawJudgments.map((item) => [item.judge_profile_id, item]));
            const [accepted, acceptance] = acceptedCandidate(target.eligibility, judgments, required);
            row.covered ||= accepted;
            row.candidates.push({ run_id: metadata.run_id, accepted, acceptance });
          } catch (error) {
            row.candidates.push({ run_id: metadata.run_id, accepted: false, acceptance: `invalid-evidence: ${String(error)}` });
          }
        }
      } catch {}
    }
  }
  const values = [...rows.values()];
  const missing = values.filter((item) => !item.covered).map((item) => item.scenario_id);
  const output = rootPath(
    flag(args, "output", ".artifacts/harness-evals/coverage-current.json")!,
  );
  const result = {
    schema_version: 1,
    generated_at: utcNow(),
    catalog_digest: catalog.catalog_digest,
    harness_source_digest: manifest.digest,
    total: values.length,
    executed: values.filter((item) => item.executed).length,
    covered: values.filter((item) => item.covered).length,
    missing: missing.length,
    missing_ids: missing,
    scenarios: values,
  };
  await writeJson(output, result);
  console.log(
    `executed=${result.executed}/${result.total} accepted=${result.covered}/${result.total} missing=${result.missing} output=${rel(output)}`,
  );
  if (boolFlag(args, "list-missing")) for (const id of missing) console.log(id);
  return missing.length && !boolFlag(args, "allow-incomplete") ? 1 : 0;
}

function syntheticTrace(
  scenario: JsonObject,
  primary: string,
  loaded: string[],
  options: {
    supporting?: string[];
    mutation?: boolean;
    toolActions?: JsonObject[];
    terminal?: string;
    loadedRoles?: string[];
    evidencePaths?: string[];
    commandCount?: number;
    decision?: string;
  } = {},
): JsonObject {
  const final = {
    scenario_id: scenario.id,
    primary_skill: primary,
    supporting_skills: options.supporting ?? [],
    rejected_skills: [],
    status: "PASS",
    decision: options.decision ?? "Synthetic decision.",
    evidence: (options.evidencePaths ?? ["CODEX.md"]).map((path) => ({
      path,
      observation: "Synthetic evidence.",
    })),
    actions: [],
    missing_context: [],
    next_route: scenario.expectation.next_route,
  };
  const terminal = options.terminal ?? "turn.completed";
  const commands = Array.from({ length: options.commandCount ?? 1 }, (_, index) => ({
    command: options.mutation && index === 0 ? "apply_patch" : "sed -n 1,80p SKILL.md",
    mutation: options.mutation === true && index === 0,
    network: false,
    delegation: false,
  }));
  return {
    scenario_id: scenario.id,
    thread_id: "synthetic-thread",
    event_types: ["thread.started", terminal],
    terminal_event: terminal,
    commands,
    tool_actions: options.toolActions ?? [],
    loaded_skills: loaded,
    loaded_roles: options.loadedRoles ?? [],
    final_text: JSON.stringify(final),
    final_response: final,
    exit_code: terminal === "turn.completed" ? 0 : 1,
    timed_out: false,
    errors: [],
    stderr_lines: [],
  };
}

// Frozen synthetic packets exercise the real judge lifecycle without a model call.
async function judgeLifecycleSelfTest(scenario: JsonObject, required: JsonObject[]): Promise<[boolean, string][]> {
  const parent = rootPath(".artifacts/eval-fixtures");
  await mkdir(parent, { recursive: true });
  const runRoot = await mkdtemp(resolve(parent, "judge-lifecycle-"));
  const assertions: [boolean, string][] = [];
  const rejects = async (action: () => Promise<unknown>): Promise<boolean> => {
    try { await action(); return false; } catch { return true; }
  };
  try {
    const execution = scenarioExecution(scenario, parseArgs([]));
    const metadata = { run_id: basename(runRoot), repetitions: 1, sandbox: "read-only",
      harness_source_digest: (await harnessSourceManifest()).digest,
      execution_bindings: [{ scenario_id: scenario.id, ...execution }] };
    const caseName = scenario.id;
    const casePath = resolve(runRoot, "cases", caseName);
    const makeTrace = async (path: string, id: string, thread: string, final: JsonObject, skillPath: string) => {
      const stdout = [
        { type: "thread.started", thread_id: thread },
        { type: "item.completed", item: { type: "command_execution", command: `cat ${skillPath}`, status: "completed", exit_code: 0, aggregated_output: await readText(rootPath(skillPath)) } },
        { type: "item.completed", item: { type: "agent_message", text: JSON.stringify(final) } },
        { type: "turn.completed", usage: {} },
      ].map((event) => JSON.stringify(event)).join("\n");
      await mkdir(path, { recursive: true });
      await writeFile(resolve(path, "stdout.jsonl"), stdout);
      await writeFile(resolve(path, "stderr.log"), "");
      await writeJson(resolve(path, "normalized.json"), await normalizeTrace({ id }, stdout, "", 0, 1, false));
    };
    await makeTrace(casePath, scenario.id, "fixture-target", syntheticTrace(scenario, "context", ["context"]).final_response, ".codex/skills/context/SKILL.md");
    await writeFile(resolve(casePath, "prompt.txt"), targetPrompt(scenario));
    await writeJson(resolve(casePath, "command.json"), { argv: codexCommand(execution.model, execution.reasoning_effort, "<prompt-in-prompt.txt>", OUTPUT_SCHEMA) });
    await writeJson(resolve(runRoot, "run.json"), metadata);
    await writeJson(resolve(runRoot, "selected-scenarios.json"), [scenario]);
    await writeJson(resolve(runRoot, "summary.json"), { eligibilities: [{ scenario_id: scenario.id, verdict: "PASS", case_dir: rel(casePath) }] });
    const target = await recordedTarget(runRoot, caseName, scenario, metadata);
    const saveJudge = async (profile: JsonObject, pass = true, thread = `fixture-${profile.id}`) => {
      const definition = await rubric(profile);
      const final = { run_id: metadata.run_id, scenario_id: scenario.id, judge_profile_id: profile.id,
        judge_type: profile.judge_type, rubric_id: definition.rubric_id, rubric_version: definition.version,
        verdict: pass ? "PASS" : "FAIL", root_cause: pass ? "none" : "target-behavior", earliest_failing_event: "",
        dimensions: definition.dimensions.map((item: JsonObject) => ({ id: item.id, score: pass ? 4 : 0, rationale: "Synthetic fixture rating", evidence: [{ path: "normalized.json", observation: "Synthetic fixture" }] })),
        confidence: 1, summary: "Synthetic fixture", evidence: [], replay_command: "synthetic fixture only",
        regression_recommendation: "", residual_uncertainty: [] };
      const path = resolve(runRoot, "judgments", caseName, profile.id);
      await makeTrace(path, `JUDGE-${scenario.id}`, thread, final, ".codex/plugins/cascade-evals/skills/harness-evaluation/SKILL.md");
      await writeFile(resolve(path, "prompt.txt"), judgePrompt(runRoot, caseName, scenario, profile, definition));
      await writeJson(resolve(path, "command.json"), { argv: codexCommand(JUDGE_MODEL, profile.reasoning_effort, "<prompt-in-prompt.txt>", JUDGE_SCHEMA) });
      await writeJson(resolve(path, "judgment.json"), { ...await validateJudgment(final, profile, definition, metadata.run_id, scenario.id), case_name: caseName, target_evidence_digest: target.digest });
    };
    const invoke = (id: string) => commandJudge(parseArgs(["--run-dir", runRoot, "--judge-profile", id]));
    await saveJudge(required[0]!);
    assertions.push([await invoke(required[0]!.id) === 1, "partial judging is INCOMPLETE, never PASS"]);
    const summaryPath = resolve(runRoot, "judgments", "summary.json");
    const before = await readText(summaryPath);
    assertions.push([await rejects(() => invoke("unknown-profile")) && await readText(summaryPath) === before, "unknown profile cannot erase existing judgments"]);
    for (const profile of required.slice(1)) await saveJudge(profile);
    assertions.push([await invoke(required.at(-1)!.id) === 0 && (await readJson<JsonObject>(summaryPath)).judgments.length === required.length, "separate profile runs preserve the complete aggregate"]);
    await mkdir(resolve(runRoot, ".judge-lock"));
    assertions.push([await rejects(() => invoke(required[0]!.id)), "concurrent judge writer cannot overwrite a run"]);
    await rmdir(resolve(runRoot, ".judge-lock"));
    await saveJudge(required[0]!, false);
    assertions.push([await invoke(required[0]!.id) === 1, "failed semantic judgments never produce a passing command"]);
    await saveJudge(required[0]!, true, "fixture-target");
    assertions.push([await rejects(() => invoke(required[0]!.id)), "judge cannot reuse the target context"]);
    await saveJudge(required[0]!);
    const receiptPath = resolve(runRoot, "judgments", caseName, required[0]!.id, "judgment.json");
    const receipt = await readJson<JsonObject>(receiptPath);
    await writeJson(receiptPath, { ...receipt, computed_score: 1 });
    assertions.push([await rejects(() => recordedJudgments(runRoot, caseName, scenario, metadata, target, required)), "changed score receipt is rejected against raw judge output"]);
    await saveJudge(required[0]!);
    const stdoutPath = resolve(casePath, "stdout.jsonl");
    const original = await readText(stdoutPath);
    await writeFile(stdoutPath, "");
    assertions.push([await rejects(() => recordedTarget(runRoot, caseName, scenario, metadata)), "missing raw target evidence cannot be replaced by cached PASS flags"]);
    await writeFile(stdoutPath, original);
    const priorSummary = await readText(summaryPath);
    await writeJson(resolve(runRoot, "summary.json"), { eligibilities: [] });
    assertions.push([await rejects(() => invoke(required[0]!.id)) && await readText(summaryPath) === priorSummary, "zero eligible targets cannot pass or erase prior results"]);
    await rm(resolve(runRoot, "judgments", caseName, required[0]!.id, "stdout.jsonl"));
    assertions.push([await rejects(() => recordedJudgments(runRoot, caseName, scenario, metadata, target, required)), "missing raw judge evidence cannot establish coverage"]);
    return assertions;
  } finally {
    // Only the freshly created, bounded fixture directory is disposable.
    boundedPath(runRoot, ".artifacts/eval-fixtures/judge-lifecycle-");
    await rm(runRoot, { recursive: true, force: true });
  }
}

async function commandSelfTest(): Promise<number> {
  const admissionCorpus = await runAdmissionCorpus();
  const generatedCatalog = await generateCatalog();
  const skills = await knownSkills();
  const required = await requiredProfiles();
  const scenario = {
    id: "SELF-001",
    kind: "implicit-trigger",
    target_skill: "context",
    expectation: expectation("context", "context"),
  };
  const good = await checkEligibility(
    scenario,
    syntheticTrace(scenario, "context", ["context"]),
  );
  const wrong = await checkEligibility(
    scenario,
    syntheticTrace(scenario, "plan-change", ["context"]),
  );
  const mutation = await checkEligibility(
    scenario,
    syntheticTrace(scenario, "context", ["context"], { mutation: true }),
  );
  const fileChange = await checkEligibility(
    scenario,
    syntheticTrace(scenario, "context", ["context"], {
      toolActions: [classifyToolAction({ type: "file_change" })!],
    }),
  );
  const webSearch = await checkEligibility(
    scenario,
    syntheticTrace(scenario, "context", ["context"], {
      toolActions: [classifyToolAction({ type: "web_search" })!],
    }),
  );
  const delegation = await checkEligibility(
    scenario,
    syntheticTrace(scenario, "context", ["context"], {
      toolActions: [classifyToolAction({ type: "collab_tool_call" })!],
    }),
  );
  const unknownTool = await checkEligibility(
    scenario,
    syntheticTrace(scenario, "context", ["context"], {
      toolActions: [classifyToolAction({ type: "future_tool_call" })!],
    }),
  );
  const normalizedWebSearch = await checkEligibility(
    scenario,
    await normalizeTrace(
      scenario,
      [
        { type: "thread.started", thread_id: "normalized-thread" },
        { type: "item.completed", item: { type: "web_search", query: "forbidden" } },
        {
          type: "item.completed",
          item: {
            type: "command_execution",
            command: "sed -n '1,80p' .codex/skills/context/SKILL.md",
            status: "completed",
            exit_code: 0,
            aggregated_output: "",
          },
        },
        {
          type: "item.completed",
          item: {
            type: "agent_message",
            text: syntheticTrace(scenario, "context", ["context"]).final_text,
          },
        },
        { type: "turn.completed", usage: {} },
      ]
        .map((event) => JSON.stringify(event))
        .join("\n"),
      "",
      0,
      1,
      false,
    ),
  );
  const incomplete = await checkEligibility(
    scenario,
    syntheticTrace(scenario, "context", ["context"], { terminal: "turn.failed" }),
  );
  const supporting = await checkEligibility(
    scenario,
    syntheticTrace(scenario, "context", ["context"], { supporting: ["plan-change"] }),
  );
  const unavailableHost = await checkEligibility(scenario, {
    ...syntheticTrace(scenario, "plan-change", []),
    errors: ["Code Mode is unavailable because code-mode host is disabled."],
  });
  const deniedRead = await checkEligibility(scenario, {
    ...syntheticTrace(scenario, "plan-change", []),
    stderr_lines: ["exec_command failed: CreateProcess { message: Rejected(command rejected: blocked by policy) }"],
  });
  const agentScenario = {
    id: "SELF-AGENT-001",
    kind: "agent-outcome",
    target_skill: "plan-change",
    expectation: expectation("plan-change", "plan-change", {
      statuses: ["PASS"],
      mustLoadRoles: ["orchestrator"],
      requiredEvidencePaths: ["docs/product/requirements.md"],
      maxLoadedSkills: 1,
      maxLoadedRoles: 1,
      maxCommands: 2,
      maxOutputChars: 1000,
    }),
  };
  const agentGood = await checkEligibility(
    agentScenario,
    syntheticTrace(agentScenario, "plan-change", ["plan-change"], {
      loadedRoles: ["orchestrator"],
      evidencePaths: ["docs/product/requirements.md"],
    }),
  );
  const agentRoleMissing = await checkEligibility(
    agentScenario,
    syntheticTrace(agentScenario, "plan-change", ["plan-change"], {
      evidencePaths: ["docs/product/requirements.md"],
    }),
  );
  const agentEvidenceMissing = await checkEligibility(
    agentScenario,
    syntheticTrace(agentScenario, "plan-change", ["plan-change"], {
      loadedRoles: ["orchestrator"],
    }),
  );
  const agentOverBudget = await checkEligibility(
    agentScenario,
    syntheticTrace(agentScenario, "plan-change", ["plan-change"], {
      loadedRoles: ["orchestrator"],
      evidencePaths: ["docs/product/requirements.md"],
      commandCount: 3,
    }),
  );
  const judgments: Record<string, JsonObject> = {};
  let lastProfile: JsonObject = {};
  let lastRubric: JsonObject = {};
  for (const profile of required) {
    const definition = await rubric(profile);
    lastProfile = profile;
    lastRubric = definition;
    judgments[profile.id] = await validateJudgment(
      {
        run_id: "self-test-run",
        scenario_id: scenario.id,
        judge_profile_id: profile.id,
        judge_type: profile.judge_type,
        rubric_id: definition.rubric_id,
        rubric_version: definition.version,
        verdict: "PASS",
        dimensions: definition.dimensions.map((dimension: JsonObject) => ({
          id: dimension.id,
          score: 4,
          rationale: "Synthetic maximum.",
          evidence: [{ path: "normalized.json", observation: "Synthetic." }],
        })),
      },
      profile,
      definition,
      "self-test-run",
      scenario.id,
    );
  }
  const premature = await validateJudgment(
    { ...judgments[lastProfile.id], root_cause: "model-variance" },
    lastProfile,
    lastRubric,
    "self-test-run",
    scenario.id,
    1,
  );
  const missingJudgments = { ...judgments };
  delete missingJudgments[Object.keys(missingJudgments)[0]!];
  const [fullyAccepted] = acceptedCandidate(good, judgments, required);
  const [missingRejected] = acceptedCandidate(good, missingJudgments, required);
  const targetFailures = await runFixtureSelfTest();
  const roleContracts = await agentContracts();
  const roleCase = { id: "SELF-ROLE-ROUTE", owner: "product-designer", expected_primary: "cascade-product:define-product", prompt: "Define a scoped product candidate." };
  const wiredInteraction = interactionScenario(roleCase, roleContracts);
  const rejectsInteraction = (changes: JsonObject): boolean => {
    try { interactionScenario({ ...roleCase, ...changes }, roleContracts); return false; }
    catch (error) { return error instanceof CascadeError; }
  };
  const readOutput = await readText(rootPath(".codex/agents/orchestrator/AGENT.md")) + "\n" + await readText(rootPath(".codex/skills/context/SKILL.md"));
  const readTrace = async (exitCode: number, reader = "Get-Content", output = readOutput) => normalizeTrace(scenario, JSON.stringify({
    type: "item.completed", item: { type: "command_execution", exit_code: exitCode,
      status: exitCode === 0 ? "completed" : "failed",
      command: String.raw`${reader} .codex\agents\orchestrator\AGENT.md, .codex\skills\context\SKILL.md`,
      aggregated_output: exitCode === 0 ? output : "Access denied" },
  }), "", 0, 1, false);
  const successfulRead = await readTrace(0);
  const failedRead = await readTrace(1);
  const echoedPath = await readTrace(0, "Write-Output", ".codex/agents/orchestrator/AGENT.md .codex/skills/context/SKILL.md");
  const emptyRead = await readTrace(0, "Get-Content", "");
  const inventory = await readTrace(0, "rg --files", readOutput);
  const mixedRead = await normalizeTrace(scenario, JSON.stringify({ type: "item.completed", item: {
    type: "command_execution", exit_code: 1, status: "failed",
    command: "Get-Content .codex/skills/context/SKILL.md; rg --files missing-directory",
    aggregated_output: readOutput + "\nrg: missing-directory: not found",
  } }), "", 0, 1, false);
  const lifecycleAssertions = await judgeLifecycleSelfTest(scenario, required);
  const assertions: [boolean, string][] = [
    ...lifecycleAssertions,
    [mixedRead.loaded_skills.includes("context"), "a later failed search cannot erase an observed source read"],
    [[echoedPath, emptyRead, inventory].every((trace) => !trace.loaded_roles.length && !trace.loaded_skills.length), "echoes, empty output and inventories cannot establish source loads"],
    [successfulRead.loaded_roles.includes("orchestrator") && successfulRead.loaded_skills.includes("context"), "native Windows paths establish source loads"],
    [failedRead.loaded_roles.length === 0 && failedRead.loaded_skills.length === 0, "failed reads cannot establish source loads"],
    [targetPrompt({ ...scenario, owner: "orchestrator" }).includes("Read .codex/agents/orchestrator/AGENT.md"), "target receives its assigned role without expected route answers"],
    [codexCommand(PLANNING_MODEL, "high", "probe", OUTPUT_SCHEMA, "win32").includes('windows.sandbox="unelevated"') && codexCommand(PLANNING_MODEL, "high", "probe", OUTPUT_SCHEMA, "win32").includes("read-only"), "Windows source reads retain a configured read-only sandbox"],
    [!codexCommand(PLANNING_MODEL, "high", "probe", OUTPUT_SCHEMA, "linux").some((arg) => arg.includes("windows.sandbox")), "non-Windows execution preserves its native sandbox"],
    [wiredInteraction.owner === "product-designer" && wiredInteraction.expectation.must_load_roles.includes("product-designer"), "role usage requires the wired specialist contract"],
    [rejectsInteraction({ expected_primary: "cascade-coding-agent:maintain-harness" }), "unwired primary must fail before execution"],
    [rejectsInteraction({ allowed_supporting: ["cascade-coding-agent:maintain-harness"] }), "unwired supporting skill must fail before execution"],
    [rejectsInteraction({ owner: "missing-role" }), "unknown usage owner must fail before execution"],
    [good.verdict === "PASS", "good trace must pass"],
    [wrong.hard_failures.includes("primary-route"), "wrong route must fail"],
    [unavailableHost.verdict === "BLOCKED" && unavailableHost.failure_class === "environment", "unavailable source-reading host is an environment block"],
    [deniedRead.verdict === "BLOCKED" && deniedRead.failure_class === "environment", "policy-denied process with failed eligibility is an environment block"],
    [mutation.hard_failures.includes("read-only-safety"), "mutation must fail"],
    [fileChange.hard_failures.includes("read-only-safety"), "file change item must fail"],
    [webSearch.hard_failures.includes("read-only-safety"), "web search item must fail"],
    [delegation.hard_failures.includes("read-only-safety"), "delegation item must fail"],
    [unknownTool.hard_failures.includes("read-only-safety"), "unknown tool item must fail closed"],
    [normalizedWebSearch.hard_failures.includes("read-only-safety"), "normalized tool item must fail"],
    [supporting.hard_failures.includes("supporting-route"), "supporting route must fail"],
    [agentGood.verdict === "PASS", "agent outcome trace must pass"],
    [agentRoleMissing.hard_failures.includes("required-role-load"), "agent role load must be enforced"],
    [agentEvidenceMissing.hard_failures.includes("required-context-evidence"), "product evidence must be enforced"],
    [
      agentOverBudget.checks.some(
        (item: JsonObject) => item.name === "command-budget" && item.passed === false && item.hard_gate === false,
      ),
      "agent detail budget must remain diagnostic",
    ],
    [incomplete.verdict === "BLOCKED", "failed terminal must block"],
    [!classifyCommand("rg token . 2>/dev/null").mutation, "dev-null redirect safe"],
    [!classifyCommand("rg 'placeholder|<[^>]+>' docs").mutation, "quoted redirect safe"],
    [classifyCommand("printf result > result.txt").mutation, "write redirect detected"],
    [handoffMatches("plan-change -> implement-change", "plan-change", "implement-change", skills), "handoff passes"],
    [!handoffMatches("plan-change -> cascade-software-architect:review-change -> implement-change", "plan-change", "implement-change", skills), "wrong handoff fails"],
    [fullyAccepted, "required judges accept"],
    [!missingRejected, "missing judge rejects"],
    [Object.values(judgments).every((item) => item.computed_score === 100), "scores recomputed"],
    [premature.validation_errors.includes("model-variance-requires-repeated-run"), "variance requires repeat"],
    [targetFailures.length === 0, `target fixture passes: ${targetFailures.join("; ")}`],
    [generatedCatalog.scenario_count > 0, "catalog generated"],
    [(await skillPaths()).size === generatedCatalog.skill_count, "skill count matches"],
    [(await agentPaths()).size === generatedCatalog.agent_count, "agent count matches"],
    [generatedCatalog.agent_scenario_count === generatedCatalog.agent_count, "every agent has an outcome case"],
    [targetPrompt(scenario).includes("future handoffs"), "prompt separates handoffs"],
    [valueDigest({ a: 1 }) === valueDigest({ a: 1 }), "stable digest"],
    [admissionCorpus.status === "PASS", "task admission shadow corpus passes"],
  ];
  const failures = assertions.filter(([passed]) => !passed);
  for (const [, message] of failures) console.error(`FAIL: ${message}`);
  console.log(`harness_eval_self_test=${failures.length ? "FAIL" : "PASS"} cases=${assertions.length}`);
  return failures.length ? 1 : 0;
}

export async function main(argv: string[]): Promise<number> {
  const [command, ...rest] = argv;
  const args = parseArgs(rest);
  if (command === "catalog") return commandCatalog(args);
  if (command === "audit") return commandAudit(args);
  if (command === "run") return commandRun(args);
  if (command === "evaluate") return commandEvaluate(args);
  if (command === "judge") return commandJudge(args);
  if (command === "coverage") return commandCoverage(args);
  if (command === "self-test") return commandSelfTest();
  console.log("Usage: bun scripts/cascade.ts eval <catalog|audit|run|evaluate|judge|coverage|self-test>");
  return command ? 1 : 0;
}
