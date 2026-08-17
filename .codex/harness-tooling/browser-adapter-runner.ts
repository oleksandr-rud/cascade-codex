import { chmod, mkdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { chromium } from "@playwright/test";

type BrowserAction =
  | {
      type: "browser-fill";
      locator: { kind: "label"; value: string };
      value: string;
    }
  | {
      type: "browser-click";
      locator: { kind: "role"; role: string; name: string };
    }
  | {
      type: "browser-navigate";
      url: string;
    };

interface RunnerInput {
  fixture_file: string;
  output_root: string;
  actions: BrowserAction[];
  observation: {
    locator: { kind: "role"; role: string };
    expected_text: string;
  };
}

interface RunnerActionResult {
  index: number;
  type: BrowserAction["type"];
  status: "PASS" | "BLOCKED";
  reason: string | null;
}

const executablePath =
  process.env.CASCADE_PLAYWRIGHT_EXECUTABLE ?? chromium.executablePath();

if (Bun.argv[2] === "--preflight") {
  const executableExists = await Bun.file(executablePath).exists();
  console.log(JSON.stringify({
    schema_version: 1,
    provider: "playwright-chromium",
    playwright_version: "1.58.2",
    executable_path: executablePath,
    executable_exists: executableExists,
  }));
  process.exit(executableExists ? 0 : 1);
}

const inputPath = Bun.argv[2];
if (!inputPath) throw new Error("browser adapter runner input is required");
const input = JSON.parse(await readFile(inputPath, "utf8")) as RunnerInput;
await mkdir(input.output_root, { recursive: true, mode: 0o700 });

const screenshotPath = resolve(input.output_root, "browser-final.png");
const tracePath = resolve(input.output_root, "browser-trace.zip");
const browser = await chromium.launch({
  executablePath,
  headless: true,
});
const context = await browser.newContext({
  acceptDownloads: false,
  serviceWorkers: "block",
});
const page = await context.newPage();
page.setDefaultTimeout(3_000);
page.setDefaultNavigationTimeout(3_000);
const consoleErrors: string[] = [];
const pageErrors: string[] = [];
const blockedRequests: string[] = [];
const actionResults: RunnerActionResult[] = [];

page.on("console", (message) => {
  if (message.type() === "error") consoleErrors.push(message.text());
});
page.on("pageerror", (error) => pageErrors.push(error.message));
await context.route("**/*", async (route) => {
  const url = route.request().url();
  if (/^(?:file|data|about):/.test(url)) {
    await route.continue();
    return;
  }
  blockedRequests.push(url);
  await route.abort("blockedbyclient");
});

let visibleStatus: string | null = null;
let earliestFailure: string | null = null;
try {
  await context.tracing.start({ screenshots: true, snapshots: true, sources: false });
  await page.goto(pathToFileURL(input.fixture_file).href, { waitUntil: "load" });
  for (const [index, action] of input.actions.entries()) {
    try {
      if (action.type === "browser-fill") {
        await page.getByLabel(action.locator.value).fill(action.value);
      } else if (action.type === "browser-click") {
        await page.getByRole(action.locator.role as never, {
          name: action.locator.name,
        }).click();
      } else {
        await page.goto(action.url, { waitUntil: "load" });
      }
      actionResults.push({ index, type: action.type, status: "PASS", reason: null });
    } catch (error) {
      earliestFailure = error instanceof Error ? error.message : String(error);
      actionResults.push({
        index,
        type: action.type,
        status: "BLOCKED",
        reason: earliestFailure,
      });
      break;
    }
  }
  try {
    visibleStatus = await page
      .getByRole(input.observation.locator.role as never)
      .textContent();
  } catch (error) {
    if (earliestFailure === null) {
      earliestFailure = error instanceof Error ? error.message : String(error);
    }
  }
  if (visibleStatus !== input.observation.expected_text && earliestFailure === null) {
    earliestFailure = `expected visible status ${JSON.stringify(input.observation.expected_text)}, got ${JSON.stringify(visibleStatus)}`;
  }
  try {
    await page.screenshot({ path: screenshotPath, fullPage: true });
  } catch (error) {
    if (earliestFailure === null) {
      earliestFailure = error instanceof Error ? error.message : String(error);
    }
  }
} finally {
  await context.tracing.stop({ path: tracePath }).catch(() => undefined);
  await context.close().catch(() => undefined);
  await browser.close().catch(() => undefined);
}
await chmod(screenshotPath, 0o600);
await chmod(tracePath, 0o600);

console.log(JSON.stringify({
  schema_version: 1,
  provider: "playwright-chromium",
  playwright_version: "1.58.2",
  executable_path: executablePath,
  profile: "ephemeral",
  network: "deny",
  downloads: false,
  uploads: false,
  action_results: actionResults,
  visible_status: visibleStatus,
  expected_text: input.observation.expected_text,
  console_errors: consoleErrors,
  page_errors: pageErrors,
  blocked_requests: blockedRequests,
  earliest_failure: earliestFailure,
  screenshot_path: screenshotPath,
  trace_path: tracePath,
}));
