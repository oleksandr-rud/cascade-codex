import { describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  buildCalibrationReceipt,
  createTaskAdapterRegistry,
  executeCampaignTask,
  type TaskAdapter,
} from "./campaigns";
import {
  resolveCampaign,
  type ResolvedCampaign,
  type TaskDefinition,
} from "./simulation-definitions";
import { valueDigest } from "./common";
import { signPolicyConfirmationReceipt } from "./campaign-policies";

async function fixture(): Promise<ResolvedCampaign> {
  return resolveCampaign("evals/campaigns/simulation-contract-smoke.json");
}

async function withTaskRoot<T>(
  run: (taskRoot: string) => Promise<T>,
): Promise<T> {
  const taskRoot = await mkdtemp(join(tmpdir(), "cascade-campaign-task-"));
  try {
    return await run(taskRoot);
  } finally {
    await rm(taskRoot, { recursive: true, force: true });
  }
}

describe("campaign calibration reducer", () => {
  test("calibrates aligned framework treatment rankings", async () => {
    const resolved = await fixture();
    const receipt = buildCalibrationReceipt(
      resolved,
      "calibration-test",
      "test-aggregator",
      new Date("2026-07-30T00:00:00Z"),
    );
    expect(receipt?.status).toBe("CALIBRATED");
    expect(receipt?.metric_results[0]?.rank_correlation).toBe(1);
    expect(receipt?.metric_results[0]?.linear_correlation).toBeGreaterThan(0.9);
    expect(receipt?.framework_fixture).toBe(true);
  });

  test("fails closed when a required risk slice is absent", async () => {
    const resolved = await fixture();
    resolved.referenceScores = resolved.referenceScores.filter(
      (row) => row.slice !== "risk",
    );
    const receipt = buildCalibrationReceipt(
      resolved,
      "missing-slice-test",
      "test-aggregator",
      new Date("2026-07-30T00:00:00Z"),
    );
    expect(receipt?.status).toBe("UNCALIBRATED");
    expect(receipt?.metric_results[0]?.missing_slices).toEqual([
      "reference:baseline-v1:risk",
      "reference:candidate-a-v1:risk",
      "reference:candidate-b-v1:risk",
    ]);
  });

  test("marks non-fixture calibration stale after its freshness window", async () => {
    const resolved = await fixture();
    resolved.calibration = {
      ...resolved.calibration!,
      framework_fixture: false,
      reference: {
        ...resolved.calibration!.reference,
        kind: "expert-labelled",
      },
    };
    const receipt = buildCalibrationReceipt(
      resolved,
      "stale-test",
      "test-aggregator",
      new Date("2028-01-01T00:00:00Z"),
    );
    expect(receipt?.status).toBe("STALE");
  });

  test("fails closed when the baseline is omitted", async () => {
    const resolved = await fixture();
    resolved.calibration = {
      ...resolved.calibration!,
      treatment_ids: ["candidate-a-v1", "candidate-b-v1"],
    };
    const receipt = buildCalibrationReceipt(
      resolved,
      "missing-baseline-test",
      "test-aggregator",
      new Date("2026-07-30T00:00:00Z"),
    );
    expect(receipt?.status).toBe("UNCALIBRATED");
    expect(receipt?.blockers).toContain(
      "calibration treatment set does not include the baseline",
    );
  });

  test("fails closed when any reference score lacks human labels", async () => {
    const resolved = await fixture();
    delete resolved.referenceScores[0]!.human_label;
    delete resolved.referenceScores[0]!.judge_label;
    const receipt = buildCalibrationReceipt(
      resolved,
      "sparse-label-test",
      "test-aggregator",
      new Date("2026-07-30T00:00:00Z"),
    );
    expect(receipt?.status).toBe("UNCALIBRATED");
    expect(receipt?.blockers).toContain(
      "human agreement threshold not satisfied",
    );
  });
});

describe("campaign task lifecycle contract", () => {
  test("persists typed, attributed fake-task results through the public seam", async () => {
    const resolved = await fixture();
    const task = resolved.tasks[0]!;
    await withTaskRoot(async (taskRoot) => {
      const result = await executeCampaignTask({
        resolved,
        task,
        task_root: taskRoot,
        operator_identity: "operator:test",
        target_actor_identity: "target:test",
        platform: "test-platform",
      });

      expect(result.status).toBe("PASS");
      expect(result.outcome).toBe("SUCCEEDED");
      expect(result.operator_identity).toBe("operator:test");
      expect(result.target_actor_identity).toBe("target:test");
      expect(result.platform).toBe("test-platform");
      expect(result.cleanup.status).toBe("VERIFIED");
      expect(result.recovery.status).toBe("NOT_REQUIRED");
      expect(result.events.map((event) => event.sequence)).toEqual(
        result.events.map((_, index) => index),
      );
      expect(result.events[0]).toMatchObject({
        event_type: "LIFECYCLE",
        phase: "STARTED",
      });
      expect(result.events.at(-1)).toMatchObject({
        event_type: "LIFECYCLE",
        phase: "COMPLETED",
        outcome: "SUCCEEDED",
      });

      const persisted = JSON.parse(
        await readFile(join(taskRoot, "result.json"), "utf8"),
      );
      expect(persisted).toMatchObject({
        outcome: "SUCCEEDED",
        operator_identity: "operator:test",
        target_actor_identity: "target:test",
        platform: "test-platform",
      });
    });
  });

  test("requires action-bound confirmation receipts on the public task seam", async () => {
    const resolved = await fixture();
    const task = resolved.tasks[0]!;
    const governingPolicy = resolved.policies[0]!;
    governingPolicy.effect = "REQUIRE_CONFIRMATION";
    governingPolicy.confirmation_authority = {
      key_id: "campaign-test-key",
      secret_env: "CASCADE_TEST_CONFIRMATION_SECRET",
      allowed_confirmers: ["human:test"],
    };
    const confirmationSecret = "campaign-confirmation-secret";
    await withTaskRoot(async (taskRoot) => {
      const blocked = await executeCampaignTask({
        resolved,
        task,
        task_root: taskRoot,
        operator_identity: "operator:test",
        target_actor_identity: "target:test",
      });
      expect(blocked.status).toBe("BLOCKED");
      expect(blocked.policy_decisions[0]?.decision).toBe(
        "REQUIRE_CONFIRMATION",
      );
    });

    const issuedAt = new Date(Date.now() - 1_000).toISOString();
    const expiresAt = new Date(Date.now() + 60_000).toISOString();
    await withTaskRoot(async (taskRoot) => {
      const receipts = (task.actions ?? []).map((action, index) => {
        const receipt = {
          schema_version: 1 as const,
          receipt_id: `confirmation-${index}`,
          run_id: `task:${task.id}`,
          policy_id: governingPolicy.id,
          policy_version: governingPolicy.version,
          policy_digest: valueDigest(governingPolicy),
          campaign_id: resolved.campaign.id,
          task_id: task.id,
          action_index: index,
          action_digest: valueDigest(action),
          decision: "CONFIRM" as const,
          issued_at: issuedAt,
          expires_at: expiresAt,
          confirmed_by: "human:test",
          authority_key_id: "campaign-test-key",
          signature: "",
        };
        receipt.signature = signPolicyConfirmationReceipt(
          { ...receipt, signature: undefined },
          confirmationSecret,
        );
        return receipt;
      });
      const confirmed = await executeCampaignTask({
        resolved,
        task,
        task_root: taskRoot,
        operator_identity: "operator:test",
        target_actor_identity: "target:test",
        confirmation_receipts: receipts,
        confirmation_secrets: {
          "campaign-test-key": confirmationSecret,
        },
      });
      expect(confirmed.status).toBe("PASS");
      expect(
        confirmed.policy_decisions.every(
          (decision) =>
            decision.decision === "ALLOW" &&
            decision.confirmation_receipt_digest !== null,
        ),
      ).toBe(true);
    });
  });

  test("blocks an unsupported driver without claiming cleanup or execution", async () => {
    const resolved = await fixture();
    const task: TaskDefinition = {
      ...resolved.tasks[0]!,
      driver: { type: "agent-runtime" },
    };
    await withTaskRoot(async (taskRoot) => {
      const result = await executeCampaignTask({
        resolved,
        task,
        task_root: taskRoot,
        operator_identity: "operator:test",
        target_actor_identity: "target:test",
      });

      expect(result.status).toBe("BLOCKED");
      expect(result.outcome).toBe("BLOCKED");
      expect(result.side_effects).toBe("NONE");
      expect(result.cleanup.status).toBe("NOT_REQUIRED");
      expect(result.events).toContainEqual(
        expect.objectContaining({
          event_type: "ADAPTER",
          status: "BLOCKED",
        }),
      );
    });
  });

  test("rejects an operator acting as the target", async () => {
    const resolved = await fixture();
    await withTaskRoot(async (taskRoot) => {
      await expect(
        executeCampaignTask({
          resolved,
          task: resolved.tasks[0]!,
          task_root: taskRoot,
          operator_identity: "same-identity",
          target_actor_identity: "same-identity",
        }),
      ).rejects.toThrow(
        "task operator and target identities must be non-empty and distinct",
      );
    });
  });

  test("cancels before dispatch without invoking adapter recovery or cleanup", async () => {
    const resolved = await fixture();
    const controller = new AbortController();
    controller.abort();
    await withTaskRoot(async (taskRoot) => {
      const result = await executeCampaignTask({
        resolved,
        task: resolved.tasks[0]!,
        task_root: taskRoot,
        operator_identity: "operator:test",
        target_actor_identity: "target:test",
        signal: controller.signal,
      });

      expect(result.status).toBe("BLOCKED");
      expect(result.outcome).toBe("CANCELLED");
      expect(result.side_effects).toBe("NONE");
      expect(result.recovery.status).toBe("NOT_REQUIRED");
      expect(result.cleanup.status).toBe("NOT_REQUIRED");
      expect(
        result.events.some((event) => event.event_type === "ACTION"),
      ).toBe(false);
    });
  });

  test("records recovery and fails closed when adapter outcome is ambiguous", async () => {
    const resolved = await fixture();
    const task: TaskDefinition = {
      ...resolved.tasks[0]!,
      driver: { type: "agent-runtime" },
    };
    const adapter: TaskAdapter = {
      driver: "agent-runtime",
      async execute() {
        throw new Error("connection lost after dispatch");
      },
      async recover() {
        return {
          status: "UNSUPPORTED",
          attempted: false,
          reason: "provider has no idempotent read-back",
        };
      },
      async cleanup() {
        return {
          status: "UNKNOWN",
          attempted: true,
          verified: false,
          residual_resources: ["remote-operation"],
          reason: "remote cleanup could not be verified",
        };
      },
    };
    await withTaskRoot(async (taskRoot) => {
      const result = await executeCampaignTask({
        resolved,
        task,
        task_root: taskRoot,
        operator_identity: "operator:test",
        target_actor_identity: "target:test",
        adapters: createTaskAdapterRegistry([adapter]),
      });

      expect(result.status).toBe("BLOCKED");
      expect(result.outcome).toBe("UNKNOWN_OUTCOME");
      expect(result.side_effects).toBe("UNKNOWN");
      expect(result.recovery.status).toBe("UNSUPPORTED");
      expect(result.cleanup.status).toBe("UNKNOWN");
      expect(result.cleanup.residual_resources).toEqual(["remote-operation"]);
      expect(result.earliest_failure).toContain(
        "connection lost after dispatch",
      );
      expect(result.events.map((event) => event.event_type)).toContain(
        "RECOVERY",
      );
      expect(result.events.map((event) => event.event_type)).toContain(
        "CLEANUP",
      );
    });
  });

  test("bounds a non-cooperative adapter and still writes terminal cleanup evidence", async () => {
    const resolved = await fixture();
    const task: TaskDefinition = {
      ...resolved.tasks[0]!,
      driver: { type: "agent-runtime" },
      timeout_ms: 20,
    };
    const adapter: TaskAdapter = {
      driver: "agent-runtime",
      async execute() {
        return await new Promise(() => {});
      },
      async recover() {
        return {
          status: "RECOVERED",
          attempted: true,
          reason: "recovery fenced the abandoned adapter operation",
        };
      },
      async cleanup() {
        return {
          status: "VERIFIED",
          attempted: true,
          verified: true,
          residual_resources: [],
          reason: null,
        };
      },
    };
    await withTaskRoot(async (taskRoot) => {
      const started = performance.now();
      const result = await executeCampaignTask({
        resolved,
        task,
        task_root: taskRoot,
        operator_identity: "operator:test",
        target_actor_identity: "target:test",
        adapters: createTaskAdapterRegistry([adapter]),
      });

      expect(performance.now() - started).toBeLessThan(1_000);
      expect(result.status).toBe("BLOCKED");
      expect(result.outcome).toBe("UNKNOWN_OUTCOME");
      expect(result.side_effects).toBe("UNKNOWN");
      expect(result.recovery.status).toBe("RECOVERED");
      expect(result.cleanup.status).toBe("VERIFIED");
      expect(result.events).toContainEqual(
        expect.objectContaining({
          event_type: "BOUNDARY",
          phase: "EXECUTE",
          status: "TIMED_OUT",
        }),
      );
      expect(result.events.at(-1)).toMatchObject({
        event_type: "LIFECYCLE",
        phase: "COMPLETED",
        outcome: "UNKNOWN_OUTCOME",
      });
    });
  });

  test("bounds non-cooperative recovery and cleanup phases", async () => {
    const resolved = await fixture();
    const task: TaskDefinition = {
      ...resolved.tasks[0]!,
      driver: { type: "agent-runtime" },
      timeout_ms: 20,
    };
    const adapter: TaskAdapter = {
      driver: "agent-runtime",
      async execute() {
        return {
          outcome: "UNKNOWN_OUTCOME",
          earliest_failure: "provider result is ambiguous",
          side_effects: "UNKNOWN",
          policy_decisions: [],
          events: [],
        };
      },
      async recover() {
        return await new Promise(() => {});
      },
      async cleanup() {
        return await new Promise(() => {});
      },
    };
    await withTaskRoot(async (taskRoot) => {
      const started = performance.now();
      const result = await executeCampaignTask({
        resolved,
        task,
        task_root: taskRoot,
        operator_identity: "operator:test",
        target_actor_identity: "target:test",
        adapters: createTaskAdapterRegistry([adapter]),
      });

      expect(performance.now() - started).toBeLessThan(1_000);
      expect(result.outcome).toBe("UNKNOWN_OUTCOME");
      expect(result.recovery.status).toBe("FAILED");
      expect(result.cleanup.status).toBe("UNKNOWN");
      expect(result.events).toContainEqual(
        expect.objectContaining({
          event_type: "BOUNDARY",
          phase: "RECOVERY",
          status: "TIMED_OUT",
        }),
      );
      expect(result.events).toContainEqual(
        expect.objectContaining({
          event_type: "BOUNDARY",
          phase: "CLEANUP",
          status: "TIMED_OUT",
        }),
      );
    });
  });

  test("bounds a non-cooperative oracle and still completes cleanup", async () => {
    const resolved = await fixture();
    const task: TaskDefinition = {
      ...resolved.tasks[0]!,
      timeout_ms: 20,
    };
    await withTaskRoot(async (taskRoot) => {
      const started = performance.now();
      const result = await executeCampaignTask({
        resolved,
        task,
        task_root: taskRoot,
        operator_identity: "operator:test",
        target_actor_identity: "target:test",
        oracle_evaluator: {
          async evaluate() {
            return await new Promise(() => {});
          },
        },
      });

      expect(performance.now() - started).toBeLessThan(1_000);
      expect(result.status).toBe("BLOCKED");
      expect(result.outcome).toBe("BLOCKED");
      expect(result.cleanup.status).toBe("VERIFIED");
      expect(result.oracle_results[0]?.error).toContain("exceeded 20ms bound");
      expect(result.events).toContainEqual(
        expect.objectContaining({
          event_type: "BOUNDARY",
          phase: "ORACLE",
          status: "TIMED_OUT",
        }),
      );
    });
  });

  test("latches parent cancellation during cleanup before terminal status", async () => {
    const resolved = await fixture();
    const task: TaskDefinition = {
      ...resolved.tasks[0]!,
      driver: { type: "agent-runtime" },
      timeout_ms: 500,
    };
    let notifyCleanupStarted!: () => void;
    const cleanupStarted = new Promise<void>((resolveStarted) => {
      notifyCleanupStarted = resolveStarted;
    });
    const adapter: TaskAdapter = {
      driver: "agent-runtime",
      async execute() {
        return {
          outcome: "SUCCEEDED",
          earliest_failure: null,
          side_effects: "KNOWN",
          policy_decisions: [],
          events: [],
          final_state: {},
        };
      },
      async recover() {
        return {
          status: "NOT_REQUIRED",
          attempted: false,
          reason: null,
        };
      },
      async cleanup() {
        notifyCleanupStarted();
        await Bun.sleep(30);
        return {
          status: "VERIFIED",
          attempted: true,
          verified: true,
          residual_resources: [],
          reason: null,
        };
      },
    };
    await withTaskRoot(async (taskRoot) => {
      const controller = new AbortController();
      const pending = executeCampaignTask({
        resolved,
        task,
        task_root: taskRoot,
        operator_identity: "operator:test",
        target_actor_identity: "target:test",
        adapters: createTaskAdapterRegistry([adapter]),
        oracle_evaluator: {
          async evaluate(oracle) {
            return {
              oracle_id: oracle.id,
              type: oracle.type,
              status: "PASS",
            };
          },
        },
        signal: controller.signal,
      });
      await cleanupStarted;
      controller.abort();
      const result = await pending;

      expect(result.status).toBe("BLOCKED");
      expect(result.outcome).toBe("CANCELLED");
      expect(result.cleanup.status).toBe("VERIFIED");
      expect(result.recovery).toEqual({
        status: "NOT_REQUIRED",
        attempted: false,
        reason: "execution completed before cancellation; cleanup still ran",
      });
      expect(result.events).toContainEqual(
        expect.objectContaining({
          event_type: "BOUNDARY",
          phase: "FINALIZE",
          status: "CANCELLED",
        }),
      );
      expect(result.events.at(-1)).toMatchObject({
        event_type: "LIFECYCLE",
        phase: "COMPLETED",
        outcome: "CANCELLED",
      });
    });
  });

  test("runs recovery after an adapter reports cancellation post-dispatch", async () => {
    const resolved = await fixture();
    const task: TaskDefinition = {
      ...resolved.tasks[0]!,
      driver: { type: "agent-runtime" },
    };
    const adapter: TaskAdapter = {
      driver: "agent-runtime",
      async execute() {
        return {
          outcome: "CANCELLED",
          earliest_failure: "operator cancelled after dispatch",
          side_effects: "NONE",
          policy_decisions: [],
          events: [],
        };
      },
      async recover() {
        return {
          status: "RECOVERED",
          attempted: true,
          reason: "adapter restored its local session",
        };
      },
      async cleanup() {
        return {
          status: "VERIFIED",
          attempted: true,
          verified: true,
          residual_resources: [],
          reason: null,
        };
      },
    };
    await withTaskRoot(async (taskRoot) => {
      const result = await executeCampaignTask({
        resolved,
        task,
        task_root: taskRoot,
        operator_identity: "operator:test",
        target_actor_identity: "target:test",
        adapters: createTaskAdapterRegistry([adapter]),
      });

      expect(result.status).toBe("BLOCKED");
      expect(result.outcome).toBe("CANCELLED");
      expect(result.recovery.status).toBe("RECOVERED");
      expect(result.cleanup.status).toBe("VERIFIED");
    });
  });

  test("records oracle exceptions as failures and still cleans up", async () => {
    const resolved = await fixture();
    await withTaskRoot(async (taskRoot) => {
      const result = await executeCampaignTask({
        resolved,
        task: resolved.tasks[0]!,
        task_root: taskRoot,
        operator_identity: "operator:test",
        target_actor_identity: "target:test",
        oracle_evaluator: {
          async evaluate() {
            throw new Error("oracle dependency unavailable");
          },
        },
      });

      expect(result.status).toBe("FAIL");
      expect(result.outcome).toBe("FAILED");
      expect(result.oracle_results[0]?.error).toContain(
        "oracle dependency unavailable",
      );
      expect(result.cleanup.status).toBe("VERIFIED");
      expect(result.events).toContainEqual(
        expect.objectContaining({
          event_type: "ORACLE",
          status: "FAIL",
        }),
      );
    });
  });

  test("treats a direct-process timeout as an unknown outcome", async () => {
    const resolved = await fixture();
    resolved.policies.push({
      schema_version: 2,
      id: "allow-test-process",
      version: "2.0.0",
      effect: "ALLOW",
      scope: {
        campaign_ids: [resolved.campaign.id],
        task_ids: ["TEST-PROCESS-TIMEOUT"],
        task_kinds: ["command"],
        driver_types: ["direct-process"],
        action_types: ["process-exec"],
        command_prefix: [process.execPath],
      },
      budgets: {
        required_dimensions: ["action_count", "output_bytes"],
        max_actions: 1,
        max_output_bytes: 4096,
      },
      redaction_profile: "no-secrets-v1",
      reason: "test-only process execution",
    });
    resolved.oracles.push({
      schema_version: 1,
      id: "test-process-exit-zero",
      type: "exit-code",
      expected_exit_code: 0,
    });
    const task: TaskDefinition = {
      schema_version: 1,
      id: "TEST-PROCESS-TIMEOUT",
      kind: "command",
      driver: { type: "direct-process" },
      required: true,
      timeout_ms: 20,
      command: [process.execPath, "-e", "await Bun.sleep(10_000)"],
      oracle_ids: ["test-process-exit-zero"],
      policy_ids: ["allow-test-process"],
    };
    await withTaskRoot(async (taskRoot) => {
      const result = await executeCampaignTask({
        resolved,
        task,
        task_root: taskRoot,
        operator_identity: "operator:test",
        target_actor_identity: "target:test",
      });

      expect(result.status).toBe("BLOCKED");
      expect(result.outcome).toBe("UNKNOWN_OUTCOME");
      expect(result.side_effects).toBe("UNKNOWN");
      expect(result.command?.timed_out).toBe(true);
      expect(result.recovery.status).toBe("UNSUPPORTED");
      expect(result.cleanup.status).toBe("VERIFIED");
      expect(result.oracle_results).toHaveLength(0);
    });
  });

  test("rejects duplicate adapters instead of silently overriding a contract", () => {
    const duplicate: TaskAdapter = {
      driver: "fake",
      async execute() {
        throw new Error("must not run");
      },
      async recover() {
        return {
          status: "UNSUPPORTED",
          attempted: false,
          reason: null,
        };
      },
      async cleanup() {
        return {
          status: "NOT_REQUIRED",
          attempted: false,
          verified: true,
          residual_resources: [],
          reason: null,
        };
      },
    };

    expect(() => createTaskAdapterRegistry([duplicate])).toThrow(
      "duplicate task adapter: fake",
    );
  });
});
