# External plugin integration contracts

## Boundary

`cascade-agent-architect` owns architecture semantics, capability clusters, topology, building blocks, architecture-specific evaluation packs, candidate lineage, and staging recommendations. `cascade-evals` owns the generic evaluation lifecycle, judge contracts, deterministic recomputation, aggregation, and evaluation receipts. Production promotion remains a separate explicit action by the target authority owner. The plugin does not vendor or fork prompt, evaluation, or simulation runtimes.

## Dependency resolution

Resolve an external skill by running `codex plugin list --json`, then require an installed and enabled plugin with a source path and a readable `skills/<skill>/SKILL.md`.

Statuses:

- `AVAILABLE`: exact plugin and skill resolved.
- `BLOCKED`: plugin absent, disabled, malformed, or missing the requested skill.
- `INVALID`: resolved package violates its advertised contract.

Never search alternate caches or silently use a copied fallback after resolution fails.

## Cascade Prompt alias

Canonical dependency: `cascade-prompt:prompt`.

`build-agent-prompts` prepares a prompt brief containing the role mission, inputs, source authority, tools, permissions, output schema, stop behavior, target capability tier, and prompt tests. It then invokes Cascade Prompt to create or audit the prompt.

Expected result:

- `Final Prompt` fenced block;
- variables;
- assumptions;
- concise design notes;
- optional tests.

The architecture plugin binds the returned prompt digest into its packet. It does not reinterpret model-tier policy or call a prompt globally best.

## Cascade Simulations alias

Canonical dependencies:

- `cascade-simulations:simulate` for bounded execution;
- `cascade-simulations:simulation-review` for frozen-run review;
- `cascade-simulations:simulation-actor`, `simulation-brief`, `simulation-outcome`, and `simulation-adapter` when their artifacts are required.

## Cascade Evals aliases

Canonical dependencies:

- `cascade-evals:agent-evaluation` for architecture, role, skill, workflow, and complete-system evaluations;
- `cascade-evals:prompt-evaluation` for prompt-specific quality, variance, and model-tier comparisons;
- `cascade-evals:build-judge` for generic judge profiles and calibration artifacts when a custom architecture rubric is required.

The prompt-evaluation runner is specialized for prompt-builder outputs and its own task catalog. It may evaluate a prompt wrapper when the wrapper satisfies that contract. It is not a generic architecture evaluator.

For architecture evaluation, this plugin owns the subject-specific task pack, semantic assertions, eligibility extensions, and anchored rubric content. Cascade Evals owns the generic lifecycle and decision receipt. Cascade Simulations owns actor/environment execution and frozen run evidence. Every unexecuted phase remains `NOT_RUN`.

## Persona provenance

`design-simulation-persona` creates an architecture-design persona that explains which user model the system must represent. It preserves source grounding, stable-versus-dynamic-state, privacy, schema, and validation contracts, then hands the resulting persona to Cascade Simulations for executable actor compilation and execution. It does not replace `cascade-simulations:simulation-persona` for campaign-ready persona artifacts.

## Version and invalidation

Every architecture packet records external plugin name, version, skill name, source digest, and resolution time. A changed dependency version or skill digest invalidates only prompt or evaluation evidence that consumed it; architecture facts remain current unless their own sources changed.
