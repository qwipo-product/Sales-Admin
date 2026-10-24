import type { Locator, Page } from '@playwright/test';
import {
  button,
  closeSwal,
  columnTexts,
  content,
  day,
  expect,
  expectSwal,
  fieldByLabel,
  heading,
  open,
  openSelect,
  pickDate,
  rows,
  selectOptions,
  signIn,
  tab,
  test,
  waitForLoader,
} from './fixtures';

/**
 * Reschedule Tasks (/reschedule-tasks, not in production): pick a sales person and a date range; each date of the range
 * that has tasks (from Planning → Tasks, or the sample data) becomes a set. The dialog moves sets to other days (Pick days
 * → Schedule) and "Assign schedule" replaces the person's tasks in the range.
 *
 * The sample data has tasks for every mapped sales person today (Wed 21 Oct) and tomorrow (Thu 22 Oct), and none later.
 */

test.beforeEach(async ({ page }) => {
  await signIn(page);
  await open(page, '/reschedule-tasks');
  await expect(heading(content(page), 'Reschedule Tasks')).toBeVisible();
});

// ------------------------------------------------------------------------------------------------- helpers

function exact(text: string): RegExp {
  return new RegExp(`^\\s*${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`);
}

function reschedulePage(page: Page): Locator {
  return page.locator('app-reschedule-tasks');
}

function field(page: Page, label: string): Locator {
  return fieldByLabel(reschedulePage(page), label);
}

function rescheduleButton(page: Page): Locator {
  return button(reschedulePage(page).locator('.reschedule-row'), 'Reschedule');
}

/** "23 Fri": the day labels of the dialog (format 'd EEE'). */
function dayName(offset: number): string {
  const date = day(offset).date;
  return `${date.getUTCDate()} ${date.toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'short' })}`;
}

function isSunday(offset: number): boolean {
  return dayName(offset).endsWith('Sun');
}

function range(from: number, to: number): number[] {
  return Array.from({ length: to - from + 1 }, (_, i) => from + i);
}

/** Picks a sales person (by position or name); returns what the option card shows. */
async function choosePerson(page: Page, which: number | string = 0): Promise<{ name: string; area: string; customers: string }> {
  const panel = await openSelect(page, field(page, 'Sales Person'));
  await expect(panel).toHaveClass(/sales-person-select-panel/);
  const options = panel.locator('mat-option.sales-person-option');
  const option =
    typeof which === 'number' ? options.nth(which) : options.filter({ has: page.locator('.sp-name', { hasText: exact(which) }) });
  const name = (await option.locator('.sp-name').innerText()).trim();
  const area = (await option.locator('.sp-area span').innerText()).trim();
  await expect(option.locator('.sp-stat')).toHaveCount(1);
  const customers = (await option.locator('.sp-stat', { hasText: 'Customers' }).locator('.sp-stat-value').innerText()).trim();
  await option.click();
  await expect(panel).toHaveCount(0);
  return { name, area, customers };
}

async function fillForm(page: Page, which: number | string, from: number, to: number): Promise<string> {
  const { name } = await choosePerson(page, which);
  await pickDate(page, field(page, 'Select From Date'), from);
  await pickDate(page, field(page, 'Select To Date'), to);
  return name;
}

async function openDialog(page: Page): Promise<Locator> {
  await expect(rescheduleButton(page)).toBeEnabled();
  await rescheduleButton(page).click();
  await waitForLoader(page);
  const dialog = page.locator('generate-tasks-dialog');
  await expect(heading(dialog, 'Reschedule Tasks')).toBeVisible();
  return dialog;
}

/** One entry per set: its "N shops" size and its "Now …" day. */
async function setsOf(dialog: Locator): Promise<{ size: number; now: string }[]> {
  return dialog.locator('.set-header').evaluateAll((els) =>
    els.map((el) => ({
      size: parseInt(el.querySelector('.set-shops-link')!.textContent!, 10),
      now: el.querySelector('.set-current')!.textContent!.trim().replace(/^Now\s+/, ''),
    })),
  );
}

/** [set index, column index] of every picked cell. */
async function picks(dialog: Locator, columns: number): Promise<[number, number][]> {
  return dialog.locator('.day-cell').evaluateAll(
    (els, cols) =>
      els.flatMap((el, i) => (el.classList.contains('picked') ? [[Math.floor(i / cols), i % cols] as [number, number]] : [])),
    columns,
  );
}

/** Step 2 cards that hold a set. */
async function scheduledCards(dialog: Locator) {
  return dialog.locator('.schedule-card:not(.empty)').evaluateAll((els) =>
    els.map((el) => ({
      day: el.querySelector('.schedule-day')!.textContent!.trim(),
      set: Number(el.querySelector('.schedule-set')!.textContent!.trim().replace('Set ', '')),
      moved: el.querySelector('.schedule-repeat')?.textContent!.trim().replace(/^Moved from\s+/, '') ?? null,
    })),
  );
}

/** Task Report rows (date and customer count) of one sales person in a day range, sorted by date. */
async function taskReport(page: Page, name: string, from: number, to: number) {
  await open(page, '/task-report');
  await pickDate(page, 'Start Date', from);
  await pickDate(page, 'End Date', to);
  await selectOptions(page, fieldByLabel(page, 'Sales Person'), [name], { multiple: true });
  await button(page, 'Search').click();
  await waitForLoader(page);
  const reported = await rows(page).evaluateAll((els) =>
    els.map((el) => ({
      date: el.querySelector('.cdk-column-date')!.textContent!.trim(),
      count: Number(el.querySelector('.cdk-column-customerCount')!.textContent!.trim()),
    })),
  );
  return reported.sort((a, b) => a.date.localeCompare(b.date));
}

const ymdOf = (offsets: number[]) => new Map(offsets.map((offset) => [dayName(offset), day(offset).ymd]));

// ------------------------------------------------------------------------------------------------- page

test.describe('Reschedule Tasks: page', () => {
  test('the menu lists it right after Planning', async ({ page }) => {
    const names = (await page.locator('.sidebar-panel a').allInnerTexts()).map((t) => t.trim()).filter(Boolean);
    expect(names.indexOf('Reschedule Tasks')).toBe(names.indexOf('Planning') + 1);
    await expect(page.locator('.sidebar-panel a', { hasText: exact('Reschedule Tasks') })).toHaveAttribute('href', '/reschedule-tasks');
  });

  test('Reschedule is enabled once a sales person and both dates are set', async ({ page }) => {
    const salesPerson = field(page, 'Sales Person');
    await expect(heading(reschedulePage(page), 'Filter by')).toBeVisible();
    await expect(salesPerson.locator('mat-hint')).toHaveCount(0);
    await expect(field(page, 'Select From Date')).toBeVisible();
    await expect(field(page, 'Select To Date')).toBeVisible();
    await expect(rescheduleButton(page)).toBeVisible();
    await expect(rescheduleButton(page)).toBeDisabled();

    // One sales person at a time: picking another replaces the first.
    const first = await choosePerson(page, 0);
    await expect(salesPerson.locator('.mat-mdc-select-value')).toHaveText(first.name);
    await expect(salesPerson.locator('mat-hint')).toHaveText(`${first.area} · ${first.customers} customers`);
    const second = await choosePerson(page, 1);
    await expect(salesPerson.locator('.mat-mdc-select-value')).toHaveText(second.name);
    await expect(salesPerson.locator('mat-hint')).toHaveText(`${second.area} · ${second.customers} customers`);
    await expect(rescheduleButton(page)).toBeDisabled();

    // A day before today can't be picked.
    await field(page, 'Select From Date').locator('mat-datepicker-toggle button').click();
    await expect(page.locator(`.mat-calendar-body-cell[aria-label="${day(-1).label}"]`)).toHaveAttribute('aria-disabled', 'true');
    await page.keyboard.press('Escape');

    await pickDate(page, field(page, 'Select From Date'), 0);
    await expect(rescheduleButton(page)).toBeDisabled();
    await pickDate(page, field(page, 'Select To Date'), 6);
    await expect(field(page, 'Select To Date').locator('mat-hint')).toHaveText('7 days');
    await expect(rescheduleButton(page)).toBeEnabled();
  });

  test('a range without tasks only warns', async ({ page }) => {
    const name = await fillForm(page, 0, 2, 8);
    await rescheduleButton(page).click();
    await closeSwal(page, `${name} has no tasks between these dates. Generate them from Planning → Tasks first.`);
    await expect(page.locator('generate-tasks-dialog')).toHaveCount(0);
  });
});

// ------------------------------------------------------------------------------------------------- dialog

test.describe('Reschedule Tasks: dialog', () => {
  // Today (Wed) and tomorrow (Thu) have tasks; Friday and Saturday are free.
  const DAYS = range(0, 3);

  test('every task date is a set that starts on its current day', async ({ page }) => {
    const name = await fillForm(page, 0, DAYS[0], DAYS[DAYS.length - 1]);
    const dialog = await openDialog(page);
    await expect(dialog.locator('.wizard-step')).toHaveText([/Pick days/, /Schedule/]);
    await expect(dialog.locator('.wizard-step.active')).toContainText('Pick days');
    await expect(dialog.locator('.step-heading .step-title')).toHaveText('1. Pick a day for each set');
    for (const label of ['Auto-pick days', 'Current days', 'Clear']) {
      await expect(button(dialog.locator('.step-heading'), label)).toBeVisible();
    }
    await expect(dialog.locator('.step-help')).toHaveCount(0);
    await expect(dialog.locator('.coverage-bar')).toHaveCount(0);

    // Columns: every date of the range (no Sunday in it). Rows: Set 1 = the earliest task date.
    await expect(dialog.locator('.day-header .day-name')).toHaveText(DAYS.map(dayName));
    await expect(dialog.locator('.day-header .day-delivery').first()).toHaveText(`Delivery ${dayName(DAYS[0] + 1)}`);
    await expect(dialog.locator('.set-header .set-name')).toHaveText(['Set 1', 'Set 2']);
    const sets = await setsOf(dialog);
    expect(sets.map((s) => s.now)).toEqual([dayName(0), dayName(1)]);
    expect(sets.every((s) => s.size > 0)).toBe(true);

    // Both sets start picked on their current day, marked "Now"; Next is enabled straight away.
    expect(await picks(dialog, DAYS.length)).toEqual([
      [0, 0],
      [1, 1],
    ]);
    await expect(dialog.locator('.day-cell .current-tag')).toHaveText(['Now', 'Now']);
    await expect(dialog.locator('.day-cell').nth(0).locator('.current-tag')).toBeVisible();
    await expect(dialog.locator('.day-cell').nth(DAYS.length + 1).locator('.current-tag')).toBeVisible();
    await expect(button(dialog, 'Next')).toBeEnabled();

    await button(dialog, 'Clear').click();
    expect(await picks(dialog, DAYS.length)).toEqual([]);
    await expect(button(dialog, 'Next')).toBeDisabled();
    await expect(dialog.locator('.wizard-footer-hint')).toHaveText('Pick a day for every set (0 of 2 picked)');
    await button(dialog, 'Current days').click();
    expect(await picks(dialog, DAYS.length)).toEqual([
      [0, 0],
      [1, 1],
    ]);
    await button(dialog, 'Auto-pick days').click();
    const auto = await picks(dialog, DAYS.length);
    expect(auto).toHaveLength(2);
    expect(new Set(auto.map(([, column]) => column)).size).toBe(2);
    await expect(button(dialog, 'Next')).toBeEnabled();

    // "N shops" lists the set's retailers.
    await dialog.locator('.set-shops-link').first().click();
    const shopsPopup = page.locator('set-details-dialog');
    await expect(shopsPopup.locator('.details-title')).toHaveText('Set 1');
    await expect(shopsPopup.locator('.details-subtitle')).toHaveText(`${name} · ${sets[0].size} shops`);
    await expect(shopsPopup.locator('.details-item')).toHaveCount(sets[0].size);
    await button(shopsPopup, 'Close').click();
    await expect(shopsPopup).toHaveCount(0);

    // "+N more" lists every company delivering the next day.
    await dialog.locator('.more-link').first().click();
    const details = page.locator('set-details-dialog');
    await expect(details.locator('.details-title')).toHaveText(/^Set \d · \d+ (Mon|Tue|Wed|Thu|Fri|Sat)$/);
    await button(details, 'Close').click();
    await expect(details).toHaveCount(0);

    await dialog.locator('.wizard-header mat-icon', { hasText: 'close' }).click();
    await expect(dialog).toHaveCount(0);
  });

  test('swapping two sets: the schedule says where they came from and the tasks are replaced', async ({ page }) => {
    const name = await fillForm(page, 0, DAYS[0], DAYS[DAYS.length - 1]);
    const dialog = await openDialog(page);
    const sets = await setsOf(dialog);

    // Unchanged: no "Moved from".
    await button(dialog, 'Next').click();
    await expect(dialog.locator('.wizard-step.active')).toContainText('Schedule');
    await expect(dialog.locator('.step-title')).toHaveText('2. Schedule');
    await expect(dialog.locator('.schedule-plan-name')).toContainText(name);
    await expect(dialog.locator('.schedule-card')).toHaveCount(DAYS.length);
    expect(await scheduledCards(dialog)).toEqual([
      { day: dayName(0), set: 1, moved: null },
      { day: dayName(1), set: 2, moved: null },
    ]);
    await button(dialog, 'Back').click();

    // Set 1 takes Thursday (Set 2 loses it), then Set 2 takes Wednesday.
    const cells = dialog.locator('.day-cell');
    await cells.nth(1).click();
    expect(await picks(dialog, DAYS.length)).toEqual([[0, 1]]);
    await expect(dialog.locator('.wizard-footer-hint')).toHaveText('Pick a day for every set (1 of 2 picked)');
    await cells.nth(DAYS.length).click();
    expect(await picks(dialog, DAYS.length)).toEqual([
      [0, 1],
      [1, 0],
    ]);
    await button(dialog, 'Next').click();

    const cards = await scheduledCards(dialog);
    expect(cards).toEqual([
      { day: dayName(0), set: 2, moved: dayName(1) },
      { day: dayName(1), set: 1, moved: dayName(0) },
    ]);
    await expect(dialog.locator('.schedule-card.empty .schedule-set')).toHaveText(['No visit', 'No visit']);

    // "Set N" opens that set's retailers.
    await dialog.locator('a.schedule-set-link').first().click();
    const setPopup = page.locator('set-details-dialog');
    await expect(setPopup.locator('.details-title')).toHaveText(`Set 2 · ${dayName(0)}`);
    await expect(setPopup.locator('.details-subtitle')).toHaveText(`${name} · ${sets[1].size} shops`);
    await button(setPopup, 'Close').click();
    await expect(setPopup).toHaveCount(0);

    await button(dialog, 'Assign schedule').click();
    await expectSwal(page, 'Success!');
    await closeSwal(page, 'Tasks are being rescheduled. Please wait for 5 minutes.');
    await expect(dialog).toHaveCount(0);

    expect(await taskReport(page, name, DAYS[0], DAYS[DAYS.length - 1])).toEqual([
      { date: day(0).ymd, count: sets[1].size },
      { date: day(1).ymd, count: sets[0].size },
    ]);
    // Rescheduled tasks start over as not visited.
    await button(rows(page).first(), 'View Customers').click();
    await waitForLoader(page);
    expect(new Set(await columnTexts(page, 'status'))).toEqual(new Set(['Not Yet Visited']));
  });

  test("each set is an existing day's tasks; assigning the current days changes nothing", async ({ page }) => {
    const { name } = await choosePerson(page, 0);
    const before = await taskReport(page, name, DAYS[0], DAYS[DAYS.length - 1]);
    expect(before.map((r) => r.date)).toEqual([day(0).ymd, day(1).ymd]);

    await open(page, '/reschedule-tasks');
    await fillForm(page, name, DAYS[0], DAYS[DAYS.length - 1]);
    const dialog = await openDialog(page);
    expect((await setsOf(dialog)).map((s) => s.size)).toEqual(before.map((r) => r.count));
    await button(dialog, 'Clear').click();
    await button(dialog, 'Current days').click();
    await button(dialog, 'Next').click();
    await expect(dialog.locator('.schedule-repeat')).toHaveCount(0);
    await button(dialog, 'Assign schedule').click();
    await closeSwal(page, 'Tasks are being rescheduled. Please wait for 5 minutes.');

    expect(await taskReport(page, name, DAYS[0], DAYS[DAYS.length - 1])).toEqual(before);
  });

  test('tasks generated in Planning can be rescheduled; a Sunday set needs a day of its own', async ({ page }) => {
    // Generate a week (Fri 23 to Thu 29, Sunday included) for the first sales person of Planning > Tasks, spread over
    // all seven days.
    const GENERATED = range(2, 8);
    const name = await generateInPlanning(page, GENERATED);

    // Same range: seven sets (one on Sunday) but only six visit days.
    await open(page, '/reschedule-tasks');
    await fillForm(page, name, GENERATED[0], GENERATED[GENERATED.length - 1]);
    let dialog = await openDialog(page);
    await expect(dialog.locator('.set-header')).toHaveCount(7);
    await expect(dialog.locator('.day-header')).toHaveCount(6);
    await expect(dialog.locator('.step-error')).toHaveText(
      '7 sets but only 6 visit days (Sundays are skipped). Close this and pick a wider date range.',
    );
    await expect(button(dialog, 'Auto-pick days')).toBeDisabled();
    await expect(dialog.locator('.wizard-footer-hint')).toHaveText('7 sets but only 6 visit days');
    await dialog.locator('.wizard-header mat-icon', { hasText: 'close' }).click();
    await expect(dialog).toHaveCount(0);

    // One more day gives every set a weekday. The Sunday set starts without one.
    const WIDER = range(2, 9);
    const VISIT = WIDER.filter((offset) => !isSunday(offset));
    await pickDate(page, field(page, 'Select To Date'), WIDER[WIDER.length - 1]);
    dialog = await openDialog(page);
    await expect(dialog.locator('.day-header .day-name')).toHaveText(VISIT.map(dayName));
    const sets = await setsOf(dialog);
    expect(sets.map((s) => s.now)).toEqual(GENERATED.map(dayName));
    const sundaySet = GENERATED.findIndex(isSunday);
    expect((await picks(dialog, VISIT.length)).map(([set]) => set)).not.toContain(sundaySet);
    await expect(dialog.locator('.wizard-footer-hint')).toHaveText('Pick a day for every set (6 of 7 picked)');
    await expect(button(dialog, 'Next')).toBeDisabled();

    await button(dialog, 'Auto-pick days').click();
    await expect(dialog.locator('.day-cell.picked')).toHaveCount(7);
    await button(dialog, 'Next').click();
    const cards = await scheduledCards(dialog);
    expect(cards.map((c) => c.day)).toEqual(VISIT.map(dayName));
    expect(cards.find((c) => c.set === sundaySet + 1)!.moved).toBe(dayName(GENERATED[sundaySet]));

    await button(dialog, 'Assign schedule').click();
    await closeSwal(page, 'Tasks are being rescheduled. Please wait for 5 minutes.');

    // Every set on its new day, nothing left on Sunday.
    const ymd = ymdOf(VISIT);
    const expected = cards
      .map((c) => ({ date: ymd.get(c.day)!, count: sets[c.set - 1].size }))
      .sort((a, b) => a.date.localeCompare(b.date));
    expect(await taskReport(page, name, WIDER[0], WIDER[WIDER.length - 1])).toEqual(expected);
  });
});

/**
 * Planning → Tasks (production flow): every filter, the first sales person of the list, the given days, and a task count
 * that spreads the person's customers over all of them. Returns the sales person's name.
 */
async function generateInPlanning(page: Page, days: number[]): Promise<string> {
  await open(page, '/salesperson-planning');
  await tab(page, 'Tasks').click();
  const tasks = page.locator('sales-person-tasks');
  await waitForLoader(page);
  for (const offset of days) await pickDate(page, 'Select Date', offset, tasks);
  await selectOptions(page, fieldByLabel(tasks, 'Customer Status'), ['Active', 'InActive'], { multiple: true });
  for (const label of ['Business Status', 'Business Type']) {
    const panel = await openSelect(page, fieldByLabel(tasks, label));
    await panel.locator('mat-checkbox', { hasText: 'Select All' }).click();
    await page.keyboard.press('Escape');
    await expect(panel).toHaveCount(0);
  }
  await selectOptions(
    page,
    fieldByLabel(tasks, 'Customer Order Status'),
    ['0-7 Days', '8-30 Days', '31-60 Days', '61-90 Days', '91-365 Days', '365+ Days'],
    { multiple: true },
  );
  const row = rows(tasks).first();
  await row.locator('.cdk-column-checkbox input[type="checkbox"]').check();
  const name = (await row.locator('.cdk-column-Name').innerText()).trim();

  // First preview: how many customers the filters give.
  const preview = page.locator('mat-dialog-container').filter({ has: heading(page, 'View Tasks Preview') });
  await button(tasks, 'Preview').click();
  await waitForLoader(page);
  const customers = Number((await rows(preview).first().locator('.cdk-column-customerCount').innerText()).trim());
  expect(customers).toBeGreaterThan(days.length * 6);
  await preview.locator('mat-icon', { hasText: 'close' }).click();
  await expect(preview).toHaveCount(0);

  // ceil(customers / days) a day fills every day (for more than 6 customers a day) and is exactly enough.
  await row.locator('.cdk-column-Tasks-Count input').fill(String(Math.ceil(customers / days.length)));
  await button(tasks, 'Preview').click();
  await waitForLoader(page);
  await expect(rows(preview).first().locator('.cdk-column-message')).toHaveText('Success');
  await button(preview, 'Generate Tasks').click();
  await closeSwal(page, 'Tasks are being generated. Please wait for 5 minutes.');
  return name;
}
