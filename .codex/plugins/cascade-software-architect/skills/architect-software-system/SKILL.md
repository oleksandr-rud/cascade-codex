---
name: architect-software-system
description: Design or revise a source-grounded software-system architecture, including boundaries, application units, interfaces, data and state ownership, runtime resources, delivery constraints, and validation seams; use before a cross-boundary implementation when the architecture itself is unresolved, not for ordinary code edits or AI-agent topology alone.
---

# Architect Software System

Produce a reviewable architecture candidate from current sources. Start with
observable behavior and ownership, then select the smallest structure that
satisfies the accepted constraints.

Map application units, public contracts, state/data owners, trust boundaries,
runtime resources, dependency categories, failure behavior, delivery and
operability constraints, and validation seams. Use `select-architecture-patterns`
only with a host-supplied, versioned pattern catalog. Classify every applicable
pattern `ADOPTED`, `ADAPTED`, `REJECTED`, or `GAP`; a reference default is not a
mandate.

Derive source modules from concrete domain entities, aggregates, or cohesive
business capabilities and name them accordingly—for example `auth`, `users`,
`customers`, `crm`, or `billing`. Require each module to own identifiable state
or policy, invariants and use cases, one public entrypoint, and its
domain-specific contracts. Reject top-level category buckets such as `core`,
`common`, `services`, `business`, `managers`, `helpers`, `utils`, `application`,
`domain`, or `infrastructure`. Those internal categories are optional only
inside a concrete domain module when enough real code exists to justify them.

Default server-side systems to a modular monolith: one application/release
boundary, explicit domain modules, and direct in-process calls through their
public contracts. Do not add internal HTTP, RPC, or a broker merely to connect
modules. Keep module dependencies acyclic and assign cross-module workflows to
a named domain use case, not a generic coordinator or service bucket.
Within modules, prefer vertical use-case slices with colocated validation,
orchestration, mapping and tests. Start with one file for a small operation; split
handler/processor/contract/context only when size or responsibility justifies it.
A named service owns a real reusable domain operation, not a mandatory forwarding
layer. Emitters are optional local notifications; publishers need a real outbound
consumer/delivery contract. Required state changes use direct calls/transactions.
For the supplied modular-agent profile, place controllers/handlers at the module
root, operations/DTOs and admission/policy orchestration in `application/`, and
shared conversation invariants and policy rules in `domain/`. Shared conversation
persistence stays in `data/`; agent-owned state/store, roles, schemas, prompts and
projections stay under `agents/assistant-agent/` and reference domain policies.
Projection means a role/task-specific policy-state slice issued by application
Policy Engine and admission using domain rules. Agent-local projection files are
trusted definitions/helpers for that issuer; context compilation only formats
issued inputs. Colocation does not grant models read/write authority. Keep one owner per record and let
the application coordinate atomic writes across stores. Use a base-agent only for
proven shared behavior, not speculative inheritance. Use either
use-case or application-service naming consistently; no duplicate forwarding pair
or transport folder is required. These are local layers inside a capability module.
For the supplied `schema-values-text@1` implementation profile, use ordered
object/schema/value blocks and direct issuance/assembly functions. Place trusted
profiles with the agent definition and host admission/token accounting in
application. Share approved rendered blocks only within their disclosure scope;
do not introduce a generic projection service or another state owner.

Allow one shared database while each module owns its tables, models, migrations,
and writes. Other modules use the owner's public contract, not its storage.
Keep required cross-module atomicity explicit in the owning use case. Add
durable asynchronous delivery only when loss, replay, or external-consumer
requirements justify it. Recommend a separate service only when current
evidence requires independent release ownership, scaling, data or security
isolation, availability, or failure containment.
Create shared technical code only for a named stable mechanism with at least two
current consumers; do not generate speculative cache, messaging, provider,
event, repository-base, or other boilerplate.

Keep domain decisions with their owning plugins and application facts with the
target repository. Do not scaffold source, select dependencies, mutate a target,
or accept the candidate. Return sources, assumptions, boundaries, alternatives,
chosen structure, consumer impacts, risks, validation gates, and unresolved
gaps.

For a supplied stateful-agent architecture, consume its versioned role, policy,
projection and release contracts. Map them to the existing application boundary;
do not infer one service per role. Distinguish semantic proposals, atomic commits,
direct context projections, model requests and actual delivery. Default to current
records and ordinary query functions; explicitly justify CQRS/persisted read models
or full event sourcing. Context projection alone requires neither. Bind recovery, revocation, token/task budgets and
output-release gates; a reference codec or cache digest is not runtime proof.
