import { expect, test } from "bun:test";
import { modelEntryFreshnessErrors } from "./validate";

test("stale models cannot remain current recommendations", () => {
  const now = new Date("2026-10-01T00:00:00Z");
  expect(modelEntryFreshnessErrors({ id: "old", status: "current-candidate" }, "2026-08-05", now)).toHaveLength(1);
  expect(modelEntryFreshnessErrors({ id: "old", status: "needs-verification" }, "2026-08-05", now)).toEqual([]);
  expect(modelEntryFreshnessErrors({ id: "new", status: "current-candidate", checked_at: "2026-10-01" }, "2026-08-05", now)).toEqual([]);
  expect(modelEntryFreshnessErrors({ id: "invalid", status: "needs-verification", checked_at: "invalid" }, "2026-08-05", now)).toHaveLength(1);
  expect(modelEntryFreshnessErrors({ id: "future", status: "needs-verification", checked_at: "2027-01-01" }, "2026-08-05", now)).toHaveLength(1);
});
