import { test, expect } from 'bun:test';
import { catalog, createSurface, decodeEvent } from '../skills/design-system/assets/generative-ui.mjs';
import examples from '../skills/design-system/templates/generative-ui-events.json';

const clone = (value) => JSON.parse(JSON.stringify(value));
const make = (allowedActions = ['select_option', 'confirm_summary']) => createSurface({ runId: 'demo-run', surfaceId: 'lesson', allowedActions });

test('the example stream covers the catalog and removal without emitting an action', () => {
  const surface = make();
  const kinds = new Set();
  for (const event of examples) {
    expect(decodeEvent(JSON.stringify(event))).toEqual(event);
    expect(surface.apply(event).status).toBe('applied');
    expect(surface.read().pending).toBe(false);
    if (event.view) kinds.add(event.view.template);
  }
  expect([...kinds].sort()).toEqual(Object.keys(catalog).sort());
  expect(surface.read().view).toBe(null);
  expect(surface.apply(examples[0]).status).toBe('ignored');
});

test('invalid, foreign and oversized events preserve the last accepted state', () => {
  const surface = make();
  surface.apply(examples[0]);
  const before = surface.read();
  const changed = (fn) => { const event = clone(examples[1]); fn(event); return event; };
  const invalid = [null, '{', changed((e) => { e.version = 2; }),
    changed((e) => { e.runId = 'another-run'; }), changed((e) => { e.surfaceId = 'another-surface'; }),
    changed((e) => { e.view.template = '__proto__'; }), changed((e) => { e.view.html = '<img onerror=alert(1)>'; }),
    changed((e) => { e.view.template = ['summary']; }),
    changed((e) => { e.view.fields = []; }), changed((e) => { e.revision = 1.5; }),
    changed((e) => { e.view.title = 'x'.repeat(17000); })];
  const duplicate = clone(examples[0]); duplicate.revision = 2; duplicate.view.options[1].id = duplicate.view.options[0].id;
  invalid.push(duplicate);
  for (const event of invalid) {
    expect(surface.apply(event).status).toBe('rejected');
    expect(surface.read()).toEqual(before);
  }
});

test('actions require host capability and selection, lock once, and need correlated acknowledgement', () => {
  const readOnly = make([]); readOnly.apply(examples[0]); readOnly.select('morning');
  expect(readOnly.requestAction()).toBe(null);
  const surface = make(); surface.apply(examples[0]);
  expect(surface.requestAction()).toBe(null);
  expect(surface.select('not-an-option')).toBe(false);
  surface.select('afternoon');
  const intent = surface.requestAction();
  expect(intent).toEqual({ version: 1, type: 'ui.action', runId: 'demo-run', surfaceId: 'lesson', revision: 1,
    actionId: 'demo-run:lesson:1:select_option', action: 'select_option', values: { optionId: 'afternoon' } });
  expect(surface.requestAction()).toBe(null);
  expect(surface.select('morning')).toBe(false);
  expect(surface.apply(examples[1]).status).toBe('ignored');
  expect(surface.apply({ ...examples[1], ackActionId: 'unrelated-action' }).status).toBe('ignored');
  expect(surface.read().pending).toBe(true);
  expect(surface.apply({ ...examples[1], ackActionId: intent.actionId }).status).toBe('applied');
  const confirm = surface.requestAction();
  expect(confirm.action).toBe('confirm_summary');
  expect(surface.apply({ ...examples[2], ackActionId: confirm.actionId }).status).toBe('applied');
  expect(surface.read().view.state).toBe('pending');
  expect(surface.requestAction()).toBe(null);
  expect(surface.apply(examples[3]).status).toBe('applied');
  expect(surface.read().view.state).toBe('success');
  expect(surface.requestAction()).toBe(null);
});

test('new snapshots preserve valid selection and isolate caller-owned data', () => {
  const surface = make();
  const first = clone(examples[0]); surface.apply(first); surface.select('afternoon');
  first.view.options[1].label = 'mutated externally';
  expect(surface.read().view.options[1].label).toBe('14:00–15:00');
  const next = clone(examples[0]); next.revision = 7;
  expect(surface.apply(next).status).toBe('applied');
  expect(surface.read().selectedId).toBe('afternoon');
  expect(surface.apply({ ...next, revision: 6 }).status).toBe('ignored');
  next.revision = 8; next.view.options.pop();
  expect(surface.apply(next).status).toBe('applied');
  expect(surface.read().selectedId).toBe(null);
  const readback = surface.read(); readback.view.options.length = 0;
  expect(surface.read().view.options).toHaveLength(1);
});
