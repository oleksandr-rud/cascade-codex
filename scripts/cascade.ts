#!/usr/bin/env bun

import { printError } from "./cascade/common";
import { executeCascadeCommand } from "./cascade/cli/command-dispatcher";

try {
  process.exitCode = await executeCascadeCommand({ argv: Bun.argv.slice(2) });
} catch (error) {
  process.exitCode = printError(error);
}
