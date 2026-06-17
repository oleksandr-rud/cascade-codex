# Skills, Docs, And Learning Lifecycle Audit Workflow

Date: 2026-06-17
Status: draft workflow
Owner route: `agent-engineer -> agentic-workflow-builder -> codex-maintenance`
Source: user request to prepare an agentic workflow for auditing all skills,
all docs folders, real-world templates, wiring consistency, trigger quality,
and a full learning lifecycle for consolidated reusable memory.

## Objective

Prepare a precise audit workflow that can later inspect every skill, every
agent, every docs folder, every template/checklist/reference, and every
learning route. The audit must verify:

- all skills are registered, discoverable, and wired to the right agent
  segments;
- every skill has a trigger-focused description, source order, scope,
  anti-scope, output contract, and validation rule where needed;
- templates and checklists are real-world usable rather than decorative;
- docs folders and write targets match `docs/structure.md`,
  `docs/patterns/workflow.md`, and validator rules;
- consolidated learning is promoted to the narrowest durable owner:
  `.codex/skills/`, `.codex/agents/`, `docs/patterns/context-memory.md`,
  another existing `docs/patterns/*.md`, `docs/work/reports/`, or backlog;
- any requested nested memory-pattern folder under `docs/patterns/` is treated
  as a migration decision because the current validator intentionally forbids
  that nested path shape and requires `docs/patterns/context-memory.md`.

## Current Inventory Seed

This is a starting snapshot, not the final audit result:

- validator-registered skills: 36;
- agents: 6;
- wired registered skills: 36;
- unwired registered skills: none;
- skill templates: 43 files;
- skill and agent checklists: 14 files;
- skill references: 4 files;
- agent wiring counts:
  - `agent-engineer`: 7 skills;
  - `business-analyst`: 14 skills;
  - `designer`: 11 skills;
  - `orchestrator`: 19 skills;
  - `project-onboarder`: 14 skills;
  - `security`: 8 skills.

Audit seed risks to verify:

- visible unregistered empty skill directories may exist and need
  classification as delete, register, or ignore;
- stale references to missing or renamed skills must be found by search, not
  only validator registration;
- empty docs folders outside the validated folder set must be classified as
  intentional, migration leftovers, or future work;
- `docs/patterns/context-memory.md` is the current memory-pattern owner, while
  a nested memory-pattern folder under `docs/patterns/` is blocked unless the
  validator and structure docs are intentionally migrated.

## Lane Model

Use `sequential-pipeline` with parallel audit lanes after inventory:

1. Inventory and normalize surfaces.
2. Run skill quality, agent wiring, docs-folder, template, and learning-route
   audits in parallel.
3. Merge findings into a decision matrix.
4. Produce skill-update packets and validator changes.
5. Only after review, patch skills/docs/validators.

Do not rewrite all skills during the audit. The output is a prioritized,
evidence-backed update plan with exact owner files and packet prompts.

## Global Acceptance Criteria

- Every finding cites a path, line/search evidence, validator result, or
  explicit absence.
- Every proposed edit names the smallest owner file and why it belongs there.
- Every stale skill reference is classified as `UPDATE`, `REGISTER`,
  `DELETE`, `DEFER`, or `NO_CHANGE`.
- Every template is classified as `REAL_WORLD_READY`, `NEEDS_FIELDS`,
  `DECORATIVE`, `DUPLICATE`, or `ABSENT`.
- Every learning/memory route is classified by durable owner and bloat risk.
- No new nested memory-pattern folder under `docs/patterns/` is created unless
  the audit explicitly recommends a validator and structure migration.
- Validator changes are proposed for mechanical invariants only.

## Work Lanes

| Lane | Owner | Route | Parallel | Output |
|---|---|---|---|---|
| INV-01 Surface inventory | agent-engineer | `codex-maintenance` | first | canonical inventory |
| SKILL-01 Skill trigger and rule audit | agent-engineer | `develop-skill` | yes | skill quality matrix |
| AGENT-01 Agent wiring and segment audit | agent-engineer | `agentic-workflow-builder` | yes | agent-skill segment matrix |
| DOC-01 Docs folder and write-target audit | agent-engineer + business-analyst | `docs-impact-map` | yes | docs structure matrix |
| TMPL-01 Template/checklist usability audit | agent-engineer | `develop-skill` | yes | template quality matrix |
| LEARN-01 Learning lifecycle audit | agent-engineer | `agents-best-practices` | yes | durable learning route matrix |
| SPEC-01 Docs/spec trajectory audit | business-analyst | `synthesis-to-spec` | yes | trajectory coverage matrix |
| VAL-01 Validator and eval audit | agent-engineer | `codex-maintenance` | after parallel lanes | enforcement backlog |
| MERGE-01 Prioritized update plan | orchestrator | `orchestrate-work` | final | implementation packets |

## INV-01: Surface Inventory

Prompt:

```text
You are the Agent Engineer. Build a complete inventory of Cascade Codex surfaces:
all .codex/skills/*/SKILL.md, skill templates/checklists/references, all
.codex/agents manifests/contracts/skills.yaml/checklists, all docs folders,
CODEX.md, AGENTS.md, .codex/README.md, harness.config.example.yaml, and
scripts/validate_cascade_codex.py. Compare filesystem, validator registration,
agent wiring, and docs references. Produce a canonical inventory with extra,
missing, stale, empty, and unregistered surfaces. Do not patch files.
```

Required checks:

- `rg --files -uu --hidden -g '!/.git/**'`;
- all skill directories versus validator `SKILLS`;
- all `source:` paths in `skills.yaml`;
- all docs folders versus `docs/structure.md` and validator
  `REQUIRED_FOLDERS`;
- all references to skill names that do not have an active `SKILL.md`;
- all empty directories and untracked folders;
- all pattern paths blocked by validator.

Output:

- canonical surface inventory;
- extra or missing skill dirs;
- stale skill-name references;
- docs folder status;
- validator coverage gaps.

## SKILL-01: Skill Trigger And Rule Audit

Prompt:

```text
You are the Agent Engineer using develop-skill. For every active skill, audit
frontmatter, trigger-focused description, source order, scope, anti-scope,
workflow/checklist, templates/checklists/references, output contract, validation
rules, route collisions, and examples of when to use or not use it. Compare each
skill to adjacent skills and owning agents. Produce a precise update matrix; do
not rewrite skills.
```

Quality gates:

- frontmatter has `name` and trigger-focused `description`;
- description says when to load, not merely what the skill contains;
- source order names all required docs and runtime evidence;
- scope and anti-scope prevent overlap with adjacent skills;
- output contract names artifacts and next route;
- templates/checklists are referenced from `SKILL.md` when present;
- route collisions are explicit and resolved by source order or anti-scope;
- skills that are used often have direct trigger language and compact rules;
- rules that must always hold are candidates for validator enforcement.

Matrix:

| Skill | Owner Agent(s) | Trigger Quality | Source Order | Scope/Anti-Scope | Output Contract | Artifacts | Collisions | Action |
|---|---|---|---|---|---|---|---|---|

## AGENT-01: Agent Wiring And Segment Audit

Prompt:

```text
You are the Agent Engineer using agentic-workflow-builder. Audit each agent's TOML,
AGENT.md, skills.yaml, role checklists, use scope, avoid scope, and segment
ownership. Verify every skill mapped to the agent matches the agent's role and
that no role needs a skill it lacks. Produce an agentic workflow packet for each
correction lane. Do not spawn agents.
```

Segment questions:

- Which skills are core to the agent?
- Which skills are cross-role support exceptions?
- Which skills are missing from a role that references them in prose?
- Which skills are wired but not named in the role responsibilities?
- Which agent checklists should reference a skill checklist or template?
- Which route belongs to orchestrator versus specialist role?

Matrix:

| Agent | Expected Segment | Wired Skills | Missing Skills | Misplaced Skills | Checklist Coverage | Action |
|---|---|---|---|---|---|---|

## DOC-01: Docs Folder And Write-Target Audit

Prompt:

```text
You are the Agent Engineer with docs-impact-map. Audit every docs folder and
write target against docs/structure.md, docs/patterns/workflow.md,
docs/patterns/context-memory.md, CODEX.md, harness.config.example.yaml, and the
validator. Classify each folder as required, optional, empty-but-valid,
untracked-leftover, blocked-by-validator, or migration candidate. Do not move or
delete files.
```

Required checks:

- `docs/product/`, `docs/design/`, `docs/brand/`, `docs/specs/`,
  `docs/backlog/`, `docs/work/`, `docs/patterns/`, `docs/glossary.md`;
- `docs/specs/incoming/` and `docs/specs/transformed/` source/normalized split;
- empty folders such as source/archive/engineering-style folders if present;
- docs folder references in skills and agent contracts;
- Doc Routing Decision Matrix owners;
- blocked nested pattern folders, especially a memory-pattern folder under
  `docs/patterns/`.

Matrix:

| Folder/File | Current Role | Source Of Truth | Status | Owner Skill | Follow-Up |
|---|---|---|---|---|---|

## TMPL-01: Template And Checklist Usability Audit

Prompt:

```text
You are the Agent Engineer using develop-skill. Audit every template and
checklist under .codex/skills and .codex/agents. Decide whether it is real-world
usable: it must have fields that prevent missing source identity, owner, status,
acceptance, validation, routing, and handoff details. Mark weak templates and
checklists for update with exact missing fields. Do not rewrite templates.
```

Template quality rubric:

- source identity and freshness;
- owner role or owner doc;
- status vocabulary;
- acceptance or success criteria;
- validation evidence field;
- next route or handoff;
- bloat guard;
- source-to-output traceability;
- open questions and blocked/deferred state;
- enough structure for repeated use, not a decorative checklist.

Matrix:

| Artifact | Referenced By | Required Fields Present | Missing Fields | Duplicate/Overlap | Action |
|---|---|---|---|---|---|

## LEARN-01: Learning Lifecycle Audit

Prompt:

```text
You are the Agent Engineer using agents-best-practices and codex-maintenance.
Design the full learning lifecycle for Cascade Codex. Audit how lessons are
captured from validation, closeout, reviews, failed workflows, stale references,
template gaps, routing mistakes, and docs/spec trajectories. Route consolidated
learning to the narrowest durable owner. Treat docs/patterns/context-memory.md
as the current pattern owner unless the audit explicitly recommends a nested
memory-pattern folder migration with validator changes.
```

Lifecycle:

1. Detect candidate learning from validation, closeout, audits, user feedback,
   repeated workflow mistakes, missing templates, or stale references.
2. Classify learning:
   - active execution state;
   - lane-specific evidence;
   - durable workflow rule;
   - role-boundary rule;
   - product/spec/design/brand fact;
   - codebase vocabulary;
   - rejected scope;
   - validator invariant.
3. Route to owner:
   - `docs/work/active.md`;
   - `docs/work/lanes/`;
   - `docs/work/reports/`;
   - `.codex/skills/`;
   - `.codex/agents/`;
   - `docs/patterns/context-memory.md`;
   - `docs/patterns/workflow.md`;
   - `docs/patterns/boundaries.md`;
   - `docs/patterns/testing.md`;
   - `docs/glossary.md`;
   - `docs/backlog/_index.md`.
4. Consolidate only when repeated or durable enough.
5. Add validator/hook/eval only when prompt guidance is not strong enough.
6. Re-check bloat and stale-route risk.

Decision point for a nested memory-pattern folder:

| Option | Validator Impact | Benefit | Risk | Decision Input |
|---|---|---|---|---|
| Keep `docs/patterns/context-memory.md` | none | matches current invariant | single file may grow | current default |
| Add nested memory-pattern folder | update validator, structure, CODEX, skills | richer memory pattern taxonomy | violates current simplified pattern set until migrated | only if audit proves repeated bloat |
| Add skill-owned memory references | update affected skills only | progressive disclosure | may fragment rules | use for conditional bulky details |

Output matrix:

| Learning | Source | Frequency | Durable Owner | Bloat Risk | Validator Needed | Action |
|---|---|---|---|---|---|---|

## SPEC-01: Docs/Specs Trajectory Audit

Prompt:

```text
You are the Business Analyst using synthesis-to-spec, compose-spec, and
docs-impact-map. Audit whether docs/spec synthesis has enough trajectory
coverage: source identity, entity mapping, relationship mapping, evidence
maturity, current/superseded status, contradictions, acceptance, implementation
bridge, and closeout promotion. Check product, design, brand, specs, backlog,
glossary, and work reports. Do not author product specs.
```

Trajectory matrix:

| Source | Entity | Relationships | Evidence Maturity | Current/Superseded | Contradiction | Acceptance | Owner Target |
|---|---|---|---|---|---|---|---|

## VAL-01: Validator, Hook, And Eval Audit

Prompt:

```text
You are the Agent Engineer using codex-maintenance. Convert audit findings into
mechanical enforcement recommendations. Decide which checks belong in
scripts/validate_cascade_codex.py, templates, checklists, hooks, config, or eval
prompts. Do not activate hooks or external tools.
```

Validator candidates:

- all skill directories either registered or explicitly ignored;
- every prose skill reference resolves to an active skill or approved alias;
- every agent role reference has matching `skills.yaml` wiring;
- every template/checklist referenced by `SKILL.md` exists;
- every docs folder is required, optional with index, or intentionally ignored;
- no blocked pattern path is introduced without validator migration;
- learning lifecycle owner matrix is present before adding new pattern folders.

Eval prompts:

- user asks for a broad skill audit;
- user asks for a new pattern folder;
- user asks to move agent-scoped skills;
- user asks for docs/spec synthesis from conflicting evidence;
- user asks to store a learning with no clear owner;
- user asks to add a template that duplicates an existing one.

## MERGE-01: Prioritized Update Plan

Prompt:

```text
You are the Orchestrator. Merge the audit lane outputs into a prioritized,
implementation-ready plan. Group findings into safe atomic changes, serialized
changes, and deferred design decisions. Create agentic workflow packets for each
implementation lane. Do not implement until the plan is reviewed.
```

Merge output:

- executive summary;
- critical stale references and wiring breaks;
- skill trigger/description update queue;
- template/checklist update queue;
- docs folder and pattern migration decisions;
- learning lifecycle owner matrix;
- validator/hook/eval backlog;
- implementation lane packets with owners and validation.

## Initial Recommendation

Start with a report-only audit. Do not create a nested memory-pattern folder
under `docs/patterns/` yet.
Current repo rules intentionally use `docs/patterns/context-memory.md` as the
memory/context pattern owner and forbid that nested path shape.
Only migrate to a folder after the audit proves the single-file owner is too
large or ambiguous, and only with coordinated updates to `docs/structure.md`,
`CODEX.md`, relevant skills, and `scripts/validate_cascade_codex.py`.
