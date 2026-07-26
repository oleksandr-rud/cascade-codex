import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

export class CascadeError extends Error {}

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
  return JSON.parse(await readText(path)) as T;
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

export async function writeJson(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${stableJson(value, true)}\n`, "utf8");
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
}

export async function runCommand(
  argv: string[],
  options: {
    cwd?: string;
    env?: Record<string, string | undefined>;
    timeoutMs?: number;
  } = {},
): Promise<CommandResult> {
  if (!argv.length) throw new CascadeError("command argv must not be empty");
  const started = performance.now();
  const process = Bun.spawn(argv, {
    cwd: options.cwd ?? ROOT,
    env: { ...Bun.env, ...options.env },
    stdout: "pipe",
    stderr: "pipe",
  });
  let timedOut = false;
  let timer: Timer | undefined;
  if (options.timeoutMs) {
    timer = setTimeout(() => {
      timedOut = true;
      process.kill();
    }, options.timeoutMs);
  }
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(process.stdout).text(),
    new Response(process.stderr).text(),
    process.exited,
  ]);
  if (timer) clearTimeout(timer);
  return {
    argv,
    exitCode: timedOut ? 124 : exitCode,
    stdout,
    stderr,
    durationMs: Math.round(performance.now() - started),
    timedOut,
  };
}

export function printError(error: unknown): number {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`ERROR: ${message}`);
  return 1;
}
