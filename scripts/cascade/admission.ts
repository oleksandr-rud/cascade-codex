import { readFile } from "node:fs/promises";

import {
  CascadeError,
  boundedPath,
  boolFlag,
  flag,
  parseArgs,
  readJson,
  rootPath,
  sha256Text,
  stableJson,
  utcNow,
  writeJsonAtomic,
} from "./common";

export const ADMISSION_SCHEMA_VERSION = 1;
export const ADMISSION_POLICY_BUNDLE = "cascade-core@2";
const POLICY_PATH = rootPath(".codex/task-admission/policies/core.json");
const CONTROL_PATH = rootPath(".codex/task-admission/control-catalog.json");
const CORPUS_PATH = rootPath("harness-evals/task-admission/cases.json");

const RELATIONS = ["NEW", "CONTINUE", "AMEND", "OVERRIDE", "STATUS", "CANCEL", "CONVERSATION_ONLY"] as const;
const INTENTS = ["ANSWER", "DISCOVER", "DIAGNOSE", "REVIEW", "VALIDATE", "CHANGE", "OPERATE"] as const;
const ROUTES = ["NO_WORKFLOW", "DIRECT_READ", "DIRECT_CHANGE", "BOUNDED", "CONNECTED", "PROGRAM"] as const;
const CONTROL_PACKS = ["BASE", "GROUNDED_READ", "ATOMIC_CHANGE", "STANDARD_CHANGE", "CONNECTED_DELIVERY", "PROGRAM_CONTROL", "SIMULATION_GOVERNANCE", "SECURITY_ASSURANCE", "FULL_SCAN", "RELEASE_EVIDENCE"] as const;
const TOPOLOGY = ["ATOMIC", "BOUNDED", "CONNECTED", "PROGRAM"] as const;
const EFFORT = ["MICRO", "SMALL", "MEDIUM", "LARGE", "EXTENDED"] as const;
const ASSURANCE = ["BASIC", "STANDARD", "HIGH", "REGULATED"] as const;
const AUTHORITY = ["READ_ONLY", "LOCAL_WRITE", "EXTERNAL_WRITE", "PRIVILEGED", "DESTRUCTIVE"] as const;
const EVIDENCE = ["EXPLANATION", "TARGETED", "REGRESSION", "INDEPENDENT", "RELEASE"] as const;
const DURATION = ["TURN", "MULTI_TURN", "RESUMABLE", "PROGRAM"] as const;
const CONTEXT = ["PROMPT_ONLY", "TARGETED_PROBE", "SCOPED_SCAN", "FULL_SCAN"] as const;

type Relation = typeof RELATIONS[number];
type Intent = typeof INTENTS[number];
type Route = typeof ROUTES[number];
type ControlPack = typeof CONTROL_PACKS[number];
type JsonObject = Record<string, any>;

export interface AdmissionRequest {
  request: string;
  task_id?: string;
  relation?: Relation;
  intent?: Intent;
  authority?: string[];
  dispatch_authorized?: boolean;
  produced_at?: string;
  candidate_tags?: string[];
  prior_envelope?: TaskEnvelope;
}

export interface TaskClaim {
  claim_id: string;
  kind: string;
  statement: string;
  source: string;
  status: string;
  confidence: number | null;
  verification: string;
  policy_tags: string[];
  consumers: string[];
  invalidation: string[];
}

export interface TaskEnvelope extends JsonObject {
  schema_version: 1;
  artifact_type: "cascade-task-envelope";
  envelope_id: string;
  revision: number;
  policy_bundle_version: string;
  request_digest: string;
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
    authority: typeof AUTHORITY[number];
    evidence: typeof EVIDENCE[number];
    duration: typeof DURATION[number];
    context: typeof CONTEXT[number];
  };
  route: Route;
  control_packs: ControlPack[];
  reclassification: {
    preserved_claim_ids: string[];
    superseded_claim_ids: string[];
    reopened_consumers: string[];
  };
}

interface AdmissionPolicy extends JsonObject {
  id: string;
  version: number;
  priority: string;
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
}

export interface ToolAdmissionDecision {
  behavior: "allow" | "deny" | "defer";
  action_class: typeof AUTHORITY[number];
  reason: string;
}

function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}

function redactedRequest(value: string): string {
  return value
    .replace(/\bsk-[A-Za-z0-9_-]{16,}\b/g, "[REDACTED_API_KEY]")
    .replace(/\b(?:ghp|github_pat)_[A-Za-z0-9_]{16,}\b/g, "[REDACTED_TOKEN]")
    .replace(/\bBearer\s+[A-Za-z0-9._~-]{12,}\b/gi, "Bearer [REDACTED]")
    .replace(/\b(password|passwd|secret|token)\s*[=:]\s*\S+/gi, "$1=[REDACTED]")
    .slice(0, 1000);
}

function requireEnum(value: unknown, allowed: readonly string[], label: string): asserts value is string {
  if (typeof value !== "string" || !allowed.includes(value)) {
    throw new CascadeError(`${label} must be one of ${allowed.join(", ")}`);
  }
}

function requireString(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string" || !value.trim()) {
    throw new CascadeError(`${label} must be a non-empty string`);
  }
}

function inferRelation(text: string): Relation {
  if (/\b(cancel|stop|abort)\b/i.test(text)) return "CANCEL";
  if (/\b(status|progress|where are we|what remains)\b/i.test(text)) return "STATUS";
  if (/\b(instead|replace the request|override)\b/i.test(text)) return "OVERRIDE";
  if (/\b(also|additionally|amend)\b/i.test(text)) return "AMEND";
  if (/\b(continue|resume|until done|implement)\b/i.test(text)) return "CONTINUE";
  if (/\b(explain|discuss|what is|how does)\b/i.test(text) && !/\b(change|fix|implement|build|write)\b/i.test(text)) return "CONVERSATION_ONLY";
  return "NEW";
}

function inferIntent(text: string): Intent {
  if (/\b(run|running|operate|operating|deploy(?:ed|ing)?|publish(?:ed|ing)?|send(?:ing)?|execute|executing|rotate|rotating)\b/i.test(text)) return "OPERATE";
  if (/\b(implement(?:ed|ing)?|fix(?:ed|ing)?|chang(?:e|ed|ing)|build(?:ing)?|creat(?:e|ed|ing)|updat(?:e|ed|ing)|remov(?:e|ed|ing)|refactor(?:ed|ing)?)\b/i.test(text)) return "CHANGE";
  if (/\b(validate|test|verify|check)\b/i.test(text)) return "VALIDATE";
  if (/\b(review|audit)\b/i.test(text)) return "REVIEW";
  if (/\b(diagnose|debug|root cause|why failing)\b/i.test(text)) return "DIAGNOSE";
  if (/\b(research|discover|explore|investigate)\b/i.test(text)) return "DISCOVER";
  return "ANSWER";
}

function inferTags(text: string, intent: Intent, relation: Relation): string[] {
  const lower = text.toLowerCase();
  const tags = ["always"];
  if (["STATUS"].includes(relation) || ["REVIEW", "DIAGNOSE", "VALIDATE"].includes(intent)) tags.push("current-state");
  if (intent === "REVIEW") tags.push("review");
  if (intent === "DIAGNOSE") tags.push("diagnose");
  if (relation === "STATUS") tags.push("status");
  if (/\b(typo|formatting|import cleanup|rename local)\b/.test(lower)) tags.push("atomic-change");
  if (intent === "CHANGE" && !tags.includes("atomic-change")) tags.push("behavior-change");
  if (/\b(public|schema|contract|api|cli flag|state change|refactor)\b/.test(lower)) tags.push("behavior-change");
  if (/\b(several|multiple|dependent|connected|multi[- ]turn|long[- ]running|resume)\b/.test(lower)) tags.push("connected", "multi-turn");
  if (/\b(program|epic|worklines?|multi[- ]owner|release join|10|11|12|13|14|15)\b/.test(lower)) tags.push("program");
  if (
    ["CHANGE", "OPERATE"].includes(intent) &&
    /\b(simulation|simulate|campaign|synthetic persona|persona simulation)\b/.test(lower)
  ) tags.push("simulation", "connected", "multi-turn");
  if (/\b(release|release-eligible|production)\b/.test(lower)) tags.push("release");
  if (/\b(deploy)\b/.test(lower)) tags.push("deploy");
  if (/\b(merge[- ]eligible)\b/.test(lower)) tags.push("merge-eligible");
  if (/\b(full scan|repository-wide|exhaustive)\b/.test(lower)) tags.push("full-scan");
  if (/\b(migration|migrate)\b/.test(lower)) tags.push("migration");
  if (/\b(auth|authentication|authorization|tenant)\b/.test(lower)) tags.push("auth");
  if (/\b(secret|credential|api key|token)\b/.test(lower)) tags.push("secret");
  if (/\b(rotate|replace).{0,24}\b(secret|credential|api key|token)\b/.test(lower)) tags.push("privileged");
  if (/\b(payment|billing)\b/.test(lower)) tags.push("payment");
  if (/\b(safety|medical|legal)\b/.test(lower)) tags.push("safety");
  if (/\b(external write|send email|create issue|publish|push)\b/.test(lower)) tags.push("external-write");
  if (/\b(privileged|sudo|production credential)\b/.test(lower)) tags.push("privileged");
  if (/\b(delete|destroy|destructive|wipe|reset --hard|rm -rf)\b/.test(lower)) tags.push("destructive");
  if (/\b(conflicting authority)\b/.test(lower)) tags.push("conflicting-authority");
  return unique(tags).sort();
}

function rankMax<T extends string>(values: readonly T[], current: T, candidate: T | null): T {
  if (!candidate) return current;
  return values.indexOf(candidate) > values.indexOf(current) ? candidate : current;
}

function policyMatches(policy: AdmissionPolicy, tags: Set<string>): boolean {
  return policy.match_all.every((tag) => tags.has(tag)) &&
    (!policy.match_any.length || policy.match_any.some((tag) => tags.has(tag)));
}

function policyTraceClaim(claims: TaskClaim[], policy: AdmissionPolicy): string[] {
  const matchTags = new Set([...policy.match_all, ...policy.match_any]);
  return claims.filter((claim) => claim.policy_tags.some((tag) => matchTags.has(tag))).map((claim) => claim.claim_id);
}

function classifyBaseRoute(intent: Intent, relation: Relation, tags: Set<string>): Route {
  if (relation === "CONVERSATION_ONLY") return "NO_WORKFLOW";
  if (["ANSWER", "DISCOVER", "DIAGNOSE", "REVIEW", "VALIDATE"].includes(intent) || relation === "STATUS") return "DIRECT_READ";
  if (tags.has("atomic-change")) return "DIRECT_CHANGE";
  return "BOUNDED";
}

function requiredSkills(controls: ControlPack[], intent: Intent): string[] {
  const skills: string[] = [];
  if (controls.includes("GROUNDED_READ")) skills.push("context");
  if (controls.includes("ATOMIC_CHANGE")) skills.push("implement-change", "validate-change");
  if (controls.includes("STANDARD_CHANGE")) skills.push("plan-change", "functional-qa", "implement-change", "review-change", "validate-change");
  if (controls.includes("CONNECTED_DELIVERY") || controls.includes("PROGRAM_CONTROL")) skills.push("orchestrate-work");
  if (controls.includes("SIMULATION_GOVERNANCE")) skills.push("simulation-campaigns");
  if (controls.includes("SECURITY_ASSURANCE")) skills.push("secure-design");
  if (controls.includes("RELEASE_EVIDENCE")) skills.push("validate-change");
  if (!skills.length && intent === "REVIEW") skills.push("review-change");
  return unique(skills);
}

export function validateTaskEnvelope(envelope: unknown): asserts envelope is TaskEnvelope {
  if (!envelope || typeof envelope !== "object" || Array.isArray(envelope)) throw new CascadeError("task envelope must be an object");
  const value = envelope as JsonObject;
  if (value.schema_version !== 1 || value.artifact_type !== "cascade-task-envelope") throw new CascadeError("task envelope schema identity is invalid");
  if (!/^TE-[a-f0-9]{16}$/.test(value.envelope_id ?? "")) throw new CascadeError("task envelope ID is invalid");
  if (!Number.isInteger(value.revision) || value.revision < 1) throw new CascadeError("task envelope revision is invalid");
  if (value.policy_bundle_version !== ADMISSION_POLICY_BUNDLE) throw new CascadeError("task envelope policy bundle is stale or unsupported");
  if (!/^[a-f0-9]{64}$/.test(value.request_digest ?? "")) throw new CascadeError("task envelope request digest is invalid");
  requireString(value.task_id, "task envelope task_id");
  const expectedId = `TE-${sha256Text(stableJson({ task_id: value.task_id, requestDigest: value.request_digest, revision: value.revision, policy: value.policy_bundle_version })).slice(0, 16)}`;
  if (value.envelope_id !== expectedId) throw new CascadeError("task envelope identity digest is invalid");
  if (value.prior_envelope_id !== null && !/^TE-[a-f0-9]{16}$/.test(value.prior_envelope_id ?? "")) throw new CascadeError("task envelope prior ID is invalid");
  if ((value.revision === 1) !== (value.prior_envelope_id === null)) throw new CascadeError("task envelope lineage is inconsistent");
  if (Number.isNaN(Date.parse(value.produced_at))) throw new CascadeError("task envelope produced_at is invalid");
  requireEnum(value.relation, RELATIONS, "task envelope relation");
  requireEnum(value.intent, INTENTS, "task envelope intent");
  requireEnum(value.route, ROUTES, "task envelope route");
  if (!value.workload || typeof value.workload !== "object") throw new CascadeError("task envelope workload is missing");
  requireEnum(value.workload.topology, TOPOLOGY, "task envelope topology");
  requireEnum(value.workload.effort, EFFORT, "task envelope effort");
  requireEnum(value.workload.assurance, ASSURANCE, "task envelope assurance");
  requireEnum(value.workload.authority, AUTHORITY, "task envelope authority");
  requireEnum(value.workload.evidence, EVIDENCE, "task envelope evidence");
  requireEnum(value.workload.duration, DURATION, "task envelope duration");
  requireEnum(value.workload.context, CONTEXT, "task envelope context");
  if (!Array.isArray(value.control_packs) || !value.control_packs.length) throw new CascadeError("task envelope controls are missing");
  for (const control of value.control_packs) requireEnum(control, CONTROL_PACKS, "task envelope control");
  if (new Set(value.control_packs).size !== value.control_packs.length) throw new CascadeError("task envelope controls contain duplicates");
  for (const key of ["claims", "required_skills", "policy_decisions", "explanation_trace", "reclassification_triggers", "conflicts", "gaps", "blockers", "non_goals", "invalidation"]) {
    if (!Array.isArray(value[key])) throw new CascadeError(`task envelope ${key} must be an array`);
  }
  const claimIds = value.claims.map((claim: JsonObject) => claim.claim_id);
  if (new Set(claimIds).size !== claimIds.length) throw new CascadeError("task envelope claim IDs contain duplicates");
  for (const claim of value.claims) {
    if (!claim || typeof claim !== "object" || !/^CL-[0-9]{3}$/.test(claim.claim_id ?? "")) throw new CascadeError("task envelope claim identity is invalid");
    requireEnum(claim.kind, ["OUTCOME", "CURRENT_STATE", "CRITERION", "CONSTRAINT", "NON_GOAL", "BOUNDARY", "HAZARD", "AUTHORITY", "EVIDENCE", "INFERENCE"], "task claim kind");
    requireEnum(claim.source, ["USER", "TRUSTED_INSTRUCTION", "CURRENT_SOURCE", "TOOL_EVIDENCE", "EXTERNAL_SOURCE", "MODEL_INFERENCE"], "task claim source");
    requireEnum(claim.status, ["PROVIDED", "VERIFIED", "INFERRED", "UNKNOWN", "CONFLICTING", "SUPERSEDED"], "task claim status");
    requireString(claim.statement, "task claim statement");
    if (claim.statement.length > 1000) throw new CascadeError("task claim statement exceeds its bound");
    for (const key of ["policy_tags", "consumers", "invalidation"]) if (!Array.isArray(claim[key])) throw new CascadeError(`task claim ${key} must be an array`);
  }
  if (!value.authority || !Array.isArray(value.authority.granted) || !Array.isArray(value.authority.missing)) throw new CascadeError("task envelope authority ledger is invalid");
  if (!value.persistence || typeof value.persistence.recommended !== "boolean" || typeof value.persistence.dispatch_authorized !== "boolean") throw new CascadeError("task envelope persistence decision is invalid");
  if (!value.reclassification || !Array.isArray(value.reclassification.preserved_claim_ids) || !Array.isArray(value.reclassification.superseded_claim_ids) || !Array.isArray(value.reclassification.reopened_consumers)) throw new CascadeError("task envelope reclassification ledger is invalid");
  const traced = new Set(value.explanation_trace.map((item: JsonObject) => item.control));
  if (value.control_packs.some((control: string) => !traced.has(control))) throw new CascadeError("task envelope explanation trace is incomplete");
  for (const decision of value.policy_decisions) {
    if (!/^TAP-[0-9]{3}$/.test(decision.policy_id ?? "") || decision.version !== 1) throw new CascadeError("task envelope policy decision is invalid");
    requireEnum(decision.effect, ["ALLOW", "REQUIRE", "DENY", "GAP"], "task envelope policy effect");
  }
}

export async function validateAdmissionRepository(): Promise<{ policy_count: number; control_count: number }> {
  const [bundle, catalog, envelopeSchema, policySchema, cases, caseSchema, assessmentSchema] = await Promise.all([
    readJson<JsonObject>(POLICY_PATH), readJson<JsonObject>(CONTROL_PATH),
    readJson<JsonObject>(rootPath(".codex/task-admission/task-envelope.schema.json")),
    readJson<JsonObject>(rootPath(".codex/task-admission/policy.schema.json")),
    readJson<JsonObject>(CORPUS_PATH),
    readJson<JsonObject>(rootPath("harness-evals/task-admission/case.schema.json")),
    readJson<JsonObject>(rootPath("harness-evals/task-admission/assessment.schema.json")),
  ]);
  if (envelopeSchema.$id !== "https://cascade.local/schemas/task-envelope.schema.json" || policySchema.$id !== "https://cascade.local/schemas/task-admission-policy.schema.json") throw new CascadeError("task admission public schema identity is invalid");
  if (cases.schema_version !== 1 || !Array.isArray(cases.cases) || cases.cases.length < 12 || caseSchema.type !== "object" || assessmentSchema.type !== "object") throw new CascadeError("task admission evaluation schemas or corpus are invalid");
  if (bundle.schema_version !== 1 || bundle.bundle_id !== "cascade-core" || bundle.bundle_version !== 2 || !Array.isArray(bundle.policies)) throw new CascadeError("task admission policy bundle is invalid");
  if (catalog.schema_version !== 1 || catalog.catalog_id !== "cascade-task-controls" || catalog.catalog_version !== 1 || !Array.isArray(catalog.controls)) throw new CascadeError("task admission control catalog is invalid");
  const controlIds = catalog.controls.map((item: JsonObject) => item.id);
  if (new Set(controlIds).size !== controlIds.length || stableJson([...controlIds].sort()) !== stableJson([...CONTROL_PACKS].sort())) throw new CascadeError("task admission control catalog does not match compiler controls");
  const policyIds = bundle.policies.map((item: JsonObject) => item.id);
  if (new Set(policyIds).size !== policyIds.length) throw new CascadeError("task admission policy IDs contain duplicates");
  for (const policy of bundle.policies as AdmissionPolicy[]) {
    if (!/^TAP-[0-9]{3}$/.test(policy.id) || policy.version !== 1 || !Array.isArray(policy.match_all) || !Array.isArray(policy.match_any)) throw new CascadeError(`task admission policy is invalid: ${policy.id ?? "unknown"}`);
    for (const control of [...policy.required_controls, ...policy.forbidden_controls]) requireEnum(control, CONTROL_PACKS, `policy ${policy.id} control`);
  }
  return { policy_count: policyIds.length, control_count: controlIds.length };
}

export async function compileTaskEnvelope(input: AdmissionRequest): Promise<TaskEnvelope> {
  requireString(input.request, "admission request");
  const bundle = await readJson<JsonObject>(POLICY_PATH);
  await validateAdmissionRepository();
  const relation = input.relation ?? inferRelation(input.request);
  const intent = input.intent ?? inferIntent(input.request);
  const tags = new Set([...inferTags(input.request, intent, relation), ...(input.candidate_tags ?? [])]);
  let claims: TaskClaim[] = [
    {
      claim_id: "CL-001", kind: "OUTCOME", statement: redactedRequest(input.request.trim()), source: "USER", status: "PROVIDED", confidence: null,
      verification: "verify against the user request", policy_tags: [...tags].filter((tag) => tag !== "always"), consumers: ["route", "controls"], invalidation: ["request"],
    },
  ];
  if (input.authority?.length) claims.push({
    claim_id: "CL-002", kind: "AUTHORITY", statement: `Granted authority: ${unique(input.authority).sort().join(", ")}`,
    source: "USER", status: "PROVIDED", confidence: null, verification: "preserve exact user grant", policy_tags: unique(input.authority).sort(), consumers: ["authority", "tool-enforcement"], invalidation: ["permission", "request"],
  });
  const inferredTags = [...tags].filter((tag) => !["always", "current-state", "review", "diagnose", "status", "atomic-change", "behavior-change", "connected", "multi-turn", "program"].includes(tag));
  if (inferredTags.length) claims.push({
    claim_id: `CL-${String(claims.length + 1).padStart(3, "0")}`, kind: "INFERENCE", statement: `Deterministic admission signals: ${inferredTags.join(", ")}`,
    source: "MODEL_INFERENCE", status: "INFERRED", confidence: 0.8, verification: "confirm from current scope before hard action", policy_tags: inferredTags, consumers: ["policies", "controls"], invalidation: ["request", "scope", "source"],
  });
  const preservedClaimIds: string[] = [];
  const supersededClaimIds: string[] = [];
  const reopenedConsumers: string[] = [];
  if (input.prior_envelope) {
    validateTaskEnvelope(input.prior_envelope);
    let nextClaimNumber = Math.max(
      0,
      ...input.prior_envelope.claims.map((claim) =>
        Number(claim.claim_id.slice(3))
      ),
    ) + 1;
    const matchedPrior = new Set<string>();
    claims = claims.map((claim) => {
      const prior = input.prior_envelope!.claims.find(
        (candidate) =>
          candidate.status !== "SUPERSEDED" &&
          candidate.kind === claim.kind &&
          candidate.source === claim.source &&
          candidate.statement === claim.statement,
      );
      if (prior) {
        matchedPrior.add(prior.claim_id);
        preservedClaimIds.push(prior.claim_id);
        return { ...claim, claim_id: prior.claim_id };
      }
      return {
        ...claim,
        claim_id: `CL-${String(nextClaimNumber++).padStart(3, "0")}`,
      };
    });
    const superseded = input.prior_envelope.claims
      .filter(
        (claim) =>
          claim.status !== "SUPERSEDED" && !matchedPrior.has(claim.claim_id),
      )
      .map((claim) => {
        supersededClaimIds.push(claim.claim_id);
        reopenedConsumers.push(...claim.consumers);
        return { ...claim, status: "SUPERSEDED" };
      });
    claims = [...superseded, ...claims].sort((left, right) =>
      left.claim_id.localeCompare(right.claim_id)
    );
  }
  const matched = (bundle.policies as AdmissionPolicy[]).filter((policy) => policyMatches(policy, tags));
  const controlSet = new Set<ControlPack>();
  const requiredBy = new Map<ControlPack, AdmissionPolicy[]>();
  const forbiddenBy = new Map<ControlPack, AdmissionPolicy[]>();
  let route = classifyBaseRoute(intent, relation, tags);
  let assurance: typeof ASSURANCE[number] = "BASIC";
  let evidence: typeof EVIDENCE[number] = route === "NO_WORKFLOW" ? "EXPLANATION" : "TARGETED";
  const missingAuthority: string[] = [];
  const conflicts: string[] = [];
  for (const policy of matched) {
    policy.required_controls.forEach((control) => {
      controlSet.add(control);
      requiredBy.set(control, [...(requiredBy.get(control) ?? []), policy]);
    });
    policy.forbidden_controls.forEach((control) => {
      forbiddenBy.set(control, [...(forbiddenBy.get(control) ?? []), policy]);
    });
    route = rankMax(ROUTES, route, policy.minimum_route);
    assurance = rankMax(ASSURANCE, assurance, policy.minimum_assurance);
    evidence = rankMax(EVIDENCE, evidence, policy.minimum_evidence);
    if (policy.approval && !(input.authority ?? []).includes(policy.approval)) missingAuthority.push(policy.approval);
    if (policy.priority === "HARD_DENY") conflicts.push(`${policy.id}:${policy.conflict_set ?? "hard-deny"}`);
  }
  const priority = ["HARD_DENY", "APPROVAL", "HAZARD", "ASSURANCE", "TOPOLOGY", "OPTIONAL"];
  for (const [control, forbidders] of forbiddenBy) {
    for (const requiring of requiredBy.get(control) ?? []) {
      for (const forbidding of forbidders) {
        const requiredRank = priority.indexOf(requiring.priority);
        const forbiddenRank = priority.indexOf(forbidding.priority);
        if (requiredRank === forbiddenRank) {
          conflicts.push(
            `POLICY_CONFLICT:${control}:${requiring.id}:${forbidding.id}`,
          );
        } else if (forbiddenRank < requiredRank) {
          controlSet.delete(control);
        }
      }
    }
  }
  if (conflicts.length) route = "DIRECT_READ";
  const controls = [...controlSet].sort((left, right) => CONTROL_PACKS.indexOf(left) - CONTROL_PACKS.indexOf(right));
  const topology = route === "PROGRAM" ? "PROGRAM" : route === "CONNECTED" ? "CONNECTED" : route === "BOUNDED" ? "BOUNDED" : "ATOMIC";
  const effort = topology === "PROGRAM" ? "EXTENDED" : topology === "CONNECTED" ? "LARGE" : topology === "BOUNDED" ? "MEDIUM" : input.request.length > 160 ? "SMALL" : "MICRO";
  const authority = tags.has("destructive") ? "DESTRUCTIVE" : tags.has("privileged") ? "PRIVILEGED" : tags.has("external-write") ? "EXTERNAL_WRITE" : intent === "CHANGE" || intent === "OPERATE" ? "LOCAL_WRITE" : "READ_ONLY";
  const duration = topology === "PROGRAM" ? "PROGRAM" : topology === "CONNECTED" ? "RESUMABLE" : topology === "BOUNDED" ? "MULTI_TURN" : "TURN";
  const context = controls.includes("FULL_SCAN") ? "FULL_SCAN" : topology === "PROGRAM" || topology === "CONNECTED" ? "SCOPED_SCAN" : route === "DIRECT_READ" || route === "DIRECT_CHANGE" ? "TARGETED_PROBE" : "PROMPT_ONLY";
  const revision = (input.prior_envelope?.revision ?? 0) + 1;
  const requestDigest = sha256Text(input.request.trim());
  const identityDigest = sha256Text(stableJson({ task_id: input.task_id ?? "adhoc", requestDigest, revision, policy: ADMISSION_POLICY_BUNDLE }));
  const envelope: TaskEnvelope = {
    schema_version: 1,
    artifact_type: "cascade-task-envelope",
    envelope_id: `TE-${identityDigest.slice(0, 16)}`,
    revision,
    policy_bundle_version: ADMISSION_POLICY_BUNDLE,
    request_digest: requestDigest,
    task_id: input.task_id ?? "adhoc",
    prior_envelope_id: input.prior_envelope?.envelope_id ?? null,
    produced_at: input.produced_at ?? utcNow(),
    relation,
    intent,
    claims,
    workload: { topology, effort, assurance, authority, evidence, duration, context },
    route,
    control_packs: controls,
    required_skills: requiredSkills(controls, intent),
    evidence_floor: evidence,
    persistence: {
      recommended: ["CONNECTED", "PROGRAM"].includes(route) || duration !== "TURN",
      dispatch_authorized: input.dispatch_authorized === true,
      reason: ["CONNECTED", "PROGRAM"].includes(route) ? "dependent work must survive turns and repair" : "the route does not require durable work state",
    },
    authority: { granted: unique(input.authority ?? []).sort(), missing: unique(missingAuthority).sort() },
    policy_decisions: matched.map((policy) => ({
      policy_id: policy.id, version: policy.version,
      effect: policy.priority === "HARD_DENY" ? "DENY" : policy.approval && missingAuthority.includes(policy.approval) ? "GAP" : "REQUIRE",
      matched_claim_ids: policyTraceClaim(claims, policy), controls: policy.required_controls, reason: policy.rationale,
    })),
    explanation_trace: matched.flatMap((policy) => policy.required_controls.map((control) => ({
      claim_id: policyTraceClaim(claims, policy)[0] ?? "CL-001", signal: [...policy.match_all, ...policy.match_any].filter((tag) => tags.has(tag)).join("+") || "always",
      policy_id: policy.id, control, outcome: `${route}/${evidence}`,
    }))),
    reclassification: {
      preserved_claim_ids: unique(preservedClaimIds).sort(),
      superseded_claim_ids: unique(supersededClaimIds).sort(),
      reopened_consumers: unique(reopenedConsumers).sort(),
    },
    reclassification_triggers: ["material discovery", "before mutation", "plan revision", "compaction or resume", "source identity change", "failed gate", "permission change", "terminal acceptance"],
    conflicts: unique(conflicts).sort(),
    gaps: unique(missingAuthority).map((item) => `missing authority: ${item}`),
    blockers: conflicts.length ? ["dependent mutation blocked by policy conflict"] : missingAuthority.length ? ["hard action blocked until explicit authority"] : [],
    non_goals: ["admission does not execute work", "admission does not dispatch agents or create worklines"],
    invalidation: ["request meaning", "source identity", "policy bundle", "permission", "scope"],
  };
  validateTaskEnvelope(envelope);
  return envelope;
}

function toolText(input: unknown): string {
  if (typeof input === "string") return input;
  return stableJson(input ?? {});
}

export function classifyToolAction(toolName: string, toolInput: unknown): typeof AUTHORITY[number] {
  const text = toolText(toolInput).toLowerCase();
  const normalizedTool = toolName.toLowerCase();
  if (["apply_patch", "edit", "write"].includes(normalizedTool)) {
    return /\*\*\* delete file:/i.test(text) ? "DESTRUCTIVE" : "LOCAL_WRITE";
  }
  if (/^(mcp__|functions\.)/.test(normalizedTool) && /(?:create|update|delete|send|publish|push|deploy|write|post)/.test(normalizedTool)) return "EXTERNAL_WRITE";
  const shellTools = new Set(["bash", "exec_command", "functions.exec_command", "shell", "terminal.exec"]);
  if (!shellTools.has(normalizedTool)) return "READ_ONLY";
  if (/\brm\s+|\bgit\s+reset\s+--hard\b|\bgit\s+clean\s+-f|\bgit\s+branch\s+-d\b|\bdrop\s+(?:table|database)\b|\bdelete\s+from\b|\bwipe\b|\bdestroy\b/.test(text)) return "DESTRUCTIVE";
  if (/\b(sudo|chmod\s+777|security\s+delete|rotate.+credential)\b/.test(text)) return "PRIVILEGED";
  if (/\bgit\s+push\b|\bcurl\s+[^\n]*(?:-x\s*post\b|--request\s+post\b|-d\s|--data\b|--upload-file\b)|\bgh\s+(?:pr|issue|release)\s+create\b|\bnpm\s+publish\b|\bscp\s+|\brsync\s+[^\n]*:|\bkubectl\s+(?:apply|delete|patch)\b|\bterraform\s+(?:apply|destroy)\b/.test(text)) return "EXTERNAL_WRITE";
  if (/\b(>|tee|sed\s+-i|git\s+commit)\b/.test(text)) return "LOCAL_WRITE";
  return "READ_ONLY";
}

export function evaluateToolAdmission(input: { tool_name: string; tool_input: unknown; envelope?: unknown; now?: Date; permission_mode?: string }): ToolAdmissionDecision {
  const action = classifyToolAction(input.tool_name, input.tool_input);
  if (["READ_ONLY", "LOCAL_WRITE"].includes(action)) return { behavior: "allow", action_class: action, reason: "bounded read/local write remains subject to normal Codex permissions" };
  if (!input.envelope) return { behavior: "deny", action_class: action, reason: `${action.toLowerCase()} action requires a current Task Envelope and explicit authority` };
  try {
    validateTaskEnvelope(input.envelope);
  } catch (error) {
    return { behavior: "deny", action_class: action, reason: error instanceof Error ? error.message : "invalid Task Envelope" };
  }
  const envelope = input.envelope as TaskEnvelope;
  const age = (input.now ?? new Date()).getTime() - Date.parse(envelope.produced_at);
  if (age < 0 || age > 8 * 60 * 60 * 1000) return { behavior: "deny", action_class: action, reason: "Task Envelope is stale for a hard action" };
  const required = action === "DESTRUCTIVE" ? "destructive" : action === "PRIVILEGED" ? "privileged" : "external-write";
  if (!envelope.authority.granted.includes(required) && !envelope.authority.granted.includes("explicit-hard-action-authority")) {
    return { behavior: "deny", action_class: action, reason: `Task Envelope does not grant ${required} authority` };
  }
  if (["plan", "dontAsk", "bypassPermissions"].includes(input.permission_mode ?? "")) {
    return { behavior: "deny", action_class: action, reason: "hard action requires the normal interactive Codex approval boundary" };
  }
  return { behavior: "defer", action_class: action, reason: "admission permits normal Codex approval flow; it does not auto-approve" };
}

export async function reclassifyTaskEnvelope(prior: TaskEnvelope, request: Omit<AdmissionRequest, "prior_envelope">): Promise<TaskEnvelope> {
  validateTaskEnvelope(prior);
  return compileTaskEnvelope({ ...request, prior_envelope: prior });
}

export async function runAdmissionCorpus(): Promise<JsonObject> {
  const source = await readJson<JsonObject>(CORPUS_PATH);
  if (source.schema_version !== 1 || !Array.isArray(source.cases) || source.cases.length < 12) {
    throw new CascadeError("task admission corpus is incomplete");
  }
  const ids = source.cases.map((item: JsonObject) => item.id);
  if (new Set(ids).size !== ids.length) throw new CascadeError("task admission corpus IDs contain duplicates");
  const results: JsonObject[] = [];
  for (const item of source.cases) {
    const envelope = await compileTaskEnvelope({
      request: item.request,
      task_id: item.id,
      authority: item.authority,
      produced_at: "2026-08-04T00:00:00Z",
    });
    const missing = item.required_controls.filter((control: string) => !envelope.control_packs.includes(control as ControlPack));
    const forbidden = item.forbidden_controls.filter((control: string) => envelope.control_packs.includes(control as ControlPack));
    const routeMatch = envelope.route === item.expected_route;
    const blockedMatch = Boolean(envelope.blockers.length) === item.expected_blocked;
    const traceComplete = envelope.control_packs.every((control) =>
      envelope.explanation_trace.some((row: JsonObject) => row.control === control)
    );
    results.push({
      id: item.id,
      criterion: item.criterion,
      status: routeMatch && blockedMatch && !missing.length && !forbidden.length && traceComplete ? "PASS" : "FAIL",
      expected_route: item.expected_route,
      actual_route: envelope.route,
      missing_controls: missing,
      forbidden_controls: forbidden,
      blocked_match: blockedMatch,
      trace_complete: traceComplete,
    });
  }
  const simple = results.filter((item) => ["TA-C001", "TA-C002", "TA-C004"].includes(item.id));
  const highRisk = results.filter((item) => ["TA-C003", "TA-C007", "TA-C011"].includes(item.id));
  const overControl = simple.filter((item) => item.forbidden_controls.length).length;
  const underControl = highRisk.filter((item) => item.status !== "PASS").length;
  const failed = results.filter((item) => item.status !== "PASS").length;
  return {
    schema_version: 1,
    status: failed || overControl || underControl ? "FAIL" : "PASS",
    total: results.length,
    passed: results.length - failed,
    failed,
    over_control: overControl,
    under_control: underControl,
    trace_complete: results.every((item) => item.trace_complete),
    results,
  };
}

function compactExplanation(envelope: TaskEnvelope): string {
  return [
    `Task admission ${envelope.envelope_id} (${envelope.policy_bundle_version})`,
    `route=${envelope.route}`,
    `workload=${Object.values(envelope.workload).join("/")}`,
    `controls=${envelope.control_packs.join(",")}`,
    `authority_missing=${envelope.authority.missing.join(",") || "none"}`,
    "This is advisory context only; it does not grant authority or dispatch work.",
  ].join("; ");
}

export async function main(argv: string[]): Promise<number> {
  const [command, ...rest] = argv;
  const args = parseArgs(rest);
  if (command === "validate") {
    const result = await validateAdmissionRepository();
    console.log(`admission_status=PASS policies=${result.policy_count} controls=${result.control_count} bundle=${ADMISSION_POLICY_BUNDLE}`);
    return 0;
  }
  if (command === "assess" || command === "explain") {
    const file = flag(args, "file");
    const request = file ? await readFile(file, "utf8") : flag(args, "request") ?? args.positionals.join(" ");
    const envelope = await compileTaskEnvelope({
      request,
      task_id: flag(args, "task-id", "adhoc"),
      authority: args.flags.get("authority") ?? [],
      dispatch_authorized: boolFlag(args, "dispatch-authorized"),
      produced_at: flag(args, "produced-at"),
    });
    const output = flag(args, "output");
    if (output) {
      const path = boundedPath(output, ".artifacts/task-admission/");
      await writeJsonAtomic(path, envelope);
      console.log(`admission_envelope_status=WRITTEN envelope=${envelope.envelope_id} path=${output}`);
    } else {
      console.log(command === "explain" ? compactExplanation(envelope) : stableJson(envelope, true));
    }
    return envelope.blockers.length ? 2 : 0;
  }
  if (command === "check-envelope") {
    const file = flag(args, "file") ?? args.positionals[0];
    if (!file) throw new CascadeError("admission check-envelope requires --file PATH");
    validateTaskEnvelope(await readJson(file));
    console.log("admission_envelope_status=PASS");
    return 0;
  }
  if (command === "corpus") {
    const result = await runAdmissionCorpus();
    console.log(stableJson(result, true));
    return result.status === "PASS" ? 0 : 1;
  }
  console.log("Usage: bun scripts/cascade.ts admission <validate|assess|explain|check-envelope|corpus> [--output .artifacts/task-admission/FILE.json]");
  return command ? 1 : 0;
}
