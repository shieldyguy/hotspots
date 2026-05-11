# Hotspots

Trace, tag, and export interactive image hotspots. Built on
[@lunchfirm/pentool](https://www.npmjs.com/package/@lunchfirm/pentool).

Drop an image, draw regions, name them, optionally add hrefs or
arbitrary key/value tags, and export a self-contained interactive
HTML file you can paste into any site.

## Controls

|                              |                                                |
| ---------------------------- | ---------------------------------------------- |
| Click / click + drag         | Place corner / curve anchor (see pentool docs) |
| Scroll / two-finger trackpad | Pan                                            |
| ⌘/Ctrl + scroll, pinch       | Zoom toward cursor                             |
| Space + drag                 | Pan (mouse fallback)                           |
| ⌘/Ctrl + 0                   | Fit image to stage                             |
| ⌘/Ctrl + 1                   | Reset to 100%                                  |

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
