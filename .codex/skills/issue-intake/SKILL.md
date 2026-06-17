---
name: issue-intake
description: Use when the requested output is a durable issue body or tracker ticket from user reports, validation findings, screenshots, or product notes, without running validation or patching code.
---

# Issue Intake

Use when the user asks to report a bug, draft issue bodies, split observed
failures into tickets, or file tracker issues.

Do not use this skill for validation, test repair, functional acceptance, or
implementation.

## Source Order

1. Latest user report, screenshot, logs, command output, or validation finding.
2. Expected behavior from the user, specs, scenarios, journeys, or plan.
3. `docs/glossary.md` and current product docs.
4. Tracker conventions and connector availability when filing is requested.

## Checklist

1. Identify user-visible problem, expected behavior, actual behavior, and
   reproduction steps.
2. Ask a focused blocker question only when an issue body would be misleading.
3. Split only independently fixable issues.
4. Avoid guessed root causes unless evidence proves them.
5. For agent-ready briefs, keep the body durable: describe behavior,
   acceptance criteria, and key public interfaces or contracts; avoid file
   paths and line numbers that will go stale.
6. Include evidence references the user can inspect.
7. If filing is requested and tracker access is unavailable, return ready-to-file
   issue bodies.

## Output

- title;
- what happened;
- expected behavior;
- steps to reproduce;
- evidence;
- key interfaces or public contracts when useful;
- acceptance criteria when ready for implementation;
- scope or owner hint when known.
