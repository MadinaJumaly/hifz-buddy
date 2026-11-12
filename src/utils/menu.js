// Main reply keyboard. Button labels are matched by text in src/index.js.
export const BTN = {
  log: '📖 Log memorization',
  progress: '📊 Progress',
  friendCode: '🔗 My friend code',
  teacherCode: '🔗 My teacher code',
  reminder: '⏰ Reminder',
};

export const mainMenu = {
  reply_markup: {
    keyboard: [
      [BTN.log, BTN.progress],
      [BTN.friendCode, BTN.teacherCode],
      [BTN.reminder],
    ],
    resize_keyboard: true,
  },
};
