import { expect, test } from "bun:test";

import { CascadeCommandExecutor } from "./command-executor";
import type { CascadeCommandLoader } from "./command-dispatcher";

test("serializes asynchronous command invocations and continues after failure", async () => {
  const events: string[] = [];
  let releaseFirst!: () => void;
  const firstGate = new Promise<void>((resolve) => {
    releaseFirst = resolve;
  });
  const loader: CascadeCommandLoader = async () => ({
    main: async ([value]) => {
      events.push(`start:${value}`);
      if (value === "first") await firstGate;
      events.push(`finish:${value}`);
      if (value === "fail") throw new Error("expected failure");
      return 0;
    },
  });
  const executor = new CascadeCommandExecutor({
    loaders: { campaign: loader },
  });

  const first = executor.execute({ argv: ["campaign", "first"] });
  const second = executor.execute({ argv: ["campaign", "fail"] });
  const third = executor.execute({ argv: ["campaign", "third"] });
  await Promise.resolve();
  await Promise.resolve();
  expect(events).toEqual(["start:first"]);

  releaseFirst();
  expect(await first).toBe(0);
  await expect(second).rejects.toThrow("expected failure");
  expect(await third).toBe(0);
  expect(events).toEqual([
    "start:first",
    "finish:first",
    "start:fail",
    "finish:fail",
    "start:third",
    "finish:third",
  ]);
});
