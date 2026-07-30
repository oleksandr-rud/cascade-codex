# Command-Line Tool Default

- Pair ID: `cli`
- Graph: `docs/patterns/architecture-defaults/cli.graph.yaml`
- Status: `reference-default`

## When This Is The Default

Use this archetype for a distributable CLI with multiple commands, external
dependencies, material side effects, or automation consumers. Command handlers
stay thin around reusable use cases, explicit adapters, stable output, and an
exit-code policy.

A private one-off script does not need this full structure. Promote it only
when reuse, distribution, testing, or safety becomes real.

## Default Architecture

```text
executable and signal boundary
  -> parser and config precedence
  -> thin command
  -> parser-independent use case
      -> filesystem, process, network, clock, and provider ports
          <- concrete adapters
  -> human or machine renderer
  -> stable exit policy
```

The core returns structured results and typed failures. It does not print,
terminate the process, read ambient global configuration, or depend on a CLI
framework. The executable owns dependency assembly, signals, rendering, and
process exit.

## Reference File Structure

### Go

```text
cmd/<tool>/main.go
internal/
  cli/
    commands/
    render/
    exit/
  app/
  ports/
  adapters/
  config/
pkg/
  <public-library-only-when-real>/
tests/
  functional/
```

### Rust

```text
src/
  main.rs
  cli/
    commands/
    render.rs
    exit.rs
  app/
  ports/
  adapters/
  config.rs
tests/
  functional/
```

### Python

```text
src/<tool>/
  __main__.py
  cli/
    commands/
    render.py
    exit.py
  application/
  ports/
  adapters/
  config.py
tests/
  functional/
  unit/
```

### TypeScript

```text
src/
  bin.ts
  cli/
    commands/
    render.ts
    exit.ts
  application/
  ports/
  adapters/
  config.ts
tests/
  functional/
  unit/
```

Do not create a public library folder unless another real consumer imports it.
Keep framework command declarations in `cli`; keep owned behavior in
`app` or `application`.

## Default Decisions

### Commands And Configuration

- Use nouns and verbs consistently and keep command names stable after release.
- Define precedence as flags over environment over config file over defaults,
  unless the ecosystem has a stronger documented convention.
- Validate the merged config once and report source-aware errors without
  printing secrets.
- Keep interactive prompts opt-in or TTY-aware; automation paths must be
  non-interactive and deterministic.

### Output And Exit Codes

- Keep normal results on stdout and diagnostics on stderr.
- Provide a versioned machine-readable mode when automation consumers exist.
- Do not mix progress, banners, or color codes into structured output.
- Define stable exit categories such as success, usage/configuration,
  expected domain failure, external dependency failure, partial result, and
  interruption. Use ecosystem conventions where they are stronger.

### Effects And Safety

- Resolve and display material targets before mutation.
- Use temporary files plus atomic replacement for file rewrites when practical.
- Provide dry-run for destructive, broad, remote, or expensive operations.
- Propagate cancellation and clean up owned temporary resources.
- Bound concurrency, retries, timeouts, and output volume.
- Redact secrets from commands, logs, errors, telemetry, and support bundles.

### Extensibility

- Add subcommands through the parser's normal registration boundary.
- Add provider variation through a port only when variation or test cost is
  real.
- Avoid plugin systems until third-party extension, compatibility, discovery,
  trust, and lifecycle requirements are explicit.

## Validation Contract

- Snapshot or contract-test help, command names, flags, defaults, examples,
  structured output, stderr, and exit categories.
- Run functional journeys in temporary directories and use local substitutes
  for owned dependencies.
- Cover missing config, invalid config, permission failure, existing targets,
  partial failure, cancellation, timeout, retry exhaustion, and broken pipes.
- Verify machine output is deterministic and contains no progress or secret
  leakage.
- Test installation and invocation through the real packaged executable, not
  only module-level calls.

## Exceptions

Adapt to established ecosystem conventions such as POSIX filters, compiler
drivers, language package tools, or interactive TUIs. Preserve the same public
command, configuration, effect-safety, output, exit, adapter, and functional
test responsibilities even when filenames differ.
