import { describe, expect, test } from "bun:test";

import { buildCalibrationReceipt } from "./campaigns";
import { resolveCampaign, type ResolvedCampaign } from "./simulation-definitions";

async function fixture(): Promise<ResolvedCampaign> {
  return resolveCampaign("evals/campaigns/simulation-contract-smoke.json");
}

describe("campaign calibration reducer", () => {
  test("calibrates aligned framework treatment rankings", async () => {
    const resolved = await fixture();
    const receipt = buildCalibrationReceipt(
      resolved,
      "calibration-test",
      "test-aggregator",
      new Date("2026-07-30T00:00:00Z"),
    );
    expect(receipt?.status).toBe("CALIBRATED");
    expect(receipt?.metric_results[0]?.rank_correlation).toBe(1);
    expect(receipt?.metric_results[0]?.linear_correlation).toBeGreaterThan(0.9);
    expect(receipt?.framework_fixture).toBe(true);
  });

  test("fails closed when a required risk slice is absent", async () => {
    const resolved = await fixture();
    resolved.referenceScores = resolved.referenceScores.filter(
      (row) => row.slice !== "risk",
    );
    const receipt = buildCalibrationReceipt(
      resolved,
      "missing-slice-test",
      "test-aggregator",
      new Date("2026-07-30T00:00:00Z"),
    );
    expect(receipt?.status).toBe("UNCALIBRATED");
    expect(receipt?.metric_results[0]?.missing_slices).toEqual([
      "reference:baseline-v1:risk",
      "reference:candidate-a-v1:risk",
      "reference:candidate-b-v1:risk",
    ]);
  });

  test("marks non-fixture calibration stale after its freshness window", async () => {
    const resolved = await fixture();
    resolved.calibration = {
      ...resolved.calibration!,
      framework_fixture: false,
      reference: {
        ...resolved.calibration!.reference,
        kind: "expert-labelled",
      },
    };
    const receipt = buildCalibrationReceipt(
      resolved,
      "stale-test",
      "test-aggregator",
      new Date("2028-01-01T00:00:00Z"),
    );
    expect(receipt?.status).toBe("STALE");
  });

  test("fails closed when the baseline is omitted", async () => {
    const resolved = await fixture();
    resolved.calibration = {
      ...resolved.calibration!,
      treatment_ids: ["candidate-a-v1", "candidate-b-v1"],
    };
    const receipt = buildCalibrationReceipt(
      resolved,
      "missing-baseline-test",
      "test-aggregator",
      new Date("2026-07-30T00:00:00Z"),
    );
    expect(receipt?.status).toBe("UNCALIBRATED");
    expect(receipt?.blockers).toContain(
      "calibration treatment set does not include the baseline",
    );
  });

  test("fails closed when any reference score lacks human labels", async () => {
    const resolved = await fixture();
    delete resolved.referenceScores[0]!.human_label;
    delete resolved.referenceScores[0]!.judge_label;
    const receipt = buildCalibrationReceipt(
      resolved,
      "sparse-label-test",
      "test-aggregator",
      new Date("2026-07-30T00:00:00Z"),
    );
    expect(receipt?.status).toBe("UNCALIBRATED");
    expect(receipt?.blockers).toContain(
      "human agreement threshold not satisfied",
    );
  });
});
