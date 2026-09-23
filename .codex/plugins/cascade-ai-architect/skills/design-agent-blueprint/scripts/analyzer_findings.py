#!/usr/bin/env python3
"""Bind semantic Analyzer findings to StateDelta v3. No admission or effects.

The caller supplies an issued AnalyzerContext and private reference bindings.
Uses the packaged offline validator; production hosts must additionally enforce
live scope, revision, policy, semantic support and transaction requirements.
"""
import argparse
import copy
import json
import math
from pathlib import Path

from validate_agent_contracts import SCHEMA, check, validate_contract, validate_delta

MAX_BYTES = 65536


class FindingsRejected(ValueError):
    pass


def require(condition, reason):
    if not condition:
        raise FindingsRejected(reason)


def bounded(value):
    count = 0
    def visit(item, depth):
        nonlocal count
        count += 1
        require(depth <= 16 and count <= 4096, 'findings structure limit')
        require(type(item) in (dict, list, str, int, float, bool, type(None)), 'non-JSON value')
        if type(item) is int:
            require(abs(item) <= 2**53 - 1, 'unsafe number')
        elif type(item) is float:
            require(math.isfinite(item) and abs(item) <= 2**53 - 1, 'unsafe number')
        if isinstance(item, dict):
            require(all(isinstance(k, str) for k in item), 'non-string key')
            for child in item.values(): visit(child, depth + 1)
        elif isinstance(item, list):
            for child in item: visit(child, depth + 1)
    visit(value, 0)
    require(len(json.dumps(value, ensure_ascii=False).encode()) <= MAX_BYTES, 'findings byte limit')


def parse_findings(text):
    require(isinstance(text, str) and len(text.encode()) <= MAX_BYTES, 'findings byte limit')
    def pairs(items):
        result = {}
        for key, value in items:
            require(key not in result, 'duplicate JSON key')
            result[key] = value
        return result
    def invalid_constant(_):
        raise FindingsRejected('nonfinite JSON number')
    try:
        value = json.loads(text, object_pairs_hook=pairs, parse_constant=invalid_constant)
        bounded(value)
        errors = validate_contract('AnalyzerFindings', value)
        require(not errors, '; '.join(errors))
        return value
    except (json.JSONDecodeError, RecursionError, OverflowError) as error:
        raise FindingsRejected('invalid findings JSON') from error


def analyzer_findings_schema():
    """Export only the model schema's dependency closure, not the runtime bundle."""
    names = set()
    def collect(rule):
        if isinstance(rule, dict):
            if '$ref' in rule:
                name = rule['$ref'].split('/')[-1]
                if name not in names:
                    names.add(name)
                    collect(SCHEMA['$defs'][name])
            for child in rule.values(): collect(child)
        elif isinstance(rule, list):
            for child in rule: collect(child)
    collect({'$ref': '#/$defs/AnalyzerFindings'})
    return {'$schema': SCHEMA['$schema'], '$id': 'urn:cascade:analyzer-findings:1',
            '$ref': '#/$defs/AnalyzerFindings',
            '$defs': {name: copy.deepcopy(SCHEMA['$defs'][name]) for name in sorted(names)}}


def bind_findings(findings, context, bindings, value_schemas):
    """Pure conversion. Bindings must come from the host that issued context.

    One result becomes one atomic group; unsupported features fail closed.
    A returned delta remains a proposal requiring the existing applyPolicy gate.
    """
    bounded(findings)
    errors = validate_contract('AnalyzerFindings', findings) + validate_contract('AnalyzerContext', context)
    require(not errors, '; '.join(errors))
    maps = ('subjects', 'predicates', 'fields', 'evidence', 'claims', 'owners', 'steps', 'preconditions')
    require(isinstance(bindings, dict) and set(bindings) == {'context_id', 'base_revision', *maps}, 'bindings shape')
    require(bindings['context_id'] == context['context_id'] and
            type(bindings['base_revision']) is int and bindings['base_revision'] == context['base_revision'],
            'bindings context mismatch')
    require(all(isinstance(bindings[k], dict) for k in maps), 'bindings maps')
    evidence_catalog = {e['ref']: e['text'] for e in context['evidence_catalog']}
    targets = {(t['policy_id'], t['instance_id'], t['field_id']): t for t in context['writable_targets']}
    existing_steps = {s['step_ref'] for s in context['next_steps']['steps']}
    operations, written_fields, local_claims, corrected_claims = [], set(), set(), set()

    def lookup(kind, handle):
        require(handle in bindings[kind], 'unknown '+kind+' reference')
        return bindings[kind][handle]

    def evidence(handles):
        refs = []
        for handle in handles:
            item = lookup('evidence', handle)
            require(isinstance(item, dict) and set(item) == {'ref', 'text'} and
                    isinstance(item['text'], str) and item['ref'] in evidence_catalog and
                    item['text'] == evidence_catalog[item['ref']], 'unissued evidence')
            refs.append(item['ref'])
        require(len(set(refs)) == len(refs), 'duplicate evidence')
        return refs

    def append(operation):
        operations.append({'op_id': 'finding-'+str(len(operations)+1), **operation})

    def field(finding, value):
        target = lookup('fields', finding['target_ref'])
        require(isinstance(target, dict) and set(target) == {'policy_id', 'instance_id', 'field_id'}, 'field binding')
        key = tuple(target[k] for k in ('policy_id', 'instance_id', 'field_id'))
        require(key in targets and key not in written_fields, 'unissued or conflicting field')
        written_fields.add(key)
        append({'op': 'change_policy_data', **target,
                'expected_field_revision': targets[key]['field_revision'],
                'change': {'kind': 'set', 'value': copy.deepcopy(value)},
                'support': finding['support'], 'evidence_refs': evidence(finding['evidence_refs'])})

    for finding in findings['claims']:
        require(finding['local_ref'] not in local_claims, 'duplicate local claim')
        local_claims.add(finding['local_ref'])
        subject = lookup('subjects', finding['subject_ref'])
        predicate = lookup('predicates', finding['predicate'])
        require(isinstance(predicate, dict) and set(predicate) == {'predicate', 'value_schema_ref', 'allowed_support'}, 'predicate binding')
        require(predicate['value_schema_ref'] in value_schemas, 'unregistered predicate schema')
        require(finding['support'] in predicate['allowed_support'], 'unsupported claim support')
        errors = check(finding['value'], value_schemas[predicate['value_schema_ref']])
        require(not errors, '; '.join(errors))
        refs = evidence(finding['evidence_refs'])
        require(any(finding['literal_quote'] in lookup('evidence', ref)['text'] for ref in finding['evidence_refs']), 'quote outside issued evidence')
        claim = {k: copy.deepcopy(finding[k]) for k in ('value', 'literal_quote', 'support')}
        claim.update(local_ref='finding-claim/'+finding['local_ref'], subject_ref=subject,
                     predicate=predicate['predicate'], evidence_refs=refs)
        if finding['supersedes_ref'] is None:
            append({'op': 'propose_claim', 'claim': claim})
        else:
            previous = lookup('claims', finding['supersedes_ref'])
            require(isinstance(previous, dict) and set(previous) == {'claim_ref', 'revision', 'subject_ref', 'predicate'}, 'claim binding')
            require(previous['subject_ref'] == subject and previous['predicate'] == predicate['predicate'], 'correction changes claim subject or predicate')
            require(previous['claim_ref'] not in corrected_claims, 'duplicate correction')
            corrected_claims.add(previous['claim_ref'])
            append({'op': 'supersede_claim', 'claim_ref': previous['claim_ref'],
                    'expected_claim_revision': previous['revision'], 'replacement': claim, 'evidence_refs': refs})

    if findings['intent'] is not None:
        field(findings['intent'], findings['intent']['value'])
    for gap in findings['gaps']:
        field(gap, {'status': gap['status'], 'detail': gap['detail']})

    plan = findings['plan']
    if plan is not None:
        require(plan['add_steps'] or plan['supersede_steps'] or plan['cancel_step_refs'], 'empty plan must be null')
        local_steps = {s['local_ref']: 'finding-step/'+s['local_ref'] for s in plan['add_steps']}
        require(len(local_steps) == len(plan['add_steps']), 'duplicate local step')
        require(not (set(local_steps) & set(bindings['steps'])) and not (set(local_steps.values()) & existing_steps), 'ambiguous step identity')
        def existing(handle):
            ref = lookup('steps', handle)
            require(ref in existing_steps, 'unissued step')
            return ref
        def dependency(handle):
            return local_steps[handle] if handle in local_steps else existing(handle)
        steps = []
        for step in plan['add_steps']:
            steps.append({'local_ref': local_steps[step['local_ref']], 'title': step['title'], 'kind': step['kind'],
                          'owner_ref': lookup('owners', step['owner_ref']),
                          'dependency_refs': [dependency(ref) for ref in step['dependency_refs']],
                          'precondition_refs': [lookup('preconditions', ref) for ref in step['precondition_refs']],
                          'evidence_refs': evidence(step['evidence_refs'])})
        supersessions = []
        for pair in plan['supersede_steps']:
            require(pair['replacement_local_ref'] in local_steps, 'unknown replacement step')
            supersessions.append({'step_ref': existing(pair['step_ref']),
                                  'replacement_local_ref': local_steps[pair['replacement_local_ref']]})
        cancelled = [existing(ref) for ref in plan['cancel_step_refs']]
        withdrawn = cancelled + [p['step_ref'] for p in supersessions]
        require(len(withdrawn) == len(set(withdrawn)), 'duplicate withdrawn step')
        append({'op': 'propose_plan_change', 'task_ref': context['next_steps']['task_ref'],
                'expected_plan_revision': context['next_steps']['plan_revision'], 'add_steps': steps,
                'supersede_steps': supersessions, 'cancel_step_refs': cancelled,
                'evidence_refs': evidence(plan['evidence_refs'])})

    delta = {'schema_version': 'state-delta.v3', 'input_context_id': context['context_id'],
             'event_id': context['event']['event_id'], 'turn_id': context['event']['turn_id'],
             'checkpoint_id': context['checkpoint_id'], 'base_revision': context['base_revision'],
             'idempotency_key': context['idempotency_key'], 'blocks': [],
             'groups': [{'group_id': 'analyzer-findings', 'depends_on': [], 'operations': operations}] if operations else []}
    errors = validate_delta(delta, context, value_schemas)
    require(not errors, '; '.join(errors))
    return delta


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--schema', action='store_true')
    parser.add_argument('--input', type=Path)
    parser.add_argument('--context', type=Path)
    parser.add_argument('--bindings', type=Path)
    parser.add_argument('--value-schemas', type=Path)
    args = parser.parse_args()
    if args.schema:
        result = analyzer_findings_schema()
    else:
        if not all((args.input, args.context, args.bindings, args.value_schemas)):
            parser.error('input, context, bindings and value-schemas are required')
        with args.input.open('rb') as source:
            raw = source.read(MAX_BYTES + 1)
        require(len(raw) <= MAX_BYTES, 'findings byte limit')
        result = bind_findings(parse_findings(raw.decode()), json.loads(args.context.read_text()),
                               json.loads(args.bindings.read_text()), json.loads(args.value_schemas.read_text()))
    print(json.dumps(result, ensure_ascii=False, allow_nan=False))


if __name__ == '__main__':
    main()
