# UX Flow Patterns

Use these heuristics only after loading the target's current product, persona,
design, brand, and implementation evidence.

Primary references:

- USWDS design principles: https://designsystem.digital.gov/design-principles/
- NHS Digital Service Manual: https://service-manual.nhs.uk/
- W3C WCAG 2.2: https://www.w3.org/TR/WCAG22/

Reusable principles:

- Start with the actor and job, not the page layout.
- Keep location, changed state, remaining work, next valid action, and recovery visible.
- Preserve safety, permission, compliance, and audit state when the product contract requires it.
- Match density, device, input mode, and interruption behavior to inspected evidence.
- Keep automation, provider, voice, and constrained-environment paths recoverable.
- Do not truncate or hide the only valid path.

State coverage: entry, loading, empty, partial, validation error, blocked or
permission-denied, provider unavailable, unsaved changes, success, retry, and
mobile/narrow viewport.
