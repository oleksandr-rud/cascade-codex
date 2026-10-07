# Closeout and retention rules

Closure and retention are separate decisions.

Closure requires the exact current project revision, accepted required gates,
resolved dependencies, named acceptance authority, and preserved non-passing
history. A terminal project may still remain active when a current consumer
depends on its live projection.

Represent every supplied acceptance or retention authority as a current source
entry. If an authority is absent, preserve `null` and route recovery to a real
plugin or `target-host`; a descriptive placeholder is not an authority.

`RETIRE_PROPOSED` requires:

- terminal or explicit supersession authority;
- no unresolved active consumer;
- discoverable requirements, decisions, risks, receipts, and evidence;
- stable identities and source digests;
- a target-host destination and validation contract.

The host applies retention only under its current user authority. A proposal is
not a filesystem move, registry mutation, deletion, or automatic scheduler.

The closeout artifact is `COMPLETE` only for a terminal project; the separate
retention action may still be `RETIRE_PROPOSED` because the plugin never
applies it. Unsafe deletion, false-completion, or unscoped archival requests
take precedence as `BLOCKED`. A plain missing-evidence condition without an
unsafe requested action is `GAP`.

`PROPOSED`, `READY`, and `ACTIVE` are not closeout outcomes. When all required
criteria are `PASS`, blockers are empty, and no active consumer remains, use
top-level `COMPLETE` and completion status `PASS`.
