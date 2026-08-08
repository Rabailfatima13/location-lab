#LocationLab

A developer toolkit for testing browser geolocation.

LocationLab is a Manifest V3 Chrome extension that lets you pick a location — by search, map click, preset, or saved profile — and have that location returned to any website's standard `navigator.geolocation` calls. It's built for testing location-aware features (maps, store locators, region-aware content, delivery estimates, etc.) without physically travelling or spoofing anything below the browser's own Geolocation API.

> Built as a portfolio project to demonstrate a complete, production-shaped Chrome extension: clean architecture, a real design system, tests, CI, and documentation.

## Demo

_GIF/video walkthrough goes here — coming soon._

`screenshots/demo.gif` (placeholder)

## Features

- **Location selection** — search by place name, click a point on an interactive map, pick a quick preset, or reuse a saved profile
- **Coordinate validation** — latitude/longitude/accuracy are validated before anything can be applied, with clear inline errors
- **Saved location profiles** — name, description, coordinates, created/last-used timestamps; use, edit, or delete any time
- **Quick presets** — London, New York, Tokyo, Dubai, Lahore, Islamabad, Karachi, defined in one reusable data file
- **Recent locations** — the last 20 locations you've used, with one-click reuse, per-entry delete, and clear-all
- **Geolocation simulation** — a real MAIN-world override of `navigator.geolocation.getCurrentPosition` / `watchPosition`, toggled on/off, with a clean passthrough to the real API when disabled
- **Accuracy control** — set the reported accuracy value independently of the coordinates
- **Developer Tools panel** — current coordinates, simulation status, Geolocation API availability, last-applied time, and a one-click capability test
- **Settings** — theme (system/light/dark), storage stats, and destructive actions (clear history, delete all saved locations, reset extension) behind a confirmation dialog
- **Onboarding** — a short first-run walkthrough, skippable, never shown again once completed
- **Popup + full dashboard** — a compact popup for quick actions, and a full extension page for the map, saved locations, history, settings, and developer tools
- **Dark mode** — light/dark/system, built on CSS custom properties, not a color inversion filter

## Screenshots

Screenshots live in [`screenshots/`](screenshots/):

| File             | Shows                                                                              |
| ---------------- | ---------------------------------------------------------------------------------- |
| `popup.png`      | The compact popup — current location, simulation toggle, presets, recent locations |
| `dashboard.png`  | The full dashboard — all cards in the responsive grid                              |
| `map.png`        | The interactive Leaflet map with a selected marker                                 |
| `simulator.png`  | The Location Simulator panel, active                                               |
| `settings.png`   | The Settings page — theme, storage stats, destructive actions                      |
| `onboarding.png` | The first-run onboarding screen                                                    |

## Tech Stack

| Layer              | Choice                                                                                    | Why                                                                                              |
| ------------------ | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| UI                 | React 18 + TypeScript                                                                     | Typed, componentized, industry-standard                                                          |
| Build              | Vite + [`@crxjs/vite-plugin`](https://crxjs.dev/vite-plugin)                              | Vite's speed and HMR, with `@crxjs` handling MV3 manifest generation and content-script bundling |
| Extension platform | Chrome Manifest V3                                                                        | Current extension platform; required for the Chrome Web Store                                    |
| Map                | [Leaflet](https://leafletjs.com/) + [OpenStreetMap](https://www.openstreetmap.org/) tiles | Free, open-source, no API key                                                                    |
| Geocoding          | [Nominatim](https://nominatim.openstreetmap.org/) (OpenStreetMap)                         | Free, no API key — see [rate limits](#location-search-nominatim) below                           |
| Icons              | [lucide-react](https://lucide.dev/)                                                       | Free, MIT-licensed, tree-shakeable                                                               |
| Persistence        | `chrome.storage.local`                                                                    | No backend needed; sandboxed to the extension                                                    |
| Testing            | Vitest + React Testing Library                                                            | Fast, integrates directly with the Vite config                                                   |
| Styling            | CSS custom properties + CSS Modules                                                       | Full control over light/dark theming, no framework lock-in                                       |

## Architecture

```
src/
├── background/        service worker (seeds defaults, opens onboarding on install)
├── content-scripts/    the geolocation override (see "How It Works")
├── components/         one folder per reusable component (Header, LocationCard, LocationMap, ...)
├── pages/               Dashboard, Settings, Onboarding, Popup — compose components + hooks
├── hooks/               useSimulation, useSavedLocations, useHistory, useSettings, useTheme, useLocationSearch
├── services/
│   ├── storage/         thin chrome.storage.local wrapper + typed keys
│   ├── location/         profile/history CRUD + Nominatim geocoding
│   └── geolocation/     simulation state transitions + API capability probe
├── utils/               validation, formatting, id generation
├── data/                quick presets, in one file
├── types/               shared domain types
└── styles/              design tokens (CSS variables) + global reset
```

**State management** is a handful of small custom hooks, each backed by `chrome.storage.local` through one shared service layer — no global store, no Redux. Every hook exposes `loading`/`error` alongside its data so every consuming component can render a real loading/error/empty state instead of guessing.

See [`docs/architecture.md`](docs/architecture.md) for the full data-flow diagram.

## How It Works

The standard [Geolocation API](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API) (`navigator.geolocation.getCurrentPosition`/`watchPosition`) lives in a page's own JavaScript realm. A normal ("isolated world") content script can't touch it directly — so LocationLab uses the same technique legitimate location-testing tools use (conceptually similar to what Chrome DevTools' own Sensors panel does):

1. **`isolated-bridge.ts`** (isolated-world content script, `document_start`) — the only script allowed to call `chrome.storage`. It reads the current simulation state and relays it into the page via `window.postMessage`, then keeps relaying on every `chrome.storage` change so already-open tabs update live.
2. **`main-world-override.ts`** (MAIN-world content script, `document_start`, declared directly in the manifest) — runs in the page's own realm, so it can actually patch `navigator.geolocation`. While simulation is **off**, every call passes straight through to the real browser implementation. While **on**, it returns the selected coordinates and accuracy in the standard `GeolocationPosition` shape, including live updates for open `watchPosition` subscriptions.

Both scripts run at `document_start`, before the page's own scripts, so the override wins the race in the overwhelming majority of cases. See [Limitations](#limitations) for the one documented edge case.

This overrides a standard web API for pages the developer explicitly chooses to test. It does not touch cookies, network requests, authentication, or any other browser or page state.

## Installation

```bash
git clone <this-repo-url>
cd LocationLab
npm install
```

## Development

```bash
npm run dev
```

Starts Vite with hot module reload. For content-script/background changes, reload the unpacked extension in `chrome://extensions` after each change (HMR covers the popup/dashboard UI).

## Load Extension

1. Run `npm run build` (see below) to produce the `dist/` folder.
2. Open Chrome and go to `chrome://extensions`.
3. Enable **Developer mode** (top-right toggle).
4. Click **Load unpacked**.
5. Select the `dist/` folder produced by the build.

The LocationLab icon appears in your toolbar. Pin it for quick access.

## Testing

```bash
npm test          # run once
npm run test:watch # watch mode
```

Tests cover validation utilities, coordinate formatting, the storage service (including simulated failure), profile/history CRUD, key components (`LocationForm`, `StatusIndicator`, `SavedLocations`, `SimulatorControls`), and application-level behavior (enable/disable simulation, select/save/delete a location, invalid coordinates).

## Build

```bash
npm run build
```

Type-checks with `tsc -b`, then produces a loadable extension in `dist/`.

```bash
npm run lint     # ESLint
npm run format   # Prettier --write
```

## Location Search (Nominatim)

Search uses [Nominatim](https://nominatim.openstreetmap.org/), OpenStreetMap's free geocoder. It requires no API key, but its [usage policy](https://operations.osmfoundation.org/policies/nominatim/) caps unattended use at roughly **one request per second** and asks clients to identify themselves. A browser `fetch()` call cannot set a custom `User-Agent` header (it's a forbidden header per the Fetch spec), so the browser's own UA and the extension's referrer are sent instead — sufficient for this project's light, interactive, developer-driven usage. `geocodingService.ts` enforces the 1-request-per-second cap client-side regardless. If you need heavier usage, self-host Nominatim or switch to a paid geocoder.

## Permissions

LocationLab requests exactly two things in its manifest:

| Permission                                                               | Why                                                                                                                                                                                                                                                                                                                                                                                                  |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `storage`                                                                | Persist saved location profiles, history, settings, and simulation state locally via `chrome.storage.local`. Nothing leaves your machine.                                                                                                                                                                                                                                                            |
| Content scripts matching `<all_urls>` (declared, not `host_permissions`) | Required so simulation can be tested on any site you choose. These are static/declarative content scripts, which don't need a separate `host_permissions` entry — but Chrome still shows broad site access in the install prompt because of the match pattern. The scripts only read `chrome.storage` and patch `navigator.geolocation`; they never read page content, cookies, or network requests. |

No `tabs`, `scripting`, `webRequest`, `cookies`, or `host_permissions` are requested.

## Limitations

- **Race window**: content scripts run at `document_start`, before the page's own scripts, but in principle a script that reads `navigator.geolocation` in the same tick as the very first paint could see the real API once before the override state arrives via `postMessage`. This is a documented limitation, not a silent gap.
- **Doesn't affect native apps or the OS location service** — only the Geolocation API as exposed to web pages in the browser tab.
- **Not a bypass tool** — LocationLab does not attempt to defeat geo-blocking, fraud detection, CAPTCHA, VPN/proxy detection, identity verification, or payment-region controls. It overrides one standard, well-documented web API for testing purposes on sites you choose to test.
- **Nominatim rate limits** — see [above](#location-search-nominatim).

## Security and Responsible Use

LocationLab is intended for legitimate development and QA use: testing how your own (or a client's) location-aware features behave under different coordinates, without physically relocating. It stores everything locally via `chrome.storage.local` — there is no backend, no telemetry, and no data leaves your machine except the search query text sent to Nominatim when you use Location Search.

Do not use this tool to circumvent a website's security, fraud-prevention, or access controls. Doing so may violate that website's terms of service and, depending on the context, could carry other consequences unrelated to this project.

## Roadmap

- [ ] Import/export saved location profiles as JSON
- [ ] Per-site simulation overrides (different location per tab/origin)
- [ ] Optional coordinate "drift" simulation for testing movement over time
- [ ] Keyboard shortcut to toggle simulation
- [ ] Firefox (WebExtensions) build

## License

[MIT](LICENSE)
