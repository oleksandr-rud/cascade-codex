---
name: spec-diagrams
description: Create, add or review diagrams in product and application specifications, binding functions, processes, UI, API, handlers, data and acceptance to their owning contracts. Use for diagram authoring, notation selection and consistency review.
---

# Spec Diagrams

Make a specification's consequential relationships inspectable. Diagrams are
views of actual contracts; they do not replace payloads, handler algorithms,
physical schemas, screen designs or acceptance cases. Work in the user's language
and preserve exact code/protocol identifiers.

## Select the view

Read the relevant spec blocks and their owning contracts. Define the reader's
question, audience, boundary and `CURRENT / TARGET` behavior. Select a view by
LLM interpretation, not keywords or a diagram quota. Every applicable substantive
block gets a useful diagram or an exact reference to a shared one. Explain omission
for blocks without a meaningful visual relationship.

Read only the corresponding guide:

| Question or block | Guide |
|---|---|
| Functions, decomposition, ICOM, formal IDEF0 | [idef0-functions.md](references/idef0-functions.md) |
| Logical data, physical schema alignment, IDEF1X | [idef1x-data.md](references/idef1x-data.md) |
| Scenario sequence, branches, lifecycle, races, IDEF3 | [process-state.md](references/process-state.md) |
| API calls, handlers, method contracts, IDEF4 adaptation | [handler-contracts.md](references/handler-contracts.md) |
| User actions, screens, company role handoffs, IDEF8 | [interaction-company.md](references/interaction-company.md) |
| C4, trust dataflow, deployment, capacity, IDEF2/14 | [architecture-dataflow.md](references/architecture-dataflow.md) |
| Concepts, acceptance, decisions, changes, IDEF5/6/9 | [trace-decisions.md](references/trace-decisions.md) |
| Test boundaries, oracles, case/contour coordination | [test-views.md](references/test-views.md) |
| Syntax, local rendering, evidence and maintenance | [syntax-rendering.md](references/syntax-rendering.md) |

See [sources.md](references/sources.md) for primary manuals and notation references.
Mermaid diagrams adapting IDEF ideas must say `IDEF-inspired adaptation`. Use
`formal` only with the selected notation's rules and a corresponding review.
An image, renderer pass or informal flowchart cannot establish formal compliance.

## Construct and insert

1. Read the concrete data, operations, functions, actors and rules needed by this
   diagram. When a material contract is absent, propose the missing content or
   record a gap; do not draw invented accepted behavior.
2. Name a stable diagram ID. Bind each meaningful node and consequential edge
   to spec IDs or exact owning source references. A node is not required for every
   internal helper. State whether edges mean decomposition, dataflow, calls,
   ordering, transitions or dependency; do not conflate these meanings.
3. Draw at one level of detail. Use labeled conditions/protocols, clear terminal
   outcomes, consistent terminology and explicit failure/commit points as needed.
   Split a large view by its question rather than by an arbitrary node limit.
4. Insert the editable source next to its owning section. For SVG/BPMN or a linked
   image retain its source and exact relative path. Add the caption and text
   equivalent described below. Reuse a diagram by ID when another block needs it.
5. Check syntax using the actual renderer/version when available, then inspect
   rendering and readability. Fix syntax and layout defects within scope. If a
   renderer is unavailable, retain editable source and mark `NOT_RUN`.
6. Review semantics with the LLM against the contracts: trace a normal case and
   a material exception, race or denial. Correct the owner or projection when
   they disagree. Mechanical link/ID checks cannot decide meaning.

## Diagram record

The adjacent caption carries `DG-ID`, question, scope, notation, behavior view,
owner and bindings. Include a short text equivalent preserving relevant failures,
conditions and order. Use [diagram-record.yaml](assets/diagram-record.yaml) when a
structured handoff is useful; do not require another file for each diagram.

Record syntax, render, contract review and formal notation review separately.
Use [diagram-evidence.schema.json](references/diagram-evidence.schema.json) for a
structured record: `PASS / FAIL / NOT_RUN / NOT_APPLICABLE / STALE / INCONCLUSIVE`.
PASS/FAIL needs the actual editable source SHA-256 and tool/reviewer, version and
evidence reference. Semantic/formal PASS/FAIL also needs owner SHA-256 and declared
related owner references/digests (empty only when no related owner is used).
Freeze these before review; do not hash the final result back into its own input.

A draft can leave source/owner digests null while checks are NOT_RUN. Changed
source invalidates affected checks; changed owner/dependencies invalidates semantic
and formal reviews even if the picture is unchanged. Verify current bytes before
reusing evidence. Format validity cannot prove agreement or formal compliance.
Authored diagrams do not imply tested application behavior.

## Update and return

When an owning contract changes, update only affected nodes/edges, bindings and
text equivalents. Preserve stable IDs and distinguish target changes from current
behavior. Return the edited spec/assets and actual evidence with unresolved gaps.
This skill is standalone: it requires no specific model, other skill, repository
framework, external diagram service or agent delegation.
