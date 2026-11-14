# A Good Fit for Business: partner portal

The desktop web app where partner businesses and the GoodCo house account feature events, run their club and manage their team.

This is a working front end on sample data. Everything clicks through and saves in the browser, but there is no server yet: no real sign-in, payments, review queue or member data.

**Live:** https://mmsllc17.github.io/agoodfit/portal/

## Run it

```
cd portal-app
npm install
npm run dev      # local dev server
npm run build    # type-checks, then builds into ../portal (served by GitHub Pages)
```

## What's in it

| Route | Page |
| --- | --- |
| `#/login`, `#/signup` | Log in and create a business account (new accounts start unverified on Pay as you go) |
| `#/partners`, `#/partners/:id` | House account only: every partner, the featured-event review queue, verify, discontinue (offboard) and reactivate |
| `#/analytics`, `#/analytics?view=:id` | Partners see their own analytics (featured views, RSVPs, check-ins, spend, audience, club). The house account also gets platform analytics (members, partners and revenue, featured events) for 30 or 90 days, and the same view for any single partner or the house account |
| `#/overview` | Stats, coming up, featured events, suggestions waiting, plan usage |
| `#/events`, `#/events/:id` | All club and featured events by Upcoming, Drafts and review, Past. Event pages show results for featured events and details for club events |
| `#/feature`, `#/feature/:id` | Feature an event: details, audience, package, live preview, submit for review or save a draft |
| `#/club`, `#/club/new`, `#/club/edit/:id` | Start a club (Partner and house only), edit the club page, pin an announcement, create and edit club events |
| `#/suggestions` | Approve or decline member-suggested rides, and handle rides using the club's name |
| `#/team` | People and roles, invites, the permission grid, the activity log |
| `#/billing` | Plan, upgrade or switch, invoices. House account has no billing |
| `#/settings` | Business profile, notifications, reset sample data |

Each business has one account and only ever sees its own data. There is no account switcher.

The GoodCo Bike Club house account is the super admin. It runs its own club like any partner, and also gets a Partners area to see every business that signed up, verify new ones, approve or send back featured events, and discontinue (offboard) or reactivate a partner. Offboarding blocks the partner's sign-in, ends their live and upcoming events, and stops future charges.

For support, the house account can **View as partner**: it opens that partner's portal exactly as they see it, read-only, under a banner with an Exit button. Every visit is logged in both accounts' activity. Nothing can be changed in this mode (`update()` is blocked and `can()` returns false).

The login page lists sample logins for testing: GoodCo (super admin), Lumen Yoga Studio and Pedal & Pour (Partner plan), Ironside Strength (Pay as you go), Greenleaf Juice Bar (waiting for verification) and Tidewater Pilates (offboarded). Any password works.

## How it's built

- React 18, TypeScript, Vite. No UI library.
- `src/styles/tokens.css` is generated from the design system's `tokens.json`, and every color, radius and shadow uses those variables.
- `src/store.tsx` holds all state in one place and saves it to `localStorage`. Each page changes data through `update()`.
- `src/seed.ts` is the sample data, built relative to today so dates always look current.
- `src/types.ts` mirrors the data model in the technical requirements: accounts, clubs, events, suggestions, team roles, the permission grid, activity, invoices.
- `src/analytics.ts` builds the analytics numbers. Partner, featured-event and revenue figures come from portal data; member and app figures are sample series until the app's data is connected.
- `src/lib.ts` has the shared rules: packages and prices, the default permission grid, reach estimate and date formatting.
- Routing is a small hash router in `src/router.ts`, so the build runs on any static host.

## Connecting a real backend

Every write goes through `update()` in a page, next to a `log()` call for the activity log. To go live, swap each of those for an API call and load state from the server instead of `seed()`. The server must also enforce what the UI enforces today:

- **Permissions.** The `can()` check in `useAccount()` hides or disables actions by role. The server has to check the same grid on every request.
- **Partner limits.** Partner allows 4 featured events a month, and only Partner and house accounts can start a club.
- **Charges.** Featured events are charged only after approval.
- **Admin.** Only the house account can reach Partners. Verifying, approving, offboarding and reactivating must be admin-only on the server, and offboarding must revoke the partner's sessions. View as partner must be read-only on the server too, and logged.
- **Privacy.** Partners see counts only. Never member names, ages or dating status.

Prices are placeholders while pricing is finalized.
