import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { readFile, rm, writeFile } from "node:fs/promises";
import { handleHook } from "./task-admission-hook";
import { compileTaskEnvelope, interpretationFixture } from "./fixtures/admission";
import { rootPath, sha256Text, writeJsonAtomic } from "./common";

describe("task admission hook interpretation boundary", () => {
  test("clears an explicitly selected stale envelope while interpretation is pending or invalid", async () => {
    const path = rootPath(`.artifacts/task-admission/hook-test-${randomUUID()}.json`);
    const previous = Bun.env.CASCADE_TASK_ENVELOPE;
    const task_id = "hook-test-session";
    const request = "Review the current files.";
    const prior = await compileTaskEnvelope({ request, task_id });
    Bun.env.CASCADE_TASK_ENVELOPE = path;
    try {
      await writeJsonAtomic(path, prior);
      const pending = await handleHook({ hook_event_name: "UserPromptSubmit", prompt: "Update the files.", session_id: task_id });
      expect(pending.hookSpecificOutput.additionalContext).toContain("NEEDS_INTERPRETATION");
      expect(await Bun.file(path).exists()).toBe(false);

      await writeJsonAtomic(path, prior);
      await expect(handleHook({ hook_event_name: "UserPromptSubmit", prompt: "x".repeat(5000), session_id: task_id })).rejects.toThrow("raw characters");
      expect(await Bun.file(path).exists()).toBe(false);

      await writeJsonAtomic(path, prior);
      await expect(handleHook({ hook_event_name: "UserPromptSubmit", prompt: "Update the files.", session_id: task_id, interpretation: interpretationFixture({ request, task_id }) })).rejects.toThrow("binding is stale");
      expect(await Bun.file(path).exists()).toBe(false);

      const complete = await handleHook({ hook_event_name: "UserPromptSubmit", prompt: request, session_id: task_id, interpretation: interpretationFixture({ request, task_id }) });
      expect(complete.hookSpecificOutput.additionalContext).toContain("Advisory only");
      expect((await Bun.file(path).json()).request_digest).toBe(prior.request_digest);
      await handleHook({ hook_event_name: "Interrupt", session_id: task_id });
      expect(await Bun.file(path).exists()).toBe(false);
    } finally {
      if (previous === undefined) delete Bun.env.CASCADE_TASK_ENVELOPE;
      else Bun.env.CASCADE_TASK_ENVELOPE = previous;
      await rm(path, { force: true });
    }
  });
});


describe("pending admission CLI integration", () => {
  test("compiles both transports from the bound intake and rejects session overrides", async () => {
    const task_id = `intake-cli-${randomUUID()}`;
    const key = sha256Text(task_id).slice(0, 24);
    const intake = rootPath(`.artifacts/task-admission/intake-${key}.json`);
    const envelope = rootPath(`.artifacts/task-admission/hook-${key}.json`);
    const proposalPath = rootPath(`.artifacts/task-admission/proposal-${key}.json`);
    const request = "Review the requested local integration.";
    const run = (args: string[]) => Bun.spawnSync({ cmd: [process.execPath, rootPath("scripts/cascade.ts"), "admission", ...args], cwd: rootPath("."), stdout: "pipe", stderr: "pipe" });
    try {
      await handleHook({ hook_event_name: "UserPromptSubmit", session_id: task_id, prompt: request });
      const projection = run(["intake", "--file", intake]);
      expect(projection.exitCode).toBe(0);
      expect(projection.stdout.toString()).toContain(request);
      await writeFile(proposalPath, JSON.stringify(interpretationFixture({ request, task_id })));
      expect(run(["assess", "--intake", intake, "--interpretation", proposalPath, "--task-id", "different-session"]).exitCode).toBe(1);
      expect(run(["assess", "--intake", intake, "--interpretation", proposalPath]).exitCode).toBe(0);
      expect(JSON.parse(await readFile(envelope, "utf8")).task_id).toBe(task_id);
      const supplied = JSON.parse(await readFile(intake, "utf8"));
      await writeFile(proposalPath, JSON.stringify({
        schema_version: 1, artifact_type: "cascade-admission-interpretation", status: "RESOLVED",
        request_digest: supplied.request_digest, prior_envelope_id: null, model_id: "synthetic-transport-fixture",
        relation: "NEW", intent: "REVIEW", policy_tags: ["review"],
        workload: { topology: "BOUNDED", effort: "SMALL", authority: "READ_ONLY", duration: "TURN" },
        local_write_scope: { mode: "TARGETS", targets: [] },
        claims: [{ kind: "OUTCOME", statement: "Review the local changes.", confidence: 0.8, policy_tags: ["review"] }], uncertainty: [],
      }));
      expect(run(["assess", "--intake", intake, "--interpretation", proposalPath]).exitCode).toBe(0);
      expect(JSON.parse(await readFile(envelope, "utf8")).claims[0].source).toBe("MODEL_INFERENCE");
    } finally {
      await handleHook({ hook_event_name: "Interrupt", session_id: task_id });
      await rm(proposalPath, { force: true });
    }
  });
});
