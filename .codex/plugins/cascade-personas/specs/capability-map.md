# Cascade Personas capability map

Version: 0.1.20+codex.20260823183500

This package consolidates human-model capabilities that were previously split across repository product documentation, Cascade Simulations, and Cascade Agent Architect. The paths below are development provenance, not runtime dependencies.

| Extracted capability | Development source | Plugin owner | Boundary |
| --- | --- | --- | --- |
| Persona evidence, uncertainty, and durable product use | .codex/skills/discover, .codex/skills/compose-spec, docs/product/personas/ | build-persona | Does not make product decisions |
| Stable profile, dynamic variables, transitions, emotions, and actor inputs | cascade-simulations:simulation-persona, cascade-simulations:simulation-actor | build-persona canonical model; compile-persona projection | Simulations retains actor derivation and execution |
| Architecture-facing persona design | cascade-agent-architect:design-simulation-persona | compile-persona architecture view | Agent Architect consumes the view; it no longer needs to own a second canonical schema |
| Persona-derived evaluation cases | product-eval persona derivation and cascade-evals:evaluate | evaluate-persona subject adapter | Cascade Evals retains generic judges and reduction |

Capability clusters were chosen by shared source authority, context, oracle, and recovery path—not by copying existing job titles.
