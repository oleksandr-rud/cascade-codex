# Work Lane: W-014 App Stack Migration

Status: `COMPLETE`
Owner: `agent-engineer`
Created: 2026-07-28
Lane Model: `parallel-sectioning`
Next Gate: `none`

## Request

Migrate the application-technology selection branch to the simpler
`app-stack` family while preserving its policy, contour, candidate, archetype,
and scaffold behavior.

## Acceptance Criteria

- Six new graph/spec pairs exist: `app-stack`, `backend-stack`,
  `frontend-stack`, `native-stack`, `cli-stack`, and `experiment-stack`.
- The new pairs preserve all 11 current application-router decisions, all
  child decision IDs, all nodes, edges, candidate IDs, and validation rules.
- Every child extends `app-stack`; every `preserves` reference uses the new
  parent prefix; compatibility relationships use new application and
  infrastructure IDs.
- The five scaffold profiles reference the new pair IDs but retain the same
  profile IDs, technology node IDs, templates, safety rules, and 71 output
  paths.
- This lane does not delete old pairs or edit shared packs, indexes, skills,
  top-level docs, the shared validator, or simulation files.

## Scope

In:

- the six replacement application-stack graph/spec pairs;
- scaffold pair metadata and generated `ARCHITECTURE.md` adoption wording;
- scaffold generator required-pair validation.

Out:

- infrastructure graph migration;
- candidate additions or technology recommendations;
- scaffold path, template, overwrite, install, or command behavior changes;
- canonical old-pair deletion and repository-wide routing changes.

## Concrete Change Inventory

| Operation | Count | Paths |
|---|---:|---|
| Create | 12 | `app-stack`, `backend-stack`, `frontend-stack`, `native-stack`, `cli-stack`, and `experiment-stack`, each as graph/spec |
| Modify | 1 | `docs/patterns/architecture-defaults/architecture-scaffold-profiles.json` |
| Modify | 1 | `scripts/scaffold_architecture_default.py` |
| Delete | 0 | W-013 removes the 12 superseded app-branch files after readiness |

Required edits are limited to pair identity, same-stem paths, relationship
prefixes/targets, titles and routing prose, scaffold `pair_ids`, generated
adoption text, and generator required-pair checks. Descriptive uses of
“technology” remain valid where they describe runtimes, frameworks, libraries,
or candidate evidence rather than a pair ID.

### Preservation Snapshot

The WG-002-N10 comparison must prove equality for:

- all 11 app-router decision IDs;
- every child decision, node, edge, candidate ID, and validation obligation;
- graph kind and archetype requirements;
- five scaffold profile IDs and `technology_node` candidate IDs;
- every file template, safety rule, and rendered path.

## Source Inputs

| Source | Path Or Tool | Why Needed | Freshness / Confidence |
|---|---|---|---|
| Rename contract | W-013 and WG-002-N01 | exact IDs and ownership | current completed gate |
| Current app pairs | `technology-selection`, `*-technology` graph/spec pairs | semantic source to preserve | current |
| Scaffold manifest | `architecture-scaffold-profiles.json` | five profiles and 71-path contract | current |
| Scaffold generator | `scripts/scaffold_architecture_default.py` | required-pair checks and safe rendering | current |

## Behavior Examples

| ID | Example | Expected Evidence | Status |
|---|---|---|---|
| `APS-001` | Given a backend service unit, when app-stack routes it, then `backend-stack` owns the same Bun/Hono, Go, and Python/FastAPI candidate nodes. | graph comparison | `PASS` |
| `APS-002` | Given a web unit, when app-stack routes it, then `frontend-stack` preserves rendering, state, UI, realtime, and proof decisions. | graph/spec marker comparison | `PASS` |
| `APS-003` | Given any source profile preview, when pair metadata is renamed, then its rendered path set and file count are unchanged. | before/after preview manifest | `PASS` |
| `APS-004` | Given the generator receives an old or missing app-stack pair, when it validates the profile, then it fails closed. | negative self-test | `PASS` |

## Feature Impact Matrix

| Feature / Flow | Source Docs Or Spec IDs | Code Areas / Public Contracts | Touched Directly? | Protected Adjacent Behavior | Required Check | Status | Route |
|---|---|---|---|---|---|---|---|
| Application contour routing | six current app technology pairs | new app-stack pairs | yes | same app types and candidates | structural snapshot comparison | `PASS` | `implement-change` |
| Backend source profiles | backend Bun/Go/FastAPI | manifest and generator | yes | vertical slices, startup, and shared libs | three profile previews | `PASS` | `functional-qa` |
| Frontend source profiles | React/Vite and Next.js | manifest and generator | yes | feature slices and shared platform paths | two profile previews | `PASS` | `functional-qa` |
| Infrastructure selection | W-015 | infrastructure pairs | no | independent resource selection | no out-of-scope diff | `PASS` | `review-change` |

## File Ownership

| Path Or Area | Owner | Access | Notes |
|---|---|---|---|
| `app-stack.{graph.yaml,spec.md}` | W-014 | write | new parent pair |
| `backend-stack`, `frontend-stack`, `native-stack`, `cli-stack`, `experiment-stack` pairs | W-014 | write | new child pairs |
| `architecture-scaffold-profiles.json` | W-014 | write | pair metadata and adoption text only |
| `scripts/scaffold_architecture_default.py` | W-014 | write | required-pair names only |
| current old-name pairs | W-013 | read only | W-013 deletes after merge readiness |
| packs, index, shared validator, top-level docs | W-016/W-013 | read only | no shared write |

## Tool And MCP Context

| Tool Or MCP | Use | Permission / Approval | Result Handling |
|---|---|---|---|
| scaffold generator | preview, validate, and self-test | local only; write mode not needed | profile counts and path manifests |
| external technology docs | none | not needed for a semantic rename | no external state |

## Plan

1. Copy the six current graph/spec contracts to the replacement pair stems.
2. Change pair IDs, spec paths, titles where needed, relationship prefixes, and
   textual routing names without changing decision or candidate semantics.
3. Update scaffold pair IDs and adoption text.
4. Update generator validation from the old parent/child IDs to the new IDs.
5. Compare nodes, edges, decisions, validation obligations, profile IDs,
   templates, and rendered path manifests against the baseline.
6. Hand W-013 a 14-file receipt: 12 created pair files, 2 modified scaffold
   files, zero deletions, and all preservation results.

## Parallel Dependencies

- Can run with: W-015 and W-016 after WG-002-N01.
- Must wait for: W-013 rename and exclusive-write contract.
- Conflicts with: W-013 deletion/integration before this lane is
  `READY_TO_MERGE`; any other scaffold manifest or generator edit.

## Handoff And Merge Contract

- Handoff summary: six replacement pairs, scaffold metadata diff, structural
  comparison, and path-manifest comparison.
- Required output: W-014-owned files only.
- Merge owner: W-013.
- Merge target: WG-002-N20 direct cutover.
- Evidence to preserve: pair decision/node snapshots and five scaffold preview
  manifests.
- Stop condition: any candidate, decision, template, safety rule, or output
  path changes beyond naming.

## Validation

| Check | Command Or Evidence | Status |
|---|---|---|
| Scaffold manifest | `python3 scripts/scaffold_architecture_default.py validate` | `PASS` |
| Scaffold safety and count | `python3 scripts/scaffold_architecture_default.py self-test` | `PASS` |
| Five profile previews | `preview` for each profile with fixed sample names | `PASS` |
| App pair preservation | before/after normalized graph comparison | `PASS` |

## Closeout

- Merge evidence: WG-002-N10 and WG-002-N11 passed; all six app-stack graph/spec
  pairs match the normalized baseline, five profile previews preserve all 71
  paths, and the old manifest fails closed because it lacks `app-stack`.
- Report: `docs/work/reports/2026-07-28-stack-naming-work-graph.md`.
- Remaining risk: candidate `technology_node` IDs remain public scaffold
  references and were intentionally unchanged.
