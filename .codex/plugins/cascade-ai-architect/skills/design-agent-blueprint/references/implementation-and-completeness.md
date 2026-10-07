# Implementation and completeness

Adopt [architecture version 3](analyzer-policy-composer.md) before implementation.
Bind model transports, per-role Context Builders, current host snapshots, authorization,
CAS recording, idempotency, cancellation, research adapters and atomic publication.
The [reference runtime](../scripts/agent_runtime.mjs) exercises the actual order and
checks; callback fixtures do not prove provider quality or a deployed host adapter.

Validation must cover direct composition, research followed by fresh analysis, denied
invocation/publication, unknown references, malformed output, stale state, cross-scope
access, finite loops, cancellation, and failures with uncertain effects. Reuse the runtime
boundary suite and add target tests for persistence and external effects.

Use independent Cascade Quality subject evaluation for semantic behavior. A structural
pass cannot certify grounded claims, adequate answers or improved outcomes. Preserve
NOT_RUN and failed evidence. Promotion remains a separate authorized host operation.
