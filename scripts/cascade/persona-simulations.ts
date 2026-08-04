import {
  CascadeError,
  boundedPath,
  isFile,
  readText,
  sha256File,
  stableJson,
  utcNow,
  valueDigest,
} from "./common";

const ID = /^[a-z0-9][a-z0-9.-]+$/;
const PERSONA_ID = /^P-[0-9]{3}$/;
const DIGEST = /^[a-f0-9]{64}$/;

export type PersonaDerivationMode =
  | "representative"
  | "coverage"
  | "stress"
  | "counterfactual";

export interface ProductPersonaReference {
  persona_id: string;
  revision: number;
  path: string;
  sha256: string;
}

export interface PersonaGeneratorIdentity {
  kind: "deterministic-manifest" | "model-backed";
  name: string;
  version: string;
  input_digest: string;
  model?: string;
  prompt_digest?: string;
  tool_digest?: string;
}

export interface PersonaActorDefinition {
  id: string;
  weight: number;
  actor_class: "representative" | "variant" | "edge" | "counterfactual";
  persona_ids: string[];
  goals: string[];
  invariants: string[];
  knowledge: { known: string[]; unknown: string[] };
  uncertainty: string[];
  decision_policy: {
    strategy: "goal-directed" | "rule-based" | "scripted" | "exploratory";
    retry_limit: number;
    stop_on_blocked: boolean;
  };
  communication_policy: {
    style: "direct" | "concise" | "detailed" | "ambiguous" | "adversarial";
    clarification: "ask" | "infer-within-evidence" | "abstain";
  };
  state_memory: {
    scope: "turn" | "scenario" | "session";
    max_facts: number;
  };
  friction_behaviors: string[];
  abstention: {
    when_unsupported: true;
    when_conflicted: boolean;
  };
  slices: string[];
}

export interface PersonaDerivationManifest {
  schema_version: 1;
  id: string;
  simulation_id: string;
  population_id: string;
  mode: PersonaDerivationMode;
  weight_semantics: "estimated-prevalence" | "test-allocation";
  prevalence_evidence?: {
    source_id: string;
    reference_window: string;
    sample_description: string;
    sha256: string;
    reviewed_by: string;
  };
  product_personas: ProductPersonaReference[];
  dimensions: Array<{
    id: string;
    description: string;
    source_persona_ids: string[];
    confidence: "low" | "medium" | "high";
    uncertainty: string;
    permitted_variation: boolean;
  }>;
  invariants: string[];
  mutation_axes: Array<{ id: string; values: string[]; rationale: string }>;
  actors: PersonaActorDefinition[];
  generator: PersonaGeneratorIdentity;
  evidence_sources: Array<{
    id: string;
    kind:
      | "research"
      | "feedback"
      | "behavioral-data"
      | "expert-review"
      | "product-spec"
      | "framework-fixture";
    reference: string;
    sha256?: string;
    minimized: true;
    source_authority: string;
    reference_window: string;
    usage_rights:
      | "fixture"
      | "internal-research"
      | "public"
      | "licensed"
      | "consented";
    sensitivity: "none" | "low" | "restricted";
    retention_policy: {
      mode: "source-controlled" | "manual-review" | "retain-until";
      deletion_owner: string;
      expires_at: string | null;
    };
    permitted_purpose: string;
    prohibited_uses: string[];
    operator_attestation: {
      identity: string;
      attested_at: string;
      encryption_at_rest_confirmed: true;
      access_scope_confirmed: true;
    } | null;
  }>;
  review: {
    status: "draft" | "reviewed" | "approved" | "superseded";
    reviewer_identity: string | null;
    reviewed_at: string | null;
  };
}

export interface PersonaDerivedPopulation {
  schema_version: 2;
  id: string;
  mode: PersonaDerivationMode;
  weight_semantics: "estimated-prevalence" | "test-allocation";
  source: {
    kind: "persona-derived";
    description: string;
    derivation: { id: string; path: string; sha256: string };
    product_personas: ProductPersonaReference[];
    generator: PersonaGeneratorIdentity;
    minimized: true;
  };
  actors: PersonaActorDefinition[];
}

export type RefinementProposalType =
  | "missing-dimension"
  | "stale-assumption"
  | "contradiction"
  | "journey-gap"
  | "scenario-gap"
  | "requirement-gap"
  | "accessibility-gap"
  | "permission-gap"
  | "simulator-defect"
  | "research-question";

export interface RefinementProposalCandidate {
  proposal_id: string;
  persona_id: string;
  derivation_id: string;
  proposal_type: RefinementProposalType;
  target_field: string;
  summary: string;
  rationale: string;
  recommended_change: string;
  evidence_paths: string[];
  confidence: "low" | "medium" | "high";
  disposition_route:
    | "collect-external-evidence"
    | "repair-simulator"
    | "synthesis-to-spec";
}

export interface PersonaRefinementProposal {
  schema_version: 1;
  proposal_id: string;
  run_id: string;
  campaign_id: string;
  evaluation_id: string;
  persona: ProductPersonaReference;
  derivation: { id: string; path: string; sha256: string };
  proposal_type: RefinementProposalType;
  target_field: string;
  summary: string;
  rationale: string;
  recommended_change: string;
  evidence_paths: string[];
  confidence: "low" | "medium" | "high";
  disposition_route: RefinementProposalCandidate["disposition_route"];
  external_evidence_required: true;
  human_review_required: true;
  direct_persona_mutation_allowed: false;
  status: "PROPOSED";
  proposed_by: string;
  created_at: string;
  promotion_blockers: string[];
}

export interface ExternalPersonaEvidenceManifest {
  schema_version: 1;
  id: string;
  kind: "research" | "feedback" | "behavioral-data" | "expert-review" | "product-spec";
  reference: string;
  evidence_sha256: string;
  source_authority: string;
  reference_window: string;
  usage_rights: "internal-research" | "public" | "licensed" | "consented";
  sensitivity: "none" | "low" | "restricted";
  retention_policy: {
    mode: "manual-review" | "retain-until";
    deletion_owner: string;
    expires_at: string | null;
  };
  permitted_purpose: string;
  prohibited_uses: string[];
  reviewed_by: string;
  reviewed_at: string;
}

export type RefinementDispositionDecision =
  | "ACCEPTED"
  | "REJECTED"
  | "NEEDS_EVIDENCE"
  | "SIMULATOR_REPAIR";

export interface PersonaRefinementDisposition {
  schema_version: 1;
  disposition_id: string;
  proposal: { proposal_id: string; path: string; sha256: string };
  persona: ProductPersonaReference;
  derivation: { id: string; path: string; sha256: string };
  decision: RefinementDispositionDecision;
  reviewer_identity: string;
  reviewed_at: string;
  external_evidence: Array<{
    evidence_id: string;
    manifest_path: string;
    manifest_sha256: string;
    evidence_sha256: string;
  }>;
  persona_revision_authorized: boolean;
  direct_persona_mutation_allowed: false;
  next_route: "synthesis-to-spec" | "collect-external-evidence" | "repair-simulator" | "none";
  status: "REVIEWED";
  blockers: string[];
}

export function refinementProposalCandidateDigest(
  proposal: PersonaRefinementProposal,
): string {
  return valueDigest({
    proposal_id: proposal.proposal_id,
    persona_id: proposal.persona.persona_id,
    derivation_id: proposal.derivation.id,
    proposal_type: proposal.proposal_type,
    target_field: proposal.target_field,
    summary: proposal.summary,
    rationale: proposal.rationale,
    recommended_change: proposal.recommended_change,
    evidence_paths: proposal.evidence_paths,
    confidence: proposal.confidence,
    disposition_route: proposal.disposition_route,
  } satisfies RefinementProposalCandidate);
}

function objectValue(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new CascadeError(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function exactKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
  label: string,
): void {
  const unknown = Object.keys(value).filter((key) => !allowed.includes(key));
  if (unknown.length) {
    throw new CascadeError(`${label} has unknown fields: ${unknown.sort().join(", ")}`);
  }
}

function requiredString(
  value: Record<string, unknown>,
  key: string,
  label: string,
): string {
  const item = value[key];
  if (typeof item !== "string" || !item.trim()) {
    throw new CascadeError(`${label}.${key} must be a non-empty string`);
  }
  return item;
}

function stringArray(
  value: Record<string, unknown>,
  key: string,
  label: string,
  options: { empty?: boolean } = {},
): string[] {
  const items = value[key];
  if (!Array.isArray(items) || (!options.empty && items.length === 0)) {
    throw new CascadeError(`${label}.${key} must be a${options.empty ? "" : " non-empty"} array`);
  }
  if (items.some((item) => typeof item !== "string" || !item.trim())) {
    throw new CascadeError(`${label}.${key} entries must be non-empty strings`);
  }
  if (new Set(items).size !== items.length) {
    throw new CascadeError(`${label}.${key} contains duplicates`);
  }
  return items as string[];
}

function objectArray(
  value: Record<string, unknown>,
  key: string,
  label: string,
  options: { empty?: boolean } = {},
): Record<string, unknown>[] {
  const items = value[key];
  if (!Array.isArray(items) || (!options.empty && items.length === 0)) {
    throw new CascadeError(`${label}.${key} must be a${options.empty ? "" : " non-empty"} array`);
  }
  return items.map((item, index) => objectValue(item, `${label}.${key}[${index}]`));
}

function assertId(value: string, label: string, pattern = ID): void {
  if (!pattern.test(value)) throw new CascadeError(`${label} is invalid: ${value}`);
}

function assertDigest(value: string, label: string): void {
  if (!DIGEST.test(value)) throw new CascadeError(`${label} must be a sha256 digest`);
}

function assertSafeRelativePath(
  value: string,
  label: string,
  allowed: RegExp,
): void {
  if (
    !allowed.test(value) ||
    value.startsWith("/") ||
    value.split("/").some((part) => !part || part === "." || part === "..")
  ) {
    throw new CascadeError(`${label} is outside its allowed relative root`);
  }
}

function assertEnum(value: string, allowed: readonly string[], label: string): void {
  if (!allowed.includes(value)) throw new CascadeError(`${label} is invalid: ${value}`);
}

function uniqueIds(items: Array<{ id: string }>, label: string): void {
  const ids = items.map((item) => item.id);
  if (new Set(ids).size !== ids.length) {
    throw new CascadeError(`${label} contains duplicate IDs`);
  }
}

function validatePersonaReference(
  value: Record<string, unknown>,
  label: string,
): ProductPersonaReference {
  exactKeys(value, ["persona_id", "revision", "path", "sha256"], label);
  const personaId = requiredString(value, "persona_id", label);
  assertId(personaId, `${label}.persona_id`, PERSONA_ID);
  if (!Number.isInteger(value.revision) || (value.revision as number) < 1) {
    throw new CascadeError(`${label}.revision must be a positive integer`);
  }
  const path = requiredString(value, "path", label);
  if (!/^docs\/product\/personas\/.+\.md$/.test(path)) {
    throw new CascadeError(`${label}.path must be under docs/product/personas/`);
  }
  const digest = requiredString(value, "sha256", label);
  assertDigest(digest, `${label}.sha256`);
  return {
    persona_id: personaId,
    revision: value.revision as number,
    path,
    sha256: digest,
  };
}

function validateGenerator(
  value: Record<string, unknown>,
  label: string,
): PersonaGeneratorIdentity {
  exactKeys(
    value,
    ["kind", "name", "version", "input_digest", "model", "prompt_digest", "tool_digest"],
    label,
  );
  const kind = requiredString(value, "kind", label);
  assertEnum(kind, ["deterministic-manifest", "model-backed"], `${label}.kind`);
  const inputDigest = requiredString(value, "input_digest", label);
  assertDigest(inputDigest, `${label}.input_digest`);
  const generator: PersonaGeneratorIdentity = {
    kind: kind as PersonaGeneratorIdentity["kind"],
    name: requiredString(value, "name", label),
    version: requiredString(value, "version", label),
    input_digest: inputDigest,
  };
  for (const key of ["model", "prompt_digest", "tool_digest"] as const) {
    if (value[key] !== undefined) generator[key] = requiredString(value, key, label);
  }
  if (kind === "model-backed") {
    for (const key of ["model", "prompt_digest", "tool_digest"] as const) {
      if (!generator[key]) throw new CascadeError(`${label}.${key} is required for model-backed generation`);
    }
  } else if (generator.model || generator.prompt_digest || generator.tool_digest) {
    throw new CascadeError(`${label} deterministic generation must not declare model fields`);
  }
  for (const key of ["prompt_digest", "tool_digest"] as const) {
    if (generator[key]) assertDigest(generator[key]!, `${label}.${key}`);
  }
  return generator;
}

function validateActor(
  value: Record<string, unknown>,
  label: string,
): PersonaActorDefinition {
  exactKeys(
    value,
    [
      "id", "weight", "actor_class", "persona_ids", "goals", "invariants",
      "knowledge", "uncertainty", "decision_policy", "communication_policy",
      "state_memory", "friction_behaviors", "abstention", "slices",
    ],
    label,
  );
  const id = requiredString(value, "id", label);
  assertId(id, `${label}.id`);
  if (typeof value.weight !== "number" || !Number.isFinite(value.weight) || value.weight <= 0) {
    throw new CascadeError(`${label}.weight must be positive`);
  }
  const actorClass = requiredString(value, "actor_class", label);
  assertEnum(actorClass, ["representative", "variant", "edge", "counterfactual"], `${label}.actor_class`);
  const personaIds = stringArray(value, "persona_ids", label);
  personaIds.forEach((item) => assertId(item, `${label}.persona_ids`, PERSONA_ID));
  const knowledge = objectValue(value.knowledge, `${label}.knowledge`);
  exactKeys(knowledge, ["known", "unknown"], `${label}.knowledge`);
  const decisionPolicy = objectValue(value.decision_policy, `${label}.decision_policy`);
  exactKeys(decisionPolicy, ["strategy", "retry_limit", "stop_on_blocked"], `${label}.decision_policy`);
  const strategy = requiredString(decisionPolicy, "strategy", `${label}.decision_policy`);
  assertEnum(strategy, ["goal-directed", "rule-based", "scripted", "exploratory"], `${label}.decision_policy.strategy`);
  if (!Number.isInteger(decisionPolicy.retry_limit) || (decisionPolicy.retry_limit as number) < 0 || (decisionPolicy.retry_limit as number) > 10) {
    throw new CascadeError(`${label}.decision_policy.retry_limit must be an integer from 0 to 10`);
  }
  if (typeof decisionPolicy.stop_on_blocked !== "boolean") {
    throw new CascadeError(`${label}.decision_policy.stop_on_blocked must be boolean`);
  }
  const communicationPolicy = objectValue(value.communication_policy, `${label}.communication_policy`);
  exactKeys(communicationPolicy, ["style", "clarification"], `${label}.communication_policy`);
  const style = requiredString(communicationPolicy, "style", `${label}.communication_policy`);
  assertEnum(style, ["direct", "concise", "detailed", "ambiguous", "adversarial"], `${label}.communication_policy.style`);
  const clarification = requiredString(communicationPolicy, "clarification", `${label}.communication_policy`);
  assertEnum(clarification, ["ask", "infer-within-evidence", "abstain"], `${label}.communication_policy.clarification`);
  const stateMemory = objectValue(value.state_memory, `${label}.state_memory`);
  exactKeys(stateMemory, ["scope", "max_facts"], `${label}.state_memory`);
  const scope = requiredString(stateMemory, "scope", `${label}.state_memory`);
  assertEnum(scope, ["turn", "scenario", "session"], `${label}.state_memory.scope`);
  if (!Number.isInteger(stateMemory.max_facts) || (stateMemory.max_facts as number) < 0 || (stateMemory.max_facts as number) > 100) {
    throw new CascadeError(`${label}.state_memory.max_facts must be an integer from 0 to 100`);
  }
  const abstention = objectValue(value.abstention, `${label}.abstention`);
  exactKeys(abstention, ["when_unsupported", "when_conflicted"], `${label}.abstention`);
  if (abstention.when_unsupported !== true || typeof abstention.when_conflicted !== "boolean") {
    throw new CascadeError(`${label}.abstention must fail closed on unsupported behavior and declare conflict handling`);
  }
  return {
    id,
    weight: value.weight,
    actor_class: actorClass as PersonaActorDefinition["actor_class"],
    persona_ids: personaIds,
    goals: stringArray(value, "goals", label),
    invariants: stringArray(value, "invariants", label),
    knowledge: {
      known: stringArray(knowledge, "known", `${label}.knowledge`, { empty: true }),
      unknown: stringArray(knowledge, "unknown", `${label}.knowledge`, { empty: true }),
    },
    uncertainty: stringArray(value, "uncertainty", label, { empty: true }),
    decision_policy: {
      strategy: strategy as PersonaActorDefinition["decision_policy"]["strategy"],
      retry_limit: decisionPolicy.retry_limit as number,
      stop_on_blocked: decisionPolicy.stop_on_blocked as boolean,
    },
    communication_policy: {
      style: style as PersonaActorDefinition["communication_policy"]["style"],
      clarification: clarification as PersonaActorDefinition["communication_policy"]["clarification"],
    },
    state_memory: {
      scope: scope as PersonaActorDefinition["state_memory"]["scope"],
      max_facts: stateMemory.max_facts as number,
    },
    friction_behaviors: stringArray(value, "friction_behaviors", label, { empty: true }),
    abstention: {
      when_unsupported: true,
      when_conflicted: abstention.when_conflicted as boolean,
    },
    slices: stringArray(value, "slices", label),
  };
}

export function validatePersonaDerivation(
  value: Record<string, unknown>,
  label: string,
): void {
  exactKeys(
    value,
    [
      "schema_version", "id", "simulation_id", "population_id", "mode",
      "weight_semantics", "prevalence_evidence",
      "product_personas", "dimensions", "invariants", "mutation_axes", "actors",
      "generator", "evidence_sources", "review",
    ],
    label,
  );
  if (value.schema_version !== 1) throw new CascadeError(`${label}.schema_version must be 1`);
  const id = requiredString(value, "id", label);
  assertId(id, `${label}.id`);
  assertId(requiredString(value, "simulation_id", label), `${label}.simulation_id`);
  assertId(requiredString(value, "population_id", label), `${label}.population_id`);
  const mode = requiredString(value, "mode", label);
  assertEnum(mode, ["representative", "coverage", "stress", "counterfactual"], `${label}.mode`);
  const weightSemantics = requiredString(value, "weight_semantics", label);
  assertEnum(
    weightSemantics,
    ["estimated-prevalence", "test-allocation"],
    `${label}.weight_semantics`,
  );
  if (mode !== "representative" && weightSemantics !== "test-allocation") {
    throw new CascadeError(
      `${label} non-representative weights must use test-allocation semantics`,
    );
  }

  const personas = objectArray(value, "product_personas", label).map((item, index) =>
    validatePersonaReference(item, `${label}.product_personas[${index}]`),
  );
  if (new Set(personas.map((item) => item.persona_id)).size !== personas.length) {
    throw new CascadeError(`${label}.product_personas contains duplicate persona IDs`);
  }
  const personaIds = new Set(personas.map((item) => item.persona_id));

  const dimensions = objectArray(value, "dimensions", label).map((item, index) => {
    const itemLabel = `${label}.dimensions[${index}]`;
    exactKeys(item, ["id", "description", "source_persona_ids", "confidence", "uncertainty", "permitted_variation"], itemLabel);
    const dimensionId = requiredString(item, "id", itemLabel);
    assertId(dimensionId, `${itemLabel}.id`);
    const sourcePersonaIds = stringArray(item, "source_persona_ids", itemLabel);
    for (const personaId of sourcePersonaIds) {
      if (!personaIds.has(personaId)) throw new CascadeError(`${itemLabel} references unknown persona: ${personaId}`);
    }
    const confidence = requiredString(item, "confidence", itemLabel);
    assertEnum(confidence, ["low", "medium", "high"], `${itemLabel}.confidence`);
    if (typeof item.permitted_variation !== "boolean") {
      throw new CascadeError(`${itemLabel}.permitted_variation must be boolean`);
    }
    return { id: dimensionId };
  });
  uniqueIds(dimensions, `${label}.dimensions`);
  stringArray(value, "invariants", label);

  const axes = objectArray(value, "mutation_axes", label, { empty: true }).map((item, index) => {
    const itemLabel = `${label}.mutation_axes[${index}]`;
    exactKeys(item, ["id", "values", "rationale"], itemLabel);
    const axisId = requiredString(item, "id", itemLabel);
    assertId(axisId, `${itemLabel}.id`);
    if (stringArray(item, "values", itemLabel).length < 2) {
      throw new CascadeError(`${itemLabel}.values must contain at least two entries`);
    }
    requiredString(item, "rationale", itemLabel);
    return { id: axisId };
  });
  uniqueIds(axes, `${label}.mutation_axes`);

  const actors = objectArray(value, "actors", label).map((item, index) =>
    validateActor(item, `${label}.actors[${index}]`),
  );
  uniqueIds(actors, `${label}.actors`);
  const totalWeight = actors.reduce((sum, actor) => sum + actor.weight, 0);
  if (Math.abs(totalWeight - 1) > 1e-9) {
    throw new CascadeError(`${label}.actors weights must sum to 1`);
  }
  for (const actor of actors) {
    for (const personaId of actor.persona_ids) {
      if (!personaIds.has(personaId)) throw new CascadeError(`${actor.id} references unknown persona: ${personaId}`);
    }
  }
  const requiredClass = mode === "counterfactual" ? "counterfactual" : mode === "stress" ? "edge" : mode === "representative" ? "representative" : null;
  if (requiredClass && !actors.some((actor) => actor.actor_class === requiredClass)) {
    throw new CascadeError(`${label}.${mode} mode requires a ${requiredClass} actor`);
  }

  const generator = validateGenerator(
    objectValue(value.generator, `${label}.generator`),
    `${label}.generator`,
  );
  const evidence = objectArray(value, "evidence_sources", label).map((item, index) => {
    const itemLabel = `${label}.evidence_sources[${index}]`;
    exactKeys(item, [
      "id", "kind", "reference", "sha256", "minimized", "source_authority",
      "reference_window", "usage_rights", "sensitivity", "retention_policy",
      "permitted_purpose", "prohibited_uses", "operator_attestation",
    ], itemLabel);
    const evidenceId = requiredString(item, "id", itemLabel);
    assertId(evidenceId, `${itemLabel}.id`);
    const kind = requiredString(item, "kind", itemLabel);
    assertEnum(kind, ["research", "feedback", "behavioral-data", "expert-review", "product-spec", "framework-fixture"], `${itemLabel}.kind`);
    requiredString(item, "reference", itemLabel);
    if (item.sha256 !== undefined) assertDigest(requiredString(item, "sha256", itemLabel), `${itemLabel}.sha256`);
    if (kind !== "framework-fixture" && item.sha256 === undefined) {
      throw new CascadeError(`${itemLabel}.sha256 is required for non-fixture evidence`);
    }
    if (item.minimized !== true) throw new CascadeError(`${itemLabel}.minimized must be true`);
    requiredString(item, "source_authority", itemLabel);
    requiredString(item, "reference_window", itemLabel);
    const usageRights = requiredString(item, "usage_rights", itemLabel);
    assertEnum(usageRights, ["fixture", "internal-research", "public", "licensed", "consented"], `${itemLabel}.usage_rights`);
    if ((kind === "framework-fixture") !== (usageRights === "fixture")) {
      throw new CascadeError(`${itemLabel}.usage_rights fixture is reserved for framework fixtures`);
    }
    const sensitivity = requiredString(item, "sensitivity", itemLabel);
    assertEnum(sensitivity, ["none", "low", "restricted"], `${itemLabel}.sensitivity`);
    const retention = objectValue(item.retention_policy, `${itemLabel}.retention_policy`);
    exactKeys(retention, ["mode", "deletion_owner", "expires_at"], `${itemLabel}.retention_policy`);
    const retentionMode = requiredString(retention, "mode", `${itemLabel}.retention_policy`);
    assertEnum(retentionMode, ["source-controlled", "manual-review", "retain-until"], `${itemLabel}.retention_policy.mode`);
    requiredString(retention, "deletion_owner", `${itemLabel}.retention_policy`);
    if (retention.expires_at !== null && (typeof retention.expires_at !== "string" || Number.isNaN(Date.parse(retention.expires_at)))) {
      throw new CascadeError(`${itemLabel}.retention_policy.expires_at must be an ISO timestamp or null`);
    }
    if (retentionMode === "retain-until" && retention.expires_at === null) {
      throw new CascadeError(`${itemLabel}.retention_policy retain-until requires expires_at`);
    }
    requiredString(item, "permitted_purpose", itemLabel);
    stringArray(item, "prohibited_uses", itemLabel);
    if (item.operator_attestation !== null) {
      const attestation = objectValue(item.operator_attestation, `${itemLabel}.operator_attestation`);
      exactKeys(attestation, ["identity", "attested_at", "encryption_at_rest_confirmed", "access_scope_confirmed"], `${itemLabel}.operator_attestation`);
      requiredString(attestation, "identity", `${itemLabel}.operator_attestation`);
      const attestedAt = requiredString(attestation, "attested_at", `${itemLabel}.operator_attestation`);
      if (Number.isNaN(Date.parse(attestedAt))) throw new CascadeError(`${itemLabel}.operator_attestation.attested_at must be an ISO timestamp`);
      if (attestation.encryption_at_rest_confirmed !== true || attestation.access_scope_confirmed !== true) {
        throw new CascadeError(`${itemLabel}.operator_attestation must confirm encryption and access scope`);
      }
    } else if (sensitivity === "restricted") {
      throw new CascadeError(`${itemLabel}.operator_attestation is required for restricted evidence`);
    }
    return {
      id: evidenceId,
      kind: kind as PersonaDerivationManifest["evidence_sources"][number]["kind"],
      sha256: item.sha256 as string | undefined,
    };
  });
  uniqueIds(evidence, `${label}.evidence_sources`);

  if (weightSemantics === "estimated-prevalence") {
    if (mode !== "representative") {
      throw new CascadeError(
        `${label} estimated-prevalence weights require representative mode`,
      );
    }
    const prevalence = objectValue(
      value.prevalence_evidence,
      `${label}.prevalence_evidence`,
    );
    exactKeys(
      prevalence,
      ["source_id", "reference_window", "sample_description", "sha256", "reviewed_by"],
      `${label}.prevalence_evidence`,
    );
    const sourceId = requiredString(
      prevalence,
      "source_id",
      `${label}.prevalence_evidence`,
    );
    const source = evidence.find((item) => item.id === sourceId);
    if (
      !source ||
      !["research", "behavioral-data"].includes(source.kind) ||
      !source.sha256
    ) {
      throw new CascadeError(
        `${label}.prevalence_evidence must bind digest-backed research or behavioral-data`,
      );
    }
    const digest = requiredString(
      prevalence,
      "sha256",
      `${label}.prevalence_evidence`,
    );
    assertDigest(digest, `${label}.prevalence_evidence.sha256`);
    if (digest !== source.sha256) {
      throw new CascadeError(
        `${label}.prevalence_evidence digest does not match its evidence source`,
      );
    }
    for (const key of ["reference_window", "sample_description", "reviewed_by"] as const) {
      requiredString(prevalence, key, `${label}.prevalence_evidence`);
    }
  } else if (value.prevalence_evidence !== undefined) {
    throw new CascadeError(
      `${label}.prevalence_evidence is only allowed for estimated-prevalence weights`,
    );
  }

  const review = objectValue(value.review, `${label}.review`);
  exactKeys(review, ["status", "reviewer_identity", "reviewed_at"], `${label}.review`);
  const status = requiredString(review, "status", `${label}.review`);
  assertEnum(status, ["draft", "reviewed", "approved", "superseded"], `${label}.review.status`);
  if (review.reviewer_identity !== null && typeof review.reviewer_identity !== "string") {
    throw new CascadeError(`${label}.review.reviewer_identity must be string or null`);
  }
  if (review.reviewed_at !== null && (typeof review.reviewed_at !== "string" || Number.isNaN(Date.parse(review.reviewed_at)))) {
    throw new CascadeError(`${label}.review.reviewed_at must be an ISO timestamp or null`);
  }
  if (status === "approved" && (!review.reviewer_identity || !review.reviewed_at)) {
    throw new CascadeError(`${label}.review approved status requires reviewer identity and time`);
  }
  const expectedInputDigest = personaGeneratorInputDigest(value);
  if (generator.input_digest !== expectedInputDigest) {
    throw new CascadeError(
      `${label}.generator.input_digest is stale; expected ${expectedInputDigest}`,
    );
  }
}

export function personaGeneratorInputDigest(
  value: PersonaDerivationManifest | Record<string, unknown>,
): string {
  const input = structuredClone(value) as unknown as Record<string, unknown>;
  const generator = objectValue(input.generator, "persona derivation generator");
  delete generator.input_digest;
  return valueDigest(input);
}

export function validateProductPersonaSourceMetadata(
  source: string,
  persona: ProductPersonaReference,
  label: string,
): void {
  const id = source.match(/^ID:\s*(P-[0-9]{3})\s*$/m)?.[1];
  const revision = Number(source.match(/^Revision:\s*(\d+)\s*$/m)?.[1]);
  const status = source.match(
    /^Status:\s*`?(draft|reviewed|approved|superseded)`?\s*$/m,
  )?.[1];
  if (id !== persona.persona_id || revision !== persona.revision) {
    throw new CascadeError(`${label} persona metadata mismatch: ${persona.persona_id}`);
  }
  if (!status) {
    throw new CascadeError(`${label} persona status is missing or invalid: ${persona.persona_id}`);
  }
  if (!new Set(["reviewed", "approved"]).has(status)) {
    throw new CascadeError(
      `${label} persona must be reviewed or approved: ${persona.persona_id} is ${status}`,
    );
  }
  const requiredSignals: Array<[RegExp, string]> = [
    [/^Reference Window:\s*\S.+$/m, "Reference Window"],
    [/^## Evidence, Confidence, And Uncertainty\s*$/m, "evidence and uncertainty section"],
    [/^## Permitted Uses And Prohibited Claims\s*$/m, "permitted/prohibited use section"],
    [/^- Review owner:\s*\S.+$/m, "review owner"],
    [/Invalidation Signal/, "invalidation signal"],
  ];
  for (const [pattern, field] of requiredSignals) {
    if (!pattern.test(source)) {
      throw new CascadeError(`${label} persona source lacks governed ${field}: ${persona.persona_id}`);
    }
  }
}

export async function verifyPersonaDerivationSources(
  manifest: PersonaDerivationManifest,
  label: string,
): Promise<void> {
  validatePersonaDerivation(manifest as unknown as Record<string, unknown>, label);
  for (const persona of manifest.product_personas) {
    const path = boundedPath(persona.path, "docs/product/personas/");
    if (!(await isFile(path))) throw new CascadeError(`${label} persona source missing: ${persona.path}`);
    const digest = await sha256File(path);
    if (digest !== persona.sha256) throw new CascadeError(`${label} persona digest mismatch: ${persona.persona_id}`);
    const source = await readText(path);
    validateProductPersonaSourceMetadata(source, persona, label);
  }
}

export function derivePopulationFromManifest(
  manifest: PersonaDerivationManifest,
  derivationPath: string,
  derivationDigest: string,
): PersonaDerivedPopulation {
  validatePersonaDerivation(manifest as unknown as Record<string, unknown>, derivationPath);
  assertDigest(derivationDigest, `${derivationPath}.sha256`);
  if (manifest.review.status !== "approved") {
    throw new CascadeError(`${manifest.id} derivation must be approved`);
  }
  if (manifest.generator.kind !== "deterministic-manifest") {
    throw new CascadeError(`${manifest.id} model-backed derivation requires a separately authorized generator path`);
  }
  const population: PersonaDerivedPopulation = {
    schema_version: 2,
    id: manifest.population_id,
    mode: manifest.mode,
    weight_semantics: manifest.weight_semantics,
    source: {
      kind: "persona-derived",
      description: `Derived from approved manifest ${manifest.id}; synthetic evidence remains proposal-only.`,
      derivation: { id: manifest.id, path: derivationPath, sha256: derivationDigest },
      product_personas: structuredClone(manifest.product_personas),
      generator: structuredClone(manifest.generator),
      minimized: true,
    },
    actors: structuredClone(manifest.actors),
  };
  validatePersonaDerivedPopulation(population as unknown as Record<string, unknown>, manifest.population_id);
  return population;
}

export function validatePersonaDerivedPopulation(
  value: Record<string, unknown>,
  label: string,
): void {
  exactKeys(value, ["schema_version", "id", "mode", "weight_semantics", "source", "actors"], label);
  if (value.schema_version !== 2) throw new CascadeError(`${label}.schema_version must be 2`);
  const id = requiredString(value, "id", label);
  assertId(id, `${label}.id`);
  const mode = requiredString(value, "mode", label);
  assertEnum(mode, ["representative", "coverage", "stress", "counterfactual"], `${label}.mode`);
  const weightSemantics = requiredString(value, "weight_semantics", label);
  assertEnum(weightSemantics, ["estimated-prevalence", "test-allocation"], `${label}.weight_semantics`);
  if (mode !== "representative" && weightSemantics !== "test-allocation") {
    throw new CascadeError(`${label} non-representative weights must use test-allocation semantics`);
  }
  const source = objectValue(value.source, `${label}.source`);
  exactKeys(source, ["kind", "description", "derivation", "product_personas", "generator", "minimized"], `${label}.source`);
  if (source.kind !== "persona-derived") throw new CascadeError(`${label}.source.kind must be persona-derived`);
  requiredString(source, "description", `${label}.source`);
  if (source.minimized !== true) throw new CascadeError(`${label}.source.minimized must be true`);
  const derivation = objectValue(source.derivation, `${label}.source.derivation`);
  exactKeys(derivation, ["id", "path", "sha256"], `${label}.source.derivation`);
  assertId(requiredString(derivation, "id", `${label}.source.derivation`), `${label}.source.derivation.id`);
  const derivationPath = requiredString(derivation, "path", `${label}.source.derivation`);
  if (
    !/^product-evals\/simulations\/(harness|product)\/.+\/derivations\/.+\.json$/.test(
      derivationPath,
    )
  ) {
    throw new CascadeError(`${label}.source.derivation.path is invalid`);
  }
  assertDigest(requiredString(derivation, "sha256", `${label}.source.derivation`), `${label}.source.derivation.sha256`);
  const personas = objectArray(source, "product_personas", `${label}.source`).map((item, index) =>
    validatePersonaReference(item, `${label}.source.product_personas[${index}]`),
  );
  if (new Set(personas.map((item) => item.persona_id)).size !== personas.length) {
    throw new CascadeError(`${label}.source.product_personas contains duplicate persona IDs`);
  }
  validateGenerator(objectValue(source.generator, `${label}.source.generator`), `${label}.source.generator`);
  const actors = objectArray(value, "actors", label).map((item, index) => validateActor(item, `${label}.actors[${index}]`));
  uniqueIds(actors, `${label}.actors`);
  const personaIds = new Set(personas.map((item) => item.persona_id));
  for (const actor of actors) {
    for (const personaId of actor.persona_ids) {
      if (!personaIds.has(personaId)) throw new CascadeError(`${actor.id} references unknown persona: ${personaId}`);
    }
  }
  if (Math.abs(actors.reduce((sum, actor) => sum + actor.weight, 0) - 1) > 1e-9) {
    throw new CascadeError(`${label}.actors weights must sum to 1`);
  }
}

export function validateRefinementProposalCandidate(
  value: Record<string, unknown>,
  label: string,
): RefinementProposalCandidate {
  exactKeys(value, ["proposal_id", "persona_id", "derivation_id", "proposal_type", "target_field", "summary", "rationale", "recommended_change", "evidence_paths", "confidence", "disposition_route"], label);
  const proposalId = requiredString(value, "proposal_id", label);
  assertId(proposalId, `${label}.proposal_id`);
  const personaId = requiredString(value, "persona_id", label);
  assertId(personaId, `${label}.persona_id`, PERSONA_ID);
  const derivationId = requiredString(value, "derivation_id", label);
  assertId(derivationId, `${label}.derivation_id`);
  const proposalType = requiredString(value, "proposal_type", label);
  assertEnum(proposalType, ["missing-dimension", "stale-assumption", "contradiction", "journey-gap", "scenario-gap", "requirement-gap", "accessibility-gap", "permission-gap", "simulator-defect", "research-question"], `${label}.proposal_type`);
  const confidence = requiredString(value, "confidence", label);
  assertEnum(confidence, ["low", "medium", "high"], `${label}.confidence`);
  const dispositionRoute = requiredString(value, "disposition_route", label);
  assertEnum(dispositionRoute, ["collect-external-evidence", "repair-simulator", "synthesis-to-spec"], `${label}.disposition_route`);
  const evidencePaths = stringArray(value, "evidence_paths", label);
  if (
    evidencePaths.some(
      (path) =>
        path.startsWith("/") ||
        path.split("/").some((part) => !part || part === "." || part === ".."),
    )
  ) {
    throw new CascadeError(`${label}.evidence_paths must stay inside the frozen evaluation packet`);
  }
  return {
    proposal_id: proposalId,
    persona_id: personaId,
    derivation_id: derivationId,
    proposal_type: proposalType as RefinementProposalType,
    target_field: requiredString(value, "target_field", label),
    summary: requiredString(value, "summary", label),
    rationale: requiredString(value, "rationale", label),
    recommended_change: requiredString(value, "recommended_change", label),
    evidence_paths: evidencePaths,
    confidence: confidence as RefinementProposalCandidate["confidence"],
    disposition_route: dispositionRoute as RefinementProposalCandidate["disposition_route"],
  };
}

export function materializeRefinementProposal(
  candidate: RefinementProposalCandidate,
  binding: {
    runId: string;
    campaignId: string;
    evaluationId: string;
    evaluatorIdentity: string;
    persona: ProductPersonaReference;
    derivation: { id: string; path: string; sha256: string };
    createdAt?: string;
  },
): PersonaRefinementProposal {
  const validated = validateRefinementProposalCandidate(candidate as unknown as Record<string, unknown>, candidate.proposal_id);
  if (validated.persona_id !== binding.persona.persona_id || validated.derivation_id !== binding.derivation.id) {
    throw new CascadeError(`${validated.proposal_id} persona or derivation binding is stale or unknown`);
  }
  const proposal: PersonaRefinementProposal = {
    schema_version: 1,
    proposal_id: validated.proposal_id,
    run_id: binding.runId,
    campaign_id: binding.campaignId,
    evaluation_id: binding.evaluationId,
    persona: structuredClone(binding.persona),
    derivation: structuredClone(binding.derivation),
    proposal_type: validated.proposal_type,
    target_field: validated.target_field,
    summary: validated.summary,
    rationale: validated.rationale,
    recommended_change: validated.recommended_change,
    evidence_paths: validated.evidence_paths,
    confidence: validated.confidence,
    disposition_route: validated.disposition_route,
    external_evidence_required: true,
    human_review_required: true,
    direct_persona_mutation_allowed: false,
    status: "PROPOSED",
    proposed_by: binding.evaluatorIdentity,
    created_at: binding.createdAt ?? utcNow(),
    promotion_blockers: [
      "external evidence has not been reviewed",
      "accountable human persona review has not approved a new revision",
    ],
  };
  validatePersonaRefinementProposal(
    proposal as unknown as Record<string, unknown>,
    proposal.proposal_id,
  );
  return proposal;
}

export function validatePersonaRefinementProposal(
  value: Record<string, unknown>,
  label: string,
): void {
  exactKeys(
    value,
    [
      "schema_version", "proposal_id", "run_id", "campaign_id", "evaluation_id",
      "persona", "derivation", "proposal_type", "target_field", "summary", "rationale",
      "recommended_change", "evidence_paths", "confidence", "disposition_route",
      "external_evidence_required", "human_review_required",
      "direct_persona_mutation_allowed", "status", "proposed_by", "created_at",
      "promotion_blockers",
    ],
    label,
  );
  if (value.schema_version !== 1) throw new CascadeError(`${label}.schema_version must be 1`);
  const proposalId = requiredString(value, "proposal_id", label);
  const persona = validatePersonaReference(
    objectValue(value.persona, `${label}.persona`),
    `${label}.persona`,
  );
  const derivation = objectValue(value.derivation, `${label}.derivation`);
  exactKeys(derivation, ["id", "path", "sha256"], `${label}.derivation`);
  const derivationId = requiredString(derivation, "id", `${label}.derivation`);
  assertId(derivationId, `${label}.derivation.id`);
  const derivationPath = requiredString(derivation, "path", `${label}.derivation`);
  if (
    !/^product-evals\/simulations\/(harness|product)\/.+\/derivations\/.+\.json$/.test(
      derivationPath,
    )
  ) {
    throw new CascadeError(`${label}.derivation.path is invalid`);
  }
  assertDigest(requiredString(derivation, "sha256", `${label}.derivation`), `${label}.derivation.sha256`);
  validateRefinementProposalCandidate(
    {
      proposal_id: proposalId,
      persona_id: persona.persona_id,
      derivation_id: derivationId,
      proposal_type: value.proposal_type,
      target_field: value.target_field,
      summary: value.summary,
      rationale: value.rationale,
      recommended_change: value.recommended_change,
      evidence_paths: value.evidence_paths,
      confidence: value.confidence,
      disposition_route: value.disposition_route,
    },
    label,
  );
  for (const key of ["run_id", "campaign_id", "evaluation_id", "proposed_by"] as const) {
    requiredString(value, key, label);
  }
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(String(value.evaluation_id))) {
    throw new CascadeError(`${label}.evaluation_id is unsafe`);
  }
  const createdAt = requiredString(value, "created_at", label);
  if (Number.isNaN(Date.parse(createdAt))) throw new CascadeError(`${label}.created_at must be an ISO timestamp`);
  if (
    value.external_evidence_required !== true ||
    value.human_review_required !== true ||
    value.direct_persona_mutation_allowed !== false ||
    value.status !== "PROPOSED"
  ) {
    throw new CascadeError(`${label} violates proposal-only promotion controls`);
  }
  if (stringArray(value, "promotion_blockers", label).length < 2) {
    throw new CascadeError(`${label}.promotion_blockers must include external evidence and human review`);
  }
}

export function validateExternalPersonaEvidenceManifest(
  value: Record<string, unknown>,
  label: string,
): ExternalPersonaEvidenceManifest {
  exactKeys(value, [
    "schema_version", "id", "kind", "reference", "evidence_sha256",
    "source_authority", "reference_window", "usage_rights", "sensitivity",
    "retention_policy", "permitted_purpose", "prohibited_uses", "reviewed_by",
    "reviewed_at",
  ], label);
  if (value.schema_version !== 1) throw new CascadeError(`${label}.schema_version must be 1`);
  const id = requiredString(value, "id", label);
  assertId(id, `${label}.id`);
  const kind = requiredString(value, "kind", label);
  assertEnum(kind, ["research", "feedback", "behavioral-data", "expert-review", "product-spec"], `${label}.kind`);
  const evidenceDigest = requiredString(value, "evidence_sha256", label);
  assertDigest(evidenceDigest, `${label}.evidence_sha256`);
  const usageRights = requiredString(value, "usage_rights", label);
  assertEnum(usageRights, ["internal-research", "public", "licensed", "consented"], `${label}.usage_rights`);
  const sensitivity = requiredString(value, "sensitivity", label);
  assertEnum(sensitivity, ["none", "low", "restricted"], `${label}.sensitivity`);
  const retention = objectValue(value.retention_policy, `${label}.retention_policy`);
  exactKeys(retention, ["mode", "deletion_owner", "expires_at"], `${label}.retention_policy`);
  const retentionMode = requiredString(retention, "mode", `${label}.retention_policy`);
  assertEnum(retentionMode, ["manual-review", "retain-until"], `${label}.retention_policy.mode`);
  requiredString(retention, "deletion_owner", `${label}.retention_policy`);
  if (retention.expires_at !== null && (typeof retention.expires_at !== "string" || Number.isNaN(Date.parse(retention.expires_at)))) {
    throw new CascadeError(`${label}.retention_policy.expires_at must be an ISO timestamp or null`);
  }
  if (retentionMode === "retain-until" && retention.expires_at === null) {
    throw new CascadeError(`${label}.retention_policy retain-until requires expires_at`);
  }
  const reviewedAt = requiredString(value, "reviewed_at", label);
  if (Number.isNaN(Date.parse(reviewedAt))) throw new CascadeError(`${label}.reviewed_at must be an ISO timestamp`);
  return {
    schema_version: 1,
    id,
    kind: kind as ExternalPersonaEvidenceManifest["kind"],
    reference: requiredString(value, "reference", label),
    evidence_sha256: evidenceDigest,
    source_authority: requiredString(value, "source_authority", label),
    reference_window: requiredString(value, "reference_window", label),
    usage_rights: usageRights as ExternalPersonaEvidenceManifest["usage_rights"],
    sensitivity: sensitivity as ExternalPersonaEvidenceManifest["sensitivity"],
    retention_policy: {
      mode: retentionMode as ExternalPersonaEvidenceManifest["retention_policy"]["mode"],
      deletion_owner: retention.deletion_owner as string,
      expires_at: retention.expires_at as string | null,
    },
    permitted_purpose: requiredString(value, "permitted_purpose", label),
    prohibited_uses: stringArray(value, "prohibited_uses", label),
    reviewed_by: requiredString(value, "reviewed_by", label),
    reviewed_at: reviewedAt,
  };
}

export function buildPersonaRefinementDisposition(binding: {
  dispositionId: string;
  proposalPath: string;
  proposalDigest: string;
  proposal: PersonaRefinementProposal;
  decision: RefinementDispositionDecision;
  reviewerIdentity: string;
  evidence: Array<{
    path: string;
    digest: string;
    manifest: ExternalPersonaEvidenceManifest;
  }>;
  reviewedAt?: string;
}): PersonaRefinementDisposition {
  assertId(binding.dispositionId, "disposition_id");
  assertDigest(binding.proposalDigest, "proposal.sha256");
  validatePersonaRefinementProposal(
    binding.proposal as unknown as Record<string, unknown>,
    binding.proposalPath,
  );
  if (!/^\.artifacts\/product-evals\/.+\/refinements\/.+\.json$/.test(binding.proposalPath)) {
    throw new CascadeError("refinement proposal must be a frozen product-evals run artifact");
  }
  assertSafeRelativePath(
    binding.proposalPath,
    "proposal.path",
    /^\.artifacts\/product-evals\/.+\/refinements\/.+\.json$/,
  );
  assertEnum(binding.decision, ["ACCEPTED", "REJECTED", "NEEDS_EVIDENCE", "SIMULATOR_REPAIR"], "decision");
  if (!binding.reviewerIdentity.trim()) throw new CascadeError("reviewer identity is required");
  const reviewedAt = binding.reviewedAt ?? utcNow();
  if (Number.isNaN(Date.parse(reviewedAt))) throw new CascadeError("reviewed_at must be an ISO timestamp");
  if (binding.decision === "ACCEPTED") {
    if (binding.proposal.disposition_route !== "synthesis-to-spec") {
      throw new CascadeError("ACCEPTED is only valid for synthesis-to-spec proposals");
    }
    if (binding.evidence.length === 0) {
      throw new CascadeError("ACCEPTED requires reviewed external evidence");
    }
  }
  if (binding.decision === "SIMULATOR_REPAIR" && binding.proposal.disposition_route !== "repair-simulator") {
    throw new CascadeError("SIMULATOR_REPAIR requires a repair-simulator proposal");
  }
  const evidenceIds = new Set<string>();
  const evidence = binding.evidence.map((item, index) => {
    const manifest = validateExternalPersonaEvidenceManifest(
      item.manifest as unknown as Record<string, unknown>,
      `external_evidence[${index}]`,
    );
    if (evidenceIds.has(manifest.id)) throw new CascadeError("external evidence IDs must be unique");
    evidenceIds.add(manifest.id);
    assertSafeRelativePath(
      item.path,
      `external_evidence[${index}].manifest_path`,
      /^(docs\/product\/evidence|\.artifacts\/product-evals\/evidence-manifests)\/.+\.json$/,
    );
    assertDigest(item.digest, `external_evidence[${index}].manifest_sha256`);
    return {
      evidence_id: manifest.id,
      manifest_path: item.path,
      manifest_sha256: item.digest,
      evidence_sha256: manifest.evidence_sha256,
    };
  });
  const authorized = binding.decision === "ACCEPTED";
  const nextRoute = binding.decision === "ACCEPTED"
    ? "synthesis-to-spec"
    : binding.decision === "NEEDS_EVIDENCE"
      ? "collect-external-evidence"
      : binding.decision === "SIMULATOR_REPAIR"
        ? "repair-simulator"
        : "none";
  const disposition: PersonaRefinementDisposition = {
    schema_version: 1,
    disposition_id: binding.dispositionId,
    proposal: {
      proposal_id: binding.proposal.proposal_id,
      path: binding.proposalPath,
      sha256: binding.proposalDigest,
    },
    persona: structuredClone(binding.proposal.persona),
    derivation: structuredClone(binding.proposal.derivation),
    decision: binding.decision,
    reviewer_identity: binding.reviewerIdentity,
    reviewed_at: reviewedAt,
    external_evidence: evidence,
    persona_revision_authorized: authorized,
    direct_persona_mutation_allowed: false,
    next_route: nextRoute,
    status: "REVIEWED",
    blockers: authorized
      ? ["new persona revision must be authored and reviewed through synthesis-to-spec"]
      : ["persona revision is not authorized by this disposition"],
  };
  validatePersonaRefinementDisposition(disposition as unknown as Record<string, unknown>, binding.dispositionId);
  return disposition;
}

export function validatePersonaRefinementDisposition(
  value: Record<string, unknown>,
  label: string,
): void {
  exactKeys(value, [
    "schema_version", "disposition_id", "proposal", "persona", "derivation",
    "decision", "reviewer_identity", "reviewed_at", "external_evidence",
    "persona_revision_authorized", "direct_persona_mutation_allowed", "next_route",
    "status", "blockers",
  ], label);
  if (value.schema_version !== 1) throw new CascadeError(`${label}.schema_version must be 1`);
  assertId(requiredString(value, "disposition_id", label), `${label}.disposition_id`);
  const proposal = objectValue(value.proposal, `${label}.proposal`);
  exactKeys(proposal, ["proposal_id", "path", "sha256"], `${label}.proposal`);
  assertId(requiredString(proposal, "proposal_id", `${label}.proposal`), `${label}.proposal.proposal_id`);
  assertSafeRelativePath(
    requiredString(proposal, "path", `${label}.proposal`),
    `${label}.proposal.path`,
    /^\.artifacts\/product-evals\/.+\/refinements\/.+\.json$/,
  );
  assertDigest(requiredString(proposal, "sha256", `${label}.proposal`), `${label}.proposal.sha256`);
  validatePersonaReference(objectValue(value.persona, `${label}.persona`), `${label}.persona`);
  const derivation = objectValue(value.derivation, `${label}.derivation`);
  exactKeys(derivation, ["id", "path", "sha256"], `${label}.derivation`);
  assertId(requiredString(derivation, "id", `${label}.derivation`), `${label}.derivation.id`);
  if (!/^product-evals\/simulations\/(harness|product)\/.+\/derivations\/.+\.json$/.test(requiredString(derivation, "path", `${label}.derivation`))) {
    throw new CascadeError(`${label}.derivation.path is invalid`);
  }
  assertDigest(requiredString(derivation, "sha256", `${label}.derivation`), `${label}.derivation.sha256`);
  const decision = requiredString(value, "decision", label);
  assertEnum(decision, ["ACCEPTED", "REJECTED", "NEEDS_EVIDENCE", "SIMULATOR_REPAIR"], `${label}.decision`);
  requiredString(value, "reviewer_identity", label);
  const reviewedAt = requiredString(value, "reviewed_at", label);
  if (Number.isNaN(Date.parse(reviewedAt))) throw new CascadeError(`${label}.reviewed_at must be an ISO timestamp`);
  const evidence = objectArray(value, "external_evidence", label, { empty: true });
  for (const [index, item] of evidence.entries()) {
    const itemLabel = `${label}.external_evidence[${index}]`;
    exactKeys(item, ["evidence_id", "manifest_path", "manifest_sha256", "evidence_sha256"], itemLabel);
    assertId(requiredString(item, "evidence_id", itemLabel), `${itemLabel}.evidence_id`);
    assertSafeRelativePath(
      requiredString(item, "manifest_path", itemLabel),
      `${itemLabel}.manifest_path`,
      /^(docs\/product\/evidence|\.artifacts\/product-evals\/evidence-manifests)\/.+\.json$/,
    );
    assertDigest(requiredString(item, "manifest_sha256", itemLabel), `${itemLabel}.manifest_sha256`);
    assertDigest(requiredString(item, "evidence_sha256", itemLabel), `${itemLabel}.evidence_sha256`);
  }
  if (new Set(evidence.map((item) => item.evidence_id)).size !== evidence.length) {
    throw new CascadeError(`${label}.external_evidence contains duplicate IDs`);
  }
  const authorized = decision === "ACCEPTED";
  const expectedRoute = decision === "ACCEPTED" ? "synthesis-to-spec" : decision === "NEEDS_EVIDENCE" ? "collect-external-evidence" : decision === "SIMULATOR_REPAIR" ? "repair-simulator" : "none";
  if (
    value.persona_revision_authorized !== authorized ||
    value.direct_persona_mutation_allowed !== false ||
    value.next_route !== expectedRoute ||
    value.status !== "REVIEWED" ||
    (authorized && evidence.length === 0)
  ) {
    throw new CascadeError(`${label} violates governed refinement disposition controls`);
  }
  stringArray(value, "blockers", label);
}

export function samePersonaReferences(
  left: ProductPersonaReference[],
  right: ProductPersonaReference[],
): boolean {
  return stableJson(left) === stableJson(right);
}
