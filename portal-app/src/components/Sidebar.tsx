import { useEffect, useState } from 'react';
import { Icon, type IconName } from './Icon';
import { Avatar } from './ui';
import { useAccount } from '../store';
import { go } from '../router';

interface Item {
  href: string;
  label: string;
  icon: IconName;
  count?: number;
  match: string[];
}

export function Sidebar({ path }: { path: string }) {
  const { state, update, account, club, suggestions, me, isAdmin } = useAccount();
  const [open, setOpen] = useState(false);
  const waiting = suggestions.filter((s) => s.status === 'new').length;
  const partnerQueue = isAdmin
    ? state.accounts.filter((a) => a.kind === 'business' && a.status === 'active' && !a.verified).length +
      state.events.filter((e) => e.kind === 'featured' && e.status === 'review').length
    : 0;

  useEffect(() => setOpen(false), [path]);

  const items: Item[] = [
    { href: '#/overview', label: 'Overview', icon: 'overview', match: ['/overview'] },
    ...(isAdmin ? [{ href: '#/partners', label: 'Partners', icon: 'store' as IconName, count: partnerQueue, match: ['/partners'] }] : []),
    { href: '#/events', label: 'Events', icon: 'calendar', match: ['/events'] },
    { href: '#/feature', label: 'Feature an event', icon: 'star', match: ['/feature'] },
    { href: '#/club', label: 'Club', icon: 'flag', match: ['/club'] },
    ...(club ? [{ href: '#/suggestions', label: 'Suggested rides', icon: 'inbox' as IconName, count: waiting, match: ['/suggestions'] }] : []),
    { href: '#/team', label: 'Team', icon: 'team', match: ['/team'] },
    { href: '#/billing', label: 'Billing', icon: 'card', match: ['/billing'] },
    { href: '#/settings', label: 'Settings', icon: 'settings', match: ['/settings'] },
  ];

  const active = (it: Item) => it.match.some((m) => path === m || path.startsWith(m + '/'));

  return (
    <aside className={'sidebar' + (open ? ' sidebar--open' : '')}>
      <div className="sidebar__top">
        <a href="#/overview" className="brand">
          <span className="brand__name">A Good Fit</span>
          <span className="brand__sub">{isAdmin ? 'Admin' : 'for Business'}</span>
        </a>
        <button type="button" className="icon-btn sidebar__menu" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} onClick={() => setOpen(!open)}>
          <Icon name={open ? 'x' : 'menu'} size={20} />
        </button>
      </div>

      <div className="sidebar__body">
        <nav aria-label="Portal" className="nav">
          {items.map((it) => (
            <a key={it.href} href={it.href} className={'nav__item' + (active(it) ? ' nav__item--on' : '')} aria-current={active(it) ? 'page' : undefined}>
              <Icon name={it.icon} />
              <span>{it.label}</span>
              {!!it.count && <span className="nav__count">{it.count}</span>}
            </a>
          ))}
        </nav>

        <div className="sidebar__spacer" />

        <div className="acct acct--on acct--static">
          <Avatar initials={account.initials} color={account.color} size={34} square />
          <span className="acct__text">
            <span className="acct__name">{account.name}</span>
            <span className={'acct__meta' + (account.verified && account.kind === 'business' ? ' acct__meta--ok' : '')}>
              {isAdmin ? 'Parent company · Super admin' : account.verified ? `✓ Verified · ${account.plan === 'Partner' ? 'Partner plan' : 'Pay as you go'}` : 'Verification pending'}
            </span>
          </span>
        </div>

        <div className="whoami">
          <span>
            Signed in as <b>{me?.name ?? 'you'}</b>
          </span>
          <button
            type="button"
            className="link"
            onClick={() => {
              update((d) => {
                d.signedIn = false;
              });
              go('/login');
            }}
          >
            Sign out
          </button>
        </div>
      </div>
    </aside>
  );
}
