import assert from "node:assert/strict";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";
import { collectCampaignReport, renderCampaignReport, writeCampaignReport } from "../../scripts/cascade/campaign-report";
import { rootPath, sha256File } from "../../scripts/cascade/common";

// Opt-in report boundary check; deliberately outside the default unit suite.
const runId = process.argv[2];
if (!runId) throw new Error("Usage: bun .codex/harness-tooling/report-smoke.ts RUN_ID");
const frozen = rootPath(`.artifacts/product-evals/${runId}/finalization.json`);
const before = await sha256File(frozen);
const report = await collectCampaignReport(runId);
assert.equal(report.scenarios.length, 4);
assert.equal(report.scenarios.filter((scenario) => scenario.status === "PASS").length, 1);
assert.equal(report.scenarios.filter((scenario) => scenario.status === "FAIL").length, 3);
assert.equal(report.scenarios.reduce((count, scenario) => count + scenario.images.length, 0), 3);
assert.match(report.evaluation, /семантичний judgment не запускався/);
await assert.rejects(collectCampaignReport("../escape"));
const output = await writeCampaignReport(runId, { pdf: true });
assert.equal(await sha256File(frozen), before);
const outputRoot = resolve(output.html, "..");
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();
  const errors: string[] = [];
  const network: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await context.route(/^https?:/, (route) => { network.push(route.request().url()); return route.abort(); });
  await page.goto(pathToFileURL(output.html).href);
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 900 });
    assert.equal(await page.locator("article").count(), 4);
    assert.equal(await page.locator("img").evaluateAll((images) => images.every((image: any) => image.complete && image.naturalWidth > 0)), true);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.doesNotMatch(await page.locator("main").innerText(), /[a-f0-9]{64}/);
    await page.screenshot({ path: resolve(outputRoot, `preview-${width}.png`), fullPage: true });
  }
  await page.locator("#filter").selectOption("FAIL");
  assert.equal(await page.locator("article:visible").count(), 3);
  await page.emulateMedia({ media: "print" });
  assert.equal(await page.locator("article:visible").count(), 4);
  assert.equal(await page.locator("#print").isVisible(), false);
  await page.emulateMedia({ media: "screen" });
  const downloadPromise = page.waitForEvent("download");
  await page.locator("#data").click();
  const download = await downloadPromise;
  assert.equal(download.suggestedFilename(), "report.json");
  const dataPath = await download.path();
  assert.deepEqual(await Bun.file(dataPath!).json(), report);
  const hostile = structuredClone(report);
  hostile.title = '</title><script>globalThis.reportInjected=true</script>';
  hostile.scenarios[0].description = '<img src="https://example.invalid/leak" onerror="globalThis.reportInjected=true">';
  await page.setContent(renderCampaignReport(hostile));
  assert.equal(await page.evaluate(() => (globalThis as any).reportInjected), undefined);
  assert.equal(network.length, 0);
  assert.equal(errors.length, 0);
  await context.close();
} finally { await browser.close(); }
assert.equal(await sha256File(frozen), before);
console.log(JSON.stringify({ status: "PASS", html: output.html, pdf: output.pdf, viewports: [1280, 390], frozen_unchanged: true }));
