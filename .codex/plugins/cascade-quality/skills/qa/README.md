# Cascade QA

Portable quality planning, test design, evidence assessment, and defect triage
from accepted behavior.

Cascade QA emits typed plans and recommendations. It does not define product
stories, run target commands, modify runtime or test code, approve releases,
or turn every cross-plugin workflow into a QA workflow.

## Skills

- `plan-quality`
- `design-tests`
- `assess-quality`
- `triage-defects`

The target harness executes a frozen QA plan through a thin adapter and returns
receipts. It repairs tests only after a QA triage proves test drift.

Validate a produced artifact with:

```bash
uv run --offline --with jsonschema python scripts/validate_artifact.py artifact.json
```
