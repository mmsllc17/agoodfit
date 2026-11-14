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

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!email.includes('@') || pw.length < 1) {
      setErr('Enter your work email and password.');
      return;
    }
    const match = state.accounts.find((a) => a.email.toLowerCase() === email.trim().toLowerCase());
    update((d) => {
      d.signedIn = true;
      if (match) d.accountId = match.id;
    });
    go('/overview');
  };

  return (
    <AuthLayout>
      <form className="auth__form" onSubmit={submit} noValidate>
        <div>
          <h2>Log in</h2>
          <p className="muted">Welcome back. Your events and club are where you left them.</p>
        </div>
        <Field label="Work email">{(id) => <input id={id} className="input" type="email" autoComplete="email" placeholder="you@lumenyoga.com" value={email} onChange={(e) => setEmail(e.target.value)} />}</Field>
        <Field label="Password" error={err}>
          {(id) => <input id={id} className="input" type="password" autoComplete="current-password" placeholder="Your password" value={pw} onChange={(e) => setPw(e.target.value)} />}
        </Field>
        <Button type="submit" size="lg">
          Log in
        </Button>
        <p className="muted small">This is a prototype, so any email and password will work.</p>
        <p className="muted">
          New to A Good Fit for Business? <a href="#/signup">Create an account</a>
        </p>
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
