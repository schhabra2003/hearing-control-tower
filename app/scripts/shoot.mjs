// Screenshots of the built file from file://, light and dark, for review.
//     node scripts/shoot.mjs [outDir] [dist file] route1 route2 ...
// Each route is a hash route, for example "/today/9am" or "/today/9am?open=AX-107".
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

// Playwright is installed once for the machine, outside this folder (no browser download here).
const { chromium } = createRequire(import.meta.url)('playwright');

const APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [outArg, fileArg, ...routes] = process.argv.slice(2);
const outDir = outArg || path.join(APP, '..', 'shots', 'scaffold');
const file = fileArg || path.join(APP, 'dist', 'index.html');
// "all": every page of the app, the detail pages by one example each.
const ALL = [
  '/', '/today/9am', '/today/2pm', '/hearings', '/hearings/AX-107', '/suggestions', '/suggestions/paste', '/offices', '/offices/tesswick',
  '/bench', '/replies', '/calendar', '/integrations', '/integrations/mailbox', '/consultant', '/consultant/owen-tarris', '/measures', '/evidence', '/how', '/ai', '/agents',
  '/later/board', '/later/queue', '/later/messages', '/later/try', '/later/counties', '/later/scale', '/later/business', '/later/checks', '/later/how',
];
const list = routes.length === 1 && routes[0] === 'all' ? ALL : routes.length ? routes : ['/', '/today/9am'];
const widths = (process.env.WIDTHS || '1920').split(',').map(Number);
const themes = (process.env.THEMES || 'light,dark').split(',');
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const errors = [];
for (const w of widths) {
  for (const theme of themes) {
    const page = await browser.newPage({ viewport: { width: w, height: w <= 500 ? 844 : 1080 }, deviceScaleFactor: 1 });
    page.on('console', (m) => { if (m.type() === 'error') errors.push(`${theme} ${w}: ${m.text()}`); });
    page.on('pageerror', (e) => errors.push(`${theme} ${w}: ${e.message}`));
    // SESSION='{"pasted":true}' starts every page with that session (the hd.session.v1 key).
    if (process.env.SESSION) await page.addInitScript((v) => { try { localStorage.setItem('hd.session.v1', v); } catch { /* ignore */ } }, process.env.SESSION);
    for (const r of list) {
      const sep = r.includes('?') ? '&' : '?';
      await page.goto(`file://${path.resolve(file)}#${r}${sep}theme=${theme}`);
      await page.waitForSelector('#root > *'); // the consultant page has no shell
      await page.waitForTimeout(700);
      const name = `${process.env.PREFIX ?? ''}${(r.replace(/^\//, '').replace(/[/?=&]+/g, '-') || 'overview')}-${w <= 500 ? '390' : theme}${w > 500 && w !== 1920 ? `-${w}` : ''}`;
      const target = path.join(outDir, `${name}${w <= 500 ? `-${theme}` : ''}.png`);
      await page.screenshot({ path: target, fullPage: process.env.FULL === '1' });
      console.log(target);
    }
    await page.close();
  }
}
await browser.close();
if (errors.length) { console.log(`CONSOLE ERRORS (${errors.length}):\n${errors.join('\n')}`); process.exitCode = 1; } else console.log('No console errors.');
