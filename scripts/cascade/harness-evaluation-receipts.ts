import { CascadeError, parseRfc3339Instant, stableJson } from "./common";
import type { CampaignPrincipal } from "./campaign-artifacts";
import { assertTerminalStatusMatchesClaimLedger } from "./evaluations";
import type {
  CampaignStatus,
  ClaimStatus,
  SpecializedEvaluationDeclaration,
} from "./simulation-definitions";

export interface SpecializedClaimLedgerEntry {
  claim_id: string;
  class: string;
  status: ClaimStatus;
  reason: string;
  evidence: string[];
}

export interface SpecializedEvidenceArtifact {
  path: string;
  sha256: string;
}

export interface SpecializedEvaluationReceipt {
  schema_version: 2;
  specialized_evaluation_id: string;
  run_id: string;
  campaign_id: string;
  applicability: SpecializedEvaluationDeclaration["applicability"];
  specialized_evaluator_identity: string;
  source_manifest_digest: string;
  execution_receipt_digest: string;
  route_ids: string[];
  trace_ids: string[];
  claim_ids: string[];
  input_manifest_digest: string | null;
  provider_trace_digest: string | null;
  provider_output_digest: string | null;
  evidence_artifacts: SpecializedEvidenceArtifact[];
  claim_ledger: SpecializedClaimLedgerEntry[];
  status: "PASS" | "FAIL" | "BLOCKED" | "NOT_APPLICABLE";
  root_cause: string;
  earliest_failure: string | null;
  residual_uncertainty: string[];
  created_at: string;
}

export interface SpecializedEvaluationExpectation {
  path: string;
  run_id: string;
  campaign_id: string;
  declaration: SpecializedEvaluationDeclaration;
  source_manifest_digest: string;
  execution_receipt_digest: string;
  claim_authority_digest: string;
  specialized_evaluator: CampaignPrincipal;
  other_principals: CampaignPrincipal[];
  claims: Array<{ id: string; class: string }>;
  artifact_files: Array<SpecializedEvidenceArtifact & { content: string }>;
}

const DIGEST = /^[a-f0-9]{64}$/;

function exactStrings(actual: string[], expected: string[], label: string): void {
  if (
    new Set(actual).size !== actual.length ||
    stableJson(actual) !== stableJson(expected)
  ) {
    throw new CascadeError(`specialized evaluation receipt ${label} is missing, duplicated, reordered, or stale`);
  }
}

function assertDigest(value: string | null, label: string): void {
  if (value !== null && !DIGEST.test(value)) {
    throw new CascadeError(`specialized evaluation receipt ${label} is invalid`);
  }
}

const CLAIM_STATUSES = new Set<ClaimStatus>([
  "SUPPORTED",
  "PARTIALLY_SUPPORTED",
  "UNSUPPORTED",
  "CONFLICTING",
  "BLOCKED",
  "NOT_RUN",
  "INVALID",
]);
const CLAIM_CLASSES = new Set([
  "authorship",
  "execution",
  "mechanical-behavior",
  "semantic-quality",
  "safety-compliance",
  "coverage",
  "release-eligibility",
]);
const TERMINAL_STATUSES = new Set(["PASS", "FAIL", "BLOCKED", "NOT_APPLICABLE"]);
const ROOT_CAUSES = new Set([
  "none",
  "execution",
  "evidence",
  "policy",
  "oracle",
  "evaluator",
  "environment",
  "not-applicable",
]);

function isSafeArtifactPath(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    !value.startsWith("/") &&
    !value.split("/").includes("..")
  );
}

function validateReceiptShape(receipt: SpecializedEvaluationReceipt): void {
  const expectedKeys = [
    "applicability",
    "campaign_id",
    "claim_ids",
    "claim_ledger",
    "created_at",
    "earliest_failure",
    "evidence_artifacts",
    "execution_receipt_digest",
    "input_manifest_digest",
    "provider_output_digest",
    "provider_trace_digest",
    "residual_uncertainty",
    "root_cause",
    "route_ids",
    "run_id",
    "schema_version",
    "source_manifest_digest",
    "specialized_evaluation_id",
    "specialized_evaluator_identity",
    "status",
    "trace_ids",
  ];
  if (
    !receipt ||
    typeof receipt !== "object" ||
    Array.isArray(receipt) ||
    Object.keys(receipt).sort().join(",") !== expectedKeys.join(",") ||
    !TERMINAL_STATUSES.has(String(receipt.status)) ||
    !ROOT_CAUSES.has(String(receipt.root_cause)) ||
    parseRfc3339Instant(receipt.created_at) === null ||
    (receipt.earliest_failure !== null &&
      (typeof receipt.earliest_failure !== "string" || !receipt.earliest_failure)) ||
    !Array.isArray(receipt.residual_uncertainty) ||
    receipt.residual_uncertainty.some((item) => typeof item !== "string" || !item) ||
    !Array.isArray(receipt.claim_ledger) ||
    !Array.isArray(receipt.evidence_artifacts)
  ) {
    throw new CascadeError("specialized evaluation receipt shape is invalid");
  }
  const evidencePaths = new Set<string>();
  for (const [index, artifact] of receipt.evidence_artifacts.entries()) {
    if (
      !artifact ||
      typeof artifact !== "object" ||
      Array.isArray(artifact) ||
      Object.keys(artifact).sort().join(",") !== "path,sha256" ||
      !isSafeArtifactPath(artifact.path) ||
      !DIGEST.test(artifact.sha256) ||
      evidencePaths.has(artifact.path)
    ) {
      throw new CascadeError(`specialized evaluation receipt evidence artifact ${index} is invalid`);
    }
    evidencePaths.add(artifact.path);
  }
  for (const [index, entry] of receipt.claim_ledger.entries()) {
    if (
      !entry ||
      typeof entry !== "object" ||
      Array.isArray(entry) ||
      Object.keys(entry).sort().join(",") !== "claim_id,class,evidence,reason,status" ||
      typeof entry.claim_id !== "string" ||
      !entry.claim_id ||
      typeof entry.class !== "string" ||
      !entry.class ||
      !CLAIM_CLASSES.has(entry.class) ||
      !CLAIM_STATUSES.has(entry.status) ||
      typeof entry.reason !== "string" ||
      !entry.reason ||
      !Array.isArray(entry.evidence) ||
      new Set(entry.evidence).size !== entry.evidence.length ||
      entry.evidence.some((path) => !isSafeArtifactPath(path))
    ) {
      throw new CascadeError(`specialized evaluation receipt claim ledger ${index} is invalid`);
    }
  }
}

function parseEvidenceJson(
  artifact: SpecializedEvidenceArtifact & { content: string },
  label: string,
): Record<string, unknown> {
  try {
    const value = JSON.parse(artifact.content);
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error();
    return value as Record<string, unknown>;
  } catch {
    throw new CascadeError(`${label} is not valid JSON`);
  }
}

function validateRequiredProviderPacket(
  receipt: SpecializedEvaluationReceipt,
  expected: SpecializedEvaluationExpectation,
): void {
  const root = `specialized-evaluations/${receipt.specialized_evaluation_id}`;
  const paths = {
    input: `${root}/input/input-manifest.json`,
    trace: `${root}/provider/trace.json`,
    output: `${root}/provider/output.json`,
  } as const;
  if (new Set(Object.values(paths)).size !== 3) {
    throw new CascadeError("REQUIRED specialized provider evidence paths are not distinct");
  }
  const files = new Map(expected.artifact_files.map((artifact) => [artifact.path, artifact]));
  const inputArtifact = files.get(paths.input);
  const traceArtifact = files.get(paths.trace);
  const outputArtifact = files.get(paths.output);
  if (!inputArtifact || !traceArtifact || !outputArtifact) {
    throw new CascadeError("REQUIRED specialized evaluation lacks canonical provider evidence");
  }
  if (
    receipt.input_manifest_digest !== inputArtifact.sha256 ||
    receipt.provider_trace_digest !== traceArtifact.sha256 ||
    receipt.provider_output_digest !== outputArtifact.sha256 ||
    new Set([
      inputArtifact.sha256,
      traceArtifact.sha256,
      outputArtifact.sha256,
    ]).size !== 3
  ) {
    throw new CascadeError("REQUIRED specialized provider evidence is reused or stale");
  }
  const input = parseEvidenceJson(inputArtifact, "specialized input manifest");
  const trace = parseEvidenceJson(traceArtifact, "specialized provider trace");
  const output = parseEvidenceJson(outputArtifact, "specialized provider output");
  const expectedClaims = expected.declaration.claim_ids.map((claimId) => ({
    claim_id: claimId,
    class: expected.claims.find((claim) => claim.id === claimId)?.class,
  }));
  if (
    Object.keys(input).sort().join(",") !== [
      "artifact_type", "campaign_id", "claim_authority_digest", "claims",
      "execution_receipt_digest", "route_ids", "run_id", "schema_version",
      "source_manifest_digest", "specialized_evaluation_id", "trace_ids",
    ].sort().join(",") ||
    input.schema_version !== 1 ||
    input.artifact_type !== "specialized-evaluation-input-manifest" ||
    input.specialized_evaluation_id !== receipt.specialized_evaluation_id ||
    input.run_id !== expected.run_id ||
    input.campaign_id !== expected.campaign_id ||
    input.source_manifest_digest !== expected.source_manifest_digest ||
    input.execution_receipt_digest !== expected.execution_receipt_digest ||
    input.claim_authority_digest !== expected.claim_authority_digest ||
    stableJson(input.route_ids) !== stableJson(expected.declaration.route_ids) ||
    stableJson(input.trace_ids) !== stableJson(expected.declaration.trace_ids) ||
    stableJson(input.claims) !== stableJson(expectedClaims)
  ) {
    throw new CascadeError("REQUIRED specialized input manifest is stale or invalid");
  }
  if (
    Object.keys(trace).sort().join(",") !== [
      "artifact_type", "completed", "events", "input_manifest_digest", "model",
      "provider", "schema_version", "specialized_evaluation_id",
    ].sort().join(",") ||
    trace.schema_version !== 1 ||
    trace.artifact_type !== "specialized-evaluation-provider-trace" ||
    trace.specialized_evaluation_id !== receipt.specialized_evaluation_id ||
    trace.input_manifest_digest !== receipt.input_manifest_digest ||
    typeof trace.provider !== "string" ||
    !trace.provider ||
    typeof trace.model !== "string" ||
    !trace.model ||
    trace.completed !== true ||
    !Array.isArray(trace.events) ||
    trace.events.length === 0
  ) {
    throw new CascadeError("REQUIRED specialized provider trace is stale or invalid");
  }
  if (
    Object.keys(output).sort().join(",") !== [
      "artifact_type", "claim_ledger", "earliest_failure", "input_manifest_digest",
      "provider_trace_digest", "residual_uncertainty", "root_cause", "schema_version",
      "specialized_evaluation_id", "status",
    ].sort().join(",") ||
    output.schema_version !== 1 ||
    output.artifact_type !== "specialized-evaluation-provider-output" ||
    output.specialized_evaluation_id !== receipt.specialized_evaluation_id ||
    output.input_manifest_digest !== receipt.input_manifest_digest ||
    output.provider_trace_digest !== receipt.provider_trace_digest ||
    output.status !== receipt.status ||
    output.root_cause !== receipt.root_cause ||
    output.earliest_failure !== receipt.earliest_failure ||
    stableJson(output.residual_uncertainty) !==
      stableJson(receipt.residual_uncertainty) ||
    stableJson(output.claim_ledger) !== stableJson(receipt.claim_ledger)
  ) {
    throw new CascadeError("REQUIRED specialized provider output is stale or invalid");
  }
  const evidencePaths = new Set(receipt.evidence_artifacts.map((artifact) => artifact.path));
  if (
    !Object.values(paths).every((path) => evidencePaths.has(path)) ||
    receipt.claim_ledger.some(
      (entry) => !entry.evidence.includes(paths.output),
    )
  ) {
    throw new CascadeError("REQUIRED specialized claim evidence lacks its typed provider output");
  }
}

export function verifySpecializedEvaluationReceipt(
  receipt: SpecializedEvaluationReceipt,
  expected: SpecializedEvaluationExpectation,
): void {
  validateReceiptShape(receipt);
  const expectedId = `${expected.run_id}-specialized-evaluation`;
  const expectedPath = `specialized-evaluations/${expectedId}/receipt.json`;
  const exact: Array<[unknown, unknown, string]> = [
    [receipt.schema_version, 2, "schema_version"],
    [receipt.specialized_evaluation_id, expectedId, "specialized_evaluation_id"],
    [expected.path, expectedPath, "path"],
    [receipt.run_id, expected.run_id, "run_id"],
    [receipt.campaign_id, expected.campaign_id, "campaign_id"],
    [receipt.applicability, expected.declaration.applicability, "applicability"],
    [receipt.specialized_evaluator_identity, expected.specialized_evaluator.subject, "specialized_evaluator_identity"],
    [receipt.source_manifest_digest, expected.source_manifest_digest, "source_manifest_digest"],
    [receipt.execution_receipt_digest, expected.execution_receipt_digest, "execution_receipt_digest"],
  ];
  for (const [actual, wanted, label] of exact) {
    if (actual !== wanted) {
      throw new CascadeError(`specialized evaluation receipt ${label} is stale or mismatched`);
    }
  }
  if (expected.specialized_evaluator.role !== "harness-evaluator") {
    throw new CascadeError("specialized evaluation receipt principal must use harness-evaluator role");
  }
  if (
    expected.other_principals.some(
      (principal) =>
        principal.subject === expected.specialized_evaluator.subject ||
        principal.session_id === expected.specialized_evaluator.session_id,
    )
  ) {
    throw new CascadeError("specialized evaluation receipt violates role/session separation");
  }
  if (!DIGEST.test(receipt.source_manifest_digest) || !DIGEST.test(receipt.execution_receipt_digest)) {
    throw new CascadeError("specialized evaluation receipt source or execution digest is invalid");
  }
  exactStrings(receipt.route_ids, expected.declaration.route_ids, "route_ids");
  exactStrings(receipt.trace_ids, expected.declaration.trace_ids, "trace_ids");
  exactStrings(receipt.claim_ids, expected.declaration.claim_ids, "claim_ids");
  const ledgerIds = receipt.claim_ledger.map((entry) => entry.claim_id);
  exactStrings(ledgerIds, expected.declaration.claim_ids, "claim ledger");
  assertDigest(receipt.input_manifest_digest, "input_manifest_digest");
  assertDigest(receipt.provider_trace_digest, "provider_trace_digest");
  assertDigest(receipt.provider_output_digest, "provider_output_digest");
  const expectedClasses = new Map(expected.claims.map((claim) => [claim.id, claim.class]));
  for (const entry of receipt.claim_ledger) {
    if (entry.class !== expectedClasses.get(entry.claim_id)) {
      throw new CascadeError(`specialized evaluation receipt claim class is stale: ${entry.claim_id}`);
    }
  }
  if (expected.declaration.applicability === "NOT_APPLICABLE") {
    if (
      receipt.status !== "NOT_APPLICABLE" ||
      receipt.claim_ledger.length ||
      receipt.input_manifest_digest !== null ||
      receipt.provider_trace_digest !== null ||
      receipt.provider_output_digest !== null ||
      receipt.evidence_artifacts.length !== 0 ||
      receipt.root_cause !== "not-applicable" ||
      receipt.earliest_failure !== null
    ) {
      throw new CascadeError("NOT_APPLICABLE specialized evaluation receipt contains evaluation results");
    }
  } else {
    if (receipt.status === "NOT_APPLICABLE") {
      throw new CascadeError("REQUIRED specialized evaluation cannot be NOT_APPLICABLE");
    }
    if (
      receipt.input_manifest_digest === null ||
      receipt.provider_trace_digest === null ||
      receipt.provider_output_digest === null ||
      receipt.evidence_artifacts.length === 0
    ) {
      throw new CascadeError("REQUIRED specialized evaluation receipt lacks provider evidence bindings");
    }
    const actualFiles = new Map(expected.artifact_files.map((file) => [file.path, file.sha256]));
    for (const artifact of receipt.evidence_artifacts) {
      if (actualFiles.get(artifact.path) !== artifact.sha256) {
        throw new CascadeError(`REQUIRED specialized evaluation evidence artifact is missing or stale: ${artifact.path}`);
      }
    }
    validateRequiredProviderPacket(receipt, expected);
    const evidencePaths = new Set(receipt.evidence_artifacts.map((artifact) => artifact.path));
    if (receipt.claim_ledger.some((entry) => !entry.evidence.length || entry.evidence.some((path) => !evidencePaths.has(path)))) {
      throw new CascadeError("REQUIRED specialized evaluation claim evidence is not artifact-bound");
    }
    assertTerminalStatusMatchesClaimLedger(
      receipt.status,
      receipt.claim_ledger,
      "specialized evaluation",
    );
    if (
      (receipt.status === "FAIL" || receipt.status === "BLOCKED") &&
      (receipt.root_cause === "none" || receipt.earliest_failure === null)
    ) {
      throw new CascadeError("specialized terminal failure lacks root cause or earliest failure");
    }
    if (receipt.status === "PASS" && (receipt.root_cause !== "none" || receipt.earliest_failure !== null)) {
      throw new CascadeError("specialized PASS has inconsistent failure metadata");
    }
  }
}

export function buildNotApplicableSpecializedEvaluationReceipt(input: {
  run_id: string;
  campaign_id: string;
  specialized_evaluator_identity: string;
  source_manifest_digest: string;
  execution_receipt_digest: string;
  declaration: SpecializedEvaluationDeclaration;
  created_at: string;
}): SpecializedEvaluationReceipt {
  if (input.declaration.applicability !== "NOT_APPLICABLE") {
    throw new CascadeError("cannot build a NOT_APPLICABLE receipt for REQUIRED specialized evaluation");
  }
  return {
    schema_version: 2,
    specialized_evaluation_id: `${input.run_id}-specialized-evaluation`,
    run_id: input.run_id,
    campaign_id: input.campaign_id,
    applicability: "NOT_APPLICABLE",
    specialized_evaluator_identity: input.specialized_evaluator_identity,
    source_manifest_digest: input.source_manifest_digest,
    execution_receipt_digest: input.execution_receipt_digest,
    route_ids: [],
    trace_ids: [],
    claim_ids: [],
    input_manifest_digest: null,
    provider_trace_digest: null,
    provider_output_digest: null,
    evidence_artifacts: [],
    claim_ledger: [],
    status: "NOT_APPLICABLE",
    root_cause: "not-applicable",
    earliest_failure: null,
    residual_uncertainty: [input.declaration.reason],
    created_at: input.created_at,
  };
}

export function specializedStatusToCampaignStatus(
  status: SpecializedEvaluationReceipt["status"],
): CampaignStatus {
  if (status === "PASS" || status === "NOT_APPLICABLE") return "PASS";
  return status;
}
