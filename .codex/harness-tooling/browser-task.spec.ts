import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { expect, test } from "@playwright/test";

const toolingRoot = dirname(fileURLToPath(import.meta.url));
const fixture = resolve(
  toolingRoot,
  "../../evals/simulations/browser-fixture.html",
);
const evidencePath = resolve(
  toolingRoot,
  "../../.artifacts/playwright/browser-task/evidence.json",
);

test("task can be completed through public controls", async ({ page }) => {
  await page.goto(`file://${fixture}`);
  await expect(
    page.getByRole("heading", { name: "Maintenance task" }),
  ).toBeVisible();
  await page.getByLabel("Resolution").fill("Replaced worn belt");
  await page.getByRole("button", { name: "Complete task" }).click();
  await expect(page.getByRole("status")).toHaveText(
    "Completed: Replaced worn belt",
  );
  await mkdir(dirname(evidencePath), { recursive: true });
  await writeFile(
    evidencePath,
    `${JSON.stringify(
      {
        schema_version: 1,
        task_id: "BROWSER-TASK",
        outcome: "PASS",
        visible_status: await page.getByRole("status").textContent(),
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
});
