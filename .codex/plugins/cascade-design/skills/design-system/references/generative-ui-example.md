# Generative UI reference example

Read this only to inspect, run or adapt the optional local example. The shared
[Generative UI practice](generative-ui.md) owns the design guidance. This example
illustrates it with Hybrid components; its template names, event fields, limits
and native DOM renderer are local choices, not required project architecture.

## Boundary

The frontend owns component markup, layout, tokens, accessibility and action
bindings. An agent may propose a supported template and bounded data. A trusted
application adapter validates and admits that proposal before it reaches the
renderer. User interaction emits a typed intent to the host; domain services
own authorization, effects and observed results. Rendering is never an action.

## Small catalog

The executable catalog and decoder in
[generative-ui.mjs](../assets/generative-ui.mjs) define this example's data contract.
The three templates compose existing Hybrid primitives:

| Template | Data | Composition | Outbound intent |
|---|---|---|---|
| `choice` | `title`, `description`, 1–6 `options` with unique `id`, `label`, `detail` | Heading, native radio list, action bar | `select_option` with `optionId` |
| `summary` | `title`, 1–8 `fields` with `label`, `value` | Heading, definition list, action bar | `confirm_summary` with empty values |
| `result` | `title`, `state` (`pending`, `success`, `error`), `message` | Heading, explicit status, outcome text | None |

The model-facing catalog should expose `choice` and `summary` only. `result`
comes from the trusted application adapter's actual operation state or receipt;
an LLM statement is not proof of completion. Do not give raw model output direct
access to the receiver. The local demo uses explicitly simulated host results.

Keep this first slice template-based. Add a new frontend component/template only
for an accepted interaction the existing catalog cannot express. Do not add an
arbitrary component tree, CSS strings, HTML, script, URLs, expressions, dynamic
imports or model-supplied action handlers to this contract.

## Event contract

[generative-ui-events.json](../templates/generative-ui-events.json) contains
complete examples. Version 1 is a local reference contract, not an implementation
of A2UI, json-render or AG-UI, and not a new required Cascade runtime protocol.

An incoming event has `version: 1`, `type`, `runId`, `surfaceId` and positive
integer `revision`. A `surface.replace` adds a complete `view`; a
`surface.remove` removes it while retaining the revision tombstone. Partial JSON
and patches are outside this reference. Higher full snapshots may skip revisions.
The receiver rejects unknown fields, unsupported templates/versions, wrong
run/surface bindings, duplicate option IDs and payloads larger than 16 KiB.
IDs are 1–64 ASCII letters/digits/underscore/hyphen, starting with a letter or
digit. Text is nonblank and bounded by the executable decoder.

Older or repeated revisions are ignored. A selection survives a newer choice
snapshot only if its option still exists. Applying snapshots, reconnect replay
and removal never emit actions. Invalid input retains the last accepted UI.
Text is rendered with DOM text nodes. Unsupported content is not interpreted.

`ui.action` carries the bound `runId`, `surfaceId`, `revision`, semantic `action`,
`values` and a stable `actionId`. Action availability is supplied by the host,
not the payload. It locks on submission. A newer incoming snapshot must include
the matching `ackActionId` to release that lock; an unrelated refresh cannot
resubmit the action. Acknowledgement means the host handled the intent, not that
the domain operation succeeded. Use a pending result until success is observed.
Delivery failure remains an unknown outcome and needs an authoritative refresh.

If adapting the example for effects, the existing action owner validates values
against the current view and revision, checks actor/tenant/resource permissions,
and deduplicates the action ID in that
authenticated scope before any effect. The reference's local lock is not durable
idempotency or authentication. The host creates fresh run IDs, binds destinations
and disposes the receiver when the run, account or owning page ends.

## Running or adapting the example

Both surfaces mount the same templates. The shell owns navigation, conversation
history and stable page layout; the generated region owns only its bounded view.
Use the target framework's existing components or the native DOM reference:

```js
import { mountSurface } from './generative-ui.mjs';

const surface = mountSurface(elementInsideHybridRoot, {
  runId: hostRunId,
  surfaceId: 'lesson',
  allowedActions: ['select_option', 'confirm_summary'],
  onAction: sendIntentToApplication,
});

// Call only from the trusted, scoped application event adapter.
surface.receive(admittedCompleteSnapshot);
// On unmount/run or account change:
surface.destroy();
```

The two CSS assets are [Hybrid](../assets/hybrid.css) and the small
[template anatomy](../assets/generative-ui.css). The editable
[web/chat example](../assets/generative-ui-demo.html) and its
[demo controller](../assets/generative-ui-demo.mjs) show template selection,
data refresh and a simulated action/result round trip. Serve these source assets
through the target dev server; the module demo is not a file-URL application.
Do not ship the synthetic controller as production functionality.

An ordinary HTTP response, an SSE/WebSocket subscription or an existing agent
event stream can supply complete admitted snapshots through a thin host adapter.
Transport code bounds bytes before parsing and owns reconnect, cancellation,
authentication and resource scope. A web page can supply structured domain data
to the same adapter. Treat retrieved web content as untrusted data and preserve
its provenance; never execute markup or let it choose actions or permissions.

For a target that already uses a generative UI stack, adapt these component
rules into its catalog instead of installing a second renderer/state store:

- [json-render](https://json-render.dev/docs) defines component/action catalogs,
  specifications and native renderers; suitable for a target adopting that stack.
- [A2UI](https://a2ui.org/) describes declarative UI rendered with the client's
  components across platforms.
- [AG-UI](https://docs.ag-ui.com/introduction) carries agent/application events
  and user interaction; it is a transport/integration layer distinct from the
  component catalog.

These official sources were inspected on 2026-09-08. No external adapter,
provider connection, streaming parser or protocol compatibility is implemented
or claimed by the reference assets.

## Example validation

The example can illustrate the practice without a connected model or service.
Production adaptation belongs to an explicitly scoped target implementation.

Validate the public receiver and intent boundary: malformed/oversized inputs,
foreign and stale updates, selection preservation, replay without effects,
double submission and acknowledgement. Inspect both shells, relevant themes,
narrow widths, keyboard focus and outcome states. Test the actual backend's
permissions, idempotency and receipts only when that backend is integrated.
