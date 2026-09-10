#!/usr/bin/env node

import { chmod, mkdtemp, writeFile, mkdir, rename, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { runModel, extractCodex } from "./execution-adapters.mjs";

const root = await mkdtemp(join(tmpdir(), "cascade-prompt-adapter-test-"));
const adapter = join(root, "adapter.cjs");
const config = join(root, "adapters.json");
await writeFile(adapter, `#!/usr/bin/env node\nconst request=JSON.parse(require("node:fs").readFileSync(0,"utf8"));if(request.protocol!=="cascade-evals-command-v1")process.exit(9);process.stdout.write(JSON.stringify({text:"model="+request.model+" prompt="+request.prompt,usage:{input_tokens:4,output_tokens:2}}));\n`);
await chmod(adapter, 0o755);
await writeFile(config, `${JSON.stringify({ schema_version: 1, adapters: { fixture: { command: process.execPath, args: [adapter] } } }, null, 2)}\n`);
const result = await runModel({ model: "closed-model-x", prompt: "hello", cwd: root, timeoutMs: 1000, adapter: "command-json-v1", adapterConfig: config, adapterId: "fixture" });
if (result.status !== "COMPLETED" || result.final_text !== "model=closed-model-x prompt=hello") throw new Error(JSON.stringify(result));
if (result.usage.input_tokens !== 4 || result.adapter_identity !== "fixture") throw new Error("normalized adapter telemetry is missing");
console.log(`PASS: provider-neutral command adapter protocol and normalized response (${root})`);

// Material evaluation boundaries: evidence isolation, honest BLOCKED, cache identity.
const { judgeRequest, parseJudgment, snapshotSubject, assertDisjointRoots, interviewEvidence } = await import("./evaluation-integrity.mjs");
const profile = JSON.parse(await readFile(new URL("../evals/judges/interview-v3.json", import.meta.url), "utf8"));
const identity = {fixture_id:"boundary",run_id:"run-boundary"};
const packet = {first_response:"observed text"};
const payload = {profile_id:profile.profile_id,rubric_version:3,...identity,ratings:profile.dimensions.map(d=>({dimension_id:d.id,rating:4,rationale:"supported",evidence:["observed text"],evidence_refs:[{pointer:"/first_response",quote:"observed text"}]})),verdict:"RATED",missing_evidence:[]};
const check=(ok,message)=>{if(!ok)throw new Error(message);};
check(parseJudgment(JSON.stringify(payload),profile,identity,packet).harness_verdict==="PASS","complete anchored result");
payload.ratings[0].evidence_refs[0].quote="invented quote";
check(!parseJudgment(JSON.stringify(payload),profile,identity,packet).valid,"invented citations must invalidate the judgment");
payload.ratings[0].evidence_refs[0].quote="observed text";
payload.ratings[0].rating=2;
check(parseJudgment(JSON.stringify(payload),profile,identity,packet).harness_verdict==="FAIL","a material defect must fail a floor even with a high average");
payload.verdict="BLOCKED";payload.ratings=[];payload.missing_evidence=["response unavailable"];
const blocked=parseJudgment(JSON.stringify(payload),profile,identity,packet);
check(blocked.valid&&blocked.harness_verdict==="BLOCKED"&&blocked.score===null,"missing evidence must never become a score");
payload.verdict="RATED";
check(!parseJudgment(JSON.stringify(payload),profile,identity,packet).valid,"RATED with missing evidence is invalid");
const blind=judgeRequest(profile,identity,interviewEvidence({prompt_build_request:"request",first_turn:{state:"GOLD"},judge_context_paths:[]},"response",null,{files:{}}));
check(!/"(?:weight|threshold|minimum_dimension_rating|first_turn|checks|semantic_anchors)"/.test(blind),"private evaluation fields leaked");
const good=[{type:"item.completed",item:{type:"agent_message",text:"answer"}},{type:"turn.completed",usage:{input_tokens:1}}];
check(extractCodex(good.map(JSON.stringify).join("\n")).finalText==="answer","complete no-tool trace");
for(const bad of [[good[0]],[...good,{type:"item.completed",item:{type:"command_execution"}}],[...good,{type:"turn.failed"}]]){
 let rejected=false;try{extractCodex(bad.map(JSON.stringify).join("\n"));}catch{rejected=true;}check(rejected,"incomplete or tool-using trace must be rejected");
}
const subject=join(root,"subject");await mkdir(subject);await writeFile(join(subject,"SKILL.md"),"entry");await writeFile(join(subject,"reference.md"),"rule");
const before=await snapshotSubject(subject);await rename(join(subject,"reference.md"),join(subject,"renamed.md"));const renamed=await snapshotSubject(subject);
check(before.sha256!==renamed.sha256,"subject file identity includes paths");await writeFile(join(subject,"renamed.md"),"changed rule");check(renamed.sha256!==(await snapshotSubject(subject)).sha256,"reference bytes affect subject identity");
let rejected=false;try{assertDisjointRoots(subject,join(subject,"evidence"));}catch{rejected=true;}check(rejected,"subject cannot expose evaluation output");
console.log("PASS: blind rubric, blocked evidence, floor rejection, tool-free trace gate, and complete subject identity");


import assert from "node:assert/strict";
import {test} from "node:test";
import {existsSync} from "node:fs";
import {createHash} from "node:crypto";
import {runCommand,runModelPhase,EXECUTION_RUNTIME_SHA256} from "./execution-adapters.mjs";
const configuration = { model: "closed-model-x", prompt: "hello", cwd: root, timeoutMs: 1000, adapter: "command-json-v1", adapterConfig: config, adapterId: "fixture" };
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


// Contract fixtures exercise proof validation only; they are never live model results.
test("direct replay rejects changed input, identity, trace, runtime and uncertain dispatch", async () => {
  const { replayTarget } = await import("./replay-evidence.mjs");
  const { executionSurface } = await import("./execution-adapters.mjs");
  const sourceRoot = join(root, "direct-proof"), runRoot = join(root, "rejudged");
  await mkdir(sourceRoot); await mkdir(runRoot);
  const task = { id: "proof-contract", version: 1 }, snapshot = { sha256: "frozen-subject" };
  const stdout = good.map(JSON.stringify).join("\n"), output = "answer", prompt = "exact input";
  await writeFile(join(sourceRoot, "run-contract.json"), JSON.stringify({ task, subject_sha256: snapshot.sha256, args: { "run-id": "original" }, execution_runtime_sha256: EXECUTION_RUNTIME_SHA256 }));
  await writeFile(join(sourceRoot, "target.jsonl"), stdout);
  await writeFile(join(sourceRoot, "target.stderr.log"), "");
  await writeFile(join(sourceRoot, "target-output.md"), output);
  const receipt = { run_id: "original", phase: "target", status: "COMPLETED", dispatched: true, adapter: "codex-cli", codex_context: "isolated", model: "contract-fixture", reasoning_effort: "max", prompt_sha256: sha256(prompt), output_sha256: sha256(output), stdout_sha256: sha256(stdout), stderr_sha256: sha256(""), runtime_sha256: EXECUTION_RUNTIME_SHA256, execution_surface: executionSurface("codex-cli") };
  const receiptPath = join(sourceRoot, "target.execution.json");
  await writeFile(receiptPath, JSON.stringify(receipt));
  const args = { sourceRoot, runRoot, currentCase: task, snapshot, model: "contract-fixture", reasoningEffort: "max", prompt };
  assert.equal((await replayTarget(args)).replay.verified, true);
  await assert.rejects(replayTarget({ ...args, prompt: "changed" }), /prior direct invocation/);
  await assert.rejects(replayTarget({ ...args, currentCase: { ...task, version: 2 } }), /exact original case/);
  for (const changed of [{ run_id: "other" }, { status: "DISPATCHED" }, { adapter: "command-json-v1" }, { codex_context: "installed-plugin-discovery" }, { runtime_sha256: "f".repeat(64) }, { stdout_sha256: "0".repeat(64) }, { execution_surface: { changed: true } }]) {
    await writeFile(receiptPath, JSON.stringify({ ...receipt, ...changed }));
    await assert.rejects(replayTarget(args), /prior direct invocation/);
  }
  await writeFile(receiptPath, JSON.stringify(receipt));
  await writeFile(join(sourceRoot, "target.jsonl"), stdout + "\n" + JSON.stringify({ type: "turn.failed" }));
  await assert.rejects(replayTarget(args), /tool-free response/);
});
