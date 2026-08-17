# Routing Evaluation

Evaluate the router and the composed prompt separately. A good prompt does not
prove the tier decision, and a good tier decision does not prove the prompt.

## Routing Record

Record:

- request and claim-set identity;
- context-plan identity and source freshness;
- task profile and hard capabilities;
- selected tier and effective configuration;
- decision status: `MEASURED`, `INFERRED`, or `USER_SELECTED`;
- excluded candidates and reasons;
- fallback and escalation trigger;
- representative evaluation set and result when available.

Use these catalog labels precisely:

- `latest-stable`: current stable offering according to a dated provider source;
- `provider-flagship`: provider-positioned leading configuration;
- `tier-candidate`: configuration plausibly eligible for a neutral tier;
- `best-observed-for-workload`: winner on a named, versioned evaluation set;
- `pinned-baseline`: deliberately retained comparison configuration.

Never substitute one label for another.

## Failure Ownership

| Failure | First repair route |
| --- | --- |
| Required source absent or stale | Context plan |
| Unnecessary blocker question | Clarification policy |
| Requirement dropped or invented | Claim extraction / core contract |
| Wrong or malformed output | Output contract / surface adapter |
| Fragile boundary behavior | Targeted instruction or example |
| Capability unavailable | Tier escalation or different configuration |
| Higher tier gives no material gain | Tier downgrade |
| Permission or safety violation | Stop, constrain, or ask for authority |

Do not respond to every failure by adding prose. Repair the earliest responsible
layer, rerun the affected cases, and preserve passing evidence whose inputs did
not change.

## Minimum Evaluation Set

For reusable routing, include ordinary, boundary, missing-context, conflicting-
source, explicit-model, high-risk, tool-failure, and cost/latency-sensitive
cases. Compare quality, schema compliance, grounding, tool behavior, latency,
and cost only when measured under the same versioned conditions.
