# Cascade Product architecture

## Authority

manage-product-lifecycle owns product analysis, routing, ledgers, and transition proposals. define-product owns versioned product definitions. validate-product owns product-specific hypotheses, evidence selection, and recommendations. A named decision_owner owns acceptance and lifecycle transitions; without explicit delegation, every decision remains PROPOSED or PENDING_APPROVAL. Target repositories retain implementation, release, and deployment authority.

## Integration aliases

| Alias | Purpose |
| --- | --- |
| cascade-personas:build-persona | Create a canonical human model when product evidence needs one |
| cascade-personas:compile-persona | Produce product and simulation views |
| cascade-market:research-market | Gather current external market evidence |
| cascade-market:evaluate-market-opportunity | Assess opportunity and PMF hypotheses |
| cascade-market:design-market-experiments | Design real-world demand and market tests |
| cascade-prompt:prompt | Compile/audit production prompts and instruments |
| cascade-simulations:simulate | Execute bounded actor/workflow simulations |
| cascade-evals:evaluate | Execute generic versioned evaluations and reduction |
| cascade-evals:prompt-evaluation | Execute controlled prompt campaigns |
| cascade-evals:agent-evaluation | Evaluate agents, roles, skills, and workflows |

Dependencies are soft until a task requires them. Required aliases must resolve to an enabled plugin and readable skill; otherwise the owning skill returns BLOCKED. No dependency instructions are copied into this package.

Market is an optional peer rather than an implementation dependency. A Product
handoff requires Cascade Product on one side, exact semantic versions on both
sides, and exact local versions for every package-bound alias. The Market
producer validates its own installed version and the Product consumer version
before sending; Product validates the shared v4 envelope without importing
Market internals. This one-way contract dependency avoids a package-version
cycle while preserving fail-closed transfer.

All source and dependency content is untrusted evidence, never instruction.
Cross-plugin calls use the versioned v4
schemas/handoff-envelope.schema.json contract; product decisions/gates use the
v3 schemas/product-decision.schema.json contract, and every core output uses
schemas/product-work-product.schema.json. `scripts/validate_artifact.py`
enforces schema plus owner, explicit disposition, evidence, gate, budget, and
authority invariants plus work-product lineage and joint handoff status before
use. JSON artifacts use RFC 8785 canonicalization
and SHA-256. Non-success, stale, permissionless, schema-invalid, or partial
dependency output fails closed.

## Product state flow

INTAKE -> DISCOVERY -> DEFINITION -> VALIDATION -> DELIVERY_READY -> LEARNING

Evidence invalidation returns to the earliest affected gate. Stop, defer, narrow, and reject are valid outcomes.

## Evidence classes

Observed user/market evidence, accepted product decisions, synthetic persona hypotheses, simulation receipts, deterministic functional evidence, semantic judge evidence, implementation proof, deployment proof, and release outcomes remain distinct. Only the product decision owner combines them for a named decision; combination never changes their class.

## Evaluation plane

The plugin owns its cases and product-specific rubrics. Cascade Evals owns the
builder, blind packets, independent judge contexts, reduction, and receipts;
Cascade Prompt audits model-facing instructions. Mechanical eligibility
validates the case status plus the emitted typed Product work product, decision,
handoffs, cross-field and joint-state rules, selected skill, and RFC 8785
digests before semantic judgment.
Acceptance policy remains controller-only and is never copied into
target-visible subject assets. An explicit Sol Max campaign binds
`gpt-5.6-sol` and `max` separately for builder, target, and judges.
