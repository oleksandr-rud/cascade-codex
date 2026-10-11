# S07 — API and boundary contracts

Define each operation ID, method/path or protocol message, caller, authorization,
request fields/types/requiredness/validation, response fields and examples,
status/error codes and durable completion meaning. Specify pagination, filtering,
time conventions and repetition semantics where they apply. Link its handler.

The section owns these fields unless an existing OpenAPI/protocol file is named
as their authority. Its diagram is a boundary sequence using exact operation IDs,
meaningful alternative responses and persisted completion points. Avoid duplicating
the handler's internal algorithm in every caller sequence.

Check that UI requests, handler inputs and returned fields agree, including error
recovery. See [contract guidance](../../../spec-diagrams/references/handler-contracts.md).
