# Frontend Stack

- Pair ID: `frontend-stack`
- Graph: `docs/patterns/architecture-defaults/frontend-stack.graph.yaml`
- Status: `reference-default`

## When This Is The Default

Use for a `web-frontend` after base boundaries and the complete frontend stack
profile are known. Adopt the matching state/data, cache, realtime, or
UI-platform policy extension before selecting technology for that concern.

## Default Architecture

```text
web claims and policies
  -> rendering and deployment boundary
  -> React/Vite | Next.js | adapted framework
  -> independently justified state/data, UI, and realtime technologies
  -> browser, server, accessibility, and deployment proof
```

### Frontend Framework Profiles

| Technology | Use when | Avoid or prove first |
|---|---|---|
| React + Vite | The app is client-rendered, statically delivered, embedded into an existing backend, or intentionally deployed separately. | Route-level server rendering, server components, or one framework-owned full-stack boundary is required. Vite is a build tool, not the architecture. |
| Next.js App Router | Server components, server rendering, streaming, route-owned loading, or a coordinated React server/client boundary creates product value. | A client-only shell with a separate API is sufficient, or hosting and cache semantics add cost without value. |

### Frontend Data And State

| Technology | Owns |
|---|---|
| React local state/reducer | Component or feature-local interaction state |
| TanStack Query | Remote server-state fetching, identity, freshness, invalidation, retries, and mutations |
| Zustand | Small selector-based shared client state |
| Redux Toolkit | Governed cross-feature client events and state |
| XState | Explicit workflows, statecharts, concurrency, guards, and recovery |

Keep URL state in the router, remote data in one server-state authority, and
durable/offline records behind repository and sync policy. Do not add a store
until local ownership is insufficient.

### UI Components And Styling

| Technology | Use when |
|---|---|
| Radix Primitives | The product owns accessible behavior and visual styling |
| shadcn/ui | The product wants copied component source it owns and customizes |
| Material UI | A comprehensive styled Material component system is the desired baseline |
| Tailwind CSS | Utility-first styling matches the owned visual language and team convention |
| Storybook | Shared components need isolated documentation, examples, and governance |

### Realtime Technology

Escalate only as semantics require:

```text
focus refresh or bounded polling
  -> SSE for server-to-client streaming
  -> WebSocket for bidirectional protocol control
  -> Socket.IO when reconnection, acknowledgement, room, and fallback semantics justify it
  -> managed realtime when connection operations or platform delivery require it
```

## Reference File Structure

Keep the selected framework behind the web archetype:

```text
src/app/ or framework route shell
src/features/<feature>/
src/shared/ui/
src/shared/lib/
```

Framework routes compose feature entrypoints. State, UI, and transport tools do
not bypass feature application contracts or create duplicate data authorities.

## Default Decisions

- Resolve rendering and deployment boundaries before choosing libraries.
- Keep local, remote, workflow, durable, and realtime state authorities
  separate.
- Adopt state, cache, realtime, and UI technologies only after the matching
  frontend policy extension.
- Keep hosting, CDN, edge, data, delivery, secrets, and observability products
  in infrastructure selection.

## Validation Contract

- Prove rendering, hydration, cache/revalidation, auth, navigation, and error
  boundaries on the actual host.
- Prove keyboard, focus, screen-reader, theme, and responsive states.
- Prove realtime reconnect, ordering, gap recovery, auth renewal, scale-out,
  and authoritative reconciliation when applicable.
- Verify one owner per state category and no duplicate remote-data cache.

## Exceptions

An established non-React framework or platform UI system is a valid adapted
candidate when it preserves the web archetype and passes the same rendering,
state, accessibility, delivery-compatibility, and lifecycle gates.

## Current Documentation Basis

- [React guidance](https://react.dev/learn/creating-a-react-app)
- [Vite guide](https://vite.dev/guide/)
- [Next.js App Router documentation](https://nextjs.org/docs/app)
- [TanStack Query documentation](https://tanstack.com/query/latest/docs/framework/react/overview)
- [Redux Toolkit guidance](https://redux-toolkit.js.org/introduction/why-rtk-is-redux-today)
- [XState documentation](https://stately.ai/docs)
- [Radix Primitives](https://www.radix-ui.com/primitives)
- [shadcn/ui](https://ui.shadcn.com/docs)
- [Material UI](https://mui.com/material-ui/getting-started/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Storybook](https://storybook.js.org/docs)
