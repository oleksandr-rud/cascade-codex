> Local governing process: [Design index](../../../../../../README.md), [one brief](../../../../../../process/intake.md) and [evidence/authority](../../../../../../process/review-and-evidence.md). Full [license](../../../../../../licenses/ui-design/LICENSE) retained. This is adapted reference knowledge under the current accepted target/task and host permissions; it is not a new skill, agent or external runtime.

> Local adaptation - Cascade Codex, 2026-10-07. Original: wshobson/agents@46891e7e60da0e52baf1050b7b6391b64e84c6d9, plugins/ui-design/skills/accessibility-compliance/SKILL.md; SHA256 3ad0fbcb0a69b69e70652641a8eeb59f168cceb4bc9d9b9c8b47154072b9e1a2. License: [retained MIT notice](../../../../../../licenses/ui-design/LICENSE). This file is modified: foreign discovery/controller/artifact/tool/effect assumptions and the recorded incompatibilities are replaced below. Complete compatible topic text/examples are retained; excluded sections remain in immutable source audit evidence.
>
> Parent authority: Create Design owns intake, inquiry/direction/decision and prototype; Product owns truth/behavior, design-system owns reusable rules, accessibility/visual owners review evidence, and Frontend/host owns production, persistence, permissions and execution. Consult [the local governing phase](../../../../../../process/direction.md); this reference is progressively loaded for the actual task/platform, not another trigger or installation. Examples/dates/counts/styles are illustrative unless bound to actual evidence. External URLs are provenance/reference identities; operative steps are local, and no fetch, outreach, install, listener, publish or API call is implied.

# Accessibility Compliance

Master accessibility implementation to create inclusive experiences that work for everyone, including users with disabilities.

## When to Use This Skill

- Implementing WCAG 2.2 Level AA or AAA compliance
- Building screen reader accessible interfaces
- Adding keyboard navigation to interactive components
- Implementing focus management and focus trapping
- Creating accessible forms with proper labeling
- Supporting reduced motion and high contrast preferences
- Building mobile accessibility features (iOS VoiceOver, Android TalkBack)
- Conducting accessibility audits and fixing violations

## Detailed patterns and worked examples

Detailed pattern documentation lives in [local reference](references/details.md). Read that file when the navigation tier above is insufficient.

## Best Practices

1. **Use Semantic HTML**: Prefer native elements over ARIA when possible
2. **Test with Real Users**: Include people with disabilities in user testing
3. **Keyboard First**: Design interactions to work without a mouse
4. **Don't Disable Focus Styles**: Style them, don't remove them
5. **Provide Text Alternatives**: All non-text content needs descriptions
6. **Support Zoom**: Content should work at 200% zoom
7. **Announce Changes**: Use live regions for dynamic content
8. **Respect Preferences**: Honor prefers-reduced-motion and prefers-contrast

## Common Issues

- **Missing alt text**: Images without descriptions
- **Poor color contrast**: Text hard to read against background
- **Keyboard traps**: Focus stuck in component
- **Missing labels**: Form inputs without associated labels
- **Auto-playing media**: Content that plays without user initiation
- **Inaccessible custom controls**: Recreating native functionality poorly
- **Missing skip links**: No way to bypass repetitive content
- **Focus order issues**: Tab order doesn't match visual order

## Testing Tools

- **Automated**: axe DevTools, WAVE, Lighthouse
- **Manual**: VoiceOver (macOS/iOS), NVDA/JAWS (Windows), TalkBack (Android)
- **Simulators**: NoCoffee (vision), Silktide (various disabilities)

## Local WCAG 2.2 applicability and evidence extension

Record actual target version/level, platform, surfaces/states and source revision. This reference is a review menu; conformance requires all applicable target criteria and actual evidence, not a short list or score.

- Focus not obscured (2.4.11 AA): inspect focus with actual sticky headers, drawers, overlays and task states. A visible focus ring alone does not establish visibility of the focused control.
- Dragging movements (2.5.7 AA): provide a supported single-pointer alternative where the criterion applies, plus the keyboard operation required by the task. Test the real interaction; a viewport screenshot cannot prove it.
- Target size minimum (2.5.8 AA): web targets are at least 24×24 CSS px or have a documented spacing, equivalent-control, inline, user-agent or essential exception. Native iOS pt/Android dp conventions are separate and follow the actual platform; do not call a generic 44px rule universal web AA.
- Consistent help (3.2.6 A): check the actual repeated help mechanisms' relative order when relevant.
- Redundant entry (3.3.7 A): do not require re-entry of previously supplied information in the same process without an applicable reason; test actual preservation and supported selection/defaults.
- Accessible authentication (3.3.8 AA): when authentication is in scope, inspect cognitive-test requirements, alternatives and supported assistive mechanisms. Do not introduce authentication merely to exercise this check.
- Normal text contrast AA is 4.5:1; large text at least 18pt regular/14pt bold (24/about 18.667 CSS px) is 3:1. Enhanced AAA text is 7:1 normal/4.5:1 large. Document applicable exceptions and actual computed/rendered state evidence. Non-text contrast has its own applicable criterion.
- Text spacing/reflow checks exercise increased spacing and content ranges; they do not mandate a default letter-spacing value. Native controls, semantic names/roles/states and keyboard/focus/recovery are tested in the actual environment.

For every selected check record applicability, actual method/tool/environment, expected source, observation, finding and status. Unsupported tools, keyboard/AT or real-user checks remain NOT_RUN/GAP/BLOCKED as appropriate. Automated DOM tests, disabled simulations and AI personas do not certify accessibility or observed user success. Use the existing accessibility-review owner and the local review/evidence procedure.
