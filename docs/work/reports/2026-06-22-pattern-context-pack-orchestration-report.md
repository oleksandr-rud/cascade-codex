# Pattern Context Pack And Orchestration Report

Date: 2026-06-22
Status: current

## Scope

This report covers the recent PR baseline, current skills and agents
orchestration tree, onboarding routes into memory and patterns, and the new
pattern context-pack system.

User correction applied: `summary`, `routing`, and `refs` are not separate YAML
sidecars. They are top-level sections inside each `*.pack.yaml` context-pack
file.

## Recent PR Analysis

Latest merged PR:

| Field | Value |
|---|---|
| Merge commit | `4e1fe3a` |
| PR | `#8` |
| Branch | `oleksandr-rud/agent/resolve-spec-source-folder` |
| Topic | Resolve harness issue in spec source folder |
| Base before merge | `299898f` |
| PR commit | `48f106b` |

PR #8 was narrow and coherent. It renamed the preserved source-spec folder from
the old incoming-spec name to `docs/specs/source/`, added
`.codex/skills/ingest-spec/templates/source-packet.md`, updated docs and
config paths, and extended stale-path validation for the old incoming/spec
terms.

Impact on this task: the PR established the current source-spec convention and
made the validator stricter about stale path names. The pattern-pack work keeps
that direction: deterministic folder shape, explicit source routing, and
validator-backed invariants.

## Orchestration Tree

Top-level boot and routing:

```text
AGENTS.md
  -> CODEX.md
  -> relevant .codex/skills/{skill}/SKILL.md
  -> relevant .codex/agents/{agent}/AGENT.md
  -> docs/structure.md, docs/patterns/, docs/work/, docs/specs/, docs/glossary.md
  -> scripts/validate_cascade_codex.py
```

Canonical non-atomic route:

```text
context
-> ingest-spec / discover / market-validation / synthesis-to-spec / compose-spec when needed
-> docs-impact-map
-> pattern-context when reusable pattern packs are needed
-> orchestrate-work
-> plan-change
-> functional-qa
-> implement-change
-> review-change
-> validate-change
-> test-autorepair only if tests are stale
-> closeout
```

Role tree:

| Agent | Owns | Key pattern/memory wiring |
|---|---|---|
| `orchestrator` | Normal route coordination and workflow-packet routing | Uses `pattern-context` after `docs-impact-map` when reusable pattern entries or packs are involved. |
| `project-onboarder` | New-repo setup and harness adaptation | Uses `adapt-harness`, `docs-impact-map`, and `pattern-context` before writing bounded pattern entries. |
| `agent-engineer` | Harness, skill, agent, source-context, prompt/runtime, observability, eval design | Owns pattern-pack and validator maintenance with `codex-maintenance` and `pattern-context`. |
| `business-analyst` | Market and product research lanes, evidence synthesis, spec handoff | Can retrieve pattern memory and route durable research/context lessons through `pattern-context`. |
| `security` | Security-sensitive review and validation planning | Can consume boundary/testing packs and create target-project security entries only when evidence exists. |
| `designer` | UX, accessibility, visual validation, design-system routing | Can consume testing/context packs when reusable validation or design-context rules are needed. |

## Pattern Context Pack System

Pattern memory now uses first-level entry folders under `docs/patterns/`.

Current entries:

| Entry | Markdown body | Context pack |
|---|---|---|
| `workflow` | `docs/patterns/workflow/index.md` | `docs/patterns/workflow/workflow.pack.yaml` |
| `boundaries` | `docs/patterns/boundaries/index.md` | `docs/patterns/boundaries/boundaries.pack.yaml` |
| `testing` | `docs/patterns/testing/index.md` | `docs/patterns/testing/testing.pack.yaml` |
| `context-memory` | `docs/patterns/context-memory/index.md` | `docs/patterns/context-memory/context-memory.pack.yaml` |

Required entry shape:

```text
docs/patterns/{entry}/
  index.md
  *.pack.yaml
```

Required pack shape:

```yaml
pack_id: <id>
entry_id: <entry>
title: <title>
status: active
owner: <owner>
summary: <short summary>
routing:
  use_when: []
  do_not_use_when: []
  load_when: []
  write_when: []
  defer_when: []
  primary_skills: []
  related_roles: []
refs: []
parts: []
```

The schema note lives at `docs/patterns/context-pack-schema.yaml`. The
validator rejects `summary.yaml`, `routing.yaml`, and `refs.yaml` sidecars so
the model stays consolidated.

## Google Knowledge Catalog Research

Official Google sources checked:

| Source | Relevance |
|---|---|
| `https://cloud.google.com/dataplex/docs` | Knowledge Catalog landing page and product rename notice. |
| `https://cloud.google.com/dataplex/docs/introduction` | Overview, rename context, and core concepts. |
| `https://cloud.google.com/dataplex/docs/catalog-overview` | Metadata model terminology and constraints. |
| `https://cloud.google.com/dataplex/docs/ingest-custom-sources` | Entry group, entry type, and entry creation workflow. |
| `https://cloud.google.com/dataplex/docs/enrich-entries-metadata` | Aspect and aspect-type workflow. |
| `https://cloud.google.com/dataplex/docs/reference/rest/v1/projects.locations.aspectTypes` | `AspectType` REST JSON shape. |
| `https://cloud.google.com/dataplex/docs/reference/rest/v1/projects.locations.entryTypes` | `EntryType` REST JSON shape. |
| `https://cloud.google.com/dataplex/docs/reference/rest/v1/projects.locations.entryGroups` | `EntryGroup` REST JSON shape. |
| `https://cloud.google.com/dataplex/docs/reference/rest/v1/projects.locations.entryGroups.entries` | `Entry` REST JSON shape. |
| `https://cloud.google.com/dataplex/docs/reference/rest/v1/Aspect` | `Aspect` REST JSON shape. |

Findings:

- Google renamed Dataplex Universal Catalog to Knowledge Catalog on
  2026-04-10. The docs state that API, client library, CLI, and IAM names
  remain unchanged, so official resource paths still use `dataplex`.
- Knowledge Catalog does not publish a first-class "YAML pack" file structure
  for catalog content. The official object model is REST/JSON. The guide
  examples use JSON payload files such as `payload.json` and aspect JSON files.
- The Google catalog model is:
  `entry group -> entry type -> entry -> aspects`, with `aspect type` as the
  reusable template for an aspect. Entry links model relationships between
  entries.
- Google's custom-source workflow is structurally close to our pattern folders:
  create an entry group as the container, define an entry type as the schema,
  then create entries as records inside that container.
- Google stores aspects inside entries or entry links, not as standalone
  resources. This supports our correction that `summary`, `routing`, and
  `refs` belong inside the context-pack YAML instead of separate sidecar YAML
  files.

Google REST field mapping:

| Google concept | Key fields | Cascade pattern-pack analogue |
|---|---|---|
| `EntryGroup` | `name`, `uid`, `description`, `displayName`, `labels` | `docs/patterns/{entry}/` folder plus entry metadata. |
| `EntryType` | `name`, `description`, `displayName`, `labels`, `requiredAspects` | Pack schema requiring summary, routing, refs, and parts. |
| `AspectType` | `name`, `description`, `displayName`, `labels`, `metadataTemplate` | Reusable shape for pack sections such as routing or part metadata. |
| `Entry` | `name`, `entryType`, `aspects`, `parentEntry`, `fullyQualifiedName`, `entrySource` | Markdown source plus its pack-level references. |
| `Aspect` | `aspectType`, `path`, `data`, `aspectSource` | Embedded YAML sections, especially `summary`, `routing`, `refs`, and part descriptors. |

Implication for Cascade:

```yaml
pack_id: api-security
entry_id: security
title: API Security
summary: ...
description: ...
routing:
  use_when: []
  do_not_use_when: []
  load_when: []
  write_when: []
  defer_when: []
  primary_skills: []
  related_roles: []
refs:
  - source: docs/patterns/security/auth.md
    paths: []
selection_rules:
  include_when: []
  exclude_when: []
parts:
  - id: jwt-requirements
    title: JWT Requirements
    source: docs/patterns/security/auth.md
    summary: ...
    routing:
      use_when: []
      keywords: []
      tags: []
```

This is not a Google import/export schema. It is a local YAML serialization
that borrows the useful Knowledge Catalog pattern: one container, reusable
schema, embedded metadata aspects, and explicit references to source records.

## Spec Path Branch Check

Current visible branches:

| Branch | Commit | Relevant state |
|---|---|---|
| `master` | `4e1fe3a` | Merge commit for PR #8. Contains both `299898f` and `48f106b`. |
| `origin/master` | `4e1fe3a` | Same as local `master`. |
| `origin/agent/resolve-spec-source-folder` | `48f106b` | PR branch that resolved the source-folder naming issue. |
| `ai-experiments` | `9d4e72d` | Predates `299898f`; does not contain the final transformed-path cleanup. |

Path history:

| Commit | Branch containment | What changed |
|---|---|---|
| `299898f` | `master`, `origin/master`, `origin/agent/resolve-spec-source-folder` | Main cleanup away from the legacy transformed specs folder; renamed the legacy transformed spec templates to `spec-packet.md`; moved durable spec guidance toward per-slice `docs/specs/{slice-slug}/` packets and source material under `docs/specs/source/`. |
| `48f106b` | `master`, `origin/master`, `origin/agent/resolve-spec-source-folder` | PR #8 branch cleanup from old incoming/source naming to `docs/specs/source/`; added `source-packet.md`; tightened validator checks. |
| `9d4e72d` | `ai-experiments` only | Local branch before the final cleanup; likely contains stale transformed/incoming path references if checked out. |

Commands used:

```bash
git branch --all --verbose --no-abbrev
git log --all --oneline --decorate --name-status -S'<legacy transformed specs folder>' -- .
git log --all --oneline --decorate --name-status -G'<legacy spec path and template names>' -- .
git branch --all --contains 299898f
git branch --all --contains 48f106b
git merge-base --is-ancestor 299898f ai-experiments
```

Result: the branch currently visible as directly related to the latest source
folder PR is `origin/agent/resolve-spec-source-folder`. The broader
legacy transformed specs folder removal happened in `299898f`, now part of
`master` history rather than a separate active branch.

## Retrieval And Prompt Assembly

Builder script:

```bash
python3 scripts/build_pattern_context_pack.py --list-packs
python3 scripts/build_pattern_context_pack.py --pack workflow-core --part doc-routing-decision-matrix
python3 scripts/build_pattern_context_pack.py --pack context-memory-core --tag retrieval --summary-only
```

Supported selection parameters:

| Parameter | Purpose |
|---|---|
| `--pack` | Select by pack ID, file stem, or path. |
| `--entry` | Select all packs under a pattern entry folder. |
| `--part` | Include specific part IDs. |
| `--tag` | Include parts with matching tags. |
| `--query` | Match part ID, title, summary, routing description, or tags. |
| `--summary-only` | Emit metadata and selected part summaries without Markdown bodies. |

Pack summaries and refs are selection metadata. Agents still load the referenced
Markdown section before making durable planning, validation, or closeout
decisions.

## Onboarding Wiring

Onboarding now routes pattern memory through `pattern-context`:

- `adapt-harness` source order includes `docs/patterns/_index.md`,
  `.codex/skills/pattern-context/SKILL.md`, and
  `scripts/build_pattern_context_pack.py`.
- `project-onboarder` uses `pattern-context` when onboarding writes or retrieves
  pattern entry folders or context packs.
- Deep onboarding templates and checklists include `pattern-context` in
  architecture, security/data, functional acceptance, and context-memory phases.
- Broad security/backend/frontend/memory dump folders remain disallowed.
  Target-project security entries are allowed only when source evidence exists
  and the entry has `index.md` plus pack YAML with summary, routing, refs, and
  parts.

Security example status: not added to the harness. A future target project may
create a bounded `docs/patterns/security/` entry with files such as `auth.md`,
`rbac.md`, `validation.md`, or `soc2.md` only after real project evidence
exists and a security pack references the needed parts.

## Files And Validators

New durable surfaces:

| Surface | Purpose |
|---|---|
| `.codex/skills/pattern-context/SKILL.md` | Skill for pattern entry creation, retrieval, and pack compilation. |
| `scripts/build_pattern_context_pack.py` | Stdlib-only pack preview builder. |
| `docs/patterns/context-pack-schema.yaml` | Pack schema notes. |
| `docs/patterns/*/*.pack.yaml` | Context-pack metadata and selected Markdown references. |

Validator updates:

- registers `pattern-context` as skill 37;
- requires core pattern entries and pack files;
- requires pack keys: `pack_id`, `entry_id`, `title`, `status`, `owner`,
  `summary`, `routing`, `refs`, and `parts`;
- validates pack `source:` and `path:` references;
- rejects `summary.yaml`, `routing.yaml`, and `refs.yaml` sidecars;
- allows first-level `docs/patterns/{entry}/` folders with no deeper folders.

## Validation Evidence

Commands run:

| Command | Result |
|---|---|
| `python3 scripts/build_pattern_context_pack.py --list-packs` | PASS; listed 4 packs. |
| `python3 scripts/build_pattern_context_pack.py --pack workflow-core --part doc-routing-decision-matrix` | PASS; compiled selected Markdown section. |
| `python3 scripts/build_pattern_context_pack.py --pack boundary-core --tag api --summary-only` | PASS; selected API/public-contract part. |
| `python3 scripts/build_pattern_context_pack.py --entry testing --query stale --summary-only` | PASS; selected stale-test repair part. |
| `python3 scripts/validate_cascade_codex.py` | PASS; `agents=6`, `skills=37`, `project_specific_leakage=0`, `standalone_qa_refs=0`. |

## Residual Notes

- `python` is not available in this environment; active validation references
  now use `python3`.
- The previously untracked
  `docs/work/reports/2026-06-20-ai-experiments-perceptron-neural-visual-research-workflow.md`
  blocked validation with stale paths and standalone review wording, so it was
  minimally normalized.
