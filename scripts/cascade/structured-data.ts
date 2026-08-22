import { extname } from "node:path";

import { parseDocument, stringify, visit } from "yaml";

import {
  CascadeError,
  readBoundedRegularFile,
  rel,
  stableJson,
  type BoundedRegularFileOptions,
} from "./common";

const UNSAFE_MAPPING_KEYS = new Set(["__proto__", "constructor", "prototype"]);

function assertJsonCompatible(
  value: unknown,
  label: string,
  path = "$",
  seen = new Set<object>(),
): void {
  if (
    value === null
    || typeof value === "string"
    || typeof value === "boolean"
    || (typeof value === "number" && Number.isFinite(value))
  ) {
    return;
  }
  if (typeof value !== "object") {
    throw new CascadeError(`${label} ${path} must be JSON-compatible`);
  }
  if (seen.has(value)) {
    throw new CascadeError(`${label} ${path} contains a cycle`);
  }
  seen.add(value);
  if (Array.isArray(value)) {
    for (const [index, item] of value.entries()) {
      assertJsonCompatible(item, label, `${path}[${index}]`, seen);
    }
  } else {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new CascadeError(`${label} ${path} must be a plain mapping`);
    }
    for (const [key, item] of Object.entries(value)) {
      if (UNSAFE_MAPPING_KEYS.has(key)) {
        throw new CascadeError(`${label} ${path} contains unsafe key ${key}`);
      }
      assertJsonCompatible(item, label, `${path}.${key}`, seen);
    }
  }
  seen.delete(value);
}

export function parseStrictYaml<T = unknown>(source: string, label = "YAML"): T {
  const document = parseDocument(source, {
    customTags: null,
    merge: false,
    prettyErrors: true,
    resolveKnownTags: false,
    schema: "core",
    strict: true,
    stringKeys: true,
    uniqueKeys: true,
    version: "1.2",
  });
  if (document.errors.length) {
    throw new CascadeError(
      `invalid YAML ${label}: ${document.errors.map((error) => error.message).join("; ")}`,
    );
  }
  if (document.warnings.length) {
    throw new CascadeError(
      `unsafe YAML ${label}: ${document.warnings.map((warning) => warning.message).join("; ")}`,
    );
  }
  let prohibited: string | null = null;
  visit(document, {
    Alias() {
      prohibited = "aliases are not allowed";
      return visit.BREAK;
    },
    Node(_key, node) {
      if ("anchor" in node && node.anchor) {
        prohibited = "anchors are not allowed";
        return visit.BREAK;
      }
      if (node.tag) {
        prohibited = "explicit tags are not allowed";
        return visit.BREAK;
      }
    },
  });
  if (prohibited) throw new CascadeError(`unsafe YAML ${label}: ${prohibited}`);
  const value = document.toJS({ mapAsMap: false, maxAliasCount: 0 });
  assertJsonCompatible(value, label);
  return value as T;
}

export function parseStructuredText<T = unknown>(
  source: string,
  format: ".json" | ".yaml" | ".yml",
  label = "structured data",
): T {
  if (format === ".yaml" || format === ".yml") {
    return parseStrictYaml<T>(source, label);
  }
  try {
    const value = JSON.parse(source) as T;
    assertJsonCompatible(value, label);
    return value;
  } catch (error) {
    if (error instanceof CascadeError) throw error;
    const detail = error instanceof Error ? error.message : String(error);
    throw new CascadeError(`invalid JSON ${label}: ${detail}`);
  }
}

export async function readStructured<T = unknown>(
  path: string,
  label = rel(path),
  options: BoundedRegularFileOptions = {},
): Promise<T> {
  const extension = extname(path).toLowerCase();
  if (extension !== ".json" && extension !== ".yaml" && extension !== ".yml") {
    throw new CascadeError(`${label} must use .json, .yaml, or .yml`);
  }
  const bytes = await readBoundedRegularFile(path, label, {
    maxBytes: 1024 * 1024,
    ...options,
  });
  let source: string;
  try {
    source = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new CascadeError(`${label} must be valid UTF-8`);
  }
  return parseStructuredText<T>(source, extension, label);
}

export function stringifyYaml(value: unknown): string {
  assertJsonCompatible(value, "YAML output");
  const stable = JSON.parse(stableJson(value)) as unknown;
  return stringify(stable, {
    aliasDuplicateObjects: false,
    indent: 2,
    lineWidth: 0,
    simpleKeys: false,
  });
}
