# Capability map contract

## Capability record

| Field | Rule |
|---|---|
| `slug` | Stable lower-kebab description of the behavior, never an ordinal ID |
| `outcome` | Observable result, not a team, phase, or implementation |
| `trigger` | Event or condition that starts the behavior |
| `actions` | Decisions and actions required to reach the outcome |
| `inputs` | Named inputs with exact `source_locator` values |
| `output` | Artifact, decision, state change, or message produced |
| `execution_boundary` | `deterministic`, `model-assisted`, or `human-authorized` |
| `tool_families` | Interface families needed; an empty list is valid |
| `context` | Authoritative context required during execution |
| `side_effects` | External or durable effects; an empty list means read-only |
| `permission_risk` | `none`, `low`, `medium`, `high`, or `critical` |
| `constraints` | Latency, ordering, and parallelism constraints |
| `success_oracle` | Observable pass/fail rule independent of confident prose |
| `recovery` | Retry, alternative, escalation, or stop route |
| `evidence_status` | `provided`, `observed`, `inferred`, `assumed`, or `unresolved` |
| `cluster` | One responsibility-cluster slug |
| `primary_owner` | One agent or deterministic-workflow slug |

The last two fields may remain proposed during mapping, but must resolve in the final architecture packet.

## Extraction tests

For each source statement, ask:

1. Does it assert an outcome, constraint, authority rule, interface, or evaluator?
2. Is it one behavior or multiple behaviors joined by sequencing or conjunction?
3. Is it supported directly, observed in an existing system, inferred, assumed, or unresolved?
4. Which exact source span supports it?
5. What observable result would prove it occurred correctly?

Do not extract decorative implementation language as a capability. Convert “have a research agent” into the actual outcomes, such as `collect-primary-evidence` and `synthesize-evidence-conflicts`, then decide whether one owner can perform both.

## Clustering tests

Calculate clusters by judgment, not keyword similarity. Merge candidates when most of the following match: outcome, authoritative context, tool and permission boundary, oracle, temporal state, recovery owner. Split only when at least one boundary is material and the resulting unit is independently goal-directed and evaluable.

Before accepting a split, answer:

- What exclusive decision or mutation does the new owner control?
- What typed input and output cross the boundary?
- Who owns recovery and the merged result?
- What local test could fail this unit without failing only the whole system?
- Why is a focused skill or deterministic function insufficient?

If these answers are weak, keep one cluster.

## Interview construction

Create a question from a gap only when all are true:

1. the answer is not discoverable from an authorized source;
2. alternatives lead to materially different designs or safety outcomes;
3. proceeding with an assumption is not safely reversible;
4. the user is the likely authority.

Phrase the decision, not the missing field. Example: “May the agent send the refund, or only prepare it for approval? This determines write permissions and the confirmation gate.” Prefer two or three concrete alternatives and allow a short free-form answer. Combine questions that share the same authority decision.

## Minimal example

```yaml
slug: authorize-refund
outcome: An eligible refund is either authorized or routed for approval.
trigger: A validated refund request is ready for a decision.
actions: [check deterministic policy, compare authority limit, authorize or escalate]
inputs:
  - name: refund request
    source_locator: brief.md#refund-flow
output: typed refund decision
execution_boundary: human-authorized
tool_families: [billing-write]
context: [refund policy, requester identity, order state]
side_effects: [funds movement]
permission_risk: high
constraints: {latency: under 30 seconds, ordering: after eligibility, parallelism: none}
success_oracle: Decision matches policy and authority; any write has confirmation evidence.
recovery: Stop the write and escalate to the billing owner.
evidence_status: provided
cluster: resolve-refund-request
primary_owner: refund-workflow
```
