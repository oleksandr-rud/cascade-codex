# Cascade Project Management architecture

## Authority

Cascade Project Management owns portable work-item definition, project
planning, lean Agile MVP decomposition, iteration sequencing, dependency
coordination, status analysis, reconciliation, and closeout/retention
proposals. It does not own product priority, market truth, marketing strategy,
quality method, tracker filing, repository state, execution, delegation,
release, deployment, or archival effects.

Product decisions stay with `cascade-product`. External market evidence stays
with `cascade-market`. Marketing strategy requires a named human
owner or a future dedicated plugin. QA owns quality planning and test
semantics. The target host binds current context, permissions, commands,
durable paths, and accepted state transitions.

## Integration aliases

| Alias | Use | Boundary |
| --- | --- | --- |
| `cascade-product:manage-product-lifecycle` | Resolve product priority, MVP, or lifecycle decisions | Project Management consumes the accepted handoff |
| `cascade-market:research-market` | Supply external research evidence | Research findings never become project facts silently |
| `cascade-market:design-market-experiments` | Supply a market experiment plan | PM coordinates the experiment but does not execute or reinterpret it |
| `cascade-qa:plan-quality` | Define quality scope for selected work | Conditional; QA is not the default router |
| `cascade-qa:assess-quality` | Supply a quality-gate recommendation | PM records the gate without self-accepting it |
| `cascade-qa:triage-defects` | Classify observed failure ownership before a repair item is assigned | PM preserves the candidate; QA owns classification |
| `target-host` | Search, file, assign, or mutate a tracker item | PM emits a candidate and never claims the external effect |
| `cascade-evals:agent-evaluation` | Evaluate these four skills | Evals owns execution and reduction |

Every peer is soft until the current task requires its artifact. A supplied
valid artifact can be consumed without installing its producer. A required
missing capability returns `BLOCKED`; no peer workflow is copied into this
package.

Owner identity is source-bound. Human and team owners require current source
entries; plugin and host owners use exact canonical routes. Descriptive role
placeholders never establish authority.

State-bearing plans, artifacts, receipts, records, gates, audits, and consumer
references are revision-bound by supplied digest before they support a
definitive plan, status, reconciliation, or closeout decision.
Within an artifact, `SRC-*` IDs are the canonical references for decisions and
for undigested or missing sources; digest-qualified external identities remain
valid where the owning source supplies the digest.

## Artifact flow

`WORK_ITEM_DEFINITION`

`PROJECT_PLAN or AGILE_DELIVERY_PLAN -> PROJECT_STATUS or RECONCILIATION -> CLOSEOUT`

The schema keeps strategy and evidence bodies in their owning artifacts. A
work-item definition contains one tracker candidate and no active dependency
graph. A
generic plan uses compact work items; an Agile plan uses one canonical
`version -> iteration -> story -> task` hierarchy and progressive elaboration
instead of copying a second backlog. Plugin artifacts propose changes; only a
target host may apply them.

## Evaluation

The plugin owns cases, deterministic route/schema assertions, and
project-specific outcome and trajectory rubrics. Cascade Evals owns isolated
target execution, independent judges, recomputation, conservative reduction,
and receipts. The qualification suite freezes its explicit model comparison
and conservative non-compensating reduction policy in controller-only assets;
target-visible plugin contracts do not disclose sealed acceptance values.
