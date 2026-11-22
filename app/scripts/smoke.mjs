// The one smoke test: opens dist/index.html from file:// with the network off, visits every route,
// fails on any console error, any request that leaves the file or fails, and any serious or
// critical axe finding, then clicks through Today (the layout shell), the 9:00 a.m. pass, the paste
// flow, an integration's Simulate, a consultant's answer and the guided tour.
// Run after a build: npm run smoke [dist file]
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const { chromium } = createRequire(import.meta.url)('playwright');
const APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = pathToFileURL(path.resolve(process.argv[2] || path.join(APP, 'dist', 'index.html'))).href;

const ROUTES = [
  '/', '/?decide=tesswick', '/?case=AX-101', '/today/9am', '/today/2pm', '/hearings', '/hearings/AX-107', '/measures',
  '/suggestions', '/suggestions/paste', '/replies', '/offices', '/offices/tesswick', '/bench', '/calendar',
  '/integrations', '/integrations/mailbox', '/how', '/ai', '/consultant', '/consultant/owen-tarris',
  '/later/board', '/later/queue', '/later/messages', '/later/try', '/later/counties', '/later/scale',
  '/later/business', '/later/checks', '/later/how', '/evidence', '/agents',
];

// Headless Chromium, without file access between file:// pages, does not always hand a reloaded
// file:// page the localStorage the page saved before the reload: in about half of the traced runs (22 Nov) the
// new page saw only the key its init script wrote, while the old page had saved the session. With
// file access allowed, 8 of 8 runs kept it, so the reload steps test the app's own save and load.
const browser = await chromium.launch({ args: ['--allow-file-access-from-files'] });
const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, offline: true });
// The first-run card ("Take the tour or Skip") would cover the bottom right of every page.
await context.addInitScript(() => { try { localStorage.setItem('hd.firstrun.v1', 'skip'); } catch { /* storage blocked */ } });
const page = await context.newPage();
const errors = [];
const requests = [];
page.on('request', (r) => { if (!/^(file|data|blob):/.test(r.url())) requests.push(`left the file: ${r.url().slice(0, 120)}`); });
page.on('requestfailed', (r) => requests.push(`failed: ${r.url().slice(0, 120)} (${r.failure()?.errorText ?? ''})`));
page.on('console', (m) => { if (m.type() === 'error') errors.push(`${page.url().split('#')[1] ?? ''}: ${m.text()}`); });
page.on('pageerror', (e) => errors.push(`${page.url().split('#')[1] ?? ''}: ${e.message}`));
const failures = [];
const AXE = path.join(APP, 'node_modules', 'axe-core', 'axe.min.js');
const axeFindings = [];
async function axe(route) {
  if (!(await page.evaluate(() => 'axe' in window))) await page.addScriptTag({ path: AXE });
  const found = await page.evaluate(async () => {
    const r = await window.axe.run(document, { resultTypes: ['violations'] });
    return r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => `${v.impact} ${v.id} (${v.nodes.length}): ${v.nodes[0]?.target.join(' ')}`);
  });
  for (const f of found) axeFindings.push(`${route}: ${f}`);
}
const step = async (name, run) => {
  try { await run(); console.log(`ok   ${name}`); } catch (e) { failures.push(name); console.log(`FAIL ${name}: ${e.message.split('\n')[0]}`); }
};

await page.goto(`${file}#/?reset=1`);
await page.waitForSelector('[data-testid="app-shell"]');
const isConsultant = (r) => r.startsWith('/consultant');
for (const r of ROUTES) {
  await step(`route ${r}`, async () => {
    await page.evaluate((h) => { window.location.hash = h; }, r);
    await page.waitForSelector(isConsultant(r) ? 'h1' : 'main h1', { timeout: 5000 });
    const notFound = await page.locator('[data-testid="page-not-found"]').count();
    if (notFound) throw new Error('shows the not-found page');
    await page.waitForTimeout(600);
    await axe(r);
  });
}
await step('text: no double period, ASK runs into its text, or a lone https', async () => {
  const bad = [];
  for (const r of ROUTES) {
    await page.goto(`${file}#${r}`);
    await page.waitForSelector(isConsultant(r) ? 'h1' : '[data-testid="app-shell"]');
    const text = await page.locator('main').first().innerText();
    for (const [name, re] of [['double period', /[a-z]\.\.(?!\.)/], ['ASK with no space', /\bASK[A-Za-z(]/], ['lone https', /(^|\s)https(\s|$)/m]]) {
      const m = text.match(re);
      if (m) bad.push(`${r}: ${name} near "${text.slice(Math.max(0, (m.index ?? 0) - 20), (m.index ?? 0) + 20).replace(/\n/g, ' ')}"`);
    }
  }
  if (bad.length) throw new Error(bad.join('; '));
});
await step('reflow: no page scrolls sideways at 320 or 390 px', async () => {
  const wide = [];
  for (const w of [320, 390]) {
    await page.setViewportSize({ width: w, height: 800 });
    for (const r of ROUTES) {
      await page.goto(`${file}#${r}`);
      await page.waitForSelector(isConsultant(r) ? 'h1' : '[data-testid="app-shell"]');
      await page.waitForTimeout(300);
      const sw = await page.evaluate(() => document.documentElement.scrollWidth);
      if (sw > w) wide.push(`${r} at ${w}: ${sw}`);
    }
  }
  await page.setViewportSize({ width: 1920, height: 1080 });
  if (wide.length) throw new Error(wide.join(', '));
});
await step('no square gate mark and no brand glyph anywhere', async () => {
  const found = [];
  for (const r of ['/', '/hearings', '/hearings/AX-107', '/today/9am', '/suggestions', '/later/board']) {
    await page.goto(`${file}#${r}`);
    await page.waitForSelector('[data-testid="app-shell"]');
    await page.waitForTimeout(300);
    const n = await page.locator('.gate-square, [data-testid^="gate-mark"], [data-testid="brand"] svg').count();
    if (n) found.push(`${r}: ${n}`);
  }
  if (found.length) throw new Error(found.join(', '));
});
await step('Today: the queue equals hearingDesk.queue(), desk-state equals state(), a row selects by URL', async () => {
  await page.goto(`${file}#/`);
  await page.waitForSelector('[data-testid="queue-table"]');
  const rows = await page.locator('[data-testid="queue-group-at-risk"] tr[data-href]').count();
  const api = await page.evaluate(() => window.hearingDesk.queue().filter((q) => q.kind === 'hearing').length);
  if (rows !== api) throw new Error(`${rows} at-risk rows on the page, ${api} in hearingDesk.queue()`);
  const same = await page.evaluate(() => document.getElementById('desk-state')?.textContent === JSON.stringify(window.hearingDesk.state()));
  if (!same) throw new Error('desk-state differs from hearingDesk.state()');
  await page.locator('[data-testid="open-AX-101"]').click();
  await page.waitForFunction(() => window.location.hash.includes('case=AX-101'));
  const checks = await page.locator('[data-testid="hearing-checks-summary-AX-101"]').innerText();
  if (!/^\d of 5 checks done$/.test(checks.trim())) throw new Error(`the row's checks read "${checks}"`);
  await page.locator('[data-testid="checks-count"]').waitFor({ timeout: 5000 });
});
await step('Today: tick a step Done, and it is still ticked after a reload', async () => {
  const box = page.locator('[data-testid^="step-done-AX-101-"]').first();
  const id = await box.getAttribute('data-testid');
  await box.check();
  await page.waitForFunction((k) => (window.hearingDesk.session().todayDone ?? []).includes(k), id.replace('step-done-', '').replace(/^(AX-\d+)-/, '$1:'));
  await page.reload();
  const again = page.locator(`[data-testid="${id}"]`);
  await again.waitFor({ timeout: 5000 });
  if (!(await again.isChecked())) {
    const kept = await page.evaluate(() => JSON.stringify(window.hearingDesk.session().todayDone));
    throw new Error(`the Done box ${id} was lost on reload; todayDone is ${kept}, url ${page.url().split('#')[1]}`);
  }
  await again.uncheck();
});
await step('Integrations: Simulate an example and undo it', async () => {
  await page.goto(`${file}#/integrations/phone-text`);
  await page.locator('[data-testid="integration-phone-text-simulate"]').click();
  await page.locator('[data-testid="integration-phone-text-event-1-undo"], [data-testid="integration-phone-text-event-2-undo"]').first().waitFor({ timeout: 5000 });
  const strip = await page.evaluate(() => window.hearingDesk.integrations().counts);
  if (strip.connected !== 0) throw new Error(`an integration claims a connection: ${JSON.stringify(strip)}`);
  await page.locator('[data-testid="integration-phone-text-event-1-undo"], [data-testid="integration-phone-text-event-2-undo"]').first().click();
});
await step('Live chip: says Recorded answers when no live server answers', async () => {
  const mode = await page.locator('[data-testid="live-chip"]').getAttribute('data-mode');
  if (mode !== 'recorded') throw new Error(`the live chip says "${mode}" with no server`);
});
await step('Consultant page: answer Yes, then the coordinator sees it on Replies', async () => {
  await page.goto(`${file}#/consultant/owen-tarris`);
  const yes = page.locator('[data-testid$="-yes"][data-testid^="consultant-AX-"]').first();
  await yes.waitFor({ timeout: 5000 });
  await yes.click();
  await page.locator('[data-testid$="-answered"]').first().waitFor({ timeout: 5000 });
  await page.goto(`${file}#/replies`);
  await page.locator('[data-testid="consultant-answers"]').waitFor({ timeout: 5000 });
});
await step('Notifications: the bell lists what happened', async () => {
  await page.goto(`${file}#/`);
  await page.locator('[data-testid="notifications-open"]').click();
  await page.locator('[data-testid="notifications-panel"]').waitFor({ timeout: 5000 });
  await page.keyboard.press('Escape');
});
await step('dark theme: axe on the 9:00 a.m. pass, step 3 with AX-107 selected', async () => {
  await page.goto(`${file}#/today/9am?step=3&show=all&case=AX-107&theme=dark`);
  await page.reload();
  await page.waitForSelector('[data-testid="region-detail"]');
  await page.waitForTimeout(400);
  await axe('/today/9am?step=3&case=AX-107 (dark)');
  await page.goto(`${file}#/today/9am?theme=light`);
  await page.reload();
  await page.waitForSelector('[data-testid="pass-step-1"]');
});

await step('Hearings: a click on a row after scrolling opens that row', async () => {
  await page.evaluate(() => { window.location.hash = '/hearings'; });
  const row = page.locator('[data-testid="row-AX-114"]');
  await row.waitFor({ timeout: 5000 });
  await page.mouse.wheel(0, 600);
  await page.waitForTimeout(300);
  await row.scrollIntoViewIfNeeded();
  await row.click();
  await page.waitForTimeout(300);
  const hash = await page.evaluate(() => window.location.hash);
  if (!/\/hearings\/AX-114/.test(hash)) throw new Error(`clicking AX-114 opened "${hash}"`);
  const title = await page.locator('[data-testid="region-detail-hearing"] [data-testid="detail-title"]').innerText();
  if (!title.includes('AX-114')) throw new Error(`the Detail shows "${title}" after clicking AX-114`);
});
await step('Hearings: the "need one now" filter has as many rows as Today says', async () => {
  await page.evaluate(() => { window.location.hash = '/hearings?filter=at-risk'; });
  await page.locator('[data-testid="queue-table"]').waitFor({ timeout: 5000 });
  const rows = await page.locator('[data-testid="queue-table"] tr[data-href]').count();
  const figure = Number(await page.locator('[data-testid="stat-near-value"]').innerText());
  if (rows !== figure) throw new Error(`${rows} rows under "Need a consultant's yes", the figure says ${figure}`);
});
await step('keys: G then O on a hearing page goes to Today, not to the office', async () => {
  await page.evaluate(() => { window.location.hash = '/hearings/AX-107'; });
  await page.waitForSelector('[data-testid="page-hearing"]');
  await page.waitForTimeout(300);
  await page.evaluate(() => { if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); });
  await page.keyboard.press('g');
  await page.keyboard.press('o');
  await page.waitForTimeout(300);
  const hash = await page.evaluate(() => window.location.hash);
  if (hash !== '#/' && hash !== '') throw new Error(`G then O went to "${hash}"`);
});
await step('9:00 a.m. pass: accept the first suggestion from its detail, then undo and accept it in the list', async () => {
  await page.evaluate(() => { window.location.hash = '/today/9am?step=1'; });
  const accept = page.locator('[data-testid^="proof-accept-"]').first();
  await accept.waitFor({ timeout: 5000 });
  const row = (await accept.getAttribute('data-testid')).replace('proof-accept-', '');
  await accept.click();
  await page.locator(`[data-testid="suggestion-undo-${row}"]`).waitFor({ timeout: 5000 });
  await page.locator(`[data-testid="suggestion-undo-${row}"]`).click();
  await page.locator(`[data-testid="suggestion-accept-${row}"]`).click();
  await page.locator(`[data-testid="suggestion-undo-${row}"]`).waitFor({ timeout: 5000 });
});
await step('Offices: keep the Tesswick change on hold', async () => {
  await page.evaluate(() => { window.location.hash = '/offices/tesswick'; });
  await page.locator('[data-testid="hold-tesswick"]').click();
  await page.locator('[data-testid="hold-name"]').fill('Smoke Test');
  if (await page.locator('[data-testid="hold-reason"]').count()) await page.locator('[data-testid="hold-reason"]').fill('Waiting for the office to write');
  await page.locator('[data-testid="hold-confirm"]').click();
  await page.locator('[data-testid="change-status-tesswick"]').filter({ hasText: /hold/i }).waitFor({ timeout: 5000 });
  await page.evaluate(() => { window.location.hash = '/today/9am'; });
  await page.waitForSelector('[data-testid="pass-step-1"]');
});
await step('9:00 a.m. pass: mark the four steps done', async () => {
  for (let n = 1; n <= 4; n += 1) {
    // A step marks itself done when its work is finished; otherwise Mark done may ask to confirm.
    await page.evaluate((k) => { window.location.hash = `/today/9am?step=${k}`; }, n);
    await page.waitForSelector(`[data-testid="pass-step-${n}"][aria-current="true"]`);
    const mark = page.locator(`[data-testid="mark-step-${n}"]`);
    if (!(await mark.count()) || (await mark.isDisabled())) continue;
    await mark.click();
    const confirm = page.locator(`[data-testid="confirm-step-${n}"]`);
    if (await confirm.count()) await confirm.click();
  }
  const left = await page.locator('[data-testid="nav-today-9am"]').innerText();
  if (!/4\/4/.test(left)) throw new Error(`the sidebar does not show 4/4 steps done: "${left.replace(/\s+/g, " ")}" ${await page.evaluate(() => JSON.stringify({ url: location.hash, mem: window.hearingDesk.session().passSteps, changes: window.hearingDesk.session().changes }))}`);
});
await step('session kept after a reload', async () => {
  await page.reload();
  await page.waitForSelector('[data-testid="pass-step-4"]');
  const left = await page.locator('[data-testid="nav-today-9am"]').innerText();
  if (!/4\/4/.test(left)) {
    const why = await page.evaluate(() => JSON.stringify({ url: location.hash, mem: window.hearingDesk.session().passSteps, saved: (JSON.parse(localStorage.getItem('hd.session.v1') ?? '{}').passSteps ?? null), changes: Object.keys(window.hearingDesk.session().changes) }));
    throw new Error(`the marked steps were lost on reload: "${left.replace(/\s+/g, ' ')}" ${why}`);
  }
});

await step('paste flow: run the readers on the example and copy the rows', async () => {
  await page.evaluate(() => { window.location.hash = '/suggestions/paste'; });
  await page.locator('[data-testid="paste-use-example"]').click();
  await page.locator('[data-testid="paste-run"]').click();
  await page.locator('[data-testid="paste-not-read"]').waitFor({ timeout: 15000 });
  const rows = await page.locator('[data-testid^="paste-row-"]').count();
  if (rows !== 26) throw new Error(`the paste result shows ${rows} rows, not 26`);
  await page.locator('[data-testid="accept-paste-4"]').click();
  await page.locator('[data-testid="undo-paste-4"]').waitFor({ timeout: 5000 });
  await page.locator('[data-testid="paste-copy"]').click();
  await page.locator('[data-testid="toast"]').first().waitFor({ timeout: 5000 });
  await page.waitForTimeout(500); // the toast fades in; axe reads colour after the fade
  await axe('/suggestions/paste (after the run)');
});
await step('pasted rows join the counts and the Caldmere change reaches Offices', async () => {
  await page.evaluate(() => { window.location.hash = '/suggestions'; });
  const pasted = await page.locator('[data-testid="summary-pasted"]').innerText({ timeout: 5000 });
  if (!/^11 from pasted messages$/.test(pasted.trim())) throw new Error(`the suggestions summary says "${pasted}"`);
  await page.evaluate(() => { window.location.hash = '/offices/caldmere'; });
  await page.locator('[data-testid="process-change-caldmere"]').waitFor({ timeout: 5000 });
  await page.evaluate(() => { window.location.hash = '/suggestions?filter=pasted'; });
  await page.locator('[data-testid="pasted-row-5"]').waitFor({ timeout: 5000 });
  await page.evaluate(() => { window.location.hash = '/suggestions/paste'; });
  await page.locator('[data-testid="paste-row-4"]').waitFor({ timeout: 5000 });
});
await step('guided tour: all stops find their target, Finish closes it', async () => {
  await page.goto(`${file}#/how?tour=1`);
  await page.reload();
  let total = 0;
  for (let n = 1; n <= 20; n += 1) {
    await page.locator('[data-testid="tour-card"]').waitFor({ timeout: 5000 });
    await page.locator('[data-testid="tour-spotlight"]').waitFor({ timeout: 5000 });
    const count = (await page.locator('[data-testid="tour-step-count"]').innerText()).match(/(\d+)\D+(\d+)/);
    if (!count) throw new Error('the tour shows no step count');
    total = Number(count[2]);
    if (await page.getByText('This part of the page is not showing').count()) throw new Error(`stop ${count[1]} lost its target`);
    await page.locator('[data-testid="tour-next"]').click();
    if (Number(count[1]) === total) break;
  }
  await page.waitForTimeout(400);
  if (await page.locator('[data-testid="tour-card"]').count()) throw new Error('Finish did not close the tour');
  console.log(`     ${total} tour stops`);
});

await browser.close();
for (const r of requests) console.log(`REQUEST ${r}`);
for (const e of errors) console.log(`CONSOLE ${e}`);
for (const f of axeFindings) console.log(`AXE ${f}`);
const bad = failures.length + errors.length + axeFindings.length + requests.length;
console.log(bad ? `${failures.length} steps failed, ${errors.length} console errors, ${requests.length} requests outside the file or failed, ${axeFindings.length} serious or critical axe findings.` : `All ${ROUTES.length} routes, Today, the 9:00 a.m. pass, the paste flow, Integrations, the consultant page and the tour work offline, with no console errors, no request outside the file and no serious or critical axe findings.`);
process.exit(bad ? 1 : 0);
