# Project Onboarding Workflow

Status: `<draft | ready | blocked | superseded>`
Owner: `agent-engineer`
Target: `<TARGET_PROJECT>`
Inventory digest: `<sha256>`

## Objective

Adapt Cascade to the target repository from observed source without replacing
unrelated instructions, inventing commands, or creating speculative product,
design, security, architecture, or work artifacts.

Agent Engineer binds target evidence to `adapt-harness` and the installed
Cascade Coding Agent. Specialist plugins or read-only roles are
conditional; onboarding is not a reason to run every review workflow.

## Proportional workflow

1. **Inventory**: inspect repository instructions, source roots, manifests,
   entrypoints, public contracts, tests, docs, and dirty work. Run the
   deterministic target inventory before writes.
2. **Preserve**: identify user-authored instructions and files that must not be
   overwritten. Capture preservation hashes only when deep onboarding requires
   a manifest.
3. **Adapt**: fill the smallest accurate `AGENTS.md`, `CODEX.md`,
   `harness.config.yaml`, structure, glossary, and command routing changes.
4. **Specialize only when evidenced**:
   - Cascade AI Architect for a real agent-system topology change;
   - Cascade Software Architect for a real software-boundary or workflow-architecture decision;
   - Security for security-sensitive current source;
   - Design for an actual UI surface or evidence;
   - Product, Personas, or Market for missing product or market
     decisions, not routine harness setup.
5. **Validate**: run target-mode Cascade validation and only the available,
   relevant target commands. Record exact PASS, FAIL, BLOCKED, NOT_RUN, and
   NOT_APPLICABLE states.
6. **Handoff**: summarize changes, preservation status, gaps, and next action.
   Create a durable onboarding manifest only for a requested deep onboarding or
   cross-task resume.

## Artifact threshold

Do not create project-part specs, product specs, lanes, graphs, reports,
simulation campaigns, or pattern packs by default.

Create a project-part spec only when an area has an independently meaningful
public contract, boundary, or validation risk that cannot be represented
compactly in `harness.config.yaml`, `docs/structure.md`, or the owning current
documentation. Create a lane only when onboarding must survive tasks or cross a
real owner handoff.

## Mechanical evidence

Use the commands that apply:

```bash
bun scripts/cascade.ts target inventory --root .
bun scripts/cascade.ts validate --target
bun scripts/cascade.ts target init-manifest      # deep onboarding only
bun scripts/cascade.ts target probe-commands     # when configured commands exist
bun scripts/cascade.ts target refresh-manifest   # intentional changes only
bun scripts/cascade.ts target drift              # manifest-backed onboarding only
```

A refresh may accept intentional source or config changes, but it must never
bless a changed preservation hash.

## Guardrails

- Inspect before writing and keep `AGENTS.md` thin.
- Preserve unrelated dirty work and user-authored instructions.
- Never expose credentials, tokens, private customer data, or raw sensitive
  logs.
- Do not infer product truth, security proof, UI behavior, or command success
  from file presence.
- Stop for missing target access, a destructive cutover, or authority that would
  materially broaden the request.
