# Executable schema/value projections

Contract: `schema-values-text@1`. Implementation profile for the existing
Analyzer–Policy Engine–Composer architecture, not a replacement domain schema.

## Default structure and ownership

Use the [simple module recipe](simple-modular-agent.md): `agents/assistant-agent/`
owns its definition, state/store, roles, schemas, prompts and projection profiles.
Application admission/Policy Engine invokes those profiles under domain policies.
Controllers/handlers remain module-root entrypoints. Shared conversation records
keep one owner. A role is not a storage writer, and a profile is not permission.

The executable [block engine](../scripts/projection_blocks.mjs) is the reference
for source decoding, selection, issuance, schema/value rendering, and local cache
reuse. The [transport module](../scripts/context_transport.mjs) owns parsing and
low-level text/message assembly. There is no new event bus, projector service,
generic policy DSL, database, provider integration or automatic dispatch.

## Inputs and source trust

- `decodeProjectionProfiles(text, format)` reads trusted YAML by default or explicit
  JSON. Profiles bind role, purpose, system prompt, role instructions, input-token
  ceiling and ordered blocks. The host must establish configuration provenance
  before loading; parsing never makes an asset trusted.
- Each block has `id`, `object`, `schema`, `placement`, and exactly one of `source`
  or constant `values`. `includeSchema` optionally emits the selected schema into
  the stable catalog. `placement` is `catalog`, `history`, or `data`.
- `decodeProjectionSnapshot(text, format)` reads JSON by default or explicit YAML:
  `{revision, values}`. Already-typed snapshots are accepted directly by `issue`.
  The host loads a consistent authoritative snapshot. Source names are exact
  registered keys; there are no executable selectors, file paths or `$ref` fetches.
- Source-backed blocks cannot use `catalog` placement. Only trusted profile
  constants and selected schema descriptions enter the catalog. Observations,
  memories and accepted state values remain data regardless of their wording.

Supported schema vocabulary is deliberately small: `type`, `description`,
`nullable`, scalar `enum`, object `properties`/`order`/`required`, array `items`/
`maxItems`, and string `maxLength`. Object `order` names each property exactly
once. Unknown schema keywords fail; this is not an implementation of arbitrary
JSON Schema. Use a reviewed target adapter if more validation is required.
Source records can have private extra fields; only declared properties are
selected, recursively. Missing required fields, wrong types and invalid enums
fail. Optional absence, null, empty strings/objects/lists, scalar types and array
order remain distinct. Strings are escaped before rendering.

The [four-role YAML profiles](../assets/projection-profiles.example.yaml) and
[state values](../assets/projection-state.example.json) demonstrate these inputs.
Their prompt wording and fixture scopes are examples, not production defaults.

## Issuance and assembly

```javascript
const engine = createProjectionEngine({
  profiles,                  // Reviewed, trusted role profiles.
  authorize,                 // Current host admission; exact true required.
  countTokens,               // Target tokenizer over complete messages.
  cacheEntries: 128,
});
const request = {profile, scope, task, step, checkpoint, revision};
const slice = engine.issue(request, snapshot);
const context = engine.assemble(slice, request);
// Host rechecks dispatch eligibility and passes context.messages to its adapter.
// context.manifest stays private.
```

`authorize` is required synchronous trusted code, called before issuance and
again before assembly, including on cache hits. It receives request bindings,
role, purpose and the frozen profile digest. It must check live caller/tenant
scope, task/step eligibility, current snapshot revision, policy/profile validity,
expiry and remaining task budget. `scope` represents the host-bound isolation
scope (for example tenant/conversation/agent instance); it is not model input.
The callback must use authoritative host state, not just trust these arguments.
Network-backed authorization should be resolved before entering this synchronous
boundary, with a current decision checked at dispatch; it is not silently awaited.

The returned slice is an opaque process-local handle. The engine binds its
request/profile/selected values privately; a fabricated, cross-engine, cross-task,
cross-scope or changed-checkpoint handle cannot be assembled. It clones config
and selected values so caller mutation cannot alter issued input. Recovery in
another process reissues from current state, rather than deserializing a handle.

Complete assembled messages must fit the profile's ceiling under `countTokens`,
at issuance and assembly. Reserve output separately in the host's allocation.
Invalid accounting or overflow returns `CONTEXT_GAP`; no truncation or fallback
to raw state occurs. The compiler receives only rendered selected blocks, not
the source store. Existing `assembleContext`/`assembleRenderedContext` exports
remain low-level formatters for fixtures and adapters; use this engine at an
admission-bound entrypoint. Formatter success alone never proves admission.

## Local cache and prompt order

The bounded LRU stores rendered blocks. Keys bind renderer version, object name,
selected schema digest, ordered semantic content and disclosure scope. Constant approved blocks and
selected schema blocks can reuse bytes across authorized profiles in one engine;
state/history values are scoped by role/purpose and caller/task/step. Locale or
role variants that change text produce different content keys. `clearCache()`
purges retained text; `cacheStats()` exposes local hits/misses/entry count only.
Revocation blocks reuse through admission even while old bytes remain cached;
targets must also bind retention/deletion to cache purge or engine disposal.

Assembly preserves system -> role instructions -> approved catalog/schema ->
history -> current values. Changing only values preserves the stable prefix.
Provider caching remains separately configured and measured; local hits do not
prove provider hits. Different preceding role instructions prevent an otherwise
identical later block from establishing a shared full prefix.

## Validation and proof boundary

Run from the owning `design-agent-blueprint` skill directory:

```bash
bun test ./scripts/projection_blocks.test.mjs ./scripts/context_transport.test.mjs
python3 scripts/test_agent_contracts.py
bun scripts/projection_example.mjs
```

The example wires YAML profiles and JSON state through all four issued slices
and the real assembler. It explicitly uses character-based fixture accounting;
its admission callback recognizes fixture bindings only. Tests cover decoding,
selection, task binding, revocation, cache reuse, budgets, stable prefixes,
object/list structure and input mutation. The older `validate_projection` Python
helper checks logical shape/relations, not issuer authenticity or live access.
The new engine supplies those process-local checks using host callbacks.

Target database/CAS, real ACL and policy evaluation, provider tokenization/cache,
research dispatch, WebSocket transport and physical voice delivery remain target
integration obligations. This reference does not replace them or activate plugins.
