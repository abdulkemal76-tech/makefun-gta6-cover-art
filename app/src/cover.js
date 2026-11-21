// Renders a multi-panel GTA-poster-style cover onto a 2D canvas.
// No DOM access here and no network: this module only paints.
// A cover state looks like:
//   { layout, grade, title, subtitle, frame, halftone,
//     panels: [{ photo, zoom, ox, oy }] }
// Each panel photo is cover-fitted into its rectangle, panned by (ox, oy)
// and scaled by zoom. Layouts and grades are named by key so the page,
// the shot scenes and the screenshots all speak the same language.

export const LAYOUTS = {
  grid4: {
    label: '4-panel grid',
    panels: [
      { x: 0, y: 0, w: 0.5, h: 0.5 },
      { x: 0.5, y: 0, w: 0.5, h: 0.5 },
      { x: 0, y: 0.5, w: 0.5, h: 0.5 },
      { x: 0.5, y: 0.5, w: 0.5, h: 0.5 },
    ],
  },
  hero3: {
    label: 'Hero + three',
    panels: [
      { x: 0, y: 0, w: 0.62, h: 1 },
      { x: 0.62, y: 0, w: 0.38, h: 1 / 3 },
      { x: 0.62, y: 1 / 3, w: 0.38, h: 1 / 3 },
      { x: 0.62, y: 2 / 3, w: 0.38, h: 1 / 3 },
    ],
  },
  full: {
    label: 'Full bleed',
    panels: [{ x: 0, y: 0, w: 1, h: 1 }],
  },
  grid9: {
    label: '9-panel grid',
    panels: Array.from({ length: 9 }, (_, i) => ({
      x: (i % 3) / 3,
      y: Math.floor(i / 3) / 3,
      w: 1 / 3,
      h: 1 / 3,
    })),
  },
  tilted: {
    label: 'Tilted snapshots',
    panels: [
      { x: 0.03, y: 0.03, w: 0.44, h: 0.42, rot: -4 },
      { x: 0.53, y: 0.02, w: 0.44, h: 0.42, rot: 3 },
      { x: 0.05, y: 0.5, w: 0.44, h: 0.42, rot: 3 },
      { x: 0.51, y: 0.51, w: 0.44, h: 0.42, rot: -3 },
    ],
  },
};

// A grade is a CSS filter for the photo plus a two-stop vertical wash
// blended over it. `none` means the photo is left untouched.
const GRADES = {
  sunset: {
    filter: 'saturate(1.35) contrast(1.12) brightness(1.03)',
    overlay: ['rgba(255,120,40,0.20)', 'rgba(190,30,110,0.30)'],
  },
  neon: {
    filter: 'saturate(1.7) contrast(1.15) hue-rotate(-12deg)',
    overlay: ['rgba(0,220,255,0.16)', 'rgba(255,0,150,0.26)'],
  },
  vice: {
    filter: 'saturate(1.45) contrast(1.08)',
    overlay: ['rgba(255,80,180,0.22)', 'rgba(0,200,200,0.20)'],
  },
  viceneon: {
    filter: 'saturate(1.85) contrast(1.2) hue-rotate(-8deg) brightness(1.04)',
    overlay: ['rgba(255,40,170,0.30)', 'rgba(0,200,255,0.26)'],
  },
  mono: {
    filter: 'grayscale(1) contrast(1.25) brightness(1.05)',
    overlay: null,
  },
  none: { filter: 'none', overlay: null },
};

// Gap between panels, as a fraction of the cover's smaller side.
const GAP = 0.012;

// Paint one panel's photo (plus its grade wash) inside `rect`.
function paintPhoto(ctx, panel, rect, grade) {
  const { photo, zoom = 1, ox = 0, oy = 0 } = panel;
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.fillStyle = '#241233';
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  if (photo) {
    const scale = Math.max(rect.w / photo.naturalWidth, rect.h / photo.naturalHeight) * zoom;
    const pw = photo.naturalWidth * scale;
    const ph = photo.naturalHeight * scale;
    const dx = rect.x + (rect.w - pw) / 2 + ox * rect.w;
    const dy = rect.y + (rect.h - ph) / 2 + oy * rect.h;
    ctx.filter = grade.filter;
    ctx.drawImage(photo, dx, dy, pw, ph);
    ctx.filter = 'none';
  }
  if (grade.overlay) {
    const wash = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
    wash.addColorStop(0, grade.overlay[0]);
    wash.addColorStop(1, grade.overlay[1]);
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = wash;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.restore();
}

// Scatter small dark dots over a panel for the print-halftone look.
function paintHalftone(ctx, rect) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.fillStyle = 'rgba(0,0,0,0.16)';
  const step = Math.max(10, rect.w / 42);
  for (let y = rect.y + step / 2; y < rect.y + rect.h; y += step) {
    for (let x = rect.x + step / 2; x < rect.x + rect.w; x += step) {
      ctx.beginPath();
      ctx.arc(x, y, step * 0.14, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

// Paint one panel, honouring rotation and the white-frame toggle.
function paintPanel(ctx, spec, panel, rect, grade, frame, halftoneOn) {
  if (!spec.rot) {
    paintPhoto(ctx, panel, rect, grade);
    if (halftoneOn) paintHalftone(ctx, rect);
    if (frame) {
      ctx.strokeStyle = '#fdf6ec';
      ctx.lineWidth = Math.max(2, rect.w * 0.008);
      ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
    }
    return;
  }
  ctx.save();
  ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
  ctx.rotate((spec.rot * Math.PI) / 180);
  const r = { x: -rect.w / 2, y: -rect.h / 2, w: rect.w, h: rect.h };
  if (frame) {
    ctx.fillStyle = '#fdf6ec';
    ctx.fillRect(r.x - 8, r.y - 8, r.w + 16, r.h + 16);
  }
  paintPhoto(ctx, panel, r, grade);
  if (halftoneOn) paintHalftone(ctx, r);
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 2;
  ctx.strokeRect(r.x, r.y, r.w, r.h);
  ctx.restore();
}

// Paint the caption band: a dark fade, then the big gradient title and
// the letterspaced subtitle underneath it.
function paintCaption(ctx, W, artH, captionH, state) {
  const fade = ctx.createLinearGradient(0, artH, 0, artH + captionH);
  fade.addColorStop(0, 'rgba(20,8,32,0)');
  fade.addColorStop(0.35, 'rgba(20,8,32,0.88)');
  fade.addColorStop(1, '#140820');
  ctx.fillStyle = fade;
  ctx.fillRect(0, artH, W, captionH);

  const title = (state.title || '').trim().toUpperCase();
  const subtitle = (state.subtitle || '').trim().toUpperCase();

  if (title) {
    let size = captionH * (state.layout === 'full' ? 0.52 : 0.62);
    const face = (s) => `${s}px "Bebas Neue", "Arial Narrow", sans-serif`;
    ctx.font = face(size);
    while (ctx.measureText(title).width > W * 0.92 && size > 14) {
      size -= 2;
      ctx.font = face(size);
    }
    const sunset = ctx.createLinearGradient(0, artH + captionH * 0.1, 0, artH + captionH);
    sunset.addColorStop(0, '#ffd166');
    sunset.addColorStop(0.55, '#ff7a3d');
    sunset.addColorStop(1, '#ff5e8a');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = Math.max(2, size * 0.06);
    ctx.strokeStyle = 'rgba(20,8,32,0.85)';
    ctx.fillStyle = sunset;
    const ty = artH + captionH * (subtitle ? 0.38 : 0.5);
    ctx.strokeText(title, W / 2, ty);
    ctx.fillText(title, W / 2, ty);
  }

  if (subtitle) {
    const sSize = Math.max(12, captionH * 0.16);
    ctx.font = `600 ${sSize}px system-ui, sans-serif`;
    ctx.fillStyle = '#f5eef7';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // Canvas has no letter-spacing everywhere, so space it by hand.
    const spaced = subtitle.split('').join('  ');
    ctx.fillText(spaced, W / 2, artH + captionH * 0.8, W * 0.9);
  }
}

/** Paint the whole cover onto `canvas` (at any pixel size) from `state`. */
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const layout = LAYOUTS[state.layout] ?? LAYOUTS.grid4;
  let grade = GRADES[state.grade] ?? GRADES.sunset;
  // Halftone dots wash the photo out a touch, so lift contrast to match.
  if (state.halftone) {
    const extra = 'contrast(1.08)';
    grade = {
      ...grade,
      filter: grade.filter === 'none' ? extra : `${grade.filter} ${extra}`,
    };
  }
  const gap = Math.min(W, H) * GAP;

  // Deep purple poster background.
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#2b0f3d');
  bg.addColorStop(1, '#12081f');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const captionH = H * (state.layout === 'full' ? 0.24 : 0.13);
  const artH = H - captionH;

  layout.panels.forEach((spec, i) => {
    const panel = state.panels[i] ?? { photo: null, zoom: 1, ox: 0, oy: 0 };
    const rect = {
      x: spec.x * W + gap / 2,
      y: spec.y * artH + gap / 2,
      w: spec.w * W - gap,
      h: spec.h * artH - gap,
    };
    paintPanel(ctx, spec, panel, rect, grade, state.frame, state.halftone);
  });

  paintCaption(ctx, W, artH, captionH, state);
}
