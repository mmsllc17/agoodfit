import { useState } from 'react';
import { BarChart, HBars, LineChart } from '../components/charts';
import { Avatar, Card, Notice, PageHead, Stat } from '../components/ui';
import { useAccount } from '../store';
import { go } from '../router';
import { dayLabel, dayRange, DAY, featuredInRange, memberSeries, mergeShares, paidInRange, revenueByMonth, sampleSeries, totals, viewsPerDay } from '../analytics';
import { fmtShort, money, num, pct } from '../lib';
import type { Account } from '../types';

type Range = 30 | 90;

function delta(now: number, before: number, suffix = 'vs. prior period') {
  if (!before) return undefined;
  const c = Math.round(((now - before) / before) * 100);
  return `${c >= 0 ? '+' : ''}${c}% ${suffix}`;
}

export function Analytics({ query }: { query: URLSearchParams }) {
  const { state, isAdmin, account, can, readOnly, owner, club } = useAccount();
  const [range, setRange] = useState<Range>(30);
  const rangePicker = (
    <div className="seg" role="radiogroup" aria-label="Date range">
      {([30, 90] as Range[]).map((r) => (
        <button key={r} role="radio" aria-checked={range === r} className={'seg__btn' + (range === r ? ' seg__btn--on' : '')} onClick={() => setRange(r)}>
          {r} days
        </button>
      ))}
    </div>
  );

  // Partners see their own business only.
  if (!isAdmin) {
    if (!can('data') && !readOnly) {
      return (
        <>
          <PageHead title="Analytics" />
          <Notice>Your role can’t see event data. {owner ? `Ask ${owner.name.split(' ')[0]} to change your permissions on the Team page.` : 'Ask an owner to change your permissions.'}</Notice>
        </>
      );
    }
    return (
      <>
        <PageHead eyebrow={account.name} title="Analytics" sub={club ? 'How your featured events and club are doing.' : 'How your featured events are doing.'} action={rangePicker} />
        <AccountAnalytics account={account} range={range} own />
      </>
    );
  }

  const view = query.get('view') ?? 'all';
  const target = view === 'all' ? undefined : state.accounts.find((a) => a.id === view);
  const businesses = state.accounts.filter((a) => a.kind === 'business');
  const house = state.accounts.find((a) => a.kind === 'house');

  return (
    <>
      <PageHead
        eyebrow="GoodCo Bike Club · Super admin"
        title="Analytics"
        sub={target ? `${target.name}${target.kind === 'house' ? ' · House account' : ''}` : 'All of A Good Fit: members, partners and featured events.'}
        action={
          <div className="row-gap">
            <label className="sr-only" htmlFor="an-view">
              Show analytics for
            </label>
            <select id="an-view" className="input input--select" value={view} onChange={(e) => go(e.target.value === 'all' ? '/analytics' : `/analytics?view=${e.target.value}`)}>
              <option value="all">All of A Good Fit</option>
              {house && <option value={house.id}>{house.name} (house)</option>}
              <optgroup label="Partners">
                {businesses.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                    {b.status === 'offboarded' ? ' (offboarded)' : !b.verified ? ' (pending)' : ''}
                  </option>
                ))}
              </optgroup>
            </select>
            {rangePicker}
          </div>
        }
      />
      {target ? <AccountAnalytics account={target} range={range} /> : <PlatformAnalytics range={range} />}
    </>
  );
}

function PlatformAnalytics({ range }: { range: Range }) {
  const { state } = useAccount();
  const days = dayRange(range);
  const labels = days.map(dayLabel);
  const m = memberSeries(state, range);
  const mPrev = memberSeries(state, range * 2);
  const businesses = state.accounts.filter((a) => a.kind === 'business');
  const activeBiz = businesses.filter((a) => a.status === 'active');
  const from = Date.now() - range * DAY;
  const signups = businesses.filter((a) => new Date(a.joinedAt).getTime() >= from).length;
  const offboarded = businesses.filter((a) => a.offboardedAt && new Date(a.offboardedAt).getTime() >= from).length;
  const featured = featuredInRange(state.events, range);
  const t = totals(featured);
  const views = viewsPerDay(state.events, range);
  const revenue = paidInRange(state.invoices, range);
  const revenuePrev = paidInRange(state.invoices, range * 2) - revenue;
  const partnerPlans = activeBiz.filter((a) => a.plan === 'Partner').length;
  const activePrev = mPrev.active[range - 1];

  const rows = businesses
    .map((a) => {
      const evs = featuredInRange(state.events.filter((e) => e.accountId === a.id), range);
      const tt = totals(evs);
      const paid = paidInRange(state.invoices.filter((i) => i.accountId === a.id), range);
      return { a, events: evs.length, ...tt, paid };
    })
    .sort((x, y) => y.rsvps - x.rsvps || y.paid - x.paid);

  return (
    <>
      <Notice icon="sparkle" tone="gold">
        Member and app numbers are sample data until the app is connected. Partner, featured event and revenue numbers come from the portal.
      </Notice>

      <h2 className="section-title">Members</h2>
      <div className="stats">
        <Stat label="Members" value={num(m.total[range - 1])} note={`+${num(m.total[range - 1] - m.total[0])} in ${range} days`} />
        <Stat label="Weekly active" value={num(m.active[range - 1])} note={[`${pct(m.active[range - 1], m.total[range - 1])}% of members`, delta(m.active[range - 1], activePrev, 'vs. before')].filter(Boolean).join(' · ')} />
        <Stat label="Activities recorded" value={num(m.activities.reduce((a, b) => a + b, 0))} note={`About ${num(Math.round(m.activities.reduce((a, b) => a + b, 0) / range))} a day`} tone="muted" />
        <Stat label="New members" value={num(m.newMembers.reduce((a, b) => a + b, 0))} note={`About ${Math.round(m.newMembers.reduce((a, b) => a + b, 0) / range)} a day`} tone="muted" />
      </div>
      <div className="cols cols--even">
        <Card title="Members over time" sub={`Last ${range} days`} className="cols__main">
          <LineChart data={labels.map((l, i) => ({ label: l, value: m.total[i] }))} label="Members over time" fromZero={false} />
        </Card>
        <Card title="Activities per day" sub="Rides, runs, walks and classes recorded" className="cols__side">
          <LineChart data={labels.map((l, i) => ({ label: l, value: m.activities[i] }))} label="Activities per day" />
        </Card>
      </div>

      <h2 className="section-title">Partners and revenue</h2>
      <div className="stats">
        <Stat label="Revenue" value={money(revenue)} note={delta(revenue, revenuePrev) ?? `Last ${range} days`} />
        <Stat label="Active partners" value={activeBiz.length} note={`${partnerPlans} on the Partner plan`} tone="muted" />
        <Stat label="New sign-ups" value={signups} note={`${businesses.filter((a) => a.status === 'active' && !a.verified).length} waiting for verification`} tone="muted" />
        <Stat label="Offboarded" value={offboarded} note={`In the last ${range} days`} tone="muted" />
      </div>
      <div className="cols cols--even">
        <Card title="Revenue by month" sub="Paid partner plans and featured events" className="cols__main">
          <BarChart data={revenueByMonth(state.invoices)} label="Revenue by month" format={(n) => money(n)} />
        </Card>
        <Card title="Plans" sub="Active partners" className="cols__side">
          <HBars
            unit=""
            rows={[
              ['Partner', partnerPlans],
              ['Pay as you go', activeBiz.length - partnerPlans],
            ]}
          />
          <p className="muted small">Monthly recurring revenue: {money(partnerPlans * 299)}</p>
        </Card>
      </div>

      <h2 className="section-title">Featured events</h2>
      <div className="stats">
        <Stat label="Views" value={num(t.views)} note={`${featured.length} featured events ran`} />
        <Stat label="Taps" value={num(t.taps)} note={`${pct(t.taps, t.views)}% of views`} />
        <Stat label="RSVPs" value={num(t.rsvps)} note={`${pct(t.rsvps, t.taps)}% of taps`} />
        <Stat label="Check-ins" value={num(t.checkins)} note={t.checkins ? `${pct(t.checkins, t.rsvps)}% of RSVPs` : 'Counted at each event'} tone="muted" />
      </div>
      <div className="cols cols--even">
        <Card title="Featured views per day" sub="All partners and the house account" className="cols__main">
          <LineChart data={labels.map((l, i) => ({ label: l, value: views[i] }))} label="Featured views per day" />
        </Card>
        <Card title="Where RSVPs live" className="cols__side">
          {featured.length ? <HBars rows={mergeShares(featured, 'hoods')} /> : <p className="muted">No featured events in this period.</p>}
        </Card>
      </div>

      <Card title="Partners by results" sub={`Last ${range} days. Open one to see its analytics.`} pad={false}>
        <div className="table">
          <div className="table__head grid-an">
            <span>Business</span>
            <span>Featured</span>
            <span>Views</span>
            <span>RSVPs</span>
            <span>Check-ins</span>
            <span>Paid</span>
          </div>
          {rows.map((r) => (
            <a className="table__row table__row--link grid-an" key={r.a.id} href={`#/analytics?view=${r.a.id}`}>
              <span className="person">
                <Avatar initials={r.a.initials} color={r.a.color} size={34} square />
                <span>
                  <span className="row-title">{r.a.name}</span>
                  <span className="row-meta">
                    {r.a.status === 'offboarded' ? 'Offboarded' : !r.a.verified ? 'Needs verification' : r.a.plan}
                  </span>
                </span>
              </span>
              <span className="num">{r.events || '–'}</span>
              <span className="num">{r.views ? num(r.views) : '–'}</span>
              <span className="num">{r.rsvps ? num(r.rsvps) : '–'}</span>
              <span className="num">{r.checkins ? num(r.checkins) : '–'}</span>
              <span className="num">{r.paid ? money(r.paid) : '–'}</span>
            </a>
          ))}
        </div>
      </Card>
      <p className="fineprint">All numbers are counts. Members’ names and profiles are never shown to partners.</p>
    </>
  );
}

function AccountAnalytics({ account, range, own = false }: { account: Account; range: Range; own?: boolean }) {
  const { state } = useAccount();
  const labels = dayRange(range).map(dayLabel);
  const events = state.events.filter((e) => e.accountId === account.id);
  const featured = featuredInRange(events, range);
  const t = totals(featured);
  const views = viewsPerDay(events, range);
  const invoices = state.invoices.filter((i) => i.accountId === account.id);
  const paid = paidInRange(invoices, range);
  const club = state.clubs.find((c) => c.accountId === account.id);
  const from = Date.now() - range * DAY;
  const clubEvents = events.filter((e) => e.kind === 'club' && new Date(e.start).getTime() >= from && new Date(e.start).getTime() <= Date.now() + 30 * DAY && e.status !== 'canceled');
  const held = clubEvents.filter((e) => new Date(e.start).getTime() <= Date.now());
  const members = club ? sampleSeries('club' + account.id, range, Math.round(club.members * (1 - 0.0016 * range)), club.members, 0.003) : [];
  if (club) members[members.length - 1] = club.members;
  const cost = paid && t.rsvps ? paid / t.rsvps : 0;
  const top = [...featured].sort((a, b) => (b.stats?.rsvps ?? 0) - (a.stats?.rsvps ?? 0));

  return (
    <>
      {!own && (
        <div className="row-gap">
          <a className="link-strong" href="#/analytics">
            ← All of A Good Fit
          </a>
          {account.kind === 'business' && (
            <a className="link-strong" href={`#/partners/${account.id}`}>
              Partner page
            </a>
          )}
        </div>
      )}
      {account.status === 'offboarded' && <Notice icon="pause">Offboarded {account.offboardedAt ? fmtShort(account.offboardedAt) : ''}. Showing their history.</Notice>}

      <div className="stats">
        <Stat label="Featured views" value={num(t.views)} note={`${featured.length} featured ${featured.length === 1 ? 'event' : 'events'} ran`} />
        <Stat label="RSVPs" value={num(t.rsvps)} note={`${pct(t.rsvps, t.taps)}% of taps`} />
        <Stat label="Check-ins" value={num(t.checkins)} note={t.checkins ? `${pct(t.checkins, t.rsvps)}% of RSVPs` : 'Counted at each event'} tone="muted" />
        {account.kind === 'house' ? (
          <Stat label="Club members" value={club ? num(club.members) : '–'} note={club ? `+${num(club.members - members[0])} in ${range} days` : 'No club'} />
        ) : (
          <Stat label="Paid" value={money(paid)} note={cost ? `${money(Math.round(cost * 100) / 100)} per RSVP` : `Last ${range} days`} tone="muted" />
        )}
      </div>

      <div className="cols cols--even">
        <Card title="Featured views per day" sub={`Last ${range} days`} className="cols__main">
          {t.views ? <LineChart data={labels.map((l, i) => ({ label: l, value: views[i] }))} label="Featured views per day" /> : <p className="muted">No featured events ran in this period.</p>}
        </Card>
        <Card title="From view to check-in" className="cols__side">
          {t.views ? (
            <HBars
              unit=""
              rows={[
                ['Views', t.views],
                ['Taps', t.taps],
                ['RSVPs', t.rsvps],
                ['Check-ins', t.checkins],
              ]}
            />
          ) : (
            <p className="muted">Nothing yet.</p>
          )}
        </Card>
      </div>

      {featured.length > 0 && (
        <div className="cols cols--half">
          <Card title="Where RSVPs live">
            <HBars rows={mergeShares(featured, 'hoods')} />
          </Card>
          <Card title="What they’re into">
            <HBars rows={mergeShares(featured, 'interests')} />
          </Card>
        </div>
      )}

      {club && (
        <>
          <h2 className="section-title">{club.name}</h2>
          <div className="cols cols--even">
            <Card title="Club members" sub={`Last ${range} days`} className="cols__main">
              <LineChart data={labels.map((l, i) => ({ label: l, value: members[i] }))} label="Club members" fromZero={false} />
            </Card>
            <Card title="Club events" className="cols__side">
              <dl className="summary summary--left">
                <dt>Held</dt>
                <dd>{held.length}</dd>
                <dt>Coming up</dt>
                <dd>{clubEvents.length - held.length}</dd>
                <dt>Average going</dt>
                <dd>{clubEvents.length ? Math.round(clubEvents.reduce((s, e) => s + e.going, 0) / clubEvents.length) : '–'}</dd>
                <dt>From member suggestions</dt>
                <dd>{clubEvents.filter((e) => e.fromSuggestionId).length}</dd>
              </dl>
            </Card>
          </div>
        </>
      )}

      <Card title="Featured events" sub={`Last ${range} days`} pad={false}>
        {top.length ? (
          <div className="table">
            <div className="table__head grid-an">
              <span>Event</span>
              <span>Ran</span>
              <span>Views</span>
              <span>RSVPs</span>
              <span>Check-ins</span>
              <span>Package</span>
            </div>
            {top.map((e) => (
              <div className="table__row grid-an" key={e.id}>
                <span>
                  <span className="row-title">{e.title}</span>
                  <span className="row-meta">{e.place}</span>
                </span>
                <span className="row-meta">{e.featureStart ? fmtShort(e.featureStart) : '–'}</span>
                <span className="num">{num(e.stats!.viewsByDay.reduce((a, b) => a + b, 0))}</span>
                <span className="num">{num(e.stats!.rsvps)}</span>
                <span className="num">{e.stats!.checkins ? num(e.stats!.checkins) : '–'}</span>
                <span className="row-meta">{e.pkg === 'house' ? 'House' : e.pkg ? e.pkg[0].toUpperCase() + e.pkg.slice(1) : '–'}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="card-pad">
            <p className="muted">No featured events ran in this period.</p>
            {own && (
              <a className="link-strong" href="#/feature">
                Feature an event
              </a>
            )}
          </div>
        )}
      </Card>
      <p className="fineprint">
        All numbers are counts{own ? '. You never see members’ names or profiles unless they choose to share them at check-in' : ''}.{club ? ' Club member numbers are sample data until the app is connected.' : ''}
      </p>
    </>
  );
}
