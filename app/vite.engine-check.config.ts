import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { fileURLToPath } from 'node:url';
import { engineCommonJsShim } from './vite.config';

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url));

/** Builds engine-check/index.html into dist-engine-check/ as one file; see scripts/engine_check.mjs. */
export default defineConfig({
  root: here('./engine-check'),
  base: './',
  plugins: [engineCommonJsShim(), viteSingleFile({ removeViteModuleLoader: true })],
  resolve: {
    alias: {
      '@': here('./src'),
      '@data': here('./src/data'),
      '@engine': here('../prototype'),
    },
  },
  build: {
    target: 'es2022',
    outDir: here('./dist-engine-check'),
    emptyOutDir: true,
    reportCompressedSize: false,
    chunkSizeWarningLimit: 6000,
  },
});
