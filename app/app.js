"use strict";

/* Neon Palms Cover Studio — an offline GTA-style cover art maker.
   Every photo is read on the user's own machine; nothing is uploaded.
   Rendering is plain Canvas 2D: panels, gradient-map grades, bold
   Anton lettering with a neon Pacifico subtitle, halftone title
   blocks, a badge ribbon, a star heat meter, grain and vignette. */

const SIZES = {
  square: { width: 1080, height: 1080, label: "1080 × 1080" },
  portrait: { width: 1080, height: 1350, label: "1080 × 1350" },
  wide: { width: 1920, height: 1080, label: "1920 × 1080" },
};

const SAMPLE_PHOTOS = [
  { src: "samples/sample-skater.jpg", name: "Skater at sunset" },
  { src: "samples/sample-yacht.jpg", name: "Yacht at dusk" },
  { src: "samples/sample-dj.jpg", name: "Rooftop DJ" },
];

/* Gradient-map grades: shadows -> mids -> highlights as RGB stops. */
const GRADES = {
  sunset: { name: "Sunset", stops: [[0, [26, 12, 54]], [0.35, [123, 45, 139]], [0.65, [255, 94, 98]], [1, [255, 209, 148]]] },
  neon: { name: "Neon Nights", stops: [[0, [4, 32, 46]], [0.4, [34, 96, 140]], [0.7, [255, 46, 136]], [1, [190, 240, 255]]] },
  vice: { name: "Vice Pink", stops: [[0, [18, 8, 46]], [0.4, [94, 20, 110]], [0.7, [255, 46, 136]], [1, [255, 209, 102]]] },
  gold: { name: "Golden Hour", stops: [[0, [43, 26, 8]], [0.4, [122, 74, 22]], [0.7, [255, 157, 0]], [1, [255, 243, 196]]] },
  heat: { name: "Heat Haze", stops: [[0, [43, 6, 3]], [0.4, [122, 24, 8]], [0.7, [255, 59, 0]], [1, [255, 179, 71]]] },
  noir: { name: "Mono Noir", stops: [[0, [8, 8, 14]], [0.5, [84, 84, 106]], [1, [232, 232, 240]]] },
};

const LAYOUTS = ["grid4", "hero3", "fullbleed", "tilted", "nine"];
const LAYOUT_PANEL_COUNT = { grid4: 4, hero3: 4, fullbleed: 1, tilted: 3, nine: 8 };

/* ---- state ---------------------------------------------------------- */

function defaultPanel(photo, cx, cy, zoom) {
  return { photo: photo, cx: cx, cy: cy, zoom: zoom };
}

function defaultState() {
  return {
    layout: "grid4",
    grade: "sunset",
    size: "wide",
    title: "NEON PALMS",
    subtitle: "chasing the sunset",
    badge: "PALM CITY",
    stars: 4,
    titleFill: "sunset",
    grain: true,
    vignette: true,
    ink: true,
    halftone: true,
    selected: 0,
    panels: [
      defaultPanel(0, 0.5, 0.42, 1.15),
      defaultPanel(1, 0.5, 0.45, 1.1),
      defaultPanel(2, 0.5, 0.45, 1.1),
      defaultPanel(1, 0.35, 0.5, 1.35),
      defaultPanel(0, 0.62, 0.5, 1.3),
      defaultPanel(2, 0.65, 0.5, 1.25),
      defaultPanel(1, 0.5, 0.4, 1.2),
      defaultPanel(0, 0.4, 0.55, 1.4),
      defaultPanel(2, 0.5, 0.5, 1.15),
    ],
  };
}

let state = defaultState();
let photos = []; // {img, name}
let history = [];
let historyIndex = -1;

const stageCanvas = document.getElementById("stageCanvas");
const stageCtx = stageCanvas.getContext("2d");
const scratchCanvas = document.createElement("canvas");
const scratchCtx = scratchCanvas.getContext("2d");
let grainPattern = null;

function snapshotState() {
  return JSON.parse(JSON.stringify(state));
}

function pushHistory() {
  history = history.slice(0, historyIndex + 1);
  history.push(snapshotState());
  if (history.length > 60) history.shift();
  historyIndex = history.length - 1;
  syncHistoryButtons();
}

function undoState() {
  if (historyIndex <= 0) return;
  historyIndex -= 1;
  state = JSON.parse(JSON.stringify(history[historyIndex]));
  syncControlsFromState();
  renderPreview();
}

function redoState() {
  if (historyIndex >= history.length - 1) return;
  historyIndex += 1;
  state = JSON.parse(JSON.stringify(history[historyIndex]));
  syncControlsFromState();
  renderPreview();
}

function syncHistoryButtons() {
  document.getElementById("undoBtn").disabled = historyIndex <= 0;
  document.getElementById("redoBtn").disabled = historyIndex >= history.length - 1;
}

/* ---- photos --------------------------------------------------------- */

function loadPhoto(src, name) {
  return new Promise(function (resolve) {
    const img = new Image();
    img.onload = function () { resolve({ img: img, name: name }); };
    img.onerror = function () { resolve({ img: null, name: name + " (missing)" }); };
    img.src = src;
  });
}

async function loadSamplePhotos() {
  const loaded = [];
  for (const s of SAMPLE_PHOTOS) loaded.push(await loadPhoto(s.src, s.name));
  photos = loaded;
  renderPhotoTray();
}

function addUploadedPhotos(fileList) {
  const files = Array.prototype.slice.call(fileList);
  if (!files.length) return;
  let pending = files.length;
  files.forEach(function (file) {
    const reader = new FileReader();
    reader.onload = function () {
      const img = new Image();
      img.onload = function () {
        photos.push({ img: img, name: file.name });
        pending -= 1;
        if (pending === 0) {
          renderPhotoTray();
          assignPhotoToPanel(photos.length - 1, state.selected);
        }
      };
      img.onerror = function () { pending -= 1; if (pending === 0) renderPhotoTray(); };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

function renderPhotoTray() {
  const tray = document.getElementById("photoTray");
  tray.innerHTML = "";
  photos.forEach(function (photo, index) {
    const thumb = document.createElement("img");
    thumb.alt = photo.name;
    thumb.title = photo.name;
    thumb.src = photo.img ? photo.img.src : "";
    if (state.panels[state.selected] && state.panels[state.selected].photo === index) {
      thumb.classList.add("selected");
    }
    thumb.addEventListener("click", function () { assignPhotoToPanel(index, state.selected); });
    tray.appendChild(thumb);
  });
}

function assignPhotoToPanel(photoIndex, panelIndex) {
  if (!photos[photoIndex] || !state.panels[panelIndex]) return;
  state.panels[panelIndex].photo = photoIndex;
  state.panels[panelIndex].cx = 0.5;
  state.panels[panelIndex].cy = 0.5;
  state.panels[panelIndex].zoom = 1.1;
  pushHistory();
  renderPhotoTray();
  renderPreview();
}

function fillAllPanelsWithPhoto(photoIndex) {
  if (!photos[photoIndex]) return;
  const count = LAYOUT_PANEL_COUNT[state.layout];
  for (let i = 0; i < count; i++) {
    state.panels[i].photo = photoIndex;
    state.panels[i].cx = 0.18 + 0.64 * ((i * 37 % 100) / 100);
    state.panels[i].cy = 0.35 + 0.3 * ((i * 53 % 100) / 100);
    state.panels[i].zoom = 1.25 + (i % 3) * 0.15;
  }
  pushHistory();
  renderPhotoTray();
  renderPreview();
}

/* ---- gradient-map grades -------------------------------------------- */

function buildGradeLut(gradeId) {
  const grade = GRADES[gradeId] || GRADES.sunset;
  const lut = new Uint8Array(256 * 3);
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    let a = grade.stops[0];
    let b = grade.stops[grade.stops.length - 1];
    for (let s = 0; s < grade.stops.length - 1; s++) {
      if (t >= grade.stops[s][0] && t <= grade.stops[s + 1][0]) { a = grade.stops[s]; b = grade.stops[s + 1]; break; }
    }
    const span = (b[0] - a[0]) || 1;
    const f = Math.max(0, Math.min(1, (t - a[0]) / span));
    for (let c = 0; c < 3; c++) lut[i * 3 + c] = Math.round(a[1][c] + (b[1][c] - a[1][c]) * f);
  }
  return lut;
}

function applyGradeLut(ctx, w, h, lut) {
  const image = ctx.getImageData(0, 0, w, h);
  const d = image.data;
  for (let i = 0; i < d.length; i += 4) {
    const lum = (d[i] * 77 + d[i + 1] * 150 + d[i + 2] * 29) >> 8;
    const o = lum * 3;
    d[i] = lut[o];
    d[i + 1] = lut[o + 1];
    d[i + 2] = lut[o + 2];
  }
  ctx.putImageData(image, 0, 0);
}

/* ---- layout geometry ------------------------------------------------- */

function layoutGeometry(layout, W, H) {
  const g = Math.max(6, Math.round(Math.min(W, H) * 0.012));
  if (layout === "grid4") {
    const th = Math.round(H * 0.17);
    const aw = W - 2 * g;
    const ah = H - th - 2 * g;
    const pw = Math.round((aw - g) / 2);
    const ph = Math.round((ah - g) / 2);
    return {
      background: "paper",
      cells: [
        { panel: 0, x: g, y: g, w: pw, h: ph, rot: 0 },
        { panel: 1, x: g + pw + g, y: g, w: pw, h: ph, rot: 0 },
        { panel: 2, x: g, y: g + ph + g, w: pw, h: ph, rot: 0 },
        { panel: 3, x: g + pw + g, y: g + ph + g, w: pw, h: ph, rot: 0 },
      ],
      title: { x: g, y: H - th, w: W - 2 * g, h: th, align: "left", size: 0.62 },
    };
  }
  if (layout === "hero3") {
    const th = Math.round(H * 0.15);
    const heroW = Math.round(W * 0.6) - g;
    const sideX = heroW + 2 * g;
    const sideW = W - sideX - g;
    const topH = H - th - 2 * g;
    const sh = Math.round((topH - 2 * g) / 3);
    return {
      background: "paper",
      cells: [
        { panel: 0, x: g, y: g, w: heroW, h: topH, rot: 0 },
        { panel: 1, x: sideX, y: g, w: sideW, h: sh, rot: 0 },
        { panel: 2, x: sideX, y: g + sh + g, w: sideW, h: sh, rot: 0 },
        { panel: 3, x: sideX, y: g + 2 * (sh + g), w: sideW, h: sh, rot: 0 },
      ],
      title: { x: g, y: H - th, w: W - 2 * g, h: th, align: "left", size: 0.6 },
    };
  }
  if (layout === "fullbleed") {
    return {
      background: "photo",
      cells: [{ panel: 0, x: 0, y: 0, w: W, h: H, rot: 0 }],
      title: { x: Math.round(W * 0.05), y: Math.round(H * 0.62), w: Math.round(W * 0.9), h: Math.round(H * 0.34), align: "left", size: 0.66, scrim: true },
    };
  }
  if (layout === "tilted") {
    const pw = Math.round(W * 0.4);
    const ph = Math.round(H * 0.52);
    const cy = Math.round(H * 0.46);
    return {
      background: "sunset",
      cells: [
        { panel: 0, x: Math.round(W * 0.06), y: cy - Math.round(ph * 0.52), w: pw, h: ph, rot: -0.1 },
        { panel: 1, x: Math.round(W * 0.31), y: cy - Math.round(ph * 0.46), w: pw, h: ph, rot: 0.02 },
        { panel: 2, x: Math.round(W * 0.56), y: cy - Math.round(ph * 0.52), w: pw, h: ph, rot: 0.09 },
      ],
      title: { x: Math.round(W * 0.05), y: Math.round(H * 0.03), w: Math.round(W * 0.62), h: Math.round(H * 0.2), align: "left", size: 0.6, tilt: -0.03 },
    };
  }
  // nine: 3x3 grid, centre cell is the title block.
  const cw = Math.round((W - 4 * g) / 3);
  const ch = Math.round((H - 4 * g) / 3);
  const cells = [];
  const order = [0, 1, 2, 3, 4, 5, 6, 7];
  let k = 0;
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      if (r === 1 && c === 1) continue;
      cells.push({ panel: order[k], x: g + c * (cw + g), y: g + r * (ch + g), w: cw, h: ch, rot: 0 });
      k += 1;
    }
  }
  return {
    background: "paper",
    cells: cells,
    title: { x: g + cw + g, y: g + ch + g, w: cw, h: ch, align: "center", size: 0.34, block: true },
  };
}

/* ---- drawing helpers -------------------------------------------------- */

function drawStarPath(ctx, cx, cy, outer, inner) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function drawStarRow(ctx, cx, cy, size, filled) {
  for (let i = 0; i < 5; i++) {
    const x = cx + (i - 2) * size * 2.4;
    drawStarPath(ctx, x, cy, size, size * 0.45);
    if (i < filled) {
      ctx.fillStyle = "#ffd166";
      ctx.fill();
      ctx.lineWidth = Math.max(1, size * 0.12);
      ctx.strokeStyle = "#14101f";
      ctx.stroke();
    } else {
      ctx.lineWidth = Math.max(1, size * 0.12);
      ctx.strokeStyle = "rgba(255,255,255,0.75)";
      ctx.stroke();
    }
  }
}

function drawPalmSilhouette(ctx, x, y, s, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineCap = "round";
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(10, -60, 4, -118);
  ctx.stroke();
  ctx.lineWidth = 5;
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI * (0.08 + i * 0.14);
    const ex = Math.cos(a) * 62;
    const ey = -118 + Math.sin(a) * 42 + 26;
    ctx.beginPath();
    ctx.moveTo(4, -118);
    ctx.quadraticCurveTo(Math.cos(a) * 34, -118 + Math.sin(a) * 18 - 14, ex, ey);
    ctx.stroke();
  }
  ctx.restore();
}

function drawRetroSun(ctx, cx, cy, r) {
  const grad = ctx.createLinearGradient(0, cy - r, 0, cy + r);
  grad.addColorStop(0, "#ffe259");
  grad.addColorStop(0.55, "#ff7518");
  grad.addColorStop(1, "#ff2e88");
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = grad;
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  ctx.fillStyle = "rgba(20,8,40,0.9)";
  let y = cy + r * 0.05;
  let h = r * 0.045;
  while (y < cy + r) {
    ctx.fillRect(cx - r, y, r * 2, h);
    y += h + r * 0.16;
    h *= 1.45;
  }
  ctx.restore();
}

function drawHalftoneBand(ctx, x, y, w, h, color) {
  ctx.save();
  ctx.fillStyle = color;
  const step = Math.max(9, Math.round(w / 46));
  for (let gy = y + step / 2; gy < y + h; gy += step) {
    for (let gx = x + step / 2; gx < x + w; gx += step) {
      const f = ((gx - x) / w + (gy - y) / h) / 2;
      const r = 0.6 + f * (step * 0.42);
      ctx.beginPath();
      ctx.arc(gx, gy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function fitTitleFont(ctx, text, maxWidth, startSize, family) {
  let size = startSize;
  ctx.font = size + "px " + family;
  while (size > 12 && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    ctx.font = size + "px " + family;
  }
  return size;
}

function titleFillStyle(ctx, x, y, w, h, fill) {
  if (fill === "white") return "#ffffff";
  if (fill === "neon") return "#ff5ea8";
  const grad = ctx.createLinearGradient(0, y, 0, y + h);
  grad.addColorStop(0, "#fff3c4");
  grad.addColorStop(0.45, "#ffb347");
  grad.addColorStop(0.75, "#ff5e62");
  grad.addColorStop(1, "#ff2e88");
  return grad;
}

function drawTitleBlock(ctx, zone, st, W, H) {
  const ink = "#14101f";
  ctx.save();
  if (zone.tilt) {
    ctx.translate(zone.x + zone.w / 2, zone.y + zone.h / 2);
    ctx.rotate(zone.tilt);
    ctx.translate(-(zone.x + zone.w / 2), -(zone.y + zone.h / 2));
  }
  if (zone.block) {
    ctx.fillStyle = ink;
    ctx.fillRect(zone.x, zone.y, zone.w, zone.h);
    if (st.halftone) drawHalftoneBand(ctx, zone.x, zone.y, zone.w, zone.h, "rgba(255,255,255,0.13)");
  } else if (zone.scrim) {
    const scrim = ctx.createLinearGradient(0, zone.y - zone.h * 0.4, 0, zone.y + zone.h);
    scrim.addColorStop(0, "rgba(10,6,24,0)");
    scrim.addColorStop(1, "rgba(10,6,24,0.82)");
    ctx.fillStyle = scrim;
    ctx.fillRect(0, zone.y - zone.h * 0.4, W, zone.h * 1.4);
  } else if (st.halftone) {
    ctx.fillStyle = ink;
    ctx.fillRect(0, zone.y, W, zone.h);
    drawHalftoneBand(ctx, 0, zone.y, W, zone.h, "rgba(255,255,255,0.10)");
  } else {
    ctx.fillStyle = ink;
    ctx.fillRect(0, zone.y, W, zone.h);
  }

  const pad = Math.max(10, zone.w * 0.03);
  const tx = zone.align === "center" ? zone.x + zone.w / 2 : zone.x + pad;
  const maxW = zone.w - pad * 2;
  // Fit the title, subtitle and star row as one vertical stack inside the zone.
  let titleSize = fitTitleFont(ctx, st.title, maxW, Math.round(zone.h * zone.size), "Anton, sans-serif");
  let subSize = 12;
  let starSize = 6;
  let titleY = zone.y;
  let subY = zone.y;
  let starY = zone.y;
  const layoutStack = function () {
    subSize = Math.max(12, Math.round(titleSize * 0.42));
    starSize = Math.max(6, Math.round(titleSize * 0.16));
    const stackH = titleSize * 0.8 + subSize * 1.5 + starSize * 2.4;
    titleY = zone.y + (zone.h - stackH) / 2 + titleSize * 0.78;
    subY = titleY + subSize * 1.45;
    starY = subY + starSize * 2.2;
  };
  layoutStack();
  let guard = 0;
  while (starY + starSize > zone.y + zone.h - 4 && titleSize > 12 && guard < 14) {
    titleSize = Math.max(12, Math.round(titleSize * 0.9));
    ctx.font = titleSize + "px Anton, sans-serif";
    layoutStack();
    guard += 1;
  }
  ctx.textAlign = zone.align === "center" ? "center" : "left";
  ctx.textBaseline = "alphabetic";
  ctx.lineJoin = "round";
  ctx.font = titleSize + "px Anton, sans-serif";
  ctx.shadowColor = "rgba(0,0,0,0.55)";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = Math.max(2, titleSize * 0.06);
  ctx.strokeStyle = ink;
  ctx.lineWidth = Math.max(2, titleSize * 0.09);
  ctx.strokeText(st.title, tx, titleY);
  ctx.shadowOffsetY = 0;
  ctx.fillStyle = titleFillStyle(ctx, tx, titleY - titleSize, maxW, titleSize, st.titleFill);
  ctx.fillText(st.title, tx, titleY);

  ctx.font = subSize + "px Pacifico, cursive";
  ctx.shadowColor = "#ff2e88";
  ctx.shadowBlur = Math.max(8, subSize * 0.5);
  ctx.fillStyle = "#ff8fd0";
  ctx.fillText(st.subtitle, tx, subY);
  ctx.shadowBlur = 0;

  const starCx = zone.align === "center" ? zone.x + zone.w / 2 : tx + starSize * 5;
  drawStarRow(ctx, starCx, starY, starSize, st.stars);
  ctx.restore();
}

function drawBadgeRibbon(ctx, W, H, text) {
  if (!text) return;
  ctx.save();
  ctx.translate(W - Math.round(W * 0.055), Math.round(H * 0.055));
  ctx.rotate(Math.PI / 4);
  const bandH = Math.max(22, Math.round(H * 0.038));
  const bandW = Math.round(W * 0.34);
  ctx.fillStyle = "#ff2e88";
  ctx.fillRect(-bandW / 2, -bandH / 2, bandW, bandH);
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.fillRect(-bandW / 2, -bandH / 2, bandW, 2);
  ctx.fillRect(-bandW / 2, bandH / 2 - 2, bandW, 2);
  ctx.fillStyle = "#fff";
  ctx.font = Math.round(bandH * 0.52) + "px Anton, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text.toUpperCase(), 0, 1);
  ctx.restore();
}

function makeGrainPattern(ctx) {
  const n = document.createElement("canvas");
  n.width = 160;
  n.height = 160;
  const nctx = n.getContext("2d");
  const img = nctx.createImageData(160, 160);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.floor(Math.random() * 255);
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 28;
  }
  nctx.putImageData(img, 0, 0);
  return ctx.createPattern(n, "repeat");
}

function drawGrainOverlay(ctx, W, H) {
  if (!grainPattern) grainPattern = makeGrainPattern(ctx);
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.globalCompositeOperation = "overlay";
  ctx.fillStyle = grainPattern;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

function drawVignetteOverlay(ctx, W, H) {
  const grad = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.72);
  grad.addColorStop(0, "rgba(8,4,18,0)");
  grad.addColorStop(1, "rgba(8,4,18,0.48)");
  ctx.save();
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

/* ---- the cover renderer ---------------------------------------------- */

function coverScaleFor(photo, cw, ch) {
  return Math.max(cw / photo.img.naturalWidth, ch / photo.img.naturalHeight);
}

function drawGradedPanel(ctx, cell, panel, lut) {
  const photo = photos[panel.photo];
  if (!photo || !photo.img) {
    ctx.save();
    const grad = ctx.createLinearGradient(cell.x, cell.y, cell.x + cell.w, cell.y + cell.h);
    grad.addColorStop(0, "#3b2a63");
    grad.addColorStop(1, "#ff5e62");
    ctx.fillStyle = grad;
    ctx.fillRect(cell.x, cell.y, cell.w, cell.h);
    ctx.restore();
    return;
  }
  const iw = photo.img.naturalWidth;
  const ih = photo.img.naturalHeight;
  const scale = coverScaleFor(photo, cell.w, cell.h) * panel.zoom;
  const sw = Math.min(iw, cell.w / scale);
  const sh = Math.min(ih, cell.h / scale);
  const sx = Math.max(0, Math.min(iw - sw, panel.cx * iw - sw / 2));
  const sy = Math.max(0, Math.min(ih - sh, panel.cy * ih - sh / 2));
  scratchCanvas.width = Math.max(2, Math.round(cell.w));
  scratchCanvas.height = Math.max(2, Math.round(cell.h));
  scratchCtx.drawImage(photo.img, sx, sy, sw, sh, 0, 0, scratchCanvas.width, scratchCanvas.height);
  applyGradeLut(scratchCtx, scratchCanvas.width, scratchCanvas.height, lut);
  ctx.save();
  ctx.translate(cell.x + cell.w / 2, cell.y + cell.h / 2);
  if (cell.rot) ctx.rotate(cell.rot);
  ctx.drawImage(scratchCanvas, -cell.w / 2, -cell.h / 2, cell.w, cell.h);
  ctx.restore();
}

function drawCoverBackground(ctx, W, H, st, geo) {
  if (geo.background === "sunset") {
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#1b0f3c");
    sky.addColorStop(0.45, "#7b2d8b");
    sky.addColorStop(0.75, "#ff5e62");
    sky.addColorStop(1, "#ffb347");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);
    drawRetroSun(ctx, W * 0.86, H * 0.13, Math.min(W, H) * 0.13);
    drawPalmSilhouette(ctx, W * 0.04, H * 0.98, Math.min(W, H) / 620, "#160a2e");
    drawPalmSilhouette(ctx, W * 0.94, H * 0.99, Math.min(W, H) / 760, "#160a2e");
    ctx.fillStyle = "rgba(22,10,46,0.35)";
    ctx.fillRect(0, H * 0.86, W, H * 0.14);
    return;
  }
  if (geo.background === "photo") return; // the single panel fills the canvas
  ctx.fillStyle = "#f6efe3";
  ctx.fillRect(0, 0, W, H);
}

function renderCover(ctx, W, H, st) {
  const geo = layoutGeometry(st.layout, W, H);
  const lut = buildGradeLut(st.grade);
  drawCoverBackground(ctx, W, H, st, geo);
  for (const cell of geo.cells) {
    const panel = st.panels[cell.panel];
    if (cell.rot) {
      // Polaroid-style white frame for tilted snapshots.
      ctx.save();
      ctx.translate(cell.x + cell.w / 2, cell.y + cell.h / 2);
      ctx.rotate(cell.rot);
      ctx.shadowColor = "rgba(10,4,26,0.5)";
      ctx.shadowBlur = Math.max(8, W * 0.012);
      ctx.shadowOffsetY = Math.max(4, H * 0.008);
      const fr = Math.max(8, Math.round(W * 0.012));
      ctx.fillStyle = "#fdfaf2";
      ctx.fillRect(-cell.w / 2 - fr, -cell.h / 2 - fr, cell.w + fr * 2, cell.h + fr * 2 + fr * 2);
      ctx.restore();
      drawGradedPanel(ctx, cell, panel, lut);
    } else {
      drawGradedPanel(ctx, cell, panel, lut);
      if (st.ink) {
        ctx.save();
        ctx.strokeStyle = "#14101f";
        ctx.lineWidth = Math.max(2, Math.round(W * 0.0035));
        ctx.strokeRect(cell.x, cell.y, cell.w, cell.h);
        ctx.strokeStyle = "rgba(255,255,255,0.85)";
        ctx.lineWidth = Math.max(1, Math.round(W * 0.0012));
        ctx.strokeRect(cell.x + 3, cell.y + 3, cell.w - 6, cell.h - 6);
        ctx.restore();
      }
    }
  }
  drawTitleBlock(ctx, geo.title, st, W, H);
  drawBadgeRibbon(ctx, W, H, st.badge);
  if (st.grain) drawGrainOverlay(ctx, W, H);
  if (st.vignette) drawVignetteOverlay(ctx, W, H);
}

/* ---- preview ---------------------------------------------------------- */

function previewBackingSize() {
  const size = SIZES[state.size];
  const maxSide = document.body.classList.contains("shot-cover") ? 1280 : 960;
  const scale = Math.min(1, maxSide / Math.max(size.width, size.height));
  return { w: Math.round(size.width * scale), h: Math.round(size.height * scale) };
}

function renderPreview() {
  const size = previewBackingSize();
  if (stageCanvas.width !== size.w || stageCanvas.height !== size.h) {
    stageCanvas.width = size.w;
    stageCanvas.height = size.h;
  }
  renderCover(stageCtx, size.w, size.h, state);
  const geo = layoutGeometry(state.layout, size.w, size.h);
  const cell = geo.cells.find(function (c) { return c.panel === state.selected; });
  if (cell) {
    stageCtx.save();
    stageCtx.translate(cell.x + cell.w / 2, cell.y + cell.h / 2);
    if (cell.rot) stageCtx.rotate(cell.rot);
    stageCtx.setLineDash([10, 7]);
    stageCtx.strokeStyle = "#37e6ff";
    stageCtx.lineWidth = 3;
    stageCtx.strokeRect(-cell.w / 2 - 4, -cell.h / 2 - 4, cell.w + 8, cell.h + 8);
    stageCtx.restore();
  }
  updatePanelInfo();
}

function updatePanelInfo() {
  const count = LAYOUT_PANEL_COUNT[state.layout];
  const panel = state.panels[state.selected];
  const photo = photos[panel ? panel.photo : 0];
  const info = document.getElementById("panelInfo");
  if (!panel || state.selected >= count) {
    info.textContent = "No panel selected — click a panel on the cover";
  } else {
    info.textContent = "Panel " + (state.selected + 1) + " of " + count + " — " + (photo ? photo.name : "no photo");
  }
  document.getElementById("zoomSlider").value = panel ? String(panel.zoom) : "1";
  document.getElementById("panXSlider").value = panel ? String(panel.cx) : "0.5";
  document.getElementById("panYSlider").value = panel ? String(panel.cy) : "0.5";
}

/* ---- export ------------------------------------------------------------ */

function exportCoverPng(sizeKey) {
  const size = SIZES[sizeKey];
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  renderCover(canvas.getContext("2d"), size.width, size.height, state);
  return new Promise(function (resolve) {
    canvas.toBlob(function (blob) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "neon-palms-cover-" + size.width + "x" + size.height + ".png";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); resolve(true); }, 500);
    }, "image/png");
  });
}

async function exportAllSizes() {
  const btn = document.getElementById("exportAllBtn");
  btn.disabled = true;
  btn.textContent = "Exporting…";
  for (const key of ["square", "portrait", "wide"]) {
    await exportCoverPng(key);
    await new Promise(function (r) { setTimeout(r, 350); });
  }
  btn.disabled = false;
  btn.textContent = "Export all 3 sizes";
}

/* ---- controls ------------------------------------------------------------ */

function syncControlsFromState() {
  document.querySelectorAll("#layoutBar button").forEach(function (b) {
    b.classList.toggle("active", b.dataset.layout === state.layout);
  });
  document.querySelectorAll("#gradeBar button").forEach(function (b) {
    b.classList.toggle("active", b.dataset.grade === state.grade);
  });
  document.querySelectorAll("#sizeBar button").forEach(function (b) {
    b.classList.toggle("active", b.dataset.size === state.size);
  });
  document.getElementById("titleInput").value = state.title;
  document.getElementById("subtitleInput").value = state.subtitle;
  document.getElementById("badgeInput").value = state.badge;
  document.getElementById("starsSlider").value = String(state.stars);
  document.getElementById("starsValue").textContent = "★".repeat(state.stars) + "☆".repeat(5 - state.stars);
  document.getElementById("titleFillSelect").value = state.titleFill;
  document.getElementById("grainToggle").checked = state.grain;
  document.getElementById("vignetteToggle").checked = state.vignette;
  document.getElementById("inkToggle").checked = state.ink;
  document.getElementById("halftoneToggle").checked = state.halftone;
  syncHistoryButtons();
  renderPhotoTray();
}

function setLayout(layout) {
  if (!LAYOUTS.includes(layout)) return;
  state.layout = layout;
  state.selected = 0;
  pushHistory();
  syncControlsFromState();
  renderPreview();
}

function setGrade(grade) {
  if (!GRADES[grade]) return;
  state.grade = grade;
  pushHistory();
  syncControlsFromState();
  renderPreview();
}

function setSize(sizeKey) {
  if (!SIZES[sizeKey]) return;
  state.size = sizeKey;
  pushHistory();
  syncControlsFromState();
  renderPreview();
}

function bindControls() {
  document.getElementById("undoBtn").addEventListener("click", undoState);
  document.getElementById("redoBtn").addEventListener("click", redoState);
  document.getElementById("exportAllBtn").addEventListener("click", exportAllSizes);
  document.querySelectorAll("#layoutBar button").forEach(function (b) {
    b.addEventListener("click", function () { setLayout(b.dataset.layout); });
  });
  document.querySelectorAll("#gradeBar button").forEach(function (b) {
    b.addEventListener("click", function () { setGrade(b.dataset.grade); });
  });
  document.querySelectorAll("#sizeBar button").forEach(function (b) {
    b.addEventListener("click", function () { setSize(b.dataset.size); });
  });
  document.querySelectorAll("#exportBar button").forEach(function (b) {
    b.addEventListener("click", function () { exportCoverPng(b.dataset.size); });
  });
  document.getElementById("addPhotosInput").addEventListener("change", function (e) {
    addUploadedPhotos(e.target.files);
    e.target.value = "";
  });
  document.getElementById("fillAllBtn").addEventListener("click", function () {
    const selectedThumb = state.panels[state.selected];
    fillAllPanelsWithPhoto(selectedThumb ? selectedThumb.photo : 0);
  });
  document.getElementById("titleInput").addEventListener("input", function (e) {
    state.title = e.target.value.toUpperCase() || "NEON PALMS";
    renderPreview();
  });
  document.getElementById("titleInput").addEventListener("change", pushHistory);
  document.getElementById("subtitleInput").addEventListener("input", function (e) {
    state.subtitle = e.target.value || "chasing the sunset";
    renderPreview();
  });
  document.getElementById("subtitleInput").addEventListener("change", pushHistory);
  document.getElementById("badgeInput").addEventListener("input", function (e) {
    state.badge = e.target.value;
    renderPreview();
  });
  document.getElementById("badgeInput").addEventListener("change", pushHistory);
  document.getElementById("starsSlider").addEventListener("input", function (e) {
    state.stars = Number(e.target.value);
    document.getElementById("starsValue").textContent = "★".repeat(state.stars) + "☆".repeat(5 - state.stars);
    renderPreview();
  });
  document.getElementById("starsSlider").addEventListener("change", pushHistory);
  document.getElementById("titleFillSelect").addEventListener("change", function (e) {
    state.titleFill = e.target.value;
    pushHistory();
    renderPreview();
  });
  document.getElementById("grainToggle").addEventListener("change", function (e) {
    state.grain = e.target.checked;
    pushHistory();
    renderPreview();
  });
  document.getElementById("vignetteToggle").addEventListener("change", function (e) {
    state.vignette = e.target.checked;
    pushHistory();
    renderPreview();
  });
  document.getElementById("inkToggle").addEventListener("change", function (e) {
    state.ink = e.target.checked;
    pushHistory();
    renderPreview();
  });
  document.getElementById("halftoneToggle").addEventListener("change", function (e) {
    state.halftone = e.target.checked;
    pushHistory();
    renderPreview();
  });
  document.getElementById("zoomSlider").addEventListener("input", function (e) {
    const panel = state.panels[state.selected];
    if (panel) { panel.zoom = Number(e.target.value); renderPreview(); }
  });
  document.getElementById("zoomSlider").addEventListener("change", pushHistory);
  document.getElementById("panXSlider").addEventListener("input", function (e) {
    const panel = state.panels[state.selected];
    if (panel) { panel.cx = Number(e.target.value); renderPreview(); }
  });
  document.getElementById("panXSlider").addEventListener("change", pushHistory);
  document.getElementById("panYSlider").addEventListener("input", function (e) {
    const panel = state.panels[state.selected];
    if (panel) { panel.cy = Number(e.target.value); renderPreview(); }
  });
  document.getElementById("panYSlider").addEventListener("change", pushHistory);
  document.getElementById("centerPanelBtn").addEventListener("click", function () {
    const panel = state.panels[state.selected];
    if (panel) { panel.cx = 0.5; panel.cy = 0.5; panel.zoom = 1.1; pushHistory(); renderPreview(); }
  });
  document.addEventListener("keydown", function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !e.shiftKey) { e.preventDefault(); undoState(); }
    if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === "y" || (e.key.toLowerCase() === "z" && e.shiftKey))) { e.preventDefault(); redoState(); }
  });
}

/* ---- canvas pointer: select, drag to pan, wheel to zoom ----------------- */

function canvasPoint(event) {
  const rect = stageCanvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * (stageCanvas.width / rect.width),
    y: (event.clientY - rect.top) * (stageCanvas.height / rect.height),
  };
}

function hitTestPanel(point) {
  const geo = layoutGeometry(state.layout, stageCanvas.width, stageCanvas.height);
  for (let i = geo.cells.length - 1; i >= 0; i--) {
    const cell = geo.cells[i];
    const dx = point.x - (cell.x + cell.w / 2);
    const dy = point.y - (cell.y + cell.h / 2);
    const cos = Math.cos(-(cell.rot || 0));
    const sin = Math.sin(-(cell.rot || 0));
    const lx = dx * cos - dy * sin;
    const ly = dx * sin + dy * cos;
    if (Math.abs(lx) <= cell.w / 2 && Math.abs(ly) <= cell.h / 2) return cell;
  }
  return null;
}

function bindCanvasPointer() {
  let drag = null;
  let wheelTimer = null;
  stageCanvas.addEventListener("pointerdown", function (e) {
    const cell = hitTestPanel(canvasPoint(e));
    if (!cell) return;
    state.selected = cell.panel;
    renderPhotoTray();
    renderPreview();
    drag = { panel: state.panels[cell.panel], cell: cell, last: canvasPoint(e), moved: false };
    stageCanvas.setPointerCapture(e.pointerId);
  });
  stageCanvas.addEventListener("pointermove", function (e) {
    if (!drag) return;
    const p = canvasPoint(e);
    const photo = photos[drag.panel.photo];
    if (photo && photo.img) {
      const scale = coverScaleFor(photo, drag.cell.w, drag.cell.h) * drag.panel.zoom;
      drag.panel.cx -= (p.x - drag.last.x) / scale / photo.img.naturalWidth;
      drag.panel.cy -= (p.y - drag.last.y) / scale / photo.img.naturalHeight;
      drag.panel.cx = Math.max(0, Math.min(1, drag.panel.cx));
      drag.panel.cy = Math.max(0, Math.min(1, drag.panel.cy));
      drag.moved = true;
    }
    drag.last = p;
    renderPreview();
  });
  stageCanvas.addEventListener("pointerup", function () {
    if (drag && drag.moved) pushHistory();
    drag = null;
  });
  stageCanvas.addEventListener("wheel", function (e) {
    e.preventDefault();
    const panel = state.panels[state.selected];
    if (!panel) return;
    panel.zoom = Math.max(1, Math.min(3, panel.zoom * (1 - e.deltaY * 0.001)));
    renderPreview();
    if (wheelTimer) clearTimeout(wheelTimer);
    wheelTimer = setTimeout(pushHistory, 350);
  }, { passive: false });
}

/* ---- shot mode: a clean cover view for screenshots ---------------------- */

function applyShotMode() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("shot") !== "cover") return;
  document.body.classList.add("shot-cover");
  const size = params.get("size");
  if (size && SIZES[size]) state.size = size;
  const layout = params.get("layout");
  if (layout && LAYOUTS.includes(layout)) state.layout = layout;
  const grade = params.get("grade");
  if (grade && GRADES[grade]) state.grade = grade;
  document.title = "Neon Palms — cover";
}

/* ---- boot ---------------------------------------------------------------- */

async function bootCoverStudio() {
  bindControls();
  bindCanvasPointer();
  applyShotMode();
  await loadSamplePhotos();
  try {
    await document.fonts.load('100px Anton');
    await document.fonts.load('40px Pacifico');
  } catch (err) {
    /* Fonts fall back to system sans; the cover still renders. */
  }
  pushHistory();
  syncControlsFromState();
  renderPreview();
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { renderPreview(); });
  }
}

/* Automation hook: lets a test drive the studio (load, export, inspect). */
window.__coverStudio = {
  getState: function () { return state; },
  setState: function (next) { state = next; syncControlsFromState(); renderPreview(); },
  exportCoverPng: exportCoverPng,
  exportAllSizes: exportAllSizes,
  renderPreview: renderPreview,
};

bootCoverStudio();
