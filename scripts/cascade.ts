#!/usr/bin/env bun

import { main as campaignMain } from "./cascade/campaigns";
import { main as admissionMain } from "./cascade/admission";
import { main as briefMain } from "./cascade/briefs";
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
    case "admission":
      return admissionMain(args);
    case "brief":
      return briefMain(args);
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
    [--confirmation-receipt PATH]
  bun scripts/cascade.ts campaign resume <run-id> --lease-id ID
    [--recovery SUBJECT] [--recovery-reason TEXT]
  bun scripts/cascade.ts campaign verify <run-id>
  bun scripts/cascade.ts campaign self-test
  bun scripts/cascade.ts admission validate
  bun scripts/cascade.ts admission assess --request "..." [--authority VALUE]
    [--task-id SESSION] [--output .artifacts/task-admission/FILE.json]
  bun scripts/cascade.ts admission explain --request "..."
  bun scripts/cascade.ts admission check-envelope --file PATH
  bun scripts/cascade.ts admission corpus
  bun scripts/cascade.ts brief list
  bun scripts/cascade.ts brief validate <brief-id-or-path>
  bun scripts/cascade.ts brief generate <brief-id-or-path> [--check|--write]
  bun scripts/cascade.ts brief check
  bun scripts/cascade.ts simulation init <simulation-id> --owner-lane W-NNN
    [--title "Title"] [--reference-date YYYY-MM-DD] [--dry-run]
    Output root: product-evals/simulations/product/<simulation-id>/
  bun scripts/cascade.ts simulation derive-population P-NNN
    --simulation <simulation-id>
    --mode <representative|coverage|stress|counterfactual> (--dry-run|--write)
  bun scripts/cascade.ts simulation dispose-refinement --proposal <path>
    --disposition-id <id> --decision <accepted|rejected|needs-evidence|simulator-repair>
    --reviewer <identity> [--evidence-manifest <path>] (--dry-run|--write)
  bun scripts/cascade.ts simulation intake <campaign-id-or-path> --envelope <path>
    [--brief PB-NNN|docs/specs/.../brief.yaml] [--check|--write]
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
