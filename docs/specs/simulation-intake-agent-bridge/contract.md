# Simulation Intake And Agent Bridge Contract

Status: `reviewed`
Contract IDs: `SIB-001` through `SIB-006`
Source identity: 2026-08-04 request to connect prompt intake, product context,
simulation authoring, execution, evaluation, and product-doc refinement

## Outcome

A simulation request becomes runnable only through one digest-bound intake that
preserves the W-031 Task Envelope claims, selects the correct product context,
computes the exact campaign action policies, and hands distinct obligations to
the author, operator, and evaluator roles. The intake is an execution
precondition, not a new product or policy authority.

## SIB-001 Intake Scope And Authority

Simulation intakes live under exactly one physical root:

- `product-evals/intakes/harness/` for Cascade mechanics and harness behavior;
- `product-evals/intakes/product/` for target-product simulations.

The intake `scope`, campaign simulation scope, and physical root must agree.
Harness intakes cannot bind a product brief or support target-product/persona
claims. Product campaigns require an `intake_file`; `DRAFT` and `BLOCKED`
intakes validate as planning artifacts but cannot execute.

## SIB-002 Task Envelope And Claim Binding

The W-031 compiler remains the authority for request relation, intent, typed
claims, workload, controls, and dispatch/permission gaps. Simulation change or
operation prompts activate `SIMULATION_GOVERNANCE`, a connected route, high
assurance, independent evidence, and `simulation-campaigns`.

A compiled intake snapshots the current Task Envelope beneath its scope root
and binds its path, ID, revision, and SHA-256. Active, non-superseded Task
Envelope claims are copied as source-attributed intake claims; no claim is
silently upgraded from inferred or unknown to verified.

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

## SIB-004 Exact Policy Resolution

For every policy-observable action, the compiler records the action digest,
computed applicable policy IDs and digests, and decision. Direct-process and
HTTP tasks are normalized into the same action-policy boundary as stateful
actions.

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
| author | `agent-engineer` / `simulation-campaigns` | Task Envelope, product brief when product scoped, current definitions | author campaign/intake changes only | validated campaign and READY intake |
| execute | `simulation-operator` / `simulation-execution` | explicit run authorization and READY intake | mutate only the approved isolated target/run boundary | frozen evidence, cleanup, execution receipt |
| evaluate | `simulation-evaluator` / `simulation-evaluation` | frozen run plus frozen intake | read-only judgment | claim ledger, evaluation receipt, repair/refinement route |
| harness judge | `harness-evaluator` / `harness-evaluation` | Cascade route/trace packet | specialized read-only harness judgment | harness receipt consumed by general evaluation |

Authoring does not dispatch execution. Execution does not change campaign
intent. Evaluation does not execute or repair. Product-document promotion
returns through `synthesis-to-spec -> compose-spec`, external evidence where
required, and accountable review.

## SIB-006 Lifecycle And Invalidation

```text
Task Envelope + optional product brief
  -> DRAFT/BLOCKED intake
  -> exact claim/action/policy compilation
  -> READY intake
  -> explicitly authorized operator run
  -> immutable evidence and verified cleanup
  -> independent evaluation
  -> simulator repair or reviewed synthesis proposal
```

A Task Envelope revision, product brief/source/output digest, campaign task,
action, policy set/content, scope, or source identity invalidates the READY
intake. Execution refuses absent, draft, blocked, stale, cross-scope, or
mismatched product intakes.

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
- product campaign refusal for non-READY or stale intake;
- exact action/policy equality checks during compilation and campaign resolve;
- agent/skill routing validation and complete Cascade regression.
