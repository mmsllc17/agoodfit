import { useState } from 'react';
import { Button, Card, Field, Modal, Notice, PageHead, Switch } from '../components/ui';
import { useAccount, useStore } from '../store';
import { go } from '../router';
import { CATEGORIES, initialsOf } from '../lib';
import type { NotifPrefs } from '../types';

const NOTIFS: { id: keyof NotifPrefs; label: string; sub: string }[] = [
  { id: 'review', label: 'Review updates', sub: 'When a featured event is approved or needs changes' },
  { id: 'suggestions', label: 'New suggestions', sub: 'When a member suggests a ride or class to your club' },
  { id: 'weekly', label: 'Weekly results', sub: 'A Monday email with views, RSVPs and check-ins' },
  { id: 'billing', label: 'Billing', sub: 'Receipts and renewal reminders' },
];

export function Settings() {
  const { account, me, state, update, toast, log } = useAccount();
  const { reset } = useStore();
  const canEdit = me?.role === 'Owner' || me?.role === 'Admin';
  const [f, setF] = useState({ name: account.name, category: account.category, address: account.address, web: account.web, email: account.email });
  const [confirmReset, setConfirmReset] = useState(false);
  const prefs = state.notif[account.id];
  const dirty = JSON.stringify(f) !== JSON.stringify({ name: account.name, category: account.category, address: account.address, web: account.web, email: account.email });

  const save = () => {
    if (f.name.trim().length < 2) {
      toast('Add a business name.');
      return;
    }
    update((d) => {
      const a = d.accounts.find((x) => x.id === account.id)!;
      Object.assign(a, { ...f, name: f.name.trim(), initials: a.kind === 'house' ? a.initials : initialsOf(f.name).slice(0, a.initials.length) });
      log(d, 'updated the business profile');
    });
    toast('Profile saved');
  };

  return (
    <>
      <PageHead eyebrow={account.name} title="Settings" />
      <div className="cols">
        <div className="cols__main">
          <Card title="Business profile" sub="Members see this on your featured events and club page.">
            {!canEdit && <Notice>Only owners and admins can edit the profile.</Notice>}
            <fieldset className="form" disabled={!canEdit}>
              <div className="grid-2">
                <Field label="Business name">{(id) => <input id={id} className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />}</Field>
                <Field label="Category">
                  {(id) => (
                    <select id={id} className="input" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
                      {CATEGORIES.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  )}
                </Field>
              </div>
              <div className="grid-2 grid-2--wide-left">
                <Field label="Address">{(id) => <input id={id} className="input" value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} />}</Field>
                <Field label="Website or Instagram">{(id) => <input id={id} className="input" value={f.web} onChange={(e) => setF({ ...f, web: e.target.value })} />}</Field>
              </div>
              <Field label="Work email" hint="Where we send review updates and receipts.">
                {(id) => <input id={id} className="input" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />}
              </Field>
              <div>
                <Button disabled={!dirty} onClick={save}>
                  Save changes
                </Button>
              </div>
            </fieldset>
          </Card>

          <Card title="Notifications" sub={`For you on ${account.name}`} pad={false}>
            <div className="table">
              {NOTIFS.map((n) => (
                <div className="table__row" key={n.id}>
                  <span className="grow">
                    <span className="row-title">{n.label}</span>
                    <span className="row-meta">{n.sub}</span>
                  </span>
                  <Switch
                    on={prefs[n.id]}
                    label={n.label}
                    onChange={() =>
                      update((d) => {
                        d.notif[account.id][n.id] = !d.notif[account.id][n.id];
                      })
                    }
                  />
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="cols__side">
          <Card title="Verification">
            <p className="muted">{account.verified ? `${account.name} is a verified business. Members see a Verified label on your events.` : 'We’re verifying your business. This usually takes 1 business day.'}</p>
          </Card>
          <Card title="Prototype">
            <p className="muted">This portal runs on sample data saved in your browser. Reset it to start over with the original accounts and events.</p>
            <Button kind="outline" size="sm" icon="refresh" onClick={() => setConfirmReset(true)}>
              Reset sample data
            </Button>
          </Card>
          <Card title="Account">
            <Button
              kind="secondary"
              size="sm"
              icon="logout"
              onClick={() => {
                update((d) => {
                  d.signedIn = false;
                });
                go('/login');
              }}
            >
              Sign out
            </Button>
          </Card>
        </div>
      </div>

      {confirmReset && (
        <Modal
          title="Reset sample data?"
          onClose={() => setConfirmReset(false)}
          footer={
            <>
              <Button kind="secondary" onClick={() => setConfirmReset(false)}>
                Cancel
              </Button>
              <Button
                kind="danger"
                onClick={() => {
                  reset();
                  setConfirmReset(false);
                  go('/overview');
                  toast('Sample data reset');
                }}
              >
                Reset
              </Button>
            </>
          }
        >
          <p>Everything you’ve added or changed in this prototype goes back to the starting sample data. Accounts you created will be removed.</p>
        </Modal>
      )}
    </>
  );
}
