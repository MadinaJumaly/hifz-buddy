import surahs from './quran.js';

// Where each juz begins: [surah, ayah] (standard Hafs division).
// Checked against the known per-juz ayah counts (148, 111, … 431, 564; total 6236).
const JUZ_STARTS = [
  [1, 1], [2, 142], [2, 253], [3, 93], [4, 24], [4, 148], [5, 82], [6, 111], [7, 88], [8, 41],
  [9, 93], [11, 6], [12, 53], [15, 1], [17, 1], [18, 75], [21, 1], [23, 1], [25, 21], [27, 56],
  [29, 46], [33, 31], [36, 28], [39, 32], [41, 47], [46, 1], [51, 31], [58, 1], [67, 1], [78, 1],
];

// Every ayah gets a global index 0..6235 so ranges are easy to compare
const SURAH_OFFSET = {};
let total = 0;
for (const s of surahs) {
  SURAH_OFFSET[s.n] = total;
  total += s.ayahs;
}

function globalIndex(surah, ayah) {
  return SURAH_OFFSET[surah] + ayah - 1;
}

// [{ n, start, end, ayahs }] with start/end as global indexes (end inclusive)
export const JUZ = JUZ_STARTS.map(([s, a], i) => {
  const start = globalIndex(s, a);
  const next = JUZ_STARTS[i + 1];
  const end = next ? globalIndex(next[0], next[1]) - 1 : total - 1;
  return { n: i + 1, start, end, ayahs: end - start + 1 };
});

export function juzOf(surah, ayah) {
  const x = globalIndex(surah, ayah);
  return JUZ.find(j => x >= j.start && x <= j.end).n;
}

// Memorized ayahs per juz from rows of { surah_number, ayah_from, ayah_to }
export function juzProgress(ranges) {
  const done = JUZ.map(j => ({ n: j.n, done: 0, total: j.ayahs }));
  for (const r of ranges) {
    const a = globalIndex(r.surah_number, r.ayah_from);
    const b = globalIndex(r.surah_number, r.ayah_to);
    for (const j of JUZ) {
      const overlap = Math.min(b, j.end) - Math.max(a, j.start) + 1;
      if (overlap > 0) done[j.n - 1].done += overlap;
    }
  }
  return done;
}

// The juz to show progress for:
// 1. the juz of the most recent log, if it isn't finished
// 2. otherwise the unfinished juz that is furthest along
// 3. otherwise the highest-numbered unfinished juz (people usually start from Juz Amma)
export function currentJuz(progress, lastRange) {
  const unfinished = progress.filter(j => j.done < j.total);
  if (unfinished.length === 0) return null;

  if (lastRange) {
    const j = progress[juzOf(lastRange.surah_number, lastRange.ayah_to) - 1];
    if (j.done < j.total) return j;
  }

  const started = unfinished.filter(j => j.done > 0);
  if (started.length) return started.reduce((best, j) => (j.done / j.total > best.done / best.total ? j : best));

  return unfinished[unfinished.length - 1];
}
