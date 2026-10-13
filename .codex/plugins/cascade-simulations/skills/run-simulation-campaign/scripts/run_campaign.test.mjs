import {test,expect} from 'bun:test';
import {runCampaign} from './run_campaign.mjs';
import {createHash} from 'node:crypto';
const selection=()=>({campaign_id:'fixture',campaign_digest:'a'.repeat(64),case_ids:['one','two'],
  limits:{max_cases:2,wall_time_ms:1000,finalization_wall_time_ms:1000,stop_on_failure:true}});
function fixture() {
  const calls=[], frozen=new Map();
  const host={
    authorize:async input=>({status:'AUTHORIZED',run_id:input.run_id,selection_digest:input.selection_digest}),
    preflight:async input=>({status:'READY',selection_digest:input.selection_digest,blockers:[]}),
    executeCase:async input=>{calls.push(input.case_id);return {case_id:input.case_id,status:'SUCCEEDED',
      observations:[{type:'fixture-observation'}],evidence:[{id:'fixture-evidence'}],side_effect_status:'NONE'};},
    cleanup:async()=>{calls.push('cleanup');return {status:'VERIFIED',residual_resources:[]};},
    freeze:async payload=>{calls.push('freeze');const bytes=Buffer.from(JSON.stringify(payload));
      const sha256=createHash('sha256').update(bytes).digest('hex');frozen.set(sha256,bytes);
      return {artifact_id:'fixture-run',sha256,run_id:payload.run_id,selection_digest:payload.selection_digest};},
    verifyFrozen:async({artifact,payload})=>({status:frozen.get(artifact.sha256)?.equals(Buffer.from(JSON.stringify(payload)))?'PASS':'FAIL',
      sha256:artifact.sha256,run_id:payload.run_id}),
  };
  return {host,calls};
}
test('campaign freezes actual ordered outcomes and cleanup without semantic self-judgment',async()=>{
  const f=fixture(), result=await runCampaign(selection(),f.host);
  expect(f.calls).toEqual(['one','two','cleanup','freeze']);expect(result.status).toBe('SUCCEEDED');
  expect(result.semantic_status).toBe('NOT_RUN');expect(result.execution_complete).toBe(true);
});
test('denied authorization has zero execution, cleanup or artifact writes',async()=>{
  const f=fixture();f.host.authorize=async()=>({status:'DENIED'});
  const result=await runCampaign(selection(),f.host);
  expect(f.calls).toEqual([]);expect(result.status).toBe('BLOCKED');expect(result.artifact).toBeNull();
});
test('preflight failure preserves an authorized blocked receipt and cleanup',async()=>{
  const f=fixture();f.host.preflight=async input=>({status:'BLOCKED',selection_digest:input.selection_digest,blockers:['unsupported-platform']});
  const result=await runCampaign(selection(),f.host);
  expect(f.calls).toEqual(['cleanup','freeze']);expect(result.status).toBe('BLOCKED');
});
test('unknown side effect halts further cases and never becomes successful execution',async()=>{
  const f=fixture();f.host.executeCase=async input=>{f.calls.push(input.case_id);return {case_id:input.case_id,status:'UNKNOWN_OUTCOME',
    observations:[],evidence:[],side_effect_status:'UNKNOWN'};};
  const result=await runCampaign(selection(),f.host);
  expect(f.calls).toEqual(['one','cleanup','freeze']);expect(result.status).toBe('UNKNOWN_OUTCOME');
});
test('failed case evidence survives and cleanup failure blocks success',async()=>{
  const f=fixture();f.host.executeCase=async input=>{f.calls.push(input.case_id);throw Error('adapter-failed');};
  const failed=await runCampaign(selection(),f.host);
  expect(f.calls).toEqual(['one','cleanup','freeze']);expect(failed.error).toBe('adapter-failed');
  const g=fixture();g.host.cleanup=async()=>({status:'FAILED',residual_resources:['fixture-process']});
  const cleanup=await runCampaign(selection(),g.host);expect(cleanup.status).toBe('FAILED');
  expect(cleanup.cleanup.residual_resources).toEqual(['fixture-process']);
});
test('deadline cancels execution and still finalizes cleanup and frozen failure evidence',async()=>{
  const f=fixture();let aborted=false;
  f.host.executeCase=(_, {signal})=>new Promise(()=>signal.addEventListener('abort',()=>{aborted=true;}));
  const input=selection();input.limits.wall_time_ms=20;
  const result=await runCampaign(input,f.host);
  expect(aborted).toBe(true);expect(result.status).toBe('UNKNOWN_OUTCOME');expect(f.calls).toEqual(['cleanup','freeze']);
});
test('evidence freeze tampering or claimed success without observations cannot pass',async()=>{
  const f=fixture();f.host.verifyFrozen=async()=>({status:'FAIL'});
  await expect(runCampaign(selection(),f.host)).rejects.toThrow('FROZEN_EVIDENCE_UNVERIFIED');
  const g=fixture();g.host.executeCase=async input=>({case_id:input.case_id,status:'SUCCEEDED',observations:[],evidence:[],side_effect_status:'NONE'});
  const result=await runCampaign(selection(),g.host);expect(result.status).toBe('UNKNOWN_OUTCOME');expect(result.error).toBe('SUCCESS_WITHOUT_EVIDENCE');
});
