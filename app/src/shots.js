// Fixed scenes for screenshots: `?shot=editor` shows the page with the
// samples loaded; `?shot=cover` shows the cover on its own at the
// requested layout and grade. `window.__shotReady` flips to true once
// the scene is painted. Query parameters: layout, grade, photo (sample
// name), title, subtitle, frame, halftone, single.
export async function runShot(shot, query, state, photos, apply) {
  const pick = (name) => photos.find((p) => p.name === name)?.img ?? photos[0]?.img ?? null;
  const hero = pick(query.get('photo') ?? 'boulevard');

  // Take the scene settings from the URL, falling back to the defaults.
  const next = {
    layout: query.get('layout') ?? 'grid4',
    grade: query.get('grade') ?? 'sunset',
    title: query.get('title') ?? 'VICE SUNSET',
    subtitle: query.get('subtitle') ?? 'WELCOME TO VICE CITY',
    frame: query.get('frame') !== '0',
    halftone: query.get('halftone') === '1',
  };
  apply(next);

  // Fill the panels: one photo everywhere for `single=1`, otherwise
  // cycle through the samples so the poster looks multi-panel.
  const single = query.get('single') === '1';
  state.panels.forEach((p, i) => {
    p.photo = single ? hero : (photos[i % photos.length]?.img ?? hero);
    p.zoom = 1;
    p.ox = 0;
    p.oy = 0;
  });

  // Mirror the scene back into the controls so the editor shot is honest.
  const titleEl = document.getElementById('titleInput');
  const subEl = document.getElementById('subtitleInput');
  const gradeEl = document.getElementById('gradeSelect');
  if (titleEl) titleEl.value = state.title;
  if (subEl) subEl.value = state.subtitle;
  if (gradeEl) gradeEl.value = state.grade;

  if (shot === 'cover') document.body.classList.add('shot-cover');
  if (document.fonts) await document.fonts.ready;
  // Two frames: one to let the layout settle, one to let it paint.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      window.__shotReady = true;
    });
  });
}
