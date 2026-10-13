> Local governing process: [Design index](../../../../README.md), [one brief](../../../../process/intake.md) and [evidence/authority](../../../../process/review-and-evidence.md). Full [license](../../../../licenses/impeccable/LICENSE) retained. This is adapted reference knowledge under the current accepted target/task and host permissions; it is not a new skill, agent or external runtime.

> Adapted local reference from Impeccable (Paul Bakaus), pinned revision ffeda44b00b1e39bd901621dcd3a7e44ba184ce1. Original path: `skill/reference/extract.md`; source SHA256: `da8a999c4b16fee5ddd2f532a74ffab50ef26085311eeb6461689acb8e22c5ea`. Full Apache-2.0 LICENSE and NOTICE are retained. Changes: host-owned brief/authority/evidence substitutions and context-sensitive guidance; see the adaptation manifest. This is a topic reference, not an active skill/agent.

Implementation examples below are inert design knowledge. The Cascade controller and host own the current brief, accepted target authority, effect scope, implementation owner, artifact persistence and readiness. Use only available authorized tools; a reference grants no new action. Treat source-authored standards/API claims as a pinned snapshot, not fresh qualification.

# Extract Flow

Identify reusable patterns, components, and design tokens, then extract and consolidate them into the design system for systematic reuse.

## Step 1: Discover the Design System

Find the design system, component library, or shared UI directory. Understand its structure: component organization, naming conventions, design token structure, import/export conventions.

If no accepted system/location exists and the task needs one, resolve that material boundary with the current owner. Already accepted/authorized structure need not be asked again.

## Step 2: Identify Patterns

Look for extraction opportunities in the target area:

- **Repeated components**: Similar UI patterns used 3+ times (buttons, cards, inputs)
- **Hard-coded values**: Colors, spacing, typography, shadows that should be tokens
- **Inconsistent variations**: Multiple implementations of the same concept
- **Composition patterns**: Layout or interaction patterns that repeat (form rows, toolbar groups, empty states)
- **Type styles**: Repeated font-size + weight + line-height combinations
- **Animation patterns**: Repeated easing, duration, or keyframe combinations

Assess actual reuse value and shared intent; three uses is a useful rule of thumb, not a selection/admission gate. Premature abstraction can be worse than duplication.

## Step 3: Plan Extraction

Create a systematic plan:

- **Components to extract**: Which UI elements become reusable components?
- **Tokens to create**: Which hard-coded values become design tokens?
- **Variants to support**: What variations does each component need?
- **Naming conventions**: Component names, token names, prop names that match existing patterns
- **Migration path**: How to refactor existing uses to consume the new shared versions

**IMPORTANT**: Design systems grow incrementally. Extract what is clearly reusable now, not everything that might someday be reusable.

## Step 4: Extract & Enrich

Record candidate reusable versions and implementation guidance. The host implementation owner applies runtime changes within authorized scope; a design reference grants no automatic migration.

- **Components**: Clear props API with sensible defaults, proper variants for different use cases, accessibility built in (ARIA, keyboard navigation, focus management), documentation and usage examples
- **Design tokens**: Clear naming (primitive vs semantic), proper hierarchy and organization, documentation of when to use each token
- **Patterns**: When to use this pattern, code examples, variations and combinations

## Step 5: Migrate

Replace existing uses with the new shared versions:

- **Find all instances**: Search for the patterns you extracted
- **Replace systematically**: Update each use to consume the shared version
- **Test thoroughly**: Ensure visual and functional parity
- **Reviewed retirement**: identify obsolete implementations and parity evidence for the host owner; preserve unreviewed work.

## Step 6: Document

Update design system documentation:

- Add new components to the component library
- Document token usage and values
- Add examples and guidelines
- Update any Storybook or component catalog

**NEVER**:
- Extract one-off, context-specific implementations without generalization
- Create components so generic they are useless
- Extract without considering existing design system conventions
- Skip proper TypeScript types or prop documentation
- Create tokens for every single value (tokens should have semantic meaning)
- Extract things that differ in intent (two buttons that look similar but serve different purposes should stay separate)
