# Work Lane: W-006 Browser Task Assessment And Refactor

Status: `OPEN`
Owner: `agent-engineer`
Created: 2026-07-27
Lane Model: `single-lane`
Next Gate: `implement-change after W-004 Gate A`
Execution Surface: `internal-subagent`
Dispatch State: `NOT_AUTHORIZED`
Dispatch Authorization: `none`
Runtime Handle: `none`

## Request

Assess the candidate Playwright browser task and refactor `browser` into one
public task kind with deterministic Playwright and optional Computer Use
drivers, isolated state, independent oracles, and replayable visual evidence.

## Acceptance Criteria

- The deterministic driver operates public UI controls and observable effects.
- The accepted browser seam can be exposed as an allowlisted structured tool
  to an agent-response task without giving the agent direct access to browser
  profiles, golden definitions, or unrestricted navigation.
- The Computer Use driver uses the shared screenshot/action loop without
  becoming a separate task kind.
- Batched Computer Use actions are normalized and checked one by one at
  execution time; the driver stops before the first denied or
  confirmation-required action and records the partial batch plus the next
  observation.
- Browser profiles, storage, extensions, environment variables, filesystem
  access, and network destinations are isolated or explicitly declared.
- Source-blind tasks cannot read evaluation definitions or golden results.
- Assertions/oracles, not model prose, determine mechanical success.
- Browser claims declare exact fixture/application, engine/profile, driver,
  policy, oracle, and coverage scope; an infrastructure canary cannot become a
  product, cross-browser, desktop, or mobile claim.
- Navigation, domain, download/upload, filesystem, account, clipboard, and
  external-action decisions use W-004 policy identities and are frozen with
  the action/observation evidence.
- Console errors, page errors, network failures, screenshots, traces, video,
  action counts, and cleanup are recordable.
- The existing browser smoke is preserved as an infrastructure canary and is
  not represented as broad product coverage.
- Every named browser run is performed by `simulation-operator`; its claims
  are aggregated only after `simulation-evaluator` emits an identity-matched
  evaluation receipt from frozen evidence.

## Scope

In:

- candidate Playwright task and fixture;
- browser deterministic and Computer Use driver boundaries;
- browser permissions, evidence, oracle, and cleanup fixtures.

Out:

- native desktop window control owned by W-009;
- mobile web/device behavior owned by W-010;
- autonomous access to arbitrary user browser profiles.

## Source Inputs

| Source | Path Or Tool | Why Needed | Freshness / Confidence |
|---|---|---|---|
| Program | W-004 Gate A and program report | shared driver/evidence contract | pending canonical gate |
| Candidate | branch browser task, Playwright spec, fixture, campaign | existing browser smoke | candidate branch snapshot |
| Testing pattern | `docs/patterns/testing/index.md` | browser/public-locator evidence | current |
| Provider reference | OpenAI Computer Use guide | current screenshot/action and safety model | fetched 2026-07-27 |

## Campaign Deliverables

| Campaign ID | Tier | Required Evidence Boundary | Status |
|---|---|---|---|
| `browser-simulation-smoke` | deterministic | Controlled fixture, exact browser/profile/driver identity, Playwright trace, independent oracle, frozen evidence, and cleanup | `OPEN` |
| `browser-computer-use-canary` | isolated live canary | Screenshot/action loop, policy decisions, injection resistance, action budgets, independent public-state oracle, and isolated-profile cleanup | `NOT_RUN` |

The deterministic smoke is an infrastructure canary only. The Computer Use
campaign has a separate runtime, permission, cost, and claim envelope and
cannot inherit a pass from Playwright.

W-006 also publishes its accepted browser tool seam and controlled fixture to
W-012. W-012 owns the composed profile and
`agent-browser-tool-canary` manifest; W-004 remains the shared-contract and
merge authority. This does not create another browser task kind.

## Behavior Examples

| ID | Example | Expected Evidence | Status |
|---|---|---|---|
| `BR-001` | Given the controlled maintenance fixture, Playwright completes it through public controls and the oracle verifies visible status. | Playwright trace and oracle | `OPEN` |
| `BR-002` | Given a Computer Use run, every proposed action is validated, executed, and followed by an observation until budget or completion. | action/observation JSONL | `OPEN` |
| `BR-003` | Given a forbidden domain, navigation is blocked and recorded without page interaction. | policy event | `OPEN` |
| `BR-004` | Given a plausible final screenshot but failed backend/file oracle, the task fails. | screenshot plus oracle failure | `OPEN` |
| `BR-005` | Given prompt injection in page content, it is treated as untrusted input and cannot expand permissions. | negative safety case | `OPEN` |
| `BR-006` | Given a successful browser smoke, the claim ledger supports only the exact fixture, browser identity, driver, and oracle scope. | scoped claim and coverage row | `OPEN` |
| `BR-007` | Given repeated runs write the same Playwright evidence path, each campaign freezes its own trace, screenshot, and evidence body before reduction. | independent per-run artifacts | `OPEN` |
| `BR-008` | Given an agent invokes the structured browser tool, every requested action passes the same browser policy and oracle boundary as a direct browser task, and the browser result remains independently attributable. | tool-call, browser action/policy trace, and browser result | `OPEN` |
| `BR-009` | Given one Computer Use response contains several actions, each action is validated immediately before execution and no later action runs after a denial or pending confirmation. | batched action trace, policy decisions, and next screenshot | `OPEN` |

## Feature Impact Matrix

| Feature / Flow | Source Docs Or Spec IDs | Code Areas / Public Contracts | Touched Directly? | Protected Adjacent Behavior | Required Check | Status | Route |
|---|---|---|---|---|---|---|---|
| Browser smoke | candidate branch | Playwright tooling, task, fixture | yes | existing deterministic completion proof | replayed smoke | `NOT_RUN` | `implement-change` |
| Computer Use | current request | browser driver/action policy | yes | deterministic browser remains cheaper default | driver matrix test | `NOT_RUN` | `functional-qa` |
| Desktop reuse | W-009 | visual action/observation contract | no | browser-specific DOM and profile logic stays local | adapter API review | `NOT_RUN` | `architecture-review` |

## File Ownership

| Path Or Area | Owner | Access | Notes |
|---|---|---|---|
| browser adapter and browser fixtures | W-006 | write | both drivers behind one task kind |
| isolated Playwright tooling | W-006 | write | preserve target root package authority |
| shared visual action types | W-004 | merge-only | W-006 proposes, W-004 owns |
| desktop/mobile adapters | W-009/W-010 | read | no platform logic here |

## Tool And MCP Context

| Tool Or MCP | Use | Permission / Approval | Result Handling |
|---|---|---|---|
| Playwright | deterministic controlled browser | isolated, allowlisted | trace/screenshots/oracle |
| Computer Use provider | optional visual driver | isolated; risky actions require confirmation | action and observation trace |
| arbitrary personal browser | none | forbidden | fail preflight |

## Plan

1. Audit candidate browser task, tooling isolation, evidence path creation,
   fixture semantics, and campaign reduction.
2. Define browser-specific preflight and environment identity behind W-004.
3. Refactor deterministic Playwright execution into the browser adapter.
4. Implement the shared Computer Use driver against an isolated browser with
   batched-action normalization, per-action validation, pause/deny semantics,
   budgets, domain/action allowlists, and observations.
5. Add deterministic oracles and negative cases for forbidden navigation,
   prompt injection, failed side effects, timeout, and cleanup.
6. Emit browser policy decisions and claim results through the W-004 contracts;
   freeze trace, screenshot, video, and oracle bodies inside each run.
7. Author both browser manifests and validate their distinct driver,
   execution-tier, permission, and evidence references in the campaign catalog.
8. Preserve the existing smoke as one named canary and add coverage metadata
   that prevents broader claims.
9. Publish the accepted structured browser-tool seam and controlled fixture to
   W-012 for the deterministic matrix and live agent-browser canary without
   coupling the browser adapter to Codex.

## Parallel Dependencies

- Can run with: W-005 and W-007 after W-004 Gate A.
- Must wait for: W-004 Gate A.
- Conflicts with: W-004 shared action/result schema and W-009 visual-driver
  implementation; publish the accepted visual interface before W-009 starts.

## Handoff And Merge Contract

- Handoff summary: deterministic versus Computer Use behavior, isolation,
  action policy, oracle coverage, and remaining browser gaps.
- Required output: browser adapter, both driver paths, fixtures, and evidence.
- Integration output: accepted structured browser-tool interface and fixture
  identity for W-012 composition.
- Merge owner: W-004.
- Merge target: canonical campaign foundation.
- Evidence to preserve: Playwright and Computer Use canary manifests
  separately, policy decisions, scoped claims, frozen evidence bodies, oracle,
  cleanup, and handoff receipts.
- Stop condition: deterministic smoke passes; live Computer Use is `PASS`,
  `FAIL`, `BLOCKED`, or explicitly `NOT_RUN`, never inferred from offline tests.

## Validation

| Check | Command Or Evidence | Status |
|---|---|---|
| Deterministic browser | controlled fixture campaign | `OPEN` |
| Isolation/policy | profile, env, domain, filesystem negative probes | `OPEN` |
| Claims/artifacts | scoped coverage, mutable-path overwrite, and frozen-evidence verification | `OPEN` |
| Computer Use adapter | fake action-loop self-test | `OPEN` |
| Live Computer Use | isolated browser canary | `NOT_RUN` |
| Cleanup | profile/context reset verification | `OPEN` |

## Status Reconciliation

- Last checked: `2026-07-30`
- Source identity: clean implementation baseline
  `master@60fdc2464b9782a689d3f53ffa8fc177f486e6a8`; revision-9 planning diff
  applied on top
- Completion disposition: `KEEP_OPEN`
- Reason: isolated Playwright harness tooling exists, but the browser campaign
  adapter, definitions, deterministic evidence, and Computer Use evidence are
  absent. Required gates remain `OPEN`/`NOT_RUN`.
- Synchronized surfaces: lane, active registry, report index, and IG-001 plan
  revision 9.

## Closeout

- Merge evidence: pending.
- Report: program report.
- Remaining risk: browser-engine and provider drift require version-bound
  evidence.
