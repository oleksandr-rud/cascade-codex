#!/usr/bin/env bun

import { main as campaignMain } from "./cascade/campaigns";
import { printError } from "./cascade/common";
import { main as evalMain } from "./cascade/evals";
import { main as patternsMain } from "./cascade/patterns";
import { main as simulationMain } from "./cascade/simulations";
import { main as targetMain } from "./cascade/target";
import { main as validateMain } from "./cascade/validate";

const [command, ...args] = Bun.argv.slice(2);

async function main(): Promise<number> {
  switch (command) {
    case "validate":
      return validateMain(args);
    case "eval":
      return evalMain(args);
    case "patterns":
      return patternsMain(args);
    case "target":
      return targetMain(args);
    case "campaign":
      return campaignMain(args);
    case "simulation":
      return simulationMain(args);
    case "--help":
    case "-h":
    case undefined:
      console.log(`Cascade Bun tooling

Usage:
  bun scripts/cascade.ts validate
  bun scripts/cascade.ts eval <catalog|audit|run|evaluate|judge|coverage|self-test>
  bun scripts/cascade.ts patterns <options>
  bun scripts/cascade.ts target <inventory|init-manifest|validate|drift|self-test>
  bun scripts/cascade.ts campaign catalog [--check|--write]
  bun scripts/cascade.ts campaign validate <campaign-id-or-path>
  bun scripts/cascade.ts campaign run <campaign-id-or-path> [--run-id ID]
  bun scripts/cascade.ts campaign self-test
  bun scripts/cascade.ts simulation init <simulation-id> --owner-lane W-NNN
    [--title "Title"] [--reference-date YYYY-MM-DD] [--dry-run]
`);
      return 0;
    default:
      throw new Error(`unknown command: ${command}`);
  }
}

try {
  process.exitCode = await main();
} catch (error) {
  process.exitCode = printError(error);
}
