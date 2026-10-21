# Enhancements (new features, not in production)

[FIXES.md](FIXES.md) lists where this app differs from production because of bug fixes. This file lists new features.

## Planning → Tasks: new "Filter by" section

Files: `src/app/views/sales-person-planning/sales-person-tasks/*`, `src/styles/planning-tasks.scss`.

| | Production | Now |
|---|---|---|
| Sales persons | "Sales Person List" table under the filters, with a checkbox and an editable Tasks Count per row | **Sales Person** drop-down at the top. Each option is a card: initials, name, area, customer count and tasks per day. It has a "Select all" row. The table is gone |
| Other filters | Always enabled | Disabled until at least one sales person is selected |
| Dates | One "Select Date" picker that adds dates as chips | **Select From Date** and **Select To Date**. Every day in the range is a task date. Both start at today; To can't be before From, and changing From to a later day clears To. The number of days shows under To |
| Company | – | **Company** drop-down below the other filters: "Select all" row, then one option per company with a colour dot and the share of the selected sales persons' shops that stock it ("81% of shops") |
| Button | "Preview", below the table, always enabled; missing filters gave warnings | **Generate**, right below the filters. Disabled until every filter has a value |

"Generate" runs the same count → "View Tasks Preview" pop-up → "Generate Tasks" flow as before.

Tasks per day is now always the default **35**, because the per-row Tasks Count input went away with the table.

### Backend contract (needed before this works against the real backend)

The sample-data backend (`src/app/mock`) already implements all three. The core API needs:

1. **New endpoint** `POST {coreUrl}/customer/company_share_by_salesperson`
   - Body: `{ "salespersonIds": ["…"] }`
   - Response: `{ "success": true, "data": [{ "company_id", "company_name", "shop_count", "total_shops", "shop_percentage" }] }`
   - `shop_percentage` is 0–100: the share of those sales persons' shops that stock the company.
   - Without this endpoint the Company drop-down stays empty and shows "Companies couldn't be loaded". Because Company is required, **Generate stays disabled**.
2. `POST {coreUrl}/customer/count_by_salesperson` gets a new body field, `companyIds: string[]`. Count only shops that stock at least one of these companies.
3. The `CreateTasks` queue message gets `input.filters.companyIds` (same meaning) and must apply it when picking customers.

The dot colours come from the order of the API list: brown, red, green, orange, purple, teal, dark brown, then more (`COMPANY_COLORS` in the component).

### Sample data

- `MOCK_COMPANIES` in `mock-seed.ts`: Parle, Colgate, Emami, MTR, Mysore Sandal, ITC, Vicco.
- Each sample shop stocks each company with a fixed probability, so the shares land near the reference design (Parle ≈ 81%, Colgate ≈ 58% …).
- The assignment is keyed on the customer id. The rest of the sample data and every id are unchanged.
