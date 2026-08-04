# Work Lane: W-029 Persona And Simulation Gap Closure

Status: `COMPLETE`
Planning Status: `COMPLETE`
Plan Revision: `1`
Owner: `agent-engineer`
Created: 2026-08-04
Lane Model: `sequential-pipeline`
Next Gate: `automatic closeout archive`
Execution Surface: `root`
Dispatch State: `COMPLETE`
Dispatch Authorization: user request `implement the fixes, cover the gaps`, 2026-08-04
Runtime Handle: current root task

## Request And Intended Behavior

Close the actionable architecture/default, persona, and simulation gaps found
in the 2026-08-04 audit without fabricating real-user evidence or weakening
W-004's independent acceptance boundary.

Authoritative product contract:
`docs/specs/persona-simulation-governance/contract.md` (`PSG-001` through
`PSG-005`).

## Scope And Non-Goals

In scope:

- governed persona evidence metadata and structural source checks;
- typed actor behavior policies;
- claim-level population authority;
- immutable refinement disposition receipts and CLI workflow;
- local artifact/privacy defaults, schemas, templates, fixtures, docs, tests,
  catalogs, and validators;
- W-004/WG-001 source-invalidation reconciliation.

Out of scope:

- inventing P-001, external evidence, consent, or prevalence;
- model/provider spend, live product execution, remote storage, deployment,
  release eligibility, commit, push, publication, or independent acceptance;
- implementing W-005 through W-010 or W-012 surface adapters.

## Architecture And Security Decisions

- Product persona Markdown remains the reviewed narrative authority; executable
  derivations bind it by ID, revision, status, and digest and additionally bind
  governed evidence sources.
- Refinement review is a separate append-only receipt. It may authorize a new
  revision workflow but never writes the persona itself.
- Non-fixture raw evidence stays outside durable actor/prompt artifacts; only
  minimized metadata and digests cross the boundary.
- Schema-v1 populations remain mechanics-compatible but cannot satisfy
  persona-derived or prevalence claims.
- One serialized lane owns overlapping schema/runtime/template writes. W-004
  is a protected consumer; its attempt-5 independent review waits for fresh
  current-source validation after W-029.

## Fragment And Workline Composition

| Fragment | Disposition | Bound obligation | Evidence |
|---|---|---|---|
| `GF-001@1` | `SELECTED` | PSG requirements and CLI behavior examples | PR-001 through PR-005; PS-001 through PS-005 |
| `GF-004@1` | `SELECTED` | versioned schemas and producer/consumer parity | contract tests and fixed-point architecture findings |
| `GF-008@1` | `MERGED` | schema/runtime/template/catalog wiring | integrated repository validation |
| `GF-009@1` | `SELECTED` | public CLI disposition journey and negatives | Bun CLI tests |
| `GF-101@1` | `SELECTED` | sensitive-source minimization, rights, retention, and no-direct-mutation controls | negative tests plus findings-only secure-design review; independent acceptance `NOT_RUN` |

One lane owns the complete slice because all fragments share public schemas,
runtime files, templates, and one acceptance seam. No Coordination Graph is
created; WG-001 remains the authority for W-004 cross-surface dependencies.

## Task Graph

Lane-state owner: `agent-engineer`. Graph revision: `1`.

| Node | Obligation | Requires | Gate | Status |
|---|---|---|---|---|
| `W-029-N01` | freeze governance definitions, impacts, security controls, and behavior examples | user authorization | `W-029-G01` | accepted |
| `W-029-N02` | implement schemas, runtime validation, fixtures, and templates | `W-029-G01` | `W-029-G02` | accepted |
| `W-029-N03` | implement immutable disposition receipt CLI/storage workflow | `W-029-G02` | `W-029-G03` | accepted |
| `W-029-N04` | update defaults, docs, generated catalogs, and W-004 projections | `W-029-G03` | `W-029-G04` | accepted |
| `W-029-N05` | run functional, regression, review, validation, and closeout evidence | `W-029-G04` | `W-029-GT` | accepted |

Failure reopens the earliest responsible node. Self-review cannot satisfy any
independent W-004 or security acceptance gate.

## Feature Impact Matrix

| Feature | Direct contract | Protected behavior | Required check |
|---|---|---|---|
| persona derivation | PSG-001/002 | exact revision/digest/status and generator input binding | persona definition tests |
| campaign claims | PSG-003 | existing mechanical/framework claim reduction | claim authority integration tests |
| refinement proposals/dispositions | PSG-004 | immutable proposals and no direct persona mutation | CLI and artifact tests |
| artifact/privacy defaults | PSG-005 | secret redaction, bounded writes, frozen evidence | negative governance/security probes |
| W-004 shared source | WG-001 revision 11 | topology, ownership, failed historical receipts, downstream gates | full Cascade validation and explicit revalidation boundary |

## Validation Plan

- focused Bun tests for persona, simulation definitions, evaluation, artifacts,
  initializer, and CLI behavior;
- exact Bun 1.3.3 aggregate tests;
- repository validator, both catalog checks, harness/target/campaign self-tests;
- initializer and disposition dry-runs, JSON parsing, stale-reference scans,
  source/diff binding, and `git diff --check`;
- findings-only Standards, Spec, fragment-coverage, and secure-design review;
- independent W-004 and security acceptance remain `NOT_RUN` unless separately
  produced by the named authorities.

## Terminal Acceptance

`W-029-GT` is `ACCEPTED` for the scoped local implementation. Exact Bun 1.3.3
validation passed 101/101 aggregate tests, the repository validator, both
catalog checks, all three self-tests, owned JSON parsing, artifact cleanup, and
diff whitespace. The campaign catalog is current at
`006fd8ad45d0b51c8544cdfe5ef1b6788afd5f474053eda46a757f5011dea236`.

The fixed-point review repaired two pre-closeout findings: population
authority now binds the exact claim `population_id`, and restricted evidence
requires encryption/access operator attestation. Disposition creation also
verifies the completed immutable run and proposal/run identity before writing
an append-only receipt.

No real product persona, target-product simulation, model-backed generation,
live/provider execution, target calibration, independent W-004/GF-101 review,
deployment, or release eligibility was produced. Those remain explicit
`NOT_RUN` or external-input gates rather than W-029 failures.
