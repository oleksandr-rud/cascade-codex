import {
  CascadeError,
  assertJsonSchema,
  boundedPath,
  boolFlag,
  compareRfc3339Instants,
  flag,
  flags,
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
import { lstatSync, realpathSync } from "node:fs";
import { relative, resolve } from "node:path";
import {
  classifyEnvGitAction,
  deriveAdmissionClausePatches,
  parseAdmissionClauses,
  type AdmissionClausePatches,
  type AdmissionClauseSpan,
} from "./admission-clauses";

export const ADMISSION_SCHEMA_VERSION = 41;
export const ADMISSION_POLICY_BUNDLE = "cascade-core@42";
export const MAX_ADMISSION_REQUEST_CHARACTERS = 4_000;
const MAX_REDACTED_REQUEST_CHARACTERS = MAX_ADMISSION_REQUEST_CHARACTERS;
const MAX_ADMISSION_REQUEST_FILE_BYTES = MAX_ADMISSION_REQUEST_CHARACTERS * 4;
const POLICY_PATH = rootPath(".codex/task-admission/policies/core.json");
const CONTROL_PATH = rootPath(".codex/task-admission/control-catalog.json");
const CONTROL_SCHEMA_PATH = rootPath(".codex/task-admission/control-catalog.schema.json");
const ENVELOPE_SCHEMA_PATH = rootPath(".codex/task-admission/task-envelope.schema.json");
const POLICY_SCHEMA_PATH = rootPath(".codex/task-admission/policy.schema.json");
const CORPUS_PATH = rootPath("harness-evals/task-admission/cases.json");
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
}

interface PriorDerivationSnapshot {
  envelope_id: string;
  revision: number;
  task_id: string;
  request_digest: string;
  source_digest: string | null;
  intent: Intent;
  provenance_mode: "TRUSTED_SOURCE_SEGMENTS" | "LEXICAL_FALLBACK";
  direct_user_attestation: TrustedDirectUserAttestationExpected | null;
  claims: TaskClaim[];
}

interface TaskDerivationInput extends JsonObject {
  schema_version: 41;
  classifier_id: "cascade-task-admission-v41";
  canonical_request: string;
  classification_request: string;
  classification_digest: string;
  provenance_version: 2;
  provenance_mode: "TRUSTED_SOURCE_SEGMENTS" | "LEXICAL_FALLBACK";
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
  authenticity: "TRUSTED_DIRECT_USER_ATTESTATION" | "UNVERIFIED_LEXICAL_FALLBACK";
}

interface RequestSpan {
  start: number;
  end: number;
  source: "USER" | "EXTERNAL_SOURCE";
}

interface AdmissionPolicy extends JsonObject {
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

export interface ToolAdmissionDecision {
  behavior: "allow" | "deny" | "defer";
  action_class: ToolActionClass;
  reason: string;
}

const [ENVELOPE_SCHEMA, POLICY_BUNDLE, CONTROL_CATALOG, CASE_SCHEMA, ASSESSMENT_SCHEMA] = await Promise.all([
  readJson<JsonObject>(ENVELOPE_SCHEMA_PATH),
  readJson<JsonObject>(POLICY_PATH),
  readJson<JsonObject>(CONTROL_PATH),
  readJson<JsonObject>(CASE_SCHEMA_PATH),
  readJson<JsonObject>(ASSESSMENT_SCHEMA_PATH),
]);
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

const EXTERNAL_SOURCE_MARKER = /\b(?:(?:quoted\s+request|copied\s+note|for\s+(?:analysis|assessment)\s+purposes?)\s*:|(?:(?:the\s+following\s+)?(?:retrieved|external|tool|web|pasted|copied|clipboard)(?:\s+(?:content|output|text|instructions?|description|body|result))?(?:\s*,?\s*(?:quoted\s+verbatim|verbatim))?)\s*(?::|,|(?:says?|asks?|instructs?|recommends?)\b\s*:?)|(?:(?:the\s+following\s+)?(?:ticket|issue|document|prompt|page)(?:\s+(?:content|output|text|instructions?|description|body|result))?(?:\s*,?\s*(?:quoted\s+verbatim|verbatim))?)\s*(?::|(?:says?|asks?|instructs?|recommends?)\b\s*:?)|quoted(?:\s+(?:content|text))?(?:\s+verbatim)?\s*(?::|,)|according\s+to\s+(?:the\s+)?(?:retrieved\s+)?(?:page|ticket|issue|document|tool(?:\s+result)?|web\s+page)\s*(?::|,|(?:says?|asks?|instructs?|recommends?)\b\s*:?)|(?:copied|pasted)\s+(?:from|out\s+of|off)\s+(?:the\s+)?[^:\n]{1,80}\s*:|(?:here(?:'s|\s+is)|this\s+is|below\s+is)\s+(?:what\s+)?i\s+(?:pasted|copied)(?:\s+(?:from|out\s+of|off)\s+(?:the\s+)?[^:\n]{1,80})?\s*:|i(?:['’]ve|\s+have)?\s+(?:(?:copied\s+and\s+)?pasted|copied)\s+(?:this|the\s+following|it|below)(?:\s+(?:from|out\s+of|off)\s+(?:the\s+)?[^:\n]{1,80})?\s*:|what\s+i\s+pasted\s+was\s*:|i\s+have\s+pasted\s+below\s*:|i\s+copied\s+and\s+pasted\s+this\s*:|(?:the\s+)?clipboard\s+(?:contains|contents(?:\s+are)?)\s*:|(?:(?:review|explain)\s*:\s*(?:the\s+)?proposed\s+(?:action|command|change|request)|(?:review|explain)\s+(?:the\s+)?proposed\s+(?:action|command|change|request))\s*:|(?:the\s+following\s+)?(?:paste|pasted\s+text|copied\s+text|clipboard)(?:\s+(?:entry|content|text))?\s+(?:says?|reads?)\s*:|from\s+(?:my\s+|the\s+)?clipboard\s*:|(?:please\s+)?review\s+(?:this|the\s+following)\s+(?:copied|pasted)\s+[^:\n]{1,80}\s*:|for\s+review\s*,?\s+(?:the\s+following\s+)?(?:text|message|content)?\s*(?:was\s+)?(?:copied|pasted)(?:\s+from\s+[^:\n]{1,80})?\s*:|(?:here(?:'s|\s+is)|below\s+is)\s+(?:a|the)\s+[^:\n]{1,60}\s+to\s+review\s*:)\s*/gi;

const EXTERNAL_SOURCE_VARIANT_MARKER = /\b(?:i\s+(?:have\s+)?(?:copied\s*&\s*pasted|copy-pasted|pasted\s+(?:the\s+below|this\s+here))(?:\s+(?:this|it|the\s+following))?(?:\s+(?:from|out\s+of|off)\s+(?:the\s+)?[^:\n]{1,80})?\s*:|(?:the\s+)?clipboard\s+(?:has|holds|includes)\s*:|(?:pasted|copied)\s+content\s+follows\s*:|(?:(?:please|kindly)\s+|(?:can|could|would|might)\s+you\s+)?(?:review|explain)\s+(?:this|the)\s+proposed\s+(?:action|command|change|request)(?:\s+only)?\s*:|(?:slack\s+drop|dropped\s+from\s+(?:slack|jira)|i\s+dropped\s+(?:this|the\s+following)\s+from\s+(?:slack|jira))\s*:)\s*/gi;
const EXTERNAL_SOURCE_REVIEW_MARKER = /\b(?:(?:copied|pasted)(?:\s+(?:text|content|message|excerpt|request|command))?\s+from\s+[^:\n—–-]{1,80}(?:\s+for\s+(?:review|inspection))?\s*(?::|—|–|\s-\s)|(?:copied|pasted)\s+(?:text|content|message|excerpt|request|command)\s+for\s+(?:review|inspect|inspection|explain|analysis)\s*(?::|—|–|\s-\s)|(?:(?:an?|the)\s+)?clipboard\s+(?:excerpt|entry|message|text|request|note|command)\s+(?:to|for)\s+(?:review|inspect|explain|inspection|analysis)\s*(?::|—|–|\s-\s)|(?:clipboard\s+(?:request|note|command)|copied\s+command)\s*(?::|—|–|\s-\s)|(?:an?|the)\s+(?:slack|jira|teams)\s+(?:message|excerpt|drop)\s+(?:to|for)\s+(?:review|inspect|explain|inspection)\s*(?::|—|–|\s-\s)|(?:an?|the)\s+(?:slack|jira|teams)\s+message\s+for\s+review\s+follows\s*(?::|—|–|\s-\s)|(?:review|explain|inspect|audit|analyze|assess|evaluate|examine)\s+(?:only\s+)?(?:this|the\s+following)\s+(?:copied|pasted)\s+(?:(?:slack|jira|teams)\s+)?(?:request|message|text|content|command)\s*(?::|—|–|\s-\s)|(?:audit|review|explain|inspect|analyze|assess|evaluate|examine)\s+(?:this\s+)?(?:copied|pasted)\s+(?:request|message|text|content|command)\s*(?::|—|–|\s-\s)|conduct\s+a\s+review\s+of\s+(?:this\s+)?(?:copied|pasted)\s+(?:request|message|text|content|command)\s*(?::|—|–|\s-\s)|(?:audit|review)\s+(?:only\s+)?(?:the\s+)?phrase\s*|(?:review|explain|audit|analyze|assess|evaluate|examine)\s+(?:(?:the\s+)?risk\s+in\s+|whether\s+to\s+(?:execute|perform)\s+)?(?:only\s+)?(?:(?:this|the)\s+)?proposed\s+(?:action|command|change|request)(?:\s+without\s+(?:actually\s+)?(?:carrying|executing|performing|doing)\s+(?:it|that|anything)\s+(?:out)?)?\s*(?::|—|–|\s-\s))\s*/gi;
const EXPLICIT_REVIEW_SOURCE_MARKER = /\b(?:(?:for\s+review\s+only|review-only|review\s+only|analysis\s+only|analy[sz]e\s+only|assessment\s+only|safety\s+(?:review|analysis|assessment|check)\s+only)\s*(?::|,|—|–|-)|(?:quoted|copied)\s+(?:review|analysis|assessment|safety\s+(?:review|analysis|assessment|check))\s*(?::|,|—|–|-)|(?:please\s+)?review\s*,?\s*but\s+do\s+not\s+execute\s*(?::|—|–|-)|(?:inspect|review)\s*,?\s*(?:but\s+)?(?:do\s+not|don't|not)\s+(?:execute|execution)\s*(?::|—|–|-)|(?:safety|risk|security)\s+(?:review|analysis|assessment|check)\s*,?\s*(?:not|without)\s+(?:execution|action)\s*(?::|—|–|-)|do\s+not\s+execute\s*;\s*(?:please\s+)?review(?:\s+this\s+request)?\s*(?::|—|–|-)|(?:(?:please|kindly)\s+|(?:can|could|would)\s+you\s+)?(?:review|audit|analyze|inspect|explain|assess|evaluate|examine)\s+(?:this\s+|the\s+)?(?:(?:slack|jira|teams)\s+message\s+copied\s+below|copied\s+(?:(?:slack|jira|teams)\s+)?(?:request|message|text|content))\s*(?::|—|–|-))\s*/gi;
const STRUCTURAL_REVIEW_SOURCE_MARKER = /\b(?:(?:critique|discuss|summarize|summarise|check|analyze|analyse|(?:provide|give\s+me)\s+(?:an?\s+)?analysis\s+of)\s+(?:only\s+)?(?:this\s+|the\s+following\s+)?(?:copied|pasted)\s+(?:(?:slack|jira|teams)\s+)?(?:request|message|text|content)[^:\n—–-]{0,80}\s*(?::|—|–|-)|tell\s+me\s+(?:whether|if)\s+(?:this\s+|the\s+following\s+)?(?:copied|pasted)\s+(?:(?:slack|jira|teams)\s+)?(?:request|message|text|content)[^:\n—–-]{0,80}\s*(?::|—|–|-))\s*/gi;
const GENERAL_REVIEW_SOURCE_MARKER = /\b(?:(?:(?:for\s+)?(?:safety|risk|security|compliance)\s+(?:review|analysis|assessment|inspection)|(?:safety|risk|security|compliance)\s+check|request\s+under\s+review|external\s+request\s+for\s+(?:review|analysis|assessment)|untrusted\s+(?:request|command|action))\s*(?::|—|–|\s-\s|,)|(?:(?:analy[sz]e|assess|evaluate|check|review|explain)\s+(?:only\s+)?(?:the\s+)?(?:safety|risk|security|compliance|hazards?)\s+(?:of|in|for)\s+(?:this|the\s+following)\s+(?:request|command|action|change)|(?:analy[sz]e|assess|evaluate|check|review|explain)\s+(?:this|the\s+following)\s+(?:request|command|action|change)\s+for\s+(?:safety|risk|security|compliance)|(?:analy[sz]e|assess|evaluate|check|review|explain)\s+(?:whether|if)\s+(?:this|the\s+following)\s+(?:request|command|action|change)\s+is\s+(?:safe|risky|dangerous|compliant)|tell\s+me\s+(?:whether|if)\s+(?:this|the\s+following)\s+(?:request|command|action|change)\s+is\s+(?:safe|risky|dangerous|compliant))[^:\n—–-]{0,80}\s*(?::|—|–|\s-\s)|(?:is|would)\s+(?:this|the\s+following)\s+(?:request|command|action|change)\s+(?:be\s+)?(?:safe|compliant)\s*(?::|\?|—|–|\s-\s))\s*/gi;
const ADVISORY_ACTION_SOURCE_MARKER = /\b(?:(?:(?:copied|pasted|external|quoted|quotation)\s+(?:request|instruction|action|command))\s*(?::|—|–|\s-\s)\s*|(?:copied|pasted|clipboard)\s+(?:note|request|command)\s+for\s+(?:review|analysis|assessment|compliance)\s*(?::|—|–|\s-\s)\s*|(?:assess|evaluate|review|audit|inspect|analy[sz]e|discuss)\s*:\s*(?:quoted|copied|pasted|external|clipboard)\s+(?:request|instruction|note|command)\s*(?::|—|–|\s-\s)\s*|(?:assess|evaluate|review|audit|inspect|analy[sz]e|discuss)\s+(?:this\s+)?(?:copied|pasted|external|clipboard)\s+(?:request|instruction|note|command)\s*(?::|—|–|\s-\s)\s*|(?:security|safety|risk|compliance)\s+(?:review|analysis|assessment)(?:\s+request)?\s*[,;:—–]\s*|for\s+(?:security|safety|risk|compliance)\s+(?:review|analysis|assessment)\s*[,;:—–]\s*|(?:review|assess|evaluate|audit|inspect|analy[sz]e)\s+whether\s+(?=(?:we|you|i|the|this|that|it|there)\b))/gi;
const EXTERNAL_SOURCE_MARKERS = [EXTERNAL_SOURCE_MARKER, EXTERNAL_SOURCE_VARIANT_MARKER, EXTERNAL_SOURCE_REVIEW_MARKER, EXPLICIT_REVIEW_SOURCE_MARKER, STRUCTURAL_REVIEW_SOURCE_MARKER, GENERAL_REVIEW_SOURCE_MARKER, ADVISORY_ACTION_SOURCE_MARKER];

function quotedRangeEnd(request: string, contentStart: number, quote: string): number {
  const closingQuote = quote === "“" ? "”" : quote === "‘" ? "’" : quote;
  for (let index = contentStart + 1; index < request.length; index += 1) {
    if (request[index] !== closingQuote) continue;
    let escapes = 0;
    for (let cursor = index - 1; cursor >= contentStart && request[cursor] === "\\"; cursor -= 1) escapes += 1;
    if (escapes % 2) continue;
    if ((quote === "'" || quote === "‘") && /[A-Za-z0-9]/.test(request[index - 1] ?? "") && /[A-Za-z0-9]/.test(request[index + 1] ?? "")) continue;
    return index + 1;
  }
  return request.length;
}

function balancedRangeEnd(request: string, contentStart: number): number {
  const pairs: Record<string, string> = { "(": ")", "[": "]", "{": "}" };
  const stack = [pairs[request[contentStart]!]!];
  let quote: string | null = null;
  for (let index = contentStart + 1; index < request.length; index += 1) {
    const character = request[index]!;
    if (quote) {
      if (character === quote) {
        let escapes = 0;
        for (let cursor = index - 1; cursor >= contentStart && request[cursor] === "\\"; cursor -= 1) escapes += 1;
        const apostrophe = quote === "'" && /[A-Za-z0-9]/.test(request[index - 1] ?? "") && /[A-Za-z0-9]/.test(request[index + 1] ?? "");
        if (escapes % 2 === 0 && !apostrophe) quote = null;
      }
      continue;
    }
    if (["\"", "'", "`"].includes(character)) {
      if (character === "'" && /[A-Za-z0-9]/.test(request[index - 1] ?? "") && /[A-Za-z0-9]/.test(request[index + 1] ?? "")) continue;
      quote = character;
      continue;
    }
    if (pairs[character]) { stack.push(pairs[character]!); continue; }
    if (character === stack.at(-1)) {
      stack.pop();
      if (!stack.length) return index + 1;
    }
  }
  return request.length;
}

function externalRangeEnd(request: string, contentStart: number): number {
  const fence = request.slice(contentStart).match(/^(```+|~~~+)/)?.[1];
  if (fence) {
    const closing = request.indexOf(fence, contentStart + fence.length);
    return closing >= 0 ? closing + fence.length : request.length;
  }
  const quote = request[contentStart];
  if (quote === '"' || quote === "'" || quote === "`" || quote === "“" || quote === "‘") {
    return quotedRangeEnd(request, contentStart, quote);
  }
  if (["(", "[", "{"].includes(quote ?? "")) return balancedRangeEnd(request, contentStart);
  const tail = request.slice(contentStart);
  const boundary = /(?:\n\s*|[.!?;,—–]\s*|\s-\s|[()]\s*)(?:(?:(?:direct\s+)?user\s+(?:request|instruction)|my\s+request|requested\s+action|what\s+i\s+need\s+you\s+to\s+do|please\s+now|user\s+non_goal|continue)\s*(?::|—|–|\s-\s)|(?:please\s+)?(?:review|explain)\s+it\s+only\.?|(?:analy[sz]e|assess|review|evaluate)\s+whether\s+(?:(?:to\s+)?(?:execute|perform|act\s+on|take|carry\s+out|do|proceed\s+with)\s+(?:it|that|this|the\s+(?:action|request)|(?:the\s+)?(?:requested\s+action|action\s+requested))|(?:the\s+)?(?:action|request)\s+should\s+be\s+performed)\b|(?:do\s+not|don't|never)\s+(?:execute|perform|act\s+on|take|carry\s+out|do|proceed\s+with)\s+(?:it|that|this|the\s+(?:action|request)|(?:the\s+)?(?:requested\s+action|action\s+requested))\b|(?:(?:please|then)\s+)?(?:proceed(?:\s+with\s+(?:it|that))?|carry(?:\s+(?:it|that))?\s+out|do\s+(?:it|that)|execute\s+(?:it|that|this|(?:the\s+)?(?:requested\s+action|action\s+requested))(?:\s+now)?|perform\s+(?:it|that|that\s+action|(?:the\s+)?(?:requested\s+action|action\s+requested))|act\s+on\s+(?:it|that|(?:the\s+)?(?:requested\s+action|action\s+requested))(?:\s+now)?|take\s+(?:it|that|the\s+action|(?:the\s+)?(?:requested\s+action|action\s+requested))|go\s+ahead(?:\s+and\s+(?:do\s+(?:it|that)|carry(?:\s+(?:it|that))?\s+out))?)(?!\s+and\s+(?:make|add|apply|fix|change|edit|modify|update|implement|build|create|remove|delete|refactor|write))\b)/i.exec(tail);
  return boundary ? contentStart + boundary.index : request.length;
}

function deriveRequestSpans(request: string): RequestSpan[] {
  const externalRanges: Array<{ start: number; end: number }> = [];
  for (const marker of EXTERNAL_SOURCE_MARKERS) {
    marker.lastIndex = 0;
    for (let match = marker.exec(request); match; match = marker.exec(request)) {
      const start = match.index + match[0].length;
      const end = externalRangeEnd(request, start);
      if (end > start) externalRanges.push({ start, end });
      marker.lastIndex = Math.max(marker.lastIndex, end);
    }
  }
  externalRanges.sort((left, right) => left.start - right.start || right.end - left.end);
  const spans: RequestSpan[] = [];
  let cursor = 0;
  for (const range of externalRanges) {
    if (range.start < cursor) continue;
    if (range.start > cursor) spans.push({ start: cursor, end: range.start, source: "USER" });
    spans.push({ start: range.start, end: range.end, source: "EXTERNAL_SOURCE" });
    cursor = range.end;
  }
  if (cursor < request.length) spans.push({ start: cursor, end: request.length, source: "USER" });
  if (!spans.length) spans.push({ start: 0, end: request.length, source: "USER" });
  return spans.filter((span) => span.end > span.start);
}

function refinedLexicalRequestSpans(request: string): RequestSpan[] {
  const spans = deriveRequestSpans(request);
  return deriveAdmissionClausePatches(request, spans as AdmissionClauseSpan[]).provenance_spans as RequestSpan[] ?? spans;
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
  return requestForSource(request, spans, "USER") || "review external source content";
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

const MUTATION_BASE_VERBS = new Set(["make", "add", "apply", "adjust", "alter", "revise", "rewrite", "rework", "rebuild", "redesign", "repair", "overhaul", "refresh", "modernize", "revamp", "correct", "format", "rename", "patch", "fix", "change", "edit", "modify", "update", "implement", "build", "create", "document", "remove", "delete", "erase", "eliminate", "dispose", "drop", "destroy", "wipe", "purge", "obliterate", "eradicate", "expunge", "discard", "refactor", "write"]);
const MUTATION_GERUNDS = new Map([
  ["making", "make"], ["adding", "add"], ["applying", "apply"], ["adjusting", "adjust"], ["altering", "alter"], ["revising", "revise"], ["rewriting", "rewrite"], ["reworking", "rework"], ["rebuilding", "rebuild"], ["redesigning", "redesign"], ["repairing", "repair"], ["overhauling", "overhaul"], ["refreshing", "refresh"], ["modernizing", "modernize"], ["revamping", "revamp"], ["correcting", "correct"], ["formatting", "format"], ["renaming", "rename"], ["patching", "patch"],
  ["fixing", "fix"], ["changing", "change"], ["editing", "edit"], ["modifying", "modify"], ["updating", "update"], ["implementing", "implement"],
  ["building", "build"], ["creating", "create"], ["documenting", "document"], ["removing", "remove"], ["deleting", "delete"], ["erasing", "erase"], ["dropping", "drop"],
  ["destroying", "destroy"], ["eliminating", "eliminate"], ["disposing", "dispose"], ["wiping", "wipe"], ["purging", "purge"], ["obliterating", "obliterate"], ["eradicating", "eradicate"], ["expunging", "expunge"], ["discarding", "discard"], ["refactoring", "refactor"], ["writing", "write"],
]);
const MUTATION_POLITE_FORMS = new Map([
  ["made", "make"], ["added", "add"], ["applied", "apply"], ["adjusted", "adjust"], ["altered", "alter"], ["revised", "revise"], ["rewritten", "rewrite"], ["reworked", "rework"], ["rebuilt", "rebuild"], ["redesigned", "redesign"], ["repaired", "repair"], ["overhauled", "overhaul"], ["refreshed", "refresh"], ["modernized", "modernize"], ["revamped", "revamp"], ["corrected", "correct"], ["formatted", "format"], ["renamed", "rename"], ["patched", "patch"],
  ["fixed", "fix"], ["changed", "change"], ["edited", "edit"], ["modified", "modify"], ["updated", "update"], ["implemented", "implement"],
  ["built", "build"], ["created", "create"], ["documented", "document"], ["removed", "remove"], ["deleted", "delete"], ["erased", "erase"], ["dropped", "drop"],
  ["destroyed", "destroy"], ["eliminated", "eliminate"], ["disposed", "dispose"], ["wiped", "wipe"], ["purged", "purge"], ["obliterated", "obliterate"], ["eradicated", "eradicate"], ["expunged", "expunge"], ["discarded", "discard"], ["refactored", "refactor"], ["wrote", "write"],
]);
const MUTATION_NOUNS = new Set([
  "change", "changes", "fix", "fixes", "bug", "bugs", "error", "errors", "issue", "issues",
  "defect", "defects", "fault", "faults", "problem", "problems", "update", "updates", "edit", "edits",
  "modification", "modifications", "adjustment", "adjustments", "alteration", "alterations", "revision", "revisions", "rewrite", "rewrites", "rework", "rebuild", "rebuilding", "redesign", "redesigning", "overhaul", "overhauls", "refresh", "refreshes", "modernization", "modernizations", "revamp", "revamps", "patch", "patches", "correction", "corrections", "format", "formatting", "rename", "renames", "implementation", "implementations", "refactor", "refactors",
  "removal", "removals", "deletion", "deletions", "erasure", "erasures", "destruction", "elimination", "disposal",
]);
const DIRECT_MUTATION_VERBS = new Set(["add", "apply", "adjust", "alter", "revise", "rewrite", "rework", "rebuild", "redesign", "repair", "overhaul", "refresh", "modernize", "revamp", "correct", "format", "rename", "patch", "fix", "change", "edit", "modify", "update", "implement", "build", "create", "document", "remove", "delete", "erase", "eliminate", "dispose", "drop", "destroy", "wipe", "purge", "obliterate", "eradicate", "expunge", "discard", "refactor", "write"]);
const CLAUSE_LEADS = new Set(["and", "then", "also", "but", "so", "yet", "please", "kindly", "now", "still", "just", "only", "simply", "carefully", "directly", "immediately"]);
const NEGATION_WORDS = new Set(["no", "not", "none", "nothing", "never", "neither", "zero", "0"]);
const CONTINUATION_ACTIONS = new Set([
  ...MUTATION_BASE_VERBS, ...MUTATION_GERUNDS.keys(),
  "review", "reviewing", "audit", "auditing", "read", "reading", "inspect", "inspecting",
  "validate", "validating", "validation", "verify", "verifying", "verification", "test", "testing", "check", "checking", "diagnose", "diagnosing", "debug", "debugging",
]);

interface SemanticWord { value: string; index: number; end: number }
interface NegatedContinuationRange { start: number; separatorStart: number; continuationStart: number }

function semanticWords(text: string): SemanticWord[] {
  return [...text.matchAll(/[a-z][a-z0-9_-]*(?:['’][a-z]+)?/gi)].map((match) => ({
    value: match[0]!.toLowerCase().replace("’", "'"),
    index: match.index!,
    end: match.index! + match[0]!.length,
  }));
}

/**
 * Replace quoted spans with same-width whitespace before clause semantics are
 * evaluated. This keeps offsets stable while ensuring mentioned actions do not
 * become requested actions; a direct continuation outside the quote remains
 * visible to the classifier.
 */
function maskQuotedSpans(text: string): string {
  let result = "";
  let quote: string | null = null;
  let closing = "";
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]!;
    if (quote) {
      if (character === "\\") {
        result += " ";
        if (index + 1 < text.length) { result += " "; index += 1; }
        continue;
      }
      result += /\s/u.test(character) ? character : " ";
      if (character === closing && !(quote === "'" && /[A-Za-z0-9]/.test(text[index - 1] ?? "") && /[A-Za-z0-9]/.test(text[index + 1] ?? ""))) quote = null;
      continue;
    }
    if (["\"", "'", "`", "“", "‘"].includes(character)) {
      if (character === "'" && /[A-Za-z0-9]/.test(text[index - 1] ?? "")) { result += character; continue; }
      quote = character;
      closing = character === "“" ? "”" : character === "‘" ? "’" : character;
      result += " ";
      continue;
    }
    result += character;
  }
  return result;
}

function isClauseLead(word: string): boolean {
  return CLAUSE_LEADS.has(word) || (word.endsWith("ly") && !MUTATION_BASE_VERBS.has(word) && !MUTATION_GERUNDS.has(word));
}

function skipClauseLeads(words: SemanticWord[], start = 0): number {
  let index = start;
  while (index < words.length && isClauseLead(words[index]!.value)) index += 1;
  return index;
}

function directDestructiveNounRequest(clause: string): boolean {
  const normalized = clause.trim();
  if (/^(?:(?:please|kindly)\s+)?(?:review|audit|explain|inspect|quote|describe|document|test)\b/i.test(normalized)
    || /^(?:(?:please|kindly)\s+)?(?:add|implement|update|change|fix|build|create)\b[^.!?]{0,140}\b(?:parser|classifier|classification|detection|support|handling|tests?|docs?|documentation|wording|phrase|sentence|terms?)\b/i.test(normalized)) return false;
  return [
    /^(?:(?:please|kindly)\s+)?(?:finish|complete|perform|handle|execute|undertake)\b[^.!?]{0,180}\b(?:removal|deletion|erasure|destruction|elimination|disposal|purging|removing|deleting|erasing|dropping|destroying|wiping)\b/i,
    /^(?:(?:please|kindly)\s+)?(?:proceed|go\s+ahead)\s+with\b[^.!?]{0,180}\b(?:removal|deletion|erasure|destruction|elimination|disposal|purging|removing|deleting|erasing|dropping|destroying|wiping)\b/i,
    /^(?:we\s+would\s+be\s+grateful\s+for|i\s+would\s+appreciate|i['’]d\s+appreciate)\b[^.!?]{0,180}\b(?:removal|deletion|purging|removing|deleting|erasing|dropping|destroying|wiping)\b/i,
    /^(?:your\s+)?(?:purging|removing|deleting|erasing|dropping|destroying|wiping)\b[^.!?]{0,180}\bwould\s+be\s+appreciated\b/i,
    /^(?:(?:the|this|that|our|my|your)\s+)?[^.!?]{0,120}\b(?:removal|deletion)\s+would\s+be\s+appreciated\b/i,
    /^it\s+would\s+be\s+appreciated\s+if\b[^.!?]{0,180}\b(?:were|was|be)\s+(?:removed|deleted|erased|dropped|destroyed|wiped|purged)\b/i,
    /^(?:i['’]d|i\s+would|we['’]d|we\s+would)\s+(?:be\s+grateful\s+for|appreciate)\b[^.!?]{0,180}\b(?:removal|deletion|erasure|destruction|elimination|disposal)\b/i,
    /^(?:(?:the|this|that)\s+)?(?:removal|deletion|erasure|destruction|elimination|disposal)\s+of\b[^.!?]{0,180}\bwould\s+be\s+appreciated\b/i,
    /^(?:(?:please|kindly)\s+)?(?:can|could|would)\s+you\s+see\s+to\b[^.!?]{0,180}\b(?:removal|deletion|erasure|destruction|elimination|disposal)\b/i,
    /^(?:(?:please|kindly)\s+)?(?:can|could|would|might)\s+you\s+(?:please\s+|kindly\s+)?arrange(?:\s+for)?\b[^.!?]{0,180}\b(?:removal|deletion|erasure|destruction|elimination|disposal|purging)\b/i,
    /^(?:(?:please|kindly)\s+)?see\s+to\b[^.!?]{0,180}\b(?:removal|deletion|erasure|destruction|elimination|disposal)\b/i,
    /^(?:(?:please|kindly)\s+)?arrange(?:\s+for)?\b[^.!?]{0,160}\b(?:removal|deletion|erasure|destruction|elimination|disposal)\b/i,
    /^(?:(?:the|this|that|our|my|your)\s+)?[^.!?]{0,140}\b(?:ought|needs?|must|should)\s+to\s+be\s+(?:removed|deleted|erased|eliminated|disposed|dropped|destroyed|wiped|purged)\b/i,
    /^(?:(?:the|this|that|our|my|your)\s+)?[^.!?]{0,140}\b(?:needs?|must|should)\s+be\s+(?:removed|deleted|erased|eliminated|disposed(?:\s+of)?|dropped|destroyed|wiped|purged)\b/i,
    /^(?:(?:the|this|that|our|my|your)\s+)?[^.!?]{0,140}\b(?:needs?|requires?)\s+(?:removing|deleting|erasing|eliminating|disposing|dropping|destroying|wiping|purging)\b/i,
    /^(?:(?:the|this|that|our|my|your)\s+)?[^.!?]{0,140}\b(?:must|should|needs?\s+to)\s+disappear\b/i,
    /^(?:disposal|removal|deletion|erasure|destruction|elimination)\s+of\b[^.!?]{0,160}\b(?:is|remains?)\s+(?:required|needed|necessary)\b/i,
    /^(?:purge|disposal|removal|deletion|erasure|destruction|elimination)\s+of\b[^.!?]{0,160}\b(?:is|remains?)\s+(?:mandatory|compulsory|obligatory|required|needed|necessary)\b/i,
    /^(?:(?:the|this|that|our|my|your)\s+)?[^.!?]{0,120}\b(?:removal|deletion|erasure|destruction|elimination|disposal|purging)\s+(?:is|remains?)\s+(?:mandatory|compulsory|obligatory|required|needed|necessary)\b/i,
    /^(?:(?:the|this|that|our|my|your)\s+)?[^.!?]{0,140}\b(?:is|are)\s+(?:destined|due|intended)\s+for\s+(?:disposal|removal|deletion|erasure|destruction|purging)\b/i,
    /^(?:(?:please|kindly)\s+)?arrange(?:\s+for)?\b[^.!?]{0,160}\bto\s+be\s+(?:removed|deleted|erased|eliminated|disposed|dropped|destroyed|wiped|purged)\b/i,
    /^(?:(?:the|this|that|our|my|your)\s+)?[^.!?]{0,140}\bis\s+to\s+disappear\b/i,
    /^(?:(?:the|this|that|our|my|your)\s+)?[^.!?]{0,140}\b(?:is|are)\s+(?:marked|designated|scheduled|queued|slated|set)\s+for\s+(?:disposal|removal|deletion|erasure|destruction|purging)\b/i,
    /^(?:(?:the|this|that|our|my|your)\s+)?[^.!?]{0,140}\b(?:is|are)\s+(?:designated|scheduled|slated|set)\s+to\s+(?:be\s+)?(?:removed|deleted|erased|eliminated|disposed|dropped|destroyed|wiped|purged|disappear|vanish)\b/i,
    /^(?:(?:the|this|that|our|my|your)\s+)?[^.!?]{0,140}\b(?:has|have|required|is\s+required|needs?)\s+to\s+(?:disappear|vanish)\b/i,
    /^(?:(?:the|this|that|our|my|your)\s+)?[^.!?]{0,140}\b(?:has|have)\s+got\s+to\s+(?:be\s+)?(?:removed|deleted|erased|eliminated|disposed|dropped|destroyed|wiped|purged|go|disappear|vanish)\b/i,
    /^(?:(?:the|this|that|our|my|your)\s+)?[^.!?]{0,140}\bought\s+to\s+(?:go|disappear|vanish)\b/i,
    /^(?:(?:the|this|that|our|my|your)\s+)?[^.!?]{0,140}\b(?:is|are)\s+in\s+need\s+of\s+(?:removal|deletion|erasure|elimination|disposal|purging)\b/i,
    /^(?:(?:the|this|that|our|my|your)\s+)?[^.!?]{0,120}\b(?:removing|deleting|erasing|destroying|purging)\s+(?:is|remains?)\s+(?:mandatory|compulsory|obligatory|required|needed|necessary)\b/i,
    /^(?:(?:please|kindly)\s+)?see\s+to\s+it(?:\s+that)?\b[^.!?]{0,160}\b(?:is|are|be|gets?)\s+(?:removed|deleted|erased|eliminated|disposed|dropped|destroyed|wiped|purged)\b/i,
    /^(?:(?:please|kindly)\s+)?see\s+that\b[^.!?]{0,160}\b(?:is|are|be|gets?)\s+(?:removed|deleted|erased|eliminated|disposed|dropped|destroyed|wiped|purged)\b/i,
    /^(?:(?:please|kindly)\s+)?ensure\b[^.!?]{0,160}\b(?:is|are|be|get)\s+(?:removed|deleted|erased|eliminated|disposed|dropped|destroyed|wiped|purged)\b/i,
    /^(?:(?:please|kindly)\s+)?(?:make\s+sure|ensure)\b[^.!?]{0,160}\b(?:is|are|be|gets?|got)\s+(?:removed|deleted|erased|eliminated|disposed|dropped|destroyed|wiped|purged)\b/i,
    /^(?:it\s+would\s+(?:help|be\s+helpful)\s+if)\b[^.!?]{0,180}\b(?:were|was)\s+(?:removed|deleted|erased|eliminated|disposed|dropped|destroyed|wiped|purged)\b/i,
    /^(?:we|i)\s+(?:need|want)\b[^.!?]{0,180}\b(?:removal|deletion|erasure|destruction|elimination|disposal)\b/i,
    /^(?:removing|deleting|erasing|eliminating|disposing|dropping|destroying|wiping|purging)\b[^.!?]{0,180}\bis\s+what\s+(?:i|we)\s+(?:need|want)\b/i,
    /^(?:(?:please|kindly)\s+)?(?:have|get)\b[^.!?]{0,160}\b(?:removed|deleted|erased|eliminated|disposed|dropped|destroyed|wiped|purged|obliterated|eradicated|expunged|discarded)\b/i,
    /^(?:(?:please|kindly)\s+)?(?:get\s+rid\s+of|clear\s+out|take\s+care\s+of\s+(?:the\s+)?(?:removal|deletion|erasure|destruction|elimination|disposal))\b/i,
    /^(?:i|we)\s+(?:need|want|would\s+like)\b[^.!?]{0,160}\b(?:gone|removed|deleted|erased|destroyed|purged|discarded)\b/i,
    /^(?:(?:the|this|that|our|my|your)\s+)?[^.!?]{0,140}\b(?:has|have)\s+to\s+go\b/i,
    /^(?:(?:please|kindly)\s+)?make\b[^.!?]{0,160}\bdisappear\b/i,
  ].some((pattern) => pattern.test(normalized));
}

function imperativeMutationVerb(clause: string): string | null {
  if (directDestructiveNounRequest(clause)) return "remove";
  if (/^(?:(?:please|kindly)\s+)?(?:continue|resume)(?:\s+(?:with|on))?\s+(?:the\s+)?(?:repair|implementation|changes?|fixes?)(?:\s+work)?\b/i.test(clause.trim())) return "change";
  const passive = /\b(added|applied|corrected|patched|fixed|changed|edited|modified|updated|implemented|built|created|removed|deleted|erased|dropped|destroyed|wiped|purged|refactored|written)\b/i.exec(clause)?.[1]?.toLowerCase();
  const passiveRequest = /^(?:(?:please|kindly)\s+)?(?:(?:can|could|would|will|might|should)\b|(?:i|we)\s+(?:need|want|would\s+like)\b|(?:have|let)\b)/i.test(clause)
    && /\b(?:be|have|get|need|want|like|arrange|ensure|make)\b/i.test(clause);
  const possessiveRequest = /^(?:(?:please|kindly)\s+)?(?:complete|perform|handle|execute|implement|do|carry\s+out)\b[^.!?]{0,160}\b(?:removal|deletion|update|change|edit|modification)\b/i.test(clause)
    && !/\b(?:support|handling|parser|classifier|classification|detection|wording|terms?|tests?|docs?|documentation)\s+(?:for|of)\b/i.test(clause);
  if (passive && passiveRequest) return MUTATION_POLITE_FORMS.get(passive) ?? (passive === "written" ? "write" : null);
  if (possessiveRequest) {
    if (/\b(?:removal|deletion)\b/i.test(clause)) return "remove";
    return "change";
  }
  const words = semanticWords(clause);
  let index = skipClauseLeads(words);
  let allowGerund = false;
  if (["can", "could", "would", "will", "might"].includes(words[index]?.value ?? "") && words[index + 1]?.value === "you") {
    const modal = words[index]!.value;
    index = skipClauseLeads(words, index + 2);
    if (modal === "would" && words[index]?.value === "mind") {
      index = skipClauseLeads(words, index + 1);
      if (words[index]?.value === "if") index = skipClauseLeads(words, index + 1);
      allowGerund = true;
    } else if (words[index]?.value === "be" && words[index + 1]?.value === "able") {
      index = skipClauseLeads(words, index + 2);
      if (words[index]?.value === "to") index = skipClauseLeads(words, index + 1);
    } else if (words[index]?.value === "be" && words[index + 1]?.value === "so" && words[index + 2]?.value === "kind") {
      index = skipClauseLeads(words, index + 3);
      if (["as", "to"].includes(words[index]?.value ?? "")) index = skipClauseLeads(words, index + 1);
      if (words[index]?.value === "to") index = skipClauseLeads(words, index + 1);
    } else if (words[index]?.value === "be" && words[index + 1]?.value === "kind") {
      index = skipClauseLeads(words, index + 2);
      if (words[index]?.value === "enough") index = skipClauseLeads(words, index + 1);
      if (["as", "to"].includes(words[index]?.value ?? "")) index = skipClauseLeads(words, index + 1);
    } else if (modal === "would" && words[index]?.value === "care") {
      index = skipClauseLeads(words, index + 1);
      if (words[index]?.value === "to") index = skipClauseLeads(words, index + 1);
    } else if (words[index]?.value === "arrange") {
      index = skipClauseLeads(words, index + 1);
      if (words[index]?.value === "for") index = skipClauseLeads(words, index + 1);
      while (index < words.length && words[index]?.value !== "to") index += 1;
      if (words[index]?.value === "to") index = skipClauseLeads(words, index + 1);
      if (["be", "have"].includes(words[index]?.value ?? "")) index = skipClauseLeads(words, index + 1);
      const passiveIndex = words.slice(index).findIndex((word) => MUTATION_POLITE_FORMS.has(word.value));
      if (passiveIndex >= 0) index += passiveIndex;
      allowGerund = true;
    }
  } else if (["would", "could", "might"].includes(words[index]?.value ?? "") && words[index + 1]?.value === "it" && words[index + 2]?.value === "be" && words[index + 3]?.value === "possible") {
    index = skipClauseLeads(words, index + 4);
    if (words[index]?.value === "for" && words[index + 1]?.value === "you") index = skipClauseLeads(words, index + 2);
    if (words[index]?.value === "to") index = skipClauseLeads(words, index + 1);
  } else if (words[index]?.value === "do" && words[index + 1]?.value === "you" && words[index + 2]?.value === "mind") {
    index = skipClauseLeads(words, index + 3);
    if (words[index]?.value === "if") index = skipClauseLeads(words, index + 1);
    allowGerund = true;
  } else if ((words[index]?.value === "i" || words[index]?.value === "i'd") && (words[index + 1]?.value === "would" || words[index]?.value === "i'd") && ["really", "truly"].includes(words[index + (words[index]?.value === "i'd" ? 1 : 2)]?.value ?? "")) {
    const appreciateIndex = words.findIndex((word, wordIndex) => wordIndex >= index && word.value === "appreciate");
    if (appreciateIndex >= 0) index = skipClauseLeads(words, appreciateIndex + 1);
    else return null;
    if (["it", "you", "your"].includes(words[index]?.value ?? "")) index = skipClauseLeads(words, index + 1);
    if (words[index]?.value === "if") index = skipClauseLeads(words, index + 1);
    if (["you", "your"].includes(words[index]?.value ?? "")) index = skipClauseLeads(words, index + 1);
    allowGerund = true;
  } else if ((words[index]?.value === "i" && words[index + 1]?.value === "would" && words[index + 2]?.value === "appreciate") || (words[index]?.value === "i'd" && words[index + 1]?.value === "appreciate")) {
    index = skipClauseLeads(words, index + (words[index]?.value === "i'd" ? 2 : 3));
    if (words[index]?.value === "it") index = skipClauseLeads(words, index + 1);
    if (words[index]?.value === "if") index = skipClauseLeads(words, index + 1);
    if (["you", "your"].includes(words[index]?.value ?? "")) index = skipClauseLeads(words, index + 1);
    allowGerund = true;
  } else if (words[index]?.value === "i" && words[index + 1]?.value === "was" && words[index + 2]?.value === "hoping") {
    index = skipClauseLeads(words, index + 3);
    if (["you", "that"].includes(words[index]?.value ?? "")) index = skipClauseLeads(words, index + 1);
    if (["could", "would", "might"].includes(words[index]?.value ?? "")) index = skipClauseLeads(words, index + 1);
  } else if (
    (["i", "i'd"].includes(words[index]?.value ?? "") && words[index + 1]?.value === "be" && words[index + 2]?.value === "grateful")
    || (words[index]?.value === "i" && words[index + 1]?.value === "would" && words[index + 2]?.value === "be" && words[index + 3]?.value === "grateful")
  ) {
    index = skipClauseLeads(words, index + (words[index + 1]?.value === "would" ? 4 : 3));
    if (words[index]?.value === "if") index = skipClauseLeads(words, index + 1);
    if (words[index]?.value === "you") index = skipClauseLeads(words, index + 1);
    allowGerund = true;
  } else if (words[index]?.value === "may" && words[index + 1]?.value === "i" && words[index + 2]?.value === "ask") {
    index = skipClauseLeads(words, index + 3);
    if (words[index]?.value === "you") index = skipClauseLeads(words, index + 1);
    if (words[index]?.value === "to") index = skipClauseLeads(words, index + 1);
  } else if (words[index]?.value === "could" && words[index + 1]?.value === "i" && words[index + 2]?.value === "trouble") {
    index = skipClauseLeads(words, index + 3);
    if (words[index]?.value === "you") index = skipClauseLeads(words, index + 1);
    if (words[index]?.value === "to") index = skipClauseLeads(words, index + 1);
  } else if (words[index]?.value === "be" && words[index + 1]?.value === "so" && words[index + 2]?.value === "kind") {
    index = skipClauseLeads(words, index + 3);
    if (["as", "to"].includes(words[index]?.value ?? "")) index = skipClauseLeads(words, index + 1);
    if (words[index]?.value === "to") index = skipClauseLeads(words, index + 1);
  }
  if (["i", "i'd"].includes(words[index]?.value ?? "") && ["need", "want", "would", "like"].includes(words[index + 1]?.value ?? "")) {
    let cursor = index + 2;
    if (words[index + 1]?.value === "would" && words[cursor]?.value === "like") cursor += 1;
    if (words[cursor]?.value === "you") cursor += 1;
    if (words[cursor]?.value === "to") cursor += 1;
    index = skipClauseLeads(words, cursor);
  } else if (words[index]?.value === "let" && words[index + 1]?.value === "us") {
    index = skipClauseLeads(words, index + 2);
  } else if (words[index]?.value === "we" && ["should", "must", "need", "want", "can", "could"].includes(words[index + 1]?.value ?? "")) {
    index = skipClauseLeads(words, index + (words[index + 2]?.value === "to" ? 3 : 2));
  } else if (["can", "could", "should", "would"].includes(words[index]?.value ?? "") && words[index + 1]?.value === "we") {
    index = skipClauseLeads(words, index + 2);
  } else if (words[index]?.value === "go" && words[index + 1]?.value === "ahead") {
    index = skipClauseLeads(words, index + (words[index + 2]?.value === "and" ? 3 : 2));
  } else if (words[index]?.value === "have" && words[index + 1]?.value === "the" && words[index + 2]?.value === "agent") {
    index = skipClauseLeads(words, index + 3);
    if (words[index]?.value === "to") index = skipClauseLeads(words, index + 1);
  } else if (words[index]?.value === "lets" || words[index]?.value === "let's") {
    index = skipClauseLeads(words, index + 1);
  }
  if (["help", "assist"].includes(words[index]?.value ?? "")) {
    const helper = words[index]!.value;
    index += 1;
    if (["me", "us"].includes(words[index]?.value ?? "")) index += 1;
    if (["to", "in", "with"].includes(words[index]?.value ?? "")) index += 1;
    index = skipClauseLeads(words, index);
    allowGerund = helper === "assist" || MUTATION_GERUNDS.has(words[index]?.value ?? "");
  }
  let continuation = false;
  if (["continue", "resume"].includes(words[index]?.value ?? "")) {
    continuation = true;
    index += 1;
    if (words[index]?.value === "to") index += 1;
    index = skipClauseLeads(words, index);
  }
  const verbWord = words[index]?.value;
  if (!verbWord) return null;
  const verb = MUTATION_BASE_VERBS.has(verbWord) ? verbWord : continuation || allowGerund ? MUTATION_GERUNDS.get(verbWord) ?? MUTATION_POLITE_FORMS.get(verbWord) : undefined;
  if (!verb) return continuation && words.slice(index).some((word) => MUTATION_NOUNS.has(word.value)) ? "change" : null;
  const tail = words.slice(index + 1);
  if (tail.some((word) => NEGATION_WORDS.has(word.value))) return null;
  if (DIRECT_MUTATION_VERBS.has(verb)) return verb;
  return tail.some((word) => MUTATION_NOUNS.has(word.value)) ? verb : null;
}

function imperativeMutationClause(clause: string): boolean {
  return imperativeMutationVerb(clause) !== null;
}

function semanticClauses(text: string): string[] {
  return maskQuotedSpans(text)
    .replace(/\.(?=\s+[A-Z0-9])/g, ";")
    .split(/(?:--|\s-\s|[;!?,:—–()[\]{}]|\b(?:and|then|but|after\s+that|afterwards?)\b|\n\s*(?:[-*+]\s+|\d+[.)]\s+)?)/iu)
    .map((clause) => clause.trim())
    .filter(Boolean);
}

function hasImperativeMutation(text: string): boolean {
  return semanticClauses(text).some((clause) => imperativeMutationClause(clause));
}

function requestsDestructiveMutation(text: string, intent: Intent): boolean {
  if (!['CHANGE', 'OPERATE'].includes(intent)) return false;
  if (intent === "OPERATE" && /^\s*(?:(?:please|kindly)\s+)?(?:execute|run|perform)\s+(?:an?\s+)?destructive\s+(?:action|cleanup|operation|removal|deletion)\b/i.test(text)) return true;
  if (!/^(?:(?:please|kindly)\s+)?(?:add|implement|update|change|fix|build|create)\b[^.!?]{0,140}\b(?:parser|classifier|classification|detection|support|handling|tests?|docs?|documentation|wording|phrase|sentence|terms?)\b/i.test(text)
    && /\bimplement\b[^.!?]{0,100}\brequested\s+(?:change|action|request)\b[^.!?]{0,80}\b(?:remove|delete|erase|drop|destroy|wipe|purge)\b/i.test(text)) return true;
  const firstVerb = imperativeMutationVerb(text);
  if (firstVerb !== null && ["remove", "delete", "erase", "eliminate", "dispose", "drop", "destroy", "wipe", "purge", "obliterate", "eradicate", "expunge", "discard"].includes(firstVerb)) return true;
  if (/\b(?:implement|add|fix|update|document|test|review|explain|describe)\b[^.!?\n]{0,160}\b(?:delete|remove|erase|drop|purge|wipe|destroy|rm\s+-rf)\b[^.!?\n]{0,80}\b(?:verbs?|terms?|wording|commands?|classification|classifier|parser|support|handling|cases?|tests?|docs?|approval)\b/i.test(text)) return false;
  return semanticClauses(text).some((clause) => {
    const verb = imperativeMutationVerb(clause);
    return verb !== null && ["remove", "delete", "erase", "eliminate", "dispose", "drop", "destroy", "wipe", "purge", "obliterate", "eradicate", "expunge", "discard"].includes(verb);
  });
}

function continuationOffset(text: string): number | null {
  const words = semanticWords(maskQuotedSpans(text));
  let cursor = 0;
  for (let index = 0; index < words.length; index += 1) {
    const word = words[index]!;
    const gap = text.slice(cursor, word.index);
    if (gap.replace(/[\s,:—–-]/g, "")) return null;
    if (word.value === "continue" || word.value === "resume") {
      const suffix = text.slice(word.end).replace(/^\s*(?:--|[,:;—–/-])\s*/, "");
      const tailClause = suffix.split(/(?:--|\s-\s|[,;:—–/()[\]{}]|\n)/u)[0] ?? "";
      const tailWords = semanticWords(tailClause);
      let tailIndex = skipClauseLeads(tailWords);
      if (["to", "with", "on"].includes(tailWords[tailIndex]?.value ?? "")) tailIndex = skipClauseLeads(tailWords, tailIndex + 1);
      if (["the", "this", "that"].includes(tailWords[tailIndex]?.value ?? "") && ["work", "task", "implementation", "repair"].includes(tailWords[tailIndex + 1]?.value ?? "")) return word.index;
      if (CONTINUATION_ACTIONS.has(tailWords[tailIndex]?.value ?? "")) return word.index;
      if (["work", "task", "implementation", "repair", "changes", "fixes"].includes(tailWords[tailIndex]?.value ?? "")
        && !tailWords.slice(tailIndex + 1).some((candidate) => ["new", "unrelated", "separate", "different"].includes(candidate.value))) return word.index;
      if (["the", "this", "that", "these", "those"].includes(tailWords[tailIndex]?.value ?? "")) {
        const remainder = tailWords.slice(tailIndex + 1).map((candidate) => candidate.value);
        if (remainder.some((candidate) => MUTATION_NOUNS.has(candidate) || ["work", "task", "implementation", "repair", "validation", "review", "audit", "reading", "inspection"].includes(candidate))) return word.index;
      }
      return null;
    }
    if (!isClauseLead(word.value)) return null;
    cursor = word.end;
  }
  return null;
}

function negatedPrefixOffset(prefix: string): number | null {
  const conventional = /\b(?:(?:please|kindly)\s+)?(?:do\s+not|don't|must\s+not|never|without)\b/i.exec(prefix);
  if (conventional) return conventional.index;
  const words = semanticWords(prefix);
  for (let index = 0; index < words.length; index += 1) {
    if (!MUTATION_BASE_VERBS.has(words[index]!.value)) continue;
    if (words.slice(index + 1).some((word) => NEGATION_WORDS.has(word.value))) return words[index]!.index;
  }
  return null;
}

function negatedContinuationRanges(text: string): NegatedContinuationRange[] {
  const ranges: NegatedContinuationRange[] = [];
  const separators = [...text.matchAll(/--|\s-\s|[,;:—–/()[\]{}]|\n\s*(?:[-*+]\s+|\d+[.)]\s+)?/gu)];
  for (const separator of separators) {
    const separatorStart = separator.index!;
    const separatorEnd = separatorStart + separator[0]!.length;
    const downstreamOffset = continuationOffset(text.slice(separatorEnd));
    if (downstreamOffset === null) continue;
    const prior = text.slice(0, separatorStart);
    const strong = [...prior.matchAll(/--|\s-\s|[.!?;:—–/()[\]{}]|\n/gu)].at(-1);
    const windowStart = strong ? strong.index! + strong[0]!.length : 0;
    const negativeOffset = negatedPrefixOffset(text.slice(windowStart, separatorStart));
    if (negativeOffset === null) continue;
    const start = windowStart + negativeOffset;
    const continuationStart = separatorEnd + downstreamOffset;
    if (ranges.some((range) => start < range.continuationStart)) continue;
    ranges.push({ start, separatorStart, continuationStart });
  }
  return ranges;
}

function transformNegatedContinuations(text: string, preservePrefix: boolean): string {
  const ranges = negatedContinuationRanges(text);
  if (!ranges.length) return text;
  let result = "";
  let cursor = 0;
  for (const range of ranges) {
    result += text.slice(cursor, range.start);
    if (preservePrefix) result += `${text.slice(range.start, range.separatorStart).trim()}; `;
    else result += " ";
    cursor = range.continuationStart;
  }
  return result + text.slice(cursor);
}

function isNegatedImperativeMutationClause(clause: string): boolean {
  const words = semanticWords(clause);
  let index = skipClauseLeads(words);
  if (!MUTATION_BASE_VERBS.has(words[index]?.value ?? "")) return false;
  return words.slice(index + 1).some((word) => word.value === "no" || word.value === "nothing");
}

function stripNegatedImperativeMutationClauses(text: string): string {
  return text.split(/((?:--|\s-\s|[.;!?,:—–/()[\]{}]|\n\s*(?:[-*+]\s+|\d+[.)]\s+)?))/u).map((part, index) => index % 2 === 0 && isNegatedImperativeMutationClause(part) ? " " : part).join("");
}

function stripNegatedClauses(text: string): string {
  const positiveBoundary = String.raw`(?:review|audit|read|inspect|validate|verify|check|diagnose|debug|add|implement|fix|change|build|create|update|remove|refactor|write|run|execute|explain|report)`;
  const boundary = new RegExp(String.raw`(?=(?:[.;:/]|,\s*(?:(?:but|instead|then|and)\s+)?(?=${positiveBoundary}\b)|\bbut\b|$))`, "gi");
  return stripNegatedImperativeMutationClauses(transformNegatedContinuations(text, false))
    .replace(/\b(?:is|are|was|were)\s+not\s+(?:required|needed|supposed|expected)\s+to\s+(?:disappear|be\s+(?:removed|deleted|erased|eliminated|disposed|dropped|destroyed|wiped|purged))\b[^.;,]*/gi, " ")
    .replace(/\b(?:do not|don't|must not|never)\b(?=[^.;,]*\b(?:change|modify|implement|edit|write)\w*\b)[^.;,]*,\s*(?=(?:continue|resume)\b)/gi, " ")
    .replace(/\bwithout\b(?=[^.;,]*\b(?:chang|modify|implement|edit|writ)\w*\b)[^.;,]*,\s*(?=(?:continue|resume)\b)/gi, " ")
    .replace(new RegExp(String.raw`\b(?:do not|don't|must not|never)\b.*?${boundary.source}`, "gi"), " ")
    .replace(new RegExp(String.raw`\bwithout\b.*?${boundary.source}`, "gi"), " ");
}

function hasExplicitNoMutationConstraint(text: string): boolean {
  const unquoted = maskQuotedSpans(text);
  if (/\b(?:none|not\s+one)\s+of\s+(?:the\s+)?(?:(?:repository|repo|project|codebase)(?:['’]s)?\s+)?(?:files?|contents?|items?|records?|entries?)\b[^.!?;]{0,100}\b(?:may|can|must|should|shall)\s+(?:change|be\s+(?:changed|modified|edited|written|touched|altered))\b/i.test(unquoted)) return true;
  return semanticClauses(unquoted).some((clause) => {
    const normalized = clause.trim();
    if (/^(?:(?:please|kindly)\s+)?(?:add|implement|document|test|describe|explain)\b[^.!?]{0,120}\b(?:read[- ]only|no[- ]mutation|no\s+(?:writes?|changes?|edits?|modifications?)|(?:leave|leaving)\b[^.!?]{0,80}\buntouched)\b/i.test(normalized)) return false;
    return /^(?:(?:this|the)\s+(?:request|task|work)\s+is\s+)?read[- ]only\b/i.test(normalized)
      || /^(?:(?:please|kindly)\s+)?(?:make|add|apply|adjust|alter|revise|rewrite|rework|correct|format|rename|patch|fix|change|edit|modify|update|implement|build|create|document|remove|delete|erase|eliminate|dispose|drop|destroy|wipe|purge|obliterate|eradicate|expunge|discard|refactor|write)\s+(?:none\s+of\s+|zero\s+|0\s+)(?:the\s+)?(?:repository\s+|repo\s+|project\s+|codebase\s+)?(?:files?|contents?|items?|records?|entries?)\b/i.test(normalized)
      || /^(?:no|without)\s+(?:code\s+|repository\s+|file\s+)?mutations?\b/i.test(normalized)
      || /^(?:make|apply|perform)\s+no\s+(?:(?:repository|repo|project|codebase|file)\s+)?(?:writes?|changes?|edits?|modifications?|mutations?)\b/i.test(normalized)
      || /\b(?:do\s+not|don't|must\s+not|never)\s+(?:(?:make|apply|perform)\s+)?(?:any\s+)?(?:(?:repository|repo|project|codebase|file)\s+)?(?:writes?|changes?|edits?|modifications?|mutations?|modify|change|edit|write|mutate|alter)\b/i.test(normalized)
      || /\bwithout\s+(?:(?:making|applying|performing)\s+)?(?:any\s+)?(?:(?:repository|repo|project|codebase|file)\s+)?(?:writes?|changes?|edits?|modifications?|mutations?|modifying|changing|editing|writing|mutating|altering|revising)\b/i.test(normalized)
      || /\b(?:leave|leaving|keep|keeping)\s+(?:(?:all|every|each)\s+)?(?:the\s+)?(?:(?:repository|repo|project|codebase)(?:\s+(?:files?|contents?))?|files?|contents?)\s+(?:entirely\s+|completely\s+)?(?:untouched|unchanged)\b/i.test(normalized)
      || /\b(?:(?:all|every|each)\s+)?(?:(?:repository|repo|project|codebase)\s+)?(?:files?|contents?)\s+must\s+(?:stay|remain)\s+(?:entirely\s+|completely\s+)?(?:untouched|unchanged)\b/i.test(normalized)
      || /\bpreserve\s+(?:(?:all|every|each)\s+)?(?:the\s+)?(?:(?:repository|repo|project|codebase)(?:\s+(?:files?|contents?))?|files?|contents?)\s+(?:entirely\s+|completely\s+)?(?:untouched|unchanged)\b/i.test(normalized)
      || /\bno\s+(?:(?:repository|repo|project|codebase)\s+)?(?:files?|contents?)\s+(?:may|can|must|should)\s+(?:change|be\s+(?:changed|modified|edited|written|touched))\b/i.test(normalized)
      || /\b(?:all|every|each)\s+(?:(?:repository|repo|project|codebase)\s+)?(?:files?|contents?)\s+(?:are\s+to|must|shall)\s+(?:remain|be\s+kept)\s+(?:entirely\s+|completely\s+)?(?:unmodified|unchanged|untouched)\b/i.test(normalized)
      || /\bnone\s+of\s+(?:the\s+)?(?:(?:repository|repo|project|codebase)\s+)?(?:files?|contents?)\s+(?:may|can|must|should)\s+be\s+(?:modified|changed|edited|written|touched)\b/i.test(normalized)
      || /\bno\s+(?:(?:repository|repo|project|codebase)\s+)?(?:files?|contents?)\s+(?:are|is)\s+to\s+be\s+(?:modified|changed|edited|written|touched)\b/i.test(normalized)
      || /\b(?:all|every|each)\s+(?:(?:repository|repo|project|codebase)\s+)?(?:files?|contents?)\s+(?:are|is)\s+(?:required|expected|supposed)\s+to\s+(?:remain|stay|be\s+kept)\s+(?:entirely\s+|completely\s+)?(?:unmodified|unchanged|untouched)\b/i.test(normalized)
      || /\b(?:all|every|each)\s+(?:(?:repository|repo|project|codebase)\s+)?(?:files?|contents?)\s+(?:are|is)\s+not\s+to\s+be\s+(?:modified|changed|edited|written|touched)\b/i.test(normalized);
  });
}

function terminalReviewOnlyAction(text: string): string | null {
  const match = /^(.*?\b(?:add|apply|adjust|alter|revise|rewrite|rework|rebuild|redesign|repair|overhaul|refresh|modernize|revamp|change|edit|modify|update|remove|delete|erase|dispose|destroy|wipe|purge|discard|write|execute|run|push)\b[\s\S]*?)(?:\s*(?:[.;,:—–-]|--)+\s*|\s+)(?:(?:for\s+)?(?:review|analysis|assessment|compliance\s+(?:review|analysis|assessment))\s+only|(?:for\s+)?(?:review|analysis|assessment|compliance\s+(?:review|analysis|assessment))\s+purposes?|(?:for|as\s+part\s+of)\s+(?:a\s+)?(?:safety|security|risk|compliance)\s+(?:review|analysis|assessment)|(?:safety|security|risk|compliance)\s+(?:review|analysis|assessment)\s+only)\s*[.!?]*$/i.exec(maskQuotedSpans(text).trim());
  return match?.[1]?.trim() || null;
}

function passiveActionAssessment(text: string): boolean {
  const normalized = text.trim();
  const hasDirectContinuation = /(?:^|[.!?;—-]\s*)(?:direct\s+user\s+request\s*:\s*|(?:(?:then|please)\s+)?)(?:carry(?:\s+(?:it|that))?\s+out|do\s+(?:it|that)|execute\s+(?:it|that|this|the\s+action|the\s+request|(?:the\s+)?requested\s+action)(?:\s+now)?|perform\s+(?:it|that|that\s+action|the\s+action|(?:the\s+)?requested\s+action)|act\s+on\s+(?:it|that|the\s+action|(?:the\s+)?requested\s+action)(?:\s+now)?|take\s+(?:it|that|the\s+action|(?:the\s+)?requested\s+action)|proceed(?:\s+with\s+(?:it|that))?)\b/i.test(normalized);
  return /^(?:should|could|would|can|might)\s+(?!you\b)[^.!?]{0,180}\b(?:be|get)\s+(?:removed|deleted|erased|eliminated|disposed|dropped|destroyed|wiped|purged)\s*\?$/i.test(normalized)
    || /^(?:should|could|would|can|might)\s+(?!you\b)[^.!?]{0,180}\b(?:be|get)\s+(?:removed|deleted|erased|eliminated|disposed|dropped|destroyed|wiped|purged)\s+for\s+(?:compliance|safety|security|risk)\s+(?:review|analysis|assessment)\s*\?$/i.test(normalized)
    || /(?:^|[.!?;—–-]\s*)(?:analy[sz]e|assess|review|evaluate|inspect|audit)\s+whether\b[^.!?]{0,180}\b(?:execute|perform|act\s+on|take|carry\s+out|do|proceed\s+with|should\s+be\s+performed)\b/i.test(normalized)
    || /^(?:remove|delete|erase|destroy|purge|wipe)\s+(?:no|nothing)\b[^.!?]{0,160}(?:--|\s-\s|[.;,:—–])\s*(?:then\s+)?(?:continue|resume)\s+(?:to\s+)?(?:review|reviewing|audit|auditing|inspect|inspecting|validate|validating|verify|verifying|check|checking)\b/i.test(normalized)
    || /^(?:risk|safety|security)\s+(?:review|analysis|assessment)\s*:/i.test(normalized)
    || /^(?:review|assess|evaluate|audit|inspect|analy[sz]e|discuss)\s*:\s*(?:quoted|copied|pasted|external)\b/i.test(normalized)
    || (!hasDirectContinuation && /^(?:review|assess|evaluate|audit|inspect|analy[sz]e|discuss)\s*:\s*(?:should|could|would|can|might)\b/i.test(normalized))
    || (!hasDirectContinuation && /^(?:review|assess|evaluate|audit|inspect|analy[sz]e)\s+whether\b/i.test(normalized))
    || (!hasDirectContinuation && /^(?:review|assess|evaluate|audit|inspect|analy[sz]e|discuss)\s+(?:this\s+)?(?:copied|external)\s+instruction\b/i.test(normalized));
}

function hasTerminalExecutionCancellation(text: string): boolean {
  return /(?:^|[.!?;]\s*)(?:please\s+)?(?:do\s+not|don't|never)\s+(?:execute|perform|act\s+on|take)(?:\s+(?:it|that|this|the\s+action|the\s+request|(?:the\s+)?(?:requested\s+action|action\s+requested)))?\s*[.!?]*\s*$/i.test(text);
}

function terminalReviewOverride(text: string): { relation: Relation; clause: string } | null {
  if (terminalReviewOnlyAction(text)) return { relation: "OVERRIDE", clause: "Review only." };
  const clauses = [...text.matchAll(/(?:^|[.!?;]\s*)((?:(?:cancel|stop|abort)(?:\s+(?:that|it|this|the\s+(?:action|request|task|work)))?|instead|actually)\b[\s\S]*?)[.!?]*\s*$/gi)];
  const clause = clauses.at(-1)?.[1]?.trim();
  if (!clause || !/\b(?:review|audit|inspect|assess|evaluate|examine|critique|discuss|summari[sz]e|check|tell\s+me\s+(?:whether|if)|analy[sz]e|analysis)\b/i.test(clause)) return null;
  if (/\b(?:execute|perform|act\s+on|take\s+(?:it|that|the\s+action|(?:the\s+)?(?:requested\s+action|action\s+requested))|carry\s+out|do\s+it|proceed)\b/i.test(clause) && !/\b(?:do\s+not|don't|never|without)\b/i.test(clause)) return null;
  return { relation: /^(?:cancel|stop|abort)\b/i.test(clause) ? "CANCEL" : "OVERRIDE", clause };
}

function hasCancellationDirective(text: string): boolean {
  return /(?:^|[.!?;]\s*)(?:please\s+)?(?:cancel|stop|abort)(?:\s+(?:that|it|this|now|the\s+(?:action|request|task|work)|current\s+(?:task|work)))?\s*[.!?]*\s*$/i.test(text);
}

function inferRelation(text: string): Relation {
  const reviewOverride = terminalReviewOverride(text);
  if (reviewOverride) return reviewOverride.relation;
  if (hasTerminalExecutionCancellation(text) && !/\b(?:copied|quoted|external)\s+(?:request|instruction|analysis)\b/i.test(text)) return "CANCEL";
  const actionable = stripNegatedClauses(text);
  if (hasCancellationDirective(actionable)) return "CANCEL";
  if (/^(?:what(?:'s| is)\s+)?(?:the\s+)?(?:status|progress)\b|\b(where are we|what remains|status update)\b/i.test(actionable.trim())) return "STATUS";
  if (/\b(instead|replace the request|override)\b/i.test(actionable)) return "OVERRIDE";
  if (/\b(also|additionally|amend)\b/i.test(actionable)) return "AMEND";
  if (/^\s*(?:continue|resume)\b[^.!?]{0,80}\b(?:new|unrelated|separate|different)\b[^.!?]{0,40}\b(?:task|objective|request|workline)\b/i.test(actionable)) return "NEW";
  if (/(?:^|[.!?;]\s*)CONTINUE\s*(?::|—|–|\s-\s)\s*(?:continue|resume|review|audit|inspect|validate|verify|test|check|change|update|implement|repair)\b/i.test(actionable)
    || continuationOffset(actionable.trim()) !== null || /^\s*(?:(?:please|kindly)\s+)?(?:pick up|carry on)(?:\s+with)?\b/i.test(actionable)) return "CONTINUE";
  if (/^\s*(?:(?:(?:can|could|would)\s+you|please)\s+)?(?:explain|discuss|describe|what(?:'s| is)|how\s+does|why\s+does)\b/i.test(actionable) && !hasImperativeMutation(actionable)) return "CONVERSATION_ONLY";
  return "NEW";
}

function stripEmbeddedReviewAction(text: string): string {
  if (terminalReviewOnlyAction(text)) return "Review only.";
  if (!/\b(?:delete|deleting|deletion|remove|removed|removing|removal|erase|erasing|erasure|eliminate|eliminating|disposal|dispose|disposed|disposing|drop|dropping|destroy|destroying|destruction|wipe|wiping|purge|purged|purging|obliterate|obliterating|eradicate|eradicating|expunge|expunging|discard|discarding|disappear|repository[- ]wide|repo[- ]wide|repository[- ]level|whole[- ](?:repository|repo|codebase|project)|whole\s+(?:repository|repo|codebase|project)|entire\s+(?:repository|repo|codebase|project)|codebase[- ]wide|project[- ]wide|throughout\s+(?:the\s+)?(?:repository|repo|codebase|project)|across\s+all\s+(?:repository|repo|codebase|project)\s+files|(?:all|every)\s+files?\s+in\s+(?:this|the)\s+(?:repository|repo|codebase|project))\b/i.test(text)) return text;
  const spans = deriveRequestSpans(text);
  const external = requestForSource(text, spans, "EXTERNAL_SOURCE");
  return external.trim() ? classificationRequestFromSpans(text, spans) : text;
}

function stripQuotedReferencedActions(text: string): string {
  return text
    .replace(/(["'`])\s*(?:(?:please|then)\s+)?take\s+(?:it|that|the\s+action|(?:the\s+)?(?:requested\s+action|action\s+requested))\s*[.!?]*\1/gi, " reviewed phrase ")
    .replace(/[“‘]\s*(?:(?:please|then)\s+)?take\s+(?:it|that|the\s+action|(?:the\s+)?(?:requested\s+action|action\s+requested))\s*[.!?]*[”’]/gi, " reviewed phrase ");
}

function inferIntent(text: string): Intent {
  if (terminalReviewOverride(text)) return "REVIEW";
  if (passiveActionAssessment(text)) return "REVIEW";
  if (hasTerminalExecutionCancellation(text)) return "ANSWER";
  const lexicallyActionable = stripQuotedReferencedActions(stripEmbeddedReviewAction(text));
  const actionable = stripNegatedClauses(lexicallyActionable)
    .replace(/(["'`])(?:(?:please|then)\s+)?(?:proceed(?:\s+with\s+(?:it|that))?|carry(?:\s+(?:it|that))?\s+out|do\s+(?:it|that)|go\s+ahead(?:\s+and\s+(?:do\s+(?:it|that)|carry(?:\s+(?:it|that))?\s+out))?)\1/gi, " reviewed phrase ")
    .replace(/[“‘](?:(?:please|then)\s+)?(?:proceed(?:\s+with\s+(?:it|that))?|carry(?:\s+(?:it|that))?\s+out|do\s+(?:it|that)|go\s+ahead(?:\s+and\s+(?:do\s+(?:it|that)|carry(?:\s+(?:it|that))?\s+out))?)[”’]/gi, " reviewed phrase ")
    .replace(/\bwithout\s+(?:actually\s+)?(?:carrying|executing|performing|doing)\s+(?:it|that|anything)\s+(?:out)?\b/gi, " without execution ");
  if (hasExplicitNoMutationConstraint(lexicallyActionable)) {
    if (/\b(validate|validating|validation|tests?|testing|verify|verifying|verification|checks?|checking)\b/i.test(lexicallyActionable)) return "VALIDATE";
    if (/\b(diagnose|diagnosing|debug|debugging|root\s+cause|why\s+failing)\b/i.test(lexicallyActionable)) return "DIAGNOSE";
    if (/\b(review|reviewing|audit|auditing|read|reading|inspect|inspecting|assess|evaluate|examine|critique|analy[sz]e|analysis)\b/i.test(lexicallyActionable)) return "REVIEW";
    return "ANSWER";
  }
  if (/^(?:(?:write\s+access|writes?)\s+(?:ends?|stops?)\s+at|(?:the\s+)?write\s+(?:scope|boundary|perimeter)\s+(?:ends?|stops?)\s+at|(?:all\s+)?(?:writes?|changes?|edits?)\s+(?:are\s+)?capped\s+(?:at|by|to)|nothing\s+(?:outside|beyond)\b[^.!?]{0,120}\b(?:may|can|must)\s+change|[^.!?]{1,120}\b(?:is|are)\s+where\s+(?:all\s+)?(?:writes?|changes?|edits?)\s+(?:stop|end))\b/i.test(actionable)) return "ANSWER";
  if (/^(?:add|implement|update|change|fix|build|create|document|test)\b[^.!?]{0,180}\b(?:parser|classifier|classification|detection|support|handling|tests?|docs?|documentation|wording|phrase|statement|claim|sentence|terms?)\b/i.test(actionable)) return "CHANGE";
  if (/\b(cancel|stop|abort)\b/i.test(actionable)) return "OPERATE";
  if (/\b(?:(?:please|then)\s+)?(?:proceed(?:\s+with\s+(?:it|that))?|carry(?:\s+(?:it|that))?\s+out|do\s+(?:it|that)|execute\s+(?:it|that|this|(?:the\s+)?(?:requested\s+action|action\s+requested))(?:\s+now)?|perform\s+(?:it|that|that\s+action|(?:the\s+)?(?:requested\s+action|action\s+requested))|act\s+on\s+(?:it|that|(?:the\s+)?(?:requested\s+action|action\s+requested))(?:\s+now)?|take\s+(?:it|that|the\s+action|(?:the\s+)?(?:requested\s+action|action\s+requested))|go\s+ahead(?:\s+and\s+(?:do\s+(?:it|that)|carry(?:\s+(?:it|that))?\s+out))?)(?!\s+and\s+(?:make|add|apply|fix|change|edit|modify|update|implement|build|create|remove|delete|refactor|write))\b/i.test(actionable)) return "OPERATE";
  if (/^\s*(?:(?:(?:can|could|would|will|might)\s+you|(?:would|could|might)\s+it\s+be\s+possible\s+(?:for\s+you\s+)?to|may\s+i\s+ask\s+you\s+to|(?:i|we)\s+(?:need|want|would\s+like)\s+you\s+to)\s+)?(?:(?:please|kindly)\s+)?(?:run|execute|perform)\s+(?:(?:sudo|env|command|exec|xargs)\s+)*(?:git|gh|rm|mv|cp|chmod|chown|curl|wget|ssh|scp|rsync|sed|awk|perl|find|docker|kubectl|terraform|aws|gcloud|az|npm|pnpm|yarn|bun|npx|python|python3|pip|pip3|uv|bash|sh|zsh)\b/i.test(actionable)) return "OPERATE";
  if (/^\s*would\s+you\s+mind\s+(?:running|executing|performing)\s+(?:(?:sudo|env|command|xargs)\s+)*(?:git|gh|rm|mv|cp|chmod|chown|curl|wget|ssh|scp|rsync|sed|awk|perl|find|docker|kubectl|terraform|aws|gcloud|az|npm|pnpm|yarn|bun|npx|python|python3|pip|pip3|uv|bash|sh|zsh)\b/i.test(actionable)) return "OPERATE";
  const actionBoundary = /(?:^|[.;,]\s*|\b(?:and|then|after\s+that|afterwards?|also|please)\s+)(?:please\s+)?/i;
  const requestedOperate = new RegExp(`${actionBoundary.source}(?:run|operate|deploy|publish|push|send|execute|perform|act|rotate)(?:d|s|ing)?\\b`, "i").test(actionable);
  const requestedMutation = hasImperativeMutation(actionable);
  const conversational = /^\s*(?:please\s+)?(?:explain|discuss|describe|critique|summari[sz]e|check|tell\s+me\s+whether|analy[sz]e|provide\s+(?:an?\s+)?analysis|what(?:'s| is)|how\s+does|why\s+does)\b/i.test(actionable);
  const validationIndex = [
    actionable.search(/\b(validate|validating|validation|tests?|testing|verify|verifying|verification|checks?|checking|assertions?)\b/i),
    actionable.search(/\b(?:(?:focused|targeted|admission|unit|integration|regression|corpus|hook|security)\s+)*(?:run|execution|invocation)\b[^.!?]{0,180}\b(?:passed|failed|succeeded|completed)\b/i),
  ].filter((index) => index >= 0).sort((left, right) => left - right)[0] ?? -1;
  const explicitReadCandidates: Array<{ intent: Intent; index: number }> = [
    { intent: "VALIDATE", index: validationIndex },
    { intent: "REVIEW", index: actionable.search(/\b(review|reviewing|audit|auditing|read|reading|inspect|inspecting|critique|discuss|summari[sz]e|check|analy[sz]e)\b|tell\s+me\s+whether/i) },
    { intent: "DIAGNOSE", index: actionable.search(/\b(diagnose|debug|root cause|why failing)\b/i) },
  ];
  const explicitReads = explicitReadCandidates.filter((candidate) => candidate.index >= 0);
  if (!requestedOperate && !requestedMutation && conversational) return "ANSWER";
  if (!requestedOperate && !requestedMutation && explicitReads.length) {
    return explicitReads.sort((left, right) => left.index - right.index)[0]!.intent;
  }
  if (requestedOperate) return "OPERATE";
  if (requestedMutation) return "CHANGE";
  if (explicitReads.length) return explicitReads.sort((left, right) => left.index - right.index)[0]!.intent;
  if (/\b(research|discover|explore|investigate|plan|design)\b/i.test(actionable)) return "DISCOVER";
  return "ANSWER";
}

function inferTags(text: string, intent: Intent, relation: Relation): string[] {
  if (relation === "CANCEL" && hasTerminalExecutionCancellation(text)) return ["always"];
  const effectiveText = terminalReviewOverride(text)?.clause ?? text;
  const lower = stripQuotedReferencedActions(stripEmbeddedReviewAction(effectiveText)).toLowerCase();
  const actionable = stripNegatedClauses(lower);
  const noMutation = hasExplicitNoMutationConstraint(effectiveText);
  const tags = ["always"];
  if (!noMutation && /\b(?:(?:please|then)\s+)?(?:proceed(?:\s+with\s+(?:it|that))?|carry(?:\s+(?:it|that))?\s+out|do\s+(?:it|that)|execute\s+(?:it|that|this|(?:the\s+)?(?:requested\s+action|action\s+requested))(?:\s+now)?|perform\s+(?:it|that|that\s+action|(?:the\s+)?(?:requested\s+action|action\s+requested))|act\s+on\s+(?:it|that|(?:the\s+)?(?:requested\s+action|action\s+requested))(?:\s+now)?|take\s+(?:it|that|the\s+action|(?:the\s+)?(?:requested\s+action|action\s+requested))|go\s+ahead(?:\s+and\s+(?:do\s+(?:it|that)|carry(?:\s+(?:it|that))?\s+out))?)(?!\s+and\s+(?:make|add|apply|fix|change|edit|modify|update|implement|build|create|remove|delete|refactor|write))\b/.test(actionable)) tags.push("referenced-action");
  if (relation === "STATUS" || ["REVIEW", "DIAGNOSE", "VALIDATE"].includes(intent)) tags.push("current-state");
  if (intent === "REVIEW") tags.push("review");
  if (intent === "DIAGNOSE") tags.push("diagnose");
  if (relation === "STATUS") tags.push("status");
  if (!noMutation && /\b(typo|formatting|import cleanup|rename local)\b/.test(actionable)) tags.push("atomic-change");
  if (!noMutation && intent === "CHANGE" && !tags.includes("atomic-change")) tags.push("behavior-change");
  if (!noMutation && ["CHANGE", "OPERATE"].includes(intent) && /\b(public|schema|contract|api|cli flag|state change|refactor)\b/.test(actionable)) tags.push("behavior-change");
  if (/\b(dependent|connected|multi[- ]turn|long[- ]running)\b/.test(actionable)) {
    tags.push("multi-turn");
    if (["CHANGE", "OPERATE"].includes(intent)) tags.push("connected");
  }
  if (["CHANGE", "OPERATE"].includes(intent) && /^\s*(?:(?:please|kindly)\s+)?resume\b/.test(actionable) && continuationOffset(actionable.trim()) !== null) tags.push("multi-turn", "connected");
  if (/\b(program|epic|worklines?|multi[- ]owner|release join)\b/.test(actionable)) tags.push("program");
  if (["CHANGE", "OPERATE"].includes(intent) && /\b(simulation|simulate|campaign|synthetic persona|synthetic actor|persona simulation)\b/.test(actionable)) {
    tags.push("simulation");
    if (/\b(campaign|controlled comparison|benchmark|calibration|treatments?|populations?|datasets?|claim ledger|release(?:-eligible| evidence)?|independent evaluation|repeated runs?|terminal gates?)\b/.test(actionable)) {
      tags.push("simulation-campaign", "connected", "multi-turn");
    }
  }
  if (/\b(release|release-eligible)\b/.test(actionable)) tags.push("release");
  if (/\bdeploy\b/.test(actionable)) tags.push("deploy");
  if (/\bmerge[- ]eligible\b/.test(actionable)) tags.push("merge-eligible");
  if (/\b(full scan|exhaustive)\b/.test(actionable) || (!noMutation && /\brepository-wide\b/.test(actionable))) tags.push("full-scan");
  if (/\b(?:1[0-5])\b/.test(actionable) && /\b(program|worklines?|release join)\b/.test(actionable)) tags.push("full-scan");
  if (/\b(migration|migrate)\b/.test(actionable)) tags.push("migration");
  if (/\b(auth|authentication|authorization|tenant)\b/.test(actionable)) tags.push("auth");
  if (/\b(secret|credential|api key|token)\b/.test(actionable)) tags.push("secret");
  if (/\b(payment|billing)\b/.test(actionable)) tags.push("payment");
  if (/\b(safety|medical|legal)\b/.test(actionable)) tags.push("safety");
  if (!noMutation && /\b(external write|send email|create issue|publish|push)\b/.test(actionable)) tags.push("external-write");
  if (!noMutation && (/\b(privileged|sudo|production credential)\b/.test(actionable) || /\b(rotate|replace).{0,24}\b(secret|credential|api key|token)\b/.test(actionable))) tags.push("privileged");
  const requestsDestructiveAction = !noMutation && (requestsDestructiveMutation(actionable, intent)
    || (["CHANGE", "OPERATE"].includes(intent) && /^\s*(?:(?:please|kindly)\s+)?(?:(?:run|execute)\s+)?(?:git\s+reset\s+--hard|rm\s+-rf)\b/.test(actionable)));
  if (requestsDestructiveAction) tags.push("destructive");
  if (!noMutation && /\b(external write|send email|create issue|publish|push)\b/.test(actionable)) tags.push("requested-external-write");
  if (!noMutation && (/\b(privileged|sudo|production credential)\b/.test(actionable) || /\b(rotate|replace).{0,24}\b(secret|credential|api key|token)\b/.test(actionable))) tags.push("requested-privileged");
  if (requestsDestructiveAction) tags.push("requested-destructive");
  if (/\b(conflicting authority)\b/.test(lower)) tags.push("conflicting-authority");
  return unique(tags).sort();
}

function inferExternalTags(text: string): string[] {
  const lower = text.toLowerCase();
  const tags = ["prompt-injection"];
  if (/\b(external write|send email|create issue|publish|push)\b/.test(lower)) tags.push("external-write");
  if (/\b(privileged|sudo|production credential)\b/.test(lower) || /\b(rotate|replace).{0,24}\b(secret|credential|api key|token)\b/.test(lower)) tags.push("privileged");
  if (/\b(delete|deleted|deletion|deleting|remove|removed|removal|removing|erase|erased|erasure|erasing|eliminate|eliminated|elimination|eliminating|dispose|disposed|disposal|disposing|drop|dropped|dropping|destroy|destroyed|destruction|destroying|destructive|wipe|wiped|wiping|purge|purged|purging|disappear|disappeared|obliterate|obliterated|obliterating|eradicate|eradicated|eradicating|expunge|expunged|expunging|discard|discarded|discarding|truncate|unlink|reset --hard|rm -rf)\b/.test(lower)) tags.push("destructive");
  if (/\b(bypass|ignore|override).{0,40}\b(permission|approval|authority)\b/.test(lower)) tags.push("conflicting-authority");
  return unique(tags).sort();
}

function claimSegments(request: string): string[] {
  let quote: "'" | '"' | "`" | "“" | "‘" | null = null;
  const protectedPunctuation = [...request.trim()].map((character, index, characters) => {
    if (character === "." && /\s/u.test(characters[index - 1] ?? "") && /\s/u.test(characters[index + 1] ?? "")) return "\uE000";
    if (character === "\\") return character;
    if (quote) {
      if (character === quote || quote === "“" && character === "”" || quote === "‘" && character === "’") quote = null;
      else if (character === ".") return "\uE000";
      return character;
    }
    if (["'", '"', "`", "“", "‘"].includes(character) && characters[index - 1] !== "\\") quote = character as typeof quote;
    return character;
  }).join("");
  const redacted = transformNegatedContinuations(redactSensitive(protectedPunctuation), true);
  const initial = redacted
    .replace(/\s+/g, " ")
    .split(/(?:;\s*|[.!]\s+(?=[A-Z0-9])|\.$|\n\s*(?:[-*+]\s+|\d+[.)]\s+)?|,\s*(?:but|so|and|then)?\s*(?=(?:acceptance|success|tests?|pass|ensure|require|preserve|keep|within|subject to|do not|don't|must not|never|without|add|implement|fix|change|build|create|update|remove|refactor|run|execute|validate|verify|review|diagnose)\b)|\s+(?:but|and|then)\s+(?=(?:acceptance|success|tests?|pass|ensure|require|preserve|keep|within|subject to|do not|don't|must not|never|without|add|implement|fix|change|build|create|update|remove|refactor|run|execute|validate|verify|review|diagnose)\b))/i)
    .map((item) => {
      const trimmed = item.replace(/\uE000/gu, ".").trim();
      const quoted = /^(?:"([\s\S]*)"|'([\s\S]*)'|`([\s\S]*)`)$/u.exec(trimmed);
      return (quoted?.[1] ?? quoted?.[2] ?? quoted?.[3] ?? trimmed).trim();
    })
    .filter(Boolean);
  const result: string[] = [];
  for (const segment of initial) {
    const split = segment.match(/^(.*?)(\s+(?:with\s+(?:regression\s+)?tests?|through\s+terminal\s+gates?|after\s+[^,.;]+))$/i);
    if (split && split[1]!.trim()) result.push(split[1]!.trim().replace(/\s+and$/i, ""), split[2]!.trim());
    else result.push(segment);
  }
  return result.slice(0, 32);
}

function sourcedClaimSegments(request: string, spans: RequestSpan[]): Array<{ statement: string; source: RequestSpan["source"] }> {
  return spans.flatMap((span) => claimSegments(request.slice(span.start, span.end)).map((statement) => ({ statement, source: span.source })));
}

function claimKind(statement: string, index: number): TaskClaim["kind"] {
  if (/^USER\s+NON_GOAL\s*(?::|—|–|\s-\s)/i.test(statement)) return "NON_GOAL";
  if (/^(?:current[- ]state(?:\s+(?:finding|observation|claim))?|current\s+status|currently|status)\s*:/i.test(statement)) return "CURRENT_STATE";
  if (/^(?:boundary|scope\s+boundary|trust\s+boundary)\s*:/i.test(statement)) return "BOUNDARY";
  if (/^(?:hazard|risk|security\s+risk|failure\s+risk)\s*:/i.test(statement)) return "HAZARD";
  if (/^(?:evidence|proof|validation\s+evidence|test\s+evidence)\s*:/i.test(statement)) return "EVIDENCE";
  if (/^(?:add|implement|update|change|document|test|review|explain|describe|quote|classify|analy[sz]e|assess|evaluate)\b[^.!?]{0,180}\b(?:parser|classifier|classification|detection|support|handling|tests?|docs?|documentation|wording|phrase|statement|claim|sentence|terms?|whether)\b/i.test(statement)) return "OUTCOME";
  if (/^(?:the\s+)?(?:bun|npm|pnpm|yarn|pytest|ruff|mypy)(?:\s+(?:test|checks?|suite|run|command))?\b[^.!?]{0,180}\b(?:passed|failed|succeeded|completed)\b/i.test(statement)
    || /^the\s+(?:test|validation|check)\s+(?:command|suite)\b[^.!?]{0,180}\b(?:passed|failed|succeeded|completed)\b/i.test(statement)
    || /^(?:the\s+)?(?:latest|current|most\s+recent)\s+(?:(?:test|validation|check|admission|regression)\s+)?(?:run|suite|checks?)\b[^.!?]{0,180}\b(?:reports?|records?|shows?|confirms?|indicates?|demonstrates?)\b[^.!?]{0,120}\b(?:pass(?:ed|ing)?|fail(?:ed|ing)?|success|green|red)\b/i.test(statement)
    || /^according\s+to\s+(?:the\s+)?(?:latest|current|most\s+recent)\s+(?:run|suite|validation|checks?)\b[^.!?]{0,180}\b(?:pass(?:ed|ing)?|fail(?:ed|ing)?|success|green|red)\b/i.test(statement)
    || /^(?:the\s+)?(?:latest|current|most\s+recent)\s+(?:(?:test|validation|check|admission|regression)\s+)?(?:output|results?|report|summary|log|run|suite|checks?)\b[^.!?]{0,180}\b(?:says?|states?|notes?)\b[^.!?]{0,120}\b(?:pass(?:ed|ing)?|fail(?:ed|ing)?|success|green|red)\b/i.test(statement)
    || /^(?:passing|failing|successful|failed)\s+(?:tests?|checks?|assertions?|validations?)\b[^.!?]{0,140}\b(?:appear|appears|are|were|remain|remains)\b[^.!?]{0,80}\bin\s+(?:the\s+)?(?:latest|newest|current|most\s+recent)\s+(?:receipt|report|run|output|log)\b/i.test(statement)) return "EVIDENCE";
  if (/^(?:the\s+)?(?:newest|latest|most\s+recent)\s+(?:run|receipt|report|suite|validation|check|output|log)\b[^.!?]{0,180}\b(?:passed|failed|succeeded|completed|is\s+(?:green|red)|shows?|records?|reports?|confirms?|has|contains?|includes?|lists?)\b[^.!?]{0,120}\b(?:pass(?:ed|ing)?|fail(?:ed|ing)?|success|green|red|tests?|checks?|assertions?|results?)\b/i.test(statement)) return "EVIDENCE";
  if (/^(?:passes?|failures?|passing|failing)\s+(?:tests?|checks?|validations?|assertions?)?\s*from\s+(?:the\s+)?(?:latest|newest|current|most\s+recent)\s+(?:run|receipt|report|suite|validation|output|log)\b/i.test(statement)
    || /^(?:evidence|results?|findings?)\s+from\s+(?:the\s+)?(?:latest|newest|current|most\s+recent)\s+(?:run|receipt|report|suite|validation|output|log)\b[^.!?]{0,180}\b(?:records?|shows?|reports?|confirms?|contains?|lists?|establishes?)\b/i.test(statement)) return "EVIDENCE";
  if (/\b(?:currently|presently|at\s+present|at\s+the\s+moment|as\s+of\s+now|right\s+now|on\s+(?:the\s+current|this)\s+branch|(?:in|from)\s+(?:the\s+)?(?:checked[- ]out\s+source|current\s+checkout|this\s+checkout)|(?:this|the\s+current)\s+checkout|as\s+checked\s+out|on\s+the\s+current\s+(?:source|revision)|as\s+things\s+stand|(?:repository|project|source|branch)\s+as\s+it\s+stands|(?:source|branch|repository|project)\s+today)\b/i.test(statement)
    || /^(?:according\s+to|from)\s+(?:the\s+)?current\s+(?:source|branch|revision|implementation)\b/i.test(statement)
    || /^today\s*,?\s+(?:the|this|our|my)?\s*(?:parser|compiler|admission|implementation|repository|repo|project|codebase|source|branch)\b[^.!?]{0,160}\b(?:is|are|remains?|has|lacks?|contains?|includes?|omits?|shows?|reveals?)\b/i.test(statement)
    || /^(?:at|on)\s+(?:this|the\s+current)\s+(?:source|branch|revision|fixed\s+point)\b/i.test(statement)
    || /^(?:(?:the|this|our|my)\s+)?(?:current\s+)?(?:source|branch|revision|fixed\s+point|compiler|admission|parser|harness|implementation)\b[^.!?]{0,120}\b(?:passes|fails|succeeds|works|has\s+passed|has\s+failed)\b[^.!?]{0,80}$/i.test(statement)
    || /^(?:the|this|our|my)\s+(?:current\s+)?[^.!?]{0,140}\b(?:passes|fails|succeeds|remains?|is|are)\s+(?:still\s+|already\s+)?(?:passing|failing|blocked|ready|unchanged|open|closed|complete|incomplete|available|unavailable|present|absent)\b/i.test(statement)
    || /^(?:[a-z][a-z0-9_-]*\s+){0,5}(?:remains?|is|are)\s+(?:still\s+|already\s+)?(?:passing|failing|broken|blocked|ready|green|stable|unchanged|open|closed|complete|incomplete|available|unavailable|present|absent)\b/i.test(statement)
    || /^(?:the\s+)?(?:current\s+)?(?:source|branch|revision|parser|compiler|admission|repository)\b[^.!?]{0,140}\b(?:lacks?|contains?|includes?|omits?|needs?|has|does\s+not\s+have)\b/i.test(statement)
    || /^(?:the\s+)?current\s+(?:source|branch|revision|parser|compiler|admission|repository|implementation)\b[^.!?]{0,140}\b(?:shows?|demonstrates?|indicates?|reveals?|confirms?)\b/i.test(statement)
    || /^(?:as\s+(?:currently\s+)?implemented|in\s+the\s+current\s+implementation)\b/i.test(statement)
    || /^(?:the|this|our|my)\s+current\s+(?:source|branch|revision|parser|compiler|admission|repository)\b[^.!?]{0,140}\b(?:still\s+)?(?:lacks?|contains?|includes?|omits?|needs?|has|does\s+not\s+have)\b/i.test(statement)
    || /^(?:we|i|the\s+(?:repository|project|compiler|parser|admission))\s+(?:currently\s+)?(?:have|has|lack|lacks)\b[^.!?]{0,160}/i.test(statement)
    || /^there\s+(?:is|are)\s+(?:currently\s+|still\s+)?(?:no|an?|some|several|\d+)\b[^.!?]{0,160}/i.test(statement)
    || /^(?:today|currently|presently|as\s+of\s+(?:today|now|the\s+current\s+(?:branch|source|revision)))\s*,?\s+(?:the|this|our|my)\s+(?:repository|repo|project|codebase|source|branch|compiler|parser|admission)\b[^.!?]{0,160}\b(?:has|lacks?|contains?|includes?|omits?|shows?|reveals?|is|remains?)\b/i.test(statement)
    || /^(?:on|in)\s+(?:the\s+)?current\s+branch\b[^.!?]{0,160}\b(?:the|this|our|my)\s+(?:repository|repo|project|codebase|source|compiler|parser|admission)\b/i.test(statement)) return "CURRENT_STATE";
  if (/^(?:the|this|our|my)\s+(?:repository|repo|project|codebase|source|branch|compiler|parser|admission)\b[^.!?]{0,140}\b(?:is|remains?|looks?)\s+(?:stale|outdated|broken|blocked|incomplete)\b[^.!?]{0,100}\baccording\s+to\s+(?:the\s+)?current\s+(?:source|branch|revision|implementation)\b/i.test(statement)) return "CURRENT_STATE";
  if (/\b(?:is|are|forms?|defines?|sets?|marks?)\s+(?:the\s+)?(?:write\s+)?boundary\s+beyond\s+which\s+(?:no|nothing|neither)\b[^.!?]{0,100}\b(?:writes?|changes?|edits?|modifications?)?\s*(?:may|can|must|shall)\s+(?:occur|happen|change|be\s+(?:written|changed|edited|modified|made))\b/i.test(statement)) return "BOUNDARY";
  if (/^(?:(?:all\s+)?(?:writes?|changes?|edits?|modifications?)\s+(?:are|must\s+be|remain|must\s+remain)\s+(?:confined|restricted|limited)\s+to\b|(?:all\s+)?(?:writes?|changes?|edits?|modifications?)\s+must\s+(?:stay|remain)\s+(?:inside|within)\b|(?:all\s+)?(?:writes?|changes?|edits?|modifications?)\s+(?:are|remain)\s+bounded\s+by\b|(?:all\s+)?(?:writes?|changes?|edits?|modifications?)\s+(?:are|remain)\s+capped\s+(?:at|by|to)\b|[^.!?]{1,100}\bfiles?\s+(?:are|is)\s+the\s+only\s+(?:writable|editable|modifiable)\s+(?:area|files?|paths?)\b|only\b[^.!?]{0,120}\bfiles?\s+(?:can|may|must)\s+(?:change|be\s+(?:written|changed|edited|modified))\b|(?:nothing|no\s+(?:(?:files?|writes?|changes?|edits?|modifications?)))\s+(?:outside|beyond)\b[^.!?]{0,120}\b(?:may|can|must)\s+(?:change|be\s+(?:written|changed|edited|modified))\b|(?:the\s+)?write\s+(?:perimeter|boundary|scope)\s+(?:is|ends?|stops?)\b|(?:write\s+access|writes?)\s+(?:ends?|stops?)\s+at\b|[^.!?]{1,120}\b(?:delimits?|bounds?|caps?)\s+(?:all\s+)?(?:writes?|changes?|edits?|modifications?)\b|[^.!?]{1,120}\b(?:is|are)\s+the\s+write\s+(?:perimeter|boundary)\b|[^.!?]{1,120}\b(?:forms?|defines?|sets?|marks?)\s+the\s+write\s+(?:perimeter|boundary)\b|[^.!?]{1,120}\b(?:is|are)\s+where\s+(?:all\s+)?(?:writes?|changes?|edits?|modifications?)\s+(?:stop|end)\b)/i.test(statement)
    || /^(?:only\s+(?:edit|touch|change|write|modify)|only\b[^.!?]{0,120}\bfiles?\s+may\s+be\s+(?:written|changed|edited|modified)\b|(?:edit|touch|change|write|modify)\b[^.!?]{0,120}(?<!-)\bonly\b|(?:do\s+not|don't|must\s+not|never)\s+(?:edit|touch|change|write|modify)\b[^.!?]{0,140}\b(?:outside|beyond)\b|leave\b[^\n]{0,160}\bunchanged\b|keep\b[^\n]{0,160}\b(?:unchanged|out\s+of\s+scope)\b|keep\b[^\n]{0,160}\b(?:writes?|changes?|edits?)\s+(?:inside|within)\b|scope\s+is\s+limited\s+to\b|(?:the\s+)?(?:allowed|owned|permitted)\s+(?:write\s+)?scope\b|(?:the\s+)?(?:sole|only)\s+(?:allowed|owned|permitted)\s+(?:write\s+)?(?:area|scope|boundary)\b|(?:the\s+)?(?:repository|project|codebase)\s+boundary\b[^.!?]{0,160}\b(?:inside|within|outside|beyond|only)\b|(?:all|every)\s+(?:repository\s+|code\s+)?(?:work|writes?|changes?|edits?)\s+(?:is|are|must\s+remain|remains?|stay|stays)\s+(?:inside|within|limited|confined|restricted)\s+(?:to\s+)?\b|(?:repository\s+)?(?:work|writes?|changes?|edits?)\s+(?:is|are)\s+(?:limited|confined|restricted)\s+to\b|(?:no\s+)?(?:repository\s+)?(?:writes?|changes?|edits?)\s+(?:may|can(?:not|'t)|must\s+not)\s+(?:leave|exit|escape)\b|(?:all\s+)?(?:repository\s+)?(?:work|writes?|changes?|edits?)\s+(?:must\s+)?(?:remain|stay)\s+within\b|(?:writes?|changes?|edits?)\s+(?:may|can|must)\s+only\s+(?:affect|touch|target)\b|(?:files?|paths?|folders?)\b[^.!?]{0,120}\b(?:outside|beyond)\b[^.!?]{0,100}\b(?:out\s+of\s+scope|off\s+limits|must\s+(?:remain\s+unchanged|not\s+change))\b|(?:put|keep|confine|bind)\s+(?:all\s+)?(?:writes?|changes?|edits?)\s+(?:inside|within|to)\b|(?:all\s+)?(?:writes?|changes?|edits?)\s+(?:stop|end)\s+at\b|(?:all\s+)?(?:writes?|changes?|edits?)\s+(?:are|remain|must\s+be)\s+(?:bound|confined|bounded)\s+(?:to|by|within)\b|nothing\s+outside\b[^.!?]{0,100}\b(?:may|can|must)\s+(?:change|be\s+(?:changed|edited|modified|written))\b|(?!(?:add|implement|update|change|document|test|review|explain|describe)\b)[^.!?]{1,120}\b(?:caps?|delimits?|bounds?)\s+(?:all\s+)?(?:writes?|changes?|edits?)\b)/i.test(statement)) return "BOUNDARY";
  const hazardMetaWork = imperativeMutationClause(statement) || /^(?:add|implement|update|change|document|test|review|explain|describe)\b[^.!?]{0,180}\b(?:tests?|terms?|wording|classification|classifier|parser|support|handling|docs?|proposed\s+(?:action|command|change|request))\b/i.test(statement);
  if (!hazardMetaWork && /\b(?:can|could|may|might)\b[^.!?]{0,180}\b(?:conceal|hide|mask|launder|bypass|cause|expose|corrupt|destroy|delete|overwrite|leak|execute|mutate|authorize|escalate|misclassify|trigger)\b|\b(?:creates?|poses?|presents?|introduces?)\s+(?:an?\s+)?(?:[a-z-]+\s+){0,4}(?:hazard|risk)\b|\brisk\s+of\b|\b(?:race\s+condition|toctou|prompt\s+injection|privilege\s+escalation|authority\s+bypass|data\s+loss)\b|\b(?:untrusted|dynamic|malformed|stale|forged|arbitrary)\b[^.!?]{0,140}\b(?:input|content|command|authority|receipt|state)\b[^.!?]{0,140}\b(?:enables?|permits?|allows?|causes?|triggers?|executes?|mutates?|deletes?|overwrites?|leaks?|poses?)\b/i.test(statement)) return "HAZARD";
  if (/^(?:the\s+)?(?:(?:focused|targeted)\s+)?(?:(?:unit|integration|regression|admission|corpus|hook|security)\s+)?(?:tests?|checks?|validation|suite|corpus|probes?)\b[^.!?]{0,180}\b(?:passed|failed|succeeded|completed)\b/i.test(statement)
    || /^(?:the\s+|an?\s+)?(?:(?:most\s+recent|latest|newest|current)\s+)?(?:(?:focused|targeted)\s+)?(?:(?:unit|integration|regression|admission|corpus|hook|security)\s+)?(?:run|execution|invocation|suite)\b[^.!?]{0,180}\b(?:passed|failed|succeeded|completed)\b/i.test(statement)
    || /^(?:we|i|the\s+team)\s+(?:observed|recorded|saw)\b[^.!?]{0,100}\b\d+\s+passing\b[^.!?]{0,100}\b(?:tests?|checks?|assertions?)\b/i.test(statement)
    || /^(?:the\s+)?(?:(?:latest|newest|current|focused|targeted|admission|regression|validation)\s+){0,4}(?:run|receipt|report|summary|log|output|evidence)\b[^.!?]{0,180}\b(?:records?|shows?|reports?|contains?|lists?|identifies?|flags?|documents?|notes?|confirms?|establishes?|indicates?)\b[^.!?]{0,120}(?:\b(?:pass|fail|success|completion|passed|failed|result|results|tests?|checks?)\b|$)/i.test(statement)
    || /^(?:passing|failing|successful|failed)\s+(?:tests?|checks?|assertions?)\b[^.!?]{0,140}\b(?:are|were)\s+(?:recorded|documented|reported|shown)\s+in\s+(?:the\s+)?(?:latest|current|most\s+recent)\s+(?:receipt|report|run|output|log)\b/i.test(statement)
    || /^(?:according\s+to\s+)?(?:the\s+)?(?:latest|current|most\s+recent)\s+(?:run|receipt|report|log|output|evidence)\b[^.!?]{0,180}\b(?:\d+\s+)?(?:tests?|checks?|assertions?)\b[^.!?]{0,100}\b(?:pass(?:ed|ing)?|fail(?:ed|ing)?)\b/i.test(statement)
    || /^(?:the\s+)?(?:logs?|receipts?|reports?|outputs?)\s+(?:show|record|report|confirm|demonstrate)\b[^.!?]{0,180}\b(?:pass(?:ed|ing)?|fail(?:ed|ing)?|success|result|tests?|checks?)\b/i.test(statement)
    || /^(?:test\s+)?(?:results?|evidence|findings?)\s+from\s+(?:the\s+)?(?:latest|current|most\s+recent)\s+(?:run|suite|validation|checks?)\b[^.!?]{0,180}\b(?:show|confirm|indicate|demonstrate|record)\b/i.test(statement)
    || /^(?:the\s+)?(?:latest|current|most\s+recent)\s+(?:run|suite|validation|checks?)\s+(?:results?|findings?)\b[^.!?]{0,180}\b(?:show|confirm|indicate|demonstrate|record)\b/i.test(statement)
    || /^(?:passing|failing|successful|failed)\s+(?:tests?|checks?|assertions?|validations?)\b[^.!?]{0,140}\b(?:appear|appears|are|were|remain|remains)\b[^.!?]{0,80}\bin\s+(?:the\s+)?(?:latest|newest|current|most\s+recent)\s+(?:receipt|report|run|output|log)\b/i.test(statement)) return "EVIDENCE";
  if (/^(?:(?:(?:my\s+request|(?:direct\s+)?user\s+(?:request|instruction)|user\s+non_goal)\s*(?::|—|–|\s-\s)\s*)|(?:(?:please|kindly)\s+))?(?:do not|don't|must not|never|without)\b/i.test(statement) || isNegatedImperativeMutationClause(statement)) return "NON_GOAL";
  if (/^(?:acceptance|success|tests?|pass\b|ensure\b|require\b|with\s+(?:regression\s+)?tests?|through\s+terminal\s+gates?|after\b|when\b)|\b(?:must pass|success criteria|accepted when)\b/i.test(statement)) return "CRITERION";
  if (/^(?:within|subject to|preserve|keep)\b|\b(?:must remain|required to remain|within scope)\b/i.test(statement)) return "CONSTRAINT";
  return index === 0 ? "OUTCOME" : "OUTCOME";
}

function claimConsumers(kind: TaskClaim["kind"]): string[] {
  if (kind === "CURRENT_STATE") return ["context", "evidence", "route"];
  if (kind === "CRITERION") return ["controls", "evidence"];
  if (kind === "NON_GOAL") return ["controls", "route", "tool-enforcement"];
  if (kind === "CONSTRAINT") return ["authority", "controls", "route"];
  if (kind === "BOUNDARY") return ["authority", "controls", "route", "tool-enforcement"];
  if (kind === "HAZARD") return ["controls", "policies", "tool-enforcement"];
  if (kind === "EVIDENCE") return ["criteria", "evidence", "validation"];
  return ["controls", "route"];
}

function claimVerification(kind: TaskClaim["kind"], source: RequestSpan["source"]): string {
  if (source === "EXTERNAL_SOURCE") return "verify as untrusted external content before use";
  if (kind === "CURRENT_STATE") return "verify against current source or tool evidence";
  if (kind === "CRITERION") return "verify against the named acceptance evidence";
  if (kind === "BOUNDARY") return "verify against the current scope and authority boundary";
  if (kind === "HAZARD") return "verify the hazard before dependent mutation";
  if (kind === "EVIDENCE") return "verify evidence identity, freshness, and evaluator authority";
  return "verify against the user request";
}

function claimInvalidation(kind: TaskClaim["kind"]): string[] {
  if (kind === "CURRENT_STATE") return ["request", "source"];
  if (kind === "BOUNDARY") return ["permission", "request", "scope", "source"];
  if (kind === "HAZARD") return ["request", "scope", "source"];
  if (kind === "EVIDENCE") return ["evidence", "request", "source"];
  return ["request"];
}

function atomicClaims(request: string, spans: RequestSpan[], intent: Intent, relation: Relation, allTags: Set<string>, authority: string[], candidateTags: string[], directUserAttested: boolean, clausePatches: AdmissionClausePatches): TaskClaim[] {
  const claims: TaskClaim[] = [];
  const represented = new Set<string>();
  const retainedClauses = parseAdmissionClauses(request, spans as AdmissionClauseSpan[]);
  const representedClauses = new Set<number>();
  const normalizedClaimText = (value: string) => value.trim().replace(/^(?:then|afterwards|subsequently)\s+/i, "").replace(/\s+/gu, " ").replace(/[.;,:!?]+$/gu, "").trim().toLowerCase();
  const legacySegments = sourcedClaimSegments(request, spans);
  const semanticSpans = refinedLexicalRequestSpans(request);
  const hasMentionedExternalContent = spans.some((span) => span.source === "EXTERNAL_SOURCE")
    || semanticSpans.some((span) => span.source === "EXTERNAL_SOURCE");
  const hasDominantNonGoal = retainedClauses.some((clause) => clause.specialized_claim_role === "NON_GOAL" || clause.action_polarity === "NEGATIVE")
    && !retainedClauses.some((clause) => clause.action_polarity === "POSITIVE" && clause.action_class === "LOCAL_MUTATION");
  const useRetainedTopology = !hasMentionedExternalContent && !hasDominantNonGoal && (retainedClauses.length > legacySegments.length
    || retainedClauses.length < legacySegments.length && retainedClauses.some((clause) => clause.operation_subject === "SHELL"));
  const segments = useRetainedTopology
    ? retainedClauses.map((clause) => ({ statement: clause.text, source: clause.source }))
    : legacySegments;
  for (const [index, segment] of segments.entries()) {
    const { statement: segmentedStatement, source } = segment;
    const normalizedStatement = normalizedClaimText(segmentedStatement);
    const retained = retainedClauses.find((clause) => !representedClauses.has(clause.index)
      && clause.source === source
      && clause.specialized_claim_role !== null
      && (() => {
        const normalizedClause = normalizedClaimText(clause.text);
        return normalizedClause === normalizedStatement
          || normalizedStatement.startsWith(`${normalizedClause} and`)
          || normalizedStatement.startsWith(`${normalizedClause},`)
          || normalizedClause.startsWith(`${normalizedStatement} `);
      })());
    if (retained) representedClauses.add(retained.index);
    const statement = retained?.text ?? segmentedStatement;
    const kind = retained?.specialized_claim_role
      ?? clausePatches.claim_kinds?.find((patch) => normalizedClaimText(patch.segment) === normalizedStatement)?.kind
      ?? claimKind(statement, index);
    const localIntent = source === "EXTERNAL_SOURCE" ? "ANSWER" : kind === "NON_GOAL" ? inferIntent(statement) : index === 0 ? intent : inferIntent(statement);
    const localRelation = source === "EXTERNAL_SOURCE" ? "NEW" : kind === "NON_GOAL" ? inferRelation(statement) : index === 0 ? relation : "NEW";
    const localTags = (source === "EXTERNAL_SOURCE" ? inferExternalTags(statement) : inferTags(statement, localIntent, localRelation))
      .filter((tag) => directUserAttested || !tag.startsWith("requested-"))
      .filter((tag) => allTags.has(tag));
    if (kind === "CURRENT_STATE" && allTags.has("current-state") && !localTags.includes("current-state")) localTags.push("current-state");
    if (index === 0 && !localTags.includes("always")) localTags.push("always");
    localTags.forEach((tag) => represented.add(tag));
    claims.push({
      claim_id: `CL-${String(claims.length + 1).padStart(3, "0")}`,
      kind,
      statement: statement.slice(0, 500),
      source,
      status: "PROVIDED",
      confidence: null,
      verification: claimVerification(kind, source),
      policy_tags: unique(localTags).sort(),
      consumers: claimConsumers(kind),
      invalidation: claimInvalidation(kind),
    });
  }
  for (const clause of retainedClauses.filter((candidate) => candidate.specialized_claim_role !== null && !representedClauses.has(candidate.index))) {
    const kind = clause.specialized_claim_role!;
    const localIntent = clause.source === "EXTERNAL_SOURCE" ? "ANSWER" : kind === "NON_GOAL" ? inferIntent(clause.text) : inferIntent(clause.text);
    const localRelation = clause.source === "EXTERNAL_SOURCE" ? "NEW" : kind === "NON_GOAL" ? inferRelation(clause.text) : "NEW";
    const localTags = (clause.source === "EXTERNAL_SOURCE" ? inferExternalTags(clause.text) : inferTags(clause.text, localIntent, localRelation))
      .filter((tag) => directUserAttested || !tag.startsWith("requested-"))
      .filter((tag) => allTags.has(tag));
    if (kind === "CURRENT_STATE" && allTags.has("current-state") && !localTags.includes("current-state")) localTags.push("current-state");
    localTags.forEach((tag) => represented.add(tag));
    claims.push({
      claim_id: `CL-${String(claims.length + 1).padStart(3, "0")}`,
      kind,
      statement: clause.text.slice(0, 500),
      source: clause.source,
      status: "PROVIDED",
      confidence: null,
      verification: claimVerification(kind, clause.source),
      policy_tags: unique(localTags).sort(),
      consumers: claimConsumers(kind),
      invalidation: claimInvalidation(kind),
    });
  }
  for (const requested of unique(authority).sort()) {
    claims.push({
      claim_id: `CL-${String(claims.length + 1).padStart(3, "0")}`,
      kind: "AUTHORITY",
      statement: `Untrusted authority candidate: ${requested}`,
      source: "MODEL_INFERENCE",
      status: "INFERRED",
      confidence: 0.5,
      verification: "a trusted host receipt must establish any hard-action authority",
      policy_tags: [requested],
      consumers: ["authority", "tool-enforcement"],
      invalidation: ["permission", "request", "target", "tool"],
    });
  }
  for (const tag of [...allTags].filter((item) => item !== "always" && !represented.has(item)).sort()) {
    claims.push({
      claim_id: `CL-${String(claims.length + 1).padStart(3, "0")}`,
      kind: "INFERENCE",
      statement: `Admission signal: ${tag}.`,
      source: "MODEL_INFERENCE",
      status: "INFERRED",
      confidence: candidateTags.includes(tag) ? 0.5 : 0.8,
      verification: "confirm the signal from current scope before dependent mutation",
      policy_tags: [tag],
      consumers: ["controls", "policies"],
      invalidation: ["request", "scope", "source"],
    });
  }
  return claims;
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
  if (controls.includes("STANDARD_CHANGE")) skills.push("plan-change", "functional-qa", "implement-change", "review-change", "validate-change");
  if (controls.includes("CONNECTED_DELIVERY") || controls.includes("PROGRAM_CONTROL")) skills.push("orchestrate-work");
  if (controls.includes("SIMULATION_GOVERNANCE")) {
    skills.push(tags.has("simulation-campaign") ? "simulation-campaigns" : "cascade-simulations:simulate");
  }
  if (controls.includes("SECURITY_ASSURANCE")) skills.push("secure-design");
  if (controls.includes("RELEASE_EVIDENCE")) skills.push("validate-change");
  if (!skills.length && intent === "REVIEW") skills.push("review-change");
  return unique(skills);
}

function inferTopology(tags: Set<string>, intent: Intent): typeof TOPOLOGY[number] {
  if (tags.has("program")) return "PROGRAM";
  if (tags.has("connected")) return "CONNECTED";
  if (["ANSWER", "DISCOVER", "DIAGNOSE", "REVIEW", "VALIDATE"].includes(intent) && ["auth", "tenant", "payment", "safety"].some((tag) => tags.has(tag))) return "BOUNDED";
  if (tags.has("atomic-change") || tags.has("privileged")) return "ATOMIC";
  if (["CHANGE", "OPERATE"].includes(intent)) return "BOUNDED";
  return "ATOMIC";
}

function inferEffort(tags: Set<string>, topology: typeof TOPOLOGY[number], request: string): typeof EFFORT[number] {
  if (topology === "PROGRAM") return "EXTENDED";
  if (tags.has("simulation")) return "MEDIUM";
  if (topology === "CONNECTED") return /\b(long[- ]running|resume|several|multiple)\b/i.test(request) ? "LARGE" : "MEDIUM";
  if (topology === "BOUNDED") return "MEDIUM";
  if (tags.has("privileged") || tags.has("external-write")) return "SMALL";
  return request.length > 160 ? "SMALL" : "MICRO";
}

function inferAuthority(tags: Set<string>, intent: Intent): AuthorityClass {
  if (tags.has("destructive")) return "DESTRUCTIVE";
  if (tags.has("privileged")) return "PRIVILEGED";
  if (tags.has("external-write")) return "EXTERNAL_WRITE";
  return ["CHANGE", "OPERATE"].includes(intent) ? "LOCAL_WRITE" : "READ_ONLY";
}

function inferDuration(tags: Set<string>, topology: typeof TOPOLOGY[number], request: string): typeof DURATION[number] {
  if (topology === "PROGRAM") return "PROGRAM";
  const actionable = stripNegatedClauses(request).trim();
  if (/^\s*(?:(?:please|kindly)\s+)?(?:resume|pick up|carry on)\b/i.test(actionable) || /\b(long[- ]running|after the source identity changed)\b/i.test(actionable)) return "RESUMABLE";
  if (topology === "CONNECTED" || topology === "BOUNDED" || tags.has("multi-turn")) return "MULTI_TURN";
  return "TURN";
}

function inferContext(controls: ControlPack[], tags: Set<string>, topology: typeof TOPOLOGY[number], route: Route): typeof CONTEXT[number] {
  if (controls.includes("FULL_SCAN")) return "FULL_SCAN";
  if (topology === "BOUNDED" && ["auth", "tenant", "payment", "safety"].some((tag) => tags.has(tag)) && !["requested-external-write", "requested-privileged", "requested-destructive"].some((tag) => tags.has(tag))) return "SCOPED_SCAN";
  if (["CONNECTED", "PROGRAM"].includes(topology) || tags.has("behavior-change")) return "SCOPED_SCAN";
  if (["DIRECT_READ", "DIRECT_CHANGE", "BOUNDED"].includes(route) || controls.includes("SECURITY_ASSURANCE")) return "TARGETED_PROBE";
  return "PROMPT_ONLY";
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
    value.derivation_input.provenance_mode !== "LEXICAL_FALLBACK" ||
    value.derivation_input.authenticity !== "UNVERIFIED_LEXICAL_FALLBACK" ||
    value.derivation_input.direct_user_attestation !== null ||
    stableJson(value.derivation_input.request_spans) !== stableJson(refinedLexicalRequestSpans(value.derivation_input.canonical_request))
  ) throw new CascadeError("task envelope lexical request provenance is invalid");
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
    if (value.derivation_input.provenance_mode !== "TRUSTED_SOURCE_SEGMENTS" && claim.policy_tags.some((tag) => tag.startsWith("requested-"))) throw new CascadeError(`task claim ${claim.claim_id} lexical provenance cannot establish requested authority`);
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

export async function validateAdmissionRepository(): Promise<{ policy_count: number; control_count: number; case_count: number }> {
  const [bundle, catalog, envelopeSchema, policySchema, controlSchema, cases, caseSchema, assessmentSchema] = await Promise.all([
    readJson<JsonObject>(POLICY_PATH), readJson<JsonObject>(CONTROL_PATH), readJson<JsonObject>(ENVELOPE_SCHEMA_PATH),
    readJson<JsonObject>(POLICY_SCHEMA_PATH), readJson<JsonObject>(CONTROL_SCHEMA_PATH), readJson<JsonObject>(CORPUS_PATH), readJson<JsonObject>(CASE_SCHEMA_PATH),
    readJson<JsonObject>(ASSESSMENT_SCHEMA_PATH),
  ]);
  if (envelopeSchema.$id !== "https://cascade.local/schemas/task-envelope.v41.schema.json" || policySchema.$id !== "https://cascade.local/schemas/task-admission-policy.v41.schema.json" || controlSchema.$id !== "https://cascade.local/schemas/task-admission-controls.v41.schema.json" || caseSchema.$id !== "https://cascade.local/schemas/task-admission-cases.v41.schema.json" || assessmentSchema.$id !== "https://cascade.local/schemas/task-admission-assessment.v41.schema.json") throw new CascadeError("task admission public schema identity is invalid");
  const publicSchemaVersions = [envelopeSchema, policySchema, controlSchema, caseSchema, assessmentSchema].map((schema) => schema.properties?.schema_version?.const);
  if (publicSchemaVersions.some((version) => version !== ADMISSION_SCHEMA_VERSION)) throw new CascadeError("task admission public schema versions must advance together");
  assertJsonSchema(bundle, policySchema, "$");
  assertJsonSchema(catalog, controlSchema, "$");
  validateAdmissionCaseBundle(cases);
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
  const caseIds = (cases.cases as JsonObject[]).map((item) => item.id);
  if (`${bundle.bundle_id}@${bundle.bundle_version}` !== ADMISSION_POLICY_BUNDLE || bundle.schema_version !== ADMISSION_SCHEMA_VERSION || catalog.catalog_version !== ADMISSION_SCHEMA_VERSION || cases.schema_version !== ADMISSION_SCHEMA_VERSION || cases.policy_bundle_version !== ADMISSION_POLICY_BUNDLE || cases.case_set_version !== ADMISSION_SCHEMA_VERSION) throw new CascadeError("task admission bundle, corpus, and public version update must advance together");
  if (assessmentSchema.properties?.schema_version?.const !== ADMISSION_SCHEMA_VERSION || assessmentSchema.additionalProperties !== false) throw new CascadeError("task admission assessment schema is incomplete");
  return { policy_count: policyIds.length, control_count: controlIds.length, case_count: caseIds.length };
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

const OBJECTIVE_STOP_WORDS = new Set([
  "about", "after", "again", "also", "before", "change", "changes", "current", "file", "files", "implement", "implementation",
  "into", "later", "make", "multiple", "objective", "please", "request", "review", "some", "task", "then", "this", "update", "with", "write",
]);

function objectiveTerms(text: string): Set<string> {
  return new Set(semanticWords(text)
    .map((word) => word.value)
    .filter((word) => word.length >= 4 && !OBJECTIVE_STOP_WORDS.has(word) && !MUTATION_BASE_VERBS.has(word) && !MUTATION_GERUNDS.has(word)));
}

function priorObjectiveRelated(prior: PriorDerivationSnapshot, request: string): boolean {
  const current = objectiveTerms(request);
  const previous = objectiveTerms(prior.claims.filter((claim) => claim.status !== "SUPERSEDED" && claim.source === "USER").map((claim) => claim.statement).join(" "));
  const shared = [...current].filter((term) => previous.has(term));
  if (shared.length >= 2) return true;
  return /\b(?:it|that|those|them|same)\b/i.test(request) && shared.length >= 1;
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

const LOCAL_WRITE_FILE_EXTENSION = String.raw`(?:md|mdx|json|ya?ml|toml|ts|tsx|js|jsx|py|sh|css|scss|html|txt|csv|xml)`;

function extractedLocalWriteTargets(request: string): string[] {
  const matches: Array<{ start: number; end: number; value: string }> = [];
  const add = (start: number, value: string) => {
    const target = canonicalLocalWriteTarget(value);
    if (target) matches.push({ start, end: start + value.length, value: target });
  };
  for (const match of request.matchAll(/['"`]([^'"`\r\n]+)['"`]/gu)) {
    const value = match[1]!;
    if (value.includes("/") || new RegExp(`\\.${LOCAL_WRITE_FILE_EXTENSION}$`, "iu").test(value)) add(match.index! + 1, value);
  }
  const spacedFile = new RegExp(String.raw`(?:^|[\s(])((?:(?:\.\.?\/)?(?:[\p{L}\p{N}_.@\[\]-]+\/)+[\p{L}\p{N}_.@\[\]-]+(?: +[\p{L}\p{N}_.@\[\]-]+)*|[\p{L}\p{N}_.@\[\]-]+)\.${LOCAL_WRITE_FILE_EXTENSION})(?=$|[.\s,;:!?)}\]])`, "giu");
  for (const match of request.matchAll(spacedFile)) add(match.index! + match[0]!.indexOf(match[1]!), match[1]!);
  const exactPath = /(?:^|[\s(])((?:\.\.?\/)?[\p{L}\p{N}_.@\[\]-]+(?:\/[\p{L}\p{N}_.@\[\]-]+)+)(?=$|[\s,;:!?)}\]])/giu;
  for (const match of request.matchAll(exactPath)) {
    const start = match.index! + match[0]!.indexOf(match[1]!);
    const end = start + match[1]!.length;
    if (!matches.some((candidate) => start < candidate.end && end > candidate.start)) add(start, match[1]!);
  }
  return unique(matches.map((match) => match.value)).sort();
}

const REPOSITORY_WRITE_SCOPE = /\b(?:repository[- ]wide|repo[- ]wide|repository[- ]level|whole[- ](?:repository|repo|codebase|project)|whole\s+(?:repository|repo|codebase|project)|(?:entire|complete|full)\s+(?:repository|repo|codebase|project)(?:\s+tree)?|(?:repository|repo|codebase|project)\s+tree|codebase[- ]wide|project[- ]wide|across\s+(?:the\s+)?(?:repository|repo|codebase|project)|across\s+(?:all|every|each)\s+(?:repository|repo|codebase|project)\s+files?|throughout\s+(?:the\s+)?(?:repository|repo|codebase|project)|(?:all|every|each)\s+(?:repository|repo|codebase|project)\s+files?|(?:all|every|each)\s+files?\s+(?:in|under|within|throughout|across)\s+(?:(?:this|the|our|my|your)\s+)?(?:repository|repo|codebase|project)|(?:all|every|each)\s+(?:parts?|portions?|sections?|components?|modules?|packages?|librar(?:y|ies)|director(?:y|ies)|folders?)\s+(?:(?:of|in|under|within|throughout|across|contained\s+in|included\s+in|belong(?:ing|s)?\s+(?:to|in))\s+(?:(?:this|the|our|my|your)\s+)?(?:repository|repo|codebase|project)|(?:that|which)\s+(?:belong(?:s)?\s+(?:to|in)|are\s+contained\s+in|is\s+contained\s+in)\s+(?:(?:this|the|our|my|your)\s+)?(?:repository|repo|codebase|project)))\b/i;

function hasExplicitRepositoryWriteScope(request: string): boolean {
  if (terminalReviewOverride(request)) return false;
  const unquoted = request
    .replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|“[^”]*”|‘[^’]*’|`(?:\\.|[^`\\])*`/gu, " reviewed phrase ");
  return semanticClauses(unquoted).some((clause) => {
    if (!REPOSITORY_WRITE_SCOPE.test(clause) || !imperativeMutationClause(clause)) return false;
    if (/\b(?:wording|phrase|term|label|classifier|classification|parser|detection|handling|support|tests?|documentation)\b/i.test(clause)
      && /\b(?:document|describe|explain|review|test|add(?=\s+(?:parser\s+)?tests?\b)|add\s+support|implement\s+(?:detection|handling|support))\b/i.test(clause)) return false;
    return true;
  });
}

function deriveLocalWriteScope(request: string, authority: AuthorityClass): { mode: "TARGETS" | "REPOSITORY"; targets: string[] } {
  if (authority !== "LOCAL_WRITE") return { mode: "TARGETS", targets: [] };
  const semanticRequest = stripEmbeddedReviewAction(request);
  const targets = extractedLocalWriteTargets(semanticRequest);
  if (targets.length) return { mode: "TARGETS", targets };
  if (hasExplicitRepositoryWriteScope(semanticRequest)) return { mode: "REPOSITORY", targets: [] };
  return { mode: "TARGETS", targets: [] };
}

const SHELL_EXECUTABLE = /^(?:git|gh|rm|mv|cp|chmod|chown|curl|wget|ssh|scp|rsync|sed|awk|perl|find|docker|kubectl|terraform|aws|gcloud|az|npm|pnpm|yarn|bun|npx|python|python3|pip|pip3|uv|bash|sh|zsh)$/i;

function executableBasename(token: string): string {
  return token.replace(/\\/g, "/").split("/").at(-1)?.toLowerCase() ?? "";
}

function shellCommandFromRequest(request: string, allowBare = false): string | null {
  const trimmed = request.trim();
  const polite = /^\s*(?:(?:(?:can|could|would|will|might)\s+you|(?:would|could|might)\s+it\s+be\s+possible\s+(?:for\s+you\s+)?to|may\s+i\s+ask\s+you\s+to|(?:i|we)\s+(?:need|want|would\s+like)\s+you\s+to)\s+)?(?:(?:please|kindly)\s+)?(?:run|execute|perform)\s+([\s\S]+)$/i.exec(trimmed);
  const command = (polite?.[1] ?? (allowBare ? trimmed.replace(/^\s*(?:run|execute|perform)\s+/i, "") : "")).replace(/[.!?]+$/u, "").trim();
  if (!command || /[\r\n]/.test(command)) return null;
  if (classifyEnvGitAction(command)) return command;
  const words = shellWords(command);
  if (!words?.length || words.length > 128) return null;
  const executable = words.find((word) => SHELL_EXECUTABLE.test(executableBasename(word.value)));
  if (!executable) return null;
  const executableIndex = words.indexOf(executable);
  if (words.slice(0, executableIndex).some((word) => !/^[A-Za-z_][A-Za-z0-9_]*=/.test(word.value) && !["command", "exec", "env", "sudo", "xargs"].includes(executableBasename(word.value)) && !word.value.startsWith("-"))) return null;
  return command;
}

function deriveTaskEnvelopePayload(input: TaskDerivationInput): JsonObject {
  validateRequestSpans(input.canonical_request, input.request_spans);
  if (input.provenance_version !== 2 || input.source_segments_digest !== sourceSegmentsDigest(input.request_spans)) throw new CascadeError("task derivation request provenance is not canonical");
  const directUserAttested = input.provenance_mode === "TRUSTED_SOURCE_SEGMENTS";
  if (directUserAttested) {
    if (
      input.authenticity !== "TRUSTED_DIRECT_USER_ATTESTATION" ||
      !input.direct_user_attestation ||
      input.direct_user_attestation.request_digest !== input.request_digest ||
      input.direct_user_attestation.source_segments_digest !== input.source_segments_digest
    ) throw new CascadeError("task derivation trusted request provenance is invalid");
  } else if (
    input.provenance_mode !== "LEXICAL_FALLBACK" ||
    input.authenticity !== "UNVERIFIED_LEXICAL_FALLBACK" ||
    input.direct_user_attestation !== null ||
    stableJson(input.request_spans) !== stableJson(refinedLexicalRequestSpans(input.canonical_request))
  ) throw new CascadeError("task derivation lexical request provenance is invalid");
  const expectedClassificationRequest = classificationRequestFromSpans(input.canonical_request, input.request_spans);
  if (input.classification_request !== expectedClassificationRequest || input.classification_digest !== sha256Text(expectedClassificationRequest)) throw new CascadeError("task derivation classification input is not bound to user-authored spans");
  const taskId = input.task_id;
  const semanticClauseSpans = input.provenance_mode === "TRUSTED_SOURCE_SEGMENTS"
    ? refinedLexicalRequestSpans(input.canonical_request)
    : input.request_spans;
  const clausePatches = deriveAdmissionClausePatches(input.canonical_request, semanticClauseSpans as AdmissionClauseSpan[]);
  const inferredRelation = input.relation_override ?? clausePatches.relation ?? inferRelation(input.classification_request);
  const requestDigest = input.request_digest;
  const bareContinuation = Boolean(input.prior && /^\s*(?:continue|resume)\s*[.!?]*\s*$/i.test(input.classification_request));
  const relation = input.relation_override ?? (bareContinuation ? "CONTINUE" : input.prior && inferredRelation === "NEW"
    ? input.prior.request_digest === requestDigest
      ? "CONTINUE"
      : priorObjectiveRelated(input.prior, input.classification_request) ? "AMEND" : "NEW"
    : inferredRelation);
  const inferredIntent = input.intent_override ?? clausePatches.intent ?? inferIntent(input.classification_request);
  const intent = !input.intent_override && relation === "CONTINUE" && ["ANSWER", "VALIDATE"].includes(inferredIntent) && input.prior && !hasExplicitNoMutationConstraint(input.classification_request)
    ? input.prior.intent
    : inferredIntent;
  const candidateTags = unique(input.candidate_tags).sort();
  for (const tag of candidateTags) {
    if (!/^[a-z0-9-]+$/.test(tag) || tag === "always" || tag.startsWith("requested-")) throw new CascadeError(`candidate admission tag is invalid or authority-bearing: ${tag}`);
  }
  const explicitExternalRequest = requestForSource(input.canonical_request, input.request_spans, "EXTERNAL_SOURCE");
  const framedExternalRequest = requestForSource(input.classification_request, refinedLexicalRequestSpans(input.classification_request), "EXTERNAL_SOURCE");
  const externalRequest = explicitExternalRequest || framedExternalRequest || terminalReviewOnlyAction(input.classification_request) || "";
  const referencedActionScan = stripQuotedReferencedActions(stripEmbeddedReviewAction(input.classification_request))
    .replace(/(["'“”‘’`])(?:(?:please|then)\s+)?(?:proceed(?:\s+with\s+(?:it|that))?|carry(?:\s+(?:it|that))?\s+out|do\s+(?:it|that)|execute\s+(?:it|that|this|(?:the\s+)?(?:requested\s+action|action\s+requested))(?:\s+now)?|perform\s+(?:it|that|that\s+action|(?:the\s+)?(?:requested\s+action|action\s+requested))|act\s+on\s+(?:it|that|(?:the\s+)?(?:requested\s+action|action\s+requested))(?:\s+now)?|take\s+(?:it|that|the\s+action|(?:the\s+)?(?:requested\s+action|action\s+requested))|go\s+ahead(?:\s+and\s+(?:do\s+(?:it|that)|carry(?:\s+(?:it|that))?\s+out))?)\s*[.!?]*\1/gi, " reviewed phrase ")
    .replace(/[“‘](?:(?:please|then)\s+)?(?:proceed(?:\s+with\s+(?:it|that))?|carry(?:\s+(?:it|that))?\s+out|do\s+(?:it|that)|execute\s+(?:it|that|this|(?:the\s+)?(?:requested\s+action|action\s+requested))(?:\s+now)?|perform\s+(?:it|that|that\s+action|(?:the\s+)?(?:requested\s+action|action\s+requested))|act\s+on\s+(?:it|that|(?:the\s+)?(?:requested\s+action|action\s+requested))(?:\s+now)?|take\s+(?:it|that|the\s+action|(?:the\s+)?(?:requested\s+action|action\s+requested))|go\s+ahead(?:\s+and\s+(?:do\s+(?:it|that)|carry(?:\s+(?:it|that))?\s+out))?)\s*[.!?]*[”’]/gi, " reviewed phrase ")
    .replace(/\bwithout\s+(?:actually\s+)?(?:carrying|executing|performing|doing)\s+(?:it|that|anything)\s*(?:out)?\b/gi, " without execution ");
  const actionableReferencedActionScan = stripNegatedClauses(referencedActionScan);
  const referencedExternalAction = !terminalReviewOverride(input.classification_request) && !passiveActionAssessment(input.classification_request) && !hasTerminalExecutionCancellation(input.classification_request) && !hasExplicitNoMutationConstraint(input.classification_request) && /\b(?:(?:please|then)\s+)?(?:proceed(?:\s+with\s+(?:it|that))?|carry(?:\s+(?:it|that))?\s+out|do\s+(?:it|that)|execute\s+(?:it|that|this|(?:the\s+)?(?:requested\s+action|action\s+requested))(?:\s+now)?|perform\s+(?:it|that|that\s+action|(?:the\s+)?(?:requested\s+action|action\s+requested))|act\s+on\s+(?:it|that|(?:the\s+)?(?:requested\s+action|action\s+requested))(?:\s+now)?|take\s+(?:it|that|the\s+action|(?:the\s+)?(?:requested\s+action|action\s+requested))|go\s+ahead(?:\s+and\s+(?:do\s+(?:it|that)|carry(?:\s+(?:it|that))?\s+out))?)(?!\s+and\s+(?:make|add|apply|fix|change|edit|modify|update|implement|build|create|remove|delete|refactor|write))\b/i.test(actionableReferencedActionScan);
  const externalTags = clausePatches.suppress_external_authority_tags
    ? []
    : externalRequest ? inferExternalTags(externalRequest) : [];
  const referencedShellCommand = referencedExternalAction && externalRequest ? shellCommandFromRequest(externalRequest, true) : null;
  const referencedShellAction = referencedShellCommand
    ? classifyToolAction("exec_command", { cmd: referencedShellCommand })
    : "READ_ONLY";
  const referencedActionTags = referencedExternalAction
    ? unique([
        ...externalTags.filter((tag) => ["external-write", "privileged", "destructive"].includes(tag)),
        ...(referencedShellAction === "DESTRUCTIVE" ? ["destructive"] : referencedShellAction === "PRIVILEGED" ? ["privileged"] : referencedShellAction === "EXTERNAL_WRITE" ? ["external-write"] : []),
      ])
    : [];
  const referencedRequestedTags = directUserAttested ? referencedActionTags.map((tag) => `requested-${tag}`) : [];
  const directShellCommand = !hasExplicitNoMutationConstraint(input.classification_request) ? shellCommandFromRequest(input.classification_request) : null;
  const directShellAction = directShellCommand ? classifyToolAction("exec_command", { cmd: directShellCommand }) : "READ_ONLY";
  const directShellTags = directShellAction === "DESTRUCTIVE" ? ["destructive"] : directShellAction === "PRIVILEGED" ? ["privileged"] : directShellAction === "EXTERNAL_WRITE" ? ["external-write"] : [];
  const directShellRequestedTags = directUserAttested ? directShellTags.map((tag) => `requested-${tag}`) : [];
  const removedAuthorityTags = new Set(clausePatches.remove_authority_tags ?? []);
  const inferredTags = unique([
    ...inferTags(input.classification_request, intent, relation),
    ...referencedActionTags,
    ...referencedRequestedTags,
    ...directShellTags,
    ...directShellRequestedTags,
    ...(clausePatches.add_authority_tags ?? []),
    ...(clausePatches.add_policy_tags ?? []),
    ...(clausePatches.shell_action_class === "DESTRUCTIVE" ? ["destructive"] : clausePatches.shell_action_class === "EXTERNAL_WRITE" ? ["external-write"] : []),
  ])
    .filter((tag) => !removedAuthorityTags.has(tag as "destructive" | "external-write" | "privileged"))
    .filter((tag) => directUserAttested || !tag.startsWith("requested-"));
  const tags = new Set([...inferredTags, ...externalTags, ...candidateTags]);
  let claims = atomicClaims(input.canonical_request, input.request_spans, intent, relation, tags, input.authority_candidates, candidateTags, directUserAttested, clausePatches);
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
  const gaps: string[] = [];
  const conflicts: string[] = [...(clausePatches.conflicts ?? [])];
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
  const userTags = new Set([...inferredTags, ...candidateTags]);
  const topology = inferTopology(userTags, intent);
  const effort = inferEffort(userTags, topology, input.classification_request);
  const inferredAuthorityClass = inferAuthority(userTags, intent);
  const authorityClass = clausePatches.shell_action_class === "READ_ONLY" && inferredAuthorityClass === "LOCAL_WRITE"
    ? "READ_ONLY"
    : inferredAuthorityClass;
  const localWriteScopeRequest = authorityClass === "LOCAL_WRITE" && referencedExternalAction && hasImperativeMutation(externalRequest)
    ? externalRequest
    : input.classification_request;
  const baselineLocalWriteScope = deriveLocalWriteScope(localWriteScopeRequest, authorityClass);
  const localWriteScope = authorityClass === "LOCAL_WRITE" && clausePatches.boundary_targets?.length
    ? { mode: "TARGETS" as const, targets: clausePatches.boundary_targets }
    : authorityClass === "LOCAL_WRITE" && clausePatches.boundary_present && clausePatches.conflicts?.length && !clausePatches.boundary_targets?.length
      ? { mode: "TARGETS" as const, targets: [] }
      : authorityClass === "LOCAL_WRITE" && baselineLocalWriteScope.mode === "TARGETS" && !baselineLocalWriteScope.targets.length && clausePatches.repository_scope === "REPOSITORY"
        ? { mode: "REPOSITORY" as const, targets: [] }
        : baselineLocalWriteScope;
  const duration = inferDuration(userTags, topology, input.classification_request);
  const context = inferContext(controls, tags, topology, route);
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
    non_goals: ["admission does not execute work", "admission does not dispatch agents or create worklines", "lexical provenance is advisory and cannot establish hard-action authority"],
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
  const refinedLexicalSpans = verifiedProvenance ? null : refinedLexicalRequestSpans(input.request);
  const lexicalPartition = verifiedProvenance ? null : redactRequestPartition(input.request, refinedLexicalSpans!);
  const canonicalRequest = verifiedProvenance?.canonical_request ?? lexicalPartition!.canonical_request;
  if (!canonicalRequest.trim()) throw new CascadeError("admission request is empty after canonicalization");
  if (canonicalRequest.length > MAX_REDACTED_REQUEST_CHARACTERS) throw new CascadeError(`redacted admission request exceeds ${MAX_REDACTED_REQUEST_CHARACTERS} characters`);
  const requestSpans = verifiedProvenance?.spans ?? lexicalPartition!.request_spans;
  validateRequestSpans(canonicalRequest, requestSpans);
  const boundedClassificationRequest = classificationRequestFromSpans(canonicalRequest, requestSpans);
  const sourceDigest = input.source_digest ?? null;
  if (sourceDigest !== null && !/^[a-f0-9]{64}$/.test(sourceDigest)) throw new CascadeError("admission source_digest must be a lowercase SHA-256 digest");
  const taskId = input.task_id ?? input.prior_envelope?.task_id ?? "adhoc";
  if (input.prior_envelope && taskId !== input.prior_envelope.task_id) throw new CascadeError("prior task envelope belongs to a different task_id");
  return {
    schema_version: ADMISSION_SCHEMA_VERSION,
    classifier_id: "cascade-task-admission-v41",
    canonical_request: canonicalRequest,
    classification_request: boundedClassificationRequest,
    classification_digest: sha256Text(boundedClassificationRequest),
    provenance_version: 2,
    provenance_mode: verifiedProvenance ? "TRUSTED_SOURCE_SEGMENTS" : "LEXICAL_FALLBACK",
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
    authenticity: verifiedProvenance ? "TRUSTED_DIRECT_USER_ATTESTATION" : "UNVERIFIED_LEXICAL_FALLBACK",
  };
}

export async function compileTaskEnvelope(input: AdmissionRequest): Promise<TaskEnvelope> {
  assertAdmissionRequestBound(input.request);
  await validateAdmissionRepository();
  if (input.prior_envelope) validateTaskEnvelope(input.prior_envelope);
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
  await validateAdmissionRepository();
  const source = await readJson<JsonObject>(CORPUS_PATH);
  validateAdmissionCaseBundle(source);
  const results: JsonObject[] = [];
  for (const item of source.cases as JsonObject[]) {
    const envelope = await compileTaskEnvelope({ request: item.request, task_id: item.id, authority: item.authority, produced_at: "2026-08-04T00:00:00Z" });
    const missing = item.required_controls.filter((control: string) => !envelope.control_packs.includes(control as ControlPack));
    const unexpected = envelope.control_packs.filter((control) => !item.required_controls.includes(control));
    const forbidden = item.forbidden_controls.filter((control: string) => envelope.control_packs.includes(control as ControlPack));
    const missingSkills = item.expected_skills.filter((skill: string) => !envelope.required_skills.includes(skill));
    const unexpectedSkills = envelope.required_skills.filter((skill: string) => !item.expected_skills.includes(skill));
    const relationMatch = envelope.relation === item.expected_relation;
    const intentMatch = envelope.intent === item.expected_intent;
    const workloadMatch = stableJson(envelope.workload) === stableJson(item.expected_workload);
    const skillsMatch = !missingSkills.length && !unexpectedSkills.length;
    const routeMatch = envelope.route === item.expected_route;
    const blockedMatch = Boolean(envelope.blockers.length) === item.expected_blocked;
    const persistenceMatch = item.expected_persistence === undefined || envelope.persistence.recommended === item.expected_persistence;
    const actualClaimKinds = unique(envelope.claims.filter((claim) => claim.source === "USER" && claim.status !== "SUPERSEDED").map((claim) => claim.kind));
    const claimsMatch = item.expected_claim_kinds === undefined || stableJson(actualClaimKinds.sort()) === stableJson([...item.expected_claim_kinds].sort());
    const traceComplete = envelope.control_packs.every((control) => envelope.explanation_trace.some((row: JsonObject) => row.control === control));
    const overControl = forbidden.length > 0 || unexpected.length > 0 || unexpectedSkills.length > 0 || ROUTES.indexOf(envelope.route) > ROUTES.indexOf(item.expected_route) || (!item.expected_blocked && envelope.blockers.length > 0);
    const underControl = missing.length > 0 || missingSkills.length > 0 || ROUTES.indexOf(envelope.route) < ROUTES.indexOf(item.expected_route) || (item.expected_blocked && envelope.blockers.length === 0);
    const status = relationMatch && intentMatch && workloadMatch && skillsMatch && persistenceMatch && claimsMatch && routeMatch && blockedMatch && !missing.length && !unexpected.length && !forbidden.length && traceComplete ? "PASS" : "FAIL";
    results.push({
      id: item.id,
      criterion: item.criterion,
      status,
      relation_match: relationMatch,
      intent_match: intentMatch,
      workload_match: workloadMatch,
      skills_match: skillsMatch,
      persistence_match: persistenceMatch,
      claims_match: claimsMatch,
      expected_route: item.expected_route,
      actual_route: envelope.route,
      missing_controls: missing,
      unexpected_controls: unexpected,
      forbidden_controls: forbidden,
      missing_skills: missingSkills,
      unexpected_skills: unexpectedSkills,
      blocked_match: blockedMatch,
      trace_complete: traceComplete,
      over_control: overControl,
      under_control: underControl,
    });
  }
  const failed = results.filter((item) => item.status !== "PASS").length;
  const count = (field: string) => results.filter((item) => item[field] === true).length;
  const assessment = {
    schema_version: ADMISSION_SCHEMA_VERSION,
    policy_bundle_version: ADMISSION_POLICY_BUNDLE,
    case_set_version: source.case_set_version,
    version_bijection: source.policy_bundle_version === ADMISSION_POLICY_BUNDLE && source.case_set_version === ADMISSION_SCHEMA_VERSION,
    status: failed ? "FAIL" : "PASS",
    total: results.length,
    metric_population: results.length,
    passed: results.length - failed,
    failed,
    over_control: results.filter((item) => item.over_control).length,
    under_control: results.filter((item) => item.under_control).length,
    trace_complete: results.every((item) => item.trace_complete),
    axes_complete: results.every((item) => item.relation_match && item.intent_match && item.workload_match),
    metrics: {
      relation_correct: count("relation_match"),
      intent_correct: count("intent_match"),
      workload_correct: count("workload_match"),
      route_correct: results.filter((item) => item.expected_route === item.actual_route).length,
      controls_exact: results.filter((item) => !item.missing_controls.length && !item.unexpected_controls.length && !item.forbidden_controls.length).length,
      skills_exact: count("skills_match"),
      blocked_correct: count("blocked_match"),
      persistence_applicable: (source.cases as JsonObject[]).filter((item) => item.expected_persistence !== undefined).length,
      persistence_correct: (source.cases as JsonObject[]).filter((item, index) => item.expected_persistence !== undefined && results[index]!.persistence_match).length,
      claims_applicable: (source.cases as JsonObject[]).filter((item) => item.expected_claim_kinds !== undefined).length,
      claims_correct: (source.cases as JsonObject[]).filter((item, index) => item.expected_claim_kinds !== undefined && results[index]!.claims_match).length,
    },
    results,
  };
  assertJsonSchema(assessment, ASSESSMENT_SCHEMA, "$");
  return assessment;
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

export async function main(argv: string[]): Promise<number> {
  const [command, ...rest] = argv;
  const args = parseArgs(rest);
  if (command === "validate") {
    const result = await validateAdmissionRepository();
    console.log(`admission_status=PASS policies=${result.policy_count} controls=${result.control_count} cases=${result.case_count} bundle=${ADMISSION_POLICY_BUNDLE}`);
    return 0;
  }
  if (command === "assess" || command === "explain") {
    const file = flag(args, "file");
    const request = file ? await readBoundedAdmissionRequest(file) : flag(args, "request") ?? args.positionals.join(" ");
    const priorPath = flag(args, "prior-envelope");
    const prior = priorPath ? await readBoundedTaskEnvelope(priorPath, ".artifacts/task-admission/") : undefined;
    const relationFlag = flag(args, "relation");
    const intentFlag = flag(args, "intent");
    if (relationFlag) requireEnum(relationFlag, RELATIONS, "--relation");
    if (intentFlag) requireEnum(intentFlag, INTENTS, "--intent");
    if (flags(args, "hard-action-grant").length) throw new CascadeError("--hard-action-grant is unsupported: only the trusted host runtime can issue and atomically consume hard-action receipts");
    if (boolFlag(args, "dispatch-authorized")) throw new CascadeError("--dispatch-authorized is unsupported: task admission can recommend persistence but cannot authorize dispatch");
    const envelope = await compileTaskEnvelope({
      request,
      task_id: flag(args, "task-id", prior?.task_id ?? "adhoc"),
      relation: relationFlag as Relation | undefined,
      intent: intentFlag as Intent | undefined,
      authority: flags(args, "authority"),
      produced_at: flag(args, "produced-at"),
      source_digest: flag(args, "source-digest"),
      prior_envelope: prior,
    });
    const output = flag(args, "output");
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
    return result.status === "PASS" ? 0 : 1;
  }
  console.log("Usage: bun scripts/cascade.ts admission <validate|assess|explain|check-envelope|corpus> [--prior-envelope PATH] [--authority CANDIDATE] [--source-digest SHA256] [--expected-request-digest SHA256] [--expected-source-digest SHA256] [--output .artifacts/task-admission/FILE.json]");
  return command ? 1 : 0;
}
