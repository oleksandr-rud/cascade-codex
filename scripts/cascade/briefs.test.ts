import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import {
  loadAndValidateProductCatalog,
  mergeProductOwnerTables,
  resolveBrief,
  validateCatalogShape,
} from "./briefs";
import { rootPath } from "./common";
import { parseStrictYaml } from "./structured-data";

function catalog(): any {
  return parseStrictYaml(readFileSync(rootPath("docs/product/catalog.yaml"), "utf8"), "test catalog");
}

const table = (id: string, heading = "Requirement") =>
  `| ID | ${heading} |\n|---|---|\n| ${id} | bounded behavior |\n`;

describe("product owner documents", () => {
  test("actual contour catalog resolves all retained product identities", async () => {
    const value = await loadAndValidateProductCatalog();
    expect(value.capabilities.map((item) => item.id)).toEqual(["PC-001", "PC-002", "PC-003"]);
    expect(value.reference_documents!.requirements).toEqual([
      "docs/product/contours/context-and-simulation/requirements.md",
    ]);
  });

  test("existing flat catalogs retain their absent optional path map", () => {
    const value = catalog();
    delete value.reference_documents;
    expect(validateCatalogShape(value).reference_documents).toBeUndefined();
  });

  test("explicit model and feature owners need no forced domain folder", () => {
    const value = catalog();
    value.reference_documents = {
      requirements: ["docs/product/models/value/requirements.md", "docs/product/features/flow/requirements.md"],
      journeys: [], scenarios: [],
    };
    expect(validateCatalogShape(value).reference_documents).toEqual(value.reference_documents);
  });

  test("rejects escaping, noncanonical and non-product owner paths", () => {
    for (const path of ["docs/product/../../outside.md", "docs/product//unit.md", "docs/product/./unit.md", "docs/product/unit\\file.md", "docs/specs/unit.md", "/tmp/unit.md"]) {
      const value = catalog();
      value.reference_documents.requirements = [path];
      expect(() => validateCatalogShape(value)).toThrow("invalid product owner document path");
    }
  });

  test("one owner selection cannot silently include a document twice", () => {
    const value = catalog();
    value.reference_documents.requirements.push(value.reference_documents.requirements[0]);
    expect(() => validateCatalogShape(value)).toThrow("duplicate product owner document path");
  });

  test("a small unit can keep three distinct owner tables in one document", () => {
    const value = catalog();
    value.reference_documents = Object.fromEntries(["requirements", "journeys", "scenarios"].map((kind) => [kind, ["docs/product/unit.md"]]));
    expect(validateCatalogShape(value).reference_documents).toEqual(value.reference_documents);
    const content = table("PR-001") + "\n" + table("J-001", "Journey") + "\n" + table("PS-001", "Scenario");
    for (const pattern of [/^PR-\d{3}$/, /^J-\d{3}$/, /^PS-\d{3}$/]) {
      expect(mergeProductOwnerTables([{ path: "docs/product/unit.md", content }], pattern, "owners").rows).toHaveLength(1);
    }
  });

  test("joins unit ledgers with stable global identities and source paths", () => {
    const merged = mergeProductOwnerTables([
      { path: "unit-a.md", content: table("PR-001") },
      { path: "unit-b.md", content: table("PR-002") },
    ], /^PR-\d{3}$/, "requirements");
    expect(merged.rows.map((row) => row[0])).toEqual(["PR-001", "PR-002"]);
    expect(merged.rowSources).toEqual({ "PR-001": "unit-a.md", "PR-002": "unit-b.md" });
  });

  test("duplicate IDs across units fail before row selection", () => {
    expect(() => mergeProductOwnerTables([
      { path: "unit-a.md", content: table("PR-001") },
      { path: "unit-b.md", content: table("PR-001") },
    ], /^PR-\d{3}$/, "requirements")).toThrow("duplicate requirements owner row ID");
  });

  test("incompatible columns and malformed owner rows fail closed", () => {
    expect(() => mergeProductOwnerTables([
      { path: "a.md", content: table("PR-001") },
      { path: "b.md", content: table("PR-002", "Different column") },
    ], /^PR-\d{3}$/, "requirements")).toThrow("owner table columns differ");
    expect(() => mergeProductOwnerTables([
      { path: "a.md", content: table("PR-001") + "| WRONG | unrelated row |\n" },
    ], /^PR-\d{3}$/, "requirements")).toThrow("invalid requirements owner row ID");
  });

  test("a non-applicable owner kind can contain no documents", () => {
    expect(mergeProductOwnerTables([], /^J-\d{3}$/, "journeys").rows).toEqual([]);
  });

  test("brief binds exact selected owner documents including journey narrative", async () => {
    const resolved = await resolveBrief("PB-002");
    const paths = resolved.sourceDigests.map((item) => item.path);
    for (const kind of ["requirements", "journeys", "scenarios"]) {
      expect(paths).toContain(`docs/product/contours/context-and-simulation/${kind}.md`);
    }
    expect(new Set(paths).size).toBe(paths.length);
  });
});
