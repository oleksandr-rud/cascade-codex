#!/usr/bin/env node
import {readFile,writeFile,mkdir} from "node:fs/promises";
import {join,dirname,resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {judgeRequest,parseJudgment,digest,runnerDigest} from "./evaluation-integrity.mjs";
import {runModelPhase,DEFAULT_TIMEOUTS_MS,positiveTimeout,requireCompleted} from "./execution-adapters.mjs";
const scripts=dirname(fileURLToPath(import.meta.url));
const value=name=>{const i=process.argv.indexOf(`--${name}`);if(i<0)return undefined;const next=process.argv[i+1];if(!next||next.startsWith("--"))throw new Error(`missing value for --${name}`);return next;};
const model=value("judge-model")??"gpt-6-astra";
const reasoningEffort=value("judge-reasoning-effort")??"high";
if(!["gpt-5.6-sol","gpt-6-astra"].includes(model))throw new Error("unsupported challenge judge model");
if(!["high","max"].includes(reasoningEffort))throw new Error("unsupported challenge judge reasoning effort");
const output=resolve(value("output-dir")??".artifacts/prompt-judge-challenges");
await mkdir(output,{recursive:true});
const runId=value("run-id")??`judge-challenges-${new Date().toISOString().replace(/[:.]/g,"-")}`;
if(!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(runId))throw new Error("unsafe run ID");
const root=join(output,runId);await mkdir(root);const workspace=join(root,"workspace");await mkdir(workspace);
const profile=JSON.parse(await readFile(join(scripts,"../evals/judges/interview-v4.json"),"utf8"));
const catalog=JSON.parse(await readFile(join(scripts,"../evals/judges/challenges-v2.json"),"utf8"));
const contract={run_id:runId,model,reasoning_effort:reasoningEffort,explicit_comparison:model!=="gpt-6-astra"||reasoningEffort!=="high",profile_sha256:digest(JSON.stringify(profile)),catalog_sha256:digest(JSON.stringify(catalog)),runner_bundle_sha256:await runnerDigest(scripts),human_calibration:"NOT_RUN"};
await writeFile(join(root,"run-contract.json"),JSON.stringify(contract,null,2));
const selected=value("cases")?.split(",")??catalog.cases.map(c=>c.id);
if(new Set(selected).size!==selected.length||selected.some(id=>!catalog.cases.some(c=>c.id===id)))throw new Error("unknown challenge case");
const cases=[];
for(const item of catalog.cases.filter(c=>selected.includes(c.id))){
 const identity={fixture_id:item.id,run_id:runId};
 const evidence={request:item.request,first_response:item.response,second_response:null};
 const request=judgeRequest(profile,identity,evidence);
 const run=await runModelPhase({phase:item.id,runId,runRoot:root,model:contract.model,reasoningEffort:contract.reasoning_effort,prompt:request,cwd:workspace,timeoutMs:positiveTimeout(value("judge-timeout-ms"),DEFAULT_TIMEOUTS_MS.judge,"--judge-timeout-ms"),adapter:"codex-cli"});
 await writeFile(join(root,`${item.id}.jsonl`),run.stdout??"");
 if(run.status!=="COMPLETED") { await writeFile(join(root,"challenge-progress.json"),JSON.stringify({cases,requested:selected.length},null,2)); requireCompleted(run,{phase:item.id,runRoot:root}); }
 const parsed=run.status==="COMPLETED"?parseJudgment(run.final_text,profile,identity,evidence):{valid:false,error:run.status};
 cases.push({id:item.id,expected:item.expected,observed:parsed.valid?parsed.harness_verdict:"INVALID",matched:parsed.valid&&parsed.harness_verdict===item.expected,result:parsed,receipt:run.execution_receipt});
}
const summary={...contract,cases,matched:cases.filter(c=>c.matched).length,total:cases.length,status:cases.every(c=>c.matched)?"PASS":"FAIL",label_provenance:catalog.label_provenance};
await writeFile(join(root,"run-summary.json"),JSON.stringify(summary,null,2));
console.log(JSON.stringify({run_root:root,status:summary.status,matched:summary.matched,total:summary.total}));
if(summary.status!=="PASS")process.exitCode=2;
