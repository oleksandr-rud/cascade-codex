# Work Lane: W-032 Simulation Intake And Agent Bridge

Status: `IN_REVIEW`
Planning Status: `IMPLEMENTED_CURRENT_SOURCE`
Plan Revision: `3`
Graph Revision: `1`
Owner: `agent-engineer`
Created: 2026-08-04
Execution Surface: `root`
Dispatch State: `IMPLEMENTATION_COMPLETE`
Dispatch Authorization: `2026-08-04 user instruction: update and implement the plans and specs fixes`
Next Gate: `independent integration, functional, security, and harness review for WG-001-N18`

## Request And Outcome

Connect prompt intake, extracted claims, product domains/capabilities/briefs,
simulation campaign authoring, exact policy selection, operator execution,
independent evaluation, and explicit product-doc refinement without merging
their authorities.

## Acceptance Criteria

- `SIB-001` through `SIB-006` and `PR-009` through `PR-012` are durable and
  trace to code, templates, roles, and tests.
- W-031 classifies simulation authoring/operation with proportional simulation
  governance and recognizes current shell-tool identities.
- Product campaigns bind a scope-correct intake; only READY, current,
  digest-equal product intakes can execute.
- Product intakes bind a current Task Envelope and reviewed/approved generated
  brief; harness intakes cannot claim product context.
- Declared policy IDs equal computed action-policy applicability exactly.
- `agent-engineer`, `simulation-operator`, `simulation-evaluator`, and
  `harness-evaluator` retain separate authoring, execution, and judgment roles.
- Simulation findings cannot silently mutate product docs; accepted findings
  re-enter synthesis and composition explicitly.

## Lane-Local Task Graph

| Node | Workline | Requires | Gate | State |
|---|---|---|---|---|
| `W-032-N01` | WL-01 schema/scope | W-031 Task Envelope contract; W-004 campaign contract | intake schema and scope tests | `REVIEW` |
| `W-032-N02` | WL-02 compiler/brief binding | N01; W-030 brief contract | compiler/CLI and stale-source tests | `REVIEW` |
| `W-032-N03` | WL-03 policy equality | N02; W-004 policy resolver | exact applicability tests | `REVIEW` |
| `W-032-N04` | WL-04 templates/product specs | N03 | template/catalog/brief fixed point | `REVIEW` |
| `W-032-N05` | WL-05 role/run gate | N04 | agent wiring and non-READY denial | `REVIEW` |
| `W-032-N06` | WL-06 integration | N05 | full validation and fixed-point review | `REVIEW` |

Failure reopens the earliest responsible node and only its consumers. Task
Envelope, brief, task/action, policy, or scope drift reopens N02 through N06;
an agent-role defect reopens N05/N06. No node self-accepts its own evidence.

## Boundaries And Dependencies

| Producer / authority | W-032 consumption | Must remain separate |
|---|---|---|
| W-031 / `TAP-*` | typed Task Envelope, claims, controls, authority gaps | no campaign action authorization |
| product catalog and `PB-XXX` | exact product seed and source digests | no execution or behavior proof |
| W-004 / WG-001 | campaign/task/policy/runtime/evidence contracts | W-004 remains shared merge owner |
| persona governance | derivation and proposal-only refinement rules | no synthetic self-validation or direct mutation |

WG-001 revision 12 adds `WG-001-N18` as the W-032 product-intake readiness
node. It gates product entries within `WG-001-N17`; it does not delay harness
mechanics or change Gate B’s deterministic implementation meaning.

## Current Evidence And Remaining Gates

- Implemented: admission policy/control repair, shell-tool normalization,
  intake schema/compiler/CLI, product campaign run gate, draft starter,
  product/spec templates, and role wiring.
- Focused admission tests and corpus: passing after the revision-2 changes.
- Focused admission/intake/simulation tests: `49/49 PASS`.
- Campaign catalog/self-test: `PASS`, seven harness campaigns, digest
  `73e0a208c94ab44509d99952816c3132d925a3668ba6ba6408fe82e504ae5d40`;
  product/provider execution remains `NOT_RUN`.
- Complete repository regression: `152/152 PASS`; Cascade validator, brief
  fixed point, harness catalog/self-test, and target self-test pass.
- Intake trust probes reject harness/product authority crossover, mismatched
  envelope scope/identity, policy-set mismatch, and blocking or stale action
  decisions before execution.
- Fixed-point independent review and acceptance: `NOT_RUN`.
- Product/provider execution, independent product evaluation, persona research
  validation, merge, deploy, and release eligibility: `NOT_RUN`.

## File Ownership

- W-032: `docs/specs/simulation-intake-agent-bridge/**`, this lane,
  `product-evals/intakes/**`, `scripts/cascade/simulation-intake*`, and narrow
  intake/template/agent/product-ledger integrations.
- W-031: generic Task Envelope and `TAP-*` authority; W-032 contributes the
  simulation-specific control/corpus repair under serialized root ownership.
- W-004: shared campaign policy/runtime/evidence contracts and WG-001 merge.
- No commit, push, provider run, publication, deployment, or product-document
  promotion is authorized by lane readiness alone.

## Replanning History

| Revision | Trigger | Preserved | Changed | Evidence Impact |
|---|---|---|---|---|
| `1` | implement the missing admission-to-simulation bridge | separate W-031/W-030/W-004 authorities and no-auto-dispatch | intake schema/compiler, brief/policy binding, run gate, templates, roles, WG-001-N18 | local implementation reached review |
| `2` | fixed-point review found scope crossover, forged READY decisions, and stale policy-bundle identity gaps | lane topology, agent separation, campaign authority, provider gates | scope/identity path binding, exact READY policy/decision validation, admission bundle `cascade-core@2`, negative probes | 49 focused and 152 aggregate tests pass; independent acceptance remains open |
| `3` | fixed-point review found `simulation intake --check` compared generated content without strictly resolving READY dependencies | scope, policy, and role boundaries; no provider execution | READY checks now re-resolve the current envelope snapshot, brief, policies, and digests after equality comparison | 49 focused and 152 aggregate tests pass at catalog `73e0a208...`; independent acceptance remains open |
