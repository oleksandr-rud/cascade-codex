# Glossary

Prefer the words used in code, API contracts, UI copy, and current product
specs. Until application source exists, the active vocabulary is the installed
Cascade harness vocabulary.

| Term | Location | Meaning |
|---|---|---|
| Cascade | `README.md`; `CODEX.md` | Agentic workflow harness installed in this repository. |
| Harness adapter | `harness.config.yaml` | Project-specific stack, path, command, routing, acceptance, and memory configuration. |
| Runtime bridge | `CODEX.md` | Cascade load order and task-routing contract for coding agents. |
| Skill contract | `.codex/skills/` | Reusable workflow instruction bundle with triggers, source order, outputs, and validation rules. |
| Role contract | `.codex/agents/` | Local agent role definition, manifest, and skill wiring. |
| Work lane | `docs/work/` | Tracked execution packet for non-atomic work, ownership, checks, and handoff evidence. |
| Cascade validator | `scripts/validate_cascade_codex.py` | Python check for required harness files, wiring, docs structure, and stale references. |
