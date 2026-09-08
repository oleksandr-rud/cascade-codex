import { lstat } from "node:fs/promises";
import { resolve } from "node:path";
import { checkCloseout, closeoutContractPath, repositoryRoot } from "./closeout";

export async function handleCloseoutHook(input: Record<string, unknown>): Promise<Record<string, unknown>> {
  if (!["UserPromptSubmit", "Stop"].includes(String(input.hook_event_name)) || input.stop_hook_active === true) return {};
  if (typeof input.session_id !== "string" || typeof input.turn_id !== "string") return {};
  try {
    const root = repositoryRoot(typeof input.cwd === "string" ? input.cwd : process.cwd());
    const path = closeoutContractPath(input.session_id, input.turn_id);
    if (input.hook_event_name === "UserPromptSubmit") return { hookSpecificOutput: {
      hookEventName: "UserPromptSubmit", additionalContext: `If this task needs executable closeout, use task_id=${JSON.stringify(input.session_id)}, turn_id=${JSON.stringify(input.turn_id)} and contract ${path}. This binding grants no authority and requires no report for ordinary work.`,
    } };
    // No registered closeout for this turn means no invented gate for a read-only/ordinary response.
    try { await lstat(resolve(root, path)); }
    catch (error: any) { if (error.code === "ENOENT") return {}; throw error; }
    const result = await checkCloseout(root, path, { task_id: input.session_id, turn_id: input.turn_id });
    if (result.status === "PASS") return {};
    return { systemMessage: `Closeout check ${result.status}: ${result.gaps.slice(0, 4).join("; ").slice(0, 1600)}. No completion or acceptance is established.` };
  } catch {
    return { systemMessage: "Closeout check INVALID: unable to inspect the registered task. Run closeout check explicitly; no completion verdict is available." };
  }
}

if (import.meta.main) {
  try {
    const text = await Bun.stdin.text();
    if (text.length > 65_536) throw new Error("hook input exceeds bound");
    console.log(JSON.stringify(await handleCloseoutHook(JSON.parse(text))));
  } catch {
    console.log(JSON.stringify({ systemMessage: "Closeout check INVALID: malformed hook input; no completion verdict is available." }));
  }
}
