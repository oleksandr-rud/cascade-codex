# Stateful workflow profile

Consume [architecture version 3](../../design-agent-blueprint/references/analyzer-policy-composer.md).
The flow is scoped observation -> role Context Builder -> Analyzer claims/actions ->
Admission -> Policy Engine -> authorized Researcher or Composer -> observation or
validated publication. Research always returns through fresh analysis and admission.

Define finite role/tool/turn/time budgets, typed unresolved states, CAS/idempotency,
unknown-effect reconciliation and stop rules. A Context Builder exists for every role.
Runtime choice is a later binding through cascade-ai-architect:bind-agent-runtime.
No workflow or model output grants authority or changes application state by itself.
