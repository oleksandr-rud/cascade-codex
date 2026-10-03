"""Boundary checks for the typed-decision target runner."""

import copy
import importlib.util
import json
import os
import sys
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch


root = Path(__file__).resolve().parents[1]
module_path = Path(__file__).with_name("run-typed-decision-eval.py")
spec = importlib.util.spec_from_file_location("typed_decision_eval", module_path)
runner = importlib.util.module_from_spec(spec)
spec.loader.exec_module(runner)
pack_path = root / "evals/typed-decisions/support-triage-development-v1.json"


class TypedDecisionEvalTests(unittest.TestCase):
    def setUp(self):
        self.pack = runner.validate_pack(json.loads(pack_path.read_text(encoding="utf-8")))

    def test_target_request_excludes_gold_and_unused_policy(self):
        arm = next(arm for arm in self.pack["arms"] if arm["id"] == "concise-ticket-only")
        request = runner.build_request(self.pack["cases"][0], arm, self.pack, "english")
        self.assertEqual(set(request), {"model", "state", "questions"})
        self.assertEqual(set(request["state"]), {"ticket"})
        self.assertNotIn("gold", json.dumps(request))
        self.assertNotIn("REF-7", json.dumps(request))

    def test_invalid_answer_stays_invalid(self):
        questions = self.pack["question_sets"]["concise"]
        with self.assertRaisesRegex(ValueError, "answer IDs differ"):
            runner.validate_answer({"answers": {"support_route": {"type": "choice", "choice": "billing"}}}, questions)
        with self.assertRaisesRegex(ValueError, "probability keys differ"):
            runner.validate_answer({"answers": {
                "support_route": {"type": "choice", "choice": "billing", "confidence": 0.7,
                                  "probabilities": {"billing": 1.0}},
                "human_agent_requested": {"type": "noul", "noul": 0.6},
            }}, questions)

    def test_score_requires_complete_rubric_distribution(self):
        questions = {"severity": {"type": "score", "instructions": "How severe?",
                                  "criteria": ["low", "medium", "high"]}}
        with self.assertRaisesRegex(ValueError, "probability keys differ"):
            runner.validate_answer({"answers": {"severity": {
                "type": "score", "score": 1.0, "confidence": 0.8,
                "legend": {"0": "low", "1": "medium", "2": "high"},
                "probabilities": {"0": 0.1, "1": 0.9},
            }}}, questions)

    def test_pack_rejects_bad_gold_and_missing_state(self):
        bad = copy.deepcopy(self.pack)
        bad["cases"][0]["gold"]["human_agent_requested"] = "true"
        with self.assertRaisesRegex(ValueError, "Noul gold must be boolean"):
            runner.validate_pack(bad)
        bad = copy.deepcopy(self.pack)
        del bad["cases"][0]["state"]["policy"]
        with self.assertRaisesRegex(ValueError, "missing state field"):
            runner.validate_pack(bad)

    def test_development_separation_is_diagnostic_and_requires_complete_valid_cases(self):
        pack = copy.deepcopy(self.pack)
        pack["arms"] = [next(arm for arm in pack["arms"] if arm["id"] == "concise-ticket-only")]
        arm_id = "concise-ticket-only"
        rows = [
            {"arm_id": arm_id, "status": "VALID", "values": {"support_route": "other",
             "human_agent_requested": 0.3}, "gold": {"support_route": "other", "human_agent_requested": False}},
            {"arm_id": arm_id, "status": "VALID", "values": {"support_route": "other",
             "human_agent_requested": 0.7}, "gold": {"support_route": "other", "human_agent_requested": True}},
        ]
        result = runner.metrics(rows, pack)[arm_id]["questions"]["human_agent_requested"]
        self.assertEqual(result["observed_separation"]["exploratory_midpoint"], 0.5)
        rows[1]["values"]["human_agent_requested"] = 0.2
        result = runner.metrics(rows, pack)[arm_id]["questions"]["human_agent_requested"]
        self.assertIsNone(result["observed_separation"]["exploratory_midpoint"])
        rows[1]["values"]["human_agent_requested"] = 0.7
        rows.append({"arm_id": arm_id, "status": "INVALID", "values": {}, "gold": rows[1]["gold"]})
        result = runner.metrics(rows, pack)[arm_id]["questions"]["human_agent_requested"]
        self.assertFalse(result["observed_separation"]["complete_case_set"])
        self.assertIsNone(result["observed_separation"]["exploratory_midpoint"])
        pack["split"] = "held_out"
        result = runner.metrics(rows[:2], pack)[arm_id]["questions"]["human_agent_requested"]
        self.assertNotIn("observed_separation", result)

    def test_no_jev_credential_creates_no_run_or_network_call(self):
        with tempfile.TemporaryDirectory() as tmp, patch.dict(os.environ, {}, clear=True):
            output = Path(tmp) / "run"
            with self.assertRaisesRegex(ValueError, "TYPESAFE_API_KEY"):
                runner.run(pack_path, "jev", "jev-1.13.0", output, 1, 200)
            self.assertFalse(output.exists())

    def test_call_budget_blocks_before_output(self):
        with tempfile.TemporaryDirectory() as tmp:
            output = Path(tmp) / "run"
            with self.assertRaisesRegex(ValueError, "above max_calls"):
                runner.run(pack_path, "jev", "jev-1.13.0", output, 1, 2)
            self.assertFalse(output.exists())

    def test_existing_output_cannot_be_overwritten(self):
        with tempfile.TemporaryDirectory() as tmp, patch.dict(os.environ, {"TYPESAFE_API_KEY": "test"}):
            output = Path(tmp) / "already-used"
            output.mkdir()
            marker = output / "marker.txt"
            marker.write_text("preserve", encoding="utf-8")
            with self.assertRaises(FileExistsError):
                runner.run(pack_path, "jev", "jev-1.13.0", output, 1, 200)
            self.assertEqual(marker.read_text(encoding="utf-8"), "preserve")

    def vision_pack(self, directory: Path) -> Path:
        image = directory / "item.bin"
        image.write_bytes(b"fixed image input")
        pack = {
            "schema_version": 1, "corpus_id": "vision-test", "corpus_version": 1,
            "split": "development", "label_provenance": "Test fixture",
            "question_sets": {"visual": {"damaged": {"type": "noul", "instructions": "Is it damaged?"}}},
            "arms": [{"id": "image-and-note", "question_set": "visual", "state_fields": ["image", "note"]}],
            "cases": [{"id": "item", "state": {"image": {"path": image.name,
                "sha256": runner.hashlib.sha256(image.read_bytes()).hexdigest()}, "note": "Inspect the item"},
                "gold": {"damaged": True}}],
        }
        path = directory / "pack.json"
        path.write_text(json.dumps(pack), encoding="utf-8")
        return path

    def test_laya_vision_uses_verified_image_bytes_and_strict_prediction(self):
        with tempfile.TemporaryDirectory() as tmp:
            directory = Path(tmp)
            pack = self.vision_pack(directory)
            seen = []

            def predict(state, questions, *, strict):
                seen.append((state, questions, strict))
                return {"model": "laya-vlm", "answers": {"damaged": {"type": "noul", "noul": 0.8}},
                        "provenance": {"checkpoint": {"revision": "abc123"}}}

            agent = SimpleNamespace(predict=predict, source={"revision": "abc123"})
            loads = []

            def load_vlm(model, *, revision):
                loads.append((model, revision))
                return agent

            fake_laya = SimpleNamespace(load_vlm=load_vlm, __version__="0.1.7")
            with patch.dict(sys.modules, {"laya": fake_laya}):
                result = runner.run(pack, "laya-vision", "thaitea/laya-vision", directory / "run", 1, 2,
                                    revision="abc123")
            self.assertEqual(loads, [("thaitea/laya-vision", "abc123")])
            self.assertEqual(seen[0][0]["image"], b"fixed image input")
            self.assertEqual(seen[0][0]["note"], "Inspect the item")
            self.assertTrue(seen[0][2])
            self.assertEqual(result["invalid_results"], 0)
            receipt = json.loads((directory / "run/0000-request.json").read_text(encoding="utf-8"))
            self.assertEqual(receipt["state"]["image"]["path"], "item.bin")
            self.assertEqual(receipt["predict_options"], {"strict": True})
            self.assertEqual(result["manifest"]["checkpoint"]["loaded_source"]["revision"], "abc123")

    def test_laya_vision_rejects_changed_or_external_image_before_run(self):
        with tempfile.TemporaryDirectory() as tmp:
            directory = Path(tmp)
            pack_path = self.vision_pack(directory)
            pack = json.loads(pack_path.read_text(encoding="utf-8"))
            (directory / "item.bin").write_bytes(b"changed")
            with self.assertRaisesRegex(ValueError, "sha256 mismatch"):
                runner.run(pack_path, "laya-vision", "thaitea/laya-vision", directory / "run", 1, 2)
            self.assertFalse((directory / "run").exists())
            pack["cases"][0]["state"]["image"]["path"] = "../outside.bin"
            pack_path.write_text(json.dumps(pack), encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "inside the pack directory"):
                runner.validate_image_assets(runner.validate_pack(pack), pack_path)

    def test_laya_vision_truncation_stays_invalid(self):
        questions = {"damaged": {"type": "noul", "instructions": "Is it damaged?"}}
        response = {"answers": {"damaged": {"type": "noul", "noul": 0.8,
                    "truncated": {"state_tokens_dropped": 5}}}}
        with self.assertRaisesRegex(ValueError, "truncated"):
            runner.validate_answer(response, questions, reject_truncation=True)


if __name__ == "__main__":
    unittest.main()
