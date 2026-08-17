import { mkdir, writeFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";

import {
  CascadeError,
  ROOT,
  boolFlag,
  boundedPath,
  exists,
  parseArgs,
  readBoundedRegularFile,
  readText,
  rel,
  rootPath,
  sha256File,
  stableJson,
  valueDigest,
  walkFiles,
} from "./common";
import {
  type CompiledPatternSection,
  type PatternSectionSelection,
  compilePatternSelections,
} from "./patterns";

const CATALOG_PATH = rootPath("docs/product/catalog.yaml");
const BRIEF_SCHEMA_PATH = rootPath("docs/specs/brief-manifest.schema.json");
const PRODUCT_FILES = {
  requirements: rootPath("docs/product/requirements.md"),
  journeys: rootPath("docs/product/journeys.md"),
  scenarios: rootPath("docs/product/scenarios.md"),
  personas: rootPath("docs/product/personas"),
};

type Status = "draft" | "reviewed" | "approved" | "superseded";

export interface EvaluationRef {
  path: string;
  kind: "contract-test" | "harness-evaluation" | "harness-simulation" | "product-simulation";
  authority: "implementation" | "harness-only" | "mechanics-only" | "target-product";
  status: "authored" | "validated" | "executed" | "reviewed" | "accepted" | "not-run";
}

export interface ProductDomain {
  id: string;
  name: string;
  status: Status;
  owner: string;
  summary: string;
  source_paths: string[];
}

export interface ProductCapability {
  id: string;
  domain_id: string;
  name: string;
  status: Status;
  owner: string;
  summary: string;
  source_paths: string[];
  requirement_ids: string[];
  journey_ids: string[];
  scenario_ids: string[];
  persona_ids: string[];
  evaluation_refs: EvaluationRef[];
}

export interface ProductCatalog {
  schema_version: number;
  product: { id: string; name: string; summary: string };
  domains: ProductDomain[];
  capabilities: ProductCapability[];
}

export interface BriefEvidence {
  id: string;
  kind: string;
  authority: string;
  title: string;
  url?: string;
  path?: string;
  reference_date: string;
  supports: string[];
  limitations: string;
  status: string;
}

export interface BriefManifest {
  schema_version: number;
  brief_id: string;
  revision: number;
  status: Status;
  title: string;
  catalog_path: string;
  domain_id: string;
  capability_id: string;
  coverage_mode: "complete" | "selected";
  purpose: string;
  audiences: string[];
  product_refs: {
    requirement_ids: string[];
    journey_ids: string[];
    scenario_ids: string[];
    persona_ids: string[];
  };
  omissions: Array<{ ref_id: string; reason: string }>;
  source_documents: string[];
  evidence: BriefEvidence[];
  pattern_context: PatternSectionSelection[];
  simulation_context: Array<{
    path: string;
    scope: "contract-test" | "harness-evaluation" | "harness-simulation" | "product-simulation";
    authority: "implementation" | "harness-only" | "mechanics-only" | "target-product";
    status: string;
    purpose: string;
  }>;
  gaps: string[];
  non_goals: string[];
  output_path: string;
}

interface MarkdownTable {
  headers: string[];
  rows: string[][];
}

export interface ResolvedBrief {
  path: string;
  manifestSha256: string;
  manifest: BriefManifest;
  catalog: ProductCatalog;
  domain: ProductDomain;
  capability: ProductCapability;
  tables: {
    requirements: MarkdownTable;
    journeys: MarkdownTable;
    scenarios: MarkdownTable;
  };
  personaPaths: Map<string, string>;
  patternSections: CompiledPatternSection[];
  sourceDigests: Array<{ path: string; sha256: string }>;
  simulationDigests: Array<{ path: string; sha256: string }>;
  evaluationDigests: Array<{ path: string; sha256: string }>;
  compilerContractDigests: Array<{ path: string; sha256: string }>;
}

export interface ProductBriefBinding {
  brief_path: string;
  brief_id: string;
  revision: number;
  sha256: string;
  output_path: string;
  output_sha256: string;
  domain_id: string;
  capability_id: string;
  product_refs: BriefManifest["product_refs"];
}

export interface ResolvedCurrentBriefProjection {
  resolved: ResolvedBrief;
  binding: ProductBriefBinding;
  generated: string;
  currentOutput: string;
}

export const MAX_BRIEF_MANIFEST_BYTES = 1024 * 1024;
export const MAX_BRIEF_PROJECTION_BYTES = 8 * 1024 * 1024;

function object(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new CascadeError(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function exactKeys(
  value: Record<string, unknown>,
  allowed: string[],
  label: string,
): void {
  const extras = Object.keys(value).filter((key) => !allowed.includes(key));
  if (extras.length) throw new CascadeError(`${label} has unknown fields: ${extras.join(", ")}`);
}

function string(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new CascadeError(`${label} must be a non-empty string`);
  }
  return value;
}

function stringArray(value: unknown, label: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || !item.trim())) {
    throw new CascadeError(`${label} must be a string array`);
  }
  return value as string[];
}

function nonEmptyStringArray(value: unknown, label: string): string[] {
  const result = stringArray(value, label);
  if (!result.length) throw new CascadeError(`${label} must contain at least one value`);
  return result;
}

function unique(values: string[], label: string): void {
  if (new Set(values).size !== values.length) {
    throw new CascadeError(`${label} contains duplicate values`);
  }
}

function id(value: unknown, expression: RegExp, label: string): string {
  const result = string(value, label);
  if (!expression.test(result)) throw new CascadeError(`${label} is invalid: ${result}`);
  return result;
}

function assertStatus(value: unknown, label: string): Status {
  const result = string(value, label) as Status;
  if (!["draft", "reviewed", "approved", "superseded"].includes(result)) {
    throw new CascadeError(`${label} is invalid: ${result}`);
  }
  return result;
}

function parseTableLine(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function isSeparator(cells: string[]): boolean {
  return cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

export function parseMarkdownTables(text: string): MarkdownTable[] {
  const lines = text.split("\n");
  const tables: MarkdownTable[] = [];
  for (let index = 0; index < lines.length - 1; index += 1) {
    if (!lines[index]!.trim().startsWith("|")) continue;
    const headers = parseTableLine(lines[index]!);
    const separator = parseTableLine(lines[index + 1]!);
    if (headers.length !== separator.length || !isSeparator(separator)) continue;
    const rows: string[][] = [];
    index += 2;
    while (index < lines.length && lines[index]!.trim().startsWith("|")) {
      const row = parseTableLine(lines[index]!);
      if (row.length === headers.length) rows.push(row);
      index += 1;
    }
    index -= 1;
    tables.push({ headers, rows });
  }
  return tables;
}

function ownerTable(text: string, idPattern: RegExp, label: string): MarkdownTable {
  const matches = parseMarkdownTables(text).filter((table) =>
    table.rows.some((row) => idPattern.test(row[0]!.replaceAll("`", ""))),
  );
  if (matches.length !== 1) {
    throw new CascadeError(`${label} must contain exactly one owner table`);
  }
  return matches[0]!;
}

function rowIds(table: MarkdownTable): string[] {
  return table.rows.map((row) => row[0]!.replaceAll("`", ""));
}

function selectRows(table: MarkdownTable, ids: string[], label: string): MarkdownTable {
  const selected = ids.map((item) => {
    const rows = table.rows.filter((row) => row[0]!.replaceAll("`", "") === item);
    if (rows.length !== 1) throw new CascadeError(`${label} reference does not resolve once: ${item}`);
    return rows[0]!;
  });
  return { headers: table.headers, rows: selected };
}

async function loadYaml<T>(path: string, label: string): Promise<T> {
  try {
    return Bun.YAML.parse(await readText(path)) as T;
  } catch (error) {
    throw new CascadeError(
      `invalid ${label} ${rel(path)}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function sha256Bytes(value: Uint8Array): string {
  const hasher = new Bun.CryptoHasher("sha256");
  hasher.update(value);
  return hasher.digest("hex");
}

async function readBoundedUtf8(
  path: string,
  label: string,
  maxBytes: number,
): Promise<{ text: string; sha256: string }> {
  const bytes = await readBoundedRegularFile(path, label, { maxBytes });
  try {
    return {
      text: new TextDecoder("utf-8", { fatal: true }).decode(bytes),
      sha256: sha256Bytes(bytes),
    };
  } catch {
    throw new CascadeError(`${label} is not valid UTF-8`);
  }
}

async function loadBoundedYaml<T>(
  path: string,
  label: string,
): Promise<{ value: T; sha256: string }> {
  let source: { text: string; sha256: string };
  try {
    source = await readBoundedUtf8(path, label, MAX_BRIEF_MANIFEST_BYTES);
    return { value: Bun.YAML.parse(source.text) as T, sha256: source.sha256 };
  } catch (error) {
    throw new CascadeError(
      `invalid ${label} ${rel(path)}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function validateEvaluationRef(value: unknown, label: string): EvaluationRef {
  const item = object(value, label);
  exactKeys(item, ["path", "kind", "authority", "status"], label);
  const result = {
    path: string(item.path, `${label}.path`),
    kind: string(item.kind, `${label}.kind`) as EvaluationRef["kind"],
    authority: string(item.authority, `${label}.authority`) as EvaluationRef["authority"],
    status: string(item.status, `${label}.status`) as EvaluationRef["status"],
  };
  const expected: Record<EvaluationRef["kind"], EvaluationRef["authority"]> = {
    "contract-test": "implementation",
    "harness-evaluation": "harness-only",
    "harness-simulation": "mechanics-only",
    "product-simulation": "target-product",
  };
  if (!(result.kind in expected) || expected[result.kind] !== result.authority) {
    throw new CascadeError(`${label} has incompatible kind and authority`);
  }
  const pathPrefix: Record<EvaluationRef["kind"], string> = {
    "contract-test": "scripts/",
    "harness-evaluation": "harness-evals/",
    "harness-simulation": "product-evals/simulations/harness/",
    "product-simulation": "product-evals/simulations/product/",
  };
  if (!result.path.startsWith(pathPrefix[result.kind])) {
    throw new CascadeError(`${label}.path must be under ${pathPrefix[result.kind]}`);
  }
  if (!["authored", "validated", "executed", "reviewed", "accepted", "not-run"].includes(result.status)) {
    throw new CascadeError(`${label}.status is invalid: ${result.status}`);
  }
  return result;
}

export function validateCatalogShape(value: unknown): ProductCatalog {
  const catalog = object(value, "product catalog");
  exactKeys(catalog, ["schema_version", "product", "domains", "capabilities"], "product catalog");
  if (catalog.schema_version !== 1) throw new CascadeError("product catalog schema_version must be 1");
  const product = object(catalog.product, "product catalog product");
  exactKeys(product, ["id", "name", "summary"], "product catalog product");
  const domains = (catalog.domains as unknown[] | undefined)?.map((value, index) => {
    const item = object(value, `domains[${index}]`);
    exactKeys(item, ["id", "name", "status", "owner", "summary", "source_paths"], `domains[${index}]`);
    return {
      id: id(item.id, /^PD-\d{3}$/, `domains[${index}].id`),
      name: string(item.name, `domains[${index}].name`),
      status: assertStatus(item.status, `domains[${index}].status`),
      owner: string(item.owner, `domains[${index}].owner`),
      summary: string(item.summary, `domains[${index}].summary`),
      source_paths: nonEmptyStringArray(item.source_paths, `domains[${index}].source_paths`),
    };
  });
  const capabilities = (catalog.capabilities as unknown[] | undefined)?.map((value, index) => {
    const item = object(value, `capabilities[${index}]`);
    exactKeys(
      item,
      ["id", "domain_id", "name", "status", "owner", "summary", "source_paths", "requirement_ids", "journey_ids", "scenario_ids", "persona_ids", "evaluation_refs"],
      `capabilities[${index}]`,
    );
    const result: ProductCapability = {
      id: id(item.id, /^PC-\d{3}$/, `capabilities[${index}].id`),
      domain_id: id(item.domain_id, /^PD-\d{3}$/, `capabilities[${index}].domain_id`),
      name: string(item.name, `capabilities[${index}].name`),
      status: assertStatus(item.status, `capabilities[${index}].status`),
      owner: string(item.owner, `capabilities[${index}].owner`),
      summary: string(item.summary, `capabilities[${index}].summary`),
      source_paths: nonEmptyStringArray(item.source_paths, `capabilities[${index}].source_paths`),
      requirement_ids: stringArray(item.requirement_ids, `capabilities[${index}].requirement_ids`),
      journey_ids: stringArray(item.journey_ids, `capabilities[${index}].journey_ids`),
      scenario_ids: stringArray(item.scenario_ids, `capabilities[${index}].scenario_ids`),
      persona_ids: stringArray(item.persona_ids, `capabilities[${index}].persona_ids`),
      evaluation_refs: (item.evaluation_refs as unknown[] | undefined)?.map((ref, refIndex) =>
        validateEvaluationRef(ref, `capabilities[${index}].evaluation_refs[${refIndex}]`),
      ) ?? [],
    };
    for (const [key, values] of Object.entries({
      requirement_ids: result.requirement_ids,
      journey_ids: result.journey_ids,
      scenario_ids: result.scenario_ids,
      persona_ids: result.persona_ids,
    })) unique(values, `${result.id}.${key}`);
    return result;
  });
  if (!domains?.length) throw new CascadeError("product catalog must contain a domain");
  if (!capabilities?.length) throw new CascadeError("product catalog must contain a capability");
  unique(domains.map((item) => item.id), "product domain IDs");
  unique(capabilities.map((item) => item.id), "product capability IDs");
  return {
    schema_version: 1,
    product: {
      id: id(product.id, /^[a-z0-9][a-z0-9-]*$/, "product.id"),
      name: string(product.name, "product.name"),
      summary: string(product.summary, "product.summary"),
    },
    domains,
    capabilities,
  };
}

async function personaPaths(): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  for (const path of await walkFiles(PRODUCT_FILES.personas, {
    include: (item) => item.endsWith(".md") && basename(item) !== "_index.md",
  })) {
    if (rel(path).includes("/fixtures/")) continue;
    const match = /^ID:\s*(P-\d{3})\s*$/m.exec(await readText(path));
    if (!match) continue;
    if (result.has(match[1]!)) throw new CascadeError(`duplicate product persona ID: ${match[1]}`);
    result.set(match[1]!, rel(path));
  }
  return result;
}

async function productTables(): Promise<{
  requirements: MarkdownTable;
  journeys: MarkdownTable;
  scenarios: MarkdownTable;
}> {
  return {
    requirements: ownerTable(await readText(PRODUCT_FILES.requirements), /^PR-\d{3}$/, "requirements"),
    journeys: ownerTable(await readText(PRODUCT_FILES.journeys), /^J-\d{3}$/, "journeys"),
    scenarios: ownerTable(await readText(PRODUCT_FILES.scenarios), /^PS-\d{3}$/, "scenarios"),
  };
}

async function assertRepoFile(path: string, label: string, prefix?: string): Promise<string> {
  const absolute = boundedPath(path, prefix);
  if (!(await exists(absolute))) throw new CascadeError(`${label} does not exist: ${path}`);
  return absolute;
}

export async function loadAndValidateProductCatalog(
  path = CATALOG_PATH,
): Promise<ProductCatalog> {
  const catalog = validateCatalogShape(await loadYaml<unknown>(path, "product catalog"));
  const domainIds = new Set(catalog.domains.map((item) => item.id));
  const tables = await productTables();
  const personas = await personaPaths();
  const available = {
    requirement_ids: new Set(rowIds(tables.requirements)),
    journey_ids: new Set(rowIds(tables.journeys)),
    scenario_ids: new Set(rowIds(tables.scenarios)),
    persona_ids: new Set(personas.keys()),
  };
  const covered = {
    requirement_ids: new Set<string>(),
    journey_ids: new Set<string>(),
    scenario_ids: new Set<string>(),
    persona_ids: new Set<string>(),
  };
  for (const domain of catalog.domains) {
    for (const source of domain.source_paths) await assertRepoFile(source, `${domain.id} source`, "docs/");
  }
  for (const capability of catalog.capabilities) {
    if (!domainIds.has(capability.domain_id)) {
      throw new CascadeError(`${capability.id} references unknown domain ${capability.domain_id}`);
    }
    for (const source of capability.source_paths) await assertRepoFile(source, `${capability.id} source`, "docs/");
    for (const [key, ids] of Object.entries({
      requirement_ids: capability.requirement_ids,
      journey_ids: capability.journey_ids,
      scenario_ids: capability.scenario_ids,
      persona_ids: capability.persona_ids,
    })) {
      for (const value of ids) {
        if (!available[key as keyof typeof available].has(value)) {
          throw new CascadeError(`${capability.id} references unknown ${key}: ${value}`);
        }
        covered[key as keyof typeof covered].add(value);
      }
    }
    for (const evaluation of capability.evaluation_refs) {
      await assertRepoFile(evaluation.path, `${capability.id} evaluation reference`);
    }
  }
  for (const key of ["requirement_ids", "journey_ids", "scenario_ids", "persona_ids"] as const) {
    for (const value of available[key]) {
      if (!covered[key].has(value)) throw new CascadeError(`orphan product row is not cataloged: ${value}`);
    }
  }
  return catalog;
}

function validateEvidence(value: unknown, index: number): BriefEvidence {
  const label = `evidence[${index}]`;
  const item = object(value, label);
  exactKeys(item, ["id", "kind", "authority", "title", "url", "path", "reference_date", "supports", "limitations", "status"], label);
  const result: BriefEvidence = {
    id: id(item.id, /^EVD-\d{3}$/, `${label}.id`),
    kind: string(item.kind, `${label}.kind`),
    authority: string(item.authority, `${label}.authority`),
    title: string(item.title, `${label}.title`),
    reference_date: string(item.reference_date, `${label}.reference_date`),
    supports: nonEmptyStringArray(item.supports, `${label}.supports`),
    limitations: string(item.limitations, `${label}.limitations`),
    status: string(item.status, `${label}.status`),
  };
  if (typeof item.url === "string") result.url = item.url;
  if (typeof item.path === "string") result.path = item.path;
  if (Boolean(result.url) === Boolean(result.path)) {
    throw new CascadeError(`${label} must declare exactly one of url or path`);
  }
  if (result.url) {
    let parsed: URL;
    try {
      parsed = new URL(result.url);
    } catch {
      throw new CascadeError(`${label}.url is invalid`);
    }
    if (parsed.protocol !== "https:") throw new CascadeError(`${label}.url must use https`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(result.reference_date)) {
    throw new CascadeError(`${label}.reference_date must use YYYY-MM-DD`);
  }
  const parsedDate = new Date(`${result.reference_date}T00:00:00Z`);
  if (Number.isNaN(parsedDate.valueOf()) || parsedDate.toISOString().slice(0, 10) !== result.reference_date) {
    throw new CascadeError(`${label}.reference_date must be a real calendar date`);
  }
  for (const support of result.supports) {
    if (!/^[A-Z][A-Z0-9]*-\d{3}$/.test(support)) {
      throw new CascadeError(`${label}.supports contains an invalid contract ID: ${support}`);
    }
  }
  unique(result.supports, `${label}.supports`);
  const authorityByKind: Record<string, string> = {
    "user-provided": "product",
    "approved-product": "product",
    "primary-research": "methodological",
    "peer-reviewed-research": "methodological",
    "harness-evaluation": "harness-only",
    "harness-simulation": "mechanics-only",
    "product-simulation": "target-product",
    "synthetic-proposal": "proposal-only",
  };
  if (authorityByKind[result.kind] !== result.authority) {
    throw new CascadeError(`${label} has incompatible kind and authority`);
  }
  if (!["provided", "reviewed", "validated", "executed", "not-run"].includes(result.status)) {
    throw new CascadeError(`${label}.status is invalid: ${result.status}`);
  }
  return result;
}

export function validateBriefManifestShape(value: unknown): BriefManifest {
  const manifest = object(value, "brief manifest");
  exactKeys(
    manifest,
    ["schema_version", "brief_id", "revision", "status", "title", "catalog_path", "domain_id", "capability_id", "coverage_mode", "purpose", "audiences", "product_refs", "omissions", "source_documents", "evidence", "pattern_context", "simulation_context", "gaps", "non_goals", "output_path"],
    "brief manifest",
  );
  if (manifest.schema_version !== 1) throw new CascadeError("brief schema_version must be 1");
  const refs = object(manifest.product_refs, "brief product_refs");
  exactKeys(refs, ["requirement_ids", "journey_ids", "scenario_ids", "persona_ids"], "brief product_refs");
  const coverage = string(manifest.coverage_mode, "brief coverage_mode");
  if (coverage !== "complete" && coverage !== "selected") {
    throw new CascadeError(`brief coverage_mode is invalid: ${coverage}`);
  }
  const omissions = (manifest.omissions as unknown[] | undefined)?.map((value, index) => {
    const item = object(value, `omissions[${index}]`);
    exactKeys(item, ["ref_id", "reason"], `omissions[${index}]`);
    return {
      ref_id: id(item.ref_id, /^(?:PR|J|PS|P)-\d{3}$/, `omissions[${index}].ref_id`),
      reason: string(item.reason, `omissions[${index}].reason`),
    };
  }) ?? [];
  const patternContext = (manifest.pattern_context as unknown[] | undefined)?.map((value, index) => {
    const item = object(value, `pattern_context[${index}]`);
    exactKeys(item, ["pack_id", "section_ids"], `pattern_context[${index}]`);
    return {
      pack_id: string(item.pack_id, `pattern_context[${index}].pack_id`),
      section_ids: stringArray(item.section_ids, `pattern_context[${index}].section_ids`),
    };
  }) ?? [];
  const simulationContext = (manifest.simulation_context as unknown[] | undefined)?.map((value, index) => {
    const item = object(value, `simulation_context[${index}]`);
    exactKeys(item, ["path", "scope", "authority", "status", "purpose"], `simulation_context[${index}]`);
    const result = {
      path: string(item.path, `simulation_context[${index}].path`),
      scope: string(item.scope, `simulation_context[${index}].scope`) as BriefManifest["simulation_context"][number]["scope"],
      authority: string(item.authority, `simulation_context[${index}].authority`) as BriefManifest["simulation_context"][number]["authority"],
      status: string(item.status, `simulation_context[${index}].status`),
      purpose: string(item.purpose, `simulation_context[${index}].purpose`),
    };
    const expected = {
      "contract-test": "implementation",
      "harness-evaluation": "harness-only",
      "harness-simulation": "mechanics-only",
      "product-simulation": "target-product",
    } as const;
    if (!(result.scope in expected) || expected[result.scope] !== result.authority) {
      throw new CascadeError(`simulation_context[${index}] has incompatible scope and authority`);
    }
    const pathPrefix = {
      "contract-test": "scripts/cascade/",
      "harness-evaluation": "harness-evals/",
      "harness-simulation": "product-evals/simulations/harness/",
      "product-simulation": "product-evals/simulations/product/",
    } as const;
    if (!result.path.startsWith(pathPrefix[result.scope])) {
      throw new CascadeError(`simulation_context[${index}].path must be under ${pathPrefix[result.scope]}`);
    }
    if (!["authored", "validated", "executed", "reviewed", "accepted", "not-run"].includes(result.status)) {
      throw new CascadeError(`simulation_context[${index}].status is invalid: ${result.status}`);
    }
    return result;
  }) ?? [];
  const result: BriefManifest = {
    schema_version: 1,
    brief_id: id(manifest.brief_id, /^PB-\d{3}$/, "brief_id"),
    revision: Number(manifest.revision),
    status: assertStatus(manifest.status, "brief status"),
    title: string(manifest.title, "brief title"),
    catalog_path: string(manifest.catalog_path, "brief catalog_path"),
    domain_id: id(manifest.domain_id, /^PD-\d{3}$/, "brief domain_id"),
    capability_id: id(manifest.capability_id, /^PC-\d{3}$/, "brief capability_id"),
    coverage_mode: coverage,
    purpose: string(manifest.purpose, "brief purpose"),
    audiences: nonEmptyStringArray(manifest.audiences, "brief audiences"),
    product_refs: {
      requirement_ids: stringArray(refs.requirement_ids, "brief requirement_ids"),
      journey_ids: stringArray(refs.journey_ids, "brief journey_ids"),
      scenario_ids: stringArray(refs.scenario_ids, "brief scenario_ids"),
      persona_ids: stringArray(refs.persona_ids, "brief persona_ids"),
    },
    omissions,
    source_documents: nonEmptyStringArray(manifest.source_documents, "brief source_documents"),
    evidence: (manifest.evidence as unknown[] | undefined)?.map(validateEvidence) ?? [],
    pattern_context: patternContext,
    simulation_context: simulationContext,
    gaps: stringArray(manifest.gaps, "brief gaps"),
    non_goals: nonEmptyStringArray(manifest.non_goals, "brief non_goals"),
    output_path: string(manifest.output_path, "brief output_path"),
  };
  if (!Number.isInteger(result.revision) || result.revision < 1) {
    throw new CascadeError("brief revision must be a positive integer");
  }
  for (const [key, values] of Object.entries(result.product_refs)) unique(values, `brief ${key}`);
  unique(result.omissions.map((item) => item.ref_id), "brief omissions");
  unique(result.evidence.map((item) => item.id), "brief evidence IDs");
  unique(result.source_documents, "brief source documents");
  return result;
}

export function validateEvidenceSupportBindings(
  evidence: BriefEvidence[],
  sources: Array<{ path: string; content: string }>,
): void {
  const available = new Set<string>();
  for (const source of sources) {
    for (const match of source.content.matchAll(/\b[A-Z][A-Z0-9]*-\d{3}\b/g)) {
      available.add(match[0]);
    }
  }
  for (const item of evidence) {
    for (const support of item.supports) {
      if (!available.has(support)) {
        throw new CascadeError(`${item.id} support does not resolve in selected source documents: ${support}`);
      }
    }
  }
}

async function briefPaths(): Promise<string[]> {
  return (
    await walkFiles(rootPath("docs/specs"), {
      include: (path) => basename(path) === "brief.yaml",
    })
  ).sort();
}

async function resolveBriefPath(value: string): Promise<string> {
  const paths = await briefPaths();
  const direct = resolve(ROOT, value);
  if (paths.includes(direct)) return direct;
  const matches: string[] = [];
  for (const path of paths) {
    const source = await loadBoundedYaml<unknown>(path, "brief manifest");
    const manifest = validateBriefManifestShape(source.value);
    if (manifest.brief_id === value) matches.push(path);
  }
  if (matches.length !== 1) throw new CascadeError(`brief does not resolve once: ${value}`);
  return matches[0]!;
}

function sameValues(left: string[], right: string[]): boolean {
  return [...left].sort().join("\n") === [...right].sort().join("\n");
}

function allCapabilityRefs(capability: ProductCapability): string[] {
  return [
    ...capability.requirement_ids,
    ...capability.journey_ids,
    ...capability.scenario_ids,
    ...capability.persona_ids,
  ];
}

export function validateBriefCoverage(
  manifest: BriefManifest,
  capability: ProductCapability,
): void {
  const selected = [
    ...manifest.product_refs.requirement_ids,
    ...manifest.product_refs.journey_ids,
    ...manifest.product_refs.scenario_ids,
    ...manifest.product_refs.persona_ids,
  ];
  const owned = allCapabilityRefs(capability);
  const omissionIds = manifest.omissions.map((item) => item.ref_id);
  if (manifest.coverage_mode === "complete") {
    if (!sameValues(selected, owned)) {
      throw new CascadeError(`complete brief ${manifest.brief_id} must cover the exact capability references`);
    }
    if (omissionIds.length) throw new CascadeError("complete brief cannot declare omissions");
  } else {
    if (!selected.length) throw new CascadeError("selected brief must include a product reference");
    const expectedOmissions = owned.filter((item) => !selected.includes(item));
    if (!sameValues(expectedOmissions, omissionIds)) {
      throw new CascadeError("selected brief must explain every omitted capability reference exactly once");
    }
  }
  for (const value of selected) {
    if (!owned.includes(value)) throw new CascadeError(`brief selects reference outside capability: ${value}`);
  }
}

export function validateCompleteBriefBindings(
  manifest: BriefManifest,
  capability: ProductCapability,
): void {
  if (manifest.coverage_mode !== "complete") return;
  const missingSources = capability.source_paths.filter(
    (source) => !manifest.source_documents.includes(source),
  );
  if (missingSources.length) {
    throw new CascadeError(`complete brief omits capability source paths: ${missingSources.join(", ")}`);
  }
  const selectedEvaluationPaths = new Set(manifest.simulation_context.map((item) => item.path));
  const missingEvaluations = capability.evaluation_refs
    .map((item) => item.path)
    .filter((source) => !selectedEvaluationPaths.has(source));
  if (missingEvaluations.length) {
    throw new CascadeError(`complete brief omits capability evaluation references: ${missingEvaluations.join(", ")}`);
  }
}

export async function resolveBrief(value: string): Promise<ResolvedBrief> {
  const path = await resolveBriefPath(value);
  const source = await loadBoundedYaml<unknown>(path, "brief manifest");
  const manifest = validateBriefManifestShape(source.value);
  if (/^PB-\d{3}$/.test(value) && manifest.brief_id !== value) {
    throw new CascadeError(`brief identity changed while resolving: ${value}`);
  }
  if (manifest.catalog_path !== "docs/product/catalog.yaml") {
    throw new CascadeError("brief must use docs/product/catalog.yaml");
  }
  const expectedOutput = rel(resolve(dirname(path), "brief.generated.md"));
  if (manifest.output_path !== expectedOutput) {
    throw new CascadeError(`brief output_path must be ${expectedOutput}`);
  }
  const catalog = await loadAndValidateProductCatalog();
  const domain = catalog.domains.find((item) => item.id === manifest.domain_id);
  const capability = catalog.capabilities.find((item) => item.id === manifest.capability_id);
  if (!domain) throw new CascadeError(`brief references unknown domain: ${manifest.domain_id}`);
  if (!capability) throw new CascadeError(`brief references unknown capability: ${manifest.capability_id}`);
  if (capability.domain_id !== domain.id) {
    throw new CascadeError(`brief capability ${capability.id} does not belong to ${domain.id}`);
  }
  validateBriefCoverage(manifest, capability);
  validateCompleteBriefBindings(manifest, capability);
  const tables = await productTables();
  const personas = await personaPaths();
  selectRows(tables.requirements, manifest.product_refs.requirement_ids, "requirement");
  selectRows(tables.journeys, manifest.product_refs.journey_ids, "journey");
  selectRows(tables.scenarios, manifest.product_refs.scenario_ids, "scenario");
  for (const personaId of manifest.product_refs.persona_ids) {
    if (!personas.has(personaId)) throw new CascadeError(`persona reference does not resolve: ${personaId}`);
  }
  const sourceDigests: Array<{ path: string; sha256: string }> = [];
  const sourceContents: Array<{ path: string; content: string }> = [];
  for (const source of manifest.source_documents) {
    const absolute = await assertRepoFile(source, "brief source", "docs/");
    sourceDigests.push({ path: source, sha256: await sha256File(absolute) });
    sourceContents.push({ path: source, content: await readText(absolute) });
  }
  validateEvidenceSupportBindings(manifest.evidence, sourceContents);
  for (const evidence of manifest.evidence) {
    if (evidence.path) await assertRepoFile(evidence.path, `${evidence.id} evidence`);
  }
  const simulationDigests: Array<{ path: string; sha256: string }> = [];
  for (const simulation of manifest.simulation_context) {
    const absolute = await assertRepoFile(simulation.path, "simulation context");
    simulationDigests.push({ path: simulation.path, sha256: await sha256File(absolute) });
  }
  const evaluationDigests: Array<{ path: string; sha256: string }> = [];
  for (const evaluation of capability.evaluation_refs) {
    const absolute = await assertRepoFile(evaluation.path, "capability evaluation reference");
    evaluationDigests.push({ path: evaluation.path, sha256: await sha256File(absolute) });
  }
  const compilerContractPaths = [
    "docs/product/catalog.schema.json",
    "docs/specs/brief-manifest.schema.json",
    "scripts/cascade/briefs.ts",
    "scripts/cascade/patterns.ts",
  ];
  const compilerContractDigests = await Promise.all(
    compilerContractPaths.map(async (contractPath) => ({
      path: contractPath,
      sha256: await sha256File(await assertRepoFile(contractPath, "brief compiler contract")),
    })),
  );
  const patternSections = await compilePatternSelections(manifest.pattern_context);
  return {
    path,
    manifestSha256: source.sha256,
    manifest,
    catalog,
    domain,
    capability,
    tables,
    personaPaths: personas,
    patternSections,
    sourceDigests,
    simulationDigests,
    evaluationDigests,
    compilerContractDigests,
  };
}

function escapeCell(value: string): string {
  return value.replaceAll("|", "\\|").replaceAll("\n", " ");
}

function renderTable(table: MarkdownTable): string[] {
  if (!table.rows.length) return ["_None selected._"];
  return [
    `| ${table.headers.map(escapeCell).join(" | ")} |`,
    `|${table.headers.map(() => "---").join("|")}|`,
    ...table.rows.map((row) => `| ${row.map(escapeCell).join(" | ")} |`),
  ];
}

function renderBullets(values: string[], empty: string): string[] {
  return values.length ? values.map((value) => `- ${value}`) : [`- ${empty}`];
}

function sectionBody(content: string): string {
  const lines = content.split("\n");
  if (/^#{1,6}\s/.test(lines[0] ?? "")) lines.shift();
  while (!lines[0]?.trim()) lines.shift();
  return lines.join("\n");
}

async function renderBrief(resolved: ResolvedBrief): Promise<string> {
  const { manifest, catalog, domain, capability } = resolved;
  const requirements = selectRows(
    resolved.tables.requirements,
    manifest.product_refs.requirement_ids,
    "requirement",
  );
  const journeys = selectRows(resolved.tables.journeys, manifest.product_refs.journey_ids, "journey");
  const scenarios = selectRows(resolved.tables.scenarios, manifest.product_refs.scenario_ids, "scenario");
  const personaRecords = await Promise.all(
    manifest.product_refs.persona_ids.map(async (personaId) => {
      const path = resolved.personaPaths.get(personaId)!;
      return [personaId, `\`${path}\``, await sha256File(rootPath(path))];
    }),
  );
  const catalogDigest = valueDigest(catalog);
  const manifestDigest = valueDigest(manifest);
  const selectedSourceDigest = valueDigest({
    catalog,
    manifest,
    requirements: requirements.rows,
    journeys: journeys.rows,
    scenarios: scenarios.rows,
    personas: personaRecords,
    source_documents: resolved.sourceDigests,
    simulation_context: resolved.simulationDigests,
    capability_evaluations: resolved.evaluationDigests,
    compiler_contracts: resolved.compilerContractDigests,
    pattern_context: resolved.patternSections.map((item) => ({
      pack_id: item.pack_id,
      section_id: item.section_id,
      source_path: item.source_path,
      content: item.content,
    })),
  });
  const compilerContractDigest = valueDigest(resolved.compilerContractDigests);
  const lines: string[] = [
    `# Product Brief: ${manifest.title}`,
    "",
    "> Generated projection. The linked product and spec sources remain authoritative.",
    "> Harness and synthetic evidence retain their limited authority and cannot establish product-persona truth.",
    "",
    `- Brief: \`${manifest.brief_id}\` revision \`${manifest.revision}\``,
    `- Status: \`${manifest.status}\``,
    `- Coverage: \`${manifest.coverage_mode}\``,
    `- Catalog digest: \`${catalogDigest}\``,
    `- Manifest digest: \`${manifestDigest}\``,
    `- Selected-source digest: \`${selectedSourceDigest}\``,
    `- Compiler-contract digest: \`${compilerContractDigest}\``,
    "",
    "## Purpose And Audience",
    "",
    manifest.purpose,
    "",
    ...renderBullets(manifest.audiences, "No audience declared."),
    "",
    "## Domain And Capability",
    "",
    `- Domain \`${domain.id}\`: **${domain.name}** — ${domain.summary}`,
    `- Capability \`${capability.id}\`: **${capability.name}** — ${capability.summary}`,
    `- Owner: ${capability.owner}`,
    `- Capability status: \`${capability.status}\``,
    "",
    "## Source Documents",
    "",
    "| Path | SHA-256 |",
    "|---|---|",
    ...resolved.sourceDigests.map((item) => `| \`${item.path}\` | \`${item.sha256}\` |`),
    "",
    "## Requirements",
    "",
    ...renderTable(requirements),
    "",
    "## Journeys",
    "",
    ...renderTable(journeys),
    "",
    "## Scenarios",
    "",
    ...renderTable(scenarios),
    "",
    "## Personas",
    "",
    ...(personaRecords.length
      ? renderTable({ headers: ["ID", "Path", "SHA-256"], rows: personaRecords })
      : ["_No reviewed non-fixture product persona is selected._"]),
    "",
    "## Evidence Ledger",
    "",
    "| ID | Kind / authority | Status | Source | Supports | Limitation |",
    "|---|---|---|---|---|---|",
    ...manifest.evidence.map((item) =>
      `| \`${item.id}\` | \`${item.kind}\` / \`${item.authority}\` | \`${item.status}\` | ${item.url ? `[${escapeCell(item.title)}](${item.url})` : `\`${item.path}\``} | ${escapeCell(item.supports.join(", "))} | ${escapeCell(item.limitations)} |`,
    ),
    ...(manifest.evidence.length ? [] : ["| _none_ | | | | | |"]),
    "",
    "## Simulation And Evaluation Context",
    "",
    "| Path | Scope / authority | Status | Purpose | SHA-256 |",
    "|---|---|---|---|---|",
    ...manifest.simulation_context.map((item, index) =>
      `| \`${item.path}\` | \`${item.scope}\` / \`${item.authority}\` | \`${item.status}\` | ${escapeCell(item.purpose)} | \`${resolved.simulationDigests[index]!.sha256}\` |`,
    ),
    ...(manifest.simulation_context.length ? [] : ["| _none_ | | | | |"]),
    "",
    "## Capability Evaluation References",
    "",
    "| Path | Kind / authority | Status | SHA-256 |",
    "|---|---|---|---|",
    ...capability.evaluation_refs.map((item, index) =>
      `| \`${item.path}\` | \`${item.kind}\` / \`${item.authority}\` | \`${item.status}\` | \`${resolved.evaluationDigests[index]!.sha256}\` |`,
    ),
    ...(capability.evaluation_refs.length ? [] : ["| _none_ | | | |"]),
    "",
    "## Gaps",
    "",
    ...renderBullets(manifest.gaps, "No declared gap."),
    "",
    "## Non-Goals",
    "",
    ...renderBullets(manifest.non_goals, "No non-goal declared."),
    "",
    "## Reusable Context",
    "",
  ];
  for (const section of resolved.patternSections) {
    lines.push(
      `### ${section.pack_id} / ${section.section_id}`,
      "",
      `Source boundary: \`${section.source_path}\``,
      "",
      sectionBody(section.content),
      "",
    );
  }
  return `${lines.join("\n").trimEnd()}\n`;
}

export async function generateBrief(value: string): Promise<string> {
  return renderBrief(await resolveBrief(value));
}

export async function resolveCurrentBriefProjection(
  value: string,
): Promise<ResolvedCurrentBriefProjection> {
  const resolved = await resolveBrief(value);
  const generated = await renderBrief(resolved);
  const output = await readBoundedUtf8(
    rootPath(resolved.manifest.output_path),
    `${resolved.manifest.brief_id} generated brief projection`,
    MAX_BRIEF_PROJECTION_BYTES,
  );
  return {
    resolved,
    generated,
    currentOutput: output.text,
    binding: {
      brief_path: rel(resolved.path),
      brief_id: resolved.manifest.brief_id,
      revision: resolved.manifest.revision,
      sha256: resolved.manifestSha256,
      output_path: resolved.manifest.output_path,
      output_sha256: output.sha256,
      domain_id: resolved.manifest.domain_id,
      capability_id: resolved.manifest.capability_id,
      product_refs: structuredClone(resolved.manifest.product_refs),
    },
  };
}

export async function validateBriefRepository(checkGenerated = true): Promise<string[]> {
  const errors: string[] = [];
  try {
    await assertRepoFile(rel(BRIEF_SCHEMA_PATH), "brief schema");
    await loadAndValidateProductCatalog();
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
    return errors;
  }
  const ids = new Set<string>();
  for (const path of await briefPaths()) {
    try {
      const manifest = validateBriefManifestShape(await loadYaml<unknown>(path, "brief manifest"));
      if (ids.has(manifest.brief_id)) throw new CascadeError(`duplicate brief ID: ${manifest.brief_id}`);
      ids.add(manifest.brief_id);
      const generated = await generateBrief(rel(path));
      if (checkGenerated) {
        if (!(await exists(rootPath(manifest.output_path)))) {
          throw new CascadeError(`generated brief is missing: ${manifest.output_path}`);
        }
        if ((await readText(rootPath(manifest.output_path))) !== generated) {
          throw new CascadeError(`generated brief is stale: ${manifest.output_path}`);
        }
      }
    } catch (error) {
      errors.push(`${rel(path)}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  if (!ids.size) errors.push("no product brief manifests found");
  return errors;
}

export async function main(argv: string[]): Promise<number> {
  const args = parseArgs(argv);
  const [command = "list", target] = args.positionals;
  if (command === "list") {
    console.log("brief_id\tstatus\tdomain_id\tcapability_id\tpath\toutput_path");
    for (const path of await briefPaths()) {
      const manifest = validateBriefManifestShape(await loadYaml<unknown>(path, "brief manifest"));
      console.log([
        manifest.brief_id,
        manifest.status,
        manifest.domain_id,
        manifest.capability_id,
        rel(path),
        manifest.output_path,
      ].join("\t"));
    }
    return 0;
  }
  if (command === "check") {
    const errors = await validateBriefRepository(true);
    if (errors.length) throw new CascadeError(errors.join("; "));
    console.log(`product_brief_status=PASS briefs=${(await briefPaths()).length}`);
    return 0;
  }
  if (!target) throw new CascadeError(`brief ${command} requires a brief ID or path`);
  if (command === "validate") {
    const resolved = await resolveBrief(target);
    console.log(
      `product_brief_validation_status=PASS brief=${resolved.manifest.brief_id} ` +
        `domain=${resolved.domain.id} capability=${resolved.capability.id}`,
    );
    return 0;
  }
  if (command === "generate") {
    const resolved = await resolveBrief(target);
    const generated = await generateBrief(target);
    const output = rootPath(resolved.manifest.output_path);
    if (boolFlag(args, "check")) {
      if (!(await exists(output))) throw new CascadeError(`generated brief is missing: ${rel(output)}`);
      if ((await readText(output)) !== generated) throw new CascadeError(`generated brief is stale: ${rel(output)}`);
      console.log(`product_brief_generation_status=PASS brief=${resolved.manifest.brief_id} output=${rel(output)}`);
      return 0;
    }
    if (boolFlag(args, "write")) {
      await mkdir(dirname(output), { recursive: true });
      await writeFile(output, generated, "utf8");
      console.log(`product_brief_generation_status=WRITTEN brief=${resolved.manifest.brief_id} output=${rel(output)}`);
      return 0;
    }
    process.stdout.write(generated);
    return 0;
  }
  throw new CascadeError(`unknown brief command: ${command}`);
}
