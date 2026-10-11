# Coverage of the six specification profiles

The package contains 18 content policies and seven development policies. They
are independently authored adaptations of selected mechanics. No whole remote
SKILL.md, implementation script or framework runtime was imported into the kit.
This records authored scope and source adoption; it is not a measured percentage
of textual similarity or proof that every external method has been reproduced.
See [the source audit](sources.md) for exact methods and OpenWorkbench limits.

## Check the full authoring path for each subject

S01 supplies the interview on every profile. Every profile defines concrete
contracts for its subject, S14 acceptance and a consistency/preservation review.
W01 ideation, W02 research and W03 choices are conditional on real unknowns.
W04 develops checks; W05 reviews material contract agreement. A policy omitted
because the answer is known does not mean its necessary result can be absent.
W06 selects a design method for an actual interaction or design gap. W07 plans
a test or user-simulation campaign only when the cases need coordination. Both
preserve the selected method's native inputs, evidence and authority.

| Profile | Concrete contract and acceptance | Conditional methods and extra blocks |
|---|---|---|
| FULL_APPLICATION | Functions/scenarios, architecture, interfaces, handlers, data/UI where present, operating commands and observable end-to-end results | W02 technical facts; W03 architecture and failure ordering; W04 test levels/fixtures; S06/S09–S12 when the subject needs them; S18 quality targets |
| PRODUCT | User problem, value, capabilities, domain meaning, success scenarios and evidence of the useful result | W01 alternatives; W02 demand/competitors; W03 chosen product mechanism; W04 validation method; do not invent backend modules unless software detail is requested |
| COMPANY | Offerings, responsibilities, process inputs/outputs, handoffs, exceptions and observable operating outcomes | W02 domain/market evidence; W03 responsibility/process alternatives; S10 operating rules; S15 consequential choices; software policies only for an actual software scope |
| SCENARIO | Actor, trigger, preconditions, steps, alternatives, failure/recovery, postconditions and oracle tied to a parent where present | W02 an uncertain domain/provider guarantee; W03 unresolved step or owner; W04 reproducible scenario check; inherited contracts stay referenced |
| TEST | Exact behavior baseline, risks, test levels, fixtures, actions, oracle, environment, cleanup and planned execution evidence | W04 for new/substantially revised cases; W02 uncertain test assumptions/dependencies; W03 testability gaps; S18 measurable quality targets; parent rules/data/access stay referenced |
| FEATURE_CHANGE | Exact current baseline, target delta, affected consumers, compatibility/migration, regression and new acceptance | W02 new dependency/version facts; W03 changed decisions only; W04 regression boundaries; S16 plus affected UI/API/handler/data/effect blocks |

When the baseline or owner behavior is unresolved, retain a draft; do not invent
accepted behavior to make a TEST or FEATURE_CHANGE profile appear complete.
For company/product acceptance, an observation or business experiment may be
the useful evidence; a software unit test is not automatically appropriate.

## Method configuration follows the decision

An optional [policy binding](policy-bindings.md) can select source collection
analysis, market research, pattern selection or QA design. It does not route
every profile through every specialist. For example, TEST may need research
about the actual database guarantee and W04 case design without any market skill.

## Evidence limits

The templates and policies are authored for all six profiles. DeskSlot demonstrates
full-application contracts and a developed storage decision; its
[test specification](../assets/examples/deskslot/TEST.md) demonstrates W04 with a
proposed baseline. Its app is not implemented and test execution is NOT_RUN.
The other four profiles have templates and reviewed guidance, but no filled,
executed product specimen in this package. No six-profile model-generation
campaign or GPT-6.1 Sol qualification has been run. Format checks, rendering and
host smoke tests provide their stated evidence only.
