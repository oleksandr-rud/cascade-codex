# Optional LangGraph integration profile

Use this profile only when a target has selected LangGraph for the
Analyzer–Policy Engine–Composer workflow. LangGraph owns execution order and
checkpoints. The target application still owns authenticated admission,
deterministic policy, authoritative state transactions, context issuance,
model/provider adapters, and canonical response release. A graph edge is not a
permission decision.

The packaged [JavaScript graph binding](../scripts/langgraph_pipeline.mjs)
implements the minimal route:

```text
analyzer -> policy -> COMPOSE ? composer : END
```

The Analyzer node obtains a fresh admitted Analyzer slice, calls the model, and
returns only a proposed `StateDelta`. The target's `applyPolicy` callback must
validate the delta, apply a revision-checked, idempotent state transaction, and
return a small `COMPOSE` or `STOP` receipt. The Composer node obtains a new slice
from the committed revision and calls the model. The target's `release` callback
must validate and commit the canonical response. A denied or unresolved decision
stops before Composer. Errors in context issuance or release fail closed. Research, voice,
interim status and tool execution require separately admitted branches; this
small graph does not silently add them.

```javascript
import * as langgraph from '@langchain/langgraph';
import { createLangGraphPipeline } from './langgraph_pipeline.mjs';

const graph = createLangGraphPipeline({
  langgraph,
  checkpointer: targetDurableCheckpointer,
  issueContext: targetIssueAndAssemble,
  analyze: targetAnalyzer,
  applyPolicy: targetValidateReduceAndCommit,
  compose: targetComposer,
  release: targetValidateAndCommitResponse,
});
await graph.invoke({requestRef: admittedRequestRef}, {
  configurable: {thread_id: authenticatedThreadId},
});
```

`issueContext` must call the reviewed `schema-values-text@1` engine's
`issue(request, snapshot)` and `assemble(slice, request)` under live host
admission, then recheck eligibility before dispatch. Its returned `messages`
alone form model input. The separate private `manifest` is passed to the model
adapter callbacks for supported provider-cache configuration and to `release`
for response validation; it must not be serialized into model messages or graph
state. An opaque `requestRef` is a lookup key, not authority;
the host must bind it and LangGraph's `thread_id` to the authenticated caller,
tenant, task and current checkpoint. Use a durable checkpointer with appropriate
access and retention controls in production. `MemorySaver` is only a test
fixture. Earlier checkpoints may contain the proposed delta even though the
policy node clears it from the current graph state; apply the target's data
retention policy to checkpoint storage.

Policy commits and response release must tolerate node replay, retry and
resume through idempotency keys and compare-and-swap on authoritative state.
Store only references and compact receipts in graph state where possible; do
not checkpoint rendered prompts or treat graph state as the domain database.
Do not add automatic retries to side-effecting nodes without those guards.
Reissue role/task context after resume or state/policy changes, and block
stale dispatch or publication.

| Reuse layer | Owner and proof |
|---|---|
| LangGraph checkpoint | Graph control-flow recovery; no context or provider-cache claim |
| Local rendered-block cache | `createProjectionEngine`; bounded keys and live admission on every `issue`/`assemble`, including hits |
| Provider prompt cache | Target provider adapter; stable eligible prefix and provider-reported cached/write tokens, latency and cost |

The [projection tests](../scripts/projection_blocks.test.mjs) cover local cache,
revocation and budgets. The [LangGraph binding tests](../scripts/langgraph_pipeline.test.mjs)
use actual `@langchain/langgraph` and cover policy ordering, fresh Composer
context, STOP, invalid routes, revocation and local block reuse. They use fixture callbacks and
character counting; they do not prove target ACLs, tokenizer accuracy, durable
recovery, provider cache hits or semantic answer quality. For an optional target
integration, validate against the target's chosen package version and adapters.
The binding was checked with `@langchain/langgraph@1.4.17`.

From the `design-agent-blueprint` skill directory, with the package installed
in an isolated test or target environment, run:

```bash
CASCADE_LANGGRAPH_MODULE=/absolute/path/to/node_modules/@langchain/langgraph/dist/index.js \
  bun test ./scripts/langgraph_pipeline.test.mjs ./scripts/projection_blocks.test.mjs
```

See the official [JavaScript LangGraph workflow guide](https://docs.langchain.com/oss/javascript/langgraph/thinking-in-langgraph)
for StateGraph, node checkpoints, replay and the distinction between graph
execution and application-level caching.
