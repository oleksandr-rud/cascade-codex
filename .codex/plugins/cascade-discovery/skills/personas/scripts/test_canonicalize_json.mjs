#!/usr/bin/env node
import assert from "node:assert/strict";
import childProcess from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { canonicalDigest, canonicalize } from "./canonicalize_json.mjs";


const value = {
  literals: [null, true, false],
  string: "€$\u000f\nA'B\"\\\"/",
  numbers: [333333333.33333329, 1e30, 4.5, 0.002, 1e-27, -0],
};
const canonical =
  '{"literals":[null,true,false],"numbers":[333333333.3333333,1e+30,4.5,0.002,1e-27,0],"string":"€$\\u000f\\nA\'B\\\"\\\\\\\"/"}';
assert.equal(canonicalize(value), canonical);
assert.equal(
  canonicalDigest(value).sha256,
  crypto.createHash("sha256").update(canonical, "utf8").digest("hex"),
);
assert.throws(() => canonicalize("\ud800"), /lone high surrogate/);
assert.equal(canonicalize({ b: 1, a: 2 }), '{"a":2,"b":1}');
const fixture = path.join(os.tmpdir(), `cascade-personas-duplicate-${process.pid}.json`);
fs.writeFileSync(fixture, '{"a":1,"a":2}', "utf8");
try {
  const cli = childProcess.spawnSync(
    process.execPath,
    [path.join(path.dirname(fileURLToPath(import.meta.url)), "canonicalize_json.mjs"), fixture],
    { encoding: "utf8" },
  );
  assert.equal(cli.status, 2);
  assert.match(cli.stderr, /duplicate JSON member/);
} finally {
  fs.unlinkSync(fixture);
}
process.stdout.write("PASS canonicalize_json RFC8785 vectors=5\n");
