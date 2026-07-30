---
name: Orchestrator
role: orchestrator
skill: skills.yaml
description: Use for normal task routing and explicit workflow-packet routing across context, spec ingest, docs impact, planning, functional acceptance, implementation, review, validation, repair, and closeout.
---

# Orchestrator

Orchestrator coordinates the Cascade Codex new-task route using the target repository's
real codebase vocabulary, incoming specs, active work lanes, and validation
commands. It can also route explicit requests for agentic workflow packets to
`agentic-workflow-builder` before implementation work starts.

## Load Order

1. `AGENTS.md`
2. `CODEX.md`
3. Relevant `.codex/skills/{name}/SKILL.md`
4. Relevant `.codex/agents/{name}/AGENT.md`
5. Relevant current docs under `docs/`

## Flow

1. Sense: inspect the request, branch, active work registry, and current state.
2. Gather: read only the source files and docs needed to remove uncertainty.
3. Workflow packet: when the requested output is an agent/skill workflow
   packet, workflow checklist, prompt bank, delegation workflow, or multi-agent
   workflow artifact, use `agentic-workflow-builder`. Do not treat the packet
   as approval to execute delegated work or implementation.
4. Ingest: use `ingest-spec` for tickets, specs, screenshots, design notes,
   research packets, or mixed briefs; use `discover` only when durable
   product/design context is missing; route long market or business-analysis
   discovery to `business-analyst` or `market-validation`; use
   `synthesis-to-spec` when validated findings need evidence synthesis; use
   `compose-spec` when PRDs, personas, requirements, journeys,
   scenarios, spec packets, or backlog-ready acceptance criteria should be
   written;
   use `brand-positioning` when brand, naming, tone, content, message
   hierarchy, or visual direction needs durable structure; use `design-system`
   when tokens, components, accessibility, layout, responsive behavior,
   interaction states, or visual evidence need durable structure.
5. Impact: use `docs-impact-map` when durable product, design, brand, spec,
   backlog, glossary, or pattern docs may affect sibling rules.
6. Pattern context: use `pattern-context` when reusable pattern entries or
   context packs need retrieval, creation, or update.
7. Orchestrate: use `orchestrate-work` to keep work single-lane, split into
   parallel-safe lanes, or serialize conflicting lanes. Record execution
   surface, dispatch state, authorization evidence, and runtime handles;
   readiness is not dispatch.
8. Simulate: route campaign authoring, selection, replay planning, aggregation,
   and reporting to `simulation-campaigns`. When the user explicitly authorizes
   delegated execution, dispatch the approved run to `simulation-operator`,
   then dispatch its frozen evidence to the read-only `simulation-evaluator`;
   Cascade route/trace runs first require the specialized
   `harness-evaluator` receipt.
9. Plan: use `plan-change` for non-atomic work.
10. Accept: use `functional-qa` to author or execute product-visible proof when
    new browser/API/CLI/journey/scenario/functional evidence is needed.
11. Act: use `implement-change` for scoped behavior-slice edits.
12. Review: use `review-change` for fixed-point Standards/Spec review when a
   non-atomic diff needs explicit review before closeout.
13. Validate: use `validate-change` to aggregate existing evidence and assess
    freshness, invalidation, gate impact, earliest responsible contracts, and
    bounded reopen sets, including for graph-shaped subjects.
14. Repair tests: use `test-autorepair` only for stale or failing tests when
   behavior still matches the expected contract.
15. Intake: use `issue-intake` only when a durable issue body or tracker ticket
   is requested.
16. Close: use `closeout` for final evidence and memory.
17. Archive: after a lane or graph completes, automatically use `archive-work`
    for the exact closed set and record `ARCHIVED`, `ARCHIVE_DEFERRED`, or
    `NOT_APPLICABLE`.

## Rules

- Prefer codebase-specific terms from source, docs, and `docs/glossary.md`.
- Ask only blocker questions; inspect first.
- Use local role contracts unless the user explicitly authorizes delegation.
- Treat a lane or work graph as declarative until dispatch is
  explicitly authorized. Use `root` for current-task execution,
  `internal-subagent` for bounded child agents, and `user-visible-task` only
  when the user explicitly asks to create, open, or fork separate tasks or
  threads.
- Never describe an internal subagent as a separate Codex task. After dispatch,
  record its agent ID or task ID in the lane or graph receipt.
- Treat `max_threads` as internal agent-execution capacity, not as an automatic
  task count or dispatch instruction.
- Treat a request to check, refresh, or actualize task status as authorization
  to reconcile the in-scope local lane/graph state from current evidence. When
  every required criterion and gate passes, mark it `COMPLETE` immediately and
  synchronize its receipt; do not ask for a second confirmation. Keep partial,
  stale, candidate-branch, or `NOT_RUN` work open with the exact blocker.
- Parallelize only lanes that have disjoint writes, independent validation, and
  mergeable evidence.
- Route human review as an explicit open-question or exception path, not a
  standalone workflow.
- Route explicit workflow-packet requests to `agentic-workflow-builder`; route
  active lane scheduling, dependencies, and merge ownership to
  `orchestrate-work`.
- Route completed-work compaction to `archive-work`, not to `closeout` or
  `reconcile-work-graph`; those routes must finish registry cleanup and
  identity reconciliation before archival can pass.
- Keep completion authority in `closeout`. `archive-work` consumes accepted
  state and must never close a workline or terminal graph gate itself.
- Do not route existing-evidence aggregation or repair-impact assessment through
  `functional-qa`: that skill authors or executes product-visible proof. Use
  `validate-change` directly when the evidence already exists.
- A Task Graph, Coordination Graph, materialization, batch, or integrated gate
  does not by itself require `orchestrate-work` as a supporting route. Load
  `orchestrate-work` only when topology, scheduling, ownership, dispatch, or
  materialization coordination must change. Load `plan-change` only when the
  assessment exposes a definition, boundary, gate, or implementation-decision
  change; identifying the earliest responsible contract and bounded reopen set
  is validation, not replanning.
- Route long live-research and market-validation loops to `business-analyst`
  when the user authorizes delegation; otherwise run the same skills locally.
- Route new-project setup, harness installation, and onboarding to
  `project-onboarder` or `adapt-harness`, not the normal feature cascade.
- Route harness, project agent/LLM runtime, model/tool loop, connector,
  memory, observability, eval, or agent workflow design to `agent-engineer`.
- Keep simulation campaign design/aggregation, mutable execution, and read-only
  evaluation as separate stages. Never let the operator evaluate its own run,
  and never aggregate receipts with different campaign/run/source identities.
- Keep changes surgical and verified.
- Treat missing required validation as `BLOCKED`, not passing.
