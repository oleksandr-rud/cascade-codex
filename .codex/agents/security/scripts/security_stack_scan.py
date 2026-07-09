#!/usr/bin/env python3
"""Build a bounded, filename-only security surface inventory for a repository."""

from __future__ import annotations

import argparse
import json
import os
from collections import Counter
from pathlib import Path


IGNORED_PARTS = {
    ".git",
    ".artifacts",
    ".mypy_cache",
    ".pytest_cache",
    ".ruff_cache",
    ".venv",
    "__pycache__",
    "build",
    "dist",
    "node_modules",
    "target",
    "vendor",
}

MANIFEST_NAMES = {
    "cargo.toml",
    "composer.json",
    "deno.json",
    "docker-compose.yml",
    "docker-compose.yaml",
    "dockerfile",
    "gemfile",
    "go.mod",
    "package-lock.json",
    "package.json",
    "pnpm-lock.yaml",
    "poetry.lock",
    "pom.xml",
    "pyproject.toml",
    "requirements.txt",
    "uv.lock",
    "yarn.lock",
}

CATEGORY_TERMS = {
    "auth_session": {"auth", "jwt", "login", "logout", "oauth", "rbac", "session", "token"},
    "routes_boundaries": {"api", "controller", "endpoint", "handler", "middleware", "route"},
    "data_tenant": {"database", "db", "migration", "model", "organization", "repository", "schema", "tenant"},
    "secrets_config": {"config", "credential", "env", "secret", "setting", "vault"},
    "audit_telemetry": {"analytics", "audit", "log", "metric", "telemetry", "trace"},
    "files_ingestion": {"document", "file", "ingest", "parser", "storage", "upload"},
    "agents_prompts": {"agent", "llm", "memory", "prompt", "rag", "retrieval", "tool"},
    "external_integrations": {"adapter", "client", "connector", "integration", "provider", "webhook"},
    "infrastructure": {"cloud", "docker", "helm", "infra", "kubernetes", "terraform"},
    "tests": {"e2e", "fixture", "mock", "spec", "test"},
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("root", nargs="?", default=".")
    parser.add_argument("--max-files", type=int, default=100_000)
    parser.add_argument("--max-per-category", type=int, default=200)
    return parser.parse_args()


def tokens_for(relative: str) -> set[str]:
    normalized = relative.lower().replace("-", "_").replace(".", "_").replace("/", "_")
    return {token for token in normalized.split("_") if token}


def scan(root: Path, max_files: int, max_per_category: int) -> dict[str, object]:
    root = root.resolve()
    extension_counts: Counter[str] = Counter()
    manifests: list[str] = []
    categories: dict[str, list[str]] = {name: [] for name in CATEGORY_TERMS}
    scanned = 0
    truncated = False

    for current, dirs, files in os.walk(root, followlinks=False):
        dirs[:] = sorted(name for name in dirs if name not in IGNORED_PARTS)
        for filename in sorted(files):
            path = Path(current) / filename
            relative = path.relative_to(root).as_posix()
            if any(part in IGNORED_PARTS for part in path.relative_to(root).parts):
                continue
            scanned += 1
            if scanned > max_files:
                truncated = True
                break
            suffix = path.suffix.lower() or "<none>"
            extension_counts[suffix] += 1
            if filename.lower() in MANIFEST_NAMES:
                manifests.append(relative)
            tokens = tokens_for(relative)
            for category, terms in CATEGORY_TERMS.items():
                if tokens.intersection(terms) and len(categories[category]) < max_per_category:
                    categories[category].append(relative)
        if truncated:
            break

    return {
        "schema_version": 1,
        "root": str(root),
        "scanned_files": min(scanned, max_files),
        "truncated": truncated,
        "content_read": False,
        "manifests": manifests[:max_per_category],
        "extension_counts": dict(sorted(extension_counts.items())),
        "security_surfaces": categories,
        "guardrail": "Filename-only inventory; inspect selected source files separately and never print secret values.",
    }


def main() -> int:
    args = parse_args()
    root = Path(args.root)
    if not root.is_dir():
        print(json.dumps({"error": f"repository root is not a directory: {root}"}))
        return 2
    print(json.dumps(scan(root, args.max_files, args.max_per_category), indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
