import type { Page } from '@playwright/test';
import {
  button,
  captureDownload,
  closeSwal,
  columnTexts,
  day,
  expect,
  fieldByLabel,
  heading,
  open,
  openSelect,
  pickDate,
  readWorkbook,
  rows,
  selectOptions,
  signIn,
  test,
  waitForLoader,
} from './fixtures';

test.beforeEach(async ({ page }) => {
  await signIn(page);
  await open(page, '/task-report');
  await expect(heading(page, 'Task Report')).toBeVisible();
});

async function search(page: Page, from?: number, to?: number) {
  if (from !== undefined) await pickDate(page, 'Start Date', from);
  if (to !== undefined) await pickDate(page, 'End Date', to);
  await button(page, 'Search').click();
  await waitForLoader(page);
}

/** Opens Task Details for the first report of `date` with more than `minCustomers` stops; returns its stop count. */
async function openTaskDetails(page: Page, date: string, minCustomers: number): Promise<{ name: string; count: number }> {
  const all = await rows(page).evaluateAll((els) =>
    els.map((el) => ({
      date: el.querySelector('.cdk-column-date')!.textContent!.trim(),
      name: el.querySelector('.cdk-column-salesPersonName')!.textContent!.trim(),
      count: Number(el.querySelector('.cdk-column-customerCount')!.textContent!.trim()),
    })),
  );
  const index = all.findIndex((r) => r.date === date && r.count > minCustomers);
  expect(index, `a ${date} report with more than ${minCustomers} customers`).toBeGreaterThanOrEqual(0);
  await button(rows(page).nth(index), 'View Customers').click();
  await expect(page).toHaveURL(/\/task-report\/task-details\/Report_\d+/);
  await expect(heading(page, 'Tasks')).toBeVisible();
  await waitForLoader(page);
  return all[index];
}

test.describe('Task Report', () => {
  test('validates the dates', async ({ page }) => {
    await search(page);
    await closeSwal(page, 'Please select Start Date and End Date');
    await search(page, 0, -1);
    await closeSwal(page, 'Please select valid Start Date and End Date');
  });

  test('lists the task reports of the range and filters by sales person', async ({ page }) => {
    await search(page, -1, 0);
    const dates = await columnTexts(page, 'date');
    expect(dates.length).toBeGreaterThan(20);
    expect(new Set(dates)).toEqual(new Set([day(-1).ymd, day(0).ymd]));
    expect(await columnTexts(page, 'sno')).toEqual(dates.map((_, i) => String(i + 1)));
    expect((await columnTexts(page, 'areaName')).every((a) => a.length > 0)).toBe(true);
    expect((await columnTexts(page, 'customerCount')).every((c) => Number(c) > 0)).toBe(true);

    const name = (await columnTexts(page, 'salesPersonName'))[0];
    await selectOptions(page, fieldByLabel(page, 'Sales Person'), [name], { multiple: true });
    await search(page);
    expect(await columnTexts(page, 'salesPersonName')).toEqual([name, name]);
  });

  test('a range without tasks says "No Tasks Found"', async ({ page }) => {
    await search(page, 5, 6);
    await closeSwal(page, 'No Tasks Found');
    await expect(page.getByText('No Tasks Found', { exact: true })).toBeVisible();

    // Clear Filters goes back to the empty state and keeps the session.
    await button(page, 'Clear Filters').click();
    await expect(page.getByText('No Tasks Found', { exact: true })).toHaveCount(0);
    await expect(page.getByPlaceholder('Start Date', { exact: true })).toHaveValue('');
    expect(await page.evaluate(() => localStorage.getItem('uid'))).not.toBeNull();
  });

  test('exports the tasks of the range', async ({ page }) => {
    await search(page, 0, 0);
    const total = (await columnTexts(page, 'customerCount')).reduce((sum, c) => sum + Number(c), 0);
    const download = await captureDownload(page, () => button(page, 'Download Excel').click());
    expect(download.suggestedFilename()).toBe('DownloadedTasks.xlsx');
    await closeSwal(page, 'Excel Downloaded Successfully');

    const workbook = await readWorkbook(download);
    expect(workbook.sheets).toEqual(['Tasks']);
    expect(workbook.data['Tasks']).toHaveLength(total);
    expect(new Set(workbook.data['Tasks'].map((r) => r['Task Date']))).toEqual(new Set([day(0).ymd]));
    expect(new Set(workbook.data['Tasks'].map((r) => r['Status']))).toEqual(new Set(['Visited', 'Not Yet Visited']));
  });
});

test.describe('Task Details', () => {
  test('pages through the stops 25 / 50 at a time', async ({ page }) => {
    await search(page, -1, -1);
    const report = await openTaskDetails(page, day(-1).ymd, 25);

    const range = page.locator('.mat-mdc-paginator-range-label');
    await expect(range).toHaveText(`1 – 25 of ${report.count}`);
    await expect(rows(page)).toHaveCount(25);
    const firstPage = (await columnTexts(page, 'stopNumber')).map(Number);
    expect(firstPage).toEqual(Array.from({ length: 25 }, (_, i) => i + 1));
    expect(new Set(await columnTexts(page, 'salesPersonName'))).toEqual(new Set([report.name]));
    expect(new Set(await columnTexts(page, 'taskDate'))).toEqual(new Set([day(-1).ymd]));

    await page.locator('.mat-mdc-paginator-navigation-next').click();
    await expect(range).toHaveText(`26 – ${report.count} of ${report.count}`);
    await expect(rows(page)).toHaveCount(report.count - 25);
    expect((await columnTexts(page, 'stopNumber')).map(Number)[0]).toBe(26);
    await expect(page.locator('.mat-mdc-paginator-navigation-next')).toBeDisabled();

    await page.locator('.mat-mdc-paginator-navigation-previous').click();
    await expect(range).toHaveText(`1 – 25 of ${report.count}`);

    const sizePanel = await openSelect(page, page.locator('.mat-mdc-paginator-page-size'));
    await sizePanel.locator('mat-option', { hasText: '50' }).click();
    await expect(range).toHaveText(`1 – ${report.count} of ${report.count}`);
    await expect(rows(page)).toHaveCount(report.count);
  });

  test('shows a visited stop\'s interaction in a dialog', async ({ page }) => {
    await search(page, -1, -1);
    await openTaskDetails(page, day(-1).ymd, 0);

    const visited = rows(page).filter({ has: button(page, 'View Interaction') }).first();
    await expect(visited.locator('.cdk-column-status')).toHaveText('Visited');
    const businessName = (await visited.locator('.cdk-column-businessName').innerText()).trim();
    const customerId = (await visited.locator('.cdk-column-customerId').innerText()).trim();
    await button(visited, 'View Interaction').click();

    const dialog = page.locator('mat-dialog-container').filter({ has: heading(page, 'Interaction Details') });
    await expect(dialog).toBeVisible();
    await expect(rows(dialog)).toHaveCount(1);
    await expect(dialog.locator('.mat-mdc-cell.cdk-column-businessName')).toHaveText(businessName);
    await expect(dialog.locator('.mat-mdc-cell.cdk-column-customerId')).toHaveText(customerId);
    await expect(dialog.locator('.mat-mdc-cell.cdk-column-interactionCategory')).not.toBeEmpty();
    await expect(dialog.locator('.mat-mdc-cell.cdk-column-checkInTime')).toContainText(day(-1).ymd);

    await dialog.locator('mat-icon', { hasText: 'close' }).click();
    await expect(dialog).toHaveCount(0);
  });

  test('a stop without an interaction says so', async ({ page }) => {
    await search(page, -1, -1);
    await openTaskDetails(page, day(-1).ymd, 0);
    const notVisited = rows(page).filter({ has: button(page, 'No Interaction') }).first();
    await expect(notVisited.locator('.cdk-column-status')).toHaveText('Not Yet Visited');
    await button(notVisited, 'No Interaction').click();
    await closeSwal(page, 'No interaction found');
  });
});
