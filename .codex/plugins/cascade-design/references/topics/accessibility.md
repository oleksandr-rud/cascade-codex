# Accessibility: scoped criteria and corrected examples

Bind the target version/level, actual covered criteria, platform, states and
input modes. A review reports findings and remaining tests; it is not a legal
attestation. Imported short lists are check menus, not complete conformance.

## Contrast and targets

For WCAG AA text, use 4.5:1 for normal text; 3:1 applies to large text at least
18pt regular or 14pt bold (24 CSS px or about 18.667 CSS px). Non-text UI contrast
has its own scope. Web target minimum is 24 by 24 CSS px with the criterion's
spacing, equivalent, inline, user-agent and essential exceptions. An iOS 44pt
or Android 48dp recommendation is a separate native design rule, not a universal
web AA number. Test actual rendered foreground/background and state.

Primary provenance: [WCAG 2.2](https://www.w3.org/TR/WCAG22/) and
[target-size explanation](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).
The local facts above remain available offline; these links identify the standards,
not an external skill runtime.

For a 2.2 target, add applicable focus-not-obscured, dragging alternatives,
consistent help, redundant entry, target-size and accessible-authentication
checks to older 2.1 source coverage. Explicitly disposition applicability and
unavailable evidence. A clean automated scan or high Lighthouse score cannot
replace actual keyboard, focus, assistive-technology or criterion coverage.

## Prefer complete primitives

Use a correct native or established accessible project primitive before writing
a custom tooltip/dialog/slider. Some imported hand-written examples were removed
because they omit consequential behavior; their replacement requirements below
describe what to verify, not a claim of a tested implementation.

- Tooltip: focus remains on the trigger; a unique tooltip ID is related with
  aria-describedby. Escape is handled where the focused trigger/document receives
  it. Pointer can move over the popup without premature dismissal; the content
  remains available while applicable hover/focus persists. A tooltip has no
  interactive controls. An interactive popup needs another suitable pattern.
- Dialog: provide a unique accessible name, suitable initial focus, bounded tab
  navigation, Escape/close behavior and return focus. Make the actual background
  inert for a modal. Handle no-focusable content, disabled/hidden elements, nested
  dialogs and restoration of prior scroll-lock/inert state. aria-modal alone does
  not implement any of those behaviors.
- Slider: native range is usually preferable. A custom slider needs name,
  min/max/current value, meaningful value text/units, orientation, supported
  arrow/Home/End behavior, pointer/touch paths and bounded/degenerate-range
  handling. Provide a precise alternate control where appropriate and test
  supported assistive input; visual thumb movement alone is insufficient.
- Live region: choose appropriate urgency and stable polite/assertive regions.
  Do not accept an unused priority API or rely on a timer as announcement proof.
  Cancel outstanding work and verify actual assistive behavior in the target.

Pattern provenance: [tooltip](https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/)
and [slider](https://www.w3.org/WAI/ARIA/apg/patterns/slider/).
Examples still need actual target/version verification.

## Evidence and findings

Review semantics/names, labels/help/errors, keyboard/focus, contrast, target and
pointer alternatives, status messages, motion, zoom/narrow reflow and applicable
authentication. Native disabled HTML controls do not additionally need aria-disabled;
a focusable aria-disabled control needs an intentional activation guard.

Disposition every supplied scan by its source ID, including clean output; state
which checks ran, their environment and the remaining manual evidence. A source
review can be a coherent READY review while its keyboard or screen-reader test
is PLANNED. Missing governing definition is GAP; a defined test unable to run
is BLOCKED. Keep the coverage EV status identical to its evidence-plan row.

Do not copy code as certification, upload private pages/screenshots to third-party
validators, change real device settings or run production submissions from a
reference. The host owns operational permission and implementation repair.
