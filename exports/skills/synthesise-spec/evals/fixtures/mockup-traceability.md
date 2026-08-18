# Synthetic Feature Packet: Field Maintenance Job Start

All names and systems are fictional.

## Request

Create a readable specification for starting a field-maintenance job. Use the
provided product, implementation, API, and mockup sources. The packet must let
product, design, engineering, and QA see exactly which mockup states support
which journey and acceptance behavior.

## Approved Product Source `PROD-062`

Status: approved on 2026-08-16.

- The user is an authenticated field technician assigned to the job.
- The technician reviews the job, asset, latest revision, and required safety
  procedure before starting.
- Starting is allowed only while the client is online, the user remains the
  assigned technician, and the displayed job revision is current.
- Offline users may review cached job information but must reconnect before
  starting. The approved offline action label is **Reconnect to start**.
- A start completes only when the server durably records one start receipt.
- Starting does not close the job, certify safety isolation, or mutate the
  asset.

## Current Implementation Audit `AUDIT-207`

Status: observed in build `field-app-3.4.0` at commit `a2710fb` on 2026-08-16.

- The current job page shows title, asset, assignee, and revision.
- It has no start operation or start receipt.
- The audit covered desktop 1440×900 only. Mobile and offline runtime states
  were not inspected.

## Supplied Design Artifact `DES-410`

- Owner: Field Experience Design.
- File: `evals/fixtures/mockup-job-start.svg`.
- Version: `2026-08-16-r3`.
- The SVG contains two addressable groups:
  - `#ready-desktop`, intended reference `DES-410:V01`, labeled READY at
    desktop 1440×900. It shows **Start job** and revision 7.
  - `#offline-mobile`, intended reference `DES-410:V02`, labeled OFFLINE at
    mobile 390×844. It shows **Start offline** and says changes will sync later.
- `DES-410:V01` is an approved target view.
- `DES-410:V02` is a proposed target view and conflicts with `PROD-062`.
- No loading, permission-denied, stale-revision, saving, save-failure,
  receipt-success, reconnecting, or desktop-offline/mobile-ready view is
  supplied.
- No mockup render, interaction, accessibility, responsive, or implementation
  comparison evidence is supplied in this packet. An author with image access
  may inspect the SVG and must state the exact scope; otherwise use an honest
  non-visual inspection mode.

## Approved Target API `API-210`

Status: approved, not implemented.

- `POST /v1/jobs/{job_id}/start`.
- Required body: `revision`; required header: `Idempotency-Key`.
- Server guards: authenticated tenant, assigned technician, job state `READY`,
  current revision, and an online request reaching the server.
- In one transaction the API moves the job to `IN_PROGRESS` and inserts one
  `job_started` receipt keyed by tenant, job, and idempotency key.
- Success is `201` with job ID, state, version, and receipt ID. A duplicate key
  returns the original result without a second receipt.
- Stale revision returns `409 JOB_VERSION_CHANGED` with the current revision.
- Assignment loss returns `403 JOB_ASSIGNMENT_CHANGED`.
- Invalid state returns `409 JOB_NOT_READY`.
- Network failure before a response has an unknown outcome. The client reads
  the current job and receipt by idempotency key before offering another start.
- There is no offline queue and no API operation that authorizes **Start
  offline**.

## Decisions And Evidence Boundary

- Product and API owners agree that offline start is prohibited.
- The Design owner must revise `DES-410:V02` to **Reconnect to start** and
  define reconnecting and failure states. This blocks implementation readiness
  but does not prevent a reviewable packet.
- Target API and approved design behavior are not implemented. API,
  interaction, accessibility, mobile runtime, and durable-receipt validation
  are `NOT_RUN`.
- A static mockup must not be treated as proof of implementation, responsive
  behavior beyond its labeled viewport, or server completion.
