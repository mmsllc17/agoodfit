import type { AppEvent, Invoice, State } from './types';

export const DAY = 86400000;

/** Small deterministic random generator, so sample charts look the same on every load. */
function rng(seed: string) {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The last `days` days, oldest first, each at local midnight. */
export function dayRange(days: number) {
  const t = new Date();
  return Array.from({ length: days }, (_, i) => new Date(t.getFullYear(), t.getMonth(), t.getDate() - (days - 1 - i)));
}

export const dayLabel = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

/** A sample trend from `start` to `end` with gentle noise and a weekend lift. */
export function sampleSeries(seed: string, days: number, start: number, end: number, noise = 0.06, weekend = 0) {
  const r = rng(seed + days);
  return dayRange(days).map((d, i) => {
    const base = start + ((end - start) * i) / Math.max(1, days - 1);
    const wk = d.getDay() === 0 || d.getDay() === 6 ? 1 + weekend : 1;
    return Math.max(0, Math.round(base * wk * (1 + (r() - 0.5) * 2 * noise)));
  });
}

/** Featured-event views per day across these events, for the last `days` days. */
export function viewsPerDay(events: AppEvent[], days: number) {
  // Key by calendar date, not timestamp, so daylight saving changes don't shift days.
  const range = dayRange(days);
  const idx = new Map(range.map((d, i) => [d.toDateString(), i]));
  const out = new Array(days).fill(0);
  for (const e of events) {
    if (!e.stats || !e.featureStart) continue;
    const s = new Date(e.featureStart);
    e.stats.viewsByDay.forEach((v, i) => {
      const d = new Date(s.getFullYear(), s.getMonth(), s.getDate() + i);
      const k = idx.get(d.toDateString());
      if (k !== undefined) out[k] += v;
    });
  }
  return out;
}

/** Featured events whose run overlaps the last `days` days. */
export function featuredInRange(events: AppEvent[], days: number) {
  const from = Date.now() - days * DAY;
  return events.filter((e) => e.kind === 'featured' && e.stats && e.featureStart && new Date(e.featureStart).getTime() + e.stats.viewsByDay.length * DAY >= from);
}

export function totals(events: AppEvent[]) {
  return events.reduce(
    (a, e) => ({
      views: a.views + (e.stats?.viewsByDay.reduce((x, y) => x + y, 0) ?? 0),
      taps: a.taps + (e.stats?.taps ?? 0),
      rsvps: a.rsvps + (e.stats?.rsvps ?? 0),
      checkins: a.checkins + (e.stats?.checkins ?? 0),
    }),
    { views: 0, taps: 0, rsvps: 0, checkins: 0 },
  );
}

/** Combine each event's audience shares, weighted by its RSVPs. Returns the top rows plus Other. */
export function mergeShares(events: AppEvent[], key: 'hoods' | 'interests', top = 5): [string, number][] {
  const m = new Map<string, number>();
  let total = 0;
  for (const e of events) {
    if (!e.stats) continue;
    const w = e.stats.rsvps || 1;
    for (const [k, v] of e.stats[key]) {
      m.set(k, (m.get(k) ?? 0) + v * w);
      total += v * w;
    }
  }
  if (!total) return [];
  const rows = [...m.entries()].filter(([k]) => k !== 'Other').sort((a, b) => b[1] - a[1]);
  const kept = rows.slice(0, top).map(([k, v]) => [k, Math.round((v / total) * 100)] as [string, number]);
  const rest = 100 - kept.reduce((s, [, v]) => s + v, 0);
  if (rest > 0) kept.push(['Other', rest]);
  return kept;
}

export function paidInRange(invoices: Invoice[], days: number) {
  const from = Date.now() - days * DAY;
  return invoices.filter((i) => i.status === 'Paid' && new Date(i.date).getTime() >= from && new Date(i.date).getTime() <= Date.now()).reduce((s, i) => s + i.amount, 0);
}

/** Paid revenue per calendar month for the last `months` months. */
export function revenueByMonth(invoices: Invoice[], months = 6) {
  const now = new Date();
  return Array.from({ length: months }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (months - 1 - i), 1);
    const value = invoices
      .filter((inv) => inv.status === 'Paid')
      .filter((inv) => {
        const x = new Date(inv.date);
        return x.getFullYear() === d.getFullYear() && x.getMonth() === d.getMonth();
      })
      .reduce((s, inv) => s + inv.amount, 0);
    return { label: d.toLocaleDateString('en-US', { month: 'short' }), value };
  });
}

/** App-wide member numbers. Sample data until the app is connected. */
export function memberSeries(state: State, days: number) {
  const members = 4860 + state.accounts.filter((a) => a.kind === 'business').length * 12;
  const start = Math.round(members - 6.4 * days);
  const total = sampleSeries('members', days, start, members, 0.004);
  total[total.length - 1] = members;
  const active = total.map((t, i) => Math.round(t * (0.4 + 0.03 * Math.sin(i / 3))));
  const activities = sampleSeries('activities', days, 360, 445, 0.12, 0.35);
  const newMembers = total.map((t, i) => (i ? Math.max(0, t - total[i - 1]) : 6));
  return { total, active, activities, newMembers };
}
