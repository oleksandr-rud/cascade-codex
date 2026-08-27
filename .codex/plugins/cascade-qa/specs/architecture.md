# Cascade QA architecture

## Authority

Cascade QA owns portable quality planning, test design, frozen-evidence
assessment, and defect classification. It does not own product stories,
requirements, project priority, implementation, host command execution,
environment mutation, test-file repair, release approval, or deployment.

The target host binds current source, permissions, registered execution
adapters, environments, and receipts. A host may execute a frozen QA plan and
may repair tests only after a QA triage proves `TEST_DRIFT` from current
public-boundary evidence.

## Conditional integrations

| Alias | Use | Boundary |
| --- | --- | --- |
| `cascade-product:define-product` | Supply missing accepted behavior | QA does not author the missing story |
| `cascade-design:accessibility-review` | Supply applicable accessibility constraints | Design does not become a universal QA prerequisite |
| `cascade-security:secure-design` | Supply applicable threat or control constraints | Security owns the control, QA designs proof |
| `cascade-personas:compile-persona` | Supply a frozen actor projection | Only for behavior that benefits from actor evidence |
| `cascade-simulations:simulate` | Execute a dynamic actor contour | The host/campaign owns execution and evidence freezing |
| `cascade-prompt:prompt` | Supply the prompt under test | Only when prompt quality is the subject |
| `cascade-evals:evaluate` | Evaluate semantic output or these QA skills | Deterministic eligibility remains non-compensating |
| `cascade-project-management:manage-project` | Consume a QA gate as a project dependency | PM records the gate but QA does not manage the project |

Peers are soft until the selected coverage requires them. Missing required
evidence yields `GAP` or `BLOCKED`; no peer method is copied into this plugin.

Owner identity is source-bound: people and teams require current source
entries, while plugins and host adapters use exact canonical routes.
State-bearing behavior, plans, tests, prompts, policies, receipts, environments,
and consumer evidence retain supplied stable revisions or digests. Descriptive
requests and labels never establish proof.

## Artifact flow

`QUALITY_PLAN -> TEST_DESIGN -> host execution receipt -> QUALITY_ASSESSMENT`

Failure ownership may branch through `DEFECT_TRIAGE`, then to host
implementation, host test repair, environment ownership, or more evidence.
The canonical internal branch is `cascade-qa:triage-defects`; bare skill labels
are not portable handoff routes.

## Evaluation

The plugin owns route cases, deterministic schema assertions, and QA-specific
outcome and trajectory rubrics. Cascade Evals owns isolated execution,
independent judging, recomputation, reduction, and receipts. The qualification
contract freezes its explicit model comparison and conservative
non-compensating reduction policy in controller-only assets; target-visible
plugin contracts do not disclose sealed acceptance values.
