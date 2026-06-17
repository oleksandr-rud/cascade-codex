# Source Develop Extraction Implementation Report

Status: `implemented`
Date: 2026-06-17
Source seed: source `develop` branch at commit
`98e84c21b1c3fecd22ab4930922e562ab2ed7fb4`
Workflow source:
`docs/work/reports/2026-06-17-source-develop-product-docs-extraction-workflow.md`

## Objective

Adapt reusable source-branch harness patterns into the current project-neutral
Cascade harness without copying source-specific product facts, source-only
roles, stack-specific helpers, raw docs, or runtime scripts.

## Implemented Adaptations

| Pattern | Decision | Target Files | Result |
|---|---|---|---|
| Designer evidence lifecycle | `MERGE` | `.codex/agents/designer/AGENT.md`, `.codex/agents/designer/checklists/designer-workflows.md`, `.codex/skills/design-system/SKILL.md` | Figma, static mockups, screenshots, reusable component rules, token rules, and feature UX deltas now have explicit routing and safety checks. |
| Scenario-led acceptance | `MERGE` | `.codex/skills/functional-qa/SKILL.md`, `.codex/skills/functional-qa/templates/functional-test-plan.md`, `.codex/skills/functional-qa/checklists/functional-test-quality.md` | Functional acceptance now records per-scenario outcomes, validation mode, evidence target, and next owner. |
| Product/spec catalog preservation | `MERGE` | `.codex/skills/compose-spec/SKILL.md`, `.codex/skills/synthesis-to-spec/SKILL.md`, `docs/structure.md` | Product/spec synthesis now preserves an existing domain-owned catalog shape when a target repo defines it, while keeping the generic flat ledgers as the default. |
| Skill-package stage gates | `MERGE` | `.codex/skills/develop-skill/SKILL.md`, `.codex/skills/develop-skill/templates/skill-design-brief.md` | Complex, imported, broad, or ambiguous skill work now has intent, contract, challenge, artifact-map, and validation gates. |
| Security helper and evidence safety | `MERGE` | `.codex/agents/security/checklists/security-agent-workflows.md` | Security reviews now require read-only helper justification and sensitive-evidence exclusion in durable findings. |
| Architecture stale-path discipline | `MERGE` | `.codex/skills/architecture-review/SKILL.md`, `.codex/skills/architecture-review/checklists/deep-module-review.md` | Cross-boundary reviews now prefer direct migration, replacement, deletion, and validation before flags, shims, or dual paths for stale or duplicate paths. |

## Rejected Or Deferred Source Patterns

| Pattern | Decision | Reason |
|---|---|---|
| Source-only database skills | `REJECT` | Stack-specific and not part of the project-neutral harness contract. |
| Source role-local helper scripts | `DEFER` | Useful only when deterministic local output is needed and the target repo provides safe defaults. |
| Source-specific product docs, domains, personas, and scenarios | `REJECT` | Product facts must not be copied into this generic harness. |
| New scenario-testing agent | `NO_CHANGE` | Existing `functional-qa` and `validate-change` own acceptance evidence without adding another role. |
| New design component or mockup folders | `DEFER` | The current docs structure stays simple; rules now support those artifacts when a target repo defines them. |

## Routing Notes

- Feature-specific UX remains in product/spec owners.
- Reusable design rules route to `design-system`.
- Domain-owned product folders are supported only when already established by
  the target repo; the default generic harness remains flat and simple.
- Mockup, Figma, and screenshot artifacts are evidence, not implementation
  truth.
- Product-visible acceptance routes through `functional-qa` with per-scenario
  evidence.
- Skill imports route through `develop-skill` stage gates before any file
  expansion.
- Security reviews stay evidence-backed and review-first.
- Architecture reviews route stale or duplicate path cleanup toward direct
  migration and validation instead of defaulting to compatibility layers.

## Validation Evidence

Passed:

```bash
python3 -m py_compile scripts/validate_cascade_codex.py
git diff --check
python3 scripts/validate_cascade_codex.py
```

`python3 scripts/validate_cascade_codex.py` reported:

```text
cascade_codex_status=PASS
agents=6
skills=36
project_specific_leakage=0
standalone_qa_refs=0
```

Targeted leakage scans over changed harness files and this report returned no
forbidden source-specific memory, graph, stale folder, or legacy review alias
matches.
