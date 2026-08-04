# Work Lane: W-016 Stack Retrieval And Documentation Migration

Status: `COMPLETE`
Owner: `agent-engineer`
Created: 2026-07-28
Lane Model: `parallel-sectioning`
Next Gate: `none`

## Request

Move every retrieval, routing, skill, glossary, and human-facing architecture
consumer to the simpler `app-stack` and `infrastructure` vocabulary.

## Acceptance Criteria

- Both architecture context packs point to the replacement pair paths, section
  IDs, tags, descriptions, and routing names.
- Architecture review and target adaptation route application choices through
  `app-stack` and infrastructure resources through `infrastructure`.
- The architecture index, README, CODEX bridge, glossary, structure map, and
  current architecture report describe one canonical selection tree.
- `stack-selection` remains the parent authority, and frontend still uses its
  dedicated retrieval pack.
- Historical migration records may name old IDs only inside explicit rename
  maps; canonical docs and routing contain no old selection IDs.
- This lane does not edit graph/spec authority, scaffold implementation, shared
  validator sets, active work state, or simulation files.

## Scope

In:

- general and frontend architecture pack YAML;
- architecture review and adapt-harness skill routing;
- architecture index and stack-selection spec routing text;
- README, CODEX, glossary, structure map, and current architecture report.

Out:

- graph IDs, graph relationships, decision IDs, or scaffold files;
- shared validator code;
- work-lane registry and final validation status;
- rewriting unrelated architecture terminology.

## Concrete Change Inventory

W-016 modifies exactly 11 canonical consumer files:

| Consumer class | Count | Paths |
|---|---:|---|
| Retrieval packs | 2 | `architecture-defaults.pack.yaml`; `frontend-architecture-defaults.pack.yaml` |
| Routing skills | 2 | `.codex/skills/architecture-review/SKILL.md`; `.codex/skills/adapt-harness/SKILL.md` |
| Pattern authority | 2 | architecture-defaults `index.md`; `stack-selection.spec.md` |
| Public discovery | 4 | `README.md`; `CODEX.md`; `docs/glossary.md`; `docs/structure.md` |
| Current implementation report | 1 | `docs/work/reports/2026-07-27-architecture-selection-and-frontend-defaults.md` |

This is a reference migration, not a global vocabulary replacement. Keep
“technology” when it describes concrete runtimes, frameworks, libraries, or
selection evidence. Replace only pair IDs, pair paths, section IDs, routing
names, composition trees, and statements that assign authority to an old pair.

### Pack Refactoring Checklist

- update document paths for all seven replacement pairs;
- update section IDs and summaries without changing section anchors unless the
  paired spec heading changes;
- preserve graph/spec co-loading and selective retrieval;
- preserve the dedicated frontend pack boundary;
- keep application and infrastructure selections independent;
- reject missing, duplicate, or stale pair paths.

## Source Inputs

| Source | Path Or Tool | Why Needed | Freshness / Confidence |
|---|---|---|---|
| Rename contract | W-013 and WG-002-N01 | exact canonical vocabulary | current completed gate |
| Pack contract | both architecture pack YAML files | retrieval paths and section IDs | current |
| Routing skills | architecture-review and adapt-harness | agent selection flow | current |
| Owner docs | index, README, CODEX, glossary, structure | human and harness discovery | current |
| Current report | 2026-07-27 architecture report | current implemented-state narrative | current |

## Behavior Examples

| ID | Example | Expected Evidence | Status |
|---|---|---|---|
| `RTD-001` | Given a backend stack query, when the general pack is previewed, then it returns `app-stack` and `backend-stack` graph/spec context. | pack preview | `PASS` |
| `RTD-002` | Given a frontend stack query, when the frontend pack is previewed, then it returns `app-stack`, `frontend-stack`, and justified frontend policies without backend catalogs. | frontend pack preview | `PASS` |
| `RTD-003` | Given architecture-review routes a multi-app project, when it selects extensions, then app and infrastructure choices remain independent. | skill text and validator markers | `PASS` |
| `RTD-004` | Given a reader opens the glossary or index, when they inspect the tree, then only the canonical simplified names appear. | scoped old-ID absence check | `PASS` |

## Feature Impact Matrix

| Feature / Flow | Source Docs Or Spec IDs | Code Areas / Public Contracts | Touched Directly? | Protected Adjacent Behavior | Required Check | Status | Route |
|---|---|---|---|---|---|---|---|
| General retrieval | architecture-defaults pack | pack paths and sections | yes | selective loading and graph/spec pairing | pack preview | `PASS` | `implement-change` |
| Frontend retrieval | frontend pack | frontend paths and sections | yes | frontend-only routing | frontend preview | `PASS` | `functional-qa` |
| Agent routing | two skills | selection instructions | yes | architecture before stack; app/infra separation | harness catalog/self-test | `PASS` | `validate-change` |
| Human discovery | README, CODEX, glossary, structure, index | public docs | yes | same semantics and pair count | link and marker validation | `PASS` | `review-change` |

## File Ownership

| Path Or Area | Owner | Access | Notes |
|---|---|---|---|
| both architecture `*.pack.yaml` files | W-016 | write | paths, section IDs, tags, and wording |
| architecture index and `stack-selection.spec.md` | W-016 | write | canonical composition tree |
| `.codex/skills/architecture-review/SKILL.md` | W-016 | write | stack routing |
| `.codex/skills/adapt-harness/SKILL.md` | W-016 | write | onboarding routing |
| `README.md`, `CODEX.md`, `docs/glossary.md`, `docs/structure.md` | W-016 | write | discovery vocabulary |
| current architecture selection report | W-016 | write | current-state terminology and migration note |
| graph/spec pairs, scaffold files, shared validator | W-014/W-015/W-013 | read only | no authority edits |

## Tool And MCP Context

| Tool Or MCP | Use | Permission / Approval | Result Handling |
|---|---|---|---|
| pattern context pack builder | preview general and frontend retrieval | local execute | selected paths and sections |
| harness evaluator | catalog and self-test after skill changes | local execute | exact counts and digest |
| external connectors | none | forbidden for this lane | no external state |

## Plan

1. Rewrite both pack document paths, section IDs, descriptions, tags, routing,
   and selection rules.
2. Rewrite the architecture index and stack-selection extension tree.
3. Rewrite skill routing without changing architecture-before-stack or
   independent-infrastructure rules.
4. Update top-level discovery docs, glossary entries, structure paths, and the
   current architecture report.
5. Preview backend/general and frontend-specific queries.
6. Produce an 11-file receipt, two pack previews, harness results, and a scoped
   canonical-doc old-ID absence result for W-013.

## Parallel Dependencies

- Can run with: W-014 and W-015 after WG-002-N01.
- Must wait for: exact replacement filenames and section-ID convention.
- Conflicts with: concurrent edits to either pack, the architecture index, the
  two routing skills, or the named public docs.

## Handoff And Merge Contract

- Handoff summary: changed consumer inventory, pack previews, old-ID absence
  result, and exact source identity.
- Required output: W-016-owned files only.
- Merge owner: W-013.
- Merge target: WG-002-N20 direct cutover.
- Evidence to preserve: pack output paths/sections and harness catalog result.
- Stop condition: a pack resolves an old path, loads a missing pair, duplicates
  frontend/backend scope, or loses graph/spec pairing.

## Validation

| Check | Command Or Evidence | Status |
|---|---|---|
| General pack preview | `build_pattern_context_pack.py --pack architecture-defaults` with app-stack query | `PASS` |
| Frontend pack preview | `build_pattern_context_pack.py --pack frontend-architecture-defaults` with frontend-stack query | `PASS` |
| Harness skill catalog | `python3 scripts/run_harness_evals.py catalog --check` | `PASS` |
| Harness self-test | `python3 scripts/run_harness_evals.py self-test` | `PASS` |

## Closeout

- Merge evidence: WG-002-N14 passed; app-stack, backend-stack, and frontend-stack
  pack previews resolve paired files, canonical docs contain no superseded
  pair IDs, and the 319-scenario catalog plus 15-case harness self-test pass.
- Report: `docs/work/reports/2026-07-28-stack-naming-work-graph.md`.
- Remaining risk: pack section IDs are retrieval contracts and now use the
  direct-cutover names without compatibility aliases.
