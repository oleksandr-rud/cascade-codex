#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

function assertUnicodeScalarString(value) {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) throw new Error("JCS rejects a lone high surrogate");
      index += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      throw new Error("JCS rejects a lone low surrogate");
    }
  }
}

export function canonicalize(value) {
  if (value === null) return "null";
  if (value === true) return "true";
  if (value === false) return "false";
  if (typeof value === "string") {
    assertUnicodeScalarString(value);
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("JCS rejects non-finite numbers");
    return JSON.stringify(Object.is(value, -0) ? 0 : value);
  }
  if (Array.isArray(value)) return `[${value.map((item) => canonicalize(item)).join(",")}]`;
  if (typeof value === "object") {
    const keys = Object.keys(value).sort();
    return `{${keys.map((key) => {
      assertUnicodeScalarString(key);
      return `${JSON.stringify(key)}:${canonicalize(value[key])}`;
    }).join(",")}}`;
  }
  throw new Error(`JCS cannot encode ${typeof value}`);
}

export function canonicalDigest(value) {
  const canonical = canonicalize(value);
  return { canonical, sha256: crypto.createHash("sha256").update(canonical, "utf8").digest("hex") };
}

function main(argv) {
  const input = argv[2];
  if (!input) throw new Error("usage: canonicalize_json.mjs INPUT [--output PATH]");
  const outputIndex = argv.indexOf("--output");
  const output = outputIndex >= 0 ? argv[outputIndex + 1] : null;
  if (outputIndex >= 0 && !output) throw new Error("--output requires a path");
  const raw = input === "-" ? fs.readFileSync(0, "utf8") : fs.readFileSync(input, "utf8");
  const duplicateCheck = spawnSync("python3", ["-c", [
    "import json, sys",
    "def pairs(items):",
    "    result = {}",
    "    for key, value in items:",
    "        if key in result: raise ValueError(f'duplicate JSON member: {key}')",
    "        result[key] = value",
    "    return result",
    "json.loads(sys.stdin.read(), object_pairs_hook=pairs)",
  ].join("\n")], { input: raw, encoding: "utf8" });
  if (duplicateCheck.status !== 0) throw new Error(`I-JSON validation failed: ${duplicateCheck.stderr.trim() || "duplicate member"}`);
  const result = canonicalDigest(JSON.parse(raw));
  if (output) fs.writeFileSync(output, result.canonical, "utf8");
  process.stdout.write(`${JSON.stringify({ status: "PASS", algorithm: "RFC8785-JCS+SHA-256", input, output, sha256: result.sha256 })}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { main(process.argv); }
  catch (error) {
    process.stderr.write(`${JSON.stringify({ status: "INVALID", reason: error.message })}\n`);
    process.exitCode = 2;
  }
}
