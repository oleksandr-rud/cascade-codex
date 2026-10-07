#!/usr/bin/env python3
"""Mechanical source/predecessor projection from an explicit model proposal."""

from __future__ import annotations

import copy
import hashlib
from pathlib import Path
from typing import Any

from normalize_judge_ratings import digest
from validate_judge import require

PROTOCOL = "source-predecessor-context-v1"


def project_context(root: Path, source_manifest: dict[str, str], proposal: dict[str, Any],
                    predecessors: dict[str, dict[str, Any]], *, max_bytes: int = 32768) -> dict[str, Any]:
    """Code checks bindings and size; the caller's LLM selects relevant meaning."""
    require(isinstance(proposal, dict) and set(proposal) == {"source_paths", "predecessor_ids"},
            "context proposal fields are invalid")
    paths, ids = proposal["source_paths"], proposal["predecessor_ids"]
    require(isinstance(paths, list) and len(paths) <= 8 and all(isinstance(p, str) for p in paths)
            and len(set(paths)) == len(paths), "context source paths must be bounded and unique")
    require(isinstance(ids, list) and len(ids) <= 4 and all(isinstance(i, str) for i in ids)
            and len(set(ids)) == len(ids), "predecessor IDs must be bounded and unique")
    require(type(max_bytes) is int and max_bytes > 0, "context byte budget must be positive")
    root = root.resolve()
    sources = []
    for relative in paths:
        require(relative in source_manifest, f"context source is not bound: {relative}")
        path = (root / relative).resolve()
        require(not Path(relative).is_absolute() and not Path(relative).drive
                and path.is_relative_to(root) and path.is_file(), "context source escapes its frozen root")
        content = path.read_bytes()
        require(hashlib.sha256(content).hexdigest() == source_manifest[relative], "context source digest drift")
        sources.append({"path": relative, "sha256": source_manifest[relative], "text": content.decode("utf-8")})
    selected = []
    for artifact_id in ids:
        require(artifact_id in predecessors, f"predecessor is unavailable: {artifact_id}")
        artifact = predecessors[artifact_id]
        require(artifact.get("validation_status") == "PASS" and artifact.get("artifact_id") == artifact_id,
                "predecessor must have a valid exact identity")
        require(artifact.get("payload_digest") == digest(artifact.get("payload")), "predecessor payload digest drift")
        selected.append(copy.deepcopy(artifact))
    projected = {"sources": sources, "validated_predecessors": selected}
    import json
    size = len(json.dumps(projected, ensure_ascii=False, separators=(",", ":")).encode("utf-8"))
    require(size <= max_bytes, "selected context exceeds the byte budget; request a smaller explicit selection")
    return {**projected, "receipt": {"schema_version": 1, "protocol": PROTOCOL,
        "source_manifest_digest": digest(source_manifest), "proposal_digest": digest(proposal),
        "projection_digest": digest(projected), "bytes": size, "max_bytes": max_bytes,
        "selection_owner": "ACTIVE_LLM", "silent_truncation": False}}


def validate_handoffs(proposals: Any, obligations: list[dict[str, Any]],
                      owners: dict[str, dict[str, Any]], artifacts: dict[str, dict[str, Any]]) -> dict[str, Any]:
    """Check exact declared edges; missing owners are GAP and never inferred."""
    require(isinstance(proposals, list), "handoffs must be an array")
    required = {edge["edge_id"]: edge for edge in obligations}
    require(len(required) == len(obligations), "duplicate handoff obligation")
    if not obligations:
        require(not proposals, "this task has no handoff obligation")
        return {"schema_version": 1, "status": "NOT_APPLICABLE", "edges": []}
    seen = set()
    checked = []
    for edge in proposals:
        require(isinstance(edge, dict) and set(edge) == {"edge_id", "producer", "consumer", "capability",
                "source_path", "source_digest", "artifact_id", "input_ids", "authority"},
                "handoff fields are invalid")
        edge_id = edge["edge_id"]
        require(isinstance(edge_id, str) and edge_id in required and edge_id not in seen,
                "handoff edge identity is missing, duplicate or unexpected")
        seen.add(edge_id)
        obligation = required[edge_id]
        require(all(edge[key] == obligation[key] for key in ("producer", "consumer", "capability", "input_ids", "authority")),
                "handoff does not meet its frozen obligation")
        owner = owners.get(edge["consumer"])
        if owner is None:
            checked.append({"edge_id": edge_id, "status": "GAP", "reason": "exact consumer owner unavailable"})
            continue
        require(edge["source_path"] == owner["source_path"] and edge["source_digest"] == owner["source_digest"]
                and edge["capability"] in owner["capabilities"], "handoff consumer source/capability drift")
        artifact = artifacts.get(edge["artifact_id"])
        require(artifact is not None and artifact.get("producer") == edge["producer"]
                and artifact.get("validation_status") == "PASS", "handoff artifact is unavailable or ineligible")
        require(artifact.get("payload_digest") == digest(artifact.get("payload")), "handoff artifact digest drift")
        require(isinstance(edge["input_ids"], list) and all(i in artifacts and artifacts[i].get("validation_status") == "PASS"
                and artifacts[i].get("payload_digest") == digest(artifacts[i].get("payload")) for i in edge["input_ids"]),
                "handoff inputs must be exact validated artifacts")
        checked.append({"edge_id": edge_id, "status": "PASS", "artifact_digest": artifact["payload_digest"]})
    require(seen == set(required), "required handoff omitted")
    return {"schema_version": 1, "status": "GAP" if any(e["status"] == "GAP" for e in checked) else "PASS",
            "obligations_digest": digest(obligations), "owner_manifest_digest": digest(owners), "edges": checked}
