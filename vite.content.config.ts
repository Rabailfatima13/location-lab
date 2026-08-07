import { defineConfig } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

/**
 * Builds main-world-override.ts as a single, dependency-free IIFE, run
 * separately from the main @crxjs/vite-plugin build. See the comment at the
 * top of src/content-scripts/main-world-override.ts for why: CRXJS's normal
 * content-script bundling wraps MAIN-world scripts in a dynamic import that
 * can be blocked by a page's CSP. Registered via
 * chrome.scripting.registerContentScripts in the background service worker,
 * not declared in manifest.config.ts.
 *
 * Runs as a second, additive pass after the main `vite build` — emptyOutDir
 * is false so it doesn't wipe that build's output.
 */
export default defineConfig({
  build: {
    outDir: path.resolve(rootDir, 'dist/content'),
    emptyOutDir: false,
    lib: {
      entry: path.resolve(rootDir, 'src/content-scripts/main-world-override.ts'),
      name: 'LocationLabMainWorldOverride',
      formats: ['iife'],
      fileName: () => 'main-world-override.js',
    },
  },
});
