---
name: validate-change
description: Aggregate proportional evidence for a change and state exactly what passed, failed, was skipped, or remains unproven. Invalidate only evidence affected by the changed source or contract.
---

# Validate Change

Validation establishes the strongest claim supported by current evidence. It
does not expand authority, replace independent review, or turn historical
results into a pass.

## Build the evidence set

1. Bind the claim to the current branch or revision, changed files, scenario, and
   acceptance criteria.
2. Inspect the diff and determine which boundaries changed.
3. Run the cheapest deterministic checks that can falsify the change:
   formatting or schema checks, focused unit tests, type or build checks, and
   targeted functional checks as applicable.
4. Expand to broader repository checks only when the touched boundary or a
   failure justifies them.
5. Use live provider, browser, deployment, release, semantic judge, or
   source-exact visual evidence only when the claim requires it and the task
   authorizes it.
6. Re-run only evidence whose subject, fixture, rubric, model policy, or consumer
   changed. Preserve still-applicable frozen evidence.
7. Classify failures as product defect, test drift, environment or dependency
   issue, unrelated baseline failure, or insufficient evidence.

For a claim about architecture or reference use, verify the accepted business
examples, invariants, state owners and selected source rules against actual code
and checks. Folder names, installed plugins, read events and structural validator
passes are insufficient. Give independent evaluators the same applicable
reference versions and decision criteria; an omitted requirement remains outside
their demonstrated coverage. Do not impose an unselected default after a run.

## Evidence states

For UI work governed by an approved mockup, include matched reference/current
screenshots and the Visual QA fidelity disposition for affected viewports/states.
Build and functional passes do not establish visual parity. Unresolved visible
differences remain failures unless a governing authorized design change covers
them; absent rendered comparison remains unverified, never pixel-perfect.

For every required check, record one of:

- **PASS**: current evidence supports the scoped claim,
- **FAIL**: current evidence contradicts it,
- **BLOCKED**: the check cannot proceed without a named dependency or authority,
- **NOT_RUN**: the check was not executed,
- **NOT_APPLICABLE**: the evidence type is irrelevant to this claim.

A local or mocked pass is not provider, deployment, release, semantic, or
pixel-parity proof.

For harness behavior changes needing semantic evaluation, select permanent
cases by the affected risk. Generate additional cases from the accepted change
and actual failure boundaries only when the core lacks them. Give each one a
distinct risk, concrete input and expected route/status or handoff; freeze the
task draft with `cascade eval prepare --file <draft>` before running
`cascade eval run --suite <frozen-suite>`. Follow the host schema at
`harness-evals/task-suite.schema.json` when this optional evaluation lab exists.
Do not multiply every skill into a fixed case quota or make full catalog
coverage an ordinary completion gate. Use the same frozen cases and rubric for
a controlled comparison; any revision starts a new experiment. Keep temporary
cases out of the core, promote unique discovered regressions, and route their
cleanup proposal through closeout. No evaluation lab is required in a target
bundle that omits it.

## Durable work

If an existing lane or Coordination Graph is in scope, update only its affected
acceptance and evidence references after the checks complete. Ordinary bounded
validation does not create a lane, graph, spec, receipt, or report.

## Output

Return the validated claim, exact commands or observations, evidence states,
failures and ownership, residual risk, and next action. Declare completion only
when required criteria pass and no blocking work remains.
