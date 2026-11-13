// Main reply keyboard, in the user's language.
const LABELS = {
  en: { log: '📖 Log', progress: '📊 Progress', settings: '⚙️ Settings' },
  ru: { log: '📖 Записать', progress: '📊 Прогресс', settings: '⚙️ Настройки' },
  kz: { log: '📖 Жаттадым', progress: '📊 Прогресс', settings: '⚙️ Баптаулар' },
};

// Labels from older versions, so old keyboards keep working until refreshed
const LEGACY = {
  '📖 Log memorization': 'log',
  '🔗 My friend code': 'friend',
  '🔗 My teacher code': 'teacher',
  '⏰ Reminder': 'settings',
};

export const LANGUAGE_NAMES = {
  kz: '🇰🇿 Қазақша',
  ru: '🇷🇺 Русский',
  en: '🇬🇧 English',
};

export function mainMenu(lang) {
  const l = LABELS[lang] || LABELS.en;
  return {
    reply_markup: {
      keyboard: [[l.log, l.progress], [l.settings]],
      resize_keyboard: true,
      is_persistent: true,
    },
  };
}

// Which menu button (in any language) was tapped, or null
export function matchMenuButton(text) {
  for (const labels of Object.values(LABELS)) {
    for (const [action, label] of Object.entries(labels)) {
      if (label === text) return action;
    }
  }
  return LEGACY[text] || null;
}
