# Work Lane: W-018 Contour Infrastructure Integration

Status: `COMPLETE`
Owner: `agent-engineer`
Coordinator: `orchestrator`
Created: 2026-07-28
Lane Model: `parallel-sectioning`
Next Gate: `none`

## Request

Integrate five application-contour infrastructure profiles after the canonical
stack naming migration, while retaining one infrastructure resource authority
and one direct graph/spec catalog.

## Acceptance Criteria

- W-017 supplies the exact completed post-migration source identity.
- Five profile IDs are frozen: `backend-infrastructure`,
  `frontend-infrastructure`, `native-infrastructure`, `cli-infrastructure`,
  and `experiment-infrastructure`.
- The post-program catalog has 31 valid graph/spec pairs with five decisions,
  five archetypes, and 21 extensions.
- The four resource extensions remain the only compute, data, messaging, and
  delivery resource/provider owners.
- `stack-selection-evidence.v1`, its validator semantics, five source scaffold
  profiles, and 71 generated paths remain unchanged.
- W-019-W-022 write only disjoint owned files and hand off readiness receipts.
- W-004-W-010 and W-012 simulation work remains untouched.

## Scope

In:

- post-W-017 source and consumer inventory;
- frozen profile and graph relationship contract;
- `infrastructure` root graph/spec application-profile routing;
- shared architecture validator pair, kind, marker, preservation, and pack
  assertions;
- deterministic merge of W-019-W-022;
- exact source identity for W-023.

Out:

- application profile pair contents owned by W-019-W-021;
- retrieval and public docs owned by W-022;
- schema version or record-shape changes;
- provider catalogs, IaC templates, source scaffolds, or deployments.

## Behavior Examples

| ID | Example | Expected Evidence | Status |
|---|---|---|---|
| `CII-001` | Given a web application unit, when infrastructure routing runs, then it selects `frontend-infrastructure` before routing its resource units. | root graph relationship check | `PASS` |
| `CII-002` | Given frontend and backend units share a deployment scope, when resources are selected, then each shared resource still has one owner and all consumers. | spec marker and evidence self-test | `PASS` |
| `CII-003` | Given a local CLI needs no operated resources, when its profile is adopted, then no compute/data/messaging resource is invented. | CLI profile and retrieval preview | `PASS` |
| `CII-004` | Given any section receipt is incomplete, when integration is attempted, then Gate IP-C remains blocked. | readiness receipt check | `PASS` |

## Feature Impact Matrix

| Feature / Flow | Touched | Protected adjacent behavior | Required check | Status | Route |
|---|---|---|---|---|---|
| Infrastructure root | yes | existing scope/resource decisions remain addressable | normalized graph comparison | `PASS` | `implement-change` |
| Pair catalog | yes | all existing 26 pairs remain complete | 31-pair validator result | `PASS` | `validate-change` |
| Evidence schema | verification only | v1 fields and candidate semantics | digest and self-test | `PASS` | `validate-change` |
| Source scaffolds | verification only | five profiles and 71 paths | scaffold self-test | `PASS` | `validate-change` |
| Simulation lanes | no | zero source or plan mutation | path-scoped diff | `PASS` | `review-change` |

## File Ownership

| Path Or Area | Owner | Access |
|---|---|---|
| post-migration `infrastructure.{graph.yaml,spec.md}` | W-018 | write |
| `scripts/validate_cascade_codex.py` | W-018 | write |
| W-019-W-022 owned sources | section owner | read/merge-only |
| evidence schema and evidence validator | protected | verify-only |
| scaffold manifest/generator/templates | protected | verify-only |
| simulation sources and plans | existing lanes | read-only |

## Plan

1. Consume W-017 completion and freeze the post-migration source identity,
   catalog, consumers, evidence digests, and scaffold path manifest.
2. Freeze profile IDs, app-type routing, fullstack composition status,
   resource-authority boundaries, and the no-schema-change rule.
3. Start W-019-W-022 against disjoint ownership.
4. Add application-profile routing and composition rules to the infrastructure
   root without duplicating resource-extension ownership.
5. Update the shared architecture validator after all section receipts exist.
6. Merge section outputs, run Gate IP-C, and hand W-023 one exact integrated
   source identity.

## Agent And Skill Routing

- Root coordinator: `orchestrator`.
- Merge and shared-contract owner: one `agent-engineer` instance assigned to
  W-018.
- Required route:
  `context -> architecture-review -> orchestrate-work -> plan-change -> implement-change`.
- Dispatch rule: W-019-W-022 receive direct, depth-one subagents only after
  IG-IP-01 publishes the frozen contract and exclusive file map.
- Merge rule: section agents return identity-bound receipts; they do not edit
  the infrastructure root, shared validator, active registry, or sibling
  sources.
- Validation handoff: a separate W-023 agent receives the integrated source
  identity and cannot repair implementation sources.

## Dependencies And Handoff

- Prerequisite available: W-017 `COMPLETE`, source identity
  `e36113eba7d80c12ef1441569b69e8bd43e6cc5e909913a2da4f56993873398b`.
- Current frontier: reproduce that receipt at IG-IP-00 before any section
  dispatch.
- Parallel after IG-IP-01: W-019, W-020, W-021, and W-022.
- Merge owner: W-018.
- Validation owner: W-023.
- Stop condition: schema change, scaffold-path change, missing receipt,
  duplicate resource authority, or unrelated simulation diff.

## Validation

| Check | Status |
|---|---|
| post-W-017 baseline and consumer inventory | `PASS` |
| root relationship and preservation comparison | `PASS` |
| 31-pair validator gate | `PASS` |
| evidence/scaffold protected-contract gate | `PASS` |
| scoped diff and source identity receipt | `PASS` |

## Closeout

- Report: `docs/work/reports/2026-07-28-contour-infrastructure-implementation-graph.md`.
- Implementation evidence: `PASS` for authored graph/spec, routing, retrieval,
  validator, and deterministic source contracts; runtime, provisioning,
  deployment, and release eligibility are outside this lane.
- IG-IP-00 receipt: `PASS`; the current 58-file architecture-default authority
  is byte-identical to the stored W-017 closeout source and has deterministic
  directory digest
  `sha256:53b5ba28d98aae99ecca0702abff738e36749c8237643f3b4eca6486fa80afee`.
- IG-IP-01 contract: `PASS`; the five profile IDs, disjoint file ownership,
  one resource-extension authority, no-schema-change rule, five scaffold
  profiles, and 71 generated paths are frozen for W-019-W-022.
- IG-IP-20/21 receipt: `PASS`; W-019-W-022 are integrated as 31 complete
  pairs with five decisions, five archetypes, and 21 extensions.
- Integrated 78-file implementation source identity:
  `sha256:597720223d136685fba2ca04c25f8de56e58d6af3f3a6b6cb340794c5fc1b6aa`.
- Security review: `PASS`; all original P1/P2 findings and the object/search
  tenant-isolation residual are closed in the authored contracts.
- W-023 independent validation: `PASS`; the 78-file identity is exact,
  31 graphs and 31 specs resolve as five decisions, five archetypes, and
  21 extensions, isolated source validation has zero findings, and the direct
  validator's 36 findings are confined to generated Playwright dependencies.
