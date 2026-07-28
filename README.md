# coShin

A full-screen colour-flasher — single-page, no build step, no dependencies.

**Play it live: [coshin.shadoll.com](https://coshin.shadoll.com)**

## Features

- Welcome screen with a **START** button; settings (⚙) reachable from every screen
- Dual Modes: **Timer** (automatic countdown colour cycling) or **Stopwatch** (count-up with manual lap logging)
- Stopwatch controls with **LAP** split recording, **RESUME**, **RESTART**, and **END** actions
- Colour order is **random** by default, or **circle** (sequential) — switchable in settings
- Custom palette management (add/remove hex colours via colour picker)
- Full settings persistence across reloads via `localStorage`

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
