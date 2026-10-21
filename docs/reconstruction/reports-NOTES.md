# Reports agent: Attendance (chunk 205) + Performance (chunk 41)

Source bundles: `205.2f89363751d5667e.js` (AttendanceModule, webpack module id 205) and
`41.23a7346e0c70028f.js` (PerformanceModule, webpack module id 2041). Cross-references were resolved in
`main.0ad03de76494ddf1.js`, `common.89677fd41d0b0854.js` (chunk id 592) and `574.8d629bccc524b818.js`.

## Files written

```
src/app/views/attendance/
  attendance.module.ts                 AttendanceModule
  attendance-routing.module.ts         AttendanceRoutingModule
  attendance.component.{ts,html,scss}  <app-attendance>   (tab shell; no styles in the bundle)
  leave-request/leave-request.component.{ts,html,scss}             <leave-request>       "Approval Request" tab
  attendance-details/attendance-details.component.{ts,html,scss}   <attendance-details>  "Attendance Details" tab
  attendance-summary/attendance-summary.component.{ts,html,scss}   <attendance-summary>  "Attendance Summary" tab
  models/attendance.model.ts           interfaces inferred from usage
src/app/views/performance/
  performance.module.ts                PerformanceModule
  performance-routing.module.ts        PerformanceRoutingModule
  mtd-performance-report/mtd-performance-report.component.{ts,html,scss}  <app-mtd-performance-report>
  models/sales-person-report.model.ts  request/response/mapped models
```

Class names in the bundle are minified. The module names `AttendanceModule` and `PerformanceModule` are real (they
are the lazy-route export names). The component class names come from their selectors.
`AttendanceModule` declares 4 components: `ɵɵsetComponentScope(AttendanceComponent, [NgIf, MatTab, MatTabGroup,
AttendanceSummary, LeaveRequest, AttendanceDetails])`.

Import paths for shared code (`app/shared/...`) are placeholders I chose. They point at the main-bundle modules
listed under "Shared dependencies". Rename them to match whatever the main/shared agent produces.

## Routes & navigation

Defined in main.js under the AdminLayout route (`component: AdminLayoutComponent` (7751), `canActivate: [AuthGuard]`
(7618)). Neither route has `data`.

| URL | lazy chunks | module |
|---|---|---|
| `/attendance-report` (`RoutePaths.ATTENDANCE`) | `Promise.all([e(574), e(592), e(205)])` | `AttendanceModule` |
| `/performance` (`RoutePaths.PERFORMANCE_REPORT`) | `Promise.all([e(574), e(41)])` | `PerformanceModule` |

The child routing modules have the same shape: `{path:'', component:X, children:[{path:'',component:X},{path:<same
constant>,component:X}]}`. Neither component has a `<router-outlet>`, so the children do nothing.

Side menu (main module 1218, NavigationService.plainMenu): the "Sales Person" dropDown (icon `person`) has the sub-items
`{name:"Attendance", state:"attendance-report", code:"sales_person_planning", pageId:"crm_attendance"}` and
`{name:"Performance Report", state:"performance", code:"sales_performance_report", pageId:"crm_performance_report"}`.

## Permissions

All components subscribe to `AuthService.permission$` (a BehaviorSubject `{[page_id]: {view, create, delete, edit, import,
export}}`) and set `permissionObj = permissions[pageId]` once the map is non-empty. None of them unsubscribes, and
there is no `ngOnDestroy`.

- Attendance tabs: `pageId = PageIds.crm_attendance` = `'crm_attendance'`. Only `view` is checked: it gates the whole page and the Search button.
  The Summary "Download Excel" button has no export check.
- Performance: `pageId = 'mtd_performance_report'`, a hard-coded literal that is not in PageIds. `view` gates the page and the
  Search button. `export` gates "Download Excel". The menu entry is gated by `crm_performance_report`, so a role
  also needs `mtd_performance_report` permissions or the user sees the no-permission text.
- No-permission view in every component: `<p class="text-center">You dont have permission , Please contact administrator</p>`.

## Components

### `<app-attendance>` AttendanceComponent
- `selectedTabIndex = 0`. Template: `<mat-tab-group animationDuration="0ms" [(selectedIndex)]>` with three `<mat-tab class="w-30">`:
  "Approval Request" → `<leave-request *ngIf="selectedTabIndex === 0">`, "Attendance Details" → `<attendance-details *ngIf="…=== 1">`,
  "Attendance Summary" → `<attendance-summary *ngIf="…=== 2">`. A tab is destroyed when you leave it, so its data is fetched again each time you open it.

### `<leave-request>` LeaveRequestComponent ("Approval Request")
- DI: SalesPersonService, AuthService, FormBuilder, UserService, AppLoaderService, LocalStoreService.
- `@ViewChild('salesPersonSelectRef')` and `@ViewChild('salesLeadSelectRef')` are MatSelect (static:false).
  `@HostListener('window:beforeunload', ['$event'])` calls `clearFilters()`.
- Form: `startDate: [null, required]`, `endDate: [null, required]`. Each is a readonly `matInput` with `[matDatepicker]`
  (`#appDatepicker1`/`#appDatepicker2`) and a `matSuffix` toggle, placeholder "Start Date" / "End Date". There is **no min/max**
  on either picker. Ordering is only validated on Search.
- Filters: "Sales Person" `mat-select multiple` lists the `salesPersonList` objects by `name`, and its value is `option.value.id`.
  "Lead Name" `mat-select multiple` lists `leadList` (`{name,userId,user_type,mobileNumber}`), and its value is `option.value.userId`.
  Buttons: "Search" (`*ngIf view`) and "Clear Filters".
- ngOnInit: subscribes to permissions, then `leadList = mapToLeads(await userService.fetchSalesPersons(UserType.SalesLead=8))`, then
  `salesPersonList = await salesPersonService.getSalesPersons()`.
- searchAttendanceRequests():
  1. If the form is invalid, warn "Please select Start Date and End Date". If start is missing, warn "Please select Start Date". If end is missing,
     warn "Please select End Date". If start > end, warn "Please select valid Start Date and End Date".
  2. Opens the loader. `prepareFilters()` formats both dates as `yyyy-MM-dd` (en-US) and saves `{startDate,endDate,salesPersonIds,salesLeadIds}`
     to localStorage key `selectedFilters`.
  3. `getAttendanceDetails(...)` (AttendanceReport) is filtered to drop statuses CHECKED_IN(1), CHECKED_OUT(2) and NONE(99).
  4. `getLeaveDetails(...)` (LeaveReport) is used unfiltered.
  5. `attendanceList = [...attendance, ...leaves].map(mapToAttendanceReports)`. Then `handleResponse(attendanceResponse)` runs. If the
     AttendanceReport result is empty, it warns "No Records Found" and clears the list, even when leaves were found (bug).
  6. On error: `Swal.fire('error','An error occurred while showing Request.','error')`. `finally` closes the loader.
- Table (`<mat-table [dataSource]="attendanceList" matSort>` with MatSort attached but no sort headers). `displayedColumns`:
  `salesPersonName, mobileNumber, leadName, leadMobileNumber, date, reason, appliedFor, action, createdDate`.

  | col | header | cell |
  |---|---|---|
  | salesPersonName | Sales Person Name | `salesPerson.name` |
  | mobileNumber | Mobile Number | `salesPerson.mobileNumber` |
  | leadName | Lead Name | `salesLead.name` |
  | leadMobileNumber | Lead Mobile Number | `salesLead.mobileNumber` |
  | date | Applied On | `appliedOn` (raw) |
  | reason | Reason | `reason` |
  | appliedFor | Approval Type | status 1 → "Checked In", 2 → "Checked Out", 3/4/5 → "Early checkout", 6/7/8/9 → "Leave", else "" |
  | action | Status | 3 or 6: buttons **Approve** (`mat-raised-button color=primary class=p-2`) and **Reject** (`color=warn class="ml-5 p-2"`). 4 → green "Reason for early logout Approved". 7 → green "Leave Approved". 5 → red "Reason for early logout Rejected". 8 → red "Leave Rejected". 9 → nothing (the "Leave Cancelled" span sits behind `status === 5`, a bug) |
  | createdDate | Created On | `createdDate \| date:'yyyy-MM-dd'` |

  Colour coding uses the global `text-green` and `text-red` classes. There are no totals, sticky columns or paginator.
  Empty state: `<h3 class="text-center ft-20">No Attendance List Found</h3>` when `attendanceList.length == 0`. This also shows before any search, because the list starts as `[]`.
- updateStatus(row, status, approve):
  1. `getStatusAndMessage` maps 3 to 4 or 5 with the message "Reason for early log out approved/rejected", and 6 to 7 or 8 with "Leave approved/rejected".
  2. A confirm dialog opens: `Swal.fire({title: status===3?'Reason for early logout':'Leave', text:'Do you want to proceed with the confirmation?',
     type:'warning', showCancelButton:true, confirmButtonColor:'#13BB6F', confirmButtonText:'Yes, Proceed!', cancelButtonText:'Cancel',
     closeOnConfirm:true})`. `type` and `closeOnConfirm` are legacy SweetAlert1 keys that SweetAlert2 ignores, so the dialog has no icon.
  3. If `.value` is set, the code calls `updateAttendanceStatus(row.id,{status})` when status == 3, otherwise `updateLeaveStatus(row.id,{status})`.
     Then `Swal.fire({icon: approve?'success':'warning', title: approve?'Success!':'Warning!', text: message})` and `row.status = newStatus`
     update the row in place.
- clearFilters(): `localStoreService.clear()` wipes **all** localStorage, including `uid`. It also resets the form, empties the id arrays and
  `selectedFilters`, calls `writeValue([])` on both selects and sets `attendanceList = []`.

### `<attendance-details>` AttendanceDetailsComponent ("Attendance Details")
- DI: MatDialog (unused), SalesPersonService, AuthService, AppLoaderService, ExcelService (unused), UserService, FormBuilder, LocalStoreService.
- Filters, form, validation messages, the beforeunload handler and clearFilters work as in leave-request. Layout differences: the Search wrapper
  has `mr-4`, and the results block sits outside `.table-container.p-10`.
- search: `getAttendanceDetails(start, end, spIds, leadIds)` filtered to `status !== LEAVE_ACCEPTED (7)`, then mapped.
  On error the loader closes silently. This tab has no "No Records Found" warning.
- Mapping: `checkInTime`/`checkOutTime` become `formatDate(ms,'yyyy-MM-dd HH:mm:ss','en-US')`, or `''` when 0. `createdDate` becomes
  `formatDate(v,'yyyy-MM-dd')`, or `''` when 0. `appliedOn || ''`. Latitude and longitude are mapped but never shown.
- Columns `salesPersonName, mobileNumber, leadName, leadMobileNumber, logIn, logOut, status, appliedDate, reason, createdOn`:
  headers are "Sales Person", "Mobile Number", "Lead Name", "Lead Mobile Number", "Log In" (checkInTime), "Log Out" (checkOutTime), "Status",
  "Applied Date" (appliedOn), "Reason", "Created On" (formatted createdDate).
  Status text: 1 checked in, 2 checked out, 3 Reason for early logout, 4 Reason for early logout Accepted, 5 Reason for early logout
  Rejected, 6 Apply leave, 7 Leave accepted, 8 Leave rejected. 9 and 99 show blank.
  The empty state is the same as in leave-request. This tab has no export.

### `<attendance-summary>` AttendanceSummaryComponent ("Attendance Summary")
- DI: MatDialog (unused), SalesPersonService, AuthService, AppLoaderService, ExcelService, FormBuilder.
- The form is built in ngOnInit with three controls: `selectAll` (FormControl(false), unused), `monthSelectRef`, `yearSelectRef`.
  Several other fields are declared but unused: `selectAllMonths`, `selectedMonths`, `selectAllCheckbox`, `checkboxStates`, `selectedYears`.
- "Filter By Year" `mat-select formControlName=yearSelectRef` lists `yearList = getNumberRange(2023, 2040)`, i.e. the numbers 2023..2040 inclusive.
- "Filter By Month" `mat-select formControlName=monthSelectRef` lists `monthList = getMonthList()`, with labels January..December and
  values `'january'..'december'`.
- `(selectionChange)` copies each value into `selectedYear` / `selectedMonth`.
- Search → loadAttendanceDetails():
  1. validateInputs uses Swal error dialogs and throws: "Please select both month and year." / "Please select month." / "Please select year.".
  2. Opens the loader. Calls `getSalesPersons()`, then `getCalendar(`${month}${year}`)`, e.g. Firestore `Calendar/january2024`.
  3. If the doc is missing or has no `days`: `Swal.fire('warning','Something Went Wrong','warning')`.
  4. Sets `startDate = `${cal.year}-${cal.month}-01``, `endDate = `${cal.year}-${cal.month}-${cal.days}``, and
     `salesPersonWorkingDays = cal.workingDays`, `daysInMonth = cal.days`.
  5. For **each** sales person it runs one sequential Firestore query: `getAttendanceReportBySalesPersonId(id, startDate, endDate)`.
     It counts present = status CHECKED_OUT(2) and leave = status LEAVE_ACCEPTED(7), and computes absent = workingDays − (present + leave).
  6. `handleResponse(salesPersons)` warns "No Records Found" if there are no sales persons.
- Table (inside `<div class="mat-elevation-z8" *ngIf="attendanceDetails">`), columns
  `name, businessName, mobileNumber, leadName, daysInMonth, workingDays, presentDays, absentDays, leaveDays`. Headers: "Sales Person",
  "Sales Person Business Name", "Sales Person Mobile Number" (cell class `pl-50`), "Lead Name", "Number of days in Month",
  "Number of Working days", "Present Days", "Absent Days", "Leave". There are no totals and no colour coding.
- Download Excel → downloadToExcel():
  1. If the list is empty: `Swal {title:'Attendance Summary not found', icon:'warning', confirmButtonText:'Ok', allowOutsideClick:false,
     allowEscapeKey:false}`, then return.
  2. Otherwise a confirm opens: `{title:'Do you want to proceed?', icon:'question', showCancelButton, confirmButtonText:'Yes', cancelButtonText:'No'}`.
  3. `ExcelService.exportToExcel(rows, 'AttendanceSummary', 'DownloadedAttendanceSummary')` writes the file **`DownloadedAttendanceSummary.xlsx`**
     with sheet **`AttendanceSummary`**. Then: Swal success "Excel Downloaded Successfully". If the mapping is empty: Swal error "No AttendanceSummary Found.". On error: Swal error
     "An error occurred while downloading AttendanceSummary.".
  4. The list is `undefined` until the first search, so clicking before a search throws and lands in that error path.
  - Excel columns in order: `Sales Person`, `Sales Person Business Name`, `Sales Person Mobile Number`, `Sales Lead`, `Sales Lead Mobile Number`,
    `Sales Manager`, `Sales Manager Mobile Number`, `Total Days`, `Working Days`, `Present Days`, `Absent`, `Leave`. These map to
    name, businessName, mobileNumber, leadName, leadMobileNumber, managerName, managerMobileNumber, daysInMonth, workingDays,
    presentDays||0, absentDays||0, leaveDays||0.

### `<app-mtd-performance-report>` MtdPerformanceReportComponent ("Sales Person Report")
- DI: AuthService, FormBuilder, SalesPersonService, AppLoaderService. `@ViewChild('salesPersonSelectRef')` is MatSelect.
- Header: `<h2 class="card-title m-3">Sales Person Report</h2>`, with "Download Excel" on the right (`*ngIf permissionObj?.export`).
- Form: `selectedDate: [null, required]`. It is a readonly matInput datepicker (placeholder "Select Date", `#appDatepicker1`) with **no min/max**.
  The "Sales Person" multi-select works as in the attendance tabs. "Search" is 160px wide and 50px high.
- search():
  1. Invalid or empty date: warning "Please select Date".
  2. Payload `{taskDate: formatDate(date,'yyyy-MM-dd','en-US'), salesPersonIds: ids || []}`.
  3. Loader, then `getSalesPersonsReport(payload)`, which logs `'salesPersonReportData2 :'`.
  4. If every table is empty (or `{}`), `isDataSearched = false`. Otherwise it is set to `true`. Errors are only console-logged ("Error at search Function").
- Empty state (`!isDataSearched`, also shown initially): `<span>There Is No data</span>` inside `.m-3 > .mat-elevation-z8 > .table-container.p-10`.
- Results: one `<mat-accordion>` with 5 `<mat-expansion-panel>`s, all collapsed by default, in this order:
  "MTD Revenue Report", "Monthly Customer Report", "Daily Performance Incentive Report", "Daily Customers Report", "Monthly Incentive Report".
  Each holds a dynamic table: `<mat-table mat-table matSort class="mat-elevation-z8 mattable">` with `*ngFor` over the column names. Headers use
  `<th mat-header-cell mat-sort-header>{{column}}</th>` and cells `<td mat-cell>{{element[column]}}</td>`. Sort headers render, but the dataSource is a
  plain array with no MatSort wired, so clicking does not sort. Values are shown raw, with no number or percent formatting, colour coding or totals.
  - MTD Revenue: BA Name, TL Name, Area, Buying Target, Buying Achieved, Buying Achieved %, Revenue Target, Revenue Achieved, Revenue Achieved %,
    FMCG Revenue Target, FMCG Revenue Achieved, FMCG Revenue Achieved %, Today Target
  - Monthly Customer: BA Name, TL Name, Sales Person Assigned, Self Order Assigned, Sales Person UnAssigned, Self Order UnAssigned,
    Sales Person Assigned Revenue, Self Order Assigned Revenue, Sales Person UnAssigned Revenue, Self Order UnAssigned Revenue
  - Daily Performance Incentive: BA Name, TL Name, Tasks, Achieved, Achieved %, Productivity Count, Productivity Revenue, AVG Bill Value,
    FMCG Orders, Productivity Incentive, FMCG LineItems Incentive
  - Daily Customers: same columns as Monthly Customer, but taken from the daily data
  - Monthly Incentive: BA Name, TL Name, Monthly Buying Customer Count Incentive, Monthly Revenue Incentive, Monthly FMCG Revenue Incentive,
    Daily FMCG Line Items Incentive, Daily Productivity Incentive
- generateExcel():
  1. If empty: `isDataSearched=false` and warning "There Is No data to downLoad".
  2. Otherwise it calls `XLSX.utils.book_new()` and, for each key, `json_to_sheet(rows)` + `book_append_sheet(wb, ws, key)`, then
     `XLSX.writeFile(wb, 'Sales Person Performance Report.xlsx')`.
  3. Sheet names are the raw keys, in this order: `mtdRevenueReport`, `dailyPerformanceIncentiveReport`, `dailyCustomersReport`, `monthlyCustomerReport`,
     `monthlyIncentiveReport`. Sheet columns are every key of the mapped rows, which puts **"SalesPerson Id"** first, then "TL Name", then "BA Name" (see the mappers below).
  4. It throws if clicked before any search.
- The `animate` trigger is declared but not bound in this template.

## Loader
`AppLoaderService` (main module 7009, provided by SharedModule). `open()` opens a MatDialog with `AppLoaderComponent` (module 33)
using `{disableClose:true, backdropClass:'light-backdrop'}`, `updateSize('200px')` and title "Please wait". `close()` closes it.

## Backend touchpoints

All Firestore access goes through `FirestoreService` (main module 1343, modular SDK: `collection`/`query`/`where`/`getDocs`/`getDoc`/
`updateDoc`/`setDoc`). Collection names come from main module 6081.

| caller | backend | details |
|---|---|---|
| `SalesPersonService.getSalesPersons()` | Firestore `getDocs(collection('SalesPerson'))` | Consumes `id, name, mobileNumber, businessName, isActive, cluster{id,name}, customerCount, salesLeadId, salesLead{name,mobileNumber}, salesManagerId, salesManager{name,mobileNumber}, enableLogOut`. Sorted by customerCount desc. |
| `UserService.fetchSalesPersons(8)` | Firestore `Users` where `user_type == 8` | Consumes `id, name, user_type, mobile_number`. Logs `response ::::`. |
| `getAttendanceDetails(start,end,spIds=[],leadIds=[])` | Firestore `AttendanceReport` where `createdTimeStamp >= new Date('<start> 00:00:00').getTime()` and `<= new Date('<end> 23:59:59').getTime()`, `[salesPersonId in spIds]`, `[salesLeadId in leadIds]` | `in` filters are only added when the arrays are non-empty. Firestore `in` allows at most 30 values (older SDKs: 10), so a large multi-select fails. |
| `getLeaveDetails(...)` | Firestore `LeaveReport`, same filters | Leave docs: `status, reason, appliedOn, createdDate, createdTimeStamp, salesPerson*, salesLead*, salesManager*` |
| `getAttendanceReportBySalesPersonId(id,start,end)` | Firestore `AttendanceReport` where `salesPersonId == id` and createdTimeStamp is in range | Returns `[]` on error. Only `status` is consumed. |
| `getCalendar('<month><year>')` | Firestore `getDoc(Calendar/{monthyear})` | Consumes `month, workingDays, monthName, days, year`. Returns `[]` when missing. |
| `updateAttendanceStatus(id,{status})` | Firestore `updateDoc(AttendanceReport/{id}, {status[, checkOutTime: Date.now()]})` | `checkOutTime` is added only when status == 4 (early-logout accepted). It also attaches an `onSnapshot` listener that is never removed. |
| `updateLeaveStatus(id,{status})` | If status == 7: `getDoc(LeaveReport/{id})`, then `setDoc(AttendanceReport/{newId}, {id:newId, leaveId:id, createdDate: leave.appliedOn, status:7, salesPersonId, createdTimeStamp: leave.createdTimeStamp})` with `newId = 'ATD' + 14 random digits`. Always `updateDoc(LeaveReport/{id}, {status})`. | |
| `getSalesPersonsReport(body)` | **REST POST `${cloudFunctionsUrl}/getSalesPersonReport`** (ConfigService.getConfig().cloudFunctionsUrl) with header `No-Auth: true` | The interceptor strips the header and sends **no** Authorization header. Body `{taskDate:'yyyy-MM-dd', salesPersonIds:string[]}`. Response `{response:{daily:[...], monthly:[...]}}`. If `response` is missing it returns `{}`. Then it calls `getSalesPersons()` again to join `teamLeadName = salesPerson.salesLeadName` and `areaName = salesPerson.area.name` by salesPersonId. |
| AuthService.permission$ | (built from Firestore user / pages / roles docs in AuthService) | Read-only use here. |
| LocalStorage | key `selectedFilters` (JSON) written on search. `localStorage.clear()` runs on Clear Filters and on window beforeunload | |

Cloud-function fields consumed:
- **monthly**: salesPersonId, salesPersonName, monthProductivityTarget, monthProductivityCount, productivityPercent,
  monthOverallRevenueTarget, monthOverallRevenue, overallRevenuePercent, monthFMCGRevenueTarget, monthFMCGRevenue, fmcgRevenuePercent,
  todayTarget, monthProductivityIncentive, monthOverallRevenueIncentive, monthFMCGRevenueIncentive, monthDailyFMCGLineItemsIncentive,
  monthDailyProductivityIncentive, monthSalesPersonAssigned, monthSelfOrderAssigned, monthSalesPersonUnAssigned, monthSelfOrderUnAssigned,
  monthSalesPersonAssignedRevenue, monthSelfOrderAssignedRevenue, monthSalesPersonUnAssignedRevenue, monthSelfOrderUnAssignedRevenue.
- **daily**: salesPersonId, salesPersonName, tasksCount, achievedTasksCount, tasksPercent, productivityCount, productivityRevenue,
  avgOrderValue, fmcgOrders, productivityIncentive, fmcgLineItemsIncentive, salesPersonAssigned, selfOrderAssigned, salesPersonUnAssigned,
  selfOrderUnAssigned, salesPersonAssignedRevenue, selfOrderAssignedRevenue, salesPersonUnAssignedRevenue, selfOrderUnAssignedRevenue.

Report mappers (SalesPersonService; output keys = table / Excel column names, in this order):
- `mtdRevenueReport` (from monthly): "SalesPerson Id"←salesPersonId||'', "TL Name"←teamLeadName||'', "BA Name"←salesPersonName,
  Area←areaName, "Buying Target"←monthProductivityTarget, "Buying Achieved"←monthProductivityCount, "Buying Achieved %"←productivityPercent,
  "Revenue Target"←monthOverallRevenueTarget, "Revenue Achieved"←monthOverallRevenue, "Revenue Achieved %"←overallRevenuePercent,
  "FMCG Revenue Target"←monthFMCGRevenueTarget, "FMCG Revenue Achieved"←monthFMCGRevenue, "FMCG Revenue Achieved %"←fmcgRevenuePercent,
  "Today Target"←todayTarget.
- `monthlyIncentiveReport` (monthly): SalesPerson Id, TL Name, BA Name, "Monthly Buying Customer Count Incentive"←monthProductivityIncentive,
  "Monthly Revenue Incentive"←monthOverallRevenueIncentive, "Monthly FMCG Revenue Incentive"←monthFMCGRevenueIncentive,
  "Daily FMCG Line Items Incentive"←monthDailyFMCGLineItemsIncentive, "Daily Productivity Incentive"←monthDailyProductivityIncentive.
- `monthlyCustomerReport` (monthly): SalesPerson Id, TL Name, BA Name, Sales Person Assigned←monthSalesPersonAssigned, Self Order Assigned←monthSelfOrderAssigned,
  Sales Person UnAssigned←monthSalesPersonUnAssigned, Self Order UnAssigned←monthSelfOrderUnAssigned, Sales Person Assigned Revenue←monthSalesPersonAssignedRevenue,
  Self Order Assigned Revenue←monthSelfOrderAssignedRevenue, Sales Person UnAssigned Revenue←monthSalesPersonUnAssignedRevenue,
  Self Order UnAssigned Revenue←monthSelfOrderUnAssignedRevenue.
- `dailyPerformanceIncentiveReport` (daily): SalesPerson Id, TL Name, BA Name, Tasks←tasksCount, Achieved←achievedTasksCount, "Achieved %"←tasksPercent,
  "Productivity Count"←productivityCount, "Productivity Revenue"←productivityRevenue, "AVG Bill Value"←avgOrderValue, "FMCG Orders"←fmcgOrders,
  "Productivity Incentive"←productivityIncentive, "FMCG LineItems Incentive"←fmcgLineItemsIncentive.
- `dailyCustomersReport` (daily): SalesPerson Id, TL Name, BA Name, and the same 8 customer columns sourced from salesPersonAssigned, selfOrderAssigned,
  salesPersonUnAssigned, selfOrderUnAssigned, salesPersonAssignedRevenue, selfOrderAssignedRevenue, salesPersonUnAssignedRevenue,
  selfOrderUnAssignedRevenue.

## Enums / constants used (main module 8352 / 5774)
- `AttendanceStatus` (8352 `H8`): CHECKED_IN=1, CHECKED_OUT=2, REASON_FOR_EARLY_LOGOUT=3, REASON_FOR_EARLY_LOGOUT_ACCEPTED=4,
  REASON_FOR_EARLY_LOGOUT_REJECTED=5, APPLY_LEAVE=6, LEAVE_ACCEPTED=7, LEAVE_REJECTED=8, LEAVE_CANCELLED=9, NONE=99.
  The templates use the literal numbers, not the enum.
- `UserType` (8352 `FW`): Customer=1, Dealer=2, Merchant=3, FieldAgent=4, SupportMember=5, MarketingAgent=6, SalesPerson=7, SalesLead=8,
  SalesManager=9, Guest=99.
- `Operator` (8352 `YQ`): `'<','>','==','<=','>=','!=','array-contains','array-contains-any','in','not-in'`.
- `PageIds` (5774 `u`): crm_sales_person_list, crm_attendance, crm_salesperson_planning, crm_task_report, crm_interactions, crm_performance_report.

## SweetAlert / warning messages (complete)
`showWarning(msg)` (1972 `N9`) = `Swal.fire('warning', msg, 'warning')`, which returns an Error without throwing it.
- Attendance tabs: "Please select Start Date and End Date", "Please select Start Date", "Please select End Date",
  "Please select valid Start Date and End Date", and "No Records Found" (leave-request and summary only). Error: "An error occurred while showing Request.".
- Approve/Reject: confirm "Reason for early logout" / "Leave", text "Do you want to proceed with the confirmation?". Result: "Success!"/"Warning!" with
  "Reason for early log out approved|rejected" / "Leave approved|rejected".
- Summary: "Please select both month and year.", "Please select month.", "Please select year." (error), "Something Went Wrong" (warning),
  "Attendance Summary not found", "Do you want to proceed?", "Excel Downloaded Successfully", "No AttendanceSummary Found.",
  "An error occurred while downloading AttendanceSummary.".
- Performance: "Please select Date", "There Is No data to downLoad".

## Third-party libraries
- **SheetJS `xlsx` 0.18.5**: chunk 574, `pa={version:"0.18.5"}`. Its exports are `NC`=writeFile, `P6`=utils, `ij`=read.
  - Performance imports it directly (`d=i(574)`).
  - Attendance reaches it only through `ExcelService` (common chunk 592, module 4249), whose methods are `exportToExcel(data, sheetName, fileName='exported-data')`,
    `exportToExcelWithOptions`, `exportToMultipleSheets`, `readExcelData` and `downloadSampleUploadFile`.
- **SweetAlert2 11.7.27** (main module 5226, `import Swal from 'sweetalert2'`).
- Angular 16 Material MDC: tabs, select, form-field, input, datepicker (NativeDateAdapter, so values are JS `Date`), expansion, table, sort,
  sidenav, card, button. `@angular/animations` provides a local trigger `animate`: `transition('* => *', [style({opacity:0}), animate('300ms', style({opacity:1}))])`.
  The `[@animate]` binding passes `{value:'*', params:{y:'50px', delay:'300ms'}}`, but those params are unused by this trigger.
- The `fxFlex="0 1 auto"` attribute is inert, because no FlexLayout directive appears in the component dependencies.

## Shared dependencies (module id → inferred name → what it is)
| id | export | inferred name | notes |
|---|---|---|---|
| 4755 | `sg,O5,uU,ez,p6` | @angular/common | NgForOf, NgIf, DatePipe, CommonModule, formatDate |
| 9401 | `qu,kI,NI,_Y,Fj,JJ,JL,sg,u` | @angular/forms | FormBuilder, Validators, FormControl, NgNoValidate, DefaultValueAccessor, NgControlStatus(Group), FormGroupDirective, FormControlName |
| 2223 | | @angular/core | |
| 1531 | `Bz` | RouterModule | |
| 1591 | `X$,eR,oB,jt` | @angular/animations | trigger, transition, style, animate |
| 5861 | `Z` | asyncToGenerator helper | async/await |
| 6286 | `uw` | MatDialog | |
| 3617 | `uX`=MatTab, `SP`=MatTabGroup | @angular/material/tabs | |
| 8280 | `Mq`=MatDatepicker, `hl`=MatDatepickerInput, `nW`=MatDatepickerToggle | datepicker | |
| 7870 | `pp`=MatAccordion, `ib`=MatExpansionPanel, `yz`=…Header, `yK`=MatExpansionPanelTitle | expansion | |
| 2611 | `YE`=MatSort, `nU`=MatSortHeader | sort | |
| 2214 | `TM`=MatSidenavContainer, `Rh`=MatSidenavContent | sidenav | |
| 9114 | `KE`=MatFormField, `hX`=MatLabel, `R9`=MatSuffix | form-field | |
| 1217 | `ey`=MatOption | core | |
| 787 | `gD`=MatSelect | select | |
| 8097 | `Nt`=MatInput | input | |
| 1728 | `lW`=MatButton | button | |
| 6012 | `QW`=MatCardModule, `a8`=MatCard, `dn`=MatCardContent | card | |
| 3627 | `p0`=MatTableModule, `BZ`=MatTable, `w1`=MatColumnDef, `fO`=MatHeaderCellDef, `Dz`=MatCellDef, `as`=MatHeaderRowDef, `nj`=MatRowDef, `ge`=MatHeaderCell, `ev`=MatCell, `XQ`=MatHeaderRow, `Gk`=MatRow | table | |
| 3276 | `TU`=MatPaginatorModule | paginator | imported, never used |
| 2994 | `m` | SharedModule | Provides AppLoaderService (7009), a confirm-dialog service and others. Re-exports SharedMaterialModule (5772), Forms, ReactiveForms, MatSelectModule |
| 9143 | `e8`=AuthService (8175), `Yf`=SalesPersonService (2937), `KD`=UserService, `gy`=LocalStoreService | services barrel | LocalStoreService has `setItem` (JSON), `getItem`, and `clear()` = `localStorage.clear()` |
| 8175 | `e` | AuthService | `permission$` BehaviorSubject |
| 2937 | `Y` | SalesPersonService | methods listed above |
| 1343 | `C` | FirestoreService | fetchCollection, fetchDocument, queryCollectionByFilters, updateDocument, insertDocWithId |
| 7009 | `P` | AppLoaderService | dialog loader |
| 4249 (chunk 592) | `U` | ExcelService | wraps xlsx |
| 1972 | `N9`=showWarning, `G4`=getMonthList, `Vl`=getNumberRange(start,end) inclusive, `uO`=toTimestamp (`new Date(s).getTime()`), `TY`=generateAttendanceId (`'ATD'`+14 digits) | helpers/utils | names are mine |
| 8352 | `H8`=AttendanceStatus, `FW`=UserType, `YQ`=Operator | enums | |
| 5774 | `u`=PageIds, `A`=MenuCode enum (Welcome=0, Profile=1, NotFound=99) | constants | |
| 6125 | `Q` | route path constants | ATTENDANCE:"attendance-report", PERFORMANCE_REPORT:"performance" |
| 6081 | `V` | DB collection constants | SALES_PERSON:"SalesPerson", USERS:"Users", ATTENDANCE_REPORT:"AttendanceReport", LEAVE_REPORT:"LeaveReport", CALENDAR:"Calendar" |
| 946 | `E` | ConfigService | `getConfig().cloudFunctionsUrl` |
| 574 | `NC,P6,ij` | xlsx 0.18.5 | |

## Uncertainties / known quirks (reproduced faithfully)
1. **Component class names, the `let element` template variable and the `app/shared/...` import paths are inferred.** Selectors, strings,
   field names and logic are exact.
2. **Calendar doc format:** the `Calendar/{month}{year}` id is built from the month **value** (`'january'`) and the numeric year, e.g. `january2024`.
   The doc's `month` field is used verbatim in `${year}-${month}-01`. I could not confirm whether it is stored zero-padded (`'01'`) or as a number.
3. Date-range bounds use `new Date('yyyy-MM-dd 00:00:00').getTime()`, which is browser-local time.
4. **Leave-request bugs:**
   - "No Records Found" plus a cleared list when AttendanceReport is empty, even if leaves exist.
   - The status-9 "Leave Cancelled" label can never render.
   - `updateStatus` always uses `status == 3` to choose between the attendance and leave update. For an unexpected status, `newStatus` is undefined but the update still runs.
5. `clearFilters()` calls `localStorage.clear()`, and it also runs on `window:beforeunload` for both the leave-request and details tabs. It
   also calls `writeValue` on ViewChild selects, which are undefined if the user lacks `view`, so the handler throws.
6. Attendance details: `formatDate(undefined)` throws for docs missing `checkInTime`, `checkOutTime` or `createdDate`, because only `0` is guarded. The
   whole search then fails silently because of the empty catch.
7. Summary: present days count only CHECKED_OUT (2). Days with an accepted early logout (4) or a still-checked-in status (1) count as absent.
   The summary runs one Firestore query per sales person, sequentially.
8. Performance: the hard-coded `pageId 'mtd_performance_report'` differs from the menu's `crm_performance_report`. MatSort is not wired.
   Values are displayed unformatted.
9. The Summary's Download button has no permission check. The Performance export throws before a first search.
10. The bundle has no paginator, sticky columns, totals rows or summary cards in these screens, even though MatPaginatorModule is imported.

## Appendix: reconstructed shared code used by these screens (for the integrator)

```ts
// SalesPersonService (main 2937) – excerpts
getSalesPersons = async () => this.mapToSalesPerson(await this.firestoreService.fetchCollection('SalesPerson'));
mapToSalesPerson(list = []) {
  return list.map(sp => ({
    name: sp.name || '', mobileNumber: sp.mobileNumber || '', id: sp.id || '', businessName: sp.businessName || '',
    isActive: sp.isActive || false, areaName: (sp.cluster && sp.cluster.name) || '', areaId: (sp.cluster && sp.cluster.id) || '',
    area: sp.cluster || {}, customerCount: sp.customerCount || 0, salesLeadId: sp.salesLeadId || '',
    salesLeadName: (sp.salesLead && sp.salesLead.name) || '', salesLeadMobileNumber: (sp.salesLead && sp.salesLead.mobileNumber) || '',
    salesManagerId: sp.salesManagerId || '', salesManagerName: (sp.salesManager && sp.salesManager.name) || '',
    salesManagerMobileNumber: (sp.salesManager && sp.salesManager.mobileNumber) || '', enableLogOut: (sp.enableLogOut && sp.enableLogOut) || false,
  })).sort((a, b) => b.customerCount - a.customerCount);
}
async getDetails(collectionName, startDate, endDate, salesPersonIds = [], salesLeadIds = []) {
  const filters = [
    { fieldName: 'createdTimeStamp', operator: Operator.GreaterThanOrEqualTo, fieldValue: toTimestamp(`${startDate} 00:00:00`) },
    { fieldName: 'createdTimeStamp', operator: Operator.LessThanOrEqualTo, fieldValue: toTimestamp(`${endDate} 23:59:59`) },
  ];
  if (salesPersonIds.length > 0) filters.push({ fieldName: 'salesPersonId', operator: Operator.In, fieldValue: salesPersonIds });
  if (salesLeadIds.length > 0) filters.push({ fieldName: 'salesLeadId', operator: Operator.In, fieldValue: salesLeadIds });
  return await this.firestoreService.queryCollectionByFilters(collectionName, filters);
}
getAttendanceDetails = (s, e, sp = [], sl = []) => this.getDetails('AttendanceReport', s, e, sp, sl);
getLeaveDetails      = (s, e, sp = [], sl = []) => this.getDetails('LeaveReport', s, e, sp, sl);
async updateAttendanceStatus(id, data) {
  if (data.status === AttendanceStatus.REASON_FOR_EARLY_LOGOUT_ACCEPTED) data.checkOutTime = Date.now();
  return await this.firestoreService.updateDocument('AttendanceReport', id, data);
}
async updateLeaveStatus(id, data) {
  if (data.status === AttendanceStatus.LEAVE_ACCEPTED) {
    const leave = await this.firestoreService.fetchDocument('LeaveReport', id);
    const doc = { id: generateAttendanceId(), leaveId: id, createdDate: leave.appliedOn, status: AttendanceStatus.LEAVE_ACCEPTED,
                  salesPersonId: leave.salesPersonId, createdTimeStamp: leave.createdTimeStamp };
    await this.firestoreService.insertDocWithId('AttendanceReport', doc.id, doc);
  }
  return await this.firestoreService.updateDocument('LeaveReport', id, data);
}
async getFilteredCollection(salesPersonId, startDate, endDate, collectionName) {
  try {
    return (await this.firestoreService.queryCollectionByFilters(collectionName, [
      { fieldName: 'salesPersonId', operator: Operator.EqualTo, fieldValue: salesPersonId },
      { fieldName: 'createdTimeStamp', operator: Operator.GreaterThanOrEqualTo, fieldValue: toTimestamp(`${startDate} 00:00:00`) },
      { fieldName: 'createdTimeStamp', operator: Operator.LessThanOrEqualTo, fieldValue: toTimestamp(`${endDate} 23:59:59`) },
    ])) || [];
  } catch (e) { console.error(`Error in getFilteredCollection for ${collectionName}:`, e); return []; }
}
getAttendanceReportBySalesPersonId = (id, s, e) => this.getFilteredCollection(id, s, e, 'AttendanceReport');
async getCalendar(id) { const doc = await this.firestoreService.fetchDocument('Calendar', id); return doc ? this.mapToWorkingDays(doc) : []; }
mapToWorkingDays = (d) => ({ month: d.month, workingDays: d.workingDays, monthName: d.monthName, days: d.days, year: d.year }); // (also maps arrays)
async getSalesPersonsReport(body) {
  try {
    const url = `${this.configService.getConfig().cloudFunctionsUrl}/getSalesPersonReport`;
    const res: any = await lastValueFrom(this.http.post(url, body, { headers: new HttpHeaders().set('No-Auth', 'true') }));
    if (res && res.response) {
      const salesPersons = await this.getSalesPersons();
      return this.mapData(this.mapSalesLeadName(salesPersons, res.response));
    }
    return {};
  } catch (e) { console.error('Error fetching data:', e); throw e; }
}
mapData = (r) => ({ mtdRevenueReport: this.mapMTDRevenueReport(r.monthly), dailyPerformanceIncentiveReport: this.mapDailyPerformanceIncentiveReport(r.daily),
  dailyCustomersReport: this.mapDailyCustomerReport(r.daily), monthlyCustomerReport: this.mapMonthlyCustomerReport(r.monthly),
  monthlyIncentiveReport: this.mapMonthlyIncentiveReport(r.monthly) });
mapSalesLeadName(salesPersons, r) {
  const join = (rows) => rows.map(row => { const sp = salesPersons.find(p => p.id === row.salesPersonId);
    return { ...row, teamLeadName: sp?.salesLeadName ?? '', areaName: sp?.area?.name ?? '' }; });
  r.daily = join(r.daily); r.monthly = join(r.monthly); return r;
}

// UserService (main 9143 KD)
async fetchSalesPersons(userType) {
  const res = await this.firestoreService.queryCollectionByFilters('Users', [{ fieldName: 'user_type', fieldValue: userType, operator: Operator.EqualTo }]);
  console.log('response ::::', res); return res;
}

// ExcelService (common 4249)
exportToExcel(data, sheetName, fileName = 'exported-data') {
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), sheetName); XLSX.writeFile(wb, `${fileName}.xlsx`);
}

// helpers (main 1972)
export function showWarning(msg: string) { Swal.fire('warning', msg, 'warning'); return new Error(msg); }
export function getNumberRange(start: number, end: number) { const r = []; for (let i = start; i <= end; i++) r.push(i); return r; }
export function getMonthList() { return ['January',…,'December'].map(n => ({ name: n, isSelected: false, value: n.toLowerCase() })); }
export function toTimestamp(s) { return new Date(s).getTime(); }
export function generateAttendanceId() { let d = ''; for (let i = 0; i < 14; i++) d += '0123456789'.charAt(Math.floor(10 * Math.random())); return `ATD${d}`; }
```
