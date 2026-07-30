import { describe, expect, test } from "bun:test";

import {
  CascadeError,
  boundedPath,
  flag,
  flags,
  parseArgs,
  parseFrontmatter,
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
    expect(boundedPath("evals/harness", "evals/")).toContain("evals/harness");
  });

  test("frontmatter parsing is bounded to the leading block", () => {
    expect(
      parseFrontmatter('---\nname: example\ndescription: "Useful example"\n---\n# Body'),
    ).toEqual({ name: "example", description: "Useful example" });
    expect(parseFrontmatter("# No frontmatter")).toEqual({});
  });
});
