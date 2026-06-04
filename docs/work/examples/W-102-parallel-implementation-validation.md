# Work Lane: W-102 Parallel Implementation Validation

Status: `EXAMPLE_NON_ACTIVE`
Owner: `orchestrator`
Created: 2026-06-04
Lane Model: `parallel-sectioning`
Next Gate: `review-change`

## Request

Implement a small product-visible behavior change while a validation lane builds
acceptance evidence from current specs and scenarios.

## Acceptance Criteria

- Implementation changes only the smallest behavior slice.
- Functional acceptance examples map to the latest work-lane criteria.
- Validation evidence covers command checks and product-visible behavior.
- The merge owner resolves conflicts before closeout.

## Scope

In:

- Feature code, focused tests, acceptance checks, and validation summary.

Out:

- Adjacent refactors.
- Product scope changes not present in specs or work-lane criteria.
- Parallel writes to shared public contracts.

## Source Inputs

| Source | Path Or Tool | Why Needed | Freshness / Confidence |
|---|---|---|---|
| Request | Current user request or ticket | Defines behavior slice | Current / high |
| Spec | `docs/specs/transformed/<spec>.md` | Acceptance criteria and open questions | Current / medium |
| Product | `docs/product/scenarios.md` | User-visible behavior examples | Current / medium |
| Design | `docs/design/interaction-model.md` | UI behavior and accessibility constraints | Current / medium |
| Work | `docs/work/active.md` | Lane status and dependencies | Current / high |
| Code | `<src-root>/<feature>` | Implementation target | Current / high |

## Behavior Examples

| ID | Example | Expected Evidence | Status |
|---|---|---|---|
| S-001 | Given the feature flag is enabled, when the user completes the primary action, then the new state is visible without a page refresh. | Functional test or browser/API check | `PASS` |
| S-002 | Given the request is invalid, when the action is submitted, then the user receives the existing validation pattern. | Unit or integration test | `PASS` |

## File Ownership

| Path Or Area | Owner | Access | Notes |
|---|---|---|---|
| `<src-root>/<feature>` | `implement-change` | `write` | Owns product behavior. |
| `<test-root>/<feature>` | `implement-change` | `write` | Focused tests only. |
| `docs/work/active.md` | `orchestrator` | `merge-only` | Merge evidence after both lanes finish. |
| `docs/work/lanes/W-102-*.md` | `orchestrator` | `merge-only` | Update status and blockers. |
| Public contract files | `orchestrator` | `merge-only` | Serialize if both lanes need edits. |

## Tool And MCP Context

| Tool Or MCP | Use | Permission / Approval | Result Handling |
|---|---|---|---|
| Local test runner | Validate implementation | `ALLOWED` | Preserve command, status, and failure summary. |
| Browser/API runner | Validate product-visible behavior | `ALLOWED` | Preserve scenario, target URL/API, and result. |
| Context7 | Fetch current docs for a library API changed by the feature | `ALLOWED_READ_ONLY` | Resolve library ID first, record topic and source URL, summarize only needed API facts. |
| Plugin-provided MCPs | Use only if they own required repo, browser, design, or tracker context | `NEEDS_CONFIG_REVIEW` | Record plugin, server, tool, and approval mode. |
| Tracker MCP | Create/update ticket | `NEEDS_USER_REQUEST` | Use `issue-intake`; do not write tracker state from this lane by default. |

## Plan

1. Orchestrator confirms source criteria and file ownership.
2. Implementation lane patches the behavior slice and focused tests.
3. Validation lane prepares acceptance checks from specs and scenarios.
4. Merge owner aggregates command, diff, and scenario evidence.
5. Review-change checks Standards and Spec findings before closeout.

## Parallel Dependencies

- Can run with: validation planning that reads specs/scenarios and writes no
  product code.
- Must wait for: implementation before final functional pass.
- Conflicts with: shared public contract edits, unresolved product/design
  questions, and overlapping test rewrites.

## Handoff And Merge Contract

- Handoff summary: behavior implemented, checks run, unresolved failures.
- Required output: diff summary plus scenario and command evidence.
- Merge owner: `orchestrator`.
- Merge target: `docs/work/active.md`, lane packet, and closeout message.
- Evidence to preserve: test output, functional check, Context7 library ID if
  docs were used, and skipped-check rationale.
- Stop condition: all required validation is `PASS`, `BLOCKED`, or explicitly
  deferred with owner.

## Validation

| Check | Command Or Evidence | Status |
|---|---|---|
| Focused test | `<TARGETED_TEST_COMMAND>` | `PASS` |
| Type/lint/build | `<TYPECHECK_OR_LINT_OR_BUILD>` | `PASS` |
| Functional acceptance | `<BROWSER_OR_API_CHECK>` | `PASS` |
| Work-to-source coverage | `docs/patterns/workflow.md` matrix | `PASS` |

## Closeout

- Merge evidence: active row links command and scenario evidence.
- Report: write under `docs/work/reports/` only if the merge was
  decision-heavy, blocked, or multi-turn.
- Remaining risk: parallel validation may miss final UI state until rerun after
  implementation merges.
