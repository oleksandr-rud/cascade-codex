# Request tracker pilot v1

One bounded project-building experiment; this is not the read-only harness
scenario runner or a registered simulation campaign. It implements the
[pilot plan](../../../docs/work/reports/2026-09-10-autonomous-project-harness-evaluation-plan.md).

The builder receives only `brief.md`, `references.md`, a generated target
runtime, and the enabled installed Cascade packages. Deliver `followup.md`
only after the initial output is frozen. `acceptance.mjs`, judge profiles,
controller source, earlier runs and judgments are sealed host inputs. Judge
profiles are authored as YAML; the controller serializes the frozen machine
response/reduction inputs as JSON. Never
mount the source checkout or Docker socket in the builder container.

Freeze the source/runtime/plugin/image digests and exact commands before model
dispatch. The controlled model is `gpt-5.6-sol` with `max` reasoning, a single
builder session followed by two independent judge contexts. The evaluation-wide
deadline is 60 minutes from first builder dispatch: initial build up to 25
minutes, follow-up up to 12, independent acceptance up to 8 total, judges up to
10 concurrently, with the remaining five minutes reserved for freezing and cleanup.
Each phase also receives the remaining overall deadline. No implicit retries.
Attempt v3 used the earlier 20-minute initial limit and timed out before a
completed turn. Attempt v4 freezes this revised allocation; preserve v3's
timeout and keep any post-timeout functional diagnosis separate from acceptance.

The disposable controller reuses Cascade Evals' bounded process execution,
global model-call pool and judge reduction. It keeps raw events, frozen first
and second snapshots, browser/API evidence, declared versus observed commands,
hashes and terminal states under `.artifacts/`. Controllers must verify allowed
reads and denied sealed reads, target writes and denied outside writes, network
policy, process cleanup, and source immutability before claiming eligibility.
Keep the exact controller and environment receipt with each run; an environment
blocker before model dispatch is `NOT_RUN`, not an application failure.

Independent acceptance operates on copies of the frozen application, with a
fresh data directory retained across restarts and the follow-up migration.
Its app container uses an internal Docker network; a fixed-destination TCP relay
connects the host browser through a loopback-only published port.
It records every failure; it never repairs generated source. A failed functional
or integrity gate prevents semantic acceptance. Judges see source and raw
execution evidence relevant to their remit, with no gate results, hidden case
bodies, numeric thresholds, expected answers or peer responses. Ratings use
the frozen 0–4 anchors, weighted reduction, per-dimension floors and lowest
required-judge score. Calibration and paired control attribution remain NOT_RUN.

Do not turn one successful pilot into a claim that all Harness versions work,
that Cascade caused the result, or that the target is ready for deployment.
