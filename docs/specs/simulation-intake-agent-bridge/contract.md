# Simulation Intake And Agent Bridge Contract

Status: `revision-24 proportional-routing clarification; intake-v6/action-binding-v2 and W-031 v41/core42 mechanical parity current at immutable r57, independent gates open`
Contract IDs: `SIB-001` through `SIB-006`
Source identity: 2026-08-04 request to connect prompt intake, product context,
simulation authoring, execution, evaluation, and product-doc refinement

## Outcome

A simulation request becomes runnable only through one digest-bound intake that
preserves the W-031 Task Envelope claims, selects the correct product context,
binds an explicit authored product seed map, computes the exact campaign action
policies, and hands distinct obligations to the author, operator, and evaluator
roles. The intake is an execution precondition, not a new product or policy
authority.

## SIB-001 Intake Scope And Authority

Simulation intakes live under exactly one physical root:

- `product-evals/intakes/harness/` for Cascade mechanics and harness behavior;
- `product-evals/intakes/product/` for target-product simulations.

The campaign `simulation_file` physical lexical root determines the permitted
`intake_file` root. That path equality is enforced by campaign schema and
runtime manifest validation, then replayed after the simulation manifest is
resolved. The intake's embedded `scope` cannot compensate for a cross-root
path. Replacement mode and the public writer apply the same check before the
Task Envelope snapshot or intake destination is written. The intake `scope`,
campaign simulation scope, and physical root must agree.
Harness intakes cannot bind a product brief or support target-product/persona
claims. Product campaigns require an `intake_file`; `DRAFT` and `BLOCKED`
intakes validate as planning artifacts but cannot execute.

## SIB-002 Task Envelope And Claim Binding

The W-031 compiler remains the authority for request relation, intent, typed
claims, workload, controls, and dispatch/permission gaps. Every simulation
change or operation prompt activates `SIMULATION_GOVERNANCE`. An ordinary
actor/interface simulation stays on the bounded `cascade-simulations:simulate`
route and does not create a campaign intake. Explicit controlled comparison,
calibration, repeated-run, product-intake, or release scope adds the connected
route, high assurance, independent evidence, and `simulation-campaigns`; this
contract owns that escalated campaign/intake boundary.

A compiled intake snapshots the current Task Envelope beneath its scope root
and binds its path, ID, revision, and SHA-256. Active, non-superseded Task
Envelope claims are copied as source-attributed intake claims; no claim is
silently upgraded from inferred or unknown to verified.

The intake also binds the producer's provenance-contract version and the exact
trusted source-segment/direct-user-attestation identity carried by each active
claim. READY validation and the run gate replay that projection against the
current Task Envelope. The intake does not infer provenance independently and
cannot repair a producer label after the fact. A producer provenance-version
change requires an explicit intake schema migration; legacy intake v1-v5 is not
silently reinterpreted.

Compilation without `--write` is a projection of persisted campaign state, so
it validates the currently referenced intake and cannot preview a replacement
for an unsupported legacy artifact. Only the explicit public
`simulation intake ... --write` command may enter replacement mode for v1-v5;
default preview, `--check`, ordinary campaign resolution, and READY/run remain
strict and fail before reporting a runnable v5 intake.

## SIB-003 Product Context Seed

A READY product intake binds one reviewed or approved `PB-XXX` manifest and
its current generated projection, including manifest/output paths and digests,
domain, capability, revision, and exact requirement, journey, scenario, and
persona selections. Any selected source or generated-brief drift invalidates
the intake.

Product documents seed campaign claims and scenarios; they do not authorize
execution or prove behavior. A product result can propose a simulator repair,
new research question, or evidence-backed product refinement. It cannot edit a
persona, requirement, journey, scenario, capability, or brief implicitly.

Every product campaign also references one authored seed-binding artifact.
It binds the exact campaign digest and Task Envelope ID, revision, request
digest, and source digest. It maps every active Task Envelope/intake claim
exactly once by `source_claim_id` to `SEEDED`, `CONTEXT_ONLY`, or
`OUT_OF_SCOPE`. `SEEDED` requires at least one current campaign claim and at
least one current scenario or task. The other dispositions carry no targets
and require a nonempty rationale. At least one row must be `SEEDED`.

This explicit ID map is the only seed classification authority. The compiler
does not match claim text, infer semantic similarity, or add a second
classifier. Duplicate, missing, stale, unknown, cross-campaign, or
campaign/source-digest-mismatched bindings block READY. The intake persists
the exact artifact path, SHA-256, source identity, and mapping projection, then
replays them at `--check`, READY resolution, and run preflight. Harness
campaigns and harness intakes do not bind product seed artifacts.

Every compile, check, READY-resolution, and run-preflight observation reads the
seed artifact through the same bounded nofollow regular-file reader. Physical
ancestor containment and file identity must remain stable before and after the
single open/read. UTF-8 decoding, JSON parsing, runtime validation, intake
projection, and the source SHA-256 all derive from that one returned buffer;
no later pathname reopen may supply the digest or semantic definition.

## SIB-004 Exact Policy Resolution

For every policy-observable action, the compiler records
`action_binding_version: cascade-action-binding-v2`, the canonical
`action_binding_digest`, computed applicable policy IDs and digests, and the
decision. The legacy `action_digest` field is not part of schema v6.
Direct-process and HTTP tasks are normalized into the same action-policy
boundary as stateful actions.

Zero applicable policies is `GAP`; multiple applicable policies is
`AMBIGUOUS`; `DENY` blocks readiness. For every task, the declared policy set
must equal the union of computed applicable policies exactly. Campaign
resolution repeats this equality check against current sources before a READY
intake is accepted.

Task-admission policies (`TAP-*`) choose workflow controls. Simulation action
policies under `product-evals/policies/` authorize or deny campaign actions.
They remain separate authorities and cannot substitute for each other.

## SIB-005 Agent Handoffs

| Stage | Role / skill | Required input | Authority | Output |
|---|---|---|---|---|
| author | `agent-engineer` / `simulation-campaigns` | Task Envelope, product brief when product scoped, current definitions | author campaign/intake changes only | validated campaign and READY intake |
| execute | `simulation-operator` / `simulation-execution` | explicit run authorization and READY intake | mutate only the approved isolated target/run boundary | frozen evidence, cleanup, execution receipt |
| evaluate | `simulation-evaluator` / `simulation-evaluation` | frozen run plus frozen intake | read-only judgment | claim ledger, evaluation receipt, repair/refinement route |
| harness judge | `harness-evaluator` / `harness-evaluation` | Cascade route/trace packet | specialized read-only harness judgment | harness receipt consumed by general evaluation |

Authoring does not dispatch execution. Execution does not change campaign
intent. Evaluation does not execute or repair. Product-document promotion
returns through `synthesis-to-spec -> compose-spec`, external evidence where
required, and accountable review.

## SIB-006 Lifecycle And Invalidation

```text
Task Envelope + optional product brief + authored product seed map
  -> DRAFT/BLOCKED intake
  -> exact claim/action/policy compilation
  -> READY intake
  -> explicitly authorized operator run
  -> immutable evidence and verified cleanup
  -> independent evaluation
  -> simulator repair or reviewed synthesis proposal
```

A Task Envelope revision, provenance-contract or direct-user-attestation
identity, product brief/source/output digest, campaign task, action, policy
set/content, authored seed path/content/campaign/source digest, seed mapping,
scope, or source identity invalidates the READY intake. Execution refuses
absent, draft, blocked, stale, cross-scope, or mismatched product intakes.

## Non-Goals

- Letting a prompt, model output, brief, or workline auto-dispatch a run.
- Treating harness simulations as product evidence.
- Allowing synthetic personas to validate or mutate their source persona.
- Inferring an applicable policy from a broad name or prose description.
- Updating product docs because a work cycle says “close out” without an
  explicit accepted finding and doc-routing decision.

## Acceptance Evidence

- `PR-009` through `PR-012`, `J-002`, and `PS-009` through `PS-012`;
- admission simulation-policy corpus and shell-tool normalization tests;
- simulation intake schema/compiler/starter tests;
- public default/check/write and run-preflight legacy-intake matrix tests;
- authored product seed schema, complete mapping, target-reference, digest,
  harness-separation, bounded-read/symlink/substitution, same-buffer digest,
  and READY replay tests;
- product campaign refusal for non-READY or stale intake;
- exact action/policy equality checks during compilation and campaign resolve;
- agent/skill routing validation and complete Cascade regression.

## Revision 15 Explicit Write-Only Legacy Replacement

Revision 14 allowed the exported preview compiler to use the same legacy
replacement resolution as public `--write`, so a no-flag preview could report a
READY v4 candidate while the persisted campaign still referenced an
unsupported intake. Revision 15 keeps replacement as a private compile mode
used only by the write service. Preview, `--check`, ordinary resolution, and
the run preflight validate persisted state strictly; public `--write` retains
the bounded v1-v3 migration path.

## Revision 16 Authored Product Seed Binding

Revision 16 advances the intake contract to v5 and adds one explicit authored
product seed-binding artifact referenced by the campaign manifest. The artifact
maps stable source claim IDs to stable campaign claim/scenario/task IDs and is
digest-bound into the intake. V1-v4 retain the stable write-only migration
route; preview, `--check`, ordinary resolution, and run remain strict.

This revision does not infer mappings from text, change harness campaign
behavior, accept the current W-031 producer candidate, or authorize execution.
The source rebind targets Task Envelope/schema/catalog/case-set v15 and
`cascade-core@16`; that local identity does not accept the W-031 producer.
Independent review, generated projection refresh, provider run, semantic
evaluation, promotion, deployment, and release gates remain open or `NOT_RUN`.

## Revision 17 Single-Buffer Seed Authority

The revision-16 G1/G2/G5 review failed because campaign resolution parsed the
seed artifact, reopened its pathname for the projected SHA-256, and reopened it
again while building source digests. File or ancestor substitution between
those observations could make a READY intake bind bytes other than the seed
definition that was validated.

Revision 17 preserves intake v5, the seed v1 schema, explicit ID mappings,
harness separation, and the strict v1-v4 legacy boundary. It routes the seed
through one bounded nofollow physically contained read and derives validation,
projection, and both digest consumers from the same byte buffer. Independent
review, accepted producer gates, regenerated source-bound evidence, provider
execution, semantic evaluation, promotion, deployment, and release remain
separate gates.

## Revision 18 Campaign Intake-Root Authority

Revision-17 independent review failed G1/G2/G5 because a campaign could pair a
product simulation path with a harness intake path, or the reverse. Ordinary
resolution compared only the loaded intake's embedded `scope`, while explicit
replacement mode skipped that read; therefore an embedded matching scope
could bypass the physical path boundary and `--write` could replace the wrong
scope destination.

Revision 18 makes the `simulation_file` lexical root authoritative at campaign
schema validation, runtime manifest validation, post-simulation resolution,
replacement compilation, and the writer's last pre-write destination check.
Default preview, `--check`, `--write`, ordinary/READY resolution, and public
run preflight reject either cross-root direction before replacement,
reservation, or dispatch. Revision-17's product-only seed binding and exact
same-buffer seed validation/projection/source digest remain unchanged.

## Revision 19 Exact Seed Physical-Root Containment

Revision-18 independent review failed G1/G2/G5 because the public seed path is
lexically limited to `product-evals/intakes/product/seed-bindings/`, while the
shared opened-file check proved descriptor containment only under the
repository root. After a valid seed was opened, an attacker could move its
ancestor outside the seed-binding root, recreate the old ancestor, and
hard-link the opened inode back at the original pathname. Repository
containment and same-inode checks could then succeed without proving that the
opened seed remained physically under its only permitted authority root.

Revision 19 gives the bounded regular-file reader an optional exact physical
root. A caller that supplies it must be lexically inside that directory and
the opened descriptor must resolve inside the same canonical directory before
and after the one-buffer read. The reader also snapshots and replays the
directory identities from the file parent through that root so a moved
ancestor cannot be hidden by a same-inode hard-link alias. The seed reader is
bound to the canonical seed-binding directory; generic callers retain the
repository-root default. Nofollow open, stable file identity, byte limit,
fatal UTF-8/JSON parsing, and digest/projection derivation from one buffer are
unchanged.

Receipt `W032-R19-A1-EXEC-SEED-PHYSICAL-ROOT-20260805` proposes G1/G2/G5 for
fresh review only. It does not accept the lane, regenerate source-bound
artifacts, authorize execution, or satisfy independent or producer gates.

## Revision 20 Campaign Seed Scope Schema Parity

Revision-19 G1/G4 review failed because runtime campaign resolution required a
product campaign to bind `seed_binding_file` and rejected that field for a
harness campaign, while the public campaign schema allowed both invalid
shapes. The schema therefore could not establish the same product/harness seed
boundary that the runtime claimed to enforce.

Revision 20 keeps the simulation/intake root pairings exclusive and adds seed
scope to those same branches: the product branch requires
`seed_binding_file`, while the harness branch forbids it. Runtime manifest
validation applies the identical invariant before referenced files are loaded,
and resolution replays it against the resolved simulation scope. Paired schema
and runtime regressions cover valid product/harness controls, product without a
seed, and harness with a seed.

Receipt `W032-R20-A1-EXEC-CAMPAIGN-SEED-SCHEMA-PARITY-20260805` proposes G1
and G4 for fresh review only. It preserves revision-19 physical-root and
same-buffer authority, accepts no W-032 gate, and authorizes no execution,
promotion, deployment, or release action.

## Revision 21 Campaign Seed Lexical Root

Revision-20 G1/G4 review failed because the public
`seed_binding_file` pattern and runtime manifest validator enforced product
presence but still admitted non-canonical lexical paths. A product campaign
could name a wrong root, `.` or `..` component, backslash component, absolute
repository path, or duplicate separator before the exact physical-root reader
was reached.

Revision 21 requires the public field to be one canonical slash-separated JSON
path rooted under
`product-evals/intakes/product/seed-bindings/`. Runtime campaign manifest
validation applies the identical lexical-root rule before loading the
evaluation profile, simulation, intake, seed, or any other referenced file.
Resolution retains revision-19's exact physical-root replay and revision-17's
same-buffer validation, digest, and projection authority after lexical
admission. Paired schema/runtime cases cover valid product and harness
campaigns, missing/forbidden seed fields, wrong roots, dot traversal,
backslashes, absolute paths, and duplicate separators; a referenced-load
sentinel proves the lexical rejection occurs first.

Receipt `W032-R21-A1-EXEC-SEED-LEXICAL-ROOT-20260805` proposes G1 and G4 for
fresh independent review only. G2 and G3 retain their prior open review state,
and accepted G5 remains accepted because its exact physical-root, same-buffer,
READY/run, and no-dispatch semantics are unchanged. No gate is self-accepted
and no execution, promotion, deployment, or release action is authorized.

## Revision 22 Positive ASCII Seed-Path Grammar

Independent receipt
`W032-R21-ARCH-FUNCTIONAL-REVIEW-20260805-IND-01` failed revision-21 G1/G4.
The negative exclusions still admitted seven alternate spellings: lowercase
and uppercase percent-encoded dot-dot, percent-encoded slash, percent-encoded
backslash, two U+FF0E fullwidth dots, U+2215 division slash, and U+2044
fraction slash. Intake-v5 `seed_binding.path` also retained its earlier broad
`.+` path rule, so the manifest and persisted projection did not share one
lexical authority contract.

Revision 22 defines one positive grammar identity for both public schemas and
runtime validation. After the exact
`product-evals/intakes/product/seed-bindings/` prefix, every directory
component and the JSON basename uses only ASCII letters, digits, dot,
underscore, and hyphen, and every component contains at least one non-dot
character. Only `/` separates components and the filename ends in `.json`.
The campaign schema and intake-v5 schema each reuse that grammar through a
local `seedBindingPath` definition; parity tests bind both definition strings
to the runtime pattern identity. One runtime validator is reused by campaign
manifest admission, intake validation, and the bounded seed reader.

The positive character set rejects every percent encoding independent of hex
case, all non-ASCII characters including dot and slash lookalikes, raw
backslashes, `.`/`..`, wrong roots, absolute paths, and empty components from
duplicate separators. Campaign validation still runs before the evaluation
profile, simulation, intake, seed, or any other referenced file is read.
Revision-19 exact physical-root replay and revision-17 same-buffer validation,
digest, and projection authority remain unchanged after lexical admission.

Receipt `W032-R22-A1-EXEC-SEED-PATH-GRAMMAR-20260805` proposes G1/G4 for fresh
independent review only. G2/G3 retain their open review state and accepted G5
remains accepted. No product/provider execution, promotion, deployment,
release action, or gate self-acceptance is authorized.

The unchanged revision-22 intake contract is currently rebound to W-031 Task
Envelope/classifier v26 and `cascade-core@27` with 386 exact admission cases.
This is a consumer identity update, not a new W-032 behavior claim or gate
acceptance. Fresh producer-bound G1/G4 and formal G2/G3 receipts remain required.

The current consumer identity advances again to W-031 Task
Envelope/classifier v27 and `cascade-core@28` with 430 exact admission cases.

W-031 revision 27 supersedes that producer identity with Task
Envelope/schema/catalog/case-set v28, classifier v28, `cascade-core@29`, and
454 exact admission cases. W-032 behavior stays at revision 22; the change is
an exact producer-consumer rebind and does not accept any W-032 gate.
W-032 remains behavior revision 22. This narrow rebind changes no intake,
campaign, seed, execution, or acceptance authority; fresh producer-bound
G1/G4, formal G2/G3, W-031-G6, G6/GT, and provider-backed product gates remain
open or `NOT_RUN`.

W-031 revision 28 advances the exact producer-consumer binding to Task
Envelope/schema/catalog/case-set v29, classifier v29, `cascade-core@30`, and
485 exact admission cases. W-032 behavior remains revision 22. This narrow
rebind changes no intake, campaign, seed, execution, policy, or acceptance
authority; fresh producer-bound G1/G4, formal G2/G3, W-031-G6, G6/GT, and
provider-backed product gates remain open or `NOT_RUN`.

W-031 revision 29 advances the exact producer-consumer binding to Task
Envelope/schema/catalog/case-set v30, classifier v30, `cascade-core@31`, and
515 exact admission cases. W-032 remains behavior revision 22. This narrow
mechanical rebind changes no intake, campaign, seed, policy, execution, or
acceptance authority; protected generated projections and the integrated N06
join remain root-owned. Fresh producer-bound G1/G4, formal G2/G3, W-031-G6,
G6/GT, and provider-backed product gates remain open or `NOT_RUN`.

## W-031 Revision 34 Producer Binding

W-031 revision 34 advances the mechanical producer identity to Task
Envelope/schema/catalog/case-set v35, classifier v35, `cascade-core@36`, and
765 exact admission cases. W-032 behavior remains revision 22: intake, claim,
product-context, seed-map, action-policy, execution, and evaluation authority
do not move. The root-owned narrow consumer assertion is rebound and the
combined focused slice passes `169/169` with 2,849 assertions. This is
mechanical parity only; generated/immutable integration, G1-G4, W-031-G6,
G6/GT, provider execution, and semantic evaluation remain open or `NOT_RUN`.

## W-031 Revision 35 Producer Binding

W-031 revision 35 advances the mechanical producer identity to Task
Envelope/schema/catalog/case-set v36, classifier v36, `cascade-core@37`, and
785 exact admission cases. W-032 behavior remains revision 22: intake, claim,
product-context, seed-map, action-policy, execution, and evaluation authority
do not move. The narrow consumer assertion is rebound, but this is mechanical
parity only; generated/immutable integration, G1-G4, W-031-G6, G6/GT,
provider execution, and semantic evaluation remain open or `NOT_RUN`.

## W-031 Revision 36 Producer Binding

W-031 revision 36 advances the mechanical producer identity to Task
Envelope/schema/catalog/case-set v37, classifier v37, `cascade-core@38`, and
907 exact admission cases. W-032 behavior remains revision 22: intake, claim,
seed, product/harness separation, policy equality, and run-gate authority do
not change. This is producer/consumer parity only; catalog and immutable
integration, fresh G1/G4, formal G2/G3, W-031-G6, integrated G6/GT,
provider-backed execution, and semantic evaluation remain open or `NOT_RUN`.

## Intake V6 And N06 Action-Binding V2 Parity

The current revision-22 W-032 consumer migrates to intake schema v6 and the
N06 canonical action-binding contract. An empty DRAFT starter remains valid at
schema v6 with `tasks: []`. Every populated action carries exactly
`action_binding_version: cascade-action-binding-v2` and its canonical
`action_binding_digest`; the former lossy action digest is unsupported.

Intake schemas v1 through v5 are replacement-only and cannot be READY. The
public write path may produce a fresh v6 intake from those historical shapes;
preview, check, ordinary resolution, and run preflight remain strict. This
mechanical parity does not accept W-032: fresh G1-G4, W-031-G6, integrated
G6/GT, immutable integration, provider execution, and semantic evaluation
remain open or `NOT_RUN`; G5 stays accepted pending the fresh joins.

The focused W-031, intake, definition, and starter-template slice passes
`237/237` with 3,388 assertions. This is local deterministic evidence, not
independent acceptance.

The W-031 revision-36 producer was subsequently rejected by independent
review. Its v37/`cascade-core@38` parity evidence is historical and cannot
support any current W-032 gate.

## W-031 Revision 37 Producer Binding

W-031 revision 37 advances the review-candidate producer identity to Task
Envelope/schema/catalog/case-set v38, classifier v38, `cascade-core@39`, and
925 exact admission cases. W-032 behavior remains revision 22: intake, claim,
seed, product/harness separation, policy equality, and run-gate authority do
not change. This is producer/consumer parity only; catalog and immutable
integration, fresh G1/G4, formal G2/G3, W-031-G6, integrated G6/GT,
provider-backed execution, and semantic evaluation remain open or `NOT_RUN`.

The W-031 revision-37 producer and its r53 integration were subsequently
rejected. Their v38/`cascade-core@39` parity evidence is historical and cannot
support any current W-032 gate.

## W-031 Revision 38 Producer Binding

W-031 revision 38 advances the accepted-candidate producer identity to Task
Envelope/schema/catalog/case-set v39, classifier v39, `cascade-core@40`, and
949 exact admission cases. W-032 behavior remains revision 22: intake, claim,
seed, product/harness separation, policy equality, and run-gate authority do
not change. This is mechanical producer/consumer parity, not W-032 acceptance;
fresh G1-G4, W-031-G6, integrated G6/GT, catalog/immutable integration,
provider-backed execution, and semantic evaluation remain open or `NOT_RUN`.

The W-031 revision-38 producer and its r54 integration were subsequently
rejected. Their v39/`cascade-core@40` parity evidence is historical and cannot
support any current W-032 gate.

## W-031 Revision 39 Producer Binding

W-031 revision 39 advances the accepted-candidate producer identity to Task
Envelope/schema/catalog/case-set v40, classifier v40, `cascade-core@41`, and
965 exact admission cases. W-032 behavior remains revision 22: intake, claim,
seed, product/harness separation, policy equality, and run-gate authority do
not change. This is mechanical producer/consumer parity, not W-032 acceptance;
fresh G1-G4, W-031-G6, integrated G6/GT, catalog/immutable integration,
provider-backed execution, and semantic evaluation remain open or `NOT_RUN`.

## W-031 Revision 33 Producer Binding

W-031 revision 33 advances the mechanical producer binding to Task
Envelope/schema/catalog/case-set v34, classifier v34, `cascade-core@35`, and
705 exact admission cases. W-032 remains behavior revision 22: claim,
product-context, seed-map, exact action-policy equality, execution, and
evaluation authority do not move. This parity does not accept W-032 G1-G4,
W-031-G6, integrated G6/GT, provider product execution, or semantic
evaluation.

## W-031 Revision 32 Producer Binding

W-031 revision 32 advances the canonical producer binding to Task
Envelope/schema/catalog/case-set v33, classifier v33, `cascade-core@34`, and
661 exact admission cases. W-032 remains behavior revision 22: claim,
product-context, seed-map, policy-equality, execution, and evaluation authority
do not move. The narrow producer-binding assertion is mechanical parity only;
fresh producer-bound G1/G4, formal G2/G3, W-031-G6, integrated G6/GT, provider
product execution, and semantic evaluation remain open or `NOT_RUN`.

W-031 revision 30 advances the exact producer-consumer binding to Task
Envelope/schema/catalog/case-set v31, classifier v31, `cascade-core@32`, and
545 exact admission cases. W-032 remains behavior revision 22. This narrow
mechanical rebind changes no intake, campaign, seed, policy, execution, or
acceptance authority; protected generated projections and the integrated N06
join remain root-owned. Fresh producer-bound G1/G4, formal G2/G3, W-031-G6,
G6/GT, and provider-backed product gates remain open or `NOT_RUN`.
