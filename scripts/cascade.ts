#!/usr/bin/env bun

import { main as campaignMain } from "./cascade/campaigns";
import { printError } from "./cascade/common";
import { main as simulationMain } from "./cascade/simulations";

const [command, ...args] = Bun.argv.slice(2);

async function main(): Promise<number> {
  switch (command) {
    case "campaign":
      return campaignMain(args);
    case "simulation":
      return simulationMain(args);
    case "--help":
    case "-h":
    case undefined:
      console.log(`Cascade simulation tooling

Usage:
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
