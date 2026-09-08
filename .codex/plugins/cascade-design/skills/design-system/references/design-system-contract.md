# Reusable Design Rule Contract

A reusable design rule needs all of the following:

- a stable identity and rule type;
- observed or accepted reuse evidence;
- governing source and decision owner;
- user-visible behavior and non-goals;
- allowed variants, states, and transitions;
- responsive, density, content, accessibility, and motion constraints where applicable;
- consuming surfaces or components;
- visual, functional, and accessibility evidence requirements;
- migration, compatibility, invalidation, and supersession behavior.

A feature-specific UX choice stays with the feature owner until independent
reuse or an accepted platform/design-system source establishes broader scope.

## Approved mockup fidelity

When implementing an approved mockup, the default is faithful reproduction of
that design. The implementation owner preserves layout, component anatomy,
dimensions, spacing, typography, colors, borders, radii, shadows, icons/assets,
content hierarchy and visible states. Do not substitute a preferred layout,
approximate asset, or different component variant without an authorized design
change. Existing user-authorized deviations remain valid; do not ask again.

Bind the reference artifact/version, frame/state, viewport, theme, locale and
content fixture before comparison. Match browser zoom, device pixel ratio,
font/asset loading and capture conditions where relevant. Inspect the actual
mockup, not only its filename or text description. Missing fonts/assets or an
unavailable reference are explicit gaps, not permission to claim exact fidelity.

The host implementation loop is: inspect reference -> implement -> render at the
reference viewport/state -> compare screenshots side by side and, when useful,
with overlay/image diff -> repair observed differences -> recapture affected
surfaces. Code review, a build and functional tests cannot replace rendered
comparison. A visual-review skill returns findings; the host implements repairs.

Use "pixel-perfect" only for a verified matching reference viewport/state under
declared capture conditions and comparison tolerance. Default to no intentional
geometry, typography, color or asset deviation. An image-diff threshold is a
comparison aid, not permission for visible mismatches. Declare any tolerance or
mask before interpreting the result; limit masks to identified nondeterministic
content and never mask the changed UI or widen thresholds merely to pass.
Font rasterization/antialiasing differences must be distinguished from layout or
typography defects rather than treated as a universal zero-diff promise.

Also verify supported responsive widths and content/interaction states. A fixed
desktop mockup does not define every mobile layout or justify clipped text.
Use the accepted responsive/component rules for unspecified cases, document the
derived behavior and return unresolved material conflicts to the design owner.
Do not silently override either a mockup or an accepted accessibility/product
requirement. A resolved change updates the reference before it becomes a new
baseline; the implementation's current screenshot cannot approve itself.

Record the expected and actual artifact identities, viewport/state, comparison
method, remaining differences and approved deviations. Fidelity is `PASS` only
for inspected matching rows; missing comparison is `NOT_RUN`/`GAP` or `BLOCKED`
as appropriate. A review artifact's `READY` status is not visual acceptance.
No dedicated Designer or Frontend agent is required: design owns the reference,
the host implementation owner owns reproduction, and Visual QA owns comparison.
