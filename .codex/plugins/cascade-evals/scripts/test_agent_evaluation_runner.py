#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

from jsonschema import Draft202012Validator


SCRIPT_ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_ROOT))

from run_agent_evaluation import (
    ContractError,
    docker_phase,
    prepare_docker,
    ExecutionBlocked,
    aggregate_digest,
    apply_target_finalizer,
    execute,
    installed_dependency_roots,
    inline_subject_contract_assets,
    load_assertion_adapter,
    partition_target_case_ids,
    require_target_policy_blindness,
    bind_response_schema,
    bind_target_response_schema,
    normalize_target_cases,
    require_tool_free_jsonl,
    verify_all_dependencies,
)


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def profile(profile_id: str) -> dict:
    anchors = {str(index): f"anchor {index}" for index in range(5)}
    return {
        "schema_version": 1,
        "profile_id": profile_id,
        "version": 1,
        "role": "outcome",
        "decision": "whether the response meets the contract",
        "population": "one fixture case",
        "model": "gpt-6-astra",
        "threshold": 0.95,
        "minimum_dimension": 3,
        "dimensions": [{
            "dimension_id": "contract-fit",
            "description": "Fits the contract",
            "weight": 1.0,
            "anchors": anchors,
        }],
        "blindness": ["sealed labels", "peer judgments"],
    }


class AgentEvaluationRunnerTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.subject = self.root / "subject-source"
        (self.subject / "skills" / "fixture").mkdir(parents=True)
        self.skill = self.subject / "skills" / "fixture" / "SKILL.md"
        self.skill.write_text("---\nname: fixture\ndescription: Fixture skill.\n---\n", encoding="utf-8")
        self.subject_assets = [{"path": "skills/fixture/SKILL.md", "sha256": digest(self.skill)}]
        self.subject_digest = aggregate_digest(self.subject_assets)
        (self.subject / "evals").mkdir()
        self.cases = self.subject / "evals" / "cases.json"
        self.cases.write_text(json.dumps({
            "schema_version": 2,
            "suite_id": "fixture-suite",
            "split_id": "qualification-v1",
            "split_membership": ["CASE-001"],
            "subject_adapter": "cascade-evals:agent-evaluation",
            "execution_adapter": {
                "id": "cascade-evals-agent-runner-v1",
                "runner": "cascade-evals/scripts/run_agent_evaluation.py",
                "model": "gpt-6-astra",
                "reasoning_effort": "high",
                "target_invocations": 1,
                "target_batching": "contiguous-balanced-parallel-v1",
                "case_count": 1,
            },
            "packet_contract": {
                "target_fields": ["case_id", "request", "fixture"],
                "sealed_fields": ["skill", "expected_status", "oracle", "mechanical_assertions"],
                "judge_builder": "cascade-evals/scripts/build_blind_packets.py",
                "judge_schema": "cascade-evals/skills/evaluate/references/judge-packet.schema.json",
            },
            "cases": [{
                "case_id": "CASE-001",
                "skill": "fixture",
                "request": "Perform the task.",
                "fixture": {"permissions": {"external_write": False}},
                "expected_status": "READY",
                "oracle": "A bounded response.",
                "mechanical_assertions": ["bounded"],
            }],
        }), encoding="utf-8")
        self.profiles = [
            self.subject / "evals" / "judge-outcome.json",
            self.subject / "evals" / "judge-trajectory.json",
        ]
        self.profiles[0].write_text(json.dumps(profile("fixture-outcome")), encoding="utf-8")
        self.profiles[1].write_text(json.dumps(profile("fixture-trajectory")), encoding="utf-8")
        (self.subject / "scripts").mkdir()
        self.adapter = self.subject / "scripts" / "evaluate_case_assertions.py"
        self.adapter.write_text(
            "def evaluate(suite, target_output):\n"
            "    return {'evaluation_id': target_output['evaluation_id'], "
            "'subject_digest': target_output['subject_digest'], 'status': 'PASS', "
            "'semantic_status': 'NOT_RUN'}\n",
            encoding="utf-8",
        )
        self.contract = self.subject / "evals" / "evaluation-contract.json"
        self.contract.write_text(json.dumps({
            "plugin_id": "fixture",
            "version": "1",
            "evaluation_manifest": "evals/manifest.json",
            "expected_case_count": 1,
            "acceptance_threshold": 0.95,
            "minimum_dimension": 3,
            "models": {
                "builder": "gpt-6-astra",
                "target": "gpt-6-astra",
                "judge": "gpt-6-astra",
                "reasoning_effort": "high",
                "explicit_comparison_override": False,
            },
        }), encoding="utf-8")
        evaluation_assets = [
            {"path": "evals/evaluation-contract.json", "sha256": digest(self.contract)},
            {"path": "evals/cases.json", "sha256": digest(self.cases)},
            {"path": "evals/judge-outcome.json", "sha256": digest(self.profiles[0])},
            {"path": "evals/judge-trajectory.json", "sha256": digest(self.profiles[1])},
            {"path": "scripts/evaluate_case_assertions.py", "sha256": digest(self.adapter)},
        ]
        evals_root = SCRIPT_ROOT.parent
        evals_version = json.loads((evals_root / ".codex-plugin" / "plugin.json").read_text())["version"]
        dependencies = []
        for alias, relative in (
            ("cascade-evals:evaluate", "scripts/run_agent_evaluation.py"),
            ("cascade-evals:evaluate", "scripts/build_blind_packets.py"),
            ("cascade-evals:evaluate", "scripts/reduce_evaluation.py"),
            ("cascade-evals:evaluate", "scripts/validate_judge.py"),
            ("cascade-evals:evaluate", "skills/evaluate/references/agent-builder-response.schema.json"),
            ("cascade-evals:evaluate", "skills/evaluate/references/agent-target-response.schema.json"),
            ("cascade-evals:evaluate", "skills/evaluate/references/judge-packet.schema.json"),
            ("cascade-evals:evaluate", "skills/evaluate/references/model-policy.json"),
            ("cascade-evals:build-judge", "skills/build-judge/references/judge-response.schema.json"),
        ):
            dependencies.append({
                "alias": alias,
                "path": relative,
                "plugin_version": evals_version,
                "sha256": digest(evals_root / relative),
            })
        self.manifest = self.subject / "evals" / "manifest.json"
        self.manifest.write_text(json.dumps({
            "schema_version": 2,
            "plugin_id": "fixture",
            "plugin_version": "1",
            "subject_digest": self.subject_digest,
            "subject_assets": self.subject_assets,
            "evaluation_assets": evaluation_assets,
            "dependencies": dependencies,
        }), encoding="utf-8")

    def args(self, output: Path) -> argparse.Namespace:
        return argparse.Namespace(
            cases=self.cases,
            profile=self.profiles,
            subject_root=self.subject,
            subject_manifest=self.manifest,
            subject_id="fixture",
            subject_version="1",
            subject_digest=self.subject_digest,
            assertion_adapter=self.adapter,
            evaluation_id="fixture-eval",
            output_dir=output,
            model="gpt-6-astra",
            reasoning_effort="high",
            timeout_seconds=60,
            execute=False,
        )

    def test_container_rejects_extra_mount_before_start_and_cleans_up(self) -> None:
        auth = self.root / "auth.json"
        auth.write_text("{}", encoding="utf-8")
        image = "sha256:" + "a" * 64
        inspected = {"Image": image, "HostConfig": {}, "Mounts": [
            {"Destination": "/work", "Type": "bind", "RW": True},
            {"Destination": "/codex-home/auth.json", "Type": "bind", "RW": False},
            {"Destination": "/host", "Type": "bind", "RW": False},
        ]}
        calls = []
        def fake(command, **kwargs):
            calls.append(command)
            return subprocess.CompletedProcess(command, 0,
                json.dumps([inspected]) if command[1] == "inspect" else "", "")
        with patch("run_agent_evaluation.subprocess.run", side_effect=fake):
            with self.assertRaisesRegex(ContractError, "unexpected container mount"):
                docker_phase(["codex", "--version"], workdir=self.root, auth_file=auth, image=image)
        self.assertFalse(any(c[1] == "start" for c in calls))
        self.assertEqual(calls[-1][1:3], ["rm", "--force"])

    def test_container_timeout_removes_exact_invocation(self) -> None:
        auth = self.root / "auth.json"
        auth.write_text("{}", encoding="utf-8")
        image = "sha256:" + "a" * 64
        inspected = {"Image": image, "HostConfig": {
            "ReadonlyRootfs": True, "Privileged": False, "NetworkMode": "bridge",
            "CapDrop": ["ALL"], "SecurityOpt": ["no-new-privileges"],
        }, "Mounts": [
            {"Destination": "/work", "Type": "bind", "RW": True},
            {"Destination": "/codex-home/auth.json", "Type": "bind", "RW": False},
        ]}
        calls = []
        def fake(command, **kwargs):
            calls.append(command)
            if command[1] == "start":
                raise subprocess.TimeoutExpired(command, 1)
            return subprocess.CompletedProcess(command, 0,
                json.dumps([inspected]) if command[1] == "inspect" else "", "")
        with patch("run_agent_evaluation.subprocess.run", side_effect=fake):
            with self.assertRaises(subprocess.TimeoutExpired):
                docker_phase(["codex", "--version"], workdir=self.root, auth_file=auth, image=image)
        self.assertEqual(calls[-1][-1], calls[0][calls[0].index("--name") + 1])
        self.assertEqual(calls[-1][1:3], ["rm", "--force"])

    def test_container_remote_endpoint_cannot_receive_login(self) -> None:
        auth = self.root / "auth.json"
        auth.write_text("{}", encoding="utf-8")
        with patch.dict("os.environ", {"DOCKER_HOST": "tcp://remote.example:2376"}):
            with patch("run_agent_evaluation.subprocess.run") as invocation:
                with self.assertRaisesRegex(ExecutionBlocked, "local Docker endpoint"):
                    prepare_docker("fixture", auth)
        invocation.assert_not_called()

    def test_container_missing_login_blocks_before_dispatch(self) -> None:
        with patch("run_agent_evaluation.subprocess.run") as invocation:
            with self.assertRaises(ExecutionBlocked):
                prepare_docker("fixture", self.root / "absent-auth.json")
        invocation.assert_not_called()

    def test_ineligible_target_preserves_evidence_without_dispatching_judges(self) -> None:
        from types import SimpleNamespace
        output = self.root / "ineligible"
        args = self.args(output)
        args.execute = True
        args.container_image = "fixture"
        calls = []
        def fake_codex(**kwargs):
            calls.append(kwargs["prompt"])
            if "<controller_packet>" in kwargs["prompt"]:
                response = {"schema_version": 1, "evaluation_id": args.evaluation_id,
                    "subject_digest": args.subject_digest, "status": "READY",
                    "findings": [], "sealed_material_handled_as_data": True}
            else:
                response = {"schema_version": 2, "evaluation_id": args.evaluation_id,
                    "subject_digest": args.subject_digest, "cases": {"CASE-001": {"case_id": "CASE-001",
                    "selected_skill": "fixture", "status": "GAP", "response": "frozen failed response",
                    "signals": {"contract_compliance": "FAIL"}, "evidence": ["fixture evidence"]}}}
            kwargs["output"].write_text(json.dumps(response), encoding="utf-8")
            return "frozen phase log"
        adapter = SimpleNamespace(evaluate=lambda suite, target: {
            "evaluation_id": args.evaluation_id, "subject_digest": args.subject_digest,
            "status": "INVALID", "semantic_status": "NOT_RUN", "findings": ["missing required field"]})
        version = json.loads((SCRIPT_ROOT.parent / ".codex-plugin/plugin.json").read_text())["version"]
        with patch("run_agent_evaluation.installed_dependency_roots", return_value={"cascade-evals": (version, SCRIPT_ROOT.parent)}), \
             patch("run_agent_evaluation.prepare_docker", return_value={"image": "sha256:" + "a" * 64}), \
             patch("run_agent_evaluation.load_assertion_adapter", return_value=adapter), \
             patch("run_agent_evaluation.run_codex", side_effect=fake_codex):
            receipt = execute(args)
        self.assertEqual(receipt["status"], "INVALID")
        self.assertEqual(receipt["semantic_status"], "NOT_RUN")
        self.assertEqual(receipt["judge_invocations"], 0)
        self.assertEqual(len(calls), 2)
        frozen = json.loads((output / "controller/raw-target-output.json").read_text())
        self.assertEqual(frozen["cases"][0]["response"], "frozen failed response")
        self.assertTrue((output / "controller/mechanical-receipt.json").is_file())
        self.assertEqual(len(list((output / "controller/process-logs").glob("*.log"))), 2)

    def test_dry_run_sanitizes_subject_and_keeps_sealed_state_in_memory(self) -> None:
        output = self.root / "artifact"
        evals_version = json.loads((SCRIPT_ROOT.parent / ".codex-plugin" / "plugin.json").read_text())["version"]
        with patch(
            "run_agent_evaluation.installed_dependency_roots",
            return_value={"cascade-evals": (evals_version, SCRIPT_ROOT.parent)},
        ):
            receipt = execute(self.args(output))
        self.assertEqual(receipt["status"], "NOT_RUN")
        self.assertTrue((output / "public" / "subject" / "skills" / "fixture" / "SKILL.md").is_file())
        self.assertFalse((output / "public" / "subject" / "evals").exists())
        self.assertFalse((output / "sealed-oracles.json").exists())
        target = json.loads((output / "public" / "target-packet.json").read_text(encoding="utf-8"))
        self.assertNotIn("oracle", json.dumps(target))

    def test_rejects_output_inside_subject_source(self) -> None:
        with self.assertRaisesRegex(ContractError, "disjoint"):
            execute(self.args(self.subject / "artifacts"))

    def test_rejects_preexisting_output(self) -> None:
        output = self.root / "artifact"
        output.mkdir()
        with self.assertRaisesRegex(ContractError, "new and empty"):
            execute(self.args(output))

    def test_rejects_target_visible_acceptance_policy(self) -> None:
        self.skill.write_text(
            "---\nname: fixture\ndescription: Fixture skill.\n---\n"
            "Accept only at the 0.95 threshold and dimension floor 3.\n",
            encoding="utf-8",
        )
        self.subject_assets[0]["sha256"] = digest(self.skill)
        contract = json.loads(self.contract.read_text(encoding="utf-8"))
        with self.assertRaisesRegex(ContractError, "discloses sealed acceptance policy"):
            require_target_policy_blindness(
                self.subject,
                {"subject_assets": self.subject_assets},
                contract,
            )

    def test_rejects_acceptance_policy_aliases_and_percent_notation(self) -> None:
        contract = json.loads(self.contract.read_text(encoding="utf-8"))
        for leaked in (
            "pass_cutoff=0.95 and score_floor=3",
            "A 95% pass threshold applies with minimum score 3.",
            "required-score: 0.95; dimension-floor: 3",
        ):
            with self.subTest(leaked=leaked):
                self.skill.write_text(
                    "---\nname: fixture\ndescription: Fixture skill.\n---\n" + leaked + "\n",
                    encoding="utf-8",
                )
                with self.assertRaisesRegex(ContractError, "discloses sealed acceptance policy"):
                    require_target_policy_blindness(
                        self.subject,
                        {"subject_assets": self.subject_assets},
                        contract,
                    )

    def test_allows_non_numeric_acceptance_process_vocabulary(self) -> None:
        self.skill.write_text(
            "---\nname: fixture\ndescription: Fixture skill.\n---\n"
            "Freeze the acceptance threshold before candidate outputs are visible.\n",
            encoding="utf-8",
        )
        require_target_policy_blindness(
            self.subject,
            {"subject_assets": self.subject_assets},
            json.loads(self.contract.read_text(encoding="utf-8")),
        )

    def test_revalidates_every_dependency_against_installed_cache(self) -> None:
        manifest = json.loads(self.manifest.read_text(encoding="utf-8"))
        version = json.loads((SCRIPT_ROOT.parent / ".codex-plugin" / "plugin.json").read_text())["version"]
        receipt = verify_all_dependencies(
            manifest,
            {"cascade-evals": (version, SCRIPT_ROOT.parent)},
        )
        self.assertEqual(len(receipt), len(manifest["dependencies"]))
        manifest["dependencies"].append({
            "alias": "missing:skill",
            "path": "SKILL.md",
            "plugin_version": "1",
            "sha256": "0" * 64,
        })
        with self.assertRaisesRegex(ContractError, "not installed and enabled"):
            verify_all_dependencies(manifest, {"cascade-evals": (version, SCRIPT_ROOT.parent)})

    def test_target_response_schema_requires_typed_selected_skill(self) -> None:
        schema = json.loads(
            (SCRIPT_ROOT.parent / "skills" / "evaluate" / "references" / "agent-target-response.schema.json")
            .read_text(encoding="utf-8")
        )
        validator = Draft202012Validator(schema)
        response = {
            "schema_version": 2,
            "evaluation_id": "fixture-eval",
            "subject_digest": "a" * 64,
            "cases": [{
                "case_id": "CASE-001",
                "selected_skill": "fixture",
                "status": "READY",
                "response": "bounded",
                "signals": {"contract_compliance": "PASS"},
                "evidence": ["case:CASE-001:response"],
            }],
        }
        self.assertEqual(list(validator.iter_errors(response)), [])
        del response["cases"][0]["selected_skill"]
        self.assertTrue(list(validator.iter_errors(response)))

    def test_live_response_schemas_type_every_const_and_enum(self) -> None:
        paths = (
            SCRIPT_ROOT.parent / "skills" / "evaluate" / "references" / "agent-builder-response.schema.json",
            SCRIPT_ROOT.parent / "skills" / "evaluate" / "references" / "agent-target-response.schema.json",
            SCRIPT_ROOT.parent / "skills" / "build-judge" / "references" / "judge-response.schema.json",
        )

        def inspect(value: object, location: str = "$") -> list[str]:
            failures: list[str] = []
            if isinstance(value, dict):
                if ("const" in value or "enum" in value) and "type" not in value:
                    failures.append(location)
                for key, item in value.items():
                    failures.extend(inspect(item, f"{location}.{key}"))
            elif isinstance(value, list):
                for index, item in enumerate(value):
                    failures.extend(inspect(item, f"{location}[{index}]"))
            return failures

        for path in paths:
            with self.subTest(path=path.name):
                self.assertEqual(inspect(json.loads(path.read_text(encoding="utf-8"))), [])

    def test_response_schema_binds_controller_identity(self) -> None:
        source = SCRIPT_ROOT.parent / "skills" / "evaluate" / "references" / "agent-target-response.schema.json"
        destination = self.root / "bound-target.schema.json"
        bind_response_schema(
            source,
            destination,
            {"evaluation_id": "eval-1", "subject_digest": "a" * 64},
        )
        schema = json.loads(destination.read_text(encoding="utf-8"))
        self.assertEqual(schema["properties"]["evaluation_id"]["const"], "eval-1")
        self.assertEqual(schema["properties"]["subject_digest"]["const"], "a" * 64)

    def test_target_schema_requires_one_keyed_result_per_case_and_normalizes_order(self) -> None:
        source = SCRIPT_ROOT.parent / "skills" / "evaluate" / "references" / "agent-target-response.schema.json"
        destination = self.root / "bound-cases.schema.json"
        case_ids = ["CASE-002", "CASE-001"]
        bind_target_response_schema(
            source,
            destination,
            {"evaluation_id": "eval-1", "subject_digest": "a" * 64},
            case_ids,
        )
        schema = json.loads(destination.read_text(encoding="utf-8"))
        cases = schema["properties"]["cases"]
        self.assertEqual(cases["required"], case_ids)
        self.assertFalse(cases["additionalProperties"])
        self.assertEqual(cases["properties"]["CASE-001"]["properties"]["case_id"]["const"], "CASE-001")
        target = {"cases": {"CASE-001": {"case_id": "CASE-001"}, "CASE-002": {"case_id": "CASE-002"}}}
        normalize_target_cases(target, case_ids)
        self.assertEqual([item["case_id"] for item in target["cases"]], case_ids)

    def test_tool_free_jsonl_accepts_only_reasoning_and_agent_messages(self) -> None:
        log = "\n".join([
            json.dumps({"type": "thread.started", "thread_id": "thread-1"}),
            json.dumps({"type": "item.completed", "item": {"type": "reasoning"}}),
            json.dumps({"type": "item.completed", "item": {"type": "agent_message", "text": "done"}}),
            json.dumps({"type": "turn.completed"}),
        ])
        require_tool_free_jsonl(log)

    def test_tool_free_jsonl_rejects_command_execution(self) -> None:
        log = "\n".join([
            json.dumps({"type": "item.completed", "item": {"type": "agent_message", "text": "starting"}}),
            json.dumps({"type": "item.started", "item": {"type": "command_execution", "command": "cat sealed"}}),
        ])
        with self.assertRaisesRegex(ContractError, "prohibited item: command_execution"):
            require_tool_free_jsonl(log)

    def test_tool_free_jsonl_reports_provider_error_details(self) -> None:
        log = json.dumps({
            "type": "item.completed",
            "item": {"type": "error", "message": "upstream response deadline exceeded"},
        })
        with self.assertRaisesRegex(ContractError, "upstream response deadline exceeded"):
            require_tool_free_jsonl(log)

    def test_target_batches_are_balanced_contiguous_and_order_preserving(self) -> None:
        case_ids = [f"CASE-{index:03d}" for index in range(1, 15)]
        batches = partition_target_case_ids(case_ids, 3)
        self.assertEqual([len(batch) for batch in batches], [5, 5, 4])
        self.assertEqual([case_id for batch in batches for case_id in batch], case_ids)
        with self.assertRaisesRegex(ContractError, "one through case_count"):
            partition_target_case_ids(case_ids, 15)

    def test_inline_subject_context_limits_bytes_to_operative_contracts(self) -> None:
        subject = self.root / "inline-subject"
        skill = subject / "skills" / "fixture" / "SKILL.md"
        script = subject / "scripts" / "validator.py"
        schema_path = subject / "schemas" / "artifact.schema.json"
        manifest_path = subject / ".codex-plugin" / "plugin.json"
        skill.parent.mkdir(parents=True)
        script.parent.mkdir(parents=True)
        schema_path.parent.mkdir(parents=True)
        manifest_path.parent.mkdir(parents=True)
        skill.write_text("---\nname: fixture\ndescription: fixture\n---\n# Contract\n", encoding="utf-8")
        script.write_text("print('support')\n", encoding="utf-8")
        schema_path.write_text('{"type":"object"}\n', encoding="utf-8")
        manifest_path.write_text('{"name":"fixture","version":"1"}\n', encoding="utf-8")
        manifest = {
            "subject_assets": [
                {"path": "skills/fixture/SKILL.md", "sha256": digest(skill)},
                {"path": "scripts/validator.py", "sha256": digest(script)},
                {"path": "schemas/artifact.schema.json", "sha256": digest(schema_path)},
                {"path": ".codex-plugin/plugin.json", "sha256": digest(manifest_path)},
            ]
        }
        context = inline_subject_contract_assets(subject, manifest)
        self.assertEqual(
            {item["path"] for item in context["operative_contract_assets"]},
            {"skills/fixture/SKILL.md", "schemas/artifact.schema.json", ".codex-plugin/plugin.json"},
        )
        self.assertEqual(
            context["mechanically_bound_supporting_assets"],
            [{"path": "scripts/validator.py", "sha256": digest(script)}],
        )

    def test_dependency_inventory_ignores_unrelated_broken_plugin_cache(self) -> None:
        home = self.root / "home"
        manifest = home / ".codex" / "plugins" / "cache" / "personal" / "fixture" / "1" / ".codex-plugin" / "plugin.json"
        manifest.parent.mkdir(parents=True)
        manifest.write_text('{"name":"fixture","version":"1"}\n', encoding="utf-8")
        inventory = {
            "installed": [
                {
                    "name": "fixture",
                    "marketplaceName": "personal",
                    "version": "1",
                    "installed": True,
                    "enabled": True,
                },
                {
                    "name": "unrelated",
                    "marketplaceName": "nonstandard",
                    "version": "9",
                    "installed": True,
                    "enabled": True,
                },
            ]
        }
        completed = subprocess.CompletedProcess(
            args=["codex", "plugin", "list", "--json"],
            returncode=0,
            stdout=json.dumps(inventory),
            stderr="",
        )
        with patch("run_agent_evaluation.subprocess.run", return_value=completed), patch(
            "run_agent_evaluation.Path.home", return_value=home
        ):
            resolved = installed_dependency_roots({"fixture"})
        self.assertEqual(resolved["fixture"][0], "1")
        self.assertNotIn("unrelated", resolved)

    def test_assertion_adapter_can_import_bound_sibling_validator(self) -> None:
        scripts = self.root / "adapter-scripts"
        scripts.mkdir()
        (scripts / "validator.py").write_text("VALUE = 'bound'\n", encoding="utf-8")
        adapter = scripts / "adapter.py"
        adapter.write_text(
            "from validator import VALUE\n"
            "def evaluate(suite, target_output):\n"
            "    return {'value': VALUE}\n",
            encoding="utf-8",
        )
        module = load_assertion_adapter(adapter)
        self.assertEqual(module.evaluate({}, {}), {"value": "bound"})

    def test_target_finalizer_can_change_only_digest_leaves_and_retains_raw_output(self) -> None:
        class Adapter:
            @staticmethod
            def finalize_target(_suite: dict, target: dict) -> dict:
                response = json.loads(target["cases"][0]["response"])
                response["artifact_sha256"] = "b" * 64
                response["handoffs"][0]["sha256"] = "c" * 64
                target["cases"][0]["response"] = json.dumps(response)
                return target

        target = {
            "schema_version": 2,
            "evaluation_id": "eval-1",
            "subject_digest": "d" * 64,
            "cases": [{
                "case_id": "CASE-001",
                "selected_skill": "fixture",
                "status": "READY",
                "response": json.dumps({
                    "artifact_sha256": "a" * 64,
                    "handoffs": [{"sha256": "a" * 64}],
                    "status": "READY",
                }),
                "signals": {},
                "evidence": [],
            }],
        }
        raw, finalized, receipt = apply_target_finalizer(Adapter(), {}, target, "digest-only-json-response-v1")
        self.assertEqual(json.loads(raw["cases"][0]["response"])["artifact_sha256"], "a" * 64)
        self.assertEqual(json.loads(finalized["cases"][0]["response"])["artifact_sha256"], "b" * 64)
        self.assertEqual(receipt["status"], "PASS")
        self.assertEqual(receipt["change_count"], 2)

    def test_target_finalizer_rejects_semantic_response_changes(self) -> None:
        class Adapter:
            @staticmethod
            def finalize_target(_suite: dict, target: dict) -> dict:
                response = json.loads(target["cases"][0]["response"])
                response["status"] = "APPROVED"
                target["cases"][0]["response"] = json.dumps(response)
                return target

        target = {
            "schema_version": 2,
            "evaluation_id": "eval-1",
            "subject_digest": "d" * 64,
            "cases": [{
                "case_id": "CASE-001",
                "selected_skill": "fixture",
                "status": "READY",
                "response": json.dumps({"sha256": "a" * 64, "status": "READY"}),
                "signals": {},
                "evidence": [],
            }],
        }
        with self.assertRaisesRegex(ContractError, "non-digest field"):
            apply_target_finalizer(Adapter(), {}, target, "digest-only-json-response-v1")

    def test_target_finalizer_rejects_outer_status_changes(self) -> None:
        class Adapter:
            @staticmethod
            def finalize_target(_suite: dict, target: dict) -> dict:
                target["cases"][0]["status"] = "APPROVED"
                return target

        target = {
            "schema_version": 2,
            "evaluation_id": "eval-1",
            "subject_digest": "d" * 64,
            "cases": [{
                "case_id": "CASE-001",
                "selected_skill": "fixture",
                "status": "READY",
                "response": json.dumps({"sha256": "a" * 64}),
                "signals": {},
                "evidence": [],
            }],
        }
        with self.assertRaisesRegex(ContractError, "non-response semantics"):
            apply_target_finalizer(Adapter(), {}, target, "digest-only-json-response-v1")


if __name__ == "__main__":
    unittest.main()
