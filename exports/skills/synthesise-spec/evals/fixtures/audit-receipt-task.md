# Synthetic Task Packet: Assignment Audit Receipt

All names and systems in this packet are fictional.

## Request

Create one implementation task slice for the audit-receipt portion of approved
parent spec `SPEC-072`. Do not rewrite the parent feature.

## Parent Contract `SPEC-072`

- `BR-04`: every accepted device-assignment change has exactly one tenant-scoped
  audit receipt for each source event.
- `OUT-03`: auditors can query the receipt with actor, device, previous owner,
  new owner, and accepted time.
- `AC-09`: replaying the same event does not create another receipt.
- Product outcome: compliance reviewers can prove who changed device ownership
  without reading service logs.

## Approved Event Contract `EVENT-033`

- The exact trigger is validated event `device.assignment.changed.v2`.
- Required fields are `event_id`, `tenant_id`, `device_id`, `actor_id`,
  `previous_owner_id`, `new_owner_id`, and `accepted_at`.
- The audit consumer rejects a missing tenant or device identifier before any
  write and never reads tenant identity from process-global context.
- The consumer emits no external event.

## Implementation Boundary `DES-118`

- `assignment-audit-consumer` owns event validation and the receipt write.
- `audit-db` owns durable receipt state.
- One atomic `audit-db` insert-or-compare transaction inserts the receipt under
  unique key `(tenant_id, event_id, receipt_kind)` where `receipt_kind` is
  `assignment_changed`. On a uniqueness conflict, it locks or otherwise reads
  the committed existing row before classifying the replay.
- A replay is identical only when `device_id`, `actor_id`,
  `previous_owner_id`, `new_owner_id`, and `accepted_at` all exactly match the
  existing receipt. An identical replay returns the existing receipt identity
  and creates no second row.
- Any mismatch in those canonical replay fields is rejected as
  `AUDIT_EVENT_CONFLICT`; the existing row is unchanged. The consumer writes
  stable structured signal `audit_event_conflict`, increments
  `audit_event_conflict_total`, and the existing monitoring rule for that
  metric alerts operations. Changing the rule is outside this task. The
  consumer emits no domain or integration event.
- The query API already exists and is outside this task.

## Task Evidence

Add a consumer contract test for first delivery, identical replay, a
parameterized mismatch of each canonical replay field, missing tenant, and
missing device. Assert `audit_event_conflict`,
`audit_event_conflict_total`, and no domain event for conflicts. Add a database
integration test for the unique constraint, atomic insert-or-compare behavior
under concurrency, and transaction rollback. No implementation or validation
has run; all evidence is `NOT_RUN`.
