#!/usr/bin/env bun

import { printError } from "./cascade/common";
import { main as campaignMain } from "./cascade/campaigns";
import { main as evalMain } from "./cascade/evals";
import { main as patternsMain } from "./cascade/patterns";
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
    case "--help":
    case "-h":
    case undefined:
      console.log(`Cascade Bun tooling

Usage:
  bun scripts/cascade.ts validate
  bun scripts/cascade.ts eval <catalog|audit|run|evaluate|judge|coverage|self-test>
  bun scripts/cascade.ts patterns <options>
  bun scripts/cascade.ts target <inventory|init-manifest|validate|drift|self-test>
  bun scripts/cascade.ts campaign <list|validate|run> [campaign-id]
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
