// Cities offered as buttons during setup and in settings
export const CITY_BUTTONS = [
  { key: 'almaty',   tz: 'Asia/Almaty',   kz: 'Алматы',   ru: 'Алматы',   en: 'Almaty' },
  { key: 'astana',   tz: 'Asia/Almaty',   kz: 'Астана',   ru: 'Астана',   en: 'Astana' },
  { key: 'shymkent', tz: 'Asia/Almaty',   kz: 'Шымкент',  ru: 'Шымкент',  en: 'Shymkent' },
  { key: 'tashkent', tz: 'Asia/Tashkent', kz: 'Ташкент',  ru: 'Ташкент',  en: 'Tashkent' },
  { key: 'moscow',   tz: 'Europe/Moscow', kz: 'Мәскеу',   ru: 'Москва',   en: 'Moscow' },
];

export function getCityButton(key) {
  return CITY_BUTTONS.find(c => c.key === key);
}

// Typed city name → IANA timezone (first word, case-insensitive)
const TYPED = {
  almaty: 'Asia/Almaty', 'алматы': 'Asia/Almaty', 'алма-ата': 'Asia/Almaty',
  astana: 'Asia/Almaty', 'астана': 'Asia/Almaty', nur: 'Asia/Almaty',
  shymkent: 'Asia/Almaty', 'шымкент': 'Asia/Almaty',
  karaganda: 'Asia/Almaty', 'караганда': 'Asia/Almaty', 'қарағанды': 'Asia/Almaty',
  taraz: 'Asia/Almaty', 'тараз': 'Asia/Almaty',
  aktobe: 'Asia/Aqtobe', 'актобе': 'Asia/Aqtobe', 'ақтөбе': 'Asia/Aqtobe',
  atyrau: 'Asia/Atyrau', 'атырау': 'Asia/Atyrau',
  aktau: 'Asia/Aqtau', 'актау': 'Asia/Aqtau', 'ақтау': 'Asia/Aqtau',
  tashkent: 'Asia/Tashkent', 'ташкент': 'Asia/Tashkent',
  bishkek: 'Asia/Bishkek', 'бишкек': 'Asia/Bishkek',
  moscow: 'Europe/Moscow', 'москва': 'Europe/Moscow', 'мәскеу': 'Europe/Moscow',
  kazan: 'Europe/Moscow', 'казань': 'Europe/Moscow',
  dubai: 'Asia/Dubai', riyadh: 'Asia/Riyadh', cairo: 'Africa/Cairo',
  istanbul: 'Europe/Istanbul', ankara: 'Europe/Istanbul',
  london: 'Europe/London', paris: 'Europe/Paris', berlin: 'Europe/Berlin',
  jakarta: 'Asia/Jakarta', karachi: 'Asia/Karachi', lahore: 'Asia/Karachi',
  dhaka: 'Asia/Dhaka', kuala: 'Asia/Kuala_Lumpur', tehran: 'Asia/Tehran',
  baghdad: 'Asia/Baghdad', beirut: 'Asia/Beirut', amman: 'Asia/Amman',
  doha: 'Asia/Qatar', kuwait: 'Asia/Kuwait',
};

export function resolveTimezone(city) {
  return TYPED[city.trim().toLowerCase().split(/\s/)[0]] || null;
}
