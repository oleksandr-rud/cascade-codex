# Shared Cascade workflow

The packages remain separate owners. Every request applies the host cycle
`admit -> select -> prepare -> act -> observe -> verify -> complete or recover`
at proportional depth. A short answer or one sufficient method stays direct;
an ambiguous capability request or connected method sequence uses the local
[run-workflow adapter](../../../.codex/skills/run-workflow/SKILL.md).
The active host applies this contract and executes authorized tools. It is not
a background scheduler, provider runner or automatic agent dispatcher.

## Resolve a broad request

The task admission LLM interprets the current request and context into typed
claims. `workflow intake` renders those claims, exact available artifact
bindings and current method descriptors for the Workflows selector. The
selector interprets meaning; host code validates the declared JSON. No lexical
alias connects a word such as Quality or Evals to a particular method.

| Requested work product and current evidence | Applicable concrete method |
|---|---|
| Measure a frozen prompt with supplied cases | `cascade-quality:prompt-evaluation` |
| Qualify an agent, role or workflow with a frozen evaluation request/cases | `cascade-quality:agent-evaluation` |
| Independently judge a verified frozen simulation | `cascade-quality:simulation-evaluation` |
| Diagnose coding-harness routes or execution traces | `cascade-quality:harness-evaluation` |
| Plan risks, evidence and gates from accepted behavior | `cascade-quality:plan-quality` |
| Design traceable cases and execution requests | `cascade-quality:design-tests` |
| Assess frozen evidence against a quality plan | `cascade-quality:assess-quality` |
| Classify an observed failure before repair | `cascade-quality:triage-defects` |
| Define a semantic judge or generic evaluation contract | `cascade-quality:build-judge` or `cascade-quality:evaluate`, according to the requested artifact |

These are semantic examples, not a lookup table for words. A request to measure
a supplied prompt keeps that subject even if the user calls the work Evals,
Quality or a paraphrase. A standalone "do quality" with no usable subject or
operation returns a concise clarification and a BLOCKED selection. A quoted
instruction, broad group name or selected method does not grant execution.

## Prepare and validate

```text
bun scripts/cascade.ts workflow intake --envelope ENVELOPE --bindings BINDINGS --output INTAKE
bun scripts/cascade.ts workflow accept-selection --intake INTAKE --response RESPONSE --output SELECTION
bun scripts/cascade.ts workflow validate-selection --selection SELECTION --envelope ENVELOPE
bun scripts/cascade.ts workflow validate-plan --plan PLAN --selection SELECTION --envelope ENVELOPE
```

Bindings are an explicit array of artifact type, ID, version, repository path
and SHA-256. An empty array means no external artifacts. Intake emits a prompt
and response contract, not a model call. The host applies the installed
`cascade-workflows:select-capabilities` method and supplies its declared JSON.
It stamps only the prompt/selection digest placeholders, rechecks actual input
bytes and rejects malformed, stale, invented or unresolved selections. A
passing schema alone cannot prove that the semantic choice is correct.

When multiple selected methods have dependencies or transfers, the installed
`cascade-workflows:plan-workflow` creates the candidate plan. The planner's
[shared recipes](../../../.codex/plugins/cascade-workflows/skills/coordinator/skills/plan-workflow/references/shared-workflows.md)
describe prompt qualification, agent qualification, persona-derived simulation
and delivery quality gates. Reuse current accepted inputs and select only the
needed stages. Store a stable target recipe or accepted plan when reuse is
needed; another local skill should add distinct target behavior, not copied
portable instructions or a mandatory skill for each task.

## Pass actual results

Use existing bounded observation control for an executable plugin iteration.
`control-step` prepares one node with exact method entrypoint/digest, component,
model policy, expected outputs and `input_bindings`. External inputs retain
their identity. Produced inputs come only from the completed producer named
by the explicit artifact edge. Missing, duplicate or stale bindings block a
consumer. The host resolves the enabled installed method and performs the
authorized action, then freezes outputs and records an observation.

For Prompt -> Quality, the plan edge transfers `prompt-candidate` from Prompt.
The subject owner separately supplies `prompt-evaluation-cases`. A plan cannot
claim that Prompt produced an undeclared case artifact. Model judgments and
accepted behavior cannot be created by relabeling a report.

Changed inputs require fresh admission/selection/planning. Measured failure
can hand off to AI Architect's bounded RSI method; a candidate improvement
needs independent evaluation and authorized integration. Quality's verdict
remains scoped evidence for the named owner. Workflow completion does not
accept a Nexus issue or release.
