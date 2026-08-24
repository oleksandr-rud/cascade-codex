#!/usr/bin/env python3
"""Focused tests for resolve_plugin_skill.py."""

from __future__ import annotations

import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest

import resolve_plugin_skill as resolver


FIXED_TIME = "2026-08-08T00:00:00Z"
OMIT = object()


class ResolvePluginSkillTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tempdir = tempfile.TemporaryDirectory()
        self.addCleanup(self.tempdir.cleanup)
        self.root = Path(self.tempdir.name) / "example-plugin"
        (self.root / ".codex-plugin").mkdir(parents=True)
        (self.root / "skills" / "prompt").mkdir(parents=True)
        self.write_manifest()
        (self.root / "skills" / "prompt" / "SKILL.md").write_text(
            "---\nname: prompt\ndescription: Fixture prompt skill.\n---\n\n# Prompt\n",
            encoding="utf-8",
        )

    def write_manifest(
        self,
        name: str = "example",
        version: str = "1.2.3",
        skills: object = "./skills/",
    ) -> None:
        manifest: dict[str, object] = {"name": name, "version": version}
        if skills is not OMIT:
            manifest["skills"] = skills
        (self.root / ".codex-plugin" / "plugin.json").write_text(
            json.dumps(manifest),
            encoding="utf-8",
        )

    def inventory(self, **overrides: object) -> dict[str, object]:
        entry: dict[str, object] = {
            "pluginId": "example@personal",
            "name": "example",
            "marketplaceName": "personal",
            "version": "1.2.3",
            "installed": True,
            "enabled": True,
            "source": {"source": "local", "path": str(self.root)},
        }
        entry.update(overrides)
        return {"installed": [entry], "available": []}

    def resolve(self, inventory: object, **overrides: object) -> tuple[dict, int]:
        args = {
            "plugin_name": "example",
            "skill_name": "prompt",
            "marketplace": None,
            "resolved_at": FIXED_TIME,
            "inventory_source": "fixture",
        }
        args.update(overrides)
        return resolver.resolve(inventory, **args)

    def test_available_records_paths_versions_and_digests(self) -> None:
        result, exit_code = self.resolve(self.inventory())
        self.assertEqual(exit_code, resolver.EXIT_AVAILABLE)
        self.assertEqual(result["status"], "AVAILABLE")
        self.assertEqual(result["plugin"]["version"], "1.2.3")
        self.assertEqual(result["plugin"]["source_path"], str(self.root.resolve()))
        self.assertEqual(result["plugin"]["declared_skills_root"], "./skills/")
        self.assertEqual(
            result["plugin"]["resolved_skills_root"],
            str((self.root / "skills").resolve()),
        )
        self.assertEqual(len(result["plugin"]["manifest_sha256"]), 64)
        self.assertEqual(len(result["skill"]["sha256"]), 64)
        self.assertEqual(len(result["dependency_sha256"]), 64)
        self.assertEqual(result["resolved_at"], FIXED_TIME)

    def test_missing_plugin_is_blocked(self) -> None:
        result, exit_code = self.resolve({"installed": []})
        self.assertEqual(exit_code, resolver.EXIT_BLOCKED)
        self.assertEqual((result["status"], result["code"]), ("BLOCKED", "PLUGIN_NOT_INSTALLED"))

    def test_disabled_plugin_is_blocked(self) -> None:
        result, exit_code = self.resolve(self.inventory(enabled=False))
        self.assertEqual(exit_code, resolver.EXIT_BLOCKED)
        self.assertEqual((result["status"], result["code"]), ("BLOCKED", "PLUGIN_DISABLED"))

    def test_missing_skill_is_blocked(self) -> None:
        result, exit_code = self.resolve(
            self.inventory(), skill_name="does-not-exist"
        )
        self.assertEqual(exit_code, resolver.EXIT_BLOCKED)
        self.assertEqual((result["status"], result["code"]), ("BLOCKED", "SKILL_NOT_AVAILABLE"))

    def test_manifest_declared_root_is_authoritative_without_fallback(self) -> None:
        (self.root / "different-skills").mkdir()
        self.write_manifest(skills="./different-skills/")
        result, exit_code = self.resolve(self.inventory())
        self.assertEqual(exit_code, resolver.EXIT_BLOCKED)
        self.assertEqual((result["status"], result["code"]), ("BLOCKED", "SKILL_NOT_AVAILABLE"))
        self.assertEqual(result["declared_skills_root"], "./different-skills/")
        self.assertEqual(
            result["expected_skill_path"],
            str((self.root / "different-skills" / "prompt" / "SKILL.md").resolve()),
        )

    def test_skill_resolves_from_nondefault_declared_root(self) -> None:
        custom_skill = self.root / "different-skills" / "prompt" / "SKILL.md"
        custom_skill.parent.mkdir(parents=True)
        custom_skill.write_text(
            "---\nname: prompt\ndescription: Custom-root prompt skill.\n---\n",
            encoding="utf-8",
        )
        self.write_manifest(skills="./different-skills/")
        result, exit_code = self.resolve(self.inventory())
        self.assertEqual(exit_code, resolver.EXIT_AVAILABLE, result)
        self.assertEqual(result["skill"]["path"], str(custom_skill.resolve()))
        self.assertEqual(
            result["plugin"]["resolved_skills_root"],
            str((self.root / "different-skills").resolve()),
        )

    def test_manifest_skills_path_escape_is_invalid(self) -> None:
        outside = Path(self.tempdir.name) / "outside-skills"
        outside.mkdir()
        self.write_manifest(skills="../outside-skills/")
        result, exit_code = self.resolve(self.inventory())
        self.assertEqual(exit_code, resolver.EXIT_INVALID)
        self.assertEqual(
            (result["status"], result["code"]),
            ("INVALID", "MANIFEST_SKILLS_PATH_ESCAPE"),
        )

    def test_skill_symlink_escape_is_invalid(self) -> None:
        shutil.rmtree(self.root / "skills" / "prompt")
        outside_skill = Path(self.tempdir.name) / "outside" / "prompt"
        outside_skill.mkdir(parents=True)
        (outside_skill / "SKILL.md").write_text(
            "---\nname: prompt\ndescription: Escaped prompt skill.\n---\n",
            encoding="utf-8",
        )
        (self.root / "skills" / "prompt").symlink_to(outside_skill, target_is_directory=True)
        result, exit_code = self.resolve(self.inventory())
        self.assertEqual(exit_code, resolver.EXIT_INVALID)
        self.assertEqual(
            (result["status"], result["code"]),
            ("INVALID", "SKILL_PATH_ESCAPE"),
        )

    def test_absent_or_invalid_manifest_skills_field_is_invalid(self) -> None:
        cases = [OMIT, None, "", "   ", 42, "/absolute/skills", "C:\\skills", "\\\\server\\skills"]
        for skills in cases:
            with self.subTest(skills=skills):
                self.write_manifest(skills=skills)
                result, exit_code = self.resolve(self.inventory())
                self.assertEqual(exit_code, resolver.EXIT_INVALID)
                self.assertEqual(
                    (result["status"], result["code"]),
                    ("INVALID", "MANIFEST_SKILLS_INVALID"),
                )

    def test_manifest_skills_root_must_be_a_directory(self) -> None:
        (self.root / "not-a-directory").write_text("not a directory", encoding="utf-8")
        self.write_manifest(skills="./not-a-directory")
        result, exit_code = self.resolve(self.inventory())
        self.assertEqual(exit_code, resolver.EXIT_INVALID)
        self.assertEqual(
            (result["status"], result["code"]),
            ("INVALID", "SKILLS_ROOT_UNAVAILABLE"),
        )

    def test_ambiguous_plugin_requires_marketplace(self) -> None:
        inventory = self.inventory()
        second = dict(inventory["installed"][0])
        second["pluginId"] = "example@other"
        second["marketplaceName"] = "other"
        inventory["installed"].append(second)
        result, exit_code = self.resolve(inventory)
        self.assertEqual(exit_code, resolver.EXIT_BLOCKED)
        self.assertEqual((result["status"], result["code"]), ("BLOCKED", "AMBIGUOUS_PLUGIN"))

        selected, selected_exit = self.resolve(inventory, marketplace="personal")
        self.assertEqual(selected_exit, resolver.EXIT_AVAILABLE)
        self.assertEqual(selected["plugin"]["plugin_id"], "example@personal")

    def test_manifest_identity_mismatch_is_invalid(self) -> None:
        self.write_manifest(version="9.9.9")
        result, exit_code = self.resolve(self.inventory())
        self.assertEqual(exit_code, resolver.EXIT_INVALID)
        self.assertEqual((result["status"], result["code"]), ("INVALID", "PLUGIN_IDENTITY_MISMATCH"))

    def test_skill_identity_mismatch_is_invalid(self) -> None:
        (self.root / "skills" / "prompt" / "SKILL.md").write_text(
            "---\nname: another-skill\ndescription: Wrong identity.\n---\n",
            encoding="utf-8",
        )
        result, exit_code = self.resolve(self.inventory())
        self.assertEqual(exit_code, resolver.EXIT_INVALID)
        self.assertEqual((result["status"], result["code"]), ("INVALID", "SKILL_IDENTITY_MISMATCH"))

    def test_malformed_inventory_is_blocked(self) -> None:
        result, exit_code = self.resolve({"installed": "not-a-list"})
        self.assertEqual(exit_code, resolver.EXIT_BLOCKED)
        self.assertEqual((result["status"], result["code"]), ("BLOCKED", "MALFORMED_INVENTORY"))

    def test_cli_reads_fixture_inventory_and_emits_receipt(self) -> None:
        inventory_path = Path(self.tempdir.name) / "inventory.json"
        inventory_path.write_text(json.dumps(self.inventory()), encoding="utf-8")
        completed = subprocess.run(
            [
                sys.executable,
                str(Path(resolver.__file__).resolve()),
                "--plugin",
                "example",
                "--skill",
                "prompt",
                "--inventory",
                str(inventory_path),
                "--resolved-at",
                FIXED_TIME,
            ],
            check=False,
            capture_output=True,
            text=True,
            timeout=15,
        )
        result = json.loads(completed.stdout)
        self.assertEqual(completed.returncode, resolver.EXIT_AVAILABLE, completed.stderr)
        self.assertEqual(result["status"], "AVAILABLE")
        self.assertEqual(result["inventory_source"], str(inventory_path.resolve()))
        self.assertEqual(result["resolved_at"], FIXED_TIME)

    @unittest.skipUnless(shutil.which("codex"), "Codex CLI is unavailable")
    def test_real_installed_cascade_prompt_when_present(self) -> None:
        completed = subprocess.run(
            ["codex", "plugin", "list", "--json"],
            check=True,
            capture_output=True,
            text=True,
            timeout=15,
        )
        inventory = json.loads(completed.stdout)
        installed_names = {
            item.get("name") for item in inventory.get("installed", []) if isinstance(item, dict)
        }
        if "cascade-prompt" not in installed_names:
            self.skipTest("cascade-prompt is not installed")
        result, exit_code = resolver.resolve(
            inventory,
            plugin_name="cascade-prompt",
            skill_name="prompt",
            marketplace=None,
            resolved_at=FIXED_TIME,
            inventory_source="codex plugin list --json",
        )
        self.assertEqual(exit_code, resolver.EXIT_AVAILABLE, result)
        self.assertEqual(result["status"], "AVAILABLE")
        self.assertEqual(result["plugin"]["name"], "cascade-prompt")
        self.assertEqual(result["plugin"]["declared_skills_root"], "./skills/")
        self.assertEqual(
            result["plugin"]["resolved_skills_root"],
            str((Path(result["plugin"]["source_path"]) / "skills").resolve()),
        )
        self.assertEqual(result["skill"]["name"], "prompt")


if __name__ == "__main__":
    unittest.main()
