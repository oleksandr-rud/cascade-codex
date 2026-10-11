# W02 — Research a decision into a usable contract

Start with a decision and the fact that could change it. State the question,
applicable project/version, useful evidence, effort boundary and stopping condition.
Examples: whether a storage constraint survives concurrent writes; whether a
provider retries a webhook after acknowledgement; which interaction pattern
fits the user's task. A broad topic without a decision is not yet a research plan.

## Collect, verify and interpret

1. Reuse the relevant repository evidence and prior research. Read its sources
   before accepting its conclusions; mark inaccessible or stale claims.
2. Search official documentation, implementation/source, primary specifications
   and original studies. Read the content that supports the claim. Record source
   URL/path, publisher, applicable version/commit and retrieval date. Separate
   the publication date from a search engine's crawl date.
3. Distinguish what the source demonstrates, what its author asserts, what we
   infer, and what remains unknown. A README promise is not an executed result;
   passing format checks do not demonstrate a whole generated application.
4. Seek disconfirming evidence for a consequential recommendation: compatibility
   limits, failure conditions, integration boundaries or an applicable regression.
   Two pages repeating one publisher's assertion are not independent confirmation.
5. Turn the supported result into a decision consequence: the exact API/schema,
   handler algorithm, UI behavior, operational limit or acceptance check it changes.

Use an LLM for relevance and claim interpretation. Emit claims with
`claim`, `source_refs[]`, `basis: SOURCE_STATEMENT | OBSERVED | INFERENCE`,
`status: SUPPORTED | CONFLICTING | UNVERIFIED`, `applicability`, and `uncertainty`.
`SUPPORTED` means the cited material supports the stated claim within its scope;
it does not imply independent reproduction or general truth. Code checks the
declared format and reference identity, not the meaning of a claim.

## Reuse an external researcher when available

For a supplied project configuration follow [policy bindings](../policy-bindings.md).
Use source-analysis for a bounded source collection, market research for a market
question, and this method for a targeted technical fact. Keep the selected skill's
native evidence/coverage requirements and import its result as claims or proposals,
never as automatic acceptance. The configured effort bounds the question.

If research will happen elsewhere, supply the same decision, questions, constraints,
versions, evidence rules and expected claim format as a research brief. When the
report returns, process it through the checks above. Its conclusions do not become
accepted requirements or verified facts automatically. A separate tool, agent,
installation or subscription is not required by this policy.

## Stop and preserve the useful result

Stop when the decision is supported enough for its consequence or the bounded
search cannot settle it. State unresolved claims and the next useful check.
Keep a compact decision/source note in the owning spec section or S15. Large
existing reports can remain references; they must not become a second normative
spec. Refresh only the claims whose age/version or new contrary evidence matters.
