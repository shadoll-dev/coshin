# AGENTS.md — coShin

Agent-facing instructions for the `coshin/` game. See the [root AGENTS.md](../AGENTS.md) for cross-project conventions.

## What this is

coShin is a full-screen colour-flasher SPA. Three views, toggled by showing/hiding `<section>` elements (no router, no framework):

- **Welcome** (`#view-welcome`) — app name, description, big **START** button.
- **Main** (`#view-main`) — full-screen colour background that cycles through `settings.colours` every `settings.interval` seconds, with a countdown timer overlay, a history strip of the last 10 colours shown as small circles (top of screen, newest on the right and slightly larger), and a **STOP** button (returns to welcome).
- **Settings** (`#view-settings`) — edit the interval and the colour list; opened via the gear button fixed at top-right, which is visible on all three views.

## Architecture

- Plain HTML/CSS/JS, no build step, no dependencies — matches the rest of the monorepo (see root `AGENTS.md`).
- `index.html` — markup for all three views plus the persistent settings button.
- `style.css` — all styling. The current flash colour is applied via the CSS custom property `--flash-colour` set inline on `#view-main`.
- `script.js` — all app logic:
  - `settings = { interval, colours, order }`, persisted to `localStorage` under key `coshin-settings`. `order` is `"random"` (default) or `"circle"`.
  - Colour cycling uses a 100ms `setInterval` tick that decrements a `remaining` counter and updates the timer text; when it hits ~0 it calls `advanceColour()`, which picks the next colour either sequentially (`"circle"`, wrapping) or by true uniform random pick across the whole list (`"random"`, the default — repeats are possible and expected, since forcibly excluding the current colour would just force strict alternation with only two colours).
  - Opening settings stops the cycling timer; closing settings resumes on the view you came from (`previousView` tracks whether settings was opened from welcome or main). This avoids background timers running behind the settings screen.
  - Settings edits (interval change, add/remove colour, reset) save to `localStorage` immediately.

## Running locally

Local dev server port: **8973** (see the port table in the root `AGENTS.md` — do not reuse another game's port).

```sh
cd coshin
python3 -m http.server 8973
```

Then open `http://localhost:8973`.

## Deployment

`.github/workflows/pages.yml` deploys `main` to GitHub Pages on every push, serving at the custom domain in `CNAME` (`coshin.shadoll.com`). The workflow copies an explicit file list (`index.html style.css script.js CNAME`) into a `dist/` folder before publishing — if you add new site assets, add them to that `cp` list too or they won't ship.

## Verification

No automated tests. Manually verify in a browser:

1. Welcome screen shows the app name, description, and START button; gear button is visible top-right.
2. Pressing START shows the main screen; the background colour changes every `interval` seconds (default 3s, default colours red/yellow), and the on-screen timer counts down and resets each time the colour changes.
3. Pressing STOP returns to the welcome screen and stops the cycling (no colour changes happen while on welcome/settings).
4. Gear button is reachable from all three views. Opening settings from the main screen and closing it resumes cycling on the main screen; opening it from welcome and closing it returns to welcome.
5. In settings: changing the interval, adding a colour (colour picker), removing a colour (chip's ✕ — disabled when only one colour remains), switching colour order (Random/Circle), and "Reset to defaults" all take effect immediately and persist across a page reload (`localStorage` key `coshin-settings`).
