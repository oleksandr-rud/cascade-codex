#!/usr/bin/env node

import { snapshotSubject } from "./evaluation-integrity.mjs";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";
import { resolveInstalledSkill, resolveSubjectSkill } from "./subject-plugin.mjs";

const skillRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const evalRoot = join(skillRoot, "evals");
const subjectPathIndex = process.argv.indexOf("--subject-skill-root");
const subjectSkillRoot = await resolveSubjectSkill({ explicitPath: subjectPathIndex >= 0 ? process.argv[subjectPathIndex + 1] : undefined });
const failures = [];

function check(condition, message) {
  if (!condition) failures.push(message);
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function readYaml(path) {
  return parseYaml(await readFile(path, "utf8"), { uniqueKeys: true });
}

async function readModelRegistry(root) {
  try {
    return await readYaml(join(root, "references/model-system/model-registry.yaml"));
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
    return readJson(join(root, "references/model-system/model-registry.json"));
  }
}

async function readable(path, label) {
  try {
    return await readFile(path, "utf8");
  } catch {
    failures.push(`missing ${label}: ${path}`);
    return "";
  }
}

async function absent(path, label) {
  try {
    await readFile(path);
    failures.push(`${label} must be absent: ${path}`);
  } catch {
    // Absence proves the ownership boundary.
  }
}

const catalog = await readJson(join(evalRoot, "task-catalog.json"));
const matrix = await readJson(join(evalRoot, "model-matrix.json"));
const registry = await readModelRegistry(subjectSkillRoot);
const outcome = await readJson(join(evalRoot, "judges/outcome-v3.json"));
const trajectory = await readJson(join(evalRoot, "judges/trajectory-v3.json"));
const interviewProfile = await readJson(join(evalRoot, "judges/interview-v3.json"));
const interviewCatalog = await readJson(join(evalRoot, "interviews/catalog.json"));
const responseSchema = await readJson(join(evalRoot, "judges/response-v3.schema.json"));
const calibration = await readJson(join(evalRoot, "judges/calibration-cases.json"));
const humanLabelSchema = await readJson(join(evalRoot, "judges/human-labels.schema.json"));
const humanLabelTemplate = await readJson(join(evalRoot, "judges/human-labels.template.json"));
const tokenBudgets = await readJson(join(evalRoot, "token-budgets.json"));

check(catalog.schema_version === 2, "task catalog schema_version must be 2");
check(matrix.schema_version === 1, "model matrix schema_version must be 1");
check(matrix.defaults?.prompt_model === "gpt-5.6-sol", "default prompt model must be gpt-5.6-sol");
check(matrix.defaults?.target_model === "gpt-5.6-sol", "default target model must be gpt-5.6-sol");
check(matrix.defaults?.judge_model === "gpt-5.6-sol", "default judge model must be gpt-5.6-sol");
check(matrix.defaults?.reasoning_effort === "max", "default reasoning effort must be max");
check(responseSchema.type === "object", "judge response schema must define an object");
check(calibration.calibration_status === "NOT_RUN", "synthetic fixtures must not claim calibration");
check(calibration.human_labeled === false, "synthetic fixtures must not claim human labels");
check(humanLabelSchema.type === "object", "human label schema must define an object");
check(humanLabelTemplate.calibration_status === "NOT_RUN", "empty human label template must remain NOT_RUN");
check(Array.isArray(humanLabelTemplate.reviewers) && humanLabelTemplate.reviewers.length === 0, "human label template must not fabricate reviewers");
check(Array.isArray(humanLabelTemplate.cases) && humanLabelTemplate.cases.length === 0, "human label template must not fabricate cases");
check(tokenBudgets.schema_version === 1, "token budgets schema_version must be 1");
check(tokenBudgets.status === "PROVISIONAL", "v1 token budgets must remain PROVISIONAL");
check(interviewCatalog.schema_version === 1, "interview catalog schema_version must be 1");
const campaignSkillText = await readable(join(skillRoot, "SKILL.md"), "prompt-evaluation skill");
check(campaignSkillText.includes("local execution") && campaignSkillText.includes("do not require Cascade Simulations"), "prompt-evaluation must declare direct bounded execution");
check(campaignSkillText.includes("subject under test"), "prompt-evaluation skill must preserve subject/runtime ownership");

const allowedTiers = new Set(registry.tier_order ?? []);
const registryModels = new Set((registry.models ?? []).map((model) => model.id));
const allowedDomains = new Set(["operations", "support", "governance", "product", "business", "coding", "context-specific"]);
const allowedContextProfiles = new Set(["single-record", "source-packet", "technical-packet", "product-evidence", "product-idea", "market-evidence", "pricing-evidence", "code-context", "repository-context", "brand-context"]);
const taskIds = new Set();
const coveredTiers = new Set();
const domainCounts = new Map();

for (const task of catalog.tasks ?? []) {
  check(typeof task.id === "string" && task.id.length > 0, "every task needs an id");
  check(!taskIds.has(task.id), `duplicate task id: ${task.id}`);
  taskIds.add(task.id);
  check(Number.isInteger(task.version) && task.version > 0, `${task.id}: version must be a positive integer`);
  check(task.builder_mode === "ONE_SHOT", `${task.id}: builder_mode must be ONE_SHOT`);
  check(typeof task.target_task_contract === "string" && task.target_task_contract.length > 40, `${task.id}: target_task_contract is required`);
  check(["deterministic", "semantic"].includes(task.outcome_evaluation), `${task.id}: invalid outcome_evaluation`);
  check(task.trajectory_evaluation === "once-per-prompt", `${task.id}: trajectory_evaluation must be once-per-prompt`);
  check(allowedTiers.has(task.tier), `${task.id}: unknown tier ${task.tier}`);
  check(allowedDomains.has(task.domain), `${task.id}: unknown domain ${task.domain}`);
  check(allowedContextProfiles.has(task.context_profile), `${task.id}: unknown context_profile ${task.context_profile}`);
  domainCounts.set(task.domain, (domainCounts.get(task.domain) ?? 0) + 1);
  coveredTiers.add(task.tier);
  check(typeof task.input_placeholder === "string" && /^\{\{[A-Z0-9_]+\}\}$/.test(task.input_placeholder ?? ""), `${task.id}: invalid input placeholder`);
  check((task.prompt_build_request ?? "").includes(task.input_placeholder), `${task.id}: builder request must include the input placeholder`);

  const input = await readable(join(evalRoot, task.input_path ?? ""), `${task.id} input`);
  check(input.trim().length > 0, `${task.id}: input cannot be empty`);
  check(!input.includes(task.input_placeholder), `${task.id}: input must not contain its own placeholder`);

  const evaluatorPath = join(evalRoot, task.evaluator_path ?? "");
  const evaluatorText = await readable(evaluatorPath, `${task.id} evaluator`);
  if (!evaluatorText) continue;
  const evaluator = JSON.parse(evaluatorText);
  check(evaluator.schema_version === 1, `${task.id}: evaluator schema_version must be 1`);
  check(["exact_json", "text_contract"].includes(evaluator.mechanical_type), `${task.id}: unknown mechanical_type`);
  check(Array.isArray(evaluator.semantic_anchors?.must_preserve) && evaluator.semantic_anchors.must_preserve.length > 0, `${task.id}: missing must_preserve anchors`);
  check(Array.isArray(evaluator.semantic_anchors?.must_avoid) && evaluator.semantic_anchors.must_avoid.length > 0, `${task.id}: missing must_avoid anchors`);
  if (evaluator.mechanical_type === "exact_json") {
    check(evaluator.expected && typeof evaluator.expected === "object", `${task.id}: exact_json needs expected object`);
    check(Array.isArray(evaluator.exact_keys) && evaluator.exact_keys.length > 0, `${task.id}: exact_json needs exact_keys`);
    check(JSON.stringify(Object.keys(evaluator.expected ?? {}).sort()) === JSON.stringify([...(evaluator.exact_keys ?? [])].sort()), `${task.id}: expected keys must equal exact_keys`);
    check(task.outcome_evaluation === "deterministic", `${task.id}: exact_json tasks must use deterministic outcome evaluation`);
  } else {
    check(Array.isArray(evaluator.required_patterns) && evaluator.required_patterns.length > 0, `${task.id}: text_contract needs required_patterns`);
    check(Array.isArray(evaluator.forbidden_patterns), `${task.id}: text_contract needs forbidden_patterns`);
    if (evaluator.max_words !== undefined) check(Number.isInteger(evaluator.max_words) && evaluator.max_words > 0, `${task.id}: max_words must be a positive integer`);
    check(task.outcome_evaluation === "semantic", `${task.id}: text_contract tasks must use semantic outcome evaluation`);
  }
}

check(taskIds.size === 14, `task catalog must contain exactly 14 tasks, found ${taskIds.size}`);
check((domainCounts.get("product") ?? 0) >= 3, "task catalog must contain at least three product tasks");
check((domainCounts.get("business") ?? 0) >= 2, "task catalog must contain at least two business tasks");
check((domainCounts.get("coding") ?? 0) >= 2, "task catalog must contain at least two coding tasks");
check((domainCounts.get("context-specific") ?? 0) >= 1, "task catalog must contain at least one context-specific task");

const taskById = new Map((catalog.tasks ?? []).map((task) => [task.id, task]));
check(taskById.get("structured-invoice-v1")?.target_task_contract.includes("Total Due"), "structured invoice contract must define accepted final-total labels");
check(taskById.get("structured-invoice-v1")?.target_task_contract.includes("different amounts"), "structured invoice contract must define conflicting-total behavior");
check(taskById.get("support-triage-v1")?.target_task_contract.includes("classify the underlying operational failure"), "support triage contract must define mixed-case precedence");
check(taskById.get("support-triage-v1")?.target_task_contract.includes("blocking core or time-sensitive work"), "support triage contract must define urgency boundaries");
check(taskById.get("support-triage-v1")?.target_task_contract.includes("automatically force bug"), "support triage contract must preserve the underlying failure category");
check(taskById.get("source-conflict-brief-v1")?.target_task_contract.includes("Approved policy is authoritative"), "source brief contract must define authority");
check(taskById.get("migration-control-plan-v1")?.prompt_build_request.includes("plan only"), "migration builder request must remain planning-only");
check(!taskById.get("migration-control-plan-v1")?.prompt_build_request.includes("planning and executing"), "migration builder request must not authorize execution");
check(taskById.get("product-prioritization-v1")?.target_task_contract.includes("stated segment"), "product prioritization must preserve strategy and segment constraints");
check(taskById.get("onboarding-experiment-v1")?.target_task_contract.includes("privacy constraint"), "onboarding experiment must preserve privacy constraints");
check(taskById.get("code-review-race-v1")?.target_task_contract.includes("pass the existing requestId to gateway.capture"), "code review must bind requestId to gateway idempotency");
check(taskById.get("code-review-race-v1")?.target_task_contract.includes("requestId database unique constraint"), "code review must preserve the database uniqueness contract");
check(taskById.get("api-version-migration-plan-v1")?.prompt_build_request.includes("plan only"), "API migration builder request must remain planning-only");
check(taskById.get("plugin-workflow-plan-v1")?.target_task_contract.includes("cascade-market:brand-positioning"), "plugin workflow task must bind the marketing route");
check(taskById.get("plugin-workflow-plan-v1")?.target_task_contract.includes("validated Cascade Coordinator capability selection"), "plugin workflow task must bind the Coordinator selection");
check(taskById.get("plugin-workflow-plan-v1")?.target_task_contract.includes("dispatch_authorized false"), "plugin workflow task must preserve non-dispatch authority");
check(taskById.get("brand-context-copy-v1")?.target_task_contract.includes("internal pilot"), "brand context task must preserve evidence attribution");
check(taskById.get("business-opportunity-screen-v1")?.target_task_contract.includes("PROCEED_TO_VALIDATION"), "business opportunity task must preserve the bounded verdict vocabulary");
check(taskById.get("business-opportunity-screen-v1")?.target_task_contract.includes("credible problem evidence supports one bounded experiment"), "business opportunity task must define PROCEED_TO_VALIDATION semantics");
check(taskById.get("product-concept-scope-v1")?.target_task_contract.includes("user confirmation before external writes"), "product concept task must preserve confirmation before external writes");
check(taskById.get("pricing-package-experiment-v1")?.target_task_contract.includes("hypotheses, not validated decisions"), "pricing task must preserve hypothesis status");

for (const tier of allowedTiers) {
  check(coveredTiers.has(tier), `task catalog does not cover tier: ${tier}`);
  const budget = tokenBudgets.prompt_builder?.[tier];
  check(Number.isInteger(budget?.max_input_tokens) && budget.max_input_tokens > 0, `${tier}: missing prompt-builder input budget`);
  check(Number.isInteger(budget?.max_noncached_input_tokens) && budget.max_noncached_input_tokens > 0, `${tier}: missing prompt-builder noncached budget`);
  check(Number.isInteger(budget?.max_command_executions) && budget.max_command_executions > 0, `${tier}: missing prompt-builder command budget`);
}
for (const phase of ["target", "judge"]) {
  check(Number.isInteger(tokenBudgets[phase]?.max_input_tokens) && tokenBudgets[phase].max_input_tokens > 0, `${phase}: missing input budget`);
  check(Number.isInteger(tokenBudgets[phase]?.max_noncached_input_tokens) && tokenBudgets[phase].max_noncached_input_tokens > 0, `${phase}: missing noncached budget`);
}
for (const phase of ["first_turn", "answer_turn"]) {
  const budget = tokenBudgets.interview?.[phase];
  check(Number.isInteger(budget?.max_input_tokens) && budget.max_input_tokens > 0, `interview ${phase}: missing input budget`);
  check(Number.isInteger(budget?.max_noncached_input_tokens) && budget.max_noncached_input_tokens > 0, `interview ${phase}: missing noncached budget`);
  check(Number.isInteger(budget?.max_command_executions) && budget.max_command_executions > 0, `interview ${phase}: missing command budget`);
}

const configurationIds = new Set();
const configuredTaskIds = new Set();
for (const configuration of matrix.configurations ?? []) {
  check(typeof configuration.id === "string" && configuration.id.length > 0, "every model configuration needs an id");
  check(!configurationIds.has(configuration.id), `duplicate configuration id: ${configuration.id}`);
  configurationIds.add(configuration.id);
  check(registryModels.has(configuration.prompt_model), `${configuration.id}: prompt_model is absent from model registry`);
  check(registryModels.has(configuration.target_model), `${configuration.id}: target_model is absent from model registry`);
  check(allowedTiers.has(configuration.tier), `${configuration.id}: unknown tier ${configuration.tier}`);
  check(Array.isArray(configuration.tasks) && configuration.tasks.length > 0, `${configuration.id}: tasks cannot be empty`);
  for (const taskId of configuration.tasks ?? []) {
    check(taskIds.has(taskId), `${configuration.id}: unknown task ${taskId}`);
    configuredTaskIds.add(taskId);
  }
  check(["codex-cli", "command-json-v1"].includes(configuration.execution_adapter), `${configuration.id}: unknown execution adapter`);
  if (configuration.execution_adapter === "command-json-v1") {
    check(configuration.availability === "ADAPTER_CONFIG_REQUIRED", `${configuration.id}: external command adapter must require configuration`);
  }
}
for (const taskId of taskIds) check(configuredTaskIds.has(taskId), `no model configuration covers task ${taskId}`);

function validateProfile(profile, expectedId) {
  check(profile.schema_version === 1, `${expectedId}: schema_version must be 1`);
  check(profile.profile_id === expectedId, `unexpected judge profile id: ${profile.profile_id}`);
  const dimensions = profile.dimensions ?? [];
  const ids = dimensions.map((dimension) => dimension.id);
  check(dimensions.length === 5, `${expectedId}: exactly five dimensions required`);
  check(new Set(ids).size === ids.length, `${expectedId}: dimension ids must be unique`);
  check(dimensions.reduce((sum, dimension) => sum + dimension.weight, 0) === 100, `${expectedId}: weights must total 100`);
  check(profile.threshold === 0.8, `${expectedId}: threshold must remain 0.8 for v1`);
  check(profile.minimum_dimension_rating === 3, `${expectedId}: dimension floor must be 3 for v3`);
}

validateProfile(outcome, "cascade-prompt-outcome-v3");
validateProfile(trajectory, "cascade-prompt-trajectory-v3");
validateProfile(interviewProfile, "cascade-prompt-interview-v3");
validateProfile(await readJson(join(evalRoot, "judges/knowledge-coverage-v1.json")), "cascade-prompt-knowledge-coverage-v1");

const allowedStates = new Set(["READY", "NEEDS_INPUT", "BLOCKED"]);
const allowedModes = new Set(["Quick", "Guided", "Advanced"]);
const allowedIntents = new Set(Object.keys(interviewCatalog.intent_patterns ?? {}));
const fixtureIds = new Set();
for (const fixture of interviewCatalog.fixtures ?? []) {
  check(typeof fixture.id === "string" && fixture.id.length > 0, "every interview fixture needs an id");
  check(!fixtureIds.has(fixture.id), `duplicate interview fixture id: ${fixture.id}`);
  fixtureIds.add(fixture.id);
  check(Number.isInteger(fixture.version) && fixture.version > 0, `${fixture.id}: version must be positive`);
  check(allowedTiers.has(fixture.tier), `${fixture.id}: unknown tier ${fixture.tier}`);
  check(allowedModes.has(fixture.expected_mode), `${fixture.id}: unknown expected mode`);
  check(typeof fixture.prompt_build_request === "string" && fixture.prompt_build_request.length > 80, `${fixture.id}: prompt_build_request is too small`);
  for (const [turnName, turn] of [["first_turn", fixture.first_turn], ["second_turn", fixture.second_turn]]) {
    if (!turn) continue;
    check(allowedStates.has(turn.state), `${fixture.id}/${turnName}: invalid state`);
    check(Number.isInteger(turn.min_questions) && turn.min_questions >= 0, `${fixture.id}/${turnName}: invalid min_questions`);
    check(Number.isInteger(turn.max_questions) && turn.max_questions >= turn.min_questions && turn.max_questions <= 3, `${fixture.id}/${turnName}: invalid max_questions`);
    if (turn.state === "NEEDS_INPUT") check(turn.min_questions >= 1, `${fixture.id}/${turnName}: NEEDS_INPUT must ask at least one question`);
    if (turn.state === "READY") check(turn.max_questions === 0, `${fixture.id}/${turnName}: READY must ask zero questions`);
    for (const group of turn.required_response_pattern_groups ?? []) check(Array.isArray(group) && group.length > 0 && group.every(p => typeof p === "string" && p.length > 0), `${fixture.id}/${turnName}: invalid equivalent response markers`);
    for (const intent of [...(turn.required_intents ?? []), ...(turn.forbidden_intents ?? [])]) check(allowedIntents.has(intent), `${fixture.id}/${turnName}: unknown intent ${intent}`);
  }
  check(Boolean(fixture.second_user_message) === Boolean(fixture.second_turn), `${fixture.id}: second_user_message and second_turn must appear together`);
  if (fixture.target) {
    check(/^\{\{[A-Z0-9_]+\}\}$/.test(fixture.target.input_placeholder ?? ""), `${fixture.id}: invalid target placeholder`);
    check(fixture.prompt_build_request.includes(fixture.target.input_placeholder), `${fixture.id}: target placeholder must appear in request`);
    check(typeof fixture.target.input === "string" && fixture.target.input.length > 0, `${fixture.id}: target input is required`);
    check(Array.isArray(fixture.target.required_patterns) && fixture.target.required_patterns.length > 0, `${fixture.id}: target required patterns are required`);
    check(Array.isArray(fixture.target.forbidden_patterns), `${fixture.id}: target forbidden patterns must be an array`);
  }
}
const coverage = JSON.parse(await readFile(join(evalRoot, "rule-coverage.json"), "utf8"));
const coveredCases = new Set(coverage.cases.map(item => item.id));
check(coveredCases.size === coverage.cases.length, "rule coverage case IDs must be unique");
for (const id of [...taskIds, ...fixtureIds]) check(coveredCases.has(id), `missing rule coverage case: ${id}`);
for (const fixture of interviewCatalog.fixtures) {
  for (const path of [...(fixture.judge_context_paths ?? []), ...(fixture.first_turn.required_subject_reads ?? []), ...(fixture.first_turn.forbidden_subject_reads ?? [])]) {
    check(!path.startsWith("/") && !path.includes(".."), `${fixture.id}: unsafe subject path ${path}`);
    await readable(join(subjectSkillRoot, path), `${fixture.id}: declared subject path`);
  }
  check((fixture.rule_ids ?? []).length > 0, `${fixture.id}: rule groups missing`);
}

const allCases = new Map([...catalog.tasks, ...interviewCatalog.fixtures].map(item => [item.id, item]));
const sameSet = (a,b) => JSON.stringify([...new Set(a)].sort()) === JSON.stringify([...new Set(b)].sort());
check(sameSet(coverage.cases.map(c => c.id), [...allCases.keys()]), "coverage contains missing or phantom cases");
check(sameSet(coverage.rule_inventory ?? [], [...allCases.values()].flatMap(c => c.rule_ids ?? [])), "closed rule inventory mismatch");
for (const mapped of coverage.cases) check(sameSet(mapped.rule_ids, allCases.get(mapped.id)?.rule_ids ?? []), `${mapped.id}: rule mapping drift`);
for (const item of allCases.values()) {
  const paths = [...(item.judge_context_paths ?? []), ...(item.required_subject_reads ?? []), ...(item.forbidden_subject_reads ?? []), ...[item.first_turn,item.second_turn].filter(Boolean).flatMap(t => [...(t.required_subject_reads ?? []), ...(t.forbidden_subject_reads ?? [])])];
  for (const path of paths) {
    check(!path.startsWith("/") && !path.includes(".."), `${item.id}: unsafe subject path`);
    await readable(join(subjectSkillRoot,path), `${item.id}: all task/turn paths`);
  }
}
const snapshot = await snapshotSubject(subjectSkillRoot);
const modelIndex = parseYaml(snapshot.files["runtime/model-index.yaml"]);
for (const path of [modelIndex.source, ...modelIndex.models.map(m => m.prompt_adapter).filter(Boolean)]) {
  check(typeof path === "string" && !path.includes("..") && Object.hasOwn(snapshot.files, path), `model index has an unreachable skill-relative source or adapter: ${path}`);
}

const knowledgePaths = Object.keys(snapshot.files).filter(path => /^(references|runtime|assets)\/|^SKILL\.md$/.test(path));
check(sameSet(knowledgePaths, (coverage.knowledge_inventory ?? []).map(item => item.path)), "closed knowledge file inventory mismatch");
for (const item of coverage.knowledge_inventory ?? []) {
  check(snapshot.manifest.find(f => f.path === item.path)?.sha256 === item.sha256, `${item.path}: source rule inventory is stale`);
  check(item.consumers?.length > 0 && item.case_ids?.length > 0, `${item.path}: no operative consumer or case`);
  for (const path of item.consumers ?? []) check(Object.hasOwn(snapshot.files,path), `${item.path}: missing consumer ${path}`);
  for (const id of item.case_ids ?? []) check(item.consumers.some(path => allCases.get(id)?.judge_context_paths?.includes(path)), `${item.path}: case ${id} has no declared consumer`);
}
const routingCases = parseYaml(snapshot.files["references/model-system/routing-cases.yaml"]).cases;
check(sameSet(routingCases.map(c=>c.id),Object.keys(coverage.routing_case_mapping ?? {})), "routing source cases must map exactly");
for (const [id, mapped] of Object.entries(coverage.routing_case_mapping ?? {})) check(mapped.length > 0 && mapped.every(caseId=>allCases.has(caseId)), `${id}: missing routing execution case`);
for (const requiredFixture of ["complete-quick-v1", "missing-structured-schema-v1", "invoice-label-ambiguity-v1", "support-mixed-case-v1", "explicit-source-authority-v1", "migration-permission-v1", "safe-optional-preference-v1", "declined-nonblocking-choice-v1", "declined-hard-authority-v1", "answer-already-in-source-v1", "builder-omission-repair-v1", "new-instruction-invalidation-v1"]) {
  check(fixtureIds.has(requiredFixture), `missing required interview fixture: ${requiredFixture}`);
}
await readable(join(skillRoot, "scripts/run-interview-eval.mjs"), "interview runner");
await readable(join(skillRoot, "scripts/test-interview-runner.mjs"), "interview runner tests");
for (const file of ["execution-adapters.mjs", "legacy-response-evidence.mjs", "judge-results.mjs", "test-judge-results.mjs", "subject-plugin.mjs", "run-variance-eval.mjs", "run-human-calibration.mjs", "test-execution-adapters.mjs", "test-human-calibration.mjs", "test-variance-runner.mjs"]) await readable(join(skillRoot, "scripts", file), file);
await absent(join(subjectSkillRoot, "evals/task-catalog.json"), "subject-owned evaluation catalog");
for (const migratedScript of ["execution-adapters.mjs", "run-quality-eval.mjs", "run-interview-eval.mjs", "run-variance-eval.mjs", "run-human-calibration.mjs"]) await absent(join(subjectSkillRoot, "scripts", migratedScript), `subject-owned ${migratedScript}`);

if (failures.length > 0) {
  console.error(`FAIL: ${failures.length} prompt-quality validation error(s)`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`PASS: ${taskIds.size} real tasks, ${fixtureIds.size} interview fixtures, ${coveredTiers.size} tiers, ${configurationIds.size} model configurations, 4 independent judge profiles`);

await readable(join(skillRoot, "../../scripts/judge-ratings.mjs"), "shared judge scoring");
