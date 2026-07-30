# Architecture Selection And Frontend Defaults

- Date: 2026-07-27; stack/technology/infrastructure split updated 2026-07-28
- Lane: `W-011`
- Status: `COMPLETE`
- Source: user request to implement the audited architecture chooser,
  extension, multi-tenant/interface, and frontend defaults while preserving the
  existing graph/spec catalog.

## Outcome

The architecture-default catalog now contains 34 graph/spec pairs:

- five decisions: architecture, stack, tenancy, interface, and caching;
- six archetypes: backend service/API/worker, web frontend, native app, CLI,
  experiment, and SDK/library;
- 23 extensions: application-stack routing; backend, frontend, native, CLI,
  experiment, and library stack selection; infrastructure routing; six
  contour infrastructure profiles; compute, data, messaging, and delivery
  resource infrastructure; event-driven backend; and frontend state/data,
  cache, realtime, and UI platform.

The canonical pair files remain in one architecture entry, but retrieval is
separated into two packs:

- `architecture-defaults` for cross-cutting, backend, native, CLI, experiment,
  SDK/library, application technology, and infrastructure selection;
- `frontend-architecture-defaults` for the web base, frontend stack profile,
  concrete frontend technology, hosting infrastructure, state/data, cache,
  realtime, and UI-platform selection.

The general pack does not duplicate frontend pair artifacts. Shared
architecture, tenancy, interface, stack, and technology decisions can be
selected from the frontend pack without copying their graph/spec authority.

The selection layers are now explicit:

- `architecture-selection` chooses topology and ownership;
- `stack-selection` extracts source-linked claims and applicable policies,
  classifies application units, and chooses a complete operable profile for
  each unit;
- `app-stack` routes application units to backend, frontend,
  native, CLI, experiment, or library stack extensions;
- `infrastructure` independently scopes and routes compute, data,
  messaging, and delivery resources.

The machine-readable `stack-selection-evidence.v1` contract links project
descriptions, requirements, architecture notes, operations facts, current
code, or human decisions to claims and policies. It classifies application
units as backend service, backend worker, web frontend, native app, CLI,
experiment, or library, then records each candidate as `ELIGIBLE`, `REJECTED`,
`PROOF_REQUIRED`, or `GAP`. Contradictory or unresolved required claims block
adoption instead of silently becoming preferences. Every candidate evaluates
every policy assigned to its application unit; hard-policy violations,
pending proof, and unresolved claims derive the permitted candidate status.
The same evidence record now supports deployment scopes, infrastructure
resources, resource candidates, and selected resources without duplicating
sources, claims, or policies. Application-technology and infrastructure
verdicts remain independent.

`backend-stack` now owns Bun/Hono, Go, and Python/FastAPI.
`frontend-stack` owns React/Vite, Next.js, TanStack Query, Zustand, Redux
Toolkit, XState, Radix, shadcn/ui, Material UI, Tailwind, Storybook, polling,
SSE, WebSocket, Socket.IO, and managed realtime. Native, CLI, and experiment
stack extensions own their separate candidate-family policies.

Five bounded source profiles are implemented in
`architecture-scaffold-profiles.json` and rendered by
`scripts/scaffold_architecture_default.py`: `backend-bun`, `backend-go`,
`backend-fastapi`, `frontend-react-vite`, and `frontend-nextjs`. Preview and
write are separate commands. The writer performs a full conflict preflight,
has no overwrite mode, installs no packages, runs no generated code, and pins
no versions.

The graph schema and validator now enforce extension relationships,
dependencies, compatibility/conflicts, preserved decisions, dependency-cycle
rejection, pack registration, catalog registration, and required spec
sections.

## Preservation Matrix

| Protected contract | Status | Evidence |
|---|---|---|
| Original six pair IDs and same-stem graph/spec shape | Preserved | all six remain required by validator; catalog now requires 34 total |
| Stable `app-stack` ID and 11 decisions | Preserved | the pair is now a routing/policy extension; child extensions preserve applicable decisions |
| Application/infrastructure authority separation | Added | stack graph, evidence schema, packs, skills, and validator enforce independent branches |
| Backend `src/<app-name>/startup` | Preserved | service spec marker is validator-protected |
| Backend `src/<app-name>/modules` vertical slices | Preserved | graph decision and spec marker are validator-protected |
| Shared server `src/libs` ports/adapters | Preserved | graph decision and spec marker are validator-protected |
| Module entrypoint plus interface/application/domain responsibilities | Preserved | service graph remains 15 nodes, 21 edges, and seven decisions |
| Models, repositories, emitters, and subscribers | Preserved | service spec markers and preserved decision IDs are enforced |
| Existing caching, native, CLI, and experiment defaults | Preserved | their original decision IDs are required |
| Original web decisions | Preserved | original five IDs and default meanings remain; feature entrypoint and dependency decisions were added |
| Frontend retrieval ownership | Separated | dedicated frontend pack owns frontend pair selection while canonical graph/spec paths remain stable |
| Backend source boundaries in generated profiles | Preserved | Bun, Go, and FastAPI profiles all contain app-owned startup, vertical modules, and shared `src/libs` |
| Frontend source boundaries in generated profiles | Preserved | Vite and Next.js profiles keep app composition, feature public entrypoints, and shared platform primitives separate |
| W-004–W-010 concurrent program | Unchanged | no program lane, adapter, schema, or report content was rewritten |

## Selection And Composition

Default selection order:

```text
constraints
  -> architecture-selection
  -> base archetype or coherent target topology
  -> tenancy-strategy
  -> interface-strategy
  -> source-linked claims
  -> applicable policies
  -> application-unit classification
  -> stack-selection per application unit
  -> app-stack and matching contour extension
  -> infrastructure and matching resource extensions
  -> independent candidate dispositions and proofs
  -> ADOPTED / ADAPTED / REJECTED / GAP evidence
```

Extensions declare `extends`, `requires`, `compatible_with`,
`conflicts_with`, and `preserves` as applicable. The validator rejects unknown
targets, missing extension preservation, missing preserved decisions, and
cycles across `extends` plus `requires`.

## Frontend Coverage

The strengthened web archetype owns a thin app shell, feature public
entrypoints, interface/application/optional-domain/data responsibilities,
transport adapters, shared UI, shared technical libraries, and evidence.

Separate extensions own:

- state classification, store/state-machine selection, mutations, concurrency,
  durable data, and offline rules;
- request, query, browser, service-worker, HTTP, and CDN cache policy;
- polling, SSE, WebSocket, subscription, reconnect/resume, ordering, dedupe,
  backpressure, and state reconciliation;
- semantic tokens, accessible primitives, components, patterns, theming,
  localization, documentation, packaging, versioning, and release gates.

The generic stack chooser includes a complete frontend profile across
framework/rendering, routing, data client, state/forms, realtime, styling/UI
platform, testing, build, and delivery.

The `frontend-stack` extension gives the frontend family its own concrete
framework, state/data, UI/component, styling, documentation, and realtime
options. These are selectable choices rather than one mandatory frontend
bundle. Infrastructure selection separately owns frontend hosting compute,
data, messaging, edge, delivery, secrets, observability, and infrastructure
code.

## Contour Infrastructure And SDK/Library Extension

W-018-W-023 implemented five additive application-contour infrastructure
pairs:
`backend-infrastructure`, `frontend-infrastructure`,
`native-infrastructure`, `cli-infrastructure`, and
`experiment-infrastructure`. They translate application shape into resource
needs and ownership boundaries. They do not duplicate compute, data,
messaging, delivery, or provider authority from the four resource extensions.

That integrated catalog was independently validated as 31 graph/spec pairs:
five decisions, five archetypes, and 21 extensions. Frontend retrieval loads only
`frontend-infrastructure` plus justified shared resources; general retrieval
is intended to select the matching backend, native, CLI, or experiment profile
without loading unrelated contour catalogs.

W-024 then adds `library` as the only new evidence application type, with SDK
as a profile, plus `sdk-library`, `library-stack`, and
`library-infrastructure`. An independently released UI package composes
`sdk-library` package/public API lifecycle with `frontend-ui-platform` UI and
accessibility governance. Ordinary app-owned `src/libs` remains inside its
application. Libraries default to no production runtime; hosted APIs, data,
cache, and messaging remain separate backend-owned units.

## Validation Evidence

- Architecture pair validator: `PASS`, 34 graphs and 34 specs.
- Parsed graph inventory: 5 decisions, 6 archetypes, 23 extensions.
- Backend preservation: 15 nodes, 21 edges, 7 decisions.
- Stack graph: 11 nodes, 12 edges, and 13 protected decisions.
- Technology routing graph: 8 nodes, 7 edges, and 11 protected decisions.
- Infrastructure routing graph: 11 nodes, 12 edges, and 17 protected
  decisions.
- SDK/library pairs: `sdk-library` 11 nodes/15 edges/9 decisions,
  `library-stack` 9/13/5, and `library-infrastructure` 12/16/8.
- Stack selection evidence validator self-test: `PASS`; valid source, claim,
  policy, unit, infrastructure scope/resource, per-candidate policy outcome,
  proof, and application/resource selection references are enforced, including
  negative unknown-reference, resource-reference, empty-consumer, hard-policy,
  proof-required, conflicting-claim, library contour/family mismatch,
  service-runtime, contradictory lifecycle, missing teardown, data/cache/
  messaging ownership, and sensitive-evidence probes.
- Scaffold manifest validation: `PASS`, 5 required profiles.
- Scaffold self-test: `PASS`, 71 rendered/written files across all profiles,
  with the second-write conflict probe failing closed.
- Pack preview: technology, backend, web base, and frontend technology/policy
  sections compile successfully; core and frontend packs compile independently.
- Negative probes: unknown relationship target, missing extension
  preservation, dependency cycle, and removed preserved backend decision all
  failed closed.
- Python compilation and repository diff whitespace check: `PASS` for the
  architecture-owned changes.
- Isolated source validator: `PASS`, 9 agents, 41 registered skills, no
  project-specific leakage, and no forbidden standalone review aliases.
- Harness catalog: `PASS`, 41 skills and 319 scenarios.
- Harness self-test: `PASS`, 15 cases.
- Security review: `PASS`; no remaining P1/P2 after typed library routing and
  lifecycle enforcement, secret-safe durable evidence, trusted dependency
  sources, namespace protection, integrity, hook isolation, bounded build
  egress, and dependency-confusion probes.
- Final 84-file architecture implementation-authority identity:
  `sha256:ba8bd9e54db24519148edf0198c56b950bd30291f595aebd6bd5151168e87da2`.

The direct dirty-checkout validator reports 36 errors, all from generated
Playwright dependencies under the root and isolated harness-tooling
`node_modules`; the same source tree passes when generated dependencies are
excluded. No architecture-pair, scaffold-profile, skill-catalog, or source
validation error remains. No live application, browser, deployment, package
build, signing, publication, installation, revocation, or compromise-recovery
execution applies to this documentation, generator, and validator change.

## Doc Routing Decision Matrix

| Durable fact | Owner | Status |
|---|---|---|
| Pair kinds, relationships, selection order, and catalog | `docs/patterns/architecture-defaults/` | `UPDATED` |
| Claim/policy-driven stack selection authority | `stack-selection` graph/spec and evidence schema | `UPDATED` |
| Application-technology routing and stable decisions | `app-stack` graph/spec | `UPDATED` |
| Per-contour application technology candidates | backend/frontend/native/CLI/experiment technology pairs | `ADDED` |
| Infrastructure scope and resource selection | `infrastructure` graph/spec | `ADDED` |
| Compute, data, messaging, and delivery infrastructure | infrastructure extension pairs | `ADDED` |
| Stack evidence semantic validation | `scripts/validate_stack_selection_evidence.py` | `ADDED` |
| Safe backend/frontend source profiles | architecture scaffold manifest and generator | `ADDED` |
| General boundary routing | `docs/patterns/boundaries/` | `UPDATED` |
| Pack retrieval and paired-document shape | architecture pack and context-pack schema | `UPDATED` |
| Onboarding and architecture review routing | `adapt-harness`; `architecture-review` | `UPDATED` |
| Contour infrastructure routing | five original contour profile pairs, packs, and public discovery | `ADDED`; independently validated by W-023 |
| SDK/library contour | `sdk-library`, `library-stack`, `library-infrastructure`, evidence enum, packs, routing, and public discovery | `ADDED`; W-024 |
| Target product/design/brand facts | target owner docs | `NO_CHANGE`; no target application exists |
| Stack/source-root facts | `harness.config.yaml` | `NO_CHANGE`; defaults are project-neutral |
