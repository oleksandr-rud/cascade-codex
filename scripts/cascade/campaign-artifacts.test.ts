import { afterEach, describe, expect, test } from "bun:test";
import {
  chmod,
  lstat,
  mkdtemp,
  mkdir,
  readdir,
  readFile,
  rename,
  rm,
  stat,
  symlink,
  unlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { createServer as createSocketServer } from "node:net";
import { resolve } from "node:path";

import {
  type CampaignIdentityEnvelope,
  type CampaignPrincipal,
  CAMPAIGN_ARTIFACT_SCHEMA_VERSION,
  CampaignArtifactStore,
  DEFAULT_EVIDENCE_LIMIT_BYTES,
} from "./campaign-artifacts";
import {
  assertJsonSchema,
  CascadeError,
  compareRfc3339Instants,
  rootPath,
  sha256File,
  sha256Text,
  stableJson,
  valueDigest,
} from "./common";
import { refinementProposalCandidateDigest } from "./persona-simulations";
import {
  buildCalibrationAuthority,
  validatePolicyDriverEventAuthority,
} from "./evaluation-authority";
import {
  consumePolicyBudget,
  resolvePolicyDecision,
  signPolicyConfirmationReceipt,
} from "./campaign-policies";
import {
  simulationCheckpointDigest,
  simulationEventDigest,
  simulationSessionContractDigest,
  type SimulationSessionContract,
  type SimulationSessionCheckpoint,
  type SimulationSessionEvent,
} from "./simulation-sessions";
import {
  ACTION_BINDING_VERSION,
  CAMPAIGN_FIXED_SOURCE_FILES,
  actionBindingDigest,
} from "./simulation-definitions";
import type { RuntimeHandoffReceipt } from "./runtime-handoffs";

const temporaryRoots: string[] = [];

test("binds immutable policy decisions to driver-specific evidence", () => {
  const secretHeader = "resolved-private-header-value";
  const secretBody = "resolved-private-request-body";
  for (const fixture of [
    {
      driver: "direct-process",
      action: { type: "process-exec", argv: ["true"] },
      event: {
        event_type: "PROCESS",
        index: 0,
        type: "process-exec",
        argv: ["true"],
        status: "PASS",
      },
    },
    {
      driver: "http-client",
      action: {
        type: "http-request",
        method: "POST",
        url: "https://example.com",
        headers: {
          authorization: {
            kind: "secret-reference",
            reference_id: "vault/http/header",
            immutable_version: "version-1",
          },
        },
        body: {
          kind: "secret-reference",
          reference_id: "vault/http/body",
          immutable_version: "version-2",
        },
      },
      event: {
        event_type: "HTTP",
        index: 0,
        type: "http-request",
        method: "POST",
        url: "https://example.com",
        status: "PASS",
      },
    },
  ]) {
    const decision = {
      action_index: 0,
      action_type: fixture.action.type,
      action_binding_version: ACTION_BINDING_VERSION,
      action_binding_digest: actionBindingDigest(fixture.action as never),
      decision: "ALLOW",
    };
    fixture.event.action_binding_version = ACTION_BINDING_VERSION;
    fixture.event.action_binding_digest = decision.action_binding_digest;
    expect(() => validatePolicyDriverEventAuthority({
      driver: fixture.driver,
      actions: [fixture.action] as never[],
      decisions: [decision],
      events: [fixture.event],
      label: fixture.driver,
    })).not.toThrow();
    expect(stableJson(fixture.event)).not.toContain(secretHeader);
    expect(stableJson(fixture.event)).not.toContain(secretBody);
  }

  const action = { type: "process-exec", argv: ["true"] };
  const decision = {
    action_index: 0,
    action_type: action.type,
    action_binding_version: ACTION_BINDING_VERSION,
    action_binding_digest: actionBindingDigest(action),
    decision: "ALLOW",
  };
  expect(() => validatePolicyDriverEventAuthority({
    driver: "direct-process",
    actions: [action],
    decisions: [decision],
    events: [{
      event_type: "ACTION",
      index: 0,
      type: "process-exec",
      status: "PASS",
      policy_decision: "ALLOW",
    }],
    label: "foreign evidence",
  })).toThrow("different driver");
  expect(() => validatePolicyDriverEventAuthority({
    driver: "direct-process",
    actions: [action],
    decisions: [{ ...decision, action_binding_digest: "0".repeat(64) }],
    events: [{
      event_type: "PROCESS",
      index: 0,
      type: "process-exec",
      action_binding_version: ACTION_BINDING_VERSION,
      action_binding_digest: decision.action_binding_digest,
      argv: action.argv,
      status: "PASS",
    }],
    label: "stale digest",
  })).toThrow("action binding is stale");

  for (const [label, event] of [
    ["missing action digest", {
      event_type: "PROCESS",
      index: 0,
      type: "process-exec",
      argv: action.argv,
      status: "PASS",
    }],
    ["resealed argv substitution", {
      event_type: "PROCESS",
      index: 0,
      type: "process-exec",
      action_binding_version: ACTION_BINDING_VERSION,
      action_binding_digest: actionBindingDigest({ type: "process-exec", argv: ["false"] }),
      argv: ["false"],
      status: "PASS",
    }],
  ] as const) {
    expect(() => validatePolicyDriverEventAuthority({
      driver: "direct-process",
      actions: [action],
      decisions: [decision],
      events: [event],
      label,
    })).toThrow("event action");
  }

  const httpAction = {
    type: "http-request" as const,
    method: "POST" as const,
    url: "https://example.com/submit",
    headers: {
      authorization: {
        kind: "secret-reference" as const,
        reference_id: "vault/http/header",
        immutable_version: "version-1",
      },
    },
    body: {
      kind: "secret-reference" as const,
      reference_id: "vault/http/body",
      immutable_version: "version-2",
    },
  };
  const httpDecision = {
    action_index: 0,
    action_type: httpAction.type,
    action_binding_version: ACTION_BINDING_VERSION,
    action_binding_digest: actionBindingDigest(httpAction),
    decision: "ALLOW",
  };
  for (const [label, event] of [
    ["visible HTTP method substitution", {
      event_type: "HTTP",
      index: 0,
      type: "http-request",
      action_binding_version: ACTION_BINDING_VERSION,
      action_binding_digest: httpDecision.action_binding_digest,
      method: "GET",
      url: httpAction.url,
      status: "PASS",
    }],
    ["visible HTTP URL substitution", {
      event_type: "HTTP",
      index: 0,
      type: "http-request",
      action_binding_version: ACTION_BINDING_VERSION,
      action_binding_digest: httpDecision.action_binding_digest,
      method: httpAction.method,
      url: "https://example.com/substituted",
      status: "PASS",
    }],
    ["hidden HTTP header substitution", {
      event_type: "HTTP",
      index: 0,
      type: "http-request",
      action_binding_version: ACTION_BINDING_VERSION,
      action_binding_digest: actionBindingDigest({
        ...httpAction,
        headers: {
          authorization: {
            ...httpAction.headers.authorization,
            immutable_version: "version-substituted",
          },
        },
      }),
      method: httpAction.method,
      url: httpAction.url,
      status: "PASS",
    }],
    ["hidden HTTP body substitution", {
      event_type: "HTTP",
      index: 0,
      type: "http-request",
      action_binding_version: ACTION_BINDING_VERSION,
      action_binding_digest: actionBindingDigest({
        ...httpAction,
        body: { ...httpAction.body, reference_id: "vault/http/substituted" },
      }),
      method: httpAction.method,
      url: httpAction.url,
      status: "PASS",
    }],
  ] as const) {
    expect(() => validatePolicyDriverEventAuthority({
      driver: "http-client",
      actions: [httpAction],
      decisions: [httpDecision],
      events: [event],
      label,
    })).toThrow("event action");
  }
});

async function temporaryRoot(): Promise<string> {
  const root = await mkdtemp(resolve(tmpdir(), "cascade-campaign-artifacts-"));
  temporaryRoots.push(root);
  return root;
}

async function optionalBytes(path: string): Promise<Buffer | null> {
  try {
    return await readFile(path);
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return null;
    }
    throw error;
  }
}

async function snapshotBytes(paths: readonly string[]): Promise<Map<string, Buffer | null>> {
  return new Map(
    await Promise.all(paths.map(async (path) => [path, await optionalBytes(path)] as const)),
  );
}

async function expectBytesUnchanged(
  snapshot: ReadonlyMap<string, Buffer | null>,
): Promise<void> {
  for (const [path, before] of snapshot) {
    expect(await optionalBytes(path)).toEqual(before);
  }
}

function identities(
  override: Partial<CampaignIdentityEnvelope> = {},
): CampaignIdentityEnvelope {
  return {
    schema_version: 2,
    operator: {
      role: "simulation-operator",
      session_id: "operator-session",
      subject: "operator",
    },
    evaluator: {
      role: "simulation-evaluator",
      session_id: "evaluator-session",
      subject: "evaluator",
    },
    specialized_evaluator: {
      role: "harness-evaluator",
      session_id: "specialized-evaluator-session",
      subject: "specialized-evaluator",
    },
    aggregator: {
      role: "campaign-aggregator",
      session_id: "aggregator-session",
      subject: "aggregator",
    },
    target: {
      role: "target-actor",
      session_id: "target-session",
      subject: "target",
    },
    simulator: {
      role: "simulator",
      session_id: "simulator-session",
      subject: "simulator",
    },
    recovery: {
      role: "simulation-recovery",
      session_id: "recovery-session",
      subject: "recovery",
    },
    ...override,
  };
}

function reservationInput(
  identity = identities(),
  simulation_scope: "harness" | "product" = "harness",
) {
  return {
    campaign_id: "campaign-1",
    campaign_digest: "digest-1",
    attempt: 1,
    simulation_scope,
    claim_ids: ["claim-1"],
    specialized_evaluation: simulation_scope === "harness"
      ? {
          applicability: "NOT_APPLICABLE" as const,
          route_ids: [],
          trace_ids: [],
          claim_ids: [],
          reason: "mechanical artifact-store fixture",
        }
      : null,
    identities: identity,
    lease: {
      lease_id: "lease-1",
      owner_session_id: identity.operator.session_id,
      acquired_at: "2099-07-30T10:00:00.000Z",
      expires_at: "2099-07-30T11:00:00.000Z",
      recovery_mode: "FINALIZE_UNKNOWN_OUTCOME" as const,
    },
  };
}

async function authorizedStore(
  root: string,
  runId: string,
  identity = identities(),
): Promise<CampaignArtifactStore> {
  const store = new CampaignArtifactStore(root, runId);
  await store.reserve(reservationInput(identity));
  return store.withAuthority(identity.operator, "lease-1");
}

function refinementProposal(runId: string) {
  return {
    schema_version: 1,
    proposal_id: "proposal-1",
    run_id: runId,
    campaign_id: "campaign-1",
    evaluation_id: "evaluation-1",
    persona: {
      persona_id: "P-999",
      revision: 1,
      path: "docs/product/personas/fixtures/P-999-framework-support-role.md",
      sha256: "a".repeat(64),
    },
    derivation: {
      id: "p-999-coverage-v1",
      path: "product-evals/simulations/harness/fixture/derivations/P-999.json",
      sha256: "b".repeat(64),
    },
    proposal_type: "research-question",
    target_field: "communication behavior",
    summary: "Collect external observations.",
    rationale: "Fixture evidence cannot validate a product persona.",
    recommended_change: "Keep the persona unchanged until research exists.",
    evidence_paths: ["run/execution/execution-receipt.json"],
    confidence: "high",
    disposition_route: "collect-external-evidence",
    external_evidence_required: true,
    human_review_required: true,
    direct_persona_mutation_allowed: false,
    status: "PROPOSED",
    proposed_by: "evaluator",
    created_at: "2026-08-03T00:00:00Z",
    promotion_blockers: [
      "external evidence has not been reviewed",
      "accountable human persona review has not approved a new revision",
    ],
  };
}

async function stageEvaluationInput(
  store: CampaignArtifactStore,
  evaluationId: string,
  value: unknown,
  writeEvidence = true,
): Promise<string> {
  const evidencePath = "run/execution/execution-receipt.json";
  const stagedPath = `evaluations/${evaluationId}/input/${evidencePath}`;
  if (writeEvidence) await store.writeStageJson(stagedPath, value);
  const files = [
    {
      path: evidencePath,
      sha256: writeEvidence
        ? await sha256File(resolve(store.runRoot, stagedPath))
        : "d".repeat(64),
    },
  ];
  const manifestDigest = valueDigest(files);
  await store.writeStageJson(
    `evaluations/${evaluationId}/input/input-manifest.json`,
    { files, manifest_digest: manifestDigest },
  );
  return manifestDigest;
}

async function seedCompletedRun(store: CampaignArtifactStore): Promise<void> {
  let reservation = await store.readReservation();
  let lease = JSON.parse(await readFile(resolve(store.runRoot, "lease.json"), "utf8"));
  const seedNow = Date.now();
  if (
    Date.parse(lease.renewed_at) > seedNow ||
    Date.parse(lease.expires_at) <= seedNow
  ) {
    const acquiredAt = reservation.reserved_at;
    const expiresAt = new Date(seedNow + 60 * 60 * 1_000).toISOString();
    reservation = {
      ...reservation,
      lease: {
        ...reservation.lease,
        acquired_at: acquiredAt,
        expires_at: expiresAt,
      },
    };
    lease = {
      ...lease,
      acquired_at: acquiredAt,
      renewed_at: acquiredAt,
      expires_at: expiresAt,
    };
    await writeFile(
      resolve(store.runRoot, "reservation.json"),
      `${stableJson(reservation, true)}\n`,
      { mode: 0o600 },
    );
    await writeFile(
      resolve(store.runRoot, "lease.json"),
      `${stableJson(lease, true)}\n`,
      { mode: 0o600 },
    );
  }
  const identity = {
    run_id: store.runId,
    campaign_id: "campaign-1",
  };
  const proposal = refinementProposal(store.runId);
  const evaluationId = `${store.runId}-evaluation`;
  proposal.evaluation_id = evaluationId;
  const sourceManifest = {
    schema_version: 1,
    ...identity,
    status: "FROZEN",
    definitions: [
      { path: proposal.persona.path, sha256: proposal.persona.sha256 },
      { path: proposal.derivation.path, sha256: proposal.derivation.sha256 },
    ],
  };
  const execution = {
    schema_version: 1,
    ...identity,
    status: "PASS",
    source_manifest_digest: valueDigest(sourceManifest),
    retry_lineage_receipt_digest: null,
    cleanup_verified: true,
    created_at: "2026-08-05T23:59:59.000Z",
  };
  await store.appendLifecycle({
    status: "RUNNING",
    at: "2026-08-05T23:59:58.000Z",
  });
  await store.writeStageJson("execution/source-manifest.json", sourceManifest);
  await store.writeStageJson("execution/execution-receipt.json", execution);
  const inputManifestDigest = await stageEvaluationInput(
    store,
    evaluationId,
    execution,
  );
  const specialized = reservation.simulation_scope === "harness"
    ? {
        schema_version: 2,
        specialized_evaluation_id: `${store.runId}-specialized-evaluation`,
        ...identity,
        applicability: "NOT_APPLICABLE",
        specialized_evaluator_identity:
          reservation.identities.specialized_evaluator!.subject,
        source_manifest_digest: valueDigest(sourceManifest),
        execution_receipt_digest: valueDigest(execution),
        route_ids: [],
        trace_ids: [],
        claim_ids: [],
        input_manifest_digest: null,
        provider_trace_digest: null,
        provider_output_digest: null,
        evidence_artifacts: [],
        claim_ledger: [],
        status: "NOT_APPLICABLE",
        root_cause: "not-applicable",
        earliest_failure: null,
        residual_uncertainty: ["mechanical artifact-store fixture"],
        created_at: "2026-08-06T00:00:00.000Z",
      }
    : null;
  if (specialized) {
    await store.writeStageJson(
      `specialized-evaluations/${specialized.specialized_evaluation_id}/receipt.json`,
      specialized,
    );
  }
  const claimLedger = reservation.claim_ids.map((claimId) => ({
    claim_id: claimId,
    class: claimId === "release-claim" ? "release-eligibility" : "mechanical-behavior",
    status: "SUPPORTED",
    reason: "fixture",
    evidence: [] as string[],
  }));
  const releaseClaims = claimLedger
    .filter((claim) => claim.class === "release-eligibility")
    .map((claim) => ({ claim_id: claim.claim_id, status: claim.status }));
  const releaseEligible = releaseClaims.length > 0;
  const evaluation = {
    schema_version: 3,
    ...identity,
    evaluation_id: evaluationId,
    operator_identity: reservation.identities.operator.subject,
    evaluator_identity: proposal.proposed_by,
    principal_identities: {
      operator: reservation.identities.operator.subject,
      specialized_evaluator:
        reservation.identities.specialized_evaluator?.subject ?? null,
      evaluator: reservation.identities.evaluator.subject,
      aggregator: reservation.identities.aggregator.subject,
      target: reservation.identities.target.subject,
      simulator: reservation.identities.simulator.subject,
      recovery: reservation.identities.recovery.subject,
    },
    specialized_evaluation: specialized
      ? {
          receipt_id: specialized.specialized_evaluation_id,
          receipt_digest: valueDigest(specialized),
          status: specialized.status,
          claim_ids: specialized.claim_ids,
        }
      : null,
    status: "PASS",
    provider: "codex",
    profile_id: "artifact-fixture-profile",
    profile_digest: "1".repeat(64),
    rubric_id: "artifact-fixture-rubric",
    rubric_digest: "2".repeat(64),
    model: "artifact-fixture-model",
    reasoning_effort: "high",
    source_manifest_digest: valueDigest(sourceManifest),
    execution_receipt_digest: valueDigest(execution),
    calibration_receipt_digest: null,
    evaluation_input_digest: "3".repeat(64),
    input_manifest_digest: inputManifestDigest,
    provider_trace_digest: "4".repeat(64),
    provider_output_digest: "5".repeat(64),
    usage: {},
    claim_ledger: claimLedger,
    refinement_proposal_bindings: [
      {
        proposal_id: proposal.proposal_id,
        candidate_digest: refinementProposalCandidateDigest(proposal),
      },
    ],
    root_cause: "none",
    earliest_failure: null,
    residual_uncertainty: ["artifact fixture only"],
    next_route: "independent review",
    created_at: "2026-08-06T00:00:00.000Z",
  };
  const aggregation = {
    schema_version: 2,
    ...identity,
    aggregation_id: `${store.runId}-aggregation`,
    aggregator_identity: reservation.identities.aggregator.subject,
    status: "PASS",
    execution_receipt_digest: valueDigest(execution),
    specialized_evaluation_receipt_digest: specialized
      ? valueDigest(specialized)
      : null,
    evaluation_receipt_digest: valueDigest(evaluation),
    calibration_receipt_digest: null,
    release_eligible: releaseEligible,
    release_claims: releaseClaims,
    created_at: "2026-08-06T00:00:00.000Z",
  };
  await store.writeStageJson(
    `evaluations/${evaluationId}/receipt.json`,
    evaluation,
  );
  await store.writeStageJson(
    `aggregations/${store.runId}-aggregation.json`,
    aggregation,
  );
  await store.writeStageJson(
    "refinements/proposal-1.json",
    proposal,
  );
  await store.writeStageJson("summary.json", {
    schema_version: 1,
    ...identity,
    campaign_status: "PASS",
    execution_status: "PASS",
    evaluation_status: "PASS",
    evaluation_provider: "codex",
    evaluation_profile_id: "artifact-fixture-profile",
    evaluation_model: "artifact-fixture-model",
    evaluation_attempt: null,
    calibration_status: "NOT_RUN",
    calibration_scope: "none",
    release_eligible: releaseEligible,
    execution_receipt_digest: valueDigest(execution),
    specialized_evaluation_receipt_digest: specialized
      ? valueDigest(specialized)
      : null,
    evaluation_receipt_digest: valueDigest(evaluation),
    aggregation_receipt_digest: valueDigest(aggregation),
    calibration_receipt_digest: null,
    completed_at: "2026-08-06T00:00:00.000Z",
  });
  const terminalAt = new Date().toISOString();
  await store.withClock(() => new Date(terminalAt)).appendTrustedLifecycle({
    status: "COMPLETED",
  });
}

async function convertToBlockedAttempt(
  store: CampaignArtifactStore,
  input: {
    exitCode: number;
    timedOut: boolean;
    stdout: string;
    stderr: string;
    reason: string;
    providerOutput?: unknown;
  },
): Promise<void> {
  const evaluationId = `${store.runId}-evaluation`;
  const evaluationRoot = `evaluations/${evaluationId}`;
  const request = JSON.parse(await readFile(
    resolve(store.runRoot, `${evaluationRoot}/input/request.json`),
    "utf8",
  ));
  const lifecyclePath = resolve(store.runRoot, "lifecycle.jsonl");
  const lifecycle = (await readFile(lifecyclePath, "utf8"))
    .trim().split("\n").map((line) => JSON.parse(line));
  const evaluationAt = lifecycle.find(
    (event) => event.status === "EVALUATING",
  ).at;
  const frozenInputRoot = resolve(
    tmpdir(),
    `cascade-${evaluationId}-frozen`,
    "input",
  );
  await Promise.all([
    `${evaluationRoot}/attempt.json`,
    `${evaluationRoot}/command.json`,
    `${evaluationRoot}/provider-output.json`,
    `${evaluationRoot}/receipt.json`,
    `${evaluationRoot}/stderr.log`,
    `${evaluationRoot}/stdout.jsonl`,
    `aggregations/${store.runId}-aggregation.json`,
  ].map((path) => rm(resolve(store.runRoot, path), { force: true })));
  await store.writeStageJson(`${evaluationRoot}/command.json`, {
    argv: [
      "codex", "exec", "--ephemeral", "--ignore-user-config", "--json",
      "--disable", "plugins", "--disable", "apps", "--disable", "browser_use",
      "--disable", "computer_use", "--disable", "image_generation",
      "--disable", "code_mode_host", "-m", request.profile.model,
      "-c", `model_reasoning_effort="${request.profile.reasoning_effort}"`,
      "-s", "read-only", "-C", frozenInputRoot,
      "--skip-git-repo-check", "--output-schema",
      resolve(frozenInputRoot, "contracts/output.schema.json"),
      "<prompt-in-input/prompt.txt>",
    ],
  });
  await store.writeStageText(`${evaluationRoot}/stdout.jsonl`, input.stdout);
  await store.writeStageText(`${evaluationRoot}/stderr.log`, input.stderr);
  if (input.providerOutput !== undefined) {
    await store.writeStageJson(
      `${evaluationRoot}/provider-output.json`,
      input.providerOutput,
    );
  }
  await store.writeStageJson(`${evaluationRoot}/attempt.json`, {
    schema_version: 1,
    evaluation_id: evaluationId,
    run_id: store.runId,
    campaign_id: request.campaign_id,
    provider: "codex",
    model: request.profile.model,
    reasoning_effort: request.profile.reasoning_effort,
    evaluation_input_digest: request.evaluation_input_digest,
    exit_code: input.exitCode,
    timed_out: input.timedOut,
    duration_ms: 10,
    status: "BLOCKED",
    reason: input.reason,
    created_at: evaluationAt,
  });
  const summary = JSON.parse(await readFile(
    resolve(store.runRoot, "summary.json"),
    "utf8",
  ));
  delete summary.aggregation_receipt_digest;
  delete summary.calibration_scope;
  delete summary.evaluation_model;
  Object.assign(summary, {
    aggregation_receipt_digest: null,
    campaign_status: "BLOCKED",
    evaluation_attempt: `${evaluationRoot}/attempt.json`,
    evaluation_blocker: input.reason,
    evaluation_receipt_digest: null,
    evaluation_status: "BLOCKED",
    mechanical_status: request.mechanical_evaluation.status,
    release_eligible: false,
  });
  await writeFile(
    resolve(store.runRoot, "summary.json"),
    `${stableJson(summary, true)}\n`,
    { mode: 0o600 },
  );
  const terminal = lifecycle.find((event) => event.status === "COMPLETED");
  Object.assign(terminal, {
    status: "BLOCKED",
    campaign_status: "BLOCKED",
    evaluation_attempt: `${evaluationRoot}/attempt.json`,
    reason: input.reason,
  });
  await writeFile(
    lifecyclePath,
    `${lifecycle.map((event) => stableJson(event)).join("\n")}\n`,
    { mode: 0o600 },
  );
}

function strictCampaignDefinition(provider: "codex" | "fixture") {
  return {
    schema_version: 1,
    id: "campaign-1",
    title: "Strict terminal authority fixture",
    purpose: "Exercise frozen evaluation authority",
    owner_lane: "W-004",
    tier: provider === "codex" ? "semantic-evaluation" : "deterministic-fixture",
    session: {
      max_duration_ms: 185_000,
      max_step_duration_ms: 185_000,
      max_steps: 1,
      max_parallel_steps: 1,
      max_steps_per_episode: 1,
      max_surfaces: 2,
      max_checkpoint_bytes: 128 * 1024,
      lease_ttl_ms: 186_000,
    },
    evaluation_profile_file: `product-evals/rubrics/strict-${provider}-profile.json`,
    simulation_file: "product-evals/simulations/strict-terminal.json",
    task_files: ["product-evals/tasks/strict-task.json"],
    claim_files: [
      "product-evals/claims/claim-1.json",
      "product-evals/claims/release-claim.json",
    ],
    policy_files: ["product-evals/policies/strict-policy.json"],
    oracle_files: ["product-evals/oracles/strict-oracle.json"],
    specialized_evaluation: null,
  };
}

function strictCampaignDigest(provider: "codex" | "fixture"): string {
  return sha256Text(`${stableJson(strictCampaignDefinition(provider), true)}\n`);
}

async function seedStrictProductRun(
  store: CampaignArtifactStore,
  provider: "codex" | "fixture" = "codex",
  withCalibration: boolean | "nonfixture-backdated" = false,
  terminalAt = new Date().toISOString(),
  confirmationSecret: string | null = null,
  blockBeforeEvaluation = false,
  journalEventCount = 5,
): Promise<void> {
  const at = (offsetMs: number): string =>
    new Date(Date.parse(terminalAt) + offsetMs).toISOString();
  const reservation = await store.readReservation();
  if (reservation.simulation_scope !== "product") {
    throw new Error("strict terminal fixture requires product scope");
  }
  const identity = { run_id: store.runId, campaign_id: reservation.campaign_id };
  const campaign = strictCampaignDefinition(provider);
  const claimDefinitions = reservation.claim_ids.map((claimId) => ({
    schema_version: 1,
    id: claimId,
    class: claimId === "release-claim" ? "release-eligibility" : "mechanical-behavior",
    assertion: `authored ${claimId}`,
    scope: {},
    population_authority: "none",
    required_policy_ids: ["strict-policy"],
    required_oracle_ids: ["strict-oracle"],
    required_metric_ids: [],
    requires_calibration: false,
    evidence_requirements: [
      "source-manifest",
      "execution-receipt",
      "task-result",
      "policy-decisions",
      "oracle",
      "cleanup",
    ],
  }));
  const profile = provider === "codex"
    ? {
        schema_version: 1,
        id: "strict-codex-profile",
        provider: "codex",
        model: "strict-model",
        reasoning_effort: "high",
        timeout_ms: 30_000,
        rubric_file: "product-evals/rubrics/strict-rubric.json",
      }
    : {
        schema_version: 1,
        id: "strict-fixture-profile",
        provider: "fixture",
        timeout_ms: 30_000,
      };
  const rubric = provider === "codex"
    ? {
        schema_version: 1,
        id: "strict-rubric",
        criteria: ["preserve exact authority"],
        judge_profile: "simulation-evaluator",
        human_calibration_required: false,
      }
    : null;
  const task = {
    schema_version: 1,
    id: "strict-task",
    kind: "command",
    driver: { type: "fake" },
    required: true,
    timeout_ms: 30_000,
    actions: [{ type: "set" as const, path: "ready", value: true }],
    policy_ids: ["strict-policy"],
    oracle_ids: ["strict-oracle"],
  };
  const policy = {
    schema_version: 2 as const,
    id: "strict-policy",
    version: "1.0.0",
    effect: confirmationSecret ? ("REQUIRE_CONFIRMATION" as const) : ("ALLOW" as const),
    scope: {
      campaign_ids: [campaign.id],
      task_ids: [task.id],
      task_kinds: [task.kind],
      driver_types: [task.driver.type],
      action_types: ["set"],
      action_paths: ["ready"],
    },
    budgets: {
      required_dimensions: ["action_count" as const, "output_bytes" as const],
      max_actions: 1,
      max_output_bytes: 1_024,
    },
    redaction_profile: "no-secrets-v1" as const,
    reason: "strict authored action is allowed",
    ...(confirmationSecret
      ? {
          confirmation_authority: {
            key_id: "strict-confirmation-key",
            secret_env: "STRICT_CONFIRMATION_SECRET",
            allowed_confirmers: ["human:strict-reviewer"],
          },
        }
      : {}),
  };
  const oracle = {
    schema_version: 1 as const,
    id: "strict-oracle",
    type: "state-equals" as const,
    path: "ready",
    expected: true,
  };
  const metric = {
    schema_version: 1 as const,
    id: "strict-metric",
    aggregation: "mean" as const,
    required_slices: ["all"],
    uncertainty: "none" as const,
    source: {},
  };
  const treatments = [
    { schema_version: 1 as const, id: "strict-baseline", baseline: true, target: {
      source_revision: "strict", model: "strict", prompt_digest: "a".repeat(64),
      tool_digest: "b".repeat(64), harness_digest: "c".repeat(64),
    } },
    { schema_version: 1 as const, id: "strict-candidate", baseline: false, target: {
      source_revision: "strict", model: "strict", prompt_digest: "d".repeat(64),
      tool_digest: "e".repeat(64), harness_digest: "f".repeat(64),
    } },
  ];
  const simulatedScores = [
    { case_id: "case-a", treatment_id: "strict-baseline", metric_id: metric.id, slice: "all", value: 0 },
    { case_id: "case-b", treatment_id: "strict-candidate", metric_id: metric.id, slice: "all", value: 1 },
  ];
  const referenceScores = simulatedScores.map((row) => ({
    ...row,
    human_label: row.value,
    judge_label: row.value,
  }));
  const backdatedCalibration = withCalibration === "nonfixture-backdated";
  const calibrationEnabled = withCalibration !== false;
  const calibrationDefinition = {
    schema_version: 1 as const,
    id: "strict-calibration",
    simulation_id: "strict-simulation",
    dataset_id: "strict-dataset",
    treatment_ids: treatments.map((item) => item.id),
    metric_ids: [metric.id],
    simulated_scores_file: "product-evals/calibrations/strict.simulated.json",
    reference_scores_file: "product-evals/calibrations/strict.reference.json",
    reference: {
      kind: backdatedCalibration
        ? ("expert-labelled" as const)
        : ("framework-fixture" as const),
      label_digest: valueDigest(referenceScores),
      reference_window_end: backdatedCalibration
        ? "2026-07-01T00:00:00.000Z"
        : "2026-08-06T00:00:00.000Z",
      reviewer_identity: "strict-reviewer",
    },
    thresholds: {
      minimum_samples: 2,
      minimum_rank_correlation: 1,
      minimum_linear_correlation: 1,
      minimum_human_agreement: 1,
    },
    required_slices: ["all"],
    staleness_days: 30,
    framework_fixture: !backdatedCalibration,
  };
  const simulation: Record<string, unknown> = {
    schema_version: 1,
    id: "strict-simulation",
    simulation_scope: "product",
    title: "Strict terminal simulation",
    population_files: [],
  };
  if (calibrationEnabled) {
    Object.assign(simulation, {
      metric_files: ["product-evals/metrics/strict-metric.json"],
      treatment_files: treatments.map(
        (item) => `product-evals/treatments/${item.id}.json`,
      ),
      calibration_file: "product-evals/calibrations/strict-calibration.json",
    });
  }
  const frozenSources = [];
  const authorityClaims = [];
  const definitions = [];
  const sources: Array<{ path: string; value: unknown }> = [
    { path: "product-evals/campaigns/campaign-1.json", value: campaign },
    { path: campaign.evaluation_profile_file, value: profile },
    { path: campaign.simulation_file, value: simulation },
    { path: campaign.task_files[0]!, value: task },
    { path: campaign.policy_files[0]!, value: policy },
    { path: campaign.oracle_files[0]!, value: oracle },
    ...(rubric ? [{ path: profile.rubric_file!, value: rubric }] : []),
    ...(calibrationEnabled
      ? [
          { path: "product-evals/metrics/strict-metric.json", value: metric },
          ...treatments.map((item) => ({
            path: `product-evals/treatments/${item.id}.json`,
            value: item,
          })),
          {
            path: "product-evals/calibrations/strict-calibration.json",
            value: calibrationDefinition,
          },
          {
            path: calibrationDefinition.simulated_scores_file,
            value: simulatedScores,
          },
          {
            path: calibrationDefinition.reference_scores_file,
            value: referenceScores,
          },
        ]
      : []),
    ...claimDefinitions.map((claim) => ({
      path: `product-evals/claims/${claim.id}.json`,
      value: claim,
    })),
  ];
  for (const source of sources) {
    const frozenPath = `execution/source/${valueDigest(source.path)}.json`;
    await store.writeStageJson(frozenPath, source.value);
    const record = await store.artifactFileRecord(frozenPath);
    definitions.push({ path: source.path, sha256: record.sha256 });
    const claim = claimDefinitions.find(
      (candidate) => source.path === `product-evals/claims/${candidate.id}.json`,
    );
    if (claim) {
      authorityClaims.push({
        claim_id: claim.id,
        class: claim.class,
        source_path: source.path,
        source_sha256: record.sha256,
      });
    }
    frozenSources.push({
      ...record,
      source_path: source.path,
      producer: "simulation-operator",
      platform: "test-platform",
      frozen_at: "2026-08-06T00:00:00.000Z",
      redaction_profile: "source-code-v1",
      redaction_status: "CLEAN",
      lineage: { run_id: store.runId, source_digest: record.sha256 },
    });
  }
  const fixedFrozenPath = "execution/source/strict-fixed-runtime.source";
  await store.writeStageText(
    fixedFrozenPath,
    "strict fixed runtime fixture\n",
    { redaction_profile: "source-code-v1" },
  );
  const fixedRecord = await store.artifactFileRecord(fixedFrozenPath);
  for (const sourcePath of CAMPAIGN_FIXED_SOURCE_FILES) {
    const record = fixedRecord;
    definitions.push({ path: sourcePath, sha256: record.sha256 });
    frozenSources.push({
      ...record,
      source_path: sourcePath,
      producer: "simulation-operator",
      platform: "test-platform",
      frozen_at: "2026-08-06T00:00:00.000Z",
      redaction_profile: "source-code-v1",
      redaction_status: "CLEAN",
      lineage: { run_id: store.runId, source_digest: record.sha256 },
    });
  }
  definitions.sort((left, right) => left.path.localeCompare(right.path));
  frozenSources.sort((left, right) => left.source_path.localeCompare(right.source_path));
  reservation.campaign_digest = valueDigest(definitions);
  await writeFile(
    resolve(store.runRoot, "reservation.json"),
    `${stableJson(reservation, true)}\n`,
    { mode: 0o600 },
  );
  const claimAuthority = {
    schema_version: 1,
    artifact_type: "campaign-claim-authority",
    ...identity,
    campaign_digest: reservation.campaign_digest,
    claims: authorityClaims,
  };
  await store.writeStageJson("execution/claim-authority.json", claimAuthority);
  const authorityRecord = await store.artifactFileRecord("execution/claim-authority.json");
  const sourceManifest = {
    schema_version: 3,
    ...identity,
    platform: "test-platform",
    source_revision: "strict-fixture",
    dirty_source: true,
    definitions,
    frozen_sources: frozenSources,
    source_digest: valueDigest(definitions),
    identity_envelope_digest: valueDigest(reservation.identities),
    claim_authority: {
      path: "execution/claim-authority.json",
      sha256: authorityRecord.sha256,
    },
  };
  const calibration = calibrationEnabled
    ? buildCalibrationAuthority({
        definition: calibrationDefinition,
        metrics: [metric],
        treatments,
        simulated_scores: simulatedScores,
        reference_scores: referenceScores,
        source_digests: definitions,
        run_id: store.runId,
        aggregator_identity: reservation.identities.aggregator.subject,
        evaluation_at: backdatedCalibration ? at(-7 * 86_400_000) : terminalAt,
      })
    : null;
  if (calibration) {
    await store.writeStageJson(
      `calibrations/${calibration.calibration_id}.json`,
      calibration,
    );
  }
  const projectedOutputBytes = Buffer.byteLength(stableJson({
    state: {},
    action: task.actions[0],
  }));
  const confirmationReceipt = confirmationSecret
    ? (() => {
        const unsigned = {
          schema_version: 2 as const,
          receipt_id: `${store.runId}-confirmation`,
          run_id: store.runId,
          policy_id: policy.id,
          policy_version: policy.version,
          policy_digest: valueDigest(policy),
          campaign_id: campaign.id,
          task_id: task.id,
          action_index: 0,
          action_binding_version: ACTION_BINDING_VERSION,
          action_binding_digest: actionBindingDigest(task.actions[0]!),
          decision: "CONFIRM" as const,
          issued_at: at(-2_000),
          expires_at: at(60_000),
          confirmed_by: "human:strict-reviewer",
          authority_key_id: "strict-confirmation-key",
        };
        return {
          ...unsigned,
          signature: signPolicyConfirmationReceipt(unsigned, confirmationSecret),
        };
      })()
    : null;
  const confirmationUsage: Record<string, {
    policy_id: string;
    action_binding_version: typeof ACTION_BINDING_VERSION;
    action_binding_digest: string;
    receipt_digest: string;
    consumed_at: string;
  }> = {};
  const policyDecision = confirmationReceipt
    ? resolvePolicyDecision([policy], {
        run_id: store.runId,
        campaign_id: campaign.id,
        task_id: task.id,
        task_kind: task.kind,
        driver_type: task.driver.type,
        action_index: 0,
        action: task.actions[0]!,
        projected_output_bytes: projectedOutputBytes,
        supported_budget_dimensions: ["action_count", "output_bytes"],
        redaction_capabilities: ["no-secrets-v1", "source-code-v1"],
        now: at(-1_800),
        confirmation_receipts: [confirmationReceipt],
        confirmation_secrets: { "strict-confirmation-key": confirmationSecret! },
        confirmation_usage: confirmationUsage,
        budget_usage: {},
      })
    : {
    decided_at: at(-1_800),
    action_index: 0,
    action_type: task.actions[0]!.type,
    action_binding_version: ACTION_BINDING_VERSION,
    action_binding_digest: actionBindingDigest(task.actions[0]!),
    policy_id: policy.id,
    policy_version: policy.version,
    policy_digest: valueDigest(policy),
    applicability: "APPLICABLE",
    effect: policy.effect,
    decision: "ALLOW",
    reason: policy.reason,
    redaction_profile: policy.redaction_profile,
    redaction_status: "REQUIRED",
    confirmation_receipt_id: null,
    confirmation_receipt_digest: null,
    budgets: {
      ...policy.budgets,
      consumed_before: { action_count: 0, output_bytes: 0 },
      consumed_after: { action_count: 1, output_bytes: projectedOutputBytes },
      remaining_after: {
        action_count: 0,
        output_bytes: policy.budgets.max_output_bytes - projectedOutputBytes,
      },
    },
    considered_policies: [{
      policy_id: policy.id,
      policy_version: policy.version,
      policy_digest: valueDigest(policy),
      applicability: "APPLICABLE",
    }],
      };
  if (confirmationReceipt) {
    consumePolicyBudget(policyDecision, {}, projectedOutputBytes);
  }
  if (confirmationReceipt) {
    const recordName = `${valueDigest(confirmationReceipt.receipt_id)}.json`;
    await store.writeStageJson(
      `execution/confirmation-receipts/${recordName}`,
      confirmationReceipt,
    );
    await store.writeStageJson(
      `execution/confirmation-usage/${recordName}`,
      {
        schema_version: 2,
        artifact_type: "campaign-confirmation-usage",
        ...identity,
        task_id: task.id,
        receipt_id: confirmationReceipt.receipt_id,
        usage: confirmationUsage[confirmationReceipt.receipt_id],
      },
    );
  }
  const oracleResult = {
    oracle_id: oracle.id,
    type: oracle.type,
    status: "PASS",
    expected: true,
    actual: true,
  };
  const taskResult = {
    task_id: task.id,
    kind: task.kind,
    driver: task.driver.type,
    required: task.required,
    status: "PASS",
    outcome: "SUCCEEDED",
    operator_identity: reservation.identities.operator.subject,
    target_actor_identity: reservation.identities.target.subject,
    platform: "test-platform",
    started_at: at(-2_000),
    completed_at: at(-1_100),
    duration_ms: 900,
    earliest_failure: null,
    side_effects: "KNOWN",
    final_state: { ready: true },
    dispatch: {
      status: "DISPATCHED",
      actions: [{
        action_index: 0,
        action_type: task.actions[0]!.type,
        action_binding_version: ACTION_BINDING_VERSION,
        action_binding_digest: actionBindingDigest(task.actions[0]!),
        dispatched_at: at(-1_700),
      }],
      uncertainty_reason: null,
    },
    cleanup: {
      status: "VERIFIED",
      attempted: true,
      verified: true,
      residual_resources: [],
      reason: null,
    },
    recovery: { status: "NOT_REQUIRED", attempted: false, reason: null },
    policy_decisions: [policyDecision],
    policy_decision_digest: valueDigest([policyDecision]),
    oracle_results: [oracleResult],
    events: [
      {
        event_type: "LIFECYCLE",
        type: "task-lifecycle",
        phase: "STARTED",
        sequence: 0,
        at: at(-2_000),
        task_id: task.id,
        driver: task.driver.type,
      },
      {
        event_type: "ADAPTER",
        type: "adapter",
        status: "READY",
        adapter_id: "builtin-fake",
        adapter_version: "1.0.0",
        capabilities: [
          "deterministic-state",
          "policy-actions",
          "cleanup-verified",
        ],
        reason: null,
        sequence: 1,
        at: at(-1_700),
        task_id: task.id,
        driver: task.driver.type,
      },
      {
        event_type: "ACTION",
        index: 0,
        type: task.actions[0]!.type,
        before: {},
        after: { ready: true },
        status: "PASS",
        reason: null,
        policy_decision: "ALLOW",
        sequence: 2,
        at: at(-1_600),
        task_id: task.id,
        driver: task.driver.type,
      },
      {
        event_type: "ORACLE",
        type: "oracle",
        oracle_id: oracle.id,
        status: "PASS",
        sequence: 3,
        at: at(-1_500),
        task_id: task.id,
        driver: task.driver.type,
      },
      {
        event_type: "CLEANUP",
        type: "cleanup",
        status: "VERIFIED",
        verified: true,
        residual_resources: [],
        reason: null,
        sequence: 4,
        at: at(-1_400),
        task_id: task.id,
        driver: task.driver.type,
      },
      {
        event_type: "LIFECYCLE",
        type: "task-lifecycle",
        phase: "COMPLETED",
        outcome: "SUCCEEDED",
        status: "PASS",
        sequence: 5,
        at: at(-1_100),
        task_id: task.id,
        driver: task.driver.type,
      },
    ],
    evidence: [],
  };
  const taskRoot = `execution/tasks/${task.id}`;
  await store.writeStageText(
    `${taskRoot}/events.jsonl`,
    `${taskResult.events.map((event) => stableJson(event)).join("\n")}\n`,
  );
  await store.writeStageJson(`${taskRoot}/policy-decisions.json`, taskResult.policy_decisions);
  await store.writeStageJson(`${taskRoot}/dispatch.json`, taskResult.dispatch);
  await store.writeStageJson(`${taskRoot}/oracle.json`, taskResult.oracle_results);
  await store.writeStageJson(`${taskRoot}/final-state.json`, taskResult.final_state);
  await store.writeStageJson(`${taskRoot}/recovery.json`, taskResult.recovery);
  await store.writeStageJson(`${taskRoot}/cleanup.json`, taskResult.cleanup);
  await store.writeStageJson(`execution/tasks/${task.id}/result.json`, taskResult);
  if (!Number.isInteger(journalEventCount) || journalEventCount < 5) {
    throw new Error("strict session journal requires at least five events");
  }
  const surfaceIdentity = {
    surface_id: `task:${task.id}`,
    kind: task.kind,
    context_id: `${store.runId}:${task.driver.type}:${task.id}`,
  };
  const sessionContract: SimulationSessionContract = {
    schema_version: 1,
    session_id: store.runId,
    purpose: campaign.purpose,
    initial_surfaces: [surfaceIdentity],
    authorized_surfaces: [surfaceIdentity],
    limits: {
      max_duration_ms: campaign.session.max_duration_ms,
      max_step_duration_ms: campaign.session.max_step_duration_ms,
      max_steps: campaign.session.max_steps,
      max_parallel_steps: campaign.session.max_parallel_steps,
      max_steps_per_episode: campaign.session.max_steps_per_episode,
      max_surfaces: campaign.session.max_surfaces,
      max_checkpoint_bytes: campaign.session.max_checkpoint_bytes,
    },
  };
  const contractDigest = simulationSessionContractDigest(sessionContract);
  const surfaces = [{
    ...surfaceIdentity,
    lifecycle: "READY" as const,
    generation: 0,
  }];
  const startedAt = at(-2_100);
  const checkpoint0: SimulationSessionCheckpoint<{
    task_results: Array<Record<string, unknown>>;
  }> = {
    schema_version: 1,
    checkpoint_id: `${store.runId}:checkpoint:00000000`,
    checkpoint_digest: "",
    contract_digest: contractDigest,
    session_id: store.runId,
    purpose: campaign.purpose,
    status: "RUNNING",
    reason: null,
    revision: 0,
    started_at: startedAt,
    updated_at: at(-2_000),
    episode: 1,
    episode_step_count: 0,
    step_count: 0,
    completed_step_ids: [],
    completed_idempotency_keys: [],
    last_batch_step_ids: [],
    surfaces,
    domain_state: { task_results: [] },
    last_event_digest: null,
  };
  checkpoint0.checkpoint_digest = simulationCheckpointDigest(checkpoint0);
  const sessionEvents: SimulationSessionEvent[] = [];
  let previousEventDigest: string | null = null;
  const appendSessionEvent = (
    value: Omit<SimulationSessionEvent, "sequence" | "previous_event_digest" | "event_digest">,
  ): SimulationSessionEvent => {
    const event: SimulationSessionEvent = {
      ...value,
      sequence: sessionEvents.length,
      previous_event_digest: previousEventDigest,
      event_digest: "",
    };
    event.event_digest = simulationEventDigest(event);
    sessionEvents.push(event);
    previousEventDigest = event.event_digest;
    return event;
  };
  appendSessionEvent({
    schema_version: 1,
    session_id: store.runId,
    contract_digest: contractDigest,
    event_type: "SESSION_STARTED",
    at: checkpoint0.updated_at,
    episode: 1,
    step_ids: [],
    surface_ids: [surfaceIdentity.surface_id],
    status: "RUNNING",
    reason: null,
    checkpoint_digest: checkpoint0.checkpoint_digest,
  });
  appendSessionEvent({
    schema_version: 1,
    session_id: store.runId,
    contract_digest: contractDigest,
    event_type: "EPISODE_STARTED",
    at: at(-1_999),
    episode: 1,
    step_ids: [],
    surface_ids: [],
    status: "RUNNING",
    reason: null,
  });
  for (let index = 0; index < journalEventCount - 5; index += 1) {
    appendSessionEvent({
      schema_version: 1,
      session_id: store.runId,
      contract_digest: contractDigest,
      event_type: "SESSION_RESUMED",
      at: at(-1_500),
      episode: 1,
      step_ids: [],
      surface_ids: [],
      status: "RUNNING",
      reason: null,
      checkpoint_digest: checkpoint0.checkpoint_digest,
    });
  }
  const stepBinding = {
    step_id: `task:${task.id}`,
    surface_id: surfaceIdentity.surface_id,
    required: task.required,
    idempotency_key_digest: valueDigest(`${store.runId}:task:${task.id}`),
    conflict_keys_digest: valueDigest([]),
    payload_digest: valueDigest(task),
  };
  const stepStarted = appendSessionEvent({
    schema_version: 1,
    session_id: store.runId,
    contract_digest: contractDigest,
    event_type: "STEP_STARTED",
    at: at(-1_200),
    episode: 1,
    step_ids: [stepBinding.step_id],
    surface_ids: [stepBinding.surface_id],
    step_bindings: [stepBinding],
    status: "RUNNING",
    reason: null,
  });
  const checkpoint1: SimulationSessionCheckpoint<{
    task_results: Array<Record<string, unknown>>;
  }> = {
    schema_version: 1,
    checkpoint_id: `${store.runId}:checkpoint:00000001`,
    checkpoint_digest: "",
    contract_digest: contractDigest,
    session_id: store.runId,
    purpose: campaign.purpose,
    status: "RUNNING",
    reason: null,
    revision: 1,
    started_at: startedAt,
    updated_at: at(-1_100),
    episode: 1,
    episode_step_count: 1,
    step_count: 1,
    completed_step_ids: [`task:${task.id}`],
    completed_idempotency_keys: [`${store.runId}:task:${task.id}`],
    last_batch_step_ids: [`task:${task.id}`],
    surfaces,
    domain_state: {
      task_results: [{
        task_id: task.id,
        required: task.required,
        status: taskResult.status,
        outcome: taskResult.outcome,
        result_digest: valueDigest(taskResult),
      }],
    },
    last_event_digest: stepStarted.event_digest,
  };
  checkpoint1.checkpoint_digest = simulationCheckpointDigest(checkpoint1);
  const stepCompleted = appendSessionEvent({
    schema_version: 1,
    session_id: store.runId,
    contract_digest: contractDigest,
    event_type: "STEP_COMPLETED",
    at: checkpoint1.updated_at,
    episode: 1,
    step_ids: [stepBinding.step_id],
    surface_ids: [stepBinding.surface_id],
    step_bindings: [stepBinding],
    status: checkpoint1.status,
    reason: checkpoint1.reason,
    checkpoint_digest: checkpoint1.checkpoint_digest,
  });
  const checkpoint: SimulationSessionCheckpoint<{
    task_results: Array<Record<string, unknown>>;
  }> = {
    ...checkpoint1,
    checkpoint_id: `${store.runId}:checkpoint:00000002`,
    checkpoint_digest: "",
    status: "ACHIEVED",
    reason: "all campaign tasks and required task oracles passed",
    revision: 2,
    updated_at: at(-1_000),
    last_event_digest: stepCompleted.event_digest,
  };
  checkpoint.checkpoint_digest = simulationCheckpointDigest(checkpoint);
  appendSessionEvent({
    schema_version: 1,
    session_id: store.runId,
    contract_digest: contractDigest,
    event_type: "SESSION_TERMINATED",
    at: checkpoint.updated_at,
    episode: 1,
    step_ids: [stepBinding.step_id],
    surface_ids: [stepBinding.surface_id],
    status: checkpoint.status,
    reason: checkpoint.reason,
    checkpoint_digest: checkpoint.checkpoint_digest,
  });
  const journalSegments = new Map<string, SimulationSessionEvent[]>();
  for (const event of sessionEvents) {
    const segment = String(Math.floor(event.sequence / 1_000)).padStart(8, "0");
    journalSegments.set(segment, [...(journalSegments.get(segment) ?? []), event]);
  }
  for (const [segment, events] of journalSegments) {
    await store.writeStageText(
      `execution/session/journal/${segment}.jsonl`,
      `${events.map((event) => stableJson(event)).join("\n")}\n`,
    );
  }
  await store.writeStageJson(
    "execution/session/checkpoints/00000000/00000000.json",
    checkpoint0,
  );
  await store.writeStageJson(
    "execution/session/checkpoints/00000000/00000001.json",
    checkpoint1,
  );
  await store.writeStageJson(
    "execution/session/checkpoints/00000000/00000002.json",
    checkpoint,
  );
  const execution = {
    schema_version: 1,
    ...identity,
    status: "PASS",
    source_manifest_digest: valueDigest(sourceManifest),
    retry_lineage_receipt_digest: null,
    cleanup_verified: true,
    created_at: at(-1_000),
    session: {
      status: checkpoint.status,
      purpose: checkpoint.purpose,
      episode_count: checkpoint.episode,
      step_count: checkpoint.step_count,
      checkpoint_digest: checkpoint.checkpoint_digest,
      surfaces: checkpoint.surfaces,
    },
    task_results: [{
      task_id: task.id,
      status: taskResult.status,
      outcome: taskResult.outcome,
      cleanup_status: taskResult.cleanup.status,
      recovery_status: taskResult.recovery.status,
      policy_decision_digest: taskResult.policy_decision_digest,
      result_digest: valueDigest(taskResult),
      handoff_receipt_digest: "",
    }],
  };
  await store.appendLifecycle({ status: "RUNNING" });
  await store.writeStageJson("execution/source-manifest.json", sourceManifest);
  const handoffReceiver =
    reservation.identities.specialized_evaluator ?? reservation.identities.evaluator;
  const handoff = {
    schema_version: 1,
    artifact_type: "runtime-handoff-receipt",
    receipt_id: `${store.runId}-${task.id}-handoff-offer`,
    run_id: store.runId,
    campaign_id: reservation.campaign_id,
    task_id: task.id,
    terminal_status: taskResult.outcome,
    task_result_digest: valueDigest(taskResult),
    source_manifest_digest: valueDigest(sourceManifest),
    evidence_manifest_digest: valueDigest(taskResult.evidence),
    recovery_receipt_digest: taskResult.recovery.status === "NOT_REQUIRED"
      ? null
      : valueDigest(taskResult.recovery),
    cleanup_receipt_digest: valueDigest(taskResult.cleanup),
    retry_lineage: {
      attempt: 1,
      parent_run_id: null,
      parent_handoff_receipt_digest: null,
    },
    required_inputs: [
      "execution/source-manifest.json",
      `execution/tasks/${task.id}/cleanup.json`,
      `execution/tasks/${task.id}/result.json`,
    ],
    artifact_references: [
      { path: "execution/source-manifest.json", sha256: valueDigest(sourceManifest) },
      { path: `execution/tasks/${task.id}/cleanup.json`, sha256: valueDigest(taskResult.cleanup) },
      { path: `execution/tasks/${task.id}/result.json`, sha256: valueDigest(taskResult) },
    ],
    proposed_next_owner: handoffReceiver.subject,
    proposed_next_gate: reservation.identities.specialized_evaluator
      ? "specialized-evaluation"
      : "general-evaluation",
    producer_principal: reservation.identities.operator,
    receiver_principal: handoffReceiver,
    disposition: "PENDING",
    offer_receipt_digest: null,
    receiving_receipt_digest: null,
    reason: "task execution is frozen and ready for independent evaluation",
    superseded_receipt_digest: null,
    changed_bound_inputs: [],
    created_at: at(-1_000),
  };
  execution.task_results[0]!.handoff_receipt_digest = valueDigest(handoff);
  await store.writeStageJson(`execution/tasks/${task.id}/handoff-offer.json`, handoff);
  await store.writeStageJson("execution/execution-receipt.json", execution);
  await store.appendTrustedLifecycle({
    status: "EVALUATING",
    provider,
    profile_id: profile.id,
    evaluator_identity: reservation.identities.evaluator.subject,
  });
  const evaluationId = `${store.runId}-evaluation`;
  const claimLedger = authorityClaims.map((claim) => ({
    claim_id: claim.claim_id,
    class: claim.class,
    status: "SUPPORTED",
    reason: "all declared non-compensating gates passed",
    evidence: [
      oracle.id,
      policy.id,
      "source-manifest",
      "execution-receipt",
      "task-result",
      "policy-decisions",
      "oracle",
      "cleanup",
      ...(calibration ? [calibration.calibration_id] : []),
    ],
  }));
  if (blockBeforeEvaluation) {
    const blocker = "strict evaluator unavailable";
    await store.writeStageJson("summary.json", {
      schema_version: 1,
      ...identity,
      execution_status: execution.status,
      mechanical_status: "PASS",
      evaluation_status: "BLOCKED",
      evaluation_provider: profile.provider,
      evaluation_profile_id: profile.id,
      evaluation_attempt: null,
      evaluation_blocker: blocker,
      calibration_status: calibration?.status ?? "NOT_RUN",
      release_eligible: false,
      campaign_status: "BLOCKED",
      execution_receipt_digest: valueDigest(execution),
      specialized_evaluation_receipt_digest: null,
      evaluation_receipt_digest: null,
      calibration_receipt_digest: calibration ? valueDigest(calibration) : null,
      aggregation_receipt_digest: null,
      completed_at: terminalAt,
    });
    await store.appendTrustedLifecycle({
      status: "BLOCKED",
      campaign_status: "BLOCKED",
      evaluation_attempt: null,
      reason: blocker,
    });
    return;
  }
  const requestInput = {
    schema_version: 1,
    evaluation_id: evaluationId,
    ...identity,
    source_manifest_digest: valueDigest(sourceManifest),
    execution_receipt_digest: valueDigest(execution),
    calibration_receipt_digest: calibration ? valueDigest(calibration) : null,
    operator_identity: reservation.identities.operator.subject,
    target_actor_identity: reservation.identities.target.subject,
    evaluator_identity: reservation.identities.evaluator.subject,
    principal_identities: {
      operator: reservation.identities.operator.subject,
      specialized_evaluator: null,
      evaluator: reservation.identities.evaluator.subject,
      aggregator: reservation.identities.aggregator.subject,
      target: reservation.identities.target.subject,
      simulator: reservation.identities.simulator.subject,
      recovery: reservation.identities.recovery.subject,
    },
    specialized_evaluation: null,
    profile,
    rubric,
    mechanical_evaluation: { claim_ledger: claimLedger, status: "PASS" },
  };
  const request = {
    ...requestInput,
    evaluation_input_digest: valueDigest(requestInput),
  };
  const requestPath = `evaluations/${evaluationId}/input/request.json`;
  const evidencePath = `evaluations/${evaluationId}/input/run/execution/execution-receipt.json`;
  await store.writeStageJson(requestPath, request);
  await store.writeStageJson(evidencePath, execution);
  const inputFiles = [
    { path: "request.json", sha256: (await store.artifactFileRecord(requestPath)).sha256 },
    { path: "run/execution/execution-receipt.json", sha256: (await store.artifactFileRecord(evidencePath)).sha256 },
  ];
  const inputManifest = {
    schema_version: 1,
    evaluation_id: evaluationId,
    evaluation_input_digest: request.evaluation_input_digest,
    files: inputFiles,
    manifest_digest: valueDigest(inputFiles),
  };
  await store.writeStageJson(
    `evaluations/${evaluationId}/input/input-manifest.json`,
    inputManifest,
  );
  const output = {
    schema_version: 3,
    evaluation_id: evaluationId,
    ...identity,
    source_manifest_digest: valueDigest(sourceManifest),
    execution_receipt_digest: valueDigest(execution),
    evaluation_input_digest: request.evaluation_input_digest,
    input_manifest_digest: inputManifest.manifest_digest,
    evaluator_identity: reservation.identities.evaluator.subject,
    status: "PASS",
    mechanical_gate_status: "PASS",
    claim_assessments: claimLedger.map(({ claim_id, status, reason, evidence }) => ({
      claim_id, status, reason, evidence,
    })),
    refinement_proposals: [],
    root_cause: "none",
    earliest_failure: null,
    residual_uncertainty: [],
    next_route: "independent review",
  };
  const trace = [
    stableJson({ type: "item.completed", item: { type: "agent_message", text: JSON.stringify(output) } }),
    stableJson({ type: "turn.completed", usage: {} }),
    "",
  ].join("\n");
  const tracePath = `evaluations/${evaluationId}/stdout.jsonl`;
  await store.writeStageText(tracePath, trace, {
    redaction_profile: "no-secrets-v1",
  });
  await store.writeStageJson(`evaluations/${evaluationId}/provider-output.json`, output);
  const evaluation = {
    schema_version: 3,
    evaluation_id: evaluationId,
    ...identity,
    operator_identity: reservation.identities.operator.subject,
    evaluator_identity: reservation.identities.evaluator.subject,
    principal_identities: request.principal_identities,
    specialized_evaluation: null,
    provider: "codex",
    profile_id: profile.id,
    profile_digest: valueDigest(profile),
    rubric_id: rubric?.id ?? null,
    rubric_digest: rubric ? valueDigest(rubric) : null,
    model: "model" in profile ? profile.model : null,
    reasoning_effort: "reasoning_effort" in profile
      ? profile.reasoning_effort
      : null,
    source_manifest_digest: valueDigest(sourceManifest),
    execution_receipt_digest: valueDigest(execution),
    calibration_receipt_digest: calibration ? valueDigest(calibration) : null,
    evaluation_input_digest: request.evaluation_input_digest,
    input_manifest_digest: inputManifest.manifest_digest,
    provider_trace_digest: (await store.artifactFileRecord(tracePath)).sha256,
    provider_output_digest: valueDigest(output),
    refinement_proposal_bindings: [],
    usage: {},
    claim_ledger: claimLedger,
    status: "PASS",
    root_cause: "none",
    earliest_failure: null,
    residual_uncertainty: [],
    next_route: "independent review",
    created_at: terminalAt,
  };
  const releaseClaims = claimLedger
    .filter((claim) => claim.class === "release-eligibility")
    .map((claim) => ({ claim_id: claim.claim_id, status: claim.status }));
  const aggregation = {
    schema_version: 2,
    aggregation_id: `${store.runId}-aggregation`,
    ...identity,
    aggregator_identity: reservation.identities.aggregator.subject,
    execution_receipt_digest: valueDigest(execution),
    specialized_evaluation_receipt_digest: null,
    evaluation_receipt_digest: valueDigest(evaluation),
    calibration_receipt_digest: calibration ? valueDigest(calibration) : null,
    release_eligible: releaseClaims.length > 0,
    release_claims: releaseClaims,
    status: "PASS",
    created_at: terminalAt,
  };
  await store.writeStageJson(`evaluations/${evaluationId}/receipt.json`, evaluation);
  const evaluationPath = `evaluations/${evaluationId}/receipt.json`;
  const handoffReferences = [
    ...handoff.artifact_references,
    { path: evaluationPath, sha256: valueDigest(evaluation) },
  ].sort((left, right) => left.path.localeCompare(right.path));
  await store
    .withAuthority(reservation.identities.evaluator)
    .writeRuntimeHandoffAcceptance(`execution/tasks/${task.id}/handoff.json`, {
    ...handoff,
    receipt_id: `${store.runId}-${task.id}-handoff`,
    required_inputs: handoffReferences.map((reference) => reference.path),
    artifact_references: handoffReferences,
    disposition: "ACCEPTED",
    reason: "receiving gate recorded general evaluation evidence",
    offer_receipt_digest: valueDigest(handoff),
    receiving_receipt_digest: valueDigest(evaluation),
  });
  await store.writeStageJson(`aggregations/${store.runId}-aggregation.json`, aggregation);
  await store.writeStageJson("summary.json", {
    schema_version: 1,
    ...identity,
    execution_status: "PASS",
    evaluation_status: "PASS",
    evaluation_provider: "codex",
    evaluation_profile_id: profile.id,
    evaluation_model: "model" in profile ? profile.model : null,
    evaluation_attempt: null,
    calibration_status: calibration?.status ?? "NOT_RUN",
    calibration_scope: calibration?.framework_fixture
      ? "framework-fixture"
      : calibration
        ? calibration.source_kind
        : "none",
    release_eligible: aggregation.release_eligible,
    campaign_status: "PASS",
    execution_receipt_digest: valueDigest(execution),
    specialized_evaluation_receipt_digest: null,
    evaluation_receipt_digest: valueDigest(evaluation),
    calibration_receipt_digest: calibration ? valueDigest(calibration) : null,
    aggregation_receipt_digest: valueDigest(aggregation),
    completed_at: terminalAt,
  });
  await store.appendTrustedLifecycle({
    status: "COMPLETED",
  });
}

async function seedLegacyRun(root: string, runId: string) {
  const runRoot = resolve(root, runId);
  const identity = identities();
  const { schema_version: _identityVersion, specialized_evaluator: _specializedEvaluator, ...legacyIdentity } = identity;
  await mkdir(runRoot, { mode: 0o700 });
  const reservation = {
    schema_version: "1.0.0",
    artifact_type: "campaign-run-reservation",
    run_id: runId,
    campaign_id: "campaign-legacy",
    campaign_digest: "legacy-digest",
    attempt: 1,
    parent_run_id: null,
    reserved_at: "2026-08-01T00:00:00.000Z",
    identities: legacyIdentity,
    lease: {
      lease_id: "legacy-lease",
      owner_session_id: identity.operator.session_id,
      acquired_at: "2026-08-01T00:00:00.000Z",
      expires_at: "2026-08-01T00:01:00.000Z",
      recovery_mode: "FINALIZE_UNKNOWN_OUTCOME",
    },
  };
  const leaseState = {
    schema_version: "1.0.0",
    artifact_type: "campaign-run-lease",
    run_id: runId,
    generation: 0,
    renewed_at: reservation.lease.acquired_at,
    ...reservation.lease,
  };
  const terminalLock = {
    schema_version: "1.0.0",
    run_id: runId,
    status: "COMPLETED",
    locked_at: "2026-08-01T00:00:30.000Z",
    locked_by: identity.operator,
  };
  const contents = new Map([
    ["reservation.json", `${stableJson(reservation, true)}\n`],
    ["lease.json", `${stableJson(leaseState, true)}\n`],
    ["lifecycle.jsonl", `${stableJson({ status: "COMPLETED" })}\n`],
    ["terminal.lock", `${stableJson(terminalLock, true)}\n`],
  ]);
  const files = [...contents.entries()]
    .map(([path, text]) => ({
      path,
      sha256: sha256Text(text),
      size: Buffer.byteLength(text, "utf8"),
    }))
    .sort((left, right) => left.path.localeCompare(right.path));
  for (const [path, text] of contents) {
    await writeFile(resolve(runRoot, path), text, { mode: 0o600 });
  }
  const finalization = {
    schema_version: "1.0.0",
    artifact_type: "campaign-run-finalization",
    run_id: runId,
    status: "COMPLETED",
    finalized_at: terminalLock.locked_at,
    finalized_by: identity.operator,
    recovery_reason: null,
    files,
    manifest_digest: sha256Text(stableJson(files)),
  };
  const finalizationPath = resolve(runRoot, "finalization.json");
  const leaseStatePath = resolve(runRoot, "lease.json");
  const reservationPath = resolve(runRoot, "reservation.json");
  const terminalLockPath = resolve(runRoot, "terminal.lock");
  await writeFile(
    finalizationPath,
    `${stableJson(finalization, true)}\n`,
    { mode: 0o600 },
  );
  return {
    finalization,
    finalizationPath,
    identity,
    leaseState,
    leaseStatePath,
    reservation,
    reservationPath,
    store: new CampaignArtifactStore(root, runId),
    terminalLock,
    terminalLockPath,
  };
}

async function rewriteLegacyManifestArtifact(
  seeded: Awaited<ReturnType<typeof seedLegacyRun>>,
  artifactPath: "reservation.json" | "lease.json",
  value: unknown,
): Promise<void> {
  const text = `${stableJson(value, true)}\n`;
  const targetPath =
    artifactPath === "reservation.json"
      ? seeded.reservationPath
      : seeded.leaseStatePath;
  await writeFile(targetPath, text, { mode: 0o600 });
  const finalization = structuredClone(seeded.finalization);
  const record = finalization.files.find((file) => file.path === artifactPath);
  if (!record) throw new Error(`missing legacy file record: ${artifactPath}`);
  record.sha256 = sha256Text(text);
  record.size = Buffer.byteLength(text, "utf8");
  finalization.manifest_digest = sha256Text(stableJson(finalization.files));
  await writeFile(
    seeded.finalizationPath,
    `${stableJson(finalization, true)}\n`,
    { mode: 0o600 },
  );
}

async function seedCurrentRun(root: string, runId: string) {
  const identity = identities();
  const store = await authorizedStore(root, runId, identity);
  await seedCompletedRun(store);
  await store.finalize({ status: "COMPLETED", finalized_by: identity.operator });
  const finalizationPath = resolve(store.runRoot, "finalization.json");
  const leaseStatePath = resolve(store.runRoot, "lease.json");
  const terminalLockPath = resolve(store.runRoot, "terminal.lock");
  return {
    finalization: JSON.parse(await readFile(finalizationPath, "utf8")),
    finalizationPath,
    identity,
    leaseState: JSON.parse(await readFile(leaseStatePath, "utf8")),
    leaseStatePath,
    store,
    terminalLock: JSON.parse(await readFile(terminalLockPath, "utf8")),
    terminalLockPath,
  };
}

function replaceArtifactRecord(
  files: Array<{ path: string; sha256: string; size: number }>,
  path: string,
  text: string,
): void {
  const record = files.find((candidate) => candidate.path === path);
  if (!record) throw new Error(`missing current file record: ${path}`);
  record.sha256 = sha256Text(text);
  record.size = Buffer.byteLength(text, "utf8");
}

async function rewriteCurrentLeaseAndLinkage(
  seeded: Awaited<ReturnType<typeof seedCurrentRun>>,
  leaseState: unknown,
): Promise<void> {
  const leaseText = `${stableJson(leaseState, true)}\n`;
  await writeFile(seeded.leaseStatePath, leaseText, { mode: 0o600 });

  const terminalLock = structuredClone(seeded.terminalLock);
  replaceArtifactRecord(terminalLock.application_files, "lease.json", leaseText);
  terminalLock.application_manifest_digest = sha256Text(
    stableJson(terminalLock.application_files),
  );
  const terminalText = `${stableJson(terminalLock, true)}\n`;
  await writeFile(seeded.terminalLockPath, terminalText, { mode: 0o600 });

  const finalization = structuredClone(seeded.finalization);
  replaceArtifactRecord(finalization.application_files, "lease.json", leaseText);
  finalization.application_manifest_digest = sha256Text(
    stableJson(finalization.application_files),
  );
  replaceArtifactRecord(finalization.files, "lease.json", leaseText);
  replaceArtifactRecord(finalization.files, "terminal.lock", terminalText);
  finalization.terminal_lock_digest = sha256Text(terminalText);
  finalization.manifest_digest = sha256Text(stableJson(finalization.files));
  await writeFile(
    seeded.finalizationPath,
    `${stableJson(finalization, true)}\n`,
    { mode: 0o600 },
  );
}

async function rewriteCurrentReservationAndLinkage(
  seeded: Awaited<ReturnType<typeof seedCurrentRun>>,
  reservation: unknown,
): Promise<void> {
  const reservationPath = resolve(seeded.store.runRoot, "reservation.json");
  const reservationText = `${stableJson(reservation, true)}\n`;
  await writeFile(reservationPath, reservationText, { mode: 0o600 });

  const terminalLock = structuredClone(seeded.terminalLock);
  replaceArtifactRecord(
    terminalLock.application_files,
    "reservation.json",
    reservationText,
  );
  terminalLock.application_manifest_digest = sha256Text(
    stableJson(terminalLock.application_files),
  );
  const terminalText = `${stableJson(terminalLock, true)}\n`;
  await writeFile(seeded.terminalLockPath, terminalText, { mode: 0o600 });

  const finalization = structuredClone(seeded.finalization);
  replaceArtifactRecord(
    finalization.application_files,
    "reservation.json",
    reservationText,
  );
  finalization.application_manifest_digest = sha256Text(
    stableJson(finalization.application_files),
  );
  replaceArtifactRecord(finalization.files, "reservation.json", reservationText);
  replaceArtifactRecord(finalization.files, "terminal.lock", terminalText);
  finalization.terminal_lock_digest = sha256Text(terminalText);
  finalization.manifest_digest = sha256Text(stableJson(finalization.files));
  await writeFile(
    seeded.finalizationPath,
    `${stableJson(finalization, true)}\n`,
    { mode: 0o600 },
  );
}

async function rewriteCurrentTerminalAndLinkage(
  seeded: Awaited<ReturnType<typeof seedCurrentRun>>,
  terminalLock: unknown,
): Promise<void> {
  const terminalText = `${stableJson(terminalLock, true)}\n`;
  await writeFile(seeded.terminalLockPath, terminalText, { mode: 0o600 });
  const finalization = structuredClone(seeded.finalization);
  replaceArtifactRecord(finalization.files, "terminal.lock", terminalText);
  finalization.terminal_lock_digest = sha256Text(terminalText);
  finalization.manifest_digest = sha256Text(stableJson(finalization.files));
  await writeFile(
    seeded.finalizationPath,
    `${stableJson(finalization, true)}\n`,
    { mode: 0o600 },
  );
}

async function rewritePostIntentRecoveryReceiptAndLinkage(
  store: CampaignArtifactStore,
  relativePath: string,
  receipt: unknown,
): Promise<void> {
  const receiptText = `${stableJson(receipt, true)}\n`;
  await writeFile(resolve(store.runRoot, relativePath), receiptText, {
    mode: 0o600,
  });
  const finalizationPath = resolve(store.runRoot, "finalization.json");
  const finalization = JSON.parse(await readFile(finalizationPath, "utf8"));
  replaceArtifactRecord(
    finalization.post_intent_recovery_files,
    relativePath,
    receiptText,
  );
  finalization.post_intent_recovery_manifest_digest = sha256Text(
    stableJson(finalization.post_intent_recovery_files),
  );
  replaceArtifactRecord(finalization.files, relativePath, receiptText);
  finalization.manifest_digest = sha256Text(stableJson(finalization.files));
  await writeFile(
    finalizationPath,
    `${stableJson(finalization, true)}\n`,
    { mode: 0o600 },
  );
}

async function rewriteCurrentTakeoverHistoryAndLinkage(
  seeded: Awaited<ReturnType<typeof seedCurrentRun>>,
  entries: Array<{ generation: number; receipt: unknown }>,
  currentLease: unknown,
  heartbeatEvents: unknown[] = [],
): Promise<void> {
  const receiptRecords: Array<{ path: string; sha256: string; size: number }> = [];
  const takeoverDirectory = resolve(
    seeded.store.runRoot,
    "recovery/lease-takeovers",
  );
  await mkdir(takeoverDirectory, { recursive: true, mode: 0o700 });
  for (const entry of entries) {
    const path = `recovery/lease-takeovers/${String(entry.generation).padStart(8, "0")}.json`;
    const text = `${stableJson(entry.receipt, true)}\n`;
    await writeFile(resolve(seeded.store.runRoot, path), text, { mode: 0o600 });
    receiptRecords.push({
      path,
      sha256: sha256Text(text),
      size: Buffer.byteLength(text, "utf8"),
    });
  }

  const leaseText = `${stableJson(currentLease, true)}\n`;
  await writeFile(seeded.leaseStatePath, leaseText, { mode: 0o600 });
  const applicationFiles = [
    ...structuredClone(seeded.terminalLock.application_files),
    ...receiptRecords,
  ];
  replaceArtifactRecord(applicationFiles, "lease.json", leaseText);
  if (heartbeatEvents.length) {
    const lifecyclePath = resolve(seeded.store.runRoot, "lifecycle.jsonl");
    const lifecycleLines = (await readFile(lifecyclePath, "utf8"))
      .split(/\r?\n/)
      .filter(Boolean);
    const terminalIndex = lifecycleLines.findLastIndex((line) =>
      line.includes('"status":"COMPLETED"')
    );
    const insertionIndex = terminalIndex < 0 ? lifecycleLines.length : terminalIndex;
    lifecycleLines.splice(
      insertionIndex,
      0,
      ...heartbeatEvents.map((event) => stableJson(event)),
    );
    const lifecycleText = `${lifecycleLines.join("\n")}\n`;
    await writeFile(lifecyclePath, lifecycleText, { mode: 0o600 });
    replaceArtifactRecord(
      applicationFiles,
      "lifecycle.jsonl",
      lifecycleText,
    );
  }
  applicationFiles.sort((left, right) => left.path.localeCompare(right.path));

  const terminalLock = structuredClone(seeded.terminalLock);
  terminalLock.application_files = applicationFiles;
  terminalLock.application_manifest_digest = sha256Text(
    stableJson(applicationFiles),
  );
  const terminalText = `${stableJson(terminalLock, true)}\n`;
  await writeFile(seeded.terminalLockPath, terminalText, { mode: 0o600 });

  const terminalRecord = {
    path: "terminal.lock",
    sha256: sha256Text(terminalText),
    size: Buffer.byteLength(terminalText, "utf8"),
  };
  const finalization = structuredClone(seeded.finalization);
  finalization.application_files = structuredClone(applicationFiles);
  finalization.application_manifest_digest = sha256Text(
    stableJson(applicationFiles),
  );
  finalization.files = [...applicationFiles, terminalRecord].sort((left, right) =>
    left.path.localeCompare(right.path)
  );
  finalization.terminal_lock_digest = terminalRecord.sha256;
  finalization.manifest_digest = sha256Text(stableJson(finalization.files));
  await writeFile(
    seeded.finalizationPath,
    `${stableJson(finalization, true)}\n`,
    { mode: 0o600 },
  );
}

function currentTakeoverReceipt(
  seeded: Awaited<ReturnType<typeof seedCurrentRun>>,
  previousLease: Record<string, unknown>,
  replacementLease: Record<string, unknown>,
  createdAt = String(replacementLease.acquired_at),
) {
  return {
    schema_version: CAMPAIGN_ARTIFACT_SCHEMA_VERSION,
    artifact_type: "campaign-lease-takeover",
    run_id: seeded.store.runId,
    previous_lease: previousLease,
    previous_lease_digest: sha256Text(stableJson(previousLease)),
    previous_generation: previousLease.generation,
    replacement_lease: replacementLease,
    recovery_identity: seeded.identity.recovery,
    reason: "operator lease expired",
    created_at: createdAt,
  };
}

afterEach(async () => {
  for (const root of temporaryRoots.splice(0)) {
    await rm(root, { recursive: true, force: true });
  }
});

describe("CampaignArtifactStore", () => {
  test("allows exactly one concurrent reservation winner", async () => {
    const root = await temporaryRoot();
    const first = new CampaignArtifactStore(root, "run-race");
    const second = new CampaignArtifactStore(root, "run-race");
    const results = await Promise.allSettled([
      first.reserve(reservationInput()),
      second.reserve(reservationInput()),
    ]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(
      1,
    );
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(
      1,
    );
  });

  test("serializes 512 batched contending writers without transient lock-release failures", async () => {
    const root = await temporaryRoot();
    const identity = identities();
    const store = await authorizedStore(root, "run-lock-contention", identity);
    const rejected: PromiseRejectedResult[] = [];
    for (let batch = 0; batch < 32; batch += 1) {
      const results = await Promise.allSettled(
        Array.from({ length: 16 }, (_, offset) => {
          const index = batch * 16 + offset;
          return store.writeStageJson(`execution/contention-${index}.json`, {
            index,
          });
        }),
      );
      rejected.push(...results.filter(
        (result): result is PromiseRejectedResult => result.status === "rejected",
      ));
    }
    expect(rejected.map((result) => String(result.reason))).toEqual([]);
    expect(
      (await store.listArtifactFiles()).filter((path) =>
        path.startsWith("execution/contention-")
      ),
    ).toHaveLength(512);
  }, 30_000);

  test("retries governing lease identity substitution before the first mutation", async () => {
    const root = await temporaryRoot();
    const store = await authorizedStore(root, "run-governance-substitution");
    const internal = store as any;
    const originalAssert = internal.assertMutationGovernanceCurrent.bind(store);
    let substituted = false;
    let staleSnapshotRejected = false;
    internal.assertMutationGovernanceCurrent = async (expected: unknown) => {
      if (!substituted) {
        substituted = true;
        const leasePath = resolve(store.runRoot, "lease.json");
        const parkedPath = resolve(store.runRoot, "lease.parked.json");
        const bytes = await readFile(leasePath);
        await rename(leasePath, parkedPath);
        await writeFile(leasePath, bytes, { mode: 0o600 });
      }
      try {
        return await originalAssert(expected);
      } catch (error) {
        staleSnapshotRejected = true;
        throw error;
      }
    };
    await store.writeStageJson("execution/revalidated.json", { safe: true });
    expect(staleSnapshotRejected).toBe(true);
    expect(
      JSON.parse(
        await readFile(resolve(store.runRoot, "execution/revalidated.json"), "utf8"),
      ),
    ).toEqual({ safe: true });
    expect(
      await stat(resolve(root, ".run-governance-substitution.mutation.lock")).catch(
        () => null,
      ),
    ).toBeNull();
  });

  test("does not mask an unsafe mutation-lock replacement as transient contention", async () => {
    const root = await temporaryRoot();
    const store = await authorizedStore(root, "run-unsafe-lock-replacement");
    const lockPath = resolve(root, ".run-unsafe-lock-replacement.mutation.lock");
    await symlink(resolve(store.runRoot, "lease.json"), lockPath);
    await expect(
      store.writeStageJson("execution/must-not-exist.json", { unsafe: true }),
    ).rejects.toThrow();
    expect(
      await stat(resolve(store.runRoot, "execution/must-not-exist.json")).catch(
        () => null,
      ),
    ).toBeNull();
    expect((await lstat(lockPath)).isSymbolicLink()).toBe(true);
  });

  test("refuses retry overwrite and preserves the first reservation", async () => {
    const root = await temporaryRoot();
    const store = new CampaignArtifactStore(root, "run-retry");
    await store.reserve(reservationInput());
    const path = resolve(store.runRoot, "reservation.json");
    const before = await readFile(path, "utf8");

    await expect(
      store.reserve({ ...reservationInput(), campaign_digest: "changed" }),
    ).rejects.toBeInstanceOf(CascadeError);
    expect(await readFile(path, "utf8")).toBe(before);
  });

  test("orders distinct sub-millisecond RFC 3339 lease timestamps exactly", async () => {
    const root = await temporaryRoot();
    const input = reservationInput();
    input.lease.acquired_at = "2099-07-30T10:00:00.123456789Z";
    input.lease.expires_at = "2099-07-30T10:00:00.123456790+00:00";
    const store = new CampaignArtifactStore(root, "run-high-precision-time");
    await store.reserve(input);

    expect(await store.readCurrentLease()).toMatchObject({
      acquired_at: input.lease.acquired_at,
      expires_at: input.lease.expires_at,
      renewed_at: input.lease.acquired_at,
    });

    const reversed = reservationInput();
    reversed.lease.acquired_at = "2099-07-30T10:00:00.123456790Z";
    reversed.lease.expires_at = "2099-07-30T10:00:00.123456789Z";
    await expect(
      new CampaignArtifactStore(root, "run-reversed-high-precision-time")
        .reserve(reversed),
    ).rejects.toThrow("campaign lease must expire after it is acquired");
  });

  test("renews the operator lease with a monotonic heartbeat generation", async () => {
    const root = await temporaryRoot();
    const identity = identities();
    const now = new Date();
    const input = reservationInput(identity);
    input.lease.acquired_at = new Date(now.getTime() - 1_000).toISOString();
    input.lease.expires_at = new Date(now.getTime() + 60_000).toISOString();
    const base = new CampaignArtifactStore(root, "run-heartbeat");
    await base.reserve(input);
    const store = base.withAuthority(identity.operator, "lease-1");
    const renewed = await store.renewLease(
      10 * 60_000,
      now,
    );

    expect(renewed).toMatchObject({
      run_id: "run-heartbeat",
      lease_id: "lease-1",
      generation: 1,
      renewed_at: now.toISOString(),
      expires_at: new Date(now.getTime() + 10 * 60_000).toISOString(),
    });
    expect(await store.readCurrentLease()).toEqual(renewed);
    expect(await readFile(resolve(store.runRoot, "lifecycle.jsonl"), "utf8"))
      .toContain('"status":"HEARTBEAT"');
    await seedCompletedRun(store);
    await store.finalize({ status: "COMPLETED", finalized_by: identity.operator });
    await expect(store.verify()).resolves.toMatchObject({ status: "VALID" });
  });

  test("allows only the reserved recovery identity to replace an expired lease", async () => {
    const root = await temporaryRoot();
    const identity = identities();
    const input = reservationInput(identity);
    input.lease.acquired_at = "2026-08-04T10:00:00.000Z";
    input.lease.expires_at = "2026-08-04T10:01:00.000Z";
    const base = new CampaignArtifactStore(root, "run-takeover");
    await base.reserve(input);
    const expiredLease = await base.readCurrentLease();

    await expect(
      base.withAuthority(identity.operator, "lease-1").takeoverExpiredLease({
        lease_id: "lease-2",
        ttl_ms: 60_000,
        reason: "operator process exited",
        now: new Date("2026-08-04T10:02:00.000Z"),
      }),
    ).rejects.toThrow("reserved recovery identity");

    const replacement = await base
      .withAuthority(identity.recovery)
      .takeoverExpiredLease({
        lease_id: "lease-2",
        ttl_ms: 60_000,
        reason: "operator process exited",
        now: new Date("2099-07-30T10:02:00.000Z"),
      });
    expect(replacement).toMatchObject({
      lease_id: "lease-2",
      owner_session_id: identity.operator.session_id,
      generation: 1,
      renewed_at: "2099-07-30T10:02:00.000Z",
      expires_at: "2099-07-30T10:03:00.000Z",
    });
    expect(
      JSON.parse(
        await readFile(
          resolve(
            base.runRoot,
            "recovery/lease-takeovers/00000001.json",
          ),
          "utf8",
        ),
      ),
    ).toMatchObject({
      previous_generation: 0,
      replacement_lease: { lease_id: "lease-2", generation: 1 },
      recovery_identity: identity.recovery,
    });
    await writeFile(
      resolve(base.runRoot, "lease.json"),
      `${JSON.stringify(expiredLease)}\n`,
      "utf8",
    );
    expect(
      await base.withAuthority(identity.recovery).takeoverExpiredLease({
        lease_id: "lease-2",
        ttl_ms: 60_000,
        reason: "operator process exited",
        now: new Date("2099-07-30T10:02:30.000Z"),
      }),
    ).toEqual(replacement);
    await base
      .withAuthority(identity.operator, "lease-2")
      .appendLifecycle({ status: "RESUMED" });
  });

  test("refuses takeover while the current operator lease is active", async () => {
    const root = await temporaryRoot();
    const identity = identities();
    const base = new CampaignArtifactStore(root, "run-active-takeover");
    await base.reserve(reservationInput(identity));

    await expect(
      base.withAuthority(identity.recovery).takeoverExpiredLease({
        lease_id: "lease-2",
        ttl_ms: 60_000,
        reason: "unsafe concurrent resume",
        now: new Date("2099-07-30T10:30:00.000Z"),
      }),
    ).rejects.toThrow("still active");
  });

  test("persists append-only session events and revisioned checkpoints", async () => {
    const root = await temporaryRoot();
    const store = await authorizedStore(root, "run-session");
    const checkpoint: SimulationSessionCheckpoint<{ completed: string[] }> = {
      schema_version: 1,
      checkpoint_id: "run-session:checkpoint:00000000",
      checkpoint_digest: "",
      contract_digest: "",
      session_id: "run-session",
      purpose: "exercise several surfaces",
      status: "RUNNING",
      reason: null,
      revision: 0,
      started_at: "2099-07-30T10:00:00.000Z",
      updated_at: "2099-07-30T10:00:00.000Z",
      episode: 1,
      episode_step_count: 0,
      step_count: 0,
      completed_step_ids: [],
      completed_idempotency_keys: [],
      last_batch_step_ids: [],
      surfaces: [
        {
          surface_id: "browser:fixture",
          kind: "browser",
          context_id: "browser-context",
          lifecycle: "READY",
          generation: 0,
        },
      ],
      domain_state: { completed: [] },
      last_event_digest: null,
    };
    checkpoint.checkpoint_digest = simulationCheckpointDigest(checkpoint);
    const sessionContract: SimulationSessionContract = {
      schema_version: 1,
      session_id: "run-session",
      purpose: "exercise several surfaces",
      initial_surfaces: [{
        surface_id: "browser:fixture",
        kind: "browser",
        context_id: "browser-context",
      }],
      authorized_surfaces: [{
        surface_id: "browser:fixture",
        kind: "browser",
        context_id: "browser-context",
      }],
      limits: {
        max_duration_ms: 60_000,
        max_step_duration_ms: 5_000,
        max_steps: 10,
        max_parallel_steps: 2,
        max_steps_per_episode: 5,
        max_surfaces: 8,
        max_checkpoint_bytes: 128 * 1024,
      },
    };
    checkpoint.contract_digest = simulationSessionContractDigest(sessionContract);
    checkpoint.checkpoint_digest = simulationCheckpointDigest(checkpoint);
    const event: SimulationSessionEvent = {
      schema_version: 1,
      session_id: "run-session",
      contract_digest: simulationSessionContractDigest(sessionContract),
      sequence: 0,
      event_type: "SESSION_STARTED",
      at: "2099-07-30T10:00:00.000Z",
      episode: 1,
      step_ids: [],
      surface_ids: ["browser:fixture"],
      status: "RUNNING",
      reason: null,
      checkpoint_digest: checkpoint.checkpoint_digest,
      previous_event_digest: null,
      event_digest: "",
    };
    event.event_digest = simulationEventDigest(event);

    await store.writeSessionCheckpoint(checkpoint);
    await store.appendSessionEvent(event);
    expect(await store.readLatestSessionCheckpoint()).toEqual(checkpoint);
    expect(await store.readSessionEvents()).toEqual([event]);
    expect(
      await readFile(
        resolve(
          store.runRoot,
          "execution/session/journal/00000000.jsonl",
        ),
        "utf8",
      ),
    ).toContain(event.event_digest);
    expect(
      await readFile(
        resolve(
          store.runRoot,
          "execution/session/checkpoints/00000000/00000000.json",
        ),
        "utf8",
      ),
    ).toContain(checkpoint.checkpoint_digest);
    await expect(store.writeSessionCheckpoint(checkpoint)).rejects.toBeTruthy();
  });

  test("fails closed on oversized structured run artifacts", async () => {
    const root = await temporaryRoot();
    const writer = await authorizedStore(root, "run-oversized-write");
    const oversizedValue = "x".repeat(DEFAULT_EVIDENCE_LIMIT_BYTES + 1);
    await expect(
      writer.writeStageJson("execution/oversized.json", {
        value: oversizedValue,
      }),
    ).rejects.toThrow(
      `artifact stage JSON execution/oversized.json exceeds ${DEFAULT_EVIDENCE_LIMIT_BYTES} bytes`,
    );
    await expect(
      writer.appendLifecycle({ value: oversizedValue }),
    ).rejects.toThrow(
      `campaign lifecycle exceeds ${DEFAULT_EVIDENCE_LIMIT_BYTES} bytes`,
    );
    await expect(
      writer.writeStageJson("execution/pretty-expansion.json", {
        values: Array(1_400_000),
      }),
    ).rejects.toThrow(
      `artifact stage JSON execution/pretty-expansion.json exceeds ${DEFAULT_EVIDENCE_LIMIT_BYTES} bytes`,
    );

    const store = await authorizedStore(root, "run-oversized-structured");
    await writeFile(
      resolve(store.runRoot, "reservation.json"),
      Buffer.alloc(DEFAULT_EVIDENCE_LIMIT_BYTES + 1, "x"),
      { mode: 0o600 },
    );
    await expect(store.readReservation()).rejects.toThrow(
      `campaign reservation exceeds ${DEFAULT_EVIDENCE_LIMIT_BYTES} bytes`,
    );

    const journalDirectory = resolve(
      store.runRoot,
      "execution/session/journal",
    );
    await mkdir(journalDirectory, { recursive: true, mode: 0o700 });
    await writeFile(
      resolve(journalDirectory, "00000000.jsonl"),
      Buffer.alloc(DEFAULT_EVIDENCE_LIMIT_BYTES + 1, "x"),
      { mode: 0o600 },
    );
    await expect(store.readSessionEvents()).rejects.toThrow(
      `simulation journal segment exceeds ${DEFAULT_EVIDENCE_LIMIT_BYTES} bytes`,
    );
  });

  test("rejects role-session collisions before reservation", async () => {
    const root = await temporaryRoot();
    const identity = identities({
      evaluator: {
        role: "simulation-evaluator",
        session_id: "operator-session",
        subject: "evaluator",
      },
    });
    const store = new CampaignArtifactStore(root, "run-identities");

    await expect(store.reserve(reservationInput(identity))).rejects.toThrow(
      "pairwise distinct",
    );
  });

  test("rejects every malformed reservation principal in public and runtime contracts before filesystem mutation", async () => {
    const root = await temporaryRoot();
    const schema = JSON.parse(await readFile(
      rootPath("product-evals/campaigns/run-artifact.schema.json"),
      "utf8",
    ));
    const principalSlots = [
      "operator",
      "specialized_evaluator",
      "evaluator",
      "aggregator",
      "target",
      "simulator",
      "recovery",
    ] as const;
    const publicReservation = (
      runId: string,
      input: ReturnType<typeof reservationInput>,
    ) => ({
      schema_version: CAMPAIGN_ARTIFACT_SCHEMA_VERSION,
      artifact_type: "campaign-run-reservation",
      run_id: runId,
      campaign_id: input.campaign_id,
      campaign_digest: input.campaign_digest,
      attempt: input.attempt,
      parent_run_id: null,
      reserved_at: input.lease.acquired_at,
      simulation_scope: input.simulation_scope,
      claim_ids: input.claim_ids,
      specialized_evaluation: input.specialized_evaluation,
      identities: input.identities,
      lease: input.lease,
    });
    const withOwnExtra = (
      principal: CampaignPrincipal,
      key: string,
    ): CampaignPrincipal => {
      const candidate = { ...principal };
      Object.defineProperty(candidate, key, {
        value: "malicious",
        enumerable: true,
        configurable: true,
        writable: true,
      });
      return candidate;
    };

    for (const slot of principalSlots) {
      const valid = identities()[slot]!;
      const inherited = Object.create(valid) as CampaignPrincipal;
      const malformed = [
        ["null", null],
        ["scalar", "principal"],
        ["array", [valid.role, valid.session_id, valid.subject]],
        ["inherited", inherited],
        ["extra", { ...valid, extra: "malicious" }],
        ["role-type", { ...valid, role: 42 }],
        ["session-type", { ...valid, session_id: 42 }],
        ["subject-type", { ...valid, subject: 42 }],
        ...["__proto__", "prototype", "constructor", "toString"].map(
          (key) => [`own-${key}`, withOwnExtra(valid, key)],
        ),
      ] as const;

      for (const [kind, principal] of malformed) {
        const identity = identities() as unknown as Record<string, unknown>;
        identity[slot] = principal;
        const input = reservationInput();
        input.identities = identity as unknown as CampaignIdentityEnvelope;
        const runId = `run-principal-${slot}-${kind}`.replace(/[^a-z0-9_-]/g, "-");
        expect(() => assertJsonSchema(publicReservation(runId, input), schema))
          .toThrow();
        const runtimeRejection = expect(
          new CampaignArtifactStore(root, runId).reserve(input),
        ).rejects;
        if (slot === "specialized_evaluator" && kind === "null") {
          await runtimeRejection.toThrow(
            "campaign harness scope requires specialized_evaluator identity",
          );
        } else {
          await runtimeRejection.toThrow(`${slot} is invalid`);
        }
        expect(await readdir(root)).toEqual([]);
      }
    }

    let accessorRead = false;
    const accessorPrincipal = Object.create(Object.prototype);
    for (const [key, value] of Object.entries(identities().operator)) {
      Object.defineProperty(accessorPrincipal, key, {
        enumerable: true,
        configurable: true,
        get() {
          accessorRead = true;
          return value;
        },
      });
    }
    const accessorIdentity = identities() as unknown as Record<string, unknown>;
    accessorIdentity.operator = accessorPrincipal;
    const accessorInput = reservationInput();
    accessorInput.identities = accessorIdentity as unknown as CampaignIdentityEnvelope;
    await expect(new CampaignArtifactStore(root, "run-principal-accessor").reserve(
      accessorInput,
    )).rejects.toThrow("operator is invalid");
    expect(accessorRead).toBe(false);
    expect(await readdir(root)).toEqual([]);
  });

  test("normalizes one reservation descriptor snapshot and rejects every non-data or non-contract input before mutation", async () => {
    const root = await temporaryRoot();
    const identity = identities();
    let inputReads = 0;
    let operatorReads = 0;
    const target = reservationInput(identity);
    target.identities.operator = new Proxy(target.identities.operator, {
      get() {
        operatorReads += 1;
        return "changed-after-snapshot";
      },
    });
    const proxied = new Proxy(target, {
      get() {
        inputReads += 1;
        return "changed-after-snapshot";
      },
    });
    const store = new CampaignArtifactStore(root, "run-snapshot-normalization");
    const reservation = await store.reserve(proxied);
    expect(inputReads).toBe(0);
    expect(operatorReads).toBe(0);
    expect(reservation.identities.operator).toEqual({
      role: "simulation-operator",
      session_id: "operator-session",
      subject: "operator",
    });
    expect(Object.getPrototypeOf(reservation.identities.operator)).toBe(Object.prototype);
    expect(JSON.parse(await readFile(
      resolve(store.runRoot, "reservation.json"),
      "utf8",
    ))).toEqual(reservation);
    const publicSchema = JSON.parse(await readFile(
      rootPath("product-evals/campaigns/run-artifact.schema.json"),
      "utf8",
    ));
    expect(Object.keys(publicSchema.$defs.reservation.properties).sort())
      .toEqual(Object.keys(reservation).sort());
    expect([
      ...publicSchema.$defs.reservation.required,
      ...publicSchema.$defs.reservation.allOf[0].then.required,
    ].sort()).toEqual(Object.keys(reservation).sort());
    expect(Object.keys(publicSchema.$defs.reservation.properties.identities.properties).sort())
      .toEqual(Object.keys(reservation.identities).sort());
    expect(Object.keys(publicSchema.$defs.reservation.properties.lease.properties).sort())
      .toEqual(Object.keys(reservation.lease).sort());

    const invalidInputs: Array<[string, unknown]> = [];
    const inherited = Object.create(reservationInput());
    invalidInputs.push(["inherited-input", inherited]);
    invalidInputs.push(["extra-input", { ...reservationInput(), extra: true }]);
    invalidInputs.push(["campaign-id-type", { ...reservationInput(), campaign_id: 4 }]);
    invalidInputs.push(["campaign-digest-type", { ...reservationInput(), campaign_digest: null }]);
    invalidInputs.push(["attempt-zero", { ...reservationInput(), attempt: 0 }]);
    invalidInputs.push(["attempt-fraction", { ...reservationInput(), attempt: 1.5 }]);
    invalidInputs.push(["attempt-type", { ...reservationInput(), attempt: "1" }]);
    invalidInputs.push(["parent-type", { ...reservationInput(), parent_run_id: 4 }]);
    invalidInputs.push(["scope-type", { ...reservationInput(), simulation_scope: "team" }]);
    invalidInputs.push(["identities-extra", {
      ...reservationInput(),
      identities: { ...identities(), extra: true },
    }]);
    invalidInputs.push(["recovery-mode", {
      ...reservationInput(),
      lease: { ...reservationInput().lease, recovery_mode: "RETRY" },
    }]);
    invalidInputs.push(["lease-id-type", {
      ...reservationInput(),
      lease: { ...reservationInput().lease, lease_id: 4 },
    }]);
    invalidInputs.push(["lease-owner-type", {
      ...reservationInput(),
      lease: { ...reservationInput().lease, owner_session_id: null },
    }]);
    invalidInputs.push(["lease-acquired", {
      ...reservationInput(),
      lease: { ...reservationInput().lease, acquired_at: "not-a-time" },
    }]);
    invalidInputs.push(["lease-expires", {
      ...reservationInput(),
      lease: { ...reservationInput().lease, expires_at: "not-a-time" },
    }]);
    invalidInputs.push(["lease-chronology", {
      ...reservationInput(),
      lease: {
        ...reservationInput().lease,
        expires_at: reservationInput().lease.acquired_at,
      },
    }]);
    invalidInputs.push(["lease-extra", {
      ...reservationInput(),
      lease: { ...reservationInput().lease, extra: true },
    }]);
    invalidInputs.push(["lease-prototype", {
      ...reservationInput(),
      lease: Object.assign(Object.create({ inherited: true }), reservationInput().lease),
    }]);

    const accessorInput = reservationInput();
    Object.defineProperty(accessorInput, "campaign_id", {
      enumerable: true,
      get() {
        throw new Error("accessor must not execute");
      },
    });
    invalidInputs.push(["input-accessor", accessorInput]);
    const accessorLeaseInput = reservationInput();
    Object.defineProperty(accessorLeaseInput.lease, "lease_id", {
      enumerable: true,
      get() {
        throw new Error("lease accessor must not execute");
      },
    });
    invalidInputs.push(["lease-accessor", accessorLeaseInput]);

    for (const [name, candidate] of invalidInputs) {
      const invalidRoot = await temporaryRoot();
      const invalidStore = new CampaignArtifactStore(invalidRoot, `run-${name}`);
      await expect(invalidStore.reserve(
        candidate as ReturnType<typeof reservationInput>,
      )).rejects.toBeTruthy();
      expect(await readdir(invalidRoot)).toEqual([]);
    }
  });

  test("rejects malicious scope and pairwise identity collisions in the public contract and before persistence", async () => {
    const root = await temporaryRoot();
    const rootMode = (await stat(root)).mode;
    const schema = JSON.parse(await readFile(
      rootPath("product-evals/campaigns/run-artifact.schema.json"),
      "utf8",
    ));
    const publicReservation = (
      runId: string,
      input: ReturnType<typeof reservationInput>,
    ) => ({
      schema_version: CAMPAIGN_ARTIFACT_SCHEMA_VERSION,
      artifact_type: "campaign-run-reservation",
      run_id: runId,
      campaign_id: input.campaign_id,
      campaign_digest: input.campaign_digest,
      attempt: input.attempt,
      parent_run_id: null,
      reserved_at: input.lease.acquired_at,
      simulation_scope: input.simulation_scope,
      claim_ids: input.claim_ids,
      specialized_evaluation: input.specialized_evaluation,
      identities: input.identities,
      lease: input.lease,
    });

    const invalidScopeIdentity = identities();
    invalidScopeIdentity.specialized_evaluator = null;
    const invalidScope = {
      ...reservationInput(invalidScopeIdentity, "product"),
      simulation_scope: "organization",
    } as unknown as ReturnType<typeof reservationInput>;
    expect(() => assertJsonSchema(
      publicReservation("run-invalid-scope", invalidScope),
      schema,
    )).toThrow();
    await expect(new CampaignArtifactStore(root, "run-invalid-scope").reserve(
      invalidScope,
    )).rejects.toThrow(
      "campaign simulation_scope must be exactly harness or product",
    );

    for (const [kind, identity] of [
      ["session", identities({
        evaluator: {
          role: "simulation-evaluator",
          session_id: "operator-session",
          subject: "evaluator",
        },
      })],
      ["subject", identities({
        evaluator: {
          role: "simulation-evaluator",
          session_id: "evaluator-session",
          subject: "operator",
        },
      })],
    ] as const) {
      const input = reservationInput(identity);
      expect(() => assertJsonSchema(
        publicReservation(`run-invalid-${kind}`, input),
        schema,
      )).toThrow(`identities.evaluator.${kind === "session" ? "session_id" : "subject"} duplicates`);
      await expect(new CampaignArtifactStore(root, `run-invalid-${kind}`).reserve(
        input,
      )).rejects.toThrow("pairwise distinct");
    }

    expect(await readdir(root)).toEqual([]);
    expect((await stat(root)).mode).toBe(rootMode);
  });

  test("requires the current specialized evaluator applicability contract and distinct subjects", async () => {
    const root = await temporaryRoot();
    const missing = identities() as unknown as Record<string, unknown>;
    delete missing.specialized_evaluator;
    await expect(new CampaignArtifactStore(root, "run-missing-specialized").reserve(
      reservationInput(missing as unknown as CampaignIdentityEnvelope),
    )).rejects.toThrow("campaign identity envelope");

    const wrongRole = identities();
    wrongRole.specialized_evaluator = { role: "simulation-evaluator", session_id: "specialized-session", subject: "specialized" };
    await expect(new CampaignArtifactStore(root, "run-wrong-specialized").reserve(
      reservationInput(wrongRole),
    )).rejects.toThrow("specialized_evaluator identity must use role harness-evaluator");

    const subjectCollision = identities();
    subjectCollision.specialized_evaluator = { ...subjectCollision.specialized_evaluator!, subject: subjectCollision.evaluator.subject };
    await expect(new CampaignArtifactStore(root, "run-specialized-subject-collision").reserve(
      reservationInput(subjectCollision),
    )).rejects.toThrow("specialized evaluator identity must be distinct");

    const notApplicable = identities();
    notApplicable.specialized_evaluator = null;
    await expect(new CampaignArtifactStore(root, "run-specialized-not-applicable").reserve(
      reservationInput(notApplicable, "product"),
    )).resolves.toMatchObject({ identities: { schema_version: 2, specialized_evaluator: null } });

    await expect(new CampaignArtifactStore(root, "run-harness-without-specialized").reserve(
      reservationInput(notApplicable, "harness"),
    )).rejects.toThrow("harness scope requires specialized_evaluator identity");
    await expect(new CampaignArtifactStore(root, "run-product-with-specialized").reserve(
      reservationInput(identities(), "product"),
    )).rejects.toThrow("product scope requires specialized_evaluator to be null");

    const schema = JSON.parse(await readFile(
      rootPath("product-evals/campaigns/run-artifact.schema.json"),
      "utf8",
    ));
    expect([...schema.$defs.reservation.properties.identities.required].sort())
      .toEqual(Object.keys(identities()).sort());
    expect(schema.$defs.specializedEvaluatorPrincipal.properties.role.const)
      .toBe("harness-evaluator");

    const harnessReservation = await new CampaignArtifactStore(
      root,
      "run-schema-harness",
    ).reserve(reservationInput());
    expect(() => assertJsonSchema(harnessReservation, schema)).not.toThrow();
    const ordinaryRoles = {
      operator: "simulation-operator",
      evaluator: "simulation-evaluator",
      aggregator: "campaign-aggregator",
      target: "target-actor",
      simulator: "simulator",
      recovery: "simulation-recovery",
    } as const;
    for (const slot of Object.keys(ordinaryRoles) as Array<keyof typeof ordinaryRoles>) {
      const invalid = structuredClone(harnessReservation);
      (invalid.identities[slot] as { role: string }).role = slot === "operator"
        ? "simulation-evaluator"
        : "simulation-operator";
      expect(() => assertJsonSchema(invalid, schema)).toThrow();

      const runtimeInvalid = identities();
      (runtimeInvalid[slot] as { role: string }).role = slot === "operator"
        ? "simulation-evaluator"
        : "simulation-operator";
      await expect(new CampaignArtifactStore(
        root,
        `run-runtime-role-${slot}`,
      ).reserve(reservationInput(runtimeInvalid))).rejects.toThrow(
        `${slot} identity must use role ${ordinaryRoles[slot]}`,
      );
    }
    const invalidHarness = structuredClone(harnessReservation);
    invalidHarness.identities.specialized_evaluator = null;
    expect(() => assertJsonSchema(invalidHarness, schema)).toThrow();
  });

  test("reserves, resumes, finalizes, and verifies a product-scope identity envelope", async () => {
    const root = await temporaryRoot();
    const identity = identities();
    identity.specialized_evaluator = null;
    const base = new CampaignArtifactStore(root, "run-product-scope");
    const reservation = await base.reserve(reservationInput(identity, "product"));
    expect(reservation).toMatchObject({
      simulation_scope: "product",
      identities: { schema_version: 2, specialized_evaluator: null },
    });
    const resumed = new CampaignArtifactStore(root, "run-product-scope");
    expect(await resumed.readReservation()).toEqual(reservation);
    const authorized = resumed.withAuthority(identity.operator, "lease-1");
    await seedCompletedRun(authorized);
    await authorized.finalize({ status: "COMPLETED", finalized_by: identity.operator });
    await expect(resumed.verify()).resolves.toMatchObject({
      status: "VALID",
      finalization_status: "COMPLETED",
    });

    const schema = JSON.parse(await readFile(
      rootPath("product-evals/campaigns/run-artifact.schema.json"),
      "utf8",
    ));
    expect([
      ...schema.$defs.reservation.required,
      ...schema.$defs.reservation.allOf[0].then.required,
    ].sort()).toEqual(Object.keys(reservation).sort());
    expect(() => assertJsonSchema(reservation, schema)).not.toThrow();
    const invalidProduct = structuredClone(reservation);
    invalidProduct.identities.specialized_evaluator = identities().specialized_evaluator;
    expect(() => assertJsonSchema(invalidProduct, schema)).toThrow();
  });

  test("requires the direct 1.2.0 reservation cutover without legacy omissions", async () => {
    const root = await temporaryRoot();
    const schema = JSON.parse(await readFile(
      rootPath("product-evals/campaigns/run-artifact.schema.json"),
      "utf8",
    ));
    const seededRuns = await Promise.all([
      seedCurrentRun(root, "parity-r30"),
      seedCurrentRun(root, "parity-r31"),
      seedCurrentRun(root, "parity-r32"),
    ]);
    const currentReservations = await Promise.all(
      seededRuns.map((seeded) =>
        readFile(resolve(seeded.store.runRoot, "reservation.json"), "utf8")
          .then((text) => JSON.parse(text))
      ),
    );
    for (const reservation of currentReservations) {
      expect(() => assertJsonSchema(reservation, schema)).not.toThrow();
    }
    for (const [index, field] of [
      "simulation_scope",
      "claim_ids",
      "specialized_evaluation",
    ].entries()) {
      const invalid = structuredClone(currentReservations[index % currentReservations.length]);
      delete invalid[field];
      expect(() => assertJsonSchema(invalid, schema)).toThrow();
    }
    for (const seeded of seededRuns) {
      await expect(seeded.store.verify()).resolves.toMatchObject({
        status: "VALID",
        run_id: seeded.store.runId,
      });
    }
  });

  test("rejects own prototype-name extras across historical and current public artifact shapes", async () => {
    const root = await temporaryRoot();
    const schema = JSON.parse(await readFile(
      rootPath("product-evals/campaigns/run-artifact.schema.json"),
      "utf8",
    ));
    const seededRuns = await Promise.all([
      seedCurrentRun(root, "prototype-r30"),
      seedCurrentRun(root, "prototype-r31"),
      seedCurrentRun(root, "prototype-r32"),
      seedCurrentRun(root, "prototype-r33"),
    ]);
    const reservations = await Promise.all(
      seededRuns.map((seeded) =>
        readFile(resolve(seeded.store.runRoot, "reservation.json"), "utf8")
          .then((text) => JSON.parse(text))
      ),
    );
    delete reservations[0].simulation_scope;
    delete reservations[0].identities.schema_version;
    delete reservations[0].identities.specialized_evaluator;
    delete reservations[1].simulation_scope;

    const withOwnExtra = (value: Record<string, unknown>, key: string) => {
      Object.defineProperty(value, key, {
        value: "malicious",
        enumerable: true,
        configurable: true,
        writable: true,
      });
      return value;
    };

    for (const reservation of reservations) {
      for (const key of ["__proto__", "prototype", "constructor", "toString"]) {
        expect(() => assertJsonSchema(
          withOwnExtra(structuredClone(reservation), key),
          schema,
        )).toThrow("unsupported properties");

        const nested = structuredClone(reservation);
        withOwnExtra(nested.identities.operator, key);
        expect(() => assertJsonSchema(nested, schema)).toThrow("unsupported properties");
      }
    }

    for (const key of ["__proto__", "prototype", "constructor", "toString"]) {
      expect(() => assertJsonSchema(
        withOwnExtra(structuredClone(seededRuns[3].finalization), key),
        schema,
      )).toThrow("unsupported properties");
    }
  });

  test("rejects duplicate stage writes and all post-finalization writes", async () => {
    const root = await temporaryRoot();
    const identity = identities();
    const store = await authorizedStore(root, "run-stages", identity);
    await store.writeStageJson("execution/receipt.json", { status: "STARTED" });

    await expect(
      store.writeStageJson("execution/receipt.json", { status: "CHANGED" }),
    ).rejects.toBeTruthy();
    await expect(
      store.writeStageJson("execution/../finalization.json", {
        status: "FORGED",
      }),
    ).rejects.toThrow("invalid artifact stage path");
    await seedCompletedRun(store);
    await store.finalize({
      status: "COMPLETED",
      finalized_by: identity.operator,
    });
    await expect(
      store.writeStageJson("execution/late.json", { status: "LATE" }),
    ).rejects.toThrow("already finalized");
  });

  test("rejects refinement artifacts that claim direct persona mutation", async () => {
    const root = await temporaryRoot();
    const store = await authorizedStore(root, "run-invalid-refinement");

    await expect(
      store.writeStageJson("refinements/invalid.json", {
        ...refinementProposal(store.runId),
        direct_persona_mutation_allowed: true,
      }),
    ).rejects.toThrow("proposal-only");
  });

  test("binds refinement artifacts to the reserved identity and canonical path", async () => {
    const root = await temporaryRoot();
    const store = await authorizedStore(root, "run-refinement-binding");
    const proposal = refinementProposal(store.runId);

    await expect(
      store.writeStageJson("refinements/proposal-1.json", {
        ...proposal,
        run_id: "another-run",
      }),
    ).rejects.toThrow("reserved run, campaign, and evaluator");
    await expect(
      store.writeStageJson("refinements/proposal-1.json", {
        ...proposal,
        campaign_id: "another-campaign",
      }),
    ).rejects.toThrow("reserved run, campaign, and evaluator");
    await expect(
      store.writeStageJson("refinements/proposal-1.json", {
        ...proposal,
        proposed_by: "another-evaluator",
      }),
    ).rejects.toThrow("reserved run, campaign, and evaluator");
    await expect(
      store.writeStageJson("refinements/wrong-name.json", proposal),
    ).rejects.toThrow("path must match proposal_id");
    await expect(
      store.writeStageJson("refinements/not-an-object.json", null),
    ).rejects.toThrow("must be an object");
  });

  test("requires evaluation candidate, source, and frozen-evidence linkage", async () => {
    const root = await temporaryRoot();
    const proposal = refinementProposal("run-refinement-linkage");
    const store = await authorizedStore(root, proposal.run_id);
    const sourceManifest = {
      schema_version: 1,
      run_id: proposal.run_id,
      campaign_id: proposal.campaign_id,
      definitions: [
        { path: proposal.persona.path, sha256: proposal.persona.sha256 },
        { path: proposal.derivation.path, sha256: proposal.derivation.sha256 },
      ],
    };
    const evaluation = {
      schema_version: 2,
      run_id: proposal.run_id,
      campaign_id: proposal.campaign_id,
      evaluation_id: proposal.evaluation_id,
      evaluator_identity: proposal.proposed_by,
      refinement_proposal_bindings: [
        {
          proposal_id: proposal.proposal_id,
          candidate_digest: "c".repeat(64),
        },
      ],
    };
    await store.writeStageJson("execution/source-manifest.json", sourceManifest);
    await store.writeStageJson("evaluations/evaluation-1/receipt.json", evaluation);
    await store.writeStageJson(
      "evaluations/evaluation-1/input/run/execution/execution-receipt.json",
      { status: "PASS" },
    );
    await expect(
      store.writeStageJson("refinements/proposal-1.json", proposal),
    ).rejects.toThrow("candidate digest");

    const missingSourceProposal = refinementProposal("run-refinement-source");
    const missingSourceStore = await authorizedStore(
      root,
      missingSourceProposal.run_id,
    );
    await missingSourceStore.writeStageJson("execution/source-manifest.json", {
      ...sourceManifest,
      run_id: missingSourceProposal.run_id,
      definitions: [
        {
          path: missingSourceProposal.persona.path,
          sha256: missingSourceProposal.persona.sha256,
        },
      ],
    });
    await missingSourceStore.writeStageJson("evaluations/evaluation-1/receipt.json", {
      ...evaluation,
      run_id: missingSourceProposal.run_id,
      input_manifest_digest: await stageEvaluationInput(
        missingSourceStore,
        missingSourceProposal.evaluation_id,
        { status: "PASS" },
      ),
      refinement_proposal_bindings: [
        {
          proposal_id: missingSourceProposal.proposal_id,
          candidate_digest: refinementProposalCandidateDigest(missingSourceProposal),
        },
      ],
    });
    await expect(
      missingSourceStore.writeStageJson(
        "refinements/proposal-1.json",
        missingSourceProposal,
      ),
    ).rejects.toThrow("absent from the source manifest");

    const missingEvidenceProposal = refinementProposal("run-refinement-evidence");
    const missingEvidenceStore = await authorizedStore(
      root,
      missingEvidenceProposal.run_id,
    );
    await missingEvidenceStore.writeStageJson("execution/source-manifest.json", {
      ...sourceManifest,
      run_id: missingEvidenceProposal.run_id,
    });
    await missingEvidenceStore.writeStageJson("evaluations/evaluation-1/receipt.json", {
      ...evaluation,
      run_id: missingEvidenceProposal.run_id,
      input_manifest_digest: await stageEvaluationInput(
        missingEvidenceStore,
        missingEvidenceProposal.evaluation_id,
        { status: "PASS" },
        false,
      ),
      refinement_proposal_bindings: [
        {
          proposal_id: missingEvidenceProposal.proposal_id,
          candidate_digest: refinementProposalCandidateDigest(missingEvidenceProposal),
        },
      ],
    });
    await expect(
      missingEvidenceStore.writeStageJson(
        "refinements/proposal-1.json",
        missingEvidenceProposal,
      ),
    ).rejects.toThrow("missing frozen evaluation evidence");

    const staleInputProposal = refinementProposal("run-refinement-input");
    const staleInputStore = await authorizedStore(root, staleInputProposal.run_id);
    await staleInputStore.writeStageJson("execution/source-manifest.json", {
      ...sourceManifest,
      run_id: staleInputProposal.run_id,
    });
    await stageEvaluationInput(
      staleInputStore,
      staleInputProposal.evaluation_id,
      { status: "PASS" },
    );
    await staleInputStore.writeStageJson("evaluations/evaluation-1/receipt.json", {
      ...evaluation,
      run_id: staleInputProposal.run_id,
      input_manifest_digest: "f".repeat(64),
      refinement_proposal_bindings: [
        {
          proposal_id: staleInputProposal.proposal_id,
          candidate_digest: refinementProposalCandidateDigest(staleInputProposal),
        },
      ],
    });
    await expect(
      staleInputStore.writeStageJson(
        "refinements/proposal-1.json",
        staleInputProposal,
      ),
    ).rejects.toThrow("input manifest is stale or mismatched");
  });

  test("freezes bounded regular files and blocks symlinks, size, and secrets", async () => {
    const root = await temporaryRoot();
    const source = resolve(root, "source.txt");
    const secret = resolve(root, "secret.txt");
    const link = resolve(root, "source-link.txt");
    await writeFile(source, "safe evidence");
    await writeFile(secret, "token=super-secret-value");
    await symlink(source, link);

    const store = await authorizedStore(root, "run-freeze");
    const frozen = await store.freezeFile({
      source_path: source,
      namespace: "execution/evidence",
      producer: "simulation-operator",
      platform: "test-platform",
      redaction_profile: "no-secrets-v1",
    });
    expect(frozen.redaction_status).toBe("CLEAN");
    expect(frozen.platform).toBe("test-platform");
    expect(frozen.lineage).toEqual({
      run_id: "run-freeze",
      source_digest: frozen.sha256,
    });
    await expect(
      store.freezeFile({
        source_path: link,
        namespace: "execution/evidence",
        producer: "simulation-operator",
        platform: "test-platform",
        redaction_profile: "no-secrets-v1",
      }),
    ).rejects.toThrow("symbolic-link");
    await expect(
      store.freezeFile({
        source_path: source,
        namespace: "execution/evidence",
        producer: "simulation-operator",
        platform: "test-platform",
        redaction_profile: "no-secrets-v1",
        max_bytes: 2,
      }),
    ).rejects.toThrow("exceeds");
    await expect(
      store.freezeFile({
        source_path: secret,
        namespace: "execution/evidence",
        producer: "simulation-operator",
        platform: "test-platform",
        redaction_profile: "no-secrets-v1",
      }),
    ).rejects.toThrow("secret-like");
  });

  test("rejects FIFO, socket, and pathname substitution across both file ingest methods", async () => {
    const root = resolve("/tmp", `cascade-ingest-${crypto.randomUUID().slice(0, 8)}`);
    await mkdir(root, { mode: 0o700 });
    temporaryRoots.push(root);
    const store = await authorizedStore(root, "run-file-ingest-races");
    const methods = [
      {
        name: "stage",
        invoke: (sourcePath: string) =>
          store.writeStageFile("execution/staged.txt", sourcePath, {
            redaction_profile: "no-secrets-v1",
          }),
      },
      {
        name: "freeze",
        invoke: (sourcePath: string) =>
          store.freezeFile({
            source_path: sourcePath,
            namespace: "execution/frozen",
            producer: "simulation-operator",
            platform: "test-platform",
            redaction_profile: "no-secrets-v1",
          }),
      },
    ];

    const regularPath = resolve(root, "regular.txt");
    await writeFile(regularPath, "regular safe evidence", { mode: 0o600 });
    for (const method of methods) await method.invoke(regularPath);
    expect(await store.readArtifactText("execution/staged.txt")).toBe(
      "regular safe evidence",
    );

    const fifoPath = resolve(root, "input.fifo");
    expect(Bun.spawnSync(["mkfifo", fifoPath]).exitCode).toBe(0);
    await chmod(fifoPath, 0o600);
    for (const method of methods) {
      await expect(
        Promise.race([
          method.invoke(fifoPath),
          Bun.sleep(500).then(() => {
            throw new Error(`${method.name} FIFO read timed out`);
          }),
        ]),
      ).rejects.toThrow("must be a regular file");
    }

    const socketPath = resolve(root, "input.socket");
    const socketServer = createSocketServer();
    await new Promise<void>((resolveListen, rejectListen) => {
      socketServer.once("error", rejectListen);
      socketServer.listen(socketPath, resolveListen);
    });
    try {
      for (const method of methods) {
        await expect(
          Promise.race([
            method.invoke(socketPath),
            Bun.sleep(500).then(() => {
              throw new Error(`${method.name} socket read timed out`);
            }),
          ]),
        ).rejects.toThrow("must be a regular file");
      }
    } finally {
      await new Promise<void>((resolveClose) =>
        socketServer.close(() => resolveClose()),
      );
    }

    for (const method of methods) {
      const sourcePath = resolve(root, `${method.name}-source.txt`);
      const replacementPath = resolve(root, `${method.name}-replacement.txt`);
      const displacedPath = resolve(root, `${method.name}-displaced.txt`);
      await writeFile(sourcePath, "original safe evidence", { mode: 0o600 });
      await writeFile(replacementPath, "replacement safe evidence", {
        mode: 0o600,
      });
      Object.assign(
        store as unknown as {
          sourceReadCheckpoint?: (
            phase: "opened",
            openedPath: string,
          ) => Promise<void>;
        },
        {
          sourceReadCheckpoint: async (_phase: "opened", openedPath: string) => {
            await rename(openedPath, displacedPath);
            await rename(replacementPath, openedPath);
          },
        },
      );
      await expect(method.invoke(sourcePath)).rejects.toThrow(
        "changed while being read",
      );
      Object.assign(store as unknown as { sourceReadCheckpoint?: undefined }, {
        sourceReadCheckpoint: undefined,
      });
    }
  });

  test("recovery can terminally finalize unknown outcome with a reason", async () => {
    const root = await temporaryRoot();
    const identity = identities();
    const base = new CampaignArtifactStore(root, "run-recovery");
    await base.reserve(reservationInput(identity));
    await base
      .withAuthority(identity.operator, "lease-1")
      .appendLifecycle({ status: "RUNNING" });
    const store = base.withAuthority(identity.recovery);
    const finalization = await store.finalize({
      status: "UNKNOWN_OUTCOME",
      finalized_by: identity.recovery,
      recovery_reason: "operator lease expired during external action",
      recovery_action: "bounded inspection found an ambiguous provider write",
      recovery_cleanup_status: "UNKNOWN",
    });

    expect(finalization.status).toBe("UNKNOWN_OUTCOME");
    expect((await store.verify()).status).toBe("VALID");
  });

  test("UNKNOWN_OUTCOME recovery binds the interrupted operation and checkpoint", async () => {
    const root = await temporaryRoot();
    const identity = identities();
    const base = new CampaignArtifactStore(root, "run-bound-recovery");
    await base.reserve(reservationInput(identity));
    const operator = base.withAuthority(identity.operator, "lease-1");
    await operator.appendLifecycle({ status: "RUNNING" });
    const contractDigest = "a".repeat(64);
    const stepId = "task:INTERRUPTED";
    const binding = {
      step_id: stepId,
      surface_id: stepId,
      required: true,
      idempotency_key_digest: valueDigest("run-bound-recovery:task:INTERRUPTED"),
      conflict_keys_digest: valueDigest([]),
      payload_digest: valueDigest({ id: "INTERRUPTED" }),
    };
    const started: SimulationSessionEvent = {
      schema_version: 1,
      session_id: "run-bound-recovery",
      contract_digest: contractDigest,
      event_type: "STEP_STARTED",
      at: "2099-07-30T10:00:01.000Z",
      episode: 1,
      step_ids: [stepId],
      surface_ids: [stepId],
      step_bindings: [binding],
      status: "RUNNING",
      reason: null,
      sequence: 0,
      previous_event_digest: null,
      event_digest: "",
    };
    started.event_digest = simulationEventDigest(started);
    await operator.appendSessionEvent(started);
    const checkpoint: SimulationSessionCheckpoint<Record<string, never>> = {
      schema_version: 1,
      checkpoint_id: "run-bound-recovery:checkpoint:00000000",
      checkpoint_digest: "",
      contract_digest: contractDigest,
      session_id: "run-bound-recovery",
      purpose: "bind interrupted recovery",
      status: "UNKNOWN_OUTCOME",
      reason: "provider result is ambiguous",
      revision: 0,
      started_at: "2099-07-30T10:00:00.000Z",
      updated_at: "2099-07-30T10:00:02.000Z",
      episode: 1,
      episode_step_count: 0,
      step_count: 0,
      completed_step_ids: [],
      completed_idempotency_keys: [],
      last_batch_step_ids: [stepId],
      surfaces: [{
        surface_id: stepId,
        kind: "command",
        context_id: "run-bound-recovery:command:INTERRUPTED",
        lifecycle: "LOST",
        generation: 0,
      }],
      domain_state: {},
      last_event_digest: started.event_digest,
    };
    checkpoint.checkpoint_digest = simulationCheckpointDigest(checkpoint);
    await operator.writeSessionCheckpoint(checkpoint);
    const dispatch = { state: "DISPATCHED", task_id: "INTERRUPTED" };
    await operator.writeStageJson(
      "execution/tasks/INTERRUPTED/dispatch.json",
      dispatch,
    );

    const recovery = base.withAuthority(identity.recovery);
    await recovery.finalize({
      status: "UNKNOWN_OUTCOME",
      finalized_by: identity.recovery,
      recovery_reason: "provider result remained ambiguous",
      recovery_action: "freeze operation for explicit recovery review",
      recovery_cleanup_status: "UNKNOWN",
      recovery_context: {
        interrupted_operations: [{
          step_id: stepId,
          idempotency_key_digest: binding.idempotency_key_digest,
          dispatch_digest: valueDigest(dispatch),
        }],
        checkpoint_digest: checkpoint.checkpoint_digest,
      },
    });

    expect(await recovery.verify()).toMatchObject({
      status: "VALID",
      finalization_status: "UNKNOWN_OUTCOME",
    });
    const receipt = await recovery.readVerifiedArtifactJson<Record<string, unknown>>(
      "recovery/recovery-receipt.json",
    );
    expect(receipt.value.recovery_context).toEqual({
      interrupted_operations: [{
        step_id: stepId,
        idempotency_key_digest: binding.idempotency_key_digest,
        dispatch_digest: valueDigest(dispatch),
      }],
      checkpoint_digest: checkpoint.checkpoint_digest,
    });
  });

  test("allows exactly one atomic terminal finalization", async () => {
    const root = await temporaryRoot();
    const identity = identities();
    const store = await authorizedStore(root, "run-finalize-race", identity);
    await seedCompletedRun(store);
    const results = await Promise.allSettled([
      store.finalize({
        status: "COMPLETED",
        finalized_by: identity.operator,
      }),
      store.finalize({
        status: "BLOCKED",
        finalized_by: identity.operator,
      }),
    ]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(
      1,
    );
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(
      1,
    );
    expect((await store.verify()).status).toBe("VALID");
  });

  test("lets only reserved recovery complete an operator-produced terminal lock without rewriting attribution", async () => {
    const root = await temporaryRoot();
    const identity = identities();
    const operator = await authorizedStore(root, "run-finalize-resume", identity);
    await seedCompletedRun(operator);
    await operator.finalize({
      status: "COMPLETED",
      finalized_by: identity.operator,
    });
    await unlink(resolve(operator.runRoot, "finalization.json"));

    const recovery = new CampaignArtifactStore(
      root,
      "run-finalize-resume",
    ).withAuthority(identity.recovery);
    await expect(
      recovery.finalize({
        status: "COMPLETED",
        finalized_by: identity.recovery,
      }),
    ).rejects.toThrow("requires a reason");
    const mismatchedRecovery = {
      ...identity.recovery,
      session_id: "different-recovery-session",
    };
    await expect(
      new CampaignArtifactStore(root, "run-finalize-resume")
        .withAuthority(mismatchedRecovery)
        .finalize({
          status: "COMPLETED",
          finalized_by: mismatchedRecovery,
          recovery_reason: "wrong recovery identity",
        }),
    ).rejects.toThrow("reserved operator or recovery authority");
    const finalization = await recovery.finalize({
      status: "COMPLETED",
      finalized_by: identity.recovery,
      recovery_reason: "operator stopped after producing terminal intent",
    });
    expect(finalization.status).toBe("COMPLETED");
    expect(finalization.terminal_lock_producer).toEqual(identity.operator);
    expect(finalization.completed_by).toEqual(identity.recovery);
    expect(finalization.finalized_by).toEqual(identity.recovery);
    expect(finalization.terminal_lock_digest).toMatch(/^[a-f0-9]{64}$/);
    expect((await recovery.verify()).status).toBe("VALID");

    const mismatchOperator = await authorizedStore(
      root,
      "run-finalize-resume-mismatch",
      identity,
    );
    await seedCompletedRun(mismatchOperator);
    await mismatchOperator.finalize({
      status: "COMPLETED",
      finalized_by: identity.operator,
    });
    await unlink(resolve(mismatchOperator.runRoot, "finalization.json"));
    const terminalPath = resolve(mismatchOperator.runRoot, "terminal.lock");
    const terminal = JSON.parse(await readFile(terminalPath, "utf8"));
    terminal.produced_by = identity.recovery;
    await writeFile(
      terminalPath,
      `${JSON.stringify(terminal)}\n`,
      { mode: 0o600 },
    );
    const mismatch = new CampaignArtifactStore(
      root,
      "run-finalize-resume-mismatch",
    ).withAuthority(identity.recovery);
    await expect(
      mismatch.finalize({
        status: "COMPLETED",
        finalized_by: identity.recovery,
        recovery_reason: "must reject producer mismatch",
      }),
    ).rejects.toThrow("mismatched producer");
  });

  test("keeps post-intent recovery outside the application manifest and exact-validates its receipt", async () => {
    const root = await temporaryRoot();
    const identity = identities();
    const base = new CampaignArtifactStore(root, "run-terminal-takeover-compose");
    await base.reserve(reservationInput(identity));
    const operator = base.withAuthority(identity.operator, "lease-1");
    await seedCompletedRun(operator);
    await operator.finalize({
      status: "COMPLETED",
      finalized_by: identity.operator,
    });
    const terminalLock = JSON.parse(
      await readFile(resolve(base.runRoot, "terminal.lock"), "utf8"),
    );
    await unlink(resolve(base.runRoot, "finalization.json"));
    const lease = {
      ...(await base.readCurrentLease()),
      acquired_at: "2020-01-01T00:00:00.000Z",
      renewed_at: "2020-01-01T00:00:00.000Z",
      expires_at: "2020-01-01T00:01:00.000Z",
    };
    const leaseText = `${stableJson(lease, true)}\n`;
    await writeFile(resolve(base.runRoot, "lease.json"), leaseText, {
      mode: 0o600,
    });
    replaceArtifactRecord(terminalLock.application_files, "lease.json", leaseText);
    terminalLock.application_manifest_digest = sha256Text(
      stableJson(terminalLock.application_files),
    );
    await writeFile(
      resolve(base.runRoot, "terminal.lock"),
      `${stableJson(terminalLock, true)}\n`,
      { mode: 0o600 },
    );
    const previousLock = {
      schema_version: CAMPAIGN_ARTIFACT_SCHEMA_VERSION,
      artifact_type: "campaign-mutation-lock",
      run_id: "run-terminal-takeover-compose",
      pid: 99_999_999,
      token: "post-intent-stale-token",
      acquired_at: "2020-01-01T00:00:00.000Z",
      owner: identity.operator,
      lease_id: "lease-1",
      lease_generation: lease.generation,
      takeover_claim_digest: null,
    };
    const reason =
      "operator stopped after terminal intent with its mutation lock held";
    const claim = {
      schema_version: CAMPAIGN_ARTIFACT_SCHEMA_VERSION,
      artifact_type: "campaign-mutation-lock-takeover-claim",
      run_id: "run-terminal-takeover-compose",
      previous_lock: previousLock,
      previous_lock_digest: sha256Text(stableJson(previousLock)),
      lease_state: lease,
      lease_state_digest: sha256Text(stableJson(lease)),
      lease_generation: lease.generation,
      recovery_identity: identity.recovery,
      reason,
      quarantined_path:
        ".run-terminal-takeover-compose.mutation.lock.quarantine-post-intent-stale-token",
      successor_token: "post-intent-successor-token",
      created_at: terminalLock.produced_at,
    };
    await writeFile(
      resolve(root, ".run-terminal-takeover-compose.mutation.takeover.json"),
      `${JSON.stringify(claim)}\n`,
      { mode: 0o600 },
    );
    await writeFile(
      resolve(
        root,
        ".run-terminal-takeover-compose.mutation.lock.quarantine-post-intent-stale-token",
      ),
      `${JSON.stringify(previousLock)}\n`,
      { mode: 0o600 },
    );

    const recovery = base.withAuthority(identity.recovery);
    const finalization = await recovery.finalize({
      status: "COMPLETED",
      finalized_by: identity.recovery,
      recovery_reason: reason,
    });
    expect(finalization.application_files).toEqual(
      terminalLock.application_files,
    );
    expect(finalization.application_manifest_digest).toBe(
      terminalLock.application_manifest_digest,
    );
    expect(finalization.post_intent_recovery_files).toHaveLength(1);
    expect(finalization.post_intent_recovery_files[0]?.path).toBe(
      "recovery/mutation-lock-takeovers/post-intent-stale-token.json",
    );
    expect(finalization.terminal_lock_producer).toEqual(identity.operator);
    expect(finalization.completed_by).toEqual(identity.recovery);
    expect((await recovery.verify()).status).toBe("VALID");

    const receiptPath =
      "recovery/mutation-lock-takeovers/post-intent-stale-token.json";
    const originalReceipt = JSON.parse(
      await readFile(resolve(base.runRoot, receiptPath), "utf8"),
    );
    const mutations: Array<
      [string, (receipt: Record<string, any>) => void]
    > = [
      ["extra receipt field", (receipt) => { receipt.unexpected = true; }],
      ["impossible receipt timestamp", (receipt) => {
        receipt.quarantined_at = "2026-02-30T12:00:00Z";
      }],
      ["leap-second receipt timestamp", (receipt) => {
        receipt.created_at = "2026-06-30T23:59:60Z";
      }],
      ["extra previous-lock field", (receipt) => {
        receipt.previous_lock.unexpected = true;
        receipt.previous_lock_digest = sha256Text(
          stableJson(receipt.previous_lock),
        );
      }],
      ["extra previous-lock owner field", (receipt) => {
        receipt.previous_lock.owner.unexpected = true;
        receipt.previous_lock_digest = sha256Text(
          stableJson(receipt.previous_lock),
        );
      }],
      ["extra nested lease field", (receipt) => {
        receipt.lease_state.unexpected = true;
        receipt.lease_state_digest = sha256Text(stableJson(receipt.lease_state));
      }],
      ["extra recovery-identity field", (receipt) => {
        receipt.recovery_identity.unexpected = true;
      }],
    ];
    for (const [, mutate] of mutations) {
      const candidate = structuredClone(originalReceipt);
      mutate(candidate);
      await rewritePostIntentRecoveryReceiptAndLinkage(
        recovery,
        receiptPath,
        candidate,
      );
      await expect(recovery.verify()).rejects.toThrow(
        /campaign mutation lock(?: takeover receipt)? is invalid/,
      );
    }
    await rewritePostIntentRecoveryReceiptAndLinkage(
      recovery,
      receiptPath,
      originalReceipt,
    );
    expect((await recovery.verify()).status).toBe("VALID");

    const forgedDigest = structuredClone(originalReceipt);
    forgedDigest.claim_digest = "f".repeat(64);
    if (forgedDigest.claim_digest === originalReceipt.claim_digest) {
      forgedDigest.claim_digest = "e".repeat(64);
    }
    await rewritePostIntentRecoveryReceiptAndLinkage(
      recovery,
      receiptPath,
      forgedDigest,
    );
    await expect(recovery.verify()).rejects.toThrow(
      `campaign post-intent recovery receipt is not bound to the terminal interruption or manifest-bound current lease: ${receiptPath}`,
    );

    const reversedQuarantineOrder = structuredClone(originalReceipt);
    const laterSecond = new Date(
      Date.parse(terminalLock.produced_at) + 2_000,
    ).toISOString().slice(0, 19);
    const laterSecondAtPlusOne = new Date(
      Date.parse(`${laterSecond}Z`) + 60 * 60 * 1_000,
    ).toISOString().slice(0, 19);
    reversedQuarantineOrder.created_at =
      `${laterSecondAtPlusOne}.123456790+01:00`;
    reversedQuarantineOrder.quarantined_at =
      `${laterSecond}.123456789Z`;
    const {
      artifact_type: _reversedReceiptType,
      claim_digest: _reversedClaimDigest,
      quarantined_at: _reversedQuarantinedAt,
      ...reversedClaimFields
    } = reversedQuarantineOrder;
    reversedQuarantineOrder.claim_digest = sha256Text(stableJson({
      ...reversedClaimFields,
      artifact_type: "campaign-mutation-lock-takeover-claim",
    }));
    await rewritePostIntentRecoveryReceiptAndLinkage(
      recovery,
      receiptPath,
      reversedQuarantineOrder,
    );
    await expect(recovery.verify()).rejects.toThrow(
      "campaign mutation lock takeover receipt has invalid identity, lease binding, or chronology",
    );
    await rewritePostIntentRecoveryReceiptAndLinkage(
      recovery,
      receiptPath,
      originalReceipt,
    );

    const preExpiryClaim = structuredClone(originalReceipt);
    preExpiryClaim.lease_state.expires_at =
      new Date(Date.parse(preExpiryClaim.created_at))
        .toISOString()
        .replace(/Z$/, "000001Z");
    preExpiryClaim.lease_state_digest = sha256Text(
      stableJson(preExpiryClaim.lease_state),
    );
    const {
      artifact_type: _preExpiryReceiptType,
      claim_digest: _preExpiryClaimDigest,
      quarantined_at: _preExpiryQuarantinedAt,
      ...preExpiryClaimFields
    } = preExpiryClaim;
    preExpiryClaim.claim_digest = sha256Text(stableJson({
      ...preExpiryClaimFields,
      artifact_type: "campaign-mutation-lock-takeover-claim",
    }));
    await rewritePostIntentRecoveryReceiptAndLinkage(
      recovery,
      receiptPath,
      preExpiryClaim,
    );
    await expect(recovery.verify()).rejects.toThrow(
      "campaign mutation lock takeover receipt has invalid identity, lease binding, or chronology",
    );
    await rewritePostIntentRecoveryReceiptAndLinkage(
      recovery,
      receiptPath,
      originalReceipt,
    );

    const preTerminalClaim = structuredClone(originalReceipt);
    preTerminalClaim.created_at =
      new Date(Date.parse(terminalLock.produced_at) - 1)
        .toISOString()
        .replace(
          /(\.\d{3})Z$/,
          (_match: string, fraction: string) => `${fraction}999999Z`,
        );
    const {
      artifact_type: _preTerminalReceiptType,
      claim_digest: _preTerminalClaimDigest,
      quarantined_at: _preTerminalQuarantinedAt,
      ...preTerminalClaimFields
    } = preTerminalClaim;
    preTerminalClaim.claim_digest = sha256Text(stableJson({
      ...preTerminalClaimFields,
      artifact_type: "campaign-mutation-lock-takeover-claim",
    }));
    await rewritePostIntentRecoveryReceiptAndLinkage(
      recovery,
      receiptPath,
      preTerminalClaim,
    );
    await expect(recovery.verify()).rejects.toThrow(
      `campaign post-intent recovery receipt is not bound to the terminal interruption or manifest-bound current lease: ${receiptPath}`,
    );
    await rewritePostIntentRecoveryReceiptAndLinkage(
      recovery,
      receiptPath,
      originalReceipt,
    );

    const postCompletionQuarantine = structuredClone(originalReceipt);
    postCompletionQuarantine.quarantined_at =
      new Date(Date.parse(finalization.completed_at))
        .toISOString()
        .replace(/Z$/, "000001Z");
    expect(compareRfc3339Instants(
      postCompletionQuarantine.quarantined_at,
      finalization.completed_at,
    )).toBe(1);
    await rewritePostIntentRecoveryReceiptAndLinkage(
      recovery,
      receiptPath,
      postCompletionQuarantine,
    );
    await expect(recovery.verify()).rejects.toThrow(
      `campaign post-intent recovery receipt is not bound to the terminal interruption or manifest-bound current lease: ${receiptPath}`,
    );
    await rewritePostIntentRecoveryReceiptAndLinkage(
      recovery,
      receiptPath,
      originalReceipt,
    );

    const forgedQuarantinePath = structuredClone(originalReceipt);
    forgedQuarantinePath.quarantined_path =
      ".run-terminal-takeover-compose.mutation.lock.quarantine-other-token";
    const {
      artifact_type: _receiptType,
      claim_digest: _claimDigest,
      quarantined_at: _quarantinedAt,
      ...claimFields
    } = forgedQuarantinePath;
    forgedQuarantinePath.claim_digest = sha256Text(stableJson({
      ...claimFields,
      artifact_type: "campaign-mutation-lock-takeover-claim",
    }));
    await rewritePostIntentRecoveryReceiptAndLinkage(
      recovery,
      receiptPath,
      forgedQuarantinePath,
    );
    await expect(recovery.verify()).rejects.toThrow(
      `campaign post-intent recovery receipt is not bound to the terminal interruption or manifest-bound current lease: ${receiptPath}`,
    );
    await rewritePostIntentRecoveryReceiptAndLinkage(
      recovery,
      receiptPath,
      originalReceipt,
    );
    expect((await recovery.verify()).status).toBe("VALID");

    const activeCurrentLease = {
      ...lease,
      renewed_at: "2099-07-30T10:00:00.000Z",
      acquired_at: "2099-07-30T10:00:00.000Z",
      expires_at: "2099-07-30T11:00:00.000Z",
    };
    const activeLeaseText = `${stableJson(activeCurrentLease, true)}\n`;
    const leasePath = resolve(base.runRoot, "lease.json");
    await writeFile(leasePath, activeLeaseText, { mode: 0o600 });
    const resealedTerminal = JSON.parse(
      await readFile(resolve(base.runRoot, "terminal.lock"), "utf8"),
    );
    replaceArtifactRecord(
      resealedTerminal.application_files,
      "lease.json",
      activeLeaseText,
    );
    resealedTerminal.application_manifest_digest = sha256Text(
      stableJson(resealedTerminal.application_files),
    );
    const resealedTerminalText = `${stableJson(resealedTerminal, true)}\n`;
    const terminalPath = resolve(base.runRoot, "terminal.lock");
    await writeFile(terminalPath, resealedTerminalText, { mode: 0o600 });
    const finalizationPath = resolve(base.runRoot, "finalization.json");
    const resealedFinalization = JSON.parse(
      await readFile(finalizationPath, "utf8"),
    );
    replaceArtifactRecord(
      resealedFinalization.application_files,
      "lease.json",
      activeLeaseText,
    );
    resealedFinalization.application_manifest_digest = sha256Text(
      stableJson(resealedFinalization.application_files),
    );
    replaceArtifactRecord(
      resealedFinalization.files,
      "lease.json",
      activeLeaseText,
    );
    replaceArtifactRecord(
      resealedFinalization.files,
      "terminal.lock",
      resealedTerminalText,
    );
    resealedFinalization.terminal_lock_digest = sha256Text(resealedTerminalText);
    resealedFinalization.manifest_digest = sha256Text(
      stableJson(resealedFinalization.files),
    );
    await writeFile(
      finalizationPath,
      `${stableJson(resealedFinalization, true)}\n`,
      { mode: 0o600 },
    );
    const manifestBoundPaths = [
      leasePath,
      terminalPath,
      finalizationPath,
      resolve(base.runRoot, receiptPath),
    ];
    const beforeActiveLeaseMismatch = await snapshotBytes(manifestBoundPaths);
    await expect(recovery.verify()).rejects.toThrow(
      `campaign post-intent recovery receipt is not bound to the terminal interruption or manifest-bound current lease: ${receiptPath}`,
    );
    await expectBytesUnchanged(beforeActiveLeaseMismatch);
  });

  test("resumes UNKNOWN_OUTCOME finalization with the same recovery receipt and terminal lock", async () => {
    const root = await temporaryRoot();
    const identity = identities();
    const base = new CampaignArtifactStore(root, "run-recovery-resume");
    await base.reserve(reservationInput(identity));
    await base
      .withAuthority(identity.operator, "lease-1")
      .appendLifecycle({ status: "RUNNING" });
    const recovery = base.withAuthority(identity.recovery);
    const input = {
      status: "UNKNOWN_OUTCOME" as const,
      finalized_by: identity.recovery,
      recovery_reason: "provider result remained ambiguous",
      recovery_action: "bounded recovery inspection",
      recovery_cleanup_status: "UNKNOWN" as const,
    };
    await recovery.finalize(input);
    await unlink(resolve(recovery.runRoot, "finalization.json"));

    const resumed = await recovery.finalize(input);
    expect(resumed.status).toBe("UNKNOWN_OUTCOME");
    expect((await recovery.verify()).status).toBe("VALID");
    const lifecycle = (await readFile(
      resolve(recovery.runRoot, "lifecycle.jsonl"),
      "utf8",
    ))
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line));
    expect(
      lifecycle.filter((event) => event.status === "UNKNOWN_OUTCOME"),
    ).toHaveLength(1);

    await unlink(resolve(recovery.runRoot, "finalization.json"));
    await expect(
      recovery.finalize({
        ...input,
        recovery_action: "different recovery action",
      }),
    ).rejects.toThrow("does not match recovery authority");
  });

  test("rejects a leap-second stale mutation lock before expiry arithmetic", async () => {
    const root = await temporaryRoot();
    const identity = identities();
    const base = new CampaignArtifactStore(root, "run-leap-second-stale-lock");
    await base.reserve(reservationInput(identity));
    await base
      .withAuthority(identity.operator, "lease-1")
      .appendLifecycle({ status: "RUNNING" });
    await writeFile(
      resolve(root, ".run-leap-second-stale-lock.mutation.lock"),
      `${JSON.stringify({
        schema_version: CAMPAIGN_ARTIFACT_SCHEMA_VERSION,
        artifact_type: "campaign-mutation-lock",
        run_id: "run-leap-second-stale-lock",
        pid: 99_999_999,
        token: "leap-second-stale-token",
        acquired_at: "2020-06-30T23:59:60Z",
        owner: identity.operator,
        lease_id: "lease-1",
        lease_generation: 0,
        takeover_claim_digest: null,
      })}\n`,
      { mode: 0o600 },
    );

    await expect(
      base.withAuthority(identity.recovery).finalize({
        status: "UNKNOWN_OUTCOME",
        finalized_by: identity.recovery,
        recovery_reason: "invalid stale timestamp",
        recovery_action: "must fail before stale takeover",
        recovery_cleanup_status: "UNKNOWN",
      }),
    ).rejects.toThrow("campaign mutation lock is invalid");
  });

  test("lets only the reserved recovery identity take over an expired identity-bound mutation lock", async () => {
    const root = await temporaryRoot();
    const identity = identities();
    const base = new CampaignArtifactStore(root, "run-stale-lock");
    await base.reserve(reservationInput(identity));
    const operator = base.withAuthority(identity.operator, "lease-1");
    await operator.appendLifecycle({ status: "RUNNING" });
    const lease = await base.readCurrentLease();
    await writeFile(
      resolve(base.runRoot, "lease.json"),
      JSON.stringify({
        ...lease,
        acquired_at: "2020-01-01T00:00:00.000Z",
        renewed_at: "2020-01-01T00:00:00.000Z",
        expires_at: "2020-01-01T00:01:00.000Z",
      }),
      { mode: 0o600 },
    );
    await writeFile(
      resolve(root, ".run-stale-lock.mutation.lock"),
      JSON.stringify({
        schema_version: CAMPAIGN_ARTIFACT_SCHEMA_VERSION,
        artifact_type: "campaign-mutation-lock",
        run_id: "run-stale-lock",
        pid: 99_999_999,
        token: "stale-token",
        acquired_at: "2020-01-01T00:00:00.000Z",
        owner: identity.operator,
        lease_id: "lease-1",
        lease_generation: 0,
        takeover_claim_digest: null,
      }),
      { mode: 0o600 },
    );

    await expect(
      base.withAuthority(identity.evaluator).finalize({
        status: "UNKNOWN_OUTCOME",
        finalized_by: identity.evaluator,
        recovery_reason: "not authorized",
        recovery_action: "none",
        recovery_cleanup_status: "UNKNOWN",
      }),
    ).rejects.toThrow("reserved recovery identity");
    expect(
      await stat(resolve(root, ".run-stale-lock.mutation.lock")),
    ).toBeTruthy();

    const recovery = base.withAuthority(identity.recovery);
    const recoveryInput = {
      status: "UNKNOWN_OUTCOME",
      finalized_by: identity.recovery,
      recovery_reason: "expired operator lock",
      recovery_action: "identity-bound stale-lock takeover",
      recovery_cleanup_status: "UNKNOWN",
    } as const;
    const contenders = await Promise.allSettled([
      recovery.finalize(recoveryInput),
      base.withAuthority(identity.recovery).finalize(recoveryInput),
    ]);
    expect(
      contenders.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    expect(
      contenders.filter((result) => result.status === "rejected"),
    ).toHaveLength(1);
    expect(
      await recovery.artifactFileExists(
        "recovery/mutation-lock-takeovers/stale-token.json",
      ),
    ).toBe(true);
    expect((await recovery.verify()).status).toBe("VALID");
  });

  test("reconciles every persisted stale-lock takeover crash phase before mutation", async () => {
    const root = await temporaryRoot();
    const identity = identities();
    const phases = [
      "claimed",
      "quarantined",
      "receipted",
      "quarantine-dropped",
      "successor-written",
    ] as const;
    for (const [index, phase] of phases.entries()) {
      const runId = `run-takeover-${index}`;
      const base = new CampaignArtifactStore(root, runId);
      await base.reserve(reservationInput(identity));
      await base
        .withAuthority(identity.operator, "lease-1")
        .appendLifecycle({ status: "RUNNING" });
      const lease = await base.readCurrentLease();
      const expiredLease = {
        ...lease,
        acquired_at: "2020-01-01T00:00:00.000Z",
        renewed_at: "2020-01-01T00:00:00.000Z",
        expires_at: "2020-01-01T00:01:00.000Z",
      };
      await writeFile(
        resolve(base.runRoot, "lease.json"),
        `${JSON.stringify(expiredLease)}\n`,
        { mode: 0o600 },
      );
      const previousLock = {
        schema_version: CAMPAIGN_ARTIFACT_SCHEMA_VERSION,
        artifact_type: "campaign-mutation-lock",
        run_id: runId,
        pid: 99_999_999,
        token: `stale-${index}`,
        acquired_at: "2020-01-01T00:00:00.000Z",
        owner: identity.operator,
        lease_id: "lease-1",
        lease_generation: expiredLease.generation,
        takeover_claim_digest: null,
      };
      const reason = `reconcile ${phase}`;
      const claim = {
        schema_version: CAMPAIGN_ARTIFACT_SCHEMA_VERSION,
        artifact_type: "campaign-mutation-lock-takeover-claim",
        run_id: runId,
        previous_lock: previousLock,
        previous_lock_digest: sha256Text(stableJson(previousLock)),
        lease_state: expiredLease,
        lease_state_digest: sha256Text(stableJson(expiredLease)),
        lease_generation: expiredLease.generation,
        recovery_identity: identity.recovery,
        reason,
        quarantined_path: `.${runId}.mutation.lock.quarantine-${previousLock.token}`,
        successor_token: `successor-${index}`,
        created_at: "2026-08-05T00:00:00.000Z",
      };
      const claimDigest = sha256Text(stableJson(claim));
      const receipt = {
        ...claim,
        artifact_type: "campaign-mutation-lock-takeover",
        claim_digest: claimDigest,
        quarantined_at: "2026-08-05T00:00:01.000Z",
      };
      const lockPath = resolve(root, `.${runId}.mutation.lock`);
      const quarantinePath = `${lockPath}.quarantine-${previousLock.token}`;
      const claimPath = resolve(root, `.${runId}.mutation.takeover.json`);
      const receiptPath = resolve(
        base.runRoot,
        `recovery/mutation-lock-takeovers/${previousLock.token}.json`,
      );
      await writeFile(claimPath, `${JSON.stringify(claim)}\n`, { mode: 0o600 });
      if (phase === "claimed") {
        await writeFile(lockPath, `${JSON.stringify(previousLock)}\n`, {
          mode: 0o600,
        });
      } else if (phase === "quarantined") {
        await writeFile(quarantinePath, `${JSON.stringify(previousLock)}\n`, {
          mode: 0o600,
        });
      } else {
        await mkdir(resolve(base.runRoot, "recovery/mutation-lock-takeovers"), {
          recursive: true,
          mode: 0o700,
        });
        await writeFile(receiptPath, `${JSON.stringify(receipt)}\n`, {
          mode: 0o600,
        });
        if (phase === "receipted") {
          await writeFile(quarantinePath, `${JSON.stringify(previousLock)}\n`, {
            mode: 0o600,
          });
        } else if (phase === "successor-written") {
          await writeFile(
            lockPath,
            `${JSON.stringify({
              schema_version: CAMPAIGN_ARTIFACT_SCHEMA_VERSION,
              artifact_type: "campaign-mutation-lock",
              run_id: runId,
              pid: 99_999_999,
              token: claim.successor_token,
              acquired_at: "2020-01-01T00:00:02.000Z",
              owner: identity.recovery,
              lease_id: null,
              lease_generation: claim.lease_generation,
              takeover_claim_digest: claimDigest,
            })}\n`,
            { mode: 0o600 },
          );
        }
      }

      const recovery = base.withAuthority(identity.recovery);
      await recovery.finalize({
        status: "UNKNOWN_OUTCOME",
        finalized_by: identity.recovery,
        recovery_reason: reason,
        recovery_action: `resume from ${phase}`,
        recovery_cleanup_status: "UNKNOWN",
      });
      expect(await recovery.artifactFileExists(
        `recovery/mutation-lock-takeovers/${previousLock.token}.json`,
      )).toBe(true);
      expect(await stat(claimPath).catch(() => null)).toBeNull();
      expect(await stat(quarantinePath).catch(() => null)).toBeNull();
      expect((await recovery.verify()).status).toBe("VALID");
    }
  });

  test("rejects persisted operator claims before exact lease expiry without mutation", async () => {
    const root = await temporaryRoot();
    const identity = identities();
    for (const [suffix, createdAt, expectedError] of [
      [
        "one-nanosecond",
        "2099-07-30T10:59:59.999999999Z",
        "campaign mutation lock takeover claim has invalid identity, lease binding, or chronology",
      ],
      [
        "active-wall-clock",
        "2099-07-30T11:00:00.000000001Z",
        "campaign mutation lock takeover claim precedes operator lease expiry",
      ],
    ] as const) {
      const runId = `run-persisted-claim-${suffix}`;
      const base = new CampaignArtifactStore(root, runId);
      await base.reserve(reservationInput(identity));
      await base
        .withAuthority(identity.operator, "lease-1")
        .appendLifecycle({ status: "RUNNING" });
      const lease = await base.readCurrentLease();
      const previousLock = {
        schema_version: CAMPAIGN_ARTIFACT_SCHEMA_VERSION,
        artifact_type: "campaign-mutation-lock",
        run_id: runId,
        pid: 99_999_999,
        token: `${suffix}-token`,
        acquired_at: "2026-08-05T00:00:00.000Z",
        owner: identity.operator,
        lease_id: lease.lease_id,
        lease_generation: lease.generation,
        takeover_claim_digest: null,
      };
      const reason = `reject ${suffix} persisted claim`;
      const claim = {
        schema_version: CAMPAIGN_ARTIFACT_SCHEMA_VERSION,
        artifact_type: "campaign-mutation-lock-takeover-claim",
        run_id: runId,
        previous_lock: previousLock,
        previous_lock_digest: sha256Text(stableJson(previousLock)),
        lease_state: lease,
        lease_state_digest: sha256Text(stableJson(lease)),
        lease_generation: lease.generation,
        recovery_identity: identity.recovery,
        reason,
        quarantined_path: `.${runId}.mutation.lock.quarantine-${previousLock.token}`,
        successor_token: `${suffix}-successor`,
        created_at: createdAt,
      };
      const lockPath = resolve(root, `.${runId}.mutation.lock`);
      const claimPath = resolve(root, `.${runId}.mutation.takeover.json`);
      const quarantinePath = `${lockPath}.quarantine-${previousLock.token}`;
      const receiptPath = resolve(
        base.runRoot,
        `recovery/mutation-lock-takeovers/${previousLock.token}.json`,
      );
      const lockText = `${stableJson(previousLock, true)}\n`;
      const claimText = `${stableJson(claim, true)}\n`;
      await writeFile(lockPath, lockText, { mode: 0o600 });
      await writeFile(claimPath, claimText, { mode: 0o600 });

      await expect(
        base.withAuthority(identity.recovery).finalize({
          status: "UNKNOWN_OUTCOME",
          finalized_by: identity.recovery,
          recovery_reason: reason,
          recovery_action: "reject invalid persisted claim",
          recovery_cleanup_status: "UNKNOWN",
        }),
      ).rejects.toThrow(expectedError);
      expect(await readFile(lockPath, "utf8")).toBe(lockText);
      expect(await readFile(claimPath, "utf8")).toBe(claimText);
      expect(await stat(quarantinePath).catch(() => null)).toBeNull();
      expect(await stat(receiptPath).catch(() => null)).toBeNull();
      expect(
        await stat(resolve(base.runRoot, "finalization.json")).catch(() => null),
      ).toBeNull();
    }
  });

  test("rejects a future persisted takeover claim at one reconciliation boundary without mutation", async () => {
    const root = await temporaryRoot();
    const identity = identities();
    const runId = "run-future-takeover-claim";
    const base = new CampaignArtifactStore(root, runId);
    await base.reserve(reservationInput(identity));
    await base
      .withAuthority(identity.operator, "lease-1")
      .appendLifecycle({ status: "RUNNING" });
    const lease = {
      ...(await base.readCurrentLease()),
      acquired_at: "2020-01-01T00:00:00.000Z",
      renewed_at: "2020-01-01T00:00:00.000Z",
      expires_at: "2020-01-01T00:01:00.000Z",
    };
    const leasePath = resolve(base.runRoot, "lease.json");
    await writeFile(leasePath, `${stableJson(lease, true)}\n`, { mode: 0o600 });
    const previousLock = {
      schema_version: CAMPAIGN_ARTIFACT_SCHEMA_VERSION,
      artifact_type: "campaign-mutation-lock",
      run_id: runId,
      pid: 99_999_999,
      token: "future-claim-token",
      acquired_at: "2020-01-01T00:00:00.000Z",
      owner: identity.operator,
      lease_id: lease.lease_id,
      lease_generation: lease.generation,
      takeover_claim_digest: null,
    };
    const reason = "reject future persisted claim";
    const claim = {
      schema_version: CAMPAIGN_ARTIFACT_SCHEMA_VERSION,
      artifact_type: "campaign-mutation-lock-takeover-claim",
      run_id: runId,
      previous_lock: previousLock,
      previous_lock_digest: sha256Text(stableJson(previousLock)),
      lease_state: lease,
      lease_state_digest: sha256Text(stableJson(lease)),
      lease_generation: lease.generation,
      recovery_identity: identity.recovery,
      reason,
      quarantined_path: `.${runId}.mutation.lock.quarantine-${previousLock.token}`,
      successor_token: "future-claim-successor",
      created_at: "2099-01-01T00:00:00.000Z",
    };
    const lockPath = resolve(root, `.${runId}.mutation.lock`);
    const claimPath = resolve(root, `.${runId}.mutation.takeover.json`);
    const quarantinePath = `${lockPath}.quarantine-${previousLock.token}`;
    const receiptPath = resolve(
      base.runRoot,
      `recovery/mutation-lock-takeovers/${previousLock.token}.json`,
    );
    await writeFile(lockPath, `${stableJson(previousLock, true)}\n`, { mode: 0o600 });
    await writeFile(claimPath, `${stableJson(claim, true)}\n`, { mode: 0o600 });
    const protectedPaths = [
      lockPath,
      claimPath,
      quarantinePath,
      receiptPath,
      leasePath,
      resolve(base.runRoot, "lifecycle.jsonl"),
      resolve(base.runRoot, "recovery/recovery-receipt.json"),
      resolve(base.runRoot, "finalization.json"),
    ];
    const before = await snapshotBytes(protectedPaths);

    await expect(
      base.withAuthority(identity.recovery).finalize({
        status: "UNKNOWN_OUTCOME",
        finalized_by: identity.recovery,
        recovery_reason: reason,
        recovery_action: "reject future reconciliation state",
        recovery_cleanup_status: "UNKNOWN",
      }),
    ).rejects.toThrow(
      "campaign mutation lock takeover chronology exceeds its reconciliation, terminal, or finalization boundary",
    );
    await expectBytesUnchanged(before);
  });

  test("rejects a preseeded receipt beside its active previous lock without mutation", async () => {
    const root = await temporaryRoot();
    const identity = identities();
    const runId = "run-receipt-with-active-previous-lock";
    const base = new CampaignArtifactStore(root, runId);
    await base.reserve(reservationInput(identity));
    await base
      .withAuthority(identity.operator, "lease-1")
      .appendLifecycle({ status: "RUNNING" });
    const lease = {
      ...(await base.readCurrentLease()),
      acquired_at: "2020-01-01T00:00:00.000Z",
      renewed_at: "2020-01-01T00:00:00.000Z",
      expires_at: "2020-01-01T00:01:00.000Z",
    };
    const leasePath = resolve(base.runRoot, "lease.json");
    await writeFile(leasePath, `${stableJson(lease, true)}\n`, { mode: 0o600 });
    const previousLock = {
      schema_version: CAMPAIGN_ARTIFACT_SCHEMA_VERSION,
      artifact_type: "campaign-mutation-lock",
      run_id: runId,
      pid: 99_999_999,
      token: "receipt-active-token",
      acquired_at: "2020-01-01T00:00:00.000Z",
      owner: identity.operator,
      lease_id: lease.lease_id,
      lease_generation: lease.generation,
      takeover_claim_digest: null,
    };
    const reason = "reject receipt with active previous lock";
    const claim = {
      schema_version: CAMPAIGN_ARTIFACT_SCHEMA_VERSION,
      artifact_type: "campaign-mutation-lock-takeover-claim",
      run_id: runId,
      previous_lock: previousLock,
      previous_lock_digest: sha256Text(stableJson(previousLock)),
      lease_state: lease,
      lease_state_digest: sha256Text(stableJson(lease)),
      lease_generation: lease.generation,
      recovery_identity: identity.recovery,
      reason,
      quarantined_path: `.${runId}.mutation.lock.quarantine-${previousLock.token}`,
      successor_token: "receipt-active-successor",
      created_at: "2026-01-01T00:00:00.000Z",
    };
    const receipt = {
      ...claim,
      artifact_type: "campaign-mutation-lock-takeover",
      claim_digest: sha256Text(stableJson(claim)),
      quarantined_at: "2026-01-01T00:00:01.000Z",
    };
    const lockPath = resolve(root, `.${runId}.mutation.lock`);
    const claimPath = resolve(root, `.${runId}.mutation.takeover.json`);
    const quarantinePath = `${lockPath}.quarantine-${previousLock.token}`;
    const receiptPath = resolve(
      base.runRoot,
      `recovery/mutation-lock-takeovers/${previousLock.token}.json`,
    );
    await mkdir(resolve(base.runRoot, "recovery/mutation-lock-takeovers"), {
      recursive: true,
      mode: 0o700,
    });
    await writeFile(lockPath, `${stableJson(previousLock, true)}\n`, { mode: 0o600 });
    await writeFile(claimPath, `${stableJson(claim, true)}\n`, { mode: 0o600 });
    await writeFile(receiptPath, `${stableJson(receipt, true)}\n`, { mode: 0o600 });
    const protectedPaths = [
      lockPath,
      claimPath,
      quarantinePath,
      receiptPath,
      leasePath,
      resolve(base.runRoot, "lifecycle.jsonl"),
      resolve(base.runRoot, "recovery/recovery-receipt.json"),
      resolve(base.runRoot, "finalization.json"),
    ];
    const before = await snapshotBytes(protectedPaths);

    await expect(
      base.withAuthority(identity.recovery).finalize({
        status: "UNKNOWN_OUTCOME",
        finalized_by: identity.recovery,
        recovery_reason: reason,
        recovery_action: "reject impossible persisted phase",
        recovery_cleanup_status: "UNKNOWN",
      }),
    ).rejects.toThrow(
      "campaign mutation lock takeover receipt cannot coexist with its active previous lock",
    );
    await expectBytesUnchanged(before);
  });

  test("rejects pre-terminal claims and post-completion quarantines before mutation", async () => {
    const root = await temporaryRoot();
    const identity = identities();
    for (const chronology of ["pre-terminal", "post-completion"] as const) {
      const runId = `run-${chronology}-takeover-chronology`;
      const seeded = await seedCurrentRun(root, runId);
      const lease = {
        ...seeded.leaseState,
        acquired_at: "2019-01-01T00:00:00.000Z",
        renewed_at: "2019-01-01T00:00:00.000Z",
        expires_at: "2019-01-01T00:01:00.000Z",
      };
      await rewriteCurrentLeaseAndLinkage(seeded, lease);
      const terminalPath = seeded.terminalLockPath;
      const finalizationPath = seeded.finalizationPath;
      const terminal = JSON.parse(await readFile(terminalPath, "utf8"));
      terminal.produced_at = "2020-01-01T00:02:00.000000000Z";
      const terminalText = `${stableJson(terminal, true)}\n`;
      await writeFile(terminalPath, terminalText, { mode: 0o600 });
      const finalization = JSON.parse(await readFile(finalizationPath, "utf8"));
      finalization.finalized_at = "2020-01-01T00:03:00.000000000Z";
      finalization.completed_at = finalization.finalized_at;
      finalization.application_files = terminal.application_files;
      finalization.application_manifest_digest = terminal.application_manifest_digest;
      replaceArtifactRecord(finalization.files, "terminal.lock", terminalText);
      finalization.terminal_lock_digest = sha256Text(terminalText);
      finalization.manifest_digest = sha256Text(stableJson(finalization.files));
      await writeFile(
        finalizationPath,
        `${stableJson(finalization, true)}\n`,
        { mode: 0o600 },
      );
      const previousLock = {
        schema_version: CAMPAIGN_ARTIFACT_SCHEMA_VERSION,
        artifact_type: "campaign-mutation-lock",
        run_id: runId,
        pid: 99_999_999,
        token: `${chronology}-token`,
        acquired_at: "2019-01-01T00:00:00.000Z",
        owner: identity.operator,
        lease_id: lease.lease_id,
        lease_generation: lease.generation,
        takeover_claim_digest: null,
      };
      const reason = `reject ${chronology} chronology`;
      const claim = {
        schema_version: CAMPAIGN_ARTIFACT_SCHEMA_VERSION,
        artifact_type: "campaign-mutation-lock-takeover-claim",
        run_id: runId,
        previous_lock: previousLock,
        previous_lock_digest: sha256Text(stableJson(previousLock)),
        lease_state: lease,
        lease_state_digest: sha256Text(stableJson(lease)),
        lease_generation: lease.generation,
        recovery_identity: identity.recovery,
        reason,
        quarantined_path: `.${runId}.mutation.lock.quarantine-${previousLock.token}`,
        successor_token: `${chronology}-successor`,
        created_at: chronology === "pre-terminal"
          ? "2020-01-01T00:01:59.999999999Z"
          : terminal.produced_at,
      };
      const receipt = {
        ...claim,
        artifact_type: "campaign-mutation-lock-takeover",
        claim_digest: sha256Text(stableJson(claim)),
        quarantined_at: chronology === "pre-terminal"
          ? "2020-01-01T00:02:30.000000000Z"
          : "2020-01-01T00:03:00.000000001Z",
      };
      const lockPath = resolve(root, `.${runId}.mutation.lock`);
      const claimPath = resolve(root, `.${runId}.mutation.takeover.json`);
      const quarantinePath = `${lockPath}.quarantine-${previousLock.token}`;
      const receiptPath = resolve(
        seeded.store.runRoot,
        `recovery/mutation-lock-takeovers/${previousLock.token}.json`,
      );
      await mkdir(resolve(seeded.store.runRoot, "recovery/mutation-lock-takeovers"), {
        recursive: true,
        mode: 0o700,
      });
      await writeFile(claimPath, `${stableJson(claim, true)}\n`, { mode: 0o600 });
      await writeFile(quarantinePath, `${stableJson(previousLock, true)}\n`, {
        mode: 0o600,
      });
      await writeFile(receiptPath, `${stableJson(receipt, true)}\n`, { mode: 0o600 });
      const protectedPaths = [
        lockPath,
        claimPath,
        quarantinePath,
        receiptPath,
        seeded.leaseStatePath,
        terminalPath,
        finalizationPath,
        resolve(seeded.store.runRoot, "lifecycle.jsonl"),
      ];
      const before = await snapshotBytes(protectedPaths);

      await expect(
        seeded.store.withAuthority(identity.recovery).finalize({
          status: "COMPLETED",
          finalized_by: identity.recovery,
          recovery_reason: reason,
        }),
      ).rejects.toThrow(
        "campaign mutation lock takeover chronology exceeds its reconciliation, terminal, or finalization boundary",
      );
      await expectBytesUnchanged(before);
    }
  });

  test("rejects reversed interrupted reconciliation chronology before deletion", async () => {
    const root = await temporaryRoot();
    const identity = identities();
    const runId = "run-reversed-interrupted-reconciliation";
    const base = new CampaignArtifactStore(root, runId);
    await base.reserve(reservationInput(identity));
    await base
      .withAuthority(identity.operator, "lease-1")
      .appendLifecycle({ status: "RUNNING" });
    const lease = {
      ...(await base.readCurrentLease()),
      acquired_at: "2020-01-01T00:00:00.000Z",
      renewed_at: "2020-01-01T00:00:00.000Z",
      expires_at: "2020-01-01T00:01:00.000Z",
    };
    await writeFile(
      resolve(base.runRoot, "lease.json"),
      `${stableJson(lease, true)}\n`,
      { mode: 0o600 },
    );
    const previousLock = {
      schema_version: CAMPAIGN_ARTIFACT_SCHEMA_VERSION,
      artifact_type: "campaign-mutation-lock",
      run_id: runId,
      pid: 99_999_999,
      token: "reversed-interrupted-token",
      acquired_at: "2020-01-01T00:00:00.000Z",
      owner: identity.operator,
      lease_id: lease.lease_id,
      lease_generation: lease.generation,
      takeover_claim_digest: null,
    };
    const reason = "reject reversed interrupted reconciliation";
    const claim = {
      schema_version: CAMPAIGN_ARTIFACT_SCHEMA_VERSION,
      artifact_type: "campaign-mutation-lock-takeover-claim",
      run_id: runId,
      previous_lock: previousLock,
      previous_lock_digest: sha256Text(stableJson(previousLock)),
      lease_state: lease,
      lease_state_digest: sha256Text(stableJson(lease)),
      lease_generation: lease.generation,
      recovery_identity: identity.recovery,
      reason,
      quarantined_path: `.${runId}.mutation.lock.quarantine-${previousLock.token}`,
      successor_token: "reversed-interrupted-successor",
      created_at: "2026-08-05T00:00:00.123456790Z",
    };
    const receipt = {
      ...claim,
      artifact_type: "campaign-mutation-lock-takeover",
      claim_digest: sha256Text(stableJson(claim)),
      quarantined_at: "2026-08-05T00:00:00.123456789Z",
    };
    const claimPath = resolve(root, `.${runId}.mutation.takeover.json`);
    const lockPath = resolve(root, `.${runId}.mutation.lock`);
    const quarantinePath = `${lockPath}.quarantine-${previousLock.token}`;
    const receiptPath = resolve(
      base.runRoot,
      `recovery/mutation-lock-takeovers/${previousLock.token}.json`,
    );
    await mkdir(resolve(base.runRoot, "recovery/mutation-lock-takeovers"), {
      recursive: true,
      mode: 0o700,
    });
    const claimText = `${stableJson(claim, true)}\n`;
    const lockText = `${stableJson(previousLock, true)}\n`;
    const receiptText = `${stableJson(receipt, true)}\n`;
    await writeFile(claimPath, claimText, { mode: 0o600 });
    await writeFile(quarantinePath, lockText, { mode: 0o600 });
    await writeFile(receiptPath, receiptText, { mode: 0o600 });

    await expect(
      base.withAuthority(identity.recovery).finalize({
        status: "UNKNOWN_OUTCOME",
        finalized_by: identity.recovery,
        recovery_reason: reason,
        recovery_action: "resume interrupted reconciliation",
        recovery_cleanup_status: "UNKNOWN",
      }),
    ).rejects.toThrow(
      "campaign mutation lock takeover receipt has invalid identity, lease binding, or chronology",
    );
    expect(await readFile(claimPath, "utf8")).toBe(claimText);
    expect(await readFile(quarantinePath, "utf8")).toBe(lockText);
    expect(await readFile(receiptPath, "utf8")).toBe(receiptText);
    expect(await stat(lockPath).catch(() => null)).toBeNull();
    expect(
      await stat(resolve(base.runRoot, "finalization.json")).catch(() => null),
    ).toBeNull();
  });

  test("blocks orphan quarantine, lease-generation drift, and live-owner takeover", async () => {
    const root = await temporaryRoot();
    const identity = identities();
    for (const [runId, mutation] of [
      ["run-orphan-quarantine", "orphan"],
      ["run-generation-drift", "generation"],
      ["run-live-lock", "live"],
    ] as const) {
      const base = new CampaignArtifactStore(root, runId);
      await base.reserve(reservationInput(identity));
      await base
        .withAuthority(identity.operator, "lease-1")
        .appendLifecycle({ status: "RUNNING" });
      const lease = await base.readCurrentLease();
      await writeFile(
        resolve(base.runRoot, "lease.json"),
        `${JSON.stringify({
          ...lease,
          acquired_at: "2020-01-01T00:00:00.000Z",
          renewed_at: "2020-01-01T00:00:00.000Z",
          expires_at: "2020-01-01T00:01:00.000Z",
        })}\n`,
        { mode: 0o600 },
      );
      const lock = {
        schema_version: CAMPAIGN_ARTIFACT_SCHEMA_VERSION,
        artifact_type: "campaign-mutation-lock",
        run_id: runId,
        pid: mutation === "live" ? process.pid : 99_999_999,
        token: `${mutation}-token`,
        acquired_at: "2020-01-01T00:00:00.000Z",
        owner: identity.operator,
        lease_id: "lease-1",
        lease_generation: mutation === "generation" ? 1 : 0,
        takeover_claim_digest: null,
      };
      const lockPath = resolve(root, `.${runId}.mutation.lock`);
      const targetPath =
        mutation === "orphan"
          ? `${lockPath}.quarantine-${lock.token}`
          : lockPath;
      await writeFile(targetPath, `${JSON.stringify(lock)}\n`, { mode: 0o600 });
      const attempt = base.withAuthority(identity.recovery).finalize({
        status: "UNKNOWN_OUTCOME",
        finalized_by: identity.recovery,
        recovery_reason: mutation,
        recovery_action: "bounded recovery",
        recovery_cleanup_status: "UNKNOWN",
      });
      await expect(attempt).rejects.toThrow(
        mutation === "orphan"
          ? "orphan campaign mutation lock quarantine"
          : mutation === "generation"
            ? "recoverable lease generation"
            : "belongs to a live process",
      );
    }

    const runId = "run-live-persisted-claim";
    const base = new CampaignArtifactStore(root, runId);
    await base.reserve(reservationInput(identity));
    await base
      .withAuthority(identity.operator, "lease-1")
      .appendLifecycle({ status: "RUNNING" });
    const currentLease = await base.readCurrentLease();
    const expiredLease = {
      ...currentLease,
      acquired_at: "2020-01-01T00:00:00.000Z",
      renewed_at: "2020-01-01T00:00:00.000Z",
      expires_at: "2020-01-01T00:01:00.000Z",
    };
    await writeFile(
      resolve(base.runRoot, "lease.json"),
      `${JSON.stringify(expiredLease)}\n`,
      { mode: 0o600 },
    );
    const liveLock = {
      schema_version: CAMPAIGN_ARTIFACT_SCHEMA_VERSION,
      artifact_type: "campaign-mutation-lock",
      run_id: runId,
      pid: process.pid,
      token: "live-claim-token",
      acquired_at: "2020-01-01T00:00:00.000Z",
      owner: identity.operator,
      lease_id: "lease-1",
      lease_generation: 0,
      takeover_claim_digest: null,
    };
    const reason = "persisted claim cannot reclaim a live owner";
    const liveClaim = {
      schema_version: CAMPAIGN_ARTIFACT_SCHEMA_VERSION,
      artifact_type: "campaign-mutation-lock-takeover-claim",
      run_id: runId,
      previous_lock: liveLock,
      previous_lock_digest: sha256Text(stableJson(liveLock)),
      lease_state: expiredLease,
      lease_state_digest: sha256Text(stableJson(expiredLease)),
      lease_generation: 0,
      recovery_identity: identity.recovery,
      reason,
      quarantined_path: `.${runId}.mutation.lock.quarantine-${liveLock.token}`,
      successor_token: "live-claim-successor",
      created_at: "2026-08-05T00:00:00.000Z",
    };
    await writeFile(
      resolve(root, `.${runId}.mutation.lock`),
      `${JSON.stringify(liveLock)}\n`,
      { mode: 0o600 },
    );
    await writeFile(
      resolve(root, `.${runId}.mutation.takeover.json`),
      `${JSON.stringify(liveClaim)}\n`,
      { mode: 0o600 },
    );
    await expect(
      base.withAuthority(identity.recovery).finalize({
        status: "UNKNOWN_OUTCOME",
        finalized_by: identity.recovery,
        recovery_reason: reason,
        recovery_action: "must not quarantine live owner",
        recovery_cleanup_status: "UNKNOWN",
      }),
    ).rejects.toThrow("targets a live process");
  });

  test("enforces maintainers-only modes and rejects governed read permission drift", async () => {
    const root = await temporaryRoot();
    const store = await authorizedStore(root, "run-private-modes");
    await store.writeStageJson("execution/private.json", { status: "PRIVATE" });

    for (const directory of [root, store.runRoot, resolve(store.runRoot, "execution")]) {
      expect((await stat(directory)).mode & 0o777).toBe(0o700);
    }
    for (const file of [
      resolve(store.runRoot, "reservation.json"),
      resolve(store.runRoot, "lease.json"),
      resolve(store.runRoot, "execution/private.json"),
    ]) {
      expect((await stat(file)).mode & 0o777).toBe(0o600);
    }

    await chmod(resolve(store.runRoot, "execution/private.json"), 0o644);
    await expect(
      store.readArtifactJson("execution/private.json"),
    ).rejects.toThrow("maintainers-only file permissions");

    await chmod(resolve(store.runRoot, "execution/private.json"), 0o600);
    const outside = resolve(root, "outside.json");
    await writeFile(outside, '{"status":"OUTSIDE"}\n', { mode: 0o600 });
    await symlink(
      outside,
      resolve(store.runRoot, "execution/private-link.json"),
    );
    await expect(
      store.readArtifactJson("execution/private-link.json"),
    ).rejects.toThrow();
    await expect(store.readArtifactJson("../outside.json")).rejects.toThrow(
      "escapes run root",
    );
  });

  test("rejects governed FIFO and socket reads without blocking", async () => {
    const root = resolve("/tmp", `cascade-special-${crypto.randomUUID().slice(0, 8)}`);
    await mkdir(root, { mode: 0o700 });
    temporaryRoots.push(root);
    const store = await authorizedStore(root, "run-special-file-reads");
    const fifoPath = resolve(store.runRoot, "execution/input.fifo");
    await mkdir(resolve(store.runRoot, "execution"), {
      recursive: true,
      mode: 0o700,
    });
    const fifoResult = Bun.spawnSync(["mkfifo", fifoPath]);
    expect(fifoResult.exitCode).toBe(0);
    await chmod(fifoPath, 0o600);
    await expect(
      Promise.race([
        store.readArtifactBytes("execution/input.fifo"),
        Bun.sleep(500).then(() => {
          throw new Error("governed FIFO read timed out");
        }),
      ]),
    ).rejects.toThrow(/regular file|ENXIO|ENODEV/);

    const socketPath = resolve(store.runRoot, "execution/input.socket");
    const socketServer = createSocketServer();
    await new Promise<void>((resolveListen, rejectListen) => {
      socketServer.once("error", rejectListen);
      socketServer.listen(socketPath, resolveListen);
    });
    try {
      await expect(
        Promise.race([
          store.readArtifactBytes("execution/input.socket"),
          Bun.sleep(500).then(() => {
            throw new Error("governed socket read timed out");
          }),
        ]),
      ).rejects.toThrow("must be a regular file");
    } finally {
      await new Promise<void>((resolveClose) => socketServer.close(() => resolveClose()));
    }
  });

  test("rejects deterministic artifact ancestor substitution after open", async () => {
    const root = await temporaryRoot();
    const store = await authorizedStore(root, "run-artifact-ancestor-race");
    await store.writeStageJson("execution/input.json", { trusted: true });
    const parked = `${store.runRoot}.parked`;
    const externalRoot = await mkdtemp(
      resolve(tmpdir(), "cascade-artifact-ancestor-race-"),
    );
    temporaryRoots.push(externalRoot);
    const externalRun = resolve(externalRoot, "replacement-run");
    await mkdir(resolve(externalRun, "execution"), {
      recursive: true,
      mode: 0o700,
    });
    await writeFile(
      resolve(externalRun, "execution/input.json"),
      `${stableJson({ trusted: false }, true)}\n`,
      { mode: 0o600 },
    );
    Object.assign(
      store as unknown as {
        artifactReadCheckpoint?: (
          phase: "opened",
          path: string,
        ) => Promise<void>;
      },
      {
        artifactReadCheckpoint: async () => {
          await rename(store.runRoot, parked);
          await symlink(externalRun, store.runRoot);
        },
      },
    );
    try {
      await expect(
        store.readArtifactJson("execution/input.json"),
      ).rejects.toThrow(/physical root|ancestor/);
    } finally {
      Object.assign(
        store as unknown as { artifactReadCheckpoint?: undefined },
        { artifactReadCheckpoint: undefined },
      );
      await rm(store.runRoot, { force: true });
      await rename(parked, store.runRoot);
    }
  });

  test("verifies a finalized run and detects tampering", async () => {
    const root = await temporaryRoot();
    const identity = identities();
    const store = await authorizedStore(root, "run-verify", identity);
    await seedCompletedRun(store);
    await store.finalize({
      status: "COMPLETED",
      finalized_by: identity.operator,
    });

    expect(await store.verify()).toMatchObject({
      status: "VALID",
      run_id: "run-verify",
      finalization_status: "COMPLETED",
    });
    await writeFile(resolve(store.runRoot, "summary.json"), '{"tampered":true}\n');
    await expect(store.verify()).rejects.toThrow("does not match the reservation");
  });

  test("returns verified manifest-bound JSON bytes, record, and value from one snapshot", async () => {
    const root = await temporaryRoot();
    const identity = identities();
    const store = await authorizedStore(root, "run-verified-read", identity);
    await seedCompletedRun(store);
    await store.finalize({
      status: "COMPLETED",
      finalized_by: identity.operator,
    });

    const result = await store.readVerifiedArtifactJson<Record<string, unknown>>(
      "refinements/proposal-1.json",
      "refinement proposal",
    );
    expect(result.verification.finalization_status).toBe("COMPLETED");
    expect(result.record.sha256).toBe(sha256Text(result.bytes.toString("utf8")));
    expect(result.value).toEqual(JSON.parse(result.bytes.toString("utf8")));
  });

  test("rejects deterministic artifact and finalization substitution during verified reads", async () => {
    const root = await temporaryRoot();
    const identity = identities();
    for (const target of ["artifact", "finalization"] as const) {
      const store = await authorizedStore(
        root,
        `run-verified-substitution-${target}`,
        identity,
      );
      await seedCompletedRun(store);
      await store.finalize({
        status: "COMPLETED",
        finalized_by: identity.operator,
      });
      const originalVerify = store.verify.bind(store);
      (store as any).verify = async () => {
        const verification = await originalVerify();
        const path = resolve(
          store.runRoot,
          target === "artifact"
            ? "refinements/proposal-1.json"
            : "finalization.json",
        );
        const parked = `${path}.parked`;
        const bytes = await readFile(path);
        await rename(path, parked);
        await writeFile(
          path,
          target === "artifact" ? Buffer.from("{}\n") : bytes,
          { mode: 0o600 },
        );
        return verification;
      };
      await expect(
        store.readVerifiedArtifactJson(
          "refinements/proposal-1.json",
          "refinement proposal",
        ),
      ).rejects.toThrow();
    }
  });

  test("validates the complete 1.2.0 finalization shape before digest linkage", async () => {
    const root = await temporaryRoot();
    const identity = identities();
    const store = await authorizedStore(root, "run-finalization-contract", identity);
    await seedCompletedRun(store);
    await store.finalize({
      status: "COMPLETED",
      finalized_by: identity.operator,
    });
    const finalizationPath = resolve(store.runRoot, "finalization.json");
    const original = JSON.parse(await readFile(finalizationPath, "utf8"));
    const mutations: Array<[string, (value: Record<string, any>) => void]> = [
      ["extra property", (value) => { value.unexpected = true; }],
      ["malformed timestamp", (value) => { value.finalized_at = "2026-08-05"; }],
      ["impossible calendar timestamp", (value) => {
        value.finalized_at = "2026-02-30T12:00:00Z";
      }],
      ["missing required field", (value) => { delete value.completed_at; }],
      ["invalid status enum", (value) => { value.status = "DONE"; }],
      ["invalid principal", (value) => {
        value.finalized_by = { ...value.finalized_by, unexpected: true };
      }],
      ["invalid nullability", (value) => { value.recovery_reason = 42; }],
      ["invalid files type", (value) => { value.files = {}; }],
    ];
    for (const [, mutate] of mutations) {
      const candidate = structuredClone(original);
      mutate(candidate);
      await writeFile(finalizationPath, `${stableJson(candidate, true)}\n`, {
        mode: 0o600,
      });
      await expect(store.verify()).rejects.toThrow(
        "invalid campaign finalization contract",
      );
    }

    await writeFile(finalizationPath, `${stableJson(original, true)}\n`, {
      mode: 0o600,
    });
    expect((await store.verify()).status).toBe("VALID");
    const schema = JSON.parse(
      await readFile(
        rootPath("product-evals/campaigns/run-artifact.schema.json"),
        "utf8",
      ),
    );
    expect(schema.$defs.finalization.additionalProperties).toBe(false);
    expect([...schema.$defs.finalization.required].sort()).toEqual(
      Object.keys(original).sort(),
    );
    expect(Object.keys(schema.$defs.finalization.properties).sort()).toEqual(
      Object.keys(original).sort(),
    );
  });

  test("keeps public and runtime terminal authority restricted to operator and recovery principals", async () => {
    const root = await temporaryRoot();
    const seeded = await seedCurrentRun(root, "run-terminal-authority-parity");
    const schema = JSON.parse(await readFile(
      rootPath("product-evals/campaigns/run-artifact.schema.json"),
      "utf8",
    ));
    expect(() => assertJsonSchema(seeded.terminalLock, schema)).not.toThrow();
    expect(() => assertJsonSchema(seeded.finalization, schema)).not.toThrow();

    const invalidFinalization = structuredClone(seeded.finalization);
    invalidFinalization.finalized_by = seeded.identity.evaluator;
    invalidFinalization.completed_by = seeded.identity.evaluator;
    expect(() => assertJsonSchema(invalidFinalization, schema)).toThrow();
    await writeFile(
      seeded.finalizationPath,
      `${stableJson(invalidFinalization, true)}\n`,
      { mode: 0o600 },
    );
    await expect(seeded.store.verify()).rejects.toThrow(
      "campaign terminal producer or completion authority is invalid",
    );

    await writeFile(
      seeded.finalizationPath,
      `${stableJson(seeded.finalization, true)}\n`,
      { mode: 0o600 },
    );
    const invalidTerminal = structuredClone(seeded.terminalLock);
    invalidTerminal.produced_by = seeded.identity.evaluator;
    expect(() => assertJsonSchema(invalidTerminal, schema)).toThrow();
    await rewriteCurrentTerminalAndLinkage(seeded, invalidTerminal);
    await expect(seeded.store.verify()).rejects.toThrow(
      "campaign terminal producer or completion authority is invalid",
    );

    const unknownWithOperator = structuredClone(seeded.finalization);
    unknownWithOperator.status = "UNKNOWN_OUTCOME";
    expect(() => assertJsonSchema(unknownWithOperator, schema)).toThrow();
  });

  test("dispatches verification by artifact version and preserves the legacy 1.0.0 shape", async () => {
    const root = await temporaryRoot();
    const runId = "run-legacy-v1";
    const {
      finalization,
      finalizationPath,
      leaseState,
      reservation,
      store,
      terminalLock,
    } = await seedLegacyRun(root, runId);
    expect(await store.verify()).toMatchObject({
      status: "VALID",
      run_id: runId,
      file_count: 4,
    });

    await writeFile(
      finalizationPath,
      `${stableJson({ ...finalization, schema_version: "9.0.0" }, true)}\n`,
      { mode: 0o600 },
    );
    await expect(store.verify()).rejects.toThrow(
      "unsupported campaign artifact schema version: 9.0.0",
    );

    const schema = JSON.parse(
      await readFile(
        rootPath("product-evals/campaigns/run-artifact.schema.json"),
        "utf8",
      ),
    );
    expect(schema.$defs.finalization.properties.schema_version.enum).toEqual(
      ["1.1.0", CAMPAIGN_ARTIFACT_SCHEMA_VERSION],
    );
    expect(schema.$defs.legacyFinalization.properties.schema_version.const).toBe(
      "1.0.0",
    );
    expect(schema.$defs.legacyReservation.additionalProperties).toBe(false);
    expect(schema.$defs.legacyReservation.properties.schema_version.enum)
      .toEqual(["1.0.0", "1.1.0"]);
    expect([...schema.$defs.legacyReservation.required].sort()).toEqual(
      Object.keys(reservation).sort(),
    );
    expect(Object.keys(schema.$defs.legacyReservation.properties).sort()).toEqual(
      Object.keys(reservation).sort(),
    );
    expect(
      Object.keys(
        schema.$defs.legacyReservation.properties.identities.oneOf[0].properties,
      ).sort(),
    ).toEqual(Object.keys(reservation.identities).sort());
    expect(
      schema.$defs.legacyReservation.properties.identities.oneOf[1].properties
        .schema_version.const,
    ).toBe(2);
    expect(
      Object.keys(schema.$defs.legacyReservation.properties.lease.properties).sort(),
    ).toEqual(Object.keys(reservation.lease).sort());
    expect(schema.$defs.legacyLeaseState.additionalProperties).toBe(false);
    expect([...schema.$defs.legacyLeaseState.required].sort()).toEqual(
      Object.keys(leaseState).sort(),
    );
    expect(Object.keys(schema.$defs.legacyLeaseState.properties).sort()).toEqual(
      Object.keys(leaseState).sort(),
    );
    expect(
      schema.oneOf.map((entry: { $ref: string }) => entry.$ref),
    ).toEqual(expect.arrayContaining([
      "#/$defs/legacyReservation",
      "#/$defs/legacyLeaseState",
      "#/$defs/legacyFinalization",
      "#/$defs/legacyTerminalLock",
    ]));
    expect(schema.$defs.terminalIntent.properties.artifact_type.const).toBe(
      "campaign-terminal-intent",
    );
    expect(
      schema.$defs.mutationTakeoverClaim.properties.artifact_type.const,
    ).toBe("campaign-mutation-lock-takeover-claim");
    expect(
      schema.$defs.mutationTakeoverReceipt.properties.artifact_type.const,
    ).toBe("campaign-mutation-lock-takeover");
  });

  test("rejects every legacy finalization shape, type, principal, hash, and file-record violation before linkage", async () => {
    const root = await temporaryRoot();
    const { finalization, finalizationPath, store } = await seedLegacyRun(
      root,
      "run-legacy-finalization-negatives",
    );
    const mutations: Array<
      [string, (value: Record<string, any>) => void]
    > = [
      ["extra property", (value) => { value.unexpected = true; }],
      ["missing property", (value) => { delete value.recovery_reason; }],
      ["artifact type", (value) => { value.artifact_type = "wrong"; }],
      ["run id", (value) => { value.run_id = "other-run"; }],
      ["status", (value) => { value.status = "DONE"; }],
      ["date-only timestamp", (value) => { value.finalized_at = "2026-08-05"; }],
      ["impossible timestamp", (value) => {
        value.finalized_at = "2026-02-30T12:00:00Z";
      }],
      ["non-string timestamp", (value) => { value.finalized_at = 42; }],
      ["principal type", (value) => { value.finalized_by = null; }],
      ["principal extra property", (value) => {
        value.finalized_by = { ...value.finalized_by, unexpected: true };
      }],
      ["principal role", (value) => {
        value.finalized_by = { ...value.finalized_by, role: "admin" };
      }],
      ["principal session", (value) => {
        value.finalized_by = { ...value.finalized_by, session_id: "" };
      }],
      ["principal subject", (value) => {
        value.finalized_by = { ...value.finalized_by, subject: 42 };
      }],
      ["recovery reason type", (value) => { value.recovery_reason = 42; }],
      ["files type", (value) => { value.files = {}; }],
      ["file extra property", (value) => { value.files[0].unexpected = true; }],
      ["file path type", (value) => { value.files[0].path = 42; }],
      ["file path traversal", (value) => { value.files[0].path = "../escape"; }],
      ["file hash", (value) => { value.files[0].sha256 = "invalid"; }],
      ["file size type", (value) => { value.files[0].size = "1"; }],
      ["file size range", (value) => { value.files[0].size = -1; }],
      ["duplicate file path", (value) => {
        value.files[1].path = value.files[0].path;
      }],
      ["manifest hash", (value) => { value.manifest_digest = "invalid"; }],
      ["manifest hash type", (value) => { value.manifest_digest = null; }],
    ];
    for (const [, mutate] of mutations) {
      const candidate = structuredClone(finalization);
      mutate(candidate);
      await writeFile(
        finalizationPath,
        `${stableJson(candidate, true)}\n`,
        { mode: 0o600 },
      );
      await expect(store.verify()).rejects.toThrow(
        "invalid legacy campaign finalization contract",
      );
    }
  });

  test("rejects every legacy terminal-lock shape, type, timestamp, and principal violation", async () => {
    const root = await temporaryRoot();
    const { store, terminalLock, terminalLockPath } = await seedLegacyRun(
      root,
      "run-legacy-terminal-negatives",
    );
    const mutations: Array<
      [string, (value: Record<string, any>) => void]
    > = [
      ["extra property", (value) => { value.unexpected = true; }],
      ["missing property", (value) => { delete value.locked_at; }],
      ["schema version", (value) => { value.schema_version = "1.1.0"; }],
      ["run id", (value) => { value.run_id = "other-run"; }],
      ["status", (value) => { value.status = "DONE"; }],
      ["date-only timestamp", (value) => { value.locked_at = "2026-08-05"; }],
      ["impossible timestamp", (value) => {
        value.locked_at = "2026-02-30T12:00:00Z";
      }],
      ["non-string timestamp", (value) => { value.locked_at = 42; }],
      ["principal type", (value) => { value.locked_by = null; }],
      ["principal extra property", (value) => {
        value.locked_by = { ...value.locked_by, unexpected: true };
      }],
      ["principal role", (value) => {
        value.locked_by = { ...value.locked_by, role: "admin" };
      }],
      ["principal session", (value) => {
        value.locked_by = { ...value.locked_by, session_id: "" };
      }],
      ["principal subject", (value) => {
        value.locked_by = { ...value.locked_by, subject: 42 };
      }],
    ];
    for (const [, mutate] of mutations) {
      const candidate = structuredClone(terminalLock);
      mutate(candidate);
      await writeFile(
        terminalLockPath,
        `${stableJson(candidate, true)}\n`,
        { mode: 0o600 },
      );
      await expect(store.verify()).rejects.toThrow(
        "invalid legacy campaign terminal lock contract",
      );
    }
  });

  test("rejects schema-invalid but digest-consistent legacy reservations and leases", async () => {
    const root = await temporaryRoot();
    const seeded = await seedLegacyRun(
      root,
      "run-legacy-reservation-lease-negatives",
    );

    await rewriteLegacyManifestArtifact(seeded, "reservation.json", {
      ...seeded.reservation,
      unexpected: true,
    });
    await expect(seeded.store.verify()).rejects.toThrow(
      "campaign reservation contract is invalid",
    );

    await rewriteLegacyManifestArtifact(seeded, "reservation.json", {
      ...seeded.reservation,
      lease: {
        ...seeded.reservation.lease,
        recovery_mode: "UNSAFE_RECOVERY",
      },
    });
    await expect(seeded.store.verify()).rejects.toThrow(
      "campaign reservation contract is invalid",
    );

    await rewriteLegacyManifestArtifact(
      seeded,
      "reservation.json",
      seeded.reservation,
    );
    await rewriteLegacyManifestArtifact(seeded, "lease.json", {
      ...seeded.leaseState,
      unexpected: true,
    });
    await expect(seeded.store.verify()).rejects.toThrow(
      "legacy campaign lease state is invalid",
    );

    await rewriteLegacyManifestArtifact(seeded, "lease.json", {
      ...seeded.leaseState,
      recovery_mode: "UNSAFE_RECOVERY",
    });
    await expect(seeded.store.verify()).rejects.toThrow(
      "legacy campaign lease state is invalid",
    );
  });

  test("binds a digest-consistent legacy lease to its reservation and operator", async () => {
    const root = await temporaryRoot();
    const seeded = await seedLegacyRun(root, "run-legacy-lease-binding");

    await rewriteLegacyManifestArtifact(seeded, "lease.json", {
      ...seeded.leaseState,
      lease_id: "other-lease",
    });
    await expect(seeded.store.verify()).rejects.toThrow(
      "campaign lease state does not match reservation",
    );

    await rewriteLegacyManifestArtifact(seeded, "lease.json", {
      ...seeded.leaseState,
      owner_session_id: seeded.identity.evaluator.session_id,
    });
    await expect(seeded.store.verify()).rejects.toThrow(
      "campaign lease state does not match reservation",
    );
  });

  test("rejects digest-consistent current lease shape, recovery, identity, and history violations", async () => {
    const root = await temporaryRoot();
    const seeded = await seedCurrentRun(root, "run-current-lease-negatives");

    await rewriteCurrentLeaseAndLinkage(seeded, {
      ...seeded.leaseState,
      unexpected: true,
    });
    await expect(seeded.store.verify()).rejects.toThrow(
      "campaign lease state is invalid",
    );

    await rewriteCurrentLeaseAndLinkage(seeded, {
      ...seeded.leaseState,
      recovery_mode: "UNSAFE_RECOVERY",
    });
    await expect(seeded.store.verify()).rejects.toThrow(
      "campaign lease state is invalid",
    );

    await rewriteCurrentLeaseAndLinkage(seeded, {
      ...seeded.leaseState,
      lease_id: "unrecorded-lease",
    });
    await expect(seeded.store.verify()).rejects.toThrow(
      "current lease is not bound to its takeover history",
    );

    await rewriteCurrentLeaseAndLinkage(seeded, {
      ...seeded.leaseState,
      owner_session_id: seeded.identity.evaluator.session_id,
    });
    await expect(seeded.store.verify()).rejects.toThrow(
      "campaign lease state does not match reservation",
    );
  });

  test("rejects digest-consistent current terminal shape, timestamp, and identity violations", async () => {
    const root = await temporaryRoot();
    const seeded = await seedCurrentRun(root, "run-current-terminal-negatives");

    await rewriteCurrentTerminalAndLinkage(seeded, {
      ...seeded.terminalLock,
      unexpected: true,
    });
    await expect(seeded.store.verify()).rejects.toThrow(
      "invalid campaign terminal intent contract",
    );

    await rewriteCurrentTerminalAndLinkage(seeded, {
      ...seeded.terminalLock,
      produced_at: "2026-08-05",
    });
    await expect(seeded.store.verify()).rejects.toThrow(
      "invalid campaign terminal intent contract",
    );

    await rewriteCurrentTerminalAndLinkage(seeded, {
      ...seeded.terminalLock,
      produced_at: "2026-02-30T12:00:00Z",
    });
    await expect(seeded.store.verify()).rejects.toThrow(
      "invalid campaign terminal intent contract",
    );

    await rewriteCurrentTerminalAndLinkage(seeded, {
      ...seeded.terminalLock,
      produced_by: seeded.identity.evaluator,
    });
    await expect(seeded.store.verify()).rejects.toThrow(
      "campaign terminal producer or completion authority is invalid",
    );
  });

  test("requires exact digest-consistent current takeover receipts and contiguous lease chains", async () => {
    const buildChain = async (suffix: string) => {
      const root = await temporaryRoot();
      const seeded = await seedCurrentRun(root, `run-current-takeover-${suffix}`);
      const initial = structuredClone(seeded.leaseState) as Record<string, unknown>;
      const replacement1 = {
        ...initial,
        lease_id: "takeover-lease-1",
        generation: 1,
        acquired_at: "2099-07-30T11:01:00.000Z",
        renewed_at: "2099-07-30T11:01:00.000Z",
        expires_at: "2099-07-30T12:01:00.000Z",
      };
      const replacement2 = {
        ...replacement1,
        lease_id: "takeover-lease-2",
        generation: 2,
        acquired_at: "2099-07-30T12:02:00.000Z",
        renewed_at: "2099-07-30T12:02:00.000Z",
        expires_at: "2099-07-30T13:02:00.000Z",
      };
      return {
        initial,
        receipt1: currentTakeoverReceipt(seeded, initial, replacement1),
        receipt2: currentTakeoverReceipt(seeded, replacement1, replacement2),
        replacement1,
        replacement2,
        seeded,
      };
    };

    {
      const chain = await buildChain("extra-field");
      await rewriteCurrentTakeoverHistoryAndLinkage(
        chain.seeded,
        [{ generation: 1, receipt: { ...chain.receipt1, unexpected: true } }],
        chain.replacement1,
      );
      await expect(chain.seeded.store.verify()).rejects.toThrow(
        "campaign lease takeover receipt is invalid or mismatched",
      );
    }

    for (const [suffix, createdAt] of [
      ["date-only", "2099-07-30"],
      ["impossible-date", "2099-02-30T11:01:00Z"],
    ] as const) {
      const chain = await buildChain(suffix);
      await rewriteCurrentTakeoverHistoryAndLinkage(
        chain.seeded,
        [{
          generation: 1,
          receipt: { ...chain.receipt1, created_at: createdAt },
        }],
        chain.replacement1,
      );
      await expect(chain.seeded.store.verify()).rejects.toThrow(
        "campaign lease takeover receipt is invalid or mismatched",
      );
    }

    {
      const chain = await buildChain("unsafe-nested-mode");
      const previousLease = {
        ...chain.initial,
        recovery_mode: "UNSAFE_RECOVERY",
      };
      await rewriteCurrentTakeoverHistoryAndLinkage(
        chain.seeded,
        [{
          generation: 1,
          receipt: currentTakeoverReceipt(
            chain.seeded,
            previousLease,
            chain.replacement1,
          ),
        }],
        chain.replacement1,
      );
      await expect(chain.seeded.store.verify()).rejects.toThrow(
        "campaign lease takeover receipt is invalid or mismatched",
      );
    }

    {
      const chain = await buildChain("nested-extra-field");
      await rewriteCurrentTakeoverHistoryAndLinkage(
        chain.seeded,
        [{
          generation: 1,
          receipt: {
            ...chain.receipt1,
            replacement_lease: { ...chain.replacement1, unexpected: true },
          },
        }],
        chain.replacement1,
      );
      await expect(chain.seeded.store.verify()).rejects.toThrow(
        "campaign lease takeover receipt is invalid or mismatched",
      );
    }

    {
      const chain = await buildChain("first-renewal-drift");
      const forgedPrevious = {
        ...chain.initial,
        generation: 1,
        acquired_at: "2099-07-30T10:05:00.000Z",
        renewed_at: "2099-07-30T10:45:00.000Z",
        expires_at: "2099-07-30T11:45:00.000Z",
      };
      const replacement2 = {
        ...chain.replacement2,
        generation: 2,
        acquired_at: "2099-07-30T11:46:00.000Z",
        renewed_at: "2099-07-30T11:46:00.000Z",
        expires_at: "2099-07-30T12:46:00.000Z",
      };
      await rewriteCurrentTakeoverHistoryAndLinkage(
        chain.seeded,
        [{
          generation: 2,
          receipt: currentTakeoverReceipt(
            chain.seeded,
            forgedPrevious,
            replacement2,
          ),
        }],
        replacement2,
        [{
          status: "HEARTBEAT",
          at: "2099-07-30T10:30:00.000Z",
          lease_id: chain.initial.lease_id,
          lease_generation: 1,
          expires_at: "2099-07-30T11:30:00.000Z",
        }],
      );
      await expect(chain.seeded.store.verify()).rejects.toThrow(
        "campaign heartbeat 1 clock authority is invalid",
      );
    }

    {
      const chain = await buildChain("legitimate-first-renewal");
      const renewedInitial = {
        ...chain.initial,
        generation: 1,
        renewed_at: "2099-07-30T10:30:00.000Z",
        expires_at: "2099-07-30T11:30:00.000Z",
      };
      const replacement2 = {
        ...chain.replacement2,
        generation: 2,
        acquired_at: "2099-07-30T11:31:00.000Z",
        renewed_at: "2099-07-30T11:31:00.000Z",
        expires_at: "2099-07-30T12:31:00.000Z",
      };
      await rewriteCurrentTakeoverHistoryAndLinkage(
        chain.seeded,
        [{
          generation: 2,
          receipt: currentTakeoverReceipt(
            chain.seeded,
            renewedInitial,
            replacement2,
          ),
        }],
        replacement2,
        [{
          status: "HEARTBEAT",
          at: renewedInitial.renewed_at,
          lease_id: renewedInitial.lease_id,
          lease_generation: renewedInitial.generation,
          expires_at: renewedInitial.expires_at,
        }],
      );
      await expect(chain.seeded.store.verify()).rejects.toThrow(
        "campaign heartbeat 1 clock authority is invalid",
      );
    }

    {
      const chain = await buildChain("generation-gap");
      const unprovenRenewal = {
        ...chain.replacement1,
        generation: 2,
        renewed_at: "2099-07-30T11:30:00.000Z",
        expires_at: "2099-07-30T12:30:00.000Z",
      };
      const replacement3 = {
        ...chain.replacement2,
        generation: 3,
        acquired_at: "2099-07-30T12:31:00.000Z",
        renewed_at: "2099-07-30T12:31:00.000Z",
        expires_at: "2099-07-30T13:31:00.000Z",
      };
      const receipt3 = currentTakeoverReceipt(
        chain.seeded,
        unprovenRenewal,
        replacement3,
      );
      await rewriteCurrentTakeoverHistoryAndLinkage(
        chain.seeded,
        [
          { generation: 1, receipt: chain.receipt1 },
          { generation: 3, receipt: receipt3 },
        ],
        replacement3,
      );
      await expect(chain.seeded.store.verify()).rejects.toThrow(
        "campaign lease takeover history does not form a contiguous lease chain",
      );
    }

    {
      const chain = await buildChain("prior-replacement-mismatch");
      const mismatchedPrevious = {
        ...chain.replacement1,
        expires_at: "2099-07-30T12:03:00.000Z",
      };
      const replacement2 = {
        ...chain.replacement2,
        acquired_at: "2099-07-30T12:04:00.000Z",
        renewed_at: "2099-07-30T12:04:00.000Z",
      };
      await rewriteCurrentTakeoverHistoryAndLinkage(
        chain.seeded,
        [
          { generation: 1, receipt: chain.receipt1 },
          {
            generation: 2,
            receipt: currentTakeoverReceipt(
              chain.seeded,
              mismatchedPrevious,
              replacement2,
            ),
          },
        ],
        replacement2,
      );
      await expect(chain.seeded.store.verify()).rejects.toThrow(
        "campaign lease takeover history does not form a contiguous lease chain",
      );
    }

    {
      const chain = await buildChain("renewal-acquired-at-drift");
      const forgedRenewal = {
        ...chain.replacement1,
        generation: 2,
        acquired_at: "2099-07-30T11:02:00.000Z",
        renewed_at: "2099-07-30T11:30:00.000Z",
        expires_at: "2099-07-30T12:30:00.000Z",
      };
      const replacement3 = {
        ...chain.replacement2,
        generation: 3,
        acquired_at: "2099-07-30T12:31:00.000Z",
        renewed_at: "2099-07-30T12:31:00.000Z",
        expires_at: "2099-07-30T13:31:00.000Z",
      };
      await rewriteCurrentTakeoverHistoryAndLinkage(
        chain.seeded,
        [
          { generation: 1, receipt: chain.receipt1 },
          {
            generation: 3,
            receipt: currentTakeoverReceipt(
              chain.seeded,
              forgedRenewal,
              replacement3,
            ),
          },
        ],
        replacement3,
        [{
          status: "HEARTBEAT",
          at: forgedRenewal.renewed_at,
          lease_id: forgedRenewal.lease_id,
          lease_generation: forgedRenewal.generation,
          expires_at: forgedRenewal.expires_at,
        }],
      );
      await expect(chain.seeded.store.verify()).rejects.toThrow(
        "campaign heartbeat 1 clock authority is invalid",
      );
    }

    {
      const chain = await buildChain("proven-renewed-predecessor");
      const renewedPrevious = {
        ...chain.replacement1,
        generation: 2,
        renewed_at: "2099-07-30T11:30:00.000Z",
        expires_at: "2099-07-30T12:30:00.000Z",
      };
      const replacement3 = {
        ...chain.replacement2,
        generation: 3,
        acquired_at: "2099-07-30T12:31:00.000Z",
        renewed_at: "2099-07-30T12:31:00.000Z",
        expires_at: "2099-07-30T13:31:00.000Z",
      };
      await rewriteCurrentTakeoverHistoryAndLinkage(
        chain.seeded,
        [
          { generation: 1, receipt: chain.receipt1 },
          {
            generation: 3,
            receipt: currentTakeoverReceipt(
              chain.seeded,
              renewedPrevious,
              replacement3,
            ),
          },
        ],
        replacement3,
        [{
          status: "HEARTBEAT",
          at: renewedPrevious.renewed_at,
          lease_id: renewedPrevious.lease_id,
          lease_generation: renewedPrevious.generation,
          expires_at: renewedPrevious.expires_at,
        }],
      );
      await expect(chain.seeded.store.verify()).rejects.toThrow(
        "campaign heartbeat 1 clock authority is invalid",
      );
    }

    {
      const chain = await buildChain("valid-contiguous");
      const schema = JSON.parse(
        await readFile(
          rootPath("product-evals/campaigns/run-artifact.schema.json"),
          "utf8",
        ),
      );
      expect(schema.$defs.leaseTakeover.additionalProperties).toBe(false);
      expect([...schema.$defs.leaseTakeover.required].sort()).toEqual(
        Object.keys(chain.receipt1).sort(),
      );
      expect(Object.keys(schema.$defs.leaseTakeover.properties).sort()).toEqual(
        Object.keys(chain.receipt1).sort(),
      );
      await rewriteCurrentTakeoverHistoryAndLinkage(
        chain.seeded,
        [
          { generation: 1, receipt: chain.receipt1 },
          { generation: 2, receipt: chain.receipt2 },
        ],
        chain.replacement2,
      );
      await expect(chain.seeded.store.verify()).resolves.toMatchObject({
        status: "VALID",
      });
    }
  });

  test("rechecks refinement bindings at terminal finalization", async () => {
    const root = await temporaryRoot();
    const identity = identities();
    const store = await authorizedStore(root, "run-refinement-terminal", identity);
    await seedCompletedRun(store);
    await unlink(
      resolve(
        store.runRoot,
        `evaluations/${store.runId}-evaluation/input/run/execution/execution-receipt.json`,
      ),
    );
    await expect(
      store.finalize({
        status: "COMPLETED",
        finalized_by: identity.operator,
      }),
    ).rejects.toThrow("missing frozen evaluation evidence");

    const missingProposalStore = await authorizedStore(
      root,
      "run-refinement-terminal-set",
      identity,
    );
    await seedCompletedRun(missingProposalStore);
    await unlink(
      resolve(missingProposalStore.runRoot, "refinements/proposal-1.json"),
    );
    await expect(
      missingProposalStore.finalize({
        status: "COMPLETED",
        finalized_by: identity.operator,
      }),
    ).rejects.toThrow("do not match evaluation proposal bindings");
  });

  test("rejects expired operator leases and non-recovery unknown-outcome finalizers", async () => {
    const root = await temporaryRoot();
    const identity = identities();
    const input = reservationInput(identity);
    input.lease.acquired_at = "2020-01-01T00:00:00.000Z";
    input.lease.expires_at = "2020-01-01T00:01:00.000Z";
    const base = new CampaignArtifactStore(root, "run-expired");
    await base.reserve(input);
    const expired = base.withAuthority(identity.operator, input.lease.lease_id);
    await expect(
      expired.writeStageJson("execution/late.json", { status: "LATE" }),
    ).rejects.toThrow("lease is expired");
    const evaluator = base.withAuthority(identity.evaluator);
    await expect(
      evaluator.finalize({
        status: "UNKNOWN_OUTCOME",
        finalized_by: identity.evaluator,
        recovery_reason: "not authorized",
        recovery_action: "none",
        recovery_cleanup_status: "UNKNOWN",
      }),
    ).rejects.toThrow("recovery identity");
  });

  test("rejects incomplete completed runs and symlinks in the artifact tree", async () => {
    const root = await temporaryRoot();
    const incomplete = await authorizedStore(root, "run-incomplete");
    await expect(
      incomplete.finalize({
        status: "COMPLETED",
        finalized_by: identities().operator,
      }),
    ).rejects.toThrow("requires evaluation and aggregation receipts");

    const linked = await authorizedStore(root, "run-linked");
    await seedCompletedRun(linked);
    await symlink(
      resolve(linked.runRoot, "summary.json"),
      resolve(linked.runRoot, "execution", "summary-link.json"),
    );
    await expect(
      linked.finalize({
        status: "COMPLETED",
        finalized_by: identities().operator,
      }),
    ).rejects.toThrow("symbolic link");
  });

  test("linearizes stage writers with terminal finalization", async () => {
    const root = await temporaryRoot();
    for (let index = 0; index < 12; index += 1) {
      const identity = identities();
      const store = await authorizedStore(root, `run-linear-${index}`, identity);
      await seedCompletedRun(store);
      await Promise.allSettled([
        store.finalize({
          status: "COMPLETED",
          finalized_by: identity.operator,
        }),
        store.writeStageJson(`execution/race-${index}.json`, { status: "EARLY" }),
      ]);
      expect((await store.verify()).status).toBe("VALID");
      await expect(
        store.writeStageJson(`execution/post-${index}.json`, { status: "LATE" }),
      ).rejects.toThrow("already finalized");
    }
  });

  test("rejects placeholder terminal evidence and symlinked source ancestors", async () => {
    const root = await temporaryRoot();
    const identity = identities();
    const placeholders = await authorizedStore(root, "run-placeholders", identity);
    await placeholders.appendLifecycle({ status: "RUNNING" });
    await placeholders.appendLifecycle({ status: "COMPLETED" });
    await placeholders.writeStageJson("execution/source-manifest.json", {});
    await placeholders.writeStageJson("execution/execution-receipt.json", {});
    await placeholders.writeStageJson("evaluations/evaluation-1/receipt.json", {});
    await placeholders.writeStageJson("aggregations/aggregation-1.json", {});
    await placeholders.writeStageJson("summary.json", {});
    await expect(
      placeholders.finalize({
        status: "COMPLETED",
        finalized_by: identity.operator,
      }),
    ).rejects.toThrow("clock authority");

    const realDirectory = resolve(root, "real-source");
    const linkedDirectory = resolve(root, "linked-source");
    await mkdir(realDirectory);
    await writeFile(resolve(realDirectory, "evidence.txt"), "safe evidence");
    await symlink(realDirectory, linkedDirectory);
    const store = await authorizedStore(root, "run-source-ancestor");
    await expect(
      store.freezeFile({
        source_path: resolve(linkedDirectory, "evidence.txt"),
        namespace: "execution/evidence",
        producer: "simulation-operator",
        platform: "test-platform",
        redaction_profile: "no-secrets-v1",
      }),
    ).rejects.toThrow("symbolic-link ancestor");
  });

  test("blocks configured authority secrets in structured artifacts", async () => {
    const root = await temporaryRoot();
    const store = (
      await authorizedStore(root, "run-sensitive-json")
    ).withSensitiveValues(["standalone-confirmation-secret"]);
    await expect(
      store.writeStageJson("execution/result.json", {
        final_state: "standalone-confirmation-secret",
      }),
    ).rejects.toThrow("secret-like material");
  });

  test("blocks configured one-byte secrets in structured artifacts", async () => {
    const root = await temporaryRoot();
    const store = (await authorizedStore(root, "run-sensitive-byte"))
      .withSensitiveValues(["1"]);
    await expect(
      store.writeStageJson("execution/one-byte.json", { output: "echo=1" }),
    ).rejects.toThrow("secret-like material");
  });

  test("independent verification scans the complete immutable packet for supplied keys", async () => {
    const root = await temporaryRoot();
    const identity = identities();
    const store = await authorizedStore(root, "run-verification-key-leak", identity);
    const secret = "verification-only-confirmation-secret";
    await seedCompletedRun(store);
    await store.writeStageText("execution/provider-debug.log", secret);
    await store.finalize({
      status: "COMPLETED",
      finalized_by: identity.operator,
    });
    await expect(
      store.withConfirmationSecrets({ "verification-key": secret }).verify(),
    ).rejects.toThrow("exact confirmation key bytes");

    const sourceOnly = await authorizedStore(
      root,
      "run-verification-generic-source-text",
      identity,
    );
    await seedCompletedRun(sourceOnly);
    await sourceOnly.writeStageText(
      "execution/provider-debug.log",
      "const token = 'generic-source-placeholder-that-is-not-the-key';\n",
      { redaction_profile: "source-code-v1" },
    );
    await sourceOnly.finalize({
      status: "COMPLETED",
      finalized_by: identity.operator,
    });
    await expect(
      sourceOnly.withConfirmationSecrets({ "verification-key": secret }).verify(),
    ).resolves.toMatchObject({ status: "VALID" });
  });

  test("terminal verification requires exactly one harness specialized receipt and prohibits product artifacts", async () => {
    const root = await temporaryRoot();
    const missing = await authorizedStore(root, "run-specialized-missing");
    await seedCompletedRun(missing);
    await unlink(resolve(
      missing.runRoot,
      "specialized-evaluations/run-specialized-missing-specialized-evaluation/receipt.json",
    ));
    await expect(missing.finalize({
      status: "COMPLETED",
      finalized_by: identities().operator,
    })).rejects.toThrow("missing, duplicate, or prohibited specialized");

    const duplicate = await authorizedStore(root, "run-specialized-duplicate");
    await seedCompletedRun(duplicate);
    const receipt = JSON.parse(await readFile(resolve(
      duplicate.runRoot,
      "specialized-evaluations/run-specialized-duplicate-specialized-evaluation/receipt.json",
    ), "utf8"));
    await duplicate.writeStageJson(
      "specialized-evaluations/duplicate/receipt.json",
      receipt,
    );
    await expect(duplicate.finalize({
      status: "COMPLETED",
      finalized_by: identities().operator,
    })).rejects.toThrow("missing, duplicate, or prohibited specialized");

    const productIdentity = identities();
    productIdentity.specialized_evaluator = null;
    const productBase = new CampaignArtifactStore(root, "run-product-specialized");
    await productBase.reserve(reservationInput(productIdentity, "product"));
    const product = productBase.withAuthority(productIdentity.operator, "lease-1");
    await seedCompletedRun(product);
    await product.writeStageJson(
      "specialized-evaluations/prohibited/receipt.json",
      receipt,
    );
    await expect(product.finalize({
      status: "COMPLETED",
      finalized_by: productIdentity.operator,
    })).rejects.toThrow("missing, duplicate, or prohibited specialized");
  });

  test("terminal validation rejects skeletal receipts and aggregation, summary, and release drift", async () => {
    const root = await temporaryRoot();
    const rewrite = async (store: CampaignArtifactStore, path: string, value: unknown) =>
      writeFile(resolve(store.runRoot, path), `${stableJson(value, true)}\n`, { mode: 0o600 });
    const skeletal = await authorizedStore(root, "run-skeletal-evaluation");
    await seedCompletedRun(skeletal);
    await rewrite(
      skeletal,
      `evaluations/${skeletal.runId}-evaluation/receipt.json`,
      {},
    );
    await expect(skeletal.finalize({
      status: "COMPLETED",
      finalized_by: identities().operator,
    })).rejects.toThrow("general evaluation receipt shape");

    const aggregationDrift = await authorizedStore(root, "run-aggregation-drift");
    await seedCompletedRun(aggregationDrift);
    const aggregationPath = `aggregations/${aggregationDrift.runId}-aggregation.json`;
    const staleAggregation = JSON.parse(await readFile(
      resolve(aggregationDrift.runRoot, aggregationPath),
      "utf8",
    ));
    staleAggregation.status = "FAIL";
    await rewrite(aggregationDrift, aggregationPath, staleAggregation);
    await expect(aggregationDrift.finalize({
      status: "COMPLETED",
      finalized_by: identities().operator,
    })).rejects.toThrow("aggregation receipt shape or reduction");

    const summaryDrift = await authorizedStore(root, "run-summary-drift");
    await seedCompletedRun(summaryDrift);
    const staleSummary = JSON.parse(await readFile(
      resolve(summaryDrift.runRoot, "summary.json"),
      "utf8",
    ));
    staleSummary.release_eligible = true;
    await rewrite(summaryDrift, "summary.json", staleSummary);
    await expect(summaryDrift.finalize({
      status: "COMPLETED",
      finalized_by: identities().operator,
    })).rejects.toThrow("summary is stale or inconsistent");

    const releaseIdentity = identities();
    const releaseBase = new CampaignArtifactStore(root, "run-release-drift");
    const releaseInput = reservationInput(releaseIdentity);
    releaseInput.claim_ids = ["claim-1", "release-claim"];
    await releaseBase.reserve(releaseInput);
    const release = releaseBase.withAuthority(releaseIdentity.operator, "lease-1");
    await seedCompletedRun(release);
    const evaluationPath = `evaluations/${release.runId}-evaluation/receipt.json`;
    const failedEvaluation = JSON.parse(await readFile(
      resolve(release.runRoot, evaluationPath),
      "utf8",
    ));
    failedEvaluation.claim_ledger[0].status = "UNSUPPORTED";
    failedEvaluation.claim_ledger[0].reason = "required claim failed";
    failedEvaluation.status = "FAIL";
    failedEvaluation.root_cause = "evidence";
    failedEvaluation.earliest_failure = "claim-1";
    await rewrite(release, evaluationPath, failedEvaluation);
    const releaseAggregationPath = `aggregations/${release.runId}-aggregation.json`;
    const failedAggregation = JSON.parse(await readFile(
      resolve(release.runRoot, releaseAggregationPath),
      "utf8",
    ));
    failedAggregation.evaluation_receipt_digest = valueDigest(failedEvaluation);
    failedAggregation.status = "FAIL";
    failedAggregation.release_eligible = true;
    await rewrite(release, releaseAggregationPath, failedAggregation);
    const failedSummary = JSON.parse(await readFile(
      resolve(release.runRoot, "summary.json"),
      "utf8",
    ));
    failedSummary.evaluation_status = "FAIL";
    failedSummary.campaign_status = "FAIL";
    failedSummary.release_eligible = true;
    failedSummary.evaluation_receipt_digest = valueDigest(failedEvaluation);
    failedSummary.aggregation_receipt_digest = valueDigest(failedAggregation);
    await rewrite(release, "summary.json", failedSummary);
    await expect(release.finalize({
      status: "COMPLETED",
      finalized_by: releaseIdentity.operator,
    })).rejects.toThrow("aggregation release decision");
  });

  test("strict terminal finalization binds authored classes and exact general provider artifacts", async () => {
    const root = await temporaryRoot();
    const create = async (
      runId: string,
      provider: "codex" | "fixture" = "codex",
      withCalibration: boolean | "nonfixture-backdated" = false,
      confirmationSecret: string | null = null,
      blockBeforeEvaluation = false,
      journalEventCount = 5,
    ) => {
      const identity = identities();
      identity.specialized_evaluator = null;
      const base = new CampaignArtifactStore(root, runId);
      const input = reservationInput(identity, "product");
      const leaseBase = Date.now();
      input.lease.acquired_at = new Date(leaseBase - 60_000).toISOString();
      input.lease.expires_at = new Date(leaseBase + 3_600_000).toISOString();
      input.claim_ids = ["claim-1", "release-claim"];
      input.campaign_digest = strictCampaignDigest(provider);
      await base.reserve(input);
      const terminalAt = new Date().toISOString();
      const store = base
        .withAuthority(identity.operator, "lease-1")
        .withClock(() => new Date(terminalAt))
        .withSensitiveValues(confirmationSecret ? [confirmationSecret] : [])
        .withConfirmationSecrets(
          confirmationSecret
            ? { "strict-confirmation-key": confirmationSecret }
            : {},
        );
      await seedStrictProductRun(
        store,
        provider,
        withCalibration,
        terminalAt,
        confirmationSecret,
        blockBeforeEvaluation,
        journalEventCount,
      );
      return { identity, store };
    };
    const rewrite = async (store: CampaignArtifactStore, path: string, value: unknown) =>
      writeFile(resolve(store.runRoot, path), `${stableJson(value, true)}\n`, { mode: 0o600 });
    const resealEvaluation = async (
      store: CampaignArtifactStore,
      evaluation: Record<string, any>,
      mutateAggregation?: (aggregation: Record<string, any>) => void,
    ) => {
      const evaluationPath = `evaluations/${store.runId}-evaluation/receipt.json`;
      await rewrite(store, evaluationPath, evaluation);
      const handoffPath = "execution/tasks/strict-task/handoff.json";
      const handoff = JSON.parse(await readFile(resolve(store.runRoot, handoffPath), "utf8"));
      handoff.receiving_receipt_digest = valueDigest(evaluation);
      const receivingReference = handoff.artifact_references.find(
        (reference: Record<string, unknown>) => reference.path === evaluationPath,
      );
      receivingReference.sha256 = valueDigest(evaluation);
      await rewrite(store, handoffPath, handoff);
      const aggregationPath = `aggregations/${store.runId}-aggregation.json`;
      const aggregation = JSON.parse(await readFile(resolve(store.runRoot, aggregationPath), "utf8"));
      aggregation.evaluation_receipt_digest = valueDigest(evaluation);
      mutateAggregation?.(aggregation);
      await rewrite(store, aggregationPath, aggregation);
      const summary = JSON.parse(await readFile(resolve(store.runRoot, "summary.json"), "utf8"));
      summary.evaluation_receipt_digest = valueDigest(evaluation);
      summary.aggregation_receipt_digest = valueDigest(aggregation);
      summary.release_eligible = aggregation.release_eligible;
      await rewrite(store, "summary.json", summary);
    };
    const convertToFixture = async (
      store: CampaignArtifactStore,
      preserveAuthoredProfile = false,
    ) => {
      const evaluationId = `${store.runId}-evaluation`;
      const requestPath = `evaluations/${evaluationId}/input/request.json`;
      const request = JSON.parse(await readFile(resolve(store.runRoot, requestPath), "utf8"));
      if (!preserveAuthoredProfile) {
        request.profile = {
          schema_version: 1,
          id: "strict-fixture-profile",
          provider: "fixture",
          timeout_ms: 30_000,
        };
        request.rubric = null;
      }
      const { evaluation_input_digest: _oldDigest, ...requestInput } = request;
      request.evaluation_input_digest = valueDigest(requestInput);
      await rewrite(store, requestPath, request);
      for (const path of [
        `evaluations/${evaluationId}/input/input-manifest.json`,
        `evaluations/${evaluationId}/stdout.jsonl`,
        `evaluations/${evaluationId}/provider-output.json`,
      ]) {
        await unlink(resolve(store.runRoot, path));
      }
      const evaluationPath = `evaluations/${evaluationId}/receipt.json`;
      const evaluation = JSON.parse(await readFile(resolve(store.runRoot, evaluationPath), "utf8"));
      Object.assign(evaluation, {
        provider: "fixture",
        profile_id: request.profile.id,
        profile_digest: valueDigest(request.profile),
        rubric_id: null,
        rubric_digest: null,
        model: null,
        reasoning_effort: null,
        evaluation_input_digest: request.evaluation_input_digest,
        input_manifest_digest: null,
        provider_trace_digest: null,
        provider_output_digest: null,
        usage: null,
        refinement_proposal_bindings: [],
        residual_uncertainty: [
          "fixture evaluation proves deterministic reducer mechanics only",
        ],
        next_route: "target-specific independent evaluation remains NOT_RUN",
      });
      await resealEvaluation(store, evaluation);
      const summary = JSON.parse(await readFile(resolve(store.runRoot, "summary.json"), "utf8"));
      summary.evaluation_provider = "fixture";
      summary.evaluation_profile_id = request.profile.id;
      summary.evaluation_model = null;
      await rewrite(store, "summary.json", summary);
      return evaluation;
    };
    const resealCodexRequest = async (
      store: CampaignArtifactStore,
      mutate: (request: Record<string, any>) => void,
    ) => {
      const evaluationId = `${store.runId}-evaluation`;
      const requestPath = `evaluations/${evaluationId}/input/request.json`;
      const request = JSON.parse(await readFile(resolve(store.runRoot, requestPath), "utf8"));
      mutate(request);
      const { evaluation_input_digest: _oldDigest, ...requestInput } = request;
      request.evaluation_input_digest = valueDigest(requestInput);
      await rewrite(store, requestPath, request);

      const manifestPath = `evaluations/${evaluationId}/input/input-manifest.json`;
      const manifest = JSON.parse(await readFile(resolve(store.runRoot, manifestPath), "utf8"));
      const requestFile = manifest.files.find((file: Record<string, any>) => file.path === "request.json");
      requestFile.sha256 = (await store.artifactFileRecord(requestPath)).sha256;
      manifest.evaluation_input_digest = request.evaluation_input_digest;
      manifest.manifest_digest = valueDigest(manifest.files);
      await rewrite(store, manifestPath, manifest);

      const outputPath = `evaluations/${evaluationId}/provider-output.json`;
      const output = JSON.parse(await readFile(resolve(store.runRoot, outputPath), "utf8"));
      output.evaluation_input_digest = request.evaluation_input_digest;
      output.input_manifest_digest = manifest.manifest_digest;
      output.mechanical_gate_status = request.mechanical_evaluation.status;
      output.claim_assessments = request.mechanical_evaluation.claim_ledger.map(
        ({ claim_id, status, reason, evidence }: Record<string, any>) => ({
          claim_id,
          status,
          reason,
          evidence,
        }),
      );
      await rewrite(store, outputPath, output);
      const trace = [
        stableJson({ type: "item.completed", item: { type: "agent_message", text: JSON.stringify(output) } }),
        stableJson({ type: "turn.completed", usage: {} }),
        "",
      ].join("\n");
      const tracePath = `evaluations/${evaluationId}/stdout.jsonl`;
      await writeFile(resolve(store.runRoot, tracePath), trace, { mode: 0o600 });

      const evaluationPath = `evaluations/${evaluationId}/receipt.json`;
      const evaluation = JSON.parse(await readFile(resolve(store.runRoot, evaluationPath), "utf8"));
      Object.assign(evaluation, {
        provider: request.profile.provider,
        profile_id: request.profile.id,
        profile_digest: valueDigest(request.profile),
        rubric_id: request.rubric?.id ?? null,
        rubric_digest: request.rubric ? valueDigest(request.rubric) : null,
        model: request.profile.model ?? null,
        reasoning_effort: request.profile.reasoning_effort ?? null,
        evaluation_input_digest: request.evaluation_input_digest,
        input_manifest_digest: manifest.manifest_digest,
        provider_trace_digest: sha256Text(trace),
        provider_output_digest: valueDigest(output),
        claim_ledger: request.mechanical_evaluation.claim_ledger,
      });
      await resealEvaluation(store, evaluation);
      const summary = JSON.parse(await readFile(resolve(store.runRoot, "summary.json"), "utf8"));
      summary.evaluation_provider = evaluation.provider;
      summary.evaluation_profile_id = evaluation.profile_id;
      summary.evaluation_model = evaluation.model;
      await rewrite(store, "summary.json", summary);
    };
    const resealExecutionChain = async (store: CampaignArtifactStore) => {
      const evaluationId = `${store.runId}-evaluation`;
      const source = JSON.parse(await readFile(
        resolve(store.runRoot, "execution/source-manifest.json"),
        "utf8",
      ));
      const executionPath = "execution/execution-receipt.json";
      const execution = JSON.parse(await readFile(resolve(store.runRoot, executionPath), "utf8"));
      const offerPath = "execution/tasks/strict-task/handoff-offer.json";
      const offer = JSON.parse(await readFile(resolve(store.runRoot, offerPath), "utf8"));
      offer.source_manifest_digest = valueDigest(source);
      offer.artifact_references.find(
        (reference: Record<string, unknown>) =>
          reference.path === "execution/source-manifest.json",
      ).sha256 = valueDigest(source);
      await rewrite(store, offerPath, offer);
      execution.task_results[0].handoff_receipt_digest = valueDigest(offer);
      execution.source_manifest_digest = valueDigest(source);
      await rewrite(store, executionPath, execution);
      const requestPath = `evaluations/${evaluationId}/input/request.json`;
      const evidencePath = `evaluations/${evaluationId}/input/run/${executionPath}`;
      await rewrite(store, evidencePath, execution);
      const request = JSON.parse(await readFile(resolve(store.runRoot, requestPath), "utf8"));
      request.source_manifest_digest = valueDigest(source);
      request.execution_receipt_digest = valueDigest(execution);
      const { evaluation_input_digest: _oldDigest, ...requestInput } = request;
      request.evaluation_input_digest = valueDigest(requestInput);
      await rewrite(store, requestPath, request);
      const manifestPath = `evaluations/${evaluationId}/input/input-manifest.json`;
      const manifest = JSON.parse(await readFile(resolve(store.runRoot, manifestPath), "utf8"));
      for (const file of manifest.files as Array<Record<string, any>>) {
        if (file.path === "request.json") {
          file.sha256 = (await store.artifactFileRecord(requestPath)).sha256;
        } else if (file.path === "run/execution/execution-receipt.json") {
          file.sha256 = (await store.artifactFileRecord(evidencePath)).sha256;
        }
      }
      manifest.evaluation_input_digest = request.evaluation_input_digest;
      manifest.manifest_digest = valueDigest(manifest.files);
      await rewrite(store, manifestPath, manifest);
      const outputPath = `evaluations/${evaluationId}/provider-output.json`;
      const output = JSON.parse(await readFile(resolve(store.runRoot, outputPath), "utf8"));
      output.source_manifest_digest = valueDigest(source);
      output.execution_receipt_digest = valueDigest(execution);
      output.evaluation_input_digest = request.evaluation_input_digest;
      output.input_manifest_digest = manifest.manifest_digest;
      await rewrite(store, outputPath, output);
      const trace = [
        stableJson({ type: "item.completed", item: { type: "agent_message", text: JSON.stringify(output) } }),
        stableJson({ type: "turn.completed", usage: {} }),
        "",
      ].join("\n");
      const tracePath = `evaluations/${evaluationId}/stdout.jsonl`;
      await writeFile(resolve(store.runRoot, tracePath), trace, { mode: 0o600 });
      const evaluationPath = `evaluations/${evaluationId}/receipt.json`;
      const evaluation = JSON.parse(await readFile(resolve(store.runRoot, evaluationPath), "utf8"));
      Object.assign(evaluation, {
        source_manifest_digest: valueDigest(source),
        execution_receipt_digest: valueDigest(execution),
        evaluation_input_digest: request.evaluation_input_digest,
        input_manifest_digest: manifest.manifest_digest,
        provider_trace_digest: sha256Text(trace),
        provider_output_digest: valueDigest(output),
      });
      await rewrite(store, evaluationPath, evaluation);
      const handoffPath = "execution/tasks/strict-task/handoff.json";
      const handoff = JSON.parse(await readFile(resolve(store.runRoot, handoffPath), "utf8"));
      handoff.source_manifest_digest = valueDigest(source);
      handoff.offer_receipt_digest = valueDigest(offer);
      handoff.receiving_receipt_digest = valueDigest(evaluation);
      for (const reference of handoff.artifact_references as Array<Record<string, any>>) {
        if (reference.path === "execution/source-manifest.json") {
          reference.sha256 = valueDigest(source);
        } else if (reference.path === evaluationPath) {
          reference.sha256 = valueDigest(evaluation);
        }
      }
      await rewrite(store, handoffPath, handoff);
      const aggregationPath = `aggregations/${store.runId}-aggregation.json`;
      const aggregation = JSON.parse(await readFile(resolve(store.runRoot, aggregationPath), "utf8"));
      aggregation.execution_receipt_digest = valueDigest(execution);
      aggregation.evaluation_receipt_digest = valueDigest(evaluation);
      await rewrite(store, aggregationPath, aggregation);
      const summary = JSON.parse(await readFile(resolve(store.runRoot, "summary.json"), "utf8"));
      summary.execution_receipt_digest = valueDigest(execution);
      summary.evaluation_receipt_digest = valueDigest(evaluation);
      summary.aggregation_receipt_digest = valueDigest(aggregation);
      await rewrite(store, "summary.json", summary);
    };

    const valid = await create("strict-terminal-valid");
    const acceptedHandoffPath = "execution/tasks/strict-task/handoff.json";
    const acceptedHandoff = await valid.store.readArtifactJson<RuntimeHandoffReceipt>(
      acceptedHandoffPath,
    );
    await expect(
      valid.store.writeStageJson(acceptedHandoffPath, acceptedHandoff),
    ).rejects.toThrow("accepted runtime handoffs require receiver-authorized persistence");
    await expect(
      valid.store.writeRuntimeHandoffAcceptance(
        acceptedHandoffPath,
        acceptedHandoff,
      ),
    ).rejects.toThrow("requires the reserved receiver authority");
    await expect(valid.store.finalize({
      status: "COMPLETED",
      finalized_by: valid.identity.operator,
    })).resolves.toMatchObject({ status: "COMPLETED" });
    await expect(valid.store.verify()).resolves.toMatchObject({
      status: "VALID",
      freshness_status: "FRESH",
      freshness_reason: null,
    });
    const validSummary = JSON.parse(await readFile(
      resolve(valid.store.runRoot, "summary.json"),
      "utf8",
    ));
    const terminalMillis = Date.parse(validSummary.completed_at);
    await expect(
      valid.store
        .withClock(() => new Date(terminalMillis + 24 * 60 * 60 * 1_000))
        .verify(),
    ).resolves.toMatchObject({ freshness_status: "FRESH" });
    await expect(
      valid.store
        .withClock(() => new Date(terminalMillis + 24 * 60 * 60 * 1_000 + 1))
        .verify(),
    ).resolves.toMatchObject({
      status: "VALID",
      freshness_status: "STALE",
    });
    await expect(
      valid.store
        .withClock(() => new Date(terminalMillis + 24 * 60 * 60 * 1_000 + 1))
        .assertOperationalLifecycleFreshness(),
    ).rejects.toThrow("operational lifecycle is stale");

    const journalSegmentPath = (store: CampaignArtifactStore, segment = 0) =>
      resolve(
        store.runRoot,
        `execution/session/journal/${String(segment).padStart(8, "0")}.jsonl`,
      );
    const readJournalSegment = async (
      store: CampaignArtifactStore,
      segment = 0,
    ): Promise<SimulationSessionEvent[]> =>
      (await readFile(journalSegmentPath(store, segment), "utf8"))
        .split(/\r?\n/)
        .filter(Boolean)
        .map((line) => JSON.parse(line) as SimulationSessionEvent);
    const writeJournalSegment = async (
      store: CampaignArtifactStore,
      events: SimulationSessionEvent[],
      segment = 0,
    ): Promise<void> => {
      await writeFile(
        journalSegmentPath(store, segment),
        `${events.map((event) => stableJson(event)).join("\n")}\n`,
        { mode: 0o600 },
      );
    };
    const mutateJournalEvent = async (
      store: CampaignArtifactStore,
      index: number,
      mutate: (event: SimulationSessionEvent) => void,
    ): Promise<void> => {
      const events = await readJournalSegment(store);
      mutate(events[index]!);
      events[index]!.event_digest = simulationEventDigest(events[index]!);
      await writeJournalSegment(store, events);
    };
    const resealSessionEvidence = async (
      store: CampaignArtifactStore,
      mutate: (input: {
        checkpoints: Array<SimulationSessionCheckpoint<any>>;
        events: SimulationSessionEvent[];
        execution: Record<string, any>;
      }) => void,
    ): Promise<void> => {
      const checkpointPaths = [0, 1, 2].map((revision) =>
        resolve(
          store.runRoot,
          `execution/session/checkpoints/00000000/${String(revision).padStart(8, "0")}.json`,
        )
      );
      const checkpoints = await Promise.all(checkpointPaths.map(async (path) =>
        JSON.parse(await readFile(path, "utf8")) as SimulationSessionCheckpoint<any>
      ));
      const events = await readJournalSegment(store);
      const executionPath = resolve(
        store.runRoot,
        "execution/execution-receipt.json",
      );
      const execution = JSON.parse(
        await readFile(executionPath, "utf8"),
      ) as Record<string, any>;
      mutate({ checkpoints, events, execution });
      const reseal = (): void => {
        let previous: string | null = null;
        for (const [sequence, event] of events.entries()) {
          event.sequence = sequence;
          event.previous_event_digest = previous;
          event.event_digest = simulationEventDigest({
            ...event,
            event_digest: "",
          });
          previous = event.event_digest;
        }
      };
      checkpoints[0]!.checkpoint_digest = simulationCheckpointDigest(
        checkpoints[0]!,
      );
      for (const event of events) {
        if (
          event.event_type === "SESSION_STARTED" ||
          event.event_type === "SESSION_RESUMED"
        ) {
          event.checkpoint_digest = checkpoints[0]!.checkpoint_digest;
        }
      }
      reseal();
      const stepStarted = events.find(
        (event) => event.event_type === "STEP_STARTED",
      )!;
      checkpoints[1]!.last_event_digest = stepStarted.event_digest;
      checkpoints[1]!.checkpoint_digest = simulationCheckpointDigest(
        checkpoints[1]!,
      );
      const stepCompleted = events.find(
        (event) => event.event_type === "STEP_COMPLETED",
      )!;
      stepCompleted.checkpoint_digest = checkpoints[1]!.checkpoint_digest;
      reseal();
      checkpoints[2]!.last_event_digest = stepCompleted.event_digest;
      checkpoints[2]!.checkpoint_digest = simulationCheckpointDigest(
        checkpoints[2]!,
      );
      const terminal = events.at(-1)!;
      terminal.checkpoint_digest = checkpoints[2]!.checkpoint_digest;
      reseal();
      execution.session.checkpoint_digest = checkpoints[2]!.checkpoint_digest;
      execution.session.surfaces = checkpoints[2]!.surfaces;
      for (const [index, path] of checkpointPaths.entries()) {
        await writeFile(
          path,
          `${stableJson(checkpoints[index], true)}\n`,
          { mode: 0o600 },
        );
      }
      await writeJournalSegment(store, events);
      await writeFile(
        executionPath,
        `${stableJson(execution, true)}\n`,
        { mode: 0o600 },
      );
      await resealExecutionChain(store);
    };

    const segmentedJournal = await create(
      "strict-terminal-segmented-journal",
      "codex",
      false,
      null,
      false,
      1_001,
    );
    await expect(segmentedJournal.store.finalize({
      status: "COMPLETED",
      finalized_by: segmentedJournal.identity.operator,
    })).resolves.toMatchObject({ status: "COMPLETED" });

    const replayedJournal = await create("strict-terminal-journal-replay");
    const replayedEvents = await readJournalSegment(replayedJournal.store);
    replayedEvents.push(structuredClone(replayedEvents.at(-1)!));
    await writeJournalSegment(replayedJournal.store, replayedEvents);
    await expect(replayedJournal.store.finalize({
      status: "COMPLETED",
      finalized_by: replayedJournal.identity.operator,
    })).rejects.toThrow("simulation journal lifecycle is invalid");

    const sequenceGap = await create("strict-terminal-journal-sequence-gap");
    await mutateJournalEvent(sequenceGap.store, 1, (event) => {
      event.sequence = 2;
    });
    await expect(sequenceGap.store.finalize({
      status: "COMPLETED",
      finalized_by: sequenceGap.identity.operator,
    })).rejects.toThrow("simulation journal is invalid at sequence 1");

    const wrongPrevious = await create("strict-terminal-journal-previous-digest");
    await mutateJournalEvent(wrongPrevious.store, 1, (event) => {
      event.previous_event_digest = "0".repeat(64);
    });
    await expect(wrongPrevious.store.finalize({
      status: "COMPLETED",
      finalized_by: wrongPrevious.identity.operator,
    })).rejects.toThrow("simulation journal is invalid at sequence 1");

    const foreignSession = await create("strict-terminal-journal-foreign-session");
    await mutateJournalEvent(foreignSession.store, 0, (event) => {
      event.session_id = "foreign-session";
    });
    await expect(foreignSession.store.finalize({
      status: "COMPLETED",
      finalized_by: foreignSession.identity.operator,
    })).rejects.toThrow("simulation journal is invalid at sequence 0");

    const foreignContract = await create("strict-terminal-journal-foreign-contract");
    await mutateJournalEvent(foreignContract.store, 0, (event) => {
      event.contract_digest = "0".repeat(64);
    });
    await expect(foreignContract.store.finalize({
      status: "COMPLETED",
      finalized_by: foreignContract.identity.operator,
    })).rejects.toThrow("simulation journal is invalid at sequence 0");

    const foreignSurface = await create("strict-terminal-journal-foreign-surface");
    await mutateJournalEvent(foreignSurface.store, 4, (event) => {
      event.surface_ids = ["task:foreign"];
    });
    await expect(foreignSurface.store.finalize({
      status: "COMPLETED",
      finalized_by: foreignSurface.identity.operator,
    })).rejects.toThrow("simulation journal is invalid at sequence 4");

    const coherentlyForeignSurface = await create(
      "strict-terminal-coherent-foreign-surface",
    );
    await resealSessionEvidence(
      coherentlyForeignSurface.store,
      ({ checkpoints, events, execution }) => {
        for (const checkpoint of checkpoints) {
          for (const surface of checkpoint.surfaces) {
            surface.surface_id = "task:coherent-foreign";
          }
        }
        for (const event of events) {
          event.surface_ids = event.surface_ids.map(
            () => "task:coherent-foreign",
          );
          for (const binding of event.step_bindings ?? []) {
            binding.surface_id = "task:coherent-foreign";
          }
        }
        execution.session.surfaces = checkpoints.at(-1)!.surfaces;
      },
    );
    await expect(coherentlyForeignSurface.store.finalize({
      status: "COMPLETED",
      finalized_by: coherentlyForeignSurface.identity.operator,
    })).rejects.toThrow("simulation journal is invalid at sequence 0");

    const checkpointTailMismatch = await create(
      "strict-terminal-journal-checkpoint-tail",
    );
    await mutateJournalEvent(checkpointTailMismatch.store, 4, (event) => {
      event.checkpoint_digest = "0".repeat(64);
    });
    await expect(checkpointTailMismatch.store.finalize({
      status: "COMPLETED",
      finalized_by: checkpointTailMismatch.identity.operator,
    })).rejects.toThrow("exact journal boundary");

    for (const [suffix, mutate] of [
      ["reason", (event: SimulationSessionEvent) => {
        event.reason = "coherently resealed foreign terminal reason";
      }],
      ["episode", (event: SimulationSessionEvent) => {
        event.episode += 1;
      }],
      ["timestamp", (event: SimulationSessionEvent) => {
        event.at = new Date(Date.parse(event.at) + 1).toISOString();
      }],
      ["steps", (event: SimulationSessionEvent) => {
        event.step_ids = [];
        event.surface_ids = [];
      }],
    ] as const) {
      const terminalMismatch = await create(
        `strict-terminal-journal-${suffix}-mismatch`,
      );
      await mutateJournalEvent(terminalMismatch.store, 4, mutate);
      await expect(terminalMismatch.store.finalize({
        status: "COMPLETED",
        finalized_by: terminalMismatch.identity.operator,
      })).rejects.toThrow();
    }

    const emptyCheckpointSegment = await create(
      "strict-terminal-empty-checkpoint-segment",
    );
    await mkdir(
      resolve(
        emptyCheckpointSegment.store.runRoot,
        "execution/session/checkpoints/00000001",
      ),
      { mode: 0o700 },
    );
    await expect(emptyCheckpointSegment.store.finalize({
      status: "COMPLETED",
      finalized_by: emptyCheckpointSegment.identity.operator,
    })).rejects.toThrow("checkpoint segment 00000001 is empty");

    const gappedCheckpoints = await create(
      "strict-terminal-gapped-checkpoints",
    );
    await unlink(resolve(
      gappedCheckpoints.store.runRoot,
      "execution/session/checkpoints/00000000/00000001.json",
    ));
    await expect(gappedCheckpoints.store.finalize({
      status: "COMPLETED",
      finalized_by: gappedCheckpoints.identity.operator,
    })).rejects.toThrow("checkpoint revision files are duplicate or gapped");

    const misplacedCheckpoint = await create(
      "strict-terminal-misplaced-checkpoint",
    );
    const misplacedCheckpointDirectory = resolve(
      misplacedCheckpoint.store.runRoot,
      "execution/session/checkpoints/00000001",
    );
    await mkdir(misplacedCheckpointDirectory, { mode: 0o700 });
    await rename(
      resolve(
        misplacedCheckpoint.store.runRoot,
        "execution/session/checkpoints/00000000/00000002.json",
      ),
      resolve(misplacedCheckpointDirectory, "00000002.json"),
    );
    await expect(misplacedCheckpoint.store.finalize({
      status: "COMPLETED",
      finalized_by: misplacedCheckpoint.identity.operator,
    })).rejects.toThrow("checkpoint 00000002.json is misplaced");

    const embeddedRevision = await create(
      "strict-terminal-embedded-checkpoint-revision",
    );
    const embeddedRevisionPath = resolve(
      embeddedRevision.store.runRoot,
      "execution/session/checkpoints/00000000/00000001.json",
    );
    const embeddedCheckpoint = JSON.parse(
      await readFile(embeddedRevisionPath, "utf8"),
    ) as SimulationSessionCheckpoint<unknown>;
    embeddedCheckpoint.revision = 2;
    embeddedCheckpoint.checkpoint_id =
      `${embeddedRevision.store.runId}:checkpoint:00000002`;
    embeddedCheckpoint.checkpoint_digest = simulationCheckpointDigest(
      embeddedCheckpoint,
    );
    await writeFile(
      embeddedRevisionPath,
      `${stableJson(embeddedCheckpoint, true)}\n`,
      { mode: 0o600 },
    );
    await expect(embeddedRevision.store.finalize({
      status: "COMPLETED",
      finalized_by: embeddedRevision.identity.operator,
    })).rejects.toThrow("checkpoint file identity does not match revision 1");

    const misplacedSegment = await create(
      "strict-terminal-journal-misplaced-segment",
      "codex",
      false,
      null,
      false,
      1_001,
    );
    const misplacedTail = await readJournalSegment(misplacedSegment.store, 1);
    const misplacedHead = await readJournalSegment(misplacedSegment.store, 0);
    await writeJournalSegment(
      misplacedSegment.store,
      [...misplacedHead, ...misplacedTail],
      0,
    );
    await unlink(journalSegmentPath(misplacedSegment.store, 1));
    await expect(misplacedSegment.store.finalize({
      status: "COMPLETED",
      finalized_by: misplacedSegment.identity.operator,
    })).rejects.toThrow("contains misplaced or no events");

    const confirmationSecret = "strict-finalized-confirmation-secret";
    const confirmed = await create(
      "strict-terminal-confirmed",
      "codex",
      false,
      confirmationSecret,
    );
    await confirmed.store.finalize({
      status: "COMPLETED",
      finalized_by: confirmed.identity.operator,
    });
    await expect(
      new CampaignArtifactStore(root, confirmed.store.runId).verify(),
    ).rejects.toThrow();
    await expect(
      new CampaignArtifactStore(root, confirmed.store.runId)
        .withConfirmationSecrets({
          "strict-confirmation-key": "wrong-confirmation-secret-32-bytes!",
        })
        .verify(),
    ).rejects.toThrow();
    await expect(
      new CampaignArtifactStore(root, confirmed.store.runId)
        .withConfirmationSecrets({ "strict-confirmation-key": confirmationSecret })
        .withSensitiveValues([confirmationSecret])
        .verify(),
    ).resolves.toMatchObject({ status: "VALID" });
    const { verifyCampaignRun } = await import("./campaigns");
    await expect(verifyCampaignRun(confirmed.store.runId, {
      artifact_root: root,
      confirmation_key_env: {
        "strict-confirmation-key": "STRICT_CONFIRMATION_SECRET",
      },
      environment: {},
    })).rejects.toThrow("environment variable is missing");
    await expect(verifyCampaignRun(confirmed.store.runId, {
      artifact_root: root,
      confirmation_key_env: {
        "strict-confirmation-key": "STRICT_CONFIRMATION_SECRET",
      },
      environment: {
        STRICT_CONFIRMATION_SECRET: "wrong-confirmation-secret-32-bytes!",
      },
    })).rejects.toThrow();
    await expect(verifyCampaignRun(confirmed.store.runId, {
      artifact_root: root,
      confirmation_key_env: {
        "strict-confirmation-key": "STRICT_CONFIRMATION_SECRET",
      },
      environment: { STRICT_CONFIRMATION_SECRET: confirmationSecret },
    })).resolves.toMatchObject({ status: "VALID" });

    const blocked = await create(
      "strict-terminal-evaluator-blocked",
      "codex",
      false,
      null,
      true,
    );
    await expect(blocked.store.finalize({
      status: "BLOCKED",
      finalized_by: blocked.identity.operator,
    })).resolves.toMatchObject({ status: "BLOCKED" });

    const blockedProcess = await create("strict-terminal-blocked-process");
    await convertToBlockedAttempt(blockedProcess.store, {
      exitCode: 7,
      timedOut: false,
      stdout: "",
      stderr: "evaluator unavailable\n",
      reason: "Codex evaluator exited 7: evaluator unavailable",
    });
    await expect(blockedProcess.store.finalize({
      status: "BLOCKED",
      finalized_by: blockedProcess.identity.operator,
    })).resolves.toMatchObject({ status: "BLOCKED" });

    const blockedExtra = await create("strict-terminal-blocked-extra-file");
    await convertToBlockedAttempt(blockedExtra.store, {
      exitCode: 7,
      timedOut: false,
      stdout: "",
      stderr: "evaluator unavailable\n",
      reason: "Codex evaluator exited 7: evaluator unavailable",
    });
    await blockedExtra.store.writeStageText(
      `evaluations/${blockedExtra.store.runId}-evaluation/untrusted.txt`,
      "untrusted",
    );
    await expect(blockedExtra.store.finalize({
      status: "BLOCKED",
      finalized_by: blockedExtra.identity.operator,
    })).rejects.toThrow("file set or input manifest is not exact");

    const blockedValidation = await create(
      "strict-terminal-blocked-validation",
    );
    const blockedValidationOutputPath =
      `evaluations/${blockedValidation.store.runId}-evaluation/provider-output.json`;
    const invalidProviderOutput = JSON.parse(await readFile(
      resolve(blockedValidation.store.runRoot, blockedValidationOutputPath),
      "utf8",
    ));
    invalidProviderOutput.source_manifest_digest = "f".repeat(64);
    const invalidTrace = [
      stableJson({
        type: "item.completed",
        item: { type: "agent_message", text: JSON.stringify(invalidProviderOutput) },
      }),
      stableJson({ type: "turn.completed", usage: {} }),
      "",
    ].join("\n");
    await convertToBlockedAttempt(blockedValidation.store, {
      exitCode: 0,
      timedOut: false,
      stdout: invalidTrace,
      stderr: "",
      reason: "Codex evaluation output source_manifest_digest is stale or mismatched",
      providerOutput: invalidProviderOutput,
    });
    await expect(blockedValidation.store.finalize({
      status: "BLOCKED",
      finalized_by: blockedValidation.identity.operator,
    })).resolves.toMatchObject({ status: "BLOCKED" });

    const blockedDrift = await create(
      "strict-terminal-evaluator-blocked-drift",
      "codex",
      false,
      null,
      true,
    );
    const blockedSummary = JSON.parse(await readFile(
      resolve(blockedDrift.store.runRoot, "summary.json"),
      "utf8",
    ));
    blockedSummary.evaluation_provider = "fixture";
    blockedSummary.mechanical_status = "FAIL";
    await rewrite(blockedDrift.store, "summary.json", blockedSummary);
    await expect(blockedDrift.store.finalize({
      status: "BLOCKED",
      finalized_by: blockedDrift.identity.operator,
    })).rejects.toThrow("matching terminal evidence");

    const backdatedClock = await create("strict-terminal-backdated-clock");
    const lifecyclePath = resolve(backdatedClock.store.runRoot, "lifecycle.jsonl");
    const lifecycle = (await readFile(lifecyclePath, "utf8"))
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    const evaluatingEvent = lifecycle.find((event) => event.status === "EVALUATING");
    const clockReceiptPath = resolve(
      backdatedClock.store.runRoot,
      evaluatingEvent.clock_authority.receipt_path,
    );
    const clockReceipt = JSON.parse(await readFile(clockReceiptPath, "utf8"));
    const coherentBackdate = new Date(Date.parse(evaluatingEvent.at) - 60_000).toISOString();
    clockReceipt.observed_at = coherentBackdate;
    evaluatingEvent.at = coherentBackdate;
    evaluatingEvent.clock_authority.observed_at = coherentBackdate;
    evaluatingEvent.clock_authority.receipt_digest = valueDigest(clockReceipt);
    await writeFile(clockReceiptPath, `${stableJson(clockReceipt, true)}\n`, { mode: 0o600 });
    await writeFile(
      lifecyclePath,
      `${lifecycle.map((event) => stableJson(event)).join("\n")}\n`,
      { mode: 0o600 },
    );
    await expect(backdatedClock.store.finalize({
      status: "COMPLETED",
      finalized_by: backdatedClock.identity.operator,
    })).rejects.toThrow("clock receipt authority is stale or invalid");

    const forgedLeaseClock = await create("strict-terminal-forged-clock-lease");
    const forgedLifecyclePath = resolve(forgedLeaseClock.store.runRoot, "lifecycle.jsonl");
    const forgedLifecycle = (await readFile(forgedLifecyclePath, "utf8"))
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    const forgedEvaluating = forgedLifecycle.find(
      (event) => event.status === "EVALUATING",
    );
    const oldRelativeReceipt = forgedEvaluating.clock_authority.receipt_path;
    const forgedReceipt = JSON.parse(await readFile(
      resolve(forgedLeaseClock.store.runRoot, oldRelativeReceipt),
      "utf8",
    ));
    forgedReceipt.lease_id = "forged-fresh-lease";
    const forgedDigest = valueDigest(forgedReceipt);
    const newRelativeReceipt = oldRelativeReceipt.replace(
      /[a-f0-9]{64}\.json$/,
      `${forgedDigest}.json`,
    );
    forgedEvaluating.clock_authority.lease_id = forgedReceipt.lease_id;
    forgedEvaluating.clock_authority.receipt_digest = forgedDigest;
    forgedEvaluating.clock_authority.receipt_path = newRelativeReceipt;
    await rename(
      resolve(forgedLeaseClock.store.runRoot, oldRelativeReceipt),
      resolve(forgedLeaseClock.store.runRoot, newRelativeReceipt),
    );
    await writeFile(
      resolve(forgedLeaseClock.store.runRoot, newRelativeReceipt),
      `${stableJson(forgedReceipt, true)}\n`,
      { mode: 0o600 },
    );
    await writeFile(
      forgedLifecyclePath,
      `${forgedLifecycle.map((event) => stableJson(event)).join("\n")}\n`,
      { mode: 0o600 },
    );
    await expect(forgedLeaseClock.store.finalize({
      status: "COMPLETED",
      finalized_by: forgedLeaseClock.identity.operator,
    })).rejects.toThrow("clock authority is stale or invalid");

    const missingEvaluationClock = await create(
      "strict-terminal-missing-evaluation-clock",
    );
    const missingEvaluationLifecyclePath = resolve(
      missingEvaluationClock.store.runRoot,
      "lifecycle.jsonl",
    );
    const missingEvaluationLifecycle = (await readFile(
      missingEvaluationLifecyclePath,
      "utf8",
    )).trim().split("\n").map((line) => JSON.parse(line));
    const missingEvaluationEvent = missingEvaluationLifecycle.find(
      (event) => event.status === "EVALUATING",
    );
    delete missingEvaluationEvent.clock_authority;
    await writeFile(
      missingEvaluationLifecyclePath,
      `${missingEvaluationLifecycle.map((event) => stableJson(event)).join("\n")}\n`,
      { mode: 0o600 },
    );
    await expect(missingEvaluationClock.store.finalize({
      status: "COMPLETED",
      finalized_by: missingEvaluationClock.identity.operator,
    })).rejects.toThrow("lacks required clock authority");

    const missingBlockedClock = await create(
      "strict-terminal-missing-blocked-clock",
      "codex",
      false,
      null,
      true,
    );
    const missingBlockedLifecyclePath = resolve(
      missingBlockedClock.store.runRoot,
      "lifecycle.jsonl",
    );
    const missingBlockedLifecycle = (await readFile(
      missingBlockedLifecyclePath,
      "utf8",
    )).trim().split("\n").map((line) => JSON.parse(line));
    delete missingBlockedLifecycle.find(
      (event) => event.status === "BLOCKED",
    ).clock_authority;
    await writeFile(
      missingBlockedLifecyclePath,
      `${missingBlockedLifecycle.map((event) => stableJson(event)).join("\n")}\n`,
      { mode: 0o600 },
    );
    await expect(missingBlockedClock.store.finalize({
      status: "BLOCKED",
      finalized_by: missingBlockedClock.identity.operator,
    })).rejects.toThrow("lacks required clock authority");

    const unauthenticatedHeartbeat = await create(
      "strict-terminal-unauthenticated-heartbeat",
    );
    await unauthenticatedHeartbeat.store.appendLifecycle({
      status: "HEARTBEAT",
      at: new Date().toISOString(),
      lease_id: "lease-1",
      lease_generation: 1,
      expires_at: new Date(Date.now() + 60_000).toISOString(),
    });
    await expect(unauthenticatedHeartbeat.store.finalize({
      status: "COMPLETED",
      finalized_by: unauthenticatedHeartbeat.identity.operator,
    })).rejects.toThrow("clock authority");

    const excessiveOracleObservation = await create(
      "strict-terminal-excessive-file-oracle-observation",
    );
    await excessiveOracleObservation.store.writeStageJson(
      "execution/tasks/strict-task/oracle-observations.json",
      [],
    );
    await expect(excessiveOracleObservation.store.finalize({
      status: "COMPLETED",
      finalized_by: excessiveOracleObservation.identity.operator,
    })).rejects.toThrow("file oracle observation authority is incomplete");
    expect((await valid.store.verify()).status).toBe("VALID");

    const validFixture = await create("strict-terminal-fixture-valid", "fixture");
    await convertToFixture(validFixture.store, true);
    await expect(validFixture.store.finalize({
      status: "COMPLETED",
      finalized_by: validFixture.identity.operator,
    })).resolves.toMatchObject({ status: "COMPLETED" });

    const providerDowngrade = await create("strict-terminal-provider-downgrade");
    await convertToFixture(providerDowngrade.store);
    await expect(providerDowngrade.store.finalize({
      status: "COMPLETED",
      finalized_by: providerDowngrade.identity.operator,
    })).rejects.toThrow("authored authority");

    const alteredMechanical = await create("strict-terminal-altered-mechanical");
    await resealCodexRequest(alteredMechanical.store, (request) => {
      request.mechanical_evaluation.claim_ledger[0].reason =
        "coherently resealed mechanical request";
    });
    await expect(alteredMechanical.store.finalize({
      status: "COMPLETED",
      finalized_by: alteredMechanical.identity.operator,
    })).rejects.toThrow("authored authority");

    const substitutedProfile = await create("strict-terminal-profile-rubric-substitution");
    await resealCodexRequest(substitutedProfile.store, (request) => {
      request.profile = {
        ...request.profile,
        id: "substituted-codex-profile",
        model: "substituted-model",
      };
      request.rubric = {
        ...request.rubric,
        id: "substituted-rubric",
      };
    });
    await expect(substitutedProfile.store.finalize({
      status: "COMPLETED",
      finalized_by: substitutedProfile.identity.operator,
    })).rejects.toThrow("authored authority");

    const forgedFixture = await create(
      "strict-terminal-fixture-forged",
      "fixture",
    );
    const forgedFixtureEvaluation = await convertToFixture(
      forgedFixture.store,
      true,
    );
    Object.assign(forgedFixtureEvaluation, {
      status: "FAIL",
      root_cause: "evaluator",
      earliest_failure: "forged fixture failure",
    });
    await resealEvaluation(forgedFixture.store, forgedFixtureEvaluation);
    await expect(forgedFixture.store.finalize({
      status: "COMPLETED",
      finalized_by: forgedFixture.identity.operator,
    })).rejects.toThrow("required claim ledger status PASS");

    const classSwap = await create("strict-terminal-class-swap");
    const classEvaluationPath = `evaluations/${classSwap.store.runId}-evaluation/receipt.json`;
    const classEvaluation = JSON.parse(await readFile(resolve(classSwap.store.runRoot, classEvaluationPath), "utf8"));
    classEvaluation.claim_ledger[0].class = "release-eligibility";
    await resealEvaluation(classSwap.store, classEvaluation, (aggregation) => {
      aggregation.release_claims = classEvaluation.claim_ledger.map((claim: any) => ({
        claim_id: claim.claim_id,
        status: claim.status,
      }));
      aggregation.release_eligible = true;
    });
    await expect(classSwap.store.finalize({
      status: "COMPLETED",
      finalized_by: classSwap.identity.operator,
    })).rejects.toThrow("invalid or stale");

    const staleLink = await create("strict-terminal-stale-link");
    const staleLinkPath = `evaluations/${staleLink.store.runId}-evaluation/receipt.json`;
    const staleLinkEvaluation = JSON.parse(await readFile(
      resolve(staleLink.store.runRoot, staleLinkPath),
      "utf8",
    ));
    staleLinkEvaluation.evaluation_input_digest = "e".repeat(64);
    await resealEvaluation(staleLink.store, staleLinkEvaluation);
    await expect(staleLink.store.finalize({
      status: "COMPLETED",
      finalized_by: staleLink.identity.operator,
    })).rejects.toThrow("authored authority");

    const providerDrift = await create("strict-terminal-provider-drift");
    const driftPath = `evaluations/${providerDrift.store.runId}-evaluation/receipt.json`;
    const driftEvaluation = JSON.parse(await readFile(resolve(providerDrift.store.runRoot, driftPath), "utf8"));
    driftEvaluation.provider_trace_digest = "f".repeat(64);
    await resealEvaluation(providerDrift.store, driftEvaluation);
    await expect(providerDrift.store.finalize({
      status: "COMPLETED",
      finalized_by: providerDrift.identity.operator,
    })).rejects.toThrow("provider trace digest");

    const prohibitedTrace = await create("strict-terminal-prohibited-evaluator-item");
    const prohibitedEvaluationPath =
      `evaluations/${prohibitedTrace.store.runId}-evaluation/receipt.json`;
    const prohibitedEvaluation = JSON.parse(await readFile(
      resolve(prohibitedTrace.store.runRoot, prohibitedEvaluationPath),
      "utf8",
    ));
    const prohibitedTracePath =
      `evaluations/${prohibitedTrace.store.runId}-evaluation/stdout.jsonl`;
    const originalTrace = await readFile(
      resolve(prohibitedTrace.store.runRoot, prohibitedTracePath),
      "utf8",
    );
    const forgedTrace = [
      stableJson({
        type: "item.completed",
        item: { type: "mcp_tool_call", server: "untrusted" },
      }),
      originalTrace,
    ].join("\n");
    await writeFile(
      resolve(prohibitedTrace.store.runRoot, prohibitedTracePath),
      forgedTrace,
      { mode: 0o600 },
    );
    prohibitedEvaluation.provider_trace_digest = sha256Text(forgedTrace);
    await resealEvaluation(prohibitedTrace.store, prohibitedEvaluation);
    await expect(prohibitedTrace.store.finalize({
      status: "COMPLETED",
      finalized_by: prohibitedTrace.identity.operator,
    })).rejects.toThrow("prohibited completed item type mcp_tool_call");

    const providerReject = await create("strict-terminal-provider-reject");
    const rejectEvaluationPath = `evaluations/${providerReject.store.runId}-evaluation/receipt.json`;
    const rejectEvaluation = JSON.parse(await readFile(
      resolve(providerReject.store.runRoot, rejectEvaluationPath),
      "utf8",
    ));
    const rejectOutputPath = `evaluations/${providerReject.store.runId}-evaluation/provider-output.json`;
    const rejectOutput = JSON.parse(await readFile(
      resolve(providerReject.store.runRoot, rejectOutputPath),
      "utf8",
    ));
    rejectOutput.status = "FAIL";
    rejectOutput.root_cause = "evaluator";
    rejectOutput.earliest_failure = rejectOutput.claim_assessments[0].claim_id;
    rejectOutput.claim_assessments[0].status = "UNSUPPORTED";
    rejectOutput.claim_assessments[0].reason = "provider rejected claim";
    await rewrite(providerReject.store, rejectOutputPath, rejectOutput);
    const rejectTrace = [
      stableJson({ type: "item.completed", item: { type: "agent_message", text: JSON.stringify(rejectOutput) } }),
      stableJson({ type: "turn.completed", usage: {} }),
      "",
    ].join("\n");
    const rejectTracePath = `evaluations/${providerReject.store.runId}-evaluation/stdout.jsonl`;
    await writeFile(resolve(providerReject.store.runRoot, rejectTracePath), rejectTrace, { mode: 0o600 });
    rejectEvaluation.provider_trace_digest = sha256Text(rejectTrace);
    rejectEvaluation.provider_output_digest = valueDigest(rejectOutput);
    await resealEvaluation(providerReject.store, rejectEvaluation);
    await expect(providerReject.store.finalize({
      status: "COMPLETED",
      finalized_by: providerReject.identity.operator,
    })).rejects.toThrow("authenticated provider judgment projection");

    const staleReceipt = await create("strict-terminal-stale-receipt");
    const staleReceiptPath = `evaluations/${staleReceipt.store.runId}-evaluation/receipt.json`;
    const staleReceiptEvaluation = JSON.parse(await readFile(
      resolve(staleReceipt.store.runRoot, staleReceiptPath),
      "utf8",
    ));
    staleReceiptEvaluation.claim_ledger[0].status = "UNSUPPORTED";
    staleReceiptEvaluation.claim_ledger[0].reason = "stale receipt rejection";
    staleReceiptEvaluation.status = "FAIL";
    staleReceiptEvaluation.root_cause = "evaluator";
    staleReceiptEvaluation.earliest_failure = staleReceiptEvaluation.claim_ledger[0].claim_id;
    await resealEvaluation(staleReceipt.store, staleReceiptEvaluation, (aggregation) => {
      aggregation.status = "FAIL";
      aggregation.release_eligible = false;
    });
    const staleSummary = JSON.parse(await readFile(resolve(staleReceipt.store.runRoot, "summary.json"), "utf8"));
    staleSummary.evaluation_status = "FAIL";
    staleSummary.campaign_status = "FAIL";
    staleSummary.release_eligible = false;
    await rewrite(staleReceipt.store, "summary.json", staleSummary);
    await expect(staleReceipt.store.finalize({
      status: "COMPLETED",
      finalized_by: staleReceipt.identity.operator,
    })).rejects.toThrow("authenticated provider judgment projection");

    const substituted = await create("strict-terminal-provider-output");
    const substitutedOutputPath = `evaluations/${substituted.store.runId}-evaluation/provider-output.json`;
    const replacement = {
      schema_version: 3,
      arbitrary: "coherently resealed but not the traced provider output",
    };
    await rewrite(substituted.store, substitutedOutputPath, replacement);
    const substitutedEvaluationPath = `evaluations/${substituted.store.runId}-evaluation/receipt.json`;
    const substitutedEvaluation = JSON.parse(await readFile(
      resolve(substituted.store.runRoot, substitutedEvaluationPath),
      "utf8",
    ));
    substitutedEvaluation.provider_output_digest = valueDigest(replacement);
    await resealEvaluation(substituted.store, substitutedEvaluation);
    await expect(substituted.store.finalize({
      status: "COMPLETED",
      finalized_by: substituted.identity.operator,
    })).rejects.toThrow("provider output");

    const staleSourceDigest = await create("strict-terminal-source-digest");
    const staleSourcePath = "execution/source-manifest.json";
    const staleSource = JSON.parse(await readFile(
      resolve(staleSourceDigest.store.runRoot, staleSourcePath),
      "utf8",
    ));
    staleSource.source_digest = "f".repeat(64);
    await rewrite(staleSourceDigest.store, staleSourcePath, staleSource);
    await expect(staleSourceDigest.store.finalize({
      status: "COMPLETED",
      finalized_by: staleSourceDigest.identity.operator,
    })).rejects.toThrow("definition or identity authority");

    const duplicatedSource = await create("strict-terminal-source-correspondence");
    const duplicatedManifest = JSON.parse(await readFile(
      resolve(duplicatedSource.store.runRoot, staleSourcePath),
      "utf8",
    ));
    duplicatedManifest.definitions.push(duplicatedManifest.definitions[0]);
    duplicatedManifest.source_digest = valueDigest(duplicatedManifest.definitions);
    await rewrite(duplicatedSource.store, staleSourcePath, duplicatedManifest);
    await expect(duplicatedSource.store.finalize({
      status: "COMPLETED",
      finalized_by: duplicatedSource.identity.operator,
    })).rejects.toThrow("definition or identity authority");

    const extraDefinition = await create("strict-terminal-extra-frozen-definition");
    const extraManifest = JSON.parse(await readFile(
      resolve(extraDefinition.store.runRoot, staleSourcePath),
      "utf8",
    ));
    const extraSourcePath = "product-evals/tasks/unreferenced-extra.json";
    const extraFrozenPath = `execution/source/${valueDigest(extraSourcePath)}.json`;
    await extraDefinition.store.writeStageJson(extraFrozenPath, {
      schema_version: 1,
      id: "unreferenced-extra",
    });
    const extraRecord = await extraDefinition.store.artifactFileRecord(extraFrozenPath);
    extraManifest.definitions.push({ path: extraSourcePath, sha256: extraRecord.sha256 });
    extraManifest.frozen_sources.push({
      ...extraRecord,
      source_path: extraSourcePath,
      producer: "simulation-operator",
      platform: "test-platform",
      frozen_at: "2026-08-06T00:00:00.000Z",
      redaction_profile: "source-code-v1",
      redaction_status: "CLEAN",
      lineage: { run_id: extraDefinition.store.runId, source_digest: extraRecord.sha256 },
    });
    extraManifest.source_digest = valueDigest(extraManifest.definitions);
    await rewrite(extraDefinition.store, staleSourcePath, extraManifest);
    await resealExecutionChain(extraDefinition.store);
    await expect(extraDefinition.store.finalize({
      status: "COMPLETED",
      finalized_by: extraDefinition.identity.operator,
    })).rejects.toThrow("full frozen source graph");

    const staleIdentity = await create("strict-terminal-identity-envelope");
    const staleIdentityManifest = JSON.parse(await readFile(
      resolve(staleIdentity.store.runRoot, staleSourcePath),
      "utf8",
    ));
    staleIdentityManifest.identity_envelope_digest = "e".repeat(64);
    await rewrite(staleIdentity.store, staleSourcePath, staleIdentityManifest);
    await expect(staleIdentity.store.finalize({
      status: "COMPLETED",
      finalized_by: staleIdentity.identity.operator,
    })).rejects.toThrow("definition or identity authority");

    const missingFrozen = await create("strict-terminal-frozen-correspondence");
    const missingFrozenManifest = JSON.parse(await readFile(
      resolve(missingFrozen.store.runRoot, staleSourcePath),
      "utf8",
    ));
    missingFrozenManifest.frozen_sources.pop();
    await rewrite(missingFrozen.store, staleSourcePath, missingFrozenManifest);
    await expect(missingFrozen.store.finalize({
      status: "COMPLETED",
      finalized_by: missingFrozen.identity.operator,
    })).rejects.toThrow("frozen-source correspondence");

    const zeroAuthority = await create("strict-terminal-zero-authority-counterexample");
    const zeroResultPath = "execution/tasks/strict-task/result.json";
    const zeroResult = JSON.parse(await readFile(
      resolve(zeroAuthority.store.runRoot, zeroResultPath),
      "utf8",
    ));
    zeroResult.policy_decisions = [];
    zeroResult.policy_decision_digest = valueDigest([]);
    zeroResult.oracle_results = [];
    zeroResult.final_state = {};
    zeroResult.side_effects = "NONE";
    zeroResult.dispatch = {
      status: "NOT_DISPATCHED",
      actions: [],
      uncertainty_reason: null,
    };
    zeroResult.events = zeroResult.events
      .filter((event: Record<string, any>) =>
        event.event_type !== "ORACLE"
      )
      .map((event: Record<string, any>, sequence: number) => ({ ...event, sequence }));
    await rewrite(zeroAuthority.store, zeroResultPath, zeroResult);
    await rewrite(zeroAuthority.store, "execution/tasks/strict-task/policy-decisions.json", []);
    await rewrite(zeroAuthority.store, "execution/tasks/strict-task/oracle.json", []);
    await rewrite(zeroAuthority.store, "execution/tasks/strict-task/final-state.json", {});
    await rewrite(zeroAuthority.store, "execution/tasks/strict-task/dispatch.json", zeroResult.dispatch);
    await writeFile(
      resolve(zeroAuthority.store.runRoot, "execution/tasks/strict-task/events.jsonl"),
      `${zeroResult.events.map((event: unknown) => stableJson(event)).join("\n")}\n`,
      { mode: 0o600 },
    );
    const zeroExecution = JSON.parse(await readFile(
      resolve(zeroAuthority.store.runRoot, "execution/execution-receipt.json"),
      "utf8",
    ));
    zeroExecution.task_results[0].policy_decision_digest = valueDigest([]);
    zeroExecution.task_results[0].result_digest = valueDigest(zeroResult);
    await rewrite(zeroAuthority.store, "execution/execution-receipt.json", zeroExecution);
    await resealExecutionChain(zeroAuthority.store);
    await expect(zeroAuthority.store.finalize({
      status: "COMPLETED",
      finalized_by: zeroAuthority.identity.operator,
    })).rejects.toThrow("policy decision coverage");

    const topStatusSubstitution = await create("strict-terminal-top-status-substitution");
    const topExecution = JSON.parse(await readFile(
      resolve(topStatusSubstitution.store.runRoot, "execution/execution-receipt.json"),
      "utf8",
    ));
    topExecution.status = "FAIL";
    await rewrite(
      topStatusSubstitution.store,
      "execution/execution-receipt.json",
      topExecution,
    );
    await resealExecutionChain(topStatusSubstitution.store);
    await expect(topStatusSubstitution.store.finalize({
      status: "COMPLETED",
      finalized_by: topStatusSubstitution.identity.operator,
    })).rejects.toThrow("execution status differs");

    const resealedResult = await create("strict-terminal-resealed-result");
    const taskResultPath = "execution/tasks/strict-task/result.json";
    const taskResult = JSON.parse(await readFile(
      resolve(resealedResult.store.runRoot, taskResultPath),
      "utf8",
    ));
    taskResult.status = "FAIL";
    taskResult.outcome = "FAILED";
    await rewrite(resealedResult.store, taskResultPath, taskResult);
    const resealedExecutionPath = "execution/execution-receipt.json";
    const resealedExecution = JSON.parse(await readFile(
      resolve(resealedResult.store.runRoot, resealedExecutionPath),
      "utf8",
    ));
    Object.assign(resealedExecution.task_results[0], {
      status: "FAIL",
      outcome: "FAILED",
      result_digest: valueDigest(taskResult),
    });
    resealedExecution.status = "FAIL";
    await rewrite(resealedResult.store, resealedExecutionPath, resealedExecution);
    const resealedResultSummary = JSON.parse(await readFile(
      resolve(resealedResult.store.runRoot, "summary.json"),
      "utf8",
    ));
    resealedResultSummary.execution_receipt_digest = valueDigest(resealedExecution);
    await rewrite(resealedResult.store, "summary.json", resealedResultSummary);
    await expect(resealedResult.store.finalize({
      status: "COMPLETED",
      finalized_by: resealedResult.identity.operator,
    })).rejects.toThrow("task sidecar authority");

    const substitutedSidecar = await create("strict-terminal-substituted-sidecar");
    await rewrite(
      substitutedSidecar.store,
      "execution/tasks/strict-task/policy-decisions.json",
      [{ policy_id: "invented-policy", decision: "ALLOW" }],
    );
    await expect(substitutedSidecar.store.finalize({
      status: "COMPLETED",
      finalized_by: substitutedSidecar.identity.operator,
    })).rejects.toThrow("task sidecar authority");

    const forgedMechanicalGate = await create("strict-terminal-codex-mechanical-gate");
    const gateOutputPath =
      `evaluations/${forgedMechanicalGate.store.runId}-evaluation/provider-output.json`;
    const gateOutput = JSON.parse(await readFile(
      resolve(forgedMechanicalGate.store.runRoot, gateOutputPath),
      "utf8",
    ));
    gateOutput.mechanical_gate_status = "FAIL";
    await rewrite(forgedMechanicalGate.store, gateOutputPath, gateOutput);
    const gateTrace = [
      stableJson({ type: "item.completed", item: { type: "agent_message", text: JSON.stringify(gateOutput) } }),
      stableJson({ type: "turn.completed", usage: {} }),
      "",
    ].join("\n");
    const gateTracePath =
      `evaluations/${forgedMechanicalGate.store.runId}-evaluation/stdout.jsonl`;
    await writeFile(resolve(forgedMechanicalGate.store.runRoot, gateTracePath), gateTrace, { mode: 0o600 });
    const gateEvaluationPath =
      `evaluations/${forgedMechanicalGate.store.runId}-evaluation/receipt.json`;
    const gateEvaluation = JSON.parse(await readFile(
      resolve(forgedMechanicalGate.store.runRoot, gateEvaluationPath),
      "utf8",
    ));
    gateEvaluation.provider_output_digest = valueDigest(gateOutput);
    gateEvaluation.provider_trace_digest = sha256Text(gateTrace);
    await resealEvaluation(forgedMechanicalGate.store, gateEvaluation);
    await expect(forgedMechanicalGate.store.finalize({
      status: "COMPLETED",
      finalized_by: forgedMechanicalGate.identity.operator,
    })).rejects.toThrow("provider output is stale");

    const inventedCalibration = await create("strict-terminal-invented-calibration");
    const inventedAggregationPath = `aggregations/${inventedCalibration.store.runId}-aggregation.json`;
    const inventedAggregation = JSON.parse(await readFile(
      resolve(inventedCalibration.store.runRoot, inventedAggregationPath),
      "utf8",
    ));
    inventedAggregation.calibration_receipt_digest = "a".repeat(64);
    await rewrite(inventedCalibration.store, inventedAggregationPath, inventedAggregation);
    const inventedSummary = JSON.parse(await readFile(
      resolve(inventedCalibration.store.runRoot, "summary.json"),
      "utf8",
    ));
    inventedSummary.calibration_receipt_digest = "a".repeat(64);
    inventedSummary.aggregation_receipt_digest = valueDigest(inventedAggregation);
    await rewrite(inventedCalibration.store, "summary.json", inventedSummary);
    await expect(inventedCalibration.store.finalize({
      status: "COMPLETED",
      finalized_by: inventedCalibration.identity.operator,
    })).rejects.toThrow("aggregation receipt shape or reduction");

    const calibrated = await create("strict-terminal-calibrated", "codex", true);
    expect(await calibrated.store.artifactFileExists(
      `calibrations/${calibrated.store.runId}-calibration.json`,
    )).toBe(true);
    await calibrated.store.finalize({
      status: "COMPLETED",
      finalized_by: calibrated.identity.operator,
    });

    const removedCalibration = await create(
      "strict-terminal-removed-calibration",
      "codex",
      true,
    );
    const removedAggregationPath = `aggregations/${removedCalibration.store.runId}-aggregation.json`;
    const removedAggregation = JSON.parse(await readFile(
      resolve(removedCalibration.store.runRoot, removedAggregationPath),
      "utf8",
    ));
    removedAggregation.calibration_receipt_digest = null;
    await rewrite(removedCalibration.store, removedAggregationPath, removedAggregation);
    const removedSummary = JSON.parse(await readFile(
      resolve(removedCalibration.store.runRoot, "summary.json"),
      "utf8",
    ));
    removedSummary.calibration_receipt_digest = null;
    removedSummary.aggregation_receipt_digest = valueDigest(removedAggregation);
    await rewrite(removedCalibration.store, "summary.json", removedSummary);
    await expect(removedCalibration.store.finalize({
      status: "COMPLETED",
      finalized_by: removedCalibration.identity.operator,
    })).rejects.toThrow("aggregation receipt shape or reduction");

    const resealedCalibration = await create(
      "strict-terminal-resealed-calibration",
      "codex",
      true,
    );
    const calibrationPath =
      `calibrations/${resealedCalibration.store.runId}-calibration.json`;
    const forgedCalibration = JSON.parse(await readFile(
      resolve(resealedCalibration.store.runRoot, calibrationPath),
      "utf8",
    ));
    forgedCalibration.metric_results[0].status = "FAIL";
    forgedCalibration.status = "UNCALIBRATED";
    forgedCalibration.blockers = ["coherently resealed calibration"];
    await rewrite(resealedCalibration.store, calibrationPath, forgedCalibration);
    await resealCodexRequest(resealedCalibration.store, (request) => {
      request.calibration_receipt_digest = valueDigest(forgedCalibration);
    });
    const forgedCalibrationEvaluationPath =
      `evaluations/${resealedCalibration.store.runId}-evaluation/receipt.json`;
    const forgedCalibrationEvaluation = JSON.parse(await readFile(
      resolve(resealedCalibration.store.runRoot, forgedCalibrationEvaluationPath),
      "utf8",
    ));
    forgedCalibrationEvaluation.calibration_receipt_digest = valueDigest(forgedCalibration);
    await resealEvaluation(
      resealedCalibration.store,
      forgedCalibrationEvaluation,
      (aggregation) => {
        aggregation.calibration_receipt_digest = valueDigest(forgedCalibration);
      },
    );
    const forgedCalibrationSummary = JSON.parse(await readFile(
      resolve(resealedCalibration.store.runRoot, "summary.json"),
      "utf8",
    ));
    forgedCalibrationSummary.calibration_receipt_digest = valueDigest(forgedCalibration);
    forgedCalibrationSummary.calibration_status = "UNCALIBRATED";
    await rewrite(resealedCalibration.store, "summary.json", forgedCalibrationSummary);
    await expect(resealedCalibration.store.finalize({
      status: "COMPLETED",
      finalized_by: resealedCalibration.identity.operator,
    })).rejects.toThrow("calibration receipt differs from frozen definition");

    const backdatedCalibration = await create(
      "strict-terminal-backdated-nonfixture-calibration",
      "codex",
      "nonfixture-backdated",
    );
    await expect(backdatedCalibration.store.finalize({
      status: "COMPLETED",
      finalized_by: backdatedCalibration.identity.operator,
    })).rejects.toThrow("calibration receipt differs from frozen definition");
  }, 60_000);
});
