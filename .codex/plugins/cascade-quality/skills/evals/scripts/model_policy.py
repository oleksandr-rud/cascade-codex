"""Shared defaults and exact compatibility identities for evaluation models."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from validate_judge import require


MODEL_POLICY = Path(__file__).resolve().parent.parent / "skills/evaluate/references/model-policy.json"
POLICY = json.loads(MODEL_POLICY.read_text(encoding="utf-8"))
REASONING_EFFORTS = {"low", "medium", "high", "xhigh", "max", "ultra"}
MODEL_FIELDS = ("builder_model", "target_model", "judge_model")
EFFORT_FIELDS = ("builder_reasoning_effort", "target_reasoning_effort", "judge_reasoning_effort")
require(POLICY.get("schema_version") == 1, "model policy schema is invalid")
DEFAULTS = POLICY.get("defaults", {})
BASELINES = POLICY.get("preserved_baselines", [])
require(isinstance(BASELINES, list), "model policy baselines must be an array")
for configuration in [DEFAULTS, *[item.get("models", {}) for item in BASELINES]]:
    require(all(isinstance(configuration.get(field), str) and configuration[field] and configuration[field] not in POLICY.get("forbidden_models", []) for field in MODEL_FIELDS), "model policy has invalid models")
    require(all(configuration.get(field) in REASONING_EFFORTS for field in EFFORT_FIELDS), "model policy has invalid reasoning efforts")
DEFAULT_MODEL = DEFAULTS["target_model"]
DEFAULT_EFFORT = DEFAULTS["target_reasoning_effort"]


def is_standard_configuration(models: dict[str, Any]) -> bool:
    """Accept current defaults or an exact preserved configuration, without inference."""
    configurations = [DEFAULTS, *[item["models"] for item in BASELINES]]
    return any(all(models.get(field) == item[field] for field in (*MODEL_FIELDS, *EFFORT_FIELDS)) for item in configurations)
