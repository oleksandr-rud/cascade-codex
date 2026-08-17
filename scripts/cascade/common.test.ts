import { describe, expect, test } from "bun:test";
import {
  link,
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
  stat,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  CONFIRMATION_SECRET_MAX_BYTES,
  CONFIRMATION_SECRET_MIN_BYTES,
  assertJsonSchema,
  assertNoExactConfirmationSecretBytes,
  cascadePairwiseDistinctAjvKeyword,
  CASCADE_PAIRWISE_DISTINCT_KEYWORD,
  CASCADE_PAIRWISE_DISTINCT_VOCABULARY_ID,
  CASCADE_RUN_ARTIFACT_META_SCHEMA_ID,
  CascadeError,
  boundedPath,
  flag,
  flags,
  compareRfc3339Instants,
  confirmationSecretBytes,
  parseArgs,
  parseFrontmatter,
  parseRfc3339ComparableInstant,
  parseRfc3339Instant,
  readBoundedRegularFile,
  rootPath,
  runCommand,
  stableJson,
  valueDigest,
} from "./common";

describe("Cascade common tooling", () => {
  test("uses one byte-exact confirmation secret grammar", () => {
    const minimum = "A".repeat(CONFIRMATION_SECRET_MIN_BYTES);
    const maximum = "z".repeat(CONFIRMATION_SECRET_MAX_BYTES);
    expect(confirmationSecretBytes(minimum)).toEqual(Buffer.from(minimum, "ascii"));
    expect(confirmationSecretBytes(maximum).byteLength).toBe(
      CONFIRMATION_SECRET_MAX_BYTES,
    );
    for (const invalid of [
      "A".repeat(CONFIRMATION_SECRET_MIN_BYTES - 1),
      "A".repeat(CONFIRMATION_SECRET_MAX_BYTES + 1),
      `${"A".repeat(CONFIRMATION_SECRET_MIN_BYTES)}\n`,
      `${"A".repeat(CONFIRMATION_SECRET_MIN_BYTES)}é`,
      `${"A".repeat(CONFIRMATION_SECRET_MIN_BYTES)}\u0000`,
    ]) {
      expect(() => confirmationSecretBytes(invalid)).toThrow();
    }

    expect(() =>
      assertNoExactConfirmationSecretBytes(
        Buffer.from(`prefix:${minimum}:suffix`, "utf8"),
        [minimum],
        "packet",
      )
    ).toThrow("exact confirmation key bytes");
    expect(() =>
      assertNoExactConfirmationSecretBytes(
        Buffer.from(
          `source mentions confirmationSecretBytes and token=${"x".repeat(40)}`,
          "utf8",
        ),
        [minimum],
        "packet",
      )
    ).not.toThrow();
  });

  test("stable JSON and digest ignore object key order", () => {
    expect(stableJson({ b: 2, a: { d: 4, c: 3 } })).toBe(
      '{"a":{"c":3,"d":4},"b":2}',
    );
    expect(valueDigest({ b: 2, a: 1 })).toBe(valueDigest({ a: 1, b: 2 }));
  });

  test("arguments retain flags and positionals", () => {
    const parsed = parseArgs(["run", "--run-id", "r-1", "--check"]);
    expect(parsed.positionals).toEqual(["run"]);
    expect(flag(parsed, "run-id")).toBe("r-1");
    expect(flag(parsed, "check")).toBe("true");
  });

  test("arguments retain repeated flags", () => {
    const parsed = parseArgs([
      "run",
      "--skill",
      "context",
      "--skill=plan-change",
      "--runtime",
    ]);
    expect(flags(parsed, "skill")).toEqual(["context", "plan-change"]);
    expect(flag(parsed, "runtime")).toBe("true");
  });

  test("bounded paths reject traversal", () => {
    expect(() => boundedPath("../../outside")).toThrow(CascadeError);
    expect(
      boundedPath("product-evals/campaigns", "product-evals/"),
    ).toContain("product-evals/campaigns");
  });

  test("bounded JSON Schema validation enforces closed shapes and oneOf", () => {
    const schema = {
      type: "object",
      additionalProperties: false,
      required: ["value"],
      properties: {
        value: {
          oneOf: [
            { type: "null" },
            { type: "string", minLength: 1 },
          ],
        },
      },
    };
    expect(() => assertJsonSchema({ value: "ok" }, schema)).not.toThrow();
    expect(() => assertJsonSchema({ value: null }, schema)).not.toThrow();
    expect(() => assertJsonSchema({ value: 1 }, schema)).toThrow(
      "must match exactly one schema alternative",
    );
    expect(() => assertJsonSchema({ value: "ok", extra: true }, schema)).toThrow(
      "unsupported properties",
    );
  });

  test("bounded JSON Schema validation enforces the versioned pairwise-distinct contract", () => {
    const principal = {
      type: "object",
      required: ["session_id", "subject"],
      properties: {
        session_id: { type: "string" },
        subject: { type: "string" },
      },
    };
    const schema = {
      $schema: CASCADE_RUN_ARTIFACT_META_SCHEMA_ID,
      type: "object",
      additionalProperties: false,
      required: [
        "operator",
        "specialized_evaluator",
        "evaluator",
        "aggregator",
        "target",
        "simulator",
        "recovery",
      ],
      properties: {
        operator: principal,
        specialized_evaluator: {
          oneOf: [
            { type: "null" },
            principal,
          ],
        },
        evaluator: principal,
        aggregator: principal,
        target: principal,
        simulator: principal,
        recovery: principal,
      },
      [CASCADE_PAIRWISE_DISTINCT_KEYWORD]: {
        version: 1,
        properties: [
          "operator",
          "specialized_evaluator",
          "evaluator",
          "aggregator",
          "target",
          "simulator",
          "recovery",
        ],
        fields: ["session_id", "subject"],
        ignore_null: true,
      },
    };
    const valid = {
      operator: { session_id: "operator-session", subject: "operator" },
      specialized_evaluator: null,
      evaluator: { session_id: "evaluator-session", subject: "evaluator" },
      aggregator: { session_id: "aggregator-session", subject: "aggregator" },
      target: { session_id: "target-session", subject: "target" },
      simulator: { session_id: "simulator-session", subject: "simulator" },
      recovery: { session_id: "recovery-session", subject: "recovery" },
    };
    expect(() => assertJsonSchema(valid, schema)).not.toThrow();
    expect(() => assertJsonSchema({
      ...valid,
      evaluator: { ...valid.evaluator, session_id: "operator-session" },
    }, schema)).toThrow("$.evaluator.session_id duplicates $.operator.session_id");
    expect(() => assertJsonSchema({
      ...valid,
      specialized_evaluator: {
        session_id: "specialized-session",
        subject: "evaluator",
      },
    }, schema)).toThrow(
      "$.evaluator.subject duplicates $.specialized_evaluator.subject",
    );
    expect(() => assertJsonSchema(valid, {
      ...schema,
      [CASCADE_PAIRWISE_DISTINCT_KEYWORD]: {
        ...schema[CASCADE_PAIRWISE_DISTINCT_KEYWORD],
        version: 2,
      },
    })).toThrow("invalid x-cascade-pairwise-distinct-fields contract");
  });

  test("prevalidates schema contracts and rejects prototype/property redirection tricks", () => {
    const closed = {
      type: "object",
      additionalProperties: false,
      required: ["value"],
      properties: { value: { type: "string" } },
    };
    const inherited = Object.create({ value: "ghost" });
    expect(() => assertJsonSchema(inherited, closed)).toThrow("$.value is required");
    for (const key of ["__proto__", "prototype", "constructor", "toString"]) {
      const candidate = JSON.parse(`{"value":"ok","${key}":"malicious"}`);
      expect(() => assertJsonSchema(candidate, closed)).toThrow("unsupported properties");
    }

    expect(() => assertJsonSchema("anything", {
      oneOf: [
        { type: "string" },
        { type: "number", oneOf: "malformed" },
      ],
    })).toThrow("invalid oneOf schema");
    expect(() => assertJsonSchema({}, { $ref: "#/__proto__" })).toThrow(
      "unsafe property name: __proto__",
    );
    expect(() => assertJsonSchema({}, { $ref: "#/$defs/constructor", $defs: {} }))
      .toThrow("unsafe property name: constructor");
    expect(() => assertJsonSchema({}, {
      $ref: "#/redirected",
      redirected: { oneOf: "malformed" },
    })).toThrow("invalid oneOf schema");

    const inheritedProperties = Object.create({ value: { type: "string" } });
    expect(() => assertJsonSchema({ value: "ghost" }, {
      type: "object",
      required: ["value"],
      properties: inheritedProperties,
    })).toThrow("plain schema data");

    expect(() => assertJsonSchema({ b: true }, {
      type: "object",
      properties: { a: true },
      required: ["b"],
    })).not.toThrow();
    expect(() => assertJsonSchema({ a: true }, {
      type: "object",
      properties: { a: true },
      required: ["b"],
    })).toThrow("$.b is required");
  });

  test("normalizes the complete schema graph once before preflight and evaluation", () => {
    const descriptorReads = new Map<PropertyKey, number>();
    let liveReads = 0;
    const allOfTarget = [{ type: "string" }, { minLength: 3 }];
    const allOf = new Proxy(allOfTarget, {
      get() {
        liveReads += 1;
        return { type: "number" };
      },
      getOwnPropertyDescriptor(target, key) {
        const reads = (descriptorReads.get(key) ?? 0) + 1;
        descriptorReads.set(key, reads);
        if (reads > 1 && key === "1") {
          return {
            value: { type: "number" },
            enumerable: true,
            configurable: true,
            writable: true,
          };
        }
        return Reflect.getOwnPropertyDescriptor(target, key);
      },
    });
    const stableSchema = {
      $defs: { string: { type: "string" }, allowed: true },
      definitions: { annotation_only: { title: "preserved" } },
      allOf,
    };
    expect(() => assertJsonSchema("value", stableSchema)).not.toThrow();
    expect(liveReads).toBe(0);
    expect([...descriptorReads.values()].every((reads) => reads === 1)).toBe(true);

    const immutableSchema = {
      $defs: { text: { type: "string" } },
      allOf: [{ $ref: "#/$defs/text" }, { minLength: 2 }],
    };
    const before = stableJson(immutableSchema);
    expect(() => assertJsonSchema("ok", immutableSchema)).not.toThrow();
    expect(stableJson(immutableSchema)).toBe(before);

    let accessorReads = 0;
    const accessorSchema: Record<string, unknown> = {};
    Object.defineProperty(accessorSchema, "allOf", {
      enumerable: true,
      get() {
        accessorReads += 1;
        return accessorReads === 1
          ? [{ type: "string" }]
          : [{ type: "number" }];
      },
    });
    expect(() => assertJsonSchema("value", accessorSchema)).toThrow(
      "own enumerable data property",
    );
    expect(accessorReads).toBe(0);

    const nestedAccessor: Record<string, unknown> = {};
    Object.defineProperty(nestedAccessor, "type", {
      enumerable: true,
      get() {
        accessorReads += 1;
        return "string";
      },
    });
    expect(() => assertJsonSchema("value", {
      definitions: { unused: nestedAccessor },
      type: "string",
    })).toThrow("own enumerable data property");
    expect(accessorReads).toBe(0);

    const accessorArray = [{ type: "string" }];
    Object.defineProperty(accessorArray, "0", {
      enumerable: true,
      get() {
        accessorReads += 1;
        return { type: "number" };
      },
    });
    expect(() => assertJsonSchema("value", { allOf: accessorArray }))
      .toThrow("own enumerable data property");
    expect(accessorReads).toBe(0);

    const cycle: Record<string, unknown> = {};
    cycle.$defs = { cycle };
    expect(() => assertJsonSchema("value", cycle)).toThrow("cyclic schema graph");
    expect(() => assertJsonSchema("value", Object.create({ type: "string" })))
      .toThrow("plain schema data");
    for (const unsupported of [undefined, () => true, Symbol("schema"), NaN]) {
      expect(() => assertJsonSchema("value", {
        $defs: { unused: unsupported },
        type: "string",
      })).toThrow();
    }
  });

  test("preflights a separately selected subject from the shared root snapshot", () => {
    const unsupportedSubject = {
      type: "string",
      unevaluatedProperties: false,
    };
    const annotationRoot = {
      title: "root keeps the selected subject under an unrecognized annotation",
      selected_subject: unsupportedSubject,
    };
    expect(() => assertJsonSchema(
      "value",
      unsupportedSubject,
      "$",
      annotationRoot,
    )).toThrow("$schema subject contains unsupported assertion keyword unevaluatedProperties");

    const malformedPairwiseSubject = {
      type: "object",
      [CASCADE_PAIRWISE_DISTINCT_KEYWORD]: null,
    };
    const dialectRoot = {
      $schema: CASCADE_RUN_ARTIFACT_META_SCHEMA_ID,
      selected_subject: malformedPairwiseSubject,
    };
    try {
      assertJsonSchema({}, malformedPairwiseSubject, "$", dialectRoot);
      throw new Error("expected malformed selected-subject extension rejection");
    } catch (error) {
      expect(error).toBeInstanceOf(CascadeError);
      expect((error as Error).message).toContain(
        `invalid ${CASCADE_PAIRWISE_DISTINCT_KEYWORD} contract`,
      );
    }

    const descriptorReads = new Map<PropertyKey, number>();
    const selectedTarget = { type: "string" };
    const selectedSubject = new Proxy({
      allOf: [
        selectedTarget,
        { $ref: "#/$defs/shared" },
      ],
    }, {
      getOwnPropertyDescriptor(target, key) {
        descriptorReads.set(key, (descriptorReads.get(key) ?? 0) + 1);
        return Reflect.getOwnPropertyDescriptor(target, key);
      },
    });
    const sharedRoot = {
      $defs: { shared: selectedTarget },
      selected_subject: selectedSubject,
    };
    expect(() => assertJsonSchema("value", selectedSubject, "$", sharedRoot))
      .not.toThrow();
    expect([...descriptorReads.values()].every((reads) => reads === 1)).toBe(true);
  });

  test("bounds schema normalization and local reference traversal", () => {
    const oversizedSchemaArray: unknown[] = [];
    oversizedSchemaArray.length = 100_001;
    expect(() => assertJsonSchema("value", { allOf: oversizedSchemaArray }))
      .toThrow("schema array length limit");

    let nestedSchema: Record<string, unknown> = { type: "string" };
    for (let index = 0; index < 300; index += 1) {
      nestedSchema = { allOf: [nestedSchema] };
    }
    expect(() => assertJsonSchema("value", nestedSchema))
      .toThrow("schema graph depth limit");

    const selfReference = {
      $defs: {
        loop: { $ref: "#/$defs/loop" },
      },
      $ref: "#/$defs/loop",
    };
    const mutualReference = {
      $defs: {
        left: { $ref: "#/$defs/right" },
        right: { $ref: "#/$defs/left" },
      },
      $ref: "#/$defs/left",
    };
    const deepDefinitions: Record<string, unknown> = {};
    for (let index = 0; index < 300; index += 1) {
      deepDefinitions[`ref_${index}`] = index === 299
        ? { type: "string" }
        : { $ref: `#/$defs/ref_${index + 1}` };
    }
    const deepReference = {
      $defs: deepDefinitions,
      $ref: "#/$defs/ref_0",
    };

    for (const [schema, expected] of [
      [selfReference, "cyclic local schema reference"],
      [mutualReference, "cyclic local schema reference"],
      [deepReference, "schema contract depth limit"],
    ] as const) {
      try {
        assertJsonSchema("value", schema);
        throw new Error("expected bounded schema rejection");
      } catch (error) {
        expect(error).toBeInstanceOf(CascadeError);
        expect((error as Error).message).toContain(expected);
      }
    }

    const sharedLeaf = { type: "string" };
    expect(() => assertJsonSchema("value", {
      allOf: [sharedLeaf, sharedLeaf],
      $defs: { sharedLeaf },
    })).not.toThrow();
    expect(() => assertJsonSchema("value", {
      allOf: [
        { $ref: "#/$defs/shared" },
        { $ref: "#/$defs/shared" },
      ],
      $defs: { shared: { type: "string" } },
    })).not.toThrow();

    const oversizedInstance = new Array(100_001).fill(null);
    try {
      assertJsonSchema(oversizedInstance, { items: true });
      throw new Error("expected bounded evaluation rejection");
    } catch (error) {
      expect(error).toBeInstanceOf(CascadeError);
      expect((error as Error).message).toContain("schema evaluation step limit");
    }
    expect(() => assertJsonSchema(oversizedInstance, {
      not: { items: true },
    })).toThrow("schema evaluation step limit");
  });

  test("prevalidates and evaluates bounded applicators and adjacent ref keywords", () => {
    const root = {
      $defs: {
        fixed: { type: "string", const: "expected" },
      },
      $ref: "#/$defs/fixed",
      const: "conflicting",
    };
    expect(() => assertJsonSchema("expected", root)).toThrow(
      "must equal its schema constant",
    );

    expect(() => assertJsonSchema("value", {
      allOf: [{ type: "string" }, { minLength: 3 }],
    })).not.toThrow();
    expect(() => assertJsonSchema("no", {
      allOf: [{ type: "string" }, { minLength: 3 }],
    })).toThrow("is shorter than minLength");
    expect(() => assertJsonSchema("value", {
      not: { const: "forbidden" },
    })).not.toThrow();
    expect(() => assertJsonSchema("forbidden", {
      not: { const: "forbidden" },
    })).toThrow("must not match its negated schema");

    for (const schema of [
      { allOf: "malformed" },
      { allOf: [{ type: "string" }, null] },
      { not: "malformed" },
      {
        oneOf: [
          { type: "string" },
          { type: "number", allOf: "malformed" },
        ],
      },
      {
        oneOf: [
          { type: "string" },
          { type: "number", not: "malformed" },
        ],
      },
    ]) {
      expect(() => assertJsonSchema("valid branch", schema as Record<string, unknown>))
        .toThrow();
    }

    expect(() => assertJsonSchema("value", {
      oneOf: [{ type: "string" }, { type: "number" }],
      minLength: 6,
    })).toThrow("is shorter than minLength");
  });

  test("implements the bounded Draft 2020-12 assertion subset and rejects unsupported assertions everywhere", () => {
    expect(() => assertJsonSchema({ kind: "a", value: 6, tag_one: "ok" }, {
      type: "object",
      minProperties: 3,
      maxProperties: 4,
      propertyNames: { pattern: "^[a-z_]+$" },
      properties: {
        kind: { enum: ["a", "b"] },
        value: { type: "number", exclusiveMinimum: 0, exclusiveMaximum: 10, multipleOf: 2 },
      },
      patternProperties: { "^tag_": { type: "string", minLength: 2 } },
      additionalProperties: false,
      dependentRequired: { kind: ["value"] },
      dependentSchemas: { value: { properties: { kind: { const: "a" } } } },
      if: { properties: { kind: { const: "a" } }, required: ["kind"] },
      then: { required: ["tag_one"] },
      else: { not: { required: ["tag_one"] } },
      anyOf: [{ required: ["kind"] }, { required: ["missing"] }],
    })).not.toThrow();
    expect(() => assertJsonSchema({ kind: "a" }, {
      type: "object",
      dependentRequired: { kind: [] },
    })).not.toThrow();
    expect(() => assertJsonSchema({ kind: "a", value: 5, tag_one: "ok" }, {
      type: "object",
      properties: { value: { type: "number", multipleOf: 2 } },
    })).toThrow("multipleOf");
    for (const exact of [0.3, 1, 1.2, -0.3]) {
      expect(() => assertJsonSchema(exact, { type: "number", multipleOf: 0.1 }))
        .not.toThrow();
    }
    for (const inexact of [0.30000000000000004, 1.0000000000000002]) {
      expect(() => assertJsonSchema(inexact, { type: "number", multipleOf: 0.1 }))
        .toThrow("multipleOf 0.1");
    }

    expect(() => assertJsonSchema(["head", 2, 4], {
      type: "array",
      prefixItems: [{ const: "head" }],
      items: { type: "number" },
      contains: { type: "number", minimum: 3 },
      minContains: 1,
      maxContains: 1,
      uniqueItems: true,
    })).not.toThrow();
    expect(() => assertJsonSchema(["head", 4, 6], {
      prefixItems: [{ const: "head" }],
      items: { type: "number" },
      contains: { type: "number", minimum: 3 },
      maxContains: 1,
    })).toThrow("matching items");
    expect(() => assertJsonSchema([], {
      minContains: 2,
      maxContains: 1,
    })).not.toThrow();
    expect(() => assertJsonSchema([], {
      not: {
        contains: true,
        minContains: 2,
        maxContains: 1,
      },
    })).not.toThrow();
    expect(() => assertJsonSchema([], {
      contains: true,
      minContains: 2,
      maxContains: 1,
    })).toThrow("matching items");

    for (const keyword of ["$dynamicRef", "unevaluatedProperties", "unevaluatedItems"] as const) {
      expect(() => assertJsonSchema("valid branch", {
        oneOf: [
          { type: "string" },
          { type: "number", [keyword]: false },
        ],
      })).toThrow(`unsupported assertion keyword ${keyword}`);
      expect(() => assertJsonSchema("value", {
        type: "string",
        $defs: { unused: { [keyword]: false } },
      })).toThrow(`unsupported assertion keyword ${keyword}`);
    }
  });

  test("requires the custom dialect and rejects malformed keyword placement and targets", () => {
    const contract = {
      version: 1,
      properties: [
        "operator",
        "specialized_evaluator",
        "evaluator",
        "aggregator",
        "target",
        "simulator",
        "recovery",
      ],
      fields: ["session_id", "subject"],
      ignore_null: true,
    };
    const principalSlots = Object.fromEntries(
      contract.properties.map((property) => [property, { type: "object" }]),
    );
    const bound = {
      $schema: CASCADE_RUN_ARTIFACT_META_SCHEMA_ID,
      type: "object",
      properties: principalSlots,
      [CASCADE_PAIRWISE_DISTINCT_KEYWORD]: contract,
    };

    expect(() => assertJsonSchema({}, {
      ...bound,
      $schema: "https://json-schema.org/draft/2020-12/schema",
    })).toThrow(`must require ${CASCADE_RUN_ARTIFACT_META_SCHEMA_ID}`);
    expect(() => assertJsonSchema("scalar", {
      ...bound,
      type: "string",
    })).toThrow("invalid x-cascade-pairwise-distinct-fields contract");
    expect(() => assertJsonSchema({}, {
      ...bound,
      [CASCADE_PAIRWISE_DISTINCT_KEYWORD]: { ...contract, version: "1" },
    })).toThrow("invalid x-cascade-pairwise-distinct-fields contract");
    expect(() => assertJsonSchema({}, {
      ...bound,
      [CASCADE_PAIRWISE_DISTINCT_KEYWORD]: {
        ...contract,
        properties: [...contract.properties.slice(0, -1), "ghost"],
      },
    })).toThrow("invalid x-cascade-pairwise-distinct-fields contract");
    expect(() => assertJsonSchema({}, {
      ...bound,
      [CASCADE_PAIRWISE_DISTINCT_KEYWORD]: {
        ...contract,
        fields: ["role", "subject"],
      },
    })).toThrow("invalid x-cascade-pairwise-distinct-fields contract");
    expect(() => assertJsonSchema("valid branch", {
      oneOf: [
        { type: "string" },
        {
          ...bound,
          [CASCADE_PAIRWISE_DISTINCT_KEYWORD]: { ...contract, version: 2 },
        },
      ],
    })).toThrow("invalid x-cascade-pairwise-distinct-fields contract");
  });

  test("publishes a required versioned pairwise-distinct vocabulary and meta-schema", async () => {
    const vocabulary = JSON.parse(await readFile(
      rootPath("product-evals/campaigns/pairwise-distinct-fields-v1.vocabulary.schema.json"),
      "utf8",
    ));
    const metaSchema = JSON.parse(await readFile(
      rootPath("product-evals/campaigns/cascade-run-artifact-v1.meta-schema.json"),
      "utf8",
    ));
    const runArtifactSchema = JSON.parse(await readFile(
      rootPath("product-evals/campaigns/run-artifact.schema.json"),
      "utf8",
    ));

    expect(vocabulary.$id).toBe(CASCADE_PAIRWISE_DISTINCT_VOCABULARY_ID);
    expect(vocabulary.properties[CASCADE_PAIRWISE_DISTINCT_KEYWORD])
      .toMatchObject({ type: "object", additionalProperties: false });
    expect(metaSchema.$id).toBe(CASCADE_RUN_ARTIFACT_META_SCHEMA_ID);
    expect(metaSchema.$vocabulary[CASCADE_PAIRWISE_DISTINCT_VOCABULARY_ID]).toBe(true);
    expect(metaSchema.allOf).toContainEqual({
      $ref: CASCADE_PAIRWISE_DISTINCT_VOCABULARY_ID,
    });
    expect(runArtifactSchema.$schema).toBe(CASCADE_RUN_ARTIFACT_META_SCHEMA_ID);
    expect(cascadePairwiseDistinctAjvKeyword).toMatchObject({
      keyword: CASCADE_PAIRWISE_DISTINCT_KEYWORD,
      schemaType: "object",
      type: "object",
    });
  });

  test("parses strict finite RFC 3339 instants with arbitrary fractional precision", () => {
    expect(parseRfc3339Instant("2026-08-05T14:05:58Z")).toBe(
      Date.UTC(2026, 7, 5, 14, 5, 58),
    );
    expect(parseRfc3339Instant("2026-08-05T14:05:58.123456789+02:30")).toBe(
      Date.UTC(2026, 7, 5, 11, 35, 58) + 123.456789,
    );
    expect(parseRfc3339Instant("0001-01-01T00:00:00.1-00:00")).toBe(
      -62135596799900,
    );
  });

  test("compares distinct sub-millisecond RFC 3339 instants exactly", () => {
    expect(
      parseRfc3339ComparableInstant("2026-08-05T14:05:58.123456789Z"),
    ).toEqual({
      epoch_second: Date.UTC(2026, 7, 5, 14, 5, 58) / 1_000,
      fractional_second: "123456789",
    });
    expect(
      compareRfc3339Instants(
        "2026-08-05T14:05:58.123456789Z",
        "2026-08-05T14:05:58.123456788Z",
      ),
    ).toBe(1);
    expect(
      compareRfc3339Instants(
        "2026-08-05T14:05:58.123000000001+02:30",
        "2026-08-05T11:35:58.123Z",
      ),
    ).toBe(1);
    expect(
      compareRfc3339Instants(
        "2026-08-05T14:05:58.123000Z",
        "2026-08-05T14:05:58.123Z",
      ),
    ).toBe(0);
  });

  test("rejects non-finite or impossible RFC 3339 calendar and offset values", () => {
    for (const value of [
      null,
      "NaN",
      "0000-01-01T00:00:00Z",
      "2026-02-29T00:00:00Z",
      "2026-08-05T14:05:60Z",
      "2026-08-05T24:00:00Z",
      "2026-08-05T14:05:58.Z",
      "2026-08-05T14:05:58+24:00",
      "2026-08-05T14:05:58+01:60",
      "2026-08-05t14:05:58z",
    ]) {
      expect(parseRfc3339Instant(value)).toBeNull();
    }
  });

  test("treats format as annotation under the declared format-annotation vocabulary", () => {
    const schema = { type: "string", format: "date-time" };
    expect(() =>
      assertJsonSchema("2026-08-05T14:05:58.123456789Z", schema)
    ).not.toThrow();
    for (const value of [
      "2026-02-29T14:05:58Z",
      "2026-08-05T14:05:60Z",
      "2026-08-05T14:05:58+24:00",
    ]) {
      expect(() => assertJsonSchema(value, schema)).not.toThrow();
    }
    expect(() => assertJsonSchema("value", { type: "string", format: "custom" }))
      .not.toThrow();
    expect(() => assertJsonSchema("value", { type: "string", format: 4 }))
      .toThrow("invalid format annotation");
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
      await symlink(regular, linkedFile);
      await symlink(external, linkedAncestor);

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

      const outcomePending = readBoundedRegularFile(file, "race-adjacent file", {
        maxBytes: 64,
      }).then(
        (value) => ({ status: "fulfilled" as const, value }),
        (reason) => ({ status: "rejected" as const, reason }),
      );
      await rename(trustedAncestor, parkedAncestor);
      await symlink(external, trustedAncestor);
      const outcome = await outcomePending;

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

      await expect(readBoundedRegularFile(file, "physically bounded file", {
        maxBytes: 64,
        physicalRoot,
        readCheckpoint: async (phase, openedPath) => {
          expect(phase).toBe("opened");
          expect(openedPath).toBe(file);
          checkpointReached = true;
          await rename(source, parked);
          await mkdir(source);
          await link(join(parked, "value.txt"), file);
          const replacement = await stat(file);
          expect(replacement.dev).toBe(original.dev);
          expect(replacement.ino).toBe(original.ino);
        },
      })).rejects.toThrow(
        "escapes the permitted physical root after open",
      );
      expect(checkpointReached).toBe(true);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  test("frontmatter parsing is bounded to the leading block", () => {
    expect(
      parseFrontmatter('---\nname: example\ndescription: "Useful example"\n---\n# Body'),
    ).toEqual({ name: "example", description: "Useful example" });
    expect(parseFrontmatter("# No frontmatter")).toEqual({});
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
