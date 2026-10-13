> Local governing process: [Design index](../../../../README.md), [one brief](../../../../process/intake.md) and [evidence/authority](../../../../process/review-and-evidence.md). Full [license](../../../../licenses/impeccable/LICENSE) retained. This is adapted reference knowledge under the current accepted target/task and host permissions; it is not a new skill, agent or external runtime.

> Adapted local reference from Impeccable (Paul Bakaus), pinned revision ffeda44b00b1e39bd901621dcd3a7e44ba184ce1. Original path: `skill/reference/document.md`; source SHA256: `aca6d5ea0770131b8f97a3feb68e1bd3cc536b1ef2e7d05bb0c2c1c9c96c68d3`. Full Apache-2.0 LICENSE and NOTICE are retained. Changes: host-owned brief/authority/evidence substitutions and context-sensitive guidance; see the adaptation manifest. This is a topic reference, not an active skill/agent.

Implementation examples below are inert design knowledge. The Cascade controller and host own the current brief, accepted target authority, effect scope, implementation owner, artifact persistence and readiness. Use only available authorized tools; a reference grants no new action. Treat source-authored standards/API claims as a pinned snapshot, not fresh qualification.

# Document an observed or proposed design system

Capture the relevant visual system in the existing accepted target/design-system contract, preserving exact source locators and observed values. Use the current controller and write scope. The following token and component examples are documentation patterns, not a required foreign schema/file, runtime panel or external spec dependency. Existing target naming/format remains authoritative; no runtime fetch is required.

```yaml
---
name: <project title>
description: <one-line tagline>
colors:
  primary: "#b8422e"
  neutral-bg: "#faf7f2"
  # ...one entry per extracted color; key = descriptive slug
typography:
  display:
    fontFamily: "Cormorant Garamond, Georgia, serif"
    fontSize: "clamp(2.5rem, 7vw, 4.5rem)"
    fontWeight: 300
    lineHeight: 1
    letterSpacing: "normal"
  body:
    # ...
rounded:
  sm: "4px"
  md: "8px"
spacing:
  sm: "8px"
  md: "16px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.neutral-bg}"
    rounded: "{rounded.sm}"
    padding: "16px 48px"
  button-primary-hover:
    backgroundColor: "{colors.primary-deep}"
---
```

Rules that matter:

- Reuse accepted token names, references and formats. Explain each value's actual source and role; do not create a second primitive authority in prose.
- Record only observed tokens as observed. Candidate values/variants are explicitly proposed and tied to the task.
- Resolve abbreviated example references before using them in a real artifact. A sample color/spacing/typeface is not the target's accepted choice.
- Preserve every meaningful state/property the target uses; a foreign eight-property limit is not an instruction to drop focus, motion or elevation.
- Organize relevant documentation by overview, color roles, typography, layout, elevation/material, shapes, components, and practical use constraints. Omit irrelevant categories; the accepted artifact schema governs machine output.

Omit irrelevant sections rather than filling them with invented rules. Put responsive layout in Layout, depth in Elevation & Depth, radius and form language in Shapes, and per-component behavior in Components. Unknown sections are preserved by the format, but new visual guidance should use the canonical structure whenever it fits.

## When and how to use this procedure

Use observed extraction when a task requires reusable-system documentation or an authorized system change. For an existing coherent system, preserve accepted values and explain any discrepancy. For a genuinely open new system, record provisional direction separately from observed implementation. Missing a filename does not require new identity work. An already authorized update proceeds at its explicit scope; a materially new system boundary needs its actual owner/decision, not a silent overwrite.

## Scan mode (approach C: auto-extract, then confirm descriptive language)

### Step 1: Find the design assets

Search the codebase in priority order:

1. **CSS custom properties**: grep for `--color-`, `--font-`, `--spacing-`, `--radius-`, `--shadow-`, `--ease-`, `--duration-` declarations in CSS files (usually `src/styles/`, `public/css/`, `app/globals.css`, etc.). Record name, value, and the file it's defined in.
2. **Tailwind config**: if `tailwind.config.{js,ts,mjs}` exists, read the `theme.extend` block for colors, fontFamily, spacing, borderRadius, boxShadow.
3. **CSS-in-JS theme files**: styled-components, emotion, vanilla-extract, stitches; look for `theme.ts`, `tokens.ts`, or equivalent.
4. **Design token files**: `tokens.json`, `design-tokens.json`, Style Dictionary output, W3C token community group format.
5. **Component library**: scan the main button, card, input, navigation, dialog components. Note their variant APIs and default styles.
6. **Global stylesheet**: the root CSS file usually has the base typography and color assignments.
7. **Visible rendered output**: if browser automation tools are available, load the live site and sample computed styles from key elements (body, h1, a, button, .card). This catches values that tokens miss.

### Step 2: Auto-extract what can be auto-extracted

Build a structured draft from the discovered tokens. For each token class:

- **Colors**: record actual semantic roles and preserve accepted names; omit absent roles instead of inventing a second palette.
- **Typography**: record actual roles, sizes, weights, families, scales and user/platform scaling behavior. Do not force Material naming onto another accepted system.
- **Elevation**: Catalogue the shadow vocabulary. If the project is flat and uses tonal layering instead, that's a valid answer; state it explicitly.
- **Components**: For each common component (button, card, input, chip, list item, tooltip, nav), extract shape (radius), color assignment, hover/focus treatment, internal padding.
- **Layout + spacing**: Extract grid, container, breakpoint, rhythm, and density behavior into Layout.
- **Shapes**: Extract radius, corner, border, clipping, and recurring form behavior into Shapes.

### Step 2b: Stage the documentation values

Keep canonical token values and source references in the existing accepted location. Colors keep the project's exact format; typography includes only actual properties; spacing/shape uses actual scale names; component variants include actual state and interaction rules. Avoid duplicate literal values that drift. An illustration of token frontmatter above is a partial example, not evidence that those values exist.

### Step 3: Explain the system's intent

Reuse the accepted brief and existing design language. Explain observed hierarchy, color role, typography character, density, elevation/material, component treatment and important invariants in practical terms. Ask only when a material new direction or system decision remains unresolved; descriptive color naming does not require two extra interviews or renamed stable tokens. Product truth explains the fit; surface composition stays in its own current task record.

### Step 4: Write accepted target design record

The file opens with the YAML frontmatter staged in Step 2b (schema documented at the top of this reference), then the markdown body using the canonical structure below.

```markdown
---
name: [Project Title]
description: [one-line tagline]
colors:
  # ... staged frontmatter from Step 2b
---

# Design System: [Project Title]

## Overview

**Creative North Star: "[Named metaphor in quotes]"**

[2-3 paragraph holistic description: personality, density, and aesthetic philosophy. Start from the North Star and work outward. State only confirmed visual rejections. End with a short **Key Characteristics:** bullet list.]

## Colors

[Describe the palette character in one sentence.]

### Primary
- **[Descriptive Name]** (#HEX / oklch(...)): [Where and why this color is used. Be specific about context, not just role.]

### Secondary (optional; omit if the project has only one accent)
- **[Descriptive Name]** (#HEX): [Role.]

### Tertiary (optional)
- **[Descriptive Name]** (#HEX): [Role.]

### Neutral
- **[Descriptive Name]** (#HEX): [Text / background / border / divider role.]
- [...]

### Named Rules (optional, powerful)
**The [Rule Name] Rule.** [Short, forceful prohibition or doctrine, e.g. "The One Voice Rule. The primary accent is used on ≤10% of any given screen. Its rarity is the point."]

## Typography

**Display Font:** [Family] (with [fallback])
**Body Font:** [Family] (with [fallback])
**Label/Mono Font:** [Family, if distinct]

**Character:** [1-2 sentence personality description of the pairing.]

### Hierarchy
- **Display** ([weight], [size/clamp], [line-height]): [Purpose; where it appears.]
- **Headline** ([weight], [size], [line-height]): [Purpose.]
- **Title** ([weight], [size], [line-height]): [Purpose.]
- **Body** ([weight], [size], [line-height]): [Purpose. Include max line length like 65–75ch if relevant.]
- **Label** ([weight], [size], [letter-spacing], [case if uppercase]): [Purpose.]

### Named Rules (optional)
**The [Rule Name] Rule.** [Short doctrine about type use.]

## Layout

[Describe the grid or spatial model, container behavior, density, responsive changes, and the spacing rhythm. Include exact values only when observed.]

## Elevation & Depth

[One paragraph: does this system use shadows, tonal layering, or a hybrid? If "no shadows", say so explicitly and describe how depth is conveyed instead.]

### Shadow Vocabulary (if applicable)
- **[Role name]** (`box-shadow: [exact value]`): [When to use it.]
- [...]

### Named Rules (optional)
**The [Rule Name] Rule.** [e.g. "The Flat-By-Default Rule. Surfaces are flat at rest. Shadows appear only as a response to state (hover, elevation, focus)."]

## Shapes

[Describe the form language: corner/radius strategy, borders, clipping, and any recurring silhouette or geometry.]

## Components

For each component, lead with a short character line, then specify shape, color assignment, states, and any distinctive behavior.

### Buttons
- **Shape:** [radius described, exact value in parens]
- **Primary:** [color assignment + padding, in semantic + exact terms]
- **Hover / Focus:** [transitions, treatments]
- **Secondary / Ghost / Tertiary (if applicable):** [brief description]

### Chips (if used)
- **Style:** [background, text color, border treatment]
- **State:** [selected / unselected, filter / action variants]

### Cards / Containers
- **Corner Style:** [radius]
- **Background:** [colors used]
- **Shadow Strategy:** [reference Elevation section]
- **Border:** [if any]
- **Internal Padding:** [scale]

### Inputs / Fields
- **Style:** [stroke, background, radius]
- **Focus:** [treatment, e.g. glow, border shift, etc.]
- **Error / Disabled:** [if applicable]

### Navigation
- **Style, typography, default/hover/active states, mobile treatment.**

### [Signature Component] (optional; if the project has a distinctive custom component worth documenting)
[Description.]

## Do's and Don'ts

Concrete visual guardrails grounded in the incumbent implementation or the user's chosen world. Lead each with "Do" or "Don't" and include exact values only when established. Do not turn a task-specific concept or surface strategy into a system-wide prohibition.

### Do:
- **Do** [specific prescription with exact values / named rule].
- **Do** [...]

### Don't:
- **Don't** [specific prohibition confirmed by the incumbent system or the user].
- **Don't** [...]
- **Don't** [...]
```

### Step 4b: Capture complete component and token behavior

The accepted design-system contract owns the primitive roles, component rules, states and relevant responsive/motion/accessibility behavior. Reuse actual target records; no extra sidecar is required. If a local documentation example is useful, keep it explicitly illustrative and tied to observed values rather than represent it as a runtime schema.

For each documented component:

1. Name its actual role, source/component locator, revision, variants and when it is appropriate.
2. Record semantic structure and accessible names/focus/input behavior before visual properties.
3. Bind visual properties to canonical tokens where available; otherwise label a measured observed value or an explicit candidate.
4. Include real default/focus/active/disabled/loading/error/success states that the component actually owns.
5. Note supported viewport/input/content limits, user text scaling and reduced-motion behavior.
6. If translating a framework example into standalone documentation, keep the snippet inert, self-contained and clearly partial. Do not install the framework or inject an external panel.

Illustrative local button syntax, to be bound to actual accepted target tokens:

```html
<button type="button" class="ds-btn-primary">Save changes</button>
```

```css
.ds-btn-primary {
  background: var(--action-background);
  color: var(--action-foreground);
  padding: var(--action-padding);
  border-radius: var(--action-radius);
}
.ds-btn-primary:focus-visible {
  outline: 2px solid var(--focus-indicator);
  outline-offset: 2px;
}
```

The names above are placeholders, not accepted token values. Verify their real definitions, contrast and component states before implementation.

Document only the canonical primitives and genuinely reused/distinctive patterns relevant to the task. No observed component library means no claim that a library exists. Proposed primitives remain clearly proposed; do not synthesize them as an extraction finding. Preserve existing tonal scales. When proposing a new color ramp, validate actual gamut, contrast roles and alpha behavior; reduce chroma near extremes instead of assume constant chroma is suitable everywhere. Keep explanatory narrative sourced to the accepted record, without duplicating competing facts.

### Step 5: Review the documentation at its actual scope

Show the useful record and consequential source/decision differences. Label observed versus candidate tokens/components and open gaps. Routine already authorized documentation does not need a new creative approval round; unresolved material system changes use the current owner's decision.
Your own write is the freshest source; subsequent commands in this session don't need a reload.

## Provisional direction before implementation

When the requested system is not implemented, reuse the controller's selected direction/current brief. Keep provisional palette roles, typography character, spatial grammar, shape/material, motion/accessibility intent and preserved constraints distinct from observed tokens/components. Include numeric values or font names only when accepted/observed; otherwise mark them unresolved rather than fabricate a token spec.

Do not run another workshop, require a product filename or claim components exist on day zero. A planning artifact stays candidate/GAP as the existing schema requires. Later actual source/rendered evidence can establish implemented values and readiness.

## Style guidelines

- **Canonical values first, explanation second.** The accepted target record owns primitive values; prose explains roles and limits.
- **Preserve actual names/formats.** Do not rename tokens or impose another tool's section/parser schema.
- **Record only relevant reusable facts.** One-off values and candidate components are explicit, not hidden as observed truth.
- **Practical explanation.** Describe where and why a value/component applies; include exact observed value/source where useful.
- **Evidence-grounded invariants.** Use decisive language for accepted/observed constraints, provisional language for options.
- **Scope fidelity.** Surface strategy stays in the current brief; durable shared rules update only within authorized system scope.
- **No duplicate authority.** The documentation must not replace accepted product truth or create divergent value copies.
- **No runtime/tool grant.** Examples, links and references do not fetch/install a schema, panel, library or asset.
