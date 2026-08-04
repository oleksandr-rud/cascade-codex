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

export function validateSimulationSessionContract(
  contract: SimulationSessionContract,
): void {
  if (contract.schema_version !== 1) {
    throw new CascadeError("simulation session schema_version must be 1");
  }
  nonEmpty(contract.session_id, "simulation session id");
  nonEmpty(contract.purpose, "simulation session purpose");
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
  if (!SESSION_STATUSES.has(checkpoint.status)) {
    throw new CascadeError("simulation checkpoint status is invalid");
  }
  if (
    Number.isNaN(Date.parse(checkpoint.started_at)) ||
    Number.isNaN(Date.parse(checkpoint.updated_at)) ||
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
    )
  ) {
    throw new CascadeError("simulation checkpoint last batch is not completed");
  }
  validateSurfaces(checkpoint.surfaces, contract.limits.max_surfaces);
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
      event.event_type !== "STEP_STARTED" ||
      (bindings.length === event.step_ids.length &&
        stableJson(bindingStepIds) === stableJson(event.step_ids) &&
        stableJson(bindingSurfaceIds) === stableJson(event.surface_ids));
    if (
      event.schema_version !== 1 ||
      event.session_id !== contract.session_id ||
      event.contract_digest !== contractDigest ||
      event.sequence !== index ||
      !EVENT_TYPES.has(event.event_type) ||
      (event.status !== undefined && !SESSION_STATUSES.has(event.status)) ||
      Number.isNaN(Date.parse(event.at)) ||
      !Number.isInteger(event.episode) ||
      event.episode < 1 ||
      new Set(event.step_ids).size !== event.step_ids.length ||
      new Set(event.surface_ids).size !== event.surface_ids.length ||
      new Set(bindingStepIds).size !== bindingStepIds.length ||
      !bindingsValid ||
      !dispatchBindingValid ||
      event.previous_event_digest !== previous ||
      event.event_digest !== simulationEventDigest(event)
    ) {
      throw new CascadeError(`simulation journal is invalid at sequence ${index}`);
    }
    previous = event.event_digest;
  }
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

function unknownResumeReason<TState>(
  events: SimulationSessionEvent[],
  checkpoint: SimulationSessionCheckpoint<TState>,
): string | null {
  const completed = new Set(checkpoint.completed_step_ids);
  const started = events
    .filter((event) => event.event_type === "STEP_STARTED")
    .flatMap((event) => event.step_ids);
  return started.find((stepId) => !completed.has(stepId))
    ? "a previously dispatched step has no durable checkpoint"
    : null;
}

function validateCheckpointJournalBinding<TState>(
  events: SimulationSessionEvent[],
  checkpoint: SimulationSessionCheckpoint<TState>,
): void {
  if (checkpoint.last_event_digest === null) {
    if (checkpoint.revision !== 0) {
      throw new CascadeError(
        "simulation checkpoint is not bound to the current journal",
      );
    }
    return;
  }
  if (!events.some((event) => event.event_digest === checkpoint.last_event_digest)) {
    throw new CascadeError(
      "simulation checkpoint is not bound to the current journal",
    );
  }
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

export async function runSimulationSession<TState, TPayload, TObservation>(
  input: RunSimulationSessionInput<TState, TPayload, TObservation>,
): Promise<SimulationSessionCheckpoint<TState>> {
  validateSimulationSessionContract(input.contract);
  validateSurfaces(input.surfaces, input.contract.limits.max_surfaces);
  const now = input.now ?? (() => new Date());
  const events = await input.persistence.readEvents();
  validateSimulationJournal(events, input.contract);
  let checkpoint = await input.persistence.readLatestCheckpoint();
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
    checkpoint = next;
    return next;
  };

  if (checkpoint) {
    if (!input.resume) {
      throw new CascadeError(
        `simulation session already has a checkpoint: ${input.contract.session_id}`,
      );
    }
    validateSimulationCheckpoint(checkpoint, input.contract);
    validateCheckpointJournalBinding(events, checkpoint);
    const resumeFailure = unknownResumeReason(events, checkpoint);
    if (resumeFailure) {
      checkpoint = await persist({
        ...checkpoint,
        status: "UNKNOWN_OUTCOME",
        reason: resumeFailure,
      });
      await append({
        event_type: "SESSION_TERMINATED",
        at: iso(now),
        episode: checkpoint.episode,
        step_ids: [],
        surface_ids: [],
        status: checkpoint.status,
        reason: checkpoint.reason,
        checkpoint_digest: checkpoint.checkpoint_digest,
      });
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
      at: startedAt,
      episode: 1,
      step_ids: [],
      surface_ids: checkpoint.surfaces.map((surface) => surface.surface_id),
      status: "RUNNING",
      reason: null,
      checkpoint_digest: checkpoint.checkpoint_digest,
    });
    await append({
      event_type: "EPISODE_STARTED",
      at: startedAt,
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
    await append({
      event_type: "SESSION_TERMINATED",
      at: iso(now),
      episode: checkpoint.episode,
      step_ids: checkpoint.last_batch_step_ids,
      surface_ids: [],
      status,
      reason,
      checkpoint_digest: checkpoint.checkpoint_digest,
    });
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
        at: iso(now),
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
    const completedStepIds = [
      ...checkpoint.completed_step_ids,
      ...steps.map((step) => step.step_id),
    ];
    const completedIdempotencyKeys = [
      ...checkpoint.completed_idempotency_keys,
      ...steps.map((step) => step.idempotency_key),
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
      episode_step_count: checkpoint.episode_step_count + steps.length,
      step_count: checkpoint.step_count + steps.length,
      completed_step_ids: completedStepIds,
      completed_idempotency_keys: completedIdempotencyKeys,
      last_batch_step_ids: steps.map((step) => step.step_id),
      surfaces,
      domain_state: domainState,
    });
    await append({
      event_type: "STEP_COMPLETED",
      at: iso(now),
      episode: checkpoint.episode,
      step_ids: steps.map((step) => step.step_id),
      surface_ids: steps.map((step) => step.surface_id),
      step_bindings: stepBindings(steps),
      status: checkpoint.status,
      reason: checkpoint.reason,
      checkpoint_digest: checkpoint.checkpoint_digest,
    });
    await input.persistence.heartbeat();
    if (checkpoint.status !== "RUNNING") {
      await append({
        event_type: "SESSION_TERMINATED",
        at: iso(now),
        episode: checkpoint.episode,
        step_ids: checkpoint.last_batch_step_ids,
        surface_ids: steps.map((step) => step.surface_id),
        status: checkpoint.status,
        reason: checkpoint.reason,
        checkpoint_digest: checkpoint.checkpoint_digest,
      });
      return checkpoint;
    }
  }
}
