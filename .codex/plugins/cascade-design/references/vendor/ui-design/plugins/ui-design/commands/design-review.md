> Local governing process: [Design index](../../../../../README.md), [one brief](../../../../../process/intake.md) and [evidence/authority](../../../../../process/review-and-evidence.md). Full [license](../../../../../licenses/ui-design/LICENSE) retained. This is adapted reference knowledge under the current accepted target/task and host permissions; it is not a new skill, agent or external runtime.

> Local adaptation - Cascade Codex, 2026-10-07. Original: wshobson/agents@46891e7e60da0e52baf1050b7b6391b64e84c6d9, plugins/ui-design/commands/design-review.md; SHA256 defa0f093b4339ee5c905c8809ebdcaa2b1ab0d8403d8c5e7c02260b470c2505. License: [retained MIT notice](../../../../../licenses/ui-design/LICENSE). This file is modified: foreign discovery/controller/artifact/tool/effect assumptions and the recorded incompatibilities are replaced below. Complete compatible topic text/examples are retained; excluded sections remain in immutable source audit evidence.
>
> Parent authority: Create Design owns intake, inquiry/direction/decision and prototype; Product owns truth/behavior, design-system owns reusable rules, accessibility/visual owners review evidence, and Frontend/host owns production, persistence, permissions and execution. Consult [the local governing phase](../../../../../process/review-and-evidence.md); this reference is progressively loaded for the actual task/platform, not another trigger or installation. Examples/dates/counts/styles are illustrative unless bound to actual evidence. External URLs are provenance/reference identities; operative steps are local, and no fetch, outreach, install, listener, publish or API call is implied.

# Design Review

Review existing UI code for design issues, usability problems, and improvement opportunities. Provides actionable recommendations.

## Existing-context checks

Read the current brief, accepted Product/design-system decisions, target files, existing component conventions, package/lockfile and available evidence before asking anything. Reuse the host's actual paths and existing framework; missing foreign tracking directories do not require creation. Use [the local intake procedure](../../../../../process/intake.md).

Create Design owns prototype and presentation work. Production components belong to Frontend/host; accessibility and visual review return evidence/findings through their existing owners.

## Target Identification

### If the task already supplies these fields:

- If file path: Validate file exists, read the file
- If component name: Search codebase for matching component files
- If not found: Display error with suggestions

### If the current brief/context leaves the target unresolved:

Ask user to specify target:

```
What would you like me to review?

1. A specific component (provide name or path)
2. A page/route (provide path)
3. The entire UI directory
4. Recent changes (last commit)

Enter number or provide a file path:
```

## Interactive Review Configuration

Ask only about an unresolved decision that could change this review. Target, platform and constraints already established by the brief are reused.

**CRITICAL RULES:**

- Ask ONE question per turn
- Wait for user response before proceeding
- Gather context to provide relevant feedback

### Optional unresolved field 1: Review Focus

```
What aspects should I focus on?

1. Visual design (spacing, alignment, typography, colors)
2. Usability (interaction patterns, accessibility basics)
3. Code quality (patterns, maintainability, reusability)
4. Performance (render optimization, bundle size)
5. Comprehensive (all of the above)

Enter number:
```

### Optional unresolved field 2: Design Context (if visual/usability selected)

```
What is this UI's primary purpose?

1. Data display (dashboards, tables, reports)
2. Data entry (forms, wizards, editors)
3. Navigation (menus, sidebars, breadcrumbs)
4. Content consumption (articles, media, feeds)
5. E-commerce (product display, checkout)
6. Other (describe)

Enter number or description:
```

### Optional unresolved field 3: Target Platform

```
What platform(s) should I consider?

1. Desktop only
2. Mobile only
3. Responsive (desktop + mobile)
4. All platforms (desktop, tablet, mobile)

Enter number:
```

## Decision and evidence record

Record only applicable scope, inputs, selected mechanism, existing constraints, unresolved decisions and test obligations in the current host-owned brief/handoff. Do not create another state database or approval authority. Retain actual source/version/artifact references and the owner's decision. Use [the local evidence procedure](../../../../../process/review-and-evidence.md).

## Review Execution

### 1. Code Analysis

Read and analyze the target files:

- Parse component structure
- Identify styling approach (CSS, Tailwind, styled-components, etc.)
- Detect framework (React, Vue, Svelte, etc.)
- Note component composition patterns

### 2. Visual Design Review

Check for:

**Spacing & Layout:**

- Inconsistent margins/padding
- Misaligned elements
- Unbalanced whitespace
- Magic numbers vs. design tokens

**Typography:**

- Font size consistency
- Line height appropriateness
- Text contrast ratios
- Font weight usage

**Colors:**

- Color contrast accessibility
- Consistent color usage
- Semantic color application
- Dark mode support (if applicable)

**Visual Hierarchy:**

- Clear primary actions
- Appropriate emphasis
- Scannable content structure

### 3. Usability Review

Check for:

**Interaction Patterns:**

- Clear clickable/tappable areas
- Appropriate hover/focus states
- Loading state indicators
- Error state handling
- Empty state handling

**User Flow:**

- Logical tab order
- Clear call-to-action
- Predictable behavior
- Feedback on actions

**Cognitive Load:**

- Information density
- Progressive disclosure
- Clear labels and instructions
- Consistent patterns

### 4. Code Quality Review

Check for:

**Component Patterns:**

- Single responsibility
- Prop drilling depth
- State management appropriateness
- Component reusability

**Styling Patterns:**

- Consistent naming conventions
- Reusable style definitions
- Media query organization
- CSS specificity issues

**Maintainability:**

- Clear component boundaries
- Documentation/comments
- Test coverage
- Accessibility attributes

### 5. Performance Review

Check for:

**Render Optimization:**

- Unnecessary re-renders
- Missing memoization
- Large component trees
- Expensive computations in render

**Asset Optimization:**

- Image sizes and formats
- Icon implementation
- Font loading strategy
- Code splitting opportunities

## Output Format

Generate review report in `<host-provided-existing-artifact-path>`:

````markdown
# Design Review: {Component/File Name}

**Review ID:** {review_id}
**Reviewed:** {YYYY-MM-DD HH:MM}
**Target:** {file_path}
**Focus:** {focus_areas}

## Summary

{2-3 sentence overview of findings}

**Issues Found:** {total_count}

- Critical: {count}
- Major: {count}
- Minor: {count}
- Suggestions: {count}

## Critical Issues

### Issue 1: {Title}

**Severity:** Critical
**Location:** {file}:{line}
**Category:** {Visual|Usability|Code|Performance}

**Problem:**
{Description of the issue}

**Impact:**
{Why this matters for users/maintainability}

**Recommendation:**
{Specific fix suggestion}

**Code Example:**

```{language}
// Before
{current_code}

// After
{suggested_code}
```

---

## Major Issues

### Issue 2: {Title}

...

## Minor Issues

### Issue 3: {Title}

...

## Suggestions

### Suggestion 1: {Title}

...

## Positive Observations

{List things done well to reinforce good patterns}

- {Positive observation 1}
- {Positive observation 2}

## Next Steps

1. {Prioritized action 1}
2. {Prioritized action 2}
3. {Prioritized action 3}

---

_Generated by UI Design Review. Run `the existing owner's local procedure (../../../../../process/prototype-and-build.md)` again after fixes._

````

## Review handoff

Return prioritized findings bound to actual files/artifacts, observations and expected source. Label code-only inferences separately from rendered/task evidence. No tracking database is created. Use [review and evidence](../../../../../process/review-and-evidence.md).

## Follow-up ownership

Give the host/Frontend owner a scoped repair proposal and affected verification checks. Recheck after an authorized repair. This review does not write production fixes or broaden scope automatically.

## Error Handling

- If target file not found: Suggest similar files, offer to search
- If file is not UI code: Explain and ask for correct target
- If review fails mid-way: Save partial results, offer to resume
