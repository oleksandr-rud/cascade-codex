> Local governing process: [Design index](../../../../../README.md), [one brief](../../../../../process/intake.md) and [evidence/authority](../../../../../process/review-and-evidence.md). Full [license](../../../../../licenses/ui-design/LICENSE) retained. This is adapted reference knowledge under the current accepted target/task and host permissions; it is not a new skill, agent or external runtime.

> Local adaptation - Cascade Codex, 2026-10-07. Original: wshobson/agents@46891e7e60da0e52baf1050b7b6391b64e84c6d9, plugins/ui-design/commands/create-component.md; SHA256 62fa43d304fce16d3a5f5104e56e777ea3a34e2feb4f5476f82cc836eae78793. License: [retained MIT notice](../../../../../licenses/ui-design/LICENSE). This file is modified: foreign discovery/controller/artifact/tool/effect assumptions and the recorded incompatibilities are replaced below. Complete compatible topic text/examples are retained; excluded sections remain in immutable source audit evidence.
>
> Parent authority: Create Design owns intake, inquiry/direction/decision and prototype; Product owns truth/behavior, design-system owns reusable rules, accessibility/visual owners review evidence, and Frontend/host owns production, persistence, permissions and execution. Consult [the local governing phase](../../../../../process/prototype-and-build.md); this reference is progressively loaded for the actual task/platform, not another trigger or installation. Examples/dates/counts/styles are illustrative unless bound to actual evidence. External URLs are provenance/reference identities; operative steps are local, and no fetch, outreach, install, listener, publish or API call is implied.

# Create Component

Guided workflow for creating new UI components following established patterns and best practices.

## Existing-context checks

Read the current brief, accepted Product/design-system decisions, target files, existing component conventions, package/lockfile and available evidence before asking anything. Reuse the host's actual paths and existing framework; missing foreign tracking directories do not require creation. Use [the local intake procedure](../../../../../process/intake.md).

Create Design owns prototype and presentation work. Production components belong to Frontend/host; accessibility and visual review return evidence/findings through their existing owners.

## Component Specification

Use the following fields only for consequential unknowns. Reuse already supplied props, states and accepted conventions. Do not run all question menus or require another approval round when scope/delegation is settled.

**CRITICAL RULES:**

- Ask ONE question per turn
- Wait for user response before proceeding
- Build complete specification before generating code

### Optional unresolved field 1: Component Name (if not provided)

```
What should this component be called?

Guidelines:
- Use PascalCase (e.g., UserCard, DataTable)
- Be descriptive but concise
- Avoid generic names like "Component" or "Widget"

Enter component name:
```

### Optional unresolved field 2: Component Purpose

```
What is this component's primary purpose?

1. Display content (cards, lists, text blocks)
2. Collect input (forms, selects, toggles)
3. Navigation (menus, tabs, breadcrumbs)
4. Feedback (alerts, toasts, modals)
5. Layout (containers, grids, sections)
6. Data visualization (charts, graphs, indicators)
7. Other (describe)

Enter number or description:
```

### Optional unresolved field 3: Component Complexity

```
What is the component's complexity level?

1. Simple - Single responsibility, minimal props, no internal state
2. Compound - Multiple parts, some internal state, few props
3. Complex - Multiple subcomponents, state management, many props
4. Composite - Orchestrates other components, significant logic

Enter number:
```

### Optional unresolved field 4: Props/Inputs Specification

```
What props/inputs should this component accept?

For each prop, provide:
- Name (camelCase)
- Type (string, number, boolean, function, object, array)
- Required or optional
- Default value (if optional)

Example format:
title: string, required
variant: "primary" | "secondary", optional, default: "primary"
onClick: function, optional

Enter props (one per line, empty line when done):
```

### Optional unresolved field 5: State Requirements

```
Does this component need internal state?

1. Stateless - Pure presentational, all data via props
2. Local state - Simple internal state (open/closed, hover, etc.)
3. Controlled - State managed by parent, component reports changes
4. Uncontrolled - Manages own state, exposes refs for parent access
5. Hybrid - Supports both controlled and uncontrolled modes

Enter number:
```

### Optional unresolved field 6: Composition Pattern (if complexity > Simple)

```
How should child content be handled?

1. No children - Self-contained component
2. Simple children - Accepts children prop for content
3. Named slots - Multiple content areas (header, body, footer)
4. Compound components - Exports subcomponents (e.g., Card.Header, Card.Body)
5. Render props - Accepts render function for flexibility

Enter number:
```

### Optional unresolved field 7: Accessibility Requirements

```
What accessibility features are needed?

1. Basic - Semantic HTML, aria-labels where needed
2. Keyboard navigation - Full keyboard support, focus management
3. Screen reader optimized - Live regions, announcements
4. Full WCAG AA - All applicable success criteria

Enter number:
```

### Optional unresolved field 8: Styling Approach

```
How should this component be styled?

Detected: {detected_approach}

1. Use detected approach ({detected_approach})
2. CSS Modules
3. Tailwind CSS
4. Styled Components / Emotion
5. Plain CSS/SCSS
6. Other (specify)

Enter number:
```

## Decision and evidence record

Record only applicable scope, inputs, selected mechanism, existing constraints, unresolved decisions and test obligations in the current host-owned brief/handoff. Do not create another state database or approval authority. Retain actual source/version/artifact references and the owner's decision. Use [the local evidence procedure](../../../../../process/review-and-evidence.md).

## Component Generation

### 1. Create Directory Structure

Based on detected patterns or ask user:

```
Where should this component be created?

Detected component directories:
1. src/components/{ComponentName}/
2. app/components/{ComponentName}/
3. components/{ComponentName}/
4. Other (specify path)

Enter number or path:
```

Create structure:

```
{component_path}/
├── index.ts                 # Barrel export
├── {ComponentName}.tsx      # Main component
├── {ComponentName}.test.tsx # Tests (if testing detected)
├── {ComponentName}.styles.{ext}  # Styles (based on approach)
└── types.ts                 # TypeScript types (if TS project)
```

### 2. Generate Component Code

Generate component based on gathered specifications.

**For React/TypeScript example:**

```tsx
// {ComponentName}.tsx
import { forwardRef } from 'react';
import type { {ComponentName}Props } from './types';
import styles from './{ComponentName}.styles.module.css';

/**
 * {ComponentName}
 *
 * {Purpose description}
 */
export const {ComponentName} = forwardRef<HTML{Element}Element, {ComponentName}Props>(
  ({ prop1, prop2 = 'default', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={styles.root}
        {...props}
      >
        {children}
      </div>
    );
  }
);

{ComponentName}.displayName = '{ComponentName}';
```

### 3. Generate Types

```tsx
// types.ts
import type { HTMLAttributes, ReactNode } from 'react';

export interface {ComponentName}Props extends HTMLAttributes<HTMLDivElement> {
  /** {prop1 description} */
  prop1: string;

  /** {prop2 description} */
  prop2?: 'primary' | 'secondary';

  /** Component children */
  children?: ReactNode;
}
```

### 4. Generate Styles

Based on styling approach:

**CSS Modules:**

```css
/* {ComponentName}.styles.module.css */
.root {
  /* Base styles */
}

.variant-primary {
  /* Primary variant */
}

.variant-secondary {
  /* Secondary variant */
}
```

**Tailwind:**

```tsx
// Inline in component
className={cn(
  'base-classes',
  variant === 'primary' && 'primary-classes',
  className
)}
```

### Behavioral verification obligations

Use the project's configured adapters; do not add empty passing tests or install a test framework from this reference. Select assertions from the actual component/task contract:

- Verify the semantic role, accessible name and supported states using real rendered content rather than placeholder roles or a renders-without-crashing test alone.
- Exercise the main action and check the observable result. For a selection/configuration task, verify the correct object's identity and current value, a valid edit, invalid-value feedback with recovery, cancel, and switching with unsaved work when these behaviors exist.
- Verify keyboard/focus behavior and relevant loading/empty/error/responsive states. Automated accessibility checks report their actual covered scope; supplement with manual/AT evidence or explicit NOT_RUN.
- If persistence is claimed, inspect the actual persisted source or reload/reopen result according to the product contract. A toast, mock API or prototype state is insufficient proof.
- Existing tokens/styles and a rendered comparison may support fidelity checks. Unexecuted scaffolds, planned assertions and unsupported states remain PLANNED/GAP/NOT_RUN, not PASS.

### 6. Generate Barrel Export

```tsx
// index.ts
export { {ComponentName} } from './{ComponentName}';
export type { {ComponentName}Props } from './types';
```

## Owner review

Present the concrete component/prototype decision and evidence when a material choice remains. Reuse actual user approval/delegation already given. Optional code/style/story examples can be inspected locally; a failed tool or silence does not approve a choice. Changes to behavior return to Product; reusable rules return to design-system; production implementation remains Frontend/host-owned.

## Storybook Integration (Optional)

If Storybook detected or user requests:

```tsx
// {ComponentName}.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { {ComponentName} } from './{ComponentName}';

const meta: Meta<typeof {ComponentName}> = {
  title: 'Components/{ComponentName}',
  component: {ComponentName},
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof {ComponentName}>;

export const Default: Story = {
  args: {
    prop1: 'Example',
  },
};

export const Primary: Story = {
  args: {
    ...Default.args,
    variant: 'primary',
  },
};

export const Secondary: Story = {
  args: {
    ...Default.args,
    variant: 'secondary',
  },
};
```

## Completion and handoff

Return the prototype or component proposal, actual paths/revisions and the checks actually observed. The host/Frontend owner implements accepted production code using the existing stack. Separate planned tests, executed behavior, visual evidence and remaining gaps. Follow [prototype handoff](../../../../../process/prototype-and-build.md) and [review evidence](../../../../../process/review-and-evidence.md).

## Error Handling

- If component name conflicts: Suggest alternatives, offer to overwrite
- If directory creation fails: Report error, suggest manual creation
- If framework not supported: Provide generic template, explain limitations
Return the applicable result in the current host-owned brief/handoff; any file path comes from the host scope. See [intake](../../../../../process/intake.md).
