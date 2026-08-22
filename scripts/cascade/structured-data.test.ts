import { describe, expect, test } from "bun:test";

import { CascadeError } from "./common";
import { parseStrictYaml, parseStructuredText, stringifyYaml } from "./structured-data";

describe("strict structured data", () => {
  test("parses a JSON-compatible YAML document", () => {
    expect(parseStrictYaml("name: policy\nenabled: true\nitems:\n  - one\n  - two\n")).toEqual({
      name: "policy",
      enabled: true,
      items: ["one", "two"],
    });
  });

  test.each([
    ["duplicate keys", "id: one\nid: two\n", "Map keys must be unique"],
    ["aliases", "base: &base\n  enabled: true\ncopy: *base\n", "anchors are not allowed"],
    ["merge keys", "base: &base\n  enabled: true\ncopy:\n  <<: *base\n", "anchors are not allowed"],
    ["non-string keys", "? [one, two]\n: value\n", "all keys must be strings"],
    ["explicit tags", "created: !!str 2026-08-21\n", "explicit tags are not allowed"],
  ])("rejects %s", (_name, source, expected) => {
    expect(() => parseStrictYaml(source, "policy.yaml")).toThrow(expected);
  });

  test("parses JSON through the same compatibility boundary", () => {
    expect(parseStructuredText('{"id":"one"}', ".json", "policy.json")).toEqual({ id: "one" });
    expect(() => parseStructuredText('{"id":NaN}', ".json", "policy.json")).toThrow(CascadeError);
  });

  test("stringifies mappings deterministically", () => {
    expect(stringifyYaml({ z: 1, a: { d: 4, b: 2 } })).toBe("a:\n  b: 2\n  d: 4\nz: 1\n");
  });
});
