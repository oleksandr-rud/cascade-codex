#!/usr/bin/env bun

import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const output = resolve(process.argv[2] ?? "dist/cascade");

async function run(argv: string[]): Promise<void> {
  const child = Bun.spawn(argv, {
    cwd: process.cwd(),
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });
  const exitCode = await child.exited;
  if (exitCode !== 0) {
    throw new Error(`${argv[0]} exited with status ${exitCode}`);
  }
}

await mkdir(dirname(output), { recursive: true });
await run([
  process.execPath,
  "build",
  "--compile",
  "scripts/cascade.ts",
  "--outfile",
  output,
]);

if (process.platform === "darwin") {
  await run(["/usr/bin/codesign", "--force", "--sign", "-", output]);
}

console.log(`cascade_cli=${output}`);
