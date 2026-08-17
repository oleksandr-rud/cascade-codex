import {
  chmod,
  link,
  lstat,
  mkdir,
  open,
  realpath,
  readdir,
  rename,
  unlink,
  writeFile,
} from "node:fs/promises";
import { constants } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";

import {
  CascadeError,
  assertNoExactConfirmationSecretBytes,
  compareRfc3339Instants,
  confirmationSecretBytes,
  exists,
  parseRfc3339Instant,
  sha256Text,
  stableJson,
  utcNow,
  writeJsonAtomic,
  writeJsonAtomicExclusive,
  writeJsonExclusive,
  writeTextExclusive,
} from "./common";
import {
  simulationCheckpointDigest,
  simulationEventDigest,
  validateSimulationSessionHistory,
  type SimulationSessionCheckpoint,
  type SimulationSessionEvent,
} from "./simulation-sessions";
import {
  type PersonaRefinementProposal,
  refinementProposalCandidateDigest,
  validatePersonaRefinementProposal,
} from "./persona-simulations";
import {
  verifySpecializedEvaluationReceipt,
  type SpecializedEvaluationReceipt,
} from "./harness-evaluation-receipts";
import {
  verifyRetryLineageReceipt,
  retryLineageReceiptDigest,
  type RetryLineageReceipt,
  type VerifiedRetryLineageParent,
} from "./retry-lineage";
import {
  runtimeHandoffReceiptDigest,
  validateRuntimeHandoffReceipt,
  type RuntimeHandoffReceipt,
} from "./runtime-handoffs";
import {
  assertTerminalStatusMatchesClaimLedger,
  claimLedgerTerminalStatus,
  parseCodexJsonl,
  reconstructCodexBlockedAttemptReason,
  type EvaluationRequest,
} from "./evaluations";
import {
  buildCalibrationAuthority,
  buildMechanicalEvaluationAuthority,
  getAuthorityStatePath,
  observeFileExistsAuthority,
  replayFakeActionPrefixAuthority,
  requiredPolicyEvidenceProjection,
  validatePolicyDriverEventAuthority,
  validateTaskEventChronologyAuthority,
  type CalibrationReceipt,
  type MechanicalTaskAuthority,
} from "./evaluation-authority";
import {
  CAMPAIGN_REDACTION_CAPABILITIES,
  CAMPAIGN_SUPPORTED_BUDGET_DIMENSIONS,
  consumePolicyBudget,
  consumePolicyOutputBudget,
  resolvePolicyDecision,
  validatePolicyConfirmationReceipt,
  type CampaignPolicyBudgetUsage,
  type CampaignPolicyConfirmationUsage,
  type PolicyConfirmationReceipt,
} from "./campaign-policies";
import type {
  CalibrationDefinition,
  ClaimDefinition,
  ClaimStatus,
  MetricDefinition,
  OracleDefinition,
  PolicyDefinition,
  ScoreRow,
  SimulationAction,
  SpecializedEvaluationDeclaration,
  ResolvedCampaign,
  TaskAction,
  TaskDefinition,
  TreatmentDefinition,
} from "./simulation-definitions";
import {
  ACTION_BINDING_VERSION,
  CAMPAIGN_FIXED_SOURCE_FILES,
  actionBindingDigest,
  assertSafeSimulationAction,
  policyAppliesToObservation,
  taskPolicyActions,
} from "./simulation-definitions";

export const CAMPAIGN_ARTIFACT_SCHEMA_VERSION = "1.2.0";
const PREVIOUS_CAMPAIGN_ARTIFACT_SCHEMA_VERSION = "1.1.0";
const LEGACY_CAMPAIGN_ARTIFACT_SCHEMA_VERSION = "1.0.0";
type CampaignArtifactSchemaVersion =
  | typeof CAMPAIGN_ARTIFACT_SCHEMA_VERSION
  | typeof PREVIOUS_CAMPAIGN_ARTIFACT_SCHEMA_VERSION
  | typeof LEGACY_CAMPAIGN_ARTIFACT_SCHEMA_VERSION;
export const DEFAULT_EVIDENCE_LIMIT_BYTES = 10 * 1024 * 1024;
export const SESSION_ARTIFACT_SEGMENT_SIZE = 1_000;
export const MAX_CAMPAIGN_ARTIFACT_FILES = 10_000;
const MAX_TRUSTED_LIFECYCLE_AGE_MS = 24 * 60 * 60 * 1_000;

const PRINCIPAL_ROLES = {
  operator: "simulation-operator",
  evaluator: "simulation-evaluator",
  aggregator: "campaign-aggregator",
  target: "target-actor",
  simulator: "simulator",
  recovery: "simulation-recovery",
} as const;
const SPECIALIZED_EVALUATOR_ROLE = "harness-evaluator" as const;

const MUTABLE_NAMESPACES = new Set([
  "execution",
  "calibrations",
  "specialized-evaluations",
  "evaluations",
  "refinements",
  "aggregations",
  "recovery",
]);

function sessionSegment(sequence: number): string {
  return String(Math.floor(sequence / SESSION_ARTIFACT_SEGMENT_SIZE)).padStart(
    8,
    "0",
  );
}
const MUTATION_LOCK_TIMEOUT_MS = 10_000;
const MUTATION_GOVERNANCE_RETRY_LIMIT = 64;
const ARTIFACT_DIRECTORY_MODE = 0o700;
const ARTIFACT_FILE_MODE = 0o600;
const ARTIFACT_WRITE_OPTIONS = {
  directoryMode: ARTIFACT_DIRECTORY_MODE,
  fileMode: ARTIFACT_FILE_MODE,
} as const;

const SECRET_PATTERNS = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /\bsk-(?:proj-)?[A-Za-z0-9_-]{16,}\b/,
  /\bgh[pousr]_[A-Za-z0-9]{20,}\b/,
  /\bAKIA[0-9A-Z]{16}\b/,
] as const;

const EVIDENCE_SECRET_PATTERNS = [
  ...SECRET_PATTERNS,
  /\b(?:auth(?:orization)?|api[-_ ]?key|cookie|password|passwd|passcode|pin|otp|secret|token|credentials?)\s*[:=]\s*["']?[^\s"']+/i,
] as const;

export type CampaignPrincipalRole =
  | (typeof PRINCIPAL_ROLES)[keyof typeof PRINCIPAL_ROLES]
  | typeof SPECIALIZED_EVALUATOR_ROLE;

export interface CampaignPrincipal {
  role: CampaignPrincipalRole;
  session_id: string;
  subject: string;
}

export interface CampaignIdentityEnvelope {
  schema_version: 2;
  operator: CampaignPrincipal;
  specialized_evaluator: CampaignPrincipal | null;
  evaluator: CampaignPrincipal;
  aggregator: CampaignPrincipal;
  target: CampaignPrincipal;
  simulator: CampaignPrincipal;
  recovery: CampaignPrincipal;
}

interface LegacyCampaignIdentityEnvelope
  extends Omit<CampaignIdentityEnvelope, "schema_version" | "specialized_evaluator"> {}

export interface CampaignLease {
  lease_id: string;
  owner_session_id: string;
  acquired_at: string;
  expires_at: string;
  recovery_mode: "FINALIZE_UNKNOWN_OUTCOME";
}

export interface CampaignLeaseState extends CampaignLease {
  schema_version: typeof CAMPAIGN_ARTIFACT_SCHEMA_VERSION;
  artifact_type: "campaign-run-lease";
  run_id: string;
  generation: number;
  renewed_at: string;
}

interface LegacyCampaignLeaseState extends CampaignLease {
  schema_version: typeof LEGACY_CAMPAIGN_ARTIFACT_SCHEMA_VERSION;
  artifact_type: "campaign-run-lease";
  run_id: string;
  generation: number;
  renewed_at: string;
}

interface PreviousCampaignLeaseState extends CampaignLease {
  schema_version: typeof PREVIOUS_CAMPAIGN_ARTIFACT_SCHEMA_VERSION;
  artifact_type: "campaign-run-lease";
  run_id: string;
  generation: number;
  renewed_at: string;
}

export interface CampaignLeaseTakeoverReceipt {
  schema_version: typeof CAMPAIGN_ARTIFACT_SCHEMA_VERSION;
  artifact_type: "campaign-lease-takeover";
  run_id: string;
  previous_lease: CampaignLeaseState;
  previous_lease_digest: string;
  previous_generation: number;
  replacement_lease: CampaignLeaseState;
  recovery_identity: CampaignPrincipal;
  reason: string;
  created_at: string;
}

interface CampaignMutationLock {
  schema_version: typeof CAMPAIGN_ARTIFACT_SCHEMA_VERSION;
  artifact_type: "campaign-mutation-lock";
  run_id: string;
  pid: number;
  token: string;
  acquired_at: string;
  owner: CampaignPrincipal | null;
  lease_id: string | null;
  lease_generation: number | null;
  takeover_claim_digest: string | null;
}

interface CampaignMutationLockTakeoverClaim {
  schema_version: typeof CAMPAIGN_ARTIFACT_SCHEMA_VERSION;
  artifact_type: "campaign-mutation-lock-takeover-claim";
  run_id: string;
  previous_lock: CampaignMutationLock;
  previous_lock_digest: string;
  lease_state: CampaignLeaseState;
  lease_state_digest: string;
  lease_generation: number;
  recovery_identity: CampaignPrincipal;
  reason: string;
  quarantined_path: string;
  successor_token: string;
  created_at: string;
}

interface CampaignMutationLockTakeoverReceipt {
  schema_version: typeof CAMPAIGN_ARTIFACT_SCHEMA_VERSION;
  artifact_type: "campaign-mutation-lock-takeover";
  run_id: string;
  previous_lock: CampaignMutationLock;
  previous_lock_digest: string;
  lease_state: CampaignLeaseState;
  lease_state_digest: string;
  lease_generation: number;
  recovery_identity: CampaignPrincipal;
  reason: string;
  quarantined_path: string;
  successor_token: string;
  claim_digest: string;
  quarantined_at: string;
  created_at: string;
}

interface CampaignMutationTakeoverChronologyContext {
  terminal_lock: CampaignTerminalLock | null;
  finalization: CampaignRunFinalization | null;
}

interface CampaignMutationGovernanceSnapshot {
  reservation: ArtifactSnapshot<CampaignRunReservation>;
  lease: ArtifactSnapshot<CampaignLeaseState>;
  claim: ArtifactSnapshot<CampaignMutationLockTakeoverClaim> | null;
  receipt: ArtifactSnapshot<CampaignMutationLockTakeoverReceipt> | null;
  terminal_lock: ArtifactSnapshot<CampaignTerminalLock> | null;
  finalization: ArtifactSnapshot<CampaignRunFinalization> | null;
  active_lock: ArtifactSnapshot<CampaignMutationLock> | null;
  quarantines: ArtifactSnapshot<CampaignMutationLock>[];
}

class TransientCampaignMutationGovernanceChange extends Error {}

export interface CampaignArtifactAuthority {
  principal: CampaignPrincipal;
  lease_id: string | null;
}

export interface CampaignRunReservation {
  schema_version: typeof CAMPAIGN_ARTIFACT_SCHEMA_VERSION;
  artifact_type: "campaign-run-reservation";
  run_id: string;
  campaign_id: string;
  campaign_digest: string;
  attempt: number;
  parent_run_id: string | null;
  reserved_at: string;
  simulation_scope: "harness" | "product";
  claim_ids: string[];
  specialized_evaluation: SpecializedEvaluationDeclaration | null;
  identities: CampaignIdentityEnvelope;
  lease: CampaignLease;
}

interface PreviousCampaignRunReservation
  extends Omit<CampaignRunReservation, "schema_version" | "claim_ids" | "specialized_evaluation"> {
  schema_version: typeof PREVIOUS_CAMPAIGN_ARTIFACT_SCHEMA_VERSION;
}

interface LegacyCampaignRunReservation {
  schema_version: typeof LEGACY_CAMPAIGN_ARTIFACT_SCHEMA_VERSION;
  artifact_type: "campaign-run-reservation";
  run_id: string;
  campaign_id: string;
  campaign_digest: string;
  attempt: number;
  parent_run_id: string | null;
  reserved_at: string;
  identities: LegacyCampaignIdentityEnvelope;
  lease: CampaignLease;
}

type VersionedCampaignRunReservation =
  | CampaignRunReservation
  | PreviousCampaignRunReservation
  | LegacyCampaignRunReservation;

type VersionedCampaignLeaseState =
  | CampaignLeaseState
  | PreviousCampaignLeaseState
  | LegacyCampaignLeaseState;

type CurrentShapeCampaignLeaseState =
  | CampaignLeaseState
  | PreviousCampaignLeaseState;

export interface CampaignArtifactFile {
  path: string;
  sha256: string;
  size: number;
}

export interface FrozenCampaignArtifact extends CampaignArtifactFile {
  source_path: string;
  producer: string;
  platform: string;
  frozen_at: string;
  redaction_profile: "source-code-v1" | "no-secrets-v1";
  redaction_status: "CLEAN";
  lineage: {
    run_id: string;
    source_digest: string;
  };
}

export interface CampaignRunFinalization {
  schema_version: typeof CAMPAIGN_ARTIFACT_SCHEMA_VERSION;
  artifact_type: "campaign-run-finalization";
  run_id: string;
  status: "COMPLETED" | "BLOCKED" | "UNKNOWN_OUTCOME";
  finalized_at: string;
  finalized_by: CampaignPrincipal;
  completed_at: string;
  completed_by: CampaignPrincipal;
  terminal_lock_producer: CampaignPrincipal;
  terminal_lock_digest: string;
  recovery_reason: string | null;
  application_files: CampaignArtifactFile[];
  application_manifest_digest: string;
  post_intent_recovery_files: CampaignArtifactFile[];
  post_intent_recovery_manifest_digest: string;
  files: CampaignArtifactFile[];
  manifest_digest: string;
}

export interface CampaignRecoveryContext {
  interrupted_operations: Array<{
    step_id: string;
    idempotency_key_digest: string;
    dispatch_digest: string | null;
  }>;
  checkpoint_digest: string | null;
}

interface PreviousCampaignRunFinalization
  extends Omit<CampaignRunFinalization, "schema_version"> {
  schema_version: typeof PREVIOUS_CAMPAIGN_ARTIFACT_SCHEMA_VERSION;
}

type CurrentShapeCampaignRunFinalization =
  | CampaignRunFinalization
  | PreviousCampaignRunFinalization;

interface CampaignTerminalLock {
  schema_version: typeof CAMPAIGN_ARTIFACT_SCHEMA_VERSION;
  artifact_type: "campaign-terminal-intent";
  run_id: string;
  status: CampaignRunFinalization["status"];
  produced_at: string;
  produced_by: CampaignPrincipal;
  application_files: CampaignArtifactFile[];
  application_manifest_digest: string;
}

interface PreviousCampaignTerminalLock
  extends Omit<CampaignTerminalLock, "schema_version"> {
  schema_version: typeof PREVIOUS_CAMPAIGN_ARTIFACT_SCHEMA_VERSION;
}

type CurrentShapeCampaignTerminalLock =
  | CampaignTerminalLock
  | PreviousCampaignTerminalLock;

interface LegacyCampaignRunFinalization {
  schema_version: typeof LEGACY_CAMPAIGN_ARTIFACT_SCHEMA_VERSION;
  artifact_type: "campaign-run-finalization";
  run_id: string;
  status: CampaignRunFinalization["status"];
  finalized_at: string;
  finalized_by: CampaignPrincipal;
  recovery_reason: string | null;
  files: CampaignArtifactFile[];
  manifest_digest: string;
}

interface LegacyCampaignTerminalLock {
  schema_version: typeof LEGACY_CAMPAIGN_ARTIFACT_SCHEMA_VERSION;
  run_id: string;
  status: CampaignRunFinalization["status"];
  locked_at: string;
  locked_by: CampaignPrincipal;
}

export interface CampaignArtifactVerification {
  status: "VALID";
  freshness_status: "FRESH" | "STALE" | "NOT_APPLICABLE";
  freshness_reason: string | null;
  run_id: string;
  finalization_status: CampaignRunFinalization["status"];
  file_count: number;
  manifest_digest: string;
}

export interface CampaignArtifactRead<T> {
  record: CampaignArtifactFile;
  bytes: Buffer;
  value: T;
}

export interface VerifiedCampaignArtifactRead<T>
  extends CampaignArtifactRead<T> {
  verification: CampaignArtifactVerification;
}

export interface ReserveCampaignRunInput {
  campaign_id: string;
  campaign_digest: string;
  attempt: number;
  parent_run_id?: string | null;
  simulation_scope: "harness" | "product";
  claim_ids: string[];
  specialized_evaluation: SpecializedEvaluationDeclaration | null;
  identities: CampaignIdentityEnvelope;
  lease: CampaignLease;
}

export interface FreezeCampaignFileInput {
  source_path: string;
  namespace: string;
  producer: string;
  platform: string;
  redaction_profile: "source-code-v1" | "no-secrets-v1";
  max_bytes?: number;
}

function requireNonEmpty(name: string, value: string): void {
  if (!value.trim()) throw new CascadeError(`${name} must be non-empty`);
}

function requireRfc3339Instant(name: string, value: unknown): string {
  if (typeof value !== "string" || parseRfc3339Instant(value) === null) {
    throw new CascadeError(`${name} must be a valid RFC 3339 instant`);
  }
  return value;
}

function validateSimulationScope(
  value: unknown,
): asserts value is "harness" | "product" {
  if (value !== "harness" && value !== "product") {
    throw new CascadeError(
      "campaign simulation_scope must be exactly harness or product",
    );
  }
}

function validateSpecializedEvaluationDeclaration(
  value: unknown,
  scope: "harness" | "product",
): asserts value is SpecializedEvaluationDeclaration | null {
  if (scope === "product") {
    if (value !== null) {
      throw new CascadeError("product campaign specialized_evaluation must be null");
    }
    return;
  }
  const declaration = requireExactOwnDataObject(
    value,
    "campaign specialized_evaluation",
    ["applicability", "route_ids", "trace_ids", "claim_ids", "reason"],
  );
  if (!new Set(["REQUIRED", "NOT_APPLICABLE"]).has(String(declaration.applicability))) {
    throw new CascadeError("campaign specialized_evaluation applicability is invalid");
  }
  for (const field of ["route_ids", "trace_ids", "claim_ids"] as const) {
    const items = declaration[field];
    if (
      !Array.isArray(items) ||
      items.some((item) => typeof item !== "string" || !item) ||
      new Set(items).size !== items.length
    ) {
      throw new CascadeError(`campaign specialized_evaluation ${field} is invalid`);
    }
  }
  if (typeof declaration.reason !== "string" || !declaration.reason) {
    throw new CascadeError("campaign specialized_evaluation reason is invalid");
  }
  const count = (declaration.route_ids as string[]).length +
    (declaration.trace_ids as string[]).length +
    (declaration.claim_ids as string[]).length;
  if (declaration.applicability === "REQUIRED" && count < 3) {
    throw new CascadeError("REQUIRED specialized evaluation needs route, trace, and claim IDs");
  }
  if (declaration.applicability === "NOT_APPLICABLE" && count !== 0) {
    throw new CascadeError("NOT_APPLICABLE specialized evaluation must not name routes, traces, or claims");
  }
}

function compareRequiredRfc3339Instants(
  leftName: string,
  left: unknown,
  rightName: string,
  right: unknown,
): -1 | 0 | 1 {
  const comparison = compareRfc3339Instants(
    requireRfc3339Instant(leftName, left),
    requireRfc3339Instant(rightName, right),
  );
  if (comparison === null) {
    throw new CascadeError("validated RFC 3339 instants could not be compared");
  }
  return comparison;
}

function normalizePrincipal(
  value: unknown,
  label: string,
): CampaignPrincipal {
  const record = requireExactOwnDataObject(
    value,
    label,
    ["role", "session_id", "subject"],
  );
  if (
    typeof record.role !== "string" ||
    ![...Object.values(PRINCIPAL_ROLES), SPECIALIZED_EVALUATOR_ROLE].includes(
      record.role as CampaignPrincipalRole,
    ) ||
    typeof record.session_id !== "string" ||
    !record.session_id.trim() ||
    typeof record.subject !== "string" ||
    !record.subject.trim()
  ) {
    throw new CascadeError(`${label} is invalid`);
  }
  return {
    role: record.role as CampaignPrincipalRole,
    session_id: record.session_id,
    subject: record.subject,
  };
}

function normalizeIdentities(
  identities: unknown,
  simulationScope: "harness" | "product",
): CampaignIdentityEnvelope {
  const identityRecord = requireExactOwnDataObject(
    identities,
    "campaign identity envelope",
    [
      "schema_version",
      "operator",
      "specialized_evaluator",
      "evaluator",
      "aggregator",
      "target",
      "simulator",
      "recovery",
    ],
  );
  if (identityRecord.schema_version !== 2) {
    throw new CascadeError("campaign identity envelope must use schema version 2");
  }
  const current = {
    schema_version: 2,
    operator: normalizePrincipal(identityRecord.operator, "operator"),
    specialized_evaluator: identityRecord.specialized_evaluator === null
      ? null
      : normalizePrincipal(
        identityRecord.specialized_evaluator,
        "specialized_evaluator",
      ),
    evaluator: normalizePrincipal(identityRecord.evaluator, "evaluator"),
    aggregator: normalizePrincipal(identityRecord.aggregator, "aggregator"),
    target: normalizePrincipal(identityRecord.target, "target"),
    simulator: normalizePrincipal(identityRecord.simulator, "simulator"),
    recovery: normalizePrincipal(identityRecord.recovery, "recovery"),
  } satisfies CampaignIdentityEnvelope;
  const sessionIds = new Set<string>();
  const subjects = new Set<string>();
  for (const [name, expectedRole] of Object.entries(PRINCIPAL_ROLES)) {
    const principal = current[name as keyof typeof PRINCIPAL_ROLES];
    if (principal.role !== expectedRole) {
      throw new CascadeError(
        `${name} identity must use role ${expectedRole}, got ${principal.role}`,
      );
    }
    requireNonEmpty(`${name}.session_id`, principal.session_id);
    requireNonEmpty(`${name}.subject`, principal.subject);
    if (sessionIds.has(principal.session_id)) {
      throw new CascadeError(
        `campaign role sessions must be pairwise distinct: ${principal.session_id}`,
      );
    }
    sessionIds.add(principal.session_id);
    if (subjects.has(principal.subject)) {
      throw new CascadeError(`campaign role subjects must be pairwise distinct: ${principal.subject}`);
    }
    subjects.add(principal.subject);
  }
  if (current.specialized_evaluator !== null) {
    const principal = current.specialized_evaluator;
    if (principal.role !== SPECIALIZED_EVALUATOR_ROLE) {
      throw new CascadeError(`specialized_evaluator identity must use role ${SPECIALIZED_EVALUATOR_ROLE}`);
    }
    requireNonEmpty("specialized_evaluator.session_id", principal.session_id);
    requireNonEmpty("specialized_evaluator.subject", principal.subject);
    if (sessionIds.has(principal.session_id) || subjects.has(principal.subject)) {
      throw new CascadeError("specialized evaluator identity must be distinct from every campaign role");
    }
  }
  if ((simulationScope === "harness") !== (current.specialized_evaluator !== null)) {
    throw new CascadeError(
      `campaign ${simulationScope} scope requires specialized_evaluator ${simulationScope === "harness" ? "identity" : "to be null"}`,
    );
  }
  return current;
}

function normalizeLease(value: unknown): CampaignLease {
  const lease = requireExactOwnDataObject(
    value,
    "campaign lease",
    ["lease_id", "owner_session_id", "acquired_at", "expires_at", "recovery_mode"],
  );
  if (
    typeof lease.lease_id !== "string" ||
    typeof lease.owner_session_id !== "string" ||
    typeof lease.acquired_at !== "string" ||
    typeof lease.expires_at !== "string" ||
    lease.recovery_mode !== "FINALIZE_UNKNOWN_OUTCOME"
  ) {
    throw new CascadeError("campaign lease is invalid");
  }
  requireNonEmpty("lease.lease_id", lease.lease_id);
  requireNonEmpty("lease.owner_session_id", lease.owner_session_id);
  if (
    compareRequiredRfc3339Instants(
      "lease.expires_at",
      lease.expires_at,
      "lease.acquired_at",
      lease.acquired_at,
    ) <= 0
  ) {
    throw new CascadeError("campaign lease must expire after it is acquired");
  }
  return {
    lease_id: lease.lease_id,
    owner_session_id: lease.owner_session_id,
    acquired_at: lease.acquired_at,
    expires_at: lease.expires_at,
    recovery_mode: lease.recovery_mode,
  };
}

function validateLease(lease: CampaignLease): void {
  requireNonEmpty("lease.lease_id", lease.lease_id);
  requireNonEmpty("lease.owner_session_id", lease.owner_session_id);
  if (
    lease.recovery_mode !== "FINALIZE_UNKNOWN_OUTCOME" ||
    compareRequiredRfc3339Instants(
      "lease.expires_at",
      lease.expires_at,
      "lease.acquired_at",
      lease.acquired_at,
    ) <= 0
  ) {
    throw new CascadeError("campaign lease must expire after it is acquired");
  }
}

function validateMutationLock(
  value: unknown,
  runId: string,
): asserts value is CampaignMutationLock {
  const invalid = () =>
    new CascadeError(`campaign mutation lock is invalid: ${runId}`);
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw invalid();
  }
  const lock = value as CampaignMutationLock;
  if (
    Object.keys(lock).sort().join(",") !==
      "acquired_at,artifact_type,lease_generation,lease_id,owner,pid,run_id,schema_version,takeover_claim_digest,token" ||
    lock.schema_version !== CAMPAIGN_ARTIFACT_SCHEMA_VERSION ||
    lock.artifact_type !== "campaign-mutation-lock" ||
    lock.run_id !== runId ||
    !Number.isInteger(lock.pid) ||
    lock.pid < 1 ||
    typeof lock.token !== "string" ||
    !lock.token.trim() ||
    parseRfc3339Instant(lock.acquired_at) === null ||
    (lock.lease_id !== null &&
      (typeof lock.lease_id !== "string" || !lock.lease_id.trim())) ||
    (lock.lease_generation !== null &&
      (!Number.isInteger(lock.lease_generation) || lock.lease_generation < 0)) ||
    (lock.takeover_claim_digest !== null &&
      !/^[a-f0-9]{64}$/.test(lock.takeover_claim_digest))
  ) {
    throw invalid();
  }
  if (lock.owner !== null) {
    try {
      validatePrincipal(lock.owner, "campaign mutation lock owner");
    } catch {
      throw invalid();
    }
  }
}

function validateMutationLockTakeoverClaim(
  value: unknown,
  runId: string,
  reservation: CampaignRunReservation,
): asserts value is CampaignMutationLockTakeoverClaim {
  const invalid = () =>
    new CascadeError(`campaign mutation lock takeover claim is invalid: ${runId}`);
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw invalid();
  }
  const claim = value as CampaignMutationLockTakeoverClaim;
  if (
    Object.keys(claim).sort().join(",") !==
      "artifact_type,created_at,lease_generation,lease_state,lease_state_digest,previous_lock,previous_lock_digest,quarantined_path,reason,recovery_identity,run_id,schema_version,successor_token"
  ) {
    throw invalid();
  }
  validateMutationLock(claim.previous_lock, runId);
  try {
    validateLeaseStateContract(
      claim.lease_state,
      runId,
      CAMPAIGN_ARTIFACT_SCHEMA_VERSION,
    );
    validatePrincipal(
      claim.recovery_identity,
      "campaign mutation lock takeover recovery identity",
    );
  } catch {
    throw invalid();
  }
  if (
    claim.schema_version !== CAMPAIGN_ARTIFACT_SCHEMA_VERSION ||
    claim.artifact_type !== "campaign-mutation-lock-takeover-claim" ||
    claim.run_id !== runId ||
    claim.previous_lock_digest !== sha256Text(stableJson(claim.previous_lock)) ||
    claim.lease_state_digest !== sha256Text(stableJson(claim.lease_state)) ||
    claim.lease_generation !== claim.lease_state.generation ||
    claim.previous_lock.lease_generation !== claim.lease_generation ||
    stableJson(claim.recovery_identity) !==
      stableJson(reservation.identities.recovery) ||
    typeof claim.reason !== "string" ||
    !claim.reason.trim() ||
    typeof claim.quarantined_path !== "string" ||
    !claim.quarantined_path.trim() ||
    typeof claim.successor_token !== "string" ||
    !claim.successor_token.trim() ||
    parseRfc3339Instant(claim.created_at) === null
  ) {
    throw invalid();
  }
  const operatorOwned =
    stableJson(claim.previous_lock.owner) ===
    stableJson(reservation.identities.operator);
  const recoveryOwned =
    stableJson(claim.previous_lock.owner) ===
    stableJson(reservation.identities.recovery);
  if (
    (!operatorOwned && !recoveryOwned) ||
    (operatorOwned && claim.previous_lock.lease_id !== claim.lease_state.lease_id) ||
    (recoveryOwned && claim.previous_lock.lease_id !== null) ||
    compareRequiredRfc3339Instants(
      "campaign mutation lock takeover claim creation",
      claim.created_at,
      "campaign lease expiry",
      claim.lease_state.expires_at,
    ) < 0
  ) {
    throw new CascadeError(
      `campaign mutation lock takeover claim has invalid identity, lease binding, or chronology: ${runId}`,
    );
  }
}

function validateMutationLockTakeoverReceipt(
  value: unknown,
  runId: string,
  reservation: CampaignRunReservation,
): asserts value is CampaignMutationLockTakeoverReceipt {
  const invalid = () =>
    new CascadeError(`campaign mutation lock takeover receipt is invalid: ${runId}`);
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw invalid();
  }
  const receipt = value as CampaignMutationLockTakeoverReceipt;
  if (
    Object.keys(receipt).sort().join(",") !==
      "artifact_type,claim_digest,created_at,lease_generation,lease_state,lease_state_digest,previous_lock,previous_lock_digest,quarantined_at,quarantined_path,reason,recovery_identity,run_id,schema_version,successor_token"
  ) {
    throw invalid();
  }
  validateMutationLock(receipt.previous_lock, runId);
  try {
    validateLeaseStateContract(
      receipt.lease_state,
      runId,
      CAMPAIGN_ARTIFACT_SCHEMA_VERSION,
    );
    validatePrincipal(
      receipt.recovery_identity,
      "campaign mutation lock takeover recovery identity",
    );
  } catch {
    throw invalid();
  }
  if (
    receipt.schema_version !== CAMPAIGN_ARTIFACT_SCHEMA_VERSION ||
    receipt.artifact_type !== "campaign-mutation-lock-takeover" ||
    receipt.run_id !== runId ||
    receipt.previous_lock_digest !==
      sha256Text(stableJson(receipt.previous_lock)) ||
    receipt.lease_state_digest !== sha256Text(stableJson(receipt.lease_state)) ||
    receipt.lease_generation !== receipt.lease_state.generation ||
    receipt.previous_lock.lease_generation !== receipt.lease_generation ||
    stableJson(receipt.recovery_identity) !==
      stableJson(reservation.identities.recovery) ||
    typeof receipt.reason !== "string" ||
    !receipt.reason.trim() ||
    typeof receipt.quarantined_path !== "string" ||
    !receipt.quarantined_path.trim() ||
    typeof receipt.successor_token !== "string" ||
    !receipt.successor_token.trim() ||
    !/^[a-f0-9]{64}$/.test(receipt.claim_digest) ||
    parseRfc3339Instant(receipt.quarantined_at) === null ||
    parseRfc3339Instant(receipt.created_at) === null
  ) {
    throw invalid();
  }
  const operatorOwned =
    stableJson(receipt.previous_lock.owner) ===
    stableJson(reservation.identities.operator);
  const recoveryOwned =
    stableJson(receipt.previous_lock.owner) ===
    stableJson(reservation.identities.recovery);
  if (
    (!operatorOwned && !recoveryOwned) ||
    (operatorOwned &&
      receipt.previous_lock.lease_id !== receipt.lease_state.lease_id) ||
    (recoveryOwned && receipt.previous_lock.lease_id !== null) ||
    compareRequiredRfc3339Instants(
      "campaign mutation lock takeover claim creation",
      receipt.created_at,
      "campaign lease expiry",
      receipt.lease_state.expires_at,
    ) < 0 ||
    compareRequiredRfc3339Instants(
      "campaign mutation lock quarantine",
      receipt.quarantined_at,
      "campaign mutation lock takeover claim creation",
      receipt.created_at,
    ) < 0
  ) {
    throw new CascadeError(
      `campaign mutation lock takeover receipt has invalid identity, lease binding, or chronology: ${runId}`,
    );
  }
}

function mutationTakeoverClaimFromReceipt(
  receipt: CampaignMutationLockTakeoverReceipt,
): CampaignMutationLockTakeoverClaim {
  const {
    artifact_type: _receiptType,
    claim_digest: _claimDigest,
    quarantined_at: _quarantinedAt,
    ...claimFields
  } = receipt;
  return {
    ...claimFields,
    artifact_type: "campaign-mutation-lock-takeover-claim",
  };
}

function validateMutationTakeoverReconciliationChronology(
  claim: CampaignMutationLockTakeoverClaim,
  receipt: CampaignMutationLockTakeoverReceipt | null,
  reconciliationBoundary: string | null,
  context: CampaignMutationTakeoverChronologyContext,
): void {
  if (
    (reconciliationBoundary !== null &&
      (compareRequiredRfc3339Instants(
        "campaign mutation lock takeover claim creation",
        claim.created_at,
        "campaign mutation lock reconciliation boundary",
        reconciliationBoundary,
      ) > 0 ||
        (receipt !== null &&
          compareRequiredRfc3339Instants(
            "campaign mutation lock quarantine",
            receipt.quarantined_at,
            "campaign mutation lock reconciliation boundary",
            reconciliationBoundary,
          ) > 0))) ||
    (context.terminal_lock !== null &&
      compareRequiredRfc3339Instants(
        "campaign mutation lock takeover claim creation",
        claim.created_at,
        "campaign terminal lock production",
        context.terminal_lock.produced_at,
      ) < 0) ||
    (context.finalization !== null &&
      (compareRequiredRfc3339Instants(
        "campaign mutation lock takeover claim creation",
        claim.created_at,
        "campaign finalization completion",
        context.finalization.completed_at,
      ) > 0 ||
        (receipt !== null &&
          compareRequiredRfc3339Instants(
            "campaign mutation lock quarantine",
            receipt.quarantined_at,
            "campaign finalization completion",
            context.finalization.completed_at,
          ) > 0)))
  ) {
    throw new CascadeError(
      `campaign mutation lock takeover chronology exceeds its reconciliation, terminal, or finalization boundary: ${claim.run_id}`,
    );
  }
}

function assertSafeRunId(runId: string): void {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(runId)) {
    throw new CascadeError(`invalid campaign run id: ${runId}`);
  }
}

function normalizedRelative(root: string, path: string): string {
  return relative(root, path).split(sep).join("/");
}

function scanForSecrets(
  bytes: Uint8Array,
  profile: FreezeCampaignFileInput["redaction_profile"],
  sensitiveValues: readonly string[] = [],
): void {
  const text = new TextDecoder("latin1").decode(bytes);
  const patterns =
    profile === "no-secrets-v1"
      ? EVIDENCE_SECRET_PATTERNS
      : SECRET_PATTERNS;
  if (
    patterns.some((pattern) => pattern.test(text)) ||
    sensitiveValues.some((value) => value.length > 0 && text.includes(value))
  ) {
    throw new CascadeError(
      `artifact blocked by redaction profile ${profile}: secret-like material detected`,
    );
  }
}

function isAllowedSystemAlias(path: string): boolean {
  return process.platform === "darwin" && new Set(["/var", "/tmp", "/etc"]).has(path);
}

async function assertNoSymlinkAncestors(
  path: string,
  label: string,
): Promise<void> {
  let current = resolve(path);
  while (current !== dirname(current)) {
    const metadata = await lstat(current).catch(() => null);
    if (
      metadata?.isSymbolicLink() &&
      !isAllowedSystemAlias(current)
    ) {
      throw new CascadeError(`${label} has a symbolic-link ancestor: ${current}`);
    }
    current = dirname(current);
  }
}

interface BoundedFileIdentity {
  dev: number;
  ino: number;
  size: number;
  mtime_ms: number;
  ctime_ms: number;
  mode: number;
}

interface BoundedFileSnapshot {
  bytes: Buffer;
  identity: BoundedFileIdentity;
}

type BoundedFileReadCheckpoint = (
  phase: "opened",
  path: string,
) => Promise<void>;

async function assertOpenedFileContained(
  path: string,
  fileDescriptor: number,
  canonicalRoot: string,
  label: string,
): Promise<void> {
  await assertNoSymlinkAncestors(path, label);
  let canonicalFile: string | null = null;
  for (const descriptorPath of [
    `/proc/self/fd/${fileDescriptor}`,
    `/dev/fd/${fileDescriptor}`,
  ]) {
    try {
      canonicalFile = await realpath(descriptorPath);
      break;
    } catch {
      // Platform-specific descriptor paths are not available everywhere.
    }
  }
  if (canonicalFile === null) {
    canonicalFile = await realpath(path).catch(() => null);
  }
  if (
    canonicalFile === null ||
    (canonicalFile !== canonicalRoot &&
      !canonicalFile.startsWith(`${canonicalRoot}${sep}`))
  ) {
    throw new CascadeError(`${label} escapes its physical root after open`);
  }
}

async function readBoundedFileSnapshot(
  path: string,
  label: string,
  maxBytes = DEFAULT_EVIDENCE_LIMIT_BYTES,
  physicalRoot = dirname(path),
  checkpoint?: BoundedFileReadCheckpoint,
): Promise<BoundedFileSnapshot> {
  if (!Number.isInteger(maxBytes) || maxBytes < 1) {
    throw new CascadeError(`${label} byte limit must be a positive integer`);
  }
  const absolute = resolve(path);
  const root = resolve(physicalRoot);
  if (absolute === root || !absolute.startsWith(`${root}${sep}`)) {
    throw new CascadeError(`${label} escapes its physical root`);
  }
  await assertNoSymlinkAncestors(absolute, label);
  const canonicalRoot = await realpath(root).catch(() => null);
  if (canonicalRoot === null) {
    throw new CascadeError(`${label} physical root is missing or invalid`);
  }
  let handle;
  try {
    handle = await open(
      absolute,
      constants.O_RDONLY | constants.O_NONBLOCK | constants.O_NOFOLLOW,
    );
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      ["ENXIO", "ENODEV", "EOPNOTSUPP"].includes(String(error.code))
    ) {
      throw new CascadeError(`${label} must be a regular file`);
    }
    throw error;
  }
  try {
    const before = await handle.stat();
    if (!before.isFile()) {
      throw new CascadeError(`${label} must be a regular file`);
    }
    if ((before.mode & 0o077) !== 0) {
      throw new CascadeError(
        `${label} must use maintainers-only file permissions`,
      );
    }
    if (before.size > maxBytes) {
      throw new CascadeError(`${label} exceeds ${maxBytes} bytes`);
    }
    await checkpoint?.("opened", absolute);
    await assertOpenedFileContained(
      absolute,
      handle.fd,
      canonicalRoot,
      label,
    );
    const bounded = Buffer.alloc(maxBytes + 1);
    let offset = 0;
    while (offset < bounded.byteLength) {
      const chunk = await handle.read(
        bounded,
        offset,
        bounded.byteLength - offset,
        offset,
      );
      if (chunk.bytesRead === 0) break;
      offset += chunk.bytesRead;
    }
    if (offset > maxBytes) {
      throw new CascadeError(`${label} exceeds ${maxBytes} bytes while being read`);
    }
    const after = await handle.stat();
    if (
      !after.isFile() ||
      after.dev !== before.dev ||
      after.ino !== before.ino ||
      after.size !== before.size ||
      after.mtimeMs !== before.mtimeMs ||
      after.ctimeMs !== before.ctimeMs ||
      (after.mode & 0o077) !== 0
    ) {
      throw new CascadeError(
        `${label} changed identity or permissions while being read`,
      );
    }
    await assertOpenedFileContained(
      absolute,
      handle.fd,
      canonicalRoot,
      label,
    );
    const current = await lstat(absolute).catch(() => null);
    if (
      !current?.isFile() ||
      current.isSymbolicLink() ||
      current.dev !== before.dev ||
      current.ino !== before.ino ||
      current.size !== before.size ||
      current.mtimeMs !== before.mtimeMs ||
      current.ctimeMs !== before.ctimeMs ||
      (current.mode & 0o077) !== 0
    ) {
      throw new CascadeError(
        `${label} changed identity or permissions while being read`,
      );
    }
    return {
      bytes: bounded.subarray(0, offset),
      identity: {
        dev: before.dev,
        ino: before.ino,
        size: before.size,
        mtime_ms: before.mtimeMs,
        ctime_ms: before.ctimeMs,
        mode: before.mode,
      },
    };
  } finally {
    await handle.close();
  }
}

async function readBoundedFile(
  path: string,
  label: string,
  maxBytes = DEFAULT_EVIDENCE_LIMIT_BYTES,
  physicalRoot = dirname(path),
  checkpoint?: BoundedFileReadCheckpoint,
): Promise<Buffer> {
  return (
    await readBoundedFileSnapshot(
      path,
      label,
      maxBytes,
      physicalRoot,
      checkpoint,
    )
  ).bytes;
}

async function readBoundedStructuredText(
  path: string,
  label: string,
  maxBytes = DEFAULT_EVIDENCE_LIMIT_BYTES,
  physicalRoot = dirname(path),
  checkpoint?: BoundedFileReadCheckpoint,
): Promise<string> {
  return (
    await readBoundedFile(path, label, maxBytes, physicalRoot, checkpoint)
  ).toString("utf8");
}

async function readBoundedStructuredJson<T>(
  path: string,
  label: string,
  maxBytes = DEFAULT_EVIDENCE_LIMIT_BYTES,
  physicalRoot = dirname(path),
  checkpoint?: BoundedFileReadCheckpoint,
): Promise<T> {
  const text = await readBoundedStructuredText(
    path,
    label,
    maxBytes,
    physicalRoot,
    checkpoint,
  );
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new CascadeError(`${label} is invalid JSON`);
  }
}

interface ArtifactSnapshot<T> extends CampaignArtifactRead<T> {
  identity: BoundedFileIdentity;
}

async function readArtifactJsonSnapshot<T>(
  recordRoot: string,
  path: string,
  label: string,
  maxBytes = DEFAULT_EVIDENCE_LIMIT_BYTES,
  checkpoint?: BoundedFileReadCheckpoint,
  physicalRoot = recordRoot,
): Promise<ArtifactSnapshot<T>> {
  const snapshot = await readBoundedFileSnapshot(
    path,
    label,
    maxBytes,
    physicalRoot,
    checkpoint,
  );
  let value: T;
  try {
    value = JSON.parse(snapshot.bytes.toString("utf8")) as T;
  } catch {
    throw new CascadeError(`${label} is invalid JSON`);
  }
  return {
    bytes: snapshot.bytes,
    identity: snapshot.identity,
    record: {
      path: normalizedRelative(recordRoot, path),
      sha256: sha256Bytes(snapshot.bytes),
      size: snapshot.bytes.byteLength,
    },
    value,
  };
}

async function syncDirectory(path: string): Promise<void> {
  const handle = await open(path, constants.O_RDONLY);
  try {
    await handle.sync();
  } finally {
    await handle.close();
  }
}

async function writeDurableJsonExclusive(
  path: string,
  value: unknown,
): Promise<void> {
  const temporary = `${path}.tmp-${crypto.randomUUID()}`;
  const handle = await open(
    temporary,
    constants.O_WRONLY |
      constants.O_CREAT |
      constants.O_EXCL |
      constants.O_NOFOLLOW,
    ARTIFACT_FILE_MODE,
  );
  try {
    await handle.writeFile(`${stableJson(value, true)}\n`, "utf8");
    await handle.sync();
  } finally {
    await handle.close();
  }
  try {
    await link(temporary, path);
    await syncDirectory(dirname(path));
  } finally {
    await unlink(temporary).catch(() => undefined);
  }
}

async function renameDurably(source: string, target: string): Promise<void> {
  await rename(source, target);
  await syncDirectory(dirname(source));
  if (dirname(target) !== dirname(source)) await syncDirectory(dirname(target));
}

async function unlinkDurably(path: string): Promise<void> {
  await unlink(path);
  await syncDirectory(dirname(path));
}

function boundedStructuredJson(
  value: unknown,
  label: string,
  options: {
    max_bytes?: number;
    pretty?: boolean;
  } = {},
): string {
  const maxBytes = options.max_bytes ?? DEFAULT_EVIDENCE_LIMIT_BYTES;
  const serialized = stableJson(value, options.pretty ?? false);
  const persistedBytes =
    Buffer.byteLength(serialized, "utf8") + (options.pretty ? 1 : 0);
  if (persistedBytes > maxBytes) {
    throw new CascadeError(`${label} exceeds ${maxBytes} bytes`);
  }
  return serialized;
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new CascadeError(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function requireExactOwnDataObject(
  value: unknown,
  label: string,
  expectedKeys: readonly string[],
  optionalKeys: readonly string[] = [],
): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new CascadeError(`${label} is invalid`);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new CascadeError(`${label} is invalid`);
  }
  // Capture descriptors once and only read the resulting plain snapshot.
  // This prevents stateful proxies or accessors from changing semantics after
  // validation and before persistence.
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const ownKeys = Reflect.ownKeys(descriptors);
  const presentKeys = ownKeys.filter((key): key is string => typeof key === "string");
  if (
    ownKeys.some((key) => typeof key !== "string") ||
    expectedKeys.some((key) => !presentKeys.includes(key)) ||
    presentKeys.some((key) => !expectedKeys.includes(key) && !optionalKeys.includes(key))
  ) {
    throw new CascadeError(`${label} is invalid`);
  }
  const snapshot: Record<string, unknown> = {};
  for (const key of presentKeys) {
    const descriptor = descriptors[key];
    if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) {
      throw new CascadeError(`${label} is invalid`);
    }
    Object.defineProperty(snapshot, key, {
      value: descriptor.value,
      enumerable: true,
      configurable: true,
      writable: true,
    });
  }
  return snapshot;
}

function assertIdentity(
  value: Record<string, unknown>,
  reservation: CampaignRunReservation,
  label: string,
): void {
  if (
    value.run_id !== reservation.run_id ||
    value.campaign_id !== reservation.campaign_id
  ) {
    throw new CascadeError(`${label} identity does not match the reservation`);
  }
}

function sha256Bytes(bytes: Uint8Array): string {
  const hasher = new Bun.CryptoHasher("sha256");
  hasher.update(bytes);
  return hasher.digest("hex");
}

async function fileRecord(
  root: string,
  path: string,
): Promise<CampaignArtifactFile> {
  const bytes = await readBoundedFile(
    path,
    `campaign artifact ${relative(root, path)}`,
  );
  return {
    path: normalizedRelative(root, path),
    sha256: sha256Bytes(bytes),
    size: bytes.byteLength,
  };
}

function validateArtifactFileRecords(
  value: unknown,
  label: string,
): asserts value is CampaignArtifactFile[] {
  if (!Array.isArray(value)) {
    throw new CascadeError(`${label} must be an array`);
  }
  const paths = new Set<string>();
  for (const [index, record] of value.entries()) {
    if (
      !record ||
      typeof record !== "object" ||
      Array.isArray(record) ||
      Object.keys(record).sort().join(",") !== "path,sha256,size" ||
      typeof record.path !== "string" ||
      !record.path.trim() ||
      record.path.startsWith("/") ||
      record.path.split("/").some((part) => part === ".." || part === "") ||
      typeof record.sha256 !== "string" ||
      !/^[a-f0-9]{64}$/.test(record.sha256) ||
      !Number.isInteger(record.size) ||
      record.size < 0
    ) {
      throw new CascadeError(`${label} contains an invalid record at index ${index}`);
    }
    if (paths.has(record.path)) {
      throw new CascadeError(`${label} contains duplicate path ${record.path}`);
    }
    paths.add(record.path);
  }
}

function isDateTime(value: unknown): value is string {
  return typeof value === "string" && parseRfc3339Instant(value) !== null;
}

function validatePrincipal(
  value: unknown,
  label: string,
): asserts value is CampaignPrincipal {
  normalizePrincipal(value, label);
}

function validateIdentityEnvelopeContract(
  value: unknown,
  label: string,
  allowLegacy = false,
): asserts value is CampaignIdentityEnvelope | LegacyCampaignIdentityEnvelope {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new CascadeError(`${label} is invalid`);
  }
  const ownKeys = Reflect.ownKeys(value);
  if (ownKeys.some((key) => typeof key !== "string")) {
    throw new CascadeError(`${label} is invalid`);
  }
  const legacy = !Object.prototype.hasOwnProperty.call(value, "schema_version");
  const identities = requireExactOwnDataObject(
    value,
    label,
    legacy
      ? ["operator", "evaluator", "aggregator", "target", "simulator", "recovery"]
      : [
        "schema_version",
        "operator",
        "specialized_evaluator",
        "evaluator",
        "aggregator",
        "target",
        "simulator",
        "recovery",
      ],
  ) as unknown as CampaignIdentityEnvelope;
  if ((legacy && !allowLegacy) || (!legacy && identities.schema_version !== 2)) {
    throw new CascadeError(`${label} is invalid`);
  }
  const sessionIds = new Set<string>();
  const subjects = new Set<string>();
  for (const [name, expectedRole] of Object.entries(PRINCIPAL_ROLES)) {
    const principal = identities[name as keyof typeof PRINCIPAL_ROLES];
    validatePrincipal(principal, `${label}.${name}`);
    if (principal.role !== expectedRole || sessionIds.has(principal.session_id) || subjects.has(principal.subject)) {
      throw new CascadeError(`${label}.${name} is invalid`);
    }
    sessionIds.add(principal.session_id);
    subjects.add(principal.subject);
  }
  if (!legacy && identities.specialized_evaluator) {
    const principal = identities.specialized_evaluator;
    validatePrincipal(principal, `${label}.specialized_evaluator`);
    if (principal.role !== SPECIALIZED_EVALUATOR_ROLE || sessionIds.has(principal.session_id) || subjects.has(principal.subject)) {
      throw new CascadeError(`${label}.specialized_evaluator is invalid`);
    }
  }
}

function validateLeaseFields(
  value: unknown,
  label: string,
): asserts value is CampaignLease {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new CascadeError(`${label} is invalid`);
  }
  const lease = value as CampaignLease;
  if (
    typeof lease.lease_id !== "string" ||
    !lease.lease_id.trim() ||
    typeof lease.owner_session_id !== "string" ||
    !lease.owner_session_id.trim() ||
    parseRfc3339Instant(lease.acquired_at) === null ||
    parseRfc3339Instant(lease.expires_at) === null ||
    lease.recovery_mode !== "FINALIZE_UNKNOWN_OUTCOME" ||
    compareRfc3339Instants(lease.expires_at, lease.acquired_at)! <= 0
  ) {
    throw new CascadeError(`${label} is invalid`);
  }
}

function validateEmbeddedLeaseContract(
  value: unknown,
  label: string,
): asserts value is CampaignLease {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.keys(value).sort().join(",") !==
      "acquired_at,expires_at,lease_id,owner_session_id,recovery_mode"
  ) {
    throw new CascadeError(`${label} is invalid`);
  }
  validateLeaseFields(value, label);
}

function validateReservationContract(
  value: unknown,
  runId: string,
  schemaVersion:
    CampaignArtifactSchemaVersion,
  allowLegacyIdentity = false,
): asserts value is VersionedCampaignRunReservation {
  const invalid = () =>
    new CascadeError(`campaign reservation contract is invalid: ${runId}`);
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw invalid();
  }
  const reservation = value as VersionedCampaignRunReservation;
  const historicalLegacy =
    schemaVersion === LEGACY_CAMPAIGN_ARTIFACT_SCHEMA_VERSION &&
    !("simulation_scope" in reservation);
  const previousCurrent =
    schemaVersion === PREVIOUS_CAMPAIGN_ARTIFACT_SCHEMA_VERSION;
  if (
    Object.keys(reservation).sort().join(",") !==
      (historicalLegacy
        ? "artifact_type,attempt,campaign_digest,campaign_id,identities,lease,parent_run_id,reserved_at,run_id,schema_version"
        : previousCurrent
          ? "artifact_type,attempt,campaign_digest,campaign_id,identities,lease,parent_run_id,reserved_at,run_id,schema_version,simulation_scope"
          : "artifact_type,attempt,campaign_digest,campaign_id,claim_ids,identities,lease,parent_run_id,reserved_at,run_id,schema_version,simulation_scope,specialized_evaluation") ||
    reservation.schema_version !== schemaVersion ||
    reservation.artifact_type !== "campaign-run-reservation" ||
    reservation.run_id !== runId ||
    typeof reservation.campaign_id !== "string" ||
    !reservation.campaign_id.trim() ||
    typeof reservation.campaign_digest !== "string" ||
    !reservation.campaign_digest.trim() ||
    !Number.isInteger(reservation.attempt) ||
    reservation.attempt < 1 ||
    (reservation.parent_run_id !== null &&
      typeof reservation.parent_run_id !== "string") ||
    (schemaVersion === CAMPAIGN_ARTIFACT_SCHEMA_VERSION &&
      ((reservation.attempt === 1 && reservation.parent_run_id !== null) ||
        (reservation.attempt > 1 && reservation.parent_run_id === null) ||
        reservation.parent_run_id === reservation.run_id)) ||
    !isDateTime(reservation.reserved_at) ||
    (!historicalLegacy && !new Set(["harness", "product"]).has((reservation as CampaignRunReservation).simulation_scope))
  ) {
    throw invalid();
  }
  try {
    validateIdentityEnvelopeContract(
      reservation.identities,
      "campaign reservation identities",
      schemaVersion === LEGACY_CAMPAIGN_ARTIFACT_SCHEMA_VERSION || allowLegacyIdentity,
    );
    if (!historicalLegacy && schemaVersion !== LEGACY_CAMPAIGN_ARTIFACT_SCHEMA_VERSION) {
      const current = reservation as CampaignRunReservation;
      if ((current.simulation_scope === "harness") !== (current.identities.specialized_evaluator !== null)) {
        throw new CascadeError("campaign reservation scope and specialized evaluator applicability differ");
      }
      if (schemaVersion === CAMPAIGN_ARTIFACT_SCHEMA_VERSION) {
        if (
          !Array.isArray(current.claim_ids) ||
          !current.claim_ids.length ||
          current.claim_ids.some((claimId) => typeof claimId !== "string" || !claimId) ||
          new Set(current.claim_ids).size !== current.claim_ids.length
        ) {
          throw new CascadeError("campaign reservation claim_ids are invalid");
        }
        validateSpecializedEvaluationDeclaration(
          current.specialized_evaluation,
          current.simulation_scope,
        );
        if (
          current.specialized_evaluation?.claim_ids.some(
            (claimId) => !current.claim_ids.includes(claimId),
          )
        ) {
          throw new CascadeError("specialized evaluation names an unknown campaign claim");
        }
      }
    }
    validateEmbeddedLeaseContract(
      reservation.lease,
      "campaign reservation lease",
    );
  } catch {
    throw invalid();
  }
  if (
    reservation.lease.owner_session_id !==
    reservation.identities.operator.session_id
  ) {
    throw invalid();
  }
}

function validateLeaseStateContract(
  value: unknown,
  runId: string,
  schemaVersion:
    CampaignArtifactSchemaVersion,
): asserts value is VersionedCampaignLeaseState {
  const label =
    schemaVersion === LEGACY_CAMPAIGN_ARTIFACT_SCHEMA_VERSION
      ? "legacy campaign lease state"
      : "campaign lease state";
  const invalid = () => new CascadeError(`${label} is invalid: ${runId}`);
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw invalid();
  }
  const lease = value as VersionedCampaignLeaseState;
  if (
    Object.keys(lease).sort().join(",") !==
      "acquired_at,artifact_type,expires_at,generation,lease_id,owner_session_id,recovery_mode,renewed_at,run_id,schema_version" ||
    lease.schema_version !== schemaVersion ||
    lease.artifact_type !== "campaign-run-lease" ||
    lease.run_id !== runId ||
    !Number.isInteger(lease.generation) ||
    lease.generation < 0 ||
    !isDateTime(lease.renewed_at)
  ) {
    throw invalid();
  }
  try {
    validateLeaseFields(lease, label);
  } catch {
    throw invalid();
  }
}

function validateLeaseTakeoverReceiptContract(
  value: unknown,
  runId: string,
): asserts value is CampaignLeaseTakeoverReceipt {
  const invalid = () =>
    new CascadeError("campaign lease takeover receipt is invalid or mismatched");
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw invalid();
  }
  const receipt = value as CampaignLeaseTakeoverReceipt;
  if (
    Object.keys(receipt).sort().join(",") !==
      "artifact_type,created_at,previous_generation,previous_lease,previous_lease_digest,reason,recovery_identity,replacement_lease,run_id,schema_version" ||
    receipt.schema_version !== CAMPAIGN_ARTIFACT_SCHEMA_VERSION ||
    receipt.artifact_type !== "campaign-lease-takeover" ||
    receipt.run_id !== runId ||
    !/^[a-f0-9]{64}$/.test(receipt.previous_lease_digest) ||
    !Number.isInteger(receipt.previous_generation) ||
    receipt.previous_generation < 0 ||
    typeof receipt.reason !== "string" ||
    !receipt.reason.trim() ||
    !isDateTime(receipt.created_at)
  ) {
    throw invalid();
  }
  try {
    validateLeaseStateContract(
      receipt.previous_lease,
      runId,
      CAMPAIGN_ARTIFACT_SCHEMA_VERSION,
    );
    validateLeaseStateContract(
      receipt.replacement_lease,
      runId,
      CAMPAIGN_ARTIFACT_SCHEMA_VERSION,
    );
    validatePrincipal(
      receipt.recovery_identity,
      "campaign lease takeover recovery identity",
    );
  } catch {
    throw invalid();
  }
}

function provenHeartbeatState(
  previous: CurrentShapeCampaignLeaseState,
  generation: number,
  lifecycle: readonly Record<string, unknown>[],
): { renewed_at: string; expires_at: string } | null {
  if (generation <= previous.generation) return null;
  const heartbeats = lifecycle.filter(
    (event) =>
      event.status === "HEARTBEAT" &&
      event.lease_id === previous.lease_id &&
      typeof event.lease_generation === "number" &&
      event.lease_generation > previous.generation &&
      event.lease_generation <= generation,
  );
  if (heartbeats.length !== generation - previous.generation) {
    return null;
  }
  let priorRenewedAt = previous.renewed_at;
  let priorExpiresAt = previous.expires_at;
  for (const [index, heartbeat] of heartbeats.entries()) {
    const generation = previous.generation + index + 1;
    const heartbeatKeys = Object.keys(heartbeat).sort().join(",");
    const at = parseRfc3339Instant(heartbeat.at);
    const expiresAt = parseRfc3339Instant(heartbeat.expires_at);
    const priorRenewed = parseRfc3339Instant(priorRenewedAt);
    const priorExpires = parseRfc3339Instant(priorExpiresAt);
    if (
      (heartbeatKeys !== "at,expires_at,lease_generation,lease_id,status" &&
        heartbeatKeys !==
          "at,clock_authority,expires_at,lease_generation,lease_id,status") ||
      heartbeat.lease_generation !== generation ||
      at === null ||
      expiresAt === null ||
      priorRenewed === null ||
      priorExpires === null ||
      compareRfc3339Instants(heartbeat.at, priorRenewedAt)! < 0 ||
      compareRfc3339Instants(heartbeat.at, priorExpiresAt)! >= 0 ||
      compareRfc3339Instants(heartbeat.expires_at, priorExpiresAt)! < 0 ||
      compareRfc3339Instants(heartbeat.expires_at, heartbeat.at)! <= 0
    ) {
      return null;
    }
    priorRenewedAt = heartbeat.at as string;
    priorExpiresAt = heartbeat.expires_at as string;
  }
  return { renewed_at: priorRenewedAt, expires_at: priorExpiresAt };
}

function isProvenSameLeaseRenewal(
  previous: CurrentShapeCampaignLeaseState,
  renewed: CurrentShapeCampaignLeaseState,
  lifecycle: readonly Record<string, unknown>[],
): boolean {
  if (stableJson(previous) === stableJson(renewed)) return true;
  if (
    renewed.schema_version !== previous.schema_version ||
    renewed.artifact_type !== previous.artifact_type ||
    renewed.run_id !== previous.run_id ||
    renewed.lease_id !== previous.lease_id ||
    renewed.owner_session_id !== previous.owner_session_id ||
    renewed.acquired_at !== previous.acquired_at ||
    renewed.recovery_mode !== previous.recovery_mode
  ) {
    return false;
  }
  const proof = provenHeartbeatState(previous, renewed.generation, lifecycle);
  return (
    proof !== null &&
    renewed.renewed_at === proof.renewed_at &&
    renewed.expires_at === proof.expires_at
  );
}

function validateLeaseStateBinding(
  lease: VersionedCampaignLeaseState,
  reservation: VersionedCampaignRunReservation,
): void {
  const mustMatchOriginalLease =
    lease.schema_version === LEGACY_CAMPAIGN_ARTIFACT_SCHEMA_VERSION;
  if (
    lease.schema_version !== reservation.schema_version ||
    lease.run_id !== reservation.run_id ||
    lease.owner_session_id !== reservation.identities.operator.session_id ||
    lease.recovery_mode !== reservation.lease.recovery_mode ||
    (mustMatchOriginalLease &&
      (lease.lease_id !== reservation.lease.lease_id ||
        lease.owner_session_id !== reservation.lease.owner_session_id ||
        lease.acquired_at !== reservation.lease.acquired_at))
  ) {
    throw new CascadeError(
      `campaign lease state does not match reservation: ${reservation.run_id}`,
    );
  }
}

function validateCurrentFinalizationContract(
  value: unknown,
  runId: string,
  schemaVersion: typeof CAMPAIGN_ARTIFACT_SCHEMA_VERSION | typeof PREVIOUS_CAMPAIGN_ARTIFACT_SCHEMA_VERSION = CAMPAIGN_ARTIFACT_SCHEMA_VERSION,
): asserts value is CurrentShapeCampaignRunFinalization {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new CascadeError(`invalid campaign finalization contract for ${runId}`);
  }
  const finalization = value as CurrentShapeCampaignRunFinalization;
  const expectedKeys = [
    "application_files",
    "application_manifest_digest",
    "artifact_type",
    "completed_at",
    "completed_by",
    "files",
    "finalized_at",
    "finalized_by",
    "manifest_digest",
    "post_intent_recovery_files",
    "post_intent_recovery_manifest_digest",
    "recovery_reason",
    "run_id",
    "schema_version",
    "status",
    "terminal_lock_digest",
    "terminal_lock_producer",
  ];
  if (
    Object.keys(finalization).sort().join(",") !== expectedKeys.join(",") ||
    finalization.schema_version !== schemaVersion ||
    finalization.artifact_type !== "campaign-run-finalization" ||
    finalization.run_id !== runId ||
    !["COMPLETED", "BLOCKED", "UNKNOWN_OUTCOME"].includes(
      finalization.status,
    ) ||
    !isDateTime(finalization.finalized_at) ||
    !isDateTime(finalization.completed_at) ||
    (finalization.recovery_reason !== null &&
      typeof finalization.recovery_reason !== "string") ||
    !/^[a-f0-9]{64}$/.test(finalization.terminal_lock_digest) ||
    !/^[a-f0-9]{64}$/.test(finalization.application_manifest_digest) ||
    !/^[a-f0-9]{64}$/.test(
      finalization.post_intent_recovery_manifest_digest,
    ) ||
    !/^[a-f0-9]{64}$/.test(finalization.manifest_digest)
  ) {
    throw new CascadeError(`invalid campaign finalization contract for ${runId}`);
  }
  try {
    validatePrincipal(finalization.finalized_by, "campaign finalizer");
    validatePrincipal(finalization.completed_by, "campaign completer");
    validatePrincipal(
      finalization.terminal_lock_producer,
      "campaign terminal lock producer",
    );
    validateArtifactFileRecords(
      finalization.application_files,
      "campaign finalization application files",
    );
    validateArtifactFileRecords(
      finalization.post_intent_recovery_files,
      "campaign finalization post-intent recovery files",
    );
    validateArtifactFileRecords(finalization.files, "campaign finalization files");
  } catch {
    throw new CascadeError(`invalid campaign finalization contract for ${runId}`);
  }
}

function validateLegacyFinalizationContract(
  value: unknown,
  runId: string,
): asserts value is LegacyCampaignRunFinalization {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new CascadeError(
      `invalid legacy campaign finalization contract for ${runId}`,
    );
  }
  const finalization = value as LegacyCampaignRunFinalization;
  const expectedKeys = [
    "artifact_type",
    "files",
    "finalized_at",
    "finalized_by",
    "manifest_digest",
    "recovery_reason",
    "run_id",
    "schema_version",
    "status",
  ];
  if (
    Object.keys(finalization).sort().join(",") !== expectedKeys.join(",") ||
    finalization.schema_version !== LEGACY_CAMPAIGN_ARTIFACT_SCHEMA_VERSION ||
    finalization.artifact_type !== "campaign-run-finalization" ||
    finalization.run_id !== runId ||
    !["COMPLETED", "BLOCKED", "UNKNOWN_OUTCOME"].includes(
      finalization.status,
    ) ||
    !isDateTime(finalization.finalized_at) ||
    (finalization.recovery_reason !== null &&
      typeof finalization.recovery_reason !== "string") ||
    !/^[a-f0-9]{64}$/.test(finalization.manifest_digest)
  ) {
    throw new CascadeError(
      `invalid legacy campaign finalization contract for ${runId}`,
    );
  }
  try {
    validatePrincipal(finalization.finalized_by, "legacy campaign finalizer");
    validateArtifactFileRecords(
      finalization.files,
      "legacy campaign finalization files",
    );
  } catch {
    throw new CascadeError(
      `invalid legacy campaign finalization contract for ${runId}`,
    );
  }
}

function validateLegacyTerminalLockContract(
  value: unknown,
  runId: string,
): asserts value is LegacyCampaignTerminalLock {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new CascadeError(
      `invalid legacy campaign terminal lock contract for ${runId}`,
    );
  }
  const terminalLock = value as LegacyCampaignTerminalLock;
  const expectedKeys = [
    "locked_at",
    "locked_by",
    "run_id",
    "schema_version",
    "status",
  ];
  if (
    Object.keys(terminalLock).sort().join(",") !== expectedKeys.join(",") ||
    terminalLock.schema_version !== LEGACY_CAMPAIGN_ARTIFACT_SCHEMA_VERSION ||
    terminalLock.run_id !== runId ||
    !["COMPLETED", "BLOCKED", "UNKNOWN_OUTCOME"].includes(
      terminalLock.status,
    ) ||
    !isDateTime(terminalLock.locked_at)
  ) {
    throw new CascadeError(
      `invalid legacy campaign terminal lock contract for ${runId}`,
    );
  }
  try {
    validatePrincipal(terminalLock.locked_by, "legacy campaign terminal locker");
  } catch {
    throw new CascadeError(
      `invalid legacy campaign terminal lock contract for ${runId}`,
    );
  }
}

function validateCurrentTerminalLockContract(
  value: unknown,
  runId: string,
  schemaVersion: typeof CAMPAIGN_ARTIFACT_SCHEMA_VERSION | typeof PREVIOUS_CAMPAIGN_ARTIFACT_SCHEMA_VERSION = CAMPAIGN_ARTIFACT_SCHEMA_VERSION,
): asserts value is CurrentShapeCampaignTerminalLock {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new CascadeError(
      `invalid campaign terminal intent contract for ${runId}`,
    );
  }
  const terminalLock = value as CurrentShapeCampaignTerminalLock;
  const expectedKeys = [
    "application_files",
    "application_manifest_digest",
    "artifact_type",
    "produced_at",
    "produced_by",
    "run_id",
    "schema_version",
    "status",
  ];
  if (
    Object.keys(terminalLock).sort().join(",") !== expectedKeys.join(",") ||
    terminalLock.schema_version !== schemaVersion ||
    terminalLock.artifact_type !== "campaign-terminal-intent" ||
    terminalLock.run_id !== runId ||
    !["COMPLETED", "BLOCKED", "UNKNOWN_OUTCOME"].includes(
      terminalLock.status,
    ) ||
    !isDateTime(terminalLock.produced_at) ||
    !/^[a-f0-9]{64}$/.test(terminalLock.application_manifest_digest)
  ) {
    throw new CascadeError(
      `invalid campaign terminal intent contract for ${runId}`,
    );
  }
  try {
    validatePrincipal(terminalLock.produced_by, "campaign terminal producer");
    validateArtifactFileRecords(
      terminalLock.application_files,
      "campaign terminal application files",
    );
  } catch {
    throw new CascadeError(
      `invalid campaign terminal intent contract for ${runId}`,
    );
  }
}

function sortedArtifactRecords(
  records: readonly CampaignArtifactFile[],
): CampaignArtifactFile[] {
  return [...records].sort((left, right) => left.path.localeCompare(right.path));
}

function artifactManifestDigest(records: readonly CampaignArtifactFile[]): string {
  return sha256Text(stableJson(sortedArtifactRecords(records)));
}

type CurrentTerminalStatus = "PASS" | "FAIL" | "BLOCKED";
interface CurrentTerminalClaim {
  claim_id: string;
  class: string;
  status: ClaimStatus;
  reason: string;
  evidence: string[];
}

const CURRENT_TERMINAL_STATUSES = new Set<CurrentTerminalStatus>([
  "PASS",
  "FAIL",
  "BLOCKED",
]);
const CURRENT_CLAIM_STATUSES = new Set<ClaimStatus>([
  "SUPPORTED",
  "PARTIALLY_SUPPORTED",
  "UNSUPPORTED",
  "CONFLICTING",
  "BLOCKED",
  "NOT_RUN",
  "INVALID",
]);
const CURRENT_CLAIM_CLASSES = new Set([
  "authorship",
  "execution",
  "mechanical-behavior",
  "semantic-quality",
  "safety-compliance",
  "coverage",
  "release-eligibility",
]);
const CURRENT_EVALUATION_ROOT_CAUSES = new Set([
  "none",
  "mechanical-gate",
  "execution",
  "evidence",
  "policy",
  "oracle",
  "cleanup",
  "calibration",
  "evaluator",
  "environment",
]);

interface CurrentAuthoredClaim {
  id: string;
  class: string;
  source_path: string;
  definition: Record<string, unknown>;
}

function validateCurrentTerminalClaimLedger(
  value: unknown,
  expectedClaims: readonly { id: string; class: string }[],
  label: string,
): CurrentTerminalClaim[] {
  if (!Array.isArray(value)) {
    throw new CascadeError(`${label} must be an array`);
  }
  const expected = new Map(expectedClaims.map((claim) => [claim.id, claim.class]));
  const ledger = value.map((item, index) => {
    const entry = requireExactOwnDataObject(
      item,
      `${label} ${index}`,
      ["claim_id", "class", "status", "reason", "evidence"],
    );
    if (
      typeof entry.claim_id !== "string" ||
      !entry.claim_id ||
      !CURRENT_CLAIM_CLASSES.has(String(entry.class)) ||
      entry.class !== expected.get(entry.claim_id) ||
      !CURRENT_CLAIM_STATUSES.has(entry.status as ClaimStatus) ||
      typeof entry.reason !== "string" ||
      !entry.reason ||
      !Array.isArray(entry.evidence) ||
      new Set(entry.evidence).size !== entry.evidence.length ||
      entry.evidence.some(
        (path) =>
          typeof path !== "string" ||
          !path ||
          path.startsWith("/") ||
          path.split("/").includes(".."),
      )
    ) {
      throw new CascadeError(`${label} ${index} is invalid or stale`);
    }
    return entry as unknown as CurrentTerminalClaim;
  });
  if (new Set(ledger.map((entry) => entry.claim_id)).size !== ledger.length) {
    throw new CascadeError(`${label} contains duplicate claims`);
  }
  return ledger;
}

function validateCurrentEvaluationReceiptShape(
  value: Record<string, unknown>,
  reservation: CampaignRunReservation,
  expectedSpecializedBinding: Record<string, unknown> | null,
  authoritativeClaims: readonly { id: string; class: string }[] | null,
): { status: CurrentTerminalStatus; claim_ledger: CurrentTerminalClaim[] } {
  const expectedKeys = [
    "calibration_receipt_digest",
    "campaign_id",
    "claim_ledger",
    "created_at",
    "earliest_failure",
    "evaluation_id",
    "evaluation_input_digest",
    "evaluator_identity",
    "execution_receipt_digest",
    "input_manifest_digest",
    "model",
    "next_route",
    "operator_identity",
    "principal_identities",
    "profile_digest",
    "profile_id",
    "provider",
    "provider_output_digest",
    "provider_trace_digest",
    "reasoning_effort",
    "refinement_proposal_bindings",
    "residual_uncertainty",
    "root_cause",
    "rubric_digest",
    "rubric_id",
    "run_id",
    "schema_version",
    "source_manifest_digest",
    "specialized_evaluation",
    "status",
    "usage",
  ];
  const isDigest = (item: unknown): item is string =>
    typeof item === "string" && /^[a-f0-9]{64}$/.test(item);
  if (
    Object.keys(value).sort().join(",") !== expectedKeys.join(",") ||
    value.schema_version !== 3 ||
    value.evaluation_id !== `${reservation.run_id}-evaluation` ||
    value.run_id !== reservation.run_id ||
    value.campaign_id !== reservation.campaign_id ||
    value.operator_identity !== reservation.identities.operator.subject ||
    value.evaluator_identity !== reservation.identities.evaluator.subject ||
    stableJson(value.specialized_evaluation) !== stableJson(expectedSpecializedBinding) ||
    !CURRENT_TERMINAL_STATUSES.has(value.status as CurrentTerminalStatus) ||
    !CURRENT_EVALUATION_ROOT_CAUSES.has(String(value.root_cause)) ||
    !isDateTime(value.created_at) ||
    typeof value.profile_id !== "string" ||
    !value.profile_id ||
    !isDigest(value.profile_digest) ||
    !isDigest(value.evaluation_input_digest) ||
    !isDigest(value.source_manifest_digest) ||
    !isDigest(value.execution_receipt_digest) ||
    (value.calibration_receipt_digest !== null &&
      !isDigest(value.calibration_receipt_digest)) ||
    typeof value.next_route !== "string" ||
    !value.next_route ||
    !Array.isArray(value.residual_uncertainty) ||
    value.residual_uncertainty.some((item) => typeof item !== "string") ||
    (value.earliest_failure !== null &&
      (typeof value.earliest_failure !== "string" || !value.earliest_failure))
  ) {
    throw new CascadeError("COMPLETED general evaluation receipt shape is invalid");
  }
  if (value.provider === "fixture") {
    if (
      value.model !== null ||
      value.reasoning_effort !== null ||
      value.rubric_id !== null ||
      value.rubric_digest !== null ||
      value.input_manifest_digest !== null ||
      value.provider_trace_digest !== null ||
      value.provider_output_digest !== null ||
      value.usage !== null
    ) {
      throw new CascadeError("COMPLETED fixture evaluation contains provider evidence");
    }
  } else if (
    value.provider !== "codex" ||
    typeof value.model !== "string" ||
    !value.model ||
    !new Set(["low", "medium", "high", "xhigh"]).has(String(value.reasoning_effort)) ||
    typeof value.rubric_id !== "string" ||
    !value.rubric_id ||
    !isDigest(value.rubric_digest) ||
    !isDigest(value.input_manifest_digest) ||
    !isDigest(value.provider_trace_digest) ||
    !isDigest(value.provider_output_digest) ||
    (value.usage !== null &&
      (!value.usage ||
        typeof value.usage !== "object" ||
        Array.isArray(value.usage) ||
        Object.values(value.usage).some(
          (item) => typeof item !== "number" || !Number.isFinite(item) || item < 0,
        )))
  ) {
    throw new CascadeError("COMPLETED Codex evaluation provider evidence is invalid");
  }
  const status = value.status as CurrentTerminalStatus;
  if (
    status === "PASS"
      ? value.root_cause !== "none" || value.earliest_failure !== null
      : value.root_cause === "none" || value.earliest_failure === null
  ) {
    throw new CascadeError("COMPLETED evaluation terminal metadata is inconsistent");
  }
  const locked = new Set(
    expectedSpecializedBinding && Array.isArray(expectedSpecializedBinding.claim_ids)
      ? expectedSpecializedBinding.claim_ids as string[]
      : [],
  );
  const rawLedger = Array.isArray(value.claim_ledger)
    ? value.claim_ledger.map((entry) => requireRecord(entry, "general claim"))
    : [];
  const legacyLedgerClasses = new Map(
    rawLedger.map((entry) => [String(entry.claim_id), String(entry.class)]),
  );
  const expectedGeneralClaims = (authoritativeClaims ?? reservation.claim_ids.map(
    (claimId) => ({ id: claimId, class: legacyLedgerClasses.get(claimId) ?? "" }),
  )).filter((claim) => !locked.has(claim.id));
  const ledger = validateCurrentTerminalClaimLedger(
    value.claim_ledger,
    expectedGeneralClaims,
    "COMPLETED general claim ledger",
  );
  if (
    stableJson(ledger.map((claim) => claim.claim_id).sort()) !==
      stableJson(expectedGeneralClaims.map((claim) => claim.id).sort())
  ) {
    throw new CascadeError("COMPLETED general evaluation status or claims are inconsistent");
  }
  assertTerminalStatusMatchesClaimLedger(status, ledger, "COMPLETED general evaluation");
  if (!Array.isArray(value.refinement_proposal_bindings)) {
    throw new CascadeError("COMPLETED evaluation refinement bindings are invalid");
  }
  return { status, claim_ledger: ledger };
}

function reducedTerminalStatus(
  generalStatus: CurrentTerminalStatus,
  specializedStatus: SpecializedEvaluationReceipt["status"] | null,
  claims: readonly CurrentTerminalClaim[],
): CurrentTerminalStatus {
  if (generalStatus === "BLOCKED" || specializedStatus === "BLOCKED") {
    return "BLOCKED";
  }
  if (generalStatus === "FAIL" || specializedStatus === "FAIL") return "FAIL";
  const required = claims.filter((claim) => claim.class !== "release-eligibility");
  if (required.every((claim) => claim.status === "SUPPORTED")) return "PASS";
  if (
    required.some((claim) =>
      new Set<ClaimStatus>(["BLOCKED", "NOT_RUN", "INVALID"]).has(claim.status)
    )
  ) {
    return "BLOCKED";
  }
  return "FAIL";
}

function terminalCodexOutput(trace: string): Record<string, unknown> {
  return requireRecord(parseCodexJsonl(trace).output, "Codex trace final output");
}

async function artifactFiles(root: string): Promise<string[]> {
  const rootMetadata = await lstat(root).catch(() => null);
  if (
    !rootMetadata?.isDirectory() ||
    rootMetadata.isSymbolicLink() ||
    (rootMetadata.mode & 0o077) !== 0
  ) {
    throw new CascadeError(
      "campaign artifact root must be a maintainers-only regular directory",
    );
  }
  const result: string[] = [];
  const visit = async (directory: string): Promise<void> => {
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      const path = resolve(directory, entry.name);
      const metadata = await lstat(path);
      if (metadata.isSymbolicLink()) {
        throw new CascadeError(
          `campaign artifact tree contains a symbolic link: ${normalizedRelative(root, path)}`,
        );
      }
      if ((metadata.mode & 0o077) !== 0) {
        throw new CascadeError(
          `campaign artifact tree entry is not maintainers-only: ${normalizedRelative(root, path)}`,
        );
      }
      if (metadata.isDirectory()) await visit(path);
      else if (metadata.isFile()) {
        result.push(path);
        if (result.length > MAX_CAMPAIGN_ARTIFACT_FILES) {
          throw new CascadeError(
            `campaign artifact tree exceeds ${MAX_CAMPAIGN_ARTIFACT_FILES} files`,
          );
        }
      }
      else {
        throw new CascadeError(
          `campaign artifact tree contains an unsupported entry: ${normalizedRelative(root, path)}`,
        );
      }
    }
  };
  await visit(root);
  return result;
}

export class CampaignArtifactStore {
  readonly runRoot: string;
  private readonly mutationLockPath: string;
  private readonly mutationTakeoverClaimPath: string;
  private sourceReadCheckpoint?: (
    phase: "opened",
    sourcePath: string,
  ) => Promise<void>;
  private artifactReadCheckpoint?: BoundedFileReadCheckpoint;

  constructor(
    readonly artifactRoot: string,
    readonly runId: string,
    private readonly authority: CampaignArtifactAuthority | null = null,
    private readonly sensitiveValues: readonly string[] = [],
    private readonly confirmationSecrets: Readonly<Record<string, string>> = {},
    private readonly clock: () => Date = () => new Date(),
  ) {
    assertSafeRunId(runId);
    this.runRoot = resolve(artifactRoot, runId);
    if (
      this.runRoot === resolve(artifactRoot) ||
      !this.runRoot.startsWith(`${resolve(artifactRoot)}${sep}`)
    ) {
      throw new CascadeError(`campaign run escapes artifact root: ${runId}`);
    }
    this.mutationLockPath = resolve(artifactRoot, `.${runId}.mutation.lock`);
    this.mutationTakeoverClaimPath = resolve(
      artifactRoot,
      `.${runId}.mutation.takeover.json`,
    );
  }

  withAuthority(
    principal: CampaignPrincipal,
    leaseId: string | null = null,
  ): CampaignArtifactStore {
    return new CampaignArtifactStore(this.artifactRoot, this.runId, {
      principal,
      lease_id: leaseId,
    }, this.sensitiveValues, this.confirmationSecrets, this.clock);
  }

  withSensitiveValues(values: readonly string[]): CampaignArtifactStore {
    return new CampaignArtifactStore(
      this.artifactRoot,
      this.runId,
      this.authority,
      [...new Set(values.filter(Boolean))],
      this.confirmationSecrets,
      this.clock,
    );
  }

  withConfirmationSecrets(
    values: Readonly<Record<string, string>>,
  ): CampaignArtifactStore {
    const normalized = Object.create(null) as Record<string, string>;
    for (const [key, value] of Object.entries(values)) {
      confirmationSecretBytes(value, `confirmation secret ${key}`);
      normalized[key] = value;
    }
    return new CampaignArtifactStore(
      this.artifactRoot,
      this.runId,
      this.authority,
      this.sensitiveValues,
      normalized,
      this.clock,
    );
  }

  withClock(clock: () => Date): CampaignArtifactStore {
    return new CampaignArtifactStore(
      this.artifactRoot,
      this.runId,
      this.authority,
      this.sensitiveValues,
      this.confirmationSecrets,
      clock,
    );
  }

  private clockInstant(label: string): string {
    const instant = this.clock();
    if (!(instant instanceof Date) || !Number.isFinite(instant.getTime())) {
      throw new CascadeError(`${label} clock returned an invalid instant`);
    }
    return instant.toISOString();
  }

  private path(relativePath: string): string {
    const path = resolve(this.runRoot, relativePath);
    if (
      path === this.runRoot ||
      !path.startsWith(`${this.runRoot}${sep}`)
    ) {
      throw new CascadeError(`artifact path escapes run root: ${relativePath}`);
    }
    return path;
  }

  private async ensureMaintainersOnlyDirectory(directory: string): Promise<void> {
    const artifactRoot = resolve(this.artifactRoot);
    const resolvedDirectory = resolve(directory);
    if (
      resolvedDirectory !== artifactRoot &&
      !resolvedDirectory.startsWith(`${artifactRoot}${sep}`)
    ) {
      throw new CascadeError(`artifact directory escapes its root: ${directory}`);
    }
    await assertNoSymlinkAncestors(artifactRoot, "artifact root");
    await mkdir(artifactRoot, {
      recursive: true,
      mode: ARTIFACT_DIRECTORY_MODE,
    });
    await chmod(artifactRoot, ARTIFACT_DIRECTORY_MODE);
    let current = artifactRoot;
    const parts = normalizedRelative(artifactRoot, resolvedDirectory)
      .split("/")
      .filter((part) => part && part !== ".");
    for (const part of parts) {
      current = resolve(current, part);
      const metadata = await lstat(current).catch(() => null);
      if (metadata?.isSymbolicLink()) {
        throw new CascadeError(
          `artifact directory has a symbolic-link ancestor: ${current}`,
        );
      }
      if (metadata && !metadata.isDirectory()) {
        throw new CascadeError(`artifact directory is not a directory: ${current}`);
      }
      if (!metadata) {
        await mkdir(current, { mode: ARTIFACT_DIRECTORY_MODE });
      }
      await chmod(current, ARTIFACT_DIRECTORY_MODE);
    }
  }

  private async prepareArtifactWrite(path: string): Promise<void> {
    await this.ensureMaintainersOnlyDirectory(dirname(path));
    await this.assertSafeAncestors(path);
  }

  private async assertMaintainersOnlyArtifactPath(path: string): Promise<void> {
    const artifactRoot = resolve(this.artifactRoot);
    let current = dirname(path);
    while (
      current === artifactRoot ||
      current.startsWith(`${artifactRoot}${sep}`)
    ) {
      const metadata = await lstat(current).catch(() => null);
      if (!metadata?.isDirectory() || metadata.isSymbolicLink()) {
        throw new CascadeError(
          `artifact path has an invalid directory ancestor: ${current}`,
        );
      }
      if ((metadata.mode & 0o077) !== 0) {
        throw new CascadeError(
          `artifact directory must use maintainers-only permissions: ${current}`,
        );
      }
      if (current === artifactRoot) break;
      current = dirname(current);
    }
  }

  async artifactFileExists(relativePath: string): Promise<boolean> {
    const path = this.path(relativePath);
    const metadata = await lstat(path).catch(() => null);
    if (!metadata) return false;
    await this.assertMaintainersOnlyArtifactPath(path);
    if (metadata.isSymbolicLink() || !metadata.isFile()) {
      throw new CascadeError(
        `campaign artifact must be a regular non-symlink file: ${relativePath}`,
      );
    }
    if ((metadata.mode & 0o077) !== 0) {
      throw new CascadeError(
        `campaign artifact must use maintainers-only file permissions: ${relativePath}`,
      );
    }
    return true;
  }

  async readArtifactText(
    relativePath: string,
    label = `campaign artifact ${relativePath}`,
    maxBytes = DEFAULT_EVIDENCE_LIMIT_BYTES,
  ): Promise<string> {
    const path = this.path(relativePath);
    await this.assertMaintainersOnlyArtifactPath(path);
    return readBoundedStructuredText(
      path,
      label,
      maxBytes,
      this.runRoot,
      this.artifactReadCheckpoint,
    );
  }

  async readArtifactBytes(
    relativePath: string,
    label = `campaign artifact ${relativePath}`,
    maxBytes = DEFAULT_EVIDENCE_LIMIT_BYTES,
  ): Promise<Buffer> {
    const path = this.path(relativePath);
    await this.assertMaintainersOnlyArtifactPath(path);
    return readBoundedFile(
      path,
      label,
      maxBytes,
      this.runRoot,
      this.artifactReadCheckpoint,
    );
  }

  async readArtifactJson<T = unknown>(
    relativePath: string,
    label = `campaign artifact ${relativePath}`,
    maxBytes = DEFAULT_EVIDENCE_LIMIT_BYTES,
  ): Promise<T> {
    const path = this.path(relativePath);
    await this.assertMaintainersOnlyArtifactPath(path);
    return readBoundedStructuredJson<T>(
      path,
      label,
      maxBytes,
      this.runRoot,
      this.artifactReadCheckpoint,
    );
  }

  async readArtifactJsonWithRecord<T = unknown>(
    relativePath: string,
    label = `campaign artifact ${relativePath}`,
    maxBytes = DEFAULT_EVIDENCE_LIMIT_BYTES,
  ): Promise<CampaignArtifactRead<T>> {
    const path = this.path(relativePath);
    await this.assertMaintainersOnlyArtifactPath(path);
    const snapshot = await readArtifactJsonSnapshot<T>(
      this.runRoot,
      path,
      label,
      maxBytes,
      this.artifactReadCheckpoint,
    );
    return {
      record: snapshot.record,
      bytes: snapshot.bytes,
      value: snapshot.value,
    };
  }

  private async assertArtifactSnapshotCurrent<T>(
    path: string,
    label: string,
    expected: ArtifactSnapshot<T>,
  ): Promise<void> {
    const current = await readArtifactJsonSnapshot<T>(
      this.runRoot,
      path,
      label,
      expected.bytes.byteLength || 1,
      this.artifactReadCheckpoint,
    );
    if (
      stableJson(current.identity) !== stableJson(expected.identity) ||
      stableJson(current.record) !== stableJson(expected.record)
    ) {
      throw new CascadeError(`${label} changed after verification`);
    }
  }

  async readVerifiedArtifactJson<T = unknown>(
    relativePath: string,
    label = `campaign artifact ${relativePath}`,
    maxBytes = DEFAULT_EVIDENCE_LIMIT_BYTES,
  ): Promise<VerifiedCampaignArtifactRead<T>> {
    const finalizationPath = this.path("finalization.json");
    const finalizationSnapshot = await readArtifactJsonSnapshot<
      CampaignRunFinalization | LegacyCampaignRunFinalization
    >(
      this.runRoot,
      finalizationPath,
      "campaign finalization",
      DEFAULT_EVIDENCE_LIMIT_BYTES,
      this.artifactReadCheckpoint,
    );
    const verification = await this.verify();
    await this.assertArtifactSnapshotCurrent(
      finalizationPath,
      "campaign finalization",
      finalizationSnapshot,
    );
    const expectedRecord = finalizationSnapshot.value.files.find(
      (record) => record.path === relativePath,
    );
    if (!expectedRecord) {
      throw new CascadeError(
        `campaign artifact is absent from the verified manifest: ${relativePath}`,
      );
    }
    const artifactPath = this.path(relativePath);
    await this.assertMaintainersOnlyArtifactPath(artifactPath);
    const artifact = await readArtifactJsonSnapshot<T>(
      this.runRoot,
      artifactPath,
      label,
      maxBytes,
      this.artifactReadCheckpoint,
    );
    if (stableJson(artifact.record) !== stableJson(expectedRecord)) {
      throw new CascadeError(
        `campaign artifact does not match the verified manifest: ${relativePath}`,
      );
    }
    await this.assertArtifactSnapshotCurrent(
      finalizationPath,
      "campaign finalization",
      finalizationSnapshot,
    );
    return {
      verification,
      record: artifact.record,
      bytes: artifact.bytes,
      value: artifact.value,
    };
  }

  async readVerifiedArtifactJsonBatch(
    requests: Array<{ relativePath: string; label: string; maxBytes?: number }>,
  ): Promise<{
    verification: CampaignArtifactVerification;
    artifacts: Map<string, CampaignArtifactRead<unknown>>;
  }> {
    if (
      requests.length === 0 ||
      new Set(requests.map((request) => request.relativePath)).size !== requests.length
    ) {
      throw new CascadeError("verified artifact batch must contain unique paths");
    }
    const finalizationPath = this.path("finalization.json");
    const finalizationSnapshot = await readArtifactJsonSnapshot<
      CampaignRunFinalization | LegacyCampaignRunFinalization
    >(
      this.runRoot,
      finalizationPath,
      "campaign finalization",
      DEFAULT_EVIDENCE_LIMIT_BYTES,
      this.artifactReadCheckpoint,
    );
    const verification = await this.verify();
    if (verification.manifest_digest !== finalizationSnapshot.value.manifest_digest) {
      throw new CascadeError("campaign finalization changed across verified artifact batch");
    }
    await this.assertArtifactSnapshotCurrent(
      finalizationPath,
      "campaign finalization",
      finalizationSnapshot,
    );
    const artifacts = new Map<string, CampaignArtifactRead<unknown>>();
    for (const request of requests) {
      const expectedRecord = finalizationSnapshot.value.files.find(
        (record) => record.path === request.relativePath,
      );
      if (!expectedRecord) {
        throw new CascadeError(
          `campaign artifact is absent from the verified manifest: ${request.relativePath}`,
        );
      }
      const artifactPath = this.path(request.relativePath);
      await this.assertMaintainersOnlyArtifactPath(artifactPath);
      const artifact = await readArtifactJsonSnapshot<unknown>(
        this.runRoot,
        artifactPath,
        request.label,
        request.maxBytes ?? DEFAULT_EVIDENCE_LIMIT_BYTES,
        this.artifactReadCheckpoint,
      );
      if (stableJson(artifact.record) !== stableJson(expectedRecord)) {
        throw new CascadeError(
          `campaign artifact does not match the verified manifest: ${request.relativePath}`,
        );
      }
      artifacts.set(request.relativePath, {
        record: artifact.record,
        bytes: artifact.bytes,
        value: artifact.value,
      });
    }
    await this.assertArtifactSnapshotCurrent(
      finalizationPath,
      "campaign finalization",
      finalizationSnapshot,
    );
    return { verification, artifacts };
  }

  async artifactFileRecord(relativePath: string): Promise<CampaignArtifactFile> {
    const path = this.path(relativePath);
    await this.assertMaintainersOnlyArtifactPath(path);
    return fileRecord(this.runRoot, path);
  }

  async listArtifactFiles(): Promise<string[]> {
    await this.assertMaintainersOnlyArtifactPath(this.path("reservation.json"));
    return (await artifactFiles(this.runRoot)).map((path) =>
      normalizedRelative(this.runRoot, path),
    );
  }

  private sessionJournalSegmentPath(sequence: number): string {
    return this.path(
      `execution/session/journal/${sessionSegment(sequence)}.jsonl`,
    );
  }

  private sessionCheckpointPath(revision: number): string {
    const name = `${String(revision).padStart(8, "0")}.json`;
    return this.path(
      `execution/session/checkpoints/${sessionSegment(revision)}/${name}`,
    );
  }

  private async readSessionEventFile(
    path: string,
  ): Promise<SimulationSessionEvent[]> {
    if (!(await exists(path))) return [];
    const text = await readBoundedStructuredText(path, "simulation journal segment");
    return text
      .split("\n")
      .filter(Boolean)
      .map((line, index) => {
        try {
          return JSON.parse(line) as SimulationSessionEvent;
        } catch {
          throw new CascadeError(
            `simulation journal segment line ${index + 1} is invalid JSON`,
          );
        }
      });
  }

  private async readLastSessionEvent(): Promise<SimulationSessionEvent | null> {
    const directory = this.path("execution/session/journal");
    const entries = await readdir(directory, { withFileTypes: true }).catch(
      (error) => {
        if (
          error &&
          typeof error === "object" &&
          "code" in error &&
          error.code === "ENOENT"
        ) {
          return [];
        }
        throw error;
      },
    );
    const latest = entries
      .filter((entry) => {
        if (entry.isSymbolicLink()) {
          throw new CascadeError("simulation journal segment cannot be a symlink");
        }
        return entry.isFile() && /^\d{8}\.jsonl$/.test(entry.name);
      })
      .sort((left, right) => left.name.localeCompare(right.name))
      .at(-1);
    if (latest) {
      const events = await this.readSessionEventFile(
        resolve(directory, latest.name),
      );
      if (events.length) return events.at(-1)!;
    }
    const legacyEvents = await this.readSessionEventFile(
      this.path("execution/session/journal.jsonl"),
    );
    return legacyEvents.at(-1) ?? null;
  }

  private async assertMutable(options: {
    allow_incomplete_finalization?: boolean;
  } = {}): Promise<void> {
    const finalized = await exists(this.path("finalization.json"));
    const terminalLocked = await exists(this.path("terminal.lock"));
    if (
      finalized ||
      (terminalLocked && !options.allow_incomplete_finalization)
    ) {
      throw new CascadeError(`campaign run ${this.runId} is already finalized`);
    }
  }

  private mutationQuarantinePath(token: string): string {
    return `${this.mutationLockPath}.quarantine-${token}`;
  }

  private mutationTakeoverReceiptPath(token: string): string {
    return this.path(`recovery/mutation-lock-takeovers/${token}.json`);
  }

  private async readOptionalArtifactSnapshot<T>(
    path: string,
    label: string,
  ): Promise<ArtifactSnapshot<T> | null> {
    const metadata = await lstat(path).catch((error) => {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "ENOENT"
      ) {
        return null;
      }
      throw error;
    });
    if (!metadata) return null;
    try {
      return await readArtifactJsonSnapshot<T>(
        this.runRoot,
        path,
        label,
        DEFAULT_EVIDENCE_LIMIT_BYTES,
        undefined,
        this.artifactRoot,
      );
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        (("code" in error && error.code === "ENOENT") ||
          (error instanceof CascadeError &&
            (error.message.includes("changed identity or permissions while being read") ||
              error.message.includes("escapes its physical root after open"))))
      ) {
        throw new TransientCampaignMutationGovernanceChange(label);
      }
      throw error;
    }
  }

  private mutationGovernanceIdentity(
    snapshot: CampaignMutationGovernanceSnapshot,
  ): string {
    const identity = <T>(value: ArtifactSnapshot<T> | null) =>
      value
        ? { record: value.record, identity: value.identity }
        : null;
    return stableJson({
      reservation: identity(snapshot.reservation),
      lease: identity(snapshot.lease),
      claim: identity(snapshot.claim),
      receipt: identity(snapshot.receipt),
      terminal_lock: identity(snapshot.terminal_lock),
      finalization: identity(snapshot.finalization),
      active_lock: identity(snapshot.active_lock),
      quarantines: snapshot.quarantines.map(identity),
    });
  }

  private async captureMutationGovernance(): Promise<CampaignMutationGovernanceSnapshot> {
    const reservation = await readArtifactJsonSnapshot<unknown>(
      this.runRoot,
      this.path("reservation.json"),
      "campaign reservation",
    );
    validateReservationContract(
      reservation.value,
      this.runId,
      CAMPAIGN_ARTIFACT_SCHEMA_VERSION,
    );
    const reservationSnapshot = reservation as ArtifactSnapshot<CampaignRunReservation>;
    const lease = await readArtifactJsonSnapshot<unknown>(
      this.runRoot,
      this.path("lease.json"),
      "campaign lease state",
    );
    validateLeaseStateContract(
      lease.value,
      this.runId,
      CAMPAIGN_ARTIFACT_SCHEMA_VERSION,
    );
    validateLeaseStateBinding(lease.value, reservationSnapshot.value);
    const leaseSnapshot = lease as ArtifactSnapshot<CampaignLeaseState>;
    const claim = await this.readOptionalArtifactSnapshot<CampaignMutationLockTakeoverClaim>(
      this.mutationTakeoverClaimPath,
      "campaign mutation lock takeover claim",
    );
    if (claim) {
      validateMutationLockTakeoverClaim(
        claim.value,
        this.runId,
        reservationSnapshot.value,
      );
      const expectedQuarantine = normalizedRelative(
        this.artifactRoot,
        this.mutationQuarantinePath(claim.value.previous_lock.token),
      );
      if (claim.value.quarantined_path !== expectedQuarantine) {
        throw new CascadeError(
          `campaign mutation lock takeover claim has a mismatched quarantine path: ${this.runId}`,
        );
      }
    }
    const receipt = claim
      ? await this.readOptionalArtifactSnapshot<CampaignMutationLockTakeoverReceipt>(
          this.mutationTakeoverReceiptPath(claim.value.previous_lock.token),
          "campaign mutation lock takeover receipt",
        )
      : null;
    if (receipt) {
      validateMutationLockTakeoverReceipt(
        receipt.value,
        this.runId,
        reservationSnapshot.value,
      );
    }
    const terminalLock = await this.readOptionalArtifactSnapshot<CampaignTerminalLock>(
      this.path("terminal.lock"),
      "campaign terminal lock",
    );
    if (terminalLock) {
      validateCurrentTerminalLockContract(terminalLock.value, this.runId);
    }
    const finalization = await this.readOptionalArtifactSnapshot<CampaignRunFinalization>(
      this.path("finalization.json"),
      "campaign finalization",
    );
    if (finalization) {
      validateCurrentFinalizationContract(finalization.value, this.runId);
    }
    const activeLock = await this.readOptionalArtifactSnapshot<CampaignMutationLock>(
      this.mutationLockPath,
      "campaign mutation lock",
    );
    if (activeLock) validateMutationLock(activeLock.value, this.runId);
    const quarantinePaths = await this.mutationQuarantines();
    const quarantines: ArtifactSnapshot<CampaignMutationLock>[] = [];
    for (const path of quarantinePaths) {
      const quarantine = await this.readOptionalArtifactSnapshot<CampaignMutationLock>(
        path,
        "quarantined campaign mutation lock",
      );
      if (!quarantine) {
        throw new TransientCampaignMutationGovernanceChange(path);
      }
      validateMutationLock(quarantine.value, this.runId);
      quarantines.push(quarantine);
    }
    return {
      reservation: reservationSnapshot,
      lease: leaseSnapshot,
      claim,
      receipt,
      terminal_lock: terminalLock,
      finalization,
      active_lock: activeLock,
      quarantines,
    };
  }

  private async assertMutationGovernanceCurrent(
    expected: CampaignMutationGovernanceSnapshot,
  ): Promise<void> {
    const current = await this.captureMutationGovernance();
    if (
      this.mutationGovernanceIdentity(current) !==
      this.mutationGovernanceIdentity(expected)
    ) {
      throw new TransientCampaignMutationGovernanceChange(this.runId);
    }
  }

  private async readMutationLock(
    path: string,
    label: string,
    options: { allowTransientRelease?: boolean } = {},
  ): Promise<CampaignMutationLock | null> {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const metadata = await lstat(path).catch((error) => {
        if (
          error &&
          typeof error === "object" &&
          "code" in error &&
          error.code === "ENOENT"
        ) {
          return null;
        }
        throw error;
      });
      if (!metadata) return null;
      try {
        const lock = await readBoundedStructuredJson<CampaignMutationLock>(path, label);
        validateMutationLock(lock, this.runId);
        return lock;
      } catch (error) {
        const transient =
          error &&
          typeof error === "object" &&
          (("code" in error && error.code === "ENOENT") ||
            (error instanceof CascadeError &&
              (error.message.includes("changed identity or permissions while being read") ||
                error.message.includes("escapes its physical root after open"))));
        if (!options.allowTransientRelease || !transient || attempt === 3) {
          throw error;
        }
        const current = await lstat(path).catch((currentError) => {
          if (
            currentError &&
            typeof currentError === "object" &&
            "code" in currentError &&
            currentError.code === "ENOENT"
          ) {
            return null;
          }
          throw currentError;
        });
        if (!current) return null;
        if (current.isSymbolicLink() || !current.isFile()) throw error;
        await Bun.sleep(0);
      }
    }
    return null;
  }

  private async processIsLive(pid: number): Promise<boolean> {
    try {
      process.kill(pid, 0);
      return true;
    } catch (error) {
      return !(
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "ESRCH"
      );
    }
  }

  private async mutationQuarantines(): Promise<string[]> {
    const prefix = `.${this.runId}.mutation.lock.quarantine-`;
    const entries = await readdir(this.artifactRoot, { withFileTypes: true });
    const paths: string[] = [];
    for (const entry of entries) {
      if (!entry.name.startsWith(prefix)) continue;
      if (entry.isSymbolicLink() || !entry.isFile()) {
        throw new CascadeError(
          `campaign mutation lock quarantine must be a regular file: ${entry.name}`,
        );
      }
      paths.push(resolve(this.artifactRoot, entry.name));
    }
    return paths.sort();
  }

  private async reconcileMutationTakeover(options: {
    stale_lock_recovery_reason?: string;
  }): Promise<{ lockToken: string; acquired: boolean } | null> {
    const reconciliationBoundary = utcNow();
    let runtimeReceiptDigest: string | null = null;
    for (
      let attempt = 0;
      attempt < MUTATION_GOVERNANCE_RETRY_LIMIT;
      attempt += 1
    ) {
      let governance: CampaignMutationGovernanceSnapshot;
      try {
        governance = await this.captureMutationGovernance();
      } catch (error) {
        if (error instanceof TransientCampaignMutationGovernanceChange) continue;
        throw error;
      }
      const quarantines = governance.quarantines.map((snapshot) =>
        this.mutationQuarantinePath(snapshot.value.token)
      );
      const claim = governance.claim?.value ?? null;
      if (!claim) {
        if (quarantines.length) {
          throw new CascadeError(
            `orphan campaign mutation lock quarantine requires reconciliation: ${this.runId}`,
          );
        }
        return null;
      }
      if (
        !options.stale_lock_recovery_reason?.trim() ||
        options.stale_lock_recovery_reason !== claim.reason
      ) {
        throw new CascadeError(
          `campaign mutation lock takeover claim requires its exact recovery reason: ${this.runId}`,
        );
      }
      const reservation = governance.reservation.value;
      const recovery = reservation.identities.recovery;
      if (
        !this.authority ||
        stableJson(this.authority.principal) !== stableJson(recovery)
      ) {
        throw new CascadeError(
          "campaign mutation lock takeover reconciliation requires the reserved recovery identity",
        );
      }
      const currentLease = governance.lease.value;
      if (stableJson(currentLease) !== stableJson(claim.lease_state)) {
        throw new CascadeError(
          `campaign mutation lock takeover claim lease generation changed: ${this.runId}`,
        );
      }
      const operatorOwned =
        stableJson(claim.previous_lock.owner) ===
        stableJson(reservation.identities.operator);
      if (
        operatorOwned &&
        (compareRequiredRfc3339Instants(
          "campaign mutation lock takeover reconciliation time",
          reconciliationBoundary,
          "embedded campaign lease expiry",
          claim.lease_state.expires_at,
        ) < 0 ||
          compareRequiredRfc3339Instants(
            "campaign mutation lock takeover reconciliation time",
            reconciliationBoundary,
            "current campaign lease expiry",
            currentLease.expires_at,
          ) < 0)
      ) {
        throw new CascadeError(
          `campaign mutation lock takeover claim precedes operator lease expiry: ${this.runId}`,
        );
      }
      const quarantinePath = this.mutationQuarantinePath(
        claim.previous_lock.token,
      );
      if (
        quarantines.some((path) => path !== quarantinePath) ||
        quarantines.length > 1
      ) {
        throw new CascadeError(
          `campaign mutation lock takeover has an unrelated quarantine: ${this.runId}`,
        );
      }
      const claimDigest = sha256Text(stableJson(claim));
      const receiptPath = this.mutationTakeoverReceiptPath(
        claim.previous_lock.token,
      );
      let receipt = governance.receipt?.value ?? null;
      if (receipt) {
        validateMutationLockTakeoverReceipt(receipt, this.runId, reservation);
        if (
          receipt.claim_digest !== claimDigest ||
          stableJson(mutationTakeoverClaimFromReceipt(receipt)) !==
            stableJson(claim)
        ) {
          throw new CascadeError(
            `campaign mutation lock takeover receipt does not match its claim: ${this.runId}`,
          );
        }
      }
      const chronologyContext: CampaignMutationTakeoverChronologyContext = {
        terminal_lock: governance.terminal_lock?.value ?? null,
        finalization: governance.finalization?.value ?? null,
      };
      if (chronologyContext.finalization !== null) {
        if (
          chronologyContext.terminal_lock === null ||
          chronologyContext.finalization.status !==
            chronologyContext.terminal_lock.status ||
          chronologyContext.finalization.completed_at !==
            chronologyContext.finalization.finalized_at ||
          compareRequiredRfc3339Instants(
            "campaign finalization completion",
            chronologyContext.finalization.completed_at,
            "campaign terminal lock production",
            chronologyContext.terminal_lock.produced_at,
          ) < 0 ||
          chronologyContext.finalization.terminal_lock_digest !==
            governance.terminal_lock!.record.sha256
        ) {
          throw new CascadeError(
            `campaign mutation lock takeover has invalid terminal finalization context: ${this.runId}`,
          );
        }
      }
      validateMutationTakeoverReconciliationChronology(
        claim,
        receipt,
        receipt !== null &&
            runtimeReceiptDigest === sha256Text(stableJson(receipt))
          ? null
          : reconciliationBoundary,
        chronologyContext,
      );
      if (chronologyContext.finalization !== null) {
        throw new CascadeError(`campaign run ${this.runId} is already finalized`);
      }
      let active = governance.active_lock?.value ?? null;
      let quarantined = governance.quarantines.find(
        (snapshot) =>
          snapshot.record.path === normalizedRelative(this.runRoot, quarantinePath),
      )?.value ?? null;
      if (
        receipt &&
        active &&
        stableJson(active) === stableJson(claim.previous_lock)
      ) {
        throw new CascadeError(
          `campaign mutation lock takeover receipt cannot coexist with its active previous lock: ${this.runId}`,
        );
      }
      if (active && stableJson(active) === stableJson(claim.previous_lock)) {
        if (await this.processIsLive(active.pid)) {
          throw new CascadeError(
            `campaign mutation lock takeover claim targets a live process: ${this.runId}`,
          );
        }
        if (quarantined) {
          throw new CascadeError(
            `campaign mutation lock exists both active and quarantined: ${this.runId}`,
          );
        }
        try {
          await this.assertMutationGovernanceCurrent(governance);
          await renameDurably(this.mutationLockPath, quarantinePath);
        } catch (error) {
          if (
            error &&
            typeof error === "object" &&
            "code" in error &&
            error.code === "ENOENT"
          ) {
            continue;
          }
          throw error;
        }
        continue;
      }
      if (active && active.token !== claim.successor_token) {
        throw new CascadeError(
          `campaign mutation lock takeover found an unrelated active lock: ${this.runId}`,
        );
      }
      if (quarantined && stableJson(quarantined) !== stableJson(claim.previous_lock)) {
        throw new CascadeError(
          `campaign mutation lock changed during recovery quarantine: ${this.runId}`,
        );
      }
      if (quarantined && !receipt) {
        receipt = {
          ...claim,
          artifact_type: "campaign-mutation-lock-takeover",
          claim_digest: claimDigest,
          quarantined_at: utcNow(),
        };
        validateMutationLockTakeoverReceipt(receipt, this.runId, reservation);
        if (
          receipt.claim_digest !== claimDigest ||
          stableJson(mutationTakeoverClaimFromReceipt(receipt)) !==
            stableJson(claim)
        ) {
          throw new CascadeError(
            `campaign mutation lock takeover receipt does not match its claim: ${this.runId}`,
          );
        }
        validateMutationTakeoverReconciliationChronology(
          claim,
          receipt,
          null,
          chronologyContext,
        );
        boundedStructuredJson(receipt, "campaign mutation lock takeover receipt", {
          pretty: true,
        });
        await this.prepareArtifactWrite(receiptPath);
        try {
          await this.assertMutationGovernanceCurrent(governance);
          await writeDurableJsonExclusive(receiptPath, receipt);
          runtimeReceiptDigest = sha256Text(stableJson(receipt));
        } catch (error) {
          if (
            error &&
            typeof error === "object" &&
            "code" in error &&
            error.code === "EEXIST"
          ) {
            continue;
          }
          throw error;
        }
        continue;
      }
      if (!receipt) {
        throw new CascadeError(
          `campaign mutation lock takeover claim lost its previous lock: ${this.runId}`,
        );
      }
      if (quarantined) {
        try {
          await this.assertMutationGovernanceCurrent(governance);
          await unlinkDurably(quarantinePath);
        } catch (error) {
          if (
            error &&
            typeof error === "object" &&
            "code" in error &&
            error.code === "ENOENT"
          ) {
            continue;
          }
          throw error;
        }
        continue;
      }
      let acquired = false;
      active = await this.readMutationLock(
        this.mutationLockPath,
        "campaign mutation lock",
      );
      if (!active) {
        const successor: CampaignMutationLock = {
          schema_version: CAMPAIGN_ARTIFACT_SCHEMA_VERSION,
          artifact_type: "campaign-mutation-lock",
          run_id: this.runId,
          pid: process.pid,
          token: claim.successor_token,
          acquired_at: utcNow(),
          owner: recovery,
          lease_id: null,
          lease_generation: claim.lease_generation,
          takeover_claim_digest: claimDigest,
        };
        try {
          await this.assertMutationGovernanceCurrent(governance);
          await writeDurableJsonExclusive(this.mutationLockPath, successor);
          acquired = true;
          active = successor;
          governance = await this.captureMutationGovernance();
        } catch (error) {
          if (
            error &&
            typeof error === "object" &&
            "code" in error &&
            error.code === "EEXIST"
          ) {
            continue;
          }
          throw error;
        }
      }
      if (
        active.token !== claim.successor_token ||
        stableJson(active.owner) !== stableJson(recovery) ||
        active.lease_id !== null ||
        active.lease_generation !== claim.lease_generation ||
        active.takeover_claim_digest !== claimDigest
      ) {
        throw new CascadeError(
          `campaign mutation lock takeover successor does not match its claim: ${this.runId}`,
        );
      }
      try {
        await this.assertMutationGovernanceCurrent(governance);
        await unlinkDurably(this.mutationTakeoverClaimPath);
      } catch (error) {
        if (
          !error ||
          typeof error !== "object" ||
          !("code" in error) ||
          error.code !== "ENOENT"
        ) {
          throw error;
        }
      }
      return { lockToken: claim.successor_token, acquired };
    }
    throw new CascadeError(
      `campaign mutation lock takeover could not reach a stable phase: ${this.runId}`,
    );
  }

  private async claimStaleMutationLock(
    existing: CampaignMutationLock,
    reason: string,
  ): Promise<void> {
    if (await this.processIsLive(existing.pid)) {
      throw new CascadeError(
        `stale campaign mutation lock belongs to a live process: ${this.runId}`,
      );
    }
    if (!this.authority) {
      throw new CascadeError(
        "stale campaign mutation lock recovery requires explicit recovery authority",
      );
    }
    const governance = await this.captureMutationGovernance();
    if (
      !governance.active_lock ||
      stableJson(governance.active_lock.value) !== stableJson(existing)
    ) {
      throw new TransientCampaignMutationGovernanceChange(this.runId);
    }
    const reservation = governance.reservation.value;
    const recovery = reservation.identities.recovery;
    if (stableJson(this.authority.principal) !== stableJson(recovery)) {
      throw new CascadeError(
        "stale campaign mutation lock recovery requires the reserved recovery identity",
      );
    }
    const currentLease = governance.lease.value;
    const operatorOwned =
      stableJson(existing.owner) === stableJson(reservation.identities.operator);
    const recoveryOwned = stableJson(existing.owner) === stableJson(recovery);
    if (!operatorOwned && !recoveryOwned) {
      throw new CascadeError(
        "stale campaign mutation lock owner is not a reserved recovery participant",
      );
    }
    if (
      existing.lease_generation !== currentLease.generation ||
      (operatorOwned &&
        (existing.lease_id !== currentLease.lease_id ||
          compareRequiredRfc3339Instants(
              "current time",
              new Date().toISOString(),
              "current lease expiry",
              currentLease.expires_at,
            ) < 0)) ||
      (recoveryOwned && existing.lease_id !== null)
    ) {
      throw new CascadeError(
        "stale campaign mutation lock does not match the recoverable lease generation",
      );
    }
    const claim: CampaignMutationLockTakeoverClaim = {
      schema_version: CAMPAIGN_ARTIFACT_SCHEMA_VERSION,
      artifact_type: "campaign-mutation-lock-takeover-claim",
      run_id: this.runId,
      previous_lock: existing,
      previous_lock_digest: sha256Text(stableJson(existing)),
      lease_state: currentLease,
      lease_state_digest: sha256Text(stableJson(currentLease)),
      lease_generation: currentLease.generation,
      recovery_identity: recovery,
      reason,
      quarantined_path: normalizedRelative(
        this.artifactRoot,
        this.mutationQuarantinePath(existing.token),
      ),
      successor_token: crypto.randomUUID(),
      created_at: utcNow(),
    };
    boundedStructuredJson(claim, "campaign mutation lock takeover claim", {
      pretty: true,
    });
    try {
      await this.assertMutationGovernanceCurrent(governance);
      await writeDurableJsonExclusive(this.mutationTakeoverClaimPath, claim);
    } catch (error) {
      if (
        !error ||
        typeof error !== "object" ||
        !("code" in error) ||
        error.code !== "EEXIST"
      ) {
        throw error;
      }
    }
  }

  private async withMutationLock<T>(
    operation: () => Promise<T>,
    options: {
      allow_incomplete_finalization?: boolean;
      stale_lock_recovery_reason?: string;
    } = {},
  ): Promise<T> {
    const started = Date.now();
    let lockToken: string | null = null;
    await this.ensureMaintainersOnlyDirectory(this.artifactRoot);
    while (!lockToken) {
      const recovery = await this.reconcileMutationTakeover(options);
      if (recovery?.acquired) {
        lockToken = recovery.lockToken;
        break;
      }
      try {
        const acquisitionGovernance = await this.captureMutationGovernance();
        const leaseGeneration = acquisitionGovernance.lease.value.generation;
        const candidateToken = crypto.randomUUID();
        const lock: CampaignMutationLock = {
          schema_version: CAMPAIGN_ARTIFACT_SCHEMA_VERSION,
          artifact_type: "campaign-mutation-lock",
          run_id: this.runId,
          pid: process.pid,
          token: candidateToken,
          acquired_at: utcNow(),
          owner: this.authority?.principal ?? null,
          lease_id: this.authority?.lease_id ?? null,
          lease_generation: leaseGeneration,
          takeover_claim_digest: null,
        };
        await this.assertMutationGovernanceCurrent(acquisitionGovernance);
        await writeDurableJsonExclusive(this.mutationLockPath, lock);
        if (await lstat(this.mutationTakeoverClaimPath).catch(() => null)) {
          await unlinkDurably(this.mutationLockPath).catch(() => undefined);
          continue;
        }
        lockToken = candidateToken;
      } catch (error) {
        if (error instanceof TransientCampaignMutationGovernanceChange) {
          if (Date.now() - started >= MUTATION_LOCK_TIMEOUT_MS) {
            throw new CascadeError(
              `timed out acquiring campaign mutation lock: ${this.runId}`,
            );
          }
          await Bun.sleep(0);
          continue;
        }
        if (
          !error ||
          typeof error !== "object" ||
          !("code" in error) ||
          error.code !== "EEXIST"
        ) {
          throw error;
        }
        if (
          (await exists(this.path("finalization.json"))) ||
          ((await exists(this.path("terminal.lock"))) &&
            !options.allow_incomplete_finalization)
        ) {
          throw new CascadeError(`campaign run ${this.runId} is already finalized`);
        }
        const existing = await this.readMutationLock(
          this.mutationLockPath,
          "campaign mutation lock",
          { allowTransientRelease: true },
        );
        if (!existing) continue;
        const stale = compareRequiredRfc3339Instants(
          "campaign mutation lock acquisition",
          existing.acquired_at,
          "campaign mutation lock stale threshold",
          new Date(Date.now() - MUTATION_LOCK_TIMEOUT_MS).toISOString(),
        ) <= 0;
        if (stale) {
          if (!options.stale_lock_recovery_reason?.trim()) {
            throw new CascadeError(
              `stale campaign mutation lock requires explicit recovery: ${this.runId}`,
            );
          }
          await this.claimStaleMutationLock(
            existing,
            options.stale_lock_recovery_reason,
          );
          continue;
        }
        if (Date.now() - started >= MUTATION_LOCK_TIMEOUT_MS) {
          throw new CascadeError(
            `timed out acquiring campaign mutation lock: ${this.runId}; stale locks fail closed and require explicit recovery`,
          );
        }
        await Bun.sleep(5);
      }
    }
    try {
      await this.assertMutable(options);
      if (await lstat(this.mutationTakeoverClaimPath).catch(() => null)) {
        throw new CascadeError(
          `campaign mutation lock takeover remains unreconciled: ${this.runId}`,
        );
      }
      if ((await this.mutationQuarantines()).length) {
        throw new CascadeError(
          `campaign mutation lock quarantine remains unreconciled: ${this.runId}`,
        );
      }
      return await operation();
    } finally {
      const lock = await this.readMutationLock(
        this.mutationLockPath,
        "campaign mutation lock",
      ).catch(() => null);
      if (lock?.token === lockToken) {
        await unlinkDurably(this.mutationLockPath).catch(() => undefined);
      }
    }
  }

  async readCurrentLease(): Promise<CampaignLeaseState> {
    const reservation = await this.readReservation();
    const path = this.path("lease.json");
    if (!(await exists(path))) {
      const lease = {
        schema_version: CAMPAIGN_ARTIFACT_SCHEMA_VERSION,
        artifact_type: "campaign-run-lease",
        run_id: this.runId,
        generation: 0,
        renewed_at: reservation.lease.acquired_at,
        ...reservation.lease,
      } satisfies CampaignLeaseState;
      validateLeaseStateContract(
        lease,
        this.runId,
        CAMPAIGN_ARTIFACT_SCHEMA_VERSION,
      );
      validateLeaseStateBinding(lease, reservation);
      return lease;
    }
    const lease = await readBoundedStructuredJson<unknown>(
      path,
      "campaign lease state",
    );
    validateLeaseStateContract(
      lease,
      this.runId,
      CAMPAIGN_ARTIFACT_SCHEMA_VERSION,
    );
    validateLeaseStateBinding(lease, reservation);
    return lease as CampaignLeaseState;
  }

  private async assertOperatorLease(): Promise<CampaignRunReservation> {
    if (!this.authority) {
      throw new CascadeError("campaign artifact mutation requires explicit authority");
    }
    const reservation = await this.readReservation();
    const lease = await this.readCurrentLease();
    const operator = reservation.identities.operator;
    if (
      this.authority.principal.role !== "simulation-operator" ||
      this.authority.principal.session_id !== operator.session_id ||
      this.authority.principal.subject !== operator.subject ||
      this.authority.lease_id !== lease.lease_id ||
      lease.owner_session_id !== operator.session_id
    ) {
      throw new CascadeError(
        "campaign artifact mutation requires the reserved operator lease",
      );
    }
    if (
      compareRequiredRfc3339Instants(
        "current time",
        new Date().toISOString(),
        "campaign operator lease expiry",
        lease.expires_at,
      ) >= 0
    ) {
      throw new CascadeError("campaign operator lease is expired");
    }
    return reservation;
  }

  private async assertSafeAncestors(path: string): Promise<void> {
    let current = dirname(path);
    while (
      current === this.runRoot ||
      current.startsWith(`${this.runRoot}${sep}`)
    ) {
      const metadata = await lstat(current).catch(() => null);
      if (metadata?.isSymbolicLink()) {
        throw new CascadeError(
          `artifact path has a symbolic-link ancestor: ${normalizedRelative(this.runRoot, current)}`,
        );
      }
      if (current === this.runRoot) break;
      current = dirname(current);
    }
  }

  private async appendBoundedStructuredLine(
    path: string,
    value: unknown,
    label: string,
  ): Promise<void> {
    const serialized = boundedStructuredJson(value, label);
    const bytes = Buffer.from(`${serialized}\n`, "utf8");
    scanForSecrets(bytes, "no-secrets-v1", this.sensitiveValues);
    await this.prepareArtifactWrite(path);
    const handle = await open(
      path,
      constants.O_WRONLY |
        constants.O_APPEND |
        constants.O_CREAT |
        constants.O_NOFOLLOW,
      0o600,
    );
    try {
      await handle.chmod(ARTIFACT_FILE_MODE);
      const metadata = await handle.stat();
      if (!metadata.isFile()) {
        throw new CascadeError(`${label} must be a regular file`);
      }
      if (metadata.size + bytes.byteLength > DEFAULT_EVIDENCE_LIMIT_BYTES) {
        throw new CascadeError(
          `${label} exceeds ${DEFAULT_EVIDENCE_LIMIT_BYTES} bytes`,
        );
      }
      let offset = 0;
      while (offset < bytes.byteLength) {
        const { bytesWritten } = await handle.write(bytes.subarray(offset));
        if (bytesWritten === 0) {
          throw new CascadeError(`${label} append made no progress`);
        }
        offset += bytesWritten;
      }
    } finally {
      await handle.close();
    }
  }

  async reserve(
    input: ReserveCampaignRunInput,
  ): Promise<CampaignRunReservation> {
    const inputSnapshot = requireExactOwnDataObject(
      input,
      "campaign reservation input",
      [
        "campaign_id",
        "campaign_digest",
        "attempt",
        "simulation_scope",
        "claim_ids",
        "specialized_evaluation",
        "identities",
        "lease",
      ],
      ["parent_run_id"],
    );
    const hasParentRunId = Object.prototype.hasOwnProperty.call(
      inputSnapshot,
      "parent_run_id",
    );
    if (typeof inputSnapshot.campaign_id !== "string") {
      throw new CascadeError("campaign_id must be a string");
    }
    if (typeof inputSnapshot.campaign_digest !== "string") {
      throw new CascadeError("campaign_digest must be a string");
    }
    requireNonEmpty("campaign_id", inputSnapshot.campaign_id);
    requireNonEmpty("campaign_digest", inputSnapshot.campaign_digest);
    if (
      !Number.isInteger(inputSnapshot.attempt) ||
      (inputSnapshot.attempt as number) < 1
    ) {
      throw new CascadeError("campaign attempt must be a positive integer");
    }
    if (
      hasParentRunId &&
      inputSnapshot.parent_run_id !== null &&
      typeof inputSnapshot.parent_run_id !== "string"
    ) {
      throw new CascadeError("campaign parent_run_id must be a string or null");
    }
    const attempt = inputSnapshot.attempt as number;
    const parentRunId = hasParentRunId
      ? inputSnapshot.parent_run_id as string | null
      : null;
    if (
      (attempt === 1 && parentRunId !== null) ||
      (attempt > 1 && parentRunId === null)
    ) {
      throw new CascadeError(
        "campaign retry parent must be absent for attempt 1 and present for later attempts",
      );
    }
    if (parentRunId === this.runId) {
      throw new CascadeError("campaign retry cannot name its own run as parent");
    }
    validateSimulationScope(inputSnapshot.simulation_scope);
    if (
      !Array.isArray(inputSnapshot.claim_ids) ||
      !inputSnapshot.claim_ids.length ||
      inputSnapshot.claim_ids.some((claimId) => typeof claimId !== "string" || !claimId) ||
      new Set(inputSnapshot.claim_ids).size !== inputSnapshot.claim_ids.length
    ) {
      throw new CascadeError("campaign reservation claim_ids are invalid");
    }
    validateSpecializedEvaluationDeclaration(
      inputSnapshot.specialized_evaluation,
      inputSnapshot.simulation_scope,
    );
    const identities = normalizeIdentities(
      inputSnapshot.identities,
      inputSnapshot.simulation_scope,
    );
    const lease = normalizeLease(inputSnapshot.lease);
    if (lease.owner_session_id !== identities.operator.session_id) {
      throw new CascadeError(
        "campaign lease owner must match the reserved operator session",
      );
    }

    const reservation: CampaignRunReservation = {
      schema_version: CAMPAIGN_ARTIFACT_SCHEMA_VERSION,
      artifact_type: "campaign-run-reservation",
      run_id: this.runId,
      campaign_id: inputSnapshot.campaign_id,
      campaign_digest: inputSnapshot.campaign_digest,
      attempt,
      parent_run_id: parentRunId,
      reserved_at: utcNow(),
      simulation_scope: inputSnapshot.simulation_scope,
      claim_ids: inputSnapshot.claim_ids,
      specialized_evaluation: inputSnapshot.specialized_evaluation,
      identities,
      lease,
    };
    const leaseState = {
      schema_version: CAMPAIGN_ARTIFACT_SCHEMA_VERSION,
      artifact_type: "campaign-run-lease",
      run_id: this.runId,
      generation: 0,
      renewed_at: lease.acquired_at,
      ...lease,
    } satisfies CampaignLeaseState;
    validateReservationContract(
      reservation,
      this.runId,
      CAMPAIGN_ARTIFACT_SCHEMA_VERSION,
    );
    validateLeaseStateContract(
      leaseState,
      this.runId,
      CAMPAIGN_ARTIFACT_SCHEMA_VERSION,
    );
    validateLeaseStateBinding(leaseState, reservation);
    const reservationText = `${boundedStructuredJson(
      reservation,
      "campaign reservation",
      { pretty: true },
    )}\n`;
    const leaseStateText = `${boundedStructuredJson(
      leaseState,
      "campaign lease state",
      { pretty: true },
    )}\n`;

    await this.ensureMaintainersOnlyDirectory(this.artifactRoot);
    try {
      await mkdir(this.runRoot, { mode: ARTIFACT_DIRECTORY_MODE });
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "EEXIST"
      ) {
        throw new CascadeError(
          `campaign run already reserved: ${this.runId}; retry with a new run id or recover the existing run`,
        );
      }
      throw error;
    }
    await writeTextExclusive(
      this.path("reservation.json"),
      reservationText,
      ARTIFACT_WRITE_OPTIONS,
    );
    await writeTextExclusive(
      this.path("lease.json"),
      leaseStateText,
      ARTIFACT_WRITE_OPTIONS,
    );
    return reservation;
  }

  private async readReservationForSchemaVersion(
    schemaVersion: typeof CAMPAIGN_ARTIFACT_SCHEMA_VERSION,
  ): Promise<CampaignRunReservation>;
  private async readReservationForSchemaVersion(
    schemaVersion: typeof LEGACY_CAMPAIGN_ARTIFACT_SCHEMA_VERSION,
  ): Promise<LegacyCampaignRunReservation>;
  private async readReservationForSchemaVersion(
    schemaVersion: typeof PREVIOUS_CAMPAIGN_ARTIFACT_SCHEMA_VERSION,
  ): Promise<PreviousCampaignRunReservation>;
  private async readReservationForSchemaVersion(
    schemaVersion:
      CampaignArtifactSchemaVersion,
  ): Promise<VersionedCampaignRunReservation> {
    const reservation = await readBoundedStructuredJson<unknown>(
      this.path("reservation.json"),
      "campaign reservation",
    );
    validateReservationContract(reservation, this.runId, schemaVersion);
    return reservation;
  }

  async readReservation(): Promise<CampaignRunReservation> {
    return this.readReservationForSchemaVersion(
      CAMPAIGN_ARTIFACT_SCHEMA_VERSION,
    );
  }

  private async readCurrentReservationForVerification(
    schemaVersion: typeof CAMPAIGN_ARTIFACT_SCHEMA_VERSION | typeof PREVIOUS_CAMPAIGN_ARTIFACT_SCHEMA_VERSION,
  ): Promise<CampaignRunReservation | PreviousCampaignRunReservation> {
    const reservation = await readBoundedStructuredJson<unknown>(
      this.path("reservation.json"),
      "campaign reservation",
    );
    validateReservationContract(
      reservation,
      this.runId,
      schemaVersion,
      true,
    );
    return reservation as CampaignRunReservation | PreviousCampaignRunReservation;
  }

  private async validateRefinementLinkage(
    proposal: PersonaRefinementProposal,
    reservation: CampaignRunReservation,
    sourceManifest?: Record<string, unknown>,
    evaluationReceipt?: Record<string, unknown>,
  ): Promise<void> {
    const source = sourceManifest ?? requireRecord(
      await readBoundedStructuredJson<unknown>(
        this.path("execution/source-manifest.json"),
        "source manifest",
      ),
      "source manifest",
    );
    const evaluation = evaluationReceipt ?? requireRecord(
      await readBoundedStructuredJson<unknown>(
        this.path(`evaluations/${proposal.evaluation_id}/receipt.json`),
        "evaluation receipt",
      ),
      "evaluation receipt",
    );
    assertIdentity(source, reservation, "source manifest");
    assertIdentity(evaluation, reservation, "evaluation receipt");
    if (
      evaluation.evaluation_id !== proposal.evaluation_id ||
      evaluation.evaluator_identity !== proposal.proposed_by ||
      evaluation.evaluator_identity !== reservation.identities.evaluator.subject
    ) {
      throw new CascadeError(
        `refinement ${proposal.proposal_id} is not bound to the reserved evaluation and evaluator`,
      );
    }
    if (!Array.isArray(evaluation.refinement_proposal_bindings)) {
      throw new CascadeError(
        `evaluation ${proposal.evaluation_id} lacks refinement proposal bindings`,
      );
    }
    const bindings = evaluation.refinement_proposal_bindings.map((value, index) =>
      requireRecord(value, `refinement proposal binding ${index}`),
    );
    const binding = bindings.find(
      (value) => value.proposal_id === proposal.proposal_id,
    );
    if (
      !binding ||
      binding.candidate_digest !== refinementProposalCandidateDigest(proposal)
    ) {
      throw new CascadeError(
        `refinement ${proposal.proposal_id} does not match its evaluation candidate digest`,
      );
    }
    const inputManifest = requireRecord(
      await readBoundedStructuredJson<unknown>(
        this.path(`evaluations/${proposal.evaluation_id}/input/input-manifest.json`),
        "evaluation input manifest",
      ),
      "evaluation input manifest",
    );
    if (!Array.isArray(inputManifest.files)) {
      throw new CascadeError("evaluation input manifest files are missing");
    }
    const inputFiles = inputManifest.files.map((value, index) =>
      requireRecord(value, `evaluation input file ${index}`),
    );
    const inputPaths = inputFiles.map((file) => String(file.path));
    if (
      new Set(inputPaths).size !== inputPaths.length ||
      inputManifest.manifest_digest !== sha256Text(stableJson(inputFiles)) ||
      inputManifest.manifest_digest !== evaluation.input_manifest_digest
    ) {
      throw new CascadeError(
        `refinement ${proposal.proposal_id} evaluation input manifest is stale or mismatched`,
      );
    }
    if (!Array.isArray(source.definitions)) {
      throw new CascadeError("source manifest definitions are missing");
    }
    const definitions = source.definitions.map((value, index) =>
      requireRecord(value, `source definition ${index}`),
    );
    for (const reference of [proposal.persona, proposal.derivation]) {
      if (
        !definitions.some(
          (definition) =>
            definition.path === reference.path &&
            definition.sha256 === reference.sha256,
        )
      ) {
        throw new CascadeError(
          `refinement ${proposal.proposal_id} source binding is absent from the source manifest: ${reference.path}`,
        );
      }
    }
    for (const evidencePath of proposal.evidence_paths) {
      const inputFile = inputFiles.find((file) => file.path === evidencePath);
      const evidence = this.path(
        `evaluations/${proposal.evaluation_id}/input/${evidencePath}`,
      );
      const metadata = await lstat(evidence).catch(() => null);
      if (
        !inputFile ||
        typeof inputFile.sha256 !== "string" ||
        !/^[a-f0-9]{64}$/.test(inputFile.sha256) ||
        !metadata?.isFile() ||
        metadata.isSymbolicLink()
      ) {
        throw new CascadeError(
          `refinement ${proposal.proposal_id} cites missing frozen evaluation evidence: ${evidencePath}`,
        );
      }
      if ((await fileRecord(this.runRoot, evidence)).sha256 !== inputFile.sha256) {
        throw new CascadeError(
          `refinement ${proposal.proposal_id} frozen evaluation evidence digest is stale: ${evidencePath}`,
        );
      }
    }
  }

  async writeStageJson(
    relativePath: string,
    value: unknown,
  ): Promise<void> {
    await this.withMutationLock(async () => {
      const reservation = await this.assertOperatorLease();
      const normalized = relativePath.replaceAll("\\", "/");
      if (
        normalized.startsWith("/") ||
        normalized
          .split("/")
          .some((part) => !part || part === "." || part === "..")
      ) {
        throw new CascadeError(`invalid artifact stage path: ${relativePath}`);
      }
      const [namespace] = normalized.split("/");
      if (/^execution\/tasks\/[^/]+\/handoff\.json$/.test(normalized)) {
        throw new CascadeError(
          "accepted runtime handoffs require receiver-authorized persistence",
        );
      }
      const topLevelAllowed =
        normalized === "summary.json" || normalized === "source-manifest.json";
      if (!topLevelAllowed && !MUTABLE_NAMESPACES.has(namespace)) {
        throw new CascadeError(
          `artifact stage path is outside a governed namespace: ${relativePath}`,
        );
      }
      if (namespace === "refinements") {
        if (!value || typeof value !== "object" || Array.isArray(value)) {
          throw new CascadeError(
            `campaign refinement ${relativePath} must be an object`,
          );
        }
        const proposal = value as Record<string, unknown>;
        validatePersonaRefinementProposal(
          proposal,
          `campaign refinement ${relativePath}`,
        );
        if (
          proposal.run_id !== this.runId ||
          proposal.campaign_id !== reservation.campaign_id ||
          proposal.proposed_by !== reservation.identities.evaluator.subject
        ) {
          throw new CascadeError(
            `campaign refinement ${relativePath} does not match the reserved run, campaign, and evaluator`,
          );
        }
        if (normalized !== `refinements/${proposal.proposal_id}.json`) {
          throw new CascadeError(
            `campaign refinement path must match proposal_id: ${proposal.proposal_id}`,
          );
        }
        await this.validateRefinementLinkage(
          proposal as unknown as PersonaRefinementProposal,
          reservation,
        );
      }
      const serialized = stableJson(value);
      boundedStructuredJson(value, `artifact stage JSON ${relativePath}`, {
        pretty: true,
      });
      scanForSecrets(
        Buffer.from(serialized, "utf8"),
        "no-secrets-v1",
        this.sensitiveValues,
      );
      const destination = this.path(normalized);
      await this.prepareArtifactWrite(destination);
      await writeJsonExclusive(destination, value, ARTIFACT_WRITE_OPTIONS);
    });
  }

  async writeRuntimeHandoffAcceptance(
    relativePath: string,
    value: RuntimeHandoffReceipt,
  ): Promise<void> {
    await this.withMutationLock(async () => {
      const reservation = await this.readReservation();
      const receiver =
        reservation.identities.specialized_evaluator ??
        reservation.identities.evaluator;
      if (
        !this.authority ||
        this.authority.lease_id !== null ||
        stableJson(this.authority.principal) !== stableJson(receiver)
      ) {
        throw new CascadeError(
          "runtime handoff acceptance requires the reserved receiver authority without the operator lease",
        );
      }
      const normalized = relativePath.replaceAll("\\", "/");
      const match = /^execution\/tasks\/([^/]+)\/handoff\.json$/.exec(normalized);
      if (!match) {
        throw new CascadeError(
          `runtime handoff acceptance path is invalid: ${relativePath}`,
        );
      }
      validateRuntimeHandoffReceipt(value, { authority: receiver });
      if (value.disposition !== "ACCEPTED" || value.task_id !== match[1]) {
        throw new CascadeError(
          "receiver-authorized runtime handoff must be an ACCEPTED receipt at its exact task path",
        );
      }
      const offerPath = `execution/tasks/${value.task_id}/handoff-offer.json`;
      const offer = await this.readArtifactJson<RuntimeHandoffReceipt>(
        offerPath,
        `runtime handoff offer ${value.task_id}`,
      );
      validateRuntimeHandoffReceipt(offer, {
        authority: reservation.identities.operator,
      });
      if (
        offer.disposition !== "PENDING" ||
        value.offer_receipt_digest !== runtimeHandoffReceiptDigest(offer)
      ) {
        throw new CascadeError(
          "receiver-authorized runtime handoff does not bind the pending operator offer",
        );
      }
      for (const field of [
        "run_id",
        "campaign_id",
        "task_id",
        "terminal_status",
        "task_result_digest",
        "source_manifest_digest",
        "evidence_manifest_digest",
        "recovery_receipt_digest",
        "cleanup_receipt_digest",
        "retry_lineage",
        "proposed_next_owner",
        "proposed_next_gate",
        "producer_principal",
        "receiver_principal",
      ] as const) {
        if (stableJson(value[field]) !== stableJson(offer[field])) {
          throw new CascadeError(
            `receiver-authorized runtime handoff changes the operator offer field: ${field}`,
          );
        }
      }
      const receivingReferences = value.artifact_references.filter(
        (reference) => reference.sha256 === value.receiving_receipt_digest,
      );
      const expectedPrefix = reservation.identities.specialized_evaluator
        ? "specialized-evaluations/"
        : "evaluations/";
      const receivingReference = receivingReferences.find(
        (reference) =>
          reference.path.startsWith(expectedPrefix) &&
          reference.path.endsWith("/receipt.json"),
      );
      if (
        !receivingReference ||
        receivingReferences.length !== 1 ||
        value.required_inputs.length !== value.artifact_references.length ||
        stableJson(value.required_inputs) !==
          stableJson(value.artifact_references.map((reference) => reference.path))
      ) {
        throw new CascadeError(
          "receiver-authorized runtime handoff lacks one exact receiving receipt reference",
        );
      }
      const receivingReceipt = requireRecord(
        await this.readArtifactJson<unknown>(
          receivingReference.path,
          `runtime handoff receiving receipt ${value.task_id}`,
        ),
        `runtime handoff receiving receipt ${value.task_id}`,
      );
      const receiverIdentityField = reservation.identities.specialized_evaluator
        ? "specialized_evaluator_identity"
        : "evaluator_identity";
      if (
        sha256Text(stableJson(receivingReceipt)) !== value.receiving_receipt_digest ||
        receivingReceipt.run_id !== reservation.run_id ||
        receivingReceipt.campaign_id !== reservation.campaign_id ||
        receivingReceipt[receiverIdentityField] !== receiver.subject
      ) {
        throw new CascadeError(
          "receiver-authorized runtime handoff receiving receipt is stale or belongs to another authority",
        );
      }
      const expectedReferences = [
        ...offer.artifact_references,
        receivingReference,
      ].sort((left, right) => left.path.localeCompare(right.path));
      if (
        stableJson(value.artifact_references) !== stableJson(expectedReferences) ||
        stableJson(value.required_inputs) !==
          stableJson(expectedReferences.map((reference) => reference.path))
      ) {
        throw new CascadeError(
          "receiver-authorized runtime handoff changes or omits offer artifacts",
        );
      }
      const destination = this.path(normalized);
      await this.prepareArtifactWrite(destination);
      await writeJsonExclusive(destination, value, ARTIFACT_WRITE_OPTIONS);
    });
  }

  async writeStageText(
    relativePath: string,
    value: string,
    options: {
      redaction_profile?: FreezeCampaignFileInput["redaction_profile"];
      max_bytes?: number;
    } = {},
  ): Promise<void> {
    await this.withMutationLock(async () => {
      await this.assertOperatorLease();
      const normalized = relativePath.replaceAll("\\", "/");
      if (
        normalized.startsWith("/") ||
        normalized
          .split("/")
          .some((part) => !part || part === "." || part === "..")
      ) {
        throw new CascadeError(`invalid artifact stage path: ${relativePath}`);
      }
      const [namespace] = normalized.split("/");
      if (!MUTABLE_NAMESPACES.has(namespace)) {
        throw new CascadeError(
          `artifact stage path is outside a governed namespace: ${relativePath}`,
        );
      }
      const bytes = Buffer.from(value, "utf8");
      const limit = options.max_bytes ?? DEFAULT_EVIDENCE_LIMIT_BYTES;
      if (bytes.byteLength > limit) {
        throw new CascadeError(
          `artifact stage text exceeds ${limit} bytes: ${relativePath}`,
        );
      }
      scanForSecrets(
        bytes,
        options.redaction_profile ?? "no-secrets-v1",
        this.sensitiveValues,
      );
      const destination = this.path(normalized);
      await this.prepareArtifactWrite(destination);
      await writeFile(destination, bytes, {
        flag: "wx",
        mode: ARTIFACT_FILE_MODE,
      });
    });
  }

  private async readBoundedSourceFile(
    sourcePath: string,
    label: string,
    limit: number,
  ): Promise<Buffer> {
    if (!Number.isInteger(limit) || limit < 1) {
      throw new CascadeError("artifact byte limit must be a positive integer");
    }
    await assertNoSymlinkAncestors(sourcePath, label);
    const canonicalRoot = await realpath(dirname(sourcePath)).catch(() => null);
    if (canonicalRoot === null) {
      throw new CascadeError(`${label} physical root is missing or invalid`);
    }
    const before = await lstat(sourcePath).catch(() => null);
    if (!before) {
      throw new CascadeError(`${label} is missing: ${sourcePath}`);
    }
    if (before.isSymbolicLink()) {
      throw new CascadeError(`${label} must not be a symbolic-link: ${sourcePath}`);
    }

    let handle;
    try {
      handle = await open(
        sourcePath,
        constants.O_RDONLY | constants.O_NONBLOCK | constants.O_NOFOLLOW,
      );
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        ["ELOOP", "EMLINK"].includes(String(error.code))
      ) {
        throw new CascadeError(
          `${label} must not be a symbolic-link: ${sourcePath}`,
        );
      }
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        ["ENXIO", "ENODEV", "EOPNOTSUPP"].includes(String(error.code))
      ) {
        throw new CascadeError(`${label} must be a regular file: ${sourcePath}`);
      }
      throw error;
    }
    try {
      const opened = await handle.stat();
      if (!opened.isFile()) {
        throw new CascadeError(`${label} must be a regular file: ${sourcePath}`);
      }
      if (
        opened.dev !== before.dev ||
        opened.ino !== before.ino ||
        opened.size !== before.size ||
        opened.mode !== before.mode ||
        opened.mtimeMs !== before.mtimeMs ||
        opened.ctimeMs !== before.ctimeMs
      ) {
        throw new CascadeError(`${label} changed while being opened: ${sourcePath}`);
      }
      if (opened.size > limit) {
        throw new CascadeError(`${label} exceeds ${limit} bytes: ${sourcePath}`);
      }
      await this.sourceReadCheckpoint?.("opened", sourcePath);
      await assertOpenedFileContained(
        sourcePath,
        handle.fd,
        canonicalRoot,
        label,
      );
      const bounded = Buffer.alloc(limit + 1);
      let offset = 0;
      while (offset < bounded.byteLength) {
        const chunk = await handle.read(
          bounded,
          offset,
          bounded.byteLength - offset,
          offset,
        );
        if (chunk.bytesRead === 0) break;
        offset += chunk.bytesRead;
      }
      if (offset > limit) {
        throw new CascadeError(
          `${label} exceeds ${limit} bytes while being read: ${sourcePath}`,
        );
      }
      const after = await handle.stat();
      await assertOpenedFileContained(
        sourcePath,
        handle.fd,
        canonicalRoot,
        label,
      );
      const current = await lstat(sourcePath).catch(() => null);
      if (
        !after.isFile() ||
        after.dev !== opened.dev ||
        after.ino !== opened.ino ||
        after.size !== opened.size ||
        after.mode !== opened.mode ||
        after.mtimeMs !== opened.mtimeMs ||
        after.ctimeMs !== opened.ctimeMs ||
        !current?.isFile() ||
        current.isSymbolicLink() ||
        current.dev !== opened.dev ||
        current.ino !== opened.ino ||
        current.size !== opened.size ||
        current.mode !== opened.mode ||
        current.mtimeMs !== opened.mtimeMs ||
        current.ctimeMs !== opened.ctimeMs
      ) {
        throw new CascadeError(`${label} changed while being read: ${sourcePath}`);
      }
      return bounded.subarray(0, offset);
    } finally {
      await handle.close();
    }
  }

  async writeStageFile(
    relativePath: string,
    sourcePath: string,
    options: {
      redaction_profile?: FreezeCampaignFileInput["redaction_profile"];
      max_bytes?: number;
    } = {},
  ): Promise<void> {
    const limit = options.max_bytes ?? DEFAULT_EVIDENCE_LIMIT_BYTES;
    const bytes = await this.readBoundedSourceFile(
      resolve(sourcePath),
      "artifact stage source",
      limit,
    );
    scanForSecrets(
      bytes,
      options.redaction_profile ?? "no-secrets-v1",
      this.sensitiveValues,
    );
    await this.writeStageText(relativePath, bytes.toString("utf8"), {
      redaction_profile: options.redaction_profile,
      max_bytes: limit,
    });
  }

  async appendLifecycle(value: unknown): Promise<void> {
    await this.withMutationLock(async () => {
      await this.assertOperatorLease();
      await this.appendBoundedStructuredLine(
        this.path("lifecycle.jsonl"),
        value,
        "campaign lifecycle",
      );
    });
  }

  async appendTrustedLifecycle(
    value: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    if ("at" in value || "clock_authority" in value) {
      throw new CascadeError(
        "trusted campaign lifecycle controls its own clock authority",
      );
    }
    return this.withMutationLock(async () => {
      await this.assertOperatorLease();
      const reservation = await this.readReservation();
      const lease = await this.readCurrentLease();
      return this.appendTrustedLifecycleWithinMutation(
        value,
        reservation,
        lease,
        this.clockInstant("campaign lifecycle"),
      );
    });
  }

  private async appendTrustedLifecycleWithinMutation(
    value: Record<string, unknown>,
    reservation: CampaignRunReservation,
    lease: CampaignLeaseState,
    at: string,
  ): Promise<Record<string, unknown>> {
      if (
        compareRfc3339Instants(reservation.reserved_at, at) > 0 ||
        compareRfc3339Instants(lease.renewed_at, at) > 0 ||
        compareRfc3339Instants(at, lease.expires_at) >= 0 ||
        this.authority?.lease_id !== lease.lease_id
      ) {
        throw new CascadeError(
          "trusted campaign lifecycle instant is outside reservation or active lease authority",
        );
      }
      const lifecyclePath = this.path("lifecycle.jsonl");
      const lifecycleSequence = (await exists(lifecyclePath))
        ? (await readBoundedStructuredText(lifecyclePath, "campaign lifecycle"))
            .split(/\r?\n/)
            .filter(Boolean).length
        : 0;
      const clockReceipt = {
        schema_version: 1,
        source: "campaign-artifact-store-clock",
        observed_at: at,
        reservation_digest: sha256Text(stableJson(reservation)),
        lease_id: lease.lease_id,
        lease_generation: lease.generation,
        lease_renewed_at: lease.renewed_at,
        lease_expires_at: lease.expires_at,
      };
      const receiptDigest = sha256Text(stableJson(clockReceipt));
      const receiptPath =
        `execution/lifecycle-clock/${String(lifecycleSequence).padStart(8, "0")}-${receiptDigest}.json`;
      const absoluteReceiptPath = this.path(receiptPath);
      await this.assertSafeAncestors(absoluteReceiptPath);
      await this.prepareArtifactWrite(absoluteReceiptPath);
      await writeJsonExclusive(
        absoluteReceiptPath,
        clockReceipt,
        ARTIFACT_WRITE_OPTIONS,
      );
      const event = {
        ...value,
        at,
        clock_authority: {
          ...clockReceipt,
          receipt_path: receiptPath,
          receipt_digest: receiptDigest,
        },
      };
      await this.appendBoundedStructuredLine(
        this.path("lifecycle.jsonl"),
        event,
        "campaign lifecycle",
      );
      return event;
  }

  async renewLease(
    ttlMs: number,
    now: Date = new Date(),
  ): Promise<CampaignLeaseState> {
    if (!Number.isInteger(ttlMs) || ttlMs < 1_000 || ttlMs > 24 * 60 * 60 * 1000) {
      throw new CascadeError(
        "campaign lease renewal ttl must be between 1000ms and 24 hours",
      );
    }
    return this.withMutationLock(async () => {
      await this.assertOperatorLease();
      const current = await this.readCurrentLease();
      const currentExpiry = requireRfc3339Instant(
        "campaign operator lease expiry",
        current.expires_at,
      );
      const currentRenewal = requireRfc3339Instant(
        "campaign operator lease renewal",
        current.renewed_at,
      );
      const nowTimestamp = now.toISOString();
      if (compareRfc3339Instants(nowTimestamp, currentExpiry)! >= 0) {
        throw new CascadeError("campaign operator lease is expired");
      }
      if (compareRfc3339Instants(nowTimestamp, currentRenewal)! < 0) {
        throw new CascadeError("campaign lease renewal time cannot move backwards");
      }
      const requestedExpiry = new Date(now.getTime() + ttlMs).toISOString();
      const renewed: CampaignLeaseState = {
        ...current,
        generation: current.generation + 1,
        renewed_at: nowTimestamp,
        expires_at:
          compareRfc3339Instants(currentExpiry, requestedExpiry)! >= 0
            ? currentExpiry
            : requestedExpiry,
      };
      validateLease(renewed);
      boundedStructuredJson(renewed, "campaign lease state", { pretty: true });
      await this.prepareArtifactWrite(this.path("lease.json"));
      await writeJsonAtomic(
        this.path("lease.json"),
        renewed,
        ARTIFACT_WRITE_OPTIONS,
      );
      const reservation = await this.readReservation();
      await this.appendTrustedLifecycleWithinMutation(
        {
          status: "HEARTBEAT",
          lease_id: renewed.lease_id,
          lease_generation: renewed.generation,
          expires_at: renewed.expires_at,
        },
        reservation,
        renewed,
        renewed.renewed_at,
      );
      return renewed;
    });
  }

  async takeoverExpiredLease(input: {
    lease_id: string;
    ttl_ms: number;
    reason: string;
    now?: Date;
  }): Promise<CampaignLeaseState> {
    requireNonEmpty("replacement lease id", input.lease_id);
    requireNonEmpty("lease takeover reason", input.reason);
    if (
      !Number.isInteger(input.ttl_ms) ||
      input.ttl_ms < 1_000 ||
      input.ttl_ms > 24 * 60 * 60 * 1_000
    ) {
      throw new CascadeError(
        "campaign lease takeover ttl must be between 1000ms and 24 hours",
      );
    }
    await this.assertOperationalLifecycleFreshness();
    return this.withMutationLock(async () => {
      if (!this.authority) {
        throw new CascadeError(
          "campaign lease takeover requires explicit recovery authority",
        );
      }
      const reservation = await this.readReservation();
      const recovery = reservation.identities.recovery;
      if (
        this.authority.principal.role !== "simulation-recovery" ||
        this.authority.principal.session_id !== recovery.session_id ||
        this.authority.principal.subject !== recovery.subject
      ) {
        throw new CascadeError(
          "campaign lease takeover requires the reserved recovery identity",
        );
      }
      const current = await this.readCurrentLease();
      const now = input.now ?? new Date();
      if (
        compareRequiredRfc3339Instants(
          "lease takeover time",
          now.toISOString(),
          "campaign operator lease expiry",
          current.expires_at,
        ) < 0
      ) {
        throw new CascadeError(
          "campaign operator lease is still active and cannot be taken over",
        );
      }
      if (input.lease_id === current.lease_id) {
        throw new CascadeError(
          "campaign replacement lease id must differ from the expired lease",
        );
      }
      const nextGeneration = current.generation + 1;
      const receiptPath = this.path(
        `recovery/lease-takeovers/${String(nextGeneration).padStart(8, "0")}.json`,
      );
      if (await exists(receiptPath)) {
        const pending = await readBoundedStructuredJson<unknown>(
          receiptPath,
          "pending campaign lease takeover receipt",
        );
        validateLeaseTakeoverReceiptContract(pending, this.runId);
        if (
          stableJson(pending.previous_lease) !== stableJson(current) ||
          pending.previous_generation !== current.generation ||
          pending.previous_lease_digest !== sha256Text(stableJson(current)) ||
          pending.replacement_lease.generation !== nextGeneration ||
          pending.replacement_lease.lease_id !== input.lease_id ||
          stableJson(pending.recovery_identity) !== stableJson(recovery)
        ) {
          throw new CascadeError(
            "pending campaign lease takeover receipt is stale or mismatched",
          );
        }
        scanForSecrets(
          Buffer.from(stableJson(pending), "utf8"),
          "no-secrets-v1",
          this.sensitiveValues,
        );
        if (
          compareRequiredRfc3339Instants(
            "lease takeover time",
            now.toISOString(),
            "pending campaign replacement lease expiry",
            pending.replacement_lease.expires_at,
          ) >= 0
        ) {
          throw new CascadeError(
            "pending campaign replacement lease expired before activation",
          );
        }
        boundedStructuredJson(
          pending.replacement_lease,
          "campaign lease state",
          { pretty: true },
        );
        await this.prepareArtifactWrite(this.path("lease.json"));
        await writeJsonAtomic(
          this.path("lease.json"),
          pending.replacement_lease,
          ARTIFACT_WRITE_OPTIONS,
        );
        await this.appendBoundedStructuredLine(
          this.path("lifecycle.jsonl"),
          {
            status: "LEASE_TAKEOVER_RECOVERED",
            at: now.toISOString(),
            lease_id: pending.replacement_lease.lease_id,
            lease_generation: pending.replacement_lease.generation,
            takeover_receipt_digest: sha256Text(stableJson(pending)),
          },
          "campaign lifecycle",
        );
        return pending.replacement_lease;
      }
      const replacement: CampaignLeaseState = {
        schema_version: CAMPAIGN_ARTIFACT_SCHEMA_VERSION,
        artifact_type: "campaign-run-lease",
        run_id: this.runId,
        lease_id: input.lease_id,
        owner_session_id: reservation.identities.operator.session_id,
        acquired_at: now.toISOString(),
        expires_at: new Date(now.getTime() + input.ttl_ms).toISOString(),
        recovery_mode: "FINALIZE_UNKNOWN_OUTCOME",
        generation: nextGeneration,
        renewed_at: now.toISOString(),
      };
      validateLease(replacement);
      const receipt: CampaignLeaseTakeoverReceipt = {
        schema_version: CAMPAIGN_ARTIFACT_SCHEMA_VERSION,
        artifact_type: "campaign-lease-takeover",
        run_id: this.runId,
        previous_lease: current,
        previous_lease_digest: sha256Text(stableJson(current)),
        previous_generation: current.generation,
        replacement_lease: replacement,
        recovery_identity: recovery,
        reason: input.reason,
        created_at: now.toISOString(),
      };
      scanForSecrets(
        Buffer.from(stableJson(receipt), "utf8"),
        "no-secrets-v1",
        this.sensitiveValues,
      );
      boundedStructuredJson(receipt, "campaign lease takeover receipt", {
        pretty: true,
      });
      boundedStructuredJson(replacement, "campaign lease state", { pretty: true });
      await this.prepareArtifactWrite(receiptPath);
      await writeJsonExclusive(receiptPath, receipt, ARTIFACT_WRITE_OPTIONS);
      await this.prepareArtifactWrite(this.path("lease.json"));
      await writeJsonAtomic(
        this.path("lease.json"),
        replacement,
        ARTIFACT_WRITE_OPTIONS,
      );
      await this.appendBoundedStructuredLine(
        this.path("lifecycle.jsonl"),
        {
          status: "LEASE_TAKEOVER",
          at: replacement.renewed_at,
          previous_lease_digest: receipt.previous_lease_digest,
          lease_id: replacement.lease_id,
          lease_generation: replacement.generation,
          recovery_identity: recovery.subject,
          takeover_receipt_digest: sha256Text(stableJson(receipt)),
        },
        "campaign lifecycle",
      );
      return replacement;
    }, { stale_lock_recovery_reason: input.reason });
  }

  async appendSessionEvent(event: SimulationSessionEvent): Promise<void> {
    await this.withMutationLock(async () => {
      await this.assertOperatorLease();
      if (event.session_id !== this.runId) {
        throw new CascadeError(
          `simulation session event does not match run: ${event.session_id}/${this.runId}`,
        );
      }
      if (
        !/^[a-f0-9]{64}$/.test(event.contract_digest) ||
        event.event_digest !== simulationEventDigest(event)
      ) {
        throw new CascadeError("simulation session event digest is invalid");
      }
      const previousEvent = await this.readLastSessionEvent();
      if (
        event.sequence !== (previousEvent?.sequence ?? -1) + 1 ||
        event.previous_event_digest !== (previousEvent?.event_digest ?? null) ||
        (previousEvent !== null &&
          previousEvent.contract_digest !== event.contract_digest)
      ) {
        throw new CascadeError(
          "simulation session event does not extend the current journal",
        );
      }
      const serialized = stableJson(event);
      scanForSecrets(
        Buffer.from(serialized, "utf8"),
        "no-secrets-v1",
        this.sensitiveValues,
      );
      const path = this.sessionJournalSegmentPath(event.sequence);
      await this.appendBoundedStructuredLine(
        path,
        event,
        "simulation journal segment",
      );
    });
  }

  async writeSessionCheckpoint<TState>(
    checkpoint: SimulationSessionCheckpoint<TState>,
  ): Promise<void> {
    await this.withMutationLock(async () => {
      await this.assertOperatorLease();
      if (checkpoint.session_id !== this.runId) {
        throw new CascadeError(
          `simulation checkpoint does not match run: ${checkpoint.session_id}/${this.runId}`,
        );
      }
      if (
        !/^[a-f0-9]{64}$/.test(checkpoint.contract_digest) ||
        checkpoint.checkpoint_digest !== simulationCheckpointDigest(checkpoint) ||
        checkpoint.checkpoint_id !==
          `${this.runId}:checkpoint:${String(checkpoint.revision).padStart(8, "0")}`
      ) {
        throw new CascadeError("simulation checkpoint digest or identity is invalid");
      }
      const previousCheckpointPath =
        checkpoint.revision > 0
          ? this.sessionCheckpointPath(checkpoint.revision - 1)
          : null;
      if (
        checkpoint.revision === 0
          ? (await this.readLatestSessionCheckpoint<TState>()) !== null
          : !(await exists(previousCheckpointPath!))
      ) {
        throw new CascadeError(
          "simulation checkpoint does not extend the current revision",
        );
      }
      const journalHead = await this.readLastSessionEvent();
      if (
        checkpoint.last_event_digest !==
        (journalHead?.event_digest ?? null)
      ) {
        throw new CascadeError(
          "simulation checkpoint does not bind the current journal head",
        );
      }
      const serialized = stableJson(checkpoint);
      boundedStructuredJson(checkpoint, "simulation session checkpoint", {
        pretty: true,
      });
      scanForSecrets(
        Buffer.from(serialized, "utf8"),
        "no-secrets-v1",
        this.sensitiveValues,
      );
      const path = this.sessionCheckpointPath(checkpoint.revision);
      await this.assertSafeAncestors(path);
      await this.prepareArtifactWrite(path);
      await writeJsonExclusive(path, checkpoint, ARTIFACT_WRITE_OPTIONS);
    });
  }

  async readSessionEvents(): Promise<SimulationSessionEvent[]> {
    const paths: Array<{ path: string; segment: string | null }> = [];
    const legacyPath = this.path("execution/session/journal.jsonl");
    if (await exists(legacyPath)) {
      throw new CascadeError(
        "legacy unsegmented simulation journal is not valid for current runs",
      );
    }
    const directory = this.path("execution/session/journal");
    const entries = await readdir(directory, { withFileTypes: true }).catch(
      (error) => {
        if (
          error &&
          typeof error === "object" &&
          "code" in error &&
          error.code === "ENOENT"
        ) {
          return [];
        }
        throw error;
      },
    );
    for (const entry of entries) {
      if (entry.isSymbolicLink()) {
        throw new CascadeError("simulation journal segment cannot be a symlink");
      }
      if (entry.isFile() && /^\d{8}\.jsonl$/.test(entry.name)) {
        paths.push({
          path: resolve(directory, entry.name),
          segment: entry.name.slice(0, 8),
        });
      } else {
        throw new CascadeError(
          `simulation journal contains an invalid segment entry: ${entry.name}`,
        );
      }
    }
    const events: SimulationSessionEvent[] = [];
    for (const entry of paths.sort((left, right) =>
      left.path.localeCompare(right.path)
    )) {
      const segmentEvents = await this.readSessionEventFile(entry.path);
      if (
        entry.segment !== null &&
        (segmentEvents.length === 0 ||
          segmentEvents.some(
            (event) => sessionSegment(event.sequence) !== entry.segment,
          ))
      ) {
        throw new CascadeError(
          `simulation journal segment ${entry.segment} contains misplaced or no events`,
        );
      }
      events.push(...segmentEvents);
    }
    return events;
  }

  async readLatestSessionCheckpoint<TState>(): Promise<
    SimulationSessionCheckpoint<TState> | null
  > {
    return (await this.readSessionCheckpoints<TState>()).at(-1) ?? null;
  }

  async readSessionCheckpoints<TState>(): Promise<
    Array<SimulationSessionCheckpoint<TState>>
  > {
    const directory = this.path("execution/session/checkpoints");
    const entries = await readdir(directory, { withFileTypes: true }).catch((error) => {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "ENOENT"
      ) {
        return [];
      }
      throw error;
    });
    const candidates: Array<{ path: string; revision: number }> = [];
    for (const entry of entries) {
      if (entry.isSymbolicLink()) {
        throw new CascadeError("simulation checkpoint segment cannot be a symlink");
      }
      if (entry.isDirectory() && /^\d{8}$/.test(entry.name)) {
        const segmentDirectory = resolve(directory, entry.name);
        const segmentEntries = await readdir(segmentDirectory, {
          withFileTypes: true,
        });
        if (!segmentEntries.length) {
          throw new CascadeError(
            `simulation checkpoint segment ${entry.name} is empty`,
          );
        }
        for (const segmentEntry of segmentEntries) {
          if (segmentEntry.isSymbolicLink()) {
            throw new CascadeError(
              "simulation checkpoint cannot be a symlink",
            );
          }
          if (segmentEntry.isFile() && /^\d{8}\.json$/.test(segmentEntry.name)) {
            const revision = Number(segmentEntry.name.slice(0, 8));
            if (sessionSegment(revision) !== entry.name) {
              throw new CascadeError(
                `simulation checkpoint ${segmentEntry.name} is misplaced in segment ${entry.name}`,
              );
            }
            candidates.push({
              path: resolve(segmentDirectory, segmentEntry.name),
              revision,
            });
          } else {
            throw new CascadeError(
              `simulation checkpoint segment ${entry.name} contains an invalid entry: ${segmentEntry.name}`,
            );
          }
        }
      } else {
        throw new CascadeError(
          `simulation checkpoint contains an invalid segment entry: ${entry.name}`,
        );
      }
    }
    const sorted = candidates.sort((left, right) => left.revision - right.revision);
    if (
      sorted.some((candidate, index) => candidate.revision !== index) ||
      new Set(sorted.map((candidate) => candidate.revision)).size !== sorted.length
    ) {
      throw new CascadeError(
        "simulation checkpoint revision files are duplicate or gapped",
      );
    }
    const checkpoints: Array<SimulationSessionCheckpoint<TState>> = [];
    for (const candidate of sorted) {
      const checkpoint = await readBoundedStructuredJson<
        SimulationSessionCheckpoint<TState>
      >(candidate.path, "simulation session checkpoint");
      if (
        checkpoint.revision !== candidate.revision ||
        checkpoint.checkpoint_id !==
          `${this.runId}:checkpoint:${String(candidate.revision).padStart(8, "0")}`
      ) {
        throw new CascadeError(
          `simulation checkpoint file identity does not match revision ${candidate.revision}`,
        );
      }
      checkpoints.push(checkpoint);
    }
    return checkpoints;
  }

  async freezeFile(
    input: FreezeCampaignFileInput,
  ): Promise<FrozenCampaignArtifact> {
    return this.withMutationLock(async () => {
    await this.assertOperatorLease();
    requireNonEmpty("producer", input.producer);
    requireNonEmpty("platform", input.platform);
    const limit = input.max_bytes ?? DEFAULT_EVIDENCE_LIMIT_BYTES;
    if (!Number.isInteger(limit) || limit < 1) {
      throw new CascadeError("artifact byte limit must be a positive integer");
    }

    const sourcePath = resolve(input.source_path);
    const bytes = await this.readBoundedSourceFile(
      sourcePath,
      "artifact source",
      limit,
    );
    scanForSecrets(bytes, input.redaction_profile, this.sensitiveValues);

    const digest = sha256Bytes(bytes);
    const namespace = input.namespace.replaceAll("\\", "/");
    if (
      !namespace ||
      namespace.startsWith("/") ||
      namespace.includes("..") ||
      !MUTABLE_NAMESPACES.has(namespace.split("/")[0] ?? "")
    ) {
      throw new CascadeError(
        `artifact freeze namespace is not governed: ${input.namespace}`,
      );
    }
    const destination = this.path(`${namespace}/${digest}`);
    await this.prepareArtifactWrite(destination);
    try {
      await writeFile(destination, bytes, {
        flag: "wx",
        mode: ARTIFACT_FILE_MODE,
      });
    } catch (error) {
      if (
        !error ||
        typeof error !== "object" ||
        !("code" in error) ||
        error.code !== "EEXIST" ||
        (await fileRecord(this.runRoot, destination)).sha256 !== digest
      ) {
        throw error;
      }
    }

    return {
      ...(await fileRecord(this.runRoot, destination)),
      source_path: input.source_path,
      producer: input.producer,
      platform: input.platform,
      frozen_at: utcNow(),
      redaction_profile: input.redaction_profile,
      redaction_status: "CLEAN",
      lineage: {
        run_id: this.runId,
        source_digest: digest,
      },
    };
    });
  }

  private async validateLeaseTakeoverHistory(
    reservation: CampaignRunReservation | PreviousCampaignRunReservation,
    schemaVersion: typeof CAMPAIGN_ARTIFACT_SCHEMA_VERSION | typeof PREVIOUS_CAMPAIGN_ARTIFACT_SCHEMA_VERSION = CAMPAIGN_ARTIFACT_SCHEMA_VERSION,
  ): Promise<void> {
    const current = await readBoundedStructuredJson<unknown>(
      this.path("lease.json"),
      "campaign lease state",
    );
    validateLeaseStateContract(current, this.runId, schemaVersion);
    validateLeaseStateBinding(current, reservation);
    const lifecycle = (await readBoundedStructuredText(
      this.path("lifecycle.jsonl"),
      "campaign lifecycle",
    ))
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line, index) => {
        try {
          return requireRecord(JSON.parse(line), `lifecycle line ${index + 1}`);
        } catch (error) {
          if (error instanceof CascadeError) throw error;
          throw new CascadeError(`lifecycle line ${index + 1} is invalid JSON`);
        }
      });
    if (schemaVersion === CAMPAIGN_ARTIFACT_SCHEMA_VERSION) {
      const now = this.clockInstant("campaign lease history validation");
      const seenHeartbeatClockPaths = new Set<string>();
      for (const [index, heartbeat] of lifecycle
        .filter((event) => event.status === "HEARTBEAT")
        .entries()) {
        await this.authenticateLifecycleClockEvent(
          heartbeat,
          reservation as CampaignRunReservation,
          `campaign heartbeat ${index + 1}`,
          now,
          { seen_paths: seenHeartbeatClockPaths },
        );
      }
    }
    const directory = this.path("recovery/lease-takeovers");
    const entries = await readdir(directory, { withFileTypes: true }).catch(
      (error) => {
        if (
          error &&
          typeof error === "object" &&
          "code" in error &&
          error.code === "ENOENT"
        ) {
          return [];
        }
        throw error;
      },
    );
    const receipts: CampaignLeaseTakeoverReceipt[] = [];
    for (const entry of entries.sort((left, right) =>
      left.name.localeCompare(right.name)
    )) {
      if (entry.isSymbolicLink() || !entry.isFile()) {
        throw new CascadeError(
          "campaign lease takeover history contains an unsafe entry",
        );
      }
      if (!/^\d{8}\.json$/.test(entry.name)) {
        throw new CascadeError(
          `campaign lease takeover history has an invalid path: ${entry.name}`,
        );
      }
      const receipt = await readBoundedStructuredJson<unknown>(
        resolve(directory, entry.name),
        "campaign lease takeover receipt",
      );
      validateLeaseTakeoverReceiptContract(receipt, this.runId);
      const previous = receipt.previous_lease;
      const replacement = receipt.replacement_lease;
      if (
        previous.owner_session_id !==
          reservation.identities.operator.session_id ||
        receipt.previous_lease_digest !== sha256Text(stableJson(previous)) ||
        receipt.previous_generation !== previous.generation ||
        replacement.generation !== receipt.previous_generation + 1 ||
        replacement.owner_session_id !==
          reservation.identities.operator.session_id ||
        stableJson(receipt.recovery_identity) !==
          stableJson(reservation.identities.recovery)
      ) {
        throw new CascadeError(
          "campaign lease takeover receipt is invalid or mismatched",
        );
      }
      if (
        compareRequiredRfc3339Instants(
          "campaign replacement lease acquisition",
          replacement.acquired_at,
          "previous campaign lease expiry",
          previous.expires_at,
        ) < 0
      ) {
        throw new CascadeError(
          "campaign replacement lease was acquired before the prior lease expired",
        );
      }
      if (
        entry.name !==
        `${String(replacement.generation).padStart(8, "0")}.json`
      ) {
        throw new CascadeError(
          "campaign lease takeover path does not match its generation",
        );
      }
      receipts.push(receipt);
    }
    const generations = receipts.map(
      (receipt) => receipt.replacement_lease.generation,
    );
    if (
      new Set(generations).size !== generations.length ||
      generations.some(
        (generation, index) =>
          index > 0 && generation <= generations[index - 1]!,
      )
    ) {
      throw new CascadeError(
        "campaign lease takeover generations are duplicated or unordered",
      );
    }
    const latest = receipts.at(-1);
    const initialLease: CurrentShapeCampaignLeaseState = {
      schema_version: schemaVersion,
      artifact_type: "campaign-run-lease",
      run_id: this.runId,
      generation: 0,
      renewed_at: reservation.lease.acquired_at,
      ...reservation.lease,
    };
    for (const [index, receipt] of receipts.entries()) {
      const expectedPrevious =
        receipts[index - 1]?.replacement_lease ?? initialLease;
      if (
        !isProvenSameLeaseRenewal(
          expectedPrevious,
          receipt.previous_lease,
          lifecycle,
        )
      ) {
        throw new CascadeError(
          "campaign lease takeover history does not form a contiguous lease chain",
        );
      }
    }
    if (
      latest
        ? !isProvenSameLeaseRenewal(
          latest.replacement_lease,
            current as CurrentShapeCampaignLeaseState,
            lifecycle,
          )
        : current.lease_id !== reservation.lease.lease_id
    ) {
      throw new CascadeError(
        "campaign current lease is not bound to its takeover history",
      );
    }
  }

  private async validateCurrentClaimAuthority(
    sourceManifest: Record<string, unknown>,
    reservation: CampaignRunReservation,
  ): Promise<CurrentAuthoredClaim[]> {
    const sourceKeys = [
      "campaign_id",
      "claim_authority",
      "definitions",
      "dirty_source",
      "frozen_sources",
      "identity_envelope_digest",
      "platform",
      "run_id",
      "schema_version",
      "source_digest",
      "source_revision",
    ];
    if (
      Object.keys(sourceManifest).sort().join(",") !== sourceKeys.join(",") ||
      sourceManifest.schema_version !== 3 ||
      sourceManifest.run_id !== reservation.run_id ||
      sourceManifest.campaign_id !== reservation.campaign_id ||
      typeof sourceManifest.platform !== "string" ||
      !sourceManifest.platform ||
      typeof sourceManifest.source_revision !== "string" ||
      !sourceManifest.source_revision ||
      typeof sourceManifest.dirty_source !== "boolean"
    ) {
      throw new CascadeError("current source manifest claim authority binding is invalid");
    }
    const binding = requireExactOwnDataObject(
      sourceManifest.claim_authority,
      "source manifest claim authority binding",
      ["path", "sha256"],
    );
    const authorityPath = "execution/claim-authority.json";
    if (
      binding.path !== authorityPath ||
      typeof binding.sha256 !== "string" ||
      !/^[a-f0-9]{64}$/.test(binding.sha256)
    ) {
      throw new CascadeError("source manifest claim authority binding is invalid");
    }
    const authority = requireExactOwnDataObject(
      await readBoundedStructuredJson<unknown>(
        this.path(authorityPath),
        "campaign claim authority",
      ),
      "campaign claim authority",
      [
        "artifact_type",
        "campaign_digest",
        "campaign_id",
        "claims",
        "run_id",
        "schema_version",
      ],
    );
    const authorityRecord = await fileRecord(
      this.runRoot,
      this.path(authorityPath),
    );
    if (
      authority.schema_version !== 1 ||
      authority.artifact_type !== "campaign-claim-authority" ||
      authority.run_id !== reservation.run_id ||
      authority.campaign_id !== reservation.campaign_id ||
      authority.campaign_digest !== reservation.campaign_digest ||
      binding.sha256 !== authorityRecord.sha256 ||
      !Array.isArray(authority.claims)
    ) {
      throw new CascadeError("campaign claim authority is stale or mismatched");
    }
    const definitions = Array.isArray(sourceManifest.definitions)
      ? sourceManifest.definitions.map((item, index) =>
          requireExactOwnDataObject(item, `source definition ${index}`, ["path", "sha256"])
        )
      : [];
    for (const [index, definition] of definitions.entries()) {
      if (
        typeof definition.path !== "string" ||
        !definition.path ||
        definition.path.startsWith("/") ||
        definition.path.split("/").includes("..") ||
        typeof definition.sha256 !== "string" ||
        !/^[a-f0-9]{64}$/.test(definition.sha256)
      ) {
        throw new CascadeError(`source definition ${index} is invalid`);
      }
    }
    if (
      definitions.length === 0 ||
      new Set(definitions.map((item) => item.path)).size !== definitions.length ||
      sourceManifest.source_digest !== sha256Text(stableJson(definitions)) ||
      sourceManifest.identity_envelope_digest !==
        sha256Text(stableJson(reservation.identities))
    ) {
      throw new CascadeError(
        "source manifest definition or identity authority is stale, duplicated, or incomplete",
      );
    }
    const definitionDigests = new Map(
      definitions.map((item) => [String(item.path), String(item.sha256)]),
    );
    const frozenSources = Array.isArray(sourceManifest.frozen_sources)
      ? sourceManifest.frozen_sources.map((item, index) =>
          requireExactOwnDataObject(item, `frozen source ${index}`, [
            "frozen_at",
            "lineage",
            "path",
            "platform",
            "producer",
            "redaction_profile",
            "redaction_status",
            "sha256",
            "size",
            "source_path",
          ])
        )
      : [];
    if (
      frozenSources.length !== definitions.length ||
      new Set(frozenSources.map((item) => String(item.source_path))).size !==
        frozenSources.length
    ) {
      throw new CascadeError(
        "source manifest frozen-source correspondence is incomplete or duplicated",
      );
    }
    for (const [index, frozen] of frozenSources.entries()) {
      const lineage = requireExactOwnDataObject(
        frozen.lineage,
        `frozen source ${index} lineage`,
        ["run_id", "source_digest"],
      );
      const definition = definitions.find(
        (item) =>
          typeof frozen.source_path === "string" &&
          resolve(frozen.source_path) === resolve(item.path as string),
      );
      if (
        !definition ||
        typeof frozen.path !== "string" ||
        !frozen.path.startsWith("execution/source/") ||
        frozen.path.startsWith("/") ||
        frozen.path.split("/").includes("..") ||
        frozen.sha256 !== definition.sha256 ||
        lineage.run_id !== reservation.run_id ||
        lineage.source_digest !== definition.sha256 ||
        frozen.platform !== sourceManifest.platform ||
        typeof frozen.producer !== "string" ||
        !frozen.producer ||
        !isDateTime(frozen.frozen_at) ||
        frozen.redaction_profile !== "source-code-v1" ||
        frozen.redaction_status !== "CLEAN" ||
        !Number.isSafeInteger(frozen.size) ||
        Number(frozen.size) < 0
      ) {
        throw new CascadeError(`frozen source ${index} authority is invalid`);
      }
      const record = await fileRecord(this.runRoot, this.path(frozen.path));
      if (record.sha256 !== frozen.sha256 || record.size !== frozen.size) {
        throw new CascadeError(`frozen source ${index} differs from its manifest record`);
      }
    }
    const claims = authority.claims.map((item, index) => {
      const claim = requireExactOwnDataObject(
        item,
        `campaign claim authority ${index}`,
        ["claim_id", "class", "source_path", "source_sha256"],
      );
      if (
        typeof claim.claim_id !== "string" ||
        !claim.claim_id ||
        typeof claim.class !== "string" ||
        !CURRENT_CLAIM_CLASSES.has(claim.class) ||
        typeof claim.source_path !== "string" ||
        !claim.source_path ||
        claim.source_path.startsWith("/") ||
        claim.source_path.split("/").includes("..") ||
        typeof claim.source_sha256 !== "string" ||
        !/^[a-f0-9]{64}$/.test(claim.source_sha256) ||
        definitionDigests.get(claim.source_path) !== claim.source_sha256
      ) {
        throw new CascadeError(`campaign claim authority ${index} is invalid`);
      }
      return claim as {
        claim_id: string;
        class: string;
        source_path: string;
        source_sha256: string;
      };
    });
    if (
      new Set(claims.map((claim) => claim.claim_id)).size !== claims.length ||
      new Set(claims.map((claim) => claim.source_path)).size !== claims.length ||
      stableJson(claims.map((claim) => claim.claim_id)) !==
        stableJson(reservation.claim_ids)
    ) {
      throw new CascadeError("campaign claim authority IDs are incomplete or duplicated");
    }
    const authoredClaims: CurrentAuthoredClaim[] = [];
    for (const claim of claims) {
      const frozen = frozenSources.find(
        (source) =>
          typeof source.source_path === "string" &&
          resolve(source.source_path) === resolve(claim.source_path),
      );
      if (
        !frozen ||
        typeof frozen.path !== "string" ||
        frozen.sha256 !== claim.source_sha256
      ) {
        throw new CascadeError(
          `campaign claim authority lacks its exact frozen source: ${claim.claim_id}`,
        );
      }
      const frozenRecord = await fileRecord(
        this.runRoot,
        this.path(frozen.path),
      );
      const authored = requireRecord(
        await readBoundedStructuredJson<unknown>(
          this.path(frozen.path),
          `authored claim ${claim.claim_id}`,
        ),
        `authored claim ${claim.claim_id}`,
      );
      if (
        frozenRecord.sha256 !== claim.source_sha256 ||
        authored.id !== claim.claim_id ||
        authored.class !== claim.class
      ) {
        throw new CascadeError(
          `campaign claim authority differs from its authored source: ${claim.claim_id}`,
        );
      }
      authoredClaims.push({
        id: claim.claim_id,
        class: claim.class,
        source_path: claim.source_path,
        definition: authored,
      });
    }
    return authoredClaims;
  }

  private async readCurrentFrozenValue(
    sourceManifest: Record<string, unknown>,
    sourcePath: string,
    label: string,
  ): Promise<unknown> {
    if (!sourcePath || sourcePath.startsWith("/") || sourcePath.split("/").includes("..")) {
      throw new CascadeError(`${label} source path is invalid`);
    }
    const definitions = Array.isArray(sourceManifest.definitions)
      ? sourceManifest.definitions.map((item, index) =>
          requireExactOwnDataObject(item, `source definition ${index}`, ["path", "sha256"])
        )
      : [];
    const definition = definitions.filter(
      (item) => typeof item.path === "string" && resolve(item.path) === resolve(sourcePath),
    );
    const frozenSources = Array.isArray(sourceManifest.frozen_sources)
      ? sourceManifest.frozen_sources.map((item, index) =>
          requireRecord(item, `frozen source ${index}`)
        )
      : [];
    const frozen = frozenSources.filter(
      (item) =>
        typeof item.source_path === "string" &&
        resolve(item.source_path) === resolve(sourcePath),
    );
    if (
      definition.length !== 1 ||
      frozen.length !== 1 ||
      typeof definition[0]!.sha256 !== "string" ||
      definition[0]!.sha256 !== frozen[0]!.sha256 ||
      typeof frozen[0]!.path !== "string"
    ) {
      throw new CascadeError(`${label} is absent, duplicated, or stale in frozen source authority`);
    }
    const record = await fileRecord(this.runRoot, this.path(frozen[0]!.path as string));
    if (record.sha256 !== definition[0]!.sha256) {
      throw new CascadeError(`${label} differs from its frozen source digest`);
    }
    return readBoundedStructuredJson<unknown>(
      this.path(frozen[0]!.path as string),
      label,
    );
  }

  private async readCurrentFrozenJson(
    sourceManifest: Record<string, unknown>,
    sourcePath: string,
    label: string,
  ): Promise<Record<string, unknown>> {
    return requireRecord(
      await this.readCurrentFrozenValue(sourceManifest, sourcePath, label),
      label,
    );
  }

  private async currentMechanicalProjection(input: {
    sourceManifest: Record<string, unknown>;
    reservation: CampaignRunReservation;
    execution: Record<string, unknown>;
    calibration: Record<string, unknown> | null;
    claims: readonly CurrentAuthoredClaim[];
    specializedBinding: Record<string, unknown> | null;
    relativeFiles: readonly string[];
    evaluationAt: string;
  }): Promise<{
    campaign: Record<string, unknown>;
    profile: Record<string, unknown>;
    rubric: Record<string, unknown> | null;
    mechanical: { claim_ledger: CurrentTerminalClaim[]; status: CurrentTerminalStatus };
  }> {
    const definitions = Array.isArray(input.sourceManifest.definitions)
      ? input.sourceManifest.definitions.map((item, index) =>
          requireExactOwnDataObject(item, `source definition ${index}`, ["path", "sha256"])
        )
      : [];
    if (input.reservation.campaign_digest !== input.sourceManifest.source_digest) {
      throw new CascadeError("campaign reservation is not bound to the full frozen source graph");
    }
    const dynamicDefinitions = definitions.filter(
      (item) => !new Set<string>(CAMPAIGN_FIXED_SOURCE_FILES).has(String(item.path)),
    );
    const campaignCandidates: Array<{ path: string; value: Record<string, unknown> }> = [];
    for (const definition of dynamicDefinitions) {
      const candidate = await this.readCurrentFrozenJson(
        input.sourceManifest,
        String(definition.path),
        `authored campaign candidate ${String(definition.path)}`,
      ).catch(() => null);
      if (
        candidate?.id === input.reservation.campaign_id &&
        Array.isArray(candidate.task_files) &&
        typeof candidate.evaluation_profile_file === "string"
      ) {
        campaignCandidates.push({ path: String(definition.path), value: candidate });
      }
    }
    const campaignBindings = campaignCandidates.map((candidate) => ({ path: candidate.path }));
    if (
      campaignBindings.length !== 1 ||
      typeof campaignBindings[0]!.path !== "string"
    ) {
      throw new CascadeError("frozen authored campaign authority is missing or ambiguous");
    }
    const campaign = campaignCandidates[0]!.value;
    if (
      campaign.id !== input.reservation.campaign_id ||
      typeof campaign.evaluation_profile_file !== "string" ||
      !campaign.evaluation_profile_file
    ) {
      throw new CascadeError("frozen authored campaign identity or evaluation profile binding is stale");
    }
    const profile = await this.readCurrentFrozenJson(
      input.sourceManifest,
      campaign.evaluation_profile_file,
      "authored evaluation profile",
    );
    if (
      profile.schema_version !== 1 ||
      typeof profile.id !== "string" ||
      !profile.id ||
      (profile.provider !== "fixture" && profile.provider !== "codex")
    ) {
      throw new CascadeError("frozen authored evaluation profile is invalid");
    }
    let rubric: Record<string, unknown> | null = null;
    if (profile.rubric_file !== undefined) {
      if (typeof profile.rubric_file !== "string" || !profile.rubric_file) {
        throw new CascadeError("frozen authored evaluation profile rubric binding is invalid");
      }
      rubric = await this.readCurrentFrozenJson(
        input.sourceManifest,
        profile.rubric_file,
        "authored evaluation rubric",
      );
      if (rubric.schema_version !== 1 || typeof rubric.id !== "string" || !rubric.id) {
        throw new CascadeError("frozen authored evaluation rubric is invalid");
      }
    }

    const taskFiles = Array.isArray(campaign.task_files)
      ? campaign.task_files
      : [];
    const authoredTasks = await Promise.all(taskFiles.map(async (path, index) => {
      if (typeof path !== "string" || !path) {
        throw new CascadeError(`authored campaign task binding ${index} is invalid`);
      }
      const task = await this.readCurrentFrozenJson(
        input.sourceManifest,
        path,
        `authored campaign task ${index}`,
      );
      if (typeof task.id !== "string" || !task.id || typeof task.required !== "boolean") {
        throw new CascadeError(`authored campaign task ${index} is invalid`);
      }
      return task;
    }));
    const authoredPolicies = new Map<string, Record<string, unknown>>();
    for (const [index, path] of (Array.isArray(campaign.policy_files)
      ? campaign.policy_files
      : []).entries()) {
      if (typeof path !== "string" || !path) {
        throw new CascadeError(`authored campaign policy binding ${index} is invalid`);
      }
      const policy = await this.readCurrentFrozenJson(
        input.sourceManifest,
        path,
        `authored campaign policy ${index}`,
      );
      if (typeof policy.id !== "string" || !policy.id || authoredPolicies.has(policy.id)) {
        throw new CascadeError(`authored campaign policy ${index} is invalid or duplicated`);
      }
      authoredPolicies.set(policy.id, policy);
    }
    const authoredOracles = new Map<string, Record<string, unknown>>();
    for (const [index, path] of (Array.isArray(campaign.oracle_files)
      ? campaign.oracle_files
      : []).entries()) {
      if (typeof path !== "string" || !path) {
        throw new CascadeError(`authored campaign oracle binding ${index} is invalid`);
      }
      const oracle = await this.readCurrentFrozenJson(
        input.sourceManifest,
        path,
        `authored campaign oracle ${index}`,
      );
      if (
        typeof oracle.id !== "string" ||
        !oracle.id ||
        typeof oracle.type !== "string" ||
        !oracle.type ||
        authoredOracles.has(oracle.id)
      ) {
        throw new CascadeError(`authored campaign oracle ${index} is invalid or duplicated`);
      }
      authoredOracles.set(oracle.id, oracle);
    }

    const expectedDynamicSources = new Set<string>([
      String(campaignBindings[0]!.path),
      String(campaign.evaluation_profile_file),
      ...(typeof profile.rubric_file === "string" ? [profile.rubric_file] : []),
    ]);
    let authoredFixture: Record<string, unknown> = {};
    const addPaths = (value: unknown, label: string): string[] => {
      if (!Array.isArray(value)) return [];
      if (value.some((item) => typeof item !== "string" || !item)) {
        throw new CascadeError(`${label} contains an invalid source path`);
      }
      for (const path of value as string[]) expectedDynamicSources.add(path);
      return value as string[];
    };
    if (typeof campaign.simulation_file === "string" && campaign.simulation_file) {
      expectedDynamicSources.add(campaign.simulation_file);
      const sourceSimulation = await this.readCurrentFrozenJson(
        input.sourceManifest,
        campaign.simulation_file,
        "authored simulation source closure",
      );
      for (const populationPath of addPaths(
        sourceSimulation.population_files,
        "authored simulation population_files",
      )) {
        const population = await this.readCurrentFrozenJson(
          input.sourceManifest,
          populationPath,
          `authored population source closure ${populationPath}`,
        );
        if (population.schema_version === 2) {
          const source = requireRecord(population.source, `population source ${populationPath}`);
          const derivationBinding = requireRecord(
            source.derivation,
            `population derivation binding ${populationPath}`,
          );
          if (typeof derivationBinding.path !== "string" || !derivationBinding.path) {
            throw new CascadeError(`population derivation binding ${populationPath} is invalid`);
          }
          expectedDynamicSources.add(derivationBinding.path);
          const derivation = await this.readCurrentFrozenJson(
            input.sourceManifest,
            derivationBinding.path,
            `population derivation source closure ${populationPath}`,
          );
          for (const [personaIndex, personaValue] of (Array.isArray(derivation.product_personas)
            ? derivation.product_personas
            : []).entries()) {
            const persona = requireRecord(
              personaValue,
              `population derivation persona ${populationPath}/${personaIndex}`,
            );
            if (typeof persona.path !== "string" || !persona.path) {
              throw new CascadeError(`population derivation persona ${populationPath}/${personaIndex} is invalid`);
            }
            expectedDynamicSources.add(persona.path);
          }
        }
      }
      addPaths(sourceSimulation.scenario_files, "authored simulation scenario_files");
      addPaths(sourceSimulation.metric_files, "authored simulation metric_files");
      addPaths(sourceSimulation.treatment_files, "authored simulation treatment_files");
      for (const key of ["dataset_file", "world_file", "calibration_file"] as const) {
        const path = sourceSimulation[key];
        if (path !== undefined) {
          if (typeof path !== "string" || !path) {
            throw new CascadeError(`authored simulation ${key} is invalid`);
          }
          expectedDynamicSources.add(path);
          if (key === "world_file") {
            const world = await this.readCurrentFrozenJson(
              input.sourceManifest,
              path,
              "authored world source closure",
            );
            if (typeof world.fixture_file !== "string" || !world.fixture_file) {
              throw new CascadeError("authored world fixture_file is invalid");
            }
            expectedDynamicSources.add(world.fixture_file);
            authoredFixture = await this.readCurrentFrozenJson(
              input.sourceManifest,
              world.fixture_file,
              "authored world fixture authority",
            );
          } else if (key === "calibration_file") {
            const calibrationDefinition = await this.readCurrentFrozenJson(
              input.sourceManifest,
              path,
              "authored calibration source closure",
            );
            for (const scoreKey of ["simulated_scores_file", "reference_scores_file"] as const) {
              const scorePath = calibrationDefinition[scoreKey];
              if (typeof scorePath !== "string" || !scorePath) {
                throw new CascadeError(`authored calibration ${scoreKey} is invalid`);
              }
              expectedDynamicSources.add(scorePath);
            }
          }
        }
      }
    }
    for (const key of ["task_files", "claim_files", "policy_files", "oracle_files"] as const) {
      addPaths(campaign[key], `authored campaign ${key}`);
    }
    for (const task of authoredTasks) {
      addPaths(task.inputs, `authored task ${String(task.id)} inputs`);
    }
    for (const key of ["seed_binding_file", "intake_file"] as const) {
      const path = campaign[key];
      if (path !== undefined) {
        if (typeof path !== "string" || !path) {
          throw new CascadeError(`authored campaign ${key} is invalid`);
        }
        expectedDynamicSources.add(path);
        if (key === "intake_file") {
          const intake = await this.readCurrentFrozenJson(
            input.sourceManifest,
            path,
            "authored intake source closure",
          );
          if (intake.status === "READY") {
            const envelope = requireRecord(intake.task_envelope, "authored intake task envelope");
            const context = requireRecord(intake.product_context, "authored intake product context");
            for (const [label, sourcePath] of [
              ["task envelope", envelope.path],
              ["brief", context.brief_path],
              ["output", context.output_path],
            ] as const) {
              if (typeof sourcePath !== "string" || !sourcePath) {
                throw new CascadeError(`authored intake ${label} source binding is invalid`);
              }
              expectedDynamicSources.add(sourcePath);
            }
          }
        }
      }
    }
    const actualSources = definitions.map((item) => String(item.path)).sort();
    const expectedSources = [
      ...new Set<string>([
        ...CAMPAIGN_FIXED_SOURCE_FILES,
        ...expectedDynamicSources,
      ]),
    ].sort();
    if (stableJson(actualSources) !== stableJson(expectedSources)) {
      throw new CascadeError(
        "frozen campaign dependency closure is incomplete or contains unreferenced definitions",
      );
    }
    const retryPaths = input.relativeFiles.filter(
      (path) => path === "execution/retry-lineage.json",
    );
    let retryReceipt: RetryLineageReceipt | null = null;
    let parentStore: CampaignArtifactStore | null = null;
    let parentManifestDigest: string | null = null;
    if (input.reservation.parent_run_id !== null) {
      if (retryPaths.length !== 1) {
        throw new CascadeError("campaign retry lineage receipt is missing or duplicated");
      }
      parentStore = new CampaignArtifactStore(
        this.artifactRoot,
        input.reservation.parent_run_id,
      );
      const parentBatch = await parentStore.readVerifiedArtifactJsonBatch([
        { relativePath: "reservation.json", label: "verified retry parent reservation" },
        {
          relativePath: "execution/source-manifest.json",
          label: "verified retry parent source manifest",
        },
      ]);
      parentManifestDigest = parentBatch.verification.manifest_digest;
      const parentReservation = parentBatch.artifacts.get("reservation.json")!
        .value as CampaignRunReservation;
      const parentSource = parentBatch.artifacts.get("execution/source-manifest.json")!
        .value as Record<string, unknown>;
      const parent: VerifiedRetryLineageParent = {
        verification_status: "VALID",
        run_id: input.reservation.parent_run_id,
        campaign_id: parentReservation.campaign_id,
        attempt: parentReservation.attempt,
        campaign_digest: parentReservation.campaign_digest,
        source_digest: String(parentSource.source_digest),
        reservation_digest: sha256Text(stableJson(parentReservation)),
        finalization_manifest_digest: parentBatch.verification.manifest_digest,
        source_manifest_digest: sha256Text(stableJson(parentSource)),
        status: parentBatch.verification.finalization_status,
      };
      const rawRetryReceipt = await readBoundedStructuredJson<unknown>(
        this.path("execution/retry-lineage.json"),
        "campaign retry lineage receipt",
      );
      retryReceipt = verifyRetryLineageReceipt(
        rawRetryReceipt,
        {
          child: {
            run_id: input.reservation.run_id,
            campaign_id: input.reservation.campaign_id,
            attempt: input.reservation.attempt,
            campaign_digest: input.reservation.campaign_digest,
            source_digest: String(input.sourceManifest.source_digest),
          },
          parent,
          retry_mode: requireRecord(
            rawRetryReceipt,
            "campaign retry lineage receipt",
          ).retry_mode as "AUTOMATIC" | "MANUAL",
        },
      );
      if (
        input.execution.retry_lineage_receipt_digest !==
          retryLineageReceiptDigest(retryReceipt)
      ) {
        throw new CascadeError("execution retry lineage binding is stale");
      }
    } else if (
      retryPaths.length !== 0 ||
      input.execution.retry_lineage_receipt_digest !== null
    ) {
      throw new CascadeError("attempt 1 cannot contain retry lineage evidence");
    }
    const executionSummaries = Array.isArray(input.execution.task_results)
      ? input.execution.task_results.map((item, index) =>
          requireRecord(item, `execution task result ${index}`)
        )
      : [];
    if (
      new Set(executionSummaries.map((item) => item.task_id)).size !==
        executionSummaries.length ||
      stableJson(executionSummaries.map((item) => item.task_id)) !==
        stableJson(authoredTasks.map((task) => task.id))
    ) {
      throw new CascadeError("execution task result authority is incomplete, duplicated, or reordered");
    }
    const taskResults = await Promise.all(executionSummaries.map(async (summary, index) => {
      const task = authoredTasks[index]!;
      const path = `execution/tasks/${task.id}/result.json`;
      const taskRoot = `execution/tasks/${task.id}`;
      const requiredSidecars = [
        `${taskRoot}/result.json`,
        `${taskRoot}/events.jsonl`,
        `${taskRoot}/policy-decisions.json`,
        `${taskRoot}/dispatch.json`,
        `${taskRoot}/oracle.json`,
        `${taskRoot}/recovery.json`,
        `${taskRoot}/cleanup.json`,
        `${taskRoot}/handoff-offer.json`,
      ];
      for (const sidecar of requiredSidecars) {
        if (!input.relativeFiles.includes(sidecar)) {
          throw new CascadeError(`execution task sidecar is missing: ${sidecar}`);
        }
      }
      const result = requireRecord(
        await readBoundedStructuredJson<unknown>(this.path(path), `task result ${task.id}`),
        `task result ${task.id}`,
      );
      const policyDecisions = await readBoundedStructuredJson<unknown>(
        this.path(`${taskRoot}/policy-decisions.json`),
        `task policy decisions ${task.id}`,
      );
      const oracleResults = await readBoundedStructuredJson<unknown>(
        this.path(`${taskRoot}/oracle.json`),
        `task oracle results ${task.id}`,
      );
      const dispatch = await readBoundedStructuredJson<unknown>(
        this.path(`${taskRoot}/dispatch.json`),
        `task dispatch ${task.id}`,
      );
      const cleanup = requireRecord(
        await readBoundedStructuredJson<unknown>(
          this.path(`${taskRoot}/cleanup.json`),
          `task cleanup ${task.id}`,
        ),
        `task cleanup ${task.id}`,
      );
      const recovery = requireRecord(
        await readBoundedStructuredJson<unknown>(
          this.path(`${taskRoot}/recovery.json`),
          `task recovery ${task.id}`,
        ),
        `task recovery ${task.id}`,
      );
      const handoffOffer = await readBoundedStructuredJson<RuntimeHandoffReceipt>(
        this.path(`${taskRoot}/handoff-offer.json`),
        `task runtime handoff offer ${task.id}`,
      );
      validateRuntimeHandoffReceipt(handoffOffer, {
        authority: input.reservation.identities.operator,
      });
      const handoff = input.relativeFiles.includes(`${taskRoot}/handoff.json`)
        ? await readBoundedStructuredJson<RuntimeHandoffReceipt>(
            this.path(`${taskRoot}/handoff.json`),
            `task runtime handoff receipt ${task.id}`,
          )
        : null;
      if (handoff) {
        validateRuntimeHandoffReceipt(handoff, {
          authority:
            input.reservation.identities.specialized_evaluator ??
            input.reservation.identities.evaluator,
        });
      }
      let parentHandoffDigest: string | null = null;
      if (parentStore !== null) {
        const parentHandoff = await parentStore.readVerifiedArtifactJson<RuntimeHandoffReceipt>(
          `${taskRoot}/handoff.json`,
          `verified retry parent handoff ${task.id}`,
        );
        if (parentHandoff.verification.manifest_digest !== parentManifestDigest) {
          throw new CascadeError(
            `retry parent handoff crossed a verified manifest snapshot: ${task.id}`,
          );
        }
        const authority =
          parentHandoff.value.disposition === "ACCEPTED" ||
            parentHandoff.value.disposition === "REJECTED"
            ? parentHandoff.value.receiver_principal
            : parentHandoff.value.producer_principal;
        if (authority === null) {
          throw new CascadeError(`retry parent handoff authority is missing: ${task.id}`);
        }
        validateRuntimeHandoffReceipt(parentHandoff.value, { authority });
        parentHandoffDigest = runtimeHandoffReceiptDigest(parentHandoff.value);
      }
      const eventLines = (await readBoundedStructuredText(
        this.path(`${taskRoot}/events.jsonl`),
        `task events ${task.id}`,
      )).split(/\r?\n/).filter(Boolean);
      const events = eventLines.map((line, eventIndex) => {
        try {
          return requireRecord(JSON.parse(line), `task event ${task.id}/${eventIndex}`);
        } catch (error) {
          if (error instanceof CascadeError) throw error;
          throw new CascadeError(`task event ${task.id}/${eventIndex} is invalid JSON`);
        }
      });
      const completedEvents = events.filter(
        (event) =>
          event.event_type === "LIFECYCLE" &&
          event.type === "task-lifecycle" &&
          event.phase === "COMPLETED",
      );
      const terminal = completedEvents[0];
      validateTaskEventChronologyAuthority(events, `task ${task.id}`);
      const taskPolicies = Array.isArray(task.policy_ids) ? task.policy_ids : [];
      const taskOracles = Array.isArray(task.oracle_ids) ? task.oracle_ids : [];
      if (
        !Array.isArray(policyDecisions) ||
        !Array.isArray(oracleResults) ||
        completedEvents.length !== 1 ||
        !terminal ||
        !CURRENT_TERMINAL_STATUSES.has(terminal.status as CurrentTerminalStatus) ||
        !["SUCCEEDED", "FAILED", "BLOCKED", "CANCELLED", "UNKNOWN_OUTCOME"].includes(
          String(terminal.outcome),
        ) ||
        events.some(
          (event, eventIndex) =>
            event.sequence !== eventIndex ||
            event.task_id !== task.id ||
            event.driver !== requireRecord(task.driver, `task driver ${task.id}`).type ||
            !isDateTime(event.at),
        ) ||
        stableJson(result.policy_decisions) !== stableJson(policyDecisions) ||
        result.policy_decision_digest !== sha256Text(stableJson(policyDecisions)) ||
        stableJson(result.oracle_results) !== stableJson(oracleResults) ||
        stableJson(result.events) !== stableJson(events) ||
        stableJson(result.dispatch) !== stableJson(dispatch) ||
        stableJson(result.cleanup) !== stableJson(cleanup) ||
        stableJson(result.recovery) !== stableJson(recovery) ||
        result.status !== terminal.status ||
        result.outcome !== terminal.outcome
      ) {
        throw new CascadeError(`execution task sidecar authority is stale: ${task.id}`);
      }
      const cleanupEvents = events.filter((event) => event.event_type === "CLEANUP");
      const recoveryEvents = events.filter((event) => event.event_type === "RECOVERY");
      const oracleEvents = events.filter((event) => event.event_type === "ORACLE");
      if (
        cleanupEvents.length !== 1 ||
        cleanupEvents[0]!.status !== cleanup.status ||
        cleanupEvents[0]!.verified !== cleanup.verified ||
        stableJson(cleanupEvents[0]!.residual_resources) !==
          stableJson(cleanup.residual_resources) ||
        cleanupEvents[0]!.reason !== cleanup.reason ||
        (recoveryEvents.length > 1) ||
        (recoveryEvents.length === 1 &&
          (recoveryEvents[0]!.status !== recovery.status ||
            recoveryEvents[0]!.reason !== recovery.reason)) ||
        stableJson(oracleEvents.map((event) => ({
          oracle_id: event.oracle_id,
          status: event.status,
        }))) !== stableJson(oracleResults.map((value) => {
          const oracle = requireRecord(value, `task oracle result ${task.id}`);
          return { oracle_id: oracle.oracle_id, status: oracle.status };
        }))
      ) {
        throw new CascadeError(`execution task lifecycle sidecars are inconsistent: ${task.id}`);
      }
      const finalStatePath = `${taskRoot}/final-state.json`;
      let finalState: unknown;
      if (input.relativeFiles.includes(finalStatePath)) {
        finalState = await readBoundedStructuredJson<unknown>(
          this.path(finalStatePath),
          `task final state ${task.id}`,
        );
        if (stableJson(result.final_state) !== stableJson(finalState)) {
          throw new CascadeError(`execution task final state authority is stale: ${task.id}`);
        }
      } else if (result.final_state !== undefined) {
        throw new CascadeError(`execution task final state sidecar is missing: ${task.id}`);
      }
      const typedTask = task as unknown as TaskDefinition;
      const actions = taskPolicyActions(typedTask);
      const declaredPolicyIds = taskPolicies.map(String);
      if (
        new Set(declaredPolicyIds).size !== declaredPolicyIds.length ||
        declaredPolicyIds.some((id) => !authoredPolicies.has(id))
      ) {
        throw new CascadeError(`task policy declarations lack exact authored authority: ${task.id}`);
      }
      if (
        policyDecisions.length > actions.length ||
        (result.status === "PASS" && policyDecisions.length !== actions.length)
      ) {
        throw new CascadeError(`task policy decision coverage is incomplete or excessive: ${task.id}`);
      }
      const applicablePolicyIds = new Set(
        declaredPolicyIds.filter((id) => {
          const policy = authoredPolicies.get(id)! as unknown as PolicyDefinition;
          return actions.some((action) =>
            policyAppliesToObservation(policy, {
              campaign_id: String(campaign.id),
              task_id: String(task.id),
              task_kind: String(task.kind),
              driver_type: String(
                requireRecord(task.driver, `task driver ${task.id}`).type,
              ),
              action,
            })
          );
        }),
      );
      const allowedDecisionIndexes: number[] = [];
      for (const [decisionIndex, value] of policyDecisions.entries()) {
        const decision = requireExactOwnDataObject(
          value,
          `task policy decision ${task.id}/${decisionIndex}`,
          [
            "action_binding_version",
            "action_binding_digest",
            "action_index",
            "action_type",
            "applicability",
            "budgets",
            "confirmation_receipt_digest",
            "confirmation_receipt_id",
            "considered_policies",
            "decided_at",
            "decision",
            "effect",
            "policy_digest",
            "policy_id",
            "policy_version",
            "reason",
            "redaction_profile",
            "redaction_status",
          ],
        );
        const action = actions[decisionIndex]!;
        assertSafeSimulationAction(action);
        const considered = declaredPolicyIds.map((id) => {
          const policy = authoredPolicies.get(id)! as unknown as PolicyDefinition;
          const applicable = policyAppliesToObservation(policy, {
            campaign_id: String(campaign.id),
            task_id: String(task.id),
            task_kind: String(task.kind),
            driver_type: String(requireRecord(task.driver, `task driver ${task.id}`).type),
            action,
          });
          return {
            policy_id: policy.id,
            policy_version: policy.version,
            policy_digest: sha256Text(stableJson(policy)),
            applicability: applicable ? "APPLICABLE" : "NOT_APPLICABLE",
          };
        });
        const applicable = considered.filter((item) => item.applicability === "APPLICABLE");
        const selected = applicable.length === 1
          ? authoredPolicies.get(applicable[0]!.policy_id)! as unknown as PolicyDefinition
          : null;
        const decidedAt = Date.parse(String(decision.decided_at));
        if (
          decision.action_index !== decisionIndex ||
          decision.action_type !== action.type ||
          decision.action_binding_version !== ACTION_BINDING_VERSION ||
          decision.action_binding_digest !== actionBindingDigest(action) ||
          !Number.isFinite(decidedAt) ||
          decidedAt < Date.parse(String(result.started_at)) ||
          decidedAt > Date.parse(String(result.completed_at)) ||
          stableJson(decision.considered_policies) !== stableJson(considered)
        ) {
          throw new CascadeError(`task policy action authority is stale: ${task.id}/${decisionIndex}`);
        }
        if (!selected) {
          const expectedApplicability = applicable.length === 0 ? "NOT_APPLICABLE" : "AMBIGUOUS";
          const expectedDecision = applicable.length === 0 ? "DENY" : "BLOCKED";
          if (
            decision.policy_id !== null ||
            decision.policy_version !== null ||
            decision.policy_digest !== null ||
            decision.effect !== null ||
            decision.applicability !== expectedApplicability ||
            decision.decision !== expectedDecision ||
            decision.redaction_profile !== null ||
            decision.budgets !== null ||
            decision.confirmation_receipt_id !== null ||
            decision.confirmation_receipt_digest !== null
          ) {
            throw new CascadeError(`task policy selection authority is stale: ${task.id}/${decisionIndex}`);
          }
        } else {
          const budgets = requireExactOwnDataObject(
            decision.budgets,
            `task policy budgets ${task.id}/${decisionIndex}`,
            [
              "consumed_after",
              "consumed_before",
              "max_actions",
              "max_output_bytes",
              "remaining_after",
              "required_dimensions",
            ],
          );
          if (
            decision.policy_id !== selected.id ||
            decision.policy_version !== selected.version ||
            decision.policy_digest !== sha256Text(stableJson(selected)) ||
            decision.applicability !== "APPLICABLE" ||
            decision.effect !== selected.effect ||
            decision.redaction_profile !== selected.redaction_profile ||
            stableJson(budgets.required_dimensions) !== stableJson(selected.budgets.required_dimensions) ||
            budgets.max_actions !== selected.budgets.max_actions ||
            budgets.max_output_bytes !== selected.budgets.max_output_bytes
          ) {
            throw new CascadeError(`task policy definition authority is stale: ${task.id}/${decisionIndex}`);
          }
          if (decision.decision === "ALLOW") {
            allowedDecisionIndexes.push(decisionIndex);
          }
        }
      }
      if (stableJson([...applicablePolicyIds].sort()) !== stableJson([...declaredPolicyIds].sort())) {
        throw new CascadeError(`task policy declarations include inapplicable or omit applicable authority: ${task.id}`);
      }
      const dispatchRecord = requireExactOwnDataObject(
        dispatch,
        `task dispatch ${task.id}`,
        ["actions", "status", "uncertainty_reason"],
      );
      const dispatchActions = Array.isArray(dispatchRecord.actions)
        ? dispatchRecord.actions.map((value, dispatchIndex) =>
            requireExactOwnDataObject(value, `task dispatch ${task.id}/${dispatchIndex}`, [
              "action_binding_version",
              "action_binding_digest",
              "action_index",
              "action_type",
              "dispatched_at",
            ]))
        : [];
      if (
        dispatchActions.length !== allowedDecisionIndexes.length ||
        dispatchRecord.status !== (allowedDecisionIndexes.length ? "DISPATCHED" : "NOT_DISPATCHED") ||
        dispatchRecord.uncertainty_reason !== null ||
        dispatchActions.some((item, dispatchIndex) => {
          const decision = requireRecord(
            policyDecisions[allowedDecisionIndexes[dispatchIndex]!]!,
            `allowed policy decision ${task.id}/${dispatchIndex}`,
          );
          return item.action_index !== decision.action_index ||
            item.action_type !== decision.action_type ||
            item.action_binding_version !== decision.action_binding_version ||
            item.action_binding_digest !== decision.action_binding_digest ||
            !isDateTime(item.dispatched_at) ||
            Date.parse(String(item.dispatched_at)) < Date.parse(String(decision.decided_at)) ||
            Date.parse(String(item.dispatched_at)) > Date.parse(String(result.completed_at));
        })
      ) {
        throw new CascadeError(`task dispatch differs from allowed policy authority: ${task.id}`);
      }
      validatePolicyDriverEventAuthority({
        driver: String(requireRecord(task.driver, `task driver ${task.id}`).type),
        actions,
        decisions: policyDecisions.map((decision, decisionIndex) =>
          requireRecord(decision, `task policy decision ${task.id}/${decisionIndex}`)
        ),
        events,
        outcome: String(result.outcome),
        label: `task driver evidence ${task.id}`,
      });
      const actionEvents = events.filter((event) => event.event_type === "ACTION");
      let fakeReplayTerminal: {
        outcome: "SUCCEEDED" | "FAILED" | "BLOCKED";
        status: "PASS" | "FAIL" | "BLOCKED";
        earliest_failure: string | null;
      } | null = null;
      if (requireRecord(task.driver, `task driver ${task.id}`).type === "fake") {
        const replay = replayFakeActionPrefixAuthority(
          authoredFixture,
          actions as TaskAction[],
          policyDecisions.map((decision, actionIndex) =>
            requireRecord(
              decision,
              `task replay policy decision ${task.id}/${actionIndex}`,
            )
          ),
          actionEvents,
          `task fake action ${task.id}`,
        );
        if (stableJson(finalState) !== stableJson(replay.final_state)) {
          throw new CascadeError(`task final state differs from authoritative fake replay: ${task.id}`);
        }
        fakeReplayTerminal = replay;
      }
      const fileOracleIds = taskOracles.filter((id) =>
        ["file-exists", "task-file-exists"].includes(
          String(authoredOracles.get(String(id))?.type),
        )
      ).map(String);
      const oracleObservationPath = `${taskRoot}/oracle-observations.json`;
      const oracleObservations = fileOracleIds.length
        ? await readBoundedStructuredJson<unknown>(
            this.path(oracleObservationPath),
            `task oracle observations ${task.id}`,
          )
        : [];
      if (
        (fileOracleIds.length > 0) !== input.relativeFiles.includes(oracleObservationPath) ||
        !Array.isArray(oracleObservations) ||
        stableJson(result.oracle_observations ?? []) !== stableJson(oracleObservations) ||
        oracleObservations.length !== fileOracleIds.length
      ) {
        throw new CascadeError(`task file oracle observation authority is incomplete: ${task.id}`);
      }
      const observedFileOracles = new Map<string, Record<string, unknown>>();
      for (const [observationIndex, value] of oracleObservations.entries()) {
        const observation = requireExactOwnDataObject(
          value,
          `task file oracle observation ${task.id}/${observationIndex}`,
          ["file", "frozen_evidence", "observed_at", "oracle_id", "present", "schema_version", "type"],
        );
        const oracleId = fileOracleIds[observationIndex]!;
        const authoredOracle = authoredOracles.get(oracleId)!;
        if (
          observation.schema_version !== 1 ||
          observation.oracle_id !== oracleId ||
          observation.type !== authoredOracle.type ||
          observation.file !== authoredOracle.file ||
          !isDateTime(observation.observed_at) ||
          typeof observation.present !== "boolean"
        ) {
          throw new CascadeError(`task file oracle observation is stale: ${task.id}/${oracleId}`);
        }
        if (observation.present) {
          const frozen = requireExactOwnDataObject(
            observation.frozen_evidence,
            `task file oracle frozen evidence ${task.id}/${oracleId}`,
            [
              "frozen_at", "lineage", "path", "platform", "producer", "redaction_profile",
              "redaction_status", "sha256", "size", "source_path",
            ],
          );
          const lineage = requireExactOwnDataObject(
            frozen.lineage,
            `task file oracle lineage ${task.id}/${oracleId}`,
            ["run_id", "source_digest"],
          );
          const record = await this.artifactFileRecord(String(frozen.path));
          const expectedSourcePath = authoredOracle.type === "task-file-exists"
            ? resolve(this.path(taskRoot), String(authoredOracle.file))
            : resolve(String(authoredOracle.file));
          if (
            !String(frozen.path).startsWith(`${taskRoot}/oracle-evidence/`) ||
            resolve(String(frozen.source_path)) !== expectedSourcePath ||
            frozen.producer !== input.reservation.identities.operator.subject ||
            frozen.platform !== input.sourceManifest.platform ||
            !isDateTime(frozen.frozen_at) ||
            frozen.redaction_profile !== "no-secrets-v1" ||
            frozen.redaction_status !== "CLEAN" ||
            lineage.run_id !== input.reservation.run_id ||
            lineage.source_digest !== frozen.sha256 ||
            stableJson(record) !== stableJson({
              path: frozen.path,
              sha256: frozen.sha256,
              size: frozen.size,
            })
          ) {
            throw new CascadeError(`task file oracle frozen evidence is stale: ${task.id}/${oracleId}`);
          }
        } else {
          const currentObservation = await observeFileExistsAuthority(
            String(authoredOracle.file),
            authoredOracle.type === "task-file-exists"
              ? { root: this.path(taskRoot) }
              : {},
          );
          if (observation.frozen_evidence !== null || currentObservation.present) {
            throw new CascadeError(`task file oracle absence is no longer authoritative: ${task.id}/${oracleId}`);
          }
        }
        observedFileOracles.set(oracleId, observation);
      }
      const seenOracleIds = new Set<string>();
      const declaredOracleIds = taskOracles.map(String);
      if (
        new Set(declaredOracleIds).size !== declaredOracleIds.length ||
        declaredOracleIds.some((id) => !authoredOracles.has(id)) ||
        oracleResults.length > declaredOracleIds.length ||
        (result.status === "PASS" && oracleResults.length !== declaredOracleIds.length) ||
        stableJson(oracleResults.map((value) =>
          String(requireRecord(value, `task oracle result ${task.id}`).oracle_id)
        )) !== stableJson(declaredOracleIds.slice(0, oracleResults.length))
      ) {
        throw new CascadeError(`task oracle coverage is incomplete, excessive, or reordered: ${task.id}`);
      }
      for (const [oracleIndex, value] of oracleResults.entries()) {
        const resultOracle = requireRecord(value, `task oracle result ${task.id}/${oracleIndex}`);
        const authoredOracle = authoredOracles.get(String(resultOracle.oracle_id));
        if (
          !authoredOracle ||
          !taskOracles.includes(resultOracle.oracle_id) ||
          resultOracle.type !== authoredOracle.type ||
          seenOracleIds.has(String(resultOracle.oracle_id))
        ) {
          throw new CascadeError(`task oracle result lacks authored authority: ${task.id}`);
        }
        const oracleError = resultOracle.error;
        if (oracleError !== undefined) {
          if (
            typeof oracleError !== "string" ||
            !oracleError ||
            resultOracle.status !== "FAIL" ||
            resultOracle.expected !== undefined ||
            resultOracle.actual !== undefined ||
            resultOracle.evidence !== undefined ||
            result.status === "PASS"
          ) {
            throw new CascadeError(`task oracle error bypasses canonical failure authority: ${task.id}`);
          }
          seenOracleIds.add(String(resultOracle.oracle_id));
          continue;
        }
        let actual: unknown;
        let expected: unknown;
        if (authoredOracle.type === "state-equals") {
          expected = authoredOracle.expected;
          actual = finalState;
          for (const segment of String(authoredOracle.path ?? "").split(".").filter(Boolean)) {
            actual = actual && typeof actual === "object" && !Array.isArray(actual)
              ? (actual as Record<string, unknown>)[segment]
              : undefined;
          }
        } else if (authoredOracle.type === "exit-code") {
          expected = authoredOracle.expected_exit_code;
          const processEvent = events.find((event) => event.event_type === "PROCESS");
          actual = processEvent?.exit_code;
          if (
            result.command !== undefined &&
            requireRecord(result.command, `task command ${task.id}`).exit_code !== actual
          ) {
            throw new CascadeError(`task command differs from its canonical event: ${task.id}`);
          }
        } else if (authoredOracle.type === "http-status") {
          expected = authoredOracle.expected_status;
          const httpPath = `${taskRoot}/http.json`;
          if (!input.relativeFiles.includes(httpPath)) {
            throw new CascadeError(`task HTTP oracle lacks its canonical sidecar: ${task.id}`);
          }
          const http = requireRecord(
            await readBoundedStructuredJson<unknown>(
              this.path(httpPath),
              `task HTTP result ${task.id}`,
            ),
            `task HTTP result ${task.id}`,
          );
          actual = http.status;
          if (stableJson(result.http) !== stableJson(http)) {
            throw new CascadeError(`task HTTP result differs from its canonical sidecar: ${task.id}`);
          }
        } else if (
          authoredOracle.type === "file-exists" ||
          authoredOracle.type === "task-file-exists"
        ) {
          expected = true;
          actual = observedFileOracles.get(String(authoredOracle.id))?.present;
          if (
            typeof actual !== "boolean" ||
            resultOracle.evidence !== authoredOracle.file
          ) {
            throw new CascadeError(`task file oracle result is invalid: ${task.id}`);
          }
        }
        if (
          stableJson(resultOracle.expected) !== stableJson(expected) ||
          stableJson(resultOracle.actual) !== stableJson(actual) ||
          resultOracle.status !==
            (stableJson(actual) === stableJson(expected) ? "PASS" : "FAIL") ||
          (resultOracle.status === "FAIL" && result.status === "PASS")
        ) {
          throw new CascadeError(`task oracle result differs from frozen authored authority: ${task.id}`);
        }
        seenOracleIds.add(String(resultOracle.oracle_id));
      }
      const expectedOfferReferences = [
        {
          path: "execution/source-manifest.json",
          sha256: sha256Text(stableJson(input.sourceManifest)),
        },
        {
          path: `${taskRoot}/cleanup.json`,
          sha256: sha256Text(stableJson(cleanup)),
        },
        {
          path: `${taskRoot}/result.json`,
          sha256: sha256Text(stableJson(result)),
        },
        ...(recovery.status === "NOT_REQUIRED"
          ? []
          : [{
              path: `${taskRoot}/recovery.json`,
              sha256: sha256Text(stableJson(recovery)),
            }]),
      ].sort((left, right) => left.path.localeCompare(right.path));
      if (
        result.task_id !== task.id ||
        result.kind !== task.kind ||
        result.driver !== requireRecord(task.driver, `task driver ${task.id}`).type ||
        result.required !== task.required ||
        result.operator_identity !== input.reservation.identities.operator.subject ||
        result.target_actor_identity !== input.reservation.identities.target.subject ||
        result.platform !== input.sourceManifest.platform ||
        !isDateTime(result.started_at) ||
        !isDateTime(result.completed_at) ||
        typeof result.duration_ms !== "number" ||
        !Number.isFinite(result.duration_ms) ||
        result.duration_ms < 0 ||
        (result.status === "PASS" && result.earliest_failure !== null) ||
        (fakeReplayTerminal !== null &&
          (result.outcome !== fakeReplayTerminal.outcome ||
            result.status !== fakeReplayTerminal.status ||
            result.earliest_failure !== fakeReplayTerminal.earliest_failure)) ||
        !["NONE", "KNOWN", "UNKNOWN"].includes(String(result.side_effects)) ||
        summary.task_id !== task.id ||
        summary.status !== result.status ||
        summary.outcome !== result.outcome ||
        summary.cleanup_status !== cleanup.status ||
        summary.recovery_status !== recovery.status ||
        summary.policy_decision_digest !== result.policy_decision_digest ||
        summary.result_digest !== sha256Text(stableJson(result)) ||
        summary.handoff_receipt_digest !== runtimeHandoffReceiptDigest(handoffOffer) ||
        handoffOffer.run_id !== input.reservation.run_id ||
        handoffOffer.campaign_id !== input.reservation.campaign_id ||
        handoffOffer.task_id !== task.id ||
        handoffOffer.terminal_status !== result.outcome ||
        handoffOffer.task_result_digest !== sha256Text(stableJson(result)) ||
        handoffOffer.source_manifest_digest !== sha256Text(stableJson(input.sourceManifest)) ||
        handoffOffer.evidence_manifest_digest !== sha256Text(stableJson(result.evidence)) ||
        handoffOffer.recovery_receipt_digest !==
          (recovery.status === "NOT_REQUIRED" ? null : sha256Text(stableJson(recovery))) ||
        handoffOffer.cleanup_receipt_digest !== sha256Text(stableJson(cleanup)) ||
        stableJson(handoffOffer.required_inputs) !==
          stableJson(expectedOfferReferences.map((reference) => reference.path)) ||
        stableJson(handoffOffer.artifact_references) !== stableJson(expectedOfferReferences) ||
        handoffOffer.retry_lineage.attempt !== input.reservation.attempt ||
        handoffOffer.retry_lineage.parent_run_id !== input.reservation.parent_run_id ||
        handoffOffer.retry_lineage.parent_handoff_receipt_digest !== parentHandoffDigest ||
        handoffOffer.producer_principal.subject !== input.reservation.identities.operator.subject ||
        handoffOffer.receiver_principal?.subject !==
          (input.reservation.identities.specialized_evaluator?.subject ??
            input.reservation.identities.evaluator.subject) ||
        handoffOffer.proposed_next_owner !==
          (input.reservation.identities.specialized_evaluator?.subject ??
            input.reservation.identities.evaluator.subject) ||
        handoffOffer.proposed_next_gate !==
          (input.reservation.identities.specialized_evaluator
            ? "specialized-evaluation"
            : "general-evaluation") ||
        handoffOffer.disposition !== "PENDING" ||
        (handoff &&
          (handoff.disposition !== "ACCEPTED" ||
            handoff.offer_receipt_digest !== runtimeHandoffReceiptDigest(handoffOffer) ||
            handoff.run_id !== handoffOffer.run_id ||
            handoff.campaign_id !== handoffOffer.campaign_id ||
            handoff.task_id !== handoffOffer.task_id ||
            handoff.terminal_status !== handoffOffer.terminal_status ||
            handoff.task_result_digest !== handoffOffer.task_result_digest ||
            handoff.source_manifest_digest !== handoffOffer.source_manifest_digest ||
            handoff.evidence_manifest_digest !== handoffOffer.evidence_manifest_digest ||
            handoff.recovery_receipt_digest !== handoffOffer.recovery_receipt_digest ||
            handoff.cleanup_receipt_digest !== handoffOffer.cleanup_receipt_digest ||
            stableJson(handoff.retry_lineage) !== stableJson(handoffOffer.retry_lineage)))
      ) {
        throw new CascadeError(`execution task result authority is stale: ${task.id}`);
      }
      return {
        ...result,
        policy_decisions: policyDecisions,
        oracle_results: oracleResults,
        events,
        dispatch,
        cleanup,
        recovery,
      };
    }));

    const budgetUsage: CampaignPolicyBudgetUsage = {};
    const confirmationAuthorityUsage: CampaignPolicyConfirmationUsage = {};
    const expectedConfirmationUsagePaths = new Set<string>();
    const expectedConfirmationReceiptPaths = new Set<string>();
    for (const [taskIndex, result] of taskResults.entries()) {
      const task = authoredTasks[taskIndex]! as unknown as TaskDefinition;
      const actions = taskPolicyActions(task);
      const events = result.events as Array<Record<string, unknown>>;
      const actionEvents = events.filter((event) => event.event_type === "ACTION");
      for (const [decisionIndex, value] of (
        result.policy_decisions as Array<Record<string, unknown>>
      ).entries()) {
        const decision = requireRecord(
          value,
          `campaign policy budget decision ${task.id}/${decisionIndex}`,
        );
        const action = actions[decisionIndex]!;
        const taskPolicies = (task.policy_ids ?? []).map(
          (id) => authoredPolicies.get(id)! as unknown as PolicyDefinition,
        );
        let confirmationReceipts: PolicyConfirmationReceipt[] = [];
        if (decision.confirmation_receipt_id !== null) {
          const receiptId = String(decision.confirmation_receipt_id);
          const recordName = `${sha256Text(stableJson(receiptId))}.json`;
          const receiptPath = `execution/confirmation-receipts/${recordName}`;
          if (expectedConfirmationReceiptPaths.has(receiptPath)) {
            throw new CascadeError(`campaign confirmation receipt was replayed: ${receiptId}`);
          }
          expectedConfirmationReceiptPaths.add(receiptPath);
          if (!input.relativeFiles.includes(receiptPath)) {
            throw new CascadeError(`campaign confirmation receipt authority is missing: ${receiptId}`);
          }
          const receipt = await readBoundedStructuredJson<unknown>(
            this.path(receiptPath),
            `campaign confirmation receipt ${receiptId}`,
          );
          validatePolicyConfirmationReceipt(receipt);
          if (
            receipt.receipt_id !== receiptId ||
            sha256Text(stableJson(receipt)) !== decision.confirmation_receipt_digest
          ) {
            throw new CascadeError(`campaign confirmation receipt authority is stale: ${receiptId}`);
          }
          confirmationReceipts = [receipt];
        }
        const actionEvent = actionEvents[decisionIndex];
        const projectedOutputBytes = task.driver.type === "fake"
          ? Buffer.byteLength(stableJson({ state: actionEvent?.before, action }))
          : 0;
        const expectedDecision = resolvePolicyDecision(taskPolicies, {
          run_id: input.reservation.run_id,
          campaign_id: input.reservation.campaign_id,
          task_id: task.id,
          task_kind: task.kind,
          driver_type: task.driver.type,
          action_index: decisionIndex,
          action,
          projected_output_bytes: projectedOutputBytes,
          supported_budget_dimensions: [...CAMPAIGN_SUPPORTED_BUDGET_DIMENSIONS],
          redaction_capabilities: [...CAMPAIGN_REDACTION_CAPABILITIES],
          now: String(decision.decided_at),
          confirmation_receipts: confirmationReceipts,
          confirmation_secrets: Object.assign(
            Object.create(null),
            this.confirmationSecrets,
          ),
          confirmation_usage: confirmationAuthorityUsage,
          budget_usage: budgetUsage,
        });
        if (expectedDecision.decision === "ALLOW") {
          consumePolicyBudget(
            expectedDecision,
            budgetUsage,
            task.driver.type === "fake" ? projectedOutputBytes : 0,
          );
          if (task.driver.type === "direct-process" && result.command !== undefined) {
            const control = requireRecord(
              requireRecord(result.command, `task command ${task.id}`).output_control,
              `task command output control ${task.id}`,
            );
            consumePolicyOutputBudget(
              expectedDecision,
              budgetUsage,
              Number(control.budget_consumed_bytes),
            );
          } else if (task.driver.type === "http-client" && result.http !== undefined) {
            const control = requireRecord(
              requireRecord(result.http, `task HTTP ${task.id}`).output_control,
              `task HTTP output control ${task.id}`,
            );
            consumePolicyOutputBudget(
              expectedDecision,
              budgetUsage,
              Number(control.budget_consumed_bytes),
            );
          } else if (task.driver.type === "pty" && result.final_state !== undefined) {
            const terminal = requireRecord(
              requireRecord(result.final_state, `task final state ${task.id}`).terminal,
              `task terminal state ${task.id}`,
            );
            const control = requireRecord(
              terminal.output_control,
              `task terminal output control ${task.id}`,
            );
            if (decisionIndex === 0) {
              consumePolicyOutputBudget(
                expectedDecision,
                budgetUsage,
                Number(control.budget_consumed_bytes),
              );
            }
          } else if (
            task.driver.type === "platform-automation" &&
            result.final_state !== undefined
          ) {
            const desktop = requireRecord(
              requireRecord(result.final_state, `task final state ${task.id}`).desktop,
              `task desktop state ${task.id}`,
            );
            const control = requireRecord(
              desktop.output_control,
              `task desktop output control ${task.id}`,
            );
            if (decisionIndex === actions.length - 1) {
              consumePolicyOutputBudget(
                expectedDecision,
                budgetUsage,
                Number(control.budget_consumed_bytes),
              );
            }
          }
        }
        if (
          stableJson(expectedDecision) !== stableJson(decision) ||
          (expectedDecision.budgets !== null &&
            (expectedDecision.budgets.consumed_after.action_count > expectedDecision.budgets.max_actions ||
              expectedDecision.budgets.consumed_after.output_bytes > expectedDecision.budgets.max_output_bytes))
        ) {
          throw new CascadeError(
            `campaign policy decision differs from canonical runtime authority: ${task.id}/${decisionIndex}`,
          );
        }
        if (decision.confirmation_receipt_id !== null) {
          const receiptId = String(decision.confirmation_receipt_id);
          const usagePath = `execution/confirmation-usage/${sha256Text(stableJson(receiptId))}.json`;
          expectedConfirmationUsagePaths.add(usagePath);
          if (!input.relativeFiles.includes(usagePath)) {
            throw new CascadeError(`campaign confirmation usage authority is missing: ${receiptId}`);
          }
          const usage = requireExactOwnDataObject(
            await readBoundedStructuredJson<unknown>(
              this.path(usagePath),
              `campaign confirmation usage ${receiptId}`,
            ),
            `campaign confirmation usage ${receiptId}`,
            ["artifact_type", "campaign_id", "receipt_id", "run_id", "schema_version", "task_id", "usage"],
          );
          const details = requireExactOwnDataObject(
            usage.usage,
            `campaign confirmation usage details ${receiptId}`,
            ["action_binding_digest", "action_binding_version", "consumed_at", "policy_id", "receipt_digest"],
          );
          const expectedUsage = confirmationAuthorityUsage[receiptId];
          if (
            usage.schema_version !== 2 ||
            usage.artifact_type !== "campaign-confirmation-usage" ||
            usage.run_id !== input.reservation.run_id ||
            usage.campaign_id !== input.reservation.campaign_id ||
            usage.task_id !== task.id ||
            usage.receipt_id !== receiptId ||
            stableJson(details) !== stableJson(expectedUsage)
          ) {
            throw new CascadeError(`campaign confirmation usage authority is stale: ${receiptId}`);
          }
        }
      }
    }
    const actualConfirmationUsagePaths = input.relativeFiles.filter(
      (path) => path.startsWith("execution/confirmation-usage/") && path.endsWith(".json"),
    );
    if (
      stableJson(actualConfirmationUsagePaths.sort()) !==
        stableJson([...expectedConfirmationUsagePaths].sort())
    ) {
      throw new CascadeError("campaign confirmation usage coverage is incomplete or excessive");
    }
    const actualConfirmationReceiptPaths = input.relativeFiles.filter(
      (path) => path.startsWith("execution/confirmation-receipts/") && path.endsWith(".json"),
    );
    if (
      stableJson(actualConfirmationReceiptPaths.sort()) !==
        stableJson([...expectedConfirmationReceiptPaths].sort())
    ) {
      throw new CascadeError("campaign confirmation receipt coverage is incomplete or excessive");
    }

    const cleanupVerified = taskResults.every(
      (task) => requireRecord(task.cleanup, "task cleanup").verified === true,
    );
    const requiredFailures = taskResults.filter(
      (task) => task.required === true && task.status !== "PASS",
    );
    const requiredBlocked = requiredFailures.some((task) => task.status === "BLOCKED");
    const sessionProjection = input.execution.session === undefined
      ? null
      : requireRecord(input.execution.session, "execution session projection");
    const checkpoints = await this.readSessionCheckpoints<{
      task_results: Array<Record<string, unknown>>;
      budget_usage?: Record<string, unknown>;
      confirmation_usage?: Record<string, unknown>;
    }>();
    const checkpoint = checkpoints.at(-1) ?? null;
    const sessionEvents = await this.readSessionEvents();
    if (
      Boolean(sessionProjection) !== Boolean(checkpoint) ||
      Boolean(checkpoint) !== Boolean(sessionEvents.length)
    ) {
      throw new CascadeError(
        "execution session projection, journal, and checkpoint authority differ",
      );
    }
    if (sessionProjection && checkpoint) {
      const { campaignSessionContract } = await import("./campaigns");
      const sessionContract = campaignSessionContract(
        {
          campaign,
          tasks: authoredTasks,
        } as unknown as ResolvedCampaign,
        input.reservation.run_id,
      ).contract;
      const history = validateSimulationSessionHistory(
        sessionEvents,
        checkpoints,
        sessionContract,
      );
      if (!history.terminal_event) {
        throw new CascadeError(
          "execution session history lacks an exact terminal event",
        );
      }
      const authorizedSurfaces = new Map(
        sessionContract.authorized_surfaces.map((surface) => [
          surface.surface_id,
          surface,
        ]),
      );
      for (const task of taskResults) {
        const authoredTask = authoredTasks.find(
          (candidate) => candidate.id === task.task_id,
        )!;
        const observations = Array.isArray(task.observations)
          ? task.observations
          : [];
        for (const observation of observations) {
          const surface = requireRecord(
            requireRecord(observation, `task observation ${task.task_id}`).surface,
            `task observation surface ${task.task_id}`,
          );
          const expected = authorizedSurfaces.get(String(surface.surface_id));
          if (
            !expected ||
            stableJson(expected) !== stableJson({
              surface_id: surface.surface_id,
              kind: surface.kind,
              context_id: surface.session_id,
            }) ||
            surface.kind !== authoredTask.kind
          ) {
            throw new CascadeError(
              `task observation uses a foreign authored surface: ${task.task_id}`,
            );
          }
        }
      }
      const authoredTaskByStep = new Map(
        authoredTasks.map((task) => [`task:${task.id}`, task]),
      );
      for (const event of sessionEvents) {
        for (const binding of event.step_bindings ?? []) {
          const task = authoredTaskByStep.get(binding.step_id);
          if (
            !task ||
            binding.surface_id !== `task:${task.id}` ||
            binding.required !== task.required
          ) {
            throw new CascadeError(
              `simulation step binding uses a foreign authored task surface: ${binding.step_id}`,
            );
          }
        }
      }
      if (
        checkpoint.session_id !== input.reservation.run_id ||
        checkpoint.checkpoint_digest !== simulationCheckpointDigest(checkpoint) ||
        sessionProjection.status !== checkpoint.status ||
        sessionProjection.purpose !== checkpoint.purpose ||
        sessionProjection.episode_count !== checkpoint.episode ||
        sessionProjection.step_count !== checkpoint.step_count ||
        sessionProjection.checkpoint_digest !== checkpoint.checkpoint_digest ||
        stableJson(sessionProjection.surfaces) !== stableJson(checkpoint.surfaces) ||
        stableJson(checkpoint.domain_state.task_results) !== stableJson(taskResults.map((task) => ({
          task_id: task.task_id,
          required: task.required,
          status: task.status,
          outcome: task.outcome,
          result_digest: sha256Text(stableJson({
            ...task,
            policy_decisions: task.policy_decisions,
            oracle_results: task.oracle_results,
            events: task.events,
            dispatch: task.dispatch,
            cleanup: task.cleanup,
            recovery: task.recovery,
          })),
        })))
      ) {
        throw new CascadeError("execution session checkpoint projection is stale or incomplete");
      }
    }
    const sessionStatus = checkpoint?.status ?? "ACHIEVED";
    const expectedExecutionStatus =
      new Set(["BLOCKED", "TIMED_OUT", "BUDGET_EXHAUSTED", "CANCELLED", "UNKNOWN_OUTCOME"]).has(sessionStatus) ||
        requiredBlocked
        ? "BLOCKED"
        : sessionStatus === "FAILED" || requiredFailures.length || !cleanupVerified
          ? "FAIL"
          : "PASS";
    if (
      input.execution.status !== expectedExecutionStatus ||
      input.execution.cleanup_verified !== cleanupVerified
    ) {
      throw new CascadeError("execution status differs from authored task and lifecycle authority");
    }

    let simulation: Record<string, unknown> | null = null;
    const populations = new Map<string, Record<string, unknown>>();
    if (typeof campaign.simulation_file === "string" && campaign.simulation_file) {
      simulation = await this.readCurrentFrozenJson(
        input.sourceManifest,
        campaign.simulation_file,
        "authored simulation",
      );
      const populationFiles = Array.isArray(simulation.population_files)
        ? simulation.population_files
        : [];
      for (const [index, path] of populationFiles.entries()) {
        if (typeof path !== "string" || !path) {
          throw new CascadeError(`authored population binding ${index} is invalid`);
        }
        const population = await this.readCurrentFrozenJson(
          input.sourceManifest,
          path,
          `authored population ${index}`,
        );
        if (typeof population.id !== "string" || !population.id || populations.has(population.id)) {
          throw new CascadeError(`authored population ${index} is invalid or duplicated`);
        }
        populations.set(population.id, population);
      }
    }

    let calibrationAuthority: CalibrationReceipt | null = null;
    const calibrationFile = simulation?.calibration_file;
    if (
      Boolean(typeof calibrationFile === "string" && calibrationFile) !==
        Boolean(input.calibration)
    ) {
      throw new CascadeError(
        "calibration receipt presence differs from frozen authored simulation authority",
      );
    }
    if (typeof calibrationFile === "string" && calibrationFile && input.calibration) {
      const definition = await this.readCurrentFrozenJson(
        input.sourceManifest,
        calibrationFile,
        "authored calibration definition",
      ) as unknown as CalibrationDefinition;
      const metricFiles = Array.isArray(simulation?.metric_files)
        ? simulation!.metric_files
        : [];
      const treatmentFiles = Array.isArray(simulation?.treatment_files)
        ? simulation!.treatment_files
        : [];
      const metrics = await Promise.all(metricFiles.map(async (path, index) => {
        if (typeof path !== "string" || !path) {
          throw new CascadeError(`authored metric binding ${index} is invalid`);
        }
        return await this.readCurrentFrozenJson(
          input.sourceManifest,
          path,
          `authored metric ${index}`,
        ) as unknown as MetricDefinition;
      }));
      const treatments = await Promise.all(treatmentFiles.map(async (path, index) => {
        if (typeof path !== "string" || !path) {
          throw new CascadeError(`authored treatment binding ${index} is invalid`);
        }
        return await this.readCurrentFrozenJson(
          input.sourceManifest,
          path,
          `authored treatment ${index}`,
        ) as unknown as TreatmentDefinition;
      }));
      if (
        typeof definition.simulated_scores_file !== "string" ||
        !definition.simulated_scores_file ||
        typeof definition.reference_scores_file !== "string" ||
        !definition.reference_scores_file ||
        !isDateTime(input.calibration.created_at)
      ) {
        throw new CascadeError("authored calibration score or time authority is invalid");
      }
      const simulatedScores = await this.readCurrentFrozenValue(
        input.sourceManifest,
        definition.simulated_scores_file,
        "authored simulated scores",
      );
      const referenceScores = await this.readCurrentFrozenValue(
        input.sourceManifest,
        definition.reference_scores_file,
        "authored reference scores",
      );
      if (!Array.isArray(simulatedScores) || !Array.isArray(referenceScores)) {
        throw new CascadeError("authored calibration scores are invalid");
      }
      calibrationAuthority = buildCalibrationAuthority({
        definition,
        metrics,
        treatments,
        simulated_scores: simulatedScores as ScoreRow[],
        reference_scores: referenceScores as ScoreRow[],
        source_digests: definitions as Array<{ path: string; sha256: string }>,
        run_id: input.reservation.run_id,
        aggregator_identity: input.reservation.identities.aggregator.subject,
        evaluation_at: input.evaluationAt,
      });
      if (stableJson(input.calibration) !== stableJson(calibrationAuthority)) {
        throw new CascadeError(
          "calibration receipt differs from frozen definition, scores, thresholds, or identity authority",
        );
      }
    }

    const locked = new Set(
      input.specializedBinding && Array.isArray(input.specializedBinding.claim_ids)
        ? input.specializedBinding.claim_ids as string[]
        : [],
    );
    const ledger: CurrentTerminalClaim[] = [];
    for (const authored of input.claims) {
      if (locked.has(authored.id)) continue;
      const claim = authored.definition;
      const strings = (value: unknown, label: string): string[] => {
        if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
          throw new CascadeError(`authored claim ${authored.id} ${label} is invalid`);
        }
        return value as string[];
      };
      const requiredOracles = strings(claim.required_oracle_ids, "required_oracle_ids");
      const requiredPolicies = strings(claim.required_policy_ids, "required_policy_ids");
      const requiredMetrics = strings(claim.required_metric_ids, "required_metric_ids");
      const evidenceRequirements = strings(claim.evidence_requirements, "evidence_requirements");
      if (
        typeof claim.population_authority !== "string" ||
        typeof claim.requires_calibration !== "boolean" ||
        !claim.scope ||
        typeof claim.scope !== "object" ||
        Array.isArray(claim.scope)
      ) {
        throw new CascadeError(`authored claim ${authored.id} mechanical contract is invalid`);
      }
      const scope = claim.scope as Record<string, unknown>;
      const population = typeof scope.population_id === "string"
        ? populations.get(scope.population_id)
        : undefined;
      let derivation: Record<string, unknown> | null = null;
      let derivationPath: string | null = null;
      if (population?.schema_version === 2) {
        const source = requireRecord(population.source, `population source ${scope.population_id}`);
        const binding = requireRecord(source.derivation, `population derivation ${scope.population_id}`);
        if (typeof binding.path === "string" && typeof binding.sha256 === "string") {
          derivation = await this.readCurrentFrozenJson(
            input.sourceManifest,
            binding.path,
            `population derivation ${scope.population_id}`,
          );
          const definition = definitions.find(
            (item) => typeof item.path === "string" && resolve(item.path) === resolve(binding.path as string),
          );
          if (!definition || definition.sha256 !== binding.sha256) {
            throw new CascadeError(`population derivation ${scope.population_id} is stale`);
          }
          derivationPath = binding.path;
        }
      }
      let projected: Pick<CurrentTerminalClaim, "status" | "reason" | "evidence"> | null = null;
      if (claim.population_authority === "persona-derived" && !derivation) {
        projected = {
          status: "NOT_RUN",
          reason: "claim requires an approved digest-bound product-persona derivation",
          evidence: [],
        };
      } else if (claim.population_authority === "estimated-prevalence") {
        const evidenceSources = Array.isArray(derivation?.evidence_sources)
          ? derivation!.evidence_sources as Array<Record<string, unknown>>
          : [];
        const prevalence = derivation &&
          derivation.mode === "representative" &&
          derivation.weight_semantics === "estimated-prevalence" &&
          evidenceSources.some((item) => item.kind !== "framework-fixture" && Boolean(item.sha256));
        if (
          simulation?.simulation_scope !== "product" ||
          !prevalence ||
          !input.calibration ||
          input.calibration.framework_fixture === true
        ) {
          projected = {
            status: "NOT_RUN",
            reason: "estimated-prevalence authority requires a product-scoped representative derivation with digest-bound non-fixture evidence and non-fixture calibration",
            evidence: prevalence && derivationPath ? [derivationPath] : [],
          };
        }
      }
      if (!projected) {
        const oracleResults = taskResults.flatMap((task) =>
          Array.isArray(task.oracle_results) ? task.oracle_results as Array<Record<string, unknown>> : []
        );
        const policyDecisions = taskResults.flatMap((task) =>
          Array.isArray(task.policy_decisions) ? task.policy_decisions as Array<Record<string, unknown>> : []
        );
        const missingOracles = requiredOracles.filter(
          (id) => !oracleResults.some((result) => result.oracle_id === id),
        );
        const failedOracles = requiredOracles.filter((id) =>
          oracleResults.some((result) => result.oracle_id === id && result.status === "FAIL")
        );
        const deniedPolicies = requiredPolicies.filter((id) =>
          policyDecisions.some((decision) => decision.policy_id === id && decision.decision !== "ALLOW")
        );
        const missingPolicyProjection = requiredPolicyEvidenceProjection(
          requiredPolicies,
          policyDecisions as Array<{ policy_id: string }>,
        );
        const failedTasks = taskResults.filter(
          (task) => task.required === true && task.status !== "PASS",
        );
        const metricResults = Array.isArray(input.calibration?.metric_results)
          ? input.calibration!.metric_results as Array<Record<string, unknown>>
          : [];
        const missingMetrics = requiredMetrics.filter(
          (id) => !metricResults.some((result) => result.metric_id === id),
        );
        const failedMetrics = requiredMetrics.filter((id) =>
          metricResults.some((result) => result.metric_id === id && result.status !== "PASS")
        );
        const availableEvidence = new Set([
          "source-manifest",
          "execution-receipt",
          ...(taskResults.length ? ["task-result"] : []),
          ...(taskResults.some((task) => Array.isArray(task.events) && task.events.length) ? ["trajectory"] : []),
          ...(policyDecisions.length ? ["policy-decisions"] : []),
          ...(oracleResults.length ? ["oracle"] : []),
          ...(taskResults.every((task) => requireRecord(task.cleanup, "task cleanup").verified === true) ? ["cleanup"] : []),
          ...(input.calibration ? ["calibration-receipt"] : []),
        ]);
        const missingEvidence = evidenceRequirements.filter((item) => !availableEvidence.has(item));
        if (missingOracles.length) {
          projected = {
            status: "BLOCKED",
            reason: `required oracle evidence missing: ${missingOracles.join(", ")}`,
            evidence: [],
          };
        } else if (missingPolicyProjection || missingMetrics.length || missingEvidence.length) {
          projected = {
            status: "BLOCKED",
            reason: [
              missingPolicyProjection?.reason ?? null,
              missingMetrics.length ? `required metric evidence missing: ${missingMetrics.join(", ")}` : null,
              missingEvidence.length ? `required artifacts missing: ${missingEvidence.join(", ")}` : null,
            ].filter(Boolean).join("; "),
            evidence: [],
          };
        } else if (failedTasks.length) {
          projected = {
            status: "UNSUPPORTED",
            reason: `required task failed: ${failedTasks.map((task) => task.task_id).join(", ")}`,
            evidence: failedTasks.map((task) => String(task.task_id)),
          };
        } else if (failedOracles.length || deniedPolicies.length || failedMetrics.length) {
          projected = {
            status: "UNSUPPORTED",
            reason: [
              failedOracles.length ? `failed oracles: ${failedOracles.join(", ")}` : null,
              deniedPolicies.length ? `unsatisfied policies: ${deniedPolicies.join(", ")}` : null,
              failedMetrics.length ? `failed metrics: ${failedMetrics.join(", ")}` : null,
            ].filter(Boolean).join("; "),
            evidence: [...failedOracles, ...deniedPolicies, ...failedMetrics],
          };
        } else if (claim.requires_calibration === true) {
          if (!input.calibration) {
            projected = { status: "NOT_RUN", reason: "required calibration receipt is absent", evidence: [] };
          } else if (input.calibration.framework_fixture === true) {
            projected = {
              status: "NOT_RUN",
              reason: "framework-fixture calibration cannot support target release eligibility",
              evidence: [String(input.calibration.calibration_id)],
            };
          } else if (input.calibration.status !== "CALIBRATED") {
            projected = {
              status: input.calibration.status === "STALE" ? "BLOCKED" : "UNSUPPORTED",
              reason: `required calibration is ${input.calibration.status}`,
              evidence: [String(input.calibration.calibration_id)],
            };
          }
        }
        projected ??= {
          status: "SUPPORTED",
          reason: "all declared non-compensating gates passed",
          evidence: [
            ...requiredOracles,
            ...requiredPolicies,
            ...requiredMetrics,
            ...evidenceRequirements,
            ...(input.calibration ? [String(input.calibration.calibration_id)] : []),
          ],
        };
      }
      ledger.push({
        claim_id: authored.id,
        class: authored.class,
        ...projected,
      });
    }
    const claims = input.claims
      .filter((claim) => !locked.has(claim.id))
      .map((claim) => claim.definition as unknown as ClaimDefinition);
    const mechanical = buildMechanicalEvaluationAuthority({
      claims,
      task_results: taskResults as unknown as MechanicalTaskAuthority[],
      calibration: calibrationAuthority,
      population_authority: (claim) => {
        const prior = ledger.find((entry) => entry.claim_id === claim.id);
        if (
          prior?.reason ===
            "claim requires an approved digest-bound product-persona derivation" ||
          prior?.reason ===
            "estimated-prevalence authority requires a product-scoped representative derivation with digest-bound non-fixture evidence and non-fixture calibration"
        ) {
          return {
            status: prior.status,
            reason: prior.reason,
            evidence: prior.evidence,
          };
        }
        return null;
      },
    });
    if (stableJson(mechanical.claim_ledger) !== stableJson(ledger)) {
      throw new CascadeError(
        "terminal mechanical projection diverges from the shared deterministic reducer",
      );
    }
    return { campaign, profile, rubric, mechanical };
  }

  private async validateCurrentGeneralEvidenceLinks(input: {
    evaluation: Record<string, unknown>;
    reservation: CampaignRunReservation;
    sourceManifest: Record<string, unknown>;
    execution: Record<string, unknown>;
    sourceDigest: string;
    executionDigest: string;
    specializedBinding: Record<string, unknown> | null;
    authoritativeClaims: readonly CurrentAuthoredClaim[];
    relativeFiles: readonly string[];
    evaluationAt: string;
  }): Promise<{
    digest: string | null;
    status: string;
    scope: string;
  }> {
    const evaluationId = `${input.reservation.run_id}-evaluation`;
    const evaluationRoot = `evaluations/${evaluationId}`;
    const requestPath = `${evaluationRoot}/input/request.json`;
    if (!input.relativeFiles.includes(requestPath)) {
      throw new CascadeError("COMPLETED general evaluation lacks its exact frozen request");
    }
    const request = requireExactOwnDataObject(
      await readBoundedStructuredJson<unknown>(
        this.path(requestPath),
        "general evaluation request",
      ),
      "general evaluation request",
      [
        "calibration_receipt_digest",
        "campaign_id",
        "evaluation_id",
        "evaluation_input_digest",
        "evaluator_identity",
        "execution_receipt_digest",
        "mechanical_evaluation",
        "operator_identity",
        "principal_identities",
        "profile",
        "rubric",
        "run_id",
        "schema_version",
        "source_manifest_digest",
        "specialized_evaluation",
        "target_actor_identity",
      ],
    );
    const calibrationPaths = input.relativeFiles.filter(
      (path) => path.startsWith("calibrations/") && path.endsWith(".json"),
    );
    let calibrationDigest: string | null = null;
    let calibration: Record<string, unknown> | null = null;
    if (calibrationPaths.length) {
      if (calibrationPaths.length !== 1) {
        throw new CascadeError("COMPLETED terminal evidence has duplicate calibration receipts");
      }
      calibration = requireRecord(
        await readBoundedStructuredJson<unknown>(
          this.path(calibrationPaths[0]!),
          "calibration receipt",
        ),
        "calibration receipt",
      );
      calibrationDigest = sha256Text(stableJson(calibration));
    }
    const locked = new Set(
      input.specializedBinding && Array.isArray(input.specializedBinding.claim_ids)
        ? input.specializedBinding.claim_ids as string[]
        : [],
    );
    const generalClaims = input.authoritativeClaims.filter(
      (claim) => !locked.has(claim.id),
    );
    const submittedMechanical = requireExactOwnDataObject(
      request.mechanical_evaluation,
      "general mechanical evaluation",
      ["claim_ledger", "status"],
    );
    validateCurrentTerminalClaimLedger(
      submittedMechanical.claim_ledger,
      generalClaims,
      "general mechanical claim ledger",
    );
    const authority = await this.currentMechanicalProjection({
      sourceManifest: input.sourceManifest,
      reservation: input.reservation,
      execution: input.execution,
      calibration,
      claims: input.authoritativeClaims,
      specializedBinding: input.specializedBinding,
      relativeFiles: input.relativeFiles,
      evaluationAt: input.evaluationAt,
    });
    const expectedPrincipals = {
      operator: input.reservation.identities.operator.subject,
      specialized_evaluator:
        input.reservation.identities.specialized_evaluator?.subject ?? null,
      evaluator: input.reservation.identities.evaluator.subject,
      aggregator: input.reservation.identities.aggregator.subject,
      target: input.reservation.identities.target.subject,
      simulator: input.reservation.identities.simulator.subject,
      recovery: input.reservation.identities.recovery.subject,
    };
    const generalMechanicalLedger = authority.mechanical.claim_ledger.filter(
      (claim) => !locked.has(claim.claim_id),
    );
    const generalMechanical = {
      claim_ledger: generalMechanicalLedger,
      status: claimLedgerTerminalStatus(generalMechanicalLedger),
    };
    const expectedRequestInput = {
      schema_version: 1,
      evaluation_id: evaluationId,
      run_id: input.reservation.run_id,
      campaign_id: input.reservation.campaign_id,
      source_manifest_digest: input.sourceDigest,
      execution_receipt_digest: input.executionDigest,
      calibration_receipt_digest: calibrationDigest,
      operator_identity: input.reservation.identities.operator.subject,
      target_actor_identity: input.reservation.identities.target.subject,
      evaluator_identity: input.reservation.identities.evaluator.subject,
      principal_identities: expectedPrincipals,
      specialized_evaluation: input.specializedBinding,
      profile: authority.profile,
      rubric: authority.rubric,
      mechanical_evaluation: generalMechanical,
    };
    const expectedInputDigest = sha256Text(stableJson(expectedRequestInput));
    const expectedRequest = {
      ...expectedRequestInput,
      evaluation_input_digest: expectedInputDigest,
    };
    if (stableJson(request) !== stableJson(expectedRequest)) {
      const staleField = Object.keys(expectedRequest).find(
        (key) =>
          stableJson(request[key]) !==
          stableJson(expectedRequest[key as keyof typeof expectedRequest]),
      ) ?? "unknown";
      throw new CascadeError(
        `COMPLETED general evaluation request differs from frozen authored authority: ${staleField}`,
      );
    }
    if (
      input.evaluation.source_manifest_digest !== input.sourceDigest ||
      input.evaluation.execution_receipt_digest !== input.executionDigest ||
      input.evaluation.calibration_receipt_digest !== calibrationDigest ||
      input.evaluation.evaluation_input_digest !== expectedInputDigest ||
      input.evaluation.provider !== authority.profile.provider ||
      input.evaluation.profile_id !== authority.profile.id ||
      input.evaluation.profile_digest !== sha256Text(stableJson(authority.profile)) ||
      input.evaluation.rubric_id !== (authority.rubric?.id ?? null) ||
      input.evaluation.rubric_digest !==
        (authority.rubric ? sha256Text(stableJson(authority.rubric)) : null) ||
      input.evaluation.model !== (authority.profile.model ?? null) ||
      input.evaluation.reasoning_effort !==
        (authority.profile.reasoning_effort ?? null) ||
      stableJson(input.evaluation.principal_identities) !== stableJson(expectedPrincipals)
    ) {
      throw new CascadeError(
        "COMPLETED general evaluation request or authored authority is stale or mismatched",
      );
    }
    const mechanical = generalMechanical;
    if (authority.profile.provider === "fixture") {
      const prohibited = input.relativeFiles.filter(
        (path) =>
          path === `${evaluationRoot}/input/input-manifest.json` ||
          path === `${evaluationRoot}/stdout.jsonl` ||
          path === `${evaluationRoot}/provider-output.json`,
      );
      if (prohibited.length) {
        throw new CascadeError("fixture evaluation contains Codex provider evidence");
      }
      const mechanicalLedger = mechanical.claim_ledger as CurrentTerminalClaim[];
      const mechanicalStatus = String(mechanical.status);
      const expectedStatus: CurrentTerminalStatus = mechanicalStatus === "PASS"
        ? "PASS"
        : mechanicalStatus === "BLOCKED"
          ? "BLOCKED"
          : "FAIL";
      const earliestFailure = mechanicalLedger.find(
        (claim) =>
          claim.class !== "release-eligibility" &&
          claim.status !== "SUPPORTED",
      )?.claim_id ?? null;
      if (
        stableJson(input.evaluation.claim_ledger) !== stableJson(mechanicalLedger) ||
        input.evaluation.status !== expectedStatus ||
        input.evaluation.root_cause !== (expectedStatus === "PASS" ? "none" : "mechanical-gate") ||
        input.evaluation.earliest_failure !==
          (expectedStatus === "PASS" ? null : earliestFailure ?? "mechanical-gate") ||
        stableJson(input.evaluation.residual_uncertainty) !== stableJson([
          "fixture evaluation proves deterministic reducer mechanics only",
        ]) ||
        input.evaluation.next_route !==
          "target-specific independent evaluation remains NOT_RUN" ||
        stableJson(input.evaluation.refinement_proposal_bindings) !== "[]"
      ) {
        throw new CascadeError(
          "fixture evaluation receipt is not the deterministic mechanical projection",
        );
      }
      return {
        digest: calibrationDigest,
        status: calibration ? String(calibration.status) : "NOT_RUN",
        scope: calibration?.framework_fixture === true
          ? "framework-fixture"
          : calibration
            ? String(calibration.source_kind)
            : "none",
      };
    }
    if (input.evaluation.provider !== "codex") {
      throw new CascadeError("COMPLETED evaluation provider is invalid");
    }
    const manifestPath = `${evaluationRoot}/input/input-manifest.json`;
    const tracePath = `${evaluationRoot}/stdout.jsonl`;
    const outputPath = `${evaluationRoot}/provider-output.json`;
    for (const path of [manifestPath, tracePath, outputPath]) {
      if (!input.relativeFiles.includes(path)) {
        throw new CascadeError(`Codex evaluation lacks canonical provider evidence: ${path}`);
      }
    }
    const manifest = requireExactOwnDataObject(
      await readBoundedStructuredJson<unknown>(
        this.path(manifestPath),
        "Codex evaluation input manifest",
      ),
      "Codex evaluation input manifest",
      [
        "evaluation_id",
        "evaluation_input_digest",
        "files",
        "manifest_digest",
        "schema_version",
      ],
    );
    const files = Array.isArray(manifest.files)
      ? manifest.files.map((file, index) =>
          requireExactOwnDataObject(file, `Codex input file ${index}`, ["path", "sha256"])
        )
      : [];
    if (
      manifest.schema_version !== 1 ||
      manifest.evaluation_id !== evaluationId ||
      manifest.evaluation_input_digest !== expectedInputDigest ||
      manifest.manifest_digest !== sha256Text(stableJson(files)) ||
      input.evaluation.input_manifest_digest !== manifest.manifest_digest
    ) {
      throw new CascadeError("Codex evaluation input manifest is stale or mismatched");
    }
    const listed = new Set<string>();
    for (const [index, file] of files.entries()) {
      if (
        typeof file.path !== "string" ||
        !file.path ||
        file.path.startsWith("/") ||
        file.path.split("/").includes("..") ||
        typeof file.sha256 !== "string" ||
        !/^[a-f0-9]{64}$/.test(file.sha256) ||
        listed.has(file.path)
      ) {
        throw new CascadeError(`Codex input file ${index} is invalid`);
      }
      listed.add(file.path);
      const record = await fileRecord(
        this.runRoot,
        this.path(`${evaluationRoot}/input/${file.path}`),
      );
      if (record.sha256 !== file.sha256) {
        throw new CascadeError(`Codex evaluation input is stale: ${file.path}`);
      }
    }
    const actualInputFiles = input.relativeFiles
      .filter(
        (path) =>
          path.startsWith(`${evaluationRoot}/input/`) &&
          path !== manifestPath,
      )
      .map((path) => path.slice(`${evaluationRoot}/input/`.length));
    if (
      stableJson([...listed].sort()) !== stableJson(actualInputFiles.sort())
    ) {
      throw new CascadeError("Codex evaluation input manifest is incomplete or substituted");
    }
    const traceRecord = await fileRecord(this.runRoot, this.path(tracePath));
    if (traceRecord.sha256 !== input.evaluation.provider_trace_digest) {
      throw new CascadeError("Codex provider trace digest is stale or mismatched");
    }
    const trace = await readBoundedStructuredText(
      this.path(tracePath),
      "Codex provider trace",
    );
    const traceOutput = terminalCodexOutput(trace);
    const output = requireRecord(
      await readBoundedStructuredJson<unknown>(
        this.path(outputPath),
        "Codex provider output",
      ),
      "Codex provider output",
    );
    const outputClaims = Array.isArray(output.claim_assessments)
      ? output.claim_assessments.map((claim, index) =>
          requireRecord(claim, `Codex output claim ${index}`)
        )
      : [];
    if (
      stableJson(output) !== stableJson(traceOutput) ||
      sha256Text(stableJson(output)) !== input.evaluation.provider_output_digest ||
      output.schema_version !== 3 ||
      output.evaluation_id !== evaluationId ||
      output.run_id !== input.reservation.run_id ||
      output.campaign_id !== input.reservation.campaign_id ||
      output.source_manifest_digest !== input.sourceDigest ||
      output.execution_receipt_digest !== input.executionDigest ||
      output.evaluation_input_digest !== expectedInputDigest ||
      output.input_manifest_digest !== manifest.manifest_digest ||
      output.evaluator_identity !== input.reservation.identities.evaluator.subject ||
      output.mechanical_gate_status !== mechanical.status ||
      new Set(outputClaims.map((claim) => claim.claim_id)).size !== outputClaims.length ||
      stableJson(outputClaims.map((claim) => claim.claim_id).sort()) !==
        stableJson(generalClaims.map((claim) => claim.id).sort())
    ) {
      throw new CascadeError("Codex provider output is stale, untyped, or substituted");
    }
    const assessments = new Map(outputClaims.map((claim) => [String(claim.claim_id), claim]));
    const mechanicalLedger = mechanical.claim_ledger as CurrentTerminalClaim[];
    const projectedLedger = mechanicalLedger.map((mechanicalClaim) => {
      const assessment = assessments.get(mechanicalClaim.claim_id)!;
      if (
        !assessment ||
        !CURRENT_CLAIM_STATUSES.has(assessment.status as ClaimStatus) ||
        typeof assessment.reason !== "string" ||
        !assessment.reason ||
        !Array.isArray(assessment.evidence) ||
        new Set(assessment.evidence).size !== assessment.evidence.length ||
        assessment.evidence.some(
          (path) =>
            typeof path !== "string" ||
            !path ||
            path.startsWith("/") ||
            path.split("/").includes(".."),
        )
      ) {
        throw new CascadeError(
          `Codex provider claim judgment is invalid: ${mechanicalClaim.claim_id}`,
        );
      }
      if (mechanicalClaim.status !== "SUPPORTED") return mechanicalClaim;
      return {
        ...mechanicalClaim,
        status: assessment.status as ClaimStatus,
        reason: assessment.reason as string,
        evidence: [
          ...new Set([
            ...mechanicalClaim.evidence,
            ...(assessment.evidence as string[]),
          ]),
        ],
      };
    });
    const expectedStatus = claimLedgerTerminalStatus(projectedLedger);
    const rawProposals = Array.isArray(output.refinement_proposals)
      ? output.refinement_proposals
      : [];
    const proposalBindings = rawProposals.map((candidate, index) => {
      const proposal = requireExactOwnDataObject(
        candidate,
        `Codex refinement proposal ${index}`,
        [
          "confidence",
          "derivation_id",
          "disposition_route",
          "evidence_paths",
          "persona_id",
          "proposal_id",
          "proposal_type",
          "rationale",
          "recommended_change",
          "summary",
          "target_field",
        ],
      );
      if (typeof proposal.proposal_id !== "string" || !proposal.proposal_id) {
        throw new CascadeError(`Codex refinement proposal ${index} is invalid`);
      }
      return {
        proposal_id: proposal.proposal_id,
        candidate_digest: sha256Text(stableJson(proposal)),
      };
    });
    if (
      stableJson(input.evaluation.claim_ledger) !== stableJson(projectedLedger) ||
      input.evaluation.status !== expectedStatus ||
      input.evaluation.root_cause !== output.root_cause ||
      input.evaluation.earliest_failure !== output.earliest_failure ||
      stableJson(input.evaluation.residual_uncertainty) !==
        stableJson(output.residual_uncertainty) ||
      input.evaluation.next_route !== output.next_route ||
      stableJson(input.evaluation.refinement_proposal_bindings) !==
        stableJson(proposalBindings)
    ) {
      throw new CascadeError(
        "Codex evaluation receipt is not the authenticated provider judgment projection",
      );
    }
    return {
      digest: calibrationDigest,
      status: calibration ? String(calibration.status) : "NOT_RUN",
      scope: calibration?.framework_fixture === true
        ? "framework-fixture"
        : calibration
          ? String(calibration.source_kind)
          : "none",
    };
  }

  private async validateTerminalEvidence(
    status: CampaignRunFinalization["status"],
    reservation: CampaignRunReservation,
    relativeFiles: string[],
    allowLegacyNotApplicableReceipt = false,
  ): Promise<void> {
    await this.validateLeaseTakeoverHistory(reservation);
    const lifecyclePath = this.path("lifecycle.jsonl");
    if (!relativeFiles.includes("lifecycle.jsonl")) {
      throw new CascadeError(`${status} finalization requires lifecycle evidence`);
    }
    const lifecycleLines = (await readBoundedStructuredText(
      lifecyclePath,
      "campaign lifecycle",
    ))
      .split(/\r?\n/)
      .filter(Boolean);
    const lifecycle = lifecycleLines.map((line, index) => {
      try {
        return requireRecord(JSON.parse(line), `lifecycle line ${index + 1}`);
      } catch (error) {
        if (error instanceof CascadeError) throw error;
        throw new CascadeError(`lifecycle line ${index + 1} is invalid JSON`);
      }
    });
    if (!lifecycle.length || !lifecycle.some((event) => event.status === "RUNNING")) {
      throw new CascadeError(`${status} finalization requires a RUNNING lifecycle event`);
    }

    if (status === "UNKNOWN_OUTCOME") {
      const recovery = requireRecord(
        await readBoundedStructuredJson<unknown>(
          this.path("recovery/recovery-receipt.json"),
          "recovery receipt",
        ),
        "recovery receipt",
      );
      assertIdentity(recovery, reservation, "recovery receipt");
      const recoveryContext = requireExactOwnDataObject(
        recovery.recovery_context,
        "UNKNOWN_OUTCOME recovery context",
        [
          "checkpoint_digest",
          "interrupted_operations",
        ],
      );
      const nullableDigest = (value: unknown): boolean =>
        value === null || (typeof value === "string" && /^[a-f0-9]{64}$/.test(value));
      const interruptedOperations = Array.isArray(recoveryContext.interrupted_operations)
        ? recoveryContext.interrupted_operations.map((value, index) =>
            requireExactOwnDataObject(
              value,
              `UNKNOWN_OUTCOME interrupted operation ${index}`,
              ["dispatch_digest", "idempotency_key_digest", "step_id"],
            )
          )
        : [];
      if (
        !Array.isArray(recoveryContext.interrupted_operations) ||
        interruptedOperations.some((operation) =>
          typeof operation.step_id !== "string" ||
          !operation.step_id ||
          typeof operation.idempotency_key_digest !== "string" ||
          !/^[a-f0-9]{64}$/.test(operation.idempotency_key_digest) ||
          !nullableDigest(operation.dispatch_digest)
        ) ||
        new Set(interruptedOperations.map((operation) => operation.step_id)).size !==
          interruptedOperations.length ||
        !nullableDigest(recoveryContext.checkpoint_digest)
      ) {
        throw new CascadeError("UNKNOWN_OUTCOME recovery context is invalid");
      }
      const checkpoint = await this.readLatestSessionCheckpoint<Record<string, unknown>>();
      if (checkpoint === null) {
        if (
          recoveryContext.checkpoint_digest !== null ||
          interruptedOperations.length !== 0
        ) {
          throw new CascadeError(
            "UNKNOWN_OUTCOME recovery context claims an absent session checkpoint",
          );
        }
      } else {
        const interruptedStepIds = checkpoint.last_batch_step_ids.filter(
          (stepId) => !checkpoint.completed_step_ids.includes(stepId),
        );
        if (
          recoveryContext.checkpoint_digest !== checkpoint.checkpoint_digest ||
          stableJson(interruptedOperations.map((operation) => operation.step_id)) !==
            stableJson(interruptedStepIds)
        ) {
          throw new CascadeError(
            "UNKNOWN_OUTCOME recovery context is not bound to the latest checkpoint",
          );
        }
        if (interruptedStepIds.length > 0) {
          const events = await this.readSessionEvents();
          for (const operation of interruptedOperations) {
            const binding = events
              .flatMap((event) => event.step_bindings ?? [])
              .find((candidate) => candidate.step_id === operation.step_id);
            if (!binding || operation.idempotency_key_digest !== binding.idempotency_key_digest) {
              throw new CascadeError(
                "UNKNOWN_OUTCOME recovery context idempotency binding is stale",
              );
            }
            const taskId = operation.step_id.startsWith("task:")
              ? operation.step_id.slice("task:".length)
              : null;
            const dispatchPath = taskId
              ? `execution/tasks/${taskId}/dispatch.json`
              : null;
            const expectedDispatchDigest =
              dispatchPath && relativeFiles.includes(dispatchPath)
                ? sha256Text(stableJson(await readBoundedStructuredJson<unknown>(
                    this.path(dispatchPath),
                    `UNKNOWN_OUTCOME interrupted dispatch ${taskId}`,
                  )))
                : null;
            if (operation.dispatch_digest !== expectedDispatchDigest) {
              throw new CascadeError(
                "UNKNOWN_OUTCOME recovery context dispatch binding is stale",
              );
            }
          }
        }
      }
      if (
        recovery.status !== "UNKNOWN_OUTCOME" ||
        !["VERIFIED", "INCOMPLETE", "UNKNOWN"].includes(
          String(recovery.cleanup_status),
        ) ||
        typeof recovery.reason !== "string" ||
        !recovery.reason.trim() ||
        typeof recovery.recovery_action !== "string" ||
        !recovery.recovery_action.trim() ||
        stableJson(recovery.recovery_identity) !==
          stableJson(reservation.identities.recovery)
      ) {
        throw new CascadeError("UNKNOWN_OUTCOME recovery receipt is incomplete");
      }
      if (!lifecycle.some((event) => event.status === "UNKNOWN_OUTCOME")) {
        throw new CascadeError(
          "UNKNOWN_OUTCOME finalization requires a matching lifecycle event",
        );
      }
      return;
    }

    const sourceManifest = requireRecord(
      await readBoundedStructuredJson<unknown>(
        this.path("execution/source-manifest.json"),
        "source manifest",
      ),
      "source manifest",
    );
    const execution = requireRecord(
      await readBoundedStructuredJson<unknown>(
        this.path("execution/execution-receipt.json"),
        "execution receipt",
      ),
      "execution receipt",
    );
    const summary = requireRecord(
      await readBoundedStructuredJson<unknown>(
        this.path("summary.json"),
        "campaign summary",
      ),
      "campaign summary",
    );
    for (const [value, label] of [
      [sourceManifest, "source manifest"],
      [execution, "execution receipt"],
      [summary, "campaign summary"],
    ] as const) {
      assertIdentity(value, reservation, label);
    }
    const sourceDigest = sha256Text(stableJson(sourceManifest));
    const executionDigest = sha256Text(stableJson(execution));
    const authoritativeClaims = sourceManifest.schema_version === 3
      ? await this.validateCurrentClaimAuthority(sourceManifest, reservation)
      : null;
    const terminalClockNow = this.clockInstant("campaign terminal validation");
    const expectedClockReceiptPaths = new Set<string>();
    const trustedLifecycleAt = async (
      event: Record<string, unknown>,
      label: string,
    ): Promise<string> => {
      const authority = requireExactOwnDataObject(
        event.clock_authority,
        `${label} clock authority`,
        [
          "lease_expires_at",
          "lease_generation",
          "lease_id",
          "lease_renewed_at",
          "observed_at",
          "receipt_digest",
          "receipt_path",
          "reservation_digest",
          "schema_version",
          "source",
        ],
      );
      const at = String(event.at);
      const renewed = String(authority.lease_renewed_at);
      const expires = String(authority.lease_expires_at);
      const atMillis = Date.parse(at);
      const renewedMillis = Date.parse(renewed);
      const expiresMillis = Date.parse(expires);
      const nowMillis = Date.parse(terminalClockNow);
      const receiptPath = String(authority.receipt_path);
      const receiptDigest = String(authority.receipt_digest);
      if (
        !/^execution\/lifecycle-clock\/\d{8}-[a-f0-9]{64}\.json$/.test(receiptPath) ||
        !/^[a-f0-9]{64}$/.test(receiptDigest) ||
        !receiptPath.endsWith(`-${receiptDigest}.json`) ||
        expectedClockReceiptPaths.has(receiptPath) ||
        !relativeFiles.includes(receiptPath)
      ) {
        throw new CascadeError(`${label} clock receipt authority is stale or invalid`);
      }
      expectedClockReceiptPaths.add(receiptPath);
      const receipt = requireExactOwnDataObject(
        await readBoundedStructuredJson<unknown>(
          this.path(receiptPath),
          `${label} clock receipt`,
        ),
        `${label} clock receipt`,
        [
          "lease_expires_at",
          "lease_generation",
          "lease_id",
          "lease_renewed_at",
          "observed_at",
          "reservation_digest",
          "schema_version",
          "source",
        ],
      );
      const receiptMetadata = await lstat(this.path(receiptPath));
      const receiptAuthority = { ...authority };
      delete receiptAuthority.receipt_path;
      delete receiptAuthority.receipt_digest;
      if (
        authority.schema_version !== 1 ||
        authority.source !== "campaign-artifact-store-clock" ||
        authority.observed_at !== at ||
        authority.reservation_digest !== sha256Text(stableJson(reservation)) ||
        typeof authority.lease_id !== "string" ||
        !authority.lease_id ||
        !Number.isSafeInteger(authority.lease_generation) ||
        Number(authority.lease_generation) < 0 ||
        !Number.isFinite(atMillis) ||
        !Number.isFinite(renewedMillis) ||
        !Number.isFinite(expiresMillis) ||
        renewedMillis > atMillis ||
        atMillis >= expiresMillis ||
        expiresMillis - renewedMillis > MAX_TRUSTED_LIFECYCLE_AGE_MS ||
        compareRfc3339Instants(reservation.reserved_at, at) > 0 ||
        atMillis > nowMillis ||
        stableJson(receipt) !== stableJson(receiptAuthority) ||
        sha256Text(stableJson(receipt)) !== receiptDigest ||
        !receiptMetadata.isFile() ||
        receiptMetadata.isSymbolicLink() ||
        Math.abs(receiptMetadata.ctimeMs - atMillis) > 5_000
      ) {
        throw new CascadeError(`${label} clock authority is stale or invalid`);
      }
      return at;
    };
    if (
      execution.source_manifest_digest !== sourceDigest ||
      summary.execution_receipt_digest !== executionDigest ||
      execution.cleanup_verified !== true
    ) {
      throw new CascadeError(
        `${status} terminal evidence has invalid source, execution, or cleanup linkage`,
      );
    }
    const evaluationPaths = relativeFiles.filter(
      (path) => path.startsWith("evaluations/") && path.endsWith("/receipt.json"),
    );
    if (authoritativeClaims) {
      for (const [index, heartbeat] of lifecycle
        .filter((event) => event.status === "HEARTBEAT")
        .entries()) {
        await trustedLifecycleAt(
          heartbeat,
          `campaign heartbeat lifecycle ${index + 1}`,
        );
      }
    }
    const evaluationEvents = lifecycle.filter((event) => event.status === "EVALUATING");
    if (
      authoritativeClaims &&
      (evaluationEvents.length !== 1 || !isDateTime(evaluationEvents[0]!.at))
    ) {
      throw new CascadeError(
        "COMPLETED current terminal evidence requires one authenticated evaluation instant",
      );
    }
    const evaluationAt = evaluationEvents.length === 1
      ? authoritativeClaims
        ? await trustedLifecycleAt(evaluationEvents[0]!, "campaign evaluation lifecycle")
        : String(evaluationEvents[0]!.at)
      : null;
    const aggregationPaths = relativeFiles.filter(
      (path) => path.startsWith("aggregations/") && path.endsWith(".json"),
    );
    const specializedPaths = relativeFiles.filter(
      (path) =>
        path.startsWith("specialized-evaluations/") &&
        path.endsWith("/receipt.json"),
    );
    if (
      (reservation.simulation_scope === "harness" && specializedPaths.length !== 1) ||
      (reservation.simulation_scope === "product" && specializedPaths.length !== 0)
    ) {
      throw new CascadeError(
        "COMPLETED terminal evidence has a missing, duplicate, or prohibited specialized evaluation receipt",
      );
    }
    let specialized: SpecializedEvaluationReceipt | null = null;
    let specializedDigest: string | null = null;
    if (reservation.simulation_scope === "harness") {
      specialized = requireRecord(
        await readBoundedStructuredJson<unknown>(
          this.path(specializedPaths[0]!),
          "specialized evaluation receipt",
        ),
        "specialized evaluation receipt",
      ) as unknown as SpecializedEvaluationReceipt;
      if (!reservation.specialized_evaluation || !reservation.identities.specialized_evaluator) {
        throw new CascadeError("harness reservation lacks specialized evaluation authority");
      }
      const rawSpecialized = specialized as unknown as Record<string, unknown>;
      const receiptForValidation: SpecializedEvaluationReceipt =
        allowLegacyNotApplicableReceipt &&
        rawSpecialized.schema_version === 1 &&
        specialized.applicability === "NOT_APPLICABLE" &&
        !("evidence_artifacts" in rawSpecialized)
          ? {
              ...rawSpecialized,
              schema_version: 2 as const,
              evidence_artifacts: [],
            } as unknown as SpecializedEvaluationReceipt
          : specialized;
      verifySpecializedEvaluationReceipt(receiptForValidation, {
        path: specializedPaths[0]!,
        run_id: reservation.run_id,
        campaign_id: reservation.campaign_id,
        declaration: reservation.specialized_evaluation,
        source_manifest_digest: sourceDigest,
        execution_receipt_digest: executionDigest,
        claim_authority_digest:
          sourceManifest.schema_version === 3
            ? String(requireRecord(
                sourceManifest.claim_authority,
                "source manifest claim authority binding",
              ).sha256)
            : "0".repeat(64),
        specialized_evaluator: reservation.identities.specialized_evaluator,
        other_principals: [
          reservation.identities.operator,
          reservation.identities.evaluator,
          reservation.identities.aggregator,
          reservation.identities.target,
          reservation.identities.simulator,
          reservation.identities.recovery,
        ],
        claims: authoritativeClaims ?? specialized.claim_ledger.map((claim) => ({
          id: claim.claim_id,
          class: claim.class,
        })),
        artifact_files: await Promise.all(
          receiptForValidation.evidence_artifacts.map(async (artifact) => {
            const record = await fileRecord(
              this.runRoot,
              this.path(artifact.path),
            );
            return {
              path: record.path,
              sha256: record.sha256,
              content: await readBoundedStructuredText(
                this.path(artifact.path),
                `specialized evidence ${artifact.path}`,
              ),
            };
          }),
        ),
      });
      specializedDigest = sha256Text(stableJson(specialized));
    }
    if (
      status === "BLOCKED" &&
      evaluationPaths.length === 0 &&
      aggregationPaths.length === 0
    ) {
      const terminalLifecycleEvents = lifecycle.filter(
        (event) => event.status === "BLOCKED",
      );
      if (terminalLifecycleEvents.length !== 1) {
        throw new CascadeError("BLOCKED finalization requires one terminal lifecycle event");
      }
      const terminalLifecycleAt = authoritativeClaims
        ? await trustedLifecycleAt(
            terminalLifecycleEvents[0]!,
            "campaign terminal lifecycle",
          )
        : String(terminalLifecycleEvents[0]!.at);
      const actualClockReceiptPaths = relativeFiles.filter(
        (path) => path.startsWith("execution/lifecycle-clock/") && path.endsWith(".json"),
      );
      if (
        authoritativeClaims &&
        stableJson(actualClockReceiptPaths.sort()) !==
          stableJson([...expectedClockReceiptPaths].sort())
      ) {
        throw new CascadeError(
          "campaign lifecycle clock receipt coverage is incomplete or excessive",
        );
      }
      const calibrationPaths = relativeFiles.filter(
        (path) => path.startsWith("calibrations/") && path.endsWith(".json"),
      );
      if (calibrationPaths.length > 1) {
        throw new CascadeError("BLOCKED finalization has duplicate calibration authority");
      }
      const calibration = calibrationPaths.length
        ? requireRecord(
            await readBoundedStructuredJson<unknown>(
              this.path(calibrationPaths[0]!),
              "blocked calibration receipt",
            ),
            "blocked calibration receipt",
          )
        : null;
      const expectedSpecializedBinding = specialized
        ? {
            receipt_id: specialized.specialized_evaluation_id,
            receipt_digest: specializedDigest,
            status: specialized.status,
            claim_ids: specialized.claim_ids,
          }
        : null;
      const blockedAuthority = authoritativeClaims
        ? await this.currentMechanicalProjection({
            sourceManifest,
            reservation,
            execution,
            calibration,
            claims: authoritativeClaims,
            specializedBinding: expectedSpecializedBinding,
            relativeFiles,
            evaluationAt: evaluationAt!,
          })
        : null;
      const summaryKeys = [
        "aggregation_receipt_digest",
        "calibration_receipt_digest",
        "calibration_status",
        "campaign_id",
        "campaign_status",
        "completed_at",
        "evaluation_attempt",
        "evaluation_blocker",
        "evaluation_profile_id",
        "evaluation_provider",
        "evaluation_receipt_digest",
        "evaluation_status",
        "execution_receipt_digest",
        "execution_status",
        "mechanical_status",
        "release_eligible",
        "run_id",
        "schema_version",
        "specialized_evaluation_receipt_digest",
      ];
      const blocker = terminalLifecycleEvents[0]!.reason;
      if (
        Object.keys(summary).sort().join(",") !== summaryKeys.sort().join(",") ||
        summary.schema_version !== 1 ||
        summary.run_id !== reservation.run_id ||
        summary.campaign_id !== reservation.campaign_id ||
        summary.campaign_status !== "BLOCKED" ||
        summary.evaluation_status !== "BLOCKED" ||
        summary.execution_status !== execution.status ||
        (blockedAuthority !== null &&
          summary.mechanical_status !== blockedAuthority.mechanical.status) ||
        (blockedAuthority !== null &&
          summary.evaluation_provider !== blockedAuthority.profile.provider) ||
        (blockedAuthority !== null &&
          summary.evaluation_profile_id !== blockedAuthority.profile.id) ||
        summary.release_eligible !== false ||
        summary.specialized_evaluation_receipt_digest !== specializedDigest ||
        summary.evaluation_receipt_digest !== null ||
        summary.calibration_status !== (calibration?.status ?? "NOT_RUN") ||
        summary.calibration_receipt_digest !==
          (calibration ? sha256Text(stableJson(calibration)) : null) ||
        summary.aggregation_receipt_digest !== null ||
        summary.execution_receipt_digest !== executionDigest ||
        summary.evaluation_attempt !== terminalLifecycleEvents[0]!.evaluation_attempt ||
        summary.evaluation_blocker !== blocker ||
        typeof blocker !== "string" ||
        !blocker.trim() ||
        !isDateTime(summary.completed_at) ||
        Math.floor(Date.parse(String(summary.completed_at)) / 1_000) >
          Math.floor(Date.parse(terminalLifecycleAt) / 1_000)
      ) {
        throw new CascadeError("BLOCKED finalization requires matching terminal evidence");
      }
      const attemptPaths = relativeFiles.filter(
        (path) => path.startsWith("evaluations/") && path.endsWith("/attempt.json"),
      );
      if (summary.evaluation_attempt === null) {
        if (attemptPaths.length !== 0) {
          throw new CascadeError("BLOCKED finalization has an unauthenticated evaluation attempt");
        }
      } else {
        const expectedAttemptPath =
          `evaluations/${reservation.run_id}-evaluation/attempt.json`;
        if (
          summary.evaluation_attempt !== expectedAttemptPath ||
          stableJson(attemptPaths) !== stableJson([expectedAttemptPath])
        ) {
          throw new CascadeError("BLOCKED finalization has an invalid evaluation attempt path");
        }
        const attempt = requireExactOwnDataObject(
          await readBoundedStructuredJson<unknown>(
            this.path(expectedAttemptPath),
            "blocked evaluation attempt",
          ),
          "blocked evaluation attempt",
          [
            "campaign_id",
            "created_at",
            "duration_ms",
            "evaluation_id",
            "evaluation_input_digest",
            "exit_code",
            "model",
            "provider",
            "reason",
            "reasoning_effort",
            "run_id",
            "schema_version",
            "status",
            "timed_out",
          ],
        );
        const requestPath =
          `evaluations/${reservation.run_id}-evaluation/input/request.json`;
        const request = requireExactOwnDataObject(
          await readBoundedStructuredJson<unknown>(
            this.path(requestPath),
            "blocked evaluation request",
          ),
          "blocked evaluation request",
          [
            "calibration_receipt_digest",
            "campaign_id",
            "evaluation_id",
            "evaluation_input_digest",
            "evaluator_identity",
            "execution_receipt_digest",
            "mechanical_evaluation",
            "operator_identity",
            "principal_identities",
            "profile",
            "rubric",
            "run_id",
            "schema_version",
            "source_manifest_digest",
            "specialized_evaluation",
            "target_actor_identity",
          ],
        );
        const expectedRequestInput = {
          schema_version: 1,
          evaluation_id: `${reservation.run_id}-evaluation`,
          run_id: reservation.run_id,
          campaign_id: reservation.campaign_id,
          source_manifest_digest: sourceDigest,
          execution_receipt_digest: executionDigest,
          calibration_receipt_digest: calibration
            ? sha256Text(stableJson(calibration))
            : null,
          operator_identity: reservation.identities.operator.subject,
          target_actor_identity: reservation.identities.target.subject,
          evaluator_identity: reservation.identities.evaluator.subject,
          principal_identities: {
            operator: reservation.identities.operator.subject,
            specialized_evaluator:
              reservation.identities.specialized_evaluator?.subject ?? null,
            evaluator: reservation.identities.evaluator.subject,
            aggregator: reservation.identities.aggregator.subject,
            target: reservation.identities.target.subject,
            simulator: reservation.identities.simulator.subject,
            recovery: reservation.identities.recovery.subject,
          },
          specialized_evaluation: expectedSpecializedBinding,
          profile: blockedAuthority?.profile,
          rubric: blockedAuthority?.rubric ?? null,
          mechanical_evaluation: blockedAuthority?.mechanical,
        };
        const expectedRequest = {
          ...expectedRequestInput,
          evaluation_input_digest: sha256Text(stableJson(expectedRequestInput)),
        };
        const evaluationRoot = `evaluations/${reservation.run_id}-evaluation`;
        const inputManifestPath = `${evaluationRoot}/input/input-manifest.json`;
        const inputManifest = requireExactOwnDataObject(
          await readBoundedStructuredJson<unknown>(
            this.path(inputManifestPath),
            "blocked evaluation input manifest",
          ),
          "blocked evaluation input manifest",
          [
            "evaluation_id",
            "evaluation_input_digest",
            "files",
            "manifest_digest",
            "schema_version",
          ],
        );
        const inputFiles = Array.isArray(inputManifest.files)
          ? inputManifest.files.map((value, index) =>
              requireExactOwnDataObject(
                value,
                `blocked evaluation input manifest file ${index}`,
                ["path", "sha256"],
              )
            )
          : [];
        const listedInputPaths = new Set<string>();
        for (const [index, file] of inputFiles.entries()) {
          if (
            typeof file.path !== "string" ||
            !file.path ||
            file.path.startsWith("/") ||
            file.path.split("/").includes("..") ||
            typeof file.sha256 !== "string" ||
            !/^[a-f0-9]{64}$/.test(file.sha256) ||
            listedInputPaths.has(file.path)
          ) {
            throw new CascadeError(
              `blocked evaluation input manifest file ${index} is invalid`,
            );
          }
          listedInputPaths.add(file.path);
          const record = await fileRecord(
            this.runRoot,
            this.path(`${evaluationRoot}/input/${file.path}`),
          );
          if (record.sha256 !== file.sha256) {
            throw new CascadeError(
              `blocked evaluation input differs from its manifest: ${file.path}`,
            );
          }
        }
        const providerOutputPath = `${evaluationRoot}/provider-output.json`;
        const providerOutputPresent = relativeFiles.includes(providerOutputPath);
        const expectedAttemptFiles = [
          `${evaluationRoot}/attempt.json`,
          `${evaluationRoot}/command.json`,
          inputManifestPath,
          ...[...listedInputPaths].map((path) => `${evaluationRoot}/input/${path}`),
          ...(providerOutputPresent ? [providerOutputPath] : []),
          `${evaluationRoot}/stderr.log`,
          `${evaluationRoot}/stdout.jsonl`,
        ].sort();
        const actualAttemptFiles = relativeFiles
          .filter((path) => path.startsWith(`${evaluationRoot}/`))
          .sort();
        if (
          inputManifest.schema_version !== 1 ||
          inputManifest.evaluation_id !== `${reservation.run_id}-evaluation` ||
          inputManifest.evaluation_input_digest !== request.evaluation_input_digest ||
          inputManifest.manifest_digest !== sha256Text(stableJson(inputFiles)) ||
          stableJson(actualAttemptFiles) !== stableJson(expectedAttemptFiles)
        ) {
          throw new CascadeError(
            "BLOCKED evaluation attempt file set or input manifest is not exact",
          );
        }
        const command = await readBoundedStructuredJson<unknown>(
          this.path(`${evaluationRoot}/command.json`),
          "blocked evaluation command",
        );
        const stdout = new TextDecoder("utf-8", { fatal: true }).decode(
          await this.readArtifactBytes(
            `${evaluationRoot}/stdout.jsonl`,
            "blocked evaluation stdout",
          ),
        );
        const stderr = new TextDecoder("utf-8", { fatal: true }).decode(
          await this.readArtifactBytes(
            `${evaluationRoot}/stderr.log`,
            "blocked evaluation stderr",
          ),
        );
        const providerOutput = providerOutputPresent
          ? await readBoundedStructuredJson<unknown>(
              this.path(providerOutputPath),
              "blocked evaluation provider output",
            )
          : undefined;
        const reconstructedBlocker = reconstructCodexBlockedAttemptReason({
          attempt: {
            exit_code: Number(attempt.exit_code),
            timed_out: Boolean(attempt.timed_out),
          },
          request: request as unknown as EvaluationRequest,
          input_manifest_digest: String(inputManifest.manifest_digest),
          command,
          stdout,
          stderr,
          provider_output: providerOutput,
        });
        if (
          !relativeFiles.includes(requestPath) ||
          stableJson(request) !== stableJson(expectedRequest) ||
          attempt.schema_version !== 1 ||
          attempt.evaluation_id !== `${reservation.run_id}-evaluation` ||
          attempt.run_id !== reservation.run_id ||
          attempt.campaign_id !== reservation.campaign_id ||
          attempt.provider !== blockedAuthority?.profile.provider ||
          attempt.model !== blockedAuthority?.profile.model ||
          attempt.reasoning_effort !== blockedAuthority?.profile.reasoning_effort ||
          attempt.evaluation_input_digest !== request.evaluation_input_digest ||
          attempt.status !== "BLOCKED" ||
          attempt.reason !== blocker ||
          reconstructedBlocker === null ||
          reconstructedBlocker !== attempt.reason ||
          !Number.isInteger(attempt.exit_code) ||
          typeof attempt.timed_out !== "boolean" ||
          typeof attempt.duration_ms !== "number" ||
          Number(attempt.duration_ms) < 0 ||
          !isDateTime(attempt.created_at) ||
          Date.parse(String(attempt.created_at)) < Date.parse(evaluationAt!) ||
          Date.parse(String(attempt.created_at)) > Date.parse(terminalLifecycleAt)
        ) {
          throw new CascadeError("BLOCKED evaluation attempt differs from frozen authority");
        }
      }
      return;
    }
    if (evaluationPaths.length !== 1 || aggregationPaths.length !== 1) {
      throw new CascadeError(
        `${status} finalization requires exactly one evaluation and aggregation receipt`,
      );
    }
    const evaluation = requireRecord(
      await readBoundedStructuredJson<unknown>(
        this.path(evaluationPaths[0]!),
        "evaluation receipt",
      ),
      "evaluation receipt",
    );
    const aggregation = requireRecord(
      await readBoundedStructuredJson<unknown>(
        this.path(aggregationPaths[0]!),
        "aggregation receipt",
      ),
      "aggregation receipt",
    );
    const evaluationDigest = sha256Text(stableJson(evaluation));
    const aggregationDigest = sha256Text(stableJson(aggregation));
    const receivingReceiptPath = specialized ? specializedPaths[0]! : evaluationPaths[0]!;
    const receivingReceiptDigest = specialized ? specializedDigest! : evaluationDigest;
    const terminalTaskSummaries = Array.isArray(execution.task_results)
      ? execution.task_results.map((value, index) =>
          requireRecord(value, `terminal handoff task summary ${index}`)
        )
      : [];
    for (const taskSummary of terminalTaskSummaries) {
      const taskId = String(taskSummary.task_id);
      const taskRoot = `execution/tasks/${taskId}`;
      const offer = await readBoundedStructuredJson<RuntimeHandoffReceipt>(
        this.path(`${taskRoot}/handoff-offer.json`),
        `terminal runtime handoff offer ${taskId}`,
      );
      const receipt = await readBoundedStructuredJson<RuntimeHandoffReceipt>(
        this.path(`${taskRoot}/handoff.json`),
        `terminal runtime handoff receipt ${taskId}`,
      );
      const expectedReferences = [
        ...offer.artifact_references,
        { path: receivingReceiptPath, sha256: receivingReceiptDigest },
      ].sort((left, right) => left.path.localeCompare(right.path));
      if (
        !receipt ||
        receipt.receiving_receipt_digest !== receivingReceiptDigest ||
        stableJson(receipt.required_inputs) !==
          stableJson(expectedReferences.map((reference) => reference.path)) ||
        stableJson(receipt.artifact_references) !== stableJson(expectedReferences)
      ) {
        throw new CascadeError(
          `runtime handoff receiving evidence is stale or incomplete: ${taskId}`,
        );
      }
    }
    const terminalLifecycleEvents = lifecycle.filter(
      (event) =>
        event.status === (status === "BLOCKED" ? "BLOCKED" : "COMPLETED"),
    );
    const terminalLifecycleAt =
      authoritativeClaims && terminalLifecycleEvents.length === 1
        ? await trustedLifecycleAt(
          terminalLifecycleEvents[0]!,
          "campaign terminal lifecycle",
        )
        : terminalLifecycleEvents[0]?.at;
    const actualClockReceiptPaths = relativeFiles.filter(
      (path) => path.startsWith("execution/lifecycle-clock/") && path.endsWith(".json"),
    );
    if (
      authoritativeClaims &&
      stableJson(actualClockReceiptPaths.sort()) !== stableJson([...expectedClockReceiptPaths].sort())
    ) {
      throw new CascadeError("campaign lifecycle clock receipt coverage is incomplete or excessive");
    }
    const evaluationEvent = evaluationEvents[0];
    if (
      authoritativeClaims &&
      (!evaluationEvent ||
        evaluationEvent.provider !== evaluation.provider ||
        evaluationEvent.profile_id !== evaluation.profile_id ||
        evaluationEvent.evaluator_identity !== evaluation.evaluator_identity)
    ) {
      throw new CascadeError(
        "COMPLETED authenticated evaluation instant differs from authored authority",
      );
    }
    if (authoritativeClaims) {
      const recordedSecondAfter = (left: string, right: string): boolean =>
        Math.floor(Date.parse(left) / 1_000) > Math.floor(Date.parse(right) / 1_000);
      const chronologyFailure =
        !isDateTime(execution.created_at) ||
          !isDateTime(evaluation.created_at) ||
          !isDateTime(aggregation.created_at) ||
          !isDateTime(summary.completed_at) ||
          terminalLifecycleEvents.length !== 1 ||
          !isDateTime(terminalLifecycleAt)
          ? "invalid-or-duplicate-instant"
          : recordedSecondAfter(String(execution.created_at), evaluationAt!)
            ? "execution-after-evaluation"
            : recordedSecondAfter(evaluationAt!, String(evaluation.created_at))
              ? "evaluation-receipt-before-evaluating"
              : recordedSecondAfter(String(evaluation.created_at), String(aggregation.created_at))
                ? "aggregation-before-evaluation"
                : recordedSecondAfter(String(aggregation.created_at), String(summary.completed_at))
                  ? "summary-before-aggregation"
                  : recordedSecondAfter(
                    String(summary.completed_at),
                    String(terminalLifecycleAt),
                  )
                    ? "terminal-before-summary"
                    : null;
      if (chronologyFailure) {
        throw new CascadeError(
          `COMPLETED evaluation and finalization chronology is stale or inconsistent: ${chronologyFailure} ` +
            `(execution=${String(execution.created_at)} evaluation=${String(evaluationAt)} ` +
            `receipt=${String(evaluation.created_at)} aggregation=${String(aggregation.created_at)} ` +
            `summary=${String(summary.completed_at)} terminal=${String(terminalLifecycleAt)})`,
        );
      }
    }
    const expectedPrincipals = {
      operator: reservation.identities.operator.subject,
      specialized_evaluator: reservation.identities.specialized_evaluator?.subject ?? null,
      evaluator: reservation.identities.evaluator.subject,
      aggregator: reservation.identities.aggregator.subject,
      target: reservation.identities.target.subject,
      simulator: reservation.identities.simulator.subject,
      recovery: reservation.identities.recovery.subject,
    };
    const specializedBinding = evaluation.specialized_evaluation;
    const expectedSpecializedBinding = specialized
      ? {
          receipt_id: specialized.specialized_evaluation_id,
          receipt_digest: specializedDigest,
          status: specialized.status,
          claim_ids: specialized.claim_ids,
        }
      : null;
    const general = validateCurrentEvaluationReceiptShape(
      evaluation,
      reservation,
      expectedSpecializedBinding,
      authoritativeClaims,
    );
    const calibrationAuthority = authoritativeClaims
      ? await this.validateCurrentGeneralEvidenceLinks({
        evaluation,
        reservation,
        sourceManifest,
        execution,
        sourceDigest,
        executionDigest,
        specializedBinding: expectedSpecializedBinding,
        authoritativeClaims,
        relativeFiles,
        evaluationAt: evaluationAt!,
      })
      : {
          digest: evaluation.calibration_receipt_digest as string | null,
          status: String(summary.calibration_status),
          scope: String(summary.calibration_scope),
        };
    if (stableJson(evaluation.principal_identities) !== stableJson(expectedPrincipals)) {
      throw new CascadeError(
        "COMPLETED general evaluation has stale principals or specialized receipt binding",
      );
    }
    const specializedLedger = specialized?.claim_ledger ?? [];
    const combinedLedger = [
      ...specializedLedger,
      ...general.claim_ledger,
    ] as CurrentTerminalClaim[];
    if (
      new Set(combinedLedger.map((claim) => claim.claim_id)).size !==
        combinedLedger.length ||
      stableJson(combinedLedger.map((claim) => claim.claim_id).sort()) !==
        stableJson([...reservation.claim_ids].sort())
    ) {
      throw new CascadeError(
        "COMPLETED evaluation chain has missing, duplicated, or cross-owned claims",
      );
    }
    const expectedReductionStatus = reducedTerminalStatus(
      general.status,
      specialized?.status ?? null,
      combinedLedger,
    );
    const aggregationKeys = [
      "aggregation_id",
      "aggregator_identity",
      "calibration_receipt_digest",
      "campaign_id",
      "created_at",
      "evaluation_receipt_digest",
      "execution_receipt_digest",
      "release_claims",
      "release_eligible",
      "run_id",
      "schema_version",
      "specialized_evaluation_receipt_digest",
      "status",
    ];
    const isDigest = (value: unknown): value is string =>
      typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
    if (
      Object.keys(aggregation).sort().join(",") !== aggregationKeys.join(",") ||
      aggregation.schema_version !== 2 ||
      aggregation.aggregation_id !== `${reservation.run_id}-aggregation` ||
      aggregation.run_id !== reservation.run_id ||
      aggregation.campaign_id !== reservation.campaign_id ||
      aggregation.aggregator_identity !== reservation.identities.aggregator.subject ||
      aggregation.execution_receipt_digest !== executionDigest ||
      aggregation.specialized_evaluation_receipt_digest !== specializedDigest ||
      aggregation.evaluation_receipt_digest !== evaluationDigest ||
      aggregation.calibration_receipt_digest !== calibrationAuthority.digest ||
      aggregation.status !== expectedReductionStatus ||
      !isDateTime(aggregation.created_at) ||
      typeof aggregation.release_eligible !== "boolean" ||
      !Array.isArray(aggregation.release_claims)
    ) {
      throw new CascadeError("COMPLETED aggregation receipt shape or reduction is invalid");
    }
    const releaseClaims = aggregation.release_claims.map((item, index) => {
      const claim = requireExactOwnDataObject(
        item,
        `aggregation release claim ${index}`,
        ["claim_id", "status"],
      );
      if (
        typeof claim.claim_id !== "string" ||
        !CURRENT_CLAIM_STATUSES.has(claim.status as ClaimStatus)
      ) {
        throw new CascadeError(`aggregation release claim ${index} is invalid`);
      }
      return claim as { claim_id: string; status: ClaimStatus };
    });
    const expectedReleaseClaims = combinedLedger
      .filter((claim) => claim.class === "release-eligibility")
      .map((claim) => ({ claim_id: claim.claim_id, status: claim.status }));
    const executionStatus = execution.status as CurrentTerminalStatus;
    if (!CURRENT_TERMINAL_STATUSES.has(executionStatus)) {
      throw new CascadeError("COMPLETED execution terminal status is invalid");
    }
    const expectedReleaseEligible =
      executionStatus === "PASS" &&
      expectedReductionStatus === "PASS" &&
      combinedLedger
        .filter((claim) => claim.class !== "release-eligibility")
        .every((claim) => claim.status === "SUPPORTED") &&
      expectedReleaseClaims.length > 0 &&
      expectedReleaseClaims.every((claim) => claim.status === "SUPPORTED");
    if (
      stableJson(releaseClaims) !== stableJson(expectedReleaseClaims) ||
      aggregation.release_eligible !== expectedReleaseEligible
    ) {
      throw new CascadeError("COMPLETED aggregation release decision is inconsistent");
    }
    const expectedCampaignStatus: CurrentTerminalStatus =
      executionStatus === "BLOCKED" || expectedReductionStatus === "BLOCKED"
        ? "BLOCKED"
        : executionStatus === "PASS" && expectedReductionStatus === "PASS"
          ? "PASS"
          : "FAIL";
    const summaryKeys = [
      "aggregation_receipt_digest",
      "calibration_receipt_digest",
      "calibration_scope",
      "calibration_status",
      "campaign_id",
      "campaign_status",
      "completed_at",
      "evaluation_attempt",
      "evaluation_model",
      "evaluation_profile_id",
      "evaluation_provider",
      "evaluation_receipt_digest",
      "evaluation_status",
      "execution_receipt_digest",
      "execution_status",
      "release_eligible",
      "run_id",
      "schema_version",
      "specialized_evaluation_receipt_digest",
    ];
    if (
      Object.keys(summary).sort().join(",") !== summaryKeys.join(",") ||
      summary.schema_version !== 1 ||
      summary.execution_status !== executionStatus ||
      summary.evaluation_status !== expectedReductionStatus ||
      summary.evaluation_provider !== evaluation.provider ||
      summary.evaluation_profile_id !== evaluation.profile_id ||
      summary.evaluation_model !== evaluation.model ||
      (summary.evaluation_attempt !== null &&
        (typeof summary.evaluation_attempt !== "string" || !summary.evaluation_attempt)) ||
      summary.calibration_status !== calibrationAuthority.status ||
      summary.calibration_scope !== calibrationAuthority.scope ||
      summary.release_eligible !== expectedReleaseEligible ||
      summary.campaign_status !== expectedCampaignStatus ||
      summary.execution_receipt_digest !== executionDigest ||
      summary.specialized_evaluation_receipt_digest !== specializedDigest ||
      summary.evaluation_receipt_digest !== evaluationDigest ||
      summary.calibration_receipt_digest !== calibrationAuthority.digest ||
      summary.aggregation_receipt_digest !== aggregationDigest ||
      !isDateTime(summary.completed_at) ||
      (expectedCampaignStatus === "BLOCKED") !== (status === "BLOCKED") ||
      !lifecycle.some((event) =>
        event.status === (expectedCampaignStatus === "BLOCKED" ? "BLOCKED" : "COMPLETED")
      )
    ) {
      throw new CascadeError("COMPLETED summary is stale or inconsistent with terminal receipts");
    }
    const expectedEvaluationPath = `evaluations/${String(evaluation.evaluation_id)}/receipt.json`;
    if (
      evaluationPaths[0] !== expectedEvaluationPath ||
      evaluation.evaluator_identity !== reservation.identities.evaluator.subject
    ) {
      throw new CascadeError(
        "COMPLETED terminal evidence has an invalid evaluation path or evaluator identity",
      );
    }
    if (!Array.isArray(evaluation.refinement_proposal_bindings)) {
      throw new CascadeError(
        "COMPLETED evaluation receipt lacks refinement proposal bindings",
      );
    }
    const bindings = evaluation.refinement_proposal_bindings.map((value, index) =>
      requireRecord(value, `refinement proposal binding ${index}`),
    );
    const bindingIds = bindings.map((binding) => String(binding.proposal_id));
    if (new Set(bindingIds).size !== bindingIds.length) {
      throw new CascadeError(
        "COMPLETED evaluation receipt has duplicate refinement proposal bindings",
      );
    }
    const refinementPaths = relativeFiles.filter(
      (path) => path.startsWith("refinements/") && path.endsWith(".json"),
    );
    const proposalIds: string[] = [];
    for (const refinementPath of refinementPaths) {
      const proposal = requireRecord(
        await readBoundedStructuredJson<unknown>(
          this.path(refinementPath),
          `refinement ${refinementPath}`,
        ),
        `refinement ${refinementPath}`,
      );
      validatePersonaRefinementProposal(
        proposal,
        `refinement ${refinementPath}`,
      );
      if (refinementPath !== `refinements/${String(proposal.proposal_id)}.json`) {
        throw new CascadeError(
          `COMPLETED refinement path does not match proposal_id: ${refinementPath}`,
        );
      }
      await this.validateRefinementLinkage(
        proposal as unknown as PersonaRefinementProposal,
        reservation,
        sourceManifest,
        evaluation,
      );
      proposalIds.push(String(proposal.proposal_id));
    }
    if (
      stableJson([...proposalIds].sort()) !== stableJson([...bindingIds].sort())
    ) {
      throw new CascadeError(
        "COMPLETED refinement artifacts do not match evaluation proposal bindings",
      );
    }
  }

  private async postIntentRecoveryRecords(
    relativePaths: readonly string[],
    terminalLock: CurrentShapeCampaignTerminalLock,
    reservation: CampaignRunReservation | PreviousCampaignRunReservation,
    finalizationCompletedAt: string,
    schemaVersion: typeof CAMPAIGN_ARTIFACT_SCHEMA_VERSION | typeof PREVIOUS_CAMPAIGN_ARTIFACT_SCHEMA_VERSION = CAMPAIGN_ARTIFACT_SCHEMA_VERSION,
  ): Promise<CampaignArtifactFile[]> {
    const records: CampaignArtifactFile[] = [];
    const manifestLeaseRecord = terminalLock.application_files.find(
      (record) => record.path === "lease.json",
    );
    const currentLeaseSnapshot = await readArtifactJsonSnapshot<unknown>(
      this.runRoot,
      this.path("lease.json"),
      "campaign lease state",
    );
    validateLeaseStateContract(
      currentLeaseSnapshot.value,
      this.runId,
      schemaVersion,
    );
    validateLeaseStateBinding(currentLeaseSnapshot.value, reservation);
    const currentLeaseRecord = currentLeaseSnapshot.record;
    const manifestBoundLease = currentLeaseSnapshot.value;
    if (
      !manifestLeaseRecord ||
      stableJson(manifestLeaseRecord) !== stableJson(currentLeaseRecord)
    ) {
      throw new CascadeError(
        `campaign terminal intent does not bind the authoritative current lease: ${this.runId}`,
      );
    }
    for (const relativePath of [...relativePaths].sort()) {
      const match = /^recovery\/mutation-lock-takeovers\/([^/]+)\.json$/.exec(
        relativePath,
      );
      if (!match) {
        throw new CascadeError(
          `campaign artifact is not an allowed post-intent recovery record: ${relativePath}`,
        );
      }
      const receipt = await readBoundedStructuredJson<CampaignMutationLockTakeoverReceipt>(
        this.path(relativePath),
        `post-intent mutation lock takeover ${relativePath}`,
      );
      if (schemaVersion !== CAMPAIGN_ARTIFACT_SCHEMA_VERSION) {
        throw new CascadeError(
          `historical campaign artifacts cannot contain post-intent recovery records: ${this.runId}`,
        );
      }
      validateMutationLockTakeoverReceipt(
        receipt,
        this.runId,
        reservation as CampaignRunReservation,
      );
      const reconstructedClaim = mutationTakeoverClaimFromReceipt(receipt);
      const expectedQuarantinePath = normalizedRelative(
        this.artifactRoot,
        this.mutationQuarantinePath(receipt.previous_lock.token),
      );
      if (
        match[1] !== receipt.previous_lock.token ||
        receipt.quarantined_path !== expectedQuarantinePath ||
        receipt.claim_digest !== sha256Text(stableJson(reconstructedClaim)) ||
        stableJson(receipt.lease_state) !== stableJson(manifestBoundLease) ||
        compareRequiredRfc3339Instants(
          "campaign mutation lock takeover claim creation",
          receipt.created_at,
          "campaign lease expiry",
          receipt.lease_state.expires_at,
        ) < 0 ||
        compareRequiredRfc3339Instants(
          "campaign terminal lock production",
          terminalLock.produced_at,
          "campaign mutation lock takeover claim creation",
          receipt.created_at,
        ) > 0 ||
        compareRequiredRfc3339Instants(
          "campaign mutation lock quarantine",
          receipt.quarantined_at,
          "campaign mutation lock takeover claim creation",
          receipt.created_at,
        ) < 0 ||
        compareRequiredRfc3339Instants(
          "previous campaign mutation lock acquisition",
          receipt.previous_lock.acquired_at,
          "campaign terminal lock production",
          terminalLock.produced_at,
        ) > 0 ||
        compareRequiredRfc3339Instants(
          "campaign mutation lock quarantine",
          receipt.quarantined_at,
          "campaign finalization completion",
          finalizationCompletedAt,
        ) > 0
      ) {
        throw new CascadeError(
          `campaign post-intent recovery receipt is not bound to the terminal interruption or manifest-bound current lease: ${relativePath}`,
        );
      }
      records.push(await fileRecord(this.runRoot, this.path(relativePath)));
    }
    return sortedArtifactRecords(records);
  }

  async finalize(input: {
    status: CampaignRunFinalization["status"];
    finalized_by: CampaignPrincipal;
    recovery_reason?: string | null;
    recovery_cleanup_status?: "VERIFIED" | "INCOMPLETE" | "UNKNOWN";
    recovery_action?: string;
    recovery_context?: CampaignRecoveryContext;
  }): Promise<CampaignRunFinalization> {
    await this.assertOperationalLifecycleFreshness();
    return this.withMutationLock(async () => {
    const reservation = await this.readReservation();
    const terminalLockPath = this.path("terminal.lock");
    const existingTerminalLock = (await exists(terminalLockPath))
      ? await readBoundedStructuredJson<CampaignTerminalLock>(
          terminalLockPath,
          "campaign terminal lock",
        )
      : null;
    if (
      existingTerminalLock &&
      (existingTerminalLock.schema_version !== CAMPAIGN_ARTIFACT_SCHEMA_VERSION ||
        existingTerminalLock.artifact_type !== "campaign-terminal-intent" ||
        existingTerminalLock.run_id !== this.runId ||
        existingTerminalLock.status !== input.status ||
        parseRfc3339Instant(existingTerminalLock.produced_at) === null ||
        !Array.isArray(existingTerminalLock.application_files) ||
        !/^[a-f0-9]{64}$/.test(existingTerminalLock.application_manifest_digest))
    ) {
      throw new CascadeError(
        "incomplete campaign terminal lock does not match finalization authority",
      );
    }
    if (existingTerminalLock) {
      validateArtifactFileRecords(
        existingTerminalLock.application_files,
        "campaign terminal application files",
      );
      if (
        artifactManifestDigest(existingTerminalLock.application_files) !==
        existingTerminalLock.application_manifest_digest
      ) {
        throw new CascadeError(
          "incomplete campaign terminal lock has an invalid application manifest",
        );
      }
    }
    const operator = reservation.identities.operator;
    const recovery = reservation.identities.recovery;
    const completingAsOperator =
      stableJson(input.finalized_by) === stableJson(operator);
    const completingAsRecovery =
      stableJson(input.finalized_by) === stableJson(recovery);
    const expectedProducer =
      input.status === "UNKNOWN_OUTCOME" ? recovery : operator;
    if (
      existingTerminalLock &&
      stableJson(existingTerminalLock.produced_by) !== stableJson(expectedProducer)
    ) {
      throw new CascadeError(
        "incomplete campaign terminal lock has a mismatched producer",
      );
    }
    if (input.status === "UNKNOWN_OUTCOME") {
      if (!completingAsRecovery) {
        throw new CascadeError(
          "campaign recovery finalizer must match the reserved recovery identity",
        );
      }
      if (
        !this.authority ||
        stableJson(this.authority.principal) !== stableJson(recovery)
      ) {
        throw new CascadeError(
          "UNKNOWN_OUTCOME finalization requires explicit recovery authority",
        );
      }
    } else {
      if (existingTerminalLock) {
        if (
          !this.authority ||
          stableJson(this.authority.principal) !== stableJson(input.finalized_by) ||
          (!completingAsOperator && !completingAsRecovery)
        ) {
          throw new CascadeError(
            "incomplete campaign finalization requires the reserved operator or recovery authority",
          );
        }
        if (completingAsRecovery && !input.recovery_reason?.trim()) {
          throw new CascadeError(
            "recovery completion of an operator terminal lock requires a reason",
          );
        }
      } else {
        if (!completingAsOperator) {
          throw new CascadeError(
            "only the reserved operator may produce a completed or blocked terminal lock",
          );
        }
        await this.assertOperatorLease();
      }
    }
    if (
      input.status === "UNKNOWN_OUTCOME" &&
      (!input.recovery_reason?.trim() ||
        !input.recovery_action?.trim() ||
        !input.recovery_cleanup_status)
    ) {
      throw new CascadeError(
        "UNKNOWN_OUTCOME finalization requires recovery reason, action, and cleanup disposition",
      );
    }

    if (input.status === "UNKNOWN_OUTCOME") {
      const recoveryContext = input.recovery_context ?? {
        interrupted_operations: [],
        checkpoint_digest: null,
      };
      const recoveryPath = this.path("recovery/recovery-receipt.json");
      const existingRecoveryReceipt = (await exists(recoveryPath))
        ? requireRecord(
            await readBoundedStructuredJson<unknown>(
              recoveryPath,
              "existing recovery receipt",
            ),
            "existing recovery receipt",
          )
        : null;
      const recoveryReceipt = {
        schema_version: CAMPAIGN_ARTIFACT_SCHEMA_VERSION,
        artifact_type: "campaign-recovery-receipt",
        run_id: this.runId,
        campaign_id: reservation.campaign_id,
        status: "UNKNOWN_OUTCOME",
        reason: input.recovery_reason,
        recovery_action: input.recovery_action,
        cleanup_status: input.recovery_cleanup_status,
        recovery_context: recoveryContext,
        recovery_identity: input.finalized_by,
        created_at: existingRecoveryReceipt?.created_at ?? utcNow(),
      };
      boundedStructuredJson(recoveryReceipt, "recovery receipt", { pretty: true });
      if (
        existingRecoveryReceipt &&
        stableJson(existingRecoveryReceipt) !== stableJson(recoveryReceipt)
      ) {
        throw new CascadeError(
          "existing UNKNOWN_OUTCOME recovery receipt does not match recovery authority",
        );
      }
      if (!existingRecoveryReceipt) {
        await this.prepareArtifactWrite(recoveryPath);
        await writeJsonExclusive(
          recoveryPath,
          recoveryReceipt,
          ARTIFACT_WRITE_OPTIONS,
        );
      }
      const recoveryReceiptDigest = sha256Text(stableJson(recoveryReceipt));
      const lifecyclePath = this.path("lifecycle.jsonl");
      const lifecycleEvents = (await readBoundedStructuredText(
        lifecyclePath,
        "campaign lifecycle",
      ))
        .split(/\r?\n/)
        .filter(Boolean)
        .map((line, index) => {
          try {
            return requireRecord(
              JSON.parse(line),
              `campaign lifecycle line ${index + 1}`,
            );
          } catch (error) {
            if (error instanceof CascadeError) throw error;
            throw new CascadeError(
              `campaign lifecycle line ${index + 1} is invalid JSON`,
            );
          }
        });
      const unknownOutcomeEvents = lifecycleEvents.filter(
        (event) => event.status === "UNKNOWN_OUTCOME",
      );
      if (
        unknownOutcomeEvents.length > 0 &&
        (unknownOutcomeEvents.length !== 1 ||
          unknownOutcomeEvents[0]!.recovery_receipt_digest !==
            recoveryReceiptDigest ||
          unknownOutcomeEvents[0]!.cleanup_status !==
            input.recovery_cleanup_status)
      ) {
        throw new CascadeError(
          "existing UNKNOWN_OUTCOME lifecycle evidence conflicts with recovery receipt",
        );
      }
      if (unknownOutcomeEvents.length === 0) {
        await this.appendBoundedStructuredLine(
          lifecyclePath,
          {
            status: "UNKNOWN_OUTCOME",
            at: utcNow(),
            recovery_receipt_digest: recoveryReceiptDigest,
            cleanup_status: input.recovery_cleanup_status,
          },
          "campaign lifecycle",
        );
      }
    }

    const beforeLock = await artifactFiles(this.runRoot);
    const relativeBeforeLock = beforeLock.map((path) =>
      normalizedRelative(this.runRoot, path),
    );
    const required = ["reservation.json", "lifecycle.jsonl"];
    if (input.status === "COMPLETED") {
      required.push(
        "lifecycle.jsonl",
        "execution/source-manifest.json",
        "execution/execution-receipt.json",
        "summary.json",
      );
      if (
        !relativeBeforeLock.some(
          (path) => path.startsWith("evaluations/") && path.endsWith("/receipt.json"),
        ) ||
        !relativeBeforeLock.some(
          (path) => path.startsWith("aggregations/") && path.endsWith(".json"),
        )
      ) {
        throw new CascadeError(
          "COMPLETED finalization requires evaluation and aggregation receipts",
        );
      }
    } else if (input.status === "BLOCKED") {
      required.push(
        "lifecycle.jsonl",
        "execution/source-manifest.json",
        "execution/execution-receipt.json",
        "summary.json",
      );
    } else {
      required.push("recovery/recovery-receipt.json");
    }
    const missing = required.filter((path) => !relativeBeforeLock.includes(path));
    if (missing.length) {
      throw new CascadeError(
        `${input.status} finalization is missing required artifacts: ${missing.join(", ")}`,
      );
    }
    await this.assertOperationalLifecycleFreshness();
    await this.validateTerminalEvidence(
      input.status,
      reservation,
      relativeBeforeLock,
    );
    const currentRecords = await Promise.all(
      beforeLock
        .filter((path) =>
          !["finalization.json", "terminal.lock"].includes(
            normalizedRelative(this.runRoot, path),
          ),
        )
        .map((path) => fileRecord(this.runRoot, path)),
    );
    currentRecords.sort((left, right) => left.path.localeCompare(right.path));
    const applicationRecords = existingTerminalLock
      ? sortedArtifactRecords(existingTerminalLock.application_files)
      : currentRecords;
    const applicationPaths = new Set(
      applicationRecords.map((record) => record.path),
    );
    const currentByPath = new Map(
      currentRecords.map((record) => [record.path, record] as const),
    );
    for (const applicationRecord of applicationRecords) {
      const current = currentByPath.get(applicationRecord.path);
      if (!current || stableJson(current) !== stableJson(applicationRecord)) {
        throw new CascadeError(
          "incomplete campaign terminal lock does not match the frozen application artifact manifest",
        );
      }
    }
    const postIntentPaths = existingTerminalLock
      ? currentRecords
          .map((record) => record.path)
          .filter((path) => !applicationPaths.has(path))
      : [];
    const applicationManifestDigest = artifactManifestDigest(applicationRecords);
    const terminalLock: CampaignTerminalLock = existingTerminalLock ?? {
      schema_version: CAMPAIGN_ARTIFACT_SCHEMA_VERSION,
      artifact_type: "campaign-terminal-intent",
      run_id: this.runId,
      status: input.status,
      produced_at: utcNow(),
      produced_by: input.finalized_by,
      application_files: applicationRecords,
      application_manifest_digest: applicationManifestDigest,
    };
    const completedAt = utcNow();
    const postIntentRecoveryRecords = existingTerminalLock
      ? await this.postIntentRecoveryRecords(
          postIntentPaths,
          existingTerminalLock,
          reservation,
          completedAt,
        )
      : [];
    const terminalLockText = existingTerminalLock
      ? null
      : `${boundedStructuredJson(terminalLock, "campaign terminal lock", {
          pretty: true,
        })}\n`;
    let terminalLockRecord: CampaignArtifactFile;
    if (terminalLockText) {
      const terminalBytes = Buffer.from(terminalLockText, "utf8");
      terminalLockRecord = {
        path: "terminal.lock",
        sha256: sha256Bytes(terminalBytes),
        size: terminalBytes.byteLength,
      };
    } else {
      terminalLockRecord = await fileRecord(this.runRoot, terminalLockPath);
    }
    const records = sortedArtifactRecords([
      ...applicationRecords,
      ...postIntentRecoveryRecords,
      terminalLockRecord,
    ]);
    const manifestDigest = artifactManifestDigest(records);
    const finalization: CampaignRunFinalization = {
      schema_version: CAMPAIGN_ARTIFACT_SCHEMA_VERSION,
      artifact_type: "campaign-run-finalization",
      run_id: this.runId,
      status: input.status,
      finalized_at: completedAt,
      finalized_by: input.finalized_by,
      completed_at: completedAt,
      completed_by: input.finalized_by,
      terminal_lock_producer: terminalLock.produced_by,
      terminal_lock_digest: terminalLockRecord.sha256,
      recovery_reason: input.recovery_reason ?? null,
      application_files: applicationRecords,
      application_manifest_digest: applicationManifestDigest,
      post_intent_recovery_files: postIntentRecoveryRecords,
      post_intent_recovery_manifest_digest: artifactManifestDigest(
        postIntentRecoveryRecords,
      ),
      files: records,
      manifest_digest: manifestDigest,
    };
    boundedStructuredJson(finalization, "campaign finalization", { pretty: true });
    if (terminalLockText) {
      await this.prepareArtifactWrite(terminalLockPath);
      await writeJsonAtomicExclusive(
        terminalLockPath,
        terminalLock,
        ARTIFACT_WRITE_OPTIONS,
      );
    }
    await this.prepareArtifactWrite(this.path("finalization.json"));
    await writeJsonAtomicExclusive(
      this.path("finalization.json"),
      finalization,
      ARTIFACT_WRITE_OPTIONS,
    );
    return finalization;
    }, {
      allow_incomplete_finalization: true,
      stale_lock_recovery_reason:
        input.status === "UNKNOWN_OUTCOME"
          ? input.recovery_reason
          : input.finalized_by.role === "simulation-recovery"
            ? input.recovery_reason ??
              "complete interrupted campaign terminal finalization"
            : undefined,
    });
  }

  private async authenticateLifecycleClockEvent(
    event: Record<string, unknown>,
    reservation: CampaignRunReservation,
    label: string,
    now: string,
    options: {
      relative_files?: readonly string[];
      seen_paths?: Set<string>;
    } = {},
  ): Promise<string> {
    const authority = requireExactOwnDataObject(
      event.clock_authority,
      `${label} clock authority`,
      [
        "lease_expires_at",
        "lease_generation",
        "lease_id",
        "lease_renewed_at",
        "observed_at",
        "receipt_digest",
        "receipt_path",
        "reservation_digest",
        "schema_version",
        "source",
      ],
    );
    const at = String(event.at);
    const receiptPath = String(authority.receipt_path);
    const receiptDigest = String(authority.receipt_digest);
    if (
      !/^execution\/lifecycle-clock\/\d{8}-[a-f0-9]{64}\.json$/.test(receiptPath) ||
      !/^[a-f0-9]{64}$/.test(receiptDigest) ||
      !receiptPath.endsWith(`-${receiptDigest}.json`) ||
      options.seen_paths?.has(receiptPath) ||
      (options.relative_files && !options.relative_files.includes(receiptPath))
    ) {
      throw new CascadeError(`${label} clock receipt authority is stale or invalid`);
    }
    options.seen_paths?.add(receiptPath);
    const receipt = requireExactOwnDataObject(
      await readBoundedStructuredJson<unknown>(
        this.path(receiptPath),
        `${label} clock receipt`,
      ),
      `${label} clock receipt`,
      [
        "lease_expires_at",
        "lease_generation",
        "lease_id",
        "lease_renewed_at",
        "observed_at",
        "reservation_digest",
        "schema_version",
        "source",
      ],
    );
    const receiptMetadata = await lstat(this.path(receiptPath));
    const receiptAuthority = { ...authority };
    delete receiptAuthority.receipt_path;
    delete receiptAuthority.receipt_digest;
    const atMillis = Date.parse(at);
    const renewedMillis = Date.parse(String(authority.lease_renewed_at));
    const expiresMillis = Date.parse(String(authority.lease_expires_at));
    const generation = Number(authority.lease_generation);
    const initialLeaseProven =
      generation === 0 &&
      authority.lease_id === reservation.lease.lease_id &&
      authority.lease_renewed_at === reservation.lease.acquired_at &&
      authority.lease_expires_at === reservation.lease.expires_at;
    const lifecycle = (await readBoundedStructuredText(
      this.path("lifecycle.jsonl"),
      `${label} lease history`,
    )).split(/\r?\n/).filter(Boolean).map((line, index) => {
      try {
        return requireRecord(JSON.parse(line), `${label} lease history ${index + 1}`);
      } catch (error) {
        if (error instanceof CascadeError) throw error;
        throw new CascadeError(`${label} lease history is invalid JSON`);
      }
    });
    const renewalProven = lifecycle.some((candidate) =>
      candidate.status === "HEARTBEAT" &&
      candidate.lease_id === authority.lease_id &&
      candidate.lease_generation === generation &&
      candidate.at === authority.lease_renewed_at &&
      candidate.expires_at === authority.lease_expires_at
    );
    const takeoverPath = this.path(
      `recovery/lease-takeovers/${String(generation).padStart(8, "0")}.json`,
    );
    const takeover = generation > 0 && await exists(takeoverPath)
      ? await readBoundedStructuredJson<Record<string, unknown>>(
          takeoverPath,
          `${label} lease takeover authority`,
        )
      : null;
    const replacement = takeover
      ? requireRecord(takeover.replacement_lease, `${label} replacement lease`)
      : null;
    const takeoverProven = replacement !== null &&
      replacement.lease_id === authority.lease_id &&
      replacement.generation === generation &&
      replacement.renewed_at === authority.lease_renewed_at &&
      replacement.expires_at === authority.lease_expires_at;
    if (
      authority.schema_version !== 1 ||
      authority.source !== "campaign-artifact-store-clock" ||
      authority.observed_at !== at ||
      authority.reservation_digest !== sha256Text(stableJson(reservation)) ||
      typeof authority.lease_id !== "string" ||
      !authority.lease_id ||
      !Number.isSafeInteger(authority.lease_generation) ||
      generation < 0 ||
      (!initialLeaseProven && !renewalProven && !takeoverProven) ||
      !Number.isFinite(atMillis) ||
      !Number.isFinite(renewedMillis) ||
      !Number.isFinite(expiresMillis) ||
      renewedMillis > atMillis ||
      atMillis >= expiresMillis ||
      expiresMillis - renewedMillis > MAX_TRUSTED_LIFECYCLE_AGE_MS ||
      compareRfc3339Instants(reservation.reserved_at, at) > 0 ||
      atMillis > Date.parse(now) ||
      stableJson(receipt) !== stableJson(receiptAuthority) ||
      sha256Text(stableJson(receipt)) !== receiptDigest ||
      !receiptMetadata.isFile() ||
      receiptMetadata.isSymbolicLink() ||
      Math.abs(receiptMetadata.ctimeMs - atMillis) > 5_000
    ) {
      throw new CascadeError(`${label} clock authority is stale or invalid`);
    }
    return at;
  }

  private async lifecycleFreshness(): Promise<{
    status: "FRESH" | "STALE";
    reason: string | null;
  }> {
    if (!(await exists(this.path("lifecycle.jsonl")))) {
      return { status: "FRESH", reason: null };
    }
    const allLifecycle = (await readBoundedStructuredText(
      this.path("lifecycle.jsonl"),
      "campaign lifecycle freshness",
    ))
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line, index) => {
        try {
          return requireRecord(
            JSON.parse(line),
            `campaign lifecycle freshness line ${index + 1}`,
          );
        } catch (error) {
          if (error instanceof CascadeError) throw error;
          throw new CascadeError(
            `campaign lifecycle freshness line ${index + 1} is invalid JSON`,
          );
        }
      });
    const lifecycle = allLifecycle.filter((event) =>
      ["EVALUATING", "BLOCKED", "COMPLETED"].includes(String(event.status))
    );
    const unauthenticated = lifecycle.find(
      (event) => event.clock_authority === undefined,
    );
    if (unauthenticated) {
      throw new CascadeError(
        `${String(unauthenticated.status)} campaign lifecycle lacks required clock authority`,
      );
    }
    if (!lifecycle.length) return { status: "FRESH", reason: null };
    const reservation = await this.readReservation();
    await this.validateLeaseTakeoverHistory(reservation);
    const nowMillis = Date.parse(this.clockInstant("campaign lifecycle freshness"));
    const now = new Date(nowMillis).toISOString();
    const seenPaths = new Set<string>();
    for (const event of lifecycle) {
      const at = await this.authenticateLifecycleClockEvent(
        event,
        reservation,
        `authenticated ${String(event.status)} lifecycle`,
        now,
        { seen_paths: seenPaths },
      );
      const atMillis = Date.parse(at);
      if (!Number.isFinite(atMillis) || atMillis > nowMillis) {
        return {
          status: "STALE",
          reason: `authenticated ${String(event.status)} lifecycle instant is invalid or future-dated`,
        };
      }
      if (nowMillis - atMillis > MAX_TRUSTED_LIFECYCLE_AGE_MS) {
        return {
          status: "STALE",
          reason: `authenticated ${String(event.status)} lifecycle instant exceeds the 24-hour operational freshness window`,
        };
      }
    }
    return { status: "FRESH", reason: null };
  }

  async assertOperationalLifecycleFreshness(): Promise<void> {
    const freshness = await this.lifecycleFreshness();
    if (freshness.status === "STALE") {
      throw new CascadeError(
        `campaign operational lifecycle is stale: ${freshness.reason}`,
      );
    }
  }

  private async verifyRecordedManifest(
    files: CampaignArtifactFile[],
    expectedManifestDigest: string,
  ): Promise<string> {
    validateArtifactFileRecords(files, "campaign finalization files");
    const expectedPaths = files.map((file) => file.path).sort();
    const currentFiles = (await artifactFiles(this.runRoot))
      .map((path) => normalizedRelative(this.runRoot, path))
      .filter((path) => path !== "finalization.json")
      .sort();
    if (stableJson(currentFiles) !== stableJson(expectedPaths)) {
      throw new CascadeError(
        `campaign artifact file set does not match finalization: ${this.runId}`,
      );
    }
    for (const record of files) {
      const actual = await fileRecord(this.runRoot, this.path(record.path));
      if (stableJson(actual) !== stableJson(record)) {
        throw new CascadeError(
          `campaign artifact digest mismatch: ${this.runId}/${record.path}`,
        );
      }
    }
    const manifestDigest = sha256Text(stableJson(files));
    if (manifestDigest !== expectedManifestDigest) {
      throw new CascadeError(
        `campaign finalization manifest digest mismatch: ${this.runId}`,
      );
    }
    return manifestDigest;
  }

  private async assertVerificationPacketHasNoConfiguredSecrets(
    files: readonly CampaignArtifactFile[],
  ): Promise<void> {
    const confirmationSecrets = Object.values(this.confirmationSecrets);
    if (!confirmationSecrets.length) return;
    for (const path of [
      ...files.map((record) => record.path),
      "finalization.json",
    ]) {
      const snapshot = await readBoundedFileSnapshot(
        this.path(path),
        `campaign verification secret scan ${path}`,
        DEFAULT_EVIDENCE_LIMIT_BYTES,
        this.runRoot,
      );
      assertNoExactConfirmationSecretBytes(
        snapshot.bytes,
        confirmationSecrets,
        `campaign verification packet ${path}`,
      );
    }
  }

  private async verifyLegacyFinalization(
    finalization: LegacyCampaignRunFinalization,
  ): Promise<CampaignArtifactVerification> {
    validateLegacyFinalizationContract(finalization, this.runId);
    const reservation = await this.readReservationForSchemaVersion(
      LEGACY_CAMPAIGN_ARTIFACT_SCHEMA_VERSION,
    );
    const lease = await readBoundedStructuredJson<unknown>(
      this.path("lease.json"),
      "legacy campaign lease state",
    );
    validateLeaseStateContract(
      lease,
      this.runId,
      LEGACY_CAMPAIGN_ARTIFACT_SCHEMA_VERSION,
    );
    validateLeaseStateBinding(lease, reservation);
    const terminalLock = await readBoundedStructuredJson<LegacyCampaignTerminalLock>(
      this.path("terminal.lock"),
      "legacy campaign terminal lock",
    );
    validateLegacyTerminalLockContract(terminalLock, this.runId);
    const expectedPrincipal =
      finalization.status === "UNKNOWN_OUTCOME"
        ? reservation.identities.recovery
        : reservation.identities.operator;
    if (
      terminalLock.status !== finalization.status ||
      stableJson(terminalLock.locked_by) !== stableJson(expectedPrincipal) ||
      stableJson(finalization.finalized_by) !== stableJson(expectedPrincipal)
    ) {
      throw new CascadeError(
        `legacy campaign terminal authority is invalid: ${this.runId}`,
      );
    }
    const manifestDigest = await this.verifyRecordedManifest(
      finalization.files,
      finalization.manifest_digest,
    );
    await this.assertVerificationPacketHasNoConfiguredSecrets(finalization.files);
    return {
      status: "VALID",
      freshness_status: "NOT_APPLICABLE",
      freshness_reason: null,
      run_id: this.runId,
      finalization_status: finalization.status,
      file_count: finalization.files.length,
      manifest_digest: manifestDigest,
    };
  }

  private async verifyCurrentFinalization(
    finalization: CurrentShapeCampaignRunFinalization,
    schemaVersion: typeof CAMPAIGN_ARTIFACT_SCHEMA_VERSION | typeof PREVIOUS_CAMPAIGN_ARTIFACT_SCHEMA_VERSION,
  ): Promise<CampaignArtifactVerification> {
    validateCurrentFinalizationContract(finalization, this.runId, schemaVersion);
    if (
      finalization.completed_at !== finalization.finalized_at ||
      stableJson(finalization.completed_by) !==
        stableJson(finalization.finalized_by) ||
      artifactManifestDigest(finalization.application_files) !==
        finalization.application_manifest_digest ||
      artifactManifestDigest(finalization.post_intent_recovery_files) !==
        finalization.post_intent_recovery_manifest_digest
    ) {
      throw new CascadeError(
        `invalid campaign finalization contract for ${this.runId}`,
      );
    }
    const reservation = await this.readCurrentReservationForVerification(schemaVersion);
    await this.validateLeaseTakeoverHistory(reservation, schemaVersion);
    const terminalLock = await readBoundedStructuredJson<unknown>(
      this.path("terminal.lock"),
      "campaign terminal lock",
    );
    validateCurrentTerminalLockContract(terminalLock, this.runId, schemaVersion);
    const expectedProducer =
      finalization.status === "UNKNOWN_OUTCOME"
        ? reservation.identities.recovery
        : reservation.identities.operator;
    const completedByOperator =
      stableJson(finalization.completed_by) ===
      stableJson(reservation.identities.operator);
    const completedByRecovery =
      stableJson(finalization.completed_by) ===
      stableJson(reservation.identities.recovery);
    if (
      terminalLock.schema_version !== schemaVersion ||
      terminalLock.artifact_type !== "campaign-terminal-intent" ||
      terminalLock.run_id !== this.runId ||
      terminalLock.status !== finalization.status ||
      stableJson(terminalLock.produced_by) !== stableJson(expectedProducer) ||
      stableJson(finalization.terminal_lock_producer) !==
        stableJson(terminalLock.produced_by) ||
      stableJson(terminalLock.application_files) !==
        stableJson(finalization.application_files) ||
      terminalLock.application_manifest_digest !==
        finalization.application_manifest_digest ||
      (finalization.status === "UNKNOWN_OUTCOME" && !completedByRecovery) ||
      (finalization.status !== "UNKNOWN_OUTCOME" &&
        !completedByOperator &&
        !completedByRecovery) ||
      (finalization.status !== "UNKNOWN_OUTCOME" &&
        completedByRecovery &&
        !finalization.recovery_reason?.trim())
    ) {
      throw new CascadeError(
        `campaign terminal producer or completion authority is invalid: ${this.runId}`,
      );
    }
    if (schemaVersion === CAMPAIGN_ARTIFACT_SCHEMA_VERSION) {
      await this.validateTerminalEvidence(
        finalization.status,
        reservation as CampaignRunReservation,
        finalization.application_files.map((record) => record.path),
        true,
      );
    }

    const postIntentRecoveryRecords = await this.postIntentRecoveryRecords(
      finalization.post_intent_recovery_files.map((record) => record.path),
      terminalLock,
      reservation,
      finalization.completed_at,
      schemaVersion,
    );
    const terminalRecord = finalization.files.find(
      (record) => record.path === "terminal.lock",
    );
    const expectedFiles = terminalRecord
      ? sortedArtifactRecords([
          ...finalization.application_files,
          ...postIntentRecoveryRecords,
          terminalRecord,
        ])
      : [];
    if (
      !terminalRecord ||
      terminalRecord.sha256 !== finalization.terminal_lock_digest ||
      stableJson(postIntentRecoveryRecords) !==
        stableJson(finalization.post_intent_recovery_files) ||
      stableJson(expectedFiles) !== stableJson(finalization.files)
    ) {
      throw new CascadeError(
        `campaign terminal intent digest binding is invalid: ${this.runId}`,
      );
    }
    const manifestDigest = await this.verifyRecordedManifest(
      finalization.files,
      finalization.manifest_digest,
    );
    await this.assertVerificationPacketHasNoConfiguredSecrets(finalization.files);
    const freshness = schemaVersion === CAMPAIGN_ARTIFACT_SCHEMA_VERSION
      ? await this.lifecycleFreshness()
      : { status: "NOT_APPLICABLE" as const, reason: null };
    return {
      status: "VALID",
      freshness_status: freshness.status,
      freshness_reason: freshness.reason,
      run_id: this.runId,
      finalization_status: finalization.status,
      file_count: finalization.files.length,
      manifest_digest: manifestDigest,
    };
  }

  async verify(): Promise<CampaignArtifactVerification> {
    const finalization = await readBoundedStructuredJson<
      | CurrentShapeCampaignRunFinalization
      | LegacyCampaignRunFinalization
    >(this.path("finalization.json"), "campaign finalization");
    if (finalization.schema_version === LEGACY_CAMPAIGN_ARTIFACT_SCHEMA_VERSION) {
      return this.verifyLegacyFinalization(finalization);
    }
    if (finalization.schema_version === CAMPAIGN_ARTIFACT_SCHEMA_VERSION) {
      return this.verifyCurrentFinalization(finalization, CAMPAIGN_ARTIFACT_SCHEMA_VERSION);
    }
    if (finalization.schema_version === PREVIOUS_CAMPAIGN_ARTIFACT_SCHEMA_VERSION) {
      return this.verifyCurrentFinalization(
        finalization,
        PREVIOUS_CAMPAIGN_ARTIFACT_SCHEMA_VERSION,
      );
    }
    const unsupported = finalization as { schema_version?: unknown };
    throw new CascadeError(
      `unsupported campaign artifact schema version: ${String(unsupported.schema_version)}`,
    );
  }
}
