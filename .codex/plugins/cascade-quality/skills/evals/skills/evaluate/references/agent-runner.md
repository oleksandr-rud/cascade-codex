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
Transport v2 retains each completed or partial provider stream, request, schema
and raw output under private `transports/`, including blocked and timed-out
attempts. These transport files are outside every model phase mount. Monotonic
phase time includes Docker creation, inspection and attach; cleanup is timed
separately and reported in the total. Server queue and inference time are not
separable from this host observation.
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
target context, together with the bound `specs/architecture.md` when present.
Independent judges receive the exact same sanitized subject context as reference
evidence, not judge instructions. They distinguish subject-defined defaults from
case-specific inputs; source-grounding checks cannot be restricted to fixtures.
This shared reference does not include sealed labels, thresholds, builder findings
or peer judgments. Manifest-bound dependency aliases, plugin versions, paths, and
digests are also visible so typed cross-plugin receipts can bind exact runtime
identities; dependency source bytes remain unavailable. Validators and other supporting scripts remain mechanically
digest-bound unless separately declared operative. When a visible fixture
needs additional runtime prompts, role definitions, linked references or format
rules, mark those exact `subject_assets` entries with `inline_context: true`.
Their UTF-8 bytes then reach both target and judges. The declaration contributes
to the aggregate subject digest; regenerate it after changing context exposure.
Only literal `true` is accepted when this optional field is present. Unmarked
support assets retain their previous behavior. Declaring a file in the manifest
alone does not mean the model read it, and inline role text does not establish
native agent loading. Never mark evaluation cases, oracles or judge instructions
as subject context. When a visible fixture
declares `output_contract.response_encoding=json`, the target must serialize
one schema-conforming compact JSON object into its string-valued response field
instead of returning a prose summary or Markdown fence.
The output root and subject source must be disjoint, and the output root must
not already exist. Omitting `--execute` is a binding preflight-only `NOT_RUN`;
it is not evaluation evidence.

## Windows / local Docker setup

Build the declared Codex runtime once from the installed Cascade Evals root:

```powershell
docker build -t cascade-evals-codex:0.160.0 -f scripts/codex-isolation.Dockerfile scripts
```

Use the normal `run_agent_evaluation.py ... --execute` command on Windows with
Docker running and an existing Codex login. No plugin, project or host skill
configuration is loaded by model contexts. `--container-image` explicitly
selects a different local image or selects Docker on another platform; the
runner binds its immutable image ID before dispatch and checks required Codex
features and the exact CLI version from `references/runtime-policy.json`.
It never pulls an image or changes a login during evaluation.
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

If a judge raises a handled execution, timeout or contract error, all dispatched
judge contexts finish cleanup before controller data is persisted. Preserve the
builder, raw/finalized target, mechanical evidence, available completed logs and
any completed peer judgment as incomplete diagnostic evidence. The receipt is
INVALID (or BLOCKED for unavailable execution/timeout) with semantic_status
INCOMPLETE, never a reduced score. Missing failed-process output remains missing;
the successful peer alone cannot satisfy independent acceptance. A forced host
process termination is outside this handled-error recovery guarantee. If container
cleanup fails or cannot be confirmed, preserve the missing-cleanup block rather
than materializing controller or peer evidence while a model may remain active;
the identified container requires inspection before retrying.

New runs bind `scripts/normalize_judge_ratings.py`, the ratings-only
`skills/build-judge/references/judge-ratings-v2.schema.json` and runtime policy
as dependencies. Judges emit ratings and leakage status only; the controller
binds identity and computes acceptance from its private profile. Retain the
raw v2 response, complete reducer response and normalization receipt. Reprepare
a new manifest when adopting this protocol. Do not rewrite old frozen bundles
or normalize a legacy contradictory model verdict into an accepted result.

For a separately frozen multistep adapter, `scripts/scoped_context.py` provides
`project_context` and `validate_handoffs`. An active model proposes exact source
paths and predecessor IDs; the host supplies its frozen source/owner manifests
and validated artifacts, checks hashes and budgets, and preserves the full
trace outside the next model context. A projection never silently truncates or
selects meaning from keywords. Limit selected sources to already authorized
reads; selecting context must not bypass the adapter's read budget.

Declare required prepared handoff edges in the accepted task contract before
execution. Check the producer, exact consumer capability, owner source digest,
artifact, input IDs and authority. An unavailable owner is GAP; an ordinary
task with no required edge remains NOT_APPLICABLE. A typed prepared interface
receipt does not show that an owner executed, that an artifact is semantically
eligible, or that permission was granted. Evaluate those claims independently.
