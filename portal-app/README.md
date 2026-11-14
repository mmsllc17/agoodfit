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
| `#/overview` | Stats, coming up, featured events, suggestions waiting, plan usage |
| `#/events`, `#/events/:id` | All club and featured events by Upcoming, Drafts and review, Past. Event pages show results for featured events and details for club events |
| `#/feature`, `#/feature/:id` | Feature an event: details, audience, package, live preview, submit for review or save a draft |
| `#/club`, `#/club/new`, `#/club/edit/:id` | Start a club (Partner and house only), edit the club page, pin an announcement, create and edit club events |
| `#/suggestions` | Approve or decline member-suggested rides, and handle rides using the club's name |
| `#/team` | People and roles, invites, the permission grid, the activity log |
| `#/billing` | Plan, upgrade or switch, invoices. House account has no billing |
| `#/settings` | Business profile, notifications, reset sample data |

Two sample accounts sit in the account switcher:

- **Lumen Yoga Studio:** an outside business on the Partner plan. You're signed in as an Admin, so billing is read-only, which shows permissions at work.
- **GoodCo Bike Club:** the house account with the club, suggestions and full team. You're signed in as an Owner.

## How it's built

- React 18, TypeScript, Vite. No UI library.
- `src/styles/tokens.css` is generated from the design system's `tokens.json`, and every color, radius and shadow uses those variables.
- `src/store.tsx` holds all state in one place and saves it to `localStorage`. Each page changes data through `update()`.
- `src/seed.ts` is the sample data, built relative to today so dates always look current.
- `src/types.ts` mirrors the data model in the technical requirements: accounts, clubs, events, suggestions, team roles, the permission grid, activity, invoices.
- `src/lib.ts` has the shared rules: packages and prices, the default permission grid, reach estimate and date formatting.
- Routing is a small hash router in `src/router.ts`, so the build runs on any static host.

## Connecting a real backend

Every write goes through `update()` in a page, next to a `log()` call for the activity log. To go live, swap each of those for an API call and load state from the server instead of `seed()`. The server must also enforce what the UI enforces today:

- **Permissions.** The `can()` check in `useAccount()` hides or disables actions by role. The server has to check the same grid on every request.
- **Partner limits.** Partner allows 4 featured events a month, and only Partner and house accounts can start a club.
- **Charges.** Featured events are charged only after approval.
- **Review.** The "Approve now" button on an event in review is a prototype shortcut. In production, approval comes from the internal review queue.
- **Privacy.** Partners see counts only. Never member names, ages or dating status.

Prices are placeholders while pricing is finalized.
