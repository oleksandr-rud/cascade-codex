#!/usr/bin/env python3
"""Validate Cascade wiring and project-agnostic content."""

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
    "docs/work/examples/_index.md",
    "docs/work/lanes/.gitkeep",
    "docs/work/reports/_index.md",
    "docs/patterns/workflow.md",
    "docs/patterns/boundaries.md",
    "docs/patterns/testing.md",
    "docs/patterns/context-memory.md",
    ".codex/skills/discover/templates/product-spec.md",
    ".codex/skills/discover/templates/journey.md",
    ".codex/skills/discover/templates/brand-spec.md",
    ".codex/skills/market-validation/templates/market-validation-report.md",
    ".codex/skills/pain-mining/templates/pain-mining-report.md",
    ".codex/skills/competitive-map/templates/competitive-map.md",
    ".codex/skills/market-economics/templates/economics-model.md",
    ".codex/skills/hypothesis-scoring/templates/hypothesis-scorecard.md",
    ".codex/skills/validation-experiments/templates/validation-experiment-plan.md",
    ".codex/skills/adversarial-critic/templates/critic-report.md",
    ".codex/skills/adapt-harness/checklists/project-onboarding-analysis.md",
    ".codex/skills/adapt-harness/templates/project-onboarding-workflow.md",
    ".codex/skills/adapt-harness/templates/project-part-spec.md",
    ".codex/skills/agents-best-practices/references/harness-checklists.md",
    ".codex/skills/agentic-workflow-builder/checklists/workflow-packet-quality.md",
    ".codex/skills/agentic-workflow-builder/templates/agentic-workflow-packet.md",
    ".codex/skills/synthesis-to-spec/templates/spec-synthesis-packet.md",
    ".codex/skills/compose-spec/templates/product-prd.md",
    ".codex/skills/compose-spec/templates/persona.md",
    ".codex/skills/compose-spec/templates/product-spec.md",
    ".codex/skills/compose-spec/templates/requirement-row.md",
    ".codex/skills/compose-spec/templates/journey.md",
    ".codex/skills/compose-spec/templates/scenario-row.md",
    ".codex/skills/compose-spec/templates/transformed-spec.md",
    ".codex/skills/brand-positioning/templates/brand-positioning.md",
    ".codex/skills/brand-positioning/templates/message-map.md",
    ".codex/skills/design-system/templates/design-rule.md",
    ".codex/skills/design-system/templates/component-rule.md",
    ".codex/skills/functional-qa/checklists/functional-test-quality.md",
    ".codex/skills/functional-qa/templates/functional-test-plan.md",
    ".codex/skills/test-autorepair/checklists/semantic-repair-checklist.md",
    ".codex/skills/test-autorepair/templates/repair-report.md",
    ".codex/skills/context/templates/snapshot.md",
    ".codex/skills/develop-skill/templates/skill-design-brief.md",
    ".codex/skills/closeout/templates/learn-routing.md",
    ".codex/skills/closeout/templates/doc-routing-decision.md",
    ".codex/skills/closeout/templates/thin-doc-diff.md",
    ".codex/skills/docs-impact-map/templates/impact-map.md",
    ".codex/skills/architecture-review/checklists/deep-module-review.md",
    ".codex/skills/codebase-audit/checklists/trajectory-generation.md",
    ".codex/skills/codebase-audit/templates/trajectory-spec.md",
    ".codex/skills/auth-analysis/checklists/auth-hardening.md",
    ".codex/skills/auth-analysis/templates/auth-analysis-report.md",
    ".codex/skills/secure-design/checklists/secure-design.md",
    ".codex/skills/secure-design/templates/secure-design-review.md",
    ".codex/skills/ux-flow-review/checklists/ux-flow-review.md",
    ".codex/skills/ux-flow-review/references/ux-flow-patterns.md",
    ".codex/skills/ux-flow-review/templates/product-ux-delta.md",
    ".codex/skills/ux-flow-review/templates/ux-flow-review.md",
    ".codex/skills/accessibility-review/checklists/accessibility-review.md",
    ".codex/skills/accessibility-review/references/accessibility-sources.md",
    ".codex/skills/accessibility-review/templates/accessibility-review.md",
    ".codex/skills/visual-qa/checklists/visual-validation.md",
    ".codex/skills/visual-qa/references/visual-validation.md",
    ".codex/skills/visual-qa/templates/visual-validation-report.md",
    ".codex/skills/ingest-spec/templates/transformed-spec.md",
    ".codex/skills/ingest-spec/templates/scenario-row.md",
    ".codex/skills/codex-maintenance/checklists/harness-maintenance.md",
    ".codex/skills/codex-maintenance/checklists/codex-surface-quality.md",
    ".codex/skills/codex-maintenance/templates/reference-inventory.md",
    ".codex/skills/codex-maintenance/templates/codex-practice-audit.md",
    ".codex/skills/codex-maintenance/templates/maintenance-handoff.md",
    ".codex/agents/security/checklists/security-agent-workflows.md",
    ".codex/agents/designer/checklists/designer-workflows.md",
]

AGENTS = [
    "orchestrator",
    "project-onboarder",
    "agent-engineer",
    "business-analyst",
    "security",
    "designer",
]

SKILLS = [
    "context",
    "agentic-workflow-builder",
    "orchestrate-work",
    "plan-change",
    "architecture-review",
    "codebase-audit",
    "auth-analysis",
    "secure-design",
    "ux-flow-review",
    "accessibility-review",
    "visual-qa",
    "discover",
    "market-validation",
    "pain-mining",
    "competitive-map",
    "market-economics",
    "hypothesis-scoring",
    "validation-experiments",
    "adversarial-critic",
    "synthesis-to-spec",
    "compose-spec",
    "brand-positioning",
    "design-system",
    "docs-impact-map",
    "implement-change",
    "functional-qa",
    "review-change",
    "validate-change",
    "test-autorepair",
    "issue-intake",
    "closeout",
    "agents-best-practices",
    "codex-maintenance",
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
    "docs/work/examples",
    "docs/work/lanes",
    "docs/work/reports",
]

ALLOWED_DOC_FOLDERS = {
    "docs",
    "docs/backlog",
    "docs/brand",
    "docs/design",
    "docs/patterns",
    "docs/product",
    "docs/product/personas",
    "docs/specs",
    "docs/specs/incoming",
    "docs/specs/transformed",
    "docs/work",
    "docs/work/examples",
    "docs/work/lanes",
    "docs/work/reports",
}

CANONICAL_CASCADE_TOKENS = [
    "context",
    "ingest-spec",
    "discover",
    "docs-impact-map",
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
    "docs-impact-map",
    "market-validation",
    "synthesis-to-spec",
    "compose-spec",
}

REQUIRED_HARNESS_AGENTS = {
    "default_orchestrator": "orchestrator",
    "onboarding": "project-onboarder",
    "harness_design": "agent-engineer",
    "business_analysis": "business-analyst",
    "security_review": "security",
    "design_review": "designer",
}

SKIP_LEAKAGE_PATH_PARTS = {
    ".git",
    "__pycache__",
}

SKIP_LEAKAGE_FILENAMES = {
    ".DS_Store",
}

ACTIVE_STALE_SKILL_REFERENCES = [
    "architecture-decision",
    "product-discovery",
    "skills-docs-learning-lifecycle-audit",
    "source-branch-extraction",
]

ACTIVE_SKILL_REFERENCE_ROOTS = [
    ".codex/skills",
    ".codex/agents",
]

ACTIVE_SKILL_REFERENCE_FILES = [
    "AGENTS.md",
    "CODEX.md",
    "README.md",
    ".codex/README.md",
    ".codex/config.toml",
]

AGENTS_BLOAT_PATTERNS = [
    r"(?im)^#+\s*agent\s+system\b",
    r"(?im)^#+\s*key\s+.+terms\b",
    r"(?im)^#+\s*histor",
    r"(?im)^#+\s*learned\s+lessons\b",
    r"(?im)^#+\s*full\s+stack\b",
    r"(?im)^#+\s*dependency\s+inventory\b",
]

STALE_TEXT_PATTERNS = [
    r"\bportable-codex-harness\b",
    r"\bportable harness\b",
    r"\bportable kit\b",
    r"\bportable package\b",
    r"\bportable validator\b",
    r"\bvalidate_portable_harness\.py\b",
    r"\bportable_harness_status\b",
    r"(?m)^# Codex Harness Wiring\b",
    r"(?m)^# Codex Runtime Bridge\b",
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
    "develop-skill": [
        r"Create|port|rename|refactor|validate",
        r"trigger contracts|source order|outputs|guardrails|quality gates",
    ],
    "agentic-workflow-builder": [
        r"agent/skill workflow artifact|agentic workflow|workflow checklist|workflow packet|delegation workflow|multi-agent workflow",
        r"source order|write scope|validation|handoff",
    ],
    "market-validation": [
        r"market validation|business-analysis",
        r"competitors|pain|economics|experiments",
    ],
    "pain-mining": [
        r"user pain|pain",
        r"reviews|forums|interviews|support",
    ],
    "competitive-map": [
        r"competitor|competitors",
        r"direct|substitute|infrastructure",
    ],
    "market-economics": [
        r"willingness-to-pay|pricing|unit economics",
        r"velocity|acquisition",
    ],
    "hypothesis-scoring": [
        r"hypotheses|hypothesis",
        r"pain|urgency|budget|feasibility",
    ],
    "validation-experiments": [
        r"validation experiments|experiments",
        r"interviews|landing|prototype|pilot",
    ],
    "adversarial-critic": [
        r"Stress-test|stress",
        r"market-validation|hypotheses|evidence",
    ],
    "synthesis-to-spec": [
        r"validated|business-analysis|market-validation",
        r"plan-ready|compose-spec|doc routing",
    ],
    "compose-spec": [
        r"PRDs|personas|product specs",
        r"requirements|journeys|scenarios|transformed specs",
    ],
    "brand-positioning": [
        r"brand|tone|naming|message|content",
        r"positioning|visual direction|copy",
    ],
    "design-system": [
        r"design|UX|tokens|components|accessibility",
        r"responsive|interaction|visual",
    ],
    "codebase-audit": [
        r"security audit|audit",
        r"trajectory|inventory|security",
    ],
    "auth-analysis": [
        r"JWT|sessions|RBAC|auth",
        r"tenant|route|frontend",
    ],
    "secure-design": [
        r"proposed feature|design|architecture",
        r"insecure|abuse|secure-by-design",
    ],
    "ux-flow-review": [
        r"UX review|session workflow|screen|dashboard",
        r"mockups|implementation|validation",
    ],
    "accessibility-review": [
        r"accessibility|WCAG|ARIA|keyboard",
        r"focus|contrast|status",
    ],
    "visual-qa": [
        r"screenshot|visual validation|viewport",
        r"layout|responsive|overflow",
    ],
    "docs-impact-map": [
        r"product|design|brand|spec",
        r"impact|dependenc|cross-folder",
    ],
    "orchestrate-work": [
        r"split|schedule|track|merge",
        r"serialized|dependencies|conflicts",
    ],
    "plan-change": [
        r"non-atomic",
        r"behavior examples|validation plan",
    ],
    "implement-change": [
        r"clear request|approved plan",
        r"scoped code or doc changes|implementation|bug fixing",
    ],
    "review-change": [
        r"branch|PR|work-in-progress diff|fixed-point change",
        r"standards|spec/request|findings only",
    ],
    "validate-change": [
        r"after or during a change|aggregate",
        r"command|test|type|diff|functional acceptance|review evidence",
    ],
    "closeout": [
        r"Finish|task|handoff|closeout",
        r"validation evidence|memory|thin.*diff",
    ],
    "codex-maintenance": [
        r"Codex|Cascade|harness",
        r"skill|agent|AGENTS|config|file.?tree|reference",
        r"permission|memory|observability|eval|handoff|scope",
    ],
}

REQUIRED_SKILL_SURFACES = {
    "ingest-spec": [
        "docs/specs/incoming/",
        "docs/specs/transformed/",
        "docs/product/",
        "docs/design/",
        "docs/brand/",
        "docs/work/active.md",
        "docs/work/lanes/",
        "docs/backlog/_index.md",
        "docs/glossary.md",
        "docs/patterns/boundaries.md",
        "Doc Routing Decision Matrix",
        "harness.config.yaml",
        "market-validation",
        "synthesis-to-spec",
        "compose-spec",
    ],
    "discover": [
        "docs/product/",
        "docs/design/",
        "docs/brand/",
        "docs/specs/",
        "docs/glossary.md",
        "docs-impact-map",
        "compose-spec",
        "Doc Routing Decision Matrix",
    ],
    "develop-skill": [
        ".codex/skills/*/SKILL.md",
        ".codex/agents/*/AGENT.md",
        ".codex/agents/*/skills.yaml",
        "scripts/validate_cascade_codex.py",
        "Context7",
        "Perplexity",
        "Technology Documentation MCP",
        "rg --files",
        "targeted `rg -n`",
        "Artifact Decision Matrix",
        "templates/skill-design-brief.md",
        "trigger-focused `description`",
        "forward-testing",
    ],
    "agentic-workflow-builder": [
        "AGENTS.md",
        "CODEX.md",
        ".codex/config.toml",
        ".codex/agents/{agent}.toml",
        ".codex/agents/{agent}/AGENT.md",
        ".codex/agents/{agent}/skills.yaml",
        ".codex/skills/{skill}/SKILL.md",
        ".codex/agents/{agent}/checklists/",
        "docs/patterns/workflow.md",
        "docs/patterns/boundaries.md",
        "docs/patterns/testing.md",
        "templates/agentic-workflow-packet.md",
        "checklists/workflow-packet-quality.md",
        "plan-change",
        "functional-qa",
        "implement-change",
        "validate-change",
        "closeout",
    ],
    "docs-impact-map": [
        "docs/product/",
        "docs/design/",
        "docs/brand/",
        "docs/specs/",
        "docs/backlog/_index.md",
        "docs/glossary.md",
        "docs/patterns/",
        "docs/work/active.md",
        "docs/work/lanes/",
        "docs/work/reports/",
        "docs/structure.md",
        "templates/impact-map.md",
        "Doc Routing Decision Matrix",
        "discover",
        "market-validation",
        "synthesis-to-spec",
        "compose-spec",
        "ingest-spec",
        "plan-change",
        "functional-qa",
        "closeout",
    ],
    "market-validation": [
        "docs/product/",
        "docs/specs/",
        "docs/design/",
        "docs/brand/",
        "docs/backlog/_index.md",
        "docs/work/lanes/",
        "docs/work/reports/",
        "docs-impact-map",
        "ingest-spec",
        "synthesis-to-spec",
        "compose-spec",
        "Doc Routing Decision Matrix",
        "templates/market-validation-report.md",
    ],
    "pain-mining": [
        "docs/product/",
        "docs/specs/",
        "docs/backlog/_index.md",
        "docs/work/lanes/",
        "market-validation",
        "hypothesis-scoring",
        "validation-experiments",
        "synthesis-to-spec",
        "Doc Routing Decision Matrix",
        "templates/pain-mining-report.md",
    ],
    "competitive-map": [
        "market-validation",
        "pain-mining",
        "market-economics",
        "hypothesis-scoring",
        "validation-experiments",
        "synthesis-to-spec",
        "Doc Routing Decision Matrix",
        "templates/competitive-map.md",
    ],
    "market-economics": [
        "market-validation",
        "validation-experiments",
        "hypothesis-scoring",
        "Doc Routing Decision Matrix",
        "templates/economics-model.md",
    ],
    "hypothesis-scoring": [
        "market-validation",
        "pain-mining",
        "competitive-map",
        "market-economics",
        "validation-experiments",
        "adversarial-critic",
        "synthesis-to-spec",
        "Doc Routing Decision Matrix",
        "templates/hypothesis-scorecard.md",
    ],
    "validation-experiments": [
        "docs/backlog/_index.md",
        "market-validation",
        "hypothesis-scoring",
        "synthesis-to-spec",
        "plan-change",
        "Doc Routing Decision Matrix",
        "templates/validation-experiment-plan.md",
    ],
    "adversarial-critic": [
        "market-validation",
        "validation-experiments",
        "synthesis-to-spec",
        "Doc Routing Decision Matrix",
        "templates/critic-report.md",
    ],
    "synthesis-to-spec": [
        "docs/product/_index.md",
        "docs/product/requirements.md",
        "docs/product/journeys.md",
        "docs/product/scenarios.md",
        "docs/product/personas/",
        "docs/specs/transformed/",
        "docs/design/",
        "docs/brand/",
        "docs/backlog/_index.md",
        "docs/glossary.md",
        "docs-impact-map",
        "ingest-spec",
        "compose-spec",
        "plan-change",
        "functional-qa",
        "Doc Routing Decision Matrix",
        "templates/spec-synthesis-packet.md",
    ],
    "compose-spec": [
        "docs/product/_index.md",
        "docs/product/requirements.md",
        "docs/product/journeys.md",
        "docs/product/scenarios.md",
        "docs/product/personas/",
        "docs/specs/transformed/",
        "docs/backlog/_index.md",
        "docs/glossary.md",
        "docs-impact-map",
        "synthesis-to-spec",
        "plan-change",
        "functional-qa",
        "Doc Routing Decision Matrix",
        "templates/product-prd.md",
        "templates/persona.md",
        "templates/product-spec.md",
        "templates/requirement-row.md",
        "templates/journey.md",
        "templates/scenario-row.md",
        "templates/transformed-spec.md",
    ],
    "brand-positioning": [
        "docs/brand/",
        "docs/product/",
        "docs/design/",
        "docs/specs/",
        "docs/backlog/_index.md",
        "docs/glossary.md",
        "docs-impact-map",
        "synthesis-to-spec",
        "Doc Routing Decision Matrix",
        "plan-change",
        "functional-qa",
        "templates/brand-positioning.md",
        "templates/message-map.md",
    ],
    "design-system": [
        "docs/design/_index.md",
        "docs/design/interaction-model.md",
        "docs/design/tokens.md",
        "docs/product/",
        "docs/brand/",
        "docs/specs/",
        "docs/backlog/_index.md",
        "docs/glossary.md",
        "docs-impact-map",
        "brand-positioning",
        "synthesis-to-spec",
        "market-validation",
        "Doc Routing Decision Matrix",
        "plan-change",
        "functional-qa",
        "templates/design-rule.md",
        "templates/component-rule.md",
    ],
    "orchestrate-work": [
        "docs/work/active.md",
        "docs/work/lanes/",
        "docs/work/examples/",
        "source inputs",
        "file ownership",
        "MCP",
        "Tool And MCP Context",
        "merge owner",
        "merge evidence",
        "parallel-safe",
    ],
    "closeout": [
        "Current diff",
        "validation evidence",
        "docs/work/active.md",
        "docs/work/lanes/",
        "docs/work/reports/",
        "docs/product/",
        "docs/design/",
        "docs/brand/",
        "docs/specs/",
        "docs/patterns/boundaries.md",
        "docs/glossary.md",
        "Doc Routing Decision Matrix",
        "templates/doc-routing-decision.md",
        "thin doc diff",
        "templates/thin-doc-diff.md",
        "no durable doc diff needed",
        "discover",
        "ingest-spec",
    ],
    "adapt-harness": [
        "AGENTS.md",
        "CODEX.md",
        "harness.config.yaml",
        "docs/glossary.md",
        "docs/patterns/boundaries.md",
        "docs/work/active.md",
        "Doc Routing Decision Matrix",
    ],
    "codex-maintenance": [
        "AGENTS.md",
        "CODEX.md",
        ".codex/config.toml",
        ".codex/skills/",
        ".codex/agents/",
        "docs/structure.md",
        "docs/patterns/",
        "docs/work/active.md",
        "docs/specs/",
        "docs/product/",
        "docs/design/",
        "docs/brand/",
        "docs/backlog/_index.md",
        "scripts/validate_cascade_codex.py",
        "rg --files",
        "git status",
        "reference inventory",
        "Doc Routing Decision Matrix",
        "MCP",
        "hooks",
        "plugins",
        "subagents",
        ".codex/skills/{skill}",
        "packaging target",
        "agents/openai.yaml",
        ".codex-plugin/plugin.json",
        ".agents/plugins/marketplace.json",
        "hooks.json",
        "rules/*.rules",
        "developer_instructions",
        "trusted project",
        "project_doc_max_bytes",
        "tool contracts",
        "permission",
        "memory",
        "compaction",
        "observability",
        "evals",
        "handoff",
        "scope",
        "validator",
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

PLACEHOLDER = re.compile(r"<[^>]+>")
PERSONA_ID = re.compile(r"\bP-\d{3}\b")
SCENARIO_ID = re.compile(r"\bPS-\d{3}\b")
JOURNEY_ID = re.compile(r"\bJ-\d{3}\b")
REQUIREMENT_ID = re.compile(r"\bPR-\d{3}\b")
BRAND_DOC_REF = re.compile(r"docs/brand/[A-Za-z0-9_.-]+\.md")


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
    docs_root = ROOT / "docs"
    if docs_root.is_dir():
        for path in docs_root.rglob("*"):
            if not path.is_dir():
                continue
            relative = rel(path)
            if relative not in ALLOWED_DOC_FOLDERS:
                errors.append(f"unexpected docs folder outside structure map: {relative}")


def check_toml(errors: list[str]) -> None:
    for path in ROOT.rglob("*.toml"):
        try:
            tomllib.loads(read_text(path))
        except tomllib.TOMLDecodeError as exc:
            errors.append(f"toml parse error in {rel(path)}: {exc}")


def check_harness_agent_registry(errors: list[str]) -> None:
    config_path = ROOT / ".codex" / "config.toml"
    if not config_path.is_file():
        return
    try:
        config = tomllib.loads(read_text(config_path))
    except tomllib.TOMLDecodeError:
        return
    registry = config.get("harness_agents")
    if not isinstance(registry, dict):
        errors.append(".codex/config.toml missing [harness_agents] registry")
        return
    harness = config.get("harness")
    if not isinstance(harness, dict):
        errors.append(".codex/config.toml missing [harness] settings")
    else:
        bridge = harness.get("bridge")
        if not isinstance(bridge, str) or not (ROOT / bridge).is_file():
            errors.append(".codex/config.toml harness.bridge does not point to a file")
        template = harness.get("config_template")
        if not isinstance(template, str) or not (ROOT / template).is_file():
            errors.append(".codex/config.toml harness.config_template does not point to a file")
    for key, agent in REQUIRED_HARNESS_AGENTS.items():
        if registry.get(key) != agent:
            errors.append(f"harness agent registry mismatch for {key}: expected {agent}")
    for agent in AGENTS:
        manifest_path = ROOT / ".codex" / "agents" / f"{agent}.toml"
        if not manifest_path.is_file():
            continue
        try:
            manifest = tomllib.loads(read_text(manifest_path))
        except tomllib.TOMLDecodeError:
            continue
        agent_section = manifest.get("agent")
        paths_section = manifest.get("paths")
        if not isinstance(agent_section, dict):
            errors.append(f"agent manifest missing [agent] table in {rel(manifest_path)}")
            agent_section = {}
        if not isinstance(paths_section, dict):
            errors.append(f"agent manifest missing [paths] table in {rel(manifest_path)}")
            paths_section = {}
        if agent_section.get("name") != agent:
            errors.append(f"agent manifest name mismatch in {rel(manifest_path)}")
        if not isinstance(agent_section.get("description"), str):
            errors.append(f"agent manifest description missing in {rel(manifest_path)}")
        instructions = paths_section.get("instructions")
        if not isinstance(instructions, str) or not (ROOT / instructions).is_file():
            errors.append(f"agent manifest instructions path invalid in {rel(manifest_path)}")
        skills = paths_section.get("skills")
        if not isinstance(skills, str) or not (ROOT / skills).is_file():
            errors.append(f"agent manifest skills path invalid in {rel(manifest_path)}")


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
    actual_skill_dirs = {
        path.name
        for path in (ROOT / ".codex" / "skills").iterdir()
        if path.is_dir()
    }
    expected_skills = set(SKILLS)
    for skill in sorted(actual_skill_dirs - expected_skills):
        errors.append(f"skill directory exists but is not registered in validator: {skill}")
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


def check_skill_surface_contracts(errors: list[str]) -> None:
    for skill, surfaces in REQUIRED_SKILL_SURFACES.items():
        path = ROOT / ".codex" / "skills" / skill / "SKILL.md"
        if not path.is_file():
            continue
        text = read_text(path)
        for surface in surfaces:
            if surface not in text:
                errors.append(f"skill surface contract for {skill} missing: {surface}")


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


def check_active_stale_skill_references(errors: list[str]) -> None:
    paths: list[Path] = []
    for root in ACTIVE_SKILL_REFERENCE_ROOTS:
        base = ROOT / root
        if base.is_dir():
            paths.extend(path for path in base.rglob("*") if path.is_file())
    for item in ACTIVE_SKILL_REFERENCE_FILES:
        path = ROOT / item
        if path.is_file():
            paths.append(path)
    for path in sorted(set(paths)):
        try:
            text = read_text(path)
        except UnicodeDecodeError:
            continue
        for skill in ACTIVE_STALE_SKILL_REFERENCES:
            if re.search(rf"(?<![A-Za-z0-9_-]){re.escape(skill)}(?![A-Za-z0-9_-])", text):
                errors.append(f"stale active skill reference {skill!r} in {rel(path)}")


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
        if path.name in SKIP_LEAKAGE_FILENAMES:
            continue
        if SKIP_LEAKAGE_PATH_PARTS.intersection(path.parts) or path.suffix == ".pyc":
            continue
        try:
            text = read_text(path)
        except UnicodeDecodeError:
            continue
        if path != ROOT / "scripts" / "validate_cascade_codex.py":
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


def _is_placeholder(value: str) -> bool:
    return bool(PLACEHOLDER.search(value))


def _collect_ids(path: Path, pattern: re.Pattern[str], label: str, errors: list[str]) -> set[str]:
    if not path.is_file():
        return set()
    seen: set[str] = set()
    duplicates: set[str] = set()
    for match in pattern.findall(read_text(path)):
        if _is_placeholder(match):
            continue
        if match in seen:
            duplicates.add(match)
        seen.add(match)
    for duplicate in sorted(duplicates):
        errors.append(f"duplicate {label} id {duplicate} in {rel(path)}")
    return seen


def _check_refs(
    path: Path,
    refs: set[str],
    known: set[str],
    label: str,
    errors: list[str],
) -> None:
    for item in sorted(refs):
        if _is_placeholder(item):
            continue
        if item not in known:
            errors.append(f"unknown {label} reference {item} in {rel(path)}")


def check_traceability_contracts(errors: list[str]) -> None:
    product_root = ROOT / "docs" / "product"
    persona_ids = _collect_ids(
        product_root / "personas" / "_index.md", PERSONA_ID, "persona", errors
    )
    scenario_ids = _collect_ids(
        product_root / "scenarios.md", SCENARIO_ID, "scenario", errors
    )
    journey_ids = _collect_ids(
        product_root / "journeys.md", JOURNEY_ID, "journey", errors
    )
    requirement_ids = _collect_ids(
        product_root / "requirements.md", REQUIREMENT_ID, "requirement", errors
    )

    for path in product_root.rglob("*.md"):
        if path.name == "_index.md":
            continue
        text = read_text(path)
        _check_refs(path, set(PERSONA_ID.findall(text)), persona_ids, "persona", errors)
        _check_refs(path, set(SCENARIO_ID.findall(text)), scenario_ids, "scenario", errors)
        _check_refs(path, set(JOURNEY_ID.findall(text)), journey_ids, "journey", errors)
        _check_refs(path, set(REQUIREMENT_ID.findall(text)), requirement_ids, "requirement", errors)
        for ref in sorted(set(BRAND_DOC_REF.findall(text))):
            if _is_placeholder(ref):
                continue
            if not (ROOT / ref).is_file():
                errors.append(f"missing brand doc reference {ref} in {rel(path)}")

    tokens_path = ROOT / "docs" / "design" / "tokens.md"
    if tokens_path.is_file():
        token_text = read_text(tokens_path)
        if "Status" not in token_text:
            errors.append("docs/design/tokens.md missing token status field")

    transformed_root = ROOT / "docs" / "specs" / "transformed"
    for path in transformed_root.glob("*.md"):
        text = read_text(path).strip()
        if not text:
            continue
        required_headings = [
            "## Source",
            "## Classification",
            "## Behavior Examples",
            "## Functional Acceptance Checks",
            "## Handoff",
        ]
        for heading in required_headings:
            if heading not in text:
                errors.append(f"transformed spec {rel(path)} missing heading: {heading}")


def main() -> int:
    errors: list[str] = []
    check_required_files(errors)
    check_required_folders(errors)
    check_toml(errors)
    check_harness_agent_registry(errors)
    check_skill_frontmatter(errors)
    check_skill_trigger_descriptions(errors)
    check_skill_surface_contracts(errors)
    check_agent_skill_sources(errors)
    check_active_stale_skill_references(errors)
    check_cascade_consistency(errors)
    check_thin_agents(errors)
    check_pattern_shape(errors)
    check_no_project_leakage(errors)
    check_traceability_contracts(errors)

    if errors:
        for error in errors:
            print(f"ERROR: {error}")
        print(f"cascade_codex_status=FAIL errors={len(errors)}")
        return 1

    print("cascade_codex_status=PASS")
    print(f"agents={len(AGENTS)}")
    print(f"skills={len(SKILLS)}")
    print("project_specific_leakage=0")
    print("standalone_qa_refs=0")
    return 0


if __name__ == "__main__":
    sys.exit(main())
