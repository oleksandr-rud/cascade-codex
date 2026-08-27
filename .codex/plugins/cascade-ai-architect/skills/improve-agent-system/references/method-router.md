# Method router

Select the smallest method justified by current evidence. Every method is a
candidate generator, not an acceptance authority.

| Method | Admit when | Required controls | Do not use when |
|---|---|---|---|
| `structured-expert-repair` | First attempt, or a clear prompt/contract defect | Cascade Prompt, localized mutation, fixed tests | Dependency unavailable |
| `textual-gradient-edit` | Failure localizes to one instruction, constraint, or output field | Critique trace cites the defect and edit | Evidence is only same-context self-critique |
| `instruction-demo-search` | Multiple prompt modules interact and enough build/validation examples exist | Fixed search budget; sealed cases hidden | Examples are scarce or contaminated |
| `trace-pareto-search` | Rich traces expose several objectives such as quality, cost, and latency | Pareto archive; explicit objective floors | One local edit remains untried |
| `reflexion-lesson` | An external outcome oracle grounds a reusable lesson | Versioned, scoped, expiring lesson | Reflection is unsupported by outcome evidence |
| `allowlisted-workflow-mutation` | Prompt methods failed and the workflow boundary is implicated | Isolated sandbox, mutation allowlist, rollback, architecture revalidation | Production target, open-ended code search, or missing allowlist |

Run `scripts/route_method.py` on a diagnostic record. The router uses this
priority:

1. Block if required evidence or the Cascade Prompt dependency is absent.
2. Admit workflow mutation only after prompt methods are recorded as failed and
   sandbox plus allowlist controls pass.
3. Prefer trace/Pareto search for trace-rich multi-objective failures.
4. Prefer instruction/demonstration search for interacting prompt modules with
   enough non-sealed examples.
5. Prefer textual-gradient editing for a localized defect with external
   evidence.
6. Otherwise start with structured expert repair.

Research-derived methods must record source, method version, applicability
hypothesis, mutation surface, and falsifier. Adding a source does not expand
tool permissions or candidate budgets.
