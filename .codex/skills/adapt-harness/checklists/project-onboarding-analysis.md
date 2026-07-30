# Project Onboarding Analysis Checklist

Use this checklist with `adapt-harness` when onboarding should analyze the
target project deeply enough to produce project-part specs, feature specs,
visual/design/brand evidence, security and architecture notes, stack maps,
validation routes, durable context-memory entries, and bounded pattern context
entries when reusable rules are discovered.

## Preconditions

- [ ] Target repository root is known.
- [ ] `bun scripts/cascade.ts target inventory --root .` completed
      and its digest, source revision, roots, manifests, entrypoints, contracts,
      commands, and source snapshot were reviewed.
- [ ] Existing `AGENTS.md`, `CODEX.md`, `.codex/`, docs, README files,
      manifests, build files, test config, routes, entry points, and public
      contracts were inspected before writing.
- [ ] Existing user-authored instructions are preserved unless replacement is
      requested or they conflict with the active harness route.
- [ ] Project Onboarder is the merge owner for doc placement.
- [ ] Any specialist role route is authorized before delegated execution.

## Phase Checklist

| Phase | Status | Skill Route | Evidence To Collect | Owner Targets |
|---|---|---|---|---|
| `ON-00` context inventory | `[ ]` | `context`, `adapt-harness` | inventory digest, source revision/snapshot, repo root, branch, harness files, docs roots, manifests, entry points, contracts, feature-surface candidates, blockers | onboarding manifest, `docs/work/active.md`, `docs/work/reports/` when needed |
| `ON-01` stack and commands | `[ ]` | `adapt-harness` | runtime stack, package managers, source roots, test roots, commands, runners, target-config validation | `harness.config.yaml`, onboarding manifest, `docs/glossary.md` |
| `ON-02` code area specs | `[ ]` | `adapt-harness`, `architecture-review` | backend, frontend, shared, data, integration, tooling, runtime areas and public contracts | `docs/specs/{slice-slug}/`, `docs/patterns/boundaries/index.md` |
| `ON-03` architecture boundaries | `[ ]` | `architecture-review`, `docs-impact-map`, `pattern-context` | layer boundaries, consumers, side effects, public contract rules, adapter rules | `docs/patterns/boundaries/`, other bounded pattern entries, `docs/glossary.md` |
| `ON-04` security and data handling | `[ ]` | `codebase-audit`, `auth-analysis`, `secure-design`, `pattern-context` | auth, role gates, tenant or owner boundaries, secrets, external sends, auditability, abuse cases | `docs/patterns/boundaries/`, `docs/patterns/testing/`, bounded security entry only when evidence exists, `docs/work/reports/`, `docs/backlog/_index.md` |
| `ON-05` feature catalog | `[ ]` | `ingest-spec`, `discover`, `synthesis-to-spec`, `compose-spec` | visible features, routes, jobs, user-facing copy, API contracts, existing specs, tests | `docs/product/`, `docs/specs/{slice-slug}/`, `docs/backlog/_index.md` |
| `ON-06` visual/design/brand capture | `[ ]` | `visual-qa`, `ux-flow-review`, `design-system`, `brand-positioning` | screenshots or UI evidence, layout, responsive behavior, states, tokens, components, tone, naming, visual direction | `docs/design/`, `docs/brand/`, `docs/product/`, `docs/work/reports/` |
| `ON-07` functional acceptance and simulation map | `[ ]` | `functional-qa`, `simulation-campaigns`, `docs-impact-map` | scenarios, acceptance checks, simulation ID/owner, API/browser/CLI/manual proof routes, runner gaps | `docs/product/scenarios.md`, `evals/simulations/`, `evals/campaigns/`, `docs/patterns/testing/index.md`, `harness.config.yaml` |
| `ON-08` context-memory routing | `[ ]` | `docs-impact-map`, `pattern-context`, `closeout` | source identity, durable facts, pattern packs, gaps, deferred work, rejected scope worth preserving | narrow owner docs, `docs/patterns/context-memory/`, bounded pattern entries |
| `ON-09` validation and handoff | `[ ]` | `validate-change`, `closeout` | target-mode Cascade validator, configured-command availability and per-command dispositions, complete manifest, preservation hashes, current drift result, target checks, stale searches, files written/skipped/blocked | `docs/work/onboarding-manifest.json`, `docs/work/reports/`, final response |

## Project-Part Spec Requirements

Create a separate `templates/project-part-spec.md`-shaped artifact only when
the project area has enough independent behavior, ownership, or validation
risk to justify a separate packet. Typical areas include backend services,
frontend feature surfaces, shared contracts, data/storage, external adapters,
auth/security boundaries, runtime/orchestration, or developer tooling.

Each project-part spec must include:

- source identity and inspected files;
- area owner and public contracts;
- current behavior and user-visible outcomes when present;
- architecture boundaries and hidden consumers;
- security and data-handling notes when relevant;
- feature or scenario links;
- design, brand, and visual evidence links for UI surfaces;
- validation commands, functional checks, and missing coverage;
- Doc Routing Decision Matrix rows for durable facts;
- open questions, blockers, and next route.

## Routing Rules

- Product feature intent, requirements, journeys, scenarios, and acceptance
  criteria go to `docs/product/` or `docs/specs/{slice-slug}/`.
- Design tokens, components, layout, interaction, accessibility, and visual
  evidence rules go to `docs/design/` or `design-system`.
- Brand naming, tone, content, positioning, and visual direction go to
  `docs/brand/` or `brand-positioning`.
- Stack, source roots, commands, runners, tracker settings, and memory
  locations go to `harness.config.yaml`.
- Codebase vocabulary goes to `docs/glossary.md`.
- Reusable architecture, security boundary, adapter, public contract, and
  runtime rules go to `docs/patterns/boundaries/` or another bounded pattern
  entry through `pattern-context`.
- Reusable validation, scenario, browser/API/CLI, and security probe rules go
  to `docs/patterns/testing/` through `pattern-context`.
- Approved target simulations are previewed before creation, use the tracked
  starter template, refuse existing paths, and regenerate the campaign
  registry only after full graph validation. If no target scenario and owner
  exist, record simulation bootstrap as `NOT_RUN`.
- Source-context and memory rules go to `docs/patterns/context-memory/`.
- Every pattern entry must have `index.md` and at least one `*.pack.yaml` with
  summary, routing, graph-like documents, and selectable sections.
- Reports, blocked handoffs, and evidence summaries go to
  `docs/work/reports/` only when they are requested, complex, blocked, or
  decision-heavy.
- Do not create broad dump folders for security, backend, frontend, or memory.
  Target-project security entries are allowed only when source evidence exists
  and `pattern-context` creates a bounded entry with pack metadata.

## Stop Rules

- Stop before writing if source files cannot be inspected.
- Stop before overwriting unrelated user-authored project instructions.
- Stop before delegated specialist execution when delegation was not
  authorized.
- Stop if a `.pre-cascade` preservation hash changes; do not refresh or bless
  the changed backup.
- Mark missing required product, design, brand, security, or validation context
  as `GAP` or `BLOCKED`; do not invent facts.
- Do not persist sensitive screenshots, credentials, private customer data,
  raw logs, tokens, or regulated sensitive data.
- Do not mark onboarding complete until every phase has a manifest disposition,
  project-part and documentation-routing decisions are recorded, preservation
  hashes match, source drift is `CURRENT`, and the target validator plus
  available target checks are recorded or explicitly blocked.
