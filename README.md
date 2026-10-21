# Qwipo Sales Admin

A rebuild of the Qwipo **Sales Admin** web app (`https://sales-admin.bms.qwipo.com`), in the same stack and with the same UI, so new features can be built on top of it.

The original source repository wasn't available. This codebase was reconstructed from:
- the production front-end bundles,
- the live screens.

Layout, CSS, texts, routes, dialogs and backend calls follow production. Bugs found in the original were fixed rather than copied; [docs/FIXES.md](docs/FIXES.md) lists every one.

New features built on top of it are listed in [docs/ENHANCEMENTS.md](docs/ENHANCEMENTS.md), including any backend changes they need.

## Stack

| | Version | Notes |
|---|---|---|
| Angular | 16.0.5 | Same as production |
| Angular Material / CDK | 16.0.4 | MDC-based components (version confirmed by matching the live app's component styles) |
| Admin template | Egret | Sidebar, top bar, breadcrumb, theme `egret-navy` |
| Styling | Tailwind 3.3 | Plus the Egret global CSS and Bootstrap 5.3.1 (CDN, as in production) |
| Font | Inter | |
| Firebase (via @angular/fire 16) | 10.14.1 | Auth with SSO custom token, Firestore, Realtime Database |
| SweetAlert2 | 11.7.27 | Alerts |
| SheetJS (xlsx) | 0.18.5 | Excel exports |
| @turf/turf | 6.5.0 | Area polygon overlap checks |
| Node.js | 18 (local) | See `.nvmrc`. Angular 16 officially supports Node 16/18; the build also works on Node 22, which Vercel uses |

## Getting started

```bash
nvm use
```

```bash
npm install
```

```bash
npm start
```

Open http://localhost:4200. Out of the box the app runs on **local sample data**, so it needs no Firebase project or backend:
- The sign-in card stands in for the SSO portal. Press **Sign in**.
- All screens work against an in-browser database of made-up sales persons, areas, customers, tasks, interactions and attendance. Dates are generated around today.
- Your changes are saved in the browser. To discard them, run `salesAdminMock.reset()` in the browser console.

## Environments

The app reads `src/assets/configs/config.json` at startup, just like production.

| `env` value | Backend |
|---|---|
| `"mock"` (default here) | Local sample data from `src/app/mock`. The other URLs are ignored |
| anything else (e.g. `"dev"`, `"prod"`) | The real Firebase project (`firebaseConfig`), SSO portal (`ssoUrl`), core APIs (`coreUrl`, `coreApiUrl`), cloud functions (`cloudFunctionsUrl`), auth service (`authServiceApiUrl`) and message queue (`messagingServiceUrl`) |

`src/assets/configs/config.example.json` shows the shape of a real config. Get the values for each environment from the deployed apps' `assets/configs/config.json`. Point development builds at a dev or staging project, not production.

## Project layout

```
src/
  index.html                  fonts, Bootstrap CDN, startup spinner (as in production)
  styles.scss                 Tailwind + Angular Material theme + Egret/app global CSS
  styles/                     material-theme.scss, egret-and-app.css, third-party CSS
  assets/configs/             runtime config (config.json)
  app/
    app.module.ts, app.routing.ts
    backend.providers.ts      picks Firebase/REST or sample data from config "env"
    mock/                     sample-data backend (Firestore, Realtime DB, REST, auth stand-ins)
    shared/                   Egret layout, guards, interceptor, services, helpers, constants
    views/
      sessions/               sign-in (SSO hand-off), 404 / error / unauthorized
      welcome/                /home
      salesperson/            /salesperson-list (list, edit lead dialog, create, edit profile)
      attendance/             /attendance-report (approval requests, details, monthly summary)
      sales-person-planning/  /salesperson-planning (areas, sales person mapping, task generation)
      tasks/                  /task-report and task details
      interactions/           /interaction-list (search, summary, export)
      performance/            /performance (sales person performance report)
      customers-list/, search-view/   empty pages, routed as in production
docs/
  FIXES.md                    every behaviour that intentionally differs from production (bug fixes)
  ENHANCEMENTS.md             new features and the backend changes they need
  reconstruction/             notes from the reconstruction: routes, backend calls, data fields, styles
```

## How the backend is wired

All data access goes through four places, as in the original app:
- **`FirestoreService`**: every Firestore read and write.
- **`FirebaseDbService`**: Realtime Database.
- **`AuthService` → `AuthBackend`**: Firebase Auth and the permission documents (`Users`, `pages`, `Roles`).
- **`HttpClient`**: REST calls. `TokenInterceptor` adds the API bearer token from the auth service.

`backend.providers.ts` swaps the first three, plus a REST interceptor, for the sample-data versions in `src/app/mock` when `env` is `"mock"`. Feature code doesn't know which backend it's talking to. Menu items and page actions are gated by the same `permission$` map as in production (page ids in `shared/constants/page-ids.ts`).

## Build

```bash
npm run build:prod
```

The output goes to `dist/sales-admin`. `assets/configs/config.json` is read at runtime, so the same build can be deployed to any environment by changing that file.

## Deployment (Vercel)

`vercel.json` holds the build settings (`npm run build` → `dist/sales-admin`) and a rewrite that serves `index.html` for every route, so deep links like `/task-report` work. The deployed app uses whatever `src/assets/configs/config.json` contains. With the default `"env": "mock"`, it runs on the built-in sample data and needs no backend.
