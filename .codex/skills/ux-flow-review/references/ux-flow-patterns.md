# UX Flow Patterns Reference

Read this reference when reviewing a target-project product flow, screen, wizard,
dashboard, or session state.

## Primary Sources

- USWDS design principles:
  https://designsystem.digital.gov/design-principles/
- NHS Digital Service Manual:
  https://service-manual.nhs.uk/
- W3C WCAG 2.2:
  https://www.w3.org/TR/WCAG22/

## Reusable UX Principles

- Start from the actor and job, not from page layout.
- Preserve task continuity: users should know where they are, what changed,
  what remains, and how to recover.
- Make the next valid action obvious without hiding secondary actions.
- Keep safety, permission, compliance, or audit-relevant states visible when
  the product contract requires them.
- Match density, device, input mode, and interruption behavior to inspected
  personas, journeys, product docs, and current UI evidence.
- Preserve fallback and recovery controls when the project supports voice,
  automation, external providers, or constrained environments.
- Keep controls usable for documented input and target-size constraints and do
  not truncate the only available path.

## State Coverage

Every non-trivial flow should account for:

- entry;
- loading;
- empty;
- partial data;
- validation error;
- blocked or permission-denied;
- external-provider unavailable;
- unsaved changes;
- success/complete;
- retry or recovery;
- mobile/narrow viewport.

## Design-Doc Routing

- Product behavior, feature IA, copy, states -> owning product spec.
- Product-visible examples -> scenario file.
- Reusable component/token/accessibility rule -> `docs/design/`.
- Implementation plan -> `docs/specs/`.
- Deferred UX work -> `docs/backlog/`.
