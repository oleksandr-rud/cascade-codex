#!/usr/bin/env python3
"""Bounded SQLite example: existing Operation values -> admission -> context.

Not a production adapter or a full StateDelta executor. Scope is supplied by a
trusted caller. No text classification, model execution, or external effects.
"""
import hashlib
import json
import sqlite3
import uuid
from pathlib import Path

from validate_agent_contracts import validate_contract


class Rejected(ValueError):
    pass


def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(',', ':'), ensure_ascii=False, allow_nan=False)


def digest(value):
    return hashlib.sha256(canonical(value).encode()).hexdigest()


def require(condition, code):
    if not condition:
        raise Rejected(code)


class ProjectMemory:
    """One project-intake module; tables are storage, not separate services."""

    def __init__(self, path=':memory:'):
        self.db = sqlite3.connect(path, isolation_level=None)
        self.db.row_factory = sqlite3.Row
        if self.db.execute('PRAGMA user_version').fetchone()[0] not in (0, 1, 2):
            self.db.close()
            raise Rejected('STORAGE_SCHEMA_UNSUPPORTED')
        self.db.execute('PRAGMA foreign_keys=ON')
        self.db.executescript('''
          BEGIN IMMEDIATE;
          CREATE TABLE IF NOT EXISTS scopes(id TEXT PRIMARY KEY, revision INTEGER NOT NULL);
          CREATE TABLE IF NOT EXISTS entities(id TEXT PRIMARY KEY, scope TEXT NOT NULL, kind TEXT NOT NULL, name TEXT NOT NULL);
          CREATE TABLE IF NOT EXISTS entity_display(entity_id TEXT PRIMARY KEY REFERENCES entities(id), attributes TEXT NOT NULL);
          CREATE TABLE IF NOT EXISTS sources(id TEXT PRIMARY KEY, scope TEXT NOT NULL, body TEXT NOT NULL, version INTEGER NOT NULL, active INTEGER NOT NULL);
          CREATE TABLE IF NOT EXISTS claims(id TEXT PRIMARY KEY, scope TEXT NOT NULL, subject TEXT NOT NULL, predicate TEXT NOT NULL, body TEXT NOT NULL, revision INTEGER NOT NULL, status TEXT NOT NULL, supersedes TEXT);
          CREATE TABLE IF NOT EXISTS memories(id TEXT PRIMARY KEY, scope TEXT NOT NULL, subject TEXT NOT NULL, body TEXT NOT NULL, revision INTEGER NOT NULL);
          CREATE TABLE IF NOT EXISTS projects(id TEXT PRIMARY KEY, scope TEXT NOT NULL, approved_claim TEXT, revision INTEGER NOT NULL);
          CREATE TABLE IF NOT EXISTS receipts(scope TEXT NOT NULL, request_key TEXT NOT NULL, input_digest TEXT NOT NULL, body TEXT NOT NULL, PRIMARY KEY(scope,request_key));
          PRAGMA user_version=2;
          COMMIT;
        ''')

    def close(self):
        self.db.close()

    def seed(self, seed):
        """Trusted, synthetic fixture provisioning; never an Analyzer operation."""
        self.db.execute('BEGIN IMMEDIATE')
        try:
            for scope in seed['scopes']:
                self.db.execute('INSERT INTO scopes VALUES (?,0)', (scope,))
            for item in seed['entities']:
                require(self.db.execute('SELECT 1 FROM scopes WHERE id=?', (item['scope'],)).fetchone(), 'SCOPE')
                self.db.execute('INSERT INTO entities VALUES (?,?,?,?)', (item['id'], item['scope'], item['kind'], item['name']))
                attributes = item.get('display_attributes', {})
                require(type(attributes) is dict and set(attributes) <= {'surname', 'team'}, 'DISPLAY_FIELDS')
                require(all(type(v) is str and 0 < len(v) <= 240 for v in attributes.values()), 'DISPLAY_VALUE')
                self.db.execute('INSERT INTO entity_display VALUES (?,?)', (item['id'], canonical(attributes)))
                if item['kind'] == 'project':
                    self.db.execute('INSERT INTO projects VALUES (?,?,NULL,0)', (item['id'], item['scope']))
            for item in seed['sources']:
                require(self.db.execute('SELECT 1 FROM scopes WHERE id=?', (item['scope'],)).fetchone(), 'SCOPE')
                self.db.execute('INSERT INTO sources VALUES (?,?,?,1,1)', (item['id'], item['scope'], item['text']))
            self.db.commit()
        except Exception:
            self.db.rollback()
            raise

    def revision(self, scope):
        row = self.db.execute('SELECT revision FROM scopes WHERE id=?', (scope,)).fetchone()
        require(row is not None, 'SCOPE')
        return row['revision']

    def _entity(self, scope, ref, kind=None):
        row = self.db.execute('SELECT * FROM entities WHERE id=? AND scope=?', (ref, scope)).fetchone()
        require(row is not None and (kind is None or row['kind'] == kind), 'ENTITY_SCOPE_OR_TYPE')
        return row

    def _source(self, scope, ref):
        row = self.db.execute('SELECT * FROM sources WHERE id=? AND scope=? AND active=1', (ref, scope)).fetchone()
        require(row is not None, 'SOURCE_UNAVAILABLE')
        return row

    def _claim(self, scope, ref):
        row = self.db.execute('SELECT * FROM claims WHERE id=? AND scope=?', (ref, scope)).fetchone()
        require(row is not None, 'CLAIM_UNAVAILABLE')
        return row

    def _supported(self, row):
        if row['status'] != 'active':
            return False
        body = json.loads(row['body'])
        return all(self.db.execute('SELECT 1 FROM sources WHERE id=? AND scope=? AND active=1', (ref, row['scope'])).fetchone() for ref in body['evidence_refs'])

    def _insert_claim(self, scope, claim, supersedes=None):
        self._entity(scope, claim['subject_ref'], 'project')
        value = claim['value']
        if claim['predicate'] == 'budget':
            require(type(value) is dict and set(value) == {'amount_minor', 'currency'}, 'BUDGET_SHAPE')
            require(type(value['amount_minor']) is int and 0 <= value['amount_minor'] <= 100_000_000 and value['currency'] == 'USD', 'BUDGET_VALUE')
        elif claim['predicate'] == 'owned_by':
            require(type(value) is dict and set(value) == {'entity_ref'}, 'RELATION_SHAPE')
            self._entity(scope, value['entity_ref'], 'person')
        else:
            raise Rejected('PREDICATE_UNREGISTERED')
        sources = [self._source(scope, ref) for ref in claim['evidence_refs']]
        # Literal containment verifies only the cited bytes, never entailment.
        require(any(claim['literal_quote'] in row['body'] for row in sources), 'QUOTE_NOT_IN_SOURCE')
        require(len(set(claim['evidence_refs'])) == len(claim['evidence_refs']), 'DUPLICATE_SOURCE')
        for old in self.db.execute('SELECT * FROM claims WHERE scope=? AND subject=? AND predicate=? AND status=?', (scope, claim['subject_ref'], claim['predicate'], 'active')):
            prior = json.loads(old['body'])
            if all(prior[k] == claim[k] for k in ('value', 'literal_quote', 'support', 'evidence_refs')):
                require(supersedes is None, 'CORRECTION_DUPLICATES_ACTIVE_CLAIM')
                return old['id'], False
        ref = 'claim:' + uuid.uuid4().hex
        self.db.execute('INSERT INTO claims VALUES (?,?,?,?,?,1,?,?)', (ref, scope, claim['subject_ref'], claim['predicate'], canonical(claim), 'active', supersedes))
        return ref, True

    def _fact_signature(self, scope, subject, predicate):
        return digest(sorted((row['id'], row['revision']) for row in self.db.execute('SELECT * FROM claims WHERE scope=? AND subject=? AND predicate=?', (scope, subject, predicate)) if self._supported(row)))

    def _apply_operation(self, scope, subject, operation):
        errors = validate_contract('Operation', operation)
        require(not errors, 'OPERATION_SCHEMA')
        kind = operation['op']
        if kind == 'propose_claim':
            require(operation['claim']['subject_ref'] == subject, 'SUBJECT')
            return self._insert_claim(scope, operation['claim'])
        if kind == 'supersede_claim':
            old = self._claim(scope, operation['claim_ref'])
            replacement = operation['replacement']
            require(old['subject'] == subject == replacement['subject_ref'] and old['predicate'] == replacement['predicate'], 'CORRECTION_TARGET')
            require(old['status'] == 'active' and old['revision'] == operation['expected_claim_revision'], 'STALE_CLAIM')
            for ref in operation['evidence_refs']:
                self._source(scope, ref)
            require(set(operation['evidence_refs']) == set(replacement['evidence_refs']), 'CORRECTION_EVIDENCE')
            ref, changed = self._insert_claim(scope, replacement, old['id'])
            self.db.execute('UPDATE claims SET status=?,revision=revision+1 WHERE id=?', ('superseded', old['id']))
            return ref, changed
        if kind == 'propose_memory':
            require(operation['kind'] == 'replace_summary' and operation['scope'] == 'task', 'MEMORY_PROFILE_UNSUPPORTED')
            require(operation['trigger_ref'] == 'accepted-change', 'MEMORY_TRIGGER')
            require('coverage_through_checkpoint' not in operation, 'CHECKPOINT_PROFILE_UNSUPPORTED')
            dependencies = []
            for ref in operation['evidence_refs']:
                claim = self._claim(scope, ref)
                require(claim['subject'] == subject and self._supported(claim), 'MEMORY_DEPENDENCY')
                dependencies.append({'claim_ref': ref, 'revision': claim['revision'], 'fact_signature': self._fact_signature(scope, subject, claim['predicate'])})
            for ref in operation['source_turn_refs']:
                self._source(scope, ref)
            ref = 'memory:' + subject
            old = self.db.execute('SELECT * FROM memories WHERE id=? AND scope=?', (ref, scope)).fetchone()
            revision = old['revision'] if old else 0
            require(revision == operation['expected_memory_revision'], 'STALE_MEMORY')
            project_revision = self.db.execute('SELECT revision FROM projects WHERE id=?', (subject,)).fetchone()['revision']
            body = {'text': operation['text'], 'dependencies': dependencies, 'source_refs': operation['source_turn_refs'], 'project_revision': project_revision}
            if old and old['body'] == canonical(body):
                return ref, False
            self.db.execute('INSERT INTO memories VALUES (?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET body=excluded.body,revision=excluded.revision', (ref, scope, subject, canonical(body), revision + 1))
            return ref, True
        raise Rejected('OPERATION_NOT_IMPLEMENTED')

    def apply_group(self, scope, subject, base_revision, request_key, operations):
        """Host binds one atomic group of existing Operation objects.

        Does not accept a full StateDelta envelope, alternatives or arbitrary
        writes. Failures roll back the whole group; caller owns rejection logs.
        """
        require(type(base_revision) is int and base_revision >= 0, 'BASE_REVISION')
        require(type(request_key) is str and 0 < len(request_key) <= 240, 'REQUEST_KEY')
        require(type(operations) is list and len(operations) <= 32, 'GROUP_LIMIT')
        bound = digest({'subject': subject, 'base_revision': base_revision, 'operations': operations})
        self.db.execute('BEGIN IMMEDIATE')
        try:
            self._entity(scope, subject, 'project')
            prior = self.db.execute('SELECT * FROM receipts WHERE scope=? AND request_key=?', (scope, request_key)).fetchone()
            if prior:
                require(prior['input_digest'] == bound, 'IDEMPOTENCY_CONFLICT')
                self.db.commit()
                return json.loads(prior['body'])
            before = self.revision(scope)
            require(before == base_revision, 'STALE_BASE')
            ids, changed, seen = {}, False, set()
            for operation in operations:
                require(type(operation) is dict, 'OPERATION_SCHEMA')
                require(not validate_contract('Operation', operation), 'OPERATION_SCHEMA')
                require(operation.get('op_id') not in seen, 'DUPLICATE_OPERATION')
                seen.add(operation.get('op_id'))
                ref, mutated = self._apply_operation(scope, subject, operation)
                ids[operation['op_id']] = ref
                changed = changed or mutated
            after = before + int(changed)
            self.db.execute('UPDATE scopes SET revision=? WHERE id=?', (after, scope))
            receipt = {'status': 'APPLIED' if changed else 'NOOP', 'before': before, 'after': after, 'references': ids}
            self.db.execute('INSERT INTO receipts VALUES (?,?,?,?)', (scope, request_key, bound, canonical(receipt)))
            self.db.commit()
            return receipt
        except Exception:
            self.db.rollback()
            raise

    def approve_budget(self, scope, subject, claim_ref, base_revision):
        """Explicit trusted-host command; never inferred from a message or claim.

        Local policy only demonstrates consistency. Production authentication,
        approval verification and command idempotency must be supplied by host.
        """
        self.db.execute('BEGIN IMMEDIATE')
        try:
            self._entity(scope, subject, 'project')
            require(self.revision(scope) == base_revision, 'STALE_BASE')
            claim = self._claim(scope, claim_ref)
            require(claim['subject'] == subject and claim['predicate'] == 'budget' and self._supported(claim), 'BUDGET_CLAIM')
            values = {canonical(json.loads(c['body'])['value']) for c in self.db.execute('SELECT * FROM claims WHERE scope=? AND subject=? AND predicate=?', (scope, subject, 'budget')) if self._supported(c)}
            require(len(values) == 1, 'BUDGET_CONFLICT')
            project = self.db.execute('SELECT * FROM projects WHERE id=?', (subject,)).fetchone()
            if project['approved_claim'] != claim_ref:
                self.db.execute('UPDATE projects SET approved_claim=?,revision=revision+1 WHERE id=?', (claim_ref, subject))
                self.db.execute('UPDATE scopes SET revision=revision+1 WHERE id=?', (scope,))
            self.db.commit()
        except Exception:
            self.db.rollback()
            raise

    def revoke_source(self, scope, source_ref):
        """Trusted-host source lifecycle command; repeat revocation is a no-op."""
        self.db.execute('BEGIN IMMEDIATE')
        try:
            row = self.db.execute('SELECT * FROM sources WHERE id=? AND scope=?', (source_ref, scope)).fetchone()
            require(row is not None, 'SOURCE_UNAVAILABLE')
            if row['active']:
                self.db.execute('UPDATE sources SET active=0,version=version+1 WHERE id=?', (source_ref,))
                self.db.execute('UPDATE scopes SET revision=revision+1 WHERE id=?', (scope,))
            self.db.commit()
        except Exception:
            self.db.rollback()
            raise

    def graph(self, scope, subject):
        """Derived lineage graph for an authorized subject; no duplicate edge store."""
        self._entity(scope, subject, 'project')
        edges = []
        for row in self.db.execute('SELECT * FROM claims WHERE scope=? AND subject=? ORDER BY id', (scope, subject)):
            body = json.loads(row['body'])
            edges.append([row['id'], 'subject', subject])
            for ref in body['evidence_refs']:
                edges.append([ref, 'source_for', row['id']])
            if body['predicate'] == 'owned_by':
                edges.append([row['id'], 'object', body['value']['entity_ref']])
            if row['supersedes']:
                edges.append([row['id'], 'supersedes', row['supersedes']])
        for row in self.db.execute('SELECT * FROM memories WHERE scope=? AND subject=?', (scope, subject)):
            edges.extend([row['id'], 'depends_on', d['claim_ref']] for d in json.loads(row['body'])['dependencies'])
        return edges

    def _clarification(self, scope, subject, proposal):
        """Admit an optional model proposal; hydrate display data from host records.

        Does not choose an identity, persist a choice, or accept an answer.
        Scope visibility is the example's only disclosure boundary.
        """
        if proposal is None:
            return None
        require(not validate_contract('ClarificationProposal', proposal), 'CLARIFICATION_SCHEMA')
        require(proposal['target_ref'] == subject, 'CLARIFICATION_TARGET')
        kind = proposal['kind']
        if kind == 'missing_value':
            fields = proposal['missing_fields']
            require(len(fields) == len(set(fields)), 'CLARIFICATION_DUPLICATE')
            return {'request': proposal, 'response_mode': 'ask_value', 'candidate_options': []}
        refs = proposal['candidate_refs']
        require(len(refs) == len(set(refs)), 'CLARIFICATION_DUPLICATE')
        options = []
        if kind == 'entity_identity':
            for ref in refs:
                entity = self._entity(scope, ref, 'person')
                row = self.db.execute('SELECT attributes FROM entity_display WHERE entity_id=?', (ref,)).fetchone()
                options.append({'candidate_ref': ref, 'label': entity['name'], 'attributes': json.loads(row['attributes']) if row else {}})
            # Exact collisions of issued structured display tuples only. Near
            # duplicates and usefulness of attributes remain semantic judgments.
            signatures = {canonical({'label': o['label'], 'attributes': o['attributes']}) for o in options}
            mode = 'select_candidate' if len(options) >= 2 and len(signatures) == len(options) else 'ask_discriminator'
        else:
            values = set()
            current = {c['id'] for c in self.db.execute('SELECT * FROM claims WHERE scope=? AND subject=? AND predicate=?', (scope, subject, proposal['predicate'])) if self._supported(c)}
            require(set(refs) == current, 'CLARIFICATION_CLAIM_COVERAGE')
            for ref in refs:
                row = self._claim(scope, ref)
                body = json.loads(row['body'])
                values.add(canonical(body['value']))
                options.append({'candidate_ref': ref, 'value': body['value'], 'support': body['support'], 'evidence_refs': body['evidence_refs']})
            require(len(values) >= 2, 'CLARIFICATION_NOT_CONFLICTED')
            mode = 'reconcile_reports'
        return {'request': proposal, 'response_mode': mode, 'candidate_options': options}

    def issue_context(self, scope, subject, max_chars=20000, *, clarification=None):
        """Fixed current-project selector; no semantic search or whole-store dump.

        Snapshot read. All included sections are required in this tiny profile;
        budget overflow returns a gap, never a truncated context.
        """
        require(type(max_chars) is int and max_chars > 0, 'CONTEXT_BUDGET')
        self.db.execute('BEGIN')
        try:
            entity = self._entity(scope, subject, 'project')
            issued_clarification = self._clarification(scope, subject, clarification)
            project = self.db.execute('SELECT * FROM projects WHERE id=?', (subject,)).fetchone()
            claims, source_refs, values = [], set(), {'budget': set(), 'owned_by': set()}
            entity_refs = {subject}
            for row in self.db.execute('SELECT * FROM claims WHERE scope=? AND subject=? ORDER BY id', (scope, subject)):
                if not self._supported(row):
                    continue
                body = json.loads(row['body'])
                claims.append({'ref': row['id'], 'predicate': row['predicate'], 'value': body['value'], 'support': body['support'], 'evidence_refs': body['evidence_refs']})
                values[row['predicate']].add(canonical(body['value']))
                source_refs.update(body['evidence_refs'])
                if row['predicate'] == 'owned_by':
                    entity_refs.add(body['value']['entity_ref'])
            collection = {key: 'unknown' if not v else 'conflicted' if len(v) > 1 else 'present' for key, v in values.items()}
            memory = []
            for row in self.db.execute('SELECT * FROM memories WHERE scope=? AND subject=?', (scope, subject)):
                body = json.loads(row['body'])
                valid = all(self._supported(c := self._claim(scope, d['claim_ref'])) and c['revision'] == d['revision'] and d['fact_signature'] == self._fact_signature(scope, subject, c['predicate']) for d in body['dependencies'])
                valid = valid and all(self.db.execute('SELECT 1 FROM sources WHERE id=? AND scope=? AND active=1', (ref, scope)).fetchone() for ref in body['source_refs'])
                valid = valid and body['project_revision'] == project['revision']
                memory.append({'ref': row['id'], 'status': 'current' if valid else 'stale', 'text': body['text'] if valid else None})
                if valid:
                    source_refs.update(body['source_refs'])
            approved = None
            if project['approved_claim']:
                claim = self._claim(scope, project['approved_claim'])
                # Domain approval survives evidence lifecycle; stale backing is
                # explicit and must be resolved before a dependent action.
                supported = self._supported(claim)
                approved = {'value': json.loads(claim['body'])['value'] if supported else None, 'support_current': supported}
            sources = [{'ref': ref, 'text': self._source(scope, ref)['body'], 'version': self._source(scope, ref)['version']} for ref in sorted(source_refs)]
            sections = {
                'task': {'project_ref': subject, 'name': entity['name']},
                'domain_state': {'approved_budget': approved},
                'entities': [{'ref': ref, 'name': self._entity(scope, ref)['name'], 'kind': self._entity(scope, ref)['kind']} for ref in sorted(entity_refs)],
                'claims': claims, 'evidence': sources,
                'memory': memory, 'collection': collection,
                'clarification': issued_clarification,
                'response_requirements': ['Distinguish reported claims from approved values.', 'Preserve conflicts and unknowns.', 'Stale memory is unavailable; never reconstruct it.']
            }
            rendered = render_sections(sections)
            manifest = {'scope': scope, 'subject': subject, 'state_revision': self.revision(scope), 'content_digest': digest(sections), 'profile': 'selective-memory-example@2', 'max_chars': max_chars}
            self.db.commit()
            if len(rendered) > max_chars:
                return {'status': 'CONTEXT_GAP', 'reason': 'REQUIRED_CONTENT_EXCEEDS_CHAR_BUDGET', 'manifest': manifest}
            return {'status': 'READY', 'sections': sections, 'text': rendered, 'manifest': manifest}
        except Exception:
            self.db.rollback()
            raise

    def context_is_current(self, context):
        require(context.get('status') == 'READY', 'CONTEXT_NOT_READY')
        manifest = context['manifest']
        require(manifest['profile'] == 'selective-memory-example@2', 'CONTEXT_PROFILE')
        require(digest(context['sections']) == manifest['content_digest'] and render_sections(context['sections']) == context['text'], 'CONTEXT_TAMPERED')
        clarification = context['sections']['clarification']
        try:
            current = self.issue_context(manifest['scope'], manifest['subject'], manifest['max_chars'], clarification=clarification['request'] if clarification else None)
        except Rejected:
            return False
        return current['status'] == 'READY' and current['manifest']['content_digest'] == manifest['content_digest']


def render_sections(sections):
    """Hierarchical text codec only. Quote scalar data to contain newlines."""
    lines = []
    def visit(key, value, depth):
        prefix = '  ' * depth + str(key)
        if isinstance(value, dict):
            lines.append(prefix + ':')
            for child, item in value.items():
                visit(child, item, depth + 1)
        elif isinstance(value, list):
            lines.append(prefix + (':' if value else ': empty'))
            for i, item in enumerate(value):
                visit(i + 1, item, depth + 1)
        else:
            lines.append(prefix + ': ' + json.dumps(value, ensure_ascii=False))
    for key, value in sections.items():
        visit(key, value, 0)
    return '\n'.join(lines)


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    fixture = json.loads((Path(__file__).resolve().parents[1] / 'assets/selective-memory/seed-and-proposals.json').read_text(encoding='utf-8'))
    args.output.mkdir(parents=True, exist_ok=False)
    store = ProjectMemory(args.output / 'project-memory.sqlite')
    store.seed(fixture['seed'])
    scope, subject = 'workspace-a', 'project-a'
    receipt = store.apply_group(scope, subject, 0, 'initial', fixture['initial'])
    memory = fixture['summary']
    memory['evidence_refs'] = list(receipt['references'].values())
    store.apply_group(scope, subject, 1, 'summary', [memory])
    before = store.issue_context(scope, subject)
    correction = fixture['correction']
    correction['claim_ref'] = receipt['references']['budget']
    corrected = store.apply_group(scope, subject, 2, 'correction', [correction])
    store.approve_budget(scope, subject, corrected['references']['correct-budget'], 3)
    after = store.issue_context(scope, subject)
    store.apply_group(scope, subject, 4, 'conflicting-report', [fixture['conflict']])
    conflicted = store.issue_context(scope, subject)
    report = {'evidence_type': 'PREPARED_PROPOSAL_BACKEND_DEMO', 'model_execution': 'NOT_RUN', 'before': before, 'after': after, 'conflicted': conflicted, 'old_context_current': store.context_is_current(before), 'graph': store.graph(scope, subject)}
    (args.output / 'trace.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    (args.output / 'composer-context.txt').write_text(conflicted['text'] + '\n', encoding='utf-8')
    store.close()
    print(json.dumps({'status': 'EXECUTED', 'output': str(args.output), 'semantic_evaluation': 'NOT_RUN'}))
