> Local governing process: [Design index](../../../../README.md), [one brief](../../../../process/intake.md) and [evidence/authority](../../../../process/review-and-evidence.md). Full [license](../../../../licenses/impeccable/LICENSE) retained. This is adapted reference knowledge under the current accepted target/task and host permissions; it is not a new skill, agent or external runtime.

> Adapted local reference from Impeccable (Paul Bakaus), pinned revision ffeda44b00b1e39bd901621dcd3a7e44ba184ce1. Original path: `skill/reference/android.md`; source SHA256: `9805ef30da85f08bfac5a2e07aad60f238d53e196e3a7d8858df7277a2181283`. Full Apache-2.0 LICENSE and NOTICE are retained. Changes: host-owned brief/authority/evidence substitutions and context-sensitive guidance; see the adaptation manifest. This is a topic reference, not an active skill/agent.

Implementation examples below are inert design knowledge. The Cascade controller and host own the current brief, accepted target authority, effect scope, implementation owner, artifact persistence and readiness. Use only available authorized tools; a reference grants no new action. Treat source-authored standards/API claims as a pinned snapshot, not fresh qualification.

# Android platform

For native Android apps: Jetpack Compose, Android Views, React Native, Expo, Flutter shipping to Android hardware.

On native, the visitor mode narrows what expression may override. Material Design 3 governs structure, navigation, and interaction in every mode; brand expresses through Material's theming (color roles, type scale, shape, motion). A Material-everywhere cross-platform app that also ships to iPhone still owes iOS its OS guarantees on that hardware: safe-area insets, Reduce Motion, edge-swipe back.

## The Android slop test

Would a fluent Android user trust this app, or trip on off-spec components? The most common tell is an iOS app wearing Android's skin: a bottom-only navigation copied from iPhone, a back arrow that ignores the system Back gesture, Cupertino-shaped switches and dialogs. Material 3 is the rulebook; follow its components and theme the brand through it.

## Layout & structure

- **Material navigation, matched to size.** Navigation bar (bottom, 3–5 destinations) on compact width; navigation rail or drawer on expanded width. Never ship a phone bottom-bar untouched on a tablet. 
- **System Back always works.** Honor the predictive Back gesture and Back button; never trap the user or hijack the gesture. 
- **Edge-to-edge with window insets.** Apply the status bar, navigation bar, display cutout, and IME insets so content never hides behind system bars or the keyboard. 
- **Top app bar for screen context**; pair with a FAB when the screen has a single primary action. 

## Touch targets

- **48×48 dp minimum** for every touch target, with at least 8 dp between them. 

## Typography

- **Material type scale.** Display, Headline, Title, Body, Label roles (large/medium/small each). Map text to roles; never hand-pick sizes per screen. 
- **Roboto is the system face**; theme a brand face in through the type scale, keeping body, labels, and controls legible and consistent. 
- **sp units, never fixed px**, so type follows the system font-size setting. 

## Color & theming

- **Material color roles** (primary, on-primary, surface, surface-variant, secondary-container, outline, error). Role tokens resolve light/dark and contrast variants automatically; raw hex breaks there. 
- **Dynamic Color (Material You)** where it fits: derive the scheme from the user's wallpaper on Android 12+, with a static fallback. 
- **Dark theme is a first-class scheme.** Design and test it; never a quick invert. 
- **Tonal elevation.** Convey elevation through the standard surface tonal levels (plus shadow where appropriate); no arbitrary drop shadows. 

## Components & motion

- **Material components.** Buttons (filled / tonal / outlined / text), FAB, switches, chips, snackbars, bottom sheets, Material dialogs, navigation bar/rail/drawer. Never port iOS controls or invent equivalents. 
- **One FAB, one primary action.** Never stack FABs or spend one on a secondary task. 
- **Snackbars for transient feedback** (actionable when useful, never a toast for that); dialogs only for decisions that must interrupt. 
- **Material motion patterns.** Container transform, shared-axis, fade-through, with standard easing and durations; honor the system Remove animations setting with a crossfade or instant cut. 

## Verifying the build

- **Capture actual native evidence** from an available authorized selected emulator/device. A browser mockup is a design candidate, not native runtime proof. Record actual target/device class, viewport/state, revision and capture method. No implicit build/install/device write is granted.
- **Inspect appearance and text scaling** where relevant and supported. If an authorized check changes a selected device setting, capture and restore its actual prior value rather than assume font_scale=1.0 or a default appearance. Missing native execution/capture is an explicit evidence gap.
- **Emulators give breadth; gestures, refresh rates, and performance need hardware.** Say which one produced the evidence.
