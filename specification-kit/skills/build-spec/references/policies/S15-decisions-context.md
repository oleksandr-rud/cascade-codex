# S15 — Decisions and repository context

Use IDEF6's rationale viewpoint for material choices: decision, alternatives,
reason, consequence and conditions for reconsideration. Product, company/process,
test and technical choices all qualify when consequential. Keep decided choices
separate from hypotheses. For an existing repository identify exact code/schema/
config sources, applicable practices, approved exceptions and validation commands.

For a rule that separately built components must share, specify scope, requirement,
the incompatible choices it prevents, owning contract and revisit condition.
Stack/file/schema snapshots seed greenfield work; current facts move to code as
implementation appears. Keep intended behavior explicit and resolve code/spec
conflicts rather than letting either silently overwrite the other. Use
[W03 solution design](../development-policies/W03-solution.md) for unresolved choices.

The section contains short decision records and scoped implementation context.
Its dependency diagram shows which contracts rely on a consequential choice;
reuse the architecture diagram if it answers that question. Do not draw a new
picture for a list of filenames or repeat volatile inventories in instructions.

Check that implementation loads the actual relevant context and that current
facts have one owner. See [decision guidance](../../../spec-diagrams/references/trace-decisions.md).
