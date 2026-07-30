# Architecture Defaults

Use this entry for reusable reference architectures that begin as a
machine-readable graph plus a paired human-readable specification. These are
starting points for planning and onboarding, not evidence about a target
repository.

## Pair Contract

Every architecture default is two files with the same stem:

- `<pair-id>.graph.yaml` owns logical nodes, edges, default decisions,
  selection cues, relationships, and validation obligations.
- `<pair-id>.spec.md` explains the default, file structure, language or
  platform overlays, operating constraints, exceptions, and validation.

The graph points to its spec through `spec_path`. The spec header points back
to the graph and repeats the pair ID. Graph IDs and decision IDs are stable
references; rename either only through an explicit migration that updates all
consumers and `preserves` references.

Most graphs describe responsibilities and flows rather than framework package
names. Specs map those responsibilities to idiomatic paths. Concrete
application candidates live in contour-specific stack extensions.
Infrastructure candidates live in resource-specific infrastructure
extensions. `app-stack` and `infrastructure` both extend
`stack-selection`; neither replaces its claim, policy, whole-profile, proof,
boundary, or lifecycle authority.

Pair kinds are:

- `decision`: selects a cross-cutting policy or strategy.
- `archetype`: defines the base topology and implementation structure for a
  deployed, versioned, or distributed application or package shape.
- `extension`: composes onto one or more base graphs and declares which base
  decisions it preserves.

## Selection And Adoption

Architecture defaults are `reference-default`: a first candidate to evaluate,
not automatic permission to scaffold files.

1. Inspect the target's stack, source roots, public contracts, build and
   deployment units, data ownership, operations, and vocabulary.
2. Start with `architecture-selection` when topology is open.
3. Select the matching archetype or existing target architecture.
4. Extract stack-relevant claims and policies from project descriptions,
   requirements, operations docs, current code, and human decisions.
5. Classify independently deployed, versioned, or distributed backend
   service, worker, web, native, CLI, experiment, or library units.
6. Evaluate tenancy and interfaces, then choose a complete stack profile for
   each unit.
7. Add `app-stack` and exactly the contour stack extensions
   needed by application units.
8. Add `infrastructure`, then route each application unit to its matching
   backend, frontend, native, CLI, experiment, or library infrastructure
   profile.
9. Route every operated resource independently to only the compute, data,
   messaging, or delivery extension that owns its resource/provider decision.
10. Keep application technology, contour-specific resource needs, and
   infrastructure resource/provider decisions separate, then prove their
   compatibility.
11. Load each selected graph and spec together.
12. Record `ADOPTED`, `ADAPTED`, `REJECTED`, or `GAP`, target evidence, and the
   owner path for durable target-specific decisions.
13. Validate public boundaries and failure modes before scaffolding or
   implementation.

Do not load every pair into every task. Retrieval starts from pack metadata,
pair IDs, tags, relationships, and target evidence.

## Pair Catalog

The original six pair IDs and the stable `app-stack` ID are preserved. The
current catalog has 34 graph/spec pairs: five decisions, six archetypes, and
23 extensions.

| Pair ID | Kind | Default use |
|---|---|---|
| `architecture-selection` | decision | Select the simplest sufficient topology from constraints and quality attributes. |
| `stack-selection` | decision | Map a selected topology to a complete application/runtime and operated-capability profile before concrete technology or infrastructure products. |
| `app-stack` | extension | Route one application unit to its backend, frontend, native, CLI, experiment, or library stack extension. |
| `backend-stack` | extension | Select backend API/worker runtime, framework, process, and packaging technology. |
| `frontend-stack` | extension | Select web framework, state/data, UI, styling, documentation, and realtime technology. |
| `native-stack` | extension | Select platform-native, cross-platform UI, or shared-core native technology. |
| `cli-stack` | extension | Select compiled, runtime-distributed, or embedded CLI technology. |
| `experiment-stack` | extension | Select reproducible script, notebook, or accelerated experiment technology. |
| `library-stack` | extension | Select SDK/library language, generation, binding, package, compatibility, and distribution technology. |
| `infrastructure` | extension | Scope environments and resources, then route infrastructure selection by resource concern. |
| `infrastructure-compute` | extension | Select runtime compute, placement, scaling, workload identity, and lifecycle. |
| `infrastructure-data` | extension | Select database, cache service, object/search, backup, restore, and residency topology. |
| `infrastructure-messaging` | extension | Select queue, pub/sub, stream, scheduler, dead-letter, and replay topology. |
| `infrastructure-delivery` | extension | Select network/edge, artifacts, CI/CD, secrets, observability, and IaC. |
| `tenancy-strategy` | decision | Apply tenant, account, region, brand, or first-party app isolation across every boundary. |
| `interface-strategy` | decision | Select synchronous, asynchronous, operator, streaming, webhook, or batch interfaces around application contracts. |
| `caching-strategy` | decision | Define server/data cache freshness, invalidation, isolation, and stampede policy. |
| `service-api-worker` | archetype | Use app-owned startup, vertical module slices, and reusable shared technical libraries for backend apps. |
| `web-frontend` | archetype | Use feature entrypoints and optional interface/application/domain/data responsibilities around a thin app shell. |
| `native-app` | archetype | Use feature, domain, data, offline, and platform boundaries for Swift, Kotlin, React Native, or Flutter apps. |
| `cli` | archetype | Use stable commands, reusable use cases, adapters, and automation-safe output contracts. |
| `experiment` | archetype | Separate reproducible inputs, isolated runs, artifacts, analysis, and production promotion. |
| `event-driven` | extension | Add outbox, broker, idempotent subscribers, retry, dead letter, replay, and operations to backend modules. |
| `frontend-state-data` | extension | Define ownership for URL, UI/form, client, server, durable, and realtime state plus mutation policy. |
| `frontend-cache` | extension | Define request, query, browser, service-worker, HTTP, and CDN cache layers. |
| `frontend-realtime` | extension | Select polling, SSE, WebSocket, or subscriptions and define recoverable reconciliation. |
| `frontend-ui-platform` | extension | Govern tokens, accessible primitives, components, patterns, themes, docs, packages, and releases. |

Application-contour infrastructure extensions translate application shape into
resource needs while retaining the four resource authorities:

| Pair ID | Kind | Default use |
|---|---|---|
| `backend-infrastructure` | extension | Translate backend service and worker roles into owned compute, data, messaging, and delivery resource needs. |
| `frontend-infrastructure` | extension | Translate static, SSR, streaming, edge, embedded-BFF, and fullstack composition into frontend-owned and backend-owned resource boundaries. |
| `native-infrastructure` | extension | Separate device-local adapters from signing, store delivery, observability, push integration, and backend-owned remote infrastructure. |
| `cli-infrastructure` | extension | Default a local CLI to no operated infrastructure and add distribution or remote-control resources only from evidence. |
| `experiment-infrastructure` | extension | Govern local or ephemeral compute, artifacts, tracking, queues, budget, TTL, teardown, and production promotion. |
| `library-infrastructure` | extension | Default libraries to no production runtime and add only evidence-backed build or delivery resources. |
| `sdk-library` | archetype | Use stable public exports around core behavior, ports, adapters, isolated generated code, consumer contracts, compatibility, documentation, and release policy. |

## Frontend Defaults

Frontend defaults have a dedicated retrieval pack:
`frontend-architecture-defaults`. The graph/spec files remain in this entry as
the single canonical authority; the separate pack changes selection scope, not
file ownership or pair identity.

Use this frontend sequence:

```text
target constraints
  + project-description claims and policies
  -> architecture-selection when topology is open
  -> web-frontend base archetype
  -> tenancy-strategy and interface-strategy when applicable
  -> stack-selection: frontend stack profile
  -> frontend-state-data when state policy is material
  -> frontend-cache when more than in-memory query caching is justified
  -> frontend-realtime when bounded-latency updates are required
  -> frontend-ui-platform when shared UI governance is required
  -> app-stack
  -> frontend-stack: framework and selected policy libraries
  -> infrastructure when hosting or resources are open
  -> frontend-infrastructure: static, SSR, edge, BFF, and fullstack boundaries
  -> infrastructure-compute/data/messaging/delivery as applicable
```

| Frontend pair | Adoption |
|---|---|
| `web-frontend` | Base frontend archetype; required for this family. |
| `frontend-state-data` | Optional state ownership, mutation, durable data, and offline extension. |
| `frontend-cache` | Optional browser, service-worker, HTTP, and CDN cache extension; requires state/data. |
| `frontend-realtime` | Optional polling, SSE, WebSocket, or subscription extension; requires state/data and interface strategy. |
| `frontend-ui-platform` | Optional token, accessible primitive, component, theme, documentation, and package extension. |
| `frontend-stack` | Concrete web framework and independently justified state, UI, and realtime technologies. |
| `infrastructure` | Optional shared resource scope and provider topology for hosting and operations. |
| `frontend-infrastructure` | Validated frontend application profile for static, SSR, edge, embedded-BFF, and fullstack resource needs. |

The four selection layers answer different questions:

| Layer | Question | Example result |
|---|---|---|
| `architecture-selection` | What topology and ownership boundaries fit? | Modular service plus a separate browser client. |
| `stack-selection` | What complete operable profile implements it? | TypeScript API, relational database, React client, test and deployment profile. |
| `app-stack` plus contour extension | Which named application technologies implement that profile? | `backend-stack:bun-hono` or `frontend-stack:nextjs`. |
| `infrastructure` plus contour profile and resource extension | Which resources does this app shape need, and where do those resources run? | `frontend-infrastructure` selects SSR resource needs; compute and delivery extensions select the operated topology. |

## Claim And Policy Driven Stack Selection

`stack-selection` remains the canonical stack graph. Do not rename
`app-stack` to `stack-selection`: both IDs are already referenced,
and duplicate names would hide which graph owns the complete profile.

The base selection flow is:

```text
project descriptions + current code + human decisions
  -> atomic source-linked claims
  -> required / forbidden / proof-required / preferred policies
  -> independently deployed, versioned, or distributed application and package units
  -> candidate profiles per unit
  -> ELIGIBLE / REJECTED / PROOF_REQUIRED / GAP
  -> highest-risk proof
  -> adopted or adapted stack
```

Use `stack-selection-evidence.schema.json` for the machine-readable source,
claim, policy, application-unit, deployment-scope, infrastructure-resource,
candidate-result, and selection graph. Explicit claims outrank inferred
claims. Inference can open a question or proof task, but it cannot silently
become a mandatory requirement. Required and forbidden policies run before
preference scoring.

Application contours are architecture classifications:
`backend-service`, `backend-worker`, `web-frontend`, `native-app`, `cli`,
`experiment`, and `library`. They are independent deployed, versioned, or
distributed stack decisions and are not the
command, terminal, browser, desktop, mobile, or agent-response contours used by
simulation campaigns.

## Stack Extension Tree

`stack-selection` is the single base authority. Its extensions answer narrower
questions:

```text
stack-selection
├─ app-stack
│  ├─ backend-stack
│  ├─ frontend-stack
│  ├─ native-stack
│  ├─ cli-stack
│  ├─ experiment-stack
│  └─ library-stack
└─ infrastructure
   ├─ application profiles
   │  ├─ backend-infrastructure
   │  ├─ frontend-infrastructure
   │  ├─ native-infrastructure
   │  ├─ cli-infrastructure
   │  ├─ experiment-infrastructure
   │  └─ library-infrastructure
   └─ resource extensions
      ├─ infrastructure-compute
      ├─ infrastructure-data
      ├─ infrastructure-messaging
      └─ infrastructure-delivery
```

`sdk-library` is the base archetype for `library` units. A separately released
UI component package composes it with `frontend-ui-platform`: the library pair
owns package/public API lifecycle, while the frontend pair owns tokens,
components, accessibility, visual governance, and UI documentation.

Application technology owns code-executing runtimes, frameworks, libraries,
UI toolkits, and application transports. Infrastructure owns compute
placement, deployed data/cache/broker resources, network/edge, delivery,
secrets, observability, resource lifecycle, and provider constraints.

The same project claims and policies may affect both branches, but they produce
different candidate records. A framework can be eligible while a hosting
topology remains `PROOF_REQUIRED`; do not collapse those gates.

Load the dedicated pack with:

```bash
bun scripts/cascade.ts patterns \
  --pack frontend-architecture-defaults \
  --query <frontend-topic>
```

Select only the relevant sections. A frontend task does not automatically need
every extension, and the general `architecture-defaults` pack remains the
entrypoint for backend, native, CLI, experiment, library, and cross-cutting
decisions.

## Composition And Preservation

Use this selection order when the corresponding concern is present:

```text
constraints
  + source-linked claims and selection policies
  -> architecture-selection
  -> base archetype or coherent target topology
  -> tenancy-strategy
  -> interface-strategy
  -> stack-selection
  -> app-stack
  -> matching application-contour stack extensions
  -> infrastructure when operated resources are needed
  -> matching application-contour infrastructure profile
  -> matching infrastructure-resource extensions
  -> compatibility and highest-risk proofs
  -> ADOPTED / ADAPTED / REJECTED / GAP evidence
```

Graph relationships are enforceable:

- `extends`: base graph whose topology an extension augments.
- `requires`: another graph that must be resolved first.
- `compatible_with`: a known composition that does not itself make adoption
  mandatory.
- `conflicts_with`: a pair that cannot be adopted at the same time without an
  explicit adaptation.
- `preserves`: stable `<graph-id>:<decision-id>` obligations an extension must
  not redefine.

The combined `extends` and `requires` graph is acyclic. Relationship targets and
preserved decisions must exist. An extension may add nodes, adapters, policies,
and validation, but it cannot silently replace the base's ownership,
dependency direction, public entrypoints, or file structure.

Examples:

- `event-driven` extends `service-api-worker` while preserving app-owned
  vertical slices, startup composition, shared-lib scope, and module surfaces.
- `app-stack` extends `stack-selection` while preserving its claim,
  policy, application-unit, whole-profile, proof, boundary, and lifecycle
  decisions.
- Backend, frontend, native, CLI, experiment, and library stack extensions
  preserve the technology policy contract while owning their candidate
  catalogs.
- `infrastructure` extends `stack-selection`; compute, data,
  messaging, and delivery extensions preserve its scope, security, ownership,
  lifecycle, IaC, cost, and recovery decisions.
- Backend, frontend, native, CLI, experiment, and library infrastructure
  profiles translate application-contour needs without owning provider
  catalogs; resource extensions retain compute, data, messaging, and delivery
  authority.
- Frontend policy extensions preserve feature ownership and entrypoints, then
  add independently selectable state/data, cache, realtime, or UI-platform
  rules.
- `tenancy-strategy` overlays identity and isolation across database, cache,
  messages, interfaces, operations, and apps without creating a second domain
  architecture.

## Scaffold Profiles

Architecture defaults are primarily decision references. They point to
backend, frontend, native, CLI, experiment, library, and cross-cutting concerns
according to the selected pair; the catalog as a whole is not “the backend
architecture.”

After a profile is explicitly adopted or adapted, five initial source
structures can be rendered from
`architecture-scaffold-profiles.json`:

| Profile | Selected technology | Preserved source boundary |
|---|---|---|
| `backend-bun` | `backend-stack:bun-hono` | `src/<app>/startup`, `src/<app>/modules/<module>`, `src/libs` |
| `backend-go` | `backend-stack:go-standard-library` | `src/<app>/startup`, `src/<app>/modules/<module>`, `src/libs` |
| `backend-fastapi` | `backend-stack:python-fastapi` | `src/<app>/startup`, `src/<app>/modules/<module>`, `src/libs` |
| `frontend-react-vite` | `frontend-stack:react-vite` | `src/app`, `src/features/<feature>`, `src/shared` |
| `frontend-nextjs` | `frontend-stack:nextjs` | thin `src/app` routes, `src/features/<feature>`, `src/shared` |

Infrastructure extensions do not generate provider configuration. Provider,
account, region, identity, state, secret, and policy details are target-specific
and must be selected from real evidence before any infrastructure code is
authored.

Preview is read-only:

```bash
python3 scripts/scaffold_architecture_default.py preview \
  --profile backend-bun \
  --target /path/to/new-source-root \
  --app-name api \
  --module-name orders
```

`write` is explicit and performs a complete conflict preflight. It creates new
files only; it has no overwrite mode, does not install dependencies, does not
run generated code, and does not select package versions.

## Pair Extension Rules

- Use existing logical node kinds before extending the schema.
- Keep graph dependencies acyclic; runtime retry or subscription loops can be
  described in the spec without making the catalog dependency graph cyclic.
- Put language-specific file names in specs, not logical node IDs.
- Keep concrete application package names in the matching contour technology
  extension and infrastructure product names in the matching resource
  extension. Base selection graphs own policy and routing.
- Name source of truth, public contracts, state ownership, external adapters,
  asynchronous boundaries, and operational evidence where they exist.
- Include negative selection cues and validation obligations.
- Do not include generated source, locks, vendor configuration, credentials, or
  target-specific stack facts in this entry.
- Update the pack and validator when a required pair, relationship contract, or
  schema invariant changes.
