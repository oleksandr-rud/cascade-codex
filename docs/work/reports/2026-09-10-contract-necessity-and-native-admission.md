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
