import { Download, expect, Locator, Page, test as base } from '@playwright/test';
import * as fs from 'fs';
import * as XLSX from 'xlsx';

/**
 * The sample-data backend (src/app/mock) generates its records around the browser's "now": tasks for the last
 * three weeks, today's interactions up to the current hour, pending leave requests for the last two days, and so on.
 * Every test runs with the browser clock set to this moment (time keeps flowing from there), so the data, the
 * default date filters and the date pickers are the same on every run.
 * Wednesday 21 October 2026, 14:00 India Standard Time (the config sets timezoneId Asia/Kolkata).
 */
export const FIXED_NOW = new Date('2026-10-21T14:00:00+05:30');
const TODAY_UTC = Date.UTC(2026, 9, 21);

/** A calendar day relative to FIXED_NOW (time-zone independent, computed in UTC). */
export function day(offset = 0): { date: Date; ymd: string; label: string } {
  const date = new Date(TODAY_UTC + offset * 86_400_000);
  const pad = (n: number) => String(n).padStart(2, '0');
  const ymd = `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
  // Same text as the Material calendar cells' aria-label (NativeDateAdapter, en-US): "October 21, 2026".
  const label = date.toLocaleDateString('en-US', { timeZone: 'UTC', year: 'numeric', month: 'long', day: 'numeric' });
  return { date, ymd, label };
}

export const test = base.extend({
  page: async ({ page }, use, testInfo) => {
    // Uncaught errors in the app are printed with the test's output (they usually explain a failure).
    page.on('pageerror', (error) => console.warn(`[pageerror] ${testInfo.title}: ${error.message}\n${error.stack ?? ''}`));
    await page.clock.install({ time: FIXED_NOW });
    // Each test already gets a fresh browser context (empty localStorage). Clear it once more on the first page load
    // anyway, so the sample database (localStorage "salesAdminMockDb.v1") always starts from the seed. Reloads in the
    // same tab keep their data, which some tests rely on.
    await page.addInitScript(() => {
      if (!sessionStorage.getItem('e2e.storageCleared')) {
        localStorage.clear();
        sessionStorage.setItem('e2e.storageCleared', '1');
      }
    });
    await use(page);
  },
});

export { expect };

// ------------------------------------------------------------------------------------------------- session

/** Signs in through the sample-data sign-in card and waits for the home page. */
export async function signIn(page: Page) {
  await page.goto('/sessions/signin');
  await button(page, 'Sign in').click();
  await expect(page).toHaveURL(/\/home$/);
  await expect(page.getByText('Home Page')).toBeVisible();
}

/** The routed page content (excludes the sidebar and the top bar). */
export function content(page: Page): Locator {
  return page.locator('.container-dynamic');
}

/**
 * Elements are located by tag and text rather than by ARIA role: after some alerts the app leaves `aria-hidden="true"`
 * on <app-root> (see known-bugs.spec.ts), which hides every page element from role-based queries.
 */
export function button(scope: Page | Locator, text: string | RegExp): Locator {
  return scope.locator('button', { hasText: typeof text === 'string' ? exactText(text) : text });
}

export function heading(scope: Page | Locator, text: string): Locator {
  return scope.locator('h1, h2, h3, h4, h5, h6', { hasText: exactText(text) });
}

export function tab(scope: Page | Locator, text: string): Locator {
  return scope.locator('[role="tab"]', { hasText: exactText(text) });
}

/** Opens an admin page and waits for the "Please wait" loader (if any) to go away. */
export async function open(page: Page, path: string) {
  await page.goto(path);
  await waitForLoader(page);
}

/** The blocking "Please wait" dialog (AppLoaderService). */
export async function waitForLoader(page: Page) {
  await expect(page.locator('app-app-loader')).toHaveCount(0, { timeout: 30_000 });
}

// ------------------------------------------------------------------------------------------------- SweetAlert2

export function swal(page: Page): Locator {
  return page.locator('.swal2-popup');
}

/** Waits for a SweetAlert2 popup whose text contains `text`. */
export async function expectSwal(page: Page, text: string | RegExp) {
  await expect(swal(page)).toBeVisible();
  await expect(swal(page)).toContainText(text);
}

/** Waits for the popup (optionally checking its text) and presses its confirm button. */
export async function confirmSwal(page: Page, text?: string | RegExp) {
  if (text !== undefined) await expectSwal(page, text);
  await page.locator('.swal2-confirm').click();
}

/** Confirms the popup and waits until no SweetAlert2 popup is left on screen. */
export async function closeSwal(page: Page, text?: string | RegExp) {
  await confirmSwal(page, text);
  await expect(page.locator('.swal2-container')).toHaveCount(0);
}

/** Presses the popup's cancel button and waits until it is gone. */
export async function cancelSwal(page: Page, text?: string | RegExp) {
  if (text !== undefined) await expectSwal(page, text);
  await page.locator('.swal2-cancel').click();
  await expect(page.locator('.swal2-container')).toHaveCount(0);
}

// ------------------------------------------------------------------------------------------------- Material form fields

function exactText(text: string): RegExp {
  return new RegExp(`^\\s*${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`);
}

function pageOf(scope: Page | Locator): Page {
  return typeof (scope as Locator).page === 'function' ? (scope as Locator).page() : (scope as Page);
}

/** The mat-form-field whose <mat-label> reads exactly `label`. */
export function fieldByLabel(scope: Page | Locator, label: string): Locator {
  // (The inner `has` locator is resolved relative to each mat-form-field, so it must start from the page.)
  return scope.locator('mat-form-field').filter({ has: pageOf(scope).locator('mat-label', { hasText: exactText(label) }) });
}

/** The mat-form-field that contains the input with this placeholder (used for the date inputs). */
export function fieldByPlaceholder(scope: Page | Locator, placeholder: string): Locator {
  return scope.locator('mat-form-field').filter({ has: pageOf(scope).getByPlaceholder(placeholder, { exact: true }) });
}

/**
 * Opens a mat-select by clicking `.mat-mdc-select-trigger`. MatSelect does not open while it has no options, and many
 * selects load theirs asynchronously, so the click is retried until the panel shows up.
 */
export async function openSelect(page: Page, field: Locator): Promise<Locator> {
  const panel = page.locator('.mat-mdc-select-panel');
  await expect(async () => {
    if ((await panel.count()) === 0) await field.locator('.mat-mdc-select-trigger').click();
    await expect(panel.locator('mat-option').first()).toBeVisible({ timeout: 1_000 });
  }).toPass({ timeout: 20_000 });
  return panel;
}

/** Opens a mat-select and picks the given options (multi-selects are closed with Escape afterwards). */
export async function selectOptions(page: Page, field: Locator, options: string[], opts: { multiple?: boolean } = {}) {
  const panel = await openSelect(page, field);
  for (const option of options) {
    await panel.locator('mat-option', { hasText: exactText(option) }).click();
  }
  if (opts.multiple) {
    await page.keyboard.press('Escape');
  }
  await expect(panel).toHaveCount(0);
}

/** Option texts of a mat-select (opens and closes the panel). */
export async function selectOptionTexts(page: Page, field: Locator): Promise<string[]> {
  const panel = await openSelect(page, field);
  const texts = (await panel.locator('mat-option').allInnerTexts()).map((t) => t.trim());
  await page.keyboard.press('Escape');
  await expect(panel).toHaveCount(0);
  return texts;
}

/**
 * Picks a day in a Material datepicker: opens the toggle next to the input with `placeholder`, moves to the right
 * month and clicks the day (the inputs are read-only, so the calendar is the only way in).
 */
export async function pickDate(page: Page, placeholder: string, offset: number, scope: Page | Locator = page) {
  const target = day(offset);
  await fieldByPlaceholder(scope, placeholder).locator('mat-datepicker-toggle button').click();
  const calendar = page.locator('mat-calendar');
  await expect(calendar).toBeVisible();
  for (let i = 0; i < 36; i++) {
    const cell = calendar.locator(`.mat-calendar-body-cell[aria-label="${target.label}"]`);
    if ((await cell.count()) > 0) {
      await cell.click();
      await expect(calendar).toHaveCount(0);
      return;
    }
    const firstLabel = await calendar.locator('.mat-calendar-body-cell').first().getAttribute('aria-label');
    const shown = new Date(`${firstLabel} UTC`);
    const forward = shown.getTime() < target.date.getTime();
    await calendar.locator(forward ? '.mat-calendar-next-button' : '.mat-calendar-previous-button').click();
  }
  throw new Error(`Could not find ${target.label} in the datepicker`);
}

// ------------------------------------------------------------------------------------------------- tables

/** Body rows of the Material table(s) inside `scope` (works for both <mat-row> and <tr mat-row>). */
export function rows(scope: Page | Locator): Locator {
  return scope.locator('.mat-mdc-row');
}

/** Text of the cell in `column` (its matColumnDef, i.e. the `cdk-column-…` class) for every row. */
export async function columnTexts(scope: Page | Locator, column: string): Promise<string[]> {
  const cls = `.cdk-column-${column.replace(/[^A-Za-z0-9_-]/g, '-')}`;
  return (await rows(scope).locator(`.mat-mdc-cell${cls}`).allInnerTexts()).map((t) => t.trim());
}

/** The row that contains `text`. */
export function rowWith(scope: Page | Locator, text: string | RegExp): Locator {
  return rows(scope).filter({ hasText: text });
}

// ------------------------------------------------------------------------------------------------- downloads

/** Runs `action` and returns the download it triggers. */
export async function captureDownload(page: Page, action: () => Promise<void>): Promise<Download> {
  const [download] = await Promise.all([page.waitForEvent('download'), action()]);
  return download;
}

/** Reads a downloaded .xlsx: sheet names and the rows of every sheet as objects (header row = keys). */
export async function readWorkbook(download: Download): Promise<{ sheets: string[]; data: Record<string, any[]> }> {
  const file = await download.path();
  const workbook = XLSX.read(fs.readFileSync(file), { type: 'buffer' });
  const data: Record<string, any[]> = {};
  workbook.SheetNames.forEach((name) => (data[name] = XLSX.utils.sheet_to_json(workbook.Sheets[name])));
  return { sheets: workbook.SheetNames, data };
}

// ------------------------------------------------------------------------------------------------- sample data

/** Reads the in-browser sample database (window.salesAdminMock.db, see src/app/mock/mock-database.ts). */
export async function mockQuery<T = any>(page: Page, fn: string, ...args: any[]): Promise<T> {
  return page.evaluate(
    ([body, params]) => {
      const db = (window as any).salesAdminMock?.db;
      if (!db) throw new Error('Sample database not loaded (is config.json "env" set to "mock"?)');
      // eslint-disable-next-line no-new-func
      return new Function('db', ...params.map((_: any, i: number) => `a${i}`), body)(db, ...params);
    },
    [fn, args] as [string, any[]],
  );
}
