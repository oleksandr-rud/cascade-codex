import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { basename, dirname, extname, resolve } from "node:path";
import { tmpdir } from "node:os";

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
  readJson,
  readText,
  rel,
  rootPath,
  runCommand,
  sha256File,
  utcNow,
  valueDigest,
  walkFiles,
  writeJson,
} from "./common";

const DEFAULT_CONFIG = "harness.config.yaml";
const DEFAULT_MANIFEST = "docs/work/onboarding-manifest.json";
const FIXTURE_ROOT = rootPath("harness-evals/fixtures/onboarding/basic-project");
const PHASE_IDS = Array.from({ length: 10 }, (_, index) =>
  `ON-${String(index).padStart(2, "0")}`,
);
const REQUIRED_PASS_PHASES = new Set(["ON-00", "ON-01", "ON-08", "ON-09"]);
const PHASE_STATUSES = new Set(["PASS", "SKIPPED", "BLOCKED", "GAP"]);
const PROJECT_PART_STATUSES = new Set(["current", "skipped", "blocked"]);
const DOC_ACTIONS = new Set([
  "UPDATED",
  "NO_CHANGE",
  "DEFERRED",
  "BLOCKED",
  "GAP",
  "NO_DOC_NEEDED",
]);
const CHECK_STATUSES = new Set(["PASS", "FAIL", "BLOCKED", "NOT_RUN", "GAP"]);
const IGNORED = new Set([
  ".git",
  ".artifacts",
  ".cache",
  ".venv",
  "__pycache__",
  "build",
  "coverage",
  "dist",
  "node_modules",
  "target",
  "vendor",
]);
const LANGUAGE_EXTENSIONS: Record<string, string> = {
  ".c": "C",
  ".cc": "C++",
  ".cpp": "C++",
  ".cs": "C#",
  ".css": "CSS",
  ".ex": "Elixir",
  ".exs": "Elixir",
  ".go": "Go",
  ".html": "HTML",
  ".java": "Java",
  ".js": "JavaScript",
  ".jsx": "JavaScript",
  ".kt": "Kotlin",
  ".php": "PHP",
  ".py": "Python",
  ".rb": "Ruby",
  ".rs": "Rust",
  ".swift": "Swift",
  ".ts": "TypeScript",
  ".tsx": "TypeScript",
  ".vue": "Vue",
};
const MANIFESTS = new Set([
  "bun.lock",
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  "package.json",
  "pyproject.toml",
  "go.mod",
  "Cargo.toml",
  "pom.xml",
  "build.gradle",
  "build.gradle.kts",
  "composer.json",
  "Gemfile",
  "mix.exs",
  "Package.swift",
]);
const SOURCE_DIRS = new Set([
  "src",
  "app",
  "lib",
  "server",
  "client",
  "backend",
  "frontend",
  "packages",
  "services",
  "cmd",
  "internal",
]);
const TEST_DIRS = new Set(["test", "tests", "__tests__", "spec", "specs", "e2e"]);
const DOC_DIRS = new Set(["doc", "docs", "documentation"]);

function isHarnessOwned(relative: string): boolean {
  return (
    relative === "scripts/cascade.ts" ||
    relative.startsWith("scripts/cascade/") ||
    relative.startsWith(".codex/") ||
    relative.startsWith("docs/patterns/") ||
    relative.startsWith("harness-evals/") ||
    relative.startsWith("product-evals/")
  );
}

function inside(root: string, value: string): string | undefined {
  if (/[<>{}*?]/.test(value)) return undefined;
  const path = resolve(root, value);
  const prefix = `${resolve(root)}/`;
  if (path !== resolve(root) && !path.startsWith(prefix)) return undefined;
  return path;
}

function containsPlaceholder(value: unknown): boolean {
  if (typeof value === "string") return /<[^>]+>/.test(value);
  if (Array.isArray(value)) return value.some(containsPlaceholder);
  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).some(containsPlaceholder);
  }
  return false;
}

async function loadConfig(path: string): Promise<Record<string, any>> {
  const value = Bun.YAML.parse(await readText(path));
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new CascadeError(`configuration must be a mapping: ${path}`);
  }
  return value as Record<string, any>;
}

export async function validateConfig(
  root: string,
  configPath: string,
  options: { allowPlaceholders?: boolean; verifyPaths?: boolean } = {},
): Promise<{ config: Record<string, any>; errors: string[] }> {
  const path = resolve(root, configPath);
  const errors: string[] = [];
  if (!(await isFile(path))) return { config: {}, errors: [`missing config: ${rel(path, root)}`] };
  const config = await loadConfig(path);
  const required = [
    "project",
    "models",
    "paths",
    "validation_commands",
    "routing",
    "functional_acceptance",
    "memory",
    "patterns",
  ];
  for (const key of required) {
    if (!config[key] || typeof config[key] !== "object") {
      errors.push(`config.${key} must be an object`);
    }
  }
  if (!options.allowPlaceholders && containsPlaceholder(config)) {
    errors.push("PLACEHOLDER values remain in harness.config.yaml");
  }
  const models = config.models ?? {};
  for (const key of [
    "default",
    "planning",
    "judged_evaluation",
    "subagent_execution",
    "read_heavy",
  ]) {
    if (typeof models[key] !== "string" || !models[key]) {
      errors.push(`config.models.${key} must be a non-empty string`);
    }
  }
  if ("golden_evaluation" in models) {
    errors.push("config.models.golden_evaluation is retired; use judged_evaluation");
  }
  const paths = config.paths ?? {};
  const pathValues: Array<[string, string]> = [];
  for (const key of [
    "source_roots",
    "test_roots",
    "app_entrypoints",
    "public_contracts",
  ]) {
    if (!Array.isArray(paths[key])) errors.push(`config.paths.${key} must be a list`);
    else if (options.verifyPaths !== false) {
      for (const value of paths[key]) {
        if (typeof value !== "string") {
          errors.push(`config.paths.${key} contains a non-string`);
          continue;
        }
        pathValues.push([`config.paths.${key}`, value]);
      }
    }
  }
  for (const key of [
    "docs_root",
    "structure",
    "glossary",
    "active_work",
    "patterns",
    "pattern_context_builder",
    "harness_eval_runner",
  ]) {
    if (typeof paths[key] !== "string" || !paths[key]) {
      errors.push(`config.paths.${key} must be a non-empty string`);
    }
  }
  for (const [key, value] of Object.entries(paths)) {
    if (["source_roots", "test_roots", "app_entrypoints", "public_contracts"].includes(key)) {
      continue;
    }
    if (typeof value !== "string" || !value) continue;
    if (key.endsWith("_pattern") || key.endsWith("_artifacts")) continue;
    if (key.endsWith("_glob")) {
      if (options.verifyPaths === false) continue;
      if (value.startsWith("/") || value.split("/").includes("..")) {
        errors.push(`config.paths.${key} must stay inside the repository: ${value}`);
      } else {
        const matches = Array.fromAsync(new Bun.Glob(value).scan({ cwd: root, onlyFiles: false }));
        if (!(await matches).length) errors.push(`config.paths.${key} matches no files: ${value}`);
      }
      continue;
    }
    pathValues.push([`config.paths.${key}`, value]);
  }
  if (options.verifyPaths !== false) {
    for (const [label, value] of pathValues) {
      const candidate = inside(root, value);
      if (!candidate) {
        if (!options.allowPlaceholders) errors.push(`${label} is not a bounded concrete path: ${value}`);
      } else if (!(await exists(candidate))) {
        errors.push(`${label} does not exist: ${value}`);
      }
    }
  }
  const commands = config.validation_commands ?? {};
  for (const key of [
    "install",
    "targeted",
    "unit",
    "lint",
    "typecheck",
    "build",
    "functional",
    "e2e",
  ]) {
    if (!Array.isArray(commands[key])) {
      errors.push(`config.validation_commands.${key} must be a list`);
    }
  }
  if (Array.isArray(commands.targeted) && commands.targeted.length === 0) {
    errors.push("config.validation_commands.targeted must not be empty");
  }
  return { config, errors };
}

function configuredCommands(config: Record<string, any>): string[] {
  const commands = config.validation_commands ?? {};
  return [...new Set(
    Object.values(commands).flatMap((values) =>
      Array.isArray(values)
        ? values.filter((item): item is string => typeof item === "string")
        : [],
    ),
  )].sort();
}

function tokenizeCommand(command: string): string[] {
  const tokens: string[] = [];
  let token = "";
  let quote = "";
  let escaped = false;
  for (const character of command) {
    if (escaped) {
      token += character;
      escaped = false;
    } else if (character === "\\") {
      escaped = true;
    } else if (quote) {
      if (character === quote) quote = "";
      else token += character;
    } else if (character === "'" || character === '"') {
      quote = character;
    } else if (/\s/.test(character)) {
      if (token) {
        tokens.push(token);
        token = "";
      }
    } else {
      token += character;
    }
  }
  if (quote) throw new CascadeError("unterminated quote");
  if (escaped) token += "\\";
  if (token) tokens.push(token);
  return tokens;
}

async function executablePath(executable: string, root: string): Promise<string | null> {
  if (executable.includes("/")) {
    const path = executable.startsWith("/") ? executable : resolve(root, executable);
    return (await isFile(path)) ? path : null;
  }
  const result = await runCommand(["which", executable], { cwd: root, timeoutMs: 5_000 });
  return result.exitCode === 0 ? result.stdout.trim() : null;
}

async function probeCommand(root: string, command: string): Promise<Record<string, any>> {
  let tokens: string[];
  try {
    tokens = tokenizeCommand(command);
  } catch (error) {
    return {
      command,
      status: "INVALID",
      executable: null,
      missing_paths: [],
      reason: error instanceof Error ? error.message : String(error),
    };
  }
  while (tokens.length && /^[A-Za-z_][A-Za-z0-9_]*=/.test(tokens[0]!)) tokens.shift();
  if (!tokens.length) {
    return {
      command,
      status: "INVALID",
      executable: null,
      missing_paths: [],
      reason: "command has no executable",
    };
  }
  const executable = tokens[0]!;
  const resolvedExecutable = await executablePath(executable, root);
  const missingPaths: string[] = [];
  if (["bun", "node", "python", "python3"].includes(executable) && tokens[1]?.match(/\.(?:ts|js|py)$/)) {
    const script = inside(root, tokens[1]!);
    if (!script || !(await isFile(script))) missingPaths.push(tokens[1]!);
  }
  return {
    command,
    status: resolvedExecutable && !missingPaths.length ? "AVAILABLE" : "UNAVAILABLE",
    executable: resolvedExecutable ?? executable,
    missing_paths: missingPaths,
    reason: "",
  };
}

async function probeConfiguredCommands(
  root: string,
  configPath: string,
): Promise<{ probes: Record<string, any>[]; errors: string[] }> {
  const { config, errors } = await validateConfig(root, configPath);
  if (errors.length) return { probes: [], errors };
  return {
    probes: await Promise.all(configuredCommands(config).map((command) => probeCommand(root, command))),
    errors: [],
  };
}

async function gitValue(root: string, args: string[]): Promise<string | null> {
  const result = await runCommand(["git", ...args], { cwd: root, timeoutMs: 10_000 });
  return result.exitCode === 0 ? result.stdout.trim() : null;
}

async function snapshot(
  root: string,
  config: Record<string, any>,
  exclude: string[] = [],
): Promise<Record<string, any>> {
  const configuredRoots = [
    ...(config.paths?.source_roots ?? []),
    ...(config.paths?.test_roots ?? []),
  ].filter((item): item is string => typeof item === "string");
  if (!configuredRoots.length) {
    for (const entry of await readdir(root, { withFileTypes: true })) {
      if (entry.isDirectory() && (SOURCE_DIRS.has(entry.name) || TEST_DIRS.has(entry.name))) {
        configuredRoots.push(entry.name);
      }
    }
  }
  const configured = [
    ...configuredRoots,
    ...(config.paths?.app_entrypoints ?? []),
    ...(config.paths?.public_contracts ?? []),
  ].filter((item): item is string => typeof item === "string");
  const files = new Set<string>();
  for (const value of configured) {
    const path = inside(root, value);
    if (!path || !(await exists(path))) continue;
    if (await isFile(path)) {
      if (!isHarnessOwned(rel(path, root))) files.add(path);
    } else {
      for (const item of await walkFiles(path, { skip: IGNORED })) {
        if (!isHarnessOwned(rel(item, root))) files.add(item);
      }
    }
  }
  for (const value of ["AGENTS.md", "CODEX.md", "harness.config.yaml"]) {
    const path = resolve(root, value);
    if (await isFile(path)) files.add(path);
  }
  for (const path of await walkFiles(root, { skip: IGNORED })) {
    if (MANIFESTS.has(basename(path)) && !isHarnessOwned(rel(path, root))) files.add(path);
  }
  const excluded = new Set(exclude.map((item) => resolve(item)));
  const records = [];
  for (const path of [...files].sort()) {
    if (excluded.has(resolve(path)) || basename(path).endsWith(".pre-cascade")) continue;
    records.push({ path: rel(path, root), sha256: await sha256File(path) });
  }
  return { algorithm: "sha256", digest: valueDigest(records), files: records };
}

export async function buildInventory(
  root: string,
  configPath?: string,
  exclude: string[] = [],
): Promise<Record<string, any>> {
  const config = configPath && (await isFile(resolve(root, configPath)))
    ? (await validateConfig(root, configPath, { allowPlaceholders: true })).config
    : {};
  const files = (await walkFiles(root, { skip: IGNORED })).filter(
    (path) => !isHarnessOwned(rel(path, root)),
  );
  const languages = new Map<string, number>();
  const manifests: string[] = [];
  const routes: string[] = [];
  const ui: string[] = [];
  const jobs: string[] = [];
  const detectedEntrypoints: string[] = [];
  const detectedContracts: string[] = [];
  for (const path of files) {
    const relative = rel(path, root);
    const language = LANGUAGE_EXTENSIONS[extname(path).toLowerCase()];
    if (language) languages.set(language, (languages.get(language) ?? 0) + 1);
    if (MANIFESTS.has(basename(path))) manifests.push(relative);
    if (
      ["main", "index", "app", "server", "cli", "__main__"].includes(
        basename(path, extname(path)).toLowerCase(),
      ) &&
      LANGUAGE_EXTENSIONS[extname(path).toLowerCase()]
    ) {
      detectedEntrypoints.push(relative);
    }
    const loweredName = basename(path).toLowerCase();
    if (
      [".proto", ".graphql"].includes(extname(path).toLowerCase()) ||
      loweredName.includes("openapi") ||
      loweredName.includes("swagger") ||
      loweredName.includes("schema")
    ) {
      detectedContracts.push(relative);
    }
    if (/\/(routes?|api)\//i.test(relative)) routes.push(relative);
    if (/\.(tsx|jsx|vue|svelte)$/.test(relative)) ui.push(relative);
    if (/\/(jobs?|workers?|queues?)\//i.test(relative)) jobs.push(relative);
  }
  const configuredSourceRoots = (config.paths?.source_roots ?? []).filter(
    (item: unknown) => typeof item === "string" && files.some((path) => rel(path, root).startsWith(`${item}/`)),
  );
  const configuredTestRoots = (config.paths?.test_roots ?? []).filter(
    (item: unknown) => typeof item === "string" && files.some((path) => rel(path, root).startsWith(`${item}/`)),
  );
  const topLevelDirectories = new Set(
    files.map((path) => rel(path, root).split("/")[0]!).filter(Boolean),
  );
  const sourceRoots = configuredSourceRoots.length
    ? configuredSourceRoots
    : [...topLevelDirectories].filter((item) => SOURCE_DIRS.has(item)).sort();
  const testRoots = configuredTestRoots.length
    ? configuredTestRoots
    : [...topLevelDirectories].filter((item) => TEST_DIRS.has(item)).sort();
  const inventory: Record<string, any> = {
    schema_version: 1,
    root: ".",
    vcs: {
      head: await gitValue(root, ["rev-parse", "HEAD"]),
      branch: await gitValue(root, ["branch", "--show-current"]),
      dirty: Boolean(await gitValue(root, ["status", "--porcelain"])),
    },
    roots: {
      source: sourceRoots,
      test: testRoots,
      docs: [...topLevelDirectories].filter((item) => DOC_DIRS.has(item)).sort(),
    },
    languages: [...languages.entries()]
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
      .map(([language, files]) => ({ language, files })),
    manifests: manifests.sort(),
    entrypoints: [...new Set([
      ...detectedEntrypoints,
      ...(config.paths?.app_entrypoints ?? []).filter(
        (item: string) => files.some((path) => rel(path, root) === item),
      ),
    ])].sort(),
    public_contracts: [...new Set([
      ...detectedContracts,
      ...(config.paths?.public_contracts ?? []).filter(
        (item: string) => files.some((path) => rel(path, root) === item),
      ),
    ])].sort(),
    feature_surfaces: {
      routes: routes.sort(),
      ui: ui.sort(),
      jobs: jobs.sort(),
    },
    commands: [
      ...(
        (await isFile(resolve(root, "package.json")))
          ? Object.entries(
              (await readJson<Record<string, any>>(resolve(root, "package.json"))).scripts ?? {},
            ).map(([name, command]) => ({
              source: "package.json",
              name,
              command,
            }))
          : []
      ),
      ...Object.entries(config.validation_commands ?? {}).flatMap(
        ([group, values]) =>
          Array.isArray(values)
            ? values.map((command) => ({
                source: "harness.config.yaml",
                name: group,
                command,
              }))
            : [],
      ),
    ].sort((left, right) =>
      `${left.source}:${left.name}:${left.command}`.localeCompare(
        `${right.source}:${right.name}:${right.command}`,
      ),
    ),
    source_snapshot: await snapshot(root, config, exclude),
  };
  inventory.digest = valueDigest({
    ...inventory,
    vcs: { ...inventory.vcs, dirty: null },
  });
  return inventory;
}

async function initManifest(
  root: string,
  configPath: string,
  outputPath: string,
  preserve: string[],
): Promise<Record<string, any>> {
  const { config, errors } = await validateConfig(root, configPath);
  if (errors.length) throw new CascadeError(errors.join("; "));
  const inventory = await buildInventory(root, configPath, [outputPath]);
  const output = resolve(root, outputPath);
  const preservedCandidates = new Set<string>(preserve);
  for (const path of await walkFiles(root, { skip: IGNORED })) {
    if (basename(path).endsWith(".pre-cascade")) preservedCandidates.add(rel(path, root));
  }
  const preserved = [];
  for (const value of [...preservedCandidates].sort()) {
    const path = inside(root, value);
    if (!path || !(await isFile(path))) throw new CascadeError(`preserved file does not exist: ${value}`);
    preserved.push({ path: rel(path, root), sha256: await sha256File(path) });
  }
  const manifest = {
    schema_version: 1,
    status: "draft",
    project: {
      name: config.project?.name,
      root: ".",
      source_revision: inventory.vcs.head,
    },
    config: {
      path: rel(resolve(root, configPath), root),
      sha256: await sha256File(resolve(root, configPath)),
    },
    inventory: { digest: inventory.digest, source_revision: inventory.vcs.head },
    phases: PHASE_IDS.map((id) => ({
      id,
      status: "GAP",
      evidence: [],
      outputs: [],
      blockers: [],
    })),
    project_parts: [],
    documentation: [],
    preserved_files: preserved,
    source_snapshot: await snapshot(root, config, [output]),
    validation: [],
  };
  await writeJson(output, manifest);
  return manifest;
}

async function refreshManifest(
  root: string,
  configPath: string,
  manifestPath: string,
): Promise<Record<string, any>> {
  const path = resolve(root, manifestPath);
  const manifest = await readJson<Record<string, any>>(path);
  if (manifest.schema_version !== 1) {
    throw new CascadeError("manifest.schema_version must be 1 before refresh");
  }
  if (!manifest.project || typeof manifest.project !== "object") {
    throw new CascadeError("manifest.project must be an object before refresh");
  }
  const { config, errors } = await validateConfig(root, configPath);
  if (errors.length) throw new CascadeError(errors.join("; "));
  if (!Array.isArray(manifest.preserved_files)) {
    throw new CascadeError("manifest.preserved_files must be a list");
  }
  for (const [index, item] of manifest.preserved_files.entries()) {
    if (!item || typeof item.path !== "string") {
      throw new CascadeError(`manifest.preserved_files[${index}] is invalid`);
    }
    const candidate = inside(root, item.path);
    if (!candidate || !(await isFile(candidate))) {
      throw new CascadeError(`preserved file is missing: ${item.path}`);
    }
    if (item.sha256 !== (await sha256File(candidate))) {
      throw new CascadeError(`preserved file changed: ${item.path}`);
    }
  }
  const inventory = await buildInventory(root, configPath, [path]);
  manifest.project.name = config.project?.name;
  manifest.project.source_revision = inventory.vcs.head;
  manifest.config = {
    path: rel(resolve(root, configPath), root),
    sha256: await sha256File(resolve(root, configPath)),
  };
  manifest.inventory = {
    digest: inventory.digest,
    source_revision: inventory.vcs.head,
  };
  manifest.source_snapshot = await snapshot(root, config, [path]);
  await writeJson(path, manifest);
  return manifest;
}

function stringList(
  value: unknown,
  label: string,
  errors: string[],
  allowEmpty = true,
): string[] {
  if (!Array.isArray(value)) {
    errors.push(`${label} must be a list`);
    return [];
  }
  if (!allowEmpty && !value.length) errors.push(`${label} must not be empty`);
  const result: string[] = [];
  for (const [index, item] of value.entries()) {
    if (typeof item !== "string" || !item.trim()) errors.push(`${label}[${index}] must be a non-empty string`);
    else result.push(item);
  }
  return result;
}

function validatePhases(value: unknown, errors: string[], complete: boolean): void {
  if (!Array.isArray(value)) {
    errors.push("manifest.phases must be a list");
    return;
  }
  const seen = new Set<string>();
  for (const [index, phase] of value.entries()) {
    const label = `manifest.phases[${index}]`;
    if (!phase || typeof phase !== "object") {
      errors.push(`${label} must be an object`);
      continue;
    }
    const id = phase.id;
    if (seen.has(id)) errors.push(`duplicate onboarding phase: ${id}`);
    if (typeof id === "string") seen.add(id);
    if (!PHASE_IDS.includes(id)) errors.push(`${label}.id is invalid: ${id}`);
    if (!PHASE_STATUSES.has(phase.status)) errors.push(`${label}.status is invalid: ${phase.status}`);
    stringList(phase.evidence, `${label}.evidence`, errors);
    stringList(phase.outputs, `${label}.outputs`, errors);
    stringList(phase.blockers, `${label}.blockers`, errors);
    if (["PASS", "SKIPPED"].includes(phase.status) && !phase.evidence?.length) {
      errors.push(`${label} requires evidence for status ${phase.status}`);
    }
    if (phase.status === "BLOCKED" && !phase.blockers?.length) {
      errors.push(`${label} requires blockers for status BLOCKED`);
    }
    if (complete && !["PASS", "SKIPPED"].includes(phase.status)) {
      errors.push(`${label} is not complete: ${phase.status}`);
    }
    if (complete && REQUIRED_PASS_PHASES.has(id) && phase.status !== "PASS") {
      errors.push(`${label} must be PASS for completed onboarding`);
    }
  }
  for (const id of PHASE_IDS) if (!seen.has(id)) errors.push(`manifest.phases missing: ${id}`);
  for (const id of seen) if (!PHASE_IDS.includes(id)) errors.push(`manifest.phases contains unknown id: ${id}`);
}

async function validateProjectParts(
  root: string,
  value: unknown,
  errors: string[],
  complete: boolean,
): Promise<void> {
  if (!Array.isArray(value)) {
    errors.push("manifest.project_parts must be a list");
    return;
  }
  if (complete && !value.length) {
    errors.push("manifest.project_parts requires a current, skipped, or blocked area decision");
  }
  for (const [index, item] of value.entries()) {
    const label = `manifest.project_parts[${index}]`;
    if (!item || typeof item !== "object") {
      errors.push(`${label} must be an object`);
      continue;
    }
    if (!PROJECT_PART_STATUSES.has(item.status)) errors.push(`${label}.status is invalid: ${item.status}`);
    if (typeof item.area !== "string" || !item.area.trim()) errors.push(`${label}.area must be a non-empty string`);
    const sources = stringList(item.source_paths, `${label}.source_paths`, errors, false);
    for (const source of sources) {
      const candidate = inside(root, source);
      if (!candidate || !(await exists(candidate))) errors.push(`${label}.source_paths entry does not exist: ${source}`);
    }
    if (item.status === "current") {
      const candidate = typeof item.path === "string" ? inside(root, item.path) : undefined;
      if (!candidate || !(await isFile(candidate))) errors.push(`${label}.path does not exist: ${item.path}`);
    } else if (typeof item.reason !== "string" || !item.reason.trim()) {
      errors.push(`${label}.reason is required for status ${item.status}`);
    }
  }
}

async function validateDocumentation(
  root: string,
  value: unknown,
  errors: string[],
  complete: boolean,
): Promise<void> {
  if (!Array.isArray(value)) {
    errors.push("manifest.documentation must be a list");
    return;
  }
  if (complete && !value.length) errors.push("manifest.documentation requires at least one doc-routing decision");
  for (const [index, item] of value.entries()) {
    const label = `manifest.documentation[${index}]`;
    if (!item || typeof item !== "object") {
      errors.push(`${label} must be an object`);
      continue;
    }
    for (const key of ["fact", "source", "owner_target", "action", "evidence"]) {
      if (typeof item[key] !== "string" || !item[key].trim()) errors.push(`${label}.${key} must be a non-empty string`);
    }
    if (!DOC_ACTIONS.has(item.action)) errors.push(`${label}.action is invalid: ${item.action}`);
    if (["UPDATED", "NO_CHANGE"].includes(item.action)) {
      const candidate = typeof item.owner_target === "string" ? inside(root, item.owner_target) : undefined;
      if (!candidate || !(await exists(candidate))) errors.push(`${label}.owner_target does not exist: ${item.owner_target}`);
    }
  }
}

async function validateManifest(
  root: string,
  configPath: string,
  manifestPath: string,
  requireComplete: boolean,
): Promise<{ errors: string[]; drift: Record<string, any> }> {
  const errors: string[] = [];
  const { config, errors: configErrors } = await validateConfig(root, configPath);
  errors.push(...configErrors);
  const path = resolve(root, manifestPath);
  if (!(await isFile(path))) return { errors: [...errors, `missing manifest: ${manifestPath}`], drift: { status: "UNKNOWN" } };
  const manifest = await readJson<Record<string, any>>(path);
  if (manifest.schema_version !== 1) errors.push("manifest.schema_version must be 1");
  if (!["draft", "current", "blocked", "superseded"].includes(manifest.status)) {
    errors.push(`manifest.status is invalid: ${manifest.status}`);
  }
  if (requireComplete && manifest.status !== "current") {
    errors.push("manifest.status must be current for completed onboarding");
  }
  if (!manifest.project || typeof manifest.project !== "object") {
    errors.push("manifest.project must be an object");
  } else if (manifest.project.name !== config.project?.name) {
    errors.push("manifest.project.name does not match harness config");
  }
  const configAbsolute = resolve(root, configPath);
  if (!manifest.config || typeof manifest.config !== "object") {
    errors.push("manifest.config must be an object");
  } else {
    if (manifest.config.path !== rel(configAbsolute, root)) {
      errors.push("manifest.config.path does not match validated config");
    }
    if (manifest.config.sha256 !== (await sha256File(configAbsolute))) {
      errors.push("manifest.config.sha256 is stale");
    }
  }
  const currentInventory = await buildInventory(root, configPath, [path]);
  if (!manifest.inventory || typeof manifest.inventory !== "object") {
    errors.push("manifest.inventory must be an object");
  } else if (manifest.inventory.digest !== currentInventory.digest) {
    errors.push("manifest.inventory.digest is stale");
  }
  validatePhases(manifest.phases, errors, requireComplete);
  await validateProjectParts(root, manifest.project_parts, errors, requireComplete);
  await validateDocumentation(root, manifest.documentation, errors, requireComplete);
  if (!Array.isArray(manifest.preserved_files)) {
    errors.push("manifest.preserved_files must be a list");
  } else {
    for (const item of manifest.preserved_files) {
      const candidate = inside(root, item.path);
      if (!candidate || !(await isFile(candidate))) errors.push(`preserved file missing: ${item.path}`);
      else if (item.sha256 !== (await sha256File(candidate))) {
        errors.push(`preserved file digest changed: ${item.path}`);
      }
    }
  }
  let validatorPass = false;
  const recordedCommands = new Set<string>();
  if (!Array.isArray(manifest.validation)) {
    errors.push("manifest.validation must be a list");
  } else {
    for (const [index, item] of manifest.validation.entries()) {
      const label = `manifest.validation[${index}]`;
      if (!item || typeof item !== "object") {
        errors.push(`${label} must be an object`);
        continue;
      }
      if (typeof item.command !== "string" || !item.command.trim()) errors.push(`${label}.command must be a non-empty string`);
      else recordedCommands.add(item.command);
      if (!CHECK_STATUSES.has(item.status)) errors.push(`${label}.status is invalid: ${item.status}`);
      if (typeof item.evidence !== "string" || !item.evidence.trim()) errors.push(`${label}.evidence must be a non-empty string`);
      if (
        typeof item.command === "string" &&
        item.command.includes("bun scripts/cascade.ts validate --target") &&
        item.status === "PASS"
      ) {
        validatorPass = true;
      }
    }
  }
  if (requireComplete && !validatorPass) {
    errors.push("manifest.validation requires a PASS for Bun target validation");
  }
  if (requireComplete) {
    for (const command of configuredCommands(config)) {
      if (!recordedCommands.has(command)) {
        errors.push(`manifest.validation missing configured command disposition: ${command}`);
      }
    }
  }
  const current = await snapshot(root, config, [path]);
  const saved = manifest.source_snapshot ?? {};
  if (saved.algorithm !== "sha256") errors.push("manifest.source_snapshot.algorithm must be sha256");
  if (!Array.isArray(saved.files)) errors.push("manifest.source_snapshot.files must be a list");
  else if (saved.digest !== valueDigest(saved.files)) {
    errors.push("manifest.source_snapshot.digest does not match its files");
  }
  const savedFiles = new Map((saved.files ?? []).map((item: any) => [item.path, item.sha256]));
  const currentFiles = new Map(current.files.map((item: any) => [item.path, item.sha256]));
  const added = [...currentFiles.keys()].filter((key) => !savedFiles.has(key)).sort();
  const removed = [...savedFiles.keys()].filter((key) => !currentFiles.has(key)).sort();
  const changed = [...currentFiles.keys()]
    .filter((key) => savedFiles.has(key) && savedFiles.get(key) !== currentFiles.get(key))
    .sort();
  const drift = {
    status: added.length || removed.length || changed.length ? "DRIFT" : "CURRENT",
    added,
    removed,
    changed,
  };
  if (drift.status !== "CURRENT") {
    errors.push(
      `onboarding source snapshot drifted: added=${added.length} removed=${removed.length} changed=${changed.length}`,
    );
  }
  return { errors, drift };
}

export async function runFixtureSelfTest(): Promise<string[]> {
  const failures: string[] = [];
  if (!(await isDirectory(FIXTURE_ROOT))) return [`missing fixture: ${FIXTURE_ROOT}`];
  const schema = await readJson<Record<string, any>>(
    rootPath(".codex/skills/adapt-harness/schemas/onboarding-manifest.schema.json"),
  );
  const schemaStatuses = new Set(schema.properties?.status?.enum ?? []);
  for (const status of ["draft", "current", "blocked", "superseded"]) {
    if (!schemaStatuses.has(status)) failures.push(`manifest schema missing status: ${status}`);
  }
  const schemaActions = new Set(
    schema.properties?.documentation?.items?.properties?.action?.enum ?? [],
  );
  if (JSON.stringify([...schemaActions].sort()) !== JSON.stringify([...DOC_ACTIONS].sort())) {
    failures.push("documentation action vocabulary differs between schema and runtime");
  }
  const schemaChecks = new Set(
    schema.properties?.validation?.items?.properties?.status?.enum ?? [],
  );
  if (JSON.stringify([...schemaChecks].sort()) !== JSON.stringify([...CHECK_STATUSES].sort())) {
    failures.push("validation status vocabulary differs between schema and runtime");
  }
  const temporary = await mkdtemp(resolve(tmpdir(), "cascade-target-"));
  const target = resolve(temporary, "fixture-project");
  try {
    await cp(FIXTURE_ROOT, target, { recursive: true });
    const configPath = DEFAULT_CONFIG;
    const manifestPath = DEFAULT_MANIFEST;
    const targetPackage = resolve(target, "package.json");
    const targetPackageDigest = await sha256File(targetPackage);
    const { errors } = await validateConfig(target, configPath);
    if (errors.length) return [`fixture config failed: ${errors.join("; ")}`];
    const inventory = await buildInventory(target, configPath);
    if (!inventory.roots.source.includes("src")) failures.push("source root not detected");
    if (!inventory.roots.test.includes("tests")) failures.push("test root not detected");
    if (!inventory.manifests.includes("package.json")) failures.push("manifest not detected");
    const unconfiguredInventory = await buildInventory(target);
    if (!unconfiguredInventory.roots.source.includes("src")) {
      failures.push("no-config inventory did not detect source root");
    }
    if (!unconfiguredInventory.roots.test.includes("tests")) {
      failures.push("no-config inventory did not detect test root");
    }
    if (!unconfiguredInventory.entrypoints.includes("src/index.ts")) {
      failures.push("no-config inventory did not detect entrypoint");
    }
    if (!unconfiguredInventory.commands.some((item: any) => item.command === "node --test")) {
      failures.push("no-config inventory did not detect package command");
    }
    const cliInventory = await runCommand(
      [
        process.execPath,
        rootPath("scripts/cascade.ts"),
        "target",
        "inventory",
        "--root",
        target,
      ],
      { cwd: ROOT, timeoutMs: 30_000 },
    );
    if (cliInventory.exitCode !== 0 || !cliInventory.stdout.includes('"src"')) {
      failures.push("real Bun target inventory command failed against existing package");
    }
    if ((await sha256File(targetPackage)) !== targetPackageDigest) {
      failures.push("Bun target command changed existing target package.json");
    }
    const targetValidation = await runCommand(
      [
        process.execPath,
        rootPath("scripts/cascade.ts"),
        "validate",
        "--target",
        "--root",
        target,
      ],
      { cwd: ROOT, timeoutMs: 30_000 },
    );
    if (targetValidation.exitCode !== 0 || !targetValidation.stdout.includes("cascade_target_status=PASS")) {
      failures.push("full Bun target validator failed against existing target package");
    }
    if ((await sha256File(targetPackage)) !== targetPackageDigest) {
      failures.push("full Bun target validator changed existing target package.json");
    }
    const cascadeInventory = await buildInventory(ROOT);
    if (cascadeInventory.entrypoints.some((item: string) => item.includes("fixtures/onboarding"))) {
      failures.push("root inventory included onboarding fixture entrypoint");
    }
    if (
      cascadeInventory.public_contracts.some(
        (item: string) =>
          item.startsWith("harness-evals/") ||
          item.startsWith("product-evals/") ||
          item.startsWith(".codex/") ||
          item.startsWith("docs/patterns/"),
      )
    ) {
      failures.push("root inventory included harness-owned schema as target contract");
    }
    await initManifest(target, configPath, manifestPath, ["AGENTS.md.pre-cascade"]);
    const manifestFile = resolve(target, manifestPath);
    const initialManifest = await readJson<Record<string, any>>(manifestFile);
    const initialPreserved = initialManifest.preserved_files;
    const refreshed = await refreshManifest(target, configPath, manifestPath);
    if (JSON.stringify(refreshed.preserved_files) !== JSON.stringify(initialPreserved)) {
      failures.push("manifest refresh changed preservation hashes");
    }
    const draft = await validateManifest(target, configPath, manifestPath, true);
    if (!draft.errors.some((item) => item.includes("not complete"))) {
      failures.push("draft onboarding manifest accepted as complete");
    }
    const manifest = await readJson<Record<string, any>>(manifestFile);
    manifest.status = "current";
    for (const phase of manifest.phases) {
      phase.status = "PASS";
      phase.evidence = [`fixture evidence for ${phase.id}`];
    }
    manifest.project_parts = [
      {
        area: "backend",
        path: "docs/specs/backend/project-part.md",
        status: "current",
        source_paths: ["src/index.ts"],
      },
    ];
    manifest.documentation = [
      {
        fact: "Fixture health feature",
        source: "src/routes/health.ts",
        owner_target: "docs/product/requirements.md",
        action: "UPDATED",
        evidence: "fixture requirement",
      },
      {
        fact: "No additional brand documentation",
        source: "src/index.ts",
        owner_target: "none",
        action: "NO_DOC_NEEDED",
        evidence: "fixture has no brand surface",
      },
    ];
    manifest.validation = [
      {
        command: "bun scripts/cascade.ts validate --target",
        status: "PASS",
        evidence: "fixture target validation",
      },
      {
        command: "npm run test",
        status: "NOT_RUN",
        evidence: "fixture command is cataloged but not executed",
      },
      {
        command: "bun scripts/cascade.ts target validate --require-complete",
        status: "NOT_RUN",
        evidence: "fixture self-test calls the library contract directly",
      },
      {
        command: "fixture optional visual check",
        status: "GAP",
        evidence: "fixture has no visual runtime",
      },
    ];
    await writeJson(manifestFile, manifest);
    let result = await validateManifest(target, configPath, manifestPath, true);
    if (result.errors.length) failures.push(`complete fixture failed: ${result.errors.join("; ")}`);
    manifest.documentation[1].action = "INVALID";
    await writeJson(manifestFile, manifest);
    result = await validateManifest(target, configPath, manifestPath, true);
    if (!result.errors.some((item) => item.includes(".action is invalid"))) {
      failures.push("invalid documentation action not rejected");
    }
    manifest.documentation[1].action = "NO_DOC_NEEDED";
    await writeJson(manifestFile, manifest);
    const preserved = resolve(target, "AGENTS.md.pre-cascade");
    const original = await readFile(preserved);
    await writeFile(preserved, "overwritten\n");
    result = await validateManifest(target, configPath, manifestPath, true);
    if (!result.errors.some((item) => item.includes("preserved file"))) {
      failures.push("preserved-file drift not rejected");
    }
    await writeFile(preserved, original);
    const source = resolve(target, "src/index.ts");
    const sourceText = await readText(source);
    await writeFile(source, `${sourceText}\nexport const drift = true;\n`);
    result = await validateManifest(target, configPath, manifestPath, true);
    if (result.drift.status !== "DRIFT" || !result.drift.changed.includes("src/index.ts")) {
      failures.push("source drift not detected");
    }
    await writeFile(source, sourceText);
    const packagePath = targetPackage;
    const packageText = await readText(packagePath);
    await writeFile(packagePath, packageText.replace('"private": true', '"private": false'));
    result = await validateManifest(target, configPath, manifestPath, true);
    if (result.drift.status !== "DRIFT" || !result.drift.changed.includes("package.json")) {
      failures.push("package manifest drift not detected");
    }
    await writeFile(packagePath, packageText);
    const configFile = resolve(target, configPath);
    const configText = await readText(configFile);
    await writeFile(configFile, configText.replace('"Fixture Project"', '"<PROJECT_NAME>"'));
    const placeholder = await validateConfig(target, configPath);
    if (!placeholder.errors.some((item) => item.includes("PLACEHOLDER"))) {
      failures.push("placeholder not rejected");
    }
    await writeFile(configFile, configText.replace('- "src"', '- "missing-src"'));
    const missingPath = await validateConfig(target, configPath);
    if (!missingPath.errors.some((item) => item.includes("missing-src"))) {
      failures.push("missing configured path not rejected");
    }
    await writeFile(configFile, configText.replace("judged_evaluation:", "golden_evaluation:"));
    const staleModel = await validateConfig(target, configPath);
    if (!staleModel.errors.some((item) => item.includes("golden_evaluation"))) {
      failures.push("stale golden_evaluation config key not rejected");
    }
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
  return failures;
}

export async function main(argv: string[]): Promise<number> {
  const [command, ...rest] = argv;
  const args = parseArgs(rest);
  const root = resolve(flag(args, "root", ".")!);
  const config = flag(args, "config", DEFAULT_CONFIG)!;
  if (command === "inventory") {
    const inventory = await buildInventory(root, flag(args, "config"));
    const output = flag(args, "output");
    if (output) {
      await writeJson(resolve(root, output), inventory);
      console.log(`project_inventory_status=PASS output=${output}`);
    } else console.log(JSON.stringify(inventory, null, 2));
    return 0;
  }
  if (command === "init-manifest") {
    const output = flag(args, "output", DEFAULT_MANIFEST)!;
    const manifest = await initManifest(root, config, output, flags(args, "preserve"));
    console.log(`onboarding_manifest_status=DRAFT output=${output} phases=${manifest.phases.length}`);
    return 0;
  }
  if (command === "refresh-manifest") {
    const manifestPath = flag(args, "manifest", DEFAULT_MANIFEST)!;
    const manifest = await refreshManifest(root, config, manifestPath);
    console.log(`onboarding_manifest_refresh=PASS snapshot=${manifest.source_snapshot.digest}`);
    return 0;
  }
  if (command === "probe-commands") {
    const result = await probeConfiguredCommands(root, config);
    for (const error of result.errors) console.error(`ERROR: ${error}`);
    if (result.errors.length) {
      console.log(`project_command_probe_status=FAIL errors=${result.errors.length}`);
      return 2;
    }
    console.log(JSON.stringify({ commands: result.probes }, null, 2));
    const missing = result.probes.filter((item) => item.status !== "AVAILABLE");
    console.log(`project_command_probe_status=${missing.length ? "BLOCKED" : "PASS"} missing=${missing.length}`);
    return missing.length ? 1 : 0;
  }
  if (command === "validate") {
    const manifest = flag(args, "manifest") ?? (boolFlag(args, "require-complete") ? DEFAULT_MANIFEST : undefined);
    const result = manifest
      ? await validateManifest(root, config, manifest, boolFlag(args, "require-complete"))
      : { ...(await validateConfig(root, config)), drift: { status: "NOT_CHECKED" } };
    const errors = "errors" in result ? result.errors : [];
    for (const error of errors) console.error(`ERROR: ${error}`);
    console.log(
      `target_project_status=${errors.length ? "FAIL" : "PASS"} drift=${result.drift?.status ?? "NOT_CHECKED"}`,
    );
    return errors.length ? 1 : 0;
  }
  if (command === "drift") {
    const result = await validateManifest(
      root,
      config,
      flag(args, "manifest", DEFAULT_MANIFEST)!,
      false,
    );
    console.log(JSON.stringify(result.drift, null, 2));
    console.log(`onboarding_drift_status=${result.drift.status}`);
    return result.drift.status === "CURRENT" ? 0 : 1;
  }
  if (command === "self-test") {
    const failures = await runFixtureSelfTest();
    for (const failure of failures) console.error(`FAIL: ${failure}`);
    console.log(
      `project_analysis_self_test=${failures.length ? "FAIL" : "PASS"} cases=26`,
    );
    return failures.length ? 1 : 0;
  }
  console.log("Usage: bun scripts/cascade.ts target <inventory|init-manifest|refresh-manifest|validate|drift|probe-commands|self-test>");
  return command ? 1 : 0;
}
