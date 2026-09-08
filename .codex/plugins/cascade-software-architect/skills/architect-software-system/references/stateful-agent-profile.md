# Stateful-agent software mapping

Load only when the user or accepted architecture selects the modular
Analyzer–Policy Engine–Composer family, including `schema-values-text@1`.

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

For a supplied stateful-agent architecture, consume its versioned role, policy,
projection and release contracts. Map them to the existing application boundary;
do not infer one service per role. Distinguish semantic proposals, atomic commits,
direct context projections, model requests and actual delivery. Default to current
records and ordinary query functions; explicitly justify CQRS/persisted read models
or full event sourcing. Context projection alone requires neither. Bind recovery, revocation, token/task budgets and
output-release gates; a reference codec or cache digest is not runtime proof.
