#!/usr/bin/env python3
"""Validate portable harness wiring and project-agnostic content."""

from __future__ import annotations

import re
import sys
import tomllib
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]

REQUIRED_FILES = [
    "README.md",
    "AGENTS.md",
    "CODEX.md",
    "harness.config.example.yaml",
    ".codex/config.toml",
    ".codex/README.md",
    "docs/_index.md",
    "docs/structure.md",
    "docs/glossary.md",
    "docs/backlog/_index.md",
    "docs/product/_index.md",
    "docs/product/scenarios.md",
    "docs/product/journeys.md",
    "docs/product/requirements.md",
    "docs/product/personas/_index.md",
    "docs/design/_index.md",
    "docs/design/interaction-model.md",
    "docs/design/tokens.md",
    "docs/brand/_index.md",
    "docs/specs/_index.md",
    "docs/specs/incoming/.gitkeep",
    "docs/specs/transformed/.gitkeep",
    "docs/work/_index.md",
    "docs/work/active.md",
    "docs/work/lane-template.md",
    "docs/work/lanes/.gitkeep",
    "docs/work/reports/_index.md",
    "docs/patterns/workflow.md",
    "docs/patterns/boundaries.md",
    "docs/patterns/testing.md",
    "docs/patterns/context-memory.md",
    ".codex/skills/discover/templates/product-spec.md",
    ".codex/skills/discover/templates/journey.md",
    ".codex/skills/discover/templates/brand-spec.md",
    ".codex/skills/functional-qa/checklists/functional-test-quality.md",
    ".codex/skills/functional-qa/templates/functional-test-plan.md",
    ".codex/skills/test-autorepair/checklists/semantic-repair-checklist.md",
    ".codex/skills/test-autorepair/templates/repair-report.md",
    ".codex/skills/context/templates/snapshot.md",
    ".codex/skills/closeout/templates/learn-routing.md",
    ".codex/skills/architecture-review/checklists/deep-module-review.md",
    ".codex/skills/ingest-spec/templates/transformed-spec.md",
    ".codex/skills/ingest-spec/templates/scenario-row.md",
]

AGENTS = [
    "orchestrator",
    "project-onboarder",
    "agent-engineer",
]

SKILLS = [
    "context",
    "orchestrate-work",
    "plan-change",
    "architecture-review",
    "discover",
    "implement-change",
    "functional-qa",
    "review-change",
    "validate-change",
    "test-autorepair",
    "issue-intake",
    "closeout",
    "agents-best-practices",
    "develop-skill",
    "adapt-harness",
    "ingest-spec",
]

FORBIDDEN_PATH_PATTERNS = [
    "docs/" + "tasks",
    "docs/" + "sessions",
    "docs/patterns/" + "process/",
    "docs/patterns/" + "testing/",
    "docs/patterns/" + "architecture/",
    "docs/patterns/" + "api/",
    "docs/patterns/" + "codebase/",
    "docs/patterns/" + "integrations/",
    "docs/patterns/" + "agentic-runtime/",
    "docs/patterns/" + "context/",
    "docs/patterns/" + "memory/",
]

REQUIRED_PATTERN_FILES = {
    "docs/patterns/workflow.md",
    "docs/patterns/boundaries.md",
    "docs/patterns/testing.md",
    "docs/patterns/context-memory.md",
}

REQUIRED_FOLDERS = [
    "docs/specs/incoming",
    "docs/specs/transformed",
    "docs/product",
    "docs/product/personas",
    "docs/design",
    "docs/brand",
    "docs/work",
    "docs/work/lanes",
    "docs/work/reports",
]

CANONICAL_CASCADE_TOKENS = [
    "context",
    "ingest-spec",
    "discover",
    "orchestrate-work",
    "plan-change",
    "functional-qa",
    "implement-change",
    "review-change",
    "validate-change",
    "test-autorepair",
    "closeout",
]

CASCADE_SURFACES = [
    "AGENTS.md",
    "CODEX.md",
    "README.md",
    ".codex/agents/orchestrator/AGENT.md",
]

REQUIRED_WIRING_SKILLS = {
    "review-change",
    "functional-qa",
    "test-autorepair",
    "ingest-spec",
}

AGENTS_BLOAT_PATTERNS = [
    r"(?im)^#+\s*agent\s+system\b",
    r"(?im)^#+\s*key\s+.+terms\b",
    r"(?im)^#+\s*histor",
    r"(?im)^#+\s*learned\s+lessons\b",
    r"(?im)^#+\s*full\s+stack\b",
    r"(?im)^#+\s*dependency\s+inventory\b",
]

STALE_TEXT_PATTERNS = [
    r"\bpulse-orchestrate\b",
    r"\bharness-onboarder\b",
    r"\bharness-adapt\b",
    r"\bspec-transform\b",
    r"\btask docs\b",
    r"\bsession reports?\b",
    r"\bmulti-session\b",
    r"Default Cascade",
]

SKILL_TRIGGER_REQUIREMENTS = {
    "adapt-harness": [
        r"new-project|new project|onboarding|setup",
        r"target repository",
    ],
    "ingest-spec": [
        r"incoming",
        r"spec|ticket|screenshot|design",
    ],
    "functional-qa": [
        r"primary",
        r"acceptance|functional",
    ],
    "test-autorepair": [
        r"failing|flaky|stale",
        r"product bugs|implementation",
    ],
    "issue-intake": [
        r"issue|tracker|ticket",
        r"without running validation|without.*patching",
    ],
    "discover": [
        r"missing context|missing.*product|missing.*design",
    ],
    "orchestrate-work": [
        r"split|schedule|track|merge",
        r"serialized|dependencies|conflicts",
    ],
    "plan-change": [
        r"non-atomic",
        r"behavior examples|validation plan",
    ],
}

FORBIDDEN_STRINGS = [
    "".join(("Lee", "ra")),
    "".join(("BM", "ET")),
    "".join(("Nuv", "olo")),
    "".join(("Deep", "Agent")),
    "".join(("Repair", " Session")),
    "".join(("PM", " Agent")),
    "".join(("Clau", "de")),
    "".join(("Clau", "de", " Code")),
    "".join(("I", "SS")),
    "".join(("@", "Researcher")),
    "".join(("@", "Product", "Tester")),
    "".join(("@", "Q", "A")),
]

LEGACY_REVIEW_ALIAS = "q" + "a"
STANDALONE_QA = re.compile(
    r"(?<![A-Za-z0-9_-])" + LEGACY_REVIEW_ALIAS + r"(?![A-Za-z0-9_-])",
    re.IGNORECASE,
)
ALLOWED_QA_PATH_PARTS = {"functional-" + LEGACY_REVIEW_ALIAS}


def rel(path: Path) -> str:
    return str(path.relative_to(ROOT))


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def check_required_files(errors: list[str]) -> None:
    for item in REQUIRED_FILES:
        if not (ROOT / item).is_file():
            errors.append(f"missing required file: {item}")
    for agent in AGENTS:
        for item in [
            f".codex/agents/{agent}.toml",
            f".codex/agents/{agent}/AGENT.md",
            f".codex/agents/{agent}/skills.yaml",
        ]:
            if not (ROOT / item).is_file():
                errors.append(f"missing agent wiring: {item}")
    for skill in SKILLS:
        item = ROOT / ".codex" / "skills" / skill / "SKILL.md"
        if not item.is_file():
            errors.append(f"missing skill: {rel(item)}")


def check_required_folders(errors: list[str]) -> None:
    for item in REQUIRED_FOLDERS:
        if not (ROOT / item).is_dir():
            errors.append(f"missing required folder: {item}")


def check_toml(errors: list[str]) -> None:
    for path in ROOT.rglob("*.toml"):
        try:
            tomllib.loads(read_text(path))
        except tomllib.TOMLDecodeError as exc:
            errors.append(f"toml parse error in {rel(path)}: {exc}")


def parse_frontmatter(text: str) -> dict[str, str]:
    if not text.startswith("---\n"):
        return {}
    end = text.find("\n---\n", 4)
    if end == -1:
        return {}
    result: dict[str, str] = {}
    for line in text[4:end].splitlines():
        if ":" not in line:
            continue
        key, value = line.split(":", 1)
        result[key.strip()] = value.strip().strip('"')
    return result


def check_skill_frontmatter(errors: list[str]) -> None:
    actual_skills = {
        path.parent.name
        for path in (ROOT / ".codex" / "skills").glob("*/SKILL.md")
    }
    expected_skills = set(SKILLS)
    for skill in sorted(actual_skills - expected_skills):
        errors.append(f"skill exists but is not registered in validator: {skill}")
    for skill in sorted(expected_skills - actual_skills):
        errors.append(f"skill registered but missing SKILL.md: {skill}")
    for skill in SKILLS:
        path = ROOT / ".codex" / "skills" / skill / "SKILL.md"
        if not path.is_file():
            continue
        data = parse_frontmatter(read_text(path))
        if data.get("name") != skill:
            errors.append(f"skill name mismatch in {rel(path)}")
        if not data.get("description"):
            errors.append(f"skill description missing in {rel(path)}")


def check_skill_trigger_descriptions(errors: list[str]) -> None:
    for skill, patterns in SKILL_TRIGGER_REQUIREMENTS.items():
        path = ROOT / ".codex" / "skills" / skill / "SKILL.md"
        if not path.is_file():
            continue
        data = parse_frontmatter(read_text(path))
        description = data.get("description", "")
        for pattern in patterns:
            if not re.search(pattern, description, re.IGNORECASE):
                errors.append(
                    f"skill description for {skill} does not advertise trigger pattern: {pattern}"
                )


def iter_skill_sources(text: str) -> list[str]:
    sources: list[str] = []
    for line in text.splitlines():
        stripped = line.strip()
        if stripped.startswith("source:"):
            sources.append(stripped.split(":", 1)[1].strip())
    return sources


def check_agent_skill_sources(errors: list[str]) -> None:
    wired_skills: set[str] = set()
    for path in (ROOT / ".codex" / "agents").glob("*/skills.yaml"):
        for source in iter_skill_sources(read_text(path)):
            if not (ROOT / source).is_file():
                errors.append(f"missing skill source {source} referenced by {rel(path)}")
            if source.startswith(".codex/skills/") and source.endswith("/SKILL.md"):
                wired_skills.add(source.split("/")[2])
    for skill in sorted(set(SKILLS) - wired_skills):
        errors.append(f"registered skill is not wired to any agent skills.yaml: {skill}")
    for skill in sorted(REQUIRED_WIRING_SKILLS - wired_skills):
        errors.append(f"required routing skill is not wired: {skill}")


def check_cascade_consistency(errors: list[str]) -> None:
    for surface in CASCADE_SURFACES:
        path = ROOT / surface
        if not path.is_file():
            errors.append(f"missing cascade surface: {surface}")
            continue
        text = read_text(path)
        cursor = -1
        for token in CANONICAL_CASCADE_TOKENS:
            index = text.find(token, cursor + 1)
            if index == -1:
                errors.append(f"cascade token {token!r} missing in {surface}")
            else:
                cursor = index
        for line in text.splitlines():
            if "->" in line and "issue-intake" in line:
                errors.append(f"issue-intake appears inside a default cascade line in {surface}")


def check_thin_agents(errors: list[str]) -> None:
    path = ROOT / "AGENTS.md"
    if not path.is_file():
        return
    text = read_text(path)
    lines = text.splitlines()
    if len(lines) > 120:
        errors.append(f"AGENTS.md is too long for a thin boot contract: {len(lines)} lines")
    table_lines = [line for line in lines if line.count("|") >= 2]
    if len(table_lines) > 3:
        errors.append("AGENTS.md appears to contain a long table")
    for pattern in AGENTS_BLOAT_PATTERNS:
        if re.search(pattern, text):
            errors.append(f"AGENTS.md contains bloat pattern: {pattern}")
    required_pointers = [
        "CODEX.md",
        "harness.config.yaml",
        "docs/structure.md",
        "docs/glossary.md",
        ".codex/skills",
        ".codex/agents",
    ]
    for pointer in required_pointers:
        if pointer not in text:
            errors.append(f"AGENTS.md missing pointer: {pointer}")


def check_pattern_shape(errors: list[str]) -> None:
    actual_patterns = {
        rel(path)
        for path in (ROOT / "docs" / "patterns").glob("*.md")
        if path.name != "_index.md"
    }
    for pattern in sorted(REQUIRED_PATTERN_FILES - actual_patterns):
        errors.append(f"missing required simplified pattern: {pattern}")
    for pattern in sorted(actual_patterns - REQUIRED_PATTERN_FILES):
        errors.append(f"unexpected pattern file outside simplified set: {pattern}")
    for path in (ROOT / "docs" / "patterns").rglob("*.md"):
        relative = rel(path)
        if path.parent != ROOT / "docs" / "patterns":
            errors.append(f"nested pattern file is not allowed in simplified set: {relative}")


def check_no_project_leakage(errors: list[str]) -> None:
    for path in ROOT.rglob("*"):
        if path.is_dir():
            continue
        if "__pycache__" in path.parts or path.suffix == ".pyc":
            continue
        text = read_text(path)
        if path != ROOT / "scripts" / "validate_portable_harness.py":
            for pattern in STALE_TEXT_PATTERNS:
                if re.search(pattern, text, re.IGNORECASE):
                    errors.append(f"stale text pattern {pattern!r} in {rel(path)}")
        for forbidden_path in FORBIDDEN_PATH_PATTERNS:
            if forbidden_path in text:
                errors.append(f"forbidden stale path {forbidden_path!r} in {rel(path)}")
        for index, forbidden in enumerate(FORBIDDEN_STRINGS, start=1):
            if forbidden in text:
                errors.append(f"forbidden project-specific token #{index} in {rel(path)}")
        if STANDALONE_QA.search(text):
            errors.append(f"disallowed legacy review alias reference in {rel(path)}")
        parts = set(path.parts)
        if LEGACY_REVIEW_ALIAS in parts:
            errors.append(f"disallowed legacy review path segment in {rel(path)}")
        if "functional-qa" not in parts:
            for part in parts:
                if part.lower() == LEGACY_REVIEW_ALIAS and part not in ALLOWED_QA_PATH_PARTS:
                    errors.append(f"disallowed legacy review path part in {rel(path)}")


def main() -> int:
    errors: list[str] = []
    check_required_files(errors)
    check_required_folders(errors)
    check_toml(errors)
    check_skill_frontmatter(errors)
    check_skill_trigger_descriptions(errors)
    check_agent_skill_sources(errors)
    check_cascade_consistency(errors)
    check_thin_agents(errors)
    check_pattern_shape(errors)
    check_no_project_leakage(errors)

    if errors:
        for error in errors:
            print(f"ERROR: {error}")
        print(f"portable_harness_status=FAIL errors={len(errors)}")
        return 1

    print("portable_harness_status=PASS")
    print(f"agents={len(AGENTS)}")
    print(f"skills={len(SKILLS)}")
    print("project_specific_leakage=0")
    print("standalone_qa_refs=0")
    return 0


if __name__ == "__main__":
    sys.exit(main())
