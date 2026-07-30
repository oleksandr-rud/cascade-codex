# Work Lane: W-023 Infrastructure Profile Validation And Closeout

Status: `COMPLETE`
Owner: `independent agent-engineer`
Coordinator: `orchestrator`
Created: 2026-07-28
Lane Model: `sequential-pipeline`
Next Gate: `none`

## Request

Independently validate the integrated contour infrastructure profiles and
close the program with exact structural, retrieval, preservation, and source
evidence.

## Acceptance Criteria

- Validation runs against the exact W-018 integrated source identity.
- The catalog contains 31 complete pairs with five decisions, five archetypes,
  and 21 extensions.
- Five contour profiles route to the existing four resource extensions without
  duplicate provider/resource authority.
- Frontend SSR/BFF/fullstack and backend database/cache/queue/pub-sub rules are
  selectively retrievable.
- Evidence schema v1 and validator semantics are preserved.
- Five source scaffold profiles and 71 paths are unchanged.
- Source validator, evidence/scaffold self-tests, pack previews, harness
  checks, Python compile, diff check, and Standards/Spec review have exact
  outcomes.
- Failures route to W-018-W-022; W-023 does not patch implementation sources.

## Scope

In:

- read-only integrated validation;
- exact check and failure-routing matrix;
- updates to `docs/work/active.md`, `docs/work/reports/_index.md`, and the
  contour infrastructure implementation-graph report after validation.

Out:

- implementation fixes;
- provider suitability, provisioning, deployment, runtime, or release claims;
- schema or scaffold expansion.

## Behavior Examples

| ID | Example | Expected Evidence | Status |
|---|---|---|---|
| `IPV-001` | All application-profile and resource-extension relationships resolve. | isolated architecture validator | `PASS` |
| `IPV-002` | Frontend query requests SSR/BFF infrastructure. | frontend-only focused pack receipt | `PASS` |
| `IPV-003` | Evidence and scaffold files are compared with Gate IP-A. | byte/path preservation receipt | `PASS` |
| `IPV-004` | A required check fails. | lane remains open and failure returns to the source owner | `PASS` |

## Feature Impact Matrix

| Feature | Touched by validation | Required evidence | Status | Route |
|---|---|---|---|---|
| Pair catalog and relationships | no | 31-pair isolated validator | `PASS` | W-018-W-021 |
| Retrieval and routing | no | focused general/frontend previews and harness checks | `PASS` | W-022 |
| Evidence contract | no | digest and self-test | `PASS` | W-018 or plan revision |
| Scaffold contract | no | validate/self-test and 71-path comparison | `PASS` | W-018 or separate plan |
| Dirty checkout | no | direct versus isolated source classification | `PASS_WITH_UNRELATED_FINDINGS` | exact owner |

## File Ownership

| Path Or Area | Access |
|---|---|
| W-018-W-022 implementation sources | read-only |
| `docs/work/active.md` | write at closeout |
| `docs/work/reports/_index.md` | write at closeout |
| contour infrastructure graph report | write evidence/status only |
| simulation sources and plans | read-only |

## Plan

1. Verify W-018 source identity and all section receipts.
2. Validate pair counts, graph/spec links, relationships, preserved decisions,
   and authority markers.
3. Preview backend, frontend, native, CLI, and experiment queries.
4. Prove evidence and scaffold preservation.
5. Run source, harness, compile, diff, and fixed-point review gates.
6. Route failures or update the three evidence owners when all results are
   current against one source identity.

## Agent And Skill Routing

- Execution: a fresh `agent-engineer` validation instance that did not own
  W-018-W-022 implementation.
- Required skills:
  `context -> review-change -> validate-change -> closeout`.
- Prohibited route: `implement-change` against Stage 2 implementation sources.
- Failure handling: report the exact failed gate and source identity, then
  return ownership to W-018-W-022.
- Completion handling: update only the active registry, report index, and
  implementation-graph evidence/status surfaces listed in File Ownership.

## Dependencies And Handoff

- Must wait for: W-018 IG-IP-20 integrated receipt.
- No implementation source may change during validation.
- Source merge owner: W-018.
- Evidence owner: W-023.
- Stop condition: source identity changes or any required check fails.

## Validation

| Check | Status |
|---|---|
| isolated Cascade validator | `PASS`; 9 agents, 41 skills, zero source findings |
| evidence schema self-test | `PASS` |
| scaffold validate/self-test and path comparison | `PASS`; 5 profiles and 71 files |
| focused pack previews | `PASS` |
| harness catalog/self-test | `PASS`; 41 skills, 319 scenarios, 15 self-test cases |
| Python compile, diff check, and Standards/Spec review | `PASS` |

## Closeout

- Report: `docs/work/reports/2026-07-28-contour-infrastructure-implementation-graph.md`.
- Frozen source identity:
  `sha256:597720223d136685fba2ca04c25f8de56e58d6af3f3a6b6cb340794c5fc1b6aa`.
- Manifest equality: `PASS`, 78 of 78 files in the working and isolated trees.
- Catalog: `PASS`, 31 graphs and 31 specs comprising five decisions, five
  archetypes, and 21 extensions.
- Protected evidence schema, evidence validator, graph schema, scaffold
  manifest, and scaffold generator hashes match Gate IP-A.
- Direct checkout validator: `FAIL_UNRELATED`; all 36 findings are generated
  Playwright `node_modules`, while the isolated source validator has zero
  findings.
- Validation evidence proves authored structure and deterministic repository
  contracts only. It does not prove runtime, provisioning, deployment, or
  release readiness.
