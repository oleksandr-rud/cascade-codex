#!/usr/bin/env node

import { chmod, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const root = await mkdtemp(join(tmpdir(), "cascade-prompt-variance-test-"));
const fake = join(root, "fake-runner.cjs");
const output = join(root, "runs");
await writeFile(fake, `#!/usr/bin/env node\nconst fs=require("node:fs"),path=require("node:path");const a=process.argv;const v=n=>a[a.indexOf(n)+1];const id=v("--run-id"),root=path.join(v("--output-dir"),id);fs.mkdirSync(root,{recursive:true});const n=Number(id.match(/r(\\d+)$/)[1]);fs.writeFileSync(path.join(root,"run-summary.json"),JSON.stringify({run_id:id,task:{id:"fixture-v1",version:1},configuration:{configuration_id:"fixture-surface"},evidence_grade:"LIVE_CODEX_TOOL_FREE",execution:{target:{status:process.env.FAKE_REUSED?"REUSED_VERIFIED_RUN":"EXECUTED"}},digests:{runner_bundle_sha256:"runner",execution_surface_sha256:process.env.FAKE_DRIFT&&n===2?"changed":"surface"},acceptance:process.env.FAKE_PARTIAL&&n===2?"NOT_RUN":"ACCEPTED",mechanical:{status:"MECHANICALLY_ELIGIBLE"},judges:{conservative_effectiveness_score:0.7+n/10,outcome:{harness_verdict:"PASS"},trajectory:{harness_verdict:"PASS"}}}));process.stdout.write(JSON.stringify({run_root:root,run_id:id}));\n`);
await chmod(fake, 0o755);
const runner = join(fileURLToPath(new URL(".", import.meta.url)), "run-variance-eval.mjs");
const result = spawnSync(process.execPath, [runner, "--task", "fixture-v1", "--prompt-model", "m", "--target-model", "m", "--repetitions", "3", "--runner", fake, "--output-dir", output, "--aggregate-id", "fixture-aggregate"], { encoding: "utf8" });
if (result.status !== 0) throw new Error(`${result.stderr}\n${result.stdout}`);
const aggregate = JSON.parse(await readFile(join(output, "fixture-aggregate.aggregate.json"), "utf8"));
if (aggregate.repetitions_completed !== 3 || aggregate.acceptance_rate !== 1 || Math.abs(aggregate.conservative_score.mean - 0.9) > 1e-9 || aggregate.flaky) throw new Error(JSON.stringify(aggregate));
if (new Set(aggregate.runs.map((run) => run.run_id)).size !== 3) throw new Error("run identities must be unique");
console.log(`PASS: repeated runs retain receipts and aggregate variance without hiding failures (${root})`);

const partial=spawnSync(process.execPath,[runner,"--task","fixture-v1","--repetitions","3","--runner",fake,"--output-dir",output,"--aggregate-id","partial"],{encoding:"utf8",env:{...process.env,FAKE_PARTIAL:"1"}});
const partialSummary=JSON.parse(partial.stdout);
if(partial.status!==3||partialSummary.status!=="PARTIAL"||partialSummary.repetitions_completed!==2||partialSummary.acceptance_rate!==2/3)throw new Error("incomplete runs must remain visible in the denominator");
console.log("PASS: NOT_RUN cannot masquerade as complete or 100% accepted");

const drift=spawnSync(process.execPath,[runner,"--task","fixture-v1","--repetitions","3","--runner",fake,"--output-dir",output,"--aggregate-id","drift"],{encoding:"utf8",env:{...process.env,FAKE_DRIFT:"1"}});
const driftSummary=JSON.parse(drift.stdout);
if(drift.status!==3||driftSummary.status!=="PARTIAL"||driftSummary.incompatible_runs.length!==1)throw new Error("configuration drift cannot be compared as a complete repetition set");
console.log("PASS: changed execution identity makes repetitions incomparable");

const reused=spawnSync(process.execPath,[runner,"--task","fixture-v1","--repetitions","3","--runner",fake,"--output-dir",output,"--aggregate-id","reused"],{encoding:"utf8",env:{...process.env,FAKE_REUSED:"1"}});
if(reused.status!==3||JSON.parse(reused.stdout).repetitions_completed!==0)throw new Error("rejudging old responses is not fresh stochastic repetition");
