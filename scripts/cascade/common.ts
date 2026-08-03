import {
  copyFile,
  link,
  mkdir,
  open,
  readdir,
  readFile,
  rename,
  stat,
  unlink,
  writeFile,
} from "node:fs/promises";
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
  try {
    return JSON.parse(await readText(path)) as T;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new CascadeError(`invalid JSON ${rel(path)}: ${detail}`);
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

export async function writeJson(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${stableJson(value, true)}\n`, "utf8");
}

export async function writeJsonExclusive(
  path: string,
  value: unknown,
): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const handle = await open(path, "wx");
  try {
    await handle.writeFile(`${stableJson(value, true)}\n`, "utf8");
  } finally {
    await handle.close();
  }
}

export async function writeTextExclusive(
  path: string,
  value: string,
): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const handle = await open(path, "wx");
  try {
    await handle.writeFile(value, "utf8");
  } finally {
    await handle.close();
  }
}

export async function writeJsonAtomic(
  path: string,
  value: unknown,
): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${crypto.randomUUID()}`;
  try {
    await writeFile(temporary, `${stableJson(value, true)}\n`, {
      encoding: "utf8",
      flag: "wx",
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
): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${crypto.randomUUID()}`;
  try {
    await writeFile(temporary, `${stableJson(value, true)}\n`, {
      encoding: "utf8",
      flag: "wx",
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
    };
  }
  const childEnv = { ...Bun.env, ...options.env };
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
  };
}

export function printError(error: unknown): number {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`ERROR: ${message}`);
  return 1;
}
