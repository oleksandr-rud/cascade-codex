# Synthesise Spec Evaluation Plan

Evaluate structure, behavior, and prompt quality separately. A passing file
check does not prove that a model will produce a useful specification.

## Ownership Boundary

- This package owns the subject prompt, fixtures, expected behavior, and
  semantic rubric.
- `cascade-prompt:prompt`, when installed, owns prompt composition and
  refinement.
- `cascade-simulations:prompt-evaluation`, when installed, owns controlled
  model execution, adapters, traces, judges, calibration, and evidence.
- The package must not copy either external skill or claim their execution
  results without an actual run receipt.

## Evaluation Levels

### Level 1 — Package Structure

Run:

```bash
python3 scripts/check_package.py
```

This checks required files, frontmatter, UI metadata, prompt variables and
states, template sections, fixture structure, and accidental dependency on
Cascade repository routes. It is deterministic and offline.

Grade a generated response against one packaged mechanical contract with:

```bash
python3 scripts/grade_output.py evals/evaluators/<case>.json <response>.md
```

The output reports `semantic_evaluation: NOT_RUN`; a mechanical pass is not a
semantic or human-usability verdict.

### Level 2 — Case Contract Review

Review every case in `evals/cases.json` against `evals/rubric.md`. Confirm that
the expected readiness, required content, forbidden behavior, question limit,
and evidence status are unambiguous before running a model.

### Level 3 — Controlled Prompt Evaluation

Import the cases into the task catalog owned by
`cascade-simulations:prompt-evaluation` or another evaluator with the same
separation of subject, target, evidence, and judges.

For each case, freeze:

- a relative-path manifest and aggregate digest for the complete skill tree;
- exact task/catalog entry, case, fixture, evaluator, and source-packet digests;
- assembled prompt, raw response, trace, standard error, and mechanical-grade
  digests;
- target provider, model, tier, parameters, and service/runtime identity;
- execution adapter, runner version, limits, start/end time, and attempt ID;
- outcome and trajectory judge profile IDs, versions, model identities, and
  calibration set version;
- immutable or content-addressed evidence locations outside the editable skill
  tree.

A mutable directory name, copied package path, or response file without these
identities is diagnostic evidence, not a certifiable run.

Do not modify the evaluator or rubric after observing a target response unless
the run is invalidated and repeated under a new version.

### Level 4 — Calibration And Regression

Before using the score as a release gate:

- label a representative set of strong, borderline, and failing responses;
- compare judge decisions with human labels;
- test adversarial source instructions, conflicts, missing decisions, and
  polished but unsupported output;
- record false accepts, false rejects, and disagreements;
- set thresholds from calibration rather than convenience.

One canary proves only that the path ran. It does not establish broad prompt or
model quality.

## Mechanical Checks

Apply only checks that do not require semantic judgment:

- response declares exactly one readiness state;
- `NEEDS_INPUT` contains no more than three questions and no polished final
  spec; it uses one H1 title plus only the gated H2 headings and stays within
  1,200 words;
- `BLOCKED` names the missing or conflicting authority and uses one H1 title
  plus only its four gated H2 headings;
- a ready feature/change spec contains Readiness, At A Glance, Product And
  Change, Expected Outputs, User Journeys, Acceptance And Evidence, Open
  Decisions And Risks, and Next Owner Or Action;
- a ready task slice instead contains Readiness, Parent Product And Change,
  Outcome, Expected Output, Scope, Implementation Contract, Invariants And
  Integration Impact, Acceptance, Validation Plan, Open Decisions And Risks,
  and Next Owner Or Action, remains within 1,200 words, keeps Acceptance as
  the canonical scenario detail, and does not reproduce the feature-spec core;
- compact ready output contains exact Sources And References but does not need
  a ledger or manifest;
- standard and cross-boundary ready output contains Source Ledger, Artifact
  Manifest, Component Responsibilities, and Integrations when material;
- every source row keeps behavior time, authority, and evidence separate;
- `READY_FOR_IMPLEMENTATION` contains no material open decision marked as
  blocking implementation;
- no unresolved `{{PLACEHOLDER}}`, template guidance, or private chain-of-thought;
- every included diagram states question, audience, scope, behavior time, and
  render/syntax evidence, and has a nearby text-equivalent marker or table;
- diagram count respects the case's `diagram_min` and `diagram_max` bounds;
- every material invariant maps enforcement, race/exception, recovery/repair,
  and acceptance evidence;
- every Markdown table is rectangular; task invariant rows keep change/no-change
  separate from the durable enforcement mechanism;
- every acceptance status uses an allowed evidence status;
- forbidden source instructions do not override the user request or output
  contract.

Mechanical eligibility is necessary but not sufficient.

## Semantic Evaluation

Use the anchored dimensions in `evals/rubric.md`:

- truth and source discipline;
- product and behavior completeness;
- integration and failure semantics;
- human readability and information design;
- diagram choice and accessibility;
- question restraint, artifact ownership, and traceability.

Require every critical dimension to meet its floor. Do not let a polished style
score compensate for fabricated facts or missing failure semantics.

## Suggested Campaign Matrix

| Lane | Purpose | Cases | Evidence |
|---|---|---|---|
| deterministic | package and output contract | all | checker and mechanical grades |
| direct skill-only | prove standalone behavior without a prompt plugin | all executable fixtures | raw skill invocation, response, mechanical grade |
| readiness | review-ready versus implementation-ready versus NEEDS_INPUT versus BLOCKED | complete, incomplete design, missing decision, unavailable authority | target responses and grades |
| fidelity | resist unsupported or malicious sources | conflict and adversarial | source ledger, rejected instruction, judge evidence |
| proportionality | avoid over-documenting small work | small task and no-integration | artifact decisions and output length |
| invariant | reject durable promises without enforcement | integration timeout and permanent uniqueness | invariant map and readiness judgment |
| integration | cover triggers, state, failure, and recovery | complete integration | contract table and semantic judgment |
| readability | serve product and technical readers | representative ready cases | outcome judge and human review |

Run more than one repetition for stochastic models before making a stability
claim.

At least one reviewer who did not author the response should answer these
human-use questions: can product find value and rules; can engineering identify
every trigger and owner; can QA derive negative and recovery checks; can
operations find reconciliation and support actions; and can each reader name
the next decision without reconstructing source files? Record answers and
disagreements rather than substituting a style score.

## Acceptance Contract

A candidate prompt is acceptable only when:

- all deterministic package checks pass;
- every target response is mechanically eligible;
- direct skill-only cases pass independently of optional prompt tooling;
- no response invents material product, design, integration, or evidence facts;
- the question-limit and readiness gates hold in every relevant case;
- all semantic dimensions score at least 3 of 4;
- the weighted semantic score is at least 0.80;
- outcome and trajectory judges both pass;
- calibration is current for any release-level claim.

If Level 3 or 4 has not run, report model-backed effectiveness and calibration
as `NOT_RUN`.
