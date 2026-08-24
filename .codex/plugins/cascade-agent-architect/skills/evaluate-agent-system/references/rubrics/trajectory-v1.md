# Architecture trajectory rubric v1.0.0

## Decision

Judge whether the observed process derived the architecture responsibly and
efficiently. Read the frozen request, admissible sources, target trace, tool
receipts, and final artifact. Judge observable actions, not hidden reasoning.

## Shared anchors

- `0` — absent, contradicted, unsafe, or unrelated process.
- `1` — serious derivation errors or waste that undermine the result.
- `2` — minimally sound process with material limitations called out.
- `3` — strong, grounded process with only minor inefficiency.
- `4` — precise, efficient, and robust derivation without evaluator leakage.

## Dimensions

- `source-selection-grounding` (20): authoritative sources are selected in the
  right order, conflicts and evidence status are preserved, and untrusted
  content cannot grant authority.
- `source-capability-derivation` (25): capabilities and material questions are
  derived from evidence without invented requirements or missed constraints.
- `cluster-boundary-quality` (20): responsibilities follow outcomes, context,
  tools, permissions, oracles, recovery, and real parallelism rather than job
  titles or phases.
- `building-block-topology` (20): deterministic boundaries, agent topology,
  state, tools, prompts, and evaluations follow from the capability map and
  simple-first rule.
- `adaptation-efficiency` (15): the process uses bounded tools and context,
  revises only from external evidence, stops correctly, and avoids needless
  agents, questions, or iterations.

## Evidence and exclusions

Give one or more exact trace or artifact locators per rating. Do not read or
mention eligibility, thresholds, hidden answers, labels, previous scores, peer
responses, or promotion decisions. Return only the judge response schema; the
harness computes scores and acceptance.
