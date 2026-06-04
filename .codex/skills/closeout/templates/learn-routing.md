# Learn Routing Table

Use this table when deciding whether a lesson should become durable repository
memory.

| Lesson type | Target |
|---|---|
| Skill behavior | Relevant `.codex/skills/{name}/SKILL.md` |
| Role behavior | Relevant `.codex/agents/{name}/AGENT.md` |
| Reusable implementation pattern | `docs/patterns/workflow.md`, `docs/patterns/boundaries.md`, `docs/patterns/testing.md`, or `docs/patterns/context-memory.md` plus `docs/patterns/_index.md` |
| Product behavior | Product spec, product scenario, task scenario, or regression test |
| New codebase term | `docs/glossary.md` |
| Durable rejected scope | Existing backlog note, pattern, decision, or work report |
| Historical note only | `docs/work/reports/YYYY-MM-DD-{slug}.md` |

## Report Decision

| Condition | Action |
|---|---|
| Work spans turns or records a durable decision | Write a work report |
| Single-file cosmetic change | Skip report |
| Investigation produces follow-up work | Create a backlog candidate with acceptance criteria |
| Trivial investigation | Skip durable memory |

Do not maintain a generic learned-pattern dumping ground. If a lesson cannot
update a skill, role, pattern, product spec, test, glossary, or work report,
it is probably not durable enough to keep.
