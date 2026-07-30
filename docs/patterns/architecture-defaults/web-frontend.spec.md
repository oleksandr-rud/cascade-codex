# Web Frontend Default

- Pair ID: `web-frontend`
- Graph: `docs/patterns/architecture-defaults/web-frontend.graph.yaml`
- Status: `reference-default`

## When This Is The Default

Use for a browser application with multiple product features, remote data,
navigation, and meaningful loading, empty, failure, permission, stale, or retry
states. Prefer feature ownership over repository-wide folders that group every
component, hook, store, and service by technical type.

Keep a static site or very small client shallower until independent product
features prove the boundary.

## Default Architecture

```text
app shell and route composition
  -> feature public entrypoint
      -> interface: screens, components, interaction adapters
      -> application: commands, queries, workflows, view models
      -> domain: client-owned rules when they are real
      -> data: remote/local contracts, DTO mapping, cache identity
          -> transport and storage adapters
shared UI platform + shared technical libraries
  -> tokens, accessible primitives, config, telemetry, generic utilities
```

The app shell owns boot and composition, not product workflows. A feature slice
owns one cohesive product capability and exposes a narrow entrypoint. Its
internal layers are responsibility folders, not mandatory ceremony: omit
`domain` or separate `application` folders when the behavior is genuinely
small, but preserve dependency direction and data ownership.

Cross-feature collaboration occurs through public feature contracts, shared
application capabilities, or backend contracts. It must not depend on deep
imports into another feature.

## Reference File Structure

```text
src/
  app/
    startup/
    routes/
    providers/
    layouts/
    errors/
  features/
    <feature>/
      interface/
        screens/
        components/
      application/
        commands/
        queries/
        view-models/
      domain/                 # only when client-owned rules justify it
      data/
        queries/
        mutations/
        mappers/
        ports/
        adapters/
      contracts/
      tests/
      index.*
  shared/
    ui/
      tokens/
      primitives/
      components/
      patterns/
    api/
    realtime/
    storage/
    lib/
    config/
    observability/
  assets/
tests/
  functional/
  accessibility/
  visual/
```

Framework overlays:

| Profile | App shell and routes | Feature roots | Server-only boundary |
|---|---|---|---|
| React + Vite | `src/app/` | `src/features/` | Explicit backend-for-frontend or API |
| Next.js | `src/app/` route files stay thin around features | `src/features/` | `src/server/` or server-only modules never imported by client code |
| Vue + Nuxt | Framework app/route root | `features/` with Vue components and composables inside the slice | `server/` |
| SvelteKit | `src/routes/` stays thin | `src/lib/features/` | `+page.server` and `src/lib/server/` |

Do not create generic `components`, `hooks`, `services`, or `stores` dumping
grounds. Shared code has a stable product-agnostic API and an explicit owner.

## Default Decisions

### Slice And Dependency Policy

- Routes import feature entrypoints; they do not implement feature workflows.
- Feature interface code sends intents to application behavior. Application
  code may use client-owned domain rules and data ports. Provider, framework,
  and transport schemas stay in adapters.
- Treat client domain code as optional: a DTO type or component prop is not a
  domain model.
- Promote shared code only after independent reuse, except design-system and
  platform primitives that are shared by definition.

### State And Data Policy

- Keep URL state in routing, form state in the form boundary, ephemeral
  interaction state near its UI, server state in query/data boundaries,
  durable local state in a storage owner, and realtime connection state in a
  realtime adapter.
- Add a global store only for client-owned state used across independent routes
  or features. Prefer derived state over synchronized copies.
- Use schema-derived clients when possible and translate transport DTOs at the
  feature data boundary.
- Treat query identity, freshness, invalidation, optimistic behavior, and error
  translation as public feature behavior.
- Select the `frontend-state-data`, `frontend-cache`, or `frontend-realtime`
  extensions when those policies are material.

### Rendering, Security, And UI Platform

- Choose server, client, or hybrid rendering per route from interactivity,
  sensitivity, caching, SEO, and performance.
- Keep credentials and server-only data out of client bundles. Server
  authorization remains authoritative.
- Every async feature owns observable loading, empty, success, validation,
  permission, stale, failure, retry, and offline states that can occur.
- Reuse tokens and accessible primitives through the UI-platform owner; use
  `frontend-ui-platform` when packaging, theming, documentation, or release
  governance is material.

## Validation Contract

- Enforce public feature entrypoints with import-boundary checks.
- Run feature-level functional checks through routes and public UI contracts.
- Contract-test data/transport adapters, DTO mapping, query identity, mutation
  reconciliation, authorization/error translation, and selected cache or
  realtime policies.
- Cover keyboard, focus, semantics, contrast, motion, responsive reflow,
  overflow, localization expansion, loading, empty, stale, offline where
  supported, failure, and retry.
- Measure route payload, rendering time, interaction latency, hydration or
  client/server consistency, and server-only data leakage.
- Use screenshot evidence for visible layout and state changes while keeping
  functional and accessibility outcomes separate.

## Exceptions

Follow coherent target conventions instead of moving files solely to match this
tree. Adapt for microfrontend ownership, offline-first replication,
server-driven UI, or framework route co-location only with an explicit mapping
for feature ownership, public surfaces, state, contracts, accessibility, and
validation. Do not introduce every optional layer into a small feature.
