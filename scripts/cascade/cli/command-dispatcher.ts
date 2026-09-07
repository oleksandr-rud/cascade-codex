export type CascadeCommandName =
  | "validate"
  | "eval"
  | "patterns"
  | "policy"
  | "target"
  | "campaign"
  | "admission"
  | "brief"
  | "simulation"
  | "work"
  | "workflow";

export interface CascadeCommandModule {
  main(args: string[]): Promise<number>;
}

export type CascadeCommandLoader = () => Promise<CascadeCommandModule>;

export type CascadeCommandLoaders = Record<
  CascadeCommandName,
  CascadeCommandLoader
>;

export interface CascadeCommandInvocation {
  argv: readonly string[];
}

export interface CascadeCommandDispatcherOptions {
  loaders?: Partial<CascadeCommandLoaders>;
  writeLine?: (value: string) => void;
}

const DEFAULT_LOADERS: CascadeCommandLoaders = {
  validate: () => import("../validate"),
  eval: () => import("../evals"),
  patterns: () => import("../patterns"),
  policy: () => import("../policies"),
  target: () => import("../target"),
  campaign: () => import("../campaigns"),
  admission: () => import("../admission"),
  brief: () => import("../briefs"),
  simulation: () => import("../simulations"),
  work: () => import("../work-audit"),
  workflow: () => import("../plugin-workflow"),
};

const COMMAND_NAMES = new Set<CascadeCommandName>(
  Object.keys(DEFAULT_LOADERS) as CascadeCommandName[],
);

export function cascadeHelpText(): string {
  return `Cascade Bun tooling

Usage:
  cascade validate
  cascade eval <catalog|audit|run|evaluate|judge|coverage|self-test>
  cascade patterns <options>
  cascade policy validate [--scope admission|product|all]
  cascade policy list [--scope admission|product|all] [--format json|yaml]
  cascade policy extract --id POLICY_ID [--scope admission|product|all]
  cascade policy compile [--scope admission|product|all] [--format json|yaml] [--check]
  cascade target <inventory|init-manifest|validate|drift|self-test>
  cascade campaign registry [--check|--write]
    (catalog remains a compatibility alias)
  cascade campaign validate <campaign-id-or-path>
  cascade campaign run <campaign-id-or-path> [--run-id ID]
    [--confirmation-receipt PATH]
  cascade campaign resume <run-id> --lease-id ID
    [--recovery SUBJECT] [--recovery-reason TEXT]
  cascade campaign verify <run-id>
  cascade campaign self-test
  cascade admission validate
  cascade admission assess --request "..." [--authority UNTRUSTED_CANDIDATE]
    [--task-id SESSION] [--output .artifacts/task-admission/FILE.json]
    --authority records an untrusted candidate only; it never grants access.
  cascade admission explain --request "..."
  cascade admission check-envelope --file PATH
  cascade admission corpus
  cascade workflow catalog [--check|--write] [--output PATH]
  cascade workflow validate-selection --selection PATH --envelope PATH
  cascade workflow validate-plan --plan PATH --selection PATH --envelope PATH
  cascade brief list
  cascade brief validate <brief-id-or-path>
  cascade brief generate <brief-id-or-path> [--check|--write]
  cascade brief check
  cascade work audit [--json] [--check]
  cascade work automation-prompt [--mode audit|orchestrate]
  cascade simulation init <simulation-id> --owner-lane W-NNN
    [--title "Title"] [--reference-date YYYY-MM-DD] [--dry-run]
    Output root: product-evals/simulations/product/<simulation-id>/
  cascade simulation derive-population P-NNN
    --simulation <simulation-id>
    --mode <representative|coverage|stress|counterfactual> (--dry-run|--write)
  cascade simulation dispose-refinement --proposal <path>
    --disposition-id <id> --decision <accepted|rejected|needs-evidence|simulator-repair>
    --reviewer <identity> [--evidence-manifest <path>] (--dry-run|--write)
  cascade simulation intake <campaign-id-or-path> --envelope <path>
    --expected-request-digest <sha256> --expected-source-digest <sha256>
    [--brief PB-NNN|docs/specs/.../brief.yaml] [--check|--write]`;
}

export async function executeCascadeCommand(
  invocation: CascadeCommandInvocation,
  options: CascadeCommandDispatcherOptions = {},
): Promise<number> {
  const [rawCommand, ...rawArgs] = invocation.argv;
  if (rawCommand === undefined || rawCommand === "--help" || rawCommand === "-h") {
    (options.writeLine ?? console.log)(cascadeHelpText());
    return 0;
  }
  if (!COMMAND_NAMES.has(rawCommand as CascadeCommandName)) {
    throw new Error(`unknown command: ${rawCommand}`);
  }

  const command = rawCommand as CascadeCommandName;
  const loader = options.loaders?.[command] ?? DEFAULT_LOADERS[command];
  const module = await loader();
  return module.main([...rawArgs]);
}
