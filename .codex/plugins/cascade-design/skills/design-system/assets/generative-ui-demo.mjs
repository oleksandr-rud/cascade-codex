import { mountSurface } from './generative-ui.mjs';
import examples from '../templates/generative-ui-events.json' with { type: 'json' };

const root = document.getElementById('cascade-generative-ui');
const picker = root.querySelector('[data-template]');
const refresh = root.querySelector('[data-refresh]');
const eventText = root.querySelector('[data-event]');
const clone = (value) => JSON.parse(JSON.stringify(value));
let revision = 0;
let activeTime = '11:00–12:00';
let requestGeneration = 0;
let lastInbound;

function show(template, ackActionId) {
  requestGeneration += 1;
  const index = { choice: 0, summary: 1, pending: 2, success: 3, error: 4 }[template];
  const event = clone(examples[index]);
  event.revision = ++revision;
  if (ackActionId) event.ackActionId = ackActionId;
  if (template === 'summary') event.view.fields[1].value = `10 вересня · ${activeTime}`;
  if (surface.receive(event).status !== 'applied') return;
  picker.disabled = false;
  refresh.disabled = false;
  lastInbound = event;
  eventText.textContent = JSON.stringify(event, null, 2);
  if (template !== 'pending') picker.value = template;
}
const surface = mountSurface(root.querySelector('[data-surface]'), {
  runId: 'demo-run', surfaceId: 'lesson', allowedActions: ['select_option', 'confirm_summary'],
  onAction(intent) {
    picker.disabled = true;
    refresh.disabled = true;
    const generation = ++requestGeneration;
    eventText.textContent = JSON.stringify(intent, null, 2);
    if (intent.action === 'select_option') {
      activeTime = intent.values.optionId === 'afternoon' ? '14:00–15:00' : '11:00–12:00';
      // A visible pause demonstrates the outbound intent before a simulated host response.
      setTimeout(() => { if (generation === requestGeneration) show('summary', intent.actionId); }, 600);
    } else {
      setTimeout(() => {
        if (generation !== requestGeneration) return;
        show('pending', intent.actionId);
        const pendingGeneration = requestGeneration;
        setTimeout(() => { if (pendingGeneration === requestGeneration) show('success'); }, 750);
      }, 300);
    }
  },
});
picker.addEventListener('change', () => show(picker.value));
refresh.addEventListener('click', () => {
  if (lastInbound.view.template === 'choice') {
    const event = clone(lastInbound);
    event.revision = ++revision;
    event.view.description = '10 вересня · онлайн · доступність оновлено';
    surface.receive(event);
    lastInbound = event;
    eventText.textContent = JSON.stringify(event, null, 2);
  } else show(picker.value);
});
for (const button of root.querySelectorAll('[data-layout]')) {
  button.addEventListener('click', () => {
    for (const sibling of root.querySelectorAll('[data-layout]')) sibling.removeAttribute('aria-current');
    button.setAttribute('aria-current', 'page');
    root.querySelector('[data-chat]').hidden = button.dataset.layout !== 'chat';
    root.querySelector('[data-web]').hidden = button.dataset.layout !== 'web';
  });
}
show('choice');
