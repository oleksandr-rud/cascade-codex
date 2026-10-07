"""Bounded mechanical validation for the schemas shipped by this package.

Only the declared keyword subset is supported; unknown rules fail closed.
This does not interpret text, judge claims, or grant authority.
"""
import json
import math
import re

KEYWORDS = {'$schema', '$id', '$defs', '$ref', 'title', 'description', 'type', 'const', 'enum',
            'properties', 'required', 'additionalProperties', 'items', 'minItems', 'maxItems',
            'uniqueItems', 'minLength', 'maxLength', 'pattern', 'minimum', 'maximum',
            'exclusiveMinimum', 'exclusiveMaximum', 'oneOf'}

def equal_json(left, right):
    if type(left) in (int, float) and type(right) in (int, float): return left == right
    if type(left) is not type(right): return False
    if isinstance(left, dict): return left.keys() == right.keys() and all(equal_json(left[k], right[k]) for k in left)
    if isinstance(left, list): return len(left) == len(right) and all(equal_json(a, b) for a, b in zip(left, right))
    return left == right

def bounded(value, depth=0, count=None):
    count = count if count is not None else [0]
    count[0] += 1
    if depth > 32 or count[0] > 50000: raise ValueError('structure limit')
    if isinstance(value, float) and not math.isfinite(value): raise ValueError('nonfinite number')
    if type(value) is int and abs(value) > 9007199254740991: raise ValueError('unsafe integer')
    if isinstance(value, dict):
        if not all(isinstance(key, str) for key in value): raise ValueError('non-string key')
        for child in value.values(): bounded(child, depth+1, count)
    elif isinstance(value, list):
        for child in value: bounded(child, depth+1, count)

def validate_schema(value, schema):
    bounded(value)
    if len(json.dumps(value, ensure_ascii=False).encode()) > 2*1024*1024: return ['byte limit']
    defs = schema.get('$defs', {})
    def check(item, rule, path='$'):
        if rule is True: return []
        if rule is False: return [path+': forbidden']
        if not isinstance(rule, dict) or set(rule)-KEYWORDS: raise ValueError(path+': unsupported schema keyword')
        errors = []
        if '$ref' in rule:
            name = rule['$ref'].removeprefix('#/$defs/')
            if rule['$ref'] != '#/$defs/'+name or name not in defs: return [path+': unknown reference']
            errors += check(item, defs[name], path)
        if 'oneOf' in rule and sum(not check(item, branch, path) for branch in rule['oneOf']) != 1:
            errors.append(path+': union branch')
        if 'const' in rule and not equal_json(item, rule['const']): errors.append(path+': constant')
        if 'enum' in rule and not any(equal_json(item, v) for v in rule['enum']): errors.append(path+': enum')
        kinds = rule.get('type', [])
        kinds = kinds if isinstance(kinds, list) else [kinds]
        checks = {'object': isinstance(item, dict), 'array': isinstance(item, list), 'string': isinstance(item, str),
                  'boolean': type(item) is bool, 'null': item is None, 'number': type(item) in (int, float),
                  'integer': type(item) is int or type(item) is float and item.is_integer()}
        if kinds and not any(checks.get(kind, False) for kind in kinds): return errors+[path+': type']
        if isinstance(item, str):
            if len(item) < rule.get('minLength', 0) or len(item) > rule.get('maxLength', float('inf')): errors.append(path+': string length')
            if 'pattern' in rule and not re.search(rule['pattern'], item): errors.append(path+': field syntax')
        if type(item) in (int, float):
            if item < rule.get('minimum', -math.inf) or item > rule.get('maximum', math.inf): errors.append(path+': range')
            if item <= rule.get('exclusiveMinimum', -math.inf) or item >= rule.get('exclusiveMaximum', math.inf): errors.append(path+': exclusive range')
        if isinstance(item, list):
            if len(item) < rule.get('minItems', 0) or len(item) > rule.get('maxItems', math.inf): errors.append(path+': array size')
            if rule.get('uniqueItems') and any(equal_json(child, previous) for index, child in enumerate(item) for previous in item[:index]): errors.append(path+': duplicate item')
            for index, child in enumerate(item): errors += check(child, rule.get('items', {}), path+'['+str(index)+']')
        if isinstance(item, dict):
            props = rule.get('properties', {})
            if any(key not in item for key in rule.get('required', [])): errors.append(path+': required')
            for key, child in item.items(): errors += check(child, props.get(key, rule.get('additionalProperties', True)), path+'.'+key)
        return errors
    return check(value, schema)
