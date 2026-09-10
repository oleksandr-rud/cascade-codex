# Semantic interpretation and deterministic consumption

Status: required authoring rule, adopted from the maintainer's 2026-09-10
instruction. This governs agent design, prompts/context, software implementation,
routing, review and evaluation. It does not claim existing runtimes conform.

## Boundary

Use an LLM for meaning-dependent interpretation of free text: user intent,
request relationships, negation, corrections, claim extraction, relevance,
semantic routing, approval language, or answer quality. Do not replace all or
part of that work with regexes, keyword/substring tables, lexical scoring, or
phrase lists. The ban applies to prefilters, shortcuts, fallbacks and validators
as well as the primary classifier. More patterns, a confidence label, or passing
phrase fixtures do not make lexical heuristics semantic interpretation.

Produce a defined structured result: allowed enums, typed claims or proposals,
source references, scope, and explicit unknown/ambiguous/conflicting outcomes.
Code validates and consumes those fields through the existing domain contract.
Do not invent a new schema when the target already supplies one.

A code-generated enum is not compliant if its value came from keyword inference.
Likewise, extracting a verdict from an LLM's narrative with regex is not a
structured-output boundary. Ask for schema-constrained output where supported,
parse it with the declared format parser, validate it, and reject malformed,
missing, unsupported or stale fields. Use bounded repair, clarification or a
declared unresolved result; never fall back to lexical guessing.

## Runtime authority

Code owns schema/enum checks, exact reference resolution, identity, revision,
permissions, budgets, known-state predicates, policy enforcement, commits and
dispatch. A model-proposed intent, claim or route is evidence/proposal only.
Approval inferred from prose cannot grant authority: the host must bind any
accepted proposal to authenticated input and the target's authorization contract.

Validate evidence references and scope mechanically; judge support and faithful
interpretation semantically. An evidence ID, valid enum, model confidence or
schema pass is not proof that the interpretation is true. If semantic validation
is required, name its LLM or qualified human reviewer and preserve uncertainty.

Prefer one existing Analyzer/classifier call that emits the needed fields.
This rule does not require an extra agent, separate service, or another model
call for each field.

## Exact syntax and non-semantic operations

Ordinary file search, exact literal comparison, escaping, token counting and
parsing a declared protocol, command grammar or structured format remain code
tasks. A regex may check a field's specified character syntax; it cannot decide
what a sentence means. An explicit command selected through a command interface
is different from a command name mentioned, quoted or negated in a chat message.

Deterministic checks of numeric calculations, structured events and observed
effects remain appropriate. Regex/keyword presence in prose must not establish
task completion, refusal, grounding, authority or semantic evaluation quality.
Use exact literal assertions only when literal syntax itself is the accepted
requirement, not a proxy for meaning.

## Review and migration

Trace every text-to-decision boundary through producer, schema validation and
consumer. Flag free-text semantic heuristics even when they are called advisory,
high confidence, cheap admission, preprocessing or a fast path. Retain existing
security and authorization gates during any separately scoped migration.
Guidance adoption and source/installed parity do not establish runtime migration
or model correctness. Report remaining runtime violations explicitly.

Useful semantic cases include negation, quotations, hypothetical requests,
corrections, ambiguity, paraphrases and supported languages. Freeze judgments
against their real source context; do not define correctness by matching the
same word lists that produced the result.
