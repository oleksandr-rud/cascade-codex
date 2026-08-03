import { describe, expect, test } from "bun:test";

import {
  resolveCampaign,
  validateClaim,
  validateDataset,
  validatePopulation,
  validatePolicy,
  validateTask,
  validateTaskPolicyApplicability,
} from "./simulation-definitions";

describe("simulation definition contracts", () => {
  test("resolves the complete correctness fixture graph", async () => {
    const resolved = await resolveCampaign(
      "evals/campaigns/simulation-contract-smoke.json",
    );
    expect(resolved.populations).toHaveLength(1);
    expect(resolved.personaDerivations).toHaveLength(1);
    expect(resolved.sourceFiles).toContain(
      "docs/product/personas/fixtures/P-999-framework-support-role.md",
    );
    expect(resolved.dataset.cases.map((item) => item.partition).sort()).toEqual([
      "calibration-reference",
      "calibration-reference",
      "calibration-reference",
      "development",
      "holdout",
      "regression",
    ]);
    expect(resolved.treatments.filter((item) => item.baseline)).toHaveLength(1);
  });

  test("rejects population weights that do not sum to one", () => {
    expect(() =>
      validatePopulation(
        {
          schema_version: 1,
          id: "invalid-population",
          source: { kind: "synthetic", description: "negative fixture" },
          actors: [
            {
              id: "actor-a",
              weight: 0.4,
              behavior: {},
              slices: ["standard"],
            },
          ],
        },
        "invalid-population",
      ),
    ).toThrow("weights must sum to 1");
  });

  test("keeps coverage weights distinct from prevalence", async () => {
    const resolved = await resolveCampaign(
      "evals/campaigns/simulation-contract-smoke.json",
    );
    const population = structuredClone(resolved.populations[0]!) as unknown as Record<
      string,
      unknown
    >;
    population.weight_semantics = "estimated-prevalence";
    expect(() => validatePopulation(population, "invalid-derived-population")).toThrow(
      "must use test-allocation",
    );
  });

  test("rejects case identity leakage across partitions", () => {
    expect(() =>
      validateDataset(
        {
          schema_version: 1,
          id: "invalid-dataset",
          leakage_policy: "exclusive-case-identity",
          cases: [
            {
              id: "same-case",
              scenario_id: "scenario-a",
              actor_id: "actor-a",
              partition: "development",
            },
            {
              id: "same-case",
              scenario_id: "scenario-a",
              actor_id: "actor-a",
              partition: "holdout",
            },
          ],
        },
        "invalid-dataset",
      ),
    ).toThrow("leaks case identity");
  });

  test("rejects mismatched surface and driver types", () => {
    expect(() =>
      validateTask(
        {
          schema_version: 1,
          id: "INVALID-TASK",
          kind: "browser",
          driver: { type: "direct-process" },
          required: true,
          timeout_ms: 1000,
          command: ["true"],
          oracle_ids: ["oracle-a"],
        },
        "invalid-task",
      ),
    ).toThrow("invalid kind/driver");
  });

  test("rejects malformed state actions before execution", () => {
    expect(() =>
      validateTask(
        {
          schema_version: 1,
          id: "INVALID-ACTION",
          kind: "agent-response",
          driver: { type: "fake" },
          required: true,
          timeout_ms: 1000,
          actions: [{ type: "increment", amount: "one" }],
          oracle_ids: ["oracle-a"],
        },
        "invalid-action",
      ),
    ).toThrow("path is required");
  });

  test("rejects referenced policies whose scope cannot apply before execution", async () => {
    const resolved = await resolveCampaign(
      "evals/campaigns/simulation-contract-smoke.json",
    );
    const policy = structuredClone(resolved.policies[0]!);
    policy.scope.campaign_ids = ["different-campaign"];

    expect(() =>
      validateTaskPolicyApplicability(
        resolved.campaign,
        resolved.tasks[0]!,
        [policy],
      ),
    ).toThrow("has no applicable referenced policy");
  });

  test("keeps executable policy validation aligned with the public schema", async () => {
    const resolved = await resolveCampaign(
      "evals/campaigns/simulation-contract-smoke.json",
    );
    const policy = structuredClone(resolved.policies[0]!) as Record<
      string,
      unknown
    >;
    policy.version = "not-semver";
    policy.unexpected = true;
    expect(() => validatePolicy(policy, "invalid-policy")).toThrow(
      "unknown fields",
    );

    const invalidVersion = structuredClone(
      resolved.policies[0]!,
    ) as unknown as Record<string, unknown>;
    invalidVersion.version = "not-semver";
    expect(() => validatePolicy(invalidVersion, "invalid-policy")).toThrow(
      "version must be semver",
    );

    const emptyPaths = structuredClone(resolved.policies[0]!) as unknown as Record<
      string,
      unknown
    >;
    (emptyPaths.scope as Record<string, unknown>).action_paths = [];
    expect(() => validatePolicy(emptyPaths, "invalid-policy")).toThrow(
      "action_paths is empty",
    );
  });

  test("rejects unknown evidence artifact names", () => {
    expect(() =>
      validateClaim(
        {
          schema_version: 1,
          id: "invalid-claim",
          class: "execution",
          assertion: "negative fixture",
          scope: { fixture: true },
          required_policy_ids: [],
          required_oracle_ids: [],
          required_metric_ids: [],
          requires_calibration: false,
          evidence_requirements: ["screen-recording"],
        },
        "invalid-claim",
      ),
    ).toThrow("unknown artifact");
  });
});
