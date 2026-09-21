---
name: audit-harness
description: Audit a Codex or coding-agent harness across instructions, routing, skills, roles, tools, permissions, context, memory, hooks, observability, evaluations, validators, installation, and source ownership. Use for defects, stale model policy, duplicate authority, plugin-boundary drift, missing best practices, or current-state inventory; remain read-only and evidence-backed.
---

# Audit Harness

Inspect the target's actual harness before recommending a change. Do not edit,
install, remove, enable, or run live model evaluations under this skill.

## Source order

1. Target-repository instructions and declared source-precedence files.
2. Current configuration, role, skill, hook, tool, connector, evaluator, runner,
   validator, and generated-catalog source.
3. Installed plugin inventory and each resolved manifest/skill source.
4. Focused deterministic tests and read-only discovery probes.
5. Provider documentation only when a current product contract is material and
   local source is insufficient.
6. Historical reports only as explicitly historical evidence.

Treat checked-in prose, generated output, plugin caches, and old artifacts as
claims until their current producer and authority are established.

## Workflow

1. Freeze repository path, revision, dirty-work boundary, request, and audit
   timestamp. Record any surface that is unavailable as `NOT_INSPECTED`.
2. Inventory only present surfaces: boot instructions, runtime bridge,
   configuration, skills, agents, tools, connectors, permissions, context,
   memory, hooks, observability, evaluations, validators, docs, generated
   artifacts, plugin source, marketplace entry, and installed cache.
3. Trace each material behavior from producer to consumer and validation. Name
   exactly one authoritative owner and flag conflicting or copied authority.
4. Check dependency resolution: exact plugin and skill names, enabled state,
   manifest-declared roots, version/digest binding, missing-dependency behavior,
   invalidation, and absence of cache-search fallbacks.
5. Check lifecycle separation: authored, installed, enabled, executed,
   mechanically eligible, judged, accepted, released, and deprecated.
6. Check safety: least privilege, untrusted-input boundaries, confirmation for
   consequential actions, evidence isolation, secret handling, path
   confinement, time/tool/token/cost limits, stop rules, and rollback.
7. Check evaluation separation: target-owned scenarios and assertions;
   Cascade Evals generic lifecycle and judges; Cascade Simulations dynamic
   execution and frozen evidence; no judge override of mechanical failures.
8. Run only cheap, read-only validators needed to verify a finding. Distinguish
   source validation, fixture tests, installed discovery, live execution,
   semantic judgment, and release evidence.
9. Return findings ordered by severity with exact paths, evidence, affected
   behavior, owner, and the smallest repair boundary. State `NO_FINDINGS` when
   the inspected scope contains none.

## Defect classes

Inspect text-to-decision paths for regex/keyword/phrase-based semantic inference,
including advisory classifiers, prefilters and fallbacks. LLM interpretation
must emit defined enums/claims; code validates and consumes them. A typed wrapper
around lexical inference still violates the boundary. Report semantic shortcuts
separately from permitted exact format parsing and structural validation.

- `AUTHORITY_COLLISION`: more than one source claims the same runtime policy.
- `ROUTING_GAP`: a valid structured request has no validated skill or role route,
  or a route is inferred from free-text regexes/keywords instead of semantic interpretation.
- `DEPENDENCY_DRIFT`: installed identity, source, version, or digest disagrees.
- `FAIL_OPEN`: unavailable authority or evidence silently falls back.
- `MODEL_POLICY_DRIFT`: configured model conflicts with current declared use.
- `EVIDENCE_COLLAPSE`: a weaker state is reported as a stronger one.
- `SECURITY_GAP`: permissions, trust boundaries, or consequential actions are
  under-specified.
- `VALIDATION_GAP`: changed behavior lacks a proportional proof surface.
- `DEPRECATION_GAP`: replaced authority remains discoverable or undocumented.

## Output

Keep the user-facing answer concise. Output requirements specify information,
not extra headings. Preserve required schemas, evidence and permissions. Avoid
duplicate artifact prose, empty sections, unsolicited variants and extra files
unless needed for the requested delivery or an actual handoff.

Return scope and revision; inspected/not-inspected surfaces; authority and
dependency map; findings with severity and evidence; validation performed;
unverified claims; recommended repair owner; and explicit `NOT_RUN` phases.
