> Local governing process: [Design index](../../../../../../../README.md), [one brief](../../../../../../../process/intake.md) and [evidence/authority](../../../../../../../process/review-and-evidence.md). Full [license](../../../../../../../licenses/ui-design/LICENSE) retained. This is adapted reference knowledge under the current accepted target/task and host permissions; it is not a new skill, agent or external runtime.

> Local adaptation - Cascade Codex, 2026-10-07. Original: wshobson/agents@46891e7e60da0e52baf1050b7b6391b64e84c6d9, plugins/ui-design/skills/accessibility-compliance/references/details.md; SHA256 1789504a4268186e62126059da48d8deb95d36631fac6263b368e715df2ca2fb. License: [retained MIT notice](../../../../../../../licenses/ui-design/LICENSE). This file is modified: foreign discovery/controller/artifact/tool/effect assumptions and the recorded incompatibilities are replaced below. Complete compatible topic text/examples are retained; excluded sections remain in immutable source audit evidence.
>
> Parent authority: Create Design owns intake, inquiry/direction/decision and prototype; Product owns truth/behavior, design-system owns reusable rules, accessibility/visual owners review evidence, and Frontend/host owns production, persistence, permissions and execution. Consult [the local governing phase](../../../../../../../process/direction.md); this reference is progressively loaded for the actual task/platform, not another trigger or installation. Examples/dates/counts/styles are illustrative unless bound to actual evidence. External URLs are provenance/reference identities; operative steps are local, and no fetch, outreach, install, listener, publish or API call is implied.

# accessibility-compliance — detailed patterns and worked examples

## Core Capabilities

### 1. WCAG 2.2 Guidelines

- Perceivable: Content must be presentable in different ways
- Operable: Interface must be navigable with keyboard and assistive tech
- Understandable: Content and operation must be clear
- Robust: Content must work with current and future assistive technologies

### 2. ARIA Patterns

- Roles: Define element purpose (button, dialog, navigation)
- States: Indicate current condition (expanded, selected, disabled)
- Properties: Describe relationships and additional info (labelledby, describedby)
- Live regions: Announce dynamic content changes

### 3. Keyboard Navigation

- Focus order and tab sequence
- Focus indicators and visible focus states
- Keyboard shortcuts and hotkeys
- Focus trapping for modals and dialogs

### 4. Screen Reader Support

- Semantic HTML structure
- Alternative text for images
- Proper heading hierarchy
- Skip links and landmarks

### 5. Mobile Accessibility

- Touch targets use the actual platform convention (iOS pt, Android dp); web AA/AAA CSS px criteria and exceptions remain separate.
- VoiceOver and TalkBack compatibility
- Gesture alternatives
- Dynamic Type support

## Quick Reference

### WCAG 2.2 Success Criteria Checklist

| Level | Criterion | Description                                          |
| ----- | --------- | ---------------------------------------------------- |
| A     | 1.1.1     | Non-text content has text alternatives               |
| A     | 1.3.1     | Info and relationships programmatically determinable |
| A     | 2.1.1     | All functionality keyboard accessible                |
| A     | 2.4.1     | Skip to main content mechanism                       |
| AA    | 1.4.3     | Contrast ratio 4.5:1 (text), 3:1 (large text)        |
| AA    | 1.4.11    | Non-text contrast 3:1                                |
| AA    | 2.4.7     | Focus visible                                        |
| AA    | 2.5.8     | Target size minimum 24x24px (NEW in 2.2)             |
| AAA   | 1.4.6     | Enhanced text contrast 7:1 normal / 4.5:1 large |
| AAA | 2.5.5 | Enhanced web target size: 44x44 CSS px or an applicable exception |

## Key Patterns

### Pattern 1: Accessible Button

```tsx
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary";
  isLoading?: boolean;
}

function AccessibleButton({
  children,
  variant = "primary",
  isLoading = false,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      // Disable when loading
      disabled={disabled || isLoading}
      // Announce loading state to screen readers
      aria-busy={isLoading}
      // Describe the button's current state
      aria-disabled={disabled || isLoading}
      className={cn(
        // Visible focus ring
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        // Example generous web target; 44 CSS px is not a universal AA/native minimum.
        "min-h-[44px] min-w-[44px]",
        variant === "primary" && "bg-primary text-primary-foreground",
        (disabled || isLoading) && "opacity-50 cursor-not-allowed",
      )}
      {...props}
    >
      {isLoading ? (
        <>
          <span className="sr-only">Loading</span>
          <Spinner aria-hidden="true" />
        </>
      ) : (
        children
      )}
    </button>
  );
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

### Pattern 3: Accessible Form

```tsx
function AccessibleForm() {
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  return (
    <form aria-describedby="form-errors" noValidate>
      {/* Error summary for screen readers */}
      {Object.keys(errors).length > 0 && (
        <div
          id="form-errors"
          role="alert"
          aria-live="assertive"
          className="bg-destructive/10 border border-destructive p-4 rounded-md mb-4"
        >
          <h2 className="font-semibold text-destructive">
            Please fix the following errors:
          </h2>
          <ul className="list-disc list-inside mt-2">
            {Object.entries(errors).map(([field, message]) => (
              <li key={field}>
                <a href={`#${field}`} className="underline">
                  {message}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Required field with error */}
      <div className="space-y-2">
        <label htmlFor="email" className="block font-medium">
          Email address
          <span aria-hidden="true" className="text-destructive ml-1">
            *
          </span>
          <span className="sr-only">(required)</span>
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          aria-required="true"
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? "email-error" : "email-hint"}
          className={cn(
            "w-full px-3 py-2 border rounded-md",
            errors.email && "border-destructive",
          )}
        />
        {errors.email ? (
          <p id="email-error" className="text-sm text-destructive" role="alert">
            {errors.email}
          </p>
        ) : (
          <p id="email-hint" className="text-sm text-muted-foreground">
            [Use only the actual approved data-use statement.]
          </p>
        )}
      </div>

      <button type="submit" className="mt-4">
        Submit
      </button>
    </form>
  );
}
```

### Pattern 4: Skip Navigation Link

```tsx
function SkipLink() {
  return (
    <a
      href="#main-content"
      className={cn(
        // Hidden by default, visible on focus
        "sr-only focus:not-sr-only",
        "focus:absolute focus:top-4 focus:left-4 focus:z-50",
        "focus:bg-background focus:px-4 focus:py-2 focus:rounded-md",
        "focus:ring-2 focus:ring-primary",
      )}
    >
      Skip to main content
    </a>
  );
}

// In layout
function Layout({ children }) {
  return (
    <>
      <SkipLink />
      <header>...</header>
      <nav aria-label="Main navigation">...</nav>
      <main id="main-content" tabIndex={-1}>
        {children}
      </main>
      <footer>...</footer>
    </>
  );
}
```

### Live region behavior and verification

Use a stable, already-mounted project announcement region. Ordinary status updates belong in a polite status region; truly urgent interruptions may use a separately governed assertive alert region. Do not expose an assertive API that always renders a polite region.

Retain stable region identity across renders, queue or replace rapid updates deliberately, cancel outstanding timers on replacement/unmount and preserve the final task state independently of announcement timing. Avoid duplicate announcements and unnecessary interruptions. Test repeated messages, rapid consecutive updates and actual assistive-technology announcement behavior; record unavailable AT checks as NOT_RUN. A fixed timeout is not proof of delivery.

## Color Contrast Requirements

```typescript
// Contrast ratio utilities
function getContrastRatio(foreground: string, background: string): number {
  const fgLuminance = getLuminance(foreground);
  const bgLuminance = getLuminance(background);
  const lighter = Math.max(fgLuminance, bgLuminance);
  const darker = Math.min(fgLuminance, bgLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

// WCAG requirements
const CONTRAST_REQUIREMENTS = {
  // Normal text (<18pt or <14pt bold)
  normalText: {
    AA: 4.5,
    AAA: 7,
  },
  // Large text (>=18pt or >=14pt bold)
  largeText: {
    AA: 3,
    AAA: 4.5,
  },
  // UI components and graphics
  uiComponents: {
    AA: 3,
  },
};
```

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
