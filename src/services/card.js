import { Resvg } from '@resvg/resvg-js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { t } from '../utils/i18n.js';

// Shareable progress card (1080×1350 PNG), rendered from an SVG template.
// Theme: soft sky blue, white clouds, teal and butter gold.
// Fonts are bundled in assets/fonts so the card looks the same on any server.

const FONT_DIR = join(dirname(fileURLToPath(import.meta.url)), '../../assets/fonts');
export const FONT_FILES = ['Inter-Regular.ttf', 'Inter-Medium.ttf', 'PlayfairDisplay[wght].ttf']
  .map(f => join(FONT_DIR, f));

export const W = 1080;
export const H = 1350;
export const PAD = 96;

export const C = {
  skyTop: '#CFEAFB',
  skyBottom: '#EAF6FE',
  ink: '#1D4D66',       // main text
  inkSoft: '#5B8AA3',   // labels, footer
  teal: '#2F8DB8',      // kicker, big number
  tealLight: '#5DBFE2', // crescent
  gold: '#F5D06A',
  goldDeep: '#E6AE3C',
  goldText: '#6E4C0C',  // numbers on gold cells
  cell: '#FFFFFF',
  cellText: '#9BB9CB',
};

export const SANS = 'font-family="Inter"';
export const SERIF = 'font-family="Playfair Display"';

const LOCALES = { en: 'en-GB', ru: 'ru-RU', kz: 'kk-KZ' };

export function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function upper(s, lang) {
  return s.toLocaleUpperCase(LOCALES[lang] || 'en');
}

// Keep only characters the bundled fonts can draw (Latin + Cyrillic); drops emoji etc.
export function drawable(s) {
  return String(s).replace(/[^ -ɏЀ-ӿ‐-›]/gu, '').replace(/\s+/g, ' ').trim();
}

export function truncate(s, max) {
  const chars = [...s];
  return chars.length > max ? chars.slice(0, max - 1).join('') + '…' : s;
}

export function formatDate(lang, timezone) {
  try {
    return new Intl.DateTimeFormat(LOCALES[lang] || 'en-GB', {
      day: 'numeric', month: 'long', year: 'numeric', timeZone: timezone || 'UTC',
    }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

// Shared gradients/filters + sky background (used by every card)
export function background() {
  return `<defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${C.skyTop}"/>
      <stop offset="1" stop-color="${C.skyBottom}"/>
    </linearGradient>
    <radialGradient id="haze" cx="0.85" cy="0.12" r="0.6">
      <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.7"/>
      <stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="cloud" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FFFFFF"/>
      <stop offset="1" stop-color="#DCEAF5"/>
    </linearGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FBE08A"/>
      <stop offset="1" stop-color="${C.gold}"/>
    </linearGradient>
    <filter id="soft" x="-20%" y="-20%" width="140%" height="160%">
      <feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="#5A9CC4" flood-opacity="0.22"/>
    </filter>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#sky)"/>
  <rect width="${W}" height="${H}" fill="url(#haze)"/>`;
}

export function toPng(svg) {
  return new Resvg(svg, {
    font: { fontFiles: FONT_FILES, loadSystemFonts: false, defaultFontFamily: 'Inter' },
  }).render().asPng();
}

// 8-point star (two rotated rounded squares) with a crescent, resting on a cloud
function emblem(x, y, scale = 1) {
  const square = (size, fill) =>
    `<rect x="${-size / 2}" y="${-size / 2}" width="${size}" height="${size}" rx="${size * 0.16}" fill="${fill}"/>`
    + `<rect x="${-size / 2}" y="${-size / 2}" width="${size}" height="${size}" rx="${size * 0.16}" fill="${fill}" transform="rotate(45)"/>`;

  return `
  <g transform="translate(${x} ${y}) scale(${scale})">
    <g filter="url(#soft)" fill="url(#cloud)">
      <circle cx="-98" cy="132" r="48"/>
      <circle cx="-42" cy="96" r="70"/>
      <circle cx="38" cy="82" r="80"/>
      <circle cx="112" cy="112" r="58"/>
      <circle cx="152" cy="140" r="38"/>
      <rect x="-146" y="128" width="336" height="58" rx="29"/>
    </g>
    <g transform="translate(6 42)" filter="url(#soft)">
      <g transform="translate(0 8)">${square(118, C.goldDeep)}</g>
      ${square(118, 'url(#gold)')}
      <g opacity="0.55">${square(86, '#FBE6A4')}</g>
      <mask id="moon">
        <circle cx="0" cy="0" r="30" fill="#fff"/>
        <circle cx="13" cy="-9" r="26" fill="#000"/>
      </mask>
      <circle cx="0" cy="0" r="30" fill="${C.tealLight}" mask="url(#moon)"/>
    </g>
  </g>`;
}

// 30 cells, 10 × 3: gold = finished, gold from the bottom = in progress, white = not started
function juzGrid(progress, top) {
  const cols = 10;
  const gap = 12;
  const size = (W - PAD * 2 - gap * (cols - 1)) / cols;
  let cells = '';
  let labels = '';

  for (const j of progress) {
    const i = j.n - 1;
    const x = PAD + (i % cols) * (size + gap);
    const y = top + Math.floor(i / cols) * (size + gap);
    const cx = x + size / 2;
    const ty = y + size / 2 + 8;
    const ratio = Math.min(j.done / j.total, 1);

    if (ratio >= 1) {
      cells += `<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="18" fill="url(#gold)"/>`;
      labels += `<text x="${cx}" y="${ty}" ${SANS} font-weight="500" font-size="22" fill="${C.goldText}" text-anchor="middle">${j.n}</text>`;
    } else if (ratio > 0) {
      const h = Math.max(8, size * ratio);
      cells += `<clipPath id="c${i}"><rect x="${x}" y="${y}" width="${size}" height="${size}" rx="18"/></clipPath>`;
      cells += `<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="18" fill="${C.cell}"/>`;
      cells += `<rect x="${x}" y="${y + size - h}" width="${size}" height="${h}" fill="${C.gold}" clip-path="url(#c${i})"/>`;
      labels += `<text x="${cx}" y="${ty}" ${SANS} font-weight="500" font-size="22" fill="${C.ink}" text-anchor="middle">${j.n}</text>`;
    } else {
      cells += `<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="18" fill="${C.cell}" fill-opacity="0.6"/>`;
      labels += `<text x="${cx}" y="${ty}" ${SANS} font-weight="400" font-size="22" fill="${C.cellText}" text-anchor="middle">${j.n}</text>`;
    }
  }
  return `<g filter="url(#soft)">${cells}</g>${labels}`;
}

/**
 * @param {object} d
 * @param {string} d.lang        'en' | 'ru' | 'kz'
 * @param {string} d.name
 * @param {number} d.ayahs
 * @param {number} d.surahs
 * @param {number} d.juzDone     finished juz count
 * @param {number} d.streak      current streak (0 hides it)
 * @param {Array}  d.juz         [{ n, done, total }] × 30
 * @param {string} d.botUsername
 * @param {string} [d.timezone]
 * @param {string} [d.headline]  replaces the kicker, e.g. "Juz 29 complete"
 * @returns {Buffer} PNG
 */
export function renderCard(d) {
  const lang = d.lang;
  const kicker = upper(d.headline || t(lang, 'card_kicker'), lang);

  const stats = [
    { value: d.surahs, label: t(lang, 'card_surahs') },
    { value: d.juzDone, label: t(lang, 'card_juz') },
  ];
  if (d.streak > 0) stats.push({ value: d.streak, label: t(lang, 'card_streak') });

  const colW = (W - PAD * 2) / 3;
  const statsSvg = stats.map((s, i) => {
    const x = PAD + i * colW;
    return `<text x="${x}" y="820" ${SERIF} font-size="76" fill="${C.ink}">${s.value}</text>`
      + `<text x="${x + 2}" y="864" ${SANS} font-weight="500" font-size="20" letter-spacing="3" fill="${C.inkSoft}">${esc(upper(s.label, lang))}</text>`;
  }).join('');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  ${background()}

  <text x="${PAD}" y="150" ${SANS} font-weight="500" font-size="24" letter-spacing="6" fill="${C.teal}">${esc(kicker)}</text>
  <text x="${PAD - 2}" y="236" ${SERIF} font-size="60" fill="${C.ink}">${esc(truncate(drawable(d.name), 18))}</text>

  ${emblem(820, 330, 1.05)}

  <text x="${PAD - 8}" y="560" ${SERIF} font-size="280" fill="${C.teal}">${d.ayahs}</text>
  <text x="${PAD}" y="688" ${SANS} font-weight="400" font-size="30" fill="${C.inkSoft}">${esc(t(lang, 'card_ayahs_label'))}</text>

  ${statsSvg}

  ${juzGrid(d.juz, 940)}

  <text x="${PAD}" y="1270" ${SANS} font-weight="400" font-size="24" fill="${C.inkSoft}">@${esc(d.botUsername)}</text>
  <text x="${W - PAD}" y="1270" ${SANS} font-weight="400" font-size="24" fill="${C.inkSoft}" text-anchor="end">${esc(formatDate(lang, d.timezone))}</text>
</svg>`;

  return toPng(svg);
}
