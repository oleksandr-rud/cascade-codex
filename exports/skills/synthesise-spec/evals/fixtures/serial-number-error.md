# Synthetic Feature Packet: Serial Number Validation Message

All names and systems in this packet are fictional.

## Request

Specify a small UI change to the Add Device form. Keep the artifact set
proportional.

## Approved Product And Content Decision `COPY-014`

- When the user submits an empty serial-number field, replace “Invalid input”
  with “Enter a serial number”.
- The change helps technicians recover without knowing validation terminology.
- The serial number remains required.
- Whitespace-only input is empty.
- Non-goals: changing serial-number format rules, server validation, API
  schemas, navigation, analytics, or other fields.

## Current Component `AUDIT-044`

- `AddDeviceForm` performs required-field validation before making an API call.
- Empty input currently renders “Invalid input”.
- The field already has `aria-invalid=true` and `aria-describedby` pointing to
  the error element.
- Submission moves keyboard focus to the first invalid field.
- No API request occurs while the field is invalid.

## Target Evidence

- Update the focused component test to assert the exact message for empty and
  whitespace-only input.
- Preserve the no-request assertion, focus behavior, and ARIA relationship.
- No diagram, technical design, integration inventory, lifecycle model, or
  rollout plan is needed.
- Tests have not run; validation status is `NOT_RUN`.

