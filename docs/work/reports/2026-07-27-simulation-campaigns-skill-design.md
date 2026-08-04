# Simulation Campaigns Skill Design

- Status: reviewed implementation contract
- Date: 2026-07-27
- Owner: Agent Engineer
- Source: current user request and
  `docs/work/reports/2026-07-27-cross-surface-simulation-program.md`
- Implementation scope: skill, role and route wiring, repository docs,
  validation, and harness-routing cases
- Runtime scope: explicitly excluded from this slice

## Intent

Create one focused skill that owns versioned simulation campaign authoring,
selection, dispatch/replay planning, receipt aggregation, claim projection,
and reporting across command, HTTP, terminal, browser, desktop, mobile, and
agent-response contours. Mutable execution and independent evaluation are
separate skills and agent roles.

The skill must preserve five adjacent authorities:

- `functional-qa` owns product-visible behavior examples and acceptance
  oracles;
- `simulation-execution` and `simulation-operator` own one approved mutable
  run, evidence freezing, cleanup, and the execution receipt;
- `simulation-evaluation` and `simulation-evaluator` own read-only
  cross-contour evidence and claim evaluation;
- `harness-evaluation` owns Cascade skill, route, agent, response, and JSONL
  trace grading;
- `codex-maintenance` owns changes to schemas, runners, validators, skills,
  agents, and repository wiring.

## Context Inventory

| Source | Use |
|---|---|
| Current cross-surface program and W-004 through W-010 plus W-012 | Contours, direct and composed campaign portfolio, claims, policies, evidence, identity, and handoffs |
| Existing `functional-qa` skill | Product-visible acceptance boundary |
| Existing `harness-evaluation` skill | Cascade trace and semantic-evaluation boundary |
| Existing `codex-maintenance` skill | Harness machinery and repository-surface boundary |
| Agent Engineer role and skill map | Owning role and activation |
| `CODEX.md`, `docs/structure.md`, and `docs/glossary.md` | Routing, file placement, and vocabulary |
| Validator and harness scenario registries | Mechanical discovery, wiring, and route-collision gates |

No external framework or version-specific technical fact is required for this
contract, so no web or library-documentation lookup is needed.

## Trigger Matrix

| Request | Primary route | Reason |
|---|---|---|
| Author, select, replay-plan, aggregate, or report a mobile, desktop, browser, terminal, command, or agent-response campaign | `simulation-campaigns` | Campaign intent and portfolio lifecycle |
| Execute one approved selected campaign and freeze its evidence | `simulation-execution` | Mutable runtime lifecycle and cleanup |
| Independently assess a frozen cross-contour run and its claims | `simulation-evaluation` | Read-only evidence, policy, oracle, and claim judgment |
| Prove one visible product flow without campaign selection or aggregation | `functional-qa` | Product acceptance is the requested outcome |
| Grade generated Cascade scenarios or JSONL traces | `harness-evaluation` | Harness behavior and trace grading are the requested outcome |
| Add or change a campaign runner, schema, validator, or skill wiring | `codex-maintenance` | Repository machinery must change |

## Contract Decisions

- A campaign declares one primary contour, driver, tier, platform scope,
  runtime identity, evidence contract, cleanup contract, and handoff.
- Computer Use is an optional driver for browser, terminal, desktop, and
  mobile contours. It is not an oracle.
- Standalone Codex-agent campaigns and Cascade harness campaigns share
  campaign infrastructure but keep distinct task, runtime, policy, oracle, and
  artifact identities.
- Claims reduce only from applicable policies, required oracles, and frozen
  evidence carried by identity-matched execution and evaluation receipts.
- Operator and evaluator identities differ; Cascade trace claims first require
  a specialized `harness-evaluator` receipt.
- Authored, validated, executed, graded, calibrated, deployed, and
  release-eligible remain separate statuses.
- Runtime source folders and runners remain planned until W-004 implements
  them; their absence is `GAP`, and all live campaign execution is `NOT_RUN`.

## Artifact Matrix

| Artifact | State after this slice | Runtime dependency |
|---|---|---|
| `.codex/skills/simulation-campaigns/SKILL.md` | implemented | none |
| Campaign design template and quality checklist | implemented | none |
| Agent Engineer and adjacent-skill routing | implemented | none |
| `simulation-execution` skill and `simulation-operator` role | implemented contract | W-004 for runtime conformance |
| `simulation-evaluation` skill and `simulation-evaluator` role | implemented contract | W-004 for receipt storage and runtime conformance |
| Repository route, structure, and glossary docs | implemented | none |
| Validator and harness route cases | implemented | none |
| `product-evals/campaigns/`, tasks, simulations, claims, policies, oracles, and rubrics | planned | W-004 |
| Campaign runner, atomic reservation/lease, recovery, and append-only receipt namespaces under `.artifacts/campaigns/` | planned and `NOT_RUN` | W-004 and contour lanes |

## Validation Evidence

| Gate | Result |
|---|---|
| New-skill package validation | `PASS`: skill-creator `quick_validate.py` with a PyYAML-capable Python environment |
| Task-scoped dependency-excluded source validator | `PASS`: 9 agents, 41 skills, zero project-specific leakage, zero standalone legacy review aliases |
| Aggregate Cascade repository validator | `FAIL`: 36 installed root and `.codex/harness-tooling` Playwright `node_modules` false positives |
| Generated harness catalog check | `PASS`: 41 skills, 319 scenarios, digest `f975c361819767d05319b7f4b636fa8b9e211e3c56b2005de930dd4d665d6552` |
| Harness evaluator self-test | `PASS`: 15 cases |
| Harness static audit | `PASS`: zero findings |
| Python and JSON syntax | `PASS` |
| Diff whitespace | `PASS` |
| Live harness execution for new cases | `NOT_RUN` |
| Live campaign execution | `NOT_RUN` |
| Live model or semantic calibration | `NOT_RUN` |

Structural and routing success proves the skill/docs contract only. It does not
prove runtime readiness, campaign execution, semantic quality, deployment, or
release eligibility.
