# Model Tier Selection

Model tiers describe operating envelopes, not providers or permanent model
rankings. Use the versioned registry as a candidate catalog and representative
evaluation as the authority for a workload.

## Neutral Tiers

1. `efficient-structured`: high-volume, low-latency, well-scoped tasks with
   explicit schemas, examples, and bounded tools.
2. `balanced-production`: everyday production work needing reliable
   instruction following, moderate reasoning, retrieval, or tool use.
3. `frontier-generalist`: difficult diagnosis, synthesis, coding, research, or
   multimodal work where ambiguity and long dependencies materially raise the
   failure rate.
4. `frontier-autonomous`: long-horizon, high-autonomy work with broad tools,
   recovery, planning, and sustained state management.

Tier order expresses increasing operating envelope, not guaranteed quality on
every task.

## Selection Algorithm

1. Derive hard capability requirements from the task profile.
2. Exclude tiers and model configurations that cannot meet them.
3. If the user named a model, retain it when capable. If it is not capable,
   explain the mismatch and recommend a fallback; never silently override it.
4. Among eligible configurations, choose the lowest-cost and lowest-latency
   tier known to meet the quality threshold on representative cases.
5. If no representative evidence exists, choose a conservative candidate and
   label the decision `INFERRED`, not proven or best.
6. Record a fallback and an escalation trigger.

## Effective Configuration

The unit of selection is not a model name alone:

`model + reasoning mode + tools + context plan + output controls`

Provider-specific parameters belong in the registry or surface adapter. The
prompt architecture branches on the neutral tier and task overlays.

## Escalation And Downgrade

Escalate only after context, instruction, schema, or tool defects are ruled out,
or when a hard capability is missing. Downgrade when a lower tier passes the
same representative cases within the accepted quality margin.

The skill can recommend and render a configuration. It cannot claim to switch
or execute a model unless the active surface exposes an authorized runtime tool.
