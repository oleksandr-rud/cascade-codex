import { describe, expect, test } from "bun:test";

import {
  cascadeHelpText,
  executeCascadeCommand,
  type CascadeCommandLoader,
} from "./command-dispatcher";

describe("Cascade command dispatcher", () => {
  test("renders help without loading a command module", async () => {
    const lines: string[] = [];
    let loaded = false;
    const loader: CascadeCommandLoader = async () => {
      loaded = true;
      return { main: async () => 0 };
    };

    expect(await executeCascadeCommand(
      { argv: ["--help"] },
      { loaders: { campaign: loader }, writeLine: (value) => lines.push(value) },
    )).toBe(0);
    expect(loaded).toBe(false);
    expect(lines).toEqual([cascadeHelpText()]);
  });

  test("loads only the selected asynchronous command", async () => {
    const calls: string[][] = [];
    const loader: CascadeCommandLoader = async () => ({
      main: async (args) => {
        await Promise.resolve();
        calls.push(args);
        return 7;
      },
    });

    expect(await executeCascadeCommand(
      { argv: ["campaign", "verify", "run-1"] },
      { loaders: { campaign: loader } },
    )).toBe(7);
    expect(calls).toEqual([["verify", "run-1"]]);
  });

  test("rejects an unknown command without loading a module", async () => {
    await expect(executeCascadeCommand({ argv: ["unknown"] })).rejects.toThrow(
      "unknown command: unknown",
    );
  });
});
