import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import {
  buildCalibrationReceipt,
  campaignSessionContract,
  campaignTaskConflictKeys,
  createTaskAdapterRegistry,
  evaluatePopulationAuthority,
  executeCampaignTask,
  restoreCampaignBudgetUsage,
  selectCampaignTaskBatch,
  main as campaignMain,
  type TaskAdapter,
} from "./campaigns";
import {
  CampaignArtifactStore,
  type CampaignIdentityEnvelope,
} from "./campaign-artifacts";
import {
  resolveCampaign,
  type ResolvedCampaign,
  type OracleDefinition,
  type PolicyDefinition,
  type TaskDefinition,
} from "./simulation-definitions";
import { rootPath, sha256File, valueDigest } from "./common";
import { signPolicyConfirmationReceipt } from "./campaign-policies";
import {
  simulationCheckpointDigest,
  simulationEventDigest,
  simulationSessionContractDigest,
  type SimulationSessionCheckpoint,
  type SimulationSessionEvent,
} from "./simulation-sessions";

test("campaign scheduler batches only independent task surfaces", () => {
  const tasks = [
    {
      id: "A",
      driver: { type: "fake" as const },
      policy_ids: ["shared"],
      request: undefined,
    },
    {
      id: "B",
      driver: { type: "fake" as const },
      policy_ids: ["shared"],
      request: undefined,
    },
    {
      id: "C",
      driver: { type: "fake" as const },
      policy_ids: ["independent"],
      request: undefined,
    },
  ];
  expect(selectCampaignTaskBatch(tasks, new Set(), 2).map((task) => task.id)).toEqual([
    "A",
    "C",
  ]);
  expect(campaignTaskConflictKeys(tasks[0]!)).toContain("policy:shared");
  expect(
    selectCampaignTaskBatch(tasks, new Set(["A"]), 2).map((task) => task.id),
  ).toEqual(["B", "C"]);
});

test("restores campaign-wide policy budgets from digest-bound task results", async () => {
  await withTaskRoot(async (executionRoot) => {
    const result = {
      task_id: "TASK-1",
      policy_decisions: [
        {
          policy_id: "policy-1",
          budgets: {
            consumed_after: { action_count: 2, output_bytes: 48 },
          },
        },
      ],
    };
    const taskRoot = join(executionRoot, "tasks", "TASK-1");
    await mkdir(taskRoot, { recursive: true });
    await writeFile(
      join(taskRoot, "result.json"),
      `${JSON.stringify(result)}\n`,
      "utf8",
    );
    const checkpoint = {
      domain_state: {
        task_results: [
          {
            task_id: "TASK-1",
            required: true,
            status: "PASS" as const,
            outcome: "SUCCEEDED" as const,
            result_digest: valueDigest(result),
          },
        ],
        budget_usage: {
          "policy-1": { action_count: 2, output_bytes: 48 },
        },
      },
    };

    expect(
      await restoreCampaignBudgetUsage(checkpoint, executionRoot),
    ).toEqual({
      "policy-1": { action_count: 2, output_bytes: 48 },
    });
    checkpoint.domain_state.budget_usage["policy-1"].action_count = 1;
    await expect(
      restoreCampaignBudgetUsage(checkpoint, executionRoot),
    ).rejects.toThrow("budget usage is stale or mismatched");
  });
});

test("public campaign resume continues a source-bound checkpoint without replay", async () => {
  const runId = `resume-cli-${crypto.randomUUID()}`;
  const artifactRoot = rootPath(".artifacts/product-evals");
  const base = new CampaignArtifactStore(artifactRoot, runId);
  const resolved = await fixture();
  const campaignPath = rootPath(
    "product-evals/campaigns/simulation-contract-smoke.json",
  );
  const identities: CampaignIdentityEnvelope = {
    operator: {
      role: "simulation-operator",
      session_id: `${runId}:operator`,
      subject: "resume-test-operator",
    },
    evaluator: {
      role: "simulation-evaluator",
      session_id: `${runId}:evaluator`,
      subject: "fixture:simulation-evaluator",
    },
    aggregator: {
      role: "campaign-aggregator",
      session_id: `${runId}:aggregator`,
      subject: "resume-test-aggregator",
    },
    target: {
      role: "target-actor",
      session_id: `${runId}:target`,
      subject: `target:${resolved.simulation.id}`,
    },
    simulator: {
      role: "simulator",
      session_id: `${runId}:simulator`,
      subject: `simulator:${resolved.simulation.id}`,
    },
    recovery: {
      role: "simulation-recovery",
      session_id: `${runId}:recovery`,
      subject: "resume-test-recovery",
    },
  };
  const now = new Date();
  const authorized = base.withAuthority(identities.operator, "resume-lease");
  try {
    await base.reserve({
      campaign_id: resolved.campaign.id,
      campaign_digest: await sha256File(campaignPath),
      attempt: 1,
      identities,
      lease: {
        lease_id: "resume-lease",
        owner_session_id: identities.operator.session_id,
        acquired_at: now.toISOString(),
        expires_at: new Date(now.getTime() + 60_000).toISOString(),
        recovery_mode: "FINALIZE_UNKNOWN_OUTCOME",
      },
    });
    await authorized.appendLifecycle({ status: "RESERVED", at: now.toISOString() });
    const frozenSources = [];
    for (const file of resolved.sourceFiles) {
      frozenSources.push(
        await authorized.freezeFile({
          source_path: rootPath(file),
          namespace: "execution/source",
          producer: "simulation-operator",
          platform: process.platform,
          redaction_profile: "source-code-v1",
        }),
      );
    }
    const sourceManifest = {
      schema_version: 1 as const,
      run_id: runId,
      campaign_id: resolved.campaign.id,
      platform: process.platform,
      source_revision: "test-fixed-point",
      dirty_source: true,
      definitions: resolved.sourceDigests,
      frozen_sources: frozenSources,
      source_digest: valueDigest(resolved.sourceDigests),
    };
    await authorized.writeStageJson(
      "execution/source-manifest.json",
      sourceManifest,
    );
    await authorized.appendLifecycle({
      status: "RUNNING",
      at: now.toISOString(),
      source_manifest_digest: valueDigest(sourceManifest),
    });

    const contract = campaignSessionContract(resolved, runId).contract;
    const checkpoint: SimulationSessionCheckpoint<{
      task_results: [];
      budget_usage: Record<string, never>;
    }> = {
      schema_version: 1,
      checkpoint_id: `${runId}:checkpoint:00000000`,
      checkpoint_digest: "",
      contract_digest: simulationSessionContractDigest(contract),
      session_id: runId,
      purpose: contract.purpose,
      status: "RUNNING",
      reason: null,
      revision: 0,
      started_at: now.toISOString(),
      updated_at: now.toISOString(),
      episode: 1,
      episode_step_count: 0,
      step_count: 0,
      completed_step_ids: [],
      completed_idempotency_keys: [],
      last_batch_step_ids: [],
      surfaces: resolved.tasks.map((task) => ({
        surface_id: `task:${task.id}`,
        kind: task.kind,
        context_id: `${runId}:${task.driver.type}:${task.id}`,
        lifecycle: "READY" as const,
        generation: 0,
      })),
      domain_state: { task_results: [], budget_usage: {} },
      last_event_digest: null,
    };
    checkpoint.checkpoint_digest = simulationCheckpointDigest(checkpoint);
    await authorized.writeSessionCheckpoint(checkpoint);
    const started: SimulationSessionEvent = {
      schema_version: 1,
      session_id: runId,
      contract_digest: simulationSessionContractDigest(contract),
      sequence: 0,
      event_type: "SESSION_STARTED",
      at: now.toISOString(),
      episode: 1,
      step_ids: [],
      surface_ids: checkpoint.surfaces.map((surface) => surface.surface_id),
      status: "RUNNING",
      reason: null,
      checkpoint_digest: checkpoint.checkpoint_digest,
      previous_event_digest: null,
      event_digest: "",
    };
    started.event_digest = simulationEventDigest(started);
    await authorized.appendSessionEvent(started);

    expect(
      await campaignMain(["resume", runId, "--lease-id", "resume-lease"]),
    ).toBe(0);
    expect(await base.verify()).toMatchObject({
      status: "VALID",
      finalization_status: "COMPLETED",
    });
    const events = await base.readSessionEvents();
    expect(events.filter((event) => event.event_type === "SESSION_RESUMED"))
      .toHaveLength(1);
    expect(events.filter((event) => event.event_type === "STEP_STARTED"))
      .toHaveLength(1);
  } finally {
    await rm(resolve(artifactRoot, runId), { recursive: true, force: true });
    await rm(resolve(artifactRoot, `.${runId}.mutation.lock`), { force: true });
  }
});

test("public campaign resume reuses matching immutable terminal stages", async () => {
  const runId = `resume-stages-${crypto.randomUUID()}`;
  const artifactRoot = rootPath(".artifacts/product-evals");
  const runRoot = resolve(artifactRoot, runId);
  try {
    expect(
      await campaignMain([
        "run",
        "simulation-contract-smoke",
        "--run-id",
        runId,
        "--lease-id",
        "resume-stage-lease",
      ]),
    ).toBe(0);
    await rm(resolve(runRoot, "finalization.json"));
    await rm(resolve(runRoot, "terminal.lock"));

    expect(
      await campaignMain([
        "resume",
        runId,
        "--lease-id",
        "resume-stage-lease",
      ]),
    ).toBe(0);
    expect(await new CampaignArtifactStore(artifactRoot, runId).verify())
      .toMatchObject({ status: "VALID", finalization_status: "COMPLETED" });
    const lifecycle = await readFile(resolve(runRoot, "lifecycle.jsonl"), "utf8");
    expect(lifecycle).toContain('"status":"RESUMING"');

    await rm(resolve(runRoot, "finalization.json"));
    await rm(resolve(runRoot, "terminal.lock"));
    const leasePath = resolve(runRoot, "lease.json");
    const lease = JSON.parse(await readFile(leasePath, "utf8"));
    const previousGeneration = lease.generation as number;
    lease.acquired_at = new Date(Date.now() - 2_000).toISOString();
    lease.renewed_at = lease.acquired_at;
    lease.expires_at = new Date(Date.now() - 1_000).toISOString();
    await writeFile(leasePath, `${JSON.stringify(lease)}\n`, "utf8");
    expect(
      await campaignMain([
        "resume",
        runId,
        "--lease-id",
        "resume-takeover-lease",
        "--recovery",
        "local-simulation-recovery",
        "--recovery-reason",
        "test operator process ended",
      ]),
    ).toBe(0);
    expect(
      JSON.parse(
        await readFile(
          resolve(
            runRoot,
            `recovery/lease-takeovers/${String(previousGeneration + 1).padStart(8, "0")}.json`,
          ),
          "utf8",
        ),
      ),
    ).toMatchObject({
      previous_generation: previousGeneration,
      replacement_lease: {
        lease_id: "resume-takeover-lease",
        generation: previousGeneration + 1,
      },
    });

    await rm(resolve(runRoot, "finalization.json"));
    await rm(resolve(runRoot, "terminal.lock"));
    const sourceManifestPath = resolve(
      runRoot,
      "execution/source-manifest.json",
    );
    const sourceManifest = JSON.parse(
      await readFile(sourceManifestPath, "utf8"),
    );
    sourceManifest.definitions[0].sha256 = "0".repeat(64);
    await writeFile(
      sourceManifestPath,
      `${JSON.stringify(sourceManifest)}\n`,
      "utf8",
    );
    await expect(
      campaignMain([
        "resume",
        runId,
        "--lease-id",
        "resume-takeover-lease",
      ]),
    ).rejects.toThrow("source manifest is stale or mismatched");
  } finally {
    await rm(runRoot, { recursive: true, force: true });
    await rm(resolve(artifactRoot, `.${runId}.mutation.lock`), { force: true });
  }
});

async function fixture(): Promise<ResolvedCampaign> {
  return resolveCampaign("product-evals/campaigns/simulation-contract-smoke.json");
}

test("claim population authority keeps fixture prevalence claims NOT_RUN", async () => {
  const resolved = await fixture();
  const calibration = buildCalibrationReceipt(
    resolved,
    "authority-test",
    "authority-test-aggregator",
    new Date(resolved.calibration!.reference.reference_window_end),
  );
  const releaseClaim = resolved.claims.find(
    (claim) => claim.id === "fixture-release-eligibility",
  )!;
  const coverageClaim = resolved.claims.find(
    (claim) => claim.id === "fixture-population-coverage",
  )!;
  expect(evaluatePopulationAuthority(resolved, releaseClaim, calibration)).toMatchObject({
    status: "NOT_RUN",
  });
  expect(evaluatePopulationAuthority(resolved, coverageClaim, calibration)).toBeNull();
  expect(
    evaluatePopulationAuthority(
      resolved,
      {
        ...coverageClaim,
        scope: { ...coverageClaim.scope, population_id: "different-population" },
      },
      calibration,
    ),
  ).toMatchObject({ status: "NOT_RUN" });
});

async function withHttpServer<T>(
  run: (origin: string) => Promise<T>,
): Promise<T> {
  const server: Server = createServer((_request, response) => {
    response.writeHead(200, { "content-type": "application/json" });
    response.end('{"ok":true}');
  });
  await new Promise<void>((resolveListen) => {
    server.listen(0, "127.0.0.1", resolveListen);
  });
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("test HTTP server did not expose a TCP address");
  }
  try {
    return await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolveClose, rejectClose) => {
      server.close((error) => (error ? rejectClose(error) : resolveClose()));
    });
  }
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

const testAgentAdapterContract = {
  id: "test-agent-runtime",
  version: "1.0.0",
  driver: "agent-runtime" as const,
  capabilities: ["test-runtime"],
  async preflight() {
    return { status: "READY" as const, reason: null };
  },
};

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
  test("selects an exact adapter and blocks on preflight without dispatch", async () => {
    const resolved = await fixture();
    const task: TaskDefinition = {
      ...resolved.tasks[0]!,
      driver: { type: "fake", adapter: "test-preflight-block" },
    };
    let executed = false;
    const adapter: TaskAdapter = {
      id: "test-preflight-block",
      version: "2.1.0",
      driver: "fake",
      capabilities: ["preflight-test"],
      async preflight() {
        return { status: "BLOCKED", reason: "required display is unavailable" };
      },
      async execute() {
        executed = true;
        throw new Error("must not dispatch");
      },
      async recover() {
        throw new Error("must not recover");
      },
      async cleanup() {
        throw new Error("must not clean up an undispatched adapter");
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
      expect(result.outcome).toBe("BLOCKED");
      expect(result.adapter).toEqual({
        id: "test-preflight-block",
        version: "2.1.0",
        capabilities: ["preflight-test"],
      });
      expect(executed).toBe(false);
      expect(result.cleanup.status).toBe("NOT_REQUIRED");
    });
  });

  test("executes a policy-scoped HTTP task and records typed evidence", async () => {
    await withHttpServer(async (origin) => {
      const resolved = await fixture();
      const task: TaskDefinition = {
        schema_version: 1,
        id: "HTTP-CONFORMANCE",
        kind: "http",
        driver: { type: "http-client", adapter: "builtin-http-client" },
        required: true,
        timeout_ms: 1_000,
        request: { method: "GET", url: `${origin}/health` },
        oracle_ids: ["http-status-ok"],
        policy_ids: ["http-local-read"],
      };
      const policy: PolicyDefinition = {
        schema_version: 2,
        id: "http-local-read",
        version: "1.0.0",
        effect: "ALLOW",
        scope: {
          campaign_ids: [resolved.campaign.id],
          task_ids: [task.id],
          task_kinds: ["http"],
          driver_types: ["http-client"],
          action_types: ["http-request"],
          http_methods: ["GET"],
          http_origins: [origin],
        },
        budgets: {
          required_dimensions: ["action_count", "output_bytes"],
          max_actions: 1,
          max_output_bytes: 1_024,
        },
        redaction_profile: "no-secrets-v1",
        reason: "allow the isolated conformance server",
      };
      const oracle: OracleDefinition = {
        schema_version: 1,
        id: "http-status-ok",
        type: "http-status",
        expected_status: 200,
      };
      resolved.policies = [policy];
      resolved.oracles = [oracle];
      await withTaskRoot(async (taskRoot) => {
        const result = await executeCampaignTask({
          resolved,
          task,
          task_root: taskRoot,
          operator_identity: "operator:test",
          target_actor_identity: "target:test",
        });
        expect(result.status).toBe("PASS");
        expect(result.http).toMatchObject({
          method: "GET",
          status: 200,
          body: '{"ok":true}',
          redirected: false,
        });
        expect(result.adapter?.id).toBe("builtin-http-client");
        expect(result.observations?.[0]?.surface).toMatchObject({
          kind: "http",
          surface_id: origin,
        });
        expect(result.oracle_results[0]?.status).toBe("PASS");
        expect(
          JSON.parse(await readFile(join(taskRoot, "http.json"), "utf8")),
        ).toMatchObject({ status: 200 });
      });
      const secretTask: TaskDefinition = {
        ...task,
        id: "HTTP-SECRET-BLOCK",
        request: {
          ...task.request!,
          headers: {
            authorization: "Bearer sk-proj-1234567890abcdefgh",
          },
        },
      };
      policy.scope.task_ids = [secretTask.id];
      resolved.policies = [policy];
      await withTaskRoot(async (taskRoot) => {
        const result = await executeCampaignTask({
          resolved,
          task: secretTask,
          task_root: taskRoot,
          operator_identity: "operator:test",
          target_actor_identity: "target:test",
        });
        expect(result.outcome).toBe("FAILED");
        expect(result.side_effects).toBe("NONE");
        expect(result.earliest_failure).toContain("secret-like action material");
        expect(result.http).toBeUndefined();
      });
    });
  });

  test("rejects an HTTP method outside the exact policy scope before fetch", async () => {
    await withHttpServer(async (origin) => {
      const resolved = await fixture();
      const task: TaskDefinition = {
        schema_version: 1,
        id: "HTTP-POLICY-BLOCK",
        kind: "http",
        driver: { type: "http-client" },
        required: true,
        timeout_ms: 1_000,
        request: { method: "GET", url: `${origin}/health` },
        oracle_ids: ["http-status-ok"],
        policy_ids: ["http-post-only"],
      };
      resolved.policies = [
        {
          schema_version: 2,
          id: "http-post-only",
          version: "1.0.0",
          effect: "ALLOW",
          scope: {
            campaign_ids: [resolved.campaign.id],
            task_ids: [task.id],
            task_kinds: ["http"],
            driver_types: ["http-client"],
            action_types: ["http-request"],
            http_methods: ["POST"],
            http_origins: [origin],
          },
          budgets: {
            required_dimensions: ["action_count", "output_bytes"],
            max_actions: 1,
            max_output_bytes: 1_024,
          },
          redaction_profile: "no-secrets-v1",
          reason: "POST-only policy fixture",
        },
      ];
      resolved.oracles = [
        {
          schema_version: 1,
          id: "http-status-ok",
          type: "http-status",
          expected_status: 200,
        },
      ];
      await withTaskRoot(async (taskRoot) => {
        const result = await executeCampaignTask({
          resolved,
          task,
          task_root: taskRoot,
          operator_identity: "operator:test",
          target_actor_identity: "target:test",
        });
        expect(result.outcome).toBe("FAILED");
        expect(result.side_effects).toBe("NONE");
        expect(result.http).toBeUndefined();
      });
    });
  });

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
      ...testAgentAdapterContract,
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
      ...testAgentAdapterContract,
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
      ...testAgentAdapterContract,
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
      ...testAgentAdapterContract,
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
      ...testAgentAdapterContract,
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
      id: "builtin-fake",
      version: "1.0.0",
      driver: "fake",
      capabilities: ["duplicate-test"],
      async preflight() {
        return { status: "READY", reason: null };
      },
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
      "duplicate task adapter: fake:builtin-fake",
    );
  });
});
