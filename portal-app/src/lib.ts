import type { EditableRole, PackageId, Perm, PermGrid } from './types';

export const NEIGHBORHOODS = [
  'Fort Greene',
  'Clinton Hill',
  'Prospect Heights',
  'Boerum Hill',
  'Park Slope',
  'Williamsburg',
  'Bed-Stuy',
  'Greenpoint',
];

export const INTERESTS = ['Yoga', 'Pilates', 'Running', 'Cycling', 'Walking', 'Strength'];

export const ACTIVITIES = ['Ride', 'Run', 'Walk', 'Yoga', 'Pilates', 'Strength'];

export const PACES = ['Social pace', 'Easy pace', 'Steady pace', 'Fast pace'];

export const CATEGORIES = [
  'Yoga or Pilates studio',
  'Gym or fitness studio',
  'Run or bike shop',
  'Cafe or healthy food',
  'Wellness services',
  'Community group',
  'Other',
];

export interface PackageInfo {
  id: PackageId;
  name: string;
  price: number;
  priceLabel: string;
  days: number;
  runs: string;
  where: string;
}

export const PACKAGES: PackageInfo[] = [
  { id: 'spotlight', name: 'Spotlight', price: 49, priceLabel: '$49', days: 3, runs: '3 days', where: 'Top slot on the Events tab' },
  { id: 'boost', name: 'Boost', price: 129, priceLabel: '$129', days: 7, runs: '7 days', where: 'Events plus a card in Home feeds' },
  { id: 'partner', name: 'Partner', price: 0, priceLabel: 'Included', days: 7, runs: '7 days', where: 'Events, Home and the Community hub' },
];

export const PARTNER_MONTHLY = 299;
export const PARTNER_EVENTS_PER_MONTH = 4;

export const pkgInfo = (id?: PackageId) => PACKAGES.find((p) => p.id === id);

export const EDITABLE_ROLES: EditableRole[] = ['Admin', 'Organizer', 'Ride leader'];

export const PERM_ROWS: { id: Perm; label: string }[] = [
  { id: 'create', label: 'Create rides and events' },
  { id: 'approve', label: 'Approve member suggestions' },
  { id: 'announce', label: 'Post announcements' },
  { id: 'moderate', label: 'Moderate chats and review reports' },
  { id: 'editClub', label: 'Edit the club page' },
  { id: 'feature', label: 'Feature events' },
  { id: 'data', label: 'See event data' },
  { id: 'team', label: 'Manage the team' },
  { id: 'billing', label: 'Manage billing' },
];

export function defaultPerms(): PermGrid {
  const row = (a: boolean, o: boolean, r: boolean) => ({ Admin: a, Organizer: o, 'Ride leader': r });
  return {
    create: row(true, true, false),
    approve: row(true, true, false),
    announce: row(true, true, false),
    moderate: row(true, true, false),
    editClub: row(true, false, false),
    feature: row(true, false, false),
    data: row(true, true, false),
    team: row(true, false, false),
    billing: row(false, false, false),
  };
}

export const AVATAR_COLORS = ['#5E7233', '#6E8046', '#A65F2E', '#5E7A78', '#8A5C46', '#7D6224', '#31391B'];

export function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function colorFor(seed: string) {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export const uid = (prefix: string) => prefix + '_' + Math.random().toString(36).slice(2, 9);

/** A date offset from today at a given local time, as an ISO string. */
export function daysFromToday(offset: number, time = '09:00') {
  const [h, m] = time.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  d.setDate(d.getDate() + offset);
  return d.toISOString();
}

const dayFmt = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
const shortFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
const timeFmt = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' });
const longFmt = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

export const fmtDay = (iso: string) => dayFmt.format(new Date(iso)).replace(',', '');
export const fmtShort = (iso: string) => shortFmt.format(new Date(iso));
export const fmtTime = (iso: string) => timeFmt.format(new Date(iso));
export const fmtWhen = (iso: string) => `${fmtDay(iso)} · ${fmtTime(iso)}`;
export const fmtLong = (iso: string) => longFmt.format(new Date(iso));

export function fmtAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24 && new Date(iso).getDate() === new Date().getDate()) return `Today ${fmtTime(iso)}`;
  if (hrs < 24 * 6) return `${dayFmt.format(new Date(iso)).split(',')[0]} ${fmtTime(iso)}`;
  return fmtShort(iso);
}

export const num = (n: number) => n.toLocaleString('en-US');
export const money = (n: number) => (Number.isInteger(n) ? `$${num(n)}` : `$${n.toFixed(2)}`);
export const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);

/** Combine a yyyy-mm-dd date and hh:mm time into an ISO string in local time. */
export function toIso(date: string, time: string) {
  const [y, mo, d] = date.split('-').map(Number);
  const [h, mi] = time.split(':').map(Number);
  return new Date(y, mo - 1, d, h, mi).toISOString();
}

export function dateInput(iso: string) {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function timeInput(iso: string) {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function estimateReach(hoods: number, interests: number) {
  return Math.round((hoods * 820 + interests * 340) / 10) * 10;
}
