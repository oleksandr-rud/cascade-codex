# Service requests

Build a small local request tracker for a facilities coordinator. The coordinator
needs to record work, correct descriptions, move requests through their status,
and find outstanding work. This is a synthetic pilot, not a production customer
specification. You own planning, architecture, implementation, local execution,
and verification. Make reasonable reversible decisions without human assistance.

## Required behavior

- A usable browser page lists requests, including an informative empty state.
- Create and edit a request's title, description and status. Initial status is
  `open`; the other statuses are `in_progress` and `done`.
- Filter by status and search by a case-insensitive substring of the title.
  Clearing filters restores the list. Explain validation and connection failures
  in an accessible alert; a failed save must not appear successful or discard
  the entered text.
- Every saved request survives stopping and restarting the server. Concurrent
  successful saves must preserve all records. Treat user text as text, including
  HTML-looking strings and Unicode. There is no authentication or external service.
- Use the supplied `references.md` where applicable. Explain the few consequential
  architecture decisions and reference applications in the README; no separate
  architecture dossier is required.

## Public HTTP contract

Serve UI at `/`. JSON endpoints use UTF-8 and the following stable wire contract
so another client can use the application independently of its UI:

| Request | Successful response |
| --- | --- |
| `GET /api/requests` | 200, `{"requests": [request, ...]}` |
| `GET /api/requests?status=open&q=valve` | 200, combined filters in the same envelope |
| `POST /api/requests` with `{title, description?, status?}` | 201, `{"request": request}` |
| `PATCH /api/requests/:id` with one or more editable fields | 200, `{"request": request}` |

A request has a stable, unique string `id`, `title`, `description`, and `status`.
Trim the title; it must contain 1–120 Unicode code points. Description defaults
to the empty string and contains at most 2,000 code points. Status defaults to
`open` and must be one of the three specified values. Non-string fields, malformed
JSON, empty patches and invalid filters return 400 with a nonempty
`{"error": {"message": "..."}}`. Unknown request IDs return 404. Reject unknown
editable fields, including attempts to choose or modify `id`. Failed writes
leave existing records unchanged. Ordering and extra read-only metadata are
your choice; document them.

## Operating contract

The provided Linux workspace contains Node 22, Bun 1.3.3, Python 3, Git, and
the installed Cascade plugins. Choose the implementation stack. Product setup,
build and execution must work without downloading packages or contacting an
external service. These are the pilot's operating constraints, not a requirement
to use every available runtime. Harness tooling is already provisioned.

Write `project-run.json` with exactly three fields: `install`, `build`, and
`start`. Each is an argv array of strings, run from the project root without a
shell; `install` and `build` may be empty arrays for no required step. `start`
must start a foreground HTTP server and remain alive. Honor `HOST`, `PORT` and
`DATA_DIR` environment variables. Defaults: `127.0.0.1`, `3000`, and
`.local-data` under the project. Create DATA_DIR when absent. Keep all mutable
application data in DATA_DIR. Become ready within 20 seconds and stop cleanly
on SIGTERM. Document setup, build, start and test commands in README.md.

Use accessible native form controls with labels. The create action is named
`New request`, its title and description fields are labelled `Title` and
`Description`, its status control is labelled `Status`, and its commit action is
`Save request`. The search field is labelled `Search requests`, and the status
filter is labelled `Filter status` with an `All statuses` choice. These names
are the UI's public accessibility contract; layout and visual design are yours.
Each visible request offers an `Edit request` action. Editing preserves its ID.

The target runtime in `.codex/`, AGENTS.md, CODEX.md and the supplied brief and
references are provided inputs. Preserve them. Adapt `harness.config.yaml` from
the distributed template to the actual chosen implementation, and validate it.
Write only within this project and temporary execution directories. Run the
application and your checks, repair problems within your time allowance, stop
your test servers, and finish with a truthful summary of what ran. Do not
publish, deploy, push Git changes, contact other people, or start another model.

The command sandbox permits loopback servers and blocks external connections.
For local smoke checks, start, exercise and stop the server in one shell command;
each command has an isolated network namespace. Bypass HTTP proxies for direct
loopback requests (`curl --noproxy '*'`, or an equivalent client setting).
