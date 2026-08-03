import {
  CascadeError,
  boundedPath,
  isFile,
  readText,
  sha256File,
  stableJson,
  utcNow,
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
  decision_policy: Record<string, unknown>;
  communication_policy: Record<string, unknown>;
  state_memory: Record<string, unknown>;
  friction_behaviors: string[];
  abstention: Record<string, unknown>;
  slices: string[];
}

export interface PersonaDerivationManifest {
  schema_version: 1;
  id: string;
  simulation_id: string;
  population_id: string;
  mode: PersonaDerivationMode;
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
    decision_policy: objectValue(value.decision_policy, `${label}.decision_policy`),
    communication_policy: objectValue(value.communication_policy, `${label}.communication_policy`),
    state_memory: objectValue(value.state_memory, `${label}.state_memory`),
    friction_behaviors: stringArray(value, "friction_behaviors", label, { empty: true }),
    abstention: objectValue(value.abstention, `${label}.abstention`),
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

  validateGenerator(objectValue(value.generator, `${label}.generator`), `${label}.generator`);
  const evidence = objectArray(value, "evidence_sources", label).map((item, index) => {
    const itemLabel = `${label}.evidence_sources[${index}]`;
    exactKeys(item, ["id", "kind", "reference", "sha256", "minimized"], itemLabel);
    const evidenceId = requiredString(item, "id", itemLabel);
    assertId(evidenceId, `${itemLabel}.id`);
    assertEnum(requiredString(item, "kind", itemLabel), ["research", "feedback", "behavioral-data", "expert-review", "product-spec", "framework-fixture"], `${itemLabel}.kind`);
    requiredString(item, "reference", itemLabel);
    if (item.sha256 !== undefined) assertDigest(requiredString(item, "sha256", itemLabel), `${itemLabel}.sha256`);
    if (item.minimized !== true) throw new CascadeError(`${itemLabel}.minimized must be true`);
    return { id: evidenceId };
  });
  uniqueIds(evidence, `${label}.evidence_sources`);

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
    const id = source.match(/^ID:\s*(P-[0-9]{3})\s*$/m)?.[1];
    const revision = Number(source.match(/^Revision:\s*(\d+)\s*$/m)?.[1]);
    if (id !== persona.persona_id || revision !== persona.revision) {
      throw new CascadeError(`${label} persona metadata mismatch: ${persona.persona_id}`);
    }
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
    throw new CascadeError(`${manifest.id} model-backed derivation is not allowed by the dry-run tool`);
  }
  const population: PersonaDerivedPopulation = {
    schema_version: 2,
    id: manifest.population_id,
    mode: manifest.mode,
    weight_semantics: manifest.mode === "representative" ? "estimated-prevalence" : "test-allocation",
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
  if (!/^evals\/simulations\/.+\/derivations\/.+\.json$/.test(derivationPath)) {
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
  if (evidencePaths.some((path) => path.startsWith("/") || path.split("/").includes(".."))) {
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
  if (!/^evals\/simulations\/.+\/derivations\/.+\.json$/.test(derivationPath)) {
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

export function samePersonaReferences(
  left: ProductPersonaReference[],
  right: ProductPersonaReference[],
): boolean {
  return stableJson(left) === stableJson(right);
}
