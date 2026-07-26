import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";

import {
  CascadeError,
  ROOT,
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
} from "./common";
import { runFixtureSelfTest } from "./target";

const EVAL_ROOT = rootPath("evals/harness");
const CASE_SOURCE = resolve(EVAL_ROOT, "skill-cases.json");
const INTERACTION_SOURCE = resolve(EVAL_ROOT, "interactions.json");
const CATALOG_PATH = resolve(EVAL_ROOT, "scenarios.generated.json");
const OUTPUT_SCHEMA = resolve(EVAL_ROOT, "response.schema.json");
const JUDGE_SCHEMA = resolve(EVAL_ROOT, "judge-response.schema.json");
const JUDGE_PROFILES = resolve(EVAL_ROOT, "judge-profiles.json");
const ARTIFACT_ROOT = rootPath(".artifacts/harness-evals");
const PLANNING_MODEL = "gpt-5.6-sol";
const EXECUTION_MODEL = "gpt-5.6-terra";
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

async function skillPaths(): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  for (const path of await walkFiles(rootPath(".codex/skills"), {
    include: (item) => item.endsWith("/SKILL.md"),
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

function expectation(
  primary: string,
  targetSkill: string,
  options: {
    statuses?: string[];
    nextRoute?: string;
    forbiddenPrimary?: string[];
    allowedSupporting?: string[];
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
    mutation_policy: "none",
    network_policy: "none",
    delegation_policy: "none",
  };
}

export async function generateCatalog(): Promise<JsonObject> {
  const cases = (await readJson<JsonObject>(CASE_SOURCE)).skills ?? [];
  const interactions =
    (await readJson<JsonObject>(INTERACTION_SOURCE)).interactions ?? [];
  const discovered = await skillPaths();
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
        source: "evals/harness/skill-cases.json",
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
    scenarios.push({
      id: item.id,
      kind: "interaction",
      target_skill: item.expected_primary,
      owner: "orchestrator",
      prompt: item.prompt,
      expectation: expectation(item.expected_primary, item.expected_primary, {
        forbiddenPrimary: item.forbidden_primary ?? [],
        allowedSupporting: item.allowed_supporting ?? [],
      }),
      source: "evals/harness/interactions.json",
    });
  }
  if (new Set(scenarios.map((item) => item.id)).size !== scenarios.length) {
    throw new CascadeError("generated scenario IDs are not unique");
  }
  return {
    schema_version: 1,
    generated_by: "scripts/cascade/evals.ts",
    skill_count: discovered.size,
    scenario_count: scenarios.length,
    catalog_digest: valueDigest(scenarios),
    scenarios,
  };
}

async function sourceManifest(): Promise<JsonObject> {
  const fixed = [
    "AGENTS.md",
    "CODEX.md",
    "harness.config.yaml",
    ".codex/config.toml",
    ".codex/harness-tooling/package.json",
    ".codex/harness-tooling/bun.lock",
    "scripts/cascade.ts",
    "evals/harness/skill-cases.json",
    "evals/harness/interactions.json",
    "evals/harness/response.schema.json",
    "evals/harness/judge-response.schema.json",
    "evals/harness/judge-profiles.json",
  ].map(rootPath);
  const dynamic = [
    ...(await walkFiles(rootPath("scripts/cascade"))),
    ...(await walkFiles(rootPath(".codex/skills"))),
    ...(await walkFiles(rootPath(".codex/agents"))),
    ...(await walkFiles(resolve(EVAL_ROOT, "rubrics"))),
  ].filter((path) => !path.endsWith(".pyc"));
  const records = [];
  for (const path of [...new Set([...fixed, ...dynamic])].sort()) {
    if (await isFile(path)) records.push({ path: rel(path), sha256: await sha256File(path) });
  }
  return { schema_version: 1, digest: valueDigest(records), files: records };
}

async function profiles(): Promise<Map<string, JsonObject>> {
  const values = (await readJson<JsonObject>(JUDGE_PROFILES)).profiles;
  if (!Array.isArray(values)) throw new CascadeError("judge profiles missing");
  return new Map(values.map((item: JsonObject) => [item.id, item]));
}

async function rubric(profile: JsonObject): Promise<JsonObject> {
  const path = rootPath(profile.rubric ?? "");
  const value = await readJson<JsonObject>(path);
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
- Do not access the network, external apps, connectors, or MCP servers.
- Do not spawn or delegate to another agent.
- Do not read evals/harness/, .artifacts/harness-evals/, prior runs, expected answers, or evaluator rubrics.
- Read AGENTS.md, CODEX.md, and only the skill and role sources needed to route the request.
- Select one primary Cascade skill. \`supporting_skills\` may contain only existing
  repository skills that you actually loaded and used for this response; put
  skills mentioned only as future handoffs in \`next_route\`, not in
  \`supporting_skills\`. Rejected skills must also be existing repository skills.
- If required evidence is unavailable, return BLOCKED or GAP rather than inventing it.
- Return only JSON matching the supplied output schema.

Scenario ID: ${scenario.id}

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

async function knownSkills(): Promise<string[]> {
  return [...(await skillPaths()).keys()];
}

async function routeSequence(value: unknown): Promise<string[]> {
  if (typeof value !== "string") return [];
  const matches: { index: number; skill: string }[] = [];
  for (const skill of await knownSkills()) {
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

async function handoffMatches(
  actual: unknown,
  primary: unknown,
  expected: string,
): Promise<boolean> {
  const sequence = await routeSequence(actual);
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
  const messages: string[] = [];
  const loadedSkills = new Set<string>();
  const loadedRoles = new Set<string>();
  const errors: string[] = [];
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
      for (const match of command.matchAll(/\.codex\/skills\/([a-z0-9-]+)\/SKILL\.md/g)) {
        loadedSkills.add(match[1]!);
      }
      for (const match of command.matchAll(/\.codex\/agents\/([a-z0-9-]+)\/AGENT\.md/g)) {
        loadedRoles.add(match[1]!);
      }
    } else if (item.type === "agent_message" && event.type === "item.completed") {
      messages.push(String(item.text ?? ""));
    } else if (item.type === "error") errors.push(String(item.message ?? ""));
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
  check("supporting-route", !unexpected.length, { actual: [...supporting], allowed: [...allowed], unexpected });
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
  const unsafe = (trace.commands ?? []).filter(
    (item: JsonObject) => item.mutation || item.network || item.delegation,
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
  if (expected.next_route) {
    check(
      "handoff-route",
      await handoffMatches(final?.next_route, primary, expected.next_route),
      { actual: final?.next_route, expected: expected.next_route },
    );
  }
  const environmentFailure =
    trace.timed_out ||
    ![0, null, undefined].includes(trace.exit_code) ||
    trace.terminal_event === "turn.failed" ||
    [...(trace.errors ?? []), ...(trace.stderr_lines ?? [])].some((line) =>
      /failed to spawn|requires a newer version|model .+ (?:is not supported|was not found)|authentication (?:failed|required)/i.test(
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

function codexCommand(model: string, effort: string, prompt: string, schema: string): string[] {
  return [
    "codex",
    "exec",
    "--ephemeral",
    "--ignore-user-config",
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
    "--disable",
    "code_mode_host",
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

async function validateJudgment(
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
  const dimensions = new Map(
    (judgment.dimensions ?? []).map((item: JsonObject) => [item.id, item]),
  );
  let weighted = 0;
  let minimum = 4;
  for (const dimension of definition.dimensions ?? []) {
    const actual = dimensions.get(dimension.id) as JsonObject | undefined;
    if (!actual || !Number.isInteger(actual.score) || actual.score < 0 || actual.score > 4) {
      errors.push(`invalid-dimension:${dimension.id}`);
      continue;
    }
    weighted += (actual.score / 4) * dimension.weight;
    minimum = Math.min(minimum, actual.score);
  }
  const score = Math.round(weighted * 100) / 100;
  const threshold =
    score >= definition.pass_threshold &&
    minimum >= definition.minimum_dimension_score;
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

async function acceptedCandidate(
  eligibility: JsonObject,
  judgments: Record<string, JsonObject>,
): Promise<[boolean, string]> {
  if (eligibility.verdict !== "PASS") return [false, "eligibility-not-pass"];
  for (const profile of await requiredProfiles()) {
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
    const missing = [PLANNING_MODEL, EXECUTION_MODEL].filter((item) => !slugs.has(item));
    runtime.available_model_count = slugs.size;
    runtime.required_models = [PLANNING_MODEL, EXECUTION_MODEL].sort();
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
  if (scenarios.size) selected = selected.filter((item) => scenarios.has(item.id));
  if (skills.size) selected = selected.filter((item) => skills.has(item.target_skill));
  if (kinds.size) selected = selected.filter((item) => kinds.has(item.kind));
  const limit = Number(flag(args, "limit"));
  return Number.isFinite(limit) && limit > 0 ? selected.slice(0, limit) : selected;
}

async function commandRun(args: ReturnType<typeof parseArgs>): Promise<number> {
  const expected = await generateCatalog();
  const current = await readJson<JsonObject>(CATALOG_PATH);
  if (stableJson(expected) !== stableJson(current)) {
    throw new CascadeError("generated catalog is stale; run eval catalog --write");
  }
  const selected = selectScenarios(current, args);
  if (!selected.length) throw new CascadeError("no scenarios matched");
  const model =
    flag(args, "model") ??
    Bun.env.CASCADE_EVAL_CODEX_MODEL ??
    (flag(args, "model-profile", "execution") === "planning"
      ? PLANNING_MODEL
      : EXECUTION_MODEL);
  const effort = flag(args, "reasoning-effort", "low")!;
  const repetitions = Number(flag(args, "repetitions", "1"));
  const timeout = Number(flag(args, "timeout", "180")) * 1000;
  const runId =
    flag(args, "run-id") ??
    new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const runRoot = resolve(ARTIFACT_ROOT, runId);
  if (await exists(runRoot)) throw new CascadeError(`run directory exists: ${rel(runRoot)}`);
  await mkdir(runRoot, { recursive: true });
  const manifest = await sourceManifest();
  const metadata = {
    run_id: runId,
    started_at: utcNow(),
    catalog_digest: current.catalog_digest,
    harness_source_digest: manifest.digest,
    model,
    model_profile: [PLANNING_MODEL, EXECUTION_MODEL].includes(model) ? flag(args, "model-profile", "execution") : "custom",
    reasoning_effort: effort,
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
    for (let repetition = 1; repetition <= repetitions; repetition += 1) {
      counter += 1;
      const caseName =
        repetitions > 1 ? `${scenario.id}-r${String(repetition).padStart(2, "0")}` : scenario.id;
      const caseRoot = resolve(runRoot, "cases", caseName);
      await mkdir(caseRoot, { recursive: true });
      const prompt = targetPrompt(scenario);
      await writeFile(resolve(caseRoot, "prompt.txt"), prompt, "utf8");
      const command = codexCommand(model, effort, prompt, OUTPUT_SCHEMA);
      await writeJson(resolve(caseRoot, "command.json"), {
        argv: [...command.slice(0, -1), "<prompt-in-prompt.txt>"],
        replay: `bun scripts/cascade.ts eval run --scenario ${scenario.id} --model ${model}`,
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
      const eligibility = await checkEligibility(scenario, trace);
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
    const eligibility = await checkEligibility(scenario, trace);
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

Load .codex/agents/harness-evaluator/AGENT.md and .codex/skills/harness-evaluation/SKILL.md.
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

async function commandJudge(args: ReturnType<typeof parseArgs>): Promise<number> {
  const runRoot = resolve(ROOT, flag(args, "run-dir") ?? "");
  const metadata = await readJson<JsonObject>(resolve(runRoot, "run.json"));
  const selected = await readJson<JsonObject[]>(resolve(runRoot, "selected-scenarios.json"));
  const scenarioMap = new Map(selected.map((item) => [item.id, item]));
  const summary = await readJson<JsonObject>(resolve(runRoot, "summary.json"));
  const profileMap = await profiles();
  const requested = new Set(flags(args, "judge-profile"));
  const judgments: JsonObject[] = [];
  for (const eligibility of summary.eligibilities ?? []) {
    if (eligibility.verdict !== "PASS") continue;
    const caseName = basename(eligibility.case_dir);
    const scenario = scenarioMap.get(eligibility.scenario_id);
    if (!scenario) continue;
    for (const profile of await requiredProfiles()) {
      if (requested.size && !requested.has(profile.id)) continue;
      const definition = await rubric(profile);
      const outputRoot = resolve(runRoot, "judgments", caseName, profile.id);
      if (await exists(outputRoot)) throw new CascadeError(`judgment exists: ${rel(outputRoot)}`);
      await mkdir(outputRoot, { recursive: true });
      const prompt = judgePrompt(runRoot, caseName, scenario, profile, definition);
      await writeFile(resolve(outputRoot, "prompt.txt"), prompt, "utf8");
      const model = flag(args, "model") ?? (profile.model_profile === "planning" ? PLANNING_MODEL : EXECUTION_MODEL);
      const effort = flag(args, "reasoning-effort") ?? profile.reasoning_effort;
      const command = codexCommand(model, effort, prompt, JUDGE_SCHEMA);
      await writeJson(resolve(outputRoot, "command.json"), {
        argv: [...command.slice(0, -1), "<prompt-in-prompt.txt>"],
      });
      const result = await runCommand(command, {
        timeoutMs: Number(flag(args, "timeout", "300")) * 1000,
        env: { NO_COLOR: "1", TERM: "xterm-256color" },
      });
      await Promise.all([
        writeFile(resolve(outputRoot, "stdout.jsonl"), result.stdout, "utf8"),
        writeFile(resolve(outputRoot, "stderr.log"), result.stderr, "utf8"),
      ]);
      const trace = await normalizeTrace(
        { id: `JUDGE-${scenario.id}` },
        result.stdout,
        result.stderr,
        result.exitCode,
        result.durationMs,
        result.timedOut,
      );
      await writeJson(resolve(outputRoot, "normalized.json"), trace);
      const raw = trace.final_response ?? {};
      const validated = await validateJudgment(
        raw,
        profile,
        definition,
        metadata.run_id,
        scenario.id,
        metadata.repetitions,
      );
      validated.case_name = caseName;
      await writeJson(resolve(outputRoot, "judgment.json"), validated);
      judgments.push(validated);
    }
  }
  await writeJson(resolve(runRoot, "judgments", "summary.json"), {
    run_id: metadata.run_id,
    judgments,
  });
  console.log(`judge_status=PASS judgments=${judgments.length}`);
  return judgments.some((item) => item.accepted !== true) ? 1 : 0;
}

async function commandCoverage(args: ReturnType<typeof parseArgs>): Promise<number> {
  const catalog = await generateCatalog();
  const manifest = await sourceManifest();
  const rows = new Map(
    catalog.scenarios.map((scenario: JsonObject) => [
      scenario.id,
      { scenario_id: scenario.id, executed: false, covered: false, candidates: [] as JsonObject[] },
    ]),
  );
  if (await isDirectory(ARTIFACT_ROOT)) {
    for (const name of await readdir(ARTIFACT_ROOT)) {
      const runRoot = resolve(ARTIFACT_ROOT, name);
      if (!(await isDirectory(runRoot))) continue;
      try {
        const metadata = await readJson<JsonObject>(resolve(runRoot, "run.json"));
        const source = await readJson<JsonObject>(resolve(runRoot, "source-manifest.json"));
        const summary = await readJson<JsonObject>(resolve(runRoot, "summary.json"));
        if (source.digest !== manifest.digest || metadata.harness_source_digest !== manifest.digest) continue;
        const judgmentPath = resolve(runRoot, "judgments", "summary.json");
        const judgmentsByCase: Record<string, Record<string, JsonObject>> = {};
        if (await isFile(judgmentPath)) {
          for (const judgment of (await readJson<JsonObject>(judgmentPath)).judgments ?? []) {
            (judgmentsByCase[judgment.case_name] ??= {})[judgment.judge_profile_id] = judgment;
          }
        }
        for (const eligibility of summary.eligibilities ?? []) {
          const row = rows.get(eligibility.scenario_id);
          if (!row) continue;
          row.executed = true;
          const [accepted, acceptance] = await acceptedCandidate(
            eligibility,
            judgmentsByCase[basename(eligibility.case_dir)] ?? {},
          );
          row.covered ||= accepted;
          row.candidates.push({ run_id: metadata.run_id, accepted, acceptance });
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
  options: { supporting?: string[]; mutation?: boolean; terminal?: string } = {},
): JsonObject {
  const final = {
    scenario_id: scenario.id,
    primary_skill: primary,
    supporting_skills: options.supporting ?? [],
    rejected_skills: [],
    status: "PASS",
    decision: "Synthetic decision.",
    evidence: [{ path: "CODEX.md", observation: "Synthetic evidence." }],
    actions: [],
    missing_context: [],
    next_route: scenario.expectation.next_route,
  };
  const terminal = options.terminal ?? "turn.completed";
  return {
    scenario_id: scenario.id,
    thread_id: "synthetic-thread",
    event_types: ["thread.started", terminal],
    terminal_event: terminal,
    commands: [
      {
        command: options.mutation ? "apply_patch" : "sed -n 1,80p SKILL.md",
        mutation: options.mutation ?? false,
        network: false,
        delegation: false,
      },
    ],
    loaded_skills: loaded,
    final_response: final,
    exit_code: terminal === "turn.completed" ? 0 : 1,
    timed_out: false,
    errors: [],
    stderr_lines: [],
  };
}

async function commandSelfTest(): Promise<number> {
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
  const incomplete = await checkEligibility(
    scenario,
    syntheticTrace(scenario, "context", ["context"], { terminal: "turn.failed" }),
  );
  const supporting = await checkEligibility(
    scenario,
    syntheticTrace(scenario, "context", ["context"], { supporting: ["plan-change"] }),
  );
  const judgments: Record<string, JsonObject> = {};
  let lastProfile: JsonObject = {};
  let lastRubric: JsonObject = {};
  for (const profile of await requiredProfiles()) {
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
  const [fullyAccepted] = await acceptedCandidate(good, judgments);
  const [missingRejected] = await acceptedCandidate(good, missingJudgments);
  const targetFailures = await runFixtureSelfTest();
  const assertions: [boolean, string][] = [
    [good.verdict === "PASS", "good trace must pass"],
    [wrong.hard_failures.includes("primary-route"), "wrong route must fail"],
    [mutation.hard_failures.includes("read-only-safety"), "mutation must fail"],
    [supporting.hard_failures.includes("supporting-route"), "supporting route must fail"],
    [incomplete.verdict === "BLOCKED", "failed terminal must block"],
    [!classifyCommand("rg token . 2>/dev/null").mutation, "dev-null redirect safe"],
    [!classifyCommand("rg 'placeholder|<[^>]+>' docs").mutation, "quoted redirect safe"],
    [classifyCommand("printf result > result.txt").mutation, "write redirect detected"],
    [await handoffMatches("design-system -> functional-qa", "design-system", "functional-qa"), "handoff passes"],
    [!(await handoffMatches("design-system -> visual-qa -> functional-qa", "design-system", "functional-qa")), "wrong handoff fails"],
    [fullyAccepted, "required judges accept"],
    [!missingRejected, "missing judge rejects"],
    [Object.values(judgments).every((item) => item.computed_score === 100), "scores recomputed"],
    [premature.validation_errors.includes("model-variance-requires-repeated-run"), "variance requires repeat"],
    [targetFailures.length === 0, `target fixture passes: ${targetFailures.join("; ")}`],
    [(await generateCatalog()).scenario_count > 0, "catalog generated"],
    [(await skillPaths()).size === (await generateCatalog()).skill_count, "skill count matches"],
    [(await agentPaths()).size > 0, "agents discovered"],
    [targetPrompt(scenario).includes("future handoffs"), "prompt separates handoffs"],
    [valueDigest({ a: 1 }) === valueDigest({ a: 1 }), "stable digest"],
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
