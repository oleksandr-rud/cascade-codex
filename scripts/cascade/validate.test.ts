import { describe, expect, test } from "bun:test";

import {
  type WorkGraphDocument,
  validateWorkGraphDocuments,
} from "./validate";

function document(path: string, text: string): WorkGraphDocument {
  return { path, text };
}

const validGraph = document(
  "docs/work/reports/2026-07-30-example-work-graph.md",
  `# Example Work Graph

Status: \`PLANNED\`
Work Graph ID: \`WG-001\`
Work Graph Revision: \`1\`
Terminal Gate: \`WG-001-GA\`

## Node Registry

| Node | Workline | Outcome |
|---|---|---|
| \`WG-001-N01\` | W-001 | bounded result |

## Gate Contracts

### WG-001-GA

Requires \`WG-001-N01\`.
`,
);

describe("work-graph validation", () => {
  test("accepts canonical graph-scoped IDs and resolved work references", () => {
    const workDocs = [
      validGraph,
      document(
        "docs/work/active.md",
        "Active graph `WG-001`; next node `WG-001-N01`; terminal `WG-001-GA`.",
      ),
    ];

    expect(validateWorkGraphDocuments([validGraph], workDocs)).toEqual([]);
  });

  test("rejects legacy terminology, legacy IDs, and malformed WG references", () => {
    const invalid = document(
      "docs/work/reports/2026-07-30-invalid-work-graph.md",
      `# Example Implementation Graph

Work Graph ID: \`IG-001\`
Terminal Gate: \`WG-01-GA\`

## Node Registry

| Node | Workline |
|---|---|
| \`IG-01\` | W-001 |

## Gate Contracts

### WG-01-GA
`,
    );

    const errors = validateWorkGraphDocuments([invalid], [invalid]);
    expect(errors.some((error) => error.includes("legacy implementation-graph terminology"))).toBe(
      true,
    );
    expect(errors.some((error) => error.includes("legacy work-graph id"))).toBe(true);
    expect(errors.some((error) => error.includes("invalid work-graph id shape"))).toBe(true);
    expect(errors.some((error) => error.includes("invalid Work Graph ID"))).toBe(true);
  });

  test("rejects duplicate graph IDs", () => {
    const duplicate = document(
      "docs/work/reports/2026-07-31-duplicate-work-graph.md",
      validGraph.text,
    );
    const errors = validateWorkGraphDocuments(
      [validGraph, duplicate],
      [validGraph, duplicate],
    );

    expect(errors.some((error) => error.includes("duplicate Work Graph ID WG-001"))).toBe(true);
  });

  test("rejects duplicate gate definitions", () => {
    const duplicateGate = document(
      validGraph.path,
      `${validGraph.text}

### WG-001-GA

Duplicate gate definition.
`,
    );
    const errors = validateWorkGraphDocuments([duplicateGate], [duplicateGate]);

    expect(errors.some((error) => error.includes("duplicate Gate Contracts ID"))).toBe(true);
  });

  test("rejects noncanonical report paths and dangling scoped references", () => {
    const misnamed = document(
      "docs/work/reports/2026-07-30-example.md",
      validGraph.text,
    );
    const dangling = document(
      "docs/work/active.md",
      "Active graph `WG-001`; missing node `WG-001-N99`.",
    );
    const errors = validateWorkGraphDocuments(
      [misnamed],
      [misnamed, dangling],
    );

    expect(errors.some((error) => error.includes("invalid work-graph report path"))).toBe(true);
    expect(errors.some((error) => error.includes("unknown work-graph node/gate reference"))).toBe(
      true,
    );
  });
});
