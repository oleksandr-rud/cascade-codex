---
name: run-simulation-campaign
description: Run an explicitly authorized, frozen simulation campaign through host adapters with preflight, bounded observations, evidence freezing and cleanup. Use for actual multi-case campaign execution; use simulate for a single actor and manage-simulation-campaign for design.
---

# Run Simulation Campaign

The host supplies one frozen simulation-campaign and host-runtime-contract. Campaign
design, execution and independent semantic evaluation keep separate owners. No invented
approval, actor, fixture, environment or PASS receipt may fill missing inputs.

1. Resolve the exact campaign revision/digest, selected cases, adapter capabilities,
   source/actor/outcome contracts, permissions, output paths and limits. Preflight the
   actual host. Unsupported platform, missing authority or unresolved cleanup blocks
   only the affected execution; a registered manifest does not prove runnable support.
2. Freeze the run selection and environment before effects. Use the target's existing
   campaign adapter and typed driver contracts. Bind each allowed action to current
   scope and fresh observations. LLM actors choose declared actions; code validates
   format, budgets and host permission. Preserve unknown or uncertain outcomes.
3. For a goal-directed actor, invoke cascade-simulations:simulate with the frozen
   adapter/actor/brief/outcome/limits. Deterministic transport cases use host adapters.
   Do not create another actor loop or infer actions through phrase matching.
4. Observe and record actual action results, failures and evidence. Cancel at finite
   case/time/tool limits. Reconcile unknown side effects before retries. A model's
   success statement cannot stand in for an adapter receipt.
5. Freeze immutable run evidence and verify cleanup in a finally path, including failed
   runs. Cleanup failure or unknown outcome prevents a successful execution receipt.
   The execution receipt reports what ran; it does not declare semantic quality PASS.
6. Hand each frozen actor run to cascade-quality:simulation-evaluation; use the campaign's
   declared independent subject judge for the multi-case campaign. Preserve execution, cleanup, mechanical eligibility
   and semantic outcome as distinct fields. Aggregation stays with the campaign owner.

Use [the campaign lifecycle](scripts/run_campaign.mjs) with the target's explicit host
callbacks. Bind callbacks to the actual runtime; its tests use controlled fixtures and
do not establish live adapter support. Freeze separate execution and finalization
time budgets; cleanup, freezing and evidence verification share the finalization budget.
Return frozen-simulation-campaign-run plus
case status, evidence identity, cleanup, budgets and every unexecuted contour.
