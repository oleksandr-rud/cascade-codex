import { describe, expect, test } from "bun:test";

import { CascadeError, stableJson } from "./common";
import { renderStarterPackage } from "./simulations";

describe("simulation starter bootstrap", () => {
  test("renders one complete collision-free package", async () => {
    const files = await renderStarterPackage({
      simulationId: "generated-example",
      ownerLane: "W-123",
      title: "Generated Example",
      referenceDate: "2026-07-30",
    });
    expect(files).toHaveLength(19);
    expect(new Set(files.map((file) => file.path)).size).toBe(files.length);
    expect(
      files.some(
        (file) =>
          file.path ===
          "evals/simulations/generated-example/manifest.json",
      ),
    ).toBe(true);
    expect(
      files.some(
        (file) =>
          file.path ===
            "evals/simulations/generated-example/simulation-design.md" &&
          file.format === "text",
      ),
    ).toBe(true);
    expect(
      files.some(
        (file) =>
          file.path === "evals/campaigns/generated-example-smoke.json",
      ),
    ).toBe(true);
    const campaign = files.find(
      (file) => file.path === "evals/campaigns/generated-example-smoke.json",
    )!.content as { id: string };
    const policy = files.find(
      (file) =>
        file.path ===
        "evals/policies/generated-example-allow-state-actions-v1.json",
    )!.content as { scope: { campaign_ids: string[] } };
    expect(policy.scope.campaign_ids).toEqual([campaign.id]);
    const design = files.find(
      (file) =>
        file.path ===
        "evals/simulations/generated-example/simulation-design.md",
    )!.content as string;
    expect(design).toContain(
      "distinct reserved role sessions are required",
    );
    expect(design).toContain("no-secrets-v1 or source-code-v1");
    expect(design).toContain("campaign verify");
    expect(stableJson(files)).not.toContain("{{");
  });

  test("renders deterministic content for the same inputs", async () => {
    const options = {
      simulationId: "deterministic-example",
      ownerLane: "W-123",
      referenceDate: "2026-07-30",
    };
    expect(stableJson(await renderStarterPackage(options))).toBe(
      stableJson(await renderStarterPackage(options)),
    );
  });

  test("rejects unsafe IDs, lanes, titles, and dates", async () => {
    await expect(
      renderStarterPackage({
        simulationId: "../escape",
        ownerLane: "W-123",
      }),
    ).rejects.toBeInstanceOf(CascadeError);
    await expect(
      renderStarterPackage({
        simulationId: "safe-id",
        ownerLane: "lane-1",
      }),
    ).rejects.toBeInstanceOf(CascadeError);
    await expect(
      renderStarterPackage({
        simulationId: "safe-id",
        ownerLane: "W-123",
        title: "{{BROKEN}}",
      }),
    ).rejects.toBeInstanceOf(CascadeError);
    await expect(
      renderStarterPackage({
        simulationId: "safe-id",
        ownerLane: "W-123",
        referenceDate: "2026-02-30",
      }),
    ).rejects.toBeInstanceOf(CascadeError);
  });
});
