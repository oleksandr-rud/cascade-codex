# Events and role context

The current host snapshot binds request, scope, revision, task and source observations.
Analyzer's Context Builder selects permitted observations and predicate/source catalogs.
Researcher's builder selects the authorized query and source locators. Composer's builder
selects the task, admitted claims, uncertainty and referenced evidence. Rebuild after any
state or observation change; reject stale asynchronous results.

Role semantics stay in model messages. Identity, revision, authorization, idempotency and
cache metadata stay in the private manifest. Each output schema includes only its own
dependency closure. The model cannot choose a host binding or restore omitted authority.

JSON is the default wire format. Explicitly configured YAML is a syntax transport only;
reject duplicates, unsafe numbers, aliases, tags, extra documents and excessive depth.
Optional schema-values-text projections must preserve the same semantic role slice and
source provenance. Formatting, caches and graph checkpoints grant no access or authority.
