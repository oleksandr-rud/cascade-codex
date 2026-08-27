# Quality planning rules

## Admission

A READY plan requires an accepted behavior identity, acceptance intent, named
decision owner, relevant actors and states, changed boundaries, risks, and an
executable evidence route. Missing product intent is a GAP, not a QA-authored
story.

## Evidence classes

Keep these distinct: source inspection, structural validation, unit,
contract, integration, functional, browser, API, CLI, accessibility, security,
performance, visual, semantic evaluation, simulation, provider, deployment,
and release. Evidence from one class never silently proves another.

## Proportionality

Select only checks that protect a changed contract, material risk, consumer,
or user path. A plugin-only documentation change does not automatically need a
browser run. A product-visible cross-boundary change normally needs a
functional path and read-back evidence.

## Gates

A gate names its acceptance authority, required evidence, failure and stop
conditions, and the adapter that can collect evidence. QA recommends; a named
release or product authority accepts.
