> Local governing process: [Design index](../../../../../../../README.md), [one brief](../../../../../../../process/intake.md) and [evidence/authority](../../../../../../../process/review-and-evidence.md). Full [license](../../../../../../../licenses/ui-design/LICENSE) retained. This is adapted reference knowledge under the current accepted target/task and host permissions; it is not a new skill, agent or external runtime.

> Local adaptation - Cascade Codex, 2026-10-07. Original: wshobson/agents@46891e7e60da0e52baf1050b7b6391b64e84c6d9, plugins/ui-design/skills/accessibility-compliance/references/wcag-guidelines.md; SHA256 09bf683d0e15c7100bd9d1bc4a5e7bf019c580fd447bceccdd0ee30d4ccc01ce. License: [retained MIT notice](../../../../../../../licenses/ui-design/LICENSE). This file is modified: foreign discovery/controller/artifact/tool/effect assumptions and the recorded incompatibilities are replaced below. Complete compatible topic text/examples are retained; excluded sections remain in immutable source audit evidence.
>
> Parent authority: Create Design owns intake, inquiry/direction/decision and prototype; Product owns truth/behavior, design-system owns reusable rules, accessibility/visual owners review evidence, and Frontend/host owns production, persistence, permissions and execution. Consult [the local governing phase](../../../../../../../process/direction.md); this reference is progressively loaded for the actual task/platform, not another trigger or installation. Examples/dates/counts/styles are illustrative unless bound to actual evidence. External URLs are provenance/reference identities; operative steps are local, and no fetch, outreach, install, listener, publish or API call is implied.

# WCAG 2.2 Guidelines Reference

## Overview

The Web Content Accessibility Guidelines (WCAG) 2.2 provide recommendations for making web content more accessible. They are organized into four principles (POUR): Perceivable, Operable, Understandable, and Robust.

## Conformance Levels

- **Level A**: Minimum accessibility (must satisfy)
- **Level AA**: Standard accessibility (should satisfy)
- **Level AAA**: Enhanced accessibility (may satisfy)

Most organizations target Level AA compliance.

## Principle 1: Perceivable

Content must be presentable in ways users can perceive.

### 1.1 Text Alternatives

#### 1.1.1 Non-text Content (Level A)

All non-text content needs text alternatives.

```tsx
// Images
<img src="chart.png" alt="Q3 sales increased 25% compared to Q2" />

// Decorative images
<img src="decorative-line.svg" alt="" role="presentation" />

// Complex images with long descriptions
<figure>
  <img src="org-chart.png" alt="Organization chart" aria-describedby="org-desc" />
  <figcaption id="org-desc">
    The CEO reports to the board. Three VPs report to the CEO:
    VP Engineering, VP Sales, and VP Marketing...
  </figcaption>
</figure>

// Icons with meaning
<button aria-label="Delete item">
  <TrashIcon aria-hidden="true" />
</button>

// Icon buttons with visible text
<button>
  <DownloadIcon aria-hidden="true" />
  <span>Download</span>
</button>
```

### 1.2 Time-based Media

#### 1.2.1 Audio-only and Video-only (Level A)

```tsx
// Audio with transcript
<audio src="podcast.mp3" controls />
<details>
  <summary>View transcript</summary>
  <p>Full transcript text here...</p>
</details>

// Video with captions
<video controls>
  <source src="tutorial.mp4" type="video/mp4" />
  <track kind="captions" src="captions-en.vtt" srclang="en" label="English" />
  <track kind="subtitles" src="subtitles-es.vtt" srclang="es" label="Spanish" />
</video>
```

### 1.3 Adaptable

#### 1.3.1 Info and Relationships (Level A)

Structure and relationships must be programmatically determinable.

```tsx
// Proper heading hierarchy
<main>
  <h1>Page Title</h1>
  <section>
    <h2>Section Title</h2>
    <h3>Subsection</h3>
  </section>
</main>

// Data tables with headers
<table>
  <caption>Quarterly Sales Report</caption>
  <thead>
    <tr>
      <th scope="col">Product</th>
      <th scope="col">Q1</th>
      <th scope="col">Q2</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">Widget A</th>
      <td>$10,000</td>
      <td>$12,000</td>
    </tr>
  </tbody>
</table>

// Lists for grouped content
<nav aria-label="Main navigation">
  <ul>
    <li><a href="/">Home</a></li>
    <li><a href="/about">About</a></li>
    <li><a href="/contact">Contact</a></li>
  </ul>
</nav>
```

#### 1.3.5 Identify Input Purpose (Level AA)

```tsx
// Input with autocomplete for autofill
<form>
  <label htmlFor="name">Full Name</label>
  <input id="name" name="name" autoComplete="name" />

  <label htmlFor="email">Email</label>
  <input id="email" name="email" type="email" autoComplete="email" />

  <label htmlFor="phone">Phone</label>
  <input id="phone" name="phone" type="tel" autoComplete="tel" />

  <label htmlFor="address">Street Address</label>
  <input id="address" name="address" autoComplete="street-address" />

  <label htmlFor="cc">Credit Card Number</label>
  <input id="cc" name="cc" autoComplete="cc-number" />
</form>
```

### 1.4 Distinguishable

#### 1.4.1 Use of Color (Level A)

```tsx
// Bad: Color only indicates error
<input className={hasError ? 'border-red-500' : ''} />

// Good: Color plus icon and text
<div>
  <input
    className={hasError ? 'border-red-500' : ''}
    aria-invalid={hasError}
    aria-describedby={hasError ? 'error-message' : undefined}
  />
  {hasError && (
    <p id="error-message" className="text-red-500 flex items-center gap-1">
      <AlertIcon aria-hidden="true" />
      This field is required
    </p>
  )}
</div>
```

#### 1.4.3 Contrast (Minimum) (Level AA)

```css
/* Minimum contrast ratios */
/* Normal text: 4.5:1 */
/* Large text (18pt+ or 14pt bold+): 3:1 */

/* Good contrast examples */
.text-on-white {
  color: #595959; /* 7:1 ratio on white */
}

.text-on-dark {
  color: #ffffff;
  background: #333333; /* 12.6:1 ratio */
}

/* Link must be distinguishable from surrounding text */
.link {
  color: #0066cc; /* 4.5:1 on white */
  text-decoration: underline; /* Additional visual cue */
}
```

#### 1.4.11 Non-text Contrast (Level AA)

```css
/* UI components need 3:1 contrast */
.button {
  border: 2px solid #767676; /* 3:1 against white */
  background: white;
}

.input {
  border: 1px solid #767676;
}

.input:focus {
  outline: 2px solid #0066cc; /* Focus indicator needs 3:1 */
  outline-offset: 2px;
}

/* Custom checkbox */
.checkbox {
  border: 2px solid #767676;
}

.checkbox:checked {
  background: #0066cc;
  border-color: #0066cc;
}
```

#### 1.4.12 Text Spacing (Level AA)

Content must not be lost when user adjusts text spacing.

```css
/* Allow text spacing adjustments without breaking layout */
.content {
  /* Use relative units */
  line-height: 1.5; /* At least 1.5x font size */
  letter-spacing: 0.12em; /* Support for 0.12em */
  word-spacing: 0.16em; /* Support for 0.16em */

  /* Don't use fixed heights on text containers */
  min-height: auto;

  /* Allow wrapping */
  overflow-wrap: break-word;
}

/* Test with these values: */
/* Line height: 1.5x font size */
/* Letter spacing: 0.12em */
/* Word spacing: 0.16em */
/* Paragraph spacing: 2x font size */
```

### Tooltip behavior and verification

Use the project's verified tooltip primitive, or implement this complete behavior contract rather than copying an incomplete popup snippet:

- Keep keyboard focus on the triggering control. Give the popup a unique ID and role=tooltip; connect the trigger using aria-describedby while preserving its accessible name and any existing description.
- Show the description on keyboard focus and appropriate pointer hover. Handle Escape at the focused trigger or its event scope; a nonfocusable sibling popup cannot receive that key event.
- Keep the description visible while focus remains on the trigger or pointer is over the trigger or popup. Permit dismissal without forcing focus movement. Do not place interactive/focusable content inside a tooltip; use an appropriate nonmodal dialog/popover if interaction is needed.
- Test keyboard appearance/dismissal, pointer entry from trigger to popup, persistent hover, unique IDs across instances, long text, viewport boundaries and touch access to essential information. Essential instructions remain available without hover.
- Record the actual input-mode/assistive-technology evidence or NOT_RUN. DOM attributes alone are not proof that the announcement or behavior worked.

## Principle 2: Operable

Interface components must be operable by all users.

### 2.1 Keyboard Accessible

#### 2.1.1 Keyboard (Level A)

All functionality must be operable via keyboard.

```tsx
// Custom interactive element
function CustomButton({ onClick, children }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {children}
    </div>
  );
}

// Better: just use a button
function BetterButton({ onClick, children }) {
  return <button onClick={onClick}>{children}</button>;
}
```

### Modal dialog behavior and verification

Prefer a verified project or native dialog primitive. A custom implementation must satisfy the full contract before production use:

- Establish a visible title and unique per-instance accessible name. Choose initial focus deliberately for the task and content; remember the opener, and return focus to it or a sensible surviving control on close.
- Keep Tab/Shift+Tab within the active modal, including an explicit no-focusable-content case. Exclude hidden, disabled and inert elements when identifying focusable controls. Keyboard dismissal and close/cancel follow the actual task contract.
- Make background content inert for interaction while the modal is active; aria-modal alone does not enforce this. Account for nested overlays so only the active layer owns focus and dismissal.
- Preserve pre-existing body scroll state/locks when opening and restore the previous value only when the owning layer closes. Do not overwrite another overlay's lock.
- Observe open, initial focus, first/last Tab wrapping, reverse Tab, Escape where supported, cancel, submit/failure where relevant, returned focus, a removed opener, empty focusable content and nested dialogs. Screen-reader behavior needs actual evidence or NOT_RUN.
- Destructive effects, data submission and production changes remain host-owned and require actual authorized scope. A dialog rendering is not evidence those effects occurred.

### 2.4 Navigable

#### 2.4.1 Bypass Blocks (Level A)

```tsx
// Skip links
<body>
  <a href="#main" className="skip-link">
    Skip to main content
  </a>
  <a href="#nav" className="skip-link">
    Skip to navigation
  </a>

  <header>...</header>

  <nav id="nav" aria-label="Main">
    ...
  </nav>

  <main id="main" tabIndex={-1}>
    {/* Main content */}
  </main>
</body>
```

#### 2.4.4 Link Purpose (In Context) (Level A)

```tsx
// Bad: Ambiguous link text
<a href="/report">Click here</a>
<a href="/report">Read more</a>

// Good: Descriptive link text
<a href="/report">View quarterly sales report</a>

// Good: Context provides meaning
<article>
  <h2>Quarterly Sales Report</h2>
  <p>Sales increased by 25% this quarter...</p>
  <a href="/report">Read full report</a>
</article>

// Good: Visually hidden text for context
<a href="/report">
  Read more
  <span className="sr-only"> about quarterly sales report</span>
</a>
```

#### 2.4.7 Focus Visible (Level AA)

```css
/* Always show focus indicator */
:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}

/* Custom focus styles */
.button:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px var(--color-focus);
}

/* High visibility focus for links */
.link:focus-visible {
  outline: 3px solid var(--color-focus);
  outline-offset: 2px;
  background: var(--color-focus-bg);
}
```

### 2.5 Input Modalities (New in 2.2)

#### 2.5.8 Target Size (Minimum) (Level AA) - NEW

Web pointer targets are at least 24×24 CSS pixels unless a documented spacing, equivalent-control, inline, user-agent or essential exception applies. Native point/dp recommendations are separate.

```css
/* Minimum target size */
.interactive {
  min-width: 24px;
  min-height: 24px;
}

/* Recommended size for touch (44x44) */
.touch-target {
  min-width: 44px;
  min-height: 44px;
}

/* Inline targets in sentences have a specific criterion exception; other undersized targets need an applicable documented exception such as spacing. */
.link {
  /* Inline text links don't need minimum size */
  /* but should have adequate line-height */
  line-height: 1.5;
}
```

## Principle 3: Understandable

Content and interface must be understandable.

### 3.1 Readable

#### 3.1.1 Language of Page (Level A)

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    ...
  </head>
  <body>
    ...
  </body>
</html>
```

#### 3.1.2 Language of Parts (Level AA)

```tsx
<p>
  The French phrase <span lang="fr">c'est la vie</span> means "that's life."
</p>
```

### 3.2 Predictable

#### 3.2.2 On Input (Level A)

Don't automatically change context on input.

```tsx
// Bad: Auto-submit on selection
<select onChange={(e) => form.submit()}>
  <option>Select country</option>
</select>

// Good: Explicit submit action
<select onChange={(e) => setCountry(e.target.value)}>
  <option>Select country</option>
</select>
<button type="submit">Continue</button>
```

### 3.3 Input Assistance

#### 3.3.1 Error Identification (Level A)

```tsx
function FormField({ id, label, error, ...props }) {
  return (
    <div>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        {...props}
      />
      {error && (
        <p id={`${id}-error`} role="alert" className="text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
```

#### 3.3.7 Redundant Entry (Level A) - NEW

Don't require users to re-enter previously provided information.

```tsx
// Auto-fill shipping address from billing
function CheckoutForm() {
  const [sameAsBilling, setSameAsBilling] = useState(false);
  const [billing, setBilling] = useState({});
  const [shipping, setShipping] = useState({});

  return (
    <form>
      <fieldset>
        <legend>Billing Address</legend>
        <AddressFields value={billing} onChange={setBilling} />
      </fieldset>

      <label>
        <input
          type="checkbox"
          checked={sameAsBilling}
          onChange={(e) => {
            setSameAsBilling(e.target.checked);
            if (e.target.checked) setShipping(billing);
          }}
        />
        Shipping same as billing
      </label>

      {!sameAsBilling && (
        <fieldset>
          <legend>Shipping Address</legend>
          <AddressFields value={shipping} onChange={setShipping} />
        </fieldset>
      )}
    </form>
  );
}
```

## Principle 4: Robust

Content must be robust enough for assistive technologies.

### 4.1 Compatible

#### 4.1.2 Name, Role, Value (Level A)

```tsx
// Custom components must expose name, role, and value
function CustomCheckbox({ checked, onChange, label }) {
  return (
    <button
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
    >
      {checked ? "✓" : "○"} {label}
    </button>
  );
}
```

### Slider behavior and verification

Use a native range input or a verified project slider primitive when it meets the task. If a custom slider is justified:

- Provide an accessible name, current/min/max values, orientation and useful value text (including actual units) when the numeric value alone is insufficient.
- Support applicable arrow keys, Home/End and any specified larger-step keys consistently with the value domain and orientation. Clamp values, validate the range/step, and handle a degenerate min=max range without division by zero.
- Support the actual pointer/touch interactions and a keyboard alternative; do not require dragging to perform the task. Preserve focus and distinguish draft/proposed values from applied/persisted state.
- Test min/max/step edges, invalid or changing ranges, keyboard direction, non-drag pointer access, touch where applicable, focus/name/value announcements and cancellation/recovery. An illustrative width calculation is not a complete accessible widget.


## Testing Checklist

This is a check menu for actual target criteria, not an exhaustive conformance certificate. Add the local 2.2 checks below and record applicability, execution and gaps.

```markdown
## Keyboard Testing

- [ ] All interactive elements focusable with Tab
- [ ] Focus order matches visual order
- [ ] Focus indicator always visible
- [ ] No keyboard traps
- [ ] Escape closes modals/dropdowns
- [ ] Enter activates links; Enter/Space activate native buttons; test actual component semantics

## Screen Reader Testing

- [ ] All images have alt text
- [ ] Form inputs have labels
- [ ] Headings in logical order
- [ ] Landmarks present (main, nav, header, footer)
- [ ] Dynamic content announced
- [ ] Error messages announced

## Visual Testing

- [ ] Text contrast at least 4.5:1
- [ ] UI component contrast at least 3:1
- [ ] Works at 200% zoom
- [ ] Content readable with text spacing
- [ ] Focus indicators visible
- [ ] Color not sole indicator of meaning
```

## Resources

- [WCAG 2.2 Quick Reference](https://www.w3.org/WAI/WCAG22/quickref/)
- [Understanding WCAG 2.2](https://www.w3.org/WAI/WCAG22/Understanding/)
- [Techniques for WCAG 2.2](https://www.w3.org/WAI/WCAG22/Techniques/)

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
