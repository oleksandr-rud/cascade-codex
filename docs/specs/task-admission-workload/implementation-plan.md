# Task Admission And Workload Compiler Implementation Plan

Status: `IN_REVIEW`; revision-41 attempt-2 locally validated review candidate at immutable r57
Plan Revision: `41`
Request Or Source ID: `2026-08-04-task-admission-workload-request`
Coordinator: `orchestrator`
Active Lane Reference: `W-031`
Scope Classification: `epic-sized harness change delivered through one serialized lane`

## Current Producer Identity

| Producer surface | Current identity | Exact local evidence | Next gate |
|---|---|---|---|
| Task Envelope/compiler/policy/catalog | schema/catalog/classifier `v41`; `cascade-core@42` | admission repository validation passes | fresh independent architecture, functional, and security review |
| Versioned admission corpus | case set `v41`; 981 cases | `981/981 PASS`; zero over/under-control; persistence `587/587`; claims `789/789` | independent review against immutable r57 |
| Typed clause state/reducer | `scripts/cascade/admission-clauses.ts` | revision-40 review-boundary, grounding, and continuation repairs; admission/clause/hook/intake tests pass `209/209` with 3,121 assertions | reviewer must assess generalization and seam boundaries, not only fixtures |

## Outcome Contract

- Problem: Cascade's current default route describes the complete non-atomic
  workflow but has no compiled, testable admission layer that distinguishes a
  direct answer, atomic change, bounded feature, connected task, high-assurance
  task, full scan, and long-running program before skills are selected.
- Intended behavior: every request produces the smallest valid Task Envelope;
  conditional controls expand from claims and policies; hard action controls
  remain deterministic; long-running work reclassifies at named checkpoints.
- Success criteria: `TA-001` through `TA-012` and the acceptance criteria in
  `contract.md` pass against current source, shadow fixtures, hook tests, and
  independent review.
- Non-goals: automatic lane/task creation; model-only enforcement; broad
  changes to W-004; external hard actions; or release claims without the
  independent gates below.
- Highest useful validation seam: given a request fixture plus explicit task
  state, source signals, policy bundle, and authority, the public admission CLI
  emits the expected versioned envelope and trace; hook integration then proves
  the same decision without side effects before tool enforcement is enabled.

## Source Ledger

| Source ID | Authority / Owner | Path Or Reference | Version / Freshness | Supports | Status |
|---|---|---|---|---|---|
| `SRC-01` | user request | current task, 2026-08-04 | current | objective, examples, enterprise/standard/simple/long-running coverage | `AUTHORITATIVE` |
| `SRC-02` | task-admission contract | `docs/specs/task-admission-workload/contract.md` | revision 40 | `TA-001` through `TA-012` | `AUTHORITATIVE` |
| `SRC-03` | repository instructions | `AGENTS.md`; `CODEX.md`; `.codex/config.toml` | current `master@4226bfa1f69f` plus preserved dirty runtime/schema/corpus/docs edits | current route, planning bypass, dispatch limits | `AUTHORITATIVE_CURRENT_SOURCE` |
| `SRC-04` | workflow semantics | `docs/patterns/workflow/index.md`; `docs/patterns/workflow/graph-shaped-work.md`; fragment catalog | current worktree | workline, graph, evidence, repair, authority rules | `AUTHORITATIVE` |
| `SRC-05` | current runtime | `scripts/cascade.ts`; `scripts/cascade/validate.ts`; `scripts/cascade/evals.ts` | current `master@4226bfa1f69f` | CLI, validator, eval integration seams | `AUTHORITATIVE_CURRENT_SOURCE` |
| `SRC-06` | harness eval contracts | `harness-evals/response.schema.json`; generated cases and tests | current worktree | present routing/eval shape and gaps | `SUPPORTING` |
| `SRC-07` | Codex hooks | [official Hooks documentation](https://learn.chatgpt.com/docs/hooks) | checked 2026-08-04 | hook events, decisions, trust boundary | `EXTERNAL_AUTHORITATIVE` |
| `SRC-08` | active work | `docs/work/active.md`; `docs/work/lanes/W-004-cross-surface-simulation-foundation.md` | current worktree | overlapping shared files and evidence boundaries | `AUTHORITATIVE_CURRENT_STATE` |

## Definition And Decision Ledger

| ID | Definition Or Decision | Authority | Consumers | Invalidation Rule | Status |
|---|---|---|---|---|---|
| `DEF-01` | Admission is an always-on microkernel with conditional expansion, not the complete workflow. | `TA-001` | runtime bridge, hook, skills | contract revision | `ACCEPTED` |
| `DEF-02` | Task Envelope is the only admission artifact for one request revision. | `TA-002` | compiler, hook, evals, routes | schema/policy revision | `ACCEPTED` |
| `DEF-03` | Workload axes remain independent; no scalar grade controls all routing. | `TA-005` | classifier and policy compiler | contract revision | `ACCEPTED` |
| `DEF-04` | Enterprise assurance, full scan, standard tests, and program topology are composable controls, not mutually exclusive grades. | `TA-007` | policies and evals | policy bundle revision | `ACCEPTED` |
| `DEF-05` | Model proposes claims; deterministic schemas and policies validate, constrain, record, and explain. External authority and tool permission remain separate inputs. | `TA-004`, `TA-008` | compiler, security, evaluator | boundary change | `ACCEPTED` |
| `DEF-06` | Hooks advise at prompt admission and enforce only tested mechanical tool boundaries. | `TA-012` | hook adapter, permissions | Codex hook contract change | `ACCEPTED` |
| `DEF-07` | Worklines are promoted after classification and never auto-dispatched. | `TA-011` | CODEX route, lane tooling | orchestration contract change | `ACCEPTED` |
| `DEF-08` | Rollout is contract -> compiler -> shadow eval -> advisory hook -> hard enforcement -> route migration. | this plan | all worklines | failed gate or implementation replan | `ACCEPTED` |
| `DEF-09` | Runtime configuration lives under `.codex/task-admission/`; evaluation fixtures live under `harness-evals/task-admission/`. | architecture review | file owners and validator | current-source structure conflict | `ACCEPTED` |
| `DEF-10` | One W-031 lane owns the change; all shared runtime writes are serialized with a W-004 overlap preflight. | orchestration review | lane Task Graph | parallel/worktree execution authorization | `ACCEPTED` |
| `DEF-11` | Simulation authoring/operation activates a dedicated admission control; ordinary actor/interface simulations use the bounded route, while explicit comparison, calibration, repeated-run, or release scope adds connected campaign governance. `TAP-*` workflow policy remains separate from campaign action policy. | W-032 / `SIB-002`, `SIB-004` | admission compiler, cascade-simulations:simulate, simulation-campaigns | intake or policy-boundary revision | `ACCEPTED` |
| `DEF-12` | Shell hard-action classification normalizes current and legacy tool identities before command inspection. | hook/runtime repair | PreToolUse and PermissionRequest | hook tool protocol change | `ACCEPTED` |
| `DEF-13` | Hard-action eligibility requires trusted direct-user provenance supplied or attested by the host; lexical fallback is advisory and cannot manufacture authority. | revision-11 independent review repair | compiler, hooks, W-032 | provenance-contract revision | `APPROVED` |
| `DEF-14` | Host-local plan, input, wait, and status operations are workflow control, not external-write authority; delegation, durable goal creation, and actual side effects retain separate controls. | revision-11 integration repair | tool classifier and hook | tool-surface contract change | `APPROVED` |

## Constraints, Deferred Decisions, And Rejected Paths

| ID | Type | Statement | Impact / Resolution | Status |
|---|---|---|---|---|
| `Q-01` | `AUTHORITY` | Runtime implementation required a later explicit instruction. | The 2026-08-04 “Implement until done” instruction authorized the scoped local implementation; external actions remain separately permissioned. | `RESOLVED` |
| `Q-02` | `EXTERNAL_CONDITION` | W-004 overlaps `.codex/config.toml`, `CODEX.md`, validators, evals, and shared contracts. | Root serialized shared writes, regenerated the product campaign catalog, and froze current immutable W-004 evidence. | `RESOLVED` |
| `Q-03` | `KNOWN_DEFECT` | `eval coverage --list-missing` passed callback index arguments to `rootPath`. | Repaired with a unary callback; the command now completes and reports current-source accepted coverage as `0/368`. | `RESOLVED` |
| `Q-04` | `HOOK_RUNTIME` | Production hook packaging varies by installed Codex/Bun environment. | The exact offline Bun command passed local stdin/stdout fixtures; first-use project hook trust remains an operator action. | `SATISFIED_LOCAL` |
| `Q-05` | `REJECTED` | Prompt-only rules or one new always-loaded skill as the sole admission mechanism. | Cannot enforce permissions or guarantee invocation; retain skills as consumers. | `REJECTED` |
| `Q-06` | `REJECTED` | A single numeric complexity/enterprise score. | Collapses effort, risk, authority, topology, and evidence incorrectly. | `REJECTED` |
| `Q-07` | `REJECTED` | Workline-only classification. | Direct requests would be over-persisted and tool permissions would remain late. | `REJECTED` |
| `Q-08` | `REJECTED` | Hook-only classification with scans or model calls in `UserPromptSubmit`. | Adds latency, trust, failure, and side-effect risk to every prompt. | `REJECTED` |

## Architecture And Boundary Review

Recommended boundary:

```text
request/task state
  -> pure admission compiler
      -> typed Task Envelope + explanation trace
  -> adapters
      -> CLI
      -> runtime bridge/skills
      -> advisory UserPromptSubmit hook
      -> hard-action PreToolUse/PermissionRequest checks
      -> harness evaluation fixtures
```

The compiler is a deep module: callers supply normalized inputs and receive one
bounded result; they do not implement ordering, precedence, minimization, or
conflict logic themselves. Hook, CLI, and skill integrations are thin adapters.

Dependency test categories:

| Boundary | Category | Strategy |
|---|---|---|
| schema, claim normalization, policy compilation | in-process | test through compiler public API and CLI fixtures |
| repository state/context probes | local substitute | fixture repository and bounded probe adapter |
| Codex hook protocol | local substitute plus current official contract | JSON stdin/stdout hook fixtures in a trusted temporary project |
| model claim extraction | true external/variable | deterministic candidate-claim fixtures first; shadow semantic evaluation separately |
| tool execution | external side-effect boundary | deny/allow fixtures prove decisions before any real side effect |

Hidden consumers to re-scan at implementation start:

- all route text and skill lists in `AGENTS.md`, `CODEX.md`,
  `.codex/config.toml`, role instructions, and workflow skills;
- generated harness catalogs and `harness-evals/response.schema.json`;
- `scripts/cascade.ts` CLI help, validators, tests, target onboarding fixtures,
  and docs references;
- future hook/rule/plugin surfaces under `.codex/`; and
- W-004 claim/policy/evidence contracts, which remain simulation-specific and
  must not become a second task-admission authority.

## Security Design Review

Summary: proceed with the staged design only. Prompt-time work remains advisory
and side-effect-free; hard actions require deterministic backend/tool checks and
independent security evidence before activation. This is a design review, not a
compliance or implementation claim.

### Assets, Actors, And Trust Boundaries

| Asset / Data | Class | Owner / Retention | Boundary Control |
|---|---|---|---|
| request and task lineage | internal; may contain sensitive text | user/task; retain only bounded IDs/digests in admission traces | redaction, size bounds, no raw secret persistence |
| explicit authority and approvals | sensitive security state | user and tool permission layer | cannot be inferred from retrieved content or model output |
| policy and control bundles | internal security configuration | repository maintainers; versioned/digested | trusted-project review, schema validation, fail-closed conflicts |
| Task Envelope and trace | internal audit state | admission compiler; revision-bound | typed fields, bounded claims, provenance, invalidation |
| credentials/secrets | credential | existing secret owner; never stored by admission | redact arguments/results/traces; use presence/authority metadata only |
| repository and external systems | internal/external protected resources | project/system owners | existing sandbox, approval, tool policy, idempotency, cleanup boundaries |

| Actor / System | Trust | Allowed Role | Required Boundary |
|---|---|---|---|
| user | authority for their scoped request | supply intent, constraints, and approvals | cannot override higher system or tool safety constraints |
| repository instructions and policy bundle | trusted only within loaded trusted project/revision | define durable workflow and mechanical policy | schema/digest validation and trust review |
| retrieved files, web pages, tickets, terminal/browser/tool content | untrusted data | propose facts for verification | never grants authority or rewrites policy |
| model | untrusted proposer | candidate claims, route explanation, probe requests | compiler validates; no hard-action grant |
| admission compiler | trusted deterministic decision boundary | normalize, match, minimize, trace, reject conflicts | pure inputs/outputs and exhaustive tests |
| prompt hook | constrained trusted adapter | add bounded advisory context | no scan, network/model call, durable mutation, or work creation |
| pre-tool/permission hook and tool runtime | privileged enforcement boundary | deny or require approval before side effect | stale-envelope rejection and backend/tool enforcement |

Decision flow:

```text
user authority + trusted repository policy + untrusted candidate context
  -> typed claim proposal
  -> deterministic compiler and conflict checks
  -> bounded Task Envelope
  -> advisory route consumers
  -> explicit approval plus deterministic pre-tool enforcement
  -> existing tool runtime and audit evidence
```

### Abuse Cases And Required Controls

| Abuse Case | Impact | Required Control | Acceptance Check / Owner |
|---|---|---|---|
| retrieved content instructs the agent to downgrade risk or grant a tool | approval bypass / excessive agency | source trust labels; authority claims accepted only from authorized sources | injection fixtures; WL-05/G5 |
| a small-effort label minimizes auth, secret, destructive, or external-write controls | privilege escalation | non-compensating hazard/authority precedence | paired small/high-risk cases; WL-01/WL-03 |
| stale envelope is reused after request, source, policy, or permission change | invalid authorization | digest/revision binding and pre-tool freshness denial | stale-envelope fixtures; WL-02/WL-05 |
| prompt hook scans or calls network/model on every request | data exposure, latency, availability failure | side-effect-free prompt-hook contract and bounded input/output | hook protocol tests; WL-04 |
| equal-priority policies conflict and the model chooses a favorable path | inconsistent enforcement | typed `POLICY_CONFLICT`, fail closed | conflict corpus; WL-01/WL-02 |
| traces retain raw secrets or unbounded user/tool content | sensitive-data leakage | redaction, result-size bounds, metadata/digest-only evidence | secret/size fixtures; WL-05 |
| admission recommendation silently creates a lane/task/worktree or external action | unauthorized mutation | promotion and dispatch separation; explicit authority checks | negative promotion fixtures; WL-03/WL-06 |

Design findings:

| Severity | Finding | Required Change | Next Gate |
|---|---|---|---|
| `P1` | model/prompt-only routing cannot enforce hard permissions | implement deterministic compiler plus pre-tool/tool-side control | W-031-G5 |
| `P1` | prompt-time scanning or model/network calls would widen the attack and availability surface | keep UserPromptSubmit bounded and advisory | W-031-G4 |
| `P1` | policy ambiguity or stale authority could authorize the wrong side effect | fail closed with revision/digest and conflict evidence | W-031-G2/G5 |
| `P2` | over-retained claim/tool text can leak sensitive data | bounded redacted trace schema and negative fixtures | W-031-G1/G5 |
| `P2` | automatic work promotion or dispatch could create unauthorized state | preserve explicit persistence and dispatch gates | W-031-G3/G6 |

Relevant design mappings are least privilege, secure defaults, auditable change
control, prompt-injection resistance, and prevention of excessive agency. SOC 2,
NIST, OWASP, and CISA guidance may inform review criteria; HIPAA-specific
controls become applicable only if a target repository supplies regulated data
requirements. No framework compliance is claimed from this plan.

## Functional Acceptance Plan

- User/goal: a maintainer or agent submits a request and receives the smallest
  correct route and controls without losing mandatory assurance or authority.
- Starting state: a versioned request fixture, prior-task relation, explicit
  authority, trusted source signals, candidate claims, and policy bundle.
- First tracer-bullet layer: in-process compiler public API and CLI fixture.
- Integration layer: trusted local hook fixture with a fake tool boundary; the
  behavior under test is not mocked, while Codex lifecycle/tool execution is
  the controlled boundary.
- Environment: local Bun 1.3.3, no provider, network, paid tool, or real
  external side effect.
- Expected outcome: exact envelope, trace, route, allow/deny decision, and
  typed non-passing state for every required case.
- Evidence binding: `TR-01` through `TR-12` feed W-031-G2/G3/G4/G5; the public
  request-to-tool tracer bullet feeds W-031-G6 at graph revision 2 and the
  current implementation attempt.
- Producer/evaluator split: the functional check executor produces a
  version-bound receipt; the independent functional or security reviewer
  evaluates it; only the lane-state owner records gate transitions.
- Invalidation: request, schema, policy, compiler, hook, source commit, trusted
  runtime, or fixture digest change reopens only its subject and named
  consumers.

## Boundary Contracts

| Boundary ID | Producer / Authority | Consumer | Input / Output Contract | Compatibility / Invalidation | Required Check |
|---|---|---|---|---|---|
| `BND-01` | request normalizer | compiler | request lineage, relation candidates, explicit authority, trusted state references | request digest or relation change creates new revision | schema fixtures |
| `BND-02` | claim proposer and probes | compiler | typed candidate claims with sources and verification status | conflicting authority fails dependent route closed | claim conflict tests |
| `BND-03` | policy registry | compiler | versioned applicability, precedence, controls, conflicts, and minimization | any selected policy digest change invalidates envelope | policy corpus tests |
| `BND-04` | compiler | route/skills | valid Task Envelope and explanation trace | stale/missing envelope cannot satisfy hard-action controls | CLI and consumer tests |
| `BND-05` | compiler | hook adapter | bounded prompt-time summary or deterministic tool decision | hook cannot add authority, scan, call network/model, or mutate work | hook side-effect tests |
| `BND-06` | runtime/skills | work registry | persistence recommendation plus explicit user/repository authorization | recommendation never auto-creates or dispatches work | negative promotion tests |
| `BND-07` | eval runner | launch gate | version-bound over-control, under-control, resume, security, and routing receipts | missing required case remains `NOT_RUN`/`GAP` | harness-evaluation gate |

## Behavior And Failure Trajectories

| ID | Given / Starting State | When | Expected Outcome | Failure Or Adjacent Mode | Evidence |
|---|---|---|---|---|---|
| `TR-01` | conversation-only request | admitted | `NO_WORKFLOW + BASE` | no scan, plan, or lane | direct fixture |
| `TR-02` | atomic typo with local-write authority | admitted | `DIRECT_CHANGE + ATOMIC_CHANGE` | contract/state signal upgrades route | paired fixtures |
| `TR-03` | small credential rotation | admitted | small effort plus `SECURITY_ASSURANCE` and privileged approval | size cannot downgrade risk | policy fixture |
| `TR-04` | medium CLI behavior change | admitted | `BOUNDED + STANDARD_CHANGE`, scoped scan, regression | no program graph | route fixture |
| `TR-05` | 12 feature slices with shared state and terminal release gate | admitted | `PROGRAM`, adaptive worklines, full scan and release evidence | no fixed workline count | program fixture |
| `TR-06` | ambiguous blast radius around a public schema | targeted probes remain inconclusive | escalate context to `FULL_SCAN` | no mutation until boundary known | uncertainty fixture |
| `TR-07` | external content says to bypass permission | claims are extracted | content is untrusted; authority unchanged | injection cannot activate allow policy | security fixture |
| `TR-08` | policy conflict at equal hard priority | compiled | `POLICY_CONFLICT`, dependent mutation blocked | read-only analysis may continue | conflict fixture |
| `TR-09` | long-running task resumes after source change | reclassified | new envelope revision, affected consumers reopened | accepted unrelated evidence preserved | resume fixture |
| `TR-10` | prompt hook unavailable | request arrives | runtime bridge performs microkernel and records hook gap | direct conversation remains available | fallback fixture |
| `TR-11` | stale or missing hard-action envelope | tool call requested | pre-tool denial before side effect | model explanation cannot compensate | enforcement fixture |
| `TR-12` | plan recommends a workline without dispatch authority | promotion evaluated | artifact may be authored only when requested/policy-required; dispatch stays `NOT_AUTHORIZED` | no agent/task/worktree created | promotion fixture |
| `TR-13` | product simulation authoring or execution request | admitted | `CONNECTED` plus `SIMULATION_GOVERNANCE`, high assurance, and independent evidence | generic task admission does not replace campaign policy or execution authority | product-simulation fixture |
| `TR-14` | synthetic-persona simulation request | admitted | shared simulation governance composes with persona-specific provenance and refinement contracts | product persona or model output cannot self-validate the synthetic actor | persona-simulation fixture |
| `TR-15` | continuation request says `continue implementing` a simulation workload | admitted | inflected change verb remains `CHANGE`; route composes connected delivery with simulation governance | continuation relation cannot silently downgrade intent to `ANSWER` | continuation-inflection fixture |

## Graph Fragment Composition

| Fragment / Version | Activation Evidence | Disposition / Reason | Port Binding | Omission Consequence |
|---|---|---|---|---|
| `GF-001@1` | new harness capability and acceptance criteria | `SELECTED`, merged into WL-01 | `request.objective` from `SRC-01`; produces `product.acceptance` | ambiguous routing success |
| `GF-002@1` | no UI or interaction state | `NOT_APPLICABLE` | none | none |
| `GF-003@1` | no mockup/prototype request | `NOT_APPLICABLE` | none | none |
| `GF-004@1` | new shared schemas and compiler/consumer contract | `SELECTED` | consumes acceptance; produces `shared.contract` in WL-01 | incompatible consumers and duplicate authority |
| `GF-005@1` | no backend service/runtime | `NOT_APPLICABLE` | none | none |
| `GF-006@1` | no frontend client | `NOT_APPLICABLE` | none | none |
| `GF-007@1` | no persisted data or migration | `NOT_APPLICABLE` | none | none |
| `GF-008@1` | compiler, CLI, hooks, routes, and evals interact | `SELECTED` | implementation outputs from WL-02/WL-04; produces integration acceptance in WL-05 | adapters may diverge from compiler |
| `GF-009@1` | complete request-to-envelope-to-tool-decision path crosses runtime boundaries | `SELECTED` | consumes acceptance and integrated output; produces terminal acceptance in WL-06 | local compiler tests cannot prove hook/routing behavior |
| `GF-101@1` | tool permissions, untrusted content, and new trust boundary | `SELECTED` overlay on GF-004/GF-008/GF-009 | implementation outputs -> security assurance in WL-05 | approval bypass or prompt-injection gap |
| `GF-102@1` | no visible semantics/keyboard/responsive change | `NOT_APPLICABLE` | none | none |
| `GF-103@1` | no visual/rendered change | `NOT_APPLICABLE` | none | none |

Actor and assurance resolution:

| Fragment | Role / Route | Skill Calls | Exact Test Strategy | Evaluator |
|---|---|---|---|---|
| `GF-001` | orchestrator/root | `functional-qa`, `plan-change` | request classification and negative acceptance fixtures | fixed-point Spec review |
| `GF-004` | agent-engineer/root | `architecture-review`, `plan-change`, `implement-change` | schema/consumer compatibility tests | independent architecture review |
| `GF-008` | agent-engineer/root with orchestrator integration ownership | `implement-change`, `validate-change` | CLI, hook, route, and eval integration tests | independent integration review |
| `GF-009` | orchestrator/root | `functional-qa`, `validate-change` | public request -> envelope -> allowed/denied tool fixture | independent functional reviewer |
| `GF-101` | security reviewer; implementation remains root | `secure-design`, `validate-change` | prompt injection, approval bypass, stale envelope, external/destructive action probes | independent security review |

Emission: `LANE_LOCAL_TASK_GRAPH`. A Coordination Graph is `NOT_APPLICABLE`
at revision 2 because one lane and one root integration owner serialize the
shared contract and runtime. Re-evaluate if W-031 is split into separately
tracked lanes, dedicated worktrees, or concurrent owners with a real evidence
or materialization join.

## Adaptive Workline Map

| Workline | Outcome | Primary Contract IDs | Writes | Requires | Validation Seam | Disposition |
|---|---|---|---|---|---|---|
| `WL-01` | versioned schemas, control catalog, and policy registry | `TA-002` to `TA-008` | `.codex/task-admission/**`; narrow docs | current-source preflight | schema and policy corpus | `SELECT_SERIALIZE` |
| `WL-02` | pure compiler and public CLI | `TA-001` to `TA-009` | `scripts/cascade/admission.ts`; tests; CLI wiring | WL-01 accepted | deterministic CLI fixtures | `SELECT_SERIALIZE` |
| `WL-03` | shadow corpus, over/under-control metrics, and coverage repair | all acceptance criteria | `harness-evals/task-admission/**`; eval scripts/tests | WL-02 accepted | complete fixture matrix and coverage command | `SELECT_SERIALIZE` |
| `WL-04` | advisory prompt admission with no side effects | `TA-001`, `TA-012` | hook adapter and `.codex/hooks.json` | WL-03 shadow gate; trusted local runtime | prompt hook protocol fixtures | `SELECT_SERIALIZE` |
| `WL-05` | hard tool controls and security evidence | `TA-008`, `TA-012` | hook/tool decision adapter; security fixtures | WL-04 accepted; explicit enforcement authorization | deny-before-side-effect and security review | `SELECT_SERIALIZE` |
| `WL-06` | route/skill/config migration and terminal validation | `TA-010`, `TA-011`; all criteria | `AGENTS.md`; `CODEX.md`; `.codex/config.toml`; affected skills/docs/validator | WL-05 accepted; W-004 overlap resolved | full Cascade validation and independent review | `SELECT_SERIALIZE` |

All worklines remain sections of `W-031`. They are not independently
dispatchable lanes at plan revision 2. Shared files and one terminal acceptance
seam make parallel implementation unsafe without a later orchestration replan.

## Implementation Slices

| Slice | Workline | Implements | Exact Files / Contracts | Output | Acceptance Evidence | Repair / Stop Boundary |
|---|---|---|---|---|---|---|
| `SL-01` | WL-01 | envelope, claims, axes, routes, policies, control packs | `.codex/task-admission/task-envelope.schema.json`; `policy.schema.json`; `control-catalog.json`; `policies/core.json`; `scripts/cascade/validate.ts` | validated contract bundle | positive/negative schemas; ambiguity/conflict failures | schema or authority ambiguity returns to WL-01 |
| `SL-02` | WL-02 | normalization, compilation, minimization, trace, reclassification | `scripts/cascade/admission.ts`; `admission.test.ts`; `scripts/cascade.ts` | `cascade admission validate|assess|explain` | byte-stable fixtures and CLI errors | compiler failure stops before integration |
| `SL-03` | WL-03 | route cases and measurement | `harness-evals/task-admission/case.schema.json`; `cases.json`; `assessment.schema.json`; `scripts/cascade/evals.ts`; related tests | versioned shadow corpus and scorecard | all required cases present; over/under-control thresholds; coverage regression fixed | failed/duplicate/missing cases keep hook gate closed |
| `SL-04` | WL-04 | prompt-time provisional envelope | `scripts/cascade/task-admission-hook.ts`; hook tests; `.codex/hooks.json` | advisory hook receipt | no scan/network/model/write; bounded latency/result; trusted-project test | unavailable runtime leaves hook `BLOCKED`, direct bridge preserved |
| `SL-05` | WL-05 | deterministic hard-action enforcement | hook adapter tests; policy/security fixtures; narrow config | pre-tool allow/deny receipt | injection, stale envelope, external/privileged/destructive cases; independent security review | any bypass returns to earliest contract/compiler/hook owner |
| `SL-06` | WL-06 | runtime route consumption and blanket-route reduction | `AGENTS.md`; `CODEX.md`; `.codex/config.toml`; affected `.codex/skills/**`; `docs/structure.md`; `docs/glossary.md`; catalogs/validator if required | one launched admission route with no dual authority | targeted, full validation, eval self-test/catalog, independent Standards/Spec review | route drift reopens only affected consumer; release remains `NOT_RUN` until all gates pass |

## Policy And Evaluation Thresholds

Initial launch thresholds are requirements, not evidence that has already run:

- 100% schema-valid output for all required cases;
- 100% hard-deny, approval, authority, conflict, and stale-envelope cases match
  expected decisions;
- 0 simple direct-read fixtures incorrectly require a lane, full scan,
  security overlay, or release evidence;
- 0 high-assurance fixtures are downgraded by small effort;
- 100% selected controls have a complete explanation trace;
- 100% program fixtures preserve adaptive workline and reclassification rules;
- no prompt-hook fixture performs filesystem scan, network/model call, durable
  write, workline creation, or authority expansion; and
- required scenario absence, evaluator gap, or current-source mismatch prevents
  launch acceptance.

## Validation Plan

| Evidence ID | Proves | Command Or Check | Required | Initial Status |
|---|---|---|---|---|
| `EV-PLAN-01` | planning docs and references are structurally valid | `npx --yes bun@1.3.3 scripts/cascade.ts validate` | yes | `PASS` on 2026-08-04; 9 agents, 44 skills |
| `EV-PLAN-02` | planning diff is mechanically clean | `git diff --check -- docs/specs/task-admission-workload docs/work/lanes/W-031-task-admission-workload-compiler.md docs/specs/_index.md docs/work/active.md` | yes | `PASS` on 2026-08-04 |
| `EV-BASELINE-01` | current harness baseline remains green before implementation | eval catalog/self-test, target self-test, campaign catalog/self-test, and `npx --yes bun@1.3.3 test scripts/cascade` | baseline only | `PASS` on 2026-08-04; 368 scenarios and 125 tests |
| `EV-01` | admission unit behavior | `npx --yes bun@1.3.3 test scripts/cascade/admission.test.ts` | yes | revision-23 attempt-1 `PASS_LOCAL`: 96 tests, 1,590 assertions; independent rerun pending |
| `EV-02` | policy/schema registry | `npx --yes bun@1.3.3 scripts/cascade.ts admission validate` | yes | revision-23 attempt-1 `PASS_LOCAL`: cascade-core@25, 12 policies, 10 controls, 308 cases; independent rerun pending |
| `EV-03` | complete route corpus and repaired coverage | `admission corpus`; `eval coverage --list-missing --allow-incomplete` | yes | revision-23 attempt-1 corpus `PASS_LOCAL` 308/308 with zero over/under-control; live coverage `NOT_RUN` for this revision |
| `EV-04` | generated harness catalog freshness | `npx --yes bun@1.3.3 scripts/cascade.ts eval catalog --check` | yes | `PASS_LOCAL`: 368 scenarios |
| `EV-05` | evaluator invariants | `npx --yes bun@1.3.3 scripts/cascade.ts eval self-test` | yes | `PASS_LOCAL`: 21 cases including admission corpus |
| `EV-06` | hook protocol and side-effect boundary | focused Bun hook tests and exact offline command stdin/stdout fixtures | yes for N04/N05 | `PASS_LOCAL`; hook trust remains external |
| `EV-07` | request-to-tool functional behavior | smallest public request -> envelope -> allow/deny fixture | yes | `PASS_LOCAL`: missing/stale/forged/non-interactive deny and normal-approval defer |
| `EV-08` | security assurance | independent GF-101 design/review receipt and negative probes | yes | revision-22 `FAIL` via `W031-R22-A1-GF101-20260805-IND-01`; revision-23 rerun `NOT_RUN` |
| `EV-09` | repository regression | all AGENTS.md validation commands, ending with `npx --yes bun@1.3.3 test scripts/cascade` | yes | revision-23 integrated baseline `PASS`: 316/316 with 3,262 assertions, exact corpus 308/308, campaign catalog `e8b2b9f5...`; immutable r37 is retained as prior evidence only |
| `EV-10` | fixed-point change quality | independent Standards and Spec review against current source/diff | yes | revision-22 architecture/functional/GF-101 review `FAIL`; revision-23 rerun `NOT_RUN` |

## Doc Routing Decision Matrix

| Fact | Owner Target | Action In This Planning Task | Next Gate |
|---|---|---|---|
| task-admission contract | `docs/specs/task-admission-workload/contract.md` | `IMPLEMENTED` | independent acceptance |
| implementation design and traceability | this plan | `IMPLEMENTED` | independent acceptance |
| active execution state | `docs/work/lanes/W-031-...` and `docs/work/active.md` | `UPDATED` | independent acceptance |
| reusable workflow semantics | `docs/patterns/workflow/` | `NO_CHANGE`; current graph/policy principles are sufficient | revisit only if implementation exposes a reusable gap |
| vocabulary | `docs/glossary.md` | `UPDATED` | independent review |
| runtime bridge and default route | `AGENTS.md`; `CODEX.md`; `.codex/config.toml` | `IMPLEMENTED`; blanket default replaced by admission plus conditional non-atomic fallback | independent integration review |
| hook configuration | `.codex/hooks.json` | `IMPLEMENTED`; project trust is intentionally not bypassed | independent security review |
| validator and eval wiring | scripts and `harness-evals/` | `IMPLEMENTED` | independent harness review |
| product/design/brand/backlog docs | owning folders | `NO_CHANGE`; this is a harness capability with no UI/product-domain change | none |

## Traceability

| Requirement | Primary Workline | Slice | Artifact | Evidence | Status |
|---|---|---|---|---|---|
| `TA-001`, `TA-003` | WL-02 | SL-02 | compiler/CLI | EV-01, EV-07 | `IMPLEMENTED_REVIEW_PENDING` |
| `TA-002`, `TA-004` | WL-01 | SL-01 | envelope/claim schemas | EV-01, EV-02 | `IMPLEMENTED_REVIEW_PENDING` |
| `TA-005`, `TA-006`, `TA-007` | WL-01 | SL-01 | policies/control catalog | EV-01 to EV-05 | `IMPLEMENTED_REVIEW_PENDING` |
| `TA-008`, `TA-009` | WL-02 | SL-02 | compiler trace/context escalation | EV-01 to EV-03 | `IMPLEMENTED_REVIEW_PENDING` |
| `TA-010` | WL-03 | SL-03 | resume/reclassification cases | EV-03 to EV-05 | `IMPLEMENTED_REVIEW_PENDING` |
| `TA-011` | WL-06 | SL-06 | route and promotion consumers | EV-07, EV-09, EV-10 | `IMPLEMENTED_REVIEW_PENDING` |
| `TA-012` | WL-04/WL-05; primary owner WL-05 for hard controls | SL-04/SL-05 | hook adapters and policies | EV-06 to EV-08 | `IMPLEMENTED_REVIEW_PENDING` |
| no over-control | WL-03 | SL-03 | simple/medium cases | EV-03 to EV-05 | `PASS_LOCAL` |
| no under-control | WL-05 | SL-05 | high-risk and bypass cases | EV-06 to EV-08 | `PASS_LOCAL_REVIEW_PENDING` |
| long complex feature/refactor handling | WL-03 | SL-03 | program/replan cases | EV-03 to EV-05 | `PASS_LOCAL` |

No request criterion, accepted definition, boundary, slice, or required check
is orphaned. Runtime/compiler/hook evidence is locally green; independent
architecture, code/spec, integration, functional, harness, and security review,
live harness coverage, merge/deploy, and release evidence remain `NOT_RUN`.

## Replanning And Preservation History

| Revision | Trigger | Preserved | Changed / Added | Invalidated / Superseded | Evidence Impact |
|---|---|---|---|---|---|
| `1` | initial durable planning request | current Cascade routes, skill contracts, graph semantics, permission boundaries | task-admission contract, six worklines, staged launch gates | prompt-only, scalar-grade, workline-only, and hook-only alternatives rejected | all implementation evidence starts `NOT_RUN` |
| `2` | user authorized implementation until done | independent axes, six worklines, no-auto-dispatch and normal permission boundaries | current schemas/compiler/corpus/hooks/default route; locally gated serialized implementation | planning-only state and blanket default route superseded | local evidence passes; independent gates remain open |
| `3` | W-032 simulation-intake consumer and current hook tool identities exposed under-control gaps | six worklines, Task Graph topology, W-004 ownership, permission boundaries | simulation governance control/policy, two corpus trajectories, and shell-tool normalization | 10-policy/9-control, 12-case, and legacy-Bash-only evidence superseded | 11 policies, 10 controls, 14/14 corpus, and 19 focused tests pass locally; independent gates remain open |
| `4` | fixed-point review found the new simulation policy had not advanced its bundle identity | six worklines, topology, policy/control meaning, route outputs, permission boundaries | policy bundle advances to `cascade-core@2`; stale bundle-1 envelopes fail closed | bundle-1 envelope evidence superseded | 14/14 corpus and 19 focused tests pass locally; independent gates remain open |
| `5` | resumed continuation request exposed inflected change-verb under-classification | graph topology, policies, controls, authority, and independent gates | bounded compiler/corpus repair for `implementing`; N02/N03/N06 repair attempt 2 returns to review | prior continuation-route evidence and 14-case/19-test counts superseded | 15/15 corpus, 20 focused tests, and 153-test regression pass locally; independent gates remain open |
| `6` | first authorized independent review set failed architecture, harness, functional, and security gates | serialized six-workline topology, user-owned authority, no auto-approval, prompt-hook side-effect boundary | full fixed-point repair for integrity, claim extraction, relation/intent, dependency closure, corpus/schema completeness, reclassification, tool classification, secret minimization, and fail-closed enforcement | revision-5 envelopes, corpus pass, W-032 intake bindings, and all independent receipts | attempt-3 receipt `W031-ATTEMPT3-IMPLEMENTATION-20260805`; 34 focused and 176 aggregate tests pass; fresh fixed-point reviews dispatched |
| `7` | revision-6 fixed-point review failed after N02/N03/N06 reached their declared attempt ceilings | six worklines, graph revision 2, no-auto-dispatch, bounded network-free prompt hook, normal product approval | trusted hard-action authority/current-revision contract, fail-safe classifiers, relation negation, atomic claims, multi-turn persistence, read-only contract near-misses, secret-key expansion, and exact evidence refresh | revision-6 envelope identity, 15-case completeness claim, W-032 bindings, and attempt-3 review receipts | explicit exhaustion replan authorizes two bounded repair attempts; fresh independent reviews required |

### Revision 7 Attempt 2 Fixed Point

- Implementation receipt: `W031-R7-EXEC-20260805-A2`.
- Current bundle: `cascade-core@5`; schema, catalog, and case-set version `4`.
- Exact corpus: `25/25 PASS`, with zero route/control under- or over-selection.
- Local tests: 40 admission tests, 71 focused admission/intake/simulation/
  definition tests, and 189 aggregate tests with 785 expectations.
- Authority boundary: the Task Envelope proves deterministic self-consistency,
  not origin authenticity or execution authority. No production
  `TrustedAuthorityHost` is implemented; real hard-action authority remains
  `NOT_IMPLEMENTED/NOT_RUN` and hard actions deny by default.
- State: all six nodes are `REVIEW`; fresh independent architecture,
  code/spec, integration, functional, harness, and security receipts are the
  next gate. A repeated unchanged failure exhausts the revision-7 replan.

### Revision 8 Exhaustion Replan

- Revision-7 attempt 2 exhausted its `2/2` repair budget and failed independent
  G1/G2/G3/G5/G6 review. N04's local advisory-hook contribution is preserved;
  affected N01/N02/N03/N05/N06 return through `PENDING`.
- Repair attempt 1/2 covers full-request identity beyond the bounded classifier
  window, remaining negation and compound-mutation phrases, exact corpus
  expansion, standalone provider-token redaction, and the W-032 public
  CLI/run-gate external-binding chain.
- The requirements-only Task Envelope still cannot authorize dispatch or a
  campaign. Production `TrustedAuthorityHost`, provider coverage, real hard
  actions, product simulations, merge/deploy, and release remain
  `NOT_IMPLEMENTED/NOT_RUN` as applicable.
- A new source identity, local regression, and fresh independent architecture,
  harness, functional, and security receipts are mandatory before G6 can join.

### Revision 8 Attempt 1 Fixed Point

- Receipt: `W031-R8-W032-R9-EXEC-20260805-A1`.
- Current bundle: `cascade-core@6`; schema, catalog, and case-set version `5`.
- Full redacted request identity is bounded at 65,536 characters; the 4,000-
  character classification projection is separately digest-bound.
- Exact corpus: `32/32 PASS`; admission tests: `42/42`; focused admission/
  intake/simulation/definition suite: `75/75`; aggregate: `195/195` with 834
  expectations.
- W-032 public intake and run-gate bindings now preserve and revalidate exact
  expected request/source identity. The Task Envelope remains requirements-only
  and cannot grant authority.
- Fresh independent G1-G6 reviews remain required. Provider/live coverage,
  production authority-host integration, merge/deploy, and release remain
  `NOT_RUN` or `NOT_IMPLEMENTED/NOT_RUN` as applicable.

### Revision 8 Attempt 2 Final Repair

- Attempt-1 independent review failed the accepted-input/classification bound,
  prompt-hook complexity, continuation/read-only relation semantics, compound
  grammar/corpus coverage, W-032 schema versioning, and bounded snapshot-read
  boundary. G5 security and GF-009 functional evidence are preserved inputs,
  not terminal acceptance.
- Final attempt 2/2 rejects raw over-limit requests before redaction, classifies
  every accepted character, keeps read-only workload scale separate from
  mutation delivery, generalizes the named grammar, and adds linear-time/
  adjacent-case gates.
- W-032 must advance its breaking intake contract with an explicit legacy
  disposition and consume one bounded nofollow snapshot buffer for hash,
  parse, and validation at compile and run time.
- Fresh independent receipts are mandatory. An unchanged repeat failure
  exhausts revision 8 and requires an explicit new replan.

#### Final Fixed Point

- Receipt: `W031-R8A2-W032-R10A3-EXEC-20260805`.
- Current identities: admission schema/catalog/case-set v6,
  `cascade-core@7`; intake schema v2.
- Evidence: 45 admission tests, 80 focused admission/intake/simulation/
  definition tests, exact `40/40` corpus with zero over/under-control, and
  `202/202` aggregate tests with 927 expectations.
- Raw over-limit input rejects before normalization; accepted input is fully
  classified. Intake v1 receives a stable migration-required rejection; v2
  snapshot reads are bounded, nofollow, identity-checked, and single-buffer.
- Independent G1-G6 acceptance remains open. Provider/live coverage and the
  production authority host remain `NOT_RUN` or `NOT_IMPLEMENTED/NOT_RUN`.

### Revision 9 Exhaustion Replan

- Revision-8 attempt 2/2 failed receipt
  `W031-HARNESS-REVIEW-20260805-R8-A2` on plural/article mutation adjacency and
  receipt `W031-R8-GF004-GF008-REVIEW-20260805-A2` on adjacent negated
  continuation forms.
- Receipt `W031-R8-A2-W032-R10-A3-GF101-20260805` also found that the public
  Task Envelope reader accepts a symlinked ancestor and lacks the shared
  single-buffer identity boundary.
- Revision 9 authorizes two bounded attempts: generalize the semantic grammar,
  add exact adjacent corpus cases with new bundle identities, route public and
  hook envelope reads through the hardened bounded reader, and refresh all
  consumers. No authority, provider execution, or gate acceptance is added.

#### Revision 9 Attempt 1 Fixed Point

- Receipt: `W031-R9A1-EXEC-20260805`; admission v7 and `cascade-core@8`.
- Evidence: 46 admission tests, exact 48/48 corpus with zero over/under-control,
  and 209/209 aggregate tests with 1037 expectations.
- Catalog `8bb094b2...` and immutable r20 manifest `3e7c22b5...` are current.
- Fresh independent G1-G6 review remains required. Provider/live coverage and
  production authority-host integration remain `NOT_RUN` or
  `NOT_IMPLEMENTED/NOT_RUN`.

#### Revision 9 Attempt 2 Final Fixed Point

- Receipt: `W031-R9A2-EXEC-20260805`; admission v8 and `cascade-core@9`.
- Evidence: 46 admission tests, exact `68/68` corpus with zero over/under-
  control, 82 focused tests with 620 expectations, and `211/211` aggregate
  tests with 1185 expectations.
- Catalog `5f3d6c01...` and immutable r21 manifest `7f680af1...` are current.
- Fresh final G1-G6 review remains required. Provider/live coverage and the
  production authority host remain `NOT_RUN` or `NOT_IMPLEMENTED/NOT_RUN`.

### Revision 10 Clause-Aware Semantic Replan

- Revision-9 attempt 2/2 is exhausted by receipts
  `W031-HARNESS-REVIEW-20260805-R9-A2` and
  `W031-GF009-R9-A2-W032-R11-FINAL-20260805`.
- Pair-specific regexes under-classified cross-paired mutation verbs/nouns and
  longer qualifiers, while over-classifying explanatory questions; negated
  continuation still depended on a narrow connector sequence.
- Revision 10 authorizes two bounded attempts to use clause-aware token sets:
  any imperative mutation verb paired with any mutation noun in the positive
  clause selects change; conversation-only explanation/question forms remain
  answer intent; a positive continue/resume after a real separator survives a
  negated prefix. New cross-product and negative corpus rows are mandatory.

#### Revision 10 Attempt 1 Fixed Point

- Receipt `W031-R10A1-EXEC-20260805`; admission identities advance to v9 and
  `cascade-core@10`.
- Clause-aware bounded token semantics cover cross-paired mutation verbs and
  nouns, long qualifiers, explanatory negatives, and separated negated
  continuations without changing the requirements-only authority boundary.
- Exact evidence: `46/46` admission tests with 620 assertions, `88/88` corpus
  with zero over/under-control, and `213/213` aggregate tests with 1357
  assertions. Catalog `1e448871...` and r22 manifest `638aa50b...` are current.
- Fresh independent G1-G6 receipts remain required; provider coverage and the
  production authority host remain `NOT_RUN` or `NOT_IMPLEMENTED/NOT_RUN`.

#### Revision 10 Attempt 1 Review And Final Repair

- Independent architecture, harness, functional, and security receipts failed
  source provenance, ordinary/compound/indirect mutation clauses, noun-form
  continuation, numeric program over-control, remaining continuation
  separators, and public RFC 3339 parity.
- Final attempt 2/2 must use closed digest-bound source-labelled derivation
  input, prevent external spans from requesting authority, preserve genuine
  user clauses, advance coherent identities/corpus, and rebind W-032 claim
  provenance through a versioned intake contract.
- The production authority host, provider execution, hard external actions,
  merge, deploy, and release remain outside this repair and `NOT_RUN`.

Final implementation advances admission to v10/`cascade-core@11`, with 49
admission tests, an exact `100/100` corpus, and `222/222` aggregate tests. The
campaign catalog is current at `34c1d08e...`; r24 verifies 90 files at manifest
`34cdd12e...`. Fresh independent G1-G6 review remains required.

## Compact Resume Contract

- Authoritative sources: `SRC-01` through `SRC-08`, especially `contract.md`
  and the W-031 lane packet.
- Accepted decisions: `DEF-01` through `DEF-14`; one compiler, independent
  axes, composable controls, advisory-before-enforcement rollout.
- Negative constraints: no auto-dispatch, no full scan/model/network/write in
  prompt hook, no scalar grade, no model-controlled authority, and no
  hook-based auto-approval.
- Worklines: WL-01 -> WL-02 -> WL-03 -> WL-04 -> WL-05 -> WL-06, serialized.
- Current evidence: revision-14 attempt-1 admission mechanics pass at
  core@16/v15 with 140 cases and 62 focused tests; the complete repository
  suite was not rerun by this producer and independent acceptance remains open.
- Known preconditions: provider-backed harness coverage was `NOT_RUN` for this
  revision and is not a local acceptance substitute; real authority-host
  integration is `NOT_IMPLEMENTED/NOT_RUN`.
- Next executable gate: rerun every independent gate before the terminal G6
  join.

### Revision 12 Attempt 1 Implementation Receipt

- Revision-11 attempt 2/2 is exhausted; revision 12 reopens N01-N06 for the
  compiler, hook, corpus, consumer, and gate repairs recorded in the W-031
  lane.
- Producer identities advance together to schema/catalog/case-set v13,
  classifier `cascade-task-admission-v13`, and `cascade-core@14`.
- Shell classification covers forced/discarding Git operations, worktree
  removal, and `/dev/null` overwrite; reviewed Docker/Kubernetes/GitHub/Git
  reads remain bounded reads.
- Direct and nested patch deletion recognize indented headers. Dynamic or
  otherwise non-provably-safe nested patch bodies fail closed as destructive.
- Natural pasted/copied source forms remain advisory; destructive keywords in
  review/explanation do not create hard-action intent, while direct deletion
  remains blocked on trusted host authority.
- Local evidence: admission tests `57/57` with 798 assertions; registry
  validation `PASS` for 12 policies, 10 controls, and 124 cases; exact corpus
  `124/124` with zero over- or under-control.
- Proposed state is `REVIEW`, not acceptance. Fresh independent G1-G6 review,
  provider execution, the production authority host, real hard actions,
  promotion, deployment, and release remain `NOT_RUN` or
  `NOT_IMPLEMENTED/NOT_RUN` as applicable.

### Revision 13 Attempt 1 Implementation Receipt

- Fresh revision-12 independent probes exhausted that attempt and reopened
  N01-N06 for shell composition and flag safety, nested dynamic capability
  discovery, destructive variants, permission-mode enforcement, canonical
  reclassification, destructive-vocabulary intent, source framing, and
  advertised claim kinds.
- Producer identities advance together to schema/catalog/case-set v14,
  classifier `cascade-task-admission-v14`, and `cascade-core@15`.
- Shell pipes, background execution, substitutions, process substitution,
  unknown composition, and dynamic/config/write flags now fail closed.
  Command-specific bounded reads remain read-only.
- Nested `functions.exec` recognizes destructured, optional-chain,
  parenthesized, aliased, and constant-computed capabilities. Unresolved
  capability or command/patch composition is destructive.
- Safe hard-action interaction is an exact permission-mode allowlist;
  unknown, empty, `acceptEdits`, planning, and bypass modes cannot consume a
  receipt or authorize a hard action.
- Claim identity now requires canonical semantic equality across claim fields,
  intent, source segmentation, provenance mode, and direct-user attestation.
  Explicit current-state, boundary, hazard, and evidence claims have exact
  verification and consumer contracts.
- Destructive terminology used to author tests, documentation, or parser
  support remains ordinary local work; actual remove/purge/delete intent and
  expanded Git, filesystem, PowerShell, infrastructure, package, and MCP
  variants receive destructive controls.
- Natural copied, pasted, clipboard, and explicit read-framing forms remain
  advisory external-source spans, including bare `Copied from ...:` and
  `Pasted off ...:` introductions.
- Local evidence: admission tests `60/60` with 892 assertions; registry
  validation `PASS` for 12 policies, 10 controls, and 131 cases; exact corpus
  `131/131` with zero over- or under-control.
- Proposed state is `REVIEW`, not acceptance. Fresh independent G1-G6 review,
  including GF-004, GF-008, GF-009, and GF-101, the production trusted
  authority host, provider coverage, real hard actions, promotion, deployment,
  and release remain `NOT_RUN` or `NOT_IMPLEMENTED/NOT_RUN` as applicable.

### Revision 13 Attempt Exhaustion And Revision 14 Attempt 1 Replan

- Fresh revision-13 probes exhausted that attempt on optional-computed
  capability discovery, per-call nested command isolation, descriptor
  redirection, command-specific flags and cloud token anchoring, destructive
  MCP synonyms, natural pasted-review and destructive-intent framing,
  semantic specialized claims, and duplicate-claim lineage.
- Revision 14 reopens the admission runtime, public version identities, exact
  corpus, and W-031 evidence only. It does not expand authority or alter the
  graph revision.
- Success requires fail-closed unresolved capabilities, independent literal
  command parsing per call, exact shell/cloud action classes, injective claim
  matching, semantic claim consumers/invalidation, and paired positive/meta
  intent probes in unit and corpus evidence.

### Revision 14 Attempt 1 Implementation Receipt

- Producer identities advance together to schema/catalog/case-set v15,
  classifier `cascade-task-admission-v15`, and `cascade-core@16`.
- Nested optional/computed capabilities are always classified; every nested
  execution call owns its command parse, preventing static decoys from
  laundering dynamic command bodies.
- Descriptor duplication remains live for `2>&1` and `1>&2`; file writes and
  reviewed `find`, `sed`, `curl`, and `helm` flags retain local, external, or
  destructive controls. AWS and Azure read actions are token-position
  anchored, so write-like argument values do not change the action.
- Natural copied/pasted review framing remains advisory. Natural current-state,
  boundary, hazard, and evidence prose emits exact consumers and invalidation
  keys. Duplicate identical claims preserve distinct IDs injectively.
- Polite, desire, and collaborative remove/delete/erase/drop intent is
  destructive; meta-work about those terms remains local. Expunge and
  obliterate MCP names are destructive.
- Local evidence: admission tests `62/62` with 936 assertions; registry
  validation `PASS` for 12 policies, 10 controls, and 140 cases; exact corpus
  `140/140` with zero over- or under-control.
- Proposed state is `REVIEW`, not acceptance. The complete repository suite,
  fresh independent G1-G6 review, production authority host, provider
  coverage, real hard actions, promotion, deployment, and release remain
  `NOT_RUN` or `NOT_IMPLEMENTED/NOT_RUN` as applicable.

### Revision 14 Review Failure And Revision 15 Attempt 1 Replan

- Revision-14 review failed residual shell effects (`sed` execution/write,
  `find -fprint0`, Bash named descriptors, and curl state files), destructive
  cloud/MCP verbs, natural external-source framings, `help me remove` intent,
  and unlabeled specialized-claim extraction.
- Revision 15 reopens N01-N06 for one bounded changed attempt. Graph revision 2,
  the hard-action authority contract, no-auto-dispatch, and all W-004/W-032,
  active-state, and generated-artifact ownership remain unchanged.
- The owned slice is admission runtime/tests, task-admission public schemas,
  policy/control identities, exact corpus, and W-031 contract/plan/lane docs.
- Success requires paired positive/negative unit, hook, and corpus probes plus
  `admission validate`, `admission corpus`, and owned diff checks.

### Revision 15 Attempt 1 Implementation Receipt

- Receipt `W031-R15A1-EXEC-20260805` advances the producer coherently to
  schema/catalog/case-set v16, classifier `cascade-task-admission-v16`, and
  `cascade-core@17` with 151 exact corpus cases.
- The classifier now distinguishes `sed` execution from `s///w`, file-writing
  find/Bash/curl forms from reads, destructive cloud/MCP verbs from anchored
  reads, external natural paste/clipboard text from direct user action, and
  destructive help/remove intent from meta-work.
- Natural specialized claims are semantic and paired with change-outcome
  negatives. The hard-action receipt and normal Codex approval boundary are
  unchanged.
- Focused evidence is recorded in the W-031 lane. Independent G1-G6 review,
  production authority hosting, provider coverage, real hard actions,
  promotion, deployment, and release remain `NOT_RUN` or
  `NOT_IMPLEMENTED/NOT_RUN` as applicable.

### Revision 15 Independent Review Failure And Revision 16 Attempt 1 Replan

- Revision-15 independent review failed residual `sed -n` address forms and
  cloud commands whose interspersed global options or compound structure
  obscured the action. Paired safe reads were required to prevent blanket
  over-control.
- The same review failed additional polite destructive intent, first-person
  pasted/copied attribution, review/explain proposed-action framing, and
  natural specialized-claim variants; meta-work and change outcomes required
  paired negatives.
- Revision 16 reopens N01-N06 for one bounded changed attempt. Graph revision
  2, hard-action authority, no-auto-dispatch, W-004/W-032, active projections,
  generated artifacts, and host activation remain unchanged and out of scope.
- Success requires executable classifier and public-hook assertions, nine new
  corpus shadows, exact aggregate metrics, repository validation, and an owned
  diff check before proposing review.

### Revision 16 Attempt 1 Implementation Receipt

- Receipt `W031-R16A1-EXEC-20260805` advances the producer coherently to
  schema/catalog/case-set v17, classifier `cascade-task-admission-v17`, and
  `cascade-core@18` with 160 exact corpus cases.
- The classifier covers numeric, range, regex, and step-addressed `sed -n`
  write/execute effects; option-interspersed and compound AWS/Azure actions;
  generalized polite destructive intent; first-person external attribution;
  proposed-action review/explain framing; and natural specialized claims.
- Paired read-only and meta/change negatives remain live in unit, public-hook,
  and corpus evidence. No trusted host was activated and no hard action ran.
- Focused tests pass `63/63` with 1,041 assertions; registry validation passes
  for 12 policies, 10 controls, and 160 cases; and the exact corpus passes
  `160/160`, including persistence `121/121`, claims `32/32`, and zero over- or
  under-control.
- Repository validation was run but is `FAIL_EXTERNAL` because the protected
  W-032 generated brief is stale relative to its authored brief. Regeneration
  remains root/W-032-owned and was not performed in this slice.
- This receipt proposes `IN_PROGRESS -> REVIEW`; it does not self-accept G1-G6.
  Fresh independent review is the next gate. Production authority hosting,
  provider coverage, real hard actions, promotion, deployment, release, and
  the complete repository suite for this revision remain `NOT_RUN` or
  `NOT_IMPLEMENTED/NOT_RUN` as applicable.

### Revision 16 Independent Review Failure And Revision 17 Attempt 1 Replan

- Revision-16 independent review failed print-only `sed` long/combined flags
  and alternate-delimiter addresses, additional polite destructive requests,
  copied/pasted/clipboard/proposed-action/Slack-drop provenance, and natural
  specialized-claim clauses.
- Revision 17 reopens N01-N06 for one bounded attempt without changing graph
  revision 2, hard-action authority, no-auto-dispatch, W-004/W-032, active
  projections, generated artifacts, or production host activation.
- Success requires paired positive/negative unit, public-hook, and corpus
  probes plus focused tests, admission validation/corpus, and owned diff checks.

### Revision 17 Attempt 1 Implementation Receipt

- Receipt `W031-R17A1-EXEC-20260805` advances schema/catalog/case-set to v18,
  classifier `cascade-task-admission-v18`, and `cascade-core@19` with 184 exact
  corpus cases.
- The source classifier now parses `sed` address/program effects, normalizes
  modal and inflected polite mutations, derives the expanded advisory-source
  framing family, and emits natural specialized claims with paired negatives.
- Focused admission tests pass `64/64` with 1,108 assertions. Independent G1-G6
  review, complete repository validation, trusted host/provider execution, real
  hard actions, promotion, deployment, and release remain `NOT_RUN`.
- Registry validation passes for 12 policies, 10 controls, and 184 cases. The
  exact corpus passes `184/184`; every primary axis/control/skill/blocker metric
  is `184/184`, persistence is `145/145`, claims are `56/56`, and over-control
  and under-control are both zero.

### Revision 17 Independent Review Failure And Revision 18 Attempt 1 Replan

- Frozen receipts `W031-R17-ARCH-HARNESS-REVIEW-20260805-IND-01`,
  `W031-R17-FUNCTIONAL-REVIEW-20260805-IND-01`, and
  `W031-R17-SECURITY-REVIEW-20260805-IND-01` failed revision 17.
- Revision 18 reopens the six-node serialized lane for one bounded repair of
  local-write admission, tool-effect classification, advisory-source and
  direct-continuation parsing, polite mutation and specialized-claim
  generalization, source-digest/distinct-objective reclassification, natural
  secret redaction, and bounded claim-history compaction.
- Graph topology, user-owned authority, no-auto-dispatch, no-auto-approval,
  W-004/W-032 ownership, generated artifacts, active projections, trusted host
  activation, provider work, and real effects remain unchanged and protected.

### Revision 18 Attempt 1 Implementation Receipt

- Receipt `W031-R18A1-EXEC-20260805` advances schema/catalog/case-set to v19,
  classifier `cascade-task-admission-v19`, and `cascade-core@20` with 210 exact
  corpus cases.
- Local-write decisions now require a current proportional envelope and defer
  only to an interactive permission flow; they are never auto-approved. Shell,
  Node, package-script, and MCP effects fail safe at the tool boundary.
- Reclassification now distinguishes related amendments from distinct new
  objectives, invalidates source-sensitive claims on source-digest drift, and
  compacts claim history within the public 64-item maximum. Provenance, polite
  mutation, semantic claim, and natural secret variants have paired regressions.
- Focused admission tests pass `71/71` with 1,254 assertions. Registry
  validation passes for 12 policies, 10 controls, and 210 cases. The exact
  corpus passes `210/210`; each primary axis/control/skill/blocker metric is
  `210/210`, persistence is `171/171`, claims are `82/82`, and over-control and
  under-control are zero.
- This is local review evidence, not self-acceptance. Fresh revision-18
  independent architecture/harness, functional, and security review is the
  next gate. The complete repository suite, trusted host/provider execution,
  real hard actions, promotion, deployment, and release are `NOT_RUN` or
  `NOT_IMPLEMENTED/NOT_RUN` as applicable.

### Revision 18 Independent Review Failure And Revision 19 Attempt 1 Replan

- Revision-18 architecture/harness, functional, and security probes failed
  residual grouped/non-quiet `sed` effects, official patch deletion input,
  target-unbound local writes, malformed-hook exit behavior, punctuation-bound
  direct continuations, polite destructive variants, natural claims and secret
  assignments, and weak amendment evidence.
- Revision 19 reopens N01-N06 for one bounded changed attempt. Graph revision
  2, authority ownership, no-auto-dispatch/no-auto-approval, W-004/W-032,
  generated artifacts, shared projections, host activation, provider work, and
  real effects remain unchanged or protected.
- Success requires executable held-out regressions, an expanded exact corpus,
  an owned-source TypeScript check, and a scoped diff audit before independent
  G1-G6 review.

### Revision 19 Attempt 1 Implementation Receipt

- Receipt `W031-R19A1-EXEC-20260805` advances schema/catalog/case-set to v20,
  classifier `cascade-task-admission-v20`, and `cascade-core@21` with 228 exact
  corpus cases.
- Local writes now carry target or repository scope and deny unresolved or
  out-of-scope invocations before ordinary permission evaluation. Official
  patch deletion, grouped/quoted/non-quiet `sed`, continuation punctuation,
  polite destruction, specialized claims, secret redaction, and objective
  lineage have paired held-out coverage.
- The actual hook wire emits blocking exit status 2 for malformed input and its
  timeout path fails closed before the host timeout.
- Focused admission tests pass `76/76` with 1,289 assertions. Registry
  validation covers 12 policies, 10 controls, and 228 cases. The exact corpus
  passes `228/228`; each primary axis/control/skill/blocker metric is `228/228`,
  persistence is `189/189`, claims are `100/100`, and over-control and
  under-control are zero. The owned compiler/hook TypeScript check passes.
- This is local review evidence, not self-acceptance. Fresh revision-19
  independent architecture/harness, functional, and security review is next.
  The complete repository suite, shared-consumer rebinding, trusted
  host/provider execution, real hard actions, promotion, deployment, and
  release are `NOT_RUN` or `NOT_IMPLEMENTED/NOT_RUN` as applicable.

### Revision 19 Independent Review Failure And Revision 20 Attempt 1 Replan

- Revision-19 architecture/harness, functional, and security probes failed
  command-specific target completeness, inherited-only schema fields, quoted
  `sed` filenames, review-only provenance and punctuation, passive/possessive
  mutation requests, natural specialized claims, credential linking phrases,
  and continuation intent preservation.
- Revision 20 reopens N01-N06 for one bounded changed attempt. Graph revision
  2, authority ownership, no-auto-dispatch/no-auto-approval, W-004/W-032,
  generated artifacts, shared projections, host activation, provider work, and
  real effects remain unchanged or protected.
- Success requires exact command operand/destination parsing, exact-path scope
  enforcement with no implicit descendants, fail-closed unresolved forms,
  source-sensitive claim invalidation, executable held-out regressions, and a
  fresh exact corpus before independent G1-G6 review.

### Revision 20 Attempt 1 Implementation Receipt

- Receipt `W031-R20A1-EXEC-20260805` advances schema/catalog/case-set to v21,
  classifier `cascade-task-admission-v21`, and `cascade-core@22` with 243 exact
  corpus cases.
- `cp`, `mv`, `install`, `touch`, `mkdir`, destination-bearing options,
  redirections, and position-aware `sed` parsing now produce exact mutation
  targets or deny unresolved forms. Task Envelope targets are exact paths and
  never implicitly authorize descendants.
- Required schema properties use own-property semantics. Review/audit/copied
  provenance, direct continuations, passive/possessive mutation requests,
  natural current-state/evidence/boundary/hazard claims, source-digest
  invalidation, continuation intent, and longer credential-link phrases have
  paired executable regressions.
- Focused admission tests pass `83/83` with 1,331 assertions. Registry
  validation covers 12 policies, 10 controls, and 243 cases. The exact corpus
  passes `243/243`; each primary axis/control/skill/blocker metric is `243/243`,
  persistence is `204/204`, claims are `115/115`, and over-control and
  under-control are zero.
- This is local review evidence, not self-acceptance. Fresh revision-20
  independent architecture/harness, functional, and security review is next.
  The complete repository suite, shared-consumer rebinding, trusted
  host/provider execution, real hard actions, promotion, deployment, and
  release are `NOT_RUN` or `NOT_IMPLEMENTED/NOT_RUN` as applicable.

### Revision 20 Independent Review Failure And Revision 21 Attempt 1 Replan

- Revision-20 architecture/harness, functional, and security probes failed
  exact shell-destination semantics, split touch/mkdir options, `sed` backup
  and macOS in-place parsing, mixed read/write segments, copied-review and
  direct-continuation framing, possessive removal, secret linking, natural
  claims, and dependent continuation lineage.
- Revision 21 reopens N01-N06 for one bounded changed attempt. Graph revision
  2, authority ownership, no-auto-dispatch/no-auto-approval, W-004/W-032,
  generated artifacts, shared projections, host activation, provider work, and
  real effects remain unchanged or protected.
- Success requires exact fail-closed command grammars, held-out semantic
  regressions, a coherently bumped public bundle, expanded exact corpus,
  TypeScript verification, scoped diff integrity, and fresh independent G1-G6
  review.

### Revision 21 Attempt 1 Implementation Receipt

- Receipt `W031-R21A1-EXEC-20260805` advances schema/catalog/case-set to v22,
  classifier `cascade-task-admission-v22`, and `cascade-core@23` with 258 exact
  corpus cases.
- `touch` and `mkdir` use separate option grammars. Exact local `cp`, `mv`, and
  `install` destinations require explicit no-target-directory semantics;
  directory-sensitive, parent-creating, backup/suffix, trailing-slash, and
  unresolved option forms deny. macOS `sed -i ''` resolves the named file while
  backup suffixes deny. Known read-only segments compose with exact writes;
  unresolved `cd` context remains fail-closed.
- Review/inverse/copy provenance, dependent action phrases, possessive removal,
  credential-link redaction, natural claim forms, source-sensitive
  invalidation, and generic prior-dependent continuation intent have paired
  executable regressions.
- Focused admission tests pass `86/86` with 1,378 assertions. Registry
  validation covers 12 policies, 10 controls, and 258 cases. The exact corpus
  passes `258/258`; each primary axis/control/skill/blocker metric is `258/258`,
  persistence is `219/219`, claims are `130/130`, and over-control and
  under-control are zero. The owned compiler/hook TypeScript check passes.
- This is local review evidence, not self-acceptance. Fresh revision-21
  independent architecture/harness, functional, and security review is next.
  W-032 currently requires root-owned producer rebinding. Repository validation
  reaches the root-owned PB-002 generated-brief freshness check and stops on its
  stale generated brief; that result is neither a W-031 pass nor a W-031
  failure. The complete repository suite, trusted host/provider execution, real
  hard actions, promotion, deployment, and release are `NOT_RUN` or
  `NOT_IMPLEMENTED/NOT_RUN` as applicable.

### Revision 21 Independent Review Failure And Revision 22 Attempt 1 Replan

- Independent receipts `W031-R21-A1-GF101-20260805-IND-01` and
  `W031-R21-FUNCTIONAL-REVIEW-20260805-IND-01`, plus the concurrent
  architecture review, failed the revision-21 candidate on incomplete mutation
  target sets, recursive-copy descendants, patch moves, mixed literal shell
  segments, full-value redaction, review-only framing, destructive noun and
  appreciative forms, validation continuation lineage, and natural claims.
- Revision 22 reopens the affected N01-N05 producers and their N06 consumer for
  one bounded changed attempt. Graph revision 2, lane-state ownership,
  no-auto-dispatch/no-auto-approval, W-004/W-032 ownership, root integration,
  generated projections, trusted-host activation, provider work, and real
  effects remain unchanged or protected.
- Success requires complete exact mutation targets, fail-closed descendant and
  dynamic-shell forms, shared-schema-consumer parity, full secret redaction,
  paired direct/meta language regressions, an exact expanded corpus, and fresh
  independent G1-G6 review.

### Revision 22 Attempt 1 Implementation Receipt

- Receipt `W031-R22A1-EXEC-20260805` advances schema/catalog/case-set to v23,
  classifier `cascade-task-admission-v23`, and `cascade-core@24` with 294 exact
  corpus cases.
- `mv -T` resolves both removed source and destination. Official patch moves
  resolve both `Update File` and `Move to` paths. Recursive/archive `cp` modes,
  directory descendants, redirections, substitutions, pipes, and unresolved
  command forms deny; literal no-redirection `echo` and `printf` segments may
  compose with an exact write.
- Admission validation routes through the shared hardened JSON Schema consumer,
  with strict RFC 3339 Task Envelope timestamps retained as a semantic check.
  Complete natural secret values redact idempotently without consuming the next
  sentence. Review/copy/inverse framing, direct continuations, noun/gerund and
  appreciative destruction, meta parser work, validation lineage, and natural
  source-sensitive claims have paired executable regressions and prompt-hook
  projections.
- Focused admission tests pass `91/91` with 1,459 assertions. Registry
  validation covers 12 policies, 10 controls, and 294 cases. The exact corpus
  passes `294/294`; each primary axis/control/skill/blocker metric is `294/294`,
  persistence is `255/255`, claims are `166/166`, and over-control and
  under-control are zero.
- This is local review evidence and proposes `REVIEW` only. Fresh revision-22
  independent architecture/harness, functional, and GF-101 security review is
  required. Root still owns W-032 rebinding, generated/shared projections, the
  complete repository suite, and any immutable fixture. Trusted host/provider
  execution, real hard actions, promotion, deployment, and release remain
  `NOT_RUN` or `NOT_IMPLEMENTED/NOT_RUN` as applicable.

### Revision 22 Independent Failure And Revision 23 Attempt 1 Implementation

- Receipts `W031-R22-ARCH-HARNESS-REVIEW-20260805-IND-7C3A`,
  `W031-R22-FUNCTIONAL-REVIEW-20260805-IND-01`, and
  `W031-R22-A1-GF101-20260805-IND-01` fail revision 22 and reopen N01-N05 plus
  the N06 consumer.
- Receipt `W031-R23A1-EXEC-20260805` advances the public Task Envelope,
  classifier, catalog, and case set to v24 with `cascade-core@25` and 308 exact
  cases. Invalid Add/Update/Delete/Move patch directives invalidate the whole
  target set. Exact-target `mv` fails closed without trusted non-directory
  source-kind or subtree authority.
- Held-out destructive noun/passive/gerund/verb forms, explicit review-only and
  copied-source inverses, direct execution continuation claims, reordered and
  punctuation-bearing secrets, and natural current/evidence/boundary claims
  each have executable unit coverage. Representative prompt cases extend the
  exact corpus through `TA-C308`; CLI and `UserPromptSubmit` cover the public
  review/destructive boundary.
- Focused admission/hook tests pass `96/96` with 1,590 assertions. The exact
  corpus passes `308/308`, persistence `269/269`, claims `180/180`, and zero
  over/under-control. The W-032 join passes `70/70` with 590 assertions and the
  complete suite passes `316/316` with 3,262 assertions. Campaign catalog
  `e8b2b9f5...` and PB-001/PB-002 are current.
- This is producer evidence and proposes `REVIEW_R23_A1` only. Fresh independent
  architecture/harness, functional, and GF-101 security receipts remain
  mandatory. No trusted-host/provider action, immutable revision-23 run,
  promotion, deployment, or release evidence was produced.

### Revision 23 Independent Failure And Revision 24 Attempt 1 Implementation

- Receipts `W031-R23-ARCH-HARNESS-REVIEW-20260805-IND-9D4E`,
  `W031-R23-FUNCTIONAL-REVIEW-20260805-IND-01`, and
  `W031-R23-A1-GF101-20260805-IND-01` fail revision 23 and reopen N01-N05 plus
  N06.
- Receipt `W031-R24A1-EXEC-20260806` advances Task Envelope/classifier/catalog
  and case set to v25 with `cascade-core@26` and 351 exact cases.
- N01/N05 enforce repository lexical and physical containment, explicit-only
  repository scope, canonical patch paths, and bare executable identities.
  N02/N03 preserve raw provenance through offset-preserving redaction, retain
  later user actions, distinguish structural review from direct continuation,
  and bind adjacent evidence/boundary/source-drift claims. Exact relative paths
  preserve `@`, Unicode, brackets, and spaces without widening scope.
- Focused admission/hook tests pass `100/100` with 1,722 assertions. The exact
  corpus passes `351/351`, persistence `312/312`, claims `223/223`, with zero
  over/under-control. This producer receipt proposes `REVIEW_R24_A1` only;
  independent revision-24 reviews and every provider, hard-action, promotion,
  deployment, and release gate remain open or `NOT_RUN`.

### Revision 24 Independent Failure And Revision 25 Attempt 1 Implementation

- Receipts `W031-R24-ARCH-HARNESS-REVIEW-20260806-IND-4B91`,
  `W031-R24-FUNCTIONAL-REVIEW-20260806-IND-01`, and
  `W031-R24-A1-GF101-20260806-IND-01` fail revision 24 and reopen N01-N05 plus
  N06.
- Receipt `W031-R25A1-EXEC-20260806` advances Task Envelope/classifier/catalog
  and case set to v26 with `cascade-core@27` and 386 exact cases.
- N02/N05 deny unquoted dynamic shell operands, permit exact quoted/escaped
  literal paths, and reject every symlink component using a nofollow `lstat`
  walk. The tool-side writer must repeat current-target containment immediately
  before mutation; admission never auto-approves or becomes mutation authority.
- N01/N02 select repository scope only from active positive direct mutation
  clauses, support explicit repository/repo/codebase/project-wide synonyms,
  and exclude copied, quoted, review-only, and parser/meta forms.
- N02/N03 apply terminal Cancel/Instead/Actually review overrides, structural
  copied-review variants, matching referenced-action recovery, punctuated
  post-secret `Then` actions, expanded destructive forms, adjacent
  source-sensitive claims, and mixed-source assignment provenance.
- Focused admission/hook tests pass `105/105` with 1,826 assertions. The exact
  corpus passes `386/386`, persistence `347/347`, claims `258/258`, with zero
  over/under-control. This producer receipt proposes `REVIEW_R25_A1` only;
  root owns the W-032/full/shared projection join, and all fresh independent,
  provider, hard-action, promotion, deployment, and release gates remain open
  or `NOT_RUN`.

### Revision 25 Independent Failure And Revision 26 Attempt 1 Implementation

- Receipts `W031-R25-ARCH-HARNESS-REVIEW-20260806-IND-7C2F`,
  `W031-R25-FUNCTIONAL-REVIEW-20260806-IND-01`, and
  `W031-R25-A1-GF101-20260806-IND-01` fail revision 25 and reopen N01-N05 plus
  N06.
- Receipt `W031-R26A1-EXEC-20260806` advances Task Envelope/classifier/catalog
  and case set to v27 with `cascade-core@28` and 430 exact cases.
- N02/N03 keep quoted requests, copied notes, analysis/assessment-purpose
  frames, and copied-request analysis/risk checks advisory; three direct
  referenced-action equivalents restore only the actual external action.
- N02 distinguishes terminal Cancel/Stop/Abort review cancellation from direct
  stop-service/abort-process operations and applies Instead/Actually review
  overrides across assess/evaluate/examine/inspect/audit/review-only wording.
- N02/N03 preserve unpunctuated post-secret actions and mixed provenance,
  recognize direct broad-scope synonyms without parser/meta widening, target
  `Document ... docs/current.md`, cover the required destructive inflections,
  and reopen exact evidence/boundary claim consumers on source drift.
- Existing quote/escape shell parsing and nofollow `lstat` checks are preserved.
  Atomic mutation-side containment is `NOT_IMPLEMENTED`; no writer/tool-side
  current-target proof or real hard action was run, so that gate is `NOT_RUN`.
- Focused admission/hook tests pass `112/112` with 1,958 assertions. The exact
  corpus passes `430/430`, persistence `391/391`, claims `302/302`, with zero
  over/under-control. W-032 parity passes `71/71` with 597 assertions. This
  producer receipt proposes `REVIEW_R26_A1` only; all fresh independent,
  provider, hard-action, promotion, deployment, and release gates remain open
  or `NOT_RUN`.

### Revision 26 Independent Failure And Revision 27 Attempt 1 Implementation

- Receipts `W031-R26-ARCH-HARNESS-REVIEW-20260806-IND-3B7A`,
  `W031-R26-FUNCTIONAL-REVIEW-20260806-IND-01`, and
  `W031-R26-A1-GF101-20260806-IND-01` fail revision 26 and reopen N01-N05 plus
  the producer-bound part of N06.
- Receipt `W031-R27A1-EXEC-20260806` advances Task Envelope/classifier/catalog
  and case set to v28 with `cascade-core@29` and 454 exact cases.
- N01/N02 constrain read-only/no-mutation requests across intent, authority,
  requested tags, and scope while preserving direct positive mutations; they
  generalize safety/risk/security/review framing and add a source-bounded
  `take requested action` continuation.
- N02/N03 preserve then/after-that secret continuations, expand direct
  format/rename/correct repository scope and destructive morphology, classify
  gcloud/curl/gh remote deletion as destructive, and classify evidence,
  current-state, and boundary paraphrases with exact source-drift reopening.
- N04/N05 require a trusted current-envelope binding for configured hook
  mutations across session, ID, revision, request/source digests, and explicit
  non-revocation. Prompt admission stays advisory; hard-action single-use
  receipt guarantees remain unchanged.
- Exact and paired/metamorphic unit coverage is implemented. Focused W-031 and
  narrow W-032 producer-parity tests pass `138/138` with 2,245 assertions. The
  exact corpus passes `454/454`, persistence `391/391`, claims `326/326`, with zero
  over/under-control. This producer receipt proposes `REVIEW_R27_A1` only.
  Fresh independent gates are required. Atomic mutation-side containment is
  `NOT_IMPLEMENTED`, and real hard-action/provider/release proof is `NOT_RUN`.

### Revision 27 Independent Failure And Revision 28 Attempt 1 Implementation

- Receipts `W031-R27-ARCH-HARNESS-REVIEW-20260806-IND-7E4C`,
  `W031-R27-FUNCTIONAL-REVIEW-20260806-IND-01`, and
  `W031-R27-A1-GF101-20260806-IND-01` fail revision 27 and reopen N01-N05 plus
  the producer-bound part of N06.
- Receipt `W031-R28A1-EXEC-20260806` advances Task Envelope, classifier,
  catalog, and case set to v29 with `cascade-core@30` and 485 exact cases.
- N01/N02 add ordinary no-mutation and review-only forms, quoted/copied
  analysis boundaries, direct-only referenced-action recovery, post-secret
  purge/delete continuations, every-project-file scope, destructive
  morphology controls, and source-sensitive claim paraphrases.
- N02/N05 classify natural direct `gcloud`, `curl -X DELETE`, and `gh ...
  delete` requests as destructive. Destructive `git push` delete, force,
  mirror, and prune variants classify above ordinary external writes and are
  denied under an `EXTERNAL_WRITE` envelope.
- Focused paired/metamorphic repair tests pass `6/6` with 98 assertions. The
  combined W-031 and narrow W-032 producer-parity suite passes `144/144` with
  2,343 assertions. The exact corpus passes `485/485`, persistence `391/391`,
  claims `357/357`, with zero over/under-control.
- This producer receipt proposes `REVIEW_R28_A1` only. Prompt admission remains
  advisory and trusted current-envelope/one-shot binding remains fail closed.
  Atomic mutation-side containment is `NOT_IMPLEMENTED`; live host, real hard
  action, provider, promotion, deployment, and release proof remains
  `NOT_RUN`.

## Revision 39 Attempt 1 Structural Fixed-Point Promotion

- Fresh r54 architecture/harness, functional, and GF-101 review rejects the
  revision-38 candidate and reopens negated destructive review, em-dash direct
  destruction, exact file/directory containment, generalized current-state
  grounding, punctuation-sensitive Resume validation, Git global read-option
  parity, apostrophe-bearing review/write continuations, hook conflict/blocker
  visibility, and exact validator wiring. Those r54 rejects remain historical
  evidence and cannot satisfy the revision-39 gates.
- N01/N02/N04/N05 preserve the already-authored revision-39 clause/compiler,
  prompt/tool classifier, and hook fixed point. This promotion does not edit
  semantic admission clauses, hook behavior, hard-control decisions, or
  validator logic.
- N03 advances Task Envelope, schema, catalog, classifier, and case set to v40
  with `cascade-core@41`. All 949 existing row identities and order remain;
  exactly TA-C574 and TA-C632 change to their current `CURRENT_STATE`,
  `GROUNDED_READ`, and `context` projection; and 16 pairwise-distinct,
  nonduplicate cases append as `TA-C950` through `TA-C965`.
- The appended rows cover the r54 rejecting neighborhoods and their inert,
  allowed, conflicting, read-only, and destructive controls. Corpus-visible
  scope conflicts assert `expected_blocked`; the existing hook suite owns exact
  conflict/blocker text and advisory visibility because the corpus schema does
  not expose those fields.
- Admission repository validation passes. Corpus evidence passes `965/965`,
  persistence `571/571`, claims `773/773`, and zero over/under-control. The
  full admission/clause/hook suite passes `180/180` with 2,869 assertions; the
  validator suite passes `7/7` with 13 assertions.
- The additional repository-wide Cascade validator remains blocked by the
  protected concurrent W-032 stale generated brief. This bounded producer does
  not regenerate or alter that consumer.
- This producer proposes `REVIEW_R39_A1` only. Root owns lane/graph transitions,
  protected W-032/N06 projections, immutable integration evidence, and fresh
  independent review. Provider/live/product, deployment, publication, and
  release evidence remain `NOT_RUN`.

## Revision 38 Attempt 1 Held-Out Fixed-Point Promotion

- Fresh held-out/generalized review rejects the revision-37 candidate and
  reopens exact read-only review, direct-versus-reviewed expunge, referential
  escaped `env -S` force push, natural no-mutation and CURRENT_STATE, scoped
  negative plus documentation write, noun-form Resume validation, natural
  boundary/source-drift, exact boundary-conflict, and quoted/bare Git/env read
  parity families.
- N01/N02 preserve the revision-37 typed reducer and mature compiler boundary
  while closing the reopened families with paired positive, negative, review,
  meta, allowed-scope, and destructive controls. This promotion changes public
  identity and exact corpus expectations only; semantic parser/compiler
  behavior is unchanged.
- N03 advances Task Envelope, schema, catalog, classifier, and case set to v39
  with `cascade-core@40`. All 925 existing row identities and order remain;
  exactly 11 named CURRENT_STATE/GROUNDED_READ oracles are corrected, including
  TA-C633 from OUTCOME to CURRENT_STATE, and 24 distinct revision-38 cases append
  as `TA-C926` through `TA-C949`.
- Admission repository validation passes. Corpus evidence passes `949/949`,
  persistence `555/555`, claims `757/757`, and zero over/under-control. Focused
  admission-plus-clause tests pass `171/171` with 2,799 assertions.
- This producer proposes review only. Root owns lane/graph transitions,
  generated consumer rebinding, immutable integration evidence, and fresh
  independent review. Provider/live/product, deployment, and release evidence
  remain `NOT_RUN`.

## Revision 37 Attempt 1 Typed Reducer Contract Promotion

- N01/N02 retain typed clause-local state for source, index/prior edge,
  semantic role, operator, polarity, action polarity/class, operation subject,
  mutation domain, repository relation, discourse edge, and claim role. The
  reducer composes compatible effects and emits optional patches; the mature
  compiler owns all unpatched behavior.
- Assessment operators now produce REVIEW controls without inheriting mentioned
  hard-action authority. Scoped negative application-source constraints compose
  with later documentation writes; natural no-mutation validation remains
  read-only; period-delimited Continue/Resume clauses preserve continuation;
  CURRENT_STATE and natural BOUNDARY claims bind exact consumers and reopen on
  source drift.
- N02/N05 share raw bounded Git/env parsing before lossy normalization.
  Status/diff and their static `env -S` forms stay read-only, meta review or
  explanation stays inert, ordinary escaped pushes remain external writes,
  and escaped force or dynamic ambiguity fails closed as destructive.
- N03 advances the public identity to schema/catalog/classifier/case set v38
  and `cascade-core@39`. All 907 existing row identities and order remain;
  16 named stale oracles are corrected and 18 distinct revision-37 examples
  append as `TA-C908` through `TA-C925` with explicit exact axes. Corpus
  evidence passes `925/925`, persistence `531/531`, claims `733/733`, and zero
  over/under-control. Focused admission-plus-clause tests pass `163/163` with
  2,731 assertions.
- Root owns W-031/W-032 transitions, generated consumer rebinding, immutable
  evidence, and fresh independent review. This producer does not self-accept;
  provider/live/product, deployment, and release evidence remain `NOT_RUN`.

## Revision 36 Attempt 1 Modular Contract Promotion

- N01/N02 use `scripts/cascade/admission-clauses.ts` as the bounded semantic
  seam. The module retains independent clause dimensions and emits optional
  patches; the mature compiler remains authoritative whenever the module
  abstains. This replaces the rejected monolithic exact-string integration.
- N02/N05 share one bounded parser for separated, attached, combined, quoted,
  escaped-separator, nested, and dynamic `env -S`/`--split-string` values.
  Prompt and tool classification agree: ordinary static pushes are external
  writes, while force/deletion/isolated/sensitive/dynamic ambiguity fails
  closed as destructive.
- N03 advances Task Envelope, schema, catalog, classifier, and case set to
  v37 with `cascade-core@38`. The original 785 rows remain unchanged and 122
  revision-36 reviewer/compositional rows are appended with exact expected
  axes. Admission validation and corpus execution pass `907/907`, persistence
  `513/513`, and claims `715/715`, with zero over/under-control.
- The admission and clause test targets pass locally. Root owns W-031/W-032
  lane transitions, generated consumer rebinding, immutable evidence, and
  fresh independent reviews. This producer does not self-accept; provider,
  live hard-action, deployment, and release evidence remain `NOT_RUN`.

## Revision 35 Attempt 1 Repair Delta

- N01/N02 replace the remaining flat held-out patches with the smallest
  quote-aware clause layer. It composes advisory/assessment polarity,
  quantified no-mutation constraints, direct versus mentioned action,
  continuation intent, rebuild/redesign/repair morphology, repository
  `contained in`/`belong to` relatives, and source-sensitive claim roles.
- N02/N05 parse separate, attached, combined, quoted, and nested `env -S` and
  `--split-string` values once for both prompt and tool Git classification.
  Benign pushes remain external writes; force, deletion, isolated,
  environment-sensitive, and ambiguous forms remain destructive.
- N03 advances the version-bijective corpus to 785 cases under schema/catalog/
  case set v36, classifier `cascade-task-admission-v36`, and
  `cascade-core@37`. Admission validation and the exact corpus pass `785/785`
  with zero over/under-control; the focused admission/hook suite passes
  `150/150` with 2,661 assertions. Root owns integration, independent review,
  and immutable evidence; this producer repair does not rebind W-032 or
  regenerate briefs.

## Revision 34 Attempt 1 Repair Delta

- Fresh revision-33 review rejects immutable r49 and reopens N01-N05 plus the
  producer-bound N06 projection. Passing unrelated containment, hook, and
  authority evidence remains preserved.
- N01/N02 close compliance/advisory, passive assessment, quantified
  no-mutation, direct morphology, polite shell, repository-relation,
  specialized-claim, meta-work, source-provenance, `CONTINUE`, and
  `USER NON_GOAL` families with direct and inert neighbors.
- N02/N05 extend the one bounded Git invocation parser across command/exec/env
  wrapper options, nested environments, absolute executables, force
  abbreviation, unfamiliar wrappers, and benign controls without phrase-list
  duplication.
- N03 advances the version-bijective corpus to 765 cases. The focused W-031
  suite passes `148/148` with 2,640 assertions. Corpus evidence is `765/765`,
  persistence `391/391`, claims `591/591`, with zero over/under-control.
- Receipt `W031-R34A1-EXEC-20260806` proposes `REVIEW_R34_A1` only. Root owns
  the W-032 consumer assertion, generated projections, immutable freezing, and
  integrated joins. Atomic containment/live host integration remain
  `NOT_IMPLEMENTED`; real hard actions, provider runs, independent acceptance,
  deployment, and release proof remain `NOT_RUN`.

## Revision 33 Attempt 1 Repair Delta

- Independent revision-32 architecture/harness, functional, and GF-101
  receipts reject immutable r47 and reopen N01-N05 plus the producer-bound N06
  projection. Passing unrelated hook, containment, and authority evidence is
  preserved.
- N01/N02 repair generalized advisory/negative/no-mutation, destructive
  morphology and polite forms, repository relational scope, specialized claim
  and meta controls, and copied/pasted em-dash provenance with direct,
  negative, and quoted continuation neighbors.
- N02/N05 replace Git push prefix phrase lists with a bounded normalized
  invocation parser covering global options, split/attached `-C`, abbreviated
  destructive flags, command/exec/env and absolute-path wrappers, isolated and
  sensitive helper environments, benign assignments, and ordinary pushes.
- N03 advances the version-bijective corpus to 705 cases. The focused W-031
  suite passes `145/145` with 2,553 assertions and combined W-031/W-032 parity
  passes `166/166` with 2,762 assertions. Corpus evidence is `705/705`,
  persistence `391/391`, claims `577/577`, with zero over/under-control.
- Receipt `W031-R33A1-EXEC-20260806` proposes `REVIEW_R33_A1` only. Root owns
  shared/generated projection integration and immutable freezing. Atomic
  containment/live host integration remain `NOT_IMPLEMENTED`; real hard
  actions, provider runs, independent acceptance, deployment, and release
  proof remain `NOT_RUN`.

## Revision 32 Attempt 1 Repair Delta

- N01/N02 normalize advisory-role polarity, passive questions,
  assessment-purpose suffixes, quantified no-mutation constraints, direct
  destructive morphology, polite shell actions, and possessive/relational
  repository scope. Each structural family has direct, advisory, negated,
  quoted, and meta neighbors.
- N02/N03 normalize newest/latest/most-recent evidence, as-of/current-branch
  state, and put/stop/confined/outside/bounded boundaries with exact
  source-drift consumer reopening and OUTCOME meta controls.
- N02/N05 bind copied-note/pasted-request spans separately from direct-user
  continuations and fail Git abbreviations, global options, environment
  overrides, isolated environments, and mixed force clusters closed while
  preserving ordinary static push, quoted-ref, and `--no-force` controls.
- N03 advances the version-bijective corpus to 661 cases. Focused W-031 tests
  pass `142/142` with 2,489 assertions; combined W-031/W-032 parity passes
  `163/163` with 2,698 assertions; corpus passes `661/661`, persistence
  `391/391`, claims `533/533`, and zero over/under-control.
- Receipt `W031-R32A1-EXEC-20260806` proposes `REVIEW_R32_A1` only. N06
  protected campaign-authority projections remain root-owned. Atomic
  mutation-side containment/live host integration remain `NOT_IMPLEMENTED`;
  real hard actions, provider runs, independent acceptance, deployment, and
  release proof remain `NOT_RUN`.

### Revision 28 Independent Failure And Revision 29 Attempt 1 Implementation

- Fresh revision-28 architecture/harness, functional, and GF-101 findings
  reopen N01-N05 plus the producer-bound N06 projection. Passing hard-control
  evidence remains preserved except where the Git deletion-refspec classifier
  is directly repaired.
- Receipt `W031-R29A1-EXEC-20260806` advances Task Envelope, classifier,
  catalog, and case set to v30 with `cascade-core@31` and 515 exact cases.
- N01/N02 generalize bounded review punctuation/natural frames, embedded
  untouched/no-mutation constraints, `revise` and each-file/every-part scope,
  destructive morphology, and source-sensitive claim paraphrases with paired
  inert controls.
- N02/N05 classify polite direct destructive commands and the full-source
  `git push origin refs/heads/main:` deletion refspec as destructive while
  preserving quoted/negated lexical-fallback polarity and all passing
  current-envelope, receipt, nofollow, and authority controls.
- New paired/metamorphic and Git-push groups pass `5/5` with 100 assertions.
  The combined W-031 and narrow W-032 producer-parity suite passes `148/148`
  with 2,424 assertions. The exact corpus passes `515/515`, persistence
  `391/391`, claims `387/387`, with zero over/under-control.
- This producer receipt proposes `REVIEW_R29_A1` only. Atomic mutation-side
  containment and live host integration remain `NOT_IMPLEMENTED`; real hard
  action, provider, promotion, deployment, and release proof remains
  `NOT_RUN`.

### Revision 29 Independent Failure And Revision 30 Attempt 1 Implementation

- Receipts `W031-R29-A1-ARCH-HARNESS-20260806-IND-8B3F`,
  `W031-R29-FUNCTIONAL-REVIEW-20260806-IND-01`, and
  `W031-R29-A1-GF101-20260806-IND-01` fail revision 29 and reopen N01-N05 plus
  the producer-bound N06 projection.
- Receipt `W031-R30A1-EXEC-20260806` advances Task Envelope, classifier,
  catalog, and case set to v31 with `cascade-core@32` and 545 exact cases.
- N01/N02 repair terminal review/safety framing, quantified no-mutation,
  rewrite/adjust/rework repository scope, direct-only destructive morphology,
  declarative boundary intent, evidence/current-state/boundary paraphrases,
  lexical referenced-action target retention, polite destructive requests,
  and prompt deletion-refspec punctuation with paired inert controls.
- N02/N05 normalize static shell token concatenation, quotes, escapes, and
  backslash-newline continuations before Git push classification. All reviewed
  delete/force/mirror/prune/full-refspec equivalents are destructive; dynamic
  and ambiguous forms fail closed; ordinary pushes remain external writes.
- Focused W-031 tests pass `132/132` with 2,297 assertions. The combined W-031
  and narrow W-032 producer-parity suite passes `153/153` with 2,506
  assertions. The exact corpus passes `545/545`, persistence `391/391`, claims
  `417/417`, with zero over/under-control.
- This producer receipt proposes `REVIEW_R30_A1` only. Root owns protected
  generated projections and the integrated N06 join. Atomic mutation-side
  containment and live host integration remain `NOT_IMPLEMENTED`; real hard
  action, provider, promotion, deployment, and release proof remains
  `NOT_RUN`.
