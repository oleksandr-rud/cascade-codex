import { describe, expect, test } from "bun:test";

import { CascadeError, valueDigest } from "./common";
import {
  runSimulationSession,
  simulationCheckpointDigest,
  simulationEventDigest,
  simulationSessionContractDigest,
  type SimulationGoalResult,
  type SimulationSessionCheckpoint,
  type SimulationSessionContract,
  type SimulationSessionEvent,
  type SimulationSessionPersistence,
  type SimulationSessionStep,
  type SimulationSessionStepResult,
  type SimulationSurfaceSession,
} from "./simulation-sessions";

interface TestState {
  completed: string[];
  values: Record<string, string>;
}

class MemoryPersistence implements SimulationSessionPersistence<TestState> {
  events: SimulationSessionEvent[] = [];
  checkpoints: SimulationSessionCheckpoint<TestState>[] = [];
  heartbeats = 0;

  async appendEvent(event: SimulationSessionEvent): Promise<void> {
    this.events.push(structuredClone(event));
  }

  async writeCheckpoint(
    checkpoint: SimulationSessionCheckpoint<TestState>,
  ): Promise<void> {
    if (
      this.checkpoints.some(
        (candidate) => candidate.checkpoint_id === checkpoint.checkpoint_id,
      )
    ) {
      throw new CascadeError(`duplicate checkpoint: ${checkpoint.checkpoint_id}`);
    }
    this.checkpoints.push(structuredClone(checkpoint));
  }

  async readLatestCheckpoint(): Promise<SimulationSessionCheckpoint<TestState> | null> {
    return structuredClone(this.checkpoints.at(-1) ?? null);
  }

  async readEvents(): Promise<SimulationSessionEvent[]> {
    return structuredClone(this.events);
  }

  async heartbeat(): Promise<void> {
    this.heartbeats += 1;
  }
}

function contract(overrides: Partial<SimulationSessionContract["limits"]> = {}): SimulationSessionContract {
  return {
    schema_version: 1,
    session_id: "session-test",
    purpose: "complete the cross-surface fixture",
    limits: {
      max_duration_ms: 60_000,
      max_step_duration_ms: 5_000,
      max_steps: 100,
      max_parallel_steps: 3,
      max_steps_per_episode: 2,
      max_surfaces: 16,
      max_checkpoint_bytes: 128 * 1024,
      ...overrides,
    },
  };
}

function surfaces(): SimulationSurfaceSession[] {
  return [
    {
      surface_id: "browser:checkout",
      kind: "browser",
      context_id: "customer-session",
      screen_id: "cart",
      lifecycle: "ACTIVE",
      generation: 0,
    },
    {
      surface_id: "http:orders",
      kind: "http",
      context_id: "order-api",
      lifecycle: "READY",
      generation: 0,
    },
    {
      surface_id: "desktop:inventory",
      kind: "desktop",
      context_id: "inventory-app",
      screen_id: "stock",
      lifecycle: "READY",
      generation: 0,
    },
  ];
}

function step(
  id: string,
  surfaceId: string,
  conflictKeys: string[] = [],
): SimulationSessionStep<{ value: string }> {
  return {
    step_id: id,
    idempotency_key: `idempotency:${id}`,
    surface_id: surfaceId,
    conflict_keys: conflictKeys,
    required: true,
    payload: { value: id },
  };
}

function reducer(
  state: TestState,
  current: SimulationSessionStep<{ value: string }>,
  result: SimulationSessionStepResult<Record<string, unknown>>,
): TestState {
  return {
    completed: [...state.completed, current.step_id],
    values: {
      ...state.values,
      [current.surface_id]: String(result.observation?.value ?? "missing"),
    },
  };
}

function goal(required: string[]): (input: {
  checkpoint: SimulationSessionCheckpoint<TestState>;
}) => Promise<SimulationGoalResult> {
  return async ({ checkpoint }) => ({
    status: required.every((id) => checkpoint.domain_state.completed.includes(id))
      ? "ACHIEVED"
      : "CONTINUE",
    reason: required.every((id) => checkpoint.domain_state.completed.includes(id))
      ? "all required cross-surface outcomes are present"
      : null,
  });
}

describe("simulation session controller", () => {
  test("runs several surfaces until the goal oracle passes and rolls episodes", async () => {
    const persistence = new MemoryPersistence();
    const planned = [
      step("open-checkout", "browser:checkout", ["account:fixture"]),
      step("create-order", "http:orders", ["order:fixture"]),
      step("verify-stock", "desktop:inventory", ["inventory:fixture"]),
    ];
    const result = await runSimulationSession({
      contract: contract(),
      initial_state: { completed: [], values: {} },
      surfaces: surfaces(),
      persistence,
      async next_steps({ checkpoint }) {
        return planned.filter(
          (candidate) => !checkpoint.completed_step_ids.includes(candidate.step_id),
        ).slice(0, 1);
      },
      async execute_step(current) {
        return {
          step_id: current.step_id,
          outcome: "PASS",
          reason: null,
          observation: { value: current.payload.value },
          surface_updates:
            current.step_id === "open-checkout"
              ? [
                  {
                    surface_id: "browser:receipt",
                    kind: "browser",
                    context_id: "customer-session",
                    screen_id: "confirmation",
                    lifecycle: "ACTIVE",
                    generation: 0,
                    last_observation_digest: "a".repeat(64),
                  },
                ]
              : [],
        };
      },
      reduce_state: reducer,
      evaluate_goal: goal(planned.map((candidate) => candidate.step_id)),
    });

    expect(result.status).toBe("ACHIEVED");
    expect(result.step_count).toBe(3);
    expect(result.episode).toBe(2);
    expect(result.domain_state.completed).toEqual([
      "open-checkout",
      "create-order",
      "verify-stock",
    ]);
    expect(
      result.surfaces.find((surface) => surface.surface_id === "browser:checkout")
        ?.lifecycle,
    ).toBe("BACKGROUND");
    expect(
      result.surfaces.find((surface) => surface.surface_id === "browser:receipt")
        ?.screen_id,
    ).toBe("confirmation");
    expect(persistence.events.map((event) => event.event_type)).toContain(
      "EPISODE_COMPLETED",
    );
    expect(persistence.heartbeats).toBe(6);
    const dispatch = persistence.events.find(
      (event) => event.event_type === "STEP_STARTED",
    );
    expect(dispatch?.contract_digest).toBe(
      simulationSessionContractDigest(contract()),
    );
    expect(dispatch?.step_bindings?.[0]).toMatchObject({
      step_id: "open-checkout",
      surface_id: "browser:checkout",
      required: true,
    });
    expect(JSON.stringify(dispatch)).not.toContain('"value":"open-checkout"');
  });

  test("executes independent surfaces together and rejects overlapping conflicts", async () => {
    const persistence = new MemoryPersistence();
    let concurrent = 0;
    let maximumConcurrent = 0;
    const result = await runSimulationSession({
      contract: contract({
        max_steps: 2,
        max_parallel_steps: 2,
        max_steps_per_episode: 2,
      }),
      initial_state: { completed: [], values: {} },
      surfaces: surfaces(),
      persistence,
      async next_steps({ checkpoint }) {
        if (checkpoint.step_count) return [];
        return [
          step("browser-read", "browser:checkout", ["browser-context"]),
          step("api-read", "http:orders", ["api-origin"]),
        ];
      },
      async execute_step(current) {
        concurrent += 1;
        maximumConcurrent = Math.max(maximumConcurrent, concurrent);
        await Promise.resolve();
        concurrent -= 1;
        return {
          step_id: current.step_id,
          outcome: "PASS",
          reason: null,
          observation: { value: current.payload.value },
        };
      },
      reduce_state: reducer,
      evaluate_goal: goal(["browser-read", "api-read"]),
    });
    expect(result.status).toBe("ACHIEVED");
    expect(maximumConcurrent).toBe(2);

    const conflicting = new MemoryPersistence();
    await expect(
      runSimulationSession({
        contract: contract({
          max_steps: 2,
          max_parallel_steps: 2,
          max_steps_per_episode: 2,
        }),
        initial_state: { completed: [], values: {} },
        surfaces: surfaces(),
        persistence: conflicting,
        async next_steps() {
          return [
            step("first", "browser:checkout", ["account:fixture"]),
            step("second", "http:orders", ["account:fixture"]),
          ];
        },
        async execute_step(current) {
          return {
            step_id: current.step_id,
            outcome: "PASS",
            reason: null,
            observation: { value: current.payload.value },
          };
        },
        reduce_state: reducer,
        evaluate_goal: goal(["first", "second"]),
      }),
    ).rejects.toThrow("overlap conflict key");
  });

  test("fails closed on restart when a dispatched step lacks a checkpoint", async () => {
    const persistence = new MemoryPersistence();
    const baseContract = contract();
    const checkpoint: SimulationSessionCheckpoint<TestState> = {
      schema_version: 1,
      checkpoint_id: "session-test:checkpoint:00000000",
      checkpoint_digest: "",
      contract_digest: simulationSessionContractDigest(baseContract),
      session_id: baseContract.session_id,
      purpose: baseContract.purpose,
      status: "RUNNING",
      reason: null,
      revision: 0,
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      episode: 1,
      episode_step_count: 0,
      step_count: 0,
      completed_step_ids: [],
      completed_idempotency_keys: [],
      last_batch_step_ids: [],
      surfaces: surfaces(),
      domain_state: { completed: [], values: {} },
      last_event_digest: null,
    };
    checkpoint.checkpoint_digest = simulationCheckpointDigest(checkpoint);
    persistence.checkpoints.push(checkpoint);
    const started: SimulationSessionEvent = {
      schema_version: 1,
      session_id: baseContract.session_id,
      contract_digest: simulationSessionContractDigest(baseContract),
      sequence: 0,
      event_type: "STEP_STARTED",
      at: new Date().toISOString(),
      episode: 1,
      step_ids: ["ambiguous-write"],
      surface_ids: ["http:orders"],
      step_bindings: [
        {
          step_id: "ambiguous-write",
          surface_id: "http:orders",
          required: true,
          idempotency_key_digest: valueDigest("ambiguous-write"),
          conflict_keys_digest: valueDigest([]),
          payload_digest: valueDigest({}),
        },
      ],
      status: "RUNNING",
      reason: null,
      previous_event_digest: null,
      event_digest: "",
    };
    started.event_digest = simulationEventDigest(started);
    persistence.events.push(started);

    const result = await runSimulationSession({
      contract: baseContract,
      initial_state: { completed: [], values: {} },
      surfaces: surfaces(),
      persistence,
      resume: true,
      async next_steps() {
        throw new Error("must not retry an ambiguous action");
      },
      async execute_step() {
        throw new Error("must not execute an ambiguous action");
      },
      reduce_state: reducer,
      evaluate_goal: goal(["ambiguous-write"]),
    });
    expect(result.status).toBe("UNKNOWN_OUTCOME");
    expect(result.reason).toContain("no durable checkpoint");
  });

  test("rejects a checkpoint that is not bound to the current journal", async () => {
    const persistence = new MemoryPersistence();
    const baseContract = contract();
    const checkpoint: SimulationSessionCheckpoint<TestState> = {
      schema_version: 1,
      checkpoint_id: "session-test:checkpoint:00000000",
      checkpoint_digest: "",
      contract_digest: simulationSessionContractDigest(baseContract),
      session_id: baseContract.session_id,
      purpose: baseContract.purpose,
      status: "RUNNING",
      reason: null,
      revision: 0,
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      episode: 1,
      episode_step_count: 0,
      step_count: 0,
      completed_step_ids: [],
      completed_idempotency_keys: [],
      last_batch_step_ids: [],
      surfaces: surfaces(),
      domain_state: { completed: [], values: {} },
      last_event_digest: "f".repeat(64),
    };
    checkpoint.checkpoint_digest = simulationCheckpointDigest(checkpoint);
    persistence.checkpoints.push(checkpoint);

    await expect(
      runSimulationSession({
        contract: baseContract,
        initial_state: { completed: [], values: {} },
        surfaces: surfaces(),
        persistence,
        resume: true,
        async next_steps() {
          return [];
        },
        async execute_step(current) {
          return { step_id: current.step_id, outcome: "PASS", reason: null };
        },
        reduce_state: reducer,
        evaluate_goal: goal([]),
      }),
    ).rejects.toThrow("checkpoint is not bound to the current journal");
  });

  test("rejects an initial checkpoint from a different session contract", async () => {
    const persistence = new MemoryPersistence();
    const baseContract = contract();
    const checkpoint: SimulationSessionCheckpoint<TestState> = {
      schema_version: 1,
      checkpoint_id: "session-test:checkpoint:00000000",
      checkpoint_digest: "",
      contract_digest: simulationSessionContractDigest(baseContract),
      session_id: baseContract.session_id,
      purpose: baseContract.purpose,
      status: "RUNNING",
      reason: null,
      revision: 0,
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      episode: 1,
      episode_step_count: 0,
      step_count: 0,
      completed_step_ids: [],
      completed_idempotency_keys: [],
      last_batch_step_ids: [],
      surfaces: surfaces(),
      domain_state: { completed: [], values: {} },
      last_event_digest: null,
    };
    checkpoint.checkpoint_digest = simulationCheckpointDigest(checkpoint);
    persistence.checkpoints.push(checkpoint);

    await expect(
      runSimulationSession({
        contract: contract({ max_steps: 11 }),
        initial_state: { completed: [], values: {} },
        surfaces: surfaces(),
        persistence,
        resume: true,
        async next_steps() {
          return [];
        },
        async execute_step(current) {
          return { step_id: current.step_id, outcome: "PASS", reason: null };
        },
        reduce_state: reducer,
        evaluate_goal: goal([]),
      }),
    ).rejects.toThrow("checkpoint identity does not match session");
  });

  test("bounds a non-cooperative dispatched step and records unknown outcome", async () => {
    const persistence = new MemoryPersistence();
    let aborted = false;
    const result = await runSimulationSession({
      contract: contract({
        max_duration_ms: 1_000,
        max_step_duration_ms: 20,
        max_steps: 1,
        max_parallel_steps: 1,
        max_steps_per_episode: 1,
      }),
      initial_state: { completed: [], values: {} },
      surfaces: surfaces(),
      persistence,
      async next_steps() {
        return [step("hung-write", "http:orders")];
      },
      async execute_step(_current, { signal }) {
        signal?.addEventListener("abort", () => {
          aborted = true;
        });
        return new Promise(() => undefined);
      },
      reduce_state: reducer,
      evaluate_goal: goal(["hung-write"]),
    });

    expect(aborted).toBe(true);
    expect(result.status).toBe("UNKNOWN_OUTCOME");
    expect(result.reason).toContain("step duration bound");
  });

  test("bounds non-cooperative goal and planning callbacks", async () => {
    for (const phase of ["goal", "planning"] as const) {
      const persistence = new MemoryPersistence();
      const result = await runSimulationSession({
        contract: contract({
          max_duration_ms: 1_000,
          max_step_duration_ms: 20,
          max_steps: 1,
          max_parallel_steps: 1,
          max_steps_per_episode: 1,
        }),
        initial_state: { completed: [], values: {} },
        surfaces: surfaces(),
        persistence,
        async next_steps() {
          return phase === "planning"
            ? new Promise(() => undefined)
            : [step("bounded-control", "http:orders")];
        },
        async execute_step(current) {
          return { step_id: current.step_id, outcome: "PASS", reason: null };
        },
        reduce_state: reducer,
        async evaluate_goal() {
          return phase === "goal"
            ? new Promise(() => undefined)
            : { status: "CONTINUE", reason: null };
        },
      });
      expect(result.status).toBe("TIMED_OUT");
      expect(result.reason).toContain(
        phase === "goal" ? "goal evaluation" : "step planning",
      );
    }
  });

  test("rejects dynamic surfaces beyond the explicit cardinality bound", async () => {
    const persistence = new MemoryPersistence();
    await expect(
      runSimulationSession({
        contract: contract({ max_surfaces: 3 }),
        initial_state: { completed: [], values: {} },
        surfaces: surfaces(),
        persistence,
        async next_steps() {
          return [step("open-popup", "browser:checkout")];
        },
        async execute_step(current) {
          return {
            step_id: current.step_id,
            outcome: "PASS",
            reason: null,
            observation: { value: current.payload.value },
            surface_updates: [
              {
                surface_id: "browser:popup",
                kind: "browser",
                context_id: "customer-session",
                lifecycle: "ACTIVE",
                generation: 0,
              },
            ],
          };
        },
        reduce_state: reducer,
        evaluate_goal: goal(["open-popup"]),
      }),
    ).rejects.toThrow("max_surfaces 3");
  });

  test("stops at the step budget when the purpose remains incomplete", async () => {
    const persistence = new MemoryPersistence();
    const result = await runSimulationSession({
      contract: contract({ max_steps: 3, max_steps_per_episode: 1 }),
      initial_state: { completed: [], values: {} },
      surfaces: surfaces(),
      persistence,
      async next_steps({ checkpoint }) {
        return [step(`attempt-${checkpoint.step_count}`, "http:orders")];
      },
      async execute_step(current) {
        return {
          step_id: current.step_id,
          outcome: "PASS",
          reason: null,
          observation: { value: current.payload.value },
        };
      },
      reduce_state: reducer,
      async evaluate_goal() {
        return { status: "CONTINUE", reason: null };
      },
    });
    expect(result.status).toBe("BUDGET_EXHAUSTED");
    expect(result.step_count).toBe(3);
    expect(result.episode).toBe(3);
  });

  test("keeps a 120-step multi-surface soak bounded through episode rollover", async () => {
    const persistence = new MemoryPersistence();
    const surfaceIds = surfaces().map((surface) => surface.surface_id);
    const result = await runSimulationSession({
      contract: contract({
        max_steps: 120,
        max_parallel_steps: 3,
        max_steps_per_episode: 12,
      }),
      initial_state: { completed: [], values: {} },
      surfaces: surfaces(),
      persistence,
      async next_steps({ checkpoint }) {
        const start = checkpoint.step_count;
        return Array.from({ length: Math.min(3, 120 - start) }, (_, offset) => {
          const index = start + offset;
          return step(`soak-${index}`, surfaceIds[index % surfaceIds.length]!, [
            `resource:${index}`,
          ]);
        });
      },
      async execute_step(current) {
        return {
          step_id: current.step_id,
          outcome: "PASS",
          reason: null,
          observation: { value: current.payload.value },
        };
      },
      reduce_state: reducer,
      async evaluate_goal({ checkpoint }) {
        return checkpoint.step_count === 120
          ? { status: "ACHIEVED", reason: "the soak purpose completed" }
          : { status: "CONTINUE", reason: null };
      },
    });

    expect(result.status).toBe("ACHIEVED");
    expect(result.step_count).toBe(120);
    expect(result.episode).toBe(10);
    expect(persistence.checkpoints.length).toBeLessThanOrEqual(132);
    expect(
      Math.max(
        ...persistence.checkpoints.map((checkpoint) =>
          Buffer.byteLength(JSON.stringify(checkpoint), "utf8"),
        ),
      ),
    ).toBeLessThan(contract().limits.max_checkpoint_bytes);
  });
});
