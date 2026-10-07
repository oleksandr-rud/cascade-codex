#!/usr/bin/env python3
"""Smoke-test the complete Cascade QA package."""

from __future__ import annotations

import check_plugin
import unittest


class PackageTests(unittest.TestCase):
    def test_package_contract(self) -> None:
        self.assertEqual([], check_plugin.validate())


if __name__ == "__main__":
    unittest.main()
