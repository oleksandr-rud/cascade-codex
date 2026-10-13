> Local governing process: [Design index](../../../../README.md), [one brief](../../../../process/intake.md) and [evidence/authority](../../../../process/review-and-evidence.md). Full [license](../../../../licenses/impeccable/LICENSE) retained. This is adapted reference knowledge under the current accepted target/task and host permissions; it is not a new skill, agent or external runtime.

> Adapted local reference from Impeccable (Paul Bakaus), pinned revision ffeda44b00b1e39bd901621dcd3a7e44ba184ce1. Original path: `skill/reference/optimize.md`; source SHA256: `197aa00aba42c85edf4cea25c4b79f4e12f2425454f6cd307f3d1fddfbd11ffd`. Full Apache-2.0 LICENSE and NOTICE are retained. Changes: host-owned brief/authority/evidence substitutions and context-sensitive guidance; see the adaptation manifest. This is a topic reference, not an active skill/agent.

Implementation examples below are inert design knowledge. The Cascade controller and host own the current brief, accepted target authority, effect scope, implementation owner, artifact persistence and readiness. Use only available authorized tools; a reference grants no new action. Treat source-authored standards/API claims as a pinned snapshot, not fresh qualification.

Performance is a feature. Identify the actual bottleneck for THIS interface, fix it, then measure. Don't optimize what isn't slow.

## Assess Performance Issues

Understand current performance and identify problems:

1. **Measure current state**:
   - **Core Web Vitals**: LCP, INP, CLS scores
   - **Load time**: Time to interactive, first contentful paint
   - **Bundle size**: JavaScript, CSS, image sizes
   - **Runtime performance**: Frame rate, memory usage, CPU usage
   - **Network**: Request count, payload sizes, waterfall

2. **Identify bottlenecks**:
   - What's slow? (Initial load? Interactions? Animations?)
   - What's causing it? (Large images? Expensive JavaScript? Layout thrashing?)
   - How bad is it? (Perceivable? Annoying? Blocking?)
   - Who's affected? (All users? Mobile only? Slow connections?)

**CRITICAL**: Measure before and after. Premature optimization wastes time. Optimize what actually matters.

## Optimization Strategy

Create systematic improvement plan:

### Loading Performance

**Optimize Images**:
- Use modern formats (WebP, AVIF)
- Proper sizing (don't load 3000px image for 300px display)
- Lazy loading for below-fold images
- Responsive images (`srcset`, `picture` element)
- Compress images (80-85% quality is usually imperceptible)
- Use CDN for faster delivery

```html
<img 
  src="hero.webp"
  srcset="hero-400.webp 400w, hero-800.webp 800w, hero-1200.webp 1200w"
  sizes="(max-width: 400px) 400px, (max-width: 800px) 800px, 1200px"
  loading="eager"
  alt="Hero image"
/>
```

**Reduce JavaScript Bundle**:
- Code splitting (route-based, component-based)
- Tree shaking (remove unused code)
- Remove unused dependencies
- Lazy load non-critical code
- Use dynamic imports for large components

```javascript
// Lazy load heavy component
const HeavyChart = lazy(() => import('./HeavyChart'));
```

**Optimize CSS**:
- Remove unused CSS
- Critical CSS inline, rest async
- Minimize CSS files
- Use CSS containment for independent regions

**Optimize Fonts**:
- Use `font-display: swap` or `optional`
- Subset only when actual required languages/glyphs and license permit; preserve fallback and complete content coverage.
- Preload critical fonts
- Use system fonts when appropriate
- Limit font weights loaded

```css
@font-face {
  font-family: 'CustomFont';
  src: url('/fonts/custom.woff2') format('woff2');
  font-display: swap; /* Show fallback immediately */
  /* Add unicode-range only from actual supported-language coverage, never an assumed Latin-only default. */
}
```

**Optimize Loading Strategy**:
- Critical resources first (async/defer non-critical)
- Preload critical assets
- Prefetch likely next pages
- Service worker for offline/caching
- HTTP/2 or HTTP/3 for multiplexing

### Rendering Performance

**Avoid Layout Thrashing**:
```javascript
// ❌ Bad: Alternating reads and writes (causes reflows)
elements.forEach(el => {
  const height = el.offsetHeight; // Read (forces layout)
  el.style.height = height * 2; // Write
});

// ✅ Good: Batch reads, then batch writes
const heights = elements.map(el => el.offsetHeight); // All reads
elements.forEach((el, i) => {
  el.style.height = heights[i] * 2; // All writes
});
```

**Optimize Rendering**:
- Use CSS `contain` property for independent regions
- Minimize DOM depth (flatter is faster)
- Reduce DOM size (fewer elements)
- Use `content-visibility: auto` for long lists
- Virtual scrolling for very long lists (react-window, TanStack Virtual)

**Reduce Paint & Composite**:
- Use `transform` and `opacity` for reliable movement, but allow blur, filters, masks, clip paths, shadows, and color shifts when they create meaningful polish
- Avoid casual animation of layout-driving properties (`width`, `height`, `top`, `left`, margins)
- Use `will-change` sparingly for known expensive operations
- Bound expensive paint areas for blur/filter/shadow effects (smaller and isolated is faster)

### Animation Performance

**GPU Acceleration**:
```css
/* ✅ GPU-accelerated (fast) */
.animated {
  transform: translateX(100px);
  opacity: 0.5;
}

/* ❌ CPU-bound (slow) */
.animated {
  left: 100px;
  width: 300px;
}
```

**Smooth 60fps**:
- Target 16ms per frame (60fps)
- Use `requestAnimationFrame` for JS animations
- Debounce/throttle scroll handlers
- Use CSS animations when possible
- Avoid long-running JavaScript during animations

**Intersection Observer**:
```javascript
// Efficiently detect when elements enter viewport
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      // Element is visible, lazy load or animate
    }
  });
});
```

### React/Framework Optimization

**React-specific**:
- Profile actual render/input cost before memoization.
- Use compiler or memo/callback APIs only when supported by the existing accepted target/version and a measured need.
- Virtualize long lists while preserving semantics and navigation.
- Split actual noncritical routes/components when the target supports it.
- Avoid blanket style rules about inline functions; verify the real bottleneck.
- Use React DevTools Profiler

**Framework-agnostic**:
- Minimize re-renders
- Debounce expensive operations
- Memoize computed values
- Lazy load routes and components

### Network Optimization

**Reduce Requests**:
- Combine small files
- Use SVG sprites for icons
- Inline small critical assets
- Remove unused third-party scripts

**Optimize APIs**:
- Use pagination (don't load everything)
- GraphQL to request only needed fields
- Response compression (gzip, brotli)
- HTTP caching headers
- CDN for static assets

**Optimize for Slow Connections**:
- Adaptive loading based on connection (navigator.connection)
- Optimistic UI updates
- Request prioritization
- Progressive enhancement

## Core Web Vitals Optimization

### Largest Contentful Paint (LCP < 2.5s)
- Optimize hero images
- Inline critical CSS
- Preload key resources
- Use CDN
- Server-side rendering

### Interaction to Next Paint (INP < 200ms)
- Break up long tasks
- Defer non-critical JavaScript
- Use web workers for heavy computation
- Reduce JavaScript execution time

### Cumulative Layout Shift (CLS < 0.1)
- Set dimensions on images and videos
- Don't inject content above existing content
- Use `aspect-ratio` CSS property
- Reserve space for ads/embeds
- Avoid animations that cause layout shifts

```css
/* Reserve space for image */
.image-container {
  aspect-ratio: 16 / 9;
}
```

## Performance Monitoring

**Available evidence tools**:
- Existing authorized browser/platform performance tools and actual local measurements.
- Existing project bundle analysis when available.
- Approved existing field metrics when available and consent/scope permit.
- No new monitoring, telemetry, service, package or external benchmark submission is a reference prerequisite.

**Key metrics**:
- LCP, INP, CLS (Core Web Vitals; INP replaced FID in March 2024)
- Time to Interactive (TTI)
- First Contentful Paint (FCP)
- Total Blocking Time (TBT)
- Bundle size
- Request count

**IMPORTANT**: Measure on real devices with real network conditions. Desktop Chrome with fast connection isn't representative.

**NEVER**:
- Optimize without measuring (premature optimization)
- Sacrifice accessibility for performance
- Break functionality while optimizing
- Use `will-change` everywhere (creates new layers, uses memory)
- Lazy load above-fold content
- Optimize micro-optimizations while ignoring major issues (optimize the biggest bottleneck first)
- Forget about mobile performance (often slower devices, slower connections)

## Verify Improvements

Test that optimizations worked:

- **Before/after metrics**: Compare Lighthouse scores
- **Actual field evidence**: use only existing authorized consent/scope-compatible metrics; no new tracking integration.
- **Different devices**: Test on low-end Android, not just flagship iPhone
- **Slow connections**: Throttle to 3G, test experience
- **No regressions**: Ensure functionality still works
- **User perception**: Does it *feel* faster?

When the user-facing numbers move, hand off to the local review-and-evidence procedure for the final pass.
