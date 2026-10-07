# Cascade Design

One proportionate authoring process and four bounded review/rule methods:

- `cascade-design:create-design`
- `cascade-design:ux-flow-review`
- `cascade-design:design-system`
- `cascade-design:accessibility-review`
- `cascade-design:visual-qa`

Create Design keeps one grounded brief and frontend handoff, choosing needed
research/IA, direction, prototype and review work. A settled correction skips
repeated intake and invention. Start with the [local reference index](references/README.md)
and load full topic procedures/examples/data progressively. Compatible source
material is retained locally with exact pins, licenses/notices and adaptation
records; invocation does not fetch or run an upstream skill/engine.

The host owns artifact paths/tools, product authority, operational research,
production implementation, functional acceptance and release. Candidate readiness
is separate from approval. The existing schema remains the five methods' contract;
actual required previews are necessary for authoring READY. Reviews can be READY
with explicit pending checks. Target rules and the scoped Hybrid default retain
their authority; explicitly open direction is resolved in the local process.

## Cheap local reference check

Run from this package with an already available Node or Bun:

```bash
node scripts/check_references.mjs
# Equivalent: bun scripts/check_references.mjs
```

This read-only check verifies local hashes, exact license/notice copies, declared
reference coverage, five entrypoints and explicit local Markdown path closure.
It never fetches, installs, dispatches or judges design semantics. A pass is not
model, installed-plugin, standards or target qualification.

## Package and evaluation checks

With an already available Python/jsonschema environment and authorized installed
plugin inventory, run the existing package checks:

```bash
python scripts/check_plugin.py
python -m unittest discover -s scripts -p 'test_*.py'
python scripts/refresh_manifest.py --check
```

Missing dependencies leave an exact NOT_RUN/BLOCKED check; this package does not
install them on invocation. Refreshing local subject bindings must not imply
fresh installed dependency qualification. The balanced corpus under `evals/`
contains 28 cases, including nine new process regressions. Target/judge execution
uses the actual installed `cascade-quality:agent-evaluation` owner and receipts;
frozen cases and structural passes are not semantic acceptance.

The existing sanitized runner is tool-free. It inlines manifest/schema/spec/skill
instructions and explicitly marked inline assets; other bound reference files
are metadata-only. Before qualifying reference use, the evaluation owner must
include the applicable phase/topic text in a selected inline packet or use an
authorized read-capable host. Do not inline the whole corpus by default.

The [Generative UI practice](skills/design-system/references/generative-ui.md)
and [reference example](skills/design-system/references/generative-ui-example.md)
remain optional local composition knowledge. No connected backend/model is
required to adopt the practice. Run its existing boundary check if those assets
change:

```bash
bun test ./scripts/generative-ui.test.mjs
```

Source updates follow the [explicit local maintenance process](references/process/reuse-and-update.md):
selected pin/license/behavior review, isolated adaptation, hashes/affected checks,
independent fixed-point review and the integration owner's exact scoped commit.
There is no automatic updater, hook or upstream runtime dependency.
