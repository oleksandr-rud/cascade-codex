> Local governing process: [Design index](../../../../README.md), [one brief](../../../../process/intake.md) and [evidence/authority](../../../../process/review-and-evidence.md). Full [license](../../../../licenses/impeccable/LICENSE) retained. This is adapted reference knowledge under the current accepted target/task and host permissions; it is not a new skill, agent or external runtime.

> Adapted local reference from Impeccable (Paul Bakaus), pinned revision ffeda44b00b1e39bd901621dcd3a7e44ba184ce1. Original path: `skill/reference/adapt.native.md`; source SHA256: `96145c3a8904f251171bd1ffd64a0fa2311d052ee456f16eb5a9482fcc8768a0`. Full Apache-2.0 LICENSE and NOTICE are retained. Changes: host-owned brief/authority/evidence substitutions and context-sensitive guidance; see the adaptation manifest. This is a topic reference, not an active skill/agent.

Implementation examples below are inert design knowledge. The Cascade controller and host own the current brief, accepted target authority, effect scope, implementation owner, artifact persistence and readiness. Use only available authorized tools; a reference grants no new action. Treat source-authored standards/API claims as a pinned snapshot, not fresh qualification.

> **Additional context needed**: target platforms/devices and usage contexts.

Adapt an existing **native** design (`ios` / `android` / `adaptive`) to a different context: another device class, orientation, platform, or origin. The trap is treating adaptation as scaling. The job is rethinking the experience for the new context, inside the platform conventions of [ios.md](ios.md) / [android.md](android.md); read the target platform's reference before planning if Setup hasn't already.

## Assess Adaptation Challenge

1. **Source context**: what was it designed for, and what assumptions did it make? (Phone-only? Portrait-only? One platform's idioms? A website?)
2. **Target context**: which device class (phone, tablet, foldable), orientation, platform, and usage posture (one-handed on the go vs two-handed at rest)?
3. **What breaks**: navigation that doesn't fit the target, layouts that stretch instead of restructure, gestures or controls that don't exist there?

## Adaptation Strategies

### Phone → Tablet (iPad / large screens)

- **Restructure, don't stretch.** A scaled-up phone UI on a tablet is the failure mode. Use size classes (iOS) / window size classes (Android) to switch structure.
- **Navigation changes shape**: tab bar stays or becomes a sidebar on iPad; Android navigation bar becomes a rail or drawer on expanded width.
- **Use the width**: split view / master-detail (list + detail side by side), multi-column grids, popovers where phones used sheets.
- **Multitasking is a size, not an edge case**: iPad Split View and Android multi-window can hand you a phone-width window on a tablet; size-class-driven layout handles both for free.

### Orientation & foldables

- Landscape restructures (side-by-side panes, repositioned controls); never clip or letterbox. Lock orientation only when the task truly demands it.
- Foldables (Android): react to posture and hinge via window size classes; test folded, unfolded, and tabletop.

### Platform → platform (iOS ↔ Android)

Translate idioms; never transplant them:

| iOS | Android |
|---|---|
| Tab bar | Navigation bar / rail / drawer |
| Edge-swipe back, back chevron | Predictive Back gesture / button |
| Switch, segmented control, system pickers | Material switch, chips, Material pickers |
| Action sheet | Bottom sheet / Material dialog |
| SF Symbols, SF Pro, Dynamic Type | Material Symbols, Roboto, sp scaling |
| Semantic system colors, materials | Material color roles, tonal elevation |
| System push/sheet transitions | Container transform, shared-axis, fade-through |

Rebuild navigation and controls in the target's vocabulary; carry over the brand's expressive layer (palette intent, type accent, motion personality) through the target's theming system.

### Web → native (porting a website or web app)

Reconform, don't reflow. Replace web navigation with the platform's model, HTML-shaped controls with platform controls, hover affordances with touch-first ones, and px-based type with Dynamic Type / sp. Then treat the result to the full platform reference; the slop test there is the acceptance bar.

## Implement & Verify

- Drive structure from **size classes / window size classes**, never from device-model checks.
- Respect safe areas and window insets in every new configuration (notch, hinge, status bar, keyboard).
- Use available authorized simulators/hardware for the required device, orientation and multi-window scope. Record exactly which environment produced the evidence; unavailable hardware is a named gap, not permission to acquire/install or invent results.

When the adaptation feels native to each context, hand off to the local review-and-evidence procedure for the final pass.

**NEVER**:
- Ship a stretched phone layout on a tablet
- Port one platform's controls or navigation onto the other
- Hide core functionality on smaller devices (if it matters, make it work)
- Lock orientation to dodge a layout bug
- Trust simulators alone (posture, gestures, and performance need hardware)
