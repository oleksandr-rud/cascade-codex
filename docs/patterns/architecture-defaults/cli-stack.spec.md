# CLI Stack

- Pair ID: `cli-stack`
- Graph: `docs/patterns/architecture-defaults/cli-stack.graph.yaml`
- Status: `reference-default`

## When This Is The Default

Use for a `cli` after command, automation, portability, installation, update,
plugin, and support constraints are known.

## Default Architecture

```text
CLI claims and policies
  -> compiled executable | runtime-distributed package | embedded command
  -> automation and distribution proof
  -> selected technology, target matrix, and release owner
```

### CLI Candidate Families

| Candidate family | Prefer when | Prove first |
|---|---|---|
| Compiled executable | Single-file distribution, startup, predictable prerequisites, or cross-environment automation matters | Target OS/architecture matrix, libc/system dependencies, signing, updates, size, and reproducible builds |
| Runtime-distributed package | The target environment already owns the runtime and its package ecosystem materially lowers delivery cost | Runtime/version prerequisites, install isolation, startup, dependency integrity, and update policy |
| Embedded command | The command ships with an existing app or package and reuses its runtime and release | Non-interactive behavior, compatibility, startup, and whether embedding couples unrelated release cycles |

The `cli` archetype owns parser, commands, use cases, ports, adapters, renderer,
and exit policy. Technology selection cannot weaken arguments, stdout/stderr,
structured output, exit codes, signals, cancellation, or filesystem safety.

## Reference File Structure

Use the language overlay already documented by `cli`. Record build targets,
runtime prerequisites, package/signing route, update policy, plugin boundary,
and compatibility matrix beside the adopted CLI profile.

## Default Decisions

- Choose the distribution contract before language preference.
- Preserve automation behavior across technology changes.
- Add plugins only with explicit trust, compatibility, and lifecycle
  boundaries.

## Validation Contract

- Run representative commands in interactive and non-interactive modes.
- Verify stdout/stderr separation, structured output, exit codes, signals,
  cancellation, idempotency where required, and safe filesystem behavior.
- Verify target OS/architecture or runtime-version matrix, install, uninstall,
  update, rollback, signing, and dependency integrity.

## Exceptions

An internal one-off command may reuse the repository runtime without a broad
distribution matrix. If it becomes a supported public tool, perform a new CLI
technology decision rather than treating the experiment profile as production
evidence.
