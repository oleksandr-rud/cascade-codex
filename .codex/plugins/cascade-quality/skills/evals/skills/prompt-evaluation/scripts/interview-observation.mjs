import { createHash } from "node:crypto";

export const interviewObservationVersion = "cascade-interview-observation-v1";
export const responseDigest = text => createHash("sha256").update(text).digest("hex");

export function interviewInspectionRequest({ response, fixtureId, turn, intentDefinitions, expected }) {
  const obligations = [
    ...(expected.required_response_patterns ?? expected.required_patterns ?? []).map((text, index) => ({ id: `required:${index}`, relation: "REQUIRED", text })),
    ...(expected.required_response_pattern_groups ?? []).map((texts, index) => ({ id: `required-any:${index}`, relation: "REQUIRED_ALTERNATIVE", texts })),
    ...(expected.forbidden_response_patterns ?? expected.forbidden_patterns ?? []).map((text, index) => ({ id: `forbidden:${index}`, relation: "FORBIDDEN", text })),
  ];
  return {
    artifact_type: "cascade-interview-inspection-request", schema_version: 1,
    fixture_id: fixtureId, turn, response_sha256: responseDigest(response), response,
    intent_definitions: intentDefinitions, obligations,
    instruction: "Interpret the supplied response with an LLM. Return JSON only: schema_version=1, artifact_type=cascade-interview-observation, fixture_id, turn, response_sha256, resolution (RESOLVED or UNRESOLVED), state (READY, NEEDS_INPUT, BLOCKED or INVALID), final_prompt (verbatim string or null), questions (each with verbatim text and intents from the defined keys), obligations (each supplied id with verdict PASS, FAIL or UNRESOLVED), uncertainty (array). READY means a usable final prompt is offered; NEEDS_INPUT asks for material missing decisions; BLOCKED declares a hard unresolved constraint; INVALID means no interpretable interview state. Interpret questions and intentions semantically, including negation and paraphrases. Defaults and rhetorical questions are not requests for answers. Do not guess from keywords or copy requested obligations as fulfilled. For turn=target, assess only the supplied semantic obligations, set state=INVALID, final_prompt=null and questions=[] because this is target output, not an interview. Do not see or infer expected state, question counts or required intents. Missing material meaning is UNRESOLVED. This observation is not an independent quality verdict or permission.",
  };
}

export function parseInterviewObservation(text, request) {
  const value = JSON.parse(text);
  const keys = ["schema_version", "artifact_type", "fixture_id", "turn", "response_sha256", "resolution", "state", "final_prompt", "questions", "obligations", "uncertainty"];
  if (!value || typeof value !== "object" || Array.isArray(value) || keys.some(key => !Object.hasOwn(value, key)) || Object.keys(value).some(key => !keys.includes(key))) throw new Error("invalid interview observation fields");
  if (value.schema_version !== 1 || value.artifact_type !== "cascade-interview-observation" || value.fixture_id !== request.fixture_id || value.turn !== request.turn || value.response_sha256 !== request.response_sha256) throw new Error("interview observation binding mismatch");
  if (!["RESOLVED", "UNRESOLVED"].includes(value.resolution) || !["READY", "NEEDS_INPUT", "BLOCKED", "INVALID"].includes(value.state)) throw new Error("invalid declared interview state");
  if (!Array.isArray(value.uncertainty) || value.uncertainty.length > 16 || value.uncertainty.some(item => typeof item !== "string")) throw new Error("invalid interview uncertainty");
  if (value.final_prompt !== null && (typeof value.final_prompt !== "string" || !value.final_prompt || !request.response.includes(value.final_prompt))) throw new Error("final prompt is not an exact source quotation");
  if (!Array.isArray(value.questions) || value.questions.length > 32) throw new Error("invalid question collection");
  const intents = new Set(Object.keys(request.intent_definitions));
  for (const question of value.questions) {
    if (!question || Object.keys(question).some(key => !["text", "intents"].includes(key)) || typeof question.text !== "string" || !question.text || !request.response.includes(question.text) || !Array.isArray(question.intents) || question.intents.some(intent => !intents.has(intent)) || new Set(question.intents).size !== question.intents.length) throw new Error("invalid declared question or source quotation");
  }
  if (!Array.isArray(value.obligations) || value.obligations.length !== request.obligations.length) throw new Error("incomplete declared response obligations");
  const expectedIds = new Set(request.obligations.map(item => item.id));
  const seen = new Set();
  for (const item of value.obligations) {
    if (!item || Object.keys(item).some(key => !["id", "verdict"].includes(key)) || !expectedIds.has(item.id) || seen.has(item.id) || !["PASS", "FAIL", "UNRESOLVED"].includes(item.verdict)) throw new Error("invalid declared response obligation");
    seen.add(item.id);
  }
  return value;
}

export function unresolvedInterviewObservation(request, reason) {
  return { schema_version: 1, artifact_type: "cascade-interview-observation", fixture_id: request.fixture_id, turn: request.turn, response_sha256: request.response_sha256, resolution: "UNRESOLVED", state: "INVALID", final_prompt: null, questions: [], obligations: request.obligations.map(item => ({ id: item.id, verdict: "UNRESOLVED" })), uncertainty: [reason] };
}

export function validateObservedTurn(label, expected, observation) {
  const questions = observation.questions.map(item => item.text);
  const intents = [...new Set(observation.questions.flatMap(item => item.intents))];
  const inspected = { state: observation.state, final_prompt: observation.final_prompt, questions, intents };
  const checks = [];
  const add = (id, passed, detail) => checks.push({ id: `${label}:${id}`, passed, ...(detail ? { detail } : {}) });
  add("interpretation", observation.resolution === "RESOLVED" && observation.uncertainty.length === 0);
  add("state", observation.state === expected.state);
  add("question-min", questions.length >= expected.min_questions);
  add("question-max", questions.length <= expected.max_questions);
  if (expected.state === "NEEDS_INPUT") add("no-final-prompt", observation.final_prompt === null);
  if (expected.state === "READY") add("has-final-prompt", Boolean(observation.final_prompt));
  for (const intent of expected.required_intents ?? []) add(`required-intent:${intent}`, intents.includes(intent));
  for (const intent of expected.forbidden_intents ?? []) add(`forbidden-intent:${intent}`, !intents.includes(intent));
  for (const item of observation.obligations) add(`obligation:${item.id}`, item.verdict === "PASS");
  return { inspected, observation, checks, eligible: checks.every(item => item.passed) };
}
