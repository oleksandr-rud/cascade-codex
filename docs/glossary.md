# Glossary

Prefer the words used in code, API contracts, UI copy, and current product
specs. Until application source exists, the active vocabulary is the installed
Cascade harness vocabulary.

| Term | Location | Meaning |
|---|---|---|
| Dynamic Persona Assistant | `AGENTS.md`; `harness.config.yaml` | Current target project name for this scaffold. |
| Cascade | `README.md`; `CODEX.md` | Agentic workflow harness installed in this repository. |
| Harness adapter | `harness.config.yaml` | Project-specific stack, path, command, routing, acceptance, and memory configuration. |
| Runtime bridge | `CODEX.md` | Cascade load order and task-routing contract for coding agents. |
| Skill contract | `.codex/skills/` | Reusable workflow instruction bundle with triggers, source order, outputs, and validation rules. |
| Role contract | `.codex/agents/` | Local agent role definition, manifest, and skill wiring. |
| Work lane | `docs/work/` | Tracked execution packet for non-atomic work, ownership, checks, and handoff evidence. |
| Cascade validator | `scripts/validate_cascade_codex.py` | Python check for required harness files, wiring, docs structure, and stale references. |
| Persona chatbot | `docs/work/reports/2026-06-20-persona-simulator-behavioral-patterns.md` | Dialogue agent that maintains a consistent character, user model, or role across turns. |
| Persona simulator | `docs/work/reports/2026-06-20-persona-simulator-behavioral-patterns.md` | System that generates behavior, decisions, dialogue, memory, and social interaction for a modeled person or segment. |
| Persona semantic core | `docs/specs/persona-context-compiler/persona-semantic-core.md` | File-first source of truth for persona behavior, compiled from Markdown specs, prompt scripts, YAML package metadata, and YAML catalogs. |
| Context compiler | `scripts/compile_persona_context.py` | Local script that reads the persona semantic-core package and emits a Markdown context bundle. |
| Module catalog | `docs/specs/persona-context-compiler/persona-semantic-core.catalog.yaml` | YAML tree of persona modules, act sections, policies, and packet summaries. |
| Deep-search research workflow | `docs/specs/persona-context-compiler/persona-simulator-research-workflow.md` | Multi-perspective research process that frames lanes, retrieves sources iteratively, evaluates source quality, verifies atomic claims, and promotes only supported findings. |
| Source card | `docs/specs/persona-context-compiler/persona-simulator-research-workflow.md` | Research source record with ID, title, URL or path, source type, claim support, limits, freshness, and evidence strength. |
| Behavioral signature | `docs/work/reports/2026-06-20-persona-simulator-behavioral-patterns.md` | Situation-conditioned pattern: if a context and appraisal are active, then specific behaviors become more likely. |
| State tracker | `docs/work/reports/2026-06-20-persona-simulator-behavioral-patterns.md` | Runtime model of affect, arousal, motivation, perceived control, trust, cognitive load, needs, and social context. |
| Persona drift | `docs/work/reports/2026-06-20-persona-simulator-behavioral-patterns.md` | Loss of assigned persona consistency, identity, goals, style, or behavior over multi-turn or long-context interaction. |

