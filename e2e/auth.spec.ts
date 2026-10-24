import { button, content, expect, gotoApp, heading, signIn, tab, test, waitForLoader } from './fixtures';

const SIGNIN_URL = /\/sessions\/signin(\?.*)?$/;

test.describe('Sign-in, sign-out and the route guard', () => {
  test('signed-out users are sent to the sign-in page', async ({ page }) => {
    await gotoApp(page, '/salesperson-list');
    await expect(page).toHaveURL(SIGNIN_URL);
    await expect(page.getByText('Sign in to your account')).toBeVisible();
    await expect(heading(page, 'Sales Person List')).toHaveCount(0);
  });

  test('the root URL opens the sign-in page', async ({ page }) => {
    await gotoApp(page, '/');
    await expect(page).toHaveURL(SIGNIN_URL);
    await expect(button(page, 'Sign in')).toBeEnabled();
  });

  test('sign in opens Home and the session survives a reload', async ({ page }) => {
    await signIn(page);
    await expect(page.locator('.app-logo-text')).toHaveText('Sales Admin');

    await gotoApp(page, null);
    await expect(page).toHaveURL(/\/home$/);
    await expect(page.getByText('Home Page')).toBeVisible();

    // Signed-in users who open the sign-in page go straight back to Home.
    await gotoApp(page, '/sessions/signin');
    await expect(page).toHaveURL(/\/home$/);
  });

  test('the sidebar opens every page', async ({ page }) => {
    await signIn(page);
    const sidebar = page.locator('.sidebar-panel');
    const pages: [string, RegExp, RegExp | string][] = [
      ['Sales Person List', /\/salesperson-list$/, 'Sales Person List'],
      ['Attendance', /\/attendance-report$/, 'Approval Request'],
      ['Planning', /\/salesperson-planning$/, 'Areas'],
      ['Reschedule Tasks', /\/reschedule-tasks$/, 'Reschedule Tasks'],
      ['Tasks', /\/task-report$/, 'Task Report'],
      ['Interactions', /\/interaction-list$/, 'Interactions'],
      ['Performance Report', /\/performance$/, 'Sales Person Report'],
    ];
    // The pages sit in the collapsed "Sales Person" group.
    await sidebar.locator('.item-name', { hasText: /^Sales Person$/ }).click();
    for (const [link, url, marker] of pages) {
      await sidebar.locator('a', { hasText: new RegExp(`^\\s*${link}\\s*$`) }).click();
      await expect(page).toHaveURL(url);
      await expect(content(page).getByText(marker, { exact: true }).first()).toBeVisible();
      await waitForLoader(page);
    }
  });

  test('SIGNOUT ends the session and the guard blocks admin pages again', async ({ page }) => {
    await signIn(page);
    await gotoApp(page, '/attendance-report');
    await expect(tab(page, 'Approval Request')).toBeVisible();

    await button(page.locator('mat-toolbar'), 'power_settings_new').click();
    await page.locator('[role="menuitem"]', { hasText: 'SIGNOUT' }).click();
    await expect(page).toHaveURL(SIGNIN_URL);
    await expect(page.getByText('Sign in to your account')).toBeVisible();

    // The session keys are gone; the sample database is kept.
    const storage = await page.evaluate(() => Object.keys(localStorage));
    expect(storage).not.toContain('salesAdminMockSession');
    expect(storage).not.toContain('userDetails');
    expect(storage).not.toContain('uid');

    await gotoApp(page, '/attendance-report');
    await expect(page).toHaveURL(SIGNIN_URL);
    await expect(tab(page, 'Approval Request')).toHaveCount(0);

    // A reload does not bring the old session back (production kept it).
    await gotoApp(page, null);
    await expect(page.getByText('Sign in to your account')).toBeVisible();
    await gotoApp(page, '/home');
    await expect(page).toHaveURL(SIGNIN_URL);
    await expect(page.getByText('Home Page')).toHaveCount(0);
  });
});
