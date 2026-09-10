# Contract necessity and native admission

The useful boundary is a producer, a real consumer, and observable behavior on
invalid input. A document called a contract does not create a runtime guarantee.
This inspection covers the current host, plugin coordination, evidence reduction
and request-tracker pilot; it is not a claim that every packaged schema was
individually audited.

| Current contract | Producer and consumer | Decision |
| --- | --- | --- |
| Target API, persistence and startup behavior | Application implements it; another client and independent acceptance execute it | Keep a small public interface. The pilot's three argv arrays allow independent setup/build/start without prescribing a language or evaluating shell text. |
| Plugin capability and artifact formats | Plugin descriptors feed `plugin-workflow.ts`; typed artifacts feed their owning plugin/host validators | Keep the formats that cross actual owners. Read only the selected capability's dependencies. |
| Skill and role contracts | Task routing selects instructions consumed by the active agent | Keep short triggers, ownership and expected behavior. They do not require another agent, approval packet, spec or report for ordinary work. |
| Evaluation cases, rubrics and response schemas | Independent checks/judges produce evidence; Evals validates ratings and recomputes results | Keep them in the opt-in evaluation lab. Freeze before the attempt and keep hidden material unavailable to the builder. |
| Work graphs, campaign packets and closeout records | Real cross-owner coordination, registered campaigns or an explicitly registered closeout check | Conditional. The normal one-owner build does not need these records. |
| Trusted command-admission bindings and receipts | Guard consumer exists, but no production issuer/integration supplies the required binding | Remove this guard from default native hook wiring. Native Codex permissions and sandbox remain the execution authority. |

## Observed defect and change

On the failed `9b41001` baseline, `task-admission-hook.ts` created the per-session Task Envelope from the native
UserPromptSubmit event. PreToolUse then required a separate
`task_envelope_binding`. Its only production-source occurrence was the consumer
and check in that hook; no producer supplied it. The older admission plan also
records the production `TrustedAuthorityHost` as not implemented.

The isolated native pilot reproduced the consequence: repository reads combined
with a pipe and the admission CLI bootstrap were denied because the trusted
binding was absent. Known simple reads worked. The evaluator stopped this
attempt after repeated denials; no successful application build, acceptance or
semantic score is claimed. The compiled local-write guard additionally requires
an interactive approval mode, which makes it unsuitable as the default gate for
an already authorized autonomous run.

The core hooks now retain request classification, interruption cleanup and
optional closeout. PreToolUse and PermissionRequest are not registered. The
source validator rejects accidentally restoring those unsupported default
registrations. The unused authorization branches are removed from the native
hook, which also stops bundling their command parser into that entrypoint.
The standalone guard API and its synthetic safety tests are
unchanged; they establish no native host integration. This change deliberately
removes the extra Cascade permission gate and relies on Codex's actual permission
profile. It does not create a new authority bridge or issue approvals.

The original repairs were pushed to master at `9b41001`. This follow-up repair
and the pilot are isolated on `codex/autonomous-project-harness-eval`.

## Evidence boundary

- Preflight: public reads and project writes succeed; sealed/auth reads,
  writes outside the project, external HTTP and direct TCP are denied. A local
  server is reachable within its command namespace.
- Independent acceptance environment: internal Docker networking denies app
  egress; a fixed-destination relay exposes the app only on host loopback.
- Container plugin installation: 14 packages, 610 source/cache-equal files.
  Generated Python bytecode was excluded from the disposable marketplace.
- Initial controller attempt: `NOT_RUN`, because stdin was not forwarded to
  its probe. It was fixed in a new attempt; no model was called in that attempt.
- First native build attempt: operator-stopped after observed admission denials.
  Its partial trace has no completed-turn usage receipt; usage is unavailable,
  not zero. Application acceptance and independent judges were `NOT_RUN`.
- Final source validator: PASS. Runtime suite: 41 tests and 348 assertions
  PASS. The regenerated portable runtime contains 98 files and 14 plugin
  bindings; its payload is 28,358 bytes smaller than the failed baseline.
  Native attempt v3 used source `ad897e8`. Its routing hook produced a bounded envelope without blockers;
  ordinary commands and source writes now execute. Its isolated 14 Cascade
  packages again match all 610 source files. Its own tests, target validator and
  foreground restart smoke passed, but the turn exceeded the fixed 20-minute
  limit while preparing the handoff. The attempt remains TIMED_OUT with no
  completed-turn usage. Its prescribed independent acceptance and judgments are
  NOT_RUN. A separate post-timeout functional diagnosis must not replace this
  outcome. A fresh v4 attempt allocates 25 minutes to the initial build within
  the same 60-minute overall limit. Its setup also creates the empty native
  `.agents` directory and trusts only the known `/workspace` Git path, addressing
  the observed sandbox remount and Git ownership errors without changing
  filesystem or network permissions.

Exact controllers, source/image/plugin freezes and raw attempts stay under the
ignored `.artifacts/autonomous-project-pilot-*` roots. The reusable public
brief, references, follow-up, acceptance code and judge profiles are in
[`harness-evals/pilots/request-tracker-v1`](../../../harness-evals/pilots/request-tracker-v1/README.md).
Paired controls, human calibration and broad model/production claims remain
outside the demonstrated result.

## Generated application and architecture references

The preserved v3 and v4 sources have `src/server.js` and `src/store.js`. The server file
combines HTTP request handling, creation of the concrete store, environment
configuration, listening and signal handling. `store.js` contains validation and
durable writes, but there is no app-owned `startup` directory or concrete
`modules/requests` public entrypoint. This is a small application with a visible
data owner, not evidence of adopting Cascade's prescribed module layout.

The current [service API/worker default](../../patterns/architecture-defaults/service-api-worker.spec.md)
puts composition and lifecycle in `src/<app-name>/startup` and concrete domain
behavior behind a module public entrypoint under `src/<app-name>/modules`.
Its internal folders remain optional. Shared technical code belongs in `src/libs`
only when a stable mechanism has at least two actual consumers; absence of an
empty `libs` directory is not a defect in this one-domain application.

In v4's final frozen snapshot, `src/server.js:139` constructs the store and wires
HTTP handlers; `src/server.js:206` also owns process startup and shutdown.
The HTTP caller invokes `validateCreate` before `RequestStore.create`, and
`parseImport` before `RequestStore.append`. The exported store mutations do not
enforce those field rules themselves (`src/store.js:144`). Current HTTP paths
pass independent validation checks, but this is not an invariant-enforcing
public domain entrypoint: another in-process caller would have to repeat the
same validation choreography. Moving files alone would not establish that boundary.

The minimal correction would put process composition in
`src/api/startup/main.js`, expose the request operations through
`src/api/modules/requests/index.js`, and keep storage and CSV internals in that
module. The follow-up's `src/csv.js:98` encodes request-specific fields, so it
belongs to `requests`, not a shared technical library. No empty internal layers,
generic repository, extra service or unused `libs` directory is warranted.
This review preserves the generated snapshots; that product refactor was not
performed during evaluation.

The experiment did not supply this reference. Its R1–R4 pack contains synthetic
operating constraints, and `scripts/build-runtime-bundle.ts` leaves architecture
catalogs in optional packs. The frozen runtime inventory contains no
`service-api-worker` reference. The builder applied the host implementation and
design routes without loading the software architecture method. Consequently,
this pilot can assess its supplied references and general architecture, but
cannot establish compliance with our module/startup/shared-code standard.
That claim needs the selected, versioned architecture sources in the builder
input and in the independent rubric. Adding all pattern documents is unnecessary.
The observed target validator result, `target_project_status=PASS` with
`drift=NOT_CHECKED`, does not validate this application architecture. The remaining
reference-handoff gap is in the experiment inputs and selected architecture
context, not a reason to force source-checkout defaults into every core bundle.

## Post-timeout test diagnosis

The first diagnostic check on the preserved v3 output edited the wrong record:
it filled the search field without submitting the app's native search form,
then clicked the first edit action in the unfiltered list. The public brief
does not require search-on-input. This was an evaluator assumption, not proof of
an application editing defect.

A separate oracle v2 diagnostic submits Enter, waits for one matching result and
checks the selected title before editing. The source manifests of both diagnostic
runs are identical; the corrected check passes all 10 groups, including browser
creation/editing/filtering, failed-save recovery, concurrent writes and restart
persistence. Original v3 remains TIMED_OUT and its original diagnostic remains
FAIL. This later result is functional diagnosis, not a completed autonomous
attempt or a semantic acceptance score. Exact inputs and both outcomes are
preserved in the two `post-timeout-diagnostics*` directories under its artifact
root. Attempt v4 retained its original frozen checks and reproduced the same
test failure in both phases.

## Completed v4 and corrected-oracle reevaluation

Attempt v4 froze source `9f147c7` and completed both native builder turns in one
`gpt-5.6-sol` / `max` session. Source/runtime integrity checks passed and no test
server remained after either phase. Its original controller ended after
1,858,661 ms with `FUNCTIONAL_OR_INTEGRITY_FAIL` because of the search test above;
the original semantic judges correctly remained `NOT_RUN`.

A separate oracle correction was frozen at `2026-09-10T14:25:11.826677Z` using
the unchanged v3 control. After v4 completed, the host evaluated byte-identical
copies of both v4 snapshots with this correction. No implementation feedback was
given to the builder. Original failed receipts remain intact. The reevaluation
completed at `2026-09-10T14:47:35.442Z`, 2,318,455 ms (38 minutes 38 seconds)
after the first v4 dispatch, within its 60-minute overall bound.

| Corrected-oracle evidence | Result |
| --- | --- |
| First snapshot: API, browser create/edit/filter/recovery, atomic concurrent writes and restart | PASS, 10 check groups |
| CSV follow-up: retained behavior/data, real file import/download, independent CSV parser, invalid batch atomicity and restart | PASS, 13 check groups |
| Product/code judge: scope and complexity; architecture and change; supplied references | PASS, 4/4 in all three dimensions; reduced score 1.00 |
| Execution judge: efficiency; autonomy and evidence | PASS, 3/4 and 4/4; reduced score 0.85 |
| Evals mechanical checks and conservative reduction | PASS; lowest required judge score 0.85 |

The execution judge identified avoidable test-runner/proxy/static-HTML assertion
repairs and one duplicate invocation of the same test suite. Its smaller
alternative is the brief's direct loopback transport, a check at the actual
dynamic action, and one run of each distinct validation set. The product judge
found the implementation proportionate to R1–R4; those ratings do not cover the
omitted module/startup architecture standard described above.

Frozen `QA-REQUEST-TRACKER-SEARCH-ORACLE-V2` triage classifies `TEST_DRIFT` using
the original passing HTTP edit/filter receipt and the independent corrected
browser receipt on identical source. Its schema and ownership validation pass.
The host repair changes only `acceptance.mjs`: submit the search/filter form,
wait for the matching result, and verify its title before editing. All assertions
and public behavior remain covered. The canonical test matches the executed
candidate SHA-256 `df54c36c249989563e4a2727a7709f3495373ee0c1eca8991d950b45f35c0827`.

Local evidence roots are `.artifacts/autonomous-project-pilot-v4/private` for
the original inputs, snapshots and failures, and its sibling
`reevaluation-oracle-v2` for corrected acceptance, both independent judge
responses, the hash-bound bundle and `evaluation-receipt.json`. The triage and
test-repair receipt remain in `.artifacts/autonomous-project-pilot-preflight`.

Raw CLI usage counters are retained per emitted event. Whether the resumed
turn's counters are cumulative was not independently established; they are not
summed into a campaign token or cost claim. Human calibration, paired-control
attribution, other model profiles and deployment remain `NOT_RUN`. This is a
successful retrospective evaluation against the frozen pilot requirements,
with a documented original oracle failure and an open architecture-reference
coverage gap, not a general Harness acceptance result.
