# Library Stack

- Pair ID: `library-stack`
- Graph: `docs/patterns/architecture-defaults/library-stack.graph.yaml`
- Status: `reference-default`

## When This Is The Default

Use for a `library` application unit after `sdk-library` has established its
public surface, consumers, compatibility obligations, and package lifecycle.
Select language, package, generator, runtime-compatibility, platform, or
binding technology here. Select operated build and distribution resources
through `library-infrastructure`.

This pair does not convert ordinary app-local shared folders into packages. It
does not prescribe concrete packages, generators, registries, or providers
without target claims and fresh compatibility evidence.

## Default Architecture

```text
library consumers, public API, compatibility, platform, and distribution claims
  -> generated API SDK
   | hand-authored SDK
   | internal library
   | public library
   | platform SDK
   | adapted WASM, FFI, or binary binding
  -> consumer, toolchain, package, compatibility, and security proof
  -> selected library technology profile and owners
```

A library may combine applicable families, such as a generated transport core
behind a hand-authored facade or a shared core exposed through several
bindings. The selection must preserve one intentional public contract and
explicit ownership for each generated or binary boundary.

## Candidate Families

| Candidate family | Use when | Prove before selection |
|---|---|---|
| Generated API SDK | An authoritative machine-readable interface can remove repetitive transport/model work and regeneration is part of the server compatibility lifecycle | Input authority and version, generator and template lifecycle, customization and wrapper boundary, normalized output review, server-contract tests, supported language/runtime behavior, and supply-chain trust |
| Hand-authored SDK | Consumer experience, domain semantics, resilience, portability, or protocol adaptation requires an intentional facade rather than direct generated transport types | Public types and errors, transport boundary, auth attachment, pagination/streaming, cancellation, retry ownership, examples, wire compatibility, and maintenance cost |
| Internal library | Named internal consumers need an independently owned package but public ecosystem support is unnecessary | Independent or coordinated versioning, consumer inventory, dependency policy, compatibility horizon, release coordination, support and removal ownership |
| Public library | Unknown or broad external consumers require a stable documented package and long-lived support contract | Package format and metadata, clean installation, supported versions, dependency bounds, licensing, security response, documentation, migration, deprecation, provenance, and release recovery |
| Platform SDK | Device, desktop, host, plugin, cloud, or other platform integration owns material lifecycle and capability behavior | Supported platform versions, permission and lifecycle behavior, threading, storage, capability absence, packaging, signing, updates, telemetry, and platform review |
| WASM, FFI, or binary binding | Existing implementation value justifies a cross-language or binary boundary | Supported targets, ABI or module compatibility, serialization, memory/resource ownership, threading, errors, security, sandboxing, debugging, packaging, binary size, performance, signing, upgrades, and fallback |

Do not score an inapplicable family. Record `ELIGIBLE`, `REJECTED`,
`PROOF_REQUIRED`, or `GAP` from source-linked claims and policy outcomes.

## Selection Claims

Extract at least:

- named and expected consumers;
- required languages, runtimes, platforms, and versions;
- public source, wire, binary, or generated contract;
- synchronous, asynchronous, streaming, callback, or lifecycle behavior;
- portability, offline, size, startup, memory, throughput, or latency limits;
- installation, package, update, and support channels;
- dependency, licensing, security, provenance, and regulated-environment rules;
- team ownership for generation, bindings, consumer support, upgrades, and
  vulnerability response.

Resolve contradictions before selection. A desire to share code does not prove
a package boundary, and package popularity does not prove consumer fit.

## Technology Boundaries

Apply the chosen technology to the `sdk-library` ownership model:

```text
supported exports
  -> language-idiomatic core and ports
  <- transport, platform, generator, WASM, FFI, or binary adapters

package manifest and export controls
  -> supported runtime, platform, and dependency matrix
  -> examples and consumer fixtures
```

Generated output stays isolated or is deliberately declared as the complete
public contract. Cross-language bindings expose a host-idiomatic facade where
that facade materially improves safety and consumer experience. Do not build
several language packages from one source unless named consumers and owners
justify each toolchain and release matrix.

For a separately released UI package, compose this extension with
`frontend-ui-platform`: the library stack selects language, package, build
format, and supported consumer runtimes; the UI pair remains authoritative for
tokens, accessible primitives, component behavior, themes, visual evidence,
and payload constraints.

## Generated SDK Selection

Generation is eligible only when:

- an authoritative interface or schema and its version lifecycle exist;
- generator, template, configuration, and customization ownership are known;
- regenerated changes are reviewable and contract-tested;
- generated transport and model types do not accidentally define a less
  stable consumer contract;
- missing generator features have an owned wrapper, template, or rejection
  path;
- published artifacts can be traced to the server-contract and generator
  identities.

Reject generation that requires persistent hand edits, hides incompatible
server drift, executes untrusted templates or binaries without controls, or
creates a larger support burden than a bounded hand-authored client.

## WASM, FFI, And Binary Binding Selection

Treat bindings as a security, correctness, and support boundary. Record:

- target operating systems, CPU architectures, runtimes, and calling
  conventions;
- source, build, binary, signature, and provenance identities;
- memory allocation and release, object ownership, handles, callbacks,
  threading, reentrancy, cancellation, panics/exceptions, and error mapping;
- serialization, encoding, numeric, timestamp, and nullability contracts;
- sandbox or process isolation, permissions, native-library search paths, and
  compromised-binary response;
- debugging, symbol, crash, telemetry, packaging, upgrade, rollback, and
  fallback behavior.

Do not hide blocking work or unsafe memory ownership behind an apparently
asynchronous or memory-safe host-language surface.

## Reference File Structure

Apply the selected candidate family to the `sdk-library` public, core, port,
adapter, generated-code, documentation, example, contract-test, and release
boundaries. Use the selected ecosystem's idiomatic package layout and export
controls:

```text
<library package owner>/
  supported public exports
  core behavior and ports
  transport, runtime, platform, or binding adapters
  isolated generated outputs when selected
  examples and documentation
  contract, consumer, compatibility, and generation tests
  package manifest, support matrix, migrations, and release metadata
```

Do not create language-specific overlays that have no named consumers. Do not
copy provider, transport, generated, or binary implementation types into the
public surface merely to match a suggested folder tree.

## Default Decisions

- Select candidate families from consumer, contract, platform, distribution,
  and support claims rather than a generic technology catalog.
- Prefer the smallest technology and compatibility profile already supportable
  by consumers and maintainers.
- Use generation only with owned inputs, generator lifecycle, isolation,
  regeneration review, and server-contract proof.
- Use WASM, FFI, or binary bindings only when their value exceeds another
  toolchain, target, security, debugging, and support boundary.
- Keep application technology separate from build, registry, artifact,
  signing, provenance, documentation, release, and hosted-service resources.

## Validation Contract

- Verify the unit satisfies the `library` threshold and names consumers,
  owners, public contracts, supported environments, and support horizon.
- Evaluate only applicable candidate families, with every policy disposition
  and rejection reason recorded.
- Prove clean consumer install and use of the published package, not only
  module-level source imports.
- Prove public exports, errors, configuration, runtime/platform compatibility,
  dependency bounds, package metadata, examples, size/performance constraints,
  and upgrades.
- For generated SDKs, prove authoritative input identity, regeneration,
  normalized review, wrapper behavior, contract drift detection, generator
  trust, and provenance.
- For WASM, FFI, or binary bindings, prove target support, memory/resource
  ownership, threading, serialization, error mapping, sandboxing, packaging,
  signing, crash behavior, upgrades, and fallback.
- Verify concrete technology decisions cite current target evidence and
  official compatibility sources; this reference catalog alone cannot make a
  candidate eligible.
- Keep authored profile, validated compatibility, executed consumer tests,
  published package, and release eligibility separate.

## Exceptions

A mandated ecosystem, language, platform, or package authority may determine
part of the profile. Record the mandate, coupled constraints, unsupported
alternatives, and exit path, then prove the same consumer, compatibility,
security, package, upgrade, and ownership contracts. If no candidate satisfies
the required consumers or platforms, record `GAP`; do not invent a concrete
package recommendation.
