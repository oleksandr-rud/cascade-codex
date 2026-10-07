import { mkdir, readFile as readFileOnce, writeFile as writeFileOnce, unlink, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";

// One per-user pool across campaigns and installed versions, not per launcher.
export const GLOBAL_MODEL_LIMIT = 3;
export const coordinationRoot = () => resolve(process.env.CASCADE_PROMPT_EVAL_COORDINATION_ROOT ?? join(homedir(), ".codex", "prompt-evaluation-execution"));
const alive = pid => { try { process.kill(pid, 0); return true; } catch (e) { return e.code !== "ESRCH"; } };

// Windows can briefly reject open while another process closes/deletes a slot.
// Retry only that pre-open failure; never change permissions, ignore an owner,
// repeat a possibly completed write/unlink, or hide a persistent access error.
async function retryFileOpen(operation) {
  for (let attempt = 0; ; attempt++) {
    try { return await operation(); }
    catch (error) {
      if (error.code !== "EPERM" || error.syscall !== "open" || attempt >= 5) throw error;
      await delay(50);
    }
  }
}
const readFile = (...args) => retryFileOpen(() => readFileOnce(...args));
const writeFile = (...args) => retryFileOpen(() => writeFileOnce(...args));

export async function haltExecution(reason, root = coordinationRoot()) {
  await mkdir(root, { recursive: true });
  try { await writeFile(join(root, "halt.json"), JSON.stringify({ reason, at: new Date().toISOString(), pid: process.pid }), { flag: "wx" }); }
  catch (error) { if (error.code !== "EEXIST") throw error; }
}

export async function executionHealth(root = coordinationRoot()) {
  try { return JSON.parse(await readFile(join(root, "halt.json"), "utf8")); }
  catch (error) { if (error.code === "ENOENT") return null; throw error; }
}

export async function acquireExecution({ signal, timeoutMs = 1_800_000, root = coordinationRoot() } = {}) {
  await mkdir(root, { recursive: true });
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (signal?.aborted) throw Object.assign(new Error("cancelled while queued"), { status: "CANCELLED" });
    // Scan every slot before claiming an empty one: an orphan in a higher slot
    // must halt new dispatch even when slot zero is free.
    for (let slot = 0; slot < GLOBAL_MODEL_LIMIT; slot++) {
      const path = join(root, `slot-${slot}.json`);
      try {
        const owner = JSON.parse(await readFile(path, "utf8"));
        if (!Number.isInteger(owner.pid) || owner.pid <= 0 || !alive(owner.pid)) await haltExecution("an invocation owner is absent or unknown; inspect partial evidence before recovery", root);
      } catch (error) {
        if (error.code === "ENOENT") continue;
        if (!(error instanceof SyntaxError)) throw error;
        const info = await stat(path).catch(e => { if (e.code !== "ENOENT") throw e; });
        if (info && Date.now() - info.mtimeMs > 1000) await haltExecution("an execution ownership receipt is unreadable; inspect it before recovery", root);
      }
    }
    const health = await executionHealth(root);
    if (health) throw Object.assign(new Error(`execution halted: ${health.reason}`), { status: "ENVIRONMENT_UNHEALTHY" });
    for (let slot = 0; slot < GLOBAL_MODEL_LIMIT; slot++) {
      const path = join(root, `slot-${slot}.json`), token = randomUUID();
      try {
        await writeFile(path, JSON.stringify({ pid: process.pid, token, at: new Date().toISOString() }), { flag: "wx" });
        if (await executionHealth(root)) { await unlink(path); break; }
        return { wait_ms: Date.now() - started, root, slot, async release() {
          const owner = JSON.parse(await readFile(path, "utf8"));
          if (owner.token !== token) throw new Error("execution slot ownership changed");
          await unlink(path);
        } };
      } catch (error) {
        if (error.code !== "EEXIST") throw error;
        try {
          const owner = JSON.parse(await readFile(path, "utf8"));
          if (Number.isInteger(owner.pid) && owner.pid > 0 && !alive(owner.pid)) {
            await haltExecution("an invocation owner exited without releasing its slot; inspect partial evidence before recovery", root);
            break;
          }
        } catch (readError) { if (!["ENOENT"].includes(readError.code) && !(readError instanceof SyntaxError)) throw readError; }
      }
    }
    await delay(100, undefined, { signal }).catch(error => { throw Object.assign(error, { status: "CANCELLED" }); });
  }
  throw Object.assign(new Error("global execution queue deadline exceeded; model not dispatched"), { status: "QUEUE_TIMED_OUT" });
}

export async function recoverExecution(root = coordinationRoot()) {
  if (!await executionHealth(root)) throw new Error("recovery requires an existing halt record");
  // Explicit operator recovery only. Never release an alive or unreadable owner.
  for (let slot = 0; slot < GLOBAL_MODEL_LIMIT; slot++) {
    const path = join(root, `slot-${slot}.json`);
    try {
      const owner = JSON.parse(await readFile(path, "utf8"));
      if (!Number.isInteger(owner.pid) || owner.pid <= 0 || alive(owner.pid)) throw new Error("cannot recover while invocation owners are active or unknown");
    } catch (error) { if (error.code !== "ENOENT") throw error; }
  }
  for (let slot = 0; slot < GLOBAL_MODEL_LIMIT; slot++) await unlink(join(root, `slot-${slot}.json`)).catch(e => { if (e.code !== "ENOENT") throw e; });
  await unlink(join(root, "halt.json")).catch(e => { if (e.code !== "ENOENT") throw e; });
}
