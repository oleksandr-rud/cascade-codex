import { basename, relative, resolve } from "node:path";

import {
  CascadeError,
  boolFlag,
  flag,
  isFile,
  parseArgs,
  readJson,
  readText,
  rel,
  rootPath,
  sha256File,
  sha256Text,
  stableJson,
  walkFiles,
} from "./common";

const ACTIVE_WORK_PATH = rootPath("docs/work/active.md");
const LANE_ROOT = rootPath("docs/work/lanes");
const REPORT_ROOT = rootPath("docs/work/reports");
const ADMISSION_POLICY_PATH = rootPath(".codex/task-admission/policies/core.json");
const ADMISSION_CASES_PATH = rootPath("harness-evals/task-admission/cases.json");

export interface AdmissionSourceIdentity {
  schema_version: number;
  policy_bundle_version: string;
  case_count: number;
}

export interface ReviewSubjectAudit {
  run_id: string | null;
  status: "CURRENT" | "DRIFTED" | "MISSING" | "NOT_DECLARED";
  manifest_path: string | null;
  changed_sources: Array<{
    path: string;
    expected_sha256: string | null;
    actual_sha256: string | null;
    reason: "CHANGED" | "MISSING" | "OUTSIDE_WORKSPACE";
  }>;
}

export type WorkDisposition =
  | "REVIEW_PENDING"
  | "IN_PROGRESS"
  | "READY"
  | "DEPENDENCY_PENDING"
  | "BLOCKED"
  | "CLOSEOUT_CANDIDATE"
  | "NEEDS_RECONCILIATION";

export interface ActiveWorkRow {
  lane: string;
  status: string;
  request: string;
  owner: string;
  next_gate: string;
  files_areas: string;
  dependencies: string;
  evidence: string;
}

export interface LaneAudit {
  lane: string;
  registry_status: string;
  lane_status: string | null;
  owner: string;
  lane_owner: string | null;
  dispatch_state: string | null;
  next_gate: string;
  lane_next_gate: string | null;
  packet_path: string | null;
  disposition: WorkDisposition;
  issues: string[];
}

export interface WorkGraphAudit {
  graph_id: string;
  status: string;
  plan_revision: string | null;
  graph_revision: string | null;
  owner: string | null;
  terminal_gate: string | null;
  next_action: string | null;
  path: string;
}

export interface WorkAuditReport {
  schema_version: 1;
  source: {
    path: string;
    sha256: string;
    admission: AdmissionSourceIdentity;
    review_subject: ReviewSubjectAudit;
  };
  authority: {
    mode: "READ_ONLY_ANALYSIS";
    may_dispatch: false;
    may_mutate_work_state: false;
    may_run_external_actions: false;
  };
  summary: {
    active_lanes: number;
    active_graphs: number;
    review_pending: number;
    in_progress: number;
    ready: number;
    dependency_pending: number;
    blocked: number;
    closeout_candidates: number;
    reconciliation_issues: number;
  };
  queue: LaneAudit[];
  graphs: WorkGraphAudit[];
  recommended_actions: Array<{
    priority: number;
    lane_ids: string[];
    route: string;
    action: string;
    authorization_required: boolean;
  }>;
}

function cleanCell(value: string): string {
  return value.trim().replace(/^`|`$/g, "").trim();
}

function parseTableLine(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map(cleanCell);
}

export function parseActiveWorkRows(markdown: string): ActiveWorkRow[] {
  const lines = markdown.split("\n");
  const headerIndex = lines.findIndex((line) =>
    /^\|\s*Lane\s*\|\s*Status\s*\|/.test(line),
  );
  if (headerIndex < 0) throw new CascadeError("active work table is missing");

  const rows: ActiveWorkRow[] = [];
  for (const line of lines.slice(headerIndex + 2)) {
    if (!line.trim().startsWith("|")) break;
    const cells = parseTableLine(line);
    if (cells.length !== 8) {
      throw new CascadeError(`active work row must have 8 columns: ${line.trim()}`);
    }
    const [lane, status, request, owner, nextGate, filesAreas, dependencies, evidence] = cells;
    if (!/^W-\d{3}$/.test(lane!)) {
      throw new CascadeError(`invalid active work lane ID: ${lane}`);
    }
    rows.push({
      lane: lane!,
      status: status!,
      request: request!,
      owner: owner!,
      next_gate: nextGate!,
      files_areas: filesAreas!,
      dependencies: dependencies!,
      evidence: evidence!,
    });
  }
  if (!rows.length) throw new CascadeError("active work table has no rows");
  const ids = rows.map((row) => row.lane);
  if (new Set(ids).size !== ids.length) throw new CascadeError("active work table has duplicate lanes");
  return rows;
}

function metadata(markdown: string, field: string): string | null {
  const match = markdown.match(new RegExp(`^${field}:\\s*(.+?)\\s*$`, "m"));
  return match ? match[1]!.trim().replace(/`/g, "") : null;
}

function normalize(value: string): string {
  return value.replace(/[`'\"]/g, "").replace(/\s+/g, " ").trim().toLowerCase();
}

async function currentAdmissionIdentity(): Promise<AdmissionSourceIdentity> {
  const policy = JSON.parse(await readText(ADMISSION_POLICY_PATH)) as {
    schema_version?: unknown;
    bundle_id?: unknown;
    bundle_version?: unknown;
  };
  const cases = JSON.parse(await readText(ADMISSION_CASES_PATH)) as {
    schema_version?: unknown;
    policy_bundle_version?: unknown;
    cases?: unknown;
  };
  if (
    !Number.isInteger(policy.schema_version)
    || typeof policy.bundle_id !== "string"
    || !Number.isInteger(policy.bundle_version)
    || !Number.isInteger(cases.schema_version)
    || typeof cases.policy_bundle_version !== "string"
    || !Array.isArray(cases.cases)
  ) {
    throw new CascadeError("task admission source identity is invalid");
  }
  const policyBundleVersion = `${policy.bundle_id}@${policy.bundle_version}`;
  if (policy.schema_version !== cases.schema_version || policyBundleVersion !== cases.policy_bundle_version) {
    throw new CascadeError("task admission policy and corpus identities differ");
  }
  return {
    schema_version: policy.schema_version as number,
    policy_bundle_version: policyBundleVersion,
    case_count: cases.cases.length,
  };
}

export function admissionDriftIssues(
  row: ActiveWorkRow,
  current: AdmissionSourceIdentity,
): string[] {
  if (row.lane !== "W-031" && row.lane !== "W-032") return [];
  const text = `${row.next_gate} ${row.evidence}`;
  const expectedBundle = current.policy_bundle_version.replace("cascade-", "");
  const pairs = [...text.matchAll(/v(\d+)[\s`]*\/[\s`]*(?:cascade-)?core@(\d+)/gi)];
  const stalePairs = pairs.filter((match) =>
    Number(match[1]) !== current.schema_version
    || `core@${match[2]}` !== expectedBundle,
  );
  if (!stalePairs.length) return [];
  const advertised = [...new Set(stalePairs.map((match) => match[0]))].join(", ");
  return [
    `ERROR: admission source drift: active row advertises ${advertised}; current authority is v${current.schema_version}/${expectedBundle} with ${current.case_count} cases`,
  ];
}

export function reviewSubjectDriftIssues(
  row: ActiveWorkRow,
  subject: ReviewSubjectAudit,
): string[] {
  if (!subject.run_id || subject.status === "CURRENT" || subject.status === "NOT_DECLARED") {
    return [];
  }
  const shortRevision = subject.run_id.match(/-(r\d+)$/i)?.[1] ?? "";
  const rowText = `${row.next_gate} ${row.evidence}`;
  if (!rowText.includes(subject.run_id) && (!shortRevision || !new RegExp(`\\b${shortRevision}\\b`, "i").test(rowText))) {
    return [];
  }
  if (subject.status === "MISSING") {
    return [`ERROR: declared immutable review subject is missing: ${subject.run_id}`];
  }
  return [
    `ERROR: immutable review subject ${subject.run_id} has ${subject.changed_sources.length} current-source drift item(s); freeze a new subject before review`,
  ];
}

export function declaredReviewRunId(markdown: string): string | null {
  return markdown.match(
    /(?:current|last reviewed)[\s\S]{0,300}?candidate is frozen at run\s+`([^`]+)`/i,
  )?.[1] ?? null;
}

async function currentReviewSubject(markdown: string): Promise<ReviewSubjectAudit> {
  const runId = declaredReviewRunId(markdown);
  if (!runId) {
    return {
      run_id: null,
      status: "NOT_DECLARED",
      manifest_path: null,
      changed_sources: [],
    };
  }
  const manifestPath = rootPath(
    ".artifacts/product-evals",
    runId,
    "execution/source-manifest.json",
  );
  if (!(await isFile(manifestPath))) {
    return {
      run_id: runId,
      status: "MISSING",
      manifest_path: rel(manifestPath),
      changed_sources: [],
    };
  }
  const manifest = await readJson<{ frozen_sources?: unknown }>(manifestPath);
  if (!Array.isArray(manifest.frozen_sources)) {
    throw new CascadeError(`review subject source manifest has no frozen_sources: ${runId}`);
  }
  const changedSources: ReviewSubjectAudit["changed_sources"] = [];
  const workspaceRoot = resolve(rootPath());
  for (const entry of manifest.frozen_sources) {
    if (
      !entry ||
      typeof entry !== "object" ||
      typeof (entry as Record<string, unknown>).source_path !== "string" ||
      typeof (entry as Record<string, unknown>).sha256 !== "string"
    ) {
      throw new CascadeError(`review subject has an invalid frozen source entry: ${runId}`);
    }
    const sourcePath = resolve((entry as { source_path: string }).source_path);
    const expected = (entry as { sha256: string }).sha256;
    const workspaceRelative = relative(workspaceRoot, sourcePath);
    if (workspaceRelative.startsWith("..") || resolve(workspaceRoot, workspaceRelative) !== sourcePath) {
      changedSources.push({
        path: sourcePath,
        expected_sha256: expected,
        actual_sha256: null,
        reason: "OUTSIDE_WORKSPACE",
      });
      continue;
    }
    if (!(await isFile(sourcePath))) {
      changedSources.push({
        path: workspaceRelative,
        expected_sha256: expected,
        actual_sha256: null,
        reason: "MISSING",
      });
      continue;
    }
    const actual = await sha256File(sourcePath);
    if (actual !== expected) {
      changedSources.push({
        path: workspaceRelative,
        expected_sha256: expected,
        actual_sha256: actual,
        reason: "CHANGED",
      });
    }
  }
  return {
    run_id: runId,
    status: changedSources.length ? "DRIFTED" : "CURRENT",
    manifest_path: rel(manifestPath),
    changed_sources: changedSources,
  };
}

export function classifyWorkDisposition(
  row: ActiveWorkRow,
  issues: string[],
): WorkDisposition {
  if (issues.some((issue) => issue.startsWith("ERROR:"))) return "NEEDS_RECONCILIATION";
  if (["COMPLETE", "SUPERSEDED"].includes(row.status)) return "CLOSEOUT_CANDIDATE";
  if (row.status === "BLOCKED") return "BLOCKED";
  if (row.status === "IN_REVIEW") return "REVIEW_PENDING";
  if (row.status === "IN_PROGRESS") return "IN_PROGRESS";
  if (/\b(after|pending|requires?|blocked|waits? for)\b/i.test(row.next_gate)) {
    return "DEPENDENCY_PENDING";
  }
  if (/\breview\b/i.test(row.next_gate)) return "REVIEW_PENDING";
  return "READY";
}

function queueRank(value: WorkDisposition): number {
  return {
    NEEDS_RECONCILIATION: 0,
    REVIEW_PENDING: 1,
    IN_PROGRESS: 2,
    READY: 3,
    CLOSEOUT_CANDIDATE: 4,
    BLOCKED: 5,
    DEPENDENCY_PENDING: 6,
  }[value];
}

async function auditLanes(
  rows: ActiveWorkRow[],
  admissionIdentity: AdmissionSourceIdentity,
  reviewSubject: ReviewSubjectAudit,
): Promise<LaneAudit[]> {
  const laneFiles = await walkFiles(LANE_ROOT, {
    include: (path) => basename(path).endsWith(".md"),
  });
  const audits: LaneAudit[] = [];
  for (const row of rows) {
    const matches = laneFiles.filter((path) => basename(path).startsWith(`${row.lane}-`));
    const issues: string[] = [];
    issues.push(...admissionDriftIssues(row, admissionIdentity));
    issues.push(...reviewSubjectDriftIssues(row, reviewSubject));
    if (!matches.length) issues.push("ERROR: lane packet is missing");
    if (matches.length > 1) issues.push("ERROR: multiple lane packets match the registry row");
    const packet = matches.length === 1 ? matches[0]! : null;
    const markdown = packet ? await readText(packet) : null;
    const laneStatus = markdown ? metadata(markdown, "Status") : null;
    const laneOwner = markdown ? metadata(markdown, "Owner") : null;
    const laneNextGate = markdown ? metadata(markdown, "Next Gate") : null;
    const dispatchState = markdown ? metadata(markdown, "Dispatch State") : null;
    if (laneStatus && laneStatus !== row.status) {
      issues.push(`ERROR: registry status ${row.status} differs from lane status ${laneStatus}`);
    }
    if (laneOwner && laneOwner !== row.owner) {
      issues.push(`ERROR: registry owner ${row.owner} differs from lane owner ${laneOwner}`);
    }
    if (laneNextGate && normalize(laneNextGate) !== normalize(row.next_gate)) {
      issues.push("WARNING: registry next gate differs from the lane packet");
    }
    if (!laneStatus) issues.push("ERROR: lane packet has no Status metadata");
    if (!laneOwner) issues.push("ERROR: lane packet has no Owner metadata");
    if (!laneNextGate) issues.push("ERROR: lane packet has no Next Gate metadata");
    if (!dispatchState) issues.push("ERROR: lane packet has no Dispatch State metadata");
    audits.push({
      lane: row.lane,
      registry_status: row.status,
      lane_status: laneStatus,
      owner: row.owner,
      lane_owner: laneOwner,
      dispatch_state: dispatchState,
      next_gate: row.next_gate,
      lane_next_gate: laneNextGate,
      packet_path: packet ? rel(packet) : null,
      disposition: classifyWorkDisposition(row, issues),
      issues,
    });
  }
  return audits.sort((left, right) =>
    queueRank(left.disposition) - queueRank(right.disposition) || left.lane.localeCompare(right.lane),
  );
}

function currentFrontierNextAction(markdown: string): string | null {
  const frontier = markdown.match(/## Current Frontier\n([\s\S]*?)(?=\n## |$)/)?.[1] ?? "";
  const match = frontier.match(/^- Next action:\s*(.+(?:\n  .+)*)/m);
  return match ? match[1]!.replace(/\n\s+/g, " ").trim() : null;
}

async function auditGraphs(): Promise<WorkGraphAudit[]> {
  const reportFiles = await walkFiles(REPORT_ROOT, {
    include: (path) => basename(path).endsWith(".md"),
  });
  const graphs: WorkGraphAudit[] = [];
  for (const path of reportFiles) {
    const markdown = await readText(path);
    const graphId = metadata(markdown, "Work Graph ID");
    const status = metadata(markdown, "Status");
    if (!graphId || !status || !["PLANNED", "ACTIVE", "BLOCKED"].includes(status)) continue;
    graphs.push({
      graph_id: graphId,
      status,
      plan_revision: metadata(markdown, "Plan Revision"),
      graph_revision: metadata(markdown, "Work Graph Revision"),
      owner: metadata(markdown, "Owner"),
      terminal_gate: metadata(markdown, "Terminal Gate"),
      next_action: currentFrontierNextAction(markdown),
      path: rel(path),
    });
  }
  return graphs.sort((left, right) => left.graph_id.localeCompare(right.graph_id));
}

function recommendedActions(queue: LaneAudit[]): WorkAuditReport["recommended_actions"] {
  const actions: WorkAuditReport["recommended_actions"] = [];
  const reconciliation = queue.filter((item) => item.issues.length).map((item) => item.lane);
  const review = queue.filter((item) => item.disposition === "REVIEW_PENDING").map((item) => item.lane);
  const ready = queue.filter((item) => item.disposition === "READY").map((item) => item.lane);
  const closeout = queue.filter((item) => item.disposition === "CLOSEOUT_CANDIDATE").map((item) => item.lane);
  if (reconciliation.length) {
    actions.push({
      priority: 1,
      lane_ids: reconciliation,
      route: "reconcile-work-graph",
      action: "Reconcile registry and authoritative lane metadata before scheduling affected work.",
      authorization_required: true,
    });
  }
  if (review.length) {
    actions.push({
      priority: 2,
      lane_ids: review,
      route: "review-change",
      action: "Run only each lane's named current-source review gate; do not substitute broad harness evaluation.",
      authorization_required: true,
    });
  }
  if (ready.length) {
    actions.push({
      priority: 3,
      lane_ids: ready,
      route: "implement-change",
      action: "Confirm current readiness and explicit execution authorization, then dispatch the smallest ready slice.",
      authorization_required: true,
    });
  }
  if (closeout.length) {
    actions.push({
      priority: 4,
      lane_ids: closeout,
      route: "closeout",
      action: "Verify terminal evidence, preserve the durable receipt, and retire the completed active projection.",
      authorization_required: true,
    });
  }
  return actions;
}

export async function buildWorkAudit(): Promise<WorkAuditReport> {
  const markdown = await readText(ACTIVE_WORK_PATH);
  const rows = parseActiveWorkRows(markdown);
  const admissionIdentity = await currentAdmissionIdentity();
  const reviewSubject = await currentReviewSubject(markdown);
  const queue = await auditLanes(rows, admissionIdentity, reviewSubject);
  const graphs = await auditGraphs();
  const count = (value: WorkDisposition) => queue.filter((item) => item.disposition === value).length;
  return {
    schema_version: 1,
    source: {
      path: rel(ACTIVE_WORK_PATH),
      sha256: sha256Text(markdown),
      admission: admissionIdentity,
      review_subject: reviewSubject,
    },
    authority: {
      mode: "READ_ONLY_ANALYSIS",
      may_dispatch: false,
      may_mutate_work_state: false,
      may_run_external_actions: false,
    },
    summary: {
      active_lanes: queue.length,
      active_graphs: graphs.length,
      review_pending: count("REVIEW_PENDING"),
      in_progress: count("IN_PROGRESS"),
      ready: count("READY"),
      dependency_pending: count("DEPENDENCY_PENDING"),
      blocked: count("BLOCKED"),
      closeout_candidates: count("CLOSEOUT_CANDIDATE"),
      reconciliation_issues: queue.reduce((total, item) => total + item.issues.length, 0),
    },
    queue,
    graphs,
    recommended_actions: recommendedActions(queue),
  };
}

export function hasReconciliationIssues(queue: LaneAudit[]): boolean {
  return queue.some((item) => item.issues.some((issue) => issue.startsWith("ERROR:")));
}

export type WorkAutomationMode = "audit" | "orchestrate";

export function automationPrompt(mode: WorkAutomationMode = "audit"): string {
  const audit = `Work in ${rootPath()}.

Use \`$orchestrate-work\` for this read-only audit. Run \`npx --yes bun@1.3.3 scripts/cascade.ts work audit --json --check\` and inspect its report. Read AGENTS.md, CODEX.md, docs/work/active.md, the named lane packets, and any active work graph referenced by the report. Analyze the current work queue, stale projections, blockers, ready work, review gates, and closeout candidates.

Do not edit files, change lane or graph state, dispatch agents, create tasks, create worktrees, commit, push, publish, spend provider funds, or run live/external actions. Do not run broad harness evaluation merely because a lane exists. Report only material changes since the prior run, the exact authoritative source that changed, and the smallest recommended next action. If execution or reconciliation is warranted, ask for explicit authorization in this task. If nothing material changed, return a concise no-action result.`;

  if (mode === "audit") return audit;
  return `Work in ${rootPath()}.

Use \`$orchestrate-work\` to continue the current task's already-authorized local work. Start by running \`npx --yes bun@1.3.3 scripts/cascade.ts work audit --json --check\` and inspecting AGENTS.md, CODEX.md, docs/work/active.md, the selected lane packet, and its active work graph. The scheduled invocation does not expand authority: preserve the latest user scope, current task goal, dependency gates, lane ownership, and write boundaries.

Execute at most one smallest coherent slice per run. First repair a clear local registry projection error when its authoritative lane or graph source is unambiguous. Otherwise prefer one current IN_PROGRESS lane whose named next gate is locally executable; use a READY lane only after recalculating its prerequisites and dispatch authorization. Run only the lane's named safe local commands and proportional checks. Update lane, graph, or registry state only when current-source evidence proves the transition, and never self-accept an independent review gate.

Stay on the root execution surface. Do not create or dispatch agents, tasks, threads, worktrees, branches, commits, pushes, pull requests, releases, or external tracker changes. Do not run paid/provider-backed, live, destructive, secret-bearing, or other externally mutating actions. Do not run broad harness evaluation unless actual harness assertions or evaluation contracts changed and the harness-impact decision requires it. Stop and report the exact blocker when work needs new authority, an independent evaluator, ambiguous ownership, an external action, or a dependency that is not accepted.

Finish with the lane selected, commands and checks actually run, files changed, evidence produced, resulting queue state, and the smallest next action. If no bounded local slice is eligible, return a concise no-action result.`;
}

function renderText(report: WorkAuditReport): string {
  const lines = [
    "Cascade active-work audit (read-only)",
    `Source: ${report.source.path} sha256:${report.source.sha256}`,
    `Admission authority: v${report.source.admission.schema_version}/${report.source.admission.policy_bundle_version.replace("cascade-", "")} with ${report.source.admission.case_count} cases`,
    `Review subject: ${report.source.review_subject.run_id ?? "none"} (${report.source.review_subject.status}; ${report.source.review_subject.changed_sources.length} source drift items)`,
    `Summary: ${report.summary.active_lanes} lanes; ${report.summary.active_graphs} active graphs; ${report.summary.review_pending} review; ${report.summary.in_progress} in progress; ${report.summary.ready} ready; ${report.summary.dependency_pending} waiting; ${report.summary.blocked} blocked; ${report.summary.reconciliation_issues} reconciliation issues`,
    "",
    "Queue:",
  ];
  for (const item of report.queue) {
    lines.push(`- [${item.disposition}] ${item.lane} (${item.registry_status}; dispatch ${item.dispatch_state ?? "UNKNOWN"}) -> ${item.next_gate}`);
    for (const issue of item.issues) lines.push(`  ${issue}`);
  }
  if (report.graphs.length) {
    lines.push("", "Active graphs:");
    for (const graph of report.graphs) {
      lines.push(`- ${graph.graph_id} ${graph.status} r${graph.graph_revision ?? "?"}: ${graph.next_action ?? "no Current Frontier next action"}`);
    }
  }
  lines.push("", "Recommended actions:");
  if (!report.recommended_actions.length) lines.push("- No action.");
  for (const action of report.recommended_actions) {
    lines.push(`- P${action.priority} ${action.route} (${action.lane_ids.join(", ")}): ${action.action}`);
  }
  lines.push("", "Authority: analysis only; no state mutation, dispatch, or external action occurred.");
  return lines.join("\n");
}

export async function main(argv: string[]): Promise<number> {
  const args = parseArgs(argv);
  const [command = "audit", ...extra] = args.positionals;
  if (extra.length) throw new CascadeError(`unexpected work arguments: ${extra.join(" ")}`);
  if (command === "automation-prompt") {
    const mode = flag(args, "mode", "audit");
    if (mode !== "audit" && mode !== "orchestrate") {
      throw new CascadeError(`work automation mode must be audit or orchestrate: ${mode}`);
    }
    console.log(automationPrompt(mode));
    return 0;
  }
  if (command !== "audit") throw new CascadeError(`unknown work command: ${command}`);
  const report = await buildWorkAudit();
  console.log(boolFlag(args, "json") ? stableJson(report, true) : renderText(report));
  return boolFlag(args, "check") && hasReconciliationIssues(report.queue) ? 1 : 0;
}
