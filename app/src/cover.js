// Draws a multi-panel GTA-poster-style cover on a canvas 2D context.
// Pure rendering: no DOM, no network. `state` is:
//   { layout, grade, title, subtitle, frame, halftone,
//     panels: [{ photo: HTMLImageElement|null, zoom, ox, oy }] }
// Panel photos are cover-fit, panned by (ox, oy) and zoomed per panel.

export const LAYOUTS = {
  grid4: {
    label: '4-panel grid',
    panels: [
      { x: 0, y: 0, w: 0.5, h: 0.5 }, { x: 0.5, y: 0, w: 0.5, h: 0.5 },
      { x: 0, y: 0.5, w: 0.5, h: 0.5 }, { x: 0.5, y: 0.5, w: 0.5, h: 0.5 },
    ],
  },
  hero3: {
    label: 'Hero + three',
    panels: [
      { x: 0, y: 0, w: 0.62, h: 1 },
      { x: 0.62, y: 0, w: 0.38, h: 1 / 3 }, { x: 0.62, y: 1 / 3, w: 0.38, h: 1 / 3 },
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
      x: (i % 3) / 3, y: Math.floor(i / 3) / 3, w: 1 / 3, h: 1 / 3,
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

const GRADES = {
  sunset: { filter: 'saturate(1.35) contrast(1.12) brightness(1.03)', overlay: ['rgba(255,120,40,0.20)', 'rgba(190,30,110,0.30)'] },
  neon: { filter: 'saturate(1.7) contrast(1.15) hue-rotate(-12deg)', overlay: ['rgba(0,220,255,0.16)', 'rgba(255,0,150,0.26)'] },
  vice: { filter: 'saturate(1.45) contrast(1.08)', overlay: ['rgba(255,80,180,0.22)', 'rgba(0,200,200,0.20)'] },
  mono: { filter: 'grayscale(1) contrast(1.25) brightness(1.05)', overlay: null },
  none: { filter: 'none', overlay: null },
};

const GAP = 0.012; // panel gap, fraction of the smaller side

function drawPhoto(ctx, panel, rect, grade) {
  const { photo, zoom = 1, ox = 0, oy = 0 } = panel;
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.fillStyle = '#241233';
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  if (photo) {
    const base = Math.max(rect.w / photo.naturalWidth, rect.h / photo.naturalHeight) * zoom;
    const pw = photo.naturalWidth * base;
    const ph = photo.naturalHeight * base;
    ctx.filter = grade.filter;
    ctx.drawImage(photo, rect.x + (rect.w - pw) / 2 + ox * rect.w, rect.y + (rect.h - ph) / 2 + oy * rect.h, pw, ph);
    ctx.filter = 'none';
  }
  if (grade.overlay) {
    const g = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
    g.addColorStop(0, grade.overlay[0]);
    g.addColorStop(1, grade.overlay[1]);
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = g;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.restore();
}

function halftone(ctx, rect) {
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

/** Draws the whole cover onto `canvas` (any size) from `state`. */
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const layout = LAYOUTS[state.layout] ?? LAYOUTS.grid4;
  const grade = GRADES[state.grade] ?? GRADES.sunset;
  const gap = Math.min(W, H) * GAP;

  // Deep purple poster background.
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#2b0f3d');
  bg.addColorStop(1, '#12081f');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const captionH = H * (state.layout === 'full' ? 0.24 : 0.13);
  const artH = H - captionH;

  layout.panels.forEach((p, i) => {
    const panel = state.panels[i] ?? { photo: null, zoom: 1, ox: 0, oy: 0 };
    const rect = {
      x: p.x * W + gap / 2,
      y: p.y * artH + gap / 2,
      w: p.w * W - gap,
      h: p.h * artH - gap,
    };
    if (p.rot) {
      ctx.save();
      ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
      ctx.rotate((p.rot * Math.PI) / 180);
      const r = { x: -rect.w / 2, y: -rect.h / 2, w: rect.w, h: rect.h };
      if (state.frame) {
        ctx.fillStyle = '#fdf6ec';
        ctx.fillRect(r.x - 8, r.y - 8, r.w + 16, r.h + 16);
      }
      drawPhoto(ctx, panel, r, grade);
      if (state.halftone) halftone(ctx, r);
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.lineWidth = 2;
      ctx.strokeRect(r.x, r.y, r.w, r.h);
      ctx.restore();
    } else {
      drawPhoto(ctx, panel, rect, grade);
      if (state.halftone) halftone(ctx, rect);
      if (state.frame) {
        ctx.strokeStyle = '#fdf6ec';
        ctx.lineWidth = Math.max(2, W * 0.004);
        ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
      }
    }
  });

  // Caption band: sunset gradient wash + big condensed title + letterspaced subtitle.
  const band = ctx.createLinearGradient(0, artH, 0, H);
  band.addColorStop(0, 'rgba(20,8,32,0)');
  band.addColorStop(0.35, 'rgba(20,8,32,0.88)');
  band.addColorStop(1, '#140820');
  ctx.fillStyle = band;
  ctx.fillRect(0, artH, W, captionH);

  const title = (state.title || '').trim().toUpperCase();
  const subtitle = (state.subtitle || '').trim().toUpperCase();
  if (title) {
    let size = captionH * (state.layout === 'full' ? 0.52 : 0.62);
    ctx.font = `${size}px "Bebas Neue", "Arial Narrow", sans-serif`;
    while (ctx.measureText(title).width > W * 0.92 && size > 14) {
      size -= 2;
      ctx.font = `${size}px "Bebas Neue", "Arial Narrow", sans-serif`;
    }
    const grad = ctx.createLinearGradient(0, artH + captionH * 0.1, 0, H);
    grad.addColorStop(0, '#ffd166');
    grad.addColorStop(0.55, '#ff7a3d');
    grad.addColorStop(1, '#ff5e8a');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = Math.max(2, size * 0.06);
    ctx.strokeStyle = 'rgba(20,8,32,0.85)';
    ctx.fillStyle = grad;
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
    // Letterspace by hand (canvas has no letter-spacing everywhere).
    const spaced = subtitle.split('').join('  ');
    ctx.fillText(spaced, W / 2, artH + captionH * 0.8, W * 0.9);
  }
}
