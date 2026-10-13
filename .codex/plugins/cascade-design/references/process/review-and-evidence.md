# Review and evidence

Review actual artifacts against bound expectations. Carry the current brief;
do not commission the task again. A reviewer separates observation, interpretation,
consequence, proposed change and missing evidence.

## Bind the comparison

Name the expected source/version/frame, actual editable/rendered artifact,
viewport/state, theme, locale, content fixture and capture conditions. Match
zoom/DPR and font/asset loading where they affect comparison. Inspect actual
reference and actual capture, not filenames or prose. Preserve conflicting
product, brand, accessibility and visual sources until the owner resolves them.

For an accepted mockup, faithful implementation is the default. Define any
intentional deviation or comparison tolerance before judging. Distinguish font
rasterization from geometry/type defects. Masks are only for declared unstable
content; never mask the changed UI, widen tolerance to remove a failure or use
the implementation itself as a new approved baseline.

## Review in a useful order

1. Task and behavior: can the actor find the information, make the decision,
   act and understand truthful completion/recovery? A screenshot can show a
   state but cannot prove the operational transition.
2. Structure and composition: dominant region, hierarchy, sequence, density,
   comparison information and primary action. Diagnose structural problems
   before polishing a small color or shadow mismatch.
3. Region fidelity: compare layout, geometry, spacing, type, color/material,
   assets, content and visible states against the named reference. Use side-by-side,
   overlay/diff when useful, and an explicit region ledger for material differences.
4. Platform/accessibility: native semantics, labels, keyboard/focus, contrast,
   targets, reduced motion, zoom/narrow access and applicable authentication.
   Source examples and automated scores do not establish interaction proof.
5. Craft and robustness: overflow, long/localized content, missing assets, empty,
   loading, disabled, error, partial, unsaved and recovery states. Check affected
   siblings when a reusable component/rule changes.

Use complete local craft/research/component references to diagnose the issue,
not to invent target requirements. Subjective taste requires a governing source
or explicit direction commission before it becomes a defect.

## Record exact evidence

| Evidence | What it can support | What it cannot establish alone |
| --- | --- | --- |
| Source or static design review | Specified rules, markup and design risks | Rendered layout, actual keyboard/AT or backend behavior |
| Actual capture | Appearance at its exact captured conditions | Functional completion, every viewport or user outcome |
| Browser/prototype interaction | The exercised path/state under its fixture | Live dependency, production permission or real participant outcome |
| Automated scan/test | Its scoped assertions and actual run | Generic accessibility/legal compliance or unasserted behavior |
| Participant observation | Observed tasks in that sample/context | Universal prevalence or conversion without suitable evidence |
| Synthetic fixture/simulation | Rehearsal or bounded synthetic behavior | Participant research, market prevalence or live product acceptance |

Disposition every available automated source, including clean results. Keep
contradictions and gaps visible. Findings name source, observed/expected behavior,
consequence, severity and owner. Severity P0 prevents safe completion; P1 risks
wrong action/lost work/hidden required state; P2 creates material friction; P3
is bounded polish. Do not invent universal percentage/score thresholds for
visual quality. If the task has calibrated tolerances, bind and apply those.

## Repair with a finite disposition

Fix an authorized local candidate defect, or hand implementation repairs to the
host owner. Recapture affected pairs and recheck the specific failure. For an
unstable rendering, first identify environment/asset/fixture failure before
changing design. For a structural mismatch, rebuild the affected region rather
than accumulating cosmetic patches that retain the wrong structure.

Budget the repair loop to the task. After the initial repair and verification,
continue only when new evidence identifies another bounded fix. If the same
failure persists through two unchanged-condition attempts, stop repeating it:
record diagnosis, remaining gap, exact artifact and next owner/tool/decision.
A user-authorized broader investigation can set a new bound. Do not keep an
unattended fixed-point loop, fabricate approval or suppress the remaining failure.

When independent review is appropriate and authorized, give a reviewer only
the brief, governing artifacts, exact candidate and criteria. Preserve its
identity and findings; do not substitute the author's praise for review. A
reference suggestion to use an agent does not itself grant agent creation.

## Respect existing artifact status

Creation READY requires real inspected frames for every required pair. The four
review/rule artifacts can be READY with coherent findings and a defined evidence
plan while checks remain unexecuted. They do not assert the UI is accepted.
PLANNED is a defined check lacking execution; GAP is a missing definition/source/
authority; BLOCKED is a valid check unable to run. Use only statuses supported
by the existing schema variant. Keep EV coverage references and evidence-plan
statuses synchronized; missing comparison never becomes PASS.

Create Design outputs `design-candidate` and `frontend-design-handoff`; review
routes consume `design-evidence` or `visual-evidence`. The host must make the
actual source/preview/capture view explicit with artifact IDs and locators.
Do not assert an unsupported typed edge or hide this evidence preparation by
renaming a route. Missing views remain a handoff/gap, not a new schema field.

Visible, functional, accessibility, participant and owner acceptance are separate
claims. Close out with exact evidence, remaining gaps and next owner; never
self-approve design, production behavior, legal compliance or release.
