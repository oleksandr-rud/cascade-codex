import { describe, expect, test } from "bun:test";

import {
  type PolicyActionContext,
  type PolicyConfirmationReceipt,
  applyPolicyOutputControls,
  consumePolicyBudget,
  resolvePolicyDecision,
  signPolicyConfirmationReceipt,
  validatePolicyConfirmationReceipt,
} from "./campaign-policies";
import { type PolicyDefinition } from "./simulation-definitions";
import { valueDigest } from "./common";

const CONFIRMATION_SECRET = "test-confirmation-secret";
const CONFIRMATION_AUTHORITY = {
  key_id: "test-key",
  secret_env: "CASCADE_TEST_CONFIRMATION_SECRET",
  allowed_confirmers: ["human:reviewer"],
};

function policy(
  override: Partial<PolicyDefinition> = {},
): PolicyDefinition {
  return {
    schema_version: 2,
    id: "policy-1",
    version: "2.0.0",
    effect: "ALLOW",
    scope: {
      campaign_ids: ["campaign-1"],
      task_ids: ["TASK-1"],
      task_kinds: ["agent-response"],
      driver_types: ["fake"],
      action_types: ["set"],
      action_paths: ["workflow.status"],
    },
    budgets: {
      required_dimensions: ["action_count", "output_bytes"],
      max_actions: 2,
      max_output_bytes: 128,
    },
    redaction_profile: "no-secrets-v1",
    reason: "bounded fixture mutation",
    ...override,
  };
}

function context(
  override: Partial<PolicyActionContext> = {},
): PolicyActionContext {
  return {
    run_id: "run-1",
    campaign_id: "campaign-1",
    task_id: "TASK-1",
    task_kind: "agent-response",
    driver_type: "fake",
    action_index: 0,
    action: {
      type: "set",
      path: "workflow.status",
      value: "complete",
    },
    projected_output_bytes: 32,
    supported_budget_dimensions: ["action_count", "output_bytes"],
    redaction_capabilities: ["no-secrets-v1", "source-code-v1"],
    now: "2026-07-30T10:30:00.000Z",
    confirmation_secrets: {
      [CONFIRMATION_AUTHORITY.key_id]: CONFIRMATION_SECRET,
    },
    budget_usage: {},
    ...override,
  };
}

function confirmation(
  governingPolicy: PolicyDefinition,
  actionContext: PolicyActionContext,
  override: Partial<PolicyConfirmationReceipt> = {},
): PolicyConfirmationReceipt {
  const receipt = {
    schema_version: 1,
    receipt_id: "confirmation-1",
    run_id: actionContext.run_id,
    policy_id: governingPolicy.id,
    policy_version: governingPolicy.version,
    policy_digest: valueDigest(governingPolicy),
    campaign_id: actionContext.campaign_id,
    task_id: actionContext.task_id,
    action_index: actionContext.action_index,
    action_digest: valueDigest(actionContext.action),
    decision: "CONFIRM",
    issued_at: "2026-07-30T10:00:00.000Z",
    expires_at: "2026-07-30T11:00:00.000Z",
    confirmed_by: "human:reviewer",
    authority_key_id: CONFIRMATION_AUTHORITY.key_id,
    signature: "",
    ...override,
  };
  receipt.signature = signPolicyConfirmationReceipt(
    { ...receipt, signature: undefined },
    CONFIRMATION_SECRET,
  );
  return receipt;
}

describe("campaign policy resolver", () => {
  test("allows only an exactly scoped action and binds decision digests", () => {
    const governingPolicy = policy();
    const decision = resolvePolicyDecision([governingPolicy], context());

    expect(decision).toMatchObject({
      decision: "ALLOW",
      policy_id: governingPolicy.id,
      policy_version: governingPolicy.version,
      redaction_profile: "no-secrets-v1",
    });
    expect(decision.policy_digest).toBe(valueDigest(governingPolicy));
    expect(decision.action_digest).toBe(valueDigest(context().action));
    expect(decision.applicability).toBe("APPLICABLE");
  });

  test("defaults to deny when any scope dimension mismatches", () => {
    const decision = resolvePolicyDecision(
      [policy()],
      context({ task_id: "OTHER-TASK" }),
    );

    expect(decision.decision).toBe("DENY");
    expect(decision.policy_id).toBeNull();
    expect(decision.reason).toContain("default deny");
    expect(decision.considered_policies[0]?.applicability).toBe(
      "NOT_APPLICABLE",
    );
    expect(
      resolvePolicyDecision(
        [
          policy({
            scope: {
              ...policy().scope,
              action_types: ["process-exec"],
              action_paths: ["workflow.status"],
            },
          }),
        ],
        context({
          action: { type: "process-exec", argv: ["echo", "safe"] },
          driver_type: "fake",
        }),
      ).decision,
    ).toBe("DENY");
  });

  test("blocks ambiguous policy authority before action dispatch", () => {
    const decision = resolvePolicyDecision(
      [policy(), policy({ id: "policy-2" })],
      context(),
    );

    expect(decision.decision).toBe("BLOCKED");
    expect(decision.reason).toContain("policy-1@2.0.0");
    expect(decision.reason).toContain("policy-2@2.0.0");
  });

  test("requires an exact, unexpired confirmation receipt", () => {
    const governingPolicy = policy({
      effect: "REQUIRE_CONFIRMATION",
      confirmation_authority: CONFIRMATION_AUTHORITY,
    });
    const actionContext = context();

    expect(
      resolvePolicyDecision([governingPolicy], actionContext).decision,
    ).toBe("REQUIRE_CONFIRMATION");
    expect(
      resolvePolicyDecision([governingPolicy], {
        ...actionContext,
        confirmation_receipts: [
          confirmation(governingPolicy, actionContext, {
            expires_at: "2026-07-30T10:20:00.000Z",
          }),
        ],
      }).decision,
    ).toBe("REQUIRE_CONFIRMATION");
    expect(
      resolvePolicyDecision([governingPolicy], {
        ...actionContext,
        confirmation_receipts: [
          confirmation(governingPolicy, actionContext, {
            action_digest: valueDigest({ wrong: true }),
          }),
        ],
      }).decision,
    ).toBe("REQUIRE_CONFIRMATION");

    const receipt = confirmation(governingPolicy, actionContext);
    const confirmed = resolvePolicyDecision([governingPolicy], {
      ...actionContext,
      confirmation_receipts: [receipt],
    });
    expect(confirmed.decision).toBe("ALLOW");
    expect(confirmed.confirmation_receipt_id).toBe(receipt.receipt_id);
    expect(confirmed.confirmation_receipt_digest).toBe(valueDigest(receipt));
  });

  test("rejects schema-invalid, unsigned, or untrusted confirmation receipts", () => {
    const governingPolicy = policy({
      effect: "REQUIRE_CONFIRMATION",
      confirmation_authority: CONFIRMATION_AUTHORITY,
    });
    const actionContext = context();
    const receipt = confirmation(governingPolicy, actionContext);
    expect(
      resolvePolicyDecision([governingPolicy], {
        ...actionContext,
        confirmation_receipts: [
          {
            ...receipt,
            schema_version: 999,
          } as unknown as PolicyConfirmationReceipt,
        ],
      }).decision,
    ).toBe("REQUIRE_CONFIRMATION");
    expect(
      resolvePolicyDecision([governingPolicy], {
        ...actionContext,
        confirmation_receipts: [{ ...receipt, signature: "0".repeat(64) }],
      }).decision,
    ).toBe("REQUIRE_CONFIRMATION");
    expect(() =>
      validatePolicyConfirmationReceipt({
        ...receipt,
        unexpected: true,
      }),
    ).toThrow("unknown fields");
    expect(() =>
      validatePolicyConfirmationReceipt({
        ...receipt,
        expires_at: receipt.issued_at,
      }),
    ).toThrow("expires_at must follow issued_at");
  });

  test("denies action and projected output budget overruns", () => {
    expect(
      resolvePolicyDecision(
        [policy()],
        context({
          budget_usage: {
            "policy-1": { action_count: 2, output_bytes: 0 },
          },
        }),
      ).reason,
    ).toContain("action budget exceeded");
    expect(
      resolvePolicyDecision(
        [policy()],
        context({ projected_output_bytes: 129 }),
      ).reason,
    ).toContain("output budget exceeded");
    expect(
      resolvePolicyDecision(
        [policy()],
        context({
          projected_output_bytes: 0,
          budget_usage: {
            "policy-1": { action_count: 0, output_bytes: 128 },
          },
        }),
      ).reason,
    ).toContain("output budget exhausted");
  });

  test("enforces one cumulative budget across task-local action indexes", () => {
    const usage = {};
    const governingPolicy = policy({
      budgets: {
        required_dimensions: ["action_count", "output_bytes"],
        max_actions: 1,
        max_output_bytes: 128,
      },
    });
    const first = resolvePolicyDecision(
      [governingPolicy],
      context({ budget_usage: usage, projected_output_bytes: 0 }),
    );
    expect(first.decision).toBe("ALLOW");
    consumePolicyBudget(first, usage);
    const second = resolvePolicyDecision(
      [governingPolicy],
      context({
        action_index: 0,
        budget_usage: usage,
        projected_output_bytes: 0,
      }),
    );
    expect(second.decision).toBe("DENY");
    expect(second.reason).toContain("action budget exceeded");
    expect(first.budgets?.consumed_after.action_count).toBe(1);
    expect(first.budgets?.remaining_after.action_count).toBe(0);
  });

  test("blocks unsupported required budget and redaction capabilities", () => {
    expect(
      resolvePolicyDecision(
        [
          policy({
            budgets: {
              required_dimensions: ["token_count"],
              max_actions: 2,
              max_output_bytes: 128,
            },
          }),
        ],
        context(),
      ).reason,
    ).toContain("unsupported required policy budget");
    expect(
      resolvePolicyDecision(
        [policy()],
        context({ redaction_capabilities: [] }),
      ).reason,
    ).toContain("unsupported required redaction");
  });

  test("blocks secret-like action material under the named profile", () => {
    const decision = resolvePolicyDecision(
      [policy()],
      context({
        action: {
          type: "set",
          path: "workflow.status",
          value: "token=super-secret-value",
        },
      }),
    );

    expect(decision.decision).toBe("DENY");
    expect(decision.reason).toContain("redaction profile");
  });

  test("redacts and bounds process output before persistence", () => {
    const governingPolicy = policy({
      budgets: {
        required_dimensions: ["action_count", "output_bytes"],
        max_actions: 2,
        max_output_bytes: 24,
      },
    });
    const controlled = applyPolicyOutputControls(
      "token=super-secret-value and trailing output",
      governingPolicy,
    );

    expect(controlled.value).not.toContain("super-secret-value");
    expect(controlled.redacted).toBe(true);
    expect(controlled.truncated).toBe(true);
    expect(controlled.retained_bytes).toBeLessThanOrEqual(24);
  });

  test("redacts high-confidence secrets under source-code-v1", () => {
    const controlled = applyPolicyOutputControls(
      "const key = 'sk-proj-1234567890abcdefgh';",
      policy({ redaction_profile: "source-code-v1" }),
    );
    expect(controlled.redacted).toBe(true);
    expect(controlled.value).not.toContain("sk-proj-");
  });

  test("redacts configured authority values without relying on a prefix", () => {
    const controlled = applyPolicyOutputControls(
      "result=standalone-confirmation-secret",
      policy(),
      ["standalone-confirmation-secret"],
    );
    expect(controlled.value).toBe("result=[REDACTED]");
    expect(controlled.redacted).toBe(true);
  });
});
