import { useState, type FormEvent, type ReactNode } from 'react';
import { Icon } from '../components/Icon';
import { Button, Checkbox, Field } from '../components/ui';
import { createAccount, useStore } from '../store';
import { go } from '../router';
import { CATEGORIES } from '../lib';

function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="auth">
      <div className="auth__hero">
        <div className="auth__brand">
          A Good Fit <span>for Business</span>
        </div>
        <h1>Bring your event to the people who move.</h1>
        <p>Feature your classes, runs and pop-ups to active members near you, and see how many show up.</p>
        <ul>
          <li>
            <Icon name="check" size={18} color="var(--clay-tint)" stroke={2.6} /> Reach members by neighborhood and activity
          </li>
          <li>
            <Icon name="check" size={18} color="var(--clay-tint)" stroke={2.6} /> Clear “Featured” labels members trust
          </li>
          <li>
            <Icon name="check" size={18} color="var(--clay-tint)" stroke={2.6} /> Partners can start and run their own club
          </li>
        </ul>
        <div className="auth__fine">Featured events follow our Community Guidelines and are reviewed before going live.</div>
      </div>
      <div className="auth__panel">{children}</div>
    </div>
  );
}

export function Login() {
  const { state, update } = useStore();
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');

  const signIn = (address: string) => {
    const match = state.accounts.find((a) => a.email.toLowerCase() === address.trim().toLowerCase());
    if (!match) {
      setErr('We couldn’t find a business account with that email.');
      return;
    }
    update((d) => {
      d.signedIn = true;
      d.accountId = match.id;
      d.viewAs = undefined;
    });
    go('/overview');
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!email.includes('@') || pw.length < 1) {
      setErr('Enter your work email and password.');
      return;
    }
    signIn(email);
  };

  return (
    <AuthLayout>
      <form className="auth__form" onSubmit={submit} noValidate>
        <div>
          <h2>Log in</h2>
          <p className="muted">Welcome back. Your events and club are where you left them.</p>
        </div>
        <Field label="Work email">{(id) => <input id={id} className="input" type="email" autoComplete="email" placeholder="you@lumenyoga.com" value={email} onChange={(e) => { setEmail(e.target.value); setErr(''); }} />}</Field>
        <Field label="Password" error={err}>
          {(id) => <input id={id} className="input" type="password" autoComplete="current-password" placeholder="Your password" value={pw} onChange={(e) => { setPw(e.target.value); setErr(''); }} />}
        </Field>
        <Button type="submit" size="lg">
          Log in
        </Button>
        <p className="muted">
          New to A Good Fit for Business? <a href="#/signup">Create an account</a>
        </p>

        <div className="samples">
          <div className="samples__head">
            <b>Prototype sample logins</b>
            <span className="muted small">Tap one to sign in. Any password works.</span>
          </div>
          {state.accounts.map((a) => (
            <button type="button" key={a.id} className="samples__row" onClick={() => signIn(a.email)}>
              <span className="avatar avatar--sq" style={{ width: 32, height: 32, background: a.color, fontSize: 12 }} aria-hidden="true">
                {a.initials}
              </span>
              <span className="grow">
                <span className="row-title">{a.name}</span>
                <span className="row-meta">{a.email}</span>
              </span>
              <span className={'tag ' + (a.kind === 'house' ? 'tag--olive' : a.status === 'offboarded' ? 'tag--muted' : !a.verified ? 'tag--gold' : 'tag--muted')}>
                {a.kind === 'house' ? 'Super admin' : a.status === 'offboarded' ? 'Offboarded' : !a.verified ? 'Pending' : a.plan === 'Partner' ? 'Partner' : 'Pay as you go'}
              </span>
            </button>
          ))}
        </div>
      </form>
    </AuthLayout>
  );
}

export function Signup() {
  const { update, toast } = useStore();
  const [f, setF] = useState({ name: '', person: '', category: CATEGORIES[0], address: '', web: '', email: '', pw: '' });
  const [agree, setAgree] = useState(false);
  const [tried, setTried] = useState(false);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  const errors = {
    name: f.name.trim().length < 2 ? 'Add your business name.' : '',
    person: f.person.trim().length < 2 ? 'Add your name.' : '',
    address: f.address.trim().length < 5 ? 'Add the address members will come to.' : '',
    email: /.+@.+\..+/.test(f.email) ? '' : 'Use an email like you@yourstudio.com.',
    pw: f.pw.length >= 8 ? '' : 'Use at least 8 characters.',
  };
  const ok = Object.values(errors).every((x) => !x) && agree;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (!ok) return;
    update((d) => {
      createAccount(d, { name: f.name.trim(), person: f.person.trim(), category: f.category, address: f.address.trim(), web: f.web.trim(), email: f.email.trim() });
    });
    toast('Account created. We’ll verify it within 1 business day.');
    go('/overview');
  };

  const err = (k: keyof typeof errors) => (tried ? errors[k] : '');

  return (
    <AuthLayout>
      <form className="auth__form" onSubmit={submit} noValidate>
        <div>
          <h2>Create your business account</h2>
          <p className="muted">Takes about 3 minutes. We verify every business within 1 business day.</p>
        </div>
        <div className="grid-2">
          <Field label="Business name" error={err('name')}>
            {(id) => <input id={id} className="input" placeholder="Lumen Yoga Studio" value={f.name} onChange={set('name')} />}
          </Field>
          <Field label="Your name" error={err('person')}>
            {(id) => <input id={id} className="input" autoComplete="name" placeholder="Maya Ortiz" value={f.person} onChange={set('person')} />}
          </Field>
        </div>
        <Field label="Category">
          {(id) => (
            <select id={id} className="input" value={f.category} onChange={set('category')}>
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          )}
        </Field>
        <div className="grid-2 grid-2--wide-left">
          <Field label="Address" error={err('address')}>
            {(id) => <input id={id} className="input" autoComplete="street-address" placeholder="88 DeKalb Ave, Brooklyn, NY" value={f.address} onChange={set('address')} />}
          </Field>
          <Field label="Website or Instagram">{(id) => <input id={id} className="input" placeholder="@lumenyogabk" value={f.web} onChange={set('web')} />}</Field>
        </div>
        <div className="grid-2">
          <Field label="Work email" error={err('email')}>
            {(id) => <input id={id} className="input" type="email" autoComplete="email" placeholder="you@lumenyoga.com" value={f.email} onChange={set('email')} />}
          </Field>
          <Field label="Password" error={err('pw')}>
            {(id) => <input id={id} className="input" type="password" autoComplete="new-password" placeholder="At least 8 characters" value={f.pw} onChange={set('pw')} />}
          </Field>
        </div>
        <div className="agree">
          <Checkbox on={agree} onChange={() => setAgree(!agree)} label="Agree to the Community Guidelines and Featured Events Policy" />
          <span>
            I agree to the Community Guidelines and the Featured Events Policy. Featured events are labeled and reviewed before going live.
          </span>
        </div>
        {tried && !agree && <p className="field__error">Please agree to the guidelines to continue.</p>}
        <Button type="submit" size="lg">
          Create business account
        </Button>
        <p className="muted">
          Already have an account? <a href="#/login">Log in</a>
        </p>
      </form>
    </AuthLayout>
  );
}

export function Discontinued() {
  const { state, update } = useStore();
  const a = state.accounts.find((x) => x.id === state.accountId);
  return (
    <AuthLayout>
      <div className="auth__form">
        <div>
          <h2>{a?.name} is no longer on A Good Fit for Business</h2>
          <p className="muted">
            This account was discontinued{a?.offboardedAt ? ` on ${new Date(a.offboardedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}` : ''}. Its events have ended and there are no more charges.
          </p>
        </div>
        <p>We sent the details to {a?.email}. If you think this is a mistake, reply to that email and our team will take a look.</p>
        <div>
          <Button
            kind="secondary"
            onClick={() => {
              update((d) => {
                d.signedIn = false;
              });
              go('/login');
            }}
          >
            Back to log in
          </Button>
        </div>
      </div>
    </AuthLayout>
  );
}
