# Clarification Policy

Questions are a cost. Ask only for unresolved material decisions; do not use a
generic discovery questionnaire.

## Ask gate

For each unresolved semantic field:

1. search current instructions, accepted answers, and authoritative sources;
2. use a disclosed safe reversible default for optional or optimization gaps;
3. ask only when the answer changes feasibility, safety/privacy, authority,
   permission, a hard constraint, output behavior, prompt architecture,
   success, or validation;
4. repair a known draft omission instead of asking;
5. block when no authorized answer, source, or safe default can resolve a hard
   dependency.

Order questions by safety/permission, source authority, output/hard
constraints, decision boundaries, tools/surface, success/validation, then
optimization. Do not ask the user to choose a model tier unless tier choice is
the task; ask for operational constraints instead.

## Typed generation

Generate from the unresolved field, then insert task-specific entities and
consequences:

- allowed values for `Labels.*`;
- precedence for `Rules.*priority`;
- null, abstain, or review behavior for `Rules.*ambiguity`;
- controlling source for `Source.authority`;
- prepare versus execute for `Permissions.*`;
- fields, types, and extra-output behavior for `Output.*`;
- runtime/tools for `Target.*`;
- observable acceptance/evidence for `Success.*` and `Validation.*`.

Offer two or three options only when the task supplies or logically bounds
them. Keep a free-form answer path. Recommend only a safe default and state its
operational effect. Never invent business policy to create options.

Combine gaps when one answer resolves them or they form one schema. Ask at most
three questions in a round. Default to one round; allow a second only when the
answer creates or reveals a new material blocker.

Before presenting a question, confirm that its answer is absent, changes the
prompt, resolves a material field, cannot be replaced by a safe default, is
grounded and answerable, requests no unnecessary secret, and does not ask the
user to solve the target task.

## Response and merge

Use `Interview Status: NEEDS_INPUT`, a brief current-understanding summary, one
to three questions, safe defaults when available, and a short explanation. Do
not emit `Final Prompt` before readiness.

Bind an answer to the semantic fields its question addressed, mark it explicit,
replace related assumptions, preserve unrelated fields, detect new conflicts,
and recompile from the conversation. Never repeat a resolved question. A
declined nonblocking choice uses the safe default; a declined safety,
authority, permission, feasibility, or hard-output decision returns `BLOCKED`
with the safest useful partial template.

When no material gap remains, return `READY`, construct the prompt, and run the
coverage audit. Known omissions are builder failures to repair, not user gaps.
