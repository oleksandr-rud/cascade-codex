# Executable closeout contract

The source CLI is `bun scripts/cascade.ts closeout`; an exported target uses
`bun .codex/runtime/cascade.js closeout`. Both dispatch the same implementation
as the thin hook. Replace `bun` with the host's configured Bun executable if needed.

## Prepare only when executable closure is needed

1. Bind the accepted task's exact file paths and required checks. Include
   relevant unchanged dependencies/tests/configuration, and both old and new
   paths for a rename. Paths are relative to the Git root; globs/directories and
   symlinks are rejected. Keep unrelated dirty files outside the scope.
2. Run `closeout snapshot --path src/example.ts --path tests/example.test.ts`.
   It returns `{paths, sha256}` from sorted working bytes, executable bits and
   staged entries. Capture this subject before running the required checks and
   bind their results to it. Recheck afterwards; changes invalidate the binding.
3. Run only the already authorized focused checks through the host's normal
   tools. For each actual result, retain a bounded JSON evidence summary:

   ```json
   {
     "schema_version": 1,
     "check_id": "focused-tests",
     "subject_sha256": "<snapshot digest>",
     "status": "PASS",
     "context_id": "<actual execution context>"
   }
   ```

   Status is PASS, FAIL, BLOCKED, NOT_RUN or NOT_APPLICABLE. A required check
   needs PASS. If a check is not applicable, remove it from the required set only
   when the accepted task scope supports that disposition; do not relabel it.
   The summary must reflect real evidence. Existing Evals receipts remain in
   their native formats; the host may summarize a validated receipt here while
   preserving its original evidence and acceptance boundary.
4. Save the contract at the current task/turn path supplied by the prompt hook,
   or obtain that path using `closeout path --session ID --turn ID`:

   ```json
   {
     "schema_version": 1,
     "task_id": "<host session ID>",
     "turn_id": "<host turn ID>",
     "producer_context_id": "<implementation context>",
     "subject": {"paths": ["src/example.ts", "tests/example.test.ts"], "sha256": "<snapshot digest>"},
     "required_checks": [{
       "id": "focused-tests",
       "evidence_path": ".artifacts/closeout/focused-tests.json",
       "evidence_sha256": "<SHA-256 of exact evidence file bytes>",
       "independent": false
     }],
     "no_checks_reason": null,
     "unresolved": []
   }
   ```

   Replace every placeholder from current observations. Contract and evidence
   files stay outside the measured subject to avoid circular hashes. Required
   check IDs and scope paths must be unique. An empty required set needs a
   source-grounded `no_checks_reason`; it does not grant a validation waiver.
5. Run `closeout check --file .artifacts/closeout/<binding>.json`. Exit zero
   means scoped integrity PASS; nonzero means GAP or INVALID. Resolve required
   failures or report them honestly. Never generate PASS evidence to silence a hook.

## Meaning of the result

The checker reads actual Git staged/unstaged/untracked changes and the declared
files, irrespective of which tool edited them. Unscoped changes are counted
separately and remain untouched. This does not infer their owner or prove the
declared task scope is complete. Changes during the read are checked again;
the result is not an atomic repository lock or authority against later edits.

It checks file integrity, task/turn binding, subject freshness, required result
status, unresolved criteria and declared context separation. It does not execute
commands, authenticate receipt authors, infer requirements from prose, prove
that two context IDs represent independent people/processes, score semantics,
approve release or certify visual/functional behavior. The host owns the scope,
actual execution evidence and any independent evaluator's provenance.
`independent: true` rejects reuse of the implementation/task context; a distinct
string is necessary but not sufficient proof of independent evaluation.

Missing, changed, non-passing or mismatched evidence cannot produce PASS.
Malformed or oversized inputs, traversal, symlinks and unmerged scoped entries
are INVALID. Limits: 256 scope paths, 128 checks, 1 MiB per JSON input and
32 MiB per scoped file. Exceeding a bound yields no completion claim.

## Hook and migration

`UserPromptSubmit` exposes the current task/turn binding without creating files.
`Stop` checks only the registered contract for that binding. No contract means
no executable closeout was requested and no verdict is emitted. Prior-turn
contracts are not reused; an explicit CLI check can inspect an older contract
but cannot make it current for the Stop hook. The hook returns an advisory
`systemMessage`, never a continuation or automatic evaluator dispatch. It also
skips repeated Stop continuations to avoid feedback loops. Hook timeout or host
failure is not a pass; run the CLI explicitly when evidence is needed.

The old apply_patch-only harness-impact hook is retired. Independent harness
judgment remains optional through Cascade Evals' harness subject profile;
the dedicated host role is removed. Existing `harness-evaluator` campaign
principal strings and frozen receipts remain compatible and are not rewritten.

Stop and prompt-binding output shapes follow the
[official Codex hooks contract](https://developers.openai.com/codex/hooks/).
Fixture subprocess checks verify this adapter; activation in a running desktop
session depends on the host loading/trusting the updated repository hooks.
