import {test, expect} from 'bun:test';
import {createAgentRuntime, admitAnalysis, contextBuilders, authorizationRequestDigest, modelSchema} from './agent_runtime.mjs';

const claim = () => ({id: 'budget', subject: 'project', predicate: 'budget', value: 5000,
  support: 'REPORTED', confidence: 1, evidence_refs: ['user-input'], uncertainty: null});
const analysis = actions => ({schema_version: 'analysis.v1', claims: [claim()],
  actions: actions ?? [{id: 'answer', kind: 'COMPOSE', claim_refs: ['budget'], goal: 'Explain the reported budget.'}], uncertainties: []});
const catalog = {subjects:['project'],predicates: {budget: {type: 'integer', minimum: 0}}, sources: {market: 'https://example.test/market'}};
function fixture(options = {}) {
  let state = {request_id: 'r1', scope_id: 'tenant-a/task-1', revision: 0, status: 'ACTIVE', response: null, task: 'Explain the budget.',
    observations: [{id: 'user-input', kind: 'USER', content: 'My reported budget is 5000.', source_id: 'current-user'}]};
  const events = [], invocations = [], saved = [];
  const receipt = (before,input) => ({receipt_id: 'receipt-'+state.revision, request_id: state.request_id,
    scope_id: state.scope_id, before_revision: before, after_revision: state.revision,
    operation:input.authorization.operation,request_digest:authorizationRequestDigest(input)});
  const commit = (input, mutate = () => {}) => {
    expect(input.scope_id).toBe(state.scope_id);
    expect(input.request_id).toBe(state.request_id);
    if (input.expected_revision !== state.revision) throw Error('HOST_CAS_CONFLICT');
    const before = state.revision;
    mutate(); state.revision++; saved.push(input); return receipt(before,input);
  };
  const host = {
    readState: async () => structuredClone(state),
    authorize: async issued => ({allowed: options.deny !== issued.operation, operation: issued.operation,
      request_id: issued.request_id, scope_id: issued.scope_id, revision: issued.revision,
      request_digest: authorizationRequestDigest(issued)}),
    recordAnalysis: async input => {events.push('record-analysis'); return commit(input);},
    recordObservation: async input => {events.push('record-observation'); return commit(input, () => state.observations.push(...input.observations));},
    verifyResponse: async input => ({schema_version:'response-check.v1',request_id:input.request_id,
      scope_id:input.scope_id,revision:input.revision,response_digest:input.response_digest,
      analysis_digest:input.analysis_digest,judge_context_id:'independent-fixture-context',
      evidence_receipt_id:'synthetic-check-receipt',verdict:'PASS'}),
    publish: async input => {events.push('publish'); return commit(input, () => {state.status=input.terminal_status;state.response=input.response;});},
  };
  const models = {
    analyzer: async () => analysis(),
    researcher: async () => ({schema_version: 'research.v1', observations: [{id: 'market-source', source_id: 'market', content: 'A retrieved market report.'}], uncertainties: []}),
    composer: async () => ({schema_version: 'response.v1', content: 'Your reported budget is 5000.', claim_refs: ['budget']}),
  };
  const builders = Object.fromEntries(Object.entries(contextBuilders).map(([role, builder]) => [role, input => {
    invocations.push({role, revision: input.snapshot.revision}); return builder(input);
  }]));
  const make = () => createAgentRuntime({host, models, catalog,
    limits: {max_rounds: 3, max_research_calls: 2, wall_time_ms: 1000, ...options.limits}, builders});
  return {host, models, builders, make, events, invocations, saved,
    state: () => state, bump: () => state.revision++, run: () => make().run({request_id: 'r1', scope_id: 'tenant-a/task-1'})};
}

test('admission consumes claims/actions directly and policy builds fresh Composer context', async () => {
  const f = fixture();
  const result = await f.run();
  expect(result.status).toBe('COMPLETED');
  expect(f.events).toEqual(['record-analysis', 'publish']);
  expect(f.invocations).toEqual([{role: 'analyzer', revision: 0}, {role: 'composer', revision: 1}]);
  expect(f.saved[0].analysis.claims[0].support).toBe('REPORTED');
  expect(f.saved[0]).not.toHaveProperty('delta');
});

test('completed or waiting request replay never runs models or publishes twice', async () => {
  for (const clarify of [false, true]) {
    const f = fixture();
    if (clarify) f.models.analyzer = async () => analysis([{id:'question',kind:'CLARIFY',claim_refs:['budget'],question:'Confirm the reported budget?'}]);
    const first = await f.run(), calls = [...f.events], invocations = [...f.invocations];
    const replay = await f.run();
    expect(replay.status).toBe(first.status); expect(replay.reason).toBe('EXISTING_HOST_TERMINAL_STATE');
    expect(f.events).toEqual(calls); expect(f.invocations).toEqual(invocations);
  }
});

test('research observation returns through a new Analyzer and Admission before composition', async () => {
  const f = fixture(); let calls = 0;
  f.models.analyzer = async context => {
    if (++calls === 1) return analysis([{id: 'lookup', kind: 'RESEARCH', claim_refs: ['budget'], query: 'Find market evidence.', source_ids: ['market']}]);
    const view = JSON.parse(context.messages[1].content);
    expect(view.observations.some(item => item.kind === 'RESEARCH')).toBe(true);
    return analysis();
  };
  const result = await f.run();
  expect(result.status).toBe('COMPLETED');
  expect(f.invocations).toEqual([{role: 'analyzer', revision: 0}, {role: 'researcher', revision: 1},
    {role: 'analyzer', revision: 2}, {role: 'composer', revision: 3}]);
  expect(f.events).toEqual(['record-analysis', 'record-observation', 'record-analysis', 'publish']);
});

test('old proposal wire, extra authority fields and prototype-named fields are rejected before commit', async () => {
  for (const value of [{schema_version: 'state-delta.v3', groups: [], blocks: []},
    {...analysis(), authorization: true}, {...analysis(), toString: 'fake'}, {...analysis(), base_revision: 0}]) {
    const f = fixture(); f.models.analyzer = async () => value;
    await expect(f.run()).rejects.toThrow(); expect(f.events).toEqual([]);
  }
});

test('unknown predicate/evidence/source and unsupported claim value cannot enter policy', () => {
  const snapshot = fixture().state();
  for (const mutate of [v => v.claims[0].subject = 'tenant-b-user', v => v.claims[0].predicate = 'approval', v => v.claims[0].evidence_refs = ['invented'],
    v => v.claims[0].value = 'not-an-integer', v => v.actions = [{id: 'lookup', kind: 'RESEARCH', claim_refs: [], query: 'x', source_ids: ['private']}],
    v => v.claims[0].support = 'OBSERVED', v => v.claims[0].id = v.actions[0].claim_refs[0] = '']) {
    const value = analysis(); mutate(value);
    expect(() => admitAnalysis(value, snapshot, catalog)).toThrow();
  }
  for (const rule of [{oneOf:[{type:'integer'},{format:'unknown'}]}, {$ref:'https://example.test/Claim'}, {$ref:'#/$defs/toString'}]) {
    expect(() => admitAnalysis(analysis(), snapshot, {...catalog,predicates:{budget:rule}})).toThrow();
  }
});

test('uncertainty is explicit and factual support is never upgraded by admission', () => {
  const value = analysis(); value.claims[0].support = 'INFERRED';
  expect(() => admitAnalysis(value, fixture().state(), catalog)).toThrow('MISSING_UNCERTAINTY');
  value.claims[0].uncertainty = 'Reported amount needs confirmation.';
  const admitted = admitAnalysis(value, fixture().state(), catalog);
  expect(admitted.analysis.claims[0].support).toBe('INFERRED');
  expect(value.claims[0].support).toBe('INFERRED');
});

test('denied role invocation and denied publication do not bypass host authority', async () => {
  for (const deny of ['researcher', 'composer', 'publish']) {
    const f = fixture({deny});
    if (deny === 'researcher') f.models.analyzer = async () => analysis([{id: 'lookup', kind: 'RESEARCH', claim_refs: [], query: 'x', source_ids: ['market']}]);
    await expect(f.run()).rejects.toThrow('AUTHORITY_DENIED');
    expect(f.events).not.toContain('publish');
  }
});

test('stale state after a model call cannot be admitted or published', async () => {
  for (const role of ['analyzer', 'composer']) {
    const f = fixture(); const model = f.models[role];
    f.models[role] = async input => {const value = await model(input); f.bump(); return value;};
    await expect(f.run()).rejects.toThrow('STALE_CONTEXT');
    expect(f.events).not.toContain('publish');
  }
});

test('cross-scope snapshots and substituted authorization receipts stop before model execution', async () => {
  const f = fixture(); f.host.readState = async () => ({...f.state(), scope_id: 'tenant-b'});
  await expect(f.run()).rejects.toThrow('SCOPE_MISMATCH'); expect(f.invocations).toEqual([]);
  const g = fixture(); const authorize = g.host.authorize;
  g.host.authorize = async input => ({...await authorize(input), request_digest: '0'.repeat(64)});
  await expect(g.run()).rejects.toThrow('AUTHORIZATION_BINDING_MISMATCH'); expect(g.invocations).toEqual([]);
});

test('substituted commit receipts and discarded research observations cannot reach publication', async () => {
  const f=fixture();const commit=f.host.recordAnalysis;
  f.host.recordAnalysis=async input=>({...await commit(input),request_digest:'0'.repeat(64)});
  await expect(f.run()).rejects.toThrow('COMMIT_BINDING_MISMATCH');expect(f.events).not.toContain('publish');
  const g=fixture();g.models.analyzer=async()=>analysis([{id:'lookup',kind:'RESEARCH',claim_refs:[],query:'x',source_ids:['market']}]);
  g.host.recordObservation=async input=>{g.bump();return {receipt_id:'missing-observation',request_id:input.request_id,
    scope_id:input.scope_id,before_revision:input.expected_revision,after_revision:input.expected_revision+1,
    operation:input.authorization.operation,request_digest:authorizationRequestDigest(input)};};
  await expect(g.run()).rejects.toThrow('OBSERVATION_NOT_RECORDED');expect(g.events).not.toContain('publish');
});

test('failed, unresolved or self-authored semantic response assessment cannot publish', async () => {
  for (const verdict of ['FAIL','UNRESOLVED']) {
    const f=fixture(), verify=f.host.verifyResponse;
    f.host.verifyResponse=async input=>({...await verify(input),verdict});
    expect((await f.run()).status).toBe(verdict==='FAIL'?'REJECTED':'UNRESOLVED');
    expect(f.events).not.toContain('publish');
  }
  const f=fixture(), verify=f.host.verifyResponse;
  f.host.verifyResponse=async input=>({...await verify(input),judge_context_id:input.author_invocation_ids.at(-1)});
  await expect(f.run()).rejects.toThrow('RESPONSE_CHECK_BINDING_MISMATCH');expect(f.events).not.toContain('publish');
});

test('role contexts contain only their needed projections and model schema excludes authority', () => {
  const input = {snapshot: fixture().state(), analysis: analysis(), catalog, invocation_id: 'private-invocation',
    action: {id: 'lookup', kind: 'RESEARCH', query: 'Check pricing.', source_ids: ['market']}};
  const research = JSON.parse(contextBuilders.researcher(input).messages[1].content);
  expect(research).not.toHaveProperty('observations'); expect(research).not.toHaveProperty('claims');
  const composer = JSON.parse(contextBuilders.composer({...input, action: analysis().actions[0]}).messages[1].content);
  expect(composer).not.toHaveProperty('research_sources');
  expect(modelSchema('Analysis').$defs).not.toHaveProperty('Authorization');
  for (const role of Object.keys(contextBuilders)) expect(JSON.stringify(contextBuilders[role](role === 'composer'
    ? {...input, action: analysis().actions[0]} : input).messages)).not.toContain('private-invocation');
});

test('bounded research feedback stops without publication at the round or research ceiling', async () => {
  for (const limits of [{max_rounds: 1}, {max_research_calls: 0}]) {
    const f = fixture({limits}); f.models.analyzer = async () => analysis([{id: 'lookup', kind: 'RESEARCH', claim_refs: [], query: 'x', source_ids: ['market']}]);
    if (limits.max_rounds) expect((await f.run()).status).toBe('BUDGET_EXHAUSTED');
    else await expect(f.run()).rejects.toThrow('ROLE_BUDGET_EXHAUSTED');
    expect(f.events).not.toContain('publish');
  }
});

test('uncancelled or invalid model output cannot escape the wall-time or protocol gate', async () => {
  const f = fixture({limits: {wall_time_ms: 20}}); let aborted = false;
  f.models.analyzer = (_, {signal}) => new Promise(() => signal.addEventListener('abort', () => {aborted = true;}));
  await expect(f.run()).rejects.toThrow('DEADLINE_EXHAUSTED');
  expect(aborted).toBe(true); expect(f.events).toEqual([]);
  const g = fixture(); g.models.analyzer = async () => '{"schema_version":"analysis.v1","claims":[],"claims":[],"actions":[],"uncertainties":[]}';
  await expect(g.run()).rejects.toThrow(); expect(g.events).toEqual([]);
});

test('research cannot return evidence from an unissued source or empty evidence as success', async () => {
  const f = fixture(); f.models.analyzer = async () => analysis([{id: 'lookup', kind: 'RESEARCH', claim_refs: [], query: 'x', source_ids: ['market']}]);
  f.models.researcher = async () => ({schema_version: 'research.v1', observations: [{id: 'leak', source_id: 'private', content: 'x'}], uncertainties: []});
  await expect(f.run()).rejects.toThrow('RESEARCH_SCOPE_MISMATCH'); expect(f.events).not.toContain('record-observation');
  f.models.researcher = async () => ({schema_version: 'research.v1', observations: [], uncertainties: ['No result.']});
  expect((await f.run()).status).toBe('UNRESOLVED'); expect(f.events).not.toContain('publish');
});
