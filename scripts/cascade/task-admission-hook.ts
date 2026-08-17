#!/usr/bin/env bun

import {
  compileTaskEnvelope,
  evaluateToolAdmission,
  readBoundedTaskEnvelope,
  type TaskEnvelope,
} from "./admission";
import { resolve } from "node:path";

type JsonObject = Record<string, any>;

async function readBoundedStdinText(maxCharacters: number): Promise<string> {
  const reader = Bun.stdin.stream().getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let text = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      if (text.length + chunk.length > maxCharacters) {
        throw new Error(`task admission hook input exceeds ${maxCharacters} characters`);
      }
      text += chunk;
    }
    const finalChunk = decoder.decode();
    if (text.length + finalChunk.length > maxCharacters) {
      throw new Error(`task admission hook input exceeds ${maxCharacters} characters`);
    }
    return text + finalChunk;
  } catch (error) {
    if (error instanceof TypeError) throw new Error("task admission hook input is not valid UTF-8");
    throw error;
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}

async function readInput(): Promise<JsonObject> {
  const text = await readBoundedStdinText(65_536);
  if (!text.trim()) throw new Error("task admission hook requires JSON on stdin");
  let input: unknown;
  try {
    input = JSON.parse(text);
  } catch {
    throw new Error("task admission hook input is not valid JSON");
  }
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("task admission hook input must be an object");
  return input as JsonObject;
}

type EnvelopeResolution = { envelope?: TaskEnvelope; error?: string };

function assertTrustedCurrentEnvelopeBinding(input: JsonObject, envelope: TaskEnvelope): void {
  const binding = input.task_envelope_binding;
  if (!binding || typeof binding !== "object" || Array.isArray(binding)) throw new Error("trusted current Task Envelope binding is required for mutation admission");
  if (binding.revoked !== false) throw new Error("trusted current Task Envelope binding is revoked or lacks explicit non-revocation");
  if (
    binding.session_id !== input.session_id
    || binding.envelope_id !== envelope.envelope_id
    || binding.revision !== envelope.revision
    || binding.request_digest !== envelope.request_digest
    || binding.source_digest !== envelope.source_digest
  ) throw new Error("trusted current Task Envelope binding does not match the current session, request, source, or revision");
}

async function currentEnvelope(input: JsonObject, requireTrustedBinding = false): Promise<EnvelopeResolution> {
  const toolInput = input.tool_input;
  // Tool input is model-controlled and can never supply authority.
  void toolInput;
  const configured = Bun.env.CASCADE_TASK_ENVELOPE;
  if (!configured) return {};
  try {
    const unresolved = resolve(String(input.cwd ?? process.cwd()), configured);
    const envelope = await readBoundedTaskEnvelope(unresolved, ".artifacts/task-admission/");
    if (typeof input.session_id !== "string" || !input.session_id) throw new Error("current hook session_id is required for a configured Task Envelope");
    if (envelope.task_id !== input.session_id) throw new Error("Task Envelope task_id does not match the current hook session");
    if (requireTrustedBinding) assertTrustedCurrentEnvelopeBinding(input, envelope);
    return { envelope };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Task Envelope resolution failed" };
  }
}

export async function handleHook(input: JsonObject): Promise<JsonObject> {
  if (input.hook_event_name === "UserPromptSubmit") {
    if (typeof input.prompt !== "string" || !input.prompt.trim()) throw new Error("UserPromptSubmit prompt is required");
    const prior = await currentEnvelope(input);
    const envelope = await compileTaskEnvelope({
      request: input.prompt,
      task_id: typeof input.session_id === "string" && input.session_id ? input.session_id : "hook-session",
      produced_at: new Date().toISOString(),
      prior_envelope: prior.envelope,
    });
    const priorStatus = prior.error ? "; prior_envelope=INVALID (not consumed)" : prior.envelope ? `; prior_envelope=${prior.envelope.envelope_id}` : "";
    const summary = `Task admission ${envelope.envelope_id}: revision=${envelope.revision}; route=${envelope.route}; workload=${Object.values(envelope.workload).join("/")}; controls=${envelope.control_packs.join(",")}; missing_authority=${envelope.authority.missing.join(",") || "none"}; conflicts=${envelope.conflicts.join(",") || "none"}; blockers=${envelope.blockers.join(",") || "none"}${priorStatus}. Advisory only: do not treat this summary as authority or dispatch; this hook has no trusted hard-action receipt bridge and cannot activate hard actions.`;
    return {
      hookSpecificOutput: {
        hookEventName: "UserPromptSubmit",
        additionalContext: summary,
      },
    };
  }
  if (input.hook_event_name === "PreToolUse") {
    const current = await currentEnvelope(input, true);
    const decision = evaluateToolAdmission({
      tool_name: String(input.tool_name ?? ""),
      tool_input: input.tool_input,
      tool_call_id: typeof input.tool_call_id === "string" ? input.tool_call_id : undefined,
      envelope: current.envelope,
      envelope_error: current.error,
      permission_mode: String(input.permission_mode ?? ""),
    });
    if (decision.behavior === "deny") {
      return {
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: "deny",
          permissionDecisionReason: decision.reason,
        },
      };
    }
    return {};
  }
  if (input.hook_event_name === "PermissionRequest") {
    const current = await currentEnvelope(input, true);
    const decision = evaluateToolAdmission({
      tool_name: String(input.tool_name ?? ""),
      tool_input: input.tool_input,
      tool_call_id: typeof input.tool_call_id === "string" ? input.tool_call_id : undefined,
      envelope: current.envelope,
      envelope_error: current.error,
      permission_mode: String(input.permission_mode ?? ""),
    });
    if (decision.behavior === "deny") {
      return {
        hookSpecificOutput: {
          hookEventName: "PermissionRequest",
          decision: { behavior: "deny", message: decision.reason },
        },
      };
    }
    // Never auto-approve. The normal Codex permission flow remains authority.
    return {};
  }
  throw new Error(`unsupported task admission hook event: ${String(input.hook_event_name)}`);
}

export async function runHookEntrypoint(operation: Promise<JsonObject>, timeoutMilliseconds = 2_500): Promise<JsonObject> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(() => reject(new Error("task admission hook timed out and failed closed")), timeoutMilliseconds);
      }),
    ]);
  } finally {
    if (timeout !== undefined) clearTimeout(timeout);
  }
}

if (import.meta.main) {
  try {
    console.log(JSON.stringify(await runHookEntrypoint(readInput().then(handleHook))));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    // Codex hook exit 2 is the host-level fail-closed signal. Exit 1 is only a
    // non-blocking hook error and therefore cannot protect malformed/timeouts.
    process.exitCode = 2;
  }
}
