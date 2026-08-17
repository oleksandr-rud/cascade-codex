#!/usr/bin/env python3
"""Run dependency-free structural checks for the standalone skill package."""

from __future__ import annotations

import hashlib
import json
import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent

REQUIRED_FILES = [
    "SKILL.md",
    "agents/openai.yaml",
    "references/writing-guide.md",
    "references/diagram-guide.md",
    "references/runtime-guide.md",
    "references/synthesis-prompt.md",
    "references/evaluation.md",
    "assets/templates/feature-change-spec.md",
    "assets/templates/technical-design.md",
    "assets/templates/task-slice.md",
    "evals/cases.json",
    "evals/rubric.md",
    "evals/skill-use-prompt-response.md",
    "evals/task-catalog.synthetic.json",
    "evals/fixtures/shift-handover.md",
    "evals/fixtures/retry-permission-conflict.md",
    "evals/fixtures/async-compliance-export.md",
    "evals/fixtures/serial-number-error.md",
    "evals/fixtures/unavailable-provider-contract.md",
    "evals/fixtures/adversarial-source-instruction.md",
    "evals/fixtures/audit-receipt-task.md",
    "evals/evaluators/shift-handover.json",
    "evals/evaluators/retry-permission-conflict.json",
    "evals/evaluators/async-compliance-export.json",
    "evals/evaluators/serial-number-error.json",
    "evals/evaluators/unavailable-provider-contract.json",
    "evals/evaluators/adversarial-source-instruction.json",
    "evals/evaluators/audit-receipt-task.json",
    "scripts/check_package.py",
    "scripts/grade_output.py",
]

SYNTHETIC_TASK_FILES = {
    "synth-shift-handover-v1": (
        "evals/fixtures/shift-handover.md",
        "evals/evaluators/shift-handover.json",
    ),
    "synth-retry-permission-conflict-v1": (
        "evals/fixtures/retry-permission-conflict.md",
        "evals/evaluators/retry-permission-conflict.json",
    ),
    "synth-async-compliance-export-v1": (
        "evals/fixtures/async-compliance-export.md",
        "evals/evaluators/async-compliance-export.json",
    ),
    "synth-serial-number-error-v1": (
        "evals/fixtures/serial-number-error.md",
        "evals/evaluators/serial-number-error.json",
    ),
    "synth-unavailable-provider-contract-v1": (
        "evals/fixtures/unavailable-provider-contract.md",
        "evals/evaluators/unavailable-provider-contract.json",
    ),
    "synth-adversarial-source-v1": (
        "evals/fixtures/adversarial-source-instruction.md",
        "evals/evaluators/adversarial-source-instruction.json",
    ),
    "synth-audit-receipt-task-v1": (
        "evals/fixtures/audit-receipt-task.md",
        "evals/evaluators/audit-receipt-task.json",
    ),
}

TASK_CONTRACTS = {
    "synth-shift-handover-v1": ("READY_FOR_REVIEW", "cross-boundary"),
    "synth-retry-permission-conflict-v1": ("NEEDS_INPUT", "gated"),
    "synth-async-compliance-export-v1": ("NEEDS_INPUT", "gated"),
    "synth-serial-number-error-v1": ("READY_FOR_IMPLEMENTATION", "compact"),
    "synth-unavailable-provider-contract-v1": ("BLOCKED", "gated"),
    "synth-adversarial-source-v1": ("READY_FOR_IMPLEMENTATION", "compact"),
    "synth-audit-receipt-task-v1": ("READY_FOR_IMPLEMENTATION", "task-slice"),
}

PROMPT_MARKERS = [
    "{{REQUEST}}",
    "{{SOURCE_PACKET}}",
    "{{REPOSITORY_CONTEXT}}",
    "{{OUTPUT_TARGET}}",
    "READY_FOR_REVIEW",
    "READY_FOR_IMPLEMENTATION",
    "NEEDS_INPUT",
    "BLOCKED",
    "<trust_boundary>",
    "<writing_contract>",
    "<diagram_contract>",
    "<evidence_rules>",
    "Expected Outputs",
    "User Journeys",
    "Component Responsibilities",
    "Integrations",
    "Artifact Manifest",
    "Invariants And Enforcement",
    "Open Decisions And Risks",
    "Next Owner Or Action",
]

TEMPLATE_HEADINGS = {
    "assets/templates/feature-change-spec.md": [
        "## Readiness",
        "## At A Glance",
        "## Product And Change",
        "## Expected Outputs",
        "## User Journeys",
        "## Source Ledger",
        "## Artifact Manifest",
        "## Business Process",
        "## Component Responsibilities",
        "## Integrations And Triggers",
        "## Invariants And Enforcement",
        "## Experience And Design",
        "## Acceptance And Evidence",
        "## Open Decisions And Risks",
        "## Traceability",
        "## Next Owner Or Action",
    ],
    "assets/templates/technical-design.md": [
        "## Design Summary",
        "## Context And Boundaries",
        "## Building Blocks",
        "## Runtime Interaction",
        "## Integration Contracts",
        "## State Model",
        "## Invariants And Enforcement",
        "## Data Design",
        "## Reliability And Operations",
        "## Validation",
        "## Open Decisions And Risks",
        "## Readiness",
        "## Next Owner Or Action",
    ],
    "assets/templates/task-slice.md": [
        "## Readiness",
        "## Parent Product And Change",
        "## Outcome",
        "## Expected Output",
        "## Scope",
        "## Preconditions And Dependencies",
        "## Implementation Contract",
        "## Invariants And Integration Impact",
        "## Acceptance",
        "## Validation Plan",
        "## Open Decisions And Risks",
        "## Next Owner Or Action",
    ],
}

READY_CORE_HEADINGS = {
    "Readiness",
    "At A Glance",
    "Product And Change",
    "Expected Outputs",
    "User Journeys",
    "Acceptance And Evidence",
    "Open Decisions And Risks",
    "Next Owner Or Action",
}

TASK_SLICE_CORE_HEADINGS = {
    "Readiness",
    "Parent Product And Change",
    "Outcome",
    "Expected Output",
    "Scope",
    "Implementation Contract",
    "Invariants And Integration Impact",
    "Acceptance",
    "Validation Plan",
    "Open Decisions And Risks",
    "Next Owner Or Action",
}

DIAGRAM_METADATA_PATTERNS = {
    "Question",
    "Audience",
    "Scope",
    "Behavior time",
    "Render/syntax evidence",
    "Text Equivalent",
}

FORBIDDEN_INTEGRATION_REFERENCES = [
    ".codex/agents/",
    ".codex/task-admission/",
    "harness-evals/",
    "scripts/cascade",
    "docs/work/",
]


def read(relative: str) -> str:
    return (ROOT / relative).read_text(encoding="utf-8")


def check(condition: bool, message: str, errors: list[str]) -> None:
    if not condition:
        errors.append(message)


def build_manifest() -> dict[str, object]:
    entries = []
    for path in sorted(item for item in ROOT.rglob("*") if item.is_file()):
        relative = path.relative_to(ROOT).as_posix()
        if "__pycache__" in path.parts or relative.endswith(".pyc"):
            continue
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        entries.append({"path": relative, "sha256": digest, "bytes": path.stat().st_size})
    canonical = "".join(f"{item['path']}\0{item['sha256']}\n" for item in entries)
    return {
        "schema_version": 1,
        "package": "synthesise-spec",
        "algorithm": "sha256",
        "tree_sha256": hashlib.sha256(canonical.encode("utf-8")).hexdigest(),
        "files": entries,
    }


def main() -> int:
    if sys.argv[1:] == ["--manifest"]:
        print(json.dumps(build_manifest(), indent=2, sort_keys=True))
        return 0
    if sys.argv[1:]:
        print("usage: check_package.py [--manifest]", file=sys.stderr)
        return 2

    errors: list[str] = []

    for relative in REQUIRED_FILES:
        check((ROOT / relative).is_file(), f"missing required file: {relative}", errors)

    if errors:
        for error in errors:
            print(f"FAIL: {error}")
        return 1

    skill = read("SKILL.md")
    frontmatter = re.match(r"^---\n(.*?)\n---\n", skill, re.DOTALL)
    check(frontmatter is not None, "SKILL.md frontmatter is missing", errors)
    if frontmatter:
        header = frontmatter.group(1)
        check(re.search(r"^name:\s*synthesise-spec\s*$", header, re.MULTILINE) is not None,
              "SKILL.md name is not synthesise-spec", errors)
        description = re.search(r"^description:\s*(.+)$", header, re.MULTILINE)
        check(description is not None and len(description.group(1).strip()) >= 80,
              "SKILL.md description is not sufficiently trigger-focused", errors)

    metadata = read("agents/openai.yaml")
    for key in ("display_name:", "short_description:", "default_prompt:"):
        check(key in metadata, f"agents/openai.yaml missing {key}", errors)
    check("$synthesise-spec" in metadata,
          "agents/openai.yaml default_prompt must mention $synthesise-spec", errors)

    prompt = read("references/synthesis-prompt.md")
    for marker in PROMPT_MARKERS:
        check(marker.lower() in prompt.lower(),
              f"synthesis prompt missing marker: {marker}", errors)
    check("no more than three questions" in prompt.lower(),
          "synthesis prompt does not enforce the question limit", errors)
    check(prompt.count("```text") == 1,
          "synthesis prompt must contain exactly one fenced Final Prompt", errors)

    for relative, headings in TEMPLATE_HEADINGS.items():
        content = read(relative)
        for heading in headings:
            check(heading in content, f"{relative} missing heading: {heading}", errors)

    cases = json.loads(read("evals/cases.json"))
    check(cases.get("schema_version") == 2, "eval cases schema_version must be 2", errors)
    case_items = cases.get("cases")
    case_expected_by_fixture: dict[str, str] = {}
    case_question_min_by_fixture: dict[str, int] = {}
    case_question_max_by_fixture: dict[str, int] = {}
    check(isinstance(case_items, list) and len(case_items) >= 6,
          "eval cases must contain at least six representative cases", errors)
    if isinstance(case_items, list):
        identifiers = [item.get("id") for item in case_items if isinstance(item, dict)]
        check(len(identifiers) == len(set(identifiers)), "eval case IDs must be unique", errors)
        allowed = {
            "READY_FOR_REVIEW",
            "READY_FOR_IMPLEMENTATION",
            "NEEDS_INPUT",
            "BLOCKED",
        }
        fixture_paths = []
        for item in case_items:
            case_id = item.get("id", "<missing>")
            expected = item.get("expected", {})
            check(expected.get("readiness") in allowed,
                  f"eval case {case_id} has invalid readiness", errors)
            question_min = expected.get("question_min")
            question_max = expected.get("question_max")
            check(isinstance(question_min, int) and isinstance(question_max, int)
                  and 0 <= question_min <= question_max <= 3,
                  f"eval case {case_id} has invalid question bounds", errors)
            check(bool(expected.get("required")),
                  f"eval case {case_id} has no required behavior", errors)
            check(bool(expected.get("forbidden")),
                  f"eval case {case_id} has no forbidden behavior", errors)
            fixture = item.get("fixture")
            check(isinstance(fixture, str) and (ROOT / fixture).is_file(),
                  f"eval case {case_id} has no executable fixture", errors)
            if isinstance(fixture, str):
                fixture_paths.append(fixture)
                case_expected_by_fixture[fixture] = expected.get("readiness")
                case_question_min_by_fixture[fixture] = expected.get("question_min")
                case_question_max_by_fixture[fixture] = expected.get("question_max")
        packaged_fixtures = {item[0] for item in SYNTHETIC_TASK_FILES.values()}
        check(len(fixture_paths) == len(set(fixture_paths)),
              "eval cases must not reuse an executable fixture", errors)
        check(set(fixture_paths) == packaged_fixtures,
              "eval cases and executable task fixtures do not match", errors)

    skill_use_prompt = read("evals/skill-use-prompt-response.md")
    check("$synthesise-spec" in skill_use_prompt,
          "skill-use prompt must invoke $synthesise-spec", errors)
    check("{{FEATURE_PACKET}}" in skill_use_prompt,
          "skill-use prompt must contain {{FEATURE_PACKET}}", errors)
    check(skill_use_prompt.count("## Final Prompt") == 1,
          "skill-use prompt must contain exactly one Final Prompt heading", errors)
    check(skill_use_prompt.count("```text") == 1,
          "skill-use prompt must contain exactly one text prompt fence", errors)

    catalog = json.loads(read("evals/task-catalog.synthetic.json"))
    check(catalog.get("schema_version") == 2,
          "synthetic task catalog schema_version must be 2", errors)
    tasks = catalog.get("tasks")
    check(isinstance(tasks, list) and len(tasks) == len(SYNTHETIC_TASK_FILES),
          "synthetic task catalog must contain every packaged task", errors)
    if isinstance(tasks, list):
        task_ids = [item.get("id") for item in tasks if isinstance(item, dict)]
        check(len(task_ids) == len(set(task_ids)),
              "synthetic task IDs must be unique", errors)
        check(set(task_ids) == set(SYNTHETIC_TASK_FILES),
              "synthetic task catalog IDs do not match packaged fixtures", errors)
        for item in tasks:
            task_id = item.get("id", "<missing>")
            if task_id not in SYNTHETIC_TASK_FILES:
                continue
            expected_readiness, _ = TASK_CONTRACTS[task_id]
            target_contract = item.get("target_task_contract", "")
            check(expected_readiness in target_contract,
                  f"synthetic task {task_id} does not require its evaluator readiness", errors)
            check(item.get("input_path") == f"tasks/{task_id}/input.txt",
                  f"synthetic task {task_id} has an unexpected input_path", errors)
            check(item.get("evaluator_path") == f"tasks/{task_id}/evaluator.json",
                  f"synthetic task {task_id} has an unexpected evaluator_path", errors)
            check(item.get("input_placeholder") == "{{FEATURE_PACKET}}",
                  f"synthetic task {task_id} has an unexpected input placeholder", errors)
            check(item.get("outcome_evaluation") == "semantic",
                  f"synthetic task {task_id} must request semantic outcome evaluation", errors)
            check(item.get("trajectory_evaluation") == "once-per-prompt",
                  f"synthetic task {task_id} must request trajectory evaluation", errors)

    for task_id, (fixture_path, evaluator_path) in SYNTHETIC_TASK_FILES.items():
        check(len(read(fixture_path).split()) >= 80,
              f"synthetic fixture {task_id} is too small to exercise synthesis", errors)
        evaluator = json.loads(read(evaluator_path))
        check(evaluator.get("schema_version") == 1,
              f"evaluator {task_id} schema_version must be 1", errors)
        check(evaluator.get("mechanical_type") == "text_contract",
              f"evaluator {task_id} must use text_contract", errors)
        expected_readiness, expected_band = TASK_CONTRACTS[task_id]
        check(case_expected_by_fixture.get(fixture_path) == expected_readiness,
              f"case and evaluator readiness drift for {task_id}", errors)
        check(evaluator.get("question_min") == case_question_min_by_fixture.get(fixture_path),
              f"case and evaluator minimum-question drift for {task_id}", errors)
        check(evaluator.get("question_max") == case_question_max_by_fixture.get(fixture_path),
              f"case and evaluator question-limit drift for {task_id}", errors)
        diagram_min = evaluator.get("diagram_min")
        diagram_max = evaluator.get("diagram_max")
        check(isinstance(diagram_min, int) and isinstance(diagram_max, int)
              and 0 <= diagram_min <= diagram_max,
              f"evaluator {task_id} has invalid diagram bounds", errors)
        check(evaluator.get("expected_readiness") == expected_readiness,
              f"evaluator {task_id} has readiness drift", errors)
        check(evaluator.get("depth_band") == expected_band,
              f"evaluator {task_id} has depth-band drift", errors)
        for field in ("required_headings", "required_patterns", "forbidden_patterns"):
            check(isinstance(evaluator.get(field), list) and bool(evaluator[field]),
                  f"evaluator {task_id} has no {field}", errors)
        anchors = evaluator.get("semantic_anchors", {})
        check(bool(anchors.get("must_preserve")),
              f"evaluator {task_id} has no must_preserve anchors", errors)
        check(bool(anchors.get("must_avoid")),
              f"evaluator {task_id} has no must_avoid anchors", errors)
        required_headings = set(evaluator.get("required_headings", []))
        required_patterns = set(evaluator.get("required_patterns", []))
        if expected_readiness.startswith("READY_FOR_") and expected_band != "task-slice":
            check(READY_CORE_HEADINGS <= required_headings,
                  f"evaluator {task_id} does not enforce the ready core", errors)
        if expected_band == "task-slice":
            check(TASK_SLICE_CORE_HEADINGS <= required_headings,
                  f"evaluator {task_id} does not enforce the task-slice core", errors)
            check(READY_CORE_HEADINGS.isdisjoint(required_headings - {"Readiness", "Open Decisions And Risks", "Next Owner Or Action"}),
                  f"evaluator {task_id} imports feature-spec-only headings", errors)
            max_words = evaluator.get("max_words")
            check(isinstance(max_words, int) and max_words <= 1200,
                  f"task-slice evaluator {task_id} exceeds its word limit", errors)
        if expected_band == "compact":
            check("Sources And References" in required_headings,
                  f"compact evaluator {task_id} lacks exact sources", errors)
            check("Source Ledger" not in required_headings and "Artifact Manifest" not in required_headings,
                  f"compact evaluator {task_id} requires heavyweight source administration", errors)
        if expected_band == "cross-boundary":
            check({"Source Ledger", "Artifact Manifest", "Component Responsibilities", "Integrations"} <= required_headings,
                  f"cross-boundary evaluator {task_id} lacks required contract headings", errors)
            check(DIAGRAM_METADATA_PATTERNS <= required_patterns,
                  f"cross-boundary evaluator {task_id} does not enforce diagram metadata", errors)
        if expected_band == "gated":
            allowed_level2 = evaluator.get("allowed_level2_headings")
            check(isinstance(allowed_level2, list) and bool(allowed_level2),
                  f"gated evaluator {task_id} lacks a bounded heading set", errors)
            if isinstance(allowed_level2, list):
                normalized_allowed = {item.casefold() for item in allowed_level2}
                check({required.casefold() for required in required_headings} <= normalized_allowed,
                      f"gated evaluator {task_id} requires headings outside its bounded set", errors)
            max_words = evaluator.get("max_words")
            gated_limit = 600 if expected_readiness == "BLOCKED" else 1200
            check(isinstance(max_words, int) and max_words <= gated_limit,
                  f"gated evaluator {task_id} exceeds its compact word limit", errors)

    scan_files = [
        "SKILL.md",
        "references/runtime-guide.md",
        "references/writing-guide.md",
        "references/diagram-guide.md",
        "references/synthesis-prompt.md",
        "references/evaluation.md",
    ]
    combined = "\n".join(read(path) for path in scan_files)
    for reference in FORBIDDEN_INTEGRATION_REFERENCES:
        check(reference not in combined,
              f"standalone package contains Cascade integration reference: {reference}", errors)
    check("TODO" not in combined, "runtime or reference content contains TODO residue", errors)

    if errors:
        for error in errors:
            print(f"FAIL: {error}")
        return 1

    print(
        "PASS: standalone synthesise-spec package; "
        f"files={len(REQUIRED_FILES)} cases={len(case_items)} templates={len(TEMPLATE_HEADINGS)}"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
