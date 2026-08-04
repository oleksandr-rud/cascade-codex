# Product Context

Reusable product-context rules live here. Product facts, IDs, evidence records,
and generated briefs remain in `docs/product/` and `docs/specs/`; this entry
owns only the durable assembly, authority, and promotion rules that several
skills or target repositories may reuse.

## Product Authority Graph

Use this graph when product material must be assembled without creating a
second authority:

```text
source or approved decision
  -> product domain (PD-XXX)
  -> capability (PC-XXX)
  -> persona / journey / requirement / scenario owner rows
  -> spec packet or brief manifest (PB-XXX selection)
  -> generated brief projection
  -> plan, implementation, functional evidence, or product simulation
```

`docs/product/catalog.yaml` owns only stable relationships and exact
references. Each linked owner document retains its detailed facts and status.
Generated briefs and active plans are projections. A path, folder title,
workline, campaign, or simulation ID does not implicitly create a product
domain or capability.

Require unique stable IDs, one declared domain per capability, bounded source
paths, existing owner references, explicit evaluation authority, and no orphan
product rows. Update the catalog and owner docs together when a relationship
changes.

## Brief Manifest And Compilation

A brief manifest is a deterministic source-selection contract. It names one
domain and capability, coverage mode, exact product references, source
documents, evidence metadata, pattern sections, simulation/evaluation context,
gaps, non-goals, and output path.

Validate the complete reference graph before rendering. `complete` coverage
must equal the capability relationship set. `selected` coverage records every
omitted capability reference and why. Fail closed on duplicate or unknown IDs,
missing paths, repository escape, missing pack/section IDs, incompatible
domain/capability pairs, unsupported evidence authority, or stale generated
output.

Render summaries and owner rows before longer reusable context. Preserve a
source boundary for every compiled section and bind the projection to stable
catalog, manifest, and selected-source digests. Equivalent input must produce
byte-identical output; do not embed a generation timestamp.

## Evidence Promotion Boundary

Keep evidence class, authority, status, limitations, reference date, and
supported claim or decision distinct. User-provided facts can guide their
declared scope. Research can support methodology and questions. Harness
evaluations prove harness behavior. Harness simulations prove mechanics.
Product simulations may support target claims only after current target
execution, evaluation, policy/oracle, cleanup, and calibration gates.

Never promote plausibility, repetition, model agreement, an authored file, or
a context-pack selection into empirical product evidence. A generated brief
may carry `GAP`, `NOT_RUN`, or historical sources; it must not summarize those
states as approval or proof.

## Simulation Feedback Bridge

A reviewed product persona may seed a synthetic population only through an
explicit digest-bound derivation with governed evidence and typed behavior.
Simulation findings may produce immutable proposals, research questions,
simulator repairs, or candidate refinements. They never validate or mutate the
source persona.

When a refinement is supported by external evidence and an accepted
append-only disposition, route it through `synthesis-to-spec -> compose-spec`
to author a new reviewed persona revision. Recompute every affected brief,
derivation, population, campaign, claim, and evaluation binding after the
source revision changes.
