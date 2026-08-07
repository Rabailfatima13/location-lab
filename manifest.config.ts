import { defineManifest } from '@crxjs/vite-plugin';
import pkg from './package.json';

export default defineManifest({
  manifest_version: 3,
  name: 'LocationLab — Geolocation Testing Toolkit',
  short_name: 'LocationLab',
  description: 'A developer toolkit for testing browser geolocation behavior.',
  version: pkg.version,
  icons: {
    16: 'public/icons/icon-16.png',
    32: 'public/icons/icon-32.png',
    48: 'public/icons/icon-48.png',
    128: 'public/icons/icon-128.png',
  },
  action: {
    default_popup: 'popup.html',
    default_icon: {
      16: 'public/icons/icon-16.png',
      32: 'public/icons/icon-32.png',
    },
  },
  background: {
    service_worker: 'src/background/service-worker.ts',
    type: 'module',
  },
  // Static (declarative) content script for the isolated-world bridge only.
  // The only script allowed to call chrome.storage. It does NOT require a
  // matching host_permissions entry — "matches" alone is sufficient for
  // Chrome to inject it.
  //
  // The MAIN-world override (main-world-override.ts) is deliberately NOT
  // declared here. @crxjs/vite-plugin wraps every manifest-declared content
  // script in a dynamic import() to support content-hashed filenames; for a
  // MAIN-world script that import() runs with the page's own privileges and
  // can be silently blocked by a strict page CSP (e.g. browserleaks.com),
  // which meant the override never installed on real websites even though
  // the extension's own UI worked fine. Instead it's built as a plain,
  // dependency-free IIFE (see vite.content.config.ts) and registered via
  // chrome.scripting.registerContentScripts in the background service
  // worker — native content-script injection, unlike a page-context
  // dynamic import, is exempt from the page's CSP.
  content_scripts: [
    {
      matches: ['<all_urls>'],
      js: ['src/content-scripts/isolated-bridge.ts'],
      run_at: 'document_start',
      all_frames: true,
      world: 'ISOLATED',
    },
  ],
  permissions: ['storage', 'scripting'],
  // Required specifically because of chrome.scripting.registerContentScripts
  // in the background service worker: unlike a static manifest
  // content_scripts entry (which needs no host_permissions for its own
  // "matches"), the chrome.scripting.* APIs require host permissions
  // matching the URLs you register/inject into, or the call throws.
  host_permissions: ['<all_urls>'],
  options_page: 'dashboard.html',
});
