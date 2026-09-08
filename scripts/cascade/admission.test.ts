import { describe, expect, test } from "bun:test";
import { generateKeyPairSync, sign, verify } from "node:crypto";

import {
  canonicalAdmissionRequestDigest,
  classifyToolAction,
  compileTaskEnvelope,
  evaluateToolAdmission,
  hardActionTargetDigest,
  reclassifyTaskEnvelope,
  validateTaskEnvelope,
  type TaskEnvelope,
  type TrustedAuthorityHost,
  type TrustedHardActionReceipt,
} from "./admission";
import { sha256Text, stableJson } from "./common";

const fixed = "2026-08-04T12:00:00Z";
const testKeys = generateKeyPairSync("ed25519");

function trustedProvenance(request: string, segments = [{ start: 0, end: request.length, source: "DIRECT_USER" as const }]) {
  const requestSpans = segments.map((segment) => ({
    start: segment.start,
    end: segment.end,
    source: segment.source === "DIRECT_USER" ? "USER" : "EXTERNAL_SOURCE",
  }));
  const expected = {
    schema_version: 1 as const,
    attestation_id: "DUA-test-001",
    issuer: "test-host",
    request_digest: canonicalAdmissionRequestDigest(request),
    source_segments_digest: sha256Text(stableJson(requestSpans)),
  };
  return {
    source_segments: segments,
    trusted_direct_user_attestation: {
      ...expected,
      verify(candidate: typeof expected) {
        return stableJson(candidate) === stableJson(expected) ? { ok: true } : { ok: false, reason: "direct-user attestation mismatch" };
      },
    },
  };
}

function compileTrusted(request: string, input: Record<string, unknown> = {}) {
  return compileTaskEnvelope({ request, ...trustedProvenance(request), ...input });
}

function trustedHost(
  envelope: TaskEnvelope,
  toolName: string,
  toolInput: unknown,
  toolCallId = "call-001",
  window: { issued_at?: string; expires_at?: string } = {},
): TrustedAuthorityHost {
  const rawTool = toolName.trim().toLowerCase().replace(/^tools\./, "");
  const normalizedTool = rawTool === "functions.exec" ? rawTool : rawTool.replace(/^(?:functions|collaboration)\./, "");
  const payload = {
    receipt_id: "CAP-test-001",
    issuer: "test-host",
    session_id: envelope.task_id,
    envelope_id: envelope.envelope_id,
    envelope_revision: envelope.revision,
    request_digest: envelope.request_digest,
    source_digest: envelope.source_digest,
    action_class: classifyToolAction(toolName, toolInput) as "EXTERNAL_WRITE" | "PRIVILEGED" | "DESTRUCTIVE",
    tool_name: normalizedTool,
    target_digest: hardActionTargetDigest(normalizedTool, toolInput),
    tool_call_id: toolCallId,
    nonce: "nonce-test-001",
    issued_at: window.issued_at ?? "2026-08-04T11:59:00Z",
    expires_at: window.expires_at ?? "2026-08-04T12:05:00Z",
    max_uses: 1 as const,
  };
  const receipt: TrustedHardActionReceipt = {
    ...payload,
    signature: sign(null, Buffer.from(stableJson(payload)), testKeys.privateKey).toString("base64"),
  };
  const consumed = new Set<string>();
  return {
    receipt_id: payload.receipt_id,
    issuer: payload.issuer,
    session_id: payload.session_id,
    current_envelope_id: payload.envelope_id,
    current_revision: payload.envelope_revision,
    current_request_digest: payload.request_digest,
    current_source_digest: payload.source_digest,
    current_direct_user_attestation: envelope.derivation_input.direct_user_attestation!,
    nonce: payload.nonce,
    issued_at: payload.issued_at,
    expires_at: payload.expires_at,
    receipt,
    verify_and_consume(candidate, expected) {
      if (!verify(null, Buffer.from(stableJson(expected)), testKeys.publicKey, Buffer.from(candidate.signature, "base64"))) return { ok: false, reason: "signature rejected" };
      if (consumed.has(candidate.receipt_id)) return { ok: false, reason: "receipt already consumed" };
      consumed.add(candidate.receipt_id);
      return { ok: true };
    },
  };
}

describe("task admission safety smoke", () => {
  test("integrity-binds authority, policy, trace, and blocker fields", async () => {
    const result = await compileTaskEnvelope({ request: "Review one file.", produced_at: fixed });
    for (const mutant of [
      { ...result, authority: { ...result.authority, requested: ["destructive"] } },
      { ...result, blockers: ["forged clear state"] },
      { ...result, explanation_trace: result.explanation_trace.map((row: Record<string, any>, index: number) => index === 0 ? { ...row, signal: "forged" } : row) },
    ]) expect(() => validateTaskEnvelope(mutant)).toThrow("integrity");
  });

  test("requires a host-verified direct-user attestation before deriving hard-action authority", async () => {
    const request = "Push the feature branch.";
    const fallback = await compileTaskEnvelope({ request, authority: ["external-write"], produced_at: fixed });
    expect(fallback.derivation_input).toMatchObject({ provenance_mode: "LEXICAL_FALLBACK", direct_user_attestation: null });
    expect(fallback.claims.every((claim) => claim.policy_tags.every((tag) => !tag.startsWith("requested-")))).toBe(true);
    expect(fallback.gaps).toContain("trusted direct-user provenance required for hard-action request");
    expect(evaluateToolAdmission({ tool_name: "Bash", tool_input: { command: "git push" }, envelope: fallback, now: new Date(fixed) })).toMatchObject({ behavior: "deny", reason: "hard action requires trusted direct-user source provenance" });

    const trusted = await compileTrusted(request, { authority: ["external-write"], produced_at: fixed });
    expect(trusted.derivation_input).toMatchObject({ provenance_mode: "TRUSTED_SOURCE_SEGMENTS", authenticity: "TRUSTED_DIRECT_USER_ATTESTATION" });
    expect(trusted.claims.some((claim) => claim.source === "USER" && claim.policy_tags.includes("requested-external-write"))).toBe(true);
    expect(trusted.gaps).toContain("trusted host receipt required for EXTERNAL_WRITE");
  });

  test("requires a current proportional envelope for local writes and never auto-approves them", async () => {
    const patch = { patch: "*** Update File: docs/current.md\n*** End Patch" };
    const readOnly = await compileTaskEnvelope({ request: "Review docs/current.md only.", task_id: "read-local-boundary", produced_at: fixed });
    const localWrite = await compileTaskEnvelope({ request: "Update docs/current.md.", task_id: "write-local-boundary", authority: ["local-write"], produced_at: fixed });
    expect(evaluateToolAdmission({ tool_name: "apply_patch", tool_input: patch, permission_mode: "default" })).toMatchObject({ behavior: "deny", action_class: "LOCAL_WRITE" });
    expect(evaluateToolAdmission({ tool_name: "apply_patch", tool_input: patch, envelope: readOnly, now: new Date(fixed), permission_mode: "default" })).toMatchObject({ behavior: "deny", action_class: "LOCAL_WRITE" });
    expect(evaluateToolAdmission({ tool_name: "apply_patch", tool_input: patch, envelope: localWrite, now: new Date(fixed), permission_mode: "bypassPermissions" })).toMatchObject({ behavior: "deny", action_class: "LOCAL_WRITE" });
    expect(evaluateToolAdmission({ tool_name: "apply_patch", tool_input: patch, envelope: localWrite, now: new Date(fixed), permission_mode: "default" })).toMatchObject({ behavior: "defer", action_class: "LOCAL_WRITE" });
    const wrongTarget = { command: "*** Begin Patch\n*** Update File: docs/other.md\n*** End Patch" };
    expect(evaluateToolAdmission({ tool_name: "apply_patch", tool_input: wrongTarget, envelope: localWrite, now: new Date(fixed), permission_mode: "default" })).toMatchObject({ behavior: "deny", reason: "local-write target is outside the Task Envelope scope: docs/other.md" });
    const repositoryWrite = await compileTaskEnvelope({ request: "Implement the repository-level admission repair.", task_id: "repo-write-local-boundary", authority: ["local-write"], produced_at: fixed });
    expect(repositoryWrite.authority.local_write_scope).toEqual({ mode: "REPOSITORY", targets: [] });
    expect(evaluateToolAdmission({ tool_name: "apply_patch", tool_input: wrongTarget, envelope: repositoryWrite, now: new Date(fixed), permission_mode: "default" })).toMatchObject({ behavior: "defer", action_class: "LOCAL_WRITE" });
    const staleLocalWrite = await compileTaskEnvelope({ request: "Update docs/current.md.", task_id: "stale-write-local-boundary", authority: ["local-write"], produced_at: "2026-08-04T03:59:59.999999999Z" });
    const futureLocalWrite = await compileTaskEnvelope({ request: "Update docs/current.md.", task_id: "future-write-local-boundary", authority: ["local-write"], produced_at: "2026-08-04T12:00:00.000000001Z" });
    expect(evaluateToolAdmission({ tool_name: "apply_patch", tool_input: patch, envelope: staleLocalWrite, now: new Date(fixed), permission_mode: "default" })).toMatchObject({ behavior: "deny", reason: "Task Envelope is stale for a local write" });
    expect(evaluateToolAdmission({ tool_name: "apply_patch", tool_input: patch, envelope: futureLocalWrite, now: new Date(fixed), permission_mode: "default" })).toMatchObject({ behavior: "deny", reason: "Task Envelope is stale for a local write" });
    expect(evaluateToolAdmission({ tool_name: "apply_patch", tool_input: patch, envelope: localWrite, now: new Date(Number.NaN), permission_mode: "default" })).toMatchObject({ behavior: "deny", reason: "local-write evaluation time is invalid" });
  });

  test("requires a host-current signed one-shot receipt bound to the final tool invocation", async () => {
    const grantedTarget = { command: "git push origin feature" };
    const envelope = await compileTrusted("Push the feature branch.", {
      authority: ["external-write"],
      produced_at: fixed,
    });
    expect(envelope.gaps).toContain("trusted host receipt required for EXTERNAL_WRITE");
    const host = trustedHost(envelope, "Bash", grantedTarget);
    expect(evaluateToolAdmission({ tool_name: "Bash", tool_input: { command: "git push origin main" }, tool_call_id: "call-001", envelope, trusted_authority: host, now: new Date(fixed), permission_mode: "default" })).toMatchObject({ behavior: "deny", reason: "trusted host receipt binding does not match the final tool invocation" });
    expect(evaluateToolAdmission({ tool_name: "Bash", tool_input: grantedTarget, tool_call_id: "call-001", envelope, trusted_authority: host, now: new Date(fixed), permission_mode: "default" })).toMatchObject({ behavior: "defer" });
    expect(evaluateToolAdmission({ tool_name: "Bash", tool_input: grantedTarget, tool_call_id: "call-001", envelope, trusted_authority: host, now: new Date(fixed), permission_mode: "default" })).toMatchObject({ behavior: "deny", reason: "receipt already consumed" });

    const readEnvelope = await compileTrusted("Review the branch status.", { task_id: "read-thread", produced_at: fixed });
    const outOfScopeHost = trustedHost(readEnvelope, "Bash", grantedTarget);
    expect(evaluateToolAdmission({ tool_name: "Bash", tool_input: grantedTarget, tool_call_id: "call-001", envelope: readEnvelope, trusted_authority: outOfScopeHost, now: new Date(fixed), permission_mode: "default" })).toMatchObject({ behavior: "deny", reason: "Task Envelope does not request external_write action scope" });
  });

  test("rejects forged, mismatched, and superseded host receipts", async () => {
    const target = { command: "git push origin feature" };
    const prior = await compileTrusted("Push the feature branch.", { task_id: "thread", authority: ["external-write"], produced_at: fixed });
    const forgedHost = trustedHost(prior, "Bash", target);
    forgedHost.receipt = { ...(forgedHost.receipt as TrustedHardActionReceipt), signature: Buffer.from("forged").toString("base64") };
    expect(evaluateToolAdmission({ tool_name: "Bash", tool_input: target, tool_call_id: "call-001", envelope: prior, trusted_authority: forgedHost, now: new Date(fixed), permission_mode: "default" })).toMatchObject({ behavior: "deny", reason: "signature rejected" });

    const revokedHost = trustedHost(prior, "Bash", target);
    revokedHost.verify_and_consume = () => ({ ok: false, reason: "receipt revoked" });
    expect(evaluateToolAdmission({ tool_name: "Bash", tool_input: target, tool_call_id: "call-001", envelope: prior, trusted_authority: revokedHost, now: new Date(fixed), permission_mode: "default" })).toMatchObject({ behavior: "deny", reason: "receipt revoked" });
    const failedHost = trustedHost(prior, "Bash", target);
    failedHost.verify_and_consume = () => { throw new Error("host unavailable"); };
    expect(evaluateToolAdmission({ tool_name: "Bash", tool_input: target, tool_call_id: "call-001", envelope: prior, trusted_authority: failedHost, now: new Date(fixed), permission_mode: "default" })).toMatchObject({ behavior: "deny", reason: "trusted host receipt verification or atomic consumption failed closed" });

    const current = await reclassifyTaskEnvelope(prior, { request: "Push the feature branch.", task_id: "thread", authority: ["external-write"], produced_at: fixed, ...trustedProvenance("Push the feature branch.") });
    const currentHost = trustedHost(current, "Bash", target);
    expect(evaluateToolAdmission({ tool_name: "Bash", tool_input: target, tool_call_id: "call-001", envelope: prior, trusted_authority: currentHost, now: new Date(fixed), permission_mode: "default" })).toMatchObject({ behavior: "deny", reason: "trusted host current session or envelope revision does not match the Task Envelope" });
  });

  test("denies stale envelopes, expired receipts, and non-interactive permission modes", async () => {
    const target = { command: "git push origin feature" };
    const stale = await compileTrusted("Push the feature branch.", { authority: ["external-write"], produced_at: "2026-08-03T00:00:00Z" });
    expect(evaluateToolAdmission({ tool_name: "Bash", tool_input: target, envelope: stale, now: new Date(fixed) }).reason).toContain("stale");
    const current = await compileTrusted("Push the feature branch.", { authority: ["external-write"], produced_at: fixed });
    const host = trustedHost(current, "Bash", target);
    expect(evaluateToolAdmission({ tool_name: "Bash", tool_input: target, tool_call_id: "call-001", envelope: current, trusted_authority: host, now: new Date(Number.NaN), permission_mode: "default" })).toMatchObject({ behavior: "deny", reason: "hard action evaluation time is invalid" });
    for (const permission_mode of ["", "acceptEdits", "plan", "dontAsk", "bypassPermissions", "unknown-mode"]) {
      expect(evaluateToolAdmission({ tool_name: "Bash", tool_input: target, tool_call_id: "call-001", envelope: current, trusted_authority: host, now: new Date(fixed), permission_mode })).toMatchObject({ behavior: "deny", reason: "hard action requires an explicitly recognized interactive Codex approval mode" });
    }
    for (const permission_mode of ["default", "ask", "interactive", "on-request"]) {
      const interactiveHost = trustedHost(current, "Bash", target);
      expect(evaluateToolAdmission({ tool_name: "Bash", tool_input: target, tool_call_id: "call-001", envelope: current, trusted_authority: interactiveHost, now: new Date(fixed), permission_mode })).toMatchObject({ behavior: "defer" });
    }
    expect(evaluateToolAdmission({ tool_name: "Bash", tool_input: target, tool_call_id: "call-001", envelope: current, trusted_authority: host, now: new Date("2026-08-04T12:05:00Z"), permission_mode: "default" })).toMatchObject({ behavior: "deny", reason: "trusted host receipt is outside its bounded validity window" });
    expect(evaluateToolAdmission({ tool_name: "Bash", tool_input: target, tool_call_id: "call-001", envelope: current, trusted_authority: host, now: new Date("2026-08-04T12:06:00Z"), permission_mode: "default" })).toMatchObject({ behavior: "deny", reason: "trusted host receipt is outside its bounded validity window" });
  });
});
