# Frontend UI Platform And Component Library

- Pair ID: `frontend-ui-platform`
- Graph: `docs/patterns/architecture-defaults/frontend-ui-platform.graph.yaml`
- Status: `reference-default`

## When This Is The Default

Extend `web-frontend` when multiple features or applications need shared
tokens, accessible primitives, reusable components, patterns, themes,
documentation, or release governance. Keep feature workflows out of the UI
platform.

## Default Architecture

```text
semantic tokens + themes
  -> accessible interaction primitives
  -> reusable components
  -> reusable UI patterns
  -> feature-owned composition and product behavior

docs + accessibility + visual + consumer evidence
  -> package ownership, versioning, migration, and release
```

The platform owns presentation and interaction contracts. Features own product
meaning, data, authorization, workflow, analytics intent, and server
invariants.

## Reference File Structure

```text
src/shared/ui/
  tokens/
    semantic.*
    modes.*
  primitives/
  components/
    <component>/
      index.*
      component.*
      styles.*
      stories.*
      tests.*
      accessibility.*
  patterns/
  icons/
  themes/
  localization/
  docs/
packages/ui/             # only when separately versioned or multi-app
tests/
  accessibility/
  visual/
  consumers/
```

Use an in-app source owner until independent versioning, release cadence, or
multi-app consumption justifies a package.

## Default Decisions

- Use semantic tokens for purpose and mode; do not expose feature-specific raw
  values as the shared contract.
- Prefer native semantics or proven headless primitives, then apply project
  styling and tokens.
- Define component anatomy, variants, sizes, states, content rules, responsive
  behavior, keyboard/focus semantics, announcements, and reduced motion.
- Document loading, empty, validation, error, disabled, read-only, overflow,
  localization expansion, bidirectionality, themes, and high-contrast behavior
  as applicable.
- Name ownership, dependency policy, versioning, migrations, deprecation,
  release gates, and consumer support.

## Validation Contract

- Run functional and accessibility checks for semantics, keyboard, focus,
  announcements, contrast, zoom, target size, motion, responsive layout,
  localization, bidirectionality, and theme modes.
- Use visual regression for documented variants and states, but keep it
  separate from behavior and accessibility evidence.
- Run consumer fixtures in each supported framework/runtime profile and measure
  payload or tree-shaking impact where relevant.
- Verify features do not deep-import component internals or fork tokens and
  interaction logic.
- For packages, validate compatibility, migration instructions, dependency
  bounds, provenance, and release rollback.

## Exceptions

A single small application may keep tokens and primitives under
`src/shared/ui` without package governance. Multi-brand platforms may separate
semantic tokens from brand mode packages. Native apps should reuse semantic
design contracts where possible but keep platform-native interaction
implementations rather than forcing web component code across runtimes.
