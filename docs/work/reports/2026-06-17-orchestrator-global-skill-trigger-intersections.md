# Orchestrator And Global Skill Trigger Intersection Audit

Date: 2026-06-17

## Request

- User request: analyze whether the Orchestrator and global skill descriptions or triggers intersect or conflict, especially around implementation planning, `implement-change`, `plan-change`, workflow wording, and `agentic-workflow-builder`.
- Non-goal: do not rewrite all skills in this pass.

## Loaded Surfaces

| Surface | Evidence |
|---|---|
| Orchestrator role | `.codex/agents/orchestrator/AGENT.md` |
| Main route docs | `AGENTS.md`, `CODEX.md`, `.codex/README.md`, `docs/patterns/workflow.md` |
| Workflow-specific skills | `.codex/skills/agentic-workflow-builder/SKILL.md`, `.codex/skills/orchestrate-work/SKILL.md` |
| Implementation lifecycle skills | `.codex/skills/plan-change/SKILL.md`, `.codex/skills/implement-change/SKILL.md`, `.codex/skills/functional-qa/SKILL.md`, `.codex/skills/review-change/SKILL.md`, `.codex/skills/validate-change/SKILL.md`, `.codex/skills/test-autorepair/SKILL.md`, `.codex/skills/closeout/SKILL.md` |
| Domain review skills | `.codex/skills/ux-flow-review/SKILL.md`, `.codex/skills/visual-qa/SKILL.md`, `.codex/skills/accessibility-review/SKILL.md`, `.codex/skills/secure-design/SKILL.md`, `.codex/skills/architecture-review/SKILL.md` |
| Harness maintenance skills | `.codex/skills/codex-maintenance/SKILL.md`, `.codex/skills/develop-skill/SKILL.md`, `.codex/skills/agents-best-practices/SKILL.md` |
| Mechanical trigger checks | `scripts/validate_cascade_codex.py` |

## Verdict

There is no critical direct conflict in the current skill descriptions. The main implementation route has clear stage ownership:

`orchestrate-work` owns lane splitting and dependency tracking.

`plan-change` owns the normal implementation plan for non-atomic changes.

`functional-qa` owns product-visible acceptance evidence.

`implement-change` owns scoped edits after enough context exists.

`review-change` owns fixed-point Standards/Spec review.

`validate-change` owns evidence aggregation.

`agentic-workflow-builder` now owns only a requested agent/skill workflow artifact.

The broad Orchestrator description is acceptable because it is a role-level sequencing contract, not a competing task skill. It names the route and delegates to stage owners.

## Actual Intersections

| Prompt Wording Or Concept | Skills That Can Match | Current Boundary | Risk |
|---|---|---|---|
| "Build a workflow" | `agentic-workflow-builder`, `orchestrate-work`, `ux-flow-review`, `secure-design`, `validation-experiments`, market skills | The requested output decides ownership. Agent/skill workflow packet goes to `agentic-workflow-builder`; active work lanes go to `orchestrate-work`; product UX workflow goes to `ux-flow-review`; security workflow/agent-tool plan review goes to `secure-design`; market experiment workflow goes to market-validation lane skills. | Medium, because "workflow" is overloaded. |
| "Plan this change" | `plan-change`, `agentic-workflow-builder`, `orchestrate-work`, `synthesis-to-spec`, `ingest-spec` | Normal implementation plan goes to `plan-change`; multi-lane planning goes through `orchestrate-work`; incoming material normalization goes to `ingest-spec`; evidence synthesis before specs goes to `synthesis-to-spec`; a reviewable agent/skill workflow packet goes to `agentic-workflow-builder` only when explicitly requested. | Low after the workflow-builder description tightening. |
| "Implement this workflow" | `implement-change`, `plan-change`, `agentic-workflow-builder`, `ux-flow-review` | If it means product/code behavior, use `plan-change -> implement-change`; if it means author an agent/skill workflow packet, use `agentic-workflow-builder`; if it means evaluate a product flow, use `ux-flow-review`. | Medium because "workflow" plus "implement" can hide artifact intent. |
| "Review the workflow" | `review-change`, `ux-flow-review`, `secure-design`, `agentic-workflow-builder`, `architecture-review` | Diff/PR/WIP review goes to `review-change`; product flow review goes to `ux-flow-review`; insecure design review goes to `secure-design`; agent/skill packet audit goes to `agentic-workflow-builder`; cross-boundary module risk goes to `architecture-review`. | Medium. |
| "Validate the workflow" | `validate-change`, `functional-qa`, `visual-qa`, `accessibility-review`, `agentic-workflow-builder` | Product acceptance evidence goes to `functional-qa`; aggregate final evidence goes to `validate-change`; visual evidence goes to `visual-qa`; accessibility review goes to `accessibility-review`; workflow-packet quality goes to `agentic-workflow-builder` checklist. | Medium. |
| "Handoff / delegation workflow" | `agentic-workflow-builder`, `orchestrate-work`, `closeout`, `codex-maintenance` | Delegation packet/checklist goes to `agentic-workflow-builder`; active lane handoff goes to `orchestrate-work`; final task handoff goes to `closeout`; harness handoff surface changes go to `codex-maintenance`. | Low if artifact wording is preserved. |

## Skill-Level Findings

### Orchestrator

Status: healthy overlap.

The Orchestrator description intentionally covers the full lifecycle: context, ingest, docs impact, planning, acceptance, implementation, review, validation, repair, and closeout. This is not a conflict because the body routes each stage to a named skill and explicitly keeps human review from becoming a standalone router.

Recommended adjustment: none required. Optional future improvement is to add one sentence saying it is a sequencing role, not an artifact owner.

### agentic-workflow-builder

Status: good trigger after tightening.

The current description is specific enough: it requires the user to explicitly ask for an agent/skill workflow artifact and names concrete artifacts: workflow checklist, workflow packet, delegation workflow, or multi-agent workflow. The body also says not to use it just because work involves implementation, planning, execution, validation, or delegation.

Remaining risk: `scripts/validate_cascade_codex.py` still checks a looser trigger pattern: `agentic workflow|workflow packets|prompts`. That can allow future descriptions to drift back toward generic workflow ownership.

Recommended adjustment: update the validator requirement to expect `agent/skill workflow artifact` or equivalent artifact-bound wording.

### orchestrate-work

Status: distinct from workflow-builder.

`orchestrate-work` owns active work lanes: split, serialize, schedule, track, and merge. It is operational state management, not prompt-packet authoring. It should be used before `plan-change` when work may split into lanes or conflict through file ownership, dependencies, shared decisions, or validation gates.

Recommended adjustment: none required.

### plan-change

Status: distinct from workflow-builder and implement-change.

`plan-change` owns the normal plan before non-atomic implementation. It captures intended behavior, examples, slice boundary, risks, and validation plan. It should not produce delegation prompts or agent workflow packets unless the user asks for that artifact.

Recommended adjustment: none required. Optional route-doc matrix can state: "normal implementation plans belong to `plan-change`; workflow packets belong to `agentic-workflow-builder`."

### implement-change

Status: distinct.

`implement-change` is scoped to code or doc edits after a clear request or approved plan. It explicitly does not own open-ended planning.

Remaining risk: the validator registers `implement-change` as a required skill, but `SKILL_TRIGGER_REQUIREMENTS` does not currently include an `implement-change` trigger requirement. That means description drift would be less mechanically visible than for `plan-change` or `orchestrate-work`.

Recommended adjustment: add a validator trigger requirement for `implement-change` such as `clear request|approved plan` plus `scoped code or doc changes|implementation|bug fixing`.

### functional-qa and validate-change

Status: healthy sequencing overlap.

`functional-qa` proves product-visible behavior at the boundary. `validate-change` aggregates command, test, diff, functional, and review evidence into a status. Their overlap on "validation" is expected and well-separated by evidence type.

Remaining risk: `validate-change` also lacks a trigger requirement in `SKILL_TRIGGER_REQUIREMENTS`, so future description drift would be less visible.

Recommended adjustment: add trigger requirements for `validate-change` and `review-change`.

### ux-flow-review

Status: mostly distinct, but has the biggest word-level overlap.

The description says "session workflow" and "workflow findings", but the scope is product UX: feature, screen, wizard, dashboard, session workflow, or UI state. It does not edit runtime code. This is distinct from agentic workflow packet creation.

Remaining risk: the validator trigger regex includes bare `workflow` for `ux-flow-review`. That makes the validator less helpful for preventing workflow-builder confusion.

Recommended adjustment: tighten validator wording to `UX review|session workflow|screen|dashboard` instead of bare `workflow`.

### secure-design

Status: distinct but intentionally adjacent.

`secure-design` can review a proposed feature, workflow, architecture, or agent/tool plan for insecure design. This intentionally intersects with workflow-builder when an agent/tool workflow packet has security risk. It should not own the workflow packet itself unless the requested output is a security design review.

Recommended adjustment: none required. A route matrix can state that security concerns inside a workflow packet become a `secure-design` gate or review lane.

### develop-skill and codex-maintenance

Status: broad but acceptable.

`develop-skill` owns creating or updating reusable skill packages. `codex-maintenance` owns broader Cascade surfaces such as agents, skills, config, validators, hooks, and handoffs. They can co-trigger for skill audits and changes, but that is expected because one is a skill-authoring method and the other is the harness-maintenance surface policy.

Recommended adjustment: none required.

## Decision Rule To Add To Route Docs

When a user says "workflow", classify by requested output before loading the workflow-builder:

| Requested Output | Route |
|---|---|
| Agent/skill workflow packet, checklist, prompt bank, delegation workflow, or multi-agent workflow | `agentic-workflow-builder` |
| Active work lanes, dependencies, scheduling, serialization, merge owner, validation gates | `orchestrate-work` |
| Normal implementation plan, behavior examples, risks, validation plan | `plan-change` |
| Code/doc edits for a clear task | `implement-change` |
| Product UX flow, wizard, screen, dashboard, state coverage | `ux-flow-review` |
| Security review of feature/workflow/agent-tool plan | `secure-design` |
| Market/product validation workflow or experiments | `market-validation` plus focused lane skills |
| Final evidence/handoff | `validate-change` or `closeout` |

## Minimal Update Surfaces

Priority 1:

- Update `scripts/validate_cascade_codex.py` trigger requirements for `agentic-workflow-builder` so it preserves artifact-bound wording.
- Add trigger requirements for `implement-change`, `review-change`, and `validate-change`.
- Tighten `ux-flow-review` validator trigger away from bare `workflow`.

Priority 2:

- Add the decision rule above to `docs/patterns/workflow.md` or `CODEX.md`.
- Optionally add one Orchestrator sentence clarifying that it is a sequencing role, not a task artifact owner.

Priority 3:

- Add two or three route examples to the workflow-builder template/checklist:
  - "Build an agent workflow for implementing X" -> workflow-builder packet, then route implementation gates inside the packet.
  - "Plan implementation for X" -> `plan-change`, not workflow-builder.
  - "Review checkout workflow UX" -> `ux-flow-review`, not workflow-builder.

## Conclusion

The current descriptions do not materially conflict. The main routing problem is not the Orchestrator or implementation skills; it is the overloaded word "workflow" across agent packets, active lanes, UX flows, security reviews, and market experiments. The recently tightened `agentic-workflow-builder` description solves most of this at the skill level. The next best improvement is to align validator trigger requirements and add a compact workflow-output decision matrix to route docs.
