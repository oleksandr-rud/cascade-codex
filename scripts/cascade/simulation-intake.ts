import {
  CascadeError,
  boundedPath,
  readJson,
  readText,
  rel,
  rootPath,
  sha256File,
  sha256Text,
  stableJson,
  writeJsonAtomic,
} from "./common";
import { generateBrief, resolveBrief } from "./briefs";
import { type TaskEnvelope, validateTaskEnvelope } from "./admission";
import {
  type ResolvedCampaign,
  type PolicyDefinition,
  type SimulationIntakeDefinition,
  type TaskDefinition,
  policyAppliesToObservation,
  resolveCampaign,
  taskPolicyActions,
  validateSimulationIntake,
} from "./simulation-definitions";

export interface CompileSimulationIntakeOptions {
  campaign: string;
  envelopePath: string;
  brief?: string;
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
        action_digest: sha256Text(stableJson(action)),
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

export async function compileSimulationIntake(
  options: CompileSimulationIntakeOptions,
): Promise<{ intake: SimulationIntakeDefinition; envelopeSnapshotPath: string }> {
  const resolved = await resolveCampaign(options.campaign, { allowStaleIntake: true });
  if (!resolved.campaign.intake_file) {
    throw new CascadeError(`${resolved.campaign.id} has no intake_file`);
  }
  const envelope = await readJson<TaskEnvelope>(boundedPath(options.envelopePath));
  validateTaskEnvelope(envelope);
  const blockers: string[] = [];
  const gaps: string[] = [];
  if (!envelope.control_packs.includes("SIMULATION_GOVERNANCE")) {
    blockers.push("Task Envelope does not require SIMULATION_GOVERNANCE");
  }
  if (!new Set(["CONNECTED", "PROGRAM"]).has(envelope.route)) {
    blockers.push(`Task Envelope route ${envelope.route} cannot authorize a simulation campaign`);
  }
  if (envelope.blockers.length) blockers.push(...envelope.blockers.map((item) => `Task Envelope: ${item}`));

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
  if (resolved.simulation.simulation_scope === "product") {
    if (!options.brief) {
      blockers.push("product simulation intake requires --brief PB-NNN or docs/specs/.../brief.yaml");
    } else {
      const brief = await resolveBrief(options.brief);
      const generated = await generateBrief(options.brief);
      const current = await readText(rootPath(brief.manifest.output_path));
      if (current !== generated) blockers.push(`product brief projection is stale: ${brief.manifest.output_path}`);
      if (!new Set(["reviewed", "approved"]).has(brief.manifest.status)) {
        blockers.push(`product brief ${brief.manifest.brief_id} is not reviewed or approved`);
      }
      productContext = {
        brief_path: rel(brief.path),
        brief_id: brief.manifest.brief_id,
        revision: brief.manifest.revision,
        sha256: await sha256File(brief.path),
        output_path: brief.manifest.output_path,
        output_sha256: sha256Text(generated),
        domain_id: brief.manifest.domain_id,
        capability_id: brief.manifest.capability_id,
        product_refs: brief.manifest.product_refs,
      };
      gaps.push(...brief.manifest.gaps.map((item) => `product brief: ${item}`));
    }
  } else if (options.brief) {
    blockers.push("harness simulation intake cannot claim product brief authority");
  }

  const seed = {
    schema_version: 1 as const,
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
    },
    product_context: productContext,
    claims: envelope.claims.filter((claim) => claim.status !== "SUPERSEDED").map((claim, index) => ({
      claim_id: `SIC-${String(index + 1).padStart(3, "0")}`,
      source_claim_id: claim.claim_id,
      statement: claim.statement,
      status: claim.status,
      policy_tags: sorted(claim.policy_tags),
    })),
    tasks,
    blockers: sorted(blockers),
    gaps: sorted(gaps),
    invalidation: [
      "task envelope revision or digest",
      "product brief manifest or generated projection digest",
      "campaign task, action, or policy set",
      "policy content digest",
    ],
  };
  const intake: SimulationIntakeDefinition = {
    ...seed,
    id: `SI-${sha256Text(stableJson(seed)).slice(0, 16)}`,
  };
  validateSimulationIntake(intake as unknown as Record<string, unknown>, resolved.campaign.intake_file);
  return { intake, envelopeSnapshotPath: snapshotPath };
}

export async function writeCompiledSimulationIntake(
  options: CompileSimulationIntakeOptions,
): Promise<SimulationIntakeDefinition> {
  const result = await compileSimulationIntake(options);
  const resolved = await resolveCampaign(options.campaign, { allowStaleIntake: true });
  const envelope = await readJson<TaskEnvelope>(boundedPath(options.envelopePath));
  await writeJsonAtomic(rootPath(result.envelopeSnapshotPath), envelope);
  await writeJsonAtomic(rootPath(resolved.campaign.intake_file!), result.intake);
  if (result.intake.status === "READY") await resolveCampaign(options.campaign);
  return result.intake;
}
