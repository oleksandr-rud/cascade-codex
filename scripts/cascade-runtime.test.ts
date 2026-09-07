import { describe, expect, test } from "bun:test";

import {
  coreRuntimeHelpText,
  executeCoreRuntime,
} from "./cascade-runtime";

describe("Cascade core target runtime", () => {
  test("exposes host adapters without eval or simulation lab commands", async () => {
    const lines: string[] = [];
    expect(
      await executeCoreRuntime(["--help"], {
        writeLine: (line) => lines.push(line),
      }),
    ).toBe(0);
    expect(lines).toEqual([coreRuntimeHelpText()]);
    expect(lines[0]).toContain("workflow <validate-selection|validate-plan>");
    expect(lines[0]).not.toContain("campaign run");
    expect(lines[0]).not.toContain("eval self-test");
  });

  test("loads only the selected core adapter", async () => {
    const calls: string[][] = [];
    expect(
      await executeCoreRuntime(["work", "audit", "--json"], {
        loaders: {
          work: async () => ({
            main: async (args) => {
              calls.push(args);
              return 3;
            },
          }),
        },
      }),
    ).toBe(3);
    expect(calls).toEqual([["audit", "--json"]]);
  });

  test("fails closed for source-only and unknown commands", async () => {
    await expect(executeCoreRuntime(["admission", "corpus"])).rejects.toThrow(
      "source-checkout-only",
    );
    await expect(executeCoreRuntime(["eval", "self-test"])).rejects.toThrow(
      "not available in the core target runtime",
    );
  });
});
