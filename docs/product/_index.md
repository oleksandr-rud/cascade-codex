# Product References

Use this area for product intent, stable domain and capability relationships,
personas, journeys, requirements, and acceptance criteria that are current
enough to guide behavior planning.

`catalog.yaml` is the machine-readable relationship authority. It assigns
stable `PD-XXX` domain and `PC-XXX` capability IDs and connects each capability
to exact product rows, source documents, and evaluation references. The linked
Markdown files remain the authority for their facts; the catalog and generated
briefs do not replace them.

Domain-owned folders are allowed only after this catalog explicitly defines
that ownership shape. Until then, use the flat owner ledgers below.

## Files

- `catalog.yaml`
- `catalog.schema.json`
- `journeys.md`
- `requirements.md`
- `scenarios.md`
- `personas/_index.md`

## Brief Assembly

Brief manifests live with their capability packet at
`docs/specs/<slice-slug>/brief.yaml`. `bun scripts/cascade.ts brief generate
<brief-id-or-path> --check` validates catalog relationships, exact product
references, evidence authority, selected pattern sections, source paths, and
the digest-bound generated projection.

Product briefs can seed product simulation intakes only through the
`simulation-intake-agent-bridge` contract. A brief remains context, not run
authorization or behavioral proof; evaluated findings return through explicit
product synthesis and composition before any owner document changes.
