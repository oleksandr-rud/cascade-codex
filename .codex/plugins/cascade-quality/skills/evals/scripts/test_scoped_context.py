import copy
from pathlib import Path
import tempfile
import unittest

from normalize_judge_ratings import digest
from scoped_context import project_context, validate_handoffs
from validate_judge import ContractError


class ScopedContextTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.file = self.root / "selected.md"
        self.file.write_text("Exact selected evidence.", encoding="utf-8")
        import hashlib
        self.manifest = {"selected.md": hashlib.sha256(self.file.read_bytes()).hexdigest()}
        self.artifact = {"artifact_id": "a1", "producer": "prompt-author", "validation_status": "PASS",
                         "payload": {"section": "candidate"}, "payload_digest": digest({"section": "candidate"})}

    def test_explicit_selection_preserves_source_and_validated_predecessor(self):
        proposal = {"source_paths": ["selected.md"], "predecessor_ids": ["a1"]}
        result = project_context(self.root, self.manifest, proposal, {"a1": self.artifact})
        self.assertEqual(result["sources"][0]["text"], self.file.read_text())
        self.assertEqual(result["validated_predecessors"][0], self.artifact)
        self.assertFalse(result["receipt"]["silent_truncation"])

    def test_source_drift_unbound_source_and_budget_reject_without_truncation(self):
        for proposal, limit in [({"source_paths": ["missing"], "predecessor_ids": []}, 32768),
                                ({"source_paths": ["selected.md"], "predecessor_ids": []}, 1)]:
            with self.assertRaises(ContractError): project_context(self.root, self.manifest, proposal, {}, max_bytes=limit)
        self.file.write_text("changed", encoding="utf-8")
        with self.assertRaises(ContractError):
            project_context(self.root, self.manifest, {"source_paths": ["selected.md"], "predecessor_ids": []}, {})

    def test_invalid_or_fabricated_predecessor_cannot_enter_context(self):
        for altered in [{**self.artifact, "validation_status": "FAIL"}, {**self.artifact, "payload_digest": "0" * 64}]:
            with self.assertRaises(ContractError):
                project_context(self.root, self.manifest, {"source_paths": [], "predecessor_ids": ["a1"]}, {"a1": altered})

    def edge(self):
        return {"edge_id": "e1", "producer": "prompt-author", "consumer": "cascade-quality:agent-evaluation",
                "capability": "evaluate-agent", "source_path": "skills/agent-evaluation/SKILL.md",
                "source_digest": "a" * 64, "artifact_id": "a1", "input_ids": ["a1"], "authority": "READ_ONLY"}

    def test_exact_handoff_checks_owner_inputs_artifact_and_authority(self):
        edge = self.edge()
        obligation = {key: edge[key] for key in ("edge_id", "producer", "consumer", "capability", "input_ids", "authority")}
        owners = {edge["consumer"]: {"source_path": edge["source_path"], "source_digest": edge["source_digest"],
                                   "capabilities": [edge["capability"]]}}
        self.assertEqual(validate_handoffs([edge], [obligation], owners, {"a1": self.artifact})["status"], "PASS")
        for field, value in [("consumer", "generic-reviewer"), ("source_digest", "b" * 64), ("authority", "EXTERNAL_WRITE")]:
            with self.subTest(field=field), self.assertRaises(ContractError):
                validate_handoffs([{**edge, field: value}], [obligation], owners, {"a1": self.artifact})
        self.assertEqual(validate_handoffs([edge], [obligation], {}, {"a1": self.artifact})["status"], "GAP")
        with self.assertRaises(ContractError): validate_handoffs([], [obligation], owners, {"a1": self.artifact})

    def test_ordinary_task_has_no_new_handoff_requirement(self):
        self.assertEqual(validate_handoffs([], [], {}, {})["status"], "NOT_APPLICABLE")
        with self.assertRaises(ContractError): validate_handoffs([self.edge()], [], {}, {})


if __name__ == "__main__": unittest.main()
