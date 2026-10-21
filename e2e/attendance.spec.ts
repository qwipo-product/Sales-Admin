import type { Locator, Page } from '@playwright/test';
import {
  button,
  cancelSwal,
  captureDownload,
  closeSwal,
  columnTexts,
  confirmSwal,
  day,
  expect,
  expectSwal,
  fieldByLabel,
  mockQuery,
  open,
  pickDate,
  readWorkbook,
  rows,
  selectOptions,
  signIn,
  swal,
  tab,
  test,
  waitForLoader,
} from './fixtures';

test.beforeEach(async ({ page }) => {
  await signIn(page);
  await open(page, '/attendance-report');
  await expect(tab(page, 'Approval Request')).toHaveAttribute('aria-selected', 'true');
});

async function search(page: Page, from?: number, to?: number) {
  if (from !== undefined) await pickDate(page, 'Start Date', from);
  if (to !== undefined) await pickDate(page, 'End Date', to);
  await button(page, 'Search').click();
  await waitForLoader(page);
}

/** A row identified by its cells (rows keep their identity when their status changes). */
function requestRow(page: Page, r: { name: string; date: string; type: string }): Locator {
  const cell = (column: string, text: string) =>
    page.locator(`.cdk-column-${column}`, { hasText: new RegExp(`^\\s*${text}\\s*$`) });
  return rows(page)
    .filter({ has: cell('salesPersonName', r.name) })
    .filter({ has: cell('date', r.date) })
    .filter({ has: cell('appliedFor', r.type) });
}

async function describeRow(row: Locator) {
  const text = async (column: string) => (await row.locator(`.cdk-column-${column}`).innerText()).trim();
  return { name: await text('salesPersonName'), date: await text('date'), type: await text('appliedFor') };
}

test.describe('Approval Request', () => {
  test('validates the date range', async ({ page }) => {
    await search(page);
    await closeSwal(page, 'Please select Start Date and End Date');

    await search(page, 0, -1);
    await closeSwal(page, 'Please select valid Start Date and End Date');
  });

  test('lists early-logout and leave requests of the range', async ({ page }) => {
    await search(page, -6, 0);
    await expect(rows(page).first()).toBeVisible();
    const header = page.locator('.mat-mdc-header-row');
    for (const title of ['Sales Person Name', 'Lead Name', 'Applied On', 'Reason', 'Approval Type', 'Status', 'Created On']) {
      await expect(header).toContainText(title);
    }

    const types = await columnTexts(page, 'appliedFor');
    expect(types).toContain('Leave');
    expect(types).toContain('Early checkout');
    expect(types.every((t) => t === 'Leave' || t === 'Early checkout')).toBe(true);

    // The leave-approved marker documents in AttendanceReport are not listed as nameless duplicates.
    const names = await columnTexts(page, 'salesPersonName');
    expect(names.every((n) => n.length > 0)).toBe(true);

    const dates = await columnTexts(page, 'date');
    expect(dates.every((d) => d >= day(-6).ymd && d <= day(0).ymd)).toBe(true);

    // Pending requests (last two days) can be approved or rejected; older ones show their outcome.
    const pending = rows(page).filter({ has: button(page, 'Approve') });
    expect(await pending.count()).toBeGreaterThan(1);
    await expect(pending.first().locator(button(page, 'Reject'))).toBeVisible();
    await expect(rows(page).filter({ hasText: /Leave (Approved|Rejected)|Reason for early logout (Approved|Rejected)/ }).first()).toBeVisible();
  });

  test('shows leave requests when the filter matches no early-logout request', async ({ page }) => {
    await search(page, -6, 0);
    const all = await rows(page).evaluateAll((els) =>
      els.map((el) => ({
        name: el.querySelector('.cdk-column-salesPersonName')!.textContent!.trim(),
        type: el.querySelector('.cdk-column-appliedFor')!.textContent!.trim(),
      })),
    );
    const leaveOnly = all.find((r) => r.type === 'Leave' && !all.some((o) => o.name === r.name && o.type !== 'Leave'));
    expect(leaveOnly, 'a sales person with only leave requests in the range').toBeTruthy();

    await selectOptions(page, fieldByLabel(page, 'Sales Person'), [leaveOnly!.name], { multiple: true });
    await search(page);
    await expect(rows(page).first()).toBeVisible();
    expect(new Set(await columnTexts(page, 'salesPersonName'))).toEqual(new Set([leaveOnly!.name]));
    expect(new Set(await columnTexts(page, 'appliedFor'))).toEqual(new Set(['Leave']));
    await expect(swal(page)).toHaveCount(0);
  });

  test('approves and rejects requests, after a warning confirmation', async ({ page }) => {
    await search(page, -6, 0);
    const total = await rows(page).count();
    const pending = () => rows(page).filter({ has: button(page, 'Approve') });
    const pendingBefore = await pending().count();

    const earlyLogout = await describeRow(pending().filter({ hasText: 'Early checkout' }).first());
    const leave = await describeRow(pending().filter({ hasText: 'Leave' }).first());

    // Cancel keeps the request pending.
    await button(requestRow(page, earlyLogout), 'Reject').click();
    await cancelSwal(page, 'Do you want to proceed with the confirmation?');
    await expect(button(requestRow(page, earlyLogout), 'Approve')).toBeVisible();

    await button(requestRow(page, earlyLogout), 'Approve').click();
    await expectSwal(page, 'Reason for early logout');
    await expectSwal(page, 'Do you want to proceed with the confirmation?');
    await expect(swal(page).locator('.swal2-icon.swal2-warning')).toBeVisible();
    await confirmSwal(page);
    await expectSwal(page, 'Success!');
    await closeSwal(page, 'Reason for early log out approved');
    await expect(requestRow(page, earlyLogout).locator('.cdk-column-action')).toHaveText('Reason for early logout Approved');

    await button(requestRow(page, leave), 'Reject').click();
    await expectSwal(page, 'Leave');
    await expect(swal(page).locator('.swal2-icon.swal2-warning')).toBeVisible();
    await confirmSwal(page, 'Do you want to proceed with the confirmation?');
    await expectSwal(page, 'Warning!');
    await closeSwal(page, 'Leave rejected');
    await expect(requestRow(page, leave).locator('.cdk-column-action')).toHaveText('Leave Rejected');
    await expect(pending()).toHaveCount(pendingBefore - 2);

    // Saved: a new search shows the same outcome, and no extra rows.
    await search(page);
    await expect(rows(page)).toHaveCount(total);
    await expect(requestRow(page, earlyLogout).locator('.cdk-column-action')).toHaveText('Reason for early logout Approved');
    await expect(requestRow(page, leave).locator('.cdk-column-action')).toHaveText('Leave Rejected');
  });

  test('an approved leave is listed once, as "Leave Approved"', async ({ page }) => {
    await search(page, -6, 0);
    const total = await rows(page).count();
    const leave = await describeRow(rows(page).filter({ hasText: 'Leave' }).filter({ has: button(page, 'Approve') }).first());
    await button(requestRow(page, leave), 'Approve').click();
    await confirmSwal(page, 'Do you want to proceed with the confirmation?');
    await closeSwal(page, 'Leave approved');
    await expect(requestRow(page, leave).locator('.cdk-column-action')).toHaveText('Leave Approved');

    await search(page);
    await expect(rows(page)).toHaveCount(total);
    await expect(requestRow(page, leave)).toHaveCount(1);
  });

  test('a cancelled leave shows "Leave Cancelled"', async ({ page }) => {
    // The sample data has no cancelled leave: cancel one in the sample database (status 9).
    const cancelled = await mockQuery<{ name: string; date: string }>(
      page,
      `const leave = db.query('LeaveReport', [{ fieldName: 'appliedOn', operator: '==', fieldValue: a0 }])[0];
       db.updateDoc('LeaveReport', leave.id, { status: 9 });
       return { name: leave.data.salesPerson.name, date: leave.data.appliedOn };`,
      day(-1).ymd,
    );
    await search(page, -1, -1);
    const row = requestRow(page, { ...cancelled, type: 'Leave' });
    await expect(row.locator('.cdk-column-action')).toHaveText('Leave Cancelled');
    await expect(button(row, 'Approve')).toHaveCount(0);
  });

  test('Clear Filters empties the list and keeps the session', async ({ page }) => {
    await search(page, -6, 0);
    await expect(rows(page).first()).toBeVisible();
    await button(page, 'Clear Filters').click();
    await expect(rows(page)).toHaveCount(0);
    await expect(page.getByPlaceholder('Start Date', { exact: true })).toHaveValue('');
    expect(await page.evaluate(() => localStorage.getItem('uid'))).not.toBeNull();
  });
});

test.describe('Attendance Details', () => {
  test.beforeEach(async ({ page }) => {
    await tab(page, 'Attendance Details').click();
    await expect(page.locator('attendance-details')).toBeVisible();
  });

  test("lists today's check-ins", async ({ page }) => {
    await search(page, 0, 0);
    await expect(rows(page).first()).toBeVisible();
    const header = page.locator('.mat-mdc-header-row');
    for (const title of ['Sales Person', 'Log In', 'Log Out', 'Status', 'Applied Date', 'Reason', 'Created On']) {
      await expect(header).toContainText(title);
    }
    expect(new Set(await columnTexts(page, 'status'))).toEqual(new Set(['checked in']));
    expect((await columnTexts(page, 'logIn')).every((t) => t.startsWith(`${day(0).ymd} 09:`))).toBe(true);
    expect((await columnTexts(page, 'logOut')).every((t) => t === '')).toBe(true);
  });

  test('filters by sales person and shows check-outs of past days', async ({ page }) => {
    await search(page, -3, -1);
    const names = await columnTexts(page, 'salesPersonName');
    expect(names.length).toBeGreaterThan(10);
    const statuses = new Set(await columnTexts(page, 'status'));
    expect(statuses.has('checked out')).toBe(true);

    const name = names[0];
    await selectOptions(page, fieldByLabel(page, 'Sales Person'), [name], { multiple: true });
    await search(page);
    const filtered = await columnTexts(page, 'salesPersonName');
    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.length).toBeLessThanOrEqual(3);
    expect(new Set(filtered)).toEqual(new Set([name]));
  });

  test('validates the date range', async ({ page }) => {
    await search(page);
    await closeSwal(page, 'Please select Start Date and End Date');
    await search(page, 0, -2);
    await closeSwal(page, 'Please select valid Start Date and End Date');
  });
});

test.describe('Attendance Summary', () => {
  test.beforeEach(async ({ page }) => {
    await tab(page, 'Attendance Summary').click();
    await expect(page.locator('attendance-summary')).toBeVisible();
  });

  test('validates the month and year, and export needs a search first', async ({ page }) => {
    await button(page, 'Search').click();
    await closeSwal(page, 'Please select both month and year.');

    await selectOptions(page, fieldByLabel(page, 'Filter By Year'), ['2026']);
    await button(page, 'Search').click();
    await closeSwal(page, 'Please select month.');

    await button(page, 'Download Excel').click();
    await closeSwal(page, 'Attendance Summary not found');
  });

  test('summarises the month and exports it', async ({ page }) => {
    await selectOptions(page, fieldByLabel(page, 'Filter By Year'), ['2026']);
    await selectOptions(page, fieldByLabel(page, 'Filter By Month'), ['October']);
    await button(page, 'Search').click();
    await waitForLoader(page);

    await expect(rows(page)).toHaveCount(36);
    // October 2026: 31 days, 27 of them Monday to Saturday.
    expect(new Set(await columnTexts(page, 'daysInMonth'))).toEqual(new Set(['31']));
    expect(new Set(await columnTexts(page, 'workingDays'))).toEqual(new Set(['27']));
    const present = (await columnTexts(page, 'presentDays')).map(Number);
    const absent = (await columnTexts(page, 'absentDays')).map(Number);
    const leave = (await columnTexts(page, 'leaveDays')).map(Number);
    present.forEach((p, i) => expect(p + absent[i] + leave[i]).toBe(27));
    expect(Math.max(...present)).toBeGreaterThan(10);

    await button(page, 'Download Excel').click();
    await expectSwal(page, 'Do you want to proceed?');
    const download = await captureDownload(page, () => page.locator('.swal2-confirm').click());
    expect(download.suggestedFilename()).toBe('DownloadedAttendanceSummary.xlsx');
    await closeSwal(page, 'Excel Downloaded Successfully');

    const workbook = await readWorkbook(download);
    expect(workbook.sheets).toEqual(['AttendanceSummary']);
    const sheet = workbook.data['AttendanceSummary'];
    expect(sheet).toHaveLength(36);
    expect(Object.keys(sheet[0])).toEqual(
      expect.arrayContaining(['Sales Person', 'Sales Person Mobile Number', 'Total Days', 'Working Days', 'Present Days', 'Absent', 'Leave']),
    );
    expect(sheet.map((r) => r['Present Days'] ?? 0)).toEqual(present);
    expect(sheet.every((r) => r['Total Days'] === 31 && r['Working Days'] === 27)).toBe(true);
  });
});
