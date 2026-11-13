import { Markup } from 'telegraf';
import { t } from './i18n.js';

export const TOTAL_AYAHS = 6236;

// Small, reachable goals first; the last one is the whole Quran
export const GOALS = [10, 25, 50, 100, 200, 300, 500, 750, 1000, 1500, 2000, 2500, 3000, 4000, 5000, TOTAL_AYAHS];

// "▰▰▰▰▰▰▰▱▱▱" — any progress at all shows at least one filled segment
export function bar(done, total, width = 10) {
  let filled = Math.min(width, Math.floor((done / total) * width));
  if (done > 0 && filled === 0) filled = 1;
  return '▰'.repeat(filled) + '▱'.repeat(width - filled);
}

export function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Inline "Share" button that opens Telegram's chat/channel picker
export function shareButton(ctx, lang, { surahs, ayahs }) {
  const botLink = `https://t.me/${ctx.botInfo.username}`;
  const text = t(lang, 'share_text', { surahs, ayahs });
  const url = `https://t.me/share/url?url=${encodeURIComponent(botLink)}&text=${encodeURIComponent(text)}`;
  return Markup.button.url(t(lang, 'share_btn'), url);
}
