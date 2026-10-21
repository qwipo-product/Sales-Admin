# Enhancements (new features, not in production)

[FIXES.md](FIXES.md) lists where this app differs from production because of bug fixes. This file lists new features.

## Planning → Tasks: new "Filter by" section

Files: `src/app/views/sales-person-planning/sales-person-tasks/*`, `src/styles/planning-tasks.scss`.

| | Production | Now |
|---|---|---|
| Sales persons | "Sales Person List" table under the filters, with a checkbox and an editable Tasks Count per row | **Sales Person** drop-down at the top, **one sales person at a time** (single select). Each option is a card: name, area and customer count. The table is gone |
| Other filters | Always shown | Shown **one after another**: From / To date once a sales person is picked, then Customer Status, Business Status, Business Type and Customer Order Status, each once the field before it has a value. Clearing a field hides the ones after it (their values are kept) |
| Dates | One "Select Date" picker that adds dates as chips | **Select From Date** and **Select To Date**. Both start at today; To can't be before From, and changing From to a later day clears To. The number of days shows under To |
| Company | – | **Company** drop-down, shown after Customer Order Status. A "Loading companies…" placeholder stands in for it while the shares load (they're reloaded whenever a filter above changes). "Select all" row, then one option per company with the share of the sales person's shops **matching the filters above** that stock it ("81% of shops") |
| Button | "Preview", below the table, always enabled; missing filters gave warnings | **Generate**, right below the filters, shown only once every filter (including Company) has a value. Opens the Generate Tasks dialog below |

## Planning → Tasks: "Generate Tasks" dialog (replaces "View Tasks Preview")

Files: `src/app/views/sales-person-planning/dialogs/generate-tasks-dialog/*`, `dialogs/set-details-dialog/*`.

Why: shops are no longer planned only by the sales person's area. The selected companies show which shops matter most: a shop that stocks more of them is a bigger sales opportunity. Sets keep those shops, and each set is visited the day before most of its companies deliver.

Production showed a table (customers, days, tasks per day, warning) and a "Generate Tasks" button. Now the dialog has three steps. A step indicator and progress bar sit at the top; Back and Next sit at the bottom.

The dialog plans the one selected sales person.

1. **Sets**: **Number of sets** and **Retailers per set**.
   - Defaults: one set per visit day, and 35 retailers per set (production's tasks per day).
   - Below the inputs:
     - the maths: "6 sets × 20 = 120 of 172 shops";
     - what's left out: "52 left out this week" in orange, or "All shops covered" in green;
     - a "Use 29 per set" link that covers every shop.
   - When the sets can't hold every shop, **the shops stocking the most selected companies are kept**. The shops left out are those with the fewest.
2. **Pick a day for each set**: a grid with one row per set and one column per visit day.
   - Columns are the first date of each weekday in the range ("22 Thu", "Delivery 23 Fri"). **Sundays are never visit days.**
   - Each cell shows the two companies delivering to the most of the set's shops the next day, then "+N more". That link opens a pop-up with every company and a Close button.
   - The cell's bottom line counts the different shops with a next-day delivery. ★ marks the set's best day(s).
   - Click a cell to pick it. A day holds one set: picking a day another set holds moves it.
   - "N shops" under each set opens the set's shop list, most companies first.
   - **Auto-pick days** gives every set its own day so that the most shops get a next-day delivery; ties go to the most company deliveries. The result is optimal (checked against brute force). **Clear** removes the picks.
   - Next is enabled once every set has a day.
3. **Schedule**: the sales person's name, then one card per visit day ("22 Thu · Set 1 · 27 of 29 shops"). "Set N" is a link: it opens that set's retailers, each with the selected companies it stocks.
   - When the range is longer than a week, the weekly schedule repeats ("Also 29 Oct").
   - **Assign schedule** queues CreateTasks. The tasks then appear on the **Tasks** page (Task Report), one row per sales person per date.

Sets are built like this: keep the shops with the most selected companies, sweep them around their centre point so neighbours stay together, then cut them into evenly sized sets.

Going back to Sets and changing the numbers rebuilds the sets and clears the picks.

### Backend contract (needed before this works against the real backend)

The sample-data backend (`src/app/mock`) already implements all of these. The core API needs:

1. **New endpoint** `POST {coreUrl}/customer/company_share_by_salesperson` (Company drop-down)
   - Body: `{ "salespersonIds": ["…"], "isActive", "businessStatus", "businessType", "customerOrderStatus" }` (the same filters as count_by_salesperson)
   - Response: `{ "success": true, "data": [{ "company_id", "company_name", "shop_count", "total_shops", "shop_percentage" }] }`
   - `shop_percentage` is 0–100: the share of the sales person's shops matching those filters that stock the company. (The Tasks tab sends one id; the endpoint takes a list.)
   - Without it the Company drop-down stays empty, and because Company is required, **Generate stays disabled**.
2. **New endpoint** `POST {coreUrl}/customer/shops_for_schedule` (Generate Tasks dialog)
   - Body: the filters `{ isActive, businessStatus, businessType, salespersonIds, customerOrderStatus, companyIds }`. These are count_by_salesperson's fields plus `companyIds`: keep shops that stock at least one of those companies.
   - Response: `{ "success": true, "data": [{ "customer_id", "business_name", "area_name", "salesperson_id", "latitude", "longitude", "companies": [{ "company_id", "delivery_days": [2, 5] }] }] }`
   - `delivery_days` are the weekdays (0 = Sunday … 6 = Saturday) the company delivers to that shop.
   - Without it Generate shows "Something went wrong!".
3. The **`CreateTasks`** queue message input changes:
   - `salesPersons[]`: `{ id, name, areaId, areaName, taskCountPerDay (retailers per set), numberOfSets }`. The dialog always sends exactly one.
   - New field `schedule[]`: `{ salesPersonId, taskDate, setNumber, customerIds }`, one entry per visit date. The job should create exactly these tasks: one TasksReport per entry and one Task per customer. In the sample data the set name is "Set N".
   - `taskDates` is the list of scheduled dates, and `filters` now includes `companyIds`.

The Tasks tab no longer calls `count_by_salesperson`.

The company dot colours in the Pick days grid come from the order of the API's company list: brown, red, green, orange, purple, teal, dark brown, then more (`COMPANY_COLORS` in the Tasks component). The Company drop-down has no dots.

### Sample data

- `MOCK_COMPANIES` in `mock-seed.ts`: Parle, Colgate, Emami, MTR, Mysore Sandal, ITC, Vicco.
  - Each sample shop stocks each company with a fixed probability, so the shares land near the reference design (Parle ≈ 81%, Colgate ≈ 58% …).
  - The assignment is keyed on the customer id. The rest of the sample data and every id are unchanged.
- `mockDeliveryDays` gives each company one or two delivery weekdays per ~300 m neighbourhood. Shops close together share them, so sets differ in their best days.
