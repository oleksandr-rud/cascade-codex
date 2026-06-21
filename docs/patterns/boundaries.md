# Boundary Patterns

Use this file for codebase structure, layer boundaries, public contracts,
adapter discipline, and agentic runtime invariants.

## Folder Mapping

Current scaffold boundaries:

| Area | Target Path | Owner | Notes |
|---|---|---|---|
| Harness skills | `.codex/skills/` | Cascade maintainers | Reusable workflow contracts and templates. |
| Harness agents | `.codex/agents/` | Cascade maintainers | Role manifests, instructions, and skill maps. |
| Durable docs | `docs/` | Project maintainers | Product, design, spec, work, glossary, and pattern memory. |
| Validation script | `scripts/validate_cascade_codex.py` | Project maintainers | Primary executable check for the current scaffold. |
| Public contracts | `AGENTS.md`; `CODEX.md`; `harness.config.yaml`; `.codex/config.toml` | Project maintainers | Agent boot contract, runtime bridge, adapter config, and harness registry. |
| UI/features | none yet | Project maintainers | Add source roots and ownership when application implementation starts. |
| State/store | `docs/work/` | Project maintainers | Active work state, lane packets, examples, and reports. |
| External adapters | `.codex/config.toml` | Project maintainers | MCP server configuration and future tool integrations. |
| Generated artifacts | none yet | Project maintainers | Add explicit paths before committing generated files. |

## Layer Discipline

| Layer | Owns | Must Not Own |
|---|---|---|
| Entry point | Transport, parsing, auth/caller context, response shape | Business orchestration or direct persistence shortcuts |
| Application/service layer | Workflow orchestration, invariants, persistence coordination | UI concerns or raw transport formatting |
| Persistence/data layer | Data access details, transactions, query shape | Product decisions outside its contract |
| External adapter | Provider-specific calls, retries, provider schemas | Core workflow decisions |
| UI/interaction layer | Visible state, controls, client-side flow | Server invariants or persistence rules |
| Agent/runtime layer | Model/tool loop, context use, structured output | Hidden data mutations outside approved tools |

## Module And Seam Review

Use before cross-boundary implementation, public-contract changes, shared
abstractions, state-machine changes, or major refactors.

- Start one level above the requested file change: name the behavior, owning
  boundary, and public contract first.
- Identify direct and hidden consumers.
- Prefer existing module boundaries and helper APIs.
- Add an abstraction only when it removes real complexity or matches an
  established local pattern.
- Keep public-contract changes explicit and approved.
- Validate through stable public boundaries, not incidental helper shape.

Warning signs:

- A module mostly forwards parameters without enforcing invariants.
- Callers still perform orchestration before and after calling it.
- Multiple callers duplicate filters, guards, or error handling.
- Tests mock many internals to prove one visible behavior.

## Dependency Test Categories

Classify dependencies before adding a seam or choosing a test double:

| Category | Meaning | Test Strategy |
|---|---|---|
| In-process | Pure computation or local in-memory state | Test through the module's public interface directly |
| Local substitute | Dependency has a reliable local stand-in | Use the stand-in inside the test suite; keep the seam internal |
| Remote owned | A service the project owns across a network or queue | Define a port only when production and test adapters are both real |
| True external | Third-party provider or unstable external system | Inject the provider-facing port and mock only that boundary |

Do not expose internal seams merely because a test uses them. The interface is
the test surface.

## Data Boundary Review

Use when persistence, query shape, document shape, indexes, retention, cache,
or replicated fields affect behavior or performance.

- Build an access-pattern matrix before proposing data-shape changes: actor,
  data owner, read/write operation, filter/query, sort/projection, cardinality,
  frequency, freshness, lifecycle, and validation evidence.
- Name source of truth. If a field is duplicated, name the owner, copied target,
  update path, staleness tolerance, and validation check.
- Bound histories and arrays. Prefer summaries, buckets, archives, cursors, or
  rollups when the product only needs recent state, counters, rankings, or
  trends.
- Propose indexes or query optimizations only for owner queries. Include key
  order, uniqueness/partial/TTL rules when relevant, expected improvement,
  write cost, and verification evidence.
- Do not introduce data-access layers or repository abstractions unless they
  hide real invariants, remove meaningful duplication, or match an established
  local pattern.

## API And Public Contracts

- Define explicit request and response shapes for success cases.
- Keep transport handlers thin.
- Validate auth, permission, tenant, account, or caller context at the boundary.
- Use consistent error envelopes or documented error codes.
- Regenerate or update public contract docs when schemas change.
- Update all known consumers for breaking changes.

## Adapter Boundaries

```text
Core workflow -> port/interface -> provider adapter -> external system
```

Rules:

- Core workflow depends on the port, not provider-specific classes.
- Adapter-specific schemas are translated at the boundary.
- Test adapters or mocks implement the same contract.
- Provider errors are translated into stable internal error types.
- Retries, idempotency keys, rate limits, and timeouts are explicit.
- Do not add an adapter abstraction until there is real variation or the
  provider boundary is costly to test directly.

## Agentic Runtime Invariant

Write the target project invariant in this shape:

```text
Every coding-agent turn for Dynamic Persona Assistant routes through
AGENTS.md and CODEX.md before using Cascade skills or role contracts.
Agents may load deterministic scoped context from harness.config.yaml,
docs/, .codex/skills/, and .codex/agents/ before acting and must validate
or record durable outcomes through the configured docs and validator. They
must not bypass the runtime bridge for non-atomic work or persist durable
project facts outside the narrowest owner doc.
```

Audit:

- Is context scoped, bounded, cached, and necessary?
- Is memory bounded or summarized?
- Are tool surfaces narrow and permissioned?
- Are helper outputs compact and typed?
- Do traces capture tokens, tool counts, retries, and context load costs?
