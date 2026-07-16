import { Song } from "../models/song.model";

export type ListenStat = { ms: number; plays: number; lastAt: number };
export type ListenStats = Record<string, ListenStat>;

/** Hot first; every 4th slot surfaces a cold (least-heard) track so neglected favorites stay visible. */
export function rankByListen(
  songs: Song[],
  stats: ListenStats,
  /** Stable salt (e.g. day bucket) — same day → same interleave, no flicker. */
  salt = 0,
): Song[] {
  if (songs.length <= 1) return [...songs];

  const score = (s: Song) => {
    const st = stats[s.link];
    return (st?.ms ?? 0) + (st?.plays ?? 0) * 30_000;
  };
  const lastAt = (s: Song) => stats[s.link]?.lastAt ?? 0;

  const byHot = [...songs].sort((a, b) => {
    const d = score(b) - score(a);
    if (d) return d;
    const t = lastAt(b) - lastAt(a);
    if (t) return t;
    return (a.order ?? 0) - (b.order ?? 0);
  });
  // Cold: least listen time, prefer never/long-ago — rotate start by salt.
  const byCold = [...songs].sort((a, b) => {
    const d = score(a) - score(b);
    if (d) return d;
    return lastAt(a) - lastAt(b);
  });
  const coldStart = ((salt % byCold.length) + byCold.length) % byCold.length;
  const coldRotated = [
    ...byCold.slice(coldStart),
    ...byCold.slice(0, coldStart),
  ];

  const out: Song[] = [];
  const used = new Set<string>();
  let hi = 0;
  let ci = 0;
  for (let i = 0; i < songs.length; i++) {
    const wantCold = songs.length >= 5 && i > 0 && i % 4 === 3;
    if (wantCold) {
      while (ci < coldRotated.length && used.has(coldRotated[ci].link)) ci++;
      if (ci < coldRotated.length) {
        const pick = coldRotated[ci++];
        out.push(pick);
        used.add(pick.link);
        continue;
      }
    }
    while (hi < byHot.length && used.has(byHot[hi].link)) hi++;
    if (hi < byHot.length) {
      const pick = byHot[hi++];
      out.push(pick);
      used.add(pick.link);
    }
  }
  return out;
}

/** Day-stable index into a pool; `bump` rotates on manual refresh. */
export function rotateIndex(length: number, day: number, bump = 0): number {
  if (length <= 0) return 0;
  return (((day + bump) % length) + length) % length;
}
