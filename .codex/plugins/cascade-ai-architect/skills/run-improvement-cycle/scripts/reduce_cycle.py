#!/usr/bin/env python3
"""Reduce matched, frozen Cascade Quality receipts; never execute or promote."""
import argparse
import hashlib
import json
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[3]/'scripts'))
from schema_validation import validate_schema

class InvalidCycle(ValueError): pass

def require(value, message):
    if not value: raise InvalidCycle(message)

def decode(text):
    def pairs(items):
        value = {}
        for key, item in items:
            require(key not in value, 'duplicate JSON key')
            value[key] = item
        return value
    def invalid(_): raise InvalidCycle('nonfinite number')
    return json.loads(text, object_pairs_hook=pairs, parse_constant=invalid)

def sha(data): return hashlib.sha256(data).hexdigest()

def bound_file(root, binding):
    path = (root/binding['path']).resolve()
    require(path.is_relative_to(root.resolve()), 'file outside frozen cycle')
    data = path.read_bytes()
    require(len(data) <= 2*1024*1024, 'file exceeds byte limit')
    require(sha(data) == binding['sha256'], 'stale frozen bytes')
    return data

def reduce_cycle(cycle, root, receipt_schema):
    schema_path = Path(__file__).resolve().parents[1]/'references/cycle.schema.json'
    require(not validate_schema(cycle, json.loads(schema_path.read_text())), 'invalid cycle schema')
    require(sha(json.dumps(receipt_schema, sort_keys=True, separators=(',', ':')).encode()) == cycle['receipt_schema_digest'], 'receipt schema binding mismatch')
    for variant in ('baseline', 'candidate'): bound_file(root, cycle[variant])
    case_ids = [case['id'] for case in cycle['cases']]
    case_sources = {case['id']: case['source'] for case in cycle['cases']}
    for case in cycle['cases']: bound_file(root, case['source'])
    require(len(case_ids) == len(set(case_ids)), 'duplicate case')
    require(any(case['split'] == 'HELD_OUT' for case in cycle['cases']), 'held-out regression case required')
    require(any(case['split'] == 'FAILURE' for case in cycle['cases']), 'measured failure case required')
    expected = {(variant, case) for variant in ('baseline', 'candidate') for case in case_ids}
    observed, receipts = set(), {}
    authors = set(cycle['author_context_ids'])
    for binding in cycle['receipts']:
        key = binding['variant'], binding['case_id']
        require(key in expected and key not in observed, 'unknown or duplicate receipt case')
        observed.add(key)
        receipt = decode(bound_file(root, binding).decode('utf-8'))
        require(not validate_schema(receipt, receipt_schema), 'invalid Quality receipt schema')
        require(receipt['subject']['digest'] == cycle[key[0]]['sha256'], 'receipt subject mismatch')
        require(receipt['bundle_sha256'] == binding['bundle_sha256'], 'receipt bundle mismatch')
        require(receipt['models'] == cycle['models'], 'comparison model mismatch')
        if receipt['mechanical_status'] == 'PASS' and receipt['overall_status'] in ('PASS', 'FAIL'):
            profiles = {(j['profile_id'], j['profile_version']) for j in receipt['judgments']}
            required_profiles = {(j['id'], j['version']) for j in cycle['profiles']}
            require(profiles == required_profiles and len(receipt['judgments']) == len(required_profiles), 'judge profile mismatch')
            require(all(j['judge_context_id'] not in authors for j in receipt['judgments']), 'author cannot judge own candidate')
            require(case_sources[key[1]] in receipt['evidence'], 'receipt lacks frozen case evidence')
            require(receipt['judgments'] and receipt['conservative_score'] == min(j['score'] for j in receipt['judgments']), 'inconsistent conservative score')
            if receipt['overall_status'] == 'PASS':
                require(all(j['verdict'] == 'PASS' for j in receipt['judgments']), 'PASS contradicts independent judgment')
        for evidence in receipt['evidence']: bound_file(root, evidence)
        receipts[key] = receipt
    require(observed == expected, 'missing paired receipt')
    base = {'schema_version': 1, 'artifact_type': 'improvement-cycle', 'promotion_authorized': False,
            'baseline_digest': cycle['baseline']['sha256'], 'candidate_digest': cycle['candidate']['sha256']}
    if any(r['mechanical_status'] != 'PASS' or r['overall_status'] not in ('PASS', 'FAIL') or
           r['conservative_score'] is None for r in receipts.values()):
        return {**base, 'status': 'UNRESOLVED', 'reason': 'INCOMPLETE_INDEPENDENT_EVIDENCE'}
    regressions, gains = [], []
    for case_id in case_ids:
        before, after = receipts['baseline', case_id], receipts['candidate', case_id]
        if after['overall_status'] != 'PASS' or after['conservative_score'] < before['conservative_score']:
            regressions.append(case_id)
        gains.append(after['conservative_score'] - before['conservative_score'])
    if regressions: return {**base, 'status': 'REJECTED', 'reason': 'REGRESSION_OR_REQUIRED_CASE_FAILURE', 'cases': regressions}
    measured = [gains[index] for index, case in enumerate(cycle['cases']) if case['split'] == 'FAILURE']
    if not any(gain >= cycle['minimum_gain'] for gain in measured):
        return {**base, 'status': 'REJECTED', 'reason': 'NO_SUPPORTED_IMPROVEMENT'}
    return {**base, 'status': 'CANDIDATE_READY', 'reason': 'MATCHED_EVIDENCE_WITHOUT_REGRESSION'}

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('cycle')
    parser.add_argument('--receipt-schema', required=True)
    args = parser.parse_args()
    try:
        path = Path(args.cycle).resolve()
        result = reduce_cycle(decode(path.read_text()), path.parent, decode(Path(args.receipt_schema).read_text()))
    except (ValueError, OSError, json.JSONDecodeError) as error:
        result = {'status': 'INVALID', 'reason': str(error), 'promotion_authorized': False}
    print(json.dumps(result))
    raise SystemExit(0 if result['status'] == 'CANDIDATE_READY' else 2)
