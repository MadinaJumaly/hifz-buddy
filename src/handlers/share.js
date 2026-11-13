import { getUserByTelegramId, getTotalAyahs } from '../services/db.js';
import { t } from '../utils/i18n.js';
import { surahStats } from './progress.js';

// Inline mode: typing "@Bot" (or tapping Share) in any chat or channel offers the
// user's latest progress card; tapping it posts the image "via @Bot".
// Requires inline mode to be enabled in BotFather (/setinline).
export async function handleInlineQuery(ctx) {
  const user = getUserByTelegramId(ctx.from.id);
  const lang = user?.language || 'en';
  const opts = { cache_time: 0, is_personal: true };

  if (!user?.onboarding_done || !user.card_file_id) {
    return ctx.answerInlineQuery([], {
      ...opts,
      button: { text: t(lang, 'inline_no_card'), start_parameter: 'card' },
    });
  }

  const ayahs = getTotalAyahs(user.id);
  const { surahs } = surahStats(user.id);
  const caption = `${t(lang, 'share_text', { surahs, ayahs })}\nt.me/${ctx.botInfo.username}`;

  return ctx.answerInlineQuery([{
    type: 'photo',
    id: 'card',
    photo_file_id: user.card_file_id,
    title: t(lang, 'card_kicker'),
    caption,
  }], opts);
}
