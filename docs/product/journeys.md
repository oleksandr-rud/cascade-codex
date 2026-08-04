# Product Journeys

Describe user journeys with starting state, action, expected visible outcome,
and measurable acceptance checks.

| ID | Persona | Type | Covers Scenario IDs | Functional Evidence | Status |
|---|---|---|---|---|---|
| J-001 | Cascade maintainer | happy / failure | `PS-006`, `PS-007`, `PS-008` | `brief list`, `brief validate`, and `brief generate --check` plus negative contract tests | `reviewed` |
| J-002 | Cascade maintainer and simulation team | happy / failure / stale / handoff | `PS-009`, `PS-010`, `PS-011`, `PS-012` | admission corpus, simulation intake compile/check, campaign validation/run preflight, and role-routing checks | `reviewed` |

## J-001 Carried State

The maintainer selects one stable domain and capability, then one manifest
selects exact owner rows, methodological evidence, simulation authority, and
reusable context sections. Validation resolves the complete graph before a
brief is rendered. The generated file carries catalog and manifest digests; a
source change makes it stale rather than silently changing its authority.

## J-002 Carried State

The maintainer's request first becomes a W-031 Task Envelope. The simulation
author binds its active claims to a scope-correct campaign and, for product
scope, one current product brief. Intake compilation records exact action and
policy digests. Only a READY intake can pass to the operator; immutable run
evidence then passes to a separate evaluator. Findings return either to the
simulator owner or to reviewed product synthesis and never edit product docs
implicitly.
