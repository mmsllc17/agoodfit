import { useEffect, useState } from 'react';
import { Icon, type IconName } from './Icon';
import { Avatar } from './ui';
import { useAccount, useStore } from '../store';
import { go } from '../router';

interface Item {
  href: string;
  label: string;
  icon: IconName;
  count?: number;
  match: string[];
}

export function Sidebar({ path }: { path: string }) {
  const { state, update } = useStore();
  const { account, club, suggestions, me } = useAccount();
  const [open, setOpen] = useState(false);
  const waiting = suggestions.filter((s) => s.status === 'new').length;

  useEffect(() => setOpen(false), [path]);

  const items: Item[] = [
    { href: '#/overview', label: 'Overview', icon: 'overview', match: ['/overview'] },
    { href: '#/events', label: 'Events', icon: 'calendar', match: ['/events'] },
    { href: '#/feature', label: 'Feature an event', icon: 'star', match: ['/feature'] },
    { href: '#/club', label: 'Club', icon: 'flag', match: ['/club'] },
    ...(club ? [{ href: '#/suggestions', label: 'Suggested rides', icon: 'inbox' as IconName, count: waiting, match: ['/suggestions'] }] : []),
    { href: '#/team', label: 'Team', icon: 'team', match: ['/team'] },
    { href: '#/billing', label: 'Billing', icon: 'card', match: ['/billing'] },
    { href: '#/settings', label: 'Settings', icon: 'settings', match: ['/settings'] },
  ];

  const active = (it: Item) => it.match.some((m) => path === m || path.startsWith(m + '/'));

  const switchTo = (id: string) => {
    update((d) => {
      d.accountId = id;
    });
    setOpen(false);
    go('/overview');
  };

  return (
    <aside className={'sidebar' + (open ? ' sidebar--open' : '')}>
      <div className="sidebar__top">
        <a href="#/overview" className="brand" onClick={() => setOpen(false)}>
          <span className="brand__name">A Good Fit</span>
          <span className="brand__sub">for Business</span>
        </a>
        <button type="button" className="icon-btn sidebar__menu" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} onClick={() => setOpen(!open)}>
          <Icon name={open ? 'x' : 'menu'} size={20} />
        </button>
      </div>

      <div className="sidebar__body">
        <nav aria-label="Portal" className="nav">
          {items.map((it) => (
            <a key={it.href} href={it.href} className={'nav__item' + (active(it) ? ' nav__item--on' : '')} aria-current={active(it) ? 'page' : undefined} onClick={() => setOpen(false)}>
              <Icon name={it.icon} />
              <span>{it.label}</span>
              {!!it.count && <span className="nav__count">{it.count}</span>}
            </a>
          ))}
        </nav>

        <div className="sidebar__spacer" />

        <div className="accounts">
          <div className="accounts__label">Accounts</div>
          {state.accounts.map((a) => (
            <button type="button" key={a.id} className={'acct' + (a.id === account.id ? ' acct--on' : '')} aria-current={a.id === account.id} onClick={() => switchTo(a.id)}>
              <Avatar initials={a.initials} color={a.color} size={34} square />
              <span className="acct__text">
                <span className="acct__name">{a.name}</span>
                <span className={'acct__meta' + (a.verified && a.kind === 'business' ? ' acct__meta--ok' : '')}>
                  {a.kind === 'house' ? 'Parent company · House account' : a.verified ? `✓ Verified · ${a.plan} plan` : 'Verification pending'}
                </span>
              </span>
            </button>
          ))}
          <a className="accounts__add" href="#/signup" onClick={() => setOpen(false)}>
            <Icon name="plus" size={16} /> Add a business
          </a>
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
