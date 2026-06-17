# Testing Patterns

Use this file for functional acceptance, browser/API/CLI checks, scenario
tests, and semantic test autorepair.

## Functional Acceptance

Functional checks verify visible behavior, public API contracts, CLI behavior,
journey outcomes, or observable side effects.

Layer choice:

- route-mocked browser scenario for deterministic UI behavior;
- live end-to-end test for integration confidence;
- API contract check for backend/service boundaries;
- CLI or command journey for tool-like products;
- manual visible evidence only when automation is unavailable or misleading.

Validation mode:

- executable proof: run or author the smallest unit, integration, contract,
  E2E, scenario, API, CLI, or browser check that proves the behavior;
- source-blind browser proof: operate the running app as a user would and
  verify visible text, controls, URLs, enabled or disabled state, screenshots,
  console errors, and observable side effects; inspect source only when the
  user asks for diagnosis or owner mapping.

Outcome terms:

- `PASS`: required behavior is proven.
- `FAIL`: behavior or required coverage is missing.
- `BLOCKED`: required evidence cannot run because a precondition is unavailable.
- `NOT_RUN`: optional or out-of-scope check was not run.
- `GAP`: expected behavior is missing or ambiguous.

## Browser And E2E

- Use public locators: role, label, placeholder, text, stable test ID.
- Avoid CSS, XPath, class names, and private component details when possible.
- Guard credential or environment requirements explicitly.
- Use cleanup in `try/finally` for state mutations.
- Prefer polling or web-first assertions over arbitrary sleeps.
- Capture trace, screenshot, video, console, or network evidence when useful.

## Scenario Tests

Traceability:

```text
docs/product/scenarios.md
  -> executable scenario or functional test
  -> docs/work/active.md or docs/work/lanes/*.md for the active work overlay
```

Rules:

- Mock only the boundary needed for determinism.
- Keep fixture data explicit.
- Preserve scenario IDs when updating expectations.
- Do not create broad scenario suites just because a product scenario file
  exists.
- Multi-step flows should track carried state and duplicate side effects.
- Do not mark skipped or environment-gated checks as `PASS`.
- Do not mock the behavior being tested.

## Semantic Test Autorepair

Use when a test, scenario, fixture, mock, locator, route harness, or runner
configuration is failing, flaky, or stale.

Failure classes:

- `product-regression`
- `test-drift`
- `locator-drift`
- `timing-flake`
- `fixture-drift`
- `infrastructure-blocker`
- `ambiguous`

Forbidden repairs:

- deleting failing tests without equivalent coverage;
- weakening assertions to generic load/existence checks;
- blind snapshot updates without visual review;
- arbitrary sleeps when observable waits exist;
- skipping required checks without reporting `BLOCKED`.
