# Cascade Campaigns

A campaign is a versioned execution plan. Authorship proves only that the plan
is structurally valid; a `PASS` exists only in an immutable run summary under
`.artifacts/campaigns/<run-id>/`.

Campaigns compose three task kinds:

- `command`: deterministic harness or target commands;
- `browser`: Playwright checks against a controlled fixture or application;
- `agent-response`: a focused read-only harness-evaluation invocation.

Tasks may be inline or referenced from `evals/tasks/`. Reusable task files make
the same simulation or check usable in multiple campaigns, while each run
records the referenced file digest.

Playwright is a browser-task runtime, not an agent permission system. It is
needed for deterministic UI simulations. Autonomous browser exploration
requires a separate configured browser-tool adapter.

```bash
bun scripts/cascade.ts campaign list
bun scripts/cascade.ts campaign validate browser-simulation-smoke
bun scripts/cascade.ts campaign run browser-simulation-smoke
```
