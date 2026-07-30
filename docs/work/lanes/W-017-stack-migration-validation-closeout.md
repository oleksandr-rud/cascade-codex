# Work Lane: W-017 Stack Migration Validation And Closeout

Status: `COMPLETE`
Owner: `agent-engineer`
Created: 2026-07-28
Lane Model: `sequential-pipeline`
Next Gate: `none`

## Request

Independently validate the integrated stack-naming migration, report exact
evidence boundaries, and close the implementation worklines without repairing
their owned source inside the validation lane.

## Acceptance Criteria

- Validation runs against the exact integrated source identity from W-013.
- The catalog contains 26 complete pairs with the expected replacement IDs and
  no old pair files.
- Normalized before/after checks prove all protected decisions, nodes,
  candidates, archetype links, evidence fields, five scaffold profiles, and 71
  output paths are preserved.
- General and frontend retrieval previews resolve only existing paired files.
- Evidence and scaffold self-tests, Python compilation, diff checks, isolated
  source validation, harness catalog, and harness self-test have exact results.
- Dirty-checkout-only generated Playwright findings are reported separately
  from source validation if they remain.
- Failures route to W-013, W-014, W-015, or W-016; W-017 does not silently
  patch owned implementation files.

## Scope

In:

- read-only integrated validation and source-identity checks;
- report and active-work evidence updates;
- final Standards/Spec review and exact remaining-risk statement.

Out:

- graph, pack, scaffold, skill, validator, or runtime implementation fixes;
- live stack proof, deployment, release, or external publication;
- simulation campaign work.

## Concrete Change Inventory

W-017 performs no implementation-source edits. It verifies the integrated
46-operation source manifest and updates only three evidence owners:

| Operation | Count | Paths |
|---|---:|---|
| Read/verify | 46 | 14 created, 18 modified, and 14 deleted canonical source entries |
| Update status/evidence | 3 | `docs/work/active.md`, `docs/work/reports/_index.md`, and the migration implementation-graph report |

The old-ID search excludes W-013 through W-017 lane packets and the migration
report only because those files preserve the explicit before/after map.
Everything that routes, validates, scaffolds, or documents the current
architecture remains inside the search boundary.

### Required Evidence Bundle

- exact integrated source identity;
- create/modify/delete manifest and scoped diff;
- 26-pair catalog and relationship resolution;
- normalized decision/node/candidate preservation comparison;
- five scaffold preview manifests and 71-path equality;
- evidence schema/validator byte digests and semantic self-test;
- two context-pack previews;
- isolated source validator plus direct dirty-checkout disposition;
- harness catalog/self-test and Standards/Spec review.

## Source Inputs

| Source | Path Or Tool | Why Needed | Freshness / Confidence |
|---|---|---|---|
| Integrated receipt | W-013 IG-AS-20 | exact validation target | current |
| Section receipts | W-014, W-015, W-016 | preservation and local checks | current |
| Migration graph | implementation graph report | required gate set | current authored plan |
| Baseline snapshot | IG-AS-00 | before/after comparison | current |

## Behavior Examples

| ID | Example | Expected Evidence | Status |
|---|---|---|---|
| `VAL-001` | Given the integrated catalog, when every relationship resolves, then all 26 graph/spec pairs validate. | isolated validator result | `PASS` |
| `VAL-002` | Given migration-history files retain an old ID in a rename map, when old-ID absence runs, then history is excluded but every canonical authority is checked. | scoped search command and result | `PASS` |
| `VAL-003` | Given the dirty checkout contains generated Playwright dependencies, when aggregate validation runs, then those findings are separated from source migration defects. | direct and isolated validator results | `PASS` |
| `VAL-004` | Given a required check fails, when closeout is attempted, then the lane remains open and the failure returns to its source owner. | failure-routing record | `PASS` |

## Feature Impact Matrix

| Feature / Flow | Source Docs Or Spec IDs | Code Areas / Public Contracts | Touched Directly? | Protected Adjacent Behavior | Required Check | Status | Route |
|---|---|---|---|---|---|---|---|
| Pair catalog | W-013 | integrated architecture defaults | no | 26 complete pairs | isolated validator | `PASS` | `validate-change` |
| App stack and scaffolds | W-014 | six pairs, manifest, generator | no | decisions, candidates, five profiles, 71 paths | comparison and self-test | `PASS` | `validate-change` |
| Infrastructure | W-015 | root and four children | no | decisions and evidence shape | relationship and evidence self-test | `PASS` | `validate-change` |
| Retrieval and routing | W-016 | packs, skills, public docs | no | selective context and route order | previews and harness checks | `PASS` | `validate-change` |
| Simulation work | W-004-W-010, W-012 | protected paths | no | zero migration edits | diff ownership review | `PASS` | `review-change` |

## File Ownership

| Path Or Area | Owner | Access | Notes |
|---|---|---|---|
| implementation source owned by W-013-W-016 | source lane | read only | route fixes back |
| `docs/work/active.md` | W-017 | write at validation/closeout | exact states and evidence |
| `docs/work/reports/_index.md` | W-017 | write | report registration/status |
| migration implementation graph report | W-017 | write after execution | gate results and frontier |
| simulation files and reports | existing lanes | read only | protected |

## Tool And MCP Context

| Tool Or MCP | Use | Permission / Approval | Result Handling |
|---|---|---|---|
| local validators and diff tools | independent validation | local read/execute | exact command, result, source identity |
| external connectors and deployments | none | forbidden | no external state |

## Plan

1. Verify the W-013 source identity and all section receipts.
2. Run normalized preservation, relationship, pair-count, path-count, and
   canonical old-ID checks.
3. Run scaffold, evidence, pack, compile, diff, isolated validator, harness
   catalog, and harness self-test gates.
4. Run the direct dirty-checkout validator and classify unrelated generated
   dependency findings separately.
5. Perform Standards/Spec review and route any repair to the owning lane.
6. Update the three evidence owners only after all required results are current
   against the same integrated source identity.

## Parallel Dependencies

- Can run with: no source implementation; individual read-only checks may run
  concurrently against one fixed source identity.
- Must wait for: W-013 IG-AS-20 integrated receipt.
- Conflicts with: any source mutation while validation is running.

## Handoff And Merge Contract

- Handoff summary: exact source identity, check matrix, routed failures,
  evidence boundary, and remaining risk.
- Required output: validation/closeout doc updates only.
- Merge owner: W-013 for source; W-017 for evidence records.
- Merge target: IG-AS-26 closeout.
- Evidence to preserve: command outputs, pair/profile counts, digests, and
  review findings.
- Stop condition: source identity changes or any required migration check fails.

## Validation

| Check | Command Or Evidence | Status |
|---|---|---|
| Evidence schema semantics | `python3 scripts/validate_stack_selection_evidence.py self-test` | `PASS` |
| Scaffold contract | `python3 scripts/scaffold_architecture_default.py validate` and `self-test` | `PASS` |
| Pattern retrieval | two pack previews | `PASS` |
| Source validator | isolated `python3 scripts/validate_cascade_codex.py` | `PASS` |
| Harness | catalog check and self-test | `PASS` |
| Mechanical | Python compile, `git diff --check`, scoped old-ID search | `PASS` |
| Direct dirty checkout | direct validator | `FAIL_UNRELATED`: 36 generated Playwright `node_modules` findings and no source finding |
| Fixed-point review | Standards and originating Stage 1 plan | `PASS` |

## Closeout

- Merge evidence: IG-AS-21 through IG-AS-26 passed against implementation
  source identity
  `sha256:e36113eba7d80c12ef1441569b69e8bd43e6cc5e909913a2da4f56993873398b`.
- Report: `docs/work/reports/2026-07-28-stack-naming-implementation-graph.md`.
- Completion unlocks W-018 IG-IP-00 using this lane's exact source
  identity; it does not implement or validate the contour infrastructure
  profiles.
- Remaining risk: completion does not prove that any candidate
  stack is suitable for a specific target project; target adoption still
  requires claims, policies, and proof.
