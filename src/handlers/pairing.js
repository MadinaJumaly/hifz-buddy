import { Markup } from 'telegraf';
import {
  createInviteCode, getInviteCode, markCodeUsed,
  pairTeacher, pairFriend, getActiveTeacher, unpairTeacher,
} from '../services/db.js';
import { t } from '../utils/i18n.js';

export async function handleGenerateTeacher(ctx) {
  const lang = ctx.user?.language || 'en';
  if (!ctx.user) return ctx.reply(t(lang, 'error_generic'));

  const code = createInviteCode({ ownerId: ctx.user.id, inviteType: 'teacher' });
  await ctx.reply(t(lang, 'generate_code_teacher', { code }));
}

export async function handleGenerateFriend(ctx) {
  const lang = ctx.user?.language || 'en';
  if (!ctx.user) return ctx.reply(t(lang, 'error_generic'));

  const code = createInviteCode({ ownerId: ctx.user.id, inviteType: 'friend' });
  await ctx.reply(t(lang, 'generate_code_friend', { code }));
}

export async function handlePair(ctx) {
  const lang = ctx.user?.language || 'en';
  if (!ctx.user) return ctx.reply(t(lang, 'error_generic'));

  const code = ctx.message.text.split(' ')[1]?.trim().toUpperCase();
  if (!code) return ctx.reply(t(lang, 'pair_usage'));

  const invite = getInviteCode(code);
  if (!invite) return ctx.reply(t(lang, 'pair_not_found'));
  if (invite.used) return ctx.reply(t(lang, 'pair_used'));
  if (invite.expires_at < new Date().toISOString()) return ctx.reply(t(lang, 'pair_not_found'));
  if (invite.owner_id === ctx.user.id) return ctx.reply(t(lang, 'pair_self'));

  // Fetch owner by internal id
  const { default: db } = await import('../services/db.js');
  const ownerUser = db.prepare('SELECT * FROM users WHERE id = ?').get(invite.owner_id);
  if (!ownerUser) return ctx.reply(t(lang, 'error_generic'));

  if (invite.invite_type === 'teacher') {
    const existing = getActiveTeacher(ctx.user.id);
    if (existing) return ctx.reply(t(lang, 'pair_already_teacher'));
    pairTeacher(ctx.user.id, ownerUser.id);
    markCodeUsed(code);
    await ctx.reply(t(lang, 'pair_teacher_done', { name: ownerUser.display_name }));

    // Notify the teacher
    try {
      await ctx.telegram.sendMessage(
        ownerUser.telegram_id,
        `📖 ${ctx.user.display_name} has connected to you as a student.`
      );
    } catch {}

  } else {
    pairFriend(ctx.user.id, ownerUser.id);
    markCodeUsed(code);
    await ctx.reply(t(lang, 'pair_friend_done', { name: ownerUser.display_name }));

    try {
      await ctx.telegram.sendMessage(
        ownerUser.telegram_id,
        `📖 ${ctx.user.display_name} has added you as a companion.`
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