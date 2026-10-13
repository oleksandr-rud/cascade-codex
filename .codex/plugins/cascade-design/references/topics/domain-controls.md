# Domain controls and state decisions

Choose a control from the actor's actual decision, data and consequences.
The brief/product source defines supported values and behavior. Reference
examples cannot invent a save policy, purchase flow, permission or backend.

| Decision | Starting control | Required design details |
| --- | --- | --- |
| A few mutually exclusive choices | Native radios or a bounded segmented group | Persistent label, all labels visible, selected/focus state, no color-only selection |
| Many known options | Native select or an established accessible combobox | Name, search need, current value, unavailable/empty options, keyboard path |
| Independent boolean | Checkbox; switch only for an immediate on/off effect | State/effect, pending/disabled reason, timing of commitment |
| Exact numeric/domain value | Labeled input with unit and constraints | Min/max/step or domain validity, formatting, empty/invalid value, keyboard use |
| Relative continuous adjustment | Range control plus readable value and precise alternative | Min/max/step, unit, keyboard/touch, commit timing; do not force a slider for exact text |
| Compare alternatives | Shared-field rows/table or aligned cards | Same units/baselines, selected action, differences and constraints at the decision |
| Destructive or costly action | Explicit action with consequence | Actual authorization, target identity, recovery/confirmation required by the product |
| Contextual result in a chat/page | Bounded structured component where useful | Data origin, supported action, current state; no live agent/backend implied |

## Configuration and parameter editing

Bind the selected object identity and current persisted value. Distinguish
draft from saved state and display the unit/type/allowed values. If switching
objects can affect unsaved work, define the actual existing rule: preserved draft,
explicit discard/keep/cancel, or immediate persistence. Do not add a Save button
to an autosaving product or assume autosave where saving is explicit.

Show the consequence of a valid edit and the reason an invalid edit cannot be
committed. Keep entered information available for correction. Use inline linked
errors and meaningful help. Pending means an actual pending operation; a toast
is not evidence that storage succeeded. Represent failure, retry and stale/conflict
where the governing behavior requires them. A local prototype can demonstrate
these states with labeled fixtures and must disclose the simulated dependency.

For multiple dependent parameters, reveal the relation near the control and
explain invalid combinations. Preserve a user's choice when changing another
field unless a governing rule requires invalidation; then explain the change.
Do not silently select a different object or value. Review long names, large
values, empty/partial data, permission-limited edit and narrow widths.

Price, cart, accounts, share links, email, checkout and analytics are conditional
commerce patterns. Use the full local configurator references only when that
behavior exists in the product. A shared URL must not expose private values or
grant access; persistence/access rules need actual owner evidence.

## Multi-step flows and forms

Split steps when dependencies, task complexity or risk justify it. Keep progress
truthful, allow review/edit/back where safe, carry inputs across steps and define
resume/recovery. Do not require a wizard for one parameter or duplicate a value
already known. Show persistent labels, necessary units, requiredness and actionable
errors; placeholders do not replace names or help.

Use direct actions when the next decision is bounded. A conversational wrapper
can clarify uncertain intent, but should not turn a visible checkbox/select into
several chat turns. Provide clear completion and the next useful action.

## Interaction evidence

Define the expected transition before testing: object/value before, action,
visible state after, retained work and actual persistence expectation. Exercise
keyboard/focus as well as pointer where applicable. Separate prototype transitions,
implemented behavior and real-user evidence. A screenshot of a success state
does not prove save, authorization or cancellation behavior.
