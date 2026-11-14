import { useState } from 'react';
import { HBars, LineChart } from '../components/charts';
import { Icon } from '../components/Icon';
import { Button, Card, Empty, LinkButton, Modal, Notice, PageHead, Stat, StatusBadge } from '../components/ui';
import { useAccount } from '../store';
import { go } from '../router';
import { fmtLong, fmtShort, fmtTime, fmtWhen, money, num, pct, pkgInfo } from '../lib';
import type { AppEvent } from '../types';

type Tab = 'upcoming' | 'drafts' | 'past';

export function Events({ query }: { query: URLSearchParams }) {
  const { events, club, can } = useAccount();
  const [tab, setTab] = useState<Tab>('upcoming');
  const [kind, setKind] = useState<'all' | 'club' | 'featured'>((query.get('kind') as 'featured') || 'all');
  const now = Date.now();

  const inTab = (e: AppEvent) => {
    if (tab === 'drafts') return e.status === 'draft' || e.status === 'review';
    if (tab === 'past') return e.status === 'ended' || e.status === 'canceled' || (new Date(e.start).getTime() < now && e.status !== 'draft');
    return (e.status === 'live' || e.status === 'scheduled') && new Date(e.start).getTime() >= now;
  };
  const list = events
    .filter((e) => (kind === 'all' ? true : e.kind === kind))
    .filter(inTab)
    .sort((a, b) => (tab === 'past' ? +new Date(b.start) - +new Date(a.start) : +new Date(a.start) - +new Date(b.start)));
  const count = (t: Tab) =>
    events.filter((e) => (kind === 'all' ? true : e.kind === kind)).filter((e) => {
      if (t === 'drafts') return e.status === 'draft' || e.status === 'review';
      if (t === 'past') return e.status === 'ended' || e.status === 'canceled' || (new Date(e.start).getTime() < now && e.status !== 'draft');
      return (e.status === 'live' || e.status === 'scheduled') && new Date(e.start).getTime() >= now;
    }).length;

  return (
    <>
      <PageHead
        title="Events"
        sub={club ? 'Club events your members can join, and events you’ve featured.' : 'Events you’ve featured and how they did.'}
        action={
          <div className="row-gap">
            {club && can('create') && (
              <LinkButton href="#/club/new" kind="outline" icon="plus">
                Create club event
              </LinkButton>
            )}
            {can('feature') && (
              <LinkButton href="#/feature" icon="star">
                Feature an event
              </LinkButton>
            )}
          </div>
        }
      />

      <div className="toolbar">
        <div className="seg" role="tablist" aria-label="Event timing">
          {(['upcoming', 'drafts', 'past'] as Tab[]).map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} className={'seg__btn' + (tab === t ? ' seg__btn--on' : '')} onClick={() => setTab(t)}>
              {t === 'upcoming' ? 'Upcoming' : t === 'drafts' ? 'Drafts and review' : 'Past'}
              <span className="seg__count">{count(t)}</span>
            </button>
          ))}
        </div>
        {club && (
          <div className="chips-inline" role="radiogroup" aria-label="Event type">
            {(['all', 'club', 'featured'] as const).map((k) => (
              <button key={k} role="radio" aria-checked={kind === k} className={'chip chip--sm' + (kind === k ? ' chip--on' : '')} onClick={() => setKind(k)}>
                {k === 'all' ? 'All' : k === 'club' ? 'Club' : 'Featured'}
              </button>
            ))}
          </div>
        )}
      </div>

      <Card pad={false}>
        {list.length ? (
          <div className="table">
            {list.map((e) => (
              <a className="table__row table__row--link" href={e.status === 'draft' ? `#/feature/${e.id}` : `#/events/${e.id}`} key={e.id}>
                <span className="date-block" aria-hidden="true">
                  <b>{new Date(e.start).toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()}</b>
                  <span>{new Date(e.start).getDate()}</span>
                </span>
                <span className="grow">
                  <span className="row-title">{e.title}</span>
                  <span className="row-meta">
                    {fmtWhen(e.start)} · {e.place}
                  </span>
                </span>
                <span className="badge-pair">
                  {e.kind === 'featured' ? <span className="tag tag--gold">Featured</span> : <span className="tag tag--olive">Club</span>}
                  <StatusBadge status={e.status} />
                </span>
                <span className="num">{e.status === 'draft' || e.status === 'review' ? '' : `${e.going} going`}</span>
                <Icon name="chevron" size={18} color="var(--ink-faint)" />
              </a>
            ))}
          </div>
        ) : (
          <Empty icon="calendar" title={tab === 'upcoming' ? 'No upcoming events' : tab === 'drafts' ? 'No drafts' : 'No past events yet'}>
            {tab === 'upcoming' ? 'Feature an event or create a club event to see it here.' : 'They’ll show up here.'}
          </Empty>
        )}
      </Card>
    </>
  );
}

export function EventDetail({ id }: { id: string }) {
  const { events, update, toast, can, log, account } = useAccount();
  const e = events.find((x) => x.id === id);
  const [confirm, setConfirm] = useState<'cancel' | 'delete' | null>(null);

  if (!e) {
    return (
      <>
        <PageHead back={{ href: '#/events', label: 'Events' }} title="Event not found" />
        <Empty icon="calendar" title="This event isn’t on this account">
          It may belong to another account. Switch accounts in the sidebar, or go back to Events.
        </Empty>
      </>
    );
  }

  const pkg = pkgInfo(e.pkg);
  const set = (fn: (x: AppEvent) => void) =>
    update((d) => {
      const x = d.events.find((y) => y.id === e.id);
      if (x) fn(x);
    });

  const approve = () => {
    set((x) => {
      x.status = 'live';
      x.featureStart = new Date().toISOString();
      x.stats = { viewsByDay: [420], taps: 38, rsvps: 4, checkins: 0, hoods: (x.hoods ?? ['Other']).slice(0, 3).map((h, i) => [h, [46, 32, 22][i] ?? 10]) as [string, number][], interests: (x.interests ?? ['Other']).slice(0, 3).map((h, i) => [h, [58, 27, 15][i] ?? 10]) as [string, number][] };
      x.going = 4;
    });
    toast(`${e.title} is live`);
  };

  const withdraw = () => {
    set((x) => {
      x.status = 'draft';
    });
    update((d) => log(d, `withdrew ${e.title} from review`));
    toast('Withdrawn. It’s back in your drafts.');
  };

  const doCancel = () => {
    set((x) => {
      x.status = 'canceled';
    });
    update((d) => log(d, `canceled ${e.title}`));
    toast(`${e.title} canceled. Everyone going was notified.`);
    setConfirm(null);
  };

  const doDelete = () => {
    update((d) => {
      d.events = d.events.filter((y) => y.id !== e.id);
      log(d, `deleted the draft ${e.title}`);
    });
    toast('Draft deleted');
    go('/events');
  };

  const head = (
    <PageHead
      back={{ href: '#/events', label: 'Events' }}
      title={e.title}
      badge={<StatusBadge status={e.status} />}
      sub={
        <>
          {fmtWhen(e.start)} · {e.place}
          {e.kind === 'featured' && pkg && e.featureStart && ` · Featured on ${pkg.name}, ${fmtShort(e.featureStart)} to ${fmtShort(daysFromIso(e.featureStart, pkg.days))}`}
          {e.kind === 'featured' && e.pkg === 'house' && e.featureStart && ` · Featured free on the house account since ${fmtShort(e.featureStart)}`}
        </>
      }
      action={
        <div className="row-gap">
          {e.kind === 'club' && e.status === 'scheduled' && can('create') && (
            <>
              <LinkButton href={`#/club/edit/${e.id}`} kind="outline" icon="edit">
                Edit
              </LinkButton>
              <Button kind="secondary" onClick={() => setConfirm('cancel')}>
                Cancel event
              </Button>
            </>
          )}
          {e.kind === 'featured' && e.status === 'review' && can('feature') && (
            <Button kind="secondary" onClick={withdraw}>
              Withdraw
            </Button>
          )}
        </div>
      }
    />
  );

  return (
    <>
      {head}

      {e.kind === 'featured' && e.status === 'review' && (
        <>
          <Notice icon="sparkle" tone="gold">
            <b>In review.</b> We check every featured event for guideline fit, accurate details and a real business, usually within 1 business day.{' '}
            {account.kind === 'house' ? 'Featured events are free on the house account.' : 'You’re only charged once it’s approved.'}
          </Notice>
          <div className="demo">
            <span>Prototype only: skip the wait and see what an approved event looks like.</span>
            <Button size="sm" kind="outline" onClick={approve}>
              Approve now
            </Button>
          </div>
        </>
      )}

      {e.kind === 'featured' && e.stats && (can('data') ? <Results e={e} /> : <Notice>Your role can’t see event data. Ask an owner or admin if you need it.</Notice>)}

      {e.kind === 'featured' && !e.stats && <FeaturedSummary e={e} />}

      {e.kind === 'club' && <ClubSummary e={e} />}

      {e.status === 'draft' && (
        <div className="row-gap">
          <LinkButton href={`#/feature/${e.id}`}>Finish setup</LinkButton>
          <Button kind="ghost" icon="trash" onClick={() => setConfirm('delete')}>
            Delete draft
          </Button>
        </div>
      )}

      {confirm === 'cancel' && (
        <Modal
          title={`Cancel ${e.title}?`}
          onClose={() => setConfirm(null)}
          footer={
            <>
              <Button kind="secondary" onClick={() => setConfirm(null)}>
                Keep it
              </Button>
              <Button kind="danger" onClick={doCancel}>
                Cancel event
              </Button>
            </>
          }
        >
          <p>
            {e.going} {e.going === 1 ? 'person is' : 'people are'} going. They’ll get a notification, and the ride chat will close after a short note from you.
          </p>
        </Modal>
      )}
      {confirm === 'delete' && (
        <Modal
          title="Delete this draft?"
          onClose={() => setConfirm(null)}
          footer={
            <>
              <Button kind="secondary" onClick={() => setConfirm(null)}>
                Keep it
              </Button>
              <Button kind="danger" onClick={doDelete}>
                Delete draft
              </Button>
            </>
          }
        >
          <p>{e.title} hasn’t been submitted, so nothing is charged. This can’t be undone.</p>
        </Modal>
      )}
    </>
  );
}

function daysFromIso(iso: string, days: number) {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function Results({ e }: { e: AppEvent }) {
  const s = e.stats!;
  const views = s.viewsByDay.reduce((a, b) => a + b, 0);
  const today = s.viewsByDay[s.viewsByDay.length - 1];
  const pkg = pkgInfo(e.pkg);
  const cost = e.pkg === 'partner' ? 75 : e.pkg === 'house' ? 0 : pkg?.price ?? 0;
  const days = s.viewsByDay.map((v, i) => ({ label: fmtShort(daysFromIso(e.featureStart!, i)), value: v }));
  const ended = e.status === 'ended';
  return (
    <>
      <div className="stats">
        <Stat label="Views" value={num(views)} note={ended ? `Over ${s.viewsByDay.length} days` : `${num(today)} today`} />
        <Stat label="Taps" value={num(s.taps)} note={`${pct(s.taps, views)}% of views`} />
        <Stat label="RSVPs" value={num(s.rsvps)} note={`${pct(s.rsvps, s.taps)}% of taps`} />
        {cost ? (
          <Stat label="Cost per RSVP" value={s.rsvps ? money(Math.round((cost / s.rsvps) * 100) / 100) : '–'} note={e.pkg === 'partner' ? 'About $75 per event on Partner' : `${pkg?.name} · ${money(cost)}`} />
        ) : (
          <Stat label="Check-ins" value={s.checkins ? num(s.checkins) : '–'} note={s.checkins ? `${pct(s.checkins, s.rsvps)}% of RSVPs` : `Counted at the event on ${fmtShort(e.start)}`} tone="muted" />
        )}
      </div>
      <div className="cols cols--even">
        <Card title="Views per day" sub="Since the feature went live" className="cols__main">
          <LineChart data={days} label="Views per day" lastLabel={ended ? undefined : `${num(today)} today`} />
        </Card>
        <Card title="From view to RSVP" className="cols__side">
          <div className="funnel">
            {[
              ['Views', views],
              ['Taps', s.taps],
              ['RSVPs', s.rsvps],
            ].map(([k, v]) => (
              <div className="funnel__row" key={k as string}>
                <span className="funnel__label">{k}</span>
                <span className="hbars__track">
                  <span className="hbars__fill" style={{ width: `${Math.max(2, ((v as number) / views) * 100)}%` }} />
                </span>
                <span className="funnel__value">{num(v as number)}</span>
              </div>
            ))}
            <div className="funnel__row">
              <span className="funnel__label">Check-ins</span>
              <span className="row-meta funnel__note">{s.checkins ? `${num(s.checkins)} checked in, ${pct(s.checkins, s.rsvps)}% of RSVPs` : `Counted at the event on ${fmtDayShort(e.start)}`}</span>
            </div>
          </div>
        </Card>
      </div>
      <div className="cols cols--half">
        <Card title="Where RSVPs live">
          <HBars rows={s.hoods} />
        </Card>
        <Card title="What they’re into">
          <HBars rows={s.interests} />
        </Card>
      </div>
      <p className="fineprint">All numbers are counts. Members’ names and profiles are never shared unless they choose to at check-in.</p>
    </>
  );
}

const fmtDayShort = (iso: string) => new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).replace(',', '');

function FeaturedSummary({ e }: { e: AppEvent }) {
  const pkg = pkgInfo(e.pkg);
  return (
    <div className="cols">
      <Card title="Details" className="cols__main">
        <dl className="dl">
          <dt>When</dt>
          <dd>{fmtLong(e.start)} · {fmtTime(e.start)}</dd>
          <dt>Where</dt>
          <dd>{e.place}</dd>
          <dt>What to expect</dt>
          <dd>{e.details || <span className="muted">Not added yet</span>}</dd>
          <dt>Neighborhoods</dt>
          <dd>{e.hoods?.join(', ') || '–'}</dd>
          <dt>Interests</dt>
          <dd>{e.interests?.join(', ') || '–'}</dd>
          <dt>Package</dt>
          <dd>{e.pkg === 'house' ? 'House account · free' : pkg ? `${pkg.name} · ${pkg.runs} · ${pkg.priceLabel}` : '–'}</dd>
        </dl>
      </Card>
      <div className="cols__side">
        <Card title="Results">
          <p className="muted">Views, taps, RSVPs and check-ins appear here once the event is live.</p>
        </Card>
      </div>
    </div>
  );
}

function ClubSummary({ e }: { e: AppEvent }) {
  const ended = e.status === 'ended';
  const checked = ended ? Math.round(e.going * 0.83) : 0;
  return (
    <>
      <div className="stats">
        <Stat label={ended ? 'Went' : 'Going'} value={num(e.going)} note={e.capacity ? `${pct(e.going, e.capacity)}% of ${e.capacity} spots` : 'No cap'} tone="muted" />
        <Stat label="Checked in" value={ended ? num(checked) : '–'} note={ended ? `${pct(checked, e.going)}% of RSVPs` : 'Counted on the day'} tone="muted" />
        <Stat label="Distance" value={e.distance || '–'} note={e.pace} tone="muted" />
        <Stat label="Ride leader" value={<span className="stat__small">{e.leaderName ?? 'Not set'}</span>} note={e.fromSuggestionId ? 'Suggested by a member' : 'Club event'} tone="muted" />
      </div>
      <div className="cols">
        <Card title="Details" className="cols__main">
          <dl className="dl">
            <dt>When</dt>
            <dd>{fmtLong(e.start)} · {fmtTime(e.start)}</dd>
            <dt>Meet at</dt>
            <dd>{e.place}</dd>
            <dt>Activity</dt>
            <dd>{e.activity}</dd>
            <dt>Route</dt>
            <dd>{e.route || '–'}</dd>
            <dt>Pace</dt>
            <dd>
              {e.pace}
              {e.noDrop ? ', no-drop' : ''}
            </dd>
            <dt>What to expect</dt>
            <dd>{e.details || '–'}</dd>
          </dl>
        </Card>
        <div className="cols__side">
          <Card title="In the app">
            <p className="muted">Members see this as a Club event from your club. Going members get the ride chat, which closes 48 hours after the event.</p>
          </Card>
          {e.status === 'canceled' && (
            <Notice icon="x" tone="muted">
              This event was canceled. Everyone going was notified.
            </Notice>
          )}
        </div>
      </div>
    </>
  );
}
