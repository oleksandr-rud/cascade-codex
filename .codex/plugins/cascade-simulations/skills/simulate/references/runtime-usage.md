# Compact run controller

Run these commands from the `simulate` skill directory. Use a temporary run
directory unless durable evidence was requested. Never include credentials,
tokens, or unnecessary private target data in controller arguments or events.

Validate the two authored inputs:

```bash
uv run --with pyyaml --with jsonschema python scripts/validate_simulation.py \
  --simulation assets/simulation.yaml \
  --adapter assets/adapter.yaml
```

Start only after mapping actual current Codex tools to every required adapter
capability. Each supplied binding must exactly match the frozen adapter binding:

```bash
uv run --with pyyaml --with jsonschema python scripts/simulation_runtime.py start \
  --simulation assets/simulation.yaml \
  --adapter assets/adapter.yaml \
  --run-dir <RUN_DIR> \
  --run-id <RUN_ID> \
  --binding browser.observe=codex-host/browser.observe \
  --binding browser.navigate=codex-host/browser.navigate \
  --binding browser.interact=codex-host/browser.interact
```

Before one target tool call, authorize the exact adapter action. Treat the
returned token as authority only for the immediate bound dispatch:

```bash
uv run --with pyyaml --with jsonschema python scripts/simulation_runtime.py authorize \
  --run-dir <RUN_DIR> \
  --action interact \
  --input-json '<JSON_OBJECT>' \
  --idempotency-key <RUN_SCOPED_KEY> \
  --expected-tool-calls 1
```

The controller permits only actions listed in the frozen
`simulation.authority.allowed_actions`. Add `--confirmed` only after the current
Codex host has obtained the confirmation required by an `always` action; the
flag records that fact but cannot manufacture human approval.

Immediately call the bound Codex target tool, then record its result before
selecting another action:

```bash
uv run --with pyyaml --with jsonschema python scripts/simulation_runtime.py record \
  --run-dir <RUN_DIR> \
  --dispatch-token <TOKEN> \
  --outcome PASS \
  --observation-name <DECLARED_OBSERVATION> \
  --observation '<GROUNDED_OBSERVATION>' \
  --evidence-json '<EVIDENCE_ARRAY>' \
  --actor-state-json '<FULL_DECLARED_ACTOR_STATE>' \
  --state-transition '<EXACT_DECLARED_WHEN_TEXT>' \
  --state-evidence '<GROUNDED_TRIGGER_EVIDENCE>' \
  --duration-seconds <SECONDS>
```

Omit the three state options when state is unchanged. The controller carries
the current state forward. A changed state must exactly match one declared
transition; arbitrary variables or values are rejected. `state-evidence` is a
short observation reference, not hidden reasoning.

Every observation is produced by a declared action and therefore follows the
same authorize, target-tool, and record sequence. For reconciliation, authorize
the adapter's dedicated purpose-recovery action. The controller derives intent
from that action, rejects any undeclared recovery path, and consumes the normal
action, tool-call, and recovery bounds. If a mutation remains uncertain, record
`UNKNOWN_OUTCOME` and do not replay it.

Execute applicable cleanup as an ordinary declared action before finish and
record its declared verification observation. It becomes the final target
action; the controller rejects further dispatch. A `VERIFIED` cleanup status is
rejected unless that exact final cleanup action completed with PASS. Then
inspect, finish, and verify:

```bash
uv run --with pyyaml --with jsonschema python scripts/simulation_runtime.py status \
  --run-dir <RUN_DIR>

uv run --with pyyaml --with jsonschema python scripts/simulation_runtime.py finish \
  --run-dir <RUN_DIR> \
  --status <TERMINAL_STATUS> \
  --reason '<REASON>' \
  --cleanup-status <CLEANUP_STATUS> \
  --cleanup-details '<DETAILS>'

uv run --with pyyaml --with jsonschema python scripts/simulation_runtime.py verify \
  --run-dir <RUN_DIR>
```

The run directory contains only `contract.json`, `events.jsonl`, and the final
`result.json`. Validate results only with the controller `verify` command; the
definition validator intentionally does not accept a standalone result without
its journal. The controller refuses missing or mismatched host bindings,
undeclared actions,
insufficient authority, reused idempotency keys, budget overflow, blind replay,
incomplete ACHIEVED evidence, digest drift, and result/journal disagreement.
