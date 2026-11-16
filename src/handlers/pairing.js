import { Markup } from 'telegraf';
import {
  getOrCreateSlug, resetSlug, getUserBySlug,
  pairTeacher, pairFriend, getActiveTeacher, getActiveFriends, unpairTeacher,
  getUserById, createPairRequest, getPairRequest, setPairRequestStatus,
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

// Called from deep-link /start and after onboarding.
// Opening a link only creates a request; the link owner must accept before anyone is paired.
export async function applyInvite(ctx, type, slug) {
  const lang = ctx.user?.language || 'en';

  const ownerUser = getUserBySlug(slug, type);
  if (!ownerUser) return ctx.reply(t(lang, 'pair_not_found'));
  if (ownerUser.id === ctx.user.id) return ctx.reply(t(lang, 'pair_self'));

  if (type === 'teacher') {
    if (getActiveTeacher(ctx.user.id)) return ctx.reply(t(lang, 'pair_already_teacher'));
  } else if (getActiveFriends(ctx.user.id).some(f => f.id === ownerUser.id)) {
    return ctx.reply(t(lang, 'pair_already_friends', { name: ownerUser.display_name }));
  }

  const requestId = createPairRequest(ctx.user.id, ownerUser.id, type);
  if (!requestId) return ctx.reply(t(lang, 'pair_request_pending', { name: ownerUser.display_name }));

  const ownerLang = ownerUser.language;
  try {
    await ctx.telegram.sendMessage(
      ownerUser.telegram_id,
      t(ownerLang, `pair_request_${type}`, { name: ctx.user.display_name }),
      Markup.inlineKeyboard([
        Markup.button.callback(t(ownerLang, 'pair_accept_btn'), `pair_ok_${requestId}`),
        Markup.button.callback(t(ownerLang, 'pair_reject_btn'), `pair_no_${requestId}`),
      ]),
    );
  } catch {
    setPairRequestStatus(requestId, 'rejected');
    return ctx.reply(t(lang, 'pair_owner_unreachable', { name: ownerUser.display_name }));
  }

  await ctx.reply(t(lang, 'pair_request_sent', { name: ownerUser.display_name }));
}

// Link owner taps ✅ Accept / ❌ Reject on a request
export async function handlePairDecision(ctx) {
  const [, decision, idText] = ctx.match;
  const request = getPairRequest(Number(idText));
  const owner = request && getUserById(request.owner_id);

  // Only the link owner can answer, and only once
  if (!request || !owner || owner.telegram_id !== ctx.from.id) return ctx.answerCbQuery();
  const ownerLang = owner.language;
  if (request.status !== 'pending') {
    await ctx.answerCbQuery(t(ownerLang, 'pair_request_handled'));
    return ctx.editMessageReplyMarkup(undefined).catch(() => {});
  }

  const requester = getUserById(request.requester_id);
  if (!requester) return ctx.answerCbQuery();
  const reqLang = requester.language;
  await ctx.answerCbQuery();

  if (decision === 'no') {
    setPairRequestStatus(request.id, 'rejected');
    await ctx.editMessageText(t(ownerLang, 'pair_rejected_owner', { name: requester.display_name }));
    try {
      await ctx.telegram.sendMessage(requester.telegram_id, t(reqLang, 'pair_rejected_requester', { name: owner.display_name }));
    } catch {}
    return;
  }

  if (request.type === 'teacher') {
    // The student may have found another teacher while this request waited
    if (getActiveTeacher(requester.id)) {
      setPairRequestStatus(request.id, 'rejected');
      return ctx.editMessageText(t(ownerLang, 'pair_student_has_teacher', { name: requester.display_name }));
    }
    pairTeacher(requester.id, owner.id);
  } else {
    // Friends see each other's progress, so pair both ways
    pairFriend(requester.id, owner.id);
    pairFriend(owner.id, requester.id);
  }
  setPairRequestStatus(request.id, 'accepted');

  await ctx.editMessageText(t(ownerLang, `pair_${request.type}_owner`, { name: requester.display_name }));
  try {
    await ctx.telegram.sendMessage(requester.telegram_id, t(reqLang, `pair_${request.type}_done`, { name: owner.display_name }));
  } catch {}
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