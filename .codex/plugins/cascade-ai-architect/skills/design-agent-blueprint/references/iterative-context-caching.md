# Ordered role requests and iterative context caching

Status: reference implementation and target-adapter contract, 2026-09-08.
Owner: [event projections and model text](event-projections-and-context-format.md).
Cascade Prompt owns production prompt wording; this document defines assembly.
Every cached state/history/policy view is part of a role- and task-specific slice
issued by Policy Engine and admission. Cache lookup cannot issue a slice or widen
its scope. Bind task/step/purpose and source/authorization dependencies in the
private cache manifest; authorize each reuse, including cached history. Identical
authorized prompt bytes may still share a provider prefix without printing those
bindings. The compiler formats the issued slice and never reloads missing state.

## Request order for every role

```text
system       Shared mission, identity and trust boundaries
developer    Role instructions
             Approved policy descriptions and output contract
             <static prefix boundary; not model-visible text>
user/data    Optional approved summary snapshot
user/data    Completed conversation block
user/data    Next completed conversation block
             <history boundary; not model-visible text>
user/data    Current role projection, applicable policy effects and input
```

Instructions and policy descriptions follow the system prompt. Only registered,
trusted instructions enter the developer message. User preferences, policy data,
retrieved text and transcript excerpts remain data, even when phrased as commands.
History labels describe original speakers; excerpts are not replayed as this
role's own assistant messages. This avoids treating an old Composer answer as an
Analyzer delta or Researcher result. Provider adapters may map data containers to
their supported format while preserving order and authority.

| Role | Instructions and policy catalog after system | Optional reusable conversation data | Current projection after history |
| --- | --- | --- | --- |
| Analyzer | Propose changes only; JSON output contract; permitted policy slots, evidence and candidate rules | Relevant completed messages and admitted recent-memory snapshot | Current input, evidence handles, known slot values, conflicts, background and applicable obligations |
| Composer | Produce the canonical answer; response and identity disclosure rules | Selected messages, task memory and relevant reminders | Accepted facts, current response task, tone/format effects, next steps and required confirmations |
| Researcher | Answer only an admitted research request; source and citation rules | Only excerpts needed to resolve the research question; omitted by default | Question, resolved references, search constraints, allowed sources and budget |
| Voice Composer | Present the authorized canonical answer; delivery and pronunciation rules | Only necessary delivery context; general conversation omitted by default | Canonical text, permitted presentation choices and interruption/resume guidance |

Identity rules can be stable; selected biographical facts or permission to disclose
them belong to each role's authorized projection. A changed identity/profile is
a deliberate prefix change. Do not move current identity questions into the
static prefix. Policy Engine and Context Compiler are deterministic components;
they have configuration and typed inputs, not invented LLM system prompts.

The four [semantic view fixtures](../assets/model-prompt-views.example.json),
saved role catalog/context text files, and
[assembly tests](../scripts/context_transport.test.mjs) specify all four roles.
The fixtures demonstrate structure, not production prompt/model quality.
For short messages while work is pending, the optional
[interim response profile](interim-responses.md) shares the same role prefix and
projects the status purpose/approved phrase into current data. Queued or open-turn
status updates never become immutable history merely to improve cache reuse.

## State and policy projections before cache reuse

```text
Analyzer multi-policy delta
  -> Policy Engine validates/selects and commits accepted changes
  -> committed state + policy definitions + policy data
  -> role read projection, resolved references, access and freshness checks
  -> catalogView + historyViews + modelView + private runtimeManifest
  -> text assembly -> adapter cache eligibility -> role invocation
```

Retain the [state/policy contract](state-delta-policy-projection.md): definitions
describe allowed behavior, while policy data holds accepted values and evidence.
Analyzer cannot rewrite definitions through policy-data updates. Build a role
projection against one consistent accepted snapshot/dependency set. If updates to
several policies commit atomically, no context may mix before/after values from
that commit. A lagging required projection must catch up or take the documented
context-gap path before invocation; a cached view cannot bypass this gate.

| Projected part | Selection and text | Change/reuse consequence |
| --- | --- | --- |
| Policy definitions/catalog | Approved role profile: relevant descriptions, slot meaning, allowed operations and output rules | Changed rule/profile rebuilds catalog text; different prefix invalidates downstream prefix candidates |
| State and policy data | Relevant accepted values, uncertainty, constraints and effective next steps; combine duplicate facts without losing ownership/evidence | Changed visible values rebuild current `modelView`; stable history candidates survive if their dependencies remain valid |
| History and memory | Authorized messages, summary coverage and relevant reminders for this role | Append, invalidate or re-project according to coverage and source changes; never reuse solely because a checkpoint ID matches |
| Runtime bindings | Checkpoint, revisions, source dependencies, access scope and policy/profile versions | Bind privately; a metadata-only revision can retain identical text after dependency and authorization checks |

For example, accepted changes to a preferred name and response style can project
to this Composer data, without exposing the two policy records or state envelope:

```text
[Known facts]
Preferred name — "Олена"

[Response guidance]
Tone — "Спокійний, без необґрунтованих запевнень"
Format — "Один крок за раз"
```

The Composer receives relevant effects of both policies. The Analyzer may also
need their permitted targets and evidence handles; Researcher receives neither
name nor tone unless its task needs them. Voice receives only authorized delivery
effects, never authority to change the canonical meaning. When a policy's data is
irrelevant to a role, its update need not change that role's text; dependency and
authorization bindings still advance as required outside model messages.

## Shared policy and catalog blocks

Store each common approved policy/schema/catalog fragment once and render it with
stable object labels, schema field order and whitespace. Several role profiles
may reference the same fragment when each is authorized to receive identical
content. A role-specific subset is a distinct rendered view; do not include unused
or forbidden policy fields merely to increase prefix overlap.

Separate stable schema/rule descriptions from changing policy/state values:

```text
system -> stable role instructions -> approved common blocks -> role-only blocks
       -> authorized stable history -> current selected values and task input
```

Use two distinct reuse boundaries:

- Local rendered-block cache: reuse identical approved fragments without rendering
  again. Bind the selected schema/content digest, renderer version, locale and
  applicable disclosure scope. Definition blocks can be shared across authorized
  roles/tasks; private value blocks retain their data scope. Keep per-invocation
  admission/dependency bindings separately and recheck them on every reuse.
- Provider prompt cache: reuse depends on the exact eligible preceding prefix and
  the provider/model's supported cache configuration. A matching policy block
  after different role instructions does not establish a matching full prefix.
  Preserve system -> role instructions -> policy descriptions order. Expect reuse
  primarily within the same stable role profile; cross-role local block reuse is
  useful even when provider prefixes diverge. A shared cache key cannot make
  different text match or grant access.

Changing current values leaves approved schema/catalog bytes unchanged. Changing
a definition or selected schema invalidates the affected block and dependent
compiled views; provider prefix reuse ends at the first changed content. Revoked
access prevents reuse even when bytes are unchanged. Do not add checkpoint IDs or
timestamps to block text. This specifies cache eligibility, not guaranteed hits
or measured savings. The provider prefix condition follows the
[OpenAI prompt caching guide](https://developers.openai.com/api/docs/guides/prompt-caching).

## Reference implementation

The [schema/value engine](executable-projections.md) wires issuance to this
assembler and implements a bounded local LRU for approved rendered blocks.
Production integration calls `engine.issue` and `engine.assemble` with current
host admission and a target tokenizer. It does not interpret logical
`ProjectionPolicy` selector strings or implement a provider cache. The lower-level
helpers below remain useful for already-issued fixture views and adapters.

`assembleContext` accepts the existing `systemPrompt`, `instructions`,
`catalogView`, `modelView`, `runtimeManifest`, plus optional ordered `historyViews`.
Every history item uses the same explicit semantic `sections` contract as the
current view. The Policy Engine supplies already selected, authorized content.
The renderer does not fetch, summarize, freeze, admit or retain history.

With no history, the existing three-message request is unchanged. With history,
the assembler inserts its rendered data messages between developer instructions
and current data. `data` still means the current projection; `messages` is the
complete request. Do not send only `data` or the diagnostic `prefix` string.

The private manifest includes `cache_candidates`: zero-based message-end indices
and cumulative digests of the ordered message prefix, after the catalog and each
history block. No candidate includes the current mutable suffix. A digest detects
local content/order changes; it is neither a provider cache key nor an actual cache
entry. It excludes provider settings and is not a cross-language canonical hash.
The adapter binds model, tools, settings, isolation scope and format versions too.
The legacy `cache_boundary: after-prefix` identifies the static boundary; the
manifest candidates additionally expose possible history boundaries.

The adapter chooses supported breakpoints from these candidates, within provider
limits and token eligibility. Keeping the previous history frontier eligible can
help reuse it when another block is appended. Do not emit every candidate blindly.
Metadata, checkpoint IDs, cache keys and compaction generations never become
model text. This helper implements assembly and candidate identification only;
it does not implement a provider cache or a conversation database.
The offline implementation bounds UTF-8 source strings, rendered views and the
serialized message array to 1 MiB, with its existing depth/node ceilings. It
rejects excess input rather than truncating it. The target must separately count
actual model tokens and apply its role/task budget. Cumulative prefix hashing
processes each message once while preserving the ordered JSON-prefix digest;
the cap and hashing strategy are resource safeguards, not a token-cost benchmark.

## Iteration and compaction rules

Use immutable completed blocks within a selected history generation:

```text
Request A: system + instructions/policies | summary | H1      | current A
Request B: system + instructions/policies | summary | H1 | H2 | current B
Request C: system + instructions/policies | new summary | H3 | current C
```

The first two requests share content through H1. A compaction replacing the
summary changes the prefix after instructions/policies. Unchanged later blocks
cannot independently recover that earlier prefix match.

1. Derive history from completed root user checkpoints and their relevant child
   results. Retries are attempts, not extra turns. Keep source bindings, coverage,
   dependencies and generation in the checkpoint/runtime manifest, with no new
   mutable TurnState store. These are projections, not additional canonical facts.
2. Append a block only after its selected content is committed and stable. Keep
   the open turn and current message solely in the suffix. A canonical answer
   is not proof it was heard: project delivered text only when supported by the
   delivery record. Unresolved voice delivery stays current data.
3. Preserve existing block bytes, order, labels and message boundaries while their
   content remains valid. Avoid renumbering turns or changing a total-count header
   before old blocks. Short source handles must retain the same meaning within
   the active projection generation.
4. Keep recent-window memory, task memory and durable memory distinct. A recent
   summary may precede history only while its coverage/content is unchanged.
   If a summary must change every turn, place it in the current suffix. Never
   duplicate the same messages/facts in summary, history and current projection
   without a semantic need. Preserve exact literals where summaries are inadequate.
5. Enforce the role's history policy and token budget before assembly. A maximum
   of 20 root turns is a ceiling, not a minimum or a reason to share irrelevant
   conversation with Researcher or Voice. Sliding eviction changes the first
   retained-history block. If allowed, compact into a smaller window at a boundary
   to permit subsequent appends; never exceed an explicit 20-turn requirement to
   preserve a cache hit. Covered older facts may survive only under memory policy.
6. Corrections, deletion, revoked access, stale evidence or changed policy take
   precedence over reuse. Re-project from the earliest affected block and discard
   invalid compiled-cache entries. Do not retain forbidden text plus a correction
   merely to keep a prefix. Request omission is not proof of provider-side deletion;
   bind provider retention/deletion requirements in the target adapter.
7. On a valid semantic no-op, retain the previous compiled blocks and memory.
   On compaction, record the new coverage/dependencies privately and build a new
   generation. Revalidate access/freshness even when compiled bytes are reusable.

## Three separate mechanisms

| Mechanism | What it saves | Required boundary |
| --- | --- | --- |
| Local compiled-projection cache | Rendering/retrieval work for unchanged authorized projections | Key by role/profile, source dependencies and scope; invalidate on semantic or access changes |
| Provider prompt cache | Reprocessing an eligible repeated request prefix | Identical eligible provider input prefix and compatible settings; measured usage |
| Conversation persistence | Application management of previous messages | Explicit history selection and retention; persistence alone proves no cache saving |

OpenAI's documentation describes prefix matching, appending history, and reduced
reuse after compaction. Breakpoint support and eligibility depend on the model.
Use an adapter capability profile rather than a universal cache threshold or TTL.
Source checked 2026-09-08:
[Prompt caching](https://developers.openai.com/api/docs/guides/prompt-caching).

Target validation must compare cold/warm requests, appended turns, changing current
state, changed catalog, corrected memory, window eviction and scope revocation.
Measure input/cached/write tokens where available, realized cost and latency;
check response correctness after history/summary changes. Local prefix equality
proves assembly stability only. Provider caching, live semantic quality and
production storage/invalidation integration remain `NOT_RUN` in this reference.
