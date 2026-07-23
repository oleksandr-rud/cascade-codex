#!/usr/bin/env python3
"""Validate Cascade wiring and project-agnostic content."""

from __future__ import annotations

import hashlib
import json
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
    "docs/specs/source/.gitkeep",
    "docs/work/_index.md",
    "docs/work/active.md",
    "docs/work/lane-template.md",
    "docs/work/graph-template.md",
    "docs/work/examples/_index.md",
    "docs/work/examples/coordination-graph.md",
    "docs/work/graphs/_index.md",
    "docs/work/lanes/.gitkeep",
    "docs/work/reports/_index.md",
    "docs/patterns/_index.md",
    "docs/patterns/context-pack-schema.yaml",
    "docs/patterns/workflow/index.md",
    "docs/patterns/workflow/workflow.pack.yaml",
    "docs/patterns/workflow/fragments/_index.md",
    "docs/patterns/workflow/fragments/graph-fragment.schema.json",
    "docs/patterns/boundaries/index.md",
    "docs/patterns/boundaries/boundaries.pack.yaml",
    "docs/patterns/testing/index.md",
    "docs/patterns/testing/testing.pack.yaml",
    "docs/patterns/context-memory/index.md",
    "docs/patterns/context-memory/context-memory.pack.yaml",
    "scripts/build_pattern_context_pack.py",
    "scripts/run_harness_evals.py",
    "evals/harness/README.md",
    "evals/harness/skill-cases.json",
    "evals/harness/interactions.json",
    "evals/harness/scenarios.generated.json",
    "evals/harness/response.schema.json",
    "evals/harness/judge-response.schema.json",
    "evals/harness/judge-profiles.json",
    "evals/harness/rubrics/outcome-v1.json",
    "evals/harness/rubrics/trajectory-v1.json",
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
    ".codex/skills/compose-spec/templates/spec-packet.md",
    ".codex/skills/brand-positioning/templates/brand-positioning.md",
    ".codex/skills/brand-positioning/templates/message-map.md",
    ".codex/skills/design-system/templates/design-rule.md",
    ".codex/skills/design-system/templates/component-rule.md",
    ".codex/skills/functional-qa/checklists/functional-test-quality.md",
    ".codex/skills/functional-qa/templates/functional-test-plan.md",
    ".codex/skills/test-autorepair/checklists/semantic-repair-checklist.md",
    ".codex/skills/test-autorepair/templates/repair-report.md",
    ".codex/skills/context/templates/snapshot.md",
    ".codex/skills/reconcile-work-graph/checklists/reconciliation.md",
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
    ".codex/skills/ingest-spec/templates/spec-packet.md",
    ".codex/skills/ingest-spec/templates/source-packet.md",
    ".codex/skills/ingest-spec/templates/scenario-row.md",
    ".codex/skills/codex-maintenance/checklists/harness-maintenance.md",
    ".codex/skills/codex-maintenance/checklists/codex-surface-quality.md",
    ".codex/skills/codex-maintenance/templates/reference-inventory.md",
    ".codex/skills/codex-maintenance/templates/codex-practice-audit.md",
    ".codex/skills/codex-maintenance/templates/maintenance-handoff.md",
    ".codex/skills/harness-evaluation/checklists/judged-eval-quality.md",
    ".codex/skills/harness-evaluation/references/trace-schema.md",
    ".codex/skills/harness-evaluation/templates/evaluation-report.md",
    ".codex/skills/judge-eval-builder/checklists/judge-quality.md",
    ".codex/skills/judge-eval-builder/references/judged-eval-contract.md",
    ".codex/skills/judge-eval-builder/templates/judge-design-brief.md",
    ".codex/agents/security/checklists/security-agent-workflows.md",
    ".codex/agents/security/scripts/security_stack_scan.py",
    ".codex/agents/designer/checklists/designer-workflows.md",
]

AGENTS = [
    "orchestrator",
    "project-onboarder",
    "agent-engineer",
    "business-analyst",
    "security",
    "designer",
    "harness-evaluator",
]

SKILLS = [
    "context",
    "agentic-workflow-builder",
    "orchestrate-work",
    "reconcile-work-graph",
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
    "pattern-context",
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
    "harness-evaluation",
    "judge-eval-builder",
]

FORBIDDEN_PATH_PATTERNS = [
    "docs/" + "tasks",
    "docs/" + "sessions",
    "docs/patterns/" + "process/",
    "docs/patterns/" + "architecture/",
    "docs/patterns/" + "api/",
    "docs/patterns/" + "codebase/",
    "docs/patterns/" + "integrations/",
    "docs/patterns/" + "agentic-runtime/",
    "docs/patterns/" + "context/",
    "docs/patterns/" + "memory/",
]

FORBIDDEN_REPOSITORY_PATHS = [
    "scripts/" + "compile_persona_context.py",
    "docs/specs/" + "persona-context-compiler",
    "docs/work/reports/"
    + "2026-06-20-ai-experiments-perceptron-neural-visual-research-workflow.md",
    "docs/work/reports/" + "2026-06-20-persona-simulator-behavioral-patterns.md",
    "docs/work/reports/" + "2026-06-20-persona-simulator-deep-search-workflow.md",
    "docs/work/reports/" + "2026-06-20-spec-slice-harness-audit.md",
    "docs/work/reports/" + "2026-06-20-spec-slice-migration-workflow.md",
]

REQUIRED_PATTERN_FILES = {
    "docs/patterns/workflow/index.md",
    "docs/patterns/boundaries/index.md",
    "docs/patterns/testing/index.md",
    "docs/patterns/context-memory/index.md",
}

REQUIRED_PATTERN_ENTRIES = {
    "workflow": "workflow.pack.yaml",
    "boundaries": "boundaries.pack.yaml",
    "testing": "testing.pack.yaml",
    "context-memory": "context-memory.pack.yaml",
}

REQUIRED_PATTERN_ENTRY_FILES = {
    "index.md",
}

ALLOWED_PATTERN_ROOT_FILES = {
    "_index.md",
    "context-pack-schema.yaml",
}

REQUIRED_FOLDERS = [
    "docs/specs/source",
    "docs/product",
    "docs/product/personas",
    "docs/design",
    "docs/brand",
    "docs/work",
    "docs/work/examples",
    "docs/work/graphs",
    "docs/work/lanes",
    "docs/work/reports",
    "docs/patterns/workflow/fragments",
]

ALLOWED_DOC_FOLDERS = {
    "docs",
    "docs/backlog",
    "docs/brand",
    "docs/design",
    "docs/patterns",
    "docs/patterns/workflow/fragments",
    "docs/product",
    "docs/product/personas",
    "docs/specs",
    "docs/specs/source",
    "docs/work",
    "docs/work/examples",
    "docs/work/graphs",
    "docs/work/lanes",
    "docs/work/reports",
}

CANONICAL_CASCADE_TOKENS = [
    "context",
    "ingest-spec",
    "discover",
    "docs-impact-map",
    "pattern-context",
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
    "reconcile-work-graph",
    "review-change",
    "functional-qa",
    "test-autorepair",
    "ingest-spec",
    "docs-impact-map",
    "pattern-context",
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
    "judged_evaluation": "harness-evaluator",
}

PLANNING_MODEL = "gpt-5.6-sol"
EXECUTION_MODEL = "gpt-5.6-terra"
EXPECTED_AGENT_MODELS = {
    "orchestrator": PLANNING_MODEL,
    "project-onboarder": EXECUTION_MODEL,
    "agent-engineer": PLANNING_MODEL,
    "business-analyst": PLANNING_MODEL,
    "security": PLANNING_MODEL,
    "designer": EXECUTION_MODEL,
    "harness-evaluator": PLANNING_MODEL,
}

SKIP_LEAKAGE_PATH_PARTS = {
    ".git",
    ".artifacts",
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
    r"docs/specs/transformed",
    r"docs/specs/incoming",
    r"templates/transformed-spec\.md",
    r"\btransformed-spec\b",
    r"\bspecs_transformed\b",
    r"\bspecs_incoming\b",
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
        r"requirements|journeys|scenarios|spec packets",
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
    "pattern-context": [
        r"pattern|context entr|context pack|pack\.yaml",
        r"create|update|retrieve|compile|planning|onboarding",
    ],
    "orchestrate-work": [
        r"split|schedule|track|connect",
        r"serialized|dependencies|conflicts",
    ],
    "reconcile-work-graph": [
        r"existing active lanes|existing.*worklines|Coordination Graphs",
        r"audit|deduplicat|reconcil|migrat|retir",
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
    "harness-evaluation": [
        r"Cascade|harness",
        r"scenario|trace|experiment|eligibility|evaluation",
        r"judge|regression|eval",
    ],
    "judge-eval-builder": [
        r"judge|semantic",
        r"profile|rubric|schema|calibrat|aggregation|adversarial",
        r"evaluation|eval",
    ],
}

REQUIRED_SKILL_SURFACES = {
    "ingest-spec": [
        "docs/specs/source/",
        "docs/specs/{slice-slug}/",
        "docs/product/",
        "docs/design/",
        "docs/brand/",
        "docs/work/active.md",
        "docs/work/lanes/",
        "docs/backlog/_index.md",
        "docs/glossary.md",
        "docs/patterns/boundaries/index.md",
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
        "docs/patterns/workflow/index.md",
        "docs/patterns/workflow/fragments/_index.md",
        "GF-*.fragment.json",
        "docs/patterns/boundaries/index.md",
        "docs/patterns/testing/index.md",
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
    "pattern-context": [
        "docs/patterns/_index.md",
        "docs/patterns/{entry}/",
        "index.md",
        "*.pack.yaml",
        "summary, routing, documents, and sections",
        "scripts/build_pattern_context_pack.py",
        "docs-impact-map",
        "adapt-harness",
        "validate-change",
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
        "docs/specs/{slice-slug}/",
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
        "docs/specs/{slice-slug}/",
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
        "templates/spec-packet.md",
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
        "docs/work/graphs/",
        "docs/work/graph-template.md",
        "docs/work/lanes/",
        "docs/work/examples/",
        "docs/patterns/workflow/fragments/",
        "SELECTED",
        "NOT_APPLICABLE",
        "actor capabilities",
        "test strategy",
        "source inputs",
        "file ownership",
        "MCP",
        "Tool And MCP Context",
        "coordination-state/materialization owner",
        "Materialization Queue",
        "Batch Evaluation Matrix",
        "immutable producer transport",
        "parallel-safe",
    ],
    "plan-change": [
        "docs/patterns/workflow/fragments/",
        "SELECTED",
        "MERGED",
        "NOT_APPLICABLE",
        "BLOCKED",
        "required ports",
        "actor capabilities",
        "test strategy",
        "terminal gate",
    ],
    "implement-change": [
        "fragment instance",
        "source fragment ID/version",
        "bound input and output ports",
        "selected test strategies",
    ],
    "functional-qa": [
        "selected graph-fragment test strategies",
        "test-resolution ledger",
        "omitted fragment contributes no test",
    ],
    "review-change": [
        "graph-fragment selection",
        "fragment composition coverage",
        "assurance overlay",
    ],
    "validate-change": [
        "graph-fragment selection ledger",
        "fragment evidence matrix",
        "Evidence from omitted fragments",
    ],
    "reconcile-work-graph": [
        "docs/work/graph-template.md",
        "docs/work/graphs/_index.md",
        "docs/work/graphs/CG-*.md",
        "docs/work/active.md",
        "docs/work/lanes/*.md",
        "docs/work/reports/",
        "KEEP",
        "UPDATE",
        "MERGE_INTO",
        "SUPERSEDE_BY",
        "RETIRE_ACTIVE_ROW",
        "BLOCKED_REVIEW",
        "closeout",
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
        "docs/patterns/boundaries/index.md",
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
        "docs/patterns/boundaries/index.md",
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
    "harness-evaluation": [
        "evals/harness/skill-cases.json",
        "evals/harness/interactions.json",
        "evals/harness/scenarios.generated.json",
        "evals/harness/response.schema.json",
        ".artifacts/harness-evals/<run-id>/",
        "docs/patterns/agent-evaluation/index.md",
        "scripts/run_harness_evals.py",
        "harness-evaluator",
        "eligibility",
        "read-only",
        "JSONL",
        "outcome",
        "trajectory",
        "regression",
    ],
    "judge-eval-builder": [
        "evals/harness/judge-profiles.json",
        "rubrics",
        "response schema",
        "0–4",
        "calibration",
        "false-pass",
        "false-fail",
        "harness",
        "NOT_RUN",
    ],
}

FORBIDDEN_STRINGS = [
    "".join(("Dynamic Persona", " Assistant")),
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
SPEC_SLICE_DIR = re.compile(r"^[a-z0-9][a-z0-9-]*$")
PACKAGE_LANE_ID = re.compile(r"^\s*-\s+id:\s*(L\d+)\b")
LANE_TOPOLOGY_ROW = re.compile(r"^\|\s*(L\d+)\b")
LEGACY_SPEC_SLICE_NAMES = {"transformed", "incoming"}

COORDINATION_GRAPH_FILENAME = re.compile(
    r"^(?P<id>CG-\d{3})-[a-z0-9][a-z0-9-]*\.md$"
)
COORDINATION_GRAPH_HEADING = re.compile(
    r"(?m)^# Coordination Graph: (?P<id>CG-\d{3})(?:\s+-\s+.+)?\s*$"
)
COORDINATION_GRAPH_INDEX_LINK = re.compile(
    r"\]\((?P<target>CG-\d{3}-[a-z0-9][a-z0-9-]*\.md)(?:#[^)]+)?\)"
)
COORDINATION_GRAPH_REQUIRED_HEADINGS = [
    "## Goal, Scope, And Non-Goals",
    "## Applicability Decision",
    "## Source And Definition References",
    "## Boundary Contracts",
    "## Authority And Direct Cutover",
    "## Canonical Workline Registry",
    "## Typed Coordination Edges",
    "## Coordination Gates And Evidence Joins",
    "## Dedicated Worktree Dispatch",
    "### Worker Receipts",
    "## Materialization Queue",
    "### Materialization Receipts",
    "## Batch Evaluation Matrix",
    "## Integrated Active-Worktree Validation",
    "## Reconciliation And Dispositions",
    "## Transition And Repair History",
    "## Amendment And Ownership-Handoff History",
    "## Current Frontier (Derived)",
    "## Terminal Gate",
    "## Validation And Retention",
]
COORDINATION_GRAPH_TEMPLATE_TOKENS = [
    "at least two canonical worklines",
    "If `NO_GRAPH`, stop here",
    "not a workline",
    "Do not copy this template into generated or source documents",
    "Coordination-State / Materialization Owner:",
    "Only the named Coordination-State / Materialization Owner",
    "read-only references/projections only",
    "Reject duplicate IDs, dangling subjects, undefined gates, and cycles",
    "Required Producer Transport / Presence Proof",
    "Local evidence remains",
    "provisional until the required materialization and integrated gates",
    "Target HEAD Before / After",
    "Block on unexplained overlap",
    "broadly stage, commit, push, or publish",
    "Shards / Expected Coverage",
    "Missing / Duplicate Policy",
    "Pre-materialization results cannot prove combined-state acceptance",
    "Reopened Worklines / Gates / Queue / Batches",
    "Preserved Accepted IDs",
    "Required Batch / Integrated Evidence",
]
COORDINATION_GRAPH_REFERENCE_ONLY_ROOTS = [
    "docs/product",
    "docs/specs",
    "docs/design",
    "docs/brand",
]

GRAPH_FRAGMENT_FILENAME = re.compile(
    r"^(?P<id>GF-\d{3})-[a-z0-9][a-z0-9-]*\.fragment\.json$"
)
REQUIRED_GRAPH_FRAGMENT_IDS = {
    "GF-001",
    "GF-002",
    "GF-003",
    "GF-004",
    "GF-005",
    "GF-006",
    "GF-007",
    "GF-008",
    "GF-009",
    "GF-101",
    "GF-102",
    "GF-103",
}
GRAPH_FRAGMENT_REQUIRED_FIELDS = {
    "fragment_id",
    "version",
    "title",
    "kind",
    "activation",
    "requires",
    "provides",
    "actor",
    "skill_calls",
    "nodes",
    "tests",
    "gates",
    "workline_policy",
    "omission_rule",
    "repair",
}
GRAPH_FRAGMENT_KINDS = {"delivery", "assurance-overlay"}
GRAPH_FRAGMENT_PORT_BINDINGS = {
    "selected-producer",
    "external-authority",
    "conditional",
}


def rel(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def _extract_package_lane_ids(text: str) -> set[str]:
    lanes: set[str] = set()
    in_lanes = False
    for line in text.splitlines():
        stripped = line.strip()
        if stripped == "lanes:":
            in_lanes = True
            continue
        if in_lanes and line and not line.startswith((" ", "\t", "-")):
            break
        if not in_lanes:
            continue
        match = PACKAGE_LANE_ID.match(line)
        if match:
            lanes.add(match.group(1))
    return lanes


def _extract_lane_topology_ids(text: str) -> set[str]:
    if "## Lane Topology" not in text:
        return set()
    lanes: set[str] = set()
    in_topology = False
    for line in text.splitlines():
        if line.startswith("## "):
            in_topology = line.strip() == "## Lane Topology"
            continue
        if not in_topology:
            continue
        match = LANE_TOPOLOGY_ROW.match(line)
        if match:
            lanes.add(match.group(1))
    return lanes


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
    for item in FORBIDDEN_REPOSITORY_PATHS:
        if (ROOT / item).exists():
            errors.append(f"non-harness project artifact remains: {item}")


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
            if not is_allowed_doc_folder(relative):
                errors.append(f"unexpected docs folder outside structure map: {relative}")


def is_allowed_doc_folder(relative: str) -> bool:
    if relative in ALLOWED_DOC_FOLDERS:
        return True
    parts = relative.split("/")
    if len(parts) == 3 and parts[:2] == ["docs", "patterns"]:
        entry_name = parts[2]
        return SPEC_SLICE_DIR.fullmatch(entry_name) is not None
    if len(parts) == 3 and parts[:2] == ["docs", "specs"]:
        slice_name = parts[2]
        return (
            slice_name not in LEGACY_SPEC_SLICE_NAMES
            and SPEC_SLICE_DIR.fullmatch(slice_name) is not None
        )
    return False


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
    if config.get("model") != PLANNING_MODEL:
        errors.append(
            f".codex/config.toml default model must be pinned to {PLANNING_MODEL}"
        )
    eval_config = config.get("harness_evals")
    if not isinstance(eval_config, dict):
        errors.append(".codex/config.toml missing [harness_evals] settings")
    else:
        expected_eval_models = {
            "planning_model": PLANNING_MODEL,
            "judge_model": PLANNING_MODEL,
            "execution_model": EXECUTION_MODEL,
        }
        for key, model in expected_eval_models.items():
            if eval_config.get(key) != model:
                errors.append(
                    f"harness eval model mismatch for {key}: expected {model}"
                )
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
        if manifest.get("name") != agent:
            errors.append(f"agent manifest name mismatch in {rel(manifest_path)}")
        if not isinstance(manifest.get("description"), str):
            errors.append(f"agent manifest description missing in {rel(manifest_path)}")
        if not isinstance(manifest.get("developer_instructions"), str):
            errors.append(
                f"agent manifest developer_instructions missing in {rel(manifest_path)}"
            )
        expected_model = EXPECTED_AGENT_MODELS[agent]
        if manifest.get("model") != expected_model:
            errors.append(
                f"agent model mismatch in {rel(manifest_path)}: "
                f"expected {expected_model}"
            )
        for legacy_table in ["agent", "paths", "delegation", "scope"]:
            if legacy_table in manifest:
                errors.append(
                    f"agent manifest uses unsupported legacy table {legacy_table!r} "
                    f"in {rel(manifest_path)}"
                )
        instructions_path = ROOT / ".codex" / "agents" / agent / "AGENT.md"
        skills_path = ROOT / ".codex" / "agents" / agent / "skills.yaml"
        if not instructions_path.is_file():
            errors.append(f"agent role contract missing: {rel(instructions_path)}")
        if not skills_path.is_file():
            errors.append(f"agent skill map missing: {rel(skills_path)}")


def check_retired_model_refs(errors: list[str]) -> None:
    retired = "gpt-" + "5.5"
    skipped_parts = {".git", ".artifacts", "__pycache__"}
    for path in ROOT.rglob("*"):
        if not path.is_file() or skipped_parts.intersection(path.parts):
            continue
        try:
            text = read_text(path)
        except (UnicodeDecodeError, OSError):
            continue
        if retired in text.lower():
            errors.append(f"retired model reference remains in {rel(path)}")


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
    patterns_root = ROOT / "docs" / "patterns"
    if not patterns_root.is_dir():
        errors.append("missing docs/patterns folder")
        return

    for path in patterns_root.iterdir():
        if path.is_file() and path.name not in ALLOWED_PATTERN_ROOT_FILES:
            errors.append(f"unexpected root pattern file: {rel(path)}")
        if path.is_dir() and SPEC_SLICE_DIR.fullmatch(path.name) is None:
            errors.append(f"invalid pattern entry folder name: {rel(path)}")

    for entry, required_pack in REQUIRED_PATTERN_ENTRIES.items():
        entry_dir = patterns_root / entry
        if not entry_dir.is_dir():
            errors.append(f"missing required pattern entry folder: {rel(entry_dir)}")
            continue
        for filename in REQUIRED_PATTERN_ENTRY_FILES:
            required_path = entry_dir / filename
            if not required_path.is_file():
                errors.append(f"missing required pattern entry file: {rel(required_path)}")
        if not (entry_dir / required_pack).is_file():
            errors.append(f"missing required pattern pack: {rel(entry_dir / required_pack)}")

    for entry_dir in sorted(path for path in patterns_root.iterdir() if path.is_dir()):
        for nested in entry_dir.iterdir():
            if nested.is_dir():
                if not (
                    entry_dir.name == "workflow" and nested.name == "fragments"
                ):
                    errors.append(
                        f"nested pattern folders are not allowed: {rel(nested)}"
                    )
                continue
            if nested.name in {
                "summary.yaml",
                "routing.yaml",
                "refs.yaml",
                "documents.yaml",
                "parts.yaml",
                "sections.yaml",
            }:
                errors.append(
                    f"pattern sidecar metadata is not allowed; keep it inside pack YAML: {rel(nested)}"
                )
        for filename in REQUIRED_PATTERN_ENTRY_FILES:
            required_path = entry_dir / filename
            if not required_path.is_file():
                errors.append(f"pattern entry missing required file: {rel(required_path)}")
        pack_paths = sorted(entry_dir.glob("*.pack.yaml"))
        if not pack_paths:
            errors.append(f"pattern entry missing *.pack.yaml: {rel(entry_dir)}")
        for pack_path in pack_paths:
            pack_text = read_text(pack_path)
            for key in [
                "pack_id:",
                "entry_id:",
                "title:",
                "kind:",
                "owner:",
                "summary:",
                "routing:",
                "documents:",
            ]:
                if not re.search(rf"(?m)^{re.escape(key)}", pack_text):
                    errors.append(f"pattern pack {rel(pack_path)} missing key {key}")
            if not re.search(r"(?m)^kind:\s+pattern-context-pack\s*$", pack_text):
                errors.append(
                    f"pattern pack {rel(pack_path)} must set kind: pattern-context-pack"
                )
            for legacy_key in ["status", "refs", "parts"]:
                if re.search(rf"(?m)^{legacy_key}:", pack_text):
                    errors.append(
                        f"pattern pack {rel(pack_path)} uses legacy top-level {legacy_key}:"
                    )
            for key in [
                "path:",
                "description:",
                "trigger_when:",
                "sections:",
                "id:",
                "anchor:",
                "routing_description:",
                "tags:",
            ]:
                if key not in pack_text:
                    errors.append(f"pattern pack {rel(pack_path)} missing document/section key {key}")
            for source in re.findall(r"(?m)^\s+source:\s+([^\n]+)$", pack_text):
                errors.append(
                    f"pattern pack {rel(pack_path)} uses legacy section source: {source}"
                )
            for source in re.findall(r"(?m)^\s+path:\s+([^\n]+)$", pack_text):
                source_path = ROOT / source.strip().strip('"').strip("'")
                if not source_path.is_file():
                    errors.append(
                        f"pattern pack {rel(pack_path)} references missing path: {source}"
                    )


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


def check_graph_fragment_contracts(errors: list[str]) -> None:
    """Validate reusable planning fragments without treating them as runtime state."""
    fragment_root = ROOT / "docs" / "patterns" / "workflow" / "fragments"
    schema_path = fragment_root / "graph-fragment.schema.json"
    index_path = fragment_root / "_index.md"

    if schema_path.is_file():
        try:
            schema = json.loads(read_text(schema_path))
        except json.JSONDecodeError as exc:
            errors.append(f"graph fragment schema JSON parse error: {exc}")
        else:
            required = schema.get("required")
            if not isinstance(required, list) or not GRAPH_FRAGMENT_REQUIRED_FIELDS.issubset(
                set(required)
            ):
                errors.append("graph fragment schema does not require the canonical fields")

    if index_path.is_file():
        index_text = read_text(index_path)
        for token in [
            "SELECTED",
            "MERGED",
            "NOT_APPLICABLE",
            "BLOCKED",
            "Bind every selected `requires` port",
            "Resolve actor capabilities",
            "Resolve test strategies",
            "Synthesize one terminal evidence join",
        ]:
            if token not in index_text:
                errors.append(f"graph fragment index missing composition contract: {token}")

    fragment_paths = sorted(fragment_root.glob("GF-*.fragment.json"))
    fragments: dict[str, dict[str, object]] = {}
    fragment_sources: dict[str, Path] = {}
    provided_ports: set[str] = set()
    known_skills = set(SKILLS)
    known_roles = set(AGENTS)

    for path in fragment_paths:
        filename_match = GRAPH_FRAGMENT_FILENAME.fullmatch(path.name)
        if filename_match is None:
            errors.append(f"invalid graph fragment filename: {rel(path)}")
            continue
        try:
            data = json.loads(read_text(path))
        except json.JSONDecodeError as exc:
            errors.append(f"graph fragment JSON parse error in {rel(path)}: {exc}")
            continue
        if not isinstance(data, dict):
            errors.append(f"graph fragment must be an object: {rel(path)}")
            continue

        missing = GRAPH_FRAGMENT_REQUIRED_FIELDS - set(data)
        if missing:
            errors.append(
                f"graph fragment {rel(path)} missing fields: {', '.join(sorted(missing))}"
            )

        fragment_id = data.get("fragment_id")
        if not isinstance(fragment_id, str):
            errors.append(f"graph fragment missing string fragment_id: {rel(path)}")
            continue
        if filename_match.group("id") != fragment_id:
            errors.append(
                f"graph fragment filename/id mismatch in {rel(path)}: "
                f"{filename_match.group('id')} != {fragment_id}"
            )
        if fragment_id in fragments:
            errors.append(
                f"duplicate graph fragment id {fragment_id}: "
                f"{rel(fragment_sources[fragment_id])} and {rel(path)}"
            )
            continue
        fragments[fragment_id] = data
        fragment_sources[fragment_id] = path

        if not isinstance(data.get("version"), int) or data.get("version", 0) < 1:
            errors.append(f"graph fragment has invalid version: {rel(path)}")
        kind = data.get("kind")
        if kind not in GRAPH_FRAGMENT_KINDS:
            errors.append(f"graph fragment has invalid kind in {rel(path)}: {kind}")

        activation = data.get("activation")
        if not isinstance(activation, dict) or not isinstance(activation.get("any"), list) or not activation.get("any"):
            errors.append(f"graph fragment has no activation.any signals: {rel(path)}")

        for field in ["requires", "provides"]:
            ports = data.get(field)
            if not isinstance(ports, list):
                errors.append(f"graph fragment {field} must be a list: {rel(path)}")
                continue
            if field == "provides" and not ports:
                errors.append(f"graph fragment must provide at least one port: {rel(path)}")
            for port in ports:
                if not isinstance(port, dict):
                    errors.append(f"graph fragment {field} port must be an object: {rel(path)}")
                    continue
                port_name = port.get("port")
                binding = port.get("binding")
                if not isinstance(port_name, str) or not re.fullmatch(
                    r"[a-z][a-z0-9.-]+", port_name
                ):
                    errors.append(f"graph fragment has invalid port in {rel(path)}: {port_name}")
                elif field == "provides":
                    provided_ports.add(port_name)
                if binding not in GRAPH_FRAGMENT_PORT_BINDINGS:
                    errors.append(
                        f"graph fragment has invalid port binding in {rel(path)}: {binding}"
                    )
                if binding == "conditional" and not port.get("when"):
                    errors.append(
                        f"conditional graph fragment port missing when in {rel(path)}"
                    )

        actor = data.get("actor")
        if not isinstance(actor, dict):
            errors.append(f"graph fragment actor must be an object: {rel(path)}")
        else:
            capabilities = actor.get("capabilities")
            roles = actor.get("preferred_existing_roles")
            if not isinstance(capabilities, list) or not capabilities:
                errors.append(f"graph fragment actor capabilities missing: {rel(path)}")
            if not isinstance(roles, list):
                errors.append(f"graph fragment preferred roles must be a list: {rel(path)}")
            else:
                for role in roles:
                    if role not in known_roles:
                        errors.append(
                            f"graph fragment references unknown preferred role {role}: {rel(path)}"
                        )

        skill_calls = data.get("skill_calls")
        if not isinstance(skill_calls, list):
            errors.append(f"graph fragment skill_calls must be a list: {rel(path)}")
        else:
            for call in skill_calls:
                if not isinstance(call, dict):
                    errors.append(f"graph fragment skill call must be an object: {rel(path)}")
                    continue
                skill = call.get("skill")
                if skill not in known_skills:
                    errors.append(
                        f"graph fragment references unknown skill {skill}: {rel(path)}"
                    )
                if not isinstance(call.get("required"), bool) or not call.get("when"):
                    errors.append(f"graph fragment skill call is incomplete: {rel(path)}")

        local_ids: set[str] = set()
        for field in ["nodes", "gates"]:
            records = data.get(field)
            if not isinstance(records, list) or not records:
                errors.append(f"graph fragment {field} must be a non-empty list: {rel(path)}")
                continue
            for record in records:
                if not isinstance(record, dict) or not isinstance(record.get("local_id"), str):
                    errors.append(f"graph fragment {field} record missing local_id: {rel(path)}")
                    continue
                local_id = record["local_id"]
                if local_id in local_ids:
                    errors.append(f"duplicate graph fragment local_id {local_id}: {rel(path)}")
                local_ids.add(local_id)

        tests = data.get("tests")
        if not isinstance(tests, list):
            errors.append(f"graph fragment tests must be a list: {rel(path)}")
        else:
            for test in tests:
                if not isinstance(test, dict) or not all(
                    test.get(key)
                    for key in ["strategy", "requirement", "when", "evidence", "command_source"]
                ):
                    errors.append(f"graph fragment test strategy is incomplete: {rel(path)}")
                    continue
                if test.get("requirement") not in {"required", "conditional"}:
                    errors.append(f"graph fragment test requirement is invalid: {rel(path)}")

        if kind == "assurance-overlay":
            attach_to = data.get("attach_to")
            if not isinstance(attach_to, list) or not attach_to:
                errors.append(f"assurance overlay missing attach_to: {rel(path)}")

    missing_ids = REQUIRED_GRAPH_FRAGMENT_IDS - set(fragments)
    unexpected_ids = set(fragments) - REQUIRED_GRAPH_FRAGMENT_IDS
    if missing_ids:
        errors.append(
            "missing required graph fragments: " + ", ".join(sorted(missing_ids))
        )
    if unexpected_ids:
        errors.append(
            "graph fragments exist but are not registered: "
            + ", ".join(sorted(unexpected_ids))
        )

    for fragment_id, data in fragments.items():
        path = fragment_sources[fragment_id]
        if data.get("kind") == "assurance-overlay":
            for target in data.get("attach_to", []):
                target_data = fragments.get(target)
                if target_data is None:
                    errors.append(
                        f"graph fragment overlay {fragment_id} references missing target {target}"
                    )
                elif target_data.get("kind") != "delivery":
                    errors.append(
                        f"graph fragment overlay {fragment_id} target is not delivery: {target}"
                    )
        for requirement in data.get("requires", []):
            if not isinstance(requirement, dict):
                continue
            port_name = requirement.get("port")
            binding = requirement.get("binding")
            if (
                binding == "selected-producer"
                and isinstance(port_name, str)
                and port_name not in provided_ports
            ):
                errors.append(
                    f"graph fragment {fragment_id} requires unknown selected-producer port "
                    f"{port_name}: {rel(path)}"
                )


def check_coordination_graph_contracts(errors: list[str]) -> None:
    """Check the first-class graph document boundary without parsing graph state."""
    graph_root = ROOT / "docs" / "work" / "graphs"
    template_path = ROOT / "docs" / "work" / "graph-template.md"
    index_path = graph_root / "_index.md"

    if template_path.is_file():
        template_text = read_text(template_path)
        for heading in COORDINATION_GRAPH_REQUIRED_HEADINGS:
            if heading not in template_text:
                errors.append(
                    f"coordination graph template missing heading: {heading}"
                )
        for token in COORDINATION_GRAPH_TEMPLATE_TOKENS:
            if token not in template_text:
                errors.append(
                    f"coordination graph template missing contract: {token}"
                )

    graph_paths = (
        sorted(path for path in graph_root.glob("*.md") if path.name != "_index.md")
        if graph_root.is_dir()
        else []
    )
    graph_ids: dict[str, Path] = {}
    graph_names = {path.name for path in graph_paths}

    index_targets: set[str] = set()
    if index_path.is_file():
        index_text = read_text(index_path)
        index_targets = {
            match.group("target")
            for match in COORDINATION_GRAPH_INDEX_LINK.finditer(index_text)
        }
        for target in sorted(index_targets - graph_names):
            errors.append(
                f"coordination graph index references missing entry: {target}"
            )

    for path in graph_paths:
        filename_match = COORDINATION_GRAPH_FILENAME.fullmatch(path.name)
        if filename_match is None:
            errors.append(f"invalid coordination graph filename: {rel(path)}")
            continue

        text = read_text(path)
        heading_match = COORDINATION_GRAPH_HEADING.search(text)
        if heading_match is None:
            errors.append(f"coordination graph missing canonical heading: {rel(path)}")
            continue

        filename_id = filename_match.group("id")
        heading_id = heading_match.group("id")
        if filename_id != heading_id:
            errors.append(
                f"coordination graph filename/heading id mismatch in {rel(path)}: "
                f"{filename_id} != {heading_id}"
            )
        prior = graph_ids.get(heading_id)
        if prior is not None:
            errors.append(
                f"duplicate coordination graph id {heading_id}: "
                f"{rel(prior)} and {rel(path)}"
            )
        else:
            graph_ids[heading_id] = path

        if path.name not in index_targets:
            errors.append(f"coordination graph entry missing from index: {rel(path)}")
        if PLACEHOLDER.search(text):
            errors.append(f"coordination graph contains unresolved placeholder: {rel(path)}")
        if "`CREATE_GRAPH`" not in text:
            errors.append(f"coordination graph missing CREATE_GRAPH decision: {rel(path)}")
        workline_ids = set(re.findall(r"\bWL-\d{2,3}\b", text))
        if len(workline_ids) < 2:
            errors.append(
                f"coordination graph must reference at least two worklines: {rel(path)}"
            )
        for metadata in [
            "Status:",
            "Planning Status:",
            "Plan Revision:",
            "Coordination Graph Revision:",
            "Coordination-State / Materialization Owner:",
            "Execution Mode:",
            "Terminal Gate:",
            "Next Gate:",
        ]:
            if not re.search(rf"(?m)^{re.escape(metadata)}\s+", text):
                errors.append(
                    f"coordination graph {rel(path)} missing metadata: {metadata}"
                )
        for heading in COORDINATION_GRAPH_REQUIRED_HEADINGS:
            if heading not in text:
                errors.append(
                    f"coordination graph {rel(path)} missing heading: {heading}"
                )

    docs_root = ROOT / "docs"
    if docs_root.is_dir():
        for path in docs_root.rglob("CG-*.md"):
            if path.parent != graph_root:
                errors.append(
                    f"coordination graph entry outside docs/work/graphs: {rel(path)}"
                )

    for root_name in COORDINATION_GRAPH_REFERENCE_ONLY_ROOTS:
        root = ROOT / root_name
        if not root.is_dir():
            continue
        for path in root.rglob("*.md"):
            text = read_text(path)
            has_graph_heading = COORDINATION_GRAPH_HEADING.search(text) is not None
            has_graph_authority = (
                re.search(r"(?m)^Coordination Graph Revision:\s+", text) is not None
                and re.search(
                    r"(?m)^Coordination-State / Materialization Owner:\s+", text
                )
                is not None
            )
            if has_graph_heading or has_graph_authority:
                errors.append(
                    "product/spec/design/brand docs may reference but not own a "
                    f"Coordination Graph: {rel(path)}"
                )


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

    specs_root = ROOT / "docs" / "specs"
    if specs_root.is_dir():
        for slice_dir in specs_root.iterdir():
            if not slice_dir.is_dir() or slice_dir.name == "source":
                continue
            if slice_dir.name in LEGACY_SPEC_SLICE_NAMES:
                errors.append(f"legacy spec slice folder is not allowed: {rel(slice_dir)}")
                continue
            if SPEC_SLICE_DIR.fullmatch(slice_dir.name) is None:
                errors.append(f"invalid spec slice folder name: {rel(slice_dir)}")
                continue
            for path in slice_dir.glob("*.md"):
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
                        errors.append(f"spec packet {rel(path)} missing heading: {heading}")
            package_lanes: dict[Path, set[str]] = {}
            for path in slice_dir.glob("*.package.yaml"):
                lane_ids = _extract_package_lane_ids(read_text(path))
                if lane_ids:
                    package_lanes[path] = lane_ids
            if package_lanes:
                topology_lanes: dict[Path, set[str]] = {}
                for path in slice_dir.glob("*.md"):
                    lane_ids = _extract_lane_topology_ids(read_text(path))
                    if lane_ids:
                        topology_lanes[path] = lane_ids
                topology_union = set().union(*topology_lanes.values()) if topology_lanes else set()
                for package_path, lane_ids in package_lanes.items():
                    if not topology_lanes:
                        errors.append(
                            f"package {rel(package_path)} declares lanes but no Lane Topology spec table exists"
                        )
                        continue
                    missing_in_specs = lane_ids - topology_union
                    extra_in_specs = topology_union - lane_ids
                    for lane_id in sorted(missing_in_specs):
                        errors.append(
                            f"package {rel(package_path)} lane {lane_id} missing from Lane Topology spec table"
                        )
                    for lane_id in sorted(extra_in_specs):
                        errors.append(
                            f"Lane Topology lane {lane_id} missing from package {rel(package_path)}"
                        )


def check_harness_eval_contracts(errors: list[str]) -> None:
    cases_path = ROOT / "evals" / "harness" / "skill-cases.json"
    interactions_path = ROOT / "evals" / "harness" / "interactions.json"
    catalog_path = ROOT / "evals" / "harness" / "scenarios.generated.json"
    schema_path = ROOT / "evals" / "harness" / "response.schema.json"
    judge_schema_path = ROOT / "evals" / "harness" / "judge-response.schema.json"
    judge_profiles_path = ROOT / "evals" / "harness" / "judge-profiles.json"
    rubric_paths = [
        ROOT / "evals" / "harness" / "rubrics" / "outcome-v1.json",
        ROOT / "evals" / "harness" / "rubrics" / "trajectory-v1.json",
    ]
    if not all(
        path.is_file()
        for path in [
            cases_path,
            interactions_path,
            catalog_path,
            schema_path,
            judge_schema_path,
            judge_profiles_path,
            *rubric_paths,
        ]
    ):
        return

    try:
        cases_data = json.loads(read_text(cases_path))
        interactions_data = json.loads(read_text(interactions_path))
        catalog_data = json.loads(read_text(catalog_path))
        schema_data = json.loads(read_text(schema_path))
        judge_schema_data = json.loads(read_text(judge_schema_path))
        judge_profiles_data = json.loads(read_text(judge_profiles_path))
        rubric_data = [json.loads(read_text(path)) for path in rubric_paths]
    except json.JSONDecodeError as exc:
        errors.append(f"harness eval JSON parse error: {exc}")
        return

    case_rows = cases_data.get("skills")
    interaction_rows = interactions_data.get("interactions")
    scenarios = catalog_data.get("scenarios")
    if not isinstance(case_rows, list):
        errors.append("evals/harness/skill-cases.json missing skills list")
        return
    if not isinstance(interaction_rows, list):
        errors.append("evals/harness/interactions.json missing interactions list")
        return
    if not isinstance(scenarios, list):
        errors.append("evals/harness/scenarios.generated.json missing scenarios list")
        return

    source_skills = [row.get("skill") for row in case_rows if isinstance(row, dict)]
    if len(source_skills) != len(set(source_skills)):
        errors.append("harness eval skill case registry contains duplicate skills")
    missing_skills = set(SKILLS) - set(source_skills)
    extra_skills = set(source_skills) - set(SKILLS)
    for skill in sorted(missing_skills):
        errors.append(f"registered skill missing harness eval source cases: {skill}")
    for skill in sorted(extra_skills):
        errors.append(f"harness eval source case references unknown skill: {skill}")

    expected_kinds = {
        "implicit-trigger",
        "explicit-trigger",
        "near-miss",
        "missing-precondition",
        "guardrail",
        "output-contract",
        "handoff",
    }
    scenario_ids: list[str] = []
    per_skill_kinds: dict[str, set[str]] = {skill: set() for skill in SKILLS}
    for row in scenarios:
        if not isinstance(row, dict):
            errors.append("harness eval catalog contains a non-object scenario")
            continue
        scenario_id = row.get("id")
        if not isinstance(scenario_id, str):
            errors.append("harness eval catalog scenario missing string id")
            continue
        scenario_ids.append(scenario_id)
        target = row.get("target_skill")
        kind = row.get("kind")
        if target in per_skill_kinds and kind in expected_kinds:
            per_skill_kinds[target].add(kind)
        expectation = row.get("expectation")
        if not isinstance(expectation, dict):
            errors.append(f"harness eval scenario {scenario_id} missing expectation")
            continue
        primary = expectation.get("primary_skill")
        if primary not in SKILLS:
            errors.append(
                f"harness eval scenario {scenario_id} expects unknown skill: {primary}"
            )
    if len(scenario_ids) != len(set(scenario_ids)):
        errors.append("harness eval catalog contains duplicate scenario ids")
    for skill, kinds in sorted(per_skill_kinds.items()):
        missing_kinds = expected_kinds - kinds
        if missing_kinds:
            errors.append(
                f"harness eval catalog missing case kinds for {skill}: "
                f"{', '.join(sorted(missing_kinds))}"
            )

    expected_count = len(SKILLS) * len(expected_kinds) + len(interaction_rows)
    if catalog_data.get("skill_count") != len(SKILLS):
        errors.append("harness eval catalog skill_count is stale")
    if catalog_data.get("scenario_count") != expected_count or len(scenarios) != expected_count:
        errors.append(
            f"harness eval catalog scenario count mismatch: expected {expected_count}"
        )
    digest = hashlib.sha256(
        json.dumps(scenarios, sort_keys=True, separators=(",", ":")).encode()
    ).hexdigest()
    if catalog_data.get("catalog_digest") != digest:
        errors.append("harness eval catalog digest is stale or invalid")

    required_response = {
        "scenario_id",
        "primary_skill",
        "supporting_skills",
        "rejected_skills",
        "status",
        "decision",
        "evidence",
        "actions",
        "missing_context",
        "next_route",
    }
    if set(schema_data.get("required", [])) != required_response:
        errors.append("harness eval response schema required fields are stale")
    required_judgment = {
        "run_id",
        "scenario_id",
        "judge_profile_id",
        "judge_type",
        "rubric_id",
        "rubric_version",
        "verdict",
        "root_cause",
        "earliest_failing_event",
        "dimensions",
        "confidence",
        "summary",
        "evidence",
        "replay_command",
        "regression_recommendation",
        "residual_uncertainty",
    }
    if set(judge_schema_data.get("required", [])) != required_judgment:
        errors.append("harness eval judge schema required fields are stale")
    expected_root_causes = {
        "none",
        "harness-defect",
        "target-behavior",
        "model-variance",
        "scenario-defect",
        "environment-blocker",
    }
    root_cause_enum = (
        judge_schema_data.get("properties", {})
        .get("root_cause", {})
        .get("enum", [])
    )
    if set(root_cause_enum) != expected_root_causes:
        errors.append("harness eval judge root-cause taxonomy is stale")

    profiles = judge_profiles_data.get("profiles")
    if not isinstance(profiles, list):
        errors.append("harness eval judge profile registry missing profiles list")
        return
    expected_profiles = {"outcome-v1", "trajectory-v1"}
    profile_ids = {
        profile.get("id") for profile in profiles if isinstance(profile, dict)
    }
    if profile_ids != expected_profiles:
        errors.append("harness eval required judge profiles are stale")
    for profile in profiles:
        if not isinstance(profile, dict):
            errors.append("harness eval judge profile must be an object")
            continue
        if profile.get("required_for_acceptance") is not True:
            errors.append(
                f"harness eval judge profile {profile.get('id')} must be required"
            )
        rubric_path = ROOT / str(profile.get("rubric", ""))
        if not rubric_path.is_file():
            errors.append(
                f"harness eval judge profile {profile.get('id')} has missing rubric"
            )

    rubric_ids: set[str] = set()
    for rubric in rubric_data:
        rubric_id = rubric.get("rubric_id")
        rubric_ids.add(str(rubric_id))
        dimensions = rubric.get("dimensions")
        if not isinstance(dimensions, list) or not dimensions:
            errors.append(f"harness eval rubric {rubric_id} has no dimensions")
            continue
        dimension_ids = [
            dimension.get("id")
            for dimension in dimensions
            if isinstance(dimension, dict)
        ]
        if len(dimension_ids) != len(dimensions) or len(dimension_ids) != len(
            set(dimension_ids)
        ):
            errors.append(f"harness eval rubric {rubric_id} has invalid dimension ids")
        weights = [
            dimension.get("weight")
            for dimension in dimensions
            if isinstance(dimension, dict)
        ]
        if not all(isinstance(weight, int) and weight > 0 for weight in weights):
            errors.append(f"harness eval rubric {rubric_id} has invalid weights")
        elif sum(weights) != 100:
            errors.append(f"harness eval rubric {rubric_id} weights must total 100")
        anchors = rubric.get("score_anchors")
        if not isinstance(anchors, dict) or set(anchors) != {"0", "1", "2", "3", "4"}:
            errors.append(f"harness eval rubric {rubric_id} anchors are stale")
        if not isinstance(rubric.get("pass_threshold"), int):
            errors.append(f"harness eval rubric {rubric_id} threshold is invalid")
        floor = rubric.get("minimum_dimension_score")
        if not isinstance(floor, int) or not 0 <= floor <= 4:
            errors.append(f"harness eval rubric {rubric_id} floor is invalid")
    if rubric_ids != expected_profiles:
        errors.append("harness eval rubric ids do not match required judge profiles")


def main() -> int:
    errors: list[str] = []
    check_required_files(errors)
    check_required_folders(errors)
    check_toml(errors)
    check_harness_agent_registry(errors)
    check_retired_model_refs(errors)
    check_skill_frontmatter(errors)
    check_skill_trigger_descriptions(errors)
    check_skill_surface_contracts(errors)
    check_agent_skill_sources(errors)
    check_active_stale_skill_references(errors)
    check_cascade_consistency(errors)
    check_thin_agents(errors)
    check_pattern_shape(errors)
    check_no_project_leakage(errors)
    check_graph_fragment_contracts(errors)
    check_coordination_graph_contracts(errors)
    check_traceability_contracts(errors)
    check_harness_eval_contracts(errors)

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
