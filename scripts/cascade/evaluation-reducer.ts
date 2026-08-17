import { CascadeError, stableJson } from "./common";
import {
  assertTerminalStatusMatchesClaimLedger,
  claimLedgerTerminalStatus,
  type ClaimLedgerEntry,
  type MechanicalEvaluation,
} from "./evaluations";
import type { SpecializedEvaluationReceipt } from "./harness-evaluation-receipts";
import type {
  CampaignStatus,
  ClaimStatus,
  SpecializedEvaluationDeclaration,
} from "./simulation-definitions";

export interface EvaluationReducerClaim {
  id: string;
  class: string;
}

export interface EvaluationReduction {
  claim_ledger: ClaimLedgerEntry[];
  status: CampaignStatus;
}

function exactIds(actual: string[], expected: string[], label: string): void {
  if (
    new Set(actual).size !== actual.length ||
    stableJson([...actual].sort()) !== stableJson([...expected].sort())
  ) {
    throw new CascadeError(`${label} claim IDs are missing, duplicated, overlapping, or unknown`);
  }
}

function mergeWithoutUpgrade(
  mechanical: ClaimLedgerEntry,
  judged: ClaimLedgerEntry,
): ClaimLedgerEntry {
  if (mechanical.status !== "SUPPORTED") return mechanical;
  return {
    ...mechanical,
    status: judged.status,
    reason: judged.reason,
    evidence: [...new Set([...mechanical.evidence, ...judged.evidence])],
  };
}

const CLAIM_STATUSES = new Set<ClaimStatus>([
  "SUPPORTED",
  "PARTIALLY_SUPPORTED",
  "UNSUPPORTED",
  "CONFLICTING",
  "BLOCKED",
  "NOT_RUN",
  "INVALID",
]);

function validateLedger(
  ledger: ClaimLedgerEntry[],
  claims: Map<string, EvaluationReducerClaim>,
  label: string,
): void {
  for (const entry of ledger) {
    if (
      entry.class !== claims.get(entry.claim_id)?.class ||
      !CLAIM_STATUSES.has(entry.status) ||
      typeof entry.reason !== "string" ||
      !entry.reason ||
      !Array.isArray(entry.evidence) ||
      entry.evidence.some((path) => typeof path !== "string" || !path)
    ) {
      throw new CascadeError(`${label} claim ${entry.claim_id} is invalid or stale`);
    }
  }
}

export function reduceEvaluations(input: {
  claims: EvaluationReducerClaim[];
  mechanical: MechanicalEvaluation;
  specialized_declaration: SpecializedEvaluationDeclaration | null;
  specialized_receipt: SpecializedEvaluationReceipt | null;
  general_status: "PASS" | "FAIL" | "BLOCKED";
  general_claim_ledger: ClaimLedgerEntry[];
}): EvaluationReduction {
  const authoredIds = input.claims.map((claim) => claim.id);
  const authoredClaims = new Map(input.claims.map((claim) => [claim.id, claim]));
  exactIds(
    input.mechanical.claim_ledger.map((entry) => entry.claim_id),
    authoredIds,
    "mechanical evaluation",
  );
  validateLedger(input.mechanical.claim_ledger, authoredClaims, "mechanical evaluation");
  const specializedIds = input.specialized_declaration?.applicability === "REQUIRED"
    ? input.specialized_declaration.claim_ids
    : [];
  if (input.specialized_declaration === null && input.specialized_receipt !== null) {
    throw new CascadeError("product evaluation cannot consume a specialized receipt");
  }
  if (input.specialized_declaration !== null && input.specialized_receipt === null) {
    throw new CascadeError("harness evaluation requires exactly one specialized receipt");
  }
  if (input.specialized_receipt) {
    exactIds(input.specialized_receipt.claim_ids, specializedIds, "specialized receipt");
    exactIds(
      input.specialized_receipt.claim_ledger.map((entry) => entry.claim_id),
      specializedIds,
      "specialized ledger",
    );
    if (
      input.specialized_declaration?.applicability === "REQUIRED" &&
      input.specialized_receipt.status === "NOT_APPLICABLE"
    ) {
      throw new CascadeError("NOT_APPLICABLE receipt cannot satisfy REQUIRED specialization");
    }
    validateLedger(
      input.specialized_receipt.claim_ledger,
      authoredClaims,
      "specialized evaluation",
    );
    if (input.specialized_receipt.status !== "NOT_APPLICABLE") {
      assertTerminalStatusMatchesClaimLedger(
        input.specialized_receipt.status,
        input.specialized_receipt.claim_ledger,
        "specialized evaluation",
      );
    }
  }
  const specializedSet = new Set(specializedIds);
  const generalIds = authoredIds.filter((id) => !specializedSet.has(id));
  exactIds(
    input.general_claim_ledger.map((entry) => entry.claim_id),
    generalIds,
    "general evaluation",
  );
  if (!new Set(["PASS", "FAIL", "BLOCKED"]).has(input.general_status)) {
    throw new CascadeError("general evaluation terminal status is invalid");
  }
  validateLedger(input.general_claim_ledger, authoredClaims, "general evaluation");
  assertTerminalStatusMatchesClaimLedger(
    input.general_status,
    input.general_claim_ledger,
    "general evaluation",
  );
  const mechanicalById = new Map(
    input.mechanical.claim_ledger.map((entry) => [entry.claim_id, entry]),
  );
  const specializedById = new Map(
    (input.specialized_receipt?.claim_ledger ?? []).map((entry) => [entry.claim_id, entry]),
  );
  const generalById = new Map(
    input.general_claim_ledger.map((entry) => [entry.claim_id, entry]),
  );
  const claimLedger = input.claims.map((claim) => {
    const mechanical = mechanicalById.get(claim.id)!;
    const judged = specializedSet.has(claim.id)
      ? specializedById.get(claim.id)!
      : generalById.get(claim.id)!;
    return mergeWithoutUpgrade(mechanical, judged);
  });
  return { claim_ledger: claimLedger, status: claimLedgerTerminalStatus(claimLedger) };
}
