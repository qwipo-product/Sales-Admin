# Differences from production (bug fixes)

This app reproduces the production Sales Admin UI and behaviour. The one intentional difference: bugs found in the original were fixed, not copied. Each area has a table listing the file, the original behaviour, the fix, and whether anything visible changed.

| Area | Log |
|---|---|
| Shared: layout, sign-in/out, guards, data services, loader | [fixes/shared.md](fixes/shared.md) |
| Sales Person list/create/edit, session pages | [fixes/people.md](fixes/people.md) |
| Salesperson Planning (areas, mapping, task generation) | [fixes/planning.md](fixes/planning.md) |
| Task Report, Task Details, Interactions | [fixes/tasks.md](fixes/tasks.md) |
| Attendance, Performance Report | [fixes/reports.md](fixes/reports.md) |

## Visible changes users may notice

- **Sign out** now really signs you out. In production the session survived the reload.
- **Interactions**:
  - "Download Excel" exports once per click (production exported twice).
  - Filter badges can be removed.
  - Paging no longer repeats rows.
  - "Total Visited Count" in the Summary counts every interaction in the range, not only the visible page.
- **Task Details**: the paginator (25/50/100) works. Production showed it, but it did nothing.
- **Performance Report**:
  - The column headers sort.
  - The page opens for users who can see its menu item. Production checked a different permission id.
- **Approval Request**:
  - Leave requests show even when there are no early-logout requests.
  - "Leave Cancelled" shows for cancelled leaves.
  - The approve/reject confirmation has its warning icon.
- **Planning**:
  - The "Please wait" loader no longer gets stuck.
  - An area drawn completely inside another area of the same type is now rejected with the existing "Areas Coordinates Matching" warning. Production accepted it. This is a behaviour change; see the planning log to revert it.
  - See the planning log for the other area and polygon fixes.
- **Filters**: "Clear Filters" and page reloads no longer wipe the whole browser storage. Production cleared the stored session id along with them.
- **Text fixes**:
  - "No interaction found", which said "No interation found".
  - "Failed to update customer…" on the edit page, which said "create".
  - The longitude label in the Create Salesperson validation message.
  - The Business Name placeholder on Edit Salesperson.
  - "Invalid email address" on signup, which said "Invaild".
- **Error pages**: "Back to Dashboard" goes to `/home`. In production it went to a page that doesn't exist.

## Kept as in production on purpose

- The top-bar menu item reads **SIGNOUT**. It's an untranslated key, but it's what users see today.
- The logo image `assets/images/egret.png` doesn't exist on the production server, so the logo renders 0 px wide. The copy behaves the same. Add the file to show a logo.
- Material animations are off, because production imports `NoopAnimationsModule` after `BrowserAnimationsModule`.
- These stub pages are routed exactly as in production:
  - `/customers-list` and `/search` are empty.
  - Signup and forgot-password are stock template pages.
- The Edit Lead dialog fills both drop-downs from the same `Users` query (`user_type == 2`).

## Verification

- **Visual:** every page was compared with the live app at 1440×900 using computed styles and element positions: Home, Sales Person List, Create Salesperson, Attendance, Planning (all three tabs), Task Report, Interactions, Performance, and the Edit Lead dialog. Styles were identical. The only differences came from data: row counts, text wrapping, and photo sizes.
- **Global stylesheet:** compared declaration by declaration with production's. The only differences are invisible:
  - legacy IE hacks were removed,
  - `white` is written instead of `#ffffff`,
  - two utility classes nothing uses were added,
  - there are theme colours for a slide toggle the app never renders.
- **Functional:** every flow was run end to end on the sample data:
  - Edit Lead, Enable Logout, Create and Edit Salesperson (including validation),
  - Approval Request approve/reject, Attendance Details, Attendance Summary and its export,
  - Task Report, Task Details with paging, the Interaction dialog,
  - Interactions search, paging, badges, Summary and export,
  - Performance search, sorting and export,
  - Planning: rename area, add area (with and without overlap), delete, refresh, update polygon, Sync All, assign area, activate/deactivate, and task generation, which then shows up in the Task Report,
  - sign-out, the route guard, and data surviving a reload.
- **Not tested:** the real Firebase/SSO/REST backend. It needs your environment's `config.json`, so it hasn't been run against your backend from here.
