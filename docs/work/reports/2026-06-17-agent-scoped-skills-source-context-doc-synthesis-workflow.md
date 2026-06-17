# Agent-Scoped Skills And Docs Synthesis Workflow

Date: 2026-06-17
Status: draft workflow
Owner route: `agent-engineer -> orchestrate-work -> develop-skill -> codex-maintenance`
Source: user request to prepare agentic research and planning for possible
agent-scoped skill placement, source-context retrieval, and docs/spec synthesis
skills, templates, checklists, and trajectory analysis.

## Objective

Prepare a reviewable workflow before any layout migration. The workflow must
answer:

- whether agent-scoped skills should move under agent folders, stay central, or
  be mirrored for packaging;
- how source context should connect code, docs, specs, decisions, work lanes,
  and implementation evidence;
- which skills, templates, checklists, validators, and evals are needed for
  docs/spec synthesis;
- how docs, specs, source context, implementation, validation, and closeout
  update each other while tracked source files remain authoritative.

## Current Local Facts

- Current Cascade layout is central-skill and role-wired:
  `.codex/skills/{skill}/SKILL.md` plus `.codex/agents/{agent}/skills.yaml`.
- All current skills are wired by reference from agent `skills.yaml` files.
- Agent folders own role contracts, skill maps, and role checklists.
- Codex-facing docs describe skills as standalone skill directories and custom
  agents as standalone TOML files, so placing reusable `SKILL.md` files inside
  `.codex/agents/{agent}/` needs compatibility proof before migration.
- The first implementation-ready skill from this workflow is
  `agent-workflow-builder`.

## External Evidence Snapshot

- OpenAI Codex skills docs: skills are directories with required `SKILL.md`,
  optional scripts, references, assets, and metadata; descriptions drive
  implicit selection; progressive disclosure limits initial context.
  Source: https://developers.openai.com/codex/skills
- OpenAI Codex subagents docs: custom agents are standalone TOML files with
  required `name`, `description`, and `developer_instructions`.
  Source: https://developers.openai.com/codex/subagents
- OpenAI Codex customization docs: project guidance, persisted context, skills,
  MCP, and subagents are complementary layers, not substitutes.
  Source: https://developers.openai.com/codex/concepts/customization
- LlamaIndex property graph docs remain useful as an implementation-pattern
  reference for schema-guided extraction, source metadata, vector-backed graph
  retrieval, and combined retrievers.
  Source:
  https://developers.llamaindex.ai/python/framework/module_guides/indexing/lpg_index_guide/
- MCP specification: use MCP for standardized tools and context resources, with
  the harness retaining source trust, permissions, and validation boundaries.
  Source: https://modelcontextprotocol.io/specification/2025-06-18

## Lane Model

Use a sequential pipeline with parallel research lanes after topology framing:

1. Frame the skill-topology decision.
2. Run source-context and docs/spec-synthesis research in parallel.
3. Merge into skill updates, templates, validator requirements, and eval prompts.
4. Only after review, implement any selected layout migration.

Do not perform a live folder migration in this workflow. Migration is a later
implementation lane after compatibility evidence and validator changes exist.

## Global Acceptance Criteria

- Every proposed agent-call packet names a real agent, role contract, skill
  route, source order, write scope, validation, and stop condition.
- Every skill-topology option records discovery behavior, context cost,
  validator impact, migration risk, rollback path, and packaging impact.
- Source-context design separates tracked source truth from retrieval/cache
  layers and records source identity for every retrieved fact.
- Docs/spec synthesis design includes trajectory analysis for requirements,
  personas, journeys, scenarios, decisions, evidence, contradictions,
  supersession, and implementation acceptance.
- Proposed skill changes include trigger, anti-trigger, source order, output
  contract, templates, checklists, validators, eval prompts, and ownership.
- Hooks are proposed only for mechanical lifecycle enforcement and remain
  explicit-approval work.

## Work Lanes

| Lane | Owner | Route | Can Run In Parallel | Output |
|---|---|---|---|---|
| AS-01 Skill topology decision | agent-engineer | `codex-maintenance` | no, first | topology decision matrix |
| AS-02 Codex compatibility proof | agent-engineer | `codex-maintenance` | after AS-01 starts | discovery and packaging proof |
| CTX-01 Source-context retrieval | agent-engineer | `agents-best-practices` | yes | source-context lifecycle design |
| DOC-01 Docs/spec synthesis research | business-analyst + agent-engineer | `synthesis-to-spec`, `compose-spec`, `docs-impact-map` | yes | synthesis trajectories and ontology |
| SKILL-01 Skill/task updates | agent-engineer | `develop-skill` | after AS/CTX/DOC | skill updates and artifact matrix |
| VAL-01 Validators, hooks, and evals | agent-engineer | `codex-maintenance` | after AS/CTX/DOC | enforcement plan |
| MERGE-01 Workflow synthesis | orchestrator | `orchestrate-work` | no, final | implementation-ready plan |

## AS-01: Skill Topology Decision

Prompt:

```text
You are the Agent Engineer. Research whether Cascade Codex should keep reusable
skills central, move agent-scoped skills under agent folders, or create a
mirrored packaging layer. Read AGENTS.md, CODEX.md, .codex/config.toml,
.codex/agents/*/AGENT.md, .codex/agents/*/skills.yaml, .codex/skills/*/SKILL.md,
docs/structure.md, docs/patterns/workflow.md, and current official Codex skill
and subagent docs. Produce a decision matrix with compatibility evidence,
context-budget impact, migration risk, validator impact, packaging impact,
rollback path, and recommended default. Do not move files.
```

Checklist:

- [ ] Build skill-to-agent ownership matrix.
- [ ] Mark shared skills used by more than one agent.
- [ ] Mark role-specific checklists already living under agent folders.
- [ ] Test whether the proposed destination is Codex-discoverable or
      Cascade-only.
- [ ] Distinguish source layout from package/mirror layout.
- [ ] Identify stale path, duplicate trigger, and context-list risks.
- [ ] Define validator changes before any move.
- [ ] Define rollback and compatibility bridge.

Expected decision:

- Keep reusable workflow skills central until a compatibility proof shows that
  an agent-local skill root is both discoverable and less confusing.
- Keep role-specific checklists and agent-call packet examples inside agent
  folders when they are role-specific.
- Use a mirror/package layer only when distribution or Codex-native skill
  discovery requires it.
- Avoid moving shared skills under one agent because it hides cross-role reuse.

## AS-02: Codex Compatibility Proof

Prompt:

```text
You are the Agent Engineer. Verify current Codex skill and custom-agent
discovery rules against our local Cascade layout. Produce a small proof plan:
which paths Codex scans, how duplicate skill names behave, where optional skill
metadata belongs, how custom agent TOML differs from Cascade role folders, and
what needs a validator or adapter. Do not alter the active layout.
```

Evidence to preserve:

- official docs URLs and retrieval date;
- local path inventory;
- explicit compatibility status for each candidate layout:
  `SUPPORTED`, `CASCADE_ONLY`, `MIRROR_REQUIRED`, `BLOCKED`, or `UNKNOWN`;
- migration command sketch only after the preferred layout is chosen.

## CTX-01: Source-Context Retrieval

Prompt:

```text
You are the Agent Engineer. Design the source-context lifecycle for Cascade
Codex across code, docs, specs, decisions, work lanes, and agent queries. Define
what tracked docs own, what retrieval can cache or summarize, what triggers
staleness, how provenance is recorded, how agents query sources, and what
validators or hooks enforce. Do not install or configure live retrieval
services.
```

Lifecycle model:

| Layer | Owns | Update Trigger | Query Fit | Authority |
|---|---|---|---|---|
| Tracked docs | durable rules, specs, product, design, brand, work state | explicit edits and closeout | exact source reads | authoritative |
| Source inventory | paths, owners, hashes, freshness, source identity | file diff, docs-impact, closeout | routing and staleness questions | evidence layer |
| Retrieval cache | bounded summaries, ranked snippets, source IDs | explicit refresh or invalidation | broad lookup and preplanning | evidence layer |
| Prompt context | current task state and loaded rules | each turn and compaction | immediate execution | temporary |

Required research questions:

- What source identity schema is required for retrieved context?
- Which facts are never cached because tracked docs already own them?
- How are stale context packets detected from git diff, source hashes,
  closeout scan, or docs-impact changes?
- How are contradictions represented without overwriting history?
- What query planner chooses between exact file reads, `rg`, docs/spec source
  inventory, Context7, MCP retrieval, or web research?
- What compaction rehydration packet must survive long work?

Source-context checklist:

- [ ] Every retrieved fact has source path or source ID, timestamp, confidence,
      and freshness state.
- [ ] Retrieved material is labeled as evidence, not instruction.
- [ ] Current and superseded facts can coexist in reports.
- [ ] Contradictions produce review tasks, not silent merges.
- [ ] Staleness follows file changes, source hashes, and docs-impact updates.
- [ ] Closeout writes thin tracked docs before any cache refresh is considered.
- [ ] Hooks are limited to mechanical packet creation, stale detection, or
      validator gates.

## DOC-01: Docs And Specs Synthesis Research

Prompt:

```text
You are the Business Analyst with Agent Engineer support. Research how Cascade
Codex should synthesize docs/specs and source-context evidence into plan-ready
product, design, brand, scenario, acceptance, and implementation packets. Use
docs-impact-map trajectory rules, corpus-level evidence synthesis, property
graph schema extraction patterns, and current Cascade docs. Produce ontology,
trajectory passes, templates, and checklist requirements. Do not write final
product specs yet.
```

Docs/spec trajectory passes:

| Trajectory | Question | Output |
|---|---|---|
| Source identity | Where did this fact come from and how fresh is it? | source record |
| Entity mapping | What requirement, scenario, persona, journey, decision, file, or evidence node exists? | source-context schema |
| Relationship mapping | What depends on, conflicts with, supersedes, validates, or implements this fact? | relationship set |
| Evidence maturity | Is it observed, user-provided, inferred, weak, validated, or blocked? | confidence state |
| Current/superseded | What changed, and what remains historical? | lifecycle row |
| Contradiction | Which sources disagree and who owns resolution? | conflict packet |
| Acceptance | What behavior proves this requirement? | scenario or check |
| Implementation bridge | Which code/docs/work lanes are touched? | plan-ready packet |
| Closeout promotion | Which facts deserve tracked docs, backlog, report-only, or no write? | Doc Routing Decision Matrix |

Ontology candidates:

- `Source`, `Spec`, `Requirement`, `Scenario`, `Persona`, `Journey`,
  `DesignRule`, `BrandRule`, `MarketEvidence`, `Decision`, `WorkLane`,
  `CodeArtifact`, `ValidationEvidence`, `BacklogCandidate`, `GlossaryTerm`.
- Relationships: `DERIVED_FROM`, `IMPLEMENTS`, `VALIDATED_BY`, `CONFLICTS_WITH`,
  `SUPERSEDES`, `DEPENDS_ON`, `AFFECTS`, `ROUTES_TO`, `OWNED_BY`,
  `MENTIONS`, `BLOCKED_BY`.

Template candidates:

- docs/spec source inventory;
- source-context query packet;
- synthesis-to-spec evidence packet;
- requirement trajectory matrix;
- contradiction packet;
- current/superseded decision row;
- implementation-readiness packet;
- closeout source promotion packet.

## SKILL-01: Skill And Task Updates

Prompt:

```text
You are the Agent Engineer. Convert the approved findings from AS-01, CTX-01,
and DOC-01 into skill updates. For each candidate skill, define trigger,
anti-trigger, source order, outputs, templates, checklists, scripts, validators,
eval prompts, owning agent, and collisions with existing skills. Do not create
overlapping skills when an existing skill already owns the route.
```

Skill decisions:

| Skill | Owner | Decision | Purpose |
|---|---|---|---|
| `agent-workflow-builder` | agent-engineer | create | compose agent-call packets from goals, prompts, skills, checklists, validation, and handoff rules |
| `synthesis-to-spec` | business-analyst | update | synthesize source-context and research evidence into plan-ready packets |
| `compose-spec` | business-analyst/designer/project-onboarder | update | author durable specs from approved trajectory-backed source material |
| `docs-impact-map` | shared | keep/update as needed | run cross-folder dependency and trajectory coverage checks |

Deferred skills:

- Do not create source-context or retrieval-specific skills until a concrete
  repeated workflow proves the existing `context`, `docs-impact-map`,
  `synthesis-to-spec`, and `compose-spec` routes are not enough.

Artifact rules:

- Use templates when missing fields would make synthesis unreliable.
- Use checklists when review steps recur independently.
- Use scripts only for deterministic validation, inventories, hashes, packet
  schema checks, or stale-reference scans.
- Add validators for mechanical invariants, not judgment calls.

## VAL-01: Validators, Hooks, And Evals

Prompt:

```text
You are the Agent Engineer. Design enforcement for the selected workflow. Decide
which rules belong in validators, hooks, scripts, templates, skill text, or
agent checklists. Include eval prompts for skill selection and workflow-packet
quality. Do not activate live hooks without explicit approval.
```

Validator candidates:

- every skill named by an agent exists;
- every agent-scoped checklist referenced by an agent exists;
- every workflow packet names real agents, skills, source paths, output
  artifacts, validation, and stop rules;
- every source-context packet has source identity and freshness state;
- no retrieval/cache layer is described as authoritative over tracked docs/code;
- no skill move leaves stale references in docs, config, or validators.

Hook candidates:

- post-edit stale-source marker for source-context inventories;
- pre-subagent-start packet validator;
- closeout validator that checks source-to-work-to-validation coverage.

Eval prompts:

- user asks for an agent workflow from a fuzzy plan;
- user asks for product research that should route to docs/spec synthesis;
- user asks a code architecture question that should start with exact source
  reads and `rg` before broader retrieval;
- user asks about an evolving decision with conflicting docs;
- user asks to move a shared skill into one agent folder;
- user asks to activate external retrieval without approval details.

## Merge Contract

Merge owner: `orchestrator`

Merge inputs:

- AS-01 topology matrix;
- AS-02 compatibility proof;
- CTX-01 source-context lifecycle design;
- DOC-01 synthesis trajectory report;
- SKILL-01 skill updates;
- VAL-01 enforcement plan.

Final merged output:

- recommended skill layout decision;
- source-context architecture decision;
- docs/spec synthesis skill set and templates;
- implementation sequence with rollback;
- validator/hook/eval backlog;
- explicit approval points for hooks, MCP config, external retrieval, and file
  migration.

## Initial Recommendation

Do not move reusable skills into per-agent folders yet. The best near-term
shape is:

- central reusable skills remain under `.codex/skills/`;
- per-agent folders own role contracts, skill maps, role checklists, and
  role-specific agent-call packet examples;
- `agent-workflow-builder` owns workflow packet composition;
- existing `synthesis-to-spec`, `compose-spec`, and `docs-impact-map` own
  docs/spec trajectory analysis and durable source promotion;
- a later compatibility lane may create a Codex-native mirror/package layout if
  the official discovery path requires it.
