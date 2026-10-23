# Workspace MCP boundary

`cascade_workspace` is the single project-level MCP resource and artifact
adapter shared by all active plugin skills. It does not belong to a domain
plugin and does not make plugins call one another. The Codex host invokes its
tools while following the selected skill contract:

- `get_workspace_context` compiles explicit allowlisted files into one
  digest-bound, size-bounded untrusted-data bundle;
- `read_workspace_artifact` reads only a registered durable artifact kind;
- `prepare_workspace_artifact` validates destination, format, size, current
  digest, and an optional repository JSON Schema without writing;
- `persist_workspace_artifact` is a closeout-only atomic commit using the exact
  short-lived preparation token and optimistic current digest.

The destination authority is `.codex/artifact-destinations.json`. Plugin skills
produce candidate artifacts; they do not silently persist target state. The
active host verifies current user authority and validation, then `closeout`
may commit and require a read-back receipt. The service never grants authority,
dispatches a role, selects a capability, executes arbitrary commands, or turns
a Coordinator plan into automatic work. When the project MCP is unavailable,
the candidate and handoff remain usable through ordinary authorized host file
tools, preserving standalone plugin behavior.
