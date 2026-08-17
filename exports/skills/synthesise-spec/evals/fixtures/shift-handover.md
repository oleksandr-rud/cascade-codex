# Synthetic Feature Packet: Shift Handover Acknowledgement

All names and systems in this packet are fictional.

## Request

Specify a shift-handover feature for Northstar Facilities. An outgoing
maintenance supervisor must record unresolved work, and the incoming supervisor
must acknowledge that they received it. The result should be usable by product,
design, engineering, QA, and operations.

## Approved Product Source `PROD-041`

Status: approved on 2026-08-10.

- Primary users are outgoing and incoming maintenance supervisors.
- The need begins when an outgoing supervisor ends a shift with unresolved
  safety, downtime, or parts work.
- A handover is complete only after the handover record is persisted and the
  incoming supervisor acknowledges it.
- Notification delivery helps discovery but is not part of completion.
- A supervisor may edit a submitted handover until it is acknowledged.
- Acknowledgement does not close or reassign the referenced work orders.
- Success means 95% of handovers are acknowledged within 30 minutes of the
  incoming shift starting.
- Non-goals: work-order editing, automatic assignment, chat, and SMS replies.

## Current Implementation `AUDIT-112`

Status: observed against release `northstar-2.8.1` on 2026-08-12.

- Supervisors type free-text handover notes into a local browser field.
- Notes disappear after sign-out and have no acknowledgement state.
- Work-order IDs may be pasted into the note but are not validated.
- No automated acceptance evidence exists for a handover workflow.

## Target Experience `DES-204`

Status: approved.

- The outgoing supervisor sees unresolved work grouped by safety, downtime,
  parts, and other.
- The unresolved-work list comes from the current tenant and shift, loads when
  the form opens, and has a manual refresh action. An empty list remains a
  valid state; an unavailable list shows a retryable degraded state and does
  not silently substitute stale work orders.
- They may add a concise note and select zero or more unresolved work orders.
- Submission requires at least one selected work order or a note containing a
  non-whitespace character. The validation message is “Add a note or select at
  least one unresolved work order.” For this form-level error, focus moves to
  that error summary. Field-specific validation instead focuses the first
  invalid field.
- Submit states: ready, saving, saved-and-notification-pending,
  saved-and-notification-delayed, validation error, and save failure.
- The incoming supervisor sees an inbox card with author, submitted time,
  shift, note, and linked work orders.
- Acknowledge states: ready, saving, acknowledged, stale-version conflict, and
  failure with retry.
- A stale-version conflict reloads the current handover, announces that it was
  edited, focuses the conflict heading, and requires the incoming supervisor to
  review and press Acknowledge again. It never acknowledges the stale version.
- Screen-reader status text must announce saving, saved, and acknowledged.
- Keyboard focus follows the form-level versus field-level validation rule
  above and moves to the confirmation heading after a successful action.

## Current Technical Contract `API-077`

Status: approved target contract; not implemented.

Components:

- `handover-web`: renders forms and inbox cards; owns no durable handover state.
- `handover-api`: owns product validation and lifecycle rules.
- `handover-db`: PostgreSQL tables `handovers`, `handover_work_orders`, and
  `handover_receipts`; source of truth for the handover lifecycle.
- `work-order-api`: existing internal read boundary for tenant-owned unresolved
  work and stable category values.
- `shift-registry`: existing internal source for outgoing and incoming
  supervisor assignments and incoming shift start time.
- `event-bus`: accepts versioned internal events.
- `notify-adapter`: sends a push notification through fictional provider
  NotifyBird.

Create operation:

- `POST /v1/handovers`
- Required header: `Idempotency-Key`, unique per tenant and outgoing supervisor
  for 24 hours.
- Auth: supervisor role in the active tenant.
- The shift registry must show the authenticated supervisor as the outgoing
  supervisor and `incoming_supervisor_id` as the incoming supervisor for the
  same tenant-owned shift. A mismatch rejects before any write.
- Body: `shift_id`, `incoming_supervisor_id`, `note` up to 2,000 characters,
  and `work_order_ids` with at most 50 unique IDs.
- Trimmed `note` may be empty only when at least one work order is selected.
- Every work order must belong to the active tenant. Missing or cross-tenant
  IDs reject the request before any write.
- One database transaction creates the handover, links work orders, and writes
  a `created` receipt.
- Response: `201` with handover ID and version. A duplicate idempotency key
  returns the original response without a second event.
- After commit, an outbox publishes `handover.created.v1` with handover ID,
  tenant ID, incoming supervisor ID, and submitted time.

Unresolved-work read:

- `GET /v1/work-orders?shift_id={shift_id}&status=unresolved` is called by
  `handover-web` when the form opens and on manual refresh.
- `work-order-api` authorizes the active-tenant outgoing supervisor through the
  shift registry and returns work-order ID, display number, summary, and one
  stable category: `SAFETY`, `DOWNTIME`, `PARTS`, or `OTHER`.
- Results are ordered by category and display number. The endpoint returns an
  empty list when no unresolved work exists and a stable retryable error when
  the dependency is unavailable. The web surface does not cache results across
  sign-out.

Notification behavior:

- `notify-adapter` consumes `handover.created.v1` and calls NotifyBird.
- NotifyBird `202` means accepted for delivery, not delivered.
- Timeout is five seconds. Retry twice with exponential backoff and the
  handover ID as provider idempotency key.
- Notification failure never rolls back the handover.
- After retries fail, the adapter records category `notification_delayed` and
  raises an operations alert. The incoming supervisor can still discover the
  handover in the product inbox.
- Raw provider error text must not appear in the UI.

Acknowledgement operation:

- `POST /v1/handovers/{id}/acknowledgements`
- Required fields: `version` and an acknowledgement idempotency key.
- Only the named incoming supervisor may acknowledge.
- A matching version writes one `acknowledged` receipt and returns `200`.
- A duplicate key returns the original receipt. A stale version returns `409`
  with stable code `HANDOVER_VERSION_CHANGED`, the current version, last-edited
  time, note, and linked work-order summaries.
- Acknowledgement is irreversible. It does not mutate linked work orders.
- On `HANDOVER_VERSION_CHANGED`, `handover-web` replaces the stale card with
  the returned current representation, announces the edit, focuses the
  conflict heading, and requires a new explicit acknowledgement submission.

Edit operation:

- `PATCH /v1/handovers/{id}` requires an `Idempotency-Key`, `version`, and the
  replacement `note` and `work_order_ids` fields.
- Only the outgoing supervisor who created the handover may edit it, and only
  while it remains unacknowledged.
- The API applies the same note, count, uniqueness, and tenant-owned work-order
  validation as create before any write.
- A matching version updates the handover and work-order links, increments the
  version, and writes one `edited` receipt in one transaction. A duplicate key
  returns the original response without a second receipt or event.
- A stale version returns `409 HANDOVER_VERSION_CHANGED`. An edit after
  acknowledgement returns `409 HANDOVER_ALREADY_ACKNOWLEDGED`.
- After commit, the outbox publishes `handover.updated.v1`. The notification
  adapter sends the named incoming supervisor an updated-handover notification
  with the handover ID as its provider idempotency key plus the new version.
  Notification failure follows the same delayed-notification behavior as
  create and never rolls back the edit.

Inbox and notification-status reads:

- `GET /v1/handovers/inbox?status=unacknowledged` returns only handovers for
  which the authenticated supervisor is the named incoming supervisor in the
  active tenant. Results are ordered by submitted time descending and use an
  opaque cursor.
- Each inbox item contains the handover ID and version, author, submitted and
  last-edited times, shift, note, linked work-order summaries,
  acknowledgement state, and notification status.
- The database owns notification status `PENDING`, `ACCEPTED`, or `DELAYED`.
  Create and edit set `PENDING`; the adapter changes it after NotifyBird
  acceptance or final retry failure. These values never change completion.
- `handover-web` polls the inbox item every 10 seconds while notification status
  is `PENDING` and stops after `ACCEPTED`, `DELAYED`, or acknowledgement. The
  UI maps those states to the approved pending and delayed content.

Shift timing:

- During create, `handover-api` resolves the tenant-owned `shift_id` through
  the existing internal shift registry and persists `incoming_shift_start_at`.
  An unknown or cross-tenant shift rejects before any write.
- The acknowledgement-latency metric measures from
  `incoming_shift_start_at` to the acknowledged receipt time.

## Operations And Evidence

- Correlation ID flows from UI to API, event, adapter log, and receipt.
- Metrics: create latency, acknowledgement latency, notification retry count,
  delayed notifications, and stale-version conflicts.
- Proposed local tests may use an in-memory event bus and fake notification
  adapter.
- No implementation, provider, deployment, accessibility, or production
  evidence has run. All such evidence is `NOT_RUN`.

## Known Decisions Before Implementation

- The approved product outcome and experience are coherent enough for product,
  design, engineering, QA, and operations review.
- The Handover API owner has not yet defined the tenant/actor scope and
  retention window for the edit idempotency key.
- `handover.updated.v1` has no approved complete payload or compatibility rule.
- The Event Platform owner has not defined ordering, replay, and consumer
  deduplication behavior across create and multiple update events.
- These items block implementation readiness but do not prevent a reviewable
  packet. Accessibility implementation and validation evidence also remains
  `NOT_RUN`; that evidence gap does not convert an approved experience rule
  into a proposal.
