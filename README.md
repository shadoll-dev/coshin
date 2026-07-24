# coShin

A full-screen colour-flasher — single-page, no build step, no dependencies.

**Play it live: [coshin.shadoll.com](https://coshin.shadoll.com)**

## Features

- Welcome screen with a **START** button; settings (⚙) reachable from every screen
- Full-screen colour background that cycles on a timer (default 3s, configurable) with a countdown shown on screen
- Colour order is **random** by default, or **circle** (sequential) — switchable in settings
- History strip showing the last 10 colours shown, as small circles at the top of the screen
- Add/remove colours (colour picker), reset to defaults — all persisted in `localStorage`
- **STOP** button returns to the welcome screen

## Running locally

No build tools or dependencies required — it's plain HTML/CSS/JS.

```bash
python3 -m http.server 8973
```

Then open [http://localhost:8973](http://localhost:8973).

## Project structure

| File          | Purpose                                                       |
| ------------- | -------------------------------------------------------------- |
| `index.html`  | Page markup: welcome, main, and settings views                 |
| `style.css`   | All styling                                                     |
| `script.js`   | App logic: view switching, colour cycling, settings, persistence |
| `CNAME`       | Custom domain for GitHub Pages                                  |

## Deployment

Pushing to `main` triggers `.github/workflows/pages.yml`, which publishes the site to GitHub Pages at the custom domain configured in `CNAME`.

## License

No license specified.
