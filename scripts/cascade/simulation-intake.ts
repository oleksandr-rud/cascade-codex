import {
  CascadeError,
  boundedPath,
  rootPath,
  sha256File,
  sha256Text,
  stableJson,
  writeJsonAtomic,
} from "./common";
import { resolveCurrentBriefProjection } from "./briefs";
import { type TaskEnvelope, validateTaskEnvelope } from "./admission";
import {
  ACTION_BINDING_VERSION,
  actionBindingDigest,
  type ResolvedCampaign,
  type PolicyDefinition,
  type SimulationIntakeDefinition,
  type TaskDefinition,
  buildSimulationSeedBindingProjection,
  policyAppliesToObservation,
  readBoundedTaskEnvelopeSnapshot,
  resolveCampaign,
  simulationSeedBindingBlockers,
  taskPolicyActions,
  validateSimulationIntakeDestination,
  validateSimulationIntake,
} from "./simulation-definitions";

export interface CompileSimulationIntakeOptions {
  campaign: string;
  envelopePath: string;
  brief?: string;
  expectedRequestDigest?: string;
  expectedSourceDigest?: string;
}

export function simulationIntakeAdmissionBindingBlockers(
  envelope: TaskEnvelope,
  binding: Pick<CompileSimulationIntakeOptions, "expectedRequestDigest" | "expectedSourceDigest">,
): string[] {
  validateTaskEnvelope(envelope);
  const blockers: string[] = [];
  if (!binding.expectedRequestDigest) blockers.push("simulation intake requires an externally expected Task Envelope request digest");
  if (!binding.expectedSourceDigest) blockers.push("simulation intake requires an externally expected Task Envelope source digest");
  if (blockers.length) return blockers;
  try {
    validateTaskEnvelope(envelope, {
      expected_request_digest: binding.expectedRequestDigest,
      expected_source_digest: binding.expectedSourceDigest,
      require_source_digest: true,
    });
  } catch (error) {
    blockers.push(`Task Envelope external derivation/source binding failed: ${error instanceof Error ? error.message : "unknown binding failure"}`);
  }
  return blockers;
}

function canonicalFileDigest(value: unknown): string {
  return sha256Text(`${stableJson(value, true)}\n`);
}

function sorted(values: string[]): string[] {
  return [...new Set(values)].sort();
}

async function policyDigests(resolved: ResolvedCampaign): Promise<Map<string, string>> {
  return new Map(
    await Promise.all(
      resolved.policies.map(async (policy, index) => [
        policy.id,
        await sha256File(rootPath(resolved.campaign.policy_files[index]!)),
      ] as const),
    ),
  );
}

export function buildSimulationIntakeTaskBindings(input: {
  campaignId: string;
  tasks: TaskDefinition[];
  policies: PolicyDefinition[];
  policyDigests: Map<string, string>;
}): { tasks: SimulationIntakeDefinition["tasks"]; blockers: string[] } {
  const blockers: string[] = [];
  const tasks = input.tasks.map((task) => {
    const applicable = new Set<string>();
    const actions = taskPolicyActions(task).map((action, actionIndex) => {
      const matching = input.policies.filter((policy) => policyAppliesToObservation(policy, {
        campaign_id: input.campaignId,
        task_id: task.id,
        task_kind: task.kind,
        driver_type: task.driver.type,
        action,
      }));
      matching.forEach((policy) => applicable.add(policy.id));
      const applicablePolicyIds = matching.map((policy) => policy.id).sort();
      let decision: SimulationIntakeDefinition["tasks"][number]["actions"][number]["decision"];
      if (!matching.length) {
        decision = "GAP";
        blockers.push(`${task.id}/${actionIndex} has no applicable campaign policy`);
      } else if (matching.length > 1) {
        decision = "AMBIGUOUS";
        blockers.push(`${task.id}/${actionIndex} has overlapping policies: ${applicablePolicyIds.join(", ")}`);
      } else {
        decision = matching[0]!.effect;
        if (decision === "DENY") blockers.push(`${task.id}/${actionIndex} is denied by ${matching[0]!.id}`);
      }
      const policyDigests = applicablePolicyIds.map((id) => input.policyDigests.get(id));
      if (policyDigests.some((digest) => !digest)) {
        blockers.push(`${task.id}/${actionIndex} has a policy without a current content digest`);
      }
      return {
        action_index: actionIndex,
        action_binding_version: ACTION_BINDING_VERSION,
        action_binding_digest: actionBindingDigest(action),
        applicable_policy_ids: applicablePolicyIds,
        policy_digests: policyDigests.filter((digest): digest is string => Boolean(digest)).sort(),
        decision,
      };
    });
    const declared = sorted(task.policy_ids ?? []);
    const applicableIds = sorted([...applicable]);
    if (stableJson(declared) !== stableJson(applicableIds)) {
      blockers.push(`${task.id} declared policies differ from computed applicable policies`);
    }
    return {
      task_id: task.id,
      declared_policy_ids: declared,
      applicable_policy_ids: applicableIds,
      actions,
    };
  });
  return { tasks, blockers: sorted(blockers) };
}

async function compileSimulationIntakeCandidate(
  options: CompileSimulationIntakeOptions,
  replaceReferencedIntake: boolean,
): Promise<{
  intake: SimulationIntakeDefinition;
  intakePath: string;
  envelopeSnapshotPath: string;
  envelopeSnapshot: TaskEnvelope;
}> {
  const resolved = await resolveCampaign(options.campaign, {
    replaceReferencedIntake,
  });
  if (!resolved.campaign.intake_file) {
    throw new CascadeError(`${resolved.campaign.id} has no intake_file`);
  }
  const envelopeSource = await readBoundedTaskEnvelopeSnapshot(
    boundedPath(options.envelopePath),
    "simulation intake source Task Envelope",
  );
  const envelope = envelopeSource.envelope;
  const blockers = simulationIntakeAdmissionBindingBlockers(envelope, options);
  const gaps: string[] = [];
  if (!envelope.control_packs.includes("SIMULATION_GOVERNANCE")) {
    blockers.push("Task Envelope does not require SIMULATION_GOVERNANCE");
  }
  if (!new Set(["CONNECTED", "PROGRAM"]).has(envelope.route)) {
    blockers.push(`Task Envelope route ${envelope.route} is not eligible for simulation campaign intake`);
  }
  if (envelope.blockers.length) blockers.push(...envelope.blockers.map((item) => `Task Envelope: ${item}`));
  const unsafeAuthorityClaims = envelope.claims.filter((claim) => claim.status !== "SUPERSEDED" && ["EXTERNAL_SOURCE", "MODEL_INFERENCE"].includes(claim.source) && (claim.kind === "AUTHORITY" || claim.policy_tags.some((tag) => tag.startsWith("requested-"))));
  if (unsafeAuthorityClaims.length) {
    blockers.push(`Task Envelope has unproven external or inferred authority claims: ${unsafeAuthorityClaims.map((claim) => claim.claim_id).join(", ")}`);
  }

  const snapshotPath = `product-evals/intakes/${resolved.simulation.simulation_scope}/task-envelopes/${envelope.envelope_id}.json`;
  const digestByPolicy = await policyDigests(resolved);
  const taskBindings = buildSimulationIntakeTaskBindings({
    campaignId: resolved.campaign.id,
    tasks: resolved.tasks,
    policies: resolved.policies,
    policyDigests: digestByPolicy,
  });
  blockers.push(...taskBindings.blockers);
  const tasks = taskBindings.tasks;

  let productContext: SimulationIntakeDefinition["product_context"] = null;
  let seedBinding: SimulationIntakeDefinition["seed_binding"] = null;
  if (resolved.simulation.simulation_scope === "product") {
    if (!resolved.seedBinding) {
      blockers.push("product simulation intake requires an authored seed binding");
    } else {
      seedBinding = buildSimulationSeedBindingProjection(resolved.seedBinding);
      blockers.push(...simulationSeedBindingBlockers({
        binding: resolved.seedBinding.definition,
        campaignId: resolved.campaign.id,
        campaignSha256: await sha256File(resolved.path),
        envelope,
        campaignClaimIds: new Set(resolved.claims.map((claim) => claim.id)),
        scenarioIds: new Set(resolved.scenarios.map((scenario) => scenario.id)),
        taskIds: new Set(resolved.tasks.map((task) => task.id)),
      }));
    }
    if (!options.brief) {
      blockers.push("product simulation intake requires --brief PB-NNN or docs/specs/.../brief.yaml");
    } else {
      const brief = await resolveCurrentBriefProjection(options.brief);
      if (brief.currentOutput !== brief.generated) {
        blockers.push(
          `product brief projection is stale: ${brief.resolved.manifest.output_path}`,
        );
      }
      if (!new Set(["reviewed", "approved"]).has(brief.resolved.manifest.status)) {
        blockers.push(
          `product brief ${brief.resolved.manifest.brief_id} is not reviewed or approved`,
        );
      }
      productContext = brief.binding;
      gaps.push(
        ...brief.resolved.manifest.gaps.map((item) => `product brief: ${item}`),
      );
    }
  } else if (options.brief) {
    blockers.push("harness simulation intake cannot claim product brief authority");
  }

  const seed = {
    schema_version: 6 as const,
    artifact_type: "cascade-simulation-intake" as const,
    status: blockers.length ? "BLOCKED" as const : "READY" as const,
    scope: resolved.simulation.simulation_scope,
    campaign_id: resolved.campaign.id,
    produced_at: envelope.produced_at,
    task_envelope: {
      path: snapshotPath,
      envelope_id: envelope.envelope_id,
      revision: envelope.revision,
      sha256: canonicalFileDigest(envelope),
      request_digest: envelope.request_digest,
      source_digest: envelope.source_digest,
      derivation_input_digest: envelope.derivation_input_digest,
      provenance_version: envelope.derivation_input.provenance_version,
      provenance_mode: envelope.derivation_input.provenance_mode,
      source_segments_digest: envelope.derivation_input.source_segments_digest,
      direct_user_attestation: envelope.derivation_input.direct_user_attestation,
      expected_request_digest: options.expectedRequestDigest ?? null,
      expected_source_digest: options.expectedSourceDigest ?? null,
    },
    product_context: productContext,
    seed_binding: seedBinding,
    claims: envelope.claims.filter((claim) => claim.status !== "SUPERSEDED").map((claim, index) => ({
      claim_id: `SIC-${String(index + 1).padStart(3, "0")}`,
      source_claim_id: claim.claim_id,
      kind: claim.kind,
      source: claim.source,
      statement: claim.statement,
      status: claim.status,
      policy_tags: sorted(claim.policy_tags),
    })),
    tasks,
    blockers: sorted(blockers),
    gaps: sorted(gaps),
    invalidation: [
      "task envelope revision, derivation, provenance projection, externally expected request digest, or source digest",
      "product brief manifest or generated projection digest",
      "authored seed-binding path, content digest, campaign digest, source digest, or mapping projection",
      "campaign task, action, or policy set",
      "policy content digest",
    ],
  };
  const intake: SimulationIntakeDefinition = {
    ...seed,
    id: `SI-${sha256Text(stableJson(seed)).slice(0, 16)}`,
  };
  validateSimulationIntake(intake as unknown as Record<string, unknown>, resolved.campaign.intake_file);
  return {
    intake,
    intakePath: resolved.campaign.intake_file,
    envelopeSnapshotPath: snapshotPath,
    envelopeSnapshot: envelope,
  };
}

export async function compileSimulationIntake(
  options: CompileSimulationIntakeOptions,
) {
  return compileSimulationIntakeCandidate(options, false);
}

export async function writeCompiledSimulationIntake(
  options: CompileSimulationIntakeOptions,
): Promise<SimulationIntakeDefinition> {
  const result = await compileSimulationIntakeCandidate(options, true);
  const intakeDestination = validateSimulationIntakeDestination(
    result.intakePath,
    result.intake.scope,
    `${result.intake.campaign_id}.intake_file`,
  );
  await writeJsonAtomic(rootPath(result.envelopeSnapshotPath), result.envelopeSnapshot);
  await writeJsonAtomic(intakeDestination, result.intake);
  if (result.intake.status === "READY") await resolveCampaign(options.campaign);
  return result.intake;
}
