import { Sidebar } from './components/Sidebar';
import { Empty, LinkButton } from './components/ui';
import { Icon } from './components/Icon';
import { useStore } from './store';
import { match, useRoute } from './router';
import { Login, Signup } from './pages/Auth';
import { Overview } from './pages/Overview';
import { EventDetail, Events } from './pages/Events';
import { Feature } from './pages/Feature';
import { ClubEventForm, ClubPage } from './pages/Club';
import { Suggestions } from './pages/Suggestions';
import { Team } from './pages/Team';
import { Billing } from './pages/Billing';
import { Settings } from './pages/Settings';
import { PartnerDetail, Partners } from './pages/Partners';
import { Discontinued } from './pages/Auth';

function Page({ path }: { path: string }) {
  const [p, qs] = path.split('?');
  const query = new URLSearchParams(qs ?? '');
  let m;
  if (p === '/overview') return <Overview />;
  if (p === '/events') return <Events query={query} />;
  if ((m = match('/events/:id', p))) return <EventDetail id={m.id} />;
  if (p === '/feature') return <Feature />;
  if ((m = match('/feature/:id', p))) return <Feature id={m.id} />;
  if (p === '/club') return <ClubPage />;
  if (p === '/club/new') return <ClubEventForm />;
  if ((m = match('/club/edit/:id', p))) return <ClubEventForm id={m.id} />;
  if (p === '/partners') return <Partners />;
  if ((m = match('/partners/:id', p))) return <PartnerDetail id={m.id} />;
  if (p === '/suggestions') return <Suggestions />;
  if (p === '/team') return <Team />;
  if (p === '/billing') return <Billing />;
  if (p === '/settings') return <Settings />;
  return (
    <Empty icon="overview" title="Page not found" action={<LinkButton href="#/overview">Go to Overview</LinkButton>}>
      That link doesn’t go anywhere in the portal.
    </Empty>
  );
}

export function App() {
  const path = useRoute();
  const { state, toasts } = useStore();
  const current = state.accounts.find((a) => a.id === state.accountId);

  let body;
  if (path === '/signup') body = <Signup />;
  else if (path === '/login' || !state.signedIn || !current) body = <Login />;
  else if (current.status === 'offboarded') body = <Discontinued />;
  else
    body = (
      <div className="shell">
        <Sidebar path={path} />
        <main className="main" key={state.accountId + path.split('?')[0]}>
          <div className="main__inner">
            <Page path={path} />
          </div>
        </main>
      </div>
    );

  return (
    <>
      {body}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div className="toast" key={t.id}>
            <Icon name="check" size={16} color="#C9D4AE" stroke={2.4} />
            {t.text}
          </div>
        ))}
      </div>
    </>
  );
}
