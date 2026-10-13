import assert from "node:assert/strict";
import { mechanicalGrade } from "./mechanical-grade.mjs";

const contract = { mechanical_type: "text_contract", required_headings: ["Findings", "Evidence"] };
for (const output of ["Findings\nEvidence\nReject the claim: process-local mutex is sufficient.", "Findings\nEvidence\nA process-local mutex is sufficient.", "Findings\nEvidence\nЦю тезу потрібно спростувати."]) {
  assert.equal(mechanicalGrade(output, contract).eligible, true);
}
assert.equal(mechanicalGrade("Discuss Findings and Evidence in a paragraph.", contract).eligible, false);
assert.throws(() => mechanicalGrade("anything", { ...contract, forbidden_patterns: ["mutex"] }), /Semantic phrase gates are unsupported/);
assert.equal(mechanicalGrade('{"total":2}', { mechanical_type: "exact_json", exact_keys: ["total"], expected: { total: 2 } }).eligible, true);
assert.equal(mechanicalGrade('{"total":3}', { mechanical_type: "exact_json", exact_keys: ["total"], expected: { total: 2 } }).eligible, false);
for (const value of ["null", "[]", "true", "2", '"text"']) {
  assert.equal(mechanicalGrade(value, { mechanical_type: "exact_json", exact_keys: ["total"], expected: { total: 2 } }).eligible, false);
}
console.log("PASS: literal formatting and exact JSON gates do not grade meaning or negation");
