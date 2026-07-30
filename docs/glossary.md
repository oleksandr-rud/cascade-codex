# Glossary

Prefer the words used in code, API contracts, UI copy, and current product
specs. Until application source exists, the active vocabulary is the installed
Cascade harness vocabulary.

| Term | Location | Meaning |
|---|---|---|
| Cascade | `README.md`; `CODEX.md` | Agentic workflow harness installed in this repository. |
| Harness adapter | `harness.config.yaml` | Project-specific stack, path, command, routing, acceptance, and memory configuration. |
| Runtime bridge | `CODEX.md` | Cascade load order and task-routing contract for coding agents. |
| Skill contract | `.codex/skills/` | Reusable workflow instruction bundle with triggers, source order, outputs, and validation rules. |
| Role contract | `.codex/agents/` | Local agent role definition, manifest, and skill wiring. |
| Work lane | `docs/work/` | Tracked execution packet for non-atomic work, ownership, checks, and handoff evidence. |
| Work graph | `docs/work/work-graph-template.md`; `docs/work/reports/*work-graph.md` | Declarative coordination of worklines, dependency gates, execution surfaces, dispatch state, merge ownership, evidence joins, invalidation, and closeout. New identities use `WG-XXX`; existing evidence-bound IDs remain stable. It is not an architecture graph or automatic scheduler. |
| Work-graph lifecycle | work graph | `DRAFT` to `PLANNED`, then `ACTIVE` or `BLOCKED`, and finally `COMPLETE` or `SUPERSEDED`; completed projections leave the active registry while durable evidence remains. |
| Execution surface | work lane or work graph | Runtime placement for eligible work: current-task `root`, an `internal-subagent`, or a separate `user-visible-task`. |
| Internal subagent | current Codex task tree | Bounded child agent that reports to its parent and does not appear as a separate user-visible Codex task. |
| User-visible task | Codex task list | Separately created Codex task with its own conversation. Creation requires an explicit user request and a recorded task ID. |
| Agent execution slot | `.codex/config.toml` `max_threads` | Concurrency capacity for the root agent and internal subagents; not a user-visible task count or automatic dispatch rule. |
| Cascade validator | `scripts/validate_cascade_codex.py` | Python check for required harness files, wiring, docs structure, and stale references. |
| Architecture default pair | `docs/patterns/architecture-defaults/` | A machine-readable decision or topology graph plus a same-ID explanatory spec. It is a reference to evaluate, not automatic backend structure or permission to generate source. |
| Stack selection evidence | `stack-selection-evidence.schema.json` | Source-linked claims, policies, application units, infrastructure scopes/resources, independent candidate dispositions, proofs, and final selections used by the `stack-selection` extension tree. |
| Application contour | `stack-selection.{graph.yaml,spec.md}` | One independently deployed, versioned, or distributed application or package unit: backend service, backend worker, web frontend, native app, CLI, experiment, or library. This is distinct from a simulation contour. |
| App stack | `app-stack.{graph.yaml,spec.md}` | Application-side routing extension of `stack-selection`; concrete candidates live in backend, frontend, native, CLI, experiment, or library stack extensions. |
| Infrastructure | `infrastructure.{graph.yaml,spec.md}` | Resource-scope extension of `stack-selection` for compute, data, cache service, messaging, network/edge, delivery, secrets, observability, lifecycle, and provider topology. |
| Application infrastructure profile | `{backend,frontend,native,cli,experiment,library}-infrastructure.{graph.yaml,spec.md}` | Contour-specific translation from one application or package unit to justified resource roles and remote-ownership boundaries. It does not own resource/provider candidates; a library may validly select no production runtime. |
| SDK/library unit | `sdk-library.{graph.yaml,spec.md}` | A package with an independent owner and real versioning, release, distribution, or consumer boundary. An application-owned `src/libs` or `src/shared` folder is not a separate unit by default. |
| Infrastructure resource | `stack-selection-evidence.schema.json` | Independently selected operated resource within one deployment scope and one compute, data, messaging, or delivery extension. |
| Architecture scaffold profile | `architecture-scaffold-profiles.json` | A bounded backend or frontend source template that can be previewed and written only after its architecture and technology choices are adopted or adapted. |
| Simulation campaign | `.codex/skills/simulation-campaigns/`; `docs/work/reports/2026-07-27-cross-surface-simulation-program.md` | Versioned selection of tasks, claims, policies, oracles, fixtures, runtime requirements, and evidence for one bounded execution purpose. |
| Contour | simulation campaign contract | Public interaction boundary under test: command process, terminal, browser, desktop, mobile, or agent response. |
| Driver | simulation campaign contract | Mechanism that operates a contour, such as direct process, PTY, Playwright, platform automation, simulator automation, Computer Use, or an agent runtime. A driver is not an oracle. |
| Claim ledger | simulation campaign result | Per-claim reduction of applicable policies, required oracles, frozen evidence, scope, and verdict without collapsing independent gates. |
| Runtime handoff receipt | simulation campaign result | Digest-bound record that transfers one terminal task result to an exact next owner or gate, including source identity, evidence, cleanup, and disposition. |
| Simulation operator | `.codex/agents/simulation-operator/` | Bounded mutable role that executes one approved campaign, freezes evidence, verifies cleanup, and emits an execution receipt without semantic judgment. |
| Simulation evaluator | `.codex/agents/simulation-evaluator/` | Independent read-only role that evaluates one immutable cross-contour run and emits policy, oracle, semantic, and claim-support evidence without executing or repairing the target. |
| Execution receipt | `.codex/skills/simulation-execution/` | Digest-bound handoff from the operator containing run identities, lifecycle status, evidence root, deterministic-oracle results, cleanup, blockers, and next evaluator. |
| Evaluation receipt | `.codex/skills/simulation-evaluation/` | Digest-bound read-only judgment record containing mechanical gates, applicable policies and oracles, semantic judgments, claim support, uncertainty, and next route. |
| Receipt chain | simulation campaign run container | Digest-linked, append-only execution, optional specialized-evaluation, general-evaluation, and aggregation receipts whose producer identities and input artifacts must match before claim projection. |
| Run container | `.artifacts/campaigns/<run-id>/` | Atomically reserved parent for one immutable execution namespace and later append-only specialized-evaluation, general-evaluation, and aggregation namespaces. |
