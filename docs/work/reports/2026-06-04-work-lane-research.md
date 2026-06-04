# Work Lane Research

Date: 2026-06-04

## Question

The lane template exists, but it is too sparse for first-time adaptation and
cross-agent work. The harness needs copyable lane examples and clearer rules for
source inputs, handoffs, file ownership, merge evidence, and MCP/tool usage.

## Findings

- Multi-agent frameworks make state and handoff boundaries explicit. OpenAI
  Agents SDK models handoffs as tools with optional input filters, so the
  receiving agent's context can be controlled:
  <https://openai.github.io/openai-agents-python/handoffs/>
- LangChain/LangGraph handoff guidance centers on state variables and explicit
  transition tools; it also warns that subgraph handoffs need careful context
  engineering:
  <https://docs.langchain.com/oss/python/langchain/multi-agent/handoffs>
- LangChain supervisor examples keep worker internals away from the supervisor
  and return only high-level final responses:
  <https://docs.langchain.com/oss/python/langchain/multi-agent/subagents-personal-assistant>
- Microsoft Agent Framework sequential orchestration treats agent order,
  conversation context, event tracking, and human-in-the-loop approvals as first
  class workflow concerns:
  <https://learn.microsoft.com/en-us/agent-framework/workflows/orchestrations/sequential>
- CrewAI Flows provide structured flow state, listeners, routers, human
  feedback, and flow plots, which reinforces that workflow shape and state need
  to be inspectable:
  <https://docs.crewai.com/en/concepts/flows>
- Context7 is best treated as read-only documentation context. Its tool pattern
  resolves a library ID first, then queries docs for the specific topic:
  <https://context7.com/docs/agentic-tools/ai-sdk/getting-started>
- MCP client guidance recommends progressive tool discovery instead of loading
  every tool definition into context, especially with many servers/tools:
  <https://modelcontextprotocol.io/docs/develop/clients/client-best-practices>
- MCP security guidance treats local MCP servers as code execution surfaces and
  recommends consent, sandboxing, restricted privileges, and least-privilege
  scopes:
  <https://modelcontextprotocol.io/docs/tutorials/security/security_best_practices>

## Harness Implications

- A lane packet needs a source input table, not only acceptance criteria.
- Parallel lanes require file ownership and a single merge owner before edits.
- Handoffs should preserve summaries, source IDs, validation evidence, and next
  gates instead of raw agent history.
- MCP/tool context belongs in each lane only when needed. For docs tools such as
  Context7, record the library ID, query/topic, and source freshness.
- Plugin-provided MCP/tools should be recorded by plugin, server, tool, and
  approval mode. Plugin packaging belongs to harness/config maintenance, not to
  active work-lane state.
- External write MCPs should be disabled by default in lanes and routed through
  explicit request paths such as `issue-intake`.
- Example lanes should live outside active lane packets so they guide adaptation
  without polluting active work state.

## Decision

Add `docs/work/examples/` with populated non-active lane examples, expand
`docs/work/lane-template.md` with source inputs, file ownership, MCP/tool
context, and handoff/merge contract sections, and update Orchestrator guidance
plus validator wiring.
