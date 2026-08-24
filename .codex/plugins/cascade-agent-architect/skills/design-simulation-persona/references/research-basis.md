# Persona simulation research basis

Use this reference to choose mechanics, not to claim that a generated persona
is a real or representative human. Primary sources were checked 2026-08-07.

## Adopted mechanics

- Rich individual evidence is preferable to demographic shorthand. Park et al.
  built agents from qualitative interviews with 1,052 people and reported that
  interview-conditioned agents reproduced General Social Survey answers at 85%
  of participants' own two-week retest accuracy, with lower racial and
  ideological accuracy gaps than demographic-only agents. Adopt source-bound
  interviews and explicit validation; do not generalize that result to a new
  domain without tests. <https://arxiv.org/abs/2411.10109>
- Separate stable identity from adaptive psychological state. Qi et al. report
  better dynamic persona coherence from distinguishing long-term identity,
  accumulated meaning/stress, and short-term affect. Adopt the boundary, but
  use only a few observable, task-relevant state variables rather than their
  full correction architecture. <https://aclanthology.org/2026.acl-long.1336/>
- Preserve event memory and planning only in proportion to the run. Park et al.
  found observation, planning, and reflection each contributed to perceived
  believability in a 25-agent sandbox. A bounded work simulation already has a
  journal, observations, progress, and strategy; it does not need a second
  autobiographical memory system by default. <https://arxiv.org/abs/2304.03442>
- Trait conditioning can influence language, but it is not trait discovery.
  PersonaLLM found Big Five-conditioned outputs showed assigned trait patterns
  in inventories, writing, and human ratings. Adopt optional source-backed or
  explicitly synthetic traits; never infer a real person's Big Five profile
  from a role label. <https://aclanthology.org/2024.findings-naacl.229/>
- Evaluate personality separately from role knowledge and style. InCharacter
  used psychological interviews and reference perceptions across 32 characters
  and 14 scales; RoleLLM separately constructs profiles, extracts role-specific
  knowledge, and evaluates role behavior. Adopt separate grounding, knowledge,
  behavior, and fidelity dimensions. <https://aclanthology.org/2024.acl-long.102/>
  <https://aclanthology.org/2024.findings-acl.878/>

## Required limits

- Demographic persona prompts can amplify representational stereotypes.
  Cheng et al. found more racial stereotypes in GPT-3.5/4 generated portrayals
  than in comparable human-written portrayals. Prohibit demographic-to-trait or
  demographic-to-behavior inference. <https://aclanthology.org/2023.acl-long.84/>
- Plausible aggregate answers are not reliable synthetic populations. Bisbee et
  al. found reduced variance and materially different regression inferences in
  LLM survey samples. Keep persona runs out of prevalence, population, and
  release claims without external calibration. <https://doi.org/10.1017/pan.2023.33>
