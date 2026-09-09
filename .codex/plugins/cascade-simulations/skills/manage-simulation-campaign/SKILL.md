---
name: manage-simulation-campaign
description: Author or govern a versioned multi-case or multi-contour simulation campaign with explicit authority, fixed contracts, frozen evidence, and independent evaluation. Do not use for skill audits or a single bounded actor run.
---

# Manage Simulation Campaign

Design and govern a portable versioned campaign contract. The target host owns
its registry, schemas, runners, artifact paths, permissions, and acceptance;
Cascade Evals owns generic judges and semantic reduction.

## Route first

- For one bounded actor and one interface, use
  `cascade-simulations:simulate`.
- For campaign authoring, versioning, registration requests, multi-case or
  multi-contour governance, and aggregation, use this skill.
- For approved execution, use `$execute-simulation-campaign`.
- For a frozen run's independent semantic judgment, use
  `cascade-evals:simulation-evaluation`.
- For a canonical persona projection, use `cascade-personas:compile-persona`;
  for traceable quality-owned test design, use `cascade-qa:design-tests`.
  Neither dependency is required for campaigns that do not need that artifact.

## Campaign lifecycle

1. **Design**: state the decision, hypothesis, scope, subjects, contours, actor
   sources, fixed outcomes, prohibited shortcuts, budgets, and aggregation.
2. **Bind**: pin versions and digests for personas, briefs, adapters, tasks,
   policies, oracles, treatments, rubrics, models, and seeds.
3. **Preflight**: verify authority, environment, credentials without exposure,
   reset and isolation strategy, observability, failure policy, and artifact
   paths.
4. **Register**: validate the package and catalog before execution.
5. **Execute**: delegate approved runs to `$execute-simulation-campaign`; separate
   controller verification from outcome judgment.
6. **Freeze**: store immutable, identity-bound artifacts and distinguish
   authored cases from executed evidence.
7. **Evaluate**: delegate frozen semantic outcomes to
   `cascade-evals:simulation-evaluation`; preserve judge profile, rubric, labeled support,
   and receipt.
8. **Aggregate**: apply the predeclared reduction and report eligible,
   ineligible, failed, blocked, and unrun cases separately.

## Invariants

- A campaign record does not grant mutation or external-system authority.
- Do not change actor, task, outcome, policy, oracle, rubric, or judge mid-run.
- Dynamic adaptation may choose actions inside a fixed envelope; it may not
  rewrite success.
- Mocked, local, or historical artifacts never prove live provider or deployment
  behavior.
- Do not optimize to a target score by dropping valid hard cases or weakening a
  rubric.

Bind target-supplied schemas, catalog commands, and artifact policy; do not
invent a host registry or execute a target from this skill.

## Output

Return campaign identity, frozen inputs, execution/evaluation state, evidence
coverage, reduction, defects, and unproven claims. Create campaign artifacts only
for an explicitly authorized campaign.

## Proportional starter

The host's default `simulation init` renders only a bounded scenario, world,
task, policy, oracle, mechanical claim, and required product intake bindings.
Population, dataset, metric, treatment, calibration, and a design report are
opt-in through `--research`. Add these contracts when the declared claim needs
them; do not create synthetic calibration or release claims to fill a template.
