# Fixes: Attendance and Performance

| File | Bug (original behaviour) | Fix | Visible change? |
|---|---|---|---|
| performance/mtd-performance-report.component.ts | Checked page id `'mtd_performance_report'`; the menu entry is gated by `crm_performance_report` | `pageId = PageIds.crm_performance_report` | Yes: page opens for menu-permitted roles |
| performance/mtd-performance-report.component.{ts,html} | Sort headers rendered but clicking didn't sort | One `MatTableDataSource` per table, fed by `updateDataSources()`; template refs + `@ViewChild` setters assign each `MatSort` | Yes: headers sort (DOM unchanged) |
| performance/mtd-performance-report.component.ts | Export before a search threw (`Object.keys(undefined)`) | Empty check handles undefined; export-permission guard in the handler | Yes: warning shown |
| performance/mtd-performance-report.component.ts | "There Is No data to downLoad" | "…download" | Yes (text) |
| performance/mtd-performance-report.component.ts | Permission subscription never unsubscribed | `destroy$` + `takeUntil`, `ngOnDestroy` | No |
| attendance/leave-request/leave-request.component.ts | `localStorage.clear()` on Clear Filters / beforeunload wiped the session `uid`; `writeValue` threw when the selects weren't rendered | `removeItem('selectedFilters')`; `?.` on the select refs | No |
| attendance/leave-request/leave-request.component.html | "Leave Cancelled" was behind `status === 5`, so it never showed | `status === 9` | Yes |
| attendance/leave-request/leave-request.component.ts | No early-logout rows cleared the list with "No Records Found" even when leave requests existed | Warn only when the combined list is empty | Yes: leave requests listed |
| attendance/leave-request/leave-request.component.ts | Approved-leave marker docs (AttendanceReport status 7) showed as near-blank duplicate "Leave Approved" rows | Status 7 excluded from the AttendanceReport part (the LeaveReport row remains) | Yes: duplicates gone |
| attendance/leave-request/leave-request.component.ts | Confirm used SweetAlert1 options (`type`, `closeOnConfirm`) that SweetAlert2 ignores, so no icon | `icon: 'warning'` (typed `SweetAlertOptions`) | Yes: warning icon |
| attendance/leave-request/leave-request.component.ts | Update failures were unhandled; could run with an undefined status | try/catch with error alert ("An error occurred while updating the request status."); success only after the write | Only on failure |
| attendance/leave-request/leave-request.component.ts | Permission subscription never unsubscribed | `destroy$` + `takeUntil`, `ngOnDestroy` | No |
| attendance/attendance-details/attendance-details.component.ts | Same `clear()` / select-ref problems | Same fix as leave-request | No |
| attendance/attendance-details/attendance-details.component.ts | `formatDate(undefined)` threw and silently aborted the whole search | Missing values become `''`; real errors show the existing error text; loader closes in `finally` | Rows show |
| attendance/attendance-details/attendance-details.component.ts | Permission subscription never unsubscribed | `destroy$` + `takeUntil`, `ngOnDestroy` | No |
| attendance/attendance-summary/attendance-summary.component.ts | Export before a search threw and showed the download-error alert | Undefined/empty check shows "Attendance Summary not found" | Yes |
| attendance/attendance-summary/attendance-summary.component.{ts,html} | Download button had no export-permission check | `*ngIf="permissionObj?.export"` + guard in the handler | Only for users without export permission |
| attendance/attendance-summary/attendance-summary.component.ts | Per-sales-person queries ran one after another | `Promise.all` (same order, filters and counts) | No (faster) |
| attendance/attendance-summary/attendance-summary.component.ts | Permission subscription never unsubscribed | `destroy$` + `takeUntil`, `ngOnDestroy` | No |
| shared/services/sales-person.service.ts | `getFilteredCollection()` swallowed query errors and returned `[]`, so the Summary showed that person as fully absent | Errors are rethrown; the Summary shows its error message instead of wrong numbers | Only on failure |

Left as-is on purpose: summary counting rules (present = checked-out days, leave = approved leave), the Calendar-based date range, Performance search errors (only logged; the screen has no error text), unused injected services.
