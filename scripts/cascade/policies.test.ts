import { describe, expect, test } from "bun:test";

import { rootPath } from "./common";
import { compilePolicyComposition, loadProductPolicyRegistry } from "./policies";

function policyCommand(...args: string[]): { exitCode: number; stdout: string; stderr: string } {
  const result = Bun.spawnSync([
    process.execPath,
    rootPath("scripts/cascade.ts"),
    "policy",
    ...args,
  ], { cwd: rootPath() });
  return {
    exitCode: result.exitCode,
    stdout: new TextDecoder().decode(result.stdout),
    stderr: new TextDecoder().decode(result.stderr),
  };
}

describe("policy tooling", () => {
  test("validates both authored policy registries through the public CLI", () => {
    const result = policyCommand("validate");
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    const output = JSON.parse(result.stdout) as Record<string, any>;
    expect(output.status).toBe("PASS");
    expect(output.admission.policy_count).toBe(13);
    expect(output.admission.control_count).toBe(10);
    expect(output.product.policy_count).toBe(19);
  });

  test("extracts a normalized lean admission policy", () => {
    const result = policyCommand("extract", "--id", "TAP-001");
    expect(result.exitCode).toBe(0);
    const output = JSON.parse(result.stdout) as Record<string, any>;
    expect(output.source_file).toEndWith("core.yaml");
    expect(output.policy.match_any).toEqual([]);
    expect(output.policy.minimum_route).toBeNull();
  });

  test("compiles a deterministic cross-registry composition", async () => {
    const first = await compilePolicyComposition();
    const second = await compilePolicyComposition();
    expect(first).toEqual(second);
    expect(first.digest).toMatch(/^[a-f0-9]{64}$/);
    expect(first.admission.bundle.policies).toHaveLength(13);
    expect(first.product_evals.policies).toHaveLength(19);
  });

  test("requires YAML filenames to match product policy IDs", async () => {
    const policies = await loadProductPolicyRegistry();
    expect(policies.every((entry) => entry.source_file.endsWith(`${entry.policy.id}.yaml`))).toBe(true);
  });

  test("supports compile check without writing an artifact", () => {
    const result = policyCommand("compile", "--check");
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toMatch(/^policy_compile_status=PASS scope=all digest=[a-f0-9]{64}\n$/);
  });
});
