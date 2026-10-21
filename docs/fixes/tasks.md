# Fixes: tasks / interactions (agent `tasks`)

Folders: `src/app/views/tasks`, `src/app/views/interactions`. Build: `ng build --configuration development` (Node 18,
persistent cache off) completes with no errors or warnings.

| File | Bug (original behaviour) | Fix | Visible change? |
|---|---|---|---|
| interactions/interaction-list/interaction-list.component.html | "Download Excel" had two identical `(click)` bindings, so one click opened two confirms and exported twice | Single `(click)` | Yes: one confirm and one file per click |
| interactions/interaction-list/interaction-list.component.html | The Prev/Next bar sat outside the permission container, so a user without `view` saw "1 of N" and could page under the "no permission" text | `*ngIf="showPagination && permissionObj?.view"` | Only for users without view permission |
| interactions/interaction-list/interaction-list.component.ts `removeSearchItem/removeBadge` | Removing any badge except "Date Range" threw a TypeError (`dateRange.length` of undefined). Removing "Date Range" deleted the dates, so queries ran with NaN bounds. Up to 3 overlapping reloads stacked loader dialogs | Removing a badge clears that filter (mobile to `''`, sales persons to `[]`) and reloads page 1 once. Dates are mandatory for every Interactions query, so removing "Date Range" resets it to the default range (today to today) and the badge shows that range. The unreachable 'please give start date and end date ' branch is removed | Yes: badges can be removed |
| interaction-list.component.ts `showInteractionReport` | Summary "Total Visited Count" counted only the 50 rows of the visible page. The loader stayed open if the query failed | Counts all interactions matching the current filters (`downloadInteractionsByFilters`). Loader closed in `finally` | Yes: correct counts |
| interaction-list.component.ts `interactionSummaryPopUp` | With an empty table, `showInteractionReport()` returned undefined, then `.length` threw a TypeError. Errors were unhandled | Returns null, and the caller stops after the existing "No records found" warning. Errors show `'An error occurred while loading the interaction summary.'` | Error path only |
| interaction-list.component.ts `resetPageAndFetchData` | A new search (dialog or badge) after Next/Prev kept `navigateNextPage`/`navigatePrevPage` and the old cursor, so it did not start at page 1 | Resets `setPage=1`, `paginationFirstItem/LastItem=0`, both navigate flags, and `prevPageAvailable` | Yes: new searches start at page 1 |
| interaction-list.component.ts `getInteractions/prevPage/nextPage` | Next was enabled whenever a page had exactly 50 rows, so a last page of exactly 50 rows led to an empty page and the pagination bar vanished. Page numbers changed before the load, so on a failure the "x of N" label was wrong. A new search with no results left the old rows on screen. The loader was closed manually and errors were silent | `nextPageAvailable = setPage < totalPages` (from the total count). `prevPageAvailable = setPage > 1`. Prev to page 1 runs the plain first-page query, so it returns exactly page 1. If Next/Prev loads nothing, the current page, its label and its buttons are restored. A new search with no rows (or an error) clears the table and hides the bar. Loader closed in `finally`. Errors show `'An error occurred while fetching interactions.'` The service bounds are exclusive, and there was no component-side off-by-one code to remove | Yes: paging is correct |
| interaction-list.component.ts `downloadToExcel` | An empty result fired 'No records found', which the 'No Interactions Found.' error instantly replaced | Only the 'No Interactions Found.' error (the message users actually saw) | No |
| interaction-list.component.ts `openPopUp/getSelectedSalesPersonNames` | Passed `{id,name}` objects where ids were expected (always `[]`), and threw if `salesPersonList` had not loaded yet | Passes ids, guards the list | No (value not rendered) |
| interaction-list.component.ts, tasks/task-list/task-list.component.ts | `permission$` subscriptions were never unsubscribed | `destroy$` + `takeUntil`, `ngOnDestroy` | No |
| tasks/task-list/task-list.component.ts `clearFilters` | `localStorage.clear()` wiped the session `uid` and every other key. `taskDetails` stayed true, so "No Tasks Found" lingered after Clear Filters. `salesPersonSelectRef` was undefined without view permission, which threw | `removeItem('selectedFilters')` only. `taskDetails = false` (back to the "no search yet" state). `salesPersonSelectRef?.` | Yes: no lingering header |
| task-list.component.ts `unloadHandler` (window:beforeunload) | Called `clearFilters()`, so every reload/close wiped all of localStorage and threw without view permission | Only removes `selectedFilters` | No |
| task-list.component.ts `searchTasks` | A failed search said 'An error occurred while downloading tasks.' | 'An error occurred while fetching tasks.' (downloads keep the original text) | Error path only |
| tasks/task-details/task-details.component.ts + .html | The `mat-paginator` (25/50/100) was not connected: the table bound the plain array and every row showed | Table binds `MatTableDataSource`, `dataSource.paginator = paginator` (static ViewChild) | Yes: paging works |
| task-details.component.ts `ngOnInit/getDataByFilters` | The catch returned undefined, so `tasksList.length` threw and the loader never closed. A missing `TasksReport/{id}` made the mapper throw | try/catch/finally; missing doc or error shows 'No Tasks Found' with an empty table; loader always closed | Error path only |
| task-details.component.ts `navigateToTaskList` | A missing or unreadable `Interactions/{id}` doc made the dialog constructor throw (nothing happened) | Shows the "No interaction found" warning instead | Error path only |
| task-details.component.ts `showWarning` | Text "No interation found" | "No interaction found" | Yes (typo) |
| interactions/models/interaction.model.ts | Comments described the old behaviour | Comments updated | No |

## Deliberately left as-is

- The search dialog does not pre-select the current sales persons (dates and mobile number are prefilled), so a re-search without touching the select drops that filter. The dialog shows an empty select, so what you see matches the result. Changing it would change the dialog UI.
- Every page load still runs the full unpaginated query, which is needed for the total count ("x of N", Next state).
- `InteractionDetails` shows `0-0` for a check-out location without a checkout, because the data stores 0. This matches production.
- TaskList `localStoredFilters` (read but never applied) and the `selectedFilters` query parameter (never read) are dead but harmless.

## Runtime checks to do (no browser used by this agent)

1. /interaction-list with more than 50 interactions in range: Next, then Prev, should show the same first page. On the last page Next is disabled, including when that page has exactly 50 rows. The label reads "k of N".
2. Press Next, then search via the dialog or remove a badge: the result starts at "1 of N".
3. Remove the Mobile Number / Sales Person badge: no console error, and the list reloads. Remove Date Range: it resets to today's range.
4. Click "Download Excel" once: one confirm, one file.
5. Summary: "Total Visited Count" equals the number of interactions in the range for each sales person, not only the current page.
6. /task-report, then Clear Filters: `localStorage.uid` is kept and the "No Tasks Found" header is gone. Reloading the page keeps `uid`.
7. /task-report/task-details/:id with more than 25 stops: the paginator pages through 25/50/100.

## Needs shared change

- `SalesPersonService.getInteractionsByFilters` pages by timestamp value (`<` / `>`). Interactions that share the boundary row's `createdTimeStamp` exactly would be skipped. A document cursor (`startAfter(lastDocSnapshot)` / `endBefore`) in `FirestoreService.queryNextPage` would make the paging fully exact. This is not needed for the current data.
- `SalesPersonService.downloadInteractionsByFilters` reads `mobileNumber.length` and `salesPersonIds.length` without null guards (`getInteractionsByFilters` has them). The callers here always pass a string and an array.
