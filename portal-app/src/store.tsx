import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { seed, SEED_VERSION } from './seed';
import type { Account, Club, Perm, Role, State, TeamMember } from './types';
import { colorFor, initialsOf, uid } from './lib';

const KEY = 'agf.portal';

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as State;
      if (s.version === SEED_VERSION) return s;
    }
  } catch {
    /* storage unavailable: fall back to fresh demo data */
  }
  return seed();
}

export type Draft = State;
type Mutator = (d: Draft) => void;

interface Toast {
  id: number;
  text: string;
}

interface Ctx {
  state: State;
  update: (fn: Mutator) => void;
  toast: (text: string) => void;
  toasts: Toast[];
  reset: () => void;
}

const StoreCtx = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(load);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const n = useRef(0);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state]);

  const update = useCallback((fn: Mutator) => {
    setState((prev) => {
      const next = structuredClone(prev);
      fn(next);
      return next;
    });
  }, []);

  const toast = useCallback((text: string) => {
    const id = ++n.current;
    setToasts((t) => [...t, { id, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  const reset = useCallback(() => setState(seed()), []);

  const value = useMemo(() => ({ state, update, toast, toasts, reset }), [state, update, toast, toasts, reset]);
  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error('useStore outside StoreProvider');
  return ctx;
}

/** Everything a page needs about the current account. */
export function useAccount() {
  const { state, update: write, toast } = useStore();
  const signedInAs = state.accounts.find((a) => a.id === state.accountId) ?? state.accounts[0];
  const viewing = signedInAs.kind === 'house' && state.viewAs ? state.accounts.find((a) => a.id === state.viewAs) : undefined;
  const readOnly = !!viewing;
  const account = viewing ?? signedInAs;
  /** In "View as partner", nothing can change. */
  const update = (fn: Mutator) => {
    if (readOnly) {
      toast('Read-only. You’re viewing this portal as GoodCo.');
      return;
    }
    write(fn);
  };
  const club = state.clubs.find((c) => c.accountId === account.id);
  const team = state.team.filter((t) => t.accountId === account.id);
  const me = team.find((t) => t.id === account.meId) as TeamMember;
  const grid = state.perms[account.id];
  const can = (p: Perm) => !readOnly && !!me && (me.role === 'Owner' || !!grid?.[p]?.[me.role as Exclude<Role, 'Owner'>]);
  const events = state.events.filter((e) => e.accountId === account.id);
  const suggestions = state.suggestions.filter((s) => s.accountId === account.id);
  const owner = team.find((t) => t.role === 'Owner' && t.id !== me?.id);

  /** Add a line to this account's activity log from the signed-in person. */
  const log = (d: Draft, text: string) => {
    const who = d.team.find((t) => t.id === account.meId);
    d.activity.unshift({
      id: uid('a'),
      accountId: account.id,
      who: who ? who.name.split(' ')[0] : 'You',
      initials: who?.initials ?? 'ME',
      color: who?.color ?? '#6E8046',
      text,
      at: new Date().toISOString(),
    });
  };

  const isAdmin = account.kind === 'house';

  return { state, update, toast, account, club, team, me, can, events, suggestions, owner, log, isAdmin, readOnly, signedInAs };
}

export function createAccount(
  d: Draft,
  input: { name: string; person: string; category: string; address: string; web: string; email: string },
) {
  const id = uid('acct');
  const meId = uid('tm');
  const acct: Account = {
    id,
    name: input.name,
    initials: initialsOf(input.name).slice(0, 2),
    color: colorFor(input.name),
    kind: 'business',
    plan: 'Pay as you go',
    verified: false,
    category: input.category,
    address: input.address,
    web: input.web,
    email: input.email,
    meId,
    joinedAt: new Date().toISOString(),
    status: 'active',
  };
  d.accounts.push(acct);
  d.team.push({
    id: meId,
    accountId: id,
    name: input.person,
    initials: initialsOf(input.person),
    color: colorFor(input.person),
    sub: 'Created the account',
    role: 'Owner',
  });
  d.perms[id] = structuredClone(d.perms.lumen ?? Object.values(d.perms)[0]);
  d.notif[id] = { review: true, suggestions: true, weekly: true, billing: true };
  d.accountId = id;
  d.signedIn = true;
  return acct;
}

export function newClub(accountId: string, patch: Partial<Club>): Club {
  return {
    accountId,
    name: '',
    activity: 'Ride',
    description: '',
    meetingSpot: '',
    announcement: '',
    goalLabel: 'Club miles this month',
    goalTarget: 500,
    goalCurrent: 0,
    members: 1,
    ...patch,
  };
}

/* ---------- A Good Fit admin actions (house account only) ---------- */

const AGF = { who: 'A Good Fit', initials: 'GF', color: '#5E7233' };

/** Add a line to any account's activity log. */
export function addActivity(d: Draft, accountId: string, text: string, by: { who: string; initials: string; color: string } = AGF) {
  d.activity.unshift({ id: uid('a'), accountId, ...by, text, at: new Date().toISOString() });
}

export function approveEvent(d: Draft, id: string) {
  const x = d.events.find((e) => e.id === id);
  if (!x) return;
  x.status = 'live';
  x.reviewNote = undefined;
  x.featureStart = new Date().toISOString();
  x.going = 4;
  x.stats = {
    viewsByDay: [420],
    taps: 38,
    rsvps: 4,
    checkins: 0,
    hoods: (x.hoods ?? ['Other']).slice(0, 3).map((h, i) => [h, [46, 32, 22][i] ?? 10]) as [string, number][],
    interests: (x.interests ?? ['Other']).slice(0, 3).map((h, i) => [h, [58, 27, 15][i] ?? 10]) as [string, number][],
  };
  const pkgPrices: Record<string, number> = { spotlight: 49, boost: 129 };
  const price = x.pkg ? pkgPrices[x.pkg] : 0;
  if (price) d.invoices.push({ id: uid('in'), accountId: x.accountId, date: new Date().toISOString(), desc: `${x.pkg === 'boost' ? 'Boost' : 'Spotlight'} · ${x.title}`, amount: price, status: 'Paid' });
  addActivity(d, x.accountId, `approved ${x.title}. It’s live in the app.`);
}

export function sendBackEvent(d: Draft, id: string, note: string) {
  const x = d.events.find((e) => e.id === id);
  if (!x) return;
  x.status = 'draft';
  x.reviewNote = note;
  addActivity(d, x.accountId, `sent ${x.title} back for changes`);
}

export function verifyAccount(d: Draft, id: string) {
  const a = d.accounts.find((x) => x.id === id);
  if (!a) return;
  a.verified = true;
  addActivity(d, id, `verified ${a.name}`);
}

export function offboardAccount(d: Draft, id: string, reason: string, note: string) {
  const a = d.accounts.find((x) => x.id === id);
  if (!a || a.kind === 'house') return;
  a.status = 'offboarded';
  a.offboardedAt = new Date().toISOString();
  a.offboardReason = reason;
  a.offboardNote = note;
  for (const e of d.events) {
    if (e.accountId === id && ['live', 'review', 'scheduled'].includes(e.status)) {
      e.status = 'canceled';
      e.endedByOffboard = true;
    }
  }
  d.invoices = d.invoices.filter((i) => !(i.accountId === id && i.status === 'Upcoming'));
  a.renewsOn = undefined;
}

export function reactivateAccount(d: Draft, id: string) {
  const a = d.accounts.find((x) => x.id === id);
  if (!a) return;
  a.status = 'active';
  a.offboardedAt = undefined;
  a.offboardReason = undefined;
  a.offboardNote = undefined;
  if (a.plan === 'Partner') a.plan = 'Pay as you go';
  addActivity(d, id, `reactivated ${a.name}`);
}

/** Start or stop viewing a partner's portal as the house account. Logged on both sides. */
export function setViewAs(d: Draft, partnerId: string | undefined) {
  const house = d.accounts.find((a) => a.id === d.accountId);
  if (!house || house.kind !== 'house') return;
  if (partnerId) {
    const p = d.accounts.find((a) => a.id === partnerId);
    const me = d.team.find((t) => t.id === house.meId);
    if (!p) return;
    addActivity(d, p.id, 'viewed your portal for support (read-only)', { who: house.name.split(' ')[0], initials: house.initials, color: house.color });
    addActivity(d, house.id, `viewed ${p.name}’s portal for support`, { who: me ? me.name.split(' ')[0] : 'You', initials: me?.initials ?? 'ME', color: me?.color ?? '#6E8046' });
  }
  d.viewAs = partnerId;
}
