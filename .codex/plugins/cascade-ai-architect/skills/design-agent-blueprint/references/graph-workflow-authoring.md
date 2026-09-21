# Graph workflow authoring — recommended option

Status: optional design recommendation; no runtime or wire-schema change.
Owner: Cascade AI Architect. Reviewed: 2026-09-10.

## Selection

Recommend explicit graph authoring when a task has separable evidence gathering,
known dependencies, conditional paths, or independently useful parallel work.
Record selected, deferred, or unnecessary with the target reason. A bounded
single call or ordinary function remains sufficient when decomposition adds no
useful boundary. Graphs do not require multiple agents, a graph library, ADK,
services, a broker, or asynchronous execution.

This recommendation concerns execution structure. It does not select the
Analyzer–Policy Engine–Composer family, change source authority, or authorize
dispatch. A static graph may contain conditional edges or bounded cycles.
Choose dynamic construction only when input determines which work items or how
many branches exist; finite destinations alone do not make classification
deterministic.

## Review architecture, context and prompts together

For each necessary step, bind the following in the existing blueprint/workflow
and architecture-to-prompt brief; these are authoring obligations, not new
runtime fields:

- **Work and owner:** purpose, deterministic function or model judgment,
  exclusive responsibility, and observable result.
- **Input and context:** required predecessor results, authoritative sources,
  admissible freshness, required versus optional evidence, unresolved conflicts,
  and the smallest role/task slice that preserves the decision.
- **Output and edge:** typed result or proposal, acceptance owner, route
  conditions, consumer, and behavior for missing, invalid or stale results.
- **Authority and limits:** permitted tools/effects, identity and revision
  binding, deadline, budget, retry/stop rules and recovery owner.
- **Prompt boundary:** only model steps receive prompts. Carry mission, issued
  evidence, uncertainty, output and done/gap rules; do not ask the model to
  recreate retrieval, authorization, routing or commits owned by code.

Context selection belongs to the existing authorized issuer. Rendering consumes
issued data and approved assets only. Reissue affected slices after admitted
changes; a cache hit or compact summary never proves freshness. Keep task-relevant
source handles visible, private execution metadata outside model text, and stable
instructions before volatile data. Do not copy a whole upstream prompt, history
or rejected proposal into every downstream step.

## Functions, branches and joins

Apply [the semantic decision boundary](semantic-decision-boundary.md) to every
text-to-decision step. LLMs interpret free text into defined enums or claims;
code validates and consumes them. Keyword/regex inference is not deterministic
domain logic, even when wrapped in an enum or used only as a fallback.

Use code for predictable retrieval mechanics, parsing, validation, aggregation,
explicit conditions and bookkeeping. Use models for semantic extraction,
interpretation or synthesis when needed. A model classifier proposes a route;
runtime validates the label, explicit ambiguity status, scope and budget before
dispatch. Runtime validation does not resolve semantic ambiguity by itself.
Schema-valid output is not proof of semantic correctness or permission.

Parallelize only admitted independent work. Bind branch membership and required
versus optional results before joining; dynamic membership must close explicitly.
Specify all-required, quorum or partial completion only when the target allows
it, with deadline, missing/failed/cancelled branch behavior and one merge owner.
A plain join collects structured evidence; it does not reconcile factual
disagreements or admit model claims. Preserve provenance and conflicts for the
existing admission or semantic owner. Serialize conflicting writes.

Dynamic expansion uses the same tool/role allowlists, admission, shared budgets
and cancellation gates as fixed routes. Neither a generated graph nor a join
can bypass these gates. Bound expansion, retries and cycles; retain late/stale
results only after revalidation. No unconditional wait for every branch.

## Evaluation and adoption

Compare with the simplest adequate baseline using the same accepted task and
quality threshold. Check missing evidence, stale context after correction,
unauthorized routing, ambiguous classification, branch failure, cancellation,
conflicting writes and bounded termination where applicable. Measure grounding,
completion, input/output tokens, model invocations, latency and realized cost.
Static checks establish contract conformance, not model quality or provider savings.
Count model calls on the executed path, including retries and repair.

## Evidence and limits

[Google Cloud Tech, Graph Engineering with ADK](https://www.youtube.com/watch?v=Mzr7byMFy_4)
motivates the function/model split (01:50), fan-out (02:46), join (03:30), routing
(03:45), and static/dynamic choice (05:20). All six caption chapters and frames
at 02:20 and 04:22 were reviewed. This is a paraphrased design adaptation, not an
exhaustive visual/code extraction or an ADK integration.

The video's one-model-call example is specific to its race-planning demo.
A graph does not eliminate hallucinations, zero model tokens does not mean
zero operating cost, and the video does not validate Cascade's architecture.
Admission, revision checks, failure semantics and evaluation obligations above
come from Cascade's existing contracts and this requested integration.
