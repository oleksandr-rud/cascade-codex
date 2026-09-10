# Git integration handoff

Apply when current source evidence shows that a reviewed diff or architecture
depends on an outdated base, unresolved branch divergence, merge/rebase conflicts,
or adaptation to governing contracts from develop/the primary branch. A generic
review or architecture request does not automatically require synchronization.
Interpret relevance semantically; branch names or dates alone are not findings.

Recommend `cascade-coding-agent:pull-and-integrate` to the active host owner with
the concrete finding and its evidence, repository and working/base refs/OIDs when
known, governing contract, required retained behavior, affected scope and checks.
Use the existing findings/candidate output; no extra mandatory artifact is needed.
Do not invent an upstream identity or claim to have inspected a remote that was
not read. The integration skill resolves develop/primary fallback and prepares
push readiness; keep its procedure in that owner.

The host may load and execute that route when local integration is already
authorized, without asking again. With only read-only review/design authority,
return the recommendation or a named integration blocker and complete unaffected
analysis. The reviewer/designer remains read-only; a recommendation, dependency
edge or model interpretation never authorizes Git mutations, delegation or push.
Resolve the exact enabled installed skill before execution. If unavailable,
report that gap instead of copying the integration method or bypassing it.

After integration, consume its `git-integration-report` as evidence, verify the
new candidate identity and re-read affected code/contracts. Reassess only findings,
architecture assumptions and checks invalidated by the changes. A readiness claim
does not independently prove that the architectural or review concern is fixed.
Preserve original requirements and distinguish self-review from an independent
context; the host retains acceptance and publication authority.

## Prevent circular execution

`review -> host integration -> review of the new fixed point` is a host-managed
sequence, not recursive plugin dispatch or a cyclic workflow plan. The host binds
the originating finding, active operation and candidate identity to the handoff.
If review is already being performed inside `pull-and-integrate`, return findings
to that active integration owner. Do not start another integration of the same
candidate/base. Additional repairs and remote refreshes belong to the current run
and its retry limits. If the same finding persists without a new candidate or new
evidence, report it unresolved with the required next action; do not bounce between
skills. Reopen a resolved finding only when changed source or new evidence warrants
it. Optional catalog links advertise available handoffs, not automatic execution.
