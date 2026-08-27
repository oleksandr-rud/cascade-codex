#!/usr/bin/env python3

from __future__ import annotations

import importlib.util
from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("check_plugin", ROOT / "scripts" / "check_plugin.py")
assert SPEC and SPEC.loader
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class PluginContractTests(unittest.TestCase):
    def test_package_contract_passes(self) -> None:
        self.assertEqual(MODULE.validate(ROOT), [])


if __name__ == "__main__":
    unittest.main()
