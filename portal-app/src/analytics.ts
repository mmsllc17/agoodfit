import type { AppEvent, Invoice, State } from './types';

export const DAY = 86400000;

/* ---------- Date windows ---------- */

/** An inclusive range of calendar days, each at local midnight. */
export interface Window {
  from: Date;
  to: Date;
}

export type PresetId = '7d' | '30d' | '90d' | 'mtd' | 'lastm' | 'ytd' | '12m' | 'custom';

export const PRESETS: { id: PresetId; label: string }[] = [
  { id: '7d', label: 'Last 7 days' },
  { id: '30d', label: 'Last 30 days' },
  { id: '90d', label: 'Last 90 days' },
  { id: 'mtd', label: 'This month' },
  { id: 'lastm', label: 'Last month' },
  { id: 'ytd', label: 'Year to date' },
  { id: '12m', label: 'Last 12 months' },
  { id: 'custom', label: 'Custom range' },
];

/** The furthest back analytics go. */
export const MAX_DAYS = 730;

export const today = () => {
  const t = new Date();
  return new Date(t.getFullYear(), t.getMonth(), t.getDate());
};
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

export function presetWindow(id: Exclude<PresetId, 'custom'>): Window {
  const t = today();
  switch (id) {
    case '7d':
      return { from: addDays(t, -6), to: t };
    case '30d':
      return { from: addDays(t, -29), to: t };
    case '90d':
      return { from: addDays(t, -89), to: t };
    case 'mtd':
      return { from: new Date(t.getFullYear(), t.getMonth(), 1), to: t };
    case 'lastm':
      return { from: new Date(t.getFullYear(), t.getMonth() - 1, 1), to: new Date(t.getFullYear(), t.getMonth(), 0) };
    case 'ytd':
      return { from: new Date(t.getFullYear(), 0, 1), to: t };
    case '12m':
      return { from: new Date(t.getFullYear() - 1, t.getMonth(), t.getDate() + 1), to: t };
  }
}

export function daysIn(w: Window) {
  return Math.round((w.to.getTime() - w.from.getTime()) / DAY) + 1;
}

/** The same number of days, right before this window. */
export function priorWindow(w: Window): Window {
  const n = daysIn(w);
  return { from: addDays(w.from, -n), to: addDays(w.from, -1) };
}

export function dayRange(w: Window) {
  return Array.from({ length: daysIn(w) }, (_, i) => addDays(w.from, i));
}

const short = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
export const dayLabel = short;

export function windowLabel(w: Window) {
  const sameYear = w.from.getFullYear() === w.to.getFullYear();
  const yr = (d: Date) => (sameYear && d.getFullYear() === new Date().getFullYear() ? '' : `, ${d.getFullYear()}`);
  if (daysIn(w) === 1) return short(w.to) + yr(w.to);
  return `${short(w.from)}${sameYear ? '' : yr(w.from)} to ${short(w.to)}${yr(w.to)}`;
}

const inWindow = (t: number, w: Window) => t >= w.from.getTime() && t < addDays(w.to, 1).getTime();

/* ---------- Charts over long ranges ---------- */

export interface Point {
  label: string;
  value: number;
}

/**
 * Turn one value per day into chart points. Up to 92 days stays daily, longer
 * ranges group by week, and anything past 400 days groups by month.
 * `sum` adds the days in each group (counts); `last` keeps the group's last day (totals).
 */
export function toPoints(days: Date[], values: number[], mode: 'sum' | 'last'): Point[] {
  if (days.length <= 92) return days.map((d, i) => ({ label: short(d), value: values[i] }));
  const monthly = days.length > 400;
  const groups = new Map<string, { label: string; values: number[] }>();
  days.forEach((d, i) => {
    const start = monthly ? new Date(d.getFullYear(), d.getMonth(), 1) : addDays(d, -((d.getDay() + 6) % 7));
    const key = start.toDateString();
    if (!groups.has(key)) groups.set(key, { label: monthly ? start.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }) : short(start), values: [] });
    groups.get(key)!.values.push(values[i]);
  });
  return [...groups.values()].map((g) => ({ label: g.label, value: mode === 'sum' ? g.values.reduce((a, b) => a + b, 0) : g.values[g.values.length - 1] }));
}

export function grain(w: Window) {
  const n = daysIn(w);
  return n <= 92 ? 'per day' : n <= 400 ? 'per week' : 'per month';
}

/* ---------- Sample series (until the app is connected) ---------- */

/** A stable 0..1 value for a seed and a calendar day, so numbers don't change between loads or ranges. */
function noise(seed: string, d: Date) {
  let h = 2166136261;
  for (const ch of seed + d.toDateString()) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  h ^= h >>> 13;
  h = Math.imul(h, 0x5bd1e995);
  return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
}

const daysAgo = (d: Date) => Math.round((today().getTime() - d.getTime()) / DAY);

/** App-wide member numbers. Sample data until the app is connected. */
export function memberSeries(state: State, w: Window) {
  const now = 4860 + state.accounts.filter((a) => a.kind === 'business').length * 12;
  const days = dayRange(w);
  // Smooth growth toward today's count: about 8 new members a day now, fewer further back.
  const curve = (d: Date) => now * Math.exp(-daysAgo(d) / 600);
  const total = days.map((d) => Math.round(curve(d) + (daysAgo(d) ? (noise('m', d) - 0.5) * 12 : 0)));
  const active = days.map((d, i) => Math.round(total[i] * (0.38 + 0.05 * noise('a', d))));
  const activities = days.map((d, i) => {
    const wk = d.getDay() === 0 || d.getDay() === 6 ? 1.35 : 1;
    return Math.round(total[i] * 0.085 * wk * (0.88 + 0.24 * noise('act', d)));
  });
  const newMembers = days.map((d) => Math.max(0, Math.round(curve(d) / 600 + (noise('n', d) - 0.5) * 6)));
  return { days, total, active, activities, newMembers };
}

/** A club's member count per day, growing toward today's number. Sample data. */
export function clubMemberSeries(clubId: string, members: number, w: Window) {
  return dayRange(w).map((d) => Math.max(1, Math.round(members - members * 0.0016 * daysAgo(d) + (daysAgo(d) ? (noise(clubId, d) - 0.5) * 3 : 0))));
}

/* ---------- Portal data ---------- */

/** Featured-event views per day across these events, within the window. */
export function viewsPerDay(events: AppEvent[], w: Window) {
  const days = dayRange(w);
  const idx = new Map(days.map((d, i) => [d.toDateString(), i]));
  const out = new Array(days.length).fill(0);
  for (const e of events) {
    if (!e.stats || !e.featureStart) continue;
    const s = new Date(e.featureStart);
    e.stats.viewsByDay.forEach((v, i) => {
      const k = idx.get(new Date(s.getFullYear(), s.getMonth(), s.getDate() + i).toDateString());
      if (k !== undefined) out[k] += v;
    });
  }
  return out;
}

/** Featured events whose run overlaps the window. */
export function featuredInRange(events: AppEvent[], w: Window) {
  return events.filter((e) => {
    if (e.kind !== 'featured' || !e.stats || !e.featureStart) return false;
    const s = new Date(e.featureStart).getTime();
    const end = s + e.stats.viewsByDay.length * DAY;
    return s < addDays(w.to, 1).getTime() && end >= w.from.getTime();
  });
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
    const wt = e.stats.rsvps || 1;
    for (const [k, v] of e.stats[key]) {
      m.set(k, (m.get(k) ?? 0) + v * wt);
      total += v * wt;
    }
  }
  if (!total) return [];
  const rows = [...m.entries()].filter(([k]) => k !== 'Other').sort((a, b) => b[1] - a[1]);
  const kept = rows.slice(0, top).map(([k, v]) => [k, Math.round((v / total) * 100)] as [string, number]);
  const rest = 100 - kept.reduce((s, [, v]) => s + v, 0);
  if (rest > 0) kept.push(['Other', rest]);
  return kept;
}

export function paidInRange(invoices: Invoice[], w: Window) {
  return invoices.filter((i) => i.status === 'Paid' && inWindow(new Date(i.date).getTime(), w) && new Date(i.date).getTime() <= Date.now()).reduce((s, i) => s + i.amount, 0);
}

export const countInRange = (dates: (string | undefined)[], w: Window) => dates.filter((d) => d && inWindow(new Date(d).getTime(), w)).length;

/** Paid revenue per calendar month across the window, at least 3 months. */
export function revenueByMonth(invoices: Invoice[], w: Window) {
  const start = new Date(w.from.getFullYear(), w.from.getMonth(), 1);
  const end = new Date(w.to.getFullYear(), w.to.getMonth(), 1);
  let months = (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth() + 1;
  const first = months < 3 ? new Date(end.getFullYear(), end.getMonth() - 2, 1) : start;
  months = Math.max(3, months);
  return Array.from({ length: months }, (_, i) => {
    const d = new Date(first.getFullYear(), first.getMonth() + i, 1);
    const value = invoices
      .filter((inv) => inv.status === 'Paid')
      .filter((inv) => {
        const x = new Date(inv.date);
        return x.getFullYear() === d.getFullYear() && x.getMonth() === d.getMonth();
      })
      .reduce((s, inv) => s + inv.amount, 0);
    return { label: d.toLocaleDateString('en-US', months > 12 ? { month: 'short', year: '2-digit' } : { month: 'short' }), value };
  });
}
