# Pilot reference pack — version 1

These are synthetic operating observations and design constraints authored for
this experiment. They do not claim customer research, regulatory authority or
an external standard. The public brief wins if an example conflicts with it.

## R1 — One operator, one local installation

The coordinator uses one local application and has no identity provider,
message broker, remote storage or separate operations team. Deployable units,
dependencies and indirection need a current behavioral or operational reason.
Keep a future requirement as future work instead of implementing it speculatively.
An abstraction is useful when it protects an actual boundary or reduces present
duplication; a single call site alone does not establish either benefit or harm.

## R2 — Durable data owns the record

The browser's current list can become stale. The server must validate every
write independently of browser validation. Only a successful durable write
establishes completion. An invalid change must preserve the prior record;
multiple successful requests must not overwrite one another. Keep storage
ownership identifiable, and avoid making a test substitute the only persistence
path. A success message must reflect the server outcome.

## R3 — A coordinator can recover

Empty results should help the coordinator create a request or adjust a filter.
Preserve draft input after a failed save and provide an understandable recovery
action. Labels, keyboard navigation and native control semantics matter more
than decorative controls. Treat names and descriptions as untrusted literal text.

## R4 — Extension is evidence, not prediction

Prefer a design whose existing UI, HTTP and persistence paths can be traced.
A later requirement should reuse actual validation and storage rules where that
prevents inconsistent behavior. Do not create an extension registry, generic
workflow engine or universal repository solely because requirements may change.
Conversely, do not collapse necessary validation or transaction boundaries only
to minimize file counts. Judge complexity by the cost it creates for this app.
