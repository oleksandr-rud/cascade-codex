# Platform and component guidance

Detect the actual requested platform and established stack from supplied context.
Do not infer native/mobile framework from a project name. Load only the matching
local full examples from the vendor topic map. Examples are pinned and versioned;
inspect actual package/lockfile/API support before production adaptation.

## Match the platform

Use existing native/project components, semantic controls and navigation patterns.
Keep web CSS px, iOS points and Android dp distinct. Dense data work may need a
table or inspector; a narrow/mobile layout needs its own priority/reflow rather
than an arbitrary card conversion. Hardware keyboard, pointer, touch, zoom,
dynamic text and safe areas are actual requirements when supported by the target.

Pinned React Native/Reanimated, Tailwind-config, Material and SwiftUI examples
are reference knowledge. They do not authorize installing packages, changing
device settings or upgrading a framework. If a tool/version is unavailable,
record the exact example's applicability gap. A source command is not a runtime
step; the host owns implementation and environment operations.

## Define a component fully

Bind anatomy, intended job, data/inputs, output/actions, variants, states,
tokens, content limits, responsive behavior, keyboard/focus, accessibility,
motion and evidence. Prefer existing primitives. Native disabled controls
already suppress interaction; aria-disabled is a deliberate alternative needing
an activation guard, not an extra mandatory attribute.

Long/localized text, missing assets, high contrast, reduced motion and loading/
error/empty/selected states should not break the component. State transitions
must preserve meaningful content and avoid layout jumps. A decorative material
or motion effect must not delay an action or become its correctness dependency.

Use transform/opacity as a useful animation starting point, but judge other
effects against actual measured behavior and accessibility. Do not claim speed,
smoothness or device performance from CSS/source alone. Navigation completion
must not wait for a decorative animation callback. Reduced motion keeps a
readable final state and every required interaction.

## Responsive and visual craft

Compose through alignment, type rhythm, spacing and information priority before
adding containers/effects. Keep units, dates, comparison baselines, conditions
and current state where they affect a decision. Density follows the task; minimal
design does not erase essential information. Style guidance is an option under
the selected direction, not a universal ban on a suitable font, label or pattern.

Use existing licensed fonts/assets when available. Dataset names and source-site
links are candidate metadata, not acquired binary assets or permission to copy
brand images. Record fallback and any resulting comparison gap.

## Verification boundaries

Compile/test actual adapted implementation through its owner when code integration
is authorized. Empty test scaffolds and unexecuted example commands provide no
PASS. Meaningful assertions name the task state and observable consequence.
Rendered pair coverage, interaction checks and review findings remain separate.
Design-system proposes reusable rules; the host accepts/migrates them.
