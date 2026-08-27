# Design System Checklist

- [ ] Rule type, source identity, decision owner, and reuse evidence are explicit.
- [ ] One isolated preference is not promoted into a reusable rule.
- [ ] The rule is observable and names user-visible effect, non-goals, states, responsive constraints, accessibility, and evidence.
- [ ] Tokens define semantic purpose, values, modes/themes, consumers, constraints, and migration impact.
- [ ] Components define anatomy, variants, content, loading/empty/error/disabled and interaction states, responsive behavior, accessibility, tokens, and checks.
- [ ] Product, persona, feature UX, accessibility, visual, prompt, evaluation, and implementation ownership remain distinct.
- [ ] Every handoff input is current evidence for the next owner, never the missing artifact that owner must produce; missing artifacts are excluded from source-of-truth IDs.
- [ ] Accessibility, visual, or functional review that requires implementation is explicitly gated on the host implementation output and names the returned diff/render/executable artifacts it will consume.
- [ ] The target repository's design owner and sibling-impact route are named without mutating them automatically.
- [ ] Sensitive evidence is excluded.
