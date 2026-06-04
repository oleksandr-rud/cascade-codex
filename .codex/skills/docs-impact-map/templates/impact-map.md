# Docs Impact Map: `<title>`

Date: YYYY-MM-DD
Source: `<REQUEST_OR_SPEC_OR_CHANGED_FILE>`
Owner doc: `<DOC_PATH>`
Status: `<proposed | validated | blocked | superseded>`

## Changed Fact

- Previous documented fact:
- New or proposed fact:
- Why it affects future planning or validation:

## Doc Routing Decision

Use `docs/patterns/workflow.md` for the shared Doc Routing Decision Matrix.

| Fact | Source | Owner Target | Action | Bloat Check | Evidence | Next Gate |
|---|---|---|---|---|---|---|
| `<DURABLE_FACT_OR_NONE>` | `<REQUEST_SPEC_DIFF_LANE>` | `<DOC_OR_FOLDER_OR_NONE>` | `<UPDATED_NO_CHANGE_DEFERRED_BLOCKED_GAP_NO_DOC_NEEDED>` | `<SMALLEST_USEFUL_DELTA_OR_REASON>` | `<VALIDATION_OR_SOURCE>` | `<SKILL_OR_DONE>` |

## Impact Matrix

| Target | Dependency | Required Check | Status | Next Gate | Notes |
|---|---|---|---|---|---|
| `docs/product/` | `<WHY_AFFECTED>` | `<CHECK>` | `<UPDATED_NO_CHANGE_DEFERRED_BLOCKED_GAP>` | `<SKILL_OR_OWNER>` | `<NOTE>` |
| `docs/design/` | `<WHY_AFFECTED>` | `<CHECK>` | `<UPDATED_NO_CHANGE_DEFERRED_BLOCKED_GAP>` | `<SKILL_OR_OWNER>` | `<NOTE>` |
| `docs/brand/` | `<WHY_AFFECTED>` | `<CHECK>` | `<UPDATED_NO_CHANGE_DEFERRED_BLOCKED_GAP>` | `<SKILL_OR_OWNER>` | `<NOTE>` |
| `docs/specs/` | `<WHY_AFFECTED>` | `<CHECK>` | `<UPDATED_NO_CHANGE_DEFERRED_BLOCKED_GAP>` | `<SKILL_OR_OWNER>` | `<NOTE>` |
| `docs/backlog/_index.md` | `<WHY_AFFECTED>` | `<CHECK>` | `<UPDATED_NO_CHANGE_DEFERRED_BLOCKED_GAP>` | `<SKILL_OR_OWNER>` | `<NOTE>` |
| `docs/glossary.md` | `<WHY_AFFECTED>` | `<CHECK>` | `<UPDATED_NO_CHANGE_DEFERRED_BLOCKED_GAP>` | `<SKILL_OR_OWNER>` | `<NOTE>` |
| `docs/patterns/` | `<WHY_AFFECTED>` | `<CHECK>` | `<UPDATED_NO_CHANGE_DEFERRED_BLOCKED_GAP>` | `<SKILL_OR_OWNER>` | `<NOTE>` |

## Docs Updated

- `<DOC_PATH>`: `<CHANGE_OR_NONE>`

## Deferred Or Blocked

- `<TARGET>`: `<REASON_AND_OWNER>`

## Next Route

- `<discover | ingest-spec | orchestrate-work | plan-change | functional-qa | closeout | codex-maintenance>`
