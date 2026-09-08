# Interim responses through Composer and Voice Composer

Contract: `interim-responses@1`; optional reference profile, 2026-09-08.
Extends [state and projection](state-delta-policy-projection.md) and
[ordered role context](iterative-context-caching.md). This specifies an optional
status path, with executable text-view fixtures, not a production scheduler.

## Purpose and authority

An interim message acknowledges a wait without answering the substantive question,
closing the turn, resolving a choice or claiming an action completed. Use the
existing `ComposerContext.purpose: status-update`; do not add a competing final
answer or a new StateDelta operation. The response's status purpose is resolved
through its bound context/receipt, not inferred from the words it contains.

Default to one brief, policy-approved phrase per root checkpoint while blocking
work remains pending. The target profile sets a delay threshold, expiry and
language/length limits. Do not emit on every role transition or retry. More
progress updates require a separately admitted meaningful change and a finite
budget. If the main answer is ready before the threshold, send it directly.

```text
accepted input / recorded timer
  -> Policy Engine evaluates interim-response policy against current work
  -> admitted status intent under the existing checkpoint
  -> role projection -> optional Composer -> response gate -> committed status
  -> text delivery and/or Voice Composer -> delivery receipts

pending substantive work continues -> normal Composer -> committed main response
```

Analyzer may propose acknowledgement preferences or waiting-related observations
through registered `change_policy_data` slots, alongside other policy deltas.
Those proposals do not prove work started, create delivery authority, or trigger
a message directly. Runtime work receipts and recorded timers determine actual
eligibility. The Process Manager owns scheduling; projection alone never dispatches.

## Two paths, one response gate

1. **Composer path:** project a status task and approved localized phrases.
   Composer selects one exact phrase; the response gate rejects additions or
   unsupported claims. This bounded default adds no novel domain reasoning.
   A richer progress summary is a separate profile requiring admitted work facts
   and its own semantic validation.
2. **Fixed-text path:** runtime selects an approved localized phrase under policy,
   validates and commits the status message, then sends it to text delivery or
   directly to Voice Composer. No Composer model call is needed. This is the
   existing narrow fixed-acknowledgement exception; Voice still does not invent
   message meaning or receive raw Analyzer proposals.

Both paths bind the committed status to its actual policy/context receipt. A
fixed-text path must not fabricate a Composer invocation. Voice receives a
`VoiceContext` for the committed status using the existing response reference,
digest, revision and epoch fields. The subsequent main answer uses its own
response identity; it does not silently overwrite the status message's text.

## Policy data, state and role projections

| Owner/part | Content | Model projection |
| --- | --- | --- |
| Policy definition | Enablement, threshold, maximum messages, approved phrase registry, channels, expiry, completion priority | Stable role catalog explains status mode and fixed-phrase rule |
| Policy data | Accepted user preference for updates, requested language/channel and relevant waiting cues with evidence | Only effects needed for the selected role; no raw policy records |
| Runtime state | Actual pending work, status intent, sent count, current input generation, response readiness, delivery attempts | Omit bookkeeping; never let Analyzer claim these facts by writing a policy slot |
| Composer | Status purpose, allowed phrases and required language | Compact current text blocks; no full history, search snippets or plan |
| Voice Composer | Exact committed status text, language and allowed pace | Compact delivery blocks; no pending task reasoning or mutable domain state |

Keep dedupe identity, threshold/expiry timestamps, checkpoint/dependency revisions,
policy bindings and delivery epoch in the private manifest. Derive this status
work from the existing checkpoint group and response/delivery records; no new
mutable TurnState store is required. An intent may have an independent delivery
lifecycle without becoming a second conversation turn.

Illustrative Composer data:

```text
[Response task]
Purpose — "Проміжне повідомлення очікування"

[Approved messages]
• "Мені потрібно ще трохи часу."

[Response guidance]
Language — "Українська"
```

Voice data after the gate:

```text
[Text to speak]
"Мені потрібно ще трохи часу."

[Delivery]
Language — "Українська"
Pace — "unhurried"
```

The fixed phrase has no claim about searching, saving, success or a promised
completion time. A phrase such as "Шукаю в базі знань" requires an actual running
search receipt and a different approved policy case; an admitted but queued job
is insufficient. Expose no private task details solely to fill a silence.

## Races, delivery and continuity

- Recheck eligibility before generation, response commit and delivery start.
  Main-response readiness, cancellation, relevant new input, expiry, disabled
  channel or invalidated policy/context suppresses stale interim work.
- Commit/claim the status intent atomically with a checkpoint-scoped dedupe key.
  Competing timers and retries cannot claim another copy. Text and voice may
  deliver the same status identity if both channels are selected; track each
  channel separately. Uncertain delivery is not permission for a blind resend.
- If the main answer becomes ready while status is queued, drop the queued status.
  If speech already began, let only a still-valid bounded phrase finish or stop it
  according to the delivery policy, then speak the main answer. Never overlap two
  streams. User barge-in stops playback immediately and advances the epoch.
- Status failure is nonblocking: continue substantive work. Cancel late Composer
  results and old-epoch audio instead of delaying the main answer for another try.
  Successful status delivery cannot satisfy the main-response completion oracle.
- Retain delivered status in the transcript when needed to represent what the
  user saw/heard. Keep it attributed and marked as status in the continuity
  projection. Do not extract it as a user claim, research evidence, completed
  action, substantive answer or durable memory. An open turn stays in the
  changing context suffix; no status creates a new root turn.

## Prompt caching and validation

Keep the status-mode instruction in the same approved role profile used for main
answers. Put selected purpose/phrase in current data, after the stable prefix;
omit history by default. Mode changes need not rewrite the catalog. Reuse remains
subject to the projection/access rules in [iterative caching](iterative-context-caching.md).

[Worked views](../assets/interim-prompt-views.example.json) and the existing
transport tests verify Composer/Voice text rendering, prompt ordering, metadata
exclusion and shared static prefixes. They do not validate policy admission.
Target gates remain `NOT_RUN`: threshold/no-op, duplicate timer/retry, final-ready
race, cancellation/expiry/revocation, channel choice, exact-phrase output gate,
text/voice receipt dedupe, playback interruption and nonblocking failure.
