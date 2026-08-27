#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import re
import sys
from pathlib import Path
from typing import Any

from refresh_manifest import verify as verify_manifest
from validate_artifact import canonical_digest

SEMVER = re.compile(r"^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$")
FRONTMATTER = re.compile(r"\A---\n(.*?)\n---\n", re.DOTALL)


def load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def validate(root: Path) -> list[str]:
    errors: list[str] = []
    contract_path = root / "evals" / "evaluation-contract.json"
    if not contract_path.is_file():
        return ["missing evals/evaluation-contract.json"]
    contract = load_json(contract_path)
    manifest = load_json(root / ".codex-plugin" / "plugin.json")

    if manifest.get("name") != contract.get("plugin_id"):
        errors.append("manifest name does not match evaluation contract")
    if manifest.get("version") != contract.get("version") or not SEMVER.fullmatch(str(manifest.get("version", ""))):
        errors.append("manifest version is missing, invalid, or not bound to the evaluation contract")
    interface = manifest.get("interface", {})
    prompts = interface.get("defaultPrompt")
    if not isinstance(prompts, list) or not 1 <= len(prompts) <= 3 or any(not isinstance(item, str) or len(item) > 128 for item in prompts):
        errors.append("interface.defaultPrompt must contain one to three strings of at most 128 characters")

    expected = set(contract.get("expected_skills", []))
    actual = {path.parent.name for path in (root / "skills").glob("*/SKILL.md")}
    if actual != expected:
        errors.append(f"skill set mismatch: expected={sorted(expected)} actual={sorted(actual)}")

    package_text: list[str] = []
    for skill in sorted(expected):
        skill_path = root / "skills" / skill / "SKILL.md"
        agent_path = root / "skills" / skill / "agents" / "openai.yaml"
        if not skill_path.is_file() or not agent_path.is_file():
            errors.append(f"{skill}: missing SKILL.md or agents/openai.yaml")
            continue
        text = skill_path.read_text(encoding="utf-8")
        package_text.append(text)
        match = FRONTMATTER.search(text)
        if not match or f"name: {skill}" not in match.group(1) or "description:" not in match.group(1):
            errors.append(f"{skill}: invalid frontmatter")
        agent = agent_path.read_text(encoding="utf-8")
        if "default_prompt:" not in agent or f"${skill}" not in agent:
            errors.append(f"{skill}: default_prompt must explicitly invoke ${skill}")
        if "[TODO:" in text or "[TODO:" in agent:
            errors.append(f"{skill}: unresolved TODO placeholder")

    for spec in ("specs/architecture.md", "specs/capability-map.md"):
        path = root / spec
        if not path.is_file():
            errors.append(f"missing {spec}")
        else:
            package_text.append(path.read_text(encoding="utf-8"))
    joined = "\n".join(package_text)
    for alias in contract.get("required_dependency_aliases", []):
        if alias not in joined:
            errors.append(f"required dependency alias is not bound: {alias}")
    for phrase in contract.get("required_runtime_phrases", []):
        if phrase not in joined:
            errors.append(f"required runtime phrase is not operative: {phrase}")
    for phrase in contract.get("forbidden_runtime_phrases", []):
        if phrase in joined:
            errors.append(f"forbidden runtime phrase remains: {phrase}")
    for name in contract.get("required_schemas", []):
        path = root / "schemas" / name
        if not path.is_file():
            errors.append(f"missing schema: {name}")
            continue
        schema = load_json(path)
        if schema.get("$schema") != "https://json-schema.org/draft/2020-12/schema" or schema.get("type") != "object":
            errors.append(f"{name}: unsupported or incomplete schema declaration")

    cases_doc = load_json(root / "evals" / "cases.json")
    cases = cases_doc.get("cases", [])
    expected_count = contract.get("expected_case_count")
    if not isinstance(cases, list) or len(cases) != expected_count:
        errors.append(f"evaluation suite must contain exactly {expected_count} cases")
        cases = []
    seen_ids: set[str] = set()
    categories: set[str] = set()
    skill_counts = {skill: 0 for skill in expected}
    for case in cases:
        if not isinstance(case, dict):
            errors.append("case is not an object")
            continue
        case_id = case.get("case_id")
        if not isinstance(case_id, str) or case_id in seen_ids:
            errors.append(f"invalid or duplicate case_id: {case_id}")
        else:
            seen_ids.add(case_id)
        if case.get("skill") not in expected:
            errors.append(f"{case_id}: unknown skill")
        else:
            skill_counts[case["skill"]] += 1
        categories.add(str(case.get("category", "")))
        if not all(isinstance(case.get(field), str) and case.get(field) for field in ("request", "oracle")):
            errors.append(f"{case_id}: request and oracle are required")
        if case.get("expected_status") not in {"READY", "GAP", "BLOCKED", "INVALID", "NOT_RUN", "ABSTAIN", "PROPOSED", "PENDING_APPROVAL", "APPROVED"}:
            errors.append(f"{case_id}: invalid expected_status")
        assertions = case.get("mechanical_assertions")
        if not isinstance(assertions, list) or not assertions or any(not isinstance(item, str) or not item for item in assertions):
            errors.append(f"{case_id}: mechanical_assertions are required")
    missing_categories = set(contract.get("required_case_categories", [])) - categories
    if missing_categories:
        errors.append(f"missing case categories: {sorted(missing_categories)}")
    for skill, count in skill_counts.items():
        if count < 3:
            errors.append(f"{skill}: at least three cases are required")

    profiles = sorted((root / "evals").glob("judge-*.json"))
    if len(profiles) < 2:
        errors.append("at least two independent judge profiles are required")
    for path in profiles:
        profile = load_json(path)
        if profile.get("model") != contract.get("models", {}).get("judge"):
            errors.append(f"{path.name}: judge model mismatch")
        if profile.get("threshold") != contract.get("acceptance_threshold"):
            errors.append(f"{path.name}: threshold mismatch")
        if profile.get("minimum_dimension") != contract.get("minimum_dimension"):
            errors.append(f"{path.name}: dimension floor mismatch")
        dimensions = profile.get("dimensions", [])
        if not dimensions or abs(sum(float(item.get("weight", 0)) for item in dimensions) - 1.0) > 1e-9:
            errors.append(f"{path.name}: dimension weights must sum to 1")
        for item in dimensions:
            anchors = item.get("anchors", {})
            if set(anchors) != {"0", "1", "2", "3", "4"}:
                errors.append(f"{path.name}: each dimension needs anchors 0 through 4")

    manifest_path = root / contract.get("evaluation_manifest", "evals/manifest.json")
    if not manifest_path.is_file():
        errors.append("missing evaluation asset manifest")
    else:
        asset_manifest = load_json(manifest_path)
        declared = {item.get("path"): item.get("sha256") for item in asset_manifest.get("assets", []) if isinstance(item, dict)}
        required_assets = ["evals/cases.json"] + [str(path.relative_to(root)) for path in profiles]
        for rel in required_assets:
            path = root / rel
            if declared.get(rel) != sha256(path):
                errors.append(f"evaluation asset digest mismatch: {rel}")
    return errors


def validate_v2(root: Path) -> list[str]:
    errors: list[str] = []
    contract = load_json(root / "evals" / "evaluation-contract.json")
    plugin = load_json(root / ".codex-plugin" / "plugin.json")
    if plugin.get("name") != contract.get("plugin_id"):
        errors.append("manifest name does not match evaluation contract")
    if plugin.get("version") != contract.get("version") or not SEMVER.fullmatch(str(plugin.get("version", ""))):
        errors.append("manifest version is missing, invalid, or not bound to the evaluation contract")

    expected = set(contract.get("expected_skills", []))
    actual = {path.parent.name for path in (root / "skills").glob("*/SKILL.md")}
    if actual != expected:
        errors.append(f"skill set mismatch: expected={sorted(expected)} actual={sorted(actual)}")
    skill_texts: list[str] = []
    for skill in sorted(expected):
        skill_path = root / "skills" / skill / "SKILL.md"
        agent_path = root / "skills" / skill / "agents" / "openai.yaml"
        if not skill_path.is_file() or not agent_path.is_file():
            errors.append(f"{skill}: missing SKILL.md or agents/openai.yaml")
            continue
        text = skill_path.read_text(encoding="utf-8")
        skill_texts.append(text)
        frontmatter = FRONTMATTER.search(text)
        if not frontmatter or f"name: {skill}" not in frontmatter.group(1) or "description:" not in frontmatter.group(1):
            errors.append(f"{skill}: invalid frontmatter")
        agent = agent_path.read_text(encoding="utf-8")
        if "default_prompt:" not in agent or f"${skill}" not in agent:
            errors.append(f"{skill}: default_prompt must explicitly invoke ${skill}")
        if "[TODO:" in text or "[TODO:" in agent:
            errors.append(f"{skill}: unresolved TODO placeholder")
    joined = "\n".join(skill_texts)
    for alias in contract.get("required_dependency_aliases", []):
        if alias not in joined:
            errors.append(f"required dependency alias is not operative in a runtime skill: {alias}")
    for phrase in contract.get("required_runtime_phrases", []):
        if phrase not in joined:
            errors.append(f"required runtime phrase is not operative: {phrase}")
    for phrase in contract.get("forbidden_runtime_phrases", []):
        if phrase in joined:
            errors.append(f"forbidden runtime phrase remains: {phrase}")
    acceptance_token = str(contract.get("acceptance_threshold"))
    dimension_floor_token = f"dimension floor {contract.get('minimum_dimension')}"
    for relative in contract.get("required_subject_assets", []):
        path = root / relative
        if not path.is_file() or path.suffix not in {".md", ".json", ".yaml"}:
            continue
        subject_text = path.read_text(encoding="utf-8")
        if acceptance_token in subject_text or dimension_floor_token in subject_text.lower():
            errors.append(f"target-visible subject asset discloses sealed acceptance policy: {relative}")
    for required in (
        "specs/architecture.md",
        "specs/capability-map.md",
        "specs/extraction-manifest.json",
    ):
        if not (root / required).is_file():
            errors.append(f"missing {required}")
    extraction_path = root / "specs" / "extraction-manifest.json"
    if extraction_path.is_file():
        extraction = load_json(extraction_path)
        artifacts = extraction.get("artifacts", [])
        if (
            extraction.get("schema_version") != 1
            or re.fullmatch(r"[a-f0-9]{40}", str(extraction.get("source_revision", ""))) is None
            or extraction.get("source_state") != "LISTED_PATHS_MATCH_REVISION"
            or not isinstance(artifacts, list)
            or len(artifacts) < 10
        ):
            errors.append("capability extraction manifest identity is invalid")
        else:
            paths = [item.get("path") for item in artifacts if isinstance(item, dict)]
            if len(paths) != len(artifacts) or len(paths) != len(set(paths)):
                errors.append("capability extraction manifest paths are invalid or duplicated")
            for item in artifacts:
                if (
                    re.fullmatch(r"[a-f0-9]{64}", str(item.get("sha256", ""))) is None
                    or not isinstance(item.get("capabilities"), list)
                    or not item["capabilities"]
                ):
                    errors.append(f"capability extraction artifact is incomplete: {item.get('path')}")
    for name in contract.get("required_schemas", []):
        path = root / "schemas" / name
        if not path.is_file():
            errors.append(f"missing schema: {name}")
        else:
            schema = load_json(path)
            if schema.get("$schema") != "https://json-schema.org/draft/2020-12/schema" or schema.get("type") != "object":
                errors.append(f"{name}: unsupported or incomplete schema declaration")
            if schema.get("properties", {}).get("schema_version", {}).get("const") != 4:
                errors.append(f"{name}: schema_version must be frozen at v4")

    suite = load_json(root / "evals" / "cases.json")
    for field in ("suite_id", "corpus_version", "split_id", "subject_adapter"):
        if not isinstance(suite.get(field), str) or not suite[field]:
            errors.append(f"evaluation suite field is required: {field}")
    if suite.get("schema_version") != 2:
        errors.append("evaluation suite schema_version must be 2")
    adapter = suite.get("execution_adapter", {})
    models = contract.get("models", {})
    target_invocations = adapter.get("target_invocations")
    if (
        adapter.get("id") != "cascade-evals-agent-runner-v1"
        or adapter.get("runner") != "cascade-evals/scripts/run_agent_evaluation.py"
        or adapter.get("model") != models.get("target")
        or adapter.get("reasoning_effort") != models.get("reasoning_effort")
        or adapter.get("deterministic_finalization") != "digest-only-json-response-v1"
        or not isinstance(target_invocations, int)
        or isinstance(target_invocations, bool)
        or not 1 <= target_invocations <= contract.get("expected_case_count", 0)
        or adapter.get("target_batching") != "contiguous-balanced-parallel-v1"
        or adapter.get("case_count") != contract.get("expected_case_count")
    ):
        errors.append("execution adapter identity/model/reasoning/batching/cardinality is invalid")
    packet = suite.get("packet_contract", {})
    if packet.get("target_fields") != ["case_id", "request", "fixture"]:
        errors.append("target packet fields are invalid")
    if packet.get("sealed_fields") != ["skill", "expected_status", "oracle", "mechanical_assertions"]:
        errors.append("sealed packet fields are invalid")
    catalog = suite.get("assertion_catalog", {})
    if set(catalog) != {
        "status_matches_expected",
        "selected_skill_matches_expected",
        "market_artifact_valid",
        "brand_output_valid",
    }:
        errors.append("Market mechanical assertion catalog is incomplete")
        catalog = {}
    for assertion in catalog.values():
        if not isinstance(assertion, dict) or not all(
            isinstance(assertion.get(field), str) and assertion[field]
            for field in ("input_identity", "deterministic_rule", "evidence_identity", "failure_status", "repair_owner")
        ):
            errors.append("mechanical assertion catalog entry is incomplete")

    cases = suite.get("cases", [])
    if not isinstance(cases, list) or len(cases) != contract.get("expected_case_count"):
        errors.append("evaluation suite case count is invalid")
        cases = []
    if suite.get("split_membership") != [case.get("case_id") for case in cases]:
        errors.append("split_membership must list every case exactly once in execution order")
    seen: set[str] = set()
    categories: set[str] = set()
    routing_probes: set[str] = set()
    counts = {skill: 0 for skill in expected}
    allowed_statuses = {"READY", "GAP", "BLOCKED", "INVALID", "NOT_RUN", "ABSTAIN", "PROPOSED", "PENDING_APPROVAL", "APPROVED"}
    for case in cases:
        case_id = case.get("case_id")
        if not isinstance(case_id, str) or case_id in seen:
            errors.append(f"invalid or duplicate case_id: {case_id}")
        else:
            seen.add(case_id)
        skill = case.get("skill")
        if skill not in expected:
            errors.append(f"{case_id}: unknown skill")
        else:
            counts[skill] += 1
        categories.add(str(case.get("category", "")))
        if "routing_probe" in case:
            if case.get("routing_probe") not in {"COLLISION", "NEGATIVE_TRIGGER"}:
                errors.append(f"{case_id}: routing_probe is invalid")
            else:
                routing_probes.add(case["routing_probe"])
        if case.get("expected_status") not in allowed_statuses:
            errors.append(f"{case_id}: invalid expected_status")
        if not all(isinstance(case.get(field), str) and case[field] for field in ("request", "oracle")):
            errors.append(f"{case_id}: request and oracle are required")
        expected_assertions = ["status_matches_expected", "selected_skill_matches_expected"]
        requires_typed_artifact = skill in {
            "research-market",
            "evaluate-market-opportunity",
            "design-market-experiments",
        }
        if requires_typed_artifact:
            expected_assertions.append("market_artifact_valid")
        elif skill == "brand-positioning":
            expected_assertions.append("brand_output_valid")
        if case.get("mechanical_assertions") != expected_assertions:
            errors.append(f"{case_id}: Market mechanical gates are incomplete")
        fixture = case.get("fixture")
        expected_fixture_fields = {"output_contract", "supplied", "absent", "permissions", "data"}
        if case_id in {"MKT-004", "MKT-006", "MKT-007", "MKT-014"}:
            expected_fixture_fields.add("frozen_inputs")
        if case_id == "MKT-008":
            expected_fixture_fields.add("frozen_experiment")
        if skill == "brand-positioning":
            expected_fixture_fields.update({"required_handoff_owners", "frozen_sources"})
        if not isinstance(fixture, dict) or set(fixture) != expected_fixture_fields:
            errors.append(f"{case_id}: fixture contract is incomplete")
        elif requires_typed_artifact:
            output_contract = fixture.get("output_contract")
            expected_contract = {
                "research-market": ("EVIDENCE_LEDGER", "schemas/evidence-ledger.schema.json", {"READY", "GAP", "BLOCKED", "INVALID"}),
                "evaluate-market-opportunity": ("OPPORTUNITY_ASSESSMENT", "schemas/opportunity-assessment.schema.json", {"READY", "ABSTAIN", "BLOCKED", "INVALID"}),
                "design-market-experiments": ("EXPERIMENT_CONTRACT", "schemas/experiment-contract.schema.json", {"NOT_RUN", "RECEIPT_SUPPLIED", "INVALID"}),
            }.get(skill)
            if (
                not isinstance(output_contract, dict)
                or set(output_contract) != {
                    "response_encoding",
                    "required_response_fields",
                    "artifact_kind",
                    "artifact_schema",
                    "expected_artifact_status",
                    "require_handoff",
                }
                or output_contract.get("response_encoding") != "json"
                or output_contract.get("required_response_fields") != ["artifact", "artifact_sha256", "supporting_artifacts", "handoffs"]
                or expected_contract is None
                or output_contract.get("artifact_kind") != expected_contract[0]
                or output_contract.get("artifact_schema") != expected_contract[1]
                or output_contract.get("expected_artifact_status") not in expected_contract[2]
                or not isinstance(output_contract.get("require_handoff"), bool)
            ):
                errors.append(f"{case_id}: Market output contract is invalid")
            if case_id in {"MKT-004", "MKT-006", "MKT-007", "MKT-014"}:
                frozen = fixture.get("frozen_inputs")
                if (
                    not isinstance(frozen, list)
                    or not frozen
                ):
                    errors.append(f"{case_id}: frozen input fixtures are invalid")
                else:
                    kinds: list[str] = []
                    for wrapper in frozen:
                        if (
                            not isinstance(wrapper, dict)
                            or set(wrapper) != {"kind", "sha256", "artifact"}
                            or not isinstance(wrapper.get("kind"), str)
                            or re.fullmatch(r"[a-f0-9]{64}", str(wrapper.get("sha256", ""))) is None
                            or not isinstance(wrapper.get("artifact"), dict)
                        ):
                            errors.append(f"{case_id}: frozen input wrapper is invalid")
                            continue
                        kinds.append(wrapper["kind"])
                        try:
                            if canonical_digest(wrapper["artifact"]) != wrapper["sha256"]:
                                errors.append(f"{case_id}: frozen input digest is invalid: {wrapper['kind']}")
                        except (TypeError, ValueError):
                            errors.append(f"{case_id}: frozen input cannot be canonicalized: {wrapper['kind']}")
                    if len(kinds) != len(set(kinds)):
                        errors.append(f"{case_id}: frozen input kinds are duplicated")
                    if case_id == "MKT-004" and kinds != ["EVIDENCE_LEDGER"]:
                        errors.append("MKT-004: frozen evidence ledger fixture is invalid")
                    if case_id != "MKT-004" and (
                        kinds.count("EXPERIMENT_INSTRUMENT") != 1
                        or not any(kind.startswith("EVENT_SCHEMA_") for kind in kinds)
                    ):
                        errors.append(f"{case_id}: frozen instrument or event schemas are incomplete")
            if case_id == "MKT-008":
                frozen_experiment = fixture.get("frozen_experiment")
                if (
                    not isinstance(frozen_experiment, dict)
                    or set(frozen_experiment) != {"kind", "sha256", "artifact"}
                    or frozen_experiment.get("kind") != "FROZEN_EXPERIMENT_TERMS"
                    or re.fullmatch(r"[a-f0-9]{64}", str(frozen_experiment.get("sha256", ""))) is None
                    or not isinstance(frozen_experiment.get("artifact"), dict)
                ):
                    errors.append("MKT-008: frozen experiment fixture is invalid")
                else:
                    try:
                        if canonical_digest(frozen_experiment["artifact"]) != frozen_experiment["sha256"]:
                            errors.append("MKT-008: frozen experiment fixture digest is invalid")
                    except (TypeError, ValueError):
                        errors.append("MKT-008: frozen experiment fixture cannot be canonicalized")
        else:
            if fixture.get("output_contract") != {
                "response_encoding": "json",
                "required_response_fields": [
                    "disposition",
                    "content",
                    "source_bindings",
                    "authority_boundaries",
                    "handoffs",
                ],
            }:
                errors.append(f"{case_id}: Brand output contract is invalid")
            owners = fixture.get("required_handoff_owners")
            if (
                not isinstance(owners, list)
                or not owners
                or not all(isinstance(owner, str) and owner for owner in owners)
                or len(owners) != len(set(owners))
            ):
                errors.append(f"{case_id}: Brand handoff owner contract is invalid")
            frozen_sources = fixture.get("frozen_sources")
            if not isinstance(frozen_sources, list) or not frozen_sources:
                errors.append(f"{case_id}: Brand frozen source contract is invalid")
            else:
                identities: list[tuple[object, ...]] = []
                for source in frozen_sources:
                    if (
                        not isinstance(source, dict)
                        or set(source) != {"kind", "id", "version", "sha256", "status"}
                        or not all(isinstance(source.get(field), str) and source[field] for field in ("kind", "id", "version", "status"))
                        or re.fullmatch(r"[a-f0-9]{64}", str(source.get("sha256", ""))) is None
                    ):
                        errors.append(f"{case_id}: Brand frozen source entry is invalid")
                        continue
                    identities.append(tuple(source[field] for field in ("kind", "id", "version", "sha256", "status")))
                if len(identities) != len(set(identities)):
                    errors.append(f"{case_id}: Brand frozen source identities must be unique")
    missing_categories = set(contract.get("required_case_categories", [])) - categories
    if missing_categories:
        errors.append(f"missing case categories: {sorted(missing_categories)}")
    if routing_probes != {"COLLISION", "NEGATIVE_TRIGGER"}:
        errors.append("evaluation suite requires both collision and negative-trigger routing probes")
    for skill, count in counts.items():
        if count < 3:
            errors.append(f"{skill}: at least three cases are required")

    profiles = sorted((root / "evals").glob("judge-*.json"))
    if len(profiles) < 2:
        errors.append("at least two independent judge profiles are required")
    for path in profiles:
        profile = load_json(path)
        if profile.get("model") != models.get("judge"):
            errors.append(f"{path.name}: judge model mismatch")
        if profile.get("threshold") != contract.get("acceptance_threshold"):
            errors.append(f"{path.name}: threshold mismatch")
        if profile.get("minimum_dimension") != contract.get("minimum_dimension"):
            errors.append(f"{path.name}: dimension floor mismatch")
        dimensions = profile.get("dimensions", [])
        if not dimensions or abs(sum(float(item.get("weight", 0)) for item in dimensions) - 1.0) > 1e-9:
            errors.append(f"{path.name}: dimension weights must sum to 1")
        for dimension in dimensions:
            if set(dimension.get("anchors", {})) != {"0", "1", "2", "3", "4"}:
                errors.append(f"{path.name}: each dimension needs anchors 0 through 4")

    manifest_path = root / contract.get("evaluation_manifest", "evals/manifest.json")
    if not manifest_path.is_file():
        errors.append("missing evaluation asset manifest")
    else:
        errors.extend(verify_manifest(root, load_json(manifest_path)))
    return errors


validate = validate_v2


def main() -> int:
    root = Path(__file__).resolve().parents[1]
    errors = validate(root)
    print(json.dumps({"plugin": root.name, "status": "PASS" if not errors else "FAIL", "errors": errors}, indent=2))
    return 0 if not errors else 1


if __name__ == "__main__":
    sys.exit(main())
