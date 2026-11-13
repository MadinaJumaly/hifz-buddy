import { Markup } from 'telegraf';
import { t } from './i18n.js';

export const TOTAL_AYAHS = 6236;

// Small, reachable goals first; the last one is the whole Quran
export const GOALS = [10, 25, 50, 100, 200, 300, 500, 750, 1000, 1500, 2000, 2500, 3000, 4000, 5000, TOTAL_AYAHS];

export function nextGoal(total) {
  return GOALS.find(g => g > total) ?? null;
}

// Highest goal reached at `total`, or null
export function reachedGoal(total) {
  return [...GOALS].reverse().find(g => g <= total) ?? null;
}

// "▰▰▰▰▰▰▰▱▱▱" — progress toward the next goal, not the whole Quran
export function goalBar(total, goal, width = 10) {
  const filled = Math.min(width, Math.floor((total / goal) * width));
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
