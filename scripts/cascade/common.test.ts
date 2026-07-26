import { describe, expect, test } from "bun:test";

import {
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

  test("arguments retain repeated flags and positionals", () => {
    const parsed = parseArgs([
      "run",
      "--skill",
      "context",
      "--skill=plan-change",
      "--runtime",
    ]);
    expect(parsed.positionals).toEqual(["run"]);
    expect(flags(parsed, "skill")).toEqual(["context", "plan-change"]);
    expect(flag(parsed, "runtime")).toBe("true");
  });

  test("frontmatter parsing is bounded to the leading block", () => {
    expect(
      parseFrontmatter('---\nname: example\ndescription: "Useful example"\n---\n# Body'),
    ).toEqual({ name: "example", description: "Useful example" });
    expect(parseFrontmatter("# No frontmatter")).toEqual({});
  });
});
