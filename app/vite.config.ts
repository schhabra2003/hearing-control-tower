import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { fileURLToPath } from 'node:url';

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url));

/**
 * The engine (../prototype) mixes ES modules and CommonJS. Exactly one module the pages import is
 * CommonJS: prototype/src/office_rule.js (`module.exports = { ... }`, no require calls). This plugin
 * wraps it as an ES module in dev and in the build, so the engine itself is never edited.
 */
export function engineCommonJsShim(): Plugin {
  const target = /[\\/]prototype[\\/]src[\\/]office_rule\.js$/;
  return {
    name: 'engine-commonjs-shim',
    enforce: 'pre',
    transform(code, id) {
      if (!target.test(id)) return null;
      const m = code.match(/module\.exports\s*=\s*\{([^}]*)\};?/);
      if (!m) throw new Error('engine-commonjs-shim: office_rule.js has no module.exports = { ... } line');
      if (/\brequire\s*\(/.test(code)) throw new Error('engine-commonjs-shim: office_rule.js now calls require(); extend the shim');
      const names = m[1].split(',').map((s) => s.trim()).filter(Boolean);
      const body = code.replace(/^'use strict';/m, '');
      return {
        code: `const __e = (() => {\nconst module = { exports: {} };\n${body}\nreturn module.exports;\n})();\nexport default __e;\n${names.map((n) => `export const ${n} = __e.${n};`).join('\n')}\n`,
        map: null,
      };
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [engineCommonJsShim(), react(), tailwindcss(), viteSingleFile({ removeViteModuleLoader: true })],
  resolve: {
    alias: {
      '@': here('./src'),
      '@data': here('./src/data'),
      '@engine': here('../prototype'),
    },
  },
  build: {
    target: 'es2022',
    outDir: 'dist',
    emptyOutDir: true,
    reportCompressedSize: false,
    chunkSizeWarningLimit: 6000,
    assetsInlineLimit: 100_000_000,
  },
  server: { fs: { allow: ['.', '../prototype'] } },
});
