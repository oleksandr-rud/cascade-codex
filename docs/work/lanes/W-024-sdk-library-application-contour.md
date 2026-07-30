# Work Lane: W-024 SDK And Library Application Contour

Status: `COMPLETE`
Owner: `agent-engineer`
Coordinator: `orchestrator`
Created: 2026-07-28
Lane Model: `sequential-pipeline`
Next Gate: `none`

## Request

Add a reusable library application contour with SDK as a library profile,
including its architecture archetype, application-stack selection,
distribution infrastructure, evidence routing, retrieval, and validation.

## Intended Behavior And Assumptions

- The evidence `app_type` is `library`; SDK is a profile of that type rather
  than a second overlapping app type.
- A library unit is independently versioned, released, distributed, or
  consumed. An app-internal `src/libs` folder remains part of its owning
  application.
- Application units broaden from independently deployable units to
  independently deployed, versioned, or distributed application and package
  units.
- The new contour starts only after W-023 closes the 31-pair contour
  infrastructure program against one exact source identity.
- Existing evidence records remain valid under the additive
  `stack-selection-evidence.v1` enum expansion. If consumer inventory proves
  that an exhaustive external contract makes this unsafe, stop and plan an
  explicit schema-version migration before editing.

## Acceptance Criteria

- `library` is a supported application type in stack-selection evidence,
  routing, validation, skills, and public discovery.
- Three new graph/spec pairs exist:
  - `sdk-library` as the base archetype;
  - `library-stack` as the app-stack extension;
  - `library-infrastructure` as the contour infrastructure profile.
- The catalog grows from the post-W-023 31-pair identity to 34 complete pairs:
  five decisions, six archetypes, and 23 extensions.
- SDK profiles cover generated and hand-authored API SDKs, internal and public
  libraries, platform SDKs, and adapted WASM/FFI or binary bindings without
  making all candidates mandatory.
- The archetype owns public exports, core behavior, ports, adapters, isolated
  generated code, examples, documentation, contract tests, compatibility,
  versioning, migration, deprecation, and release policy.
- `library-infrastructure` defaults to no production runtime and routes only
  justified build, package-registry, artifact, signing, provenance,
  documentation, release, or browser-bundle resources to the shared resource
  extensions.
- Hosted APIs, databases, caches, queues, streams, or pub/sub remain owned by
  separate backend application units.
- A separately released UI component library composes `sdk-library` with
  `frontend-ui-platform`; the two pairs do not duplicate UI or package
  governance.
- All 31 prior pairs, their decision IDs, shared infrastructure resource
  authority, five scaffold profiles, and 71 generated paths remain preserved.

## Scope

In:

- the `sdk-library`, `library-stack`, and `library-infrastructure` graph/spec
  pairs;
- additive `library` evidence-enum and validator support;
- architecture, app-stack, infrastructure, and application-unit routing;
- general architecture pack retrieval and relevant skill/public discovery;
- compatibility, consumer, distribution, and no-runtime-infrastructure
  validation;
- exact 34-pair integration and closeout evidence.

Out:

- a separate `sdk` application type;
- converting ordinary `src/libs`, `src/shared`, or in-app UI folders into
  independent package units;
- concrete package-manager/provider rankings without target claims;
- hosted developer portals, APIs, databases, brokers, or control planes;
- new library source scaffold profiles or generated source paths;
- changes to W-004-W-010 or W-012 simulation work.

## Source Inputs

| Source | Path Or Tool | Why Needed | Freshness / Confidence |
|---|---|---|---|
| User request | Current task | explicit library/SDK contour intent | current / high |
| Post-infrastructure identity | W-023 and `2026-07-28-contour-infrastructure-implementation-graph.md` | required 31-pair baseline and shared-file boundary | pending / high |
| Architecture chooser | `architecture-selection` graph/spec | already identifies a library as a possible reusable boundary | current / high |
| Stack authority | `stack-selection` graph/spec and evidence schema | application-unit definition, routing, and public enum | current / high |
| Backend reuse rule | `service-api-worker.spec.md` | distinguishes app-internal technical libs from real domain packages | current / high |
| UI package rule | `frontend-ui-platform` graph/spec | avoids duplicating component-library governance | current / high |
| Delivery authority | `infrastructure-delivery` graph/spec | package artifacts, registries, provenance, docs, and release resources | current / high |

## Behavior Examples

| ID | Example | Expected Evidence | Status |
|---|---|---|---|
| `SL-001` | Given a separately released package, when stack selection classifies it, then it becomes a `library` unit using `sdk-library` and `library-stack`. | evidence fixture and relationship check | `PASS` |
| `SL-002` | Given backend API and worker apps share `src/libs`, when they are classified, then no library application unit is created without independent versioning, distribution, or ownership. | negative evidence fixture and spec marker | `PASS` |
| `SL-003` | Given a generated API SDK, when its structure is selected, then generated code is isolated behind a stable public surface and regeneration plus server-contract checks are required. | graph/spec marker and retrieval preview | `PASS` |
| `SL-004` | Given a package only needs registry publication and documentation, when infrastructure is selected, then no runtime compute, database, cache, or messaging resource is invented. | library-infrastructure relationship check | `PASS` |
| `SL-005` | Given an SDK consumes a hosted API, when ownership is recorded, then the SDK owns client compatibility while a backend unit owns the API and operated data/messaging resources. | composed evidence fixture | `PASS` |
| `SL-006` | Given a separately released UI library, when defaults are composed, then `sdk-library` owns package/public API lifecycle and `frontend-ui-platform` owns tokens, components, accessibility, and visual governance. | compatibility and preservation check | `PASS` |

## Feature Impact Matrix

| Feature / Flow | Source Docs Or Spec IDs | Code Areas / Public Contracts | Touched Directly? | Protected Adjacent Behavior | Required Check | Status | Route |
|---|---|---|---|---|---|---|---|
| Application-unit classification | `stack-selection` | evidence schema and validator | yes | six existing app types and records remain valid | old plus library fixtures | `PASS` | `implement-change` |
| Architecture catalog | architecture defaults | three new graph/spec pairs and shared roots | yes | prior 31 pairs and decisions remain addressable | 34-pair isolated validator | `PASS` | `validate-change` |
| Backend shared libs | `service-api-worker` | `src/libs` reuse boundary | no | technical primitives stay app-owned | negative classification check | `PASS` | `review-change` |
| UI component packages | `frontend-ui-platform` | package and UI governance | relationship only | accessibility and visual contracts stay authoritative | graph compatibility check | `PASS` | `review-change` |
| Infrastructure selection | W-018-W-023 | library profile plus four resource extensions | yes | one resource/provider authority | relationship and marker checks | `PASS` | `validate-change` |
| Existing source scaffolds | scaffold manifest/generator | five profiles and 71 paths | no | output paths and templates unchanged | scaffold self-test and path comparison | `PASS` | `validate-change` |

## File Ownership

| Path Or Area | Owner | Access | Notes |
|---|---|---|---|
| three new graph/spec pairs | W-024 | write | new contour authority |
| post-W-023 architecture/app-stack/infrastructure roots | W-024 | write | additive routing only |
| evidence schema and validator | W-024 | write | additive app type and fixtures |
| general pack, architecture index, stack spec, glossary/structure, routing skills | W-024 | write | selective retrieval and discovery |
| frontend pack and `frontend-ui-platform` pair | W-024 | read by default | edit only if a failed relationship/retrieval check proves it necessary |
| scaffold manifest/generator/templates | protected | verify-only | expansion requires a separate approved lane |
| W-004-W-010 and W-012 sources/plans | existing lanes | read-only | no SDK/library edits |

## Tool And MCP Context

| Tool Or MCP | Use | Permission / Approval | Result Handling |
|---|---|---|---|
| local repository tools | graph, schema, consumer, pack, and validator inspection | allowed read/write within lane scope | retain exact commands and summarized receipts |
| external documentation | none required for contour contract | not loaded | concrete ecosystem candidates require fresh official docs during implementation |

## Plan

1. Consume the exact W-023 completion receipt and freeze the 31-pair catalog,
   evidence behavior, five scaffold profiles, 71 paths, and all direct
   consumers of application-type and pair registries.
2. Freeze `library` as the only new app type, SDK as a profile, the three pair
   IDs, the independent-version/distribution threshold, and the no-runtime
   infrastructure default.
3. Add `sdk-library` with public API, compatibility, generation, consumer,
   documentation, versioning, deprecation, security, and distribution
   contracts.
4. Add `library-stack` candidate families and proof obligations without
   selecting concrete ecosystem packages by preference alone.
5. Add `library-infrastructure` and route build/distribution resources through
   existing compute and delivery authorities without duplicating providers.
6. Update application-unit wording, the additive evidence enum, semantic
   fixtures, stack/infrastructure routing, pack metadata, skills, validator,
   index, and public discovery.
7. Validate the 34-pair source identity, old and new evidence fixtures,
   selective SDK/library retrieval, scaffold preservation, source checks,
   harness checks, and fixed-point review before closeout.

## Agent And Skill Routing

- Execution model: a new sequential `agent-engineer` lane after W-023 closes;
  it is not dispatched with W-019-W-022.
- Required route:
  `context -> architecture-review -> plan-change -> implement-change -> review-change -> validate-change -> closeout`.
- Conditional review: use `secure-design` for package signing, provenance,
  credential, generated-code trust, or hosted-distribution boundaries.
- Merge owner: W-024 against the exact W-023 31-pair identity.
- Stop condition: no W-024 agent starts from a merely planned or partially
  validated Stage 2 source.

## Parallel Dependencies

- Can run with: unrelated simulation implementation whose write set remains
  disjoint.
- Must wait for: W-023 `COMPLETE` and its exact 31-pair source identity.
- Conflicts with: any W-018-W-023 implementation or repair touching shared
  architecture roots, packs, skills, validator, index, or public discovery.

## Handoff And Merge Contract

- Handoff summary: one directly integrated library contour with exact old/new
  pair, enum, retrieval, and preservation evidence.
- Required output: three graph/spec pairs plus the smallest required shared
  routing, schema, validator, pack, skill, and discovery edits.
- Merge owner: W-024.
- Merge target: the exact W-023 source identity.
- Evidence to preserve: 31-pair baseline, 34-pair result, old/new evidence
  fixtures, pack preview, five-profile/71-path scaffold equality, and scoped
  diff.
- Stop condition: unsafe schema compatibility, a required separate SDK type,
  accidental reclassification of app-internal libs, duplicate resource
  authority, scaffold output change, or unrelated simulation diff.

## Validation

| Check | Command Or Evidence | Status |
|---|---|---|
| graph/spec catalog and relationships | isolated `python3 scripts/validate_cascade_codex.py` | `PASS`; 34 pairs, zero source findings |
| evidence compatibility and library semantics | `python3 scripts/validate_stack_selection_evidence.py self-test` plus old/new fixtures | `PASS`; mismatched contour/family, service runtime, contradictory lifecycle, missing teardown, data/cache/messaging, and sensitive-evidence probes fail closed |
| SDK/library selective retrieval | general and frontend pack previews for library, SDK, compatibility, distribution, and UI-package composition queries | `PASS` |
| scaffold preservation | scaffold validate/self-test plus five-profile/71-path comparison | `PASS`; five profiles and 71 files |
| harness structure | catalog check and self-test | `PASS`; 41 skills, 319 scenarios, 15 cases |
| source integrity | Python compile, `git diff --check`, scoped old/new ID searches | `PASS` |
| fixed-point review | Standards, originating-request/spec, and secure-design review | `PASS`; no remaining P1/P2 |

## Doc Routing Decision Matrix

| Fact | Source | Owner Target | Action | Bloat Check | Evidence | Next Gate |
|---|---|---|---|---|---|---|
| SDK is a library profile under one `library` app type | user request and architecture review | this lane, then architecture defaults during implementation | `UPDATED` | one lane records the proposed contract without rewriting canonical patterns before implementation | current request and repository gap | `implement-change` after W-023 |
| W-024 is serialized after contour infrastructure closeout | shared consumer inventory | `docs/work/active.md` and contour infrastructure report | `UPDATED` | dependency note only | W-018-W-023 ownership contracts | W-023 completion |
| product/design/brand facts | none | none | `NO_DOC_NEEDED` | no product-visible behavior is being specified | architecture-only scope | done |

## Closeout

- Merge evidence: `PASS` against completed W-023 source identity
  `sha256:597720223d136685fba2ca04c25f8de56e58d6af3f3a6b6cb340794c5fc1b6aa`.
- Result: 34 graph/spec pairs comprising five decisions, six archetypes, and
  23 extensions.
- Final 84-file architecture implementation-authority identity:
  `sha256:ba8bd9e54db24519148edf0198c56b950bd30291f595aebd6bd5151168e87da2`.
- Direct checkout validator: `FAIL_UNRELATED`; the same 36 generated
  Playwright dependency findings remain, while isolated source validation has
  zero findings.
- Security review: `PASS`; contour/family routing, no-runtime lifecycle,
  teardown, supply-chain source trust, dependency-confusion, sensitive
  evidence, signing, provenance, and hosted-service ownership are enforced in
  authored contracts and deterministic probes.
- Report: create only if implementation becomes decision-heavy beyond this
  lane or closeout needs durable evidence beyond the lane receipt.
- Remaining risk: concrete language/package candidates and source scaffold
  profiles remain intentionally deferred until target claims or a separate
  scaffold-expansion request justify them. No package was built, signed,
  published, installed, revoked, or recovered from compromise.
