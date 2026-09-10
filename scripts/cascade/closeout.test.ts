import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, writeFile, readFile, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { checkCloseout, closeoutContractPath, snapshotSubject, type CloseoutContract } from "./closeout";
import { handleCloseoutHook } from "./closeout-hook";

let root: string;
const sha = (text: string) => createHash("sha256").update(text).digest("hex");
function git(...args: string[]) {
  const result = Bun.spawnSync(["git", ...args], { cwd: root, stdout: "pipe", stderr: "pipe" });
  expect(result.exitCode).toBe(0);
}
beforeEach(async () => {
  root = await mkdtemp(resolve(tmpdir(), "cascade-closeout-"));
  git("init", "-q");
  await writeFile(resolve(root, ".gitignore"), ".artifacts/\n");
  await writeFile(resolve(root, "subject.txt"), "base\n");
  git("add", ".");
  git("-c", "user.name=Fixture", "-c", "user.email=fixture@example.invalid", "-c", "commit.gpgsign=false", "commit", "-qm", "fixture");
  await mkdir(resolve(root, ".artifacts/closeout"), { recursive: true });
});
afterEach(async () => { await rm(root, { recursive: true, force: true }); });

async function prepare(options: { status?: string; context?: string; independent?: boolean } = {}) {
  const subject = await snapshotSubject(root, ["subject.txt"]);
  const receipt = JSON.stringify({ schema_version: 1, check_id: "focused", subject_sha256: subject.sha256,
    status: options.status ?? "PASS", context_id: options.context ?? "review-context" });
  await writeFile(resolve(root, ".artifacts/evidence.json"), receipt);
  const contract: CloseoutContract = { schema_version: 1, task_id: "task", turn_id: "turn", producer_context_id: "writer-context",
    subject, required_checks: [{ id: "focused", evidence_path: ".artifacts/evidence.json", evidence_sha256: sha(receipt), independent: options.independent ?? false }],
    no_checks_reason: null, unresolved: [] };
  const file = closeoutContractPath(contract.task_id, contract.turn_id);
  await writeFile(resolve(root, file), JSON.stringify(contract));
  return { contract, file };
}

describe("task-scoped closeout integrity", () => {
  test("CLI and hook share a passing contract without claiming semantic acceptance", async () => {
    const { file } = await prepare();
    const result = await checkCloseout(root, file, { task_id: "task", turn_id: "turn" });
    expect(result.status).toBe("PASS");
    expect(result.evidence_class).toBe("integrity-only");
    expect(await handleCloseoutHook({ hook_event_name: "Stop", session_id: "task", turn_id: "turn", cwd: root })).toEqual({});
    const cli = Bun.spawnSync([process.execPath, resolve(import.meta.dir, "../cascade.ts"), "closeout", "check", "--file", file], { cwd: root });
    expect(cli.exitCode).toBe(0);
    expect(JSON.parse(cli.stdout.toString())).toEqual(result);
  });
  test("detects direct filesystem edits, independent of apply_patch", async () => {
    const { file } = await prepare();
    await writeFile(resolve(root, "subject.txt"), "changed by another tool\n");
    const result = await checkCloseout(root, file);
    expect(result.status).toBe("GAP");
    expect(result.changed_paths).toContain("subject.txt");
    const output = await handleCloseoutHook({ hook_event_name: "Stop", session_id: "task", turn_id: "turn", cwd: root });
    expect(output.systemMessage).toContain("GAP");
    expect(output.decision).toBeUndefined();
  });
  test("prompt binding and the real Stop subprocess use the same current-turn contract", async () => {
    const { file } = await prepare();
    const input = { session_id: "task", turn_id: "turn", cwd: root };
    const prompt = await handleCloseoutHook({ ...input, hook_event_name: "UserPromptSubmit" });
    expect(prompt.hookSpecificOutput).toMatchObject({ hookEventName: "UserPromptSubmit" });
    expect(JSON.stringify(prompt)).toContain(file);
    await writeFile(resolve(root, "subject.txt"), "stale\n");
    const hook = Bun.spawnSync([process.execPath, resolve(import.meta.dir, "closeout-hook.ts")], {
      cwd: root, stdin: Buffer.from(JSON.stringify({ ...input, hook_event_name: "Stop" })), stdout: "pipe", stderr: "pipe",
    });
    expect(hook.exitCode).toBe(0);
    const output = JSON.parse(hook.stdout.toString());
    expect(output.systemMessage).toContain("GAP");
    expect(output.decision).toBeUndefined();
    const cli = Bun.spawnSync([process.execPath, resolve(import.meta.dir, "../cascade.ts"), "closeout", "check", "--file", file], { cwd: root });
    expect(cli.exitCode).toBe(1);
  });
  test("staged edits cannot be hidden by restoring worktree bytes", async () => {
    const { file } = await prepare();
    await writeFile(resolve(root, "subject.txt"), "staged\n");
    git("add", "subject.txt");
    await writeFile(resolve(root, "subject.txt"), "base\n");
    expect((await checkCloseout(root, file)).status).toBe("GAP");
  });
  test("unrelated dirty files remain untouched and outside the verdict", async () => {
    const { file } = await prepare();
    await writeFile(resolve(root, "unrelated.txt"), "other owner's work");
    const result = await checkCloseout(root, file);
    expect(result.status).toBe("PASS");
    expect(result.unscoped_change_count).toBe(1);
    expect(await readFile(resolve(root, "unrelated.txt"), "utf8")).toBe("other owner's work");
  });
  test("tracks deletion and previously absent files", async () => {
    const { file } = await prepare();
    await rm(resolve(root, "subject.txt"));
    expect((await checkCloseout(root, file)).status).toBe("GAP");
    const before = await snapshotSubject(root, ["new.txt"]);
    await writeFile(resolve(root, "new.txt"), "new");
    expect((await snapshotSubject(root, ["new.txt"])).sha256).not.toBe(before.sha256);
  });
  test.each(["FAIL", "NOT_RUN", "BLOCKED", "NOT_APPLICABLE"])("required %s evidence is never PASS", async (status) => {
    const { file } = await prepare({ status });
    expect((await checkCloseout(root, file)).status).toBe("GAP");
  });
  test("missing and edited evidence are rejected", async () => {
    const { file } = await prepare();
    await writeFile(resolve(root, ".artifacts/evidence.json"), "{}");
    expect((await checkCloseout(root, file)).gaps.join()).toContain("evidence bytes changed");
    await rm(resolve(root, ".artifacts/evidence.json"));
    expect((await checkCloseout(root, file)).gaps.join()).toContain("evidence missing");
  });
  test("independence cannot reuse the writer's declared context", async () => {
    const { file } = await prepare({ independent: true, context: "writer-context" });
    expect((await checkCloseout(root, file)).gaps.join()).toContain("separate reviewer context");
  });
  test("old turn cannot be reused and unregistered turns create no gate", async () => {
    const { file } = await prepare();
    expect((await checkCloseout(root, file, { task_id: "task", turn_id: "next" })).status).toBe("INVALID");
    expect(await handleCloseoutHook({ hook_event_name: "Stop", session_id: "task", turn_id: "next", cwd: root })).toEqual({});
    expect(await handleCloseoutHook({ hook_event_name: "Stop", session_id: "task", turn_id: "turn", cwd: root, stop_hook_active: true })).toEqual({});
  });
  test("open requirements and empty undeclared check sets prevent completion", async () => {
    const { contract, file } = await prepare();
    contract.unresolved.push("required review is pending");
    await writeFile(resolve(root, file), JSON.stringify(contract));
    expect((await checkCloseout(root, file)).status).toBe("GAP");
    contract.unresolved = [];
    contract.required_checks = [];
    await writeFile(resolve(root, file), JSON.stringify(contract));
    expect((await checkCloseout(root, file)).status).toBe("INVALID");
    contract.no_checks_reason = "Accepted mechanical copy change; no execution check required.";
    await writeFile(resolve(root, file), JSON.stringify(contract));
    expect((await checkCloseout(root, file)).status).toBe("PASS");
  });
  test("rejects traversal, symlink reads, duplicate scope and malformed receipts", async () => {
    await expect(snapshotSubject(root, ["../outside"])).rejects.toThrow();
    await expect(snapshotSubject(root, ["*.ts"])).rejects.toThrow();
    await expect(snapshotSubject(root, ["subject.txt", "subject.txt"])).rejects.toThrow();
    await symlink(process.platform === "win32" ? root : "subject.txt", resolve(root, "link.txt"),
      process.platform === "win32" ? "junction" : "file");
    await expect(snapshotSubject(root, ["link.txt"])).rejects.toThrow("must not traverse symlinks");
    const { contract, file } = await prepare();
    const malformed = JSON.stringify({ arbitrary: "PASS" });
    contract.required_checks[0]!.evidence_sha256 = sha(malformed);
    await writeFile(resolve(root, ".artifacts/evidence.json"), malformed);
    await writeFile(resolve(root, file), JSON.stringify(contract));
    expect((await checkCloseout(root, file)).status).toBe("INVALID");
  });
});
