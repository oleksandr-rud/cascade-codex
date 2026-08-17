import {
  chmod,
  copyFile,
  link,
  lstat,
  mkdir,
  open,
  readdir,
  readFile,
  realpath,
  rename,
  stat,
  unlink,
  writeFile,
} from "node:fs/promises";
import { constants } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

export class CascadeError extends Error {}

export const CONFIRMATION_SECRET_MIN_BYTES = 32;
export const CONFIRMATION_SECRET_MAX_BYTES = 512;

/**
 * Confirmation HMAC keys cross environment, signing, and verification seams as
 * strings. Restricting them to visible US-ASCII makes that string-to-byte
 * mapping canonical and rejects Unicode normalization, replacement-character,
 * whitespace, and short-key ambiguity before cryptographic use.
 */
export function confirmationSecretBytes(
  value: unknown,
  label = "confirmation secret",
): Buffer {
  if (typeof value !== "string" || !/^[\x21-\x7e]+$/.test(value)) {
    throw new CascadeError(
      `${label} must use visible US-ASCII bytes only`,
    );
  }
  const bytes = Buffer.from(value, "ascii");
  if (
    bytes.byteLength < CONFIRMATION_SECRET_MIN_BYTES ||
    bytes.byteLength > CONFIRMATION_SECRET_MAX_BYTES
  ) {
    throw new CascadeError(
      `${label} must be ${CONFIRMATION_SECRET_MIN_BYTES} to ${CONFIRMATION_SECRET_MAX_BYTES} bytes`,
    );
  }
  return bytes;
}

export function assertNoExactConfirmationSecretBytes(
  bytes: Uint8Array,
  secrets: readonly (string | Uint8Array)[],
  label: string,
): void {
  const packet = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (const [index, secret] of secrets.entries()) {
    const keyBytes =
      typeof secret === "string"
        ? confirmationSecretBytes(secret, `confirmation secret ${index + 1}`)
        : Buffer.from(secret.buffer, secret.byteOffset, secret.byteLength);
    if (packet.includes(keyBytes)) {
      throw new CascadeError(`${label} contains exact confirmation key bytes`);
    }
  }
}

export function rootPath(...parts: string[]): string {
  return resolve(ROOT, ...parts);
}

export function rel(path: string, root = ROOT): string {
  const value = relative(root, resolve(path));
  return value.split(sep).join("/") || ".";
}

export async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

export async function isFile(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
}

export async function isDirectory(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isDirectory();
  } catch {
    return false;
  }
}

export async function readText(path: string): Promise<string> {
  return readFile(path, "utf8");
}

export async function readJson<T = unknown>(path: string): Promise<T> {
  try {
    return JSON.parse(await readText(path)) as T;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new CascadeError(`invalid JSON ${rel(path)}: ${detail}`);
  }
}

export type JsonSchema = Record<string, unknown>;
type JsonSchemaNode = JsonSchema | boolean;

export const CASCADE_PAIRWISE_DISTINCT_VOCABULARY_ID =
  "https://cascade.local/vocab/pairwise-distinct-fields/v1";
export const CASCADE_RUN_ARTIFACT_META_SCHEMA_ID =
  "https://cascade.local/meta/campaign-run-artifact/v1";
export const CASCADE_PAIRWISE_DISTINCT_KEYWORD =
  "x-cascade-pairwise-distinct-fields";

const PAIRWISE_PRINCIPAL_PROPERTIES = [
  "operator",
  "specialized_evaluator",
  "evaluator",
  "aggregator",
  "target",
  "simulator",
  "recovery",
] as const;
const PAIRWISE_PRINCIPAL_FIELDS = ["session_id", "subject"] as const;
const UNSAFE_JSON_PROPERTY_NAMES = new Set([
  "__proto__",
  "prototype",
  "constructor",
]);

// Assertion-bearing Draft 2020-12 vocabularies required by Cascade's custom
// run-artifact dialect. Keeping the inventory explicit prevents newly seen
// standard assertions from becoming ignored annotations by accident.
const DRAFT_2020_12_APPLICATOR_ASSERTIONS = [
  "prefixItems",
  "items",
  "contains",
  "additionalProperties",
  "properties",
  "patternProperties",
  "dependentSchemas",
  "propertyNames",
  "if",
  "then",
  "else",
  "allOf",
  "anyOf",
  "oneOf",
  "not",
] as const;
const DRAFT_2020_12_UNEVALUATED_ASSERTIONS = [
  "unevaluatedItems",
  "unevaluatedProperties",
] as const;
const DRAFT_2020_12_VALIDATION_ASSERTIONS = [
  "type",
  "const",
  "enum",
  "multipleOf",
  "maximum",
  "exclusiveMaximum",
  "minimum",
  "exclusiveMinimum",
  "maxLength",
  "minLength",
  "pattern",
  "maxItems",
  "minItems",
  "uniqueItems",
  "maxContains",
  "minContains",
  "maxProperties",
  "minProperties",
  "required",
  "dependentRequired",
] as const;
const DRAFT_2020_12_ASSERTIONS = new Set<string>([
  ...DRAFT_2020_12_APPLICATOR_ASSERTIONS,
  ...DRAFT_2020_12_UNEVALUATED_ASSERTIONS,
  ...DRAFT_2020_12_VALIDATION_ASSERTIONS,
]);
const SUPPORTED_DRAFT_2020_12_ASSERTIONS = new Set<string>([
  ...DRAFT_2020_12_APPLICATOR_ASSERTIONS,
  ...DRAFT_2020_12_VALIDATION_ASSERTIONS,
]);
const JSON_SCHEMA_MAX_GRAPH_NODES = 100_000;
const JSON_SCHEMA_MAX_ARRAY_LENGTH = 100_000;
const JSON_SCHEMA_MAX_DEPTH = 256;
const JSON_SCHEMA_MAX_EVALUATION_STEPS = 100_000;

function hasOwn(value: object, key: PropertyKey): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeJsonSchemaGraph(
  value: unknown,
  label: string,
  normalized = new WeakMap<object, unknown>(),
  active = new WeakSet<object>(),
  budget = { nodes: 0 },
  depth = 0,
): unknown {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new CascadeError(`${label} contains a non-finite schema value`);
    }
    return value;
  }
  if (typeof value !== "object") {
    throw new CascadeError(`${label} contains an unsupported schema value`);
  }
  if (depth > JSON_SCHEMA_MAX_DEPTH) {
    throw new CascadeError(`${label} exceeds the schema graph depth limit`);
  }
  if (active.has(value)) {
    throw new CascadeError(`${label} contains a cyclic schema graph`);
  }
  const prior = normalized.get(value);
  if (prior !== undefined) return prior;
  budget.nodes += 1;
  if (budget.nodes > JSON_SCHEMA_MAX_GRAPH_NODES) {
    throw new CascadeError(`${label} exceeds the schema graph node limit`);
  }

  const array = Array.isArray(value);
  const prototype = Object.getPrototypeOf(value);
  if (
    (array && prototype !== Array.prototype) ||
    (!array && prototype !== Object.prototype && prototype !== null)
  ) {
    throw new CascadeError(`${label} must contain only plain schema data`);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const ownKeys = Reflect.ownKeys(descriptors);
  if (ownKeys.some((key) => typeof key !== "string")) {
    throw new CascadeError(`${label} contains a symbolic schema property`);
  }

  active.add(value);
  try {
    if (array) {
      const lengthDescriptor = descriptors.length;
      if (
        !lengthDescriptor ||
        !("value" in lengthDescriptor) ||
        !Number.isSafeInteger(lengthDescriptor.value) ||
        lengthDescriptor.value < 0
      ) {
        throw new CascadeError(`${label} contains an invalid schema array length`);
      }
      const length = lengthDescriptor.value as number;
      if (length > JSON_SCHEMA_MAX_ARRAY_LENGTH) {
        throw new CascadeError(`${label} exceeds the schema array length limit`);
      }
      const permittedKeys = new Set(["length"]);
      for (let index = 0; index < length; index += 1) {
        permittedKeys.add(String(index));
      }
      if ((ownKeys as string[]).some((key) => !permittedKeys.has(key))) {
        throw new CascadeError(`${label} contains an extra schema array property`);
      }
      const snapshot: unknown[] = [];
      normalized.set(value, snapshot);
      for (let index = 0; index < length; index += 1) {
        const key = String(index);
        const descriptor = descriptors[key];
        if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) {
          throw new CascadeError(`${label}[${index}] must be an own enumerable data property`);
        }
        snapshot.push(normalizeJsonSchemaGraph(
          descriptor.value,
          `${label}[${index}]`,
          normalized,
          active,
          budget,
          depth + 1,
        ));
      }
      return snapshot;
    }

    const snapshot: Record<string, unknown> = {};
    normalized.set(value, snapshot);
    for (const key of ownKeys as string[]) {
      assertSafeJsonPropertyName(key, label);
      const descriptor = descriptors[key];
      if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) {
        throw new CascadeError(`${label}.${key} must be an own enumerable data property`);
      }
      Object.defineProperty(snapshot, key, {
        value: normalizeJsonSchemaGraph(
          descriptor.value,
          `${label}.${key}`,
          normalized,
          active,
          budget,
          depth + 1,
        ),
        enumerable: true,
        configurable: true,
        writable: true,
      });
    }
    return snapshot;
  } finally {
    active.delete(value);
  }
}

function normalizeJsonSchemaCall(
  schema: JsonSchema,
  root: JsonSchema,
): { schema: JsonSchemaNode; root: JsonSchema } {
  const normalized = new WeakMap<object, unknown>();
  const active = new WeakSet<object>();
  const budget = { nodes: 0 };
  const normalizedRoot = normalizeJsonSchemaGraph(
    root,
    "$schema",
    normalized,
    active,
    budget,
  );
  const normalizedSchema = normalizeJsonSchemaGraph(
    schema,
    "$schema subject",
    normalized,
    active,
    budget,
  );
  if (!isJsonObject(normalizedRoot)) {
    throw new CascadeError("$schema root must be a schema object");
  }
  if (!isJsonObject(normalizedSchema) && typeof normalizedSchema !== "boolean") {
    throw new CascadeError("$schema subject must be a schema");
  }
  return {
    schema: normalizedSchema,
    root: normalizedRoot,
  };
}

function assertSafeJsonPropertyName(key: string, label: string): void {
  if (UNSAFE_JSON_PROPERTY_NAMES.has(key)) {
    throw new CascadeError(`${label} contains unsafe property name: ${key}`);
  }
}

function resolveJsonSchemaRef(root: JsonSchema, ref: string): JsonSchemaNode {
  if (!ref.startsWith("#/")) {
    throw new CascadeError(`unsupported external schema reference: ${ref}`);
  }
  let current: unknown = root;
  for (const raw of ref.slice(2).split("/")) {
    if (/~(?:[^01]|$)/.test(raw)) {
      throw new CascadeError(`invalid schema reference escape: ${ref}`);
    }
    const key = raw.replace(/~1/g, "/").replace(/~0/g, "~");
    assertSafeJsonPropertyName(key, `schema reference ${ref}`);
    if (!isJsonObject(current) || !hasOwn(current, key)) {
      throw new CascadeError(`unresolved schema reference: ${ref}`);
    }
    current = current[key];
  }
  if (!isJsonObject(current) && typeof current !== "boolean") {
    throw new CascadeError(`schema reference is not a schema: ${ref}`);
  }
  return current;
}

function equalStringList(value: unknown, expected: readonly string[]): boolean {
  return Array.isArray(value) &&
    value.length === expected.length &&
    value.every((entry, index) => entry === expected[index]);
}

function assertPairwiseDistinctContract(
  contract: unknown,
  schema: JsonSchema,
  label: string,
): void {
  if (!isJsonObject(contract)) {
    throw new CascadeError(
      `${label} contains an invalid ${CASCADE_PAIRWISE_DISTINCT_KEYWORD} contract`,
    );
  }
  const keys = Object.keys(contract).sort().join(",");
  const properties = contract.properties;
  const fields = contract.fields;
  const schemaProperties = schema.properties;
  if (
    keys !== "fields,ignore_null,properties,version" ||
    !hasOwn(contract, "version") ||
    contract.version !== 1 ||
    !hasOwn(contract, "ignore_null") ||
    contract.ignore_null !== true ||
    !hasOwn(contract, "properties") ||
    !equalStringList(properties, PAIRWISE_PRINCIPAL_PROPERTIES) ||
    !hasOwn(contract, "fields") ||
    !equalStringList(fields, PAIRWISE_PRINCIPAL_FIELDS) ||
    !hasOwn(schema, "type") ||
    schema.type !== "object" ||
    !hasOwn(schema, "properties") ||
    !isJsonObject(schemaProperties) ||
    !PAIRWISE_PRINCIPAL_PROPERTIES.every((property) =>
      hasOwn(schemaProperties, property) &&
      isJsonObject(schemaProperties[property])
    )
  ) {
    throw new CascadeError(
      `${label} contains an invalid ${CASCADE_PAIRWISE_DISTINCT_KEYWORD} contract`,
    );
  }
}

function assertJsonSchemaContract(
  root: JsonSchema,
  subject: JsonSchemaNode = root,
): void {
  const seen = new WeakSet<object>();
  const active = new WeakSet<object>();
  let usesPairwiseDistinctVocabulary = false;

  // These two assertion keywords require annotation propagation across nested
  // applicators. This bounded consumer refuses them instead of silently
  // treating them as annotations. Every other Draft 2020-12 applicator and
  // validation assertion keyword is handled below.
  const visit = (schema: JsonSchemaNode, label: string, depth = 0): void => {
    if (typeof schema === "boolean") return;
    if (depth > JSON_SCHEMA_MAX_DEPTH) {
      throw new CascadeError(`${label} exceeds the schema contract depth limit`);
    }
    if (active.has(schema)) {
      throw new CascadeError(`${label} contains a cyclic local schema reference`);
    }
    if (seen.has(schema)) return;
    seen.add(schema);
    active.add(schema);

    try {
      const prototype = Object.getPrototypeOf(schema);
      if (prototype !== Object.prototype && prototype !== null) {
        throw new CascadeError(`${label} must be an own-property JSON Schema object`);
      }

    for (const keyword of Object.keys(schema)) {
      if (
        (DRAFT_2020_12_ASSERTIONS.has(keyword) &&
          !SUPPORTED_DRAFT_2020_12_ASSERTIONS.has(keyword)) ||
        keyword === "$dynamicRef"
      ) {
        throw new CascadeError(`${label} contains unsupported assertion keyword ${keyword}`);
      }
    }

    if (hasOwn(schema, "$ref")) {
      if (typeof schema.$ref !== "string") {
        throw new CascadeError(`${label} contains an invalid $ref schema`);
      }
      visit(
        resolveJsonSchemaRef(root, schema.$ref),
        `${label}.$ref(${schema.$ref})`,
        depth + 1,
      );
    }

    if (hasOwn(schema, "type")) {
      const allowedTypes = new Set([
        "array",
        "boolean",
        "integer",
        "null",
        "number",
        "object",
        "string",
      ]);
      const types = Array.isArray(schema.type) ? schema.type : [schema.type];
      if (
        types.length === 0 ||
        !types.every((type) => typeof type === "string" && allowedTypes.has(type)) ||
        new Set(types).size !== types.length
      ) {
        throw new CascadeError(`${label} contains an invalid type schema`);
      }
    }

    for (const keyword of ["oneOf", "anyOf", "allOf"] as const) {
      if (!hasOwn(schema, keyword)) continue;
      if (!Array.isArray(schema[keyword]) || schema[keyword].length === 0) {
        throw new CascadeError(`${label} contains an invalid ${keyword} schema`);
      }
      schema[keyword].forEach((candidate, index) => {
        if (!isJsonObject(candidate) && typeof candidate !== "boolean") {
          throw new CascadeError(`${label}.${keyword}[${index}] must be a schema`);
        }
        visit(candidate, `${label}.${keyword}[${index}]`, depth + 1);
      });
    }

    for (const keyword of ["not", "if", "then", "else", "contains", "propertyNames"] as const) {
      if (hasOwn(schema, keyword)) {
        const candidate = schema[keyword];
        if (!isJsonObject(candidate) && typeof candidate !== "boolean") {
          throw new CascadeError(`${label}.${keyword} must be a schema`);
        }
        visit(candidate, `${label}.${keyword}`, depth + 1);
      }
    }

    if (hasOwn(schema, "properties")) {
      if (!isJsonObject(schema.properties)) {
        throw new CascadeError(`${label} contains an invalid properties schema`);
      }
      for (const [key, propertySchema] of Object.entries(schema.properties)) {
        assertSafeJsonPropertyName(key, `${label}.properties`);
        if (!isJsonObject(propertySchema) && typeof propertySchema !== "boolean") {
          throw new CascadeError(`${label}.properties.${key} must be a schema`);
        }
        visit(propertySchema, `${label}.properties.${key}`, depth + 1);
      }
    }

    if (hasOwn(schema, "patternProperties")) {
      if (!isJsonObject(schema.patternProperties)) {
        throw new CascadeError(`${label} contains an invalid patternProperties schema`);
      }
      for (const [pattern, candidate] of Object.entries(schema.patternProperties)) {
        try {
          new RegExp(pattern);
        } catch {
          throw new CascadeError(`${label}.patternProperties contains an invalid pattern`);
        }
        if (!isJsonObject(candidate) && typeof candidate !== "boolean") {
          throw new CascadeError(`${label}.patternProperties.${pattern} must be a schema`);
        }
        visit(candidate, `${label}.patternProperties.${pattern}`, depth + 1);
      }
    }

    if (hasOwn(schema, "dependentSchemas")) {
      if (!isJsonObject(schema.dependentSchemas)) {
        throw new CascadeError(`${label} contains an invalid dependentSchemas schema`);
      }
      for (const [key, candidate] of Object.entries(schema.dependentSchemas)) {
        assertSafeJsonPropertyName(key, `${label}.dependentSchemas`);
        if (!isJsonObject(candidate) && typeof candidate !== "boolean") {
          throw new CascadeError(`${label}.dependentSchemas.${key} must be a schema`);
        }
        visit(candidate, `${label}.dependentSchemas.${key}`, depth + 1);
      }
    }

    if (hasOwn(schema, "dependentRequired")) {
      if (!isJsonObject(schema.dependentRequired)) {
        throw new CascadeError(`${label} contains an invalid dependentRequired schema`);
      }
      for (const [key, dependencies] of Object.entries(schema.dependentRequired)) {
        assertSafeJsonPropertyName(key, `${label}.dependentRequired`);
        if (
          !Array.isArray(dependencies) ||
          !dependencies.every((entry) => typeof entry === "string" && entry.length > 0) ||
          new Set(dependencies).size !== dependencies.length
        ) {
          throw new CascadeError(`${label}.dependentRequired.${key} is invalid`);
        }
        dependencies.forEach((entry) =>
          assertSafeJsonPropertyName(entry, `${label}.dependentRequired.${key}`)
        );
      }
    }

    if (hasOwn(schema, "required")) {
      if (
        !Array.isArray(schema.required) ||
        !schema.required.every((key) => typeof key === "string" && key.length > 0) ||
        new Set(schema.required).size !== schema.required.length
      ) {
        throw new CascadeError(`${label} contains an invalid required schema`);
      }
      for (const key of schema.required) {
        assertSafeJsonPropertyName(key, `${label}.required`);
      }
    }

    if (hasOwn(schema, "prefixItems")) {
      if (!Array.isArray(schema.prefixItems) || schema.prefixItems.length === 0) {
        throw new CascadeError(`${label} contains an invalid prefixItems schema`);
      }
      schema.prefixItems.forEach((candidate, index) => {
        if (!isJsonObject(candidate) && typeof candidate !== "boolean") {
          throw new CascadeError(`${label}.prefixItems[${index}] must be a schema`);
        }
        visit(candidate, `${label}.prefixItems[${index}]`, depth + 1);
      });
    }
    if (hasOwn(schema, "items")) {
      if (!isJsonObject(schema.items) && typeof schema.items !== "boolean") {
        throw new CascadeError(`${label} contains an invalid items schema`);
      }
      visit(schema.items, `${label}.items`, depth + 1);
    }

    if (hasOwn(schema, "enum") && (!Array.isArray(schema.enum) || schema.enum.length === 0)) {
      throw new CascadeError(`${label} contains an invalid enum schema`);
    }
    for (const keyword of [
      "minLength",
      "maxLength",
      "minItems",
      "maxItems",
      "minContains",
      "maxContains",
      "minProperties",
      "maxProperties",
    ] as const) {
      if (
        hasOwn(schema, keyword) &&
        (typeof schema[keyword] !== "number" ||
          !Number.isFinite(schema[keyword]) ||
          !Number.isInteger(schema[keyword]) ||
          schema[keyword] < 0)
      ) {
        throw new CascadeError(`${label} contains an invalid ${keyword} schema`);
      }
    }
    for (const keyword of [
      "minimum",
      "maximum",
      "exclusiveMinimum",
      "exclusiveMaximum",
    ] as const) {
      if (
        hasOwn(schema, keyword) &&
        (typeof schema[keyword] !== "number" || !Number.isFinite(schema[keyword]))
      ) {
        throw new CascadeError(`${label} contains an invalid ${keyword} schema`);
      }
    }
    if (
      hasOwn(schema, "multipleOf") &&
      (typeof schema.multipleOf !== "number" ||
        !Number.isFinite(schema.multipleOf) ||
        schema.multipleOf <= 0)
    ) {
      throw new CascadeError(`${label} contains an invalid multipleOf schema`);
    }
    if (hasOwn(schema, "pattern")) {
      if (typeof schema.pattern !== "string") {
        throw new CascadeError(`${label} contains an invalid pattern schema`);
      }
      try {
        new RegExp(schema.pattern);
      } catch {
        throw new CascadeError(`${label} contains an invalid pattern schema`);
      }
    }
    if (hasOwn(schema, "format") && typeof schema.format !== "string") {
      throw new CascadeError(`${label} contains an invalid format annotation`);
    }
    if (hasOwn(schema, "uniqueItems") && typeof schema.uniqueItems !== "boolean") {
      throw new CascadeError(`${label} contains an invalid uniqueItems schema`);
    }
    if (hasOwn(schema, "additionalProperties")) {
      const candidate = schema.additionalProperties;
      if (!isJsonObject(candidate) && typeof candidate !== "boolean") {
        throw new CascadeError(`${label} contains an invalid additionalProperties schema`);
      }
      if (isJsonObject(candidate)) {
        visit(candidate, `${label}.additionalProperties`, depth + 1);
      }
    }

    if (hasOwn(schema, "$defs")) {
      if (!isJsonObject(schema.$defs)) {
        throw new CascadeError(`${label} contains an invalid $defs schema`);
      }
      for (const [key, definition] of Object.entries(schema.$defs)) {
        assertSafeJsonPropertyName(key, `${label}.$defs`);
        if (!isJsonObject(definition) && typeof definition !== "boolean") {
          throw new CascadeError(`${label}.$defs.${key} must be a schema`);
        }
        visit(definition, `${label}.$defs.${key}`, depth + 1);
      }
    }

    if (hasOwn(schema, CASCADE_PAIRWISE_DISTINCT_KEYWORD)) {
      usesPairwiseDistinctVocabulary = true;
      assertPairwiseDistinctContract(
        schema[CASCADE_PAIRWISE_DISTINCT_KEYWORD],
        schema,
        label,
      );
    }
    } finally {
      active.delete(schema);
    }
  };

  visit(root, "$schema");
  visit(subject, "$schema subject");
  if (
    usesPairwiseDistinctVocabulary &&
    (!hasOwn(root, "$schema") || root.$schema !== CASCADE_RUN_ARTIFACT_META_SCHEMA_ID)
  ) {
    throw new CascadeError(
      `schema using ${CASCADE_PAIRWISE_DISTINCT_KEYWORD} must require ${CASCADE_RUN_ARTIFACT_META_SCHEMA_ID}`,
    );
  }
}

function jsonSchemaType(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (typeof value === "number" && Number.isInteger(value)) return "integer";
  return typeof value === "object" ? "object" : typeof value;
}

function decimalIntegerAndScale(value: number): {
  integer: bigint;
  scale: number;
} {
  const match = String(value).match(/^(-?)(\d+)(?:\.(\d+))?(?:e([+-]?\d+))?$/i);
  if (!match) {
    throw new CascadeError(`cannot represent finite JSON number ${value}`);
  }
  const [, sign, whole, fraction = "", exponentText = "0"] = match;
  const digits = `${whole}${fraction}`.replace(/^0+(?=\d)/, "");
  return {
    integer: BigInt(`${sign}${digits}`),
    scale: fraction.length - Number(exponentText),
  };
}

function isExactJsonMultiple(value: number, divisor: number): boolean {
  const left = decimalIntegerAndScale(value);
  const right = decimalIntegerAndScale(divisor);
  let numerator = left.integer;
  let denominator = right.integer;
  const scaleDifference = left.scale - right.scale;
  if (scaleDifference > 0) {
    denominator *= 10n ** BigInt(scaleDifference);
  } else if (scaleDifference < 0) {
    numerator *= 10n ** BigInt(-scaleDifference);
  }
  return denominator !== 0n && numerator % denominator === 0n;
}

function assertPairwiseDistinctFields(
  value: unknown,
  contract: unknown,
  label: string,
): void {
  const properties = (contract as Record<string, unknown>).properties as string[];
  const fields = (contract as Record<string, unknown>).fields as string[];
  if (!isJsonObject(value)) {
    throw new CascadeError(
      `${label} must be an object for ${CASCADE_PAIRWISE_DISTINCT_KEYWORD}`,
    );
  }
  for (const field of fields) {
    const owners = new Map<string, string>();
    for (const property of properties) {
      if (!hasOwn(value, property)) {
        if (property === "specialized_evaluator") continue;
        throw new CascadeError(`${label}.${property} is required for pairwise-distinct validation`);
      }
      const candidate = value[property];
      if (candidate === null) continue;
      if (
        !isJsonObject(candidate) ||
        !hasOwn(candidate, field) ||
        typeof candidate[field] !== "string"
      ) {
        throw new CascadeError(
          `${label}.${property}.${field} must be a string for pairwise-distinct validation`,
        );
      }
      const prior = owners.get(candidate[field]);
      if (prior !== undefined) {
        throw new CascadeError(
          `${label}.${property}.${field} duplicates ${label}.${prior}.${field}`,
        );
      }
      owners.set(candidate[field], property);
    }
  }
}

/** Registration payload for Draft 2020-12 consumers that implement Ajv keywords. */
export const cascadePairwiseDistinctAjvKeyword = {
  keyword: CASCADE_PAIRWISE_DISTINCT_KEYWORD,
  schemaType: "object",
  type: "object",
  errors: false,
  metaSchema: {
    type: "object",
    additionalProperties: false,
    required: ["version", "properties", "fields", "ignore_null"],
    properties: {
      version: { const: 1 },
      properties: { const: [...PAIRWISE_PRINCIPAL_PROPERTIES] },
      fields: { const: [...PAIRWISE_PRINCIPAL_FIELDS] },
      ignore_null: { const: true },
    },
  },
  validate(contract: unknown, value: unknown): boolean {
    try {
      assertPairwiseDistinctFields(value, contract, "$instance");
      return true;
    } catch (error) {
      if (error instanceof CascadeError) return false;
      throw error;
    }
  },
} as const;

export interface Rfc3339ComparableInstant {
  epoch_second: number;
  fractional_second: string;
}

/** Parse the strict RFC 3339 timestamp subset used by Cascade contracts exactly. */
export function parseRfc3339ComparableInstant(
  value: unknown,
): Rfc3339ComparableInstant | null {
  if (typeof value !== "string") return null;
  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?(Z|([+-])(\d{2}):(\d{2}))$/,
  );
  if (!match) return null;
  const [
    ,
    yearText,
    monthText,
    dayText,
    hourText,
    minuteText,
    secondText,
    fractionText,
    ,
    offsetSign,
    offsetHourText,
    offsetMinuteText,
  ] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);
  const offsetHour = offsetHourText === undefined ? 0 : Number(offsetHourText);
  const offsetMinute = offsetMinuteText === undefined
    ? 0
    : Number(offsetMinuteText);
  if (
    year < 1 ||
    month < 1 ||
    month > 12 ||
    hour > 23 ||
    minute > 59 ||
    second > 59 ||
    offsetHour > 23 ||
    offsetMinute > 59
  ) {
    return null;
  }
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [
    31,
    leapYear ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ][month - 1]!;
  if (day < 1 || day > daysInMonth) return null;

  const local = new Date(0);
  local.setUTCFullYear(year, month - 1, day);
  local.setUTCHours(hour, minute, second, 0);
  const localInstant = local.getTime();
  const offsetSeconds = (offsetHour * 60 + offsetMinute) * 60;
  const epochSecond =
    localInstant / 1_000 + (offsetSign === "-" ? offsetSeconds : -offsetSeconds);
  if (!Number.isSafeInteger(epochSecond)) return null;
  return {
    epoch_second: epochSecond,
    fractional_second: (fractionText ?? "0").replace(/0+$/, "") || "0",
  };
}

/** Compare two valid RFC 3339 instants without losing fractional precision. */
export function compareRfc3339Instants(
  left: unknown,
  right: unknown,
): -1 | 0 | 1 | null {
  const leftInstant = parseRfc3339ComparableInstant(left);
  const rightInstant = parseRfc3339ComparableInstant(right);
  if (leftInstant === null || rightInstant === null) return null;
  if (leftInstant.epoch_second !== rightInstant.epoch_second) {
    return leftInstant.epoch_second < rightInstant.epoch_second ? -1 : 1;
  }
  const width = Math.max(
    leftInstant.fractional_second.length,
    rightInstant.fractional_second.length,
  );
  const leftFraction = leftInstant.fractional_second.padEnd(width, "0");
  const rightFraction = rightInstant.fractional_second.padEnd(width, "0");
  return leftFraction === rightFraction
    ? 0
    : leftFraction < rightFraction
    ? -1
    : 1;
}

/** Parse an RFC 3339 instant to milliseconds for legacy Date interoperability. */
export function parseRfc3339Instant(value: unknown): number | null {
  const instant = parseRfc3339ComparableInstant(value);
  if (instant === null) return null;
  return instant.epoch_second * 1_000 +
    Number(`0.${instant.fractional_second}`) * 1_000;
}

/** Validate the bounded JSON Schema vocabulary used by Cascade public contracts. */
export function assertJsonSchema(
  value: unknown,
  schema: JsonSchema,
  label = "$",
  root = schema,
): void {
  const normalized = normalizeJsonSchemaCall(schema, root);
  assertJsonSchemaContract(normalized.root, normalized.schema);
  assertJsonSchemaValue(value, normalized.schema, label, normalized.root, {
    activeRefs: new Set<JsonSchemaNode>(),
    steps: 0,
  }, 0);
}

interface JsonSchemaEvaluationState {
  activeRefs: Set<JsonSchemaNode>;
  steps: number;
}

class JsonSchemaEvaluationLimitError extends CascadeError {}

function assertJsonSchemaValue(
  value: unknown,
  schema: JsonSchemaNode,
  label: string,
  root: JsonSchema,
  evaluation: JsonSchemaEvaluationState,
  depth: number,
): void {
  if (depth > JSON_SCHEMA_MAX_DEPTH) {
    throw new JsonSchemaEvaluationLimitError(
      `${label} exceeds the schema evaluation depth limit`,
    );
  }
  evaluation.steps += 1;
  if (evaluation.steps > JSON_SCHEMA_MAX_EVALUATION_STEPS) {
    throw new JsonSchemaEvaluationLimitError(
      `${label} exceeds the schema evaluation step limit`,
    );
  }
  if (schema === true) return;
  if (schema === false) {
    throw new CascadeError(`${label} is rejected by a false schema`);
  }
  if (hasOwn(schema, "$ref")) {
    const target = resolveJsonSchemaRef(root, schema.$ref as string);
    if (evaluation.activeRefs.has(target)) {
      throw new JsonSchemaEvaluationLimitError(
        `${label} contains a cyclic local schema reference during evaluation`,
      );
    }
    evaluation.activeRefs.add(target);
    try {
      assertJsonSchemaValue(value, target, label, root, evaluation, depth + 1);
    } finally {
      evaluation.activeRefs.delete(target);
    }
  }
  if (hasOwn(schema, "allOf")) {
    for (const candidate of schema.allOf as JsonSchemaNode[]) {
      assertJsonSchemaValue(value, candidate, label, root, evaluation, depth + 1);
    }
  }
  if (hasOwn(schema, "not")) {
    let matched = false;
    try {
      assertJsonSchemaValue(
        value,
        schema.not as JsonSchemaNode,
        label,
        root,
        evaluation,
        depth + 1,
      );
      matched = true;
    } catch (error) {
      if (
        !(error instanceof CascadeError) ||
        error instanceof JsonSchemaEvaluationLimitError
      ) throw error;
    }
    if (matched) {
      throw new CascadeError(`${label} must not match its negated schema`);
    }
  }
  if (hasOwn(schema, "anyOf")) {
    let matched = false;
    const failures: string[] = [];
    for (const candidate of schema.anyOf as JsonSchemaNode[]) {
      try {
        assertJsonSchemaValue(value, candidate, label, root, evaluation, depth + 1);
        matched = true;
        break;
      } catch (error) {
        if (
          !(error instanceof CascadeError) ||
          error instanceof JsonSchemaEvaluationLimitError
        ) throw error;
        failures.push(error.message);
      }
    }
    if (!matched) {
      throw new CascadeError(`${label} must match at least one schema alternative: ${failures.join("; ")}`);
    }
  }
  if (hasOwn(schema, "oneOf")) {
    let matches = 0;
    const failures: string[] = [];
    for (const candidate of schema.oneOf as JsonSchemaNode[]) {
      try {
        assertJsonSchemaValue(value, candidate, label, root, evaluation, depth + 1);
        matches += 1;
      } catch (error) {
        if (
          !(error instanceof CascadeError) ||
          error instanceof JsonSchemaEvaluationLimitError
        ) throw error;
        failures.push(error.message);
      }
    }
    if (matches !== 1) {
      const detail = matches === 0 && failures.length ? `: ${failures.join("; ")}` : "";
      throw new CascadeError(
        `${label} must match exactly one schema alternative${detail}`,
      );
    }
  }
  if (hasOwn(schema, "if")) {
    let condition = true;
    try {
      assertJsonSchemaValue(
        value,
        schema.if as JsonSchemaNode,
        label,
        root,
        evaluation,
        depth + 1,
      );
    } catch (error) {
      if (
        !(error instanceof CascadeError) ||
        error instanceof JsonSchemaEvaluationLimitError
      ) throw error;
      condition = false;
    }
    const branch = condition ? schema.then : schema.else;
    if (branch !== undefined) {
      assertJsonSchemaValue(
        value,
        branch as JsonSchemaNode,
        label,
        root,
        evaluation,
        depth + 1,
      );
    }
  }
  if (hasOwn(schema, "const") && stableJson(value) !== stableJson(schema.const)) {
    throw new CascadeError(`${label} must equal its schema constant`);
  }
  if (
    hasOwn(schema, "enum") &&
    Array.isArray(schema.enum) &&
    !schema.enum.some((candidate) => stableJson(candidate) === stableJson(value))
  ) {
    throw new CascadeError(`${label} is outside its schema enum`);
  }
  if (hasOwn(schema, "type")) {
    const allowed = Array.isArray(schema.type) ? schema.type : [schema.type];
    const actual = jsonSchemaType(value);
    const matches = allowed.includes(actual) ||
      (actual === "integer" && allowed.includes("number"));
    if (!matches) {
      throw new CascadeError(`${label} must have schema type ${allowed.join("|")}`);
    }
  }
  if (typeof value === "string") {
    const codePointLength = [...value].length;
    if (hasOwn(schema, "minLength") && codePointLength < (schema.minLength as number)) {
      throw new CascadeError(`${label} is shorter than minLength`);
    }
    if (hasOwn(schema, "maxLength") && codePointLength > (schema.maxLength as number)) {
      throw new CascadeError(`${label} exceeds maxLength`);
    }
    if (hasOwn(schema, "pattern") && !new RegExp(schema.pattern as string).test(value)) {
      throw new CascadeError(`${label} does not match its schema pattern`);
    }
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new CascadeError(`${label} must be finite`);
    }
    if (hasOwn(schema, "minimum") && value < (schema.minimum as number)) {
      throw new CascadeError(`${label} is below minimum`);
    }
    if (hasOwn(schema, "maximum") && value > (schema.maximum as number)) {
      throw new CascadeError(`${label} exceeds maximum`);
    }
    if (hasOwn(schema, "exclusiveMinimum") && value <= (schema.exclusiveMinimum as number)) {
      throw new CascadeError(`${label} is not above exclusiveMinimum`);
    }
    if (hasOwn(schema, "exclusiveMaximum") && value >= (schema.exclusiveMaximum as number)) {
      throw new CascadeError(`${label} is not below exclusiveMaximum`);
    }
    if (hasOwn(schema, "multipleOf")) {
      const divisor = schema.multipleOf as number;
      if (!isExactJsonMultiple(value, divisor)) {
        throw new CascadeError(`${label} is not a multipleOf ${divisor}`);
      }
    }
  }
  if (Array.isArray(value)) {
    if (hasOwn(schema, "minItems") && value.length < (schema.minItems as number)) {
      throw new CascadeError(`${label} has fewer than minItems`);
    }
    if (hasOwn(schema, "maxItems") && value.length > (schema.maxItems as number)) {
      throw new CascadeError(`${label} has more than maxItems`);
    }
    if (
      hasOwn(schema, "uniqueItems") &&
      schema.uniqueItems === true &&
      new Set(value.map((item) => stableJson(item))).size !== value.length
    ) {
      throw new CascadeError(`${label} contains duplicate items`);
    }
    const prefixItems = hasOwn(schema, "prefixItems")
      ? schema.prefixItems as JsonSchemaNode[]
      : [];
    prefixItems.forEach((candidate, index) => {
      if (index < value.length) {
        assertJsonSchemaValue(
          value[index],
          candidate,
          `${label}[${index}]`,
          root,
          evaluation,
          depth + 1,
        );
      }
    });
    if (hasOwn(schema, "items")) {
      for (let index = prefixItems.length; index < value.length; index += 1) {
        assertJsonSchemaValue(
          value[index],
          schema.items as JsonSchemaNode,
          `${label}[${index}]`,
          root,
          evaluation,
          depth + 1,
        );
      }
    }
    if (hasOwn(schema, "contains")) {
      let matches = 0;
      for (const [index, item] of value.entries()) {
        try {
          assertJsonSchemaValue(
            item,
            schema.contains as JsonSchemaNode,
            `${label}[${index}]`,
            root,
            evaluation,
            depth + 1,
          );
          matches += 1;
        } catch (error) {
          if (
            !(error instanceof CascadeError) ||
            error instanceof JsonSchemaEvaluationLimitError
          ) throw error;
        }
      }
      const minimum = hasOwn(schema, "minContains") ? schema.minContains as number : 1;
      const maximum = hasOwn(schema, "maxContains") ? schema.maxContains as number : Infinity;
      if (matches < minimum || matches > maximum) {
        throw new CascadeError(`${label} contains ${matches} matching items, outside ${minimum}..${maximum}`);
      }
    }
  }
  if (isJsonObject(value)) {
    const ownKeys = Object.keys(value);
    if (hasOwn(schema, "minProperties") && ownKeys.length < (schema.minProperties as number)) {
      throw new CascadeError(`${label} has fewer than minProperties`);
    }
    if (hasOwn(schema, "maxProperties") && ownKeys.length > (schema.maxProperties as number)) {
      throw new CascadeError(`${label} has more than maxProperties`);
    }
    const required = hasOwn(schema, "required") && Array.isArray(schema.required)
      ? schema.required
      : [];
    for (const key of required) {
      if (!hasOwn(value, key)) {
        throw new CascadeError(`${label}.${String(key)} is required`);
      }
    }
    const properties = hasOwn(schema, "properties") && isJsonObject(schema.properties)
      ? schema.properties
      : {};
    const patternProperties = hasOwn(schema, "patternProperties") && isJsonObject(schema.patternProperties)
      ? schema.patternProperties
      : {};
    const patterns = Object.entries(patternProperties).map(([pattern, candidate]) => [
      new RegExp(pattern),
      candidate as JsonSchemaNode,
    ] as const);
    const additionalKeys = ownKeys.filter((key) =>
      !hasOwn(properties, key) && !patterns.some(([pattern]) => pattern.test(key))
    );
    if (hasOwn(schema, "additionalProperties") && schema.additionalProperties === false) {
      const unsupported = additionalKeys;
      if (unsupported.length) {
        throw new CascadeError(
          `${label} has unsupported properties: ${unsupported.sort().join(", ")}`,
        );
      }
    }
    for (const [key, propertySchema] of Object.entries(properties)) {
      if (hasOwn(value, key)) {
        assertJsonSchemaValue(
          value[key],
          propertySchema as JsonSchemaNode,
          `${label}.${key}`,
          root,
          evaluation,
          depth + 1,
        );
      }
    }
    for (const [key, candidateValue] of Object.entries(value)) {
      for (const [pattern, candidateSchema] of patterns) {
        if (pattern.test(key)) {
          assertJsonSchemaValue(
            candidateValue,
            candidateSchema,
            `${label}.${key}`,
            root,
            evaluation,
            depth + 1,
          );
        }
      }
    }
    if (
      hasOwn(schema, "additionalProperties") &&
      schema.additionalProperties !== true &&
      schema.additionalProperties !== false
    ) {
      for (const key of additionalKeys) {
        assertJsonSchemaValue(
          value[key],
          schema.additionalProperties as JsonSchemaNode,
          `${label}.${key}`,
          root,
          evaluation,
          depth + 1,
        );
      }
    }
    if (hasOwn(schema, "propertyNames")) {
      for (const key of ownKeys) {
        assertJsonSchemaValue(
          key,
          schema.propertyNames as JsonSchemaNode,
          `${label} property name ${key}`,
          root,
          evaluation,
          depth + 1,
        );
      }
    }
    if (hasOwn(schema, "dependentRequired")) {
      for (const [key, dependencies] of Object.entries(schema.dependentRequired as Record<string, string[]>)) {
        if (!hasOwn(value, key)) continue;
        for (const dependency of dependencies) {
          if (!hasOwn(value, dependency)) {
            throw new CascadeError(`${label}.${dependency} is required by ${key}`);
          }
        }
      }
    }
    if (hasOwn(schema, "dependentSchemas")) {
      for (const [key, candidate] of Object.entries(schema.dependentSchemas as Record<string, JsonSchemaNode>)) {
        if (hasOwn(value, key)) {
          assertJsonSchemaValue(value, candidate, label, root, evaluation, depth + 1);
        }
      }
    }
    if (hasOwn(schema, CASCADE_PAIRWISE_DISTINCT_KEYWORD)) {
      assertPairwiseDistinctFields(
        value,
        schema[CASCADE_PAIRWISE_DISTINCT_KEYWORD],
        label,
      );
    }
  }
}

export interface BoundedRegularFileOptions {
  maxBytes: number;
  requireMaintainersOnly?: boolean;
  physicalRoot?: string;
  readCheckpoint?: (phase: "opened", path: string) => void | Promise<void>;
}

async function assertBoundedFileAncestors(path: string, label: string): Promise<void> {
  const absolute = resolve(path);
  if (absolute !== ROOT && !absolute.startsWith(`${ROOT}${sep}`)) {
    throw new CascadeError(`${label} escapes the repository`);
  }
  let current = dirname(absolute);
  while (current === ROOT || current.startsWith(`${ROOT}${sep}`)) {
    const metadata = await lstat(current).catch(() => null);
    if (metadata?.isSymbolicLink()) {
      throw new CascadeError(`${label} has a symbolic-link ancestor`);
    }
    if (current === ROOT) break;
    current = dirname(current);
  }
}

interface BoundedFileAncestorIdentity {
  path: string;
  dev: number;
  ino: number;
}

async function captureBoundedFileAncestorIdentities(
  absolute: string,
  physicalRoot: string,
  label: string,
): Promise<BoundedFileAncestorIdentity[]> {
  const identities: BoundedFileAncestorIdentity[] = [];
  let current = dirname(absolute);
  while (
    current === physicalRoot ||
    current.startsWith(`${physicalRoot}${sep}`)
  ) {
    const metadata = await lstat(current).catch(() => null);
    if (!metadata?.isDirectory() || metadata.isSymbolicLink()) {
      throw new CascadeError(`${label} has an invalid physical ancestor`);
    }
    identities.push({ path: current, dev: metadata.dev, ino: metadata.ino });
    if (current === physicalRoot) return identities;
    current = dirname(current);
  }
  throw new CascadeError(`${label} escapes the permitted physical root`);
}

async function assertBoundedFileAncestorIdentities(
  identities: BoundedFileAncestorIdentity[],
  label: string,
  containmentLabel: string,
): Promise<void> {
  for (const identity of identities) {
    const metadata = await lstat(identity.path).catch(() => null);
    if (
      !metadata?.isDirectory() ||
      metadata.isSymbolicLink() ||
      metadata.dev !== identity.dev ||
      metadata.ino !== identity.ino
    ) {
      throw new CascadeError(`${label} escapes ${containmentLabel} after open`);
    }
  }
}

async function assertOpenedFileContained(
  absolute: string,
  fileDescriptor: number,
  opened: { dev: number; ino: number },
  canonicalRoot: string,
  ancestorIdentities: BoundedFileAncestorIdentity[],
  label: string,
  containmentLabel: string,
): Promise<void> {
  await assertBoundedFileAncestors(absolute, label);
  await assertBoundedFileAncestorIdentities(
    ancestorIdentities,
    label,
    containmentLabel,
  );
  let canonicalFile: string | null = null;
  for (const descriptorPath of [
    `/proc/self/fd/${fileDescriptor}`,
    `/dev/fd/${fileDescriptor}`,
  ]) {
    try {
      canonicalFile = await realpath(descriptorPath);
      break;
    } catch {
      // Platform-specific descriptor paths are not available everywhere.
    }
  }
  if (canonicalFile === null) {
    canonicalFile = await realpath(absolute).catch(() => null);
  }
  if (canonicalFile === null) {
    throw new CascadeError(`${label} changed identity while verifying containment`);
  }
  if (
    canonicalFile !== canonicalRoot &&
    !canonicalFile.startsWith(`${canonicalRoot}${sep}`)
  ) {
    throw new CascadeError(`${label} escapes ${containmentLabel} after open`);
  }
  const canonicalMetadata = await stat(canonicalFile).catch(() => null);
  if (
    !canonicalMetadata?.isFile() ||
    canonicalMetadata.dev !== opened.dev ||
    canonicalMetadata.ino !== opened.ino
  ) {
    throw new CascadeError(`${label} changed identity while verifying containment`);
  }
}

export async function readBoundedRegularFile(
  path: string,
  label: string,
  options: BoundedRegularFileOptions,
): Promise<Buffer> {
  if (!Number.isInteger(options.maxBytes) || options.maxBytes < 1) {
    throw new CascadeError(`${label} byte limit must be a positive integer`);
  }
  const absolute = resolve(path);
  const physicalRoot = resolve(options.physicalRoot ?? ROOT);
  if (
    physicalRoot !== ROOT &&
    !physicalRoot.startsWith(`${ROOT}${sep}`)
  ) {
    throw new CascadeError(`${label} physical root escapes the repository`);
  }
  if (
    absolute !== physicalRoot &&
    !absolute.startsWith(`${physicalRoot}${sep}`)
  ) {
    throw new CascadeError(`${label} escapes the permitted physical root`);
  }
  await assertBoundedFileAncestors(absolute, label);
  const physicalRootMetadata = await lstat(physicalRoot).catch(() => null);
  if (
    !physicalRootMetadata?.isDirectory() ||
    physicalRootMetadata.isSymbolicLink()
  ) {
    throw new CascadeError(`${label} physical root must be a regular directory`);
  }
  const canonicalRoot = await realpath(physicalRoot);
  const containmentLabel = options.physicalRoot === undefined
    ? "the repository"
    : "the permitted physical root";
  const ancestorIdentities = options.physicalRoot === undefined
    ? []
    : await captureBoundedFileAncestorIdentities(
      absolute,
      physicalRoot,
      label,
    );
  const pathMetadata = await lstat(absolute).catch(() => null);
  if (pathMetadata?.isSymbolicLink()) {
    throw new CascadeError(`${label} must not be a symbolic link`);
  }
  let handle;
  try {
    handle = await open(
      absolute,
      constants.O_RDONLY | constants.O_NONBLOCK | constants.O_NOFOLLOW,
    );
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      ["ELOOP", "EMLINK"].includes(String(error.code))
    ) {
      throw new CascadeError(`${label} must not be a symbolic link`);
    }
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      ["ENXIO", "ENODEV", "EOPNOTSUPP"].includes(String(error.code))
    ) {
      throw new CascadeError(`${label} must be a regular file`);
    }
    throw error;
  }
  try {
    const before = await handle.stat();
    if (!before.isFile()) {
      throw new CascadeError(`${label} must be a regular file`);
    }
    if (options.requireMaintainersOnly && (before.mode & 0o077) !== 0) {
      throw new CascadeError(`${label} must use maintainers-only file permissions`);
    }
    if (before.size > options.maxBytes) {
      throw new CascadeError(`${label} exceeds ${options.maxBytes} bytes`);
    }
    await options.readCheckpoint?.("opened", absolute);
    await assertOpenedFileContained(
      absolute,
      handle.fd,
      before,
      canonicalRoot,
      ancestorIdentities,
      label,
      containmentLabel,
    );
    const bounded = Buffer.alloc(options.maxBytes + 1);
    let offset = 0;
    while (offset < bounded.byteLength) {
      const chunk = await handle.read(
        bounded,
        offset,
        bounded.byteLength - offset,
        offset,
      );
      if (chunk.bytesRead === 0) break;
      offset += chunk.bytesRead;
    }
    if (offset > options.maxBytes) {
      throw new CascadeError(
        `${label} exceeds ${options.maxBytes} bytes while being read`,
      );
    }
    const after = await handle.stat();
    if (
      !after.isFile() ||
      after.dev !== before.dev ||
      after.ino !== before.ino ||
      after.size !== before.size ||
      after.mtimeMs !== before.mtimeMs ||
      after.ctimeMs !== before.ctimeMs ||
      (options.requireMaintainersOnly && (after.mode & 0o077) !== 0)
    ) {
      throw new CascadeError(`${label} changed identity or permissions while being read`);
    }
    await assertOpenedFileContained(
      absolute,
      handle.fd,
      after,
      canonicalRoot,
      ancestorIdentities,
      label,
      containmentLabel,
    );
    const current = await lstat(absolute).catch(() => null);
    if (
      !current?.isFile() ||
      current.isSymbolicLink() ||
      current.dev !== before.dev ||
      current.ino !== before.ino ||
      current.size !== before.size ||
      current.mtimeMs !== before.mtimeMs ||
      current.ctimeMs !== before.ctimeMs ||
      (options.requireMaintainersOnly && (current.mode & 0o077) !== 0)
    ) {
      throw new CascadeError(`${label} changed identity or permissions while being read`);
    }
    return bounded.subarray(0, offset);
  } finally {
    await handle.close();
  }
}

function sortJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortJson);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, sortJson(item)]),
    );
  }
  return value;
}

export function stableJson(value: unknown, pretty = false): string {
  return JSON.stringify(sortJson(value), null, pretty ? 2 : undefined);
}

export interface FileWriteModeOptions {
  fileMode?: number;
  directoryMode?: number;
}

async function prepareWriteDirectory(
  path: string,
  options: FileWriteModeOptions,
): Promise<void> {
  const directory = dirname(path);
  await mkdir(directory, {
    recursive: true,
    mode: options.directoryMode,
  });
  if (options.directoryMode !== undefined) {
    await chmod(directory, options.directoryMode);
  }
}

export async function writeJson(
  path: string,
  value: unknown,
  options: FileWriteModeOptions = {},
): Promise<void> {
  await prepareWriteDirectory(path, options);
  await writeFile(path, `${stableJson(value, true)}\n`, {
    encoding: "utf8",
    mode: options.fileMode,
  });
  if (options.fileMode !== undefined) await chmod(path, options.fileMode);
}

export async function writeJsonExclusive(
  path: string,
  value: unknown,
  options: FileWriteModeOptions = {},
): Promise<void> {
  await prepareWriteDirectory(path, options);
  const handle = await open(path, "wx", options.fileMode);
  try {
    await handle.writeFile(`${stableJson(value, true)}\n`, "utf8");
  } finally {
    await handle.close();
  }
}

export async function writeTextExclusive(
  path: string,
  value: string,
  options: FileWriteModeOptions = {},
): Promise<void> {
  await prepareWriteDirectory(path, options);
  const handle = await open(path, "wx", options.fileMode);
  try {
    await handle.writeFile(value, "utf8");
  } finally {
    await handle.close();
  }
}

export async function writeJsonAtomic(
  path: string,
  value: unknown,
  options: FileWriteModeOptions = {},
): Promise<void> {
  await prepareWriteDirectory(path, options);
  const temporary = `${path}.tmp-${crypto.randomUUID()}`;
  try {
    await writeFile(temporary, `${stableJson(value, true)}\n`, {
      encoding: "utf8",
      flag: "wx",
      mode: options.fileMode,
    });
    await rename(temporary, path);
  } catch (error) {
    try {
      await unlink(temporary);
    } catch {
      // The temporary file may not have been created.
    }
    throw error;
  }
}

export async function writeJsonAtomicExclusive(
  path: string,
  value: unknown,
  options: FileWriteModeOptions = {},
): Promise<void> {
  await prepareWriteDirectory(path, options);
  const temporary = `${path}.tmp-${crypto.randomUUID()}`;
  try {
    await writeFile(temporary, `${stableJson(value, true)}\n`, {
      encoding: "utf8",
      flag: "wx",
      mode: options.fileMode,
    });
    await link(temporary, path);
  } finally {
    try {
      await unlink(temporary);
    } catch {
      // The temporary file may not have been created.
    }
  }
}

export function sha256Text(value: string): string {
  const hasher = new Bun.CryptoHasher("sha256");
  hasher.update(value);
  return hasher.digest("hex");
}

export async function sha256File(path: string): Promise<string> {
  const hasher = new Bun.CryptoHasher("sha256");
  hasher.update(await Bun.file(path).arrayBuffer());
  return hasher.digest("hex");
}

export function valueDigest(value: unknown): string {
  return sha256Text(stableJson(value));
}

export function utcNow(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "+00:00");
}

export function boundedPath(value: string, prefix?: string): string {
  const absolute = resolve(ROOT, value);
  if (absolute !== ROOT && !absolute.startsWith(`${ROOT}${sep}`)) {
    throw new CascadeError(`path escapes repository: ${value}`);
  }
  const relativePath = rel(absolute);
  if (prefix && !relativePath.startsWith(prefix)) {
    throw new CascadeError(`path must be under ${prefix}: ${value}`);
  }
  return absolute;
}

export async function freezeFile(
  source: string,
  destination: string,
): Promise<{ path: string; sha256: string; size: number }> {
  const sourcePath = boundedPath(source);
  if (!(await isFile(sourcePath))) {
    throw new CascadeError(`evidence file missing: ${source}`);
  }
  await mkdir(dirname(destination), { recursive: true });
  await copyFile(sourcePath, destination);
  const metadata = await stat(destination);
  return {
    path: rel(destination),
    sha256: await sha256File(destination),
    size: metadata.size,
  };
}

export interface WalkOptions {
  skip?: Set<string>;
  include?: (path: string) => boolean;
}

export async function walkFiles(
  root: string,
  options: WalkOptions = {},
): Promise<string[]> {
  const result: string[] = [];
  const skip = options.skip ?? new Set<string>();
  async function visit(directory: string): Promise<void> {
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      if (skip.has(entry.name)) continue;
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) await visit(path);
      else if (entry.isFile() && (!options.include || options.include(path))) {
        result.push(path);
      }
    }
  }
  if (await isDirectory(root)) await visit(root);
  return result;
}

export function parseFrontmatter(text: string): Record<string, string> {
  if (!text.startsWith("---\n")) return {};
  const end = text.indexOf("\n---\n", 4);
  if (end < 0) return {};
  const result: Record<string, string> = {};
  for (const line of text.slice(4, end).split("\n")) {
    const separator = line.indexOf(":");
    if (separator < 0) continue;
    result[line.slice(0, separator).trim()] = line
      .slice(separator + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
  }
  return result;
}

export interface ParsedArgs {
  positionals: string[];
  flags: Map<string, string[]>;
}

export function parseArgs(argv: string[]): ParsedArgs {
  const positionals: string[] = [];
  const flags = new Map<string, string[]>();
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]!;
    if (!token.startsWith("--")) {
      positionals.push(token);
      continue;
    }
    const [rawName, inline] = token.slice(2).split("=", 2);
    const next = argv[index + 1];
    const value =
      inline ??
      (next !== undefined && !next.startsWith("--")
        ? (index += 1, next)
        : "true");
    const values = flags.get(rawName!) ?? [];
    values.push(value);
    flags.set(rawName!, values);
  }
  return { positionals, flags };
}

export function flag(
  args: ParsedArgs,
  name: string,
  fallback?: string,
): string | undefined {
  return args.flags.get(name)?.at(-1) ?? fallback;
}

export function flags(args: ParsedArgs, name: string): string[] {
  return args.flags.get(name) ?? [];
}

export function boolFlag(args: ParsedArgs, name: string): boolean {
  return args.flags.has(name);
}

export interface CommandResult {
  argv: string[];
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
  timedOut: boolean;
  aborted: boolean;
  outputLimitExceeded: boolean;
  terminationSignal: "SIGTERM" | "SIGKILL" | null;
}

export async function runCommand(
  argv: string[],
  options: {
    cwd?: string;
    env?: Record<string, string | undefined>;
    timeoutMs?: number;
    signal?: AbortSignal;
    terminationGraceMs?: number;
    maxOutputBytes?: number;
    unsetEnv?: string[];
    inheritEnv?: boolean;
  } = {},
): Promise<CommandResult> {
  if (!argv.length) throw new CascadeError("command argv must not be empty");
  if (
    options.timeoutMs !== undefined &&
    (!Number.isFinite(options.timeoutMs) || options.timeoutMs < 1)
  ) {
    throw new CascadeError("command timeout must be a positive number");
  }
  if (
    options.terminationGraceMs !== undefined &&
    (!Number.isFinite(options.terminationGraceMs) ||
      options.terminationGraceMs < 0)
  ) {
    throw new CascadeError(
      "command termination grace must be a non-negative number",
    );
  }
  if (
    options.maxOutputBytes !== undefined &&
    (!Number.isInteger(options.maxOutputBytes) || options.maxOutputBytes < 1)
  ) {
    throw new CascadeError("command output limit must be a positive integer");
  }
  const started = performance.now();
  if (options.signal?.aborted) {
    return {
      argv,
      exitCode: 130,
      stdout: "",
      stderr: "",
      durationMs: Math.round(performance.now() - started),
      timedOut: false,
      aborted: true,
      outputLimitExceeded: false,
      terminationSignal: null,
    };
  }
  const childEnv = {
    ...(options.inheritEnv === false ? {} : Bun.env),
    ...options.env,
  };
  for (const name of options.unsetEnv ?? []) {
    delete childEnv[name];
  }
  const process = Bun.spawn(argv, {
    cwd: options.cwd ?? ROOT,
    env: childEnv,
    stdin: "ignore",
    stdout: "pipe",
    stderr: "pipe",
  });
  let timedOut = false;
  let aborted = false;
  let outputLimitExceeded = false;
  let exited = false;
  let terminationSignal: "SIGTERM" | "SIGKILL" | null = null;
  const terminationGraceMs = options.terminationGraceMs ?? 100;
  const processExited = process.exited.then((exitCode) => {
    exited = true;
    return exitCode;
  });
  let timer: ReturnType<typeof setTimeout> | undefined;
  let forceTimer: ReturnType<typeof setTimeout> | undefined;
  const kill = (signal: "SIGTERM" | "SIGKILL"): void => {
    if (exited) return;
    try {
      terminationSignal = signal;
      process.kill(signal);
    } catch {
      // Exit can race with termination. The exited promise remains authority.
    }
  };
  const terminate = (): void => {
    kill("SIGTERM");
    forceTimer = setTimeout(() => kill("SIGKILL"), terminationGraceMs);
  };
  const abort = (): void => {
    if (exited || timedOut || aborted) return;
    aborted = true;
    terminate();
  };
  let retainedOutputBytes = 0;
  const readBounded = async (
    stream: ReadableStream<Uint8Array>,
  ): Promise<string> => {
    const chunks: Uint8Array[] = [];
    const reader = stream.getReader();
    try {
      while (true) {
        const item = await reader.read();
        if (item.done) break;
        const chunk = item.value;
        const remaining =
          options.maxOutputBytes === undefined
            ? chunk.byteLength
            : Math.max(0, options.maxOutputBytes - retainedOutputBytes);
        if (remaining > 0) {
          const retained =
            remaining >= chunk.byteLength
              ? chunk
              : chunk.subarray(0, remaining);
          chunks.push(retained);
          retainedOutputBytes += retained.byteLength;
        }
        if (
          options.maxOutputBytes !== undefined &&
          remaining < chunk.byteLength
        ) {
          outputLimitExceeded = true;
          terminate();
        }
      }
    } finally {
      reader.releaseLock();
    }
    const total = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
    const joined = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      joined.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return new TextDecoder().decode(joined);
  };
  options.signal?.addEventListener("abort", abort, { once: true });
  if (options.signal?.aborted) abort();
  if (options.timeoutMs) {
    timer = setTimeout(() => {
      if (exited || aborted || timedOut) return;
      timedOut = true;
      terminate();
    }, options.timeoutMs);
  }
  let output: [string, string, number];
  try {
    output = await Promise.all([
      readBounded(process.stdout),
      readBounded(process.stderr),
      processExited,
    ]);
  } catch (error) {
    kill("SIGKILL");
    await processExited;
    throw error;
  } finally {
    if (timer) clearTimeout(timer);
    if (forceTimer) clearTimeout(forceTimer);
    options.signal?.removeEventListener("abort", abort);
  }
  const [stdout, stderr, exitCode] = output;
  return {
    argv,
    exitCode: timedOut ? 124 : aborted ? 130 : exitCode,
    stdout,
    stderr,
    durationMs: Math.round(performance.now() - started),
    timedOut,
    aborted,
    outputLimitExceeded,
    terminationSignal,
  };
}

export function printError(error: unknown): number {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`ERROR: ${message}`);
  return 1;
}
