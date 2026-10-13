# Stateful claims/actions profile

Load only when explicitly requested or already adopted by the target.
Use [the versioned architecture](analyzer-policy-composer.md) and its claims/actions
admission contract. Do not rebuild the former writable-operation or conversion protocol.

The host owns current state, policy, authorization, persistence, source catalogs,
receipts and publication. Analyzer owns semantic claims and action requests. Admission
validates those records. Policy Engine orchestrates eligible Researcher or Composer
calls. A Context Builder for each role exposes only its authorized current view.

Begin with one process and direct calls. Research is conditional; a graph runtime,
voice renderer, broker or distributed service requires a concrete target need.
Context freshness and source identity are mandatory regardless of topology.

Claims, observations, domain state and derived memory remain distinct. No model may
promote an inferred claim to verified state or write memory through an output field.
Any domain change uses a separate authorized host operation and an observable receipt.
