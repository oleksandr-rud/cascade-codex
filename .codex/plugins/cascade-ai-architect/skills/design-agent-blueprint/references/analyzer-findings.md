# Semantic Analyzer findings

Profile: `analyzer-findings@1`; payload: `analyzer-findings.v1`.
Owner: Cascade AI Architect. Internal wire: unchanged `state-delta.v3`.

Prefer this compact model output for a selected Analyzer–Policy–Composer target
whose analysis needs claims/corrections, one requested outcome, explicit gaps
and optional task-plan changes. Existing adopted adapters remain compatible.
Select the existing semantic operation profile when a target needs multi-part
candidate selection, multiple independent field updates, choice resolution,
memory writes or explicit action/research requests. Never silently drop an
unsupported operation or automatically switch schemas after a failed response.

```text
Analyzer findings -> host reference binding -> StateDelta proposal
                 -> policy admission and transaction -> fresh Composer context
```

## Model contract

The [schema bundle](agent-contracts.schema.json) defines `AnalyzerFindings`;
the [example](../assets/analyzer-findings.example.json) is prepared data, not a
model run. Export the model's schema closure with
`python3 scripts/analyzer_findings.py --schema`. This exports only reachable
semantic definitions, without the state, context, policy or receipt schemas.
Adapt schema syntax to the chosen provider's supported dialect without weakening
the host validation contract; no provider-specific strict-schema compatibility
is claimed by this reference.

| Field | Meaning and binding |
|---|---|
| `claims` | Typed assertions with subject/predicate handles, literal quotation, support and evidence; nullable `supersedes_ref` identifies a correction |
| `intent` | Nullable requested outcome; a registered `target_ref`, typed value, support and evidence; never a permission decision or answer outline |
| `gaps` | Registered target, explicit `unknown`, `ambiguous` or `conflicting` status, detail, support and evidence |
| `plan` | Nullable task-plan changes using existing step kinds, dependencies and prerequisites; no execution statuses |

Use `intent: null`, `plan: null` and empty lists when absent. A plan is conditional
on task needs; a factual correction or ordinary reply does not require one.
Task steps may describe a required confirmation, wait or research dependency.
Main Composer retains ordinary answer strategy, wording and response structure.
Gap detail is untrusted analysis data and does not become a system instruction.
Reported and inferred claims remain distinct. Competing reports stay separate;
an ambiguous gap does not select one as truth. A correction must identify the
specific earlier claim. Evidence presence and quote matching do not establish
semantic support or authorization.

## Executable binding

The [Python adapter](../scripts/analyzer_findings.py) exposes
`parse_findings(text)`, `analyzer_findings_schema()` and
`bind_findings(findings, context, bindings, value_schemas)`. It reuses the existing
packaged contract validator and needs no new Python package. The CLI consumes
separate model output and trusted host files:

```sh
python3 scripts/analyzer_findings.py --input model-result.json \
  --context issued-analyzer-context.json --bindings private-bindings.json \
  --value-schemas target-value-schemas.json
```

`context` is the already-issued `AnalyzerContext`. The private `bindings` object
must come from the same authenticated issuance, never from the model or a
retrieved document. It contains `context_id`, `base_revision`, and these maps:

| Map | Model handle maps to |
|---|---|
| `subjects` | Scoped canonical subject reference |
| `predicates` | `predicate`, `value_schema_ref`, `allowed_support`; schema resolves in trusted `value_schemas` |
| `fields` | `policy_id`, `instance_id`, `field_id` of an issued writable target |
| `evidence` | `ref` and exact issued `text` from the context's evidence catalog |
| `claims` | Current `claim_ref`, `revision`, `subject_ref`, `predicate` for allowed corrections |
| `owners` | Allowed canonical plan-step owner reference |
| `steps` | Existing step reference present in the issued task plan |
| `preconditions` | Registered canonical prerequisite reference |

Empty maps are allowed. Expose handles and required readable meaning in Analyzer
context, not the private map. Target issuance must validate scope, source versions,
current claim revisions and owner/prerequisite eligibility. The adapter checks
binding identity, reference membership, value schemas, quote presence, graph
closure, duplicate/conflicting writes, allowed operations and invocation limits.
It does not authenticate arbitrary caller-provided maps or check a live database.

Claims become `propose_claim` or `supersede_claim`. Intent and gaps become
`change_policy_data` with `set` and current field revisions. Gap target schemas
must accept exactly `{status, detail}`. Plan changes become `propose_plan_change`
with current task/plan bindings. New local IDs receive separate claim/step
namespaces; stable IDs remain runtime-owned. Arbitrary handles embedded inside
`JsonValue` are not resolved: use the target's declared value schema or select
a richer adapter for entity-valued or cross-claim field references.

All operations form one atomic group; a denied member rejects the group under
the existing policy contract. This favors simple all-or-nothing behavior over
partial application. Empty findings produce an empty delta, which must still
pass policy for expiry, revocation and other runtime transitions. A gap or a
research plan step alone never dispatches retrieval or an action. Their admitted
execution must follow the target's existing work/request lifecycle.

Pass the returned delta through live policy admission, current revision checks
and the existing transaction before issuing Composer context. Reissue and
reanalyze stale input; the adapter must not silently rebind an old result to a
new context. Retry/idempotency, permissions and execution receipts remain host
responsibilities. This is executable proposal conversion, not a Policy Engine.

## LangGraph and target integration

The [LangGraph binding](langgraph-integration.md) accepts optional `bindAnalysis`.
For this profile, `analyze` returns findings and `bindAnalysis` calls the adapter
against the same issued context and private bindings, before `applyPolicy`.
The reference adapter is Python; a JavaScript target must explicitly bridge it
or provide a parity-tested port. The graph hook itself does not launch Python.
Existing targets returning bound deltas omit the hook. Neither path bypasses
policy or changes Composer ownership.

Keep stable instructions and the selected findings schema in the approved
prefix; current evidence, values and plan state remain volatile data. Binding
metadata stays outside prompts and graph state. Changing output format alone
does not establish cache hits or token savings.

## Validation and proof limits

Run `python3 scripts/test_analyzer_findings.py` and
`python3 scripts/test_agent_contracts.py` from this skill directory. The adapter
tests cover correction identity, context bindings, exact evidence, schema and
operation limits, cycles, empty output and authority-field injection. LangGraph
tests exercise the actual Python adapter through the binding hook and confirm
that failure prevents policy execution. These are prepared-data tests.

Before claiming better model quality, compare frozen baseline/candidate output
profiles on the same inputs, model, policies and budgets. Include extraction,
correction versus competing report, unknown information, no-change turns,
multi-step dependencies, cancellation and attempted authorization. Measure
claim grounding, task completion, plan validity, unsupported effects, repairs,
tokens, latency and provider-reported cache use. Keep held-out judgments separate
from these visible development fixtures; live comparative evaluation is not
supplied by this adapter.
