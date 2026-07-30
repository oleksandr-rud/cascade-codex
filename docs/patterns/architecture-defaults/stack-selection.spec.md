# Stack Selection Strategy

- Pair ID: `stack-selection`
- Graph: `docs/patterns/architecture-defaults/stack-selection.graph.yaml`
- Status: `reference-default`

## When This Is The Default

Use after architecture selection when one or more deployed, versioned, or
distributed application or package units need application/runtime classes plus
data, messaging, build, test,
observability, and delivery capability contracts. Start from project
descriptions and existing-code evidence, normalize stack-relevant claims and
policies, and make a separate selection for each application unit. Concrete
application technologies and operated infrastructure resources are selected by
separate extensions. Do not reopen a coherent target stack for novelty or a
small local library choice.

## Default Architecture

```text
project descriptions and current code
  -> source-linked claims
  -> required / preferred / forbidden / proof-required policies
  -> deployed, versioned, or distributed application and package units
  + selected architecture and constraints
  + team and operating capability
  -> small candidate profiles
  -> highest-risk proof slice
  -> chosen profile
  -> logical responsibility to idiomatic path mapping
```

Compare profiles as complete capability systems, not isolated frameworks or
provider products:

| Dimension | Default question |
|---|---|
| Product fit | Does it support required interfaces, state, offline, realtime, rendering, and latency? |
| Architecture fit | Can it express the selected ownership and dependency direction directly? |
| Team fit | Can current owners build, debug, secure, deploy, and upgrade it? |
| Ecosystem | Are core dependencies maintained, interoperable, observable, and replaceable? |
| Delivery | Are builds, tests, migrations, releases, rollback, and local development reliable? |
| Lifecycle | What are support horizon, upgrade burden, security cadence, hiring, and runtime cost? |

### Project Description Claim Extraction

Read project descriptions, requirements, architecture notes, operational
documentation, policy sources, and current code before proposing candidates.
Normalize only stack-relevant statements:

| Claim class | Typical evidence |
|---|---|
| Product capability | Public workflows, background work, collaboration, offline, search, media, or ML behavior |
| Interface and rendering | API consumers, SEO, server rendering, browser-only interaction, streaming, or platform UI |
| Workload and performance | Request rate, concurrency, CPU, memory, latency, startup, batch, or long-running jobs |
| Data and consistency | Transaction boundaries, data volume, relational shape, event ordering, durability, and residency |
| Platform and distribution | Browser, server, edge, mobile OS, desktop OS, shell, single binary, store, or package constraints |
| Operations and lifecycle | Hosting, observability, rollback, support horizon, security updates, hiring, and on-call ownership |

Every claim uses the record in
`stack-selection-evidence.schema.json`:

```text
claim ID
  + source ID, path, revision, and anchor
  + atomic statement and claim class
  + affected application units
  + EXPLICIT | INFERRED | UNKNOWN | CONFLICTING
  + HIGH | MEDIUM | LOW confidence
```

Do not promote marketing language, a repository label, or an inferred
preference into a mandatory constraint. An inference may create a question or
proof obligation. Conflicting mandatory claims block selection until an owner
supersedes one source.

### Evidence Data Handling

`stack-selection.json` is durable decision metadata, not a secret store or raw
evidence archive. Record source identifiers, repository-relative paths,
revision or content digests, anchors, classifications, and redacted atomic
summaries. Do not copy credentials, tokens, private keys, tenant/customer
payloads, private source bodies, production request bodies, or unrestricted
operational data into claims, policies, reasons, proofs, or policy evidence.

Keep the record under the target repository's normal review and access policy.
Name the owner, intended readers, retention period, deletion route, and any
more restricted external evidence location. A restricted source is referenced
by opaque ID, digest, classification, and access owner; its contents stay in
the authorized system. Run repository secret scanning and representative
credential-leakage fixtures before accepting or publishing the evidence.

### Selection Policy Contract

Policies turn normalized claims and organization constraints into candidate
consequences:

| Mode | Consequence |
|---|---|
| `REQUIRED` | Candidate is eligible only if it satisfies the predicate. |
| `FORBIDDEN` | Candidate is rejected when the predicate matches. |
| `PROOF_REQUIRED` | Candidate remains conditional until the named proof passes. |
| `PREFERRED` | Candidate gains comparative weight only after hard policies pass. |

Evaluate hard policies before preferences. Every policy keeps source IDs,
predicate, consequence, and affected application units. If required and
forbidden policies collide, record `GAP`; do not choose the highest numeric
score.

Candidate results use:

```text
ELIGIBLE | REJECTED | PROOF_REQUIRED | GAP
```

Each result names the application unit, candidate, supporting claim IDs,
and one evaluation for every applicable policy. Policy outcomes are
`SATISFIED`, `VIOLATED`, `NOT_APPLICABLE`, or `PROOF_PENDING`; candidate
status is derived from those outcomes, unresolved claims, and available proof.

### Application Contour Profiles

An application contour is one independently deployed, versioned, or
distributed application or package type for stack selection. It is not a
simulation-campaign contour.

| App type | Default selection focus | Paired architecture | Planned infrastructure profile |
|---|---|---|---|
| `backend-service` | Interfaces, transaction/data ownership, latency, concurrency, integrations, deployment, and operations | `service-api-worker` | `backend-infrastructure` |
| `backend-worker` | Delivery guarantees, job duration, CPU/I/O shape, retries, idempotency, schedules, and scale | `service-api-worker`; optionally `event-driven` | `backend-infrastructure` |
| `web-frontend` | Rendering, routing, server/client boundary, state/data, realtime, accessibility, and delivery | `web-frontend` plus justified frontend extensions | `frontend-infrastructure` |
| `native-app` | Platform capability depth, lifecycle, offline/sync, device APIs, distribution, and cross-platform reuse | `native-app` | `native-infrastructure` |
| `cli` | Automation contract, startup, portability, single-binary or runtime distribution, plugins, and shell behavior | `cli` | `cli-infrastructure` |
| `experiment` | Ecosystem fit, reproducibility, acceleration, artifact authority, analysis, and promotion path | `experiment` | `experiment-infrastructure` |
| `library` | Consumer contract, target languages/platforms, generation, compatibility, packaging, versioning, deprecation, and distribution | `sdk-library` | `library-infrastructure` |

The backend, frontend, native, CLI, and experiment infrastructure profiles are
validated by W-018-W-023. W-024 adds the serialized library profile without
changing their resource authority.

A repository may contain several application contours. Shared domain,
contracts, or technical primitives do not justify one runtime for every unit.
Conversely, do not introduce polyglot deployment when the same supported stack
satisfies the claims and policies of several units.

### Stack Extension Profiles

After the complete profile is selected, open only the extension branches that
remain undecided:

```text
stack-selection
├─ app-stack
│  └─ backend | frontend | native | CLI | experiment | library stack
└─ infrastructure
   ├─ backend | frontend | native | CLI | experiment | library infrastructure profile
   └─ compute | data | messaging | delivery resource extension
```

Application technology and infrastructure may reuse the same sources, claims,
policies, and application-unit identities, but they produce separate candidate
results and proof gates. A valid framework choice does not prove its hosting,
database, broker, network, delivery, secrets, or observability topology.

### Infrastructure Resource Profiles

Infrastructure selection adds deployment scopes and resource units to
`stack-selection.json`:

| Record | Owns |
|---|---|
| Deployment scope | Environment, regions, application consumers, isolation, claims, and policies |
| Resource unit | Compute, data, cache, messaging, network/edge, delivery, secrets, observability, or artifact storage owner and lifecycle |
| Infrastructure candidate | Resource-specific candidate, supporting claims, complete policy outcomes, disposition, reason, and proof |
| Selected resource | One eligible candidate bound to one resource unit |

Shared resources list every consuming application unit. Each resource belongs
to one deployment scope and one infrastructure extension. Do not force a
resource per application when a shared topology has explicit isolation,
capacity, failure, and lifecycle contracts.

Resolve the application contour profile before opening resource candidates:
the profile decides which resource roles are justified and where remote
backend ownership begins; the resource extensions remain the only authorities
for concrete compute, data, messaging, and delivery/provider selection.

## Reference File Structure

Keep the selected profile in the target's existing architecture/config owners:

```text
harness.config.yaml        # detected stack and real commands
docs/architecture/
  stack-profile.md         # constraints, choice, rejected profiles, proof
  boundary-map.md          # logical graph to stack mapping
  stack-selection.json     # sources, claims, policies, app units, infrastructure scopes/resources, results
<package/build manifests>  # executable dependency and toolchain authority
```

Validate `stack-selection.json` against:

```text
docs/patterns/architecture-defaults/stack-selection-evidence.schema.json
```

Backend profiles should map to `src/<app-name>/startup`,
`src/<app-name>/modules`, and shared `src/libs` where the service archetype is
adopted. Web profiles cover framework/rendering, router, data client, client
state/forms, styling/UI platform, testing, build, and deployment. Native, CLI,
experiment, and library profiles use their paired archetype specs.

## Default Decisions

- Prefer the existing supported stack when it meets mandatory constraints.
- Extract atomic, source-linked claims before creating candidate profiles.
- Keep durable evidence to references, digests, classifications, and redacted
  summaries; reject secrets and tenant/customer payloads.
- Classify each independently deployed, versioned, or distributed backend,
  worker, web, native, CLI, experiment, or library unit and decide its stack
  separately.
- Apply required and forbidden policies before proof obligations and
  preferences.
- Keep application-technology and infrastructure-resource candidates in
  separate extension branches and independent verdicts.
- Route every application unit to its matching contour infrastructure profile
  before selecting each operated resource through a resource extension.
- Treat inferred, unknown, and conflicting claims as questions, proof tasks, or
  gaps rather than hidden requirements.
- Compare at most a small number of complete profiles and name disqualifiers.
- Use current primary documentation and a narrow proof for unstable or
  high-risk capabilities; do not infer production fitness from popularity.
- Pin only constraints that affect reproducibility or compatibility, and name
  upgrade ownership.
- Keep business and domain code independent of framework-specific adapters
  where the selected architecture defines a port.

### Frontend Stack Profile

For a frontend profile, decide the whole client delivery path:

| Concern | Selection evidence |
|---|---|
| Framework and rendering | Route interactivity, server/client data sensitivity, SEO, streaming, hydration, and hosting |
| Routing and composition | Route ownership, layouts, guards, code splitting, feature entrypoints, and server-only boundaries |
| Data client | API contract, query identity, mutation reconciliation, cancellation, SSR hydration, and error translation |
| Client state and forms | State categories, workflow complexity, validation, offline needs, and debugging |
| Realtime | Required freshness, direction, ordering, reconnect, resume, and server capability |
| Styling and UI platform | Tokens, accessibility primitives, theming, localization, component ownership, and packaging |
| Testing | Unit seams, component checks, browser journeys, accessibility, visual evidence, and contract tests |
| Build and delivery | Bundling, code splitting, source maps, environment config, telemetry, CDN/edge behavior, and rollback |

Use `web-frontend` for base boundaries and select only the
`frontend-state-data`, `frontend-cache`, `frontend-realtime`, and
`frontend-ui-platform` extensions justified by this evidence.
Use `frontend-infrastructure` for static, SSR, streaming, edge, embedded-BFF,
and fullstack resource boundaries, then select only the compute, data,
messaging, or delivery resources that those boundaries justify.

## Validation Contract

- Run the highest-risk vertical slice through build, test, failure, telemetry,
  and deployment or packaging paths.
- Validate source, claim, policy, application-unit, and candidate-result
  references against `stack-selection-evidence.schema.json`.
- Verify every explicit claim resolves to a real source and every inferred
  claim remains distinguishable from confirmed project intent.
- Verify each application unit has independent candidate results and that
  shared-stack decisions do not erase unit-specific policy failures.
- Verify each infrastructure resource belongs to a deployment scope, lists its
  application consumers, evaluates all applicable policies, and selects only
  an eligible candidate.
- Verify dependency health, security-update route, version compatibility,
  local developer workflow, CI feasibility, and rollback.
- Confirm every architecture node has one idiomatic owner path and no framework
  shortcut bypasses application, domain, tenant, or interface boundaries.
- Separate documentation review, local proof, production evidence, and
  long-term operational confidence.

## Exceptions

A mandated platform, embedded runtime, regulated environment, specialist
performance requirement, or existing production estate may fix most of the
stack. Record the constraint, evaluate only meaningful remaining choices, and
mark the catalog decision `ADAPTED` rather than staging a parallel stack.

If project descriptions are too thin to classify an application unit or apply
hard policies, record `GAP` and request only the missing product, workload,
platform, or operations fact. Do not fill the gap by selecting the most common
framework.
