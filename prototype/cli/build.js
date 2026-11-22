// Builds the whole prototype into ONE html file that opens with a double click: no server,
// no install, no network. It inlines the engine, the web app, the styles and the data.
//
//     node cli/build.js                 writes control-tower.html next to this folder's README
//     node cli/build.js --out some.html
//
// The bundler is deliberately tiny (about 60 lines) so the prototype has no dependencies. It
// supports exactly the module forms this code base uses: named imports from relative paths,
// `export function`, `export async function`, `export const`, `export let`, `export class`,
// and `export { a, b };` for names defined or imported in the same file.
// Anything else stops the build with a clear error instead of producing a broken file.

import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './load.js';
import { assembleData } from './appdata.js';

const ENTRY = 'app/main.js';
const IMPORT = /^import\s+\{([^}]*)\}\s+from\s+'([^']+)';?[ \t]*$/gm;
const EXPORT = /^export\s+(async\s+function\*?|function\*?|const|let|class)\s+([A-Za-z_$][\w$]*)/gm;
const EXPORT_LIST = /^export\s+\{([^}]*)\};?[ \t]*$/gm;
const LINE_SEP = new RegExp('\\u2028', 'g'), PARA_SEP = new RegExp('\\u2029', 'g');

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const resolve = (from, spec) => path.posix.normalize(path.posix.join(path.posix.dirname(from), spec));

function collect(entry) {
  const order = [], state = new Map();          // state: 1 = visiting, 2 = done
  const visit = (file, trail) => {
    if (state.get(file) === 2) return;
    if (state.get(file) === 1) throw new Error(`Import cycle: ${[...trail, file].join(' -> ')}`);
    state.set(file, 1);
    const src = read(file);
    for (const m of src.matchAll(IMPORT)) {
      if (!m[2].startsWith('.')) throw new Error(`${file}: only relative imports can be bundled (found '${m[2]}')`);
      visit(resolve(file, m[2]), [...trail, file]);
    }
    state.set(file, 2);
    order.push(file);
  };
  visit(entry, []);
  return order;
}

function transform(file) {
  const names = [];
  let out = read(file).replace(IMPORT, (m, list, spec) => {
    const parts = list.split(',').map((s) => s.trim()).filter(Boolean).map((s) => s.replace(/\s+as\s+/, ': '));
    return `const { ${parts.join(', ')} } = __req(${JSON.stringify(resolve(file, spec))});`;
  });
  out = out.replace(EXPORT, (m, kind, name) => { names.push([name, name]); return `${kind} ${name}`; });
  out = out.replace(EXPORT_LIST, (m, list) => {
    for (const part of list.split(',').map((s) => s.trim()).filter(Boolean)) { const [local, as] = part.split(/\s+as\s+/); names.push([as || local, local]); }
    return '';
  });
  const left = out.match(/^(?:import|export)\s.*$/m);
  if (left) throw new Error(`${file}: unsupported module syntax: ${left[0].slice(0, 100)}`);
  return `__def(${JSON.stringify(file)}, function (__req, __exp) {\n${out}\n${names.map(([as, local]) => `__exp.${as} = ${local};`).join('\n')}\n});`;
}

export function buildHtml() {
  const files = collect(ENTRY);
  const js = [
    '(function () {', "'use strict';",
    'const __defs = {}, __cache = {};',
    'function __def(name, fn) { __defs[name] = fn; }',
    'function __req(name) { if (__cache[name]) return __cache[name]; const exp = (__cache[name] = {}); __defs[name](__req, exp); return exp; }',
    ...files.map(transform),
    `__req(${JSON.stringify(ENTRY)});`,
    '})();',
  ].join('\n').replace(/<\/script/gi, '<\\/script');
  const data = JSON.stringify(assembleData()).replace(/</g, '\\u003c').replace(LINE_SEP, '\\u2028').replace(PARA_SEP, '\\u2029');
  const css = read('app/styles.css');
  let html = read('app/index.html');
  const swap = (needle, value) => { if (!html.includes(needle)) throw new Error(`app/index.html: marker not found: ${needle}`); html = html.replace(needle, () => value); };
  swap('<link rel="stylesheet" href="/app/styles.css">', `<style>\n${css}\n</style>`);
  swap('<script type="module" src="/app/main.js"></script>', `<script>window.__DATA__ = ${data};</script>\n<script>\n${js}\n</script>`);
  return { html, files };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(ROOT, 'cli/build.js');
if (isMain) {
  const i = process.argv.indexOf('--out');
  const out = i > 0 ? path.resolve(process.argv[i + 1]) : path.join(ROOT, 'control-tower.html');
  const { html, files } = buildHtml();
  fs.writeFileSync(out, html);
  console.log(`Wrote ${out}  (${(html.length / 1024).toFixed(0)} KB, ${files.length} modules). Open it in a browser: nothing to install.`);
}
