import { describe, expect, test } from "bun:test";
import { parseArgs } from "./common";
import { sectionMatches } from "./patterns";

describe("section-scoped literal pattern search", () => {
  test("matches only current section metadata, with exact section and tag filters", () => {
    const identity = { id: "source-identity", title: "Source identity", tags: ["identity"] };
    const sibling = { id: "retention", title: "Retention", summary: "Keep durable evidence" };
    const query = parseArgs(["--query", "source-identity"]);
    expect(sectionMatches(identity, query)).toBe(true);
    expect(sectionMatches(sibling, query)).toBe(false);
    expect(sectionMatches(identity, parseArgs(["--query", "SOURCE", "--section", "retention"]))).toBe(false);
    expect(sectionMatches(identity, parseArgs(["--tag", "identity", "--query", "source"]))).toBe(true);
    expect(sectionMatches(identity, parseArgs(["--tag", "retention"]))).toBe(false);
  });
});
