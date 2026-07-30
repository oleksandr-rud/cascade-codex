# Experiment Infrastructure

- Pair ID: `experiment-infrastructure`
- Graph: `docs/patterns/architecture-defaults/experiment-infrastructure.graph.yaml`
- Status: `reference-default`

## When This Is The Default

Evaluate this pair after `experiment`, `experiment-stack`, and
`infrastructure`. Prefer local execution with no operated resource. When the
protocol proves a need, select the smallest ephemeral compute, artifact,
tracking, queue/scheduler, and delivery resource set that can produce
reproducible evidence inside enforced budget, quota, TTL, and teardown bounds.

This pair governs experiment runs. It does not authorize production
infrastructure or turn project-owned tracking, scheduling, and control services
into part of an experiment script.

## Default Architecture

```text
experiment protocol and run scope
  -> local execution with no operated resource                  [default]
  -> ephemeral batch / accelerator / isolated compute           [if proved]
       -> immutable run artifacts and lineage
       -> optional experiment tracking
       <- optional queue or scheduler
  -> hard budget and quota guards
  -> TTL and teardown on success, failure, cancellation, timeout, abandonment
  -> discard / repeat / extend
  -> production promotion opens new app-stack + infrastructure decisions
```

### Resource Routing

| Concern | Select only when | Resource route |
|---|---|---|
| Local CPU/GPU, local files, local manifest | The protocol fits one controlled workstation or runner | No operated infrastructure |
| Batch, accelerator, distributed, or isolated execution | Time, hardware, scale, isolation, or environment fidelity is measured | `infrastructure-compute` |
| Immutable raw artifacts, large inputs, logs, metrics | Local retention is insufficient or collaboration/audit requires an operated store | `infrastructure-data` and/or `infrastructure-delivery` according to the resource |
| Experiment tracking | Comparison, collaboration, lineage, or audit requires an operated service | Classify resource primitives separately; a project-owned tracking application is a backend unit |
| Queue or scheduler | Deferred work, concurrency, fairness, retries, cancellation, or placement is real | `infrastructure-messaging`, with compute selected independently |
| Credentials, network, observability, artifact publication | A selected remote resource requires them | `infrastructure-delivery` |

Do not select all resource extensions because a run is remote. Scope each
resource independently and prove compatibility at the protocol boundary.

### Budget, TTL, And Teardown Contract

Before remote or shared execution, record and enforce:

- run and campaign owners, approved environments, data classification, regions,
  identities, networks, secrets, and allowed external systems;
- maximum spend, run count, duration, concurrency, accelerator allocation,
  compute usage, storage, data transfer, and alert/stop thresholds;
- TTL or retention owner for compute, volumes, artifacts, datasets, queues,
  credentials, logs, metrics, tracking records, and temporary network access;
- cleanup triggers for success, failure, cancellation, timeout, interruption,
  quota/budget exhaustion, and abandoned runs;
- idempotent teardown, retry/escalation, leak detection, residual-resource
  inventory, final cost, and cleanup evidence;
- checkpoint/restart or cheap-restart policy, partial-artifact authority,
  duplicate-run handling, and cancellation semantics.

Budget alerts without an enforced stop are not a hard budget. A teardown
command without post-cleanup inventory and charge checks is not teardown
evidence.

### Artifact And Service Ownership

Raw run artifacts remain immutable evidence under the `experiment` contract.
An operated store may hold them, but the manifest still records source
revision, protocol, inputs, environment, parameters, seeds, resource identity,
owner, access, retention, and deletion.

A managed tracking or scheduling provider is a true external boundary.
Project-owned tracking, orchestration, scheduling, or control behavior is a
separate backend application unit with its own stack and infrastructure
profile. The experiment runner owns only its client contract, authentication
attachment, submission, cancellation, result retrieval, and stable error
handling.

### Negative Routing Examples

| ID | Input | Required result |
|---|---|---|
| Local case | A repeatable experiment fits local compute and local artifacts. | Select local execution and no operated infrastructure. |
| `NCE-005` | A GPU experiment uses cloud batch resources. | Require quota, hard budget, artifact lineage, interruption behavior, TTL, teardown, leak detection, and final cost evidence. |
| `NCE-006` | Experiment code is promoted to production. | Open new production application-stack and infrastructure decisions; do not inherit experiment ownership or shortcuts. |

## Reference File Structure

This pair defines no experiment source scaffold, provider catalog, or IaC tree.
Link resource evidence from the target's existing protocol, stack-selection,
artifact, and operational owners:

```text
experiment protocol and immutable run manifest
  -> experiment infrastructure decision record
  -> selected resource scopes and owners
  -> budget/quota/TTL policy
  -> interruption and teardown evidence
  -> discard/repeat/extend result
  -> new production decisions when promotion is proposed
```

Do not generate compute modules, storage configuration, queues, schedulers,
tracking services, provider credentials, or production paths merely because
this reference pair was selected.

## Default Decisions

- `local-or-ephemeral-default`: use local execution when sufficient; otherwise
  select the smallest isolated ephemeral resource set.
- `remote-compute-from-evidence`: measured protocol needs, not convenience,
  justify batch, accelerator, distributed, or isolated compute.
- `artifact-lineage-and-retention`: immutable raw artifacts remain linked to
  inputs, source, environment, parameters, access, retention, and deletion.
- `tracking-from-evidence`: an operated tracker exists only for a demonstrated
  comparison, collaboration, lineage, or audit need.
- `scheduling-from-evidence`: queues and schedulers exist only for real
  deferred, concurrent, fairness, retry, cancellation, or placement behavior.
- `budget-and-quota-required`: remote/shared resources have enforced spend and
  capacity ceilings with stop behavior.
- `ttl-required`: ephemeral resources expire; retained evidence has an
  approved owner and policy.
- `teardown-verification`: cleanup covers every terminal path and proves no
  unintended resource, credential, or charge remains.
- `interruption-contract`: remote runs define checkpoint/restart, retry,
  idempotency, partial-artifact, cancellation, and resumption behavior.
- `remote-services-have-separate-owners`: owned service behavior is backend
  behavior; managed services remain true external.
- `promotion-is-new-production-decision`: promotion opens new production
  application and infrastructure selection and proof.

## Validation Contract

- Prove the local case produces an explicit no-operated-infrastructure result
  and no provider or IaC profile.
- For `NCE-005`, execute or inspect a representative remote GPU/batch run and
  verify environment identity, quota, hard budget, artifacts, tracking when
  selected, scheduling when selected, interruption, cancellation, TTL,
  teardown, residual-resource inventory, and final cost.
- Exercise success, failure, cancellation, timeout, spot/preemption or
  interruption, quota exhaustion, budget exhaustion, partial artifacts,
  duplicate submissions, retry, abandoned runs, and cleanup failure.
- Verify every compute allocation, volume, artifact, dataset, queue,
  credential, log, metric, and tracking record has an owner, access policy,
  region/classification, TTL or retention, and teardown/deletion route.
- Reproduce a run from its protocol and manifest; verify analysis cannot mutate
  raw artifacts and cleanup cannot delete approved retained evidence.
- Verify owned tracking, scheduler, or control-plane behavior is a separate
  backend unit, while true external providers have explicit client contracts
  and failure boundaries.
- For `NCE-006`, require new production application-unit, runtime,
  infrastructure, security, reliability, data, operations, cost, and lifecycle
  evidence before release eligibility.
- Keep authored protocol/IaC, validated plans, executed runs, frozen evidence,
  observed cleanup, production adoption, deployment, and release eligibility
  distinct.

## Exceptions

A supported shared experiment platform may replace per-run provisioning, but
experiment allocations, data, credentials, budget, quota, TTL, release, and
cleanup remain bounded and verified. Intentionally retained raw artifacts may
outlive compute when an approved evidence policy owns them. Cheap short runs
may restart instead of checkpointing. No exception permits unbounded remote
spend, resources without expiry or retention ownership, unverified teardown,
owned remote services hidden inside the experiment profile, or production
promotion without a new production decision.
