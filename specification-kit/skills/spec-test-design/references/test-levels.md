# Select the smallest level that observes the failure

Levels protect different mechanisms. Do not repeat one oracle at every level or
require the complete stack for a reversible low-impact change. Read current tests
before proposing new ones. Preserve meaningful regression/boundary coverage.

| Level | Useful question | Required observation / limitation |
|---|---|---|
| Unit | Does a deterministic rule/calculation produce its declared result? | Inputs, boundary values and exact result; isolated mocks cannot prove wire or storage behavior |
| Contract | Does a boundary preserve its request/response, errors and compatibility? | Real serialization/validation and declared protocol; success schema alone cannot prove authorization |
| Integration | Does the actual API/database/provider boundary enforce the rule/effect? | Relevant real dependency or clearly scoped substitute; storage races need independent real transactions |
| E2E | Can a user complete the consequential journey across UI and backend? | Actual target, actor, states and durable result; browser clicks without an outcome oracle are insufficient |
| User simulation | Can an actor pursue a goal under varying context and recover from obstacles? | Actor knowledge/limits, goal/outcome, observation/action interface and run evidence; adaptive simulation is distinct from scripted E2E |
| Observation/rehearsal/experiment | Does a non-software process deliver its intended outcome? | Observable event/result, actor, conditions and measurement; do not force a software runner |

Example: a booking interval rule may need unit boundaries, a database-backed
conflicting-writer check and one browser recovery journey. They respectively
observe the rule, the enforcing storage mechanism and the user's recovery.
A user simulation is useful only if goal-directed choices expose a different
failure; it is not a mandatory fourth copy of those checks.

For permissions include a forbidden actor and prove no protected result or
mutation escaped. For concurrency coordinate independent connections and inspect
durable state after both finish. For an unknown network outcome distinguish commit
from acknowledgement. For async effects inspect delivery, recovery and duplicates.

Quality measurements need workload, environment, metric, threshold and duration
or sample rule. Separate a proposed target from measured evidence. Do not invent
probabilities, a test-count quota or a generic monitoring platform for completeness.
