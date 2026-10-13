# Simulation Intake And Agent Bridge Contract

Status: `intake-v6/action-binding-v2; typed admission v41/core42; independent semantic and product/provider qualification remain separate`
Contract IDs: `SIB-001` through `SIB-006`
Source identity: 2026-08-04 request to connect prompt intake, product context,
simulation authoring, execution, evaluation, and product-doc refinement

## Outcome

A simulation request becomes runnable only through one digest-bound intake that
preserves the Task Envelope claims, selects the correct product context,
binds an explicit authored product seed map, computes the exact campaign action
policies, and hands distinct obligations to the author, operator, and evaluator
roles. The intake is an execution precondition, not a new product or policy
authority.

## SIB-001 Intake Scope And Authority

Simulation intakes live under exactly one physical root:

- `product-evals/intakes/harness/` for Cascade mechanics and harness behavior;
- `product-evals/intakes/product/` for target-product simulations.

The campaign `simulation_file` physical lexical root determines the permitted
`intake_file` root. That path equality is enforced by campaign schema and
runtime manifest validation, then replayed after the simulation manifest is
resolved. The intake's embedded `scope` cannot compensate for a cross-root
path. Replacement mode and the public writer apply the same check before the
Task Envelope snapshot or intake destination is written. The intake `scope`,
campaign simulation scope, and physical root must agree.
Harness intakes cannot bind a product brief or support target-product/persona
claims. Product campaigns require an `intake_file`; `DRAFT` and `BLOCKED`
intakes validate as planning artifacts but cannot execute.

## SIB-002 Task Envelope And Claim Binding

Task admission validates the LLM-proposed relation, intent, claims and
workload, then compiles controls and authority gaps. It does not infer meaning
from keywords, regexes or prose. The validated Task Envelope is the intake
source for those fields. Every simulation
change or operation prompt activates `SIMULATION_GOVERNANCE`. An ordinary
actor/interface simulation stays on the bounded `cascade-simulations:simulate`
route and does not create a campaign intake. Explicit controlled comparison,
calibration, repeated-run, product-intake, or release scope adds the connected
route, high assurance, independent evidence, and
`cascade-simulations:manage-simulation-campaign`; this
contract owns that escalated campaign/intake boundary.

A compiled intake snapshots the current Task Envelope beneath its scope root
and binds its path, ID, revision, and SHA-256. Active, non-superseded Task
Envelope claims are copied as source-attributed intake claims; no claim is
silently upgraded from inferred or unknown to verified.

The intake also binds the producer's provenance-contract version and the exact
trusted source-segment/direct-user-attestation identity carried by each active
claim. READY validation and the run gate replay that projection against the
current Task Envelope. The intake does not infer provenance independently and
cannot repair a producer label after the fact. A producer provenance-version
change requires an explicit intake schema migration; legacy intake v1-v5 is not
silently reinterpreted.

Compilation without `--write` is a projection of persisted campaign state, so
it validates the currently referenced intake and cannot preview a replacement
for an unsupported legacy artifact. Only the explicit public
`simulation intake ... --write` command may enter replacement mode for v1-v5;
default preview, `--check`, ordinary campaign resolution, and READY/run remain
strict and fail before reporting a runnable v5 intake.

## SIB-003 Product Context Seed

A READY product intake binds one reviewed or approved `PB-XXX` manifest and
its current generated projection, including manifest/output paths and digests,
domain, capability, revision, and exact requirement, journey, scenario, and
persona selections. Any selected source or generated-brief drift invalidates
the intake.

Product documents seed campaign claims and scenarios; they do not authorize
execution or prove behavior. A product result can propose a simulator repair,
new research question, or evidence-backed product refinement. It cannot edit a
persona, requirement, journey, scenario, capability, or brief implicitly.

Every product campaign also references one authored seed-binding artifact.
It binds the exact campaign digest and Task Envelope ID, revision, request
digest, and source digest. It maps every active Task Envelope/intake claim
exactly once by `source_claim_id` to `SEEDED`, `CONTEXT_ONLY`, or
`OUT_OF_SCOPE`. `SEEDED` requires at least one current campaign claim and at
least one current scenario or task. The other dispositions carry no targets
and require a nonempty rationale. At least one row must be `SEEDED`.

This explicit ID map is the only seed classification authority. The compiler
does not match claim text, infer semantic similarity, or add a second
classifier. Duplicate, missing, stale, unknown, cross-campaign, or
campaign/source-digest-mismatched bindings block READY. The intake persists
the exact artifact path, SHA-256, source identity, and mapping projection, then
replays them at `--check`, READY resolution, and run preflight. Harness
campaigns and harness intakes do not bind product seed artifacts.

Every compile, check, READY-resolution, and run-preflight observation reads the
seed artifact through the same bounded nofollow regular-file reader. Physical
ancestor containment and file identity must remain stable before and after the
single open/read. UTF-8 decoding, JSON parsing, runtime validation, intake
projection, and the source SHA-256 all derive from that one returned buffer;
no later pathname reopen may supply the digest or semantic definition.

The seed reader is bound to the exact canonical
`product-evals/intakes/product/seed-bindings/` root, not just the repository.
It snapshots and replays ancestor directory identities so moving an ancestor
and adding a same-inode hard-link alias cannot establish containment.

After that exact prefix, every directory component and JSON basename uses
only ASCII letters, digits, dot, underscore and hyphen, with at least one
non-dot character per component. Only `/` separates components; filenames end
in `.json`. The campaign and intake schemas share this positive path grammar
with runtime validation. It rejects percent encodings, non-ASCII lookalikes,
backslashes, `.`/`..`, wrong roots, absolute paths and empty components before
reading any referenced authority. This is path syntax, not claim semantics.

## SIB-004 Exact Policy Resolution

For every policy-observable action, the compiler records
`action_binding_version: cascade-action-binding-v2`, the canonical
`action_binding_digest`, computed applicable policy IDs and digests, and the
decision. The legacy `action_digest` field is not part of schema v6.
Direct-process and HTTP tasks are normalized into the same action-policy
boundary as stateful actions.

Zero applicable policies is `GAP`; multiple applicable policies is
`AMBIGUOUS`; `DENY` blocks readiness. For every task, the declared policy set
must equal the union of computed applicable policies exactly. Campaign
resolution repeats this equality check against current sources before a READY
intake is accepted.

Task-admission policies (`TAP-*`) choose workflow controls. Simulation action
policies under `product-evals/policies/` authorize or deny campaign actions.
They remain separate authorities and cannot substitute for each other.

## SIB-005 Agent Handoffs

| Stage | Role / skill | Required input | Authority | Output |
|---|---|---|---|---|
| author | `agent-engineer` / `cascade-simulations:manage-simulation-campaign` | Task Envelope, product brief when product scoped, current definitions | author campaign/intake changes only | validated campaign and READY intake |
| execute | `simulation-operator` / `cascade-simulations:execute-simulation-campaign` | explicit run authorization and READY intake | mutate only the approved isolated target/run boundary | frozen evidence, cleanup, execution receipt |
| evaluate | `simulation-evaluator` / `cascade-evals:simulation-evaluation` | frozen run plus frozen intake | read-only judgment | claim ledger, evaluation receipt, repair/refinement route |
| harness judge | independent judge context / `cascade-evals:harness-evaluation` | Cascade route/trace packet | specialized read-only harness judgment | harness receipt consumed by general evaluation |

Authoring does not dispatch execution. Execution does not change campaign
intent. Evaluation does not execute or repair. Product-document promotion
returns through `create-spec`, external evidence where
required, and accountable review.

The historical `harness-evaluator` receipt principal remains compatible; it
does not register a host role. The optional judge runs in a separate context.

## SIB-006 Lifecycle And Invalidation

```text
Task Envelope + optional product brief + authored product seed map
  -> DRAFT/BLOCKED intake
  -> exact claim/action/policy compilation
  -> READY intake
  -> explicitly authorized operator run
  -> immutable evidence and verified cleanup
  -> independent evaluation
  -> simulator repair or reviewed synthesis proposal
```

A Task Envelope revision, provenance-contract or direct-user-attestation
identity, product brief/source/output digest, campaign task, action, policy
set/content, authored seed path/content/campaign/source digest, seed mapping,
scope, or source identity invalidates the READY intake. Execution refuses
absent, draft, blocked, stale, cross-scope, or mismatched product intakes.

## Non-Goals

- Letting a prompt, model output, brief, or workline auto-dispatch a run.
- Treating harness simulations as product evidence.
- Allowing synthetic personas to validate or mutate their source persona.
- Inferring an applicable policy from a broad name or prose description.
- Updating product docs because a work cycle says “close out” without an
  explicit accepted finding and doc-routing decision.

## Acceptance Evidence

- `PR-009` through `PR-012`, `J-002`, and `PS-009` through `PS-012`;
- admission simulation-policy corpus and shell-tool normalization tests;
- simulation intake schema/compiler/starter tests;
- public default/check/write and run-preflight legacy-intake matrix tests;
- authored product seed schema, complete mapping, target-reference, digest,
  harness-separation, bounded-read/symlink/substitution, same-buffer digest,
  and READY replay tests;
- product campaign refusal for non-READY or stale intake;
- exact action/policy equality checks during compilation and campaign resolve;
- agent/skill routing validation and complete Cascade regression.
