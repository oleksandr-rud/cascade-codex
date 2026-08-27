# Architecture packet contract

## Files

```text
architecture/
  architecture.yaml
  capability-map.md
  topology-decision.md
  decisions.md
  roles/
  skills/
  workflows/
  prompts/
  evaluation/
```

`architecture.yaml` is the cross-reference index and validation surface. Markdown is the primary human-review surface. Omit an empty directory; do not create placeholder files solely to match the tree.

The packaged template uses JSON syntax, which is a strict, portable subset of YAML 1.2. This lets the bundled validator use Python's standard library and fail deterministically without installing a YAML parser. Preserve this subset when editing the machine index. Target-specific translators may accept broader YAML by validating against `architecture.schema.json` with their own parser.

## Status and evidence

Packet status is one of `CANDIDATE`, `GAP`, `BLOCKED`, or `VALIDATED`. `VALIDATED` means only that declared deterministic checks passed unless the packet's evaluation receipts also prove execution and judgment.

Do not collapse the evaluation sequence:

`AUTHORED -> VALIDATED -> EXECUTED -> MECHANICALLY_ELIGIBLE -> JUDGED -> MEASURED_CANDIDATE -> ACCEPTED_TO_STAGING -> PROMOTED`

Preserve `NOT_RUN`, `BLOCKED`, `INVALID`, `REJECTED`, and `INCONCLUSIVE` exactly. A prompt or simulation dependency receipt includes plugin, version, skill, source digest, resolution time, and result status.

## Cross-reference invariants

- Every semantic slug is lower-kebab and descriptive; ordinal claim IDs are invalid.
- Every frozen source has a lowercase `sha256:` identity with exactly 64 hexadecimal digits.
- Every capability belongs to one cluster and has one primary agent or deterministic-workflow owner.
- Every final output has one primary owner.
- Capability inputs resolve to source locators in the frozen snapshot.
- Component references resolve by kind.
- Every state-changing, external-message, or destructive tool declares permission and confirmation behavior.
- Any `unresolved` capability has a gap and makes the packet `GAP` or `BLOCKED`; an `assumed` capability has a recorded gap.
- Two roles cannot own the same non-empty mutation scope.
- Every retained agent owns at least one capability, is referenced by at least one role, and declares non-empty inputs, outputs, tools, skills, workflows, prompts, and evaluations. Capabilities listed by an agent name that agent as their primary owner.
- `single_agent` and `single_agent_with_skills` contain exactly one agent; manager, decentralized-handoff, and evaluator-optimizer topologies contain multiple role-backed agents; deterministic workflow topology contains none.
- Loop and agent budgets are finite and positive.
- Each behavior block uses its declared contract; an arbitrary non-empty object is invalid. Objective, inputs, outputs, loop, state, context, memory, tools, skills/prompts, roles/handoffs, failure, observability, evaluation, and rollout must each declare their required operational fields.
- Behavior-block owners and references resolve to the indexed workflows, agents, tools, skills, prompts, and evaluations. The role-level primary owner matches the final-output owner.
- Schema, permission, reference, source, and trace failures cannot be overridden by semantic scores.

## Validation

From the skill directory:

```bash
python3 scripts/validate_architecture.py PATH/architecture.yaml
python3 scripts/test_validate_architecture.py
```

The validator reports every discovered deterministic error and exits nonzero. It does not judge architecture quality or claim that simulations ran.
