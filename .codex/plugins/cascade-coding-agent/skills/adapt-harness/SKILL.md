---
name: adapt-harness
description: Adapt a Codex or coding-agent harness to a target repository from a current inventory, protected paths, source precedence, commands, plugin state, and validation contract. Use for project onboarding or harness portability; do not install packages or overwrite target-owned instructions without explicit authority.
---

# Adapt Harness

Create a reviewable target adaptation candidate. The target host owns its
inventory runner, schemas, paths, actual writes, package state, and integrated
validation.

## Dependencies

- `$audit-harness` for target harness inventory,
  ownership, duplication, gaps, and migration findings;
- `$maintain-harness` for the reviewed portable
  change contract;
- `cascade-ai-architect:architect-ai-system` only when target agent
  topology must be materially designed or changed;
- `cascade-prompt:prompt` only when a target-owned prompt must be authored or
  adapted after its architecture brief exists.

## Preconditions

- explicit target root and setup/adaptation request;
- current target boot instructions and source precedence;
- frozen dirty-state and protected paths;
- write authority for the proposed target files.

Package installation, plugin enablement, dependency installation, deployment,
and destructive replacement require their own authority.

## Workflow

1. Consume the host-supplied target inventory and treat it as a source map,
   not semantic product truth.
   Bind the real target name, kind, users, stack, source roots and commands from
   current target evidence. Cascade is the tooling provider, not the target's
   product identity. Set `project.harness_profile: target-project` when the
   host supports it; reserve `cascade-source` for developing Cascade itself.
2. Run `$audit-harness` against the target. Bind plugin version and skill
   digests and preserve
   `PASS`/`GAP`/`BLOCKED`/`INVALID` findings.
3. Freeze the smallest reviewed change envelope: target authority, source
   precedence, paths, protected files, merge/replace decisions, validation,
   rollback, deprecation, and installed/source parity.
4. Produce the portable change contract. Route material agent-system topology
   work to Cascade AI Architect and prompt/evaluation work to their owning plugins.
5. Propose only the target-specific layer:
   - thin `AGENTS.md` boot contract;
   - stack, roots, commands, runners, trackers, and memory in
     `harness.config.yaml`;
   - vocabulary in `docs/glossary.md`;
   - product/design/brand/spec/pattern facts in their declared docs;
   - repo-local adapters, roles, hooks, and validators only where the target
     must integrate an installed capability.
   Merge existing boot instructions and configuration; never replace them with
   Cascade source-checkout prose or copy its project configuration. Use the
   distributed target template, resolve its placeholders, and preserve target
   architecture decisions. Keep specialized plugin knowledge conditional on
   an explicit request or accepted target architecture.
6. For deep onboarding, use
   `checklists/project-onboarding-analysis.md`,
   `templates/project-onboarding-workflow.md`, and
   `templates/project-part-spec.md`. Keep these as target integration
   artifacts, not copies of plugin methods.
7. Return the target-host request for inventory, manifest, preservation, and
   validation operations; do not impersonate a missing runner.
8. Route reusable product, persona, market, design, prompt, simulation, and
   evaluation semantics to their namespaced plugins. The host owns only target
   source selection, persistence, execution authority, and handoff.
9. Bind the exact host validation commands and source-drift checks. Mark them
   `NOT_RUN` until the host executes them.
   When the target has approved UI mockups, bind its developer workflow to the
   supplied Cascade Design fidelity contract: inspect reference frames, implement
   matching details, capture at the intended viewport/state, compare and repair.
   Preserve authorized deviations and require rendered evidence before a
   pixel-perfect claim. Do not create a Designer/Frontend role solely for this
   rule; the existing implementation owner can invoke Visual QA directly.
10. Compare source and installed plugin identities when packaging changed.
    Missing/disabled dependencies return `BLOCKED`; do not search caches or
    restore copied fallback behavior.

## Resources

The checklist and templates define a portable analysis and handoff shape. They
do not authorize target writes or replace target-owned schemas.

Return target/source identity, plugin dependency receipts, files
written/merged/skipped, preservation and drift status, target validation,
installed/source parity, every `NOT_RUN` or blocker, and the exact next owner.
