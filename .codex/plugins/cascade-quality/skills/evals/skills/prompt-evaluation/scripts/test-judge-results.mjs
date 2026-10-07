import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";
import { parseJudgeResponse } from "./judge-results.mjs";

for (const [identityKey, profileFile] of [["task_id", "trajectory-v1.json"], ["task_id", "outcome-v1.json"], ["fixture_id", "interview-v1.json"]]) {
  const profile = JSON.parse(await readFile(new URL(`../evals/judges/${profileFile}`, import.meta.url), "utf8"));
  const identity = { [identityKey]: "case-v1", run_id: "run-v1" };
  const response = () => ({
    profile_id: profile.profile_id, rubric_version: 1, ...identity,
    ratings: profile.dimensions.map(({ id }) => ({ dimension_id: id, rating: 4, rationale: "Observed outcome", evidence: ["event:1"] })),
    verdict: "PASS", missing_evidence: []
  });
  const parse = (value, expectedProfile = profile) => parseJudgeResponse(JSON.stringify(value), expectedProfile, identity);

  describe(profile.profile_id, () => {
    it("preserves valid response fields and accepts the existing JSON fence", () => {
      const value = response();
      const expected = { valid: true, score: 1, floor_passed: true, harness_verdict: "PASS", response: value };
      assert.deepEqual(parse(value), expected);
      assert.deepEqual(parseJudgeResponse(`\`\`\`json\n${JSON.stringify(value)}\n\`\`\``, profile, identity), expected);
      value.ratings.reverse();
      assert.equal(parse(value).score, 1);
    });

    it("rejects FAIL with passing scores instead of promoting it to PASS", () => {
      const value = response();
      value.verdict = "FAIL";
      const result = parse(value);
      assert.equal(result.valid, false);
      assert.match(result.error, /verdict disagrees/);
    });

    it("rejects PASS below threshold and accepts a consistent FAIL", () => {
      const value = response();
      value.ratings.forEach((rating) => { rating.rating = 3; });
      assert.equal(parse(value).valid, false);
      value.verdict = "FAIL";
      const result = parse(value);
      assert.equal(result.valid, true);
      assert.equal(result.score, 0.75);
      assert.equal(result.harness_verdict, "FAIL");
    });

    it("enforces dimension floors even when the weighted score passes", () => {
      const value = response();
      const smallest = [...profile.dimensions].sort((left, right) => left.weight - right.weight)[0];
      value.ratings.find((rating) => rating.dimension_id === smallest.id).rating = 1;
      assert.equal(parse(value).valid, false);
      value.verdict = "FAIL";
      const result = parse(value);
      assert.equal(result.valid, true);
      assert.ok(result.score >= profile.threshold);
      assert.equal(result.floor_passed, false);
      assert.equal(result.harness_verdict, "FAIL");
    });

    it("keeps a valid BLOCKED response non-accepting", () => {
      const value = response();
      value.verdict = "BLOCKED";
      value.missing_evidence = ["Required observation unavailable"];
      assert.equal(parse(value).valid, true);
      assert.equal(parse(value).harness_verdict, "FAIL");
      assert.equal(parse(value).response.verdict, "BLOCKED");
    });

    for (const [name, change] of [
      ["stale case", (value) => { value[identityKey] = "other-case"; }],
      ["stale run", (value) => { value.run_id = "other-run"; }],
      ["stale profile", (value) => { value.profile_id = "other-profile"; }],
      ["stale rubric", (value) => { value.rubric_version = 2; }],
      ["unknown top-level field", (value) => { value.computed_score = 1; }],
      ["missing dimension", (value) => { value.ratings.pop(); }],
      ["duplicate dimension", (value) => { value.ratings[1] = value.ratings[0]; }],
      ["unknown dimension", (value) => { value.ratings[0].dimension_id = "unknown"; }],
      ["fractional rating", (value) => { value.ratings[0].rating = 3.5; }],
      ["out-of-range rating", (value) => { value.ratings[0].rating = 5; }],
      ["boolean rating", (value) => { value.ratings[0].rating = true; }],
      ["null ratings", (value) => { value.ratings = null; }],
      ["object ratings", (value) => { value.ratings = {}; }],
      ["null rating", (value) => { value.ratings[0] = null; }],
      ["empty rationale", (value) => { value.ratings[0].rationale = ""; }],
      ["invalid evidence", (value) => { value.ratings[0].evidence = [null]; }],
      ["unknown rating field", (value) => { value.ratings[0].total = 100; }],
      ["invalid missing evidence", (value) => { value.missing_evidence = [null]; }]
    ]) {
      it(`rejects ${name} without throwing`, () => {
        const value = response();
        change(value);
        assert.equal(parse(value).valid, false);
      });
    }

    it("rejects malformed JSON and non-object responses without throwing", () => {
      for (const text of ["not JSON", "null", "[]", '"text"', "42"]) {
        assert.equal(parseJudgeResponse(text, profile, identity).valid, false);
      }
    });

    it("rejects invalid profile arithmetic", () => {
      const invalid = structuredClone(profile);
      invalid.dimensions[0].weight = "35";
      assert.equal(parse(response(), invalid).valid, false);
      invalid.dimensions[0].weight = 101;
      assert.equal(parse(response(), invalid).valid, false);
      assert.equal(parse(response(), { ...profile, threshold: null }).valid, false);
    });
  });
}
