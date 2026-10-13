/** Portable campaign lifecycle. The selected host enforces actual adapters and permissions. */
import {createHash, randomUUID} from 'node:crypto';
class CampaignBoundaryError extends Error {
  constructor(code) {super(code);this.code=code;}
}
const fail = code => {throw new CampaignBoundaryError(code);};
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const copy = value => structuredClone(value);
const text = value => typeof value === 'string' && value.length > 0;
function exact(value, keys, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      Object.keys(value).some(key => !keys.includes(key)) || keys.some(key => !Object.hasOwn(value,key))) fail('INVALID_'+label);
}

export async function runCampaign(selection, host) {
  exact(selection,['campaign_id','campaign_digest','case_ids','limits'],'SELECTION');
  exact(selection.limits,['max_cases','wall_time_ms','finalization_wall_time_ms','stop_on_failure'],'LIMITS');
  if (!text(selection.campaign_id) || !/^[a-f0-9]{64}$/.test(selection.campaign_digest) ||
      !Array.isArray(selection.case_ids) || !selection.case_ids.length || !selection.case_ids.every(text) ||
      new Set(selection.case_ids).size !== selection.case_ids.length ||
      !Number.isSafeInteger(selection.limits.max_cases) || selection.limits.max_cases < selection.case_ids.length ||
      selection.limits.max_cases > 256 || !Number.isSafeInteger(selection.limits.wall_time_ms) ||
      selection.limits.wall_time_ms < 1 || selection.limits.wall_time_ms > 3600000 ||
      !Number.isSafeInteger(selection.limits.finalization_wall_time_ms) || selection.limits.finalization_wall_time_ms < 1 || selection.limits.finalization_wall_time_ms > 60000 ||
      typeof selection.limits.stop_on_failure !== 'boolean') fail('INVALID_CAMPAIGN_BOUNDARY');
  for (const name of ['authorize','preflight','executeCase','cleanup','freeze','verifyFrozen']) if (typeof host?.[name] !== 'function') fail('HOST_BINDING_GAP: '+name);
  const frozen = copy(selection), run_id = randomUUID(), selection_digest = digest(frozen);
  const expires_at = Date.now()+frozen.limits.wall_time_ms;
  const controller = new AbortController();
  let timer;
  const expired = new Promise((_, reject) => {timer=setTimeout(()=>{
    controller.abort(); reject(new CampaignBoundaryError('CAMPAIGN_DEADLINE_EXHAUSTED'));
  },frozen.limits.wall_time_ms);});
  const call = async (fn,payload) => {
    if(Date.now()>=expires_at) fail('CAMPAIGN_DEADLINE_EXHAUSTED');
    const result=await Promise.race([Promise.resolve().then(()=>fn(copy(payload),{signal:controller.signal})),expired]);
    if(Date.now()>=expires_at) fail('CAMPAIGN_DEADLINE_EXHAUSTED');
    return result;
  };
  const binding={run_id,selection_digest,campaign_id:frozen.campaign_id,campaign_digest:frozen.campaign_digest,expires_at};
  const events=[];
  let authorized=false, status='BLOCKED', cleanup={status:'NOT_REQUIRED',residual_resources:[]}, error=null;
  let in_flight_case=null, finalization_deadline;
  try {
    const authorization=await call(host.authorize,{...binding,selection:frozen});
    if(authorization?.status!=='AUTHORIZED' || authorization.run_id!==run_id || authorization.selection_digest!==selection_digest) fail('CAMPAIGN_AUTHORITY_DENIED');
    authorized=true;
    const ready=await call(host.preflight,{...binding,selection:frozen,authorization});
    if(ready?.status!=='READY' || ready.selection_digest!==selection_digest || !Array.isArray(ready.blockers) || ready.blockers.length) fail('PREFLIGHT_BLOCKED');
    status='SUCCEEDED';
    for(const case_id of frozen.case_ids) {
      in_flight_case=case_id;
      const outcome=await call(host.executeCase,{...binding,case_id,authorization,idempotency_key:run_id+'/'+case_id});
      exact(outcome,['case_id','status','observations','evidence','side_effect_status'],'CASE_OUTCOME');
      if(outcome.case_id!==case_id || !['SUCCEEDED','FAILED','BLOCKED','CANCELLED','UNKNOWN_OUTCOME'].includes(outcome.status) ||
          !['NONE','KNOWN','UNKNOWN'].includes(outcome.side_effect_status) || !Array.isArray(outcome.observations) || !Array.isArray(outcome.evidence)) fail('INVALID_CASE_OUTCOME');
      if(outcome.status==='SUCCEEDED' && (!outcome.observations.length || !outcome.evidence.length)) fail('SUCCESS_WITHOUT_EVIDENCE');
      events.push(copy(outcome));
      in_flight_case=null;
      if(outcome.status==='UNKNOWN_OUTCOME' || outcome.side_effect_status==='UNKNOWN') {status='UNKNOWN_OUTCOME';break;}
      if(outcome.status!=='SUCCEEDED') {
        status=outcome.status;
        if(frozen.limits.stop_on_failure || outcome.status==='CANCELLED') break;
      }
    }
  } catch(caught) {
    error=String(caught?.message ?? caught);
    const deadlineExpired=caught instanceof CampaignBoundaryError && caught.code==='CAMPAIGN_DEADLINE_EXHAUSTED';
    status=in_flight_case || events.some(event=>event.side_effect_status!=='NONE') || deadlineExpired ? 'UNKNOWN_OUTCOME':'BLOCKED';
    if(in_flight_case) events.push({case_id:in_flight_case,status:'UNKNOWN_OUTCOME',
      observations:[{type:'ADAPTER_ERROR',error}],evidence:[],side_effect_status:'UNKNOWN'});
  } finally {
    clearTimeout(timer);
    controller.abort();
    finalization_deadline=Date.now()+frozen.limits.finalization_wall_time_ms;
    if(authorized) {
      // Cleanup and evidence persistence have their own explicit bounded host budget.
      // They remain required after the execution signal expires; no execution retry.
      try {
        const result=await boundedFinalization(host.cleanup,{...binding,events},finalization_deadline-Date.now());
        exact(result,['status','residual_resources'],'CLEANUP');
        if(!['VERIFIED','FAILED','UNKNOWN','NOT_REQUIRED'].includes(result.status) || !Array.isArray(result.residual_resources)) fail('INVALID_CLEANUP');
        if(['VERIFIED','NOT_REQUIRED'].includes(result.status) && result.residual_resources.length) fail('CLEANUP_HAS_RESIDUALS');
        cleanup=copy(result);
      } catch(caught) {cleanup={status:'UNKNOWN',residual_resources:[]}; error=error ?? String(caught?.message ?? caught);}
    }
  }
  if(!['VERIFIED','NOT_REQUIRED'].includes(cleanup.status) && status==='SUCCEEDED') status='FAILED';
  const payload={schema_version:1,artifact_type:'frozen-simulation-campaign-run',...binding,
    status,events,cleanup,error,semantic_status:'NOT_RUN',execution_complete:events.length===frozen.case_ids.length &&
      events.every(event=>event.status!=='UNKNOWN_OUTCOME' && event.side_effect_status!=='UNKNOWN')};
  // No artifacts or cleanup writes are attempted outside an authorized run scope.
  if(!authorized) return {...payload,artifact:null};
  const artifact=await boundedFinalization(host.freeze,payload,finalization_deadline-Date.now());
  if(!text(artifact?.artifact_id) || !/^[a-f0-9]{64}$/.test(artifact?.sha256 ?? '') || artifact.run_id!==run_id || artifact.selection_digest!==selection_digest) fail('FREEZE_BINDING_MISMATCH');
  const verification=await boundedFinalization(host.verifyFrozen,{artifact,payload},finalization_deadline-Date.now());
  if(verification?.status!=='PASS' || verification.sha256!==artifact.sha256 || verification.run_id!==run_id) fail('FROZEN_EVIDENCE_UNVERIFIED');
  return {...payload,artifact};
}

async function boundedFinalization(fn,payload,wall_time_ms) {
  if(wall_time_ms<=0) fail('FINALIZATION_DEADLINE_EXHAUSTED');
  const controller=new AbortController(); let timer;
  try {
    const expiry=new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new CampaignBoundaryError('FINALIZATION_DEADLINE_EXHAUSTED'));},wall_time_ms);});
    return await Promise.race([Promise.resolve().then(()=>fn(copy(payload),{signal:controller.signal})),expiry]);
  } finally {clearTimeout(timer);controller.abort();}
}

export const campaignSelectionDigest=digest;
