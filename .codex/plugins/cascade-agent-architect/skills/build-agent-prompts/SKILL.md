---
name: build-agent-prompts
description: Compile architecture-specific prompt briefs and delegate prompt creation, refinement, diagnosis, or testing to the installed Cascade Prompt skill. Use when an AI-agent architecture packet, role, skill, workflow, or tool contract needs a copy-ready model prompt, prompt audit, model-tier adaptation, or prompt test plan without duplicating prompt-engineering policy.
---

# Build agent prompts

Prepare the architecture input to prompt generation. Let
`cascade-prompt:prompt` own prompt policy, material-gap interviewing, model-tier
selection, construction, and prompt-level audit.

## Boundary

- Own the architecture-to-prompt brief and provenance binding.
- Do not recreate, paraphrase, or override Cascade Prompt runtime policy.
- Do not call a model globally best or convert a provider name into a tier.
- Do not fill missing source authority, permissions, schemas, success criteria,
  or tool behavior from model memory.
- Do not execute, grade, install, or promote the returned prompt.

Use this skill only after the relevant capability, blueprint, role, skill, and
workflow decisions exist. Route missing architecture decisions back to their
owning skill when they would change responsibility, topology, authority, tool
permissions, state ownership, or the success oracle.

## Workflow

### 1. Select one prompt target

Name one semantic target, such as a manager role, specialist role, evaluator,
tool-using loop, or focused skill. Do not combine roles with different tool,
permission, context, or completion boundaries into one prompt merely to reduce
file count.

Read the smallest authoritative architecture artifacts needed for that target:

1. architecture index and capability map;
2. target blueprint and role or skill contract;
3. workflow, state, handoff, recovery, and stop rules;
4. tool schemas, permission and confirmation policy;
5. evaluation contract and target-model constraints.

Preserve exact source locators, negations, enumerations, and unresolved fields.

### 2. Compile the prompt brief

Read `runtime/architecture-prompt-brief.md` for the bridge invariants and field
mapping. This compact pack is also the digest-bound subject contract used by
`cascade-evals:prompt-evaluation`; it contains no prompt-writing or generic
evaluation policy.

Copy `assets/prompt-brief.md` as the working shape when a durable artifact is
requested; otherwise use its headings in memory. Include only fields that
apply, but never omit a material unknown. Classify unknowns as:

- `BLOCKING_ARCHITECTURE_GAP`: return to the owning architecture skill;
- `PROMPT_DECISION_GAP`: pass to Cascade Prompt for its interview policy;
- `SAFE_DEFAULT`: record the reversible default and rationale.

Set `Operation` to `Create`, `Refine`, `Diagnose`, `Convert`, `Compare`, or
`Test`. Describe hard model capabilities and any explicit model or
provider-neutral tier already chosen. Leave tier selection to Cascade Prompt
when it is unresolved.

### 3. Resolve the external skill

From this skill directory, run:

```bash
python3 ../../scripts/resolve_plugin_skill.py \
  --plugin cascade-prompt \
  --skill prompt \
  --pretty
```

The resolver uses only `codex plugin list --json`, the advertised source path,
and the manifest-declared relative skills root. Require `status: AVAILABLE`. If
it returns `BLOCKED` or `INVALID`, report that exact state and reason with the
prompt brief; do not search conventional directories or caches, copy a
fallback, or author the prompt locally.

Read the resolved `skill.path` completely. Follow that installed skill and only
the conditional resources it selects. Treat its result as the prompt-authoring
authority for this turn.

### 4. Delegate without losing architecture meaning

Give Cascade Prompt:

1. the requested operation;
2. the complete prompt brief;
3. the instruction to produce a prompt for the target, not perform the target
   task;
4. the requested destination or format, if any;
5. a requirement to preserve architecture authority, permissions, typed
   outputs, stop behavior, and tests exactly.

Do not preselect prompt patterns, examples, reasoning style, or verbosity unless
the architecture or user explicitly requires them. Those choices belong to the
resolved prompt skill.

### 5. Preserve and bind the result

For a ready result, preserve Cascade Prompt's `Final Prompt` fenced block,
`Variables to Fill`, `Assumptions`, `Design Notes`, and optional tests. Do not
silently rewrite the returned prompt after its audit.

When a durable architecture packet is requested, write only with user
authority:

- `prompts/<target-slug>.md`: the complete Cascade Prompt result;
- `prompts/<target-slug>.receipt.json`: target slug, architecture source
  digests, prompt digest, operation, resolution time, and the resolver's plugin
  name, plugin ID, marketplace, version, source path, manifest digest, skill
  name, skill path, skill digest, and dependency digest.

Compute the prompt digest over the exact UTF-8 bytes of the fenced `Final
Prompt` content. A changed architecture input, plugin version, manifest digest,
skill digest, or prompt digest invalidates prompt-specific downstream evidence.

## Output

Return one of:

- the resolved Cascade Prompt ready contract headed by `Final Prompt`, plus a
  concise `Architecture Binding` containing the target slug and provenance;
- `Interview Status: NEEDS_INPUT` exactly when Cascade Prompt requires input;
- `BLOCKED` or `INVALID` with the resolver receipt and safest useful prompt
  brief, but no locally improvised final prompt.

Finish only when the result is attributable to the resolved external skill and
every material prompt instruction maps to an architecture requirement,
boundary, output rule, or test.
