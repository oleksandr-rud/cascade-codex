import { CascadeError } from "../../common";
import type {
  SecretResolutionContext,
  SecretResolver,
} from "../task-adapter";
import type {
  HttpRequestDefinition,
  HttpRequestValue,
} from "../../simulation-definitions";

export async function readBoundedResponseBody(
  response: Response,
  maxBytes: number,
): Promise<{ value: string; observed_bytes: number; truncated: boolean }> {
  if (!response.body) {
    return { value: "", observed_bytes: 0, truncated: false };
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let observedBytes = 0;
  let retainedBytes = 0;
  let truncated = false;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      observedBytes += value.byteLength;
      const remaining = Math.max(0, maxBytes - retainedBytes);
      if (remaining > 0) {
        const retained = value.subarray(0, remaining);
        chunks.push(retained);
        retainedBytes += retained.byteLength;
      }
      if (value.byteLength > remaining) {
        truncated = true;
        await reader.cancel("response exceeded policy output budget");
        break;
      }
    }
  } finally {
    reader.releaseLock();
  }
  const merged = new Uint8Array(retainedBytes);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return {
    value: new TextDecoder().decode(merged),
    observed_bytes: observedBytes,
    truncated,
  };
}

export function requestHasSecretReferences(request: HttpRequestDefinition): boolean {
  return Object.values(request.headers ?? {}).some(
    (value) => value.kind === "secret-reference",
  ) || request.body?.kind === "secret-reference";
}

export async function resolveHttpRequestValue(
  value: HttpRequestValue,
  resolver: SecretResolver | undefined,
  context: SecretResolutionContext,
): Promise<string> {
  if (value.kind === "public-literal") return value.value;
  if (!resolver) throw new CascadeError("trusted secret resolver unavailable");
  const resolved = await resolver(Object.freeze({ ...value }), Object.freeze({
    ...context,
    sink: Object.freeze({ ...context.sink }),
  }));
  if (typeof resolved !== "string" || resolved.length === 0) {
    throw new CascadeError("trusted secret resolution failed");
  }
  return resolved;
}

export async function resolveHttpRequestForDispatch(
  request: HttpRequestDefinition,
  resolver: SecretResolver | undefined,
  campaignId: string,
  taskId: string,
): Promise<{ headers: Record<string, string>; body: string | undefined }> {
  const headers: Record<string, string> = {};
  for (const [name, value] of Object.entries(request.headers ?? {})) {
    headers[name] = await resolveHttpRequestValue(value, resolver, {
      campaign_id: campaignId,
      task_id: taskId,
      sink: { kind: "header", name: name.trim().toLowerCase() },
    });
  }
  return {
    headers,
    body: request.body === undefined
      ? undefined
      : await resolveHttpRequestValue(request.body, resolver, {
          campaign_id: campaignId,
          task_id: taskId,
          sink: { kind: "body", name: "body" },
        }),
  };
}
