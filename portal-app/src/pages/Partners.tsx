import { useState } from 'react';
import { Avatar, Button, Card, Empty, Field, Modal, Notice, PageHead, Stat, StatusBadge } from '../components/ui';
import { approveEvent, offboardAccount, reactivateAccount, sendBackEvent, setViewAs, useAccount, useStore, verifyAccount } from '../store';
import { go } from '../router';
import { fmtLong, fmtShort, fmtWhen, money, num, PARTNER_MONTHLY, pkgInfo } from '../lib';
import type { Account, AppEvent } from '../types';

const DAY = 86400000;

const REASONS = [
  'Asked to leave',
  'Broke the Featured Events Policy',
  'Broke the Community Guidelines',
  'Unpaid balance',
  'Not a real or eligible business',
  'Something else',
];

function statusOf(a: Account): { label: string; tone: string } {
  if (a.status === 'offboarded') return { label: 'Offboarded', tone: 'tag--muted' };
  if (!a.verified) return { label: 'Needs verification', tone: 'tag--gold' };
  return { label: 'Active', tone: 'tag--olive' };
}

function NotAllowed() {
  return (
    <Empty icon="lock" title="Only the GoodCo house account can see partners">
      Partner accounts only see their own business.
    </Empty>
  );
}

/** Approve or send back one featured event. Shared by the list and the partner page. */
function ReviewActions({ e }: { e: AppEvent }) {
  const { update, toast, log, state } = useAccount();
  const [sendBack, setSendBack] = useState(false);
  const [note, setNote] = useState('');
  const partner = state.accounts.find((a) => a.id === e.accountId);
  const blocked = partner && !partner.verified;
  return (
    <>
      <span className="row-gap nowrap">
        <Button
          size="sm"
          disabled={blocked}
          title={blocked ? 'Verify the business first' : undefined}
          onClick={() => {
            update((d) => {
              approveEvent(d, e.id);
              log(d, `approved ${e.title} from ${partner?.name}`);
            });
            toast(`${e.title} is live`);
          }}
        >
          Approve
        </Button>
        <Button size="sm" kind="secondary" onClick={() => setSendBack(true)}>
          Send back
        </Button>
      </span>
      {sendBack && (
        <Modal
          title={`Send ${e.title} back?`}
          onClose={() => setSendBack(false)}
          footer={
            <>
              <Button kind="secondary" onClick={() => setSendBack(false)}>
                Cancel
              </Button>
              <Button
                disabled={note.trim().length < 5}
                onClick={() => {
                  update((d) => {
                    sendBackEvent(d, e.id, note.trim());
                    log(d, `sent ${e.title} back to ${partner?.name}`);
                  });
                  toast(`Sent back to ${partner?.name}`);
                  setSendBack(false);
                }}
              >
                Send back
              </Button>
            </>
          }
        >
          <p>It goes back to their drafts with your note. Nothing is charged.</p>
          <Field label="What needs to change">
            {(id) => <textarea id={id} rows={3} className="input textarea" autoFocus placeholder="Add the price members pay at the door, or confirm it’s free." value={note} onChange={(ev) => setNote(ev.target.value)} />}
          </Field>
        </Modal>
      )}
    </>
  );
}

export function Partners() {
  const { state, isAdmin, update, toast, log } = useAccount();
  const [tab, setTab] = useState<'active' | 'pending' | 'offboarded'>('active');
  const [q, setQ] = useState('');
  if (!isAdmin) return <NotAllowed />;

  const partners = state.accounts.filter((a) => a.kind === 'business');
  const pending = partners.filter((a) => a.status === 'active' && !a.verified);
  const active = partners.filter((a) => a.status === 'active' && a.verified);
  const off = partners.filter((a) => a.status === 'offboarded');
  const queue = state.events.filter((e) => e.kind === 'featured' && e.status === 'review' && partners.some((p) => p.id === e.accountId)).sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
  const revenue =
    partners.filter((a) => a.status === 'active' && a.plan === 'Partner').length * PARTNER_MONTHLY +
    state.invoices.filter((i) => i.status === 'Paid' && !i.desc.startsWith('Partner plan') && Date.now() - +new Date(i.date) < 30 * DAY).reduce((s, i) => s + i.amount, 0);

  const list = (tab === 'active' ? active : tab === 'pending' ? pending : off).filter((a) => (a.name + ' ' + a.email + ' ' + a.category).toLowerCase().includes(q.trim().toLowerCase()));
  const evCount = (id: string) => state.events.filter((e) => e.accountId === id && e.kind === 'featured' && e.status !== 'draft');
  const name = (id: string) => state.accounts.find((a) => a.id === id)?.name ?? '';

  return (
    <>
      <PageHead eyebrow="GoodCo Bike Club · Super admin" title="Partners" sub="Every business on A Good Fit for Business." />

      <div className="stats">
        <Stat label="Active partners" value={active.length} note={`${partners.filter((a) => a.status === 'active' && a.plan === 'Partner').length} on the Partner plan`} tone="muted" />
        <Stat label="Needs verification" value={pending.length} note={pending.length ? 'Usually within 1 business day' : 'All caught up'} tone={pending.length ? 'olive' : 'muted'} />
        <Stat label="Featured in review" value={queue.length} note={queue.length ? 'Waiting for a decision' : 'All caught up'} tone={queue.length ? 'olive' : 'muted'} />
        <Stat label="Revenue, last 30 days" value={money(revenue)} note="Partner plans plus single events" tone="muted" />
      </div>

      {queue.length > 0 && (
        <Card title="Featured events to review" sub="Check guideline fit, accurate details and a real business. Partners are charged only when you approve." pad={false}>
          <div className="table">
            {queue.map((e) => {
              const p = pkgInfo(e.pkg);
              return (
                <div className="table__row" key={e.id}>
                  <span className="grow">
                    <span className="row-title">{e.title}</span>
                    <span className="row-meta">
                      <a href={`#/partners/${e.accountId}`}>{name(e.accountId)}</a> · {fmtWhen(e.start)} · {e.place}
                    </span>
                    {e.details && <span className="row-meta row-quote">“{e.details}”</span>}
                  </span>
                  <span className="tag tag--gold">{p ? `${p.name} · ${p.id === 'partner' ? 'Included' : p.priceLabel}` : 'Featured'}</span>
                  <ReviewActions e={e} />
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <div className="toolbar">
        <div className="seg" role="tablist" aria-label="Partner status">
          {(
            [
              ['active', 'Active', active.length],
              ['pending', 'Needs verification', pending.length],
              ['offboarded', 'Offboarded', off.length],
            ] as const
          ).map(([k, label, n]) => (
            <button key={k} role="tab" aria-selected={tab === k} className={'seg__btn' + (tab === k ? ' seg__btn--on' : '')} onClick={() => setTab(k)}>
              {label} <span className="seg__count">{n}</span>
            </button>
          ))}
        </div>
        <input className="input input--search" type="search" aria-label="Search partners" placeholder="Search by name, email or category" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <Card pad={false}>
        {list.length ? (
          <div className="table">
            <div className="table__head grid-partners">
              <span>Business</span>
              <span>Plan</span>
              <span>Status</span>
              <span>Featured</span>
              <span>{tab === 'offboarded' ? 'Offboarded' : 'Joined'}</span>
              <span />
            </div>
            {list.map((a) => {
              const st = statusOf(a);
              const evs = evCount(a.id);
              return (
                <div className="table__row grid-partners" key={a.id}>
                  <a className="person person--link" href={`#/partners/${a.id}`}>
                    <Avatar initials={a.initials} color={a.color} size={38} square />
                    <span>
                      <span className="row-title">{a.name}</span>
                      <span className="row-meta">{a.category}</span>
                    </span>
                  </a>
                  <span className="row-meta">{a.plan}</span>
                  <span>
                    <span className={'tag ' + st.tone}>{st.label}</span>
                  </span>
                  <span className="num">{evs.length ? `${evs.filter((e) => e.status === 'live').length} live · ${evs.length} total` : '–'}</span>
                  <span className="row-meta">{fmtShort((tab === 'offboarded' ? a.offboardedAt : a.joinedAt) ?? a.joinedAt)}</span>
                  <span className="right">
                    {tab === 'pending' ? (
                      <Button
                        size="sm"
                        onClick={() => {
                          update((d) => {
                            verifyAccount(d, a.id);
                            log(d, `verified ${a.name}`);
                          });
                          toast(`${a.name} is verified`);
                        }}
                      >
                        Verify
                      </Button>
                    ) : (
                      <a className="link-strong" href={`#/partners/${a.id}`}>
                        Open
                      </a>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <Empty icon="store" title={q ? 'No partners match' : tab === 'pending' ? 'Nobody waiting' : tab === 'offboarded' ? 'No offboarded partners' : 'No partners yet'}>
            {q ? 'Try a different name or email.' : tab === 'pending' ? 'New sign-ups show up here to verify.' : ''}
          </Empty>
        )}
      </Card>
    </>
  );
}

export function PartnerDetail({ id }: { id: string }) {
  const { state, isAdmin, update, toast, log } = useAccount();
  const store = useStore();
  const [offboarding, setOffboarding] = useState(false);
  const [reactivating, setReactivating] = useState(false);
  if (!isAdmin) return <NotAllowed />;

  const a = state.accounts.find((x) => x.id === id && x.kind === 'business');
  if (!a) {
    return (
      <>
        <PageHead back={{ href: '#/partners', label: 'Partners' }} title="Partner not found" />
        <Empty icon="store" title="That business isn’t on A Good Fit" />
      </>
    );
  }

  const st = statusOf(a);
  const events = state.events.filter((e) => e.accountId === a.id).sort((x, y) => +new Date(y.start) - +new Date(x.start));
  const featured = events.filter((e) => e.kind === 'featured');
  const team = state.team.filter((t) => t.accountId === a.id);
  const club = state.clubs.find((c) => c.accountId === a.id);
  const invoices = state.invoices.filter((i) => i.accountId === a.id);
  const paid = invoices.filter((i) => i.status === 'Paid').reduce((s, i) => s + i.amount, 0);
  const rsvps = featured.reduce((s, e) => s + (e.stats?.rsvps ?? 0), 0);
  const live = events.filter((e) => ['live', 'scheduled', 'review'].includes(e.status));
  const going = live.reduce((s, e) => s + e.going, 0);
  const off = a.status === 'offboarded';

  return (
    <>
      <PageHead
        back={{ href: '#/partners', label: 'Partners' }}
        title={a.name}
        badge={<span className={'tag ' + st.tone}>{st.label}</span>}
        sub={`${a.category} · ${a.address} · Joined ${fmtLong(a.joinedAt)}`}
        action={
          <div className="row-gap">
            {!off && !a.verified && (
              <Button
                icon="check"
                onClick={() => {
                  update((d) => {
                    verifyAccount(d, a.id);
                    log(d, `verified ${a.name}`);
                  });
                  toast(`${a.name} is verified`);
                }}
              >
                Verify business
              </Button>
            )}
            {!off && (
              <Button
                kind="outline"
                icon="eye"
                onClick={() => {
                  store.update((d) => setViewAs(d, a.id));
                  go('/overview');
                }}
              >
                View as partner
              </Button>
            )}
            {off ? (
              <Button kind="outline" icon="refresh" onClick={() => setReactivating(true)}>
                Reactivate
              </Button>
            ) : (
              <Button kind="secondary" className="btn--danger-text" icon="pause" onClick={() => setOffboarding(true)}>
                Discontinue partner
              </Button>
            )}
          </div>
        }
      />

      {off && (
        <Notice icon="pause">
          <b>Offboarded {a.offboardedAt ? fmtLong(a.offboardedAt) : ''}.</b> {a.offboardReason}
          {a.offboardNote ? `: ${a.offboardNote}` : '.'} Their team can’t sign in, their events were ended and members going were notified. Records are kept for reporting.
        </Notice>
      )}
      {!off && !a.verified && (
        <Notice icon="sparkle" tone="gold">
          <b>Not verified yet.</b> Check that {a.name} is a real business at {a.address} before verifying. Their featured events can’t be approved until then.
        </Notice>
      )}

      <div className="stats">
        <Stat label="Plan" value={<span className="stat__small">{a.plan}</span>} note={a.renewsOn && !off ? `Renews ${fmtShort(a.renewsOn)}` : off ? 'No future charges' : 'No monthly fee'} tone="muted" />
        <Stat label="Featured events" value={featured.filter((e) => e.status !== 'draft').length} note={`${featured.filter((e) => e.status === 'live').length} live now`} tone="muted" />
        <Stat label="RSVPs from featured" value={num(rsvps)} note="All time" tone="muted" />
        <Stat label="Paid to date" value={money(paid)} note={`${invoices.filter((i) => i.status === 'Paid').length} payments`} tone="muted" />
      </div>

      <div className="cols">
        <div className="cols__main">
          <Card title="Events" sub={club ? `Featured events and ${club.name} events` : 'Featured events'} pad={false}>
            {events.length ? (
              <div className="table">
                {events.map((e) => (
                  <div className="table__row" key={e.id}>
                    <span className="grow">
                      <span className="row-title">{e.title}</span>
                      <span className="row-meta">
                        {fmtWhen(e.start)} · {e.place}
                        {e.endedByOffboard ? ' · Ended when offboarded' : ''}
                        {e.reviewNote ? ` · Sent back: ${e.reviewNote}` : ''}
                      </span>
                    </span>
                    {e.kind === 'featured' ? <span className="tag tag--gold">Featured</span> : <span className="tag tag--olive">Club</span>}
                    <StatusBadge status={e.status} />
                    {e.status === 'review' && <ReviewActions e={e} />}
                    {e.stats && <span className="num">{num(e.stats.rsvps)} RSVPs</span>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted card-pad">No events yet.</p>
            )}
          </Card>
          {club && (
            <Card title={club.name} sub={`${club.activity} club · ${num(club.members)} members`}>
              <p>{club.description}</p>
            </Card>
          )}
        </div>
        <div className="cols__side">
          <Card title="Contact">
            <dl className="dl dl--tight">
              <dt>Email</dt>
              <dd>{a.email}</dd>
              <dt>Web</dt>
              <dd>{a.web || '–'}</dd>
              <dt>Address</dt>
              <dd>{a.address}</dd>
            </dl>
          </Card>
          <Card title="Team" sub={`${team.length} ${team.length === 1 ? 'person' : 'people'}`}>
            <div className="mini-list">
              {team.map((t) => (
                <div className="mini-list__row" key={t.id}>
                  <Avatar initials={t.initials} color={t.color} size={32} />
                  <span>
                    <span className="row-title">{t.name}</span>
                    <span className="row-meta">
                      {t.role}
                      {t.pending ? ' · Invite pending' : ''}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </Card>
          <Card title="Billing">
            {invoices.length ? (
              <div className="mini-list">
                {invoices
                  .slice()
                  .sort((x, y) => +new Date(y.date) - +new Date(x.date))
                  .slice(0, 5)
                  .map((i) => (
                    <div className="mini-list__row mini-list__row--split" key={i.id}>
                      <span>
                        <span className="row-title">{i.desc}</span>
                        <span className="row-meta">
                          {fmtShort(i.date)} · {i.status}
                        </span>
                      </span>
                      <span className="num">{money(i.amount)}</span>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="muted">No payments yet.</p>
            )}
          </Card>
        </div>
      </div>

      {offboarding && (
        <OffboardModal
          partner={a}
          liveCount={live.length}
          going={going}
          onClose={() => setOffboarding(false)}
          onConfirm={(reason, note) => {
            update((d) => {
              offboardAccount(d, a.id, reason, note);
              log(d, `discontinued ${a.name}: ${reason.toLowerCase()}`);
            });
            toast(`${a.name} was offboarded`);
            setOffboarding(false);
          }}
        />
      )}
      {reactivating && (
        <Modal
          title={`Reactivate ${a.name}?`}
          onClose={() => setReactivating(false)}
          footer={
            <>
              <Button kind="secondary" onClick={() => setReactivating(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  update((d) => {
                    reactivateAccount(d, a.id);
                    log(d, `reactivated ${a.name}`);
                  });
                  toast(`${a.name} is active again`);
                  setReactivating(false);
                }}
              >
                Reactivate
              </Button>
            </>
          }
        >
          <p>Their team can sign in again on Pay as you go. Events that were ended stay ended, and they’ll need to feature new ones.</p>
        </Modal>
      )}
    </>
  );
}

function OffboardModal({ partner, liveCount, going, onClose, onConfirm }: { partner: Account; liveCount: number; going: number; onClose: () => void; onConfirm: (reason: string, note: string) => void }) {
  const [reason, setReason] = useState(REASONS[0]);
  const [note, setNote] = useState('');
  const [sure, setSure] = useState(false);
  const needNote = reason === 'Something else';
  const ok = sure && (!needNote || note.trim().length > 3);
  return (
    <Modal
      title={`Discontinue ${partner.name}?`}
      onClose={onClose}
      footer={
        <>
          <Button kind="secondary" onClick={onClose}>
            Keep partner
          </Button>
          <Button kind="danger" disabled={!ok} onClick={() => onConfirm(reason, note.trim())}>
            Discontinue
          </Button>
        </>
      }
    >
      <ul className="ticks ticks--warn">
        <li>Their team can no longer sign in to the portal.</li>
        <li>
          {liveCount
            ? `${liveCount} live or upcoming ${liveCount === 1 ? 'event ends' : 'events end'} now, and ${num(going)} ${going === 1 ? 'member going is' : 'members going are'} notified.`
            : 'They have no live or upcoming events.'}
        </li>
        <li>{partner.plan === 'Partner' ? 'Their Partner plan stops renewing. No more charges.' : 'No more charges.'}</li>
        <li>Their club and featured events disappear from the app. Records stay for reporting.</li>
      </ul>
      <Field label="Reason">
        {(id) => (
          <select id={id} className="input" value={reason} onChange={(e) => setReason(e.target.value)}>
            {REASONS.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        )}
      </Field>
      <Field label={needNote ? 'Note' : 'Note (optional)'} hint="Internal only. The partner gets a short, kind email.">
        {(id) => <textarea id={id} rows={2} className="input textarea" value={note} onChange={(e) => setNote(e.target.value)} />}
      </Field>
      <label className="confirm-line">
        <input type="checkbox" checked={sure} onChange={() => setSure(!sure)} />
        <span>
          I understand this ends {partner.name}’s access right away.
        </span>
      </label>
    </Modal>
  );
}
