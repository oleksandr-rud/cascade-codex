# S02 — Functions

Use IDEF0's functional viewpoint to enumerate and decompose the product's
capabilities. Describe each function with stable ID, verb-object name, actor,
inputs, outputs, governing rules and implementation resources. Decompose until
the responsible screens, operations, handlers, jobs and data can be identified;
do not specify trivial helper internals without an implementation reason.

The section contains the function hierarchy and a mapping to scenarios and
implementation contracts. Its diagram is an ICOM view or function hierarchy.
State whether it is formal IDEF0 or a Mermaid adaptation; hierarchy edges are
decomposition, not runtime order. Bind every leaf to applicable contracts and
acceptance. A function can map to several operations.

Check coverage and parent/child interface consistency. See
[IDEF0 guidance](../../../spec-diagrams/references/idef0-functions.md).
