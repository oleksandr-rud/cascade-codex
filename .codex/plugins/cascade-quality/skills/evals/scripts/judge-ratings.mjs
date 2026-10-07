// Shared scoring contract for prompt and host harness response adapters.
export function scoreRatings({ dimensions, ratings, threshold, minimumDimension, weightTotal = 100 }) {
  if (!Array.isArray(dimensions) || !dimensions.length ||
      !Number.isFinite(threshold) || threshold < 0 || threshold > 1 ||
      !Number.isInteger(minimumDimension) || minimumDimension < 0 || minimumDimension > 4 ||
      !Number.isFinite(weightTotal) || weightTotal <= 0 ||
      dimensions.some((item) => !item || typeof item.id !== "string" || !item.id || !Number.isFinite(item.weight) || item.weight <= 0) ||
      new Set(dimensions.map((item) => item.id)).size !== dimensions.length ||
      Math.abs(dimensions.reduce((sum, item) => sum + item.weight, 0) - weightTotal) > 1e-9) {
    return { valid: false, error: "invalid scoring profile" };
  }
  const ids = new Set(dimensions.map((item) => item.id));
  if (!Array.isArray(ratings) || ratings.length !== ids.size ||
      ratings.some((item) => !item || !ids.has(item.id) || !Number.isInteger(item.score) || item.score < 0 || item.score > 4) ||
      new Set(ratings.map((item) => item.id)).size !== ids.size) {
    return { valid: false, error: "invalid or incomplete dimension ratings" };
  }
  const byId = new Map(ratings.map((item) => [item.id, item.score]));
  const score = dimensions.reduce((sum, item) => sum + item.weight * byId.get(item.id) / 4, 0) / weightTotal;
  const minimum = Math.min(...ratings.map((item) => item.score));
  const floorPassed = minimum >= minimumDimension;
  return { valid: true, score, minimum_dimension_score: minimum, floor_passed: floorPassed, verdict: score >= threshold && floorPassed ? "PASS" : "FAIL" };
}
