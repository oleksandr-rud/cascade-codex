from __future__ import annotations

import json
import shutil
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import check_plugin


class PluginContractTests(unittest.TestCase):
    def setUp(self) -> None:
        self.root = Path(__file__).resolve().parents[1]

    def test_current_package_passes(self) -> None:
        self.assertEqual(check_plugin.validate(self.root), [])

    def test_unbound_dependency_fails(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            candidate = Path(tmp) / self.root.name
            shutil.copytree(self.root, candidate)
            path = candidate / "evals" / "evaluation-contract.json"
            contract = json.loads(path.read_text(encoding="utf-8"))
            contract["required_dependency_aliases"].append("missing-plugin:missing-skill")
            path.write_text(json.dumps(contract, indent=2) + "\n", encoding="utf-8")
            self.assertTrue(any("missing-plugin:missing-skill" in item for item in check_plugin.validate(candidate)))

    def test_missing_case_category_fails(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            candidate = Path(tmp) / self.root.name
            shutil.copytree(self.root, candidate)
            path = candidate / "evals" / "cases.json"
            suite = json.loads(path.read_text(encoding="utf-8"))
            for case in suite["cases"]:
                if case["category"] == "adversarial":
                    case["category"] = "boundary"
            path.write_text(json.dumps(suite, indent=2) + "\n", encoding="utf-8")
            self.assertTrue(any("adversarial" in item for item in check_plugin.validate(candidate)))

    def test_evaluation_asset_drift_fails(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            candidate = Path(tmp) / self.root.name
            shutil.copytree(self.root, candidate)
            path = candidate / "evals" / "cases.json"
            path.write_text(path.read_text(encoding="utf-8") + " ", encoding="utf-8")
            self.assertTrue(any("evaluation_assets" in item for item in check_plugin.validate(candidate)))

    def test_missing_schema_fails(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            candidate = Path(tmp) / self.root.name
            shutil.copytree(self.root, candidate)
            contract = json.loads((candidate / "evals" / "evaluation-contract.json").read_text(encoding="utf-8"))
            (candidate / "schemas" / contract["required_schemas"][0]).unlink()
            self.assertTrue(any("missing schema" in item for item in check_plugin.validate(candidate)))

    def test_target_visible_acceptance_policy_fails(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            candidate = Path(tmp) / self.root.name
            shutil.copytree(self.root, candidate)
            path = candidate / "skills" / "research-market" / "SKILL.md"
            path.write_text(path.read_text(encoding="utf-8") + "\nAccept only at 0.95.\n", encoding="utf-8")
            self.assertTrue(any("sealed acceptance policy" in item for item in check_plugin.validate(candidate)))

    def test_schema_version_drift_fails(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            candidate = Path(tmp) / self.root.name
            shutil.copytree(self.root, candidate)
            path = candidate / "schemas" / "evidence-ledger.schema.json"
            schema = json.loads(path.read_text(encoding="utf-8"))
            schema["properties"]["schema_version"]["const"] = 2
            path.write_text(json.dumps(schema, indent=2) + "\n", encoding="utf-8")
            self.assertTrue(any("frozen at v4" in item for item in check_plugin.validate(candidate)))

    def test_missing_routing_probe_class_fails(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            candidate = Path(tmp) / self.root.name
            shutil.copytree(self.root, candidate)
            path = candidate / "evals" / "cases.json"
            suite = json.loads(path.read_text(encoding="utf-8"))
            for case in suite["cases"]:
                if case.get("routing_probe") == "NEGATIVE_TRIGGER":
                    del case["routing_probe"]
            path.write_text(json.dumps(suite, indent=2) + "\n", encoding="utf-8")
            self.assertTrue(any("negative-trigger" in item for item in check_plugin.validate(candidate)))


if __name__ == "__main__":
    unittest.main()
