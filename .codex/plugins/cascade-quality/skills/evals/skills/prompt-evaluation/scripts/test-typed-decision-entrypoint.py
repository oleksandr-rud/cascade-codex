"""Offline CLI, downgrade, source drift and manifest-binding regressions."""

import contextlib
import copy
import hashlib
import importlib.util
import io
import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import typed_decision_binding as guard

SCRIPTS = Path(__file__).resolve().parent
PACK = SCRIPTS.parent / 'evals/typed-decisions/support-triage-development-v1.json'
ENTRY = SCRIPTS / 'run-typed-decision-entrypoint.py'


def load(path, name):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


entry = load(ENTRY, 'typed_decision_entrypoint_test')
runner = load(SCRIPTS / guard.V2_FILE, 'typed_decision_guarded_runner_test')


class EntrypointTests(unittest.TestCase):
    def cli(self, script, arguments):
        return subprocess.run([sys.executable, '-B', str(script), *arguments], capture_output=True,
                              text=True, timeout=10, env={**os.environ, 'TYPESAFE_API_KEY': ''})

    def fixture_root(self, directory):
        scripts = Path(directory) / 'scripts'
        scripts.mkdir()
        references = scripts.parent / 'references'
        references.mkdir()
        modern, legacy = b'fixture = 2\n', b'fixture = 1\n'
        (scripts / guard.V2_FILE).write_bytes(modern)
        (scripts / guard.LEGACY_FILE).write_bytes(legacy)
        binding = {'schema_version': 1, 'adapter_id': guard.ADAPTER_ID, 'contract_version': 2,
                   'legacy_execution_policy': 'INSPECTION_ONLY',
                   'runner': {'file': guard.V2_FILE, 'sha256': hashlib.sha256(modern).hexdigest()},
                   'legacy': {'file': guard.LEGACY_FILE, 'sha256': hashlib.sha256(legacy).hexdigest()}}
        binding_file = references / 'typed-decision-entrypoint.json'
        binding_file.write_text(json.dumps(binding), encoding='utf-8')
        return scripts, binding_file, binding

    def test_default_cli_selects_v2_and_emits_exact_binding(self):
        result = self.cli(ENTRY, ['validate', '--pack', str(PACK)])
        self.assertEqual(result.returncode, 0, result.stderr)
        payload = json.loads(result.stdout)
        self.assertEqual(payload['typed_decision_contract_version'], 2)
        self.assertEqual(payload['entrypoint_binding'], guard.resolve_runner_binding())
        self.assertEqual(payload['entrypoint_binding']['action_authority'], 'NONE')

    def test_explicit_v2_and_direct_v2_cli_share_the_binding(self):
        routed = self.cli(ENTRY, ['--runner', 'v2', 'validate', '--pack', str(PACK)])
        direct = self.cli(SCRIPTS / guard.V2_FILE, ['validate', '--pack', str(PACK)])
        self.assertEqual(routed.returncode, 0, routed.stderr)
        self.assertEqual(direct.returncode, 0, direct.stderr)
        self.assertEqual(json.loads(routed.stdout)['entrypoint_binding'], json.loads(direct.stdout)['entrypoint_binding'])

    def test_explicit_legacy_cannot_validate_or_start_a_new_run(self):
        for command in ('validate', 'run'):
            with self.subTest(command=command):
                result = self.cli(ENTRY, ['--runner', 'legacy', command, '--pack', str(PACK)])
                self.assertEqual(result.returncode, 3)
                self.assertIn('not eligible for new execution', result.stderr)
                self.assertEqual(result.stdout, '')

    def test_preserved_legacy_cli_still_validates_its_original_contract(self):
        result = self.cli(SCRIPTS / guard.LEGACY_FILE, ['validate', '--pack', str(PACK)])
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(json.loads(result.stdout)['status'], 'VALIDATED')
        self.assertNotIn('typed_decision_contract_version', json.loads(result.stdout))

    def test_legacy_manifest_is_inspection_only_and_never_accepted_as_v2(self):
        digest = hashlib.sha256((SCRIPTS / guard.LEGACY_FILE).read_bytes()).hexdigest()
        legacy = {'schema_version': 1, 'runner_sha256': digest, 'status': 'EXECUTED_EXPLORATORY'}
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'legacy-manifest.json'
            path.write_text(json.dumps(legacy), encoding='utf-8')
            inspected = self.cli(ENTRY, ['--runner', 'legacy', 'inspect-legacy', '--manifest', str(path)])
            rejected = self.cli(ENTRY, ['validate-manifest', '--manifest', str(path)])
        self.assertEqual(inspected.returncode, 0, inspected.stderr)
        self.assertFalse(json.loads(inspected.stdout)['eligible_for_new_binding'])
        self.assertEqual(json.loads(inspected.stdout)['source_execution'], 'NOT_PERFORMED')
        self.assertEqual(rejected.returncode, 3)
        self.assertIn('cannot establish a v2 binding', rejected.stderr)

    def test_unknown_runner_identity_does_not_fall_back(self):
        for identity in ('legacy', guard.LEGACY_FILE, 'other.py', '../' + guard.V2_FILE):
            with self.subTest(identity=identity), self.assertRaisesRegex(ValueError, 'not eligible'):
                guard.resolve_runner_binding(identity)

    def test_missing_v2_does_not_use_present_legacy(self):
        with tempfile.TemporaryDirectory() as directory:
            scripts, _, _ = self.fixture_root(directory)
            (scripts / guard.V2_FILE).unlink()
            with self.assertRaises(FileNotFoundError):
                guard.resolve_runner_binding(scripts_root=scripts)
            self.assertTrue((scripts / guard.LEGACY_FILE).exists())

    def test_source_drift_is_blocked_before_loading(self):
        with tempfile.TemporaryDirectory() as directory:
            scripts, _, _ = self.fixture_root(directory)
            (scripts / guard.V2_FILE).write_text('raise AssertionError("must never execute")\n', encoding='utf-8')
            with self.assertRaisesRegex(ValueError, 'runner digest differs'):
                guard.resolve_runner_binding(scripts_root=scripts)

    def test_declared_binding_cannot_downgrade_to_legacy(self):
        with tempfile.TemporaryDirectory() as directory:
            scripts, path, binding = self.fixture_root(directory)
            binding['runner'] = binding['legacy']
            path.write_text(json.dumps(binding), encoding='utf-8')
            with self.assertRaisesRegex(ValueError, 'exact v2 runner'):
                guard.resolve_runner_binding(scripts_root=scripts)

    def test_frozen_binding_digest_is_enforced_before_pack_read(self):
        result = self.cli(ENTRY, ['--binding-sha256', '0' * 64, 'validate', '--pack', 'missing-pack.json'])
        self.assertEqual(result.returncode, 3)
        self.assertIn('frozen binding digest', result.stderr)
        self.assertNotIn('missing-pack', result.stderr)

    def test_loader_rechecks_and_executes_only_verified_bytes(self):
        with tempfile.TemporaryDirectory() as directory:
            scripts, _, _ = self.fixture_root(directory)
            binding = guard.resolve_runner_binding(scripts_root=scripts)
            (scripts / guard.V2_FILE).write_text('raise AssertionError("must never execute")\n', encoding='utf-8')
            with patch.object(entry, '__file__', str(scripts / ENTRY.name)):
                with self.assertRaisesRegex(ValueError, 'changed before loading'):
                    entry.load_runner(binding)

    def test_manifest_cannot_forge_modern_contract_with_an_old_runner_or_changed_binding(self):
        binding = guard.resolve_runner_binding()
        manifest = {'typed_decision_contract_version': 2, 'runner_sha256': binding['runner_sha256'],
                    'entrypoint_binding': binding}
        self.assertTrue(guard.validate_execution_manifest(manifest)['binding_verified'])
        for mutate in ('runner', 'binding', 'missing'):
            bad = copy.deepcopy(manifest)
            if mutate == 'runner':
                bad['runner_sha256'] = hashlib.sha256((SCRIPTS / guard.LEGACY_FILE).read_bytes()).hexdigest()
            elif mutate == 'binding':
                bad['entrypoint_binding']['action_authority'] = 'PUBLISH'
            else:
                del bad['entrypoint_binding']
            with self.subTest(mutate=mutate), self.assertRaises(ValueError):
                guard.validate_execution_manifest(bad)

    def test_binding_drift_between_loading_and_dispatch_is_blocked_before_pack_or_sdk(self):
        with tempfile.TemporaryDirectory() as directory:
            scripts, binding_file, declared = self.fixture_root(directory)
            source = (SCRIPTS / guard.V2_FILE).read_bytes()
            (scripts / guard.V2_FILE).write_bytes(source)
            declared['runner']['sha256'] = hashlib.sha256(source).hexdigest()
            binding_file.write_text(json.dumps(declared), encoding='utf-8')
            binding = guard.resolve_runner_binding(scripts_root=scripts)
            original_load = entry.load_runner
            def drift_after_loading(receipt):
                module = original_load(receipt)
                binding_file.write_bytes(binding_file.read_bytes() + b'\n')
                return module
            error = io.StringIO()
            with patch.object(entry, '__file__', str(scripts / ENTRY.name)), patch.object(entry, 'resolve_runner_binding', return_value=binding):
                with patch.object(entry, 'load_runner', side_effect=drift_after_loading), contextlib.redirect_stderr(error):
                    code = entry.main(['run', '--pack', 'missing-pack.json', '--provider', 'jev', '--model', 'jev-1.13.0', '--output', 'never-created'])
            self.assertEqual(code, 3)
            self.assertIn('frozen binding digest', error.getvalue())
            self.assertNotIn('missing-pack', error.getvalue())

    def test_loaded_code_cannot_claim_a_replaced_runner_even_with_an_updated_declaration(self):
        with tempfile.TemporaryDirectory() as directory:
            scripts, binding_file, declared = self.fixture_root(directory)
            source = (SCRIPTS / guard.V2_FILE).read_bytes()
            (scripts / guard.V2_FILE).write_bytes(source)
            declared['runner']['sha256'] = hashlib.sha256(source).hexdigest()
            binding_file.write_text(json.dumps(declared), encoding='utf-8')
            binding = guard.resolve_runner_binding(scripts_root=scripts)
            with patch.object(entry, '__file__', str(scripts / ENTRY.name)):
                module = entry.load_runner(binding)
            changed = source + b'\n# source changed after verified loading\n'
            (scripts / guard.V2_FILE).write_bytes(changed)
            declared['runner']['sha256'] = hashlib.sha256(changed).hexdigest()
            binding_file.write_text(json.dumps(declared), encoding='utf-8')
            with self.assertRaisesRegex(ValueError, 'loaded v2 code differs'):
                module.run(Path('missing-pack.json'), 'jev', 'jev-1.13.0', Path('never-created'), 1, 1)

    def test_guarded_mock_run_writes_a_verified_binding_without_network(self):
        pack = json.loads(PACK.read_text(encoding='utf-8'))
        pack['arms'] = pack['arms'][:1]
        pack['cases'] = pack['cases'][:1]
        arm = pack['arms'][0]
        pack['question_sets'] = {arm['question_set']: pack['question_sets'][arm['question_set']]}
        questions = pack['question_sets'][arm['question_set']]
        answers = {}
        for qid, question in questions.items():
            if question['type'] == 'noul':
                answers[qid] = {'type': 'noul', 'noul': 0.0}
            else:
                keys = list(question['criteria']) if question['type'] == 'choice' else [str(index) for index in range(len(question['criteria']))]
                answers[qid] = {'type': question['type'], 'confidence': 1.0,
                                'probabilities': {key: float(index == 0) for index, key in enumerate(keys)}}
                if question['type'] == 'choice':
                    answers[qid]['choice'] = keys[0]
                else:
                    answers[qid].update(score=0.0, legend=dict(zip(keys, question['criteria'])))
        response = {'model': 'jev-1.13.0', 'answers': answers}
        with tempfile.TemporaryDirectory() as directory:
            case_file, output = Path(directory) / 'pack.json', Path(directory) / 'run'
            case_file.write_text(json.dumps(pack), encoding='utf-8')
            with patch.object(entry, 'load_runner', return_value=runner), patch.object(runner, 'jev_predict', return_value=response) as predict:
                with patch.dict(os.environ, {'TYPESAFE_API_KEY': 'unit-test-never-sent'}), contextlib.redirect_stdout(io.StringIO()):
                    code = entry.main(['run', '--pack', str(case_file), '--provider', 'jev', '--model', 'jev-1.13.0',
                                       '--output', str(output), '--max-calls', '1'])
            self.assertEqual(code, 0)
            self.assertEqual(predict.call_count, 1)
            manifest = json.loads((output / 'manifest.json').read_text(encoding='utf-8'))
            checked = guard.validate_execution_manifest(manifest)
            self.assertTrue(checked['binding_verified'])
            self.assertEqual(checked['quality_acceptance'], 'NOT_ESTABLISHED')
            self.assertEqual(checked['action_authority'], 'NONE')


if __name__ == '__main__':
    unittest.main()
