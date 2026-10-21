# Bug fixes: people (salesperson, sessions, welcome, search-view, customers-list)

Scope: `src/app/views/salesperson`, `src/app/views/sessions` (but not `signin`), `src/app/views/welcome`,
`src/app/views/search-view`, `src/app/views/customers-list`.

Build: `NG_PERSISTENT_BUILD_CACHE=0 npx ng build --configuration development --output-path <scratch>/dist-people`
on Node 18. It exits 0 with no warnings or errors.

| File | Bug (original behaviour) | Fix | Visible change? |
|---|---|---|---|
| salesperson/create-salesperson/create-salesperson.component.ts | The negative-value message labelled longitude as "latitude" (e.g. "latitude,latitude ,have negative values…"). | The longitude entry is labelled `longitude`. | Yes, message text only |
| 〃 | `salespersonEmail` had only `Validators.required`, so any text was accepted as an email. | Added `Validators.email`. If every other field is valid and only the email format is wrong, the page warns "please enter valid email" in the same `Swal.fire('', msg, 'warning')` style. Otherwise it still says "Please fill all required fields.". | Yes: new warning, and the email field shows the Material invalid (red) state when it's malformed |
| 〃 | When the core API returned no id (`createSalesPerson` returns `null` on any failure), the page went back to `/salesperson-list` with no message. | A missing id now raises the existing error "Failed to create customer. Please try again later." and the user stays on the form. | Yes, error alert instead of a silent redirect |
| 〃 | Success was shown even if the Firestore `setDoc` failed, because `insertDocWithId` swallows errors. | After `createSalesPersons` the page reads `SalesPerson/{id}` back. If the doc is missing it shows the error and stays on the form. The success alert and redirect happen only when both the API call and the Firestore write succeeded. The loader still closes in `finally`. | Only on failure |
| 〃 | A pin code of `0` skipped the 6-digit check (`pinCode && …`). The mobile check looked only at length, so a decimal such as `9876543.21` passed. | The pin code is always checked: it's required, so it's never empty there. The mobile number must match `/^\d{10}$/`. The messages are unchanged. | Only for those invalid inputs |
| 〃 | The `permission$` subscription was never unsubscribed. | `destroy$` + `takeUntil`, and `ngOnDestroy`. | No |
| salesperson/profile-information/profile-information.component.ts | `mapToEditInput` replaced the validated form with one that had no validators, so an empty Name or Business Name could be saved. | Name and Business Name keep `Validators.required`. The letters/spaces check already in `updateCustomer()` still applies, so the rules match the create page. `editForms()` now runs before the route subscription. | Only when a field is emptied (the required state and the "Please fill all required fields." warning) |
| 〃 | The success alert showed even when the core `PUT /customer/{id}` failed: `updateSalePersonDb` swallows errors and resolves `undefined`. | An `undefined` result or `success === false` counts as a failure. The page shows an error and stays. Firestore errors already rejected and go to the same catch. | Only on failure |
| 〃 | The error text on the edit page said "Failed to create customer. Please try again later.". | "Failed to update customer. Please try again later." (both catch blocks). | Yes, text |
| 〃 | `patchValue({status: doc.status})` ran even when the doc has no `status`, which is true of every doc the create flow writes, so status was set to `undefined`. | Patched only when `status` is not null/undefined. | No |
| 〃 | A null doc (unknown id) made `mapToEditInput(null)` throw a TypeError, which was only caught by the generic catch. | An explicit null check shows the existing "Failed to Get customer. Please try again later." and keeps the empty validated form. Nothing throws. | No (same alert) |
| salesperson/profile-information/profile-information.component.html | The Business Name input's placeholder was "Customer id". | The placeholder is "Business Name", and the comment about it was removed. | Yes. The placeholder only shows while the field is focused and empty |
| salesperson/edit-salesperson-dialog/edit-salesperson-dialog.component.ts | There was no error handling around the Firestore `updateDoc`. A failure was an unhandled rejection: no message, and the dialog stayed open in a broken state. | `update()` wraps the save in try/catch. On failure it shows `Swal.fire('error', 'Failed to update changes. Please try again later.', 'error')` and the dialog stays open without closing with a payload, so the list doesn't reload. The success paths are unchanged. | Only on failure |
| 〃 | Lead/manager loading in `ngOnInit` had no catch, which caused an unhandled promise rejection. | try/catch with the error alert "Failed to load leads. Please try again later." | Only on failure |
| 〃 | The `permission$` subscription leaked because `ngOnDestroy` was empty. | `destroy$` + `takeUntil`. | No |
| salesperson/salesperson-list/salesperson-list.component.ts | "Enable logout": if `updateSalesPerson` failed, the loader never closed (no try/finally), the rejection was unhandled and the user got no message. | try/catch/finally. The loader always closes before the alert, which keeps the original order. Success sets `row.enableLogOut` and shows the original alert. Failure shows "Failed to enable force logout. Please try again later.". | Only on failure |
| 〃 | Already-enabled row: `warningError(...)` returns an Error but doesn't throw it. | I kept this: the row only gets the warning and the function returns early. No update runs and no Error is thrown. The flow is now a flat early-return. | No |
| 〃 | The `permission$` subscription was never unsubscribed. | `destroy$` + `takeUntil`, and `ngOnDestroy`. | No |
| 〃 | Reload after the dialog closes. | I checked it and it works: `afterClosed()` completes by itself, a truthy payload re-fetches and replaces the array, and the table re-renders. No change needed. The unused "SIDENAV CONTENT HERE" sidenav is untouched. | No |
| sessions/not-found, sessions/error, sessions/unauthorized (`*.component.html`) | "Back to Dashboard" linked to `/others/blank`, a route that doesn't exist. | It links to `['/home']`. "Report this Problem" is unchanged. | Yes, link target only |
| sessions/signup/signup.component.html | Typo: "Invaild email address". | "Invalid email address". | Yes, text |
| welcome/welcome.component.ts | The `permission$` subscription was never unsubscribed. | `destroy$` + `takeUntil`, and `ngOnDestroy`. | No |

## Left as-is on purpose
- **search-view `app-result-page`** (an empty shadowed box, because `countries$` is never assigned) and **customers-list
  `app-customers`** (an empty placeholder). This is production behaviour and there's nothing to fix without
  inventing a feature.
- **signup / forgot-password** are stock Egret pages with no backend. Submitting only disables the button.
- **The profile page has no permission check.** Production has none, and adding one would change what users see.
- **The Lead and Manager dropdowns run the same query** (`Users` where `user_type == 2`). Changing it is a data or
  product decision, not a clear bug.
- **The messages still say "customer"** on the salesperson pages, e.g. "Customer updated successfully". Only the
  wrong verb was fixed.
- **Retrying the create after a Firestore-only failure** posts a second core customer, because the core API
  generates its own id. I kept this simple and left the error message as the signal.
- **`restrictMaxLength` turns truncated values into strings.** `mobileNumber` and `pinCode` can then be written as
  strings. That is a shared helper (see below).

## Needs shared change
1. **`FirestoreService.insertDocWithId`** (`shared/services/firestore.service.ts`) logs and swallows `setDoc` errors.
   It should rethrow. After that, the create page's read-back check can be dropped.
2. **`SalesPersonService.updateSalePersonDb`** swallows HTTP errors and resolves `undefined`. It also logs them under
   the misleading label "getCustomerCount error". It should rethrow, or at least log the right name.
3. **`restrictMaxLength`** (`shared/helpers/utils.ts`) uses `setValue(value.toString().slice(...))` on
   `type="number"` controls, which turns the value into a string. It should keep numbers numeric (`Number(...)`)
   for numeric inputs.
4. **`AppLoaderService.open()`** overwrites `dialogRef` when it's called while a loader is already open. The first
   loader can then never be closed. Nothing in this scope triggers it, but a guard such as "reuse an open dialog"
   would be safer.

## Runtime checks to do (no browser was used, per instructions)
- **Create Salesperson:**
  - A malformed email with everything else valid shows "please enter valid email".
  - A negative longitude reads "longitude ,have negative values Please Check".
  - A successful create shows the success alert, then the list.
  - With the core POST mocked to fail, the error appears and you stay on the form.
- **Edit Profile:**
  - Clear Name and press Update: you get "Please fill all required fields.".
  - The Business Name placeholder reads "Business Name".
  - `/salesperson-list/edit-salesperson-profile/unknown` shows "Failed to Get customer…" once, with no console
    TypeError.
- **Edit Lead dialog:** make `updateDoc` fail (e.g. an unknown id in the mock). The error alert appears and the
  dialog stays open.
- **List:** with the update failing, "Enable logout" shows the error and the loader closes.
- **Error pages:** `/sessions/404`, `/sessions/error` and `/sessions/unauthorized` all go to `/home` from "Back to
  Dashboard".
