import { chmod, stat } from "node:fs/promises";
import { arch, platform } from "node:os";
import { resolve } from "node:path";

if (platform() !== "win32") {
  const helper = resolve(
    "node_modules",
    "node-pty",
    "prebuilds",
    `${platform()}-${arch()}`,
    "spawn-helper",
  );
  const current = await stat(helper);
  await chmod(helper, current.mode | 0o111);
}
