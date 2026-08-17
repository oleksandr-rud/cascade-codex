import { CascadeError, stableJson, valueDigest } from "./common";

export type SimulationSurfaceKind =
  | "command"
  | "http"
  | "terminal"
  | "browser"
  | "desktop"
  | "mobile"
  | "agent-response";

export type SimulationSurfaceLifecycle =
  | "READY"
  | "ACTIVE"
  | "BACKGROUND"
  | "CLOSED"
  | "LOST";

export type SimulationSessionStatus =
  | "RUNNING"
  | "ACHIEVED"
  | "FAILED"
  | "BLOCKED"
  | "TIMED_OUT"
  | "BUDGET_EXHAUSTED"
  | "CANCELLED"
  | "UNKNOWN_OUTCOME";

export interface SimulationSurfaceSession {
  surface_id: string;
  kind: SimulationSurfaceKind;
  context_id: string;
  window_id?: string;
  screen_id?: string;
  lifecycle: SimulationSurfaceLifecycle;
  generation: number;
  last_observation_digest?: string;
}

export interface SimulationSurfaceIdentity {
  surface_id: string;
  kind: SimulationSurfaceKind;
  context_id: string;
}

export interface SimulationSurfaceUpdate {
  surface_id: string;
  kind?: SimulationSurfaceKind;
  context_id?: string;
  window_id?: string;
  screen_id?: string;
  lifecycle?: SimulationSurfaceLifecycle;
  generation?: number;
  last_observation_digest?: string;
}

export interface SimulationSessionLimits {
  max_duration_ms: number;
  max_step_duration_ms: number;
  max_steps: number;
  max_parallel_steps: number;
  max_steps_per_episode: number;
  max_surfaces: number;
  max_checkpoint_bytes: number;
}

export interface SimulationSessionContract {
  schema_version: 1;
  session_id: string;
  purpose: string;
  initial_surfaces: SimulationSurfaceIdentity[];
  authorized_surfaces: SimulationSurfaceIdentity[];
  limits: SimulationSessionLimits;
}

export interface SimulationSessionStep<TPayload = unknown> {
  step_id: string;
  idempotency_key: string;
  surface_id: string;
  conflict_keys: string[];
  required: boolean;
  payload: TPayload;
}

export type SimulationStepOutcome =
  | "PASS"
  | "FAIL"
  | "BLOCKED"
  | "CANCELLED"
  | "UNKNOWN_OUTCOME";

export interface SimulationSessionStepResult<TObservation = unknown> {
  step_id: string;
  outcome: SimulationStepOutcome;
  reason: string | null;
  observation?: TObservation;
  surface_updates?: SimulationSurfaceUpdate[];
}

export interface SimulationSessionStepBinding {
  step_id: string;
  surface_id: string;
  required: boolean;
  idempotency_key_digest: string;
  conflict_keys_digest: string;
  payload_digest: string;
}

export interface SimulationGoalResult {
  status: "ACHIEVED" | "CONTINUE" | "FAILED" | "BLOCKED";
  reason: string | null;
}

export interface SimulationSessionCheckpoint<TState> {
  schema_version: 1;
  checkpoint_id: string;
  checkpoint_digest: string;
  contract_digest: string;
  session_id: string;
  purpose: string;
  status: SimulationSessionStatus;
  reason: string | null;
  revision: number;
  started_at: string;
  updated_at: string;
  episode: number;
  episode_step_count: number;
  step_count: number;
  completed_step_ids: string[];
  completed_idempotency_keys: string[];
  last_batch_step_ids: string[];
  surfaces: SimulationSurfaceSession[];
  domain_state: TState;
  last_event_digest: string | null;
}

export type SimulationSessionEventType =
  | "SESSION_STARTED"
  | "SESSION_RESUMED"
  | "EPISODE_STARTED"
  | "EPISODE_COMPLETED"
  | "STEP_STARTED"
  | "STEP_COMPLETED"
  | "SESSION_TERMINATED";

export interface SimulationSessionEvent {
  schema_version: 1;
  session_id: string;
  contract_digest: string;
  sequence: number;
  event_type: SimulationSessionEventType;
  at: string;
  episode: number;
  step_ids: string[];
  surface_ids: string[];
  status?: SimulationSessionStatus;
  reason?: string | null;
  checkpoint_digest?: string;
  step_bindings?: SimulationSessionStepBinding[];
  previous_event_digest: string | null;
  event_digest: string;
}

export interface SimulationSessionPersistence<TState> {
  appendEvent(event: SimulationSessionEvent): Promise<void>;
  writeCheckpoint(checkpoint: SimulationSessionCheckpoint<TState>): Promise<void>;
  readLatestCheckpoint(): Promise<SimulationSessionCheckpoint<TState> | null>;
  readCheckpoints(): Promise<Array<SimulationSessionCheckpoint<TState>>>;
  readEvents(): Promise<SimulationSessionEvent[]>;
  heartbeat(): Promise<void>;
}

export interface SimulationSessionContext<TState> {
  checkpoint: SimulationSessionCheckpoint<TState>;
  signal?: AbortSignal;
}

export interface RunSimulationSessionInput<TState, TPayload, TObservation> {
  contract: SimulationSessionContract;
  initial_state: TState;
  surfaces: SimulationSurfaceSession[];
  persistence: SimulationSessionPersistence<TState>;
  next_steps(
    context: SimulationSessionContext<TState>,
  ): Promise<Array<SimulationSessionStep<TPayload>>>;
  execute_step(
    step: SimulationSessionStep<TPayload>,
    context: SimulationSessionContext<TState>,
  ): Promise<SimulationSessionStepResult<TObservation>>;
  reduce_state(
    state: TState,
    step: SimulationSessionStep<TPayload>,
    result: SimulationSessionStepResult<TObservation>,
  ): TState;
  evaluate_goal(
    context: SimulationSessionContext<TState>,
  ): Promise<SimulationGoalResult>;
  resume?: boolean;
  signal?: AbortSignal;
  now?: () => Date;
}

const TERMINAL_STATUSES = new Set<SimulationSessionStatus>([
  "ACHIEVED",
  "FAILED",
  "BLOCKED",
  "TIMED_OUT",
  "BUDGET_EXHAUSTED",
  "CANCELLED",
  "UNKNOWN_OUTCOME",
]);
const SESSION_STATUSES = new Set<SimulationSessionStatus>([
  "RUNNING",
  ...TERMINAL_STATUSES,
]);
const SURFACE_KINDS = new Set<SimulationSurfaceKind>([
  "command",
  "http",
  "terminal",
  "browser",
  "desktop",
  "mobile",
  "agent-response",
]);
const SURFACE_LIFECYCLES = new Set<SimulationSurfaceLifecycle>([
  "READY",
  "ACTIVE",
  "BACKGROUND",
  "CLOSED",
  "LOST",
]);
const EVENT_TYPES = new Set<SimulationSessionEventType>([
  "SESSION_STARTED",
  "SESSION_RESUMED",
  "EPISODE_STARTED",
  "EPISODE_COMPLETED",
  "STEP_STARTED",
  "STEP_COMPLETED",
  "SESSION_TERMINATED",
]);

function nonEmpty(value: string, label: string): void {
  if (!value.trim()) throw new CascadeError(`${label} must be non-empty`);
}

function positiveInteger(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new CascadeError(`${label} must be a positive safe integer`);
  }
}

function surfaceIdentity(
  surface: SimulationSurfaceSession | SimulationSurfaceIdentity,
): SimulationSurfaceIdentity {
  return {
    surface_id: surface.surface_id,
    kind: surface.kind,
    context_id: surface.context_id,
  };
}

function validateSurfaceIdentities(
  identities: SimulationSurfaceIdentity[],
  label: string,
): void {
  const ids = new Set<string>();
  for (const identity of identities) {
    nonEmpty(identity.surface_id, `${label} id`);
    nonEmpty(identity.context_id, `${label} ${identity.surface_id} context`);
    if (!SURFACE_KINDS.has(identity.kind)) {
      throw new CascadeError(`${label} ${identity.surface_id} kind is invalid`);
    }
    if (ids.has(identity.surface_id)) {
      throw new CascadeError(`duplicate ${label}: ${identity.surface_id}`);
    }
    ids.add(identity.surface_id);
  }
}

function authorizedSurfaceMap(
  contract: SimulationSessionContract,
): Map<string, SimulationSurfaceIdentity> {
  return new Map(
    contract.authorized_surfaces.map((surface) => [surface.surface_id, surface]),
  );
}

function validateSurfaceAuthority(
  surfaces: SimulationSurfaceSession[],
  contract: SimulationSessionContract,
  options: { require_initial_exact?: boolean } = {},
): void {
  validateSurfaces(surfaces, contract.limits.max_surfaces);
  const authorized = authorizedSurfaceMap(contract);
  for (const surface of surfaces) {
    const expected = authorized.get(surface.surface_id);
    if (!expected || stableJson(surfaceIdentity(surface)) !== stableJson(expected)) {
      throw new CascadeError(
        `simulation surface is outside the authorized session contract: ${surface.surface_id}`,
      );
    }
  }
  const present = new Set(surfaces.map((surface) => surface.surface_id));
  if (
    contract.initial_surfaces.some(
      (surface) => !present.has(surface.surface_id),
    )
  ) {
    throw new CascadeError(
      "simulation checkpoint omits an initial authorized surface",
    );
  }
  if (
    options.require_initial_exact &&
    stableJson(surfaces.map(surfaceIdentity)) !==
      stableJson(contract.initial_surfaces)
  ) {
    throw new CascadeError(
      "simulation initial surfaces do not exactly match the session contract",
    );
  }
}

export function validateSimulationSessionContract(
  contract: SimulationSessionContract,
): void {
  if (contract.schema_version !== 1) {
    throw new CascadeError("simulation session schema_version must be 1");
  }
  nonEmpty(contract.session_id, "simulation session id");
  nonEmpty(contract.purpose, "simulation session purpose");
  validateSurfaceIdentities(
    contract.initial_surfaces,
    "simulation initial surface",
  );
  validateSurfaceIdentities(
    contract.authorized_surfaces,
    "simulation authorized surface",
  );
  if (!contract.initial_surfaces.length || !contract.authorized_surfaces.length) {
    throw new CascadeError(
      "simulation session requires initial and authorized surfaces",
    );
  }
  const authorized = authorizedSurfaceMap(contract);
  if (
    contract.initial_surfaces.some((surface) =>
      stableJson(authorized.get(surface.surface_id)) !== stableJson(surface)
    )
  ) {
    throw new CascadeError(
      "simulation initial surfaces are not an exact subset of authorized surfaces",
    );
  }
  for (const [key, value] of Object.entries(contract.limits)) {
    positiveInteger(value, `simulation session limits.${key}`);
  }
  if (contract.limits.max_parallel_steps > contract.limits.max_steps) {
    throw new CascadeError(
      "simulation session max_parallel_steps cannot exceed max_steps",
    );
  }
  if (contract.limits.max_steps_per_episode > contract.limits.max_steps) {
    throw new CascadeError(
      "simulation session max_steps_per_episode cannot exceed max_steps",
    );
  }
  if (contract.limits.max_step_duration_ms > contract.limits.max_duration_ms) {
    throw new CascadeError(
      "simulation session max_step_duration_ms cannot exceed max_duration_ms",
    );
  }
  if (
    contract.limits.max_steps > 1_000_000 ||
    contract.limits.max_parallel_steps > 64 ||
    contract.limits.max_steps_per_episode > 10_000 ||
    contract.limits.max_surfaces > 10_000
  ) {
    throw new CascadeError(
      "simulation session step or surface bounds exceed safe limits",
    );
  }
  if (
    contract.limits.max_checkpoint_bytes < 1_024 ||
    contract.limits.max_checkpoint_bytes > 10 * 1_024 * 1_024
  ) {
    throw new CascadeError(
      "simulation session max_checkpoint_bytes must be between 1024 and 10485760",
    );
  }
}

export function simulationSessionContractDigest(
  contract: SimulationSessionContract,
): string {
  return valueDigest(contract);
}

function validateSurfaces(
  surfaces: SimulationSurfaceSession[],
  maxSurfaces?: number,
): void {
  if (!surfaces.length) {
    throw new CascadeError("simulation session requires at least one surface");
  }
  if (maxSurfaces !== undefined && surfaces.length > maxSurfaces) {
    throw new CascadeError(
      `simulation session exceeds max_surfaces ${maxSurfaces}`,
    );
  }
  const ids = new Set<string>();
  const activeContexts = new Set<string>();
  for (const surface of surfaces) {
    nonEmpty(surface.surface_id, "simulation surface id");
    nonEmpty(surface.context_id, `simulation surface ${surface.surface_id} context`);
    if (!SURFACE_KINDS.has(surface.kind)) {
      throw new CascadeError(
        `simulation surface ${surface.surface_id} kind is invalid`,
      );
    }
    if (!SURFACE_LIFECYCLES.has(surface.lifecycle)) {
      throw new CascadeError(
        `simulation surface ${surface.surface_id} lifecycle is invalid`,
      );
    }
    if (ids.has(surface.surface_id)) {
      throw new CascadeError(`duplicate simulation surface: ${surface.surface_id}`);
    }
    if (!Number.isInteger(surface.generation) || surface.generation < 0) {
      throw new CascadeError(
        `simulation surface ${surface.surface_id} generation must be non-negative`,
      );
    }
    if (surface.lifecycle === "ACTIVE") {
      if (activeContexts.has(surface.context_id)) {
        throw new CascadeError(
          `simulation context has more than one active surface: ${surface.context_id}`,
        );
      }
      activeContexts.add(surface.context_id);
    }
    ids.add(surface.surface_id);
  }
}

function checkpointWithoutDigest<TState>(
  checkpoint: SimulationSessionCheckpoint<TState>,
): Omit<SimulationSessionCheckpoint<TState>, "checkpoint_digest"> {
  const { checkpoint_digest: _digest, ...value } = checkpoint;
  return value;
}

export function simulationCheckpointDigest<TState>(
  checkpoint: SimulationSessionCheckpoint<TState>,
): string {
  return valueDigest(checkpointWithoutDigest(checkpoint));
}

export function validateSimulationCheckpoint<TState>(
  checkpoint: SimulationSessionCheckpoint<TState>,
  contract: SimulationSessionContract,
): void {
  if (
    checkpoint.schema_version !== 1 ||
    checkpoint.contract_digest !== simulationSessionContractDigest(contract) ||
    checkpoint.session_id !== contract.session_id ||
    checkpoint.purpose !== contract.purpose
  ) {
    throw new CascadeError("simulation checkpoint identity does not match session");
  }
  if (
    checkpoint.checkpoint_id !==
    `${contract.session_id}:checkpoint:${String(checkpoint.revision).padStart(8, "0")}`
  ) {
    throw new CascadeError("simulation checkpoint id does not match its revision");
  }
  if (!SESSION_STATUSES.has(checkpoint.status)) {
    throw new CascadeError("simulation checkpoint status is invalid");
  }
  if (
    Number.isNaN(Date.parse(checkpoint.started_at)) ||
    Number.isNaN(Date.parse(checkpoint.updated_at)) ||
    Date.parse(checkpoint.updated_at) < Date.parse(checkpoint.started_at) ||
    !Number.isInteger(checkpoint.episode) ||
    checkpoint.episode < 1 ||
    !Number.isInteger(checkpoint.episode_step_count) ||
    checkpoint.episode_step_count < 0 ||
    !Number.isInteger(checkpoint.step_count) ||
    checkpoint.step_count < 0 ||
    checkpoint.step_count > contract.limits.max_steps ||
    checkpoint.episode_step_count > contract.limits.max_steps_per_episode
  ) {
    throw new CascadeError("simulation checkpoint counters or timestamps are invalid");
  }
  if (checkpoint.checkpoint_digest !== simulationCheckpointDigest(checkpoint)) {
    throw new CascadeError("simulation checkpoint digest is stale or invalid");
  }
  if (Buffer.byteLength(stableJson(checkpoint), "utf8") > contract.limits.max_checkpoint_bytes) {
    throw new CascadeError(
      `simulation checkpoint exceeds ${contract.limits.max_checkpoint_bytes} bytes`,
    );
  }
  if (
    checkpoint.step_count !== checkpoint.completed_step_ids.length ||
    checkpoint.step_count !== checkpoint.completed_idempotency_keys.length
  ) {
    throw new CascadeError("simulation checkpoint completed-step accounting is invalid");
  }
  if (!Number.isInteger(checkpoint.revision) || checkpoint.revision < 0) {
    throw new CascadeError("simulation checkpoint revision must be non-negative");
  }
  if (
    new Set(checkpoint.completed_step_ids).size !==
      checkpoint.completed_step_ids.length ||
    new Set(checkpoint.completed_idempotency_keys).size !==
      checkpoint.completed_idempotency_keys.length
  ) {
    throw new CascadeError("simulation checkpoint contains duplicate completed steps");
  }
  if (
    checkpoint.last_batch_step_ids.some(
      (stepId) => !checkpoint.completed_step_ids.includes(stepId),
    ) &&
    !new Set<SimulationSessionStatus>(["CANCELLED", "UNKNOWN_OUTCOME"]).has(
      checkpoint.status,
    )
  ) {
    throw new CascadeError("simulation checkpoint last batch is not completed");
  }
  validateSurfaceAuthority(checkpoint.surfaces, contract);
}

function eventWithoutDigest(
  event: SimulationSessionEvent,
): Omit<SimulationSessionEvent, "event_digest"> {
  const { event_digest: _digest, ...value } = event;
  return value;
}

export function simulationEventDigest(event: SimulationSessionEvent): string {
  return valueDigest(eventWithoutDigest(event));
}

export function validateSimulationJournal(
  events: SimulationSessionEvent[],
  contract: SimulationSessionContract,
): void {
  let previous: string | null = null;
  const contractDigest = simulationSessionContractDigest(contract);
  const authorizedSurfaceIds = new Set(
    contract.authorized_surfaces.map((surface) => surface.surface_id),
  );
  const seenStepIds = new Set<string>();
  let phase:
    | "EXPECT_SESSION_STARTED"
    | "EXPECT_EPISODE_STARTED"
    | "ACTIVE"
    | "STEP_OPEN"
    | "EXPECT_TERMINATION"
    | "TERMINATED" = "EXPECT_SESSION_STARTED";
  let episode = 1;
  let pendingStep: SimulationSessionEvent | null = null;
  let previousAt = Number.NEGATIVE_INFINITY;
  for (const [index, event] of events.entries()) {
    const bindings = event.step_bindings ?? [];
    const bindingStepIds = bindings.map((binding) => binding.step_id);
    const bindingSurfaceIds = bindings.map((binding) => binding.surface_id);
    const bindingsValid = bindings.every(
      (binding) =>
        Boolean(binding.step_id.trim()) &&
        Boolean(binding.surface_id.trim()) &&
        /^[a-f0-9]{64}$/.test(binding.idempotency_key_digest) &&
        /^[a-f0-9]{64}$/.test(binding.conflict_keys_digest) &&
        /^[a-f0-9]{64}$/.test(binding.payload_digest),
    );
    const dispatchBindingValid =
      !new Set<SimulationSessionEventType>(["STEP_STARTED", "STEP_COMPLETED"]).has(
        event.event_type,
      ) ||
      (bindings.length === event.step_ids.length &&
        stableJson(bindingStepIds) === stableJson(event.step_ids) &&
        stableJson(bindingSurfaceIds) === stableJson(event.surface_ids));
    const at = Date.parse(event.at);
    if (
      event.schema_version !== 1 ||
      event.session_id !== contract.session_id ||
      event.contract_digest !== contractDigest ||
      event.sequence !== index ||
      !EVENT_TYPES.has(event.event_type) ||
      (event.status !== undefined && !SESSION_STATUSES.has(event.status)) ||
      Number.isNaN(at) ||
      at < previousAt ||
      !Number.isInteger(event.episode) ||
      event.episode < 1 ||
      new Set(event.step_ids).size !== event.step_ids.length ||
      event.step_ids.some((stepId) => !stepId.trim()) ||
      new Set(event.surface_ids).size !== event.surface_ids.length ||
      event.surface_ids.some(
        (surfaceId) => !surfaceId.trim() || !authorizedSurfaceIds.has(surfaceId),
      ) ||
      new Set(bindingStepIds).size !== bindingStepIds.length ||
      !bindingsValid ||
      !dispatchBindingValid ||
      event.previous_event_digest !== previous ||
      event.event_digest !== simulationEventDigest(event) ||
      (event.checkpoint_digest !== undefined &&
        !/^[a-f0-9]{64}$/.test(event.checkpoint_digest))
    ) {
      throw new CascadeError(`simulation journal is invalid at sequence ${index}`);
    }

    const emptySteps = event.step_ids.length === 0;
    const emptySurfaces = event.surface_ids.length === 0;
    const noBindings = event.step_bindings === undefined;
    const running = event.status === "RUNNING";
    const commonControlShape = emptySteps && emptySurfaces && noBindings;
    let lifecycleValid = false;
    switch (event.event_type) {
      case "SESSION_STARTED":
        lifecycleValid =
          phase === "EXPECT_SESSION_STARTED" &&
          index === 0 &&
          event.episode === 1 &&
          emptySteps &&
          stableJson(event.surface_ids) === stableJson(
            contract.initial_surfaces.map((surface) => surface.surface_id),
          ) &&
          noBindings &&
          running &&
          event.reason === null &&
          event.checkpoint_digest !== undefined;
        if (lifecycleValid) phase = "EXPECT_EPISODE_STARTED";
        break;
      case "SESSION_RESUMED": {
        const resumesInterruptedInitialization =
          phase === "EXPECT_EPISODE_STARTED" &&
          index === 1 &&
          events[0]?.event_type === "SESSION_STARTED";
        lifecycleValid =
          (phase === "ACTIVE" || resumesInterruptedInitialization) &&
          event.episode === episode &&
          commonControlShape &&
          running &&
          event.reason === null &&
          event.checkpoint_digest !== undefined;
        if (lifecycleValid) phase = "ACTIVE";
        break;
      }
      case "EPISODE_STARTED":
        lifecycleValid =
          phase === "EXPECT_EPISODE_STARTED" &&
          event.episode === episode &&
          commonControlShape &&
          running &&
          event.reason === null;
        if (lifecycleValid) phase = "ACTIVE";
        break;
      case "EPISODE_COMPLETED":
        lifecycleValid =
          phase === "ACTIVE" &&
          event.episode === episode &&
          commonControlShape &&
          running &&
          typeof event.reason === "string" &&
          Boolean(event.reason.trim()) &&
          event.checkpoint_digest !== undefined;
        if (lifecycleValid) {
          episode += 1;
          phase = "EXPECT_EPISODE_STARTED";
        }
        break;
      case "STEP_STARTED":
        lifecycleValid =
          phase === "ACTIVE" &&
          event.episode === episode &&
          event.step_ids.length > 0 &&
          event.step_ids.every((stepId) => !seenStepIds.has(stepId)) &&
          event.step_bindings !== undefined &&
          running &&
          event.reason === null &&
          event.checkpoint_digest === undefined;
        if (lifecycleValid) {
          event.step_ids.forEach((stepId) => seenStepIds.add(stepId));
          pendingStep = event;
          phase = "STEP_OPEN";
        }
        break;
      case "STEP_COMPLETED":
        lifecycleValid =
          phase === "STEP_OPEN" &&
          pendingStep !== null &&
          event.episode === episode &&
          stableJson(event.step_ids) === stableJson(pendingStep.step_ids) &&
          stableJson(event.surface_ids) === stableJson(pendingStep.surface_ids) &&
          stableJson(event.step_bindings) === stableJson(pendingStep.step_bindings) &&
          event.checkpoint_digest !== undefined;
        if (lifecycleValid) {
          pendingStep = null;
          phase = running ? "ACTIVE" : "EXPECT_TERMINATION";
        }
        break;
      case "SESSION_TERMINATED": {
        const priorEvent = events[index - 1];
        const terminalFromCompletedStep = priorEvent?.event_type === "STEP_COMPLETED";
        lifecycleValid =
          new Set(["ACTIVE", "STEP_OPEN", "EXPECT_TERMINATION"]).has(phase) &&
          event.episode === episode &&
          noBindings &&
          event.status !== undefined &&
          TERMINAL_STATUSES.has(event.status) &&
          event.checkpoint_digest !== undefined &&
          (!terminalFromCompletedStep ||
            (stableJson(event.step_ids) === stableJson(priorEvent.step_ids) &&
              stableJson(event.surface_ids) === stableJson(priorEvent.surface_ids)));
        if (lifecycleValid) {
          pendingStep = null;
          phase = "TERMINATED";
        }
        break;
      }
    }
    if (!lifecycleValid || phase === "TERMINATED" && index !== events.length - 1) {
      throw new CascadeError(
        `simulation journal lifecycle is invalid at sequence ${index}`,
      );
    }
    previous = event.event_digest;
    previousAt = at;
  }
}

export interface SimulationSessionHistoryValidation<TState> {
  latest_checkpoint: SimulationSessionCheckpoint<TState> | null;
  journal_tail: SimulationSessionEvent | null;
  terminal_event: SimulationSessionEvent | null;
}

function completedBatchSurfaceIds(
  events: SimulationSessionEvent[],
  stepIds: string[],
): string[] {
  if (!stepIds.length) return [];
  const completed = [...events].reverse().find(
    (event) =>
      new Set<SimulationSessionEventType>(["STEP_COMPLETED", "STEP_STARTED"]).has(
        event.event_type,
      ) &&
      stableJson(event.step_ids) === stableJson(stepIds),
  );
  if (!completed) {
    throw new CascadeError(
      "simulation checkpoint last batch lacks a dispatched journal batch",
    );
  }
  return completed.surface_ids;
}

function assertCheckpointSurfaceProgression<TState>(
  previous: SimulationSessionCheckpoint<TState>,
  current: SimulationSessionCheckpoint<TState>,
  contract: SimulationSessionContract,
): void {
  const currentById = new Map(
    current.surfaces.map((surface) => [surface.surface_id, surface]),
  );
  for (const surface of previous.surfaces) {
    const next = currentById.get(surface.surface_id);
    if (
      !next ||
      stableJson(surfaceIdentity(next)) !== stableJson(surfaceIdentity(surface)) ||
      next.generation < surface.generation
    ) {
      throw new CascadeError(
        `simulation checkpoint surface progression is invalid: ${surface.surface_id}`,
      );
    }
  }
  validateSurfaceAuthority(current.surfaces, contract);
}

export function validateSimulationSessionHistory<TState>(
  events: SimulationSessionEvent[],
  checkpoints: Array<SimulationSessionCheckpoint<TState>>,
  contract: SimulationSessionContract,
): SimulationSessionHistoryValidation<TState> {
  validateSimulationSessionContract(contract);
  validateSimulationJournal(events, contract);
  if (!events.length && !checkpoints.length) {
    return {
      latest_checkpoint: null,
      journal_tail: null,
      terminal_event: null,
    };
  }
  if (!events.length || !checkpoints.length) {
    throw new CascadeError(
      "simulation session journal and checkpoint history must both exist",
    );
  }

  const eventIndexByDigest = new Map(
    events.map((event, index) => [event.event_digest, index]),
  );
  const checkpointByDigest = new Map<string, SimulationSessionCheckpoint<TState>>();
  const checkpointAtEvent = new Map<number, SimulationSessionCheckpoint<TState>>();
  let previousCheckpoint: SimulationSessionCheckpoint<TState> | null = null;
  let previousAssociationIndex = -1;
  for (const [revision, checkpoint] of checkpoints.entries()) {
    validateSimulationCheckpoint(checkpoint, contract);
    if (
      checkpoint.revision !== revision ||
      checkpointByDigest.has(checkpoint.checkpoint_digest)
    ) {
      throw new CascadeError(
        `simulation checkpoint revision history is duplicate or gapped at ${revision}`,
      );
    }
    const boundaryIndex = checkpoint.last_event_digest === null
      ? -1
      : eventIndexByDigest.get(checkpoint.last_event_digest);
    if (
      boundaryIndex === undefined ||
      boundaryIndex < previousAssociationIndex ||
      (revision === 0 && boundaryIndex !== -1) ||
      (revision > 0 && boundaryIndex < 0)
    ) {
      throw new CascadeError(
        `simulation checkpoint ${revision} is not bound to its exact journal boundary`,
      );
    }
    const associationIndex = boundaryIndex + 1;
    const association = events[associationIndex];
    if (
      !association ||
      association.checkpoint_digest !== checkpoint.checkpoint_digest ||
      checkpointAtEvent.has(associationIndex) ||
      association.at !== checkpoint.updated_at ||
      association.episode !== checkpoint.episode
    ) {
      throw new CascadeError(
        `simulation checkpoint ${revision} is not bound to its exact journal boundary`,
      );
    }
    const boundary = boundaryIndex < 0 ? null : events[boundaryIndex]!;
    const expectedAssociation = revision === 0
      ? "SESSION_STARTED"
      : boundary?.event_type === "STEP_STARTED"
        ? new Set(["STEP_COMPLETED", "SESSION_TERMINATED"])
        : boundary?.event_type === "EPISODE_COMPLETED"
          ? "EPISODE_STARTED"
          : "SESSION_TERMINATED";
    if (
      typeof expectedAssociation === "string"
        ? association.event_type !== expectedAssociation
        : !expectedAssociation.has(association.event_type)
    ) {
      throw new CascadeError(
        `simulation checkpoint ${revision} has an invalid producer boundary`,
      );
    }

    if (revision === 0) {
      if (
        checkpoint.status !== "RUNNING" ||
        checkpoint.reason !== null ||
        checkpoint.episode !== 1 ||
        checkpoint.episode_step_count !== 0 ||
        checkpoint.step_count !== 0 ||
        checkpoint.completed_step_ids.length !== 0 ||
        checkpoint.completed_idempotency_keys.length !== 0 ||
        checkpoint.last_batch_step_ids.length !== 0
      ) {
        throw new CascadeError("simulation initial checkpoint state is invalid");
      }
      validateSurfaceAuthority(checkpoint.surfaces, contract, {
        require_initial_exact: true,
      });
    } else {
      const previous = previousCheckpoint!;
      if (
        checkpoint.started_at !== previous.started_at ||
        Date.parse(checkpoint.updated_at) < Date.parse(previous.updated_at) ||
        checkpoint.step_count < previous.step_count ||
        checkpoint.episode < previous.episode ||
        stableJson(checkpoint.completed_step_ids.slice(0, previous.step_count)) !==
          stableJson(previous.completed_step_ids) ||
        stableJson(
          checkpoint.completed_idempotency_keys.slice(0, previous.step_count),
        ) !== stableJson(previous.completed_idempotency_keys)
      ) {
        throw new CascadeError(
          `simulation checkpoint progression is invalid at revision ${revision}`,
        );
      }
      assertCheckpointSurfaceProgression(previous, checkpoint, contract);

      if (association.event_type === "STEP_COMPLETED") {
        const started = boundary!;
        const appendedStepIds = checkpoint.completed_step_ids.slice(
          previous.step_count,
        );
        const appendedKeys = checkpoint.completed_idempotency_keys.slice(
          previous.step_count,
        );
        const bindings = started.step_bindings!;
        if (
          checkpoint.episode !== previous.episode ||
          checkpoint.step_count !== previous.step_count + started.step_ids.length ||
          checkpoint.episode_step_count !==
            previous.episode_step_count + started.step_ids.length ||
          stableJson(appendedStepIds) !== stableJson(started.step_ids) ||
          stableJson(checkpoint.last_batch_step_ids) !== stableJson(started.step_ids) ||
          appendedKeys.length !== bindings.length ||
          appendedKeys.some(
            (key, index) => valueDigest(key) !== bindings[index]!.idempotency_key_digest,
          ) ||
          association.status !== checkpoint.status ||
          association.reason !== checkpoint.reason
        ) {
          throw new CascadeError(
            `simulation checkpoint batch projection is invalid at revision ${revision}`,
          );
        }
      } else if (association.event_type === "EPISODE_STARTED") {
        if (
          checkpoint.status !== "RUNNING" ||
          checkpoint.reason !== previous.reason ||
          checkpoint.episode !== previous.episode + 1 ||
          checkpoint.episode_step_count !== 0 ||
          checkpoint.step_count !== previous.step_count ||
          stableJson(checkpoint.completed_step_ids) !==
            stableJson(previous.completed_step_ids) ||
          stableJson(checkpoint.completed_idempotency_keys) !==
            stableJson(previous.completed_idempotency_keys) ||
          checkpoint.last_batch_step_ids.length !== 0
        ) {
          throw new CascadeError(
            `simulation checkpoint episode projection is invalid at revision ${revision}`,
          );
        }
      } else if (boundary?.event_type === "STEP_STARTED") {
        const appendedStepIds = checkpoint.completed_step_ids.slice(
          previous.step_count,
        );
        const appendedKeys = checkpoint.completed_idempotency_keys.slice(
          previous.step_count,
        );
        const completedBindings = boundary.step_bindings!.filter((binding) =>
          appendedStepIds.includes(binding.step_id)
        );
        if (
          !new Set<SimulationSessionStatus>(["CANCELLED", "UNKNOWN_OUTCOME"]).has(
            checkpoint.status,
          ) ||
          association.status !== checkpoint.status ||
          association.reason !== checkpoint.reason ||
          checkpoint.episode !== previous.episode ||
          checkpoint.step_count !== previous.step_count + appendedStepIds.length ||
          checkpoint.episode_step_count !==
            previous.episode_step_count + appendedStepIds.length ||
          stableJson(checkpoint.last_batch_step_ids) !== stableJson(boundary.step_ids) ||
          appendedStepIds.some((stepId) => !boundary.step_ids.includes(stepId)) ||
          appendedKeys.length !== completedBindings.length ||
          appendedKeys.some(
            (key, index) =>
              valueDigest(key) !== completedBindings[index]!.idempotency_key_digest,
          )
        ) {
          throw new CascadeError(
            `simulation interrupted batch projection is invalid at revision ${revision}`,
          );
        }
      } else {
        if (
          !TERMINAL_STATUSES.has(checkpoint.status) ||
          association.status !== checkpoint.status ||
          association.reason !== checkpoint.reason ||
          checkpoint.episode !== previous.episode ||
          checkpoint.episode_step_count !== previous.episode_step_count ||
          checkpoint.step_count !== previous.step_count ||
          stableJson(checkpoint.completed_step_ids) !==
            stableJson(previous.completed_step_ids) ||
          stableJson(checkpoint.completed_idempotency_keys) !==
            stableJson(previous.completed_idempotency_keys) ||
          stableJson(checkpoint.last_batch_step_ids) !==
            stableJson(previous.last_batch_step_ids) ||
          stableJson(checkpoint.surfaces) !== stableJson(previous.surfaces) ||
          stableJson(checkpoint.domain_state) !== stableJson(previous.domain_state)
        ) {
          throw new CascadeError(
            `simulation terminal checkpoint projection is invalid at revision ${revision}`,
          );
        }
      }
    }
    checkpointByDigest.set(checkpoint.checkpoint_digest, checkpoint);
    checkpointAtEvent.set(associationIndex, checkpoint);
    previousCheckpoint = checkpoint;
    previousAssociationIndex = associationIndex;
  }

  let currentCheckpoint: SimulationSessionCheckpoint<TState> | null = null;
  for (const [index, event] of events.entries()) {
    currentCheckpoint = checkpointAtEvent.get(index) ?? currentCheckpoint;
    if (
      event.checkpoint_digest !== undefined &&
      event.checkpoint_digest !== currentCheckpoint?.checkpoint_digest
    ) {
      throw new CascadeError(
        `simulation journal checkpoint reference is stale at sequence ${index}`,
      );
    }
  }
  if (currentCheckpoint !== checkpoints.at(-1)) {
    throw new CascadeError("simulation latest checkpoint is not journal-current");
  }

  const journalTail = events.at(-1)!;
  const terminalEvent = journalTail.event_type === "SESSION_TERMINATED"
    ? journalTail
    : null;
  if (terminalEvent) {
    const latest = checkpoints.at(-1)!;
    const expectedSurfaceIds = completedBatchSurfaceIds(
      events,
      latest.last_batch_step_ids,
    );
    if (
      !TERMINAL_STATUSES.has(latest.status) ||
      terminalEvent.status !== latest.status ||
      terminalEvent.reason !== latest.reason ||
      terminalEvent.episode !== latest.episode ||
      terminalEvent.at !== latest.updated_at ||
      stableJson(terminalEvent.step_ids) !== stableJson(latest.last_batch_step_ids) ||
      stableJson(terminalEvent.surface_ids) !== stableJson(expectedSurfaceIds) ||
      terminalEvent.checkpoint_digest !== latest.checkpoint_digest
    ) {
      throw new CascadeError(
        "simulation terminal event does not exactly project the terminal checkpoint",
      );
    }
  } else if (TERMINAL_STATUSES.has(checkpoints.at(-1)!.status)) {
    throw new CascadeError(
      "simulation terminal checkpoint lacks its terminal journal event",
    );
  }

  return {
    latest_checkpoint: checkpoints.at(-1)!,
    journal_tail: journalTail,
    terminal_event: terminalEvent,
  };
}

function stepBindings<TPayload>(
  steps: Array<SimulationSessionStep<TPayload>>,
): SimulationSessionStepBinding[] {
  return steps.map((step) => ({
    step_id: step.step_id,
    surface_id: step.surface_id,
    required: step.required,
    idempotency_key_digest: valueDigest(step.idempotency_key),
    conflict_keys_digest: valueDigest([...step.conflict_keys].sort()),
    payload_digest: valueDigest(step.payload),
  }));
}

function validateBatch<TPayload>(
  steps: Array<SimulationSessionStep<TPayload>>,
  checkpoint: SimulationSessionCheckpoint<unknown>,
  contract: SimulationSessionContract,
): void {
  if (!steps.length) return;
  if (steps.length > contract.limits.max_parallel_steps) {
    throw new CascadeError(
      `simulation step batch exceeds max_parallel_steps ${contract.limits.max_parallel_steps}`,
    );
  }
  if (
    checkpoint.step_count + steps.length > contract.limits.max_steps ||
    checkpoint.episode_step_count + steps.length >
      contract.limits.max_steps_per_episode
  ) {
    throw new CascadeError("simulation step batch exceeds a configured step bound");
  }
  const stepIds = new Set<string>();
  const idempotencyKeys = new Set<string>();
  const surfaceIds = new Set<string>();
  const conflictKeys = new Set<string>();
  const knownSurfaces = new Map(
    checkpoint.surfaces.map((surface) => [surface.surface_id, surface]),
  );
  for (const step of steps) {
    nonEmpty(step.step_id, "simulation step id");
    nonEmpty(step.idempotency_key, `simulation step ${step.step_id} idempotency key`);
    if (
      stepIds.has(step.step_id) ||
      checkpoint.completed_step_ids.includes(step.step_id)
    ) {
      throw new CascadeError(`duplicate simulation step id: ${step.step_id}`);
    }
    if (
      idempotencyKeys.has(step.idempotency_key) ||
      checkpoint.completed_idempotency_keys.includes(step.idempotency_key)
    ) {
      throw new CascadeError(
        `duplicate simulation idempotency key: ${step.idempotency_key}`,
      );
    }
    const surface = knownSurfaces.get(step.surface_id);
    if (!surface) {
      throw new CascadeError(`simulation step targets unknown surface: ${step.surface_id}`);
    }
    if (surface.lifecycle === "CLOSED" || surface.lifecycle === "LOST") {
      throw new CascadeError(
        `simulation step targets unavailable surface: ${step.surface_id}`,
      );
    }
    if (surfaceIds.has(step.surface_id)) {
      throw new CascadeError(
        `parallel simulation steps cannot share a surface: ${step.surface_id}`,
      );
    }
    for (const conflictKey of step.conflict_keys) {
      nonEmpty(conflictKey, `simulation step ${step.step_id} conflict key`);
      if (conflictKeys.has(conflictKey)) {
        throw new CascadeError(
          `parallel simulation steps overlap conflict key: ${conflictKey}`,
        );
      }
      conflictKeys.add(conflictKey);
    }
    stepIds.add(step.step_id);
    idempotencyKeys.add(step.idempotency_key);
    surfaceIds.add(step.surface_id);
  }
}

function applySurfaceUpdates(
  surfaces: SimulationSurfaceSession[],
  updates: SimulationSurfaceUpdate[] = [],
  maxSurfaces?: number,
): SimulationSurfaceSession[] {
  const next = new Map(
    surfaces.map((surface) => [surface.surface_id, structuredClone(surface)]),
  );
  for (const update of updates) {
    const current = next.get(update.surface_id);
    const targetContext = update.context_id ?? current?.context_id;
    if (update.lifecycle === "ACTIVE" && targetContext) {
      for (const surface of next.values()) {
        if (
          surface.surface_id !== update.surface_id &&
          surface.context_id === targetContext &&
          surface.lifecycle === "ACTIVE"
        ) {
          surface.lifecycle = "BACKGROUND";
        }
      }
    }
    if (!current) {
      if (!update.kind || !update.context_id || update.generation === undefined) {
        throw new CascadeError(
          `new simulation surface ${update.surface_id} lacks kind, context, or generation`,
        );
      }
      next.set(update.surface_id, {
        surface_id: update.surface_id,
        kind: update.kind,
        context_id: update.context_id,
        window_id: update.window_id,
        screen_id: update.screen_id,
        lifecycle: update.lifecycle ?? "READY",
        generation: update.generation,
        last_observation_digest: update.last_observation_digest,
      });
      continue;
    }
    if (update.kind && update.kind !== current.kind) {
      throw new CascadeError(
        `simulation surface ${update.surface_id} cannot change kind`,
      );
    }
    if (
      update.generation !== undefined &&
      update.generation < current.generation
    ) {
      throw new CascadeError(
        `simulation surface ${update.surface_id} generation cannot move backwards`,
      );
    }
    Object.assign(current, update);
  }
  const values = [...next.values()];
  validateSurfaces(values, maxSurfaces);
  return values.sort((left, right) => left.surface_id.localeCompare(right.surface_id));
}

function checkpointWithDigest<TState>(
  value: Omit<SimulationSessionCheckpoint<TState>, "checkpoint_digest">,
): SimulationSessionCheckpoint<TState> {
  const checkpoint = {
    ...value,
    checkpoint_digest: "",
  } satisfies SimulationSessionCheckpoint<TState>;
  checkpoint.checkpoint_digest = simulationCheckpointDigest(checkpoint);
  return checkpoint;
}

function eventWithDigest(
  value: Omit<SimulationSessionEvent, "event_digest">,
): SimulationSessionEvent {
  const event = { ...value, event_digest: "" } satisfies SimulationSessionEvent;
  event.event_digest = simulationEventDigest(event);
  return event;
}

function iso(now: () => Date): string {
  return now().toISOString();
}

function elapsedMs(checkpoint: SimulationSessionCheckpoint<unknown>, now: Date): number {
  return now.getTime() - Date.parse(checkpoint.started_at);
}

function interruptedResumeStepIds<TState>(
  events: SimulationSessionEvent[],
  checkpoint: SimulationSessionCheckpoint<TState>,
): string[] {
  const completed = new Set(checkpoint.completed_step_ids);
  const started = events
    .filter((event) => event.event_type === "STEP_STARTED")
    .flatMap((event) => event.step_ids);
  return started.filter((stepId) => !completed.has(stepId));
}

type BoundedExecution<T> =
  | { kind: "COMPLETED"; value: T }
  | { kind: "FAILED"; error: unknown }
  | { kind: "TIMED_OUT" }
  | { kind: "CANCELLED" };

async function executeBoundedStep<TState, TPayload, TObservation>(
  input: RunSimulationSessionInput<TState, TPayload, TObservation>,
  step: SimulationSessionStep<TPayload>,
  checkpoint: SimulationSessionCheckpoint<TState>,
  timeoutMs: number,
): Promise<SimulationSessionStepResult<TObservation>> {
  const controller = new AbortController();
  const execution = Promise.resolve()
    .then(() =>
      input.execute_step(step, { checkpoint, signal: controller.signal }),
    )
    .then<BoundedExecution<SimulationSessionStepResult<TObservation>>>(
      (value) => ({ kind: "COMPLETED", value }),
      (error) => ({ kind: "FAILED", error }),
    );
  let timer: ReturnType<typeof setTimeout> | undefined;
  let cancelListener: (() => void) | undefined;
  const timeout = new Promise<
    BoundedExecution<SimulationSessionStepResult<TObservation>>
  >((resolve) => {
    timer = setTimeout(() => {
      resolve({ kind: "TIMED_OUT" });
      controller.abort();
    }, timeoutMs);
  });
  const cancellation = new Promise<
    BoundedExecution<SimulationSessionStepResult<TObservation>>
  >((resolve) => {
    cancelListener = () => {
      resolve({ kind: "CANCELLED" });
      controller.abort();
    };
    input.signal?.addEventListener("abort", cancelListener, { once: true });
    if (input.signal?.aborted) cancelListener();
  });
  try {
    const result = await Promise.race([execution, timeout, cancellation]);
    if (result.kind === "COMPLETED") return result.value;
    if (result.kind === "FAILED") {
      return {
        step_id: step.step_id,
        outcome: "UNKNOWN_OUTCOME",
        reason: `step failed after dispatch: ${
          result.error instanceof Error
            ? result.error.message
            : String(result.error)
        }`,
        surface_updates: [{ surface_id: step.surface_id, lifecycle: "LOST" }],
      };
    }
    return {
      step_id: step.step_id,
      outcome: result.kind === "CANCELLED" ? "CANCELLED" : "UNKNOWN_OUTCOME",
      reason:
        result.kind === "CANCELLED"
          ? "step was cancelled after dispatch"
          : `step duration bound ${timeoutMs}ms was exhausted after dispatch`,
      surface_updates: [{ surface_id: step.surface_id, lifecycle: "LOST" }],
    };
  } finally {
    if (timer) clearTimeout(timer);
    if (cancelListener) input.signal?.removeEventListener("abort", cancelListener);
  }
}

async function executeBoundedControl<T>(
  label: string,
  timeoutMs: number,
  parentSignal: AbortSignal | undefined,
  operation: (signal: AbortSignal) => Promise<T>,
): Promise<
  | { kind: "COMPLETED"; value: T }
  | { kind: "FAILED"; reason: string }
  | { kind: "TIMED_OUT"; reason: string }
  | { kind: "CANCELLED"; reason: string }
> {
  const controller = new AbortController();
  const execution = Promise.resolve()
    .then(() => operation(controller.signal))
    .then(
      (value) => ({ kind: "COMPLETED" as const, value }),
      (error) => ({
        kind: "FAILED" as const,
        reason: `${label} failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      }),
    );
  let timer: ReturnType<typeof setTimeout> | undefined;
  let cancelListener: (() => void) | undefined;
  const timeout = new Promise<{
    kind: "TIMED_OUT";
    reason: string;
  }>((resolve) => {
    timer = setTimeout(() => {
      resolve({
        kind: "TIMED_OUT",
        reason: `${label} duration bound ${timeoutMs}ms was exhausted`,
      });
      controller.abort();
    }, timeoutMs);
  });
  const cancellation = new Promise<{
    kind: "CANCELLED";
    reason: string;
  }>((resolve) => {
    cancelListener = () => {
      resolve({ kind: "CANCELLED", reason: `${label} was cancelled` });
      controller.abort();
    };
    parentSignal?.addEventListener("abort", cancelListener, { once: true });
    if (parentSignal?.aborted) cancelListener();
  });
  try {
    return await Promise.race([execution, timeout, cancellation]);
  } finally {
    if (timer) clearTimeout(timer);
    if (cancelListener) parentSignal?.removeEventListener("abort", cancelListener);
  }
}

async function reconcileRecoverableDurablePrefix<TState>(
  contract: SimulationSessionContract,
  persistence: SimulationSessionPersistence<TState>,
  events: SimulationSessionEvent[],
  checkpoints: Array<SimulationSessionCheckpoint<TState>>,
  now: () => Date,
): Promise<void> {
  const appendRecovered = async (event: SimulationSessionEvent): Promise<void> => {
    validateSimulationSessionHistory(
      [...events, event],
      checkpoints,
      contract,
    );
    await persistence.appendEvent(event);
    events.push(structuredClone(event));
  };
  const recoveredEvent = (
    value: Omit<SimulationSessionEvent, "schema_version" | "session_id" | "contract_digest" | "sequence" | "previous_event_digest" | "event_digest">,
  ): SimulationSessionEvent => eventWithDigest({
    ...value,
    schema_version: 1,
    session_id: contract.session_id,
    contract_digest: simulationSessionContractDigest(contract),
    sequence: events.length,
    previous_event_digest: events.at(-1)?.event_digest ?? null,
  });

  while (checkpoints.length) {
    const latest = checkpoints.at(-1)!;
    const associationExists = events.some(
      (event) => event.checkpoint_digest === latest.checkpoint_digest,
    );

    if (!associationExists) {
      validateSimulationCheckpoint(latest, contract);
      const boundary = latest.last_event_digest === null
        ? null
        : events.find((event) => event.event_digest === latest.last_event_digest) ?? null;
      if (
        (latest.revision === 0 && (events.length !== 0 || boundary !== null)) ||
        (latest.revision > 0 && boundary !== events.at(-1))
      ) {
        throw new CascadeError(
          `simulation checkpoint ${latest.revision} is not bound to its exact journal boundary`,
        );
      }

      let association: SimulationSessionEvent;
      if (latest.revision === 0) {
        association = recoveredEvent({
          event_type: "SESSION_STARTED",
          at: latest.updated_at,
          episode: 1,
          step_ids: [],
          surface_ids: latest.surfaces.map((surface) => surface.surface_id),
          status: "RUNNING",
          reason: null,
          checkpoint_digest: latest.checkpoint_digest,
        });
      } else if (boundary?.event_type === "STEP_STARTED") {
        association = recoveredEvent({
          event_type: "STEP_COMPLETED",
          at: latest.updated_at,
          episode: latest.episode,
          step_ids: boundary.step_ids,
          surface_ids: boundary.surface_ids,
          step_bindings: boundary.step_bindings,
          status: latest.status,
          reason: latest.reason,
          checkpoint_digest: latest.checkpoint_digest,
        });
      } else if (boundary?.event_type === "EPISODE_COMPLETED") {
        association = recoveredEvent({
          event_type: "EPISODE_STARTED",
          at: latest.updated_at,
          episode: latest.episode,
          step_ids: [],
          surface_ids: [],
          status: "RUNNING",
          reason: null,
          checkpoint_digest: latest.checkpoint_digest,
        });
      } else {
        association = recoveredEvent({
          event_type: "SESSION_TERMINATED",
          at: latest.updated_at,
          episode: latest.episode,
          step_ids: latest.last_batch_step_ids,
          surface_ids: completedBatchSurfaceIds(events, latest.last_batch_step_ids),
          status: latest.status,
          reason: latest.reason,
          checkpoint_digest: latest.checkpoint_digest,
        });
      }
      await appendRecovered(association);
      continue;
    }

    const tail = events.at(-1)!;
    if (
      TERMINAL_STATUSES.has(latest.status) &&
      tail.event_type !== "SESSION_TERMINATED"
    ) {
      await appendRecovered(recoveredEvent({
        event_type: "SESSION_TERMINATED",
        at: latest.updated_at,
        episode: latest.episode,
        step_ids: latest.last_batch_step_ids,
        surface_ids: completedBatchSurfaceIds(events, latest.last_batch_step_ids),
        status: latest.status,
        reason: latest.reason,
        checkpoint_digest: latest.checkpoint_digest,
      }));
      continue;
    }

    if (
      latest.status === "RUNNING" &&
      tail.event_type === "EPISODE_COMPLETED" &&
      tail.checkpoint_digest === latest.checkpoint_digest
    ) {
      const rollover = checkpointWithDigest({
        ...latest,
        revision: latest.revision + 1,
        checkpoint_id: `${contract.session_id}:checkpoint:${String(latest.revision + 1).padStart(8, "0")}`,
        updated_at: iso(now),
        episode: latest.episode + 1,
        episode_step_count: 0,
        last_batch_step_ids: [],
        last_event_digest: tail.event_digest,
      });
      const started = recoveredEvent({
        event_type: "EPISODE_STARTED",
        at: rollover.updated_at,
        episode: rollover.episode,
        step_ids: [],
        surface_ids: [],
        status: "RUNNING",
        reason: null,
        checkpoint_digest: rollover.checkpoint_digest,
      });
      validateSimulationSessionHistory(
        [...events, started],
        [...checkpoints, rollover],
        contract,
      );
      await persistence.writeCheckpoint(rollover);
      checkpoints.push(structuredClone(rollover));
      await persistence.appendEvent(started);
      events.push(structuredClone(started));
      continue;
    }
    break;
  }
}

export async function runSimulationSession<TState, TPayload, TObservation>(
  input: RunSimulationSessionInput<TState, TPayload, TObservation>,
): Promise<SimulationSessionCheckpoint<TState>> {
  validateSimulationSessionContract(input.contract);
  validateSurfaceAuthority(input.surfaces, input.contract, {
    require_initial_exact: true,
  });
  const now = input.now ?? (() => new Date());
  const events = await input.persistence.readEvents();
  const checkpoints = await input.persistence.readCheckpoints();
  await reconcileRecoverableDurablePrefix(
    input.contract,
    input.persistence,
    events,
    checkpoints,
    now,
  );
  const history = validateSimulationSessionHistory(
    events,
    checkpoints,
    input.contract,
  );
  let checkpoint = await input.persistence.readLatestCheckpoint();
  if (stableJson(checkpoint) !== stableJson(history.latest_checkpoint)) {
    throw new CascadeError(
      "simulation latest checkpoint differs from complete checkpoint history",
    );
  }
  let previousEventDigest = events.at(-1)?.event_digest ?? null;
  let eventSequence = events.length;

  const append = async (
    value: Omit<SimulationSessionEvent, "schema_version" | "session_id" | "contract_digest" | "sequence" | "previous_event_digest" | "event_digest">,
  ): Promise<void> => {
    const event = eventWithDigest({
      ...value,
      schema_version: 1,
      session_id: input.contract.session_id,
      contract_digest: simulationSessionContractDigest(input.contract),
      sequence: eventSequence,
      previous_event_digest: previousEventDigest,
    });
    await input.persistence.appendEvent(event);
    events.push(structuredClone(event));
    previousEventDigest = event.event_digest;
    eventSequence += 1;
  };

  const persist = async (
    value: Omit<SimulationSessionCheckpoint<TState>, "checkpoint_digest" | "checkpoint_id" | "updated_at" | "last_event_digest">,
  ): Promise<SimulationSessionCheckpoint<TState>> => {
    const next = checkpointWithDigest({
      ...value,
      revision: (checkpoint?.revision ?? -1) + 1,
      checkpoint_id: `${input.contract.session_id}:checkpoint:${String((checkpoint?.revision ?? -1) + 1).padStart(8, "0")}`,
      updated_at: iso(now),
      last_event_digest: previousEventDigest,
    });
    validateSimulationCheckpoint(next, input.contract);
    await input.persistence.writeCheckpoint(next);
    checkpoints.push(structuredClone(next));
    checkpoint = next;
    return next;
  };

  if (checkpoint) {
    if (!input.resume) {
      throw new CascadeError(
        `simulation session already has a checkpoint: ${input.contract.session_id}`,
      );
    }
    const interruptedStepIds = interruptedResumeStepIds(events, checkpoint);
    if (interruptedStepIds.length) {
      checkpoint = await persist({
        ...checkpoint,
        status: "UNKNOWN_OUTCOME",
        reason: "a previously dispatched step has no durable checkpoint",
        last_batch_step_ids: interruptedStepIds,
      });
      await append({
        event_type: "SESSION_TERMINATED",
        at: checkpoint.updated_at,
        episode: checkpoint.episode,
        step_ids: checkpoint.last_batch_step_ids,
        surface_ids: completedBatchSurfaceIds(
          events,
          checkpoint.last_batch_step_ids,
        ),
        status: checkpoint.status,
        reason: checkpoint.reason,
        checkpoint_digest: checkpoint.checkpoint_digest,
      });
      validateSimulationSessionHistory(events, checkpoints, input.contract);
      return checkpoint;
    }
    if (TERMINAL_STATUSES.has(checkpoint.status)) return checkpoint;
    await append({
      event_type: "SESSION_RESUMED",
      at: iso(now),
      episode: checkpoint.episode,
      step_ids: [],
      surface_ids: [],
      status: "RUNNING",
      reason: null,
      checkpoint_digest: checkpoint.checkpoint_digest,
    });
  } else {
    const startedAt = iso(now);
    checkpoint = await persist({
      schema_version: 1,
      contract_digest: simulationSessionContractDigest(input.contract),
      session_id: input.contract.session_id,
      purpose: input.contract.purpose,
      status: "RUNNING",
      reason: null,
      started_at: startedAt,
      episode: 1,
      episode_step_count: 0,
      step_count: 0,
      completed_step_ids: [],
      completed_idempotency_keys: [],
      last_batch_step_ids: [],
      surfaces: structuredClone(input.surfaces),
      domain_state: structuredClone(input.initial_state),
    });
    await append({
      event_type: "SESSION_STARTED",
      at: checkpoint.updated_at,
      episode: 1,
      step_ids: [],
      surface_ids: checkpoint.surfaces.map((surface) => surface.surface_id),
      status: "RUNNING",
      reason: null,
      checkpoint_digest: checkpoint.checkpoint_digest,
    });
    await append({
      event_type: "EPISODE_STARTED",
      at: checkpoint.updated_at,
      episode: 1,
      step_ids: [],
      surface_ids: [],
      status: "RUNNING",
      reason: null,
    });
  }

  const terminate = async (
    status: Exclude<SimulationSessionStatus, "RUNNING">,
    reason: string,
  ): Promise<SimulationSessionCheckpoint<TState>> => {
    checkpoint = await persist({ ...checkpoint!, status, reason });
    const terminalSurfaceIds = completedBatchSurfaceIds(
      events,
      checkpoint.last_batch_step_ids,
    );
    await append({
      event_type: "SESSION_TERMINATED",
      at: checkpoint.updated_at,
      episode: checkpoint.episode,
      step_ids: checkpoint.last_batch_step_ids,
      surface_ids: terminalSurfaceIds,
      status,
      reason,
      checkpoint_digest: checkpoint.checkpoint_digest,
    });
    validateSimulationSessionHistory(events, checkpoints, input.contract);
    return checkpoint;
  };

  while (true) {
    if (input.signal?.aborted) {
      return terminate("CANCELLED", "simulation session was cancelled");
    }
    if (elapsedMs(checkpoint, now()) >= input.contract.limits.max_duration_ms) {
      return terminate("TIMED_OUT", "simulation session duration budget was exhausted");
    }
    const goalControl = await executeBoundedControl(
      "simulation goal evaluation",
      Math.max(
        1,
        Math.min(
          input.contract.limits.max_step_duration_ms,
          input.contract.limits.max_duration_ms - elapsedMs(checkpoint, now()),
        ),
      ),
      input.signal,
      (signal) => input.evaluate_goal({ checkpoint, signal }),
    );
    if (goalControl.kind !== "COMPLETED") {
      return terminate(
        goalControl.kind === "CANCELLED"
          ? "CANCELLED"
          : goalControl.kind === "TIMED_OUT"
            ? "TIMED_OUT"
            : "BLOCKED",
        goalControl.reason,
      );
    }
    const goal = goalControl.value;
    if (goal.status !== "CONTINUE") {
      return terminate(
        goal.status === "ACHIEVED" ? "ACHIEVED" : goal.status,
        goal.reason ?? `simulation goal returned ${goal.status}`,
      );
    }
    if (checkpoint.step_count >= input.contract.limits.max_steps) {
      return terminate("BUDGET_EXHAUSTED", "simulation session step budget was exhausted");
    }
    if (
      checkpoint.episode_step_count >=
      input.contract.limits.max_steps_per_episode
    ) {
      await append({
        event_type: "EPISODE_COMPLETED",
        at: iso(now),
        episode: checkpoint.episode,
        step_ids: [],
        surface_ids: [],
        status: "RUNNING",
        reason: "episode step bound reached",
        checkpoint_digest: checkpoint.checkpoint_digest,
      });
      checkpoint = await persist({
        ...checkpoint,
        episode: checkpoint.episode + 1,
        episode_step_count: 0,
        last_batch_step_ids: [],
      });
      await append({
        event_type: "EPISODE_STARTED",
        at: checkpoint.updated_at,
        episode: checkpoint.episode,
        step_ids: [],
        surface_ids: [],
        status: "RUNNING",
        reason: null,
        checkpoint_digest: checkpoint.checkpoint_digest,
      });
    }

    const stepControl = await executeBoundedControl(
      "simulation step planning",
      Math.max(
        1,
        Math.min(
          input.contract.limits.max_step_duration_ms,
          input.contract.limits.max_duration_ms - elapsedMs(checkpoint, now()),
        ),
      ),
      input.signal,
      (signal) => input.next_steps({ checkpoint, signal }),
    );
    if (stepControl.kind !== "COMPLETED") {
      return terminate(
        stepControl.kind === "CANCELLED"
          ? "CANCELLED"
          : stepControl.kind === "TIMED_OUT"
            ? "TIMED_OUT"
            : "BLOCKED",
        stepControl.reason,
      );
    }
    const steps = stepControl.value;
    if (!steps.length) {
      return terminate(
        "BLOCKED",
        "simulation goal is incomplete and no next step is available",
      );
    }
    validateBatch(
      steps,
      checkpoint as SimulationSessionCheckpoint<unknown>,
      input.contract,
    );
    await input.persistence.heartbeat();
    await append({
      event_type: "STEP_STARTED",
      at: iso(now),
      episode: checkpoint.episode,
      step_ids: steps.map((step) => step.step_id),
      surface_ids: steps.map((step) => step.surface_id),
      step_bindings: stepBindings(steps),
      status: "RUNNING",
      reason: null,
    });

    const remainingDurationMs = Math.max(
      1,
      input.contract.limits.max_duration_ms - elapsedMs(checkpoint, now()),
    );
    const stepDurationMs = Math.min(
      input.contract.limits.max_step_duration_ms,
      remainingDurationMs,
    );
    const settled = await Promise.allSettled(
      steps.map((step) =>
        executeBoundedStep(input, step, checkpoint!, stepDurationMs),
      ),
    );
    const results = settled.map((value, index) => {
      const step = steps[index]!;
      if (value.status === "fulfilled") {
        if (value.value.step_id !== step.step_id) {
          throw new CascadeError(
            `simulation result identity mismatch: ${value.value.step_id}/${step.step_id}`,
          );
        }
        return value.value;
      }
      return {
        step_id: step.step_id,
        outcome: "UNKNOWN_OUTCOME" as const,
        reason: `step failed after dispatch: ${
          value.reason instanceof Error ? value.reason.message : String(value.reason)
        }`,
        surface_updates: [
          { surface_id: step.surface_id, lifecycle: "LOST" as const },
        ],
      };
    });

    let domainState = checkpoint.domain_state;
    let surfaces = checkpoint.surfaces;
    for (const [index, result] of results.entries()) {
      const step = steps[index]!;
      domainState = input.reduce_state(domainState, step, result);
      surfaces = applySurfaceUpdates(
        surfaces,
        result.surface_updates,
        input.contract.limits.max_surfaces,
      );
    }
    const unsafeStepIds = new Set(
      results.flatMap((result, index) =>
        new Set<SimulationStepOutcome>(["CANCELLED", "UNKNOWN_OUTCOME"]).has(
          result.outcome,
        )
          ? [steps[index]!.step_id]
          : []
      ),
    );
    const completedSteps = steps.filter((step) => !unsafeStepIds.has(step.step_id));
    const completedStepIds = [
      ...checkpoint.completed_step_ids,
      ...completedSteps.map((step) => step.step_id),
    ];
    const completedIdempotencyKeys = [
      ...checkpoint.completed_idempotency_keys,
      ...completedSteps.map((step) => step.idempotency_key),
    ];
    const unsafeFailure = results.find((result) =>
      new Set<SimulationStepOutcome>(["CANCELLED", "UNKNOWN_OUTCOME"]).has(
        result.outcome,
      ),
    );
    const requiredFailure = results.find(
      (result, index) =>
        steps[index]!.required &&
        new Set<SimulationStepOutcome>(["FAIL", "BLOCKED"]).has(result.outcome),
    );
    const terminalFailure = unsafeFailure ?? requiredFailure;
    const terminalStatus: SimulationSessionStatus = terminalFailure
      ? terminalFailure.outcome === "FAIL"
        ? "FAILED"
        : terminalFailure.outcome
      : "RUNNING";
    checkpoint = await persist({
      ...checkpoint,
      status: terminalStatus,
      reason: terminalFailure?.reason ?? null,
      episode_step_count: checkpoint.episode_step_count + completedSteps.length,
      step_count: checkpoint.step_count + completedSteps.length,
      completed_step_ids: completedStepIds,
      completed_idempotency_keys: completedIdempotencyKeys,
      last_batch_step_ids: steps.map((step) => step.step_id),
      surfaces,
      domain_state: domainState,
    });
    if (!unsafeFailure) {
      await append({
        event_type: "STEP_COMPLETED",
        at: checkpoint.updated_at,
        episode: checkpoint.episode,
        step_ids: steps.map((step) => step.step_id),
        surface_ids: steps.map((step) => step.surface_id),
        step_bindings: stepBindings(steps),
        status: checkpoint.status,
        reason: checkpoint.reason,
        checkpoint_digest: checkpoint.checkpoint_digest,
      });
    }
    await input.persistence.heartbeat();
    if (checkpoint.status !== "RUNNING") {
      await append({
        event_type: "SESSION_TERMINATED",
        at: checkpoint.updated_at,
        episode: checkpoint.episode,
        step_ids: checkpoint.last_batch_step_ids,
        surface_ids: steps.map((step) => step.surface_id),
        status: checkpoint.status,
        reason: checkpoint.reason,
        checkpoint_digest: checkpoint.checkpoint_digest,
      });
      validateSimulationSessionHistory(events, checkpoints, input.contract);
      return checkpoint;
    }
  }
}
