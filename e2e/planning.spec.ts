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

  function salesPersonRows(page: Page): Locator {
    return rows(tasksTab(page));
  }

  function rowCheckbox(row: Locator): Locator {
    return row.locator('.cdk-column-checkbox input[type="checkbox"]');
  }

  function headerCheckbox(page: Page): Locator {
    return tasksTab(page).locator('.mat-mdc-header-row .cdk-column-checkbox input[type="checkbox"]');
  }

  async function selectAllIn(page: Page, label: string) {
    const panel = await openSelect(page, fieldByLabel(tasksTab(page), label));
    await panel.locator('mat-checkbox', { hasText: 'Select All' }).click();
    await page.keyboard.press('Escape');
    await expect(panel).toHaveCount(0);
  }

  async function preview(page: Page) {
    await button(tasksTab(page), 'Preview').click();
  }

  /** Every filter set for the first sales person of the list and the given days; returns that sales person's name. */
  async function fillFilters(page: Page, days: number[]): Promise<string> {
    for (const offset of days) await pickDate(page, 'Select Date', offset, tasksTab(page));
    await selectOptions(page, fieldByLabel(tasksTab(page), 'Customer Status'), ['Active', 'InActive'], { multiple: true });
    await selectAllIn(page, 'Business Status');
    await selectAllIn(page, 'Business Type');
    await selectOptions(page, fieldByLabel(tasksTab(page), 'Customer Order Status'), ORDER_STATUSES, { multiple: true });
    const row = salesPersonRows(page).first();
    await rowCheckbox(row).check();
    return (await row.locator('.cdk-column-Name').innerText()).trim();
  }

  async function openPreview(page: Page): Promise<Locator> {
    await preview(page);
    await waitForLoader(page);
    const dialog = dialogTitled(page, 'View Tasks Preview');
    await expect(dialog).toBeVisible();
    return dialog;
  }

  test.beforeEach(async ({ page }) => {
    await tab(page, 'Tasks').click();
    await expect(tasksTab(page)).toBeVisible();
    await waitForLoader(page);
    await expect(salesPersonRows(page).first()).toBeVisible();
  });

  test('lists the sales persons with an area, at 35 tasks a day', async ({ page }) => {
    await expect(heading(tasksTab(page), 'Filter by')).toBeVisible();
    await expect(heading(tasksTab(page), 'Sales Person List')).toBeVisible();
    const areas = await columnTexts(tasksTab(page), 'Area-Name');
    expect(areas.length).toBeGreaterThan(20);
    expect(areas.every((a) => a.length > 0)).toBe(true);
    const counts = await tasksTab(page).locator('.mat-mdc-row .cdk-column-Tasks-Count input').evaluateAll((els) =>
      els.map((el) => (el as HTMLInputElement).value),
    );
    expect(new Set(counts)).toEqual(new Set(['35']));
  });

  test('Preview names the first missing filter', async ({ page }) => {
    const expectWarning = async (text: string) => {
      await preview(page);
      await closeSwal(page, text);
    };
    await expectWarning('Please select the Business Status');
    await selectAllIn(page, 'Business Status');
    await expectWarning('Please select the SalesPerson');
    await rowCheckbox(salesPersonRows(page).first()).check();
    await expectWarning('Please select the Business Type');
    await selectAllIn(page, 'Business Type');
    await expectWarning('Please select the Customer Order Status');
    await selectOptions(page, fieldByLabel(tasksTab(page), 'Customer Order Status'), ORDER_STATUSES, { multiple: true });
    await expectWarning('Please select the Date');
    await pickDate(page, 'Select Date', 2, tasksTab(page));
    await salesPersonRows(page).first().locator('.cdk-column-Tasks-Count input').fill('0');
    await expectWarning('Please Enter Tasks');
  });

  test('the header checkbox follows the rows, and a day is listed once', async ({ page }) => {
    const first = rowCheckbox(salesPersonRows(page).first());
    // Ticking one row of many leaves the header unticked (production ticked it).
    await first.check();
    await expect(headerCheckbox(page)).not.toBeChecked();
    await first.uncheck();
    await headerCheckbox(page).check();
    const all = tasksTab(page).locator('.mat-mdc-row .cdk-column-checkbox input[type="checkbox"]');
    expect(await all.evaluateAll((els) => els.every((el) => (el as HTMLInputElement).checked))).toBe(true);
    await headerCheckbox(page).uncheck();
    expect(await all.evaluateAll((els) => els.some((el) => (el as HTMLInputElement).checked))).toBe(false);

    // Picking the same day twice gives one chip (production added it twice).
    const chips = tasksTab(page).locator('.datespan');
    await pickDate(page, 'Select Date', 2, tasksTab(page));
    await pickDate(page, 'Select Date', 2, tasksTab(page));
    await expect(chips).toHaveText([day(2).ymd + 'close']);
    await pickDate(page, 'Select Date', 3, tasksTab(page));
    await expect(chips).toHaveCount(2);
    await chips.first().locator('mat-icon', { hasText: 'close' }).click();
    await expect(chips).toHaveText([day(3).ymd + 'close']);
  });

  test('blocks generation when one day cannot cover the customers', async ({ page }) => {
    const name = await fillFilters(page, [2]);
    const dialog = await openPreview(page);
    const row = rows(dialog).filter({ hasText: name });
    await expect(row).toHaveCount(1);
    const customers = Number((await row.locator('.cdk-column-customerCount').innerText()).trim());
    expect(customers).toBeGreaterThan(35);
    await expect(row.locator('.cdk-column-selectedDaysCount')).toHaveText('1');
    await expect(row.locator('.cdk-column-taskCount')).toHaveText('35');
    await expect(row.locator('.cdk-column-expectedTaskCount')).toHaveText(String(customers));
    await expect(row.locator('.cdk-column-message')).toHaveText('Insufficient task assignments for selected dates.');

    await button(dialog, 'Generate Tasks').click();
    await closeSwal(page, 'There is a shortage of tasks that need assignment.');
    await expect(dialog).toBeVisible();
    await dialog.locator('mat-icon', { hasText: 'close' }).click();
    await expect(dialog).toHaveCount(0);
  });

  test('generates tasks that then appear in the Task Report', async ({ page }) => {
    // Seven days of 35 tasks cover any area of the sample data.
    const days = [2, 3, 4, 5, 6, 7, 8];
    const name = await fillFilters(page, days);
    await expect(tasksTab(page).locator('.datespan')).toHaveCount(days.length);
    const dialog = await openPreview(page);
    const row = rows(dialog).filter({ hasText: name });
    const customers = Number((await row.locator('.cdk-column-customerCount').innerText()).trim());
    expect(customers).toBeGreaterThan(0);
    await expect(row.locator('.cdk-column-selectedDaysCount')).toHaveText(String(days.length));
    await expect(row.locator('.cdk-column-expectedTaskCount')).toHaveText(String(Math.ceil(customers / days.length)));
    await expect(row.locator('.cdk-column-message')).toHaveText(/There may be days when there will be no tasks assigned|Success/);

    await button(dialog, 'Generate Tasks').click();
    await closeSwal(page, 'Tasks are being generated. Please wait for 5 minutes.');
    await expect(dialog).toHaveCount(0);

    await open(page, '/task-report');
    await pickDate(page, 'Start Date', days[0]);
    await pickDate(page, 'End Date', days[days.length - 1]);
    await selectOptions(page, fieldByLabel(page, 'Sales Person'), [name], { multiple: true });
    await button(page, 'Search').click();
    await waitForLoader(page);
    // Production generates for every picked day, Sundays included.
    expect(await columnTexts(page, 'date')).toEqual(days.map((d) => day(d).ymd));
    const counts = (await columnTexts(page, 'customerCount')).map(Number);
    expect(counts.reduce((a, b) => a + b, 0)).toBe(customers);
    expect(counts.every((c) => c <= 35)).toBe(true);
    expect(new Set(await columnTexts(page, 'salesPersonName'))).toEqual(new Set([name]));

    await button(rows(page).first(), 'View Customers').click();
    await waitForLoader(page);
    await expect(page.locator('.mat-mdc-paginator-range-label')).toHaveText(new RegExp(` of ${counts[0]}\\s*$`));
    expect(new Set(await columnTexts(page, 'status'))).toEqual(new Set(['Not Yet Visited']));
  });
});
