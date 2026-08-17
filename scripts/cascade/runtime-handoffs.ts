import {
  CascadeError,
  parseRfc3339Instant,
  sha256Text,
  stableJson,
} from "./common";
import type { CampaignPrincipal } from "./campaign-artifacts";

export const RUNTIME_HANDOFF_SCHEMA_VERSION = 1 as const;

export type RuntimeHandoffDisposition =
  | "PENDING"
  | "ACCEPTED"
  | "REJECTED"
  | "STALE"
  | "NOT_APPLICABLE";

export type RuntimeHandoffChangedBoundInput =
  | "artifact_references"
  | "cleanup_receipt_digest"
  | "evidence_manifest_digest"
  | "proposed_next_gate"
  | "proposed_next_owner"
  | "receiver_principal"
  | "recovery_receipt_digest"
  | "retry_lineage"
  | "source_manifest_digest"
  | "terminal_status"
  | "task_result_digest";

export interface RuntimeHandoffRetryLineage {
  attempt: number;
  parent_run_id: string | null;
  parent_handoff_receipt_digest: string | null;
}

export interface RuntimeHandoffArtifactReference {
  path: string;
  sha256: string;
}

export interface RuntimeHandoffReceipt {
  schema_version: typeof RUNTIME_HANDOFF_SCHEMA_VERSION;
  artifact_type: "runtime-handoff-receipt";
  receipt_id: string;
  run_id: string;
  campaign_id: string;
  task_id: string;
  terminal_status: string;
  task_result_digest: string;
  source_manifest_digest: string;
  evidence_manifest_digest: string;
  recovery_receipt_digest: string | null;
  cleanup_receipt_digest: string;
  retry_lineage: RuntimeHandoffRetryLineage;
  required_inputs: string[];
  artifact_references: RuntimeHandoffArtifactReference[];
  proposed_next_owner: string | null;
  proposed_next_gate: string | null;
  producer_principal: CampaignPrincipal;
  receiver_principal: CampaignPrincipal | null;
  disposition: RuntimeHandoffDisposition;
  offer_receipt_digest: string | null;
  receiving_receipt_digest: string | null;
  reason: string;
  superseded_receipt_digest: string | null;
  changed_bound_inputs: RuntimeHandoffChangedBoundInput[];
  created_at: string;
}

export interface RuntimeHandoffValidationContext {
  authority: CampaignPrincipal;
  superseded_receipt?: RuntimeHandoffReceipt;
}

const RECEIPT_KEYS = [
  "schema_version",
  "artifact_type",
  "receipt_id",
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
  "required_inputs",
  "artifact_references",
  "proposed_next_owner",
  "proposed_next_gate",
  "producer_principal",
  "receiver_principal",
  "disposition",
  "offer_receipt_digest",
  "receiving_receipt_digest",
  "reason",
  "superseded_receipt_digest",
  "changed_bound_inputs",
  "created_at",
] as const;

const RETRY_LINEAGE_KEYS = [
  "attempt",
  "parent_run_id",
  "parent_handoff_receipt_digest",
] as const;

const PRINCIPAL_KEYS = ["role", "session_id", "subject"] as const;
const ARTIFACT_REFERENCE_KEYS = ["path", "sha256"] as const;
const PRINCIPAL_ROLES = new Set([
  "simulation-operator",
  "simulation-evaluator",
  "campaign-aggregator",
  "target-actor",
  "simulator",
  "simulation-recovery",
  "harness-evaluator",
]);
const DISPOSITIONS = new Set<RuntimeHandoffDisposition>([
  "PENDING",
  "ACCEPTED",
  "REJECTED",
  "STALE",
  "NOT_APPLICABLE",
]);
const CHANGED_BOUND_INPUTS = [
  "artifact_references",
  "cleanup_receipt_digest",
  "evidence_manifest_digest",
  "proposed_next_gate",
  "proposed_next_owner",
  "receiver_principal",
  "recovery_receipt_digest",
  "retry_lineage",
  "source_manifest_digest",
  "terminal_status",
  "task_result_digest",
] as const satisfies readonly RuntimeHandoffChangedBoundInput[];
const CHANGED_BOUND_INPUT_SET = new Set<string>(CHANGED_BOUND_INPUTS);
const DIGEST = /^[a-f0-9]{64}$/;
const IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/;
const RELATIVE_ARTIFACT_PATH = /^[A-Za-z0-9][A-Za-z0-9._:/#-]{0,1023}$/;

function exactPlainObject(
  value: unknown,
  label: string,
  expectedKeys: readonly string[],
  optionalKeys: readonly string[] = [],
): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new CascadeError(`${label} must be a plain object`);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new CascadeError(`${label} must be a plain object`);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const ownKeys = Reflect.ownKeys(descriptors);
  if (
    ownKeys.some((key) => typeof key !== "string") ||
    expectedKeys.some((key) => !Object.prototype.hasOwnProperty.call(descriptors, key)) ||
    ownKeys.some(
      (key) =>
        typeof key === "string" &&
        !expectedKeys.includes(key) &&
        !optionalKeys.includes(key),
    )
  ) {
    throw new CascadeError(`${label} has missing or unknown fields`);
  }
  const snapshot: Record<string, unknown> = {};
  for (const key of ownKeys as string[]) {
    const descriptor = descriptors[key];
    if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) {
      throw new CascadeError(`${label} fields must be enumerable data properties`);
    }
    snapshot[key] = descriptor.value;
  }
  return snapshot;
}

function requiredIdentifier(value: unknown, label: string): string {
  if (typeof value !== "string" || !IDENTIFIER.test(value)) {
    throw new CascadeError(`${label} is invalid`);
  }
  return value;
}

function requiredText(value: unknown, label: string): string {
  if (
    typeof value !== "string" ||
    !value.trim() ||
    value.length > 4_096 ||
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)
  ) {
    throw new CascadeError(`${label} is invalid`);
  }
  return value;
}

function nullableRoute(value: unknown, label: string): string | null {
  if (value === null) return null;
  return requiredIdentifier(value, label);
}

function requiredDigest(value: unknown, label: string): string {
  if (typeof value !== "string" || !DIGEST.test(value)) {
    throw new CascadeError(`${label} must be a lowercase SHA-256 digest`);
  }
  return value;
}

function nullableDigest(value: unknown, label: string): string | null {
  if (value === null) return null;
  return requiredDigest(value, label);
}

function artifactPath(value: unknown, label: string): string {
  if (
    typeof value !== "string" ||
    !RELATIVE_ARTIFACT_PATH.test(value) ||
    value.startsWith("/") ||
    value.split("/").includes("..")
  ) {
    throw new CascadeError(`${label} is invalid`);
  }
  return value;
}

function principal(value: unknown, label: string): CampaignPrincipal {
  const record = exactPlainObject(value, label, PRINCIPAL_KEYS);
  if (!PRINCIPAL_ROLES.has(String(record.role))) {
    throw new CascadeError(`${label} role is invalid`);
  }
  return {
    role: record.role as CampaignPrincipal["role"],
    session_id: requiredIdentifier(record.session_id, `${label}.session_id`),
    subject: requiredIdentifier(record.subject, `${label}.subject`),
  };
}

function retryLineage(
  value: unknown,
  runId: string,
): RuntimeHandoffRetryLineage {
  const record = exactPlainObject(
    value,
    "runtime handoff retry_lineage",
    RETRY_LINEAGE_KEYS,
  );
  if (!Number.isSafeInteger(record.attempt) || Number(record.attempt) < 1) {
    throw new CascadeError("runtime handoff retry attempt must be a positive safe integer");
  }
  const attempt = Number(record.attempt);
  const parentRunId = record.parent_run_id === null
    ? null
    : requiredIdentifier(
      record.parent_run_id,
      "runtime handoff retry parent_run_id",
    );
  const parentDigest = nullableDigest(
    record.parent_handoff_receipt_digest,
    "runtime handoff retry parent_handoff_receipt_digest",
  );
  if (
    (attempt === 1 && (parentRunId !== null || parentDigest !== null)) ||
    (attempt > 1 && (parentRunId === null || parentDigest === null))
  ) {
    throw new CascadeError(
      "runtime handoff retry parent run and handoff digest must both be absent for attempt 1 and present for retries",
    );
  }
  if (parentRunId === runId) {
    throw new CascadeError("runtime handoff retry cannot name its own run as parent");
  }
  return {
    attempt,
    parent_run_id: parentRunId,
    parent_handoff_receipt_digest: parentDigest,
  };
}

function samePrincipal(left: CampaignPrincipal, right: CampaignPrincipal): boolean {
  return stableJson(left) === stableJson(right);
}

function principalsOverlap(left: CampaignPrincipal, right: CampaignPrincipal): boolean {
  return left.session_id === right.session_id || left.subject === right.subject;
}

function changedBoundInputs(
  current: RuntimeHandoffReceipt,
  previous: RuntimeHandoffReceipt,
): RuntimeHandoffChangedBoundInput[] {
  const changed: RuntimeHandoffChangedBoundInput[] = [];
  for (const key of CHANGED_BOUND_INPUTS) {
    if (stableJson(current[key]) !== stableJson(previous[key])) changed.push(key);
  }
  return changed;
}

function receiptShape(value: unknown): RuntimeHandoffReceipt {
  const record = exactPlainObject(value, "runtime handoff receipt", RECEIPT_KEYS);
  if (
    record.schema_version !== RUNTIME_HANDOFF_SCHEMA_VERSION ||
    record.artifact_type !== "runtime-handoff-receipt"
  ) {
    throw new CascadeError("runtime handoff receipt version or artifact type is invalid");
  }
  const runId = requiredIdentifier(record.run_id, "runtime handoff run_id");
  const taskId = requiredIdentifier(record.task_id, "runtime handoff task_id");
  const disposition = record.disposition as RuntimeHandoffDisposition;
  if (!DISPOSITIONS.has(disposition)) {
    throw new CascadeError("runtime handoff disposition is invalid");
  }
  const receiptId = requiredIdentifier(
    record.receipt_id,
    "runtime handoff receipt_id",
  );
  const canonicalReceiptId = `${runId}-${taskId}-handoff`;
  if (
    (disposition === "PENDING" && receiptId !== `${canonicalReceiptId}-offer`) ||
    (!new Set(["PENDING", "STALE"]).has(disposition) && receiptId !== canonicalReceiptId) ||
    (disposition === "STALE" && !receiptId.startsWith(`${canonicalReceiptId}-stale`))
  ) {
    throw new CascadeError(
      "runtime handoff receipt_id must bind the exact run, task, and lifecycle",
    );
  }
  if (!Array.isArray(record.changed_bound_inputs)) {
    throw new CascadeError("runtime handoff changed_bound_inputs must be an array");
  }
  const changed = record.changed_bound_inputs.map((item) => {
    if (typeof item !== "string" || !CHANGED_BOUND_INPUT_SET.has(item)) {
      throw new CascadeError("runtime handoff changed_bound_inputs contains an invalid field");
    }
    return item as RuntimeHandoffChangedBoundInput;
  });
  if (
    new Set(changed).size !== changed.length ||
    stableJson(changed) !== stableJson([...changed].sort())
  ) {
    throw new CascadeError(
      "runtime handoff changed_bound_inputs must be unique and canonically sorted",
    );
  }
  const producer = principal(
    record.producer_principal,
    "runtime handoff producer_principal",
  );
  if (producer.role !== "simulation-operator") {
    throw new CascadeError("runtime handoff producer must be a simulation-operator");
  }
  const receiver = record.receiver_principal === null
    ? null
    : principal(record.receiver_principal, "runtime handoff receiver_principal");
  if (receiver && (
    receiver.role === "simulation-operator" || principalsOverlap(producer, receiver)
  )) {
    throw new CascadeError(
      "runtime handoff receiver must be a distinct non-operator authority",
    );
  }
  const nextOwner = nullableRoute(
    record.proposed_next_owner,
    "runtime handoff proposed_next_owner",
  );
  const nextGate = nullableRoute(
    record.proposed_next_gate,
    "runtime handoff proposed_next_gate",
  );
  if ((nextOwner === null) !== (nextGate === null)) {
    throw new CascadeError(
      "runtime handoff proposed next owner and gate must both be present or absent",
    );
  }
  const createdAt = record.created_at;
  if (typeof createdAt !== "string" || parseRfc3339Instant(createdAt) === null) {
    throw new CascadeError("runtime handoff created_at must be an RFC 3339 instant");
  }
  if (!Array.isArray(record.required_inputs) || !Array.isArray(record.artifact_references)) {
    throw new CascadeError("runtime handoff required inputs and artifact references must be arrays");
  }
  const requiredInputs = record.required_inputs.map((value, index) =>
    artifactPath(value, `runtime handoff required input ${index}`)
  );
  const artifactReferences = record.artifact_references.map((value, index) => {
    const reference = exactPlainObject(
      value,
      `runtime handoff artifact reference ${index}`,
      ARTIFACT_REFERENCE_KEYS,
    );
    return {
      path: artifactPath(reference.path, `runtime handoff artifact reference ${index}.path`),
      sha256: requiredDigest(
        reference.sha256,
        `runtime handoff artifact reference ${index}.sha256`,
      ),
    };
  });
  const referencePaths = artifactReferences.map((reference) => reference.path);
  if (
    new Set(requiredInputs).size !== requiredInputs.length ||
    new Set(referencePaths).size !== referencePaths.length ||
    stableJson(requiredInputs) !== stableJson([...requiredInputs].sort()) ||
    stableJson(referencePaths) !== stableJson([...referencePaths].sort()) ||
    stableJson(requiredInputs) !== stableJson(referencePaths)
  ) {
    throw new CascadeError(
      "runtime handoff required inputs and artifact references must be exact, unique, and sorted",
    );
  }
  return {
    schema_version: RUNTIME_HANDOFF_SCHEMA_VERSION,
    artifact_type: "runtime-handoff-receipt",
    receipt_id: receiptId,
    run_id: runId,
    campaign_id: requiredIdentifier(record.campaign_id, "runtime handoff campaign_id"),
    task_id: taskId,
    terminal_status: requiredIdentifier(
      record.terminal_status,
      "runtime handoff terminal_status",
    ),
    task_result_digest: requiredDigest(
      record.task_result_digest,
      "runtime handoff task_result_digest",
    ),
    source_manifest_digest: requiredDigest(
      record.source_manifest_digest,
      "runtime handoff source_manifest_digest",
    ),
    evidence_manifest_digest: requiredDigest(
      record.evidence_manifest_digest,
      "runtime handoff evidence_manifest_digest",
    ),
    recovery_receipt_digest: nullableDigest(
      record.recovery_receipt_digest,
      "runtime handoff recovery_receipt_digest",
    ),
    cleanup_receipt_digest: requiredDigest(
      record.cleanup_receipt_digest,
      "runtime handoff cleanup_receipt_digest",
    ),
    retry_lineage: retryLineage(record.retry_lineage, runId),
    required_inputs: requiredInputs,
    artifact_references: artifactReferences,
    proposed_next_owner: nextOwner,
    proposed_next_gate: nextGate,
    producer_principal: producer,
    receiver_principal: receiver,
    disposition,
    offer_receipt_digest: nullableDigest(
      record.offer_receipt_digest,
      "runtime handoff offer_receipt_digest",
    ),
    receiving_receipt_digest: nullableDigest(
      record.receiving_receipt_digest,
      "runtime handoff receiving_receipt_digest",
    ),
    reason: requiredText(record.reason, "runtime handoff reason"),
    superseded_receipt_digest: nullableDigest(
      record.superseded_receipt_digest,
      "runtime handoff superseded_receipt_digest",
    ),
    changed_bound_inputs: changed,
    created_at: createdAt,
  };
}

export function validateRuntimeHandoffReceipt(
  value: unknown,
  context: RuntimeHandoffValidationContext,
): asserts value is RuntimeHandoffReceipt {
  const receipt = receiptShape(value);
  const contextRecord = exactPlainObject(
    context,
    "runtime handoff validation context",
    ["authority"],
    ["superseded_receipt"],
  );
  const authority = principal(
    contextRecord.authority,
    "runtime handoff authority",
  );
  const hasSupersededReceipt = Object.prototype.hasOwnProperty.call(
    contextRecord,
    "superseded_receipt",
  );
  const hasNext = receipt.proposed_next_owner !== null;

  if (receipt.disposition === "PENDING") {
    if (
      receipt.offer_receipt_digest !== null ||
      receipt.receiving_receipt_digest !== null
    ) {
      throw new CascadeError("PENDING runtime handoff cannot claim receiving evidence");
    }
  } else if (receipt.disposition === "ACCEPTED" || receipt.disposition === "REJECTED") {
    if (
      receipt.offer_receipt_digest === null ||
      receipt.receiving_receipt_digest === null
    ) {
      throw new CascadeError(
        `${receipt.disposition} runtime handoff requires the offer and receiving receipt digests`,
      );
    }
  }

  if (receipt.disposition === "NOT_APPLICABLE") {
    if (receipt.receiver_principal !== null || hasNext) {
      throw new CascadeError(
        "NOT_APPLICABLE runtime handoff cannot name a receiver or next route",
      );
    }
  } else if (!receipt.receiver_principal || !hasNext) {
    throw new CascadeError(
      `${receipt.disposition} runtime handoff requires a receiver and next route`,
    );
  }

  if (receipt.disposition === "ACCEPTED" || receipt.disposition === "REJECTED") {
    if (!receipt.receiver_principal || !samePrincipal(authority, receipt.receiver_principal)) {
      throw new CascadeError(
        `${receipt.disposition} runtime handoff requires its distinct receiving authority`,
      );
    }
  } else if (!samePrincipal(authority, receipt.producer_principal)) {
    throw new CascadeError(
      `${receipt.disposition} runtime handoff requires its producer authority`,
    );
  }

  if (receipt.disposition !== "STALE") {
    if (
      receipt.superseded_receipt_digest !== null ||
      receipt.changed_bound_inputs.length !== 0 ||
      hasSupersededReceipt
    ) {
      throw new CascadeError(
        "only a STALE runtime handoff may bind a superseded receipt or changed inputs",
      );
    }
    return;
  }

  if (
    receipt.superseded_receipt_digest === null ||
    receipt.changed_bound_inputs.length === 0 ||
    !hasSupersededReceipt
  ) {
    throw new CascadeError(
      "STALE runtime handoff requires the exact superseded receipt and changed bound inputs",
    );
  }
  const previous = receiptShape(contextRecord.superseded_receipt);
  if (
    receipt.superseded_receipt_digest !== runtimeHandoffReceiptDigest(previous) ||
    receipt.receipt_id === previous.receipt_id
  ) {
    throw new CascadeError(
      "STALE runtime handoff superseded receipt identity or digest is mismatched",
    );
  }
  if (
    receipt.run_id !== previous.run_id ||
    receipt.campaign_id !== previous.campaign_id ||
    receipt.task_id !== previous.task_id ||
    !samePrincipal(receipt.producer_principal, previous.producer_principal)
  ) {
    throw new CascadeError(
      "STALE runtime handoff cannot change its run, campaign, task, or producer authority",
    );
  }
  if (Date.parse(receipt.created_at) < Date.parse(previous.created_at)) {
    throw new CascadeError("STALE runtime handoff cannot predate its superseded receipt");
  }
  const actualChanges = changedBoundInputs(receipt, previous);
  if (stableJson(receipt.changed_bound_inputs) !== stableJson(actualChanges)) {
    throw new CascadeError(
      "STALE runtime handoff changed_bound_inputs do not match the superseded receipt",
    );
  }
}

export function runtimeHandoffReceiptDigest(
  receipt: RuntimeHandoffReceipt,
): string {
  return sha256Text(stableJson(receipt));
}
