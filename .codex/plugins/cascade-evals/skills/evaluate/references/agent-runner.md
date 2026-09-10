# Agent runner contract

Read before executable agent evaluation or blind packet construction. Paths and
commands below are relative to the evaluate skill directory, as in its entrypoint.
Emitted artifact and manifest-relative paths use `/` on every platform so the
same frozen contract compares identically on Windows and Unix. Plugin skill
roots must be relative to their package; absolute, drive-relative, rooted, and
resolved link escapes are invalid.

Use `../../scripts/build_blind_packets.py` to construct target and judge
packets when the subject adapter supplies a compatible case suite. The builder
must exclude sealed expectations, oracles, mechanical assertions, thresholds,
minimum dimension floors, peer judgments, and builder context. Validate judge
packets against `references/judge-packet.schema.json` before dispatch. The
suite must name the exact packaged builder and schema; the executable runner
binds both plus `references/model-policy.json` to the subject dependency
manifest and rejects declaration drift.

For an executable agent, role, skill, workflow, or architecture evaluation,
use `../../scripts/run_agent_evaluation.py`. It copies only digest-bound
`subject_assets` into a new sanitized working root. Before dispatch, it
recomputes the manifest subject digest and binds the exact evaluation contract,
suite, split, profiles, subject adapter, installed runner dependencies, model,
reasoning effort, thresholds, floors, cardinality, target invocation count, and
the `contiguous-balanced-parallel-v1` batching contract. It also resolves every
manifest dependency to its enabled immutable installed cache, recomputes every
declared dependency digest, and rejects target-visible subject assets that
disclose the sealed acceptance threshold or dimension floor. A separate builder
invocation reviews the frozen case/judge design. Ordered visible cases are
partitioned into the declared number of balanced, non-empty contiguous target
batches; each batch and each independent judge runs in its own disposable
context, with batches and judges concurrent only within their respective
phases. Batch outputs are schema-bound and deterministically merged back into
frozen split order. On macOS, model contexts use `sandbox-exec` read-denial for the original
subject, installed subject cache, and historical evaluation artifacts. An
allowed-read control must succeed before the denied-source probe is accepted.
On Windows, the default backend uses a local Docker image with only the current
disposable phase directory and the existing Codex login file mounted. The login
file is read-only; repository, installed cache, history, Docker socket and peer
phase directories are not mounted. Before each process starts, inspect and
reject extra mounts, writable credentials, image drift or weakened container
isolation. Pin the immutable image ID, verify an allowed-read control and host
mount absence, and retain tool-free transcript checks. The two backend modes
have distinct receipt identities. Unavailable isolation is BLOCKED, never a
subject rejection or an invitation to disable the boundary. Run the adapter through an environment
that supplies `jsonschema`, for example
`uv run --offline --with jsonschema python ../../scripts/run_agent_evaluation.py ...`.
Controller data, mechanical labels, builder context,
and peer judgments exist only in controller memory until all judges exit.
Only then does the runner materialize the sealed packet and immutable output.
Each target case emits `selected_skill` as the exact visible subject skill
directory name chosen by its trigger and boundary contract. The subject
adapter compares it with the sealed expected route, so skill identity and
collision behavior are mechanical eligibility checks rather than prose.
The subject-owned assertion adapter may mechanically certify only properties
it derives from structured bytes; semantic prose quality remains `NOT_RUN`
until the independent judges run. The supplied timeout is evaluation-wide.
When a tool-free target must emit cryptographic artifact fields, the suite may
declare `digest-only-json-response-v1` and its manifest-bound assertion adapter
may expose `finalize_target`. The controller preserves the raw output and
permits the finalized copy to differ only at lowercase 64-character `sha256`
or `*_sha256` JSON leaves; it records every changed pointer and fails closed on
any structural, status, route, identity, authority, evidence, or prose change.
Every digest-bound subject `SKILL.md` and `*.schema.json` is operative inline
target context. Manifest-bound dependency aliases, plugin versions, paths, and
digests are also visible so typed cross-plugin receipts can bind exact runtime
identities; dependency source bytes remain unavailable. Validators and other supporting scripts remain mechanically
digest-bound unless separately declared operative. When a visible fixture
declares `output_contract.response_encoding=json`, the target must serialize
one schema-conforming compact JSON object into its string-valued response field
instead of returning a prose summary or Markdown fence.
The output root and subject source must be disjoint, and the output root must
not already exist. Omitting `--execute` is a binding preflight-only `NOT_RUN`;
it is not evaluation evidence.

## Windows / local Docker setup

Build the declared Codex runtime once from the installed Cascade Evals root:

```powershell
docker build -t cascade-evals-codex:0.153.4 -f scripts/codex-isolation.Dockerfile scripts
```

Use the normal `run_agent_evaluation.py ... --execute` command on Windows with
Docker running and an existing Codex login. No plugin, project or host skill
configuration is loaded by model contexts. `--container-image` explicitly
selects a different local image or selects Docker on another platform; the
runner binds its immutable image ID before dispatch and checks required Codex
features. It never pulls an image or changes a login during evaluation.
`--codex-auth-file` can select an existing login file; credentials never enter
packets or receipts. Only the normal authenticated model API receives them.

Containers have a read-only root, dropped capabilities, no new privileges,
limited processes/memory and private temporary storage. Every timeout or error
removes only that invocation's uniquely named container. A cleanup failure is
BLOCKED and identifies the container for inspection. Exit 3 means unavailable
execution or timeout; exit 2 remains invalid contracts or a completed non-pass.
Docker mount isolation is not a claim that macOS sandbox-exec ran on Windows.

A mechanically ineligible target stops before any judge dispatch. Its raw and
finalized responses, mechanical findings, subject manifest, builder design and
phase logs are preserved in the controller directory. The receipt remains
INVALID with semantic_status NOT_RUN; preserved evidence never promotes failure
to acceptance. Corrected fixtures require a versioned suite and a fresh run.
