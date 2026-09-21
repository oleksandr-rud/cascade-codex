# Clarification without interpreting presentation text

Version 1; optional project-intake profile. The schema bundle owns
`ClarificationProposal`. Its budget/ownership predicates are deliberately the
worked example's subset, not a universal taxonomy. Adopt or extend it through a
versioned target contract; unsupported cases return a declared gap.

## Producer, admission and presentation

The Analyzer proposes a reason, target, predicate and typed candidate references
or missing fields. It does not manufacture names, distinguishing attributes,
question IDs or authority. Do not encode candidate references only in a question.
The host validates the proposal and issues a `clarification` context section;
the Compiler renders that section and the Composer writes the user question.
Never recover references, selection, intent or approval from generated prose
using regular expressions, keywords or phrase tables.

| Kind | Required data | Issued response mode |
|---|---|---|
| `entity_identity` | Project, `owned_by`, zero to eight registered person refs | `select_candidate` when display tuples differ; otherwise `ask_discriminator` |
| `missing_value` | Project, `budget`, missing `amount_minor` and/or `currency` | `ask_value` |
| `conflicting_claims` | Project, predicate, all current supported competing claim refs | `reconcile_reports` |

The example issuer retrieves candidate names and optional surname/team from
trusted scoped entity records. Claims retain their typed value, support class
and evidence references; the ordinary evidence section supplies original sources.
Disclosure checks happen before rendering. Fine-grained attribute permissions
are a host integration requirement; workspace scope alone is the example boundary.
No model-supplied display attributes become authoritative records.

Use readable names and relevant available details in questions. Keep candidate
handles in structured UI values or private bindings, not user prose. If options
remain indistinguishable, ask for a surname, team or another useful identifier;
do not fabricate a distinction or offer identical choices. Exact equality of
typed display tuples detects a structural collision only. Whether apparently
different details actually help this user is an LLM judgment and evaluation duty.
Missing currency must not silently become USD. The example can ask about other
currencies but only admits USD budget claims; an unsupported answer is a gap,
not currency conversion. Competing reports remain attributed reports; asking
which is current does not approve either value.

The complete clarification section participates in context digest, freshness
and required-content budget checks. A changed candidate display, newly competing
claim or revoked supporting source invalidates the affected context. Reissue
before presenting or consuming an answer when its dependencies have changed.
Proposal admission itself writes no claim, choice resolution or domain state.

## Existing choices and subsequent answers

`UnresolvedChoice` remains the durable owner of lifecycle, revision, candidate
membership, expiry and presentation receipts for adopted StateDelta alternatives.
Its existing `candidate_options` labels are presentation data. This proposal is
an earlier information-gap request, not a second durable choice store or a
replacement `resolve_choice` operation. A target with durable choices maps
admitted candidates into that existing owner; missing-value questions need not
create a choice. Do not claim the example implements this durable integration.

A button selection submits its declared candidate handle with the host's choice
and revision binding. Free-text answers go back to an Analyzer for typed
interpretation. The host validates candidate membership, freshness, scope and
authority before admitting a resolution. Ambiguous answers stay unresolved.
Question text, numeric display order and a Composer's explanation are never
identity, commit or approval evidence. The example intentionally has no answer
acceptance or durable choice endpoint.

## Evaluate the whole path

Use the [synthetic clarification cases](../assets/selective-memory/clarification-cases.json)
for development preparation. Test same names with and without distinguishing
details, unknown identity, missing values, competing claims, foreign/invented
references, new conflicts and stale evidence. Display text containing instructions
remains attributed data. JSON validity and reference closure are mechanical;
readability, actionable questions, unnecessary questioning, evidence support and
invented distinctions require semantic assessment. Freeze these criteria before
running candidate models. Preserve earlier scores whose rubric lacked usability.
