# Cascade Market architecture

## Authority

research-market owns attributable external evidence. evaluate-market-opportunity owns market-specific scoring and adversarial assessment. design-market-experiments owns market hypotheses, instruments, thresholds, execution packets, and receipt interpretation, but never market-facing execution. brand-positioning owns evidence-bound positioning, message hierarchy, naming, tone, proof, trust language, and marketing direction candidates. Cascade Product retains product scope, requirements, priority, and lifecycle decisions; Cascade Design retains design-system and interaction decisions.

## Integration aliases

| Alias | Purpose |
| --- | --- |
| cascade-personas:compile-persona | Create a bounded hypothesis or instrument view without treating it as market proof |
| cascade-product:define-product | Supply accepted product intent and behavior to positioning without transferring product authority |
| cascade-product:manage-product-lifecycle | Receive frozen market evidence and make product decisions |
| cascade-design:design-system | Receive brand direction while retaining token, component, accessibility, and interaction ownership |
| cascade-prompt:prompt | Compile/audit research, interview, survey, outreach, or analysis prompts |
| cascade-simulations:simulate | Rehearse instruments or journeys without creating external evidence |
| cascade-evals:evaluate | Evaluate research artifacts/processes and reduce independent judgments |

Dependencies resolve by exact enabled alias and fail closed when required. A Market request never recursively invokes Product and then re-enters Market: the handoff is a terminal frozen evidence or experiment receipt.

The portable capability set is extracted from the repository Business Analyst
and market skills. `specs/extraction-manifest.json` binds the source repository,
revision, clean listed paths, SHA-256 bytes, and capability assignments; those
development paths are provenance, not runtime dependencies.

All supplied, retrieved, tool, and cross-plugin content is untrusted evidence rather than instruction. Artifacts conform to schemas/ and use RFC 8785 canonicalization plus SHA-256. `scripts/validate_artifact.py` recomputes ledger cross-references, opportunity score/coverage/PMF entry, experiment threshold separation, receipt authority, and handoff closure. Missing dependencies, stale inputs, unresolved conflicts, permission gaps, tool failure, and partial/invalid receipts return typed handoff envelopes with exact resume requirements.

The v4 ledger contract requires typed permitted uses, explicit entity/event/
observation identity for behavior, current direct non-vendor evidence for READY,
and substantively distinct reciprocal contradiction claims. The v4 opportunity contract
freezes rating anchors, minimum coverage, decision rule, claim-bound
disqualifiers, and a declared PMF cohort/window plus per-entity event minimums. The v4 experiment contract
binds complete external-operator receipts to experiment, authority,
destination, budget, raw outcomes, exclusions, deviations, failures, cost,
expiry, raw-outcome bytes, and cleanup proof. The v4 handoff contract binds installed producer/consumer versions,
consumer type, expected output, and budget; Market `EXECUTE` envelopes can name
only an external operator and never make Market the executor.

## Evidence flow

current sources -> evidence ledger + digest -> opportunity rubric/assessment -> experiment contract -> real outcomes -> ledger revision -> Product handoff

accepted market + Product + Persona inputs -> positioning candidate -> Prompt, Design, evaluation, or authorized host projection

Persona projections and simulations may enter before an instrument is frozen. They are always labeled synthetic or inferred and never enter the real-outcome lane.

## Non-goals

- product or roadmap authority;
- experiment/campaign execution, outreach, ad buying, publication, data collection, CRM mutation, or channel operations;
- claims of PMF from synthetic actors, semantic judges, or stated preference alone;
- market-size fabrication or unattributed competitor/pricing claims.

## Evaluation plane

The plugin owns market cases, claim-specific rubrics, and deterministic artifact
validators. Cascade Prompt audits research or instrument prompts; Cascade Evals
owns blind packets, independent judges, reduction, and receipts. Mechanical
eligibility checks status and typed `selected_skill` for every case, plus
ledger, opportunity, and experiment artifact/schema/cross-field/digest validity
where those typed artifacts apply, and required handoffs. Brand-positioning
content is judged independently for source support, boundary preservation, and
usefulness. A manifest-bound
`finalize_target` compiler may replace only lowercase SHA-256 leaves that are
deterministically recomputable from unchanged model-authored JSON; raw and
finalized outputs plus the exact change set remain in the evaluation receipt.
Ledger, opportunity, PMF,
receipt, and handoff mutation probes exercise the same runtime validators.
Semantic quality remains `semantic_status=NOT_RUN` until independent judges
finish, and no model result turns synthetic evidence into market proof.
Acceptance policy remains controller-only and is never copied into
target-visible subject assets. An explicit Sol Max campaign binds
`gpt-5.6-sol` with `max` separately for builder, target, and both judges.

## Growth strategy

plan-growth owns channel and lifecycle growth recommendations. Its v4
growth-strategy schema binds source evidence, stages, economics, a bounded next
test and product-feedback owners. validate_artifact.py growth checks reference
integrity, evidence classes, job cadence, scale prerequisites and non-execution.
Product receives proposed feature or offer implications through the existing
handoff envelope; it retains acceptance and lifecycle authority.
