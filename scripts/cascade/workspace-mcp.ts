import readline from "node:readline";

import {
  WorkspaceArtifactHub,
  type PersistWorkspaceArtifactInput,
  type PrepareWorkspaceArtifactInput,
} from "./workspace-service";

const SERVER_NAME = "Cascade Workspace";
const SERVER_VERSION = "0.1.0";
const DEFAULT_PROTOCOL_VERSION = "2025-11-25";
const JsonRpcError = {
  INVALID_PARAMS: -32602,
  METHOD_NOT_FOUND: -32601,
  INTERNAL_ERROR: -32603,
} as const;

const RESOURCE_PATHS = new Map([
  [
    "cascade://workspace/artifact-destinations",
    {
      name: "Cascade artifact destinations",
      description: "Current durable artifact kinds, formats, destination allowlists, retention, and closeout owner.",
      mimeType: "application/json",
      path: ".codex/artifact-destinations.json",
    },
  ],
  [
    "cascade://workspace/plugin-capabilities",
    {
      name: "Cascade plugin capabilities",
      description: "Current digest-bound catalog used by Cascade Coordinator for namespaced capability selection.",
      mimeType: "application/json",
      path: ".codex/plugin-capabilities.generated.json",
    },
  ],
]);

const TOOL_DEFINITIONS = [
  {
    name: "get_workspace_context",
    title: "Get Cascade Workspace Context",
    description:
      "Compile a bounded, digest-bound bundle from explicit allowlisted repository files. File bodies are returned as untrusted data. This tool never grants authority or selects a plugin.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        paths: {
          type: "array",
          minItems: 1,
          maxItems: 24,
          uniqueItems: true,
          items: { type: "string", minLength: 1, maxLength: 512 },
          description: "Exact repository-relative files to compile from the workspace read allowlist.",
        },
      },
      required: ["paths"],
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: "read_workspace_artifact",
    title: "Read Cascade Workspace Artifact",
    description:
      "Read one durable artifact through the current artifact-kind destination policy and return exact UTF-8 content with its digest.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        artifactKind: { type: "string", pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$" },
        targetPath: { type: "string", minLength: 1, maxLength: 512 },
      },
      required: ["artifactKind", "targetPath"],
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: "prepare_workspace_artifact",
    title: "Prepare Cascade Workspace Artifact",
    description:
      "Normalize and validate one candidate against the destination registry, format, size limit, and optional JSON Schema. Returns a short-lived one-time token but performs no repository write.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        artifactKind: { type: "string", pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$" },
        targetPath: { type: "string", minLength: 1, maxLength: 512 },
        format: { enum: ["json", "yaml", "markdown", "text"] },
        content: { type: "string", minLength: 1, maxLength: 1048576 },
        schemaPath: {
          type: ["string", "null"],
          maxLength: 512,
          description: "Optional allowlisted repository-relative *.schema.json path for JSON or YAML validation.",
        },
      },
      required: ["artifactKind", "targetPath", "format", "content"],
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
  },
  {
    name: "persist_workspace_artifact",
    title: "Persist Prepared Cascade Workspace Artifact",
    description:
      "Commit one previously prepared artifact through the closeout workflow only. Requires the exact preparation receipt binding, rejects stale destinations, performs no deletion, writes atomically, and returns a read-back receipt. This tool does not establish user authority; the active Codex host must verify current write scope before calling it.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        prepareToken: { type: "string", pattern: "^[a-f0-9]{64}$" },
        preparationReceiptId: { type: "string", pattern: "^WPREP-[a-f0-9]{16}$" },
        candidateSha256: { type: "string", pattern: "^[a-f0-9]{64}$" },
        expectedCurrentSha256: {
          type: ["string", "null"],
          pattern: "^[a-f0-9]{64}$",
        },
      },
      required: [
        "prepareToken",
        "preparationReceiptId",
        "candidateSha256",
        "expectedCurrentSha256"
      ],
    },
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
  },
];

interface JsonRpcRequest {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: Record<string, unknown>;
}

function send(message: unknown): void {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

function sendResult(id: JsonRpcRequest["id"], result: unknown): void {
  send({ jsonrpc: "2.0", id, result });
}

function sendError(
  id: JsonRpcRequest["id"],
  code: number,
  message: string,
): void {
  send({ jsonrpc: "2.0", id, error: { code, message } });
}

function requireObject(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function toolResult(text: string, structuredContent: unknown): unknown {
  return {
    content: [{ type: "text", text }],
    structuredContent,
  };
}

const hub = new WorkspaceArtifactHub({
  root: process.env.CASCADE_WORKSPACE_ROOT || undefined,
});

async function callTool(name: unknown, rawArguments: unknown): Promise<unknown> {
  if (typeof name !== "string") throw new Error("tool name must be a string");
  const args = requireObject(rawArguments ?? {}, "tool arguments");
  if (name === "get_workspace_context") {
    if (!Array.isArray(args.paths) || !args.paths.every((path) => typeof path === "string")) {
      throw new Error("paths must be an array of strings");
    }
    const bundle = await hub.getContext(args.paths);
    return toolResult(bundle.rendered_context, bundle);
  }
  if (name === "read_workspace_artifact") {
    if (typeof args.artifactKind !== "string" || typeof args.targetPath !== "string") {
      throw new Error("artifactKind and targetPath must be strings");
    }
    const artifact = await hub.readArtifact(args.artifactKind, args.targetPath);
    return toolResult(
      `Read ${artifact.target_path} (${artifact.bytes} bytes, sha256:${artifact.sha256}).\n\n${artifact.content}`,
      artifact,
    );
  }
  if (name === "prepare_workspace_artifact") {
    const receipt = await hub.prepareArtifact(args as unknown as PrepareWorkspaceArtifactInput);
    return toolResult(
      `Prepared ${receipt.target_path}: ${receipt.status}, sha256:${receipt.candidate_sha256}. No repository write occurred.`,
      receipt,
    );
  }
  if (name === "persist_workspace_artifact") {
    const receipt = await hub.persistArtifact(args as unknown as PersistWorkspaceArtifactInput);
    return toolResult(
      `${receipt.status}: ${receipt.operation} ${receipt.target_path}; read-back sha256:${receipt.sha256}.`,
      receipt,
    );
  }
  throw new Error(`unknown tool: ${name}`);
}

async function handleRequest(message: JsonRpcRequest): Promise<void> {
  const { id, method, params } = message;
  if (method === "initialize") {
    sendResult(id, {
      protocolVersion: typeof params?.protocolVersion === "string"
        ? params.protocolVersion
        : DEFAULT_PROTOCOL_VERSION,
      capabilities: { resources: {}, tools: {} },
      serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
      instructions:
        "Cascade Workspace is a bounded repository resource and artifact service. Coordinator selects and orders plugin capabilities; this server never selects, dispatches, or grants authority. Use persist_workspace_artifact only from closeout after validating current host write scope.",
    });
    return;
  }
  if (method === "ping") {
    sendResult(id, {});
    return;
  }
  if (method === "tools/list") {
    sendResult(id, { tools: TOOL_DEFINITIONS });
    return;
  }
  if (method === "tools/call") {
    try {
      sendResult(id, await callTool(params?.name, params?.arguments));
    } catch (error) {
      sendError(
        id,
        JsonRpcError.INVALID_PARAMS,
        error instanceof Error ? error.message : String(error),
      );
    }
    return;
  }
  if (method === "resources/list") {
    sendResult(id, {
      resources: [...RESOURCE_PATHS.entries()].map(([uri, resource]) => ({
        uri,
        name: resource.name,
        description: resource.description,
        mimeType: resource.mimeType,
      })),
    });
    return;
  }
  if (method === "resources/read") {
    try {
      const uri = params?.uri;
      if (typeof uri !== "string" || !RESOURCE_PATHS.has(uri)) {
        throw new Error(`unknown resource: ${String(uri ?? "")}`);
      }
      const resource = RESOURCE_PATHS.get(uri)!;
      const bundle = await hub.getContext([resource.path]);
      sendResult(id, {
        contents: [{
          uri,
          mimeType: resource.mimeType,
          text: bundle.files[0]!.content,
        }],
      });
    } catch (error) {
      sendError(
        id,
        JsonRpcError.INVALID_PARAMS,
        error instanceof Error ? error.message : String(error),
      );
    }
    return;
  }
  if (id !== undefined) {
    sendError(id, JsonRpcError.METHOD_NOT_FOUND, `method not found: ${String(method ?? "")}`);
  }
}

const lines = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
let tail = Promise.resolve();
lines.on("line", (line) => {
  if (!line.trim()) return;
  let message: JsonRpcRequest;
  try {
    message = JSON.parse(line) as JsonRpcRequest;
  } catch {
    return;
  }
  tail = tail.then(() => handleRequest(message)).catch((error) => {
    if (message.id !== undefined) {
      sendError(
        message.id,
        JsonRpcError.INTERNAL_ERROR,
        error instanceof Error ? error.message : String(error),
      );
    }
  });
});
