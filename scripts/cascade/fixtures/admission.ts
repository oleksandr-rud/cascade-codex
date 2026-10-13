import { canonicalAdmissionRequestDigest, compileTaskEnvelope as compile, type AdmissionInterpretation, type AdmissionRequest } from "../admission";

// Explicit synthetic interpreter output. This fixture never interprets request words.
export function interpretationFixture(input: AdmissionRequest, semantic: Partial<AdmissionInterpretation> = {}): AdmissionInterpretation {
  const authority = semantic.workload?.authority ?? "READ_ONLY";
  return {
    schema_version: 1, interpreter: { kind: "LLM", model: "synthetic-contract-fixture" },
    request_digest: canonicalAdmissionRequestDigest(input.request), task_id: input.task_id ?? input.prior_envelope?.task_id ?? "adhoc", source_digest: input.source_digest ?? null,
    relation: "NEW", intent: authority === "READ_ONLY" ? "REVIEW" : "CHANGE",
    claims: [{ claim_id: "CL-001", kind: authority === "READ_ONLY" ? "OUTCOME" : "AUTHORITY", statement: "Synthetic requested behavior and scope.", source: "USER", status: "PROVIDED", confidence: null, verification: "Validate the fixture contract.", policy_tags: [], consumers: ["route", "tool-enforcement"], invalidation: ["request", "source", "permission"] }],
    workload: { topology: "BOUNDED", effort: "SMALL", authority: "READ_ONLY", duration: "TURN", context: "TARGETED_PROBE" },
    local_write_scope: { mode: "TARGETS", targets: [] }, uncertainties: [], ...semantic,
  };
}

export function compileTaskEnvelope(input: AdmissionRequest & { semantic?: Partial<AdmissionInterpretation> }) {
  const { semantic, ...request } = input;
  return compile({ ...request, interpretation: input.interpretation ?? interpretationFixture(request, semantic) });
}
