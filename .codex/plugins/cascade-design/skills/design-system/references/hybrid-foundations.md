# Hybrid foundations

Rule: CASCADE-HYBRID-1. Owner: Cascade Design.
Authority: the user's explicit selection of Hybrid as the default on 2026-09-08.
Applies with the scope and source precedence of [the outcome UI standard](outcome-ui-standard.md).

Hybrid combines a quiet, opaque information layer with a restrained liquid
control layer. Use it for new application pages and relevant marketing actions.
Keep accepted target identity and behavior. The small reference kit supplies
starting values and anatomy; it does not require a framework or replace an
existing target component library.

## Canonical assets

- [hybrid.css](../assets/hybrid.css): scoped semantic tokens and base styles.
- [hybrid-components.html](../assets/hybrid-components.html): editable, standalone
  examples of a form, a list and component states using that stylesheet.

The stylesheet is the source of numeric token values. Screenshots and inline
previews are generated examples, never another hand-maintained token source.
Read the reference assets when implementing a new UI; adapt them into the
target's existing token/component mechanism under host authority. Do not ship
the demo script or synthetic booking behavior as application functionality.

## Small foundation

Use a system sans-serif stack, body text at 15px, editable fields at 16px,
secondary text at 13px, and a 25–28px page title. Use regular and medium weight.
The spacing scale is 4, 8, 12, 16, 24, 32 and 40px. Semantic colors support light
and dark appearance; one primary accent carries actions and selected state.
Success, warning and error colors only accompany explicit state labels.

Keep desktop content within 1120px, with 28px page gutters reducing to 18px.
Single-task forms can use a narrower target container. Use plain sections and
divided rows; add a container only when its boundary communicates a real object.
Controls have 12px corners, pill buttons and a 24px action panel. Interactive
targets are at least 44px high. Preserve visible browser focus.

## Base components

| Component | Anatomy and behavior |
|---|---|
| Page and navigation | One task title, necessary context, optional compact navigation, content and the primary action. Real page links use `aria-current="page"`; prototype view buttons retain native keyboard behavior. |
| Button | Primary, secondary and text variants. Use one primary per task. Native `disabled` suppresses unavailable actions; `aria-disabled` alone needs an explicit event guard. Pending labels describe a real operation and preserve retry/recovery. |
| Field | Persistent label, native input/select/textarea, optional help and a linked error. Mark an invalid field with `aria-invalid`, bind help/error with `aria-describedby`, preserve entered data and focus the first invalid field. |
| Choice | Native radio group for exclusive options; checkbox for an independent setting. Pair label and control, preserve keyboard selection, and use more than color to indicate the chosen state. |
| List row | Primary value, necessary secondary facts, an optional explicit status and a related action. Rows wrap without hiding units, dates or action meaning. Use a real table when column comparison requires it. |
| Feedback and empty state | Distinguish draft, pending, confirmed, partial and failed outcomes. Announce meaningful dynamic changes with `role="status"`; use an alert for actionable errors. An empty state identifies the missing content and a useful next action. |
| Action bar | A compact current selection or consequence beside one primary action. Glass and a restrained local gradient distinguish the action layer. Use normal flow; a target-specific sticky version needs overlap and focus checks. |

Use existing native controls before adding a new primitive. Dialogs, date
pickers, rich tables, charts and custom select menus are outside this basic kit.
Compose them only when a real target task requires them.

When structured data or an agent selects the UI, compose these primitives through
the shared [Generative UI practice](generative-ui.md). The frontend retains
markup, styling and action bindings; structured data selects bounded views.

## Gradient decision

Use the broader, softer treatment around the action bar: the gradient spans
the full width of its action zone, including its gutters, and fades through
the zone's roughly 140–180px height as the bar wraps. The default opacity is
0.65 applied to the translucent color layers in the stylesheet. Keep the
information body opaque and the upper content quiet.

This increases the material's continuity across a page without painting the
entire page or increasing color saturation. A narrow glow centered only on
the button makes the bar feel detached; a page-wide background wash competes
with form and list information. On dense pages or multiple adjacent actions,
reduce the glow or keep one shared action zone. More contrast or reduced
transparency preferences remove the decorative gradient and provide an opaque
action panel.

## Page compositions

- Form: task heading → labeled fields → bounded choices → current consequence
  and submit action. Validate real constraints, preserve input and show the
  operation's true state.
- List: heading and useful create action → comparable rows → related detail
  action. When empty, replace rows with one useful empty state.
- Detail: object title and actual status → grouped facts → relevant next action.
  Keep destructive actions distinct from routine completion and follow target
  authority; this kit supplies no deletion, payment or booking policy.

## Adoption and evidence

Load the stylesheet around a `.cascade-hybrid` root or map its tokens and
component anatomy into the accepted target system. Keep the accepted design
source and any target overrides in the existing handoff. The host owns actual
implementation, persistence, testing and release; Design owns these rules.

Check relevant viewport/state pairs in the actual target: a form with errors,
populated and empty lists, keyboard selection/focus, long content, light/dark
appearance, reduced motion and opaque fallback. The interactive reference is
a local demonstration only. Its operation and appearance do not establish
backend correctness, native Apple refraction or measured device performance.
