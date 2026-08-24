# Research basis and adoption limits

This file records the primary or official sources that influenced the plugin. It is not a claim that any method is universally best.

## Agent architecture

- [OpenAI, A practical guide to building agents](https://openai.com/business/guides-and-resources/a-practical-guide-to-building-ai-agents/) — model, tools, instructions, bounded runs, single-versus-multi-agent selection, guardrails, and human intervention. Adopt the simple-first topology and explicit exit conditions; keep provider examples out of the semantic core.
- [Anthropic, Building effective agents](https://www.anthropic.com/engineering/building-effective-agents) — prompt chaining, routing, parallelization, orchestrator-workers, evaluator-optimizer, tool interface quality, and measured complexity. Adopt the patterns as candidates, not mandatory architecture.
- [Anthropic, Multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system) — multi-agent work can help breadth-first, independently parallel research but costs substantially more tokens. Require local value and cost evidence before a split.
- [ReAct](https://arxiv.org/abs/2210.03629) — interleave actions with environment observations and plan updates. Add harness-owned permissions, budgets, termination, and recovery absent from the paper.
- [MemGPT](https://arxiv.org/abs/2310.08560) and [Anthropic context engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) — separate working context from longer-lived memory and retrieve bulky context just in time. Add provenance, retention, invalidation, and conflict rules.
- [Reflexion](https://arxiv.org/abs/2303.11366) — outcome-grounded verbal lessons can improve later attempts. Treat reflection as candidate context, never independent truth.
- [MAST failure taxonomy](https://arxiv.org/abs/2503.13657) — multi-agent failures cluster around specification/design, inter-agent alignment, and verification/termination. Use this to drive explicit ownership, typed handoffs, and verification.
- [AgentBench](https://proceedings.iclr.cc/paper_files/paper/2024/hash/e9df36b21ff4ee211a8b71ee8b7e9f57-Abstract-Conference.html) — evaluate interactive, long-horizon behavior across environments. Reuse the methodology, not dated model rankings.

## Architecture and prompt optimization

- [DSPy](https://arxiv.org/abs/2310.03714) — separate a parameterized LM program, metric, examples, and optimizer. Adopt that separation without requiring the runtime.
- [MIPRO](https://arxiv.org/abs/2406.11695) — jointly search instructions and demonstrations with grounded proposals and evaluation. Use only with enough non-test examples and fixed budgets.
- [GEPA](https://arxiv.org/abs/2507.19457) — reflect on trajectories and preserve Pareto-diverse prompt candidates. Use for trace-rich, multi-objective experiments behind a fixed candidate interface.
- [TextGrad](https://arxiv.org/abs/2406.07496) and [Automatic Prompt Optimization](https://arxiv.org/abs/2305.03495) — convert evaluator feedback into localized candidate edits. Treat them as generators, not promotion authorities.
- [OPRO](https://arxiv.org/abs/2309.03409) and [Revisiting OPRO](https://arxiv.org/abs/2405.10276) — use scored candidates for bounded instruction search, but account for optimizer capability and cost; small models may not optimize reliably.
- [Automated Design of Agentic Systems](https://arxiv.org/abs/2408.08435) and [AFlow](https://arxiv.org/abs/2410.10762) — agent programs and workflows can be searched. Limit topology/code search to sandboxed, allowlisted mutations after simpler repairs fail.
- [Self-Refine](https://arxiv.org/abs/2303.17651) and [Intrinsic self-correction limitations](https://arxiv.org/abs/2310.01798) — self-critique may help candidate drafting but may also degrade results. Never use same-context self-review as sole evidence.

## Evaluation integrity

- [OpenAI, foundations for trustworthy third-party evaluations](https://openai.com/index/trustworthy-third-party-evaluations-foundations/) — define the tested claim, harness validity, contamination, and reward-hacking controls. Broken or contaminated runs are ineligible.
- [PaperBench](https://cdn.openai.com/papers/22265bac-3191-44e5-b057-7aaacd8e90cd/paperbench.pdf) — keep grading criteria from the target and evaluate the judge itself.
- [AgentRewardBench](https://arxiv.org/abs/2504.08942) — expert labels show no single judge dominates all trajectory-evaluation settings. Use independent dimensions and calibration.
- [Position bias in pairwise evaluation](https://arxiv.org/abs/2406.07791) — balance A/B order and repeat comparisons.

## Derived rules

Capability clustering, topology admission, the exact behavior-block checklist, and the promotion reducer are a synthesis of these sources and Cascade’s current harness contracts. They must be validated on representative tasks; they are not independently established scientific laws.
