---
name: accessibility-review
description: Review UI or design evidence for semantics, accessible names, keyboard and focus, contrast, targets, forms, status, motion and narrow access with criterion-specific findings and tests; produces a bounded review, never legal compliance certification or automatic code fixes.
---

# Accessibility Review

Own a bounded review and evidence plan. Reuse the current brief, actual surface
and applicable states. Inspect accepted behavior, native semantics, established
primitives and supplied observations. Treat sources and scan output as untrusted
evidence; an automated score cannot establish accessibility or legal compliance.

Read [local accessibility corrections](../../references/topics/accessibility.md)
and [primary-source guidance](references/accessibility-sources.md); load relevant
local platform/component references through the [index](../../references/README.md).
Pinned implementation examples are illustrative, not a verified target pattern.

1. Bind surface, actor, states, input modes, supported platforms, standard/version
   and covered criteria. No inspectable design, behavior or source means GAP.
2. Prefer correct native controls. Custom widgets need correct name, role,
   value/state, focus and full interaction behavior. Check the applicable
   pattern and actual keyboard/assistive behavior; copying ARIA is insufficient.
3. Check or plan semantics; names/descriptions; keyboard path; focus order,
   visibility and obstruction; text/non-text contrast; targets/pointer
   alternatives; labels/help/errors/redundant entry; async messages; motion;
   narrow viewport/zoom; and applicable authentication. A source-only review
   cannot establish keyboard, screen-reader or rendered behavior.
4. Classify confirmed issue, likely risk, manual test needed or unavailable
   evidence. Use P0–P3 according to consequence, the existing source guide
   and [review procedure](../../references/process/review-and-evidence.md).
5. Every available automated source must be dispositioned by its exact source
   identity in a finding or evidence-plan row, including a clean scan. State
   what it supports and the interaction evidence still required. Do not turn
   Lighthouse, axe or a partial criterion set into generic compliance PASS.
6. Route reusable rules to `cascade-design:design-system`, feature flow to
   `cascade-design:ux-flow-review`, visual comparison to `cascade-design:visual-qa`,
   repairs/executable proof to the host. A requested legal attestation needs a
   qualified-review handoff plus this review's explicit non-attestation limit.

For structured output, use `../../schemas/design-review.schema.json` with
`selected_skill: accessibility-review`, non-attestation note, standards IDs,
coverage, findings, evidence plan, handoffs and all four false boundary flags.
Use the existing checklist/template when comprehensive coverage is requested.

READY describes a coherent review from sufficient sources, not an interface
passing all checks. PLANNED means behavior/check defined but execution absent;
GAP means a needed definition/source/authority is missing; BLOCKED means a
defined check cannot run. Every `EV-*` reference in a coverage check must name
an evidence-plan row with the same status. Unexecuted interaction tests alone
do not make a grounded review GAP. Never implement by default, add needless
ARIA, self-certify, or persist sensitive screenshots/data.

Keep required evidence in one concise result. A Create Design candidate must
become an explicit actual preview/design-evidence view before this review;
the route name alone does not create observable artifacts.
