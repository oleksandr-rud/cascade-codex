#!/usr/bin/env python3
"""Offline reference-contract validation. No policy execution or persistence.

Supports only the JSON Schema keywords used by the packaged bundle; unknown
keywords fail closed. Target runtimes should use a full Draft 2020-12 validator.
"""
import argparse
import json
import math
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCHEMA = json.loads((ROOT / 'references/agent-contracts.schema.json').read_text())
ROLE_CONTRACTS = {'analyzer':'AnalyzerContext', 'main-composer':'ComposerContext',
                  'researcher':'ResearchRequest', 'voice-composer':'VoiceContext'}
KEYWORDS = {'$ref', 'oneOf', 'type', 'const', 'enum', 'minimum', 'maximum',
            'minLength', 'maxLength', 'pattern', 'items', 'minItems', 'maxItems',
            'properties', 'required', 'additionalProperties', 'maxProperties'}


def check(value, rule, path='$'):
    errors = []
    unknown = set(rule) - KEYWORDS
    if unknown:
        return [f'{path}: unsupported schema keywords {sorted(unknown)}']
    if '$ref' in rule:
        prefix = '#/$defs/'
        name = rule['$ref'].removeprefix(prefix)
        if not rule['$ref'].startswith(prefix) or name not in SCHEMA['$defs']:
            return [f'{path}: unresolved schema reference']
        return check(value, SCHEMA['$defs'][name], path)
    if 'oneOf' in rule:
        matches = sum(not check(value, branch, path) for branch in rule['oneOf'])
        return [] if matches == 1 else [f'{path}: expected exactly one union branch; matched {matches}']
    types = {'object': isinstance(value, dict), 'array': isinstance(value, list),
             'string': isinstance(value, str), 'integer': type(value) is int,
             'number': type(value) in (int, float) and math.isfinite(value),
             'boolean': type(value) is bool, 'null': value is None}
    if 'type' in rule and not types.get(rule['type'], False):
        return [f'{path}: expected {rule["type"]}']
    if 'const' in rule and (type(value) is not type(rule['const']) or value != rule['const']):
        errors.append(f'{path}: wrong constant')
    if 'enum' in rule and value not in rule['enum']:
        errors.append(f'{path}: invalid enum')
    if type(value) in (int, float):
        if not math.isfinite(value):
            errors.append(f'{path}: nonfinite number')
        for key, fails in [('minimum', lambda x: value < x), ('maximum', lambda x: value > x)]:
            if key in rule and fails(rule[key]): errors.append(f'{path}: violates {key}')
    if isinstance(value, str):
        if len(value) < rule.get('minLength', 0) or len(value) > rule.get('maxLength', float('inf')):
            errors.append(f'{path}: string length')
        if 'pattern' in rule and not re.search(rule['pattern'], value): errors.append(f'{path}: pattern')
    if isinstance(value, list):
        if len(value) < rule.get('minItems', 0) or len(value) > rule.get('maxItems', float('inf')):
            errors.append(f'{path}: array size')
        for i, item in enumerate(value): errors += check(item, rule.get('items', {}), f'{path}[{i}]')
    if isinstance(value, dict):
        props = rule.get('properties', {})
        for k in rule.get('required', []):
            if k not in value: errors.append(f'{path}.{k}: required')
        if len(value) > rule.get('maxProperties', float('inf')): errors.append(f'{path}: object size')
        for k, item in value.items():
            child = props.get(k, rule.get('additionalProperties', True))
            if child is False: errors.append(f'{path}.{k}: unknown field')
            elif isinstance(child, dict): errors += check(item, child, f'{path}.{k}')
    return errors


def unique(values, label):
    return [] if len(values) == len(set(values)) else [f'{label}: duplicate identity']


def acyclic(nodes, dependencies, label):
    visiting, visited, errors = set(), set(), []
    def visit(node):
        if node in visiting:
            errors.append(f'{label}: dependency cycle'); return
        if node in visited: return
        visiting.add(node)
        for dep in dependencies(node):
            if dep not in nodes: errors.append(f'{label}: missing dependency {dep}')
            else: visit(dep)
        visiting.remove(node); visited.add(node)
    for node in nodes: visit(node)
    return errors


def all_groups(delta):
    groups = list(delta['groups'])
    for block in delta['blocks']:
        for part in block['parts']:
            for candidate in part['candidates']: groups += candidate['groups']
    return groups


def validate_contract(name, value):
    if name not in SCHEMA['$defs']: return [f'unknown contract {name}']
    errors = check(value, SCHEMA['$defs'][name])
    if errors: return errors
    if name == 'StateDelta':
        groups = all_groups(value)
        errors += unique([g['group_id'] for g in groups], 'groups')
        errors += unique([op['op_id'] for g in groups for op in g['operations']], 'operations')
        errors += unique([b['block_id'] for b in value['blocks']], 'blocks')
        errors += acyclic({g['group_id']: g for g in groups},
                          lambda n: next(g['depends_on'] for g in groups if g['group_id'] == n), 'groups')
        for block in value['blocks']:
            errors += unique([p['part_id'] for p in block['parts']], 'parts')
            for part in block['parts']: errors += unique([c['candidate_id'] for c in part['candidates']], 'candidates')
    if name in ('AnalyzerContext', 'ComposerContext'):
        errors += validate_contract('ContinuityContext', value['continuity'])
        errors += validate_contract('MemoryContext', value['memory'])
        errors += validate_contract('NextStepContext', value['next_steps'])
        if name == 'ComposerContext' and value['next_steps']['completeness'] != 'complete_for_authorized_task_projection':
            errors.append('composer next steps require complete projection')
        if name == 'ComposerContext':
            continuity = value['continuity']
            if not continuity['window']['includes_current_event'] or not continuity['formatted_history'] or continuity['formatted_history'][-1]['turn_ref'] != value['identity']['turn_ref']:
                errors.append('composer requires current user turn')
        dependencies = {(d['binding']['ref'],d['binding']['digest']) for d in value['source_dependencies']}
        required_bindings = [value['identity']['agent_identity']['binding'],value['policy']['projection_binding']] + value['policy']['definition_bindings'] + value['policy']['evaluation_bindings']
        if any((b['ref'],b['digest']) not in dependencies for b in required_bindings): errors.append('missing or mismatched context dependency binding')
        for choice in value['unresolved_choices']: errors += validate_contract('UnresolvedChoice', choice)
        if value['identity']['mode'] in ('identity_answer','introduction','capability_disclosure') and not value['identity']['requested_identity_subject_refs']:
            errors.append('expanded identity requires subject')
    if name == 'MemorySlice':
        if value['status'] == 'available':
            if not {'binding','summary','coverage_through_checkpoint'} <= value.keys() or not value['source_turn_refs']:
                errors.append('available memory requires content and coverage')
        elif any(k in value for k in ('binding','summary','coverage_through_checkpoint')) or any(value[k] for k in ('source_turn_refs','fact_refs','decision_refs','preference_refs','unresolved_question_refs')):
            errors.append('unavailable memory must withhold content')
    if name == 'MemoryContext': errors += validate_contract('MemorySlice', value['task_summary'])
    if name == 'ContinuityContext':
        turns = value['formatted_history']; window = value['window']; memory = value['recent_memory']
        errors += validate_contract('MemorySlice', memory)
        errors += unique([t['turn_ref'] for t in turns], 'turns')
        if len(turns) > window['turn_limit']: errors.append('history exceeds selected turn limit')
        if not set(memory['source_turn_refs']) <= {t['turn_ref'] for t in turns}: errors.append('recent memory outside selected window')
        if turns and (window.get('first_turn_ref') != turns[0]['turn_ref'] or window.get('last_turn_ref') != turns[-1]['turn_ref']):
            errors.append('history window endpoints mismatch')
        for i, turn in enumerate(turns):
            if turn['status'] == 'open' and (not window['includes_current_event'] or i != len(turns)-1):
                errors.append('open turn must be current and last')
            for msg in turn['messages']:
                if msg['role'] == 'assistant' and not {'response_revision','commit_status'} <= msg.keys(): errors.append('assistant message requires canonical revision')
                errors += unique([a['attempt_id'] for a in msg['delivery_attempts']], 'delivery attempts')
                for attempt in msg['delivery_attempts']:
                    if attempt['status'] == 'delivered' and not attempt['receipt_refs']: errors.append('delivered requires receipt')
    if name == 'NextStepContext':
        steps = {s['step_ref']:s for s in value['steps']}
        errors += unique([s['step_ref'] for s in value['steps']], 'steps')
        errors += acyclic(steps, lambda n: steps[n]['dependency_refs'], 'steps')
        if 'current_step_ref' in value and value['current_step_ref'] not in steps: errors.append('unknown current step')
        for step in steps.values():
            if step['status'] == 'completed' and not step['evidence_or_receipt_refs']: errors.append('completed step requires evidence')
            if step['status'] == 'superseded' and step.get('superseded_by') not in steps: errors.append('superseded step requires replacement')
    if name == 'UnresolvedChoice':
        candidates = set(value['candidate_refs'])
        errors += unique(value['candidate_refs'], 'choice candidates')
        if {o['candidate_ref'] for o in value['candidate_options']} != candidates or len(value['candidate_options']) != len(candidates): errors.append('choice option labels mismatch')
        if not set(value['selected_candidate_refs'] + value['presented_candidate_refs']) <= candidates: errors.append('choice references unknown candidate')
        if value['status'] == 'resolved' and not value['selected_candidate_refs']: errors.append('resolved choice requires selection')
        if value['status'] != 'resolved' and value['selected_candidate_refs']: errors.append('unresolved choice cannot carry selection')
    if name == 'AppliedChangeSet':
        increment = 1 if value['semantic_changed'] else 0
        if value['after_revision'] != value['before_revision'] + increment: errors.append('transaction must advance revision exactly once or zero')
        if value['status'] in ('NOOP','REJECTED') and (value['semantic_changed'] or value['record_changes'] or value['dispatch_intent_refs']):
            errors.append('noop/rejected receipt cannot commit effects')
        if value['status'] == 'REJECTED' and any(g['status'] == 'applied' for g in value['group_outcomes']): errors.append('rejected receipt cannot apply groups')
    return errors


def validate_delta(delta, context, value_schemas):
    errors = validate_contract('StateDelta', delta) + validate_contract('AnalyzerContext', context)
    if errors: return errors
    for field, expected in [('input_context_id',context['context_id']),('base_revision',context['base_revision']),('event_id',context['event']['event_id']),('turn_id',context['event']['turn_id']),('checkpoint_id',context['checkpoint_id']),('idempotency_key',context['idempotency_key'])]:
        if delta[field] != expected: errors.append(f'delta {field}: context mismatch')
    limits = context['output_contract']; groups = all_groups(delta)
    if len(groups) > limits['max_groups'] or len(delta['blocks']) > limits['max_blocks'] or sum(len(g['operations']) for g in groups) > limits['max_operations']:
        errors.append('delta exceeds invocation budget')
    targets = {(t['policy_id'],t['instance_id'],t['field_id']):t for t in context['writable_targets']}
    blocks = {b['block_id']:b for b in context['block_contracts']}
    for b in delta['blocks']:
        contract = blocks.get(b['block_id'])
        if not contract or b['block_type'] != contract['block_type']:
            errors.append('unregistered analysis block'); continue
        if len(b['parts']) > limits['max_parts_per_block']: errors.append('part budget')
        parts = {p['part_id']:p for p in contract['parts']}
        for p in b['parts']:
            cp = parts.get(p['part_id'])
            if not cp: errors.append('unregistered part'); continue
            if any(p[k] != cp[k] for k in ('selection_mode','selection_policy_ref')): errors.append('selection contract mismatch')
            if len(p['candidates']) > min(cp['max_candidates'],limits['max_candidates_per_part']): errors.append('candidate budget')
            feature_schema = value_schemas.get(cp['feature_schema_ref'])
            if feature_schema is None: errors.append('missing feature schema')
            else:
                if cp['feature_schema'] != feature_schema: errors.append('feature schema registry mismatch')
                for c in p['candidates']: errors += check(c['selection_features'], feature_schema)
    choices = {c['choice_ref']:c for c in context['unresolved_choices']}
    evidence = {e['ref'] for e in context['evidence_catalog']}
    for g in groups:
        for op in g['operations']:
            if op['op'] not in limits['allowed_operations']: errors.append('operation not allowed')
            cited = list(op.get('evidence_refs', []))
            for key in ('claim','replacement'):
                if key in op: cited += op[key]['evidence_refs']
            for step in op.get('add_steps', []): cited += step['evidence_refs']
            if not set(cited) <= evidence: errors.append('unregistered evidence reference')
            if op['op'] == 'change_policy_data':
                target = targets.get((op['policy_id'],op['instance_id'],op['field_id']))
                if not target: errors.append('unregistered writable target'); continue
                if op['expected_field_revision'] != target['field_revision']: errors.append('stale field revision')
                if op['change']['kind'] not in target['allowed_changes'] or op['support'] not in target['allowed_support']: errors.append('field change not permitted')
                schema = value_schemas.get(target['value_schema_ref'])
                if schema is None: errors.append('missing value schema')
                else:
                    if target['value_schema'] != schema: errors.append('value schema registry mismatch')
                    if 'value' in op['change']: errors += check(op['change']['value'], schema)
            if op['op'] == 'resolve_choice':
                c = choices.get(op['choice_ref'])
                if not c or c['status'] != 'pending' or c['revision'] != op['expected_choice_revision']:
                    errors.append('choice missing, stale or terminal')
                elif op['presentation_response_ref'] != c.get('presentation_response_ref') or not set(op['selected_candidate_refs']) <= set(c['presented_candidate_refs']):
                    errors.append('choice not bound to presented candidates')
            if op['op'] == 'propose_plan_change':
                plan = context['next_steps']
                if op['task_ref'] != plan['task_ref'] or op['expected_plan_revision'] != plan['plan_revision']: errors.append('stale or wrong plan')
                existing = {s['step_ref']:s for s in plan['steps']}
                added = {s['local_ref']:s for s in op['add_steps']}
                errors += unique([s['local_ref'] for s in op['add_steps']], 'proposed steps')
                if set(existing) & set(added): errors.append('proposal cannot allocate existing step identity')
                combined = {**existing, **added}
                errors += acyclic(combined, lambda n: combined[n]['dependency_refs'], 'proposed plan')
                if not set(op['cancel_step_refs']) <= set(existing): errors.append('unknown cancelled step')
                for change in op['supersede_steps']:
                    if change['step_ref'] not in existing or change['replacement_local_ref'] not in added:
                        errors.append('unknown supersession binding')
                removed = set(op['cancel_step_refs']) | {s['step_ref'] for s in op['supersede_steps']}
                for sid, step in combined.items():
                    if sid not in removed and step.get('status') not in ('completed','cancelled','superseded') and removed.intersection(step['dependency_refs']):
                        errors.append('plan leaves live dependent on withdrawn step')
            if op['op'] == 'propose_memory' and op['kind'] == 'replace_summary' and 'coverage_through_checkpoint' not in op:
                errors.append('summary replacement requires coverage')
    return errors


def validate_receipt(delta, receipt):
    """Check selection, candidate atomicity and one-commit receipt invariants.

    This checks a witness, not whether a database transaction actually occurred.
    """
    errors = validate_contract('StateDelta', delta) + validate_contract('AppliedChangeSet', receipt)
    if errors: return errors
    if receipt['before_revision'] != delta['base_revision'] or receipt['input_context_id'] != delta['input_context_id'] or receipt['event_id'] != delta['event_id']:
        errors.append('receipt input binding mismatch')
    selections = {(s['block_id'],s['part_id']):s for s in receipt['selection_outcomes']}
    errors += unique([(s['block_id'],s['part_id']) for s in receipt['selection_outcomes']], 'selection outcomes')
    selected_groups = list(delta['groups']); candidate_units = []; expected_parts = set()
    for block in delta['blocks']:
        for part in block['parts']:
            key = (block['block_id'],part['part_id']); expected_parts.add(key)
            selection = selections.get(key)
            if selection is None: errors.append('missing part decision'); continue
            candidates = {c['candidate_id']:c for c in part['candidates']}
            chosen = selection['selected_candidate_refs']; deferred = selection['deferred_candidate_refs']
            errors += unique(chosen + deferred, 'candidate outcomes')
            if not set(chosen + deferred) <= set(candidates): errors.append('unknown selected candidate'); continue
            if part['selection_mode'] != 'apply_all_eligible' and len(chosen) > 1: errors.append('selection cardinality')
            if deferred and 'choice_ref' not in selection: errors.append('deferred selection requires durable choice')
            if part['selection_mode'] == 'choose_exactly_one' and not chosen and 'choice_ref' not in selection: errors.append('required choice missing')
            for cid in chosen:
                selected_groups += candidates[cid]['groups']; candidate_units.append(candidates[cid]['groups'])
    if set(selections) - expected_parts: errors.append('unknown part decision')
    groups = {g['group_id']:g for g in selected_groups}
    outcomes = {g['group_id']:g for g in receipt['group_outcomes']}
    errors += unique([g['group_id'] for g in receipt['group_outcomes']], 'group outcomes')
    if set(outcomes) != set(groups): errors.append('receipt must cover precisely the compiled groups')
    success = {'applied','noop'}; writes = {}
    for gid, outcome in outcomes.items():
        if gid not in groups: continue
        group = groups[gid]
        if outcome['operation_refs'] != [op['op_id'] for op in group['operations']]: errors.append('operation receipt mismatch')
        if outcome['status'] not in success: continue
        if any(dep not in outcomes or outcomes[dep]['status'] not in success for dep in group['depends_on']): errors.append('applied dependent without predecessor')
        for op in group['operations']:
            if op['op'] == 'change_policy_data' and op['change']['kind'] in ('set','set_ref','clear'):
                slot = (op['policy_id'],op['instance_id'],op['field_id'])
                value = json.dumps(op['change'],sort_keys=True)
                if slot in writes and writes[slot] != value: errors.append('conflicting scalar writes applied')
                writes[slot] = value
    for unit in candidate_units:
        flags = [outcomes.get(g['group_id'],{}).get('status') in success for g in unit]
        if any(flags) and not all(flags): errors.append('candidate atomicity violated')
    return errors


def destination_schema(contract, path):
    rule = SCHEMA['$defs'][contract]
    for part in path.split('.'):
        while '$ref' in rule: rule = SCHEMA['$defs'][rule['$ref'].split('/')[-1]]
        if part not in rule.get('properties', {}): return None
        rule = rule['properties'][part]
    return rule


def read_path(value, path):
    for part in path.split('.'):
        if not isinstance(value, dict) or part not in value: raise KeyError(path)
        value = value[part]
    return value


def validate_projection(policy, context):
    # Logical fixture shape/relations only. Issuance and live access require the
    # schema-values-text@1 engine plus authoritative host callbacks; this helper
    # does not execute selector strings, count model tokens or authorize a task.
    errors = validate_contract('ProjectionPolicy', policy)
    if errors: return errors
    if ROLE_CONTRACTS.get(policy['role_id']) != policy['target_contract']:
        return ['unregistered role or mismatched input contract']
    errors += validate_contract(policy['target_contract'], context)
    if errors: return errors
    if 'role_id' in context and policy['role_id'] != context['role_id']: errors.append('projection role mismatch')
    if 'policy' in context and policy['binding'] != context['policy']['projection_binding']: errors.append('projection binding mismatch')
    for r in policy['rules']:
        rule = destination_schema(policy['target_contract'], r['destination'])
        if rule is None: errors.append('unknown projection destination: '+r['destination']); continue
        try: value = read_path(context, r['destination'])
        except KeyError:
            if r['required']: errors.append('missing required projection destination')
            continue
        errors += check(value, rule, r['destination'])
    if 'continuity' not in context:
        if policy['history_mode'] != 'none' or policy['include_current_event']: errors.append('role has no history projection')
        return errors
    continuity = context['continuity']
    if continuity['window']['includes_current_event'] != policy['include_current_event']: errors.append('current event projection mismatch')
    if continuity['window']['turn_limit'] > policy['max_turns']: errors.append('projection history limit')
    return errors


def validate_fixture(data):
    errors = validate_delta(data['analyzer_delta'], data['analyzer_context'], data['value_schemas'])
    errors += validate_projection(data['projection_policy'], data['composer_context'])
    errors += validate_receipt(data['analyzer_delta'], data['applied_change_set'])
    for case in data.get('projection_cases', []):
        errors += [case['name']+': '+e for e in validate_projection(case['policy'], case['context'])]
    for case in data.get('delta_cases', []):
        errors += [case['name']+': '+e for e in validate_delta(case['delta'],case['context'],data['value_schemas'])]
        if 'receipt' in case: errors += [case['name']+': '+e for e in validate_receipt(case['delta'],case['receipt'])]
    for case in data['contract_cases']:
        errors += [case['name']+': '+e for e in validate_contract(case['contract'], case['value'])]
    return errors


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('path', nargs='?', type=Path, default=ROOT/'assets/state-delta-policy-projection.example.json')
    parser.add_argument('--contract', choices=sorted(SCHEMA['$defs']))
    args = parser.parse_args(); data = json.loads(args.path.read_text())
    errors = validate_contract(args.contract, data) if args.contract else validate_fixture(data)
    for error in errors: print(error)
    print('agent_contracts_status='+('FAIL' if errors else 'PASS'))
    return bool(errors)

if __name__ == '__main__': raise SystemExit(main())
