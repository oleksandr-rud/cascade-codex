"""Synthetic receipt regressions, not evidence of model improvement."""
import copy
import hashlib
import json
import tempfile
import unittest
from pathlib import Path
from reduce_cycle import InvalidCycle, reduce_cycle

QUALITY_SCHEMA = Path(__file__).resolve().parents[4]/'cascade-quality/skills/evals/skills/evaluate/references/evaluation-receipt.schema.json'
MODELS = {key+'_model': 'gpt-6-astra' for key in ('builder', 'target', 'judge')}
MODELS.update({key+'_reasoning_effort': 'high' for key in ('builder', 'target', 'judge')})

class ImprovementCycleTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.schema = json.loads(QUALITY_SCHEMA.read_text())
        self.cycle = {'schema_version': 'improvement-cycle.v1', 'baseline': self.save('baseline.txt', b'baseline'),
          'candidate': self.save('candidate.txt', b'candidate'), 'receipt_schema_digest': hashlib.sha256(json.dumps(self.schema, sort_keys=True, separators=(',', ':')).encode()).hexdigest(),
          'cases': [{'id': 'measured-failure', 'split': 'FAILURE', 'source': self.save('failure-case.json', b'{"case":"failure"}')},
                    {'id': 'unseen-regression', 'split': 'HELD_OUT', 'source': self.save('held-out.json', b'{"case":"held-out"}')}],
          'profiles': [{'id': 'outcome', 'version': 1}], 'models': MODELS, 'author_context_ids': ['author-context'], 'minimum_gain': 0.1, 'receipts': []}
        for variant in ('baseline', 'candidate'):
            for case in self.cycle['cases']:
                score = 0.4 if variant == 'baseline' and case['split'] == 'FAILURE' else 0.9
                receipt = {'schema_version': 1, 'evaluation_id': variant+'-'+case['id'], 'bundle_sha256': 'b'*64,
                  'subject': {'kind': 'agent', 'id': 'fixture-agent', 'version': variant, 'digest': self.cycle[variant]['sha256']},
                  'models': MODELS, 'mechanical_status': 'PASS', 'judgments': [{'profile_id': 'outcome', 'profile_version': 1,
                    'judge_identity': 'fixture-independent-judge', 'judge_context_id': 'judge-'+variant+'-'+case['id'], 'score': score,
                    'verdict': 'FAIL' if score < 0.8 else 'PASS'}], 'conservative_score': score,
                  'overall_status': 'FAIL' if score < 0.8 else 'PASS', 'evidence': [case['source']]}
                binding = self.save(variant+'-'+case['id']+'.json', json.dumps(receipt).encode())
                self.cycle['receipts'].append({**binding, 'variant': variant, 'case_id': case['id'], 'bundle_sha256': 'b'*64})
    def tearDown(self): self.temp.cleanup()
    def save(self, name, data):
        (self.root/name).write_bytes(data)
        return {'path': name, 'sha256': hashlib.sha256(data).hexdigest()}
    def update_receipt(self, index, change):
        binding = self.cycle['receipts'][index]
        data = json.loads((self.root/binding['path']).read_text()); change(data)
        binding.update(self.save(binding['path'], json.dumps(data).encode()))
    def run_cycle(self): return reduce_cycle(self.cycle, self.root, self.schema)
    def test_matched_improvement_is_candidate_only(self):
        result = self.run_cycle()
        self.assertEqual(result['status'], 'CANDIDATE_READY')
        self.assertFalse(result['promotion_authorized'])
    def test_regression_and_missing_execution_do_not_pass(self):
        self.update_receipt(3, lambda r: r.update(overall_status='FAIL', conservative_score=0.3, judgments=[{**r['judgments'][0], 'score': 0.3, 'verdict': 'FAIL'}]))
        self.assertEqual(self.run_cycle()['status'], 'REJECTED')
        self.update_receipt(3, lambda r: r.update(mechanical_status='NOT_RUN', overall_status='NOT_RUN', conservative_score=None, judgments=[], evidence=[]))
        self.assertEqual(self.run_cycle()['status'], 'UNRESOLVED')
    def test_stale_subject_and_frozen_bytes_are_invalid(self):
        (self.root/'candidate.txt').write_text('changed')
        with self.assertRaisesRegex(InvalidCycle, 'stale'): self.run_cycle()
    def test_author_cannot_judge_or_change_comparison_models(self):
        self.update_receipt(2, lambda r: r['judgments'][0].update(judge_context_id='author-context'))
        with self.assertRaisesRegex(InvalidCycle, 'author'): self.run_cycle()
        self.update_receipt(2, lambda r: (r['judgments'][0].update(judge_context_id='independent'), r.update(models={**MODELS, 'target_model': 'different-model'})))
        with self.assertRaisesRegex(InvalidCycle, 'model mismatch'): self.run_cycle()
    def test_wrong_case_evidence_and_contradictory_score_are_invalid(self):
        self.update_receipt(2, lambda r: r.update(evidence=[]))
        with self.assertRaisesRegex(InvalidCycle, 'case evidence'): self.run_cycle()
        self.update_receipt(2, lambda r: r.update(evidence=[self.cycle['cases'][0]['source']], conservative_score=1))
        with self.assertRaisesRegex(InvalidCycle, 'score'): self.run_cycle()
    def test_duplicate_or_missing_pair_is_invalid(self):
        self.cycle['receipts'][3] = copy.deepcopy(self.cycle['receipts'][2])
        with self.assertRaisesRegex(InvalidCycle, 'duplicate'): self.run_cycle()
    def test_case_path_cannot_escape_the_frozen_input(self):
        self.cycle['cases'][0]['source']['path'] = '../outside.json'
        with self.assertRaisesRegex(InvalidCycle, 'outside'): self.run_cycle()

if __name__ == '__main__': unittest.main()
