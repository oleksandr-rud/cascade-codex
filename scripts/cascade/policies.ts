import { readdir } from "node:fs/promises";

import {
  ADMISSION_CONTROL_SOURCE_FILE,
  ADMISSION_POLICY_SOURCE_FILE,
  loadAdmissionControlCatalog,
  loadAdmissionPolicyBundle,
  validateAdmissionRepository,
} from "./admission";
import {
  CascadeError,
  boolFlag,
  flag,
  parseArgs,
  rootPath,
  sha256Text,
  stableJson,
} from "./common";
import {
  type PolicyDefinition,
  type SimulationArtifactPolicy,
  validatePolicy,
  validateSimulationArtifactPolicy,
} from "./simulation-definitions";
import { readStructured, stringifyYaml } from "./structured-data";

export const PRODUCT_ARTIFACT_POLICY_FILE = "product-evals/artifact-policy.yaml";
export const PRODUCT_POLICY_DIRECTORY = "product-evals/policies";

type PolicyScope = "admission" | "product" | "all";
type OutputFormat = "json" | "yaml";
type JsonObject = Record<string, any>;

export interface ProductPolicyEntry {
  source_file: string;
  policy: PolicyDefinition;
}

function objectValue(value: unknown, label: string): JsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new CascadeError(`${label} must be an object`);
  }
  return value as JsonObject;
}

function policyScope(value: string | undefined): PolicyScope {
  const scope = value ?? "all";
  if (scope !== "admission" && scope !== "product" && scope !== "all") {
    throw new CascadeError("--scope must be admission, product, or all");
  }
  return scope;
}

function outputFormat(value: string | undefined): OutputFormat {
  const format = value ?? "json";
  if (format !== "json" && format !== "yaml") {
    throw new CascadeError("--format must be json or yaml");
  }
  return format;
}

function printStructured(value: unknown, format: OutputFormat): void {
  console.log(format === "yaml" ? stringifyYaml(value).trimEnd() : stableJson(value, true));
}

export async function loadProductArtifactPolicy(): Promise<SimulationArtifactPolicy> {
  const value = objectValue(
    await readStructured(rootPath(PRODUCT_ARTIFACT_POLICY_FILE), PRODUCT_ARTIFACT_POLICY_FILE),
    PRODUCT_ARTIFACT_POLICY_FILE,
  );
  validateSimulationArtifactPolicy(value, PRODUCT_ARTIFACT_POLICY_FILE);
  return value as SimulationArtifactPolicy;
}

export async function loadProductPolicyRegistry(): Promise<ProductPolicyEntry[]> {
  const directoryEntries = await readdir(rootPath(PRODUCT_POLICY_DIRECTORY));
  const unexpected = directoryEntries.filter((name) =>
    name !== "schema.json"
    && name !== "confirmation-receipt.schema.json"
    && !name.endsWith(".yaml")
  );
  if (unexpected.length) {
    throw new CascadeError(
      `product policy registry contains unsupported source files: ${unexpected.sort().join(", ")}`,
    );
  }
  const names = directoryEntries
    .filter((name) => name.endsWith(".yaml"))
    .sort();
  const entries = await Promise.all(names.map(async (name) => {
    const sourceFile = `${PRODUCT_POLICY_DIRECTORY}/${name}`;
    const value = objectValue(await readStructured(rootPath(sourceFile), sourceFile), sourceFile);
    validatePolicy(value, sourceFile);
    if (`${value.id}.yaml` !== name) {
      throw new CascadeError(`${sourceFile} filename must match policy id ${value.id}`);
    }
    return { source_file: sourceFile, policy: value as PolicyDefinition };
  }));
  const ids = entries.map((entry) => entry.policy.id);
  if (new Set(ids).size !== ids.length) {
    throw new CascadeError("product policy registry contains duplicate IDs");
  }
  return entries;
}

export async function compilePolicyComposition(scope: PolicyScope = "all"): Promise<JsonObject> {
  if (scope === "admission" || scope === "all") {
    await validateAdmissionRepository();
  }
  const composition: JsonObject = {
    schema_version: 1,
    artifact_type: "cascade-policy-composition",
  };
  if (scope === "admission" || scope === "all") {
    composition.admission = {
      policy_source: ADMISSION_POLICY_SOURCE_FILE,
      control_source: ADMISSION_CONTROL_SOURCE_FILE,
      bundle: await loadAdmissionPolicyBundle(),
      controls: await loadAdmissionControlCatalog(),
    };
  }
  if (scope === "product" || scope === "all") {
    composition.product_evals = {
      artifact_policy_source: PRODUCT_ARTIFACT_POLICY_FILE,
      artifact_policy: await loadProductArtifactPolicy(),
      policies: await loadProductPolicyRegistry(),
    };
  }
  return {
    ...composition,
    digest: sha256Text(stableJson(composition)),
  };
}

async function validatePolicies(scope: PolicyScope): Promise<JsonObject> {
  const result: JsonObject = { status: "PASS", scope };
  if (scope === "admission" || scope === "all") {
    result.admission = await validateAdmissionRepository();
  }
  if (scope === "product" || scope === "all") {
    const [artifactPolicy, policies] = await Promise.all([
      loadProductArtifactPolicy(),
      loadProductPolicyRegistry(),
    ]);
    result.product = {
      artifact_policy: artifactPolicy.schema_version,
      policy_count: policies.length,
    };
  }
  return result;
}

async function listPolicies(scope: PolicyScope): Promise<JsonObject[]> {
  const items: JsonObject[] = [];
  if (scope === "admission" || scope === "all") {
    await validateAdmissionRepository();
    const bundle = await loadAdmissionPolicyBundle();
    for (const policy of bundle.policies) {
      items.push({
        scope: "admission",
        id: policy.id,
        version: policy.version,
        decision: policy.priority,
        source_file: ADMISSION_POLICY_SOURCE_FILE,
      });
    }
  }
  if (scope === "product" || scope === "all") {
    for (const entry of await loadProductPolicyRegistry()) {
      items.push({
        scope: "product",
        id: entry.policy.id,
        version: entry.policy.version,
        decision: entry.policy.effect,
        source_file: entry.source_file,
      });
    }
  }
  return items;
}

async function extractPolicy(id: string, scope: PolicyScope): Promise<JsonObject> {
  const matches: JsonObject[] = [];
  if (scope === "admission" || scope === "all") {
    await validateAdmissionRepository();
    const bundle = await loadAdmissionPolicyBundle();
    const policy = bundle.policies.find((candidate: JsonObject) => candidate.id === id);
    if (policy) matches.push({ scope: "admission", source_file: ADMISSION_POLICY_SOURCE_FILE, policy });
  }
  if (scope === "product" || scope === "all") {
    const entry = (await loadProductPolicyRegistry()).find((candidate) => candidate.policy.id === id);
    if (entry) matches.push({ scope: "product", ...entry });
  }
  if (!matches.length) throw new CascadeError(`policy not found: ${id}`);
  if (matches.length > 1) throw new CascadeError(`policy id is ambiguous across scopes: ${id}`);
  return matches[0]!;
}

export async function main(argv: string[]): Promise<number> {
  const [command, ...rest] = argv;
  const args = parseArgs(rest);
  const scope = policyScope(flag(args, "scope"));
  const format = outputFormat(flag(args, "format"));
  if (command === "validate") {
    printStructured(await validatePolicies(scope), format);
    return 0;
  }
  if (command === "list") {
    printStructured(await listPolicies(scope), format);
    return 0;
  }
  if (command === "extract") {
    const id = flag(args, "id") ?? args.positionals[0];
    if (!id) throw new CascadeError("policy extract requires --id POLICY_ID");
    printStructured(await extractPolicy(id, scope), format);
    return 0;
  }
  if (command === "compile") {
    const composition = await compilePolicyComposition(scope);
    if (boolFlag(args, "check")) {
      console.log(`policy_compile_status=PASS scope=${scope} digest=${composition.digest}`);
    } else {
      printStructured(composition, format);
    }
    return 0;
  }
  console.log("Usage: bun scripts/cascade.ts policy <validate|list|extract|compile> [--scope admission|product|all] [--format json|yaml] [--id POLICY_ID] [--check]");
  return command ? 1 : 0;
}
