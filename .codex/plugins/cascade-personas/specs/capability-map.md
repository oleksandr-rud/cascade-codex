# Cascade Personas capability map

Version: 0.1.20+codex.20260909140051

This package consolidates human-model capabilities that were previously split across repository product documentation, Cascade Simulations, and the former umbrella Cascade Architect package. The paths below are development provenance, not runtime dependencies.

| Extracted capability | Development source | Plugin owner | Boundary |
| --- | --- | --- | --- |
| Persona evidence, uncertainty, and durable product use | .codex/skills/discover, .codex/skills/compose-spec, docs/product/personas/ | build-persona | Does not make product decisions |
| Stable profile, dynamic variables, transitions, emotions, and actor inputs | cascade-simulations:simulation-persona, cascade-simulations:simulation-actor | build-persona canonical model; compile-persona projection | Simulations retains actor derivation and execution |
| Architecture-facing persona design | cascade-ai-architect:derive-persona-requirements | compile-persona architecture view | Cascade AI Architect consumes the view; it does not own a second canonical schema |
| Persona-derived evaluation cases | product-eval persona derivation and cascade-evals:evaluate | evaluate-persona subject adapter | Cascade Evals retains generic judges and reduction |

Capability clusters were chosen by shared source authority, context, oracle, and recovery path—not by copying existing job titles.
