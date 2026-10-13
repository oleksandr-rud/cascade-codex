# W06 — Select the needed design method

Apply to an actual interaction/design gap in S06 or a scoped check of supplied
design evidence. Reuse an accepted design and existing components when they fit.
The specification owns user behavior; design owns its interaction/visual solution.

| Need | Candidate method | Inputs and useful result |
|---|---|---|
| New/revised screens or interaction solution | cascade-design:create-design | Behavior, audience, constraints and existing design → scoped brief, mockups and state/component handoff |
| Journey or flow issue | cascade-design:ux-flow-review | Contract or flow/design evidence → outcome, navigation, state and recovery findings |
| Reusable tokens/components/responsive rules | cascade-design:design-system | Actual reuse need and current system → scoped rule and affected components |
| Accessibility review | cascade-design:accessibility-review | UI/design evidence and relevant interactions → semantics, focus, keyboard, contrast and target findings |
| Fidelity to an accepted mockup | cascade-design:visual-qa | Matched reference/current captures with viewport/state → visual findings and disposition |

Select by LLM interpretation using [policy bindings](../policy-bindings.md).
Do not invoke the entire design suite for every specification. Do not request
visual parity without rendered current evidence, or treat a layout sketch as
accessibility proof. Missing specialist input remains a gap; draft S06 behavior
can continue without a fabricated design pass.

Supply exact SC/UI/F IDs, useful outcome, applicable states (success, empty,
loading, denial, error/recovery), baseline/constraints, requested topic and output.
Retain native output and its actual status. Link the adopted design reference
from S06 and map controls/states to operations and acceptance. If a design changes
behavior, return that proposal to its owner before upgrading it to a requirement.

Diagram: a focused navigation/action-response view from spec-diagrams; it is a
projection of the chosen behavior and design, not an alternative design authority.
Specifying or reviewing a design does not authorize frontend implementation.
