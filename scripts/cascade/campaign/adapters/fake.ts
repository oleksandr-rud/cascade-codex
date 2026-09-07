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

function clone<T>(value: T): T {
  return structuredClone(value);
}

export const fakeTaskAdapter: TaskAdapter = {
  id: "builtin-fake",
  version: "1.0.0",
  driver: "fake",
  capabilities: ["deterministic-state", "policy-actions", "cleanup-verified"],
  async preflight() {
    return { status: "READY", reason: null };
  },
  async execute(context): Promise<TaskAdapterResult> {
    const state = clone(context.fixture);
    const policyDecisions: PolicyDecision[] = [];
    const events: TaskAdapterEvent[] = [];
    for (const [index, action] of (context.task.actions ?? []).entries()) {
      if (context.signal?.aborted) {
        return {
          outcome: "CANCELLED",
          earliest_failure: "task cancelled during fake execution",
          side_effects: "NONE",
          policy_decisions: policyDecisions,
          events,
          final_state: clone(state),
        };
      }
      const before = clone(state);
      const policyDecision = context.authorize_action({
        action_index: index,
        action,
        projected_output_bytes: Buffer.byteLength(
          stableJson({ state: before, action }),
        ),
      });
      policyDecisions.push(policyDecision);
      if (policyDecision.decision !== "ALLOW") {
        const status =
          policyDecision.decision === "DENY" ? "FAIL" : "BLOCKED";
        events.push({
          event_type: "ACTION",
          index,
          type: action.type,
          before,
          after: clone(state),
          status,
          reason: policyDecision.reason,
          policy_decision: policyDecision.decision,
        });
        return {
          outcome:
            policyDecision.decision === "DENY" ? "FAILED" : "BLOCKED",
          earliest_failure: policyDecision.reason,
          side_effects: "NONE",
          policy_decisions: policyDecisions,
          events,
          final_state: clone(state),
        };
      }
      consumePolicyBudget(
        policyDecision,
        context.budget_usage,
        Buffer.byteLength(stableJson({ state: before, action })),
      );
      await context.record_action_dispatch(policyDecision);
      const actionResult = applyFakeActionAuthority(state, action);
      events.push({
        event_type: "ACTION",
        index,
        type: action.type,
        before,
        after: clone(state),
        status: actionResult.status,
        reason: actionResult.reason,
        policy_decision: policyDecision.decision,
      });
      if (actionResult.status === "FAIL") {
        return {
          outcome: "FAILED",
          earliest_failure: actionResult.reason,
          side_effects: "NONE",
          policy_decisions: policyDecisions,
          events,
          final_state: clone(state),
        };
      }
    }
    return {
      outcome: "SUCCEEDED",
      earliest_failure: null,
      side_effects: "KNOWN",
      policy_decisions: policyDecisions,
      events,
      final_state: clone(state),
    };
  },
  async recover(): Promise<TaskRecoveryResult> {
    return {
      status: "RECOVERED",
      attempted: true,
      reason: "isolated fixture state discarded",
    };
  },
  async cleanup(context): Promise<TaskCleanupResult> {
    return {
      status: context.cleanup_contract.reset_to_fixture
        ? "VERIFIED"
        : "FAILED",
      attempted: true,
      verified: context.cleanup_contract.reset_to_fixture,
      residual_resources: [],
      reason: context.cleanup_contract.reset_to_fixture
        ? null
        : "fixture reset contract was not satisfied",
    };
  },
};
