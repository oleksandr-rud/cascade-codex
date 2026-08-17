# Task Profiling

Profile the task after the request and context plan are coherent. Use the
profile to derive capability requirements; do not map task labels directly to
providers.

## Dimensions

Rate each dimension `LOW`, `MEDIUM`, or `HIGH`, with one-line evidence:

- reasoning depth and ambiguity;
- instruction and dependency density;
- context volume and source dispersion;
- tool breadth and action consequence;
- autonomy duration and recovery needs;
- output rigidity and determinism;
- domain specialization;
- multimodal or realtime requirements;
- latency sensitivity and volume;
- cost sensitivity;
- safety, privacy, and reversibility risk;
- evaluation availability.

## Hard Capability Requirements

Derive boolean or bounded requirements before considering cost:

- minimum context capacity;
- required input/output modalities;
- structured-output reliability;
- tool or computer-use support;
- long-running agent control and recovery;
- low-latency or high-throughput operation;
- minimum reasoning strength;
- deployment, residency, or surface compatibility.

Risk changes the controls and validation burden. It does not automatically
require the most expensive tier. A simple high-stakes classification can use
an efficient tier when the schema, abstention behavior, and independent checks
are strong enough.
