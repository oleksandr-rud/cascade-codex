# Patterns Index

Reusable rules live here when they are durable across work lanes. Keep this
folder small: add a new pattern file only when the rule does not fit one of
these four contracts.

- `workflow.md`: active work lanes, parallel Orchestrator, coverage, refactoring,
  closeout memory.
- `boundaries.md`: folder mapping, layer rules, APIs, adapters, seams, agentic
  runtime invariants.
- `testing.md`: functional acceptance, browser/API/CLI checks, scenario tests,
  semantic test repair.
- `context-memory.md`: retrieval/source fidelity, compaction, context bounds,
  observability.

## Routing Rules

1. Start from the active skill.
2. Load only the pattern file that governs the touched boundary.
3. Follow current code when docs conflict and report the drift.
4. Persist new rules only when durable, repeated, or requested.
