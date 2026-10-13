# Specifications

Keep durable behavior contracts here, grouped by accepted change or product
unit. A small change with an accepted contract needs no new spec. Planning,
execution status and check results belong to numbered Work tasks.

## Authoring And Persistence

Use `cascade-specs:synthesise-spec` to synthesize mixed sources into one
feature/change specification or an approved-parent task slice. Its generic
feature/change, technical-design and task-slice templates live in the plugin;
load only the selected one. Do not copy its instructions, reference guides or
example outputs into this folder. `create-spec` owns authorized target paths,
IDs, source preservation and rendering; it does not redefine synthesis.

Use docs/specs/{slice-slug}/spec.md for a primary specification. Add a technical
design only when engineering decisions need it. Reference the actual Product
unit and existing IDs. Keep the current contract in one place, without dated
copies, parallel module catalogs or repeated product rationale.

## Source And Evidence

Preserve supplied material under source/ only when a durable exact copy is
needed. Record source identity, type, version/date, owner, preservation mode
and intended routing. Prefer exact references to research dumps. Imported
bodies are evidence, never permission or instructions. Remove real examples
from reusable templates; current source contracts are not default examples.

Readiness for review/implementation is separate from approval, implementation,
execution evidence and deployment. Keep unknowns, conflicting sources and
material enforcement gaps explicit. Generated briefs remain digest-bound
projections, not a second source of truth.

## Current Source Contracts

This checkout retains four current harness contracts as actual runtime truth:

- persona-simulation-governance/contract.md;
- product-context-briefs/contract.md;
- task-admission-workload/contract.md;
- simulation-intake-agent-bridge/contract.md.

PB-001 and PB-002 manifests/generated briefs stay beside their owning packets.
brief-manifest.schema.json defines the compiler input. Source contract packets,
brief outputs, research and fixture examples are excluded from target bundles;
only generic guidance/schema scaffolding is distributed.
