# Adaptive Intake Interview

Load after core extraction finds a material gap or Advanced trigger; complete
Quick requests do not load it.

## Compile

Use `Goal`, `Audience`, `Input.*`, `Source.*`, `Output.*`, `Labels.*`,
`Rules.*`, `Constraints.*`, `Exclusions.*`, `Permissions.*`,
`Tools.*`, `Risk.*`, `Success.*`, `Validation.*`, `Preferences.*`, and
`Target.*`; mark `[explicit]`, `[source]`, `[assumed]`, `[ask]`, `[conflict]`,
or `[not applicable]`.

Resolve: `current instruction -> compatible answer -> authority -> safe default
-> unresolved`. Preserve values, negation, requirement/inference boundaries,
and dependencies. Reconstruct each turn. Do not expose the map or emit runtime
JSON/claim IDs.

Derive goal, input, output, boundary, success, material-validation, and
architecture-changing target obligations; add applicable overlays.

Classify gaps:

- `REQUEST_GAP`: required value absent; ask or assume safely.
- `SOURCE_CONFLICT`: authorities disagree; ask or block.
- `OPTIONAL_GAP`: optimization only; default.
- `COMPOSITION_OMISSION`: known draft omission; auto-repair.

Reclassify Quick to Guided for an answerable material gap. Use Advanced for
source conflict, high stakes, consequential permission, long context,
multi-stage tools, or evaluation design.

## Ask

Ask only when the answer changes feasibility, safety/privacy, authority,
permission, hard boundaries, output/decision behavior, architecture, success,
or validation. Do not ask when answered, safely defaultable, or merely omitted
from the draft.

Priority: safety/permission; authority; output; decisions; tools; proof;
optimization.

Generate by field type; ground in task entities:

- `Labels.*`: values; `Rules.*priority`: precedence.
- `Rules.*ambiguity`: null/abstain/review; `Source.authority`: controller.
- `Permissions.*`: prepare/execute; `Output.*`: fields, types, extra output.
- `Target.*`: runtime/capabilities; `Success.*`/`Validation.*`: proof.

Offer 2–3 grounded exclusive options plus free form. Recommend safe defaults
with impact. Combine dependent gaps; ask at most three in one round. A second
round requires a new blocker.

Confirm each is unanswered, material, resolving, answerable, safe, and does not
outsource work.

## Respond, merge, audit

- `READY`: emit the `Final Prompt` heading, then audit.
- `NEEDS_INPUT`: show that status, `Current Understanding`, `Questions` with
  1–3 grounded questions, `Available Defaults` with impact, and
  `Why This Is Needed`. For classification work, unresolved labels also require
  single-label versus multi-label behavior and the precedence or abstention
  rule for mixed or ambiguous cases. No `Final Prompt`.
- `BLOCKED`: name the dependency and safest partial template. `PARTIAL` is not
  a state.

Bind answers to paths as `[explicit]`, replace related assumptions, preserve
other fields, detect conflict, and recompile. Never repeat resolved
questions. Declined optional choices use defaults; declined hard authority or
permission becomes BLOCKED.

After READY, map each material field to an operative prompt location. Repair a
known omission/contradiction once; repeated omission is quality failure. Only a
genuinely undefined field returns to NEEDS_INPUT.
