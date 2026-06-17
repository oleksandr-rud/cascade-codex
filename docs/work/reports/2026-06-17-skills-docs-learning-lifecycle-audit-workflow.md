# Skills, Docs, And Learning Lifecycle Audit Workflow

Date: 2026-06-17
Status: implemented workflow packet
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

## Agentic Workflow Builder Packet

Status: ready
Created: 2026-06-17
Workflow: `skills-docs-learning-lifecycle-audit`

This packet uses `.codex/skills/agentic-workflow-builder/SKILL.md`. It does not
create a new skill. It prepares a report-only audit and the later
implementation packets for approved changes.

### Agent And Global Skill Inventory

Available agents:

| Agent Or Route | Manifest | Role Contract | Skill Map | Use In Workflow |
|---|---|---|---|---|
| `agent-engineer` | `.codex/agents/agent-engineer.toml` | `.codex/agents/agent-engineer/AGENT.md` | `.codex/agents/agent-engineer/skills.yaml` | Selected for inventory, skill, agent, validator, and learning-route audit. |
| `business-analyst` | `.codex/agents/business-analyst.toml` | `.codex/agents/business-analyst/AGENT.md` | `.codex/agents/business-analyst/skills.yaml` | Selected for docs/spec trajectory and synthesis checks. |
| `orchestrator` | `.codex/agents/orchestrator.toml` | `.codex/agents/orchestrator/AGENT.md` | `.codex/agents/orchestrator/skills.yaml` | Selected for final merge and implementation packet sequencing. |
| `designer` | `.codex/agents/designer.toml` | `.codex/agents/designer/AGENT.md` | `.codex/agents/designer/skills.yaml` | Support only if design docs or UX templates materially affect findings. |
| `security` | `.codex/agents/security.toml` | `.codex/agents/security/AGENT.md` | `.codex/agents/security/skills.yaml` | Support only if audit finds security-review routing or permission-surface gaps. |
| `project-onboarder` | `.codex/agents/project-onboarder.toml` | `.codex/agents/project-onboarder/AGENT.md` | `.codex/agents/project-onboarder/skills.yaml` | Rejected for this audit unless findings become onboarding-specific. |

Relevant global skills:

| Skill | Source | Trigger Reason | Planned Step Calls |
|---|---|---|---|
| `agentic-workflow-builder` | `.codex/skills/agentic-workflow-builder/SKILL.md` | Build this reviewable workflow packet from an audit request. | AWB-00, AWB-01, AWB-02, AWB-07 |
| `codex-maintenance` | `.codex/skills/codex-maintenance/SKILL.md` | Audit and update harness surfaces, validator, routing docs, and stale references. | AWB-00, AWB-01, AWB-06 |
| `develop-skill` | `.codex/skills/develop-skill/SKILL.md` | Audit skill triggers, source order, artifacts, and reusable templates. | AWB-03 |
| `docs-impact-map` | `.codex/skills/docs-impact-map/SKILL.md` | Check docs folder ownership and cross-doc write targets. | AWB-04, AWB-05 |
| `agents-best-practices` | `.codex/skills/agents-best-practices/SKILL.md` | Evaluate context, memory, connector, lifecycle, and harness design patterns. | AWB-04 |
| `synthesis-to-spec` | `.codex/skills/synthesis-to-spec/SKILL.md` | Analyze docs/spec trajectory and evidence-to-spec handoff. | AWB-05 |
| `compose-spec` | `.codex/skills/compose-spec/SKILL.md` | Check durable product/spec template coverage and route gaps. | AWB-05 |
| `orchestrate-work` | `.codex/skills/orchestrate-work/SKILL.md` | Merge lane outputs, serialize conflicting edits, and create update packets. | AWB-07 |
| `validate-change` | `.codex/skills/validate-change/SKILL.md` | Aggregate validator, diff, and evidence checks after approved edits. | AWB-08 |
| `closeout` | `.codex/skills/closeout/SKILL.md` | Preserve final evidence and thin durable lessons after implementation. | AWB-09 |

Preflight status:

| Check | Evidence | Required Decision |
|---|---|---|
| Harness validation currently passes. | `python3 scripts/validate_cascade_codex.py` reports `cascade_codex_status=PASS`, `agents=6`, `skills=36`. | Re-run before and after any implementation packet; if drift appears, classify it as `UPDATE`, `REGISTER`, `DELETE`, `DEFER`, or `NO_CHANGE`. |

### Workflow Checklist

| Step | Status | Owner Route | Skill Calls | Source Order | Delegation Prompt | Output | Validation | Handoff |
|---|---|---|---|---|---|---|---|---|
| AWB-00 | ready | agent-engineer | `agentic-workflow-builder`, `codex-maintenance` | current diff, validator output, active skill/agent/docs surfaces | P-00 | preflight drift decision | validator and dirty-tree state classified | AWB-01 |
| AWB-01 | ready | agent-engineer | `codex-maintenance` | `.codex/skills/`, `.codex/agents/`, docs folders, validator | P-01 | canonical surface inventory | missing/extra/stale surfaces listed | AWB-02 |
| AWB-02 | ready | agent-engineer | `agentic-workflow-builder` | inventory output, agent TOML, role contracts, skill maps | P-02 | finalized lane packet map | every lane has owner, skill calls, source order, output, stop rule | AWB-03/AWB-04/AWB-05 |
| AWB-03 | ready | agent-engineer | `develop-skill` | all active `SKILL.md`, templates, checklists, references | P-03 | skill and artifact quality matrix | trigger/source/output/artifact gaps classified | AWB-07 |
| AWB-04 | ready | agent-engineer | `docs-impact-map`, `agents-best-practices` | `docs/structure.md`, `docs/patterns/`, docs folders, routing docs | P-04 | docs and learning owner matrix | every memory/learning route has narrow owner | AWB-07 |
| AWB-05 | ready | business-analyst | `synthesis-to-spec`, `compose-spec`, `docs-impact-map` | `docs/product/`, `docs/design/`, `docs/brand/`, `docs/specs/`, `docs/work/reports/` | P-05 | docs/spec trajectory matrix | current/superseded/contradictory evidence classified | AWB-07 |
| AWB-06 | ready | agent-engineer | `codex-maintenance` | lane findings, validator source, routing docs | P-06 | enforcement backlog | validator candidates limited to mechanical invariants | AWB-07 |
| AWB-07 | ready | orchestrator | `orchestrate-work`, `agentic-workflow-builder` | all lane outputs | P-07 | prioritized implementation packets | conflicts serialized and merge owner named | approval gate |
| AWB-08 | blocked until approved | agent-engineer | `codex-maintenance`, `validate-change` | approved packets only | P-08 | patched owner files and validation evidence | `git diff --check` and validator run or blocker | AWB-09 |
| AWB-09 | blocked until implementation | agent-engineer | `closeout` | final diff and validation evidence | P-09 | closeout summary and durable lesson routes | no decorative docs churn | done |

### Global Orchestration Skill Calls

| Gate | Skill | When To Call | Required Output |
|---|---|---|---|
| context | `context` | If the audit resumes after branch changes or compaction. | short snapshot or skip reason |
| routing | `orchestrate-work` | After lane outputs exist or edits need sequencing. | lane model and merge owner |
| impact | `docs-impact-map` | For docs folder, spec, product, design, brand, and glossary impacts. | impact matrix |
| planning | `agentic-workflow-builder` | Before any delegated or multi-lane audit work. | packet with prompts and stop rules |
| validation | `validate-change` | After approved file edits. | validation summary |
| closeout | `closeout` | After final validation or blocked handoff. | handoff and durable learn-routing |

### Delegation Prompt Bank

P-00: Agent Engineer preflight

```text
You are the Agent Engineer using agentic-workflow-builder and codex-maintenance.
Classify the current dirty-tree and validator state before the full lifecycle
audit proceeds. Read current diff, validator output, agent-engineer skills.yaml,
CODEX.md, .codex/README.md, active skill directories, and untracked files. Do
not patch files. Return each drift item as UPDATE, REGISTER, DELETE, DEFER, or
NO_CHANGE, with exact owner files and validation impact.
```

P-01: Agent Engineer inventory

```text
You are the Agent Engineer using codex-maintenance. Build a complete inventory
of Cascade surfaces: skills, templates, checklists, references, agents,
docs folders, routing docs, config, and validator. Compare filesystem,
validator registration, agent wiring, and docs references. Produce extra,
missing, stale, empty, and unregistered surfaces. Do not patch files.
```

P-03: Skill and artifact audit

```text
You are the Agent Engineer using develop-skill. Audit every active skill and
artifact for trigger-focused description, source order, scope, anti-scope,
output contract, validation guidance, and real-world template/checklist
usability. Classify actions as UPDATE, REGISTER, DELETE, DEFER, or NO_CHANGE.
Do not rewrite skills.
```

P-04: Docs and learning lifecycle audit

```text
You are the Agent Engineer using docs-impact-map and agents-best-practices.
Audit docs folders, write targets, context-memory routing, durable learning
promotion, and validator candidates. Keep docs/patterns/context-memory.md as
the default source-context owner unless evidence justifies a coordinated
structure and validator migration. Do not create new folders.
```

P-05: Docs/spec trajectory audit

```text
You are the Business Analyst using synthesis-to-spec, compose-spec, and
docs-impact-map. Audit product, design, brand, specs, backlog, glossary, and
work reports for source identity, relationships, evidence maturity,
current/superseded status, contradictions, acceptance, and implementation
handoff coverage. Do not author product specs.
```

P-07: Merge and implementation packets

```text
You are the Orchestrator using orchestrate-work and agentic-workflow-builder.
Merge all lane outputs into prioritized implementation packets. Group safe
atomic changes, serialized changes, deferred decisions, and validator backlog.
Do not implement until the packet is approved.
```

### Write Scope

Allowed during report-only preparation:

- `docs/work/reports/2026-06-17-skills-docs-learning-lifecycle-audit-workflow.md`

Forbidden until implementation is approved:

- rewriting all `.codex/skills/*/SKILL.md`;
- moving skill packages into agent folders;
- creating a new lifecycle-audit skill;
- creating nested memory-pattern folders under `docs/patterns/`;
- registering placeholder skills without completing their quality gates.

### Stop Rules

- Stop if inventory cannot distinguish current source facts from stale docs.
- Stop if validator failure is unrelated to the packet and needs owner
  approval.
- Stop before edits when a finding affects shared routing, validator rules, or
  skill ownership.
- Stop after producing implementation packets for approval.

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
You are the Agent Engineer. Build a complete inventory of Cascade surfaces:
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
Design the full learning lifecycle for Cascade. Audit how lessons are
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

## Implementation Run: 2026-06-17

Status: implemented clear mechanical packets; deeper qualitative skill rewrites
deferred to follow-up packets.

### Evidence Snapshot

| Check | Result | Evidence |
|---|---|---|
| Skill registration | PASS | 36 validator skills, 36 active `SKILL.md` files, 36 wired skills |
| Agent registry | PASS | 6 agents with TOML, `AGENT.md`, and `skills.yaml` |
| Agent wiring counts | PASS | `agent-engineer`: 7, `business-analyst`: 14, `designer`: 11, `orchestrator`: 19, `project-onboarder`: 14, `security`: 8 |
| Skill artifacts | PASS | 43 skill templates, 12 skill checklists, 2 agent checklists, 4 references |
| Docs folders | PASS | Only documented folders remain: `docs/backlog`, `docs/brand`, `docs/design`, `docs/patterns`, `docs/product`, `docs/product/personas`, `docs/specs`, `docs/specs/incoming`, `docs/specs/transformed`, `docs/work`, `docs/work/examples`, `docs/work/lanes`, `docs/work/reports` |
| Removed memory/tool refs | PASS | No active references to Graphiti, GraphRAG, codebase-memory, or graphify |
| Active stale skill refs | PASS | No active `.codex`, `CODEX.md`, `AGENTS.md`, `.codex/README.md`, or validator references to removed `product-discovery`, source-branch extraction, lifecycle-audit, or architecture-decision skill packages |

### Implemented Packets

| Packet | Owner File(s) | Action | Validation |
|---|---|---|---|
| VAL-01 docs folder enforcement | `scripts/validate_cascade_codex.py` | Added `ALLOWED_DOC_FOLDERS` and validator failure for docs folders outside `docs/structure.md`. | `python3 scripts/validate_cascade_codex.py` PASS |
| VAL-02 orphan skill directory enforcement | `scripts/validate_cascade_codex.py` | Validator now fails when a `.codex/skills/*` directory exists without registration, even if no `SKILL.md` is present. | `python3 scripts/validate_cascade_codex.py` PASS |
| VAL-03 active stale skill reference enforcement | `scripts/validate_cascade_codex.py` | Validator now fails when active skill, agent, bridge, or README surfaces reference retired skill package names. Historical work reports remain source history. | `python3 scripts/validate_cascade_codex.py` PASS |
| DOC-01 empty docs folder cleanup | workspace directories | Removed empty untracked `docs/engineering/`, `docs/specs/archive/`, `docs/specs/memory-systems/`, and `docs/specs/source/` directories. | `find docs -type d -maxdepth 4` matches structure map |
| SKILL-01 stale active route cleanup | `.codex/skills/secure-design/SKILL.md`, `.codex/skills/ux-flow-review/SKILL.md` | Replaced active references to removed `product-discovery` with the current `discover` route. | Active stale skill reference scan PASS |
| INV-01 orphan skill folder cleanup | workspace directories | Removed empty untracked orphan skill-package directories for discarded skill ideas. | validator skill-dir check PASS |

### Deferred Packets

| Packet | Reason Deferred | Next Owner |
|---|---|---|
| Full qualitative rewrite of every skill with heading-normalization | The first pass found many skills use local structures instead of uniform `## Scope`/`## Workflow` headings. Validator and trigger contracts already pass, so rewriting all skills would be broad churn without a per-skill owner decision. | `agent-engineer -> develop-skill` |
| Historical report cleanup for old proposed skill names | Historical reports may mention superseded proposals as source history. Active routing surfaces are clean; history cleanup should happen only if a report is promoted back into active guidance. | `agent-engineer -> codex-maintenance` |
| Nested memory-pattern folder migration | No evidence yet that `docs/patterns/context-memory.md` is too large or ambiguous. | defer |

### Validation Evidence

```bash
python3 -m py_compile scripts/validate_cascade_codex.py
git diff --check
python3 scripts/validate_cascade_codex.py
```

Expected validator result after this run:

```text
cascade_codex_status=PASS
agents=6
skills=36
project_specific_leakage=0
standalone_qa_refs=0
```

## Initial Recommendation

Start with a report-only audit. Do not create a nested memory-pattern folder
under `docs/patterns/` yet.
Current repo rules intentionally use `docs/patterns/context-memory.md` as the
memory/context pattern owner and forbid that nested path shape.
Only migrate to a folder after the audit proves the single-file owner is too
large or ambiguous, and only with coordinated updates to `docs/structure.md`,
`CODEX.md`, relevant skills, and `scripts/validate_cascade_codex.py`.
