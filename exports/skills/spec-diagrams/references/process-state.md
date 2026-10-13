# Processes, state and IDEF3

IDEF3 has process-flow and object-state-transition viewpoints. Process diagrams
describe precedence and causality; state views describe allowable transitions.
Formal IDEF3 requires its UOB, link, junction and elaboration conventions; generic
diamonds and arrows are adaptations. See the
[method description](https://www.idef.com/idef3-process-description-capture-method/)
and [primary manual collection](https://www.idef.com/downloads/).

## Process adaptation

Give each action an owning scenario step or handler. Label conditions, joins,
loops, result and recovery. State whether branches are exclusive or parallel;
a diamond alone cannot distinguish an XOR choice from concurrent work.

```mermaid
flowchart LR
  Request["SC-02 Reservation request"] --> Validate["H-CREATE Validate input"]
  Validate --> Guard{"R-01 Member active?"}
  Guard -->|no| Denied["403 No write"]
  Guard -->|yes| Insert["D-RES Insert in transaction"]
  Insert -->|overlap| Conflict["409 No reservation created"]
  Insert -->|committed| Created["201 Persisted reservation"]
```

Adjacent prose supplies the exact predicates and rollback behavior. This diagram
cannot replace the request schema or database exclusion constraint.

## State adaptation

Name a real domain lifecycle. Label edges with operation and guard, and bind
them to a transition table. Do not invent states solely because a state diagram
is available. UI loading state and domain reservation status are separate.

```mermaid
stateDiagram-v2
  [*] --> Active: OP-CREATE / commit
  Active --> Cancelled: OP-CANCEL / owner and before start
  Cancelled --> Cancelled: OP-CANCEL / same owner repeat
```

Specify terminal/deletion semantics in prose. Initial pseudostates are diagram
constructs, not stored enum values. Check failed guards and repetition explicitly.
For races add a sequence showing two callers, actual DB enforcement and the
winning/losing outcome; successful sequential tests do not prove concurrent integrity.

Read [state syntax](https://mermaid.js.org/syntax/stateDiagram.html) for the
selected Mermaid renderer. Syntax and state-contract review are separate evidence.
