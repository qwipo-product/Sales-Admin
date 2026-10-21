# people: Sessions, Welcome, Search, Customers-list, Salesperson, common chunk

Agent **people**. Sources: `882`, `464`, `146`, `482`, `195`, `common` (webpack chunk 592). I looked up cross-chunk
references in `main.0ad03de76494ddf1.js`. All output is under `decompiled/people/src/app/`.

## 1. Files written

```
src/app/views/sessions/      sessions.module.ts, sessions.routing.ts,
                             signin/ signup/ forgot-password/ not-found/ error/ unauthorized/  (ts/html/scss each)
src/app/views/welcome/       welcome.module.ts, welcome.routing.ts, welcome.component.{ts,html,scss}
src/app/views/search-view/   search-view.module.ts, search-view-routing.module.ts, result-page/result-page.component.*
src/app/shared/search/       search.service.ts                    (lives in chunk 146)
src/app/views/customers-list/ customers-list.module.ts, customers-list-routing.module.ts, customers/customers.component.*
src/app/views/salesperson/   salesperson.module.ts, salesperson-routing.module.ts, salesperson.component.*,
                             salesperson-list/ edit-salesperson-dialog/ create-salesperson/ profile-information/
src/app/shared/services/     customers.service.ts (common 2541), excel.service.ts (common 4249)
```

## 2. Components & routes

The app router lives in main, const `js`:

| URL | Layout / guard | Module (chunk) | Component |
|---|---|---|---|
| `/` | redirectTo `/sessions/signin` (pathMatch full) | — | — |
| `/sessions/signin` | AuthLayoutComponent `app-auth-layout` (main 4453), no guard, data `{title:'Session'}` | SessionsModule (882) | `app-signin` SigninComponent, data `{title:'Signin'}` |
| `/sessions/signup` | 〃 | 〃 | `app-signup`, `{title:'Signup'}` |
| `/sessions/forgot-password` | 〃 | 〃 | `app-forgot-password`, `{title:'Forgot password'}` |
| `/sessions/404` | 〃 | 〃 | `app-not-found`, `{title:'Not Found'}` |
| `/sessions/unauthorized` | 〃 | 〃 | `app-unauthorized`, `{title:'Access error'}` |
| `/sessions/error` | 〃 | 〃 | `app-error`, `{title:'Error'}` |
| `/home` | AdminLayoutComponent `app-admin-layout` (main 7751), `canActivate:[AuthGuard]` (main 7618) | WelcomeModule (464), data `{title:'home',breadcrumb:'home'}` | `app-welcome` |
| `/search` | 〃 | SearchViewModule (146) | `app-result-page` |
| `/customers-list` | 〃 | CustomersListModule (482) | `app-customers` (empty) |
| `/salesperson-list` | 〃, loads `Promise.all([592 common, 195])`, no data | SalespersonModule (195) | `app-salesperson` (router-outlet) → child `''` → `app-salesperson-list` |
| `/salesperson-list/salesperson-list` | 〃 | 〃 | `app-salesperson-list` (duplicate child route, RoutePaths.SALESPERSON_LIST) |
| `/salesperson-list/create-salesperson` | 〃 | 〃 | `app-create-salesperson` (**standalone**) |
| `/salesperson-list/edit-salesperson-profile/:id` | 〃 | 〃 | `app-profile-information` (**standalone**). The path is a string literal; RoutePaths.EDIT_SALESPERSON_PROFILE exists but isn't used here. |

The AuthGuard always returns `true` because it pipes `isLoggedIn()` through `map(() => true)`. Its redirect to
`/sessions/signin?return=` never runs. The real protection comes from the `AuthService` constructor, below.

### Permissions
Pages read `authService.permission$` (a BehaviorSubject `{}`) and pick `permissions[pageId]`. The value is
`{view, create, delete, edit, import, export}`.

- `app-salesperson-list`, `app-edit-salesperson-dialog` and `app-create-salesperson` use pageId `crm_sales_person_list`.
  They render only when `permissionObj?.view`. Otherwise they show "You don't have permission , Please contact
  administrator". The dialog's copy says "dont", with no apostrophe.
- `app-welcome` uses pageId `sales_admin_welcome`. It computes the permission but never uses it.
- `app-profile-information` has **no** permission check.

AuthService.setPermission builds the map from Firestore:
- `Users/{uid}` supplies `roles[]` and `extended_permissions`.
- the `pages` collection supplies `page_id`.
- the `Roles` collection supplies `id` and `permissions[page_id]`.

## 3. SSO sign-in flow (app-signin)

`showSigninPage` is initialised to `false` and nothing ever sets it to true. The username/password card therefore
**never renders**. Only the `mat-progress-bar` shows, and login is SSO-only.

1. **App boot.** `AuthService` (main 8175) subscribes to `authState(auth)` in its constructor.
   - **User present:**
     - `generateAPIToken(uid)` calls `POST ${authServiceApiUrl}/api/auth/generate_token` with body
       `{userId: uid, userType: 4}` and header `No-Auth: true`. It caches `res.data.token` as `apiToken`.
     - It calls `LocalStoreService.setItem('uid', uid)`, which JSON-encodes into localStorage.
     - It calls `userSubject.next(user)`, then subscribes to `Users/{uid}`, `pages` and `Roles`.
   - **No user, and the URL doesn't contain `/sessions/signin`:** it calls
     `window.open(`${ssoUrl}/login?redirectto=http://${location.host}/sessions/signin`, '_self')`.
2. **SigninComponent.ngOnInit.** It subscribes to `authService.getCurrentUser()` (the `user$` BehaviorSubject, initially
   null) through `takeUntil(this._unsubscribeAll)`. `_unsubscribeAll` is an **empty array**, so the takeUntil is a no-op.
   - `user?.uid` is set: `router.navigateByUrl('home')`.
   - Otherwise, if `route.snapshot.queryParams.idToken` is set: `signin(idToken)`.
   - Otherwise: the same `window.open(...)` SSO redirect. The SSO URL uses `http://` even on https hosts.
   - Because `user$` emits `null` synchronously, a fresh visit to `/sessions/signin` with no `idToken` redirects to
     SSO straight away. It doesn't wait for a persisted Firebase session to restore.
3. **The SSO portal redirects back** to `http://<host>/sessions/signin?idToken=<token>`. The token is a **Firebase
   custom token**, because it goes into `signInWithCustomToken`.
4. **`signin(idToken)`:**
   1. `authService.signinWithToken(token)` calls `signInWithCustomToken(auth, token)` (main 9049 `_p`) and returns
      the UserCredential.
   2. `getUser(UserType.SupportMember = 5, uid)` reads the Realtime Database with
      `get(ref(db, 'Crm/{uid}/')).val()`. `userTypeDictionary[5]` is `DbCollections.CRM`, i.e. `"Crm"`.
   3. It writes `localStorage.setItem('userDetails', JSON.stringify({userId: uid, roleTypeId: crm?.roleTypeId ?? '',
      name: crm?.name ?? ''}))`.
   4. `authService.getUserIDTokenAndCache()` calls `getIdTokenResult(currentUser)`. If the token has expired it calls
      `getIdToken(user, true)` and stores it with `ls.setItem('idToken', token)`. Otherwise it returns the cached
      `idToken` or the result's token.
   5. `router.navigateByUrl('home')`. Separately, the `authState` emission triggers the AuthService side effects from
      step 1 and a second `navigateByUrl('home')` from the subscription in step 2.
   6. **On error:**
      - It logs `Signin Error:`.
      - It then sets `submitButton.disabled = false`. `submitButton` is undefined because the card isn't rendered,
        so this throws a TypeError inside the catch and the promise rejects unhandled.
      - The intended `errorMsg` was `'Please enter valid credentials '` for `auth/user-not-found` and
        `'Something went wrong'` otherwise.
5. **Every REST call** goes through an HTTP interceptor in main. It adds `Authorization: Bearer <apiToken>` and
   `Accept: application/json`. On a 401 it calls `refreshAPIToken`, which posts
   `POST ${authServiceApiUrl}/api/auth/refresh_token` with `{token}`. Requests that carry the `No-Auth` header skip it.
6. **`signout()`** is not used by the template:
   - `authService.signOut()` posts `POST ${cloudFunctionsUrl}/revoke_user_token_uid` with body `{uid}` and the
     No-Auth header, then calls `window.location.reload()`.
   - Back in `signout()`: `localStorage.clear()` and navigate to `/sessions/signin`.
7. The hidden form's `(ngSubmit)="signin()"` calls `signin(undefined)`. The `rememberMe` control defaults to `true`.

The signup, forgot-password, 404, error and unauthorized pages are stock Egret pages with no backend calls:
- signup/forgot `submit` only disables the button and makes the progress bar indeterminate.
- The error pages' "Back to Dashboard" button links to `/others/blank`, a route that doesn't exist.
- "Report this Problem" has no handler.

## 4. Salesperson module

### List (`app-salesperson-list`)
- **Data:** `SalesPersonService.getSalesPersons()` reads the whole Firestore `SalesPerson` collection with
  `getDocs(collection('SalesPerson'))`, keeping `doc.data()` only, then runs `mapToSalesPerson` and sorts by
  `customerCount` descending.
  - **Row fields:** `name, mobileNumber, id, businessName, isActive, areaName (cluster.name), areaId (cluster.id),
    area (cluster), customerCount, salesLeadId, salesLeadName (salesLead.name), salesLeadMobileNumber,
    salesManagerId, salesManagerName (salesManager.name), salesManagerMobileNumber, enableLogOut`.
- **Table:** `mat-table` (legacy flex `mat-*` cells), `matSort` with no sort headers, a plain array as dataSource,
  and no paginator. Columns are `salesPersonName, mobileNumber, leadName, salesManager, action, enableLogOut`.
  Header texts: "Sales Person Name", "Mobile Number", "Lead Name", "Sales Manager", "Action", "Force Logout".
- **Action buttons:**
  - The first button reads "Edit Lead" when the row has a `salesLeadName` or `salesManagerName`, and "Add Lead"
    otherwise. It calls `editSalespersonPopUp(row.id)`.
  - "Edit Profile" navigates to `['salesperson-list/edit-salesperson-profile', id]`.
- **Force Logout column:**
  - When `row.enableLogOut` is set, it shows a disabled-looking darkgray "Logout enabled" button with no handler.
  - Otherwise it shows a primary "Enable logout" button, which calls `salespersonForceLogout(row)`:
    1. Swal `{title:'Do you want force logout this sales person', icon:'question', showCancelButton, confirmButtonText:'Yes', cancelButtonText:'No'}`.
    2. On confirm, if already enabled: helper `warningError('Already this salesperson is logged out')`, which shows
       a Swal warning and returns an Error without throwing it.
    3. Otherwise it opens the loader, calls `updateSalesPerson(id, {enableLogOut: true})`, closes the loader, sets
       `row.enableLogOut = true` and shows Swal `('success','Force Logout enabled successfully','success')`.
       The update is a Firestore `updateDoc('SalesPerson/{id}')`.
  - The flag is presumably read by the mobile app to force the user out. The admin never resets it.
- **"Create Sales Person"** navigates to `/salesperson-list/create-salesperson`.
- **Unused sidenav:** a `mat-sidenav #sidenav` (`mode="side"`, `opened="false"`) containing the text
  "SIDENAV CONTENT HERE". Nothing toggles it.
- **Animation:** a component-local `trigger('animate', [transition('* => *', [style({opacity:0}), animate('300ms', style({opacity:1}))])])`.
  It is bound as `[@animate]="{value:'*',params:{y:'50px',delay:'300ms'}}"`, but the params are ignored.

### Dialog `app-edit-salesperson-dialog` (Edit Lead / Add Lead)
- **Opened by:** `SalespersonListComponent.editSalespersonPopUp(id)` with
  `{width:'40%', disableClose:true, data:{salespersonId}}`.
- **Form:** `fb.group({leads: FormControl(''), manager: FormControl([]), lead: ['']})`. `lead` is unused and there
  are no validators.
- **Dropdowns:**
  - "Lead Name" (`formControlName="leads"`) and "Sale's Manager" (`formControlName="manager"`). Option value is the
    whole object; the label is `name`.
  - **Both lists come from the same query:** `UserService.fetchSalesPersons(2)` runs a Firestore query on `Users`
    where `user_type == 2`, through `FirestoreService.queryCollectionByFilters`, which adds `id`. The results map to
    `{name, userId: id, user_type, mobileNumber: mobile_number}`.
- **Selection:** `(selectionChange)` stores `selectedSalesLead` and `selectedSalesManager`.
- **Save (`update()`)** calls `updateDoc('SalesPerson/{salespersonId}', payload)`:
  - **Lead and manager both picked:** payload `{salesLeadId, salesManagerId, salesLead:{id,name,mobileNumber},
    salesManager:{id,name,mobileNumber}}`. Swal "changes updated successfully".
  - **Lead only:** payload `{salesLeadId, salesLead:{...}}`. Swal "Sales Lead updated Successfully".
  - **Manager only:** payload `{salesManagerId, salesManager:{...}}`. Swal "Sales manager Updated successfully".
  - **Neither:** Swal warning "No changes updated", then `close()` with no result.
- **Result:** the dialog closes with the payload, and the list reloads on any truthy result.
- **Close icon:** the `close` mat-icon calls `dialogRef.close()`. There's no error handling.

### Create (`app-create-salesperson`, standalone)
**Form fields.** Every field is `Validators.required`:

| Field | Input | Extra rule |
|---|---|---|
| `name` | text | letters and spaces only |
| `businessName` | text | letters and spaces only |
| `mobileNumber` | number | truncated to 10 characters; must have at least 10 digits |
| `salespersonEmail` | text | **no email validator** |
| `pinCode` | number | truncated to 6 characters; must match `/^\d{6}$/` |
| `street`, `landmark`, `area`, `city` | text | — |
| `state` | mat-select | value is the state **name** from the 30-entry `STATES` list in main 8352 |
| `latitude`, `longitude` | number | must not be 0 or negative |
| `status` | mat-select | options `[0, 1]` shown as "InActive"/"Active" |

Truncation is done by helper `restrictMaxLength`: a valueChanges hook slices the value and calls `setValue` with
`emitEvent: false`.

**`saveCustomer()` validation order:**
1. Opens the loader.
2. If the form is invalid: "Please fill all required fields."
3. If `pinCode` fails the 6-digit check: "PinCode is not correct. Please provide a proper PinCode  number."
4. If `name` matches `/[^a-zA-Z\s]/`: "please enter valid name".
5. If `businessName` matches it: "please enter valid business name".
6. If any of mobile number, pin code, latitude or longitude is negative: "`<labels>` ,have negative values Please
   Check". Longitude is mislabelled "latitude".
7. If `latitude == 0`: "give proper latitude.".
8. If `longitude == 0`: "give proper longitude.".
9. If `mobileNumber.toString().length < 10`: "give full mobile number".
10. All of these are `Swal.fire('', msg, 'warning')`. The loader closes in `finally`.

**`createCustomer()`:**
1. **Core entity** (`mapSalesPersonCd`): `{id: uuid-v4-like, name, business_name, business_tag_status:1,
   business_type_id:7, mobile_number: String, email, gst_number:'', photo_id_url:'', shop_url:'',
   gst_certificate_url:'', registration_document_url:'', user_type_id:7, status, push_notification_token:'',
   registered_date: new Date(), address:{street, landmark, area_code, city, state, country:'INDIA', latitude,
   longitude, pincode}}`.
2. `CustomersService.createSalesPerson(entity)` posts `POST ${coreUrl}/customer` and returns `res.data[0].id` when
   `res.success`. On any error it returns null.
3. **If an id came back:**
   - It builds the Firestore doc (`mapSalesPersonFb`): `{id, name, businessName, mobileNumber (number), email,
     enableLogOut:false, isActive: status==1, userTypeId:7, latitude, longitude, address:{…same as above}}`.
   - `SalesPersonService.createSalesPersons(id, doc)` writes it with `setDoc(doc(db,'SalesPerson',id), doc)`.
   - Swal success "SalesPerson created successfully".
4. **Always** `navigateByUrl('/salesperson-list')`. If the API returned null it navigates silently with no error message.
5. **On a thrown error:** "Failed to create customer. Please try again later." (icon error).

### Edit profile (`app-profile-information`, standalone)
- **Load:**
  1. `route.params` provides `id`.
  2. `getSalesPersonById(id)` runs Firestore `getDoc('SalesPerson/{id}')` and returns `data()` or null.
  3. The result goes through `mapToEditInput`, which returns a FormGroup with **no validators**:
     `customerId, name, email, createdDate, mobileNumber, businessName, businessTypeId, businessTagStatus, shopUrl,
     gstNumber ('Un-Registered' default), gstCertificateUrl, registrationDocumentUrl, photoIdUrl, status`.
  4. Then `patchValue({status: doc.status})`. SalesPerson docs written by the create flow have no `status` field.
  5. **On failure** (including a null doc): Swal error "Failed to Get customer. Please try again later.".
- **UI:** only Name and Business Name are shown. The Business Name input's placeholder really is "Customer id".
- **Update (`updateCustomer()`):**
  1. Runs the same invalid / letters-only checks as the create page.
  2. Firestore `updateDoc('SalesPerson/{id}', {name, businessName})`.
  3. `SalesPersonService.updateSalePersonDb(id, {name, business_name})` sends `PUT ${coreUrl}/customer/{id}`. Its
     errors are swallowed and logged as "getCustomerCount error".
  4. Swal success "Customer updated successfully", then navigate to `/salesperson-list`.
  5. **On error:** "Failed to create customer. Please try again later.". The copy says "create" even on the edit page.
- **Unused:** the `toUppercase`, `getFileExtension` and `businessTypeKeys` members, the image/upload fields, and the
  injected `MatDialog`, `CustomersService` and `AuthService`.

## 5. Other pages
- **`app-welcome`:** a static card with the title "Home Page" and the text "Thank you for visiting. We provide amazing
  services and products.". It logs "Welcome Component" and the permissions.
- **`app-result-page`:** a leftover from the Egret search demo. It renders `*ngFor` over `countries$ | async`, but
  `countries$` is never assigned, so the page shows an empty `.mat-box-shadow` box. It injects `SearchService`, a
  chunk-local service with `searchTerm` (`BehaviorSubject('')`) and `searchTerm$`, and never uses it.
- **`app-customers`:** an empty placeholder with an empty template. CustomersListModule imports SharedModule, Card,
  Table and Paginator.

## 6. Backend touchpoints (in this scope)

| Kind | Where | Details |
|---|---|---|
| Firebase Auth | signin | `signInWithCustomToken(auth, idToken)`. `authState`, `getIdTokenResult`/`getIdToken(true)` in AuthService |
| RTDB read | signin.getUser | `get(ref(db, 'Crm/{uid}/'))` uses `roleTypeId` and `name` |
| RTDB read | CustomersService.fetchCustomerById | `objectVal(ref(db,'Customer/{id}'))` |
| RTDB query | CustomersService.fetchSalesPersons | `objectVal(query(ref(db,'Customer'), orderByChild('userTypeId'), equalTo(7)))` maps to `[{id,name}]` |
| Firestore | list | `getDocs(collection('SalesPerson'))` |
| Firestore | dialog | `query(collection('Users'), where('user_type','==',2))` reads `name, id, user_type, mobile_number` |
| Firestore | dialog, list | `updateDoc(doc('SalesPerson', id), {salesLeadId, salesLead{…}, salesManagerId, salesManager{…}})`, or `{enableLogOut:true}` |
| Firestore | create | `setDoc(doc('SalesPerson', newId), {...})` (fields in §4) |
| Firestore | profile | `getDoc(doc('SalesPerson', id))`, then `updateDoc(..., {name, businessName})` |
| Firestore | AuthService | `docData(Users/{uid})` reads `roles` and `extended_permissions`. `collectionData(pages)` (`page_id`), `collectionData(Roles)` (`id`, `permissions`) |
| REST POST | create | `${coreUrl}/customer` with the snake_case body (§4). Reads `success` and `data[0].id` |
| REST PUT | profile | `${coreUrl}/customer/{id}` with `{name, business_name}` (SalesPersonService.updateSalePersonDb) |
| REST GET | CustomersService.getCustomerById | `${coreUrl}/api/customer/{id}` returns `data`. Not called in this scope |
| REST PUT | CustomersService.updateCustomer | `${coreUrl}/api/customer/{id}`, body is the customer minus `id`. Not called in this scope |
| REST POST | CustomersService.fetchCustomerList | `${coreApiUrl}/Customer/get_customers_by_sales_person` with `{pageNumber,pageSize,...filters}`. Not called in this scope |
| REST POST | CustomersService.fetchCustomersNearGeoJson | `${coreUrl}/customer/customers_by_geojson` with `{geoJson, businessCategoryIds}`, returns `data`. Used by chunk 35 |
| REST POST | CustomersService.exportCustomersByFilters | `${coreApiUrl}/Customer/export_customers_by_filters`, `responseType: 'blob'`. Not called in this scope |
| REST POST | AuthService | `${authServiceApiUrl}/api/auth/generate_token` `{userId, userType:4}` and `/api/auth/refresh_token` `{token}`. Both send `No-Auth`, so no bearer token |
| REST POST | AuthService.signOut | `${cloudFunctionsUrl}/revoke_user_token_uid` `{uid}` (No-Auth) |
| Redirect | signin, AuthService | `${ssoUrl}/login?redirectto=http://${host}/sessions/signin`, returning with `?idToken=` |
| localStorage | signin | `userDetails` = `{userId, roleTypeId, name}`. Through LocalStoreService (JSON-encoded): `uid`, `idToken` |

**`coreApiUrl` is never set.** `ConfigService.loadConfig()` (main 946) copies only `env`, `firebaseConfig`,
`ssoUrl`, `cloudFunctionsUrl`, `coreUrl`, `authServiceApiUrl` and `messagingServiceUrl`. So `getConfig().coreApiUrl`
is `undefined`, and both `coreApiUrl` endpoints resolve to `"undefined/Customer/..."` as built.

## 7. Libraries (version evidence)
- **Angular 16.0.5** (`new Version("16.0.5")`). Angular Material MDC: the styles reference `.mdc-data-table__cell` and
  `.mat-mdc-raised-button`. `@angular/animations`.
- **@angular/fire** (modular API). The `ɵzoneWrap` wrappers are `signInWithCustomToken`, `authState`, `getIdToken`,
  `objectVal`, `get`, `getDocs`, `setDoc` and `updateDoc`. **firebase JS SDK 10.14.1**.
- **sweetalert2 11.7.27** (`li.version="11.7.27"`), default import `Swal`.
- **xlsx (SheetJS) 0.18.5**, lazy chunk 574 (`version:"0.18.5"`), used by ExcelService.
- **@ngx-translate/core:** TranslateModule (main 3081 `aw`), imported by SessionsModule.
- **ngx-perfect-scrollbar:** PerfectScrollbarModule (main 2769 `Xd`, exportAs `ngxPerfectScrollbar`, config token
  `PERFECT_SCROLLBAR_CONFIG`), imported by SessionsModule. It may be a fork/vendored copy for Angular 16.
- **RxJS 7:** `lastValueFrom`, `takeUntil`, `map`, `BehaviorSubject`.
- **Egret template:** assets/images/egret.png and the session/error page markup. Templates use Tailwind classes
  (`!m-0`, `sm:flex-row`, `rtl:ml-2`, `md:flex-row`).
- `fxFlex="0 1 auto"` is present as a plain attribute. No FlexLayout directive is active.

## 8. Shared dependencies (module id → inferred name → what it is)

These are the names and paths I assumed in imports. The main-chunk agent's names may differ, so reconcile at merge time.

| id (export) | Name used | Assumed path | What |
|---|---|---|---|
| 6125 (`Q`) | `RoutePaths` | `app/shared/constants/route-paths` | Route constants (WELCOME 'home', SIGNIN 'signin', SALESPERSON_LIST 'salesperson-list', SALESPERSON_CREATE 'create-salesperson', CUSTOMER_LIST 'customers-list', SEARCH 'search', …) |
| 6081 (`V`) | `DbCollections` | `app/shared/constants/db-collections` | Collection/node names: CUSTOMER 'Customer', DEALER, MERCHANT, FIELDAGENT, CRM 'Crm', MARKETINGEXECUTIVE, SALES_PERSON 'SalesPerson', USERS 'Users', … |
| 5774 (`u`) | `PageIds` | `app/shared/constants/page-ids` | `{crm_sales_person_list, crm_attendance, crm_salesperson_planning, crm_task_report, crm_interactions, crm_performance_report}` (`A` is an enum Welcome/Profile/NotFound) |
| 8352 | `UserType` (`FW`), `AlertType` (`RN`: 'error'/'warning'/'success'), `BusinessType` (`_$`), `SalesPersonStatus` (`d3`: InActive 0 / Active 1), `STATES` (`$q`: 30 Indian states `{id,name,stateCode}`), `FirestoreOperator` (`YQ`) | `app/shared/models/enums` | Enums/constants. UserType: Customer 1, Dealer 2, Merchant 3, FieldAgent 4, SupportMember 5, MarketingAgent 6, SalesPerson 7, SalesLead 8, SalesManager 9, Guest 99 |
| 1972 | `warningError` (`N9`), `isValidPinCode` (`bW`), `restrictMaxLength` (`H6`), `generateUUID` (`M8`) | `app/shared/helpers/utils` | Helper functions |
| 9143 | barrel: `AuthService` (`e8`→8175), `UserService` (`KD`), `SalesPersonService` (`Yf`→2937), `LocalStoreService` (`gy`) | `app/shared/services` (index.ts) | UserService: `fetchUserById(id)` (RTDB `Crm/{id}`), `fetchSalesPersons(userType)` (Firestore `Users` where `user_type == userType`) |
| 8175 (`e`) | `AuthService` | `app/shared/services/auth.service` | Auth, permissions and API token. The profile page imports it directly |
| 2937 (`Y`) | `SalesPersonService` | `app/shared/services/sales-person.service` | Methods used here: `getSalesPersons`, `createSalesPersons(id, doc)`, `getSalesPersonById`, `updateSalesPerson`, `updateSalesPersonProfile`, `updateSalePersonDb` |
| 1343 (`C`) | `FirestoreService` | — | `fetchCollection`, `fetchDocument`, `insertDocWithId` (setDoc), `updateDocument` (updateDoc + a leaked onSnapshot), `queryCollectionByFilters` |
| 1057 (`l`) | `FirebaseDbService` | `app/shared/services/firebase-db.service` | RTDB: `fetchDataFromNode` (objectVal), `queryDataByValue`, `getDataFromNode` (get), `getDataByValue`, `updateData`, `setData` |
| 946 (`E`) | `ConfigService` | `app/shared/services/config.service` | `getConfig()` (see the coreApiUrl caveat) |
| 7009 (`P`) | `AppLoaderService` | `app/shared/services/app-loader/app-loader.service` | `open(title='Please wait', {width:'200px'})` opens the `app-app-loader` (main 33) dialog; `close()` |
| 7618 (`a`) | `AuthGuard` | — | Always true (see §2) |
| 4453 / 7751 | `AuthLayoutComponent` / `AdminLayoutComponent` | — | Layouts |
| 2994 (`m`) | `SharedModule` | `app/shared/shared.module` | Exports CommonModule, Forms/ReactiveForms, SharedMaterialModule, MatSelectModule and the shared components. Provides AppLoaderService, AppConfirmService and others |
| 5772 (`m`) | `SharedMaterialModule` | `app/shared/shared-material.module` | All Material modules (Checkbox, Button, Input, Autocomplete, Datepicker, FormField, Radio, Select, Sidenav, Card, Icon, ProgressBar, Dialog, SnackBar, Table, Sort, Paginator, NativeDate, …) |
| 2769 (`Xd`) | `PerfectScrollbarModule` | `ngx-perfect-scrollbar` | — |
| 3081 (`aw`) | `TranslateModule` | `@ngx-translate/core` | — |
| 9049 | `@angular/fire/auth` | — | `gx` Auth, `_p` signInWithCustomToken, `fD` authState, `ag` getIdTokenResult, `wU` getIdToken |
| 7497 / 2167 | `@angular/fire/database` / `@angular/fire/firestore` | — | — |
| 2541 (`v`), 4249 (`U`) | `CustomersService`, `ExcelService` | `app/shared/services/customers.service`, `excel.service` | Common chunk; reconstructed here |
| 574 | `xlsx` | — | SheetJS |
| 5226 | `sweetalert2` | — | — |

Material symbol IDs:
- 1728 Button, 7081 ProgressBar, 8097 Input, 9114 FormField (`KE` field, `hX` label, `lN` module), 6012 Card,
  1292 Checkbox, 430 Icon, 787 Select, 1217 core (`ey` MatOption, `XK` MatNativeDateModule), 3627 Table,
  3276 Paginator (`TU` module), 2214 Sidenav, 2611 Sort (`YE` MatSort), 8280 Datepicker (`FA` module),
  4867 Radio (`Fk` module), 6286 Dialog (`so` DialogRef, `WI` MAT_DIALOG_DATA, `uw` MatDialog), 2342 SnackBar.
- 9401 forms: `nJ`/`p4` are the `UntypedFormGroup`/`UntypedFormControl` aliases, `cw`/`NI` are `FormGroup`/`FormControl`.
- 4755 common, 1531 router, 1591 animations, 5861 the babel asyncToGenerator helper (i.e. `async` functions),
  1135 BehaviorSubject, 9808 lastValueFrom, 2722 takeUntil, 4004 map, 3144 HttpClient.

## 9. Uncertainties and quirks
- **Class and file names are inferred.** The selectors are exact. The property names come from the bundle
  (`customersService` in chunk 195, `customerService` in chunk 35, `excelService` elsewhere), and I picked
  CustomersService and ExcelService from those.
- **Original enum and constant names are unknown.** `RoutePaths`, `DbCollections`, `AlertType`, `PageIds` and the
  helper names are my choices.
- **Standalone component `imports` were rebuilt from their `dependencies` arrays.** The module list order is
  preserved, but the exact original `imports` order and any NgModule wrappers may differ slightly.
- **`[routerLink]="'/sessions/...'"`** on the session pages is a constant string property binding. The source may
  have written it differently.
- **`user_type == 2` in the `Users` collection** is used for both Lead and Manager dropdowns. What value 2 means
  (lead? manager?) can't be determined from this code.
- **Expected bugs to keep or fix:**
  - The signin page form is hidden forever. Its error path throws because `submitButton` is undefined.
  - `takeUntil([])` is a no-op.
  - The SSO redirect is hard-coded to `http://`.
  - Validation mislabels longitude as "latitude".
  - The profile form drops its validators after loading.
  - The profile page patches `status`, which SalesPerson docs don't have.
  - `createSalesPerson` has unreachable trailing code.
  - `coreApiUrl` is missing from ConfigService.
  - The create flow can leave a core record without a Firestore doc, if setDoc fails. `insertDocWithId` swallows
    the error, so the success message still shows.
- **Compile assumptions** (not tested here, since there is no `tsc` in this environment):
  - Egret-style imports resolve `app/...` through `baseUrl` = `src`.
  - `strict` and `strictTemplates` are off, as in Egret. For example `[formControl]="signupForm.controls['email']"`
    passes an AbstractControl.
  - `useDefineForClassFields: false` (the Angular CLI default).
