# S18 — Quality and capacity

Define scoped, measurable reliability, usability, performance, capacity and
retention targets with workload, environment, measurement method and acceptance.
Avoid unsupported numerical promises. Explain critical queries, resource limits,
queues and degradation/recovery when they determine architecture.

The section contains nonfunctional requirements and planned measurements. Its
critical-path/resource diagram links bottlenecks to components and tests. Use
IDEF2's simulation viewpoint only for a genuine quantitative modeling question;
a queue picture is not a measured or validated simulation.

Check that targets have an observable oracle and remain explicitly `NOT_RUN`
until measured. See [capacity guidance](../../../spec-diagrams/references/architecture-dataflow.md).
