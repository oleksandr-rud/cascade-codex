import { scoreRatings } from "../../../scripts/judge-ratings.mjs";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

export const JUDGE_VALIDATOR_SHA256 = createHash("sha256")
  .update(readFileSync(new URL(import.meta.url)))
  .update("\n--scoring--\n")
  .update(readFileSync(new URL("../../../scripts/judge-ratings.mjs", import.meta.url)))
  .digest("hex");

function object(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exactKeys(value, keys) {
  return object(value) && JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...keys].sort());
}

export function parseJudgeResponse(text, profile, identity) {
  let response;
  try {
    const trimmed = text.trim();
    const fence = trimmed.match(/^```(?:json)?\s*\r?\n([\s\S]*?)\r?\n```$/i);
    response = JSON.parse(fence ? fence[1].trim() : trimmed);
  } catch (error) {
    return { valid: false, error: `invalid judge JSON: ${error.message}` };
  }

  const validProfile = typeof profile?.profile_id === "string" && profile.profile_id.length > 0;
  const validIdentity = (exactKeys(identity, ["task_id", "run_id"]) || exactKeys(identity, ["fixture_id", "run_id"])) &&
    Object.values(identity).every((value) => typeof value === "string" && value.length > 0);
  if (!validProfile || !validIdentity) return { valid: false, error: "invalid judge profile or expected identity", response };

  const ratings = response?.ratings;
  const valid = exactKeys(response, ["missing_evidence", "profile_id", "ratings", "rubric_version", "verdict", ...Object.keys(identity)]) &&
    response.profile_id === profile.profile_id && response.rubric_version === 1 &&
    Object.entries(identity).every(([key, value]) => response[key] === value) &&
    ["PASS", "FAIL", "BLOCKED"].includes(response.verdict) &&
    Array.isArray(response.missing_evidence) && response.missing_evidence.every((value) => typeof value === "string") &&
    Array.isArray(ratings) &&
    ratings.every((rating) => exactKeys(rating, ["dimension_id", "rating", "rationale", "evidence"]) &&
      typeof rating.rationale === "string" && rating.rationale.length > 0 &&
      Array.isArray(rating.evidence) && rating.evidence.every((value) => typeof value === "string" && value.length > 0));
  if (!valid) return { valid: false, error: "judge response violates the bound profile or response contract", response };

  const scored = scoreRatings({ dimensions: profile.dimensions, ratings: ratings.map((rating) => ({ id: rating.dimension_id, score: rating.rating })), threshold: profile.threshold, minimumDimension: profile.minimum_dimension_rating });
  if (!scored.valid) return { valid: false, error: scored.error, response };
  const { score, floor_passed: floorPassed, verdict: computedVerdict } = scored;
  if (response.verdict !== "BLOCKED" && response.verdict !== computedVerdict) {
    return { valid: false, error: "judge verdict disagrees with recomputed score or dimension floor", response };
  }
  return { valid: true, score, floor_passed: floorPassed, harness_verdict: response.verdict === "BLOCKED" ? "FAIL" : computedVerdict, response };
}
