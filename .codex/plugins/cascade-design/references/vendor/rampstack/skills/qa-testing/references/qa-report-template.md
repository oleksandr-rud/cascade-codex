> Local governing process: [Design index](../../../../../README.md), [one brief](../../../../../process/intake.md) and [evidence/authority](../../../../../process/review-and-evidence.md). Full [license](../../../../../licenses/rampstack/LICENSE) retained. This is adapted reference knowledge under the current accepted target/task and host permissions; it is not a new skill, agent or external runtime.

> Local adaptation - Cascade Codex, 2026-10-07. Original: rampstackco/claude-skills@482c9bf74697fc1e311bd4dca5ce301f046c4b76, skills/qa-testing/references/qa-report-template.md; SHA256 31d1c63aa41ae736dcb10d9da93f96abdcb261606d265ace37452cc1a3bf8091. License: [retained MIT notice](../../../../../licenses/rampstack/LICENSE). This file is modified: foreign discovery/controller/artifact/tool/effect assumptions and the recorded incompatibilities are replaced below. Complete compatible topic text/examples are retained; excluded sections remain in immutable source audit evidence.
>
> Parent authority: Create Design owns intake, inquiry/direction/decision and prototype; Product owns truth/behavior, design-system owns reusable rules, accessibility/visual owners review evidence, and Frontend/host owns production, persistence, permissions and execution. Consult [the local governing phase](../../../../../process/review-and-evidence.md); this reference is progressively loaded for the actual task/platform, not another trigger or installation. Examples/dates/counts/styles are illustrative unless bound to actual evidence. External URLs are provenance/reference identities; operative steps are local, and no fetch, outreach, install, listener, publish or API call is implied.

# QA Report: [Page or Site URL]

**Date:** [YYYY-MM-DD]
**Tier:** [Smoke / Standard / Full]
**Tester:** [Name]
**Browser(s):** [List]
**Device(s):** [Desktop, mobile device, viewport width]

---

## Summary

**Overall:** [Pass / Pass with minor issues / Fail]

[1 to 3 sentences. The headline finding. What works, what's broken, what to do.]

**Critical issues found:** [N]
**Important issues found:** [N]
**Minor issues found:** [N]

---

## Smoke check

| Check | Pass | Notes |
|---|---|---|
| Title tag present and 30-60 chars | ☐ | |
| Canonical = production URL | ☐ | |
| Exactly one H1 | ☐ | |
| Zero images missing the alt attribute (empty `alt=""` on a decorative image passes) | ☐ | |
| Zero broken images | ☐ | |
| Schema present and valid | ☐ | |

---

## Standard audit (if applicable)

### Meta tags
| Field | Value | Pass |
|---|---|---|
| Title | | ☐ |
| Title length | | ☐ |
| Meta description | | ☐ |
| Meta description length | | ☐ |
| og:image | | ☐ |
| og:title | | ☐ |
| twitter:card | | ☐ |

### Structure
| Check | Result | Pass |
|---|---|---|
| H1 text | | ☐ |
| H2 count | | ☐ |
| Skipped heading levels | | ☐ |
| Page language declared | | ☐ |
| Favicon present | | ☐ |

### Images
| Check | Count |
|---|---|
| Total images | |
| Broken images | |
| Missing the alt attribute | |
| Decorative (empty `alt=""`, correct) | |

### Links
| Check | Count |
|---|---|
| External links | |
| External missing `noopener` | |

### Schema
[List schema types found and any validation issues]

---

## Full release matrix (if applicable)

### Accessibility
- [ ] Applicable accessibility criteria checked, actual tool findings and manual/AT evidence or NOT_RUN (evidence: __)
- [ ] No skipped heading levels
- [ ] All form fields have labels
- [ ] Skip link present
- [ ] Page operable by keyboard alone
- [ ] Focus indicators visible

### Performance
- [ ] Actual target performance budget and measured result where affected (budget/evidence: __)
- [ ] Actual applicable performance budget (LCP under 2.5s is an illustrative prior threshold, not a universal gate) (actual: __)
- [ ] Actual applicable performance budget (CLS under 0.1 is an illustrative prior threshold, not a universal gate) (actual: __)
- [ ] Actual applicable performance budget (INP under 200ms is an illustrative prior threshold, not a universal gate) (actual: __)

### Mobile responsiveness
- [ ] 375px viewport: layout intact, no horizontal scroll
- [ ] 768px viewport: layout adapts cleanly
- [ ] 1024px viewport: desktop variant works
- [ ] 1440px viewport: max-width holds, no awkward stretch
- [ ] Tap targets minimum 44px

### Cross-browser
- [ ] Chrome: tested
- [ ] Safari: tested
- [ ] Firefox: tested
- [ ] Edge: tested (if relevant audience)
- [ ] Mobile Safari: tested
- [ ] Mobile Chrome: tested

### Forms
- [ ] Relevant supported form paths succeed in an authorized isolated target/test data; record actual success, validation and recovery evidence
- [ ] Validation works as expected
- [ ] Error states display clearly
- [ ] Success states display clearly

### Links
- [ ] No broken internal links (sample of 20 tested)
- [ ] No broken external links (sample of 10 tested)

### Site infrastructure
- [ ] Sitemap returns 200 and lists canonical URLs
- [ ] robots.txt correct (allows production, blocks staging)
- [ ] HTTPS on all resources, no mixed content
- [ ] HSTS header present
- [ ] X-Frame-Options header present
- [ ] X-Content-Type-Options header present

### 404 handling
- [ ] 404 pages return HTTP 404 (not 200)
- [ ] 404 page provides helpful navigation

### Schema
- [ ] All schema validates in Rich Results Test
- [ ] Required properties filled
- [ ] No mixed signals (canonical vs sitemap vs internal links)

### Analytics
- [ ] Page view fires correctly
- [ ] Key events fire on user actions
- [ ] No PII in event parameters

### Cache behavior
- [ ] Cache headers appropriate for page type
- [ ] No stale content displayed
- [ ] Cache invalidation works after content updates

---

## Critical issues

[Things that block ship.]

### 1. [Issue title]
- **Where:** [URL or component]
- **What:** [What's broken]
- **Impact:** [Who is affected]
- **Fix:** [Specific remediation]

### 2. [Issue title]
[Same structure]

---

## Important issues

[Things that should be fixed but might not block ship.]

### 1. [Issue title]
- **Where:**
- **What:**
- **Impact:**
- **Fix:**

---

## Minor issues

[Polish items.]

- [Issue]
- [Issue]
- [Issue]

---

## Recommendations

[Suggestions beyond fixing the identified issues.]

- [Recommendation]
- [Recommendation]

---

## Sign-off

- [ ] All critical issues resolved
- [ ] Important issues resolved or have known-issue tickets
- [ ] Minor issues acknowledged

**Owner decision:** [actual recorded acceptance / proposed / unresolved]. Tool checks and this template do not authorize shipment.
**Approved by:** [Name]
**Date:** [YYYY-MM-DD]
