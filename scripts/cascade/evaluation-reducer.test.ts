import { describe, expect, test } from "bun:test";

import { reduceEvaluations } from "./evaluation-reducer";
import {
  buildMechanicalEvaluationAuthority,
  observeFileExistsAuthority,
  validateTaskEventChronologyAuthority,
} from "./evaluation-authority";
import type { MechanicalEvaluation } from "./evaluations";
import type { SpecializedEvaluationReceipt } from "./harness-evaluation-receipts";
import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import { rootPath } from "./common";

const mechanical = {
  claim_ledger: [
    { claim_id: "C-1", class: "semantic-quality", status: "SUPPORTED" as const, reason: "mechanical", evidence: [] },
    { claim_id: "C-2", class: "safety-compliance", status: "SUPPORTED" as const, reason: "mechanical", evidence: [] },
    { claim_id: "C-R", class: "release-eligibility", status: "NOT_RUN" as const, reason: "not run", evidence: [] },
  ],
  status: "PASS" as const,
};

const declaration = {
  applicability: "REQUIRED" as const,
  route_ids: ["route:plan-change"],
  trace_ids: ["trace:1"],
  claim_ids: ["C-1"],
  reason: "Cascade route claim",
};

const specialized: SpecializedEvaluationReceipt = {
  schema_version: 2,
  specialized_evaluation_id: "run-specialized-evaluation",
  run_id: "run",
  campaign_id: "campaign",
  applicability: "REQUIRED",
  specialized_evaluator_identity: "harness-judge",
  source_manifest_digest: "a".repeat(64),
  execution_receipt_digest: "b".repeat(64),
  route_ids: declaration.route_ids,
  trace_ids: declaration.trace_ids,
  claim_ids: declaration.claim_ids,
  input_manifest_digest: "c".repeat(64),
  provider_trace_digest: "d".repeat(64),
  provider_output_digest: "e".repeat(64),
  evidence_artifacts: [
    { path: "specialized/input-manifest.json", sha256: "c".repeat(64) },
    { path: "specialized/provider-trace.jsonl", sha256: "d".repeat(64) },
    { path: "specialized/provider-output.json", sha256: "e".repeat(64) },
  ],
  claim_ledger: [{ claim_id: "C-1", class: "semantic-quality", status: "SUPPORTED", reason: "route passed", evidence: ["trace.jsonl"] }],
  status: "PASS",
  root_cause: "none",
  earliest_failure: null,
  residual_uncertainty: [],
  created_at: "2026-08-06T00:00:00.000Z",
};

describe("evaluation reducer", () => {
  test("aggregates missing required policy evidence as BLOCKED", () => {
    const result = buildMechanicalEvaluationAuthority({
      claims: [{
        id: "C-POLICY",
        class: "safety-compliance",
        required_oracle_ids: [],
        required_policy_ids: ["required-policy"],
        required_metric_ids: [],
        evidence_requirements: [],
        requires_calibration: false,
      } as never],
      task_results: [],
      calibration: null,
      population_authority: () => null,
    });
    expect(result.status).toBe("BLOCKED");
    expect(result.claim_ledger[0]).toMatchObject({ status: "BLOCKED" });
  });

  test("enforces exact driver/outcome chronology", () => {
    const event = (event_type: string, sequence: number, extra = {}) => ({
      event_type,
      sequence,
      driver: "direct-process",
      ...extra,
    });
    const valid = [
      event("LIFECYCLE", 0, { phase: "STARTED" }),
      event("ADAPTER", 1, { status: "READY" }),
      event("PROCESS", 2, {
        index: 0,
        type: "process-exec",
        status: "PASS",
        timed_out: false,
        aborted: false,
      }),
      event("ORACLE", 3, { status: "PASS" }),
      event("CLEANUP", 4, { status: "VERIFIED" }),
      event("LIFECYCLE", 5, {
        phase: "COMPLETED",
        outcome: "SUCCEEDED",
        status: "PASS",
      }),
    ];
    expect(() => validateTaskEventChronologyAuthority(valid, "task")).not.toThrow();
    const withoutAdapter = valid
      .filter((item) => item.event_type !== "ADAPTER")
      .map((item, sequence) => ({ ...item, sequence }));
    expect(() => validateTaskEventChronologyAuthority(withoutAdapter, "task"))
      .toThrow("exactly one ordered ADAPTER");
    const duplicateAdapter = [
      ...valid.slice(0, 2),
      event("ADAPTER", 2, { status: "READY" }),
      ...valid.slice(2).map((item) => ({ ...item, sequence: item.sequence + 1 })),
    ];
    expect(() => validateTaskEventChronologyAuthority(duplicateAdapter, "task"))
      .toThrow("duplicate singleton phases");
    const extraProcess = [
      ...valid.slice(0, 3),
      event("PROCESS", 3),
      ...valid.slice(3).map((item) => ({ ...item, sequence: item.sequence + 1 })),
    ];
    expect(() => validateTaskEventChronologyAuthority(extraProcess, "task"))
      .toThrow("duplicate singleton phases");
  });

  test("accepts legitimate fake, direct-process, and HTTP event paths", () => {
    const path = (
      driver: string,
      middle: Array<Record<string, unknown>>,
      outcome: string,
    ) => [
      { event_type: "LIFECYCLE", phase: "STARTED", driver },
      ...middle.map((event) => ({ driver, ...event })),
      {
        event_type: "LIFECYCLE",
        phase: "COMPLETED",
        driver,
        outcome,
        status: outcome === "SUCCEEDED"
          ? "PASS"
          : outcome === "FAILED"
            ? "FAIL"
            : "BLOCKED",
      },
    ].map((event, sequence) => ({ ...event, sequence }));

    const legitimate = [
      path("fake", [
        { event_type: "ADAPTER", status: "READY" },
        { event_type: "ACTION", status: "PASS" },
        { event_type: "CLEANUP", status: "VERIFIED" },
      ], "SUCCEEDED"),
      path("direct-process", [
        { event_type: "ADAPTER", status: "READY" },
        { event_type: "CLEANUP", status: "VERIFIED" },
      ], "BLOCKED"),
      path("direct-process", [
        { event_type: "ADAPTER", status: "READY" },
        { event_type: "BOUNDARY", phase: "EXECUTE", status: "TIMED_OUT" },
        { event_type: "RECOVERY", status: "RECOVERED" },
        { event_type: "CLEANUP", status: "VERIFIED" },
      ], "UNKNOWN_OUTCOME"),
      path("http-client", [
        { event_type: "ADAPTER", status: "READY" },
        { event_type: "HTTP", index: 0, type: "http-request", status: "PASS" },
        { event_type: "CLEANUP", status: "VERIFIED" },
      ], "SUCCEEDED"),
      path("http-client", [
        { event_type: "ADAPTER", status: "BLOCKED" },
        { event_type: "CLEANUP", status: "NOT_REQUIRED" },
      ], "BLOCKED"),
    ];
    for (const events of legitimate) {
      expect(() => validateTaskEventChronologyAuthority(events, "task"))
        .not.toThrow();
    }
  });

  test("derives terminal outcomes from paired runtime phases", () => {
    const path = (
      driver: string,
      middle: Array<Record<string, unknown>>,
      outcome: string,
    ) => [
      { event_type: "LIFECYCLE", phase: "STARTED", driver },
      ...middle.map((event) => ({ driver, ...event })),
      {
        event_type: "LIFECYCLE",
        phase: "COMPLETED",
        driver,
        outcome,
        status: outcome === "SUCCEEDED"
          ? "PASS"
          : outcome === "FAILED"
            ? "FAIL"
            : "BLOCKED",
      },
    ].map((event, sequence) => ({ ...event, sequence }));

    const directCleanupUnknown = path("direct-process", [
      { event_type: "ADAPTER", status: "READY" },
      {
        event_type: "PROCESS",
        index: 0,
        type: "process-exec",
        status: "PASS",
        timed_out: false,
        aborted: false,
      },
      { event_type: "CLEANUP", status: "UNKNOWN" },
    ], "UNKNOWN_OUTCOME");
    expect(() => validateTaskEventChronologyAuthority(
      directCleanupUnknown,
      "direct cleanup",
    )).not.toThrow();

    const httpCleanupUnknown = path("http-client", [
      { event_type: "ADAPTER", status: "READY" },
      { event_type: "HTTP", index: 0, type: "http-request", status: "PASS" },
      { event_type: "CLEANUP", status: "UNKNOWN" },
    ], "UNKNOWN_OUTCOME");
    expect(() => validateTaskEventChronologyAuthority(
      httpCleanupUnknown,
      "HTTP cleanup",
    )).not.toThrow();

    const pairedOracleTimeout = path("fake", [
      { event_type: "ADAPTER", status: "READY" },
      { event_type: "ACTION", status: "PASS" },
      { event_type: "ORACLE", status: "PASS" },
      { event_type: "BOUNDARY", phase: "ORACLE", status: "TIMED_OUT" },
      { event_type: "ORACLE", status: "FAIL" },
      { event_type: "CLEANUP", status: "VERIFIED" },
    ], "BLOCKED");
    expect(() => validateTaskEventChronologyAuthority(
      pairedOracleTimeout,
      "paired oracle",
    )).not.toThrow();

    const succeededAfterCancellation = path("fake", [
      { event_type: "ADAPTER", status: "READY" },
      { event_type: "ACTION", status: "PASS" },
      { event_type: "CLEANUP", status: "VERIFIED" },
      { event_type: "BOUNDARY", phase: "FINALIZE", status: "CANCELLED" },
    ], "SUCCEEDED");
    expect(() => validateTaskEventChronologyAuthority(
      succeededAfterCancellation,
      "finalize substitution",
    )).toThrow("terminal outcome is impossible");

    const ambiguousDirectWithoutRecovery = path("direct-process", [
      { event_type: "ADAPTER", status: "READY" },
      { event_type: "CLEANUP", status: "NOT_REQUIRED" },
    ], "UNKNOWN_OUTCOME");
    expect(() => validateTaskEventChronologyAuthority(
      ambiguousDirectWithoutRecovery,
      "missing recovery",
    )).toThrow("recovery phase");

    const unpairedOracleTimeout = path("fake", [
      { event_type: "ADAPTER", status: "READY" },
      { event_type: "ACTION", status: "PASS" },
      { event_type: "ORACLE", status: "PASS" },
      { event_type: "BOUNDARY", phase: "ORACLE", status: "TIMED_OUT" },
      { event_type: "CLEANUP", status: "VERIFIED" },
    ], "BLOCKED");
    expect(() => validateTaskEventChronologyAuthority(
      unpairedOracleTimeout,
      "unpaired oracle",
    )).toThrow("not paired");
  });

  test("rejects duplicate boundary and singleton runtime phases", () => {
    for (const phase of [
      "EXECUTE",
      "ORACLE",
      "RECOVERY",
      "CLEANUP",
      "FINALIZE",
    ]) {
      const middle = phase === "FINALIZE"
        ? [
            { event_type: "CLEANUP" },
            { event_type: "BOUNDARY", phase },
            { event_type: "BOUNDARY", phase },
          ]
        : [
            { event_type: "BOUNDARY", phase },
            { event_type: "BOUNDARY", phase },
            { event_type: "CLEANUP" },
          ];
      const events = [
        { event_type: "LIFECYCLE", phase: "STARTED" },
        ...middle,
        { event_type: "LIFECYCLE", phase: "COMPLETED" },
      ].map((event, sequence) => ({ ...event, sequence }));
      expect(() => validateTaskEventChronologyAuthority(events, "task"))
        .toThrow(`duplicate BOUNDARY/${phase}`);
    }

    const duplicateRecovery = [
      { event_type: "LIFECYCLE", phase: "STARTED" },
      { event_type: "RECOVERY" },
      { event_type: "RECOVERY" },
      { event_type: "CLEANUP" },
      { event_type: "LIFECYCLE", phase: "COMPLETED" },
    ].map((event, sequence) => ({ ...event, sequence }));
    expect(() => validateTaskEventChronologyAuthority(duplicateRecovery, "task"))
      .toThrow("duplicate singleton phases");

    const impossiblePreflightBoundary = [
      { event_type: "LIFECYCLE", phase: "STARTED" },
      { event_type: "BOUNDARY", phase: "PREFLIGHT" },
      { event_type: "CLEANUP" },
      { event_type: "LIFECYCLE", phase: "COMPLETED" },
    ].map((event, sequence) => ({ ...event, sequence }));
    expect(() => validateTaskEventChronologyAuthority(
      impossiblePreflightBoundary,
      "task",
    )).toThrow("unknown BOUNDARY phase");
  });

  test("file-exists rejects the repository directory and ancestor identity swaps", async () => {
    await expect(observeFileExistsAuthority(".")).rejects.toThrow(
      "regular final file",
    );
    await expect(
      observeFileExistsAuthority(
        rootPath(`.artifacts/missing-${crypto.randomUUID()}/evidence.txt`),
      ),
    ).resolves.toMatchObject({ present: false });
    const taskRoot = rootPath(`.artifacts/task-file-root-${crypto.randomUUID()}`);
    try {
      await mkdir(taskRoot, { recursive: true });
      await expect(
        observeFileExistsAuthority("../outside.txt", { root: taskRoot }),
      ).rejects.toThrow("canonical task-root-relative file");
      await expect(
        observeFileExistsAuthority("/tmp/outside.txt", { root: taskRoot }),
      ).rejects.toThrow("canonical task-root-relative file");
    } finally {
      await rm(taskRoot, { recursive: true, force: true });
    }
    const token = `file-observer-${crypto.randomUUID()}`;
    const parent = rootPath(`.artifacts/${token}`);
    const parked = rootPath(`.artifacts/${token}-parked`);
    const file = `${parent}/evidence.txt`;
    try {
      await mkdir(parent, { recursive: true });
      await writeFile(file, "trusted");
      await expect(observeFileExistsAuthority(file, {
        opened_checkpoint: async () => {
          await rename(parent, parked);
          await mkdir(parent);
          await writeFile(file, "replacement");
        },
      })).rejects.toThrow("ancestor changed identity");
    } finally {
      await rm(parent, { recursive: true, force: true });
      await rm(parked, { recursive: true, force: true });
    }
  });

  test("keeps specialized claims out of the general evaluator and joins both ledgers", () => {
    const result = reduceEvaluations({
      claims: [{ id: "C-1", class: "semantic-quality" }, { id: "C-2", class: "safety-compliance" }, { id: "C-R", class: "release-eligibility" }],
      mechanical,
      specialized_declaration: declaration,
      specialized_receipt: specialized,
      general_status: "PASS",
      general_claim_ledger: [
        { claim_id: "C-2", class: "safety-compliance", status: "SUPPORTED", reason: "general", evidence: [] },
        { claim_id: "C-R", class: "release-eligibility", status: "NOT_RUN", reason: "general", evidence: [] },
      ],
    });
    expect(result.status).toBe("PASS");
    expect(result.claim_ledger.map((entry) => entry.claim_id)).toEqual(["C-1", "C-2", "C-R"]);
  });

  test("rejects a general judgment for a specialized-locked claim", () => {
    expect(() => reduceEvaluations({
      claims: [{ id: "C-1", class: "semantic-quality" }, { id: "C-2", class: "safety-compliance" }, { id: "C-R", class: "release-eligibility" }],
      mechanical,
      specialized_declaration: declaration,
      specialized_receipt: specialized,
      general_status: "PASS",
      general_claim_ledger: [
        { claim_id: "C-1", class: "semantic-quality", status: "SUPPORTED", reason: "illegal", evidence: [] },
        { claim_id: "C-2", class: "safety-compliance", status: "SUPPORTED", reason: "general", evidence: [] },
        { claim_id: "C-R", class: "release-eligibility", status: "NOT_RUN", reason: "general", evidence: [] },
      ],
    })).toThrow("general evaluation claim IDs");
  });

  test("does not let either evaluator upgrade a failed mechanical gate", () => {
    const failedMechanical: MechanicalEvaluation = structuredClone(mechanical);
    failedMechanical.claim_ledger[0]!.status = "UNSUPPORTED";
    const result = reduceEvaluations({
      claims: [{ id: "C-1", class: "semantic-quality" }, { id: "C-2", class: "safety-compliance" }, { id: "C-R", class: "release-eligibility" }],
      mechanical: failedMechanical,
      specialized_declaration: declaration,
      specialized_receipt: specialized,
      general_status: "PASS",
      general_claim_ledger: [
        { claim_id: "C-2", class: "safety-compliance", status: "SUPPORTED", reason: "general", evidence: [] },
        { claim_id: "C-R", class: "release-eligibility", status: "NOT_RUN", reason: "general", evidence: [] },
      ],
    });
    expect(result.status).toBe("FAIL");
    expect(result.claim_ledger[0]!.status).toBe("UNSUPPORTED");
  });

  test("requires a specialized receipt for every harness declaration", () => {
    expect(() => reduceEvaluations({
      claims: [{ id: "C-1", class: "semantic-quality" }, { id: "C-2", class: "safety-compliance" }, { id: "C-R", class: "release-eligibility" }],
      mechanical,
      specialized_declaration: declaration,
      specialized_receipt: null,
      general_status: "PASS",
      general_claim_ledger: [],
    })).toThrow("requires exactly one specialized receipt");
  });

  test("rejects explicit specialized or general terminals that contradict their ledgers", () => {
    for (const status of ["FAIL", "BLOCKED"] as const) {
      const specializedTerminal = {
        ...specialized,
        status,
        root_cause: "evaluator",
        earliest_failure: "specialized terminal",
      };
      expect(() => reduceEvaluations({
        claims: [{ id: "C-1", class: "semantic-quality" }, { id: "C-2", class: "safety-compliance" }, { id: "C-R", class: "release-eligibility" }],
        mechanical,
        specialized_declaration: declaration,
        specialized_receipt: specializedTerminal,
        general_status: "PASS",
        general_claim_ledger: [
          { claim_id: "C-2", class: "safety-compliance", status: "SUPPORTED", reason: "general", evidence: [] },
          { claim_id: "C-R", class: "release-eligibility", status: "NOT_RUN", reason: "general", evidence: [] },
        ],
      })).toThrow("required claim ledger status PASS");
      expect(() => reduceEvaluations({
        claims: [{ id: "C-1", class: "semantic-quality" }, { id: "C-2", class: "safety-compliance" }, { id: "C-R", class: "release-eligibility" }],
        mechanical,
        specialized_declaration: declaration,
        specialized_receipt: specialized,
        general_status: status,
        general_claim_ledger: [
          { claim_id: "C-2", class: "safety-compliance", status: "SUPPORTED", reason: "general", evidence: [] },
          { claim_id: "C-R", class: "release-eligibility", status: "NOT_RUN", reason: "general", evidence: [] },
        ],
      })).toThrow("required claim ledger status PASS");
    }
  });

  test("accepts exact FAIL and BLOCKED terminals that match their ledgers", () => {
    for (const [status, claimStatus] of [
      ["FAIL", "UNSUPPORTED"],
      ["BLOCKED", "NOT_RUN"],
    ] as const) {
      const result = reduceEvaluations({
        claims: [{ id: "C-1", class: "semantic-quality" }, { id: "C-2", class: "safety-compliance" }, { id: "C-R", class: "release-eligibility" }],
        mechanical,
        specialized_declaration: declaration,
        specialized_receipt: specialized,
        general_status: status,
        general_claim_ledger: [
          { claim_id: "C-2", class: "safety-compliance", status: claimStatus, reason: "terminal", evidence: [] },
          { claim_id: "C-R", class: "release-eligibility", status: "NOT_RUN", reason: "general", evidence: [] },
        ],
      });
      expect(result.status).toBe(status);
    }
  });

  test("rejects PASS when a required judged claim is not supported", () => {
    expect(() => reduceEvaluations({
      claims: [{ id: "C-1", class: "semantic-quality" }, { id: "C-2", class: "safety-compliance" }, { id: "C-R", class: "release-eligibility" }],
      mechanical,
      specialized_declaration: declaration,
      specialized_receipt: specialized,
      general_status: "PASS",
      general_claim_ledger: [
        { claim_id: "C-2", class: "safety-compliance", status: "UNSUPPORTED", reason: "failed", evidence: [] },
        { claim_id: "C-R", class: "release-eligibility", status: "SUPPORTED", reason: "release", evidence: [] },
      ],
    })).toThrow("PASS conflicts");
  });
});
