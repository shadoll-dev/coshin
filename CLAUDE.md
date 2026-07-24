# CLAUDE.md

See [AGENTS.md](./AGENTS.md) — it contains the full guidance for AI coding agents working in this repository (architecture, state/persistence, conventions).

## Quick description

coShin is a full-screen colour-flasher SPA: press start and the screen cycles through a configurable list of colours (red/yellow by default) on a timer (default 3s), with a countdown shown on screen. The next colour is picked randomly by default, or sequentially ("circle") if chosen in settings. Colours, interval, and order are all editable from settings (gear icon, top-right, visible on every screen) and persisted in `localStorage`. Plain HTML/CSS/JS, no framework or build step.
