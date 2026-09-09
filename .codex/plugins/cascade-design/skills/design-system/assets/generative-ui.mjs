// Cascade Hybrid reference: a bounded template catalog, not a transport or agent runtime.
const LIMIT = 16384;
const identifier = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;
const copy = (value) => JSON.parse(JSON.stringify(value));
const fail = (message) => { throw new TypeError(message); };
function object(value, required, optional = []) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('Expected an object');
  if (required.some((key) => !Object.hasOwn(value, key))) fail('Missing required field');
  if (Object.keys(value).some((key) => !required.includes(key) && !optional.includes(key))) fail('Unknown field');
}
function text(value, max = 240) {
  if (typeof value !== 'string' || !value.trim() || value.length > max) fail('Invalid text');
}
function id(value) { if (typeof value !== 'string' || !identifier.test(value)) fail('Invalid identifier'); }
function list(value, min, max) {
  if (!Array.isArray(value) || value.length < min || value.length > max) fail('Invalid list size');
}

// The catalog owns template names, accepted data and semantic action names.
// Component markup and behavior are frontend code; payloads cannot supply either.
export const catalog = Object.freeze({
  choice: Object.freeze({
    action: 'select_option',
    validate(view) {
      object(view, ['template', 'title', 'description', 'options']);
      text(view.title, 120); text(view.description);
      list(view.options, 1, 6);
      for (const option of view.options) {
        object(option, ['id', 'label', 'detail']);
        id(option.id); text(option.label, 80); text(option.detail, 160);
      }
      if (new Set(view.options.map((option) => option.id)).size !== view.options.length) fail('Duplicate option');
    },
  }),
  summary: Object.freeze({
    action: 'confirm_summary',
    validate(view) {
      object(view, ['template', 'title', 'fields']);
      text(view.title, 120); list(view.fields, 1, 8);
      for (const field of view.fields) {
        object(field, ['label', 'value']); text(field.label, 80); text(field.value);
      }
    },
  }),
  result: Object.freeze({
    action: null,
    validate(view) {
      object(view, ['template', 'title', 'state', 'message']);
      text(view.title, 120); text(view.message, 500);
      if (!['pending', 'success', 'error'].includes(view.state)) fail('Invalid result state');
    },
  }),
});

/** Decode one complete JSON snapshot. Transport code bounds bytes before parsing. */
export function decodeEvent(input) {
  const encoded = typeof input === 'string' ? input : JSON.stringify(input);
  if (typeof encoded !== 'string' || new TextEncoder().encode(encoded).length > LIMIT) fail('Event exceeds 16 KiB');
  const event = JSON.parse(encoded);
  if (!event || !['surface.replace', 'surface.remove'].includes(event.type)) fail('Unknown event type');
  object(event, ['version', 'type', 'runId', 'surfaceId', 'revision'], event.type === 'surface.replace' ? ['view', 'ackActionId'] : ['ackActionId']);
  if (event.version !== 1) fail('Unsupported event version');
  id(event.runId); id(event.surfaceId);
  if (!Number.isSafeInteger(event.revision) || event.revision < 1) fail('Invalid revision');
  if (Object.hasOwn(event, 'ackActionId')) text(event.ackActionId, 240);
  if (event.type === 'surface.replace') {
    if (!event.view || typeof event.view.template !== 'string' || !Object.hasOwn(catalog, event.view.template)) fail('Unknown template');
    catalog[event.view.template].validate(event.view);
  }
  return event;
}

/** One host-bound run and surface. Applying/replaying snapshots emits no actions. */
export function createSurface({ runId, surfaceId, allowedActions = [] }) {
  id(runId); id(surfaceId);
  if (!Array.isArray(allowedActions) || allowedActions.some((action) => !['select_option', 'confirm_summary'].includes(action))) fail('Unknown allowed action');
  const actions = new Set(allowedActions);
  let current = { revision: 0, view: null, selectedId: null, pending: false };
  let pendingActionId = null;
  return Object.freeze({
    read: () => copy(current),
    apply(input) {
      let event;
      try { event = decodeEvent(input); } catch (error) { return { status: 'rejected', reason: error.message }; }
      if (event.runId !== runId || event.surfaceId !== surfaceId) return { status: 'rejected', reason: 'Wrong run or surface' };
      if (event.revision <= current.revision) return { status: 'ignored', reason: 'Stale or duplicate snapshot' };
      if (pendingActionId && event.ackActionId !== pendingActionId) return { status: 'ignored', reason: 'Awaiting the active action acknowledgement' };
      const view = event.type === 'surface.replace' ? event.view : null;
      const selectedId = view?.template === 'choice' && view.options.some((option) => option.id === current.selectedId) ? current.selectedId : null;
      current = { revision: event.revision, view, selectedId, pending: false };
      pendingActionId = null;
      return { status: 'applied' };
    },
    select(optionId) {
      if (current.pending || current.view?.template !== 'choice' || !current.view.options.some((option) => option.id === optionId)) return false;
      current.selectedId = optionId;
      return true;
    },
    requestAction() {
      const action = current.view && catalog[current.view.template].action;
      if (!actions.has(action) || current.pending || (action === 'select_option' && !current.selectedId)) return null;
      current.pending = true;
      pendingActionId = `${runId}:${surfaceId}:${current.revision}:${action}`;
      // Stable within this run/surface/revision; the server must scope and deduplicate it.
      return {
        version: 1, type: 'ui.action', runId, surfaceId, revision: current.revision,
        actionId: pendingActionId,
        action, values: action === 'select_option' ? { optionId: current.selectedId } : {},
      };
    },
    canAct() {
      const action = current.view && catalog[current.view.template].action;
      return actions.has(action) && !current.pending && (action !== 'select_option' || Boolean(current.selectedId));
    },
  });
}

let mountNumber = 0;
/** Mount within an existing .cascade-hybrid root. The host supplies action handling. */
export function mountSurface(container, { runId, surfaceId, allowedActions = [], onAction } = {}) {
  if (!container?.ownerDocument) fail('A DOM container is required');
  const model = createSurface({ runId, surfaceId, allowedActions: typeof onAction === 'function' ? allowedActions : [] });
  const doc = container.ownerDocument;
  const group = `hy-gen-choice-${++mountNumber}`;
  let disposed = false;
  const region = doc.createElement('section');
  region.className = 'hy-gen-surface';
  const announcer = doc.createElement('p');
  announcer.className = 'hy-gen-announcement hy-small hy-muted';
  announcer.setAttribute('role', 'status');
  container.replaceChildren(region, announcer);

  function element(tag, className, content) {
    const node = doc.createElement(tag);
    node.className = className;
    if (content !== undefined) node.textContent = content;
    return node;
  }
  function render() {
    const state = model.read();
    const view = state.view;
    const previousFocus = region.contains(doc.activeElement) ? doc.activeElement?.dataset.focusKey : null;
    region.replaceChildren();
    region.setAttribute('aria-busy', String(state.pending || view?.state === 'pending'));
    if (!view) { region.append(element('p', 'hy-muted', 'Очікуємо дані…')); return; }
    const body = element('div', 'hy-body');
    body.append(element('h2', 'hy-heading', view.title));
    region.append(body);
    if (view.template === 'choice') {
      body.append(element('p', 'hy-muted', view.description));
      const fieldset = element('fieldset', 'hy-choice-field hy-gen-options');
      fieldset.append(element('legend', 'hy-label', 'Варіанти'));
      for (const option of view.options) {
        const label = element('label', 'hy-choice hy-gen-option');
        const input = doc.createElement('input');
        input.type = 'radio'; input.name = group; input.value = option.id;
        input.checked = option.id === state.selectedId;
        input.disabled = state.pending;
        input.dataset.focusKey = option.id;
        const description = element('span', 'hy-gen-option-copy');
        description.append(element('span', 'hy-list-title', option.label), element('span', 'hy-small hy-muted', option.detail));
        input.addEventListener('change', () => {
          model.select(option.id);
          const button = region.querySelector('[data-primary-action]');
          if (button) button.disabled = !model.canAct();
        });
        label.append(input, description); fieldset.append(label);
      }
      body.append(fieldset);
    } else if (view.template === 'summary') {
      const details = element('dl', 'hy-gen-details');
      for (const field of view.fields) {
        const row = element('div', 'hy-list-row');
        row.append(element('dt', 'hy-muted', field.label), element('dd', 'hy-list-title', field.value));
        details.append(row);
      }
      body.append(details);
    } else {
      const labels = { pending: 'Очікуємо результат', success: 'Виконано', error: 'Потрібна увага' };
      const badge = element('span', 'hy-status', labels[view.state]);
      badge.dataset.state = view.state === 'pending' ? 'warning' : view.state;
      body.append(badge, element('p', 'hy-gen-result', view.message));
    }
    if (catalog[view.template].action) {
      const zone = element('div', 'hy-action-zone');
      const bar = element('div', 'hy-action-bar');
      bar.append(element('p', 'hy-small hy-muted', state.pending ? 'Очікуємо відповідь…' : view.template === 'choice' ? 'Оберіть один варіант' : 'Перевірте дані перед дією'));
      const button = element('button', 'hy-button hy-button--primary', state.pending ? 'Надіслано' : view.template === 'choice' ? 'Продовжити' : 'Підтвердити');
      button.type = 'button'; button.disabled = !model.canAct();
      button.dataset.primaryAction = ''; button.dataset.focusKey = 'primary-action';
      button.addEventListener('click', () => {
        if (disposed) return;
        const intent = model.requestAction();
        if (!intent) return;
        render();
        delete announcer.dataset.visible;
        announcer.textContent = 'Запит надіслано. Очікуємо результат.';
        // Delivery failure is an unknown outcome. Keep the lock until a fresh server snapshot.
        const failed = () => {
          if (disposed) return;
          announcer.dataset.visible = 'true';
          announcer.textContent = 'Не вдалося отримати відповідь. Потрібне оновлення стану.';
        };
        try { Promise.resolve(onAction(intent)).catch(failed); } catch { failed(); }
      });
      bar.append(button); zone.append(bar); region.append(zone);
    }
    if (previousFocus) {
      const target = [...region.querySelectorAll('[data-focus-key]')].find((node) => node.dataset.focusKey === previousFocus && !node.disabled);
      target?.focus();
    }
  }
  render();
  return Object.freeze({
    read: model.read,
    receive(input) {
      if (disposed) return { status: 'ignored', reason: 'Surface was destroyed' };
      const result = model.apply(input);
      if (result.status === 'applied') { render(); delete announcer.dataset.visible; announcer.textContent = model.read().view?.title ?? 'Область закрито.'; }
      if (result.status === 'rejected') {
        announcer.dataset.visible = 'true';
        announcer.textContent = 'Не вдалося оновити цю область. Попередні дані збережено.';
      }
      return result;
    },
    destroy() { disposed = true; container.replaceChildren(); },
  });
}
