# Persona And Simulation Governance Contract

Status: `approved for implementation`
Source identity: user request to implement the 2026-08-04 architecture,
defaults, persona, and simulation gap audit
Owner: Cascade maintainers

## Outcome

Cascade must support a governed, bidirectional product-persona and synthetic-
population loop:

1. reviewed product personas and evidence sources seed explicitly derived
   simulation populations;
2. simulations may emit immutable refinement proposals;
3. accountable reviewers disposition proposals against external evidence;
4. an accepted disposition authorizes `synthesis-to-spec -> compose-spec` to
   author a new persona revision, but never mutates the persona directly.

## Requirements

### PSG-001 Persona source governance

Executable persona derivations must bind a reviewed or approved persona
revision plus evidence-source governance. Non-fixture sources declare an exact
digest, source authority, reference window, usage rights, sensitivity,
retention policy, permitted purpose, and prohibited uses. Fixture evidence is
explicitly incapable of supporting product, prevalence, or release claims.

### PSG-002 Typed synthetic behavior

Persona-derived actors use typed decision, communication, memory, and
abstention policies. Unknown fields and invalid enum values fail before
campaign execution. Generator identity and complete input digests remain
mandatory.

### PSG-003 Claim-level population authority

Every claim declares the population authority it needs:

- `none`: population provenance cannot support the claim;
- `persona-derived`: at least one current schema-v2 persona derivation is
  required;
- `estimated-prevalence`: representative, evidence-backed prevalence weights
  and non-fixture target calibration are required.

Legacy schema-v1 populations may support mechanics-only claims but cannot
satisfy persona-derived or prevalence authority.

Authority is reduced with the claim after immutable execution evidence exists.
An authored future-facing claim may resolve, but it remains `NOT_RUN` until its
declared population authority is present; authority cannot be inferred from a
generic population or compensated for by other passing gates.

### PSG-004 Governed refinement disposition

Refinement proposals remain immutable and `PROPOSED`. A separate disposition
receipt binds the exact proposal digest, persona revision, derivation, frozen
simulation evidence, external evidence, reviewer identity, decision, and time.
The disposition command verifies the proposal's completed immutable run before
review and rejects an arbitrary file placed under an artifact-shaped path.
Only `ACCEPTED` dispositions with reviewed external evidence may set
`persona_revision_authorized=true`; even then, direct persona mutation remains
false and the next route is `synthesis-to-spec`.

### PSG-005 Artifact and privacy defaults

Persona and refinement evidence defaults to local, append-only, content-bound
storage. Raw sensitive source material is not copied into actors, prompts,
traces, or durable docs. Retention, deletion, export, remote storage,
encryption, and access policy must be explicit before non-fixture product
evidence is executed.

## Behavior Examples

- Given a persona derivation with missing usage rights or retention metadata,
  campaign resolution fails before execution.
- Given a legacy population and a persona-derived claim, claim reduction
  returns `NOT_RUN` instead of treating generic synthetic actors as persona
  evidence.
- Given an accepted proposal without external evidence or accountable review,
  disposition creation fails and no persona revision is authorized.
- Given a valid accepted disposition, the receipt routes to
  `synthesis-to-spec`; no runtime path edits the source persona.
- Given only framework fixtures, product execution, target calibration, and
  release eligibility remain `NOT_RUN`.

## Non-Goals

- Fabricating a real P-001 persona or external evidence.
- Treating synthetic frequency as user prevalence.
- Automatically applying model-generated persona changes.
- Claiming target calibration, product efficacy, deployment, or release
  readiness from deterministic fixtures.

## Architecture And Default Dispositions

| Decision | Disposition | Current default | Adaptation boundary |
|---|---|---|---|
| product/synthetic persona authority | `ADOPTED` | reviewed Markdown persona -> digest-bound derivation -> typed population | targets replace fixtures with governed evidence and accountable review |
| population weighting | `ADOPTED` | `test-allocation`; never prevalence by inference | `estimated-prevalence` requires representative mode, reviewed evidence, and non-fixture calibration |
| refinement feedback | `ADOPTED` | append-only proposal plus separate disposition; no direct mutation | accepted receipts route to `synthesis-to-spec` |
| product-evaluation artifacts | `ADOPTED` | local append-only, minimized digest metadata, no raw sensitive material, no remote export | targets may adapt the public policy only with explicit encryption, access, retention, and export decisions |
| model-backed persona generation | `GAP` | deterministic manifest generation only | separate provider, prompt/tool digest, spend, privacy, and evaluation authorization required |
| generic application stack defaults | `NOT_APPLICABLE` | Cascade remains a harness scaffold with no target application runtime | select and record architecture-default pairs during target onboarding |

These are Cascade harness defaults, not evidence that a target has adopted an
application stack or completed target security review.

## Acceptance Evidence

- schema/runtime parity and negative contract tests;
- CLI dry-run and write-path tests for disposition receipts;
- complete starter-template and current-fixture migration;
- generated catalog and repository validator checks;
- aggregate Bun regression suite;
- fixed-point Standards, Spec, and security findings review;
- live product evidence, independent W-004 acceptance, and real-user efficacy
  remain separate required gates.
