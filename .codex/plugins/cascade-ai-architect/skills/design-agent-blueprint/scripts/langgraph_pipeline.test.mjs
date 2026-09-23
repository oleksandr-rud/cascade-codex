import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createLangGraphPipeline } from './langgraph_pipeline.mjs';
import { createProjectionEngine, decodeProjectionProfiles, decodeProjectionSnapshot } from './projection_blocks.mjs';

const langgraph = await import(process.env.CASCADE_LANGGRAPH_MODULE || '@langchain/langgraph');
const profiles = decodeProjectionProfiles(readFileSync(new URL('../assets/projection-profiles.example.yaml',import.meta.url),'utf8'));
const fixture = decodeProjectionSnapshot(readFileSync(new URL('../assets/projection-state.example.json',import.meta.url),'utf8'));

describe('LangGraph stateful-agent reference binding', () => {
  test('semantic findings use the executable binder before policy', async () => {
    const findings=JSON.parse(readFileSync(new URL('../assets/analyzer-findings.example.json',import.meta.url),'utf8'));
    const calls=[];
    const manifest={invocation:'private-issued-context'};
    const pipeline=createLangGraphPipeline({
      langgraph,checkpointer:new langgraph.MemorySaver(),
      issueContext:async()=>({messages:[{role:'system',content:'issued source and schema'}],manifest}),
      analyze:async()=>{calls.push('analyze');return findings;},
      bindAnalysis:async (result,issued)=>{
        calls.push('bind');
        assert.equal(issued.manifest,manifest);
        assert.equal(issued.requestRef,'findings-request');
        // Prepared host bindings, through the real packaged Python adapter.
        const run=spawnSync('python3',['-c',
          'import json,sys; from test_analyzer_findings import fixture; from analyzer_findings import bind_findings; _,c,b,s=fixture(); print(json.dumps(bind_findings(json.load(sys.stdin),c,b,s)))'],
          {cwd:fileURLToPath(new URL('.',import.meta.url)),input:JSON.stringify(result),encoding:'utf8'});
        assert.equal(run.status,0,run.stderr);
        return JSON.parse(run.stdout);
      },
      applyPolicy:async ({delta})=>{
        calls.push('policy');
        assert.equal(delta.schema_version,'state-delta.v3');
        assert.equal(delta.groups.length,1);
        assert.equal(delta.groups[0].operations.at(-1).op,'propose_plan_change');
        return {route:'COMPOSE'};
      },
      compose:async()=>{calls.push('compose');return 'Please confirm the reported budget.';},
      release:async()=>({answer_id:'findings-answer'}),
    });
    const config={configurable:{thread_id:'findings-thread'}};
    await pipeline.invoke({requestRef:'findings-request'},config);
    assert.deepEqual(calls,['analyze','bind','policy','compose']);
    for await (const checkpoint of pipeline.getStateHistory(config)) {
      const saved=JSON.stringify(checkpoint.values);
      assert.ok(!saved.includes('analyzer-findings.v1'));
      assert.ok(!saved.includes('private-issued-context'));
    }
  });

  test('binding rejection or missing result prevents policy and Composer', async () => {
    for (const bindAnalysis of [async()=>{throw Error('stale findings');},async()=>null]) {
      const pipeline=createLangGraphPipeline({
        langgraph,checkpointer:new langgraph.MemorySaver(),
        issueContext:async()=>({messages:[]}),analyze:async()=>({}),bindAnalysis,
        applyPolicy:async()=>assert.fail('policy called'),
        compose:async()=>assert.fail('Composer called'),release:async()=>assert.fail('release called'),
      });
      await assert.rejects(pipeline.invoke({requestRef:'rejected'},
        {configurable:{thread_id:'rejected'}}),/stale findings|ANALYSIS_GAP/);
    }
  });

  test('policy commit precedes fresh Composer context; local block cache is reused', async () => {
    let revision=fixture.revision, snapshot=structuredClone(fixture);
    const calls=[];
    const engine=createProjectionEngine({
      profiles,
      authorize:r=>r.scope==='tenant-a/task-1' && r.task==='task-1' && r.revision===revision,
      countTokens:messages=>JSON.stringify(messages).length,
    });
    const pipeline=createLangGraphPipeline({
      langgraph,checkpointer:new langgraph.MemorySaver(),
      issueContext:({role})=>{
        calls.push('issue:'+role+':'+revision);
        const request={profile:role,scope:'tenant-a/task-1',task:'task-1',step:'step-1',checkpoint:'checkpoint-1',revision};
        return engine.assemble(engine.issue(request,snapshot),request);
      },
      analyze:async (messages,{manifest})=>{
        assert.ok(messages[0].content);
        assert.equal(manifest.profile,'analyzer');
        calls.push('analyze');
        return {proposal:'update'};
      },
      applyPolicy:async ({delta})=>{
        assert.equal(delta.proposal,'update');
        calls.push('policy');
        revision++;
        snapshot={...snapshot,revision};
        return {route:'COMPOSE',state_revision:revision};
      },
      compose:async (messages,{manifest})=>{
        assert.ok(messages[0].content);
        assert.equal(manifest.profile,'composer');
        calls.push('compose');
        return 'draft';
      },
      release:async ({decision,draft,contextManifest})=>{
        assert.equal(decision.state_revision,revision);
        assert.equal(draft,'draft');
        assert.equal(contextManifest.task,'task-1');
        calls.push('release');
        return {answer_id:'answer-1'};
      },
    });
    const config={configurable:{thread_id:'thread-1'}};
    const result=await pipeline.invoke({requestRef:'task-1'},config);
    assert.deepEqual(calls,['issue:analyzer:1','analyze','policy','issue:composer:2','compose','release']);
    assert.deepEqual(result.response,{answer_id:'answer-1'});
    assert.equal(result.delta,null);
    for await (const checkpoint of pipeline.getStateHistory(config)) {
      assert.ok(!JSON.stringify(checkpoint.values).includes('Preserve uncertainty'));
      assert.ok(!JSON.stringify(checkpoint.values).includes('cache_candidates'));
    }
    assert.ok(engine.cacheStats().hits > 0);
  });

  test('policy STOP never enters Composer', async () => {
    let composed=false;
    const pipeline=createLangGraphPipeline({
      langgraph,checkpointer:new langgraph.MemorySaver(),
      issueContext:async()=>({messages:[{role:'system',content:'approved'}]}),
      analyze:async()=>({proposal:'blocked'}),
      applyPolicy:async()=>({route:'STOP',reason:'DENIED'}),
      compose:async()=>{composed=true;return 'invalid';},
      release:async()=>{composed=true;return {answer_id:'invalid'};},
    });
    const result=await pipeline.invoke({requestRef:'task-2'}, {configurable:{thread_id:'thread-2'}});
    assert.equal(composed,false);
    assert.equal(result.decision.reason,'DENIED');
    assert.equal(result.response,undefined);
  });

  test('unresolved information can reach Composer for a question', async () => {
    const calls=[];
    const pipeline=createLangGraphPipeline({
      langgraph,checkpointer:new langgraph.MemorySaver(),
      issueContext:async ({role})=>({messages:[{role:'system',content:role}]}),
      analyze:async()=>({proposal:'question'}),
      applyPolicy:async()=>({route:'COMPOSE',unresolved:['missing-model']}),
      compose:async (_messages)=>{calls.push('compose');return {response_act:'ask',text:'Which model?'};},
      release:async ({decision,draft})=>{
        assert.deepEqual(decision.unresolved,['missing-model']);
        assert.equal(draft.response_act,'ask');
        calls.push('release');return {answer_id:'question-1'};
      },
    });
    const result=await pipeline.invoke({requestRef:'task-question'}, {configurable:{thread_id:'thread-question'}});
    assert.deepEqual(calls,['compose','release']);
    assert.equal(result.response.answer_id,'question-1');
  });

  test('unknown policy route fails closed', async () => {
    let composed=false;
    const pipeline=createLangGraphPipeline({
      langgraph,checkpointer:new langgraph.MemorySaver(),
      issueContext:async()=>({messages:[{role:'system',content:'approved'}]}),
      analyze:async()=>({proposal:'update'}),
      applyPolicy:async()=>({route:'BYPASS'}),
      compose:async()=>{composed=true;return 'invalid';},
      release:async()=>({answer_id:'invalid'}),
    });
    await assert.rejects(
      pipeline.invoke({requestRef:'task-4'}, {configurable:{thread_id:'thread-4'}}),
      /POLICY_GAP/,
    );
    assert.equal(composed,false);
  });

  test('revoked Composer admission fails before model invocation', async () => {
    let allowed=true,composed=false;
    const pipeline=createLangGraphPipeline({
      langgraph,checkpointer:new langgraph.MemorySaver(),
      issueContext:async ({role})=>{
        if (role==='composer' && !allowed) throw Error('CONTEXT_GAP: revoked');
        return {messages:[{role:'system',content:'approved'}]};
      },
      analyze:async()=>({proposal:'update'}),
      applyPolicy:async()=>{allowed=false;return {route:'COMPOSE'};},
      compose:async()=>{composed=true;return 'invalid';},
      release:async()=>({answer_id:'invalid'}),
    });
    await assert.rejects(
      pipeline.invoke({requestRef:'task-3'}, {configurable:{thread_id:'thread-3'}}),
      /CONTEXT_GAP: revoked/,
    );
    assert.equal(composed,false);
  });
});
