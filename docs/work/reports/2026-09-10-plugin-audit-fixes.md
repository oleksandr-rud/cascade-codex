# Cascade plugin audit fixes — 2026-09-10

This change fixes the installed dependency identity, ordinary delivery overhead,
prompt context duplication, evaluation configuration labeling and Windows
execution gaps observed in the all-plugin audit of `e2ca7eb`.

## Preserved contracts

The original body of all 19 touched domain skills remains intact. A delivery-mode
rule distinguishes an ordinary explanation, recommendation, review or prose draft
from a structured artifact, persistence, evaluation or real plugin handoff.
Evidence, source authority, uncertainty, permissions, acceptance/recovery behavior,
decision status and missing-input handling apply in both modes. All existing
schemas, fields, ledgers, hashes, validators and gates still apply to artifact
mode. No schema, rubric threshold, domain rule or test was removed.

AI Architect and Coding Agent now resolve the exact enabled marketplace/name/
version under the installed cache, matching Evals. A mutable checkout cannot
substitute for an unavailable installed version. Existing escape tests use a real
Windows junction when symlink privileges are unavailable; they still verify the
resolved-path boundary.

Prompt inserts each full input placeholder once by default and refers to the
named data block elsewhere. An explicitly necessary repeated input remains
possible with its context cost accounted for. Evals identifies new default runs
as `default-astra-high`. Judge instructions explicitly explain inclusive citation
length (`end - start + 1 <= 12`); the existing evidence validator is unchanged.

All 14 plugin cards use the existing Cascade artwork and have their own accessible
titles. Coordinator and Personas have simpler short descriptions. All 14 packages,
including Security, are installed/enabled locally; versioned manifests and the
host capability catalog have been refreshed.

## Windows evaluation

The generic agent runner defaults to a local Docker backend on Windows. Its
packaged Dockerfile pins Codex 0.153.4 and installs the standard TLS trust store.
No TLS verification bypass is used. The image must already exist locally and is
bound to its immutable image ID before dispatch. Remote Docker endpoints are
rejected before credentials are mounted.

Each builder, target and judge receives a separate disposable phase directory.
Only that directory and the existing read-only Codex login are mounted. The
runner inspects mounts and container protections before start; the root filesystem
is read-only, capabilities are dropped, no-new-privileges is set, and memory,
processes and temporary storage are bounded. Original subject, installed cache,
history, peer directories and Docker socket are not mounted. Tools, host skill
discovery, project instructions, memories, apps and web are disabled; tool/error
transcripts remain invalid. Cleanup removes only the invocation's unique container,
including on timeout. Unavailable execution returns BLOCKED/exit 3, with an
incomplete-attempt receipt. macOS retains its separate read-denial backend.

Setup and backend-specific evidence are documented in Cascade Evals'
`skills/evaluate/references/agent-runner.md`. An image/login/Docker prerequisite
failure does not count as a semantic rejection.

Mechanical rejection now preserves the original model responses, finalized
artifacts, adapter findings and phase logs without dispatching semantic judges.
An integration regression verifies this failure path through the real controller.

The first live Security attempt exposed an underspecified READY fixture: it
omitted provider retention and failure behavior required by the skill. The v2
fixture supplies explicit synthetic design facts without changing the expected
status or weakening readiness. Its fresh run passed all nine mechanical cases;
both judges still rejected it (0.9375 outcome, 0.8875 trajectory) because SEC-003
encoded unknown scan truncation as true. That failed run remains immutable.
The skill now requires complete inventory measurements, preserves incomplete
supplied claims separately, and explicitly defers an unperformed replacement
scan with a GAP/BLOCKED gate. Empty replacement-scan values cannot claim that
the supplied scan was complete. The existing schema and judge thresholds remain
unchanged. A fresh run uses the same v2 cases and the revised skill.

## Validation

- 478 Python test methods covered across the plugin suites, with the corrected
  Security package check and final Evals suite rechecked after their updates.
- Nine Node test programs pass; execution-adapters retains its two documented
  Windows skips. All seven domain package/manifest checks pass.
- Repository validation, generated capability catalog and the 41-test host suite
  pass. SVGs parse and their accessible titles match the owning plugin.
- All three resolver implementations select the same installed Prompt skill.
  Installed parity covers 14 enabled packages and 639 files without differences.
- Fresh invoice execution: ACCEPTED, outcome/process scores 1.00/1.00, one OCR
  placeholder. Source-conflict output also contains one input placeholder and
  passes its mechanical requirements.
- Two source-conflict judgment attempts were INVALID because a judge cited 13
  lines under a 12-line limit. Both remain preserved. After correcting the
  inclusive-range instructions, verified reuse of the same frozen author/target
  output was ACCEPTED at 1.00/1.00. This was rejudgment, not a fresh repetition.
- A live Astra/high call through Docker completed with a valid response and no
  tool events. The fresh nine-case Security v3 execution completed through Docker
  with three target contexts and two independent Astra/high judges. Mechanical
  eligibility: PASS (9/9). Outcome: PASS, 1.00. Trajectory: FAIL, 0.8875.
  Conservative overall result: FAIL; this is not full semantic qualification.
  The trajectory judge accepted the corrected missing-measurement procedure but
  found ambiguity in the existing boolean-only inventory representation and an
  unexplained UNTRUSTED label on a request source. The output judge accepted the
  same artifacts. Both judgments remain intact; no threshold was lowered and no
  retry was used to replace this result.

Local raw evidence is under `.artifacts/plugin-audit-fixes-20260910/`: the original
and release check results, installed/resolver parity, fresh Prompt campaign,
all rejudgment attempts, container runtime smoke and domain execution receipts.
Human judge calibration, exhaustive native UI trigger coverage and comparative
qualification of every plugin remain unclaimed. Card metadata/artwork validation
is not a rendered UI or pixel-fidelity test.

## Remaining qualification gap

Security's typed inventory cannot directly represent unknown truncation. The
added rule avoids asserting a fabricated measurement and retains supplied facts,
but the replacement-scan convention still needs a separately reviewed contract
revision to represent unknown measurements directly. Request-intent authority
versus untrusted evidence also needs clearer labeling and a bounded follow-up
qualification. These limitations do not invalidate the executed isolation,
mechanical or repository checks, and those checks do not substitute for semantic
acceptance. No claim is made that every plugin has passed live qualification.
