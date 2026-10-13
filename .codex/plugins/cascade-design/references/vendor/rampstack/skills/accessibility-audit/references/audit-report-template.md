> Local governing process: [Design index](../../../../../README.md), [one brief](../../../../../process/intake.md) and [evidence/authority](../../../../../process/review-and-evidence.md). Full [license](../../../../../licenses/rampstack/LICENSE) retained. This is adapted reference knowledge under the current accepted target/task and host permissions; it is not a new skill, agent or external runtime.

> Local adaptation - Cascade Codex, 2026-10-07. Original: rampstackco/claude-skills@482c9bf74697fc1e311bd4dca5ce301f046c4b76, skills/accessibility-audit/references/audit-report-template.md; SHA256 0ed3d29c53a7f25ad2a72f5918181fd7f7e871d3253e3c66816baac425e09b87. License: [retained MIT notice](../../../../../licenses/rampstack/LICENSE). This file is modified: foreign discovery/controller/artifact/tool/effect assumptions and the recorded incompatibilities are replaced below. Complete compatible topic text/examples are retained; excluded sections remain in immutable source audit evidence.
>
> Parent authority: Create Design owns intake, inquiry/direction/decision and prototype; Product owns truth/behavior, design-system owns reusable rules, accessibility/visual owners review evidence, and Frontend/host owns production, persistence, permissions and execution. Consult [the local governing phase](../../../../../process/review-and-evidence.md); this reference is progressively loaded for the actual task/platform, not another trigger or installation. Examples/dates/counts/styles are illustrative unless bound to actual evidence. External URLs are provenance/reference identities; operative steps are local, and no fetch, outreach, install, listener, publish or API call is implied.

# Accessibility Audit Report Template

A fillable accessibility audit template. Customize the level (AA, AAA, EN 301 549) and scope (page, component, site) per project.

---

## Audit metadata

**Audited:** [URL or component name]
**Date:** [YYYY-MM-DD]
**Auditor:** [Name]
**Actual target:** [governing version/level and source; local review default WCAG 2.2 AA]. Other standards require their actual edition/scope; this template does not establish legal compliance.
**Scope:** [What was and was not tested]
**Methodology:** [Tools used, manual tests performed]

---

## Executive summary

[2 to 3 paragraph overview. The state of accessibility, the most important issues, the recommended path forward.]

**Issue counts:**

| Severity | Count |
|---|---|
| Critical | |
| Major | |
| Minor | |
| **Total** | |

**Top 3 priorities:**

1. [Priority]
2. [Priority]
3. [Priority]

---

## Tools and methods used

**Automated:**
- [ ] axe DevTools
- [ ] Lighthouse accessibility audit
- [ ] WAVE
- [ ] Pa11y (or other CI tool)

**Manual:**
- [ ] Keyboard-only navigation
- [ ] Screen reader: [NVDA / JAWS / VoiceOver / TalkBack]
- [ ] 200% zoom
- [ ] Mobile reflow at 320px width
- [ ] Color blindness simulation
- [ ] Windows High Contrast (or browser equivalent)
- [ ] Reduced motion preference

---

## Critical findings

Findings that block usage for some users. Must be fixed before sign-off.

### Critical 1: [Issue name]

- **WCAG criterion:** [e.g., 2.1.1 Keyboard]
- **Severity:** Critical
- **Affected users:** [Keyboard / screen reader / low vision / etc.]
- **Reproduction steps:**
  1. [Step]
  2. [Step]
  3. [Step]
- **Expected:** [What should happen]
- **Actual:** [What does happen]
- **Recommended fix:** [Specific solution]
- **Estimated effort:** [Hours / days]
- **Owner:** [Team or person]

### Critical 2: [Issue name]

[Same structure]

---

## Major findings

Findings that significantly degrade experience. Should be fixed before broad launch.

### Major 1: [Issue name]

[Same structure as critical]

### Major 2: [Issue name]

[Same structure]

---

## Minor findings

Findings that add friction without blocking. Tracked and addressed in normal iteration.

### Minor 1: [Issue name]

[Brief structure]

- **WCAG criterion:**
- **Issue:**
- **Recommended fix:**

---

## Base criterion evidence plus local WCAG 2.2 extension

For full audits, score each criterion. For partial audits, score only those in scope.

### 1. Perceivable

| Criterion | Pass / Fail / N/A | Notes |
|---|---|---|
| 1.1.1 Non-text content | | |
| 1.2.1 Audio-only and video-only | | |
| 1.2.2 Captions (prerecorded) | | |
| 1.2.3 Audio description or media alternative | | |
| 1.2.4 Captions (live) | | |
| 1.2.5 Audio description (prerecorded) | | |
| 1.3.1 Info and relationships | | |
| 1.3.2 Meaningful sequence | | |
| 1.3.3 Sensory characteristics | | |
| 1.3.4 Orientation | | |
| 1.3.5 Identify input purpose | | |
| 1.4.1 Use of color | | |
| 1.4.2 Audio control | | |
| 1.4.3 Contrast (minimum) | | |
| 1.4.4 Resize text | | |
| 1.4.5 Images of text | | |
| 1.4.10 Reflow | | |
| 1.4.11 Non-text contrast | | |
| 1.4.12 Text spacing | | |
| 1.4.13 Content on hover or focus | | |

### 2. Operable

| Criterion | Pass / Fail / N/A | Notes |
|---|---|---|
| 2.1.1 Keyboard | | |
| 2.1.2 No keyboard trap | | |
| 2.1.4 Character key shortcuts | | |
| 2.2.1 Timing adjustable | | |
| 2.2.2 Pause, stop, hide | | |
| 2.3.1 Three flashes or below threshold | | |
| 2.4.1 Bypass blocks | | |
| 2.4.2 Page titled | | |
| 2.4.3 Focus order | | |
| 2.4.4 Link purpose (in context) | | |
| 2.4.5 Multiple ways | | |
| 2.4.6 Headings and labels | | |
| 2.4.7 Focus visible | | |
| 2.5.1 Pointer gestures | | |
| 2.5.2 Pointer cancellation | | |
| 2.5.3 Label in name | | |
| 2.5.4 Motion actuation | | |

### 3. Understandable

| Criterion | Pass / Fail / N/A | Notes |
|---|---|---|
| 3.1.1 Language of page | | |
| 3.1.2 Language of parts | | |
| 3.2.1 On focus | | |
| 3.2.2 On input | | |
| 3.2.3 Consistent navigation | | |
| 3.2.4 Consistent identification | | |
| 3.3.1 Error identification | | |
| 3.3.2 Labels or instructions | | |
| 3.3.3 Error suggestion | | |
| 3.3.4 Error prevention (legal, financial, data) | | |

### 4. Robust

| Criterion | Pass / Fail / N/A | Notes |
|---|---|---|
| 4.1.1 Parsing | | |
| 4.1.2 Name, role, value | | |
| 4.1.3 Status messages | | |

---

## Remediation roadmap

Sequenced by severity and dependency.

### Phase 1: Critical fixes (target: [date])

- [ ] [Critical 1]
- [ ] [Critical 2]

### Phase 2: Major fixes (target: [date])

- [ ] [Major 1]
- [ ] [Major 2]

### Phase 3: Minor fixes (target: [date])

- [ ] [Minor 1]
- [ ] [Minor 2]

### Phase 4: Process improvements

- [ ] Add automated a11y checks to CI
- [ ] Establish a11y review in PR process
- [ ] Train design and engineering teams on common failures
- [ ] Set up regular re-audit schedule

---

## Re-audit schedule

- **Verify critical fixes:** [Date, typically 1 to 2 weeks post-remediation]
- **Verify major fixes:** [Date, typically 4 weeks]
- **Full re-audit:** [Date, typically 6 to 12 months]
- **Trigger-based re-audit:** Significant design system updates, major feature launches

---

## Sign-off

Critical fixes verified by: [Name and date]
Major fixes verified by: [Name and date]
Final approval: [Name and date]

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
