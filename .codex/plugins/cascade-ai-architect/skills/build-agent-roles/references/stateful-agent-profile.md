# Claims/actions profile: build-agent-roles

Load only for an accepted [Analyzer–Admission–Policy Engine–Composer
architecture](../../design-agent-blueprint/references/analyzer-policy-composer.md).

Analyzer returns `analysis.v1` claims, action requests and uncertainty. Admission
validates the original object; Policy Engine is host code that checks authority
and dispatches. Researcher supplies source observations that return through a
fresh Analyzer/Admission round. Composer authors the response; an independent
verifier judges it before the host separately authorizes publication. None of
these model roles can write state, change policy or authorize another role.

Give Analyzer, Researcher and Composer separate Context Builder bindings. Define
each builder's issued snapshot, required fields, source scope, role instructions,
output schema, hidden manifest and stale/denied behavior. Models cannot choose
profiles, expand sources or treat generated content as an admitted observation.
Bind trusted builders to the [runtime contract](../../design-agent-blueprint/references/runtime-binding.md).

Use the [authoring checklist](../../design-agent-blueprint/references/architecture-best-practices.md).
Keep optional voice/status responsibilities conditional on actual target needs.
Adapters observe delivery; models cannot certify it. Role contracts create no
permissions, register no agents and dispatch no work.
