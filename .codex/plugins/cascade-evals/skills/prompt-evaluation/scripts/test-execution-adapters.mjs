#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { chmod, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { test } from "node:test";
import { EXECUTION_RUNTIME_SHA256, runCommand, runModel, runModelPhase } from "./execution-adapters.mjs";

const root = await mkdtemp(join(tmpdir(), "cascade-prompt-adapter-test-"));
const adapter = join(root, "adapter.cjs");
const config = join(root, "adapters.json");
await writeFile(adapter, `#!/usr/bin/env node\nconst request=JSON.parse(require("node:fs").readFileSync(0,"utf8"));if(request.protocol!=="cascade-evals-command-v1")process.exit(9);process.stdout.write(JSON.stringify({text:"model="+request.model+" prompt="+request.prompt,usage:{input_tokens:4,output_tokens:2}}));\n`);
await chmod(adapter, 0o755);
await writeFile(config, `${JSON.stringify({ schema_version: 1, adapters: { fixture: { command: adapter, args: [] } } }, null, 2)}\n`);
const configuration = { model: "closed-model-x", prompt: "hello", cwd: root, timeoutMs: 1000, adapter: "command-json-v1", adapterConfig: config, adapterId: "fixture" };
const result = await runModel(configuration);
if (result.status !== "COMPLETED" || result.final_text !== "model=closed-model-x prompt=hello") throw new Error(JSON.stringify(result));
if (result.usage.input_tokens !== 4 || result.adapter_identity !== "fixture") throw new Error("normalized adapter telemetry is missing");
console.log(`PASS: provider-neutral command adapter protocol and normalized response (${root})`);

const command = (script, options = {}) => runCommand({ command: process.execPath, args: ["-e", script], input: "", cwd: root, timeoutMs: 1000, ...options });
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

test("retains raw evidence and exact runtime identity in one phase receipt", async () => {
  const result = await runModelPhase({ ...configuration, phase: "target", runId: "case-v1", runRoot: root });
  const bytes = await readFile(join(root, result.execution_receipt.path));
  assert.equal(sha256(bytes), result.execution_receipt.sha256);
  const receipt = JSON.parse(bytes);
  assert.equal(receipt.status, "COMPLETED");
  assert.equal(receipt.runtime_sha256, EXECUTION_RUNTIME_SHA256);
  assert.equal(receipt.prompt_sha256, sha256(configuration.prompt));
  assert.equal(receipt.stdout_sha256, sha256(await readFile(join(root, "target.jsonl"))));
  assert.equal(receipt.stderr_sha256, sha256(await readFile(join(root, "target.stderr.log"))));
  assert.equal(receipt.output_sha256, sha256(result.final_text));
  assert.equal(existsSync(join(root, "simulations")), false);
  await assert.rejects(runModelPhase({ ...configuration, phase: "target", runId: "case-v1", runRoot: root }), /EEXIST/);
  assert.deepEqual(await readFile(join(root, result.execution_receipt.path)), bytes);
});

test("never replays an invocation left in DISPATCHED state", async () => {
  const path = join(root, "uncertain.execution.json");
  const before = JSON.stringify({ status: "DISPATCHED" });
  await writeFile(path, before);
  await assert.rejects(runModelPhase({ ...configuration, phase: "uncertain", runId: "case-v1", runRoot: root }), /EEXIST/);
  assert.equal(await readFile(path, "utf8"), before);
  assert.equal(existsSync(join(root, "uncertain.jsonl")), false);
});

test("force-terminates a process ignoring SIGTERM and retains partial output", async () => {
  const start = Date.now();
  const result = await command('process.on("SIGTERM",()=>{});process.stdout.write("partial");setInterval(()=>{},10)', { timeoutMs: 150 });
  assert.equal(result.status, "TIMED_OUT");
  assert.equal(result.stdout, "partial");
  assert.ok(Date.now() - start < 2000);
});

test("cancels a running process", async () => {
  const controller = new AbortController();
  const running = command('process.on("SIGTERM",()=>{});setInterval(()=>{},10)', { signal: controller.signal });
  const timer = setTimeout(() => controller.abort(), 100);
  try { assert.equal((await running).status, "CANCELLED"); }
  finally { clearTimeout(timer); }
});

test("pre-dispatch cancellation invokes nothing", async () => {
  const result = await command('throw new Error("must not dispatch")', { signal: AbortSignal.abort() });
  assert.equal(result.status, "CANCELLED");
  assert.equal(result.dispatched, false);
  assert.equal(result.stderr, "");
});

test("bounds output without losing the terminal reason", async () => {
  const result = await command('process.stdout.write("x".repeat(10000));setInterval(()=>{},10)', { maxOutputBytes: 128 });
  assert.equal(result.status, "OUTPUT_LIMIT_EXCEEDED");
  assert.equal(Buffer.byteLength(result.stdout) + Buffer.byteLength(result.stderr), 128);
});

test("preserves process failure instead of relabeling it a timeout", async () => {
  const result = await command('process.stderr.write("failed");process.exit(7)');
  assert.equal(result.status, "EXECUTION_FAILED");
  assert.equal(result.exit_status, 7);
  assert.equal(result.stderr, "failed");
  const signalled = await command('process.kill(process.pid,"SIGTERM")');
  assert.equal(signalled.status, "EXECUTION_FAILED");
});

test("rejects unresolved adapters and unbounded execution before dispatch", async () => {
  await assert.rejects(runModel({ ...configuration, adapterId: "unknown" }), /invalid adapter/);
  await assert.rejects(command("", { timeoutMs: 0 }), /positive integer/);
  await assert.rejects(command("", { timeoutMs: undefined }), /finite time/);
});

test("terminates descendants when the invocation exits", { skip: process.platform === "win32" }, async () => {
  const marker = join(root, "orphan.txt");
  const descendant = `setTimeout(()=>require("node:fs").writeFileSync(${JSON.stringify(marker)},"orphan"),300)`;
  const result = await command(`require("node:child_process").spawn(process.execPath,["-e",${JSON.stringify(descendant)}],{stdio:"ignore"});setTimeout(()=>process.exit(0),50)`);
  assert.equal(result.status, "COMPLETED");
  await new Promise((resolve) => setTimeout(resolve, 400));
  assert.equal(existsSync(marker), false);
});

test("requires a completed Codex turn, even when partial agent text exists", async () => {
  const fake = join(root, "codex");
  const originalPath = process.env.PATH;
  process.env.PATH = `${root}:${originalPath}`;
  try {
    for (const terminal of [null, "turn.failed", "turn.completed"]) {
      const events = [{ type: "item.completed", item: { type: "command_execution", aggregated_output: "observed" } }, { type: "item.started", item: { type: "command_execution" } }, { type: "item.completed", item: { type: "agent_message", text: "partial" } }, ...(terminal ? [{ type: terminal }] : [])];
      await writeFile(fake, `#!/usr/bin/env node\nprocess.stdout.write(${JSON.stringify(events.map((event) => JSON.stringify(event)).join("\n"))});`);
      await chmod(fake, 0o755);
      const result = await runModel({ model: "fixture", prompt: "fixture", cwd: root, timeoutMs: 1000 });
      assert.equal(result.status, terminal === "turn.completed" ? "COMPLETED" : "INVALID_ADAPTER_RESPONSE");
      if (terminal === "turn.completed") assert.deepEqual(result.trace_metrics, { command_executions: 1, tool_output_chars: 8 });
    }
  } finally { process.env.PATH = originalPath; }
});

test("Codex evaluation contexts exclude repository instructions and retain only requested plugin discovery", async () => {
  const fake = join(root, "codex");
  const originalPath = process.env.PATH;
  await writeFile(fake, `#!/usr/bin/env node\nconsole.log(JSON.stringify({type:"item.completed",item:{type:"agent_message",text:JSON.stringify({cwd:process.cwd(),args:process.argv.slice(2)})}}));console.log(JSON.stringify({type:"turn.completed"}));`);
  await chmod(fake, 0o755);
  process.env.PATH = `${root}:${originalPath}`;
  try {
    for (const installedPluginDiscovery of [false, true]) {
      const result = await runModel({ model: "fixture", prompt: "fixture", cwd: root, timeoutMs: 1000, installedPluginDiscovery });
      assert.equal(result.status, "COMPLETED");
      const observed = JSON.parse(result.final_text);
      assert.notEqual(observed.cwd, root);
      assert.equal(existsSync(observed.cwd), false, "temporary context must be cleaned up");
      assert.ok(observed.args.includes("project_doc_max_bytes=0"));
      assert.equal(observed.args.includes("--ignore-user-config"), !installedPluginDiscovery);
      assert.equal(observed.args.includes("plugins"), !installedPluginDiscovery);
      assert.equal(observed.args[observed.args.indexOf("--sandbox") + 1], "read-only");
      assert.ok(observed.args.includes("apps"));
    }
  } finally { process.env.PATH = originalPath; }
});
