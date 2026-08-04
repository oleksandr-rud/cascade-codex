import { describe, expect, test } from "bun:test";

import { renderStarterPackage } from "./simulations";
import { buildSimulationIntakeTaskBindings } from "./simulation-intake";
import {
  type PolicyDefinition,
  taskPolicyActions,
  validateSimulationIntake,
  type TaskDefinition,
} from "./simulation-definitions";

describe("simulation intake contract", () => {
  test("renders product starters with a non-runnable draft intake", async () => {
    const files = await renderStarterPackage({
      simulationId: "intake-contract-example",
      ownerLane: "W-032",
      referenceDate: "2026-08-04",
    });
    const file = files.find((item) =>
      item.path === "product-evals/intakes/product/intake-contract-example-smoke.json"
    )!;
    const intake = file.content as Record<string, unknown>;
    validateSimulationIntake(intake, file.path);
    expect(intake.status).toBe("DRAFT");
    expect(intake.blockers).not.toEqual([]);
  });

  test("requires product context before a product intake can be READY", () => {
    const intake = {
      schema_version: 1,
      artifact_type: "cascade-simulation-intake",
      id: "SI-0123456789abcdef",
      status: "READY",
      scope: "product",
      campaign_id: "example-smoke",
      produced_at: "2026-08-04T00:00:00Z",
      task_envelope: {
        path: "product-evals/intakes/product/task-envelopes/TE-0123456789abcdef.json",
        envelope_id: "TE-0123456789abcdef",
        revision: 1,
        sha256: "a".repeat(64),
      },
      product_context: null,
      claims: [],
      tasks: [],
      blockers: [],
      gaps: [],
      invalidation: ["source drift"],
    };
    expect(() => validateSimulationIntake(intake, "fixture")).toThrow("product context");
  });

  test("prevents harness intakes from binding product context", () => {
    const intake = {
      schema_version: 1,
      artifact_type: "cascade-simulation-intake",
      id: "SI-0123456789abcdef",
      status: "DRAFT",
      scope: "harness",
      campaign_id: "example-smoke",
      produced_at: "2026-08-04T00:00:00Z",
      task_envelope: null,
      product_context: {},
      claims: [],
      tasks: [],
      blockers: ["draft"],
      gaps: [],
      invalidation: ["source drift"],
    };
    expect(() => validateSimulationIntake(intake, "fixture")).toThrow("cannot bind product context");
  });

  test("rejects blocking or forged policy decisions in a READY intake", () => {
    const intake = {
      schema_version: 1,
      artifact_type: "cascade-simulation-intake",
      id: "SI-0123456789abcdef",
      status: "READY",
      scope: "harness",
      campaign_id: "example-smoke",
      produced_at: "2026-08-04T00:00:00Z",
      task_envelope: {
        path: "product-evals/intakes/harness/task-envelopes/TE-0123456789abcdef.json",
        envelope_id: "TE-0123456789abcdef",
        revision: 1,
        sha256: "a".repeat(64),
      },
      product_context: null,
      claims: [],
      tasks: [{
        task_id: "TASK",
        declared_policy_ids: ["POLICY"],
        applicable_policy_ids: ["POLICY"],
        actions: [{
          action_index: 0,
          action_digest: "b".repeat(64),
          applicable_policy_ids: ["POLICY"],
          policy_digests: ["c".repeat(64)],
          decision: "DENY",
        }],
      }],
      blockers: [],
      gaps: [],
      invalidation: ["source drift"],
    };
    expect(() => validateSimulationIntake(intake, "fixture")).toThrow("blocking action decision");
  });

  test("binds task-envelope snapshot paths to scope and identity", () => {
    const intake = {
      schema_version: 1,
      artifact_type: "cascade-simulation-intake",
      id: "SI-0123456789abcdef",
      status: "BLOCKED",
      scope: "product",
      campaign_id: "example-smoke",
      produced_at: "2026-08-04T00:00:00Z",
      task_envelope: {
        path: "product-evals/intakes/harness/task-envelopes/TE-0123456789abcdef.json",
        envelope_id: "TE-0123456789abcdef",
        revision: 1,
        sha256: "a".repeat(64),
      },
      product_context: null,
      claims: [],
      tasks: [],
      blockers: ["scope mismatch"],
      gaps: [],
      invalidation: ["source drift"],
    };
    expect(() => validateSimulationIntake(intake, "fixture")).toThrow("outside the intake source boundary");
  });

  test("normalizes process and HTTP tasks into policy-observable actions", () => {
    const base = {
      schema_version: 1 as const,
      id: "TASK",
      kind: "command" as const,
      required: true,
      timeout_ms: 1000,
      oracle_ids: [],
    };
    const processTask: TaskDefinition = {
      ...base,
      driver: { type: "direct-process" },
      command: ["printf", "ok"],
    };
    const httpTask: TaskDefinition = {
      ...base,
      id: "HTTP-TASK",
      kind: "http",
      driver: { type: "http-client" },
      request: { method: "GET", url: "https://example.test/health" },
    };
    expect(taskPolicyActions(processTask)).toEqual([
      { type: "process-exec", argv: ["printf", "ok"] },
    ]);
    expect(taskPolicyActions(httpTask)).toEqual([
      {
        type: "http-request",
        method: "GET",
        url: "https://example.test/health",
        headers: undefined,
        body: undefined,
      },
    ]);
  });

  test("computes exact action-policy equality and fails closed on omissions", () => {
    const task: TaskDefinition = {
      schema_version: 1,
      id: "STATE-TASK",
      kind: "agent-response",
      driver: { type: "fake" },
      required: true,
      timeout_ms: 1000,
      actions: [{ type: "set", path: "workflow.status", value: "done" }],
      oracle_ids: [],
      policy_ids: ["allow-state-v1"],
    };
    const policy: PolicyDefinition = {
      schema_version: 2,
      id: "allow-state-v1",
      version: "2.0.0",
      effect: "ALLOW",
      scope: {
        campaign_ids: ["campaign"],
        task_ids: [task.id],
        task_kinds: [task.kind],
        driver_types: [task.driver.type],
        action_types: ["set"],
        action_paths: ["workflow.status"],
      },
      budgets: {
        required_dimensions: ["action_count", "output_bytes"],
        max_actions: 1,
        max_output_bytes: 1024,
      },
      redaction_profile: "no-secrets-v1",
      reason: "fixture",
    };
    const ready = buildSimulationIntakeTaskBindings({
      campaignId: "campaign",
      tasks: [task],
      policies: [policy],
      policyDigests: new Map([[policy.id, "a".repeat(64)]]),
    });
    expect(ready.blockers).toEqual([]);
    expect(ready.tasks[0]).toMatchObject({
      declared_policy_ids: [policy.id],
      applicable_policy_ids: [policy.id],
      actions: [{ decision: "ALLOW", applicable_policy_ids: [policy.id] }],
    });

    const omitted = buildSimulationIntakeTaskBindings({
      campaignId: "campaign",
      tasks: [{ ...task, policy_ids: [] }],
      policies: [policy],
      policyDigests: new Map([[policy.id, "a".repeat(64)]]),
    });
    expect(omitted.blockers).toContain(
      "STATE-TASK declared policies differ from computed applicable policies",
    );
  });
});
