import { useState } from 'react';
import { Icon } from '../components/Icon';
import { Avatar, Button, Card, Empty, Field, LinkButton, Meter, Notice, PageHead, StatusBadge, Switch } from '../components/ui';
import { newClub, useAccount } from '../store';
import { go } from '../router';
import { ACTIVITIES, dateInput, daysFromToday, fmtWhen, num, PACES, pct, timeInput, toIso, uid } from '../lib';
import type { AppEvent } from '../types';

export function ClubPage() {
  const { account, club, can } = useAccount();
  if (!club) {
    if (account.kind === 'business' && account.plan !== 'Partner') return <ClubUpsell />;
    return <StartClub />;
  }
  return <ClubHome canEdit={can('editClub')} />;
}

function ClubUpsell() {
  return (
    <>
      <PageHead title="Club" />
      <Card className="success">
        <span className="icon-circle icon-circle--gold">
          <Icon name="flag" size={22} />
        </span>
        <h2 className="card-display">Start a club on the Partner plan</h2>
        <p className="muted">
          Clubs give your regulars a home in the app: club rides and classes, a member chat, a leaderboard and announcements. Members join for free. Starting a club is part of
          the Partner plan.
        </p>
        <div className="row-gap center">
          <LinkButton href="#/billing">See the Partner plan</LinkButton>
        </div>
      </Card>
    </>
  );
}

function StartClub() {
  const { account, update, toast, log, can, owner, readOnly } = useAccount();
  const [f, setF] = useState({ name: account.name.replace(/ Studio$/, '') + ' Club', activity: ACTIVITIES[3], description: '', meetingSpot: account.address.split(',')[0] });
  const [tried, setTried] = useState(false);
  const ok = f.name.trim().length > 2 && f.description.trim().length > 10;

  if (!can('editClub')) {
    return (
      <>
        <PageHead title="Club" />
        <Notice>
          {account.name} doesn’t have a club yet.{readOnly ? '' : ` Only people who can edit the club page can start one. ${owner ? `Ask ${owner.name.split(' ')[0]}.` : ''}`}
        </Notice>
      </>
    );
  }

  const create = () => {
    setTried(true);
    if (!ok) return;
    update((d) => {
      d.clubs.push(newClub(account.id, { name: f.name.trim(), activity: f.activity, description: f.description.trim(), meetingSpot: f.meetingSpot.trim(), goalLabel: 'Club sessions this month', goalTarget: 12, goalCurrent: 0 }));
      log(d, `started the club ${f.name.trim()}`);
    });
    toast(`${f.name.trim()} is live in the app`);
  };

  return (
    <>
      <PageHead title="Start your club" sub="Your Partner plan includes a club. Members join for free and see your club events, chat and announcements in the app." />
      <div className="cols">
        <Card className="cols__main">
          <div className="form">
            <Field label="Club name" error={tried && f.name.trim().length < 3 ? 'Give your club a name.' : ''}>
              {(id) => <input id={id} className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />}
            </Field>
            <div className="grid-2">
              <Field label="Main activity">
                {(id) => (
                  <select id={id} className="input" value={f.activity} onChange={(e) => setF({ ...f, activity: e.target.value })}>
                    {ACTIVITIES.map((a) => (
                      <option key={a}>{a}</option>
                    ))}
                  </select>
                )}
              </Field>
              <Field label="Usual meeting spot">{(id) => <input id={id} className="input" value={f.meetingSpot} onChange={(e) => setF({ ...f, meetingSpot: e.target.value })} />}</Field>
            </div>
            <Field label="About the club" hint="Two or three sentences members see on the club page." error={tried && f.description.trim().length <= 10 ? 'Tell members what the club is about.' : ''}>
              {(id) => <textarea id={id} rows={3} className="input textarea" placeholder="Morning flows in Fort Greene Park, every level welcome." value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />}
            </Field>
            <div>
              <Button size="lg" onClick={create}>
                Start club
              </Button>
            </div>
          </div>
        </Card>
        <div className="cols__side">
          <Card title="What members get">
            <ul className="ticks">
              <li>Club events with RSVPs and a chat for each</li>
              <li>Announcements pinned to the club page</li>
              <li>A club leaderboard and monthly goal</li>
              <li>A way to suggest rides and classes for you to approve</li>
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}

function ClubHome({ canEdit }: { canEdit: boolean }) {
  const { account, club, events, update, toast, log, can } = useAccount();
  const c = club!;
  const [editing, setEditing] = useState(false);
  const [f, setF] = useState({ name: c.name, description: c.description, meetingSpot: c.meetingSpot, activity: c.activity, goalLabel: c.goalLabel, goalTarget: String(c.goalTarget) });
  const [ann, setAnn] = useState(c.announcement);
  const [annEditing, setAnnEditing] = useState(false);
  const clubEvents = events.filter((e) => e.kind === 'club' && e.status === 'scheduled' && new Date(e.start).getTime() > Date.now()).sort((a, b) => +new Date(a.start) - +new Date(b.start));

  const saveProfile = () => {
    update((d) => {
      const x = d.clubs.find((y) => y.accountId === account.id)!;
      Object.assign(x, { name: f.name.trim() || x.name, description: f.description.trim(), meetingSpot: f.meetingSpot.trim(), activity: f.activity, goalLabel: f.goalLabel.trim() || x.goalLabel, goalTarget: Math.max(1, Number(f.goalTarget) || x.goalTarget) });
      log(d, 'updated the club page');
    });
    setEditing(false);
    toast('Club page updated');
  };

  const postAnn = () => {
    update((d) => {
      d.clubs.find((y) => y.accountId === account.id)!.announcement = ann.trim();
      log(d, ann.trim() ? 'posted an announcement' : 'removed the pinned announcement');
    });
    setAnnEditing(false);
    toast(ann.trim() ? 'Announcement pinned. Members will get a notification.' : 'Announcement removed');
  };

  return (
    <>
      <PageHead
        eyebrow={account.kind === 'house' ? `${account.name} · Parent company` : account.name}
        title="Club"
        action={
          can('create') && (
            <LinkButton href="#/club/new" icon="plus">
              Create club event
            </LinkButton>
          )
        }
      />
      <div className="cols">
        <div className="cols__main">
          <Card
            title={editing ? 'Edit club page' : c.name}
            sub={editing ? 'Changes show in the app right away.' : `${c.activity} club · ${num(c.members)} members · Meets at ${c.meetingSpot || 'varied spots'}`}
            action={
              canEdit && !editing && (
                <Button kind="outline" size="sm" icon="edit" onClick={() => setEditing(true)}>
                  Edit
                </Button>
              )
            }
          >
            {editing ? (
              <div className="form">
                <div className="grid-2">
                  <Field label="Club name">{(id) => <input id={id} className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />}</Field>
                  <Field label="Main activity">
                    {(id) => (
                      <select id={id} className="input" value={f.activity} onChange={(e) => setF({ ...f, activity: e.target.value })}>
                        {ACTIVITIES.map((a) => (
                          <option key={a}>{a}</option>
                        ))}
                      </select>
                    )}
                  </Field>
                </div>
                <Field label="About the club">{(id) => <textarea id={id} rows={3} className="input textarea" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />}</Field>
                <div className="grid-3">
                  <Field label="Usual meeting spot">{(id) => <input id={id} className="input" value={f.meetingSpot} onChange={(e) => setF({ ...f, meetingSpot: e.target.value })} />}</Field>
                  <Field label="Monthly goal">{(id) => <input id={id} className="input" value={f.goalLabel} onChange={(e) => setF({ ...f, goalLabel: e.target.value })} />}</Field>
                  <Field label="Goal target">{(id) => <input id={id} className="input" inputMode="numeric" value={f.goalTarget} onChange={(e) => setF({ ...f, goalTarget: e.target.value.replace(/\D/g, '') })} />}</Field>
                </div>
                <div className="row-gap">
                  <Button onClick={saveProfile}>Save changes</Button>
                  <Button kind="secondary" onClick={() => setEditing(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <p>{c.description || <span className="muted">No description yet.</span>}</p>
            )}
          </Card>

          <Card title="Upcoming club events" action={<a className="link-strong" href="#/events">All events</a>} pad={false}>
            {clubEvents.length ? (
              <div className="table">
                {clubEvents.map((e) => (
                  <a key={e.id} className="table__row table__row--link" href={`#/events/${e.id}`}>
                    <span className="date-block" aria-hidden="true">
                      <b>{new Date(e.start).toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()}</b>
                      <span>{new Date(e.start).getDate()}</span>
                    </span>
                    <span className="grow">
                      <span className="row-title">{e.title}</span>
                      <span className="row-meta">
                        {fmtWhen(e.start)} · {e.place}
                        {e.distance ? ` · ${e.distance}` : ''}
                      </span>
                    </span>
                    <StatusBadge status={e.status} />
                    <span className="num">{e.going} going</span>
                  </a>
                ))}
              </div>
            ) : (
              <Empty icon="calendar" title="No club events scheduled" action={can('create') && <LinkButton href="#/club/new" icon="plus" size="sm">Create club event</LinkButton>}>
                Members see club events in the app and can RSVP right away.
              </Empty>
            )}
          </Card>
        </div>

        <div className="cols__side">
          <Card
            title="Pinned announcement"
            action={
              can('announce') && !annEditing && (
                <Button kind="ghost" size="sm" onClick={() => setAnnEditing(true)}>
                  {c.announcement ? 'Edit' : 'Post'}
                </Button>
              )
            }
          >
            {annEditing ? (
              <div className="form">
                <Field label="Announcement" hint="Pinned to the top of the club page. Members get a notification.">
                  {(id) => <textarea id={id} rows={4} className="input textarea" maxLength={280} value={ann} onChange={(e) => setAnn(e.target.value)} />}
                </Field>
                <div className="row-gap">
                  <Button size="sm" onClick={postAnn}>
                    {ann.trim() ? 'Pin announcement' : 'Remove announcement'}
                  </Button>
                  <Button
                    size="sm"
                    kind="secondary"
                    onClick={() => {
                      setAnn(c.announcement);
                      setAnnEditing(false);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : c.announcement ? (
              <p className="announcement">
                <Icon name="megaphone" size={18} color="var(--clay)" />
                <span>{c.announcement}</span>
              </p>
            ) : (
              <p className="muted">Nothing pinned right now.</p>
            )}
          </Card>
          <Card title={c.goalLabel} sub={`${num(c.goalCurrent)} of ${num(c.goalTarget)} · ${pct(c.goalCurrent, c.goalTarget)}%`}>
            <Meter value={c.goalCurrent} max={c.goalTarget} tone="gold" />
          </Card>
        </div>
      </div>
    </>
  );
}

export function ClubEventForm({ id }: { id?: string }) {
  const { account, club, team, events, update, toast, log, can, me, readOnly } = useAccount();
  const existing = id ? events.find((e) => e.id === id && e.kind === 'club') : undefined;
  const start = existing?.start ?? daysFromToday(7, '08:00');
  const leaders = team.filter((t) => !t.pending);
  const [f, setF] = useState({
    title: existing?.title ?? '',
    activity: existing?.activity ?? club?.activity ?? 'Ride',
    date: dateInput(start),
    time: timeInput(start),
    place: existing?.place ?? club?.meetingSpot ?? '',
    route: existing?.route ?? '',
    distance: existing?.distance ?? '',
    pace: existing?.pace ?? PACES[0],
    noDrop: existing?.noDrop ?? true,
    capacity: String(existing?.capacity ?? 30),
    leaderId: existing?.leaderId ?? me?.id ?? '',
    details: existing?.details ?? '',
  });
  const [tried, setTried] = useState(false);

  if (!club) {
    return (
      <>
        <PageHead back={{ href: '#/club', label: 'Club' }} title="Create club event" />
        <Notice icon="flag">Start your club first. Club events live on your club page in the app.</Notice>
      </>
    );
  }
  if (!can('create')) {
    return (
      <>
        <PageHead back={{ href: '#/club', label: 'Club' }} title="Create club event" />
        <Notice>{readOnly ? 'Read-only. Partners create their own club events.' : 'Your role can’t create club events. Ask an owner or admin to change it on the Team page.'}</Notice>
      </>
    );
  }

  const iso = f.date && f.time ? toIso(f.date, f.time) : '';
  const errors = {
    title: f.title.trim().length < 3 ? 'Name the event.' : '',
    date: !iso || new Date(iso).getTime() < Date.now() ? 'Pick a future date and time.' : '',
    place: f.place.trim().length < 3 ? 'Add where people meet.' : '',
  };
  const ok = Object.values(errors).every((x) => !x);
  const err = (k: keyof typeof errors) => (tried ? errors[k] : '');

  const save = () => {
    setTried(true);
    if (!ok) return;
    const leader = team.find((t) => t.id === f.leaderId);
    const evId = existing?.id ?? uid('ev');
    const fields: Partial<AppEvent> = {
      title: f.title.trim(),
      activity: f.activity,
      start: iso,
      place: f.place.trim(),
      route: f.route.trim(),
      distance: f.distance.trim(),
      pace: f.pace,
      noDrop: f.noDrop,
      capacity: Number(f.capacity) || undefined,
      leaderId: leader?.id,
      leaderName: leader?.name,
      details: f.details.trim(),
    };
    update((d) => {
      const x = d.events.find((e) => e.id === evId);
      if (x) Object.assign(x, fields);
      else d.events.push({ ...(fields as AppEvent), id: evId, accountId: account.id, kind: 'club', status: 'scheduled', going: 1, createdAt: new Date().toISOString() });
      log(d, existing ? `edited ${fields.title}` : `created ${fields.title}`);
    });
    toast(existing ? 'Changes saved. Everyone going was updated.' : `${fields.title} is on the club calendar`);
    go(`/events/${evId}`);
  };

  return (
    <>
      <PageHead back={{ href: existing ? `#/events/${existing.id}` : '#/club', label: existing ? existing.title : 'Club' }} title={existing ? 'Edit club event' : 'Create club event'} sub={`Shows in the app as a Club event from ${club.name}.`} />
      <div className="cols">
        <Card className="cols__main">
          <div className="form">
            <div className="grid-2 grid-2--wide-left">
              <Field label="Event name" error={err('title')}>
                {(fid) => <input id={fid} className="input" placeholder="Saturday Shakeout Ride" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />}
              </Field>
              <Field label="Activity">
                {(fid) => (
                  <select id={fid} className="input" value={f.activity} onChange={(e) => setF({ ...f, activity: e.target.value })}>
                    {ACTIVITIES.map((a) => (
                      <option key={a}>{a}</option>
                    ))}
                  </select>
                )}
              </Field>
            </div>
            <div className="grid-3">
              <Field label="Date" error={err('date')}>
                {(fid) => <input id={fid} className="input" type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />}
              </Field>
              <Field label="Start time">{(fid) => <input id={fid} className="input" type="time" value={f.time} onChange={(e) => setF({ ...f, time: e.target.value })} />}</Field>
              <Field label="Meet at" error={err('place')}>
                {(fid) => <input id={fid} className="input" placeholder="Grand Army Plaza" value={f.place} onChange={(e) => setF({ ...f, place: e.target.value })} />}
              </Field>
            </div>
            <div className="grid-3">
              <Field label="Route">{(fid) => <input id={fid} className="input" placeholder="Prospect Park Loop" value={f.route} onChange={(e) => setF({ ...f, route: e.target.value })} />}</Field>
              <Field label="Distance">{(fid) => <input id={fid} className="input" placeholder="12 mi" value={f.distance} onChange={(e) => setF({ ...f, distance: e.target.value })} />}</Field>
              <Field label="Pace">
                {(fid) => (
                  <select id={fid} className="input" value={f.pace} onChange={(e) => setF({ ...f, pace: e.target.value })}>
                    {PACES.map((p) => (
                      <option key={p}>{p}</option>
                    ))}
                  </select>
                )}
              </Field>
            </div>
            <div className="grid-3">
              <Field label="Ride leader">
                {(fid) => (
                  <select id={fid} className="input" value={f.leaderId} onChange={(e) => setF({ ...f, leaderId: e.target.value })}>
                    {leaders.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} · {t.role}
                      </option>
                    ))}
                  </select>
                )}
              </Field>
              <Field label="Spots" hint="Leave blank for no cap.">
                {(fid) => <input id={fid} className="input" inputMode="numeric" value={f.capacity} onChange={(e) => setF({ ...f, capacity: e.target.value.replace(/\D/g, '') })} />}
              </Field>
              <div className="field">
                <span className="field__label">No-drop</span>
                <div className="switch-row">
                  <Switch on={f.noDrop} onChange={() => setF({ ...f, noDrop: !f.noDrop })} label="No-drop" />
                  <span className="muted small">{f.noDrop ? 'Nobody gets left behind' : 'Riders may split up'}</span>
                </div>
              </div>
            </div>
            <Field label="What to expect">
              {(fid) => <textarea id={fid} rows={3} className="input textarea" placeholder="Coffee stop at the halfway point. Lights required after dark." value={f.details} onChange={(e) => setF({ ...f, details: e.target.value })} />}
            </Field>
            <div className="row-gap">
              <Button size="lg" onClick={save}>
                {existing ? 'Save changes' : 'Publish club event'}
              </Button>
              <LinkButton href={existing ? `#/events/${existing.id}` : '#/club'} kind="secondary" size="lg">
                Cancel
              </LinkButton>
            </div>
          </div>
        </Card>
        <div className="cols__side">
          <Card title="Ride leader">
            {(() => {
              const l = team.find((t) => t.id === f.leaderId);
              return l ? (
                <div className="person">
                  <Avatar initials={l.initials} color={l.color} size={40} />
                  <span>
                    <span className="row-title">{l.name}</span>
                    <span className="row-meta">Runs the day: attendance, ride chat and updates</span>
                  </span>
                </div>
              ) : (
                <p className="muted">Pick someone from your team.</p>
              );
            })()}
          </Card>
          <Card title="Club rides vs. community rides">
            <p className="muted">Club events are run by your team and labeled Club in the app. Event data stays with you. Members can also host their own community rides, which aren’t run by the club.</p>
          </Card>
        </div>
      </div>
    </>
  );
}
