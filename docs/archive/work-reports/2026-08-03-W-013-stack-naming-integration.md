# Work Lane: W-013 Stack Naming Integration

Status: `COMPLETE`
Owner: `agent-engineer`
Created: 2026-07-28
Lane Model: `parallel-sectioning`
Next Gate: `none`

## Request

Replace the architecture-default selection branches with simpler application
stack and infrastructure names, coordinate disjoint implementation worklines,
and perform one direct canonical cutover without aliases or duplicate
authorities.

## Acceptance Criteria

- The canonical rename map is frozen before section work begins:
  `technology-selection` -> `app-stack`, `backend-technology` ->
  `backend-stack`, `frontend-technology` -> `frontend-stack`,
  `native-technology` -> `native-stack`, `cli-technology` -> `cli-stack`,
  `experiment-technology` -> `experiment-stack`, and
  `infrastructure-selection` -> `infrastructure`.
- `stack-selection` and the four `infrastructure-*` child IDs remain unchanged.
- All existing nodes, edges, decisions, candidate IDs, archetype relationships,
  validation obligations, and source-profile outputs are preserved unless the
  migration report explicitly records a reviewed correction.
- W-014, W-015, and W-016 write only their owned files and hand off exact source
  identities before integration.
- The final source has no compatibility aliases, duplicate old/new graph
  pairs, or old IDs in canonical runtime, routing, pattern, scaffold, or
  validator authorities.
- Existing W-004 through W-010 and W-012 simulation work remains untouched.

## Scope

In:

- fixed-point inventory and migration contract;
- shared architecture pair registry and preserved-decision validator cutover;
- deterministic merge of W-014, W-015, and W-016 outputs;
- removal of the seven superseded graph/spec pairs after all consumers move;
- routing failures back to the owning workline.

Out:

- changing stack-selection semantics or evidence-record fields;
- changing candidate technologies, infrastructure choices, or archetype
  structures;
- simulation campaign implementation;
- compatibility shims, deprecated aliases, or dual old/new catalogs.

## Concrete Change Inventory

The canonical migration contains 46 source operations. W-013 owns the
serialized integration portion and accepts the remaining operations only
through section receipts.

| Operation | Count | Owner | Exact scope |
|---|---:|---|---|
| Create replacement pair files | 14 | W-014 and W-015 | six app-stack graph/spec pairs plus one infrastructure graph/spec pair |
| Modify canonical consumers | 18 | W-013 through W-016 | validator, scaffold metadata/generator, four infrastructure child graphs, two packs, two skills, and seven current docs |
| Delete superseded pair files | 14 | W-013 | seven old graph/spec pairs after `WG-002-GB` |
| Update closeout evidence | 3 | W-017 | active registry, report index, and this work-graph report |

W-013 directly modifies only `scripts/validate_cascade_codex.py` and deletes
the 14 superseded pair files. It must not absorb fixes from section owners
during integration.

### Required Section Receipts

| Receipt | Required contents |
|---|---|
| W-014 / WG-002-N11 | 12 created pair files, 2 modified scaffold files, normalized pair comparison, five preview manifests, and 71-path equality |
| W-015 / WG-002-N13 | 2 created root files, 4 modified child graphs, root/child comparison, evidence-file byte digests, and evidence self-test |
| W-016 / WG-002-N14 | 11 modified retrieval/routing/doc files, two pack previews, harness checks, and canonical-doc old-ID search |

## Source Inputs

| Source | Path Or Tool | Why Needed | Freshness / Confidence |
|---|---|---|---|
| Request | current naming and workline request | canonical desired vocabulary | current |
| Pair contract | `docs/patterns/architecture-defaults/index.md` | stable-ID and direct-migration rules | current |
| Graph authority | `docs/patterns/architecture-defaults/*.graph.yaml` | nodes, decisions, relationships, and preservation | current |
| Validator | `scripts/validate_cascade_codex.py` | required pair IDs, kinds, decisions, markers, and scaffold links | current |
| Active work | `docs/work/active.md` | shared-checkout conflicts and open simulation lanes | current |
| Graph plan | `docs/work/reports/2026-07-28-stack-naming-work-graph.md` | nodes, waves, gates, and invalidation | current authored plan |

## Behavior Examples

| ID | Example | Expected Evidence | Status |
|---|---|---|---|
| `ASN-001` | Given the current 26-pair catalog, when the migration integrates, then the catalog still contains 26 valid pairs with seven replacement IDs. | pair catalog and validator result | `PASS` |
| `ASN-002` | Given a preserved child decision reference, when its parent pair is renamed, then only the pair prefix changes and the decision ID still resolves. | preservation-matrix check | `PASS` |
| `ASN-003` | Given an old pair path or ID in a canonical consumer, when integration validation runs, then the cutover fails. | scoped old-ID absence check | `PASS` |
| `ASN-004` | Given W-014, W-015, or W-016 is incomplete, when integration is attempted, then old pairs are not deleted and `WG-002-GC` remains blocked. | readiness receipts | `PASS` |

## Feature Impact Matrix

| Feature / Flow | Source Docs Or Spec IDs | Code Areas / Public Contracts | Touched Directly? | Protected Adjacent Behavior | Required Check | Status | Route |
|---|---|---|---|---|---|---|---|
| Pair identity and discovery | pair contract | pair files, catalog, validator | yes | 26 complete graph/spec pairs | focused architecture validation | `PASS` | `implement-change` |
| Preserved decisions | graph `preserves` fields | relationship resolver | yes | every current node and decision remains addressable | preservation snapshot comparison | `PASS` | `validate-change` |
| Scaffold adoption | five source profiles | manifest and generator | no | five profiles and 71 paths unchanged | scaffold validate/self-test | `PASS` | `validate-change` |
| Simulation program | W-004-W-010, W-012 | evals, agents, simulation skills and reports | no | no source or lane mutation | scoped diff review | `PASS` | `review-change` |

## File Ownership

| Path Or Area | Owner | Access | Notes |
|---|---|---|---|
| `scripts/validate_cascade_codex.py` | W-013 | write | one final pair-ID/kind/marker cutover |
| seven superseded graph/spec pairs | W-013 | delete at WG-002-N20 | only after all readiness receipts pass |
| W-014, W-015, W-016 owned files | owning lane | read/merge-only | fixes route back before integration |
| simulation implementation and plans | W-004-W-010, W-012 | read only | protected concurrent work |

## Tool And MCP Context

| Tool Or MCP | Use | Permission / Approval | Result Handling |
|---|---|---|---|
| local shell and validator | inventory, checks, and source identities | local read/execute | compact command evidence |
| external connectors | none | forbidden for this lane | no external state |

## Plan

1. Execute WG-002-N00 and freeze the 26-pair, relationship, decision, scaffold,
   and direct-consumer preservation snapshot.
2. Publish the exact rename and exclusive-write map at WG-002-N01.
3. Wait for W-014, W-015, and W-016 readiness receipts.
4. Rewrite the shared validator pair set, pair kinds, preserved-decision
   owners, required spec markers, frontend set, pack-path assertions, and
   scaffold owner detection.
5. Merge the three section outputs, remove the 14 superseded files, and run
   canonical-consumer old-ID absence checks.
6. Record the integrated source identity, exact create/modify/delete manifest,
   and `WG-002-GC` receipt for W-017.

## Parallel Dependencies

- Can run with: W-014, W-015, and W-016 after WG-002-N01; existing simulation
  lanes because their files are protected.
- Must wait for: W-014, W-015, and W-016 `READY_TO_MERGE` receipts before
  WG-002-N20.
- Conflicts with: any independent edit to the shared architecture pair
  registry, old-pair deletion, or architecture validator sets during cutover.

## Handoff And Merge Contract

- Handoff summary: rename map, baseline digest, section receipts, integrated
  source identity, removed paths, and unresolved failures.
- Required output: one 26-pair canonical catalog with no alias path.
- Merge owner: W-013.
- Merge target: current Cascade architecture-default authority.
- Evidence to preserve: before/after pair map, decision and node inventory,
  source-profile path list, validator output, and scoped diff.
- Stop condition: any missing section receipt, changed protected decision, or
  unrelated simulation-file diff blocks integration.

## Validation

| Check | Command Or Evidence | Status |
|---|---|---|
| Pair and relationship authority | `python3 scripts/validate_cascade_codex.py` against an isolated source tree | `PASS` |
| Old canonical IDs absent | scoped `rg` excluding migration history | `PASS` |
| Whitespace and accidental edits | `git diff --check` and path-scoped diff | `PASS` |

## Closeout

- Merge evidence: WG-002-N20 and WG-002-N21 passed against implementation source
  identity
  `sha256:e36113eba7d80c12ef1441569b69e8bd43e6cc5e909913a2da4f56993873398b`;
  26 complete pairs remain, all seven replacement IDs resolve, and canonical
  old-ID search is empty outside migration history.
- Report: `docs/work/reports/2026-07-28-stack-naming-work-graph.md`.
- Remaining risk: downstream consumers outside this repository must adopt the
  direct-cutover IDs; no compatibility aliases are provided.
