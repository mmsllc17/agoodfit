import { useMemo, useState } from 'react';
import { Icon } from '../components/Icon';
import { Button, Card, Chip, Empty, Field, LinkButton, Notice, PageHead } from '../components/ui';
import { useAccount } from '../store';
import { go } from '../router';
import { dateInput, estimateReach, fmtDay, fmtTime, INTERESTS, NEIGHBORHOODS, num, PACKAGES, PARTNER_EVENTS_PER_MONTH, pkgInfo, timeInput, toIso, uid, daysFromToday } from '../lib';
import type { AppEvent, PackageId } from '../types';

export function Feature({ id }: { id?: string }) {
  const { account, events, update, toast, can, log, owner } = useAccount();
  const existing = id ? events.find((e) => e.id === id && e.kind === 'featured') : undefined;
  const isHouse = account.kind === 'house';
  const usedThisMonth = events.filter((e) => e.kind === 'featured' && e.pkg === 'partner' && e.status !== 'draft' && new Date(e.featureStart ?? e.createdAt).getMonth() === new Date().getMonth()).length;
  const partnerLeft = account.plan === 'Partner' ? Math.max(0, PARTNER_EVENTS_PER_MONTH - usedThisMonth) : 0;
  const defaultPkg: PackageId = isHouse ? 'house' : partnerLeft > 0 ? 'partner' : 'boost';
  const start = existing ? existing.start : daysFromToday(7, '09:00');

  const [f, setF] = useState({
    title: existing?.title ?? '',
    date: dateInput(start),
    time: timeInput(start),
    place: existing?.place ?? '',
    details: existing?.details ?? '',
    hoods: existing?.hoods ?? [NEIGHBORHOODS[0]],
    interests: existing?.interests ?? [],
    pkg: (existing?.pkg ?? defaultPkg) as PackageId,
  });
  const [tried, setTried] = useState(false);
  const [sent, setSent] = useState<string | null>(null);

  const toggle = (k: 'hoods' | 'interests', v: string) => setF({ ...f, [k]: f[k].includes(v) ? f[k].filter((x) => x !== v) : [...f[k], v] });
  const iso = useMemo(() => (f.date && f.time ? toIso(f.date, f.time) : ''), [f.date, f.time]);

  const errors = {
    title: f.title.trim().length < 3 ? 'Name your event so members know what it is.' : '',
    date: !iso ? 'Pick a date and time.' : new Date(iso).getTime() < Date.now() + 3600000 ? 'Pick a time at least an hour from now.' : '',
    place: f.place.trim().length < 3 ? 'Add where it happens.' : '',
    hoods: f.hoods.length ? '' : 'Pick at least one neighborhood.',
    pkg: f.pkg === 'partner' && partnerLeft === 0 && existing?.pkg !== 'partner' ? 'You’ve used this month’s Partner events. Pick Spotlight or Boost.' : '',
  };
  const ok = Object.values(errors).every((x) => !x);
  const err = (k: keyof typeof errors) => (tried ? errors[k] : '');
  const reach = estimateReach(f.hoods.length, f.interests.length);
  const pkg = pkgInfo(f.pkg);

  if (!can('feature')) {
    return (
      <>
        <PageHead back={{ href: '#/overview', label: 'Overview' }} title="Feature an event" />
        <Notice>
          Your role can’t feature events on {account.name}. {owner ? `Ask ${owner.name.split(' ')[0]} to change your permissions on the Team page.` : 'Ask an owner to change your permissions.'}
        </Notice>
      </>
    );
  }

  if (sent) {
    return (
      <>
        <PageHead back={{ href: '#/overview', label: 'Overview' }} title="Feature an event" />
        <Card className="success">
          <span className="icon-circle icon-circle--olive">
            <Icon name="check" size={24} stroke={2.4} />
          </span>
          <h2 className="card-display">Submitted, in review</h2>
          <p className="muted">
            We’ll email {account.email} when it’s approved, usually within 1 business day.{' '}
            {isHouse ? 'Featured events are free on the house account.' : 'You’re only charged once it’s approved.'}
          </p>
          <div className="row-gap center">
            <LinkButton href={`#/events/${sent}`}>View event</LinkButton>
            <LinkButton href="#/overview" kind="secondary">
              Back to Overview
            </LinkButton>
          </div>
        </Card>
      </>
    );
  }

  const save = (status: 'draft' | 'review') => {
    if (status === 'review') {
      setTried(true);
      if (!ok) {
        toast('A few details need a look before you submit.');
        return;
      }
    } else if (f.title.trim().length < 1) {
      setTried(true);
      toast('Add a name to save a draft.');
      return;
    }
    const evId = existing?.id ?? uid('ev');
    const fields: Partial<AppEvent> = {
      title: f.title.trim(),
      start: iso || daysFromToday(7, '09:00'),
      place: f.place.trim(),
      details: f.details.trim(),
      hoods: f.hoods,
      interests: f.interests,
      pkg: f.pkg,
      status,
    };
    update((d) => {
      const x = d.events.find((e) => e.id === evId);
      if (x) Object.assign(x, fields);
      else d.events.push({ ...(fields as AppEvent), id: evId, accountId: account.id, kind: 'featured', going: 0, createdAt: new Date().toISOString() });
      log(d, status === 'review' ? `submitted ${fields.title} for review` : `saved a draft, ${fields.title}`);
    });
    if (status === 'review') setSent(evId);
    else {
      toast('Draft saved');
      go('/events');
    }
  };

  const pkgs = isHouse ? [] : PACKAGES;

  return (
    <>
      <PageHead back={{ href: '#/overview', label: 'Overview' }} title={existing ? 'Finish your featured event' : 'Feature an event'} />

      <div className="cols">
        <div className="cols__main">
          <Card>
            <h2 className="step">
              <span className="step__n">1</span>Event details
            </h2>
            <div className="form">
              <Field label="Event name" error={err('title')}>
                {(fid) => <input id={fid} className="input" placeholder="Pilates on the Pier" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />}
              </Field>
              <div className="grid-3">
                <Field label="Date" error={err('date')}>
                  {(fid) => <input id={fid} className="input" type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />}
                </Field>
                <Field label="Start time">{(fid) => <input id={fid} className="input" type="time" value={f.time} onChange={(e) => setF({ ...f, time: e.target.value })} />}</Field>
                <Field label="Location" error={err('place')}>
                  {(fid) => <input id={fid} className="input" placeholder="Pier 6, Brooklyn Bridge Park" value={f.place} onChange={(e) => setF({ ...f, place: e.target.value })} />}
                </Field>
              </div>
              <Field label="What to expect" hint="Keep it short and specific: length, level, what to bring, and the price for members.">
                {(fid) => (
                  <textarea id={fid} className="input textarea" rows={3} placeholder="A 50-minute mat Pilates class on the pier. All levels, mats provided. Free for A Good Fit members." value={f.details} onChange={(e) => setF({ ...f, details: e.target.value })} />
                )}
              </Field>
            </div>
          </Card>

          <Card>
            <h2 className="step">
              <span className="step__n">2</span>Who should see it
            </h2>
            <div className="form">
              <div>
                <div className="field__label">Neighborhoods</div>
                <div className="chips">
                  {NEIGHBORHOODS.map((h) => (
                    <Chip key={h} on={f.hoods.includes(h)} onClick={() => toggle('hoods', h)}>
                      {h}
                    </Chip>
                  ))}
                </div>
                {err('hoods') && <p className="field__error">{err('hoods')}</p>}
              </div>
              <div>
                <div className="field__label">Interests</div>
                <div className="chips">
                  {INTERESTS.map((h) => (
                    <Chip key={h} on={f.interests.includes(h)} onClick={() => toggle('interests', h)}>
                      {h}
                    </Chip>
                  ))}
                </div>
              </div>
              <div className="reach">
                <Icon name="eye" size={18} />
                Estimated reach: about {num(reach)} members a week
              </div>
              <p className="muted small">We only target by neighborhood and the interests members choose. Never by age, dating status or health.</p>
            </div>
          </Card>

          {!isHouse && (
            <Card>
              <h2 className="step">
                <span className="step__n">3</span>Choose a package
              </h2>
              <div className="pkgs" role="radiogroup" aria-label="Package">
                {pkgs.map((p) => {
                  const disabled = p.id === 'partner' && (account.plan !== 'Partner' || (partnerLeft === 0 && existing?.pkg !== 'partner'));
                  const on = f.pkg === p.id;
                  return (
                    <button key={p.id} type="button" role="radio" aria-checked={on} disabled={disabled} className={'pkg' + (on ? ' pkg--on' : '')} onClick={() => setF({ ...f, pkg: p.id })}>
                      <span className="pkg__name">{p.name}</span>
                      <span className="pkg__price">{p.id === 'partner' ? (account.plan === 'Partner' ? 'Included' : '$299/mo') : p.priceLabel}</span>
                      <span className="pkg__runs">{p.runs}</span>
                      <span className="pkg__where">{p.where}</span>
                      {p.id === 'partner' && (
                        <span className="pkg__note">{account.plan === 'Partner' ? `${partnerLeft} of ${PARTNER_EVENTS_PER_MONTH} left this month` : 'Partner plan only'}</span>
                      )}
                    </button>
                  );
                })}
              </div>
              {err('pkg') && <p className="field__error">{err('pkg')}</p>}
              <p className="muted small">Prices are placeholders while pricing is finalized.</p>
            </Card>
          )}
        </div>

        <div className="cols__side">
          <div className="sticky">
            <Card>
              <div className="label-row">How members will see it</div>
              <div className="preview">
                <div className="preview__img">
                  <span className="preview__tag">
                    <Icon name="star" size={12} color="var(--gold-deep)" /> Featured
                  </span>
                </div>
                <div className="preview__body">
                  <div className="row-title">{f.title.trim() || 'Your event'}</div>
                  <div className="row-meta">
                    Hosted by {account.name}
                    {account.verified ? ' · Verified business' : ''}
                  </div>
                  <div className="preview__when">
                    {iso ? `${fmtDay(iso)} · ${fmtTime(iso)}` : 'Pick a date'}
                    {f.place.trim() ? ` · ${f.place.split(',')[0]}` : ''}
                  </div>
                </div>
              </div>
              <dl className="summary">
                <dt>Package</dt>
                <dd>{isHouse ? 'House account' : pkg?.name}</dd>
                <dt>Runs</dt>
                <dd>{isHouse ? '7 days' : pkg?.runs}</dd>
                <dt className="summary__total">Total</dt>
                <dd className="summary__total">{isHouse ? 'Free' : f.pkg === 'partner' ? 'Included in Partner' : pkg?.priceLabel}</dd>
              </dl>
              <Button size="lg" className="w-full" onClick={() => save('review')}>
                Submit for review
              </Button>
              <Button kind="ghost" className="w-full" onClick={() => save('draft')}>
                Save as draft
              </Button>
              <p className="muted small">{isHouse ? 'Free on the house account. We still review it within 1 business day.' : 'You’re only charged once it’s approved. We review within 1 business day.'}</p>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}

export function FeatureMissing() {
  return <Empty icon="star" title="That draft isn’t here">It may have been deleted or belong to another account.</Empty>;
}
