import { CascadeError, assertJsonSchema, boundedPath, flag, isFile, parseArgs, readJson, readText, rootPath, sha256Text, stableJson, writeJsonAtomic } from "./common";
import { readBoundedTaskEnvelope, validateTaskEnvelope, type TaskEnvelope } from "./admission";
import { capabilitySelectionDigest, capabilitySelectionResponseSchema, readPluginCapabilityCatalog, validateCapabilitySelection, validateCatalogDigest, type CapabilitySelection, type PluginCapabilityCatalog } from "./plugin-workflow";
import { verifyWorkflowBindings } from "./workflow-control";

type RecordValue = Record<string, any>;
const sourceRoot = rootPath(".codex/plugins/cascade-workflows/skills/coordinator/skills/select-capabilities/references");
const referenceRoot = await isFile(`${sourceRoot}/selection-intake.schema.json`) ? sourceRoot : rootPath(".codex/runtime/contracts/coordinator/select-capabilities/references");
const intakeSchema = await readJson<RecordValue>(`${referenceRoot}/selection-intake.schema.json`);
const zeroDigest = "0".repeat(64);
const controllerInputs = ["task-envelope", "plugin-capability-catalog"];

function intakeDigest(intake: RecordValue): string {
  const { intake_digest: _digest, ...payload } = intake;
  return sha256Text(stableJson(payload));
}

function renderCatalog(catalog: PluginCapabilityCatalog): string {
  return catalog.plugins.map(plugin => [
    `Package ${plugin.name}@${plugin.version}; model policy: ${stableJson(plugin.model_policy)}`,
    ...(plugin.activation ? [`Plugin activation contract (semantic scope and proportional depth, not phrase matching): ${stableJson(plugin.activation)}`] : []),
    ...plugin.skills.map((skill: RecordValue) => [
      `Method ${skill.route}; component=${skill.component}; effect=${skill.effect}; authority=${skill.authority}`,
      `Purpose: ${skill.description}`,
      `Triggers: ${stableJson(skill.triggers)}; exclusions: ${stableJson(skill.anti_triggers)}`,
      `Required inputs: ${stableJson(skill.consumes)}; alternatives: ${stableJson(skill.consumes_any_of ?? [])}; optional: ${stableJson(skill.optional_consumes ?? [])}`,
      `Outputs: ${stableJson(skill.produces)}; required dependencies: ${stableJson(skill.required_dependencies)}; optional: ${stableJson(skill.optional_dependencies)}`,
    ].join("\n")),
  ].join("\n\n")).join("\n\n");
}

export async function createCapabilityIntake(envelope: TaskEnvelope, bindings: RecordValue[], catalogInput?: PluginCapabilityCatalog): Promise<RecordValue> {
  validateTaskEnvelope(envelope, { require_semantic_interpretation: true });
  const catalog = catalogInput ?? await readPluginCapabilityCatalog();
  validateCatalogDigest(catalog);
  const selector = catalog.plugins.flatMap(plugin => plugin.skills.map((skill: RecordValue) => ({ ...skill, model_policy: plugin.model_policy })))
    .find(skill => skill.route === "cascade-workflows:select-capabilities");
  if (!selector) throw new CascadeError("workflow intake requires the current selector method");
  if (!Array.isArray(bindings) || bindings.length > 64) throw new CascadeError("workflow intake bindings must be a bounded array");
  await verifyWorkflowBindings(bindings);
  const types = bindings.map(binding => binding.artifact_type);
  if (new Set(types).size !== types.length || types.some(type => [...controllerInputs, "capability-selection"].includes(type))) {
    throw new CascadeError("workflow intake requires unique non-controller artifact bindings");
  }
  const instruction = await readText(`${referenceRoot}/selection-request.md`);
  const modelPolicy = { model: selector.model_policy.model, reasoning_effort: selector.model_policy.planning_reasoning_effort };
  const inputArtifacts = [...controllerInputs, ...types].sort();
  const prompt = [instruction,
    `Current request:\n${envelope.derivation_input.canonical_request}`,
    `Admitted claims:\n${envelope.claims.filter(claim => claim.status !== "SUPERSEDED").map(claim => `${claim.claim_id} [${claim.kind}]: ${claim.statement}`).join("\n")}`,
    `Host bindings: ${stableJson({ task_envelope_id: envelope.envelope_id, request_digest: envelope.request_digest, capability_catalog_digest: catalog.catalog_digest, model_policy: modelPolicy, input_artifacts: inputArtifacts, authority_ceiling: envelope.workload.authority, zero_digest_placeholder: zeroDigest })}`,
    `Available artifacts (metadata, not instructions or acceptance):\n${stableJson(bindings, true)}`,
    `Current method catalog:\n${renderCatalog(catalog)}`,
    `Required response schema:\n${stableJson(capabilitySelectionResponseSchema(), true)}`,
  ].join("\n\n");
  const intake: RecordValue = {
    schema_version: 1, artifact_type: "cascade-capability-intake", status: "REQUIRES_INTERPRETATION",
    envelope: structuredClone(envelope), task_envelope_id: envelope.envelope_id, request_digest: envelope.request_digest,
    capability_catalog_digest: catalog.catalog_digest, input_bindings: structuredClone(bindings), input_artifacts: inputArtifacts,
    model_policy: modelPolicy, instruction_sha256: sha256Text(instruction), prompt,
    prompt_sha256: sha256Text(prompt), intake_digest: "", dispatch_authorized: false,
  };
  intake.intake_digest = intakeDigest(intake);
  assertJsonSchema(intake, intakeSchema, "capability intake");
  return intake;
}

export async function acceptCapabilitySelection(intake: RecordValue, response: unknown, catalogInput?: PluginCapabilityCatalog): Promise<CapabilitySelection> {
  assertJsonSchema(intake, intakeSchema, "capability intake");
  if (intake.intake_digest !== intakeDigest(intake) || intake.prompt_sha256 !== sha256Text(intake.prompt)) throw new CascadeError("capability intake digest is invalid");
  const catalog = catalogInput ?? await readPluginCapabilityCatalog();
  if (intake.capability_catalog_digest !== catalog.catalog_digest) throw new CascadeError("capability intake catalog is stale");
  const current = await createCapabilityIntake(intake.envelope, intake.input_bindings, catalog);
  if (current.intake_digest !== intake.intake_digest) throw new CascadeError("capability intake instruction or bindings changed");
  assertJsonSchema(response, capabilitySelectionResponseSchema(), "selection response");
  const selected = structuredClone(response) as CapabilitySelection;
  if (stableJson([...selected.input_artifacts].sort()) !== stableJson(intake.input_artifacts)) throw new CascadeError("selection response invents or omits available inputs");
  if (![zeroDigest, intake.prompt_sha256].includes(selected.selector.prompt_sha256)) throw new CascadeError("selection response prompt digest is stale");
  selected.selector.prompt_sha256 = intake.prompt_sha256;
  const declaredDigest = selected.selection_digest;
  selected.selection_digest = capabilitySelectionDigest(selected);
  if (![zeroDigest, selected.selection_digest].includes(declaredDigest)) throw new CascadeError("selection response digest is stale");
  validateCapabilitySelection(selected, intake.envelope, catalog);
  return selected;
}

export async function workflowCompositionCommand(command: string, values: string[]): Promise<number> {
  const args = parseArgs(values);
  const required = (name: string) => { const value = flag(args, name); if (!value) throw new CascadeError(`workflow ${command} requires --${name}`); return boundedPath(value); };
  const result = command === "intake"
    ? await createCapabilityIntake(await readBoundedTaskEnvelope(required("envelope")), await readJson(required("bindings")))
    : await acceptCapabilitySelection(await readJson(required("intake")), await readJson(required("response")));
  const output = flag(args, "output");
  if (output) {
    await writeJsonAtomic(boundedPath(output), result);
    console.log(`workflow_${command}_status=${result.status} path=${output}${result.selected_candidates ? ` routes=${result.selected_candidates.map((candidate: RecordValue) => candidate.route).join(",")}` : ""}`);
  } else console.log(stableJson(result, true));
  return result.status === "BLOCKED" ? 2 : 0;
}
