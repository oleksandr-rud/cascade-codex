# Cascade Design

Cascade Design packages four reusable design workflows:

- `cascade-design:ux-flow-review`
- `cascade-design:accessibility-review`
- `cascade-design:visual-qa`
- `cascade-design:design-system`

The package is review-first and evidence-bound. It does not ship a custom
Designer agent, browser/Figma runtime, product authority, implementation loop,
or evaluation runtime. Those remain host or peer-plugin responsibilities.

Validate the package with:

```bash
uv run --offline --with jsonschema python scripts/check_plugin.py
uv run --offline --with jsonschema python -m unittest discover -s scripts -p 'test_*.py'
python scripts/refresh_manifest.py --check
```

The model-backed qualification suite under `evals/` runs through the installed
`cascade-evals:agent-evaluation` adapter.
