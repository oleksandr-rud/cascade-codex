import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve } from "node:path";

const repository = resolve(import.meta.dir, "..");
const names = ["build-spec", "spec-diagrams", "spec-test-design"] as const;

function inside(root: string, path: string): boolean {
  const suffix = relative(root, path);
  return suffix !== "" && !suffix.startsWith("..") && !isAbsolute(suffix);
}

async function inventory(root: string): Promise<Map<string, Buffer>> {
  const files = new Map<string, Buffer>();
  async function visit(directory: string): Promise<void> {
    let entries;
    try { entries = await readdir(directory, { withFileTypes: true }); }
    catch (error: any) { if (error.code === "ENOENT") return; throw error; }
    for (const entry of entries) {
      if (entry.name === "__pycache__") continue;
      const path = resolve(directory, entry.name);
      if (!inside(root, path) || entry.isSymbolicLink()) throw new Error(`Unsafe export resource: ${path}`);
      if (entry.isDirectory()) await visit(path);
      else if (entry.isFile()) files.set(relative(root, path).replaceAll("\\", "/"), await readFile(path));
    }
  }
  await visit(root);
  return files;
}

const mode = process.argv.slice(2);
if (mode.length !== 1 || !["--write", "--check"].includes(mode[0]!)) {
  throw new Error("Usage: bun scripts/build-spec-skill.ts <--write|--check>");
}
for (const name of names) {
  const source = resolve(repository, "specification-kit/skills", name);
  const destination = resolve(repository, "exports/skills", name);
  if (!inside(repository, source) || !inside(repository, destination)) throw new Error("Specification package roots escape repository");
  const expected = await inventory(source);
  if (!expected.has("SKILL.md")) throw new Error(`Canonical specification skill is missing: ${name}`);
  const current = await inventory(destination);
  const changed = [...expected].filter(([path, bytes]) => !current.get(path)?.equals(bytes));
  const obsolete = [...current.keys()].filter(path => !expected.has(path));
  if (mode[0] === "--check") {
    if (changed.length || obsolete.length) throw new Error(`Specification export is stale: ${name} changed=${changed.length} obsolete=${obsolete.length}`);
  } else {
    for (const [path, bytes] of changed) {
      const target = resolve(destination, path);
      if (!inside(destination, target)) throw new Error("Export write escapes destination");
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, bytes);
    }
    for (const path of obsolete) {
      const target = resolve(destination, path);
      if (!inside(destination, target)) throw new Error("Export cleanup escapes destination");
      await rm(target); // Exact obsolete files only; never delete a directory tree.
    }
  }
  console.log(`spec_export_status=PASS skill=${name} mode=${mode[0]} files=${expected.size} changed=${changed.length} obsolete=${obsolete.length}`);
}
