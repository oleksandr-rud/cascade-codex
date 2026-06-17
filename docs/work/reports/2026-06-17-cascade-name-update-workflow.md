# Agentic Workflow Packet: Cascade Name Update

Status: done
Created: 2026-06-17
Workflow: WF-cascade-name-update
Workflow model: sequential-pipeline

## Objective

Update the harness identity to:

```text
Cascade
An agentic workflow learning harness
```

Apply the name consistently across user-facing harness components and README
while preserving real Codex runtime terms (`CODEX.md`, `.codex/`, Codex surface,
Codex skill, Codex agent, and Codex config) where they describe the platform or
file layout rather than the product brand.

## Current Inventory Summary

Reference inventory gathered on 2026-06-17:

- `git status --short` shows existing local modifications in `.codex/README.md`,
  `.codex/agents/agent-engineer.toml`,
  `.codex/agents/agent-engineer/AGENT.md`,
  `.codex/agents/agent-engineer/skills.yaml`,
  `.codex/skills/source-branch-extraction/SKILL.md`, `CODEX.md`,
  two `docs/work/reports/2026-06-17-*` reports, and
  `scripts/validate_cascade_codex.py`, plus untracked skill template/checklist
  additions. Preserve and work with those changes.
- Current visible brand text appears in `README.md`, `CODEX.md`, `AGENTS.md`,
  `.codex/README.md`, `.codex/config.toml`, `harness.config.example.yaml`,
  `docs/_index.md`, `docs/structure.md`, work examples, current work reports,
  agent-engineer files, selected skill descriptions, and
  `scripts/validate_cascade_codex.py`.
- Current validator filename and command references are
  `scripts/validate_cascade_codex.py`; path-level rename is an approval point,
  not part of the default text-only branding pass.

## Agent And Global Skill Inventory

### Available Agents

| Agent Or Subagent Route | Manifest | Role Contract | Skill Map | Role Checklists | Use In Workflow |
|---|---|---|---|---|---|
| `agent-engineer` | `.codex/agents/agent-engineer.toml` | `.codex/agents/agent-engineer/AGENT.md` | `.codex/agents/agent-engineer/skills.yaml` | none | selected; owns harness identity, skills, agents, validator, and Codex surface decisions |
| `orchestrator` | `.codex/agents/orchestrator.toml` | `.codex/agents/orchestrator/AGENT.md` | `.codex/agents/orchestrator/skills.yaml` | none | rejected for execution; useful route reference, but this is a single harness lane |
| `project-onboarder` | `.codex/agents/project-onboarder.toml` | `.codex/agents/project-onboarder/AGENT.md` | `.codex/agents/project-onboarder/skills.yaml` | none | rejected; this is not a target-repository onboarding pass |
| `business-analyst` | `.codex/agents/business-analyst.toml` | `.codex/agents/business-analyst/AGENT.md` | `.codex/agents/business-analyst/skills.yaml` | none | rejected; no market or product discovery needed |
| `security` | `.codex/agents/security.toml` | `.codex/agents/security/AGENT.md` | `.codex/agents/security/skills.yaml` | `.codex/agents/security/checklists/security-agent-workflows.md` | rejected; no security-sensitive surface change expected |
| `designer` | `.codex/agents/designer.toml` | `.codex/agents/designer/AGENT.md` | `.codex/agents/designer/skills.yaml` | `.codex/agents/designer/checklists/designer-workflows.md` | rejected; no UI or visual design artifact expected |

No subagent delegation has been authorized. Execute locally unless the user
explicitly authorizes delegation.

### Relevant Global Skills

| Skill | Source | Trigger Reason | Planned Step Calls |
|---|---|---|---|
| `agentic-workflow-builder` | `.codex/skills/agentic-workflow-builder/SKILL.md` | User asked to prepare a workflow packet | `WF-00` |
| `codex-maintenance` | `.codex/skills/codex-maintenance/SKILL.md` | Rename touches README, AGENTS, CODEX, `.codex/`, skills, agents, config, reports, and validator text | `WF-01`, `WF-02`, `WF-03`, `WF-04`, `WF-06` |
| `docs-impact-map` | `.codex/skills/docs-impact-map/SKILL.md` | Harness identity is a durable naming/brand fact that affects docs and pattern wording | `WF-02`, `WF-06` |
| `context` | `.codex/skills/context/SKILL.md` | Start/resume snapshot of dirty worktree and active work state | `WF-01` |
| `implement-change` | `.codex/skills/implement-change/SKILL.md` | Scoped documentation and validator text update after inventory | `WF-04` |
| `validate-change` | `.codex/skills/validate-change/SKILL.md` | Aggregate command, diff, and stale-reference evidence | `WF-05` |
| `closeout` | `.codex/skills/closeout/SKILL.md` | Record validation evidence, doc-routing decision, and unresolved path-rename risk | `WF-06` |

`context`, `implement-change`, `validate-change`, and `closeout` are not wired
to `agent-engineer`; use them as main-session orchestration support or route
through `orchestrator` if a formal delegated execution is later authorized.

## Workflow Checklist

| Step | Status | Owner Route | Skill Calls | Source Order | Delegation Prompt | Output | Validation | Handoff |
|---|---|---|---|---|---|---|---|---|
| `WF-00` | done | main session | `agentic-workflow-builder` | User request, agent inventory, skill inventory, key harness docs | none | This workflow packet | Packet quality checklist | `WF-01` |
| `WF-01` | done | main session or `agent-engineer` local role | `context`, `codex-maintenance` | `git status --short`, `rg --files -uu --hidden -g '!/.git/**'`, `docs/work/active.md`, current diff | `P-01` | Fresh reference inventory and dirty-worktree notes | Inventory named changed files and user-owned changes | `WF-02` |
| `WF-02` | done | main session or `agent-engineer` local role | `codex-maintenance`, `docs-impact-map` | `README.md`, `AGENTS.md`, `CODEX.md`, `.codex/README.md`, `.codex/config.toml`, `harness.config.example.yaml`, `docs/_index.md`, `docs/structure.md`, `docs/patterns/workflow.md`, recent reports | `P-01` | Rename decision matrix | Occurrences classified as brand, runtime/file-layout term, historical report, command/path, or approval-needed path rename | `WF-03` |
| `WF-03` | done | main session or `agent-engineer` local role | `codex-maintenance` | `rg -n "<OLD_FULL_NAME>|<OLD_SLUG>|An agentic workflow learning harness"` | `P-01` | Replacement map | No blanket replacement; exact replacement class exists for every hit | `WF-04` |
| `WF-04` | done | main session | `codex-maintenance`, `implement-change` | Replacement map and touched-file source reads | `P-01` | Patch applying the approved branding scope | Diff stayed scoped to identity copy/config/validator text; user-owned edits preserved | `WF-05` |
| `WF-05` | done | main session | `validate-change` | Current diff, validator, reference searches | `P-01` | Validation summary | `python3 -m py_compile scripts/validate_cascade_codex.py`, `python3 scripts/validate_cascade_codex.py`, stale-brand search, and `git diff --check` passed | `WF-06` |
| `WF-06` | done | main session or `agent-engineer` local role | `codex-maintenance`, `docs-impact-map`, `closeout` | Final diff, validation output, `docs/patterns/workflow.md` Doc Routing Decision Matrix | `P-01` | Closeout note or report update | Path rename deferred; no product/design/security impact | done |

## Rename Policy

Default approved scope:

- Use `Cascade` as the harness/product name in user-facing prose.
- Add or preserve the tagline exactly as `An agentic workflow learning harness`
  in `README.md` and any concise intro surfaces where a tagline belongs.
- Change `.codex/config.toml` `[harness].name` to the approved package slug
  while leaving path names unchanged unless separately approved.
- Keep `Codex` when the sentence is about actual Codex runtime behavior,
  `CODEX.md`, `.codex/`, Codex skills, Codex agents, project Codex config,
  or official Codex guidance.
- Keep or annotate historical work reports only when they preserve source
  history. If the validator later treats the old full brand as stale text,
  either update historical reports or add an explicit historical-report
  allowlist with a validator comment.

Approval point:

- Renaming `scripts/validate_cascade_codex.py`, command examples, repository
  slug, or any path containing the old slug is a separate path/API rename.
  Execute only if the user explicitly approves the churn.

## Global Orchestration Skill Calls

| Gate | Skill | When To Call | Required Output |
|---|---|---|---|
| context | `context` | At execution start or resume | Short state snapshot with dirty worktree, active work, blockers, and next gate |
| routing | `codex-maintenance` | Before edits | Surface decision and reference inventory |
| impact | `docs-impact-map` | Before patching or closeout if durable naming facts affect sibling docs | Impact matrix or explicit no-cross-doc-impact note |
| planning | `codex-maintenance` | Before patching | Replacement map and approval points |
| implementation | `implement-change` | After replacement map is complete | Scoped patch |
| acceptance | none | Product-visible functional acceptance is not required for a harness naming/doc update | `NOT_RUN` with reason |
| validation | `validate-change` | After patch | Command/search/diff evidence summary |
| closeout | `closeout` | After validation or if blocked | Final status, doc routing row, residual risks |

## Delegation Prompt Bank

### P-01: `agent-engineer` Local Role

Role:

- Agent: `agent-engineer`
- Role contract: `.codex/agents/agent-engineer/AGENT.md`
- Manifest: `.codex/agents/agent-engineer.toml`
- Skill map: `.codex/agents/agent-engineer/skills.yaml`

## Prompt

```text
You are the Agent Engineer local role. Execute the Cascade name-update workflow
without spawning subagents unless the user explicitly authorizes delegation.

Objective: update the harness identity to "Cascade" with the tagline
"An agentic workflow learning harness" across user-facing harness components
and README, while preserving real Codex runtime/file-layout terminology.

Use these skills in order: codex-maintenance for file tree and reference
inventory, docs-impact-map for durable naming/doc impact, implement-change for
the scoped patch if executing in the main session, validate-change for command
and stale-reference evidence, and closeout for final status.

Source order:
1. Latest user request and this workflow packet.
2. `git status --short` and current diff; preserve unrelated user changes.
3. `rg --files -uu --hidden -g '!/.git/**'`.
4. Targeted `rg -n` searches for legacy brand, current tagline, slug, validator
   command references, and Codex-runtime terms.
5. `README.md`, `AGENTS.md`, `CODEX.md`, `.codex/README.md`,
   `.codex/config.toml`, `harness.config.example.yaml`, `docs/_index.md`,
   `docs/structure.md`, `docs/patterns/workflow.md`, agent-engineer files,
   selected skill descriptions, work examples/reports, and validator script.

Output contract:
- Replacement map by occurrence class.
- Scoped patch only after the map is complete.
- Validation evidence from py_compile, harness validator, stale searches, and
  `git diff --check`.
- Closeout with any deferred path/API rename.

Stop rules:
- Stop before renaming paths such as `scripts/validate_cascade_codex.py` unless
  the user explicitly approves path/API churn.
- Stop if a user-owned dirty file cannot be safely merged.
- Stop if the validator failure is unrelated to the rename and needs separate
  triage.
```

## Write Scope

Allowed by default:

- `README.md`
- `AGENTS.md`
- `CODEX.md`
- `.codex/README.md`
- `.codex/config.toml`
- `harness.config.example.yaml`
- `.codex/agents/agent-engineer.toml`
- `.codex/agents/agent-engineer/AGENT.md`
- `.codex/skills/*/SKILL.md` only where the old brand appears in harness-owning
  descriptions or instructions
- `docs/_index.md`
- `docs/structure.md`
- `docs/work/examples/`
- `docs/work/reports/` only for current workflow/report updates, not broad
  historical rewrites unless validator policy requires it
- `scripts/validate_cascade_codex.py` text and validator expectations only

Forbidden without explicit approval:

- Path renames, including `scripts/validate_cascade_codex.py`
- Repository slug or directory rename
- Broad rewrites of historical reports
- Product, design, brand, security, or runtime behavior changes
- Dynamic agent creation or live subagent delegation
- Destructive git operations

## Validation

| Evidence | Command Or Check | Required? | Status |
|---|---|---|---|
| Python syntax | `python3 -m py_compile scripts/validate_cascade_codex.py` | yes | PASS |
| Harness validator | `python3 scripts/validate_cascade_codex.py` | yes | PASS |
| Stale brand search | `rg -n "<OLD_FULL_NAME>|<OLD_SLUG>" -S -g '!/.git/**'` | yes | PASS |
| New identity search | `rg -n "Cascade|An agentic workflow learning harness" README.md CODEX.md AGENTS.md .codex docs scripts harness.config.example.yaml` | yes | PASS |
| Diff hygiene | `git diff --check` | yes | PASS |
| Worktree review | `git diff --stat` and targeted diff read | yes | PASS |

## Handoff

- Output artifacts: replacement map, patch, validation summary, closeout report
  update.
- Status terms: `DONE`, `DONE_WITH_CONCERNS`, `NEEDS_CONTEXT`, `BLOCKED`.
- Merge owner: main Codex session.
- Merge target: current working tree.
- Conflict paths: existing dirty files listed in the current inventory summary.

## Stop Rules

- Stop for missing required source files.
- Stop for unauthorized path/API rename.
- Stop for unrelated validator failures that require separate triage.
- Stop for unresolved user-owned dirty changes that make a safe patch
  impossible.
- Stop when validation is blocked by missing preconditions.
- Stop when the workflow output contract is complete.

## Execution Guidance

- Serialized steps: all workflow steps are serialized.
- Parallel-safe steps: none; shared naming decisions and overlapping files make
  parallel sectioning unnecessary.
- Merge owner: main Codex session.
- Approval points: path/API rename remains deferred.
- Next route: done, unless a later request explicitly renames paths or command
  output labels.

## Closeout

Doc Routing Decision Matrix:

| Fact | Source | Owner Target | Action | Bloat Check | Evidence | Next Gate |
|---|---|---|---|---|---|---|
| Harness/product name is `Cascade` with tagline `An agentic workflow learning harness`; `Codex` remains for real runtime/file-layout terms. | User request on 2026-06-17 and implemented diff | `README.md`, `CODEX.md`, `AGENTS.md`, `.codex/`, `docs/`, `scripts/validate_cascade_codex.py` prose | UPDATED | Smallest useful rename across identity-bearing surfaces; no path/API rename | `python3 scripts/validate_cascade_codex.py` PASS, stale-brand search PASS, `git diff --check` PASS | DONE |

Deferred:

- Path/API names such as `scripts/validate_cascade_codex.py` and
  `cascade_codex_status` remain unchanged until explicitly approved.
