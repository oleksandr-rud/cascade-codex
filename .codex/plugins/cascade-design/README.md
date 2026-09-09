# Cascade Design

Cascade Design packages five reusable design workflows:

- `cascade-design:create-design`

- `cascade-design:ux-flow-review`
- `cascade-design:accessibility-review`
- `cascade-design:visual-qa`
- `cascade-design:design-system`

Design authoring produces editable candidates and previews; review workflows remain evidence-bound. It does not require a dedicated
host role or ship browser/Figma runtime, product authority, implementation,
functional acceptance, release approval, or evaluation runtime. Those remain
requesting-host or peer-plugin responsibilities.

Validate the package with:

```bash
uv run --offline --with jsonschema python scripts/check_plugin.py
uv run --offline --with jsonschema python -m unittest discover -s scripts -p 'test_*.py'
python scripts/refresh_manifest.py --check
bun test ./scripts/generative-ui.test.mjs
```

The shared [Generative UI practice](skills/design-system/references/generative-ui.md)
guides how Product, Marketing, Design, architects and implementing agents compose
UI from frontend-owned components and structured data. Its
[reference example](skills/design-system/references/generative-ui-example.md)
illustrates a small Hybrid catalog in web/chat shells. A connected backend or
model is not required to adopt the practice. The JavaScript check above covers
the optional example's event and action boundaries; run it when those assets change.

The model-backed qualification suite under `evals/` runs through the installed
`cascade-evals:agent-evaluation` adapter.
