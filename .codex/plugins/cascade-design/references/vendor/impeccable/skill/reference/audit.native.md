> Local governing process: [Design index](../../../../README.md), [one brief](../../../../process/intake.md) and [evidence/authority](../../../../process/review-and-evidence.md). Full [license](../../../../licenses/impeccable/LICENSE) retained. This is adapted reference knowledge under the current accepted target/task and host permissions; it is not a new skill, agent or external runtime.

> Adapted local reference from Impeccable (Paul Bakaus), pinned revision ffeda44b00b1e39bd901621dcd3a7e44ba184ce1. Original path: `skill/reference/audit.native.md`; source SHA256: `c2f18f1ed206de24fe97ec513655e5bfc867691c1f766ab62f21b06b2fcdd4bc`. Full Apache-2.0 LICENSE and NOTICE are retained. Changes: host-owned brief/authority/evidence substitutions and context-sensitive guidance; see the adaptation manifest. This is a topic reference, not an active skill/agent.

Implementation examples below are inert design knowledge. The Cascade controller and host own the current brief, accepted target authority, effect scope, implementation owner, artifact persistence and readiness. Use only available authorized tools; a reference grants no new action. Treat source-authored standards/API claims as a pinned snapshot, not fresh qualification.

Run systematic **technical** quality checks on a native app (`ios` / `android` / `adaptive`) and generate a comprehensive report. Don't fix issues; document them for other commands to address.

Review actual native source/rendered evidence for the accepted iOS/Android/adaptive target, using locally copied platform guidance with its notices and currency limits. Browser-only tools cannot prove native behavior. No foreign detector is required.

## Diagnostic Scan

Inspect the relevant dimensions. Optional source-authored score examples explain a finding; they are not calibrated conformity/readiness metrics.

### 1. Accessibility (VoiceOver / TalkBack)

**Check for**:
- **Missing labels**: interactive elements without accessibility labels, traits/roles, or state announcements
- **Reading and focus order**: illogical traversal, unreachable controls, focus lost on navigation
- **Text scaling**: fixed point sizes defeating Dynamic Type (iOS) or px instead of sp (Android); layouts that clip or overlap at large sizes
- **Touch targets**: below 44 pt (iOS) / 48 dp (Android), or crammed without spacing
- **Reduce Motion ignored**: parallax and large slides with no crossfade alternative
- **Contrast**: text failing contrast in either appearance, light or dark

**Score 0-4**: 0=Screen reader unusable, 1=Major gaps (unlabeled controls, no scaling), 2=Partial (labels exist, order or scaling breaks), 3=Good (minor gaps), 4=Excellent (labeled, ordered, scales cleanly, Reduce Motion honored)

### 2. Performance

**Check for**:
- **Slow startup**: heavy work on launch before first frame
- **Unvirtualized lists**: long content without FlatList / LazyColumn / List recycling
- **Main-thread jank**: synchronous work in scroll or gesture paths, dropped frames on 60/120 Hz
- **Wasted rendering**: unnecessary re-renders (React Native) or recompositions (Compose); missing memoization/keys
- **Image handling**: full-size images decoded for thumbnails, no caching
- **App weight**: bloated JS bundle or binary, unused dependencies

**Score 0-4**: 0=Janky everywhere, 1=Major problems (unvirtualized lists, slow launch), 2=Partial, 3=Good (minor improvements possible), 4=Excellent (fast launch, smooth scroll, lean)

### 3. Appearance & Theming

**Check for**:
- **Hard-coded colors**: raw hex instead of semantic system colors (iOS) / Material color roles (Android) / design tokens
- **Broken dark appearance**: missing dark variants, poor contrast in dark, quick inverts
- **Dynamic Color** (Android 12+): no static fallback scheme, or ignored where it fits
- **Off-platform materials**: hand-rolled visual materials where system materials or tonal elevation are expected

**Score 0-4**: 0=Hard-coded everything, 1=Minimal tokens, 2=Partial (tokens exist, inconsistently used), 3=Good (minor hard-coded values), 4=Excellent (semantic throughout, both appearances first-class)

### 4. Platform Conformance (CRITICAL)

Score against the loaded platform reference(s), including their slop tests. **Check for**:
- **Broken system gestures**: edge-swipe back disabled (iOS), predictive Back hijacked (Android)
- **Inset violations**: content under the notch, Dynamic Island, home indicator, status bar, or keyboard
- **Off-platform navigation**: custom global nav, overloaded tab bars, iOS patterns on Android or vice versa
- **Web-shaped controls**: HTML-style buttons, custom toggles, hover-dependent affordances
- **Icon drift**: mixed icon sets instead of SF Symbols / Material Symbols
- **System drift**: repeated shortcuts or decorative patterns that conflict with the product, platform, or established design system

**Score 0-4**: 0=Web port (nothing native), 1=Heavy violations (3-4 kinds), 2=Some (1-2 noticeable), 3=Mostly conformant (subtle issues), 4=Fully native (a fluent user trusts every screen)

### 5. Adaptivity

**Check for**:
- **Stretched phone layouts**: tablet/iPad rendering a scaled-up phone UI instead of using size classes / window size classes
- **Orientation breakage**: landscape clipping, ignored, or locked without reason
- **Keyboard/IME handling**: inputs hidden behind the keyboard, no inset adjustment
- **Multitasking**: iPad Split View / Android multi-window breaking layout
- **Foldables**: hinge-unaware layouts on posture change (Android)

**Score 0-4**: 0=One screen size only, 1=Major breakage (landscape or tablet broken), 2=Partial, 3=Good (minor edge cases), 4=Excellent (adapts across sizes, orientations, and windowing)

## Generate Report

### Evidence and findings summary

For each relevant dimension, name observed passed checks, concrete findings, coverage gaps and exact evidence. Lead with actual native task/navigation/input consequences and explained severity. A heuristic score, native appearance or conformance label does not prove full platform/WCAG compliance.
- Total issues found (count by severity: P0/P1/P2/P3)
- Top 3-5 critical issues
- Recommended next steps

### Detailed Findings by Severity

Tag every issue with **P0-P3 severity**:
- **P0 Blocking**: Prevents task completion. Fix immediately
- **P1 Major**: Significant difficulty or platform-guideline violation. Fix before release
- **P2 Minor**: Annoyance, workaround exists. Fix in next pass
- **P3 Polish**: Nice-to-fix, no real user impact. Fix if time permits

For each issue, document:
- **[P?] Issue name**
- **Location**: Screen, file, line
- **Category**: Accessibility / Performance / Theming / Conformance / Adaptivity
- **Impact**: How it affects users
- **Guideline**: The HIG / Material rule it violates (if applicable)
- **Recommendation**: How to fix it
- **Suggested command**: Which command to use (prefer: existing authorized local methods)

### Patterns & Systemic Issues

Identify recurring problems that indicate systemic gaps rather than one-off mistakes:
- "Hard-coded colors appear in 15+ screens, should use semantic colors"
- "Targets need the actual platform policy: source guidance uses 44pt iOS / 48dp Android, with each target inspected in its real input/layout context."

### Positive Findings

Note what's working well: good practices to maintain and replicate.

## Recommended actions

Order actions by observed task consequence and current authorized scope. The host implementation owner handles runtime/device changes; local review methods handle further evidence. Do not acquire/install tools or create external effects from a reference. A changed target/revision needs affected checks, not a repeated unrelated full suite.

**IMPORTANT**: Be thorough but actionable. Too many P3 issues creates noise. Focus on what actually matters.

**NEVER**:
- Report issues without explaining impact (why does this matter?)
- Provide generic recommendations (be specific and actionable)
- Skip positive findings (celebrate what works)
- Forget to prioritize (everything can't be P0)
- Report false positives without verification
