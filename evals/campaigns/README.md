# Cascade Campaigns

A campaign is a versioned simulation plan. Authorship proves only that the
complete definition graph resolves; a `PASS` exists only in an immutable run
summary under `.artifacts/campaigns/<run-id>/`.

Campaigns bind a simulation, evaluation profile, typed tasks, claims, policies,
oracles, metrics, treatments, and optional calibration. Supported contours are:

- `command` and `terminal`;
- `browser`, `desktop`, and `mobile`;
- `agent-response`.

Playwright is a browser-task runtime, not an agent permission system. It is
available through the isolated `.codex/harness-tooling/` package. A browser
campaign still requires an implemented, explicitly authorized driver adapter;
authored definitions do not imply executable coverage.

```bash
bun scripts/cascade.ts campaign list
bun scripts/cascade.ts campaign catalog --check
bun scripts/cascade.ts campaign validate simulation-contract-smoke
bun scripts/cascade.ts campaign run simulation-contract-smoke
```
