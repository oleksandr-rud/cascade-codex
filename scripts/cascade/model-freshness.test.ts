import { expect, test } from "bun:test";
import { modelCatalogFreshnessErrors, modelEntryFreshnessErrors } from "./validate";

test("per-entry catalogs do not expire fresh model evidence with the catalog marker", () => {
  const now = new Date("2026-11-07T00:00:00Z");
  const catalog = { checked_at: "2026-09-22", freshness_policy: "per-entry" };
  expect(modelCatalogFreshnessErrors(catalog, now)).toEqual([]);
  expect(modelEntryFreshnessErrors({ id: "fresh", status: "current-candidate", checked_at: "2026-10-01" }, catalog.checked_at, now)).toEqual([]);
  expect(modelEntryFreshnessErrors({ id: "stale", status: "current-candidate" }, catalog.checked_at, now)).toHaveLength(1);
  expect(modelEntryFreshnessErrors({ id: "stale", status: "current-candidate", checked_at: "2026-09-22" }, catalog.checked_at, now)).toHaveLength(1);
});

test("catalog date guards and legacy age limits remain enforced", () => {
  const now = new Date("2026-11-07T00:00:00Z");
  for (const checked_at of [undefined, "invalid", "2027-01-01"]) {
    expect(modelCatalogFreshnessErrors({ checked_at, freshness_policy: "per-entry" }, now)).toHaveLength(1);
  }
  for (const freshness_policy of [undefined, "unknown"]) {
    expect(modelCatalogFreshnessErrors({ checked_at: "2026-09-22", freshness_policy }, now)).toHaveLength(1);
  }
});

test("stale models cannot remain current recommendations", () => {
  const now = new Date("2026-10-01T00:00:00Z");
  expect(modelEntryFreshnessErrors({ id: "old", status: "current-candidate" }, "2026-08-05", now)).toHaveLength(1);
  expect(modelEntryFreshnessErrors({ id: "old", status: "needs-verification" }, "2026-08-05", now)).toEqual([]);
  expect(modelEntryFreshnessErrors({ id: "new", status: "current-candidate", checked_at: "2026-10-01" }, "2026-08-05", now)).toEqual([]);
  expect(modelEntryFreshnessErrors({ id: "invalid", status: "needs-verification", checked_at: "invalid" }, "2026-08-05", now)).toHaveLength(1);
  expect(modelEntryFreshnessErrors({ id: "future", status: "needs-verification", checked_at: "2027-01-01" }, "2026-08-05", now)).toHaveLength(1);
});
