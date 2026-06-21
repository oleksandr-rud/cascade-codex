# Spec Packet: `<title>`

## Source

- Source type:
- Source ID or link:
- Date received:
- Owner or requester:
- Raw copy stored: `<yes-no-and-path>`

## Classification

| Type | Extracted Detail | Write Target |
|---|---|---|
| product intent | `<detail>` | `docs/product/` |
| design constraint | `<detail>` | `docs/design/` |
| brand/content constraint | `<detail>` | `docs/brand/` |
| implementation constraint | `<detail>` | `docs/specs/{slice-slug}/` |
| architecture/boundary constraint | `<detail>` | `docs/patterns/boundaries.md` or `architecture-review` |
| stack/runtime/config fact | `<detail>` | `harness.config.yaml` |
| validation command or runner | `<detail>` | `harness.config.yaml` |
| acceptance criterion | `<detail>` | `docs/work/` or scenario row |
| active execution criterion | `<detail>` | `docs/work/active.md` or `docs/work/lanes/` |
| backlog candidate | `<detail>` | `docs/backlog/_index.md` |
| codebase vocabulary | `<term>` | `docs/glossary.md` |
| durable workflow rule | `<detail>` | `.codex/skills/`, `.codex/agents/`, or `docs/patterns/` |
| open question | `<question>` | handoff |

## Doc Routing Decisions

Use `docs/patterns/workflow.md` for the shared Doc Routing Decision Matrix.

| Fact | Source | Owner Target | Action | Bloat Check | Evidence | Next Gate |
|---|---|---|---|---|---|---|
| `<DURABLE_FACT_OR_NONE>` | `<REQUEST_SPEC_DIFF_LANE>` | `<DOC_OR_FOLDER_OR_NONE>` | `<UPDATED_NO_CHANGE_DEFERRED_BLOCKED_GAP_NO_DOC_NEEDED>` | `<SMALLEST_USEFUL_DELTA_OR_REASON>` | `<VALIDATION_OR_SOURCE>` | `<SKILL_OR_DONE>` |

## Behavior Examples

- Given `<state>`, when `<action>`, then `<outcome>`.

## Evidence And Coverage

| Claim Or Rule | Source Family | Evidence Class | Coverage Status | Promotion Status |
|---|---|---|---|---|
| `<claim>` | `<paper-official-doc-human-pilot-benchmark-local-spec>` | `<validated-source-ideation-simulator-output-user-provided>` | `<covered-weak-blocked-out-of-scope>` | `<promote-defer-remove>` |

## Functional Acceptance Checks

| User Goal | Boundary | Check | Evidence Target |
|---|---|---|---|
| `<goal>` | `<browser-api-journey-scenario>` | `<check>` | `<command-or-observation>` |

## Implementation Notes

- Codebase terms:
- Likely source areas:
- Public contracts:
- Non-goals:

## Handoff

- Next gate:
- Blockers:
- Durable docs updated:
