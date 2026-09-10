// Host-only public-contract checks. Never copy this file into the builder.
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const sorted = requests => [...requests].sort((a, b) => a.id.localeCompare(b.id));
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

export async function accept({ url, phase, evidenceRoot, chromium, previous = [], signal }) {
  const checks = [], wire = [];
  const check = async (id, operation) => {
    signal?.throwIfAborted();
    try { await operation(); checks.push({ id, status: 'PASS' }); }
    catch (error) { checks.push({ id, status: 'FAIL', error: error.message }); }
  };
  const request = async (path, { method = 'GET', body, raw, type = 'application/json' } = {}) => {
    const response = await fetch(`${url}${path}`, {
      method, headers: { 'Content-Type': type },
      body: raw ?? (body === undefined ? undefined : JSON.stringify(body)),
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(5000)]) : AbortSignal.timeout(5000),
    });
    const text = await response.text();
    let json;
    try { json = JSON.parse(text); } catch { /* CSV and HTML are raw evidence. */ }
    const result = { status: response.status, headers: Object.fromEntries(response.headers), text, json };
    wire.push({ path, method, input: raw ?? body, ...result });
    return result;
  };
  const list = async () => {
    const result = await request('/api/requests');
    assert.equal(result.status, 200);
    assert(Array.isArray(result.json?.requests));
    return result.json.requests;
  };
  const invalid = (result, allowed = [400]) => {
    assert(allowed.includes(result.status), `invalid input returned ${result.status}`);
    assert.equal(typeof result.json?.error?.message, 'string');
    assert(result.json.error.message.trim());
  };
  let created;
  await check('initial-state-and-upgrade-preservation', async () => {
    assert.deepEqual(sorted(await list()), sorted(previous));
  });
  await check('create-trim-unicode-and-defaults', async () => {
    const response = await request('/api/requests', { method: 'POST', body: {
      title: `  Valve Київ ${phase}  `, description: 'Line one, with "quotes"\nSecond line',
    } });
    assert.equal(response.status, 201);
    created = response.json?.request;
    assert.equal(created?.title, `Valve Київ ${phase}`);
    assert.equal(created?.status, 'open');
    assert.equal(typeof created?.id, 'string');
    assert(created.id.length > 0);
    assert.equal(created.description, 'Line one, with "quotes"\nSecond line');
  });
  await check('edit-and-combined-filters', async () => {
    assert(created, 'creation prerequisite failed');
    const response = await request(`/api/requests/${encodeURIComponent(created.id)}`, {
      method: 'PATCH', body: { status: 'in_progress' },
    });
    assert.equal(response.status, 200);
    assert.equal(response.json.request.id, created.id);
    assert.equal(response.json.request.title, created.title);
    assert.equal(response.json.request.status, 'in_progress');
    const found = await request(`/api/requests?status=in_progress&q=${encodeURIComponent(`vALVe Київ ${phase}`)}`);
    assert.deepEqual(found.json.requests.map(item => item.id), [created.id]);
    const excluded = await request(`/api/requests?status=done&q=${encodeURIComponent(created.title)}`);
    assert.deepEqual(excluded.json.requests, []);
  });
  await check('rejected-writes-are-atomic', async () => {
    assert(created, 'creation prerequisite failed');
    const before = sorted(await list());
    for (const body of [
      null, [], { title: '' }, { title: '  ' }, { title: 'x'.repeat(121) }, { title: 7 },
      { title: '🔧'.repeat(121) },
      { title: 'valid', description: null }, { title: 'valid', description: 'x'.repeat(2001) },
      { title: 'valid', status: 'closed' }, { title: 'valid', id: 'caller-owned' },
    ]) invalid(await request('/api/requests', { method: 'POST', body }));
    for (const body of [{}, { status: 1 }, { title: '  ' }, { id: 'replacement' }, { extra: true }]) {
      invalid(await request(`/api/requests/${encodeURIComponent(created.id)}`, { method: 'PATCH', body }));
    }
    invalid(await request('/api/requests', { method: 'POST', raw: '{bad' }));
    invalid(await request('/api/requests?status=missing'));
    const missing = await request('/api/requests/does-not-exist', { method: 'PATCH', body: { title: 'valid' } });
    assert.equal(missing.status, 404);
    assert(missing.json?.error?.message);
    assert.deepEqual(sorted(await list()), before);
  });
  await check('concurrent-successes-are-retained', async () => {
    const results = await Promise.all(Array.from({ length: 8 }, (_, index) =>
      request('/api/requests', { method: 'POST', body: { title: `Concurrent ${phase}-${index}` } })));
    for (const result of results) assert.equal(result.status, 201);
    const ids = results.map(result => result.json.request.id);
    assert.equal(new Set(ids).size, 8);
    const current = await list();
    for (const id of ids) assert(current.some(item => item.id === id));
  });
  await check('literal-user-text', async () => {
    const result = await request('/api/requests', { method: 'POST', body: {
      title: `<img src=x onerror="window.__pilotXss=1"> ${phase}`,
      description: '<script>window.__pilotXss=2</script>',
    } });
    assert.equal(result.status, 201);
    const boundary = await request('/api/requests', { method: 'POST', body: { title: '🔧'.repeat(120) } });
    assert.equal(boundary.status, 201);
  });

  if (phase === 2) {
    await check('csv-import-preserves-cell-content-and-existing-data', async () => {
      const before = sorted(await list());
      const result = await request('/api/requests/import.csv', { method: 'POST', type: 'text/csv',
        raw: 'title,description,status\r\n"CSV, Київ","Line ""one""\nLine two",done\r\n' });
      assert.equal(result.status, 201);
      assert.equal(result.json.imported, 1);
      const current = await list();
      assert.deepEqual(sorted(current.filter(item => before.some(old => old.id === item.id))), before);
      const item = current.find(item => item.title === 'CSV, Київ');
      assert.equal(item?.description, 'Line "one"\nLine two');
      assert.equal(item.status, 'done');
      const empty = await request('/api/requests/import.csv', { method: 'POST', type: 'text/csv', raw: 'title,description,status\n' });
      assert.equal(empty.status, 201);
      assert.equal(empty.json.imported, 0);
    });
    await check('csv-invalid-imports-are-atomic-and-bounded', async () => {
      const before = sorted(await list());
      for (const raw of [
        'title,description,status\nValid,,open\nInvalid,,closed\n',
        'title,description,status\n"unclosed,,open\n',
        'title,description,status\n"closed"junk,,open\n',
        'title,description,status\nValid,too,many,columns\n',
        'wrong,description,status\nValid,,open\n',
        `title,description,status\n${'Valid,,open\n'.repeat(1001)}`,
        `title,description,status\nValid,${'x'.repeat(1024 * 1024)},open\n`,
      ]) {
        invalid(await request('/api/requests/import.csv', { method: 'POST', type: 'text/csv', raw }),
          raw.length > 10000 ? [400, 413] : [400]);
        assert.deepEqual(sorted(await list()), before);
      }
    });
    await check('csv-export-independent-parser-roundtrip', async () => {
      const response = await request('/api/requests/export.csv');
      assert.equal(response.status, 200);
      assert.match(response.headers['content-type'], /^text\/csv/i);
      assert.match(response.headers['content-disposition'], /attachment.*filename/i);
      const parsed = spawnSync('python3', ['-c', 'import csv,io,json,sys; print(json.dumps(list(csv.reader(io.StringIO(sys.stdin.read()),strict=True))))'], {
        input: response.text, encoding: 'utf8', timeout: 5000,
      });
      assert.equal(parsed.status, 0, parsed.stderr);
      const [header, ...rows] = JSON.parse(parsed.stdout);
      assert.deepEqual(header, ['id', 'title', 'description', 'status']);
      assert.deepEqual(rows.sort((a, b) => a[0].localeCompare(b[0])),
        sorted(await list()).map(item => header.map(field => item[field])));
    });
  }

  let browser;
  signal?.addEventListener('abort', () => { void browser?.close(); }, { once: true });
  await check('browser-journeys-and-recovery', async () => {
    browser = await chromium.launch({ headless: true });
    if (signal?.aborted) { await browser.close(); signal.throwIfAborted(); }
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: 'block' });
    await context.route('**/*', route => {
      const destination = new URL(route.request().url());
      return destination.origin === url ? route.continue() : route.abort();
    });
    const page = await context.newPage();
    page.setDefaultTimeout(7000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(url);
    const action = name => page.getByRole('button', { name, exact: true }).or(
      page.getByRole('link', { name, exact: true }));
    await action('New request').click();
    await page.getByLabel('Title', { exact: true }).fill(`Browser created ${phase}`);
    await page.getByLabel('Description', { exact: true }).fill('Created through the browser');
    await page.getByLabel('Status', { exact: true }).selectOption('open');
    await page.getByRole('button', { name: 'Save request', exact: true }).click();
    for (let attempt = 0; attempt < 30; attempt++) {
      if ((await list()).some(item => item.title === `Browser created ${phase}`)) break;
      await sleep(100);
    }
    assert((await list()).some(item => item.title === `Browser created ${phase}`));
    const search = page.getByLabel('Search requests', { exact: true });
    await search.fill(`Browser created ${phase}`);
    await page.getByText(`Browser created ${phase}`, { exact: true }).first().waitFor();
    const beforeEdit = (await list()).find(item => item.title === `Browser created ${phase}`);
    await action('Edit request').first().click();
    await page.getByLabel('Description', { exact: true }).fill('Edited through the browser');
    await page.getByRole('button', { name: 'Save request', exact: true }).click();
    for (let attempt = 0; attempt < 30; attempt++) {
      if ((await list()).find(item => item.id === beforeEdit.id)?.description === 'Edited through the browser') break;
      await sleep(100);
    }
    assert.equal((await list()).find(item => item.id === beforeEdit.id)?.description, 'Edited through the browser');
    await page.getByLabel('Filter status', { exact: true }).selectOption('done');
    await page.getByText(`Browser created ${phase}`, { exact: true }).first().waitFor({ state: 'hidden' });
    await page.getByLabel('Filter status', { exact: true }).selectOption({ label: 'All statuses' });
    await search.fill('');
    await page.getByText(`Browser created ${phase}`, { exact: true }).first().waitFor();
    assert.equal(await page.evaluate(() => window.__pilotXss), undefined);
    await page.screenshot({ path: join(evidenceRoot, `phase-${phase}-list.png`), fullPage: true });
    let intercepted = 0;
    const failure = async route => {
      if (route.request().method() === 'POST') { intercepted++; await route.abort('failed'); }
      else await route.continue();
    };
    await page.route('**/api/requests', failure);
    await action('New request').click();
    await page.getByLabel('Title', { exact: true }).fill(`Recover draft ${phase}`);
    await page.getByRole('button', { name: 'Save request', exact: true }).click();
    await page.getByRole('alert').filter({ visible: true }).first().waitFor();
    assert.equal(intercepted, 1);
    assert.equal(await page.getByLabel('Title', { exact: true }).inputValue(), `Recover draft ${phase}`);
    assert(!(await list()).some(item => item.title === `Recover draft ${phase}`));
    await page.screenshot({ path: join(evidenceRoot, `phase-${phase}-save-error.png`), fullPage: true });
    await page.unroute('**/api/requests', failure);
    await page.getByRole('button', { name: 'Save request', exact: true }).click();
    for (let attempt = 0; attempt < 30; attempt++) {
      if ((await list()).some(item => item.title === `Recover draft ${phase}`)) break;
      await sleep(100);
    }
    assert((await list()).some(item => item.title === `Recover draft ${phase}`));
    if (phase === 2) {
      const file = join(evidenceRoot, 'browser-import.csv');
      writeFileSync(file, 'title,description,status\nBrowser CSV,Imported from UI,open\n');
      await page.getByLabel('Import CSV', { exact: true }).setInputFiles(file);
      await page.getByRole('button', { name: 'Import requests', exact: true }).click();
      await page.getByText('Browser CSV', { exact: true }).first().waitFor();
      assert((await list()).some(item => item.title === 'Browser CSV'));
      const downloadPromise = page.waitForEvent('download');
      await page.getByRole('link', { name: 'Export CSV', exact: true }).or(
        page.getByRole('button', { name: 'Export CSV', exact: true })).click();
      const download = await downloadPromise;
      await download.saveAs(join(evidenceRoot, 'browser-export.csv'));
      assert.equal(await download.failure(), null);
    }
    assert.deepEqual(errors, []);
    writeFileSync(join(evidenceRoot, `phase-${phase}-page.html`), await page.content());
  });
  await browser?.close();
  let records = [];
  await check('final-record-snapshot', async () => { records = sorted(await list()); });
  writeFileSync(join(evidenceRoot, `phase-${phase}-wire.json`), JSON.stringify(wire, null, 2));
  return { phase, checks, records, status: checks.every(item => item.status === 'PASS') ? 'PASS' : 'FAIL' };
}

export async function verifyPersistence(url, records) {
  const response = await fetch(`${url}/api/requests`, { signal: AbortSignal.timeout(5000) });
  assert.equal(response.status, 200);
  assert.deepEqual(sorted((await response.json()).requests), sorted(records));
}
