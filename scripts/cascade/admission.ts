import {
  CascadeError,
  assertJsonSchema,
  boundedPath,
  boolFlag,
  compareRfc3339Instants,
  flag,
  flags,
  isFile,
  parseArgs,
  parseRfc3339ComparableInstant,
  parseRfc3339Instant,
  readJson,
  readBoundedRegularFile,
  rootPath,
  sha256Text,
  stableJson,
  utcNow,
  writeJsonAtomic,
} from "./common";
import { readStructured } from "./structured-data";
import { lstatSync, realpathSync } from "node:fs";
import { relative, resolve } from "node:path";
import {
  classifyEnvGitAction,
} from "./admission-clauses";

export const ADMISSION_SCHEMA_VERSION = 41;
export const ADMISSION_POLICY_BUNDLE = "cascade-core@42";
export const MAX_ADMISSION_REQUEST_CHARACTERS = 4_000;
const MAX_REDACTED_REQUEST_CHARACTERS = MAX_ADMISSION_REQUEST_CHARACTERS;
const MAX_ADMISSION_REQUEST_FILE_BYTES = MAX_ADMISSION_REQUEST_CHARACTERS * 4;
export const ADMISSION_POLICY_SOURCE_FILE = ".codex/task-admission/policies/core.yaml";
export const ADMISSION_CONTROL_SOURCE_FILE = ".codex/task-admission/control-catalog.yaml";
const POLICY_PATH = rootPath(ADMISSION_POLICY_SOURCE_FILE);
const CONTROL_PATH = rootPath(ADMISSION_CONTROL_SOURCE_FILE);
const CONTROL_SCHEMA_PATH = rootPath(".codex/task-admission/control-catalog.schema.json");
const ENVELOPE_SCHEMA_PATH = rootPath(".codex/task-admission/task-envelope.schema.json");
const INTERPRETATION_SCHEMA_PATH = rootPath(".codex/task-admission/interpretation.schema.json");
const POLICY_SCHEMA_PATH = rootPath(".codex/task-admission/policy.schema.json");
const POLICY_SOURCE_SCHEMA_PATH = rootPath(".codex/task-admission/policy-source.schema.json");
const CORPUS_PATH = rootPath("harness-evals/task-admission/cases.yaml");
const CASE_SCHEMA_PATH = rootPath("harness-evals/task-admission/case.schema.json");
const ASSESSMENT_SCHEMA_PATH = rootPath("harness-evals/task-admission/assessment.schema.json");

const RELATIONS = ["NEW", "CONTINUE", "AMEND", "OVERRIDE", "STATUS", "CANCEL", "CONVERSATION_ONLY"] as const;
const INTENTS = ["ANSWER", "DISCOVER", "DIAGNOSE", "REVIEW", "VALIDATE", "CHANGE", "OPERATE"] as const;
const ROUTES = ["NO_WORKFLOW", "DIRECT_READ", "DIRECT_CHANGE", "BOUNDED", "CONNECTED", "PROGRAM"] as const;
const CONTROL_PACKS = ["BASE", "GROUNDED_READ", "ATOMIC_CHANGE", "STANDARD_CHANGE", "CONNECTED_DELIVERY", "PROGRAM_CONTROL", "SIMULATION_GOVERNANCE", "SECURITY_ASSURANCE", "FULL_SCAN", "RELEASE_EVIDENCE"] as const;
const TOPOLOGY = ["ATOMIC", "BOUNDED", "CONNECTED", "PROGRAM"] as const;
const EFFORT = ["MICRO", "SMALL", "MEDIUM", "LARGE", "EXTENDED"] as const;
const ASSURANCE = ["BASIC", "STANDARD", "HIGH", "REGULATED"] as const;
const AUTHORITY = ["READ_ONLY", "LOCAL_WRITE", "EXTERNAL_WRITE", "PRIVILEGED", "DESTRUCTIVE"] as const;
const HARD_ACTIONS = ["EXTERNAL_WRITE", "PRIVILEGED", "DESTRUCTIVE"] as const;
const EVIDENCE = ["EXPLANATION", "TARGETED", "REGRESSION", "INDEPENDENT", "RELEASE"] as const;
const DURATION = ["TURN", "MULTI_TURN", "RESUMABLE", "PROGRAM"] as const;
const CONTEXT = ["PROMPT_ONLY", "TARGETED_PROBE", "SCOPED_SCAN", "FULL_SCAN"] as const;
const POLICY_PRIORITIES = ["HARD_DENY", "APPROVAL", "HAZARD", "ASSURANCE", "TOPOLOGY", "OPTIONAL"] as const;
const CLAIM_KINDS = ["OUTCOME", "CURRENT_STATE", "CRITERION", "CONSTRAINT", "NON_GOAL", "BOUNDARY", "HAZARD", "AUTHORITY", "EVIDENCE", "INFERENCE"] as const;
const CLAIM_SOURCES = ["USER", "TRUSTED_INSTRUCTION", "CURRENT_SOURCE", "TOOL_EVIDENCE", "EXTERNAL_SOURCE", "MODEL_INFERENCE"] as const;
const CLAIM_STATUSES = ["PROVIDED", "VERIFIED", "INFERRED", "UNKNOWN", "CONFLICTING", "SUPERSEDED"] as const;

type Relation = typeof RELATIONS[number];
type Intent = typeof INTENTS[number];
type Route = typeof ROUTES[number];
type ControlPack = typeof CONTROL_PACKS[number];
type AuthorityClass = typeof AUTHORITY[number];
type HardActionClass = typeof HARD_ACTIONS[number];
export type ToolActionClass = AuthorityClass | "HOST_LOCAL_WORKFLOW";
type JsonObject = Record<string, any>;

export interface AdmissionSourceSegment {
  start: number;
  end: number;
  source: "DIRECT_USER" | "EXTERNAL_SOURCE";
}

export interface TrustedDirectUserAttestationExpected {
  schema_version: 1;
  attestation_id: string;
  issuer: string;
  request_digest: string;
  source_segments_digest: string;
}

/** Host-only provenance bridge; serialized envelopes retain only its verified receipt. */
export interface TrustedDirectUserAttestation extends TrustedDirectUserAttestationExpected {
  verify: (expected: TrustedDirectUserAttestationExpected) => { ok: boolean; reason?: string };
}

export interface TrustedHardActionReceipt {
  receipt_id: string;
  issuer: string;
  session_id: string;
  envelope_id: string;
  envelope_revision: number;
  request_digest: string;
  source_digest: string | null;
  action_class: HardActionClass;
  tool_name: string;
  target_digest: string;
  tool_call_id: string;
  nonce: string;
  issued_at: string;
  expires_at: string;
  max_uses: 1;
  signature: string;
}

export interface TrustedHardActionExpected {
  receipt_id: string;
  issuer: string;
  session_id: string;
  envelope_id: string;
  envelope_revision: number;
  request_digest: string;
  source_digest: string | null;
  action_class: HardActionClass;
  tool_name: string;
  target_digest: string;
  tool_call_id: string;
  nonce: string;
  issued_at: string;
  expires_at: string;
  max_uses: 1;
}

/**
 * Host-only capability bridge. The hook, CLI, workspace, environment, model,
 * and tool input must never construct this object. The host pins issuer and
 * current revision, verifies the signature, checks revocation, and atomically
 * consumes the nonce before returning ok.
 */
export interface TrustedAuthorityHost {
  receipt_id: string;
  issuer: string;
  session_id: string;
  current_envelope_id: string;
  current_revision: number;
  current_request_digest: string;
  current_source_digest: string | null;
  current_direct_user_attestation: TrustedDirectUserAttestationExpected;
  nonce: string;
  issued_at: string;
  expires_at: string;
  receipt: unknown;
  verify_and_consume: (receipt: TrustedHardActionReceipt, expected: TrustedHardActionExpected) => { ok: boolean; reason?: string };
}

export interface AdmissionRequest {
  request: string;
  interpretation?: AdmissionInterpretation;
  semantic_interpretation?: unknown;
  task_id?: string;
  relation?: Relation;
  intent?: Intent;
  authority?: string[];
  dispatch_authorized?: boolean;
  produced_at?: string;
  source_digest?: string;
  candidate_tags?: string[];
  source_segments?: AdmissionSourceSegment[];
  trusted_direct_user_attestation?: TrustedDirectUserAttestation;
  prior_envelope?: TaskEnvelope;
}

export interface AdmissionInterpretation {
  schema_version: 1;
  interpreter: { kind: "LLM"; model: string };
  request_digest: string;
  task_id: string;
  source_digest: string | null;
  relation: Relation;
  intent: Intent;
  claims: TaskClaim[];
  workload: { topology: typeof TOPOLOGY[number]; effort: typeof EFFORT[number]; authority: AuthorityClass; duration: typeof DURATION[number]; context: typeof CONTEXT[number] };
  local_write_scope: { mode: "TARGETS" | "REPOSITORY"; targets: string[] };
  uncertainties: string[];
}

export interface TaskClaim {
  claim_id: string;
  kind: typeof CLAIM_KINDS[number];
  statement: string;
  source: typeof CLAIM_SOURCES[number];
  status: typeof CLAIM_STATUSES[number];
  confidence: number | null;
  verification: string;
  policy_tags: string[];
  consumers: string[];
  invalidation: string[];
}

export interface TaskEnvelope extends JsonObject {
  schema_version: 41;
  artifact_type: "cascade-task-envelope";
  envelope_id: string;
  revision: number;
  policy_bundle_version: string;
  policy_bundle_digest: string;
  control_catalog_digest: string;
  request_digest: string;
  source_digest: string | null;
  derivation_input: TaskDerivationInput;
  derivation_input_digest: string;
  task_id: string;
  prior_envelope_id: string | null;
  produced_at: string;
  relation: Relation;
  intent: Intent;
  claims: TaskClaim[];
  workload: {
    topology: typeof TOPOLOGY[number];
    effort: typeof EFFORT[number];
    assurance: typeof ASSURANCE[number];
    authority: AuthorityClass;
    evidence: typeof EVIDENCE[number];
    duration: typeof DURATION[number];
    context: typeof CONTEXT[number];
  };
  route: Route;
  control_packs: ControlPack[];
  authority: {
    requested: string[];
    missing: string[];
    activation: "HOST_RECEIPT_REQUIRED";
    local_write_scope: {
      mode: "TARGETS" | "REPOSITORY";
      targets: string[];
    };
  };
  reclassification: {
    preserved_claim_ids: string[];
    superseded_claim_ids: string[];
    reopened_consumers: string[];
  };
  integrity: { algorithm: "SHA-256"; digest: string };
}

export interface TaskEnvelopeValidationBindings {
  expected_request_digest?: string;
  expected_source_digest?: string;
  require_source_digest?: boolean;
  require_semantic_interpretation?: boolean;
}

interface PriorDerivationSnapshot {
  envelope_id: string;
  revision: number;
  task_id: string;
  request_digest: string;
  source_digest: string | null;
  intent: Intent;
  provenance_mode: "TRUSTED_SOURCE_SEGMENTS" | "UNVERIFIED_SOURCE";
  direct_user_attestation: TrustedDirectUserAttestationExpected | null;
  claims: TaskClaim[];
}

interface TaskDerivationInput extends JsonObject {
  schema_version: 41;
  classifier_id: "cascade-semantic-admission-v1";
  interpretation: AdmissionInterpretation;
  canonical_request: string;
  classification_request: string;
  classification_digest: string;
  provenance_version: 2;
  provenance_mode: "TRUSTED_SOURCE_SEGMENTS" | "UNVERIFIED_SOURCE";
  source_segments_digest: string;
  direct_user_attestation: TrustedDirectUserAttestationExpected | null;
  request_spans: RequestSpan[];
  request_digest: string;
  source_digest: string | null;
  task_id: string;
  produced_at: string;
  relation_override: Relation | null;
  intent_override: Intent | null;
  authority_candidates: string[];
  candidate_tags: string[];
  prior: PriorDerivationSnapshot | null;
  authenticity: "TRUSTED_DIRECT_USER_ATTESTATION" | "UNVERIFIED_SOURCE";
}

interface RequestSpan {
  start: number;
  end: number;
  source: "USER" | "EXTERNAL_SOURCE";
}

export interface AdmissionPolicy extends JsonObject {
  id: string;
  version: number;
  priority: typeof POLICY_PRIORITIES[number];
  match_all: string[];
  match_any: string[];
  required_controls: ControlPack[];
  forbidden_controls: ControlPack[];
  minimum_route: Route | null;
  minimum_assurance: typeof ASSURANCE[number] | null;
  minimum_evidence: typeof EVIDENCE[number] | null;
  approval: string | null;
  conflict_set: string | null;
  rationale: string;
  invalidation: string[];
}

interface ControlDefinition extends JsonObject {
  id: ControlPack;
  cost: number;
  requires: ControlPack[];
  purpose: string;
}

const POLICY_AUTHORING_DEFAULTS = {
  match_all: [],
  match_any: [],
  required_controls: [],
  forbidden_controls: [],
  minimum_route: null,
  minimum_assurance: null,
  minimum_evidence: null,
  approval: null,
  conflict_set: null,
} as const;

export function normalizeAdmissionPolicyBundle(source: unknown): JsonObject {
  if (!isObject(source) || !Array.isArray(source.policies)) {
    throw new CascadeError("task admission policy source must contain a policies array");
  }
  return {
    ...source,
    policies: source.policies.map((policy: unknown, index: number) => {
      if (!isObject(policy)) {
        throw new CascadeError(`task admission policy source policies[${index}] must be an object`);
      }
      return {
        ...POLICY_AUTHORING_DEFAULTS,
        ...policy,
      };
    }),
  };
}

export async function loadAdmissionPolicyBundle(): Promise<JsonObject> {
  const [source, sourceSchema, policySchema] = await Promise.all([
    readStructured<JsonObject>(POLICY_PATH, ADMISSION_POLICY_SOURCE_FILE),
    readJson<JsonObject>(POLICY_SOURCE_SCHEMA_PATH),
    readJson<JsonObject>(POLICY_SCHEMA_PATH),
  ]);
  assertJsonSchema(source, sourceSchema, "$");
  const bundle = normalizeAdmissionPolicyBundle(source);
  assertJsonSchema(bundle, policySchema, "$");
  return bundle;
}

export async function loadAdmissionControlCatalog(): Promise<JsonObject> {
  const [catalog, schema] = await Promise.all([
    readStructured<JsonObject>(CONTROL_PATH, ADMISSION_CONTROL_SOURCE_FILE),
    readJson<JsonObject>(CONTROL_SCHEMA_PATH),
  ]);
  assertJsonSchema(catalog, schema, "$");
  return catalog;
}

export interface ToolAdmissionDecision {
  behavior: "allow" | "deny" | "defer";
  action_class: ToolActionClass;
  reason: string;
}

const [ENVELOPE_SCHEMA, POLICY_BUNDLE, CONTROL_CATALOG, INTERPRETATION_SCHEMA] = await Promise.all([
  readJson<JsonObject>(ENVELOPE_SCHEMA_PATH),
  loadAdmissionPolicyBundle(),
  loadAdmissionControlCatalog(),
  readJson<JsonObject>(INTERPRETATION_SCHEMA_PATH),
]);
const CASE_SCHEMA = (await isFile(CASE_SCHEMA_PATH))
  ? await readJson<JsonObject>(CASE_SCHEMA_PATH)
  : null;
const ASSESSMENT_SCHEMA = (await isFile(ASSESSMENT_SCHEMA_PATH))
  ? await readJson<JsonObject>(ASSESSMENT_SCHEMA_PATH)
  : null;
const POLICY_BUNDLE_DIGEST = sha256Text(stableJson(POLICY_BUNDLE));
const CONTROL_CATALOG_DIGEST = sha256Text(stableJson(CONTROL_CATALOG));

function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}

function isObject(value: unknown): value is JsonObject {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function requireString(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string" || !value.trim()) throw new CascadeError(`${label} must be a non-empty string`);
}

function requireEnum<T extends string>(value: unknown, allowed: readonly T[], label: string): asserts value is T {
  if (typeof value !== "string" || !allowed.includes(value as T)) throw new CascadeError(`${label} must be one of ${allowed.join(", ")}`);
}

function redactSensitive(value: string): string {
  const secretName = String.raw`(?:(?:the|my|our|your)\s+)?(?:password|passphrase|passwd|client[ -]secret|access[ -]token|refresh[ -]token|api[ -]key|private[ -]key|connection[ -]string|database[ -]url|db[ -]url|dsn|secret|token)`;
  const naturalRelation = String.raw`(?:['’]s\s+value|\s+value)?\s+(?:was\s+set\s+to|has\s+(?:now\s+)?been\s+set\s+to|has\s+(?:the\s+)?value(?:\s+of)?|is\s+(?:currently|presently|now)(?:\s+set\s+to)?|(?:currently|presently|now)\s+(?:equals?|has\s+(?:the\s+)?value(?:\s+of)?|is(?:\s+set\s+to)?)|happens\s+to\s+be|is\s+equal\s+to|equals?|is|was)`;
  // Natural-language secrets are deliberately minimized through the end of the
  // bounded clause. Punctuation is valid secret material and must not survive as
  // a suffix merely because it also looks like prose punctuation.
  const continuationAction = String.raw`(?:keep|preserve|continue|validation|review|do\s+not|don't|never|execute|perform|act|take|proceed|carry|do|go|run|delete|remove|erase|destroy|wipe|purge|obliterate|eradicate|expunge|discard|update|push|rename|format|document|correct|apply|write|deploy|publish|send|stop|abort)`;
  const continuationConnector = String.raw`(?:(?:and\s+)?then|(?:and\s+)?after\s+that|afterwards?|next)`;
  const completeValue = String.raw`(?:"[^"]*"|'[^']*'|“[^”]*”|‘[^’]*’|[^\n]+?)(?=(?:[.!?]\s+(?=[A-Z])|[,;!}]\s+(?=(?:${continuationConnector}\s+)?${continuationAction}\b)|\s+(?=${continuationConnector}\s+${continuationAction}\b)|\n|$))`;
  const naturalAssignment = new RegExp(String.raw`\b(${secretName}${naturalRelation}\s+)${completeValue}`, "gi");
  const symbolicAssignment = new RegExp(String.raw`(["']?(?:[a-z0-9]+[_-])*(?:password|passwd|secret[_-]?access[_-]?key|secret[_-]?key|secret|client[_-]?secret|access[_-]?token|refresh[_-]?token|token|api[_-]?key|private[_-]?key|connection[_-]?string|database[_-]?url|dsn)["']?\s*[=:]\s*)${completeValue}`, "gi");
  return value
    .replace(naturalAssignment, "$1[REDACTED]")
    .replace(symbolicAssignment, "$1[REDACTED]")
    .replace(/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g, "[REDACTED_PRIVATE_KEY]")
    .replace(/\bsk-[A-Za-z0-9_-]{12,}\b/g, "[REDACTED_API_KEY]")
    .replace(/\b(?:ghp|gho|ghu|ghs|ghr|github_pat)_[A-Za-z0-9_]{12,}\b/g, "[REDACTED_TOKEN]")
    .replace(/\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g, "[REDACTED_TOKEN]")
    .replace(/\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g, "[REDACTED_ACCESS_KEY]")
    .replace(/\b(?:sk_live|rk_live)_[A-Za-z0-9]{12,}\b/g, "[REDACTED_STRIPE_KEY]")
    .replace(/\bwhsec_[A-Za-z0-9]{12,}\b/g, "[REDACTED_STRIPE_SECRET]")
    .replace(/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g, "[REDACTED_JWT]")
    .replace(/\bAuthorization\s*:\s*(?:Bearer|Basic|Token)\s+[^\s,;]+/gi, "Authorization: [REDACTED]")
    .replace(/\bBearer\s+[^\s,;]{8,}/gi, "Bearer [REDACTED]")
    .replace(/([a-z][a-z0-9+.-]*:\/\/)[^\s/@:]+:[^\s/@]+@/gi, "$1[REDACTED]@")
    .replace(/([?&](?:x-amz-(?:credential|signature|security-token)|signature|sig|signed-token|access-token|access_token|token|se|sp|sv)=)[^&#\s]+/gi, "$1[REDACTED]")
    .replace(/(client[ -]secret|access[ -]token|refresh[ -]token|api[ -]key|private[ -]key|connection[ -]string|database[ -]url|db[ -]url|dsn)\s*[=:]\s*(?:["'][^"']+["']|[^\s]+)/gi, "$1=[REDACTED]");
}

function containsRawSecret(value: string): boolean {
  return redactSensitive(value) !== value;
}

export function assertAdmissionRequestBound(value: unknown): asserts value is string {
  if (typeof value !== "string") throw new CascadeError("admission request must be a string");
  if (value.length > MAX_ADMISSION_REQUEST_CHARACTERS) {
    throw new CascadeError(`admission request exceeds ${MAX_ADMISSION_REQUEST_CHARACTERS} raw characters`);
  }
}

function canonicalAdmissionRequest(value: string): string {
  assertAdmissionRequestBound(value);
  const canonical = redactSensitive(value);
  if (canonical.length > MAX_REDACTED_REQUEST_CHARACTERS) {
    throw new CascadeError(`redacted admission request exceeds ${MAX_REDACTED_REQUEST_CHARACTERS} characters`);
  }
  return canonical;
}

function validateRequestSpans(request: string, spans: RequestSpan[]): void {
  if (!Array.isArray(spans) || !spans.length || spans.length > 64) throw new CascadeError("task request provenance must contain 1 to 64 spans");
  let cursor = 0;
  for (const [index, span] of spans.entries()) {
    if (!isObject(span) || !Number.isInteger(span.start) || !Number.isInteger(span.end)) throw new CascadeError(`task request provenance span ${index} bounds are invalid`);
    if (span.start !== cursor || span.end <= span.start || span.end > request.length) throw new CascadeError(`task request provenance span ${index} is unordered, overlapping, or incomplete`);
    if (span.source !== "USER" && span.source !== "EXTERNAL_SOURCE") throw new CascadeError(`task request provenance span ${index} source is invalid`);
    cursor = span.end;
  }
  if (cursor !== request.length) throw new CascadeError("task request provenance does not cover the canonical request exactly");
}

function sourceSegmentsDigest(spans: readonly RequestSpan[]): string {
  return sha256Text(stableJson(spans));
}

function redactRequestPartition(request: string, spans: RequestSpan[]): { canonical_request: string; request_spans: RequestSpan[] } {
  validateRequestSpans(request, spans);
  const canonical = redactSensitive(request);
  const pieces: string[] = [];
  const projected: RequestSpan[] = [];
  let cursor = 0;
  for (const span of spans) {
    const piece = redactSensitive(request.slice(span.start, span.end));
    if (!piece) continue;
    pieces.push(piece);
    projected.push({ start: cursor, end: cursor + piece.length, source: span.source });
    cursor += piece.length;
  }
  const partitioned = pieces.join("");
  if (partitioned === canonical) return { canonical_request: canonical, request_spans: projected };

  // A secret assignment may begin in one trusted source segment and end in the
  // next. Redacting each segment independently would miss that value. Project
  // the whole-request redaction back onto the raw partition and conservatively
  // label a replacement EXTERNAL_SOURCE if any byte it replaces was external.
  const sourceAt = (index: number): RequestSpan["source"] => spans.find((span) => index >= span.start && index < span.end)?.source ?? "EXTERNAL_SOURCE";
  const append = (start: number, end: number, source: RequestSpan["source"]) => {
    if (end <= start) return;
    const last = projected.at(-1);
    if (last?.source === source && last.end === start) last.end = end;
    else projected.push({ start, end, source });
  };
  projected.length = 0;
  const marker = /\[REDACTED(?:_[A-Z_]+)?\]/g;
  let canonicalCursor = 0;
  let rawCursor = 0;
  for (let match = marker.exec(canonical); match; match = marker.exec(canonical)) {
    const unchanged = canonical.slice(canonicalCursor, match.index);
    const rawUnchangedStart = request.indexOf(unchanged, rawCursor);
    if (rawUnchangedStart < 0) return { canonical_request: canonical, request_spans: [{ start: 0, end: canonical.length, source: "EXTERNAL_SOURCE" }] };
    for (let offset = 0; offset < unchanged.length; offset += 1) append(canonicalCursor + offset, canonicalCursor + offset + 1, sourceAt(rawUnchangedStart + offset));
    rawCursor = rawUnchangedStart + unchanged.length;
    const nextMarker = marker.lastIndex;
    const nextMatch = marker.exec(canonical);
    const anchor = canonical.slice(nextMarker, nextMatch?.index ?? canonical.length);
    marker.lastIndex = nextMarker;
    const rawAnchor = anchor ? request.indexOf(anchor, rawCursor) : request.length;
    const rawEnd = rawAnchor < 0 ? request.length : rawAnchor;
    const replacementSource = spans.some((span) => span.source === "EXTERNAL_SOURCE" && span.start < rawEnd && span.end > rawCursor) ? "EXTERNAL_SOURCE" : sourceAt(rawCursor);
    append(match.index, match.index + match[0].length, replacementSource);
    rawCursor = rawEnd;
    canonicalCursor = match.index + match[0].length;
  }
  const tail = canonical.slice(canonicalCursor);
  const rawTailStart = request.indexOf(tail, rawCursor);
  if (rawTailStart < 0) return { canonical_request: canonical, request_spans: [{ start: 0, end: canonical.length, source: "EXTERNAL_SOURCE" }] };
  for (let offset = 0; offset < tail.length; offset += 1) append(canonicalCursor + offset, canonicalCursor + offset + 1, sourceAt(rawTailStart + offset));
  return { canonical_request: canonical, request_spans: projected };
}

function verifiedStructuredRequestSpans(
  request: string,
  segments: AdmissionSourceSegment[] | undefined,
  attestation: TrustedDirectUserAttestation | undefined,
): { canonical_request: string; spans: RequestSpan[]; receipt: TrustedDirectUserAttestationExpected } | null {
  if (!segments && !attestation) return null;
  if (!segments || !attestation) throw new CascadeError("trusted request provenance requires both source_segments and a direct-user attestation");
  const rawSpans = segments.map((segment) => ({
    start: segment.start,
    end: segment.end,
    source: segment.source === "DIRECT_USER" ? "USER" as const : "EXTERNAL_SOURCE" as const,
  }));
  validateRequestSpans(request, rawSpans);
  if (!segments.some((segment) => segment.source === "DIRECT_USER")) throw new CascadeError("trusted request provenance requires at least one direct-user segment");
  const projected = redactRequestPartition(request, rawSpans);
  const expected: TrustedDirectUserAttestationExpected = {
    schema_version: 1,
    attestation_id: attestation.attestation_id,
    issuer: attestation.issuer,
    request_digest: sha256Text(projected.canonical_request),
    source_segments_digest: sourceSegmentsDigest(rawSpans),
  };
  requireString(expected.attestation_id, "direct-user attestation id");
  requireString(expected.issuer, "direct-user attestation issuer");
  if (
    attestation.schema_version !== expected.schema_version ||
    attestation.request_digest !== expected.request_digest ||
    attestation.source_segments_digest !== expected.source_segments_digest
  ) throw new CascadeError("direct-user attestation binding does not match the canonical request segments");
  let verification: { ok: boolean; reason?: string };
  try { verification = attestation.verify(expected); }
  catch { throw new CascadeError("direct-user attestation verification failed closed"); }
  if (!verification || verification.ok !== true) throw new CascadeError(verification?.reason || "direct-user attestation was rejected");
  return {
    canonical_request: projected.canonical_request,
    spans: projected.request_spans,
    receipt: { ...expected, source_segments_digest: sourceSegmentsDigest(projected.request_spans) },
  };
}

function requestForSource(request: string, spans: RequestSpan[], source: RequestSpan["source"]): string {
  return spans.filter((span) => span.source === source).map((span) => request.slice(span.start, span.end)).join("\n").trim();
}

function classificationRequestFromSpans(request: string, spans: RequestSpan[]): string {
  return requestForSource(request, spans, "USER") || request;
}

export function canonicalAdmissionRequestDigest(value: string): string {
  return sha256Text(canonicalAdmissionRequest(value));
}

function normalizeToolName(toolName: string): string {
  const normalized = toolName.trim().toLowerCase().replace(/^tools\./, "");
  if (normalized === "functions.exec") return normalized;
  return normalized.replace(/^(?:functions|collaboration)\./, "");
}

export function hardActionTargetDigest(toolName: string, toolInput: unknown): string {
  const encoded = stableJson({ tool_name: normalizeToolName(toolName), tool_input: toolInput ?? null });
  if (typeof encoded !== "string" || new TextEncoder().encode(encoded).byteLength > 1024 * 1024) throw new CascadeError("hard action target must be bounded JSON no larger than 1 MiB");
  return sha256Text(encoded);
}

export function trustedHardActionReceiptPayload(receipt: TrustedHardActionReceipt): TrustedHardActionExpected {
  const { signature: _signature, ...payload } = receipt;
  return payload;
}

function canonicalClaimSemantics(claim: TaskClaim): string {
  const { claim_id: _claimId, ...semantic } = claim;
  return stableJson(semantic);
}

function rankMax<T extends string>(values: readonly T[], current: T, candidate: T | null): T {
  if (!candidate) return current;
  return values.indexOf(candidate) > values.indexOf(current) ? candidate : current;
}

function policyMatches(policy: AdmissionPolicy, tags: Set<string>): boolean {
  return policy.match_all.every((tag) => tags.has(tag)) && (!policy.match_any.length || policy.match_any.some((tag) => tags.has(tag)));
}

function policyTraceClaims(claims: TaskClaim[], policy: AdmissionPolicy): string[] {
  const matchTags = new Set([...policy.match_all, ...policy.match_any]);
  const active = claims.filter((claim) => claim.status !== "SUPERSEDED");
  const matched = active.filter((claim) => claim.policy_tags.some((tag) => matchTags.has(tag))).map((claim) => claim.claim_id);
  if (matched.length) return unique(matched).sort();
  if (matchTags.has("always") && active.length) return [active[0]!.claim_id];
  return [];
}

function classifyBaseRoute(intent: Intent, relation: Relation, tags: Set<string>): Route {
  if (relation === "CONVERSATION_ONLY") return "NO_WORKFLOW";
  if (["ANSWER", "DISCOVER", "DIAGNOSE", "REVIEW", "VALIDATE"].includes(intent) || relation === "STATUS") return "DIRECT_READ";
  if (tags.has("atomic-change")) return "DIRECT_CHANGE";
  return "BOUNDED";
}

function controlMap(catalog = CONTROL_CATALOG): Map<ControlPack, ControlDefinition> {
  return new Map((catalog.controls as ControlDefinition[]).map((control) => [control.id, control]));
}

function expandControl(control: ControlPack, definitions: Map<ControlPack, ControlDefinition>, visiting = new Set<ControlPack>()): ControlPack[] {
  const definition = definitions.get(control);
  if (!definition) throw new CascadeError(`task admission control dependency is missing: ${control}`);
  if (visiting.has(control)) throw new CascadeError(`task admission control dependency cycle includes ${control}`);
  const next = new Set(visiting).add(control);
  return unique([...definition.requires.flatMap((item) => expandControl(item, definitions, next)), control]);
}

function requiredSkills(controls: ControlPack[], intent: Intent, tags: Set<string>): string[] {
  const skills: string[] = [];
  if (controls.includes("GROUNDED_READ")) skills.push("context");
  if (controls.includes("ATOMIC_CHANGE")) skills.push("implement-change", "validate-change");
  if (controls.includes("STANDARD_CHANGE")) skills.push("plan-change", "implement-change", "cascade-engineering:review-change", "validate-change");
  if (controls.includes("CONNECTED_DELIVERY") || controls.includes("PROGRAM_CONTROL")) skills.push("cascade-workflows:manage-project");
  if (controls.includes("SIMULATION_GOVERNANCE")) {
    skills.push(tags.has("simulation-campaign") ? "cascade-simulations:manage-simulation-campaign" : "cascade-simulations:simulate");
  }
  if (controls.includes("SECURITY_ASSURANCE")) skills.push("cascade-security:secure-design");
  if (controls.includes("RELEASE_EVIDENCE")) skills.push("validate-change");
  if (!skills.length && intent === "REVIEW") skills.push("cascade-engineering:review-change");
  return unique(skills);
}

function envelopePayload(envelope: JsonObject): JsonObject {
  const { envelope_id: _id, integrity: _integrity, ...payload } = envelope;
  return payload;
}

function sealEnvelope(payload: JsonObject): TaskEnvelope {
  const digest = sha256Text(stableJson(payload));
  return { ...payload, envelope_id: `TE-${digest.slice(0, 16)}`, integrity: { algorithm: "SHA-256", digest } } as TaskEnvelope;
}

function policyById(): Map<string, AdmissionPolicy> {
  return new Map((POLICY_BUNDLE.policies as AdmissionPolicy[]).map((policy) => [policy.id, policy]));
}

export function validateTaskEnvelope(envelope: unknown, bindings: TaskEnvelopeValidationBindings = {}): asserts envelope is TaskEnvelope {
  if (isObject(envelope) && envelope.policy_bundle_version !== ADMISSION_POLICY_BUNDLE) throw new CascadeError("task envelope policy bundle is stale or unsupported");
  assertJsonSchema(envelope, ENVELOPE_SCHEMA, "$");
  const value = envelope as TaskEnvelope;
  if (parseRfc3339Instant(value.produced_at) === null || parseRfc3339Instant(value.derivation_input.produced_at) === null) throw new CascadeError("task envelope produced_at is not a valid date-time");
  if (value.policy_bundle_digest !== POLICY_BUNDLE_DIGEST || value.control_catalog_digest !== CONTROL_CATALOG_DIGEST) throw new CascadeError("task envelope policy or control source digest is stale");
  const digest = sha256Text(stableJson(envelopePayload(value)));
  if (value.integrity.algorithm !== "SHA-256" || value.integrity.digest !== digest || value.envelope_id !== `TE-${digest.slice(0, 16)}`) throw new CascadeError("task envelope integrity digest is invalid");
  if (value.derivation_input_digest !== derivationInputDigest(value.derivation_input)) throw new CascadeError("task envelope derivation input digest is invalid");
  if (value.request_digest !== sha256Text(value.derivation_input.canonical_request) || value.request_digest !== value.derivation_input.request_digest) throw new CascadeError("task envelope request digest is not bound to the full canonical derivation input");
  validateRequestSpans(value.derivation_input.canonical_request, value.derivation_input.request_spans);
  if (value.derivation_input.provenance_version !== 2 || value.derivation_input.source_segments_digest !== sourceSegmentsDigest(value.derivation_input.request_spans)) throw new CascadeError("task envelope request provenance is not the canonical source-labelled partition");
  if (value.derivation_input.provenance_mode === "TRUSTED_SOURCE_SEGMENTS") {
    if (
      value.derivation_input.authenticity !== "TRUSTED_DIRECT_USER_ATTESTATION" ||
      !value.derivation_input.direct_user_attestation ||
      value.derivation_input.direct_user_attestation.request_digest !== value.request_digest ||
      value.derivation_input.direct_user_attestation.source_segments_digest !== value.derivation_input.source_segments_digest
    ) throw new CascadeError("task envelope trusted request provenance is invalid");
  } else if (
    value.derivation_input.provenance_mode !== "UNVERIFIED_SOURCE" ||
    value.derivation_input.authenticity !== "UNVERIFIED_SOURCE" ||
    value.derivation_input.direct_user_attestation !== null ||
    stableJson(value.derivation_input.request_spans) !== stableJson([{ start: 0, end: value.derivation_input.canonical_request.length, source: "EXTERNAL_SOURCE" }])
  ) throw new CascadeError("task envelope unverified request provenance is invalid");
  const expectedClassificationRequest = classificationRequestFromSpans(value.derivation_input.canonical_request, value.derivation_input.request_spans);
  if (value.derivation_input.classification_request !== expectedClassificationRequest || value.derivation_input.classification_digest !== sha256Text(value.derivation_input.classification_request)) throw new CascadeError("task envelope exact classification input is not bound to the user-authored request spans");
  if (value.source_digest !== value.derivation_input.source_digest) throw new CascadeError("task envelope source digest is not bound to the derivation input");
  if (containsRawSecret(value.derivation_input.canonical_request)) throw new CascadeError("task envelope canonical derivation input contains unredacted secret material");
  let expectedPayload: JsonObject;
  try { expectedPayload = deriveTaskEnvelopePayload(value.derivation_input); }
  catch (error) { throw new CascadeError(`task envelope derivation cannot be reproduced: ${error instanceof Error ? error.message : "unknown derivation error"}`); }
  if (stableJson(envelopePayload(value)) !== stableJson(expectedPayload)) throw new CascadeError("task envelope compiler-owned derivation does not match the canonical input and current policy/control sources");
  if (bindings.expected_request_digest !== undefined && value.request_digest !== bindings.expected_request_digest) throw new CascadeError("task envelope request digest does not match the externally expected request binding");
  if (bindings.require_source_digest && value.source_digest === null) throw new CascadeError("task envelope is missing the externally required source digest binding");
  if (bindings.expected_source_digest !== undefined && value.source_digest !== bindings.expected_source_digest) throw new CascadeError("task envelope source digest does not match the externally expected source binding");
  if ((value.revision === 1) !== (value.prior_envelope_id === null)) throw new CascadeError("task envelope lineage is inconsistent");
  if (value.evidence_floor !== value.workload.evidence) throw new CascadeError("task envelope evidence axes are inconsistent");
  const claimIds = value.claims.map((claim) => claim.claim_id);
  const claimSet = new Set(claimIds);
  if (claimSet.size !== claimIds.length) throw new CascadeError("task envelope claim IDs contain duplicates");
  for (const claim of value.claims) {
    if (containsRawSecret(claim.statement)) throw new CascadeError(`task claim ${claim.claim_id} contains unredacted secret material`);
    if ((claim.source === "MODEL_INFERENCE") !== (claim.confidence !== null)) throw new CascadeError(`task claim ${claim.claim_id} confidence/source contract is invalid`);
    if (claim.source === "MODEL_INFERENCE" && claim.status !== "INFERRED" && claim.status !== "SUPERSEDED") throw new CascadeError(`task claim ${claim.claim_id} inference status is invalid`);
    if (claim.source === "EXTERNAL_SOURCE" && claim.policy_tags.some((tag) => tag.startsWith("requested-"))) throw new CascadeError(`task claim ${claim.claim_id} external source cannot establish requested authority`);
    if (value.derivation_input.provenance_mode !== "TRUSTED_SOURCE_SEGMENTS" && claim.policy_tags.some((tag) => tag.startsWith("requested-"))) throw new CascadeError(`task claim ${claim.claim_id} unverified provenance cannot establish requested authority`);
  }
  const preserved = new Set(value.reclassification.preserved_claim_ids);
  const superseded = new Set(value.reclassification.superseded_claim_ids);
  for (const id of [...preserved, ...superseded]) if (!claimSet.has(id)) throw new CascadeError(`task envelope reclassification references unknown claim ${id}`);
  for (const id of preserved) if (superseded.has(id)) throw new CascadeError(`task envelope reclassification overlaps claim ${id}`);
  for (const claim of value.claims) {
    if ((claim.status === "SUPERSEDED") !== superseded.has(claim.claim_id)) throw new CascadeError(`task envelope superseded claim ledger is inconsistent for ${claim.claim_id}`);
  }
  if (value.authority.activation !== "HOST_RECEIPT_REQUIRED") throw new CascadeError("task envelope authority activation boundary is invalid");
  const policies = policyById();
  const decisionIds = value.policy_decisions.map((decision: JsonObject) => decision.policy_id);
  if (new Set(decisionIds).size !== decisionIds.length) throw new CascadeError("task envelope policy decisions contain duplicates");
  for (const decision of value.policy_decisions as JsonObject[]) {
    const policy = policies.get(decision.policy_id);
    if (!policy || decision.version !== policy.version) throw new CascadeError(`task envelope policy decision is stale or unknown: ${decision.policy_id}`);
    for (const claimId of decision.matched_claim_ids) {
      const claim = value.claims.find((candidate) => candidate.claim_id === claimId);
      if (!claim || claim.status === "SUPERSEDED") throw new CascadeError(`policy ${decision.policy_id} references a missing or superseded claim`);
    }
    for (const control of decision.controls) if (!value.control_packs.includes(control)) throw new CascadeError(`policy ${decision.policy_id} references an unselected control ${control}`);
  }
  for (const trace of value.explanation_trace as JsonObject[]) {
    const decision = (value.policy_decisions as JsonObject[]).find((candidate) => candidate.policy_id === trace.policy_id);
    if (!decision || decision.version !== trace.policy_version) throw new CascadeError(`task envelope trace references unknown policy/version ${trace.policy_id}`);
    if (!decision.matched_claim_ids.includes(trace.claim_id)) throw new CascadeError(`task envelope trace claim is not bound by policy ${trace.policy_id}`);
    if (!decision.controls.includes(trace.control) || !value.control_packs.includes(trace.control)) throw new CascadeError(`task envelope trace control is not bound by policy ${trace.policy_id}`);
    if (trace.outcome !== `${value.route}/${value.evidence_floor}`) throw new CascadeError("task envelope trace outcome is stale");
  }
  for (const control of value.control_packs) {
    if (!(value.explanation_trace as JsonObject[]).some((trace) => trace.control === control)) throw new CascadeError(`task envelope explanation trace is incomplete for ${control}`);
  }
  for (const decision of value.policy_decisions as JsonObject[]) {
    for (const control of decision.controls) if (!(value.explanation_trace as JsonObject[]).some((trace) => trace.policy_id === decision.policy_id && trace.control === control)) throw new CascadeError(`task envelope policy trace is incomplete for ${decision.policy_id}/${control}`);
  }
  if ((value.conflicts.length || value.gaps.length) && !value.blockers.length) throw new CascadeError("task envelope conflicts or gaps must fail closed with a blocker");
  if (value.blockers.length && value.persistence.dispatch_authorized) throw new CascadeError("blocked task envelope cannot authorize dispatch");
}

function expectedIds(prefix: string, count: number, digits: number): string[] {
  return Array.from({ length: count }, (_, index) => `${prefix}${String(index + 1).padStart(digits, "0")}`);
}

export function validateAdmissionCaseBundle(source: unknown): asserts source is JsonObject {
  if (!CASE_SCHEMA) {
    throw new CascadeError(
      "task admission corpus validation is available only in the source checkout",
    );
  }
  assertJsonSchema(source, CASE_SCHEMA, "$");
  const cases = (source as JsonObject).cases as JsonObject[];
  const caseIds = cases.map((item) => item.id);
  const criteria = cases.map((item) => item.criterion);
  if (stableJson(caseIds) !== stableJson(expectedIds("TA-C", 981, 3))) throw new CascadeError("task admission corpus must contain ordered TA-C001 through TA-C981 exactly once");
  if (stableJson(criteria) !== stableJson(expectedIds("TR-", 981, 2))) throw new CascadeError("task admission corpus must map TR-01 through TR-981 exactly once");
  for (const item of cases) {
    const overlap = item.required_controls.filter((control: string) => item.forbidden_controls.includes(control));
    if (overlap.length) throw new CascadeError(`${item.id} both requires and forbids ${overlap.join(", ")}`);
  }
}

function validateAdmissionRuntimeBundle(
  bundle: JsonObject,
  catalog: JsonObject,
): { policy_count: number; control_count: number } {
  if (catalog.schema_version !== ADMISSION_SCHEMA_VERSION || catalog.catalog_id !== "cascade-task-controls" || catalog.catalog_version !== ADMISSION_SCHEMA_VERSION || !Array.isArray(catalog.controls)) throw new CascadeError("task admission control catalog is invalid");
  const controls = catalog.controls as ControlDefinition[];
  const controlIds = controls.map((item) => item.id);
  if (stableJson([...controlIds].sort()) !== stableJson([...CONTROL_PACKS].sort())) throw new CascadeError("task admission control catalog does not exactly match compiler controls");
  if (new Set(controlIds).size !== controlIds.length) throw new CascadeError("task admission control catalog contains duplicate IDs");
  for (const control of controls) {
    requireEnum(control.id, CONTROL_PACKS, "task admission control ID");
    if (!Number.isInteger(control.cost) || control.cost < 0 || !Array.isArray(control.requires) || !control.purpose?.trim()) throw new CascadeError(`task admission control is invalid: ${control.id}`);
    if (new Set(control.requires).size !== control.requires.length) throw new CascadeError(`task admission control dependencies contain duplicates: ${control.id}`);
    control.requires.forEach((dependency) => requireEnum(dependency, CONTROL_PACKS, `control ${control.id} dependency`));
  }
  const definitions = controlMap(catalog);
  for (const id of CONTROL_PACKS) expandControl(id, definitions);
  const expectedDependencies: Record<ControlPack, ControlPack[]> = {
    BASE: [], GROUNDED_READ: ["BASE"], ATOMIC_CHANGE: ["BASE"], STANDARD_CHANGE: ["BASE"],
    CONNECTED_DELIVERY: ["STANDARD_CHANGE"], PROGRAM_CONTROL: ["CONNECTED_DELIVERY"],
    SIMULATION_GOVERNANCE: ["BASE"], SECURITY_ASSURANCE: ["BASE"],
    FULL_SCAN: ["BASE"], RELEASE_EVIDENCE: ["BASE"],
  };
  for (const control of controls) if (stableJson(control.requires) !== stableJson(expectedDependencies[control.id])) throw new CascadeError(`task admission control dependency contract drifted: ${control.id}`);
  const policies = bundle.policies as AdmissionPolicy[];
  const policyIds = policies.map((item) => item.id);
  if (stableJson([...policyIds].sort()) !== stableJson(expectedIds("TAP-", 13, 3))) throw new CascadeError("task admission policy bundle is incomplete or has unexpected IDs");
  if (new Set(policyIds).size !== policyIds.length) throw new CascadeError("task admission policy IDs contain duplicates");
  for (const policy of policies) {
    if (!policy.match_all.length && !policy.match_any.length) throw new CascadeError(`task admission policy has no applicability predicate: ${policy.id}`);
    for (const control of [...policy.required_controls, ...policy.forbidden_controls]) requireEnum(control, CONTROL_PACKS, `policy ${policy.id} control`);
    const overlap = policy.required_controls.filter((control) => policy.forbidden_controls.includes(control));
    if (overlap.length) throw new CascadeError(`policy ${policy.id} both requires and forbids ${overlap.join(", ")}`);
  }
  if (`${bundle.bundle_id}@${bundle.bundle_version}` !== ADMISSION_POLICY_BUNDLE || bundle.schema_version !== ADMISSION_SCHEMA_VERSION) {
    throw new CascadeError("task admission runtime policy version is invalid");
  }
  return { policy_count: policyIds.length, control_count: controlIds.length };
}

function validateInterpretationContract(envelopeSchema: JsonObject, interpretationSchema: JsonObject): void {
  const { $schema, $id, $defs, ...interpretationContract } = interpretationSchema;
  if ($schema !== "https://json-schema.org/draft/2020-12/schema" || $id !== "https://cascade.local/schemas/admission-interpretation.v1.schema.json" || stableJson(interpretationContract) !== stableJson(envelopeSchema.$defs.interpretation)) throw new CascadeError("standalone interpretation schema differs from the compiler contract");
  const definitions = ["claim", "digest", "intent", "nullableDigest", "relation", "stringList"];
  if (!$defs || stableJson(Object.keys($defs).sort()) !== stableJson(definitions) || definitions.some(name => stableJson($defs[name]) !== stableJson(envelopeSchema.$defs[name]))) throw new CascadeError("standalone interpretation definitions differ from the compiler contract");
}

export function validateAdmissionRuntime(): {
  policy_count: number;
  control_count: number;
} {
  if (
    ENVELOPE_SCHEMA.$id !==
      "https://cascade.local/schemas/task-envelope.v41.schema.json" ||
    ENVELOPE_SCHEMA.properties?.schema_version?.const !==
      ADMISSION_SCHEMA_VERSION
  ) {
    throw new CascadeError("task admission runtime schema identity is invalid");
  }
  validateInterpretationContract(ENVELOPE_SCHEMA, INTERPRETATION_SCHEMA);
  return validateAdmissionRuntimeBundle(POLICY_BUNDLE, CONTROL_CATALOG);
}

export async function validateAdmissionRepository(): Promise<{ policy_count: number; control_count: number; case_count: number }> {
  const [source, catalog, envelopeSchema, policySchema, policySourceSchema, controlSchema, cases, caseSchema, assessmentSchema, interpretationSchema] = await Promise.all([
    readStructured<JsonObject>(POLICY_PATH, ADMISSION_POLICY_SOURCE_FILE), loadAdmissionControlCatalog(), readJson<JsonObject>(ENVELOPE_SCHEMA_PATH),
    readJson<JsonObject>(POLICY_SCHEMA_PATH), readJson<JsonObject>(POLICY_SOURCE_SCHEMA_PATH), readJson<JsonObject>(CONTROL_SCHEMA_PATH), readStructured<JsonObject>(CORPUS_PATH, "harness-evals/task-admission/cases.yaml"), readJson<JsonObject>(CASE_SCHEMA_PATH),
    readJson<JsonObject>(ASSESSMENT_SCHEMA_PATH), readJson<JsonObject>(INTERPRETATION_SCHEMA_PATH),
  ]);
  validateInterpretationContract(envelopeSchema, interpretationSchema);
  if (envelopeSchema.$id !== "https://cascade.local/schemas/task-envelope.v41.schema.json" || policySchema.$id !== "https://cascade.local/schemas/task-admission-policy.v41.schema.json" || policySourceSchema.$id !== "https://cascade.local/schemas/task-admission-policy-source.v41.schema.json" || controlSchema.$id !== "https://cascade.local/schemas/task-admission-controls.v41.schema.json" || caseSchema.$id !== "https://cascade.local/schemas/task-admission-cases.v41.schema.json" || assessmentSchema.$id !== "https://cascade.local/schemas/task-admission-assessment.v41.schema.json") throw new CascadeError("task admission public schema identity is invalid");
  const publicSchemaVersions = [envelopeSchema, policySchema, controlSchema, caseSchema, assessmentSchema].map((schema) => schema.properties?.schema_version?.const);
  if (publicSchemaVersions.some((version) => version !== ADMISSION_SCHEMA_VERSION)) throw new CascadeError("task admission public schema versions must advance together");
  assertJsonSchema(source, policySourceSchema, "$");
  const bundle = normalizeAdmissionPolicyBundle(source);
  assertJsonSchema(bundle, policySchema, "$");
  assertJsonSchema(catalog, controlSchema, "$");
  validateAdmissionCaseBundle(cases);
  const counts = validateAdmissionRuntimeBundle(bundle, catalog);
  const caseIds = (cases.cases as JsonObject[]).map((item) => item.id);
  if (`${bundle.bundle_id}@${bundle.bundle_version}` !== ADMISSION_POLICY_BUNDLE || bundle.schema_version !== ADMISSION_SCHEMA_VERSION || catalog.catalog_version !== ADMISSION_SCHEMA_VERSION || cases.schema_version !== ADMISSION_SCHEMA_VERSION || cases.policy_bundle_version !== ADMISSION_POLICY_BUNDLE || cases.case_set_version !== ADMISSION_SCHEMA_VERSION) throw new CascadeError("task admission bundle, corpus, and public version update must advance together");
  if (assessmentSchema.properties?.schema_version?.const !== ADMISSION_SCHEMA_VERSION || assessmentSchema.additionalProperties !== false) throw new CascadeError("task admission assessment schema is incomplete");
  return { ...counts, case_count: caseIds.length };
}

let admissionRepositoryValidation: Promise<{
  policy_count: number;
  control_count: number;
  case_count: number;
}> | undefined;

function validateAdmissionRepositoryOnce(): Promise<{
  policy_count: number;
  control_count: number;
  case_count: number;
}> {
  if (!admissionRepositoryValidation) {
    admissionRepositoryValidation = validateAdmissionRepository().catch((error) => {
      admissionRepositoryValidation = undefined;
      throw error;
    });
  }
  return admissionRepositoryValidation;
}

function requestedHardActionClasses(tags: Set<string>): HardActionClass[] {
  const result: HardActionClass[] = [];
  if (tags.has("requested-external-write")) result.push("EXTERNAL_WRITE");
  if (tags.has("requested-privileged")) result.push("PRIVILEGED");
  if (tags.has("requested-destructive")) result.push("DESTRUCTIVE");
  return result;
}

function derivationInputDigest(input: TaskDerivationInput): string {
  return sha256Text(stableJson(input));
}

function canonicalLocalWriteTarget(value: string): string | null {
  const target = value.trim();
  if (
    !target || target.length > 300 || /[\\\0\r\n'"`]/.test(target) || target.startsWith("/") || target.startsWith("~") ||
    target.includes("//") || target.endsWith("/") ||
    target.split("/").some((segment) => !segment || segment === "." || segment === "..")
  ) return null;
  return target.startsWith("./") ? target.slice(2) || null : target;
}

function validateInterpretation(interpretation: AdmissionInterpretation, requestDigest: string, taskId: string, sourceDigest: string | null): void {
  assertJsonSchema(interpretation, { ...ENVELOPE_SCHEMA.$defs.interpretation, $defs: ENVELOPE_SCHEMA.$defs }, "interpretation");
  if (interpretation.request_digest !== requestDigest || interpretation.task_id !== taskId || interpretation.source_digest !== sourceDigest) throw new CascadeError("LLM interpretation request, task or source binding is stale");
  if (new Set(interpretation.claims.map((claim) => claim.claim_id)).size !== interpretation.claims.length) throw new CascadeError("LLM interpretation claim IDs contain duplicates");
  for (const claim of interpretation.claims) {
    if (claim.status === "SUPERSEDED") throw new CascadeError("LLM interpretation must supply current claims; the compiler owns supersession");
    if (containsRawSecret(claim.statement)) throw new CascadeError("LLM interpretation contains unredacted secret material");
    for (const tag of claim.policy_tags) if (!/^[a-z0-9-]+$/.test(tag)) throw new CascadeError("LLM interpretation policy tag syntax is invalid");
  }
  const scope = interpretation.local_write_scope;
  if (scope.targets.some((target) => canonicalLocalWriteTarget(target) !== target) || (scope.mode === "REPOSITORY" && scope.targets.length)) throw new CascadeError("LLM interpretation local-write scope is not canonical");
  if (interpretation.workload.authority !== "LOCAL_WRITE" && (scope.mode !== "TARGETS" || scope.targets.length)) throw new CascadeError("non-local interpretation cannot declare a local-write scope");
  if (!["CHANGE", "OPERATE"].includes(interpretation.intent) && interpretation.workload.authority !== "READ_ONLY") throw new CascadeError("read-only intent cannot request mutation authority");
}

function deriveTaskEnvelopePayload(input: TaskDerivationInput): JsonObject {
  validateInterpretation(input.interpretation, input.request_digest, input.task_id, input.source_digest);
  const semantic = input.interpretation;
  const directUserAttested = input.provenance_mode === "TRUSTED_SOURCE_SEGMENTS";
  const taskId = input.task_id;
  const requestDigest = input.request_digest;
  const relation = semantic.relation;
  const intent = semantic.intent;
  const authorityClass = semantic.workload.authority;
  const topology = semantic.workload.topology;
  const effort = semantic.workload.effort;
  const duration = semantic.workload.duration;
  const context = semantic.workload.context;
  const localWriteScope = semantic.local_write_scope;
  let claims = structuredClone(semantic.claims).map((claim) => ({ ...claim,
    policy_tags: claim.policy_tags.filter((tag) => !tag.startsWith("requested-")),
  }));
  const structuralTags = ["always"];
  if (["REVIEW", "DIAGNOSE"].includes(intent)) structuralTags.push(intent.toLowerCase());
  if (relation === "STATUS") structuralTags.push("status");
  if (["CHANGE", "OPERATE"].includes(intent) && authorityClass === "LOCAL_WRITE") structuralTags.push(topology === "ATOMIC" ? "atomic-change" : "behavior-change");
  if (["CHANGE", "OPERATE"].includes(intent) && topology === "CONNECTED") structuralTags.push("connected");
  if (topology === "PROGRAM") structuralTags.push("program");
  if (context === "FULL_SCAN") structuralTags.push("full-scan");
  if (HARD_ACTIONS.includes(authorityClass as HardActionClass)) {
    const tag = authorityClass.toLowerCase().replace("_", "-");
    structuralTags.push(tag);
    if (directUserAttested && claims.some((claim) => claim.kind === "AUTHORITY" && claim.source === "USER" && claim.status === "PROVIDED")) {
      const authorityClaim = claims.find((claim) => claim.kind === "AUTHORITY" && claim.source === "USER" && claim.status === "PROVIDED")!;
      authorityClaim.policy_tags.push(`requested-${tag}`);
    }
  }
  claims[0]!.policy_tags = unique([...claims[0]!.policy_tags, ...structuralTags]);
  const inferredTags = unique(claims.filter((claim) => !["UNKNOWN", "CONFLICTING", "SUPERSEDED"].includes(claim.status)).flatMap((claim) => claim.policy_tags));
  const tags = new Set(inferredTags);
  const preservedClaimIds: string[] = [];
  const supersededClaimIds: string[] = [];
  const reopenedConsumers: string[] = [];
  if (input.prior) {
    let nextClaimNumber = Math.max(0, ...input.prior.claims.map((claim) => Number(claim.claim_id.slice(3)))) + 1;
    const matchedPrior = new Set<string>();
    const lineageSemanticsEqual = input.prior.intent === intent
      && input.prior.provenance_mode === input.provenance_mode
      && stableJson(input.prior.direct_user_attestation) === stableJson(input.direct_user_attestation);
    const sourceIdentityChanged = input.prior.source_digest !== input.source_digest;
    claims = claims.map((claim) => {
      const prior = lineageSemanticsEqual
        ? input.prior!.claims.find((candidate) => candidate.status !== "SUPERSEDED"
          && !matchedPrior.has(candidate.claim_id)
          && !(sourceIdentityChanged && candidate.invalidation.includes("source"))
          && canonicalClaimSemantics(candidate) === canonicalClaimSemantics(claim))
        : undefined;
      if (prior) {
        matchedPrior.add(prior.claim_id);
        preservedClaimIds.push(prior.claim_id);
        return { ...claim, claim_id: prior.claim_id };
      }
      return { ...claim, claim_id: `CL-${String(nextClaimNumber++).padStart(3, "0")}` };
    });
    const superseded = input.prior.claims
      .filter((claim) => claim.status !== "SUPERSEDED" && !matchedPrior.has(claim.claim_id))
      .map((claim) => {
        reopenedConsumers.push(...claim.consumers);
        return { ...claim, status: "SUPERSEDED" as const };
      });
    const historical = input.prior.claims.filter((claim) => claim.status === "SUPERSEDED");
    const activeClaims = claims;
    const availableHistory = Math.max(0, 64 - activeClaims.length);
    const retainedHistory = [...historical, ...superseded]
      .sort((left, right) => Number(right.claim_id.slice(3)) - Number(left.claim_id.slice(3)))
      .slice(0, availableHistory);
    supersededClaimIds.push(...retainedHistory.map((claim) => claim.claim_id));
    claims = [...retainedHistory, ...activeClaims].sort((left, right) => left.claim_id.localeCompare(right.claim_id));
  }
  const matched = (POLICY_BUNDLE.policies as AdmissionPolicy[]).filter((policy) => policyMatches(policy, tags));
  const definitions = controlMap();
  const controlSet = new Set<ControlPack>();
  const effectiveByPolicy = new Map<string, ControlPack[]>();
  const requiredBy = new Map<ControlPack, AdmissionPolicy[]>();
  const forbiddenBy = new Map<ControlPack, AdmissionPolicy[]>();
  let route = classifyBaseRoute(intent, relation, tags);
  let assurance: typeof ASSURANCE[number] = "BASIC";
  let evidence: typeof EVIDENCE[number] = route === "NO_WORKFLOW" ? "EXPLANATION" : "TARGETED";
  const missingAuthority: string[] = [];
  const gaps: string[] = [...semantic.uncertainties];
  if (claims.some((claim) => claim.status === "UNKNOWN")) gaps.push("unresolved semantic claim");
  if (HARD_ACTIONS.includes(authorityClass as HardActionClass) && !tags.has(`requested-${authorityClass.toLowerCase().replace("_", "-")}`)) gaps.push("verified direct-user authority claim required for hard action");
  const conflicts: string[] = claims.filter((claim) => claim.status === "CONFLICTING").map((claim) => `conflicting claim: ${claim.claim_id}`);
  for (const policy of matched) {
    const effectiveControls = unique(policy.required_controls.flatMap((control) => expandControl(control, definitions))).sort((left, right) => CONTROL_PACKS.indexOf(left) - CONTROL_PACKS.indexOf(right));
    effectiveByPolicy.set(policy.id, effectiveControls);
    for (const control of effectiveControls) {
      controlSet.add(control);
      requiredBy.set(control, [...(requiredBy.get(control) ?? []), policy]);
    }
    for (const control of policy.forbidden_controls) forbiddenBy.set(control, [...(forbiddenBy.get(control) ?? []), policy]);
    route = rankMax(ROUTES, route, policy.minimum_route);
    assurance = rankMax(ASSURANCE, assurance, policy.minimum_assurance);
    evidence = rankMax(EVIDENCE, evidence, policy.minimum_evidence);
    if (policy.priority === "HARD_DENY") conflicts.push(`${policy.id}:${policy.conflict_set ?? "hard-deny"}`);
  }
  const requestedClasses = requestedHardActionClasses(tags);
  for (const actionClass of requestedClasses) {
    const authorityName = actionClass.toLowerCase().replace("_", "-");
    missingAuthority.push(authorityName, "trusted-host-hard-action-receipt");
    gaps.push(`trusted host receipt required for ${actionClass}`);
  }
  if (!directUserAttested && inferredTags.some((tag) => ["external-write", "privileged", "destructive"].includes(tag))) {
    gaps.push("trusted direct-user provenance required for hard-action request");
  }
  for (const policy of matched) {
    if (!policy.approval) continue;
    missingAuthority.push(policy.approval);
  }
  for (const [control, forbidders] of forbiddenBy) {
    for (const requiring of requiredBy.get(control) ?? []) {
      for (const forbidding of forbidders) {
        const requiredRank = POLICY_PRIORITIES.indexOf(requiring.priority);
        const forbiddenRank = POLICY_PRIORITIES.indexOf(forbidding.priority);
        if (requiredRank === forbiddenRank) conflicts.push(`POLICY_CONFLICT:${control}:${requiring.id}:${forbidding.id}`);
        else if (forbiddenRank < requiredRank) controlSet.delete(control);
      }
    }
  }
  if (conflicts.length) route = "DIRECT_READ";
  const controls = [...controlSet].sort((left, right) => CONTROL_PACKS.indexOf(left) - CONTROL_PACKS.indexOf(right));
  const allGaps = unique([...missingAuthority.map((item) => `missing authority: ${item}`), ...gaps]).sort();
  const blockers = unique([
    ...(conflicts.length ? ["dependent mutation blocked by policy conflict"] : []),
    ...(allGaps.length ? ["dependent mutation blocked by unresolved admission gap"] : []),
  ]);
  const recommended = ["CONNECTED", "PROGRAM"].includes(route)
    || ["RESUMABLE", "PROGRAM"].includes(duration)
    || (topology !== "ATOMIC" && duration === "MULTI_TURN");
  const revision = (input.prior?.revision ?? 0) + 1;
  const policyDecisions = matched.map((policy) => {
    const matchedClaimIds = policyTraceClaims(claims, policy);
    if (!matchedClaimIds.length) throw new CascadeError(`policy ${policy.id} has no current claim binding`);
    const approvalGap = Boolean(policy.approval && allGaps.length && policy.priority === "APPROVAL");
    return {
      policy_id: policy.id,
      version: policy.version,
      effect: policy.priority === "HARD_DENY" ? "DENY" : approvalGap ? "GAP" : "REQUIRE",
      matched_claim_ids: matchedClaimIds,
      controls: effectiveByPolicy.get(policy.id) ?? [],
      reason: policy.rationale,
    };
  });
  const explanationTrace = policyDecisions.flatMap((decision) => decision.matched_claim_ids.flatMap((claimId) => decision.controls.map((control) => {
    const policy = matched.find((candidate) => candidate.id === decision.policy_id)!;
    const claim = claims.find((candidate) => candidate.claim_id === claimId)!;
    const signals = [...policy.match_all, ...policy.match_any].filter((tag) => claim.policy_tags.includes(tag));
    return {
      claim_id: claimId,
      signal: signals.join("+") || `dependency:${policy.required_controls.join("+") || "none"}`,
      policy_id: decision.policy_id,
      policy_version: decision.version,
      control,
      outcome: `${route}/${evidence}`,
    };
  })));
  const payload = {
    schema_version: ADMISSION_SCHEMA_VERSION,
    artifact_type: "cascade-task-envelope",
    revision,
    policy_bundle_version: ADMISSION_POLICY_BUNDLE,
    policy_bundle_digest: POLICY_BUNDLE_DIGEST,
    control_catalog_digest: CONTROL_CATALOG_DIGEST,
    request_digest: requestDigest,
    source_digest: input.source_digest,
    derivation_input: input,
    derivation_input_digest: derivationInputDigest(input),
    task_id: taskId,
    prior_envelope_id: input.prior?.envelope_id ?? null,
    produced_at: input.produced_at,
    relation,
    intent,
    claims,
    workload: { topology, effort, assurance, authority: authorityClass, evidence, duration, context },
    route,
    control_packs: controls,
    required_skills: requiredSkills(controls, intent, tags),
    evidence_floor: evidence,
    persistence: {
      recommended,
      dispatch_authorized: false,
      reason: recommended ? "multi-turn, connected, resumable, or program work requires durable checkpoints; admission cannot authorize dispatch" : "the classified request can remain turn-local",
    },
    authority: { requested: unique(input.authority_candidates).sort(), missing: unique(missingAuthority).sort(), activation: "HOST_RECEIPT_REQUIRED", local_write_scope: localWriteScope },
    policy_decisions: policyDecisions,
    explanation_trace: explanationTrace,
    reclassification: {
      preserved_claim_ids: unique(preservedClaimIds).sort(),
      superseded_claim_ids: unique(supersededClaimIds).sort(),
      reopened_consumers: unique(reopenedConsumers).sort(),
    },
    reclassification_triggers: ["material discovery", "before mutation", "plan revision", "compaction or resume", "source identity change", "failed gate", "permission change", "terminal acceptance"],
    conflicts: unique(conflicts).sort(),
    gaps: allGaps,
    blockers,
    non_goals: ["admission does not execute work", "admission does not dispatch agents or create worklines", "model interpretation cannot grant runtime authority"],
    invalidation: ["request meaning", "request or source digest", "source identity", "policy bundle", "permission", "scope", "hard-action target", "tool identity"],
  };
  return payload;
}

function buildTaskDerivationInput(input: AdmissionRequest): TaskDerivationInput {
  assertAdmissionRequestBound(input.request);
  const verifiedProvenance = verifiedStructuredRequestSpans(
    input.request,
    input.source_segments,
    input.trusted_direct_user_attestation,
  );
  const canonicalRequest = verifiedProvenance?.canonical_request ?? canonicalAdmissionRequest(input.request);
  if (!canonicalRequest.trim()) throw new CascadeError("admission request is empty after canonicalization");
  const requestSpans: RequestSpan[] = verifiedProvenance?.spans ?? [{ start: 0, end: canonicalRequest.length, source: "EXTERNAL_SOURCE" }];
  validateRequestSpans(canonicalRequest, requestSpans);
  const boundedClassificationRequest = classificationRequestFromSpans(canonicalRequest, requestSpans);
  const sourceDigest = input.source_digest ?? null;
  if (sourceDigest !== null && !/^[a-f0-9]{64}$/.test(sourceDigest)) throw new CascadeError("admission source_digest must be a lowercase SHA-256 digest");
  const taskId = input.task_id ?? input.prior_envelope?.task_id ?? "adhoc";
  if (input.prior_envelope && taskId !== input.prior_envelope.task_id) throw new CascadeError("prior task envelope belongs to a different task_id");
  return {
    schema_version: ADMISSION_SCHEMA_VERSION,
    classifier_id: "cascade-semantic-admission-v1",
    interpretation: input.interpretation!,
    canonical_request: canonicalRequest,
    classification_request: boundedClassificationRequest,
    classification_digest: sha256Text(boundedClassificationRequest),
    provenance_version: 2,
    provenance_mode: verifiedProvenance ? "TRUSTED_SOURCE_SEGMENTS" : "UNVERIFIED_SOURCE",
    source_segments_digest: sourceSegmentsDigest(requestSpans),
    direct_user_attestation: verifiedProvenance?.receipt ?? null,
    request_spans: requestSpans,
    request_digest: sha256Text(canonicalRequest),
    source_digest: sourceDigest,
    task_id: taskId,
    produced_at: input.produced_at ?? utcNow(),
    relation_override: input.relation ?? null,
    intent_override: input.intent ?? null,
    authority_candidates: unique(input.authority ?? []).sort(),
    candidate_tags: unique(input.candidate_tags ?? []).sort(),
    prior: input.prior_envelope ? {
      envelope_id: input.prior_envelope.envelope_id,
      revision: input.prior_envelope.revision,
      task_id: input.prior_envelope.task_id,
      request_digest: input.prior_envelope.request_digest,
      source_digest: input.prior_envelope.source_digest,
      intent: input.prior_envelope.intent,
      provenance_mode: input.prior_envelope.derivation_input.provenance_mode,
      direct_user_attestation: input.prior_envelope.derivation_input.direct_user_attestation,
      claims: structuredClone(input.prior_envelope.claims),
    } : null,
    authenticity: verifiedProvenance ? "TRUSTED_DIRECT_USER_ATTESTATION" : "UNVERIFIED_SOURCE",
  };
}

export interface SemanticAdmissionInterpretation {
  schema_version: 1;
  artifact_type: "cascade-admission-interpretation";
  status: "RESOLVED" | "UNRESOLVED";
  request_digest: string;
  prior_envelope_id: string | null;
  model_id: string;
  relation: Relation;
  intent: Intent;
  policy_tags: string[];
  workload: {
    topology: typeof TOPOLOGY[number];
    effort: typeof EFFORT[number];
    authority: AuthorityClass;
    duration: typeof DURATION[number];
  };
  local_write_scope: TaskEnvelope["authority"]["local_write_scope"];
  claims: Array<{ kind: TaskClaim["kind"]; statement: string; confidence: number; policy_tags: string[] }>;
  uncertainty: string[];
}

export function validateAdmissionInterpretation(value: unknown): asserts value is SemanticAdmissionInterpretation {
  assertJsonSchema(value, { $schema: ENVELOPE_SCHEMA.$schema, $defs: ENVELOPE_SCHEMA.$defs, $ref: "#/$defs/admissionInterpretation" }, "$");
  const proposal = value as SemanticAdmissionInterpretation;
  if (proposal.status !== "RESOLVED" || proposal.uncertainty.length) throw new CascadeError("semantic admission is unresolved; repair or clarify before compiling an envelope");
  requireString(proposal.model_id, "semantic admission model_id");
  proposal.claims.forEach((claim) => requireString(claim.statement, "semantic admission claim"));
  for (const tag of [...proposal.policy_tags, ...proposal.claims.flatMap((claim) => claim.policy_tags)]) {
    if (tag === "always" || tag.startsWith("requested-")) throw new CascadeError("model admission tags cannot establish requested authority");
  }
  const represented = new Set(proposal.claims.flatMap((claim) => claim.policy_tags));
  if (proposal.policy_tags.some((tag) => !represented.has(tag)) || [...represented].some((tag) => !proposal.policy_tags.includes(tag))) throw new CascadeError("semantic admission policy tags must be bound to declared claims");
  if (proposal.claims.some((claim) => containsRawSecret(claim.statement))) throw new CascadeError("semantic admission claims contain unredacted secret material");
  const scope = proposal.local_write_scope;
  if (scope.targets.some((target) => canonicalLocalWriteTarget(target) !== target)) throw new CascadeError("semantic admission write targets must be canonical repository-relative paths");
  if (scope.mode === "REPOSITORY" && scope.targets.length) throw new CascadeError("repository write scope cannot also name targets");
  if (proposal.workload.authority !== "LOCAL_WRITE" && (scope.mode !== "TARGETS" || scope.targets.length)) throw new CascadeError("non-local admission cannot declare a local write scope");
  if (["ANSWER", "DISCOVER", "DIAGNOSE", "REVIEW", "VALIDATE"].includes(proposal.intent) && proposal.workload.authority !== "READ_ONLY") throw new CascadeError("read-only semantic intent cannot declare mutation authority");
}

export function semanticAdmissionRequest(request: string): { request: string; request_digest: string } {
  const canonical = canonicalAdmissionRequest(request);
  if (!canonical.trim()) throw new CascadeError("semantic admission request is empty after redaction");
  return { request: canonical, request_digest: sha256Text(canonical) };
}

function normalizeSemanticInterpretation(input: AdmissionRequest): AdmissionRequest {
  if (input.semantic_interpretation === undefined) return input;
  if (input.interpretation !== undefined) throw new CascadeError("admission cannot combine two interpretation formats");
  if (input.relation || input.intent) throw new CascadeError("semantic admission cannot consume legacy overrides");
  const proposal = input.semantic_interpretation;
  validateAdmissionInterpretation(proposal);
  if (proposal.request_digest !== canonicalAdmissionRequestDigest(input.request) || proposal.prior_envelope_id !== (input.prior_envelope?.envelope_id ?? null)) throw new CascadeError("semantic admission request or prior-envelope binding is stale");
  if (proposal.relation === "CONTINUE" && !input.prior_envelope) throw new CascadeError("semantic continuation requires the bound prior envelope");
  return { ...input, interpretation: {
    schema_version: 1, interpreter: { kind: "LLM", model: proposal.model_id },
    request_digest: proposal.request_digest,
    task_id: input.task_id ?? input.prior_envelope?.task_id ?? "adhoc", source_digest: input.source_digest ?? null,
    relation: proposal.relation, intent: proposal.intent,
    claims: proposal.claims.map((claim, index) => ({
      ...claim, claim_id: `CL-${String(index + 1).padStart(3, "0")}`,
      source: "MODEL_INFERENCE", status: "INFERRED",
      verification: "LLM proposal; verify against current scoped evidence and native host authority",
      consumers: ["route", "validation", "tool-enforcement"], invalidation: ["request", "source", "permission"],
    })),
    workload: { ...proposal.workload, context: "TARGETED_PROBE" },
    local_write_scope: proposal.local_write_scope, uncertainties: proposal.uncertainty,
  } };
}

export async function compileTaskEnvelope(input: AdmissionRequest): Promise<TaskEnvelope> {
  input = normalizeSemanticInterpretation(input);
  assertAdmissionRequestBound(input.request);
  // Normal runtime compilation validates only the policy, control, and envelope
  // contracts loaded by this process. The 981-case corpus is a source-checkout
  // regression suite and must never become a per-request runtime dependency.
  validateAdmissionRuntime();
  if (input.prior_envelope) validateTaskEnvelope(input.prior_envelope);
  if (!input.interpretation) throw new CascadeError("LLM interpretation required; submit --interpretation using .codex/task-admission/interpretation.schema.json (no lexical fallback)");
  if ((input.relation && input.relation !== input.interpretation.relation) || (input.intent && input.intent !== input.interpretation.intent)) throw new CascadeError("admission override conflicts with LLM interpretation");
  const derivationInput = buildTaskDerivationInput(input);
  const envelope = sealEnvelope(deriveTaskEnvelopePayload(derivationInput));
  validateTaskEnvelope(envelope);
  return envelope;
}

function toolText(input: unknown): string {
  if (typeof input === "string") return input;
  return stableJson(input ?? {});
}

function shellCommand(input: unknown): string {
  if (typeof input === "string") return input;
  if (isObject(input)) {
    if (typeof input.cmd === "string") return input.cmd;
    if (typeof input.command === "string") return input.command;
  }
  return toolText(input);
}

function strongestAction(actions: ToolActionClass[]): ToolActionClass {
  const order: ToolActionClass[] = ["READ_ONLY", "HOST_LOCAL_WORKFLOW", "LOCAL_WRITE", "EXTERNAL_WRITE", "PRIVILEGED", "DESTRUCTIVE"];
  return actions.sort((left, right) => order.indexOf(right) - order.indexOf(left))[0] ?? "READ_ONLY";
}

function nestedCallArgument(text: string, openIndex: number): string | null {
  let depth = 1;
  let quote: string | null = null;
  for (let index = openIndex + 1; index < text.length; index += 1) {
    const character = text[index]!;
    if (character === "\\") { index += 1; continue; }
    if (quote) {
      if (character === quote) quote = null;
      continue;
    }
    if (["\"", "'", "`"].includes(character)) { quote = character; continue; }
    if (character === "(") depth += 1;
    else if (character === ")") {
      depth -= 1;
      if (depth === 0) return text.slice(openIndex + 1, index);
    }
  }
  return null;
}

function literalShellCommand(argument: string): string | null {
  if (argument.includes("...")) return null;
  const prefix = /^\s*\{\s*(?:cmd|command)\s*:\s*(["'`])/i.exec(argument);
  if (!prefix) return null;
  const quote = prefix[1]!;
  const start = prefix[0]!.length;
  let end = start;
  for (; end < argument.length; end += 1) {
    if (argument[end] !== quote) continue;
    let escapes = 0;
    for (let cursor = end - 1; cursor >= start && argument[cursor] === "\\"; cursor -= 1) escapes += 1;
    if (escapes % 2 === 0) break;
  }
  if (end >= argument.length) return null;
  const literal = argument.slice(start, end);
  if (quote === "`" && literal.includes("${")) return null;
  const remainder = argument.slice(end + 1);
  if (!/^\s*(?:,[\s\S]*)?\}\s*$/.test(remainder) || /\b(?:cmd|command)\s*:|\.\.\./i.test(remainder)) return null;
  return literal.replace(/\\r\\n|\\n|\\r/g, "\n").replace(/\\t/g, "\t");
}

function isBoundedLocalValidation(segment: string): boolean {
  if (/^(?:pytest|ruff|mypy)\b/.test(segment) || /^make\s+test\b/.test(segment)) return true;
  if (/^python(?:3(?:\.\d+)*)?\s+-m\s+(?:pytest|ruff|mypy)\b/.test(segment)) return true;
  return /^uv\s+run(?:\s+--[^\s]+(?:=\S+)?)*\s+(?:(?:python(?:3(?:\.\d+)*)?\s+-m\s+)?(?:pytest|ruff|mypy))\b/.test(segment);
}

function isKnownReadShell(segment: string): boolean {
  if (/^find\b/.test(segment)) {
    return !/\s-(?:delete|exec|execdir|ok|okdir|fprint0?|fprintf|fls)\b/.test(segment);
  }
  if (/^rg\b/.test(segment)) return !/\s--(?:pre|pre-glob)(?:=|\s|$)/.test(segment);
  if (/^git\b/.test(segment)) {
    if (/^git\s+(?:-c\b|--config-env\b|--exec-path\b|--paginate\b|-p\b)/.test(segment)) return false;
    if (/\s(?:--output(?:=|\s)|--ext-diff\b|--textconv\b|--open-files-in-pager\b)/.test(segment)) return false;
    return /^git\s+(?:status|diff|log|show|rev-parse|ls-files|grep|branch\s+--show-current|remote\s+-v)\b/.test(segment);
  }
  if (/^curl\b/.test(segment)) {
    return !/(?:^|\s)(?:-[dftokcDOKF](?:\s|=|[^-\s])|--(?:data(?:-binary|-raw|-urlencode)?|form(?:-string)?|json|upload-file|request|output|remote-name|remote-header-name|output-dir|dump-header|cookie-jar|trace|trace-ascii|libcurl|config|create-dirs|remove-on-error|stderr|hsts|alt-svc)(?:=|\s|$))/i.test(segment);
  }
  if (/^sed\b/.test(segment)) return classifySedEffect(segment) === "READ_ONLY";
  return /^(?:command\s+-v|which|pwd|ls|grep|head|tail|cat|wc|stat|jq|docker\s+(?:ps|inspect|images|container\s+ls)|kubectl\s+(?:get|describe|logs)|gh\s+(?:pr|issue|run)\s+view|helm\s+(?:list|status|get|show|template)|pulumi\s+(?:preview|stack\s+output))\b/.test(segment);
}

function cloudCommandPositionals(
  tokens: string[],
  start: number,
  valueOptions: Set<string>,
  flagOptions: Set<string>,
): string[] {
  const positionals: string[] = [];
  for (let index = start; index < tokens.length; index += 1) {
    const token = tokens[index]!;
    if (!token.startsWith("-")) {
      positionals.push(token);
      continue;
    }
    const option = token.split("=", 1)[0]!;
    if (valueOptions.has(option)) {
      if (!token.includes("=") && tokens[index + 1] && !tokens[index + 1]!.startsWith("-")) index += 1;
      continue;
    }
    if (flagOptions.has(option)) continue;
    if (!positionals.length) return [];
    break;
  }
  return positionals;
}

function classifyCloudShell(segment: string): AuthorityClass | null {
  const tokens = segment.match(/"(?:\\.|[^"])*"|'(?:\\.|[^'])*'|\S+/g)?.map((token) => token.replace(/^["']|["']$/g, "").toLowerCase()) ?? [];
  if (tokens[0] === "aws") {
    const valueOptions = new Set(["--profile", "--region", "--endpoint-url", "--output", "--query", "--ca-bundle", "--cli-read-timeout", "--cli-connect-timeout", "--color"]);
    const flagOptions = new Set(["--debug", "--no-sign-request", "--no-verify-ssl", "--no-cli-pager", "--cli-auto-prompt", "--no-cli-auto-prompt"]);
    const [service, operation] = cloudCommandPositionals(tokens, 1, valueOptions, flagOptions);
    if (!service || !operation) return "EXTERNAL_WRITE";
    if (service === "s3" && ["ls", "presign"].includes(operation)) return "READ_ONLY";
    if (/^(?:describe|list|get|head|lookup|search)/.test(operation)) return "READ_ONLY";
    if (/^(?:delete|terminate|remove|purge|destroy|empty|truncate|deregister|revoke)/.test(operation) || ["rm", "rb"].includes(operation)) return "DESTRUCTIVE";
    return "EXTERNAL_WRITE";
  }
  if (tokens[0] === "az") {
    const valueOptions = new Set(["--subscription", "--resource-group", "--tenant", "--output", "--query"]);
    const flagOptions = new Set(["--debug", "--verbose", "--only-show-errors"]);
    const commandTokens = cloudCommandPositionals(tokens, 1, valueOptions, flagOptions);
    const action = commandTokens.find((token) => /^(?:delete|remove|purge|destroy|terminate|empty|truncate|deregister|revoke)$/.test(token)) ?? commandTokens.at(-1);
    if (!action) return "EXTERNAL_WRITE";
    if (/^(?:list|show|get|check|exists)$/.test(action)) return "READ_ONLY";
    if (/^(?:delete|remove|purge|destroy|terminate|empty|truncate|deregister|revoke)$/.test(action)) return "DESTRUCTIVE";
    return "EXTERNAL_WRITE";
  }
  if (tokens[0] === "gcloud") {
    const valueOptions = new Set(["--account", "--billing-project", "--configuration", "--flags-file", "--impersonate-service-account", "--project", "--quiet", "--trace-token", "--user-output-enabled"]);
    const flagOptions = new Set(["--verbosity", "--no-user-output-enabled"]);
    const commandTokens = cloudCommandPositionals(tokens, 1, valueOptions, flagOptions);
    const action = commandTokens.find((token) => /^(?:delete|remove|purge|destroy|terminate|empty|truncate|deregister|revoke)$/.test(token)) ?? commandTokens.at(-1);
    if (!action) return "EXTERNAL_WRITE";
    if (/^(?:describe|list|get|show|check|read)$/.test(action)) return "READ_ONLY";
    if (/^(?:delete|remove|purge|destroy|terminate|empty|truncate|deregister|revoke)$/.test(action)) return "DESTRUCTIVE";
    return "EXTERNAL_WRITE";
  }
  return null;
}

function hasDynamicShellComposition(text: string): boolean {
  let quote: "'" | '"' | null = null;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]!;
    if (character === "\\") { index += 1; continue; }
    if (quote) {
      if (character === quote) quote = null;
      else if (quote === '"' && (character === "`" || character === "$")) return true;
      continue;
    }
    if (character === "'" || character === '"') { quote = character; continue; }
    if (character === "`" || character === "$" || ((character === "<" || character === ">") && text[index + 1] === "(")) return true;
    if (character === "|" && text[index - 1] !== "|" && text[index + 1] !== "|") return true;
    if (character === "&" && text[index - 1] !== "&" && text[index + 1] !== "&") {
      if ((text[index - 1] === ">" || text[index - 1] === "<") && /[0-9-]/.test(text[index + 1] ?? "")) continue;
      return true;
    }
  }
  return false;
}

function normalizeStaticShellLexemes(text: string): string | null {
  let normalized = "";
  let quote: "'" | '"' | null = null;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]!;
    if (quote) {
      if (character === quote) { quote = null; continue; }
      if (character === "\\" && quote === '"') {
        const next = text[index + 1];
        if (next === "\r" && text[index + 2] === "\n") { index += 2; continue; }
        if (next === "\n") { index += 1; continue; }
        if (next === undefined) return null;
        if (["$", "`", '"', "\\"].includes(next)) { normalized += next; index += 1; continue; }
        normalized += `\\${next}`;
        index += 1;
        continue;
      }
      normalized += character;
      continue;
    }
    if (character === "'" || character === '"') { quote = character; continue; }
    if (character === "`") return null;
    if (character === "\\") {
      const next = text[index + 1];
      if (next === "\r" && text[index + 2] === "\n") { index += 2; continue; }
      if (next === "\n") { index += 1; continue; }
      if (next === undefined) return null;
      normalized += next;
      index += 1;
      continue;
    }
    normalized += character;
  }
  return quote ? null : normalized;
}

function hasUnquotedShellExpansionSyntax(text: string): boolean {
  let quote: "'" | '"' | null = null;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]!;
    if (character === "\\") { index += 1; continue; }
    if (quote) {
      if (character === quote) quote = null;
      continue;
    }
    if (character === "'" || character === '"') { quote = character; continue; }
    if (["*", "?", "[", "]", "{", "}"].includes(character)) return true;
  }
  return false;
}

function hasAmbiguousGitShellGrammar(text: string): boolean {
  const trimmed = text.trim();
  const gitLike = /^(?:(?:env\s+)?(?:[A-Za-z_][A-Za-z0-9_]*=\S+\s+)*)?(?:git(?:\s|$)|g[?*[{])/i.test(trimmed);
  return gitLike && hasUnquotedShellExpansionSyntax(trimmed);
}

function sedDelimitedAddressEnd(program: string, start: number, delimiter: string): number | null {
  for (let index = start; index < program.length; index += 1) {
    if (program[index] === "\\") { index += 1; continue; }
    if (program[index] === delimiter) return index + 1;
  }
  return null;
}

function sedAddressEnd(program: string, start: number): number | null {
  let index = start;
  while (/\s/.test(program[index] ?? "")) index += 1;
  if (/\d/.test(program[index] ?? "")) {
    while (/\d/.test(program[index] ?? "")) index += 1;
    if (program[index] === "~") {
      index += 1;
      const stepStart = index;
      while (/\d/.test(program[index] ?? "")) index += 1;
      if (index === stepStart) return null;
    }
    return index;
  }
  if (program[index] === "$") return index + 1;
  if (program[index] === "/") return sedDelimitedAddressEnd(program, index + 1, "/");
  if (program[index] === "\\" && program[index + 1] && !/[a-z0-9\s]/i.test(program[index + 1]!)) {
    const delimiter = program[index + 1]!;
    return sedDelimitedAddressEnd(program, index + 2, delimiter);
  }
  return null;
}

function sedProgramEffect(program: string): AuthorityClass {
  let index = 0;
  while (/\s/.test(program[index] ?? "")) index += 1;
  const firstAddressEnd = sedAddressEnd(program, index);
  if (firstAddressEnd !== null) {
    index = firstAddressEnd;
    while (/\s/.test(program[index] ?? "")) index += 1;
    if (program[index] === ",") {
      const secondAddressEnd = sedAddressEnd(program, index + 1);
      if (secondAddressEnd === null) return "EXTERNAL_WRITE";
      index = secondAddressEnd;
    }
  }
  while (/\s/.test(program[index] ?? "")) index += 1;
  if (program[index] === "!") {
    index += 1;
    while (/\s/.test(program[index] ?? "")) index += 1;
  }
  const command = program[index];
  if (command === "{") {
    const closing = program.lastIndexOf("}");
    if (closing <= index) return "EXTERNAL_WRITE";
    const nested = splitSedProgramList(program.slice(index + 1, closing));
    return nested.length ? strongestAction(nested.map(sedProgramEffect)) as AuthorityClass : "READ_ONLY";
  }
  if (command === "e") return "DESTRUCTIVE";
  if (command === "w" || command === "W") return "LOCAL_WRITE";
  if (command === "s") {
    const delimiter = program[index + 1];
    if (!delimiter || /[a-z0-9\s]/i.test(delimiter)) return "EXTERNAL_WRITE";
    const patternEnd = sedDelimitedAddressEnd(program, index + 2, delimiter);
    if (patternEnd === null) return "EXTERNAL_WRITE";
    const replacementEnd = sedDelimitedAddressEnd(program, patternEnd, delimiter);
    if (replacementEnd === null) return "EXTERNAL_WRITE";
    const flags = program.slice(replacementEnd).trim();
    if (/(?:^|[0-9/])e(?:[0-9/]|$)/i.test(flags)) return "DESTRUCTIVE";
    if (/^[0-9a-z]*[wW](?:[0-9a-z]*\s|\s|$)/.test(flags)) return "LOCAL_WRITE";
  }
  return "READ_ONLY";
}

function splitSedProgramList(program: string): string[] {
  const programs: string[] = [];
  let start = 0;
  let escaped = false;
  let braceDepth = 0;
  for (let index = 0; index < program.length; index += 1) {
    const character = program[index]!;
    if (escaped) { escaped = false; continue; }
    if (character === "\\") { escaped = true; continue; }
    if (character === "{") braceDepth += 1;
    else if (character === "}") braceDepth = Math.max(0, braceDepth - 1);
    else if (character === ";" && braceDepth === 0) {
      if (program.slice(start, index).trim()) programs.push(program.slice(start, index).trim());
      start = index + 1;
    }
  }
  if (program.slice(start).trim()) programs.push(program.slice(start).trim());
  return programs;
}

interface ShellWord { value: string; quoted: boolean; dynamic: boolean }

function shellWords(text: string): ShellWord[] | null {
  const words: ShellWord[] = [];
  let value = "";
  let quoted = false;
  let dynamic = false;
  let quote: "'" | '"' | null = null;
  const flush = () => {
    if (!value.length && !quoted) return;
    words.push({ value, quoted, dynamic });
    value = "";
    quoted = false;
    dynamic = false;
  };
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]!;
    if (quote) {
      if (character === quote) { quote = null; quoted = true; continue; }
      if (character === "\\" && quote === '"' && index + 1 < text.length) value += text[++index]!;
      else value += character;
      continue;
    }
    if (character === "'" || character === '"') { quote = character; quoted = true; continue; }
    if (character === "\\" && index + 1 < text.length) { value += text[++index]!; quoted = true; continue; }
    if (/\s/.test(character)) { flush(); continue; }
    if (/[?*\[\]{}]/.test(character)) dynamic = true;
    value += character;
  }
  if (quote) return null;
  flush();
  return words;
}

interface SedInvocation {
  effect: AuthorityClass;
  files: string[];
  output_files: string[];
  unresolved: boolean;
}

function parseSedInvocation(segment: string): SedInvocation | null {
  const words = shellWords(segment);
  if (!words) return { effect: "DESTRUCTIVE", files: [], output_files: [], unresolved: true };
  const sedIndex = words.findIndex((word) => /^(?:.*\/)?sed$/i.test(word.value));
  if (sedIndex < 0) return null;
  const programs: string[] = [];
  const positionals: string[] = [];
  let inPlace = false;
  let unresolved = false;
  let explicitProgram = false;
  for (let index = sedIndex + 1; index < words.length; index += 1) {
    const token = words[index]!.value;
    if (token === "--") {
      positionals.push(...words.slice(index + 1).map((word) => word.value));
      break;
    }
    if (token === "-e" || token === "--expression") {
      const next = words[++index]?.value;
      if (next === undefined) { unresolved = true; break; }
      programs.push(next); explicitProgram = true; continue;
    }
    if (token.startsWith("--expression=")) { programs.push(token.slice("--expression=".length)); explicitProgram = true; continue; }
    if (/^-e.+/.test(token)) { programs.push(token.slice(2)); explicitProgram = true; continue; }
    if (token === "-f" || token === "--file" || token.startsWith("--file=") || /^-f.+/.test(token)) {
      if ((token === "-f" || token === "--file") && words[++index] === undefined) unresolved = true;
      unresolved = true;
      continue;
    }
    if (token === "-i") {
      inPlace = true;
      if (words[index + 1]?.quoted && words[index + 1]!.value === "") index += 1;
      continue;
    }
    if (token === "--in-place") { inPlace = true; continue; }
    if (token.startsWith("--in-place=")) {
      inPlace = true;
      if (token.slice("--in-place=".length)) unresolved = true;
      continue;
    }
    if (/^-i.+/.test(token)) { inPlace = true; unresolved = true; continue; }
    if (/^-[A-Za-z]+$/.test(token)) {
      const cluster = token.slice(1);
      if (/[^neErsuz]/.test(cluster)) { unresolved = true; continue; }
      if (cluster.includes("e")) {
        const next = words[++index]?.value;
        if (next === undefined) unresolved = true;
        else { programs.push(next); explicitProgram = true; }
      }
      continue;
    }
    if (token === "--quiet" || token === "--silent" || token === "--regexp-extended" || token === "--posix" || token === "--separate" || token === "--unbuffered" || token.startsWith("--sandbox")) continue;
    if (token.startsWith("-")) { unresolved = true; continue; }
    positionals.push(token);
  }
  if (!explicitProgram) {
    const program = positionals.shift();
    if (program === undefined) unresolved = true;
    else programs.push(program);
  }
  const effects = programs.flatMap(splitSedProgramList).map(sedProgramEffect);
  const effect = unresolved ? "DESTRUCTIVE" : inPlace ? "LOCAL_WRITE" : strongestAction(effects) as AuthorityClass;
  const outputFiles: string[] = [];
  for (const program of programs.flatMap(splitSedProgramList)) {
    for (const match of program.matchAll(/(?:^|[;}\s])(?:[wW]|s[^\n]*?[wW])\s+([^;}\s]+)/g)) outputFiles.push(match[1]!);
  }
  return { effect, files: positionals, output_files: outputFiles, unresolved };
}

function classifySedEffect(text: string): AuthorityClass | null {
  if (!/\bsed\b/i.test(text)) return null;
  const invocations = splitShellSegments(text).map(parseSedInvocation).filter((value): value is SedInvocation => value !== null);
  return invocations.length ? strongestAction(invocations.map((value) => value.effect)) as AuthorityClass : null;
}

function splitShellSegments(text: string): string[] {
  const segments: string[] = [];
  let start = 0;
  let quote: "'" | '"' | null = null;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]!;
    if (character === "\\") { index += 1; continue; }
    if (quote) {
      if (character === quote) quote = null;
      continue;
    }
    if (character === "'" || character === '"') { quote = character; continue; }
    const width = text.slice(index, index + 2) === "&&" || text.slice(index, index + 2) === "||" ? 2 : character === ";" || character === "\n" ? 1 : 0;
    if (!width) continue;
    if (text.slice(start, index).trim()) segments.push(text.slice(start, index).trim());
    start = index + width;
    index += width - 1;
  }
  if (text.slice(start).trim()) segments.push(text.slice(start).trim());
  return segments;
}

function classifyShellText(text: string): AuthorityClass {
  const raw = text.trim();
  const lower = raw.toLowerCase();
  if (!lower) return "EXTERNAL_WRITE";
  const rawGitAction = classifyEnvGitAction(raw);
  if (rawGitAction) return rawGitAction;
  if (hasDynamicShellComposition(raw)) return "DESTRUCTIVE";
  if (hasAmbiguousGitShellGrammar(raw)) return "DESTRUCTIVE";
  const staticLexical = normalizeStaticShellLexemes(raw);
  if (staticLexical === null) return "DESTRUCTIVE";
  const staticLower = staticLexical.toLowerCase();
  const gitAction = classifyEnvGitAction(staticLexical);
  if (gitAction === "DESTRUCTIVE") return "DESTRUCTIVE";
  if (gitAction === "READ_ONLY") return "READ_ONLY";
  const gitPush = gitAction === "EXTERNAL_WRITE";
  const sedEffect = classifySedEffect(raw);
  const packageScript = /^(?:npm|pnpm|yarn|bun)\s+(?:run|run-script)\s+([a-z0-9:_-]+)\b/i.exec(raw)?.[1]?.toLowerCase();
  if (packageScript && /(?:^|[:_-])(?:deploy|release|publish|ship|upload|push)(?:$|[:_-])/.test(packageScript)) return "EXTERNAL_WRITE";
  if (packageScript && !/^(?:test(?::[a-z0-9:_-]+)?|lint|format|fmt|check|typecheck|validate|build)$/.test(packageScript)) return "DESTRUCTIVE";
  const gitRestore = /\bgit(?:\s+-c\s+\S+)*\s+restore\b([^\n;&|]*)/.exec(lower)?.[1] ?? null;
  const destructiveGitRestore = gitRestore !== null && (!/(?:^|\s)--staged(?:\s|$)/.test(gitRestore) || /(?:^|\s)--worktree(?:\s|$)/.test(gitRestore));
  const destructiveGitPush = /\bgit\s+push\b[^\n;&|]*(?:--de(?:l(?:e(?:t(?:e)?)?)?)?(?:=|\b)|--forc(?:e(?:-with-lease)?)?(?:=|\b)|--mi(?:r(?:r(?:o(?:r)?)?)?)?\b|--pr(?:u(?:n(?:e)?)?)?\b|(?:^|\s)-[a-z0-9]*f[a-z0-9]*(?:\s|$)|(?:^|\s)\+(?=\S)|(?:^|\s):(?=\S)|(?:^|\s)[^\s]+:(?:[.,;!?]+)?(?=\s|$))/.test(staticLower);
  const destructive = sedEffect === "DESTRUCTIVE" || destructiveGitRestore || destructiveGitPush || [
    /\b(?:rm|rmdir|unlink|shred)\s+(?:-[a-z0-9-]+\s+)*[^\s]/,
    /\bgit(?:\s+-c\s+\S+)*\s+(?:reset\s+(?:--hard|--merge|--keep)|clean\b[^\n;&|]*(?:-[a-z]*f[a-z]*\b|--force\b)|checkout\s+(?:(?:-[a-z]*f[a-z]*|--force)\b|(?:\S+\s+)?--\s+|(?:\.\.?\/|\.\.?$|\S+\/|\S+\.[A-Za-z0-9_-]+\b))|switch\b[^\n;&|]*(?:-[a-z]*f[a-z]*\b|--force\b|--discard-changes\b)|worktree\s+(?:remove|prune)\b|branch\s+(?:-[dD]\b|--delete\b)|tag\s+(?:-d\b|--delete\b)|remote\s+(?:remove|rm)\b|update-ref\s+-d\b|reflog\s+expire\b|gc\b[^\n;&|]*--prune|stash\s+(?:drop|clear|pop)\b|rm\b)/,
    /\bfind\b[^\n]*\s-delete\b/,
    /\bfind\b[^\n]*\s-exec(?:dir)?\s+(?:rm|rmdir|unlink|shred)\b/,
    /\btruncate\b[^\n;]*(?:-s\s*0|--size(?:=|\s+)0)\b/,
    /(?:^|[;&|]\s*|\n\s*)(?::|true|cat\s+\/dev\/null|printf\s+["']{2})\s*>\s*[^>|=]/,
    /\bdd\b[^\n;]*\bif=\/dev\/(?:null|zero)\b[^\n;]*\bof=\S+/,
    /\bcp\s+(?:-[a-z0-9-]+\s+)*\/dev\/null\s+[^\s;&|]+/,
    /\bdrop\s+(?:table|database)\b/,
    /\bdelete\s+from\b/,
    /\btruncate\s+table\b/,
    /\b(?:remove|clear|uninstall)-(?:item|itemproperty|content|disk|partition|volume|az[a-z0-9_-]*)\b/,
    /(?:^|[;&|]\s*|\n\s*)(?:del|erase|rd)\s+(?:\/[a-z]+\s+|-[a-z]+\s+)*[^\s]/,
    /\b(?:os\.(?:remove|unlink)|shutil\.rmtree|fs\.(?:rm|rmdir|unlink|truncate)|deno\.remove|file\.(?:delete|unlink))\b/,
    /\b(?:node:)?fs(?:\[['"](?:rm|rmdir|unlink|truncate)(?:sync)?['"]\]|\.(?:rm|rmdir|unlink|truncate)(?:sync)?)\b/,
    /\brequire\s*\(\s*["'](?:node:)?fs["']\s*\)\s*\.\s*(?:rm|rmdir|unlink|truncate)(?:sync)?\b/,
    /\brsync\b[^\n;&|]*--delete\b|\btar\b[^\n;&|]*--delete\b/,
    /\b(?:kubectl\s+delete|helm\s+uninstall|pulumi\s+destroy|terraform\s+destroy|npm\s+unpublish)\b/,
    /\bcurl\b[^\n;&|]*(?:(?:-x|--request)(?:=|\s+)delete\b|-xdelete\b)/,
    /\bgh\s+(?:repo|pr|issue|release|secret|variable|cache)\s+delete\b|\bgh\s+api\b[^\n;&|]*(?:(?:-x|--method)(?:=|\s+)delete\b|-xdelete\b)/,
    /\b(?:vercel|fly|heroku)\b[^\n;&|]*\b(?:delete|remove|destroy|purge)\b/,
    /\bsed\b\s+(?:(?:-n|-ne|--quiet|--silent)\s+)+(?:-e\s+|--expression(?:=|\s+))?["']?(?:\d+(?:,\d+)?|\$)?e(?:\s|["']|$)/,
    /\b(?:wipe|destroy)\b/,
  ].some((pattern) => pattern.test(lower));
  if (destructive) return "DESTRUCTIVE";
  if (/\b(?:sudo|doas)\b|\bchmod\s+(?:-r\s+)?777\b|\bsecurity\s+delete\b|\brotate[^\n;]*(?:credential|secret|token)\b/.test(lower)) return "PRIVILEGED";
  if (/\bcurl\b[^\n]*(?:-K(?:\s|=|[^a-z])|--config(?:=|\s))|\bgit\s+(?:-c\b|--config-env\b|--exec-path\b|--paginate\b|-p\b)|\bfind\b[^\n]*\s-(?:ok|okdir)\b|\bhelm\b[^\n]*--post-renderer(?:=|\s)|\bsed\b[^\n]*(?:--expression(?:=|\s+)|-e\s+)["']?e\s/.test(raw)) return "DESTRUCTIVE";
  const segments = splitShellSegments(lower);
  const cloudActions = segments.map(classifyCloudShell);
  if (cloudActions.includes("DESTRUCTIVE")) return "DESTRUCTIVE";
  if (segments.length === 1 && cloudActions[0] && cloudActions[0] !== "READ_ONLY") return cloudActions[0];
  const curlAttachedWrite = /\bcurl\b[^\n]*(?:-(?:d|T)\S+|-F\S+)/.test(raw);
  if (curlAttachedWrite || gitPush || /\bcurl\b[^\n]*(?:-[xX]\s*(?:post|put|patch|delete)|--request(?:=|\s+)(?:post|put|patch|delete)|-[dt](?:\s|=)|-F(?:\s|=)|--data(?:-binary|-raw|-urlencode)?(?:\s|=)|--form(?:-string)?(?:\s|=)|--json(?:\s|=)|--upload-file(?:\s|=))|\bfind\b[^\n]*\s-exec(?:dir)?\b|\b(?:requests|httpx)\.(?:post|put|patch|delete|request)\b|\bfetch\s*\([^\n]*\bmethod\s*:\s*["'](?:post|put|patch|delete)|\b(?:wget|http|https|xh)\b[^\n]*(?:--method[= ]|\s)(?:post|put|patch|delete)\b|\bgh\s+(?:pr|issue|release)\s+(?:create|edit|close|merge|delete)|\bgh\s+api\b[^\n]*(?:-[xX]\s*(?:post|put|patch|delete)|--method\s+(?:post|put|patch|delete))|\b(?:gcloud\s+storage|gsutil|rclone)\b[^\n]*(?:cp|copy|mv|move|sync|upload)|\b(?:gcloud|vercel|fly|heroku)\b[^\n]*(?:create|update|delete|deploy|publish|push|put|patch|upload)|\b(?:npm|bun|cargo|gem)\s+publish\b|\bscp\s+|\brsync\s+[^\n]*:|\bkubectl\s+(?:apply|create|delete|patch|replace|scale)|\bhelm\s+(?:install|upgrade|uninstall|rollback|push|repo\s+(?:add|remove)|plugin\s+(?:install|uninstall|update))|\bpulumi\s+(?:up|destroy|cancel|import|config\s+set)|\bterraform\s+(?:apply|destroy)|\bdocker\s+push\b/.test(lower)) return "EXTERNAL_WRITE";
  if (sedEffect === "LOCAL_WRITE" || /(?:^|[\s;|&])(?:\d+|\{[a-z_][a-z0-9_]*\})?(?:>>?|<>)\s*(?!&)[^=]|\btee\b|\bsed\b[^\n]*(?:--in-place(?:=|\s|$)|-i(?:[^a-z\s][^\s]*)?(?:\s|$))|\bsed\b[^\n]*["']?s\/(?:\\.|[^/\n])*\/(?:\\.|[^/\n])*\/[0-9a-z]*w(?:\s|["']|$)|\bperl\s+-pi\b|\bcurl\b[^\n]*(?:-o(?:\s|=|\S)|--output(?:\s|=)|--remote-name(?:-all)?(?:\s|$)|-D(?:\s|=)|--dump-header(?:\s|=)|-c(?:\s|=)|--cookie-jar(?:\s|=)|--etag-save(?:\s|=)|--trace(?:-ascii)?(?:\s|=)|--libcurl(?:\s|=)|--stderr(?:\s|=)|--hsts(?:\s|=)|--alt-svc(?:\s|=))|\bwget\b[^\n]*(?:-o(?:\s|=)|--output-document(?:\s|=))|\bgit\s+(?:add|commit|mv|restore\s+--staged|checkout|switch|rebase|merge|cherry-pick)\b|\bgit\s+(?:status|diff|log|show|grep)\b[^\n]*(?:--output(?:=|\s)|--open-files-in-pager\b)|\bfind\b[^\n]*\s-(?:fprint0?|fprintf|fls)\b|\b(?:cp|mv|touch|mkdir|install)\s+|\b(?:set-content|add-content|new-item|rename-item|move-item|copy-item)\b|\b(?:bun|npm|pnpm|yarn|cargo|go)\s+(?:test|install|run|build|fmt)\b/.test(lower)) return "LOCAL_WRITE";

  const bounded = segments.length > 0 && segments.every((segment) => classifyCloudShell(segment) === "READ_ONLY" || isKnownReadShell(segment) || isBoundedLocalValidation(segment));
  if (bounded) {
    return segments.some(isBoundedLocalValidation) ? "LOCAL_WRITE" : "READ_ONLY";
  }
  return segments.length > 1 ? "DESTRUCTIVE" : "EXTERNAL_WRITE";
}

function mcpActionName(toolName: string): string {
  return toolName.split("__").at(-1) ?? toolName;
}

function isDeleteFilePatch(input: unknown): boolean {
  const patch = typeof input === "string"
    ? input
    : isObject(input) && typeof input.command === "string"
    ? input.command
    : isObject(input) && typeof input.patch === "string"
    ? input.patch
    : "";
  return /(?:^|\r?\n)[ \t]*\*\*\* Delete File:[^\r\n]+(?:\r?\n|$)/.test(patch);
}

function patchInputText(input: unknown): string | null {
  if (typeof input === "string") return input;
  if (!isObject(input)) return null;
  if (typeof input.command === "string") return input.command;
  if (typeof input.patch === "string") return input.patch;
  return null;
}

function hasDirectorySyntax(value: string): boolean {
  return /[\\/]$/.test(value);
}

function exactCanonicalTargets(values: string[]): string[] | null {
  if (!values.length || values.some(hasDirectorySyntax)) return null;
  const targets = values.map(canonicalLocalWriteTarget);
  return targets.every((target): target is string => target !== null) ? unique(targets).sort() : null;
}

function isRepositoryContainedTarget(target: string): boolean {
  let repository: string;
  try { repository = realpathSync(rootPath()); }
  catch { return false; }
  const candidate = resolve(repository, target);
  const lexicalRelative = relative(repository, candidate);
  if (!lexicalRelative || lexicalRelative === ".." || lexicalRelative.startsWith("../") || lexicalRelative.startsWith("..\\") || resolve(repository, lexicalRelative) !== candidate) return false;
  let current = repository;
  for (const component of lexicalRelative.split("/")) {
    current = resolve(current, component);
    try {
      const metadata = lstatSync(current);
      if (metadata.isSymbolicLink()) return false;
    } catch (error) {
      const code = isObject(error) && typeof error.code === "string" ? error.code : "";
      // The first absent component proves every descendant is absent at this
      // decision instant. Tool-side admission must repeat this walk immediately
      // before mutation; an unresolved or non-ENOENT component fails closed.
      return code === "ENOENT";
    }
  }
  return true;
}

function localWriteScopeTargetAllows(scopeTarget: string, invocationTarget: string): boolean {
  if (scopeTarget === invocationTarget) return true;
  let directory = false;
  try { directory = lstatSync(rootPath(scopeTarget)).isDirectory(); }
  catch {
    const basename = scopeTarget.split("/").at(-1) ?? scopeTarget;
    directory = !basename.includes(".");
  }
  return directory && invocationTarget.startsWith(`${scopeTarget}/`);
}

function parseTouchTargets(words: ShellWord[]): string[] | null {
  const operands: string[] = [];
  for (let index = 1; index < words.length; index += 1) {
    const token = words[index]!.value;
    if (token === "--") { operands.push(...words.slice(index + 1).map((word) => word.value)); break; }
    if (token === "-" || !token.startsWith("-")) { operands.push(token); continue; }
    if (["--no-create", "--no-dereference", "--context"].includes(token) || token.startsWith("--context=")) continue;
    if (["--date", "--reference", "--time"].includes(token)) { if (words[++index] === undefined) return null; continue; }
    if (/^--(?:date|reference|time)=.+/.test(token)) continue;
    if (token.startsWith("--")) return null;
    const cluster = token.slice(1);
    if (!cluster) { operands.push(token); continue; }
    for (let offset = 0; offset < cluster.length; offset += 1) {
      const option = cluster[offset]!;
      if ("acfhmZ".includes(option)) continue;
      if ("drt".includes(option)) {
        if (cluster.slice(offset + 1)) offset = cluster.length;
        else if (words[++index] === undefined) return null;
        break;
      }
      return null;
    }
  }
  return exactCanonicalTargets(operands);
}

function parseMkdirTargets(words: ShellWord[]): string[] | null {
  const operands: string[] = [];
  for (let index = 1; index < words.length; index += 1) {
    const token = words[index]!.value;
    if (token === "--") { operands.push(...words.slice(index + 1).map((word) => word.value)); break; }
    if (token === "-" || !token.startsWith("-")) { operands.push(token); continue; }
    if (token === "--parents") return null;
    if (["--verbose", "--context"].includes(token) || token.startsWith("--context=")) continue;
    if (token === "--mode") { if (words[++index] === undefined) return null; continue; }
    if (/^--mode=.+/.test(token)) continue;
    if (token.startsWith("--")) return null;
    const cluster = token.slice(1);
    for (let offset = 0; offset < cluster.length; offset += 1) {
      const option = cluster[offset]!;
      if (option === "p") return null;
      if ("vZ".includes(option)) continue;
      if (option === "m") {
        if (cluster.slice(offset + 1)) offset = cluster.length;
        else if (words[++index] === undefined) return null;
        break;
      }
      return null;
    }
  }
  return exactCanonicalTargets(operands);
}

function parseCopyMoveTargets(command: "cp" | "mv", words: ShellWord[]): string[] | null {
  const operands: string[] = [];
  let noTargetDirectory = false;
  let descendantsPossible = false;
  const shortFlags = command === "cp" ? "adfHilLnPpRrsuvxTZ" : "finuvTZ";
  const longFlags = command === "cp"
    ? new Set(["--archive", "--force", "--interactive", "--link", "--dereference", "--no-clobber", "--no-dereference", "--preserve", "--recursive", "--reflink", "--remove-destination", "--sparse", "--symbolic-link", "--update", "--verbose", "--one-file-system", "--context"])
    : new Set(["--force", "--interactive", "--no-clobber", "--update", "--verbose", "--context"]);
  for (let index = 1; index < words.length; index += 1) {
    const token = words[index]!.value;
    if (token === "--") { operands.push(...words.slice(index + 1).map((word) => word.value)); break; }
    if (token === "-" || !token.startsWith("-")) { operands.push(token); continue; }
    if (["--backup", "--parents", "--target-directory", "--suffix"].includes(token)
      || /^(?:--backup|--target-directory|--suffix)=/.test(token)) return null;
    if (token === "--no-target-directory") { noTargetDirectory = true; continue; }
    const longName = token.split("=", 1)[0]!;
    if (longFlags.has(longName)) {
      if (command === "cp" && ["--archive", "--recursive"].includes(longName)) descendantsPossible = true;
      continue;
    }
    if (token.startsWith("--")) return null;
    const cluster = token.slice(1);
    for (let offset = 0; offset < cluster.length; offset += 1) {
      const option = cluster[offset]!;
      if (["b", "S", "t"].includes(option)) return null;
      if (!shortFlags.includes(option)) return null;
      if (option === "T") noTargetDirectory = true;
      if (command === "cp" && ["a", "R", "r"].includes(option)) descendantsPossible = true;
    }
  }
  if (!noTargetDirectory || descendantsPossible || operands.length !== 2 || operands.some(hasDirectorySyntax)) return null;
  // A lexical mv operand does not prove that the source is a regular file.
  // Moving a directory or symlink can relocate an unbounded subtree, while a
  // TARGETS envelope intentionally grants no descendant authority. Until a
  // trusted pre-tool binding carries source-kind evidence, exact mv fails closed.
  if (command === "mv") return null;
  return exactCanonicalTargets([operands[1]!]);
}

function parseInstallTargets(words: ShellWord[]): string[] | null {
  const operands: string[] = [];
  let noTargetDirectory = false;
  for (let index = 1; index < words.length; index += 1) {
    const token = words[index]!.value;
    if (token === "--") { operands.push(...words.slice(index + 1).map((word) => word.value)); break; }
    if (token === "-" || !token.startsWith("-")) { operands.push(token); continue; }
    if (["--backup", "--directory", "--create-leading", "--target-directory", "--suffix"].includes(token)
      || /^(?:--backup|--target-directory|--suffix)=/.test(token)) return null;
    if (token === "--no-target-directory") { noTargetDirectory = true; continue; }
    if (["--compare", "--preserve-timestamps", "--strip", "--verbose", "--context"].includes(token) || token.startsWith("--context=")) continue;
    if (["--mode", "--owner", "--group", "--strip-program"].includes(token)) { if (words[++index] === undefined) return null; continue; }
    if (/^--(?:mode|owner|group|strip-program)=.+/.test(token)) continue;
    if (token.startsWith("--")) return null;
    const cluster = token.slice(1);
    for (let offset = 0; offset < cluster.length; offset += 1) {
      const option = cluster[offset]!;
      if (["b", "d", "D", "S", "t"].includes(option)) return null;
      if ("cpsvTZ".includes(option)) { if (option === "T") noTargetDirectory = true; continue; }
      if ("mog".includes(option)) {
        if (cluster.slice(offset + 1)) offset = cluster.length;
        else if (words[++index] === undefined) return null;
        break;
      }
      return null;
    }
  }
  if (!noTargetDirectory || operands.length !== 2 || operands.some(hasDirectorySyntax)) return null;
  return exactCanonicalTargets([operands[1]!]);
}

function commandLocalWriteTargets(segment: string): string[] | null {
  const words = shellWords(segment);
  if (!words?.length) return null;
  if (words[0]!.value.includes("/") || words[0]!.value.includes("\\")) return null;
  if (words.slice(1).some((word) => word.dynamic)) return null;
  const command = words[0]!.value.toLowerCase();
  const canonical = exactCanonicalTargets;
  if (command === "touch") return parseTouchTargets(words);
  if (command === "mkdir") return parseMkdirTargets(words);
  if (command === "cp" || command === "mv") return parseCopyMoveTargets(command, words);
  if (command === "install") return parseInstallTargets(words);
  const sed = parseSedInvocation(segment);
  if (sed?.effect === "LOCAL_WRITE") {
    const outputs = [...sed.output_files, ...(/\bsed\b[^\n]*(?:--in-place|-i)/.test(segment) ? sed.files : [])];
    return outputs.length ? canonical(outputs) : null;
  }
  const candidates: string[] = [];
  const destinationOptions = new Set(["--output", "--output-document", "--dump-header", "--cookie-jar", "--etag-save", "--trace", "--trace-ascii", "--libcurl", "--stderr", "--hsts", "--alt-svc"]);
  for (let index = 1; index < words.length; index += 1) {
    const token = words[index]!.value;
    const matchedLong = [...destinationOptions].find((option) => token.startsWith(`${option}=`));
    if (matchedLong) { candidates.push(token.slice(matchedLong.length + 1)); continue; }
    if (destinationOptions.has(token) || token === "-o" || token === "-O" || token === "-D" || token === "-c") {
      const target = words[++index]?.value;
      if (!target) return null;
      candidates.push(target);
      continue;
    }
    if (/^-[oODc].+/.test(token)) candidates.push(token.slice(2));
  }
  for (const match of segment.matchAll(/(?:^|\s)(?:>>?|<>)(?!&)(?:\s*)([^\s;&|]+)/g)) candidates.push(match[1]!);
  return candidates.length ? canonical(candidates) : null;
}

function isSafeLiteralOutputSegment(segment: string): boolean {
  if (/[><;&|`$\r\n]/.test(segment)) return false;
  const words = shellWords(segment);
  if (!words?.length) return false;
  if (words[0]!.value.includes("/") || words[0]!.value.includes("\\")) return false;
  const command = words[0]!.value.toLowerCase();
  if (command === "echo") return words.slice(1).every((word) => !/[><;&|`$]/.test(word.value));
  if (command !== "printf") return false;
  let index = 1;
  if (words[index]?.value === "--") index += 1;
  if (words[index] === undefined || words[index]!.value.startsWith("-")) return false;
  return words.slice(index).every((word) => !/[><;&|`$]/.test(word.value));
}

function localWriteInvocationTargets(toolName: string, input: unknown): string[] | null {
  const normalizedTool = normalizeToolName(toolName);
  if (normalizedTool === "apply_patch") {
    const patch = patchInputText(input);
    if (patch === null) return null;
    const directives = [...patch.matchAll(/(?:^|\r?\n)[ \t]*\*\*\* (?:(?:Add|Update|Delete) File|Move to):[ \t]*([^\r\n]*)/g)];
    if (!directives.length) return null;
    const canonical = directives.map((match) => canonicalLocalWriteTarget(match[1]!));
    if (canonical.some((target) => target === null)) return null;
    const targets = unique(canonical as string[]);
    return targets.length ? targets.sort() : null;
  }
  if (["edit", "write", "write_file"].includes(normalizedTool) && isObject(input)) {
    for (const key of ["path", "file", "file_path", "filename"]) {
      if (typeof input[key] !== "string") continue;
      const target = canonicalLocalWriteTarget(input[key]);
      return target ? [target] : null;
    }
    return null;
  }
  const shellTools = new Set(["bash", "sh", "zsh", "shell", "shell_command", "run_command", "exec_command", "functions.exec_command", "terminal.exec", "powershell", "pwsh"]);
  if (shellTools.has(normalizedTool)) {
    const command = shellCommand(input);
    const targets: string[] = [];
    const segments = splitShellSegments(command);
    if (!segments.length) return null;
    for (const segment of segments) {
      if (isSafeLiteralOutputSegment(segment)) continue;
      const effect = classifyShellText(segment);
      if (effect === "READ_ONLY") continue;
      if (effect !== "LOCAL_WRITE") return null;
      const segmentTargets = commandLocalWriteTargets(segment);
      if (!segmentTargets?.length) return null;
      targets.push(...segmentTargets);
    }
    return targets.length ? unique(targets).sort() : null;
  }
  return null;
}

interface NestedToolCapabilityScan {
  text: string;
  names: string[];
  aliases: Array<{ alias: string; name: string }>;
  unresolved: boolean;
}

function scanNestedToolCapabilities(source: string): NestedToolCapabilityScan {
  const constantKeys = new Map<string, string>();
  for (const match of source.matchAll(/\bconst\s+([a-z_$][\w$]*)\s*=\s*["']([a-z0-9_]+)["']\s*;/gi)) {
    constantKeys.set(match[1]!, match[2]!.toLowerCase());
  }
  let text = source
    .replace(/\btools\s*\?\.\s*(?=\[)/gi, "tools")
    .replace(/\btools\s*\?\.\s*(?=[a-z_$])/gi, "tools.")
    .replace(/\?\.\s*\(/g, "(");
  for (const [variable, name] of constantKeys) {
    const escaped = variable.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    text = text.replace(new RegExp(`\\btools\\s*(?:\\?\\.)?\\[\\s*${escaped}\\s*\\]`, "g"), `tools["${name}"]`);
  }
  for (let pass = 0; pass < 3; pass += 1) {
    text = text.replace(/\(\s*(tools(?:\.[a-z0-9_]+|\s*\[\s*["'][a-z0-9_]+["']\s*\]))\s*\)\s*\(/gi, "$1(");
  }

  const aliases: Array<{ alias: string; name: string }> = [];
  let unresolved = false;
  const destructuredRanges: Array<{ start: number; end: number }> = [];
  for (const match of text.matchAll(/\b(?:const|let|var)\s*\{([^}]*)\}\s*=\s*tools\b/gi)) {
    destructuredRanges.push({ start: match.index!, end: match.index! + match[0]!.length });
    const entries = match[1]!.split(",").map((entry) => entry.trim()).filter(Boolean);
    if (!entries.length) unresolved = true;
    for (const entry of entries) {
      if (entry.startsWith("...")) { unresolved = true; continue; }
      const parsed = /^(?:["']?([a-z0-9_]+)["']?)(?:\s*:\s*([a-z_$][\w$]*))?$/i.exec(entry);
      if (!parsed) { unresolved = true; continue; }
      aliases.push({ name: parsed[1]!.toLowerCase(), alias: parsed[2] ?? parsed[1]! });
    }
  }
  const assignmentMatches = [...text.matchAll(/\b(?:const|let|var)\s+([a-z_$][\w$]*)\s*=\s*(tools(?:\.([a-z0-9_]+)|\s*\[\s*["']([a-z0-9_]+)["']\s*\]))/gi)];
  for (const match of assignmentMatches) aliases.push({ alias: match[1]!, name: (match[3] ?? match[4]!).toLowerCase() });
  for (const { alias } of aliases) {
    const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    text = text.replace(new RegExp(`\\(\\s*${escaped}\\s*\\)\\s*\\(`, "g"), `${alias}(`);
  }

  if (/\btools\s*\[\s*(?!["'][a-z0-9_]+["']\s*\])/i.test(text)) unresolved = true;
  let withoutDestructuring = text;
  for (const range of [...destructuredRanges].reverse()) {
    withoutDestructuring = `${withoutDestructuring.slice(0, range.start)}${" ".repeat(range.end - range.start)}${withoutDestructuring.slice(range.end)}`;
  }
  if (/\btools\b(?!\s*(?:\.|\[\s*["'][a-z0-9_]+["']\s*\]))/i.test(withoutDestructuring)) unresolved = true;

  const names: string[] = [];
  const assignmentRanges = assignmentMatches.map((match) => ({ start: match.index!, end: match.index! + match[0]!.length }));
  for (const match of text.matchAll(/\btools(?:\.([a-z0-9_]+)|\s*\[\s*["']([a-z0-9_]+)["']\s*\])/gi)) {
    const name = (match[1] ?? match[2]!).toLowerCase();
    const end = match.index! + match[0]!.length;
    const suffix = text.slice(end);
    const assigned = assignmentRanges.some((range) => match.index! >= range.start && end <= range.end);
    if (/^\s*\(/.test(suffix)) names.push(name);
    else if (!assigned) unresolved = true;
  }
  for (const { alias, name } of aliases) {
    const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`\\b${escaped}\\s*\\(`).test(text)) names.push(name);
    else unresolved = true;
  }
  return { text, names: unique(names), aliases, unresolved };
}

interface NestedToolCall {
  name: string;
  open_index: number;
}

function nestedToolCalls(scan: NestedToolCapabilityScan): NestedToolCall[] {
  const calls: NestedToolCall[] = [];
  for (const match of scan.text.matchAll(/\btools(?:\.([a-z0-9_]+)|\s*\[\s*["']([a-z0-9_]+)["']\s*\])\s*\(/gi)) {
    calls.push({ name: (match[1] ?? match[2]!).toLowerCase(), open_index: match.index! + match[0]!.lastIndexOf("(") });
  }
  for (const { alias, name } of scan.aliases) {
    const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    for (const match of scan.text.matchAll(new RegExp(`\\b${escaped}\\s*\\(`, "g"))) {
      calls.push({ name, open_index: match.index! + match[0]!.lastIndexOf("(") });
    }
  }
  const seen = new Set<string>();
  return calls
    .sort((left, right) => left.open_index - right.open_index)
    .filter((call) => {
      const key = `${call.open_index}:${call.name}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function nestedApplyPatchAction(text: string, aliases: string[]): ToolActionClass {
  const escapedAliases = aliases.map((alias) => alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const callable = [
    String.raw`tools\.apply_patch`,
    String.raw`tools\s*\[\s*["']apply_patch["']\s*\]`,
    ...escapedAliases.map((alias) => String.raw`\b${alias}`),
  ].join("|");
  const calls = [...text.matchAll(new RegExp(`(?:${callable})\\s*\\(`, "gi"))];
  if (!calls.length) return "DESTRUCTIVE";
  for (const call of calls) {
    let cursor = call.index! + call[0]!.length;
    while (/\s/.test(text[cursor] ?? "")) cursor += 1;
    const quote = text[cursor];
    if (!quote || !["\"", "'", "`"].includes(quote)) return "DESTRUCTIVE";
    let end = cursor + 1;
    for (; end < text.length; end += 1) {
      if (text[end] !== quote) continue;
      let escapes = 0;
      for (let previous = end - 1; previous > cursor && text[previous] === "\\"; previous -= 1) escapes += 1;
      if (escapes % 2 === 0) break;
    }
    if (end >= text.length) return "DESTRUCTIVE";
    const literal = text.slice(cursor + 1, end);
    if (quote === "`" && literal.includes("${")) return "DESTRUCTIVE";
    let after = end + 1;
    while (/\s/.test(text[after] ?? "")) after += 1;
    if (text[after] !== ")") return "DESTRUCTIVE";
    const normalizedLiteral = literal.replace(/\\r\\n|\\n|\\r/g, "\n");
    if (isDeleteFilePatch(normalizedLiteral)) return "DESTRUCTIVE";
  }
  return "LOCAL_WRITE";
}

export function classifyToolAction(toolName: string, toolInput: unknown): ToolActionClass {
  const normalizedTool = normalizeToolName(toolName);
  const text = toolText(toolInput);
  const hostLocalWorkflowTools = new Set(["update_plan", "request_user_input", "wait", "wait_agent", "wait_threads"]);
  if (hostLocalWorkflowTools.has(normalizedTool)) return "HOST_LOCAL_WORKFLOW";
  if (normalizedTool === "apply_patch") return isDeleteFilePatch(toolInput) ? "DESTRUCTIVE" : "LOCAL_WRITE";
  if (["edit", "write", "write_file"].includes(normalizedTool)) return "LOCAL_WRITE";
  if (normalizedTool === "functions.exec") {
    const scan = scanNestedToolCapabilities(text);
    if (scan.unresolved) return "DESTRUCTIVE";
    const calls = nestedToolCalls(scan);
    if (!calls.length) return "DESTRUCTIVE";
    const nested: ToolActionClass[] = [];
    for (const call of calls) {
      const normalized = call.name.toLowerCase();
      if (["exec_command", "write_stdin"].includes(normalized)) {
        if (normalized === "write_stdin") nested.push("EXTERNAL_WRITE");
        else {
          const argument = nestedCallArgument(scan.text, call.open_index);
          const command = argument === null ? null : literalShellCommand(argument);
          nested.push(command === null ? "DESTRUCTIVE" : classifyShellText(command));
        }
      }
      else if (hostLocalWorkflowTools.has(normalized)) nested.push("HOST_LOCAL_WORKFLOW");
      else if (normalized === "apply_patch") nested.push(nestedApplyPatchAction(scan.text, scan.aliases.filter((alias) => alias.name === "apply_patch").map((alias) => alias.alias)));
      else if (["write_file", "edit"].includes(normalized)) nested.push("LOCAL_WRITE");
      else nested.push(classifyToolAction(normalized, toolInput));
    }
    return strongestAction(nested);
  }
  if (normalizedTool.startsWith("mcp__")) {
    const action = mcpActionName(normalizedTool);
    if (/(?:^|_)(?:delete|remove|purge|expunge|drop|destroy|obliterate|eradicate|wipe|erase|clear|truncate|reset|uninstall|revoke|decommission|unlink|prune|terminate|empty|rmdir|shred)(?:_|$)/.test(action)) return "DESTRUCTIVE";
    if (/(?:^|_)(?:create|update|upsert|activate|mutate|set|send|publish|push|deploy|write|overwrite|replace|post|put|patch|edit|archive|close|merge|approve|assign|invite|upload|finalize|move|rename|reply|comment|commit|transfer|trigger|run|execute)(?:_|$)/.test(action)) return "EXTERNAL_WRITE";
    if (/^(?:get|list|read|search|find|query|fetch|open|inspect|view|lookup|resolve|status|download)(?:_|$)/.test(action)) return "READ_ONLY";
    return "EXTERNAL_WRITE";
  }
  const shellTools = new Set(["bash", "sh", "zsh", "shell", "shell_command", "run_command", "exec_command", "functions.exec_command", "terminal.exec", "powershell", "pwsh"]);
  if (shellTools.has(normalizedTool)) return classifyShellText(shellCommand(toolInput));
  const knownReadTools = new Set(["view_image", "read_mcp_resource", "list_mcp_resources", "list_mcp_resource_templates", "get_goal", "web__run", "time", "weather", "finance", "sports"]);
  if (/(?:^|_)(?:delete|remove|purge|expunge|drop|destroy|obliterate|eradicate|wipe|erase|clear|truncate|reset|uninstall|revoke|decommission|unlink|prune|terminate|empty|rmdir|shred)(?:_|$)/.test(normalizedTool)) return "DESTRUCTIVE";
  if (/(?:^|_)(?:create|update|upsert|activate|mutate|set|send|publish|push|deploy|write|overwrite|replace|post|put|patch|edit|archive|close|merge|approve|assign|invite|upload|finalize|move|rename|reply|comment|commit|transfer|trigger|run|execute)(?:_|$)/.test(normalizedTool)) return "EXTERNAL_WRITE";
  if (knownReadTools.has(normalizedTool) || /^(?:get|list|read|search|find|query|fetch|open|inspect|view|lookup|resolve|status)(?:_|$)/.test(normalizedTool)) return "READ_ONLY";
  return "EXTERNAL_WRITE";
}

function parseTrustedReceipt(value: unknown): TrustedHardActionReceipt {
  if (!isObject(value)) throw new CascadeError("trusted host receipt is missing or malformed");
  if (new TextEncoder().encode(stableJson(value)).byteLength > 16 * 1024) throw new CascadeError("trusted host receipt exceeds the 16 KiB bound");
  for (const field of ["receipt_id", "issuer", "session_id", "envelope_id", "request_digest", "tool_name", "target_digest", "tool_call_id", "nonce", "issued_at", "expires_at", "signature"]) requireString(value[field], `trusted host receipt ${field}`);
  if (value.source_digest !== null && (typeof value.source_digest !== "string" || !/^[a-f0-9]{64}$/.test(value.source_digest))) throw new CascadeError("trusted host receipt source_digest is invalid");
  requireEnum(value.action_class, HARD_ACTIONS, "trusted host receipt action_class");
  if (!Number.isInteger(value.envelope_revision) || value.envelope_revision < 1) throw new CascadeError("trusted host receipt envelope_revision is invalid");
  if (value.max_uses !== 1) throw new CascadeError("trusted host receipt must be single use");
  return value as TrustedHardActionReceipt;
}

function shiftedRfc3339Instant(value: string, seconds: number): string | null {
  const parsed = parseRfc3339ComparableInstant(value);
  if (!parsed) return null;
  const shifted = new Date((parsed.epoch_second + seconds) * 1_000);
  if (!Number.isFinite(shifted.getTime())) return null;
  const wholeSecond = shifted.toISOString().replace(/\.000Z$/, "");
  return parsed.fractional_second === "0"
    ? `${wholeSecond}Z`
    : `${wholeSecond}.${parsed.fractional_second}Z`;
}

export function evaluateToolAdmission(input: { tool_name: string; tool_input: unknown; tool_call_id?: string; envelope?: unknown; envelope_error?: string; trusted_authority?: TrustedAuthorityHost; now?: Date; permission_mode?: string }): ToolAdmissionDecision {
  const action = classifyToolAction(input.tool_name, input.tool_input);
  if (["READ_ONLY", "HOST_LOCAL_WORKFLOW"].includes(action)) return { behavior: "allow", action_class: action, reason: "known read or host-local workflow remains subject to normal Codex permissions" };
  if (input.envelope_error) return { behavior: "deny", action_class: action, reason: `Task Envelope could not be read or parsed: ${input.envelope_error}` };
  if (!input.envelope) return { behavior: "deny", action_class: action, reason: action === "LOCAL_WRITE" ? "local write requires a current local-write Task Envelope and the normal Codex approval flow" : `${action.toLowerCase()} action requires a current Task Envelope and a trusted host-issued single-use receipt` };
  try {
    validateTaskEnvelope(input.envelope);
  } catch (error) {
    return { behavior: "deny", action_class: action, reason: error instanceof Error ? error.message : "invalid Task Envelope" };
  }
  const envelope = input.envelope as TaskEnvelope;
  const safeInteractivePermissionModes = new Set(["default", "ask", "interactive", "on-request"]);
  if (action === "LOCAL_WRITE") {
    if (envelope.workload.authority !== "LOCAL_WRITE") return { behavior: "deny", action_class: action, reason: "local write is outside the current read-only Task Envelope or unresolved hard-action scope" };
    if (envelope.conflicts.length || envelope.gaps.length || envelope.blockers.length) return { behavior: "deny", action_class: action, reason: "Task Envelope has unresolved conflicts, gaps, or blockers" };
    const decisionAt = input.now ?? new Date();
    if (!Number.isFinite(decisionAt.getTime())) return { behavior: "deny", action_class: action, reason: "local-write evaluation time is invalid" };
    const decisionNow = decisionAt.toISOString();
    const oldestEnvelope = shiftedRfc3339Instant(decisionNow, -8 * 60 * 60);
    const producedVsNow = compareRfc3339Instants(envelope.produced_at, decisionNow);
    const producedVsOldest = oldestEnvelope === null ? null : compareRfc3339Instants(envelope.produced_at, oldestEnvelope);
    if (producedVsNow === null || producedVsOldest === null || producedVsNow > 0 || producedVsOldest < 0) return { behavior: "deny", action_class: action, reason: "Task Envelope is stale for a local write" };
    const scope = envelope.authority.local_write_scope;
    const invocationTargets = localWriteInvocationTargets(input.tool_name, input.tool_input);
    if (!invocationTargets?.length) return { behavior: "deny", action_class: action, reason: "local-write target could not be resolved against the Task Envelope scope" };
    const escaped = invocationTargets.filter((target) => !isRepositoryContainedTarget(target));
    if (escaped.length) return { behavior: "deny", action_class: action, reason: `local-write target does not resolve inside the repository: ${escaped.join(", ")}` };
    if (scope.mode === "TARGETS") {
      const outside = invocationTargets.filter((target) => !scope.targets.some((scopeTarget) => localWriteScopeTargetAllows(scopeTarget, target)));
      if (outside.length) return { behavior: "deny", action_class: action, reason: `local-write target is outside the Task Envelope scope: ${outside.join(", ")}` };
    }
    if (!safeInteractivePermissionModes.has(input.permission_mode ?? "")) return { behavior: "deny", action_class: action, reason: "local write requires an explicitly recognized interactive Codex approval mode" };
    return { behavior: "defer", action_class: action, reason: "admission permits the normal Codex approval flow; it does not auto-approve, and the nofollow target walk must be repeated tool-side immediately before mutation" };
  }
  if (envelope.derivation_input.provenance_mode !== "TRUSTED_SOURCE_SEGMENTS" || !envelope.derivation_input.direct_user_attestation) return { behavior: "deny", action_class: action, reason: "hard action requires trusted direct-user source provenance" };
  const decisionAt = input.now ?? new Date();
  if (!Number.isFinite(decisionAt.getTime())) return { behavior: "deny", action_class: action, reason: "hard action evaluation time is invalid" };
  const decisionNow = decisionAt.toISOString();
  const oldestEnvelope = shiftedRfc3339Instant(decisionNow, -8 * 60 * 60);
  const producedVsNow = compareRfc3339Instants(envelope.produced_at, decisionNow);
  const producedVsOldest = oldestEnvelope === null ? null : compareRfc3339Instants(envelope.produced_at, oldestEnvelope);
  if (producedVsNow === null || producedVsOldest === null) return { behavior: "deny", action_class: action, reason: "Task Envelope produced_at is not a valid RFC 3339 instant" };
  if (producedVsNow > 0 || producedVsOldest < 0) return { behavior: "deny", action_class: action, reason: "Task Envelope is stale for a hard action" };
  const requestedTag = `requested-${action.toLowerCase().replace("_", "-")}`;
  if (!envelope.claims.some((claim) => claim.status !== "SUPERSEDED" && ["USER", "TRUSTED_INSTRUCTION"].includes(claim.source) && claim.policy_tags.includes(requestedTag))) return { behavior: "deny", action_class: action, reason: `Task Envelope does not request ${action.toLowerCase()} action scope` };
  if (!input.trusted_authority) return { behavior: "deny", action_class: action, reason: "trusted host authority is unavailable; the current hook protocol cannot activate hard actions" };
  const hostResolvableGap = /^(?:trusted host receipt required for (?:EXTERNAL_WRITE|PRIVILEGED|DESTRUCTIVE)|missing authority: (?:external-write|privileged|destructive|trusted-host-hard-action-receipt))$/;
  const unrelatedGaps = envelope.gaps.filter((gap: string) => !hostResolvableGap.test(gap));
  const unrelatedBlockers = envelope.blockers.filter((blocker: string) => blocker !== "dependent mutation blocked by unresolved admission gap" || unrelatedGaps.length > 0);
  if (envelope.conflicts.length || unrelatedGaps.length || unrelatedBlockers.length) return { behavior: "deny", action_class: action, reason: "Task Envelope has unresolved conflicts, non-authority gaps, or blockers" };
  if (!input.tool_call_id) return { behavior: "deny", action_class: action, reason: "trusted hard action requires the host tool_call_id" };
  const host = input.trusted_authority;
  if (host.session_id !== envelope.task_id || host.current_envelope_id !== envelope.envelope_id || host.current_revision !== envelope.revision || host.current_request_digest !== envelope.request_digest || host.current_source_digest !== envelope.source_digest || stableJson(host.current_direct_user_attestation) !== stableJson(envelope.derivation_input.direct_user_attestation)) {
    return { behavior: "deny", action_class: action, reason: "trusted host current session or envelope revision does not match the Task Envelope" };
  }
  const normalizedTool = normalizeToolName(input.tool_name);
  const targetDigest = hardActionTargetDigest(normalizedTool, input.tool_input);
  if (!safeInteractivePermissionModes.has(input.permission_mode ?? "")) return { behavior: "deny", action_class: action, reason: "hard action requires an explicitly recognized interactive Codex approval mode" };
  let receipt: TrustedHardActionReceipt;
  try { receipt = parseTrustedReceipt(host.receipt); }
  catch (error) { return { behavior: "deny", action_class: action, reason: error instanceof Error ? error.message : "trusted host receipt is invalid" }; }
  const expected: TrustedHardActionExpected = {
    receipt_id: host.receipt_id,
    issuer: host.issuer,
    session_id: host.session_id,
    envelope_id: host.current_envelope_id,
    envelope_revision: host.current_revision,
    request_digest: host.current_request_digest,
    source_digest: host.current_source_digest,
    action_class: action as HardActionClass,
    tool_name: normalizedTool,
    target_digest: targetDigest,
    tool_call_id: input.tool_call_id,
    nonce: host.nonce,
    issued_at: host.issued_at,
    expires_at: host.expires_at,
    max_uses: 1,
  };
  if (stableJson(trustedHardActionReceiptPayload(receipt)) !== stableJson(expected)) return { behavior: "deny", action_class: action, reason: "trusted host receipt binding does not match the final tool invocation" };
  const latestExpiry = shiftedRfc3339Instant(expected.issued_at, 10 * 60);
  const issuedVsNow = compareRfc3339Instants(expected.issued_at, decisionNow);
  const expiresVsNow = compareRfc3339Instants(expected.expires_at, decisionNow);
  const expiresVsIssued = compareRfc3339Instants(expected.expires_at, expected.issued_at);
  const expiresVsLatest = latestExpiry === null ? null : compareRfc3339Instants(expected.expires_at, latestExpiry);
  if (issuedVsNow === null || expiresVsNow === null || expiresVsIssued === null || expiresVsLatest === null || issuedVsNow > 0 || expiresVsNow <= 0 || expiresVsIssued <= 0 || expiresVsLatest > 0) return { behavior: "deny", action_class: action, reason: "trusted host receipt is outside its bounded validity window" };
  let verified: { ok: boolean; reason?: string };
  try { verified = host.verify_and_consume(receipt, expected); }
  catch { return { behavior: "deny", action_class: action, reason: "trusted host receipt verification or atomic consumption failed closed" }; }
  if (!verified || typeof verified.ok !== "boolean") return { behavior: "deny", action_class: action, reason: "trusted host receipt verifier returned an invalid result" };
  if (!verified.ok) return { behavior: "deny", action_class: action, reason: verified.reason || "trusted host receipt authenticity, revocation, currentness, or single-use consumption failed" };
  return { behavior: "defer", action_class: action, reason: "admission permits the normal Codex approval flow; it does not auto-approve" };
}

export async function reclassifyTaskEnvelope(prior: TaskEnvelope, request: Omit<AdmissionRequest, "prior_envelope">): Promise<TaskEnvelope> {
  validateTaskEnvelope(prior);
  return compileTaskEnvelope({ ...request, prior_envelope: prior });
}

export async function runAdmissionCorpus(): Promise<JsonObject> {
  await validateAdmissionRepositoryOnce();
  const source = await readStructured<JsonObject>(
    CORPUS_PATH,
    "harness-evals/task-admission/cases.yaml",
  );
  validateAdmissionCaseBundle(source);
  return {
    status: "NOT_RUN",
    reason: "Historical text corpus has no independently produced, request-bound LLM interpretations; it cannot grade the semantic compiler. Use frozen model interpretation evidence, never expected fields as compiler inputs.",
    case_count: source.cases.length,
    policy_bundle_version: source.policy_bundle_version,
  };
}

function compactExplanation(envelope: TaskEnvelope): string {
  return [
    `Task admission ${envelope.envelope_id} (${envelope.policy_bundle_version})`,
    `route=${envelope.route}`,
    `workload=${Object.values(envelope.workload).join("/")}`,
    `controls=${envelope.control_packs.join(",")}`,
    `authority_missing=${envelope.authority.missing.join(",") || "none"}`,
    `gaps=${envelope.gaps.length}`,
    "This is advisory context only; it does not grant authority or dispatch work.",
  ].join("; ");
}

export async function readBoundedTaskEnvelope(path: string, prefix?: string, bindings: TaskEnvelopeValidationBindings = {}): Promise<TaskEnvelope> {
  const resolved = boundedPath(path, prefix);
  const bytes = await readBoundedRegularFile(resolved, "Task Envelope", { maxBytes: 1024 * 1024 });
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new CascadeError("Task Envelope is not valid UTF-8");
  }
  let envelope: unknown;
  try { envelope = JSON.parse(text); }
  catch { throw new CascadeError("Task Envelope is not valid JSON"); }
  validateTaskEnvelope(envelope, bindings);
  return envelope;
}

async function readBoundedAdmissionRequest(path: string): Promise<string> {
  const resolved = boundedPath(path);
  const bytes = await readBoundedRegularFile(resolved, "admission request file", {
    maxBytes: MAX_ADMISSION_REQUEST_FILE_BYTES,
  });
  let request: string;
  try {
    request = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new CascadeError("admission request file is not valid UTF-8");
  }
  assertAdmissionRequestBound(request);
  return request;
}

async function readBoundedInterpretation(path: string): Promise<JsonObject> {
  const bytes = await readBoundedRegularFile(boundedPath(path), "LLM interpretation", { maxBytes: 1024 * 1024 });
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    throw new CascadeError("LLM interpretation must contain valid UTF-8 JSON");
  }
}

async function readAdmissionJson(file: string, maxBytes = 65_536): Promise<JsonObject> {
  const path = boundedPath(file, ".artifacts/task-admission/");
  const bytes = await readBoundedRegularFile(path, "semantic admission artifact", { maxBytes, physicalRoot: rootPath(".artifacts/task-admission") });
  let value: unknown;
  try { value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); }
  catch { throw new CascadeError("semantic admission artifact must be valid UTF-8 JSON"); }
  if (!isObject(value)) throw new CascadeError("semantic admission artifact must be an object");
  return value;
}

async function readAdmissionIntake(file: string): Promise<JsonObject> {
  const value = await readAdmissionJson(file, 262_144);
  const expected = ["schema_version", "artifact_type", "status", "task_id", "request", "request_digest", "envelope_path", "prior_envelope"].sort();
  if (stableJson(Object.keys(value).sort()) !== stableJson(expected) || value.schema_version !== 1 || value.artifact_type !== "cascade-admission-intake" || value.status !== "REQUIRES_INTERPRETATION") throw new CascadeError("unsupported semantic admission intake");
  requireString(value.task_id, "semantic intake task_id");
  if (value.task_id.length > 200) throw new CascadeError("semantic intake task_id is oversized");
  const canonical = semanticAdmissionRequest(value.request);
  if (canonical.request !== value.request || canonical.request_digest !== value.request_digest) throw new CascadeError("semantic admission intake request binding is invalid");
  requireString(value.envelope_path, "semantic intake envelope_path");
  boundedPath(value.envelope_path, ".artifacts/task-admission/");
  if (value.prior_envelope !== null) {
    validateTaskEnvelope(value.prior_envelope, { require_semantic_interpretation: true });
    if (value.prior_envelope.task_id !== value.task_id) throw new CascadeError("semantic admission prior belongs to a different task");
  }
  return value;
}

export async function main(argv: string[]): Promise<number> {
  const [command, ...rest] = argv;
  const args = parseArgs(rest);
  if (command === "validate") {
    const sourceInstalled = await isFile(CORPUS_PATH);
    const result = sourceInstalled ? await validateAdmissionRepository() : { ...validateAdmissionRuntime(), case_count: "NOT_INSTALLED" };
    console.log(`admission_status=PASS scope=${sourceInstalled ? "SOURCE" : "RUNTIME"} policies=${result.policy_count} controls=${result.control_count} cases=${result.case_count} bundle=${ADMISSION_POLICY_BUNDLE}`);
    return 0;
  }
  if (command === "intake") {
    const file = flag(args, "file");
    if (!file) throw new CascadeError("admission intake requires --file PATH");
    const intake = await readAdmissionIntake(file);
    console.log(`Request (${intake.request_digest}):\n${intake.request}\n\nPrior envelope: ${intake.prior_envelope?.envelope_id ?? "none"}`);
    if (intake.prior_envelope) {
      console.log(`Prior intent: ${intake.prior_envelope.intent}; relation: ${intake.prior_envelope.relation}`);
      for (const claim of intake.prior_envelope.claims.filter((claim: TaskClaim) => claim.status !== "SUPERSEDED")) console.log(`- ${claim.claim_id} [${claim.kind}/${claim.status}]: ${claim.statement}`);
    }
    return 0;
  }
  if (command === "assess" || command === "explain") {
    const intakePath = flag(args, "intake");
    if (intakePath && (flag(args, "file") || flag(args, "request") || flag(args, "prior-envelope") || flag(args, "task-id") || args.positionals.length)) throw new CascadeError("semantic intake cannot be combined with request/prior/task overrides");
    const intake = intakePath ? await readAdmissionIntake(intakePath) : undefined;
    const file = flag(args, "file");
    const request = intake?.request ?? (file ? await readBoundedAdmissionRequest(file) : flag(args, "request") ?? args.positionals.join(" "));
    const priorPath = flag(args, "prior-envelope");
    const prior = intake?.prior_envelope ?? (priorPath ? await readBoundedTaskEnvelope(priorPath, ".artifacts/task-admission/") : undefined);
    const relationFlag = flag(args, "relation");
    const intentFlag = flag(args, "intent");
    if (relationFlag) requireEnum(relationFlag, RELATIONS, "--relation");
    if (intentFlag) requireEnum(intentFlag, INTENTS, "--intent");
    if (flags(args, "hard-action-grant").length) throw new CascadeError("--hard-action-grant is unsupported: only the trusted host runtime can issue and atomically consume hard-action receipts");
    if (boolFlag(args, "dispatch-authorized")) throw new CascadeError("--dispatch-authorized is unsupported: task admission can recommend persistence but cannot authorize dispatch");
    const interpretationPath = flag(args, "interpretation");
    const suppliedInterpretation = interpretationPath ? await readBoundedInterpretation(interpretationPath) : undefined;
    const interpretation = suppliedInterpretation?.artifact_type === "cascade-admission-interpretation"
      ? await readAdmissionJson(interpretationPath!, 1024 * 1024)
      : suppliedInterpretation;
    const interpretationInput = interpretation?.artifact_type === "cascade-admission-interpretation"
      ? { semantic_interpretation: interpretation }
      : { interpretation: interpretation as AdmissionInterpretation | undefined };
    const envelope = await compileTaskEnvelope({
      request, ...interpretationInput,
      task_id: intake?.task_id ?? flag(args, "task-id", prior?.task_id ?? "adhoc"),
      relation: relationFlag as Relation | undefined,
      intent: intentFlag as Intent | undefined,
      authority: flags(args, "authority"),
      produced_at: flag(args, "produced-at"),
      source_digest: flag(args, "source-digest"),
      prior_envelope: prior,
    });
    const output = flag(args, "output") ?? intake?.envelope_path;
    if (output) {
      const path = boundedPath(output, ".artifacts/task-admission/");
      await writeJsonAtomic(path, envelope);
      console.log(`admission_envelope_status=WRITTEN envelope=${envelope.envelope_id} path=${output}`);
    } else console.log(command === "explain" ? compactExplanation(envelope) : stableJson(envelope, true));
    return envelope.blockers.length ? 2 : 0;
  }
  if (command === "check-envelope") {
    const file = flag(args, "file") ?? args.positionals[0];
    if (!file) throw new CascadeError("admission check-envelope requires --file PATH");
    await readBoundedTaskEnvelope(file, undefined, {
      expected_request_digest: flag(args, "expected-request-digest"),
      expected_source_digest: flag(args, "expected-source-digest"),
      require_source_digest: boolFlag(args, "require-source-digest"),
    });
    console.log("admission_envelope_status=PASS");
    return 0;
  }
  if (command === "corpus") {
    const result = await runAdmissionCorpus();
    console.log(stableJson(result, true));
    return result.status === "PASS" ? 0 : 2;
  }
  console.log("Usage: bun scripts/cascade.ts admission <validate|intake|assess|explain|check-envelope|corpus> [--intake .artifacts/task-admission/FILE.json] [--interpretation PATH] [--prior-envelope PATH] [--authority CANDIDATE] [--source-digest SHA256] [--expected-request-digest SHA256] [--expected-source-digest SHA256] [--output .artifacts/task-admission/FILE.json]");
  return command ? 1 : 0;
}
