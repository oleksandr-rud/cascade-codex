# Role context and prefix caching

Each role has a Context Builder under [architecture version 3](analyzer-policy-composer.md).
It starts from an authorized current snapshot. Analyzer sees task/observations/catalogs,
Researcher sees only its admitted query/sources, Composer sees admitted claims/evidence.
The private manifest binds scope, revision and invocation. After every model call,
revalidate freshness before recording or publishing its result.

Keep stable role instructions and approved catalogs in a stable prefix. Put current
observations, claims, uncertainty and task data in the current view. Corrections,
compaction, identity or policy changes invalidate the affected prefix. Cache identity
is scoped by target/tenant/task and never grants access. A cache hit never bypasses
Admission or a fresh permission check. Do not expose private runtime metadata to models.

JSON role messages are the default. The optional schema-values-text projection helpers
preserve the same admitted semantic view; their local byte/prefix tests do not establish
provider token counts, remote cache savings or live quality. History is selected explicit
data, not a state store or an immutable source of authority. Current user input and
unresolved obligations remain represented after compaction.
