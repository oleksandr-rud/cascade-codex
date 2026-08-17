import {
  CascadeError,
  parseRfc3339Instant,
  stableJson,
  utcNow,
  valueDigest,
} from "./common";

export const RETRY_LINEAGE_SCHEMA_VERSION = 1 as const;

export type RetryLineageParentStatus =
  | "COMPLETED"
  | "BLOCKED"
  | "UNKNOWN_OUTCOME";

export type RetryMode = "AUTOMATIC" | "MANUAL";

export interface RetryLineageChildIdentity {
  run_id: string;
  campaign_id: string;
  attempt: number;
  campaign_digest: string;
  source_digest: string;
}

export interface VerifiedRetryLineageParent {
  verification_status: "VALID";
  run_id: string;
  campaign_id: string;
  attempt: number;
  campaign_digest: string;
  source_digest: string;
  reservation_digest: string;
  finalization_manifest_digest: string;
  source_manifest_digest: string;
  status: RetryLineageParentStatus;
}

export interface RetryLineageExpectation {
  child: RetryLineageChildIdentity;
  parent: VerifiedRetryLineageParent;
  retry_mode: RetryMode;
}

export interface RetryLineageReceipt {
  schema_version: typeof RETRY_LINEAGE_SCHEMA_VERSION;
  artifact_type: "campaign-retry-lineage-receipt";
  receipt_id: string;
  child: RetryLineageChildIdentity;
  parent: VerifiedRetryLineageParent;
  retry_mode: RetryMode;
  created_at: string;
}

const RUN_ID = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const DIGEST = /^[a-f0-9]{64}$/;
const PARENT_STATUSES = new Set<RetryLineageParentStatus>([
  "COMPLETED",
  "BLOCKED",
  "UNKNOWN_OUTCOME",
]);
const RETRY_MODES = new Set<RetryMode>(["AUTOMATIC", "MANUAL"]);
const RECEIPT_KEYS = [
  "artifact_type",
  "child",
  "created_at",
  "parent",
  "receipt_id",
  "retry_mode",
  "schema_version",
] as const;
const CHILD_KEYS = [
  "attempt",
  "campaign_digest",
  "campaign_id",
  "run_id",
  "source_digest",
] as const;
const PARENT_KEYS = [
  "attempt",
  "campaign_digest",
  "campaign_id",
  "finalization_manifest_digest",
  "reservation_digest",
  "run_id",
  "source_digest",
  "source_manifest_digest",
  "status",
  "verification_status",
] as const;
const EXPECTATION_KEYS = ["child", "parent", "retry_mode"] as const;

function exactDataObject(
  value: unknown,
  expectedKeys: readonly string[],
  label: string,
): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new CascadeError(`${label} shape is invalid`);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new CascadeError(`${label} shape is invalid`);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const ownKeys = Reflect.ownKeys(descriptors);
  const keys = ownKeys.filter((key): key is string => typeof key === "string");
  if (
    keys.length !== ownKeys.length ||
    [...keys].sort().join(",") !== [...expectedKeys].sort().join(",")
  ) {
    throw new CascadeError(`${label} shape is invalid`);
  }
  const snapshot: Record<string, unknown> = {};
  for (const key of keys) {
    const descriptor = descriptors[key];
    if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) {
      throw new CascadeError(`${label} shape is invalid`);
    }
    snapshot[key] = descriptor.value;
  }
  return snapshot;
}

function requireIdentity(
  value: unknown,
  label: "child" | "parent",
): RetryLineageChildIdentity | VerifiedRetryLineageParent {
  const record = exactDataObject(
    value,
    label === "child" ? CHILD_KEYS : PARENT_KEYS,
    `retry lineage ${label}`,
  );
  if (
    typeof record.run_id !== "string" ||
    !RUN_ID.test(record.run_id) ||
    typeof record.campaign_id !== "string" ||
    !record.campaign_id.trim() ||
    !Number.isSafeInteger(record.attempt) ||
    Number(record.attempt) < 1 ||
    typeof record.campaign_digest !== "string" ||
    !DIGEST.test(record.campaign_digest) ||
    typeof record.source_digest !== "string" ||
    !DIGEST.test(record.source_digest)
  ) {
    throw new CascadeError(`retry lineage ${label} identity is invalid`);
  }

  const identity = {
    run_id: record.run_id,
    campaign_id: record.campaign_id,
    attempt: record.attempt,
    campaign_digest: record.campaign_digest,
    source_digest: record.source_digest,
  } as RetryLineageChildIdentity;
  if (label === "child") return identity;

  if (
    record.verification_status !== "VALID" ||
    typeof record.reservation_digest !== "string" ||
    !DIGEST.test(record.reservation_digest) ||
    typeof record.finalization_manifest_digest !== "string" ||
    !DIGEST.test(record.finalization_manifest_digest) ||
    typeof record.source_manifest_digest !== "string" ||
    !DIGEST.test(record.source_manifest_digest) ||
    !PARENT_STATUSES.has(record.status as RetryLineageParentStatus)
  ) {
    throw new CascadeError(
      "retry lineage parent lacks valid immutable terminal verification",
    );
  }
  return {
    verification_status: "VALID",
    ...identity,
    reservation_digest: record.reservation_digest,
    finalization_manifest_digest: record.finalization_manifest_digest,
    source_manifest_digest: record.source_manifest_digest,
    status: record.status as RetryLineageParentStatus,
  };
}

function requireExpectation(value: unknown): RetryLineageExpectation {
  const record = exactDataObject(
    value,
    EXPECTATION_KEYS,
    "retry lineage expectation",
  );
  const child = requireIdentity(record.child, "child") as RetryLineageChildIdentity;
  const parent = requireIdentity(record.parent, "parent") as VerifiedRetryLineageParent;
  if (!RETRY_MODES.has(record.retry_mode as RetryMode)) {
    throw new CascadeError("retry lineage mode is invalid");
  }
  return { child, parent, retry_mode: record.retry_mode as RetryMode };
}

function assertRetrySemantics(expectation: RetryLineageExpectation): void {
  const { child, parent, retry_mode: retryMode } = expectation;
  if (child.run_id === parent.run_id) {
    throw new CascadeError("retry lineage child run must differ from its parent");
  }
  if (child.attempt !== parent.attempt + 1) {
    throw new CascadeError(
      "retry lineage child attempt must immediately follow its parent attempt",
    );
  }
  if (child.campaign_id !== parent.campaign_id) {
    throw new CascadeError("retry lineage cannot cross campaign identities");
  }
  if (child.campaign_digest !== parent.campaign_digest) {
    throw new CascadeError("retry lineage campaign digest is stale or mismatched");
  }
  if (child.source_digest !== parent.source_digest) {
    throw new CascadeError("retry lineage source identity is stale or mismatched");
  }
  if (parent.status === "UNKNOWN_OUTCOME" && retryMode === "AUTOMATIC") {
    throw new CascadeError(
      "UNKNOWN_OUTCOME parent runs cannot be retried automatically",
    );
  }
}

export function verifyRetryLineageReceipt(
  value: unknown,
  expected?: RetryLineageExpectation,
): RetryLineageReceipt {
  const record = exactDataObject(value, RECEIPT_KEYS, "retry lineage receipt");
  const child = requireIdentity(record.child, "child") as RetryLineageChildIdentity;
  const parent = requireIdentity(record.parent, "parent") as VerifiedRetryLineageParent;
  if (
    record.schema_version !== RETRY_LINEAGE_SCHEMA_VERSION ||
    record.artifact_type !== "campaign-retry-lineage-receipt" ||
    record.receipt_id !== `${child.run_id}-retry-lineage` ||
    !RETRY_MODES.has(record.retry_mode as RetryMode) ||
    parseRfc3339Instant(record.created_at) === null
  ) {
    throw new CascadeError("retry lineage receipt shape is invalid");
  }
  const expectation = {
    child,
    parent,
    retry_mode: record.retry_mode as RetryMode,
  } satisfies RetryLineageExpectation;
  assertRetrySemantics(expectation);

  if (expected !== undefined) {
    const normalizedExpected = requireExpectation(expected);
    assertRetrySemantics(normalizedExpected);
    if (
      stableJson(expectation) !== stableJson(normalizedExpected) ||
      record.receipt_id !== `${normalizedExpected.child.run_id}-retry-lineage`
    ) {
      throw new CascadeError(
        "retry lineage receipt does not match its verified parent and child authority",
      );
    }
  }

  return {
    schema_version: RETRY_LINEAGE_SCHEMA_VERSION,
    artifact_type: "campaign-retry-lineage-receipt",
    receipt_id: record.receipt_id as string,
    child,
    parent,
    retry_mode: record.retry_mode as RetryMode,
    created_at: record.created_at as string,
  };
}

export function buildRetryLineageReceipt(
  value: RetryLineageExpectation,
  createdAt = utcNow(),
): RetryLineageReceipt {
  const expectation = requireExpectation(value);
  assertRetrySemantics(expectation);
  const receipt: RetryLineageReceipt = {
    schema_version: RETRY_LINEAGE_SCHEMA_VERSION,
    artifact_type: "campaign-retry-lineage-receipt",
    receipt_id: `${expectation.child.run_id}-retry-lineage`,
    child: expectation.child,
    parent: expectation.parent,
    retry_mode: expectation.retry_mode,
    created_at: createdAt,
  };
  return verifyRetryLineageReceipt(receipt, expectation);
}

export function retryLineageReceiptDigest(value: unknown): string {
  return valueDigest(verifyRetryLineageReceipt(value));
}
