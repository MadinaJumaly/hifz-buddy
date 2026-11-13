import { Markup } from 'telegraf';
import {
  getOrCreateSlug, resetSlug, getUserBySlug,
  pairTeacher, pairFriend, getActiveTeacher, unpairTeacher,
} from '../services/db.js';
import { t } from '../utils/i18n.js';

export async function handleGenerateTeacher(ctx) {
  const lang = ctx.user?.language || 'en';
  if (!ctx.user) return ctx.reply(t(lang, 'error_generic'));

  const slug = getOrCreateSlug(ctx.user.id, 'teacher');
  const link = `https://t.me/${ctx.botInfo.username}?start=teacher_${slug}`;
  await ctx.reply(t(lang, 'generate_code_teacher', { link }));
}

export async function handleGenerateFriend(ctx) {
  const lang = ctx.user?.language || 'en';
  if (!ctx.user) return ctx.reply(t(lang, 'error_generic'));

  const slug = getOrCreateSlug(ctx.user.id, 'friend');
  const link = `https://t.me/${ctx.botInfo.username}?start=friend_${slug}`;
  await ctx.reply(t(lang, 'generate_code_friend', { link }));
}

export async function handleResetLink(ctx) {
  const lang = ctx.user?.language || 'en';
  if (!ctx.user) return ctx.reply(t(lang, 'error_generic'));

  const type = ctx.message.text.split(' ')[1]?.trim().toLowerCase();
  if (type !== 'friend' && type !== 'teacher') {
    return ctx.reply(t(lang, 'resetlink_usage'));
  }

  const slug = resetSlug(ctx.user.id, type);
  const link = `https://t.me/${ctx.botInfo.username}?start=${type}_${slug}`;
  await ctx.reply(t(lang, 'resetlink_done', { link }));
}

// Called from deep-link /start and after onboarding
export async function applyInvite(ctx, type, slug) {
  const lang = ctx.user?.language || 'en';

  const ownerUser = getUserBySlug(slug, type);
  if (!ownerUser) return ctx.reply(t(lang, 'pair_not_found'));
  if (ownerUser.id === ctx.user.id) return ctx.reply(t(lang, 'pair_self'));

  if (type === 'teacher') {
    const existing = getActiveTeacher(ctx.user.id);
    if (existing) return ctx.reply(t(lang, 'pair_already_teacher'));
    pairTeacher(ctx.user.id, ownerUser.id);
    await ctx.reply(t(lang, 'pair_teacher_done', { name: ownerUser.display_name }));
    try {
      await ctx.telegram.sendMessage(
        ownerUser.telegram_id,
        t(ownerUser.language, 'pair_teacher_owner', { name: ctx.user.display_name }),
      );
    } catch {}
  } else {
    // Friends see each other's progress, so pair both ways
    pairFriend(ctx.user.id, ownerUser.id);
    pairFriend(ownerUser.id, ctx.user.id);
    await ctx.reply(t(lang, 'pair_friend_done', { name: ownerUser.display_name }));
    try {
      await ctx.telegram.sendMessage(
        ownerUser.telegram_id,
        t(ownerUser.language, 'pair_friend_owner', { name: ctx.user.display_name }),
      );
    } catch {}
  }
}

export async function handleUnpair(ctx) {
  const lang = ctx.user?.language || 'en';
  if (!ctx.user) return ctx.reply(t(lang, 'error_generic'));

  const teacher = getActiveTeacher(ctx.user.id);
  if (!teacher) return ctx.reply(t(lang, 'unpair_none'));

  await ctx.reply(
    t(lang, 'unpair_confirm', { name: teacher.display_name }),
    Markup.inlineKeyboard([
      Markup.button.callback(t(lang, 'confirm_yes'), 'unpair_yes'),
      Markup.button.callback(t(lang, 'confirm_no'), 'unpair_no'),
    ])
  );
}

export async function handleUnpairConfirm(ctx) {
  await ctx.answerCbQuery();
  const lang = ctx.user?.language || 'en';
  unpairTeacher(ctx.user.id);
  await ctx.editMessageText(t(lang, 'unpair_done'));
}

export async function handleUnpairCancel(ctx) {
  await ctx.answerCbQuery();
  const lang = ctx.user?.language || 'en';
  await ctx.editMessageText(t(lang, 'cancel'));
}