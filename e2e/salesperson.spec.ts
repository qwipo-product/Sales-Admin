import {
  button,
  cancelSwal,
  closeSwal,
  columnTexts,
  confirmSwal,
  content,
  expect,
  fieldByLabel,
  heading,
  open,
  rows,
  selectOptions,
  selectOptionTexts,
  signIn,
  test,
  waitForLoader,
} from './fixtures';
import type { Locator, Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await signIn(page);
  await open(page, '/salesperson-list');
  await expect(heading(page, 'Sales Person List')).toBeVisible();
  await expect(rows(page).first()).toBeVisible();
});

/** The list row of the sales person called `name`. */
function personRow(page: Page, name: string): Locator {
  return rows(page).filter({ has: page.locator('.cdk-column-salesPersonName', { hasText: new RegExp(`^\\s*${name}\\s*$`) }) });
}

test.describe('Sales Person list', () => {
  test('lists every sales person with lead, manager and actions', async ({ page }) => {
    await expect(rows(page)).toHaveCount(36);
    const header = page.locator('.mat-mdc-header-row');
    for (const title of ['Sales Person Name', 'Mobile Number', 'Lead Name', 'Sales Manager', 'Action', 'Force Logout']) {
      await expect(header).toContainText(title);
    }
    // Sales persons without a lead or manager get "Add Lead", the others "Edit Lead".
    await expect(button(rows(page), 'Add Lead')).toHaveCount(4);
    await expect(button(rows(page), 'Edit Lead')).toHaveCount(32);
    await expect(button(rows(page), 'Enable logout')).toHaveCount(36);
  });

  test('Edit Lead assigns a lead and a manager', async ({ page }) => {
    const row = rows(page).filter({ has: button(page, 'Add Lead') }).first();
    const name = (await row.locator('.cdk-column-salesPersonName').innerText()).trim();
    await expect(row.locator('.cdk-column-leadName')).toHaveText('');

    await button(row, 'Add Lead').click();
    const dialog = page.locator('mat-dialog-container');
    await expect(dialog).toBeVisible();
    // Both drop-downs list the same Users (user_type 2), as in production.
    const leadOptions = await selectOptionTexts(page, fieldByLabel(dialog, 'Lead Name'));
    const managerOptions = await selectOptionTexts(page, fieldByLabel(dialog, "Sale's Manager"));
    expect(leadOptions.length).toBeGreaterThan(1);
    expect(managerOptions).toEqual(leadOptions);

    await selectOptions(page, fieldByLabel(dialog, 'Lead Name'), [leadOptions[0]]);
    await selectOptions(page, fieldByLabel(dialog, "Sale's Manager"), [managerOptions[1]]);
    await button(dialog, 'Save').click();
    await closeSwal(page, 'changes updated successfully');
    await expect(dialog).toHaveCount(0);

    const updated = personRow(page, name);
    await expect(updated.locator('.cdk-column-leadName')).toHaveText(leadOptions[0]);
    await expect(updated.locator('.cdk-column-salesManager')).toHaveText(managerOptions[1]);
    await expect(button(updated, 'Edit Lead')).toBeVisible();

    // Saved to the sample database: still there after a reload.
    await page.reload();
    await waitForLoader(page);
    await expect(personRow(page, name).locator('.cdk-column-leadName')).toHaveText(leadOptions[0]);
  });

  test('Edit Lead can change only the lead, and Save without a choice changes nothing', async ({ page }) => {
    const row = rows(page).filter({ has: button(page, 'Edit Lead') }).first();
    const name = (await row.locator('.cdk-column-salesPersonName').innerText()).trim();
    const manager = (await row.locator('.cdk-column-salesManager').innerText()).trim();
    const dialog = page.locator('mat-dialog-container');

    await button(row, 'Edit Lead').click();
    await expect(dialog).toBeVisible();
    await button(dialog, 'Save').click();
    await closeSwal(page, 'No changes updated');
    await expect(dialog).toHaveCount(0);

    await button(row, 'Edit Lead').click();
    const options = await selectOptionTexts(page, fieldByLabel(dialog, 'Lead Name'));
    await selectOptions(page, fieldByLabel(dialog, 'Lead Name'), [options[options.length - 1]]);
    await button(dialog, 'Save').click();
    await closeSwal(page, 'Sales Lead updated Successfully');
    await expect(dialog).toHaveCount(0);
    await expect(personRow(page, name).locator('.cdk-column-leadName')).toHaveText(options[options.length - 1]);
    await expect(personRow(page, name).locator('.cdk-column-salesManager')).toHaveText(manager);
  });

  test('the Edit Lead dialog closes with the X icon', async ({ page }) => {
    await button(rows(page).first(), /Lead/).click();
    const dialog = page.locator('mat-dialog-container');
    await expect(dialog).toBeVisible();
    await dialog.locator('mat-icon', { hasText: 'close' }).click();
    await expect(dialog).toHaveCount(0);
  });

  test('Enable logout asks first, then marks the row', async ({ page }) => {
    const row = rows(page).nth(2);
    const name = (await row.locator('.cdk-column-salesPersonName').innerText()).trim();

    // "No" leaves it alone.
    await button(row, 'Enable logout').click();
    await cancelSwal(page, 'Do you want force logout this sales person');
    await expect(button(row, 'Enable logout')).toBeVisible();

    await button(row, 'Enable logout').click();
    await confirmSwal(page, 'Do you want force logout this sales person');
    await closeSwal(page, 'Force Logout enabled successfully');
    await expect(button(row, 'Logout enabled')).toBeVisible();
    await expect(button(row, 'Enable logout')).toHaveCount(0);

    await page.reload();
    await waitForLoader(page);
    await expect(button(personRow(page, name), 'Logout enabled')).toBeVisible();
    await expect(button(rows(page), 'Logout enabled')).toHaveCount(1);
  });
});

test.describe('Create Salesperson', () => {
  const valid = {
    Name: 'Test Person',
    'Business Name': 'Test Person Traders',
    'Mobile Number': '9876543210',
    Email: 'test.person@example.com',
    'Pin Code': '500081',
    Street: 'Main Road',
    'Land Mark': 'Near Bus Stop',
    Area: 'Madhapur',
    City: 'Hyderabad',
    Latitude: '17.4486',
    Longitude: '78.3908',
  };

  async function fillForm(page: Page, values: Partial<typeof valid>) {
    for (const [label, value] of Object.entries(values)) {
      await fieldByLabel(page, label).locator('input').fill(value as string);
    }
  }

  async function save(page: Page) {
    await button(page, 'Save').click();
  }

  test.beforeEach(async ({ page }) => {
    await button(page, 'Create Sales Person').click();
    await expect(page).toHaveURL(/\/salesperson-list\/create-salesperson$/);
    await expect(heading(page, 'Create Salesperson')).toBeVisible();
  });

  test('shows the validation messages, then creates the sales person', async ({ page }) => {
    await save(page);
    await closeSwal(page, 'Please fill all required fields.');

    await fillForm(page, { ...valid, Email: 'not-an-email' });
    await selectOptions(page, fieldByLabel(page, 'select State'), ['Telangana']);
    await selectOptions(page, fieldByLabel(page, 'Status'), ['Active']);
    await save(page);
    await closeSwal(page, 'please enter valid email');
    await expect(fieldByLabel(page, 'Email')).toHaveClass(/mat-form-field-invalid/);

    await fillForm(page, { Email: valid.Email, 'Pin Code': '50008' });
    await save(page);
    await closeSwal(page, 'PinCode is not correct. Please provide a proper PinCode  number.');

    await fillForm(page, { 'Pin Code': valid['Pin Code'], Name: 'Test Person 2' });
    await save(page);
    await closeSwal(page, 'please enter valid name');

    await fillForm(page, { Name: valid.Name, 'Business Name': 'Test & Co' });
    await save(page);
    await closeSwal(page, 'please enter valid business name');

    await fillForm(page, { 'Business Name': valid['Business Name'], Longitude: '-78.3908' });
    await save(page);
    await closeSwal(page, 'longitude ,have negative values Please Check');

    await fillForm(page, { Longitude: valid.Longitude, Latitude: '0' });
    await save(page);
    await closeSwal(page, 'give proper latitude.');

    await fillForm(page, { Latitude: valid.Latitude, 'Mobile Number': '987654321' });
    await save(page);
    await closeSwal(page, 'give full mobile number');

    // The mobile number is cut to 10 digits while typing.
    await fillForm(page, { 'Mobile Number': '98765432109' });
    await expect(fieldByLabel(page, 'Mobile Number').locator('input')).toHaveValue('9876543210');

    await save(page);
    await closeSwal(page, 'SalesPerson created successfully');
    await expect(page).toHaveURL(/\/salesperson-list$/);
    await waitForLoader(page);
    await expect(rows(page)).toHaveCount(37);
    const created = personRow(page, valid.Name);
    await expect(created.locator('.cdk-column-mobileNumber')).toHaveText(valid['Mobile Number']);
    await expect(button(created, 'Add Lead')).toBeVisible();
    await expect(button(created, 'Enable logout')).toBeVisible();
  });

  test('the back arrow returns to the list', async ({ page }) => {
    await content(page).locator('mat-icon.backicon').click();
    await expect(page).toHaveURL(/\/salesperson-list$/);
    await expect(heading(page, 'Sales Person List')).toBeVisible();
  });
});

test.describe('Edit Salesperson profile', () => {
  test('validates and saves name and business name', async ({ page }) => {
    const names = await columnTexts(page, 'salesPersonName');
    const original = names[1];
    await button(personRow(page, original), 'Edit Profile').click();
    await expect(page).toHaveURL(/\/salesperson-list\/edit-salesperson-profile\/[0-9a-f]{32}$/);
    await expect(heading(page, 'Edit Salesperson')).toBeVisible();
    await waitForLoader(page);

    const nameInput = fieldByLabel(page, 'Name').locator('input');
    const businessInput = fieldByLabel(page, 'Business Name').locator('input');
    await expect(nameInput).toHaveValue(original);
    await expect(businessInput).toHaveAttribute('placeholder', 'Business Name');

    await nameInput.fill('');
    await button(page, 'Update').click();
    await closeSwal(page, 'Please fill all required fields.');

    await nameInput.fill('Agent 007');
    await button(page, 'Update').click();
    await closeSwal(page, 'please enter valid name');

    await nameInput.fill('Renamed Person');
    await businessInput.fill('Renamed-Business');
    await button(page, 'Update').click();
    await closeSwal(page, 'please enter valid business name');

    await businessInput.fill('Renamed Business');
    await button(page, 'Update').click();
    await closeSwal(page, 'Customer updated successfully');
    await expect(page).toHaveURL(/\/salesperson-list$/);
    await waitForLoader(page);
    await expect(personRow(page, 'Renamed Person')).toHaveCount(1);
    await expect(personRow(page, original)).toHaveCount(0);
  });

  test('an unknown id shows the load error', async ({ page }) => {
    await open(page, '/salesperson-list/edit-salesperson-profile/unknown-id');
    await closeSwal(page, 'Failed to Get customer. Please try again later.');
    await expect(fieldByLabel(page, 'Name').locator('input')).toHaveValue('');
  });
});
