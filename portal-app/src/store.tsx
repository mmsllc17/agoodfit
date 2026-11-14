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
  const { state, update, toast } = useStore();
  const account = state.accounts.find((a) => a.id === state.accountId) ?? state.accounts[0];
  const club = state.clubs.find((c) => c.accountId === account.id);
  const team = state.team.filter((t) => t.accountId === account.id);
  const me = team.find((t) => t.id === account.meId) as TeamMember;
  const grid = state.perms[account.id];
  const can = (p: Perm) => !!me && (me.role === 'Owner' || !!grid?.[p]?.[me.role as Exclude<Role, 'Owner'>]);
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

  return { state, update, toast, account, club, team, me, can, events, suggestions, owner, log };
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
