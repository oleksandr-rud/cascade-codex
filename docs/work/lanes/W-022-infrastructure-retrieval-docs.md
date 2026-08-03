# Work Lane: W-022 Infrastructure Retrieval And Documentation

Status: `COMPLETE`
Owner: `agent-engineer`
Coordinator: `W-018 orchestrator`
Created: 2026-07-28
Lane Model: `parallel-sectioning`
Next Gate: `none`

## Request

Route the five contour infrastructure profiles through the general and
frontend context packs, agent skills, architecture index, and public discovery
without duplicating graph/spec authority.

## Acceptance Criteria

- The general pack can retrieve each contour profile with the shared resource
  extensions it actually needs.
- The frontend pack retrieves `frontend-infrastructure`, SSR/BFF/fullstack
  sections, and shared resource extensions without loading unrelated backend,
  native, CLI, or experiment profile catalogs.
- Architecture review and onboarding route app type to contour infrastructure
  profile, then resource units to resource extensions.
- The architecture index and discovery docs distinguish application profiles
  from resource/provider authorities.
- Current implemented-state docs still say W-018-W-023 are planned and
  `NOT_RUN` until W-023 has evidence.

## Scope

Expected exclusive writes, reconciled against the post-W-017 inventory:

- `architecture-defaults.pack.yaml`;
- `frontend-architecture-defaults.pack.yaml`;
- architecture-defaults `index.md` and `stack-selection.spec.md`;
- `.codex/skills/architecture-review/SKILL.md`;
- `.codex/skills/adapt-harness/SKILL.md`;
- `README.md`, `CODEX.md`, `docs/glossary.md`, and `docs/structure.md`;
- `docs/work/reports/2026-07-27-architecture-selection-and-frontend-defaults.md`.

Out:

- graph/spec implementation;
- shared validator;
- evidence schema/validator;
- scaffold files;
- active registry and final status.

## Behavior Examples

| ID | Example | Expected |
|---|---|---|
| `IRD-001` | Query `frontend SSR BFF infrastructure`. | frontend pair plus compute/data/delivery context; no unrelated contour profiles |
| `IRD-002` | Query `backend database cache queue pubsub`. | backend pair plus data/messaging and relevant semantic policies |
| `IRD-003` | Query `local CLI infrastructure`. | CLI no-infrastructure default without backend/provider noise |
| `IRD-004` | Query `native push infrastructure`. | native remote boundary plus delivery and backend handoff |
| `IRD-005` | Query `experiment GPU batch teardown`. | experiment plus compute/data/delivery context |

## Feature Impact Matrix

| Feature | Touched | Protected behavior | Check | Status |
|---|---|---|---|---|
| General retrieval | yes | selective graph/spec co-loading | five focused previews | `NOT_RUN` |
| Frontend retrieval | yes | dedicated pack contour exclusion | frontend preview | `NOT_RUN` |
| Agent routing | yes | architecture before stack and app/resource separation | marker and harness checks | `NOT_RUN` |
| Public discovery | yes | one canonical authority and honest NOT_RUN state | link/marker validation | `NOT_RUN` |

## Plan

1. Reconcile the expected file set with W-017's canonical paths and take
   exclusive ownership of the final list.
2. Add five profile documents and focused sections to the general pack.
3. Add only frontend infrastructure and shared resource documents to the
   frontend pack.
4. Update selection order, routing skills, glossary, structure, and current
   architecture report.
5. Run focused pack previews and hand W-018 a changed-file and retrieval
   receipt.

## Agent And Skill Routing

- Execution: one direct `agent-engineer` subagent after explicit W-018
  dispatch.
- Required skills:
  `docs-impact-map -> pattern-context -> implement-change`.
- Write boundary: the reconciled retrieval, skill, index, and discovery files
  in Scope; all graph/spec sources are read-only.
- Handoff: no merge by the section agent; return the changed-file identity,
  focused preview results, harness results, and any stop condition to W-018.

## Dependencies And Handoff

- Must wait for: W-018 WG-003-N01 and canonical post-W-017 filenames.
- Can run with: W-019-W-021.
- Merge owner: W-018.
- Stop condition: frontend retrieval loads unrelated contour catalogs, a pack
  points to a missing/unpaired file, or a plan is described as implemented.

## Validation

| Check | Status |
|---|---|
| five general pack previews | `PASS` |
| focused frontend pack preview | `PASS` |
| graph/spec co-loading and path existence | `PASS` |
| harness catalog and self-test after skill edits | `PASS` |

## Closeout

- Report: `docs/work/reports/2026-07-28-contour-infrastructure-work-graph.md`.
- Implementation evidence: `PASS`; five general previews and the focused
  frontend SSR/BFF preview resolve selectively, with unrelated contour
  exclusion.
- Harness receipt: 41 skills, 319 scenarios, digest
  `f975c361819767d05319b7f4b636fa8b9e211e3c56b2005de930dd4d665d6552`;
  self-test 15 cases.
- Source receipt: isolated validator and `git diff --check` pass; the direct
  checkout retains only the 36 known generated Playwright findings.
