# Frontier Autonomous Tier

Use for long-horizon work with broad tools, durable state, and recovery.

- Define authority and prohibited actions before workflow detail.
- Bind inputs, state, checkpoints, budgets, attempts, idempotency, recovery,
  escalation, cleanup, and terminal evidence.
- Separate planning, execution, validation, and acceptance. A plan does not
  grant permission; a worker does not self-accept.
- Require confirmation for consequential actions unless narrow authority is
  already explicit and mechanically enforced.
- Preserve partial progress and reopen only work invalidated by changed inputs.
- Prefer a lower tier when representative results show no material gain.
