# Shared workflow and Quality routing

Implemented in the canonical Cascade checkout on 2026-10-06. The nine public
packages and 65 portable methods remain. Workflows is installed as
`1.0.1+codex.20261006.2`; the host now has ten local skills.

The new `run-workflow` adapter applies the common host cycle proportionally.
Workflows owns semantic selection and reusable recipes; the host owns current
artifact bindings, execution, observation control and acceptance. The new CLI
intake/accept-selection pair validates LLM-declared JSON and stamps only digest
fields. Prepared consumers receive exact versioned inputs from their explicit
producer edges, including when an older external artifact of the same type
exists. Missing, stale or duplicate bindings cannot be delivered.

## Evidence

- Repository validator: PASS, nine roles, ten local skills, no project leakage.
- Runtime safety suite: 100 PASS, zero failures; seven files.
- Existing harness self-test: PASS, 68 cases.
- Skill Creator's validation of `run-workflow`: PASS.
- Source/cache parity and native discovery: nine packages, 770 matching files,
  65 correctly namespaced enabled methods, no Cascade discovery errors.
  Native discovery also loads the enabled local `run-workflow` exactly once.
- Core runtime: intake/selection commands work without plugin source; the
  generated bundle remains under its existing ceiling at 103 files.

Four frozen Ukrainian route probes ran through the installed Quality package's
existing isolated, tool-free execution adapter using `gpt-6-astra/high`:

| Probe | Declared result |
|---|---|
| Quality for a frozen prompt and supplied cases | `cascade-quality:prompt-evaluation` |
| Evals for the same kind of subject | `cascade-quality:prompt-evaluation` |
| Quality plan from accepted behavior | `cascade-quality:plan-quality` |
| Quality with no subject/operation/context | BLOCKED, no routes, an actionable clarification |

Raw prompts, output JSON, usage and execution receipts remain under
`.artifacts/shared-workflow-20261006/live-probes/`. These are limited authored
route probes, not independent full agent qualification, every method's trigger
qualification or live execution of the four recipes. Those claims remain
NOT_RUN. Architecture inspection in the authoring context is self-review.

An existing out-of-scope violation was observed in the older
`run-quality-eval.mjs` `text_contract` path: it still uses required/forbidden
substring checks. The new routing path and these probes do not use it; this
change does not qualify that legacy path for semantic evaluation.

Before-slice copies remain under `.artifacts/shared-workflow-20261006/before/`.
No commit or push is part of this change. See the
[shared workflow guide](../../patterns/workflow/shared-workflow.md) and
[local adapter](../../../.codex/skills/run-workflow/SKILL.md).
