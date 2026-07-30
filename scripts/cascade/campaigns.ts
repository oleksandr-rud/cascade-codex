import { appendFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import {
  CascadeError,
  boolFlag,
  boundedPath,
  exists,
  flag,
  freezeFile,
  isFile,
  parseArgs,
  readJson,
  rel,
  rootPath,
  runCommand,
  sha256File,
  stableJson,
  utcNow,
  valueDigest,
  walkFiles,
  writeJson,
  writeJsonAtomic,
  writeJsonExclusive,
} from "./common";
import {
  type EvaluationIdentity,
  type EvaluationReceipt,
  type MechanicalEvaluation,
  buildFixtureEvaluationReceipt,
  runCodexEvaluation,
} from "./evaluations";
import {
  type CalibrationDefinition,
  type CalibrationStatus,
  type CampaignStatus,
  type ClaimDefinition,
  type ClaimStatus,
  type MetricDefinition,
  type OracleDefinition,
  type PolicyDefinition,
  type ResolvedCampaign,
  type ScoreRow,
  type TaskAction,
  type TaskDefinition,
  findCampaignPath,
  resolveCampaign,
} from "./simulation-definitions";

const CAMPAIGN_ROOT = rootPath("evals/campaigns");
const ARTIFACT_ROOT = rootPath(".artifacts/campaigns");
const CATALOG_PATH = rootPath("evals/campaigns/catalog.generated.json");

interface PolicyDecision {
  action_index: number;
  action_type: string;
  policy_id: string | null;
  decision: "ALLOW" | "DENY" | "REQUIRE_CONFIRMATION";
  reason: string;
}

interface OracleResult {
  oracle_id: string;
  type: string;
  status: "PASS" | "FAIL";
  expected?: unknown;
  actual?: unknown;
  evidence?: string;
}

interface TaskResult {
  task_id: string;
  kind: string;
  driver: string;
  required: boolean;
  status: CampaignStatus;
  started_at: string;
  completed_at: string;
  duration_ms: number;
  earliest_failure: string | null;
  policy_decisions: PolicyDecision[];
  oracle_results: OracleResult[];
  events: Array<Record<string, unknown>>;
  final_state?: Record<string, unknown>;
  command?: {
    argv: string[];
    exit_code: number;
    timed_out: boolean;
    stdout: string;
    stderr: string;
  };
  evidence: Array<{ path: string; sha256: string; size: number }>;
  cleanup: {
    attempted: boolean;
    verified: boolean;
    residual_resources: string[];
  };
}

interface CorrelationResult {
  metric_id: string;
  treatment_ids: string[];
  simulated_values: number[];
  reference_values: number[];
  rank_correlation: number | null;
  linear_correlation: number | null;
  sample_count: number;
  missing_slices: string[];
  status: "PASS" | "FAIL";
}

interface CalibrationReceipt {
  schema_version: 1;
  calibration_id: string;
  run_id: string;
  definition_id: string;
  definition_digest: string;
  source_kind: string;
  framework_fixture: boolean;
  reviewer_identity: string;
  reference_label_digest: string;
  simulated_scores_digest: string;
  reference_scores_digest: string;
  treatment_ids: string[];
  metric_results: CorrelationResult[];
  human_agreement: number | null;
  reference_window_end: string;
  stale_after: string;
  status: CalibrationStatus;
  blockers: string[];
  residual_scope: string[];
  invalidation_inputs: Array<{ path: string; sha256: string }>;
  aggregator_identity: string;
  created_at: string;
}

interface AggregationReceipt {
  schema_version: 1;
  aggregation_id: string;
  run_id: string;
  campaign_id: string;
  aggregator_identity: string;
  execution_receipt_digest: string;
  evaluation_receipt_digest: string;
  calibration_receipt_digest: string | null;
  release_eligible: boolean;
  release_claims: Array<{ claim_id: string; status: ClaimStatus }>;
  status: CampaignStatus;
  created_at: string;
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function valuesEqual(left: unknown, right: unknown): boolean {
  return stableJson(left) === stableJson(right);
}

function pathParts(path: string): string[] {
  const parts = path.split(".").filter(Boolean);
  if (!parts.length || parts.some((part) => part === "__proto__")) {
    throw new CascadeError(`invalid state path: ${path}`);
  }
  return parts;
}

function getStatePath(state: Record<string, unknown>, path: string): unknown {
  let current: unknown = state;
  for (const part of pathParts(path)) {
    if (!current || typeof current !== "object" || Array.isArray(current)) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function setStatePath(
  state: Record<string, unknown>,
  path: string,
  value: unknown,
): void {
  const parts = pathParts(path);
  let current = state;
  for (const part of parts.slice(0, -1)) {
    const existing = current[part];
    if (!existing || typeof existing !== "object" || Array.isArray(existing)) {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  }
  current[parts.at(-1)!] = clone(value);
}

function applicablePolicy(
  action: TaskAction,
  policies: PolicyDefinition[],
): PolicyDefinition | undefined {
  const matches = policies.filter((policy) =>
    policy.action_types.includes(action.type),
  );
  if (matches.length > 1) {
    throw new CascadeError(
      `multiple policies apply to action ${action.type}: ${matches
        .map((item) => item.id)
        .join(", ")}`,
    );
  }
  return matches[0];
}

function applyFakeAction(
  state: Record<string, unknown>,
  action: TaskAction,
): { status: "PASS" | "FAIL"; reason: string | null } {
  if (action.type === "assert") {
    if (!action.path) return { status: "FAIL", reason: "assert path missing" };
    const actual = getStatePath(state, action.path);
    return valuesEqual(actual, action.value)
      ? { status: "PASS", reason: null }
      : {
          status: "FAIL",
          reason: `state assertion failed at ${action.path}`,
        };
  }
  if (action.type === "set") {
    if (!action.path) return { status: "FAIL", reason: "set path missing" };
    setStatePath(state, action.path, action.value);
    return { status: "PASS", reason: null };
  }
  if (action.type === "increment") {
    if (!action.path) {
      return { status: "FAIL", reason: "increment path missing" };
    }
    const actual = getStatePath(state, action.path);
    const amount = action.amount ?? 1;
    if (typeof actual !== "number" || !Number.isFinite(amount)) {
      return { status: "FAIL", reason: `increment target is not numeric` };
    }
    setStatePath(state, action.path, actual + amount);
    return { status: "PASS", reason: null };
  }
  if (action.type === "deny") {
    return { status: "FAIL", reason: action.reason ?? "action denied by world" };
  }
  return { status: "FAIL", reason: action.reason ?? "injected failure" };
}

async function evaluateOracle(
  oracle: OracleDefinition,
  state: Record<string, unknown> | undefined,
  command: TaskResult["command"],
): Promise<OracleResult> {
  if (oracle.type === "state-equals") {
    const actual = state && oracle.path ? getStatePath(state, oracle.path) : undefined;
    return {
      oracle_id: oracle.id,
      type: oracle.type,
      status: valuesEqual(actual, oracle.expected) ? "PASS" : "FAIL",
      expected: oracle.expected,
      actual,
    };
  }
  if (oracle.type === "exit-code") {
    const actual = command?.exit_code;
    return {
      oracle_id: oracle.id,
      type: oracle.type,
      status: actual === oracle.expected_exit_code ? "PASS" : "FAIL",
      expected: oracle.expected_exit_code,
      actual,
    };
  }
  const file = oracle.file!;
  const present = await isFile(boundedPath(file));
  return {
    oracle_id: oracle.id,
    type: oracle.type,
    status: present ? "PASS" : "FAIL",
    expected: true,
    actual: present,
    evidence: file,
  };
}

async function executeTask(
  resolved: ResolvedCampaign,
  task: TaskDefinition,
  taskRoot: string,
): Promise<TaskResult> {
  await mkdir(taskRoot, { recursive: true });
  const startedAt = utcNow();
  const started = performance.now();
  const events: Array<Record<string, unknown>> = [];
  const policyDecisions: PolicyDecision[] = [];
  const evidence: Array<{ path: string; sha256: string; size: number }> = [];
  let status: CampaignStatus = "PASS";
  let earliestFailure: string | null = null;
  let finalState: Record<string, unknown> | undefined;
  let commandResult: TaskResult["command"];

  const taskPolicies = resolved.policies.filter((policy) =>
    (task.policy_ids ?? []).includes(policy.id),
  );
  const taskOracles = resolved.oracles.filter((oracle) =>
    task.oracle_ids.includes(oracle.id),
  );

  if (task.driver.type === "fake") {
    const state = clone(resolved.fixture);
    for (const [index, action] of (task.actions ?? []).entries()) {
      const before = clone(state);
      const policy = applicablePolicy(action, taskPolicies);
      const decision = policy?.effect ?? "DENY";
      policyDecisions.push({
        action_index: index,
        action_type: action.type,
        policy_id: policy?.id ?? null,
        decision,
        reason: policy?.reason ?? "default deny: no applicable policy",
      });
      if (decision !== "ALLOW") {
        status = decision === "DENY" ? "FAIL" : "BLOCKED";
        earliestFailure = `action ${index} ${decision.toLowerCase()}`;
        events.push({
          index,
          type: action.type,
          before,
          after: clone(state),
          status,
          policy_decision: decision,
        });
        break;
      }
      const actionResult = applyFakeAction(state, action);
      events.push({
        index,
        type: action.type,
        before,
        after: clone(state),
        status: actionResult.status,
        reason: actionResult.reason,
        policy_decision: decision,
      });
      if (actionResult.status === "FAIL") {
        status = "FAIL";
        earliestFailure = actionResult.reason;
        break;
      }
    }
    finalState = clone(state);
  } else if (task.driver.type === "direct-process") {
    for (const policy of taskPolicies) {
      if (!policy.action_types.includes("process-exec")) continue;
      policyDecisions.push({
        action_index: 0,
        action_type: "process-exec",
        policy_id: policy.id,
        decision: policy.effect,
        reason: policy.reason,
      });
    }
    const processPolicy = taskPolicies.find((policy) =>
      policy.action_types.includes("process-exec"),
    );
    if (!processPolicy || processPolicy.effect !== "ALLOW") {
      status = processPolicy?.effect === "REQUIRE_CONFIRMATION" ? "BLOCKED" : "FAIL";
      earliestFailure = processPolicy
        ? `process execution ${processPolicy.effect.toLowerCase()}`
        : "process execution default denied";
    } else {
      const result = await runCommand(task.command!, {
        timeoutMs: task.timeout_ms,
      });
      commandResult = {
        argv: result.argv,
        exit_code: result.exitCode,
        timed_out: result.timedOut,
        stdout: result.stdout,
        stderr: result.stderr,
      };
      events.push({
        index: 0,
        type: "process-exec",
        argv: result.argv,
        exit_code: result.exitCode,
        timed_out: result.timedOut,
      });
      if (result.timedOut) {
        status = "FAIL";
        earliestFailure = "process timed out";
      }
    }
  } else {
    status = "BLOCKED";
    earliestFailure = `runtime adapter not implemented: ${task.driver.type}`;
  }

  const oracleResults: OracleResult[] = [];
  if (status === "PASS") {
    for (const oracle of taskOracles) {
      const result = await evaluateOracle(oracle, finalState, commandResult);
      oracleResults.push(result);
      if (result.status === "FAIL" && status === "PASS") {
        status = "FAIL";
        earliestFailure = `required oracle failed: ${oracle.id}`;
      }
    }
  }

  const evidenceRoot = resolve(taskRoot, "evidence");
  for (const file of task.evidence ?? []) {
    const destination = resolve(evidenceRoot, file.replaceAll("/", "__"));
    evidence.push(await freezeFile(file, destination));
  }
  if (commandResult) {
    await writeFile(resolve(taskRoot, "stdout.log"), commandResult.stdout, "utf8");
    await writeFile(resolve(taskRoot, "stderr.log"), commandResult.stderr, "utf8");
  }
  await writeFile(
    resolve(taskRoot, "events.jsonl"),
    events.map((event) => stableJson(event)).join("\n") + (events.length ? "\n" : ""),
    "utf8",
  );
  await writeJson(resolve(taskRoot, "policy-decisions.json"), policyDecisions);
  await writeJson(resolve(taskRoot, "oracle.json"), oracleResults);
  if (finalState) await writeJson(resolve(taskRoot, "final-state.json"), finalState);

  const cleanup = {
    attempted: true,
    verified: resolved.world.cleanup.reset_to_fixture,
    residual_resources: [] as string[],
  };
  if (!cleanup.verified) {
    status = "FAIL";
    earliestFailure ??= "cleanup verification failed";
  }
  await writeJson(resolve(taskRoot, "cleanup.json"), cleanup);

  const result: TaskResult = {
    task_id: task.id,
    kind: task.kind,
    driver: task.driver.type,
    required: task.required,
    status,
    started_at: startedAt,
    completed_at: utcNow(),
    duration_ms: Math.round(performance.now() - started),
    earliest_failure: earliestFailure,
    policy_decisions: policyDecisions,
    oracle_results: oracleResults,
    events,
    ...(finalState ? { final_state: finalState } : {}),
    ...(commandResult ? { command: commandResult } : {}),
    evidence,
    cleanup,
  };
  await writeJson(resolve(taskRoot, "result.json"), result);
  return result;
}

function mean(values: number[]): number {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function pearson(left: number[], right: number[]): number | null {
  if (left.length !== right.length || left.length < 2) return null;
  const leftMean = mean(left);
  const rightMean = mean(right);
  let numerator = 0;
  let leftVariance = 0;
  let rightVariance = 0;
  for (let index = 0; index < left.length; index += 1) {
    const leftDelta = left[index]! - leftMean;
    const rightDelta = right[index]! - rightMean;
    numerator += leftDelta * rightDelta;
    leftVariance += leftDelta ** 2;
    rightVariance += rightDelta ** 2;
  }
  const denominator = Math.sqrt(leftVariance * rightVariance);
  return denominator === 0 ? null : numerator / denominator;
}

function ranks(values: number[]): number[] {
  const sorted = values
    .map((value, index) => ({ value, index }))
    .sort((left, right) => left.value - right.value);
  const result = Array<number>(values.length);
  for (let start = 0; start < sorted.length; ) {
    let end = start + 1;
    while (end < sorted.length && sorted[end]!.value === sorted[start]!.value) {
      end += 1;
    }
    const rank = (start + 1 + end) / 2;
    for (let index = start; index < end; index += 1) {
      result[sorted[index]!.index] = rank;
    }
    start = end;
  }
  return result;
}

function spearman(left: number[], right: number[]): number | null {
  return pearson(ranks(left), ranks(right));
}

function aggregateScores(
  rows: ScoreRow[],
  metric: MetricDefinition,
  treatmentIds: string[],
): number[] {
  return treatmentIds.map((treatmentId) => {
    const values = rows
      .filter(
        (row) =>
          row.metric_id === metric.id && row.treatment_id === treatmentId,
      )
      .map((row) => row.value);
    if (!values.length) {
      throw new CascadeError(
        `no ${metric.id} scores for treatment ${treatmentId}`,
      );
    }
    if (metric.aggregation === "sum") {
      return values.reduce((total, value) => total + value, 0);
    }
    if (metric.aggregation === "exact") {
      return values.every((value) => value === values[0]) ? values[0]! : Number.NaN;
    }
    return mean(values);
  });
}

function humanAgreement(rows: ScoreRow[]): number | null {
  const judged = rows.filter(
    (row) =>
      typeof row.human_label === "number" &&
      typeof row.judge_label === "number",
  );
  if (!judged.length) return null;
  return (
    judged.filter((row) => row.human_label === row.judge_label).length /
    judged.length
  );
}

function staleAfter(definition: CalibrationDefinition): Date {
  const value = new Date(definition.reference.reference_window_end);
  value.setUTCDate(value.getUTCDate() + definition.staleness_days);
  return value;
}

export function buildCalibrationReceipt(
  resolved: ResolvedCampaign,
  runId: string,
  aggregatorIdentity: string,
  now = new Date(),
): CalibrationReceipt | null {
  const definition = resolved.calibration;
  if (!definition) return null;
  const blockers: string[] = [];
  const metricResults: CorrelationResult[] = [];
  const baseline = resolved.treatments.find((treatment) => treatment.baseline);
  if (!baseline || !definition.treatment_ids.includes(baseline.id)) {
    blockers.push("calibration treatment set does not include the baseline");
  }
  for (const metricId of definition.metric_ids) {
    const metric = resolved.metrics.find((item) => item.id === metricId)!;
    const undeclaredMetricSlices = metric.required_slices.filter(
      (slice) => !definition.required_slices.includes(slice),
    );
    if (undeclaredMetricSlices.length) {
      blockers.push(
        `calibration definition omits ${metric.id} slices: ${undeclaredMetricSlices.join(", ")}`,
      );
    }
    const requiredSlices = [
      ...new Set([...definition.required_slices, ...metric.required_slices]),
    ];
    const simulatedValues = aggregateScores(
      resolved.simulatedScores,
      metric,
      definition.treatment_ids,
    );
    const referenceValues = aggregateScores(
      resolved.referenceScores,
      metric,
      definition.treatment_ids,
    );
    const rankCorrelation = spearman(simulatedValues, referenceValues);
    const linearCorrelation = pearson(simulatedValues, referenceValues);
    const rows = resolved.referenceScores.filter(
      (row) => row.metric_id === metricId,
    );
    const missingSlices: string[] = [];
    for (const [source, scoreRows] of [
      ["simulated", resolved.simulatedScores],
      ["reference", resolved.referenceScores],
    ] as const) {
      for (const treatmentId of definition.treatment_ids) {
        const presentSlices = new Set(
          scoreRows
            .filter(
              (row) =>
                row.metric_id === metricId &&
                row.treatment_id === treatmentId,
            )
            .map((row) => row.slice),
        );
        for (const slice of requiredSlices) {
          if (!presentSlices.has(slice)) {
            missingSlices.push(`${source}:${treatmentId}:${slice}`);
          }
        }
      }
    }
    const sampleCount = new Set(rows.map((row) => row.case_id)).size;
    if ((metric.uncertainty ?? "none") !== "none") {
      blockers.push(
        `metric uncertainty reducer not implemented: ${metric.id}/${metric.uncertainty}`,
      );
    }
    const passed =
      sampleCount >= definition.thresholds.minimum_samples &&
      rankCorrelation !== null &&
      rankCorrelation >= definition.thresholds.minimum_rank_correlation &&
      linearCorrelation !== null &&
      linearCorrelation >= definition.thresholds.minimum_linear_correlation &&
      missingSlices.length === 0 &&
      (metric.uncertainty ?? "none") === "none" &&
      simulatedValues.every(Number.isFinite) &&
      referenceValues.every(Number.isFinite);
    metricResults.push({
      metric_id: metricId,
      treatment_ids: definition.treatment_ids,
      simulated_values: simulatedValues,
      reference_values: referenceValues,
      rank_correlation: rankCorrelation,
      linear_correlation: linearCorrelation,
      sample_count: sampleCount,
      missing_slices: missingSlices,
      status: passed ? "PASS" : "FAIL",
    });
    if (!passed) blockers.push(`metric calibration failed: ${metricId}`);
  }
  const agreement = humanAgreement(resolved.referenceScores);
  const fullyLabelled = resolved.referenceScores.every(
    (row) =>
      typeof row.human_label === "number" &&
      typeof row.judge_label === "number",
  );
  if (
    !fullyLabelled ||
    agreement === null ||
    agreement < definition.thresholds.minimum_human_agreement
  ) {
    blockers.push("human agreement threshold not satisfied");
  }
  const expires = staleAfter(definition);
  let status: CalibrationStatus = blockers.length
    ? "UNCALIBRATED"
    : "CALIBRATED";
  if (!definition.framework_fixture && now > expires) status = "STALE";
  return {
    schema_version: 1,
    calibration_id: `${runId}-calibration`,
    run_id: runId,
    definition_id: definition.id,
    definition_digest: valueDigest(definition),
    source_kind: definition.reference.kind,
    framework_fixture: definition.framework_fixture,
    reviewer_identity: definition.reference.reviewer_identity,
    reference_label_digest: definition.reference.label_digest,
    simulated_scores_digest: valueDigest(resolved.simulatedScores),
    reference_scores_digest: valueDigest(resolved.referenceScores),
    treatment_ids: definition.treatment_ids,
    metric_results: metricResults,
    human_agreement: agreement,
    reference_window_end: definition.reference.reference_window_end,
    stale_after: expires.toISOString(),
    status,
    blockers,
    residual_scope: definition.framework_fixture
      ? ["framework fixture only; target-project calibration remains NOT_RUN"]
      : [],
    invalidation_inputs: resolved.sourceDigests,
    aggregator_identity: aggregatorIdentity,
    created_at: utcNow(),
  };
}

function claimStatus(
  claim: ClaimDefinition,
  taskResults: TaskResult[],
  calibration: CalibrationReceipt | null,
): { status: ClaimStatus; reason: string; evidence: string[] } {
  const oracleResults = taskResults.flatMap((task) => task.oracle_results);
  const policyDecisions = taskResults.flatMap((task) => task.policy_decisions);
  const missingOracles = claim.required_oracle_ids.filter(
    (id) => !oracleResults.some((result) => result.oracle_id === id),
  );
  const failedOracles = claim.required_oracle_ids.filter((id) =>
    oracleResults.some(
      (result) => result.oracle_id === id && result.status === "FAIL",
    ),
  );
  const deniedPolicies = claim.required_policy_ids.filter((id) =>
    policyDecisions.some(
      (decision) =>
        decision.policy_id === id && decision.decision !== "ALLOW",
    ),
  );
  const failedTasks = taskResults.filter(
    (task) => task.required && task.status !== "PASS",
  );
  const metricResults = calibration?.metric_results ?? [];
  const missingMetrics = claim.required_metric_ids.filter(
    (id) => !metricResults.some((result) => result.metric_id === id),
  );
  const failedMetrics = claim.required_metric_ids.filter((id) =>
    metricResults.some(
      (result) => result.metric_id === id && result.status !== "PASS",
    ),
  );
  const availableEvidence = new Set([
    "source-manifest",
    "execution-receipt",
    ...(taskResults.length ? ["task-result"] : []),
    ...(taskResults.some((task) => task.events.length) ? ["trajectory"] : []),
    ...(policyDecisions.length ? ["policy-decisions"] : []),
    ...(oracleResults.length ? ["oracle"] : []),
    ...(taskResults.every((task) => task.cleanup.verified) ? ["cleanup"] : []),
    ...(calibration ? ["calibration-receipt"] : []),
  ]);
  const missingEvidence = claim.evidence_requirements.filter(
    (requirement) => !availableEvidence.has(requirement),
  );
  if (failedTasks.length) {
    return {
      status: "UNSUPPORTED",
      reason: `required task failed: ${failedTasks.map((item) => item.task_id).join(", ")}`,
      evidence: failedTasks.map((item) => item.task_id),
    };
  }
  if (missingOracles.length) {
    return {
      status: "BLOCKED",
      reason: `required oracle evidence missing: ${missingOracles.join(", ")}`,
      evidence: [],
    };
  }
  if (missingMetrics.length || missingEvidence.length) {
    return {
      status: "BLOCKED",
      reason: [
        missingMetrics.length
          ? `required metric evidence missing: ${missingMetrics.join(", ")}`
          : null,
        missingEvidence.length
          ? `required artifacts missing: ${missingEvidence.join(", ")}`
          : null,
      ]
        .filter(Boolean)
        .join("; "),
      evidence: [],
    };
  }
  if (failedOracles.length || deniedPolicies.length || failedMetrics.length) {
    return {
      status: "UNSUPPORTED",
      reason: [
        failedOracles.length
          ? `failed oracles: ${failedOracles.join(", ")}`
          : null,
        deniedPolicies.length
          ? `unsatisfied policies: ${deniedPolicies.join(", ")}`
          : null,
        failedMetrics.length
          ? `failed metrics: ${failedMetrics.join(", ")}`
          : null,
      ]
        .filter(Boolean)
        .join("; "),
      evidence: [...failedOracles, ...deniedPolicies, ...failedMetrics],
    };
  }
  if (claim.requires_calibration) {
    if (!calibration) {
      return {
        status: "NOT_RUN",
        reason: "required calibration receipt is absent",
        evidence: [],
      };
    }
    if (calibration.framework_fixture) {
      return {
        status: "NOT_RUN",
        reason:
          "framework-fixture calibration cannot support target release eligibility",
        evidence: [calibration.calibration_id],
      };
    }
    if (calibration.status !== "CALIBRATED") {
      return {
        status:
          calibration.status === "STALE" ? "BLOCKED" : "UNSUPPORTED",
        reason: `required calibration is ${calibration.status}`,
        evidence: [calibration.calibration_id],
      };
    }
  }
  return {
    status: "SUPPORTED",
    reason: "all declared non-compensating gates passed",
    evidence: [
      ...claim.required_oracle_ids,
      ...claim.required_policy_ids,
      ...claim.required_metric_ids,
      ...claim.evidence_requirements,
      ...(calibration ? [calibration.calibration_id] : []),
    ],
  };
}

function buildMechanicalEvaluation(
  resolved: ResolvedCampaign,
  taskResults: TaskResult[],
  calibration: CalibrationReceipt | null,
): MechanicalEvaluation {
  const claimLedger = resolved.claims.map((claim) => ({
    claim_id: claim.id,
    class: claim.class,
    ...claimStatus(claim, taskResults, calibration),
  }));
  const requiredFailures = claimLedger.filter(
    (claim) =>
      claim.class !== "release-eligibility" &&
      claim.status !== "SUPPORTED",
  );
  return {
    claim_ledger: claimLedger,
    status: requiredFailures.length ? "FAIL" : "PASS",
  };
}

export function assertEvaluationReceiptFresh(
  resolved: ResolvedCampaign,
  identity: EvaluationIdentity,
  evaluation: EvaluationReceipt,
): void {
  const expected: Array<[unknown, unknown, string]> = [
    [evaluation.schema_version, 2, "schema_version"],
    [
      evaluation.evaluation_id,
      `${identity.runId}-evaluation`,
      "evaluation_id",
    ],
    [evaluation.run_id, identity.runId, "run_id"],
    [evaluation.campaign_id, identity.campaignId, "campaign_id"],
    [
      evaluation.operator_identity,
      identity.operatorIdentity,
      "operator_identity",
    ],
    [
      evaluation.evaluator_identity,
      identity.evaluatorIdentity,
      "evaluator_identity",
    ],
    [
      evaluation.source_manifest_digest,
      identity.sourceManifestDigest,
      "source_manifest_digest",
    ],
    [
      evaluation.execution_receipt_digest,
      identity.executionReceiptDigest,
      "execution_receipt_digest",
    ],
    [
      evaluation.calibration_receipt_digest,
      identity.calibrationReceiptDigest,
      "calibration_receipt_digest",
    ],
    [
      evaluation.profile_id,
      resolved.evaluationProfile.id,
      "profile_id",
    ],
    [
      evaluation.profile_digest,
      valueDigest(resolved.evaluationProfile),
      "profile_digest",
    ],
    [
      evaluation.provider,
      resolved.evaluationProfile.provider,
      "provider",
    ],
    [
      evaluation.rubric_id,
      resolved.rubric?.id ?? null,
      "rubric_id",
    ],
    [
      evaluation.rubric_digest,
      resolved.rubric ? valueDigest(resolved.rubric) : null,
      "rubric_digest",
    ],
    [
      evaluation.model,
      resolved.evaluationProfile.model ?? null,
      "model",
    ],
    [
      evaluation.reasoning_effort,
      resolved.evaluationProfile.reasoning_effort ?? null,
      "reasoning_effort",
    ],
  ];
  for (const [actual, expectedValue, label] of expected) {
    if (!valuesEqual(actual, expectedValue)) {
      throw new CascadeError(`evaluation receipt ${label} is stale or mismatched`);
    }
  }
  const isDigest = (value: unknown): value is string =>
    typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
  if (!isDigest(evaluation.evaluation_input_digest)) {
    throw new CascadeError("evaluation receipt input digest is invalid");
  }
  if (resolved.evaluationProfile.provider === "codex") {
    if (
      !isDigest(evaluation.input_manifest_digest) ||
      !isDigest(evaluation.provider_trace_digest) ||
      !isDigest(evaluation.provider_output_digest)
    ) {
      throw new CascadeError(
        "Codex evaluation receipt packet/provider digests are missing or invalid",
      );
    }
  } else if (
    evaluation.input_manifest_digest !== null ||
    evaluation.provider_trace_digest !== null ||
    evaluation.provider_output_digest !== null
  ) {
    throw new CascadeError("fixture evaluation receipt has provider trace data");
  }
  if (
    evaluation.evaluator_identity === evaluation.operator_identity ||
    evaluation.evaluator_identity === identity.targetActorIdentity
  ) {
    throw new CascadeError("evaluation receipt violates evaluator independence");
  }
  const expectedClaims = resolved.claims.map((claim) => claim.id).sort();
  const actualClaims = evaluation.claim_ledger.map((claim) => claim.claim_id);
  if (
    new Set(actualClaims).size !== actualClaims.length ||
    !valuesEqual([...actualClaims].sort(), expectedClaims)
  ) {
    throw new CascadeError(
      "evaluation receipt claim ledger is missing, duplicated, or stale",
    );
  }
}

function buildAggregationReceipt(
  resolved: ResolvedCampaign,
  runId: string,
  aggregatorIdentity: string,
  executionReceiptDigest: string,
  evaluation: EvaluationReceipt,
  calibration: CalibrationReceipt | null,
): AggregationReceipt {
  const releaseClaims = evaluation.claim_ledger
    .filter((claim) => claim.class === "release-eligibility")
    .map((claim) => ({ claim_id: claim.claim_id, status: claim.status }));
  const releaseEligible =
    releaseClaims.length > 0 &&
    releaseClaims.every((claim) => claim.status === "SUPPORTED");
  return {
    schema_version: 1,
    aggregation_id: `${runId}-aggregation`,
    run_id: runId,
    campaign_id: resolved.campaign.id,
    aggregator_identity: aggregatorIdentity,
    execution_receipt_digest: executionReceiptDigest,
    evaluation_receipt_digest: valueDigest(evaluation),
    calibration_receipt_digest: calibration
      ? valueDigest(calibration)
      : null,
    release_eligible: releaseEligible,
    release_claims: releaseClaims,
    status: evaluation.status,
    created_at: utcNow(),
  };
}

async function campaignPaths(): Promise<string[]> {
  return (
    await walkFiles(CAMPAIGN_ROOT, {
      include: (path) =>
        path.endsWith(".json") &&
        !path.endsWith("schema.json") &&
        !path.endsWith("catalog.generated.json"),
    })
  ).sort();
}

export async function buildCampaignCatalog(): Promise<Record<string, unknown>> {
  const entries = [];
  for (const path of await campaignPaths()) {
    const resolved = await resolveCampaign(path);
    entries.push({
      id: resolved.campaign.id,
      title: resolved.campaign.title,
      owner_lane: resolved.campaign.owner_lane,
      tier: resolved.campaign.tier,
      manifest: rel(path),
      manifest_digest: await sha256File(path),
      simulation_id: resolved.simulation.id,
      contours: [...new Set(resolved.tasks.map((task) => task.kind))].sort(),
      drivers: [
        ...new Set(resolved.tasks.map((task) => task.driver.type)),
      ].sort(),
      task_ids: resolved.tasks.map((task) => task.id),
      claim_ids: resolved.claims.map((claim) => claim.id),
      policy_ids: resolved.policies.map((policy) => policy.id),
      oracle_ids: resolved.oracles.map((oracle) => oracle.id),
      metric_ids: resolved.metrics.map((metric) => metric.id),
      treatment_ids: resolved.treatments.map((treatment) => treatment.id),
      calibration_id: resolved.calibration?.id ?? null,
      evaluation_profile_id: resolved.evaluationProfile.id,
      evaluation_provider: resolved.evaluationProfile.provider,
      evaluation_model: resolved.evaluationProfile.model ?? null,
      rubric_id: resolved.rubric?.id ?? null,
      source_digest: valueDigest(resolved.sourceDigests),
    });
  }
  const ids = entries.map((entry) => entry.id);
  if (new Set(ids).size !== ids.length) {
    throw new CascadeError("duplicate campaign IDs in catalog");
  }
  return {
    schema_version: 1,
    generated_from: "evals/campaigns/*.json",
    entries,
    digest: valueDigest(entries),
  };
}

async function assertCampaignCatalogCurrent(
  expected: Record<string, unknown>,
): Promise<void> {
  if (!(await isFile(CATALOG_PATH))) {
    throw new CascadeError("campaign catalog missing; run catalog --write");
  }
  const current = await readJson(CATALOG_PATH);
  if (!valuesEqual(current, expected)) {
    throw new CascadeError("campaign catalog is stale; run catalog --write");
  }
}

async function commandCatalog(argv: string[]): Promise<number> {
  const args = parseArgs(argv);
  const catalog = await buildCampaignCatalog();
  if (boolFlag(args, "write")) {
    await writeJsonAtomic(CATALOG_PATH, catalog);
    console.log(
      `campaign_catalog_status=WRITTEN entries=${(catalog.entries as unknown[]).length} digest=${catalog.digest}`,
    );
    return 0;
  }
  if (boolFlag(args, "check")) {
    await assertCampaignCatalogCurrent(catalog);
    console.log(
      `campaign_catalog_status=PASS entries=${(catalog.entries as unknown[]).length} digest=${catalog.digest}`,
    );
    return 0;
  }
  console.log(stableJson(catalog, true));
  return 0;
}

async function commandValidate(value: string): Promise<number> {
  const path = await findCampaignPath(value);
  const resolved = await resolveCampaign(path);
  console.log(
    `campaign_validation_status=PASS campaign=${resolved.campaign.id} ` +
      `tasks=${resolved.tasks.length} claims=${resolved.claims.length} ` +
      `sources=${resolved.sourceFiles.length}`,
  );
  return 0;
}

async function freezeSources(
  resolved: ResolvedCampaign,
  sourceRoot: string,
): Promise<Array<{ path: string; sha256: string; size: number }>> {
  const frozen = [];
  for (const file of resolved.sourceFiles) {
    frozen.push(
      await freezeFile(
        file,
        resolve(sourceRoot, file.replaceAll("/", "__")),
      ),
    );
  }
  return frozen;
}

async function sourceRevision(
  sourceFiles: string[],
): Promise<{ revision: string; dirty: boolean }> {
  const revision = await runCommand(["git", "rev-parse", "HEAD"]);
  if (revision.exitCode !== 0) {
    throw new CascadeError("cannot resolve repository source revision");
  }
  const status = await runCommand([
    "git",
    "status",
    "--porcelain=v1",
    "--untracked-files=all",
    "--",
    ...sourceFiles,
    "scripts/cascade.ts",
    "scripts/cascade",
  ]);
  if (status.exitCode !== 0) {
    throw new CascadeError("cannot resolve campaign working-tree status");
  }
  return {
    revision: revision.stdout.trim(),
    dirty: status.stdout.trim().length > 0,
  };
}

async function appendLifecycle(
  runRoot: string,
  status: "RESERVED" | "RUNNING" | "EVALUATING" | "COMPLETED" | "BLOCKED",
  detail: Record<string, unknown> = {},
): Promise<void> {
  await appendFile(
    resolve(runRoot, "lifecycle.jsonl"),
    `${stableJson({ status, at: utcNow(), ...detail })}\n`,
    "utf8",
  );
}

async function commandRun(value: string, argv: string[]): Promise<number> {
  const args = parseArgs(argv);
  await assertCampaignCatalogCurrent(await buildCampaignCatalog());
  const path = await findCampaignPath(value);
  const resolved = await resolveCampaign(path);
  const runId =
    flag(args, "run-id") ??
    `${resolved.campaign.id}-${new Date()
      .toISOString()
      .replace(/[-:.TZ]/g, "")
      .slice(0, 14)}`;
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]+$/.test(runId)) {
    throw new CascadeError(`invalid run ID: ${runId}`);
  }
  const operatorIdentity = flag(args, "operator", "local-simulation-operator")!;
  const evaluatorIdentity = flag(
    args,
    "evaluator",
    resolved.evaluationProfile.provider === "codex"
      ? `codex:simulation-evaluator:${resolved.evaluationProfile.model}`
      : "fixture:simulation-evaluator",
  )!;
  const aggregatorIdentity = flag(args, "aggregator", "local-campaign-aggregator")!;
  const targetActorIdentity = `target:${resolved.simulation.id}`;
  const simulatorIdentity = `simulator:${resolved.simulation.id}`;
  const identities = [
    operatorIdentity,
    evaluatorIdentity,
    aggregatorIdentity,
    targetActorIdentity,
    simulatorIdentity,
  ];
  if (
    identities.some((identity) => !identity.trim()) ||
    new Set(identities).size !== identities.length
  ) {
    throw new CascadeError(
      "operator, evaluator, aggregator, target, and simulator identities must be non-empty and distinct",
    );
  }

  const runRoot = resolve(ARTIFACT_ROOT, runId);
  await mkdir(ARTIFACT_ROOT, { recursive: true });
  if (await exists(runRoot)) {
    throw new CascadeError(`run already exists: ${rel(runRoot)}`);
  }
  await mkdir(runRoot, { recursive: false });
  await writeJsonExclusive(resolve(runRoot, "reservation.json"), {
    schema_version: 1,
    run_id: runId,
    campaign_id: resolved.campaign.id,
    status: "RESERVED",
    operator_identity: operatorIdentity,
    reserved_at: utcNow(),
  });
  await appendLifecycle(runRoot, "RESERVED", {
    campaign_id: resolved.campaign.id,
    operator_identity: operatorIdentity,
  });

  const executionRoot = resolve(runRoot, "execution");
  const frozenSources = await freezeSources(
    resolved,
    resolve(executionRoot, "source"),
  );
  const repositorySource = await sourceRevision(resolved.sourceFiles);
  const sourceManifest = {
    schema_version: 1,
    run_id: runId,
    campaign_id: resolved.campaign.id,
    source_revision: repositorySource.revision,
    dirty_source: repositorySource.dirty,
    definitions: resolved.sourceDigests,
    frozen_sources: frozenSources,
    source_digest: valueDigest(resolved.sourceDigests),
  };
  await writeJson(resolve(executionRoot, "source-manifest.json"), sourceManifest);
  await appendLifecycle(runRoot, "RUNNING", {
    source_manifest_digest: valueDigest(sourceManifest),
  });
  const sourceManifestDigest = valueDigest(sourceManifest);

  const taskResults: TaskResult[] = [];
  for (const task of resolved.tasks) {
    taskResults.push(
      await executeTask(
        resolved,
        task,
        resolve(executionRoot, "tasks", task.id),
      ),
    );
  }
  const requiredFailures = taskResults.filter(
    (task) => task.required && task.status !== "PASS",
  );
  const cleanupVerified = taskResults.every((task) => task.cleanup.verified);
  const executionReceipt = {
    schema_version: 1,
    run_id: runId,
    campaign_id: resolved.campaign.id,
    campaign_digest: await sha256File(path),
    source_manifest_digest: sourceManifestDigest,
    operator_identity: operatorIdentity,
    target_actor_identity: targetActorIdentity,
    simulator_identity: simulatorIdentity,
    task_results: taskResults.map((task) => ({
      task_id: task.task_id,
      status: task.status,
      result_digest: valueDigest(task),
    })),
    cleanup_verified: cleanupVerified,
    status:
      requiredFailures.length || !cleanupVerified ? "FAIL" : "PASS",
    earliest_failure: requiredFailures[0]?.earliest_failure ?? null,
    evidence_root: rel(executionRoot),
    created_at: utcNow(),
  };
  await writeJson(
    resolve(executionRoot, "execution-receipt.json"),
    executionReceipt,
  );
  const executionReceiptDigest = valueDigest(executionReceipt);

  const calibration = buildCalibrationReceipt(
    resolved,
    runId,
    aggregatorIdentity,
  );
  if (calibration) {
    await writeJsonExclusive(
      resolve(runRoot, "calibrations", `${calibration.calibration_id}.json`),
      calibration,
    );
  }
  const mechanicalEvaluation = buildMechanicalEvaluation(
    resolved,
    taskResults,
    calibration,
  );
  const evaluationIdentity: EvaluationIdentity = {
    runId,
    campaignId: resolved.campaign.id,
    operatorIdentity,
    targetActorIdentity,
    evaluatorIdentity,
    sourceManifestDigest,
    executionReceiptDigest,
    calibrationReceiptDigest: calibration ? valueDigest(calibration) : null,
  };
  await appendLifecycle(runRoot, "EVALUATING", {
    provider: resolved.evaluationProfile.provider,
    profile_id: resolved.evaluationProfile.id,
    evaluator_identity: evaluatorIdentity,
  });
  let evaluation: EvaluationReceipt | null;
  let evaluationAttempt: string | null = null;
  let evaluationBlockedReason: string | null = null;
  if (resolved.evaluationProfile.provider === "codex") {
    const result = await runCodexEvaluation(
      resolved,
      runRoot,
      evaluationIdentity,
      mechanicalEvaluation,
    );
    evaluation = result.receipt;
    evaluationAttempt = result.attemptPath;
    evaluationBlockedReason = result.blockedReason;
  } else {
    evaluation = buildFixtureEvaluationReceipt(
      resolved,
      evaluationIdentity,
      mechanicalEvaluation,
    );
    const evaluationRoot = resolve(
      runRoot,
      "evaluations",
      evaluation.evaluation_id,
    );
    await mkdir(resolve(runRoot, "evaluations"), { recursive: true });
    await mkdir(evaluationRoot, { recursive: false });
    await writeJsonExclusive(resolve(evaluationRoot, "receipt.json"), evaluation);
  }
  if (!evaluation) {
    const blockedSummary = {
      schema_version: 1,
      run_id: runId,
      campaign_id: resolved.campaign.id,
      execution_status: executionReceipt.status,
      evaluation_status: "BLOCKED",
      evaluation_provider: resolved.evaluationProfile.provider,
      evaluation_profile_id: resolved.evaluationProfile.id,
      evaluation_attempt: evaluationAttempt,
      evaluation_blocker: evaluationBlockedReason,
      calibration_status: calibration?.status ?? "NOT_RUN",
      release_eligible: false,
      campaign_status: "BLOCKED",
      execution_receipt_digest: executionReceiptDigest,
      evaluation_receipt_digest: null,
      calibration_receipt_digest: calibration ? valueDigest(calibration) : null,
      aggregation_receipt_digest: null,
      completed_at: utcNow(),
    };
    await writeJson(resolve(runRoot, "summary.json"), blockedSummary);
    await appendLifecycle(runRoot, "BLOCKED", {
      campaign_status: "BLOCKED",
      evaluation_attempt: evaluationAttempt,
      reason: evaluationBlockedReason,
    });
    console.log(
      `campaign_status=BLOCKED campaign=${resolved.campaign.id} run=${runId} ` +
        `evaluation=BLOCKED provider=${resolved.evaluationProfile.provider} ` +
        `release_eligible=false output=${rel(runRoot)}`,
    );
    return 1;
  }
  assertEvaluationReceiptFresh(resolved, evaluationIdentity, evaluation);
  const aggregation = buildAggregationReceipt(
    resolved,
    runId,
    aggregatorIdentity,
    executionReceiptDigest,
    evaluation,
    calibration,
  );
  await writeJsonExclusive(
    resolve(runRoot, "aggregations", `${aggregation.aggregation_id}.json`),
    aggregation,
  );
  const summary = {
    schema_version: 1,
    run_id: runId,
    campaign_id: resolved.campaign.id,
    execution_status: executionReceipt.status,
    evaluation_status: evaluation.status,
    evaluation_provider: evaluation.provider,
    evaluation_profile_id: evaluation.profile_id,
    evaluation_model: evaluation.model,
    evaluation_attempt: evaluationAttempt,
    calibration_status: calibration?.status ?? "NOT_RUN",
    calibration_scope: calibration?.framework_fixture
      ? "framework-fixture"
      : calibration
        ? calibration.source_kind
        : "none",
    release_eligible: aggregation.release_eligible,
    campaign_status:
      executionReceipt.status === "PASS" && evaluation.status === "PASS"
        ? "PASS"
        : "FAIL",
    execution_receipt_digest: executionReceiptDigest,
    evaluation_receipt_digest: valueDigest(evaluation),
    calibration_receipt_digest: calibration ? valueDigest(calibration) : null,
    aggregation_receipt_digest: valueDigest(aggregation),
    completed_at: utcNow(),
  };
  await writeJson(resolve(runRoot, "summary.json"), summary);
  await appendLifecycle(runRoot, "COMPLETED", {
    campaign_status: summary.campaign_status,
    release_eligible: summary.release_eligible,
  });
  console.log(
    `campaign_status=${summary.campaign_status} campaign=${resolved.campaign.id} ` +
      `run=${runId} calibration=${summary.calibration_status} ` +
      `evaluation=${summary.evaluation_status}/${summary.evaluation_provider} ` +
      `release_eligible=${summary.release_eligible} output=${rel(runRoot)}`,
  );
  return summary.campaign_status === "PASS" ? 0 : 1;
}

async function commandSelfTest(): Promise<number> {
  const paths = await campaignPaths();
  if (!paths.length) throw new CascadeError("no campaign manifests found");
  for (const path of paths) await resolveCampaign(path);
  const catalog = await buildCampaignCatalog();
  const fixtureCalibration = (
    await Promise.all(paths.map((path) => resolveCampaign(path)))
  ).find((item) => item.calibration?.framework_fixture);
  if (!fixtureCalibration) {
    throw new CascadeError("no framework calibration fixture campaign found");
  }
  const receipt = buildCalibrationReceipt(
    fixtureCalibration,
    "self-test",
    "self-test-aggregator",
    new Date(fixtureCalibration.calibration!.reference.reference_window_end),
  );
  if (!receipt || receipt.status !== "CALIBRATED") {
    throw new CascadeError("framework calibration fixture did not calibrate");
  }
  if (!receipt.framework_fixture) {
    throw new CascadeError("framework calibration fixture lost its scope");
  }
  console.log(
    `campaign_self_test=PASS campaigns=${paths.length} ` +
      `catalog_digest=${catalog.digest} calibration=${receipt.status} ` +
      `release_scope=NOT_RUN`,
  );
  return 0;
}

export async function main(argv: string[]): Promise<number> {
  const [command, value, ...rest] = argv;
  if (command === "catalog") return commandCatalog([...(value ? [value] : []), ...rest]);
  if (command === "validate" && value) return commandValidate(value);
  if (command === "run" && value) return commandRun(value, rest);
  if (command === "self-test") return commandSelfTest();
  console.log(`Usage:
  bun scripts/cascade.ts campaign catalog [--check|--write]
  bun scripts/cascade.ts campaign validate <campaign-id-or-path>
  bun scripts/cascade.ts campaign run <campaign-id-or-path> [--run-id ID]
  bun scripts/cascade.ts campaign self-test
`);
  return command ? 1 : 0;
}
