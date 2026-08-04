# Personas Index

Use personas only when user roles, goals, constraints, or content/design choices
change behavior.

Product personas are reviewed product evidence. Each persona must carry a
stable `P-XXX` ID, positive revision, evidence/confidence and uncertainty,
reference window, permitted uses, prohibited claims, invalidation signals, and
review owner. Synthetic actors never become product-persona evidence merely by
being plausible or repeatedly simulated.

Only persona revisions marked `reviewed` or `approved` may seed an approved
simulation derivation. `draft` and `superseded` revisions fail executable
source validation even when their ID, revision, path, and digest match.

Machine-readable simulation derivations live under
`product-evals/simulations/<harness|product>/<simulation-id>/derivations/`. They bind an exact persona
path, revision, and SHA-256 digest; tooling must not infer executable actor
traits by parsing persona Markdown. Simulation findings may create immutable
refinement proposals, but a new persona revision still requires external
evidence, a verified completed run, and an `ACCEPTED` append-only disposition
receipt before accountable human review continues through
`synthesis-to-spec -> compose-spec`. No receipt directly edits a persona.

Non-fixture derivations also declare source authority, reference window, usage
rights, sensitivity, retention, permitted purpose, prohibited uses, and exact
evidence digest. Restricted evidence requires an operator attestation for
encryption-at-rest and maintainer-only access. Actor decision, communication,
memory, and abstention policies are typed and reject unknown fields.

Persona-derived actor weights default to `test-allocation`. A derivation may
use `estimated-prevalence` only in representative mode with digest-bound
research or behavioral data, a reference window, sample description, and
reviewer. Generator input digests bind the complete manifest except for the
digest field itself and must be recomputed after any input change.

## Current Evidence Inventory

No non-fixture product persona is authored in this scaffold. `P-001` remains
unassigned until target research supplies governed external evidence; the
harness must not synthesize or infer that persona to fill the slot.

`P-999` is reserved for deterministic framework fixtures and must never be
used as product or market evidence.
