# Spec Packet: Persona Semantic Core

## Source

- Request: replace the earlier JSON-shaped persona model with prompt files,
  script files, Markdown specs, and YAML package/catalog packets.
- Research base: `docs/work/reports/2026-06-20-persona-simulator-behavioral-patterns.md`.
- Project context: Dynamic Persona Assistant scaffold with Cascade installed.

## Classification

Type: architecture and context-packaging spec.

The persona semantic core is a file-first package. Markdown files carry meaning
and behavioral rules. YAML files carry manifests, references, catalog trees,
module summaries, compile order, and act-specific context policy. Prompt files
act as executable instruction scripts for model-facing context assembly.

Canonical rule: do not use a JSON object as the source of truth for persona
behavior. Structured application state may exist later, but it should be
compiled from or validated against these semantic-core files.

Non-goals:

- no application runtime implementation yet;
- no demographic determinism;
- no claim that synthetic personas replace validated human research;
- no hidden persona facts invented during generation.

## Semantic Core File Types

| File type | Purpose | Expected owner |
|---|---|---|
| Markdown spec | Human-readable meaning, behavioral rules, evidence, examples, and acceptance checks | `docs/specs/{slice-slug}/` or owner docs |
| Prompt script | Model-facing instruction script for assembling or using context | `docs/specs/{slice-slug}/*prompt.md` |
| YAML package | Package metadata, compile order, referenced files, and external sources | `docs/specs/{slice-slug}/*.package.yaml` |
| YAML catalog | Module tree, act catalog, policy packets, and short summaries | `docs/specs/{slice-slug}/*.catalog.yaml` |
| Compiler script | Deterministic local assembly of package files into a context bundle | `scripts/compile_persona_context.py` |

## Semantic Core Modules

| Module | Summary | Compiled into prompt when |
|---|---|---|
| `identity-profile` | Stable persona identity, role, background, explicit known facts, and forbidden inferences | Any persona response or simulation run |
| `behavioral-signatures` | Situation-conditioned if-then behavior patterns derived from CAPS-style modeling | Behavior selection, stressor tests, scenario simulation |
| `state-tracker` | Affect, arousal, motivation, perceived control, trust, cognitive load, and norm salience | Multi-turn interaction or state-sensitive response |
| `memory-policy` | Semantic, episodic, relationship, commitment, and reflection memory rules | Retrieval, writeback, long-context continuity |
| `social-context` | Active identity, relationship, group norms, audience, status, trust, and social risk | Role-play, social simulation, trust repair |
| `behavior-policy` | Intention selection and response strategy before final wording | Any generated dialogue or action |
| `consistency-critic` | Checks for persona drift, contradictions, unsupported claims, and unsafe imitation | Before final response or memory write |
| `evaluation-pack` | Fixtures and metrics for consistency, state transitions, drift, calibration, and safety | Test planning and release gates |

## Context Compilation Contract

The compiler reads the YAML package first, then loads referenced Markdown and
YAML files in package order. Every referenced file must have:

- a stable `id` in the package or catalog;
- a path or external URL;
- a one-sentence summary;
- an inclusion rule explaining when it enters context;
- a source or evidence note when it influences behavior.

The compiled context should preserve file boundaries:

```text
--- BEGIN SOURCE: docs/specs/persona-context-compiler/persona-semantic-core.md
...
--- END SOURCE: docs/specs/persona-context-compiler/persona-semantic-core.md
```

Prompt assembly should include summaries before long source bodies so the model
can decide which material matters when context must be trimmed.

## Behavior Examples

| ID | Example |
|---|---|
| BE-001 | Given a persona response task, when the compiler loads `persona-semantic-core.package.yaml`, then it includes the package summary, relevant module summaries, prompt script, and source specs before behavior generation. |
| BE-002 | Given an act scope of `state_update`, when context is compiled, then state-tracker, appraisal, memory-policy, and consistency-critic modules are included before style-only guidance. |
| BE-003 | Given a referenced paper or spec, when it appears in a package or catalog, then it has a short summary and a reason for use, not only a URL. |
| BE-004 | Given an output prompt is generated, when persona facts are missing, then the prompt must preserve uncertainty instead of inventing new facts. |
| BE-005 | Given a package reference path is missing, when the compiler runs, then it reports a warning and continues with existing files. |

## Functional Acceptance Checks

| Check | Evidence |
|---|---|
| Package file exists and lists compile order | `docs/specs/persona-context-compiler/persona-semantic-core.package.yaml` |
| Catalog file exists and lists module, act, and policy summaries | `docs/specs/persona-context-compiler/persona-semantic-core.catalog.yaml` |
| Prompt script exists and describes model-facing compilation behavior | `docs/specs/persona-context-compiler/persona-context-compiler.prompt.md` |
| Local compiler can assemble package paths into a Markdown context bundle | `python scripts/compile_persona_context.py` |
| Compiled context map preserves reference IDs and summaries | `python scripts/compile_persona_context.py` output |
| Research report no longer presents JSON as the canonical persona model | `docs/work/reports/2026-06-20-persona-simulator-behavioral-patterns.md` |
| Harness structure remains valid | `python scripts/validate_cascade_codex.py` |

## Handoff

Next implementation work should use the YAML package and catalog as the
semantic source of truth. Runtime data objects can be introduced later, but the
first product slice should compile persona prompts and state-policy context
from these files instead of hardcoding a single schema.
