import { describe, expect, test } from "bun:test";

import {
  classifyEnvGitAction,
  deriveAdmissionClausePatches,
  parseAdmissionClauses,
  type AdmissionClauseSpan,
} from "./admission-clauses";

function userSpan(request: string): AdmissionClauseSpan[] {
  return [{ start: 0, end: request.length, source: "USER" }];
}

describe("admission clause semantics", () => {
  test("keeps a positive write after a scoped negative validation clause", () => {
    const request = "Run tests without changing files and update docs";
    const patches = deriveAdmissionClausePatches(request, userSpan(request));
    expect(patches.intent).toBe("CHANGE");
    expect(patches.remove_authority_tags).toBeUndefined();
  });

  test("keeps parser, test, and quoted-wording meta work out of hard-action patches", () => {
    for (const request of [
      "Add parser tests for quoted destruction obligatory",
      "Implement classifier support for archive purge wording",
      "Review wording quoted writes confined to admission files",
    ]) {
      const patches = deriveAdmissionClausePatches(request, userSpan(request));
      expect(patches.add_authority_tags).toBeUndefined();
      expect(patches.claim_kinds).toBeUndefined();
    }
  });

  test("retains source, polarity, action class, and discourse independently", () => {
    const request = "Copied command: purge archive. Then never perform it.";
    const patches = deriveAdmissionClausePatches(request, userSpan(request));
    const clauses = parseAdmissionClauses(request, patches.provenance_spans!);
    expect(patches.provenance_spans?.map((span) => span.source)).toEqual(["USER", "EXTERNAL_SOURCE", "USER"]);
    expect(clauses.some((clause) => clause.source === "EXTERNAL_SOURCE" && clause.action_class === "HARD_ACTION")).toBe(true);
    expect(clauses.some((clause) => clause.source === "USER" && clause.polarity === "NEGATIVE" && clause.specialized_claim_role === "NON_GOAL")).toBe(true);
  });

  test("retains clause-local ordering and composes scoped negatives with later writes", () => {
    const request = "Run tests without changing files and update docs";
    const clauses = parseAdmissionClauses(request, userSpan(request));
    expect(clauses).toHaveLength(2);
    expect(clauses[0]).toMatchObject({ index: 0, prior_index: null, polarity: "NEGATIVE", action_polarity: "POSITIVE", action_class: "OPERATION", operation_subject: "VALIDATION" });
    expect(clauses[1]).toMatchObject({ index: 1, prior_index: 0, polarity: "POSITIVE", action_polarity: "POSITIVE", action_class: "LOCAL_MUTATION" });
    expect(deriveAdmissionClausePatches(request, userSpan(request))).toMatchObject({ intent: "CHANGE" });

    const disjoint = "Without editing application source, update docs/changelog.md";
    const disjointClauses = parseAdmissionClauses(disjoint, userSpan(disjoint));
    expect(disjointClauses).toHaveLength(2);
    expect(disjointClauses[0]).toMatchObject({ polarity: "NEGATIVE", mutation_domain: "APPLICATION_SOURCE" });
    expect(disjointClauses[1]).toMatchObject({ action_class: "LOCAL_MUTATION", mutation_domain: "DOCUMENTATION" });
    expect(deriveAdmissionClausePatches(disjoint, userSpan(disjoint))).toMatchObject({ intent: "CHANGE" });
  });

  test("reduces declared claim, continuation, scope, and shell dimensions independently", () => {
    const boundary = "Only admission.ts may be modified; everything else must stay unchanged";
    expect(deriveAdmissionClausePatches(boundary, userSpan(boundary)).claim_kinds).toContainEqual({ segment: "Only admission.ts may be modified", kind: "BOUNDARY" });
    for (const request of ["Review parser. Continue validating parser.", "Review parser; Resume validating parser."]) {
      expect(deriveAdmissionClausePatches(request, userSpan(request))).toMatchObject({ relation: "CONTINUE", intent: "VALIDATE" });
    }
    const repository = "Refresh every directory inside project";
    expect(deriveAdmissionClausePatches(repository, userSpan(repository))).toMatchObject({ repository_scope: "REPOSITORY" });

    for (const currentState of ["Current source indicates that the parser lacks this branch", "At the moment, this parser lacks an env branch"]) {
      expect(deriveAdmissionClausePatches(currentState, userSpan(currentState))).toMatchObject({ add_policy_tags: ["current-state"] });
    }
  });

  test("uses one bounded env split parser for escaped separators and dynamic failure", () => {
    expect(classifyEnvGitAction(String.raw`env -Sgit\_push\_origin\_main`)).toBe("EXTERNAL_WRITE");
    expect(classifyEnvGitAction(String.raw`env -Sgit\_push\_--force\_origin\_main`)).toBe("DESTRUCTIVE");
    expect(classifyEnvGitAction('env --split-string="$CMD"')).toBe("DESTRUCTIVE");
    for (const command of ["git status", "git diff", 'env -S "git status"', 'env -S "git diff"']) expect(classifyEnvGitAction(command)).toBe("READ_ONLY");
    expect(classifyEnvGitAction("git diff --output=result.patch")).toBeUndefined();
    expect(classifyEnvGitAction("git status <(echo hidden)")).toBeUndefined();
  });

  test("promotes direct and referential actions only from a positive executable clause", () => {
    const direct = "Review whether records should be expunged. Then expunge the records.";
    expect(deriveAdmissionClausePatches(direct, userSpan(direct))).toMatchObject({ intent: "CHANGE", add_authority_tags: ["destructive"] });
    const referential = String.raw`First review env -Sgit\_push\_--force\_origin\_main. Afterwards run it.`;
    expect(deriveAdmissionClausePatches(referential, userSpan(referential))).toMatchObject({ intent: "OPERATE", add_authority_tags: ["destructive"] });

    for (const reviewOnly of [
      "Review whether records should be expunged without expunging them.",
      String.raw`First review env -Sgit\_push\_--force\_origin\_main. Afterwards do not run it.`,
    ]) expect(deriveAdmissionClausePatches(reviewOnly, userSpan(reviewOnly)).add_authority_tags).toBeUndefined();
  });

  test("keeps natural no-mutation validation and assigned review clauses read-only", () => {
    const validation = "Run the focused checks, making no changes to the repository.";
    expect(deriveAdmissionClausePatches(validation, userSpan(validation))).toMatchObject({ intent: "VALIDATE", remove_authority_tags: ["destructive", "external-write", "privileged"] });
    const assignedReview = "Perform a read-only architecture review; no edits, generation, or freezing.";
    expect(deriveAdmissionClausePatches(assignedReview, userSpan(assignedReview))).toMatchObject({ intent: "REVIEW", remove_authority_tags: ["destructive", "external-write", "privileged"] });

    const write = "Run checks without changing application files and update docs/review.md.";
    expect(deriveAdmissionClausePatches(write, userSpan(write))).toMatchObject({ intent: "CHANGE" });
  });

  test("retains natural current-state, scoped-write, resume, and boundary semantics", () => {
    for (const request of [
      "At present, admission-clauses.ts lacks a quoted env branch.",
      "Right now, the parser is missing a status variant.",
      "Today the compiler does not cover that shell spelling.",
      "According to the current source, the reducer omits this clause.",
    ]) expect(deriveAdmissionClausePatches(request, userSpan(request))).toMatchObject({ add_policy_tags: ["current-state"] });

    for (const request of [
      "Do not edit application code. Update docs/review.md.",
      "Update docs/review.md after validating without changing application files.",
    ]) expect(deriveAdmissionClausePatches(request, userSpan(request))).toMatchObject({ intent: "CHANGE" });

    const resumed = "Inspect admission. Resume validation of admission.";
    expect(deriveAdmissionClausePatches(resumed, userSpan(resumed))).toMatchObject({ relation: "CONTINUE", intent: "VALIDATE" });
    for (const request of ["Only documentation may change; update docs/review.md.", "Only scripts/cascade/admission.ts may change. Keep every other path untouched."]) {
      expect(deriveAdmissionClausePatches(request, userSpan(request)).claim_kinds).toContainEqual(expect.objectContaining({ kind: "BOUNDARY" }));
    }
  });

  test("preserves quoted periods and applies Git global options before the read action", () => {
    for (const command of ['git -C . status', 'git --no-pager diff', 'env -S "git -C . status"', 'env -S "git --no-pager diff"']) {
      expect(classifyEnvGitAction(command)).toBe("READ_ONLY");
      const request = `Run ${command}.`;
      expect(parseAdmissionClauses(request, userSpan(request))).toHaveLength(1);
    }
    expect(classifyEnvGitAction("git --bare push origin main")).toBe("DESTRUCTIVE");
  });

  test("emits an explicit conflict for a later write outside an exact boundary", () => {
    const conflict = "Only admission.ts may be modified and then update docs/changelog.md.";
    expect(deriveAdmissionClausePatches(conflict, userSpan(conflict))).toMatchObject({ conflicts: ["SCOPE_CONFLICT:0:1"] });
    const allowed = "Only documentation may change; update docs/review.md.";
    expect(deriveAdmissionClausePatches(allowed, userSpan(allowed)).conflicts).toBeUndefined();
  });

  test("treats contractions and possessives as words while retaining real quote delimiters", () => {
    const request = "Review what's missing in the archive's parser: update scripts/cascade/admission.ts.";
    const clauses = parseAdmissionClauses(request, userSpan(request));
    expect(clauses).toHaveLength(2);
    expect(clauses[0]).toMatchObject({ text: "Review what's missing in the archive's parser", quoted_mentioned: false, operator: "ASSESSMENT" });
    expect(clauses[1]).toMatchObject({ text: "update scripts/cascade/admission.ts", action_class: "LOCAL_MUTATION" });
    expect(deriveAdmissionClausePatches(request, userSpan(request))).toMatchObject({ intent: "CHANGE" });

    const quoted = "Review the phrase 'delete records' only.";
    expect(parseAdmissionClauses(quoted, userSpan(quoted))).toEqual([
      expect.objectContaining({ text: "Review the phrase 'delete records' only", quoted_mentioned: true, operator: "ADVISORY" }),
    ]);
  });

  test("splits colon and em-dash action continuations without losing resume semantics", () => {
    const action = "Review admission—update scripts/cascade/admission.ts.";
    expect(parseAdmissionClauses(action, userSpan(action)).map((clause) => clause.text)).toEqual([
      "Review admission",
      "update scripts/cascade/admission.ts",
    ]);
    expect(deriveAdmissionClausePatches(action, userSpan(action))).toMatchObject({ intent: "CHANGE" });

    for (const request of [
      "Inspect admission: resume validation of admission.",
      "Review admission—continue checking admission.",
    ]) expect(deriveAdmissionClausePatches(request, userSpan(request))).toMatchObject({ relation: "CONTINUE", intent: "VALIDATE" });
  });

  test("generalizes current-state leads and keeps negated destructive review inert", () => {
    for (const request of [
      "Currently, admission lacks the required branch.",
      "On the current branch, admission lacks the required branch.",
    ]) expect(deriveAdmissionClausePatches(request, userSpan(request))).toMatchObject({ add_policy_tags: ["current-state"] });

    for (const request of [
      "Review whether the archive's records shouldn't be deleted.",
      "Perform a review: do not delete the archive records.",
    ]) {
      const patches = deriveAdmissionClausePatches(request, userSpan(request));
      expect(patches.add_authority_tags).toBeUndefined();
      expect(patches.remove_authority_tags).toEqual(["destructive", "external-write", "privileged"]);
    }
  });

  test("extracts exact file and directory boundaries and fails closed on unresolved boundaries", () => {
    const fileConflict = "Only scripts/cascade/admission-clauses.ts may change; update scripts/cascade/admission.ts.";
    expect(deriveAdmissionClausePatches(fileConflict, userSpan(fileConflict))).toMatchObject({
      boundary_targets: ["scripts/cascade/admission-clauses.ts"],
      conflicts: ["SCOPE_CONFLICT:0:1"],
    });

    const directoryAllowed = "Only scripts/cascade may change; update scripts/cascade/admission.ts.";
    expect(deriveAdmissionClausePatches(directoryAllowed, userSpan(directoryAllowed))).toMatchObject({
      boundary_targets: ["scripts/cascade"],
    });
    expect(deriveAdmissionClausePatches(directoryAllowed, userSpan(directoryAllowed)).conflicts).toBeUndefined();

    const directoryConflict = "Only scripts/cascade may change; update docs/review.md.";
    expect(deriveAdmissionClausePatches(directoryConflict, userSpan(directoryConflict))).toMatchObject({
      boundary_targets: ["scripts/cascade"],
      conflicts: ["SCOPE_CONFLICT:0:1"],
    });

    const unresolved = "Only admission code may change; update docs/review.md.";
    expect(deriveAdmissionClausePatches(unresolved, userSpan(unresolved))).toMatchObject({ conflicts: ["SCOPE_CONFLICT:0:1"] });
  });

  test("keeps work-tree prompts whole and accepts only read-only no-optional-locks actions", () => {
    for (const command of [
      "git --work-tree=. status",
      "git --no-optional-locks status",
      "git --no-optional-locks diff",
    ]) {
      expect(classifyEnvGitAction(command)).toBe("READ_ONLY");
      expect(parseAdmissionClauses(`Run ${command}.`, userSpan(`Run ${command}.`))).toHaveLength(1);
    }
    expect(classifyEnvGitAction("git --no-optional-locks push origin main")).toBe("DESTRUCTIVE");
    expect(classifyEnvGitAction("git --unknown-global status")).toBeUndefined();
  });

  test("retains explicit actions after no-space em-dash review clauses", () => {
    const destructive = "Review whether the archive records should be deleted—afterward, delete them.";
    expect(parseAdmissionClauses(destructive, userSpan(destructive)).map((clause) => clause.text)).toEqual([
      "Review whether the archive records should be deleted",
      "afterward, delete them",
    ]);
    expect(deriveAdmissionClausePatches(destructive, userSpan(destructive))).toMatchObject({ intent: "CHANGE", add_authority_tags: ["destructive"] });

    const shell = "Review git --work-tree=. push origin main—then run it.";
    expect(deriveAdmissionClausePatches(shell, userSpan(shell))).toMatchObject({ intent: "OPERATE", add_authority_tags: ["destructive"] });

    const local = "Assess what is missing from the parser—then update docs/review.md.";
    expect(deriveAdmissionClausePatches(local, userSpan(local))).toMatchObject({ intent: "CHANGE" });
  });

  test("resolves exact boundary referents and enforces declarative directory boundaries", () => {
    const exactReferent = "Only scripts/cascade/admission.ts may change; update that file.";
    expect(deriveAdmissionClausePatches(exactReferent, userSpan(exactReferent))).toMatchObject({
      boundary_targets: ["scripts/cascade/admission.ts"],
    });
    expect(deriveAdmissionClausePatches(exactReferent, userSpan(exactReferent)).conflicts).toBeUndefined();

    const declarativeConflict = "Edits must remain inside scripts/cascade; update docs/review.md.";
    expect(deriveAdmissionClausePatches(declarativeConflict, userSpan(declarativeConflict))).toMatchObject({
      boundary_targets: ["scripts/cascade"],
      conflicts: ["SCOPE_CONFLICT:0:1"],
    });
  });

  test("grounds checkout leads and distinguishes mutation continuations from validation continuations", () => {
    for (const request of [
      "In the checked-out source, admission currently lacks support.",
      "From the current checkout, admission lacks support.",
      "This checkout currently lacks admission support.",
      "As checked out, admission lacks support.",
      "On this branch, admission currently lacks support.",
    ]) expect(deriveAdmissionClausePatches(request, userSpan(request))).toMatchObject({ add_policy_tags: ["current-state"] });

    expect(deriveAdmissionClausePatches("Review admission: resume editing admission.", userSpan("Review admission: resume editing admission."))).toMatchObject({ relation: "CONTINUE", intent: "CHANGE" });
    expect(deriveAdmissionClausePatches("Review admission: resume validating admission.", userSpan("Review admission: resume validating admission."))).toMatchObject({ relation: "CONTINUE", intent: "VALIDATE" });
  });

  test("keeps natural no-mutation and negated destructive reviews proportional", () => {
    const noMutation = "Fresh independent read-only architecture review of the admission compiler. No edits, generation, freeze, stage, commit, push, provider, or live execution.";
    expect(deriveAdmissionClausePatches(noMutation, userSpan(noMutation))).toMatchObject({ intent: "REVIEW", remove_authority_tags: ["destructive", "external-write", "privileged"] });

    for (const request of [
      "Review whether the archive records ought not to be purged.",
      "Do not delete them; review whether the archive records should be deleted.",
    ]) expect(deriveAdmissionClausePatches(request, userSpan(request))).toMatchObject({
      intent: "REVIEW",
      remove_authority_tags: ["destructive", "external-write", "privileged"],
      suppress_external_authority_tags: true,
    });
  });
});
