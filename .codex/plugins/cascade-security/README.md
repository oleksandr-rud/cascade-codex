# Cascade Security

Cascade Security packages three reusable, review-only security workflows:

- `cascade-security:codebase-audit`
- `cascade-security:auth-analysis`
- `cascade-security:secure-design`

The package owns audit methodology, typed security-review artifacts, and a
filename-only stack scanner. It does not ship a custom Security agent, target
permissions, implementation authority, compliance attestation, release
approval, or a general-purpose vulnerability scanner. Those remain host or
peer-plugin responsibilities.

Validate the package with:

```bash
uv run --offline --with jsonschema python scripts/check_plugin.py
uv run --offline --with jsonschema python -m unittest discover -s scripts -p 'test_*.py'
python scripts/refresh_manifest.py --check
bun skills/codebase-audit/scripts/security_stack_scan.ts . --max-files 20
```

The model-backed qualification suite under `evals/` runs through the installed
`cascade-evals:agent-evaluation` adapter. Its frozen model policy uses
`gpt-6-astra` with `high` reasoning for builder, target, and independent judges.
