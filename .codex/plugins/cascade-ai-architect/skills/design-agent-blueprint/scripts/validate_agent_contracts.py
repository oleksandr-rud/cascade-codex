#!/usr/bin/env python3
"""Schema validation only; the JS runtime owns admission and dispatch checks."""
import argparse
import json
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[3]/'scripts'))
from schema_validation import validate_schema
ROOT = Path(__file__).resolve().parents[1]
SCHEMA = json.loads((ROOT/'references/agent-contracts.schema.json').read_text(encoding='utf-8'))

def validate_contract(name, value):
    if name not in SCHEMA['$defs']: return ['unknown contract '+name]
    return validate_schema(value, {'$defs': SCHEMA['$defs'], '$ref': '#/$defs/'+name})

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('contract', choices=sorted(SCHEMA['$defs']))
    parser.add_argument('path')
    args = parser.parse_args()
    value = json.loads(Path(args.path).read_text(encoding='utf-8'))
    errors = validate_contract(args.contract, value)
    print(json.dumps({'status': 'INVALID' if errors else 'PASS', 'errors': errors}))
    raise SystemExit(bool(errors))
