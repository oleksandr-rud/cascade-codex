# Syntax, rendering and evidence

Default to portable Mermaid flowchart, sequence, state and ER syntax supported
by the actual host. Quote display labels and keep node IDs simple and stable.
Avoid new or experimental diagram syntax unless the target renderer supports it.
In flowcharts do not use bare lower-case `end` as a node ID. Check the
[official syntax](https://mermaid.js.org/syntax/flowchart.html) for the chosen version.

## Insert a diagram

Place editable source beside the substantive section, followed by a caption:

> DG-CREATE · TARGET · Mermaid sequence adaptation. Question: when does creation
> become durable? Owner: OP-CREATE/H-CREATE. DB insert and commit: D-RES.
> A conflict rolls back; success is reported only after commit.

For linked SVG/images use paths relative to the owning spec; retain editable
source. Do not make a rendered image the only surviving contract. Provide an
adjacent text equivalent that preserves meaningful conditions and failure paths.
Use labels and line/shape distinctions that do not depend only on color.

## Mechanical checks

Check fences, paths, IDs and exact declared metadata. Use the host renderer or
[Mermaid CLI](https://github.com/mermaid-js/mermaid-cli) when available. Record the
actual version, checked sources and artifacts. Parsing proves syntax; successful
SVG production proves rendering; readability requires inspecting the result.
Neither proves the domain contract or formal IDEF/BPMN compliance.

Render locally when diagrams include private product or repository information.
Do not upload them to a public editor as a default. Treat diagram source as data:
disable executable links/callbacks and unneeded HTML, use a safe renderer
configuration, and avoid injecting untrusted labels as arbitrary HTML.

## Semantic checks

Have the LLM inspect the diagram and the owning contracts together. Check IDs,
edge meanings, payloads, rule conditions, cardinalities, allowed transitions,
transaction/effect order and one relevant failure path. Emit a specific finding
or explicit uncertainty. Do not use keywords, graph size or lexical matching as
a substitute for interpretation.

## Evidence and maintenance

Record syntax, render, contract review and formal-notation review separately.
If no renderer exists, source can remain useful with `NOT_RUN`; do not imply it
was tested. Recheck only diagrams affected by later contract or syntax changes.
Retain a diagram's ID across updates and repair its caption/text equivalent too.
