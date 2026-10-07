import copy
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location("native_decisions", Path(__file__).with_name("native-decisions.py"))
native = importlib.util.module_from_spec(spec)
spec.loader.exec_module(native)


class NativeContractTests(unittest.TestCase):
    def test_observed_permission_error_never_grants_authority(self):
        fixture = json.loads((Path(__file__).parent.parent / "references" /
            "imajev4b-permission-regression-v1.json").read_text(encoding="utf-8"))
        self.assertIs(fixture["request"]["state"]["operator_permission_to_publish"], False)
        response = fixture["response"]
        original = copy.deepcopy(response)
        values = native.validate_answer(response, fixture["request"]["questions"], "imajev", "imajev-4b")
        self.assertAlmostEqual(values["permission"]["value"], .9140040854306988)
        self.assertEqual(values["permission"]["action_authority"], "NONE")
        self.assertFalse(fixture["host_authorization"]["publish_allowed"])
        self.assertEqual(response, original)

    def test_intern_score_keeps_expectation_and_legend(self):
        q = {"s": {"type": "score", "criteria": ["low", "medium", "high"]}}
        a = {"model": "Intern-Decision-4B", "answers": {"s": {"type": "score", "score": 1.5,
            "legend": {"0": "low", "1": "medium", "2": "high"},
            "probabilities": {"0": .1, "1": .3, "2": .6}, "confidence": .6, "decision": "2"}}}
        value = native.validate_answer(a, q, "intern", a["model"])["s"]
        self.assertEqual(value["value"], 1.5)
        self.assertEqual(value["action_authority"], "NONE")
        wrong = copy.deepcopy(a); wrong["answers"]["s"]["score"] = 2
        with self.assertRaises(ValueError): native.validate_answer(wrong, q, "intern", a["model"])

    def test_intern_noul_is_probability_not_boolean(self):
        q = {"n": {"type": "noul"}}
        a = {"model": "Intern-Decision-4B", "answers": {"n": {"type": "noul", "noul": .2,
            "confidence": .8, "decision": "no", "probabilities": {"yes": .2, "no": .8}}}}
        self.assertEqual(native.validate_answer(a, q, "intern", a["model"])["n"]["value"], .2)
        a["answers"]["n"]["decision"] = "yes"
        with self.assertRaises(ValueError): native.validate_answer(a, q, "intern", a["model"])

    def test_imajev_unknown_withholds_value(self):
        q = {"c": {"type": "choice", "criteria": {"a": "a", "b": "b"}}}
        a = {"model": "imajev-4b", "answers": {"c": {"type": "choice", "choice": "a",
            "probabilities": {"a": .75, "b": .25}, "unknown_probability": .7,
            "confidence": .15, "abstained": True, "status": "abstained"}}}
        value = native.validate_answer(a, q, "imajev", a["model"])["c"]
        self.assertIsNone(value["value"])
        self.assertEqual(value["reported_value"], "a")
        a["answers"]["c"]["confidence"] = .75
        with self.assertRaises(ValueError): native.validate_answer(a, q, "imajev", a["model"])

    def test_imajev_noul_unknown_neutral_mass(self):
        q = {"n": {"type": "noul"}}
        a = {"model": "imajev-4b", "answers": {"n": {"type": "noul", "noul": .425,
            "probabilities": {"true": .25, "false": .75}, "unknown_probability": .7,
            "abstained": True, "status": "abstained"}}}
        self.assertAlmostEqual(native.validate_answer(a, q, "imajev", a["model"])["n"]["unconditional_probabilities"]["yes"], .075)
        a["answers"]["n"]["probabilities"]["true"] = .7
        with self.assertRaises(ValueError): native.validate_answer(a, q, "imajev", a["model"])

    def test_identity_and_unbound_loader_files_are_rejected(self):
        with self.assertRaises(ValueError): native.validate_answer({"model": "other", "answers": {}}, {}, "intern", "Intern-Decision-4B")
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory); path = root / "config.json"; path.write_text("{}")
            manifest = {"config.json": native.file_digest(path)}
            self.assertEqual(native.verify_assets(root, manifest), root.resolve())
            (root / "model.safetensors").write_bytes(b"unbound")
            with self.assertRaises(ValueError): native.verify_assets(root, manifest)
            with self.assertRaises(ValueError): native.verify_assets(root, {"../escape.json": "0" * 64})


if __name__ == "__main__": unittest.main()
