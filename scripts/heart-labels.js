// Computes where each surah's Arabic name sits inside its heart tile (position, angle, size)
// and stores it as `label` in src/data/heart-tiles.json. Tile shapes are not changed.
// Run after editing tiles or names:   node scripts/heart-labels.js
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Resvg } from '@resvg/resvg-js';
import surahs from '../src/data/quran.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FILE = join(ROOT, 'src/data/heart-tiles.json');
const FONT = join(ROOT, 'assets/fonts/Amiri-Regular-subset.ttf');
const heart = JSON.parse(readFileSync(FILE, 'utf8'));
const NAME = new Map(surahs.map(s => [s.n, s.ar]));

const RES = 3;        // mask pixels per tile unit
const MARGIN = 0.82;  // text box may use this share of the space it fits in
const MAX_SIZE = 46;  // keep big tiles from getting huge names

// Text box of a name at font-size 100 (anchor middle, baseline y=0)
function measure(text) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="2000" height="400">
    <text x="1000" y="200" font-family="Amiri" font-size="100" text-anchor="middle">${text}</text></svg>`;
  const bb = new Resvg(svg, { font: { fontFiles: [FONT], loadSystemFonts: false } }).getBBox();
  return { dx: bb.x - 1000, dy: bb.y - 200, w: bb.width, h: bb.height };
}

// Tile mask (1 = inside) on a grid covering the tile bbox
function mask(tile) {
  const [x0, y0, x1, y1] = tile.bbox;
  const w = Math.ceil((x1 - x0 + 2) * RES);
  const h = Math.ceil((y1 - y0 + 2) * RES);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${x0 - 1} ${y0 - 1} ${w / RES} ${h / RES}">
    <rect x="-9999" y="-9999" width="99999" height="99999" fill="#fff"/>
    ${tile.paths.map(p => `<path d="${p}" fill="#000"/>`).join('')}</svg>`;
  const px = new Resvg(svg).render().pixels;
  const m = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) m[i] = px[i * 4] < 128 ? 1 : 0;
  return { m, w, h, ox: x0 - 1, oy: y0 - 1 };
}

function inside(k, x, y) {
  const i = Math.floor((x - k.ox) * RES);
  const j = Math.floor((y - k.oy) * RES);
  return i >= 0 && j >= 0 && i < k.w && j < k.h && k.m[j * k.w + i] === 1;
}

// Does a w×h box centred at (cx, cy), rotated by a degrees, lie inside the tile?
function fits(k, cx, cy, a, w, h) {
  const c = Math.cos(a * Math.PI / 180);
  const s = Math.sin(a * Math.PI / 180);
  const nx = Math.max(2, Math.ceil(w / 2));
  const ny = Math.max(2, Math.ceil(h / 2));
  for (let iy = 0; iy <= ny; iy++) {
    const v = (iy / ny - 0.5) * h;
    // full rows on the edges, sparse inside (edges decide almost always)
    const step = iy === 0 || iy === ny ? 1 : nx;
    for (let ix = 0; ix <= nx; ix += step) {
      const u = (ix / nx - 0.5) * w;
      if (!inside(k, cx + u * c - v * s, cy + u * s + v * c)) return false;
    }
    if (step !== 1) {
      const u = 0.5 * w;
      if (!inside(k, cx + u * c - v * s, cy + u * s + v * c)) return false;
    }
  }
  return true;
}

function place(tile) {
  const text = NAME.get(tile.surah);
  const t = measure(text);
  const k = mask(tile);
  const [x0, y0, x1, y1] = tile.bbox;
  const steps = 28;
  let best = { score: -1 };

  for (let a = -90; a <= 90; a += 5) {
    // prefer reading horizontally: tilted text must be clearly bigger to win
    const penalty = 1 - 0.12 * Math.abs(a) / 90;
    for (let gy = 0; gy <= steps; gy++) {
      for (let gx = 0; gx <= steps; gx++) {
        const cx = x0 + (x1 - x0) * gx / steps;
        const cy = y0 + (y1 - y0) * gy / steps;
        if (!inside(k, cx, cy)) continue;
        // binary search the largest font size that fits here
        let lo = 0;
        let hi = MAX_SIZE / MARGIN;
        if (best.score > 0 && !fits(k, cx, cy, a, t.w * (best.score / penalty) / 100, t.h * (best.score / penalty) / 100)) continue;
        for (let it = 0; it < 9; it++) {
          const mid = (lo + hi) / 2;
          if (fits(k, cx, cy, a, t.w * mid / 100, t.h * mid / 100)) lo = mid; else hi = mid;
        }
        const score = lo * penalty;
        if (score > best.score) best = { score, size: lo, cx, cy, a };
      }
    }
  }

  const size = Math.max(best.size * MARGIN, 5);
  const r = (n) => Math.round(n * 10) / 10;
  // position of the text anchor so the glyph box is centred on (cx, cy)
  return {
    x: r(best.cx), y: r(best.cy), a: best.a, size: r(size),
    dx: r(-(t.dx + t.w / 2) * size / 100), dy: r(-(t.dy + t.h / 2) * size / 100),
  };
}

for (const tile of heart.tiles) {
  tile.label = place(tile);
}
writeFileSync(FILE, JSON.stringify(heart));
const sizes = heart.tiles.map(t => t.label.size).sort((a, b) => a - b);
console.log(`labels placed: ${heart.tiles.length}; font size min ${sizes[0]}, median ${sizes[57]}, max ${sizes.at(-1)}`);
