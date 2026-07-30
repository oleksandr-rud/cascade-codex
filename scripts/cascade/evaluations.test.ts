import { describe, expect, test } from "bun:test";

import {
  buildCodexEvaluationReceipt,
  buildFixtureEvaluationReceipt,
  parseCodexJsonl,
  validateCodexEvaluationOutput,
  type CodexEvaluationOutput,
  type EvaluationIdentity,
  type EvaluationRequest,
  type MechanicalEvaluation,
} from "./evaluations";
import { assertEvaluationReceiptFresh } from "./campaigns";
import { resolveCampaign } from "./simulation-definitions";

const DIGEST = "a".repeat(64);

function identity(): EvaluationIdentity {
  return {
    runId: "evaluation-test",
    campaignId: "simulation-codex-evaluation-smoke",
    operatorIdentity: "operator:test",
    targetActorIdentity: "target:test",
    evaluatorIdentity: "codex:simulation-evaluator:gpt-5.6-sol",
    sourceManifestDigest: DIGEST,
    executionReceiptDigest: "b".repeat(64),
    calibrationReceiptDigest: "c".repeat(64),
  };
}

function mechanical(): MechanicalEvaluation {
  return {
    status: "PASS",
    claim_ledger: [
      {
        claim_id: "fixture-state-transition",
        class: "mechanical-behavior",
        status: "SUPPORTED",
        reason: "mechanical gates passed",
        evidence: ["oracle"],
      },
      {
        claim_id: "fixture-population-coverage",
        class: "coverage",
        status: "SUPPORTED",
        reason: "mechanical gates passed",
        evidence: ["calibration-receipt"],
      },
      {
        claim_id: "fixture-release-eligibility",
        class: "release-eligibility",
        status: "NOT_RUN",
        reason: "framework calibration is not target evidence",
        evidence: ["calibration-receipt"],
      },
    ],
  };
}

function request(): EvaluationRequest {
  const id = identity();
  return {
    schema_version: 1,
    evaluation_id: `${id.runId}-evaluation`,
    run_id: id.runId,
    campaign_id: id.campaignId,
    source_manifest_digest: id.sourceManifestDigest,
    execution_receipt_digest: id.executionReceiptDigest,
    calibration_receipt_digest: id.calibrationReceiptDigest,
    operator_identity: id.operatorIdentity,
    target_actor_identity: id.targetActorIdentity,
    evaluator_identity: id.evaluatorIdentity,
    profile: {
      schema_version: 1,
      id: "codex-independent-v1",
      provider: "codex",
      model: "gpt-5.6-sol",
      reasoning_effort: "high",
      timeout_ms: 300000,
      rubric_file: "evals/rubrics/simulation-evaluator-v1.json",
    },
    rubric: {
      schema_version: 1,
      id: "simulation-evaluator-v1",
      criteria: ["Apply hard gates first."],
      judge_profile: "simulation-evaluator",
      human_calibration_required: false,
    },
    mechanical_evaluation: mechanical(),
    evaluation_input_digest: "d".repeat(64),
  };
}

function output(): CodexEvaluationOutput {
  const value = request();
  return {
    schema_version: 1,
    evaluation_id: value.evaluation_id,
    run_id: value.run_id,
    campaign_id: value.campaign_id,
    source_manifest_digest: value.source_manifest_digest,
    execution_receipt_digest: value.execution_receipt_digest,
    evaluation_input_digest: value.evaluation_input_digest,
    input_manifest_digest: "f".repeat(64),
    evaluator_identity: value.evaluator_identity,
    status: "PASS",
    mechanical_gate_status: "PASS",
    claim_assessments: [
      {
        claim_id: "fixture-state-transition",
        status: "SUPPORTED",
        reason: "frozen state and oracles agree",
        evidence: ["run/execution/execution-receipt.json"],
      },
      {
        claim_id: "fixture-population-coverage",
        status: "SUPPORTED",
        reason: "required slices are present",
        evidence: ["run/calibration.json"],
      },
      {
        claim_id: "fixture-release-eligibility",
        status: "NOT_RUN",
        reason: "framework calibration cannot establish target release evidence",
        evidence: ["run/calibration.json"],
      },
    ],
    root_cause: "none",
    earliest_failure: null,
    residual_uncertainty: ["target-project behavior remains untested"],
    next_route: "target calibration",
  };
}

describe("Codex simulation evaluation", () => {
  test("parses a completed Codex JSONL trace", () => {
    const final = output();
    const parsed = parseCodexJsonl(
      [
        JSON.stringify({ type: "thread.started", thread_id: "thread" }),
        JSON.stringify({
          type: "item.completed",
          item: { type: "agent_message", text: JSON.stringify(final) },
        }),
        JSON.stringify({
          type: "turn.completed",
          usage: { input_tokens: 10, output_tokens: 5 },
        }),
      ].join("\n"),
    );
    expect(parsed.output).toEqual(final);
    expect(parsed.usage).toEqual({ input_tokens: 10, output_tokens: 5 });
  });

  test("rejects incomplete Codex traces", () => {
    expect(() =>
      parseCodexJsonl(
        JSON.stringify({
          type: "item.completed",
          item: { type: "agent_message", text: JSON.stringify(output()) },
        }),
      ),
    ).toThrow("turn.completed");
  });

  test("rejects stale identities and mechanical-claim upgrades", () => {
    expect(() =>
      validateCodexEvaluationOutput(
        { ...output(), source_manifest_digest: "e".repeat(64) },
        request(),
        "f".repeat(64),
      ),
    ).toThrow("stale or mismatched");
    expect(() =>
      validateCodexEvaluationOutput(output(), request(), "e".repeat(64)),
    ).toThrow("stale or mismatched");
    const upgraded = output();
    upgraded.claim_assessments[2]!.status = "SUPPORTED";
    expect(() =>
      validateCodexEvaluationOutput(upgraded, request(), "f".repeat(64)),
    ).toThrow("cannot upgrade mechanical claim");
  });

  test("conservatively merges Codex judgments", async () => {
    const resolved = await resolveCampaign(
      "evals/campaigns/simulation-codex-evaluation-smoke.json",
    );
    const value = validateCodexEvaluationOutput(
      output(),
      request(),
      "f".repeat(64),
    );
    value.claim_assessments[0]!.status = "UNSUPPORTED";
    const receipt = buildCodexEvaluationReceipt(
      resolved,
      identity(),
      mechanical(),
      request(),
      value,
      "f".repeat(64),
      "e".repeat(64),
      { input_tokens: 10 },
    );
    expect(receipt.status).toBe("FAIL");
    expect(receipt.claim_ledger[0]!.status).toBe("UNSUPPORTED");
    expect(receipt.claim_ledger[2]!.status).toBe("NOT_RUN");
  });

  test("rejects stale receipts before aggregation", async () => {
    const resolved = await resolveCampaign(
      "evals/campaigns/simulation-contract-smoke.json",
    );
    const fixtureIdentity = {
      ...identity(),
      campaignId: resolved.campaign.id,
      evaluatorIdentity: "fixture:simulation-evaluator",
    };
    const receipt = buildFixtureEvaluationReceipt(
      resolved,
      fixtureIdentity,
      mechanical(),
    );
    assertEvaluationReceiptFresh(resolved, fixtureIdentity, receipt);
    expect(() =>
      assertEvaluationReceiptFresh(
        resolved,
        { ...fixtureIdentity, sourceManifestDigest: "f".repeat(64) },
        receipt,
      ),
    ).toThrow("stale or mismatched");
    expect(() =>
      assertEvaluationReceiptFresh(resolved, fixtureIdentity, {
        ...receipt,
        model: "stale-model",
      }),
    ).toThrow("stale or mismatched");
  });
});
