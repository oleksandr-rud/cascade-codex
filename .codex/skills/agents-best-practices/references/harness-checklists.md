# Harness Checklists

Use these checklists when designing, auditing, or adapting an agentic harness.
They are provider-neutral and should be converted into validators, tool
contracts, or evals when the rule must always hold.

## Agent Blueprint

- [ ] Domain, primary user, job-to-be-done, assumptions, non-goals, and
      deferred capabilities are explicit.
- [ ] Autonomy level is the lowest level that still creates value.
- [ ] Core model-tool-observation loop is specified.
- [ ] Step, tool-call, time, token, cost, and result-size budgets are defined.
- [ ] Minimal typed tool registry is defined.
- [ ] Permission matrix covers read, draft, write, external, privileged, and
      destructive actions.
- [ ] Risky actions use draft/commit separation.
- [ ] Planning mode blocks mutation until approval when risk or ambiguity is
      high.
- [ ] Context builder separates stable/cacheable instructions from volatile
      state.
- [ ] Memory, plans, approvals, todos, and artifacts are stored outside the
      prompt when they must survive compaction.
- [ ] Auto-compaction summary format and rehydration rules are defined.
- [ ] Traces and evals are defined before launch.
- [ ] First rollout is limited, monitored, or shadow-mode when the tool surface
      can affect users or external systems.

## Tool Contract

- [ ] Name is specific and domain meaningful.
- [ ] Purpose says when to use and when not to use.
- [ ] Input schema is strict and locally validated.
- [ ] Output schema is structured, bounded, and traceable.
- [ ] Risk class, side effects, timeout, retry policy, and permission policy
      are declared.
- [ ] Errors return structured observations.
- [ ] Sensitive data is redacted from arguments, results, traces, and final
      answers.

## Context And Memory

- [ ] Trusted instructions are separated from untrusted retrieved content.
- [ ] Retrieved content is labeled by source, trust level, freshness, and
      confidence when available.
- [ ] Exact facts, IDs, paths, and source links are preserved when they affect
      implementation or validation.
- [ ] Large outputs are summarized or stored externally instead of repeatedly
      reloading into the prompt.
- [ ] Active plan, approval state, loaded skills, connector state, and open
      blockers are reattached after compaction.
- [ ] Secrets are not placed in context.

## Evals And Observability

- [ ] Happy-path, near-miss, and failure-recovery tasks exist.
- [ ] Prompt-injection, tool-misuse, approval-bypass, connector-failure, and
      context-overflow cases exist.
- [ ] Tool selection, argument validity, permission decisions, approval timing,
      grounding in tool results, and compaction retention are graded.
- [ ] Cost, latency, token usage, retry count, and tool-result sizes are
      measured.
- [ ] Regression evals are added after significant harness failures.

## Mechanical Invariants

- [ ] Repeated prompt guidance is converted into validators where practical.
- [ ] Validator errors include model-readable remediation.
- [ ] Architecture, workflow, memory, and security boundaries are enforced by
      code, schemas, permissions, hooks, or tests when prompt-only guidance is
      not enough.
- [ ] Stale docs, obsolete tools, and completed work memory have a cleanup
      route.
