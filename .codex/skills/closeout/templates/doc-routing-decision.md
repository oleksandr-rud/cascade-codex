# Doc Routing Decision

Date: YYYY-MM-DD
Source: `<REQUEST_OR_SPEC_OR_DIFF_OR_LANE>`
Scope: `<TASK_OR_LANE_OR_REPORT>`

## Routing Matrix

| Fact | Source | Owner Target | Action | Bloat Check | Evidence | Next Gate |
|---|---|---|---|---|---|---|
| `<DURABLE_FACT_OR_NONE>` | `<REQUEST_SPEC_DIFF_LANE>` | `<DOC_OR_FOLDER_OR_NONE>` | `<UPDATED_NO_CHANGE_DEFERRED_BLOCKED_GAP_NO_DOC_NEEDED>` | `<SMALLEST_USEFUL_DELTA_OR_REASON>` | `<VALIDATION_OR_SOURCE>` | `<SKILL_OR_DONE>` |

## Actions

- `UPDATED`: owner doc was changed with the smallest useful sourced delta.
- `NO_CHANGE`: owner doc was checked and already matches the durable fact.
- `DEFERRED`: real follow-up exists and has an owner or backlog route.
- `BLOCKED`: required evidence or owner context is unavailable.
- `GAP`: source material lacks enough context for safe routing.
- `NO_DOC_NEEDED`: change is mechanical, test-only, refactor-only, already
  documented, or not useful for future planning or validation.

## Reference Rules

- Source: request/issue, spec path, work lane, artifact ID, changed file, or
  report.
- Owner Target: exact owner file when known; folder only when pending; `none`
  only for `NO_DOC_NEEDED`.
- Evidence: command/check, scenario, diff, impact status, source-only basis, or
  blocked reason.
- Bloat Check: why this is the smallest useful durable delta, or why no doc is
  needed.

## Notes

- Owner target:
- Docs updated:
- Deferred or blocked:
- No-doc-needed reason:
- Impact-map route:
