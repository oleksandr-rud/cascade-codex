#!/usr/bin/env python3
"""Apply one dependency-free mechanical text contract to one spec output."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path


READINESS_STATES = (
    "READY_FOR_REVIEW",
    "READY_FOR_IMPLEMENTATION",
    "NEEDS_INPUT",
    "BLOCKED",
)


def normalize_heading(value: str) -> str:
    return re.sub(r"\s+", " ", value.strip().strip("#").strip()).casefold()


def readiness_section(text: str) -> str:
    lines = text.splitlines()
    start = None
    level = None
    for index, line in enumerate(lines):
        match = re.match(r"^(#{1,6})\s+(.+?)\s*$", line)
        if match and "readiness" in normalize_heading(match.group(2)):
            start = index + 1
            level = len(match.group(1))
            break
    if start is None:
        return ""
    end = len(lines)
    for index in range(start, len(lines)):
        match = re.match(r"^(#{1,6})\s+", lines[index])
        if match and len(match.group(1)) <= level:
            end = index
            break
    return "\n".join(lines[start:end])


def declared_readiness(text: str) -> list[str]:
    section = readiness_section(text)
    for line in section.splitlines():
        if re.search(r"(?i)\b(?:status|readiness)\s*:", line):
            return [state for state in READINESS_STATES if re.search(rf"\b{state}\b", line)]
    for line in section.splitlines():
        states = [state for state in READINESS_STATES if re.search(rf"\b{state}\b", line)]
        residue = re.sub(r"[`*\s]", "", line)
        if len(states) == 1 and residue == states[0]:
            return states
    return []


def diagram_contract_failures(text: str) -> list[str]:
    failures = []
    lines = text.splitlines()
    starts = [index for index, line in enumerate(lines) if line.strip().casefold() == "```mermaid"]
    for ordinal, start in enumerate(starts, 1):
        end = next(
            (index for index in range(start + 1, len(lines)) if lines[index].strip() == "```"),
            None,
        )
        if end is None:
            failures.append(f"diagram {ordinal} has no closing fence")
            continue
        adjacent = "\n".join(lines[max(0, start - 15):min(len(lines), end + 20)])
        fields = {
            "question": r"(?i)\bquestion(?:\s+answered)?\s*:",
            "audience": r"(?i)\baudience\s*:",
            "scope": r"(?i)\bscope(?:\s+and\s+abstraction)?\s*:",
            "behavior time": r"(?i)\bbehavior\s+time\s*:",
            "render/syntax evidence": r"(?i)\brender/syntax\s+evidence\s*:\*{0,2}\s*`?(?:PASS|FAIL|NOT_RUN)`?",
            "text equivalent": r"(?i)\btext\s+equivalent\s*:",
        }
        for name, pattern in fields.items():
            if re.search(pattern, adjacent) is None:
                failures.append(f"diagram {ordinal} missing adjacent {name}")
    return failures


def markdown_table_failures(text: str) -> list[str]:
    """Reject malformed pipe tables whose rows do not match the header width."""
    failures = []
    lines = text.splitlines()
    index = 0
    while index < len(lines):
        if not lines[index].lstrip().startswith("|"):
            index += 1
            continue
        start = index
        block = []
        while index < len(lines) and lines[index].lstrip().startswith("|"):
            block.append(lines[index])
            index += 1
        if len(block) < 2 or re.search(r"-{3,}", block[1]) is None:
            continue
        widths = [len(re.findall(r"(?<!\\)\|", line)) for line in block]
        if any(width != widths[0] for width in widths[1:]):
            failures.append(
                f"markdown table at line {start + 1} has inconsistent row widths {widths}"
            )
    return failures


def grade(evaluator: dict[str, object], text: str) -> dict[str, object]:
    failures: list[str] = []
    headings = [
        normalize_heading(match.group(1))
        for match in re.finditer(r"^#{1,6}\s+(.+?)\s*$", text, re.MULTILINE)
    ]
    level2_headings = [
        normalize_heading(match.group(1))
        for match in re.finditer(r"^##\s+(.+?)\s*$", text, re.MULTILINE)
    ]
    level1_headings = [
        normalize_heading(match.group(1))
        for match in re.finditer(r"^#\s+(.+?)\s*$", text, re.MULTILINE)
    ]
    folded = text.casefold()

    for required in evaluator.get("required_headings", []):
        expected = normalize_heading(str(required))
        if expected not in headings:
            failures.append(f"missing heading: {required}")

    for required in evaluator.get("required_patterns", []):
        if str(required).casefold() not in folded:
            failures.append(f"missing pattern: {required}")

    for forbidden in evaluator.get("forbidden_patterns", []):
        if str(forbidden).casefold() in folded:
            failures.append(f"forbidden pattern: {forbidden}")

    allowed_level2 = evaluator.get("allowed_level2_headings")
    if isinstance(allowed_level2, list):
        allowed = {normalize_heading(str(item)) for item in allowed_level2}
        unexpected = [heading for heading in level2_headings if heading not in allowed]
        if unexpected:
            failures.append(f"unexpected level-2 headings: {unexpected}")
        missing_level2 = sorted(allowed - set(level2_headings))
        if missing_level2:
            failures.append(f"missing required level-2 headings: {missing_level2}")
        if len(level1_headings) != 1:
            failures.append(
                f"gated document requires exactly one level-1 title, found {len(level1_headings)}"
            )

    declared = declared_readiness(text)
    expected_readiness = evaluator.get("expected_readiness")
    if declared != [expected_readiness]:
        failures.append(
            f"readiness declaration: expected {expected_readiness}, found {declared or 'none'}"
        )

    question_count = len(
        re.findall(
            r"(?im)^\s*(?:(?:[-*]|\d+[.)])\s*)?(?:\*\*)?Decision:(?:\*\*)?\s*",
            text,
        )
    )
    question_min = evaluator.get("question_min")
    question_max = evaluator.get("question_max")
    if not isinstance(question_min, int) or not isinstance(question_max, int):
        failures.append("evaluator has invalid question bounds")
    elif not question_min <= question_count <= question_max:
        failures.append(
            f"question count {question_count} outside [{question_min}, {question_max}]"
        )

    diagram_count = len(re.findall(r"(?im)^```mermaid\s*$", text))
    diagram_min = evaluator.get("diagram_min")
    diagram_max = evaluator.get("diagram_max")
    if not isinstance(diagram_min, int) or not isinstance(diagram_max, int):
        failures.append("evaluator has invalid diagram bounds")
    elif not diagram_min <= diagram_count <= diagram_max:
        failures.append(
            f"diagram count {diagram_count} outside [{diagram_min}, {diagram_max}]"
        )
    failures.extend(diagram_contract_failures(text))
    failures.extend(markdown_table_failures(text))

    word_count = len(re.findall(r"\b[\w’'-]+\b", text, re.UNICODE))
    max_words = evaluator.get("max_words")
    if not isinstance(max_words, int) or word_count > max_words:
        failures.append(f"word count {word_count} exceeds {max_words}")

    return {
        "schema_version": 1,
        "verdict": "PASS" if not failures else "FAIL",
        "expected_readiness": expected_readiness,
        "declared_readiness": declared,
        "question_count": question_count,
        "diagram_count": diagram_count,
        "word_count": word_count,
        "failures": failures,
        "semantic_evaluation": "NOT_RUN",
    }


def main() -> int:
    if len(sys.argv) != 3:
        print("usage: grade_output.py EVALUATOR.json OUTPUT.md", file=sys.stderr)
        return 2
    evaluator_path = Path(sys.argv[1])
    output_path = Path(sys.argv[2])
    evaluator = json.loads(evaluator_path.read_text(encoding="utf-8"))
    result = grade(evaluator, output_path.read_text(encoding="utf-8"))
    print(json.dumps(result, indent=2, sort_keys=True))
    return 0 if result["verdict"] == "PASS" else 1


if __name__ == "__main__":
    sys.exit(main())
