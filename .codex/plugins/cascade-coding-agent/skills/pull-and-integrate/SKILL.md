---
name: pull-and-integrate
description: Pull and integrate Git changes and prepare the working branch for push. Use for upstream synchronization, merge/rebase conflict resolution, bring in develop, or get changes ready to push, including Ukrainian equivalents. Default to develop when present, otherwise the remote's actual primary branch; honor an explicit base. Adapt by branch authority and contracts rather than chronology, review the result, and report adaptations and push readiness. Applies to any Git repository; excludes read-only comparisons and unrelated asset installation.
---

# Pull and Integrate

Integrate the requested source into the intended destination without losing
useful behavior, then prepare the result for push on every run, even when no
merge is needed. The host executes Git and target checks under current user
authority. The skill supplies the method; it does not grant permissions.

## Invocation and scope

Use this method whenever upstream synchronization or conflict resolution is the
requested outcome or a necessary, already authorized prerequisite, and when the
user asks to prepare changes for push. This includes
an in-progress merge/rebase and clean Git merges with incompatible semantics.
Do not limit discovery to the English skill name or to visible conflict markers.
Interpret requests semantically; never use keyword/regex routing or scoring.
Read-only review of branch differences stays read-only. Writing this skill or
discussing a future pull does not authorize an actual integration.

## Establish the integration boundary

1. Inspect repository instructions, current branch and HEAD, status including
   staged/unstaged/untracked work, worktrees, upstream configuration, and any
   active merge/rebase/cherry-pick. Record starting OIDs and existing changes.
   Verify repository identity and source/destination direction before mutation.
2. Resolve the integration base separately from the working branch's tracking
   upstream and eventual push destination. Honor an explicit base first, then
   repository branch policy. Otherwise use `develop` on the authoritative
   repository remote when it exists; if absent there, use that remote's actual
   primary/default branch. Determine the remote from the request, repository
   policy and configured remotes; a fork's push remote need not own the base.
   Verify current remote branch existence and default HEAD, for example with
   `git ls-remote --symref <remote> HEAD refs/heads/develop`, or trusted hosting
   metadata. Check local-only repositories against their documented primary
   branch; without a remote they cannot become ready for push.
   Do not guess `main` versus `master`, treat a feature tracking upstream as the
   primary branch, or treat stale local `develop` as proof it still exists on
   the remote. `dev` is distinct and is used when explicitly selected or set by
   repository policy. A network/authentication failure does not prove absence.
   Missing explicit refs, conflicting authoritative remotes, or an unverifiable
   primary branch require a concrete gap/clarification instead of a silent
   substitution. A detached HEAD needs a destination before integration.
3. Bind precedence separately from the source being fetched. The user's named
   authoritative branch wins within the stated scope; otherwise use documented
   repository branch policy. Under this skill's default policy, the selected
   `develop` or fallback primary branch governs shared base contracts; adapt
   local changes to them while retaining required local outcomes. Record this
   default-policy binding explicitly. Preserve both intents and leave conflicts
   unresolved where no governing contract establishes precedence. Dates,
   version numbers and apparent popularity do not establish semantic priority.
4. Preserve dirty work before touching overlapping paths. Prefer an isolated
   candidate worktree at the recorded destination OID or another reversible
   repository-supported approach. If a stash is needed, capture staged and
   untracked state, record its exact OID, restore with apply and verify before
   dropping it. Never blanket-reset, clean, stage all, or discard local work.
   Do not abort or restart a pre-existing operation without authority; inspect
   its recorded source and progress before resuming it.
5. Inspect any configured merge drivers and relevant hooks as execution surfaces.
   Fetch only the selected source remote/ref without automatic pruning, then pin
   the fetched commit OID. On fetch failure, report BLOCKED or explicitly scoped
   offline analysis; do not call a stale tracking ref freshly synchronized.

Proceed under authorization already present. Ask only for a missing source,
materially unresolved priority, destructive action, or required authority. A
request to pull/integrate normally authorizes reversible local reconciliation;
preserve stricter target rules on commits and history rewriting. It does not
authorize push, force-push, deployment or changing global Git configuration.

## Compare meaning before merging

Use the recorded destination and fetched source, not moving branch names.
Inspect `git merge-base --all` and both base-to-tip diffs, including renames,
deletions, binary/submodule changes and generated-file producers. Inspect actual
source, tests and contracts in both tips; commit messages are supporting evidence.
If history is unrelated or there are multiple merge bases, investigate explicitly
instead of silently choosing a base or allowing unrelated histories.

For each overlapping behavior or affected consumer, establish the original intent
on both sides, authoritative contract, retained requirement, and required
adaptation. Follow source-to-consumer changes across files even when Git reports
no conflict: APIs, data/schema migrations, permissions, dependency and lockfiles,
configuration, generated catalogs, tests and documentation can disagree cleanly.
Prioritize investigation by impact on data integrity, permissions, public
contracts and shared consumers, then local implementation details. This orders
review effort; it does not silently override explicit branch authority.

Use LLM interpretation to produce these explicit decision fields in the working
record (a compact table is sufficient; no mandatory extra file):

- `scope`: files and behavior being reconciled;
- `authority`: exact ref/OID and user instruction or repository-policy evidence,
  or `UNSPECIFIED`;
- `decision`: `KEEP_SOURCE`, `KEEP_DESTINATION`, `ADAPT_DESTINATION_TO_SOURCE`,
  `ADAPT_SOURCE_TO_DESTINATION`, `COMBINE`, or `UNRESOLVED`;
- `reason`: both intents, governing evidence and why chronology is irrelevant;
- `behavior_delta`: what survives, changes, is removed, or remains uncertain;
- `validation`: concrete checks needed to support that decision.

If automation consumes decisions, code must validate declared fields and enum
values; never recover a verdict from prose or infer it using lexical heuristics.
Unsupported interpretations remain `UNRESOLVED`, not invented authority.

An authoritative `develop` may contain an older-dated API migration while the
feature branch has newer commits using the retired API. Preserve the migrated
contract and adapt the feature to it. Do not restore the retired API because its
caller is newer, or discard the feature by taking all of `develop`. If a local
fix protects an invariant that the source violates, carry the fix forward in the
new architecture. Report an irreconcilable contradiction before losing either
required behavior. Superseded implementations may be removed with evidence;
accepted user outcomes must not disappear silently.

## Execute and resolve

Choose the user's requested merge/rebase strategy, otherwise repository policy;
prefer a non-rewriting merge when divergence needs reconciliation and no policy
selects rebase. Fast-forward only when ancestry permits. Inspect before a blind
`git pull` can apply implicit configuration. Use the pinned OIDs for execution.
For an active operation, preserve its strategy and examine its existing state.

Resolve conflicts by applying the decision record, then inspect the resulting
behavior against both tips. Never blanket-select `ours`/`theirs`, use global
`-Xours`/`-Xtheirs` as a semantic policy, or equate Git stage labels with branch
authority. During rebase those labels do not mean the same thing as in an ordinary
merge; identify the actual base/current/replayed commit for each conflict.
Resolve rename/delete cases deliberately and regenerate derived files from their
resolved canonical source. Do not hand-combine binary assets or migrations whose
ordering/identity requires target-specific reconciliation.

Stage only resolved integration paths. Continue the operation only when decisions
are supported and current authority covers that continuation/commit. If commit
authority is absent, leave a reviewable candidate and report `PREPARED`, not a
completed integration. Do not skip an empty/conflicting commit without proving
its required behavior already exists or has been explicitly superseded.

Before applying an isolated candidate, verify the destination HEAD and dirty state
still match the recorded baseline. Concurrent changes invalidate the application
plan; inspect and rebase the plan on current evidence, never overwrite them.
Verification/restore failures must preserve the candidate and recovery reference.
Abort only an operation started by this run when safe and within authority;
never reset unrelated edits. Report the exact remaining operation and next step.

## Verify the integrated state

Read existing tests first. Run focused regression/boundary checks for changed
behavior and the target's required build, type, lint, schema and test checks.
For an authoritative-base adaptation, verify both its governing contract and the
retained local outcome. Restore preserved dirty work carefully; restoration
conflicts also need semantic resolution. Recheck any evidence invalidated by
restoration or later edits. Do not weaken tests merely to obtain a pass.

Inspect the full final diff, unmerged index entries and Git operation state;
`git diff --check` alone does not prove integration. Confirm source ancestry in
the merge/fast-forward result, or replayed intent and source ancestry after
rebase; use range-diff when useful. Inspect the result relative to each tip to
catch silently dropped behavior. Verify staged/untracked preservation and record
the final OID or candidate state. Passing Git with no markers is not evidence of
semantic compatibility. An already-contained source needs no synthetic merge.

## Prepare for push on every run

Own this stage through a concrete ready result or a named blocker. Do not stop
merely because the merge completed, conflicts disappeared, or the base was
already contained. Preserve a separate integration status and push readiness.

1. Inspect the final intended publication diff and commits, including relevant
   uncommitted work, against the selected base and push target. Confirm retained
   user outcomes, scope, generated sources, required checks and absence of
   accidental files or secrets without exposing secret contents in the report.
   Repair in-scope integration defects and rerun the affected checks; do not
   include unrelated dirty work just to make the checkout clean.
2. Review that exact final diff. For material/risky changes or a requested review,
   use `cascade-software-architect:review-change`, resolved through
   `../../scripts/resolve_plugin_skill.py`. The host supplies `change-diff` and
   `change-contract` from the pinned result and original request; existing
   `change-review-findings` are usable only if bound to the current result.
   Tiny changes may use proportional direct inspection. This is an optional
   dependency by trigger, not permission to omit a required review: if required
   and unavailable, mark readiness `BLOCKED` after completing other preparation.
   The review method remains read-only; this integration owner repairs findings
   and submits the changed fixed point for review. Same-context review is
   self-review, never an independent gate. Obtain a separate context only under
   existing delegation authority when independence is required; otherwise
   report that gate as blocked. Do not impose independence on every pull.
   A review or architecture method may also originate this integration handoff.
   Bind its finding and original candidate identity, then return the resulting
   report for reassessment. If a nested review recommends integration again for
   the same candidate/base, consume that finding within this active run instead
   of starting a second run. Preserve the existing retry limit; unchanged findings
   without new evidence remain unresolved, not a recursive review/integration loop.
3. Resolve the exact intended push remote, local branch and destination ref from
   the request and repository publishing policy. Honor fork workflows and
   configured push mappings; the integration base is not automatically the push
   destination. Inspect applicable protected-branch/PR requirements. Do not
   guess that work should be pushed directly to the primary branch. If creation
   of a new remote branch is intended, record its exact ref and absent state.
4. Refresh the push target's remote OID, fetching that specific ref if it exists,
   and check ahead/behind and ancestry of the actual candidate. If the target
   contains unseen commits, reconcile them within scope while retaining the
   base's governing contracts, then repeat affected validation and review. A
   rebase that requires a force push is a reported blocker unless that separate
   authority and repository policy already permit it. Never silently expand a
   normal push into history rewriting. If repeated remote movement prevents a
   stable candidate, stop after two refresh/reconcile attempts and report the
   observed OIDs and coordination needed.
5. Ensure all intended changes are committed when current authority permits
   commits. Otherwise finish a reviewable candidate and state that committing
   remains necessary; uncommitted intended changes are `NOT_READY` for push.
   Record checks/review against the final candidate OID (or working diff identity
   for an uncommitted candidate). Later edits or remote movement invalidate only
   the affected evidence. Show the exact next push command/refspec without
   executing it unless push is already authorized. A push failure must be
   reported accurately; never claim publication from preparation or dry-run.

Emit `push_readiness`: `READY`, `NOT_READY`, or `BLOCKED`, separately from
`push_authorization`: `AUTHORIZED` or `NOT_AUTHORIZED`, and `push_state`:
`NOT_PUSHED`, `PUSHED`, or `FAILED`. `READY` means the intended commits are
prepared, required checks and review pass, no operation/conflicts remain,
restoration is verified, the exact publication target is known, and the observed
remote state permits the intended update under repository policy. Lack of push
authorization alone does not prevent `READY`; it prevents execution. Include
the checked target OID/time: readiness is a snapshot, not a guarantee that a
later push will succeed. If no outgoing changes exist, say so; readiness is
`READY` only when the other applicable checks are satisfied.

## Mandatory completion report

Report after every run, including a no-op, preparation, failure or blockage:

- Status: `INTEGRATED`, `ALREADY_CURRENT`, `PREPARED`, `UNRESOLVED` or `BLOCKED`;
  repository, destination before/after OIDs, fetched source/OID and strategy.
- Base selection: explicit branch, repository policy, `develop`, or fallback
  primary branch; evidence that `develop` is absent when fallback was used.
- Which branch/contracts had priority, the source of that authority and its
  scope. Explicitly state when older-dated authoritative changes overrode newer
  local implementations; never imply that the newest commit won by default.
- Material adaptations with files/behavior and reasons; retained local outcomes;
  removed or superseded changes. Include semantic conflicts resolved outside
  Git's conflict list. State when no adaptation was needed.
- Exact validation outcomes (`PASS`, `FAIL`, `NOT_RUN`, `BLOCKED`), remaining
  uncertainty, dirty-work restoration and whether a Git operation remains open.
- Push readiness, authorization and state; exact push remote/ref, candidate and
  observed remote OIDs/time, outgoing commits, review result, remaining blockers
  and exact next action/command. Include recovery references when needed.

Use `INTEGRATED` only after requested local integration and required checks finish
successfully with no unresolved decisions or restoration failures. If the Git
operation completed but validation failed, report `UNRESOLVED` and say that the
merge/rebase finished; preserve the result and report the failure accurately.
Keep the report concise, but never omit authority-driven adaptations or losses.
