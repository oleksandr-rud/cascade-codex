# CLI Infrastructure

- Pair ID: `cli-infrastructure`
- Graph: `docs/patterns/architecture-defaults/cli-infrastructure.graph.yaml`
- Status: `reference-default`

## When This Is The Default

Evaluate this pair after `cli`, `cli-stack`, and `infrastructure`. Its default
result is no operated infrastructure. Add only the distribution and operational
capabilities supported by target evidence: release artifacts, signing,
registries, update channels, provenance, plugin distribution, or telemetry.

A remote API or control plane is not CLI infrastructure merely because the CLI
calls it. Project-owned remote behavior is a separate backend application unit;
a third-party service is a true external boundary.

## Default Architecture

```text
CLI release scope
  -> no operated infrastructure                         [default]
  -> release builds -> signed artifacts -> provenance  [if evidenced]
                    -> registries -> update channels    [if evidenced]
  -> plugin distribution and trust boundary            [if evidenced]
  -> telemetry client integration                       [if evidenced]
  -> remote API or control plane
       -> separate backend unit or true external boundary
```

### No-Infrastructure Result

The absence of operated resources is a valid selected profile, not missing
analysis. A local compiled binary, runtime package, or embedded CLI may use the
filesystem, environment, local configuration, credential stores, caches, and
operating-system processes without creating compute, data, messaging, or
delivery infrastructure.

Record which evidence was checked and why no operated resource is required.
Do not add a registry, updater, telemetry collector, plugin service, or remote
control plane as a presumed part of a professional CLI.

### Evidence-Backed Distribution

For every selected distribution capability, record:

- target operating systems, CPU architectures, runtime prerequisites, install
  paths, and release channels;
- clean build identity, dependency/toolchain identity, artifact digest,
  signature, verification instructions, provenance, retention, and deletion;
- signing identity reference, least privilege, access, audit, rotation,
  expiry, revocation, and recovery;
- registry/index ownership, access, integrity, mirrors, availability,
  version-retention, yanking/deprecation, and exit route;
- update discovery, compatibility, staged release, interrupted update,
  rollback, minimum version, and channel retirement;
- plugin compatibility, discovery, signing, permission, isolation, revocation,
  update, and support lifecycle;
- telemetry purpose, notice or consent, data fields, redaction, identifiers,
  buffering, disablement, failure isolation, retention, access, and deletion.

### Remote Ownership Boundary

| Concern | CLI owns | Separate owner |
|---|---|---|
| Local command, config, cache, credentials, files | Parser/use case/adapters and public filesystem contract | None |
| Artifact installation and update client | Verification, compatibility, user-facing outcome | Registry/update delivery resources when selected |
| Plugin loading | Compatibility, permission, isolation, and local failure | Hosted catalog/service is backend-owned or true external |
| Telemetry emission | Notice/consent, minimization, redaction, disablement | Receiver/processing service is backend-owned or true external |
| Remote API/control-plane call | Client contract, auth attachment, timeout, errors | Operated behavior belongs to a backend application unit |

The CLI may be distributed independently from the backend. Its release profile
must not become the owner of remote state, authorization policy, orchestration,
or control-plane availability.

### Negative Routing Examples

| ID | Input | Required result |
|---|---|---|
| `NCE-003` | A local compiled CLI has no service dependency. | Select no operated infrastructure; do not create provider resources or IaC. |
| `NCE-004` | A CLI uses a project-owned remote control plane. | Classify the control plane as a separate backend unit; keep only CLI distribution and client integration here. |

## Reference File Structure

This pair defines no CLI source scaffold and no provider or IaC tree. Record
the selected no-resource result or evidence-backed distribution profile in
existing target owners:

```text
existing stack-selection evidence
  -> CLI application unit and target environments
  -> CLI infrastructure decision record
  -> optional artifact/signing/provenance/channel evidence
  -> optional plugin and telemetry contracts
  -> separately owned backend-unit decisions
```

Do not add package-registry configuration, update services, telemetry
receivers, control-plane source, or infrastructure code solely because this
reference pair was selected.

## Default Decisions

- `no-infrastructure-default`: a local CLI begins with no operated resources.
- `local-files-are-application`: local files, config, credentials, caches, and
  state remain CLI adapter concerns.
- `distribution-from-evidence`: builds, registries, and update channels exist
  only for declared installation paths.
- `signing-and-provenance`: release trust links source, toolchain,
  dependencies, build, digest, signature, and channel.
- `registry-and-update-lifecycle`: selected channels define integrity,
  availability, compatibility, rollback, retention, and retirement.
- `plugin-trust-and-lifecycle`: plugin infrastructure requires a bounded trust
  and support contract.
- `telemetry-from-evidence`: telemetry is absent by default and bounded by
  purpose, policy, minimization, disablement, and failure isolation when used.
- `remote-control-plane-is-backend`: owned remote behavior receives its own
  backend stack and infrastructure decisions.

## Validation Contract

- Prove `NCE-003` yields an explicit no-operated-infrastructure result and
  creates no compute, data, messaging, delivery, provider, or IaC profile.
- Prove `NCE-004` routes an owned remote control plane to a separate backend
  unit without transferring its state or operations into the CLI profile.
- Build and install supported targets from clean environments; verify startup,
  artifact identity, signature/provenance, runtime prerequisites, uninstall,
  and offline behavior.
- Exercise missing/corrupt artifacts, registry unavailability, mirror
  inconsistency, interrupted updates, incompatible versions, staged release,
  rollback, deprecation, and channel retirement.
- Exercise unsigned, revoked, incompatible, over-permissioned, crashing, and
  unavailable plugins without corrupting CLI behavior.
- Verify telemetry notice/consent or policy basis, field minimization,
  redaction, identifier scope, disablement, offline buffering, receiver
  failure, retention, access, and deletion.
- Verify remote authentication attachment, timeouts, cancellation, retries,
  stable errors, offline behavior, and the remote service's independent owner,
  lifecycle, budget, recovery, and teardown.
- Keep authored release configuration, validated artifact evidence, executed
  publication, observed installs/updates, and release eligibility distinct.

## Exceptions

An embedded CLI may inherit an existing application's release path when that
path proves the same artifact, signing, provenance, compatibility, and support
contract. A controlled internal environment may mandate telemetry or a package
authority, but scope, access, failure isolation, and lifecycle remain explicit.
No exception turns a local CLI into an infrastructure deployment by default or
folds an owned remote API, control plane, plugin service, or telemetry receiver
into the CLI profile.
