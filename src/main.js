import { PenTool } from "@lunchfirm/pentool";

// ── Theme ────────────────────────────────────────────────
const stored = localStorage.getItem("hotspot-theme");
if (stored === "dark" || stored === "light") {
  document.documentElement.dataset.theme = stored;
}
function syncThemeButtons() {
  const t = document.documentElement.dataset.theme || "light";
  document.querySelectorAll(".theme-btn").forEach((b) => {
    b.classList.toggle("active", b.dataset.setTheme === t);
  });
}
document.querySelectorAll(".theme-btn").forEach((b) => {
  b.addEventListener("click", () => {
    document.documentElement.dataset.theme = b.dataset.setTheme;
    localStorage.setItem("hotspot-theme", b.dataset.setTheme);
    syncThemeButtons();
  });
});
syncThemeButtons();

// ── State ────────────────────────────────────────────────
const state = {
  image: null,
  regions: [],
  activeId: null,
  pen: null,
};

const el = {
  file: document.getElementById("file"),
  exportBtn: document.getElementById("export"),
  regions: document.getElementById("regions"),
  newRegion: document.getElementById("new-region"),
  stage: document.getElementById("stage"),
  status: document.getElementById("status"),
  statusMode: document.getElementById("status-mode"),
  statusHints: document.getElementById("status-hints"),
};

// ── Image loading ────────────────────────────────────────
el.file.addEventListener("change", (e) => {
  const f = e.target.files?.[0];
  if (f) loadImageFile(f);
  e.target.value = "";
});

["dragenter", "dragover"].forEach((ev) =>
  document.addEventListener(ev, (e) => {
    if (!e.dataTransfer?.types?.includes("Files")) return;
    e.preventDefault();
    el.stage.classList.add("dropping");
  }),
);

["dragleave", "drop"].forEach((ev) =>
  document.addEventListener(ev, (e) => {
    if (ev === "dragleave" && e.relatedTarget) return;
    el.stage.classList.remove("dropping");
  }),
);

document.addEventListener("drop", (e) => {
  const f = e.dataTransfer?.files?.[0];
  if (!f || !f.type.startsWith("image/")) return;
  e.preventDefault();
  loadImageFile(f);
});

function loadImageFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      mountImage({
        src: reader.result,
        width: img.naturalWidth,
        height: img.naturalHeight,
        filename: file.name,
      });
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
}

function mountImage(image) {
  state.image = image;

  if (state.pen) {
    state.pen.destroy();
    state.pen = null;
  }
  el.stage.innerHTML = "";
  el.stage.classList.remove("dropping");

  const wrap = document.createElement("div");
  wrap.className = "image-wrap";

  const img = document.createElement("img");
  img.src = image.src;
  wrap.appendChild(img);
  el.stage.appendChild(wrap);

  state.pen = new PenTool(wrap, { viewBox: [image.width, image.height] });
  state.pen.on("path", onPath);
  state.pen.on("update", onUpdate);
  state.pen.on("cancel", onCancel);

  el.newRegion.disabled = false;
  el.exportBtn.disabled = state.regions.length === 0;
  el.status.hidden = false;

  if (state.regions.length === 0) {
    state.activeId = null;
  } else if (state.activeId) {
    const r = state.regions.find((r) => r.id === state.activeId);
    if (r) state.pen.load({ points: r.points, closed: r.closed });
  }
  renderRegions();
  updateStatus();
}

// ── Pen tool events ──────────────────────────────────────
function onPath(path) {
  if (state.activeId == null) {
    const id = crypto.randomUUID();
    state.regions.push({
      id,
      name: `Region ${state.regions.length + 1}`,
      href: "",
      data: [],
      points: path.points,
      closed: path.closed,
    });
    state.activeId = id;
  } else {
    const r = state.regions.find((r) => r.id === state.activeId);
    if (r) {
      r.points = path.points;
      r.closed = path.closed;
    }
  }
  el.exportBtn.disabled = state.regions.length === 0;
  renderRegions();
  updateStatus();
}

function onUpdate(path) {
  if (state.activeId == null) return;
  const r = state.regions.find((r) => r.id === state.activeId);
  if (r) {
    r.points = path.points;
    r.closed = path.closed;
  }
}

function onCancel() {
  updateStatus();
}

// ── Region list UI ───────────────────────────────────────
el.newRegion.addEventListener("click", () => {
  if (!state.pen) return;
  state.activeId = null;
  state.pen.clear();
  renderRegions();
  updateStatus();
});

function selectRegion(id) {
  if (!state.pen) return;
  if (state.activeId === id) return;
  state.activeId = id;
  const r = state.regions.find((r) => r.id === id);
  if (r) state.pen.load({ points: r.points, closed: r.closed });
  renderRegions();
  updateStatus();
}

function deleteRegion(id) {
  state.regions = state.regions.filter((r) => r.id !== id);
  if (state.activeId === id) {
    state.activeId = null;
    state.pen?.clear();
  }
  el.exportBtn.disabled = state.regions.length === 0;
  renderRegions();
  updateStatus();
}

function renderDataRow(region, pair, index) {
  const row = document.createElement("div");
  row.className = "data-row";

  const key = document.createElement("input");
  key.className = "data-key";
  key.value = pair.key;
  key.placeholder = "key";
  key.addEventListener("input", (e) => { pair.key = e.target.value; });

  const sep = document.createElement("span");
  sep.className = "data-sep";
  sep.textContent = ":";

  const value = document.createElement("input");
  value.className = "data-value";
  value.value = pair.value;
  value.placeholder = "value";
  value.addEventListener("input", (e) => { pair.value = e.target.value; });

  const del = document.createElement("button");
  del.className = "data-delete";
  del.textContent = "×";
  del.title = "Remove";
  del.addEventListener("click", (e) => {
    e.stopPropagation();
    region.data.splice(index, 1);
    renderRegions();
  });

  row.appendChild(key);
  row.appendChild(sep);
  row.appendChild(value);
  row.appendChild(del);
  return row;
}

function sanitizeDataKey(k) {
  return String(k || "")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function renderRegions() {
  el.regions.innerHTML = "";
  for (const r of state.regions) {
    const li = document.createElement("li");
    li.className = "region" + (r.id === state.activeId ? " active" : "");
    li.addEventListener("mousedown", (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "BUTTON")
        return;
      selectRegion(r.id);
    });

    const name = document.createElement("input");
    name.className = "region-name";
    name.value = r.name;
    name.addEventListener("input", (e) => { r.name = e.target.value; });
    li.appendChild(name);

    const href = document.createElement("input");
    href.className = "region-href";
    href.value = r.href;
    href.placeholder = "href (optional)";
    href.addEventListener("input", (e) => { r.href = e.target.value; });
    li.appendChild(href);

    if (!r.data) r.data = [];
    const dataWrap = document.createElement("div");
    dataWrap.className = "region-data";
    r.data.forEach((pair, i) => {
      dataWrap.appendChild(renderDataRow(r, pair, i));
    });
    const addBtn = document.createElement("button");
    addBtn.className = "data-add";
    addBtn.textContent = "+ add data";
    addBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      r.data.push({ key: "", value: "" });
      renderRegions();
    });
    dataWrap.appendChild(addBtn);
    li.appendChild(dataWrap);

    const meta = document.createElement("div");
    meta.className = "region-meta";
    const info = document.createElement("span");
    info.textContent = `${r.points.length} points · ${r.closed ? "closed" : "open"}`;
    const del = document.createElement("button");
    del.className = "region-delete";
    del.textContent = "delete";
    del.addEventListener("click", (e) => {
      e.stopPropagation();
      deleteRegion(r.id);
    });
    meta.appendChild(info);
    meta.appendChild(del);
    li.appendChild(meta);

    el.regions.appendChild(li);
  }
}

function updateStatus() {
  if (!state.pen) {
    el.status.hidden = true;
    return;
  }
  el.status.hidden = false;
  const drawing =
    state.activeId == null && state.pen.snapshot().points.length === 0;
  const newDrawing = state.activeId == null && !drawing;
  if (drawing || newDrawing) {
    el.statusMode.textContent = "Drawing new region";
    el.statusHints.innerHTML =
      'click to place, <kbd>click + drag</kbd> for a curve, click the first anchor to close';
  } else {
    const r = state.regions.find((r) => r.id === state.activeId);
    el.statusMode.textContent = `Editing — ${r?.name ?? ""}`;
    el.statusHints.innerHTML =
      'drag anchors and handles, <kbd>Alt</kbd>-click for smooth/corner, <kbd>+</kbd> add, <kbd>−</kbd> remove';
  }
}

// ── Export ───────────────────────────────────────────────
el.exportBtn.addEventListener("click", exportHTML);

function pointsToDString(points, closed) {
  if (!points.length) return "";
  const fmt = (n) =>
    Number.isInteger(n) ? n.toString() : (+n.toFixed(2)).toString();
  const seg = (from, to) => {
    if (!from.handleOut && !to.handleIn)
      return `L ${fmt(to.x)} ${fmt(to.y)}`;
    const h1 = from.handleOut ?? from;
    const h2 = to.handleIn ?? to;
    return `C ${fmt(h1.x)} ${fmt(h1.y)} ${fmt(h2.x)} ${fmt(h2.y)} ${fmt(to.x)} ${fmt(to.y)}`;
  };
  const parts = [`M ${fmt(points[0].x)} ${fmt(points[0].y)}`];
  for (let i = 1; i < points.length; i++) {
    parts.push(seg(points[i - 1], points[i]));
  }
  if (closed) {
    parts.push(seg(points[points.length - 1], points[0]));
    parts.push("Z");
  }
  return parts.join(" ");
}

function exportHTML() {
  if (!state.image || state.regions.length === 0) return;
  const { src, width, height, filename } = state.image;
  const baseName = (filename || "image").replace(/\.[^.]+$/, "");
  const title = `${baseName} — hotspots`;

  const paths = state.regions
    .map((r) => {
      const d = pointsToDString(r.points, r.closed);
      const attrs = [
        `class="hotspot"`,
        `data-name="${escapeAttr(r.name)}"`,
      ];
      if (r.href) attrs.push(`data-href="${escapeAttr(r.href)}"`);
      if (Array.isArray(r.data)) {
        const seen = new Set(["name", "href"]);
        for (const pair of r.data) {
          const key = sanitizeDataKey(pair.key);
          if (!key || seen.has(key)) continue;
          seen.add(key);
          attrs.push(`data-${key}="${escapeAttr(pair.value)}"`);
        }
      }
      return `        <path ${attrs.join(" ")} d="${d}"></path>`;
    })
    .join("\n");

  const html = `<!doctype html>
<!--
  HOTSPOTS — exported from the Hotspot Editor (pentool.js)
  Source image: ${escapeAttr(filename || "untitled")}  (${width} × ${height})

  HOW TO USE THIS FILE
  ────────────────────
  Open it as-is to preview your hotspots.

  TO EMBED ON YOUR SITE
  ─────────────────────
  1. Copy the <figure class="hotspot-figure" data-hotspots> ... </figure>
     block from <body> into your page.
  2. Copy the .hotspot-figure / .hotspot / .hotspot-label CSS rules into
     your stylesheet.
  3. Copy the <script> at the end of <body> once. It auto-wires every
     [data-hotspots] element on the page, so you can have multiple.

  EACH HOTSPOT
  ────────────
  data-name  — shown in the hover label
  data-href  — optional. If present, click navigates there.
  data-{key} — any custom region data you set in the editor becomes a
               data-* attribute here. Read in JS via el.dataset.{key},
               or target with CSS: [data-{key}="value"].
               For tag-like behavior, use a "tags" key with
               space-separated values — e.g. data-tags="nav primary",
               then match with [data-tags~="nav"] in CSS, or
               el.dataset.tags.split(" ").includes("nav") in JS.

  CUSTOM CLICK BEHAVIOR
  ─────────────────────
  Remove the click handler in the script if you want custom JS instead
  of navigation. Listen for "click" on .hotspot and read
  event.currentTarget.dataset for everything you set.

  STYLING
  ───────
  Override the .hotspot rules in your own CSS to change hover color,
  outline weight, etc. The paths are in the image's native coordinate
  space, so they scale with the image automatically.
-->
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeAttr(title)}</title>
    <style>
      /* ── Hotspot styles (copy these into your site) ─────────── */
      .hotspot-figure {
        position: relative;
        display: inline-block;
        line-height: 0;
        max-width: 100%;
        margin: 0;
      }
      .hotspot-figure img,
      .hotspot-figure > svg {
        display: block;
        width: 100%;
        height: auto;
      }
      .hotspot-figure > svg {
        position: absolute;
        inset: 0;
        height: 100%;
      }
      .hotspot {
        fill: transparent;
        stroke: transparent;
        stroke-width: 2;
        vector-effect: non-scaling-stroke;
        transition: fill 0.15s, stroke 0.15s;
        cursor: default;
      }
      .hotspot[data-href] { cursor: pointer; }
      .hotspot:hover {
        fill: rgba(255, 255, 255, 0.14);
        stroke: #ffffff;
      }
      .hotspot-label {
        position: absolute;
        pointer-events: none;
        background: rgba(0, 0, 0, 0.85);
        color: #ffffff;
        font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
        font-size: 13px;
        line-height: 1;
        padding: 5px 9px;
        border-radius: 3px;
        transform: translate(-50%, -130%);
        white-space: nowrap;
        opacity: 0;
        transition: opacity 0.15s;
      }
      .hotspot-label.visible { opacity: 1; }

      /* ── Preview-only page chrome (delete when embedding) ───── */
      body {
        margin: 0;
        min-height: 100vh;
        background: #111;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px;
        box-sizing: border-box;
      }
    </style>
  </head>
  <body>
    <figure class="hotspot-figure" data-hotspots>
      <img src="${src}" alt="${escapeAttr(filename || "")}" />
      <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
${paths}
      </svg>
      <div class="hotspot-label"></div>
    </figure>

    <script>
      // Wires up every [data-hotspots] figure on the page.
      document.querySelectorAll("[data-hotspots]").forEach((fig) => {
        const label = fig.querySelector(".hotspot-label");
        fig.querySelectorAll(".hotspot").forEach((el) => {
          el.addEventListener("mouseenter", () => {
            if (!label) return;
            label.textContent = el.dataset.name || "";
            if (el.dataset.name) label.classList.add("visible");
          });
          el.addEventListener("mousemove", (e) => {
            if (!label) return;
            const rect = fig.getBoundingClientRect();
            label.style.left = (e.clientX - rect.left) + "px";
            label.style.top = (e.clientY - rect.top) + "px";
          });
          el.addEventListener("mouseleave", () => {
            label && label.classList.remove("visible");
          });
          el.addEventListener("click", () => {
            const href = el.dataset.href;
            if (href) window.location.href = href;
          });
        });
      });
    <\/script>
  </body>
</html>
`;

  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${baseName}-hotspots.html`;
  a.click();
  URL.revokeObjectURL(url);
}

function escapeAttr(s) {
  return String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}
