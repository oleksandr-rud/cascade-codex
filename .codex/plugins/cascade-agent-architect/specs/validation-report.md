# Historical Cascade AI Architect validation report

> This report records evidence for the superseded `cascade-ai-architect`
> package. Its paths, version, and installed identity are intentionally retained
> as historical evidence and do not validate `cascade-agent-architect`.

Date: 2026-08-08  
Source state: `INSTALLED_AND_DISCOVERED`  
Plugin version: `0.1.0+codex.20260808030000`

## Structural evidence

- Plugin manifest validator: `PASS`.
- Skill validators: `10/10 PASS`.
- Installed-plugin resolver: `16/16 PASS`; live Cascade Prompt dependency
  resolved `AVAILABLE` at version `0.6.0+codex.20260807184135`.
- Architecture validator: `17/17 PASS`; packaged packet `VALID`.
- Persona validator: `5/5 PASS`; packaged persona `PASS`.
- Evaluation pack: validator `PASS`; pack tests `8/8 PASS`; eligibility tests
  `9/9 PASS`. The second hardening pass adds one pack regression, so the
  current combined evaluation total is `18/18 PASS`.
- Improvement loop: `34/34 PASS`; reducer self-test `PASS`.

The 90 focused unit tests are additive across the five unit-test groups above.
Skill and
manifest validations are separate checks and are not counted as unit tests.

## Independent review and repair

An independent read-only review found five contract defects and one completion
gap. The source defects were repaired and reprobed:

1. Fail-open improvement evidence now fails closed through mandatory Draft
   2020-12 validation, exact canonical bindings, fixed thresholds and budgets,
   exact case coverage, positive usage, and adversarial regression tests.
2. The reducer now consumes the canonical evidence-bearing judge response,
   validates case/run/profile bindings and leakage fields, and requires distinct
   outcome and trajectory judge identities.
3. All 14 behavior blocks have closed meaningful schemas and cross-reference
   checks; replacing them with placeholders fails validation.
4. Eligibility returns `BLOCKED` for unavailable authority, dependencies, or
   required inputs and `INVALID` for executed mechanical-integrity failures.
   Semantic `FAIL` remains downstream.
5. This plugin makes a staging recommendation only. Production promotion is a
   separate explicit action by the target authority owner.

Post-repair independent probes reported: reducer `28/28`, architecture `12/12`,
eligibility `9/9`, and evaluation pack `8/8`, with all adversarial bypasses
returning non-accepting states.

A second hardening pass addressed the later trust-boundary findings:

1. Judge verdicts must agree with canonical scores, every run must remain under
   canonical per-case ceilings, aggregate usage must reconcile to run receipts,
   calibration uses a fixed `0.80` floor, and runtime bindings are recomputed
   from typed local evidence artifacts.
2. Mechanical eligibility full-validates the input and receipt schemas, requires
   an explicit confined evidence root, recomputes artifact digests, and binds
   canonical case, run, target, internal sources, external skills, and receipts.
   Assertion-only evidence is rejected.
3. Every retained agent must have non-empty capability, input, output, tool,
   skill, workflow, prompt, and evaluation contracts; agents must be role-backed
   and topology cardinality is enforced. Source identities require canonical
   SHA-256 digests.
4. External skill resolution follows the plugin manifest's declared skill root
   and rejects missing, malformed, absolute, escaping, unreadable, or
   non-directory roots and skill symlink escapes.

The clean post-hardening rerun is resolver `16/16`, architecture `17/17`, persona
`5/5`, evaluation `18/18`, and improvement `34/34`: `90/90 PASS`. The initial
reviewer's exact bypasses now return `INVALID` or `BLOCKED`, never eligible or
accepted-to-staging.

## Response-level forward probes

Five fresh read-only agents used source skills without editing files:

- Minimal support assistant: selected one semantic agent behind a deterministic
  workflow; kept sends and refunds unavailable; surfaced three runtime-binding
  gaps; the in-memory packet passed the packaged validator.
- Enterprise incident response: selected a manager plus permission-isolated SRE,
  Security, and recovery-evaluator specialists only where ownership and
  evaluation boundaries justified them; kept production execution behind an
  exact human-approval receipt; execution and semantic judgment remained
  `NOT_RUN`.
- Missing-authority growth request: returned `BLOCKED`, proposed no account
  actions, and asked three material questions covering scoped accounts/actions,
  the conversion oracle/budget/window, and human-confirmation rules.
- Improvement diagnosis: rejected the observed overfit, slower, safety-uncertain
  candidate; proposed one bounded prompt repair; left the new experiment
  `BLOCKED / NOT_RUN` until frozen bindings and calibrated evidence exist; never
  authorized promotion.
- Simulation persona: separated provided claims, inferences, and synthetic
  assumptions; modeled bounded dynamic trust and delay states; prohibited
  sensitive-attribute and unsupported-expertise inference.

These are forward-use observations, not frozen simulation-campaign acceptance.
Their raw responses belong to the invoking task, so this report records their
scope and conclusion without calling them immutable release evidence.

## Cross-plugin live smoke

Cascade Simulations ran `structured-invoice-v1` with the
`build-agent-prompts` source skill and `gpt-5.6-terra` as prompt and target
models. The wrapper resolved Cascade Prompt, produced a prompt, and the target
returned the exact expected three-key JSON object.

- Prompt builder: `EXECUTED`, controller verified.
- Target: `EXECUTED`, controller verified.
- Mechanical result: `MECHANICALLY_ELIGIBLE` with exact keys and values.
- Outcome judge: `NOT_RUN` because the task uses a deterministic oracle.
- Trajectory judge and acceptance: `NOT_RUN`.
- Provisional prompt-builder budget: `EXCEEDED` at 153,534 total input tokens
  and 5 command executions versus provisional limits of 120,000 and 4. Of that
  input, 130,560 tokens were cached and 22,974 were non-cached. This is a
  context/host-loading diagnostic, not a semantic rejection.

Evidence root:
`/Users/royrud1902/.codex/artifacts/cascade-ai-architect/prompt-wrapper-smoke/architecture-prompt-wrapper-terra-20260808`

## Installation and fresh-host discovery

`cascade-ai-architect@personal` was installed and enabled from the personal
marketplace. Source and installed cache matched. A new `codex exec` process
loaded `map-agent-capabilities` from the installed cache, followed its source
and conditional reference, selected one read-only assistant rather than an
unnecessary team, and returned `DISCOVERY_PASS`.

Evidence:
`/Users/royrud1902/.codex/artifacts/cascade-ai-architect/fresh-host-discovery-final-v2.md`

## Remaining effectiveness boundary

The compact bundled architecture corpus is an evaluation scaffold. Generic
live architecture execution, independent semantic judging, human calibration,
staging acceptance, production promotion, and release eligibility remain
`NOT_RUN`. The plugin is installed and structurally ready for use; it is not a
claim that every generated target architecture is effective or release-ready.
