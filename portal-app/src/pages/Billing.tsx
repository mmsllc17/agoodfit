import { useState } from 'react';
import { Icon } from '../components/Icon';
import { Button, Card, Meter, Modal, Notice, PageHead } from '../components/ui';
import { useAccount } from '../store';
import { daysFromToday, fmtLong, fmtShort, money, PACKAGES, PARTNER_EVENTS_PER_MONTH, PARTNER_MONTHLY, uid } from '../lib';

export function Billing() {
  const { account, events, state, update, toast, log, can, owner } = useAccount();
  const [confirm, setConfirm] = useState<'upgrade' | 'downgrade' | null>(null);
  const invoices = state.invoices.filter((i) => i.accountId === account.id).sort((a, b) => +new Date(b.date) - +new Date(a.date));
  const canBill = can('billing');
  const used = events.filter((e) => e.kind === 'featured' && e.pkg === 'partner' && e.status !== 'draft' && new Date(e.featureStart ?? e.createdAt).getMonth() === new Date().getMonth()).length;

  if (account.kind === 'house') {
    return (
      <>
        <PageHead eyebrow={`${account.name} · Parent company`} title="Billing" />
        <Card className="success">
          <span className="icon-circle icon-circle--olive">
            <Icon name="check" size={24} stroke={2.4} />
          </span>
          <h2 className="card-display">House account, no billing</h2>
          <p className="muted">{account.name} runs A Good Fit, so this account has every Partner feature, featured events are free, and there’s nothing to pay.</p>
        </Card>
      </>
    );
  }

  const isPartner = account.plan === 'Partner';

  const upgrade = () => {
    update((d) => {
      const a = d.accounts.find((x) => x.id === account.id)!;
      a.plan = 'Partner';
      a.renewsOn = daysFromToday(30);
      d.invoices.push({ id: uid('in'), accountId: account.id, date: new Date().toISOString(), desc: 'Partner plan · monthly', amount: PARTNER_MONTHLY, status: 'Paid' });
      log(d, 'upgraded to the Partner plan');
    });
    toast('You’re on Partner. You can start a club now.');
    setConfirm(null);
  };

  const downgrade = () => {
    update((d) => {
      const a = d.accounts.find((x) => x.id === account.id)!;
      a.plan = 'Pay as you go';
      log(d, 'switched to Pay as you go');
    });
    toast(`Switched. Partner features stay on until ${account.renewsOn ? fmtShort(account.renewsOn) : 'the end of the period'}.`);
    setConfirm(null);
  };

  return (
    <>
      <PageHead eyebrow={account.name} title="Billing" />
      {!canBill && (
        <Notice>
          You can see billing, but only owners can change it. {owner ? `Ask ${owner.name.split(' ')[0]} to make changes.` : ''}
        </Notice>
      )}

      <div className="cols">
        <div className="cols__main">
          <Card
            title={isPartner ? 'Partner plan' : 'Pay as you go'}
            sub={isPartner ? `${money(PARTNER_MONTHLY)} a month${account.renewsOn ? ` · Renews ${fmtLong(account.renewsOn)}` : ''}` : 'Pay per featured event. No monthly fee.'}
            action={<span className={'tag ' + (isPartner ? 'tag--olive' : 'tag--muted')}>{isPartner ? 'Active' : 'Current plan'}</span>}
          >
            {isPartner ? (
              <>
                <p className="muted">
                  {used} of {PARTNER_EVENTS_PER_MONTH} featured events used this month. Extra events use Spotlight or Boost pricing.
                </p>
                <Meter value={used} max={PARTNER_EVENTS_PER_MONTH} tone="gold" />
                <ul className="ticks">
                  <li>Up to 4 featured events a month on Events, Home and the Community hub</li>
                  <li>Start and run a club, with club events and member suggestions</li>
                  <li>A monthly results report</li>
                </ul>
                {canBill && (
                  <Button kind="ghost" size="sm" onClick={() => setConfirm('downgrade')}>
                    Switch to Pay as you go
                  </Button>
                )}
              </>
            ) : (
              <>
                <div className="price-list">
                  {PACKAGES.filter((p) => p.id !== 'partner').map((p) => (
                    <div key={p.id} className="price-list__row">
                      <span className="row-title">{p.name}</span>
                      <span className="row-meta">
                        {p.runs} · {p.where}
                      </span>
                      <span className="num">{p.priceLabel}</span>
                    </div>
                  ))}
                </div>
                <div className="upsell">
                  <div>
                    <div className="row-title">Partner · {money(PARTNER_MONTHLY)} a month</div>
                    <div className="row-meta">Up to 4 featured events a month, plus your own club.</div>
                  </div>
                  {canBill && <Button onClick={() => setConfirm('upgrade')}>Upgrade to Partner</Button>}
                </div>
              </>
            )}
          </Card>

          <Card title="Invoices" pad={false}>
            {invoices.length ? (
              <div className="table">
                <div className="table__head grid-inv">
                  <span>Date</span>
                  <span>Description</span>
                  <span>Amount</span>
                  <span>Status</span>
                  <span />
                </div>
                {invoices.map((i) => (
                  <div className="table__row grid-inv" key={i.id}>
                    <span className="row-meta">{fmtShort(i.date)}</span>
                    <span className="row-title">{i.desc}</span>
                    <span className="num">{money(i.amount)}</span>
                    <span>
                      <span className={'tag ' + (i.status === 'Paid' ? 'tag--olive' : 'tag--gold')}>{i.status}</span>
                    </span>
                    <span className="right">
                      {i.status === 'Paid' && (
                        <button type="button" className="link" onClick={() => toast('Receipts download as PDFs in the real portal')}>
                          Receipt
                        </button>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted card-pad">No invoices yet. You’re only charged once a featured event is approved.</p>
            )}
          </Card>
        </div>

        <div className="cols__side">
          <Card title="Payment method">
            {isPartner || invoices.length ? (
              <div className="person">
                <span className="icon-circle icon-circle--muted">
                  <Icon name="card" size={20} />
                </span>
                <span>
                  <span className="row-title">Card on file</span>
                  <span className="row-meta">Managed by our payment provider</span>
                </span>
              </div>
            ) : (
              <p className="muted">Add a card when you submit your first featured event.</p>
            )}
            {canBill && (
              <Button kind="outline" size="sm" onClick={() => toast('This opens the secure payment page in the real portal')}>
                Update payment method
              </Button>
            )}
          </Card>
          <Card title="How billing works">
            <ul className="ticks">
              <li>Featured events are charged only after they’re approved.</li>
              <li>Partner renews monthly. Cancel any time and keep it until the period ends.</li>
              <li>Prices are placeholders while pricing is finalized.</li>
            </ul>
          </Card>
        </div>
      </div>

      {confirm === 'upgrade' && (
        <Modal
          title="Upgrade to Partner?"
          onClose={() => setConfirm(null)}
          footer={
            <>
              <Button kind="secondary" onClick={() => setConfirm(null)}>
                Not now
              </Button>
              <Button onClick={upgrade}>Upgrade for {money(PARTNER_MONTHLY)} a month</Button>
            </>
          }
        >
          <p>You’ll be charged {money(PARTNER_MONTHLY)} today and every month after. You get up to 4 featured events a month and can start a club right away.</p>
          <p className="muted small">Prototype: no card is charged.</p>
        </Modal>
      )}
      {confirm === 'downgrade' && (
        <Modal
          title="Switch to Pay as you go?"
          onClose={() => setConfirm(null)}
          footer={
            <>
              <Button kind="secondary" onClick={() => setConfirm(null)}>
                Keep Partner
              </Button>
              <Button kind="danger" onClick={downgrade}>
                Switch
              </Button>
            </>
          }
        >
          <p>You won’t be charged again. Your club stays visible, but you won’t be able to create new club events once the current period ends.</p>
        </Modal>
      )}
    </>
  );
}
