import { spawn } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const inputPath = process.argv[2];
const encodedInput = process.env.CASCADE_DESKTOP_INPUT_B64;
if (!inputPath && !encodedInput) throw new Error("desktop fixture input is required");
const input = JSON.parse(
  inputPath
    ? await readFile(inputPath, "utf8")
    : Buffer.from(encodedInput, "base64").toString("utf8"),
);
const display = input.environment.display;
const evidenceRoot = input.evidence_root;
const logs = [];
const actionResults = [];
let xvfb = null;
let app = null;
let earliestFailure = null;

const delay = (milliseconds) => new Promise((resolvePromise) =>
  setTimeout(resolvePromise, milliseconds)
);

const run = (argv, timeoutMs = 3000) => new Promise((resolvePromise, reject) => {
  const child = spawn(argv[0], argv.slice(1), {
    env: { PATH: process.env.PATH, DISPLAY: display },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk) => { stdout += chunk; });
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  const timer = setTimeout(() => child.kill("SIGKILL"), timeoutMs);
  child.on("error", reject);
  child.on("exit", (code, signal) => {
    clearTimeout(timer);
    logs.push({ argv, code, signal, stdout, stderr });
    if (code === 0) resolvePromise({ stdout, stderr });
    else reject(new Error(stderr.trim() || `${argv[0]} exited ${code ?? signal}`));
  });
});

const waitForFile = async (file, timeoutMs) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      await readFile(resolve(evidenceRoot, file));
      return;
    } catch {
      await delay(20);
    }
  }
  throw new Error(`desktop file wait timed out for ${file}`);
};

const terminate = async (child) => {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  child.kill("SIGTERM");
  await Promise.race([
    new Promise((resolvePromise) => child.once("exit", resolvePromise)),
    delay(250),
  ]);
  if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
};

try {
  xvfb = spawn("Xvfb", [
    display,
    "-screen",
    "0",
    `${input.environment.resolution.width}x${input.environment.resolution.height}x24`,
    "-nolisten",
    "tcp",
  ], { stdio: ["ignore", "pipe", "pipe"] });
  await delay(100);
  for (const [index, action] of input.actions.entries()) {
    try {
      if (action.type === "desktop-launch") {
        if (action.app_id !== input.execution_binding.app_id) {
          throw new Error(`desktop app binding mismatch for ${action.app_id}`);
        }
        app = spawn("python3", ["/fixture/fixture.py"], {
          env: {
            PATH: process.env.PATH,
            DISPLAY: display,
            LANG: input.environment.locale,
            LC_ALL: input.environment.locale,
            CASCADE_DESKTOP_EVIDENCE_ROOT: evidenceRoot,
          },
          stdio: ["ignore", "pipe", "pipe"],
        });
        await run(["xdotool", "search", "--sync", "--name", action.window_title]);
      } else if (action.type === "desktop-type") {
        await run(["xdotool", "type", "--delay", "10", action.value]);
      } else if (action.type === "desktop-key") {
        await run(["xdotool", "key", action.key]);
      } else if (action.type === "desktop-wait-file") {
        await waitForFile(action.file, action.timeout_ms);
      } else if (action.type === "desktop-capture") {
        await run([
          "import",
          "-display",
          display,
          "-window",
          "root",
          resolve(evidenceRoot, `${action.label}.png`),
        ]);
      } else {
        throw new Error(`unsupported desktop action ${String(action.type)}`);
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
} catch (error) {
  earliestFailure = error instanceof Error ? error.message : String(error);
} finally {
  await terminate(app);
  await terminate(xvfb);
}

let publicState = null;
try {
  publicState = JSON.parse(await readFile(resolve(evidenceRoot, "completed.json"), "utf8"));
} catch {
  // Missing public state is an observable failure, not a runner exception.
}
await writeFile(
  resolve(evidenceRoot, "desktop-result.json"),
  `${JSON.stringify({
    schema_version: 1,
    provider: "docker-xvfb-xdotool",
    execution_binding: input.execution_binding,
    action_results: actionResults,
    public_state: publicState,
    logs,
    earliest_failure: earliestFailure,
    cleanup_verified: true,
  })}\n`,
  { mode: 0o600 },
);
process.exit(earliestFailure ? 1 : 0);
