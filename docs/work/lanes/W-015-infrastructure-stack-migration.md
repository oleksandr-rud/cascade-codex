# Work Lane: W-015 Infrastructure Stack Migration

Status: `COMPLETE`
Owner: `agent-engineer`
Created: 2026-07-28
Lane Model: `parallel-sectioning`
Next Gate: `none`

## Request

Rename the infrastructure selection root to `infrastructure` while preserving
its independent resource scopes, child extensions, decisions, and shared stack
evidence contract.

## Acceptance Criteria

- A new `infrastructure.{graph.yaml,spec.md}` pair replaces the old root.
- `infrastructure-compute`, `infrastructure-data`,
  `infrastructure-messaging`, and `infrastructure-delivery` retain their IDs,
  nodes, edges, decisions, and specs.
- Each child extends `infrastructure` and preserves the same ten root decision
  IDs under the new prefix.
- Compatibility references use the new app-stack child IDs.
- `stack-selection-evidence.schema.json` and
  `validate_stack_selection_evidence.py` remain byte-for-byte unchanged unless
  a failing shape-compatibility test demonstrates a real graph-ID dependency.
- No provider, resource, policy, scope, or lifecycle semantics change.

## Scope

In:

- replacement infrastructure root graph/spec;
- relationship-only updates in four infrastructure child graphs;
- evidence-schema and semantic-validator compatibility verification.

Out:

- application-stack pair migration;
- new infrastructure products or provider recommendations;
- stack evidence field or schema-version changes;
- shared catalog, pack, skill, or top-level documentation edits;
- deletion of the superseded root pair.

## Concrete Change Inventory

| Operation | Count | Paths |
|---|---:|---|
| Create | 2 | `infrastructure.graph.yaml` and `infrastructure.spec.md` |
| Modify | 4 | `infrastructure-compute.graph.yaml`, `infrastructure-data.graph.yaml`, `infrastructure-messaging.graph.yaml`, and `infrastructure-delivery.graph.yaml` |
| Verify unchanged | 2 | `stack-selection-evidence.schema.json` and `scripts/validate_stack_selection_evidence.py` |
| Delete | 0 | W-013 removes the 2 superseded root files after readiness |

The four child specs are also verification-only: current consumer search finds
no old root ID in them. If a fresh IG-AS-00 search disagrees, stop and amend
the ownership map before editing.

### Required Relationship Refactor

- child `extends` target: `infrastructure`;
- child `preserves` owner prefix: `infrastructure:<decision-id>`;
- compatibility targets: new app-stack child IDs;
- root graph/spec self-identity and same-stem paths;
- no changes to resource nodes, decisions, candidate semantics, or validation.

## Source Inputs

| Source | Path Or Tool | Why Needed | Freshness / Confidence |
|---|---|---|---|
| Rename contract | W-013 and IG-AS-01 | exact parent ID and compatibility names | current completed gate |
| Root pair | `infrastructure-selection` graph/spec | ten decisions and scope semantics | current |
| Child graphs | four `infrastructure-*` graphs | extends, preserves, and compatibility edges | current |
| Evidence contract | schema and semantic validator | prove the rename is shape-neutral | current |

## Behavior Examples

| ID | Example | Expected Evidence | Status |
|---|---|---|---|
| `INF-001` | Given a compute resource, when the root is renamed, then it still routes to `infrastructure-compute` with the same decisions. | relationship comparison | `PASS` |
| `INF-002` | Given a cache or database resource, when stack evidence validates, then no graph ID is required in the evidence record. | schema and self-test result | `PASS` |
| `INF-003` | Given a resource child preserves `scope-before-provider`, when the prefix changes, then the reference resolves to `infrastructure:scope-before-provider`. | preserved-reference check | `PASS` |
| `INF-004` | Given an application compatibility edge, when the migration integrates, then it references `backend-stack`, `frontend-stack`, `native-stack`, `cli-stack`, or `experiment-stack`. | graph relationship validation | `PASS` |

## Feature Impact Matrix

| Feature / Flow | Source Docs Or Spec IDs | Code Areas / Public Contracts | Touched Directly? | Protected Adjacent Behavior | Required Check | Status | Route |
|---|---|---|---|---|---|---|---|
| Infrastructure root | old root pair | new root pair | yes | ten decisions and all scope semantics | normalized pair comparison | `PASS` | `implement-change` |
| Resource extensions | four infrastructure children | child graph relationships | yes | child IDs, nodes, decisions, specs | relationship validation | `PASS` | `validate-change` |
| Stack evidence | evidence schema v1 | schema and semantic validator | no | application and infrastructure records | evidence self-test | `PASS` | `validate-change` |
| App stack | W-014 | compatibility targets only | no | candidate semantics | cross-lane relationship check | `PASS` | `review-change` |

## File Ownership

| Path Or Area | Owner | Access | Notes |
|---|---|---|---|
| `infrastructure.{graph.yaml,spec.md}` | W-015 | write | new root pair |
| four `infrastructure-*.graph.yaml` child files | W-015 | write | relationship references only |
| four child specs | W-015 | read only | current search finds no old root ID |
| evidence schema and semantic validator | W-015 | read/verify | edit only after a documented failed dependency check |
| old root pair | W-013 | read only | integration owner deletes |
| app-stack pairs | W-014 | read only | use frozen IDs from IG-AS-01 |

## Tool And MCP Context

| Tool Or MCP | Use | Permission / Approval | Result Handling |
|---|---|---|---|
| stack evidence validator | semantic compatibility self-test | local execute | counts and negative-guard results |
| external infrastructure docs | none | not needed for a semantic rename | no external state |

## Plan

1. Create the replacement infrastructure root from the current graph/spec.
2. Change only root identity, paths, titles where appropriate, and references
   to the renamed app-stack branch.
3. Rewrite four child `extends`, `preserves`, and `compatible_with`
   relationships.
4. Prove the evidence schema and semantic validator contain no graph-ID
   dependency and run their existing self-test.
5. Compare all root and child nodes, edges, decisions, and validation rules
   against the baseline.
6. Hand W-013 a 6-file change receipt, evidence-file byte digests, and
   verification that the four child specs remained unchanged.

## Parallel Dependencies

- Can run with: W-014 and W-016 after IG-AS-01.
- Must wait for: frozen app-stack IDs and infrastructure root ID.
- Conflicts with: concurrent edits to the four infrastructure child graphs or
  evidence contract.

## Handoff And Merge Contract

- Handoff summary: root replacement, child relationship diff, evidence
  compatibility result, and exact source identity.
- Required output: W-015-owned graph/spec files only.
- Merge owner: W-013.
- Merge target: IG-AS-20 direct cutover.
- Evidence to preserve: normalized root/child comparison and evidence self-test.
- Stop condition: any evidence schema change, child decision change, or
  provider/resource semantic change without a new reviewed plan.

## Validation

| Check | Command Or Evidence | Status |
|---|---|---|
| Evidence semantic guards | `python3 scripts/validate_stack_selection_evidence.py self-test` | `PASS` |
| Root and child relationships | focused graph resolver | `PASS` |
| Evidence files unchanged | byte digest comparison | `PASS` |

## Closeout

- Merge evidence: IG-AS-12 and IG-AS-13 passed; the infrastructure root and
  four children match the normalized baseline, evidence self-test passes, and
  the evidence schema, semantic validator, graph schema, and four child specs
  retain their baseline SHA-256 digests.
- Report: `docs/work/reports/2026-07-28-stack-naming-implementation-graph.md`.
- Remaining risk: generic `infrastructure` is intentionally a pair ID inside
  the architecture-default namespace, not a new top-level source folder.
