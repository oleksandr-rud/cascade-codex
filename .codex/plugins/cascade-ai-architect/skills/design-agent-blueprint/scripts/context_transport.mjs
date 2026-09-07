/** Offline transport reference, not policy admission or a provider adapter.
 * Uses the host's existing yaml package; portable targets must bind that dependency.
 */
import { parseDocument, visit, isAlias, isScalar } from 'yaml';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const MAX_BYTES = 1024 * 1024;
const MAX_DEPTH = 32;
const MAX_NODES = 50000;
const keyText = key => /^[A-Za-z_][\w.-]*$/.test(key) ? key : JSON.stringify(key);

function checkTree(value, depth = 0, count = { n: 0 }) {
  if (depth > MAX_DEPTH || ++count.n > MAX_NODES) throw Error('structure limit');
  if (typeof value === 'number' && (!Number.isFinite(value) ||
      (Number.isInteger(value) && !Number.isSafeInteger(value)))) throw Error('unsafe number');
  if (value === null || ['string', 'number', 'boolean'].includes(typeof value)) return;
  if (!value || typeof value !== 'object' ||
      (!Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype)) throw Error('non-JSON value');
  for (const child of Object.values(value)) checkTree(child, depth + 1, count);
}

export function parseAnalyzerYaml(text) {
  if (Buffer.byteLength(text) > MAX_BYTES) throw Error('byte limit');
  // Optional YAML transport; one document, YAML 1.2 core scalar resolution.
  const doc = parseDocument(text, { version: '1.2', schema: 'core', uniqueKeys: true, strict: true });
  if (doc.directives.yaml.version !== '1.2') throw Error('YAML 1.2 required');
  if (doc.errors.length || doc.warnings.length) throw Error('invalid YAML: '+[...doc.errors, ...doc.warnings].map(e => e.message).join('; '));
  let count = 0;
  visit(doc, (key, node, path) => {
    if (++count > MAX_NODES || path.length > MAX_DEPTH * 2) throw Error('structure limit');
    if (node?.tag || node?.anchor || isAlias(node)) throw Error('tags/anchors/aliases forbidden');
    if (key === 'key' && (!isScalar(node) || typeof node.value !== 'string' || node.value === '<<')) throw Error('invalid mapping key');
  });
  const value = doc.toJS({ maxAliasCount: 0 });
  checkTree(value);
  if (!value || Array.isArray(value) || typeof value !== 'object' || value.schema_version !== 'state-delta.v3') throw Error('expected StateDelta mapping');
  return value; // Caller MUST run StateDelta schema and invocation/reference gates.
}

export function parseAnalyzer(text, format = 'json') {
  if (Buffer.byteLength(text) > MAX_BYTES) throw Error('byte limit');
  if (format === 'yaml') return parseAnalyzerYaml(text);
  if (format !== 'json') throw Error('unsupported Analyzer format');
  // JSON.parse enforces JSON grammar; YAML's node parser checks duplicate keys
  // before conversion, including differently escaped spellings of the same key.
  const value = JSON.parse(text);
  checkTree(value);
  parseAnalyzerYaml(text);
  return value;
}

// Canonical ordering for this offline reference only. Production canonicalization
// must be bound/versioned across implementation languages before digest comparison.
export function canonical(value) {
  checkTree(value);
  const sort = v => Array.isArray(v) ? v.map(sort) : v && typeof v === 'object'
    ? Object.fromEntries(Object.keys(v).sort().map(k => [k, sort(v[k])])) : v;
  return JSON.stringify(sort(value));
}

export function compileBlocks(value, root = 'context') {
  checkTree(value);
  if (!value || Array.isArray(value) || typeof value !== 'object') throw Error('root mapping required');
  if (!/^[A-Za-z_][\w.-]*$/.test(root)) throw Error('invalid root');
  function render(v, depth) {
    if (!v || typeof v !== 'object') return JSON.stringify(v);
    if (Array.isArray(v)) {
      if (v.every(x => !x || typeof x !== 'object')) return '['+v.map(x => render(x, depth)).join(';')+']';
      return '[\n'+v.map(x => '  '.repeat(depth+1)+render(x, depth+1)).join(';\n')+'\n'+'  '.repeat(depth)+']';
    }
    const entries = Object.keys(v).sort().map(k => [k, v[k]]);
    const field = ([k,x]) => keyText(k)+(x && typeof x === 'object' ? '' : '=')+render(x, depth+1);
    if (entries.every(([,x]) => !x || typeof x !== 'object')) return '{'+entries.map(field).join(';')+'}';
    return '{\n'+entries.map(e => '  '.repeat(depth+1)+field(e)).join(';\n')+'\n'+'  '.repeat(depth)+'}';
  }
  return root+render(value, 0)+'\n';
}

// Diagnostic inverse makes loss/shape ambiguity falsifiable. Never use model-
// authored context text as authoritative runtime state.
export function parseBlocks(text, root = 'context') {
  if (Buffer.byteLength(text) > MAX_BYTES) throw Error('byte limit');
  const token = /\s*("(?:[^"\\]|\\.)*"|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?|[A-Za-z_][\w.-]*|[{}\[\]=;])/y;
  let position = 0;
  function next() {
    token.lastIndex = position;
    const m = token.exec(text);
    if (!m) throw Error('invalid block token');
    position = token.lastIndex;
    return m[1];
  }
  let look = next();
  function take(expected) {
    if (look !== expected) throw Error('expected '+expected);
    look = position < text.trimEnd().length ? next() : null;
  }
  function value(depth = 0) {
    if (depth > MAX_DEPTH) throw Error('structure limit');
    if (look === '{') {
      take('{'); const result = {};
      while (look !== '}') {
        const key = look?.startsWith('"') ? JSON.parse(look) : look;
        if (typeof key !== 'string' || !/^(?:"|[A-Za-z_])/.test(look)) throw Error('invalid key');
        if (Object.hasOwn(result, key)) throw Error('duplicate key');
        take(look);
        if (look === '=') take('=');
        else if (look !== '{' && look !== '[') throw Error('expected object/array block');
        Object.defineProperty(result, key, { value: value(depth+1), enumerable: true, configurable: true, writable: true });
        if (look !== '}') take(';');
      }
      take('}'); return result;
    }
    if (look === '[') {
      take('['); const result = [];
      while (look !== ']') {
        result.push(value(depth+1));
        if (look !== ']') take(';');
      }
      take(']'); return result;
    }
    const raw = look; take(look);
    return JSON.parse(raw);
  }
  take(root); const result = value();
  if (look !== null || text.slice(position).trim()) throw Error('trailing content');
  checkTree(result); return result;
}

const runtimeKeys = /^(?:schema_version|context_id|identity_context_id|policy_context_id|invocation_id|checkpoint_id|checkpoint_ref|base_revision|state_revision|field_revision|plan_revision|processing_revision|source_dependencies|definition_bindings|evaluation_bindings|projection_binding|binding|digest|canonical_digest|idempotency_key|dedupe_key|issued_at|expires_at|delivery_epoch|authenticated_scope_ref|session_ref|turn_ref|authorization_binding|acl_filter_ref)$/;

/** Model-facing prose blocks from an explicit Policy Engine prompt view.
 * compileBlocks remains a diagnostic codec, never the model request renderer.
 */
export function renderPromptView(view) {
  checkTree(view);
  if (!view || Object.keys(view).some(k => k !== 'sections') || !Array.isArray(view.sections)) throw Error('explicit prompt view required');
  function rejectMetadata(value) {
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
      if (runtimeKeys.test(key)) throw Error('runtime metadata in prompt view: '+key);
      rejectMetadata(child);
    }
  }
  const scalar = value => JSON.stringify(value);
  function body(value, indent = '') {
    if (Array.isArray(value)) return value.length ? value.flatMap(item =>
      item && typeof item === 'object' ? [indent+'•', ...body(item, indent+'  ')] : [indent+'• '+scalar(item)]) : [indent+'(empty list)'];
    if (value && typeof value === 'object') return Object.keys(value).length ? Object.entries(value).flatMap(([label, item]) => {
      if (!label || /[\r\n\[\]]/.test(label)) throw Error('invalid prompt label');
      return item && typeof item === 'object'
        ? [indent+label, ...body(item, indent+'  ')] : [indent+label+' — '+scalar(item)];
    }) : [indent+'(empty object)'];
    return [indent+scalar(value)];
  }
  const titles = new Set();
  return view.sections.map(section => {
    if (!section || Object.keys(section).some(k => !['title','content'].includes(k)) || !Object.hasOwn(section,'content') ||
        typeof section.title !== 'string' || !section.title || /[\r\n\[\]]/.test(section.title) || titles.has(section.title)) throw Error('invalid prompt section');
    titles.add(section.title); rejectMetadata(section.content);
    return '['+section.title+']\n'+body(section.content).join('\n');
  }).join('\n\n')+'\n';
}

export function assembleContext({ systemPrompt, instructions, catalogView, modelView, runtimeManifest }) {
  if (!systemPrompt || typeof systemPrompt !== 'string') throw Error('system prompt required');
  if (!instructions || typeof instructions !== 'string') throw Error('instructions required');
  if (!runtimeManifest || typeof runtimeManifest !== 'object') throw Error('runtime manifest required');
  // Policy Engine supplies approved semantic views; renderer does not select data.
  const developer = '[Role instructions]\n'+instructions+'\n\n'+renderPromptView(catalogView);
  const data = renderPromptView(modelView);
  const prefix = systemPrompt+'\n\n'+developer;
  return {
    prefix,
    messages: [{ role: 'system', content: systemPrompt },
      { role: 'developer', content: developer }, { role: 'user', content: data }],
    manifest: { ...runtimeManifest, prefix_digest: 'sha256:'+createHash('sha256').update(prefix).digest('hex') },
    data,
    cache_boundary: 'after-prefix', // Adapter must translate into supported provider API.
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [mode, path] = process.argv.slice(2);
  const text = readFileSync(path, 'utf8');
  if (mode === 'decode-json' || mode === 'decode-yaml') process.stdout.write(JSON.stringify(parseAnalyzer(text, mode.slice(7)))+'\n');
  else if (mode === 'compile') process.stdout.write(renderPromptView(JSON.parse(text)));
  else throw Error('usage: context_transport.mjs decode-json|decode-yaml|compile PATH');
}
