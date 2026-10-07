---
name: run-improvement-cycle
description: Run one bounded evidence-driven improvement cycle for a prompt, skill, agent or workflow from a measured failure and frozen baseline. Diagnose with an LLM, prepare one scoped candidate, compare matched independent evaluations and return a candidate decision; never self-promote or recursively expand work.
---

# Run Improvement Cycle

Use after a measured failure, repeated unresolved outcome or explicit experiment request.
Ordinary fixes within an accepted contract use the owning implementation/Prompt method.
This skill owns an improvement candidate, not installation, release or a universal lab.

1. Freeze the subject, baseline bytes/digest, measured failure evidence, intended behavior,
   mutation scope and a finite candidate/run/time budget. Preserve failed observations.
2. Have an LLM diagnose one causal boundary: prompt, context, role, admission, policy,
   workflow or adapter. Emit typed diagnosis, uncertainty and one falsifiable hypothesis.
   Code validates those fields; it never guesses causes or routes from words.
3. Prepare one candidate using the owning capability. For workflow changes preserve
   explicit observations, per-role context, Admission, host authority, limits and stop
   rules. Change the contract completely when the accepted hypothesis requires it.
4. Select the Quality subject adapter: cascade-quality:prompt-evaluation for prompt behavior,
   cascade-quality:agent-evaluation for agent/role/workflow behavior,
   cascade-quality:harness-evaluation for host routing.
   A simulation is used only when the hypothesis requires an actor/environment run.
5. Freeze matched model, environment, case IDs, judge profile and unseen regression cases
   before executing baseline/candidate comparisons. Keep judge context independent of
   candidate authorship. Use the accepted evaluation's proportional repetition budget.
6. Verify every receipt's actual bytes, subject digest and declared case/model/profile
   bindings. Reduce only typed independent outcomes. Missing/invalid evidence is
   UNRESOLVED; any regression rejects the candidate. A supported improvement returns
   CANDIDATE_READY, with promotion_authorized=false.
7. Stop at the frozen budget. A further cycle needs a fresh failure/hypothesis and host
   authorization; do not self-schedule, loop without bounds or enlarge the write scope.

Use [the reducer](scripts/reduce_cycle.py) for the declared frozen comparison:
python scripts/reduce_cycle.py PATH/cycle.json --receipt-schema RESOLVED_QUALITY_SCHEMA.
Resolve the exact enabled cascade-quality:evaluate schema and bind its canonical digest;
there is no bundled substitute. Every receipt includes the frozen case source as evidence.
The workflow REQUEST_RSI handoff supplies baseline/failure bindings, not write authority.
Accepted integration is a separate cascade-engineering:integrate-agent-assets operation.
Return diagnosis, candidate, matched receipt bindings, regressions, remaining uncertainty
and exact NOT_RUN phases. The old optimizer/method router and mandatory simulation path
are retired; improvement is a measured workflow using the subject's existing Quality gate.
