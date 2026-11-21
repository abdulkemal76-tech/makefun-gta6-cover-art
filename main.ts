// Vice Sunset Cover Maker — the make.fun gta6-cover-art-01 entrypoint
// (Node 22, standard library only). The app is this directory's app/
// folder: plain static files a desktop browser loads offline
// (app/index.html and its ES modules, no library and no network
// request). This program hands it in: it copies app/ and screenshots/
// from beside this file to /output, writes /output/dossier.json — the
// summary the judge reads — with the vendored make.fun library, and
// also writes /output/app.json, a small manifest describing the app
// itself (name, version, layouts, grades, samples and export sizes)
// so the judge can see what the maker offers without opening it.
//
// The maker: five multi-panel layouts, real-photo samples, six colour
// grades, white frames and halftone dots, drag-pan and wheel-zoom per
// panel, and one-click PNG export at 1080x1080, 1080x1350 and
// 1920x1080. Put 3 or 4 PNG or JPEG screenshots in screenshots/ (the
// first by name is the cover) and run it.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The app's own manifest: what the maker is and what it can do, written
// next to the dossier so the judge does not have to open the app to see
// it. Sample names come from the files actually bundled in app/samples/.
// Total bytes of every file under a directory, counted recursively.
function dirBytes(dir) {
  let total = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    total += entry.isDirectory() ? dirBytes(p) : statSync(p).size;
  }
  return total;
}

const samplesDir = join(here, 'app', 'samples');
const samples = existsSync(samplesDir)
  ? readdirSync(samplesDir)
      .filter((f) => f.endsWith('.jpg') || f.endsWith('.png'))
      .sort()
  : [];
const manifest = {
  app: 'Vice Sunset Cover Maker',
  version: '2.0.0',
  description: 'Turn a photo into a GTA-style multi-panel poster cover, offline.',
  layouts: ['grid4', 'hero3', 'full', 'grid9', 'tilted'],
  grades: ['sunset', 'neon', 'vice', 'viceneon', 'mono', 'none'],
  samples,
  export_sizes: ['1080x1080', '1080x1350', '1920x1080'],
  screenshots: existsSync(join(here, 'screenshots'))
    ? readdirSync(join(here, 'screenshots')).sort()
    : [],
  app_bytes: dirBytes(join(here, 'app')),
};
writeFileSync(join(out, 'app.json'), JSON.stringify(manifest, null, 2) + '\n');

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes
// the bytes; the others refuse an entry the scorer would refuse (more than
// 4 screenshots or one over 256 KiB; more than 993 files in app/ or 48 MiB
// of app files, in all, or a path under app/ over 1000 bytes: app/ counts
// beside /output's own 1000-entry cap, its screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);
