import { mkdir, mkdtemp, readdir, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { relative, resolve, sep } from "node:path";

import {
  CascadeError,
  assertJsonSchema,
  boundedPath,
  isFile,
  readBoundedRegularFile,
  readJson,
  rootPath,
  runCommand,
  stableJson,
  valueDigest,
  walkFiles,
  writeJsonAtomic,
  writeJsonExclusive,
  writeTextExclusive,
} from "../../common";
import { parseStrictYaml } from "../../structured-data";
import {
  type PolicyDecision,
  type SecretResolutionContext,
  type SecretResolver,
  type TaskAdapter,
  type TaskAdapterContext,
  type TaskAdapterEvent,
  type TaskAdapterResult,
  type TaskCleanupResult,
  type TaskCommandResult,
  type TaskHttpResult,
  type TaskRecoveryResult,
} from "../task-adapter";
import {
  cascadeHarnessCodexCommand,
  gradeCascadeHarnessTrace,
  resolveCascadeHarnessProfile,
  type ResolvedCascadeHarnessProfile,
} from "../../evals";
import {
  consumePolicyBudget,
  consumePolicyOutputBudget,
} from "../../campaign-policies";
import { applyFakeActionAuthority } from "../../evaluation-authority";
import {
  assertSafeSimulationAction,
  type BrowserAction,
  type DesktopAction,
  type DriverType,
  type HttpRequestDefinition,
  type HttpRequestValue,
  type SimulationAction,
  type TaskDefinition,
  type TerminalStep,
  taskPolicyActions,
} from "../../simulation-definitions";

function agentInvocationAction(task: TaskDefinition): SimulationAction {
  const action = taskPolicyActions(task)[0];
  if (!action || action.type !== "agent-invoke") {
    throw new CascadeError(`agent task ${task.id} lacks an invocation action`);
  }
  return action;
}

async function readAgentFixtureSource(
  file: string,
  label: string,
  maxBytes: number,
): Promise<Buffer> {
  return readBoundedRegularFile(
    boundedPath(file, "product-evals/tasks/agent-response/"),
    label,
    { maxBytes },
  );
}

export const agentFixtureTaskAdapter: TaskAdapter = {
  id: "builtin-agent-fixture",
  version: "1.0.0",
  driver: "agent-runtime",
  capabilities: [
    "source-blind-input",
    "provider-neutral-result",
    "per-claim-evidence",
    "read-only",
    "network-deny",
  ],
  async preflight(context) {
    const agent = context.task.agent;
    if (!agent) {
      return { status: "BLOCKED", reason: "agent task contract is missing" };
    }
    if (agent.runtime.provider !== "fixture") {
      return {
        status: "BLOCKED",
        reason: `unsupported agent runtime provider: ${agent.runtime.provider}`,
      };
    }
    if (agent.target.mode !== "explicit-instructions") {
      return {
        status: "BLOCKED",
        reason: `fixture adapter cannot prove target mode: ${agent.target.mode}`,
      };
    }
    for (const file of context.task.inputs ?? []) {
      if (!(await isFile(boundedPath(file, "product-evals/tasks/agent-response/")))) {
        return { status: "BLOCKED", reason: `agent source is unavailable: ${file}` };
      }
    }
    const promptSources = [
      agent.target.instruction_file!,
      agent.prompt_file,
      agent.input_file,
    ];
    for (const file of promptSources) {
      const text = (await readAgentFixtureSource(
        file,
        `agent prompt source ${file}`,
        64 * 1024,
      )).toString("utf8");
      if (/(?:GOLDEN_EXPECTATION|EXPECTED_ANSWER|PRIOR_RUN_RESULT)/.test(text)) {
        return {
          status: "BLOCKED",
          reason: `agent prompt source contains prohibited evaluation leakage: ${file}`,
        };
      }
    }
    return { status: "READY", reason: null };
  },
  async execute(context): Promise<TaskAdapterResult> {
    const agent = context.task.agent!;
    const action = agentInvocationAction(context.task);
    const decision = context.authorize_action({
      action_index: 0,
      action,
      projected_output_bytes: 0,
    });
    const before = { phase: "ready" };
    if (decision.decision !== "ALLOW") {
      return {
        outcome: decision.decision === "DENY" ? "FAILED" : "BLOCKED",
        earliest_failure: decision.reason,
        side_effects: "NONE",
        policy_decisions: [decision],
        events: [{
          event_type: "ACTION",
          index: 0,
          type: action.type,
          before,
          after: before,
          status: decision.decision === "DENY" ? "FAIL" : "BLOCKED",
          reason: decision.reason,
          policy_decision: decision.decision,
        }],
      };
    }
    consumePolicyBudget(decision, context.budget_usage);
    await context.record_action_dispatch(decision);
    const responseFile = agent.runtime.fixture_response_file!;
    const responseBytes = await readAgentFixtureSource(
      responseFile,
      `agent fixture response ${responseFile}`,
      agent.budgets.max_output_bytes,
    );
    let response: unknown;
    try {
      response = parseStrictYaml(
        responseBytes.toString("utf8"),
        `agent fixture response ${responseFile}`,
      );
      const outputSchema = await readJson<Record<string, unknown>>(
        boundedPath(
          agent.output_schema_file,
          "product-evals/tasks/agent-response/",
        ),
      );
      assertJsonSchema(response, outputSchema, `agent response ${context.task.id}`);
      const record = response as Record<string, unknown>;
      const claims = record.material_claims as Array<Record<string, unknown>>;
      if (
        !claims.length ||
        new Set(claims.map((claim) => claim.id)).size !== claims.length ||
        claims.some(
          (claim) =>
            !Array.isArray(claim.evidence_refs) ||
            !claim.evidence_refs.length ||
            claim.evidence_refs.some(
              (reference) => !new Set(["instruction", "input"]).has(String(reference)),
            ),
        )
      ) {
        throw new CascadeError("agent material claims lack unique source evidence");
      }
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      return {
        outcome: "FAILED",
        earliest_failure: reason,
        side_effects: "NONE",
        policy_decisions: [decision],
        events: [{
          event_type: "ACTION",
          index: 0,
          type: action.type,
          before,
          after: { phase: "invalid-response" },
          status: "FAIL",
          reason,
          policy_decision: decision.decision,
        }],
      };
    }
    const normalizedPath = resolve(context.task_root, "agent-response.json");
    await writeJsonExclusive(normalizedPath, response, { fileMode: 0o600 });
    const responseRecord = response as Record<string, unknown>;
    const claims = responseRecord.material_claims as Array<Record<string, unknown>>;
    const responseDigest = valueDigest(response);
    return {
      outcome: "SUCCEEDED",
      earliest_failure: null,
      side_effects: "NONE",
      policy_decisions: [decision],
      events: [{
        event_type: "ACTION",
        index: 0,
        type: action.type,
        before,
        after: { phase: "responded", response_digest: responseDigest },
        status: "PASS",
        reason: null,
        policy_decision: decision.decision,
      }],
      final_state: {
        agent: {
          contract_status: "VALID",
          runtime_provider: agent.runtime.provider,
          target_mode: agent.target.mode,
          response_digest: responseDigest,
          response,
          material_claim_count: claims.length,
          next_route_status: responseRecord.next_route === null
            ? "NONE"
            : "PROPOSED",
          permissions: agent.permissions,
        },
      },
      observations: [{
        type: "agent-response",
        surface: {
          kind: "agent-response",
          session_id: `${context.run_id}:agent-runtime:${context.task.id}`,
          surface_id: `task:${context.task.id}`,
          screen_id: "final-response",
        },
        payload: {
          response_digest: responseDigest,
          material_claim_ids: claims.map((claim) => claim.id),
          next_route_status: responseRecord.next_route === null
            ? "NONE"
            : "PROPOSED",
        },
      }],
      produced_evidence: [normalizedPath],
    };
  },
  async cleanup() {
    return {
      status: "VERIFIED",
      attempted: true,
      verified: true,
      residual_resources: [],
      reason: "fixture agent read only source-bound inputs and retained normalized output",
    };
  },
};

async function validateAgentResponseValue(
  response: unknown,
  agent: NonNullable<TaskDefinition["agent"]>,
  label: string,
): Promise<{
  record: Record<string, unknown>;
  claims: Array<Record<string, unknown>>;
}> {
  const outputSchema = await readJson<Record<string, unknown>>(
    boundedPath(
      agent.output_schema_file,
      "product-evals/tasks/agent-response/",
    ),
  );
  assertJsonSchema(response, outputSchema, label);
  const record = response as Record<string, unknown>;
  const claims = record.material_claims as Array<Record<string, unknown>>;
  if (
    !claims.length ||
    new Set(claims.map((claim) => claim.id)).size !== claims.length ||
    claims.some(
      (claim) =>
        !Array.isArray(claim.evidence_refs) ||
        !claim.evidence_refs.length ||
        claim.evidence_refs.some(
          (reference) => !new Set(["instruction", "input"]).has(String(reference)),
        ),
    )
  ) {
    throw new CascadeError("agent material claims lack unique source evidence");
  }
  return { record, claims };
}

function agentActionFailure(
  action: SimulationAction,
  decision: PolicyDecision,
  reason: string,
): TaskAdapterResult {
  const policyStopped = decision.decision !== "ALLOW";
  const blocked =
    decision.decision === "REQUIRE_CONFIRMATION" ||
    decision.decision === "BLOCKED";
  return {
    outcome: blocked ? "BLOCKED" : "FAILED",
    earliest_failure: reason,
    side_effects: "NONE",
    policy_decisions: [decision],
    events: [{
      event_type: "ACTION",
      index: 0,
      type: action.type,
      before: { phase: "ready" },
      after: policyStopped
        ? { phase: "policy-stop" }
        : { phase: "invalid-response" },
      status: blocked ? "BLOCKED" : "FAIL",
      reason,
      policy_decision: decision.decision,
    }],
  };
}

export const agentCodexTaskAdapter: TaskAdapter = {
  id: "builtin-agent-codex",
  version: "1.0.0",
  driver: "agent-runtime",
  capabilities: [
    "codex-exec-jsonl",
    "ephemeral-session",
    "structured-output",
    "source-blind-input",
    "read-only",
    "network-deny",
  ],
  async preflight(context) {
    const agent = context.task.agent;
    if (!agent || agent.runtime.provider !== "codex") {
      return { status: "BLOCKED", reason: "Codex agent task contract is missing" };
    }
    if (agent.target.mode !== "explicit-instructions") {
      return {
        status: "BLOCKED",
        reason: `Codex target mode lacks a proven invocation identity seam: ${agent.target.mode}`,
      };
    }
    if (agent.permissions.tools.length > 0) {
      return {
        status: "BLOCKED",
        reason: "standalone Codex canary does not authorize composed tools",
      };
    }
    const version = await runCommand(["codex", "--version"], {
      timeoutMs: 5_000,
      maxOutputBytes: 4_096,
      unsetEnv: context.child_env_omit,
      env: { NO_COLOR: "1", TERM: "xterm-256color" },
    });
    if (version.exitCode !== 0 || version.timedOut || !version.stdout.trim()) {
      return { status: "BLOCKED", reason: "Codex CLI is unavailable" };
    }
    return { status: "READY", reason: null };
  },
  async execute(context): Promise<TaskAdapterResult> {
    const agent = context.task.agent!;
    const action = agentInvocationAction(context.task);
    const decision = context.authorize_action({
      action_index: 0,
      action,
      projected_output_bytes: 0,
    });
    if (decision.decision !== "ALLOW") {
      return agentActionFailure(action, decision, decision.reason);
    }
    consumePolicyBudget(decision, context.budget_usage);
    await context.record_action_dispatch(decision);
    const instruction = (await readAgentFixtureSource(
      agent.target.instruction_file!,
      "Codex agent instructions",
      64 * 1024,
    )).toString("utf8");
    const promptSource = (await readAgentFixtureSource(
      agent.prompt_file,
      "Codex agent prompt",
      64 * 1024,
    )).toString("utf8");
    const inputSource = (await readAgentFixtureSource(
      agent.input_file,
      "Codex agent input",
      64 * 1024,
    )).toString("utf8");
    if (/(?:GOLDEN_EXPECTATION|EXPECTED_ANSWER|PRIOR_RUN_RESULT)/.test(
      `${instruction}\n${promptSource}\n${inputSource}`,
    )) {
      return agentActionFailure(
        action,
        decision,
        "Codex prompt package contains prohibited evaluation leakage",
      );
    }
    await mkdir(context.task_root, { recursive: true, mode: 0o700 });
    const workspace = await mkdtemp(resolve(context.task_root, "codex-workspace-"));
    const outputSchemaPath = resolve(workspace, "output.schema.json");
    const tracePath = resolve(context.task_root, "codex-trace.jsonl");
    const stderrPath = resolve(context.task_root, "codex-stderr.log");
    const commandPath = resolve(context.task_root, "codex-command.json");
    const normalizedPath = resolve(context.task_root, "agent-response.json");
    const schemaBytes = await readAgentFixtureSource(
      agent.output_schema_file,
      "Codex output schema",
      64 * 1024,
    );
    await writeTextExclusive(outputSchemaPath, schemaBytes.toString("utf8"), {
      fileMode: 0o600,
    });
    const prompt = [
      instruction,
      "",
      "Task:",
      promptSource,
      "",
      "Input:",
      inputSource,
      "",
      "Return only the JSON object required by the output schema.",
    ].join("\n");
    const command = [
      "codex",
      "exec",
      "--ephemeral",
      "--ignore-user-config",
      "--ignore-rules",
      "--json",
      "--disable", "plugins",
      "--disable", "apps",
      "--disable", "browser_use",
      "--disable", "computer_use",
      "--disable", "image_generation",
      "--disable", "code_mode_host",
      "-m", agent.runtime.model!,
      "-c", `model_reasoning_effort="${agent.runtime.reasoning_effort}"`,
      "-s", "read-only",
      "-C", workspace,
      "--skip-git-repo-check",
      "--output-schema", outputSchemaPath,
      prompt,
    ];
    await writeJsonExclusive(commandPath, {
      argv: [...command.slice(0, -1), "<source-bound-prompt-package>"],
      sandbox: "read-only",
      approval_mode: "non-interactive",
      ephemeral: true,
      ignored_user_config: true,
      disabled_capabilities: [
        "plugins", "apps", "browser_use", "computer_use", "image_generation", "code_mode_host",
      ],
    }, { fileMode: 0o600 });
    let execution;
    try {
      execution = await runCommand(command, {
        cwd: workspace,
        timeoutMs: context.task.timeout_ms,
        maxOutputBytes: 2 * 1024 * 1024,
        signal: context.signal,
        unsetEnv: context.child_env_omit,
        env: { NO_COLOR: "1", TERM: "xterm-256color" },
      });
    } finally {
      await rm(workspace, { recursive: true, force: true });
    }
    await writeTextExclusive(tracePath, execution.stdout, { fileMode: 0o600 });
    await writeTextExclusive(stderrPath, execution.stderr, { fileMode: 0o600 });
    if (execution.exitCode !== 0 || execution.timedOut || execution.aborted) {
      return {
        ...agentActionFailure(
          action,
          decision,
          execution.timedOut
            ? "Codex agent timed out"
            : execution.stderr.trim() || `Codex agent exited ${execution.exitCode}`,
        ),
        produced_evidence: [tracePath, stderrPath, commandPath],
      };
    }
    let response: unknown;
    let usage: Record<string, number> | null = null;
    let responseRecord: Record<string, unknown>;
    let claims: Array<Record<string, unknown>>;
    try {
      const parsed = parseCodexJsonl(execution.stdout);
      response = parsed.output;
      usage = parsed.usage;
      ({ record: responseRecord, claims } = await validateAgentResponseValue(
        response,
        agent,
        `Codex agent response ${context.task.id}`,
      ));
    } catch (error) {
      return {
        ...agentActionFailure(
          action,
          decision,
          error instanceof Error ? error.message : String(error),
        ),
        produced_evidence: [tracePath, stderrPath, commandPath],
      };
    }
    await writeJsonExclusive(normalizedPath, response, { fileMode: 0o600 });
    const responseDigest = valueDigest(response);
    return {
      outcome: "SUCCEEDED",
      earliest_failure: null,
      side_effects: "NONE",
      policy_decisions: [decision],
      events: [{
        event_type: "ACTION",
        index: 0,
        type: action.type,
        before: { phase: "ready" },
        after: { phase: "responded", response_digest: responseDigest },
        status: "PASS",
        reason: null,
        policy_decision: decision.decision,
      }],
      final_state: {
        agent: {
          contract_status: "VALID",
          runtime_provider: "codex",
          runtime_model: agent.runtime.model,
          reasoning_effort: agent.runtime.reasoning_effort,
          target_mode: agent.target.mode,
          response_digest: responseDigest,
          response,
          material_claim_count: claims.length,
          next_route_status: responseRecord.next_route === null ? "NONE" : "PROPOSED",
          permissions: agent.permissions,
          usage,
        },
      },
      observations: [{
        type: "agent-response",
        surface: {
          kind: "agent-response",
          session_id: `${context.run_id}:agent-runtime:${context.task.id}`,
          surface_id: `task:${context.task.id}`,
          screen_id: "final-response",
        },
        payload: {
          response_digest: responseDigest,
          material_claim_ids: claims.map((claim) => claim.id),
          next_route_status: responseRecord.next_route === null ? "NONE" : "PROPOSED",
          usage,
        },
      }],
      produced_evidence: [normalizedPath, tracePath, stderrPath, commandPath],
    };
  },
  async recover(context) {
    const entries = await readdir(context.task_root, { withFileTypes: true }).catch(() => []);
    for (const entry of entries) {
      if (entry.isDirectory() && entry.name.startsWith("codex-workspace-")) {
        await rm(resolve(context.task_root, entry.name), {
          recursive: true,
          force: true,
        });
      }
    }
    return {
      status: "RECOVERED",
      attempted: true,
      reason: "removed any owned ephemeral Codex workspace without retrying the invocation",
    };
  },
  async cleanup() {
    return {
      status: "VERIFIED",
      attempted: true,
      verified: true,
      residual_resources: [],
      reason: "ephemeral Codex workspace was removed and only bounded evidence was retained",
    };
  },
};

async function resolveAgentCascadeProfile(
  task: TaskDefinition,
): Promise<ResolvedCascadeHarnessProfile> {
  const agent = task.agent;
  if (!agent || agent.target.mode !== "cascade-profile") {
    throw new CascadeError("Cascade profile agent task contract is missing");
  }
  if (agent.output_schema_file !== "harness-evals/response.schema.json") {
    throw new CascadeError("Cascade profile must use the canonical harness response schema");
  }
  return resolveCascadeHarnessProfile({
    profile_file: boundedPath(
      agent.target.profile_file!,
      "product-evals/tasks/agent-response/",
    ),
    prompt_file: boundedPath(
      agent.prompt_file,
      "product-evals/tasks/agent-response/",
    ),
    input_file: boundedPath(
      agent.input_file,
      "product-evals/tasks/agent-response/",
    ),
    output_schema_file: rootPath(agent.output_schema_file),
  });
}

export const agentCascadeTaskAdapter: TaskAdapter = {
  id: "builtin-agent-cascade",
  version: "1.0.0",
  driver: "agent-runtime",
  capabilities: [
    "current-scenario-binding",
    "codex-exec-jsonl",
    "deterministic-hard-gates",
    "harness-coverage-identity",
    "source-blind-input",
    "read-only",
    "network-deny",
  ],
  async preflight(context) {
    const agent = context.task.agent;
    if (
      !agent ||
      agent.runtime.provider !== "codex" ||
      agent.target.mode !== "cascade-profile" ||
      agent.evaluation_profile !== "cascade-route-and-trace-v1"
    ) {
      return { status: "BLOCKED", reason: "Cascade profile agent task contract is missing" };
    }
    if (agent.permissions.tools.length > 0) {
      return {
        status: "BLOCKED",
        reason: "Cascade profile canary does not authorize composed tools",
      };
    }
    try {
      await resolveAgentCascadeProfile(context.task);
    } catch (error) {
      return {
        status: "BLOCKED",
        reason: error instanceof Error ? error.message : String(error),
      };
    }
    const version = await runCommand(["codex", "--version"], {
      timeoutMs: 5_000,
      maxOutputBytes: 4_096,
      unsetEnv: context.child_env_omit,
      env: { NO_COLOR: "1", TERM: "xterm-256color" },
    });
    if (version.exitCode !== 0 || version.timedOut || !version.stdout.trim()) {
      return { status: "BLOCKED", reason: "Codex CLI is unavailable" };
    }
    return { status: "READY", reason: null };
  },
  async execute(context): Promise<TaskAdapterResult> {
    const agent = context.task.agent!;
    const action = agentInvocationAction(context.task);
    const decision = context.authorize_action({
      action_index: 0,
      action,
      projected_output_bytes: 0,
    });
    if (decision.decision !== "ALLOW") {
      return agentActionFailure(action, decision, decision.reason);
    }
    consumePolicyBudget(decision, context.budget_usage);
    await context.record_action_dispatch(decision);
    const resolvedProfile = await resolveAgentCascadeProfile(context.task);
    await mkdir(context.task_root, { recursive: true, mode: 0o700 });
    const tracePath = resolve(context.task_root, "codex-trace.jsonl");
    const stderrPath = resolve(context.task_root, "codex-stderr.log");
    const commandPath = resolve(context.task_root, "codex-command.json");
    const profilePath = resolve(context.task_root, "cascade-profile.json");
    const scenarioPath = resolve(context.task_root, "selected-scenario.json");
    const sourceManifestPath = resolve(context.task_root, "harness-source-manifest.json");
    const normalizedPath = resolve(context.task_root, "normalized.json");
    const eligibilityPath = resolve(context.task_root, "eligibility.json");
    const command = cascadeHarnessCodexCommand(
      resolvedProfile,
      agent.runtime.model!,
      agent.runtime.reasoning_effort!,
    );
    await writeJsonExclusive(commandPath, {
      argv: [...command.slice(0, -1), "<current-source-bound-harness-prompt>"],
      sandbox: "read-only",
      approval_mode: "non-interactive",
      ephemeral: true,
      scenario_id: resolvedProfile.scenario.id,
      catalog_digest: resolvedProfile.catalog_digest,
      harness_source_digest: resolvedProfile.harness_source_manifest.digest,
    }, { fileMode: 0o600 });
    const execution = await runCommand(command, {
      cwd: rootPath(),
      timeoutMs: context.task.timeout_ms,
      maxOutputBytes: 2 * 1024 * 1024,
      signal: context.signal,
      unsetEnv: context.child_env_omit,
      env: { NO_COLOR: "1", TERM: "xterm-256color" },
    });
    await Promise.all([
      writeTextExclusive(tracePath, execution.stdout, { fileMode: 0o600 }),
      writeTextExclusive(stderrPath, execution.stderr, { fileMode: 0o600 }),
      writeJsonExclusive(profilePath, resolvedProfile.profile, { fileMode: 0o600 }),
      writeJsonExclusive(scenarioPath, resolvedProfile.scenario, { fileMode: 0o600 }),
      writeJsonExclusive(sourceManifestPath, resolvedProfile.harness_source_manifest, { fileMode: 0o600 }),
    ]);
    const graded = await gradeCascadeHarnessTrace(resolvedProfile, {
      stdout: execution.stdout,
      stderr: execution.stderr,
      exit_code: execution.exitCode,
      duration_ms: execution.durationMs,
      timed_out: execution.timedOut,
    });
    const toolCalls =
      (graded.trace.commands?.length ?? 0) +
      (graded.trace.tool_actions?.length ?? 0);
    const outputBytes = Buffer.byteLength(String(graded.trace.final_text ?? ""), "utf8");
    const outputTokens = Number(
      graded.trace.usage?.output_tokens ??
      graded.trace.usage?.outputTokens ??
      0,
    );
    const budgetFailures = [
      ...(toolCalls > agent.budgets.max_tool_calls ? ["tool-call-budget"] : []),
      ...(outputBytes > agent.budgets.max_output_bytes ? ["output-byte-budget"] : []),
      ...(outputTokens > agent.budgets.max_tokens ? ["output-token-budget"] : []),
    ];
    const eligibility = budgetFailures.length
      ? {
          ...graded.eligibility,
          verdict: "FAIL",
          failure_class: "target-behavior",
          hard_failures: [
            ...new Set([
              ...(graded.eligibility.hard_failures ?? []),
              ...budgetFailures,
            ]),
          ],
          checks: [
            ...(graded.eligibility.checks ?? []),
            {
              name: "agent-task-budget",
              passed: false,
              hard_gate: true,
              evidence: {
                tool_calls: toolCalls,
                max_tool_calls: agent.budgets.max_tool_calls,
                output_bytes: outputBytes,
                max_output_bytes: agent.budgets.max_output_bytes,
                output_tokens: outputTokens,
                max_tokens: agent.budgets.max_tokens,
              },
            },
          ],
        }
      : graded.eligibility;
    await Promise.all([
      writeJsonExclusive(normalizedPath, graded.trace, { fileMode: 0o600 }),
      writeJsonExclusive(eligibilityPath, eligibility, { fileMode: 0o600 }),
    ]);
    const passed = eligibility.verdict === "PASS";
    const blocked = eligibility.verdict === "BLOCKED";
    const response = graded.trace.final_response;
    const evidence = [
      tracePath,
      stderrPath,
      commandPath,
      profilePath,
      scenarioPath,
      sourceManifestPath,
      normalizedPath,
      eligibilityPath,
    ];
    return {
      outcome: passed ? "SUCCEEDED" : blocked ? "BLOCKED" : "FAILED",
      earliest_failure: passed
        ? null
        : String(eligibility.hard_failures?.[0] ?? "Cascade harness eligibility failed"),
      side_effects: "NONE",
      policy_decisions: [decision],
      events: [{
        event_type: "ACTION",
        index: 0,
        type: action.type,
        before: { phase: "ready" },
        after: {
          phase: passed ? "eligible" : "ineligible",
          scenario_id: resolvedProfile.scenario.id,
          eligibility: eligibility.verdict,
        },
        status: passed ? "PASS" : blocked ? "BLOCKED" : "FAIL",
        reason: passed ? null : String(eligibility.hard_failures?.[0] ?? "eligibility failed"),
        policy_decision: decision.decision,
      }],
      final_state: {
        agent: {
          contract_status: passed ? "VALID" : "INVALID",
          runtime_provider: "codex",
          runtime_model: agent.runtime.model,
          reasoning_effort: agent.runtime.reasoning_effort,
          target_mode: "cascade-profile",
          evaluation_profile: agent.evaluation_profile,
          profile_id: resolvedProfile.profile.id,
          scenario_id: resolvedProfile.scenario.id,
          scenario_digest: resolvedProfile.profile.scenario_digest,
          catalog_digest: resolvedProfile.catalog_digest,
          harness_source_digest: resolvedProfile.harness_source_manifest.digest,
          response_digest: response ? valueDigest(response) : null,
          response,
          eligibility,
          coverage_status: passed ? "CANDIDATE" : "REJECTED",
          semantic_judgment_status: "NOT_RUN",
          permissions: agent.permissions,
          usage: graded.trace.usage,
        },
      },
      observations: [{
        type: "agent-response",
        surface: {
          kind: "agent-response",
          session_id: `${context.run_id}:agent-runtime:${context.task.id}`,
          surface_id: `task:${context.task.id}`,
          screen_id: "normalized-trace",
        },
        payload: {
          scenario_id: resolvedProfile.scenario.id,
          scenario_digest: resolvedProfile.profile.scenario_digest,
          eligibility: eligibility.verdict,
          hard_failures: eligibility.hard_failures,
        },
      }],
      produced_evidence: evidence,
    };
  },
  async recover() {
    return {
      status: "UNSUPPORTED",
      attempted: false,
      reason: "an interrupted Cascade Codex target cannot be replayed without a new campaign run",
    };
  },
  async cleanup() {
    return {
      status: "VERIFIED",
      attempted: true,
      verified: true,
      residual_resources: [],
      reason: "the Cascade target used the repository read-only and retained only bounded evidence",
    };
  },
};
