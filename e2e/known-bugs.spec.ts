import { button, closeSwal, expect, open, signIn, test } from './fixtures';

/**
 * Bugs the suite found in the current app. They are not fixed here (the suite does not change application code);
 * each test is marked `test.fail()`, so it passes while the bug exists and turns red once it is fixed: then delete
 * the `test.fail()` line and keep the test as a regression check.
 */
test.describe('Known bugs', () => {
  test('after an alert raised while "Please wait" is open, the page stays hidden from screen readers', async ({ page }) => {
    test.fail(true, 'app-root is left with aria-hidden="true"; see the README "Tests" section');
    // The Create Salesperson validation alert opens while the loader dialog is still up. SweetAlert2 stores the
    // aria-hidden="true" that the loader dialog put on <app-root>, the loader then closes, and when the alert closes it
    // "restores" aria-hidden="true". Everything in the app is now hidden from assistive technology until a reload.
    await signIn(page);
    await open(page, '/salesperson-list/create-salesperson');
    await button(page, 'Save').click();
    await closeSwal(page, 'Please fill all required fields.');

    await expect(page.locator('app-root')).not.toHaveAttribute('aria-hidden', 'true', { timeout: 3_000 });
    await expect(page.getByRole('button', { name: 'Save' })).toBeVisible({ timeout: 3_000 });
  });
});
