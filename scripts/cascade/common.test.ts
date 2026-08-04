import { describe, expect, test } from "bun:test";

import {
  CascadeError,
  boundedPath,
  flag,
  flags,
  parseArgs,
  parseFrontmatter,
  runCommand,
  stableJson,
  valueDigest,
} from "./common";

describe("Cascade common tooling", () => {
  test("stable JSON and digest ignore object key order", () => {
    expect(stableJson({ b: 2, a: { d: 4, c: 3 } })).toBe(
      '{"a":{"c":3,"d":4},"b":2}',
    );
    expect(valueDigest({ b: 2, a: 1 })).toBe(valueDigest({ a: 1, b: 2 }));
  });

  test("arguments retain flags and positionals", () => {
    const parsed = parseArgs(["run", "--run-id", "r-1", "--check"]);
    expect(parsed.positionals).toEqual(["run"]);
    expect(flag(parsed, "run-id")).toBe("r-1");
    expect(flag(parsed, "check")).toBe("true");
  });

  test("arguments retain repeated flags", () => {
    const parsed = parseArgs([
      "run",
      "--skill",
      "context",
      "--skill=plan-change",
      "--runtime",
    ]);
    expect(flags(parsed, "skill")).toEqual(["context", "plan-change"]);
    expect(flag(parsed, "runtime")).toBe("true");
  });

  test("bounded paths reject traversal", () => {
    expect(() => boundedPath("../../outside")).toThrow(CascadeError);
    expect(
      boundedPath("product-evals/campaigns", "product-evals/"),
    ).toContain("product-evals/campaigns");
  });

  test("frontmatter parsing is bounded to the leading block", () => {
    expect(
      parseFrontmatter('---\nname: example\ndescription: "Useful example"\n---\n# Body'),
    ).toEqual({ name: "example", description: "Useful example" });
    expect(parseFrontmatter("# No frontmatter")).toEqual({});
  });

  test("command execution observes abort signals and reports cancellation", async () => {
    const controller = new AbortController();
    const pending = runCommand(
      [process.execPath, "-e", "await Bun.sleep(10_000)"],
      { signal: controller.signal },
    );
    setTimeout(() => controller.abort(), 20);

    const result = await pending;
    expect(result.aborted).toBe(true);
    expect(result.timedOut).toBe(false);
    expect(result.exitCode).toBe(130);
  });

  test("command timeout force-terminates a process that ignores SIGTERM", async () => {
    const result = await runCommand(
      [
        process.execPath,
        "-e",
        'process.on("SIGTERM", () => {}); await Bun.sleep(10_000)',
      ],
      { timeoutMs: 100, terminationGraceMs: 20 },
    );

    expect(result.timedOut).toBe(true);
    expect(result.aborted).toBe(false);
    expect(result.exitCode).toBe(124);
    expect(result.durationMs).toBeLessThan(2_000);
  });

  test("command output limits terminate before buffering unbounded output", async () => {
    const result = await runCommand(
      [
        process.execPath,
        "-e",
        'for (let index = 0; index < 10000; index += 1) console.log("0123456789")',
      ],
      { maxOutputBytes: 128, terminationGraceMs: 20 },
    );

    expect(result.outputLimitExceeded).toBe(true);
    expect(
      Buffer.byteLength(result.stdout) + Buffer.byteLength(result.stderr),
    ).toBeLessThanOrEqual(128);
  });

  test("command execution can omit authority secrets from child environments", async () => {
    const variable = "CASCADE_TEST_CHILD_SECRET";
    process.env[variable] = "standalone-confirmation-secret";
    try {
      const result = await runCommand(
        [
          process.execPath,
          "-e",
          `process.stdout.write(process.env.${variable} ?? "absent")`,
        ],
        { unsetEnv: [variable] },
      );
      expect(result.stdout).toBe("absent");
    } finally {
      delete process.env[variable];
    }
  });
});
