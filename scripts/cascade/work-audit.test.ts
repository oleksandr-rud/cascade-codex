import { expect, test } from "bun:test";
import { classifyWorkDisposition, parseActiveWorkRows, type ActiveWorkRow } from "./work-audit";

function row(status: string, next_gate: string): ActiveWorkRow {
  return { lane: "W-001", status, next_gate, request: "fixture", owner: "fixture", files_areas: "fixture", dependencies: "none", evidence: "fixture" };
}

test("an empty canonical active registry is a valid initial target state", () => {
  expect(parseActiveWorkRows("| Lane | Status | Request | Owner | Next Gate | Files/Areas | Dependencies | Evidence |\n|---|---|---|---|---|---|---|---|\n")).toEqual([]);
  expect(() => parseActiveWorkRows("No structured registry was supplied")).toThrow("table is missing");
});

test("Work disposition consumes explicit status rather than next-gate language", () => {
  for (const gate of ["pending review after approval", "Очікуємо перевірку", "Ready to proceed"]) {
    expect(classifyWorkDisposition(row("READY", gate), [])).toBe("READY");
    expect(classifyWorkDisposition(row("PLANNED", gate), [])).toBe("DEPENDENCY_PENDING");
    expect(classifyWorkDisposition(row("UNKNOWN", gate), [])).toBe("NEEDS_RECONCILIATION");
  }
  expect(classifyWorkDisposition(row("READY", "fixture"), ["ERROR: stale binding"])).toBe("NEEDS_RECONCILIATION");
});
