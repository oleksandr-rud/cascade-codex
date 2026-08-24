#!/usr/bin/env node

import { chmod, mkdtemp, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { runModel } from "./execution-adapters.mjs";

const root = await mkdtemp(join(tmpdir(), "cascade-prompt-adapter-test-"));
const adapter = join(root, "adapter.cjs");
const config = join(root, "adapters.json");
await writeFile(adapter, `#!/usr/bin/env node\nconst request=JSON.parse(require("node:fs").readFileSync(0,"utf8"));if(request.protocol!=="cascade-evals-command-v1")process.exit(9);process.stdout.write(JSON.stringify({text:"model="+request.model+" prompt="+request.prompt,usage:{input_tokens:4,output_tokens:2}}));\n`);
await chmod(adapter, 0o755);
await writeFile(config, `${JSON.stringify({ schema_version: 1, adapters: { fixture: { command: adapter, args: [] } } }, null, 2)}\n`);
const result = runModel({ model: "closed-model-x", prompt: "hello", cwd: root, timeoutMs: 1000, adapter: "command-json-v1", adapterConfig: config, adapterId: "fixture" });
if (result.status !== "COMPLETED" || result.final_text !== "model=closed-model-x prompt=hello") throw new Error(JSON.stringify(result));
if (result.usage.input_tokens !== 4 || result.adapter_identity !== "fixture") throw new Error("normalized adapter telemetry is missing");
console.log(`PASS: provider-neutral command adapter protocol and normalized response (${root})`);
