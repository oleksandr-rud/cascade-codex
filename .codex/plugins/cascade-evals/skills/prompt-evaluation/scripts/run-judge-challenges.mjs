#!/usr/bin/env node
import {readFile,writeFile,mkdir} from "node:fs/promises";
import {join,dirname,resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {judgeRequest,parseJudgment,digest,runnerDigest} from "./evaluation-integrity.mjs";
import {runAgentResponseSimulation} from "./agent-response-simulation.mjs";
const scripts=dirname(fileURLToPath(import.meta.url));
const value=name=>{const i=process.argv.indexOf(`--${name}`);return i<0?undefined:process.argv[i+1];};
const output=resolve(value("output-dir")??".artifacts/prompt-judge-challenges");
await mkdir(output,{recursive:true});
const runId=`judge-challenges-${new Date().toISOString().replace(/[:.]/g,"-")}`;
const root=join(output,runId);await mkdir(root);const workspace=join(root,"workspace");await mkdir(workspace);
const profile=JSON.parse(await readFile(join(scripts,"../evals/judges/interview-v3.json"),"utf8"));
const catalog=JSON.parse(await readFile(join(scripts,"../evals/judges/challenges-v1.json"),"utf8"));
const contract={run_id:runId,model:"gpt-5.6-sol",reasoning_effort:"max",profile_sha256:digest(JSON.stringify(profile)),catalog_sha256:digest(JSON.stringify(catalog)),runner_bundle_sha256:await runnerDigest(scripts),human_calibration:"NOT_RUN"};
await writeFile(join(root,"run-contract.json"),JSON.stringify(contract,null,2));
const cases=[];
for(const item of catalog.cases){
 const identity={fixture_id:item.id,run_id:runId};
 const evidence={request:item.request,first_response:item.response,second_response:null};
 const request=judgeRequest(profile,identity,evidence);
 const run=await runAgentResponseSimulation({phase:item.id,runId,runRoot:root,model:contract.model,reasoningEffort:"max",prompt:request,cwd:workspace,timeoutMs:240000,adapter:"codex-cli"});
 await writeFile(join(root,`${item.id}.jsonl`),run.stdout??"");
 const parsed=run.status==="COMPLETED"?parseJudgment(run.final_text,profile,identity,evidence):{valid:false,error:run.status};
 cases.push({id:item.id,expected:item.expected,observed:parsed.valid?parsed.harness_verdict:"INVALID",matched:parsed.valid&&parsed.harness_verdict===item.expected,result:parsed,simulation:run.simulation});
}
const summary={...contract,cases,matched:cases.filter(c=>c.matched).length,total:cases.length,status:cases.every(c=>c.matched)?"PASS":"FAIL",label_provenance:catalog.label_provenance};
await writeFile(join(root,"run-summary.json"),JSON.stringify(summary,null,2));
console.log(JSON.stringify({run_root:root,status:summary.status,matched:summary.matched,total:summary.total}));
if(summary.status!=="PASS")process.exitCode=2;
