# Hotspots

Trace, tag, and export interactive image hotspots. Built on
[@lunchfirm/pentool](https://www.npmjs.com/package/@lunchfirm/pentool).

Drop an image, draw regions, name them, optionally add hrefs or
arbitrary key/value tags, and export a self-contained interactive
HTML file you can paste into any site.

## Develop

```
npm install
npm run dev
```

Opens at http://localhost:5173.

## Build

```
npm run build
```

Static output goes to `dist/`. Vercel auto-detects the Vite build and
deploys it.

## Deploy

Push to GitHub, import on Vercel — no `vercel.json` needed. Vite is
auto-detected, build command is `vite build`, output is `dist/`.
