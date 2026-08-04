# Work Lane: W-001 Harness Evaluation Lab

Status: `COMPLETE`
Owner: `agent-engineer`
Created: 2026-07-09
Lane Model: `evaluator-optimizer`
Next Gate: none

## Request

Analyze every Cascade harness surface, prepare many scenarios for every skill,
execute different cases one by one, capture results and traces, and build a
golden evaluation agent.

## Acceptance Criteria

- Every discovered skill has implicit, explicit, near-miss,
  missing-precondition, guardrail, output-contract, and handoff cases.
- Cross-skill collisions cover the main ambiguous routes.
- Existing and new custom-agent TOML files load in the current Codex runtime.
- Live target runs are serial, read-only, replayable, and preserve raw JSONL,
  stderr, normalized traces, grades, usage, and errors.
- Deterministic hard gates precede semantic golden evaluation.
- The evaluator distinguishes harness defects, model variance, scenario
  defects, and environment blockers.
- Cascade validation, catalog freshness, grader self-tests, and diff checks
  run before closeout.

## Scope

In:

- Cascade skills, agents, role wiring, routes, config, docs patterns,
  validators, scenario sources, runner, trace schema, and local run evidence.

Out:

- Product/runtime application code, external tracker writes, parallel
  delegation, user credentials, and telemetry configuration.

## Source Inputs

| Source | Path Or Tool | Why Needed | Freshness / Confidence |
|---|---|---|---|
| Request | current task | objective and execution requirement | current |
| Harness | `AGENTS.md`; `CODEX.md`; `.codex/`; `docs/`; `harness.config.yaml` | complete local contract | current working tree |
| Validator | `scripts/validate_cascade_codex.py` | current mechanical invariants | current working tree |
| Runtime | `codex --version`; `codex doctor --json`; `codex debug models`; `codex exec --json` | actual custom-agent loading and trace behavior | observed 2026-07-09 |
| Official Codex | Subagents and custom-agent schema | required TOML shape | current official docs |

## Behavior Examples

| ID | Example | Expected Evidence | Status |
|---|---|---|---|
| `HE-001` | Given a discovered skill, when the catalog is generated, then all seven scenario families exist exactly once. | `catalog --check` | `PASS` |
| `HE-002` | Given a live implicit prompt, when Codex routes it, then the expected skill is primary and its contract is loaded. | raw and normalized JSONL | `PASS` |
| `HE-003` | Given a near-miss prompt, when Codex routes it, then the target skill is rejected as primary and the adjacent owner is selected. | per-case grade | `PASS` |
| `HE-004` | Given a read-only case, when an agent attempts mutation, network, or delegation, then the hard gate fails regardless of final prose. | grader self-test and live trace | `PASS` |
| `HE-005` | Given a missing trace or failed model environment, when graded, then the case is BLOCKED rather than passed. | grader self-test and preflight trace | `PASS` |
| `HE-006` | Given traces from multiple catalog revisions, when current coverage is calculated, then only exact current scenario definitions with accepted evidence count. | current coverage ledger | `PASS` |

## Feature Impact Matrix

| Feature / Flow | Source Docs Or Spec IDs | Code Areas / Public Contracts | Touched Directly? | Protected Adjacent Behavior | Required Check | Status | Route |
|---|---|---|---|---|---|---|---|
| Custom agents | official schema; request | `.codex/agents/*.toml`; companion role files | yes | existing role behavior and delegation policy | `codex doctor --json`; Cascade validator | `PASS` | `codex-maintenance` |
| Skill routing | all `SKILL.md` files | `harness-evals/`; `CODEX.md`; skill maps | yes | current canonical cascade | catalog and live route cases | `PASS` | `harness-evaluation` |
| Validation | request | both Python scripts | yes | existing Cascade checks and output labels | compile, self-test, validator | `PASS` | `validate-change` |
| Durable patterns | request | `docs/patterns/agent-evaluation/` | yes | existing pack schema and retrieval | context-pack builder and validator | `PASS` | `pattern-context` |

## File Ownership

| Path Or Area | Owner | Access | Notes |
|---|---|---|---|
| `.codex/agents/`; `.codex/skills/harness-evaluation/` | Agent Engineer | write | custom-agent and skill contracts |
| `harness-evals/`; `scripts/run_harness_evals.py` | Agent Engineer | write | corpus, schema, runner, grader |
| `.artifacts/harness-evals/` | eval runner | write | ignored local evidence only |
| product/spec/design/brand source docs | user/current work | read | no unrelated edits |

## Tool And MCP Context

| Tool Or MCP | Use | Permission / Approval | Result Handling |
|---|---|---|---|
| local Codex CLI | serial read-only target scenarios and diagnostics | allowed by user request; no delegation | raw JSONL plus normalized local evidence |
| official Codex docs | verify custom-agent schema | read-only | distilled into role/TOML contract |
| web, connectors, external apps | none in target scenarios | forbidden | blocked by target prompt and grader |

## Plan

1. Inventory every skill, agent, config, docs, validator, and referenced resource.
2. Build the scenario, trace, scoring, root-cause, and storage contracts.
3. Implement the evaluator role, skill, pattern, corpus, runner, and wiring.
4. Run static audit and serial implicit/near-miss live cases for every skill.
5. Review failures, repair evaluator defects, validate, and write a durable report.
6. Execute the remaining five scenario families and prove exact 290/290
   current-catalog execution while preserving any real failed acceptance gate.

## Parallel Dependencies

- Can run with: none; live target experiments are deliberately serial.
- Must wait for: catalog freshness, valid custom-agent TOML, and grader self-test.
- Conflicts with: concurrent edits to skill contracts, role TOMLs, eval sources,
  runner, validator, or harness routing docs.

## Handoff And Merge Contract

- Handoff summary: scenario coverage, run metrics, confirmed harness gaps,
  environment blockers, and replay commands.
- Required output: generated catalog, evaluator artifacts, local trace run, and
  durable report.
- Merge owner: Agent Engineer.
- Evidence to preserve: validator output, catalog digest, run summary, audit
  findings, and residual risks.
- Stop condition: required checks complete or a repeated environment blocker is
  recorded without claiming live coverage.

## Validation

| Check | Command Or Evidence | Status |
|---|---|---|
| Catalog freshness | `python3 scripts/run_harness_evals.py catalog --check` | `PASS` |
| Grader behavior | `python3 scripts/run_harness_evals.py self-test` | `PASS` |
| Agent runtime loading | `codex doctor --json` | `PASS` for project custom agents |
| Cascade invariants | `python3 scripts/validate_cascade_codex.py` | `PASS` |
| Live skill matrix | implicit and near-miss cases for all skills | `PASS` |
| Full current catalog | `.artifacts/harness-evals/coverage-final-20260710.json`: 290/290 executed, 289/290 accepted | `FAIL`: confirmed `HS-implement-change-handoff` regression |

## Closeout

- Merge evidence: 341 target traces and 13 golden judgments across both phases;
  the current catalog is 290/290 executed and 289/290 accepted.
- Report: `docs/work/reports/2026-07-09-harness-evaluation-lab.md`.
- Confirmed finding: `HS-implement-change-handoff` failed 3/3 current-definition
  Sol runs and remains unaccepted; `HS-hypothesis-scoring-handoff` is flaky at
  1/3.
- Remaining risk: run evidence does not yet fingerprint all model-read harness
  sources, and most otherwise accepted definitions have one repetition.
