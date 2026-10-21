# Fixes: shared code (layout, auth, services)

| File | Bug (original behaviour) | Fix | Visible change? |
|---|---|---|---|
| shared/services/auth/auth.service.ts, shared/components/header-side | SIGNOUT only revoked the refresh tokens (cloud function) and reloaded; Firebase `signOut` was never called, so the cached session kept the user signed in | Revoke tokens, sign out of Firebase, clear local storage, return to the SSO login | Yes: sign-out works |
| shared/services/auth/auth.service.ts | Firestore permission listeners (`Users/{uid}`, `pages`, `Roles`) were re-created on every auth emission and never removed | Created once per signed-in user, removed on sign-out | No |
| shared/services/auth/auth.service.ts | `setPermission()` crashed for users with roles but no `extended_permissions` field | Missing field treated as "no extra permissions" | No |
| shared/guards/auth.guard.ts | `map(() => true)`: the guard let every navigation through, so signed-out users briefly saw admin pages | Waits for the restored session; signed-out users go to the sign-in (SSO) page | No (for signed-in users) |
| views/sessions/signin | Redirected to SSO on the initial `null` of `user$`, before a persisted Firebase session was restored | Waits for the real auth state | No |
| views/sessions/signin | Sign-in error path touched a never-rendered button and threw, so a bad/expired SSO token left a blank page | Error alert with "Sign in again" (back to SSO) | Error path only |
| shared/services/config.service.ts | `coreApiUrl` was not copied from config.json, so two customer endpoints called `undefined/Customer/...` | Copied like the other URLs | No |
| shared/services/firestore.service.ts | `in` filters with more than 30 values (e.g. selecting many sales persons) failed: Firestore's disjunction limit | Large `in` lists are split into several queries and merged (paged queries keep their order and page size) | Yes: large selections work |
| shared/services/firestore.service.ts | `insertDocWithId` swallowed write errors, so callers reported success after failed writes | Errors rethrown | Error path only |
| shared/services/firestore.service.ts | `updateDocument` attached an `onSnapshot` listener on every call and never removed it | Listener removed | No |
| shared/services/sales-person.service.ts | Interaction paging used inclusive bounds (`<=` last / `>=` first timestamp), repeating the boundary row on the next/previous page | Exclusive bounds | Yes: no duplicate rows |
| shared/services/sales-person.service.ts | `getDealers()` used `lastValueFrom` on a never-completing stream and never resolved | `firstValueFrom` | No |
| shared/services/sales-person.service.ts | `updateSalePersonDb` swallowed HTTP errors (logged as "getCustomerCount error") | Errors rethrown with the right label | Error path only |
| shared/services/sales-person.service.ts | `getFilteredCollection` swallowed query errors and returned `[]` (Attendance Summary then showed people as absent) | Errors rethrown; the Summary shows "Something Went Wrong" | Error path only |
| shared/services/sales-person.service.ts | `downloadInteractionsByFilters` had no null guards for mobile number / sales person ids | Guards added | No |
| shared/services/app-loader/app-loader.service.ts | Opening the "Please wait" loader while it was already open created a second dialog and lost the first one, which then stayed on screen forever (seen on the live Planning page) | An open loader is reused; `close()` always closes it | Yes: no stuck loader |
| shared/helpers/utils.ts | `restrictMaxLength` turned truncated number inputs into strings | Numbers stay numbers | No |
| (ngx-perfect-scrollbar) | Package 10.1.1 is View Engine-only and can't be compiled by Angular 16 (production used an unknown Ivy fork) | Local drop-in directive with the same API (`shared/perfect-scrollbar`), mapped via tsconfig `paths` | No |

Known limitation kept: interaction paging is by `createdTimeStamp`; interactions sharing the exact boundary millisecond could be skipped. A document cursor (`startAfter(snapshot)`) would make it exact.
