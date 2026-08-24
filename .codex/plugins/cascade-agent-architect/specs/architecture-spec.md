# Cascade Agent Architect specification

## Compilation flow

```text
request and evidence
  -> material-gap interview
  -> atomic capabilities
  -> responsibility clusters
  -> deterministic-versus-model boundary
  -> smallest sufficient topology
  -> complete behavior blocks
  -> roles, skills, workflow, tools, and prompts
  -> evaluation contract
  -> versioned architecture packet
```

## Capability record

Each capability uses a semantic slug and records:

- intended outcome;
- triggering condition;
- actions and decisions;
- inputs and source locators;
- output artifact or state change;
- tool or interface family;
- context and state needed;
- side effects and permission risk;
- latency, ordering, and parallelism constraints;
- success oracle;
- recovery or escalation route;
- evidence status: `provided`, `observed`, `inferred`, `assumed`, or `unresolved`.

Do not assign opaque claim IDs. Preserve exact source locators and generate a stable semantic slug only for cross-reference.

## Clustering rule

Cluster capabilities when they share most of these:

- one user or system outcome;
- one authoritative context set;
- one tool and permission boundary;
- one success oracle;
- tight temporal or state coupling;
- one recovery owner.

Split a cluster only when the new cluster is independently goal-directed and evaluable and at least one of these is material:

- distinct least-privilege tool boundary;
- different authoritative or sensitive context;
- meaningful independent parallelism;
- different failure or recovery owner;
- different evaluator authority;
- context size or instruction complexity demonstrably harms the simpler design.

Clusters are architecture hypotheses. Simulation evidence may merge or split them later.

## Topology selector

Evaluate candidates in this order:

1. Deterministic code or workflow with no model-controlled execution.
2. One agent with one focused instruction contract.
3. One agent with multiple focused skills and tools.
4. Manager agent with bounded specialists used as tools.
5. Decentralized handoffs only when user-facing ownership truly transfers.
6. Evaluator-optimizer only when iterative refinement has a measurable oracle.

Reject additional agents that merely mirror capabilities, job titles, phases, or documents. Every agent needs exclusive responsibility, a bounded interface, an observable done condition, and local evaluation evidence.

## Complete behavior blocks

Every system packet must define:

1. Objective, represented users, non-goals, autonomy, and risk.
2. Input contract, source authority, ambiguity/interview policy, and injection boundary.
3. Output contract and observable completion criteria.
4. Core act-observe-update loop with time, turn, tool, token, and cost limits.
5. State machine and durable state owner.
6. Context assembly, retrieval, compaction, and rehydration.
7. Working, episodic, and durable memory with provenance, retention, invalidation, and conflict rules.
8. Typed tools/adapters, idempotency, errors, permissions, confirmation, and least privilege.
9. Skills, prompt contracts, and target model capability envelope.
10. Roles, ownership, delegation or handoff packets, and merge authority.
11. Failure taxonomy and retry, alternative, recovery, escalation, or stop behavior.
12. Trace identity, events, usage, sensitive-data redaction, and operational metrics.
13. Mechanical, outcome, trajectory, safety, cost, latency, and regression evaluations.
14. Rollout, rollback, versioning, and invalidation rules.

## Handoff packet

A handoff carries only typed, task-relevant state:

- goal and accepted inputs;
- source/evidence references;
- completed work and current state;
- unresolved risks or decisions;
- allowed tools and permissions;
- expected output and success oracle;
- return, escalation, and timeout route.

Application state remains owned by the harness; it is not hidden inside prompt history.

## Architecture packet

The default output is:

```text
architecture/
  architecture.yaml
  capability-map.md
  topology-decision.md
  roles/
  skills/
  workflows/
  prompts/
  evaluation/
  decisions.md
```

The YAML file is the machine-validated index. Markdown files remain the primary human review surface. Generated target files are candidates until the user explicitly authorizes writing them into a target repository.
