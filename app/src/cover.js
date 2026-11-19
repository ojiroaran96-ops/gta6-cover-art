// Neon Palms Cover Studio — cover renderer.
// Draws the multi-panel poster cover onto any canvas at any size:
// layouts, gradient-map grades, bold lettering, halftone title block,
// heat meter, badge ribbon, grain and vignette. No network, no libraries.

export const SIZES = [
  { id: "square", label: "Square 1080 × 1080", w: 1080, h: 1080 },
  { id: "portrait", label: "Portrait 1080 × 1350", w: 1080, h: 1350 },
  { id: "wide", label: "Wide 1920 × 1080", w: 1920, h: 1080 },
];

export const LAYOUTS = {
  grid4: { name: "Four-panel grid", panels: 4 },
  hero3: { name: "Hero + three", panels: 4 },
  fullbleed: { name: "Full-bleed", panels: 1 },
  tilted: { name: "Tilted snapshots", panels: 3 },
  grid9: { name: "Nine-panel grid", panels: 9 },
};

export const GRADES = {
  sunset: {
    name: "Sunset",
    sky: ["#2b0f54", "#ff7a3d", "#ff2e88"],
    sun: "#ffd9a0",
    map: [[0, "#160a2e"], [0.35, "#7a1e5e"], [0.65, "#ff7a3d"], [1, "#ffe9b0"]],
    strength: 0.55,
    title: ["#fff7ae", "#ff9a3d", "#ff2e88"],
    accent: "#37f4e4",
    ink: "#160a24",
  },
  neon: {
    name: "Neon night",
    sky: ["#05030f", "#2b0f54", "#0e2a4a"],
    sun: "#ff2e88",
    map: [[0, "#030309"], [0.35, "#3d0f66"], [0.65, "#ff2e88"], [1, "#8ffcf1"]],
    strength: 0.6,
    title: ["#e8fff9", "#37f4e4", "#ff2e88"],
    accent: "#ff2e88",
    ink: "#05030f",
  },
  gold: {
    name: "Gold hour",
    sky: ["#2a1503", "#7a3d00", "#ffb347"],
    sun: "#fff3c4",
    map: [[0, "#140a02"], [0.35, "#6e3f08"], [0.65, "#c97b1e"], [1, "#ffe9b0"]],
    strength: 0.5,
    title: ["#fff3c4", "#ffb347", "#ff8c42"],
    accent: "#ff8c42",
    ink: "#1c0e02",
  },
  dusk: {
    name: "Dusk blue",
    sky: ["#050914", "#16224d", "#3b2d6e"],
    sun: "#b9c8ff",
    map: [[0, "#03040a"], [0.35, "#1d2c5e"], [0.65, "#4a5fa5"], [1, "#dfe8ff"]],
    strength: 0.55,
    title: ["#dfe8ff", "#8fa8ff", "#7dd3fc"],
    accent: "#7dd3fc",
    ink: "#070b1c",
  },
  candy: {
    name: "Candy pink",
    sky: ["#2b0218", "#7a0e4d", "#ff5e7a"],
    sun: "#ffd166",
    map: [[0, "#1c0212"], [0.35, "#7a0e4d"], [0.65, "#ff2e88"], [1, "#ffe9a0"]],
    strength: 0.55,
    title: ["#ffffff", "#ffd166", "#ff2e88"],
    accent: "#37f4e4",
    ink: "#22040f",
  },
};

export const SAMPLE_PHOTOS = [
  { id: "sample-convertible", file: "samples/convertible.jpg", name: "Convertible" },
  { id: "sample-neon", file: "samples/neon.jpg", name: "Neon street" },
  { id: "sample-pier", file: "samples/pier.jpg", name: "Pier sunset" },
  { id: "sample-rooftop", file: "samples/rooftop.jpg", name: "Rooftop" },
];

export function panelCount(layoutId) {
  return (LAYOUTS[layoutId] || LAYOUTS.grid4).panels;
}

export function defaultCoverState() {
  const panels = [];
  for (let i = 0; i < 9; i++) {
    panels.push({
      photo: i < SAMPLE_PHOTOS.length ? SAMPLE_PHOTOS[i].id : null,
      x: 0,
      y: 0,
      zoom: 1,
      rot: 0,
      flip: false,
    });
  }
  return {
    layout: "grid4",
    grade: "sunset",
    size: "square",
    title: "NEON PALMS",
    subtitle: "chasing the sunset",
    badge: "EST. 2026",
    heat: 4,
    titleSize: 1,
    halftone: true,
    grain: true,
    vignette: true,
    frame: true,
    panels,
  };
}

// Panel slots for a layout, in pixels. Each slot: { x, y, w, h, rot }.
export function layoutSlots(layoutId, w, h) {
  const u = (fx, fy, fw, fh, rot = 0) => ({
    x: fx * w,
    y: fy * h,
    w: fw * w,
    h: fh * h,
    rot,
  });
  const gap = 0.016;
  const top = 0.03;
  const regionW = 0.93;
  const regionH = 0.68;
  const left = 0.035;
  switch (layoutId) {
    case "hero3": {
      const cw = (regionW - gap) / 3;
      const heroW = regionW * 0.6;
      const colX = left + heroW + gap;
      const colW = regionW - heroW - gap;
      const rowH = (regionH - gap * 2) / 3;
      return [
        u(left, top, heroW, regionH),
        u(colX, top, colW, rowH),
        u(colX, top + rowH + gap, colW, rowH),
        u(colX, top + (rowH + gap) * 2, colW, rowH),
      ];
    }
    case "fullbleed":
      return [u(0, 0, 1, 1)];
    case "tilted":
      return [
        u(0.05, 0.1, 0.4, 0.5, -6),
        u(0.33, 0.045, 0.4, 0.55, 2),
        u(0.59, 0.12, 0.38, 0.48, 6),
      ];
    case "grid9": {
      const cw = (regionW - gap * 2) / 3;
      const ch = (regionH - gap * 2) / 3;
      const slots = [];
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          slots.push(u(left + c * (cw + gap), top + r * (ch + gap), cw, ch));
        }
      }
      return slots;
    }
    case "grid4":
    default: {
      const cw = (regionW - gap) / 2;
      const ch = (regionH - gap) / 2;
      return [
        u(left, top, cw, ch),
        u(left + cw + gap, top, cw, ch),
        u(left, top + ch + gap, cw, ch),
        u(left + cw + gap, top + ch + gap, cw, ch),
      ];
    }
  }
}

// Title band rect for a layout, in pixels.
export function titleBandRect(layoutId, w, h) {
  if (layoutId === "fullbleed") return { x: 0.05 * w, y: 0.7 * h, w: 0.9 * w, h: 0.24 * h, overlay: true };
  if (layoutId === "tilted") return { x: 0.05 * w, y: 0.67 * h, w: 0.9 * w, h: 0.27 * h, overlay: true };
  return { x: 0.035 * w, y: 0.735 * h, w: 0.93 * w, h: 0.225 * h, overlay: false };
}

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// A 256-entry per-channel lookup from gradient-map stops [[t, hex], ...].
export function gradeLookup(stops) {
  const lut = new Uint8Array(256 * 3);
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    let a = stops[0];
    let b = stops[stops.length - 1];
    for (let s = 0; s < stops.length - 1; s++) {
      if (t >= stops[s][0] && t <= stops[s + 1][0]) {
        a = stops[s];
        b = stops[s + 1];
        break;
      }
    }
    const span = b[0] - a[0] || 1;
    const f = Math.min(1, Math.max(0, (t - a[0]) / span));
    const ca = hexToRgb(a[1]);
    const cb = hexToRgb(b[1]);
    lut[i * 3] = Math.round(ca[0] + (cb[0] - ca[0]) * f);
    lut[i * 3 + 1] = Math.round(ca[1] + (cb[1] - ca[1]) * f);
    lut[i * 3 + 2] = Math.round(ca[2] + (cb[2] - ca[2]) * f);
  }
  return lut;
}

function roundedPath(ctx, x, y, w, h, r) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function drawPhotoCover(ctx, img, slot, panel) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const base = Math.max(slot.w / iw, slot.h / ih);
  const scale = base * panel.zoom;
  const dw = iw * scale;
  const dh = ih * scale;
  const cx = slot.w / 2 + panel.x * slot.w;
  const cy = slot.h / 2 + panel.y * slot.h;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((panel.rot * Math.PI) / 180);
  ctx.scale(panel.flip ? -1 : 1, 1);
  ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
  ctx.restore();
}

function drawPlaceholder(ctx, slot, grade) {
  const g = ctx.createLinearGradient(0, 0, slot.w, slot.h);
  g.addColorStop(0, grade.sky[0]);
  g.addColorStop(1, grade.sky[2]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, slot.w, slot.h);
  ctx.fillStyle = "rgba(255,255,255,0.28)";
  const cx = slot.w / 2;
  const cy = slot.h / 2;
  const r = Math.min(slot.w, slot.h) * 0.16;
  ctx.beginPath();
  ctx.arc(cx, cy - r * 0.4, r * 0.55, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx - r * 1.3, cy + r);
  ctx.lineTo(cx - r * 0.3, cy - r * 0.2);
  ctx.lineTo(cx + r * 0.4, cy + r);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx + r * 0.1, cy + r);
  ctx.lineTo(cx + r * 0.8, cy - r * 0.1);
  ctx.lineTo(cx + r * 1.4, cy + r);
  ctx.closePath();
  ctx.fill();
}

function applyGradeToCanvas(canvas, grade) {
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  const image = ctx.getImageData(0, 0, w, h);
  const d = image.data;
  const lut = gradeLookup(grade.map);
  const s = grade.strength;
  for (let i = 0; i < d.length; i += 4) {
    const lum = Math.round(0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]);
    const li = lum * 3;
    for (let c = 0; c < 3; c++) {
      let v = d[i + c] * (1 - s) + lut[li + c] * s;
      v = (v - 128) * 1.07 + 128;
      d[i + c] = v < 0 ? 0 : v > 255 ? 255 : v;
    }
  }
  ctx.putImageData(image, 0, 0);
}

let noiseCanvas = null;
function grainTile() {
  if (noiseCanvas) return noiseCanvas;
  noiseCanvas = document.createElement("canvas");
  noiseCanvas.width = 140;
  noiseCanvas.height = 140;
  const ctx = noiseCanvas.getContext("2d");
  const image = ctx.createImageData(140, 140);
  for (let i = 0; i < image.data.length; i += 4) {
    const v = Math.floor(Math.random() * 256);
    image.data[i] = v;
    image.data[i + 1] = v;
    image.data[i + 2] = v;
    image.data[i + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  return noiseCanvas;
}

function fitFont(ctx, text, family, maxWidth, startPx, weight = "") {
  let px = startPx;
  while (px > 8) {
    ctx.font = `${weight} ${px}px ${family}`;
    if (ctx.measureText(text).width <= maxWidth) return px;
    px -= 2;
  }
  return px;
}

function drawTitleBand(ctx, state, grade, band, w, h) {
  const ink = grade.ink;
  ctx.save();
  roundedPath(ctx, band.x, band.y, band.w, band.h, Math.min(18, band.h * 0.08));
  ctx.fillStyle = band.overlay ? "rgba(10,4,20,0.88)" : ink;
  ctx.fill();
  ctx.clip();
  if (state.halftone) {
    const step = Math.max(10, band.h * 0.09);
    ctx.fillStyle = "rgba(255,255,255,0.10)";
    for (let y = band.y + step / 2; y < band.y + band.h; y += step) {
      for (let x = band.x + step / 2; x < band.x + band.w; x += step) {
        const f = (x - band.x) / band.w;
        const r = (step * 0.32 * (0.4 + f)) / 2;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  ctx.strokeStyle = "rgba(255,255,255,0.55)";
  ctx.lineWidth = Math.max(1, w * 0.0015);
  ctx.beginPath();
  ctx.moveTo(band.x + band.w * 0.04, band.y + band.h * 0.14);
  ctx.lineTo(band.x + band.w * 0.96, band.y + band.h * 0.14);
  ctx.stroke();

  const title = (state.title || "UNTITLED").toUpperCase();
  const titlePx = fitFont(
    ctx,
    title,
    "Anton, sans-serif",
    band.w * 0.86,
    band.h * 0.52 * state.titleSize
  );
  const titleGrad = ctx.createLinearGradient(band.x, band.y, band.x + band.w, band.y);
  grade.title.forEach((c, i) => titleGrad.addColorStop(i / (grade.title.length - 1), c));
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const titleY = band.y + band.h * 0.44;
  ctx.font = `${titlePx}px Anton, sans-serif`;
  ctx.lineJoin = "round";
  ctx.strokeStyle = "rgba(0,0,0,0.65)";
  ctx.lineWidth = Math.max(2, titlePx / 14);
  ctx.shadowColor = "rgba(0,0,0,0.4)";
  ctx.shadowBlur = titlePx / 10;
  ctx.shadowOffsetY = titlePx / 24;
  ctx.strokeText(title, band.x + band.w / 2, titleY);
  ctx.shadowColor = "transparent";
  ctx.fillStyle = titleGrad;
  ctx.fillText(title, band.x + band.w / 2, titleY);

  if (state.subtitle) {
    const subPx = Math.max(10, band.h * 0.17);
    ctx.save();
    ctx.translate(band.x + band.w / 2, band.y + band.h * 0.8);
    ctx.rotate(-0.02);
    ctx.font = `${subPx}px Pacifico, cursive`;
    ctx.fillStyle = grade.accent;
    ctx.shadowColor = grade.accent;
    ctx.shadowBlur = subPx * 0.7;
    ctx.fillText(state.subtitle, 0, 0);
    ctx.restore();
  }

  const stars = "★★★★★☆☆☆☆☆".slice(5 - state.heat, 10 - state.heat);
  ctx.font = `${Math.max(11, band.h * 0.13)}px sans-serif`;
  ctx.fillStyle = "#ffb347";
  ctx.shadowColor = "rgba(255,179,71,0.8)";
  ctx.shadowBlur = 8;
  ctx.textAlign = "right";
  ctx.fillText(`HEAT ${stars}`, band.x + band.w * 0.97, band.y + band.h * 0.88);
  ctx.restore();
}

function drawBadgeRibbon(ctx, state, grade, w, h) {
  if (!state.badge) return;
  const px = Math.max(12, w * 0.018);
  ctx.save();
  ctx.font = `${px}px Anton, sans-serif`;
  const tw = ctx.measureText(state.badge).width;
  const bw = tw + px * 1.6;
  const bh = px * 1.9;
  const cx = w - bw / 2 - w * 0.012;
  const cy = Math.max(bh / 2 + 4, h * 0.045);
  ctx.translate(cx, cy);
  ctx.rotate(0.04);
  ctx.fillStyle = "#ff2e88";
  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 3;
  roundedPath(ctx, -bw / 2, -bh / 2, bw, bh, bh / 2);
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(state.badge, 0, 1);
  ctx.restore();
}

// Draws the whole cover. getPhoto(id) returns an HTMLImageElement or null.
export function drawCover(canvas, state, w, h, getPhoto) {
  const grade = GRADES[state.grade] || GRADES.sunset;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");

  const sky = ctx.createLinearGradient(0, 0, 0, h);
  grade.sky.forEach((c, i) => sky.addColorStop(i / (grade.sky.length - 1), c));
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  const sunR = w * 0.24;
  const sun = ctx.createRadialGradient(w * 0.5, h * 0.2, 0, w * 0.5, h * 0.2, sunR);
  sun.addColorStop(0, grade.sun);
  sun.addColorStop(1, "rgba(0,0,0,0)");
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = sun;
  ctx.fillRect(w * 0.5 - sunR, h * 0.2 - sunR, sunR * 2, sunR * 2);
  ctx.globalAlpha = 1;

  const slots = layoutSlots(state.layout, w, h);
  const radius = Math.max(4, Math.min(w, h) * 0.012);
  slots.forEach((slot, i) => {
    const panel = state.panels[i] || { photo: null, x: 0, y: 0, zoom: 1, rot: 0, flip: false };
    const img = panel.photo ? getPhoto(panel.photo) : null;
    const off = document.createElement("canvas");
    off.width = Math.max(2, Math.round(slot.w));
    off.height = Math.max(2, Math.round(slot.h));
    const octx = off.getContext("2d");
    const local = { x: 0, y: 0, w: off.width, h: off.height };
    if (img && img.complete && img.naturalWidth > 0) {
      drawPhotoCover(octx, img, local, panel);
      applyGradeToCanvas(off, grade);
    } else {
      drawPlaceholder(octx, local, grade);
    }
    ctx.save();
    ctx.translate(slot.x + slot.w / 2, slot.y + slot.h / 2);
    ctx.rotate((slot.rot * Math.PI) / 180);
    ctx.shadowColor = "rgba(0,0,0,0.55)";
    ctx.shadowBlur = Math.max(6, w * 0.012);
    ctx.shadowOffsetY = Math.max(3, w * 0.006);
    roundedPath(ctx, -slot.w / 2, -slot.h / 2, slot.w, slot.h, radius);
    ctx.fillStyle = "#000";
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.save();
    roundedPath(ctx, -slot.w / 2, -slot.h / 2, slot.w, slot.h, radius);
    ctx.clip();
    ctx.drawImage(off, -slot.w / 2, -slot.h / 2, slot.w, slot.h);
    ctx.restore();
    ctx.lineWidth = Math.max(2, w * 0.0035);
    ctx.strokeStyle = "rgba(255,255,255,0.92)";
    roundedPath(ctx, -slot.w / 2, -slot.h / 2, slot.w, slot.h, radius);
    ctx.stroke();
    ctx.restore();
  });

  const band = titleBandRect(state.layout, w, h);
  drawTitleBand(ctx, state, grade, band, w, h);
  drawBadgeRibbon(ctx, state, grade, w, h);

  if (state.grain) {
    const tile = grainTile();
    const pattern = ctx.createPattern(tile, "repeat");
    ctx.save();
    ctx.globalAlpha = 0.07;
    ctx.globalCompositeOperation = "overlay";
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  if (state.vignette) {
    const v = ctx.createRadialGradient(
      w / 2, h / 2, Math.min(w, h) * 0.42,
      w / 2, h / 2, Math.max(w, h) * 0.75
    );
    v.addColorStop(0, "rgba(5,2,10,0)");
    v.addColorStop(1, "rgba(5,2,10,0.30)");
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, w, h);
  }

  if (state.frame) {
    const bw = Math.max(4, w * 0.008);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = bw;
    ctx.strokeRect(bw / 2, bw / 2, w - bw, h - bw);
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.lineWidth = Math.max(1, w * 0.001);
    ctx.strokeRect(bw * 2, bw * 2, w - bw * 4, h - bw * 4);
  }
  return canvas;
}
