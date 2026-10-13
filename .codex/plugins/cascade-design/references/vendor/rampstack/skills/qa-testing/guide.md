> Local governing process: [Design index](../../../../README.md), [one brief](../../../../process/intake.md) and [evidence/authority](../../../../process/review-and-evidence.md). Full [license](../../../../licenses/rampstack/LICENSE) retained. This is adapted reference knowledge under the current accepted target/task and host permissions; it is not a new skill, agent or external runtime.

> Local adaptation - Cascade Codex, 2026-10-07. Original: rampstackco/claude-skills@482c9bf74697fc1e311bd4dca5ce301f046c4b76, skills/qa-testing/SKILL.md; SHA256 5984941bca7a14fc4cbd4040c903b01f609e68b6a9d8ccf38713877e92caed96. License: [retained MIT notice](../../../../licenses/rampstack/LICENSE). This file is modified: foreign discovery/controller/artifact/tool/effect assumptions and the recorded incompatibilities are replaced below. Complete compatible topic text/examples are retained; excluded sections remain in immutable source audit evidence.
>
> Parent authority: Create Design owns intake, inquiry/direction/decision and prototype; Product owns truth/behavior, design-system owns reusable rules, accessibility/visual owners review evidence, and Frontend/host owns production, persistence, permissions and execution. Consult [the local governing phase](../../../../process/review-and-evidence.md); this reference is progressively loaded for the actual task/platform, not another trigger or installation. Examples/dates/counts/styles are illustrative unless bound to actual evidence. External URLs are provenance/reference identities; operative steps are local, and no fetch, outreach, install, listener, publish or API call is implied.

# QA Testing

Verify that a page, feature, or site is working before declaring it shipped. Stack-agnostic. Console-snippet driven for speed.

This skill is faster than [local accessibility audit reference](../accessibility-audit/guide.md) (which goes deeper on WCAG) and [local review and evidence procedure](../../../../process/review-and-evidence.md) (which goes deeper on Core Web Vitals). Use this skill for general QA. Use the specialists for deep audits.

---

## When to use

- After every deploy (smoke test)
- After launching a new page or feature (standard audit)
- Before a major release (full release matrix)
- Investigating a "something looks off" report
- Pre-launch verification of a site or section

## When NOT to use

- Deep accessibility compliance work (use [local accessibility audit reference](../accessibility-audit/guide.md))
- Deep performance investigation (use [local review and evidence procedure](../../../../process/review-and-evidence.md))
- Code review or debugging (use [local prototype and build procedure](../../../../process/prototype-and-build.md))
- Initial site setup or technical SEO baseline (use [local review and evidence procedure](../../../../process/review-and-evidence.md))

---

## Relevant inputs and actual execution prerequisites

- The page URL or site under test
- The tier of QA needed (smoke, standard, or full)
- Browser dev tools access
- Any specific concerns to check beyond the standard tier

---

## The framework: 3 tiers

QA scales with the stakes. Pick the tier that matches the context.

| Tier | When to run | Time | Coverage |
|---|---|---|---|
| Smoke | After every deploy | 2 minutes | Critical signals only |
| Standard | New page or feature | 10 minutes | On-page basics, accessibility, structure |
| Full | Major release, pre-launch | 30+ minutes | Comprehensive across all dimensions |

### Tier 1: Smoke test

The 2-minute "did the deploy break anything obvious?" check. Run after every deploy.

Console snippet (paste in browser dev tools):

```javascript
const smoke = {
  title: document.title,
  titleLen: document.title.length,
  canonical: document.querySelector('link[rel="canonical"]')?.href,
  h1Count: document.querySelectorAll('h1').length,
  missingAlts: [...document.querySelectorAll('img')].filter(i => !i.hasAttribute('alt')).length,
  schema: [...document.querySelectorAll('script[type="application/ld+json"]')]
    .map(s => { try { return JSON.parse(s.innerText)['@type'] } catch(e) { return 'invalid' } }),
  brokenImages: [...document.querySelectorAll('img')].filter(i => !i.complete || i.naturalWidth === 0).length,
};
console.log(JSON.stringify(smoke, null, 2));
```

**Pass criteria:**
- Title exists and is 30 to 60 characters
- Canonical points at the production domain (never staging or preview URLs)
- Exactly one H1
- Zero images missing the `alt` attribute. An empty `alt=""` on a decorative image is correct markup and passes; only an absent attribute fails.
- Zero broken images
- Every schema block parses (no `invalid` entries in the snippet output). Whether the types are the right ones for the page is a Full-tier check, against the Rich Results Test.

If any of these fail, do not proceed with deeper testing until the smoke issue is fixed.

### Tier 2: Standard page audit

The 10-minute new-page-or-feature audit. Covers the on-page basics plus accessibility and structure.

Console snippet:

```javascript
const audit = {
  title: document.title,
  titleLen: document.title.length,
  canonical: document.querySelector('link[rel="canonical"]')?.href,
  metaDesc: document.querySelector('meta[name="description"]')?.content,
  metaDescLen: document.querySelector('meta[name="description"]')?.content?.length,
  ogImage: document.querySelector('meta[property="og:image"]')?.content,
  ogTitle: document.querySelector('meta[property="og:title"]')?.content,
  twitterCard: document.querySelector('meta[name="twitter:card"]')?.content,
  h1Count: document.querySelectorAll('h1').length,
  h1Text: document.querySelector('h1')?.innerText,
  h2Count: document.querySelectorAll('h2').length,
  h2s: [...document.querySelectorAll('h2')].map(h => h.innerText.trim().slice(0, 60)),
  totalImages: document.querySelectorAll('img').length,
  missingAlts: [...document.querySelectorAll('img')].filter(i => !i.hasAttribute('alt')).length,
  brokenImages: [...document.querySelectorAll('img')].filter(i => !i.complete || i.naturalWidth === 0).length,
  externalLinksWithoutNoopener: [...document.querySelectorAll('a[target="_blank"]')]
    .filter(a => !a.rel?.includes('noopener')).length,
  schema: [...document.querySelectorAll('script[type="application/ld+json"]')]
    .map(s => {
      try {
        const d = JSON.parse(s.innerText);
        return d['@graph'] ? d['@graph'].map(x => x['@type']) : d['@type'];
      } catch(e) { return 'invalid' }
    }),
  hasSkipLink: [...document.querySelectorAll('a[href^="#"]')].slice(0, 3)
    .some(a => /skip/i.test(a.textContent) && !!document.getElementById(a.getAttribute('href').slice(1))),
  pageLanguage: document.documentElement.lang || 'NOT SET',
  hasFavicon: !!document.querySelector('link[rel*="icon"]'),
};
console.log(JSON.stringify(audit, null, 2));
```

**Pass criteria** (in addition to smoke):
- Meta description: 120 to 160 characters
- og:image, og:title, twitter:card present
- H2s present and descriptive
- All external links with `target="_blank"` have `rel="noopener"`
- Page language declared (`lang` attribute on `<html>`)
- Favicon present

### Tier 3: Full release matrix

The 30-minute pre-launch check. Cover all dimensions.

| Dimension | Pass criteria |
|---|---|
| Smoke and standard | All pass |
| Accessibility (basic) | Inspect applicable accessibility criteria; report executed tool findings plus keyboard/AT evidence or NOT_RUN, with no universal score gate |
| Performance (basic) | Actual target performance budget and measured evidence where affected; no unapproved fixed numeric budget |
| Mobile responsiveness | Every viewport in the report template's responsiveness checklist |
| Cross-browser | Relevant supported browsers/devices from the actual brief; record tested environments and unavailable checks |
| Forms | Relevant forms use an authorized isolated target/test data; observe supported success/validation/recovery without production side effects |
| Internal links | No broken internal links (sample 20 random) |
| External links | Applicable links resolve as expected; authorization and observed status semantics govern, not a universal 200 requirement |
| Sitemap | Returns 200, lists canonical URLs only |
| robots.txt | Allows production crawlers, blocks staging if applicable |
| Security headers | HSTS, X-Frame-Options, X-Content-Type-Options present |
| HTTPS | All resources load over HTTPS, no mixed content |
| 404 handling | 404 pages return HTTP 404 (not soft 200) |
| Schema validation | Structured data checks only when the actual public-content target requires them; no private uploads without authorization |
| Analytics | Relevant events are inspected only in an authorized test environment; do not send production analytics from this reference |
| Cache behavior | Cache headers appropriate for page type |

For headers, run:

```javascript
fetch(window.location.origin, { method: 'HEAD' })
  .then(r => {
    const headers = {};
    for (const [k, v] of r.headers.entries()) headers[k] = v;
    console.log(JSON.stringify(headers, null, 2));
  });
```

Look for: `strict-transport-security`, `x-frame-options`, `x-content-type-options`.

---

## Specific QA snippets

### Image audit

```javascript
const imgs = [...document.querySelectorAll('img')].map(i => ({
  src: i.src.split('/').pop().split('?')[0].slice(0, 60),
  alt: i.hasAttribute('alt') ? (i.alt === '' ? 'DECORATIVE (empty alt)' : i.alt) : 'MISSING',
  width: i.naturalWidth,
  height: i.naturalHeight,
  loaded: i.complete && i.naturalWidth > 0,
}));
console.table(imgs);
console.log({
  total: imgs.length,
  broken: imgs.filter(i => !i.loaded).length,
  noAlt: imgs.filter(i => i.alt === 'MISSING').length,
  decorative: imgs.filter(i => i.alt.startsWith('DECORATIVE')).length,
});
```

### Heading hierarchy check

```javascript
const headings = [...document.querySelectorAll('h1, h2, h3, h4, h5, h6')].map(h => ({
  level: parseInt(h.tagName[1]),
  text: h.innerText.trim().slice(0, 80),
}));
console.table(headings);

// Check for skipped levels
const levels = headings.map(h => h.level);
let skipped = false;
for (let i = 1; i < levels.length; i++) {
  if (levels[i] > levels[i-1] + 1) {
    console.warn(`Skipped from H${levels[i-1]} to H${levels[i]}: "${headings[i].text}"`);
    skipped = true;
  }
}
if (!skipped) console.log('No skipped heading levels');
```

### Contrast spot-check

```javascript
function contrast(bg, fg) {
  function lum(hex) {
    return [hex.slice(1,3), hex.slice(3,5), hex.slice(5,7)]
      .map(h => parseInt(h, 16) / 255)
      .map(v => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4))
      .reduce((a, v, i) => a + v * [0.2126, 0.7152, 0.0722][i], 0);
  }
  const [l1, l2] = [lum(bg), lum(fg)];
  const r = ((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)).toFixed(2);
  return r + ':1 ' + (parseFloat(r) >= 4.5 ? 'PASS body' : parseFloat(r) >= 3 ? 'PASS large only' : 'FAIL');
}

// Examples
contrast('#FFFFFF', '#4B5563'); // body color check
contrast('#FFFFFF', '#9CA3AF'); // verify gray choices
```

### Form audit (per form)

```javascript
[...document.querySelectorAll('form')].forEach((form, i) => {
  const fields = [...form.querySelectorAll('input, select, textarea')].map(field => ({
    type: field.type || field.tagName.toLowerCase(),
    name: field.name,
    hasLabel: !!form.querySelector(`label[for="${field.id}"]`) || !!field.closest('label'),
    required: field.required,
  }));
  console.log(`Form ${i + 1}:`);
  console.table(fields);
});
```

### External link audit

```javascript
const externalLinks = [...document.querySelectorAll('a[href^="http"]')]
  .filter(a => !a.href.includes(window.location.host));
const issues = externalLinks.filter(a =>
  a.target === '_blank' && (!a.rel?.includes('noopener') || !a.rel?.includes('noreferrer'))
);
if (issues.length) {
  console.warn(`${issues.length} external links missing noopener/noreferrer:`);
  issues.forEach(a => console.warn(a.href));
} else {
  console.log(`All ${externalLinks.length} external links properly attributed`);
}
```

---

## Workflow

1. **Pick the tier.** Smoke for routine deploys. Standard for new work. Full for releases.
2. **Run the snippet.** Paste the appropriate console snippet, review output.
3. **Note failures.** Each failure either gets fixed before ship or filed as a known issue.
4. **For Standard tier**, add: visual review at 375px, 768px, and 1440px. Standard deliberately skips 1024px; the Full tier picks it up with the rest of the template's responsiveness checklist. Test the primary user flow.
5. **For Full tier**, add: cross-browser testing, Lighthouse audit, schema validation, security headers, 404 handling.
6. **Document.** Use the template in [`references/qa-report-template.md`](references/qa-report-template.md) for full audits.

---

## Failure patterns

- **Skipping smoke tests on "small" deploys.** Half of broken-production incidents start with a deploy that "looked safe."
- **Running snippets but not reading the output.** The console snippet is a tool. The judgment is reading what it returns.
- **Visual-only QA.** Eyeballing a page misses missing alt text, broken schema, missing canonical. Always run the snippet.
- **Single-browser testing.** Mobile Safari and Chrome differ enough to surprise you. Test at least Chrome and Safari.
- **No mobile QA.** Choose viewports from actual supported task/device/content requirements; a viewport capture is not physical-touch evidence.
- **Pass-fail with no remediation.** A failed QA must produce a fix or a known-issue ticket. Failed QA that ships unfixed is process theater.

---

## Output format

For smoke tests: console output is the report.

For standard and full audits: a markdown report at `qa-report-[date].md`. Use the template in [`references/qa-report-template.md`](references/qa-report-template.md).

---

## If required data is unavailable

This skill's output depends on data, measurements, or tool results it cannot generate on its own. When a required input, tool, or data source is unavailable or unverifiable, the sanctioned output is the deliverable with the gap stated: what was needed, what was actually obtained or verified, and which parts of the output are affected. Fabricating, estimating, or interpolating a required number to complete the deliverable is never sanctioned. A stated gap is a complete answer.

---

## Reference files

- [`references/qa-report-template.md`](references/qa-report-template.md) - Markdown report template for standard and full audits.
