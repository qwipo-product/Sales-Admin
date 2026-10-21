# Sales Person Planning module (chunk 35) — decompilation notes

Source: `35.898870a91705f761.js` (587 KB) + shared lazy chunk `common.89677fd41d0b0854.js` (webpack chunk 592).
Lazy route in main.js: `{ path: 'salesperson-planning', loadChildren: () => Promise.all([o.e(592), o.e(35)]).then(o.bind(o, 8035)).then(m => m.SalesPersonPlanningModule), data: { title: 'salesperson-planning', breadcrumb: 'salesperson-planning' } }`,
child of `{ path: '', component: AdminLayoutComponent (main 7751), canActivate: [AuthGuard (main 7618)] }`.
Side-menu entry (main 1218): under "Sales Person" drop-down: `{ name: 'Planning', state: 'salesperson-planning', code: 'sales_person_planning', pageId: 'crm_salesperson_planning' }`.

Of the 587 KB only webpack module **8035** (~138 KB) is app code, and ~70 KB of *that* is tree-shaken @turf ESM code
(lines ~563–3961 of the pretty-printed module). Everything else is third-party CJS (see "Third-party libraries").
There is **no map view** (no Google Maps/@agm/Leaflet) and **no export/Excel** in this module.

## Files written

```
src/app/views/sales-person-planning/
  sales-person-planning.module.ts            SalesPersonPlanningModule (minified Yy)
  sales-person-planning-routing.module.ts    SalesPersonPlanningRoutingModule (Uy), routes const (qy)
  settings/                                  SettingsComponent        <app-settings>          (anonymous class in qy)
  sales-person-areas/                        SalesPersonAreasComponent <sales-person-areas>    (Cm)  "Areas" tab
  sales-person-mapping/                      SalesPersonMappingComponent <sales-person-mapping> (jm) "Sales Person" tab
  sales-person-tasks/                        SalesPersonTasksComponent <sales-person-tasks>    (Ry)  "Tasks" tab
  dialogs/add-area-dialog/                   AddAreaDialogComponent   <add-area-dialog>       (Pt)
  dialogs/add-json-dialog/                   AddJsonDialogComponent   <add-json-dialog>       (Z)
  dialogs/add-area-name-dialog/              AddAreaNameDialogComponent <app-add-area-name-dialog> (F)
  dialogs/update-coordinates-dialog/         UpdateCoordinatesDialogComponent <app-update-coordinates-dialog> (It)
  dialogs/select-area-dialog/                SelectAreaDialogComponent <select-area-dialog>   (Pm)
  dialogs/preview-dialog/                    PreviewDialogComponent   <preview-dialog>        (ly)
  services/polygon.service.ts                PolygonService (Q0)  – turf polygon equality/overlap
  services/message-queue.service.ts          MessageQueueService (Xu) – POST to messagingServiceUrl
  pipes/cluster-type.pipe.ts                 ClusterTypePipe (V0) name 'ClusterTypePipe'
  models/sales-person-planning.models.ts     interfaces inferred from usage
src/app/shared/   (cross-chunk reconstructions this module depends on – merge with the shell/main agent's versions)
  services/customer.service.ts               common chunk 592 module 2541 (CustomerService)
  services/excel.service.ts                  common chunk 592 module 4249 (ExcelService, xlsx 0.18.5) – not used here
  services/sales-person.service.ts           main 2937 (SalesPersonService) – full
  helpers/utils.ts                           main 1972 – full, names inferred
  models/enums.ts                            main 8352 – full
  constants/page-ids.ts                      main 5774
  constants/db-nodes.ts                      main 6081
```
Assumed (not written here) shared paths: `shared/shared.module.ts` (SharedModule, main 2994),
`shared/services/auth/auth.service.ts` (AuthService, main 8175), `shared/services/app-loader/app-loader.service.ts`
(AppLoaderService, main 7009), `shared/services/config.service.ts` (ConfigService, main 946),
`shared/services/firestore.service.ts` (main 1343), `shared/services/firebase-db.service.ts` (main 1057).

Class names are inferred (Ivy keeps selectors, not class names). Constructor-injected property names
(`egretLoader`, `polygonService`, `backendService`, `messageQueueService`, …) and all method/field names are original.

## Page structure

`<app-settings>`: `*ngIf="permissionObj?.view"` → `mat-tab-group animationDuration="0ms" [(selectedIndex)]="selectedTabIndex"`
with tabs **Areas** / **Sales Person** / **Tasks** (`class="w-30"`). Each tab body is `*ngIf="selectedTabIndex === n"`
so tab components are re-created (and re-fetch) on every switch. Else: "You dont have permission , Please contact administrator".
Every tab component repeats the same permission gate.

### Areas tab (`sales-person-areas`)
- Buttons (each `*ngIf="permissionObj?.create"`): **Add Area** → `addCluster()`, **Upload Geo Json** → `addPolygonToClustersPopUp()`,
  **Sync All Areas** → `refreshAllClusters()`.
- `mat-sidenav-container` with an unused `<mat-sidenav #sidenav opened="false">SIDENAV CONTENT HERE</mat-sidenav>`.
- `mat-table matSort [dataSource]="dataSource"` (no paginator, no sort headers). Columns
  `['id','name','type','customerCount','updateJson','delete','refresh']`:
  Id · Area Name (+ `edit` mat-icon, `*ngIf edit` → `updateClusterName(row)`) · Type (`| ClusterTypePipe` → General/Wholesale) ·
  Customer Count · Update Polygon (icon button `cloud_upload`, `*ngIf edit` → `updateClusterCoordinates(row)`) ·
  Delete (icon button, red `delete`, `*ngIf delete` → `deleteCluster(row)`) · Refresh (icon button `<span class="material-icons">refresh</span>`,
  not permission-gated → `refreshClusterCustomers(row)`).
- Rows = all `SalesPersonClusters` docs sorted by customerCount desc.

### Sales Person tab (`sales-person-mapping`)
- `mat-select [(ngModel)]="selectedOption"` with options `'true'` Active / `'false'` In-Active (string values).
- Table columns `['Name','Mobile Number','Area Name','Customer Count','Is Active','Action']`
  (header of "Is Active" is " Status "). Status cell: **Activate** (`color="white"`, shown if `!isActive && edit`) /
  **Deactivate** (`color="red"`, shown if `isActive && edit`). Action cell: button `{{ areaName ? 'EDIT' : 'ADD' }}`,
  `[disabled]="!isActive"`, `*ngIf edit` → Select Area dialog.
- Animation trigger `animate` (`* => *`: opacity 0 → 1 in 300ms) bound with params `{y:'50px', delay:'300ms'}` (params unused).

### Tasks tab (`sales-person-tasks`)
- Shown only when at least one sales person has an area (`areaName` non-empty), else "No Salespersons Assigned to Any Areas.".
- Reactive form `form`: `selectAll`, `checkboxes` (group of `{[salesPersonId]: false}`), `endDate`, `customerStatusSelectRef`,
  `businessStatusSelectRef`, `businessTypeSelectRef`, `customerOrderStatusRef` (all `null` initially).
- "Filter by": datepicker (`formControlName="endDate"`, `[min]="minDate"` = today, `(dateChange)` adds a date chip;
  chips shown in `.dateSelectDiv` with `date:'yyyy-MM-dd'` and a close icon → `removeDate(i)`); multi-selects
  **Customer Status** (Active 1 / InActive 0), **Business Status** (+ "Select All" mat-checkbox; Lost 1 … KYC-Rejected 11, None 99),
  **Business Type** (+ "Select All"; values are BusinessType keys 'Kirana' … 'None'), **Customer Order Status**
  ('0-7','8-30','31-60','61-90','91-365','365+').
- "Sales Person List" table `['checkbox','Name','Area Name','Customer Count','Tasks Count']`: header checkbox
  `toggleSelectAll()`, row checkbox `toggleCheckbox(row)` (state in `checkboxStates[id]`, selection in `selectedSalespersons`),
  Tasks Count = `<input matInput [(ngModel)]="row.tasksCount">` (default 35 when missing/NaN).
- **Preview** button (`*ngIf view`) → `generateTasks()` → validate → `count_by_salesperson` → Preview dialog.

## Dialogs

| Dialog | Opened by | MatDialog config | data | afterClosed result |
|---|---|---|---|---|
| AddAreaDialog `add-area-dialog` ("Add Area") | Areas → Add Area | width 75%, disableClose | `{ title:'Add Area', cluster: null, currentClusterSearchKeys: dataSource.map(searchKey) }` | `{ cluster: { id:'', name, searchKey, customerCount:'', coordinates: LatLng[]\|null, type: 1\|2 }, isUpdate: undefined }`; X icon → undefined |
| AddJsonDialog `add-json-dialog` ("Upload JSON") | Areas → Upload Geo Json | 75%, disableClose | `{ title:'Add Geo-Json' }` | `{ polygons: features[] }` |
| AddAreaNameDialog `app-add-area-name-dialog` (title = data.title) | Areas → edit pencil | 40%, disableClose | `{ title:'Update Area Name', cluster, currentClusterSearchKeys }` | `{ cluster: { id, name, searchKey }, previousSearchKey }` |
| UpdateCoordinatesDialog `app-update-coordinates-dialog` ("Upload JSON") | Areas → cloud_upload | 40%, disableClose | `{ title:'Update Coordinates Name', cluster: deepCopy(row), updatedCoordinates: null }` | `{ cluster, updatedCoordinates: LatLng[]\|null }` |
| SelectAreaDialog `select-area-dialog` ("Select Area") | Sales Person → ADD/EDIT | 50%, disableClose | `{ title:'Assign Area', salesPerson: row, existingSalesPersons: other rows of the filtered table → {id,name,areaId,areaName} }` | none (caller always reloads sales persons) |
| PreviewDialog `preview-dialog` ("View Tasks Preview") | Tasks → Preview | 90% × 90%, disableClose | `{ generateTasks: { salesPersons: TaskSalesPerson[], taskDates: 'yyyy-MM-dd'[], filters } }` | `{}` after Generate Tasks; caller checks `result.taskStatus == MessageQueueStatus.Started` (never true) |

AppLoaderService (`egretLoader`, main 7009) wraps every async action: `open(title='Please wait', {width:'200px'})` opens
`AppLoaderComponent <app-app-loader>` (main 33) with `disableClose`, `backdropClass:'light-backdrop'`; `close()`.

## Upload / validation flows

- File inputs: `accept=".geojson"`, extension check `isValidGeoJsonFile` (.geojson or .json, case-insensitive), read with
  `FileReader.readAsText` + `JSON.parse`; parse error → Swal('', 'Invalid File', 'error'); no file → 'Please upload the file!';
  bad extension → 'Invalid File Format!!'.
- **Add Area**: name required (Swal 'Please add the Area Name!'); trimmed; must match
  `/^(?!.* {2})[A-Za-z0-9-]+(?:[ \t]+[A-Za-z0-9-]+)*$/` else inline "Name is not Valid…"; name → `capitalizeFirstLetter`
  ("fOO bar" → "Foo bar"); `searchKey = name.trim().toLowerCase().replace(/ +/g,' ')`; duplicate searchKey among existing
  areas → inline "The name already exists…"; GeoJSON optional but if given must have exactly 1 feature
  (inline "Upload Only one geo Polygon At a time."); `coordinates = features[0].geometry.coordinates[0]` mapped `[lng,lat] → {latitude, longitude}`.
  Type radio: General = 1 (default), Wholesale = 2.
  Then (component): overlap check vs same-type areas → Swal warning; `id = 'AREA' + 10 random`; customers_by_geojson
  (`[lng,lat]` ring, businessCategoryIds by type); `customerCount`, `customers` map; Firestore setDoc; reload.
- **Update Area Name**: same name regex/capitalize/searchKey (no duplicate check). Same searchKey → 'There Is No Change';
  else updateDoc `{name, searchKey}`; if a SalesPerson has `clusterId == id` → updateDoc SalesPerson `{ cluster: {id, name} }`.
- **Update Polygon**: GeoJSON must have exactly 1 feature (checked on file select), file required (inline
  "Please Select Json File To Upload"). Component: overlap vs same-type areas (incl. itself, see bugs) → warning; fetch stored
  area (`getCluster`); identical polygon → 'No Updates Found '; overlap vs other same-type areas → warning;
  then `handelClusterUpdate`: customers_by_geojson, delete `customers` field if stored customerCount > 0, updateDoc
  `{coordinates, customerCount, customers?}`, and if a sales person is mapped → queue `UpdateClusterPolygon`.
- **Upload Geo Json (bulk)**: every feature must have own properties `id`, `type`, `AreaCode` (case-sensitive; else inline
  "Please note that some areas do not contain all the required properties (id, type, or AreaCode)"); file required.
  Component checks in order: (1) overlaps among uploaded features of type 1 and of type 2 (`properties.type` must be numeric);
  (2) duplicate names (lower-cased keys `areaname`/`areacode`); (3) every id (keys id/Id/ID/iD) must exist in the table;
  (4) overlap with stored same-type areas; then keeps only features whose polygon differs from the stored one, asks
  confirmation listing mapped sales persons (`getMappedSalesPersonFromClusterIds`), and for each feature:
  customers_by_geojson (raw ring), delete `customers`, updateDoc `{coordinates, customerCount, customers?}`, queue
  `UpdateClusterPolygon` if mapped. Only EXISTING areas can be updated this way (no creation).
- **Refresh (row)**: delete `customers` field; customers_by_geojson (`[lng,lat]`); updateDoc `{customerCount, customers?}`;
  if mapped sales person: updateDoc SalesPerson `{customerCount}`, `update_salesperson_ids` unmap then map with the new customer ids;
  reload table.
- **Sync All Areas**: queue `RefreshClusters` with all area ids ('…please wait for 10 to 15 minutes!').
- **Delete**: confirm; `deleteDoc(SalesPersonClusters/{id})` in parallel with queue `DeActivateSalesPerson` (if a sales person has
  `clusterId == id`); row removed locally.
- **Assign area (Select Area dialog)**: dropdown of areas with non-null coordinates; confirm text depends on first mapping /
  area already tagged to another sales person; updateDoc SalesPerson `{ customerCount: area.customerCount, cluster: {id, name} }`;
  queue `MapSalesPersonToCluster`.
- **Activate/Deactivate**: confirm; `updateSalesPersonStatus` (RTDB `Customer/{id}` update + Firestore `SalesPerson/{id}`)
  with `{isActive:true}` or `{isActive:false, customerCount:0, cluster:{id:'',name:''}}` (called twice); on deactivate of a
  mapped person queue `DeActivateSalesPerson` (not awaited).
- **Tasks**: validation order (Swal 'warning' via showWarningAlert): Business Status → SalesPerson → Business Type →
  Customer Order Status → Date → every selected person `tasksCount > 0` ('Please Enter Tasks'). Customer Status is not required.
  `count_by_salesperson` → rows: `expectedTaskCount = ceil(customer_count / days)`, `givenTaskCount = ceil(days * tasksCount)`.
  Preview status: customerCount 0 → ZERO(4, red "No Customers Found based on your Filters"); expected > tasks/day →
  GREATER_THAN(1, red "Insufficient task assignments for selected dates."); expected < tasks/day → LESS_THAN(2, orange
  "There may be days when there will be no tasks assigned"); equal → EQUAL_TO(3, green "Success").
  Generate Tasks blocked by any GREATER_THAN (shortage warning) or ZERO row; otherwise queue `CreateTasks`
  ('Tasks are being generated. Please wait for 5 minutes.'), close with `{}`, hide button.

## Backend touchpoints

### Firestore (via FirestoreService main 1343; collection names from main 6081)
| Call | Path / query | Data |
|---|---|---|
| getAllClusters | `getDocs(collection('SalesPersonClusters'))` (data only, id is a stored field) | id, name, type, searchKey, customerCount, coordinates[{latitude,longitude}], createdDate, updatedDate, customers{custId:{name}} |
| getCluster | `getDoc('SalesPersonClusters/{id}')` (throws 'No such document!') | same |
| createCluster | `setDoc('SalesPersonClusters/{id}', cluster)` | {id, name, searchKey, customerCount, coordinates, type, customers?} |
| updateCluster | `updateDoc('SalesPersonClusters/{id}', …)` | {name, searchKey} / {coordinates, customerCount, customers?} / {customerCount, customers?} |
| deleteClusterCustomers | `updateDoc('SalesPersonClusters/{id}', { customers: deleteField() })` | |
| deleteCluster | `deleteDoc('SalesPersonClusters/{id}')` | |
| getSalesPersons | `getDocs(collection('SalesPerson'))` → mapToSalesPerson | name, mobileNumber, id, businessName, isActive, cluster{id,name}, customerCount, salesLeadId, salesLead{name,mobileNumber}, salesManagerId, salesManager{…}, enableLogOut |
| getSalesPersonByClusterId | `query(collection('SalesPerson'), where('clusterId','==',id))` → first | id |
| getSalesPersonsByClusterIds | `where('clusterId','in', chunk of 10)` (via getMappedSalesPersonFromClusterIds) | businessName, id, cluster.name, cluster.id |
| updateSalesPersonCluster | `updateDoc('SalesPerson/{id}', …)` | {cluster:{id,name}} / {customerCount} / {customerCount, cluster:{id,name}} |
| updateSalesPersonStatus | `updateDoc('SalesPerson/{id}', …)` | {isActive} / {isActive:false, customerCount:0, cluster:{id:'',name:''}} |

### Realtime Database (FirebaseDbService main 1057)
- `update(ref(db, 'Customer/{salesPersonId}'), {isActive…})` inside updateSalesPersonStatus.

### REST (HttpClient; base URLs from ConfigService `./assets/configs/config.json`)
| Method | URL | Body | Response consumed |
|---|---|---|---|
| POST | `${coreUrl}/customer/customers_by_geojson` (CustomerService, common 2541) | `{ geoJson: { type:'Polygon', coordinates:[ring] }, businessCategoryIds }` — General → `[1..12,14..19,99]` (all but Chemist 13), Wholesale → `[16]` | `.data[]` → `id`, `businessName` |
| POST | `${coreUrl}/customer/update_salesperson_ids` (unMapSalesPerson) | `{ salesPersonIds:[id], salesPersonId:'', customerIds:[] }` | `.data` truthiness |
| POST | `${coreUrl}/customer/update_salesperson_ids` (mapSalesPerson) | `{ salesPersonIds:[], salesPersonId:id, customerIds:[…] }` | `.data` truthiness |
| POST | `${coreUrl}/customer/count_by_salesperson` (getCustomerCount) | `{ isActive:[1/0…], businessStatus:[…], businessType:[BusinessType ids], salespersonIds:[…], customerOrderStatus:['0-7'…] }` | `.data[]` → `salesperson_id`, `customer_count` (errors swallowed → undefined → crash in .map) |
| POST | `${messagingServiceUrl}` (MessageQueueService) | `{ messageType, input: JSON.stringify(payload) }` | ignored |

### Message queue messages (`messageType` → `input` payload)
- `UpdateClusterPolygon` → `{ salesPersonId, currentAreaId }` (polygon changed for a mapped area)
- `DeActivateSalesPerson` → `{ salesPersonId, currentAreaId }` (area deleted / sales person deactivated; name suggests future tasks are deleted)
- `RefreshClusters` → `{ areaIds: string[] }`
- `MapSalesPersonToCluster` → `{ salesPersonId, currentAreaId ('' on first mapping), newAreaId, newAreaTaggedSalesPersonId ('' if none) }`
- `CreateTasks` → `{ messageQueueStatusId: 'MESQU'+10 random, salesPersons:[{ id, name, dateLength, customerCount, tasksCount, givenTaskCount, expectedTaskCount, taskCountPerDay, areaId, areaName }], taskDates:['yyyy-MM-dd'], filters:{ businessTypes:[ids], customerStatus, businessStatus, customerOrderStatus } }`

No Firebase Storage, no Cloud Functions, no coreApiUrl calls are made by this module (CustomerService has coreApiUrl
methods, unused here). SalesPersonService.getSalesPersonsReport (cloudFunctionsUrl/getSalesPersonReport) is not used here.

## Permissions
`AuthService.permission$` (BehaviorSubject `{ [page_id]: {view, create, delete, edit, import, export} }`, merged from the user's
roles + `extended_permissions`). Page id `crm_salesperson_planning`: view → page & tabs (& Preview button); create → Add Area /
Upload Geo Json / Sync All Areas; edit → rename, Update Polygon, Activate/Deactivate, ADD/EDIT area; delete → Delete area.
PreviewDialog reads page id `'preview_dialog'` but never uses it. Subscriptions are never unsubscribed (no ngOnDestroy).

## SweetAlert2 messages (title, text, icon)
Areas: ('Warning!', `<span style="color: green">{names}</span> Areas Coordinates Matching with <span style="color: red">{area}</span>`, warning) ·
('success','Added Cluster Successfully') · ('warning','Something Went Wrong') · ('warning','There Is No Change') ·
('success','Area Name Updated Successfully') · ('No Updates Found ','No Coordinates are found updated', info) ·
('success','Json Uploaded Successfully') · confirm {title 'Do you want to Delete?', icon question, Yes/No} ·
('success','Deleted Cluster Successfully') · confirm {title: lines `Do You Want to Update Following salespersons <span style="color:red">{businessName}-{areaName}</span>` joined by '\n', question, Yes/No} ·
('success','Cluster customers refreshed successfully!') · ('Warning!','Failed to map customers to sales person') ·
('Warning!','Failed to unmap customers from sales person') · ('Warning!','Error refreshing cluster customers:') ·
('success','Cluster customers refresh is in progress please wait for 10 to 15 minutes!') ·
('Warning!', `<span style="color:red"> {names}</span> Names repeating Please Check`) ·
('Warning!', `<span style="color:red"> {names}</span> Id's are Not Matching Please Check`) ·
('Warning!', `<span style="color:red">{name}</span> <span style="color:black">overlaps with</span> <span style="color:red">{names}</span>,… Please Check`) ·
('Warning!', `<span style="color:red">{names}</span> Area Polygons are Overlapping. Please Check`).
Dialogs: ('Warning!','Please add the Area Name!') · ('Warning!','Please upload the file!') · ('Warning!','Invalid File Format!!') ·
('', 'Invalid File', error) · ('Warning!','Please Select the Area!').
Select Area confirm {title 'Warning'|'Info', text, type (legacy), confirmButtonColor '#13BB6F', 'Yes'/'Cancel'} with texts:
`Do you want to map the {area} area to the Sales Person {sp} ?` / `Salesperson {other} is already tagged with the area {otherArea}. Changing the area will unmap them. Do you want to proceed?` /
`Are you sure you want to map the {area} area to the Sales Person {sp}?`; success {title 'Success!'}:
`Salesperson {sp} has been successfully mapped. Please allow up to 10 minutes for the changes to reflect.` /
`The previous mapping for salespersons in {otherArea} is currently being updated. The previous area was {spArea}. Please wait for about 10 minutes for the changes to take effect for {other}.` /
`Current area un-mapping process is in progress for {sp} from {spArea}. Please allow up to 10 minutes for these changes to reflect.`;
error {title 'Error', 'An error occurred. Please try again.'}.
Sales Person: confirm {title 'Activate Sales Person'|'Deactivate Sales Person', text 'Do you want to activate this Sales Person?' /
'Do you want to deactivate this Sales Person?' / `Deactivating the Sales Person will also unmap the current area {area}. Are you sure?`,
type 'warning' (legacy), '#13BB6F', 'Yes, Activate!'|'Yes, Deactivate!'}; success 'Sales Person Activated successfully.' /
'Sales Person Deactivated successfully.'; error 'Something went wrong!'.
Tasks (all `Swal.fire('warning', msg, 'warning')`): 'Please select the Business Status', 'Please select the SalesPerson',
'Please select the Business Type', 'Please select the Customer Order Status', 'Please select the Date', 'Please Enter Tasks';
Preview: shortage text ("There is a shortage of tasks that need assignment. …"), 'Based on your Filter, there are no customers for this salesperson.',
success {'Success!', 'Tasks are being generated. Please wait for 5 minutes.'}.
No MatSnackBar usage in this module.

## Third-party libraries in chunk 35 (identified, not reconstructed)
- **@turf/turf 6.x (very likely 6.5.0)** imported as a barrel (`import * as turf from '@turf/turf'`) – all turf CJS deps are kept
  as side-effect `require`s. Evidence: turf v6 helpers (`earthRadius 6371008.8`, `degrees: earthRadius/111325`, v6 error strings
  "Each LinearRing of a Polygon must have 4 or more Positions."), `@turf/boolean-equal` v6 form
  (`getGeom(a).type === getGeom(b).type && new GeojsonEquality({precision:6}).compare(cleanCoords(a), cleanCoords(b))`),
  `@turf/line-overlap` using **deep-equal 1.x** (v7 switched to other deps), `@turf/bbox-polygon` "does not support BBox with 6 positions",
  `@turf/buffer` deps (**turf-jsts**, d3-geo 1.x Adder fragments). Inlined ESM pieces: helpers, meta, bbox, invariant,
  boolean-point-in-polygon, distance, clean-coords, bezier-spline (Spline), destination, bearing, line-segment, line-intersect,
  nearest-point-on-line, boolean-point-on-line, great-circle (arc.js), line-overlap, boolean-overlap (inlined into PolygonService),
  isolines/isobands lookup tables, polygonize (Graph/EdgeRing), shortest-path (astar), boolean-equal. Only `polygon`,
  `booleanEqual`, `booleanOverlap` are used by app code.
- CJS modules: 770 **turf-jsts** (JSTS port, 334 KB); 9855 **polygon-clipping** UMD (incl. SplayTree; "Tried to link already linked events");
  5469 **earcut**; 7192 **rbush 3.x** UMD + 4678 **quickselect** + 3544 **rbush 2.x**; 5406 **geojson-rbush 3.x**; 5013 **geojson-equality 0.1.x**;
  6952 **deep-equal 1.1.x** with its es-shims (object-keys 1356/2450/9978, is-arguments 3407, is-date-object 2374, is-regex 7167,
  object-is 2e3/1175/6305/3859, regexp.prototype.flags 9235/6343/1956/4468, define-properties 2358, define-data-property 7484,
  has-property-descriptors 7027, functions-have-names 9582, set-function-name 9792, set-function-length 9511, call-bind 5685/154/3710/1023/9056/7997/2998,
  call-bound 3e3, function-bind 3457/4444, get-intrinsic 5203, es-errors 1847/3644/1298/2681/5917/2844/7289, es-object-atoms 7913,
  get-proto/dunder-proto 5361/3088/5388/417, gopd 7378/4316, es-define-property 3907, has-symbols 1983/2969, has-tostringtag 6259,
  hasown 7699, math-intrinsics 9473/7323/8493/358/5932/9893/3021/2286); 7470 **density-clustering** (DBSCAN 1817, KMEANS 4273, OPTICS 8680,
  PriorityQueue 8759); 9475/5561/9231 **skmeans**; 3870/1766/2260 **point-in-polygon** (flat/nested); 5943 **object-assign**;
  8275/9626/1764/5986/7514 @turf helpers/meta/bbox CJS builds (used by geojson-rbush).
- Elsewhere: **sweetalert2 11.7.27** (main 5226, default import `Swal`); **xlsx 0.18.5** (chunk 574, used by common ExcelService);
  Angular **16.0.5**; Angular Material MDC 16.

## Shared dependencies (cross-chunk module ids)
| id | name | what |
|---|---|---|
| main 2223 | @angular/core | p.* Ivy runtime |
| main 4755 | @angular/common | O5 NgIf, sg NgForOf, uU DatePipe, ez CommonModule |
| main 1531 | @angular/router | Bz RouterModule |
| main 9401 | @angular/forms | qu FormBuilder, kI Validators, NI FormControl, _Y ɵNgNoValidate, Fj DefaultValueAccessor, JJ NgControlStatus, JL NgControlStatusGroup, sg FormGroupDirective, u FormControlName, On NgModel |
| main 6286 | @angular/material/dialog | uw MatDialog, so MatDialogRef, WI MAT_DIALOG_DATA |
| main 3617 | @angular/material/tabs | uX MatTab, SP MatTabGroup |
| main 1728 | @angular/material/button | lW MatButton, RK MatIconButton |
| main 8097 | @angular/material/input | Nt MatInput |
| main 9114 | @angular/material/form-field | KE MatFormField, hX MatLabel, R9 MatSuffix |
| main 4867 | @angular/material/radio | VQ MatRadioGroup, U0 MatRadioButton |
| main 6012 | @angular/material/card | a8 MatCard, dn MatCardContent |
| main 430 | @angular/material/icon | Hw MatIcon |
| main 2214 | @angular/material/sidenav | JX MatSidenav, TM MatSidenavContainer, Rh MatSidenavContent |
| main 3627 | @angular/material/table | BZ MatTable + header/cell/row defs (fO, as, w1, Dz, nj, ge, ev, XQ, Gk) |
| main 2611 | @angular/material/sort | YE MatSort |
| main 1217 | @angular/material/core | ey MatOption, _A DateAdapter |
| main 787 | @angular/material/select | gD MatSelect |
| main 1292 | @angular/material/checkbox | oG MatCheckbox |
| main 8280 | @angular/material/datepicker | Mq MatDatepicker, hl MatDatepickerInput, nW MatDatepickerToggle |
| main 1591 | @angular/animations | X$ trigger, eR transition, oB style, jt animate |
| main 3144 | @angular/common/http | eN HttpClient |
| main 9808 | rxjs | n firstValueFrom |
| main 5861 | @babel asyncToGenerator | Z (async/await lowering) |
| main 5226 | sweetalert2 11.7.27 | default export Swal |
| main 2994 | SharedModule (`m`) | imports/exports SharedMaterialModule (main 5772), Forms, ReactiveForms, MatSelectModule; provides AppLoaderService etc. |
| main 9143 | services barrel | e8 → AuthService (8175), Yf → SalesPersonService (2937), gy LocalStoreService, KD UserService |
| main 2937 | SalesPersonService | Firestore/REST layer above (reconstructed in shared/services) |
| main 8175 | AuthService | permission$, user$, userDocData$, pages$, roles$ |
| main 7009 | AppLoaderService (`P`) | open()/close() of AppLoaderComponent (main 33) |
| main 946 | ConfigService (`E`) | getConfig(): env, firebaseConfig, ssoUrl, cloudFunctionsUrl, coreUrl, authServiceApiUrl, messagingServiceUrl |
| main 1972 | utils | see shared/helpers/utils.ts header for letter → name map |
| main 8352 | enums | Wm ClusterType, _n TaskCountStatus, _$ BusinessType, BB MessageQueueStatus, YQ FirestoreOperator … |
| main 5774 | PageIds (`u`) / MenuCode (`A`) | crm_salesperson_planning |
| main 6081 | DB node constants (`V`) | SALES_PERSON_CLUSTERS 'SalesPersonClusters', SALES_PERSON 'SalesPerson', CUSTOMER 'Customer' |
| main 1343 | FirestoreService (`C`) | fetchCollection, fetchDocument, insertDocWithId, updateDocument, deleteDoc, deleteFieldDoc, queryCollectionByFilters |
| main 1057 | FirebaseDbService (`l`) | RTDB fetchDataFromNode, queryDataByValue, updateData |
| main 6125 | ROUTE_PATHS (`Q`) | SALESPERSON_PLANNING: 'salesperson-planning' |
| main 7618 / 7751 | AuthGuard (`a`) / AdminLayoutComponent (`p`) | parent route |
| common 2541 | CustomerService (`v`) | fetchCustomersNearGeoJson (+ other methods, reconstructed) |
| common 4249 | ExcelService (`U`) | xlsx helpers (not used by this module) |

## Faithfully reproduced quirks / probable bugs
1. Add Area / Update Area Name: closing via the X icon passes `undefined` to afterClosed → `result.cluster` TypeError (Add Area: unhandled rejection; rename: caught & logged).
2. Update Polygon: the first overlap check includes the area being edited, so any new polygon that equals/overlaps the area's own current polygon is rejected with "{own name} Areas Coordinates Matching with {own name}"; the "No Updates Found" branch is effectively unreachable. Also no-features GeoJSON → `{}.map` TypeError silently caught.
3. Axis order is inconsistent: Add Area/Refresh send GeoJSON `[lng,lat]` to customers_by_geojson, Update Polygon (`handelClusterUpdate`) sends `[lat,lng]`. Bulk upload stores `convertToLatLng(swapped ring)` → latitude/longitude swapped in Firestore, and compares uploaded `[lng,lat]` rings with stored `[lat,lng]` rings (overlap/"same" checks unreliable).
4. Row Refresh shows the success alert unconditionally (twice on success, after the warning on failure).
5. `updateSalesPersonStatus` is called twice; deactivation message to the queue is not awaited.
6. Select Area: unmapped sales persons have `existingCluster = {id:'', name:''}` (non-empty object) so the "first mapping" branch never triggers; mat-select has no compareWith so the current area is never pre-selected.
7. Tasks: the "Select All" mat-checkboxes carry `formControlName` of the multi-select they sit in (shared FormControl); `[checked]` is bound on `mat-option` (not an input) – requires non-strict template checking; Tasks Count input is text (string values compared numerically); selected dates de-duplicated by reference only; `clearTaskFilters` never runs (dialog closes with `{}`); getCustomerCount errors return undefined → `.map` TypeError (caught).
8. Swal options with SweetAlert1 keys (`type`, `closeOnConfirm`) → no icon + console "Unknown parameter" warnings in sweetalert2 11.
9. AddJsonDialog.resetFileInput looks up `#fileInput` but does not clear it; the "Refresh" cell reuses `data-label="delete"`; Areas table has `matSort` but no sort headers; `addPolygonToClustersPopUp` error path leaves the loader open.
10. Sales person ↔ area link is read through `SalesPerson.clusterId` (where-queries) but the UI writes only `SalesPerson.cluster {id,name}`; `clusterId` must be maintained by the queue consumer (backend).

## Build notes
- Templates bind unknown properties inside embedded views (`[checked]` on mat-option) and literal attributes `value.bind`/`files.bind`:
  compile with `strictTemplates: false` / `fullTemplateTypeCheck: false` (Egret default) or drop those bindings.
- Needs `@turf/turf@^6.5.0`, `sweetalert2@11.7.27`, BrowserAnimationsModule at root (for `[@animate]`), MatNativeDateModule (DateAdapter) via SharedMaterialModule.

## Uncertainties
- Class names of all components/services/pipe and the folder names are inferred; selectors and member names are original.
- Declaration order in the NgModule is unknown (prod ɵmod omits declarations).
- Loop variable names in templates (`element`, `row`, `cluster`, `status`, `type`, `date`) are arbitrary.
- `addCluster(cluster = null)` parameter is never passed by the template (always `null`).
- Exact wording/whitespace of text nodes is preserved; HTML attribute order follows the Ivy `consts` arrays.
- turf exact patch version (6.3 vs 6.5) not provable from code alone; polygon-clipping/rbush/earcut versions are those pinned by turf 6.5.
- Shared-service file paths/names under `src/app/shared` must be reconciled with the main/shell reconstruction.
