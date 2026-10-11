# S05 — Architecture and module responsibilities

Choose the smallest architecture supporting the agreed scenarios. Specify stack,
components, responsibilities, interfaces, dependency direction and data ownership.
For a greenfield application give an actual module/file map, entrypoints and
shared contract locations. Reuse existing conventions when extending a repository.

The section contains components and a concrete responsibility table. Its diagram
shows actors/system context, deployable containers or internal modules as needed.
Keep those levels distinct and label connections with purpose and protocol.
Bind nodes to the component table and material edges to real operations/events.

Check that every scenario has an owner and callers do not bypass the chosen
boundary. See [C4 and dataflow guidance](../../../spec-diagrams/references/architecture-dataflow.md).
