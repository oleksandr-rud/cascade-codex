# S11 — State, concurrency and effects

Specify meaningful lifecycle states, initial/terminal conditions, transitions,
guards, actor permissions and effects. Define behavior under competing writes,
repeated calls, timeouts and retries. Name the actual lock/constraint/versioning
mechanism and its transaction boundary; application pre-checks alone are not
a concurrency contract.

The section contains a transition table and race/repeat outcomes. Its state
diagram maps each edge to the operation, handler, rule and acceptance that own it.
Add a sequence when competing requests or commit/effect order need explanation.
Separate logical state from actual row deletion and external delivery status.

Check failed transitions, terminal behavior and deterministic conflict outcomes.
See [state and process guidance](../../../spec-diagrams/references/process-state.md).
