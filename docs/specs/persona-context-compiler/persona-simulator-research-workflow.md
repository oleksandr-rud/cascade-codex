# Spec Packet: Persona Simulator Deep-Search Research Workflow

## Source

- Request: implement the research task with a better deep-search and
  multi-agent approach for building the agentic workflow that performs the
  persona-simulator research.
- Existing research base:
  `docs/work/reports/2026-06-20-persona-simulator-behavioral-patterns.md`.
- Existing semantic core:
  `docs/specs/persona-context-compiler/persona-semantic-core.md`.
- Existing workflow skill:
  `.codex/skills/agentic-workflow-builder/SKILL.md`.
- Research-method evidence:
  - Deep Research Agents survey, arXiv:2506.18096:
    https://arxiv.org/html/2506.18096v2
  - STORM, arXiv:2402.14207: https://arxiv.org/abs/2402.14207
  - RAG, arXiv:2005.11401: https://arxiv.org/abs/2005.11401
  - WebGPT, arXiv:2112.09332: https://arxiv.org/abs/2112.09332
  - ReAct, arXiv:2210.03629: https://arxiv.org/abs/2210.03629
  - Reflexion, arXiv:2303.11366: https://arxiv.org/abs/2303.11366
  - Self-RAG, arXiv:2310.11511: https://arxiv.org/abs/2310.11511
  - Corrective RAG, arXiv:2401.15884:
    https://arxiv.org/abs/2401.15884
  - Multiagent Debate, arXiv:2305.14325:
    https://arxiv.org/abs/2305.14325
  - Multi-Agent Collaboration Mechanisms, arXiv:2501.06322:
    https://arxiv.org/abs/2501.06322
  - AutoGen, arXiv:2308.08155: https://arxiv.org/abs/2308.08155
  - MetaGPT, arXiv:2308.00352: https://arxiv.org/abs/2308.00352
  - Long-form factuality and SAFE, arXiv:2403.18802:
    https://arxiv.org/abs/2403.18802
  - SPIRIT, arXiv:2603.27056: https://arxiv.org/abs/2603.27056
  - PersonaFlow, arXiv:2409.12538: https://arxiv.org/abs/2409.12538

## Classification

Type: agentic research workflow and context-compilation spec.

Status: draft, ready for execution as a research workflow.

Recommended workflow model:
`orchestrator-workers` for source acquisition and perspective coverage, followed
by an `evaluator-optimizer` merge loop for claim verification and report/spec
revision.

The approach is intentionally not "one big search." It is a structured loop:
frame the question, decompose by perspective, retrieve iteratively, evaluate
retrieval quality, synthesize with source IDs, atomize claims, verify claims,
criticize gaps, revise, then compile durable Markdown/YAML/prompt artifacts.

## Research Architecture

| Role | Responsibility | Evidence basis |
|---|---|---|
| Research orchestrator | Frame scope, lane map, source standards, stop rules, merge owner, and final acceptance | Deep Research Agents, AutoGen, MetaGPT |
| Profile-depth analyst | Check whether persona inputs use semi-structured psychological profiles rather than shallow demographic labels | SPIRIT |
| Perspective scout | Generate non-overlapping research perspectives and questions before broad retrieval | STORM |
| Ideation facilitator | Use simulated expert or persona perspectives for rapid critique without treating feedback as validated user evidence | PersonaFlow |
| Source hunter | Retrieve primary sources, official reports, papers, and canonical docs with source cards | RAG, WebGPT, ReAct |
| Retrieval evaluator | Score source relevance, quality, freshness, and whether corrective search is needed | Self-RAG, Corrective RAG |
| Domain synthesizer | Convert source cards into evidence matrices and semantic-core implications | RAG, STORM |
| Claim verifier | Break synthesis into atomic claims and verify each claim against cited sources | SAFE |
| Adversarial critic | Challenge overreach, correlated-agent agreement, demographic determinism, and unsupported runtime rules | Multiagent Debate, ChatEval-style review |
| Spec compiler | Promote verified findings into Markdown specs, YAML packages, prompt scripts, and catalogs | Persona semantic-core contract |

## Lane Topology

| Lane | Research Question | Primary Outputs | Parallel Safe |
|---|---|---|---|
| L1 persona architecture | What architectures exist for persona chatbots, simulators, memory, planning, and persona drift control? | Source cards, architecture matrix, runtime component implications | yes |
| L2 human-state evidence | Which social and psychological models should shape behavior modelation? | Evidence matrix for CAPS, traits, values, motivation, intentions, affect, norms, identity, trust | yes |
| L3 agentic retrieval method | Which deep-search and agentic RAG patterns best support this research? | Research workflow method and retrieval quality gates | yes |
| L4 validation and limits | How should claims, simulator behavior, and synthetic-persona risks be checked? | Claim-verification checklist, limitation and safety gates | yes |
| L5 semantic-core integration | Which findings become spec packets, prompt scripts, package refs, catalog modules, or deferred questions? | Updated spec package and handoff report | no, merge owner only |
| L6 simulation setup audit | Are core profile depth, interaction format, consistency maintenance, and human-validation docking explicit? | Setup readiness checklist and design-probe warning when docking is absent | yes |

Parallel lanes may gather evidence independently, but only L5 may edit shared
semantic-core files. This avoids conflicting writes and correlated synthesis.

## Deep-Search Loop

1. Frame the research contract:
   - question;
   - scope and non-goals;
   - claim classes;
   - source freshness;
   - evidence threshold.
2. Generate perspectives before searching:
   - architecture;
   - psychology;
   - social context;
   - retrieval and agent workflow;
   - evaluation and safety;
   - implementation bridge.
3. Run iterative retrieval:
   - start with primary sources;
   - add query variants after gaps appear;
   - keep search notes separate from conclusions;
   - preserve source IDs and accessed dates.
4. Evaluate retrieval quality:
   - relevance to lane question;
   - authority;
   - freshness;
   - contradiction risk;
   - whether a better source is needed.
5. Synthesize by claim class:
   - architecture fact;
   - psychological model;
   - implementation rule;
   - evaluation rule;
   - limitation or safety constraint;
   - open question.
6. Atomize and verify claims:
   - each durable claim gets one row;
   - each row cites source IDs;
   - unsupported claims are revised, downgraded, or removed.
7. Criticize the synthesis:
   - look for demographic determinism;
   - look for single-paper overreach;
   - look for source bias transfer;
   - look for missing counterevidence;
   - look for implementation claims not supported by the evidence.
8. Compile durable context:
   - research report;
   - spec packet;
   - YAML package;
   - prompt script;
   - catalog or backlog handoff only when needed.

## Query Expansion And Miss Audit

The workflow must not stop after it has enough evidence for a plausible answer.
It must also check whether an adjacent source family was missed.

Mandatory query facets:

| Facet | Query Intent |
|---|---|
| persona architecture | persona chatbot, role-playing, memory, planning, persona drift |
| profile construction | persona generation, persona bank, semi-structured profile, psychometric profile, beliefs, values |
| population simulation | synthetic respondents, opinion simulation, survey simulation, human behavior simulation |
| research ideation | simulated experts, research ideation, peer feedback, interdisciplinary critique |
| social psychology | CAPS, values, motivation, norms, identity, trust, affect, appraisal |
| agentic retrieval | deep-search agents, agentic RAG, corrective retrieval, source verification |
| evaluation and docking | empirical docking, human pilot, benchmark, factuality, calibration, heterogeneity |

Miss-audit questions:

- Which recent papers use different vocabulary for the same capability?
- Which HCI, social-science, and creativity-support venues might contain
  relevant persona systems outside the chatbot literature?
- Which named frameworks or acronyms appear in secondary surveys but not in the
  primary source list?
- Which sources would be found only by exact title, acronym, or author query?
- Which lane found enough evidence but not enough coverage?

## Workflow Weaknesses And Controls

The workflow is useful only if its own process failures are checked before
handoff. Each run must review these weaknesses explicitly:

| Weakness | Failure Mode | Control |
|---|---|---|
| Lane incompleteness | A broad answer looks supported while an adjacent source family is missing. | Use the mandatory query facets and retrieval miss audit before promotion. |
| Vocabulary lock-in | Search terms mirror the first framing and miss papers using HCI, survey, opinion-simulation, or psychometric language. | Require query expansion across chatbot, simulation, psychology, HCI, and social-science vocabularies. |
| Correlated-agent agreement | Multiple agents agree because they share model priors, prompt framing, or the same weak source pool. | Treat agent consensus as a hypothesis; require source-card diversity and adversarial critic review. |
| Evidence-type mismatch | Ideation critique, simulator output, or benchmark success is treated as validated human behavior. | Preserve `source_type`, `limits`, and `evidence_strength`; require human docking for behavior claims. |
| Promotion leakage | Interesting but weak research becomes runtime persona behavior or prompt policy. | Serialize L5 through one merge owner and promote only verified atomic claims. |
| Context bloat | Compiled research context becomes too large for focused model use. | Keep package summaries, source IDs, and act-specific prompts; include full source bodies only for research or audit acts. |
| Reproducibility loss | Search decisions cannot be replayed or inspected later. | Record source cards, query facets, accessed dates or freshness, and miss-audit status. |
| Validation illusion | Structural validators pass while factual or methodological claims remain weak. | Pair harness validation with atomic claim verification and critic review. |
| Under-specified docking | A simulation run has profiles and prompts but no empirical comparison target. | Mark outputs as design probes until the run names data, historical benchmarks, or a human pilot. |
| Workflow overhead | Full multi-agent research is used for a narrow update. | Scale the lane count to the claim risk and blast radius; preserve the same gates for promoted claims. |

## Source Card Contract

Each source used by the workflow should have:

| Field | Meaning |
|---|---|
| `id` | Stable local source ID |
| `title` | Paper, report, spec, or official document title |
| `url` | Canonical URL, DOI, arXiv, or local path |
| `source_type` | paper, official report, repo doc, spec, data, or benchmark |
| `used_for` | workflow lane or semantic-core module |
| `claim_support` | concise statement of what the source supports |
| `limits` | what the source does not prove |
| `freshness` | source date or accessed date for moving claims |
| `evidence_strength` | strong, moderate, weak, conflicting, or blocked |

## Evidence Thresholds

| Claim Type | Minimum Evidence Before Durable Promotion |
|---|---|
| Technical architecture rule | one primary source plus one implementation or survey source, unless it is explicitly local design |
| Psychology-backed behavior rule | one primary psychology source or established theory source plus no unresolved contradiction |
| Agentic workflow rule | one agent/retrieval source plus one evaluation or limitation source |
| Safety or limitation rule | one source showing risk, distortion, or evaluation failure is enough to add a guard |
| Product requirement | user request or validated user evidence; research alone is not enough |

## Simulation Setup Layers

Every proposed simulation run should declare these layers before execution:

| Layer | Required Questions | Promotion Rule |
|---|---|---|
| Core profile | Which demographics, psychographics, beliefs, values, emotional states, behavior patterns, known facts, and forbidden inferences are explicit? | Promote only source-backed profile fields; keep inferred traits provisional. |
| Interaction format | Is the run structured Q&A, scenario role-play, multi-agent chat, or a combination? | Match the format to the validation target; do not compare outputs across formats without caveats. |
| Consistency maintenance | Which prompt, retrieval, memory, critic, or training rule prevents persona drift? | Require drift checks before long multi-turn or multi-agent runs. |
| Human validation | What empirical data, historical benchmark, or human pilot will dock the simulation? | Treat outputs as design probes until docking evidence exists. |

## Behavior Examples

| ID | Example |
|---|---|
| BE-001 | Given a broad persona-simulator research question, when the workflow starts, then it first creates lane questions and source standards before running web search. |
| BE-002 | Given a lane returns only weak secondary sources, when synthesis runs, then its claims remain assumptions or gaps instead of becoming semantic-core rules. |
| BE-003 | Given two lanes disagree about a behavior model, when the merge owner compiles the report, then the contradiction is recorded with source IDs and routed to critic review. |
| BE-004 | Given a generated long-form research report, when verification starts, then the report is broken into atomic claims and checked against cited sources before spec promotion. |
| BE-005 | Given a workflow artifact is ready, when it is compiled, then the YAML package and prompt script preserve source IDs, lane outputs, stop rules, and handoff targets. |
| BE-006 | Given a persona setup only contains age, role, and location, when the profile-depth analyst reviews it, then the setup is marked too shallow for behavioral simulation. |
| BE-007 | Given a multi-agent ideation run produces consensus, when the synthesis runs, then the consensus is treated as critique evidence, not human-validation evidence. |

## Functional Acceptance Checks

| Check | Evidence |
|---|---|
| Spec packet includes source, classification, behavior examples, functional checks, and handoff | `python scripts/validate_cascade_codex.py` |
| Research workflow has a separate package from runtime persona semantic core | `docs/specs/persona-context-compiler/persona-simulator-research.package.yaml` |
| Prompt script exists for executing the research workflow | `docs/specs/persona-context-compiler/persona-simulator-research.prompt.md` |
| Workflow report records agent routes, lanes, prompts, gates, validation, and source evidence | `docs/work/reports/2026-06-20-persona-simulator-deep-search-workflow.md` |
| Package can compile with existing context compiler | `python scripts/compile_persona_context.py docs/specs/persona-context-compiler/persona-simulator-research.package.yaml` |

## Handoff

Use this workflow when expanding or re-running persona-simulator research. Keep
source acquisition lanes parallel, but serialize final semantic-core edits
through one merge owner. Do not promote a research claim into persona runtime
behavior until it has a source card, evidence threshold status, and claim-level
verification result.
