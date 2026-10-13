# Autonomous project Harness evaluation — pilot plan

Status: **EXECUTED; ARCHITECTURE REFERENCE COVERAGE GAP**. The original design
inspected `bf40c48`; v3 froze repaired source `ad897e8`, and v4 froze `9f147c7`
on `codex/autonomous-project-harness-eval`. Both v4 builder turns completed.
Its original acceptance failed on a test assumption; a separately frozen oracle
correction passed on identical output, including two independent judges. This
plan preserves the experiment design; the [results and limits](2026-09-10-contract-necessity-and-native-admission.md)
distinguish those outcomes. The supplied references did not contain Cascade's
module/startup architecture standard, so conformance to it remains unproven.

The completed pilot was removed from the active checkout after the Harness
fixes reached master at `a1540b0`. This historical plan, results and frozen local
evidence remain available; disposable builder workspaces were moved to Trash.

## Question and pilot project

Can the installed Cascade harness independently plan, build, run, and modify a
small application while keeping its architecture proportionate and applying
the relevant reference material?

The proposed default is a separate request-tracking application with a UI,
durable storage, create/edit/status/filter flows, validation and error states.
Its public brief defines observable behavior and operating constraints without
prescribing the implementation. A second, prewritten requirement adds CSV
import/export after the first completed build; existing records must survive.
The project must start from a fresh checkout through documented commands and
run locally. External deployment is a separate scope.

## Execution and evidence

1. **Freeze inputs.** Pin the repository/runtime bundle, installed plugin file
   hashes, model and reasoning settings, dependency/runtime availability,
   public brief, references, hidden cases, budgets, and judge profiles. Give
   the builder the brief and permitted references. Keep private test cases,
   judge instructions, scores, previous attempts, and control outputs outside
   its filesystem access.
2. **Build autonomously.** Launch the installed target harness in a fresh
   writable project workspace. Let it choose its plan, architecture, applicable
   skills, implementation and repairs. Record every model/tool event, loaded
   source, command, dependency change, elapsed time and token usage. The
   controller enforces isolation and budgets; it supplies no implementation
   hints. Any human intervention is recorded and breaks the strict autonomy
   claim for that attempt.
3. **Freeze and run independent acceptance.** Preserve the first completed
   project snapshot. From a separate copy, install locked dependencies, build,
   start the app, execute public journeys and hidden edge cases, restart it,
   and verify persistence. Retain exit codes, API responses, browser evidence,
   and cleanup. Builder-written tests are supplemental evidence.
4. **Exercise a real change.** Supply the frozen follow-up requirement to the
   same builder with its own remaining budget. Freeze the revised output and
   rerun affected acceptance cases. Compare the necessary edits, regressions,
   added dependencies, and architecture changes with the first snapshot.
5. **Judge independently.** Use separate read-only invocations for product/code
   quality and execution/grounding. Give judges the relevant raw artifacts,
   not mechanical verdicts, peer judgments, expected answers, condition labels,
   or previous scores. Judges cannot repair the project. Every finding names
   a source or trace location, violated requirement, consequence, and a
   smaller viable alternative when alleging unnecessary complexity.

The pilot uses the Evals default `gpt-5.6-sol` with `max` reasoning for its
controlled profile. Testing the production Astra profile is a separately bound
condition. A proposed first-run envelope is 60 minutes end-to-end, including
acceptance and judges; its enforceable phase allocation is a preflight input,
not an execution promise. Timeout, interruption, unavailable prerequisites and
uncertain dispatch retain distinct terminal states. A retry is a new attempt.

## Acceptance and scoring

Functional, permission, evidence-integrity and cleanup checks precede semantic
acceptance. A project that does not build, run, preserve required data, or
satisfy critical acceptance cases cannot pass because its architecture scores
well. Hidden tests cover invalid inputs, empty/error states, persistence after
restart, and the declared change request without adding undisclosed features.

| Dimension | Required evidence |
|---|---|
| Scope and complexity | Each service, dependency, layer and abstraction has a present requirement or operational reason; identify unnecessary features and unreachable code. |
| Architecture | Trace actual UI/API/data boundaries, state ownership, failure handling and dependency direction; assess the follow-up change and its regressions. |
| Reference application | Map applicable reference requirement → design choice → code/test. A read event or citation alone is insufficient. An irrelevant example may correctly be omitted. |
| Harness efficiency | Measure context volume, repeated reads/plans, role and skill selection, unnecessary artifacts, tool calls, time and tokens. Separate generated files, dependencies and tests from handwritten product code. |
| Autonomy and recovery | Verify completion without human implementation help, appropriate bounded repairs, truthful terminal status, and preservation of unrelated files. |

Proposed scoring uses anchored integer ratings from 0 to 4: 0 contradicts the
contract, 1 is mostly unsound, 2 has material gaps, 3 is sound with minor gaps,
and 4 is complete and proportionate. Freeze dimension ownership and weights
before execution; every critical dimension must score at least 3. The host
validates complete responses, recomputes weighted scores, applies dimension
floors and verdict agreement, then uses the lowest required-judge score.
Human calibration is `NOT_RUN`; these initial thresholds are diagnostic.

Raw line, file, service or dependency counts are signals rather than automatic
defects. A complexity finding must show an avoidable cost while retaining the
required behavior. Reference coverage uses an applicability ledger, not a
requirement to load every packaged document.

## Attribution and repetitions

Start with one end-to-end pilot to verify the measurement path. To assess the
harness's contribution, run a paired control with the same model, brief,
references, tools, environment and budget, but without Cascade instructions
and orchestration. Identify and hold constant any unavoidable host defaults.
Use at least three independent paired runs before reporting repeatability;
report every failure and budget exhaustion in the requested denominator.
Three pairs remain exploratory and do not establish statistical confidence or
generalize beyond this project. Broader claims require different project types.

Repairs to the harness, reference pack, or rubric create a new frozen version.
Preserve original failed attempts and use a held-out variation for confirmation.
One observed target failure is not automatically a harness defect; distinguish
model behavior, environment failure, scenario ambiguity and repeatable routing
or context defects.

## Current implementation boundary and next slice

Existing [harness diagnostics](../../../harness-evals/README.md) and the
[agent canary](../../../product-evals/tasks/AGENT-CASCADE-HARNESS-CANARY.yaml)
are read-only. The agent contract explicitly requires read-only filesystem and
denied network access. The [direct-process adapter](../../../scripts/cascade/campaign/adapters/process.ts)
also denies network, so it cannot serve as an unchanged live model builder.
Changing a prompt or calling a read-only trace a successful build would not
close this gap.

The implemented slice is one bounded project-building execution
profile: a fresh writable target, model connectivity, controlled dependency
provisioning and localhost access, enforced denial of sealed evaluator inputs,
streamed evidence, process cleanup, and timeout/cancellation handling. Verify
those boundaries before the project run. Reuse existing execution and evidence
components; do not introduce a general benchmark framework for this pilot.

The public brief/reference pack, hidden checks and two judge profiles are
preserved in the [pilot source at `a1540b0`](https://github.com/oleksandr-rud/cascade-codex/tree/a1540b036f93e00f6962f7fcfa027353dc2b9f04/harness-evals/pilots/request-tracker-v1).
Product checks own application behavior;
Cascade Evals owns independent judging and reduction; simulation/controller
verification owns execution integrity. Generic route diagnostics do not become
product or architecture acceptance evidence.

Final phases: allowed/denied filesystem and network probes **PASS**; attempt v3
**TIMED_OUT**, with its prescribed acceptance and judgments **NOT_RUN**. Attempt
v4 completed both native turns within the revised phase budgets but retained an
original **FUNCTIONAL_OR_INTEGRITY_FAIL** from the unsupported search-on-input
test assumption. Corrected-oracle reevaluation of unchanged v4 snapshots passed
10 initial and 13 follow-up functional groups plus both independent judges;
the conservative reduced score is **0.85**. It completed 38 minutes 38 seconds
after the original v4 dispatch. This retrospective result does not rewrite the
original failure. Human calibration, paired controls and conformance to the
omitted architecture standard remain **NOT_RUN**; the manual source review found
the startup/module layout absent. The earlier controller and blocked native
attempts remain separate.
See [contract findings and native admission repair](2026-09-10-contract-necessity-and-native-admission.md)
for their evidence boundaries. Preserve reusable case/rubric sources; keep raw
runs under ignored artifact roots according to the chosen adapter contract.
