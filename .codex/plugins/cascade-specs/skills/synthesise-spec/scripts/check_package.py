#!/usr/bin/env python3
"""Check exact package syntax and references; no semantic scoring."""
from pathlib import Path
import hashlib
import json
import re

ROOT = Path(__file__).resolve().parent.parent
EXPECTED = {
    "SKILL.md", "agents/openai.yaml", "scripts/check_package.py",
    "references/boundary-contracts.md", "references/visual-evidence.md",
    "references/evaluation.md", "assets/templates/feature-change-spec.md",
    "assets/templates/technical-design.md", "assets/templates/task-slice.md",
}

def main():
    actual = {p.relative_to(ROOT).as_posix() for p in ROOT.rglob("*") if p.is_file()}
    if actual != EXPECTED:
        raise ValueError(f"package files differ: {sorted(actual ^ EXPECTED)}")
    for relative in sorted(EXPECTED):
        text = (ROOT / relative).read_text(encoding="utf-8")
        if relative.endswith(".md"):
            if text.count("\n# ") + int(text.startswith("# ")) != 1:
                raise ValueError(f"expected one H1: {relative}")
            for ref in re.findall(r"(?:references|assets/templates)/[a-z-]+\.md", text):
                if not (ROOT / ref).is_file():
                    raise ValueError(f"unresolved package reference: {ref}")
        if relative.startswith("assets/templates/"):
            for heading in ["## Readiness", "## Open Decisions And Risks", "## Next Owner Or Action"]:
                if heading not in text.splitlines():
                    raise ValueError(f"missing exact template heading: {relative}: {heading}")
    entries = [{"path": p, "sha256": hashlib.sha256((ROOT / p).read_bytes()).hexdigest()} for p in sorted(EXPECTED)]
    print(json.dumps({"structural_status": "PASS", "semantic_evaluation": "NOT_RUN", "files": entries}, indent=2))

if __name__ == "__main__":
    main()
