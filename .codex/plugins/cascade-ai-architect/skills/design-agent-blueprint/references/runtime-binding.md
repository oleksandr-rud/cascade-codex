# Runtime binding

Use cascade-ai-architect:bind-agent-runtime after an accepted agent workflow exists.
Prefer direct host calls for linear or bounded observation loops. Select LangGraph or
another graph runtime only for a real durable-branch, join or recovery requirement.

Bind each role call to its Context Builder, declared output schema, Admission, host
authorization and current revision. Policy Engine owns orchestration and limits.
Research evidence returns through Analyzer and Admission. Only the host can publish or
commit authoritative changes. Checkpoints contain execution references, never authority.

The old graph adapter is retired. A target graph adapter must preserve the tested
createAgentRuntime contract and prove the same denied, stale, research-feedback,
cancellation and publication cases against its actual selected runtime.
