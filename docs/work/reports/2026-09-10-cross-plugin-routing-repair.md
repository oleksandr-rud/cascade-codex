# Cross-plugin prerequisite routing repair — 2026-09-10

## Scope and cause

The request-tracker pilot exposed a host routing omission: an implementation
request reached coding without resolving its software architecture through the
available owner. Its old evaluation covered the supplied R1–R4 rules, not
business-module derivation from the canonical architecture references. That
frozen run remains unchanged and cannot establish the missing architecture claim.

This repair audits all 14 Cascade packages and 63 capability routes against their current skills,
capability descriptors, host entrypoints, artifact handoffs, validators and
installed identities. It stays on `codex/autonomous-project-harness-eval`.

## Decisions and fixes

- `CODEX.md`, `plan-change`, `implement-change` and `validate-change` now carry
  unresolved decisions and applicable source rules from planning to code and
  verification. A new app without accepted architecture requires architecture
  work; one owner or an implementation verb does not settle that decision.
  Accepted designs and ordinary internal edits retain the short route.
- Orchestrator's skill map now includes software and AI architecture authoring,
  alongside its existing review routes. New trust boundaries route to secure
  design before implementation.
- Software architecture and its modular-monolith reference derive modules from
  cohesive business capabilities, concrete scenarios, lifecycle, invariants,
  transactions and data ownership. A noun, table or aggregate alone does not
  justify a module. Startup composes actual modules; shared technical code needs
  current consumers. No new BDD plugin, mandatory Gherkin packet or folder tree
  is introduced. Behavior examples inform domain decisions and acceptance checks.
  The pattern pack exposes the module-selection section before file structure;
  its actual context preview contains the business-boundary rules.
- Complete natural-language trigger clauses are quoted in YAML so internal
  commas do not become unrelated single-word triggers. Implementation exclusions
  apply to the work the method owns, preserving necessary prerequisite reviews.
- Descriptors distinguish required subjects from optional context. The small
  `consumes_any_of` addition supports methods that accept alternative subjects;
  a plan must select at least one available alternative. Existing ordered-edge,
  ownership, version, authority and missing-input checks remain enforced.
  Grounded briefs/proposals and accepted requirements, journeys or scenarios
  can supply supported inputs directly. Consumer maps may be derived during
  review instead of requiring a separate prior artifact. AI architecture packets
  flow to review and secure design without reauthoring a software architecture.
- Frozen prompts and persona projections can be consumed without scheduling
  their producers again. Installed dependencies and provenance are still checked.
- Software architecture produces the `architecture-candidate` consumed by review
  and security. AI persona requirements consume the `persona-projection` emitted
  by Personas, with purpose and payload validation retained by the method.
- The harness diagnostic runner enables the Code Mode reader required by current
  Codex. A missing reader is classified as an environment blocker. Deliberately
  tool-free inline evaluators retain their existing execution boundary.

Planning input sufficiency is not method execution or acceptance. Optional market
context does not permit invented market proof; optional calibration labels do
not establish calibration; optional closure assessments do not waive an accepted
quality gate. Those phase-specific skill and artifact rules remain authoritative.

## Audit across every package

| Package | Finding and disposition |
|---|---|
| Software Architect | Missing host prerequisite and role mapping; entity-first module language; producer/consumer type mismatch; review overrequired a separate consumer map. Repaired. |
| AI Architect | Missing host authoring route; fragmented exclusions; persona projection type mismatch. Repaired. |
| Coding Agent | Explicit maintenance request wrongly required a separate prior audit artifact. Audit is now optional context. |
| Coordinator | Prerequisite work could be suppressed by broad exclusions; complete trigger clause, reuse rules and alternative-input validation added. |
| Design | Reviews and new design modes overrequired brand, persona, existing design or design-system packets. Required subjects remain, context becomes conditional. |
| Evals | Evaluation design overrequired completed evidence; judge authoring overrequired labels; frozen prompt evaluation forced authoring. Repaired without changing execution or calibration gates. |
| Market | Naming and copy work overrequired product, market and persona packets despite a grounded brand brief. Context is conditional; proof rules remain. |
| Personas | Commas created topic-word triggers; canonical-only and projection-only evaluations incorrectly required both artifacts. Repaired. |
| Product | Defining behavior from accepted product evidence forced separate lifecycle, market and persona packets. Repaired; product decision authority remains. |
| Project Management | Fragmented triggers; work-item sources treated as cumulative requirements; closure always required a separate QA artifact. Repaired with alternative sources and applicable gate checks retained. |
| QA | Quality planning overrequired separate product/change packets. Supports accepted requirements, journeys, scenarios or behavior as well, and still rejects no subject. |
| Security | Implementation wording suppressed prerequisite review; feature and AI proposals overrequired separate software/product packets. Supported subject alternatives now preserve the original proposal. |
| Simulations | Consuming a frozen persona projection forced recompilation; review exclusion was fragmented. Repaired; runtime projection validation remains. |
| Prompt | No corresponding descriptor or prerequisite defect found in this audit. Existing authoring boundary and source requirements retained. |

## Validation and installation

The new planner regression suite first reproduced 24 failures against the prior
descriptors. It covers sufficient minimal inputs, missing required subjects,
alternative source types, supplied frozen artifacts, and explicit architecture
and persona handoffs with missing-edge and reversed-order negatives. The target
runtime bundle also exercises alternative inputs through its actual CLI.

The first independent fixed-diff review attempt timed out. A subsequent frozen
source-packet review found five remaining over-constrained subject modes. Their
repair also covered analogous architecture-review inputs. An independent review
of that follow-up returned no findings; it did not claim model-campaign or
installed-runtime acceptance.

| Check | Final result |
|---|---|
| Host runtime safety and planner/bundle regressions | PASS: 81 tests, 452 assertions; includes 40 focused planner tests. |
| Existing artifact validators across Personas, Product, Market, Design, QA, Security and Project Management | PASS: 148 tests; required evidence/acceptance guards retained. |
| Repository validator and harness diagnostic self-tests | PASS; 32 self-checks. |
| Current plugin evaluation manifests | PASS: all 7 owning manifests. |
| Live route selection | PASS: 18 cases covering all 14 packages; Sol/max, actual required skill reads and read-only traces. HX-077 uses the corrected design-only scenario. |
| Native installed-plugin planning smoke | Completed: architecture method selected and loaded; one cohesive requests/comments capability, startup, no speculative shared library. |
| Installed package parity | PASS: 14 packages, 610 files, 166 dependency bindings; 18 unrelated installed packages unchanged. |
| Independent source review | Five input-mode findings repaired; follow-up review returned no actionable findings. |

The route runs preceded the final descriptor follow-up; the corrected HX-077
ran against its isolated candidate. Every skill body actually loaded by those
18 cases is byte-identical to final source. Final descriptor and handoff behavior
is covered by the integrated 81-test run. The native smoke's captured authoring
skill body also matches final source. These distinctions avoid treating a package
version refresh as a new model run.
Model routing diagnostics use isolated read-only calls with Sol/max and no
plugin names in the new user prompts. Expected routes stay in evaluator context.
These are bounded routing checks, not full semantic qualification of every
plugin method or a second autonomous application build.

The first model attempt is retained as an interrupted diagnostic: its reader was
disabled, and the completed first case did not inspect source. It is not counted
as routing evidence. A later architecture case selected and loaded the correct
method but timed out looking for hypothetical-app facts in Cascade product docs.
Interaction diagnostics now stop at routing and keep target facts separate from
harness policy. The HX-077 design-only case initially expected the prompt adapter
as primary; the actual contracts route that mode through generic `evaluate`.
The original failure is retained and the corrected scenario is rerun separately.
The initial Personas artifact-guard invocation lacked
`pyyaml`; the correctly provisioned rerun passed without changing assertions.

Thirteen changed package identities were updated using native `codex plugin add`.
The changed packages use build suffix `+codex.20260910171300`:

| Package | Base version |
|---|---|
| AI Architect | 0.1.3 |
| Coding Agent | 0.2.2 |
| Coordinator | 0.2.0 |
| Design | 0.1.2 |
| Evals | 0.3.6 |
| Market | 0.2.1 |
| Personas | 0.1.21 |
| Product | 0.1.25 |
| Project Management | 0.1.1 |
| QA | 0.1.1 |
| Security | 0.1.1 |
| Simulations | 0.2.5 |
| Software Architect | 0.2.0 |

Prompt remains `0.7.3+codex.20260910122426`. Final source/cache hashes,
evaluation dependency bindings and unrelated plugin preservation passed.
Generic diagnostic traces remain under ignored `.artifacts/`; they are not
committed as reusable acceptance authority.

## Proof limits

No production deployment, external service behavior, human calibration or
all-method semantic acceptance follows from these checks. The previous generated
application has not been rewritten or retroactively judged against newly selected
references. The native CLI also reported shortened skill descriptions; the architecture
method remained visible and loaded. This diagnostic did not change unrelated
plugin enablement or claim that global context pressure was eliminated.
At that repair's completion, the branch had not been integrated into master.

## Subsequent master synchronization

The follow-up request to use Astra and check freshness found seven missing master
commits, including the existing Astra migration. Master advanced once more during
verification. Both `585a72b` and the latest observed `dec88f1` were merged into the
experimental branch, preserving the prerequisite/input repairs above. New primary,
role, plugin and evaluation invocations now default to `gpt-6-astra` / `high`.
Existing frozen evaluations retain their recorded models and evidence.

Both branches had independently allocated HX-072 through HX-089. Published master
case IDs remain intact; this branch's 18 prerequisite cases now use HX-092 through
HX-109 in the same order. Historical evidence above retains its original IDs and
source manifests. The architecture handoff case is now HX-106. The merged runner
retains role ownership checks, routing-only scope and environment-blocker handling;
one identical reader self-check was consolidated. No scenario or assertion was
dropped to resolve the collision.

Final integration checks passed: 81 runtime tests with 468 assertions, 37 harness
self-checks, 148 artifact tests and all seven package/manifest checks. All three
catalogs were regenerated; the harness catalog contains 180 scenarios. Fourteen
installed packages match 639 source files and 166 dependency bindings, with 18
unrelated installed packages preserved. Combined package versions use build stamp
`20260910172549`; Prompt retains the incoming master identity.

A fresh HX-106 invocation without a model or reasoning override selected the
`execution` default, Astra/high, loaded `plan-change` and returned the required
software-architecture handoff: routing eligibility PASS. Its frozen source files
match this merged implementation. The preceding HX-086 canary against the first
merge is retained separately. These checks do not rerun or semantically qualify
all prior plugin evaluations or the autonomous application build. Codex's local
configuration diagnostic confirmed Astra; its full doctor command reports a
noninteractive `TERM=dumb` terminal limitation, not a model configuration failure.

Evidence is under `.artifacts/astra-master-sync-20260910/` and
`.artifacts/harness-evals/astra-master-sync-20260910-v2/`. That synchronization
updated the experimental branch and installed packages; it did not push the
experiment into master.

## Authorized master publication preflight

The subsequent request explicitly authorized publication to master. A fresh fetch
found `d1da8c2`, which adds the Coordinator's serialized host handoff and Windows
evaluation runner fixes. The merge retains those changes, the prerequisite/input
repairs above and Astra/high defaults. Coordinator's combined source and installed
package identity is `0.2.2+codex.20260910182122`; all three catalogs were regenerated.

The incoming bundle test assumed that evaluating a supplied frozen prompt always
requires an authoring producer. The merged runtime correctly rejects a reversed
plan because its prompt artifact is unavailable. A frozen QA triage classified the
stale expectation as TEST_DRIFT after 40 independent planner tests and actual CLI
checks confirmed that a supplied prompt succeeds and a missing prompt fails. The
test-only repair checks the current rejection message and explicitly requires a
nonzero exit code; missing-edge and forbidden-dispatch assertions remain intact.

| Check | Publication preflight result |
|---|---|
| Integrated runtime safety and planner/bundle regressions | PASS: 81 tests, 472 assertions. |
| Repository validator and harness self-tests | PASS; 42 self-checks. |
| Plugin package/manifest checks | PASS: all 7 owning manifests. |
| Installed package parity | PASS: 14 packages, 639 files, 166 dependency bindings; 18 unrelated packages preserved. |
| Fresh Astra/high routing | PASS: HX-106 architecture prerequisite and HX-068 missing Coordinator inputs. |

The live cases use default model settings and the updated successful-source-read
checks. They preceded the final test assertion repair; their runtime, role and
skill sources are unchanged. These are scoped routing eligibility checks. Native
Windows execution, a new autonomous application build and all-method semantic
qualification were not run as part of this publication preflight.

Evidence is under `.artifacts/master-push-20260910/` and
`.artifacts/harness-evals/master-push-20260910/`. The triage artifact is
`defect-triage.json`, the public CLI receipt is `public-cli-receipt.json`, and the
final integrated test log is `runtime-tests-final.log` in the preflight directory.
