// Fixed scenes for screenshots: ?shot=editor shows the page with samples loaded;
// ?shot=cover shows the cover alone at the requested layout/grade.
// window.__shotReady is set once painted. Query params: layout, grade,
// photo (sample name), title, subtitle, frame, halftone.
export async function runShot(shot, query, state, photos, apply) {
  const pick = (name) => photos.find((p) => p.name === name)?.img ?? photos[0]?.img ?? null;
  const photo = pick(query.get('photo') ?? 'pier');
  const next = {
    layout: query.get('layout') ?? 'grid4',
    grade: query.get('grade') ?? 'sunset',
    title: query.get('title') ?? 'SUNSET HEIST',
    subtitle: query.get('subtitle') ?? 'A SUNSET STORY',
    frame: query.get('frame') !== '0',
    halftone: query.get('halftone') === '1',
  };
  apply(next);
  // Fill panels: alternate the chosen photo with the other samples for a
  // multi-panel look, or use one photo everywhere for `single=1`.
  const singles = query.get('single') === '1';
  state.panels.forEach((p, i) => {
    p.photo = singles ? photo : (photos[i % photos.length]?.img ?? photo);
    p.zoom = 1;
    p.ox = 0;
    p.oy = 0;
  });
  const titleEl = document.getElementById('titleInput');
  const subEl = document.getElementById('subtitleInput');
  if (titleEl) titleEl.value = state.title;
  if (subEl) subEl.value = state.subtitle;
  const gradeEl = document.getElementById('gradeSelect');
  if (gradeEl) gradeEl.value = state.grade;
  if (shot === 'cover') document.body.classList.add('shot-cover');
  if (document.fonts) await document.fonts.ready;
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
