# Synthetic Feature Packet: Asynchronous Compliance Export

All names and systems in this packet are fictional.

## Request

Specify a compliance export that submits a signed archive to fictional provider
RegulaSend. The provider may accept a request and then time out before returning
its reference. Make pending, duplicate, unknown-outcome, reconciliation, and
manual recovery behavior explicit.

## Approved Product Source `PROD-063`

- Compliance analysts select a reporting period and submit one export.
- They need a durable audit receipt and a clear distinction between queued,
  submitted, delivered, and action-required.
- Closing the browser must not cancel the export.
- Analysts may not submit a second export for the same tenant and period while
  one is queued, building, submitting, reconciling, received, or delivered.
  This rule applies across all `format_version` values; one delivered logical
  export permanently satisfies that tenant and reporting period.
- A provider timeout is not proof of failure.
- Analysts may download the exact signed archive after creation.
- Non-goals: editing source records, emailing the archive, and automatic legal
  certification.

## Experience Source `DES-301`

- Initial states: eligible, validation error, already-active, and unavailable.
- Progress states: queued, building archive, submitting, reconciling, delivered,
  and action required.
- Persisted `RECEIVED` is displayed as “Submitted — provider received,” with
  provider reference when known. It is distinct from `DELIVERED` and never
  shows a provider-confirmed delivery time.
- Delivered shows provider reference, archive digest, submission time, and
  provider-confirmed delivery time.
- Reconciling explains that the provider may already have the export and that
  submitting again is unsafe.
- Action required offers “Check again” and a support reference. It never offers
  blind resubmit.
- Status changes use an ARIA live region without moving focus.

## Target Technical Contract `API-109`

Components:

- `export-web`: starts an export and polls its status.
- `export-api`: validates tenant, period, permissions, and active uniqueness.
- `export-worker`: builds, signs, submits, and reconciles.
- `export-db`: source of truth for export and attempt state.
- `archive-store`: immutable object storage for the signed archive.
- `regulasend-adapter`: true external provider boundary.

Create:

- `POST /v1/compliance-exports`
- Auth: `compliance_analyst` in the active tenant.
- Body: `period_start`, `period_end`, and `format_version`.
- Header `Idempotency-Key` is scoped to tenant and analyst for 24 hours.
- A partial unique constraint prevents more than one active export for the same
  tenant and period across every `format_version`. It covers `QUEUED`,
  `BUILDING`, `SUBMITTING`, `UNKNOWN_OUTCOME`, `RECEIVED`, and `DELIVERED`.
- One transaction creates state `QUEUED` and an audit receipt.
- That transaction also writes `compliance-export.queued.v1` to a durable
  outbox. The dispatcher retries publication until the worker records receipt;
  browser state is never part of dispatch.
- Duplicate idempotency key returns the original export. Active uniqueness
  returns `409 EXPORT_ALREADY_ACTIVE` with the existing export ID.

Status and user-triggered reconciliation:

- `GET /v1/compliance-exports/{id}` requires a `compliance_analyst` in the
  active tenant and returns the logical export, current attempt, user-visible
  state, archive digest when created, provider reference when known, receipts,
  and next safe action.
- `POST /v1/compliance-exports/{id}/reconcile` is the authenticated operation
  behind “Check again.” It is allowed only in `UNKNOWN_OUTCOME` or
  `ACTION_REQUIRED` after reconciliation exhaustion, performs one provider
  lookup, never submits an export, and returns the updated status resource.
- The operation is rate-limited to once per 30 seconds per export and returns
  `429 RECONCILIATION_CHECK_TOO_SOON` with `Retry-After` when called early.

Archive:

- Worker claims the queued export atomically, moves it to `BUILDING`, creates a
  deterministic archive, signs it, stores it immutably, and records SHA-256.
- A claim has a two-minute lease and a 30-second heartbeat. Another worker may
  reclaim an expired lease using the existing logical export and attempt IDs;
  it resumes from durable state and may not create a second provider request
  for an attempt that reached `SUBMITTING` or `UNKNOWN_OUTCOME`.
- Archive creation failure moves to `ACTION_REQUIRED`; no provider call occurs.

Archive download:

- `GET /v1/compliance-exports/{id}/archive` requires a
  `compliance_analyst` in the active tenant and returns a five-minute signed URL
  for the exact immutable object whose digest is stored on the export.
- The archive is retained for seven years. Retention deletion is outside this
  feature, and the service must never rebuild an archive to satisfy a download.
- If the stored object is unavailable, return stable code
  `ARCHIVE_UNAVAILABLE`, move the export to `ACTION_REQUIRED`, and write an
  audit receipt.

Provider submission:

- Worker sets `SUBMITTING` and calls `POST /exports` with
  `export_request_id` as provider idempotency key, archive digest, signed upload
  URL, tenant registration ID, and format version.
- Provider `201` returns `provider_reference` and state `RECEIVED`.
- Client timeout is 12 seconds. A timeout after dispatch produces
  `UNKNOWN_OUTCOME`, represented to users as `RECONCILING`.
- The worker must not issue another `POST` while the outcome is unknown.
- The provider offers `GET /exports/by-idempotency-key/{export_request_id}`.
  Reconciliation polls after 30 seconds, then 2, 5, 10, and 20 minutes.
- If lookup finds `RECEIVED` or `DELIVERED`, store the provider reference and
  state. If lookup returns not found after the fifth check, move to
  `ACTION_REQUIRED`; support must verify provider logs before authorizing a new
  attempt with a new attempt ID but the same logical export ID.
- “Check again” performs only the provider lookup and is rate-limited to once
  per 30 seconds per export. It never creates a provider submission.
- Provider `429` respects `Retry-After` and remains `SUBMITTING` before a request
  body is dispatched. It retries the same attempt and provider idempotency key
  at most five times within 30 minutes; exhaustion moves to `ACTION_REQUIRED`
  with no unknown outcome. Provider validation `400` moves directly to
  `ACTION_REQUIRED` with a stable internal category.
- A connection failure proven to occur before request-body dispatch retries the
  same attempt under the same limit. Any transport failure or provider `5xx`
  after request-body dispatch becomes `UNKNOWN_OUTCOME` and uses reconciliation
  rather than submission retry.
- Raw provider responses are restricted evidence and are never shown in UI or
  ordinary logs.

Manual recovery:

- Only a tenant-scoped `compliance_export_support` role may call
  `POST /v1/compliance-exports/{id}/attempts` after the export reaches
  `ACTION_REQUIRED` from the fifth not-found result.
- The body requires a restricted `provider_log_verification_ref` and a human
  reason. One transaction writes an `attempt_authorized` receipt, creates a new
  attempt ID under the same logical export ID, and queues that attempt.
- The endpoint rejects recovery while an attempt remains `UNKNOWN_OUTCOME`, or
  when the export is already `RECEIVED` or `DELIVERED`.
- A valid late delivery callback for any attempt marks the logical export
  `DELIVERED`, prevents further attempts, and raises an operations alert if a
  later attempt had already been authorized. The callback never triggers a
  submission.

Delivery callback:

- `POST /v1/provider/regulasend/events` uses signature verification, timestamp
  tolerance of five minutes, and event ID deduplication.
- `export.delivered.v1` includes provider reference, export request ID, and
  delivered time.
- A valid callback moves `RECEIVED` to `DELIVERED` and writes one delivery
  receipt. Duplicate events have no second effect.
- Delivery is monotonic: a later received event cannot move `DELIVERED`
  backward, and an out-of-order valid delivery callback may move
  `UNKNOWN_OUTCOME` or `ACTION_REQUIRED` to `DELIVERED` for the matching
  attempt without issuing another provider request.

## Unresolved Permanent-Invariant Enforcement

- The product rule says one delivered logical export permanently satisfies a
  tenant and reporting period.
- The stated partial unique constraint depends on the export's mutable state
  being in its predicate, including `DELIVERED`.
- The archive-unavailable rule moves the same export from `DELIVERED` to
  `ACTION_REQUIRED`. No source defines a durable delivered tombstone, immutable
  completion marker, second uniqueness constraint, or separate archive-health
  state that would keep the permanent rule enforced after that transition.
- The Compliance Data owner must decide the durable mechanism or revise the
  archive-health transition before this contract is implementation-ready.

## Observability And Evidence

- Correlation uses logical export ID, attempt ID, provider idempotency key, and
  provider reference when known.
- Metrics cover time in each state, unknown outcomes, reconciliation result,
  duplicate create requests, callback signature failures, and action-required
  exports.
- Local adapter and state-machine tests are proposed.
- No live provider, deployment, production, or accessibility evidence has run;
  those statuses are `NOT_RUN`.
