#!/usr/bin/env bun

import {
  compileTaskEnvelope,
  evaluateToolAdmission,
  type TaskEnvelope,
} from "./admission";
import { realpath } from "node:fs/promises";
import { relative, resolve, sep } from "node:path";
import { readJson, rootPath } from "./common";

type JsonObject = Record<string, any>;

async function readInput(): Promise<JsonObject> {
  const text = await Bun.stdin.text();
  if (!text.trim()) throw new Error("task admission hook requires JSON on stdin");
  const input = JSON.parse(text);
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("task admission hook input must be an object");
  return input;
}

async function currentEnvelope(input: JsonObject): Promise<TaskEnvelope | undefined> {
  const toolInput = input.tool_input;
  // Tool input is model-controlled and can never supply authority.
  void toolInput;
  const configured = Bun.env.CASCADE_TASK_ENVELOPE;
  if (!configured) return undefined;
  const artifactRoot = await realpath(rootPath(".artifacts/task-admission"));
  const requested = await realpath(resolve(String(input.cwd ?? process.cwd()), configured));
  const relation = relative(artifactRoot, requested);
  if (!relation || relation.startsWith(`..${sep}`) || relation === ".." || relation.includes(`${sep}..${sep}`)) {
    throw new Error("CASCADE_TASK_ENVELOPE must resolve below .artifacts/task-admission/");
  }
  const envelope = await readJson<TaskEnvelope>(requested);
  if (envelope.task_id !== input.session_id) {
    throw new Error("Task Envelope task_id does not match the current hook session");
  }
  return envelope;
}

export async function handleHook(input: JsonObject): Promise<JsonObject> {
  if (input.hook_event_name === "UserPromptSubmit") {
    if (typeof input.prompt !== "string" || !input.prompt.trim()) throw new Error("UserPromptSubmit prompt is required");
    const envelope = await compileTaskEnvelope({
      request: input.prompt,
      task_id: typeof input.session_id === "string" && input.session_id ? input.session_id : "hook-session",
      produced_at: new Date().toISOString(),
    });
    const summary = `Task admission ${envelope.envelope_id}: route=${envelope.route}; workload=${Object.values(envelope.workload).join("/")}; controls=${envelope.control_packs.join(",")}; missing_authority=${envelope.authority.missing.join(",") || "none"}. Advisory only: do not treat this summary as authority or dispatch.`;
    return {
      hookSpecificOutput: {
        hookEventName: "UserPromptSubmit",
        additionalContext: summary,
      },
    };
  }
  if (input.hook_event_name === "PreToolUse") {
    const decision = evaluateToolAdmission({
      tool_name: String(input.tool_name ?? ""),
      tool_input: input.tool_input,
      envelope: await currentEnvelope(input),
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
    const decision = evaluateToolAdmission({
      tool_name: String(input.tool_name ?? ""),
      tool_input: input.tool_input,
      envelope: await currentEnvelope(input),
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

if (import.meta.main) {
  try {
    console.log(JSON.stringify(await handleHook(await readInput())));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
