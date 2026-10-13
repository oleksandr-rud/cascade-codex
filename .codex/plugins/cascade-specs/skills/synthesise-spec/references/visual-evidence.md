# Designs, Mockups And Diagrams

Load when visual artifacts are supplied, requested or material. The entrypoint
owns readiness and truth axes; visual inspection never proves implementation.

## Artifact Inspection

Register each relevant artifact once with stable packet-local ID, kind,
owner/version (or UNKNOWN), behavior time, authority, behavior evidence,
inspection mode, selected scope and exact path/URL plus page/frame/node/anchor
and viewport when applicable. Preserve supplied IDs. Use native artifact
access and inspect the relevant rendered states/viewports when available.

| Inspection mode | Evidence and limit |
|---|---|
| INTERACTION_INSPECTED | Named prototype controls/states exercised; no production/provider proof |
| VISUALLY_INSPECTED | Actual pixels/frames viewed in named scope; no hidden-state or interaction proof |
| STRUCTURE_INSPECTED | Markup, layers, tokens or metadata read; no rendered-layout/usability proof |
| REFERENCE_ONLY | Exact reference supplied but unopened; no content claims |
| NOT_INSPECTED | No usable source or access failed; no design claims |

Record unshown states as NOT_SHOWN and inaccessible sources explicitly. Do
not infer responsiveness, accessibility, loading, empty, failure, recovery or
success from one frame. A material inaccessible authority is BLOCKED; an
unresolved decision between accessible sources is NEEDS_INPUT. Neither is
resolved by inventing a screen. Only create/edit designs when requested.

Use design IDs beside affected outputs, journey steps, visible boundary states,
Experience And Design rows, acceptance and traceability. Keep raw references
in one manifest. Map controls to legal operations using boundary-contracts.md;
mismatches are CONFLICTING with owner and readiness effect. A preview is
optional; its exact reference remains canonical. Do not expose private frames.

For material design coverage map Design Ref, Surface/State, Role/Viewport,
Behavior Time, Authority, Inspection/Scope, Constraint, Gap/Conflict and
Journey/Acceptance. Do not repeat this matrix in other sections.

## Diagram Selection

Choose by the reader's question, without copying example diagrams:

| Question | Smallest useful representation |
|---|---|
| User path and visible states | Journey table; optional screen flow |
| Business actor handoffs/decisions | Actor-lane flowchart |
| System ownership and boundaries | C4-style context/container view |
| Cross-boundary order/completion | Sequence diagram |
| Durable lifecycle | State diagram plus transition table |
| Changed record relationships | ER view |

Use formal BPMN only for required message/timer/compensation semantics; do
not label a Mermaid flowchart standards-compliant BPMN or C4. Business
handoffs and runtime sequence are separate views when both are material.
Normally use at most two primary diagrams; a third needs a distinct question.
Delivery dependencies belong to the work plan, not business behavior.

Every diagram states its question, audience, scope/abstraction, CURRENT/TARGET
and syntax/render evidence PASS/FAIL/NOT_RUN with tool/artifact when run. Pair
it with text preserving material nodes, relationships, transitions and failure
paths. Keep views focused, label arrows and actors, and never rely on color.
Generated source alone does not prove rendering. An unreadable or unrendered
view cannot be the only authority for a behavioral contract.
