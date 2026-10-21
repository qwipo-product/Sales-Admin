import type { Locator, Page } from '@playwright/test';
import {
  button,
  captureDownload,
  closeSwal,
  columnTexts,
  content,
  expect,
  fieldByLabel,
  heading,
  open,
  pickDate,
  readWorkbook,
  rows,
  selectOptions,
  selectOptionTexts,
  signIn,
  test,
  waitForLoader,
} from './fixtures';

const PANELS = [
  'MTD Revenue Report',
  'Monthly Customer Report',
  'Daily Performance Incentive Report',
  'Daily Customers Report',
  'Monthly Incentive Report',
];
const SHEETS = ['mtdRevenueReport', 'dailyPerformanceIncentiveReport', 'dailyCustomersReport', 'monthlyCustomerReport', 'monthlyIncentiveReport'];

test.beforeEach(async ({ page }) => {
  await signIn(page);
  await open(page, '/performance');
  await expect(heading(page, 'Sales Person Report')).toBeVisible();
});

function panel(page: Page, title: string): Locator {
  return page.locator('mat-expansion-panel', { has: page.locator('mat-panel-title', { hasText: title }) });
}

async function expand(page: Page, title: string): Promise<Locator> {
  const p = panel(page, title);
  await p.locator('mat-expansion-panel-header').click();
  await expect(p.locator('mat-expansion-panel-header')).toHaveAttribute('aria-expanded', 'true');
  return p;
}

async function search(page: Page, offset = 0) {
  await pickDate(page, 'Select Date', offset);
  await button(content(page), 'Search').click();
  await waitForLoader(page);
}

test.describe('Performance Report', () => {
  test('needs a date, and has nothing to export before a search', async ({ page }) => {
    await expect(page.getByText('There Is No data', { exact: true })).toBeVisible();
    await button(content(page), 'Search').click();
    await closeSwal(page, 'Please select Date');
    await button(page, 'Download Excel').click();
    await closeSwal(page, 'There Is No data to download');
  });

  test('shows the five report panels for the chosen day', async ({ page }) => {
    const salesPersons = await selectOptionTexts(page, fieldByLabel(page, 'Sales Person'));
    await search(page, 0);
    await expect(page.getByText('There Is No data', { exact: true })).toHaveCount(0);
    await expect(page.locator('mat-panel-title')).toHaveText(PANELS);

    for (const title of PANELS) {
      const p = await expand(page, title);
      const names = await columnTexts(p, 'BA Name');
      expect(names.length).toBeGreaterThan(20);
      expect(names.every((n) => salesPersons.includes(n))).toBe(true);
      await expect(p.locator('th.mat-mdc-header-cell').first()).toHaveText('BA Name');
    }

    const daily = panel(page, 'Daily Performance Incentive Report');
    const tasks = (await columnTexts(daily, 'Tasks')).map(Number);
    const achieved = (await columnTexts(daily, 'Achieved')).map(Number);
    achieved.forEach((a, i) => expect(a).toBeLessThanOrEqual(tasks[i]));
  });

  test('filters by sales person', async ({ page }) => {
    const salesPersons = await selectOptionTexts(page, fieldByLabel(page, 'Sales Person'));
    const picked = salesPersons.slice(0, 2);
    await selectOptions(page, fieldByLabel(page, 'Sales Person'), picked, { multiple: true });
    await search(page, -1);
    const p = await expand(page, 'MTD Revenue Report');
    expect(new Set(await columnTexts(p, 'BA Name'))).toEqual(new Set(picked));
  });

  test('column headers sort the table', async ({ page }) => {
    await search(page, 0);
    const p = await expand(page, 'MTD Revenue Report');
    const original = await columnTexts(p, 'BA Name');

    const nameHeader = p.locator('th.mat-mdc-header-cell', { hasText: 'BA Name' });
    await nameHeader.click();
    await expect(nameHeader).toHaveAttribute('aria-sort', 'ascending');
    const ascending = await columnTexts(p, 'BA Name');
    expect(ascending).toEqual([...original].sort((a, b) => a.localeCompare(b)));

    await nameHeader.click();
    await expect(nameHeader).toHaveAttribute('aria-sort', 'descending');
    expect(await columnTexts(p, 'BA Name')).toEqual([...ascending].reverse());

    const revenueHeader = p.locator('th.mat-mdc-header-cell', { hasText: /^\s*Revenue Achieved\s*$/ });
    await revenueHeader.click();
    await expect(revenueHeader).toHaveAttribute('aria-sort', 'ascending');
    const revenue = (await columnTexts(p, 'Revenue Achieved')).map(Number);
    expect(revenue).toEqual([...revenue].sort((a, b) => a - b));
    await expect(rows(p)).toHaveCount(original.length);
  });

  test('exports every table to one workbook', async ({ page }) => {
    await search(page, 0);
    const rowCounts: Record<string, number> = {};
    for (const title of PANELS) {
      rowCounts[title] = await rows(await expand(page, title)).count();
    }

    const download = await captureDownload(page, () => button(page, 'Download Excel').click());
    expect(download.suggestedFilename()).toBe('Sales Person Performance Report.xlsx');

    const workbook = await readWorkbook(download);
    expect([...workbook.sheets].sort()).toEqual([...SHEETS].sort());
    expect(workbook.data['mtdRevenueReport']).toHaveLength(rowCounts['MTD Revenue Report']);
    expect(workbook.data['dailyCustomersReport']).toHaveLength(rowCounts['Daily Customers Report']);
    expect(Object.keys(workbook.data['mtdRevenueReport'][0])).toEqual(
      expect.arrayContaining(['BA Name', 'TL Name', 'Area', 'Revenue Target', 'Revenue Achieved', 'Today Target']),
    );
  });
});
