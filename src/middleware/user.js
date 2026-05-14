import { getUserByTelegramId } from '../services/db.js';

export async function userMiddleware(ctx, next) {
  if (!ctx.from) return next();
  const user = getUserByTelegramId(ctx.from.id);
  ctx.user = user || null;
  return next();
}