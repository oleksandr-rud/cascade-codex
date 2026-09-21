/** Optional LangGraph binding for the Analyzer–Policy Engine–Composer profile.
 * The host supplies policy, context issuance, model calls and a checkpointer.
 */
export function createLangGraphPipeline({
  langgraph, checkpointer, issueContext, analyze, applyPolicy, compose, release,
}) {
  const { Annotation, StateGraph, START, END } = langgraph ?? {};
  if (!Annotation?.Root || !StateGraph || !START || !END || !checkpointer ||
      [issueContext, analyze, applyPolicy, compose, release].some(fn => typeof fn !== 'function')) {
    throw Error('LANGGRAPH_BINDING_GAP: graph, checkpointer and host callbacks required');
  }

  const State = Annotation.Root({
    requestRef: Annotation(),
    delta: Annotation(),
    decision: Annotation(),
    response: Annotation(),
  });

  return new StateGraph(State)
    .addNode('analyzer', async (state, config) => {
      if (typeof state.requestRef !== 'string' || !state.requestRef) {
        throw Error('ADMISSION_GAP: request reference required');
      }
      const context = await issueContext({role:'analyzer',requestRef:state.requestRef,config});
      if (!Array.isArray(context?.messages)) throw Error('CONTEXT_GAP: analyzer slice');
      return {delta:await analyze(context.messages,{manifest:context.manifest,config})};
    })
    .addNode('policy', async (state, config) => {
      const decision = await applyPolicy({requestRef:state.requestRef,delta:state.delta,config});
      if (!decision || !['COMPOSE','STOP'].includes(decision.route)) {
        throw Error('POLICY_GAP: explicit COMPOSE or STOP route required');
      }
      return {decision,delta:null};
    })
    .addNode('composer', async (state, config) => {
      const context = await issueContext({
        role:'composer',requestRef:state.requestRef,decision:state.decision,config,
      });
      if (!Array.isArray(context?.messages)) throw Error('CONTEXT_GAP: composer slice');
      const draft = await compose(context.messages,{manifest:context.manifest,config});
      const response = await release({
        requestRef:state.requestRef,decision:state.decision,draft,
        contextManifest:context.manifest,config,
      });
      if (response == null) throw Error('RELEASE_GAP: canonical response receipt required');
      return {response};
    })
    .addEdge(START,'analyzer')
    .addEdge('analyzer','policy')
    .addConditionalEdges('policy',state => state.decision.route === 'COMPOSE' ? 'composer' : END)
    .addEdge('composer',END)
    .compile({checkpointer});
}
