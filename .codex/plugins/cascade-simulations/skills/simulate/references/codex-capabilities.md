# Codex-host capability binding

Use this reference only when selecting or authoring an adapter. A surface is
the environment being tested. A capability is an operation the current Codex
host can actually perform. A target is the concrete application, process,
endpoint, device, or agent. Never infer tool availability from a surface name.

| Surface | Required capability family | Typical Codex host tool |
|---|---|---|
| `command` | `command.execute` | bounded shell command execution |
| `http` | `http.request` | an HTTP tool or bounded request command |
| `terminal` | `terminal.observe`, `terminal.write` | persistent terminal session control |
| `browser` | `browser.observe`, `browser.navigate`, `browser.interact` | browser or Playwright control |
| `desktop` | `desktop.observe`, `desktop.interact` | desktop accessibility or computer control |
| `mobile` | `mobile.observe`, `mobile.interact` | device or emulator control |
| `agent-response` | `agent.invoke`, `agent.observe` | an explicitly identified target-agent interface |

Rules:

- Browser means visible web UI. HTTP means direct API. Never substitute one for
  the other unless both surfaces are explicitly authorized by the simulation.
- Command means one bounded invocation. Terminal means one persistent session.
- Desktop and mobile are executable only when compatible host controls are
  available for the declared platform and target.
- Agent response targets another declared system. The simulation actor is not
  its own target.
- Bind exact current tools during preflight. Adapter profiles name normalized
  capabilities and example binding identities, not guaranteed installations.
  Replace profiles with the exact current host-tool identities and freeze the
  capability-to-tool mapping before the run.
- Tool availability is capability, not authority. The frozen simulation
  authority must separately allow the exact adapter action.
- Use only the adapter actions whose capability binding passed preflight.
- An observation is a typed result produced by one or more declared actions; it
  is not an alternate operation path. Fresh inspection and reconciliation calls
  require the normal controller receipt.
- Record controller dispatch before the target tool call and record the result
  before selecting another action.
