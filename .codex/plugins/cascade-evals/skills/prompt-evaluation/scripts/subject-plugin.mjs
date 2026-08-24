import { spawnSync } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const skillRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const pluginRoot = dirname(dirname(skillRoot));
const resolver = join(pluginRoot, "scripts/resolve_plugin_skill.py");

async function assertSkillRoot(path, expectedName) {
  const root = resolve(path);
  const entrypoint = join(root, "SKILL.md");
  await access(entrypoint);
  if (expectedName) {
    const text = await readFile(entrypoint, "utf8");
    const name = text.match(/^---\s*$[\s\S]*?^name:\s*([^\s]+)\s*$/m)?.[1]?.replace(/^['"]|['"]$/g, "");
    if (name !== expectedName) throw new Error(`skill identity mismatch: expected ${expectedName}, found ${name ?? "missing"}`);
  }
  return root;
}

export async function resolveInstalledSkill({ explicitPath, envVar, pluginName, skillName, marketplace } = {}) {
  if (!pluginName || !skillName) throw new Error("pluginName and skillName are required");
  const override = explicitPath ?? (envVar ? process.env[envVar] : undefined);
  if (override) return assertSkillRoot(override, skillName);
  const args = [resolver, "--plugin", pluginName, "--skill", skillName];
  if (marketplace) args.push("--marketplace", marketplace);
  const result = spawnSync("python3", args, { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  let receipt;
  try { receipt = JSON.parse(result.stdout || "{}"); }
  catch { throw new Error(`dependency resolver returned invalid JSON for ${pluginName}:${skillName}`); }
  if (result.error || result.status !== 0 || receipt.status !== "AVAILABLE") {
    throw new Error(`dependency ${pluginName}:${skillName} is ${receipt.status ?? "INVALID"}: ${receipt.code ?? result.error?.message ?? result.stderr}`);
  }
  return assertSkillRoot(dirname(receipt.skill.path), skillName);
}

export async function resolveSubjectSkill({ explicitPath, pluginName = "cascade-prompt", skillName = "prompt" } = {}) {
  return resolveInstalledSkill({ explicitPath, envVar: "CASCADE_PROMPT_SKILL_ROOT", pluginName, skillName });
}
