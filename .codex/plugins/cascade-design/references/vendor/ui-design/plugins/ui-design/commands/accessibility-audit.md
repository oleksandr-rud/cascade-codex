> Local governing process: [Design index](../../../../../README.md), [one brief](../../../../../process/intake.md) and [evidence/authority](../../../../../process/review-and-evidence.md). Full [license](../../../../../licenses/ui-design/LICENSE) retained. This is adapted reference knowledge under the current accepted target/task and host permissions; it is not a new skill, agent or external runtime.

> Local adaptation - Cascade Codex, 2026-10-07. Original: wshobson/agents@46891e7e60da0e52baf1050b7b6391b64e84c6d9, plugins/ui-design/commands/accessibility-audit.md; SHA256 42e2c75de425af140676de4855d4eb99a29865624937e49af8e7a10ded541995. License: [retained MIT notice](../../../../../licenses/ui-design/LICENSE). This file is modified: foreign discovery/controller/artifact/tool/effect assumptions and the recorded incompatibilities are replaced below. Complete compatible topic text/examples are retained; excluded sections remain in immutable source audit evidence.
>
> Parent authority: Create Design owns intake, inquiry/direction/decision and prototype; Product owns truth/behavior, design-system owns reusable rules, accessibility/visual owners review evidence, and Frontend/host owns production, persistence, permissions and execution. Consult [the local governing phase](../../../../../process/review-and-evidence.md); this reference is progressively loaded for the actual task/platform, not another trigger or installation. Examples/dates/counts/styles are illustrative unless bound to actual evidence. External URLs are provenance/reference identities; operative steps are local, and no fetch, outreach, install, listener, publish or API call is implied.

# Accessibility Audit

Comprehensive audit of UI code for the actual selected WCAG target and criterion-level evidence. Identifies accessibility issues and provides actionable remediation guidance.

## Existing-context checks

Read the current brief, accepted Product/design-system decisions, target files, existing component conventions, package/lockfile and available evidence before asking anything. Reuse the host's actual paths and existing framework; missing foreign tracking directories do not require creation. Use [the local intake procedure](../../../../../process/intake.md).

Create Design owns prototype and presentation work. Production components belong to Frontend/host; accessibility and visual review return evidence/findings through their existing owners.

## Target and Level Configuration

### If the task already supplies these fields:

- Parse for file path or component name
- Parse for `--level` flag (AA or AAA)
- Reuse the governing accessibility target; for this local method use WCAG 2.2 AA as a review target when none is supplied, and record applicable criteria and unavailable evidence

### If the current brief/context leaves the target unresolved:

**Optional unresolved field 1: Audit Target**

```
What would you like to audit?

1. A specific component (provide name or path)
2. A page/route (provide path)
3. All components in a directory
4. The entire application
5. Recent changes only (last commit)

Enter number or provide a file path:
```

**Optional unresolved field 2: Compliance Level**

```
What WCAG compliance level should I audit against?

1. Level A   - Minimum accessibility (must-fix issues)
2. Level AA  - Standard compliance (recommended, most common target)
3. Level AAA - Enhanced accessibility (highest standard)

Note: Each level includes all requirements from previous levels.

Enter number:
```

**Optional unresolved field 3: Focus Areas (optional)**

```
Any specific areas to focus on? (Press enter to audit all)

1. Color contrast and visual presentation
2. Keyboard navigation and focus management
3. Screen reader compatibility
4. Forms and input validation
5. Dynamic content and ARIA
6. All areas

Enter numbers (comma-separated) or press enter:
```

## Decision and evidence record

Record only applicable scope, inputs, selected mechanism, existing constraints, unresolved decisions and test obligations in the current host-owned brief/handoff. Do not create another state database or approval authority. Retain actual source/version/artifact references and the owner's decision. Use [the local evidence procedure](../../../../../process/review-and-evidence.md).

## Audit Execution

### 1. File Discovery

Identify all files to audit:

- If single file: Audit that file
- If component: Find all related files (component, styles, tests)
- If directory: Recursively find UI files (`.tsx`, `.vue`, `.svelte`, etc.)
- If application: Audit all component and page files

### 2. Static Code Analysis

For each file, check against WCAG criteria:

#### Perceivable (WCAG 1.x)

**1.1 Text Alternatives:**

- [ ] Images have `alt` attributes
- [ ] Decorative images use `alt=""` or `role="presentation"`
- [ ] Complex images have extended descriptions
- [ ] Icon buttons have accessible names

**1.2 Time-based Media:**

- [ ] Videos have captions
- [ ] Audio has transcripts
- [ ] Media players are keyboard accessible

**1.3 Adaptable:**

- [ ] Semantic HTML structure (headings, lists, landmarks)
- [ ] Proper heading hierarchy (h1 > h2 > h3)
- [ ] Form inputs have associated labels
- [ ] Tables have proper headers
- [ ] Reading order is logical

**1.4 Distinguishable:**

- [ ] Color contrast meets requirements (4.5:1 normal, 3:1 large)
- [ ] Color is not sole means of conveying information
- [ ] Text can be resized to 200%
- [ ] Focus indicators are visible
- [ ] Content reflows at 320px width (AA)

#### Operable (WCAG 2.x)

**2.1 Keyboard Accessible:**

- [ ] All interactive elements are keyboard accessible
- [ ] No keyboard traps
- [ ] Focus order is logical
- [ ] Custom widgets follow ARIA patterns

**2.2 Enough Time:**

- [ ] Time limits can be extended/disabled
- [ ] Auto-updating content can be paused
- [ ] No content times out unexpectedly

**2.3 Seizures:**

- [ ] No content flashes more than 3 times/second
- [ ] Animations can be disabled (prefers-reduced-motion)

**2.4 Navigable:**

- [ ] Skip links present
- [ ] Page has descriptive title
- [ ] Focus visible on all elements
- [ ] Link purpose is clear
- [ ] Multiple ways to find pages

**2.5 Input Modalities:**

- [ ] Applicable web AA target-size criterion uses 24x24 CSS px or a documented exception; enhanced AAA has its separate 44x44 CSS px criterion/exceptions. Native iOS pt/Android dp targets follow the actual platform.
- [ ] Functionality not dependent on motion
- [ ] Dragging has alternative

#### Understandable (WCAG 3.x)

**3.1 Readable:**

- [ ] Language is specified (`lang` attribute)
- [ ] Unusual words are defined
- [ ] Abbreviations are expanded

**3.2 Predictable:**

- [ ] Focus doesn't trigger unexpected changes
- [ ] Input doesn't trigger unexpected changes
- [ ] Navigation is consistent
- [ ] Components behave consistently

**3.3 Input Assistance:**

- [ ] Error messages are descriptive
- [ ] Labels or instructions provided
- [ ] Error suggestions provided
- [ ] Important submissions can be reviewed

#### Robust (WCAG 4.x)

**4.1 Compatible:**

- [ ] HTML validates (no duplicate IDs)
- [ ] Custom components have proper ARIA
- [ ] Status messages announced to screen readers

### 3. Pattern Detection

Identify common accessibility anti-patterns:

```javascript
// Anti-patterns to detect
const antiPatterns = [
  // Missing alt text
  /<img(?![^>]*alt=)[^>]*>/,

  // onClick without keyboard handler
  /onClick={[^}]+}(?!.*onKeyDown)/,

  // Div/span with click handlers (likely needs role)
  /<(?:div|span)[^>]*onClick/,

  // Non-semantic buttons
  /<(?:div|span)[^>]*role="button"/,

  // Missing form labels
  /<input(?![^>]*(?:aria-label|aria-labelledby|id))[^>]*>/,

  // Positive tabindex (disrupts natural order)
  /tabIndex={[1-9]/,

  // Empty links
  /<a[^>]*>[\s]*<\/a>/,

  // Missing lang attribute
  /<html(?![^>]*lang=)/,

  // Autofocus (usually bad for a11y)
  /autoFocus/,
];
```

### 4. Color Contrast Analysis

If design tokens or CSS available:

- Extract color combinations used in text/background
- Calculate contrast ratios using WCAG formula
- Flag combinations that fail requirements:
  - Normal text: 4.5:1 (AA), 7:1 (AAA)
  - Large text (18pt+ or 14pt bold): 3:1 (AA), 4.5:1 (AAA)
  - UI components: 3:1 (AA)

### 5. ARIA Validation

Check ARIA usage:

- Verify ARIA roles are valid
- Check required ARIA attributes are present
- Verify ARIA values are valid
- Check for redundant ARIA (e.g., `role="button"` on `<button>`)
- Validate ARIA references (aria-labelledby, aria-describedby)

## Output Format

Generate audit report in `<host-provided-existing-artifact-path>`:

````markdown
# Accessibility Audit Report

**Audit ID:** {audit_id}
**Date:** {YYYY-MM-DD HH:MM}
**Target:** {target}
**WCAG Level:** {level}
**Target:** actual governing standard (local review default WCAG 2.2 AA); this report lists tested criteria, not complete conformance

## Executive Summary

**Review evidence status:** {checked scope, findings, gaps and NOT_RUN}; no partial report implies complete conformance.

| Severity | Count | % of Issues |
| -------- | ----- | ----------- |
| Critical | {n}   | {%}         |
| Serious  | {n}   | {%}         |
| Moderate | {n}   | {%}         |
| Minor    | {n}   | {%}         |

**Criteria Checked:** {n}
**Criteria Passed:** {n} ({%})
**Files Audited:** {n}

## Critical Issues (Must Fix)

These issues prevent users with disabilities from using the interface.

### Issue 1: {Title}

**WCAG Criterion:** {number} - {name} (Level {A|AA|AAA})
**Severity:** Critical
**Location:** `{file}:{line}`
**Element:** `{element_snippet}`

**Problem:**
{Description of the issue}

**Impact:**
{Who is affected and how}

**Remediation:**
{Step-by-step fix instructions}

**Code Fix:**

```{language}
// Before
{current_code}

// After
{fixed_code}
```

**Testing:**

- Manual: {how to manually verify}
- Automated: {suggested test}

---

### Issue 2: ...

## Serious Issues

These issues create significant barriers for some users.

### Issue 3: ...

## Moderate Issues

These issues may cause difficulty for some users.

### Issue 4: ...

## Minor Issues

These are best practice improvements.

### Issue 5: ...

## Passed Criteria

Record only the criteria actually checked for these scoped states, with evidence and uncovered cases:

| Criterion | Name                   | Level |
| --------- | ---------------------- | ----- |
| {actual checked criterion} | {name and evidence pointer} | {level} |
| {additional actual criterion} | {scope, observation and evidence} | {level} |
| ...       | ...                    | ...   |

## Recommendations

### Quick Wins (< 1 hour each)

1. {Quick fix 1}
2. {Quick fix 2}

### Medium Effort (1-4 hours each)

1. {Medium fix 1}
2. {Medium fix 2}

### Significant Effort (> 4 hours)

1. {Larger fix 1}

## Testing Resources

### Automated and behavioral verification

Use the project's configured adapters; do not add empty passing tests or install a test framework from this reference. Select assertions from the actual component/task contract:

- Verify the semantic role, accessible name and supported states using real rendered content rather than placeholder roles or a renders-without-crashing test alone.
- Exercise the main action and check the observable result. For a selection/configuration task, verify the correct object's identity and current value, a valid edit, invalid-value feedback with recovery, cancel, and switching with unsaved work when these behaviors exist.
- Verify keyboard/focus behavior and relevant loading/empty/error/responsive states. Automated accessibility checks report their actual covered scope; supplement with manual/AT evidence or explicit NOT_RUN.
- If persistence is claimed, inspect the actual persisted source or reload/reopen result according to the product contract. A toast, mock API or prototype state is insufficient proof.
- Existing tokens/styles and a rendered comparison may support fidelity checks. Unexecuted scaffolds, planned assertions and unsupported states remain PLANNED/GAP/NOT_RUN, not PASS.

### Manual Testing Checklist

- [ ] Navigate entire page using only keyboard
- [ ] Test with screen reader (VoiceOver/NVDA)
- [ ] Zoom to 200% and verify usability
- [ ] Test with high contrast mode
- [ ] Verify focus indicators are visible
- [ ] Test with prefers-reduced-motion

### Recommended Tools

- axe DevTools browser extension
- WAVE Web Accessibility Evaluator
- Lighthouse accessibility audit
- Color contrast analyzers

---

_Generated by UI Design Accessibility Audit_
_WCAG target: actual governing version/level; local 2.2 criterion scope and evidence follow below_

````

## Accessibility evidence handoff

Record the actual WCAG version/level, scope, checked criteria, findings, input modes, tool/environment evidence and unavailable checks. No code-only or partial tool result implies complete conformance. Return remediation to host/Frontend and preserve independent accessibility ownership. Use [review and evidence](../../../../../process/review-and-evidence.md).

## Guided Fix Mode

If user selects "Start fixing issues":

```
Let's fix accessibility issues starting with critical ones.

Issue 1 of {n}: {Issue Title}
WCAG {criterion}: {criterion_name}
Location: {file}:{line}

{Show current code}

The fix is:
{Explain the fix}

Should I:
1. Apply this fix automatically
2. Show me the fixed code first
3. Skip this issue
4. Stop fixing

Enter number:
```

Apply fixes one at a time, re-validating after each fix.

## Error Handling

- If file not found: Suggest alternatives, offer to search
- If not UI code: Explain limitation, suggest correct target
- If color extraction fails: Note in report, suggest manual check
- If audit incomplete: Save partial results, offer to resume

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
