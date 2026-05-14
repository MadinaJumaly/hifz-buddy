import en from '../../locales/en.js';
import ru from '../../locales/ru.js';
import kz from '../../locales/kz.js';

const locales = { en, ru, kz };

export function t(lang, key, vars = {}) {
  const locale = locales[lang] || locales.en;
  let str = locale[key] || locales.en[key] || key;
  for (const [k, v] of Object.entries(vars)) {
    str = str.replaceAll(`{${k}}`, String(v));
  }
  return str;
}

export function langFromCtx(ctx) {
  return ctx.user?.language || 'en';
}