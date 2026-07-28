# AGENTS.md — coShin

Agent-facing instructions for the `coshin/` game. See the [root AGENTS.md](../AGENTS.md) for cross-project conventions.

## What this is

coShin is a full-screen colour-flasher SPA. Three views, toggled by showing/hiding `<section>` elements (no router, no framework):

- **Welcome** (`#view-welcome`) — app name, description, big **START** button.
- **Main** (`#view-main`) — full-screen colour background that cycles through colours every `interval` seconds in Timer mode, or counts up elapsed time with lap recording in Stopwatch mode. Controls include **LAP**, **STOP**, **RESUME**, **RESTART**, and **END**.
- **Settings** (`#view-settings`) — edit mode (Timer vs Stopwatch), timing presets (3s, 5s, 10s, 30s, 60s), colour order (Random vs Circle), and custom hex palette; opened via the gear button fixed at top-right.

## Architecture

- Plain HTML/CSS/JS, no build step, no dependencies — matches the rest of the monorepo (see root `AGENTS.md`).
- `index.html` — markup for all views plus persistent settings button.
- `style.css` — all styling. The current flash colour is applied via the CSS custom property `--flash-colour` set inline on `#view-main`.
- `script.js` — all app logic:
  - Mode, interval, colours, and order are stored in top-level state variables and persisted to `localStorage` under keys `coshin-mode`, `coshin-interval`, `coshin-colours`, and `coshin-order` (with legacy fallback to `coshin-settings`).
  - Colour cycling uses a 100ms `setInterval` tick that decrements a `remaining` counter (Timer mode) or increments `stopwatchElapsed` (Stopwatch mode).
  - In Stopwatch mode, tapping **LAP** (or anywhere on screen / Spacebar) records a split entry and immediately advances to the next colour in sequential order. Tapping **STOP** pauses the session and presents **RESUME**, **RESTART**, and **END** action buttons.

## Icons, manifest & offline support

- **`icon.svg`** — the source icon (1024×1024 viewBox): a gradient indigo background (matching `--accent`), radiating white rings suggesting a flash/strobe, a solid white core circle, and two accent dots in the app's own default flash colours (red `#e53935`, yellow `#fdd835`). All raster icons (`favicon-16.png`, `favicon-32.png`, `apple-touch-icon.png` at 180×180, `icon-512.png`) are generated from it — if you edit `icon.svg`, regenerate all four (e.g. headless-Chromium screenshot of the SVG at each target size, or any SVG rasterizer) and keep them in sync; nothing derives them automatically at build time since there is no build step.
- **`manifest.json`** — PWA manifest referencing `icon-512.png` and `apple-touch-icon.png`. `index.html`'s `<head>` links the icon/manifest/theme-color the same way as `worder`/`wordweave`.
- **`sw.js`** — cache-first service worker, same pattern as `worder`/`wordweave`: `PRECACHE_URLS` lists every file the app needs so it works fully offline after the first visit. `CACHE_VERSION` is a `__CACHE_VERSION__` placeholder substituted with `$GITHUB_SHA` at deploy time (see the `pages.yml` workflow) so a new commit invalidates old caches. `registerServiceWorker()` in `script.js` skips/unregisters on `localhost`/`127.0.0.1` (local dev must always reflect disk, not a stale cached snapshot) and otherwise registers on `window load`, force-reloading once when a new SW takes control.
- **If you add a new site asset** (a new icon size, anything `index.html` references), add it to `PRECACHE_URLS` in `sw.js` and to the `cp` file list in `.github/workflows/pages.yml`, or it won't be cached offline / won't ship.

## Footer version

**On any change to `script.js` or `style.css`, bump the version in all three places, kept in lockstep:**
1. `index.html`'s `style.css?v=N`
2. `index.html`'s `script.js?v=N`
3. `script.js`'s `const ASSET_VERSION = "N"` (rendered into `#footer-version` as `vN` next to the site credits)

All three must carry the *same* `N` — this is what forces a plain HTTP dev server (and a real browser cache) to fetch the edited file instead of serving a stale cached copy, and the footer's `vN` is the at-a-glance way to confirm a real device or tab actually picked up the latest reload rather than an old cached one. Bump even for a change to only one of `script.js`/`style.css` — keeping all three numbers identical is the point, not tracking per-file versions separately. The footer itself is hidden on the main colour-cycling view (`showView()` toggles it) and only shown on welcome/settings.

## Running locally

Local dev server port: **8973** (see the port table in the root `AGENTS.md` — do not reuse another game's port).

```sh
cd coshin
python3 -m http.server 8973
```

Then open `http://localhost:8973`.

## Deployment

`.github/workflows/pages.yml` deploys `main` to GitHub Pages on every push, serving at the custom domain in `CNAME` (`coshin.shadoll.com`). The workflow copies an explicit file list into a `dist/` folder before publishing (including `sw.js`, with its `__CACHE_VERSION__` placeholder substituted for `$GITHUB_SHA`) — if you add new site assets, add them to that `cp` list too or they won't ship.

## Verification

No automated tests. Manually verify in a browser:

1. Welcome screen shows the app name, description, and START button; gear button is visible top-right.
2. Pressing START shows the main screen; the background colour changes every `interval` seconds (default 3s, default colours red/yellow), and the on-screen timer counts down and resets each time the colour changes.
3. Pressing STOP returns to the welcome screen and stops the cycling (no colour changes happen while on welcome/settings).
4. Gear button is reachable from all three views. Opening settings from the main screen and closing it resumes cycling on the main screen; opening it from welcome and closing it returns to welcome.
5. In settings: changing the interval, adding a colour (colour picker), removing a colour (chip's ✕ — disabled when only one colour remains), switching colour order (Random/Circle), and "Reset to defaults" all take effect immediately and persist across a page reload (`localStorage` key `coshin-settings`).
