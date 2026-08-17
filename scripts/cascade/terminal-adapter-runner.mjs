import { readFile, rm, writeFile } from "node:fs/promises";
import { spawn } from "node-pty";

if (process.argv[2] === "--preflight") {
  const probe = spawn("/bin/sh", ["-c", "printf CASCADE_PTY_READY"], {
    name: "xterm-256color",
    cols: 80,
    rows: 24,
    cwd: process.cwd(),
    env: { TERM: "xterm-256color", PATH: process.env.PATH ?? "/usr/bin:/bin" },
  });
  let output = "";
  probe.onData((data) => {
    output += data;
  });
  const exitCode = await new Promise((resolve) => {
    probe.onExit(({ exitCode: code }) => resolve(code));
  });
  console.log(JSON.stringify({
    schema_version: 1,
    provider: "node-pty",
    provider_version: "1.1.0",
    platform: process.platform,
    architecture: process.arch,
    ready: exitCode === 0 && output === "CASCADE_PTY_READY",
  }));
  process.exit(exitCode === 0 && output === "CASCADE_PTY_READY" ? 0 : 1);
}

const inputPath = process.argv[2];
if (!inputPath) throw new Error("terminal adapter runner input is required");

const input = JSON.parse(await readFile(inputPath, "utf8"));
let terminal = null;
let raw = "";
let outputBytes = 0;
let outputLimitExceeded = false;
let exited = false;
let exitCode = null;
let exitSignal = null;
let earliestFailure = null;
let currentCols = input.cols;
let currentRows = input.rows;
const stepResults = [];
const captures = [];
let exitResolve;
const exitPromise = new Promise((resolve) => {
  exitResolve = resolve;
});

const finishProcess = (signal = "SIGTERM") => {
  if (!terminal || exited) return;
  try {
    terminal.kill(signal);
  } catch {
    // Exit can race with cleanup.
  }
};

for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, () => {
    finishProcess(signal);
    setTimeout(() => process.exit(signal === "SIGINT" ? 130 : 143), 250).unref();
  });
}

const record = (index, type, status, reason = null, state = {}) => {
  stepResults.push({ index, type, status, reason, state });
};

const waitForText = async (text, timeoutMs) => {
  if (raw.includes(text)) return;
  if (exited) throw new Error(`terminal exited before observing ${JSON.stringify(text)}`);
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      subscription.dispose();
      reject(new Error(`terminal wait timed out for ${JSON.stringify(text)}`));
    }, timeoutMs);
    const subscription = terminal.onData(() => {
      if (!raw.includes(text)) return;
      clearTimeout(timer);
      subscription.dispose();
      resolve();
    });
    exitPromise.then(() => {
      if (raw.includes(text)) return;
      clearTimeout(timer);
      subscription.dispose();
      reject(new Error(`terminal exited before observing ${JSON.stringify(text)}`));
    });
  });
};

try {
  terminal = spawn(input.command[0], input.command.slice(1), {
    name: "xterm-256color",
    cols: input.cols,
    rows: input.rows,
    cwd: input.cwd,
    env: input.environment,
  });
  await writeFile(input.pid_path, `${terminal.pid}\n`, { mode: 0o600 });
  terminal.onData((data) => {
    const chunk = Buffer.from(data);
    const retained = Buffer.byteLength(raw);
    if (retained < input.max_output_bytes) {
      raw += chunk.subarray(0, input.max_output_bytes - retained).toString("utf8");
    }
    outputBytes += chunk.byteLength;
    if (outputBytes > input.max_output_bytes && !outputLimitExceeded) {
      outputLimitExceeded = true;
      earliestFailure = "terminal output budget exceeded";
      finishProcess("SIGTERM");
    }
  });
  terminal.onExit(({ exitCode: code, signal }) => {
    exited = true;
    exitCode = code;
    exitSignal = signal;
    exitResolve();
  });
  record(0, "terminal-spawn", "PASS", null, {
    pid: terminal.pid,
    cols: input.cols,
    rows: input.rows,
  });

  for (const [offset, step] of input.steps.entries()) {
    const index = offset + 1;
    if (earliestFailure) break;
    try {
      if (step.type === "terminal-wait") {
        await waitForText(step.text, step.timeout_ms);
      } else if (step.type === "terminal-input") {
        if (exited) throw new Error("terminal exited before input dispatch");
        terminal.write(step.value + (step.append_enter ? "\r" : ""));
      } else if (step.type === "terminal-resize") {
        if (exited) throw new Error("terminal exited before resize dispatch");
        terminal.resize(step.cols, step.rows);
        currentCols = step.cols;
        currentRows = step.rows;
      } else if (step.type === "terminal-signal") {
        if (exited) throw new Error("terminal exited before signal dispatch");
        terminal.kill(step.signal);
      } else if (step.type === "terminal-capture") {
        captures.push({ label: step.label, raw });
      } else {
        throw new Error(`unsupported terminal step ${String(step.type)}`);
      }
      record(index, step.type, "PASS", null, {
        output_bytes: outputBytes,
        exited,
        cols: currentCols,
        rows: currentRows,
      });
    } catch (error) {
      earliestFailure = error instanceof Error ? error.message : String(error);
      record(index, step.type, "BLOCKED", earliestFailure, {
        output_bytes: outputBytes,
        exited,
      });
      finishProcess("SIGTERM");
      break;
    }
  }

  if (!exited) await exitPromise;
  if (!earliestFailure && exitCode !== input.expected_exit_code) {
    earliestFailure = `expected terminal exit ${input.expected_exit_code}, got ${exitCode}`;
  }
} catch (error) {
  earliestFailure = error instanceof Error ? error.message : String(error);
  finishProcess("SIGKILL");
  if (terminal && !exited) await Promise.race([
    exitPromise,
    new Promise((resolve) => setTimeout(resolve, 250)),
  ]);
} finally {
  await writeFile(
    input.result_path,
    `${JSON.stringify({
      schema_version: 1,
      provider: "node-pty",
      provider_version: "1.1.0",
      platform: process.platform,
      architecture: process.arch,
      raw,
      output_bytes: outputBytes,
      output_limit_exceeded: outputLimitExceeded,
      exit_code: exitCode,
      exit_signal: exitSignal,
      step_results: stepResults,
      captures,
      earliest_failure: earliestFailure,
      cleanup_verified: exited,
      final_dimensions: { cols: currentCols, rows: currentRows },
    })}\n`,
    { mode: 0o600 },
  );
  await rm(input.pid_path, { force: true });
}

process.exit(earliestFailure ? 1 : 0);
