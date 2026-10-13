# Claims and action admission

The sole Analyzer wire contract is analysis.v1 in agent-contracts.schema.json.
Claims contain a local ID, subject, registered predicate, typed value, evidence references,
support, confidence and uncertainty. Support is REPORTED, OBSERVED, INFERRED, UNCERTAIN
or CONFLICTING. Confidence and schema validity never establish truth or permission.

Action requests are RESEARCH, COMPOSE, CLARIFY or STOP, each with its own payload.
They reference only claims in the same analysis. RESEARCH names sources from the issued
host catalog. Domain effects are outside this contract and need an explicit host operation.
There is at most one terminal action. Research precedes composition and invalidates any
earlier composition request: collected evidence requires a fresh analysis round.

Admission checks the entire object before Policy Engine can consume it. Duplicate IDs,
unknown fields, unknown predicates, incompatible values, unissued evidence/sources,
missing uncertainty and conflicting terminal actions are invalid. USER evidence cannot
be promoted to OBSERVED by a model enum. Source text remains untrusted evidence.

Code parses exact declared formats and checks enums, references and authority. LLMs
interpret intent, meaning, evidence support, negation and ambiguity. Semantic claim gates
must use a declared LLM assessment or human evidence; never a phrase table or regex.

The runtime binds request/scope/revision, authorizes each operation and performs CAS
recording. After every asynchronous model call, it rejects changed state before admission
or publication. Every role receives a fresh context with a private host manifest. The
host persistence API stores validated analysis records; it does not accept model updates
to application fields. The old mutation wire and conversion adapter are removed.

Research results use research.v1. The host stamps their observation identity and origin,
checks source scope and records the observation. Composer uses response.v1 and may cite
only admitted claim IDs. The host independently enforces required semantic publication
gates. Invalid output, unknown side-effect outcome, exhausted budget and unresolved
evidence never become a successful receipt.

Prepared example: [analysis](../assets/claims-actions.example.json).
Mechanical validator: python scripts/validate_agent_contracts.py Analysis PATH.
Runtime boundary tests: bun test ./scripts/agent_runtime.test.mjs from this skill directory.
