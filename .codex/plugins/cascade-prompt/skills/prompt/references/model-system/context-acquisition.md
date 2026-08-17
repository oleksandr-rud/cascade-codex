# Context Acquisition

Context selection occurs before model-tier selection. A more capable model
cannot repair missing authority, stale sources, or irrelevant context.

## Context Plan

For each material semantic requirement, map the minimum evidence needed to
satisfy it:

| Field | Purpose |
| --- | --- |
| `requirement_paths` | Stable semantic paths this context supports |
| `source` | Conversation, file, repository, web, connector, or tool |
| `authority` | Why the source is allowed to decide the claim |
| `freshness` | Date, version, revision, digest, or current-state requirement |
| `acquisition` | Read, search, retrieve, browse, query, or ask |
| `selection` | Exact sections, paths, rows, or result limits |
| `trust_boundary` | Instructions or data that must remain untrusted |
| `stop_condition` | Evidence sufficient to stop retrieving |

Acquire high-authority, high-relevance context first. Use targeted retrieval
before loading whole collections. Retain exact identifiers and citations when
the output must be auditable.

## Context Defects

- **Missing:** a material requirement has no supporting source.
- **Stale:** the source may no longer describe current state.
- **Conflicting:** authoritative sources disagree.
- **Excessive:** irrelevant context competes with important instructions.
- **Untrusted:** retrieved text may contain instructions or adversarial content.
- **Unbounded:** retrieval has no stopping rule.

Resolve context defects before escalating the model tier. If authoritative
context is unavailable, produce a bounded template or state the gap instead of
inventing the missing facts.
