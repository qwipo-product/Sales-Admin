import type { Locator, Page } from '@playwright/test';
import {
  button,
  captureDownload,
  closeSwal,
  columnTexts,
  day,
  expect,
  expectSwal,
  fieldByLabel,
  heading,
  mockQuery,
  open,
  readWorkbook,
  rows,
  selectOptions,
  signIn,
  test,
  waitForLoader,
} from './fixtures';

const PAGE_SIZE = 50;
const TODAY = day(0).ymd;

/** Interactions created today in the sample data (the oracle for counts). */
async function interactionsToday(page: Page): Promise<number> {
  return mockQuery<number>(page, `return db.query('Interactions', [{ fieldName: 'createdDate', operator: '==', fieldValue: a0 }]).length;`, TODAY);
}

function pager(page: Page): Locator {
  return page.locator('h6', { hasText: / of \d+$/ });
}

function badge(page: Page, label: string): Locator {
  return page.locator('.badge', { has: page.locator('.badge-text', { hasText: `${label} :` }) });
}

/** One identifying key per row on screen: time stamp + customer + sales person. */
async function rowKeys(page: Page): Promise<string[]> {
  return rows(page).evaluateAll((els) =>
    els.map((el) =>
      ['date', 'customerId', 'salesPersonName']
        .map((c) => el.querySelector(`.cdk-column-${c}`)!.textContent!.trim())
        .join('|'),
    ),
  );
}

async function openSearch(page: Page): Promise<Locator> {
  await page.locator('button.srchbtn').click();
  const dialog = page.locator('mat-dialog-container').filter({ has: heading(page, 'Interaction Search') });
  await expect(dialog).toBeVisible();
  return dialog;
}

test.beforeEach(async ({ page }) => {
  await signIn(page);
  await open(page, '/interaction-list');
  await expect(heading(page, 'Interactions')).toBeVisible();
  await expect(rows(page).first()).toBeVisible();
});

test.describe('Interactions', () => {
  test("opens on today's interactions, 50 per page", async ({ page }) => {
    const total = await interactionsToday(page);
    const pages = Math.ceil(total / PAGE_SIZE);
    expect(pages).toBeGreaterThan(2);

    await expect(rows(page)).toHaveCount(PAGE_SIZE);
    await expect(pager(page)).toHaveText(`1 of ${pages}`);
    await expect(button(page, 'Prev')).toBeDisabled();
    await expect(button(page, 'Next')).toBeEnabled();
    await expect(badge(page, 'Date Range')).toContainText(`${TODAY} to ${TODAY}`);
    expect((await columnTexts(page, 'date')).every((d) => d.includes(TODAY))).toBe(true);

    // Newest first.
    const stamps = await columnTexts(page, 'date');
    expect([...stamps].sort().reverse()).toEqual(stamps);
  });

  test('Next / Prev walk every page once, without repeating rows', async ({ page }) => {
    const total = await interactionsToday(page);
    const pages = Math.ceil(total / PAGE_SIZE);
    const firstPage = await rowKeys(page);
    const seen: string[] = [...firstPage];

    for (let p = 2; p <= pages; p++) {
      await button(page, 'Next').click();
      await waitForLoader(page);
      await expect(pager(page)).toHaveText(`${p} of ${pages}`);
      await expect(rows(page)).toHaveCount(p < pages ? PAGE_SIZE : total - PAGE_SIZE * (pages - 1));
      seen.push(...(await rowKeys(page)));
    }
    await expect(button(page, 'Next')).toBeDisabled();
    expect(seen).toHaveLength(total);
    expect(new Set(seen).size).toBe(total);

    await button(page, 'Prev').click();
    await waitForLoader(page);
    await expect(pager(page)).toHaveText(`${pages - 1} of ${pages}`);
    expect(await rowKeys(page)).toEqual(seen.slice((pages - 2) * PAGE_SIZE, (pages - 1) * PAGE_SIZE));

    for (let p = pages - 2; p >= 1; p--) {
      await button(page, 'Prev').click();
      await waitForLoader(page);
      await expect(pager(page)).toHaveText(`${p} of ${pages}`);
    }
    await expect(button(page, 'Prev')).toBeDisabled();
    expect(await rowKeys(page)).toEqual(firstPage);
  });

  test('searches by sales person; removing the badge restores all rows from page 1', async ({ page }) => {
    const total = await interactionsToday(page);
    await button(page, 'Next').click();
    await waitForLoader(page);
    await expect(pager(page)).toHaveText(new RegExp(`^2 of `));

    const name = (await columnTexts(page, 'salesPersonName'))[0];
    const dialog = await openSearch(page);
    await expect(dialog.getByPlaceholder('Start Date', { exact: true })).not.toHaveValue('');
    await selectOptions(page, fieldByLabel(dialog, 'Sales Person'), [name], { multiple: true });
    await button(dialog, 'Search').click();
    await expect(dialog).toHaveCount(0);
    await waitForLoader(page);

    await expect(badge(page, 'Sales Person')).toContainText(name);
    await expect(pager(page)).toHaveText('1 of 1');
    expect(new Set(await columnTexts(page, 'salesPersonName'))).toEqual(new Set([name]));

    await badge(page, 'Sales Person').locator('.close').click();
    await waitForLoader(page);
    await expect(badge(page, 'Sales Person')).toHaveCount(0);
    await expect(pager(page)).toHaveText(`1 of ${Math.ceil(total / PAGE_SIZE)}`);
    await expect(rows(page)).toHaveCount(PAGE_SIZE);
  });

  test('searches by customer mobile number and validates it', async ({ page }) => {
    const mobile = (await columnTexts(page, 'mobileNumber'))[0];
    let dialog = await openSearch(page);
    await dialog.getByPlaceholder('Customer Mobile Number').fill('12345');
    await button(dialog, 'Search').click();
    await closeSwal(page, 'Please give the Customer Mobile Number 10 Digits');
    await expect(dialog).toBeVisible();

    await dialog.getByPlaceholder('Customer Mobile Number').fill(mobile);
    await button(dialog, 'Search').click();
    await expect(dialog).toHaveCount(0);
    await waitForLoader(page);
    await expect(badge(page, 'Mobile Number')).toContainText(mobile);
    expect(new Set(await columnTexts(page, 'mobileNumber'))).toEqual(new Set([mobile]));

    // Removing the badge clears the filter.
    await badge(page, 'Mobile Number').locator('.close').click();
    await waitForLoader(page);
    await expect(badge(page, 'Mobile Number')).toHaveCount(0);
    await expect(rows(page)).toHaveCount(PAGE_SIZE);

    // Removing "Date Range" resets it to today (dates are mandatory).
    await badge(page, 'Date Range').locator('.close').click();
    await waitForLoader(page);
    await expect(badge(page, 'Date Range')).toContainText(`${TODAY} to ${TODAY}`);
    await expect(rows(page)).toHaveCount(PAGE_SIZE);

    dialog = await openSearch(page);
    await dialog.locator('mat-icon', { hasText: 'close' }).click();
    await expect(dialog).toHaveCount(0);
  });

  test('Summary counts every interaction of the range', async ({ page }) => {
    const total = await interactionsToday(page);
    await button(page, 'Summary').click();
    await waitForLoader(page);
    const dialog = page.locator('mat-dialog-container').filter({ has: heading(page, 'Interaction Summary') });
    await expect(dialog).toBeVisible();

    const names = await columnTexts(dialog, 'salesPersonName');
    const visited = (await columnTexts(dialog, 'interactionCount')).map(Number);
    const tasks = (await columnTexts(dialog, 'taskCount')).map(Number);
    expect(names[0]).toBe('Summary Of All Sales Person');
    expect(visited[0]).toBe(total);
    expect(visited.slice(1).reduce((a, b) => a + b, 0)).toBe(total);
    expect(tasks[0]).toBe(tasks.slice(1).reduce((a, b) => a + b, 0));
    visited.forEach((v, i) => expect(v).toBeLessThanOrEqual(tasks[i]));

    await button(dialog, 'Download Excel').click();
    await expectSwal(page, 'Do you want to proceed?');
    const download = await captureDownload(page, () => page.locator('.swal2-confirm').click());
    expect(download.suggestedFilename()).toBe('DownloadedInteractions.xlsx');
    await closeSwal(page, 'Excel Downloaded Successfully');
    const workbook = await readWorkbook(download);
    expect(workbook.sheets).toEqual(['InteractionReport']);
    expect(workbook.data['InteractionReport'][0]).toMatchObject({
      'Sales Person Name': 'Summary Of All Sales Person',
      'Total Visited Count': total,
    });

    await dialog.locator('mat-icon', { hasText: 'close' }).click();
    await expect(dialog).toHaveCount(0);
  });

  test('Download Excel asks once and exports once', async ({ page }) => {
    const total = await interactionsToday(page);
    const downloads: string[] = [];
    page.on('download', (d) => downloads.push(d.suggestedFilename()));

    await button(page, 'Download Excel').click();
    await expectSwal(page, 'Do you want to proceed?');
    await expect(page.locator('.swal2-popup')).toHaveCount(1);
    const download = await captureDownload(page, () => page.locator('.swal2-confirm').click());
    await closeSwal(page, 'Excel Downloaded Successfully');
    expect(download.suggestedFilename()).toBe('DownloadedInteractions.xlsx');

    // Production fired the export twice per click: no second confirm and no second file.
    await page.waitForTimeout(1_000);
    await expect(page.locator('.swal2-container')).toHaveCount(0);
    expect(downloads).toEqual(['DownloadedInteractions.xlsx']);

    const workbook = await readWorkbook(download);
    expect(workbook.sheets).toEqual(['Interactions']);
    expect(workbook.data['Interactions']).toHaveLength(total);
    expect(Object.keys(workbook.data['Interactions'][0])).toEqual(
      expect.arrayContaining(['Customer Name', 'Customer Id', 'Sales Person Name', 'Comment Category', 'Created Date', 'Task Id']),
    );
  });

  test('clicking a shop photo opens it full size', async ({ page }) => {
    await rows(page).first().locator('.cdk-column-imageUrl img').click();
    const modal = page.locator('mat-dialog-container img[alt="Modal Image"]');
    await expect(modal).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(modal).toHaveCount(0);
  });
});
