"""Replacement wire-contract regression tests; retired mutation schema is rejected."""
import copy
import json
import unittest
from validate_agent_contracts import ROOT, SCHEMA, validate_contract

class AgentContractsTests(unittest.TestCase):
    def setUp(self): self.analysis = json.loads((ROOT/'assets/claims-actions.example.json').read_text())
    def test_schema_and_example(self):
        self.assertEqual(validate_contract('Analysis', self.analysis), [])
    def test_old_wire_and_runtime_authority_are_rejected(self):
        for field in ('groups', 'blocks', 'base_revision', 'authorization', 'idempotency_key'):
            value = copy.deepcopy(self.analysis); value[field] = []
            self.assertTrue(validate_contract('Analysis', value), field)
        self.assertTrue(validate_contract('Analysis', {'schema_version': 'state-delta.v3', 'groups': [], 'blocks': []}))
    def test_action_payload_matches_declared_operation(self):
        self.analysis['actions'][0]['kind'] = 'RESEARCH'
        self.assertTrue(validate_contract('Analysis', self.analysis))
    def test_explicit_unknown_and_uncertain_support(self):
        self.analysis['claims'][0]['support'] = 'UNCERTAIN'
        self.analysis['claims'][0]['uncertainty'] = 'Needs confirmation.'
        self.assertEqual(validate_contract('Analysis', self.analysis), [])
        self.analysis['claims'][0]['support'] = 'APPROVED'
        self.assertTrue(validate_contract('Analysis', self.analysis))

if __name__ == '__main__': unittest.main()
