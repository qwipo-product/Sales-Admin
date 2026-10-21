# Sales Admin – global styles analysis (`styles.2ec2b90c5a67555e.css`, 399,676 bytes)

The stylesheet was parsed with postcss (as text) into its 3,717 top-level nodes and split losslessly into the files
under `src/styles/`. A declaration-level comparison of all output files against the original shows identical content
(6,741 declarations; the only differences are prettier's cosmetic `.5` → `0.5`, `[dir=rtl]` → `[dir="rtl"]`).

## 1. Composition, in original order

| orig nodes | byte offset | bytes | origin | category | output file |
|---|---|---|---|---|---|
| 0–11 | 0 | 1,822 | perfect-scrollbar 1.5.x CSS | 3rd party | `third-party/perfect-scrollbar.css` |
| 12–234 | 1,822 | 22,037 | Quill 1.3.7 **snow** theme (incl. core) – license banner kept | 3rd party | `third-party/quill.snow.css` |
| 235–243 | 23,859 | 612 | `.animated`, `fadeInUp/Down/Left/Right` + `.fade-in-*` | (c) Egret | `egret-and-app.css` §1 |
| 244–278 | 24,471 | 6,472 | hopscotch tour CSS (`sprite-green.png` → emitted as `sprite-green.b3a4166c915eb55f.png`) | 3rd party | `third-party/hopscotch.css` |
| 279–281 | 30,943 | 227 | `.pace` progress bar (`#ffd97d`, 2px) | (c) Egret | `egret-and-app.css` §2 |
| 282–299 | 31,170 | 1,309 | highlight.js **11.x** `github.css` theme | 3rd party | `third-party/highlightjs-github.css` |
| 300–424 | 32,479 | 7,447 | `@charset "UTF-8"` + Tailwind base (preflight) + components (`.container`) + utilities | (b) Tailwind | `tailwind-generated.reference.css` |
| 425–552 | 39,926 | 11,365 | angular-calendar CSS (month/week/day views, tooltip) | 3rd party | `third-party/angular-calendar.css` |
| 553–1023 | 51,291 | 34,857 | Egret base/helpers/layout (see §5) | (c) Egret | `egret-and-app.css` §3 |
| 1024–1204 | 86,148 | 31,811 | `mat.core()` + component typographies/densities + `mat.typography-hierarchy()` | (a) Material | `material-generated.reference.css` |
| 1205–1609 | 117,959 | 81,799 | `.egret-navy { all-component-colors }` | (a) Material | `material-generated.reference.css` |
| 1610–1645 | 199,758 | 3,320 | Egret per-theme helpers for `.egret-navy` | (c) Egret | `egret-and-app.css` §4 |
| 1646–2057 | 203,078 | 86,392 | `.egret-navy-dark { all-component-colors }` | (a) Material | `material-generated.reference.css` |
| 2058–2093 | 289,470 | 3,583 | Egret per-theme helpers for `.egret-navy-dark` | (c) Egret | `egret-and-app.css` §5 |
| 2094–3710 | 293,053 | 106,226 | Egret components, colour palette helpers, view styles | (c) Egret | `egret-and-app.css` §6 |
| 3711–3716 | 399,279 | 397 | Tailwind **variants** (hover:, rtl:, sm:, md:) – end of styles.scss output | (b) Tailwind | `tailwind-generated.reference.css` |

The `@charset` at node 300 marks the start of the compiled `src/styles.scss` (Angular concatenates the angular.json
`styles` entries; only a Sass-compiled entry emits `@charset`). So: ps → quill → [Egret animations] → hopscotch →
[pace] → hljs are separate `styles` entries; styles.scss = `@tailwind` ×3, angular-calendar, Egret SCSS + Material
themes, and Tailwind appends its variants at the end. `src/styles.scss` reproduces this (see "Ordering").

### Ordering (cascade safety)
`src/styles.scss` emits: Tailwind → angular-calendar → Material (core + both themes) → `egret-and-app.css`.
Differences vs the original: Egret animations/pace now come after Tailwind (0 conflicting selectors), Material moves
before Egret base/layout and the `.egret-navy` helpers move after the dark Material block. Checked with a
selector/specificity/property scan: the only overlaps are `.mat-ripple{position:relative}` (same value in both) and
`.doughnut-grid .doughnut-grid-item p{margin:0}` vs `.mat-typography .mat-body p` (only if a doughnut grid is inside
`.mat-typography`, which never happens). Result: identical computed styles.

## 2. Fonts and icons
- Loaded from **index.html** (the build inlined the Google Fonts CSS; no `@font-face` in styles.css):
  - **Inter** 400, 500, 600, 700 (`font-display: swap`) – the app font: `body{font-family:Inter,Helvetica Neue,sans-serif;font-weight:500;font-size:.875rem;line-height:1.5}`; Material typography uses `Inter, "Helvetica Neue", sans-serif`.
  - **Public Sans** 400 (loaded in the same css2 request, used by feature styles if at all).
  - **Material Icons** (ligature font, `.material-icons` class inlined) – used by every `<mat-icon>name</mat-icon>`.
  - Archivo is present only as a commented-out `<link>`.
- **Bootstrap 5.3.1** CSS (+ JS bundle) from jsDelivr is loaded **before** styles.css → Bootstrap reboot/utilities are
  active globally underneath Tailwind/Egret (e.g. Bootstrap `.container`, `.row`, `.btn` exist for feature templates).
- SVG icons: `IconService` registers 74 `ulb_*` icons from `assets/images/svg-icons/*.svg` (`<mat-icon svgIcon>`); the
  shipped menu uses only ligature icons (`house`, `person`, `keyboard_arrow_right`, `menu`, `power_settings_new`, ...).
- Images referenced by the shell: `assets/images/egret.png` (sidebar/topbar logo), `assets/images/face-7.jpg`
  (header-top avatar, top-nav layout only), hopscotch `sprite-green` png.

## 3. (a) Angular Material
- Version evidence: MDC-based components (`mat-mdc-*`) with token families `--mat-tab-header-*`, `--mat-card-*`,
  `--mat-radio-*`, `--mat-snack-bar-*` but **no** `--mat-option-*`, `--mat-select-*`, `--mat-menu-*` → **@angular/material ~16.1.x**
  (16.2 tokenised option/select/menu). Not a prebuilt theme: two custom M2 themes scoped by body class.
- Theme classes: `.egret-navy` (light, default – `LayoutService.matTheme`) and `.egret-navy-dark` (dark). ThemeService
  adds the class to `<body>`.
- Palettes (only the default hue is ever used in the generated CSS, so other hues are unrecoverable/irrelevant):

  | palette | default (500) | default-contrast | alpha variants seen |
  |---|---|---|---|
  | primary | `#0081ff` | white | `rgba(0,129,255,.2/.25)`, `#0081ffde` |
  | accent | `#ff8a48` | `rgba(0,0,0,.87)` (buttons get `#000`) | `rgba(255,138,72,.2/.25)`, `#ff8a484d/de` |
  | warn | `#ff3d57` | white | `rgba(255,61,87,.2/.25)`, `#ff3d574d/de` |

  Same primary/accent/warn in both themes. ThemeService `baseColor`s (`#10174c` navy, `#0081ff` dark) are only data.
- Background overrides (non-default M2 values found in the CSS):
  - light: app-bar `#ededed` (`.mat-toolbar` bg), selected-button `#c7c7c7`, disabled-button-toggle `#e1e1e1`; everything
    else default light (background `#fafafa`, card/dialog `white`, text `rgba(0,0,0,.87)`).
  - dark: background `#1a2038` (drawer-container/app background), card/dialog/app-bar/raised-button `#222a49`,
    selected-button `#3a487e`, disabled-button-toggle `#2a345b`; derived values (`#3d445f` chip/toggle divider,
    `#d3d4db` snackbar) follow automatically. Foreground default dark (white text).
- Typography config (`mat.define-typography-config`, font-family `Inter, "Helvetica Neue", sans-serif`, letter-spacing
  `normal` for every level):

  | level | size / line-height / weight | where visible |
  |---|---|---|
  | headline-1 | 1.875rem / 2.25rem / 800 | `.mat-headline-1` |
  | headline-2 | 1.25rem / 1.75rem / 700 | `.mat-headline-2` |
  | headline-3 | 1.125rem / 1.75rem / 600 | `.mat-headline-3` |
  | headline-4 | .875rem / 1.25rem / 600 | `.mat-headline-4` |
  | headline-5 | .875rem / 1.5rem / 500 | `.mat-h1`, `.mat-typography h1` |
  | headline-6 | .875rem / 1.5rem / 500 | `.mat-h2`, `h2` |
  | subtitle-1 | 1rem / 1.75rem / 500 | `.mat-h3`, menus/select panel (MDC subtitle1) |
  | subtitle-2 | .875rem / 1.25rem / 600 | `.mat-body-strong`, table header (MDC subtitle2) |
  | body-1 | .875rem / 1.5rem / 500 | `.mat-h4`, form-field, option, select (MDC body1) |
  | body-2 | .875rem / 1.5rem / 500 | `.mat-body`, chips, table cells (MDC body2) |
  | caption | .75rem / 1rem / 500 | hints/errors, paginator |
  | button | .875rem / .875rem / 500 | MDC buttons |
  | overline | not observable | – |

- Density 0 (form-field infix min-height 56px, icon button 48px, list items 48/64/88px, table rows 52px, header 56px).
- Root (unscoped) part = `mat.core()` (ripple, cdk overlay/a11y/text-field, focus indicators) + typography/density per
  component + `mat.typography-hierarchy()`. Theme blocks = `all-component-colors` (incl. elevation classes,
  `.mat-app-background`).
- Regenerate with `src/styles/material-theme.scss` (Material 16 Sass API) and diff against
  `src/styles/material-generated.reference.css`. **Animations are disabled at runtime** because AppModule imports
  `NoopAnimationsModule` after `BrowserAnimationsModule` (ripples/transitions of Material components are instant).

## 4. (b) Tailwind CSS
- Version: **3.3.x** (≥3.3.2): preflight has `font-feature-settings`/`font-variation-settings:normal` on `html`,
  `--tw-gradient-*-position` vars, `rtl:` emitted as `:is([dir="rtl"] …)` (3.4 uses `:where()`, adds
  `-webkit-tap-highlight-color` and `:host` to preflight – absent).
- Config (see `tailwind.config.js`): default theme, preflight on, no prefix, `important: false`, default separator,
  content `./src/**/*.{html,ts}` (words such as `visible`, `static`, `fixed`, `table`, `contents`, `transform`, `filter`,
  `transition` only come from TS/HTML text).
- Utilities present (complete list, in emitted order):
  `.container` (+5 breakpoints) `.visible .static .fixed .!absolute .absolute .relative .float-right .!m-0 .m-0 .m-10
  .m-2 .m-3 .m-4 .m-auto .mx-12 .mx-2 .!mb-0 .!mb-2 .!mr-4 .mb-4 .mb-6 .ml-5 .mr-3 .mr-32 .mr-4 .mr-8 .mt-2 .mt-3 .mt-4
  .mt-5 .block .!flex .flex .table .contents .hidden .!h-6 .h-2 .h-[calc(100vh-90px)] .h-full .!w-6 .w-40 .w-[240px]
  .min-w-[220px] .flex-grow .transform .flex-row .flex-col .flex-wrap .items-center .justify-center .justify-between
  .overflow-hidden .rounded .rounded-full .p-0 .p-1 .p-10 .p-2 .p-3 .p-4 .p-5 .p-6 .!px-0 .!py-4 .px-4 .py-3 .!pb-2
  .!pb-4 .!pt-4 .pl-1 .pl-4 .pt-8 .text-left .text-[18px] .text-lg .text-white .filter .transition`
  Variants: `hover:bg-slate-50`, `rtl:ml-2`, `rtl:ml-4`, `rtl:!p-3`, `sm:mr-2`, `sm:flex-row`, `md:flex-row`.
- Name collisions resolved by Egret rules that come later: `.container` → Egret `max-width:1400px;margin:0 auto;padding:0 15px`
  (wins over Tailwind's breakpoint max-widths at every width), `.h-full` → Egret adds `min-height:100vh` (Tailwind
  `height:100%` still applies), `.text-white` → Egret `color:#fff`.
- Preflight interplay: preflight resets `h1–h6` size/weight and margins, then Egret base re-styles headings
  (`h1 2rem … h6 .875rem`, weight 400, line-height 1.1, `margin-bottom:.5rem`), `p{margin:0 0 16px}`, `a{color:inherit}`.

## 5. (c) Egret template + app globals (`src/styles/egret-and-app.css`, verbatim, prettified)
Sections (banners in the file give original node ranges):
1. animations; 2. pace; 3. base & layout: `html{font-size:16px}`, `body` (Inter 500 .875rem/1.5), headings, links,
   `.text-10…78` (+`.mat-icon` variants), `.fw-300…900`, `.fz-1/2`, `.text-center/right`, `.text-muted-white`, `.mat-box-shadow`,
   app accordion, `.default-table`, `.app-error`, `.app-loader/.view-loader/.spinner/.double-bounce*` (sk-bounce),
   ps rail tweaks, ngx-datatable bits, **layout**: `.app-admin-wrap{height:100vh;overflow:hidden}`,
   `.sidebar-panel{position:fixed;width:15rem;z-index:10001;…}` (`.navigation-hold` margin-top 56px,
   `background:rgba(255,255,255,.95)`), `.main-content-wrap{float:right;height:100vh}` (width `calc(100% - 15rem)` when
   `.sidebar-full`), compact (64px) / compact-big (150px) / closed (`left:-15rem`) states, `.sidebar-backdrop`, mobile
   `@media (max-width:959px)`, `.notification-number`, `.sidenav-hold …` (menu item height/indentation, `.menu-caret`
   rotation, `.menuitem-badge`), `.breadcrumb`, `.breadcrumb-bar` (links 1rem/400, line-height 40px, `/\a0` separators),
   `.breadcrumb-title`, `.sidebar-compact-switch`, `.branding{position:fixed;height:56px;width:15rem;…}`
   (`.app-logo` 36px high, `.app-logo-text` 20px/400), `.app-user`, `.topbar.mat-toolbar{min-height:70px;box-shadow:0 10px 30px #2f3c4a14;z-index:1001}`,
   `.topnav …`, `.header-topnav …`.
4./5. per-theme helpers: `.text-muted` (`#0000008a` / `#ffffffb3`), `.text-primary/accent/warn`,
   `.mat-bg-primary/accent/warn/chip/card/default` (+ `--mobile` variants ≤959px), `.branding` border, calendar,
   hopscotch, `.header-topnav`/`.topnav ul ul` backgrounds, `.info-card.*`.
6. `.button-loading`, `.btn-spinner`, `.mat-table`/`.mat-row` tweaks, **`.mdc-card` overrides** (`.mdc-card.default`,
   `.mdc-card.p-0 …` card-title-text/subtitle/divider), hopscotch Egret theme, `.info-card`, `egret-sidebar`,
   `.egret-example-viewer-accordion`, then the **Egret colour system** for every Material palette + white/slate:
   `.<c>` (bg + table text colours), `.text-<c>`, `.sidebar-<c>` (branding + navigation-hold colours),
   `.footer-<c>`, `.<c>-50…A700`, `.<c>-50-fg…`, `.text-<c>-50…` — the shipped layout uses **`sidebar-slate`**
   (`#222a45`, white text, hover/open `rgba(0,0,1,.2)`), **`topbar-white`** (no rules exist for it → Material toolbar
   colours + `.mat-bg-card` on header-side) and **`footer-slate`**; finally Egret view styles (page-layout, signup*,
   session, inbox, calendar, chat, gallery, pricing, profile, timeline, shop/product/cart, invoice, todo, search-box).

Component-scoped styles in main.js: only `app-app-loader` (spinner `#0090ef`, 60px, `.ft-16`) – all other shell
components use `ViewEncapsulation.None` without styles (or emulated with none: breadcrumb, egret-notifications2, root).

## 6. Files
- `src/styles.scss` – entry (Tailwind directives + imports in safe order).
- `src/styles/material-theme.scss` – Sass to regenerate (a).
- `src/styles/material-generated.reference.css` – (a) verbatim, for diffing only (do not ship together with the Sass).
- `src/styles/tailwind-generated.reference.css` – (b) verbatim, for diffing only.
- `src/styles/egret-and-app.css` – (c) verbatim.
- `src/styles/third-party/*.css` – verbatim vendor CSS (or import the npm originals).
- `tailwind.config.js` – reconstructed config.
