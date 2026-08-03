# Personas Index

Use personas only when user roles, goals, constraints, or content/design choices
change behavior.

Product personas are reviewed product evidence. Each persona must carry a
stable `P-XXX` ID, positive revision, evidence/confidence and uncertainty,
reference window, permitted uses, prohibited claims, invalidation signals, and
review owner. Synthetic actors never become product-persona evidence merely by
being plausible or repeatedly simulated.

Machine-readable simulation derivations live under
`evals/simulations/<simulation-id>/derivations/`. They bind an exact persona
path, revision, and SHA-256 digest; tooling must not infer executable actor
traits by parsing persona Markdown. Simulation findings may create immutable
refinement proposals, but a new persona revision still requires external
evidence and accountable human review through
`synthesis-to-spec -> compose-spec`.

| ID | Persona | Source | Notes |
|---|---|---|---|
| P-001 | `<ROLE_OR_USER_GROUP>` | `<SOURCE>` | `<JOB_OR_CONSTRAINT>` |

`P-999` is reserved for deterministic framework fixtures and must never be
used as product or market evidence.
