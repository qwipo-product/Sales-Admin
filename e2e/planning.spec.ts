import type { Locator, Page } from '@playwright/test';
import {
  button,
  cancelSwal,
  closeSwal,
  columnTexts,
  confirmSwal,
  day,
  expect,
  expectSwal,
  fieldByLabel,
  heading,
  mockQuery,
  open,
  reload,
  openSelect,
  pickDate,
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
  await open(page, '/salesperson-planning');
  await expect(tab(page, 'Areas')).toHaveAttribute('aria-selected', 'true');
  await expect(rows(areasTab(page)).first()).toBeVisible();
  await waitForLoader(page);
});

// ------------------------------------------------------------------------------------------------- helpers

function areasTab(page: Page): Locator {
  return page.locator('sales-person-areas');
}

function exact(text: string): RegExp {
  return new RegExp(`^\\s*${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`);
}

function areaRow(page: Page, name: string): Locator {
  return rows(areasTab(page)).filter({ has: page.locator('.cdk-column-name .cell-content', { hasText: exact(name) }) });
}

/** Area names as shown (the cell also holds the "edit" icon, whose ligature text is not part of the name). */
async function areaNames(page: Page): Promise<string[]> {
  return (await areasTab(page).locator('.mat-mdc-row .cdk-column-name .cell-content').allInnerTexts()).map((t) => t.trim());
}

function dialogTitled(page: Page, title: string): Locator {
  return page.locator('mat-dialog-container').filter({ has: heading(page, title) });
}

type Ring = number[][];

/** A square ring ([lng, lat] positions, GeoJSON order) around a centre. */
function square(lat: number, lng: number, half: number): Ring {
  return [
    [lng - half, lat - half],
    [lng + half, lat - half],
    [lng + half, lat + half],
    [lng - half, lat + half],
    [lng - half, lat - half],
  ];
}

/** An in-memory .geojson file for setInputFiles. */
function geoJsonFile(rings: Ring[], name = 'area.geojson') {
  const json = {
    type: 'FeatureCollection',
    features: rings.map((ring) => ({ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [ring] } })),
  };
  return { name, mimeType: 'application/geo+json', buffer: Buffer.from(JSON.stringify(json)) };
}

/** Centre and half-size of a stored area (read from the sample database by its id). */
async function areaGeometry(page: Page, id: string): Promise<{ lat: number; lng: number; half: number; ring: Ring }> {
  return mockQuery(
    page,
    `const c = db.getDoc('SalesPersonClusters', a0).coordinates;
     const lats = c.map((p) => p.latitude), lngs = c.map((p) => p.longitude);
     const lat = (Math.min(...lats) + Math.max(...lats)) / 2, lng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
     return { lat, lng, half: (Math.max(...lats) - Math.min(...lats)) / 2, ring: c.map((p) => [p.longitude, p.latitude]) };`,
    id,
  );
}

async function firstArea(page: Page): Promise<{ id: string; name: string }> {
  const row = rows(areasTab(page)).first();
  return {
    id: (await row.locator('.cdk-column-id').innerText()).trim(),
    name: (await row.locator('.cdk-column-name .cell-content').innerText()).trim(),
  };
}

/**
 * The dialogs read the chosen file with a FileReader; wait until the component has parsed it before pressing the
 * button (uses Angular's dev-mode `ng.getComponent`, falling back to a short pause on a production build).
 */
async function waitForParsedFile(page: Page, selector: string) {
  const hasNg = await page.evaluate(() => !!(window as any).ng?.getComponent);
  if (!hasNg) return page.waitForTimeout(500);
  await expect
    .poll(() => page.evaluate((sel) => !!(window as any).ng.getComponent(document.querySelector(sel))?.jsonGeoData, selector))
    .toBe(true);
}

async function addArea(page: Page, name: string, rings: Ring[] | null, type: 'General' | 'Wholesale' = 'General') {
  await button(areasTab(page), 'Add Area').click();
  const dialog = page.locator('add-area-dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByPlaceholder('Area Name').fill(name);
  await dialog.locator('mat-radio-button', { hasText: type }).click();
  if (rings) {
    await dialog.locator('#fileInput').setInputFiles(geoJsonFile(rings));
    await waitForParsedFile(page, 'add-area-dialog');
  }
  await button(dialog, 'Save').click();
  return dialog;
}

// ------------------------------------------------------------------------------------------------- Areas

test.describe('Planning: Areas', () => {
  test('lists the areas', async ({ page }) => {
    const header = areasTab(page).locator('.mat-mdc-header-row');
    for (const title of ['Id', 'Area Name', 'Type', 'Customer Count', 'Update Polygon', 'Delete', 'Refresh']) {
      await expect(header).toContainText(title);
    }
    const ids = await columnTexts(areasTab(page), 'id');
    expect(ids.length).toBeGreaterThan(20);
    expect(ids.every((id) => /^AREA[A-Za-z0-9]{10}$/.test(id))).toBe(true);
    expect(new Set(await columnTexts(areasTab(page), 'type'))).toEqual(new Set(['General', 'Wholesale']));
  });

  test('renames an area and the mapped sales person follows', async ({ page }) => {
    const [target, other] = await areaNames(page);
    const dialog = dialogTitled(page, 'Update Area Name');
    const input = dialog.getByPlaceholder('Area Name');

    await areaRow(page, target).locator('mat-icon.areacodeeditIcon').click();
    await expect(input).toHaveValue(target);

    await input.fill(other);
    await button(dialog, 'Update').click();
    await expect(dialog.getByText('The name already exists. Please choose a different name.')).toBeVisible();

    await input.fill('Bad@Name');
    await button(dialog, 'Update').click();
    await expect(dialog.getByText(/Name is not Valid/)).toBeVisible();
    await expect(dialog.getByText('The name already exists. Please choose a different name.')).toHaveCount(0);

    await input.fill(target);
    await button(dialog, 'Update').click();
    await expect(dialog).toHaveCount(0);
    await closeSwal(page, 'There Is No Change');

    await areaRow(page, target).locator('mat-icon.areacodeeditIcon').click();
    await input.fill('renamed AREA');
    await button(dialog, 'Update').click();
    await closeSwal(page, 'Area Name Updated Successfully');
    // Stored as "first letter upper case, rest lower case".
    await expect(areaRow(page, 'Renamed area')).toHaveCount(1);
    await expect(areaRow(page, target)).toHaveCount(0);

    await tab(page, 'Sales Person').click();
    await waitForLoader(page);
    const mapping = page.locator('sales-person-mapping');
    await expect(rows(mapping).filter({ has: page.locator('.cdk-column-Area-Name', { hasText: exact('Renamed area') }) })).toHaveCount(1);
  });

  test('adds an area from a GeoJSON file', async ({ page }) => {
    const before = await rows(areasTab(page)).count();

    // Validation inside the dialog.
    await button(areasTab(page), 'Add Area').click();
    const dialog = page.locator('add-area-dialog');
    await button(dialog, 'Save').click();
    await closeSwal(page, 'Please add the Area Name!');
    await dialog.locator('#fileInput').setInputFiles({ name: 'area.txt', mimeType: 'text/plain', buffer: Buffer.from('x') });
    await closeSwal(page, 'Invalid File Format!!');
    const existing = (await areaNames(page))[0];
    await dialog.getByPlaceholder('Area Name').fill(existing);
    await button(dialog, 'Save').click();
    await expect(dialog.getByText('The name already exists. Please choose a different name.')).toBeVisible();
    await dialog.getByPlaceholder('Area Name').fill('Two Polygons');
    await dialog.locator('#fileInput').setInputFiles(geoJsonFile([square(17.7, 78.7, 0.002), square(17.71, 78.71, 0.002)]));
    await waitForParsedFile(page, 'add-area-dialog');
    await button(dialog, 'Save').click();
    await expect(dialog.getByText('Upload Only one geo Polygon At a time.')).toBeVisible();
    await dialog.locator('mat-icon', { hasText: 'close' }).click();
    await expect(dialog).toHaveCount(0);

    // A polygon away from every other area.
    await addArea(page, 'e2e new area', [square(17.7, 78.7, 0.004)]);
    await closeSwal(page, 'Added Cluster Successfully');
    await expect(rows(areasTab(page))).toHaveCount(before + 1);
    const row = areaRow(page, 'E2e new area');
    await expect(row.locator('.cdk-column-type')).toHaveText('General');
    await expect(row.locator('.cdk-column-customerCount')).toHaveText('0');
    const id = (await row.locator('.cdk-column-id').innerText()).trim();
    const stored = await areaGeometry(page, id);
    expect(stored.lat).toBeCloseTo(17.7, 6);
    expect(stored.lng).toBeCloseTo(78.7, 6);

    await reload(page);
    await expect(areaRow(page, 'E2e new area')).toHaveCount(1);
  });

  test('rejects an area that overlaps, or lies inside, an area of the same type', async ({ page }) => {
    const before = await rows(areasTab(page)).count();
    const area = await firstArea(page);
    const type = (await areaRow(page, area.name).locator('.cdk-column-type').innerText()).trim() as 'General' | 'Wholesale';
    const { lat, lng, half } = await areaGeometry(page, area.id);

    // Partly overlapping.
    let dialog = await addArea(page, 'Overlapping area', [square(lat + half, lng + half, half)], type);
    await expect(dialog).toHaveCount(0);
    await expectSwal(page, `${area.name} Areas Coordinates Matching with Overlapping area`);
    await closeSwal(page);

    // Completely inside (production accepted this one).
    dialog = await addArea(page, 'Nested area', [square(lat, lng, half / 3)], type);
    await expectSwal(page, `${area.name} Areas Coordinates Matching with Nested area`);
    await closeSwal(page);
    await expect(rows(areasTab(page))).toHaveCount(before);

    // The overlap check is per type: the same polygon is fine for the other type.
    const otherType = type === 'General' ? 'Wholesale' : 'General';
    await addArea(page, 'Other type area', [square(lat, lng, half / 3)], otherType);
    await closeSwal(page, 'Added Cluster Successfully');
    await expect(areaRow(page, 'Other type area').locator('.cdk-column-type')).toHaveText(otherType);
  });

  test('updates an area polygon', async ({ page }) => {
    const area = await firstArea(page);
    const { ring } = await areaGeometry(page, area.id);
    const dialog = dialogTitled(page, 'Upload JSON');

    // The same polygon is not an update.
    await button(areaRow(page, area.name), 'cloud_upload').click();
    await dialog.locator('#fileInput').setInputFiles(geoJsonFile([ring]));
    await waitForParsedFile(page, 'app-update-coordinates-dialog, update-coordinates-dialog');
    await button(dialog, 'Upload Coordinates').click();
    await closeSwal(page, 'No Coordinates are found updated');

    // A slightly moved copy overlaps the area's own old shape and is accepted.
    const moved = ring.map(([x, y]) => [x + 0.0002, y + 0.0002]);
    await button(areaRow(page, area.name), 'cloud_upload').click();
    await dialog.locator('#fileInput').setInputFiles(geoJsonFile([moved]));
    await waitForParsedFile(page, 'app-update-coordinates-dialog, update-coordinates-dialog');
    await button(dialog, 'Upload Coordinates').click();
    await closeSwal(page, 'Json Uploaded Successfully');
    const stored = await areaGeometry(page, area.id);
    expect(stored.ring[0][0]).toBeCloseTo(moved[0][0], 6);
    expect(stored.ring[0][1]).toBeCloseTo(moved[0][1], 6);
  });

  test('deletes an area after confirmation', async ({ page }) => {
    const before = await rows(areasTab(page)).count();
    const area = await firstArea(page);
    const deleteButton = () => areaRow(page, area.name).locator('.cdk-column-delete button');

    await deleteButton().click();
    await cancelSwal(page, 'Do you want to Delete?');
    await expect(rows(areasTab(page))).toHaveCount(before);

    await deleteButton().click();
    await confirmSwal(page, 'Do you want to Delete?');
    await closeSwal(page, 'Deleted Cluster Successfully');
    await expect(rows(areasTab(page))).toHaveCount(before - 1);
    await expect(areaRow(page, area.name)).toHaveCount(0);

    await reload(page);
    await expect(rows(areasTab(page))).toHaveCount(before - 1);
    await expect(areaRow(page, area.name)).toHaveCount(0);
  });

  test("Refresh recounts an area's customers with a single success alert", async ({ page }) => {
    const area = await firstArea(page);
    await areaRow(page, area.name).locator('.cdk-column-refresh button').click();
    await closeSwal(page, 'Cluster customers refreshed successfully!');
    // Production showed the success alert twice.
    await page.waitForTimeout(1_000);
    await expect(swal(page)).toHaveCount(0);
    await waitForLoader(page);
    await expect(areaRow(page, area.name).locator('.cdk-column-customerCount')).toHaveText(/^\s*\d+\s*$/);
  });

  test('Sync All Areas queues a refresh', async ({ page }) => {
    await button(areasTab(page), 'Sync All Areas').click();
    await closeSwal(page, 'Cluster customers refresh is in progress please wait for 10 to 15 minutes!');
    await waitForLoader(page);
  });
});

// ------------------------------------------------------------------------------------------------- Sales Person

test.describe('Planning: Sales Person', () => {
  function mappingTab(page: Page): Locator {
    return page.locator('sales-person-mapping');
  }

  function personRow(page: Page, name: string): Locator {
    return rows(mappingTab(page)).filter({ has: page.locator('.cdk-column-Name', { hasText: exact(name) }) });
  }

  async function show(page: Page, option: 'Active' | 'In-Active') {
    const select = mappingTab(page).locator('mat-select').first();
    const panel = await openSelect(page, select);
    await panel.locator('mat-option', { hasText: exact(option) }).click();
    await expect(panel).toHaveCount(0);
  }

  async function cell(row: Locator, column: string) {
    return (await row.locator(`.cdk-column-${column}`).innerText()).trim();
  }

  test.beforeEach(async ({ page }) => {
    await tab(page, 'Sales Person').click();
    await expect(mappingTab(page)).toBeVisible();
    await waitForLoader(page);
    await expect(rows(mappingTab(page)).first()).toBeVisible();
  });

  test('activates an inactive sales person', async ({ page }) => {
    await show(page, 'In-Active');
    const inactive = await columnTexts(mappingTab(page), 'Name');
    expect(inactive.length).toBeGreaterThan(0);
    const name = inactive[0];
    await expect(button(personRow(page, name), 'ADD')).toBeDisabled();

    await button(personRow(page, name), 'Activate').click();
    await expectSwal(page, 'Activate Sales Person');
    await confirmSwal(page, 'Do you want to activate this Sales Person?');
    await closeSwal(page, 'Sales Person Activated successfully.');
    await expect(personRow(page, name)).toHaveCount(0);

    await show(page, 'Active');
    await expect(button(personRow(page, name), 'Deactivate')).toBeVisible();
    await expect(button(personRow(page, name), 'ADD')).toBeEnabled();
  });

  test('deactivating a mapped sales person unmaps the area; the area can then be mapped to someone else', async ({ page }) => {
    const mapped = rows(mappingTab(page)).filter({ has: button(page, 'EDIT') }).first();
    const name = await cell(mapped, 'Name');
    const area = await cell(mapped, 'Area-Name');

    await button(personRow(page, name), 'Deactivate').click();
    await expectSwal(page, 'Deactivate Sales Person');
    await confirmSwal(page, `Deactivating the Sales Person will also unmap the current area ${area}. Are you sure?`);
    await closeSwal(page, 'Sales Person Deactivated successfully.');
    await expect(personRow(page, name)).toHaveCount(0);

    await show(page, 'In-Active');
    await expect(personRow(page, name).locator('.cdk-column-Area-Name')).toHaveText('');
    await expect(personRow(page, name).locator('.cdk-column-Customer-Count')).toHaveText('0');

    // The freed area goes to an active sales person without one: a plain first mapping.
    await show(page, 'Active');
    const unmapped = rows(mappingTab(page)).filter({ has: button(page, 'ADD') }).first();
    const newOwner = await cell(unmapped, 'Name');
    await button(unmapped, 'ADD').click();
    const dialog = dialogTitled(page, 'Select Area');
    await expect(dialog).toBeVisible();
    await waitForLoader(page);
    await button(dialog, 'Submit').click();
    await closeSwal(page, 'Please Select the Area!');

    await selectOptions(page, fieldByLabel(dialog, 'Select Clustered Area'), [area]);
    await button(dialog, 'Submit').click();
    await expectSwal(page, 'Info');
    await confirmSwal(page, `Do you want to map the ${area} area to the Sales Person ${newOwner} ?`);
    await closeSwal(page, `Salesperson ${newOwner} has been successfully mapped.`);
    await expect(dialog).toHaveCount(0);
    await waitForLoader(page);
    await expect(personRow(page, newOwner).locator('.cdk-column-Area-Name')).toHaveText(area);
    await expect(button(personRow(page, newOwner), 'EDIT')).toBeVisible();
  });

  test('mapping an area that is already tagged warns and moves it', async ({ page }) => {
    const unmapped = rows(mappingTab(page)).filter({ has: button(page, 'ADD') }).first();
    const name = await cell(unmapped, 'Name');
    const tagged = rows(mappingTab(page)).filter({ has: button(page, 'EDIT') }).first();
    const previousOwner = await cell(tagged, 'Name');
    const area = await cell(tagged, 'Area-Name');

    await button(unmapped, 'ADD').click();
    const dialog = dialogTitled(page, 'Select Area');
    await waitForLoader(page);
    await selectOptions(page, fieldByLabel(dialog, 'Select Clustered Area'), [area]);
    await button(dialog, 'Submit').click();
    await expectSwal(page, 'Warning');
    await confirmSwal(page, `Salesperson ${previousOwner} is already tagged with the area ${area}. Changing the area will unmap them.`);
    await closeSwal(page, `Salesperson ${name} has been successfully mapped.`);
    await waitForLoader(page);

    await expect(personRow(page, name).locator('.cdk-column-Area-Name')).toHaveText(area);
    await expect(personRow(page, previousOwner).locator('.cdk-column-Area-Name')).toHaveText('');
    await expect(button(personRow(page, previousOwner), 'ADD')).toBeVisible();
  });

  test('EDIT shows the current area; submitting it unchanged just closes', async ({ page }) => {
    const mapped = rows(mappingTab(page)).filter({ has: button(page, 'EDIT') }).first();
    const area = await cell(mapped, 'Area-Name');
    await button(mapped, 'EDIT').click();
    const dialog = dialogTitled(page, 'Select Area');
    await waitForLoader(page);
    await expect(fieldByLabel(dialog, 'Select Clustered Area').locator('.mat-mdc-select-value')).toHaveText(area);
    await button(dialog, 'Submit').click();
    await expect(dialog).toHaveCount(0);
    await expect(swal(page)).toHaveCount(0);
  });
});

// ------------------------------------------------------------------------------------------------- Tasks

test.describe('Planning: Tasks', () => {
  const ORDER_STATUSES = ['0-7 Days', '8-30 Days', '31-60 Days', '61-90 Days', '91-365 Days', '365+ Days'];

  function tasksTab(page: Page): Locator {
    return page.locator('sales-person-tasks');
  }

  /** Picks the `index`-th sales person (single select: the panel closes on the click); returns what the card shows. */
  async function choosePerson(page: Page, index = 0): Promise<{ name: string; area: string; customers: string }> {
    const panel = await openSelect(page, fieldByLabel(tasksTab(page), 'Sales Person'));
    await expect(panel.locator('.select-all-row')).toHaveCount(0);
    const option = panel.locator('mat-option.sales-person-option').nth(index);
    const name = (await option.locator('.sp-name').innerText()).trim();
    const area = (await option.locator('.sp-area span').innerText()).trim();
    const customers = (await option.locator('.sp-stat', { hasText: 'Customers' }).locator('.sp-stat-value').innerText()).trim();
    await option.click();
    await expect(panel).toHaveCount(0);
    return { name, area, customers };
  }

  async function pickSalesPerson(page: Page): Promise<string> {
    return (await choosePerson(page)).name;
  }

  async function selectAllIn(page: Page, label: string, selectAll: string) {
    const panel = await openSelect(page, fieldByLabel(tasksTab(page), label));
    await panel.locator(selectAll).first().click();
    await page.keyboard.press('Escape');
    await expect(panel).toHaveCount(0);
  }

  /** Fills every filter for one sales person and the given day range; returns the sales person's name. */
  async function fillFilters(page: Page, from: number, to: number): Promise<string> {
    const name = await pickSalesPerson(page);
    await pickDate(page, fieldByLabel(tasksTab(page), 'Select From Date'), from);
    await pickDate(page, fieldByLabel(tasksTab(page), 'Select To Date'), to);
    await selectOptions(page, fieldByLabel(tasksTab(page), 'Customer Status'), ['Active', 'InActive'], { multiple: true });
    await selectAllIn(page, 'Business Status', 'mat-checkbox');
    await selectAllIn(page, 'Business Type', 'mat-checkbox');
    await selectOptions(page, fieldByLabel(tasksTab(page), 'Customer Order Status'), ORDER_STATUSES, { multiple: true });
    await selectAllIn(page, 'Company', '.select-all-row');
    return name;
  }

  /** "23 Fri": the day labels of the Generate Tasks dialog (format 'd EEE'). */
  function dayName(offset: number): string {
    const date = day(offset).date;
    return `${date.getUTCDate()} ${date.toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'short' })}`;
  }

  // The tests plan 23–29 October 2026 (+2 … +8), clear of the seeded tasks. Sunday the 25th is never a visit day.
  const RANGE = [2, 3, 4, 5, 6, 7, 8];
  const VISIT_DAYS = RANGE.filter((offset) => !dayName(offset).endsWith('Sun'));

  async function openGenerate(page: Page): Promise<Locator> {
    await button(tasksTab(page), 'Generate').click();
    await waitForLoader(page);
    const dialog = page.locator('generate-tasks-dialog');
    await expect(heading(dialog, 'Generate Tasks')).toBeVisible();
    return dialog;
  }

  function planCard(dialog: Locator, name: string): Locator {
    return dialog.locator('.plan-card', { has: dialog.page().locator('.plan-name', { hasText: exact(name) }) });
  }

  /** The sales person's shop total, from "6 sets × 35 = 210 places for 172 shops" / "… = 60 of 172 shops". */
  async function shopCount(card: Locator): Promise<number> {
    const text = await card.locator('.metric-main').innerText();
    const match = text.match(/(?:of|for) (\d+) shops/);
    expect(match, `shop total in "${text}"`).toBeTruthy();
    return Number(match![1]);
  }

  test.beforeEach(async ({ page }) => {
    await tab(page, 'Tasks').click();
    await expect(tasksTab(page)).toBeVisible();
    await waitForLoader(page);
  });

  test('the filters appear one after another; Generate shows once all of them have a value', async ({ page }) => {
    const tasks = tasksTab(page);
    const field = (label: string) => fieldByLabel(tasks, label);
    const generate = button(tasks, 'Generate');
    const later = ['Select From Date', 'Select To Date', 'Customer Status', 'Business Status', 'Business Type', 'Customer Order Status', 'Company'];
    for (const label of later) await expect(field(label)).toHaveCount(0);
    await expect(generate).toHaveCount(0);

    // Sales person (single select: picking another replaces the first).
    const salesPerson = field('Sales Person');
    await expect(salesPerson.locator('mat-hint')).toHaveText('Select a sales person to choose the other filters');
    const first = await choosePerson(page, 0);
    await expect(salesPerson.locator('.mat-mdc-select-value')).toHaveText(first.name);
    await expect(salesPerson.locator('mat-hint')).toHaveText(`${first.area} · ${first.customers} customers`);
    const second = await choosePerson(page, 1);
    await expect(salesPerson.locator('.mat-mdc-select-value')).toHaveText(second.name);
    await expect(salesPerson.locator('mat-hint')).toHaveText(`${second.area} · ${second.customers} customers`);

    // Dates: a day before today can't be picked.
    await expect(field('Select From Date')).toBeVisible();
    await expect(field('Select To Date')).toBeVisible();
    await expect(field('Customer Status')).toHaveCount(0);
    await field('Select From Date').locator('mat-datepicker-toggle button').click();
    await expect(page.locator(`.mat-calendar-body-cell[aria-label="${day(-1).label}"]`)).toHaveAttribute('aria-disabled', 'true');
    await page.keyboard.press('Escape');
    await pickDate(page, field('Select From Date'), RANGE[0]);
    await expect(field('Customer Status')).toHaveCount(0);
    await pickDate(page, field('Select To Date'), RANGE[RANGE.length - 1]);

    // Each customer filter unlocks the next one.
    await selectOptions(page, field('Customer Status'), ['Active', 'InActive'], { multiple: true });
    await expect(field('Business Type')).toHaveCount(0);
    await selectAllIn(page, 'Business Status', 'mat-checkbox');
    await expect(field('Customer Order Status')).toHaveCount(0);
    await selectAllIn(page, 'Business Type', 'mat-checkbox');
    await expect(tasks.locator('.company-loader')).toHaveCount(0);
    await selectOptions(page, field('Customer Order Status'), ORDER_STATUSES, { multiple: true });

    // The company shares load for these filters, then the Company field appears.
    await expect(tasks.locator('.company-loader')).toContainText('Loading companies');
    await expect(field('Company')).toBeVisible();
    await expect(tasks.locator('.company-loader')).toHaveCount(0);
    await expect(generate).toHaveCount(0);
    const panel = await openSelect(page, field('Company'));
    await expect(panel.locator('mat-option.company-option').first()).toContainText(/\d+% of shops/);
    await expect(panel.locator('.company-dot')).toHaveCount(0);
    await page.keyboard.press('Escape');
    await selectAllIn(page, 'Company', '.select-all-row');
    await expect(generate).toBeVisible();

    // Clearing a filter hides the later ones; their values come back with it (the companies reload).
    await selectAllIn(page, 'Business Type', 'mat-checkbox');
    await expect(field('Customer Order Status')).toHaveCount(0);
    await expect(field('Company')).toHaveCount(0);
    await expect(generate).toHaveCount(0);
    await selectAllIn(page, 'Business Type', 'mat-checkbox');
    await expect(field('Customer Order Status')).toBeVisible();
    await expect(field('Company')).toBeVisible();
    await expect(generate).toBeVisible();
  });

  test('Generate step 1 (Sets): shop maths, shops left out and a suggested set size', async ({ page }) => {
    const name = await fillFilters(page, RANGE[0], RANGE[RANGE.length - 1]);
    await expect(fieldByLabel(tasksTab(page), 'Select To Date')).toContainText(`${RANGE.length} days`);
    const dialog = await openGenerate(page);
    await expect(dialog.locator('.wizard-step')).toHaveText([/Sets/, /Pick days/, /Schedule/]);
    await expect(dialog.locator('.wizard-step.active')).toContainText('Sets');
    await expect(dialog.locator('mat-progress-bar')).toHaveAttribute('aria-valuenow', /^33(\.\d+)?$/);

    const card = planCard(dialog, name);
    const shops = await shopCount(card);
    expect(shops).toBeGreaterThan(VISIT_DAYS.length * 10);
    const sets = card.locator('input[id^="sets-"]');
    const perSet = card.locator('input[id^="per-set-"]');
    // Defaults: one set per visit day, 35 retailers per set (production's tasks per day).
    await expect(sets).toHaveValue(String(VISIT_DAYS.length));
    await expect(perSet).toHaveValue('35');

    await perSet.fill('10');
    const metrics = card.locator('.plan-metrics');
    await expect(metrics).toContainText(`${VISIT_DAYS.length} sets × 10 = ${VISIT_DAYS.length * 10} of ${shops} shops`);
    await expect(metrics.locator('.metric-warn')).toHaveText(`${shops - VISIT_DAYS.length * 10} left out this week`);
    const suggested = Math.ceil(shops / VISIT_DAYS.length);
    await expect(metrics.locator('.metric-link')).toHaveText(`Use ${suggested} per set`);
    await metrics.locator('.metric-link').click();
    await expect(perSet).toHaveValue(String(suggested));
    await expect(metrics.locator('.metric-ok')).toHaveText('All shops covered');

    // More sets than visit days is not allowed.
    await sets.fill(String(VISIT_DAYS.length + 1));
    await expect(card.getByText(`Enter 1 to ${VISIT_DAYS.length} sets and at least 1 retailer per set.`)).toBeVisible();
    await expect(button(dialog, 'Next')).toBeDisabled();
    await expect(dialog.locator('.wizard-footer-hint')).toHaveText('Check the number of sets and retailers per set');
    await sets.fill('2');
    await expect(button(dialog, 'Next')).toBeEnabled();

    await dialog.locator('.wizard-header mat-icon', { hasText: 'close' }).click();
    await expect(dialog).toHaveCount(0);
  });

  test('Generate: pick a day per set, assign the schedule, and see it in the Task Report', async ({ page }) => {
    const name = await fillFilters(page, RANGE[0], RANGE[RANGE.length - 1]);
    const dialog = await openGenerate(page);

    // 1. Sets: one sales person per generation; three sets that hold every shop.
    await expect(dialog.locator('.plan-card')).toHaveCount(1);
    const card = planCard(dialog, name);
    const shops = await shopCount(card);
    await card.locator('input[id^="sets-"]').fill('3');
    await card.locator('input[id^="per-set-"]').fill(String(Math.ceil(shops / 3)));
    await expect(card.locator('.metric-ok')).toHaveText('All shops covered');
    await button(dialog, 'Next').click();

    // 2. Pick days: one column per visit day (no Sunday), one row per set.
    await expect(dialog.locator('.wizard-step.active')).toContainText('Pick days');
    await expect(dialog.locator('.day-header .day-name')).toHaveText(VISIT_DAYS.map(dayName));
    await expect(dialog.locator('.day-header .day-delivery').first()).toHaveText(`Delivery ${dayName(VISIT_DAYS[0] + 1)}`);
    await expect(dialog.locator('.set-header .set-name')).toHaveText(['Set 1', 'Set 2', 'Set 3']);
    await expect(dialog.locator('.plan-pill')).toHaveCount(0);
    await expect(button(dialog, 'Auto-pick for all sales persons')).toHaveCount(0);
    const setSizes = (await dialog.locator('.set-shops-link').allInnerTexts()).map((t) => parseInt(t, 10));
    expect(setSizes.reduce((a, b) => a + b, 0)).toBe(shops);
    const cells = dialog.locator('.day-cell');
    await expect(cells).toHaveCount(3 * VISIT_DAYS.length);
    await expect(button(dialog, 'Next')).toBeDisabled();
    await expect(dialog.locator('.wizard-footer-hint')).toHaveText('Pick a day for every set (0 of 3 picked)');

    // "N shops" lists the set's retailers with their companies.
    await dialog.locator('.set-shops-link').first().click();
    const shopsPopup = page.locator('set-details-dialog');
    await expect(shopsPopup.locator('.details-title')).toHaveText('Set 1');
    await expect(shopsPopup.locator('.details-subtitle')).toHaveText(`${name} · ${setSizes[0]} shops`);
    await expect(shopsPopup.locator('.details-item')).toHaveCount(setSizes[0]);
    await expect(shopsPopup.locator('.details-value').first()).toHaveText(/^\d+ compan(y|ies)$/);
    await button(shopsPopup, 'Close').click();
    await expect(shopsPopup).toHaveCount(0);

    // A click picks a day; a day holds one set, so picking it for another set moves it.
    await cells.nth(0).click();
    await expect(cells.nth(0)).toHaveClass(/\bpicked\b/);
    await cells.nth(VISIT_DAYS.length).click();
    await expect(cells.nth(VISIT_DAYS.length)).toHaveClass(/\bpicked\b/);
    await expect(cells.nth(0)).not.toHaveClass(/\bpicked\b/);
    await expect(dialog.locator('.day-cell.picked')).toHaveCount(1);
    await button(dialog, 'Clear').click();
    await expect(dialog.locator('.day-cell.picked')).toHaveCount(0);

    // "+N more" lists every brand delivering the next day.
    await dialog.locator('.more-link').first().click();
    const details = page.locator('set-details-dialog');
    await expect(details.locator('.details-title')).toHaveText(/^Set \d · \d+ (Mon|Tue|Wed|Thu|Fri|Sat)$/);
    await expect(details.locator('.details-item').first()).toBeVisible();
    await button(details, 'Close').click();
    await expect(details).toHaveCount(0);

    await button(dialog, 'Auto-pick days').click();
    await expect(dialog.locator('.day-cell.picked')).toHaveCount(3);
    const pickedColumns = await cells.evaluateAll(
      (els, columns) => els.map((el, i) => (el.classList.contains('picked') ? i % columns : -1)).filter((c) => c >= 0),
      VISIT_DAYS.length,
    );
    expect(new Set(pickedColumns).size).toBe(3);
    await expect(button(dialog, 'Next')).toBeEnabled();
    await button(dialog, 'Next').click();

    // 3. Schedule: the sales person's line and one card per visit day, three of them with a set.
    await expect(dialog.locator('.wizard-step.active')).toContainText('Schedule');
    await expect(dialog.locator('.schedule-plan')).toHaveCount(1);
    await expect(dialog.locator('.schedule-plan-name')).toContainText(name);
    await expect(dialog.locator('.schedule-card')).toHaveCount(VISIT_DAYS.length);
    await expect(dialog.locator('.schedule-card.empty .schedule-set')).toHaveText(Array(VISIT_DAYS.length - 3).fill('No visit'));
    const visits = await dialog.locator('.schedule-card:not(.empty)').evaluateAll((els) =>
      els.map((el) => ({
        day: el.querySelector('.schedule-day')!.textContent!.trim(),
        set: Number(el.querySelector('.schedule-set')!.textContent!.trim().replace('Set ', '')),
        size: Number(el.querySelector('.schedule-shops')!.textContent!.match(/of (\d+) shops/)![1]),
      })),
    );
    expect(visits.map((v) => v.set).sort()).toEqual([1, 2, 3]);
    visits.forEach((v) => expect(v.size).toBe(setSizes[v.set - 1]));
    expect(VISIT_DAYS.map(dayName)).toEqual(expect.arrayContaining(visits.map((v) => v.day)));

    // "Set N" opens that day's retailers.
    await dialog.locator('a.schedule-set-link').first().click();
    const setPopup = page.locator('set-details-dialog');
    await expect(setPopup.locator('.details-title')).toHaveText(`Set ${visits[0].set} · ${visits[0].day}`);
    await expect(setPopup.locator('.details-subtitle')).toHaveText(`${name} · ${visits[0].size} shops`);
    await expect(setPopup.locator('.details-item')).toHaveCount(visits[0].size);
    await button(setPopup, 'Close').click();
    await expect(setPopup).toHaveCount(0);

    await button(dialog, 'Assign schedule').click();
    await expectSwal(page, 'Success!');
    await closeSwal(page, 'Tasks are being generated. Please wait for 5 minutes.');
    await expect(dialog).toHaveCount(0);

    // Task Report: one row per visit date, each with its set's shops.
    const offsetOf = new Map(VISIT_DAYS.map((offset) => [dayName(offset), offset]));
    const expected = visits
      .map((v) => ({ date: day(offsetOf.get(v.day)!).ymd, count: setSizes[v.set - 1] }))
      .sort((a, b) => a.date.localeCompare(b.date));

    await open(page, '/task-report');
    await pickDate(page, 'Start Date', RANGE[0]);
    await pickDate(page, 'End Date', RANGE[RANGE.length - 1]);
    await selectOptions(page, fieldByLabel(page, 'Sales Person'), [name], { multiple: true });
    await button(page, 'Search').click();
    await waitForLoader(page);
    const reported = await rows(page).evaluateAll((els) =>
      els.map((el) => ({
        date: el.querySelector('.cdk-column-date')!.textContent!.trim(),
        count: Number(el.querySelector('.cdk-column-customerCount')!.textContent!.trim()),
      })),
    );
    expect(reported.sort((a, b) => a.date.localeCompare(b.date))).toEqual(expected);
    expect(new Set(await columnTexts(page, 'salesPersonName'))).toEqual(new Set([name]));

    await button(rows(page).first(), 'View Customers').click();
    await waitForLoader(page);
    await expect(page.locator('.mat-mdc-paginator-range-label')).toHaveText(new RegExp(` of \\d+\\s*$`));
    expect(new Set(await columnTexts(page, 'status'))).toEqual(new Set(['Not Yet Visited']));
  });
});
