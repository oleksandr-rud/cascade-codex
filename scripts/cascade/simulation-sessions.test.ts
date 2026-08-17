import { describe, expect, test } from "bun:test";

import { CascadeError, valueDigest } from "./common";
import {
  runSimulationSession,
  simulationCheckpointDigest,
  simulationEventDigest,
  simulationSessionContractDigest,
  validateSimulationJournal,
  validateSimulationSessionHistory,
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

  async readCheckpoints(): Promise<Array<SimulationSessionCheckpoint<TestState>>> {
    return structuredClone(this.checkpoints);
  }

  async readEvents(): Promise<SimulationSessionEvent[]> {
    return structuredClone(this.events);
  }

  async heartbeat(): Promise<void> {
    this.heartbeats += 1;
  }
}

class FaultAfterDurableWritePersistence extends MemoryPersistence {
  durableWrites = 0;
  failAfter: number | null;

  constructor(failAfter: number | null) {
    super();
    this.failAfter = failAfter;
  }

  private failIfSelected(): void {
    this.durableWrites += 1;
    if (this.failAfter === this.durableWrites) {
      this.failAfter = null;
      throw new Error(`injected crash after durable write ${this.durableWrites}`);
    }
  }

  override async appendEvent(event: SimulationSessionEvent): Promise<void> {
    await super.appendEvent(event);
    this.failIfSelected();
  }

  override async writeCheckpoint(
    checkpoint: SimulationSessionCheckpoint<TestState>,
  ): Promise<void> {
    await super.writeCheckpoint(checkpoint);
    this.failIfSelected();
  }
}

function contract(overrides: Partial<SimulationSessionContract["limits"]> = {}): SimulationSessionContract {
  return {
    schema_version: 1,
    session_id: "session-test",
    purpose: "complete the cross-surface fixture",
    initial_surfaces: surfaces().map(({ surface_id, kind, context_id }) => ({
      surface_id,
      kind,
      context_id,
    })),
    authorized_surfaces: [
      ...surfaces().map(({ surface_id, kind, context_id }) => ({
        surface_id,
        kind,
        context_id,
      })),
      {
        surface_id: "browser:receipt",
        kind: "browser",
        context_id: "customer-session",
      },
      {
        surface_id: "browser:popup",
        kind: "browser",
        context_id: "customer-session",
      },
    ],
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

function resealJournal(events: SimulationSessionEvent[]): void {
  let previous: string | null = null;
  for (const [sequence, event] of events.entries()) {
    event.sequence = sequence;
    event.previous_event_digest = previous;
    event.event_digest = simulationEventDigest({ ...event, event_digest: "" });
    previous = event.event_digest;
  }
}

function initialSessionPrefix(
  baseContract: SimulationSessionContract,
): {
  persistence: MemoryPersistence;
  checkpoint: SimulationSessionCheckpoint<TestState>;
} {
  const persistence = new MemoryPersistence();
  const at = new Date().toISOString();
  const checkpoint: SimulationSessionCheckpoint<TestState> = {
    schema_version: 1,
    checkpoint_id: `${baseContract.session_id}:checkpoint:00000000`,
    checkpoint_digest: "",
    contract_digest: simulationSessionContractDigest(baseContract),
    session_id: baseContract.session_id,
    purpose: baseContract.purpose,
    status: "RUNNING",
    reason: null,
    revision: 0,
    started_at: at,
    updated_at: at,
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
  const started: SimulationSessionEvent = {
    schema_version: 1,
    session_id: baseContract.session_id,
    contract_digest: simulationSessionContractDigest(baseContract),
    sequence: 0,
    event_type: "SESSION_STARTED",
    at,
    episode: 1,
    step_ids: [],
    surface_ids: baseContract.initial_surfaces.map((surface) => surface.surface_id),
    status: "RUNNING",
    reason: null,
    checkpoint_digest: checkpoint.checkpoint_digest,
    previous_event_digest: null,
    event_digest: "",
  };
  started.event_digest = simulationEventDigest(started);
  persistence.checkpoints.push(structuredClone(checkpoint));
  persistence.events.push(started);
  return { persistence, checkpoint };
}

describe("simulation session controller", () => {
  test("recovers every durable session write prefix without redispatch", async () => {
    const baseContract = contract({
      max_steps: 3,
      max_parallel_steps: 1,
      max_steps_per_episode: 1,
    });
    const required = ["fault-one", "fault-two", "fault-three"];
    const run = (
      persistence: FaultAfterDurableWritePersistence,
      executed: Map<string, number>,
      resume: boolean,
    ) => runSimulationSession({
      contract: baseContract,
      initial_state: { completed: [], values: {} },
      surfaces: surfaces(),
      persistence,
      resume,
      async next_steps({ checkpoint }) {
        const id = required.find(
          (candidate) => !checkpoint.completed_step_ids.includes(candidate),
        );
        return id ? [step(id, "http:orders")] : [];
      },
      async execute_step(current) {
        executed.set(current.step_id, (executed.get(current.step_id) ?? 0) + 1);
        return {
          step_id: current.step_id,
          outcome: "PASS" as const,
          reason: null,
          observation: { value: current.payload.value },
        };
      },
      reduce_state: reducer,
      evaluate_goal: goal(required),
    });

    const baseline = new FaultAfterDurableWritePersistence(null);
    await run(baseline, new Map(), false);
    const durableWriteCount = baseline.durableWrites;
    expect(durableWriteCount).toBeGreaterThan(10);

    for (let failurePoint = 1; failurePoint <= durableWriteCount; failurePoint += 1) {
      const persistence = new FaultAfterDurableWritePersistence(failurePoint);
      const executed = new Map<string, number>();
      await expect(run(persistence, executed, false)).rejects.toThrow(
        `injected crash after durable write ${failurePoint}`,
      );
      const result = await run(persistence, executed, true);
      expect(["ACHIEVED", "UNKNOWN_OUTCOME"]).toContain(result.status);
      expect([...executed.values()].every((count) => count === 1)).toBe(true);
      expect(() => validateSimulationSessionHistory(
        persistence.events,
        persistence.checkpoints,
        baseContract,
      )).not.toThrow();
    }
  });

  test("rejects coherently resealed lifecycle violations and post-terminal events", async () => {
    const persistence = new MemoryPersistence();
    const baseContract = contract({
      max_steps: 1,
      max_parallel_steps: 1,
      max_steps_per_episode: 1,
    });
    const clockStart = Date.parse("2026-08-06T00:00:00.000Z");
    let clockTick = 0;
    await runSimulationSession({
      contract: baseContract,
      initial_state: { completed: [], values: {} },
      surfaces: surfaces(),
      persistence,
      now: () => new Date(clockStart + clockTick++),
      async next_steps() {
        return [step("one-step", "http:orders")];
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
      evaluate_goal: goal(["one-step"]),
    });

    const mutate = (
      operation: (events: SimulationSessionEvent[]) => void,
    ): SimulationSessionEvent[] => {
      const events = structuredClone(persistence.events);
      operation(events);
      resealJournal(events);
      return events;
    };
    const startedIndex = persistence.events.findIndex(
      (event) => event.event_type === "STEP_STARTED",
    );
    const completedIndex = persistence.events.findIndex(
      (event) => event.event_type === "STEP_COMPLETED",
    );
    const terminalIndex = persistence.events.findIndex(
      (event) => event.event_type === "SESSION_TERMINATED",
    );
    const invalidJournals = [
      mutate((events) => events.splice(startedIndex, 1)),
      mutate((events) => {
        events[startedIndex]!.episode = 2;
      }),
      mutate((events) => {
        events.splice(completedIndex, 0, structuredClone(events[startedIndex]!));
      }),
      mutate((events) => {
        events[terminalIndex]!.status = "RUNNING";
      }),
      mutate((events) => {
        events.push({
          ...structuredClone(events.at(-1)!),
          event_type: "SESSION_RESUMED",
          step_ids: [],
          surface_ids: [],
          status: "RUNNING",
          reason: null,
        });
      }),
    ];
    for (const events of invalidJournals) {
      expect(() => validateSimulationJournal(events, baseContract)).toThrow();
    }
  });

  test("resumes the exact initialization checkpoint prefix and rejects malformed resume order or identity", async () => {
    const baseContract = contract({
      max_steps: 1,
      max_parallel_steps: 1,
      max_steps_per_episode: 1,
    });
    const { persistence, checkpoint: initialCheckpoint } = initialSessionPrefix(
      baseContract,
    );
    const result = await runSimulationSession({
      contract: baseContract,
      initial_state: { completed: [], values: {} },
      surfaces: surfaces(),
      persistence,
      resume: true,
      async next_steps() {
        return [step("resumed-step", "http:orders")];
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
      evaluate_goal: goal(["resumed-step"]),
    });
    expect(result.status).toBe("ACHIEVED");
    expect(persistence.events.map((event) => event.event_type)).toEqual([
      "SESSION_STARTED",
      "SESSION_RESUMED",
      "STEP_STARTED",
      "STEP_COMPLETED",
      "SESSION_TERMINATED",
    ]);
    expect(() =>
      validateSimulationSessionHistory(
        persistence.events,
        persistence.checkpoints,
        baseContract,
      )
    ).not.toThrow();

    const validResumePrefix = structuredClone(persistence.events.slice(0, 2));
    const episodeAfterResume = structuredClone(validResumePrefix);
    const invalidEpisode = {
      ...structuredClone(episodeAfterResume[1]!),
      event_type: "EPISODE_STARTED" as const,
      checkpoint_digest: undefined,
    };
    episodeAfterResume.push(invalidEpisode);
    resealJournal(episodeAfterResume);
    expect(() => validateSimulationJournal(episodeAfterResume, baseContract))
      .toThrow("lifecycle is invalid at sequence 2");

    const resumeWhileStepPending = structuredClone(
      persistence.events.slice(0, 3),
    );
    resumeWhileStepPending.push({
      ...structuredClone(validResumePrefix[1]!),
      at: resumeWhileStepPending.at(-1)!.at,
    });
    resealJournal(resumeWhileStepPending);
    expect(() => validateSimulationJournal(resumeWhileStepPending, baseContract))
      .toThrow("lifecycle is invalid at sequence 3");

    const wrongEpisode = structuredClone(validResumePrefix);
    wrongEpisode[1]!.episode = 2;
    resealJournal(wrongEpisode);
    expect(() => validateSimulationJournal(wrongEpisode, baseContract))
      .toThrow("lifecycle is invalid at sequence 1");

    const foreignCheckpoint = structuredClone(validResumePrefix);
    foreignCheckpoint[1]!.checkpoint_digest = "f".repeat(64);
    resealJournal(foreignCheckpoint);
    expect(() =>
      validateSimulationSessionHistory(
        foreignCheckpoint,
        [initialCheckpoint],
        baseContract,
      )
    ).toThrow("checkpoint reference is stale at sequence 1");
  });

  test("rejects a resealed checkpoint whose digest occurs away from its exact boundary", async () => {
    const persistence = new MemoryPersistence();
    const baseContract = contract({
      max_steps: 1,
      max_parallel_steps: 1,
      max_steps_per_episode: 1,
    });
    await runSimulationSession({
      contract: baseContract,
      initial_state: { completed: [], values: {} },
      surfaces: surfaces(),
      persistence,
      async next_steps() {
        return [step("boundary-step", "http:orders")];
      },
      async execute_step(current) {
        return { step_id: current.step_id, outcome: "PASS", reason: null };
      },
      reduce_state: reducer,
      evaluate_goal: goal(["boundary-step"]),
    });
    const checkpoints = structuredClone(persistence.checkpoints);
    const events = structuredClone(persistence.events);
    const latest = checkpoints.at(-1)!;
    latest.last_event_digest = events[0]!.event_digest;
    latest.checkpoint_digest = simulationCheckpointDigest(latest);
    events.at(-1)!.checkpoint_digest = latest.checkpoint_digest;
    resealJournal(events);
    expect(() =>
      validateSimulationSessionHistory(events, checkpoints, baseContract)
    ).toThrow("exact journal boundary");
  });

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
    const sessionStarted: SimulationSessionEvent = {
      schema_version: 1,
      session_id: baseContract.session_id,
      contract_digest: simulationSessionContractDigest(baseContract),
      sequence: 0,
      event_type: "SESSION_STARTED",
      at: checkpoint.updated_at,
      episode: 1,
      step_ids: [],
      surface_ids: baseContract.initial_surfaces.map((surface) => surface.surface_id),
      status: "RUNNING",
      reason: null,
      checkpoint_digest: checkpoint.checkpoint_digest,
      previous_event_digest: null,
      event_digest: "",
    };
    sessionStarted.event_digest = simulationEventDigest(sessionStarted);
    const episodeStarted: SimulationSessionEvent = {
      schema_version: 1,
      session_id: baseContract.session_id,
      contract_digest: simulationSessionContractDigest(baseContract),
      sequence: 1,
      event_type: "EPISODE_STARTED",
      at: checkpoint.updated_at,
      episode: 1,
      step_ids: [],
      surface_ids: [],
      status: "RUNNING",
      reason: null,
      previous_event_digest: sessionStarted.event_digest,
      event_digest: "",
    };
    episodeStarted.event_digest = simulationEventDigest(episodeStarted);
    const started: SimulationSessionEvent = {
      schema_version: 1,
      session_id: baseContract.session_id,
      contract_digest: simulationSessionContractDigest(baseContract),
      sequence: 2,
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
      previous_event_digest: episodeStarted.event_digest,
      event_digest: "",
    };
    started.event_digest = simulationEventDigest(started);
    persistence.events.push(sessionStarted, episodeStarted, started);

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
    const sessionStarted: SimulationSessionEvent = {
      schema_version: 1,
      session_id: baseContract.session_id,
      contract_digest: simulationSessionContractDigest(baseContract),
      sequence: 0,
      event_type: "SESSION_STARTED",
      at: checkpoint.updated_at,
      episode: 1,
      step_ids: [],
      surface_ids: baseContract.initial_surfaces.map((surface) => surface.surface_id),
      status: "RUNNING",
      reason: null,
      checkpoint_digest: checkpoint.checkpoint_digest,
      previous_event_digest: null,
      event_digest: "",
    };
    sessionStarted.event_digest = simulationEventDigest(sessionStarted);
    persistence.events.push(sessionStarted);

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
    ).rejects.toThrow("exact journal boundary");
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
    const changedContract = contract({ max_steps: 11 });
    const sessionStarted: SimulationSessionEvent = {
      schema_version: 1,
      session_id: changedContract.session_id,
      contract_digest: simulationSessionContractDigest(changedContract),
      sequence: 0,
      event_type: "SESSION_STARTED",
      at: checkpoint.updated_at,
      episode: 1,
      step_ids: [],
      surface_ids: changedContract.initial_surfaces.map((surface) => surface.surface_id),
      status: "RUNNING",
      reason: null,
      checkpoint_digest: checkpoint.checkpoint_digest,
      previous_event_digest: null,
      event_digest: "",
    };
    sessionStarted.event_digest = simulationEventDigest(sessionStarted);
    persistence.events.push(sessionStarted);

    await expect(
      runSimulationSession({
        contract: changedContract,
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
    expect(result.last_batch_step_ids).toEqual(["hung-write"]);
    expect(result.completed_step_ids).toEqual([]);
    const started = persistence.events.find((event) => event.event_type === "STEP_STARTED");
    expect(started?.step_bindings?.[0]?.step_id).toBe("hung-write");
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
