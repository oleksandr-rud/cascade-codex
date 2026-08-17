import { createHmac, timingSafeEqual } from "node:crypto";

import {
  ACTION_BINDING_VERSION,
  actionBindingDigest,
  assertSafeSimulationAction,
  assertCampaignConfirmationKeyId,
  type PolicyDefinition,
  type SimulationAction,
  policyAppliesToObservation,
} from "./simulation-definitions";
import {
  CascadeError,
  confirmationSecretBytes,
  stableJson,
  valueDigest,
} from "./common";

const HIGH_CONFIDENCE_SECRET_PATTERNS = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/g,
  /\bsk-(?:proj-)?[A-Za-z0-9_-]{16,}\b/g,
  /\bgh[pousr]_[A-Za-z0-9]{20,}\b/g,
  /\bAKIA[0-9A-Z]{16}\b/g,
] as const;

const SECRET_PATTERNS = [
  ...HIGH_CONFIDENCE_SECRET_PATTERNS,
  /\b(?:auth(?:orization)?|api[-_ ]?key|cookie|password|passwd|passcode|pin|otp|secret|token|credentials?)\s*[:=]\s*["']?[^\s"']+/gi,
] as const;

export const CAMPAIGN_SUPPORTED_BUDGET_DIMENSIONS = [
  "action_count",
  "output_bytes",
] as const;
export const CAMPAIGN_REDACTION_CAPABILITIES = [
  "no-secrets-v1",
  "source-code-v1",
] as const;

export interface PolicyConfirmationReceipt {
  schema_version: 2;
  receipt_id: string;
  run_id: string;
  policy_id: string;
  policy_version: string;
  policy_digest: string;
  campaign_id: string;
  task_id: string;
  action_index: number;
  action_binding_version: typeof ACTION_BINDING_VERSION;
  action_binding_digest: string;
  decision: "CONFIRM";
  issued_at: string;
  expires_at: string;
  confirmed_by: string;
  authority_key_id: string;
  signature: string;
}

export interface CampaignPolicyBudgetUsage {
  [policyId: string]: {
    action_count: number;
    output_bytes: number;
  };
}

export interface CampaignPolicyConfirmationUsage {
  [receiptId: string]: {
    receipt_digest: string;
    policy_id: string;
    action_binding_version: typeof ACTION_BINDING_VERSION;
    action_binding_digest: string;
    consumed_at: string;
  };
}

export interface PolicyActionContext {
  run_id: string;
  campaign_id: string;
  task_id: string;
  task_kind: string;
  driver_type: string;
  action_index: number;
  action: SimulationAction;
  projected_output_bytes: number;
  supported_budget_dimensions: Array<"action_count" | "output_bytes">;
  redaction_capabilities: Array<"no-secrets-v1" | "source-code-v1">;
  now: string;
  confirmation_receipts?: PolicyConfirmationReceipt[];
  confirmation_secrets?: Record<string, string>;
  confirmation_usage?: CampaignPolicyConfirmationUsage;
  budget_usage?: CampaignPolicyBudgetUsage;
}

export interface CampaignPolicyDecision {
  decided_at: string;
  action_index: number;
  action_type: SimulationAction["type"];
  action_binding_version: typeof ACTION_BINDING_VERSION;
  action_binding_digest: string;
  policy_id: string | null;
  policy_version: string | null;
  policy_digest: string | null;
  applicability: "APPLICABLE" | "NOT_APPLICABLE" | "AMBIGUOUS";
  effect: PolicyDefinition["effect"] | null;
  decision: "ALLOW" | "DENY" | "REQUIRE_CONFIRMATION" | "BLOCKED";
  reason: string;
  redaction_profile: string | null;
  redaction_status: "REQUIRED" | "BLOCKED" | "NOT_APPLICABLE";
  confirmation_receipt_id: string | null;
  confirmation_receipt_digest: string | null;
  budgets: {
    required_dimensions: PolicyDefinition["budgets"]["required_dimensions"];
    max_actions: number;
    max_output_bytes: number;
    consumed_before: {
      action_count: number;
      output_bytes: number;
    };
    consumed_after: {
      action_count: number;
      output_bytes: number;
    };
    remaining_after: {
      action_count: number;
      output_bytes: number;
    };
  } | null;
  considered_policies: Array<{
    policy_id: string;
    policy_version: string;
    policy_digest: string;
    applicability: "APPLICABLE" | "NOT_APPLICABLE";
  }>;
}

export interface PolicyOutputControl {
  value: string;
  original_bytes: number;
  retained_bytes: number;
  redacted: boolean;
  truncated: boolean;
}

function containsSecret(
  value: string,
  sensitiveValues: readonly string[] = [],
): boolean {
  return SECRET_PATTERNS.some((pattern) => {
    pattern.lastIndex = 0;
    return pattern.test(value);
  }) || sensitiveValues.some(
    (sensitiveValue) =>
      sensitiveValue.length > 0 && value.includes(sensitiveValue),
  );
}

export function applyPolicyOutputControls(
  value: string,
  policy: PolicyDefinition,
  sensitiveValues: readonly string[] = [],
): PolicyOutputControl {
  const originalBytes = Buffer.byteLength(value);
  let controlled = value;
  let redacted = false;
  const patterns =
    policy.redaction_profile === "no-secrets-v1"
      ? SECRET_PATTERNS
      : HIGH_CONFIDENCE_SECRET_PATTERNS;
  for (const pattern of patterns) {
      pattern.lastIndex = 0;
      controlled = controlled.replace(pattern, "[REDACTED]");
  }
  for (const sensitiveValue of sensitiveValues) {
    if (sensitiveValue.length > 0) {
      controlled = controlled.replaceAll(sensitiveValue, "[REDACTED]");
    }
  }
  redacted = controlled !== value;
  const controlledBytes = Buffer.from(controlled);
  const truncated = controlledBytes.byteLength > policy.budgets.max_output_bytes;
  if (truncated) {
    controlled = new TextDecoder().decode(
      controlledBytes.subarray(0, policy.budgets.max_output_bytes),
    );
  }
  return {
    value: controlled,
    original_bytes: originalBytes,
    retained_bytes: Buffer.byteLength(controlled),
    redacted,
    truncated,
  };
}

function applies(
  policy: PolicyDefinition,
  context: PolicyActionContext,
): boolean {
  return policyAppliesToObservation(policy, {
    campaign_id: context.campaign_id,
    task_id: context.task_id,
    task_kind: context.task_kind,
    driver_type: context.driver_type,
    action: context.action,
  });
}

function baseDecision(
  context: PolicyActionContext,
): Pick<
  CampaignPolicyDecision,
  "decided_at" | "action_index" | "action_type" | "action_binding_version" | "action_binding_digest"
> {
  assertSafeSimulationAction(context.action);
  return {
    decided_at: context.now,
    action_index: context.action_index,
    action_type: context.action.type,
    action_binding_version: ACTION_BINDING_VERSION,
    action_binding_digest: actionBindingDigest(context.action),
  };
}

function receiptMatches(
  receipt: PolicyConfirmationReceipt,
  policy: PolicyDefinition,
  context: PolicyActionContext,
  actionDigest: string,
): boolean {
  try {
    validatePolicyConfirmationReceipt(receipt);
  } catch {
    return false;
  }
  const now = Date.parse(context.now);
  const issued = Date.parse(receipt.issued_at);
  const expires = Date.parse(receipt.expires_at);
  const authority = policy.confirmation_authority;
  const secret = authority && context.confirmation_secrets &&
      Object.hasOwn(context.confirmation_secrets, authority.key_id)
    ? context.confirmation_secrets[authority.key_id]
    : undefined;
  const expectedSignature =
    secret && authority
      ? signPolicyConfirmationReceipt(
          {
            ...receipt,
            signature: undefined,
          },
          secret,
        )
      : null;
  const signatureMatches =
    expectedSignature !== null &&
    expectedSignature.length === receipt.signature.length &&
    timingSafeEqual(
      Buffer.from(expectedSignature, "utf8"),
      Buffer.from(receipt.signature, "utf8"),
    );
  return (
    receipt.schema_version === 2 &&
    receipt.receipt_id.trim().length > 0 &&
    Number.isFinite(now) &&
    Number.isFinite(issued) &&
    Number.isFinite(expires) &&
    issued <= now &&
    now < expires &&
    receipt.policy_id === policy.id &&
    receipt.policy_version === policy.version &&
    receipt.run_id === context.run_id &&
    receipt.policy_digest === valueDigest(policy) &&
    receipt.campaign_id === context.campaign_id &&
    receipt.task_id === context.task_id &&
    receipt.action_index === context.action_index &&
    receipt.action_binding_version === ACTION_BINDING_VERSION &&
    receipt.action_binding_digest === actionDigest &&
    receipt.decision === "CONFIRM" &&
    !!authority &&
    receipt.authority_key_id === authority.key_id &&
    authority.allowed_confirmers.includes(receipt.confirmed_by) &&
    signatureMatches
  );
}

export function policyConfirmationReceiptMatches(
  receipt: PolicyConfirmationReceipt,
  policy: PolicyDefinition,
  context: PolicyActionContext,
): boolean {
  return receiptMatches(receipt, policy, context, actionBindingDigest(context.action));
}

type UnsignedConfirmationReceipt = Omit<
  PolicyConfirmationReceipt,
  "signature"
> & { signature?: undefined };

export function signPolicyConfirmationReceipt(
  receipt: UnsignedConfirmationReceipt,
  secret: string,
): string {
  const key = confirmationSecretBytes(secret, "confirmation signing secret");
  const { signature: _ignored, ...payload } = receipt;
  return createHmac("sha256", key).update(stableJson(payload)).digest("hex");
}

export function validatePolicyConfirmationReceipt(
  value: unknown,
): asserts value is PolicyConfirmationReceipt {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new CascadeError("confirmation receipt must be an object");
  }
  const receipt = value as Record<string, unknown>;
  const allowedKeys = new Set([
    "schema_version",
    "receipt_id",
    "run_id",
    "policy_id",
    "policy_version",
    "policy_digest",
    "campaign_id",
    "task_id",
    "action_index",
    "action_binding_version",
    "action_binding_digest",
    "decision",
    "issued_at",
    "expires_at",
    "confirmed_by",
    "authority_key_id",
    "signature",
  ]);
  const unknownKeys = Object.keys(receipt).filter((key) => !allowedKeys.has(key));
  if (unknownKeys.length) {
    throw new CascadeError(
      `confirmation receipt has unknown fields: ${unknownKeys.sort().join(", ")}`,
    );
  }
  if (receipt.schema_version !== 2) {
    throw new CascadeError("confirmation receipt schema_version must be 2");
  }
  for (const key of [
    "receipt_id",
    "run_id",
    "policy_id",
    "policy_version",
    "policy_digest",
    "campaign_id",
    "task_id",
    "action_binding_digest",
    "decision",
    "issued_at",
    "expires_at",
    "confirmed_by",
    "authority_key_id",
    "signature",
  ]) {
    if (typeof receipt[key] !== "string" || !(receipt[key] as string).trim()) {
      throw new CascadeError(`confirmation receipt ${key} must be non-empty`);
    }
  }
  if (receipt.action_binding_version !== ACTION_BINDING_VERSION) {
    throw new CascadeError("confirmation receipt action binding version is invalid");
  }
  assertCampaignConfirmationKeyId(
    receipt.authority_key_id,
    "confirmation receipt authority_key_id",
  );
  if (!Number.isInteger(receipt.action_index) || Number(receipt.action_index) < 0) {
    throw new CascadeError(
      "confirmation receipt action_index must be a non-negative integer",
    );
  }
  if (!/^[0-9]+\.[0-9]+\.[0-9]+$/.test(String(receipt.policy_version))) {
    throw new CascadeError("confirmation receipt policy_version must be semver");
  }
  for (const key of ["policy_digest", "action_binding_digest", "signature"]) {
    if (!/^[a-f0-9]{64}$/.test(String(receipt[key]))) {
      throw new CascadeError(`confirmation receipt ${key} must be sha256 hex`);
    }
  }
  if (receipt.decision !== "CONFIRM") {
    throw new CascadeError("confirmation receipt decision must be CONFIRM");
  }
  const issued = Date.parse(String(receipt.issued_at));
  const expires = Date.parse(String(receipt.expires_at));
  if (!Number.isFinite(issued) || !Number.isFinite(expires) || expires <= issued) {
    throw new CascadeError(
      "confirmation receipt timestamps must be valid and expires_at must follow issued_at",
    );
  }
}

export function consumePolicyBudget(
  decision: CampaignPolicyDecision,
  usage: CampaignPolicyBudgetUsage,
  outputBytes = 0,
): void {
  if (decision.decision !== "ALLOW" || !decision.policy_id || !decision.budgets) {
    return;
  }
  const current = usage[decision.policy_id] ?? {
    action_count: 0,
    output_bytes: 0,
  };
  const next = {
    action_count: current.action_count + 1,
    output_bytes: current.output_bytes + outputBytes,
  };
  usage[decision.policy_id] = next;
  decision.budgets.consumed_after = { ...next };
  decision.budgets.remaining_after = {
    action_count: Math.max(0, decision.budgets.max_actions - next.action_count),
    output_bytes: Math.max(
      0,
      decision.budgets.max_output_bytes - next.output_bytes,
    ),
  };
}

export function consumePolicyOutputBudget(
  decision: CampaignPolicyDecision,
  usage: CampaignPolicyBudgetUsage,
  outputBytes: number,
): void {
  if (!decision.policy_id || !decision.budgets || outputBytes < 1) return;
  const current = usage[decision.policy_id] ?? {
    action_count: 0,
    output_bytes: 0,
  };
  current.output_bytes = Math.min(
    decision.budgets.max_output_bytes,
    current.output_bytes + outputBytes,
  );
  usage[decision.policy_id] = current;
  decision.budgets.consumed_after = { ...current };
  decision.budgets.remaining_after = {
    action_count: Math.max(
      0,
      decision.budgets.max_actions - current.action_count,
    ),
    output_bytes: Math.max(
      0,
      decision.budgets.max_output_bytes - current.output_bytes,
    ),
  };
}

export function resolvePolicyDecision(
  policies: PolicyDefinition[],
  context: PolicyActionContext,
): CampaignPolicyDecision {
  const base = baseDecision(context);
  const applicable = policies.filter((policy) => applies(policy, context));
  const consideredPolicies = policies.map((policy) => ({
    policy_id: policy.id,
    policy_version: policy.version,
    policy_digest: valueDigest(policy),
    applicability: applies(policy, context)
      ? ("APPLICABLE" as const)
      : ("NOT_APPLICABLE" as const),
  }));
  if (applicable.length === 0) {
    return {
      ...base,
      policy_id: null,
      policy_version: null,
      policy_digest: null,
      applicability: "NOT_APPLICABLE",
      effect: null,
      decision: "DENY",
      reason: "default deny: no applicable policy",
      redaction_profile: null,
      redaction_status: "NOT_APPLICABLE",
      confirmation_receipt_id: null,
      confirmation_receipt_digest: null,
      budgets: null,
      considered_policies: consideredPolicies,
    };
  }
  if (applicable.length > 1) {
    return {
      ...base,
      policy_id: null,
      policy_version: null,
      policy_digest: null,
      applicability: "AMBIGUOUS",
      effect: null,
      decision: "BLOCKED",
      reason: `ambiguous policy authority: ${applicable
        .map((policy) => `${policy.id}@${policy.version}`)
        .sort()
        .join(", ")}`,
      redaction_profile: null,
      redaction_status: "BLOCKED",
      confirmation_receipt_id: null,
      confirmation_receipt_digest: null,
      budgets: null,
      considered_policies: consideredPolicies,
    };
  }

  const policy = applicable[0]!;
  const consumed = context.budget_usage?.[policy.id] ?? {
    action_count: 0,
    output_bytes: 0,
  };
  const common = {
    ...base,
    policy_id: policy.id,
    policy_version: policy.version,
    policy_digest: valueDigest(policy),
    applicability: "APPLICABLE" as const,
    effect: policy.effect,
    redaction_profile: policy.redaction_profile,
    redaction_status: "REQUIRED" as const,
    confirmation_receipt_id: null,
    confirmation_receipt_digest: null,
    budgets: {
      ...policy.budgets,
      consumed_before: { ...consumed },
      consumed_after: { ...consumed },
      remaining_after: {
        action_count: Math.max(
          0,
          policy.budgets.max_actions - consumed.action_count,
        ),
        output_bytes: Math.max(
          0,
          policy.budgets.max_output_bytes - consumed.output_bytes,
        ),
      },
    },
    considered_policies: consideredPolicies,
  };
  const unsupportedDimensions = policy.budgets.required_dimensions.filter(
    (dimension) =>
      !context.supported_budget_dimensions.includes(
        dimension as "action_count" | "output_bytes",
      ),
  );
  if (unsupportedDimensions.length) {
    return {
      ...common,
      decision: "BLOCKED",
      reason: `unsupported required policy budget dimensions: ${unsupportedDimensions.join(", ")}`,
    };
  }
  if (!context.redaction_capabilities.includes(policy.redaction_profile)) {
    return {
      ...common,
      decision: "BLOCKED",
      redaction_status: "BLOCKED",
      reason: `unsupported required redaction profile: ${policy.redaction_profile}`,
    };
  }
  if (consumed.action_count + 1 > policy.budgets.max_actions) {
    return {
      ...common,
      decision: "DENY",
      reason: `policy action budget exceeded: ${consumed.action_count + 1}/${policy.budgets.max_actions}`,
    };
  }
  if (
    consumed.output_bytes + context.projected_output_bytes >
    policy.budgets.max_output_bytes
  ) {
    return {
      ...common,
      decision: "DENY",
      reason: `policy output budget exceeded: ${consumed.output_bytes + context.projected_output_bytes}/${policy.budgets.max_output_bytes}`,
    };
  }
  if (
    policy.budgets.required_dimensions.includes("output_bytes") &&
    consumed.output_bytes >= policy.budgets.max_output_bytes
  ) {
    return {
      ...common,
      decision: "DENY",
      reason: `policy output budget exhausted: ${consumed.output_bytes}/${policy.budgets.max_output_bytes}`,
    };
  }
  if (
    containsSecret(
      stableJson(context.action),
      Object.values(context.confirmation_secrets ?? {}),
    )
  ) {
    return {
      ...common,
      decision: "DENY",
      redaction_status: "BLOCKED",
      reason: `policy redaction profile ${policy.redaction_profile} blocked secret-like action material`,
    };
  }
  if (policy.effect === "DENY") {
    return {
      ...common,
      decision: "DENY",
      reason: policy.reason,
    };
  }
  if (policy.effect === "REQUIRE_CONFIRMATION") {
    const suppliedReceipts = context.confirmation_receipts ?? [];
    const collision = suppliedReceipts.find((candidate) => {
      const usage = context.confirmation_usage?.[candidate.receipt_id];
      return usage && usage.receipt_digest !== valueDigest(candidate);
    });
    if (collision) {
      return {
        ...common,
        decision: "BLOCKED",
        reason: `${policy.reason}; confirmation receipt id collision: ${collision.receipt_id}`,
      };
    }
    const matchingReceipts = suppliedReceipts.filter((candidate) =>
      receiptMatches(candidate, policy, context, base.action_binding_digest),
    );
    if (matchingReceipts.length && !context.confirmation_usage) {
      return {
        ...common,
        decision: "BLOCKED",
        reason: `${policy.reason}; confirmation usage authority is required`,
      };
    }
    const receipt = matchingReceipts.find(
      (candidate) => !context.confirmation_usage?.[candidate.receipt_id],
    );
    if (!receipt) {
      const consumed = matchingReceipts.length > 0;
      return {
        ...common,
        decision: consumed ? "BLOCKED" : "REQUIRE_CONFIRMATION",
        reason: consumed
          ? `${policy.reason}; confirmation receipt already consumed`
          : `${policy.reason}; valid confirmation receipt required`,
      };
    }
    context.confirmation_usage![receipt.receipt_id] = {
      receipt_digest: valueDigest(receipt),
      policy_id: policy.id,
      action_binding_version: ACTION_BINDING_VERSION,
      action_binding_digest: base.action_binding_digest,
      consumed_at: context.now,
    };
    return {
      ...common,
      decision: "ALLOW",
      reason: policy.reason,
      confirmation_receipt_id: receipt.receipt_id,
      confirmation_receipt_digest: valueDigest(receipt),
    };
  }
  return {
    ...common,
    decision: "ALLOW",
    reason: policy.reason,
  };
}
