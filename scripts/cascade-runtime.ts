#!/usr/bin/env bun

import { CascadeError, printError } from "./cascade/common";

export type CoreRuntimeCommand =
  | "closeout"
  | "admission"
  | "workflow"
  | "target"
  | "patterns"
  | "work";

interface CommandModule {
  main(args: string[]): Promise<number>;
}

type CommandLoader = () => Promise<CommandModule>;

const DEFAULT_LOADERS: Record<CoreRuntimeCommand, CommandLoader> = {
  closeout: () => import("./cascade/closeout"),
  admission: () => import("./cascade/admission"),
  workflow: () => import("./cascade/plugin-workflow"),
  target: () => import("./cascade/target"),
  patterns: () => import("./cascade/patterns"),
  work: () => import("./cascade/work-audit"),
};

const SOURCE_ONLY_SUBCOMMANDS = new Map<string, Set<string>>([
  ["admission", new Set(["corpus"])],
  ["workflow", new Set(["catalog"])],
  ["target", new Set(["self-test"])],
]);

export function coreRuntimeHelpText(): string {
  return `Cascade core target runtime

Usage:
  cascade closeout <snapshot|check|path>
  cascade admission <validate|assess|explain|check-envelope>
  cascade workflow <validate-selection|validate-plan>
  cascade target <inventory|init-manifest|refresh-manifest|validate|drift|probe-commands>
  cascade patterns <options>
  cascade work <audit|automation-prompt>

The source checkout retains plugin development, harness evaluation, simulation
campaign, catalog-generation, and deterministic self-test commands. They are
intentionally absent from the target runtime profile.`;
}

export async function executeCoreRuntime(
  argv: readonly string[],
  options: {
    loaders?: Partial<Record<CoreRuntimeCommand, CommandLoader>>;
    writeLine?: (value: string) => void;
  } = {},
): Promise<number> {
  const [rawCommand, ...args] = argv;
  if (rawCommand === undefined || rawCommand === "--help" || rawCommand === "-h") {
    (options.writeLine ?? console.log)(coreRuntimeHelpText());
    return 0;
  }
  if (!(rawCommand in DEFAULT_LOADERS)) {
    throw new CascadeError(
      `command is not available in the core target runtime: ${rawCommand}`,
    );
  }
  const command = rawCommand as CoreRuntimeCommand;
  const sourceOnly = SOURCE_ONLY_SUBCOMMANDS.get(command);
  if (args[0] && sourceOnly?.has(args[0])) {
    throw new CascadeError(
      `${command} ${args[0]} is source-checkout-only and is not shipped in the core target runtime`,
    );
  }
  const loader = options.loaders?.[command] ?? DEFAULT_LOADERS[command];
  return (await loader()).main(args);
}

if (import.meta.main) {
  try {
    process.exitCode = await executeCoreRuntime(Bun.argv.slice(2));
  } catch (error) {
    process.exitCode = printError(error);
  }
}
