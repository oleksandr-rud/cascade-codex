# Skill Design Brief: `judge-eval-builder`

Status: `reviewed`
Date: 2026-07-22
Owner role: `agent-engineer`
Source: W-002 judged harness evaluation request

## Context Inventory

| Surface | Path Or Query | Why Checked | Result |
|---|---|---|---|
| user request | W-002 | intent | replace score graders with real judges and measurable evals |
| existing skill | `.codex/skills/harness-evaluation/SKILL.md` | owner collision | runtime execution and evidence consumption remain separate |
| adjacent skills | `develop-skill`, `agents-best-practices` | trigger overlap | builder owns judge contracts; adjacent skills own packaging and general design |
| owning agents | `.codex/agents/agent-engineer/` | wiring | Agent Engineer owns creation and maintenance |
| route docs | `CODEX.md` | workflow fit | builder precedes live harness judgment when contracts change |
| validator | `scripts/validate_cascade_codex.py` | invariants | profiles, rubrics, schema, and wiring require structural checks |
| Context7 MCP | n/a | technology docs | no third-party runtime introduced |
| Perplexity/web | n/a | external practices | repository contracts were sufficient |

## Intent

- Problem prevented: opaque point graders and self-authored judge criteria that cannot measure semantic effectiveness.
- Repeated task: define or revise judge profiles, anchored rubrics, schemas, calibration cases, and acceptance aggregation.
- Owning role: Agent Engineer.
- Target users: Cascade maintainers and harness evaluators.
- Runtime or packaging target: repository-local Codex skill and harness eval contracts.
- Expected outputs: versioned profiles, rubrics, response schema, calibration plan, adversarial checks, and validator wiring.
- Done condition: every required judge is independent, schema-valid, score-recomputed by the harness, and covered by synthetic contract tests.
- File write scope: `evals/harness/`, this skill package, owning agent wiring, validator, and directly affected docs.

## Trigger Contract

| Prompt Or Situation | Should Trigger? | Route | Notes |
|---|---|---|---|
| create outcome and trajectory judges | yes | `judge-eval-builder` | owns profiles and rubrics |
| run judges on completed traces | no | `harness-evaluation` | runtime evidence task |
| repair a failing target skill | no | `codex-maintenance` | evaluator must not self-repair |
| design a general agent system | no | `agents-best-practices` | broader architecture task |

## Ruleset

| Rule Type | Rule | Source | Status |
|---|---|---|---|
| required behavior | separate outcome and trajectory judgments | W-002 | new |
| forbidden behavior | never use mechanical point totals as semantic quality | W-002 | new |
| source order | request, current eval contracts, traces, owning sources, validator | repository | new |
| output contract | versioned profile, rubric, schema, calibration, and aggregation decision | W-002 | new |
| validation gate | self-test, catalog, validator, and adversarial judge checks | W-002 | new |

## Technology References

- Context7 library ID: n/a
- Topic/query: n/a
- Version or freshness signal: repository source digest
- Distilled API/setup/technique facts: structured Codex output is validated by JSON Schema; the harness recomputes weighted scores.
- Perplexity/web discovery used only for: n/a

## Artifact Decision Matrix

| Artifact | Decision | Why |
|---|---|---|
| `SKILL.md` | create | distinct repeated contract-authoring task |
| `templates/` | create | make judge design reviewable before implementation |
| `checklists/` | create | prevent leakage, anchoring, and uncalibrated acceptance |
| `references/` | create | define canonical judged-eval contract |
| `scripts/` | no-change | shared runner owns execution and aggregation |
| `assets/` | no-change | no media needed |
| `agents/openai.yaml` | no-change | repository skill has no standalone UI metadata |
| validator | update | enforce new artifacts and wiring |

## Stage Gates

| Stage | Result | Issues | Repair Or Limitation |
|---|---|---|---|
| intent | PASS | none | distinct creation versus execution boundary |
| contract | PASS | none | required dual-judge aggregation defined |
| challenge | PASS | judge bias and leakage | blind prompts and adversarial cases required |
| artifact map | PASS | none | minimal package selected |
| validation | PASS | live calibration unavailable | report authored and synthetic evidence separately |

## Validation

- Frontmatter: validator-backed.
- Path references: validator and direct path checks.
- Agent wiring: Agent Engineer only.
- Validator: `python3 scripts/validate_cascade_codex.py`.
- Whitespace: `git diff --check`.
- Sample prompts: source catalog cases plus interaction collision.
- Forward-test status: synthetic contract tests required; live judge calibration remains separately evidenced.

## Handoff

- Files changed: skill package, eval contracts, runner, role wiring, validator, and docs.
- Deferred decisions: human-labeled calibration corpus and inter-rater thresholds need collected evidence.
- Next route: `harness-evaluation` after judge contracts validate.
