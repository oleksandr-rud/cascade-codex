# Product Context

Organize accepted product facts around the product's actual structural units.
Choose contours, modules, features, models or another established vocabulary
from current source and approved intent. Do not generate every folder variant
or infer ownership from keyword matches. Create a unit only when it has a
real scope, owner and accepted relationships.

The unit template is [unit-template.md](unit-template.md). It is a renderer,
not a second product-definition method; Cascade Product owns that method.
A small unit can use one document. Split requirements, journeys, scenarios or
models only when the separate owner or repeated consumption warrants it.
Preserve stable IDs and link shared sources instead of copying them.

## Catalog And Briefs

[catalog.yaml](catalog.yaml) binds stable PD/PC identities to accepted owner
sources and evidence. These are catalog identities; they do not require
folders named domains or capabilities. Optional `reference_documents` declares
exact requirements, journeys and scenarios owner paths under docs/product/.
Each kind can select several unit ledgers or no ledgers when not applicable.
A small unit can declare the same document for several kinds; each kind
selects its distinct owner table. Duplicate paths within a kind are rejected.
Owner-table columns must agree within a kind; IDs resolve globally once.
Legacy catalogs without this field retain their existing flat file paths.

Brief manifests remain in docs/specs/{slice-slug}/brief.yaml. The compiler
selects exact rows, binds the selected owner documents and contract digests,
and detects stale generated projections. A brief is context, never execution
authority or behavioral proof. Persona methods belong to Cascade Personas;
synthetic regression inputs cannot become target-product evidence.

## Current Cascade Units

This source checkout currently catalogs one adopted contour:
[context and simulation](contours/context-and-simulation/_index.md). It holds
PC-001 persona-derived simulation, PC-002 brief assembly and PC-003 simulation
intake/agent handoff. This is the current accepted catalog scope, not a claim
that it describes every Cascade runtime/plugin capability.

Target bundles include generic rules, schemas and the unit template. They
exclude this catalog, its source facts, fixture personas and unit documents.
