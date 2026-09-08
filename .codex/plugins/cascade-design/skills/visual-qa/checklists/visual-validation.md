# Visual QA Checklist

- [ ] Surface, expected source, artifact/frame identity, states, and viewport matrix are bound.
- [ ] Current rendered evidence is preferred when a runnable UI exists.
- [ ] Approved mockup and current capture match viewport/state/theme/content and relevant font/asset/DPR conditions.
- [ ] Mockup fidelity covers layout, dimensions, spacing, typography, colors, borders, radii, shadows, assets and component variants; differences have an owner/disposition.
- [ ] Comparison method, predefined tolerances/masks and approved deviations are explicit; no mask or baseline update hides the changed UI.
- [ ] Pixel-perfect claims are restricted to verified rows; host repairs return fresh captures before the finding closes.
- [ ] Desktop and mobile/narrow viewports plus long content and dynamic states are covered or explicitly disposed.
- [ ] Overlap, clipping, overflow, hierarchy, density, primary action, token/component consistency, visible interaction states, and mobile use are assessed.
- [ ] Product/UX, brand/content, design-system, accessibility, functional, and implementation findings have distinct owners.
- [ ] Every available governing brand source has an explicit `brand-content-fit` evidence-plan result tied to its exact source identity.
- [ ] Missing or blocked evidence is not reported as pass.
- [ ] Screenshots are not treated as functional acceptance.
- [ ] Baselines are not updated blindly.
- [ ] Sensitive data is absent from durable evidence.
