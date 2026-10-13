# Composition and authority

The profile is the purpose of the specification, not the technology stack.
Its baseline identifies information that normally belongs in that profile.
Conditional modules are selected by the LLM from the actual scope. A baseline
block may be omitted with a concrete reason when the subject makes it inapplicable;
it may not be removed to conceal a material missing decision.

## One owning contract per fact

Keep one main `SPEC.md` per subject. Separate normative requirements from examples
and options. Use stable `F-`, `SC-`, `UI-`, `OP-`, `H-`, `D-`, `R-`, `AC-`, `DEC-`
and `DG-` IDs; the prefixes are conventions, not semantic classification rules.

Specify authority field by field. If an OpenAPI file owns wire payloads, the
operation section owns purpose, authorization, completion and handler bindings
and references exact OpenAPI operations. If no such file exists, define the
payload in the spec. Use the same rule for SQL/ORM schemas, UI designs and config.
Linked contracts must actually exist or be explicitly defined as future outputs.
Generated projections may repeat facts, but identify their owner and regeneration.

Mark `CURRENT` versus `TARGET` behavior and `DECIDED`, `PROPOSED`, `UNKNOWN` or
`CONFLICTING` decisions. Specify concrete values for material choices; do not
replace them with a taxonomy of statuses. Statuses annotate the design.

## Policy selection

The authoring path and W policies in [development-path.md](development-path.md)
control how decisions are developed. They are separate from the S policy catalog,
which controls spec content. A skipped W method does not excuse a missing material
contract or acceptance case; it can mean the necessary decision is already known.

Use a short table of policy ID, `INCLUDE / OMIT / UNRESOLVED`, reason and applicable
source. Close `requires` dependencies before composing the dependent block.
Dependency closure means the information is available, not another compulsory
file. A parent spec can supply it for a scenario, test or feature change.

Avoid a requirement warehouse beside a second technical spec. Each policy owns
one substantive section; cross-link it elsewhere. Metadata and open questions
do not need decorative diagrams. A shared diagram may serve several blocks if
its caption names them and bindings remain clear.

## Readiness

- `DRAFT`: exploration or material gaps remain; retain useful resolved sections.
- `READY_FOR_REVIEW`: coherent scope, proposed choices and owned open questions
  can be assessed. This is not acceptance or permission to implement.
- `READY_FOR_IMPLEMENTATION`: the requested scope's material behavior, architecture,
  fields, data integrity, UI if present, operations and acceptance are resolved;
  essential owning contracts are present; semantic consistency review passes.

Record syntax, rendering, contract review and execution separately as
`PASS / FAIL / NOT_RUN / NOT_APPLICABLE`, each with its actual evidence. A syntax
pass does not establish correct meaning. Missing implementation tests remain
`NOT_RUN` even when the spec is ready to implement.

## Updating a specification

For a feature, bind the exact baseline and changed contract IDs. Describe added,
modified and preserved behavior, affected callers/data/tests and compatibility.
Update the owning sections and impacted diagrams only. Keep decision rationale
short and project-specific. Do not install a memory runtime or rewrite repository
instructions as a side effect of authoring a spec.
