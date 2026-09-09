import { describe, expect, test } from "bun:test";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, mkdtemp, readFile, readdir, rmdir, unlink, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { rootPath, runCommand, valueDigest } from "../../scripts/cascade/common";
import { claimStatus, generalEvaluationRequest as campaignRequest } from "../../scripts/cascade/campaigns";
import { executeCascadeCommand } from "../../scripts/cascade/cli/command-dispatcher";
import { buildMechanicalEvaluationAuthority, type MechanicalTaskAuthority } from "../../scripts/cascade/evaluation-authority";
import { buildFixtureEvaluationReceipt, evaluationInputDigest, generalEvaluationRequest, runCodexEvaluation, type EvaluationIdentity } from "../../scripts/cascade/evaluations";
import { resolveCampaign } from "../../scripts/cascade/simulation-definitions";
import { validateJudgment } from "../../scripts/cascade/evals";
import { readStructured, stringifyYaml } from "../../scripts/cascade/structured-data";
import { renderStarterPackage } from "../../scripts/cascade/simulations";
import { reduceEvaluations } from "../../scripts/cascade/evaluation-reducer";

const resolved = await resolveCampaign(rootPath("product-evals/campaigns/agent-response-fake-smoke.yaml"));
const claim = { ...resolved.claims[0]!, required_oracle_ids: ["oracle"], required_policy_ids: ["policy"], evidence_requirements: ["cleanup"], required_metric_ids: [], requires_calibration: false };
const task = (): MechanicalTaskAuthority => ({ task_id: "task", required: true, status: "PASS", oracle_results: [{ oracle_id: "oracle", status: "PASS" }], policy_decisions: [{ policy_id: "policy", decision: "ALLOW" }], cleanup: { verified: true }, events: [{}] } as MechanicalTaskAuthority);

describe("one mechanical evaluation owner", () => {
  for (const [label, mutate, expected] of [
    ["valid evidence", (_task: MechanicalTaskAuthority) => {}, "SUPPORTED"],
    ["missing oracle", (task: MechanicalTaskAuthority) => { task.oracle_results = []; }, "BLOCKED"],
    ["failed oracle", (task: MechanicalTaskAuthority) => { task.oracle_results[0]!.status = "FAIL"; }, "UNSUPPORTED"],
    ["missing positive policy evidence", (task: MechanicalTaskAuthority) => { task.policy_decisions = []; }, "BLOCKED"],
    ["denied policy", (task: MechanicalTaskAuthority) => { task.policy_decisions[0]!.decision = "DENY"; }, "UNSUPPORTED"],
    ["unverified cleanup", (task: MechanicalTaskAuthority) => { task.cleanup.verified = false; }, "BLOCKED"],
  ] as const) {
    test(label, () => {
      const evidence = task();
      mutate(evidence);
      const result = buildMechanicalEvaluationAuthority({ claims: [claim], task_results: [evidence], calibration: null, population_authority: () => null });
      expect(result.claim_ledger[0]!.status).toBe(expected);
      expect(claimStatus(resolved, claim, [evidence as never], null).status).toBe(expected);
    });
  }
  test("keeps required calibration unproven", () => {
    const result = buildMechanicalEvaluationAuthority({ claims: [{ ...claim, requires_calibration: true }], task_results: [task()], calibration: null, population_authority: () => null });
    expect(result.claim_ledger[0]!.status).toBe("NOT_RUN");
  });
});

test("campaign and evaluator share one request projection with exclusive claim ownership", () => {
  expect(campaignRequest).toBe(generalEvaluationRequest);
  const identity: EvaluationIdentity = {
    runId: "case", campaignId: resolved.campaign.id, sourceManifestDigest: "a".repeat(64), executionReceiptDigest: "b".repeat(64), calibrationReceiptDigest: null,
    operatorIdentity: "operator", targetActorIdentity: "target", evaluatorIdentity: "evaluator",
    principalIdentities: { operator: "operator", target: "target", evaluator: "evaluator", specialized_evaluator: "specialized", aggregator: "aggregator", simulator: "simulator", recovery: "recovery" },
    specializedEvaluation: { receipt_id: "specialized", receipt_digest: "c".repeat(64), status: "PASS", claim_ids: ["specialized"] },
  };
  const mechanical = { status: "PASS" as const, claim_ledger: ["general", "specialized"].map((claim_id) => ({ claim_id, class: "execution", status: "SUPPORTED" as const, reason: "observed", evidence: ["task"] })) };
  const request = generalEvaluationRequest(resolved, identity, mechanical);
  expect(request.mechanical_evaluation.claim_ledger.map((entry) => entry.claim_id)).toEqual(["general"]);
  expect(request.evaluation_input_digest).toBe(evaluationInputDigest(resolved, identity, mechanical));
  const { evaluation_input_digest, ...input } = request;
  expect(evaluation_input_digest).toBe(valueDigest(input));
});

test("command dispatch preserves the caller cancellation signal", async () => {
  const signal = AbortSignal.abort();
  let observed;
  await executeCascadeCommand({ argv: ["campaign", "run", "fixture"], signal }, { loaders: { campaign: async () => ({ main: async (_argv, context) => { observed = context?.signal; return 0; } }) } });
  expect(observed).toBe(signal);
});

test("harness judging uses the shared score and rejects malformed dimension sets", async () => {
  const rubric = await readStructured<any>(rootPath("harness-evals/rubrics/outcome-v1.yaml"));
  const profile = { id: "judge", judge_type: "outcome" };
  const judgment = { run_id: "run", scenario_id: "scenario", judge_profile_id: profile.id, judge_type: profile.judge_type, rubric_id: rubric.rubric_id, rubric_version: rubric.version, root_cause: "none", verdict: "PASS", dimensions: rubric.dimensions.map(({ id }: { id: string }) => ({ id, score: 4 })) };
  const validate = (value: unknown) => validateJudgment(value as any, profile, rubric, "run", "scenario");
  expect((await validate(judgment)).accepted).toBe(true);
  expect((await validate(judgment)).computed_score).toBe(100);
  for (const dimensions of [null, {}, [...judgment.dimensions, judgment.dimensions[0]], judgment.dimensions.map((_item: unknown) => judgment.dimensions[0]), [{ id: "unknown", score: 4 }, ...judgment.dimensions.slice(1)]]) {
    expect((await validate({ ...judgment, dimensions })).accepted).toBe(false);
  }
  expect((await validate({ ...judgment, verdict: "FAIL" })).validation_errors).toContain("verdict-score-disagreement");
  const floorFailure = structuredClone(judgment);
  floorFailure.dimensions.at(-1).score = 1;
  expect((await validate(floorFailure)).accepted).toBe(false);
});

test("selected fixture executes and independently verifies while an unrelated campaign is invalid", async () => {
  const unrelated = rootPath(`product-evals/campaigns/unrelated-invalid-${randomUUID()}.yaml`);
  const runId = `simplification-${randomUUID()}`;
  await writeFile(unrelated, "invalid: [\n", { flag: "wx" });
  try {
    const result = await runCommand([process.execPath, "scripts/cascade.ts", "campaign", "run", "agent-response-fake-smoke", "--run-id", runId], { cwd: rootPath(), timeoutMs: 60000 });
    expect(result.exitCode, `${result.stdout}\n${result.stderr}`).toBe(0);
    const verification = await runCommand([process.execPath, "scripts/cascade.ts", "campaign", "verify", runId], { cwd: rootPath(), timeoutMs: 60000 });
    expect(verification.exitCode, `${verification.stdout}\n${verification.stderr}`).toBe(0);
    const summary = JSON.parse(await readFile(rootPath(`.artifacts/product-evals/${runId}/summary.json`), "utf8"));
    expect(summary.campaign_status).toBe("PASS");
    expect(summary.execution_status).toBe("PASS");
    expect(summary.evaluation_status).toBe("PASS");
    expect(summary.release_eligible).toBe(false);
    const reservation = JSON.parse(await readFile(rootPath(`.artifacts/product-evals/${runId}/reservation.json`), "utf8"));
    expect(reservation.identities.specialized_evaluator).toBeNull();
    expect((await readdir(rootPath(`.artifacts/product-evals/${runId}`))).includes("specialized-evaluations")).toBe(false);
  } finally {
    await unlink(unrelated);
  }
}, 120000);

test("NOT_APPLICABLE needs no specialized receipt; REQUIRED still fails closed", () => {
  const mechanical = { status: "PASS" as const, claim_ledger: [{ claim_id: claim.id, class: claim.class, status: "SUPPORTED" as const, reason: "observed", evidence: ["task"] }] };
  const input = { claims: [claim], mechanical, specialized_declaration: resolved.campaign.specialized_evaluation, specialized_receipt: null, general_status: "PASS" as const, general_claim_ledger: mechanical.claim_ledger };
  expect(reduceEvaluations(input).status).toBe("PASS");
  expect(() => reduceEvaluations({ ...input, specialized_declaration: { ...input.specialized_declaration!, applicability: "REQUIRED", claim_ids: [claim.id] } })).toThrow("specialized receipt");
});

test("an empty general claim set is explicit and cannot invoke a model", async () => {
  const identity = {
    runId: "empty", campaignId: resolved.campaign.id, operatorIdentity: "operator", evaluatorIdentity: "evaluator", targetActorIdentity: "target", principalIdentities: {},
    sourceManifestDigest: "a".repeat(64), executionReceiptDigest: "b".repeat(64), calibrationReceiptDigest: null,
    specializedEvaluation: { receipt_id: "specialized", receipt_digest: "c".repeat(64), status: "PASS", claim_ids: resolved.claims.map((claim) => claim.id) },
  } as EvaluationIdentity;
  const mechanical = { status: "PASS" as const, claim_ledger: resolved.claims.map((claim) => ({ claim_id: claim.id, class: claim.class, status: "SUPPORTED" as const, reason: "observed", evidence: ["task"] })) };
  const receipt = buildFixtureEvaluationReceipt(resolved, identity, mechanical);
  expect(receipt.provider).toBe("none");
  expect(receipt.claim_ledger).toEqual([]);
  expect(receipt.provider_trace_digest).toBeNull();
  const semantic = { ...resolved, evaluationProfile: { ...resolved.evaluationProfile, provider: "codex" as const } };
  await expect(runCodexEvaluation(semantic, identity, mechanical, {} as never)).rejects.toThrow("empty general claim set");
});

test("the basic starter resolves, runs, and verifies without research scaffolding", async () => {
  const simulationId = `minimal-${randomUUID()}`;
  const options = { simulationId, ownerLane: "W-001" };
  const basic = await renderStarterPackage(options);
  const research = await renderStarterPackage({ ...options, research: true });
  expect(basic.length).toBe(11);
  expect(research.length).toBeGreaterThan(basic.length);
  expect(basic.some((file) => /\/(populations|datasets|metrics|treatments|calibrations)\//.test(file.path))).toBe(false);
  expect(research.some((file) => file.path.endsWith("-release-eligibility.yaml"))).toBe(true);
  const written: string[] = [];
  const campaignPath = rootPath(`product-evals/campaigns/${simulationId}-smoke.yaml`);
  try {
    for (const file of basic) {
      if (file.path.includes("/intakes/")) continue;
      const path = rootPath(file.path.replace("/product/", "/harness/"));
      const content = JSON.parse(JSON.stringify(file.content).replaceAll("/product/", "/harness/"));
      if (file.path.endsWith("/manifest.yaml")) content.simulation_scope = "harness";
      if (file.path.includes("/campaigns/")) {
        delete content.intake_file;
        delete content.seed_binding_file;
        content.specialized_evaluation = { applicability: "NOT_APPLICABLE", claim_ids: [], route_ids: [], trace_ids: [], reason: "Bounded framework mechanics only." };
      }
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, stringifyYaml(content), { flag: "wx" });
      written.push(path);
    }
    const minimal = await resolveCampaign(campaignPath);
    expect(minimal.dataset).toBeUndefined();
    expect(minimal.populations).toEqual([]);
    expect(minimal.metrics).toEqual([]);
    expect(minimal.treatments).toEqual([]);
    const manifestPath = rootPath(minimal.campaign.simulation_file);
    const original = await readFile(manifestPath, "utf8");
    await writeFile(manifestPath, `${original}\ncalibration_file: product-evals/calibrations/framework-ranking-v1.yaml\n`);
    await expect(resolveCampaign(campaignPath)).rejects.toThrow("calibration requires a dataset, metrics, and treatments");
    await writeFile(manifestPath, original);
    const runId = `${simulationId}-run`;
    for (const args of [["run", `${simulationId}-smoke`, "--run-id", runId], ["verify", runId]]) {
      const result = await runCommand([process.execPath, "scripts/cascade.ts", "campaign", ...args], { cwd: rootPath(), timeoutMs: 60000 });
      expect(result.exitCode, `${result.stdout}\n${result.stderr}`).toBe(0);
    }
    const cancelledId = `${simulationId}-cancelled`;
    const child = spawn(process.execPath, ["scripts/cascade.ts", "campaign", "run", `${simulationId}-smoke`, "--run-id", cancelledId], { cwd: rootPath(), stdio: ["ignore", "pipe", "pipe"] });
    let diagnostics = "";
    child.stdout.on("data", (chunk) => { diagnostics += chunk; });
    child.stderr.on("data", (chunk) => { diagnostics += chunk; });
    const exited = once(child, "close");
    const guard = setTimeout(() => child.kill("SIGKILL"), 20000);
    try {
      const deadline = Date.now() + 10000;
      while (true) {
        try { await readFile(rootPath(`.artifacts/product-evals/${cancelledId}/reservation.json`)); break; } catch {
          if (Date.now() >= deadline || child.exitCode !== null) throw new Error(`campaign did not start: ${diagnostics}`);
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
      }
      child.kill("SIGTERM");
      expect((await exited)[0], diagnostics).toBe(1);
      expect(diagnostics).not.toContain("ERROR:");
      const cancelled = JSON.parse(await readFile(rootPath(`.artifacts/product-evals/${cancelledId}/execution/execution-receipt.json`), "utf8"));
      expect(cancelled.session.status).toBe("CANCELLED");
      const verification = await runCommand([process.execPath, "scripts/cascade.ts", "campaign", "verify", cancelledId], { cwd: rootPath(), timeoutMs: 60000 });
      expect(verification.exitCode, `${verification.stdout}\n${verification.stderr}`).toBe(0);
    } finally { clearTimeout(guard); child.kill("SIGKILL"); }
    // Exercise the explicit independent-evaluator handoff with labelled offline evidence.
    const authored = await readStructured<any>(campaignPath);
    authored.specialized_evaluation = { applicability: "REQUIRED", claim_ids: minimal.claims.map((claim) => claim.id), route_ids: ["cascade-evals:harness-evaluation"], trace_ids: ["fixture-trace"], reason: "Offline handoff contract test." };
    await writeFile(campaignPath, stringifyYaml(authored));
    const specializedRun = `${simulationId}-specialized`;
    const invoke = (args: string[]) => runCommand([process.execPath, "scripts/cascade.ts", "campaign", ...args], { cwd: rootPath(), timeoutMs: 60000 });
    const started = await invoke(["run", `${simulationId}-smoke`, "--run-id", specializedRun, "--lease-id", "fixture-lease"]);
    expect(started.exitCode).toBe(1);
    expect(started.stderr).toContain("awaits independent evaluation");
    const artifactRoot = rootPath(`.artifacts/product-evals/${specializedRun}`);
    const prefix = `specialized-evaluations/${specializedRun}-specialized-evaluation`;
    const inputPath = `${prefix}/input/input-manifest.json`;
    const tracePath = `${prefix}/provider/trace.json`;
    const outputPath = `${prefix}/provider/output.json`;
    const receiptPath = `${prefix}/receipt.json`;
    const inputText = await readFile(`${artifactRoot}/${inputPath}`, "utf8");
    const input = JSON.parse(inputText);
    const hash = (text: string) => createHash("sha256").update(text).digest("hex");
    const encoded = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;
    const traceText = encoded({ schema_version: 1, artifact_type: "specialized-evaluation-provider-trace", specialized_evaluation_id: input.specialized_evaluation_id, input_manifest_digest: hash(inputText), provider: "offline-fixture", model: "synthetic-test", completed: true, events: [{ type: "fixture.judgment", note: "No model or semantic evidence." }] });
    const judgment = { status: "PASS", root_cause: "none", earliest_failure: null, residual_uncertainty: ["Offline fixture proves plumbing only."], claim_ledger: input.claims.map((claim: any) => ({ ...claim, status: "SUPPORTED", reason: "Synthetic handoff fixture.", evidence: [outputPath] })) };
    const outputText = encoded({ schema_version: 1, artifact_type: "specialized-evaluation-provider-output", specialized_evaluation_id: input.specialized_evaluation_id, input_manifest_digest: hash(inputText), provider_trace_digest: hash(traceText), ...judgment });
    const files = [{ path: inputPath, content: inputText }, { path: tracePath, content: traceText }, { path: outputPath, content: outputText }];
    const receipt = { schema_version: 2, specialized_evaluation_id: input.specialized_evaluation_id, run_id: specializedRun, campaign_id: authored.id, applicability: "REQUIRED", specialized_evaluator_identity: "local-harness-evaluator", source_manifest_digest: input.source_manifest_digest, execution_receipt_digest: input.execution_receipt_digest, route_ids: input.route_ids, trace_ids: input.trace_ids, claim_ids: authored.specialized_evaluation.claim_ids, input_manifest_digest: hash(inputText), provider_trace_digest: hash(traceText), provider_output_digest: hash(outputText), evidence_artifacts: files.map((file) => ({ path: file.path, sha256: hash(file.content) })), ...judgment, created_at: new Date().toISOString() };
    const evidenceRoot = await mkdtemp(rootPath(".artifacts/specialized-input-fixture-"));
    for (const file of [...files, { path: receiptPath, content: encoded(receipt) }]) {
      await mkdir(dirname(`${evidenceRoot}/${file.path}`), { recursive: true });
      await writeFile(`${evidenceRoot}/${file.path}`, file.content);
    }
    const invalidRoot = await mkdtemp(rootPath(".artifacts/specialized-invalid-fixture-"));
    for (const file of [...files, { path: receiptPath, content: encoded({ ...receipt, source_manifest_digest: "0".repeat(64) }) }]) {
      await mkdir(dirname(`${invalidRoot}/${file.path}`), { recursive: true });
      await writeFile(`${invalidRoot}/${file.path}`, file.content);
    }
    const rejected = await invoke(["resume", specializedRun, "--lease-id", "fixture-lease", "--specialized-evidence-root", invalidRoot]);
    expect(rejected.exitCode).toBe(1);
    expect(rejected.stderr).toContain("source_manifest_digest is stale or mismatched");
    expect(await readdir(`${artifactRoot}/${prefix}`)).toEqual(["input"]);
    const before = await readFile(`${artifactRoot}/execution/execution-receipt.json`, "utf8");
    const resumed = await invoke(["resume", specializedRun, "--lease-id", "fixture-lease", "--specialized-evidence-root", evidenceRoot]);
    expect(resumed.exitCode, `${resumed.stdout}\n${resumed.stderr}`).toBe(0);
    expect(await readFile(`${artifactRoot}/execution/execution-receipt.json`, "utf8")).toBe(before);
    const verified = await invoke(["verify", specializedRun]);
    expect(verified.exitCode, `${verified.stdout}\n${verified.stderr}`).toBe(0);
    const empty = JSON.parse(await readFile(`${artifactRoot}/evaluations/${specializedRun}-evaluation/receipt.json`, "utf8"));
    expect(empty.provider).toBe("none");
    expect(empty.claim_ledger).toEqual([]);
  } finally {
    for (const path of written.reverse()) await unlink(path);
    const directories = new Set(written.map(dirname));
    for (const dir of directories) { try { await rmdir(dir); await rmdir(dirname(dir)); } catch { /* Shared directories remain. */ } }
  }
}, 120000);
