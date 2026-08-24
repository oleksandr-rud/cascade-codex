#!/usr/bin/env python3
"""Deterministically map a canonical Cascade Persona into Cascade Simulations v1."""

from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile
from typing import Any

from validate_artifact import (
    canonical_digest,
    numeric_precondition_domain,
    strict_json_file,
    source_path_intersects_prohibition,
    target_schema_version,
    validate_persona,
    validate_schema,
)


AUTHORITY = {
    "INTERVIEW": "interview",
    "SELF_REPORT": "self-report",
    "OBSERVED_BEHAVIOR": "observed-behavior",
    "RESEARCH_RECORD": "research-record",
    "USER_PROVIDED": "user-provided",
    "HYPOTHESIS": "hypothesis",
}
CLAIM_CLASS = {
    "OBSERVED": "observed-behavior",
    "USER_PROVIDED": "self-report",
    "INFERRED": "inference",
    "HYPOTHESIS": "synthetic-assumption",
    "SYNTHETIC": "synthetic-assumption",
}
BASIS = {
    "OBSERVED": "observed",
    "USER_PROVIDED": "self-reported",
    "INFERRED": "inferred",
    "HYPOTHESIS": "synthetic-hypothesis",
    "SYNTHETIC": "synthetic-hypothesis",
}
BASIS_RANK = {
    "OBSERVED": 0,
    "USER_PROVIDED": 1,
    "INFERRED": 2,
    "HYPOTHESIS": 3,
    "SYNTHETIC": 3,
}
PERSONA_SCHEMA = Path(__file__).resolve().parents[1] / "schemas" / "persona.schema.json"


class BlockedError(RuntimeError):
    """A required dependency, destination, or execution capability is unavailable."""


class InvalidArtifactError(ValueError):
    """Supplied bytes or compiled semantics violate a frozen contract."""


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def installed_simulation_dependency() -> tuple[Path, str]:
    process = subprocess.run(
        ["codex", "plugin", "list", "--json"],
        check=False,
        capture_output=True,
        text=True,
    )
    if process.returncode != 0:
        raise BlockedError("enabled plugin registry is unavailable")
    document = json.loads(process.stdout)
    matches = [
        item for item in document.get("installed", [])
        if item.get("name") == "cascade-simulations" and item.get("installed") and item.get("enabled")
    ]
    if len(matches) != 1:
        raise BlockedError("exactly one enabled cascade-simulations plugin is required")
    plugin = matches[0]
    version = plugin.get("version")
    marketplace = plugin.get("marketplaceName")
    if not isinstance(version, str) or not version or not isinstance(marketplace, str) or not marketplace:
        raise BlockedError("enabled Cascade Simulations registry identity is incomplete")
    cache_root = Path.home() / ".codex" / "plugins" / "cache" / marketplace / "cascade-simulations" / version
    if not cache_root.is_dir():
        raise BlockedError("enabled Cascade Simulations installed cache is unavailable")
    return cache_root.resolve(), version


def name(value: str) -> str:
    converted = re.sub(r"[^a-z0-9_]+", "_", value.lower()).strip("_")
    if not converted or not converted[0].isalpha():
        converted = f"id_{converted}"
    return converted


def slug(value: str) -> str:
    converted = re.sub(r"[^a-z0-9-]+", "-", value.lower().replace("_", "-")).strip("-")
    if len(converted) < 3:
        converted = f"persona-{converted or 'id'}"
    return converted[:64].rstrip("-")


def strings(items: list[dict[str, Any]]) -> list[str]:
    return [item["value"] for item in items]


def claim_refs(item: dict[str, Any], claims: dict[str, dict[str, Any]], source_names: dict[str, str]) -> list[str]:
    refs: set[str] = set()
    for claim_id in item["claim_ids"]:
        for source_id in claims[claim_id]["source_ids"]:
            refs.add(source_names[source_id])
    return sorted(refs)


def conservative_basis(item: dict[str, Any], claims: dict[str, dict[str, Any]]) -> str:
    claim_types = {claims[claim_id]["claim_type"] for claim_id in item["claim_ids"]}
    selected = max(claim_types, key=lambda claim_type: (BASIS_RANK[claim_type], claim_type))
    return BASIS[selected]


def nested_claim_ids(value: Any) -> set[str]:
    if isinstance(value, dict):
        result: set[str] = set()
        if isinstance(value.get("claim_id"), str):
            result.add(value["claim_id"])
        for key in ("claim_ids", "evidence_claim_ids"):
            if isinstance(value.get(key), list):
                result.update(item for item in value[key] if isinstance(item, str))
        for item in value.values():
            result.update(nested_claim_ids(item))
        return result
    if isinstance(value, list):
        result: set[str] = set()
        for item in value:
            result.update(nested_claim_ids(item))
        return result
    return set()


def simulation_field_mappings(source: dict[str, Any]) -> list[dict[str, Any]]:
    claims = {item["claim_id"]: item for item in source["claims"]}

    def mapping(source_path: str, target_path: str, basis: str, transformation: str) -> dict[str, Any]:
        source_value: Any = source
        for component in source_path.split("."):
            source_value = source_value[component]
        claim_ids = sorted(nested_claim_ids(source_value)) if basis == "CLAIMS" else []
        claim_types = sorted({claims[claim_id]["claim_type"] for claim_id in claim_ids})
        return {
            "source_path": source_path,
            "target_path": target_path,
            "evidence_basis": basis,
            "claim_ids": claim_ids,
            "claim_types": claim_types,
            "transformation": transformation,
        }

    return [
        mapping("schema_version", "schema_version", "STRUCTURAL", "canonical v2 to simulation v1"),
        mapping("persona_id", "id", "STRUCTURAL", "deterministic slug"),
        mapping("status", "kind", "STRUCTURAL", "status-preserving target kind"),
        mapping("purpose", "purpose", "STRUCTURAL", "verbatim purpose"),
        mapping("sources", "sources", "STRUCTURAL", "redacted locators and deterministic source IDs"),
        mapping("claims", "claims", "CLAIMS", "typed claims with source references"),
        mapping("stable_profile", "stable", "CLAIMS", "grounded profile to immutable simulation traits"),
        mapping("dynamic_model", "dynamic", "CLAIMS", "bounded variables and deterministic transitions"),
        mapping("prohibited_uses", "boundaries.prohibited_inferences", "POLICY", "verbatim prohibitions"),
        mapping("privacy.classification", "boundaries.sensitive_data", "POLICY", "classification to handling mode"),
        mapping("uncertainty", "limitations", "POLICY", "declared uncertainty or scope fallback"),
    ]


def required_simulation_source_paths(source: dict[str, Any]) -> list[str]:
    return [item["source_path"] for item in simulation_field_mappings(source)]


def state_string(value: Any) -> str:
    return str(value).lower() if isinstance(value, bool) else str(value)


def allowed_values(variable: dict[str, Any], transition_values: list[str]) -> list[str]:
    kind = variable["value_type"]
    if kind == "CATEGORY":
        result = [str(item) for item in variable["allowed_values"]]
    elif kind == "BOOLEAN":
        result = ["false", "true"]
    elif kind in {"NUMBER", "INTEGER"}:
        result = [state_string(variable["minimum"]), state_string(variable["baseline"]), state_string(variable["maximum"])]
    else:
        raise ValueError(f"TEXT variable {variable['variable_id']} cannot map to the finite simulation state schema")
    result = list(dict.fromkeys([*result, *transition_values]))
    if len(result) > 7:
        raise InvalidArtifactError(
            f"variable {variable['variable_id']} needs {len(result)} finite states; Cascade Simulations permits at most 7"
        )
    return result


def mapped_update(
    update: dict[str, Any],
    variables: dict[str, dict[str, Any]],
    preconditions: list[dict[str, Any]],
) -> str:
    variable = variables[update["variable_id"]]
    if update["operation"] == "SET":
        result = update["value"]
    else:
        domain = numeric_precondition_domain(variable, preconditions)
        if len(domain) != 1:
            raise InvalidArtifactError(
                f"relative update for {update['variable_id']} is not representable as one finite target state; "
                "use an exact EQ or single-value IN precondition"
            )
        result = domain[0] + update["value"] if update["operation"] == "INCREMENT" else domain[0] - update["value"]
    return state_string(result)


def compile_persona(
    source: dict[str, Any],
    *,
    destination: str,
    transfer_authorized: bool,
) -> dict[str, Any]:
    errors = validate_schema(source, PERSONA_SCHEMA) + validate_persona(source)
    if errors:
        raise InvalidArtifactError(f"canonical persona schema or semantic validation failed: {errors}")
    privacy = source["privacy"]
    if "simulation" not in source.get("permitted_uses", []) or "simulation" not in privacy.get("allowed_consumers", []):
        raise BlockedError("canonical privacy and use policy do not permit the simulation consumer")
    if not destination or destination not in privacy.get("allowed_destinations", []):
        raise BlockedError("simulation destination is not allowed by the canonical privacy policy")
    if not transfer_authorized:
        raise BlockedError("simulation projection transfer is not authorized")
    prohibited = privacy.get("prohibited_fields", [])
    blocked_paths = {
        pointer
        for source_path in required_simulation_source_paths(source)
        for pointer in source_path_intersects_prohibition(source_path, prohibited)
    }
    if blocked_paths:
        raise BlockedError(
            f"simulation target requires canonically prohibited source paths: {sorted(blocked_paths)}"
        )
    stable = source["stable_profile"]
    if not stable["context"] or not stable["goals"]:
        raise InvalidArtifactError("simulation mapping requires at least one grounded context and goal")
    source_names = {
        item["source_id"]: f"source_{index:03d}"
        for index, item in enumerate(source["sources"], start=1)
    }
    claims = {item["claim_id"]: item for item in source["claims"]}
    mapped_authorities = {AUTHORITY[item["authority"]] for item in source["sources"]}
    if source["status"] == "GROUNDED" and mapped_authorities <= {"hypothesis", "user-provided"}:
        raise InvalidArtifactError(
            "grounded canonical provenance is not representable as an evidence-backed Simulations persona; "
            "a direct evidence source is required"
        )
    variables = {item["variable_id"]: item for item in source["dynamic_model"]["variables"]}

    variable_names = {variable_id: name(variable_id) for variable_id in variables}
    transition_values: dict[str, list[str]] = {variable_id: [] for variable_id in variables}
    mapped_transitions = []
    for transition in source["dynamic_model"]["transitions"]:
        grouped_preconditions: dict[str, list[dict[str, Any]]] = {}
        for item in transition["preconditions"]:
            grouped_preconditions.setdefault(item["variable_id"], []).append(item)
        setting: dict[str, str] = {}
        for update in transition["updates"]:
            variable_id = update["variable_id"]
            mapped = mapped_update(update, variables, grouped_preconditions.get(variable_id, []))
            setting[variable_names[variable_id]] = mapped
            transition_values[variable_id].append(mapped)
        preconditions = "; ".join(
            f"{variable_names[item['variable_id']]} {item['operator']} {item['value']}"
            for item in transition["preconditions"]
        )
        when = transition["event"] if not preconditions else f"{transition['event']} when {preconditions}"
        mapped_transitions.append(
            {
                "when": when,
                "set": setting,
                "behavioral_effect": transition["behavioral_effect"],
            }
        )

    mapped_variables = []
    for variable in source["dynamic_model"]["variables"]:
        values = allowed_values(variable, transition_values[variable["variable_id"]])
        if len(values) < 2:
            raise InvalidArtifactError(f"variable {variable['variable_id']} has fewer than two mapped states")
        mapped_variables.append(
            {
                "name": variable_names[variable["variable_id"]],
                "initial": state_string(variable["baseline"]),
                "allowed_values": values,
                "meaning": variable["meaning"],
            }
        )

    traits = []
    for field in ("behaviors", "decision_drivers"):
        for index, item in enumerate(stable[field], start=1):
            traits.append(
                {
                    "name": name(f"{field}_{index}"),
                    "value": item["value"],
                    "basis": conservative_basis(item, claims),
                    "source_refs": claim_refs(item, claims, source_names),
                    "behavioral_implication": item["value"],
                }
            )

    limitations = list(source["uncertainty"])
    if not limitations:
        limitations.append("Valid only for the declared purpose and population scope.")

    return {
        "schema_version": 1,
        "id": slug(source["persona_id"]),
        "kind": "evidence-backed" if source["status"] == "GROUNDED" else "synthetic-hypothesis",
        "purpose": source["purpose"],
        "sources": [
            {
                "id": source_names[item["source_id"]],
                "locator": f"content-sha256:{item['content_sha256']}",
                "authority": AUTHORITY[item["authority"]],
                "revision": item["observed_at"] or item["freshness"],
                "content_digest": item["content_sha256"],
            }
            for item in source["sources"]
        ],
        "claims": [
            {
                "claim": item["statement"],
                "class": CLAIM_CLASS[item["claim_type"]],
                "source_refs": [source_names[source_id] for source_id in item["source_ids"]],
                "confidence": "high" if item["confidence"] >= 0.75 else "medium" if item["confidence"] >= 0.4 else "low",
            }
            for item in source["claims"]
        ],
        "stable": {
            "role_context": strings(stable["context"]),
            "goals": strings(stable["goals"]),
            "knowledge": strings(stable["capabilities"] + stable["jobs"]),
            "constraints": strings(stable["constraints"]),
            "communication": stable["communication"]["value"],
            "traits": traits,
        },
        "dynamic": {"variables": mapped_variables, "transitions": mapped_transitions},
        "boundaries": {
            "prohibited_inferences": source["prohibited_uses"],
            "sensitive_data": "explicitly-authorized"
            if source["privacy"]["classification"] in {"CONFIDENTIAL", "RESTRICTED"}
            else "minimized",
        },
        "limitations": list(dict.fromkeys(limitations)),
    }


def write_new_pair(output: Path, output_bytes: bytes, receipt: Path, receipt_bytes: bytes) -> None:
    staged: list[Path] = []
    finalized: list[Path] = []
    try:
        for destination, content in ((output, output_bytes), (receipt, receipt_bytes)):
            destination.parent.mkdir(parents=True, exist_ok=True)
            handle = tempfile.NamedTemporaryFile(
                mode="wb",
                prefix=f".{destination.name}.",
                suffix=".tmp",
                dir=destination.parent,
                delete=False,
            )
            stage = Path(handle.name)
            staged.append(stage)
            with handle:
                handle.write(content)
                handle.flush()
                os.fsync(handle.fileno())
        os.replace(staged[0], output)
        finalized.append(output)
        os.replace(staged[1], receipt)
        finalized.append(receipt)
    except OSError:
        for path in staged:
            path.unlink(missing_ok=True)
        for path in finalized:
            path.unlink(missing_ok=True)
        raise


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("--source-digest", required=True)
    parser.add_argument("--target-schema", type=Path, required=True)
    parser.add_argument("--target-validator", type=Path, required=True)
    parser.add_argument("--dependency-manifest", type=Path, required=True)
    parser.add_argument("--destination", required=True)
    parser.add_argument("--transfer-authorized", action="store_true", required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--receipt", type=Path, required=True)
    args = parser.parse_args(argv)
    try:
        if re.fullmatch(r"[a-f0-9]{64}", args.source_digest) is None:
            raise InvalidArtifactError("source digest must be a lowercase SHA-256")
        from jsonschema import Draft202012Validator

        if args.output.resolve() == args.receipt.resolve():
            raise InvalidArtifactError("output and receipt paths must be distinct")
        if args.output.exists() or args.receipt.exists():
            raise BlockedError("output and receipt paths must be new")

        trusted_manifest = Path(__file__).resolve().parents[1] / "evals" / "manifest.json"
        if args.dependency_manifest.resolve() != trusted_manifest.resolve():
            raise InvalidArtifactError("dependency manifest must be the packaged Cascade Personas manifest")
        simulation_root, installed_version = installed_simulation_dependency()
        trusted_schema = simulation_root / "skills" / "simulation-persona" / "references" / "persona.schema.json"
        trusted_validator = simulation_root / "skills" / "simulation-persona" / "scripts" / "validate_persona.py"
        if args.target_schema.resolve() != trusted_schema.resolve():
            raise InvalidArtifactError("target schema must be the enabled installed Cascade Simulations schema")
        if args.target_validator.resolve() != trusted_validator.resolve():
            raise InvalidArtifactError("target validator must be the enabled installed Cascade Simulations validator")

        source = strict_json_file(args.source)
        target_schema = strict_json_file(args.target_schema)
        dependency_manifest = strict_json_file(args.dependency_manifest)
        recomputed_source_digest = canonical_digest(source)
        if recomputed_source_digest != args.source_digest:
            raise InvalidArtifactError("source digest does not match RFC 8785 canonical source bytes")
        target_digest = sha256(args.target_schema)
        schema_bindings = [
            item
            for item in dependency_manifest.get("dependencies", [])
            if item.get("alias") == "cascade-simulations:simulation-persona"
            and item.get("path") == "skills/simulation-persona/references/persona.schema.json"
        ]
        validator_digest = sha256(args.target_validator)
        validator_bindings = [
            item
            for item in dependency_manifest.get("dependencies", [])
            if item.get("alias") == "cascade-simulations:simulation-persona"
            and item.get("path") == "skills/simulation-persona/scripts/validate_persona.py"
        ]
        if len(schema_bindings) != 1 or len(validator_bindings) != 1:
            raise InvalidArtifactError("dependency manifest must bind exactly one Simulations persona schema and validator")
        dependency = schema_bindings[0]
        validator_dependency = validator_bindings[0]
        if dependency.get("sha256") != target_digest:
            raise InvalidArtifactError("target schema bytes do not match the dependency manifest")
        if validator_dependency.get("sha256") != validator_digest:
            raise InvalidArtifactError("target semantic validator bytes do not match the dependency manifest")
        if dependency.get("plugin_version") != validator_dependency.get("plugin_version"):
            raise InvalidArtifactError("target schema and semantic validator versions differ")
        if dependency.get("plugin_version") != installed_version:
            raise InvalidArtifactError("dependency manifest version does not match the enabled Cascade Simulations cache")
        if target_schema.get("$id") != "https://cascade.local/cascade-simulations/persona.schema.json":
            raise InvalidArtifactError("target schema identity is not Cascade Simulations persona v1")
        if target_schema_version(target_schema) != "1":
            raise InvalidArtifactError("target schema version is not Cascade Simulations persona v1")
        result = compile_persona(
            source,
            destination=args.destination,
            transfer_authorized=args.transfer_authorized,
        )
        schema_errors = list(Draft202012Validator(target_schema).iter_errors(result))
        if schema_errors:
            raise InvalidArtifactError(f"target schema validation failed: {[error.message for error in schema_errors]}")
        spec = importlib.util.spec_from_file_location("cascade_simulations_persona_validator", args.target_validator)
        if spec is None or spec.loader is None:
            raise BlockedError("target semantic validator cannot be loaded")
        validator_module = importlib.util.module_from_spec(spec)
        try:
            spec.loader.exec_module(validator_module)
        except SystemExit as error:
            raise BlockedError(f"target semantic validator dependency unavailable: {error}") from error
        try:
            validator_module.validate_cross_fields(result)
        except validator_module.ValidationFailure as error:
            raise InvalidArtifactError(f"target semantic validation failed: {error}") from error
        output_bytes = (json.dumps(result, indent=2, sort_keys=True) + "\n").encode("utf-8")
        receipt = {
            "schema_version": 1,
            "status": "PASS",
            "mapping_id": "cascade-personas-to-cascade-simulations-v1",
            "source_persona_id": source["persona_id"],
            "source_persona_version": source["version"],
            "source_persona_sha256": recomputed_source_digest,
            "target_schema_id": target_schema["$id"],
            "target_schema_version": target_schema_version(target_schema),
            "target_schema_sha256": target_digest,
            "target_validator_sha256": validator_digest,
            "target_validator_path": validator_dependency["path"],
            "dependency_plugin_version": dependency["plugin_version"],
            "dependency_manifest_sha256": sha256(args.dependency_manifest),
            "output_file_sha256": hashlib.sha256(output_bytes).hexdigest(),
            "field_mappings_sha256": canonical_digest(simulation_field_mappings(source)),
            "mutable_state_owner": "simulation-run",
            "destination": args.destination,
            "transfer_authorized": args.transfer_authorized,
        }
        receipt_bytes = (json.dumps(receipt, indent=2, sort_keys=True) + "\n").encode("utf-8")
        write_new_pair(args.output, output_bytes, args.receipt, receipt_bytes)
        print(json.dumps(receipt, indent=2, sort_keys=True))
        return 0
    except (BlockedError, OSError, ImportError) as error:
        print(json.dumps({"status": "BLOCKED", "reason": str(error)}, indent=2, sort_keys=True))
        return 2
    except (json.JSONDecodeError, InvalidArtifactError, ValueError, KeyError, TypeError) as error:
        print(json.dumps({"status": "INVALID", "reason": str(error)}, indent=2, sort_keys=True))
        return 2


if __name__ == "__main__":
    sys.exit(main())
