import { readFile } from "node:fs/promises";

export const MODEL_POLICY_URL = new URL("../../evaluate/references/model-policy.json", import.meta.url);
export const modelPolicy = JSON.parse(await readFile(MODEL_POLICY_URL, "utf8"));
export const evaluationDefaults = modelPolicy.defaults;
if (modelPolicy.schema_version !== 1 || !evaluationDefaults ||
    ["builder", "target", "judge"].some(role => typeof evaluationDefaults[`${role}_model`] !== "string" || !evaluationDefaults[`${role}_model`] || typeof evaluationDefaults[`${role}_reasoning_effort`] !== "string")) {
  throw new Error("invalid shared evaluation model policy");
}
