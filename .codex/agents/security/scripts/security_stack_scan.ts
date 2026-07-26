#!/usr/bin/env bun

import { readdir } from "node:fs/promises";
import { extname, resolve } from "node:path";

const IGNORED = new Set([
  ".git",
  ".artifacts",
  ".mypy_cache",
  ".pytest_cache",
  ".ruff_cache",
  ".venv",
  "__pycache__",
  "build",
  "dist",
  "node_modules",
  "target",
  "vendor",
]);

const MANIFESTS = new Set([
  "bun.lock",
  "cargo.toml",
  "composer.json",
  "deno.json",
  "docker-compose.yml",
  "docker-compose.yaml",
  "dockerfile",
  "gemfile",
  "go.mod",
  "package-lock.json",
  "package.json",
  "pnpm-lock.yaml",
  "poetry.lock",
  "pom.xml",
  "pyproject.toml",
  "requirements.txt",
  "uv.lock",
  "yarn.lock",
]);

const CATEGORY_TERMS: Record<string, Set<string>> = {
  auth_session: new Set(["auth", "jwt", "login", "logout", "oauth", "rbac", "session", "token"]),
  routes_boundaries: new Set(["api", "controller", "endpoint", "handler", "middleware", "route"]),
  data_tenant: new Set(["database", "db", "migration", "model", "organization", "repository", "schema", "tenant"]),
  secrets_config: new Set(["config", "credential", "env", "secret", "setting", "vault"]),
  audit_telemetry: new Set(["analytics", "audit", "log", "metric", "telemetry", "trace"]),
  files_ingestion: new Set(["document", "file", "ingest", "parser", "storage", "upload"]),
  agents_prompts: new Set(["agent", "llm", "memory", "prompt", "rag", "retrieval", "tool"]),
  external_integrations: new Set(["adapter", "client", "connector", "integration", "provider", "webhook"]),
  infrastructure: new Set(["cloud", "docker", "helm", "infra", "kubernetes", "terraform"]),
  tests: new Set(["e2e", "fixture", "mock", "spec", "test"]),
};

function parseArgs(argv: string[]): { root: string; maxFiles: number; maxPerCategory: number } {
  let root = ".";
  let maxFiles = 100_000;
  let maxPerCategory = 200;
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index]!;
    if (value === "--max-files") maxFiles = Number(argv[++index]);
    else if (value === "--max-per-category") maxPerCategory = Number(argv[++index]);
    else if (!value.startsWith("-")) root = value;
  }
  return { root, maxFiles, maxPerCategory };
}

function tokensFor(path: string): Set<string> {
  return new Set(path.toLowerCase().replaceAll("-", "_").replaceAll(".", "_").replaceAll("/", "_").split("_").filter(Boolean));
}

async function scan(root: string, maxFiles: number, maxPerCategory: number): Promise<Record<string, unknown>> {
  const extensionCounts = new Map<string, number>();
  const manifests: string[] = [];
  const surfaces = Object.fromEntries(Object.keys(CATEGORY_TERMS).map((name) => [name, [] as string[]]));
  let scanned = 0;
  let truncated = false;

  async function visit(directory: string, prefix = ""): Promise<void> {
    for (const entry of (await readdir(directory, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
      if (IGNORED.has(entry.name)) continue;
      const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        await visit(resolve(directory, entry.name), relative);
        if (truncated) return;
        continue;
      }
      if (!entry.isFile()) continue;
      scanned += 1;
      if (scanned > maxFiles) {
        truncated = true;
        return;
      }
      const extension = extname(entry.name).toLowerCase() || "<none>";
      extensionCounts.set(extension, (extensionCounts.get(extension) ?? 0) + 1);
      if (MANIFESTS.has(entry.name.toLowerCase())) manifests.push(relative);
      const tokens = tokensFor(relative);
      for (const [category, terms] of Object.entries(CATEGORY_TERMS)) {
        if ([...terms].some((term) => tokens.has(term)) && surfaces[category]!.length < maxPerCategory) {
          surfaces[category]!.push(relative);
        }
      }
    }
  }

  await visit(root);
  return {
    schema_version: 1,
    root,
    scanned_files: Math.min(scanned, maxFiles),
    truncated,
    content_read: false,
    manifests: manifests.slice(0, maxPerCategory),
    extension_counts: Object.fromEntries([...extensionCounts].sort()),
    security_surfaces: surfaces,
    guardrail: "Filename-only inventory; inspect selected source files separately and never print secret values.",
  };
}

const args = parseArgs(Bun.argv.slice(2));
const root = resolve(args.root);
try {
  const result = await scan(root, args.maxFiles, args.maxPerCategory);
  console.log(JSON.stringify(result, null, 2));
} catch {
  console.log(JSON.stringify({ error: `repository root is not a directory: ${args.root}` }));
  process.exitCode = 2;
}
