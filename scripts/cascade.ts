#!/usr/bin/env bun

import { printError } from "./cascade/common";
import { executeCascadeCommand } from "./cascade/cli/command-dispatcher";

const cancellation = new AbortController();
const cancel = () => cancellation.abort();
if (Bun.argv[2] === "campaign" && ["run", "resume"].includes(Bun.argv[3] ?? "")) {
  process.once("SIGINT", cancel);
  process.once("SIGTERM", cancel);
}
try {
  process.exitCode = await executeCascadeCommand({ argv: Bun.argv.slice(2), signal: cancellation.signal });
} catch (error) {
  process.exitCode = printError(error);
} finally {
  process.removeListener("SIGINT", cancel);
  process.removeListener("SIGTERM", cancel);
}
