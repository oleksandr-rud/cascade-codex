---
name: map-agent-capabilities
description: Extract, ground, and cluster the capabilities required by an AI agent or agentic system. Use when turning a request, brief, workflow, product spec, incident, or existing agent design into atomic outcome-oriented responsibilities; when finding missing authority or requirements; or when deciding which capabilities belong in deterministic code, one agent, focused skills, or separately evaluable agents.
---

# Map Agent Capabilities

Produce a traceable capability map, not a role list. Each record describes an observable behavior, its authority, and how success or failure is decided.

## Extract

1. Enumerate authoritative sources and exact locators before interpreting them.
2. Extract outcome verbs: what must be decided, changed, produced, observed, recovered, or escalated.
3. Split compound statements until each capability has one trigger, one primary outcome, one owner boundary, and one success oracle.
4. Preserve conflicts. Prefer the highest declared authority; otherwise mark `unresolved` and create a material gap.
5. Mark evidence as `provided`, `observed`, `inferred`, `assumed`, or `unresolved`. Do not upgrade inference into fact.

Use semantic slugs such as `authorize-refund` or `summarize-repair-evidence`. Store source locators in the input records; never encode evidence in opaque IDs.

## Find material gaps

Draft the map first, then test whether it can answer:

- What observable outcome and stop condition are required?
- Which source is authoritative when facts conflict?
- Which writes, messages, purchases, deletions, credentials, or sensitive data are allowed?
- What must be deterministic, confirmed, or escalated?
- What environment and interfaces exist?
- How will success, failure, cost, and latency be measured?

Ask only when the missing answer can materially change the design and cannot be discovered safely. Combine related gaps into at most three questions. Include why each answer matters and concrete options when known. Continue with a labeled assumption for reversible low-risk gaps; return `GAP` or `BLOCKED` for missing authority, unsafe side effects, or absent success criteria.

## Classify and cluster

Classify each capability boundary as:

- `deterministic`: stable rules, parsing, validation, permissions, accounting, state transitions, or reducers;
- `model-assisted`: semantic interpretation, synthesis, planning, or uncertain classification under a bounded contract;
- `human-authorized`: irreversible, high-impact, policy, or unavailable-authority decisions.

Cluster capabilities when they share an outcome, authoritative context, tool and permission boundary, success oracle, temporal state, and recovery owner. Split only for a material least-privilege boundary, independently evaluable goal, authoritative-context separation, useful parallelism, different recovery owner, or demonstrated context/instruction overload. A phase, job title, document, or noun is not by itself a cluster.

## Output

Keep the user-facing answer concise. Output requirements specify information,
not extra headings. Preserve required schemas, evidence and permissions. Avoid
duplicate artifact prose, empty sections, unsolicited variants and extra files
unless needed for the requested delivery or an actual handoff.

Return `capability-map.md` plus `capabilities` and `clusters` fragments compatible with the architecture packet. Include:

- source inventory and conflict decisions;
- one complete record per capability;
- cluster membership and split/merge rationale;
- deterministic/model/human boundary;
- assumptions, material gaps, and interview answers;
- coverage check from every requested outcome to a capability and oracle.

Read `references/capability-map-contract.md` for field definitions, clustering tests, and a concise example.
