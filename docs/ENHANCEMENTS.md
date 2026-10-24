# Enhancements (new features, not in production)

[FIXES.md](FIXES.md) lists where this app differs from production because of bug fixes. This file lists new features.

Planning (all three tabs, including Tasks with its "View Tasks Preview") works exactly as in production.

## Reschedule Tasks page

Menu: **Sales Person → Reschedule Tasks**, right after Planning. Route `/reschedule-tasks`.

Files:
- `src/app/views/reschedule-tasks/*`: the page, the dialogs and the models.
- `src/styles/reschedule-tasks.scss`: the drop-down panel styles.

Who sees it: the menu item and the page use Planning's permission (`crm_salesperson_planning`). Whoever can see Planning can reschedule.

Why: tasks are first created from Planning → Tasks, which fixes each day's set of shops. Reschedule moves those day-sets so each one is visited the day before most of its shops' companies deliver, which means more orders.

### Page

All three fields show from the start.

| Field | Behaviour |
|---|---|
| Sales Person | Single select. Each option is a card: name, area and customer count. Only sales persons with an area are listed. Once picked, the hint shows the area and customer count |
| Select From Date / Select To Date | Both start at today; To can't be before From, and changing From to a later day clears To. The number of days shows under To |
| Reschedule | Always shown, greyed out until a sales person and both dates are set. It loads the sales person's **existing tasks** in the range, their shops and the companies, then opens the dialog. With no tasks in the range it warns "{name} has no tasks between these dates. Generate them from Planning → Tasks first." |

### Dialog ("Reschedule Tasks")

Each existing task date in the range is a **set**: Set 1 is the earliest date, and its shops stay in stop order. Every company counts. A step indicator and progress bar sit at the top; Back and Next sit at the bottom.

1. **Pick a day for each set**: the heading has **Auto-pick days**, **Current days** and **Clear**. Below it is a grid with one row per set and one column per date of the range.
   - Columns: "26 Mon", "Delivery 27 Tue". **Sundays are never visit days.**
   - Row headers: "Set N", the "N shops" link (the set's retailers with their companies) and "Now 26 Mon".
   - Every set starts picked on its current date; that cell shows a "Now" tag.
   - Each cell shows the two companies delivering to the most of the set's shops the next day, then "+N more". That link opens a pop-up with every company and a Close button. The bottom line counts the different shops with a next-day delivery. ★ marks the set's best day(s).
   - Click a cell to pick it. A day holds one set: picking a day another set holds moves it.
   - **Auto-pick days** gives every set its own day so that the most shops get a next-day delivery. Ties go to the most company deliveries, then to keeping the current date. It's an optimal assignment (Hungarian method), so long ranges are fine.
   - **Current days** puts every set back on its current date. **Clear** removes the picks.
   - Next is enabled once every set has a day. If there are more sets than visit days (tasks on Sundays can cause it), the step says so; pick a wider range.
2. **Schedule**: the sales person's name, then one card per visit day ("26 Mon · Set 6 · 15 of 29 shops · Moved from 31 Sat").
   - "Set N" opens that set's retailers with their companies.
   - **Assign schedule** sends a RescheduleTasks message: the sales person's tasks in the range are replaced by the new arrangement. A day that gets no set ends up with no tasks. The Tasks page (Task Report) shows the result.

### Backend contract (needed before this works against the real backend)

The sample-data backend (`src/app/mock`) already implements all of these. The core API needs:

1. **New endpoint** `POST {coreUrl}/customer/company_share_by_salesperson` (the companies)
   - Body: `{ "salespersonIds": ["…"], "isActive", "businessStatus", "businessType", "customerOrderStatus" }` (the same filters as count_by_salesperson). The page sends one id and empty filters.
   - Response: `{ "success": true, "data": [{ "company_id", "company_name", "shop_count", "total_shops", "shop_percentage" }] }`
2. **New endpoint** `POST {coreUrl}/customer/shops_for_schedule` (each shop's companies and delivery days)
   - Body: count_by_salesperson's fields plus `companyIds`. With `companyIds`, keep only shops that stock at least one of them. The page sends empty filters, meaning all the sales person's shops.
   - Response: `{ "success": true, "data": [{ "customer_id", "business_name", "area_name", "salesperson_id", "latitude", "longitude", "companies": [{ "company_id", "delivery_days": [2, 5] }] }] }`
   - `delivery_days` are the weekdays (0 = Sunday … 6 = Saturday) the company delivers to that shop.
   - A task's shop the endpoint doesn't return is shown with no companies.
3. **New queue message** `RescheduleTasks`, sent by "Assign schedule"
   - Input: `{ messageQueueStatusId, salesPersonId, salesPersonName, areaId, areaName, fromDate, toDate, schedule: [{ taskDate, setNumber, previousTaskDate, customerIds }] }`
   - The job should replace the sales person's TasksReport and Tasks from `fromDate` to `toDate` with `schedule`: one TasksReport per entry and one Task per customer, in the given order.
   - The existing tasks are read with the same Tasks query the Task Report uses (`taskDateTimestamp` in the range, `salesPersonId`).
   - Planning → Tasks still sends the production CreateTasks message.

Without the two endpoints, Reschedule shows "Something went wrong!".

The company dot colours in the grid come from the order of the API's company list: brown, red, green, orange, purple, teal, dark brown, then more (`COMPANY_COLORS` in the page component).

### Sample data

- `MOCK_COMPANIES` in `mock-seed.ts`: Parle, Colgate, Emami, MTR, Mysore Sandal, ITC, Vicco.
  - Each sample shop stocks each company with a fixed probability (Parle ≈ 81%, Colgate ≈ 58% …).
  - The assignment is keyed on the customer id. The rest of the sample data and every id are unchanged.
- `mockDeliveryDays` gives each company one or two delivery weekdays per ~300 m neighbourhood. Shops close together share them, so sets differ in their best days.
