# Test design rules

Every test case must trace to accepted behavior and one material risk or
contract. Preconditions describe observable state, not hidden implementation
assumptions. Actions are interface intents; expected results are observable
oracles. Evidence requirements identify what a later execution receipt must
freeze.

Risk traceability is explicit, not descriptive-only: each coverage row and
test uses a non-null stable `risk_ref`. Reuse a supplied quality-plan risk ID,
or derive one bounded `RISK-*` ID from the accepted behavior and repeat it in
the matching coverage and test entries.

Prefer deterministic assertions for exact state, schema, policy, permissions,
persistence, and read-back. Use semantic judges only for genuinely semantic
claims and keep deterministic eligibility non-compensating. Use simulations
for stateful actor behavior, not as a replacement for ordinary functional
tests.

Test data must declare whether it is synthetic, fixture, masked, production,
or prohibited. Cleanup cannot delete evidence needed by the run receipt.
