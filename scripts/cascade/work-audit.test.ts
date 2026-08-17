import { describe, expect, test } from "bun:test";

import {
  admissionDriftIssues,
  automationPrompt,
  buildWorkAudit,
  classifyWorkDisposition,
  declaredReviewRunId,
  hasReconciliationIssues,
  parseActiveWorkRows,
  reviewSubjectDriftIssues,
  type ActiveWorkRow,
  type LaneAudit,
} from "./work-audit";

const row = (status: string, nextGate: string): ActiveWorkRow => ({
  lane: "W-101",
  status,
  request: "Do work",
  owner: "agent-engineer",
  next_gate: nextGate,
  files_areas: "files",
  dependencies: "none",
  evidence: "none",
});

describe("active work audit", () => {
  test("parses the thin active registry", () => {
    const rows = parseActiveWorkRows(`# Active Work

| Lane | Status | Request | Owner | Next Gate | Files/Areas | Dependencies | Evidence |
|---|---|---|---|---|---|---|---|
| \`W-101\` | \`OPEN\` | Do work | \`owner\` | \`implement-change after W-100\` | files | W-100 | \`NOT_RUN\` |
`);
    expect(rows).toEqual([
      {
        lane: "W-101",
        status: "OPEN",
        request: "Do work",
        owner: "owner",
        next_gate: "implement-change after W-100",
        files_areas: "files",
        dependencies: "W-100",
        evidence: "NOT_RUN",
      },
    ]);
  });

  test("rejects duplicate active lane IDs", () => {
    expect(() => parseActiveWorkRows(`# Active Work

| Lane | Status | Request | Owner | Next Gate | Files/Areas | Dependencies | Evidence |
|---|---|---|---|---|---|---|---|
| W-101 | OPEN | One | owner | next | files | none | none |
| W-101 | OPEN | Two | owner | next | files | none | none |
`)).toThrow("duplicate lanes");
  });

  test("detects stale admission identities in current active projections", () => {
    const issues = admissionDriftIssues({
      lane: "W-032",
      status: "IN_REVIEW",
      request: "bridge",
      owner: "agent-engineer",
      next_gate: "review W-031 v40/core@41 parity",
      files_areas: "intake",
      dependencies: "W-031",
      evidence: "current producer parity",
    }, {
      schema_version: 41,
      policy_bundle_version: "cascade-core@42",
      case_count: 981,
    });
    expect(issues).toEqual([
      "ERROR: admission source drift: active row advertises v40/core@41; current authority is v41/core@42 with 981 cases",
    ]);
  });

  test("detects source drift in the declared immutable review subject", () => {
    expect(reviewSubjectDriftIssues({
      ...row("IN_REVIEW", "review immutable r56"),
      lane: "W-004",
    }, {
      run_id: "candidate-review-r56",
      status: "DRIFTED",
      manifest_path: ".artifacts/product-evals/candidate-review-r56/execution/source-manifest.json",
      changed_sources: [{
        path: "scripts/cascade/evals.ts",
        expected_sha256: "a".repeat(64),
        actual_sha256: "b".repeat(64),
        reason: "CHANGED",
      }],
    })).toEqual([
      "ERROR: immutable review subject candidate-review-r56 has 1 current-source drift item(s); freeze a new subject before review",
    ]);
  });

  test("recognizes current and last-reviewed frozen candidate declarations", () => {
    expect(declaredReviewRunId(
      "The current candidate is frozen at run `candidate-r63`.",
    )).toBe("candidate-r63");
    expect(declaredReviewRunId(
      "The last reviewed candidate is frozen at run `candidate-r64`.",
    )).toBe("candidate-r64");
  });

  test("keeps blocked lanes blocked when their next gate mentions review", () => {
    expect(classifyWorkDisposition(
      row("BLOCKED", "wait for independent security review"),
      [],
    )).toBe("BLOCKED");
  });

  test("keeps running work out of the ready dispatch queue", () => {
    expect(classifyWorkDisposition(
      row("IN_PROGRESS", "validate current candidate"),
      [],
    )).toBe("IN_PROGRESS");
  });

  test("checks dependency language before a future review heuristic", () => {
    expect(classifyWorkDisposition(
      row("OPEN", "run review after W-100"),
      [],
    )).toBe("DEPENDENCY_PENDING");
  });

  test("keeps projection warnings visible without failing check mode", () => {
    expect(hasReconciliationIssues([
      { issues: ["WARNING: registry next gate differs from the lane packet"] } as LaneAudit,
    ])).toBe(false);
    expect(hasReconciliationIssues([
      { issues: ["ERROR: lane packet is missing"] } as LaneAudit,
    ])).toBe(true);
  });

  test("audits the current registry without granting authority", async () => {
    const report = await buildWorkAudit();
    expect(report.authority).toEqual({
      mode: "READ_ONLY_ANALYSIS",
      may_dispatch: false,
      may_mutate_work_state: false,
      may_run_external_actions: false,
    });
    expect(report.summary.active_lanes).toBeGreaterThan(0);
    expect(report.source.admission).toEqual({
      schema_version: 41,
      policy_bundle_version: "cascade-core@42",
      case_count: 981,
    });
    expect(["CURRENT", "DRIFTED", "NOT_DECLARED"]).toContain(
      report.source.review_subject.status,
    );
    if (report.source.review_subject.status === "NOT_DECLARED") {
      expect(report.source.review_subject.run_id).toBeNull();
    } else {
      expect(report.source.review_subject.run_id).not.toBeNull();
    }
    if (report.source.review_subject.status === "DRIFTED") {
      expect(report.source.review_subject.changed_sources.length).toBeGreaterThan(0);
    }
    expect(report.queue.every((item) => item.packet_path?.startsWith("docs/work/lanes/"))).toBe(true);
    expect(report.graphs).toEqual(expect.arrayContaining([
      expect.objectContaining({ graph_id: "WG-001", status: "ACTIVE" }),
    ]));
  });

  test("emits a durable, read-only scheduled-task prompt", () => {
    const prompt = automationPrompt();
    expect(prompt).toContain("$orchestrate-work");
    expect(prompt).toContain("scripts/cascade.ts work audit --json --check");
    expect(prompt).toContain("Do not edit files");
    expect(prompt).toContain("ask for explicit authorization");
  });

  test("emits a bounded orchestration prompt without expanding authority", () => {
    const prompt = automationPrompt("orchestrate");
    expect(prompt).toContain("already-authorized local work");
    expect(prompt).toContain("at most one smallest coherent slice");
    expect(prompt).toContain("never self-accept an independent review gate");
    expect(prompt).toContain("Do not create or dispatch agents, tasks, threads, worktrees");
    expect(prompt).toContain("Do not run paid/provider-backed");
  });
});
