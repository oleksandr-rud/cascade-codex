# Cascade workflow control binding

Use this binding only when a validated Cascade plugin plan needs an observation
loop. A direct method or ordinary bounded implementation does not require it.
This is a host binding of the framework-neutral workflow, independent of
LangGraph. Preserve the accepted target's tools, budgets and authority.

## Ownership and entry

AI Architect defines agent behavior, state, triggers, recovery and stops.
`cascade-workflows:select-capabilities` selects methods from current claims;
`cascade-workflows:plan-workflow` orders that validated selection as one DAG.
The host retains artifact access, execution, authorization and persistence.
Dynamic discovery changes the next bounded plan; it does not mutate a running
plan, create workers or enlarge its own scope.

Bind the current Task Envelope, selection, candidate plan and catalog, plus
every domain input's type, identity, version, path and SHA-256. Declare numeric
decision, retry and wall-time limits before interpreting observations. Tool,
token, cost and delegation limits remain the accepted workflow/executor's
responsibility; these three limits do not measure them.

The wire contract is [cascade-control.schema.json](cascade-control.schema.json).
It defines state, input/output bindings, host observations and LLM decisions.

## Loop

1. The host records an observation against the current state digest. Code may
   record native cancellation or authority revocation directly. Free-text
   summaries do not establish completion, approval or trigger meaning.
2. The LLM emits one schema-conforming decision, bound to state and observation
   digests, with model identity, explicit uncertainty and a declared trigger.
   Never recover a decision from narrative or match words as a fallback.
3. Code validates the proposal and rechecks artifact bytes, dependencies,
   already consumed observations, output coverage, deadline and retry ceiling.
4. A permitted next step becomes `PREPARED`. The host separately authorizes and
   executes it through the existing execution surface, then records its outcome.
   Only one action is prepared at a time; an unknown attempt remains prepared
   while waiting and cannot silently be dispatched again.
5. Keep the full typed observation and decision in the revision history.
   Completion requires evidence for every selected node; it means ready for
   host acceptance, not an accepted tracker issue or product outcome.

The host CLI exposes `workflow control-init`, `control-intake` and `control-step`.
Intake supplies the LLM request; it does not call a model. Step consumes its
validated JSON. Outputs always retain `dispatch_authorized: false` and
`acceptance_authorized: false`. Persist only to an explicitly authorized output
path or tracker revision. A digest is an integrity binding, not authentication.

## Feedback and stops

`WAIT_INPUT` and `WAIT_AUTHORITY` expose readiness gaps without reissuing an
uncertain action. `REPLAN` ends the iteration; changed inputs, routes or goals
need fresh admission, selection and a new candidate plan with separately issued
limits. Do not reset a parent experiment or project budget between iterations.

`REQUEST_RSI` requires recorded node-failure evidence and `MEASURED_FAILURE`.
It returns a candidate-only handoff to
`cascade-ai-architect:run-improvement-cycle`; it does not execute optimization,
install a candidate or authorize promotion. Preserve the baseline plan, control
trace, model/tool identities and failed artifacts. See
[workflow-feedback.md](../../run-improvement-cycle/references/workflow-feedback.md).

Missing or unresolved interpretation stops as `BLOCKED`. Cancellation,
revocation, exhausted time/decisions/retries, an explicit stop, replanning and
RSI handoff have distinct terminal reasons. A completed provider turn is not a
workflow success oracle. Qualify semantic decisions separately through Evals;
schema and fixture checks alone cannot establish correct trigger selection.
