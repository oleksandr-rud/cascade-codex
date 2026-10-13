---
name: spec-test-design
description: Design focused cases, fixtures, test levels and observable oracles from a specification, and plan a test or user-simulation campaign only when coordination is needed. Use for test specifications and testability gaps; does not execute tests or simulations.
---

# Specification Test Design

Turn a bounded behavior contract into falsifiable cases. Own case design and
evidence requirements; the parent owns behavior and acceptance. Work in the
user's language and retain exact contract identifiers. Do not implement tests,
run campaigns or build an operational world model through this skill.

## Bind the behavior

Read the supplied test-design brief and exact parent sections/contracts. Record
owner, revision/digest, behavior/scenario IDs, proposed or accepted status, scope
and exclusions. Reuse applicable existing tests, commands, fixtures and adapters.
An acceptance decision cannot be inferred from the existence of a specification.
Proposed behavior permits candidate cases; a native method requiring accepted
behavior must wait for that input. Context alone cannot replace the test subject.

## Select the enforcing boundary

Read [test-levels.md](references/test-levels.md). Interpret the risk with the LLM
and emit its failure/consequence, enforcing contract, selected level and reason.
Choose unit, contract/integration, E2E or goal-directed user simulation only when
it observes a distinct relevant failure. No level or case count is universal.
For non-software subjects use an observation, rehearsal or experiment when apt.

## Design the case and oracle

Use [case-contract.md](references/case-contract.md). Each case binds behavior,
scenario and enforcing contracts to a stable risk, fixture/environment, actor,
action, observable oracle, cleanup and execution reference. State what plausible
broken outcome the oracle rejects. Add timing control, independent connections,
failure injection or recovery evidence only when the failure requires it.

Separate deterministic assertions from meaning-dependent judgments. Use an LLM
judge with defined enums, source-bound claims and explicit uncertainty for the
latter; code parses declared output and validates formats, not narrative meaning.
A mocked call count cannot prove storage integrity, concurrency or user success.
Missing fixture, inaccessible observation or undefined expected behavior is an
owned testability gap: return it to the relevant spec decision.

Use S14 in the parent or its linked
[TEST template](../build-spec/assets/templates/TEST.md). Keep one owner for case
detail; references in the primary SPEC must point there without copying a second
normative case table. Use `specification-kit:spec-diagrams` for a focused trace or dependency view.
Record design review separately from execution; planned cases are `NOT_RUN`.

## Decide whether a campaign is needed

Emit `campaign: NOT_NEEDED | PLAN | UNRESOLVED`, reason, affected case IDs and
missing inputs. Read [campaign-handoffs.md](references/campaign-handoffs.md) only
for an actual coordination need. Plan case/variant membership, environments and
reset, dependencies, budgets, stop/recovery and evidence aggregation. Do not
dispatch actors or turn this candidate plan into native execution authority.

If configured through [policy bindings](../build-spec/references/policy-bindings.md),
select `cascade-quality:plan-quality` for unresolved quality scope or
`cascade-quality:design-tests` for accepted-behavior cases/native QA requests.
Select `cascade-simulations:manage-simulation-campaign` for an explicitly scoped
multi-case/multi-contour simulation plan. Its needed inputs can come from
`cascade-simulations:simulation-brief`, `cascade-simulations:simulation-outcome`,
`cascade-simulations:simulation-actor` and `cascade-simulations:simulation-persona`.
Preserve their native inputs, schemas, digests, adapter IDs and result statuses.
An unavailable selected dependency stays unresolved; independent cases continue.

## Review and return

Trace normal behavior and material denial/failure/recovery to their observable
results. Check case determinism, relevance, source version and unexplored risks
with the LLM; do not claim semantic coverage from links or a format checker.
Return the test design, selected levels, campaign disposition/plan, testability
gaps and actual review evidence. No authored case establishes application PASS.
