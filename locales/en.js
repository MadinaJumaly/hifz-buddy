export default {
  // ── onboarding ──────────────────────────────────────────────
  welcome:
    `Assalamu Alaykum! 🌙\n\nWelcome to the Quran Memorization Bot.\n\nThis bot will help you track your Hifz journey and notify your teacher or friends every time you memorize new ayahs.\n\nLet's get you set up. What is your name?`,

  ask_timezone:
    `JazakAllahu Khayran, {name}!\n\nPlease enter your city name so I can set your timezone correctly.\n\nExample: Almaty, London, Dubai`,

  ask_baseline:
    `BarakAllahu feek! Now let's record what you have already memorized.\n\nSelect the surahs you have fully memorized. You can also enter partial surahs after.\n\nUse the buttons below — tap a surah to mark it, then press Done when finished.`,

  ask_partial:
    `Would you like to add any partially memorized surahs?\n\nSend me: /partial [surah number] [from] [to]\nExample: /partial 2 1 10`,

  onboarding_done:
    `MashAllah! Your baseline has been saved.\n\nYou have recorded {count} ayahs memorized so far.\n\nYou are ready to begin. Use /log to record new memorization. May Allah make it easy for you. 🤲`,

  // ── logging ─────────────────────────────────────────────────
  log_usage:
    `Usage: /log [surah] [from] [to]\nExample: /log 2 255 257\n\nFor a full surah: /log 112`,

  log_invalid_surah:   `That surah number is not valid. Please enter a number between 1 and 114.`,
  log_invalid_range:   `That ayah range is not valid for this surah. {surah} has {total} ayahs.`,
  log_duplicate:       `You have already logged these ayahs. Use /progress to see what you have memorized.`,

  log_success:
    `Alhamdulillah! Logged:\n{ar} — {name}\nAyahs {from}–{to}\n\nKeep going! 💪`,

  log_notified:        `Your teacher and friends have been notified.`,

  // ── notifications sent to teacher / friend ───────────────────
  notify_teacher:
    `📖 {student} logged new memorization:\n{ar} — {name} ({n}), ayahs {from}–{to}`,

  notify_friend:
    `📖 {student} logged new memorization:\n{ar} — {name} ({n}), ayahs {from}–{to}`,

  // ── progress ────────────────────────────────────────────────
  progress_header:     `📊 Your Hifz Progress`,
  progress_total:      `Total ayahs memorized: {count} / 6236`,
  progress_streak:     `Current streak: {current} days  |  Best: {longest} days`,
  //progress_juz:        `Juz' {n}: {done} / {total} ayahs`,
  progress_empty:      `You have not logged any memorization yet. Use /log to get started.`,

  // ── pairing ─────────────────────────────────────────────────
  pair_usage:          `Usage: /pair [code]`,
  pair_not_found:      `That code was not found or has expired. Ask for a new one.`,
  pair_used:           `That code has already been used.`,
  pair_self:           `You cannot pair with yourself.`,
  pair_teacher_done:
    `You are now connected to your teacher {name}. They will be notified of your progress. BarakAllahu feek!`,
  pair_friend_done:
    `{name} has been added as your companion. They will receive updates on your memorization.`,
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

  // ── reminders ───────────────────────────────────────────────
  reminder_on:         `Fajr reminder enabled. I will remind you every day at Fajr time in {tz}.`,
  reminder_off:        `Reminder disabled.`,
  reminder_message:    `Assalamu Alaykum {name}. A new day, a new opportunity to memorize. 🌅\n\nUse /log to record today's memorization.`,
  inactivity_alert:    `📋 {student} has not logged memorization in {days} days.`,

  // ── milestones ───────────────────────────────────────────────
  milestone_50:        `MashAllah {name}! You have memorized 50 ayahs! May Allah keep it in your heart. 🌟`,
  milestone_100:       `SubhanAllah {name}! 100 ayahs memorized! You are on the path of the people of the Quran. ✨`,
  milestone_juz:       `Alhamdulillah {name}! You have completed Juz' {n}! 🎉`,
  milestone_khatm:     `La ilaha illallah {name}! You have completed the entire Quran! May Allah accept it from you and make you among Ahlul Quran. 🤲🌙`,

  // ── general ─────────────────────────────────────────────────
  settings_language:   `Choose your language:`,
  settings_done:       `Settings updated.`,
  error_generic:       `Something went wrong. Please try again.`,
  cancel:              `Cancelled.`,
  confirm_yes:         `Yes`,
  confirm_no:          `No`,
  done:                `Done`,
  back:                `Back`,
};