import { describe, expect, test } from "bun:test";
import { link, mkdir, mkdtemp, rename, rm, stat, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { CascadeError, boundedPath, readBoundedRegularFile, rootPath, runCommand } from "./common";

describe("filesystem and process safety smoke", () => {
  test("bounded paths reject traversal", () => {
    expect(() => boundedPath("../../outside")).toThrow(CascadeError);
    expect(
      boundedPath("product-evals/campaigns", "product-evals/"),
    ).toBe(rootPath("product-evals/campaigns"));
  });

  test("bounded regular-file reads reject file and ancestor symlinks", async () => {
    const token = `bounded-reader-${crypto.randomUUID()}`;
    const directory = rootPath(`.artifacts/${token}`);
    const regular = join(directory, "regular.txt");
    const linkedFile = join(directory, "linked-file.txt");
    const linkedAncestor = join(directory, "linked-ancestor");
    const external = await mkdtemp(join(tmpdir(), "cascade-bounded-link-"));
    try {
      await mkdir(directory, { recursive: true });
      await writeFile(regular, "trusted");
      await writeFile(join(external, "value.txt"), "external");
      // Junctions exercise the same reparse-point rejection without requiring
      // Windows Developer Mode or elevated file-symlink privileges.
      await symlink(process.platform === "win32" ? directory : regular, linkedFile,
        process.platform === "win32" ? "junction" : "file");
      await symlink(external, linkedAncestor, process.platform === "win32" ? "junction" : "dir");

      await expect(readBoundedRegularFile(linkedFile, "linked file", { maxBytes: 64 }))
        .rejects.toThrow("must not be a symbolic link");
      await expect(
        readBoundedRegularFile(join(linkedAncestor, "value.txt"), "linked ancestor", {
          maxBytes: 64,
        }),
      ).rejects.toThrow("symbolic-link ancestor");
    } finally {
      await rm(directory, { recursive: true, force: true });
      await rm(external, { recursive: true, force: true });
    }
  });

  test("ancestor substitution can never return external bytes", async () => {
    const token = `bounded-race-${crypto.randomUUID()}`;
    const directory = rootPath(`.artifacts/${token}`);
    const trustedAncestor = join(directory, "source");
    const parkedAncestor = join(directory, "source-trusted");
    const file = join(trustedAncestor, "value.txt");
    const external = await mkdtemp(join(tmpdir(), "cascade-bounded-race-"));
    try {
      await mkdir(trustedAncestor, { recursive: true });
      await writeFile(file, "trusted");
      await writeFile(join(external, "value.txt"), "external");

      let substitutionBlocked = false;
      const outcome = await readBoundedRegularFile(file, "race-adjacent file", {
        maxBytes: 64,
        readCheckpoint: async () => {
          try { await rename(trustedAncestor, parkedAncestor); }
          catch (error) {
            if (process.platform !== "win32" || (error as NodeJS.ErrnoException).code !== "EPERM") throw error;
            substitutionBlocked = true;
            return;
          }
          await symlink(external, trustedAncestor, process.platform === "win32" ? "junction" : "dir");
        },
      }).then(
        (value) => ({ status: "fulfilled" as const, value }),
        (reason) => ({ status: "rejected" as const, reason }),
      );
      if (substitutionBlocked) {
        // Windows may prevent replacing an ancestor while its file is open.
        // Prove the protected read still returns only the original bytes.
        expect(outcome.status).toBe("fulfilled");
      }
      if (outcome.status === "fulfilled") {
        expect(outcome.value.toString("utf8")).toBe("trusted");
      } else {
        expect(outcome.reason).toBeInstanceOf(Error);
      }
    } finally {
      await rm(directory, { recursive: true, force: true });
      await rm(external, { recursive: true, force: true });
    }
  });

  test("exact physical roots reject moved ancestors with same-inode replacements", async () => {
    const token = `bounded-physical-root-${crypto.randomUUID()}`;
    const directory = rootPath(`.artifacts/${token}`);
    const physicalRoot = join(directory, "permitted");
    const source = join(physicalRoot, "source");
    const parked = join(directory, "parked-source");
    const file = join(source, "value.txt");
    let checkpointReached = false;
    try {
      await mkdir(source, { recursive: true });
      await writeFile(file, "trusted");
      const original = await stat(file);

      let substitutionBlocked = false;
      const outcome = await readBoundedRegularFile(file, "physically bounded file", {
        maxBytes: 64,
        physicalRoot,
        readCheckpoint: async (phase, openedPath) => {
          expect(phase).toBe("opened");
          expect(openedPath).toBe(file);
          checkpointReached = true;
          try { await rename(source, parked); }
          catch (error) {
            if (process.platform !== "win32" || (error as NodeJS.ErrnoException).code !== "EPERM") throw error;
            substitutionBlocked = true;
            return;
          }
          await mkdir(source);
          await link(join(parked, "value.txt"), file);
          const replacement = await stat(file);
          expect(replacement.dev).toBe(original.dev);
          expect(replacement.ino).toBe(original.ino);
        },
      }).then(
        (value) => ({ status: "fulfilled" as const, value }),
        (reason) => ({ status: "rejected" as const, reason }),
      );
      expect(checkpointReached).toBe(true);
      if (substitutionBlocked) {
        expect(outcome.status).toBe("fulfilled");
        if (outcome.status === "fulfilled") expect(outcome.value.toString("utf8")).toBe("trusted");
        expect((await stat(file)).ino).toBe(original.ino);
      } else {
        expect(outcome.status).toBe("rejected");
        if (outcome.status === "rejected") expect(outcome.reason.message).toContain("escapes the permitted physical root after open");
      }
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  test("command execution observes abort signals and reports cancellation", async () => {
    const controller = new AbortController();
    const pending = runCommand(
      [process.execPath, "-e", "await Bun.sleep(10_000)"],
      { signal: controller.signal },
    );
    setTimeout(() => controller.abort(), 20);

    const result = await pending;
    expect(result.aborted).toBe(true);
    expect(result.timedOut).toBe(false);
    expect(result.exitCode).toBe(130);
  });

  test("command input is passed as literal stdin without entering argv", async () => {
    const input = 'Private fixture: $(echo must-not-execute) `literal`\n' + "x".repeat(300000);
    const result = await runCommand([process.execPath, "-e", "process.stdout.write(await Bun.stdin.text())"], { input, timeoutMs: 1000 });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe(input);
    expect(result.argv.join(" ")).not.toContain(input);
  });

  test("command timeout force-terminates a process that ignores SIGTERM", async () => {
    const result = await runCommand(
      [
        process.execPath,
        "-e",
        'process.on("SIGTERM", () => {}); await Bun.sleep(10_000)',
      ],
      { timeoutMs: 100, terminationGraceMs: 20 },
    );

    expect(result.timedOut).toBe(true);
    expect(result.aborted).toBe(false);
    expect(result.exitCode).toBe(124);
    expect(result.durationMs).toBeLessThan(2_000);
  });

  test("command output limits terminate before buffering unbounded output", async () => {
    const result = await runCommand(
      [
        process.execPath,
        "-e",
        'for (let index = 0; index < 10000; index += 1) console.log("0123456789")',
      ],
      { maxOutputBytes: 128, terminationGraceMs: 20 },
    );

    expect(result.outputLimitExceeded).toBe(true);
    expect(
      Buffer.byteLength(result.stdout) + Buffer.byteLength(result.stderr),
    ).toBeLessThanOrEqual(128);
  });

  test("command execution can omit authority secrets from child environments", async () => {
    const variable = "CASCADE_TEST_CHILD_SECRET";
    process.env[variable] = "standalone-confirmation-secret";
    try {
      const result = await runCommand(
        [
          process.execPath,
          "-e",
          `process.stdout.write(process.env.${variable} ?? "absent")`,
        ],
        { unsetEnv: [variable] },
      );
      expect(result.stdout).toBe("absent");
    } finally {
      delete process.env[variable];
    }
  });
});
