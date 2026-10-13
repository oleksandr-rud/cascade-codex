# Work

Use one short record for each implementation task under `tasks/T-NNN.md`.
The YAML frontmatter is the status source; the body holds only the outcome,
scope, current handoff and material decisions. Do not maintain a second status
registry or create separate lanes, reports, archives or backlog files.

Start at `T-001`; allocate the next number after the highest existing internal
ID, never renumber or reuse an ID. `cascade work audit` reports the next number
without reserving it. Recheck before writing when another owner is active.
Copy [task-template.md](task-template.md) and follow
[task.schema.json](task.schema.json).

Keep the layout flat while the project has no accepted product-task division.
When a real product or tracker task exists, set `product_task.id` and
`product_task.reference` to its exact identity and source. Keep the internal ID
for local continuity. Do not invent an external number or product hierarchy.

`PLANNED`, `READY`, `IN_PROGRESS`, `IN_REVIEW`, `BLOCKED`, `COMPLETE` and
`CANCELLED` are explicit states. Record checks as `PASS`, `FAIL`, `BLOCKED`,
`NOT_RUN` or `NOT_APPLICABLE`, with scope and evidence. `COMPLETE` requires a
result for every required check and `next_action: null`; optional unrun checks
remain `NOT_RUN`. These fields record evidence, not independent acceptance or
permission. Code validates them; it never derives status from prose.

Read only the relevant task record when resuming. Planning remains inline;
a task record is not a specification, work graph or transcript. Keep reusable
facts in their existing product, design, specification or pattern owner.
The optional `onboarding-manifest.yaml` is an onboarding receipt, not a task
registry. Local generated checks belong under ignored `.artifacts/`.
