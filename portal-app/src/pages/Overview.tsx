import { BarChart } from '../components/charts';
import { Avatar, Card, Empty, LinkButton, Meter, Notice, PageHead, Stat, StatusBadge } from '../components/ui';
import { useAccount } from '../store';
import { fmtShort, fmtWhen, num, PARTNER_EVENTS_PER_MONTH, pct, pkgInfo } from '../lib';
import type { AppEvent } from '../types';

const DAY = 86400000;

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

/** Spread each event's RSVPs over its featured days, then bucket into the last 6 weeks. */
function rsvpsByWeek(events: AppEvent[]) {
  const now = Date.now();
  const weeks = Array.from({ length: 6 }, (_, i) => ({ start: now - (6 - i) * 7 * DAY, value: 0 }));
  for (const e of events) {
    if (!e.stats || !e.featureStart) continue;
    const total = e.stats.viewsByDay.reduce((a, b) => a + b, 0) || 1;
    e.stats.viewsByDay.forEach((v, i) => {
      const t = new Date(e.featureStart!).getTime() + i * DAY;
      const w = weeks.findIndex((wk) => t >= wk.start && t < wk.start + 7 * DAY);
      if (w >= 0) weeks[w].value += (v / total) * e.stats!.rsvps;
    });
  }
  return weeks.map((w) => ({ label: fmtShort(new Date(w.start).toISOString()), value: Math.round(w.value) }));
}

function sumStats(events: AppEvent[], from: number, to: number) {
  const inWin = events.filter((e) => e.stats && e.featureStart && new Date(e.featureStart).getTime() >= from && new Date(e.featureStart).getTime() < to);
  return inWin.reduce(
    (acc, e) => ({
      views: acc.views + e.stats!.viewsByDay.reduce((a, b) => a + b, 0),
      taps: acc.taps + e.stats!.taps,
      rsvps: acc.rsvps + e.stats!.rsvps,
      checkins: acc.checkins + e.stats!.checkins,
    }),
    { views: 0, taps: 0, rsvps: 0, checkins: 0 },
  );
}

function change(now: number, before: number) {
  if (!before) return undefined;
  const c = Math.round(((now - before) / before) * 100);
  return `${c >= 0 ? '+' : ''}${c}% vs. prior 30 days`;
}

export function Overview() {
  const { account, club, me, events, suggestions, can, isAdmin, state } = useAccount();
  const pendingPartners = state.accounts.filter((a) => a.kind === 'business' && a.status === 'active' && !a.verified).length;
  const reviewQueue = state.events.filter((e) => e.kind === 'featured' && e.status === 'review').length;
  const activePartners = state.accounts.filter((a) => a.kind === 'business' && a.status === 'active').length;
  const featured = events.filter((e) => e.kind === 'featured');
  const now = Date.now();
  const cur = sumStats(featured, now - 30 * DAY, now + DAY);
  const prev = sumStats(featured, now - 60 * DAY, now - 30 * DAY);
  const waiting = suggestions.filter((s) => s.status === 'new');
  const upcoming = events
    .filter((e) => ['scheduled', 'live', 'review', 'draft'].includes(e.status) && new Date(e.start).getTime() > now)
    .sort((a, b) => +new Date(a.start) - +new Date(b.start));
  const order: Record<string, number> = { live: 0, review: 1, draft: 2, scheduled: 3, ended: 4, canceled: 5 };
  const featuredRows = [...featured].sort((a, b) => order[a.status] - order[b.status] || +new Date(b.start) - +new Date(a.start)).slice(0, 6);
  const usedThisMonth = featured.filter((e) => e.pkg === 'partner' && e.featureStart && new Date(e.featureStart).getMonth() === new Date().getMonth()).length;

  return (
    <>
      <PageHead
        eyebrow={`${greeting()}, ${me?.name.split(' ')[0] ?? 'there'}`}
        title="Overview"
        action={
          can('feature') && (
            <LinkButton href="#/feature" icon="star">
              Feature an event
            </LinkButton>
          )
        }
      />

      {!account.verified && (
        <Notice icon="sparkle" tone="gold">
          <b>We’re verifying {account.name}.</b> This usually takes 1 business day. You can set up events and your team now, and they’ll go out once you’re verified.
        </Notice>
      )}

      {club ? (
        <>
          <div className="stats">
            <Stat label="Club members" value={num(club.members)} note={`${club.goalLabel}: ${pct(club.goalCurrent, club.goalTarget)}%`} />
            <Stat label="Upcoming events" value={upcoming.filter((e) => e.status !== 'draft').length} note="Next 30 days" tone="muted" />
            <Stat label="Going" value={num(upcoming.reduce((a, e) => a + e.going, 0))} note="RSVPs across upcoming events" tone="muted" />
            <Stat label="Suggested rides" value={waiting.length} note={waiting.length ? 'Waiting for review' : 'All caught up'} tone={waiting.length ? 'olive' : 'muted'} />
          </div>
        </>
      ) : (
        featured.length > 0 && (
          <>
            <div className="label-row">Last 30 days</div>
            <div className="stats">
              <Stat label="Views" value={num(cur.views)} note={change(cur.views, prev.views) ?? 'From featured events'} />
              <Stat label="Taps" value={num(cur.taps)} note={`${pct(cur.taps, cur.views)}% of views`} />
              <Stat label="RSVPs" value={num(cur.rsvps)} note={`${pct(cur.rsvps, cur.taps)}% of taps`} />
              <Stat label="Check-ins" value={num(cur.checkins)} note={cur.checkins ? `${pct(cur.checkins, cur.rsvps)}% of RSVPs showed up` : 'Counted at each event'} tone={cur.checkins ? 'olive' : 'muted'} />
            </div>
          </>
        )
      )}

      <div className="cols">
        <div className="cols__main">
          {club && (
            <Card title="Coming up" sub="Club events and featured events" action={<a className="link-strong" href="#/events">All events</a>} pad={false}>
              {upcoming.length ? (
                <div className="table">
                  {upcoming.slice(0, 5).map((e) => (
                    <a className="table__row table__row--link" href={`#/events/${e.id}`} key={e.id}>
                      <span className="date-block" aria-hidden="true">
                        <b>{new Date(e.start).toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()}</b>
                        <span>{new Date(e.start).getDate()}</span>
                      </span>
                      <span className="grow">
                        <span className="row-title">{e.title}</span>
                        <span className="row-meta">
                          {fmtWhen(e.start)} · {e.place}
                          {e.leaderName ? ` · Led by ${e.leaderName.split(' ')[0]}` : ''}
                        </span>
                      </span>
                      <span className="badge-pair">
                        {e.kind === 'featured' ? <span className="tag tag--gold">Featured</span> : <span className="tag tag--olive">Club</span>}
                        <StatusBadge status={e.status} />
                      </span>
                      <span className="num">{e.going} going</span>
                    </a>
                  ))}
                </div>
              ) : (
                <Empty icon="calendar" title="Nothing scheduled yet" action={<LinkButton href="#/club/new" icon="plus" size="sm">Create a club event</LinkButton>}>
                  Club events you create show up in the app for your members.
                </Empty>
              )}
            </Card>
          )}

          {(featured.length > 0 || !club) && (
            <Card title="Featured events" action={featured.length > 0 && <a className="link-strong" href="#/events?kind=featured">See all</a>} pad={false}>
              {featured.length ? (
                <div className="table">
                  <div className="table__head grid-feat">
                    <span>Event</span>
                    <span>When</span>
                    <span>Status</span>
                    <span>Views</span>
                    <span>RSVPs</span>
                    <span />
                  </div>
                  {featuredRows.map((e) => {
                    const views = e.stats?.viewsByDay.reduce((a, b) => a + b, 0);
                    return (
                      <div className="table__row grid-feat" key={e.id}>
                        <a className="row-title" href={`#/events/${e.id}`}>
                          {e.title}
                        </a>
                        <span className="row-meta">{fmtWhen(e.start)}</span>
                        <span>
                          <StatusBadge status={e.status} />
                        </span>
                        <span className="num">{views ? num(views) : '–'}</span>
                        <span className="num">{e.stats ? num(e.stats.rsvps) : '–'}</span>
                        <span>
                          {e.status === 'draft' ? (
                            <a className="link-strong" href={`#/feature/${e.id}`}>
                              Finish setup
                            </a>
                          ) : e.status === 'review' ? (
                            <span className="row-meta">Usually within 1 business day</span>
                          ) : e.status === 'ended' && e.stats?.checkins ? (
                            <a className="link-strong" href={`#/events/${e.id}`}>
                              {e.stats.checkins} checked in
                            </a>
                          ) : (
                            <a className="link-strong" href={`#/events/${e.id}`}>
                              View results
                            </a>
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <Empty
                  icon="star"
                  title="Feature your first event"
                  action={
                    can('feature') && (
                      <LinkButton href="#/feature" icon="star" size="sm">
                        Feature an event
                      </LinkButton>
                    )
                  }
                >
                  Put a class, run or pop-up in front of active members near you. You’re only charged once it’s approved.
                </Empty>
              )}
            </Card>
          )}
        </div>

        <div className="cols__side">
          {isAdmin && (
            <Card title="Partners" sub={`${activePartners} active businesses`} action={<a className="link-strong" href="#/partners">Open</a>}>
              <div className="mini-list">
                <a className="mini-list__row mini-list__row--split" href="#/partners">
                  <span className="row-title">Featured events to review</span>
                  <span className={'tag ' + (reviewQueue ? 'tag--gold' : 'tag--muted')}>{reviewQueue}</span>
                </a>
                <a className="mini-list__row mini-list__row--split" href="#/partners">
                  <span className="row-title">Businesses to verify</span>
                  <span className={'tag ' + (pendingPartners ? 'tag--gold' : 'tag--muted')}>{pendingPartners}</span>
                </a>
              </div>
            </Card>
          )}
          {club && waiting.length > 0 && (
            <Card title="Suggested rides" sub={`${waiting.length} waiting for review`} action={<a className="link-strong" href="#/suggestions">Review</a>}>
              <div className="mini-list">
                {waiting.slice(0, 3).map((s) => (
                  <a className="mini-list__row" key={s.id} href="#/suggestions">
                    <Avatar initials={s.initials} color={s.color} size={34} />
                    <span>
                      <span className="row-title">{s.title}</span>
                      <span className="row-meta">
                        {s.memberName.split(' ')[0]} · {fmtWhen(s.start)}
                      </span>
                    </span>
                  </a>
                ))}
              </div>
            </Card>
          )}

          {club && (
            <Card title={club.goalLabel} sub={`${num(club.goalCurrent)} of ${num(club.goalTarget)}`}>
              <Meter value={club.goalCurrent} max={club.goalTarget} tone="gold" />
            </Card>
          )}

          {featured.some((e) => e.stats) && (
            <Card title="RSVPs by week" sub="From featured events, last 6 weeks">
              <BarChart data={rsvpsByWeek(featured)} label="RSVPs by week" />
            </Card>
          )}

          {account.kind === 'business' &&
            (account.plan === 'Partner' ? (
              <Card title="Partner plan" action={<span className="tag tag--olive">Active</span>}>
                <p className="muted">
                  {usedThisMonth} of {PARTNER_EVENTS_PER_MONTH} featured events used this month.
                  {account.renewsOn ? ` Renews ${fmtShort(account.renewsOn)}.` : ''}
                </p>
                <Meter value={usedThisMonth} max={PARTNER_EVENTS_PER_MONTH} tone="gold" />
              </Card>
            ) : (
              <Card title="Pay as you go" action={<span className="tag tag--muted">Current plan</span>}>
                <p className="muted">
                  Feature single events from {pkgInfo('spotlight')!.priceLabel}. Partner adds up to 4 featured events a month and lets you start a club.
                </p>
                <LinkButton href="#/billing" kind="outline" size="sm">
                  Compare plans
                </LinkButton>
              </Card>
            ))}
        </div>
      </div>

      <p className="fineprint">You see counts, never members’ personal info. Members can choose to share their name when they check in.</p>
    </>
  );
}
