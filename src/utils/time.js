// Timezone helpers. All dates are 'YYYY-MM-DD', times are zero-padded 'HH:MM'.

// Local date/time for `now` in an IANA timezone (falls back to UTC if invalid)
export function localParts(timezone, now = new Date()) {
  let parts;
  try {
    parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone || 'UTC',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(now);
  } catch {
    return localParts('UTC', now);
  }
  const get = (type) => parts.find(p => p.type === type).value;
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    time: `${get('hour')}:${get('minute')}`,
    hour: Number(get('hour')),
  };
}

export function localDate(timezone, now = new Date()) {
  return localParts(timezone, now).date;
}

export function previousDate(isoDate) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

// Whole days from date `a` to date `b` (both 'YYYY-MM-DD')
export function daysBetween(a, b) {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000);
}

// Parse user input like "20:00", "9:30" or "21" → "HH:MM", or null if invalid
export function parseTime(input) {
  const m = String(input).trim().match(/^(\d{1,2})(?:[:.](\d{2}))?$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2] ?? 0);
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}
