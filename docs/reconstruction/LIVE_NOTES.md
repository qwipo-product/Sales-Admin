# Live app observations (sales-admin.bms.qwipo.com, 2026-10-21, viewport 1440x900)

Global shell
- body class "egret-navy"; mat-sidenav-container classes: app-admin-container app-side-nav-container sidebar-slate topbar-white footer-slate sidebar-full sidebar-opened
- Sidebar 240px wide, bg rgb(34,42,69) (#222a45) on .branding (56px tall, padding 0 16px); app-logo img (assets/images/egret.png -> 404 on server, renders 0px wide, height 36, margin-right 8px);
  .app-logo-text "Sales Admin" 20px/400 white; compact switch: 24x12, border 1px #666, radius 10px, inner dot 8x8 #666.
- Menu: single dropDown "Sales Person" (icon person, caret keyboard_arrow_right) -> Sales Person List (/salesperson-list), Attendance (/attendance-report),
  Planning (/salesperson-planning), Tasks (/task-report), Interactions (/interaction-list), Performance Report (/performance). Menu starts at y=96. Active item has darker bg.
- Topbar: mat-toolbar.topbar 70px tall, white, padding 0 16px, box-shadow 0 10px 30px rgba(47,60,74,.08); left icon button "menu" (#sidenavToggle, tooltip "Toggle Hide/Open"); right icon button power_settings_new -> mat-menu with one item: icon exit_to_app + "SIGNOUT".
- Content bg rgb(250,250,250); .rightside-content-hold padding 5.333px. app-breadcrumb shows raw path e.g. "/home", "/salesperson-planning", "/task-report" (breadcrumb 'simple'), not shown on some pages (salesperson-list, create, attendance, interactions, performance).
- Font: Inter, body 14px weight 500 (Tailwind preflight + Egret). Cards: radius 4px, shadow 0 8px 12px rgba(47,60,74,.04), 0 2px 6px rgba(47,60,74,.08).
- mat-table header cell: 14px/600, height 56, padding 0 16px 0 24px, border-bottom 1px rgba(0,0,0,.12); row cell 14px/500 height 49.
- Loader: MatDialog "Please wait" (app-app-loader) with spinning ring (#0090ef top border), width 200px, light backdrop.
- SweetAlert2 default styling (e.g., icon warning, title "warning", text "Please select Start Date and End Date", purple OK #7066e0).
- Index page loader: double-bounce spinner (#fcc02e / #03a9f4).

Pages
- /home: centered mat-card.welcome-card 300px wide: "Home Page" + "Thank you for visiting. We provide amazing services and products."
- /salesperson-list: h2.card-title "Sales Person List" + right "Create Sales Person" button; mat-table (no paginator, ~98 rows): Sales Person Name | Mobile Number | Lead Name | Sales Manager | Action (Edit Lead / Add Lead when no lead + Edit Profile) | Force Logout (Enable logout). Table wider than viewport -> horizontal scroll.
  - Edit Lead dialog (app-edit-salesperson-dialog): close icon top-right; mat-card form: mat-select Lead Name (leads), mat-select Sale's Manager (manager); Save.
  - /salesperson-list/create-salesperson: back arrow + "Create Salesperson" (purple title); 2-col fill form: Name*, Business Name*, Mobile Number*, Email*, Pin Code*, Street*, Land Mark*, Area*, City*, select State*, Latitude*, Longitude*, Status* (select); Save.
  - /salesperson-list/edit-salesperson-profile/:id: back arrow + "Edit Salesperson"; Name, Business Name; Update.
- /attendance-report: mat-tab-group (Approval Request | Attendance Details | Attendance Summary), no breadcrumb.
  - Approval Request: Start Date, End Date (datepickers), Sales Person, Lead Name selects; Search, Clear Filters; empty -> "No Attendance List Found"; table: Sales Person Name | Mobile Number | Lead Name | Lead Mobile Number | Applied On | Reason | Approval Type | Status (Approve/Reject buttons) | Created On.
  - Attendance Details: same filters; table: Sales Person | Mobile Number | Lead Name | Lead Mobile Number | Log In | Log Out | Status | Applied Date | Reason | Created On. Without dates -> Swal warning "Please select Start Date and End Date".
  - Attendance Summary: "Download Excel" button; Filter By Year (2023..2040), Filter By Month (January..December); Search.
- /salesperson-planning: breadcrumb shown; tabs Areas | Sales Person | Tasks.
  - Areas: buttons Add Area, Upload Geo Json, Sync All Areas (right aligned, stacked); table Id | Area Name (+edit icon) | Type | Customer Count | Update Polygon (cloud_upload) | Delete (red delete) | Refresh (refresh).
  - Sales Person: right top select (Active/...); table Name | Mobile Number | Area Name | Customer Count | Status (red "Deactivate") | Action (blue "EDIT" / "ADD"). EDIT -> dialog "Select Area" (purple title, close) with mat-select "Select Clustered Area" (clusteredArea) + Submit.
  - Tasks: "Filter by" (purple) Select Date (endDate), Customer Status [Active, InActive], Business Status [Active, InActive, Lost, Lost-Not-Interested, Business-Shutdown, Internal-User, Active-User, Duplicate, Temporary-Shutdown, Distributor-Sales, KYC-Pending, KYC-Review, KYC-Rejected, None], Business Type [Kirana, Restaurant, Caterers, TiffinCenters, PG/Hostel, Institutional, Bakery, Sweet House, Vegetable shops, Tier2Customer, Medicals, chemist, cosmetic, supermarket, Wholesale, Rice Traders, Oil Traders, Others, None], Customer Order Status [0-7 Days, 8-30 Days, 31-60 Days, 61-90 Days, 91-365 Days, 365+ Days]; "Sales Person List" (purple) table with checkbox | Sales Person Name | Area Name | Customers | Tasks Count (input default 35); Preview button.
- /task-report: breadcrumb; "Task Report" + Download Excel; filter card Start Date, End Date, Sales Person, Search, Clear Filters; table S.no | Date | Sales Person | Area | Customer Count | Action (View Customers).
  - View Customers -> /task-report/task-details/:reportId?selectedFilters={"startDate":..,"endDate":..}: "Tasks" title; table Task Date | Stop Number | Task Status (Visited/Not Yet Visited) | Customer Id | Business Name | Customer Name | Area Code | Business Type | Address | Sales Person | Sales Person Id | Latitude | Longitude | Mobile Number | Dealer Id | Sales Person AreaCode | Interaction Id (View Interaction button / "No Interaction").
  - View Interaction -> dialog "Interaction Details" (purple title, close): table Date | Customer Id | Business Name | Mobile Number | Sales Person Name | Sales Person Mobile Number | Interaction Category | Comments | Image | Customer Visit Duration | Check In Time | Check Out Time | Check In Location | Check Out Location | Check In Distance | Check Out Distance.
- /interaction-list: "Interactions" + buttons [search icon (white)], Download Excel, Summary; chip "Date Range :- 2026-10-21 to 2026-10-21 (x)"; table Date (e.g. "Wed 2026-10-21 11:35:08") | Customer Id | Business Name | Mobile Number | Sales Person Name | Sales Person Business Name | Sales Person Mobile Number | Interaction Category | Comments | Image | Customer Visit Duration (minutes) | Check In Time | Check Out Time | Check In Location | Check Out Location | Check In Distance (m) | Check Out Distance (m); custom pager "Prev  1 of 4  Next" (raised primary buttons, min-width 45px; h6 between). 50 rows per page.
  - Search dialog "Interaction Search": Customer Mobile Number (mobileNumber), Sales Person select, startDate, endDate (default today), Search.
  - Summary dialog "Interaction Summary" + Download Excel: table Business Advisor | Mobile Number | Total Count | Total Visited Count; first row "Summary Of All Sales Person"; missing mobile -> "N/A".
- /performance: "Sales Person Report" + Download Excel; card with selectedDate datepicker, Sales Person select, Search (wide primary button); results card shows "There Is No data" when empty.
- /customers-list, /search: render empty.
- /sessions/404: centered red circle "!" + "404" + "Page Not Found!", buttons "Back to Dashboard" (primary) and "Report this Problem" (warn red).
- Quirk: on Planning, the "Please wait" loader can stay open (blocking) after switching tabs.
