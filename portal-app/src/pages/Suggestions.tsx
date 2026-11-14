import { useState } from 'react';
import { Avatar, Badge, Button, Card, Empty, Notice, PageHead } from '../components/ui';
import { useAccount } from '../store';
import { fmtWhen, uid } from '../lib';
import type { Suggestion } from '../types';

export function Suggestions() {
  const { account, club, suggestions, state, update, toast, log, can } = useAccount();
  const [tab, setTab] = useState<'new' | 'done'>('new');
  const flags = state.flags.filter((f) => f.accountId === account.id);

  if (!club) {
    return (
      <>
        <PageHead title="Suggested rides" />
        <Empty icon="inbox" title="Start a club to get suggestions">
          Members suggest rides and classes to clubs. Once you have a club, they land here for your team to approve.
        </Empty>
      </>
    );
  }

  const canApprove = can('approve');
  const waiting = suggestions.filter((s) => s.status === 'new');
  const done = suggestions.filter((s) => s.status !== 'new');
  const list = tab === 'new' ? waiting : done;

  const approve = (s: Suggestion) => {
    const evId = uid('ev');
    update((d) => {
      const x = d.suggestions.find((y) => y.id === s.id)!;
      x.status = 'approved';
      x.eventId = evId;
      const [route, distance, pace] = s.route.split(' · ');
      d.events.push({
        id: evId,
        accountId: account.id,
        kind: 'club',
        title: s.title,
        start: s.start,
        place: s.place,
        details: s.note,
        status: 'scheduled',
        going: 1,
        createdAt: new Date().toISOString(),
        activity: club.activity,
        leaderName: s.memberName,
        route,
        distance,
        pace: pace?.split(',')[0],
        noDrop: /no-drop/i.test(s.route),
        fromSuggestionId: s.id,
      });
      log(d, `approved ${s.memberName.split(' ')[0]}’s suggested ride, ${s.title}`);
    });
    toast(`Approved. ${s.title} is on the club calendar.`);
  };

  const decline = (s: Suggestion) => {
    update((d) => {
      d.suggestions.find((y) => y.id === s.id)!.status = 'declined';
      log(d, `declined ${s.memberName.split(' ')[0]}’s suggested ride, ${s.title}`);
    });
    toast(`Declined. ${s.memberName.split(' ')[0]} got a kind note.`);
  };

  const undo = (s: Suggestion) => {
    update((d) => {
      const x = d.suggestions.find((y) => y.id === s.id)!;
      if (x.eventId) d.events = d.events.filter((e) => e.id !== x.eventId);
      x.status = 'new';
      x.eventId = undefined;
    });
    toast('Undone. It’s back in the queue.');
  };

  return (
    <>
      <PageHead
        eyebrow={account.kind === 'house' ? `${account.name} · Parent company` : account.name}
        title="Suggested rides"
        sub={waiting.length ? `${waiting.length} waiting for review` : 'All caught up'}
      />
      {!canApprove && <Notice>Your role can see suggestions but can’t approve them. Owners can change that on the Team page.</Notice>}

      <div className="cols">
        <div className="cols__main">
          <div className="seg" role="tablist" aria-label="Suggestions">
            <button role="tab" aria-selected={tab === 'new'} className={'seg__btn' + (tab === 'new' ? ' seg__btn--on' : '')} onClick={() => setTab('new')}>
              Waiting <span className="seg__count">{waiting.length}</span>
            </button>
            <button role="tab" aria-selected={tab === 'done'} className={'seg__btn' + (tab === 'done' ? ' seg__btn--on' : '')} onClick={() => setTab('done')}>
              Reviewed <span className="seg__count">{done.length}</span>
            </button>
          </div>

          {list.length === 0 && (
            <Card>
              <Empty icon="inbox" title={tab === 'new' ? 'All caught up' : 'Nothing reviewed yet'}>
                {tab === 'new' ? 'New suggestions from members will show up here.' : 'Approved and declined suggestions show up here.'}
              </Empty>
            </Card>
          )}

          {list.map((s) => (
            <Card key={s.id} className="sugg">
              <div className="sugg__by">
                <Avatar initials={s.initials} color={s.color} size={40} />
                <span className="grow">
                  <span className="row-meta">
                    Suggested by <b className="ink">{s.memberName}</b>
                  </span>
                  <span className="row-meta">{s.history}</span>
                </span>
                {s.status === 'new' ? (
                  <Badge tone="gold" dot>
                    New
                  </Badge>
                ) : s.status === 'approved' ? (
                  <Badge tone="olive" dot>
                    Approved
                  </Badge>
                ) : (
                  <Badge tone="muted" dot>
                    Declined
                  </Badge>
                )}
              </div>
              <h3 className="sugg__title">{s.title}</h3>
              <div className="sugg__meta">
                {fmtWhen(s.start)} · {s.place}
              </div>
              <div className="row-meta">{s.route}</div>
              <blockquote className="quote">“{s.note}”</blockquote>
              {s.status === 'new' ? (
                <div className="sugg__actions">
                  <Button className="grow" disabled={!canApprove} onClick={() => approve(s)}>
                    Approve as club ride
                  </Button>
                  <Button kind="secondary" disabled={!canApprove} onClick={() => decline(s)}>
                    Decline
                  </Button>
                  <Button kind="ghost" onClick={() => toast(`Opened a chat with ${s.memberName.split(' ')[0]} in the app`)}>
                    Message {s.memberName.split(' ')[0]}
                  </Button>
                </div>
              ) : (
                <div className={'outcome outcome--' + s.status}>
                  <span>
                    {s.status === 'approved'
                      ? `Approved. It’s on the club calendar as a Club ride, and ${s.memberName.split(' ')[0]} is ride leader.`
                      : `Declined. ${s.memberName.split(' ')[0]} got a kind note and can still host it as a community ride.`}
                  </span>
                  <span className="row-gap">
                    {s.eventId && (
                      <a className="link-strong" href={`#/events/${s.eventId}`}>
                        View event
                      </a>
                    )}
                    {canApprove && (
                      <button type="button" className="link" onClick={() => undo(s)}>
                        Undo
                      </button>
                    )}
                  </span>
                </div>
              )}
            </Card>
          ))}
        </div>

        <div className="cols__side">
          <Card title="How suggestions work">
            <ol className="steps">
              <li>A member suggests a ride from the app.</li>
              <li>Anyone on your team who can approve suggestions reviews it here.</li>
              <li>Approved rides become Club rides with the member as ride leader. Event data stays with the club.</li>
            </ol>
          </Card>
          <Card title="Using the club’s name" sub={`Community rides that mention ${club.name.split(' ')[0]} but aren’t run by the club.`}>
            {flags.length === 0 && <p className="muted">Nothing flagged.</p>}
            {flags.map((fl) => (
              <div className="flag" key={fl.id}>
                <div className="row-title">{fl.title}</div>
                <div className="row-meta">
                  Community ride by {fl.by} · {fmtWhen(fl.start)}
                </div>
                {fl.status === 'open' ? (
                  <div className="row-gap">
                    <Button
                      size="sm"
                      className="grow"
                      disabled={!can('moderate')}
                      onClick={() => {
                        update((d) => {
                          d.flags.find((y) => y.id === fl.id)!.status = 'asked';
                          log(d, `asked ${fl.by} to rename ${fl.title}`);
                        });
                        toast(`Sent. ${fl.by.split(' ')[0]} was asked to drop the club’s name.`);
                      }}
                    >
                      Ask to rename
                    </Button>
                    <Button
                      size="sm"
                      kind="secondary"
                      disabled={!can('moderate')}
                      onClick={() =>
                        update((d) => {
                          d.flags.find((y) => y.id === fl.id)!.status = 'ok';
                        })
                      }
                    >
                      It’s fine
                    </Button>
                  </div>
                ) : (
                  <p className="row-meta">{fl.status === 'asked' ? `Sent. ${fl.by.split(' ')[0]} was asked to drop the club’s name.` : 'Okay. We won’t flag this ride again.'}</p>
                )}
              </div>
            ))}
          </Card>
        </div>
      </div>
    </>
  );
}
