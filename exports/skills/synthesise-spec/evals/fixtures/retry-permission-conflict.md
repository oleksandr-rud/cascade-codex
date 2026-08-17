# Synthetic Feature Packet: Carrier Pickup Retry Permission

All names and systems in this packet are fictional.

## Request

Specify who may retry a rejected carrier pickup request and what the warehouse
user sees. Inspect the sources before asking questions.

## Product Decision `PROD-017`

Status: approved on 2026-06-14. Owner: former Returns product lead; the role is
currently vacant.

- Only an inventory supervisor may retry an externally rejected carrier pickup.
- A retry is an external mutation and must be attributable to the supervisor.
- Warehouse agents may view the rejection and ask a supervisor for help.

## Operations Decision `OPS-009`

Status: approved on 2026-07-03 by the warehouse operations council.

- A warehouse agent may retry once within 15 minutes when the carrier category
  is `TEMPORARY_CAPACITY`.
- The agent must provide a short reason.
- All other rejection categories require a supervisor.
- The decision says it overrides “the old retry restriction,” but it does not
  cite `PROD-017` or name a product-policy approver.

## Current Implementation `AUDIT-088`

Status: observed in release `returns-4.3.0`.

- The API authorizes both `warehouse_agent` and `inventory_supervisor` for all
  retry categories.
- The UI shows Retry to both roles.
- The API records actor ID but not retry reason.
- A carrier timeout can leave the outcome unknown; current code retries
  immediately with a new request ID.
- No current test asserts role/category behavior.

## Draft Design `DES-099`

Status: proposed, not approved.

- The draft shows Retry for warehouse agents and supervisors.
- It does not show the 15-minute window, reason field, category restriction, or
  unknown-outcome state.

## Authority Gap

- `PROD-017` and `OPS-009` are both marked approved and materially conflict.
- No source defines whether the operations council may supersede product
  permission rules.
- The Returns Governance Committee is the current accountable authority for
  permission-policy precedence and is available to resolve this conflict, but
  it has not issued a decision.
- Neither approved decision defines what a timeout or other unknown external
  outcome means, whether a lookup exists, or when a new carrier request is
  safe. The Carrier Integration Council owns reconciliation and external
  mutation safety and is available, but it has not approved a target rule.
- Do not infer the intended rule from current insecure behavior or the draft
  design.

## Evidence

- No implementation or provider tests have run for the proposed change.
- Any final specification depends on both the permission-precedence decision
  and an approved unknown-outcome reconciliation and retry rule.
