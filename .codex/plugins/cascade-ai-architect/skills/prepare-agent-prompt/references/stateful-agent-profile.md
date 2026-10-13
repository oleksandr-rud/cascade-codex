# Claims/actions prompt brief

Bind prompts to [architecture version 3](../../design-agent-blueprint/references/analyzer-policy-composer.md).
Analyzer outputs analysis.v1 claims/actions/uncertainty. Researcher outputs research.v1
evidence only from authorized sources. Composer outputs response.v1 from admitted claims
and evidence. Context Builders supply each role's own current semantic view and schema.

Keep request/scope/revision/authorization in host manifests. Prompt wording cannot grant
tools, truth, persistence or publication. Supply each role's triggers, failure states,
uncertainty rules and bounded recovery. Do not add model-authored writable-operation
fields or a conversion bridge. Cascade Prompt owns the final prompt wording.
