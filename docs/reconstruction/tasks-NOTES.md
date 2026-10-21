# Tasks / Interactions feature (chunks 704, 374, 574) - reconstruction notes

Agent: `tasks`. Sources: `704.86aaaae1881aced9.js` (TasksListModule), `374.ebdfb6cdb5b2c104.js`
(InteractionListModule), `574.8d629bccc524b818.js` (SheetJS), plus cross-references into
`main.0ad03de76494ddf1.js` and `common.89677fd41d0b0854.js` (webpack chunk id 592).

## Files written

```
src/app/views/tasks/
  tasks.module.ts                      TasksListModule
  tasks-routing.module.ts              TasksListRoutingModule (name inferred)
  tasks.component.ts                   app-tasks (router-outlet shell)
  task-list/task-list.component.*      app-task-list      "Task Report" screen
  task-details/task-details.component.* app-task-details  "Tasks" (stops of one sales person/day)
  interaction-details/interaction-details.component.*  app-interaction-details (dialog)
  models/task.model.ts                 inferred interfaces + TaskStatus labels + PagePermission
src/app/views/interactions/
  interaction-list.module.ts           InteractionListModule
  interaction-list-routing.module.ts   InteractionListRoutingModule (name inferred)
  interactions.component.ts            app-interactions (router-outlet shell)
  interaction-list/interaction-list.component.*            app-interaction-list "Interactions"
  search-interaction-dialog/search-interaction-dialog.component.*  app-search-interaction-dialog
  interaction-summary-dialog/interaction-summary-dialog.component.* app-interaction-summary-dialog
  models/interaction.model.ts          inferred interfaces
src/app/shared/services/excel.service.ts   ExcelService (common.js module 4249) - full
src/app/shared/helpers/common.helper.ts    SUBSET of main.js module 1972 helpers (merge with main agent's file)
```

Import paths assumed for main.js-owned code (adjust to whatever the main/shared agent produces):
`app/shared/shared.module` (SharedModule), `app/shared/services/app-loader/app-loader.service` (AppLoaderService),
`app/shared/services/auth/auth.service` (AuthService), `app/shared/services/local-store.service`
(LocalStoreService), `app/shared/services/sales-person.service` (SalesPersonService),
`app/shared/constants/app-routes` (AppRoutes = module 6125), `app/shared/constants/page-ids`
(PageIds = module 5774 export `u`), `app/shared/models/enums` (BusinessType = module 8352 export `_$`).

## Routes

App level (main.js, children of the AdminLayout `ia.p` route guarded by `canActivate: [AuthGuard]` (7618)):

| App path | loadChildren | data |
|---|---|---|
| `task-report` (AppRoutes.TASKS) | `Promise.all([574, 592, 704])` -> `TasksListModule` | `{ title: 'task-report', breadcrumb: 'task-report' }` |
| `task-details` (AppRoutes.TASK_DETAILS) | same chunks -> `TasksListModule` | none |
| `interaction-list` (AppRoutes.INTERACTION_LIST) | `Promise.all([574, 592, 374])` -> `InteractionListModule` | none |

TasksListModule internal routes: `''` -> TasksComponent { `''` -> TaskListComponent, `'task-report'` ->
TaskListComponent, `'task-details/:taskId'` -> TaskDetailsComponent }. So the real URLs are `/task-report`,
`/task-report/task-details/:taskId` (used by the app) and also `/task-details`, `/task-report/task-report`, ...

InteractionListModule internal routes: `''` -> InteractionsComponent { `''` and `'interaction-list'` ->
InteractionListComponent }. URL `/interaction-list`.

Both feature modules import `[CommonModule, <Routing>, SharedModule, MatCardModule, MatTableModule, MatPaginatorModule]`.
Everything else used by templates (forms, MatFormField/Input/Select/Datepicker/Button/Icon/Sidenav/Sort,
AppLoaderService provider) comes via Egret `SharedModule` (main.js 2994).

## Permissions

Both list screens read `AuthService.permission$` (BehaviorSubject `{ [page_id]: {view,create,delete,edit,import,export} }`,
computed in main.js 8175 from Firestore `Users/{uid}` (roles, extended_permissions), collection `pages` and
collection `Roles`). Page ids: TaskList = `crm_task_report`, InteractionList = `crm_interactions`.
- `view` false/absent -> only `<p class="text-center">You dont have permission , Please contact administrator</p>`.
- TaskList: "Download Excel" needs `export`; "Search" and per-row "View Customers" need `view`.
- InteractionList: search-icon button needs `view`; "Download Excel" needs `export`; "Summary" has no check.
- The permission subscriptions are never unsubscribed (no ngOnDestroy).
- TaskDetails and the dialogs have no permission check.

## Components

### TaskListComponent (`app-task-list`, title "Task Report")
- Providers: `{ provide: MAT_DATE_LOCALE, useValue: 'en-US' }`.
- Form `form = fb.group({ startDate: [null, required], endDate: [null, required] })`; both inputs are
  `matInput` + `mat-datepicker` (`#appDatepicker1/2`), `[readonly]="true"` (pick from calendar only).
- Sales Person filter: `mat-select multiple #salesPersonSelectRef` (not a form control) over
  `salesPersonList` (SalesPersonService.getSalesPersons()); on `selectionChange` ->
  `selectedSalesPersonIds = selected.map(o => o.value.id)`.
- Buttons: "Search" (searchTasks), "Clear Filters" (clearFilters), header "Download Excel" (downloadTasks).
- Table (`mat-table matSort [dataSource]="tasksList"`, plain array; matSort has no `mat-sort-header` -> no sorting;
  no paginator). Columns `displayedColumns = ['sno','date','salesPersonName','areaName','customerCount','action']`:

  | col | header | value |
  |---|---|---|
  | sno | S.no | row index + 1 |
  | date | Date | `taskDate` |
  | salesPersonName | Sales Person | `salesPersonName` |
  | areaName | Area | `clusterName \|\| ''` |
  | customerCount | Customer Count | `customerCount` |
  | action | Action | button "View Customers" `[disabled]="customerCount == 0"` -> `navigateToTaskList(id)` |

  Shown only after a search (`taskDetails = true`); empty -> `<h3 class="text-center ft-20">No Tasks Found</h3>`.
- `searchTasks()`: form invalid -> warning "Please select Start Date and End Date"; missing start -> "Please select
  Start Date"; missing end -> "Please select End Date"; start > end -> "Please select valid Start Date and End Date".
  Then loader, `prepareFilters()` (formats both as `yyyy-MM-dd` en-US and stores
  `localStorage['selectedFilters'] = JSON {startDate,endDate,salesPersonIds}`),
  `getTasksReportByFilter(start, end, selectedSalesPersonIds)`; empty -> warning "No Tasks Found".
  Errors -> `Swal.fire('error','An error occurred while downloading tasks.','error')`.
- `downloadTasks()`: same date checks (no form.valid check), `getTasksByFilter(...)` on collection `Tasks`;
  empty -> warning "No Tasks Found"; else Excel (see Exports) + `Swal.fire('success','Excel Downloaded Successfully','success')`.
- `navigateToTaskList(id)`: `router.navigate(['/task-report/task-details', id], { queryParams: { selectedFilters:
  JSON.stringify({ startDate: <Date>, endDate: <Date>, salesPersonIds }) } })` (query param is never read).
- `clearFilters()`: `localStoreService.clear()` (= `window.localStorage.clear()`, wipes ALL keys incl. `uid`),
  `form.reset()`, ids `[]`, `salesPersonSelectRef.writeValue([])`, `tasksList = []` (taskDetails stays true ->
  "No Tasks Found" header remains).
- `@HostListener('window:beforeunload')` -> `clearFilters()` (so every reload/close clears localStorage).
- `localStoredFilters` is read from localStorage on init but never applied. `startDate/endDate = new Date()` fields unused.

### TaskDetailsComponent (`app-task-details`, title "Tasks")
- Route param `taskId` = TasksReport doc id. `ngOnInit`: loader; `getTask(taskId)` (doc `TasksReport/{taskId}`),
  `mapToTaskReport([doc])`, then `getTasksByTaskDateAndSalesPerson(doc.taskDate, doc.salesPersonId)` on `Tasks`,
  mapped and sorted ascending by `stopNumber`. Empty/error -> `Swal.fire('warning','No Tasks Found','warning')`.
- Table (`[dataSource]="tasksList"`, plain array, `@fadeInOut` enter/leave 300ms animation on the wrapper).
  17 columns:

  | col | header | value (Tasks doc) |
  |---|---|---|
  | taskDate | Task Date | `taskDate` |
  | stopNumber | Stop Number | `stopNumber` |
  | status | Task Status | `status` -> {1:'In Progress', 2:'Visited', 99:'Not Yet Visited'} else 'N/A' |
  | customerId | Customer Id | `customerInfo.customerId` |
  | businessName | Business Name | `customerInfo.businessName` |
  | customerName | Customer Name | `customerInfo.customerName` |
  | areaCode | Area Code | `customerInfo.areaName` |
  | businessType | Business Type | `getBusinessType(customerInfo.businessType)`: number -> `BusinessType[n]` enum name, else as-is |
  | address | Address | `customerInfo.address` |
  | salesPersonName | Sales Person | `salesPersonInfo.name` |
  | salesPersonId | Sales Person Id | `salesPersonInfo.id` |
  | latitude / longitude | Latitude / Longitude | `customerInfo.latitude/longitude` |
  | mobileNumber | Mobile Number | `customerInfo.mobileNumber` |
  | dealerId | Dealer Id | `dealerId` |
  | salesPersonAreaCode | Sales Person AreaCode | `salesPersonInfo.subAreaName` |
  | interactionId | Interaction Id | no id -> red button "No Interaction" -> `Swal.fire('warning','No interation found','warning')`; else primary "View Interaction" -> dialog |
  (also mapped but not displayed: `id`, `setName` = `setInfo.setName`, `date` = `createdDate`).
- `<mat-paginator [pageSize]="25" [pageSizeOptions]="[25, 50, 100]">` is rendered but NOT connected (no
  MatTableDataSource, no (page) handler; `onPageChange` unused) -> all rows show at once.
- BusinessType enum (main.js 8352 `_$`): 1 Kirana, 2 Restaurant, 3 Caterers, 4 TiffinCenters, 5 PgHostel,
  6 Institutional, 7 Bakery, 8 SweetHouse, 9 VegetableShops, 10 Tier2Customer, 11 Medicals, 13 Chemist,
  14 Cosmetic, 15 Supermarket, 16 Wholesale, 17 RiceTraders, 18 OilTraders, 19 Others, 99 None.

### InteractionDetailsComponent (dialog, `app-interaction-details`)
- Opened by TaskDetails "View Interaction": `getInteraction(id)` (doc `Interactions/{id}`) then
  `dialog.open(InteractionDetailsComponent, { width: '85%', disableClose: true, data: <doc> })`; afterClosed no-op.
- Header "Interaction Details" + close icon (`dialogRef.close()`). One-row `MatTableDataSource`, 16 columns:
  Date=`createdDate`, Customer Id=`customerId`, Business Name=`customerInfo.name`, Mobile Number=`customerInfo.mobileNumber`,
  Sales Person Name=`salesPersonInfo.name`, Sales Person Mobile Number=`salesPersonInfo.mobileNumber`,
  Interaction Category=`interactionInfo.commentCategory`, Comments=`interactionInfo.comments`,
  Image=`<img height=5 [src]=interactionInfo.imageUrl>`, Customer Visit Duration=floor((checkOut-checkIn)/60000) min or 0,
  Check In/Out Time=`yyyy-MM-dd HH:mm` or 0, Check In/Out Location=`${lat}-${lng}`, Check In/Out Distance.

### InteractionListComponent (`app-interaction-list`, title "Interactions")
- Default filters: today..today (`yyyy-MM-dd`), no mobile, no sales persons. `ngOnInit`: `getInteractions()`,
  then `getSalesPersons()`, then builds filter badges.
- Header buttons: search icon (`openPopUp`), "Download Excel" (`downloadToExcel`, bound TWICE - see bugs), "Summary".
- Filter badges (`searchItems`) built by `updateSearchItemsData`: one per non-empty field (`mobileNumber`,
  `salesPersonIds` = names joined by ", "), start/end merged into a single `dateRange` badge "`start to end`".
  Label via `keyLabelMap` {mobileNumber:'Mobile Number', salesPersonIds:'Sales Person', startDate:'Start Date',
  endDate:'End Date', dateRange:'Date Range'} rendered as "`Label :` - `value`" with a close icon -> `removeSearchItem`.
- Table: `[dataSource]="dataSource"` plain array (no client sort/paginator). `displayedColumns`:
  date ("Date": `createdTimeStamp | date:'EEE yyyy-MM-dd HH:mm:ss'`), customerId ("Customer Id"),
  businessName ("Business Name": customerInfo.name), mobileNumber ("Mobile Number": customerInfo.mobileNumber),
  salesPersonName ("Sales Person Name"), salesPersonBusinessName ("Sales Person Business Name"),
  salesPersonMobileNumber ("Sales Person Mobile Number"), interactionCategory ("Interaction Category": commentCategory),
  comments ("Comments"), imageUrl ("Image": thumbnail height 10, click -> `dialog.open(#modalTemplate, {data:url})`
  full-size `<img>` max 80vw/80vh object-fit contain), customerVisitDuration ("Customer Visit Duration (minutes)"),
  checkInTime/checkOutTime ("Check In Time"/"Check Out Time", `yyyy-MM-dd HH:mm` or 0),
  checkInLocation ("Check In Location": "lat, lng"), checkOutLocation (only if both present),
  checkInDistance/checkOutDistance ("Check In Distance (m)"/"Check Out Distance (m)").
- Pagination (server-side cursor, page size 50, `DEFAULT_PAGE_SIZE`/`pageSize`/`pageNumber`/`orderByField` unused):
  Prev/Next buttons + "`setPage` of `totalPages`" (`totalPages = ceil(count/50)` where count comes from a second,
  unpaginated query of the same filters on every page load). Next: `navigateNextPage=true`, uses
  `paginationLastItem` (createdTimeStamp of row 50) as the upper bound with orderBy desc; Prev:
  `navigatePrevPage=true`, uses `paginationFirstItem` as the lower bound with orderBy asc (then re-sorted desc).
  Next enabled only when the page returned exactly 50 rows; Prev disabled on page 1. The pagination bar is outside the
  permission `ng-container` and shows whenever `showPagination`.
- No rows -> `Swal.fire('', 'No records found', 'warning')`, `showPagination=false` (old rows stay).

### SearchInteractionDialogComponent (dialog)
- Opened by `openPopUp()`: `{ width: '72%', disableClose: true, panelClass: 'custom-dialog-class',
  data: { title: 'Interaction Search', searchFields: searchInteractionInput } }`.
- Form (named `dataSource`): `mobileNumber` (text "Customer Mobile Number"), `startDate`/`endDate`
  (datepickers, readonly, prefilled from searchFields), `salesPersonIds`; Sales Person multi-select (not a
  form control, not prefilled) builds `selectedSalesPersonIds = [{id, name}]`.
- `search()` validation: missing start or end -> warning "Please enter Start & End dates."; end < start ->
  `Swal.fire('Warning','End Date should not be less than Start Date','warning')`; mobile given and not exactly
  10 digits -> `Swal.fire('warning','Please give the Customer Mobile Number 10 Digits','warning')`.
  Then patches dates to `yyyy-MM-dd`, sets `value.salesPersonIds = [{id,name}]` and closes with the form value.
- Parent `afterClosed`: builds badges (names), converts `salesPersonIds` to id array, replaces
  `searchInteractionInput`, `resetPageAndFetchData()` (setPage=1 + getInteractions).

### InteractionSummaryDialogComponent (dialog)
- Opened by "Summary" (`interactionSummaryPopUp`) with `{ width: '50%', height: '90%', disableClose: true,
  data: { title: 'Interaction Summary', interactionReport } }`.
- Report built by `showInteractionReport()`: `getTasksReportByFilter(start, end, salesPersonIds)` grouped by
  salesPersonId -> `taskCount = sum(customerCount)`; interactions of the CURRENT PAGE (`dataSource`, max 50)
  grouped by salesPersonId -> `interactionCount = count`, mobile number; merged per TasksReport sales person
  (`interactionCount || 0`, `salesPersonMobileNumber || 'N/A'`); first row "Summary Of All Sales Person" with totals.
- Table columns `displayedColumns1`: salesPersonName "Business Advisor", salesPersonMobileNumber "Mobile Number",
  taskCount "Total Count", interactionCount "Total Visited Count". "Download Excel" + close icon.

## Exports (all via ExcelService.exportToExcel(data, sheetName, fileName) -> `${fileName}.xlsx`)

| Where | File | Sheet | Columns (header <- source) |
|---|---|---|---|
| TaskList "Download Excel" (Tasks docs) | `DownloadedTasks.xlsx` | `Tasks` | Task Date<-taskDate, Customer ID<-customerId, Business Name<-customerInfo.businessName, Customer Name<-customerInfo.customerName, Mobile Number<-customerInfo.mobileNumber, Business Type<-customerInfo.businessType (raw), Sales Person ID<-salesPersonId, Sales Person Name<-salesPersonInfo.name, Sales Person Sub Area<-salesPersonInfo.subAreaName, Stop Number<-stopNumber, Status<-status label, Address<-customerInfo.address, Area Name<-customerInfo.areaName, Latitude, Longitude<-customerInfo.* |
| InteractionList "Download Excel" (all matching Interactions, sorted newest first) | `DownloadedInteractions.xlsx` | `Interactions` | Customer Name, Customer Id, Customer Mobile Number, Sales Person Id, Sales Person Name, Sales Person MobileNumber, Interaction Id, Comments, Comment Category, ImageUrl, Customer Visit Duration (minutes), Check In Distance, Check Out Distance, Check In Latitude, Check In Longitude, Check Out Latitude, Check Out Longitude, Check In Time, Check Out Time ('yyyy-MM-dd HH:mm' or 0), Created Date, Task Id |
| Summary dialog "Download Excel" | `DownloadedInteractions.xlsx` | `InteractionReport` | Sales Person Name, Sales Person MobileNumber, Total Count (taskCount), Total Visited Count (interactionCount) |

Both interaction exports first ask `Swal.fire({ title: 'Do you want to proceed?', icon: 'question',
showCancelButton: true, confirmButtonText: 'Yes', cancelButtonText: 'No' })`; success -> 'Excel Downloaded
Successfully'; nothing -> `Swal.fire('error','No Interactions Found.','error')`; failure -> 'An error occurred while
downloading interactions.'.

## Backend touchpoints (all Firestore via SalesPersonService (main.js 2937) -> FirestoreService (main.js 1343))

No REST, Realtime DB, Storage or Cloud Function calls are made directly by these chunks. Timestamps are
`new Date('<yyyy-MM-dd> 00:00:00').getTime()` / `'... 23:59:59'` (local time). `FirestoreService.queryCollectionByFilters`
= `getDocs(query(collection(db, name), ...where(f.fieldName, f.operator, f.fieldValue)))`, returning `{...data, id}`.

| Caller | Service method | Firestore |
|---|---|---|
| TaskList init, SearchInteractionDialog init, InteractionList init | `getSalesPersons()` | `getDocs(collection 'SalesPerson')`, mapped to `{name, mobileNumber, id, businessName, isActive, areaName: cluster.name, areaId: cluster.id, area: cluster, customerCount, salesLeadId, salesLeadName, salesLeadMobileNumber, salesManagerId, salesManagerName, salesManagerMobileNumber, enableLogOut}` sorted by customerCount desc. UI uses `id`, `name`, `mobileNumber`. |
| TaskList search, Interaction summary | `getTasksReportByFilter(start, end, ids=[])` | `TasksReport` where `taskDateTimestamp >= start00`, `taskDateTimestamp <= end235959`, + `salesPersonId in ids` if any |
| TaskList download | `getTasksByFilter(start, end, ids=[])` | `Tasks`, same 2-3 filters on `taskDateTimestamp` / `salesPersonId in` |
| TaskDetails init | `getTask(taskId)` | `getDoc(doc('TasksReport', taskId))` -> data or null |
| TaskDetails init | `getTasksByTaskDateAndSalesPerson(taskDate, salesPersonId)` | `Tasks` where `taskDate == taskDate` and `salesPersonId == salesPersonId` |
| TaskDetails "View Interaction" | `getInteraction(id)` | `getDoc(doc('Interactions', id))` |
| InteractionList page | `getInteractionsByFilters(start, end, ids=[], mobile, lastTs, next, firstTs, prev)` | `queryNextPage('Interactions', filters, 'createdTimeStamp', 50, prev)` = `query(collection, orderBy('createdTimeStamp', prev ? 'asc' : 'desc'), limit(50), ...where)`. Filters: next -> `createdTimeStamp >= start00` and `<= lastTs`; prev -> `>= firstTs` and `<= end235959`; else `>= start00` and `<= end235959`; + `customerInfo.mobileNumber == mobile` if non-empty; + `salesPersonId in ids` if any |
| InteractionList page count + Excel | `downloadInteractionsByFilters(start, end, ids=[], mobile)` | `Interactions` where `createdTimeStamp` in [start00, end235959] (+ mobile ==, + salesPersonId in) - unlimited |

Required composite indexes (implied): Interactions(createdTimeStamp + customerInfo.mobileNumber / salesPersonId),
TasksReport/Tasks(taskDateTimestamp + salesPersonId), Tasks(taskDate + salesPersonId).

Data fields consumed - see `models/*.ts`. Key docs:
- `TasksReport`: id, salesPersonId, salesPersonName, clusterName, customerCount, taskDate, taskDateTimestamp, isActive.
- `Tasks`: id, taskDate, taskDateTimestamp, createdDate, customerId, dealerId, stopNumber, status, interactionId,
  salesPersonId, setInfo.setName, customerInfo{customerId, businessName, customerName, mobileNumber, businessType,
  address, areaName, latitude, longitude}, salesPersonInfo{id, name, subAreaName}.
- `Interactions`: interactionId, taskId, customerId, salesPersonId, createdDate, createdTimeStamp,
  customerInfo{customerId, name, mobileNumber}, salesPersonInfo{salesPersonId, name, mobileNumber, businessName},
  interactionInfo{interactionId, comments, commentCategory, imageUrl (absolute URL, likely Firebase Storage)},
  checkInfo{checkInTime, checkOutTime (epoch ms, 0 = none), checkIn/OutLatitude/Longitude, checkIn/OutDistance (m)}.

localStorage: key `selectedFilters` (TaskList) written on search/download; `clear()` wipes everything.

## SweetAlert messages (sweetalert2 11.7.27)
- `showWarningMessage(msg)` = `Swal.fire('warning', msg, 'warning')`: "Please select Start Date and End Date",
  "Please select Start Date", "Please select End Date", "Please select valid Start Date and End Date",
  "No Tasks Found", "Please enter Start & End dates.".
- `Swal.fire('error','An error occurred while downloading tasks.','error')`
- `Swal.fire('success','Excel Downloaded Successfully','success')`
- `Swal.fire('warning','No interation found','warning')` (typo in source)
- `Swal.fire('Warning','End Date should not be less than Start Date','warning')`
- `Swal.fire('warning','Please give the Customer Mobile Number 10 Digits','warning')`
- `Swal.fire('', 'No records found', 'warning')`
- `Swal.fire('warning','please give start date and end date ','warning')`
- `Swal.fire('error','No Interactions Found.','error')`, `Swal.fire('error','An error occurred while downloading interactions.','error')`
- Confirm: 'Do you want to proceed?' (question, Yes/No).
Loader: `AppLoaderService.open()` (MatDialog with AppLoaderComponent, title "Please wait", 200px, backdrop
`light-backdrop`) / `close()`.

## Third-party libraries
- **Chunk 574 = SheetJS `xlsx` 0.18.5 (ESM build `xlsx.mjs`)**. Evidence: `var pa={version:"0.18.5"}`
  (XLSX.version) at the top of the chunk, strings `SheetJS`, `"SheetJS "+version` (ODS meta generator),
  `SheetJS Table Export`; embedded sub-libraries CRC-32 (`version:"1.2.0"`) and CFB (`version="1.2.1"`), plus the
  codepage tables. To rebuild: `npm i xlsx@0.18.5` and `import * as XLSX from 'xlsx'`. It is a single webpack module (id 574) tree-shaken to 3 exports: `NC` = `writeFile`,
  `P6` = `utils` (`book_new`, `json_to_sheet`, `book_append_sheet`, `sheet_to_json`, ...), `ij` = `read`.
  No app code inside. Consumers: ExcelService (common.js 4249) - used by chunks 704, 374, 205 (attendance) - and
  PerformanceModule (chunk 41) directly (`utils.book_new/json_to_sheet/book_append_sheet`,
  `writeFile(wb, "Sales Person Performance Report.xlsx")`). The app router preloads it with every route that may
  export: task-report, task-details, interaction-list, attendance-report, performance.
- sweetalert2 11.7.27 (`li.version="11.7.27"` in main.js, module 5226, imported default-interop as `Swal`).
- Angular 16 Material MDC: table, paginator, sort, card, sidenav, form-field, input, select, datepicker
  (NativeDateAdapter, MAT_DATE_LOCALE 'en-US' for TaskList), dialog, icon, button; @angular/animations; rxjs Subject.
- Classes from Egret/Tailwind/Bootstrap-like globals: row, col-md-*, card-title, m-3, mr-4, mr-8, p-2, p-10,
  text-right, text-center, full-width, mat-elevation-z8, table-container, flex, flex-col, md:flex-row,
  justify-between, mt-100px, ft-20, float-right, badge badge-pill badge-success. `fxFlex="0 1 auto"` is a dead
  attribute (FlexLayout not imported). `color="red"` on mat-raised-button is not a valid palette (renders default).

## Shared dependencies (module id -> inferred name -> what)
- 6125 -> `AppRoutes` (route path constants; TASKS "task-report", TASK_DETAILS "task-details", INTERACTION_LIST "interaction-list").
- 6081 -> `DbCollections` (TASKS_REPORT "TasksReport", TASKS "Tasks", INTERACTIONS "Interactions", SALES_PERSON "SalesPerson", ...).
- 5774 -> `PageIds` (export `u`: crm_task_report, crm_interactions, crm_sales_person_list, crm_attendance,
  crm_salesperson_planning, crm_performance_report) and enum (export `A`) Welcome=0, Profile=1, NotFound=99.
- 8352 -> shared enums: `_$` BusinessType, `YQ` FirestoreOperator ('==', '>=', '<=', 'in', ...), `FW` UserType,
  `BB` MessageQueueStatus, `H8` AttendanceStatus, `$q` Indian states list, etc.
- 1972 -> common helpers (`N9` showWarningMessage, `i$` formatDateTime, `d6` msToMinutes, `OQ` isValidMobileNumber,
  `Iq` arrayToObject/keyBy, `vM` groupBy, `uO` toTimestamp, `F3` chunk). Subset in `shared/helpers/common.helper.ts`.
- 9143 -> services barrel: `e8` AuthService (8175), `gy` LocalStoreService (Egret, window.localStorage JSON),
  `Yf` SalesPersonService (2937), `KD` CRM user service (Crm node / Users collection).
- 2937 -> SalesPersonService (Firestore + HTTP; methods used listed above).
- 1343 -> FirestoreService (modular Firestore v9 wrappers: fetchCollection, fetchDocument, queryCollectionByFilters, queryNextPage, ...).
- 1057 -> FirebaseDbService (Realtime DB wrappers; not used directly here).
- 8175 -> AuthService (`permission$`, Firebase Auth, SSO redirect `ssoUrl/login?redirectto=...`).
- 7009 -> AppLoaderService (Egret loader dialog, provided by SharedModule); 33 -> AppLoaderComponent (`app-app-loader`).
- 2994 -> Egret SharedModule (also contains `app-confirm` dialog, providers incl. AppLoaderService).
- 7618 -> AuthGuard (`isLoggedIn()`; redirects to `/sessions/signin?return=`).
- 946 -> ConfigService (not used directly here).
- common.js 4249 -> ExcelService (reconstructed in full here). common.js 2541 -> CustomerService (RTDB `Customer`
  node, REST `coreApiUrl/Customer/get_customers_by_sales_person`, `coreUrl/customer/customers_by_geojson`,
  `coreApiUrl/Customer/export_customers_by_filters`, `coreUrl/customer`, `coreUrl/api/customer/{id}`) - not used by
  these chunks (consumers: 195 salesperson, 35 planning), not reconstructed here.
- Angular/Material ids: 4755 @angular/common (p6 formatDate, uU DatePipe), 9401 @angular/forms, 1531 @angular/router,
  1591 @angular/animations, 2223 @angular/core, 3627 table, 3276 paginator, 2611 sort, 6012 card, 2214 sidenav,
  8280 datepicker, 1217 material/core (Ad MAT_DATE_LOCALE, ey MatOption), 9114 form-field, 8097 input, 787 select,
  1728 button, 430 icon, 6286 dialog, 7579 rxjs Subject, 5861 asyncToGenerator, 2167 @angular/fire firestore.

## Bugs / quirks observed (reproduced faithfully)
1. InteractionList "Download Excel" button has two identical `(click)` listeners -> two confirm popups / exports per click.
2. `removeSearchItem()` reads `searchInteractionInput.dateRange.length`; `dateRange` only exists after removing the
   "Date Range" badge, so removing any other badge throws a TypeError (after the refetch already started). Removing
   the Date Range badge deletes start/end dates -> queries run with `NaN` bounds.
3. `openPopUp()` passes `{id,name}` objects to `getSelectedSalesPersonNames()` which compares ids -> always `[]`;
   harmless because `item.entity` is never set so the template always shows `item.searchText`.
4. `interactionSummaryPopUp()` with an empty table: `showInteractionReport()` returns undefined -> `.length` TypeError.
5. Summary "Total Visited Count" only counts interactions on the visible page (<= 50), not the whole date range.
6. Cursor pagination is off-by-one (bounds are inclusive, so the boundary row repeats), and `navigateNextPage`/
   `paginationLastItem` are not reset by a new search, so a new search after "Next" keeps the old upper bound.
   Every page load also runs the full unpaginated query just to count.
7. TaskList `clearFilters()` / `beforeunload` call `localStorage.clear()` (also wipes `uid` and any other app keys);
   `salesPersonSelectRef` is undefined when the user lacks `view` -> beforeunload throws.
8. TaskDetails paginator is decorative; `getDataByFilters` catch returns undefined -> `tasksList.length` throws and
   the loader never closes. If `TasksReport/{id}` is missing the mapper throws similarly.
9. Firestore `in` with more than 10 (SDK-dependent 30) sales persons will be rejected.
10. TaskList `startDate > endDate` compares Date objects; `downloadTasks` skips the `form.valid` check.

## Uncertainties
- Class/file names of non-exported classes (routing modules, components) are inferred from selectors; the
  TaskDetails component class was defined inline inside the routes array in the bundle.
- NgModule `declarations` are not present in Ivy prod output; inferred from chunk contents.
- Helper function names for main.js 1972 exports and service import paths are guesses.
- `(click)` duplicate in InteractionList is inferred from two `NdJ("click")` calls on the same element.
- Original template whitespace/attribute order is approximated (Ivy keeps static attribute order for structural
  elements only). `[readonly]="true"` is a property binding in the bundle (not a static attribute).
- `@animate` params `{y:'50px', delay:'300ms'}` are passed but the local `animate` trigger ignores them
  (it is a plain 300ms fade), so the Egret `egretAnimations` were NOT used here.
