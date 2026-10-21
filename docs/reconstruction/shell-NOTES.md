# Sales Admin – application shell (main.0ad03de76494ddf1.js) – reconstruction notes

Agent: **shell**. Scope: the app's own webpack modules inside `main.*.js` (365 modules total, ~25 are app code; the
rest are Angular/Material/CDK/Firebase/AngularFire/RxJS/ngx-translate/perfect-scrollbar/sweetalert2/highlight.js) plus
the global stylesheet (see `STYLES.md`). Method: the bundle was parsed as text with @babel/parser, split per module
and prettified; nothing was executed. Lazy chunks/common chunk are covered by the feature agents.

## 1. File map (module id → reconstructed file)

| main module | what | file (under `src/`) |
|---|---|---|
| 6250 (entry) | AppModule, rootRouterConfig, AppComponent, IconService, ErrorHandlerService, TokenInterceptor, TranslateHttpLoader (vendor, inlined), @angular/animations/browser (vendor, inlined) | `main.ts`, `app/app.module.ts`, `app/app.routing.ts`, `app/app.component.*`, `app/shared/services/icon.service.ts`, `…/error-handler.service.ts`, `app/shared/interceptors/token.interceptor.ts` |
| 2994 | SharedModule + SharedComponentsModule + SharedDirectivesModule + SharedPipesModule + SearchModule + UserRoleGuard + AppComfirmComponent + AppConfirmService | `app/shared/shared.module.ts`, `components/shared-components.module.ts`, `directives/shared-directives.module.ts`, `pipes/shared-pipes.module.ts`, `search/search.module.ts`, `guards/user-role.guard.ts`, `services/app-confirm/*` |
| 5772 | SharedMaterialModule (36 Material modules) | `app/shared/shared-material.module.ts` |
| 946 | ConfigService | `services/config.service.ts` |
| 8175 | AuthService | `services/auth/auth.service.ts` |
| 9143 | services barrel: `e8` AuthService, `gy` LocalStoreService, `Yf` SalesPersonService, `KD` UserService | `services/index.ts`, `local-store.service.ts`, `user.service.ts` |
| 2937 | SalesPersonService | `services/sales-person.service.ts` |
| 1343 | FirestoreService | `services/firestore.service.ts` |
| 1057 | FirebaseDbService (Realtime DB) | `services/firebase-db.service.ts` |
| 2552 / 5682 / 1218 / 3176 | ThemeService / LayoutService / NavigationService / RoutePartsService | `services/*.service.ts` |
| 7009 / 33 | AppLoaderService / AppLoaderComponent (`app-app-loader`) | `services/app-loader/*` |
| 7618 | AuthGuard | `guards/auth.guard.ts` |
| 8971 / 2885 / 8163 | `[appDropdown]` / `[appDropdownLink]` / `[appDropdownToggle]` | `directives/*.directive.ts` |
| 7751 / 4453 | AdminLayoutComponent / AuthLayoutComponent | `components/layouts/*` |
| 994 / 5201 | `app-header-side` / `app-header-top` | `components/header-side`, `header-top` |
| 5092 / 6191 / 6001 | `app-sidebar-side` / `app-sidebar-top` / `app-sidenav` (+ inlined `Permissions` const) | `components/sidebar-side`, `sidebar-top`, `sidenav`, `constants/permissions.ts` |
| 3293 / 3503 / 1299 | `app-notifications` / `egret-notifications2` / `app-breadcrumb` | `components/…` |
| 6125 | route path constants → `RoutePaths` | `constants/route-paths.ts` |
| 6081 | Firestore/RTDB node names → `DbCollections` | `constants/db-collections.ts` |
| 5774 | `A` PageCode enum (Welcome 0, Profile 1, NotFound 99), `u` PageIds | `constants/page-ids.ts` |
| 8352 | enums + STATES list | `models/enums.ts` |
| 1972 | helper functions | `helpers/utils.ts` |
| 4183 | `getQueryParam` | `helpers/url.helper.ts` |

Integration aliases (re-export only, not in the bundle) were added because feature agents used other names:
`constants/app-routes.ts` (`AppRoutes`), `enums/common.enums.ts`, `helpers/common.helper.ts`
(`showWarningMessage`, `formatDateTime`, …), `services/auth.service.ts`; `utils.ts` also exports `warningError` /
`showWarningAlert` aliases of `showWarning` (1972 `N9`) and `models/enums.ts` exports `States` = `STATES`.
NB: the tasks agent also wrote `tasks/src/app/shared/helpers/common.helper.ts` (subset) – keep this one.

## 2. Bootstrap, AppModule, routing
- `main.ts`: `platformBrowserDynamic().bootstrapModule(AppModule).catch(err => console.log(err))`; no `enableProdMode()`.
- `index.html`: title `SALES-ADMIN`, meta description `crm-lite`, Bootstrap 5.3.1 CSS+JS from jsDelivr, Google Fonts
  (Inter 400–700, Public Sans 400, Material Icons), inline pre-boot spinner inside `<app-root>`.
- AppModule imports (order): BrowserModule, **BrowserAnimationsModule**, SharedModule, HttpClientModule,
  LayoutModule (cdk), PerfectScrollbarModule, **NoopAnimationsModule** (wins → animations off), TranslateModule.forRoot
  (TranslateHttpLoader `/assets/i18n/*.json`), `provideFirebaseApp(() => initializeApp(inject(ConfigService).getConfig().firebaseConfig))`,
  `provideAuth(getAuth)`, `provideFirestore(getFirestore)`, `provideDatabase(getDatabase)`,
  `RouterModule.forRoot(rootRouterConfig, { useHash: false })`.
  Providers: `ErrorHandler → ErrorHandlerService`, `PERFECT_SCROLLBAR_CONFIG = { suppressScrollX: true }`,
  `HTTP_INTERCEPTORS → TokenInterceptor (multi)`, `ConfigService`, `APP_INITIALIZER → () => configService.loadConfig()`.
- Config: `fetch('./assets/configs/config.json')` → keeps `env, firebaseConfig, ssoUrl, cloudFunctionsUrl, coreUrl,
  authServiceApiUrl, messagingServiceUrl`, `production:false`. **`coreApiUrl` is NOT copied** (always undefined).
- Route tree (`app/app.routing.ts`):
  ```
  ''                         redirectTo '/sessions/signin' (pathMatch full)
  ''  AuthLayoutComponent
      sessions               lazy SessionsModule (chunk 882)          data {title:'Session'}
  ''  AdminLayoutComponent   canActivate [AuthGuard]
      home                   lazy WelcomeModule (464)                  data {title:'home', breadcrumb:'home'}
      search                 lazy SearchViewModule (146)
      customers-list         lazy CustomersListModule (482)
      salesperson-planning   lazy SalesPersonPlanningModule (592+35)   data {title, breadcrumb:'salesperson-planning'}
      task-report            lazy TasksListModule (574+592+704)        data {title, breadcrumb:'task-report'}
      task-details           lazy TasksListModule (same module again)
      interaction-list       lazy InteractionListModule (574+592+374)
      salesperson-list       lazy SalespersonModule (592+195)
      attendance-report      lazy AttendanceModule (574+592+205)
      performance            lazy PerformanceModule (574+41)
  ```
  No `**` route. Document title: `<route data.titles joined ' > '> | SALES-ADMIN` (AppComponent), else `SALES-ADMIN`.

## 3. Layout behaviour (Egret)
- Defaults (`LayoutService`): `navigationPos:'side', sidebarStyle:'full', sidebarColor:'slate', sidebarCompactToggle:false,
  dir:'ltr', useBreadcrumb:true, topbarFixed:false, footerFixed:false, topbarColor:'white', footerColor:'slate',
  matTheme:'egret-navy', breadcrumb:'simple', perfectScrollbar:true`. `?layout={json}` replaces the whole conf and
  `?theme={json}` changes the active theme flag (Egret demo features, still live).
- `adjustLayout` on every NavigationEnd and window resize: `matchMedia('(max-width: 959px)')` → `isMobile`, sidebar
  `closed` on mobile else `full` (fullWidthRoutes empty).
- AdminLayout container classes: `app-admin-container app-side-nav-container mat-drawer-transition sidebar-slate
  topbar-white footer-slate` + `sidebar-full|sidebar-compact|sidebar-closed|sidebar-opened|navigation-top|fixed-topbar|…`.
  Content scrolls in `#main-content-wrap` (perfect-scrollbar, scrolled to top on navigation); spinner `.view-loader`
  while lazy modules / resolvers load; `<app-footer>` is an unknown element (no component in the build) → needs
  `CUSTOM_ELEMENTS_SCHEMA` (added) or a stub.
- Sidebar (side nav): fixed 15rem panel, branding = `assets/images/egret.png` + text **"Sales Admin"** + compact switch;
  empty `.app-user-name`; an orphan `mat-menu` (Profile / Account Settings / Calendar – no trigger, never opens);
  `app-sidenav` menu.
- Header (`app-header-side`, white `mat-toolbar.topbar.mat-bg-card`): left hamburger `#sidenavToggle` (tooltip
  "Toggle Hide/Open", hidden when compact) toggling full/closed; right **power button** (`power_settings_new`) →
  menu with one item `exit_to_app` + **"SIGNOUT"** (translate pipe; no language is ever set, so the raw key shows).
- `app-header-top`, `app-sidebar-top` exist for `navigationPos:'top'` only (unused). Header-top's signout uses an
  un-injected `this.router` (throws → caught, logged).
- `app-notifications` (static Egret demo list, "Clear all notifications") sits in an end `mat-sidenav` that nothing opens
  in the side layout; `egret-notifications2` is a closed placeholder sidenav with "Test".
- Breadcrumb ('simple'): `ul.breadcrumb > li > a[routerLink="/{{url}}"]` with text `"/" + (breadcrumb | translate)`.

## 4. Navigation menu & permission gating
- Menu (`NavigationService.plainMenu`):
  - **Home** – link, icon `house`, state `home`, pageId **`sales_admin_welcome`**, code PageCode.Welcome.
  - **Sales Person** – dropDown, icon `person`, code PageCode.Profile, sub:
    Sales Person List → `salesperson-list` (`crm_sales_person_list`), Attendance → `attendance-report` (`crm_attendance`),
    Planning → `salesperson-planning` (`crm_salesperson_planning`), Tasks → `task-report` (`crm_task_report`),
    Interactions → `interaction-list` (`crm_interactions`), Performance Report → `performance` (`crm_performance_report`).
    (sub `code`s: sales_person_planning ×3, crm_task_report, sales_interactions, sales_performance_report – unused.)
- `SidenavComponent.canAccess(item)`: link → `permission$[item.pageId]?.view`; dropDown → any sub with `view === true`;
  the dropDown anchor additionally requires `showDropDown(sub)`. Sub items are filtered individually too: the
  recursive `menuTemplate` renders each sub `<li>` under the same `*ngIf="canAccess(item)"`, so each sub link appears
  only if its own pageId has `view`.
  Until Firestore data arrives `permission$` is `{}` → menu is empty.
- Routes themselves are not permission-guarded (AuthGuard always returns true); feature pages call
  `authService.getPageAccessPermission(PageIds.x)` / subscribe `permission$` themselves.
- Permission computation (`AuthService.setPermission`, runs when user doc + pages + roles are loaded): all pages
  start `{view,create,delete,edit,import,export}=false`; OR-merge `Roles/{id}.permissions[page_id]` for every role id in
  `Users/{uid}.roles`; if ≥1 role matched, OR-merge `Users/{uid}.extended_permissions[page_id]` (not null-checked).

## 5. Auth flow end-to-end
1. Boot: APP_INITIALIZER loads config.json → Firebase app initialised from `firebaseConfig`.
2. Any route → `''` redirects to `/sessions/signin` (AuthLayout). First injection of AuthService subscribes
   `authState(auth)`:
   - **signed out** and URL not containing `/sessions/signin` → `window.open('{ssoUrl}/login?redirectto=http://{host}/sessions/signin', '_self')`
     (note: hard-coded **http://**).
   - **signed in** → generate API token (below), `localStorage.uid = JSON.stringify(uid)` (LocalStoreService),
     `user$.next(user)`, start live listeners `Users/{uid}` (docData), `pages`, `Roles` (collectionData, idField `id`).
3. SSO hand-off (SessionsModule `app-signin`, chunk 882 – feature agent): if `user$` has a uid → navigate `home`;
   else if `?idToken=<token>` → `AuthService.signinWithToken(token)` = **`signInWithCustomToken(auth, token)`**
   (the SSO portal returns a Firebase custom token), then reads RTDB `{userTypeDictionary[5]='Crm'}/{uid}/` (support
   member), stores `localStorage.userDetails = {userId, roleTypeId, name}`, calls `getUserIDTokenAndCache()` and
   navigates `home`; else redirects to the SSO login URL.
4. API token: `POST {authServiceApiUrl}/api/auth/generate_token` body `{userId: uid, userType: 4}` with header
   `No-Auth: true` → `response.data.token` cached in memory (deduplicated in-flight promise). TokenInterceptor adds
   `Authorization: Bearer <token>` + `Accept: application/json` to every HttpClient request without `No-Auth`;
   on 401 → `POST {authServiceApiUrl}/api/auth/refresh_token {token}` → `data.token`, retry once.
5. Firebase ID token cache: `getUserIDTokenAndCache()` → localStorage `idToken` (refreshed when expired). Not used by
   the interceptor.
6. Logout (power button → SIGNOUT): `POST {cloudFunctionsUrl}/revoke_user_token_uid {uid}` (No-Auth) then
   `window.location.reload()`. Firebase `signOut()` is never called and `localStorage.clear()` + navigation in
   HeaderSide normally never execute (page already reloading); after reload the persisted Firebase session is
   restored until its ID token can't be refreshed (revoked refresh token), then the SSO redirect kicks in.
7. AuthGuard (on AdminLayout) maps `isLoggedIn()` to `true` → never blocks.

## 6. Backend touchpoints (main.js code)
Config keys: `coreUrl`, `cloudFunctionsUrl`, `authServiceApiUrl`, `ssoUrl`, `firebaseConfig` (`messagingServiceUrl`,
`env` unused in main).

REST / Cloud Functions
| method | URL | body | response used | caller |
|---|---|---|---|---|
| POST | `{authServiceApiUrl}/api/auth/generate_token` (No-Auth) | `{userId, userType:4}` | `data.token` | AuthService |
| POST | `{authServiceApiUrl}/api/auth/refresh_token` (No-Auth) | `{token}` | `data.token` | AuthService |
| POST | `{cloudFunctionsUrl}/revoke_user_token_uid` (No-Auth) | `{uid}` | – | AuthService.signOut |
| POST | `{cloudFunctionsUrl}/getSalesPersonReport` (No-Auth) | caller's filter body | `response.daily[]`, `response.monthly[]` | SalesPersonService.getSalesPersonsReport |
| POST | `{coreUrl}/customer/count_by_salesperson` (Bearer) | filters (default `{}`) | `data` | getCustomerCount |
| PUT | `{coreUrl}/customer/{id}` (Bearer) | data | whole response | updateSalePersonDb |
| POST | `{coreUrl}/customer/update_salesperson_ids` (Bearer) | `{salesPersonIds:[id], salesPersonId:'', customerIds:[]}` (unmap) / `{salesPersonIds:[], salesPersonId, customerIds}` (map) | `data` | unMapSalesPerson / mapSalesPerson |
| GET | `/assets/i18n/{lang}.json` | – | – | TranslateHttpLoader (never triggered) |
| GET (fetch) | `./assets/configs/config.json` | – | config | ConfigService |

Performance report row fields read: monthly – `salesPersonId, salesPersonName, monthProductivityTarget,
monthProductivityCount, productivityPercent, monthOverallRevenueTarget, monthOverallRevenue, overallRevenuePercent,
monthFMCGRevenueTarget, monthFMCGRevenue, fmcgRevenuePercent, todayTarget, monthProductivityIncentive,
monthOverallRevenueIncentive, monthFMCGRevenueIncentive, monthDailyFMCGLineItemsIncentive,
monthDailyProductivityIncentive, monthSalesPersonAssigned, monthSelfOrderAssigned, monthSalesPersonUnAssigned,
monthSelfOrderUnAssigned, month*Revenue` variants; daily – `tasksCount, achievedTasksCount, tasksPercent,
productivityCount, productivityRevenue, avgOrderValue, fmcgOrders, productivityIncentive, fmcgLineItemsIncentive,
salesPersonAssigned, selfOrderAssigned, salesPersonUnAssigned, selfOrderUnAssigned, *Revenue`; enriched with
`teamLeadName` (= SalesPerson.salesLead.name) and `areaName` (= SalesPerson.cluster.name); mapped to Excel-style
column titles (see `sales-person.service.ts`).

Firestore
| path | access | fields used |
|---|---|---|
| `Users/{uid}` | docData live; getDoc | `roles[]`, `extended_permissions{page_id:{view…}}` |
| `Users` | where `user_type == n` | (UserService.fetchSalesPersons) |
| `pages` | collectionData live | `page_id` |
| `Roles` | collectionData live | `id`, `permissions{page_id:{view,create,delete,edit,import,export}}` |
| `SalesPersonClusters/{id}` (+ sub `Customers`) | getDocs/getDoc/setDoc/updateDoc/deleteDoc, deleteField `customers`, writeBatch sub-docs | `id,name,type,searchKey,customerCount,coordinates,createdDate,updatedDate,customers` |
| `SalesPerson/{id}` | getDocs, getDoc, setDoc, updateDoc; where `clusterId ==` / `clusterId in` (chunks of 10) | `name,mobileNumber,businessName,isActive,cluster{id,name},customerCount,salesLeadId,salesLead{name,mobileNumber},salesManagerId,salesManager{…},enableLogOut,clusterId` |
| `TasksReport` | getDoc; where `taskDateTimestamp >= / <=`, `salesPersonId in` | |
| `Tasks` | where `taskDateTimestamp` range + `salesPersonId in`; where `taskDate ==` & `salesPersonId ==` | |
| `Interactions` | getDoc; where `createdTimeStamp` range, `customerInfo.mobileNumber ==`, `salesPersonId in`; orderBy `createdTimeStamp` asc/desc limit 50 | |
| `MessageQueueStatus/{messageQueueStatusId}` | where `status == 2 (Started)`; setDoc | |
| `AttendanceReport/{id}` | where `createdTimeStamp` range, `salesPersonId in/==`, `salesLeadId in`; updateDoc (sets `checkOutTime=Date.now()` when status 4); setDoc on leave accept `{id:'ATD…', leaveId, createdDate: leave.appliedOn, status:7, salesPersonId, createdTimeStamp}` | |
| `LeaveReport/{id}` | getDoc, updateDoc, range query | `appliedOn, salesPersonId, createdTimeStamp, status` |
| `Calendar/{id}` | getDoc | `month, workingDays, monthName, days, year` |
Every `updateDocument()` also attaches a never-removed `onSnapshot` listener (leak, as shipped).

Realtime Database
| path | access |
|---|---|
| `Customer/{salesPersonId}` | update (SalesPersonService.updateSalesPersonStatus – mirrors Firestore update) |
| `AppSettings/common/dealerNames` | objectVal → `[{id: key, ...value}]` (getDealers awaits `lastValueFrom` of a never-completing stream → never resolves; getDealersObservable works) |
| `Crm/{userId}` | objectVal (UserService.fetchUserById) |
| `{Customer|Dealer|Merchant|FieldAgent|Crm|MarketingExecutive}/{uid}/` | get (sign-in, chunk 882) |

## 7. Dialogs (shell)
- `AppConfirmService.confirm({title?, message?})` → `AppComfirmComponent` (`app-confirm`), width 380px,
  disableClose; defaults "Confirm" / "Are you sure?"; buttons **OK** (raised, primary → `true`) / **Cancel** (accent → `false`).
- `AppLoaderService.open(title = 'Please wait', {width:'200px'})` → `AppLoaderComponent`, disableClose,
  backdropClass `light-backdrop`; `close()`. Used by feature pages as `egretLoader`.
- SweetAlert2: `showWarning(msg)` (utils) = `Swal.fire('warning', msg, 'warning')` and returns `new Error(msg)`.

## 8. Dependencies (evidence)
| package | version | evidence |
|---|---|---|
| @angular/core (+common, compiler, forms, router, animations, platform-browser[-dynamic]) | **16.0.5** | `new Version("16.0.5")` in core |
| @angular/material / @angular/cdk | **16.0.4** | Corrected after reconstruction: every component stylesheet injected by the live app matches the 16.0.4 release byte-for-byte (16.1.x differs in toolbar/menu/drawer styles) |
| @angular/fire | ^16.0.0 (inferred) | modular API + `ɵzoneWrap`; VERSION string left as `ANGULARFIRE2_VERSION` |
| firebase | **10.14.1** | `registerVersion("firebase","10.14.1","app")`; @firebase/app 0.10.13, firestore 4.7.3, auth 1.7.9, database 1.0.8 |
| rxjs | ~7.8 | rxjs 7 `operate()` internals, firstValueFrom/lastValueFrom |
| zone.js | ~0.13 (Angular 16 default) | polyfills has no version string |
| @ngx-translate/core / http-loader | ^15 / ^8 (inferred) | `extend` option & USE_EXTEND token present; loader default prefix `/assets/i18n/` |
| ngx-perfect-scrollbar API + perfect-scrollbar | 10.1.1 API / 1.5.x | Ivy-linked directive `[perfectScrollbar]` exportAs `ngxPerfectScrollbar`; 10.1.1 itself is View Engine → an Ivy fork must have been used (unknown name) |
| sweetalert2 | **11.7.27** | version string |
| highlight.js | **11.6.0** | `versionString="11.6.0"` (entire library + all languages bundled via an unused Egret directive) |
| xlsx | 0.18.5 | chunk 574 (feature agents) |
| tailwindcss | 3.3.x | see STYLES.md |
| bootstrap | 5.3.1 (CDN) | index.html |
| quill 1.3.7 / hopscotch / angular-calendar | CSS only | styles bundle |
| moment | not present in main | – |
`package.json` in this folder lists these.

## 9. Shared dependencies (module ids referenced from lazy chunks)
App modules: `946`→ConfigService; `1057`→FirebaseDbService; `1343`→FirestoreService; `1972`→helpers/utils;
`2937`→SalesPersonService; `2994 .m`→SharedModule; `5772 .m`→SharedMaterialModule; `5774`→PageCode/PageIds;
`6081 .V`→DbCollections; `6125 .Q`→RoutePaths; `7009 .P`→AppLoaderService; `8175 .e`→AuthService;
`8352`→enums; `9143`→services barrel (`e8` AuthService, `gy` LocalStoreService, `Yf` SalesPersonService,
`KD` UserService). Common chunk 592: `2541`→CustomersService, `4249`→ExcelService (not reconstructed here).
Vendor ids: 2223 @angular/core · 4755 @angular/common · 3144 common/http · 1531 router · 6550 platform-browser ·
1591 animations · 9401 forms · 1217 material/core · 430 icon · 6286 dialog · 2214 sidenav · 1728 button · 7406 menu ·
9383 toolbar · 3649 tooltip · 3630 divider · 787 select · 1292 checkbox · 4867 radio · 6012 card · 1330 list ·
3617 tabs · 7870 expansion · 2342 snack-bar · 2611 sort · 3276 paginator · 3627 table · 8097 input · 9114 form-field ·
8280 datepicker · 7081 progress-bar · 8410 bottom-sheet · 5537 cdk/layout · 8930 cdk/bidi · 706 cdk/a11y ·
5441 cdk/overlay · 8023 cdk/portal · 8915 cdk/scrolling · 3223 cdk/dialog · 2966 cdk/platform · 1692 cdk/coercion ·
2840 cdk/keycodes · 418 cdk/collections · 3081 @ngx-translate/core · 2769/9418/4466 ngx-perfect-scrollbar ·
5226 sweetalert2 · 4940/6806 highlight.js · 2167 fire/firestore · 9049 fire/auth · 7497 fire/database · 4066 fire/app ·
6161 @angular/fire core · 259/6881 firebase app · 5861 asyncToGenerator · rxjs: 9751 Observable, 7579 Subject,
1135 BehaviorSubject, 727 Subscription, 4004 map, 9300 filter, 8505 tap, 262 catchError, 5577 mergeMap, 8996 from,
9646 of, 2843 throwError, 9808 lastValueFrom, 5698 take, 2722 takeUntil, 4128 forkJoin, 9841 combineLatest,
6451 merge, 8675 startWith, 3900 switchMap, 8372 debounceTime, 6805 EmptyError.

## 10. Quirks kept as shipped
- NoopAnimationsModule overrides BrowserAnimationsModule (no Material animations).
- TranslateService never gets a language → translate pipe prints keys ("SIGNOUT", menu names as-is).
- AuthGuard always allows; UserRoleGuard / `hasPermission()` stubs return true.
- `getInteractionsByFilters` "paging" has no cursor (range + limit 50 + sort flip); `mobileNumber` must be a string.
- `getDealers()` never resolves (lastValueFrom on live RTDB stream).
- Sign-out reloads before local cleanup; Firebase signOut not called; SSO redirect URL uses `http://`.
- `FirestoreService.updateDocument` leaks an onSnapshot listener per call; `writeDataToSubCollectionInBatches` has no
  500-write chunking.
- `getBusinessTypesByClusterType()` falls back to the string `'general'`.
- highlight.js (~1 MB, all languages) and dead Egret pieces (customizer, footer, search overlay, pipes) inflate main.

## 11. Uncertainties
- Class/enum/function/file names are inferred (minified); method names, strings, selectors, templates, field names
  are exact. `IconService`, `TokenInterceptor`, `ErrorHandlerService`, `UserService`, `FirestoreService`,
  `FirestoreOperator`, `PrescriptionType`, `PageCode` are my names.
- Declarations of the NgModules are not in prod Ivy metadata; reconstructed from what each template/module references.
  Egret's tree-shaken directives/pipes/components (EgretHighlight, EgretSideNavToggle, FontSize, ScrollTo,
  RelativeTime/Excerpt/GetValueByKey pipes, SearchInputOver, Customizer, Footer, ButtonLoading, EgretSidebar,
  BottomSheetShare, ExampleViewer) existed in source but can't be recovered and are omitted.
- `CUSTOM_ELEMENTS_SCHEMA` vs a stub FooterComponent for `<app-footer>` – unknown.
- Template attribute order is reconstructed from Ivy `consts` (static attrs are exact; binding order mostly exact;
  `*ngIf` position relative to other attributes is not recoverable). Templates assume `strictTemplates: false`.
- @angular/fire, ngx-translate, ngx-perfect-scrollbar fork, zone.js and rxjs versions are
  inferred, not read from version strings.
- Palette hues other than 500 are placeholders (unused by the generated CSS).
