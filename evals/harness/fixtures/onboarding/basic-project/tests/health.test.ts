import assert from "node:assert/strict";
import test from "node:test";

import { health } from "../src/routes/health";

test("health returns ok", () => {
  assert.deepEqual(health(), { status: "ok" });
});
