# Mockup And Design Artifact Guide

Use this guide only when a specification receives or materially depends on a
mockup, screenshot, prototype, design canvas, rendered page, or visual design
file. It makes design evidence usable without turning `synthesise-spec` into a
mockup generator or visual-QA suite.

## Default Boundary

- Consume and inspect supplied design artifacts when they are accessible and
  relevant to the requested feature or change.
- Do not search for, generate, revise, or approve mockups unless the user asks
  for that separate action.
- A provided artifact remains owned by its design source. The specification
  links its selected implications; it does not copy the artifact into a second
  authority.
- If no mockup was supplied, write `none supplied` where a design reference is
  material. Describe the missing design need without inventing a frame.

## Register Before Interpreting

Give every material artifact a packet-local stable ID:

- `DES-01` — one design artifact or versioned prototype;
- `DES-01:V01` — one page, frame, screen, viewport, or named state within it;
- `DES-01:A01` — an optional derived annotation that links back to its source
  view. A derived annotation never replaces the original.

For every artifact record:

| Field | Required content |
|---|---|
| Artifact ID | Stable packet-local ID |
| Kind | `MOCKUP`, `SCREENSHOT`, `PROTOTYPE`, `DESIGN_CANVAS`, `RENDERED_UI`, or another precise kind |
| Owner and version | Owner plus version, commit, revision, export date, or `UNKNOWN` |
| Behavior time | `CURRENT` or `TARGET` |
| Authority | `DECIDED`, `PROPOSED`, `CONFLICTING`, or `UNKNOWN` |
| Source inspection | One inspection mode below, plus exact views/viewports inspected |
| Behavior evidence | `OBSERVED`, `NOT_INSPECTED`, `NOT_RUN`, `PASS`, `FAIL`, or `BLOCKED` for the claim—not merely the file opening |
| Selected scope | The states, controls, content, tokens, or layout implications used by this change |
| Exact reference | Path or URL plus page, frame, node, anchor, viewport, and version when available |

Do not use `VISUALLY_INSPECTED` or another source-inspection label in the
behavior-evidence column. These are independent dimensions.

## Source Inspection Modes

Use the highest mode actually completed and describe its scope:

| Mode | Meaning | Does not prove |
|---|---|---|
| `INTERACTION_INSPECTED` | Relevant prototype states and controls were exercised in named viewports | Production behavior, persistence, or external effects |
| `VISUALLY_INSPECTED` | Relevant pixels/frames were viewed at named viewports or page numbers | Interaction, hidden states, responsive behavior outside those views, or implementation parity |
| `STRUCTURE_INSPECTED` | Source markup, layers, tokens, or metadata were read without a reliable rendered view | Actual layout, clipping, visual hierarchy, or usability |
| `REFERENCE_ONLY` | An exact reference was supplied but not opened | Any content claim beyond the reference identity |
| `NOT_INSPECTED` | No usable artifact was supplied or access failed | Any design claim |

Examples:

- `VISUALLY_INSPECTED — DES-01:V01 and V02 at 1440x900; mobile not inspected`
- `INTERACTION_INSPECTED — DES-02:V03 loading, success, and retry at 390x844`
- `REFERENCE_ONLY — Figma node supplied; access unavailable`

Opening a static mockup proves what that artifact depicts. It does not make a
target behavior implemented. A runtime screenshot may support one current
visual-state claim as `OBSERVED` only when environment, build/commit, data,
viewport, and capture time are identified. It still does not prove interaction,
durable state, provider completion, or other unseen behavior.

## Inspect With The Artifact's Native Evidence Path

Use the available runtime tools; this package does not require a particular
design platform.

1. Inventory all supplied artifacts before choosing a representative one.
2. Resolve the authoritative source and version. A PNG export may be easier to
   view, while an editable Figma/HTML/source file remains canonical.
3. Inspect the smallest relevant scope:
   - raster or SVG: view the image at useful scale;
   - PDF: render and inspect the named pages;
   - HTML or interactive prototype: inspect source only for structure, then
     render and exercise the relevant frames, controls, and viewports;
   - design-platform link: use an available connector or versioned export;
   - inaccessible reference: keep `REFERENCE_ONLY` or `NOT_INSPECTED` and name
     the access gap.
4. Record exact state, theme, language, role, sample data, and viewport when
   they can change the conclusion.
5. Do not claim whole-artifact coverage from one frame or one viewport.

## Audit What The Mockup Actually Constrains

For every selected view, inspect only the dimensions material to the feature:

- user, entry point, and prerequisite context;
- information hierarchy and primary action;
- visible content, labels, values, units, timestamps, and source attribution;
- controls, their states, and what each appears to promise;
- loading, empty, partial, permission-denied, degraded, error, retry, recovery,
  success, cancellation, and resume states that are shown;
- desktop/mobile or other responsive variants that are shown;
- focus order, keyboard path, screen-reader names/status, contrast, motion,
  zoom, overflow, and non-color cues when inspectable;
- differences between target design, current product, product rules, and
  integration contracts.

Do not infer a missing state. Record it as `NOT_SHOWN` and decide whether that
is an ordinary design gap, an implementation blocker, or irrelevant to scope.

## Map Controls To Real Operations

For every visible action that can change user-visible or durable behavior,
trace:

`design control -> user trigger -> operation/event/job -> permission and state guard -> acknowledgement -> completion -> denied/failure state -> recovery -> acceptance evidence`

A label such as **Retry**, **Cancel**, **Save**, **Confirm**, or **Complete** is
not a contract. If the operation is absent, rejects for the shown reason, or
can produce an unknown external outcome, mark the design and contract
`CONFLICTING`. Give the conflict an owner and readiness effect; do not silently
rewrite the mockup or API.

## Put References Where Readers Need Them

Define the full reference once in the Artifact Manifest. Reuse the stable ID,
not the raw path, in these locations when material:

| Spec location | Reference purpose |
|---|---|
| Product And Change | Identify the design that governs the visible target delta |
| Expected Outputs | Bind each visible output to its target screen/state |
| User Journeys | Cite key entry, decision, failure, recovery, and completion views |
| Component Responsibilities / Integrations | Bind user-visible pending, empty, degraded, failure, and success states to their owning boundary |
| Experience And Design | Carry the full state/view coverage and design implications |
| Acceptance And Evidence | Name the reference state, comparison method, viewport, and evidence status |
| Traceability | Connect product rule/output, journey, design state, implementation boundary, and acceptance ID |

Do not place a citation after every sentence. One ID beside the exact behavior
it constrains is enough. Never write only “see Figma,” “see screenshot,” or
“matches mockup.”

## Design Coverage Matrix

Use this table when more than one state or viewport matters:

| Design Ref | Surface/State | Role And Viewport | Behavior Time | Authority | Source Inspection | What It Constrains | Gaps Or Conflicts | Journey / Acceptance |
|---|---|---|---|---|---|---|---|---|
| `DES-01:V01` | {{Surface and state}} | {{Role, viewport, theme/language}} | `CURRENT / TARGET` | `DECIDED / PROPOSED / CONFLICTING / UNKNOWN` | {{Mode and inspected scope}} | {{Content, control, layout, or transition}} | {{`NONE`, `NOT_SHOWN`, or exact conflict}} | `J-01 / AC-01` |

Keep this matrix in **Experience And Design** or the Artifact Manifest. Do not
create a separate mockup report unless the user requested a design audit.

## Preview And Attachment Rules

- A clickable exact reference is required whenever the output medium supports
  links.
- Add a thumbnail or embedded image only when it materially helps a reader
  understand the feature. Include concise alt text and a caption with design
  ID, state, viewport, version, behavior time, and authority.
- Link to the editable/versioned source when an image is only an export.
- If the artifact contains sensitive data, reference an approved redacted
  version; do not embed the original.
- If annotations are created, label them `DERIVED`, retain the parent design
  ID, and do not present them as approved source design.

## Readiness Effects

- An uninspected optional mockup usually leaves design evidence `NOT_INSPECTED`
  without blocking a compact behavior spec.
- A missing authoritative frame that decides a material user outcome, control,
  permission, or recovery can require `NEEDS_INPUT`.
- An authoritative design that cannot be accessed can require `BLOCKED` when
  no other source owns the decision.
- A product/design/API conflict prevents `READY_FOR_IMPLEMENTATION` until an
  owner resolves it.
- Missing prototype or implementation validation does not prevent an approved
  target rule from being `TARGET + DECIDED`; its behavior evidence remains
  `NOT_RUN`.

## Completion Check

- [ ] Every supplied material mockup is inventoried or explicitly excluded.
- [ ] Each used design has a stable ID and exact versioned reference.
- [ ] Source inspection and behavior evidence are separate.
- [ ] Inspected frames, states, roles, and viewports are named.
- [ ] Unseen states are `NOT_SHOWN`, not inferred.
- [ ] Visible controls map to real triggers, guards, completion, and recovery.
- [ ] Conflicts are explicit and owned.
- [ ] Design IDs appear beside relevant journeys, visible states, acceptance,
      and traceability—not only in the manifest.
- [ ] Any preview links to the canonical source and has useful alt text.
- [ ] Mockups are not presented as implementation or persistence proof.
