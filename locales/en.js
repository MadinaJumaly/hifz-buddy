export default {

  ask_baseline:
    `📚 Which surahs do you already know by heart?\n\nTap to mark them, then press Done. Nothing yet? Just press Done.`,

  log_invalid_surah:   `That surah number is not valid. Please enter a number between 1 and 114.`,
  log_invalid_range:   `That ayah range is not valid for this surah. {surah} has {total} ayahs.`,
  log_duplicate:       `You have already logged these ayahs. Use /progress to see what you have memorized.`,

  log_notified:        `Your teacher and friends have been notified.`,

  // ── notifications sent to teacher / friend ───────────────────
  notify_teacher:
    `📖 {student} logged new memorization:\n{ar} — {name} ({n}), ayahs {from}–{to}`,

  notify_friend:
    `📖 {student} logged new memorization:\n{ar} — {name} ({n}), ayahs {from}–{to}`,

  // ── pairing ─────────────────────────────────────────────────
  pair_not_found:      `That code was not found or has expired. Ask for a new one.`,
  pair_self:           `You cannot pair with yourself.`,
  pair_teacher_done:
    `You are now connected to your teacher {name}. They will be notified of your progress. BarakAllahu feek!`,
  pair_friend_done:
    `🤝 You and {name} are now friends. You'll each see the other's new memorization. BarakAllahu feekum!`,
  pair_already_teacher: `You already have an active teacher. Use /unpair first.`,

  generate_code_teacher:
    `Your teacher link — share this with your students:\n\n{link}\n\nThis link never expires. Use /resetlink teacher to get a new one.`,
  generate_code_friend:
    `Your friend link — share this with your friends:\n\n{link}\n\nThis link never expires. Use /resetlink friend to get a new one.`,

  resetlink_usage:    `Usage: /resetlink friend  or  /resetlink teacher`,
  resetlink_done:     `Done! Your new link:\n\n{link}\n\nThe old link no longer works.`,

  unpair_confirm:      `Are you sure you want to unpair from your teacher {name}? Your history will be kept.`,
  unpair_done:         `Done. You have been unpaired.`,
  unpair_none:         `You do not have an active teacher.`,

  // ── milestones ───────────────────────────────────────────────
  milestone_khatm:     `La ilaha illallah {name}! You have completed the entire Quran! May Allah accept it from you and make you among Ahlul Quran. 🤲🌙`,

  // ── general ─────────────────────────────────────────────────
  settings_language:   `Choose your language:`,
  settings_done:       `Settings updated.`,
  error_generic:       `Something went wrong. Please try again.`,
  cancel:              `Cancelled.`,
  confirm_yes:         `Yes`,
  confirm_no:          `No`,
  done:                `✅ Done`,
  back:                `Back`,

  // ── setup, menu, logging & settings ──────────────────────────
  welcome: `Assalamu Alaykum, {name}! 🌙\n\nHifzBuddy helps you keep track of your Quran memorization:\n• log new ayahs in a few seconds\n• see your progress and streak\n• keep your teacher and friends updated\n\n📍 Which city are you in? It's used for reminder times.`,
  welcome_back: `Assalamu Alaykum, {name}! 🌙 Your menu is below.`,
  city_other: `Other`,
  city_type_prompt: `Type the name of your city:`,
  city_unknown: `I don't know that city yet, so I'll use UTC time. You can change it later in ⚙️ Settings.`,
  city_not_found: `I don't know that city yet. Please pick one of the buttons, or try a bigger city nearby.`,
  setup_first: `Let's finish setting up first — send /start`,
  selected_count: `Selected: {n}`,
  onboarding_done: `MashaAllah! Saved {count} ayahs you already know. 🤲\n\nTo log new memorization, tap 📖 or just send:\n• 2 255 257 — surah 2, ayahs 255–257\n• 112 — the whole surah\n\nKnow part of a surah already? Send it the same way.`,
  menu_ready: `Here's your menu 👇`,
  menu_hint: `To log memorization, just send the surah and ayahs, e.g. 2 255 257\nOr use the menu below 👇`,
  log_prompt: `Send the surah number and ayahs:\n\n• 2 255 257 — surah 2, ayahs 255–257\n• 112 — the whole surah`,
  log_usage: `Send: /partial [surah] [from] [to]\nExample: /partial 2 1 10`,
  log_success: `✅ Saved: {ar} — {name}, ayahs {from}–{to}`,
  log_more: `➕ Log more`,
  progress_empty: `Nothing logged yet. Tap 📖 or send e.g. 112 to log a whole surah.`,
  settings_title: `⚙️ Settings\n\nTap a row to change it.`,
  settings_city: `📍 City: {city}`,
  settings_lang: `🌐 Language: {lang}`,
  settings_reminder_on: `🔔 Reminder: {time}`,
  settings_reminder_off: `🔕 Reminder: off`,
  settings_invite_friend: `👥 Invite a friend`,
  settings_teacher_link: `🎓 Link for students`,
  settings_choose_city: `📍 Choose your city:`,
  settings_choose_reminder: `🔔 When should I remind you?\n\nI'll only send it on days you haven't logged anything yet.`,
  reminder_off_btn: `🔕 Turn off`,
  reminder_status_on: `⏰ Daily reminder is ON at {time} ({tz}).\n\nChange it in ⚙️ Settings, or: /reminder 21:30 · /reminder off`,
  reminder_status_off: `⏰ Daily reminder is OFF.\n\nTurn it on in ⚙️ Settings, or: /reminder on`,
  reminder_on: `✅ Daily reminder set for {time} ({tz}). I'll only remind you on days you haven't logged yet.`,
  reminder_off: `Daily reminder turned off.`,
  reminder_invalid: `Please use a 24-hour time, for example: /reminder 20:00`,
  reminder_message: `🌙 Assalamu Alaykum, {name}! You haven't logged any memorization today.\n\nEven a few ayahs count — tap 📖 when you're ready.`,
  reminder_streak: `Your streak is {n} days — keep it going! 🔥`,
  reminder_hint: `🔔 Want a daily reminder? Turn it on in ⚙️ Settings.`,
  teacher_inactive_alert: `📭 {student} hasn't logged any new memorization in {days} days.`,
  cmd_progress: `My progress`,
  cmd_settings: `Settings`,
  cmd_start: `Main menu`,

  // ── progress, goals & sharing ─────────────────────────────────
  progress_main: `Surahs <b>{surahs}</b>   ·   Ayahs <b>{ayahs}</b>`,
  progress_main_ayahs: `Ayahs <b>{ayahs}</b>`,
  progress_by_heart: `<i>memorized by heart</i>`,
  progress_complete: `<b>The whole Quran</b> ✓`,
  progress_week: `+{n} this week`,
  progress_streak_on: `🔥 {n}-day streak`,
  progress_streak_best: ` · best {n}`,
  progress_streak_start: `Log today to start your streak 🔥`,
  log_streak: `🔥 {n}-day streak`,
  milestone_goal: `🎉 <b>{goal} ayahs</b>\n\nMashaAllah, {name}! Another milestone on your hifz journey.`,
  share_btn: `↗ Share`,
  share_text: `Alhamdulillah! My hifz so far: {surahs} surahs, {ayahs} ayahs 🤍\nTracking it with HifzBuddy`,
  pair_friend_owner: `🤝 {name} joined through your link. You're now friends and will see each other's new memorization.`,
  pair_teacher_owner: `📖 {name} has connected to you as a student. You'll be notified of their progress.`,
  juz_left: `Juz {n} — {left} ayahs to go`,
  progress_juz_done: `{n} juz ✓`,
  milestone_juz: `🎉 <b>Juz {n} complete</b>\n\nMashaAllah, {name}! May Allah keep it firm in your heart.`,

  // ── share card (image) ───────────────────────────────────────
  card_kicker: `Hifz journey`,
  card_ayahs_label: `ayahs memorized by heart`,
  card_surahs: `Surahs`,
  card_juz: `Juz complete`,
  card_streak: `Day streak`,
  card_head_juz: `Juz {n} complete`,
  card_head_goal: `{goal} ayahs`,
  card_head_khatm: `The whole Quran`,
  inline_no_card: `Open the bot to create your card`,

  // ── heart card ────────────────────────────────────────────────
  heart_kicker: `My heart`,
  heart_label: `of the Quran is in my heart`,
  heart_btn: `🤍 My heart`,
  heart_caption: `🤍 <b>{pct}</b> of the Quran is in your heart.\n\nMay Allah fill it with His light.`,
};
