function stripSingleFence(value) {
  const trimmed = value.trim();
  const match = trimmed.match(/^```(?:json)?\s*\r?\n([\s\S]*?)\r?\n```$/i);
  return match ? match[1].trim() : trimmed;
}

function countWords(value) {
  return value.trim().match(/\b[\p{L}\p{N}][\p{L}\p{N}'’-]*\b/gu)?.length ?? 0;
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}

export function mechanicalGrade(output, evaluator) {
  if (evaluator.required_patterns?.length || evaluator.forbidden_patterns?.length) throw new Error("Semantic phrase gates are unsupported; express requirements in the task contract and use an independent LLM judge.");
  const checks = [];
  if (evaluator.mechanical_type === "exact_json") {
    let parsed = null;
    try {
      parsed = JSON.parse(stripSingleFence(output));
      checks.push({ id: "valid-json", passed: true });
    } catch (error) {
      checks.push({ id: "valid-json", passed: false, detail: error.message });
      return { eligible: false, checks };
    }
    const isObject = parsed !== null && typeof parsed === "object" && !Array.isArray(parsed);
    checks.push({ id: "json-object", passed: isObject });
    if (!isObject) return { eligible: false, checks };
    const actualKeys = Object.keys(parsed).sort();
    const expectedKeys = [...evaluator.exact_keys].sort();
    checks.push({ id: "exact-keys", passed: JSON.stringify(actualKeys) === JSON.stringify(expectedKeys), actual: actualKeys, expected: expectedKeys });
    checks.push({ id: "exact-values", passed: JSON.stringify(stable(parsed)) === JSON.stringify(stable(evaluator.expected)), actual: parsed, expected: evaluator.expected });
  } else if (evaluator.mechanical_type === "text_contract") {
    const headings = output.split(/\r?\n/).map(line => line.trim().replace(/^#{1,6}\s+/, "").replace(/^\*\*(.*?)\*\*$/, "$1"));
    for (const heading of evaluator.required_headings ?? []) {
      checks.push({ id: `heading:${heading}`, passed: headings.includes(heading) });
    }
    if (Number.isInteger(evaluator.max_words)) {
      const actual = countWords(output);
      checks.push({ id: "max-words", passed: actual <= evaluator.max_words, actual, expected_maximum: evaluator.max_words });
    }
  } else {
    throw new Error(`unsupported evaluator type: ${evaluator.mechanical_type}`);
  }
  return { eligible: checks.every((check) => check.passed), checks };
}
