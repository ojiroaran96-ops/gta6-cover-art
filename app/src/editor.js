// Neon Palms Cover Studio — editor wiring.
// Photos, layouts, grades, caption, per-panel crop and position, undo/redo
// and PNG export. Photos are read on the machine and never uploaded.
import {
  SIZES,
  LAYOUTS,
  GRADES,
  SAMPLE_PHOTOS,
  panelCount,
  defaultCoverState,
  layoutSlots,
  drawCover,
} from "./cover.js";

const $ = (id) => document.getElementById(id);

const previewCanvas = $("previewCanvas");
const previewCtx = previewCanvas.getContext("2d");

let state = defaultCoverState();
let selectedPanel = 0;
let past = [];
let future = [];
const library = new Map(); // id -> { id, name, img }
let photoSeq = 0;

function snapshot() {
  return JSON.stringify(state);
}

function pushHistory() {
  past.push(snapshot());
  if (past.length > 60) past.shift();
  future = [];
  syncUndoButtons();
}

function restore(json) {
  state = JSON.parse(json);
  selectedPanel = Math.min(selectedPanel, panelCount(state.layout) - 1);
  syncUIFromState();
  renderPreview();
}

function undo() {
  if (!past.length) return;
  future.push(snapshot());
  restore(past.pop());
  syncUndoButtons();
}

function redo() {
  if (!future.length) return;
  past.push(snapshot());
  restore(future.pop());
  syncUndoButtons();
}

function syncUndoButtons() {
  $("undoButton").disabled = past.length === 0;
  $("redoButton").disabled = future.length === 0;
}

function getPhoto(id) {
  const entry = library.get(id);
  return entry ? entry.img : null;
}

function previewSize() {
  const size = SIZES.find((s) => s.id === state.size) || SIZES[0];
  const maxSide = 760;
  const scale = Math.min(1, maxSide / Math.max(size.w, size.h));
  return { w: Math.round(size.w * scale), h: Math.round(size.h * scale) };
}

function renderPreview() {
  const { w, h } = previewSize();
  previewCanvas.width = w;
  previewCanvas.height = h;
  drawCover(previewCanvas, state, w, h, getPhoto);
  highlightSelectedPanel();
}

function highlightSelectedPanel() {
  // A thin teal outline around the selected panel, drawn over the preview.
  const slots = layoutSlots(state.layout, previewCanvas.width, previewCanvas.height);
  const slot = slots[selectedPanel];
  if (!slot) return;
  previewCtx.save();
  previewCtx.translate(slot.x + slot.w / 2, slot.y + slot.h / 2);
  previewCtx.rotate((slot.rot * Math.PI) / 180);
  previewCtx.strokeStyle = "#37f4e4";
  previewCtx.lineWidth = 3;
  previewCtx.setLineDash([10, 6]);
  previewCtx.strokeRect(-slot.w / 2, -slot.h / 2, slot.w, slot.h);
  previewCtx.restore();
}

function syncUIFromState() {
  document.querySelectorAll("#sizeTabs button").forEach((b) => {
    b.setAttribute("aria-selected", String(b.dataset.size === state.size));
  });
  document.querySelectorAll("#layoutPicker .layoutChoice").forEach((b) => {
    b.setAttribute("aria-pressed", String(b.dataset.layout === state.layout));
  });
  document.querySelectorAll("#gradePicker .gradeChoice").forEach((b) => {
    b.setAttribute("aria-pressed", String(b.dataset.grade === state.grade));
  });
  $("titleInput").value = state.title;
  $("subtitleInput").value = state.subtitle;
  $("badgeInput").value = state.badge;
  $("titleSize").value = String(state.titleSize);
  $("halftoneToggle").checked = state.halftone;
  $("grainToggle").checked = state.grain;
  $("vignetteToggle").checked = state.vignette;
  $("frameToggle").checked = state.frame;
  document.querySelectorAll("#heatPicker button").forEach((b) => {
    b.classList.toggle("lit", Number(b.dataset.heat) <= state.heat);
  });
  syncPanelBar();
  syncLibraryStrip();
}

function syncPanelBar() {
  const n = panelCount(state.layout);
  $("panelLabel").textContent = `Panel ${selectedPanel + 1} of ${n}`;
  const panel = state.panels[selectedPanel];
  $("panelZoom").value = String(panel.zoom);
  $("panelRotate").value = String(panel.rot);
  const select = $("panelPhoto");
  select.innerHTML = "";
  const none = document.createElement("option");
  none.value = "";
  none.textContent = "— empty panel —";
  select.appendChild(none);
  for (const entry of library.values()) {
    const opt = document.createElement("option");
    opt.value = entry.id;
    opt.textContent = entry.name;
    if (entry.id === panel.photo) opt.selected = true;
    select.appendChild(opt);
  }
  if (!panel.photo) select.value = "";
}

function syncLibraryStrip() {
  const strip = $("libraryStrip");
  strip.innerHTML = "";
  for (const entry of library.values()) {
    const img = document.createElement("img");
    img.className = "thumb";
    img.src = entry.img.src;
    img.alt = entry.name;
    img.title = entry.name;
    if (state.panels[selectedPanel] && state.panels[selectedPanel].photo === entry.id) {
      img.classList.add("selected");
    }
    img.addEventListener("click", () => {
      pushHistory();
      state.panels[selectedPanel].photo = entry.id;
      syncPanelBar();
      syncLibraryStrip();
      renderPreview();
    });
    strip.appendChild(img);
  }
}

function addPhotoToLibrary(id, name, img) {
  library.set(id, { id, name, img });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function loadSamplePhotos() {
  for (const sample of SAMPLE_PHOTOS) {
    if (library.has(sample.id)) continue;
    try {
      const response = await fetch(sample.file);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const img = await loadImage(url);
      addPhotoToLibrary(sample.id, sample.name, img);
    } catch (err) {
      console.warn("sample photo failed", sample.file, err);
    }
  }
  syncPanelBar();
  syncLibraryStrip();
}

async function ensureFonts() {
  try {
    await Promise.all([
      document.fonts.load('16px "Anton"'),
      document.fonts.load('16px "Pacifico"'),
    ]);
    await document.fonts.ready;
  } catch (err) {
    console.warn("fonts not ready", err);
  }
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

async function exportPng(sizeId) {
  await ensureFonts();
  const size = SIZES.find((s) => s.id === sizeId) || SIZES[0];
  const canvas = document.createElement("canvas");
  drawCover(canvas, state, size.w, size.h, getPhoto);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  downloadBlob(blob, `neon-palms-cover-${size.id}-${size.w}x${size.h}.png`);
  return blob;
}

// The PNG the app wrote, as a data URL, for automation and screenshots.
async function exportPngDataUrl(sizeId) {
  await ensureFonts();
  const size = SIZES.find((s) => s.id === sizeId) || SIZES[0];
  const canvas = document.createElement("canvas");
  drawCover(canvas, state, size.w, size.h, getPhoto);
  return canvas.toDataURL("image/png");
}

async function exportAllSizes() {
  for (const size of SIZES) {
    await exportPng(size.id);
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
}

function selectPanel(index) {
  selectedPanel = Math.max(0, Math.min(index, panelCount(state.layout) - 1));
  syncPanelBar();
  syncLibraryStrip();
  renderPreview();
}

function hitPanel(clientX, clientY) {
  const rect = previewCanvas.getBoundingClientRect();
  const px = ((clientX - rect.left) / rect.width) * previewCanvas.width;
  const py = ((clientY - rect.top) / rect.height) * previewCanvas.height;
  const slots = layoutSlots(state.layout, previewCanvas.width, previewCanvas.height);
  for (let i = slots.length - 1; i >= 0; i--) {
    const s = slots[i];
    const cx = px - (s.x + s.w / 2);
    const cy = py - (s.y + s.h / 2);
    const rot = (-s.rot * Math.PI) / 180;
    const lx = cx * Math.cos(rot) - cy * Math.sin(rot);
    const ly = cx * Math.sin(rot) + cy * Math.cos(rot);
    if (Math.abs(lx) <= s.w / 2 && Math.abs(ly) <= s.h / 2) return { index: i, slot: s };
  }
  return null;
}

function wirePointer() {
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let dragSlot = null;
  let dragSnapshot = null;

  previewCanvas.addEventListener("pointerdown", (event) => {
    const hit = hitPanel(event.clientX, event.clientY);
    if (!hit) return;
    event.preventDefault();
    previewCanvas.setPointerCapture(event.pointerId);
    if (hit.index !== selectedPanel) selectPanel(hit.index);
    dragging = true;
    lastX = event.clientX;
    lastY = event.clientY;
    dragSlot = hit.slot;
    dragSnapshot = snapshot();
  });

  previewCanvas.addEventListener("pointermove", (event) => {
    if (!dragging || !dragSlot) return;
    const rect = previewCanvas.getBoundingClientRect();
    const scaleX = previewCanvas.width / rect.width;
    const scaleY = previewCanvas.height / rect.height;
    const dx = (event.clientX - lastX) * scaleX;
    const dy = (event.clientY - lastY) * scaleY;
    lastX = event.clientX;
    lastY = event.clientY;
    const panel = state.panels[selectedPanel];
    panel.x = Math.max(-0.5, Math.min(0.5, panel.x + dx / dragSlot.w));
    panel.y = Math.max(-0.5, Math.min(0.5, panel.y + dy / dragSlot.h));
    renderPreview();
  });

  const endDrag = () => {
    if (dragging && dragSnapshot && dragSnapshot !== snapshot()) {
      past.push(dragSnapshot);
      if (past.length > 60) past.shift();
      future = [];
      syncUndoButtons();
    }
    dragging = false;
    dragSlot = null;
    dragSnapshot = null;
  };
  previewCanvas.addEventListener("pointerup", endDrag);
  previewCanvas.addEventListener("pointercancel", endDrag);

  previewCanvas.addEventListener("wheel", (event) => {
    const hit = hitPanel(event.clientX, event.clientY);
    if (!hit) return;
    event.preventDefault();
    if (hit.index !== selectedPanel) selectPanel(hit.index);
    const panel = state.panels[selectedPanel];
    panel.zoom = Math.max(1, Math.min(3, panel.zoom * Math.exp(-event.deltaY * 0.0012)));
    renderPreview();
    clearTimeout(previewCanvas._wheelTimer);
    previewCanvas._wheelTimer = setTimeout(() => {
      pushHistory();
      syncPanelBar();
    }, 350);
  }, { passive: false });
}

function wireControls() {
  $("undoButton").addEventListener("click", undo);
  $("redoButton").addEventListener("click", redo);
  document.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
      event.preventDefault();
      if (event.shiftKey) redo();
      else undo();
    } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y") {
      event.preventDefault();
      redo();
    }
  });

  document.querySelectorAll("#sizeTabs button").forEach((b) => {
    b.addEventListener("click", () => {
      if (state.size === b.dataset.size) return;
      pushHistory();
      state.size = b.dataset.size;
      syncUIFromState();
      renderPreview();
    });
  });

  document.querySelectorAll("#layoutPicker .layoutChoice").forEach((b) => {
    b.addEventListener("click", () => {
      if (state.layout === b.dataset.layout) return;
      pushHistory();
      state.layout = b.dataset.layout;
      selectedPanel = 0;
      syncUIFromState();
      renderPreview();
    });
  });

  document.querySelectorAll("#gradePicker .gradeChoice").forEach((b) => {
    b.addEventListener("click", () => {
      if (state.grade === b.dataset.grade) return;
      pushHistory();
      state.grade = b.dataset.grade;
      syncUIFromState();
      renderPreview();
    });
  });

  $("fileInput").addEventListener("change", async (event) => {
    const files = [...event.target.files];
    for (const file of files) {
      const url = URL.createObjectURL(file);
      try {
        const img = await loadImage(url);
        const id = `upload-${++photoSeq}`;
        addPhotoToLibrary(id, file.name, img);
      } catch (err) {
        console.warn("could not load photo", file.name, err);
      }
    }
    if (files.length) {
      pushHistory();
      const lastId = [...library.keys()].pop();
      state.panels[selectedPanel].photo = lastId;
      syncPanelBar();
      syncLibraryStrip();
      renderPreview();
    }
    event.target.value = "";
  });

  $("sampleButton").addEventListener("click", async () => {
    await loadSamplePhotos();
    pushHistory();
    state.panels.forEach((panel, i) => {
      if (!panel.photo && i < SAMPLE_PHOTOS.length) panel.photo = SAMPLE_PHOTOS[i].id;
    });
    renderPreview();
  });

  $("panelPhoto").addEventListener("change", (event) => {
    pushHistory();
    state.panels[selectedPanel].photo = event.target.value || null;
    syncLibraryStrip();
    renderPreview();
  });

  $("panelZoom").addEventListener("input", (event) => {
    state.panels[selectedPanel].zoom = Number(event.target.value);
    renderPreview();
  });
  $("panelZoom").addEventListener("change", () => pushHistory());

  $("panelRotate").addEventListener("input", (event) => {
    state.panels[selectedPanel].rot = Number(event.target.value);
    renderPreview();
  });
  $("panelRotate").addEventListener("change", () => pushHistory());

  $("panelFlip").addEventListener("click", () => {
    pushHistory();
    const panel = state.panels[selectedPanel];
    panel.flip = !panel.flip;
    renderPreview();
  });

  $("fillAllButton").addEventListener("click", () => {
    const photo = state.panels[selectedPanel].photo;
    if (!photo) return;
    pushHistory();
    state.panels.forEach((panel) => { panel.photo = photo; });
    renderPreview();
  });

  const textField = (id, key) => {
    $(id).addEventListener("input", (event) => {
      state[key] = event.target.value;
      renderPreview();
    });
    $(id).addEventListener("change", () => pushHistory());
  };
  textField("titleInput", "title");
  textField("subtitleInput", "subtitle");
  textField("badgeInput", "badge");

  $("titleSize").addEventListener("input", (event) => {
    state.titleSize = Number(event.target.value);
    renderPreview();
  });
  $("titleSize").addEventListener("change", () => pushHistory());

  document.querySelectorAll("#heatPicker button").forEach((b) => {
    b.addEventListener("click", () => {
      pushHistory();
      state.heat = Number(b.dataset.heat);
      syncUIFromState();
      renderPreview();
    });
  });

  const toggle = (id, key) => {
    $(id).addEventListener("change", (event) => {
      pushHistory();
      state[key] = event.target.checked;
      renderPreview();
    });
  };
  toggle("halftoneToggle", "halftone");
  toggle("grainToggle", "grain");
  toggle("vignetteToggle", "vignette");
  toggle("frameToggle", "frame");

  $("exportAllButton").addEventListener("click", exportAllSizes);
  $("exportOneButton").addEventListener("click", () => exportPng(state.size));
}

function applyShotParams(params) {
  if (params.get("layout") && LAYOUTS[params.get("layout")]) state.layout = params.get("layout");
  if (params.get("grade") && GRADES[params.get("grade")]) state.grade = params.get("grade");
  if (params.get("size") && SIZES.some((s) => s.id === params.get("size"))) state.size = params.get("size");
  if (params.get("title")) state.title = params.get("title");
  if (params.get("subtitle")) state.subtitle = params.get("subtitle");
  if (params.get("shot") === "cover") document.body.classList.add("shotCover");
}

async function init() {
  wireControls();
  wirePointer();
  const params = new URLSearchParams(window.location.search);
  applyShotParams(params);
  await ensureFonts();
  await loadSamplePhotos();
  syncUIFromState();
  renderPreview();
  past.push(snapshot());
  syncUndoButtons();
  window.coverStudio = {
    get state() { return state; },
    setState(next) { pushHistory(); state = next; syncUIFromState(); renderPreview(); },
    exportPng,
    exportPngDataUrl,
    exportAllSizes,
    renderPreview,
    ready: true,
  };
  window.__shotReady = true;
}

init();
