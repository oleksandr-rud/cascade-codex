# Skill Governance Research

Date: 2026-06-04

## Question

The current harness can route incoming specs into product, design, brand, and
spec docs, but it relies too much on closeout drift scans. The next skill
iterations need proactive dependency checks and stronger product, brand, and
design contracts.

## Source Families Reviewed

- OpenAI Codex customization, skills, subagent, hook, and workflow guidance.
- Anthropic terminal-agent customization guidance for project instructions,
  skills, subagents, hooks, and SDK setting sources.
- Google ADK guidance for specialized agents, workflow agents, callbacks,
  plugins, observability, and evaluation.
- OpenHands skill/context, skill lifecycle, sub-agent delegation, observability,
  and iterative refinement guidance.
- AgentSkills open format guidance for portable `SKILL.md` packages,
  progressive disclosure, descriptions, references, scripts, and validation.
- Aider guidance for convention files plus lint/test repair loops.
- Cursor rules guidance for scoped reusable instructions and simple
  `AGENTS.md` alternatives.
- Product-workflow harness examples that model product, analysis, UX, writing,
  architecture, development, and test-generation roles as structured skills.

## Cross-Provider Practices

- Keep always-loaded instructions thin and stable; move specialized workflows to
  on-demand skills.
- Make skill descriptions trigger-focused because the description is the
  discovery surface.
- Use progressive disclosure: load summaries first, full skill instructions
  only when relevant, and references/scripts only as needed.
- Separate advisory guidance from deterministic enforcement. Use validators,
  hooks, callbacks, scripts, tests, or checklists when a rule must always hold.
- Isolate high-volume research or review work so summaries, source IDs, and
  evidence return to the main lane instead of raw exploration history.
- Track explicit state, source identity, context loaded, validation evidence,
  and next gate for long-running or multi-agent work.
- Prefer iterative critique loops for quality-sensitive artifacts: produce,
  review against a rubric, repair, and stop only when evidence meets the gate.
- Treat external tools and connectors as permissioned surfaces with narrow
  scope, source tracking, and trust review.

## Iteration Plan

1. `docs-impact-map`: add proactive cross-folder dependency mapping between
   source ingestion, discovery, planning, functional acceptance, and closeout.
2. `product-discovery`: strengthen durable PRD, persona, journey,
   requirement, scenario, non-goal, and success metric formats.
3. `brand-positioning`: add positioning, audience, promise, proof, tone,
   naming, message hierarchy, copy, and visual direction governance.
4. `design-system`: add token, component, accessibility,
   density, responsive, interaction-state, and visual evidence rules.
5. Validator upgrades: validate skill registration, cross-link references,
   scenario/persona IDs, transformed spec links, and required impact-map
   surfaces.

## Per-Skill Research Application

### `docs-impact-map`

- Codex and AgentSkills practice applied: trigger-focused description,
  progressive disclosure, and a compact template instead of a large always-on
  instruction block.
- Anthropic terminal-agent practice applied: keep high-volume review and
  dependency exploration summarized, with source IDs and next gates returned to
  the main lane.
- Google ADK practice applied: separate model judgment from deterministic
  lifecycle checks; the skill classifies impact statuses, and the validator
  enforces mechanical wiring.
- Open-source harness practice applied: keep source identity, owner docs, and
  state transitions explicit so work can resume after compaction or handoff.

### `product-discovery`

- Codex and AgentSkills practice applied: one focused skill for durable product
  artifacts, with PRD and persona templates loaded only when needed.
- Anthropic terminal-agent practice applied: isolate product research from
  implementation so uncertain assumptions do not silently become code changes.
- Google ADK practice applied: break a monolithic discovery process into a
  reusable workflow with explicit artifacts, state, and evaluation handoff.
- Product-workflow harness practice applied: keep PRDs, personas, journeys,
  scenarios, non-goals, and success metrics traceable to acceptance evidence.

### `brand-positioning`

- Codex and AgentSkills practice applied: explicit trigger words for brand,
  tone, naming, message hierarchy, copy, and visual direction.
- Anthropic terminal-agent practice applied: narrow the skill to brand/content
  decisions so it does not absorb product behavior or design-system work.
- Google ADK practice applied: route side effects through explicit callbacks in
  the harness model: product effects go to `product-discovery`, design effects
  go through `docs-impact-map`, and visible text checks go to
  `functional-qa`.
- Open-source harness practice applied: use structured message maps and avoid
  ungrounded market claims.

### `design-system`

- Codex and AgentSkills practice applied: keep the skill focused on token,
  component, accessibility, layout, responsive, interaction-state, and visual
  evidence rules.
- Anthropic terminal-agent practice applied: keep design exploration and visual
  review bounded by source docs, code, screenshots, and summarized evidence.
- Google ADK practice applied: combine non-deterministic design judgment with
  deterministic validation signals such as browser, visual, accessibility, and
  functional checks.
- Open-source harness practice applied: use component/state templates so future
  agents can preserve behavior instead of rewriting style guidance from memory.

### Validator Upgrades

- Codex and AgentSkills practice applied: validate frontmatter, registered
  skills, required files, and required surface strings.
- Anthropic terminal-agent practice applied: enforce routing and context rules
  outside prose where possible.
- Google ADK practice applied: add deterministic checks for artifacts and
  traceability rather than relying on model self-report.
- Open-source harness practice applied: preserve resumability by validating
  IDs, links, packet headings, and token status fields.

## Iteration 1 Decision

Start with `docs-impact-map` because it is the connector all later product,
brand, and design skills depend on. Product, brand, design, and spec skills can
be deepened safely only after the harness has a repeatable way to ask: "what
else must be checked when this doc fact changes?"

## Iteration 2 Decision

Add `product-discovery` as a specialized skill instead of stretching the broad
`discover` router. The new skill owns durable PRD, persona, requirement,
journey, scenario, non-goal, success metric, and acceptance-criteria structure.
It hands cross-folder effects to `docs-impact-map` and plan-ready behavior to
`plan-change` or `functional-qa`.

## Iteration 3 Decision

Add `brand-positioning` as a separate brand/content skill. Product behavior and
brand language overlap, but they fail in different ways: product docs need
outcomes and acceptance, while brand docs need audience, category, promise,
proof, tone, naming, message hierarchy, copy rules, and visual direction. The
skill records visual direction as brand intent and routes token/component
effects through `docs-impact-map`.

## Iteration 4 Decision

Add `design-system` as the design and UX rule owner. The skill covers tokens,
components, accessibility, layout density, responsive behavior, interaction
states, and visual evidence. It routes product gaps to `product-discovery`,
brand gaps to `brand-positioning`, and visible UI evidence to `functional-qa`.

## Iteration 5 Decision

Upgrade the validator so the new skills are not only present but mechanically
traceable. The validator now registers the new skills and templates, checks
required skill surfaces, verifies real persona/scenario/journey/requirement
references when present, checks product references to brand docs, requires a
status field for design tokens, and validates transformed spec packet headings.

## Validation Evidence

- `python3 scripts/validate_cascade_codex.py`: PASS, 3 agents, 21 skills.
- `git diff --check`: PASS.
- `python3 -m py_compile scripts/validate_cascade_codex.py`: PASS.
