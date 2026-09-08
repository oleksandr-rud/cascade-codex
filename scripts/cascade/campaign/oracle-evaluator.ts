import { resolve } from "node:path";

import {
  CascadeError,
  boundedPath,
  isFile,
  stableJson,
} from "../common";
import type {
  OracleResult,
  TaskCommandResult,
  TaskHttpResult,
  TaskOracleEvaluator,
} from "./task-adapter";
import type { OracleDefinition } from "../simulation-definitions";

function valuesEqual(left: unknown, right: unknown): boolean {
  return stableJson(left) === stableJson(right);
}

function pathParts(path: string): string[] {
  const parts = path.split(".").filter(Boolean);
  if (!parts.length || parts.some((part) => part === "__proto__")) {
    throw new CascadeError(`invalid state path: ${path}`);
  }
  return parts;
}

function getStatePath(state: Record<string, unknown>, path: string): unknown {
  let current: unknown = state;
  for (const part of pathParts(path)) {
    if (!current || typeof current !== "object" || Array.isArray(current)) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

async function evaluateOracle(
  oracle: OracleDefinition,
  state: Record<string, unknown> | undefined,
  command: TaskCommandResult | undefined,
  http: TaskHttpResult | undefined,
  taskRoot: string,
): Promise<OracleResult> {
  if (oracle.type === "state-equals") {
    const actual = state && oracle.path ? getStatePath(state, oracle.path) : undefined;
    return {
      oracle_id: oracle.id,
      type: oracle.type,
      status: valuesEqual(actual, oracle.expected) ? "PASS" : "FAIL",
      expected: oracle.expected,
      actual,
    };
  }
  if (oracle.type === "exit-code") {
    const actual = command?.exit_code;
    return {
      oracle_id: oracle.id,
      type: oracle.type,
      status: actual === oracle.expected_exit_code ? "PASS" : "FAIL",
      expected: oracle.expected_exit_code,
      actual,
    };
  }
  if (oracle.type === "http-status") {
    const actual = http?.status;
    return {
      oracle_id: oracle.id,
      type: oracle.type,
      status: actual === oracle.expected_status ? "PASS" : "FAIL",
      expected: oracle.expected_status,
      actual,
    };
  }
  const file = oracle.file!;
  const present = await isFile(
    oracle.type === "task-file-exists"
      ? resolve(taskRoot, file)
      : boundedPath(file),
  );
  return {
    oracle_id: oracle.id,
    type: oracle.type,
    status: present ? "PASS" : "FAIL",
    expected: true,
    actual: present,
    evidence: file,
  };
}

export function createTaskOracleEvaluator(): TaskOracleEvaluator {
  return {
    evaluate: (oracle, context) =>
      evaluateOracle(
        oracle,
        context.final_state,
        context.command,
        context.http,
        context.task_root,
      ),
  };
}
