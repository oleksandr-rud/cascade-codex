import { describe, expect, test } from "bun:test";
import { sha256Text, stableJson } from "./common";

import {
  buildNotApplicableSpecializedEvaluationReceipt,
  verifySpecializedEvaluationReceipt,
  type SpecializedEvaluationExpectation,
  type SpecializedEvaluationReceipt,
} from "./harness-evaluation-receipts";

const specialized = {
  role: "harness-evaluator" as const,
  session_id: "run:specialized",
  subject: "independent-harness-evaluator",
};
const operator = {
  role: "simulation-operator" as const,
  session_id: "run:operator",
  subject: "operator",
};
const evidencePaths = {
  input: "specialized-evaluations/run-specialized-evaluation/input/input-manifest.json",
  trace: "specialized-evaluations/run-specialized-evaluation/provider/trace.json",
  output: "specialized-evaluations/run-specialized-evaluation/provider/output.json",
};
const claimLedger = [{
  claim_id: "CLAIM-1",
  class: "semantic-quality",
  status: "SUPPORTED" as const,
  reason: "supported",
  evidence: [evidencePaths.output],
}];
const inputContent = stableJson({
  schema_version: 1,
  artifact_type: "specialized-evaluation-input-manifest",
  specialized_evaluation_id: "run-specialized-evaluation",
  run_id: "run",
  campaign_id: "campaign",
  source_manifest_digest: "a".repeat(64),
  execution_receipt_digest: "b".repeat(64),
  claim_authority_digest: "f".repeat(64),
  route_ids: ["route:plan-change"],
  trace_ids: ["trace:1"],
  claims: [{ claim_id: "CLAIM-1", class: "semantic-quality" }],
});
const inputDigest = sha256Text(inputContent);
const traceContent = stableJson({
  schema_version: 1,
  artifact_type: "specialized-evaluation-provider-trace",
  specialized_evaluation_id: "run-specialized-evaluation",
  input_manifest_digest: inputDigest,
  provider: "held-out-provider",
  model: "held-out-model",
  completed: true,
  events: [{ type: "turn.completed" }],
});
const traceDigest = sha256Text(traceContent);
const outputContent = stableJson({
  schema_version: 1,
  artifact_type: "specialized-evaluation-provider-output",
  specialized_evaluation_id: "run-specialized-evaluation",
  input_manifest_digest: inputDigest,
  provider_trace_digest: traceDigest,
  status: "PASS",
  root_cause: "none",
  earliest_failure: null,
  residual_uncertainty: [],
  claim_ledger: claimLedger,
});
const outputDigest = sha256Text(outputContent);
const expectation: SpecializedEvaluationExpectation = {
  path: "specialized-evaluations/run-specialized-evaluation/receipt.json",
  run_id: "run",
  campaign_id: "campaign",
  declaration: {
    applicability: "REQUIRED",
    route_ids: ["route:plan-change"],
    trace_ids: ["trace:1"],
    claim_ids: ["CLAIM-1"],
    reason: "route and trace claim",
  },
  source_manifest_digest: "a".repeat(64),
  execution_receipt_digest: "b".repeat(64),
  claim_authority_digest: "f".repeat(64),
  specialized_evaluator: specialized,
  other_principals: [operator],
  claims: [{ id: "CLAIM-1", class: "semantic-quality" }],
  artifact_files: [
    { path: evidencePaths.input, sha256: inputDigest, content: inputContent },
    { path: evidencePaths.trace, sha256: traceDigest, content: traceContent },
    { path: evidencePaths.output, sha256: outputDigest, content: outputContent },
  ],
};
const receipt: SpecializedEvaluationReceipt = {
  schema_version: 2,
  specialized_evaluation_id: "run-specialized-evaluation",
  run_id: "run",
  campaign_id: "campaign",
  applicability: "REQUIRED",
  specialized_evaluator_identity: specialized.subject,
  source_manifest_digest: expectation.source_manifest_digest,
  execution_receipt_digest: expectation.execution_receipt_digest,
  route_ids: ["route:plan-change"],
  trace_ids: ["trace:1"],
  claim_ids: ["CLAIM-1"],
  input_manifest_digest: inputDigest,
  provider_trace_digest: traceDigest,
  provider_output_digest: outputDigest,
  evidence_artifacts: expectation.artifact_files.map(({ path, sha256 }) => ({ path, sha256 })),
  claim_ledger: claimLedger,
  status: "PASS",
  root_cause: "none",
  earliest_failure: null,
  residual_uncertainty: [],
  created_at: "2026-08-06T00:00:00.000Z",
};

describe("specialized harness evaluation receipts", () => {
  test("accepts an exact required receipt", () => {
    expect(() => verifySpecializedEvaluationReceipt(receipt, expectation)).not.toThrow();
  });

  test("rejects stale path, digest, claim, identity, and self-evaluation", () => {
    expect(() => verifySpecializedEvaluationReceipt(receipt, { ...expectation, path: "specialized-evaluations/wrong/receipt.json" })).toThrow("path");
    expect(() => verifySpecializedEvaluationReceipt({ ...receipt, execution_receipt_digest: "f".repeat(64) }, expectation)).toThrow("execution_receipt_digest");
    expect(() => verifySpecializedEvaluationReceipt({ ...receipt, claim_ids: ["OTHER"] }, expectation)).toThrow("claim_ids");
    expect(() => verifySpecializedEvaluationReceipt({ ...receipt, specialized_evaluator_identity: "other" }, expectation)).toThrow("identity");
    expect(() => verifySpecializedEvaluationReceipt(receipt, { ...expectation, other_principals: [{ ...operator, subject: specialized.subject }] })).toThrow("separation");
  });

  test("builds and verifies an explicit NOT_APPLICABLE receipt", () => {
    const declaration = {
      applicability: "NOT_APPLICABLE" as const,
      route_ids: [],
      trace_ids: [],
      claim_ids: [],
      reason: "mechanical fixture",
    };
    const value = buildNotApplicableSpecializedEvaluationReceipt({
      run_id: "run",
      campaign_id: "campaign",
      specialized_evaluator_identity: specialized.subject,
      source_manifest_digest: expectation.source_manifest_digest,
      execution_receipt_digest: expectation.execution_receipt_digest,
      declaration,
      created_at: "2026-08-06T00:00:00.000Z",
    });
    expect(() => verifySpecializedEvaluationReceipt(value, { ...expectation, declaration })).not.toThrow();
    expect(value.status).toBe("NOT_APPLICABLE");
  });

  test("does not allow NOT_APPLICABLE to satisfy REQUIRED specialization", () => {
    expect(() => verifySpecializedEvaluationReceipt({ ...receipt, status: "NOT_APPLICABLE" }, expectation)).toThrow("cannot be NOT_APPLICABLE");
  });

  test("rejects invalid terminals, timestamps, missing evidence, and stale classes", () => {
    expect(() => verifySpecializedEvaluationReceipt({ ...receipt, status: "BOGUS" as never }, expectation)).toThrow("shape");
    expect(() => verifySpecializedEvaluationReceipt({ ...receipt, created_at: "not-a-time" }, expectation)).toThrow("shape");
    expect(() => verifySpecializedEvaluationReceipt({ ...receipt, evidence_artifacts: [] }, expectation)).toThrow("evidence bindings");
    expect(() => verifySpecializedEvaluationReceipt({ ...receipt, provider_trace_digest: "0".repeat(64) }, expectation)).toThrow("reused or stale");
    expect(() => verifySpecializedEvaluationReceipt({
      ...receipt,
      claim_ledger: [{ ...receipt.claim_ledger[0]!, class: "wrong" }],
    }, expectation)).toThrow("claim ledger");
  });

  test("rejects a REQUIRED terminal that contradicts its provider-bound ledger", () => {
    const contradictoryOutputContent = stableJson({
      ...JSON.parse(outputContent),
      status: "FAIL",
      root_cause: "evaluator",
      earliest_failure: "forged terminal",
    });
    const contradictoryOutputDigest = sha256Text(contradictoryOutputContent);
    const contradictoryReceipt = {
      ...receipt,
      status: "FAIL" as const,
      root_cause: "evaluator",
      earliest_failure: "forged terminal",
      provider_output_digest: contradictoryOutputDigest,
      evidence_artifacts: receipt.evidence_artifacts.map((artifact) =>
        artifact.path === evidencePaths.output
          ? { ...artifact, sha256: contradictoryOutputDigest }
          : artifact
      ),
    };
    const contradictoryExpectation = {
      ...expectation,
      artifact_files: expectation.artifact_files.map((artifact) =>
        artifact.path === evidencePaths.output
          ? {
              ...artifact,
              sha256: contradictoryOutputDigest,
              content: contradictoryOutputContent,
            }
          : artifact
      ),
    };
    expect(() => verifySpecializedEvaluationReceipt(
      contradictoryReceipt,
      contradictoryExpectation,
    )).toThrow("required claim ledger status PASS");
  });

  test("rejects substituted or reused canonical REQUIRED evidence", () => {
    const reused = {
      ...receipt,
      provider_trace_digest: receipt.input_manifest_digest,
      evidence_artifacts: receipt.evidence_artifacts.map((artifact) =>
        artifact.path === evidencePaths.trace
          ? { ...artifact, sha256: receipt.input_manifest_digest! }
          : artifact
      ),
    };
    const reusedExpectation = {
      ...expectation,
      artifact_files: expectation.artifact_files.map((artifact) =>
        artifact.path === evidencePaths.trace
          ? { ...artifact, sha256: receipt.input_manifest_digest! }
          : artifact
      ),
    };
    expect(() => verifySpecializedEvaluationReceipt(reused, reusedExpectation)).toThrow("reused or stale");
    const substituted = {
      ...expectation,
      artifact_files: expectation.artifact_files.map((artifact) =>
        artifact.path === evidencePaths.output
          ? { ...artifact, content: stableJson({ arbitrary: true }) }
          : artifact
      ),
    };
    expect(() => verifySpecializedEvaluationReceipt(receipt, substituted)).toThrow("provider output");
  });

  test("binds REQUIRED residual uncertainty bidirectionally to provider output", () => {
    expect(() => verifySpecializedEvaluationReceipt({
      ...receipt,
      residual_uncertainty: ["forged receipt-only uncertainty"],
    }, expectation)).toThrow("provider output");

    const changedOutputContent = stableJson({
      ...JSON.parse(outputContent),
      residual_uncertainty: ["provider-only uncertainty"],
    });
    const changedOutputDigest = sha256Text(changedOutputContent);
    const changedExpectation = {
      ...expectation,
      artifact_files: expectation.artifact_files.map((artifact) =>
        artifact.path === evidencePaths.output
          ? {
              ...artifact,
              sha256: changedOutputDigest,
              content: changedOutputContent,
            }
          : artifact
      ),
    };
    expect(() => verifySpecializedEvaluationReceipt({
      ...receipt,
      provider_output_digest: changedOutputDigest,
      evidence_artifacts: receipt.evidence_artifacts.map((artifact) =>
        artifact.path === evidencePaths.output
          ? { ...artifact, sha256: changedOutputDigest }
          : artifact
      ),
    }, changedExpectation)).toThrow("provider output");
  });
});
