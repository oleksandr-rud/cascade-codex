/** Executable offline projection reference. The host supplies trusted profiles,
 * current admission decisions and a model-appropriate tokenizer. No DB or provider.
 */
import { createHash } from 'node:crypto';
import { checkTree, decodeStructured, canonical, renderPromptView, assembleRenderedContext } from './context_transport.mjs';

const own = (value, key) => Object.hasOwn(value, key);
const record = value => value && !Array.isArray(value) && typeof value === 'object';
const fail = message => { throw Error('CONTEXT_GAP: '+message); };
const clone = value => JSON.parse(JSON.stringify(value));
const digest = value => 'sha256:'+createHash('sha256').update(canonical(value)).digest('hex');
const label = value => typeof value === 'string' && value.length > 0 && value.length <= 240 &&
  !/[\r\n\[\]]/.test(value) && !['__proto__', 'constructor', 'prototype'].includes(value);
const types = ['object', 'array', 'string', 'number', 'integer', 'boolean', 'null'];

function keys(value, allowed, required, name) {
  if (!record(value) || Object.keys(value).some(key => !allowed.includes(key)) || required.some(key => !own(value, key))) fail('invalid '+name);
}

function validateSchema(schema) {
  keys(schema, ['type','description','nullable','enum','properties','order','required','items','maxItems','maxLength'], ['type'], 'block schema');
  if (!types.includes(schema.type)) fail('unsupported schema type');
  if (own(schema, 'description') && typeof schema.description !== 'string') fail('schema description');
  if (own(schema, 'nullable') && typeof schema.nullable !== 'boolean') fail('nullable flag');
  if (schema.type === 'object') {
    if (!record(schema.properties) || !Array.isArray(schema.order) ||
        schema.order.some(key => !label(key) || !own(schema.properties, key)) ||
        new Set(schema.order).size !== schema.order.length ||
        Object.keys(schema.properties).length !== schema.order.length) fail('complete schema field order required');
    if (own(schema, 'required') && (!Array.isArray(schema.required) ||
        schema.required.some(key => !schema.order.includes(key)) || new Set(schema.required).size !== schema.required.length)) fail('required fields');
    schema.order.forEach(key => validateSchema(schema.properties[key]));
  } else if (['properties','order','required'].some(key => own(schema,key))) fail('object schema keywords');
  if (schema.type === 'array') {
    if (!own(schema, 'items')) fail('array item schema required');
    validateSchema(schema.items);
  } else if (own(schema, 'items') || own(schema, 'maxItems')) fail('array schema keywords');
  if (own(schema, 'maxLength') && schema.type !== 'string') fail('string schema keyword');
  for (const key of ['maxItems','maxLength']) if (own(schema,key) && (!Number.isSafeInteger(schema[key]) || schema[key] < 0)) fail('schema limit');
  if (own(schema, 'enum')) {
    if (['object','array'].includes(schema.type) || !Array.isArray(schema.enum) || !schema.enum.length) fail('scalar enum required');
    const withoutEnum = { ...schema }; delete withoutEnum.enum;
    schema.enum.forEach(value => selectValue(withoutEnum,value));
    if (new Set(schema.enum.map(canonical)).size !== schema.enum.length) fail('duplicate enum value');
  }
}

// Full source objects may have other fields. Only trusted schema fields are read
// and copied. The issued result has a closed shape; sources cannot supply schema.
function selectValue(schema, value) {
  if (value === null && (schema.nullable || schema.type === 'null')) {
    if (own(schema,'enum') && !schema.enum.includes(null)) fail('enum value');
    return null;
  }
  switch (schema.type) {
    case 'object': {
      if (!record(value)) fail('expected object');
      const entries = [];
      for (const key of schema.order) {
        if (!own(value,key)) {
          if ((schema.required || []).includes(key)) fail('missing required field '+key);
        } else entries.push([key, selectValue(schema.properties[key],value[key])]);
      }
      return Object.fromEntries(entries);
    }
    case 'array':
      if (!Array.isArray(value) || value.length > (schema.maxItems ?? 128)) fail('array value or limit');
      return value.map(item => selectValue(schema.items,item));
    case 'string':
      if (typeof value !== 'string' || value.length > (schema.maxLength ?? 65536)) fail('string value or limit');
      break;
    case 'number': case 'integer':
      if (typeof value !== 'number' || !Number.isFinite(value) ||
          (schema.type === 'integer' && !Number.isSafeInteger(value))) fail('number value');
      break;
    case 'boolean': if (typeof value !== 'boolean') fail('boolean value'); break;
    default: fail('null required');
  }
  if (own(schema,'enum') && !schema.enum.some(option => Object.is(option,value))) fail('enum value');
  return value;
}

function schemaView(schema) {
  const result = { type: schema.type };
  if (schema.nullable) result.nullable = true;
  if (own(schema,'description')) result.description = schema.description;
  if (own(schema,'enum')) result.choices = schema.enum;
  if (own(schema,'maxItems')) result.maxItems = schema.maxItems;
  if (own(schema,'maxLength')) result.maxLength = schema.maxLength;
  if (schema.type === 'object') {
    result.fields = Object.fromEntries(schema.order.map(key => [key, {
      ...schemaView(schema.properties[key]), required: (schema.required || []).includes(key),
    }]));
  }
  if (schema.type === 'array') result.items = schemaView(schema.items);
  return result;
}

function validateProfiles(profiles) {
  checkTree(profiles);
  if (!record(profiles) || !Object.keys(profiles).length) fail('profiles required');
  for (const [id, profile] of Object.entries(profiles)) {
    if (!label(id)) fail('profile name');
    keys(profile, ['role','purpose','systemPrompt','instructions','maxTokens','blocks'],
      ['role','purpose','systemPrompt','instructions','maxTokens','blocks'], 'profile');
    if (![profile.role,profile.purpose].every(label) || ![profile.systemPrompt,profile.instructions].every(x => typeof x === 'string' && x.length) ||
        !Number.isSafeInteger(profile.maxTokens) || profile.maxTokens < 1 || !Array.isArray(profile.blocks) || !profile.blocks.length || profile.blocks.length > 128) fail('profile values');
    const ids = new Set(), titles = new Set();
    for (const block of profile.blocks) {
      keys(block,['id','object','schema','source','values','placement','includeSchema'],['id','object','schema','placement'],'block');
      if (!label(block.id) || ids.has(block.id) || !label(block.object) ||
          !['catalog','history','data'].includes(block.placement) ||
          own(block,'source') === own(block,'values') ||
          (own(block,'source') && (!label(block.source) || block.placement === 'catalog')) ||
          (own(block,'includeSchema') && typeof block.includeSchema !== 'boolean')) fail('block values');
      ids.add(block.id);
      for (const title of [block.object, ...(block.includeSchema ? [block.object+' schema'] : [])]) {
        if (titles.has(title)) fail('duplicate object boundary');
        titles.add(title);
      }
      validateSchema(block.schema);
      if (own(block,'values')) selectValue(block.schema,block.values);
      // Reject metadata-bearing schema labels even when current values are absent.
      renderPromptView({sections:[{title:block.object+' schema',content:schemaView(block.schema)}]});
    }
  }
  return profiles;
}

/** YAML/JSON for trusted configuration only; parsing cannot grant trust. */
export function decodeProjectionProfiles(text, format = 'yaml') {
  return validateProfiles(decodeStructured(text, format));
}

/** Values are decoded separately so an observation cannot replace the profile. */
export function decodeProjectionSnapshot(text, format = 'json') {
  const snapshot = decodeStructured(text,format);
  validateSnapshot(snapshot);
  return snapshot;
}

function validateSnapshot(snapshot) {
  checkTree(snapshot);
  keys(snapshot,['revision','values'],['revision','values'],'snapshot');
  if (!Number.isSafeInteger(snapshot.revision) || snapshot.revision < 0 || !record(snapshot.values)) fail('snapshot values');
}

function validateRequest(request) {
  checkTree(request);
  keys(request,['profile','scope','task','step','checkpoint','revision'],['profile','scope','task','step','checkpoint','revision'],'request');
  if (!['profile','scope','task','step','checkpoint'].every(key => label(request[key])) ||
      !Number.isSafeInteger(request.revision) || request.revision < 0) fail('request binding');
}

/** authorize is mandatory, synchronous trusted host code. It must consult current
 * identity/ACL, task/step eligibility, policy binding, revision and expiry. A cached
 * block never substitutes for this callback. countTokens must match the target.
 */
export function createProjectionEngine({ profiles, authorize, countTokens, cacheEntries = 128 }) {
  profiles = clone(validateProfiles(profiles));
  if (typeof authorize !== 'function' || typeof countTokens !== 'function' ||
      !Number.isSafeInteger(cacheEntries) || cacheEntries < 0 || cacheEntries > 1024) fail('engine bindings');
  const slices = new WeakMap(), cache = new Map();
  let hits = 0, misses = 0;
  function admit(request, profile) {
    // Pass copies: host callbacks cannot mutate the engine's frozen selection.
    if (authorize(clone({ ...request, role:profile.role, purpose:profile.purpose,
      profileDigest:digest(profile) })) !== true) fail('admission denied');
  }
  function render(title, content, schema, cacheScope) {
    // Preserve trusted field order: canonical object sorting alone would collide
    // for two profiles that intentionally render the same fields in another order.
    const key = digest({format:'schema-values-text@1',title,schemaDigest:digest(schema),orderedContent:JSON.stringify(content),cacheScope});
    if (cache.has(key)) {
      hits++; const text=cache.get(key); cache.delete(key); cache.set(key,text); return text;
    }
    misses++;
    const text = renderPromptView({sections:[{title,content}]});
    if (cacheEntries) {
      cache.set(key,text);
      if (cache.size > cacheEntries) cache.delete(cache.keys().next().value);
    }
    return text;
  }
  function assemble(record) {
    const result = assembleRenderedContext({systemPrompt:record.profile.systemPrompt,
      instructions:record.profile.instructions, catalogText:record.catalog.join('\n'),
      historyTexts:record.history, dataText:record.data.join('\n'),
      runtimeManifest:{...record.request, role:record.profile.role, purpose:record.profile.purpose,
        profile_digest:digest(record.profile), slice_digest:record.sliceDigest} });
    const tokens = countTokens(clone(result.messages));
    if (!Number.isSafeInteger(tokens) || tokens < 1 || tokens > record.profile.maxTokens) fail('context token budget');
    return result;
  }
  return Object.freeze({
    issue(request, snapshot) {
      validateRequest(request); validateSnapshot(snapshot);
      request=clone(request);
      if (!own(profiles,request.profile)) fail('unregistered profile');
      const profile=profiles[request.profile];
      if (request.revision !== snapshot.revision) fail('stale snapshot');
      admit(request,profile);
      const selected = profile.blocks.map(block => {
        const source = own(block,'values') ? block.values : snapshot.values[block.source];
        if (!own(block,'values') && !own(snapshot.values,block.source)) fail('missing source block');
        return {block, value:selectValue(block.schema,source)};
      });
      const record={request,profile,catalog:[],history:[],data:[],sliceDigest:digest(selected)};
      for (const {block,value} of selected) {
        if (block.includeSchema) record.catalog.push(render(block.object+' schema',schemaView(block.schema),block.schema,'approved-definition'));
        const scope=own(block,'values') ? 'approved-definition' :
          {scope:request.scope,task:request.task,step:request.step,role:profile.role,purpose:profile.purpose};
        record[block.placement].push(render(block.object,value,block.schema,scope));
      }
      // Validate the complete request budget, not just individual blocks.
      assemble(record);
      const slice=Object.freeze({}); slices.set(slice,record); return slice;
    },
    assemble(slice, request) {
      validateRequest(request);
      const record=slices.get(slice);
      if (!record || canonical(request) !== canonical(record.request)) fail('slice binding mismatch');
      admit(record.request,record.profile); // Revocation/expiry can change after issue.
      return assemble(record);
    },
    cacheStats() { return {hits,misses,entries:cache.size}; },
    clearCache() { cache.clear(); },
  });
}
