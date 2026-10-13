> Local governing process: [Design index](../../../../../../../README.md), [one brief](../../../../../../../process/intake.md) and [evidence/authority](../../../../../../../process/review-and-evidence.md). Full [license](../../../../../../../licenses/ui-design/LICENSE) retained. This is adapted reference knowledge under the current accepted target/task and host permissions; it is not a new skill, agent or external runtime.

> Local adaptation - Cascade Codex, 2026-10-07. Original: wshobson/agents@46891e7e60da0e52baf1050b7b6391b64e84c6d9, plugins/ui-design/skills/web-component-design/references/accessibility-patterns.md; SHA256 cecf82569bb7cbe89c96bd1d00ac0bee91d121515f19908a26e15634d13d3e3b. License: [retained MIT notice](../../../../../../../licenses/ui-design/LICENSE). This file is modified: foreign discovery/controller/artifact/tool/effect assumptions and the recorded incompatibilities are replaced below. Complete compatible topic text/examples are retained; excluded sections remain in immutable source audit evidence.
>
> Parent authority: Create Design owns intake, inquiry/direction/decision and prototype; Product owns truth/behavior, design-system owns reusable rules, accessibility/visual owners review evidence, and Frontend/host owns production, persistence, permissions and execution. Consult [the local governing phase](../../../../../../../process/prototype-and-build.md); this reference is progressively loaded for the actual task/platform, not another trigger or installation. Examples/dates/counts/styles are illustrative unless bound to actual evidence. External URLs are provenance/reference identities; operative steps are local, and no fetch, outreach, install, listener, publish or API call is implied.

# Accessibility Patterns Reference

## ARIA Patterns for Common Components

### Modal dialog behavior and verification

Prefer a verified project or native dialog primitive. A custom implementation must satisfy the full contract before production use:

- Establish a visible title and unique per-instance accessible name. Choose initial focus deliberately for the task and content; remember the opener, and return focus to it or a sensible surviving control on close.
- Keep Tab/Shift+Tab within the active modal, including an explicit no-focusable-content case. Exclude hidden, disabled and inert elements when identifying focusable controls. Keyboard dismissal and close/cancel follow the actual task contract.
- Make background content inert for interaction while the modal is active; aria-modal alone does not enforce this. Account for nested overlays so only the active layer owns focus and dismissal.
- Preserve pre-existing body scroll state/locks when opening and restore the previous value only when the owning layer closes. Do not overwrite another overlay's lock.
- Observe open, initial focus, first/last Tab wrapping, reverse Tab, Escape where supported, cancel, submit/failure where relevant, returned focus, a removed opener, empty focusable content and nested dialogs. Screen-reader behavior needs actual evidence or NOT_RUN.
- Destructive effects, data submission and production changes remain host-owned and require actual authorized scope. A dialog rendering is not evidence those effects occurred.

### Dropdown Menu

```tsx
import { useState, useRef, useEffect, type ReactNode } from "react";

interface DropdownProps {
  trigger: ReactNode;
  children: ReactNode;
  label: string;
}

export function Dropdown({ trigger, children, label }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "Escape":
        setIsOpen(false);
        triggerRef.current?.focus();
        break;
      case "ArrowDown":
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          focusNextItem(menuRef.current, 1);
        }
        break;
      case "ArrowUp":
        e.preventDefault();
        if (isOpen) {
          focusNextItem(menuRef.current, -1);
        }
        break;
      case "Home":
        e.preventDefault();
        focusFirstItem(menuRef.current);
        break;
      case "End":
        e.preventDefault();
        focusLastItem(menuRef.current);
        break;
    }
  };

  return (
    <div ref={containerRef} className="relative" onKeyDown={handleKeyDown}>
      <button
        ref={triggerRef}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={label}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2"
      >
        {trigger}
        <ChevronDownIcon
          aria-hidden="true"
          className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div
          ref={menuRef}
          role="menu"
          aria-orientation="vertical"
          className="absolute left-0 mt-1 min-w-48 rounded-md bg-white py-1 shadow-lg ring-1 ring-black/5"
        >
          {children}
        </div>
      )}
    </div>
  );
}

interface MenuItemProps {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}

export function MenuItem({ children, onClick, disabled }: MenuItemProps) {
  return (
    <button
      role="menuitem"
      disabled={disabled}
      onClick={onClick}
      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 disabled:opacity-50"
      tabIndex={-1}
    >
      {children}
    </button>
  );
}

function focusNextItem(menu: HTMLElement | null, direction: 1 | -1) {
  if (!menu) return;
  const items = menu.querySelectorAll<HTMLElement>(
    '[role="menuitem"]:not([disabled])',
  );
  const currentIndex = Array.from(items).indexOf(
    document.activeElement as HTMLElement,
  );
  const nextIndex = (currentIndex + direction + items.length) % items.length;
  items[nextIndex]?.focus();
}

function focusFirstItem(menu: HTMLElement | null) {
  menu
    ?.querySelector<HTMLElement>('[role="menuitem"]:not([disabled])')
    ?.focus();
}

function focusLastItem(menu: HTMLElement | null) {
  const items = menu?.querySelectorAll<HTMLElement>(
    '[role="menuitem"]:not([disabled])',
  );
  items?.[items.length - 1]?.focus();
}
```

### Combobox / Autocomplete

```tsx
import {
  useState,
  useRef,
  useId,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";

interface Option {
  value: string;
  label: string;
}

interface ComboboxProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder?: string;
}

export function Combobox({
  options,
  value,
  onChange,
  label,
  placeholder,
}: ComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const listboxRef = useRef<HTMLUListElement>(null);
  const inputId = useId();
  const listboxId = useId();

  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(inputValue.toLowerCase()),
  );

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    setIsOpen(true);
    setActiveIndex(-1);
  };

  const handleSelect = (option: Option) => {
    onChange(option.value);
    setInputValue(option.label);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          setActiveIndex((prev) =>
            prev < filteredOptions.length - 1 ? prev + 1 : prev,
          );
        }
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : prev));
        break;
      case "Enter":
        e.preventDefault();
        if (activeIndex >= 0 && filteredOptions[activeIndex]) {
          handleSelect(filteredOptions[activeIndex]);
        }
        break;
      case "Escape":
        setIsOpen(false);
        break;
    }
  };

  return (
    <div className="relative">
      <label htmlFor={inputId} className="block text-sm font-medium mb-1">
        {label}
      </label>
      <input
        ref={inputRef}
        id={inputId}
        type="text"
        role="combobox"
        aria-expanded={isOpen}
        aria-autocomplete="list"
        aria-controls={listboxId}
        aria-activedescendant={
          activeIndex >= 0 ? `option-${activeIndex}` : undefined
        }
        value={inputValue}
        placeholder={placeholder}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setTimeout(() => setIsOpen(false), 200)}
        className="w-full rounded-md border px-3 py-2"
      />

      {isOpen && filteredOptions.length > 0 && (
        <ul
          ref={listboxRef}
          id={listboxId}
          role="listbox"
          aria-label={label}
          className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 shadow-lg ring-1 ring-black/5"
        >
          {filteredOptions.map((option, index) => (
            <li
              key={option.value}
              id={`option-${index}`}
              role="option"
              aria-selected={activeIndex === index}
              onClick={() => handleSelect(option)}
              className={`cursor-pointer px-3 py-2 ${
                activeIndex === index ? "bg-blue-100" : "hover:bg-gray-100"
              } ${value === option.value ? "font-medium" : ""}`}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}

      {isOpen && filteredOptions.length === 0 && (
        <div className="absolute z-10 mt-1 w-full rounded-md bg-white px-3 py-2 shadow-lg">
          No results found
        </div>
      )}
    </div>
  );
}
```

### Form Validation

```tsx
import { useId, type FormEvent } from "react";

interface FormFieldProps {
  label: string;
  error?: string;
  required?: boolean;
  children: (props: {
    id: string;
    "aria-describedby": string | undefined;
    "aria-invalid": boolean;
  }) => ReactNode;
}

export function FormField({
  label,
  error,
  required,
  children,
}: FormFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
        {required && (
          <span aria-hidden="true" className="ml-1 text-red-500">
            *
          </span>
        )}
      </label>

      {children({
        id,
        "aria-describedby": error ? errorId : undefined,
        "aria-invalid": !!error,
      })}

      {error && (
        <p id={errorId} role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

// Usage
function ContactForm() {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    // Validation logic...
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <FormField label="Email" error={errors.email} required>
        {(props) => (
          <input
            {...props}
            type="email"
            required
            className={`w-full rounded border px-3 py-2 ${
              props["aria-invalid"] ? "border-red-500" : "border-gray-300"
            }`}
          />
        )}
      </FormField>

      <button
        type="submit"
        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded"
      >
        Submit
      </button>
    </form>
  );
}
```

## Skip Links

```tsx
export function SkipLinks() {
  return (
    <div className="sr-only focus-within:not-sr-only">
      <a
        href="#main-content"
        className="absolute left-4 top-4 z-50 rounded bg-blue-600 px-4 py-2 text-white focus:outline-none focus:ring-2"
      >
        Skip to main content
      </a>
      <a
        href="#main-navigation"
        className="absolute left-4 top-16 z-50 rounded bg-blue-600 px-4 py-2 text-white focus:outline-none focus:ring-2"
      >
        Skip to navigation
      </a>
    </div>
  );
}
```

## Live Regions

```tsx
import { useState, useEffect } from "react";

interface LiveAnnouncerProps {
  message: string;
  politeness?: "polite" | "assertive";
}

export function LiveAnnouncer({
  message,
  politeness = "polite",
}: LiveAnnouncerProps) {
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    // Clear first, then set - ensures screen readers pick up the change
    setAnnouncement("");
    const timer = setTimeout(() => setAnnouncement(message), 100);
    return () => clearTimeout(timer);
  }, [message]);

  return (
    <div
      role="status"
      aria-live={politeness}
      aria-atomic="true"
      className="sr-only"
    >
      {announcement}
    </div>
  );
}

// Usage in a search component
function SearchResults({
  results,
  loading,
}: {
  results: Item[];
  loading: boolean;
}) {
  const message = loading
    ? "Loading results..."
    : `${results.length} results found`;

  return (
    <>
      <LiveAnnouncer message={message} />
      <ul>{/* results */}</ul>
    </>
  );
}
```

## Focus management obligations

Use the existing verified dialog/overlay primitive and the full modal behavior specification above. A focus-query snippet is incomplete: hidden, disabled and inert controls must be excluded; zero focusable controls, nested overlays, a removed opener and delayed rendering require deliberate handling. Save the real opener before opening and restore focus to a connected, appropriate surviving control on close. Preserve other overlays' focus and scroll ownership. Observe forward/reverse Tab, keyboard dismissal, initial/returned focus and actual assistive-technology behavior; unavailable checks remain NOT_RUN.

## Color Contrast Utilities

These utilities cover opaque static sRGB colors and the explicitly selected text category only. Validate inputs and resolve actual composited foreground/background/states before using a ratio. A normal-text threshold does not cover large text, non-text or WCAG conformance; keep those criteria separate.

```tsx
// Check if colors meet WCAG requirements
function getContrastRatio(fg: string, bg: string): number {
  const getLuminance = (hex: string): number => {
    const rgb = parseInt(hex.slice(1), 16);
    const r = (rgb >> 16) & 0xff;
    const g = (rgb >> 8) & 0xff;
    const b = rgb & 0xff;

    const [rs, gs, bs] = [r, g, b].map((c) => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  };

  const l1 = getLuminance(fg);
  const l2 = getLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

function meetsWCAG(
  fg: string,
  bg: string,
  level: "AA" | "AAA" = "AA",
): boolean {
  const ratio = getContrastRatio(fg, bg);
  return level === "AAA" ? ratio >= 7 : ratio >= 4.5;
}
```

## Local WCAG 2.2 applicability and evidence extension

Record actual target version/level, platform, surfaces/states and source revision. This reference is a review menu; conformance requires all applicable target criteria and actual evidence, not a short list or score.

- Focus not obscured (2.4.11 AA): inspect focus with actual sticky headers, drawers, overlays and task states. A visible focus ring alone does not establish visibility of the focused control.
- Dragging movements (2.5.7 AA): provide a supported single-pointer alternative where the criterion applies, plus the keyboard operation required by the task. Test the real interaction; a viewport screenshot cannot prove it.
- Target size minimum (2.5.8 AA): web targets are at least 24×24 CSS px or have a documented spacing, equivalent-control, inline, user-agent or essential exception. Native iOS pt/Android dp conventions are separate and follow the actual platform; do not call a generic 44px rule universal web AA.
- Consistent help (3.2.6 A): check the actual repeated help mechanisms' relative order when relevant.
- Redundant entry (3.3.7 A): do not require re-entry of previously supplied information in the same process without an applicable reason; test actual preservation and supported selection/defaults.
- Accessible authentication (3.3.8 AA): when authentication is in scope, inspect cognitive-test requirements, alternatives and supported assistive mechanisms. Do not introduce authentication merely to exercise this check.
- Normal text contrast AA is 4.5:1; large text at least 18pt regular/14pt bold (24/about 18.667 CSS px) is 3:1. Enhanced AAA text is 7:1 normal/4.5:1 large. Document applicable exceptions and actual computed/rendered state evidence. Non-text contrast has its own applicable criterion.
- Text spacing/reflow checks exercise increased spacing and content ranges; they do not mandate a default letter-spacing value. Native controls, semantic names/roles/states and keyboard/focus/recovery are tested in the actual environment.

For every selected check record applicability, actual method/tool/environment, expected source, observation, finding and status. Unsupported tools, keyboard/AT or real-user checks remain NOT_RUN/GAP/BLOCKED as appropriate. Automated DOM tests, disabled simulations and AI personas do not certify accessibility or observed user success. Use the existing accessibility-review owner and the local review/evidence procedure.
