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
const result = runModel({ model: "closed-model-x", prompt: "hello", cwd: root, timeoutMs: 1000, adapter: "command-json-v1", adapterConfig: config, adapterId: "fixture" });
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

const { safeId } = await import("./agent-response-simulation.mjs");
const cases=JSON.parse(await readFile(new URL("../evals/interviews/catalog.json",import.meta.url),"utf8")).fixtures;
const phaseIds=cases.flatMap(c=>["first-turn-read-0","first-turn-read-1","judge"].map(phase=>safeId(`${c.id}-2026-09-09T21-05-36-168Z-${phase}`)));
check(phaseIds.every(id=>/^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/.test(id))&&new Set(phaseIds).size===phaseIds.length,"long scenario names must produce valid distinct simulation IDs");
console.log("PASS: long case and phase identifiers satisfy controller boundaries");
