#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

from run_agent_evaluation import CleanupUnconfirmed, ExecutionBlocked, docker_phase, prepare_docker, run_codex


class TransportEvidenceTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.schema = self.root / "schema.json"
        self.schema.write_text('{}', encoding="utf-8")
        self.output = self.root / "output.json"
        self.journal = self.root / "journal"

    def invoke(self):
        return run_codex(prompt="bound request", workdir=self.root, output=self.output,
                         schema=self.schema, model="gpt-6-astra", reasoning_effort="high",
                         timeout_seconds=20, transport_dir=self.journal)

    def test_completed_streams_raw_output_and_exact_hashes_are_retained(self):
        def execute(command, **kwargs):
            self.output.write_text('{"raw":"provider output"}', encoding="utf-8")
            return subprocess.CompletedProcess(command, 0, "complete stdout\n", "complete stderr\n")
        with patch("run_agent_evaluation.subprocess.run", side_effect=execute):
            self.invoke()
        self.assertEqual((self.journal / "stdout.jsonl").read_text(), "complete stdout\n")
        self.assertEqual((self.journal / "stderr.txt").read_text(), "complete stderr\n")
        self.assertEqual((self.journal / "raw-response.json").read_bytes(), self.output.read_bytes())
        receipt = json.loads((self.journal / "invocation-receipt.json").read_text())
        self.assertEqual(receipt["status"], "PASS")
        self.assertEqual(len(receipt["evidence"]), 5)
        self.assertGreaterEqual(receipt["elapsed_seconds"], 0)

    def test_timeout_retains_partial_streams_without_synthesizing_output(self):
        error = subprocess.TimeoutExpired(["codex"], 20, output=b"partial stdout", stderr=b"partial stderr")
        with patch("run_agent_evaluation.subprocess.run", side_effect=error):
            with self.assertRaises(subprocess.TimeoutExpired): self.invoke()
        self.assertEqual((self.journal / "stdout.jsonl").read_text(), "partial stdout")
        self.assertEqual((self.journal / "stderr.txt").read_text(), "partial stderr")
        self.assertFalse((self.journal / "raw-response.json").exists())
        receipt = json.loads((self.journal / "invocation-receipt.json").read_text())
        self.assertEqual(receipt["status"], "TIMEOUT")

    def test_nonzero_exit_retains_full_error_stream_and_untrusted_raw_output(self):
        def fail(command, **kwargs):
            self.output.write_text('{"unfinished":true}', encoding="utf-8")
            return subprocess.CompletedProcess(command, 1, "partial", "failure")
        with patch("run_agent_evaluation.subprocess.run", side_effect=fail):
            with self.assertRaises(ExecutionBlocked): self.invoke()
        receipt = json.loads((self.journal / "invocation-receipt.json").read_text())
        self.assertEqual(receipt["status"], "BLOCKED")
        self.assertEqual(receipt["returncode"], 1)
        self.assertEqual((self.journal / "raw-response.json").read_bytes(), self.output.read_bytes())

    def test_old_codex_image_is_rejected_before_any_model_dispatch(self):
        auth = self.root / "auth.json"
        auth.write_text('{}', encoding="utf-8")
        def host(command, **kwargs):
            value = "unix:///var/run/docker.sock" if command[1] == "context" else "sha256:" + "a" * 64
            return subprocess.CompletedProcess(command, 0, value, "")
        def phase(command, **kwargs):
            value = "MOUNT_ISOLATION_PASS" if command[0] == "node" else "codex-cli 0.153.4"
            return subprocess.CompletedProcess(command, 0, value, "")
        with patch("run_agent_evaluation.subprocess.run", side_effect=host), \
             patch("run_agent_evaluation.docker_phase", side_effect=phase) as dispatch:
            with self.assertRaises(ExecutionBlocked): prepare_docker("old-image", auth)
        self.assertEqual(dispatch.call_count, 2)

    def test_unconfirmed_cleanup_preserves_timing_and_exact_context_identity(self):
        image = "sha256:" + "a" * 64
        auth = self.root / "auth.json"
        auth.write_text("{}")
        for failure in (subprocess.TimeoutExpired(["docker", "rm"], 30),
                        subprocess.CompletedProcess([], 1, "", "daemon unavailable")):
            with self.subTest(failure=type(failure).__name__):
                calls = []
                def host(command, **kwargs):
                    calls.append((command, kwargs))
                    if command[1] == "inspect":
                        record = {"Image": image, "HostConfig": {"ReadonlyRootfs": True,
                            "Privileged": False, "NetworkMode": "bridge", "CapDrop": ["ALL"],
                            "SecurityOpt": ["no-new-privileges"]}, "Mounts": [
                            {"Destination": "/work", "Type": "bind", "RW": True},
                            {"Destination": "/codex-home/auth.json", "Type": "bind", "RW": False}]}
                        return subprocess.CompletedProcess(command, 0, json.dumps([record]), "")
                    if command[1] == "rm":
                        if isinstance(failure, BaseException): raise failure
                        return failure
                    return subprocess.CompletedProcess(command, 0, "complete", "")
                with patch("run_agent_evaluation.subprocess.run", side_effect=host):
                    with self.assertRaises(CleanupUnconfirmed) as raised:
                        docker_phase(["codex"], workdir=self.root, auth_file=auth, image=image)
                timing = raised.exception.cascade_timing
                self.assertIn("cleanup_seconds", timing)
                self.assertGreaterEqual(timing["total_seconds_including_cleanup"], timing["cleanup_seconds"])
                create, cleanup = calls[0][0], calls[-1][0]
                self.assertEqual(cleanup[-1], create[create.index("--name") + 1])
                self.assertEqual(calls[-1][1]["timeout"], 30)


if __name__ == "__main__": unittest.main()
