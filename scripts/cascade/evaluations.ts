import {
  copyFile,
  mkdir,
  mkdtemp,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { relative, resolve } from "node:path";

import {
  CascadeError,
  rootPath,
  runCommand,
  sha256File,
  stableJson,
  utcNow,
  valueDigest,
  walkFiles,
  isFile,
  writeJson,
  writeJsonExclusive,
} from "./common";
import type {
  CampaignStatus,
  ClaimStatus,
  EvaluationProfileDefinition,
  ResolvedCampaign,
} from "./simulation-definitions";
import { CampaignArtifactStore } from "./campaign-artifacts";

export interface ClaimLedgerEntry {
  claim_id: string;
  class: string;
  status: ClaimStatus;
  reason: string;
  evidence: string[];
}

export interface MechanicalEvaluation {
  claim_ledger: ClaimLedgerEntry[];
  status: CampaignStatus;
}

export interface EvaluationReceipt {
  schema_version: 2;
  evaluation_id: string;
  run_id: string;
  campaign_id: string;
  operator_identity: string;
  evaluator_identity: string;
  provider: "fixture" | "codex";
  profile_id: string;
  profile_digest: string;
  rubric_id: string | null;
  rubric_digest: string | null;
  model: string | null;
  reasoning_effort: string | null;
  source_manifest_digest: string;
  execution_receipt_digest: string;
  calibration_receipt_digest: string | null;
  evaluation_input_digest: string;
  input_manifest_digest: string | null;
  provider_trace_digest: string | null;
  provider_output_digest: string | null;
  usage: Record<string, number> | null;
  claim_ledger: ClaimLedgerEntry[];
  status: CampaignStatus;
  root_cause: string;
  earliest_failure: string | null;
  residual_uncertainty: string[];
  next_route: string;
  created_at: string;
}

export interface EvaluationIdentity {
  runId: string;
  campaignId: string;
  operatorIdentity: string;
  targetActorIdentity: string;
  evaluatorIdentity: string;
  sourceManifestDigest: string;
  executionReceiptDigest: string;
  calibrationReceiptDigest: string | null;
}

export interface CodexEvaluationOutput {
  schema_version: 1;
  evaluation_id: string;
  run_id: string;
  campaign_id: string;
  source_manifest_digest: string;
  execution_receipt_digest: string;
  evaluation_input_digest: string;
  input_manifest_digest: string;
  evaluator_identity: string;
  status: "PASS" | "FAIL" | "BLOCKED";
  mechanical_gate_status: "PASS" | "FAIL" | "BLOCKED";
  claim_assessments: Array<{
    claim_id: string;
    status: ClaimStatus;
    reason: string;
    evidence: string[];
  }>;
  root_cause:
    | "none"
    | "execution"
    | "evidence"
    | "policy"
    | "oracle"
    | "cleanup"
    | "calibration"
    | "evaluator"
    | "environment";
  earliest_failure: string | null;
  residual_uncertainty: string[];
  next_route: string;
}

export interface EvaluationRequest {
  schema_version: 1;
  evaluation_id: string;
  run_id: string;
  campaign_id: string;
  source_manifest_digest: string;
  execution_receipt_digest: string;
  calibration_receipt_digest: string | null;
  operator_identity: string;
  target_actor_identity: string;
  evaluator_identity: string;
  profile: EvaluationProfileDefinition;
  rubric: ResolvedCampaign["rubric"] | null;
  mechanical_evaluation: MechanicalEvaluation;
  evaluation_input_digest: string;
}

export interface CodexEvaluationResult {
  receipt: EvaluationReceipt | null;
  attemptPath: string;
  blockedReason: string | null;
}

const OUTPUT_SCHEMA = "evals/rubrics/simulation-evaluation-output.schema.json";
const EVALUATOR_CONTRACTS = [
  ".codex/agents/simulation-evaluator.toml",
  ".codex/agents/simulation-evaluator/AGENT.md",
  ".codex/agents/simulation-evaluator/skills.yaml",
  ".codex/skills/simulation-evaluation/SKILL.md",
  ".codex/skills/simulation-evaluation/checklists/evaluation-quality.md",
];

function requireString(value: unknown, label: string): string {
  if (typeof value !== "string" || !value) {
    throw new CascadeError(`${label} must be a non-empty string`);
  }
  return value;
}

function requireDigest(value: unknown, label: string): string {
  const digest = requireString(value, label);
  if (!/^[a-f0-9]{64}$/.test(digest)) {
    throw new CascadeError(`${label} must be a sha256 digest`);
  }
  return digest;
}

function mechanicalGateStatus(
  evaluation: MechanicalEvaluation,
): "PASS" | "FAIL" | "BLOCKED" {
  if (evaluation.status === "PASS") return "PASS";
  if (evaluation.status === "BLOCKED") return "BLOCKED";
  return "FAIL";
}

function evaluationInput(
  resolved: ResolvedCampaign,
  identity: EvaluationIdentity,
  evaluationId: string,
  mechanical: MechanicalEvaluation,
): Omit<EvaluationRequest, "evaluation_input_digest"> {
  return {
    schema_version: 1,
    evaluation_id: evaluationId,
    run_id: identity.runId,
    campaign_id: identity.campaignId,
    source_manifest_digest: identity.sourceManifestDigest,
    execution_receipt_digest: identity.executionReceiptDigest,
    calibration_receipt_digest: identity.calibrationReceiptDigest,
    operator_identity: identity.operatorIdentity,
    target_actor_identity: identity.targetActorIdentity,
    evaluator_identity: identity.evaluatorIdentity,
    profile: resolved.evaluationProfile,
    rubric: resolved.rubric ?? null,
    mechanical_evaluation: mechanical,
  };
}

export function buildFixtureEvaluationReceipt(
  resolved: ResolvedCampaign,
  identity: EvaluationIdentity,
  mechanical: MechanicalEvaluation,
): EvaluationReceipt {
  if (identity.operatorIdentity === identity.evaluatorIdentity) {
    throw new CascadeError("operator and evaluator identities must differ");
  }
  const evaluationId = `${identity.runId}-evaluation`;
  const input = evaluationInput(resolved, identity, evaluationId, mechanical);
  return {
    schema_version: 2,
    evaluation_id: evaluationId,
    run_id: identity.runId,
    campaign_id: identity.campaignId,
    operator_identity: identity.operatorIdentity,
    evaluator_identity: identity.evaluatorIdentity,
    provider: "fixture",
    profile_id: resolved.evaluationProfile.id,
    profile_digest: valueDigest(resolved.evaluationProfile),
    rubric_id: null,
    rubric_digest: null,
    model: null,
    reasoning_effort: null,
    source_manifest_digest: identity.sourceManifestDigest,
    execution_receipt_digest: identity.executionReceiptDigest,
    calibration_receipt_digest: identity.calibrationReceiptDigest,
    evaluation_input_digest: valueDigest(input),
    input_manifest_digest: null,
    provider_trace_digest: null,
    provider_output_digest: null,
    usage: null,
    claim_ledger: mechanical.claim_ledger,
    status: mechanical.status,
    root_cause: mechanical.status === "PASS" ? "none" : "mechanical-gate",
    earliest_failure: null,
    residual_uncertainty: [
      "fixture evaluation proves deterministic reducer mechanics only",
    ],
    next_route: "target-specific independent evaluation remains NOT_RUN",
    created_at: utcNow(),
  };
}

export function parseCodexJsonl(stdout: string): {
  output: unknown;
  usage: Record<string, number> | null;
} {
  let output: unknown;
  let usage: Record<string, number> | null = null;
  let completed = false;
  for (const [index, raw] of stdout.split(/\r?\n/).entries()) {
    if (!raw.trim()) continue;
    let event: Record<string, unknown>;
    try {
      event = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      throw new CascadeError(`Codex JSONL line ${index + 1} is invalid`);
    }
    if (event.type === "item.completed") {
      const item = event.item as Record<string, unknown> | undefined;
      if (item?.type === "agent_message" && typeof item.text === "string") {
        try {
          output = JSON.parse(item.text);
        } catch {
          throw new CascadeError("Codex final agent message is not JSON");
        }
      }
    }
    if (event.type === "turn.completed") {
      completed = true;
      if (event.usage && typeof event.usage === "object") {
        usage = Object.fromEntries(
          Object.entries(event.usage as Record<string, unknown>).filter(
            (entry): entry is [string, number] =>
              typeof entry[1] === "number" && Number.isFinite(entry[1]),
          ),
        );
      }
    }
  }
  if (!completed) throw new CascadeError("Codex trace lacks turn.completed");
  if (!output) throw new CascadeError("Codex trace lacks a final JSON response");
  return { output, usage };
}

export function validateCodexEvaluationOutput(
  value: unknown,
  request: EvaluationRequest,
  inputManifestDigest: string,
): CodexEvaluationOutput {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new CascadeError("Codex evaluation output must be an object");
  }
  const output = value as Record<string, unknown>;
  if (output.schema_version !== 1) {
    throw new CascadeError("Codex evaluation output schema_version must be 1");
  }
  const expected = {
    evaluation_id: request.evaluation_id,
    run_id: request.run_id,
    campaign_id: request.campaign_id,
    source_manifest_digest: request.source_manifest_digest,
    execution_receipt_digest: request.execution_receipt_digest,
    evaluation_input_digest: request.evaluation_input_digest,
    input_manifest_digest: inputManifestDigest,
    evaluator_identity: request.evaluator_identity,
  };
  for (const [key, expectedValue] of Object.entries(expected)) {
    const actual =
      key.endsWith("_digest")
        ? requireDigest(output[key], `Codex output ${key}`)
        : requireString(output[key], `Codex output ${key}`);
    if (actual !== expectedValue) {
      throw new CascadeError(`Codex evaluation output ${key} is stale or mismatched`);
    }
  }
  const statuses = new Set(["PASS", "FAIL", "BLOCKED"]);
  if (!statuses.has(String(output.status))) {
    throw new CascadeError("Codex evaluation output status is invalid");
  }
  const expectedMechanical = mechanicalGateStatus(request.mechanical_evaluation);
  if (output.mechanical_gate_status !== expectedMechanical) {
    throw new CascadeError(
      "Codex evaluation output mechanical_gate_status conflicts with authoritative gates",
    );
  }
  if (expectedMechanical !== "PASS" && output.status === "PASS") {
    throw new CascadeError(
      "Codex evaluation output cannot pass a failed or blocked mechanical gate",
    );
  }
  if (!Array.isArray(output.claim_assessments)) {
    throw new CascadeError("Codex evaluation output claim_assessments must be an array");
  }
  const assessments = output.claim_assessments as Array<Record<string, unknown>>;
  const expectedClaimIds = request.mechanical_evaluation.claim_ledger.map(
    (claim) => claim.claim_id,
  );
  const actualClaimIds = assessments.map((claim, index) =>
    requireString(claim.claim_id, `claim_assessments[${index}].claim_id`),
  );
  if (
    new Set(actualClaimIds).size !== actualClaimIds.length ||
    stableJson([...actualClaimIds].sort()) !== stableJson([...expectedClaimIds].sort())
  ) {
    throw new CascadeError(
      "Codex evaluation output claim IDs are missing, duplicated, or unknown",
    );
  }
  const claimStatuses = new Set<ClaimStatus>([
    "SUPPORTED",
    "PARTIALLY_SUPPORTED",
    "UNSUPPORTED",
    "CONFLICTING",
    "BLOCKED",
    "NOT_RUN",
    "INVALID",
  ]);
  for (const [index, claim] of assessments.entries()) {
    if (!claimStatuses.has(claim.status as ClaimStatus)) {
      throw new CascadeError(`claim_assessments[${index}].status is invalid`);
    }
    requireString(claim.reason, `claim_assessments[${index}].reason`);
    if (
      !Array.isArray(claim.evidence) ||
      claim.evidence.some(
        (path) =>
          typeof path !== "string" ||
          !path ||
          path.startsWith("/") ||
          path.split("/").includes(".."),
      )
    ) {
      throw new CascadeError(`claim_assessments[${index}].evidence is invalid`);
    }
    const mechanicalClaim = request.mechanical_evaluation.claim_ledger.find(
      (item) => item.claim_id === claim.claim_id,
    )!;
    if (
      mechanicalClaim.status !== "SUPPORTED" &&
      claim.status === "SUPPORTED"
    ) {
      throw new CascadeError(
        `Codex evaluation output cannot upgrade mechanical claim ${mechanicalClaim.claim_id}`,
      );
    }
  }
  const rootCauses = new Set([
    "none",
    "execution",
    "evidence",
    "policy",
    "oracle",
    "cleanup",
    "calibration",
    "evaluator",
    "environment",
  ]);
  if (!rootCauses.has(requireString(output.root_cause, "Codex output root_cause"))) {
    throw new CascadeError("Codex output root_cause is invalid");
  }
  if (
    output.earliest_failure !== null &&
    typeof output.earliest_failure !== "string"
  ) {
    throw new CascadeError("Codex output earliest_failure is invalid");
  }
  if (
    !Array.isArray(output.residual_uncertainty) ||
    output.residual_uncertainty.some((item) => typeof item !== "string")
  ) {
    throw new CascadeError("Codex output residual_uncertainty is invalid");
  }
  requireString(output.next_route, "Codex output next_route");
  if (
    output.status === "PASS" &&
    (output.root_cause !== "none" || output.earliest_failure !== null)
  ) {
    throw new CascadeError(
      "Codex PASS output must use root_cause none and no earliest_failure",
    );
  }
  return output as unknown as CodexEvaluationOutput;
}

export function buildCodexEvaluationReceipt(
  resolved: ResolvedCampaign,
  identity: EvaluationIdentity,
  mechanical: MechanicalEvaluation,
  request: EvaluationRequest,
  output: CodexEvaluationOutput,
  inputManifestDigest: string,
  providerTraceDigest: string,
  usage: Record<string, number> | null,
): EvaluationReceipt {
  const assessments = new Map(
    output.claim_assessments.map((claim) => [claim.claim_id, claim]),
  );
  const claimLedger = mechanical.claim_ledger.map((mechanicalClaim) => {
    const semantic = assessments.get(mechanicalClaim.claim_id)!;
    if (mechanicalClaim.status !== "SUPPORTED") return mechanicalClaim;
    return {
      ...mechanicalClaim,
      status: semantic.status,
      reason: semantic.reason,
      evidence: [...new Set([...mechanicalClaim.evidence, ...semantic.evidence])],
    };
  });
  const requiredFailures = claimLedger.filter(
    (claim) =>
      claim.class !== "release-eligibility" && claim.status !== "SUPPORTED",
  );
  return {
    schema_version: 2,
    evaluation_id: request.evaluation_id,
    run_id: identity.runId,
    campaign_id: identity.campaignId,
    operator_identity: identity.operatorIdentity,
    evaluator_identity: identity.evaluatorIdentity,
    provider: "codex",
    profile_id: resolved.evaluationProfile.id,
    profile_digest: valueDigest(resolved.evaluationProfile),
    rubric_id: resolved.rubric?.id ?? null,
    rubric_digest: resolved.rubric ? valueDigest(resolved.rubric) : null,
    model: resolved.evaluationProfile.model ?? null,
    reasoning_effort: resolved.evaluationProfile.reasoning_effort ?? null,
    source_manifest_digest: identity.sourceManifestDigest,
    execution_receipt_digest: identity.executionReceiptDigest,
    calibration_receipt_digest: identity.calibrationReceiptDigest,
    evaluation_input_digest: request.evaluation_input_digest,
    input_manifest_digest: inputManifestDigest,
    provider_trace_digest: providerTraceDigest,
    provider_output_digest: valueDigest(output),
    usage,
    claim_ledger: claimLedger,
    status: requiredFailures.length ? "FAIL" : output.status,
    root_cause: output.root_cause,
    earliest_failure: output.earliest_failure,
    residual_uncertainty: output.residual_uncertainty,
    next_route: output.next_route,
    created_at: utcNow(),
  };
}

async function copyTree(source: string, destination: string): Promise<void> {
  for (const file of await walkFiles(source)) {
    const target = resolve(destination, relative(source, file));
    await mkdir(resolve(target, ".."), { recursive: true });
    await copyFile(file, target);
  }
}

function codexPrompt(request: EvaluationRequest): string {
  return `You are the independent Cascade simulation evaluator.

Work only inside this frozen evaluation input. Do not modify files, execute or
replay the target, use the network, delegate, or read outside this directory.

Read these sources completely:
- contracts/simulation-evaluator.toml
- contracts/AGENT.md
- contracts/skills.yaml
- contracts/SKILL.md
- contracts/evaluation-quality.md
- contracts/rubric.json
- request.json
- input-manifest.json
- run/execution/execution-receipt.json
- run/execution/source-manifest.json
- every run/execution/tasks/*/result.json, policy-decisions.json, oracle.json,
  cleanup.json, and events.jsonl file
- run/calibration.json when present

The mechanical evaluation in request.json is authoritative. You may downgrade
a mechanically supported claim from frozen evidence, but you must not upgrade
any claim blocked or rejected by a mechanical gate. Framework calibration
cannot support target release eligibility.

Return only JSON matching contracts/output.schema.json. Echo every identity and
digest from request.json exactly, plus the manifest_digest from
input-manifest.json as input_manifest_digest. Include every declared claim
exactly once and cite only paths inside this frozen input.`;
}

function blockedReason(result: {
  exitCode: number;
  timedOut: boolean;
  stdout: string;
  stderr: string;
}): string {
  if (result.timedOut) return "Codex evaluator timed out";
  for (const raw of result.stdout.split(/\r?\n/).reverse()) {
    if (!raw.trim()) continue;
    try {
      const event = JSON.parse(raw) as Record<string, unknown>;
      if (event.type === "error" && typeof event.message === "string") {
        return `Codex evaluator exited ${result.exitCode}: ${event.message}`;
      }
      if (event.type === "turn.failed") {
        const error = event.error as Record<string, unknown> | undefined;
        if (typeof error?.message === "string") {
          return `Codex evaluator exited ${result.exitCode}: ${error.message}`;
        }
      }
    } catch {
      // Continue to the stderr fallback for non-JSON output.
    }
  }
  const detail = result.stderr.trim().split(/\r?\n/).at(-1);
  return detail
    ? `Codex evaluator exited ${result.exitCode}: ${detail}`
    : `Codex evaluator exited ${result.exitCode}`;
}

export async function runCodexEvaluation(
  resolved: ResolvedCampaign,
  runRoot: string,
  identity: EvaluationIdentity,
  mechanical: MechanicalEvaluation,
  artifactStore: CampaignArtifactStore,
): Promise<CodexEvaluationResult> {
  if (resolved.evaluationProfile.provider !== "codex") {
    throw new CascadeError("runCodexEvaluation requires a codex profile");
  }
  if (identity.operatorIdentity === identity.evaluatorIdentity) {
    throw new CascadeError("operator and evaluator identities must differ");
  }
  const evaluationId = `${identity.runId}-evaluation`;
  const evaluationRoot = await mkdtemp(
    resolve(tmpdir(), `cascade-${evaluationId}-`),
  );
  const persistAttempt = async (): Promise<string> => {
    for (const file of await walkFiles(evaluationRoot)) {
      const path = relative(evaluationRoot, file).split("\\").join("/");
      await artifactStore.writeStageFile(
        `evaluations/${evaluationId}/${path}`,
        file,
        {
          redaction_profile: path.startsWith("input/")
            ? "source-code-v1"
            : "no-secrets-v1",
        },
      );
    }
    return `evaluations/${evaluationId}/attempt.json`;
  };
  const inputRoot = resolve(evaluationRoot, "input");
  await mkdir(inputRoot, { recursive: false });

  const input = evaluationInput(
    resolved,
    identity,
    evaluationId,
    mechanical,
  );
  const request: EvaluationRequest = {
    ...input,
    evaluation_input_digest: valueDigest(input),
  };
  await writeJson(resolve(inputRoot, "request.json"), request);
  await copyTree(
    resolve(runRoot, "execution"),
    resolve(inputRoot, "run", "execution"),
  );
  if (identity.calibrationReceiptDigest) {
    const calibrationFiles = (
      await walkFiles(resolve(runRoot, "calibrations"), {
        include: (path) => path.endsWith(".json"),
      })
    ).sort();
    if (calibrationFiles.length !== 1) {
      throw new CascadeError("Codex evaluation requires exactly one calibration receipt");
    }
    await mkdir(resolve(inputRoot, "run"), { recursive: true });
    await copyFile(calibrationFiles[0]!, resolve(inputRoot, "run", "calibration.json"));
  }
  const contractRoot = resolve(inputRoot, "contracts");
  await mkdir(contractRoot, { recursive: true });
  const contractNames = [
    "simulation-evaluator.toml",
    "AGENT.md",
    "skills.yaml",
    "SKILL.md",
    "evaluation-quality.md",
  ];
  for (const [index, source] of EVALUATOR_CONTRACTS.entries()) {
    await copyFile(rootPath(source), resolve(contractRoot, contractNames[index]!));
  }
  await copyFile(
    rootPath(resolved.evaluationProfile.rubric_file!),
    resolve(contractRoot, "rubric.json"),
  );
  await copyFile(
    rootPath(OUTPUT_SCHEMA),
    resolve(contractRoot, "output.schema.json"),
  );
  const prompt = codexPrompt(request);
  await writeFile(resolve(inputRoot, "prompt.txt"), prompt, "utf8");
  const inputFiles = [];
  for (const file of await walkFiles(inputRoot)) {
    inputFiles.push({
      path: relative(inputRoot, file).split("\\").join("/"),
      sha256: await sha256File(file),
    });
  }
  const inputManifest = {
    schema_version: 1,
    evaluation_id: evaluationId,
    evaluation_input_digest: request.evaluation_input_digest,
    files: inputFiles,
    manifest_digest: valueDigest(inputFiles),
  };
  await writeJson(resolve(inputRoot, "input-manifest.json"), inputManifest);

  const profile = resolved.evaluationProfile;
  const command = [
    "codex",
    "exec",
    "--ephemeral",
    "--ignore-user-config",
    "--json",
    "--disable",
    "plugins",
    "--disable",
    "apps",
    "--disable",
    "browser_use",
    "--disable",
    "computer_use",
    "--disable",
    "image_generation",
    "--disable",
    "code_mode_host",
    "-m",
    profile.model!,
    "-c",
    `model_reasoning_effort="${profile.reasoning_effort}"`,
    "-s",
    "read-only",
    "-C",
    inputRoot,
    "--skip-git-repo-check",
    "--output-schema",
    resolve(contractRoot, "output.schema.json"),
    prompt,
  ];
  await writeJson(resolve(evaluationRoot, "command.json"), {
    argv: [...command.slice(0, -1), "<prompt-in-input/prompt.txt>"],
  });
  const result = await runCommand(command, {
    cwd: inputRoot,
    env: { NO_COLOR: "1", TERM: "xterm-256color" },
    timeoutMs: profile.timeout_ms,
    maxOutputBytes: 10 * 1024 * 1024,
  });
  await writeFile(resolve(evaluationRoot, "stdout.jsonl"), result.stdout, "utf8");
  await writeFile(resolve(evaluationRoot, "stderr.log"), result.stderr, "utf8");
  const attempt = {
    schema_version: 1,
    evaluation_id: evaluationId,
    run_id: identity.runId,
    campaign_id: identity.campaignId,
    provider: "codex",
    model: profile.model,
    reasoning_effort: profile.reasoning_effort,
    evaluation_input_digest: request.evaluation_input_digest,
    exit_code: result.exitCode,
    timed_out: result.timedOut,
    duration_ms: result.durationMs,
    status: "BLOCKED" as CampaignStatus,
    reason: null as string | null,
    created_at: utcNow(),
  };
  if (result.exitCode !== 0 || result.timedOut) {
    attempt.reason = blockedReason(result);
    await writeJson(resolve(evaluationRoot, "attempt.json"), attempt);
    const attemptPath = await persistAttempt();
    await rm(evaluationRoot, { recursive: true, force: true });
    return { receipt: null, attemptPath, blockedReason: attempt.reason };
  }
  try {
    const parsed = parseCodexJsonl(result.stdout);
    const output = validateCodexEvaluationOutput(
      parsed.output,
      request,
      inputManifest.manifest_digest,
    );
    for (const claim of output.claim_assessments) {
      for (const evidence of claim.evidence) {
        if (!(await isFile(resolve(inputRoot, evidence)))) {
          throw new CascadeError(
            `Codex evaluation cites missing frozen evidence: ${evidence}`,
          );
        }
      }
    }
    const traceDigest = await sha256File(resolve(evaluationRoot, "stdout.jsonl"));
    const receipt = buildCodexEvaluationReceipt(
      resolved,
      identity,
      mechanical,
      request,
      output,
      inputManifest.manifest_digest,
      traceDigest,
      parsed.usage,
    );
    await writeJsonExclusive(resolve(evaluationRoot, "receipt.json"), receipt);
    attempt.status = receipt.status;
    await writeJson(resolve(evaluationRoot, "attempt.json"), attempt);
    const attemptPath = await persistAttempt();
    await rm(evaluationRoot, { recursive: true, force: true });
    return { receipt, attemptPath, blockedReason: null };
  } catch (error) {
    attempt.reason = error instanceof Error ? error.message : String(error);
    await writeJson(resolve(evaluationRoot, "attempt.json"), attempt);
    const attemptPath = await persistAttempt();
    await rm(evaluationRoot, { recursive: true, force: true });
    return { receipt: null, attemptPath, blockedReason: attempt.reason };
  }
}
