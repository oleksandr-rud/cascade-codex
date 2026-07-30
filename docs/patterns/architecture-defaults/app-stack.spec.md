# Application Stack

- Pair ID: `app-stack`
- Graph: `docs/patterns/architecture-defaults/app-stack.graph.yaml`
- Status: `reference-default`

## When This Is The Default

Use after `stack-selection` has produced a complete profile for one application
unit. This pair owns application-stack policy and routes the unit to one
contour extension. It does not own compute, databases, cache services, brokers,
networks, delivery pipelines, or observability infrastructure.

## Default Architecture

```text
source-linked claims and policies
  + selected stack profile
  + one application unit
  -> backend | frontend | native | CLI | experiment | library extension
  -> candidate results
  -> highest-risk application-technology proof
  -> selected technologies and owners
```

The stable `app-stack` ID remains the routing and policy authority.
Concrete candidates live only in:

| Extension | Owns |
|---|---|
| `backend-stack` | API and worker runtimes, HTTP frameworks, process and packaging choices |
| `frontend-stack` | Web framework, state/data, UI/component, styling, documentation, and realtime libraries |
| `native-stack` | Platform-native versus cross-platform application technology |
| `cli-stack` | Compiled versus runtime-distributed CLI technology |
| `experiment-stack` | Reproducible experiment language, environment, notebook/script, and acceleration technology |
| `library-stack` | SDK/library language, generation, binding, package, compatibility, and distribution technology |

### Claim And Policy Inputs

Load one application unit from a validated
`stack-selection-evidence.schema.json` record. Every candidate keeps supporting
claim IDs and one outcome for every policy assigned to the unit:

```text
SATISFIED | VIOLATED | NOT_APPLICABLE | PROOF_PENDING
```

Candidate disposition remains:

```text
ELIGIBLE | REJECTED | PROOF_REQUIRED | GAP
```

Hard-policy violations derive `REJECTED`, pending proof derives
`PROOF_REQUIRED`, and unknown or conflicting supporting claims derive `GAP`.
Preferences rank only candidates that survive hard policies.

### Application Type Routing

| Application type | Required extension | Base archetype |
|---|---|---|
| `backend-service` | `backend-stack` | `service-api-worker` |
| `backend-worker` | `backend-stack` | `service-api-worker`; optionally `event-driven` |
| `web-frontend` | `frontend-stack` | `web-frontend` plus justified frontend policy extensions |
| `native-app` | `native-stack` | `native-app` |
| `cli` | `cli-stack` | `cli` |
| `experiment` | `experiment-stack` | `experiment` |
| `library` | `library-stack` | `sdk-library`; compose `frontend-ui-platform` for a separately released UI component library |

Do not load every child catalog. A repository may adopt different technologies
for several application units while sharing contracts or technical primitives.
Cross-unit reuse does not require one runtime, and a second runtime is not
justified without stronger product or operational evidence than its lifecycle
cost. An application-owned `src/libs` or `src/shared` folder is not a
`library` application unit unless it has an independent owner plus a real
versioning, release, distribution, or external-consumer boundary.

## Reference File Structure

Record selection in the target's existing owner:

```text
docs/architecture/
  stack-selection.json
  technology-profile.md
<language or package manifests>
```

The app-stack profile identifies the application unit, selected child
extension, candidate results, proof, selected versions or constraints, rejected
alternatives, upgrade owner, and mapping to the adopted archetype.

## Default Decisions

- Use claims and policies before popularity or team curiosity.
- Prefer the supported established application stack when it fits.
- Route one application unit to one contour stack extension.
- Keep framework routes, handlers, components, commands, and platform callbacks
  as interface adapters around application contracts.
- Keep database, cache, broker, cloud, and observability product selection in
  `infrastructure` and its extensions.
- Prove the riskiest versioned integration before adoption.

## Validation Contract

- Validate application candidate references and policy outcomes against
  `stack-selection-evidence.schema.json`.
- Confirm the child extension matches the application type.
- Confirm the selected technology preserves archetype ownership and dependency
  direction.
- Verify build, test, security-update, packaging, deployment-compatibility,
  observability-integration, and upgrade ownership.
- Mark unexecuted proof `NOT_RUN` with blocker and next gate.

## Exceptions

A platform mandate may preselect application technology, but it does not waive
boundary, compatibility, security, accessibility, packaging, or operations
validation. If the matching child extension lacks the required named
technology, record an adapted candidate or `GAP`; do not put the candidate back
into this routing pair.
