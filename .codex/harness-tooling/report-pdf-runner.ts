import { chromium } from "@playwright/test";
import { readBoundedRegularFile, rootPath } from "../../scripts/cascade/common";

// A print-only renderer: no target execution, user profile, network, or page scripts.
const path = process.argv[2];
if (!path || process.argv.length !== 3) throw new Error("Usage: report-pdf-runner.ts REPORT_HTML");
const bytes = await readBoundedRegularFile(path, "print report", {
  physicalRoot: rootPath(".artifacts/product-eval-reports"),
  maxBytes: 24 * 1024 * 1024, requireMaintainersOnly: true,
});
const browser = await chromium.launch({ headless: true, timeout: 15000 });
try {
  const context = await browser.newContext({ javaScriptEnabled: false, acceptDownloads: false, serviceWorkers: "block", offline: true });
  await context.route("**/*", (route) => route.abort());
  const page = await context.newPage();
  await page.setContent(bytes.toString("utf8"), { waitUntil: "load", timeout: 15000 });
  await page.emulateMedia({ media: "print" });
  const pdf = await page.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true, timeout: 15000 });
  await context.close();
  process.stdout.write(pdf.toString("base64"));
} finally {
  await browser.close();
}
