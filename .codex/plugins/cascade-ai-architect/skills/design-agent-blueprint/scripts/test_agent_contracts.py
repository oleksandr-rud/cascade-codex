#!/usr/bin/env python3
"""Regression tests for the public reference wire contracts and cross-contract gates."""
import copy
import json
import unittest
from validate_agent_contracts import (ROOT, SCHEMA, KEYWORDS, check, validate_contract,
                                      validate_delta, validate_fixture, validate_projection,
                                      validate_receipt)

FIXTURE=json.loads((ROOT/'assets/state-delta-policy-projection.example.json').read_text())

class AgentContractsTests(unittest.TestCase):
    def setUp(self): self.data=copy.deepcopy(FIXTURE)
    def case(self,name): return next(c for c in self.data['delta_cases'] if c['name']==name)
    def context_case(self,name): return next(c['value'] for c in self.data['contract_cases'] if c['name']==name)
    def reject(self,errors,term): self.assertTrue(any(term in e for e in errors),errors)
    def delta_errors(self): return validate_delta(self.data['analyzer_delta'],self.data['analyzer_context'],self.data['value_schemas'])
    def test_packaged_fixture_and_lifecycle_cases(self): self.assertEqual(validate_fixture(self.data),[])
    def test_all_schema_keywords_supported_and_references_resolve(self):
        def walk(rule):
            self.assertFalse(set(rule)-KEYWORDS)
            if '$ref' in rule:self.assertIn(rule['$ref'].split('/')[-1],SCHEMA['$defs'])
            for child in rule.get('properties',{}).values():walk(child)
            for child in rule.get('oneOf',[]):walk(child)
            if isinstance(rule.get('additionalProperties'),dict):walk(rule['additionalProperties'])
            if 'items' in rule:walk(rule['items'])
        for rule in SCHEMA['$defs'].values():walk(rule)
    def test_unknown_schema_keyword_fails_closed(self): self.reject(check('x',{'madeUp':True}),'unsupported')
    def test_unknown_operation_rejected(self):
        self.data['analyzer_delta']['groups'][0]['operations'][0]['op']='replace_state'
        self.reject(self.delta_errors(),'union branch')
    def test_unknown_envelope_property_rejected(self):
        self.data['analyzer_delta']['authorization']='admin'
        self.reject(self.delta_errors(),'unknown field')
    def test_unregistered_evidence_rejected(self):
        self.data['analyzer_delta']['groups'][0]['operations'][0]['evidence_refs']=['invented-proof']
        self.reject(self.delta_errors(),'unregistered evidence')
    def test_idempotency_binding_cannot_change(self):
        self.data['analyzer_delta']['idempotency_key']='model-selected-key'
        self.reject(self.delta_errors(),'idempotency_key')
    def test_inline_field_schema_must_match_registry(self):
        self.data['analyzer_context']['writable_targets'][0]['value_schema']={'type':'number'}
        self.reject(self.delta_errors(),'value schema registry')
    def test_identity_dependency_digest_must_match(self):
        self.data['analyzer_context']['identity']['agent_identity']['binding']['digest']='sha256:'+'0'*64
        self.reject(self.delta_errors(),'dependency binding')
    def test_old_wire_version_rejected(self):
        self.data['analyzer_delta']['schema_version']='state-delta.v2'
        self.reject(self.delta_errors(),'constant')
    def test_stale_base_revision(self):
        self.data['analyzer_delta']['base_revision']=1
        self.reject(self.delta_errors(),'base_revision')
    def test_stale_field_revision(self):
        self.data['analyzer_delta']['groups'][0]['operations'][0]['expected_field_revision']=1
        self.reject(self.delta_errors(),'stale field')
    def test_unregistered_policy_target(self):
        self.data['analyzer_delta']['groups'][0]['operations'][0]['policy_id']='permission-policy'
        self.reject(self.delta_errors(),'unregistered writable')
    def test_field_value_schema_enforced(self):
        self.data['analyzer_delta']['groups'][0]['operations'][0]['change']['value']=55
        self.reject(self.delta_errors(),'expected string')
    def test_duplicate_operation_identity(self):
        delta=self.data['analyzer_delta'];delta['groups'][1]['operations'][0]['op_id']=delta['groups'][0]['operations'][0]['op_id']
        self.reject(self.delta_errors(),'duplicate identity')
    def test_group_cycle_rejected(self):
        g=self.data['analyzer_delta']['groups'];g[0]['depends_on']=[g[1]['group_id']];g[1]['depends_on']=[g[0]['group_id']]
        self.reject(self.delta_errors(),'cycle')
    def test_unregistered_selection_policy(self):
        c=self.case('multi-part-admitted-selection-witness');c['delta']['blocks'][0]['parts'][0]['selection_policy_ref']='always-accept@1'
        self.reject(validate_delta(c['delta'],c['context'],self.data['value_schemas']),'selection contract')
    def test_multiple_parts_can_select_independently(self):
        c=self.case('multi-part-admitted-selection-witness');self.assertEqual(validate_receipt(c['delta'],c['receipt']),[])
        self.assertEqual(len(c['receipt']['group_outcomes']),2)
    def test_scalar_alternatives_cannot_both_apply(self):
        c=self.case('multi-part-admitted-selection-witness');part=c['delta']['blocks'][0]['parts'][0]
        c['receipt']['selection_outcomes'][0]['selected_candidate_refs']=[v['candidate_id'] for v in part['candidates']]
        g=part['candidates'][1]['groups'][0];c['receipt']['group_outcomes'].append(dict(group_id=g['group_id'],status='applied',operation_refs=[g['operations'][0]['op_id']],reason_refs=[]))
        errors=validate_receipt(c['delta'],c['receipt']);self.reject(errors,'cardinality');self.reject(errors,'conflicting scalar')
    def test_candidate_is_atomic_across_groups(self):
        c=self.case('multi-part-admitted-selection-witness');candidate=c['delta']['blocks'][0]['parts'][0]['candidates'][0]
        extra=copy.deepcopy(candidate['groups'][0]);extra['group_id']='second-group';extra['operations'][0]['op_id']='second-op';candidate['groups'].append(extra)
        c['receipt']['group_outcomes'].append(dict(group_id='second-group',status='rejected',operation_refs=['second-op'],reason_refs=['denied']))
        self.reject(validate_receipt(c['delta'],c['receipt']),'candidate atomicity')
    def test_two_groups_have_only_one_revision_increment(self):
        receipt=self.data['applied_change_set'];receipt['after_revision']=2
        self.reject(validate_receipt(self.data['analyzer_delta'],receipt),'exactly once')
    def test_independent_denial_preserves_other_group_in_one_commit(self):
        receipt=self.data['applied_change_set'];receipt['status']='PARTIAL'
        receipt['group_outcomes'][0]['status']='rejected'
        receipt['group_outcomes'][0]['reason_refs']=['denied-name-change']
        receipt['record_changes']=receipt['record_changes'][1:]
        self.assertEqual(validate_receipt(self.data['analyzer_delta'],receipt),[])
    def test_dependent_cannot_apply_after_rejected_predecessor(self):
        delta=self.data['analyzer_delta'];delta['groups'][1]['depends_on']=[delta['groups'][0]['group_id']]
        receipt=self.data['applied_change_set'];receipt['status']='PARTIAL';receipt['group_outcomes'][0]['status']='rejected'
        self.reject(validate_receipt(delta,receipt),'without predecessor')
    def test_rejected_receipt_cannot_publish_changes(self):
        self.data['applied_change_set']['status']='REJECTED'
        self.reject(validate_contract('AppliedChangeSet',self.data['applied_change_set']),'cannot commit')
    def test_deferred_candidates_require_choice_record(self):
        c=self.case('multi-part-deferred-choices');del c['receipt']['selection_outcomes'][0]['choice_ref']
        self.reject(validate_receipt(c['delta'],c['receipt']),'durable choice')
    def test_old_projection_paths_rejected(self):
        self.data['projection_policy']['rules'][0]['destination']='addressing.preferred_name'
        self.reject(validate_projection(self.data['projection_policy'],self.data['composer_context']),'unknown projection destination')
    def test_researcher_receives_bounded_request_projection(self):
        c=self.data['projection_cases'][0]
        self.assertEqual(validate_projection(c['policy'],c['context']),[])
    def test_voice_receives_canonical_delivery_projection(self):
        c=self.data['projection_cases'][1]
        self.assertEqual(validate_projection(c['policy'],c['context']),[])
    def test_unregistered_role_cannot_define_own_contract(self):
        p=self.data['projection_policy'];p['role_id']='arbitrary-role'
        self.reject(validate_projection(p,self.data['composer_context']),'unregistered role')
    def test_voice_cannot_request_uncontracted_history(self):
        c=self.data['projection_cases'][1];c['policy']['history_mode']='recent_window'
        self.reject(validate_projection(c['policy'],c['context']),'no history projection')
    def test_current_open_turn_requires_explicit_projection(self):
        self.data['projection_policy']['include_current_event']=False
        self.reject(validate_projection(self.data['projection_policy'],self.data['composer_context']),'current event')
    def test_twenty_turn_limit(self):
        c=self.data['composer_context']['continuity'];c['window']['turn_limit']=21
        self.reject(validate_contract('ContinuityContext',c),'maximum')
    def test_old_task_summary_not_mislabeled_recent(self):
        c=self.data['composer_context']['continuity'];c['recent_memory']=self.context_case('older-task-and-durable-memory')['task_summary']
        self.reject(validate_contract('ContinuityContext',c),'outside selected window')
    def test_stale_memory_cannot_leak_summary(self):
        m=self.context_case('older-task-and-durable-memory')['task_summary'];m['status']='stale'
        self.reject(validate_contract('MemorySlice',m),'withhold')
    def test_voice_repeat_does_not_erase_interruption(self):
        c=self.context_case('voice-interrupt-and-repeat');self.assertEqual(validate_contract('ContinuityContext',c),[])
        attempts=c['formatted_history'][0]['messages'][1]['delivery_attempts']
        self.assertEqual([a['status'] for a in attempts],['delivered','interrupted','delivered'])
    def test_delivered_without_receipt_rejected(self):
        c=self.context_case('voice-interrupt-and-repeat');c['formatted_history'][0]['messages'][1]['delivery_attempts'][2]['receipt_refs']=[]
        self.reject(validate_contract('ContinuityContext',c),'delivered requires')
    def test_missing_speaker_rejected(self):
        c=self.data['composer_context']['continuity'];del c['formatted_history'][0]['messages'][0]['speaker_ref']
        self.reject(validate_contract('ContinuityContext',c),'speaker_ref')
    def test_agent_identity_is_required_independently_of_user_profile(self):
        c=self.data['analyzer_context'];del c['identity']['agent_identity']
        self.reject(validate_contract('AnalyzerContext',c),'agent_identity')
    def test_introduction_can_be_policy_triggered(self):
        identity=self.context_case('policy-triggered-introduction');self.assertEqual(validate_contract('IdentityContext',identity),[])
        self.assertEqual(identity['mode'],'introduction')
    def test_stale_choice_cannot_resolve(self):
        c=self.case('resolve-presented-choice');c['context']['unresolved_choices'][0]['revision']=2
        self.reject(validate_delta(c['delta'],c['context'],self.data['value_schemas']),'choice missing, stale')
    def test_choice_bound_to_exact_presentation(self):
        c=self.case('resolve-presented-choice');c['delta']['groups'][0]['operations'][0]['presentation_response_ref']='other-question'
        self.reject(validate_delta(c['delta'],c['context'],self.data['value_schemas']),'presented candidates')
    def test_stale_plan_rejected(self):
        c=self.case('propose-explanation-step');c['delta']['groups'][0]['operations'][0]['expected_plan_revision']=0
        self.reject(validate_delta(c['delta'],c['context'],self.data['value_schemas']),'stale or wrong plan')
    def test_model_cannot_authorize_plan_step(self):
        c=self.case('propose-explanation-step');c['delta']['groups'][0]['operations'][0]['add_steps'][0]['status']='authorized'
        self.reject(validate_delta(c['delta'],c['context'],self.data['value_schemas']),'union branch')
    def test_plan_cycle_rejected(self):
        c=self.case('propose-explanation-step');step=c['delta']['groups'][0]['operations'][0]['add_steps'][0];step['dependency_refs']=[step['local_ref']]
        self.reject(validate_delta(c['delta'],c['context'],self.data['value_schemas']),'cycle')
    def test_cancel_step_cannot_leave_live_dependent(self):
        c=self.case('propose-explanation-step');c['delta']['groups'][0]['operations'][0]['cancel_step_refs']=['wait-task']
        self.reject(validate_delta(c['delta'],c['context'],self.data['value_schemas']),'live dependent')
    def test_completion_needs_receipt(self):
        p=self.context_case('question-and-wait-plan');p['steps'][0]['evidence_or_receipt_refs']=[]
        self.reject(validate_contract('NextStepContext',p),'requires evidence')
    def test_composer_cannot_receive_incomplete_plan(self):
        c=self.data['composer_context'];c['next_steps']['completeness']='partial'
        self.reject(validate_contract('ComposerContext',c),'complete projection')

if __name__=='__main__':unittest.main(verbosity=2)
