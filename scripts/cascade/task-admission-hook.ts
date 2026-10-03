#!/usr/bin/env bun

import {
  compileTaskEnvelope,
  semanticAdmissionRequest,
  readBoundedTaskEnvelope,
  type TaskEnvelope,
} from "./admission";
import {
  boundedPath,
  exists,
  rel,
  sha256Text,
  writeJsonAtomic,
} from "./common";
import { unlink } from "node:fs/promises";
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
const TASK_ENVELOPE_PREFIX = ".artifacts/task-admission/";

function sessionEnvelopePath(input: JsonObject): string | undefined {
  if (typeof input.session_id !== "string" || !input.session_id) return undefined;
  const sessionKey = sha256Text(input.session_id).slice(0, 24);
  return boundedPath(
    `${TASK_ENVELOPE_PREFIX}hook-${sessionKey}.json`,
    TASK_ENVELOPE_PREFIX,
  );
}

function currentEnvelopePath(input: JsonObject): string | undefined {
  const configured = Bun.env.CASCADE_TASK_ENVELOPE;
  if (configured) {
    return boundedPath(
      resolve(String(input.cwd ?? process.cwd()), configured),
      TASK_ENVELOPE_PREFIX,
    );
  }
  return sessionEnvelopePath(input);
}

async function clearSessionEnvelope(input: JsonObject, includeIntake = false): Promise<void> {
  const paths = [Bun.env.CASCADE_TASK_ENVELOPE ? undefined : sessionEnvelopePath(input)];
  if (includeIntake && typeof input.session_id === "string" && input.session_id) {
    paths.push(boundedPath(`${TASK_ENVELOPE_PREFIX}intake-${sha256Text(input.session_id).slice(0, 24)}.json`, TASK_ENVELOPE_PREFIX));
  }
  for (const path of paths) {
    if (!path) continue;
    try { await unlink(path); }
    catch (error) {
      if (!(error && typeof error === "object" && "code" in error && error.code === "ENOENT")) throw error;
    }
  }
}

async function currentEnvelope(input: JsonObject): Promise<EnvelopeResolution> {
  try {
    const path = currentEnvelopePath(input);
    if (!path) return {};
    if (!Bun.env.CASCADE_TASK_ENVELOPE && !(await exists(path))) return {};
    const envelope = await readBoundedTaskEnvelope(path, TASK_ENVELOPE_PREFIX);
    if (envelope.task_id !== input.session_id) throw new Error("Task Envelope task_id does not match the current hook session");
    return { envelope };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Task Envelope resolution failed" };
  }
}

export async function handleHook(input: JsonObject): Promise<JsonObject> {
  if (input.hook_event_name === "UserPromptSubmit") {
    if (typeof input.prompt !== "string" || !input.prompt.trim()) throw new Error("UserPromptSubmit prompt is required");
    if (typeof input.session_id !== "string" || !input.session_id) throw new Error("UserPromptSubmit session_id is required to persist the current Task Envelope");
    if (input.session_id.length > 200) throw new Error("UserPromptSubmit session_id is oversized");
    const prior = await currentEnvelope(input);
    if (input.admission_interpretation === undefined) {
      const request = semanticAdmissionRequest(input.prompt);
      const envelopePath = currentEnvelopePath(input)!;
      const intakePath = boundedPath(`${TASK_ENVELOPE_PREFIX}intake-${sha256Text(input.session_id).slice(0, 24)}.json`, TASK_ENVELOPE_PREFIX);
      // Preserve the prior inside the pending intake, then clear only this
      // session's old current envelope. It must not represent the new request.
      await writeJsonAtomic(intakePath, {
        schema_version: 1, artifact_type: "cascade-admission-intake", status: "REQUIRES_INTERPRETATION",
        task_id: input.session_id, ...request, envelope_path: rel(envelopePath),
        prior_envelope: prior.envelope ?? null,
      }, { fileMode: 0o600, directoryMode: 0o700 });
      await clearSessionEnvelope(input);
      return { hookSpecificOutput: { hookEventName: "UserPromptSubmit",
        additionalContext: `Semantic task intake requires LLM interpretation: intake_path=${rel(intakePath)}; request_digest=${request.request_digest}; prior_envelope=${prior.envelope?.envelope_id ?? "none"}. Read admission intake --file PATH for the plain-text request/prior projection and .codex/task-admission/semantic-intake.md for the bounded authoring contract. Submit the typed interpretation with admission assess --intake PATH --interpretation PATH. Missing, invalid or uncertain interpretation remains unresolved; no lexical fallback. This advisory cannot grant permission or dispatch work.${prior.error ? " Prior envelope invalid; not consumed." : ""}`,
      } };
    }
    const envelope = await compileTaskEnvelope({
      request: input.prompt,
      task_id: input.session_id,
      produced_at: new Date().toISOString(),
      prior_envelope: prior.envelope,
      semantic_interpretation: input.admission_interpretation,
    });
    const envelopePath = currentEnvelopePath(input)!;
    await writeJsonAtomic(envelopePath, envelope, {
      fileMode: 0o600,
      directoryMode: 0o700,
    });
    const priorStatus = prior.error ? "; prior_envelope=INVALID (not consumed)" : prior.envelope ? `; prior_envelope=${prior.envelope.envelope_id}` : "";
    const summary = `Task admission ${envelope.envelope_id}: revision=${envelope.revision}; envelope_path=${rel(envelopePath)}; request_digest=${envelope.request_digest}; claims=${envelope.claims.length}; route=${envelope.route}; workload=${Object.values(envelope.workload).join("/")}; controls=${envelope.control_packs.join(",")}; missing_authority=${envelope.authority.missing.join(",") || "none"}; conflicts=${envelope.conflicts.join(",") || "none"}; blockers=${envelope.blockers.join(",") || "none"}${priorStatus}. Advisory only: the ignored local envelope is routing input, not durable evidence, authority, or dispatch; this hook has no trusted hard-action receipt bridge and cannot activate hard actions.`;
    return {
      hookSpecificOutput: {
        hookEventName: "UserPromptSubmit",
        additionalContext: summary,
      },
    };
  }
  if (input.hook_event_name === "Interrupt") {
    await clearSessionEnvelope(input, true);
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
