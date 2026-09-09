#!/usr/bin/env node

import { chmod, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import assert from "node:assert/strict";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const root = await mkdtemp(join(tmpdir(), "cascade-prompt-variance-test-"));
const fake = join(root, "fake-runner.cjs");
const output = join(root, "runs");
await writeFile(fake, `#!/usr/bin/env node\nconst fs=require("node:fs"),path=require("node:path");const a=process.argv;const v=n=>a[a.indexOf(n)+1];const id=v("--run-id"),root=path.join(v("--output-dir"),id);fs.mkdirSync(root,{recursive:true});const n=Number(id.match(/r(\\d+)$/)[1]);fs.writeFileSync(path.join(root,"run-summary.json"),JSON.stringify({acceptance:"ACCEPTED",mechanical:{status:"MECHANICALLY_ELIGIBLE"},judges:{conservative_effectiveness_score:0.7+n/10,outcome:{harness_verdict:"PASS"},trajectory:{harness_verdict:"PASS"}}}));process.stdout.write(JSON.stringify({run_root:root,run_id:id}));\n`);
await chmod(fake, 0o755);
const runner = join(fileURLToPath(new URL(".", import.meta.url)), "run-variance-eval.mjs");
const result = spawnSync(process.execPath, [runner, "--task", "fixture-v1", "--prompt-model", "m", "--target-model", "m", "--repetitions", "3", "--runner", fake, "--output-dir", output, "--aggregate-id", "fixture-aggregate"], { encoding: "utf8" });
if (result.status !== 0) throw new Error(`${result.stderr}\n${result.stdout}`);
const aggregate = JSON.parse(await readFile(join(output, "fixture-aggregate.aggregate.json"), "utf8"));
if (aggregate.repetitions_completed !== 3 || aggregate.acceptance_rate !== 1 || Math.abs(aggregate.conservative_score.mean - 0.9) > 1e-9 || aggregate.flaky) throw new Error(JSON.stringify(aggregate));
if (new Set(aggregate.runs.map((run) => run.run_id)).size !== 3) throw new Error("run identities must be unique");
await writeFile(fake, `require("node:fs").writeFileSync(${JSON.stringify(join(root, "started"))},"started");process.on("SIGTERM",()=>{process.stdout.write("cancelled child");process.exit(3)});setInterval(()=>{},10);`);
const child = spawn(process.execPath, [runner, "--task", "fixture-v1", "--repetitions", "3", "--runner", fake, "--output-dir", output, "--aggregate-id", "cancelled-aggregate"], { stdio: ["ignore", "pipe", "pipe"] });
const exited = once(child, "close");
const deadline = Date.now() + 5000;
try {
  while (true) {
    try { await readFile(join(root, "started")); break; } catch {
      if (Date.now() >= deadline) throw new Error("child did not start");
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
  }
  child.kill("SIGTERM");
  assert.equal((await exited)[0], 3);
  const cancelled = JSON.parse(await readFile(join(output, "cancelled-aggregate.aggregate.json"), "utf8"));
  assert.equal(cancelled.cancelled, true);
  assert.equal(cancelled.status, "PARTIAL");
  assert.equal(cancelled.runs.length, 1);
  assert.equal(cancelled.runs[0].execution_status, "CANCELLED");
  assert.equal(await readFile(join(output, "cancelled-aggregate-r01.stdout.log"), "utf8"), "cancelled child");
} finally { child.kill("SIGKILL"); }
console.log(`PASS: repeated runs retain receipts and aggregate variance without hiding failures (${root})`);
