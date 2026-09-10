# Selective memory: runnable project-intake example

This optional prototype demonstrates the adopted state/claims/memory design.
All data and model proposals are synthetic, authored fixtures. No LLM is called.
The owning [reference](../../references/selective-state-claims-memory.md) defines
the representation and evidence boundaries.

Run from `skills/design-agent-blueprint` using Python 3.10 or newer:

```sh
python scripts/test_selective_memory.py -v
python scripts/selective_memory.py --output /absolute/path/to/a-new-output-directory
```

The output directory must not already exist. The example creates a persistent
`project-memory.sqlite`, a before/after/conflict `trace.json`, and a hierarchical
`composer-context.txt`. It never writes the harness's operational LocalDB.

The prepared story reports a $5,000 budget and Alex as owner, creates a derived
summary, corrects the budget to $6,000, explicitly approves that amount through
a host command, then introduces a competing $7,000 report. Inspect the result:
the old claim remains in lineage, the summary is stale and withheld, both current
budget reports remain visible as conflicting, and the domain approval remains
separate from the later report. Structural graph links are rebuilt from records.

## Contract mapping

- `apply_group` accepts one list of existing schema-bundle `Operation` values.
  Supported subset: `propose_claim`, `supersede_claim`, `propose_memory` with
  `replace_summary` and `task`. Unknown/unsupported operations fail closed.
- `budget` values have integer `amount_minor` and `currency: USD`; `owned_by`
  values have one registered person `entity_ref`. These are example domain
  schemas, not global predicates or changes to `state-delta.v3`.
- Scope, project, base revision and request key are trusted caller arguments.
  Stable claim IDs come from the runtime. Fixture placeholders are explicitly
  bound from preceding receipts before invocation; they are not parsed from text.
- SQLite serializes writes. Repeated identical keys return the original receipt;
  changed input under the same key rejects. One invalid operation rolls back all
  changes in that group. Empty or duplicate proposals preserve state revision.
- Source checks establish exact reference/scope and literal quote presence only.
  Semantic support, normalization correctness and speaker authority remain unproven.
- A summary tracks claim revisions and the relevant predicate's claim set, so
  a new competing claim invalidates it. It also binds the project's domain
  revision, so approval changes invalidate a summary of the prior state.
  It cannot strengthen those claims.
- SQLite `user_version=2` identifies this example's storage schema. Opening v1
  adds optional entity display attributes atomically, preserving existing rows.
  Missing attributes stay absent. Unknown versions reject; other migrations
  require separately implemented target changes.
- `issue_context(..., clarification=proposal)` admits the bundle's optional
  `ClarificationProposal` and hydrates scoped readable candidate details. See
  [the clarification contract](../../references/clarification-contract.md).
  It writes no claim or resolution. Context profile `selective-memory-example@2`
  includes clarification dependencies; earlier context profiles must be reissued.
- Context is a snapshot with a private content digest and scope/revision manifest.
  The model-facing text omits that manifest. Character budget overflow returns
  a gap; production token budgeting must be supplied by the target adapter.
- `graph` returns historical lineage links for an authorized subject. It is an
  audit view, not a list of currently true facts or a source-disclosure grant.

## Limits before target adoption

This is a local reference, with no production identity provider, fine-grained
ACL, HTTP server, encryption/retention service, rejection journal, full delta
group/alternative selection, durable-memory consent/TTL, general schema migration,
temporal validity engine, model execution or semantic judge. Explicit host
commands demonstrate domain separation; host approval verification and effect
idempotency remain integration work. No publication/action executor is supplied.
Source revocation conservatively hides dependent claims and stale summary text;
production deletion must also cover stored history, graph views and derived data.

The template and evaluation seed files are preparation aids. Resolve all required
placeholders and freeze real source/model/policy bindings before live evaluation.
Do not copy prepared expected proposals into a held-out target prompt.
