# Cascade Project Management

Portable, evidence-bound work-item definition, project and lean Agile MVP
planning, coordination, reconciliation, and closeout assessment for product,
research, marketing, engineering, and quality initiatives.

The plugin emits proposals and typed artifacts. It does not choose product
priority, define marketing strategy, file tracker items, execute target work,
mutate a project registry, dispatch agents, release software, or archive files.

## Skills

- `define-work-item`: draft one grounded tracker-ready issue, bug, story, task,
  enabler, or experiment without filing it.
- `plan-project`: create a lean horizon plan or an MVP-first Agile plan across
  versions, iterations, stories, and tasks.
- `manage-project`: coordinate status or reconcile conflicting project state.
- `close-project`: assess terminal completion and propose safe retention.

Validate a produced artifact with:

```bash
uv run --offline --with jsonschema python scripts/validate_artifact.py artifact.json
```
