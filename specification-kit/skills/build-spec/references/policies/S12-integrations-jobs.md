# S12 — Integrations and jobs

For each provider, worker, webhook or scheduled job define trigger, payload,
credentials/config source, acknowledgement versus completion, timeout, retry
limit/backoff, deduplication, ordering, failure ownership and manual recovery.
Use exact provider versions/contracts; unknown guarantees remain explicit.

The section contains integration/job records. Its sequence diagram identifies
participating processes, durable records, commit boundaries, delivery attempts
and consequential failures. Bind messages to operation/event/job IDs. Do not
promise exactly-once external effects from at-least-once transport.

Check crash/restart and replay behavior against the stated mechanisms and tests.
See [sequence guidance](../../../spec-diagrams/references/handler-contracts.md).
