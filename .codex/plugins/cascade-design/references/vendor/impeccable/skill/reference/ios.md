> Local governing process: [Design index](../../../../README.md), [one brief](../../../../process/intake.md) and [evidence/authority](../../../../process/review-and-evidence.md). Full [license](../../../../licenses/impeccable/LICENSE) retained. This is adapted reference knowledge under the current accepted target/task and host permissions; it is not a new skill, agent or external runtime.

> Adapted local reference from Impeccable (Paul Bakaus), pinned revision ffeda44b00b1e39bd901621dcd3a7e44ba184ce1. Original path: `skill/reference/ios.md`; source SHA256: `43e958203ba86ab1527afcfa63df50a47c8b9448dadf4f6e338a9b8be8538648`. Full Apache-2.0 LICENSE and NOTICE are retained. Changes: host-owned brief/authority/evidence substitutions and context-sensitive guidance; see the adaptation manifest. This is a topic reference, not an active skill/agent.

Implementation examples below are inert design knowledge. The Cascade controller and host own the current brief, accepted target authority, effect scope, implementation owner, artifact persistence and readiness. Use only available authorized tools; a reference grants no new action. Treat source-authored standards/API claims as a pinned snapshot, not fresh qualification.

# iOS platform

For native iOS / iPadOS apps: SwiftUI, UIKit, React Native, Expo, Flutter shipping to Apple hardware.

On native, the visitor mode narrows what expression may override. HIG conformance governs structure, navigation, and interaction in every mode; brand expresses through the layer the platform leaves open (tint, type, motion, content).

## The iOS slop test

Would a fluent iPhone user trust this app, or pause at off-spec controls? The tell is "ported from a website": reinvented navigation bars, custom back gestures, web-shaped buttons, hover-dependent affordances. Default to the platform's components; depart only for a reason the user would thank you for.

## Layout & structure

- **Safe area.** Lay out inside the safe-area insets. No controls under the notch, Dynamic Island, home indicator, or rounded corners. 
- **System navigation.** Tab bar for 2–5 top-level sections (sections, never actions), navigation stack for hierarchy, sheet for self-contained tasks. No custom global nav, no mixed metaphors. 
- **Edge-swipe back stays alive.** The left-edge back gesture is muscle memory; never disable or overlay it. 
- **Large titles** on top-level screens, collapsing to inline on scroll. Deep detail screens stay inline. 

## Touch targets

- **44×44 pt minimum** for every tappable control, with breathing room between adjacent targets. 

## Typography

- **Dynamic Type.** Use the system text styles (Large Title through Caption) so text follows the user's reading size. No hard-coded point sizes. 
- **San Francisco carries the UI.** Body, labels, and controls stay on SF Pro / SF Compact; a brand face may appear in display moments. 
- **11 pt floor**; Body is 17 pt. 

## Color & materials

- **Semantic system colors** (label, secondaryLabel, systemBackground, separator, tint). They adapt to Dark Mode and increased contrast automatically; raw hex breaks there. 
- **Dark Mode is a first-class appearance.** Design and test both. 
- **One tint color** drives interactive elements; decoration is not its job. 
- **System materials** for blur and translucency behind bars and sheets; no hand-rolled glassmorphism. 

## Components & controls

- **Platform controls.** Switch, segmented control, stepper, system pickers, action sheets, alerts, context menus, swipe actions. Reinventing these for flavor is the most common native slop. 
- **SF Symbols** for iconography: baseline-aligned, Dynamic Type-aware, weight and scale variants. Don't mix in a web icon set. 
- **Deliberate modality.** Sheet for a focused dismissible sub-task, full-screen cover for immersion. Clear Cancel/Done; honor swipe-to-dismiss unless data loss requires a guard. 
- **Grouped/inset lists** for settings-shaped content; no bespoke card stacks. 

## Motion

- **System transitions.** Push slides, sheets rise, dismiss reverses the entrance. Custom transitions that fight the navigation model disorient. 
- **Honor Reduce Motion.** Crossfade instead of parallax and large slides. 

## Verifying the build

- **Capture actual native evidence** from an available authorized selected simulator/device, with actual device identity/class, viewport/state, revision and method. A browser mockup is not native runtime proof. No implicit build/install/device-setting write is granted.
- **Inspect appearance and Dynamic Type** when relevant and supported. Preserve user settings and, if an authorized check changes them, restore their actual prior values. Missing simulator/runtime/capture leaves an explicit evidence gap.
- **Simulators give breadth; posture, gestures, and performance need hardware.** Say which one produced the evidence.
