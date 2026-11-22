// Builds engine-check/ into one file and opens it from file:// in Chromium. Exits 1 when a check
// fails or the page logs an error. Run with: npm run engine-check
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const app = fileURLToPath(new URL('..', import.meta.url));
execFileSync('npx', ['vite', 'build', '--config', 'vite.engine-check.config.ts', '--logLevel', 'warn'], { cwd: app, stdio: 'inherit' });

const { chromium } = createRequire(import.meta.url)('playwright');
const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(pathToFileURL(`${app}dist-engine-check/index.html`).href);
await page.waitForFunction(() => window.__ENGINE_CHECK__?.done === true, null, { timeout: 120000 }).catch(() => {});
const result = await page.evaluate(() => window.__ENGINE_CHECK__ ?? null);
await browser.close();

if (!result) errors.push('The check page did not finish.');
for (const c of result?.checks ?? []) console.log(`${c.ok ? 'PASS' : 'FAIL'} ${c.name}: ${c.detail}`);
for (const e of errors) console.log(`ERROR ${e}`);
const failed = (result?.checks ?? []).filter((c) => !c.ok).length;
console.log(failed || errors.length ? `${failed} checks failed, ${errors.length} errors.` : `All ${result.checks.length} checks pass in the browser build.`);
process.exit(failed || errors.length ? 1 : 0);
