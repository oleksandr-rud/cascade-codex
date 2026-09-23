#!/usr/bin/env python3
"""Prepared-data contract tests; no model-quality or production-policy claim."""
import copy
import hashlib
import json
import subprocess
import tempfile
import unittest
from pathlib import Path

from analyzer_findings import (FindingsRejected, analyzer_findings_schema,
                               bind_findings, parse_findings)
from validate_agent_contracts import ROOT, validate_contract


def fixture():
    source = json.loads((ROOT/'assets/state-delta-policy-projection.example.json').read_text())
    findings = json.loads((ROOT/'assets/analyzer-findings.example.json').read_text())
    context, schemas = source['analyzer_context'], source['value_schemas']
    text = "Atlas's budget is $5,000; ask Alex to confirm it before approval."
    context['context_id'] = 'issued-budget-context'
    context['base_revision'] = 7
    context['event']['text'] = text
    evidence = context['evidence_catalog'][0]
    evidence['text'] = text
    evidence['source_binding']['digest'] = 'sha256:'+hashlib.sha256(text.encode()).hexdigest()
    context['evidence_catalog'] = [evidence]
    schemas['budget@1'] = {'type': 'object', 'properties': {
        'amount_minor': {'type': 'integer', 'minimum': 0}, 'currency': {'const': 'USD'}},
        'required': ['amount_minor', 'currency'], 'additionalProperties': False}
    schemas['goal@1'] = {'enum': ['confirm_budget']}
    schemas['gap@1'] = {'type': 'object', 'properties': {
        'status': {'enum': ['unknown', 'ambiguous', 'conflicting']}, 'detail': {'type': 'string'}},
        'required': ['status', 'detail'], 'additionalProperties': False}
    targets = []
    for field, schema in [('requested_outcome', 'goal@1'), ('budget_confirmation', 'gap@1')]:
        targets.append({'policy_id': 'project-intake', 'instance_id': 'atlas', 'field_id': field,
                        'field_revision': 3, 'value_schema_ref': schema, 'value_schema': schemas[schema],
                        'allowed_changes': ['set'], 'allowed_support': ['reported', 'inferred'],
                        'merge_rule_ref': 'replace-after-admission@1'})
    context['writable_targets'] = targets
    bindings = {'context_id': context['context_id'], 'base_revision': 7,
                'subjects': {'project': 'project-atlas'},
                'predicates': {'budget': {'predicate': 'budget', 'value_schema_ref': 'budget@1',
                                           'allowed_support': ['reported', 'inferred']}},
                'fields': {t['field_id']: {k: t[k] for k in ('policy_id', 'instance_id', 'field_id')} for t in targets},
                'evidence': {'e1': {'ref': evidence['ref'], 'text': text}},
                'claims': {'old_budget': {'claim_ref': 'claim-previous', 'revision': 4,
                                          'subject_ref': 'project-atlas', 'predicate': 'budget'}},
                'owners': {'assistant': 'main-composer', 'runtime': 'application'},
                'steps': {}, 'preconditions': {}}
    return findings, context, bindings, schemas


class AnalyzerFindingsTests(unittest.TestCase):
    def setUp(self): self.findings, self.context, self.bindings, self.schemas = fixture()
    def bind(self): return bind_findings(self.findings, self.context, self.bindings, self.schemas)
    def reject(self, reason):
        with self.assertRaisesRegex(FindingsRejected, reason): self.bind()

    def existing_step(self, handle, ref, dependencies=None):
        self.bindings['steps'][handle] = ref
        self.context['next_steps']['steps'].append({
            'step_ref': ref, 'title': 'Existing task step', 'kind': 'question',
            'status': 'proposed', 'owner_ref': 'main-composer', 'dependency_refs': dependencies or [],
            'precondition_refs': [], 'required_confirmation_refs': [],
            'evidence_or_receipt_refs': [], 'blocking_reason_refs': []})

    def test_full_result_binds_one_atomic_delta_without_mutating_inputs(self):
        before = copy.deepcopy((self.findings, self.context, self.bindings, self.schemas))
        delta = self.bind()
        self.assertEqual(validate_contract('StateDelta', delta), [])
        self.assertEqual(len(delta['groups']), 1)
        operations = delta['groups'][0]['operations']
        self.assertEqual([o['op'] for o in operations], ['propose_claim', 'change_policy_data', 'change_policy_data', 'propose_plan_change'])
        self.assertEqual(operations[0]['claim']['subject_ref'], 'project-atlas')
        self.assertEqual(operations[1]['expected_field_revision'], 3)
        self.assertEqual(operations[-1]['add_steps'][1]['dependency_refs'], ['finding-step/ask'])
        self.assertEqual(delta['base_revision'], 7)
        self.assertTrue(all('status' not in s for s in operations[-1]['add_steps']))
        self.assertEqual(before, (self.findings, self.context, self.bindings, self.schemas))
        self.assertEqual(delta, self.bind())

    def test_no_change_produces_empty_delta_and_no_plan(self):
        self.findings.update(claims=[], intent=None, gaps=[], plan=None)
        self.assertEqual(self.bind()['groups'], [])

    def test_claim_only_does_not_manufacture_plan_or_dispatch(self):
        self.findings.update(intent=None, gaps=[], plan=None)
        self.assertEqual([o['op'] for o in self.bind()['groups'][0]['operations']], ['propose_claim'])

    def test_correction_restores_specific_claim_revision(self):
        self.findings['claims'][0]['supersedes_ref'] = 'old_budget'
        op = self.bind()['groups'][0]['operations'][0]
        self.assertEqual((op['op'], op['claim_ref'], op['expected_claim_revision']), ('supersede_claim', 'claim-previous', 4))

    def test_correction_cannot_change_subject(self):
        self.findings['claims'][0]['supersedes_ref'] = 'old_budget'
        self.bindings['claims']['old_budget']['subject_ref'] = 'another-project'
        self.reject('subject or predicate')

    def test_runtime_and_authority_fields_are_rejected(self):
        for key in ['base_revision', 'authorized', 'groups', 'checkpoint_id']:
            with self.subTest(key=key):
                self.findings[key] = 1
                self.reject('unknown field')
                del self.findings[key]
        self.findings['plan']['add_steps'][0]['status'] = 'completed'
        self.reject('union branch')

    def test_unknown_references_in_each_semantic_section(self):
        original = copy.deepcopy(self.findings)
        for section, key in [('claims', 'subject_ref'), ('claims', 'predicate'), ('gaps', 'target_ref')]:
            self.findings = copy.deepcopy(original)
            self.findings[section][0][key] = 'invented'
            self.reject('unknown')
        self.findings = original
        self.findings['plan']['add_steps'][0]['owner_ref'] = 'invented'
        self.reject('unknown owners')

    def test_out_of_context_or_altered_evidence_is_rejected(self):
        self.bindings['evidence']['e1']['text'] = 'different source'
        self.reject('unissued evidence')
        self.bindings['evidence']['e1']['ref'] = 'another-tenant/source'
        self.reject('unissued evidence')

    def test_quote_presence_does_not_prove_value_entailment(self):
        self.findings['claims'][0]['value']['amount_minor'] = 900000
        self.assertEqual(self.bind()['groups'][0]['operations'][0]['claim']['value']['amount_minor'], 900000)
        self.findings['claims'][0]['literal_quote'] = 'a quotation never issued'
        self.reject('quote outside')

    def test_target_value_and_operation_rules_are_enforced(self):
        self.findings['claims'][0]['value']['currency'] = 'EUR'
        self.reject('constant')
        self.findings['claims'][0]['value']['currency'] = 'USD'
        self.context['output_contract']['allowed_operations'].remove('propose_claim')
        self.reject('operation not allowed')

    def test_stale_binding_and_invocation_budget_rejected(self):
        self.context['base_revision'] += 1
        self.reject('context mismatch')
        self.context['base_revision'] -= 1
        self.context['output_contract']['max_operations'] = 1
        self.reject('invocation budget')

    def test_conflicting_fields_do_not_become_order_dependent_writes(self):
        self.bindings['fields']['budget_confirmation'] = self.bindings['fields']['requested_outcome']
        self.reject('conflicting field')

    def test_plan_cycles_unknown_dependencies_and_preconditions_rejected(self):
        step = self.findings['plan']['add_steps'][0]
        step['dependency_refs'] = ['wait']
        self.reject('cycle')
        step['dependency_refs'] = ['invented']
        self.reject('unknown steps')
        step['dependency_refs'] = []
        step['precondition_refs'] = ['invented']
        self.reject('unknown preconditions')

    def test_duplicate_claims_steps_and_empty_plan_rejected(self):
        self.findings['claims'] *= 2
        self.reject('duplicate local claim')
        self.findings['claims'] = self.findings['claims'][:1]
        self.findings['plan']['add_steps'] *= 2
        self.reject('duplicate local step')
        self.findings['plan']['add_steps'] = []
        self.reject('empty plan')

    def test_cancellation_preserves_live_dependency_rule(self):
        self.existing_step('old', 'step-old')
        self.existing_step('dependent', 'step-dependent', ['step-old'])
        self.findings['plan']['cancel_step_refs'] = ['old']
        self.reject('live dependent')
        self.findings['plan']['cancel_step_refs'].append('dependent')
        self.assertEqual(self.bind()['groups'][0]['operations'][-1]['cancel_step_refs'], ['step-old', 'step-dependent'])

    def test_supersession_binds_old_step_and_new_local_replacement(self):
        self.existing_step('old', 'step-old')
        self.findings['plan']['supersede_steps'] = [{'step_ref': 'old', 'replacement_local_ref': 'ask'}]
        self.assertEqual(self.bind()['groups'][0]['operations'][-1]['supersede_steps'],
                         [{'step_ref': 'step-old', 'replacement_local_ref': 'finding-step/ask'}])

    def test_competing_claims_remain_separate_proposals(self):
        alternative = copy.deepcopy(self.findings['claims'][0])
        alternative.update(local_ref='alternative_budget', support='inferred')
        alternative['value']['amount_minor'] = 700000
        self.findings['claims'].append(alternative)
        operations = self.bind()['groups'][0]['operations']
        self.assertEqual([o['op'] for o in operations[:2]], ['propose_claim', 'propose_claim'])
        self.assertEqual([o['claim']['support'] for o in operations[:2]], ['reported', 'inferred'])

    def test_bound_claim_reaches_sqlite_context_without_approval_and_unsupported_group_rolls_back(self):
        from selective_memory import ProjectMemory, Rejected
        seed = json.loads((ROOT/'assets/selective-memory/seed-and-proposals.json').read_text())['seed']
        source = seed['sources'][0]
        source['id'] = self.bindings['evidence']['e1']['ref']
        source['text'] = self.bindings['evidence']['e1']['text']
        self.bindings['subjects']['project'] = 'project-a'
        self.context['base_revision'] = self.bindings['base_revision'] = 0
        store = ProjectMemory()
        self.addCleanup(store.close)
        store.seed(seed)
        operations = self.bind()['groups'][0]['operations']
        with self.assertRaises(Rejected):
            store.apply_group('workspace-a', 'project-a', 0, 'unsupported-full-result', operations)
        self.assertEqual(store.revision('workspace-a'), 0)
        self.assertEqual(store.issue_context('workspace-a', 'project-a')['sections']['claims'], [])
        self.findings.update(intent=None, gaps=[], plan=None)
        operations = self.bind()['groups'][0]['operations']
        receipt = store.apply_group('workspace-a', 'project-a', 0, 'claim-only', operations)
        self.assertEqual(store.apply_group('workspace-a', 'project-a', 0, 'claim-only', operations), receipt)
        sections = store.issue_context('workspace-a', 'project-a')['sections']
        self.assertEqual(sections['claims'][0]['value']['amount_minor'], 500000)
        self.assertEqual(sections['claims'][0]['support'], 'reported')
        self.assertIsNone(sections['domain_state']['approved_budget'])

    def test_parsing_rejects_duplicate_keys_nonfinite_extra_documents_and_depth(self):
        for text in ['{"x":1,"x":2}', '{"x":NaN}', '{} {}', '['*30+'0'+']'*30,
                     '{"x":9007199254740992}', 'x'*65537]:
            with self.subTest(text=text[:40]), self.assertRaises(FindingsRejected): parse_findings(text)
        self.assertEqual(parse_findings(json.dumps(self.findings)), self.findings)

    def test_model_schema_closure_excludes_runtime_contracts(self):
        schema = analyzer_findings_schema()
        self.assertNotIn('StateDelta', schema['$defs'])
        self.assertNotIn('base_revision', json.dumps(schema))
        self.assertIn('PlanStepProposal', schema['$defs'])

    def test_cli_converts_prepared_files(self):
        with tempfile.TemporaryDirectory() as directory:
            args = []
            for name, value in [('input', self.findings), ('context', self.context), ('bindings', self.bindings), ('value-schemas', self.schemas)]:
                path = Path(directory)/(name+'.json')
                path.write_text(json.dumps(value))
                args += ['--'+name, str(path)]
            run = subprocess.run(['python3', str(ROOT/'scripts/analyzer_findings.py'), *args], capture_output=True, text=True, check=True)
            self.assertEqual(json.loads(run.stdout), self.bind())


if __name__ == '__main__': unittest.main()
