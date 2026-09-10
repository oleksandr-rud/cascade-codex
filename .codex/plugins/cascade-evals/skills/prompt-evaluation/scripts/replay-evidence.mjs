import {readFile,readdir,writeFile} from "node:fs/promises";
import {join,resolve} from "node:path";
import {digest} from "./evaluation-integrity.mjs";
import {subjectPrompt} from "./subject-session.mjs";
import {extractCodex} from "./execution-adapters.mjs";
import {verifyRecordedResponse} from "./agent-response-simulation.mjs";

async function contract(sourceRoot, currentCase, snapshot) {
  const original = JSON.parse(await readFile(join(sourceRoot,"run-contract.json"),"utf8"));
  if (original.subject_sha256 !== snapshot.sha256 || digest(JSON.stringify(original.fixture ?? original.task)) !== digest(JSON.stringify(currentCase))) throw new Error("replay requires the exact original case and subject; changed fixtures need fresh authoring");
  return original;
}
export async function replaySubject({sourceRoot,phase,currentCase,snapshot,model,reasoningEffort,request,runRoot}) {
  sourceRoot=resolve(sourceRoot);if(sourceRoot===resolve(runRoot))throw new Error("cannot replay into the original evidence root");
  const original=await contract(sourceRoot,currentCase,snapshot);
  const files=(await readdir(sourceRoot)).filter(name=>new RegExp(`^${phase}-read-[0-9]+\\.jsonl$`).test(name)).sort((a,b)=>Number(a.match(/read-([0-9]+)/)[1])-Number(b.match(/read-([0-9]+)/)[1]));
  if(!files.length||files.length>6)throw new Error("invalid prior subject invocation count");
  const reads=["SKILL.md"],proofs=[],traces=[],transcript=[];let finalText="";
  for(let i=0;i<files.length;i++){
    if(files[i]!==`${phase}-read-${i}.jsonl`)throw new Error("incomplete staged read history");
    const trace=await readFile(join(sourceRoot,files[i]),"utf8"),parsed=extractCodex(trace);traces.push(trace);
    proofs.push(await verifyRecordedResponse(sourceRoot,`${phase}-read-${i}`,model,reasoningEffort,parsed.finalText,digest(subjectPrompt(snapshot,request,transcript))));
    if(i<files.length-1){const control=JSON.parse(parsed.finalText);if(Object.keys(control).length!==1||!Array.isArray(control.read_paths)||control.read_paths.length<1||control.read_paths.length>16||control.read_paths.some(path=>!Object.hasOwn(snapshot.files,path)))throw new Error("invalid prior subject read");reads.push(...control.read_paths);transcript.push({requested:control.read_paths,files:control.read_paths.map(path=>({path,content:snapshot.files[path]}))});}
    else finalText=parsed.finalText;
  }
  const saved=await readFile(join(sourceRoot,phase==="prompt-builder"?"prompt-builder-response.md":phase==="first-turn"?"first-response.md":"second-response.md"),"utf8");
  if(saved!==finalText)throw new Error("saved subject response differs from verified invocation");
  const replay={verified:true,source_root:sourceRoot,source_runner_bundle_sha256:original.runner_bundle_sha256,source_execution_surface_sha256:original.execution_surface_sha256,source_run_id:original.args?.["run-id"]??sourceRoot.split(/[\\/]/).at(-1),proofs};
  await writeFile(join(runRoot,`${phase}-reuse.json`),JSON.stringify(replay,null,2));
  return {status:"COMPLETED",final_text:finalText,stdout:traces.join("\n"),stderr:"",duration_ms:0,usage:null,trace_metrics:{command_executions:0},subject_reads:[...new Set(reads)],isolation:"tool-free-staged-subject-v1",replay};
}
export async function replayTarget({sourceRoot,currentCase,snapshot,model,reasoningEffort,prompt,runRoot}) {
  sourceRoot=resolve(sourceRoot);await contract(sourceRoot,currentCase,snapshot);
  const stdout=await readFile(join(sourceRoot,"target.jsonl"),"utf8"),parsed=extractCodex(stdout);
  if(parsed.finalText!==await readFile(join(sourceRoot,"target-output.md"),"utf8"))throw new Error("saved target response differs from verified invocation");
  const proof=await verifyRecordedResponse(sourceRoot,"target",model,reasoningEffort,parsed.finalText,digest(prompt));
  await writeFile(join(runRoot,"target-reuse.json"),JSON.stringify(proof,null,2));
  return {status:"COMPLETED",final_text:parsed.finalText,stdout,stderr:"",duration_ms:0,usage:null,trace_metrics:parsed.traceMetrics,replay:{verified:true,source_root:sourceRoot,proof}};
}
