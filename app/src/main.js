// Wires the page: photos, layouts, caption, grade, per-panel crop, export.
// A `?shot=` query sets up a fixed scene for a screenshot instead (./shots.js).
import { drawCover, LAYOUTS } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const status = document.getElementById('status');
const SAMPLES = ['pier', 'boulevard', 'neon', 'beach'];

const state = {
  layout: 'grid4',
  grade: 'sunset',
  title: 'SUNSET HEIST',
  subtitle: 'A SUNSET STORY',
  frame: true,
  halftone: false,
  panels: Array.from({ length: 9 }, () => ({ photo: null, zoom: 1, ox: 0, oy: 0 })),
};
let photos = []; // { img, name }
let selectedPanel = 0;
let activePhoto = 0;

function redraw() {
  drawCover(canvas, state);
  syncPanelUI();
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

async function loadSamples() {
  for (const name of SAMPLES) {
    try {
      const img = await loadImage(`samples/${name}.jpg`);
      photos.push({ img, name });
    } catch { /* a missing sample just leaves the tray shorter */ }
  }
  // Default fill: spread the samples across the panels.
  state.panels.forEach((p, i) => { p.photo = photos[i % photos.length]?.img ?? null; });
}

function renderTray() {
  const tray = document.getElementById('photoTray');
  tray.innerHTML = '';
  photos.forEach((p, i) => {
    const el = document.createElement('img');
    el.src = p.img.src;
    el.alt = p.name;
    el.title = p.name;
    el.setAttribute('aria-pressed', String(i === activePhoto));
    el.addEventListener('click', () => {
      activePhoto = i;
      state.panels[selectedPanel].photo = p.img;
      state.panels[selectedPanel].zoom = 1;
      state.panels[selectedPanel].ox = 0;
      state.panels[selectedPanel].oy = 0;
      renderTray();
      redraw();
    });
    tray.appendChild(el);
  });
}

function renderLayoutPick() {
  const pick = document.getElementById('layoutPick');
  pick.innerHTML = '';
  for (const [key, layout] of Object.entries(LAYOUTS)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = layout.label;
    b.setAttribute('aria-pressed', String(state.layout === key));
    b.addEventListener('click', () => {
      state.layout = key;
      selectedPanel = 0;
      renderLayoutPick();
      redraw();
    });
    pick.appendChild(b);
  }
}

function panelCount() {
  return LAYOUTS[state.layout].panels.length;
}

function syncPanelUI() {
  const sel = document.getElementById('panelSelect');
  const n = panelCount();
  if (sel.options.length !== n) {
    sel.innerHTML = '';
    for (let i = 0; i < n; i++) {
      const o = document.createElement('option');
      o.value = String(i);
      o.textContent = `Panel ${i + 1}`;
      sel.appendChild(o);
    }
  }
  if (selectedPanel >= n) selectedPanel = 0;
  sel.value = String(selectedPanel);
  const p = state.panels[selectedPanel];
  document.getElementById('zoomRange').value = String(p.zoom);
}

function panelAt(clientX, clientY) {
  const r = canvas.getBoundingClientRect();
  const fx = (clientX - r.left) / r.width;
  const fy = (clientY - r.top) / r.height;
  const layout = LAYOUTS[state.layout];
  const captionH = state.layout === 'full' ? 0.24 : 0.13;
  const artH = 1 - captionH;
  for (let i = layout.panels.length - 1; i >= 0; i--) {
    const p = layout.panels[i];
    if (fx >= p.x && fx < p.x + p.w && fy >= p.y * artH && fy < (p.y + p.h) * artH) return i;
  }
  return -1;
}

// Drag to pan the selected panel's photo; wheel to zoom it.
let dragging = false;
let lastX = 0;
let lastY = 0;
canvas.addEventListener('pointerdown', (e) => {
  const i = panelAt(e.clientX, e.clientY);
  if (i < 0) return;
  selectedPanel = i;
  dragging = true;
  lastX = e.clientX;
  lastY = e.clientY;
  canvas.setPointerCapture(e.pointerId);
  redraw();
});
canvas.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  const r = canvas.getBoundingClientRect();
  const p = state.panels[selectedPanel];
  p.ox = Math.max(-0.5, Math.min(0.5, p.ox + (e.clientX - lastX) / r.width));
  p.oy = Math.max(-0.5, Math.min(0.5, p.oy + (e.clientY - lastY) / r.height));
  lastX = e.clientX;
  lastY = e.clientY;
  redraw();
});
canvas.addEventListener('pointerup', () => { dragging = false; });
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const p = state.panels[selectedPanel];
  p.zoom = Math.max(1, Math.min(3, p.zoom * (e.deltaY < 0 ? 1.08 : 0.93)));
  redraw();
}, { passive: false });

document.getElementById('panelSelect').addEventListener('change', (e) => {
  selectedPanel = Number(e.target.value);
  redraw();
});
document.getElementById('zoomRange').addEventListener('input', (e) => {
  state.panels[selectedPanel].zoom = Number(e.target.value);
  redraw();
});
document.getElementById('photoInput').addEventListener('change', async (e) => {
  for (const file of e.target.files) {
    const img = await loadImage(URL.createObjectURL(file));
    photos.push({ img, name: file.name });
  }
  renderTray();
  redraw();
});
document.getElementById('fillAll').addEventListener('click', () => {
  const img = photos[activePhoto]?.img;
  if (!img) return;
  state.panels.forEach((p) => { p.photo = img; p.zoom = 1; p.ox = 0; p.oy = 0; });
  redraw();
  status.textContent = 'All panels filled with the selected photo.';
});
document.getElementById('titleInput').addEventListener('input', (e) => { state.title = e.target.value; redraw(); });
document.getElementById('subtitleInput').addEventListener('input', (e) => { state.subtitle = e.target.value; redraw(); });
document.getElementById('gradeSelect').addEventListener('change', (e) => { state.grade = e.target.value; redraw(); });
document.getElementById('frameCheck').addEventListener('change', (e) => { state.frame = e.target.checked; redraw(); });
document.getElementById('halftoneCheck').addEventListener('change', (e) => { state.halftone = e.target.checked; redraw(); });

document.querySelectorAll('.export').forEach((btn) => {
  btn.addEventListener('click', () => {
    const [w, h] = btn.dataset.size.split('x').map(Number);
    const off = document.createElement('canvas');
    off.width = w;
    off.height = h;
    drawCover(off, state);
    off.toBlob((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `cover-${w}x${h}.png`;
      a.click();
      status.textContent = `Saved cover-${w}x${h}.png (${(blob.size / 1024).toFixed(0)} KB)`;
    }, 'image/png');
  });
});

// Export helper used by screenshots: render the current state at a size and
// return the PNG as a data URL (no download, so a shot page can read it).
export function exportPNG(w, h) {
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  drawCover(off, state);
  return off.toDataURL('image/png');
}

const query = new URLSearchParams(location.search);
const shot = query.get('shot');
await loadSamples();
renderTray();
renderLayoutPick();
if (shot) {
  await runShot(shot, query, state, photos, (s) => Object.assign(state, s));
  renderTray();
  renderLayoutPick();
} else if (document.fonts) {
  document.fonts.ready.then(redraw);
}
redraw();
