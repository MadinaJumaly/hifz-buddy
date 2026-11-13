import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { t } from '../utils/i18n.js';
import { TOTAL_AYAHS } from '../utils/progress.js';
import {
  W, PAD, C, SANS, SERIF, esc, upper, formatDate, background, toPng,
} from './card.js';

// "My heart" card: a tiled heart whose tiles fill with gold (nur) from the bottom up,
// in proportion to how much of the Quran is memorized (weighted by tile area).
// Tiles were traced from a raster illustration into src/data/heart-tiles.json
// (bottom tiles first).

const HEART = JSON.parse(readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../data/heart-tiles.json'), 'utf8',
));
const TOTAL_AREA = HEART.tiles.reduce((a, tile) => a + tile.area, 0);

// "0.8%" under 10%, "18%" above; never shows 0% once something is memorized
export function formatPercent(ayahs) {
  const pct = (ayahs / TOTAL_AYAHS) * 100;
  if (ayahs > 0 && pct < 0.1) return '0.1%';
  if (pct < 10) return `${(Math.floor(pct * 10) / 10).toString()}%`;
  return `${Math.floor(pct)}%`;
}

// How many tiles (from the bottom) are gold
export function filledTiles(ayahs) {
  if (ayahs >= TOTAL_AYAHS) return HEART.tiles.length;
  const target = (ayahs / TOTAL_AYAHS) * TOTAL_AREA;
  let area = 0;
  let n = 0;
  while (n < HEART.tiles.length && area + HEART.tiles[n].area / 2 <= target) {
    area += HEART.tiles[n].area;
    n++;
  }
  return ayahs > 0 ? Math.max(1, n) : 0;
}

// Telegram logo (blue circle + paper plane) at x, y with diameter `size`
function telegramLogo(x, y, size) {
  const s = size / 24;
  return `<g transform="translate(${x} ${y}) scale(${s})">
    <circle cx="12" cy="12" r="12" fill="#2AABEE"/>
    <path d="M5.43 11.86c3.5-1.52 5.83-2.53 7-3.02 3.33-1.39 4.02-1.63 4.47-1.64.1 0 .32.02.47.14.12.1.15.23.17.33.02.1.04.31.02.48-.18 1.9-.96 6.5-1.36 8.63-.17.9-.5 1.2-.82 1.23-.7.06-1.23-.46-1.9-.9-1.06-.7-1.66-1.13-2.69-1.81-1.19-.78-.42-1.21.26-1.91.18-.18 3.25-2.98 3.31-3.23.01-.03.01-.15-.06-.21-.07-.06-.17-.04-.25-.02-.1.02-1.79 1.14-5.06 3.35-.48.33-.91.49-1.3.48-.43-.01-1.25-.24-1.86-.44-.75-.24-1.35-.37-1.3-.79.03-.22.33-.44.9-.67z" fill="#FFFFFF"/>
  </g>`;
}

/**
 * @param {object} d
 * @param {string} d.lang
 * @param {number} d.ayahs
 * @param {string} d.botUsername
 * @param {string} [d.timezone]
 * @returns {Buffer} PNG
 */
export function renderHeart(d) {
  const lang = d.lang;
  const filled = filledTiles(d.ayahs);

  // Fit the heart's bounding box into the space between header and footer
  const [bx, by, bw, bh] = HEART.bbox;
  const areaTop = 300;
  const areaH = 870;
  const scale = areaH / bh;
  const ox = (W - bw * scale) / 2 - bx * scale;
  const oy = areaTop - by * scale;

  const empty = HEART.tiles.slice(filled).map(tile => `<path d="${tile.d}"/>`).join('');
  const gold = HEART.tiles.slice(0, filled).map(tile => `<path d="${tile.d}"/>`).join('');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="1350" viewBox="0 0 ${W} 1350">
  ${background()}
  <defs>
    <filter id="nur" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="14"/>
    </filter>
  </defs>

  <text x="${PAD}" y="170" ${SANS} font-weight="500" font-size="30" letter-spacing="7" fill="${C.teal}">${esc(upper(t(lang, 'heart_kicker'), lang))}</text>

  <text x="${W - PAD}" y="200" ${SERIF} font-size="120" fill="${C.teal}" text-anchor="end">${esc(formatPercent(d.ayahs))}</text>
  <text x="${W - PAD}" y="246" ${SANS} font-weight="400" font-size="24" fill="${C.inkSoft}" text-anchor="end">${esc(t(lang, 'heart_label'))}</text>

  <g transform="translate(${ox} ${oy}) scale(${scale})">
    <g fill="${C.cell}" fill-opacity="0.8" filter="url(#soft)">${empty}</g>
    <g fill="${C.gold}" opacity="0.75" filter="url(#nur)">${gold}</g>
    <g fill="url(#gold)">${gold}</g>
  </g>

  ${telegramLogo(PAD, 1244, 36)}
  <text x="${PAD + 48}" y="1270" ${SANS} font-weight="500" font-size="24" fill="${C.ink}">@${esc(d.botUsername)}</text>
  <text x="${W - PAD}" y="1270" ${SANS} font-weight="400" font-size="24" fill="${C.inkSoft}" text-anchor="end">${esc(formatDate(lang, d.timezone))}</text>
</svg>`;

  return toPng(svg);
}
