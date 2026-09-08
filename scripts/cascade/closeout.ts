import { createHash } from "node:crypto";
import { lstat, readFile } from "node:fs/promises";
import { isAbsolute, resolve } from "node:path";

const MAX_JSON = 1_048_576;
const MAX_FILE = 32 * 1_048_576;
const sha = (value: string | Uint8Array) => createHash("sha256").update(value).digest("hex");
const digest = /^[a-f0-9]{64}$/;

export interface CloseoutContract {
  schema_version: 1;
  task_id: string;
  turn_id: string;
  producer_context_id: string;
  subject: { paths: string[]; sha256: string };
  required_checks: Array<{ id: string; evidence_path: string; evidence_sha256: string; independent: boolean }>;
  no_checks_reason: string | null;
  unresolved: string[];
}

export interface CloseoutResult {
  status: "PASS" | "GAP" | "INVALID";
  task_id?: string;
  subject_sha256?: string;
  changed_paths: string[];
  unscoped_change_count: number;
  gaps: string[];
  evidence_class: "integrity-only";
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function exact(value: any, keys: string[], label: string): void {
  assert(value && typeof value === "object" && !Array.isArray(value), `${label} must be an object`);
  assert(Object.keys(value).sort().join(",") === [...keys].sort().join(","), `${label} fields are invalid`);
}

function nonempty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= 4096;
}

function validPath(path: unknown): asserts path is string {
  assert(nonempty(path) && !isAbsolute(path) && !/[\\\0*?\[\]]/.test(path)
    && path.split("/").every((part) => part && part !== "." && part !== "..")
    && path.split("/")[0] !== ".git", "expected an exact repository-relative file path");
}

// No symlink traversal, including parent directories. Absence is valid for deleted scope files.
async function fileBytes(root: string, path: string, limit: number): Promise<Buffer | null> {
  validPath(path);
  const parts = path.split("/");
  for (let i = 1; i <= parts.length; i++) {
    const location = resolve(root, ...parts.slice(0, i));
    let info;
    try { info = await lstat(location); }
    catch (error: any) { if (error.code === "ENOENT") return null; throw error; }
    assert(!info.isSymbolicLink(), "closeout paths must not traverse symlinks");
    if (i < parts.length) assert(info.isDirectory(), "closeout parent must be a directory");
    else {
      assert(info.isFile() && info.size <= limit, "closeout input is not a bounded regular file");
      const bytes = await readFile(location);
      assert(bytes.length <= limit, "closeout input exceeds its size bound");
      return bytes;
    }
  }
  return null;
}

function git(root: string, args: string[]): string {
  const result = Bun.spawnSync(["git", ...args], {
    cwd: root, env: { ...process.env, GIT_OPTIONAL_LOCKS: "0", GIT_LITERAL_PATHSPECS: "1" },
    stdout: "pipe", stderr: "pipe", timeout: 5000,
  });
  assert(result.exitCode === 0, "closeout requires a readable Git repository");
  assert(result.stdout.length <= MAX_FILE, "Git inventory exceeds closeout bounds");
  return result.stdout.toString();
}

export function repositoryRoot(cwd = process.cwd()): string {
  return git(cwd, ["rev-parse", "--show-toplevel"]).trim();
}

export async function snapshotSubject(root: string, paths: string[]): Promise<{ paths: string[]; sha256: string }> {
  assert(Array.isArray(paths) && paths.length > 0 && paths.length <= 256, "subject needs 1..256 exact file paths");
  paths.forEach(validPath);
  assert(new Set(paths).size === paths.length, "subject paths must be unique");
  const ordered = [...paths].sort();
  const records = [];
  for (const path of ordered) {
    const bytes = await fileBytes(root, path, MAX_FILE);
    const info = bytes === null ? null : await lstat(resolve(root, path));
    const index = git(root, ["ls-files", "--stage", "-z", "--", path]);
    assert(!index.split("\0").some((line) => /^\d+ [a-f0-9]+ [123]\t/.test(line)), "subject contains an unresolved merge conflict");
    records.push({ path, working_sha256: bytes === null ? null : sha(bytes),
      executable: info === null ? null : Boolean(info.mode & 0o111),
      index });
  }
  return { paths: ordered, sha256: sha(JSON.stringify(records)) };
}

export function closeoutContractPath(taskId: string, turnId: string): string {
  assert(nonempty(taskId) && nonempty(turnId), "task and turn identity are required");
  return `.artifacts/closeout/${sha(JSON.stringify([taskId, turnId]))}.json`;
}

export function validateContract(value: any): asserts value is CloseoutContract {
  exact(value, ["schema_version", "task_id", "turn_id", "producer_context_id", "subject", "required_checks", "no_checks_reason", "unresolved"], "closeout contract");
  assert(value.schema_version === 1 && [value.task_id, value.turn_id, value.producer_context_id].every(nonempty), "invalid closeout identity");
  exact(value.subject, ["paths", "sha256"], "subject");
  assert(typeof value.subject.sha256 === "string" && digest.test(value.subject.sha256), "invalid subject digest");
  assert(Array.isArray(value.subject.paths) && value.subject.paths.length > 0 && value.subject.paths.length <= 256, "invalid subject paths");
  value.subject.paths.forEach(validPath);
  assert(new Set(value.subject.paths).size === value.subject.paths.length, "duplicate subject paths");
  assert(Array.isArray(value.required_checks) && value.required_checks.length <= 128, "invalid required checks");
  assert(Array.isArray(value.unresolved) && value.unresolved.length <= 128 && value.unresolved.every(nonempty), "invalid unresolved criteria");
  assert(value.no_checks_reason === null || nonempty(value.no_checks_reason), "invalid no-checks reason");
  assert(value.required_checks.length > 0 || nonempty(value.no_checks_reason), "empty check set needs an explicit reason");
  const ids = new Set();
  for (const check of value.required_checks) {
    exact(check, ["id", "evidence_path", "evidence_sha256", "independent"], "required check");
    assert(nonempty(check.id) && !ids.has(check.id), "check IDs must be nonempty and unique");
    ids.add(check.id);
    validPath(check.evidence_path);
    assert(typeof check.evidence_sha256 === "string" && digest.test(check.evidence_sha256) && typeof check.independent === "boolean", "invalid evidence binding");
    assert(!value.subject.paths.includes(check.evidence_path), "evidence must be outside the measured subject");
  }
}

export async function checkCloseout(root: string, file: string, binding?: { task_id: string; turn_id: string }): Promise<CloseoutResult> {
  const result: CloseoutResult = { status: "INVALID", changed_paths: [], unscoped_change_count: 0, gaps: [], evidence_class: "integrity-only" };
  try {
    const bytes = await fileBytes(root, file, MAX_JSON);
    assert(bytes, "closeout contract is missing");
    const contract = JSON.parse(bytes.toString());
    validateContract(contract);
    result.task_id = contract.task_id;
    assert(!contract.subject.paths.includes(file), "contract must be outside the measured subject");
    if (binding) assert(contract.task_id === binding.task_id && contract.turn_id === binding.turn_id, "stale task/turn binding");
    const current = await snapshotSubject(root, contract.subject.paths);
    result.subject_sha256 = current.sha256;
    if (current.sha256 !== contract.subject.sha256) result.gaps.push("subject changed since evidence was bound");
    const changed = new Set([
      ...git(root, ["diff", "--no-ext-diff", "--no-renames", "--name-only", "-z", "--"]).split("\0"),
      ...git(root, ["diff", "--cached", "--no-ext-diff", "--no-renames", "--name-only", "-z", "--"]).split("\0"),
      ...git(root, ["ls-files", "--others", "--exclude-standard", "-z"]).split("\0"),
    ].filter(Boolean));
    result.changed_paths = [...changed].filter((path) => current.paths.includes(path)).sort();
    result.unscoped_change_count = [...changed].filter((path) => !current.paths.includes(path)).length;
    // File integrity verifies supplied evidence. It does not authenticate its author or score semantics.
    for (const check of contract.required_checks) {
      const evidence = await fileBytes(root, check.evidence_path, MAX_JSON);
      if (!evidence) { result.gaps.push(`${check.id}: evidence missing`); continue; }
      if (sha(evidence) !== check.evidence_sha256) { result.gaps.push(`${check.id}: evidence bytes changed`); continue; }
      const receipt = JSON.parse(evidence.toString());
      exact(receipt, ["schema_version", "check_id", "subject_sha256", "status", "context_id"], "evidence receipt");
      assert(receipt.schema_version === 1 && nonempty(receipt.check_id) && nonempty(receipt.context_id)
        && typeof receipt.subject_sha256 === "string" && digest.test(receipt.subject_sha256)
        && ["PASS", "FAIL", "BLOCKED", "NOT_RUN", "NOT_APPLICABLE"].includes(receipt.status), "invalid evidence receipt");
      if (receipt.check_id !== check.id || receipt.subject_sha256 !== current.sha256) result.gaps.push(`${check.id}: stale or mismatched receipt`);
      if (receipt.status !== "PASS") result.gaps.push(`${check.id}: required result is ${receipt.status}`);
      if (check.independent && [contract.producer_context_id, contract.task_id].includes(receipt.context_id)) result.gaps.push(`${check.id}: separate reviewer context is missing`);
    }
    result.gaps.push(...contract.unresolved.map((item: string) => `unresolved: ${item}`));
    const after = await snapshotSubject(root, current.paths);
    if (after.sha256 !== current.sha256) result.gaps.push("subject changed during closeout check");
    result.status = result.gaps.length ? "GAP" : "PASS";
  } catch (error) {
    result.status = "INVALID";
    result.gaps.push(error instanceof Error ? error.message : "invalid closeout input");
  }
  return result;
}

export async function main(args: string[]): Promise<number> {
  if (!args.length || args[0] === "--help") {
    console.log("cascade closeout snapshot --path FILE [--path FILE]\ncascade closeout check --file CONTRACT\ncascade closeout path --session ID --turn ID");
    return 0;
  }
  const [command, ...rest] = args;
  const flags: Record<string, string[]> = {};
  for (let i = 0; i < rest.length; i += 2) {
    assert(rest[i]?.startsWith("--") && nonempty(rest[i + 1]), "expected flag/value pairs");
    (flags[rest[i]!] ??= []).push(rest[i + 1]!);
  }
  const allowed = command === "snapshot" ? ["--path"] : command === "check" ? ["--file"] : command === "path" ? ["--session", "--turn"] : [];
  assert(allowed.length > 0 && Object.keys(flags).every((key) => allowed.includes(key)), "invalid closeout command or option");
  if (command !== "snapshot") assert(Object.values(flags).every((values) => values.length === 1), "duplicate closeout option");
  if (command === "path") {
    console.log(closeoutContractPath(flags["--session"]?.[0]!, flags["--turn"]?.[0]!));
    return 0;
  }
  const root = repositoryRoot();
  if (command === "snapshot") { console.log(JSON.stringify(await snapshotSubject(root, flags["--path"] ?? []), null, 2)); return 0; }
  const result = await checkCloseout(root, flags["--file"]?.[0]!);
  console.log(JSON.stringify(result, null, 2));
  return result.status === "PASS" ? 0 : 1;
}
