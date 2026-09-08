import { createHash } from "node:crypto";
import { lstat, mkdir, mkdtemp, realpath } from "node:fs/promises";
import { resolve } from "node:path";
import { CampaignArtifactStore } from "./campaign-artifacts";
import {
  CascadeError, ROOT, assertJsonSchema, readBoundedRegularFile, rootPath,
  runCommand, stableJson, valueDigest, writeJsonExclusive, writeTextExclusive,
} from "./common";
import { parseStrictYaml } from "./structured-data";

const REPORT_ROOT = ".artifacts/product-eval-reports";
const MAX_FILE_BYTES = 8 * 1024 * 1024;
const MAX_REPORT_BYTES = 24 * 1024 * 1024;
type RecordValue = Record<string, any>;
const object = (value: any): RecordValue => value && typeof value === "object" && !Array.isArray(value) ? value : {};
const list = (value: any): RecordValue[] => Array.isArray(value) ? value.map(object) : [];
const clean = (value: any): string => (typeof value === "string" ? value : value == null ? "" : stableJson(value))
  .replace(/\x1b\[[0-9;]*m/g, "");
const escape = (value: any): string => clean(value).replace(/[&<>"']/g, (character) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
const digest = (bytes: Buffer | string): string => createHash("sha256").update(bytes).digest("hex");

export interface CampaignReport {
  schema_version: 1;
  title: string;
  description: string;
  status: string;
  evaluation: string;
  release_eligible: boolean;
  scenarios: RecordValue[];
  source: RecordValue;
}

function describeAction(action: RecordValue): string {
  const locator = object(action.locator);
  const target = clean(locator.name || locator.value || locator.role || action.target || action.url);
  switch (action.type) {
    case "browser-fill": return `Ввести «${clean(action.value)}» у «${target}»`;
    case "browser-click": return `Натиснути «${target}»`;
    case "browser-navigate": return `Перейти на ${clean(action.url)}`;
    default: return [clean(action.type), target].filter(Boolean).join(": ");
  }
}

function eventText(event: RecordValue): string {
  if (event.action) return describeAction(object(event.action));
  const labels: Record<string, string> = {
    "task-lifecycle": "Виконання", adapter: "Браузер / адаптер", oracle: "Перевірка результату",
    cleanup: "Закриття ресурсів", policy: "Перевірка дозволу",
  };
  return clean(event.reason) || labels[event.type] || clean(event.type || event.event_type);
}

export async function collectCampaignReport(runId: string): Promise<CampaignReport> {
  const store = new CampaignArtifactStore(rootPath(".artifacts/product-evals"), runId);
  const verification = await store.verify();
  const finalizationBytes = await store.readArtifactBytes("finalization.json", "report finalization");
  const finalization = JSON.parse(finalizationBytes.toString("utf8"));
  if (finalization.manifest_digest !== verification.manifest_digest) throw new CascadeError("report finalization changed");
  const records = new Map<string, RecordValue>(list(finalization.files).map((record) => [record.path, record]));
  let consumedBytes = 0;
  const read = async (path: string): Promise<Buffer> => {
    const record = records.get(path);
    if (!record || record.size > MAX_FILE_BYTES) throw new CascadeError(`report input missing or oversized: ${path}`);
    consumedBytes += record.size;
    if (consumedBytes > MAX_REPORT_BYTES) throw new CascadeError("report input exceeds the total byte limit");
    const bytes = await store.readArtifactBytes(path, "report input", MAX_FILE_BYTES);
    if (bytes.length !== record.size || digest(bytes) !== record.sha256) throw new CascadeError(`report input changed: ${path}`);
    return bytes;
  };
  const json = async (path: string): Promise<RecordValue> => object(JSON.parse((await read(path)).toString("utf8")));
  const summary = records.has("summary.json") ? await json("summary.json") : {};
  const execution = records.has("execution/execution-receipt.json") ? await json("execution/execution-receipt.json") : {};
  const sourceManifest = await json("execution/source-manifest.json");
  const definitions = list(sourceManifest.definitions);
  const frozenSources = list(sourceManifest.frozen_sources);
  const definition = async (path: string): Promise<RecordValue> => {
    const entry = definitions.find((item) => item.path === path);
    const frozen = entry && frozenSources.find((item) => item.sha256 === entry.sha256);
    if (!frozen) throw new CascadeError(`report definition is not frozen: ${path}`);
    return object(parseStrictYaml((await read(frozen.path)).toString("utf8"), path));
  };
  let campaign: RecordValue = {};
  for (const entry of definitions.filter((item) => /^product-evals\/campaigns\/.*\.ya?ml$/.test(item.path))) {
    const candidate = await definition(entry.path);
    if (candidate.id === sourceManifest.campaign_id) { campaign = candidate; break; }
  }
  if (!campaign.id) throw new CascadeError("report campaign definition is missing from frozen sources");
  const taskPaths = Array.isArray(campaign.task_files) ? campaign.task_files : [];
  if (taskPaths.length > 100) throw new CascadeError("report exceeds 100 scenarios");
  const scenarios: RecordValue[] = [];
  for (const taskPath of taskPaths) {
    const task = await definition(String(taskPath));
    const resultPath = `execution/tasks/${task.id}/result.json`;
    const result = records.has(resultPath) ? await json(resultPath) : {};
    const actions = list(object(task.browser).actions);
    const steps = actions.map((action, index) => {
      const event = list(result.events).find((item) => item.index === index && item.action);
      return { text: describeAction(action), status: event?.status ?? "NOT_RUN" };
    });
    const images = [];
    // Only embed recorded raster evidence. Never execute source HTML, SVG or remote URLs.
    for (const evidence of list(result.evidence)) {
      if (!/\.png$/i.test(clean(evidence.source_path))) continue;
      if (images.length >= 6) throw new CascadeError("report exceeds six images per scenario");
      const bytes = await read(evidence.path);
      if (bytes.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") throw new CascadeError("report image is not PNG");
      images.push({ path: evidence.path, sha256: digest(bytes), data_url: `data:image/png;base64,${bytes.toString("base64")}` });
    }
    const events = list(result.events);
    if (events.length > 500) throw new CascadeError("report exceeds 500 log entries per scenario");
    const logs = events.map((event) => ({ text: eventText(event), status: clean(event.status || event.phase || event.outcome) }));
    for (const observation of list(result.observations)) {
      const payload = object(observation.payload);
      for (const key of ["blocked_requests", "console_errors", "page_errors"]) {
        for (const entry of Array.isArray(payload[key]) ? payload[key] : []) logs.push({ text: `${key}: ${clean(entry)}`, status: "OBSERVED" });
      }
    }
    const description = clean(task.description || task.purpose) ||
      (steps.length ? `${steps.map((step) => step.text).join(". ")}.` : "Зафіксований сценарій виконання через адаптер.");
    scenarios.push({
      id: task.id, title: clean(task.title) || clean(task.id).replace(/^BROWSER-/, "").replace(/-/g, " ").toLowerCase(),
      description, required: task.required === true, status: clean(result.status) || "NOT_RUN",
      outcome: clean(result.outcome) || "NOT_RUN", duration_ms: result.duration_ms ?? null,
      failure: clean(result.earliest_failure), expected: clean(object(task.browser).observation?.expected_text),
      actual: clean(object(result.final_state).browser?.visible_status), steps, logs, images,
      checks: list(result.oracle_results).map((item) => ({ status: item.status, expected: item.expected, actual: item.actual, type: item.type })),
      cleanup: clean(object(result.cleanup).status) || "NOT_RUN",
      result_path: records.has(resultPath) ? resultPath : null,
    });
  }
  const after = await store.verify();
  if (after.manifest_digest !== verification.manifest_digest ||
      !finalizationBytes.equals(await store.readArtifactBytes("finalization.json", "report finalization"))) {
    throw new CascadeError("frozen run changed while preparing report");
  }
  const evaluation = summary.evaluation_provider === "fixture"
    ? `Механічна перевірка: ${clean(summary.evaluation_status)}. Незалежний семантичний judgment не запускався.`
    : summary.evaluation_provider === "codex"
      ? `Оцінювання Codex: ${clean(summary.evaluation_status)}.`
      : `Оцінювання: ${clean(summary.evaluation_status) || "NOT_RUN"}.`;
  return {
    schema_version: 1, title: clean(campaign.title || campaign.id), description: clean(campaign.purpose),
    status: clean(summary.campaign_status) || clean(finalization.status) || "UNKNOWN_OUTCOME",
    evaluation, release_eligible: summary.release_eligible === true, scenarios,
    source: { run_id: runId, manifest_digest: verification.manifest_digest,
      finalization_status: verification.finalization_status, summary, execution_status: execution.status ?? "NOT_RUN",
      note: "Read-only presentation of frozen evidence, not a replacement evaluation receipt." },
  };
}

const REPORT_SCRIPT = `document.getElementById('print').addEventListener('click',()=>window.print());
document.getElementById('data').addEventListener('click',()=>{const blob=new Blob([document.getElementById('report-data').textContent],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='report.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
document.getElementById('filter').addEventListener('change',event=>{document.querySelectorAll('article').forEach(card=>card.hidden=event.target.value!=='all'&&card.dataset.status!==event.target.value);});`;

export function renderCampaignReport(report: CampaignReport): string {
  const data = stableJson(report).replace(/</g, "\\u003c").replace(/&/g, "\\u0026");
  const scriptHash = createHash("sha256").update(REPORT_SCRIPT).digest("base64");
  const status = (value: any) => `<span class="status ${value === "PASS" ? "pass" : value === "FAIL" ? "fail" : "neutral"}">${escape(value)}</span>`;
  const articles = report.scenarios.map((scenario, index) => `<article data-status="${escape(scenario.status)}">
    <div class="scenario-heading"><div><p class="eyebrow">Сценарій ${index + 1} · ${scenario.required ? "обов’язковий" : "додатковий"}</p><h2>${escape(scenario.title)}</h2></div>${status(scenario.status)}</div>
    <p>${escape(scenario.description)}</p>
    ${scenario.steps.length ? `<ol class="steps">${scenario.steps.map((step: RecordValue) => `<li><span>${escape(step.text)}</span>${status(step.status)}</li>`).join("")}</ol>` : ""}
    <div class="outcome">${scenario.expected ? `<p><strong>Очікували</strong> ${escape(scenario.expected)}</p>` : ""}
    ${scenario.actual ? `<p><strong>Побачили</strong> ${escape(scenario.actual)}</p>` : ""}
    ${scenario.failure ? `<p class="failure"><strong>Що не вдалося</strong> ${escape(scenario.failure)}</p>` : ""}
    ${scenario.checks.filter((check: RecordValue) => check.status !== "PASS" || !scenario.expected || clean(check.expected) !== scenario.expected || clean(check.actual) !== scenario.actual).map((check: RecordValue) => `<p><strong>Перевірка ${escape(check.status)}</strong> ${escape(check.type)}: очікували ${escape(check.expected)}, отримали ${escape(check.actual)}</p>`).join("")}</div>
    ${scenario.images.length ? scenario.images.map((picture: RecordValue) => `<figure><img src="${escape(picture.data_url)}" alt="Зафіксований стан сценарію ${index + 1}" width="1280"><figcaption>Фактичний стан після виконання</figcaption></figure>`).join("") : `<p class="empty">Зображення цього сценарію не записане.</p>`}
    <details class="logs" open><summary>Лог проходження · ${scenario.duration_ms == null ? "час невідомий" : `${(scenario.duration_ms / 1000).toFixed(2)} с`}</summary>
    <ul>${scenario.logs.map((entry: RecordValue) => `<li><span>${escape(entry.text)}</span><small>${escape(entry.status)}</small></li>`).join("") || "<li>Події не записані.</li>"}</ul></details>
    <p class="cleanup">Ресурси: ${escape(scenario.cleanup)}</p>
  </article>`).join("");
  return `<!doctype html><html lang="uk"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; script-src 'sha256-${scriptHash}'; base-uri 'none'; form-action 'none'">
  <title>${escape(report.title)} · Звіт симуляції</title><style>
  :root{color-scheme:light;font:16px/1.55 system-ui,-apple-system,sans-serif;color:#202423;background:#f7f8f6}
  *{box-sizing:border-box}body{margin:0}main{max-width:1000px;margin:auto;padding:48px 28px 80px}h1{font-size:32px;line-height:1.2;margin:8px 0 20px}h2{font-size:22px;line-height:1.3;margin:4px 0}p{margin:12px 0;overflow-wrap:anywhere}
  .eyebrow{font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#61706a;margin:0}header{padding-bottom:28px;border-bottom:1px solid #dce2dc}.intro{max-width:75ch;color:#526058}.actions{display:flex;flex-wrap:wrap;gap:10px;margin:24px 0 0}button,select{font:inherit;font-size:14px;padding:9px 14px;border:1px solid #b9c5bd;background:#fff;color:#233e31;border-radius:7px;cursor:pointer}button:hover{background:#edf2ed}:focus-visible{outline:3px solid #326cba;outline-offset:3px}
  .overview{display:flex;flex-wrap:wrap;gap:14px 26px;margin:24px 0}.notice{font-size:14px;color:#59665f}.status{display:inline-block;font-size:12px;font-weight:650;padding:3px 9px;border-radius:5px;white-space:nowrap}.pass{color:#20533b;background:#e8f2e9}.fail{color:#8c3232;background:#f8e9e6}.neutral{color:#515d5b;background:#ecefed}
  article{background:#fff;border:1px solid #dce2dc;border-radius:10px;padding:28px;margin:24px 0;overflow-wrap:anywhere}article[hidden]{display:none}.scenario-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:20px}.scenario-heading .status{margin-top:4px}.steps{list-style:decimal;padding-left:24px;margin:22px 0}.steps li{padding:7px 0 7px 8px}.steps .status{margin-left:10px}.outcome{border-left:3px solid #d8e2db;padding-left:16px;font-size:14px}.outcome strong{display:block;font-size:12px;color:#5b6761}.failure{white-space:pre-wrap;color:#843b32}figure{margin:24px 0}img{display:block;width:100%;height:auto;border:1px solid #dfe4df;border-radius:6px}figcaption,.cleanup{font-size:12px;color:#657169}summary{cursor:pointer;font-weight:600;font-size:14px}.logs{margin-top:22px}.logs ul{list-style:none;padding:0;font-size:13px}.logs li{display:flex;justify-content:space-between;gap:20px;padding:7px 0;border-bottom:1px solid #edf0ed;white-space:pre-wrap}.logs small{flex-shrink:0;color:#61706a}.empty{padding:20px;border:1px dashed #ccd4cd;color:#66736b;font-size:14px}footer{font-size:12px;color:#657169}
  @media(max-width:600px){main{padding:28px 16px}h1{font-size:26px}article{padding:18px}.scenario-heading{gap:10px}.logs li{display:block}.logs small{display:block}.steps{padding-left:18px}}
  @page{size:A4;margin:14mm} @media print{:root{font-size:11px;line-height:1.35;background:#fff}body{background:#fff}main{max-width:none;padding:0}header{padding-bottom:8px}.actions{display:none}h1{font-size:22px;margin:6px 0 10px}h2{font-size:17px}p{margin:7px 0}.eyebrow,.notice,.status,.outcome,.outcome strong,summary,figcaption,.cleanup,footer{font-size:10px}article,article[hidden]{display:block;border:0;border-radius:0;padding:0;margin:16px 0;break-before:page}article:first-of-type{break-before:auto}h2,.scenario-heading,summary{break-after:avoid}figure,.steps li,.outcome p,.logs li{break-inside:avoid}figure{margin:12px 0}img{max-height:70mm;width:auto;max-width:100%;margin:auto}.steps{margin:12px 0}.steps li{padding:3px 0 3px 8px}details.logs>*{display:block!important}.logs{margin-top:12px}.logs ul{font-size:10px}.logs li{padding:3px 0}.overview{margin:10px 0}footer{margin-top:16px}}
  </style></head><body><main><header><p class="eyebrow">Cascade · Симуляції</p><h1>${escape(report.title)}</h1><p class="intro">${escape(report.description)}</p>
  <div class="actions"><button id="print" type="button">Експорт у PDF</button><button id="data" type="button">Завантажити дані</button><label>Показати <select id="filter"><option value="all">Усі сценарії</option><option value="PASS">Успішні</option><option value="FAIL">З відмовами</option><option value="NOT_RUN">Не запущені</option></select></label></div></header>
  <div class="overview"><span>Кампанія ${status(report.status)}</span><span>${report.scenarios.filter((item) => item.status === "PASS").length} успішних</span><span>${report.scenarios.filter((item) => item.status === "FAIL").length} з відмовами</span><span>${report.scenarios.length} сценаріїв</span></div>
  <p class="notice">${escape(report.evaluation)} Цей звіт не є дозволом на реліз.</p>
  <p class="notice">Статус кампанії та результати окремих сценаріїв показані окремо. Додаткові сценарії з FAIL не перейменовуються на PASS.</p>
  ${articles || '<p class="empty">Сценарії не записані.</p>'}<footer>Локальна копія зафіксованих доказів. Ідентифікатори та контрольні суми збережені в даних, а не в основному вигляді.</footer></main>
  <script id="report-data" type="application/json">${data}</script><script>${REPORT_SCRIPT}</script></body></html>`;
}

async function reportDirectory(runId: string): Promise<string> {
  let current = ROOT;
  for (const part of REPORT_ROOT.split("/")) {
    current = resolve(current, part);
    await mkdir(current, { mode: 0o700 }).catch((error) => { if (error.code !== "EEXIST") throw error; });
    const metadata = await lstat(current);
    if (!metadata.isDirectory() || metadata.isSymbolicLink() || await realpath(current) !== current) {
      throw new CascadeError("report directory must be a physical repository directory");
    }
  }
  return mkdtemp(resolve(current, `${runId}-`));
}

export async function writeCampaignReport(runId: string, options: { pdf?: boolean } = {}) {
  const policy = parseStrictYaml<RecordValue>((await readBoundedRegularFile(rootPath("product-evals/artifact-policy.yaml"), "report policy", { maxBytes: 65536 })).toString("utf8"));
  const policySchema = JSON.parse((await readBoundedRegularFile(rootPath("product-evals/artifact-policy.schema.json"), "report policy schema", { maxBytes: 65536 })).toString("utf8"));
  assertJsonSchema(policy, policySchema, "report policy");
  if (policy.local_reports?.artifact_root !== REPORT_ROOT || policy.local_reports?.enabled !== true) throw new CascadeError("local reports are disabled by artifact policy");
  const report = await collectCampaignReport(runId);
  const html = renderCampaignReport(report);
  if (Buffer.byteLength(html) > MAX_REPORT_BYTES) throw new CascadeError("rendered report exceeds byte limit");
  const directory = await reportDirectory(runId);
  const permissions = { fileMode: 0o600, directoryMode: 0o700 };
  await writeJsonExclusive(resolve(directory, "report.json"), report, permissions);
  await writeTextExclusive(resolve(directory, "report.html"), html, permissions);
  let pdfPath: string | null = null;
  if (options.pdf) {
    const result = await runCommand([process.execPath, rootPath(".codex/harness-tooling/report-pdf-runner.ts"), resolve(directory, "report.html")], {
      timeoutMs: 45000, maxOutputBytes: 16 * 1024 * 1024, inheritEnv: false,
      env: { HOME: process.env.HOME, PATH: process.env.PATH, TMPDIR: process.env.TMPDIR },
    });
    if (result.exitCode !== 0 || result.timedOut || result.outputLimitExceeded) {
      throw new CascadeError(`PDF export failed; HTML is preserved at ${directory}: ${result.stderr.slice(0, 500)}`);
    }
    const bytes = Buffer.from(result.stdout.trim(), "base64");
    if (!bytes.subarray(0, 5).equals(Buffer.from("%PDF-"))) throw new CascadeError("PDF renderer returned invalid bytes");
    const { open } = await import("node:fs/promises");
    pdfPath = resolve(directory, "report.pdf");
    const handle = await open(pdfPath, "wx", 0o600);
    try { await handle.writeFile(bytes); } finally { await handle.close(); }
  }
  await writeJsonExclusive(resolve(directory, "report-receipt.json"), {
    schema_version: 1, source: report.source, data_digest: valueDigest(report),
    html_sha256: digest(html), pdf_sha256: pdfPath ? digest(await readBoundedRegularFile(pdfPath, "report PDF", { maxBytes: MAX_REPORT_BYTES, physicalRoot: directory, requireMaintainersOnly: true })) : null,
  }, permissions);
  return { html: resolve(directory, "report.html"), data: resolve(directory, "report.json"), pdf: pdfPath };
}

export async function emitCampaignReport(runId: string): Promise<void> {
  try { console.log(`campaign_report=${(await writeCampaignReport(runId)).html}`); }
  catch (error) { console.error(`campaign_report=BLOCKED reason=${JSON.stringify(error instanceof Error ? error.message : String(error))}`); }
}
