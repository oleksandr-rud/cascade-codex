import { expect, test } from "bun:test";
import { createHash, randomUUID } from "node:crypto";
import { chmod, cp, mkdir, mkdtemp, readFile, rm, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { rootPath, runCommand, valueDigest, walkFiles } from "../../scripts/cascade/common";
import { CampaignArtifactStore } from "../../scripts/cascade/campaign-artifacts";
import { evaluationExecutionFiles, parseCodexJsonl } from "../../scripts/cascade/evaluations";
import { resolveCampaign } from "../../scripts/cascade/simulation-definitions";
import { campaignSessionContract } from "../../scripts/cascade/campaigns";
import { readStructured, stringifyYaml } from "../../scripts/cascade/structured-data";

test("evaluation keeps explicit runtime inputs and task evidence while omitting automatic runtime copies", () => {
  const sources = ["scripts/cascade.ts", "scripts/cascade/common.ts", "product-evals/tasks/scenario.yaml"].map((path, index) => ({ source_path: rootPath(path), path: `execution/source/${index}` }));
  const evidence = ["execution/tasks/task/stdout.jsonl", "execution/execution-receipt.json"];
  const selected = evaluationExecutionFiles([...sources.map((source) => source.path), ...evidence, "unrelated.json"], sources, ["scripts/cascade.ts"]);
  expect(selected).toEqual(["execution/execution-receipt.json", "execution/source/0", "execution/source/2", "execution/tasks/task/stdout.jsonl"]);
});

test("an explicitly selected baseline file is frozen once and remains evaluator input", async () => {
  const id = `explicit-source-${randomUUID()}`;
  const campaignPath = rootPath(`product-evals/campaigns/${id}.yaml`);
  const taskPath = `product-evals/tasks/${id}.yaml`;
  const campaign = await readStructured<any>(rootPath("product-evals/campaigns/simulation-contract-smoke.yaml"));
  const task = await readStructured<any>(rootPath(campaign.task_files[0]));
  task.inputs = ["scripts/cascade.ts", "harness-evals/task-admission/cases.yaml"];
  campaign.task_files = [taskPath];
  await writeFile(rootPath(taskPath), stringifyYaml(task), { flag: "wx" });
  await writeFile(campaignPath, stringifyYaml(campaign), { flag: "wx" });
  try {
    const resolved = await resolveCampaign(campaignPath);
    const sources = resolved.sourceFiles.map((source_path, index) => ({ source_path: rootPath(source_path), path: `execution/source/${index}` }));
    const selected = evaluationExecutionFiles(sources.map((source) => source.path), sources, resolved.tasks.flatMap((task) => task.inputs ?? []));
    for (const path of task.inputs) {
      expect(resolved.sourceFiles.filter((source) => source === path)).toHaveLength(1);
      expect(selected).toContain(sources.find((source) => source.source_path === rootPath(path))!.path);
    }
  } finally { await unlink(campaignPath); await unlink(rootPath(taskPath)); }
});

test("compact and legacy evaluator packets verify; rewritten and incomplete copies fail closed", async () => {
  const id = `evaluation-input-${randomUUID()}`;
  const campaignPath = rootPath(`product-evals/campaigns/${id}.yaml`);
  const bin = await mkdtemp(join(tmpdir(), "cascade-evaluation-fixture-"));
  const fake = join(bin, "codex");
  const campaign = await readStructured<any>(rootPath("product-evals/campaigns/agent-response-fake-smoke.yaml"));
  campaign.evaluation_profile_file = "product-evals/rubrics/codex-independent-v1.yaml";
  await writeFile(campaignPath, stringifyYaml(campaign), { flag: "wx" });
  await expect(resolveCampaign(campaignPath)).rejects.toThrow("lease_ttl_ms must cover the evaluator timeout");
  campaign.session.lease_ttl_ms = 330000;
  await writeFile(campaignPath, stringifyYaml(campaign));
  const resolved = await resolveCampaign(campaignPath);
  expect(campaignSessionContract({ ...resolved, campaign: { ...resolved.campaign, session: undefined } }, id).lease_ttl_ms).toBe(330000);
  // This executable is an offline protocol fixture, never semantic model evidence.
  await writeFile(fake, `#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const request = JSON.parse(fs.readFileSync('request.json', 'utf8'));
const manifest = JSON.parse(fs.readFileSync('input-manifest.json', 'utf8'));
const prompt = fs.readFileSync(0, 'utf8');
const context = JSON.parse(prompt.split('<frozen_input>\\n')[1].split('\\n</frozen_input>')[0]);
if (context.input_manifest_digest !== manifest.manifest_digest || context.evidence.some(file => file.path === 'run/execution/source-manifest.json') || !process.argv.includes('shell_tool')) throw new Error('evaluation input must arrive over stdin with tools disabled');
const mode = process.env.CASCADE_EVALUATION_FIXTURE_MODE;
const taskRoot = path.join('run/execution/tasks', fs.readdirSync('run/execution/tasks')[0]);
if (mode === 'cancelled') {
  fs.writeFileSync(process.env.CASCADE_EVALUATION_FIXTURE_MARKER, 'dispatched');
  setInterval(() => {}, 1000);
} else if (mode === 'blocked') {
  console.log(JSON.stringify({type:'turn.failed', error:{message:'offline fixture unavailable'}}));
  process.exitCode = 1;
} else {
  if (mode === 'tampered') fs.appendFileSync(path.join(taskRoot, 'result.json'), '\\n');
  if (mode === 'contract') fs.appendFileSync('contracts/AGENT.md', '\\nsubstituted contract\\n');
  if (mode === 'omitted') fs.unlinkSync(path.join(taskRoot, 'oracle.json'));
  if (mode === 'inline-tampered') {
    context.evidence[0].text += ' substituted context';
    fs.writeFileSync('../prompt.txt', prompt.replace(/<frozen_input>\\n[\\s\\S]*\\n<\\/frozen_input>/, '<frozen_input>\\n'+JSON.stringify(context)+'\\n</frozen_input>'));
  }
  const stable = value => JSON.stringify(value, (_key, item) => item && typeof item === 'object' && !Array.isArray(item) ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);
  const files = [];
  const walk = dir => { for (const entry of fs.readdirSync(dir, {withFileTypes:true})) {
    const name = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(name);
    else if (name !== 'input-manifest.json') files.push({path:name, sha256:crypto.createHash('sha256').update(fs.readFileSync(name)).digest('hex')});
  }};
  if (['tampered','contract','omitted'].includes(mode)) {
    walk('.');
    manifest.files = files.sort((a,b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
    manifest.manifest_digest = crypto.createHash('sha256').update(stable(manifest.files)).digest('hex');
    fs.writeFileSync('input-manifest.json', JSON.stringify(manifest));
  }
  const output = {schema_version:3, ...Object.fromEntries(['evaluation_id','run_id','campaign_id','source_manifest_digest','execution_receipt_digest','evaluation_input_digest','evaluator_identity'].map(key=>[key,request[key]])), input_manifest_digest:manifest.manifest_digest, status:request.mechanical_evaluation.status, mechanical_gate_status:request.mechanical_evaluation.status, claim_assessments:request.mechanical_evaluation.claim_ledger.map(claim=>({claim_id:claim.claim_id,status:claim.status,reason:'Offline fixture only',evidence:['run/execution/execution-receipt.json']})), refinement_proposals:[], root_cause:'none', earliest_failure:null, residual_uncertainty:['Offline fixture, no semantic model evidence'], next_route:'review fixture'};
  console.log(JSON.stringify({type:'item.completed',item:{type:'agent_message',text:JSON.stringify(output)}}));
  console.log(JSON.stringify({type:'turn.completed',usage:{input_tokens:0,output_tokens:0}}));
}
`);
  await chmod(fake, 0o755);
  try {
    for (const mode of ["compact", "blocked", "cancelled", "tampered", "contract", "omitted", "inline-tampered"]) {
      const runId = `${id}-${mode}`;
      const artifactRoot = rootPath(`.artifacts/product-evals/${runId}`);
      const env = { ...process.env, PATH: `${bin}:${process.env.PATH}`, CASCADE_EVALUATION_FIXTURE_MODE: mode, CASCADE_EVALUATION_FIXTURE_RUN: artifactRoot, CASCADE_EVALUATION_FIXTURE_MARKER: join(bin, "dispatched") };
      const argv = [process.execPath, "scripts/cascade.ts", "campaign", "run", id, "--run-id", runId];
      let result;
      if (mode === "cancelled") {
        const child = spawn(argv[0]!, argv.slice(1), { cwd: rootPath(), env, stdio: ["ignore", "pipe", "pipe"] });
        let output = "";
        child.stdout.on("data", (chunk) => { output += chunk; });
        child.stderr.on("data", (chunk) => { output += chunk; });
        const closed = once(child, "close");
        const guard = setTimeout(() => child.kill("SIGKILL"), 20000);
        try {
          const deadline = Date.now() + 10000;
          while (true) {
            try { await readFile(env.CASCADE_EVALUATION_FIXTURE_MARKER); break; } catch {
              if (Date.now() >= deadline || child.exitCode !== null) throw new Error(`fixture did not dispatch: ${output}`);
              await new Promise((resolve) => setTimeout(resolve, 10));
            }
          }
          child.kill("SIGTERM");
          result = { exitCode: (await closed)[0], stdout: output, stderr: "" };
        } finally { clearTimeout(guard); child.kill("SIGKILL"); }
      } else result = await runCommand(argv, { cwd: rootPath(), env, timeoutMs: 60000 });
      const diagnostic = `${mode}: ${result.stdout}\n${result.stderr}`;
      if (["tampered", "contract", "omitted", "inline-tampered"].includes(mode)) {
        expect(result.exitCode, diagnostic).toBe(1);
        expect(diagnostic).toContain(mode === "tampered" ? "copied evidence differs" : mode === "contract" ? "contract differs" : mode === "inline-tampered" ? "inline evaluation context differs" : "omitted required execution evidence");
        continue;
      }
      expect(result.exitCode, diagnostic).toBe(["blocked", "cancelled"].includes(mode) ? 1 : 0);
      expect(diagnostic).not.toContain("ERROR:");
      const verified = await runCommand([process.execPath, "scripts/cascade.ts", "campaign", "verify", runId], { cwd: rootPath(), timeoutMs: 60000 });
      expect(verified.exitCode, `${mode}: ${verified.stdout}\n${verified.stderr}`).toBe(0);
      const original = JSON.parse(await readFile(join(artifactRoot, "execution/source-manifest.json"), "utf8"));
      const input = JSON.parse(await readFile(join(artifactRoot, `evaluations/${runId}-evaluation/input/input-manifest.json`), "utf8"));
      const copied = new Set(input.files.map((file: any) => file.path));
      const runtime = original.frozen_sources.find((file: any) => file.source_path === rootPath("scripts/cascade/campaign-artifacts.ts"));
      expect(copied.has(`run/${runtime.path}`)).toBe(false);
      expect(copied.has("run/execution/execution-receipt.json")).toBe(true);
      if (mode === "compact") {
        expect(() => parseCodexJsonl(JSON.stringify({ type: "item.started", item: { type: "command_execution", command: "cat request.json" } }))).toThrow("prohibited");
        // Verify a legacy full-source input with the same shared reader, leaving
        // the completed campaign immutable. No new semantic verdict is created.
        const legacyRoot = join(bin, runId);
        await cp(join(artifactRoot, "execution"), join(legacyRoot, "execution"), { recursive: true });
        const evaluationRoot = `evaluations/${runId}-evaluation`;
        const inputRoot = join(legacyRoot, evaluationRoot, "input");
        await cp(join(artifactRoot, evaluationRoot, "input"), inputRoot, { recursive: true });
        await cp(join(artifactRoot, "execution/source"), join(inputRoot, "run/execution/source"), { recursive: true });
        const files = [];
        for (const file of await walkFiles(inputRoot)) {
          const path = relative(inputRoot, file);
          if (path !== "input-manifest.json") files.push({ path, sha256: createHash("sha256").update(await readFile(file)).digest("hex") });
        }
        input.files = files;
        input.manifest_digest = valueDigest(files);
        await writeFile(join(inputRoot, "input-manifest.json"), JSON.stringify(input));
        const store = new CampaignArtifactStore(bin, runId);
        const profile = await readStructured<any>(rootPath(campaign.evaluation_profile_file));
        const checked = await (store as any).readEvaluationInput({ evaluationId: `${runId}-evaluation`, evaluationInputDigest: input.evaluation_input_digest, relativeFiles: (await walkFiles(legacyRoot)).map((path) => relative(legacyRoot, path)), sourceManifest: original, authority: { campaign, profile } });
        expect(checked.listed.has(`run/${runtime.path}`)).toBe(true);
      }
    }
  } finally {
    await unlink(campaignPath);
    await rm(bin, { recursive: true });
  }
}, 180000);

test("a batch reads the route catalog once and a later batch refreshes it", async () => {
  const runRoot = await mkdtemp(rootPath(".artifacts/harness-evals-route-batch-"));
  try {
    const catalog = JSON.parse(await readFile(rootPath("harness-evals/scenarios.generated.json"), "utf8"));
    const scenario = catalog.scenarios.find((item: any) => item.id === "HS-context-handoff");
    await writeFile(join(runRoot, "selected-scenarios.json"), JSON.stringify([scenario]));
    await writeFile(join(runRoot, "run.json"), JSON.stringify({ run_id: "offline-batch" }));
    for (let index = 1; index <= 4; index++) {
      const caseRoot = join(runRoot, "cases", `${scenario.id}-r0${index}`);
      await mkdir(caseRoot, { recursive: true });
      const response = { scenario_id: scenario.id, primary_skill: "context", supporting_skills: [], rejected_skills: [], status: "PASS", decision: "Offline fixture", evidence: [{ path: ".codex/skills/context/SKILL.md", observation: "Offline fixture" }], actions: [], missing_context: [], next_route: index === 4 ? "context -> validate-change" : `context -> ${scenario.expectation.next_route}` };
      const events = [{ type: "thread.started", thread_id: "offline-fixture" }, { type: "item.completed", item: { type: "command_execution", command: "cat .codex/skills/context/SKILL.md", status: "completed", exit_code: 0 } }, { type: "item.completed", item: { type: "agent_message", text: JSON.stringify(response) } }, { type: "turn.completed" }];
      await writeFile(join(caseRoot, "stdout.jsonl"), events.map((event) => JSON.stringify(event)).join("\n"));
      await writeFile(join(caseRoot, "stderr.log"), "");
      await writeFile(join(caseRoot, "command.json"), "{}");
      await writeFile(join(caseRoot, "normalized.json"), JSON.stringify({ exit_code: 0, duration_seconds: 0, timed_out: false }));
    }
    const code = `import { mock } from 'bun:test';
      const workflow = await import('./scripts/cascade/plugin-workflow.ts');
      const build = workflow.buildPluginCapabilityCatalog;
      let reads = 0;
      mock.module('./scripts/cascade/plugin-workflow.ts', () => ({...workflow, buildPluginCapabilityCatalog: async () => { reads++; return build(); }}));
      const { main } = await import('./scripts/cascade/evals.ts');
      for (let batch = 1; batch <= 2; batch++) {
        await main(['evaluate', '--run-dir', ${JSON.stringify(runRoot)}]);
        if (reads !== batch) throw new Error('unexpected catalog reads: ' + reads);
      }`;
    const result = await runCommand([process.execPath, "--no-install", "--eval", code], { cwd: rootPath(), timeoutMs: 30000 });
    expect(result.exitCode, `${result.stdout}\n${result.stderr}`).toBe(0);
    const summary = JSON.parse(await readFile(join(runRoot, "summary.json"), "utf8"));
    summary.eligibilities.sort((a: any, b: any) => a.case_dir.localeCompare(b.case_dir));
    expect(summary.eligibilities.map((item: any) => item.verdict)).toEqual(["PASS", "PASS", "PASS", "FAIL"]);
    expect(summary.eligibilities[3].hard_failures).toContain("handoff-route");
  } finally { await rm(runRoot, { recursive: true }); }
}, 40000);
