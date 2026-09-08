import { afterEach, describe, expect, test } from "bun:test";
import { spawn } from "node:child_process";
import { once } from "node:events";
import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
} from "node:fs/promises";
import readline from "node:readline";

import { rootPath } from "./common";

const temporaryRoots: string[] = [];

afterEach(async () => {
  for (const root of temporaryRoots.splice(0)) {
    await rm(root, { recursive: true, force: true });
  }
});

async function mcpWorkspace(): Promise<string> {
  await mkdir(rootPath(".artifacts"), { recursive: true });
  const root = await mkdtemp(rootPath(".artifacts/workspace-mcp-test-"));
  temporaryRoots.push(root);
  await mkdir(`${root}/.codex/schemas/workspace`, { recursive: true });
  await copyFile(
    rootPath(".codex/artifact-destinations.json"),
    `${root}/.codex/artifact-destinations.json`,
  );
  for (const file of [
    "artifact-destinations.schema.json",
    "preparation-receipt.schema.json",
    "persistence-receipt.schema.json",
  ]) {
    await copyFile(
      rootPath(`.codex/schemas/workspace/${file}`),
      `${root}/.codex/schemas/workspace/${file}`,
    );
  }
  return root;
}

describe("Cascade Workspace MCP transport", () => {
  test("completes a real stdio initialize, tool catalog, and resource read", () => {
    const requests = [
      {
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: { protocolVersion: "2025-11-25", capabilities: {}, clientInfo: { name: "cascade-test", version: "1" } },
      },
      { jsonrpc: "2.0", id: 2, method: "tools/list", params: {} },
      { jsonrpc: "2.0", id: 3, method: "resources/list", params: {} },
      {
        jsonrpc: "2.0",
        id: 4,
        method: "resources/read",
        params: { uri: "cascade://workspace/artifact-destinations" },
      },
    ];
    const child = Bun.spawnSync({
      cmd: [process.execPath, "scripts/cascade/workspace-mcp.ts"],
      cwd: process.cwd(),
      stdin: new Blob([`${requests.map((request) => JSON.stringify(request)).join("\n")}\n`]),
      stdout: "pipe",
      stderr: "pipe",
    });
    expect(child.exitCode).toBe(0);
    expect(child.stderr.toString()).toBe("");
    const responses = child.stdout.toString().trim().split("\n").map((line) => JSON.parse(line));
    expect(responses).toHaveLength(4);
    expect(responses[0].result).toMatchObject({
      protocolVersion: "2025-11-25",
      capabilities: { resources: {}, tools: {} },
      serverInfo: { name: "Cascade Workspace", version: "0.1.0" },
    });
    expect(responses[0].result.instructions).toContain("never selects, dispatches, or grants authority");
    expect(responses[1].result.tools.map((tool: { name: string }) => tool.name)).toEqual([
      "get_workspace_context",
      "read_workspace_artifact",
      "prepare_workspace_artifact",
      "persist_workspace_artifact",
    ]);
    const persist = responses[1].result.tools[3];
    expect(persist.annotations).toEqual({
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    });
    expect(persist.description).toContain("does not establish user authority");
    expect(responses[2].result.resources).toHaveLength(2);
    expect(JSON.parse(responses[3].result.contents[0].text)).toMatchObject({
      artifact_type: "cascade-workspace-artifact-destinations",
    });
  });

  test("prepares and atomically persists through the real MCP process", async () => {
    const root = await mcpWorkspace();
    const child = spawn(process.execPath, ["scripts/cascade/workspace-mcp.ts"], {
      cwd: process.cwd(),
      env: { ...process.env, CASCADE_WORKSPACE_ROOT: root },
      stdio: ["pipe", "pipe", "pipe"],
    });
    const pending = new Map<number, (value: any) => void>();
    const errors: string[] = [];
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk) => errors.push(String(chunk)));
    const lines = readline.createInterface({ input: child.stdout, crlfDelay: Infinity });
    lines.on("line", (line) => {
      const response = JSON.parse(line);
      pending.get(response.id)?.(response);
      pending.delete(response.id);
    });
    const rpc = (id: number, method: string, params: Record<string, unknown>) =>
      new Promise<any>((resolve) => {
        pending.set(id, resolve);
        child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`);
      });

    try {
      expect((await rpc(1, "initialize", {
        protocolVersion: "2025-11-25",
        capabilities: {},
        clientInfo: { name: "cascade-write-test", version: "1" },
      })).result.serverInfo.name).toBe("Cascade Workspace");
      const preparation = (await rpc(2, "tools/call", {
        name: "prepare_workspace_artifact",
        arguments: {
          artifactKind: "specification",
          targetPath: "docs/specs/mcp-e2e.md",
          format: "markdown",
          content: "# MCP end to end",
        },
      })).result.structuredContent;
      expect(preparation).toMatchObject({ status: "READY", current_sha256: null });
      const persistence = (await rpc(3, "tools/call", {
        name: "persist_workspace_artifact",
        arguments: {
          prepareToken: preparation.prepare_token,
          preparationReceiptId: preparation.receipt_id,
          candidateSha256: preparation.candidate_sha256,
          expectedCurrentSha256: preparation.current_sha256,
        },
      })).result.structuredContent;
      expect(persistence).toMatchObject({
        status: "WRITTEN",
        operation: "CREATE",
        read_back_verified: true,
        sha256: preparation.candidate_sha256,
      });
      expect(await readFile(`${root}/docs/specs/mcp-e2e.md`, "utf8"))
        .toBe("# MCP end to end\n");
    } finally {
      child.stdin.end();
      await once(child, "exit");
      lines.close();
    }
    expect(errors.join("")).toBe("");
  });
});
