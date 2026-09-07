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

import {
  readBoundedResponseBody,
  requestHasSecretReferences,
  resolveHttpRequestForDispatch,
} from "./transport-support";

export const httpTaskAdapter: TaskAdapter = {
  id: "builtin-http-client",
  version: "1.0.0",
  driver: "http-client",
  capabilities: [
    "http-request",
    "manual-redirect",
    "bounded-response",
    "abort-signal",
  ],
  async preflight(context) {
    if (!context.task.request) {
      return { status: "BLOCKED", reason: "HTTP request is missing" };
    }
    if (
      requestHasSecretReferences(context.task.request) &&
      !context.secret_resolver
    ) {
      return { status: "BLOCKED", reason: "trusted secret resolver unavailable" };
    }
    return { status: "READY", reason: null };
  },
  async execute(context): Promise<TaskAdapterResult> {
    const request = context.task.request!;
    const action = {
      type: "http-request" as const,
      method: request.method,
      url: request.url,
      headers: request.headers,
      body: request.body,
    };
    const policyDecision = context.authorize_action({
      action_index: 0,
      action,
      projected_output_bytes: 0,
    });
    const policyDecisions = [policyDecision];
    const requestPolicy = context.policies.find(
      (policy) =>
        policy.id === policyDecision.policy_id &&
        policy.version === policyDecision.policy_version,
    );
    if (policyDecision.decision !== "ALLOW" || !requestPolicy) {
      return {
        outcome:
          policyDecision.decision === "REQUIRE_CONFIRMATION" ||
          policyDecision.decision === "BLOCKED"
            ? "BLOCKED"
            : "FAILED",
        earliest_failure: policyDecision.reason,
        side_effects: "NONE",
        policy_decisions: policyDecisions,
        events: [],
      };
    }
    if (context.signal?.aborted) {
      return {
        outcome: "CANCELLED",
        earliest_failure: "HTTP request cancelled before dispatch",
        side_effects: "NONE",
        policy_decisions: policyDecisions,
        events: [],
      };
    }
    // Final secret-free action guard. Raw bytes are resolved only after this
    // authorized binding and remain in the dispatch-local request below.
    assertSafeSimulationAction(action);
    const dispatchRequest = await resolveHttpRequestForDispatch(
      request,
      context.secret_resolver,
      context.campaign_id,
      context.task.id,
    );
    consumePolicyBudget(policyDecision, context.budget_usage);
    const outputLimit = policyDecision.budgets!.remaining_after.output_bytes;
    try {
      await context.record_action_dispatch(policyDecision);
      const response = await fetch(request.url, {
        method: request.method,
        headers: dispatchRequest.headers,
        body: dispatchRequest.body,
        redirect: "manual",
        signal: context.signal,
      });
      const bounded = await readBoundedResponseBody(
        response,
        outputLimit,
      );
      const resolvedSensitiveValues = [
        ...Object.entries(request.headers ?? {})
          .filter(([, value]) => value.kind === "secret-reference")
          .map(([name]) => dispatchRequest.headers[name]!),
        ...(request.body?.kind === "secret-reference" && dispatchRequest.body !== undefined
          ? [dispatchRequest.body]
          : []),
      ];
      const controlled = context.control_output(
        bounded.value,
        requestPolicy,
        resolvedSensitiveValues,
      );
      consumePolicyOutputBudget(
        policyDecision,
        context.budget_usage,
        bounded.observed_bytes + (bounded.truncated ? 1 : 0),
      );
      const body = controlled.value;
      const outputBudgetExceeded =
        bounded.truncated ||
        policyDecision.budgets!.consumed_after.output_bytes >
          requestPolicy.budgets.max_output_bytes;
      const http: TaskHttpResult = {
        method: request.method,
        url: request.url,
        status: response.status,
        content_type: response.headers.get("content-type"),
        body,
        redirected: response.redirected,
        output_control: {
          policy_id: requestPolicy.id,
          max_output_bytes: outputLimit,
          budget_consumed_bytes:
            bounded.observed_bytes + (bounded.truncated ? 1 : 0),
          original_bytes:
            bounded.observed_bytes + (bounded.truncated ? 1 : 0),
          retained_bytes: Buffer.byteLength(body),
          redacted: controlled.redacted,
          truncated: outputBudgetExceeded || controlled.truncated,
        },
      };
      return {
        outcome: outputBudgetExceeded ? "FAILED" : "SUCCEEDED",
        earliest_failure: outputBudgetExceeded
          ? "HTTP response exceeded the governing policy budget"
          : null,
        side_effects: "KNOWN",
        policy_decisions: policyDecisions,
        events: [
          {
            event_type: "HTTP",
            index: 0,
            type: "http-request",
            action_binding_version: policyDecision.action_binding_version,
            action_binding_digest: policyDecision.action_binding_digest,
            method: request.method,
            url: request.url,
            response_status: response.status,
            response_bytes: bounded.observed_bytes,
            status: outputBudgetExceeded ? "BLOCKED" : "PASS",
          },
        ],
        http,
        observations: [
          {
            type: "http-response",
            surface: {
              kind: "http",
              session_id: context.run_id,
              surface_id: new URL(request.url).origin,
            },
            payload: {
              method: request.method,
              url: request.url,
              status: response.status,
              content_type: response.headers.get("content-type"),
              retained_bytes: Buffer.byteLength(body),
              truncated: http.output_control.truncated,
            },
          },
        ],
      };
    } catch (error) {
      const cancelled = context.signal?.aborted;
      return {
        outcome: "UNKNOWN_OUTCOME",
        earliest_failure: cancelled
          ? "HTTP request cancelled after dispatch; side effects are unknown"
          : `HTTP request failed after dispatch; side effects are unknown: ${error instanceof Error ? error.message : String(error)}`,
        side_effects: "UNKNOWN",
        policy_decisions: policyDecisions,
        events: [],
      };
    }
  },
  async recover(): Promise<TaskRecoveryResult> {
    return {
      status: "UNSUPPORTED",
      attempted: false,
      reason: "HTTP side effects cannot be reconstructed safely",
    };
  },
  async cleanup(context): Promise<TaskCleanupResult> {
    if (context.dispatch_state.status === "NOT_DISPATCHED") {
      return {
        status: "NOT_REQUIRED",
        attempted: false,
        verified: true,
        residual_resources: [],
        reason: "request was not dispatched",
      };
    }
    return {
      status: "UNKNOWN",
      attempted: true,
      verified: false,
      residual_resources: [],
      reason:
        "HTTP fetch resources were released but this does not verify target reset or remote side-effect cleanup",
    };
  },
};
